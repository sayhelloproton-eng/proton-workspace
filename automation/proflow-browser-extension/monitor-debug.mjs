#!/usr/bin/env node
import {
  createMonitorApiClient,
  printJson,
  runMain,
  valueArg,
} from "../proflow-maintenance/lib/monitor-api-client.mjs";

async function main() {
  const client = await createMonitorApiClient({
    workspace: valueArg("--workspace") ?? undefined,
  });
  const [config, current, state, outbox] = await Promise.all([
    client.invoke("config.read"),
    client.invoke("current.read"),
    client.invoke("state.read"),
    client.invoke("notification.readOutbox"),
  ]);
  printJson({
    contract: "proflow.monitor-debug-snapshot.v2",
    collectedAt: new Date().toISOString(),
    config,
    current,
    state,
    outbox,
  });
}
await runMain(main, "PROFLOW_MONITOR_DEBUG");
