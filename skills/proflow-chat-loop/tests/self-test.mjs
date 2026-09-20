import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.resolve(root, "../..");
const proflow = path.join(workspace, "repos/proflow");
const publicContext = path.join(
  proflow,
  "spec/平台架构与公共约定/00-公共上下文/README.md",
);
const currentPath = path.join(
  proflow,
  "spec/平台架构与公共约定/00-公共上下文/02-当前接力/CURRENT.md",
);
const phase4Runbook = path.join(proflow, "docs/phase4/04-自动迭代运行计划.md");
const skill = readFileSync(path.join(root, "SKILL.md"), "utf8");
const ignore = readFileSync(path.join(root, ".gitignore"), "utf8");
const handoff = readFileSync(path.join(root, ".handoff/current.md"), "utf8");
const current = readFileSync(currentPath, "utf8");

assert.match(skill, /^---\nname: proflow-chat-loop\ndescription: .+\n---\n/);
for (const marker of [
  "PROFLOW-SPECIFIC ONLY",
  "/Users/agent/Desktop/proton-workspace/repos/proflow",
  "Monitor Chat is a separate ChatGPT web chat inside the `学习` project",
  "Exactly one Monitor shift may own ProFlow mutation at a time",
  "/spec/平台架构与公共约定/00-公共上下文/README.md",
  "/spec/平台架构与公共约定/00-公共上下文/02-当前接力/CURRENT.md",
  "CURRENT.REQUIRED_CONTEXT",
  "docs/phase4/04-自动迭代运行计划.md",
  "REAL_SCENE_NOT_READY",
  "official Platform module catalog",
  "nextAction` is always the successor's first ProFlow action",
  "3h30–3h45",
  "PROFLOW_LOOP_TAKEOVER_ACCEPTED <shiftId>",
  "Never create a second successor while the first takeover result is UNKNOWN",
  "/skills/proflow-chat-loop/.handoff/current.md",
]) assert.ok(skill.includes(marker), `missing ProFlow loop invariant: ${marker}`);

for (const forbiddenProject of ["ChatWeb", "Job Search System"]) {
  assert.ok(skill.includes(forbiddenProject), `missing explicit project exclusion: ${forbiddenProject}`);
}
assert.equal(skill.includes("/repos/proflow/skills/proflow-chat-loop/"), false, "repo-local Skill path must not become a second truth store");
assert.equal(ignore.trim(), ".handoff/");
assert.ok(readFileSync(publicContext, "utf8").includes("02-当前接力/CURRENT.md"));
assert.ok(readFileSync(phase4Runbook, "utf8").includes("后续所有 ProFlow 自迭代 Chat 的核心指导上下文"));
assert.ok(current.includes("## REQUIRED_CONTEXT"));
assert.ok(current.includes("docs/phase4/04-自动迭代运行计划.md"));
for (const marker of [
  "handoffState: BOOTSTRAP_PENDING",
  "activeShiftId: bootstrap-orchestrator",
  "nextShiftId: monitor-a",
  "repo: `/Users/agent/Desktop/proton-workspace/repos/proflow`",
  "## Next action",
]) assert.ok(handoff.includes(marker), `handoff contract missing: ${marker}`);

const ignored = spawnSync("git", ["check-ignore", "-q", "--", "skills/proflow-chat-loop/.handoff/current.md"], { cwd: workspace });
assert.equal(ignored.status, 0, "ProFlow loop handoff must remain Git-ignored");

console.log("proflow-chat-loop self-test PASS");
