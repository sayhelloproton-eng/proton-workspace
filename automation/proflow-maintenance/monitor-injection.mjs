#!/usr/bin/env node
import {
  createMonitorApiClient,
  currentProjection,
  hasFlag,
  printJson,
  requiredArg,
  runMain,
  stableRef,
  stableRequestId,
  textArg,
  valueArg,
} from "./lib/monitor-api-client.mjs";

function liveChats(state) {
  return Object.entries(state?.chats ?? {}).filter(
    ([, chat]) => chat?.takeover?.abandonedAt === null,
  );
}

async function main() {
  const command = process.argv[2];
  if (!new Set(["turn-wake", "bootstrap"]).has(command))
    throw new Error("MONITOR_INJECTION_COMMAND_INVALID");

  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const [current, state] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  const projection = currentProjection(current, state);

  if (command === "turn-wake") {
    const chatId = valueArg("--chat-id") ?? projection.currentChatId;
    if (!chatId) throw new Error("MONITOR_CURRENT_ABSENT");
    const text = await textArg();
    const injectionId =
      valueArg("--injection-id") ??
      stableRef("turn-wake-injection", [chatId, text]);
    const data = {
      injectionId,
      text,
      ...(hasFlag("--replace") ? { replace: true } : {}),
    };
    const input = {
      chatId,
      type: "TURN_WAKE_INJECTION_STAGED",
      data,
    };
    const requestId =
      valueArg("--request-id") ?? stableRequestId("chat.event", input);
    printJson(await client.invoke("chat.event", { requestId, ...input }));
    return;
  }

  const expectedShiftId = requiredArg("--shift-id");
  const text = await textArg();
  const initial = hasFlag("--initial");
  const sourceChatId = initial
    ? null
    : valueArg("--source-chat-id") ?? projection.currentChatId;

  if (initial) {
    if (projection.currentChatId !== null || liveChats(state).length !== 0)
      throw new Error("MONITOR_BOOTSTRAP_PRECONDITION_FAILED");
  } else {
    if (!sourceChatId || projection.currentChatId !== sourceChatId)
      throw new Error("MONITOR_BOOTSTRAP_PRECONDITION_FAILED");
    const source = state?.chats?.[sourceChatId];
    if (
      !source ||
      source.takeover?.activatedAt === null ||
      source.handoff?.completedAt === null ||
      source.handoff?.nextShiftId !== expectedShiftId
    ) throw new Error("MONITOR_BOOTSTRAP_PRECONDITION_FAILED");
    const successorExists = Object.entries(state.chats ?? {}).some(
      ([chatId, chat]) =>
        chatId !== sourceChatId &&
        chat?.previousChatId === sourceChatId &&
        chat?.takeover?.activatedAt === null &&
        chat?.takeover?.abandonedAt === null,
    );
    if (successorExists) throw new Error("MONITOR_LIVE_SUCCESSOR_EXISTS");
  }
  if (state?.pendingBootstrap) throw new Error("MONITOR_BOOTSTRAP_ALREADY_PENDING");

  const injectionId =
    valueArg("--injection-id") ??
    stableRef("bootstrap-injection", [sourceChatId, expectedShiftId, text]);
  const input = {
    injectionId,
    sourceChatId,
    expectedShiftId,
    text,
  };
  const requestId =
    valueArg("--request-id") ?? stableRequestId("bootstrap.stage", input);
  printJson(await client.invoke("bootstrap.stage", { requestId, ...input }));
}
await runMain(main, "PROFLOW_MONITOR_INJECTION");
