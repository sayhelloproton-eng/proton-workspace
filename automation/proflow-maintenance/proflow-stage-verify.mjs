#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { printJson, valueArg } from "./lib/monitor-api-client.mjs";

const workspace = resolve(
  valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace",
);
const repo = join(workspace, "repos/proflow");
const stage = valueArg("--stage") ?? "monitor-controlled-group";

if (stage !== "monitor-controlled-group") {
  printJson({
    contract: "proflow.stage-verify.v1",
    status: "BLOCKED",
    reason: "PROFLOW_STAGE_VERIFY_PROFILE_UNSUPPORTED",
    stage,
  });
  process.exit(3);
}

const commands = [
  {
    label: "monitor-controlled-group-tests",
    cwd: repo,
    command: "node",
    args: [
      "--test",
      "packages/execution-browser-extension/tests/monitor-controlled-group.test.ts",
      "packages/execution-browser-extension/tests/monitor-lane.test.ts",
      "packages/execution-browser-extension/tests/monitor-chat-delivery-executor.test.ts",
    ],
    timeoutMs: 120_000,
  },
  {
    label: "workspace-extension-artifact-guard-tests",
    cwd: workspace,
    command: "node",
    args: [
      "--test",
      "automation/proflow-browser-extension/tests/artifact-guard.test.mjs",
    ],
    timeoutMs: 60_000,
  },
  {
    label: "browser-extension-detail-reload-self-test",
    cwd: workspace,
    command: "node",
    args: [
      "automation/proflow-browser-extension/reload.mjs",
      "--self-test",
    ],
    timeoutMs: 30_000,
  },
  {
    label: "browser-extension-reload-guard-contract",
    cwd: workspace,
    command: "python3",
    args: [
      "-c",
      "from pathlib import Path; s=Path('automation/proflow-browser-extension/reload.mjs').read_text(); m=s[s.index('async function main()'):]; assert 'inspectBrowserExtensionArtifact({ workspace })' in m; assert m.index('inspectBrowserExtensionArtifact({ workspace })') < m.index('detailTab()'); assert 'chrome://extensions/?id=eehdadpmjffomabiedcjijiakconalab' in s; assert 'RELOAD_BUTTON_NAME = \"重新加载\"' in s; assert 'proflowAutomation' not in s; assert 'chrome.windows.create' not in s",
    ],
    timeoutMs: 30_000,
  },
  {
    label: "execution-browser-extension-typecheck",
    cwd: repo,
    command: "pnpm",
    args: [
      "--filter",
      "@tomflow/proflow-execution-browser-extension",
      "typecheck",
    ],
    timeoutMs: 120_000,
  },
  {
    label: "execution-browser-extension-build",
    cwd: repo,
    command: "node",
    args: ["scripts/build-packages.mjs", "execution-browser-extension"],
    timeoutMs: 120_000,
  },
  {
    label: "test-governance-check",
    cwd: repo,
    command: "pnpm",
    args: ["test-governance"],
    timeoutMs: 120_000,
  },
  {
    label: "workspace-controlled-group-self-test",
    cwd: workspace,
    command: "python3",
    args: ["tools/browser/playwright-controlled-group.py", "--self-test"],
    timeoutMs: 30_000,
  },
  {
    label: "workspace-monitor-physical-self-test",
    cwd: workspace,
    command: "python3",
    args: ["automation/proflow-maintenance/monitor-browser-physical.py", "--self-test"],
    timeoutMs: 30_000,
  },
  {
    label: "workspace-monitor-routing-tests",
    cwd: workspace,
    command: "node",
    args: [
      "--test",
      "automation/proflow-maintenance/tests/monitor-browser-step.test.mjs",
    ],
    timeoutMs: 60_000,
  },
  {
    label: "repo-diff-check",
    cwd: repo,
    command: "git",
    args: ["diff", "--check"],
    timeoutMs: 30_000,
  },
  {
    label: "workspace-diff-check",
    cwd: workspace,
    command: "git",
    args: ["diff", "--check"],
    timeoutMs: 30_000,
  },
];

function run(item) {
  const startedAt = Date.now();
  const result = spawnSync(item.command, item.args, {
    cwd: item.cwd,
    encoding: "utf8",
    timeout: item.timeoutMs,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  const durationMs = Date.now() - startedAt;
  const detail = (result.stderr || result.stdout || "")
    .trim()
    .split(/\r?\n/)
    .slice(-8)
    .join("\n");
  return {
    label: item.label,
    status: result.error || result.status !== 0 ? "FAIL" : "PASS",
    exitCode: result.status,
    durationMs,
    detail,
    error: result.error?.message ?? null,
  };
}

const startedAt = new Date().toISOString();
const startedMs = Date.now();
const results = [];
for (const item of commands) {
  const result = run(item);
  results.push(result);
  if (result.status !== "PASS") {
    printJson({
      contract: "proflow.stage-verify.v1",
      status: "FAIL",
      stage,
      startedAt,
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - startedMs,
      firstFailure: result.label,
      results,
    });
    process.exit(1);
  }
}

printJson({
  contract: "proflow.stage-verify.v1",
  status: "PASS",
  stage,
  startedAt,
  endedAt: new Date().toISOString(),
  durationMs: Date.now() - startedMs,
  results,
});
