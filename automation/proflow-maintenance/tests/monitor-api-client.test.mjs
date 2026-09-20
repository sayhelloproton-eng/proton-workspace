import test from "node:test";
import assert from "node:assert/strict";

import {
  currentProjection,
  findChatByShift,
  MONITOR_BOOT_PROOF_V4,
  negotiateBootProofContract,
  stableRequestId,
  stableRef,
} from "../lib/monitor-api-client.mjs";

test("stable refs are deterministic and input-sensitive", () => {
  const a = stableRef("x", { b: 2, a: 1 });
  const b = stableRef("x", { b: 2, a: 1 });
  const c = stableRef("x", { b: 3, a: 1 });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(stableRequestId("chat.event", { chatId: "a" }), /^monitor-maintenance:chat-event:sha256:/);
});

test("current projection derives shift identity from canonical state", () => {
  const state = {
    chats: {
      "chat-a": { shiftId: "monitor-a" },
      "chat-b": { shiftId: "monitor-b" },
    },
  };
  assert.deepEqual(
    currentProjection(
      {
        currentChatId: "chat-a",
        mutationMode: "HANDOFF_ONLY",
        driveTargetChatId: "chat-b",
        pendingBootstrap: null,
      },
      state,
    ),
    {
      currentChatId: "chat-a",
      currentShiftId: "monitor-a",
      mutationMode: "HANDOFF_ONLY",
      driveTargetChatId: "chat-b",
      driveTargetShiftId: "monitor-b",
      pendingBootstrap: null,
    },
  );
});

test("findChatByShift rejects ambiguous or abandoned-only candidates", () => {
  const state = {
    chats: {
      "chat-a": {
        shiftId: "monitor-a",
        takeover: { abandonedAt: null },
      },
      "chat-b": {
        shiftId: "monitor-b",
        takeover: { abandonedAt: "2026-09-20T00:00:00.000Z" },
      },
    },
  };
  assert.equal(findChatByShift(state, "monitor-a").chatId, "chat-a");
  assert.throws(() => findChatByShift(state, "monitor-b"), /MONITOR_SHIFT_CHAT_NOT_UNIQUE/);
  assert.equal(
    findChatByShift(state, "monitor-b", { includeAbandoned: true }).chatId,
    "chat-b",
  );
});
test("boot proof capability negotiation requires v4 runtime adoption", async () => {
  assert.equal(
    await negotiateBootProofContract({
      invoke: async () => ({
        contract: "proflow.monitor-control-capabilities.v1",
        bootProofContracts: ["proflow.monitor-boot-proof.v3", MONITOR_BOOT_PROOF_V4],
        preferredBootProofContract: MONITOR_BOOT_PROOF_V4,
      }),
    }),
    MONITOR_BOOT_PROOF_V4,
  );

  await assert.rejects(
    negotiateBootProofContract({
      invoke: async () => { throw new Error("MONITOR_CONTROL_OPERATION_UNSUPPORTED"); },
    }),
    /MONITOR_BOOT_PROOF_RUNTIME_ADOPTION_REQUIRED/,
  );

  await assert.rejects(
    negotiateBootProofContract({
      invoke: async () => { throw new Error("MONITOR_CONTROL_TRANSPORT_UNKNOWN"); },
    }),
    /MONITOR_CONTROL_TRANSPORT_UNKNOWN/,
  );

  await assert.rejects(
    negotiateBootProofContract({
      invoke: async () => ({
        contract: "proflow.monitor-control-capabilities.v1",
        bootProofContracts: ["proflow.monitor-boot-proof.v3"],
        preferredBootProofContract: "proflow.monitor-boot-proof.v3",
      }),
    }),
    /MONITOR_BOOT_PROOF_V4_NOT_SUPPORTED/,
  );

  await assert.rejects(
    negotiateBootProofContract({ invoke: async () => ({}) }),
    /MONITOR_CONTROL_CAPABILITIES_INVALID/,
  );
});
