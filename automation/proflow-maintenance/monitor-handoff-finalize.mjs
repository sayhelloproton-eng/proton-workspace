#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  createMonitorApiClient,
  currentProjection,
  printJson,
  stableRef,
  stableRequestId,
  valueArg,
} from "./lib/monitor-api-client.mjs";
import { resolveMonitorContext } from "./lib/monitor-context.mjs";

const workspace = resolve(
  valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace",
);
const handoffPath = join(workspace, "skills/proflow-chat-loop/.handoff/current.md");

function oneLine(value, name) {
  if (typeof value !== "string" || !value.trim() || /[\r\n]/.test(value))
    throw new Error(`HANDOFF_${name}_INVALID`);
  return value.trim();
}
function stringList(value, name) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim()))
    throw new Error(`HANDOFF_${name}_INVALID`);
  return value.map((item) => oneLine(item, name));
}
async function inputObject() {
  const inline = valueArg("--input-json");
  const file = valueArg("--input-file");
  if ((inline && file) || (!inline && !file)) throw new Error("HANDOFF_INPUT_REQUIRED");
  const raw = inline ?? (await readFile(resolve(file), "utf8"));
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("HANDOFF_INPUT_INVALID");
  return value;
}
function headerVersion(text) {
  const match = /^chatLoopContextVersion:\s*(\d+)\s*$/m.exec(text);
  return match ? Number(match[1]) : 0;
}
function bullets(items) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
function renderHandoff(input, version, context) {
  const nextShiftId = oneLine(input.nextShiftId, "NEXT_SHIFT_ID");
  const nextAction = oneLine(input.chatLoopNextAction, "NEXT_ACTION");
  const completed = stringList(input.completedThisChat ?? [], "COMPLETED");
  const blockers = stringList(input.blockers ?? [], "BLOCKERS");
  const preserve = stringList(input.mustPreserve ?? [], "MUST_PRESERVE");
  const mustNot = stringList(input.mustNotDo ?? [], "MUST_NOT_DO");
  const divergence =
    input.chatLoopFirstDivergence === null || input.chatLoopFirstDivergence === undefined
      ? "none"
      : oneLine(input.chatLoopFirstDivergence, "FIRST_DIVERGENCE");
  return `# ProFlow Chat Loop — Continuation Checkpoint

chatLoopContextVersion: ${version}
updatedAt: ${new Date().toISOString()}
handoffState: READY_FOR_TAKEOVER
nextShiftId: ${nextShiftId}
chatLoopOwner: MONITOR_SHIFT
chatLoopStage: FORMAL_ROTATION_HANDOFF
chatLoopNextAction: ${nextAction}

## 0. Ownership boundary

This file owns only Chat-to-Chat continuation. Project state belongs to ProFlow CURRENT/Formal Spec; Monitor runtime/lifecycle belongs to Node Monitor Service.

## 1. Completed this Chat

${bullets(completed)}

## 2. Chat-specific first divergence

${divergence}

## 3. Blockers

${bullets(blockers)}

## 4. Authority references

- ProFlow CURRENT: ${context.projectPaths.CURRENT}
- ProFlow public context: ${context.projectPaths.PUBLIC_CONTEXT_README}
- Engineering authority: ${context.engineeringSkill}
- Acceptance authority: ${context.acceptanceSkill}
- Chat-loop authority: ${context.chatLoopPaths.LOOP_SKILL}
- Runtime owner: Node Monitor Service via automation/proflow-maintenance/monitor-current.mjs and monitor-state.mjs
- Browser action owner: automation/proflow-maintenance/monitor-browser-step.mjs

## 5. mustPreserve

- exactly one rolling .handoff/current.md
- owner separation: project / chat-loop / runtime
- one canonical Browser owner and controlled group
- no successor mutation before self boot proof + owner-proven FULL takeover
${preserve.map((item) => `- ${item}`).join("\n")}

## 6. mustNotDo

- do not infer project NEXT_ACTION from this file
- do not create a replacement Chat because Browser control is UNKNOWN
- do not create a second successor while create/takeover is unresolved
- do not clean/reset/stash/rebase unrelated WIP
${mustNot.map((item) => `- ${item}`).join("\n")}
`;
}
function subprocess(path, args, timeout = 90_000) {
  const result = spawnSync(process.execPath, [path, ...args], {
    cwd: workspace,
    encoding: "utf8",
    timeout,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  if (result.error) return { ok: false, error: result.error.message, result };
  if (result.status !== 0)
    return {
      ok: false,
      error:
        (result.stderr || result.stdout).trim().split(/\r?\n/).at(-1) ||
        "MONITOR_HELPER_FAILED",
      result,
    };
  try {
    return { ok: true, value: JSON.parse(result.stdout.trim()), result };
  } catch {
    return { ok: false, error: "MONITOR_HELPER_RESULT_INVALID", result };
  }
}
async function atomicWrite(path, text) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, text, "utf8");
  await rename(temporary, path);
}
function bootstrapText(nextShiftId, nextAction, context) {
  return JSON.stringify({
    contract: "proflow.monitor-chat-drive.v1",
    triggerType: "MONITOR_BOOTSTRAP",
    expectedShiftId: nextShiftId,
    text:
      "接管 ProFlow Monitor 班次。先分别读取当前本机 Engineering/Acceptance authority、proflow-chat-loop Skill 与唯一 handoff、ProFlow public-context README、CURRENT + CURRENT.REQUIRED_CONTEXT；运行 monitor-context-manifest.mjs 可机械获得读取路径，但不能替代真实阅读。完成读取后执行 monitor-claim.mjs --shift-id " +
      nextShiftId +
      " --authorities-read，并且只有 current.read 证明 mutationMode=FULL 后才允许 ProFlow mutation。Chat-loop continuation action=" +
      nextAction +
      "；项目动作必须从 fresh CURRENT.NEXT_ACTION 获取。",
    authorityPointers: {
      engineering: context.engineeringSkill,
      acceptance: context.acceptanceSkill,
      loop: context.chatLoopPaths.LOOP_SKILL,
      handoff: context.chatLoopPaths.CONTINUATION,
      current: context.projectPaths.CURRENT,
    },
  });
}

async function main() {
  const input = await inputObject();
  const nextShiftId = oneLine(input.nextShiftId, "NEXT_SHIFT_ID");
  if (!/^monitor-[a-z0-9][a-z0-9-]*$/i.test(nextShiftId))
    throw new Error("HANDOFF_NEXT_SHIFT_ID_INVALID");
  const nextAction = oneLine(input.chatLoopNextAction, "NEXT_ACTION");

  const context = await resolveMonitorContext(workspace);
  const client = await createMonitorApiClient({ workspace });
  let [current, state] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  let projection = currentProjection(current, state);
  const sourceChatId = projection.currentChatId;
  if (!sourceChatId) throw new Error("MONITOR_CURRENT_ABSENT");
  let source = state.chats?.[sourceChatId];
  if (!source) throw new Error("MONITOR_CHAT_NOT_FOUND");
  if (source.pendingDispatch) throw new Error("MONITOR_DISPATCH_UNRESOLVED");
  const alreadyCompleted = source.handoff?.completedAt !== null;
  if (!alreadyCompleted && projection.mutationMode !== "HANDOFF_ONLY")
    throw new Error("MONITOR_HANDOFF_NOT_READY");
  if (alreadyCompleted && source.handoff?.nextShiftId !== nextShiftId)
    throw new Error("MONITOR_HANDOFF_NEXT_SHIFT_MISMATCH");

  let existing = "";
  try {
    existing = await readFile(handoffPath, "utf8");
  } catch {}
  const document = renderHandoff(
    input,
    Math.max(1, headerVersion(existing) + 1),
    context,
  );
  await atomicWrite(handoffPath, document);

  if (!alreadyCompleted) {
    const handoffInput = { chatId: sourceChatId, nextShiftId };
    const requestId = stableRequestId("handoff.complete", handoffInput);
    try {
      await client.invoke("handoff.complete", {
        requestId,
        ...handoffInput,
      });
    } catch (error) {
      [current, state] = await Promise.all([
        client.invoke("current.read"),
        client.invoke("state.read"),
      ]);
      source = state.chats?.[sourceChatId];
      if (
        source?.handoff?.completedAt === null ||
        source?.handoff?.nextShiftId !== nextShiftId
      )
        throw new Error(
          error instanceof Error && /UNKNOWN|TRANSPORT/.test(error.message)
            ? "MONITOR_HANDOFF_COMPLETE_UNKNOWN"
            : error instanceof Error
              ? error.message
              : "MONITOR_HANDOFF_COMPLETE_FAILED",
        );
    }
  }

  [current, state] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  projection = currentProjection(current, state);
  source = state.chats?.[sourceChatId];
  if (
    !source?.handoff?.completedAt ||
    source.handoff.nextShiftId !== nextShiftId ||
    projection.mutationMode !== "NONE"
  )
    throw new Error("MONITOR_HANDOFF_COMPLETE_READBACK_MISMATCH");

  const text = bootstrapText(nextShiftId, nextAction, context);
  const matchingPending =
    state.pendingBootstrap?.expectedShiftId === nextShiftId &&
    state.pendingBootstrap?.sourceChatId === sourceChatId;
  if (state.pendingBootstrap && !matchingPending)
    throw new Error("MONITOR_BOOTSTRAP_ALREADY_PENDING");
  if (!matchingPending) {
    const injectionId = stableRef("bootstrap-injection", [
      sourceChatId,
      nextShiftId,
      text,
    ]);
    const bootstrapInput = {
      injectionId,
      sourceChatId,
      expectedShiftId: nextShiftId,
      text,
    };
    const requestId = stableRequestId("bootstrap.stage", bootstrapInput);
    try {
      await client.invoke("bootstrap.stage", {
        requestId,
        ...bootstrapInput,
      });
    } catch (error) {
      state = await client.invoke("state.read");
      if (
        state.pendingBootstrap?.expectedShiftId !== nextShiftId ||
        state.pendingBootstrap?.sourceChatId !== sourceChatId
      )
        throw new Error(
          error instanceof Error && /UNKNOWN|TRANSPORT/.test(error.message)
            ? "MONITOR_BOOTSTRAP_STAGE_UNKNOWN"
            : error instanceof Error
              ? error.message
              : "MONITOR_BOOTSTRAP_STAGE_FAILED",
        );
    }
  }

  const browserStep = subprocess(
    join(workspace, "automation/proflow-maintenance/monitor-browser-step.mjs"),
    ["--workspace", workspace],
    150_000,
  );
  if (!browserStep.ok) {
    let value = null;
    try {
      value = JSON.parse(browserStep.result?.stdout?.trim() ?? "");
    } catch {}
    printJson({
      contract: "proflow.monitor-handoff-finalize.v1",
      status: value?.status ?? "UNKNOWN",
      stage: "BROWSER_STEP",
      reason: value?.reason ?? browserStep.error,
      sourceChatId,
      nextShiftId,
      handoffPath,
    });
    process.exit(value?.status === "BLOCKED" ? 3 : 2);
    return;
  }

  state = await client.invoke("state.read");
  const successor = Object.entries(state.chats ?? {}).find(
    ([, chat]) =>
      chat?.shiftId === nextShiftId &&
      chat?.takeover?.abandonedAt === null,
  );
  printJson({
    contract: "proflow.monitor-handoff-finalize.v1",
    status: successor ? "SUCCESSOR_REGISTERED" : "SUCCESSOR_STAGED",
    sourceChatId,
    nextShiftId,
    successorChatId: successor?.[0] ?? null,
    handoffPath,
    browser: browserStep.value,
  });
}
main().catch((error) => {
  printJson({
    contract: "proflow.monitor-handoff-finalize.v1",
    status: /UNKNOWN|TRANSPORT/.test(
      error instanceof Error ? error.message : "",
    )
      ? "UNKNOWN"
      : "BLOCKED",
    reason:
      error instanceof Error ? error.message : "MONITOR_HANDOFF_FINALIZE_FAILED",
  });
  process.exitCode =
    /UNKNOWN|TRANSPORT/.test(error instanceof Error ? error.message : "")
      ? 2
      : 3;
});
