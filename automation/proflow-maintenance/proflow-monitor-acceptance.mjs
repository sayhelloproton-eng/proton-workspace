#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { printJson, valueArg } from "./lib/monitor-api-client.mjs";

const workspace = resolve(
  valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace",
);
const mode = valueArg("--mode") ?? "SAME_SCENE";
if (!new Set(["SAME_SCENE", "FAST_REPLAY", "FULL_FRESH"]).has(mode)) {
  printJson({
    contract: "proflow.monitor-acceptance.v1",
    status: "BLOCKED",
    reason: "ACCEPTANCE_MODE_INVALID",
  });
  process.exit(3);
}

function run(label, command, args, timeoutMs) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: workspace,
    encoding: "utf8",
    timeout: timeoutMs,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch {}
  return {
    label,
    ok: !result.error && result.status === 0,
    durationMs: Date.now() - started,
    parsed,
    detail:
      (result.stderr || result.stdout || "")
        .trim()
        .split(/\r?\n/)
        .slice(-8)
        .join("\n") || null,
  };
}

function classify(step) {
  const reason =
    step.parsed?.reason ??
    step.detail ??
    "ACCEPTANCE_PREREQUISITE_FAILED";
  return /UNKNOWN|TIMEOUT|TRANSPORT/i.test(String(reason))
    ? "UNKNOWN"
    : "BLOCKED";
}

const startedMs = Date.now();
const steps = [];

const realScene = run(
  "REAL_SCENE_READY",
  process.execPath,
  [
    join(
      workspace,
      "automation/proflow-maintenance/proflow-real-scene-ready.mjs",
    ),
    "--workspace",
    workspace,
  ],
  360_000,
);
steps.push(realScene);
if (
  !realScene.ok ||
  realScene.parsed?.contract !== "proflow.real-scene-ready.v1" ||
  realScene.parsed?.status !== "READY"
) {
  const status = classify(realScene);
  printJson({
    contract: "proflow.monitor-acceptance.v1",
    status,
    mode,
    stage: "REAL_SCENE",
    durationMs: Date.now() - startedMs,
    steps,
  });
  process.exit(status === "UNKNOWN" ? 2 : 3);
}

const browser = run(
  "MONITOR_BROWSER_STEP",
  process.execPath,
  [
    join(
      workspace,
      "automation/proflow-maintenance/monitor-browser-step.mjs",
    ),
    "--workspace",
    workspace,
  ],
  180_000,
);
steps.push(browser);
if (
  !browser.ok ||
  browser.parsed?.contract !== "proflow.monitor-browser-step.v1" ||
  browser.parsed?.status !== "DONE"
) {
  const status =
    browser.parsed?.status === "UNKNOWN" ? "UNKNOWN" : "BLOCKED";
  printJson({
    contract: "proflow.monitor-acceptance.v1",
    status,
    mode,
    stage: "MONITOR_BROWSER_STEP",
    reason: browser.parsed?.reason ?? browser.detail,
    durationMs: Date.now() - startedMs,
    steps,
  });
  process.exit(status === "UNKNOWN" ? 2 : 3);
}

const current = run(
  "MONITOR_CURRENT",
  process.execPath,
  [
    join(workspace, "automation/proflow-maintenance/monitor-current.mjs"),
    "--workspace",
    workspace,
    "--require-mutation",
    "FULL",
  ],
  30_000,
);
steps.push(current);
if (
  !current.ok ||
  current.parsed?.contract !== "proflow.monitor-current-cli.v1" ||
  current.parsed?.status !== "OK" ||
  current.parsed?.mutationMode !== "FULL"
) {
  const status = classify(current);
  printJson({
    contract: "proflow.monitor-acceptance.v1",
    status,
    mode,
    stage: "OWNER_READBACK",
    durationMs: Date.now() - startedMs,
    steps,
  });
  process.exit(status === "UNKNOWN" ? 2 : 3);
}

printJson({
  contract: "proflow.monitor-acceptance.v1",
  status: "READY_FOR_VISUAL_EYES",
  mode,
  currentChatId: current.parsed.currentChatId,
  currentShiftId: current.parsed.currentShiftId,
  mutationMode: current.parsed.mutationMode,
  durationMs: Date.now() - startedMs,
  steps,
  next:
    "Perform exactly one final visual EYES proof on the owner-known current Monitor tab, then close the Acceptance verdict from visible reality.",
});
