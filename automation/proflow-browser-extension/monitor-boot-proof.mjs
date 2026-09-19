#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_WORKSPACE = "/Users/agent/Desktop/proton-workspace";
const SAFE_CODE = /^[A-Z][A-Z0-9_.:-]{0,159}$/;

function valueArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function safeCode(value, fallback) {
  return typeof value === "string" && SAFE_CODE.test(value) ? value : fallback;
}

function requiredContext(text) {
  const section = text.indexOf("## REQUIRED_CONTEXT");
  if (section < 0) throw new Error("CURRENT_REQUIRED_CONTEXT_MISSING");
  const rest = text.slice(section);
  const open = rest.indexOf("```text");
  if (open < 0) throw new Error("CURRENT_REQUIRED_CONTEXT_BLOCK_MISSING");
  const bodyStart = open + "```text".length;
  const close = rest.indexOf("```", bodyStart);
  if (close < 0) throw new Error("CURRENT_REQUIRED_CONTEXT_BLOCK_UNTERMINATED");
  const items = rest
    .slice(bodyStart, close)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (items.length === 0) throw new Error("CURRENT_REQUIRED_CONTEXT_EMPTY");
  return items;
}

function repoPath(repoRoot, value) {
  if (typeof value !== "string" || value.length === 0 || value.startsWith("/"))
    throw new Error("CURRENT_REQUIRED_CONTEXT_PATH_INVALID");
  const target = resolve(repoRoot, value);
  if (target !== repoRoot && !target.startsWith(`${repoRoot}/`))
    throw new Error("CURRENT_REQUIRED_CONTEXT_PATH_ESCAPES_REPO");
  return target;
}

async function credential(path) {
  const value = (await readFile(path, "utf8")).trim();
  if (value.length < 32) throw new Error("MONITOR_CONTROL_CREDENTIAL_INVALID");
  return value;
}

function factString(facts, name) {
  const value = facts?.[name];
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`FACT_${name.toUpperCase()}_MISSING`);
  return value;
}

function loopback(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsed.hostname))
    throw new Error("MONITOR_CONTROL_ENDPOINT_NOT_LOOPBACK");
  return value.replace(/\/$/, "");
}

async function requestJson(url, init) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
  } catch {
    throw new Error("MONITOR_CONTROL_TRANSPORT");
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("MONITOR_CONTROL_BODY_INVALID");
  }
  if (!response.ok || body?.ok !== true)
    throw new Error(safeCode(body?.error, `MONITOR_CONTROL_HTTP_${response.status}`));
  return body.value;
}

function findShift(runs, shiftId, runId) {
  if (!Array.isArray(runs)) throw new Error("MONITOR_RUN_LIST_INVALID");
  const matches = [];
  for (const run of runs) {
    if (!run || typeof run !== "object" || Array.isArray(run)) continue;
    if (runId && run.runId !== runId) continue;
    const shift = run.shifts?.[shiftId];
    if (shift && typeof shift === "object") matches.push({ run, shift });
  }
  if (matches.length !== 1) throw new Error("MONITOR_BOOT_SHIFT_NOT_UNIQUE");
  return matches[0];
}

function fixedContext(workspace, repoRoot) {
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
    HANDOFF: join(workspace, "skills/proflow-chat-loop/.handoff/current.md"),
  };
}

async function selfTest() {
  const sample = [
    "# CURRENT",
    "## REQUIRED_CONTEXT",
    "text before fence",
    "```text",
    "docs/a.md",
    "spec/b.md",
    "```",
  ].join("\n");
  const items = requiredContext(sample);
  if (items.length !== 2 || items[0] !== "docs/a.md" || items[1] !== "spec/b.md")
    throw new Error("SELF_TEST_REQUIRED_CONTEXT_FAILED");
  const repo = "/tmp/repo";
  if (repoPath(repo, "docs/a.md") !== "/tmp/repo/docs/a.md")
    throw new Error("SELF_TEST_REPO_PATH_FAILED");
  let escaped = false;
  try {
    repoPath(repo, "../escape");
  } catch {
    escaped = true;
  }
  if (!escaped) throw new Error("SELF_TEST_ESCAPE_GUARD_FAILED");
  console.log("PROFLOW_MONITOR_BOOT_PROOF_SELF_TEST=PASS");
}

async function main() {
  if (process.argv.includes("--self-test")) {
    await selfTest();
    return;
  }
  if (process.argv.includes("--help")) {
    console.log(
      "usage: monitor-boot-proof.mjs --shift-id ID [--run-id ID] [--workspace PATH] --authorities-read",
    );
    return;
  }
  if (!process.argv.includes("--authorities-read"))
    throw new Error("MONITOR_BOOT_AUTHORITIES_NOT_ATTESTED");

  const shiftId = valueArg("--shift-id");
  if (!shiftId) throw new Error("MONITOR_BOOT_SHIFT_ID_REQUIRED");
  const runId = valueArg("--run-id");
  const workspace = resolve(valueArg("--workspace", DEFAULT_WORKSPACE));
  const repoRoot = join(workspace, "repos", "proflow");
  const paths = fixedContext(workspace, repoRoot);
  const engineeringSkill = join(
    workspace,
    "skills/chat-local-engineering-protocol/SKILL.md",
  );
  const loopSkill = join(workspace, "skills/proflow-chat-loop/SKILL.md");
  const currentText = await readFile(paths.CURRENT, "utf8");
  const requiredRelative = requiredContext(currentText);
  const requiredAbsolute = requiredRelative.map((item) => repoPath(repoRoot, item));

  await Promise.all([
    access(engineeringSkill),
    access(loopSkill),
    ...Object.values(paths).map((path) => access(path)),
    ...requiredAbsolute.map((path) => access(path)),
  ]);

  const stateRoot = join(
    workspace,
    ".proflow/runtime/modules/execution-browser-extension",
  );
  const sharedFacts = JSON.parse(
    await readFile(join(stateRoot, "shared-facts.json"), "utf8"),
  );
  const facts = sharedFacts?.facts;
  if (!facts || typeof facts !== "object") throw new Error("SHARED_FACTS_INVALID");
  const endpoint = loopback(factString(facts, "monitorControlEndpoint"));
  const token = await credential(factString(facts, "monitorControlTokenFile"));
  const control = (operation, input = {}) =>
    requestJson(`${endpoint}/v1/monitor/control`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ operation, input }),
    });

  const config = await control("config.read");
  if (config?.enabled !== true) throw new Error("MONITOR_DISABLED");
  if (!Number.isInteger(config?.revision)) throw new Error("MONITOR_CONFIG_INVALID");
  const runs = await control("run.list");
  const { run, shift } = findShift(runs, shiftId, runId);
  if (!Number.isInteger(run.version) || typeof run.runId !== "string")
    throw new Error("MONITOR_RUN_INVALID");
  if (typeof shift.chatRef !== "string" || shift.chatRef.length === 0)
    throw new Error("MONITOR_BOOT_CHAT_REF_INVALID");

  if (shift.bootProof !== undefined) {
    if (shift.bootProof?.chatRef !== shift.chatRef)
      throw new Error("MONITOR_BOOT_PROOF_CHAT_MISMATCH");
    console.log(
      JSON.stringify({
        contract: "proflow.monitor-boot-proof-publication.v1",
        status: shift.state === "ACTIVE" ? "ALREADY_ACTIVE" : "ALREADY_RECORDED",
        runId: run.runId,
        shiftId,
        chatRef: shift.chatRef,
        runVersion: run.version,
      }),
    );
    return;
  }
  if (shift.state !== "BOOTING") throw new Error("MONITOR_SHIFT_NOT_BOOTING");

  const observedAt = new Date().toISOString();
  const proof = {
    contract: "proflow.monitor-boot-proof.v3",
    chatRef: shift.chatRef,
    contextProofs: {
      PROJECT: paths.PROJECT,
      PUBLIC_CONTEXT_README: paths.PUBLIC_CONTEXT_README,
      LONG_TERM_01: paths.LONG_TERM_01,
      LONG_TERM_02: paths.LONG_TERM_02,
      LONG_TERM_05: paths.LONG_TERM_05,
      CURRENT: paths.CURRENT,
      REQUIRED_CONTEXT: requiredAbsolute,
      PHASE4_03: paths.PHASE4_03,
      PHASE4_04: paths.PHASE4_04,
      HANDOFF: paths.HANDOFF,
    },
    localDevProof: {
      tool: "Local Dev",
      protocolPath: engineeringSkill,
      observedAt,
    },
    observedAt,
  };

  const updated = await control("shift.bootProof", {
    runId: run.runId,
    shiftId,
    expectedVersion: run.version,
    configRevision: config.revision,
    proof,
  });
  const updatedShift = updated?.shifts?.[shiftId];
  if (updatedShift?.bootProof?.chatRef !== shift.chatRef)
    throw new Error("MONITOR_BOOT_PROOF_WRITE_NOT_OBSERVED");

  console.log(
    JSON.stringify({
      contract: "proflow.monitor-boot-proof-publication.v1",
      status: "RECORDED",
      runId: updated.runId,
      shiftId,
      chatRef: shift.chatRef,
      previousRunVersion: run.version,
      runVersion: updated.version,
      requiredContextCount: requiredAbsolute.length,
      observedAt,
    }),
  );
}

main().catch((error) => {
  console.error(
    `PROFLOW_MONITOR_BOOT_PROOF=FAIL ${safeCode(
      error instanceof Error ? error.message : "",
      "MONITOR_BOOT_PROOF_FAILED",
    )}`,
  );
  process.exit(1);
});
