#!/usr/bin/env node
import {
  createMonitorApiClient,
  parseJsonArg,
  printJson,
  runMain,
  stableRequestId,
  valueArg,
} from "./lib/monitor-api-client.mjs";

async function main() {
  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const patch = parseJsonArg("--patch-json");
  if (!patch) {
    printJson(await client.invoke("config.read"));
    return;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "enabled"))
    throw new Error("MONITOR_CONFIG_LEGACY_ENABLED_FORBIDDEN");
  const requestId =
    valueArg("--request-id") ?? stableRequestId("config.update", patch);
  printJson(await client.invoke("config.update", { requestId, patch }));
}
await runMain(main, "PROFLOW_MONITOR_CONFIG");
