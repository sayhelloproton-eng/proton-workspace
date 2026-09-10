import fs from "node:fs";
import path from "node:path";

const workspace = "/Users/agent/Desktop/proton-workspace";
const canonical = path.join(workspace, "skills", "chat-local-engineering-protocol", "SKILL.md");
const marker = "CHAT_LOCAL_ENGINEERING_PROTOCOL=REQUIRED";
const reposRoot = path.join(workspace, "repos");
const repos = fs.readdirSync(reposRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(reposRoot, entry.name, ".git")))
  .map((entry) => entry.name)
  .sort();
const targets = [
  path.join(workspace, "AGENTS.md"),
  ...repos.map((repo) => path.join(reposRoot, repo, "AGENTS.md")),
];

const failures = [];
if (!fs.existsSync(canonical)) failures.push(`missing canonical skill: ${canonical}`);
for (const file of targets) {
  if (!fs.existsSync(file)) {
    failures.push(`missing inheritance entry: ${file}`);
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(marker)) failures.push(`missing marker in ${file}`);
  if (!text.includes(canonical)) failures.push(`missing canonical path in ${file}`);
}

if (failures.length) {
  console.error("CHAT_LOCAL_PROTOCOL_INHERITANCE=FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CHAT_LOCAL_PROTOCOL_INHERITANCE=PASS");
console.log(`CANONICAL=${canonical}`);
console.log(`REPOSITORIES=${repos.join(",")}`);
console.log(`TARGETS=${targets.length}`);
