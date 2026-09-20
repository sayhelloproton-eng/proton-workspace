#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createMonitorApiClient,
  currentProjection,
  printJson,
  runMain,
  stableRequestId,
  valueArg,
} from "./lib/monitor-api-client.mjs";

function headerValue(text, name) {
  const match = new RegExp(`^${name}:\\s*(.+?)\\s*$`, "m").exec(text);
  if (!match) throw new Error(`HANDOFF_${name.toUpperCase()}_MISSING`);
  return match[1];
}

async function main() {
  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const handoffPath = join(
    client.workspace,
    "skills/proflow-chat-loop/.handoff/current.md",
  );
  const handoff = await readFile(handoffPath, "utf8");
  const handoffState = headerValue(handoff, "handoffState");
  const nextShiftId = headerValue(handoff, "nextShiftId");
  if (handoffState !== "READY_FOR_TAKEOVER")
    throw new Error("MONITOR_HANDOFF_AUTHORITY_NOT_READY");
  if (!nextShiftId || nextShiftId === "null")
    throw new Error("MONITOR_NEXT_SHIFT_ID_INVALID");

  const [current, state] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  const projection = currentProjection(current, state);
  const chatId = projection.currentChatId;
  if (!chatId) throw new Error("MONITOR_CURRENT_ABSENT");
  const chat = state?.chats?.[chatId];
  if (!chat) throw new Error("MONITOR_CHAT_NOT_FOUND");

  const alreadyCompleted = chat.handoff?.completedAt !== null;
  if (alreadyCompleted) {
    if (chat.handoff?.nextShiftId !== nextShiftId)
      throw new Error("MONITOR_HANDOFF_NEXT_SHIFT_MISMATCH");
  } else if (projection.mutationMode !== "HANDOFF_ONLY") {
    throw new Error("MONITOR_MUTATION_MODE_MISMATCH");
  }
  if (chat.pendingDispatch)
    throw new Error("MONITOR_DISPATCH_UNRESOLVED");

  const input = { chatId, nextShiftId };
  const requestId =
    valueArg("--request-id") ?? stableRequestId("handoff.complete", input);
  printJson(await client.invoke("handoff.complete", { requestId, ...input }));
}
await runMain(main, "PROFLOW_MONITOR_HANDOFF_COMPLETE");
