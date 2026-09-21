#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

import {
  createMonitorApiClient,
  createMonitorApplicationClient,
  printJson,
  runMain,
  valueArg,
} from "./lib/monitor-api-client.mjs";
import {
  MONITOR_BROWSER_ACTIONS,
  hasPendingDrive,
  nextBrowserAction,
  retirementCandidates,
  sceneDivergence,
  targetChat,
  unresolvedBrowserEffect,
} from "./lib/monitor-browser-routing.mjs";
import { inspectBrowserExtensionArtifact } from "../proflow-browser-extension/lib/artifact-guard.mjs";

const workspace = resolve(valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace");
const maxActions = Number(valueArg("--max-actions") ?? "8");
const physicalHelper = join(workspace, "automation/proflow-maintenance/monitor-browser-physical.py");
const groupHelper = join(workspace, "tools/browser/playwright-controlled-group.py");
const boundaryHelper = join(
  workspace,
  "skills/chat-local-acceptance-automation-protocol/scripts/browser-run-boundary.py",
);

if (!Number.isInteger(maxActions) || maxActions < 1 || maxActions > 32)
  throw new Error("MONITOR_BROWSER_MAX_ACTIONS_INVALID");

function subprocess(command, args, { input, timeout = 30_000 } = {}) {
  const result = spawnSync(command, args, {
    cwd: workspace,
    encoding: "utf8",
    input,
    timeout,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function openRun(runId) {
  const record = {
    eventType: "AUTOMATION_START",
    runId,
    project: "proflow",
    scenario: "monitor-browser-step",
    acceptanceMode: "SAME_SCENE",
    neededCapabilities: ["SEE", "IDENTIFY", "ACT", "RECOVER", "VERIFY"],
    knownPathHit: true,
    freshEvidenceWindowBound: true,
  };
  const result = subprocess(
    "python3",
    [boundaryHelper, "open", "--mode", "exclusive", "--input", "-"],
    { input: JSON.stringify(record) },
  );
  if (result.status !== 0)
    throw new Error("MONITOR_BROWSER_ACCEPTANCE_BOUNDARY_BLOCKED");
}

function closeRun(runId, terminal) {
  const failureClass =
    terminal.status === "DONE"
      ? "NONE"
      : terminal.status === "UNKNOWN"
        ? "UNKNOWN"
        : "PREREQUISITE_NOT_READY";
  const sideEffectState =
    terminal.status === "UNKNOWN"
      ? "UNKNOWN"
      : terminal.lastDriveState === "APPLIED"
        ? "APPLIED"
        : "NOT_APPLICABLE";
  const record = {
    eventType: "AUTOMATION_RUN",
    runId,
    outcome: terminal.status,
    failureClass,
    sideEffectState,
  };
  const result = subprocess(
    "python3",
    [boundaryHelper, "close", "--input", "-"],
    { input: JSON.stringify(record) },
  );
  if (result.status !== 0)
    throw new Error("MONITOR_BROWSER_ACCEPTANCE_BOUNDARY_CLOSE_FAILED");
}

function parseJsonResult(stdout, contract, errorCode) {
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  const line = [...lines].reverse().find((item) => item.trim().startsWith("{"));
  if (!line) throw new Error(errorCode);
  const value = JSON.parse(line);
  if (value?.contract !== contract || !value?.result || typeof value.result !== "object")
    throw new Error(errorCode);
  return value.result;
}

function ensureControlledGroup() {
  const result = subprocess("python3", [groupHelper, "ensure"], { timeout: 35_000 });
  if (result.status !== 0)
    throw new Error(
      result.stderr.trim().split(/\r?\n/).at(-1) ||
      "MONITOR_CONTROLLED_GROUP_PREREQUISITE_FAILED",
    );
  const group = parseJsonResult(
    result.stdout,
    "workspace.playwright-controlled-group.v1",
    "MONITOR_CONTROLLED_GROUP_RESULT_INVALID",
  );
  if (
    group.status !== "READY" ||
    !Number.isInteger(group.groupId) ||
    !Number.isInteger(group.windowId)
  ) throw new Error("MONITOR_CONTROLLED_GROUP_NOT_READY");
  return group;
}

function parsePhysical(stdout) {
  return parseJsonResult(
    stdout,
    "proflow.monitor-browser-physical.v1",
    "MONITOR_BROWSER_PHYSICAL_RESULT_INVALID",
  );
}

function physical(action, target, { fingerprint } = {}) {
  const args = [
    physicalHelper,
    action,
    "--exact-url",
    target.chat.conversationLocator,
    "--chat-id",
    target.chatId,
  ];
  if (Number.isInteger(target.chat.browserTarget?.tabId))
    args.push("--target-tab-id", String(target.chat.browserTarget.tabId));
  if (fingerprint !== undefined)
    args.push("--fingerprint", fingerprint);
  const result = subprocess("python3", args, { timeout: 35_000 });
  if (result.status !== 0)
    throw new Error(
      result.stderr.trim().split(/\r?\n/).at(-1) ||
      "MONITOR_BROWSER_PHYSICAL_FAILED",
    );
  return parsePhysical(result.stdout);
}

async function waitForOwnerAlignment(client, expected, timeoutMs = 6_000) {
  const deadline = Date.now() + timeoutMs;
  do {
    const [current, state] = await Promise.all([
      client.invoke("current.read"),
      client.invoke("state.read"),
    ]);
    const target = targetChat(current, state);
    if (target) {
      const browserTarget = target.chat.browserTarget;
      const observedAt = Date.parse(target.chat.page?.observedAt ?? "");
      const staleMs = Number(state?.config?.observationStaleMs);
      const aligned =
        browserTarget?.tabId === expected.tabId &&
        browserTarget?.windowId === expected.windowId &&
        browserTarget?.lastUrl === expected.url &&
        Number.isFinite(observedAt) &&
        Number.isFinite(staleMs) &&
        Date.now() - observedAt < staleMs;
      if (aligned) return { current, state, target };
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  } while (Date.now() < deadline);
  return null;
}

async function main() {
  const runId = `proflow-monitor-browser-step:${Date.now()}:${process.pid}:${randomUUID()}`;
  let runOpened = false;
  let terminal = {
    contract: "proflow.monitor-browser-step.v1",
    status: "BLOCKED",
    reason: "MONITOR_BROWSER_STEP_NOT_STARTED",
    actions: [],
  };

  try {
    const artifact = await inspectBrowserExtensionArtifact({ workspace });
    terminal.artifact = artifact;
    if (artifact.status !== "READY") {
      terminal.status = "BLOCKED";
      terminal.reason = artifact.reason;
      terminal.actions.push({
        action: "EXTENSION_ARTIFACT_GUARD",
        status: "BLOCKED",
      });
      printJson(terminal);
      process.exitCode = 3;
      return;
    }
    terminal.actions.push({
      action: "EXTENSION_ARTIFACT_GUARD",
      status: "PASS",
    });

    openRun(runId);
    runOpened = true;

    const controlledGroup = ensureControlledGroup();
    terminal.actions.push({
      action: "ENSURE_CONTROLLED_GROUP",
      groupId: controlledGroup.groupId,
      windowId: controlledGroup.windowId,
    });
    terminal.controlledGroup = {
      groupId: controlledGroup.groupId,
      windowId: controlledGroup.windowId,
    };

    const client = await createMonitorApiClient({ workspace });
    const application = await createMonitorApplicationClient({ workspace });

    for (let index = 0; index < maxActions; index += 1) {
      const [current, state] = await Promise.all([
        client.invoke("current.read"),
        client.invoke("state.read"),
      ]);
      const route = nextBrowserAction({
        workspace,
        current,
        state,
        monitorStatePath: client.monitorStatePath,
      });

      if (route.action === MONITOR_BROWSER_ACTIONS.RECONCILE_EFFECT) {
        const unresolved = unresolvedBrowserEffect(state);
        terminal.actions.push({
          action: "RECONCILE_EFFECT",
          driveId: unresolved?.driveId ?? null,
        });

        let fingerprintFound = null;
        if (unresolved?.chatId) {
          const chat = state.chats?.[unresolved.chatId];
          const fingerprint = chat?.pendingDispatch?.contentFingerprint;
          if (!chat || typeof fingerprint !== "string" || fingerprint.length === 0)
            throw new Error("MONITOR_RECONCILIATION_TARGET_INVALID");
          const target = { chatId: unresolved.chatId, chat };

          terminal.actions.push({
            action: "SYNC_TARGET",
            chatId: unresolved.chatId,
            mode: "RECONCILIATION_SAFE",
          });
          let synced = physical("sync", target);
          if (synced.status === "NOT_FOUND") {
            terminal.actions.push({
              action: "RESTORE_EXISTING_TAB",
              chatId: unresolved.chatId,
            });
            synced = physical("restore", target);
          }
          if (synced.status === "NOT_FOUND") {
            terminal.status = "UNKNOWN";
            terminal.reason = "MONITOR_RECONCILIATION_TARGET_NOT_FOUND";
            break;
          }
          if (synced.status === "AMBIGUOUS") {
            terminal.status = "UNKNOWN";
            terminal.reason = "MONITOR_RECONCILIATION_TARGET_AMBIGUOUS";
            break;
          }
          if (synced.status !== "READY") {
            terminal.status = "UNKNOWN";
            terminal.reason = "MONITOR_RECONCILIATION_TARGET_UNKNOWN";
            break;
          }

          terminal.actions.push({
            action: "VERIFY_EFFECT_POSTCONDITION",
            chatId: unresolved.chatId,
          });
          const postcondition = physical("fingerprint", target, { fingerprint });
          if (postcondition.status !== "READY") {
            terminal.status = "UNKNOWN";
            terminal.reason = "MONITOR_EFFECT_POSTCONDITION_UNREADABLE";
            break;
          }
          fingerprintFound = postcondition.fingerprintFound === true;
          terminal.effectPostcondition = fingerprintFound ? "PRESENT" : "ABSENT";
        }

        const result = await application.drive();
        const driveState = String(result?.state ?? "UNKNOWN");
        terminal.lastDriveState = driveState;
        if (driveState === "UNKNOWN") {
          terminal.status = "UNKNOWN";
          terminal.reason =
            fingerprintFound === true
              ? "MONITOR_EXECUTION_RECONCILIATION_VISIBILITY_GAP"
              : "MONITOR_BROWSER_EFFECT_UNRESOLVED";
          break;
        }
        continue;
      }

      if (route.action === MONITOR_BROWSER_ACTIONS.RUNTIME_ADOPTION_REQUIRED) {
        terminal.actions.push({ action: "RUNTIME_ADOPTION_REQUIRED" });
        terminal.status = "BLOCKED";
        terminal.reason = "MONITOR_STATE_RUNTIME_ADOPTION_REQUIRED";
        break;
      }

      if (route.action === MONITOR_BROWSER_ACTIONS.EXECUTE_DRIVE) {
        terminal.actions.push({ action: "EXECUTE_DRIVE" });
        const result = await application.drive();
        const driveState = String(result?.state ?? "UNKNOWN");
        terminal.lastDriveState = driveState;
        if (driveState === "UNKNOWN") {
          terminal.status = "UNKNOWN";
          terminal.reason = "MONITOR_BROWSER_EFFECT_UNRESOLVED";
          break;
        }
        continue;
      }

      if (route.action === MONITOR_BROWSER_ACTIONS.RETIRE_CHAT) {
        const retirement = route.retirement;
        const chat = state.chats?.[retirement.chatId];
        if (!chat)
          throw new Error("MONITOR_RETIREMENT_TARGET_MISSING");
        terminal.actions.push({
          action: "RETIRE_CHAT",
          chatId: retirement.chatId,
          reason: retirement.reason,
        });
        const result = physical("retire", {
          chatId: retirement.chatId,
          chat,
        });
        if (result.status === "NOT_FOUND") continue;
        if (result.status !== "RETIRED") {
          terminal.status = "UNKNOWN";
          terminal.reason = "MONITOR_RETIREMENT_UNCONFIRMED";
          break;
        }
        continue;
      }

      const target = route.target ?? targetChat(current, state);
      if (!target) {
        terminal.actions.push({ action: "VERIFY_SCENE" });
        terminal.status = "BLOCKED";
        terminal.reason = "MONITOR_TARGET_CHAT_ABSENT";
        break;
      }

      terminal.actions.push({ action: "SYNC_TARGET", chatId: target.chatId });
      let physicalState = physical("sync", target);
      if (physicalState.status === "NOT_FOUND") {
        terminal.actions.push({
          action: "RESTORE_EXISTING_TAB",
          chatId: target.chatId,
        });
        physicalState = physical("restore", target);
      }
      if (physicalState.status === "NOT_FOUND") {
        terminal.status = "BLOCKED";
        terminal.reason = "MONITOR_CHAT_EXACT_TARGET_NOT_FOUND";
        break;
      }
      if (physicalState.status === "AMBIGUOUS") {
        terminal.status = "BLOCKED";
        terminal.reason = "MONITOR_CHAT_EXACT_TARGET_AMBIGUOUS";
        break;
      }
      if (physicalState.status !== "READY") {
        terminal.status = "UNKNOWN";
        terminal.reason = "MONITOR_PHYSICAL_TARGET_UNKNOWN";
        break;
      }

      let aligned = await waitForOwnerAlignment(client, physicalState);
      if (!aligned) {
        terminal.actions.push({ action: "RELOAD_TARGET", chatId: target.chatId });
        physicalState = physical("reload", target);
        if (physicalState.status !== "READY") {
          terminal.status = "UNKNOWN";
          terminal.reason = "MONITOR_TARGET_RELOAD_UNCONFIRMED";
          break;
        }
        aligned = await waitForOwnerAlignment(client, physicalState);
        if (!aligned) {
          terminal.status = "UNKNOWN";
          terminal.reason = "MONITOR_OBSERVATION_NOT_RECOVERED";
          break;
        }
      }

      const alignedUnknown = unresolvedBrowserEffect(aligned.state);
      if (alignedUnknown) continue;

      if (hasPendingDrive(aligned.state)) {
        terminal.actions.push({ action: "EXECUTE_DRIVE" });
        const result = await application.drive();
        const driveState = String(result?.state ?? "UNKNOWN");
        terminal.lastDriveState = driveState;
        if (driveState === "UNKNOWN") {
          terminal.status = "UNKNOWN";
          terminal.reason = "MONITOR_BROWSER_EFFECT_UNRESOLVED";
          break;
        }
        continue;
      }

      const retired = retirementCandidates(aligned.current, aligned.state);
      if (retired.length > 0) continue;

      terminal.actions.push({ action: "VERIFY_SCENE" });
      const inspected = physical("inspect", aligned.target);
      const [verifiedCurrent, verifiedState] = await Promise.all([
        client.invoke("current.read"),
        client.invoke("state.read"),
      ]);
      const divergence = sceneDivergence({
        current: verifiedCurrent,
        state: verifiedState,
        physical: inspected,
      });
      if (divergence === null) {
        terminal.status = "DONE";
        terminal.reason = null;
        break;
      }
      if (divergence === "MONITOR_RETIRED_CHAT_PRESENT") continue;
      if (
        divergence === "MONITOR_DISPATCH_PENDING" ||
        divergence === "MONITOR_BOOTSTRAP_PENDING" ||
        divergence === "MONITOR_BROWSER_EFFECT_UNRESOLVED"
      ) continue;
      terminal.status = "BLOCKED";
      terminal.reason = divergence;
      break;
    }

    if (
      terminal.status === "BLOCKED" &&
      terminal.reason === "MONITOR_BROWSER_STEP_NOT_STARTED"
    )
      terminal.reason = "MONITOR_BROWSER_ACTION_BUDGET_EXHAUSTED";
  } catch (error) {
    terminal = {
      ...terminal,
      status: "UNKNOWN",
      reason:
        error instanceof Error ? error.message : "MONITOR_BROWSER_STEP_FAILED",
    };
  } finally {
    if (runOpened) closeRun(runId, terminal);
  }

  printJson(terminal);
  if (terminal.status === "UNKNOWN") process.exitCode = 2;
  else if (terminal.status === "BLOCKED") process.exitCode = 3;
}

await runMain(main, "PROFLOW_MONITOR_BROWSER_STEP");
