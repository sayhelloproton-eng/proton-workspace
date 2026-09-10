#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [repoArg, bundleArg, manifestArg, expectedArg, receiptArg] = process.argv.slice(2);
if (!repoArg || !bundleArg || !manifestArg || !expectedArg || !receiptArg) {
  console.error(
    "usage: apply-whole-file-bundle.mjs <repo> <changed-files.tar> <manifest.json> <expected-state.json> <receipt.json>",
  );
  process.exit(64);
}

const startedAt = new Date().toISOString();
const repo = fs.realpathSync(repoArg);
const bundle = path.resolve(bundleArg);
const manifestPath = path.resolve(manifestArg);
const expectedPath = path.resolve(expectedArg);
const receiptPath = path.resolve(receiptArg);
let mutationStarted = false;

const sha256 = (file) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const git = (...args) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
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
const localPath = (relative) => {
  const target = path.resolve(repo, safeRelative(relative));
  if (target !== repo && !target.startsWith(`${repo}${path.sep}`)) {
    throw new Error(`path escapes repository: ${relative}`);
  }
  return target;
};
const writeReceipt = (payload) => {
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(
    receiptPath,
    `${JSON.stringify(
      {
        contract: "chat-local-apply-receipt.v1",
        startedAt,
        finishedAt: new Date().toISOString(),
        ...payload,
      },
      null,
      2,
    )}\n`,
  );
};

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
  if (manifest.contract !== "chat-local-manifest.v1") {
    throw new Error("manifest contract mismatch");
  }
  if (expected.contract !== "chat-local-expected-state.v1") {
    throw new Error("expected-state contract mismatch");
  }
  if (fs.realpathSync(expected.repoRoot) !== repo) {
    throw new Error("repository root mismatch");
  }

  const actualHead = git("rev-parse", "HEAD");
  const actualBranch = git("branch", "--show-current");
  if (expected.head && actualHead !== expected.head) {
    throw new Error(`SOURCE_DRIFT: HEAD ${actualHead} != ${expected.head}`);
  }
  if (expected.branch && actualBranch !== expected.branch) {
    throw new Error(`SOURCE_DRIFT: branch ${actualBranch} != ${expected.branch}`);
  }

  for (const [relative, state] of Object.entries(expected.files ?? {})) {
    const target = localPath(relative);
    const exists = fs.existsSync(target);
    if (Boolean(state.exists) !== exists) {
      throw new Error(`SOURCE_DRIFT: existence changed for ${relative}`);
    }
    if (exists && state.sha256 && sha256(target) !== state.sha256) {
      throw new Error(`SOURCE_DRIFT: fingerprint changed for ${relative}`);
    }
  }

  const create = (manifest.create ?? []).map(safeRelative);
  const replace = (manifest.replace ?? []).map(safeRelative);
  const remove = (manifest.delete ?? []).map(safeRelative);
  const changed = [...new Set([...create, ...replace, ...remove])];
  if (changed.length === 0) throw new Error("manifest has no changed paths");

  const listing = execFileSync("tar", ["-tf", bundle], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  for (const entry of listing) {
    if (
      path.isAbsolute(entry) ||
      entry.split("/").includes("..") ||
      !(entry === "changed-files" || entry.startsWith("changed-files/"))
    ) {
      throw new Error(`unsafe bundle entry: ${entry}`);
    }
  }

  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "chat-local-apply-"));
  execFileSync("tar", ["-xf", bundle, "-C", staging]);
  const sourceRoot = path.join(staging, "changed-files");

  for (const relative of create) {
    const source = path.join(sourceRoot, relative);
    const target = localPath(relative);
    if (fs.existsSync(target)) throw new Error(`CREATE target already exists: ${relative}`);
    if (!fs.statSync(source).isFile()) throw new Error(`missing CREATE payload: ${relative}`);
  }
  for (const relative of replace) {
    const source = path.join(sourceRoot, relative);
    const target = localPath(relative);
    if (!fs.existsSync(target)) throw new Error(`REPLACE target missing: ${relative}`);
    if (!fs.statSync(source).isFile()) throw new Error(`missing REPLACE payload: ${relative}`);
  }

  mutationStarted = true;
  for (const relative of [...create, ...replace]) {
    const source = path.join(sourceRoot, relative);
    const target = localPath(relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  for (const relative of remove) fs.rmSync(localPath(relative), { force: true });

  execFileSync("git", ["diff", "--check", "--", ...changed], {
    cwd: repo,
    stdio: "pipe",
  });
  writeReceipt({
    status: "APPLIED",
    baselineHead: expected.head ?? null,
    actualHead,
    branch: actualBranch,
    created: create,
    replaced: replace,
    deleted: remove,
    gitDiffCheck: "PASS",
  });
  console.log("WHOLE_FILE_APPLY=PASS");
  console.log(`CHANGED_PATHS=${changed.join(",")}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeReceipt({
    status: mutationStarted ? "UNKNOWN_AFTER_MUTATION" : "FAIL_CLOSED",
    message,
  });
  console.error(
    mutationStarted ? "WHOLE_FILE_APPLY=UNKNOWN" : "WHOLE_FILE_APPLY=FAIL_CLOSED",
  );
  console.error(message);
  process.exit(mutationStarted ? 70 : 65);
}