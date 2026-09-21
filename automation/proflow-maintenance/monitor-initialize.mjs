#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import {
  createMonitorApiClient,
  currentProjection,
  printJson,
  requiredArg,
  valueArg,
} from "./lib/monitor-api-client.mjs";
import { resolveMonitorContext } from "./lib/monitor-context.mjs";

const workspace = resolve(
  valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace",
);
const shiftId = requiredArg("--shift-id");

function liveChats(state) {
  return Object.entries(state?.chats ?? {}).filter(
    ([, chat]) => chat?.takeover?.abandonedAt === null,
  );
}

function runScript(path, args, timeoutMs = 120_000) {
  const result = spawnSync(process.execPath, [path, ...args], {
    cwd: workspace,
    encoding: "utf8",
    timeout: timeoutMs,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  if (result.error) return { ok: false, error: result.error.message, result };
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout)
      .trim()
      .split(/\r?\n/)
      .at(-1);
    return { ok: false, error: detail || "MONITOR_HELPER_FAILED", result };
  }
  try {
    return { ok: true, value: JSON.parse(result.stdout.trim()), result };
  } catch {
    return { ok: false, error: "MONITOR_HELPER_RESULT_INVALID", result };
  }
}

function bootstrapText(context) {
  return JSON.stringify({
    contract: "proflow.monitor-chat-drive.v1",
    triggerType: "MONITOR_BOOTSTRAP",
    expectedShiftId: shiftId,
    text:
      "你是 ProFlow Initial Monitor。先分别读取当前本机 Engineering/Acceptance authority、proflow-chat-loop Skill、ProFlow public-context README、CURRENT + CURRENT.REQUIRED_CONTEXT；运行 monitor-context-manifest.mjs 可机械获得读取路径，但不能替代真实阅读。完成读取后执行 monitor-claim.mjs --shift-id " +
      shiftId +
      " --authorities-read。只有 current.read 证明当前 chat/shift 且 mutationMode=FULL 后，才允许修改 ProFlow；项目动作只从 fresh CURRENT.NEXT_ACTION 获取。",
    authorityPointers: {
      engineering: context.engineeringSkill,
      acceptance: context.acceptanceSkill,
      loop: context.chatLoopPaths.LOOP_SKILL,
      current: context.projectPaths.CURRENT,
    },
  });
}

function classify(reason) {
  return /UNKNOWN|TRANSPORT|TIMEOUT/i.test(reason ?? "")
    ? "UNKNOWN"
    : "BLOCKED";
}

async function readTruth(client) {
  const [current, state] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  return { current, state, projection: currentProjection(current, state) };
}

async function main() {
  if (!/^monitor-[a-z0-9][a-z0-9-]*$/i.test(shiftId))
    throw new Error("MONITOR_INITIAL_SHIFT_ID_INVALID");

  const client = await createMonitorApiClient({ workspace });
  const context = await resolveMonitorContext(workspace);
  let truth = await readTruth(client);

  const existing = liveChats(truth.state);
  if (truth.projection.currentChatId !== null || existing.length > 0) {
    printJson({
      contract: "proflow.monitor-initialize.v1",
      status: "BLOCKED",
      reason: "MONITOR_INITIAL_ALREADY_EXISTS",
      shiftId,
      current: truth.projection,
      liveChatCount: existing.length,
    });
    process.exit(3);
    return;
  }

  const pending = truth.state?.pendingBootstrap;
  if (
    pending &&
    (pending.expectedShiftId !== shiftId || pending.sourceChatId !== null)
  ) {
    printJson({
      contract: "proflow.monitor-initialize.v1",
      status: "BLOCKED",
      reason: "MONITOR_BOOTSTRAP_ALREADY_PENDING",
      shiftId,
      pendingExpectedShiftId: pending.expectedShiftId ?? null,
    });
    process.exit(3);
    return;
  }

  let staged = Boolean(pending);
  if (!staged) {
    const injection = runScript(
      join(workspace, "automation/proflow-maintenance/monitor-injection.mjs"),
      [
        "bootstrap",
        "--workspace",
        workspace,
        "--initial",
        "--shift-id",
        shiftId,
        "--text",
        bootstrapText(context),
      ],
      30_000,
    );

    if (!injection.ok) {
      truth = await readTruth(client);
      const reconciled = truth.state?.pendingBootstrap;
      if (
        reconciled?.expectedShiftId !== shiftId ||
        reconciled?.sourceChatId !== null
      ) {
        const status = classify(injection.error);
        printJson({
          contract: "proflow.monitor-initialize.v1",
          status,
          stage: "BOOTSTRAP_STAGE",
          reason: injection.error,
          shiftId,
        });
        process.exit(status === "UNKNOWN" ? 2 : 3);
        return;
      }
    }
    staged = true;
  }

  const browser = runScript(
    join(workspace, "automation/proflow-maintenance/monitor-browser-step.mjs"),
    ["--workspace", workspace],
    180_000,
  );

  truth = await readTruth(client);
  const candidate = Object.entries(truth.state?.chats ?? {}).find(
    ([, chat]) =>
      chat?.shiftId === shiftId &&
      chat?.takeover?.abandonedAt === null,
  );

  if (candidate) {
    printJson({
      contract: "proflow.monitor-initialize.v1",
      status: "REGISTERED",
      shiftId,
      chatId: candidate[0],
      staged,
      browser: browser.ok ? browser.value : null,
      current: truth.projection,
    });
    return;
  }

  if (!browser.ok) {
    const status = classify(browser.error);
    printJson({
      contract: "proflow.monitor-initialize.v1",
      status,
      stage: "BROWSER_STEP",
      reason: browser.error,
      shiftId,
      staged,
      current: truth.projection,
    });
    process.exit(status === "UNKNOWN" ? 2 : 3);
    return;
  }

  if (
    truth.state?.pendingBootstrap?.expectedShiftId === shiftId &&
    truth.state?.pendingBootstrap?.sourceChatId === null
  ) {
    printJson({
      contract: "proflow.monitor-initialize.v1",
      status: "STAGED",
      shiftId,
      staged,
      browser: browser.value,
      current: truth.projection,
    });
    return;
  }

  printJson({
    contract: "proflow.monitor-initialize.v1",
    status: "UNKNOWN",
    stage: "READBACK",
    reason: "MONITOR_INITIAL_CREATE_READBACK_UNKNOWN",
    shiftId,
    current: truth.projection,
  });
  process.exit(2);
}

main().catch((error) => {
  const reason =
    error instanceof Error ? error.message : "MONITOR_INITIALIZE_FAILED";
  printJson({
    contract: "proflow.monitor-initialize.v1",
    status: classify(reason),
    reason,
    shiftId,
  });
  process.exitCode = classify(reason) === "UNKNOWN" ? 2 : 3;
});
