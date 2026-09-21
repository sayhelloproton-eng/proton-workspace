#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { inspectBrowserExtensionArtifact } from "./lib/artifact-guard.mjs";

const ROOT = "/Users/agent/Desktop/proton-workspace";
const workspace = resolve(
  process.argv.includes("--workspace")
    ? process.argv[process.argv.indexOf("--workspace") + 1]
    : ROOT,
);
const maxFreshMs = Number(
  process.argv.includes("--fresh-ms")
    ? process.argv[process.argv.indexOf("--fresh-ms") + 1]
    : "60000",
);
const boundary = join(
  workspace,
  "skills/chat-local-acceptance-automation-protocol/scripts/browser-run-boundary.py",
);
const browserReady = join(workspace, "automation/gptweb-mcp/playwright-ready.py");
const reload = join(workspace, "automation/proflow-browser-extension/reload.mjs");

function subprocess(command, args, { timeout = 60_000, input } = {}) {
  const result = spawnSync(command, args, {
    cwd: workspace,
    encoding: "utf8",
    timeout,
    input,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  if (result.error) throw result.error;
  return result;
}

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function validVerification(value, expected) {
  return Boolean(
    value?.contract === "proflow.browser-extension-verification.v1" &&
      value.moduleVersion === expected.moduleVersion &&
      resolve(value.loadDir) === resolve(expected.loadDir) &&
      value.extensionId === expected.extensionId &&
      value.serviceWorker === "RUNNING" &&
      value.evidenceSource === "PAIRING_HEARTBEAT" &&
      Number.isFinite(Date.parse(value.observedAt)),
  );
}

function fresh(value) {
  const observedAt = Date.parse(value?.observedAt ?? "");
  return Number.isFinite(observedAt) && Date.now() - observedAt < maxFreshMs;
}

function runBoundary(action, runId, outcome = null, sideEffectState = null) {
  const record =
    action === "open"
      ? {
          eventType: "AUTOMATION_START",
          runId,
          project: "proflow",
          scenario: "browser-extension-adopt",
          acceptanceMode: "SAME_SCENE",
          neededCapabilities: ["CONNECT", "RECOVER", "IDENTIFY", "ACT", "VERIFY"],
          knownPathHit: true,
          freshEvidenceWindowBound: true,
        }
      : {
          eventType: "AUTOMATION_RUN",
          runId,
          outcome,
          failureClass: outcome === "PASS" ? "NONE" : "UNKNOWN",
          sideEffectState,
        };
  const args =
    action === "open"
      ? [boundary, "open", "--mode", "exclusive", "--input", "-"]
      : [boundary, "close", "--input", "-"];
  const result = subprocess("python3", args, {
    timeout: 10_000,
    input: JSON.stringify(record),
  });
  if (result.status !== 0)
    throw new Error(`EXTENSION_ADOPT_BOUNDARY_${action.toUpperCase()}_FAILED`);
}

async function waitVerification(path, expected, previousInstanceId, startedAt) {
  const deadline = Date.now() + 15_000;
  do {
    try {
      const value = await json(path);
      if (
        validVerification(value, expected) &&
        Date.parse(value.observedAt) >= startedAt &&
        (!previousInstanceId || value.extensionInstanceId !== previousInstanceId)
      )
        return value;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  } while (Date.now() < deadline);
  return null;
}

async function main() {
  if (!Number.isFinite(maxFreshMs) || maxFreshMs < 1)
    throw new Error("EXTENSION_ADOPT_FRESHNESS_INVALID");

  const artifact = await inspectBrowserExtensionArtifact({ workspace });
  if (artifact.status !== "READY") {
    console.log(
      JSON.stringify({
        contract: "proflow.browser-extension-adopt.v1",
        status: "BLOCKED",
        reason: artifact.reason,
        artifact,
      }),
    );
    process.exitCode = 3;
    return;
  }
  const factsRoot = join(
    workspace,
    ".proflow/runtime/modules/execution-browser-extension",
  );
  const shared = await json(join(factsRoot, "shared-facts.json"));
  const facts = shared?.facts;
  if (
    shared?.contract !== "proflow.module-shared-facts.v1" ||
    shared?.moduleRef !== "execution-browser-extension" ||
    !facts
  )
    throw new Error("EXTENSION_SHARED_FACTS_INVALID");

  const loadDir = resolve(facts.loadDir);
  const expectedManifest = await json(join(loadDir, "manifest.json"));
  const expected = {
    moduleVersion: String(expectedManifest.version ?? ""),
    loadDir,
    extensionId: String(facts.extensionId ?? ""),
  };
  if (!expected.moduleVersion || !expected.extensionId)
    throw new Error("EXTENSION_EXPECTED_IDENTITY_INVALID");

  const verificationPath = resolve(facts.verificationEvidenceFile);
  let before = null;
  try {
    before = await json(verificationPath);
  } catch {}
  if (validVerification(before, expected) && fresh(before)) {
    console.log(
      JSON.stringify({
        contract: "proflow.browser-extension-adopt.v1",
        status: "ALREADY_CURRENT",
        ...expected,
        extensionInstanceId: before.extensionInstanceId,
        observedAt: before.observedAt,
      }),
    );
    return;
  }

  const runId = `browser-extension-adopt:${Date.now()}:${randomUUID()}`;
  let opened = false;
  let effectStarted = false;
  try {
    runBoundary("open", runId);
    opened = true;

    const ready = subprocess(
      "python3",
      [browserReady, "--inside-boundary"],
      { timeout: 190_000 },
    );
    if (ready.status !== 0)
      throw new Error(
        ready.stderr.trim().split(/\r?\n/).at(-1) ||
          "PLAYWRIGHT_READY_FAILED",
      );

    const startedAt = Date.now();
    effectStarted = true;
    const reloaded = subprocess(
      process.execPath,
      [reload, "--workspace", workspace],
      { timeout: 60_000 },
    );
    const reloadError =
      reloaded.status === 0
        ? null
        : reloaded.stderr.trim().split(/\r?\n/).at(-1) ||
          "EXTENSION_RELOAD_FAILED";

    const after = await waitVerification(
      verificationPath,
      expected,
      before?.extensionInstanceId ?? null,
      startedAt,
    );
    if (!after)
      throw new Error(
        reloadError
          ? `EXTENSION_RELOAD_UNRESOLVED:${reloadError}`
          : "EXTENSION_HEARTBEAT_READBACK_UNKNOWN",
      );

    const reloadSettlement = reloadError
      ? "RECONCILED_BY_HEARTBEAT"
      : "CLICK_CONFIRMED";

    runBoundary("close", runId, "PASS", "APPLIED");
    opened = false;
    console.log(
      JSON.stringify({
        contract: "proflow.browser-extension-adopt.v1",
        status: "ADOPTED",
        ...expected,
        extensionInstanceId: after.extensionInstanceId,
        observedAt: after.observedAt,
        reloadSettlement,
      }),
    );
  } catch (error) {
    if (opened) {
      try {
        runBoundary(
          "close",
          runId,
          "FAIL",
          effectStarted ? "UNKNOWN" : "NOT_APPLIED",
        );
      } catch {}
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(
    `PROFLOW_BROWSER_EXTENSION_ADOPT=FAIL ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
