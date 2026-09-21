import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = "/Users/agent/Desktop/proton-workspace";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function staticPackageFilePaths(root) {
  const files = ["manifest.json"];
  const visit = async (relativeRoot) => {
    const entries = await readdir(join(root, relativeRoot), {
      withFileTypes: true,
    });
    entries.sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
    for (const entry of entries) {
      const relativePath = join(relativeRoot, entry.name);
      if (entry.isDirectory()) await visit(relativePath);
      else if (entry.isFile()) files.push(relativePath);
      else throw new Error("BROWSER_EXTENSION_STATIC_ENTRY_INVALID");
    }
  };
  await visit(join("dist", "extension"));
  await visit("extension");
  return files.sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

export async function staticPackageFingerprint(root) {
  const hash = createHash("sha256");
  for (const relativePath of await staticPackageFilePaths(root)) {
    const bytes = await readFile(join(root, relativePath));
    hash.update(relativePath);
    hash.update("\0");
    hash.update(String(bytes.length));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function descriptorVersion(source) {
  const match = /moduleVersion:\s*"([^"]+)"/.exec(source);
  return match?.[1] ?? null;
}

function blocked(reason, details = {}) {
  return {
    contract: "proflow.browser-extension-artifact-guard.v1",
    status: "BLOCKED",
    reason,
    ...details,
  };
}

export async function inspectBrowserExtensionArtifact({
  workspace = ROOT,
  sourceRoot,
  loadDir,
} = {}) {
  const root = resolve(workspace);
  const source = resolve(
    sourceRoot ??
      join(
        root,
        "repos/proflow/packages/execution-browser-extension",
      ),
  );
  const materialized = resolve(
    loadDir ??
      join(
        root,
        ".proflow/deployment/browser-extension/execution-browser-extension",
      ),
  );

  try {
    const [
      pkg,
      moduleManifest,
      sourceManifest,
      descriptorSource,
      marker,
      materializedManifest,
      materializedBackground,
    ] = await Promise.all([
      readJson(join(source, "package.json")),
      readJson(join(source, "proflow.module.json")),
      readJson(join(source, "manifest.json")),
      readFile(join(source, "deployment/descriptor.ts"), "utf8"),
      readJson(join(materialized, ".proflow-materialization.json")),
      readJson(join(materialized, "manifest.json")),
      readFile(
        join(materialized, "dist/extension/background.js"),
        "utf8",
      ),
    ]);

    const versions = {
      package: String(pkg.version ?? ""),
      module: String(moduleManifest.moduleVersion ?? ""),
      manifest: String(sourceManifest.version ?? ""),
      descriptor: descriptorVersion(descriptorSource),
      marker: String(marker.moduleVersion ?? ""),
      materializedManifest: String(materializedManifest.version ?? ""),
    };

    if (
      !versions.package ||
      !versions.module ||
      !versions.manifest ||
      !versions.descriptor ||
      new Set([
        versions.package,
        versions.module,
        versions.manifest,
        versions.descriptor,
      ]).size !== 1
    )
      return blocked("BROWSER_EXTENSION_VERSION_FACTS_DRIFT", {
        sourceRoot: source,
        loadDir: materialized,
        versions,
      });

    if (
      marker.contract !== "proflow.browser-extension-materialization.v2" ||
      typeof marker.packageFingerprint !== "string" ||
      !/^sha256:[0-9a-f]{64}$/.test(marker.packageFingerprint)
    )
      return blocked("BROWSER_EXTENSION_MATERIALIZATION_MARKER_INVALID", {
        sourceRoot: source,
        loadDir: materialized,
        versions,
      });

    const [sourceFingerprint, materializedFingerprint] = await Promise.all([
      staticPackageFingerprint(source),
      staticPackageFingerprint(materialized),
    ]);

    const legacyDedicatedWindowRuntime =
      materializedBackground.includes("ensureMonitorDedicatedActiveWindow") ||
      materializedBackground.includes("MONITOR_DEDICATED_WINDOW_CREATE_FAILED");

    const details = {
      sourceRoot: source,
      loadDir: materialized,
      versions,
      sourceFingerprint,
      markerFingerprint: marker.packageFingerprint,
      materializedFingerprint,
      legacyDedicatedWindowRuntime,
    };

    if (
      marker.moduleVersion !== versions.package ||
      materializedManifest.version !== versions.package
    )
      return blocked("BROWSER_EXTENSION_MATERIALIZATION_VERSION_MISMATCH", details);

    if (marker.packageFingerprint !== materializedFingerprint)
      return blocked("BROWSER_EXTENSION_MATERIALIZATION_INTEGRITY_MISMATCH", details);

    if (sourceFingerprint !== marker.packageFingerprint)
      return blocked("BROWSER_EXTENSION_MATERIALIZATION_STALE", details);

    return {
      contract: "proflow.browser-extension-artifact-guard.v1",
      status: "READY",
      reason: null,
      ...details,
    };
  } catch (error) {
    return blocked("BROWSER_EXTENSION_ARTIFACT_GUARD_READ_FAILED", {
      sourceRoot: source,
      loadDir: materialized,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
