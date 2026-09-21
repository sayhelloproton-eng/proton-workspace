#!/usr/bin/env node
import {
  createMonitorApiClient,
  findChatByShift,
  hasFlag,
  MONITOR_BOOT_PROOF_V4,
  negotiateBootProofContract,
  printJson,
  requiredArg,
  runMain,
  stableRequestId,
  valueArg,
} from "./lib/monitor-api-client.mjs";
import { resolveMonitorContext } from "./lib/monitor-context.mjs";

async function main() {
  if (!hasFlag("--authorities-read"))
    throw new Error("MONITOR_BOOT_AUTHORITIES_NOT_ATTESTED");
  const shiftId = requiredArg("--shift-id");
  const client = await createMonitorApiClient({
    workspace: valueArg("--workspace") ?? undefined,
  });
  const context = await resolveMonitorContext(client.workspace);

  const state = await client.invoke("state.read");
  if (state?.config?.loopEnabled !== true) throw new Error("MONITOR_DISABLED");
  const { chatId, chat } = findChatByShift(state, shiftId);
  if (chat.takeover?.bootProofAt !== null) {
    if (chat.takeover?.bootProof?.chatRef !== chatId)
      throw new Error("MONITOR_BOOT_PROOF_CHAT_MISMATCH");
    printJson({
      contract: "proflow.monitor-boot-proof-publication.v2",
      status: chat.takeover?.activatedAt
        ? "ALREADY_ACTIVE"
        : "ALREADY_RECORDED",
      shiftId,
      chatId,
      bootProofAt: chat.takeover.bootProofAt,
      proofContract: chat.takeover?.bootProof?.contract ?? null,
    });
    return;
  }

  const proofContract = await negotiateBootProofContract(client);
  if (proofContract !== MONITOR_BOOT_PROOF_V4)
    throw new Error("MONITOR_BOOT_PROOF_V4_NOT_SUPPORTED");

  const observedAt = new Date().toISOString();
  const proof = {
    contract: MONITOR_BOOT_PROOF_V4,
    chatRef: chatId,
    projectContextProofs: {
      ...context.projectPaths,
      REQUIRED_CONTEXT: context.requiredAbsolute,
    },
    chatLoopContextProof: context.chatLoopPaths,
    localDevProof: {
      tool: "Local Dev",
      protocolPath: context.engineeringSkill,
      observedAt,
    },
    observedAt,
  };
  const input = { chatId, proof };
  const requestId =
    valueArg("--request-id") ?? stableRequestId("bootProof.record", input);
  const result = await client.invoke("bootProof.record", {
    requestId,
    ...input,
  });
  printJson({
    contract: "proflow.monitor-boot-proof-publication.v2",
    status: result?.status ?? "RECORDED",
    shiftId,
    chatId,
    observedAt,
    proofContract,
    result,
  });
}
await runMain(main, "PROFLOW_MONITOR_BOOT_PROOF");
