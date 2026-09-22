#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { printJson, valueArg } from "./lib/monitor-api-client.mjs";

const workspace = resolve(
  valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace",
);
const packageRoot = join(
  workspace,
  "node_modules/@tomflow/proflow-dev-tunnel",
);
const packageBin = join(workspace, "node_modules/.bin/proflow-dev-tunnel");
const setupStateFile = join(
  workspace,
  ".proflow/runtime/external-resources/dev-tunnel/setup.json",
);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function packageIdentity() {
  const manifest = await readJson(join(packageRoot, "package.json"));
  if (
    manifest?.name !== "@tomflow/proflow-dev-tunnel" ||
    typeof manifest?.version !== "string"
  ) {
    throw new Error("DEV_TUNNEL_PACKAGE_IDENTITY_INVALID");
  }
  if (manifest?.bin?.["proflow-dev-tunnel"] !== "./dist/src/cli.js") {
    throw new Error("DEV_TUNNEL_PACKAGE_BIN_INVALID");
  }
  return {
    packageName: manifest.name,
    packageVersion: manifest.version,
  };
}

function runPackage(command, timeout) {
  return spawnSync(
    packageBin,
    [command, "--workspace", workspace],
    {
      cwd: workspace,
      encoding: "utf8",
      timeout,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    },
  );
}

function failureReason(result, fallback) {
  if (result.error) {
    return /timed out|ETIMEDOUT/i.test(result.error.message)
      ? "DEV_TUNNEL_PACKAGE_TIMEOUT"
      : result.error.message;
  }
  return (
    (result.stderr || result.stdout || "")
      .trim()
      .split(/\r?\n/)
      .at(-1) || fallback
  );
}

function classify(reason) {
  return /UNKNOWN|TIMEOUT|TRANSPORT/i.test(reason ?? "")
    ? "UNKNOWN"
    : "BLOCKED";
}

function requiredAction(reason, status) {
  if (status === "UNKNOWN") return "RECONCILE_DEV_TUNNEL_OWNER";
  if (/AUTH|LOGIN|授权|GITHUB/i.test(reason ?? ""))
    return "COMPLETE_DEV_TUNNEL_AUTH";
  return "ENGINEERING_DEV_TUNNEL_OWNER";
}

async function readyState() {
  const state = await readJson(setupStateFile);
  if (
    state?.contract !== "proflow.dev-tunnel-setup.v2" ||
    state?.phase !== "READY" ||
    typeof state?.tunnelId !== "string" ||
    !Number.isInteger(state?.gatewayPort) ||
    state.gatewayPort < 1 ||
    state.gatewayPort > 65535 ||
    typeof state?.publicBaseUrl !== "string"
  ) {
    throw new Error("DEV_TUNNEL_PACKAGE_READY_STATE_INVALID");
  }
  const publicUrl = new URL(state.publicBaseUrl);
  if (publicUrl.protocol !== "https:") {
    throw new Error("DEV_TUNNEL_PACKAGE_PUBLIC_URL_INVALID");
  }
  return state;
}

async function main() {
  const identity = await packageIdentity();

  const setup = runPackage("setup", 360_000);
  if (setup.error || setup.status !== 0) {
    const reason = failureReason(setup, "DEV_TUNNEL_PACKAGE_SETUP_FAILED");
    const status = classify(reason);
    const action = requiredAction(reason, status);
    printJson({
      contract: "proflow.dev-tunnel-ready.v1",
      status,
      reason,
      ...identity,
      owner: "@tomflow/proflow-dev-tunnel",
      requiredAction: action,
      next: action,
    });
    process.exitCode = status === "UNKNOWN" ? 2 : 3;
    return;
  }

  const verify = runPackage("verify", 120_000);
  if (verify.error || verify.status !== 0) {
    const reason = failureReason(verify, "DEV_TUNNEL_PACKAGE_VERIFY_FAILED");
    const status = classify(reason);
    const action = requiredAction(reason, status);
    printJson({
      contract: "proflow.dev-tunnel-ready.v1",
      status,
      reason,
      ...identity,
      owner: "@tomflow/proflow-dev-tunnel",
      requiredAction: action,
      next: action,
    });
    process.exitCode = status === "UNKNOWN" ? 2 : 3;
    return;
  }

  const state = await readyState();
  printJson({
    contract: "proflow.dev-tunnel-ready.v1",
    status: "READY",
    ...identity,
    owner: "@tomflow/proflow-dev-tunnel",
    tunnelId: state.tunnelId,
    port: state.gatewayPort,
    publicBaseUrl: state.publicBaseUrl,
    next: "REAL_SCENE_READY",
  });
}

main().catch((error) => {
  const reason =
    error instanceof Error ? error.message : "PROFLOW_DEV_TUNNEL_READY_FAILED";
  const status = classify(reason);
  const action = requiredAction(reason, status);
  printJson({
    contract: "proflow.dev-tunnel-ready.v1",
    status,
    reason,
    owner: "@tomflow/proflow-dev-tunnel",
    requiredAction: action,
    next: action,
  });
  process.exitCode = status === "UNKNOWN" ? 2 : 3;
});
