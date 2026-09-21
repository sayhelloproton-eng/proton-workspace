import { resolve } from "node:path";

export const MONITOR_BROWSER_ACTIONS = Object.freeze({
  RECONCILE_EFFECT: "RECONCILE_EFFECT",
  RUNTIME_ADOPTION_REQUIRED: "RUNTIME_ADOPTION_REQUIRED",
  EXECUTE_DRIVE: "EXECUTE_DRIVE",
  SYNC_TARGET: "SYNC_TARGET",
  RETIRE_CHAT: "RETIRE_CHAT",
  VERIFY_SCENE: "VERIFY_SCENE",
});

export function canonicalMonitorStatePath(workspace) {
  return resolve(workspace, "skills/proflow-chat-loop/.runtime/monitor-state.json");
}

export function runtimeAdopted({ workspace, state, monitorStatePath }) {
  return Boolean(
    state?.contract === "proflow.monitor-state.v1" &&
    typeof state?.config?.loopEnabled === "boolean" &&
    typeof monitorStatePath === "string" &&
    resolve(monitorStatePath) === canonicalMonitorStatePath(workspace),
  );
}

export function unresolvedBrowserEffect(state) {
  if (
    state?.pendingBootstrap?.phase === "CREATE_UNKNOWN" ||
    state?.pendingBootstrap?.create?.state === "UNKNOWN"
  ) return {
    kind: "BOOTSTRAP",
    driveId: state.pendingBootstrap?.create?.operationId ?? null,
  };

  const entries = Object.entries(state?.chats ?? {}).filter(
    ([, chat]) => chat?.pendingDispatch?.state === "UNKNOWN",
  );
  if (entries.length > 1)
    throw new Error("MONITOR_DISPATCH_UNRESOLVED");
  if (entries.length === 1) {
    const [chatId, chat] = entries[0];
    return {
      kind: chat.pendingDispatch.kind,
      chatId,
      driveId: chat.pendingDispatch.dispatchId,
      effectRef: chat.pendingDispatch.effectRef ?? null,
    };
  }
  return null;
}

export function hasPendingDrive(state) {
  if (state?.pendingBootstrap) return true;
  return Object.values(state?.chats ?? {}).some((chat) => chat?.pendingDispatch);
}

export function targetChatId(current, state) {
  const candidate =
    current?.driveTargetChatId ??
    current?.currentChatId ??
    state?.currentChatId ??
    null;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

export function targetChat(current, state) {
  const chatId = targetChatId(current, state);
  if (!chatId) return null;
  const chat = state?.chats?.[chatId];
  return chat ? { chatId, chat } : null;
}

function unresolvedBootstrapReferences(state, chatId) {
  const bootstrap = state?.pendingBootstrap;
  return Boolean(
    bootstrap &&
    (
      bootstrap.sourceChatId === chatId ||
      bootstrap.create?.sourceChatId === chatId
    ),
  );
}

export function retirementCandidates(current, state) {
  const currentChatId = current?.currentChatId ?? state?.currentChatId ?? null;
  const currentChat = currentChatId ? state?.chats?.[currentChatId] : null;
  const candidates = [];

  for (const [chatId, chat] of Object.entries(state?.chats ?? {})) {
    if (!chat || chatId === currentChatId || chat.pendingDispatch) continue;
    if (unresolvedBootstrapReferences(state, chatId)) continue;

    const abandoned = chat.takeover?.abandonedAt !== null;
    const retiredPredecessor = Boolean(
      current?.mutationMode === "FULL" &&
      currentChat &&
      currentChat.previousChatId === chatId &&
      chat.nextChatId === currentChatId &&
      chat.handoff?.completedAt !== null,
    );
    if (abandoned || retiredPredecessor)
      candidates.push({
        chatId,
        conversationLocator: chat.conversationLocator,
        reason: abandoned ? "ABANDONED_NON_CURRENT" : "RETIRED_PREDECESSOR",
      });
  }
  return candidates;
}

export function sceneDivergence({ current, state, physical, now = Date.now() }) {
  if (unresolvedBrowserEffect(state)) return "MONITOR_BROWSER_EFFECT_UNRESOLVED";
  if (state?.pendingBootstrap) return "MONITOR_BOOTSTRAP_PENDING";
  if (
    Object.values(state?.chats ?? {}).some((chat) => chat?.pendingDispatch)
  ) return "MONITOR_DISPATCH_PENDING";

  const target = targetChat(current, state);
  if (!target) return "MONITOR_TARGET_CHAT_ABSENT";
  if (!physical || physical.status !== "READY") return "MONITOR_PHYSICAL_TARGET_NOT_READY";
  if (physical.chatId !== target.chatId) return "MONITOR_PHYSICAL_CHAT_MISMATCH";
  if (physical.url !== target.chat.conversationLocator)
    return "MONITOR_PHYSICAL_LOCATOR_MISMATCH";
  if (physical.grouped !== true || !Number.isInteger(physical.groupId))
    return "MONITOR_TAB_NOT_IN_CONTROLLED_GROUP";
  if (physical.active !== true) return "MONITOR_TAB_NOT_ACTIVE";

  const browserTarget = target.chat.browserTarget;
  if (!browserTarget) return "MONITOR_BROWSER_TARGET_NOT_BOUND";
  if (
    browserTarget.tabId !== physical.tabId ||
    browserTarget.windowId !== physical.windowId ||
    browserTarget.lastUrl !== physical.url
  ) return "MONITOR_BROWSER_TARGET_STALE";

  const observedAt = Date.parse(target.chat.page?.observedAt ?? "");
  const staleMs = Number(state?.config?.observationStaleMs);
  if (
    !Number.isFinite(observedAt) ||
    !Number.isFinite(staleMs) ||
    now - observedAt >= staleMs
  ) return "MONITOR_OBSERVATION_STALE";

  if (retirementCandidates(current, state).length > 0)
    return "MONITOR_RETIRED_CHAT_PRESENT";

  return null;
}

export function nextBrowserAction({ workspace, current, state, monitorStatePath }) {
  if (unresolvedBrowserEffect(state))
    return { action: MONITOR_BROWSER_ACTIONS.RECONCILE_EFFECT };

  if (!runtimeAdopted({ workspace, state, monitorStatePath }))
    return { action: MONITOR_BROWSER_ACTIONS.RUNTIME_ADOPTION_REQUIRED };

  if (state?.pendingBootstrap)
    return { action: MONITOR_BROWSER_ACTIONS.EXECUTE_DRIVE };

  const target = targetChat(current, state);
  if (!target) return { action: MONITOR_BROWSER_ACTIONS.VERIFY_SCENE };

  if (Object.values(state?.chats ?? {}).some((chat) => chat?.pendingDispatch))
    return { action: MONITOR_BROWSER_ACTIONS.SYNC_TARGET, target };

  const retired = retirementCandidates(current, state);
  if (retired.length > 0)
    return {
      action: MONITOR_BROWSER_ACTIONS.RETIRE_CHAT,
      retirement: retired[0],
    };

  return { action: MONITOR_BROWSER_ACTIONS.SYNC_TARGET, target };
}
