#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const usage = "usage: execute-frozen-decision.mjs";
if (argv.length > 0) {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    console.log(usage);
    process.exit(0);
  }
  console.error(usage);
  process.exit(64);
}

const startedAt = new Date().toISOString();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, "..");
const receiverPath = path.join(scriptDir, "materialize-whole-file-envelope.mjs");
const applyPath = path.join(scriptDir, "apply-whole-file-bundle.mjs");
const staging = fs.mkdtempSync(path.join(os.tmpdir(), "chat-local-frozen-"));
const receiptPath = path.join(staging, "decision-receipt.json");
const authorityId = `${Date.now()}-${process.pid}-${randomUUID()}`;
const durableDir = path.join(skillRoot, ".runtime", "frozen-decisions", authorityId);
fs.mkdirSync(durableDir, { recursive: true });
const durableReceiptPath = path.join(durableDir, "decision-receipt.json");
const maxTailBytes = 8_192;

console.log(`DURABLE_RECEIPT=${durableReceiptPath}`);

const tail = (value) => {
  const text = typeof value === "string" ? value : "";
  return text.length <= maxTailBytes ? text : text.slice(-maxTailBytes);
};

const atomicWrite = (target, text) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, text);
  fs.renameSync(temporary, target);
};

const writeReceipt = (payload, { terminal = false } = {}) => {
  const updatedAt = new Date().toISOString();
  const text = `${JSON.stringify(
    {
      contract: "chat-local-frozen-decision-receipt.v1",
      authorityId,
      startedAt,
      updatedAt,
      ...(terminal ? { finishedAt: updatedAt } : {}),
      staging,
      durableReceiptPath,
      ...payload,
    },
    null,
    2,
  )}\n`;
  atomicWrite(receiptPath, text);
  atomicWrite(durableReceiptPath, text);
};

const finishExit = (code) => {
  fs.writeSync(process.stdout.fd, "chat-local-result> ");
  process.exit(code);
};

const failBeforeApply = (message, extra = {}) => {
  writeReceipt({ status: "FAIL_CLOSED", message, ...extra }, { terminal: true });
  console.error(`FROZEN_DECISION=FAIL_CLOSED ${message}`);
  console.error(`EVIDENCE_DIR=${staging}`);
  finishExit(65);
};

const runSync = (command, args, options = {}) => {
  const began = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    timeout: options.timeoutMs,
    maxBuffer: 1_048_576,
    shell: false,
  });
  return {
    durationMs: Date.now() - began,
    status: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

const materialize = () =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [receiverPath, staging], {
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, CHAT_LOCAL_SUPPRESS_DONE_PROMPT: "1" },
    });
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", (error) => resolve({ code: null, signal: null, error }));
    child.on("exit", (code, signal) => resolve({ code, signal, error: null }));
  });

const materialized = await materialize();
if (materialized.error)
  failBeforeApply(`materializer spawn failed: ${materialized.error.message}`);
if (materialized.code !== 0)
  failBeforeApply(
    `materializer failed with code ${String(materialized.code)} signal ${String(materialized.signal)}`,
  );

const expectedPath = path.join(staging, "expected-state.json");
const manifestPath = path.join(staging, "manifest.json");
const bundlePath = path.join(staging, "changed-files.tar");
const verificationPath = path.join(staging, "verification-plan.json");
if (!fs.existsSync(verificationPath))
  failBeforeApply("verification plan is required before repository mutation");

let expected;
let verification;
try {
  expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
  verification = JSON.parse(fs.readFileSync(verificationPath, "utf8"));
} catch (error) {
  failBeforeApply(
    `control metadata parse failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

if (expected.contract !== "chat-local-expected-state.v1")
  failBeforeApply("expected-state contract mismatch");
if (verification.contract !== "chat-local-verification-plan.v1")
  failBeforeApply("verification-plan contract mismatch");
if (!Array.isArray(verification.commands) || verification.commands.length < 1)
  failBeforeApply("verification plan must contain at least one command");
if (verification.commands.length > 16)
  failBeforeApply("verification plan exceeds 16 commands");

let repo;
try {
  repo = fs.realpathSync(expected.repoRoot);
} catch (error) {
  failBeforeApply(
    `repository root invalid: ${error instanceof Error ? error.message : String(error)}`,
  );
}

const resolveCwd = (value) => {
  const candidate = path.resolve(repo, value ?? ".");
  const actual = fs.realpathSync(candidate);
  if (actual !== repo && !actual.startsWith(`${repo}${path.sep}`))
    throw new Error(`verification cwd escapes repository: ${String(value)}`);
  return actual;
};

const normalizeCommand = (raw, index) => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new Error(`verification command ${index} must be an object`);
  const label = typeof raw.label === "string" && raw.label.length > 0
    ? raw.label
    : `verify-${index + 1}`;
  if (typeof raw.command !== "string" || raw.command.length === 0)
    throw new Error(`verification command ${label} has no command`);
  const args = raw.args === undefined ? [] : raw.args;
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string"))
    throw new Error(`verification command ${label} args must be strings`);
  const timeoutMs = raw.timeoutMs === undefined ? 120_000 : Number(raw.timeoutMs);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000)
    throw new Error(`verification command ${label} timeout is invalid`);
  const expectedExitCode =
    raw.expectedExitCode === undefined ? 0 : Number(raw.expectedExitCode);
  if (!Number.isInteger(expectedExitCode))
    throw new Error(`verification command ${label} expectedExitCode is invalid`);
  const env = { ...process.env };
  if (raw.env !== undefined) {
    if (typeof raw.env !== "object" || raw.env === null || Array.isArray(raw.env))
      throw new Error(`verification command ${label} env must be an object`);
    for (const [key, value] of Object.entries(raw.env)) {
      if (typeof value !== "string")
        throw new Error(`verification command ${label} env values must be strings`);
      env[key] = value;
    }
  }
  return {
    label,
    command: raw.command,
    args,
    cwd: resolveCwd(raw.cwd),
    timeoutMs,
    expectedExitCode,
    env,
  };
};

let commands;
try {
  commands = verification.commands.map(normalizeCommand);
} catch (error) {
  failBeforeApply(
    `verification plan invalid: ${error instanceof Error ? error.message : String(error)}`,
  );
}

const verificationLabels = commands.map((command) => command.label);
writeReceipt({
  status: "READY_TO_APPLY",
  repoRoot: repo,
  verificationPlan: verificationLabels,
});

console.log("DATA_PLANE_PAYLOAD_TRANSACTIONS=1");
const applyReceiptPath = path.join(staging, "apply-receipt.json");
writeReceipt({
  status: "APPLYING",
  repoRoot: repo,
  verificationPlan: verificationLabels,
  applyReceiptPath,
});
const apply = runSync(process.execPath, [
  applyPath,
  repo,
  bundlePath,
  manifestPath,
  expectedPath,
  applyReceiptPath,
]);
if (apply.stdout) process.stdout.write(apply.stdout);
if (apply.stderr) process.stderr.write(apply.stderr);
if (apply.status !== 0) {
  const status = apply.status === 70 ? "UNKNOWN_AFTER_MUTATION" : "APPLY_FAILED";
  writeReceipt({
    status,
    repoRoot: repo,
    verificationPlan: verificationLabels,
    apply: {
      exitCode: apply.status,
      signal: apply.signal,
      durationMs: apply.durationMs,
      error: apply.error,
      stdoutTail: tail(apply.stdout),
      stderrTail: tail(apply.stderr),
    },
  }, { terminal: true });
  console.error(`FROZEN_DECISION=${status}`);
  console.error(`EVIDENCE_DIR=${staging}`);
  finishExit(apply.status ?? 70);
}

const applySummary = { exitCode: apply.status, durationMs: apply.durationMs };
console.log(`APPLY_MS=${apply.durationMs}`);
console.log("VERIFY_START=1");
const verificationResults = [];
let verifyDurationMs = 0;
writeReceipt({
  status: "APPLIED_VERIFYING",
  repoRoot: repo,
  verificationPlan: verificationLabels,
  apply: applySummary,
  verifyDurationMs,
  verificationResults,
  currentVerification: null,
});

for (const command of commands) {
  writeReceipt({
    status: "VERIFYING",
    repoRoot: repo,
    verificationPlan: verificationLabels,
    apply: applySummary,
    verifyDurationMs,
    verificationResults,
    currentVerification: command.label,
  });
  const result = runSync(command.command, command.args, {
    cwd: command.cwd,
    env: command.env,
    timeoutMs: command.timeoutMs,
  });
  verifyDurationMs += result.durationMs;
  const passed = result.status === command.expectedExitCode && result.error === null;
  verificationResults.push({
    label: command.label,
    passed,
    exitCode: result.status,
    signal: result.signal,
    durationMs: result.durationMs,
    error: result.error,
    ...(passed
      ? {}
      : { stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }),
  });
  console.log(
    `VERIFY_COMMAND=${command.label} ${passed ? "PASS" : "FAIL"} EXIT=${String(result.status)} MS=${result.durationMs}`,
  );
  if (!passed) {
    if (result.stdout) process.stdout.write(tail(result.stdout));
    if (result.stderr) process.stderr.write(tail(result.stderr));
    writeReceipt({
      status: "VERIFY_FAILED",
      repoRoot: repo,
      verificationPlan: verificationLabels,
      apply: applySummary,
      verifyDurationMs,
      verificationResults,
      currentVerification: command.label,
    }, { terminal: true });
    console.error("FROZEN_DECISION=VERIFY_FAILED");
    console.error(`EVIDENCE_DIR=${staging}`);
    finishExit(1);
  }
  writeReceipt({
    status: "VERIFYING",
    repoRoot: repo,
    verificationPlan: verificationLabels,
    apply: applySummary,
    verifyDurationMs,
    verificationResults,
    currentVerification: null,
  });
}

writeReceipt({
  status: "PASS",
  repoRoot: repo,
  verificationPlan: verificationLabels,
  apply: applySummary,
  verifyDurationMs,
  verificationResults,
  currentVerification: null,
}, { terminal: true });
console.log(`VERIFY_MS=${verifyDurationMs}`);
console.log("FROZEN_DECISION=PASS");
if (process.env.CHAT_LOCAL_KEEP_STAGING === "1") {
  console.log(`EVIDENCE_DIR=${staging}`);
} else {
  fs.rmSync(staging, { recursive: true, force: true });
  console.log("STAGING_CLEANUP=PASS");
}
finishExit(0);
