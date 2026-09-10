#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execFileSync } from "node:child_process";

const rootArg = process.argv[2];
if (!rootArg) {
  console.error("usage: materialize-whole-file-envelope.mjs <staging-root>");
  process.exit(64);
}

const root = path.resolve(rootArg);
const token = randomUUID();
const endMarker = `END ${token}`;
const commitMarker = `COMMIT ${token}`;
const files = new Map();
const deletes = new Set();
let currentPath = null;
let currentOperation = null;
let currentLines = [];
let legacyManifest = null;
let operationMode = false;
let legacyMode = false;
let expectedState = null;
let verificationPlan = null;
let committed = false;

const safePath = (value) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    path.isAbsolute(value) ||
    value.split(/[\\\\/]+/).includes("..")
  ) {
    throw new Error(`unsafe repository-relative path: ${String(value)}`);
  }
  return value.replaceAll("\\\\", "/");
};

const fail = (error) => {
  console.error(
    `ENVELOPE_MATERIALIZE=FAIL ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(65);
};

const derivedManifest = () => {
  const create = [];
  const replace = [];
  for (const [relative, entry] of files) {
    if (entry.operation === "CREATE") create.push(relative);
    else if (entry.operation === "REPLACE") replace.push(relative);
    else throw new Error(`unsupported file operation: ${String(entry.operation)}`);
  }
  return {
    contract: "chat-local-manifest.v1",
    create,
    replace,
    delete: [...deletes],
  };
};

const commit = () => {
  if (!expectedState || expectedState.contract !== "chat-local-expected-state.v1")
    throw new Error("expected-state contract mismatch");
  if (
    verificationPlan !== null &&
    verificationPlan.contract !== "chat-local-verification-plan.v1"
  )
    throw new Error("verification-plan contract mismatch");

  let manifest;
  let manifestDerived = false;
  if (operationMode) {
    if (legacyManifest !== null || legacyMode)
      throw new Error("cannot mix operation envelope with legacy manifest envelope");
    manifest = derivedManifest();
    manifestDerived = true;
  } else {
    if (!legacyManifest || legacyManifest.contract !== "chat-local-manifest.v1")
      throw new Error("legacy manifest contract mismatch");
    manifest = legacyManifest;
  }

  const create = (manifest.create ?? []).map(safePath);
  const replace = (manifest.replace ?? []).map(safePath);
  const remove = (manifest.delete ?? []).map(safePath);
  const required = new Set([...create, ...replace]);
  if (
    required.size !== files.size ||
    [...required].some((relative) => !files.has(relative))
  ) {
    throw new Error("payload set does not match CREATE/REPLACE manifest");
  }
  const overlap = [...required].find((relative) => remove.includes(relative));
  if (overlap) throw new Error(`path cannot be both payload and DELETE: ${overlap}`);

  const changedRoot = path.join(root, "changed-files");
  fs.mkdirSync(root, { recursive: true });
  fs.rmSync(changedRoot, { recursive: true, force: true });
  for (const [relative, entry] of files) {
    const target = path.resolve(changedRoot, relative);
    if (!target.startsWith(`${changedRoot}${path.sep}`))
      throw new Error(`path escapes staging: ${relative}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.content, "utf8");
  }

  fs.writeFileSync(
    path.join(root, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(root, "expected-state.json"),
    `${JSON.stringify(expectedState, null, 2)}\n`,
  );
  if (verificationPlan !== null) {
    fs.writeFileSync(
      path.join(root, "verification-plan.json"),
      `${JSON.stringify(verificationPlan, null, 2)}\n`,
    );
  }
  execFileSync(
    "tar",
    ["-cf", path.join(root, "changed-files.tar"), "changed-files"],
    { cwd: root },
  );

  committed = true;
  console.log(`ENVELOPE_MATERIALIZE=PASS FILES=${files.size}`);
  console.log(`MANIFEST_DERIVED=${manifestDerived ? "YES" : "NO"}`);
  console.log(`BUNDLE=${path.join(root, "changed-files.tar")}`);
  console.log(`VERIFY_PLAN=${verificationPlan === null ? "NO" : "YES"}`);
  if (process.env.CHAT_LOCAL_SUPPRESS_DONE_PROMPT !== "1")
    process.stdout.write("chat-local-done> ");
  setTimeout(() => process.exit(0), 25);
};

console.log(`ENVELOPE_READY=${token}`);
process.stdout.write("chat-local> ");
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", (line) => {
  try {
    if (currentPath !== null) {
      if (line === endMarker) {
        files.set(currentPath, {
          operation: currentOperation,
          content: `${currentLines.join("\n")}\n`,
        });
        currentPath = null;
        currentOperation = null;
        currentLines = [];
      } else {
        currentLines.push(line);
      }
      return;
    }

    if (line.startsWith(`FILE ${token} `)) {
      const rest = line.slice(`FILE ${token} `.length);
      const operationMatch = /^(CREATE|REPLACE)\s+(.+)$/.exec(rest);
      if (operationMatch) {
        if (legacyMode || legacyManifest !== null)
          throw new Error("cannot mix operation envelope with legacy manifest envelope");
        operationMode = true;
        currentOperation = operationMatch[1];
        currentPath = safePath(operationMatch[2]);
      } else {
        if (operationMode)
          throw new Error("cannot mix legacy file envelope with operation envelope");
        legacyMode = true;
        currentOperation = null;
        currentPath = safePath(rest);
      }
      if (files.has(currentPath) || deletes.has(currentPath))
        throw new Error(`duplicate path: ${currentPath}`);
      return;
    }
    if (line.startsWith(`DELETE ${token} `)) {
      if (legacyMode || legacyManifest !== null)
        throw new Error("cannot mix DELETE operation with legacy manifest envelope");
      operationMode = true;
      const relative = safePath(line.slice(`DELETE ${token} `.length));
      if (files.has(relative) || deletes.has(relative))
        throw new Error(`duplicate path: ${relative}`);
      deletes.add(relative);
      return;
    }
    if (line.startsWith(`MANIFEST ${token} `)) {
      if (operationMode) throw new Error("manifest is derived in operation envelope mode");
      if (legacyManifest !== null) throw new Error("duplicate manifest");
      legacyMode = true;
      legacyManifest = JSON.parse(line.slice(`MANIFEST ${token} `.length));
      return;
    }
    if (line.startsWith(`EXPECTED ${token} `)) {
      expectedState = JSON.parse(line.slice(`EXPECTED ${token} `.length));
      return;
    }
    if (line.startsWith(`VERIFY ${token} `)) {
      if (verificationPlan !== null) throw new Error("duplicate verification plan");
      verificationPlan = JSON.parse(line.slice(`VERIFY ${token} `.length));
      return;
    }
    if (line === commitMarker) {
      if (currentPath !== null) throw new Error("unterminated file payload");
      commit();
      return;
    }
    if (line.trim() !== "") throw new Error(`unexpected protocol line: ${line}`);
  } catch (error) {
    fail(error);
  }
});

rl.on("close", () => {
  if (!committed) fail(new Error("stdin closed before COMMIT"));
});
rl.on("error", fail);
