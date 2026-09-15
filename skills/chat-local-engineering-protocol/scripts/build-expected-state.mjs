#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
let repoArg = null;
const requestedPaths = [];
for (let index = 0; index < args.length; index += 1) {
  const value = args[index];
  const next = args[index + 1];
  if (value === "--repo" && next) {
    if (repoArg !== null) throw new Error("--repo may be provided only once");
    repoArg = next;
    index += 1;
    continue;
  }
  if (value === "--path" && next) {
    requestedPaths.push(next);
    index += 1;
    continue;
  }
  throw new Error(`unknown or incomplete argument: ${value}`);
}

if (!repoArg) throw new Error("--repo is required");
if (requestedPaths.length === 0) throw new Error("at least one --path is required");

const repoRoot = fs.realpathSync(repoArg);
const git = (...gitArgs) =>
  execFileSync("git", gitArgs, { cwd: repoRoot, encoding: "utf8" }).trim();
const gitTop = fs.realpathSync(git("rev-parse", "--show-toplevel"));
if (gitTop !== repoRoot) throw new Error(`repo root mismatch: ${repoRoot} != ${gitTop}`);

const safeRelative = (value) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    path.isAbsolute(value) ||
    value.split(/[\\/]+/).includes("..")
  ) {
    throw new Error(`unsafe repository-relative path: ${String(value)}`);
  }
  return value.replaceAll("\\", "/");
};

const files = {};
for (const raw of requestedPaths) {
  const relative = safeRelative(raw);
  if (Object.hasOwn(files, relative)) throw new Error(`duplicate path: ${relative}`);
  const target = path.resolve(repoRoot, relative);
  if (target !== repoRoot && !target.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`path escapes repository: ${relative}`);
  }
  const exists = fs.existsSync(target);
  if (!exists) {
    files[relative] = { exists: false };
    continue;
  }
  if (!fs.statSync(target).isFile()) throw new Error(`expected file path: ${relative}`);
  const sha256 = createHash("sha256").update(fs.readFileSync(target)).digest("hex");
  files[relative] = { exists: true, sha256 };
}

const result = {
  contract: "chat-local-expected-state.v1",
  repoRoot,
  head: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  files,
};
process.stdout.write(`${JSON.stringify(result)}\n`);
