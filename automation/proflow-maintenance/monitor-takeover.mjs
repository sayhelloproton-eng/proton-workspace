#!/usr/bin/env node
import {
  createMonitorApiClient,
  currentProjection,
  findChatByShift,
  printJson,
  requiredArg,
  runMain,
  stableRequestId,
  valueArg,
} from "./lib/monitor-api-client.mjs";

async function main() {
  const shiftId = requiredArg("--shift-id");
  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const state = await client.invoke("state.read");
  const { chatId, chat } = findChatByShift(state, shiftId);

  if (state.currentChatId === chatId && chat.takeover?.activatedAt) {
    const current = await client.invoke("current.read");
    printJson({
      contract: "proflow.monitor-takeover.v1",
      status: "ALREADY_CURRENT",
      shiftId,
      chatId,
      current: currentProjection(current, state),
    });
    return;
  }
  if (!chat.takeover?.bootProofAt) throw new Error("MONITOR_BOOT_PROOF_REQUIRED");
  if (chat.previousChatId) {
    const predecessor = state.chats?.[chat.previousChatId];
    if (
      !predecessor ||
      predecessor.handoff?.completedAt === null ||
      predecessor.handoff?.nextShiftId !== shiftId
    ) throw new Error("MONITOR_HANDOFF_REQUIRED");
  }

  const input = { chatId };
  const requestId =
    valueArg("--request-id") ?? stableRequestId("takeover.accept", input);
  const result = await client.invoke("takeover.accept", { requestId, ...input });
  const [currentAfter, stateAfter] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  const projection = currentProjection(currentAfter, stateAfter);
  if (
    projection.currentChatId !== chatId ||
    projection.currentShiftId !== shiftId ||
    projection.mutationMode !== "FULL"
  ) throw new Error("MONITOR_TAKEOVER_READBACK_MISMATCH");

  printJson({
    contract: "proflow.monitor-takeover.v1",
    status: "ACCEPTED",
    shiftId,
    chatId,
    result,
    current: projection,
  });
}
await runMain(main, "PROFLOW_MONITOR_TAKEOVER");
