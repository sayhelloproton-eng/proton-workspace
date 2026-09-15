import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skill = readFileSync(path.join(root, "SKILL.md"), "utf8");
const principles = readFileSync(path.join(root, "references/01-writing-principles.md"), "utf8");
const evidence = readFileSync(path.join(root, "references/02-evidence-and-verification.md"), "utf8");
const review = readFileSync(path.join(root, "references/03-review-checklist.md"), "utf8");

for (const marker of [
  "读者任务",
  "核心问题",
  "Ground the facts",
  "Write claim and evidence together",
  "Explain the mechanism",
  "Output quality gate",
  "Environment boundary",
]) {
  assert.ok(skill.includes(marker), `missing skill marker: ${marker}`);
}

for (const legacyRequirement of [
  "必须登记 Registry",
  "必须建立 Document Bundle",
  "必须建立文档依赖图",
  "必须分成 ADR",
  "必须分成 PRD",
]) {
  assert.equal(skill.includes(legacyRequirement), false, `legacy governance leaked into writing: ${legacyRequirement}`);
}

assert.ok(skill.includes("不建立稳定 ID、Registry、Document Bundle、生命周期或文档依赖图"));
assert.ok(skill.includes("chinese-technical-writing-naturalizer"));
assert.ok(principles.includes("读者任务优先于文档类型"));
assert.ok(principles.includes("这些是信息关系，不是文档分类"));
assert.ok(evidence.includes("文档不能比事实源更“确定”"));
assert.ok(evidence.includes("不要把验证计划写成验证结果"));
assert.ok(review.includes("External interviewer pass"));
assert.ok(review.includes("单次实验结果有没有被扩大成系统能力"));

for (const file of [
  "references/01-writing-principles.md",
  "references/02-evidence-and-verification.md",
  "references/03-review-checklist.md",
  "agents/openai.yaml",
]) {
  assert.ok(existsSync(path.join(root, file)), `missing file: ${file}`);
}

console.log("technical-document-writing self-test PASS");
