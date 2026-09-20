#!/usr/bin/env node
import {
  createMonitorApiClient,
  currentProjection,
  printJson,
  requiredArg,
  runMain,
  stableRequestId,
  valueArg,
} from "./lib/monitor-api-client.mjs";

async function main() {
  const command = process.argv[2];
  if (!new Set(["blocked", "clear"]).has(command))
    throw new Error("MONITOR_EVENT_COMMAND_INVALID");

  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const [current, state] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  const projection = currentProjection(current, state);
  const chatId = valueArg("--chat-id") ?? projection.currentChatId;
  if (!chatId) throw new Error("MONITOR_CURRENT_ABSENT");

  let type;
  let data = {};
  if (command === "blocked") {
    type = "BLOCKED";
    const kind = requiredArg("--kind");
    if (!new Set(["USER_DECISION_REQUIRED", "EXTERNAL_BLOCKER"]).has(kind))
      throw new Error("MONITOR_HOLD_KIND_INVALID");
    data = {
      kind,
      incidentRef: requiredArg("--incident-ref"),
      reason: requiredArg("--reason"),
    };
  } else {
    type = "BLOCKER_CLEARED";
  }

  const input = { chatId, type, data };
  const requestId =
    valueArg("--request-id") ?? stableRequestId("chat.event", input);
  printJson(await client.invoke("chat.event", { requestId, ...input }));
}
await runMain(main, "PROFLOW_MONITOR_EVENT");
