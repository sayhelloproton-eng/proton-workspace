import test from "node:test";
import assert from "node:assert/strict";

import {
  MONITOR_BROWSER_ACTIONS,
  nextBrowserAction,
  retirementCandidates,
  sceneDivergence,
} from "../lib/monitor-browser-routing.mjs";

const workspace = "/Users/agent/Desktop/proton-workspace";
const canonical = `${workspace}/skills/proflow-chat-loop/.runtime/monitor-state.json`;
const locator = "https://chatgpt.com/g/g-p-learning/c/chat-a";

function baseState() {
  return {
    contract: "proflow.monitor-state.v1",
    config: {
      loopEnabled: true,
      observationStaleMs: 30_000,
    },
    currentChatId: "chat-a",
    pendingBootstrap: null,
    chats: {
      "chat-a": {
        shiftId: "monitor-a",
        conversationLocator: locator,
        previousChatId: null,
        nextChatId: null,
        browserTarget: {
          tabId: 7,
          windowId: 9,
          lastUrl: locator,
        },
        page: {
          observedAt: new Date().toISOString(),
        },
        pendingDispatch: null,
        handoff: { completedAt: null },
        takeover: { abandonedAt: null },
      },
    },
  };
}

const current = {
  currentChatId: "chat-a",
  driveTargetChatId: "chat-a",
  mutationMode: "FULL",
};

test("UNKNOWN Browser effect always wins routing before runtime adoption", () => {
  const state = baseState();
  delete state.config.loopEnabled;
  state.config.enabled = true;
  state.chats["chat-a"].pendingDispatch = {
    state: "UNKNOWN",
    dispatchId: "drive-1",
    kind: "TURN_WAKE",
    effectRef: "execution:1",
  };
  assert.equal(
    nextBrowserAction({
      workspace,
      current,
      state,
      monitorStatePath: `${workspace}/.proflow/runtime/modules/execution-browser-extension/monitor/monitor-state.json`,
    }).action,
    MONITOR_BROWSER_ACTIONS.RECONCILE_EFFECT,
  );
});

test("old live runtime blocks every new Browser action after UNKNOWN is resolved", () => {
  const state = baseState();
  delete state.config.loopEnabled;
  state.config.enabled = true;
  assert.equal(
    nextBrowserAction({
      workspace,
      current,
      state,
      monitorStatePath: `${workspace}/.proflow/runtime/modules/execution-browser-extension/monitor/monitor-state.json`,
    }).action,
    MONITOR_BROWSER_ACTIONS.RUNTIME_ADOPTION_REQUIRED,
  );
});

test("pending bootstrap uses the formal drive after runtime adoption", () => {
  const state = baseState();
  state.pendingBootstrap = {
    phase: "PENDING_CREATE",
    create: { state: "STARTED", operationId: "create-1" },
  };
  assert.equal(
    nextBrowserAction({
      workspace,
      current,
      state,
      monitorStatePath: canonical,
    }).action,
    MONITOR_BROWSER_ACTIONS.EXECUTE_DRIVE,
  );
});

test("retirement requires owner-proven current FULL successor or explicit abandonment", () => {
  const state = baseState();
  state.chats["chat-b"] = {
    shiftId: "monitor-b",
    conversationLocator: "https://chatgpt.com/g/g-p-learning/c/chat-b",
    previousChatId: null,
    nextChatId: null,
    pendingDispatch: null,
    handoff: { completedAt: null },
    takeover: { abandonedAt: null },
  };
  assert.deepEqual(retirementCandidates(current, state), []);

  state.chats["chat-b"].takeover.abandonedAt = "2026-09-21T00:00:00.000Z";
  assert.deepEqual(
    retirementCandidates(current, state).map((item) => item.chatId),
    ["chat-b"],
  );

  state.chats["chat-b"].takeover.abandonedAt = null;
  state.chats["chat-a"].previousChatId = "chat-b";
  state.chats["chat-b"].nextChatId = "chat-a";
  state.chats["chat-b"].handoff.completedAt = "2026-09-21T00:00:00.000Z";
  assert.deepEqual(
    retirementCandidates(current, state).map((item) => item.chatId),
    ["chat-b"],
  );

  assert.deepEqual(
    retirementCandidates({ ...current, mutationMode: "NONE" }, state),
    [],
  );
});

test("scene verifier requires exact controlled-group active fresh target", () => {
  const state = baseState();
  const physical = {
    status: "READY",
    chatId: "chat-a",
    tabId: 7,
    windowId: 9,
    groupId: 17,
    grouped: true,
    url: locator,
    active: true,
  };
  assert.equal(
    sceneDivergence({ current, state, physical, now: Date.now() }),
    null,
  );
  assert.equal(
    sceneDivergence({
      current,
      state,
      physical: { ...physical, grouped: false },
      now: Date.now(),
    }),
    "MONITOR_TAB_NOT_IN_CONTROLLED_GROUP",
  );
  state.chats["chat-a"].pendingDispatch = {
    state: "UNKNOWN",
    dispatchId: "drive-2",
    kind: "TURN_WAKE",
  };
  assert.equal(
    sceneDivergence({ current, state, physical, now: Date.now() }),
    "MONITOR_BROWSER_EFFECT_UNRESOLVED",
  );
});
