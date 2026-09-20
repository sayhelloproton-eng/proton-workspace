#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
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

function requiredContext(text) {
  const section = text.indexOf("## REQUIRED_CONTEXT");
  if (section < 0) throw new Error("CURRENT_REQUIRED_CONTEXT_MISSING");
  const rest = text.slice(section);
  const open = rest.indexOf("```text");
  if (open < 0) throw new Error("CURRENT_REQUIRED_CONTEXT_BLOCK_MISSING");
  const start = open + "```text".length;
  const close = rest.indexOf("```", start);
  if (close < 0) throw new Error("CURRENT_REQUIRED_CONTEXT_BLOCK_UNTERMINATED");
  const items = rest.slice(start, close).split("\n").map((x) => x.trim()).filter(Boolean);
  if (!items.length) throw new Error("CURRENT_REQUIRED_CONTEXT_EMPTY");
  return items;
}

function repoPath(repoRoot, relative) {
  if (!relative || relative.startsWith("/")) throw new Error("CURRENT_REQUIRED_CONTEXT_PATH_INVALID");
  const target = resolve(repoRoot, relative);
  if (target !== repoRoot && !target.startsWith(`${repoRoot}/`))
    throw new Error("CURRENT_REQUIRED_CONTEXT_PATH_ESCAPES_REPO");
  return target;
}

function fixedProjectContext(repoRoot) {
  return {
    PROJECT: repoRoot,
    PUBLIC_CONTEXT_README: join(repoRoot, "spec/平台架构与公共约定/00-公共上下文/README.md"),
    LONG_TERM_01: join(repoRoot, "spec/平台架构与公共约定/00-公共上下文/01-长期规则/01-总控职责与阶段门禁.md"),
    LONG_TERM_02: join(repoRoot, "spec/平台架构与公共约定/00-公共上下文/01-长期规则/02-公共上下文治理规则.md"),
    LONG_TERM_05: join(repoRoot, "spec/平台架构与公共约定/00-公共上下文/01-长期规则/05-执行纪律与工具规则.md"),
    CURRENT: join(repoRoot, "spec/平台架构与公共约定/00-公共上下文/02-当前接力/CURRENT.md"),
    PHASE4_03: join(repoRoot, "docs/phase4/03-Extension监控通知与审批.md"),
    PHASE4_04: join(repoRoot, "docs/phase4/04-自动迭代运行计划.md"),
  };
}

function fixedChatLoopContext(workspace) {
  return {
    LOOP_SKILL: join(workspace, "skills/proflow-chat-loop/SKILL.md"),
    CONTINUATION: join(workspace, "skills/proflow-chat-loop/.handoff/current.md"),
  };
}

async function main() {
  if (!hasFlag("--authorities-read"))
    throw new Error("MONITOR_BOOT_AUTHORITIES_NOT_ATTESTED");
  const shiftId = requiredArg("--shift-id");
  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const repoRoot = join(client.workspace, "repos/proflow");
  const projectPaths = fixedProjectContext(repoRoot);
  const chatLoopPaths = fixedChatLoopContext(client.workspace);
  const engineeringSkill = join(client.workspace, "skills/chat-local-engineering-protocol/SKILL.md");
  const currentText = await readFile(projectPaths.CURRENT, "utf8");
  const requiredAbsolute = requiredContext(currentText).map((item) => repoPath(repoRoot, item));

  await Promise.all([
    access(engineeringSkill),
    ...Object.values(projectPaths).map((path) => access(path)),
    ...Object.values(chatLoopPaths).map((path) => access(path)),
    ...requiredAbsolute.map((path) => access(path)),
  ]);

  const state = await client.invoke("state.read");
  if (state?.config?.enabled !== true) throw new Error("MONITOR_DISABLED");
  const { chatId, chat } = findChatByShift(state, shiftId);
  if (chat.takeover?.bootProofAt !== null) {
    if (chat.takeover?.bootProof?.chatRef !== chatId)
      throw new Error("MONITOR_BOOT_PROOF_CHAT_MISMATCH");
    printJson({
      contract: "proflow.monitor-boot-proof-publication.v2",
      status: chat.takeover?.activatedAt ? "ALREADY_ACTIVE" : "ALREADY_RECORDED",
      shiftId,
      chatId,
      bootProofAt: chat.takeover.bootProofAt,
      proofContract: chat.takeover?.bootProof?.contract ?? null,
    });
    return;
  }

  const proofContract = await negotiateBootProofContract(client);
  const observedAt = new Date().toISOString();
  const localDevProof = {
    tool: "Local Dev",
    protocolPath: engineeringSkill,
    observedAt,
  };
  if (proofContract !== MONITOR_BOOT_PROOF_V4)
    throw new Error("MONITOR_BOOT_PROOF_V4_NOT_SUPPORTED");
  const proof = {
    contract: MONITOR_BOOT_PROOF_V4,
    chatRef: chatId,
    projectContextProofs: {
      ...projectPaths,
      REQUIRED_CONTEXT: requiredAbsolute,
    },
    chatLoopContextProof: chatLoopPaths,
    localDevProof,
    observedAt,
  };
  const input = { chatId, proof };
  const requestId =
    valueArg("--request-id") ?? stableRequestId("bootProof.record", input);
  const result = await client.invoke("bootProof.record", { requestId, ...input });
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
