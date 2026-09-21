import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export function requiredContext(text) {
  const section = text.indexOf("## REQUIRED_CONTEXT");
  if (section < 0) throw new Error("CURRENT_REQUIRED_CONTEXT_MISSING");
  const rest = text.slice(section);
  const open = rest.indexOf("```text");
  if (open < 0) throw new Error("CURRENT_REQUIRED_CONTEXT_BLOCK_MISSING");
  const start = open + "```text".length;
  const close = rest.indexOf("```", start);
  if (close < 0) throw new Error("CURRENT_REQUIRED_CONTEXT_BLOCK_UNTERMINATED");
  const items = rest
    .slice(start, close)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length === 0) throw new Error("CURRENT_REQUIRED_CONTEXT_EMPTY");
  return items;
}

export function repoPath(repoRoot, relative) {
  if (!relative || relative.startsWith("/"))
    throw new Error("CURRENT_REQUIRED_CONTEXT_PATH_INVALID");
  const target = resolve(repoRoot, relative);
  if (target !== repoRoot && !target.startsWith(`${repoRoot}/`))
    throw new Error("CURRENT_REQUIRED_CONTEXT_PATH_ESCAPES_REPO");
  return target;
}

export function fixedProjectContext(repoRoot) {
  return {
    PROJECT: repoRoot,
    PUBLIC_CONTEXT_README: join(
      repoRoot,
      "spec/平台架构与公共约定/00-公共上下文/README.md",
    ),
    LONG_TERM_01: join(
      repoRoot,
      "spec/平台架构与公共约定/00-公共上下文/01-长期规则/01-总控职责与阶段门禁.md",
    ),
    LONG_TERM_02: join(
      repoRoot,
      "spec/平台架构与公共约定/00-公共上下文/01-长期规则/02-公共上下文治理规则.md",
    ),
    LONG_TERM_05: join(
      repoRoot,
      "spec/平台架构与公共约定/00-公共上下文/01-长期规则/05-执行纪律与工具规则.md",
    ),
    CURRENT: join(
      repoRoot,
      "spec/平台架构与公共约定/00-公共上下文/02-当前接力/CURRENT.md",
    ),
    PHASE4_03: join(repoRoot, "docs/phase4/03-Extension监控通知与审批.md"),
    PHASE4_04: join(repoRoot, "docs/phase4/04-自动迭代运行计划.md"),
  };
}

export function fixedChatLoopContext(workspace) {
  return {
    LOOP_SKILL: join(workspace, "skills/proflow-chat-loop/SKILL.md"),
    CONTINUATION: join(
      workspace,
      "skills/proflow-chat-loop/.handoff/current.md",
    ),
  };
}

export async function resolveMonitorContext(workspace) {
  const root = resolve(workspace);
  const repoRoot = join(root, "repos/proflow");
  const engineeringSkill = join(
    root,
    "skills/chat-local-engineering-protocol/SKILL.md",
  );
  const acceptanceSkill = join(
    root,
    "skills/chat-local-acceptance-automation-protocol/SKILL.md",
  );
  const projectPaths = fixedProjectContext(repoRoot);
  const chatLoopPaths = fixedChatLoopContext(root);
  const currentText = await readFile(projectPaths.CURRENT, "utf8");
  const requiredAbsolute = requiredContext(currentText).map((item) =>
    repoPath(repoRoot, item),
  );
  const all = [
    engineeringSkill,
    acceptanceSkill,
    ...Object.values(projectPaths),
    ...Object.values(chatLoopPaths),
    ...requiredAbsolute,
  ];
  await Promise.all(all.map((path) => access(path)));
  return Object.freeze({
    workspace: root,
    repoRoot,
    engineeringSkill,
    acceptanceSkill,
    projectPaths,
    chatLoopPaths,
    requiredAbsolute,
    readOrder: [
      engineeringSkill,
      acceptanceSkill,
      projectPaths.PUBLIC_CONTEXT_README,
      projectPaths.LONG_TERM_01,
      projectPaths.LONG_TERM_02,
      projectPaths.LONG_TERM_05,
      projectPaths.CURRENT,
      ...requiredAbsolute,
      projectPaths.PHASE4_03,
      projectPaths.PHASE4_04,
      chatLoopPaths.LOOP_SKILL,
      chatLoopPaths.CONTINUATION,
    ],
  });
}
