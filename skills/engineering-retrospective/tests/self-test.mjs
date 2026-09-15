import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

const skill = read("SKILL.md");
const gate = read("references/01-retention-gate.md");
const mechanism = read("references/02-mechanism-and-boundary.md");
const promotion = read("references/03-from-lesson-to-change.md");
const cases = JSON.parse(read("tests/evals/cases.json"));

for (const marker of [
  "轻量自动检查",
  "skip",
  "needs_evidence",
  "capture",
  "默认 1–3 条",
  "正式改动必须另开工程决策",
  "一个事件可以值得记录，但不能自动升级成全局 HARD RULE",
  "Chat-only 吞吐、自动化和本机协议不得外溢",
]) {
  assert.ok(skill.includes(marker), `missing retrospective marker: ${marker}`);
}

for (const banned of [
  "engineering-insight-registry",
  "insight_id",
  "maturity lifecycle",
  "Occurrence Registry",
]) {
  assert.equal(skill.includes(banned), false, `legacy governance leaked into retrospective: ${banned}`);
}

for (const marker of ["Evidence", "Mechanism", "Novelty", "Future effect"]) {
  assert.ok(gate.includes(marker), `retention gate missing: ${marker}`);
}
for (const marker of ["Event → Assumption/Gap → Mechanism → Action → Boundary → Falsifier", "Counterexample"]) {
  assert.ok(mechanism.includes(marker), `mechanism reference missing: ${marker}`);
}
for (const marker of ["Skill 改进建议", "Tool 改进建议", "Automation 改进建议", "独立 Engineering Decision"]) {
  assert.ok(promotion.includes(marker), `promotion reference missing: ${marker}`);
}

assert.ok(Array.isArray(cases) && cases.length >= 8, "expected representative retrospective eval cases");
const decisions = new Set(cases.map((item) => item.expected));
assert.deepEqual([...decisions].sort(), ["capture", "needs_evidence", "skip"]);
assert.equal(new Set(cases.map((item) => item.id)).size, cases.length, "eval case ids must be unique");
console.log("engineering-retrospective self-test PASS");
