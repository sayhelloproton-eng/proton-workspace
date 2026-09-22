#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { printJson, valueArg } from "./lib/monitor-api-client.mjs";

const owner = "@tomflow/proflow-dev-tunnel";

export function devTunnelReady(workspace, run = spawnSync) {
  workspace = resolve(workspace);
  const base = { contract: "proflow.dev-tunnel-ready.v1", owner, workspace };
  const unknown = (reason) => ({ ...base, status: "UNKNOWN", reason,
    requiredAction: "RECONCILE_DEV_TUNNEL_OWNER", next: "RECONCILE_DEV_TUNNEL_OWNER" });
  let result;
  try { result = run(join(workspace, "node_modules/.bin/proflow-dev-tunnel"),
    ["reconcile", "--workspace", workspace, "--json"],
    { cwd: workspace, encoding: "utf8", timeout: 1_200_000 }); }
  catch { return unknown("DEV_TUNNEL_PACKAGE_EXECUTION_UNKNOWN"); }
  if (result.error || result.signal || result.status === null) return unknown("DEV_TUNNEL_PACKAGE_EXECUTION_UNKNOWN");
  let receipt;
  try { receipt = JSON.parse(result.stdout); }
  catch { return unknown("DEV_TUNNEL_PACKAGE_RECEIPT_REQUIRED"); }
  if (receipt?.contract !== "proflow.dev-tunnel-cli.v1" || receipt.workspace !== workspace || receipt.action !== "RECONCILE" ||
      !["READY", "ACTION_REQUIRED", "BLOCKED", "UNKNOWN", "FAIL"].includes(receipt.status) ||
      typeof receipt.reason !== "string" || typeof receipt.next !== "string")
    return unknown("DEV_TUNNEL_PACKAGE_RECEIPT_INVALID");
  if (receipt.status === "READY") {
    if (result.status !== 0 || receipt.credential !== "VALID" || receipt.tunnel !== "READY" || receipt.host !== "RUNNING" ||
        typeof receipt.publicBaseUrl !== "string" || !receipt.publicBaseUrl.startsWith("https://"))
      return unknown("DEV_TUNNEL_PACKAGE_READY_INVALID");
    return { ...base, status: "READY", publicBaseUrl: receipt.publicBaseUrl, next: "REAL_SCENE_READY" };
  }
  const requiredAction = receipt.status === "UNKNOWN" ? "RECONCILE_DEV_TUNNEL_OWNER" :
    receipt.next === "COMPLETE_DEV_TUNNEL_AUTH" ? "COMPLETE_DEV_TUNNEL_AUTH" : "ENGINEERING_DEV_TUNNEL_OWNER";
  return { ...base, status: receipt.status === "UNKNOWN" ? "UNKNOWN" : "ACTION_REQUIRED",
    ownerStatus: receipt.status, reason: receipt.reason, requiredAction, next: requiredAction };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const workspace = valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace";
  const receipt = devTunnelReady(workspace);
  printJson(receipt);
  process.exitCode = receipt.status === "READY" ? 0 : receipt.status === "UNKNOWN" ? 2 : 3;
}
