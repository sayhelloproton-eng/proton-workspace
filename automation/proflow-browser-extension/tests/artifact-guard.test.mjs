import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  inspectBrowserExtensionArtifact,
  staticPackageFingerprint,
} from "../lib/artifact-guard.mjs";

async function writeTree(root, version, background = "console.log('current');\n") {
  await mkdir(join(root, "deployment"), { recursive: true });
  await mkdir(join(root, "dist/extension"), { recursive: true });
  await mkdir(join(root, "extension"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "@tomflow/proflow-execution-browser-extension", version }),
  );
  await writeFile(
    join(root, "proflow.module.json"),
    JSON.stringify({ moduleVersion: version }),
  );
  await writeFile(join(root, "manifest.json"), JSON.stringify({ version }));
  await writeFile(
    join(root, "deployment/descriptor.ts"),
    `export const descriptor = { moduleVersion: "${version}" };\n`,
  );
  await writeFile(join(root, "dist/extension/background.js"), background);
  await writeFile(join(root, "extension/options.html"), "<html></html>\n");
}

async function copyStatic(source, target) {
  await writeTree(
    target,
    JSON.parse(await readFile(join(source, "package.json"), "utf8")).version,
    await readFile(join(source, "dist/extension/background.js"), "utf8"),
  );
  await writeFile(
    join(target, "extension/options.html"),
    await readFile(join(source, "extension/options.html"), "utf8"),
  );
}

test("artifact guard fails closed when same-version source is newer than materialization", async () => {
  const root = await mkdtemp(join(tmpdir(), "proflow-artifact-guard-"));
  try {
    const sourceRoot = join(root, "source");
    const loadDir = join(root, "load");
    await writeTree(sourceRoot, "0.1.68");
    await copyStatic(sourceRoot, loadDir);
    const fingerprint = await staticPackageFingerprint(sourceRoot);
    await writeFile(
      join(loadDir, ".proflow-materialization.json"),
      JSON.stringify({
        contract: "proflow.browser-extension-materialization.v2",
        moduleVersion: "0.1.68",
        packageFingerprint: fingerprint,
      }),
    );

    const ready = await inspectBrowserExtensionArtifact({
      workspace: root,
      sourceRoot,
      loadDir,
    });
    assert.equal(ready.status, "READY");

    await writeFile(
      join(sourceRoot, "dist/extension/background.js"),
      "console.log('new source');\n",
    );
    const stale = await inspectBrowserExtensionArtifact({
      workspace: root,
      sourceRoot,
      loadDir,
    });
    assert.equal(stale.status, "BLOCKED");
    assert.equal(stale.reason, "BROWSER_EXTENSION_MATERIALIZATION_STALE");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("artifact guard detects corrupted materialized payload before Browser work", async () => {
  const root = await mkdtemp(join(tmpdir(), "proflow-artifact-guard-"));
  try {
    const sourceRoot = join(root, "source");
    const loadDir = join(root, "load");
    await writeTree(sourceRoot, "0.1.68");
    await copyStatic(sourceRoot, loadDir);
    const fingerprint = await staticPackageFingerprint(sourceRoot);
    await writeFile(
      join(loadDir, ".proflow-materialization.json"),
      JSON.stringify({
        contract: "proflow.browser-extension-materialization.v2",
        moduleVersion: "0.1.68",
        packageFingerprint: fingerprint,
      }),
    );
    await writeFile(
      join(loadDir, "dist/extension/background.js"),
      "console.log('corrupted');\n",
    );

    const result = await inspectBrowserExtensionArtifact({
      workspace: root,
      sourceRoot,
      loadDir,
    });
    assert.equal(result.status, "BLOCKED");
    assert.equal(
      result.reason,
      "BROWSER_EXTENSION_MATERIALIZATION_INTEGRITY_MISMATCH",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("artifact guard detects unsynchronized package-owned version facts", async () => {
  const root = await mkdtemp(join(tmpdir(), "proflow-artifact-guard-"));
  try {
    const sourceRoot = join(root, "source");
    const loadDir = join(root, "load");
    await writeTree(sourceRoot, "0.1.68");
    await copyStatic(sourceRoot, loadDir);
    await writeFile(
      join(sourceRoot, "proflow.module.json"),
      JSON.stringify({ moduleVersion: "0.1.67" }),
    );
    const fingerprint = await staticPackageFingerprint(loadDir);
    await writeFile(
      join(loadDir, ".proflow-materialization.json"),
      JSON.stringify({
        contract: "proflow.browser-extension-materialization.v2",
        moduleVersion: "0.1.68",
        packageFingerprint: fingerprint,
      }),
    );

    const result = await inspectBrowserExtensionArtifact({
      workspace: root,
      sourceRoot,
      loadDir,
    });
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.reason, "BROWSER_EXTENSION_VERSION_FACTS_DRIFT");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
