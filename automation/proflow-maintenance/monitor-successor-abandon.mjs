#!/usr/bin/env node
import {
  createMonitorApiClient,
  findChatByShift,
  printJson,
  requiredArg,
  runMain,
  stableRequestId,
  valueArg,
} from "./lib/monitor-api-client.mjs";

async function main() {
  const shiftId = requiredArg("--shift-id");
  const reason = requiredArg("--reason");
  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const state = await client.invoke("state.read");
  const { chatId, chat } = findChatByShift(state, shiftId, { includeAbandoned: true });

  if (chat.takeover?.abandonedAt !== null) {
    printJson({
      contract: "proflow.monitor-successor-abandon.v1",
      status: "ALREADY_ABANDONED",
      shiftId,
      chatId,
      abandonedAt: chat.takeover.abandonedAt,
    });
    return;
  }
  if (state.currentChatId === chatId || chat.takeover?.activatedAt !== null)
    throw new Error("MONITOR_SUCCESSOR_ABANDON_FORBIDDEN");
  if (chat.pendingDispatch)
    throw new Error("MONITOR_DISPATCH_UNRESOLVED");

  const input = { chatId, reason };
  const requestId =
    valueArg("--request-id") ?? stableRequestId("successor.abandon", input);
  printJson({
    contract: "proflow.monitor-successor-abandon.v1",
    status: "ABANDONED",
    shiftId,
    chatId,
    result: await client.invoke("successor.abandon", { requestId, ...input }),
  });
}
await runMain(main, "PROFLOW_MONITOR_SUCCESSOR_ABANDON");
