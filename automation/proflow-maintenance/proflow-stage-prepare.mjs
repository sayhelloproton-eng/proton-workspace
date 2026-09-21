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
    contract: "proflow.stage-prepare.v1",
    status: "BLOCKED",
    reason: "PROFLOW_STAGE_PREPARE_PROFILE_UNSUPPORTED",
    stage,
  });
  process.exit(3);
}

const startedMs = Date.now();
const result = spawnSync("pnpm", ["test-governance:write"], {
  cwd: repo,
  encoding: "utf8",
  timeout: 120_000,
  env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
});

if (result.error || result.status !== 0) {
  printJson({
    contract: "proflow.stage-prepare.v1",
    status: "FAIL",
    stage,
    durationMs: Date.now() - startedMs,
    reason:
      result.error?.message ??
      (result.stderr || result.stdout)
        .trim()
        .split(/\r?\n/)
        .slice(-8)
        .join("\n") ??
      "TEST_GOVERNANCE_WRITE_FAILED",
  });
  process.exit(1);
}

printJson({
  contract: "proflow.stage-prepare.v1",
  status: "PREPARED",
  stage,
  durationMs: Date.now() - startedMs,
  generated: [
    "spec/平台架构与公共约定/08-测试用例与验证/EXECUTABLE-TEST-INVENTORY.json",
  ],
  next: "Review the generated diff mechanically, then freeze implementation before proflow-stage-verify.",
});
