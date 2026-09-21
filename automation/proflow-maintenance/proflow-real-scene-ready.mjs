#!/usr/bin/env node
import { readFile } from "node:fs/promises";
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
async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
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
async function tunnelIdentity() {
  const tunnel = await json(
    join(workspace, ".proflow/runtime/modules/dev-tunnel/shared-facts.json"),
  );
  const gateway = await json(
    join(workspace, ".proflow/runtime/modules/agent-gateway/shared-facts.json"),
  );
  const tunnelId = tunnel?.facts?.tunnelId;
  const localBaseUrl = gateway?.facts?.localBaseUrl;
  if (typeof tunnelId !== "string" || typeof localBaseUrl !== "string")
    throw new Error("DEV_TUNNEL_SHARED_FACTS_MISSING");
  const port = Number(new URL(localBaseUrl).port);
  if (!Number.isInteger(port) || port < 1) throw new Error("GATEWAY_PORT_INVALID");
  return { tunnelId, port };
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

  const tunnel = await tunnelIdentity();
  const tunnelReady = subprocess(
    join(workspace, "scripts/dev-tunnel"),
    ["ready", tunnel.tunnelId, String(tunnel.port)],
    220_000,
  );
  actions.push({
    action: "DEV_TUNNEL_READY",
    status: tunnelReady.ok ? "PASS" : "FAIL",
    detail: tunnelReady.ok ? tunnelReady.result.stdout.trim() : tunnelReady.error,
  });
  if (!tunnelReady.ok) {
    printJson({
      contract: "proflow.real-scene-ready.v1",
      status: classifyFailure(tunnelReady.error),
      firstDivergence: "DEV_TUNNEL",
      reason: tunnelReady.error,
      actions,
    });
    process.exit(classifyFailure(tunnelReady.error) === "UNKNOWN" ? 2 : 3);
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
    tunnel,
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
