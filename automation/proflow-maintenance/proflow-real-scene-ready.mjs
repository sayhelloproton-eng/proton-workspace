#!/usr/bin/env node
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { printJson, valueArg } from "./lib/monitor-api-client.mjs";
import { inspectBrowserExtensionArtifact } from "../proflow-browser-extension/lib/artifact-guard.mjs";

const workspace = resolve(
  valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace",
);
const platform = join(workspace, "node_modules/.bin/platform");

function subprocess(command, args, timeout = 90_000) {
  const result = spawnSync(command, args, {
    cwd: workspace,
    encoding: "utf8",
    timeout,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  if (result.error) return { ok: false, error: result.error.message, result };
  return {
    ok: result.status === 0,
    error:
      result.status === 0
        ? null
        : (result.stderr || result.stdout).trim().split(/\r?\n/).at(-1) ||
          "COMMAND_FAILED",
    result,
  };
}
function statusFacts(output) {
  const text = output ?? "";
  const ready = /PLATFORM_READY=YES/.test(text);
  const current = /^当前处理：\s*(.+)$/m.exec(text)?.[1]?.trim() ?? null;
  const reason = /^原因：\s*(.+)$/m.exec(text)?.[1]?.trim() ?? null;
  const next = /^下一步：\s*(.+)$/m.exec(text)?.[1]?.trim() ?? null;
  return { ready, current, reason, next, raw: text };
}
function readPlatformStatus() {
  const result = subprocess(
    platform,
    ["status", "--workspace", workspace],
    45_000,
  );
  if (!result.ok)
    throw new Error(result.error || "PLATFORM_STATUS_UNKNOWN");
  return statusFacts(result.result.stdout);
}
function parseJsonOutput(output, label) {
  try {
    return JSON.parse((output ?? "").trim());
  } catch {
    throw new Error(`${label}_RESULT_INVALID`);
  }
}
function classifyFailure(error) {
  return /UNKNOWN|TIMEOUT|TRANSPORT/i.test(error ?? "")
    ? "UNKNOWN"
    : "BLOCKED";
}

async function main() {
  const actions = [];

  const artifact = await inspectBrowserExtensionArtifact({ workspace });
  actions.push({
    action: "EXTENSION_ARTIFACT_GUARD",
    status: artifact.status === "READY" ? "PASS" : "BLOCKED",
    detail: artifact,
  });
  if (artifact.status !== "READY") {
    printJson({
      contract: "proflow.real-scene-ready.v1",
      status: "BLOCKED",
      firstDivergence: "BROWSER_EXTENSION_ARTIFACT",
      reason: artifact.reason,
      actions,
    });
    process.exit(3);
    return;
  }

  let status = readPlatformStatus();

  if (!status.ready && /浏览器扩展|Browser Extension/i.test(status.current ?? "")) {
    const adopt = subprocess(
      process.execPath,
      [
        join(workspace, "automation/proflow-browser-extension/adopt.mjs"),
        "--workspace",
        workspace,
      ],
      220_000,
    );
    actions.push({
      action: "EXTENSION_ADOPT",
      status: adopt.ok ? "PASS" : "FAIL",
      detail: adopt.ok ? adopt.result.stdout.trim() : adopt.error,
    });
    if (!adopt.ok) {
      printJson({
        contract: "proflow.real-scene-ready.v1",
        status: classifyFailure(adopt.error),
        firstDivergence: "BROWSER_EXTENSION_ADOPTION",
        reason: adopt.error,
        actions,
      });
      process.exit(classifyFailure(adopt.error) === "UNKNOWN" ? 2 : 3);
      return;
    }
    status = readPlatformStatus();
  }

  const tunnelReady = subprocess(
    process.execPath,
    [
      join(
        workspace,
        "automation/proflow-maintenance/proflow-dev-tunnel-ready.mjs",
      ),
      "--workspace",
      workspace,
    ],
    1_260_000,
  );
  let tunnel;
  try {
    tunnel = parseJsonOutput(tunnelReady.result.stdout, "PROFLOW_DEV_TUNNEL_READY");
  } catch {
    tunnel = null;
  }
  const tunnelReceiptValid = !tunnelReady.result.error && !tunnelReady.result.signal &&
    tunnel?.contract === "proflow.dev-tunnel-ready.v1" &&
    tunnel.owner === "@tomflow/proflow-dev-tunnel" &&
    tunnel.workspace === workspace &&
    ["READY", "ACTION_REQUIRED", "UNKNOWN"].includes(tunnel.status);
  const tunnelIsReady = tunnelReceiptValid && tunnelReady.ok && tunnel.status === "READY";
  actions.push({
    action: "DEV_TUNNEL_READY",
    status: tunnelIsReady ? "PASS" : "FAIL",
    detail: tunnelReceiptValid ? tunnel : "DEV_TUNNEL_PACKAGE_EXECUTION_UNKNOWN",
  });
  if (!tunnelIsReady) {
    const status = tunnelReceiptValid && tunnel.status === "ACTION_REQUIRED" ? "BLOCKED" : "UNKNOWN";
    printJson({
      contract: "proflow.real-scene-ready.v1",
      status,
      firstDivergence: "DEV_TUNNEL",
      reason: tunnelReceiptValid ? tunnel.reason : "DEV_TUNNEL_PACKAGE_EXECUTION_UNKNOWN",
      requiredAction: tunnelReceiptValid ? tunnel.requiredAction : "RECONCILE_DEV_TUNNEL_OWNER",
      actions,
    });
    process.exitCode = status === "UNKNOWN" ? 2 : 3;
    return;
  }

  status = readPlatformStatus();
  if (!status.ready && status.next === "platform start") {
    const started = subprocess(
      platform,
      ["start", "--workspace", workspace],
      90_000,
    );
    actions.push({
      action: "PLATFORM_START",
      status: started.ok ? "PASS" : "UNKNOWN",
      detail: started.ok ? started.result.stdout.trim() : started.error,
    });
    status = readPlatformStatus();
    if (!started.ok && !status.ready) {
      printJson({
        contract: "proflow.real-scene-ready.v1",
        status: "UNKNOWN",
        firstDivergence: "PLATFORM_START",
        reason: started.error,
        platform: status,
        actions,
      });
      process.exit(2);
      return;
    }
  }

  if (!status.ready) {
    printJson({
      contract: "proflow.real-scene-ready.v1",
      status: "BLOCKED",
      firstDivergence: "PLATFORM_STATUS",
      reason: status.reason ?? "PLATFORM_NOT_READY",
      nextAction: status.next,
      platform: status,
      actions,
    });
    process.exit(3);
    return;
  }

  const adoption = subprocess(
    process.execPath,
    [
      join(
        workspace,
        "automation/proflow-maintenance/monitor-state-adoption.mjs",
      ),
      "--workspace",
      workspace,
      "--assert-adopted",
    ],
    30_000,
  );
  actions.push({
    action: "MONITOR_STATE_ADOPTION",
    status: adoption.ok ? "PASS" : "FAIL",
    detail: adoption.ok ? adoption.result.stdout.trim() : adoption.error,
  });
  if (!adoption.ok) {
    printJson({
      contract: "proflow.real-scene-ready.v1",
      status: classifyFailure(adoption.error),
      firstDivergence: "MONITOR_STATE_ADOPTION",
      reason: adoption.error,
      actions,
    });
    process.exit(classifyFailure(adoption.error) === "UNKNOWN" ? 2 : 3);
    return;
  }

  const browser = subprocess(
    "python3",
    [join(workspace, "automation/gptweb-mcp/playwright-ready.py")],
    220_000,
  );
  actions.push({
    action: "BROWSER_READY",
    status: browser.ok ? "PASS" : "FAIL",
    detail: browser.ok ? browser.result.stdout.trim() : browser.error,
  });
  if (!browser.ok) {
    printJson({
      contract: "proflow.real-scene-ready.v1",
      status: "UNKNOWN",
      firstDivergence: "BROWSER_CONTROL",
      reason: browser.error,
      actions,
    });
    process.exit(2);
    return;
  }

  const finalStatus = readPlatformStatus();
  if (!finalStatus.ready) {
    printJson({
      contract: "proflow.real-scene-ready.v1",
      status: "BLOCKED",
      firstDivergence: "FINAL_PLATFORM_READBACK",
      platform: finalStatus,
      actions,
    });
    process.exit(3);
    return;
  }

  printJson({
    contract: "proflow.real-scene-ready.v1",
    status: "READY",
    platform: {
      ready: true,
      current: finalStatus.current,
      next: finalStatus.next,
    },
    tunnel: {
      owner: tunnel.owner,
      publicBaseUrl: tunnel.publicBaseUrl,
    },
    actions,
  });
}
main().catch((error) => {
  const reason =
    error instanceof Error ? error.message : "PROFLOW_REAL_SCENE_READY_FAILED";
  printJson({
    contract: "proflow.real-scene-ready.v1",
    status: classifyFailure(reason),
    reason,
  });
  process.exitCode = classifyFailure(reason) === "UNKNOWN" ? 2 : 3;
});
