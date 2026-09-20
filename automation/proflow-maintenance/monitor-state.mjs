#!/usr/bin/env node
import {
  createMonitorApiClient,
  printJson,
  runMain,
  valueArg,
} from "./lib/monitor-api-client.mjs";

async function main() {
  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  printJson(await client.invoke("state.read"));
}
await runMain(main, "PROFLOW_MONITOR_STATE");
