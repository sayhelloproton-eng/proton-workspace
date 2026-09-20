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
  const requestId =
    valueArg("--request-id") ?? stableRequestId("config.update", patch);
  printJson(await client.invoke("config.update", { requestId, patch }));
}
await runMain(main, "PROFLOW_MONITOR_CONFIG");
