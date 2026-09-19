#!/usr/bin/env node
import { readFile } from "node:fs/promises";
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
  if (
    parsed.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(parsed.hostname)
  )
    throw new Error("MONITOR_CONTROL_ENDPOINT_NOT_LOOPBACK");
  return value.replace(/\/$/, "");
}

async function requestJson(url, init) {
  let response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(5_000),
    });
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
    throw new Error(
      safeCode(body?.error, `MONITOR_CONTROL_HTTP_${response.status}`),
    );
  return body.value;
}

function monitorChatIdentity(chatUrl, projectLocator) {
  let project;
  let chat;
  try {
    project = new URL(projectLocator);
    chat = new URL(chatUrl);
  } catch {
    throw new Error("MONITOR_INITIAL_CHAT_URL_INVALID");
  }
  if (
    project.protocol !== "https:" ||
    project.hostname !== "chatgpt.com" ||
    project.search !== "" ||
    project.hash !== "" ||
    chat.protocol !== "https:" ||
    chat.hostname !== "chatgpt.com" ||
    chat.search !== "" ||
    chat.hash !== ""
  )
    throw new Error("MONITOR_INITIAL_CHAT_URL_INVALID");

  const projectPath = project.pathname.replace(/\/$/, "");
  const prefix = `${projectPath}/c/`;
  if (!chat.pathname.startsWith(prefix))
    throw new Error("MONITOR_INITIAL_CHAT_PROJECT_MISMATCH");

  const chatRef = chat.pathname.slice(prefix.length).replace(/\/$/, "");
  if (!chatRef || chatRef.includes("/"))
    throw new Error("MONITOR_INITIAL_CHAT_REF_INVALID");

  return {
    chatRef,
    chatUrl: `${chat.origin}${prefix}${chatRef}`,
  };
}

function runRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("MONITOR_INITIAL_RUN_INVALID");
  return value;
}

function exactInitialRun(value, expected) {
  const run = runRecord(value);
  if (run.runId !== expected.runId)
    throw new Error("MONITOR_INITIAL_RUN_IDENTITY_CONFLICT");
  if (run.activeShiftId !== null)
    throw new Error("MONITOR_INITIAL_RUN_STATE_CONFLICT");
  if (!Number.isInteger(run.version) || run.version < 1)
    throw new Error("MONITOR_INITIAL_RUN_INVALID");
  if (!run.shifts || typeof run.shifts !== "object" || Array.isArray(run.shifts))
    throw new Error("MONITOR_INITIAL_RUN_INVALID");

  const entries = Object.entries(run.shifts);
  if (entries.length !== 1)
    throw new Error("MONITOR_INITIAL_RUN_IDENTITY_CONFLICT");

  const shift = run.shifts[expected.shiftId];
  if (!shift || typeof shift !== "object" || Array.isArray(shift))
    throw new Error("MONITOR_INITIAL_RUN_IDENTITY_CONFLICT");
  if (
    shift.shiftId !== expected.shiftId ||
    shift.chatRef !== expected.chatRef ||
    shift.generation !== 1
  )
    throw new Error("MONITOR_INITIAL_RUN_IDENTITY_CONFLICT");
  if (shift.state !== "BOOTING")
    throw new Error("MONITOR_INITIAL_RUN_STATE_CONFLICT");

  return { run, shift };
}

function findRun(runs, runId) {
  if (!Array.isArray(runs)) throw new Error("MONITOR_RUN_LIST_INVALID");
  const matches = runs.filter(
    (run) =>
      run &&
      typeof run === "object" &&
      !Array.isArray(run) &&
      run.runId === runId,
  );
  if (matches.length > 1) throw new Error("MONITOR_INITIAL_RUN_NOT_UNIQUE");
  return matches[0] ?? null;
}

async function ensureInitialRun(control, expected, configRevision) {
  const listed = await control("run.list");
  let run = findRun(listed, expected.runId);
  let status = "EXISTING";

  if (!run) {
    try {
      run = await control("run.create", {
        runId: expected.runId,
        shiftId: expected.shiftId,
        chatRef: expected.chatRef,
        configRevision,
      });
      status = "CREATED";
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "MONITOR_RUN_ALREADY_EXISTS"
      )
        throw error;
      run = await control("run.read", { runId: expected.runId });
      status = "EXISTING";
    }
  }

  return {
    status,
    ...exactInitialRun(run, expected),
  };
}

function sampleRun(overrides = {}) {
  return {
    contract: "proflow.monitor-run.v1",
    runId: "run:self-test",
    version: 1,
    activeShiftId: null,
    shifts: {
      "monitor-a": {
        shiftId: "monitor-a",
        chatRef: "chat-a",
        generation: 1,
        state: "BOOTING",
      },
    },
    ...overrides,
  };
}

async function selfTest() {
  const project = "https://chatgpt.com/g/g-p-project";
  const identity = monitorChatIdentity(
    "https://chatgpt.com/g/g-p-project/c/chat-a",
    project,
  );
  if (identity.chatRef !== "chat-a")
    throw new Error("SELF_TEST_CHAT_REF_FAILED");

  let projectMismatch = false;
  try {
    monitorChatIdentity(
      "https://chatgpt.com/g/g-p-other/c/chat-a",
      project,
    );
  } catch (error) {
    projectMismatch =
      error instanceof Error &&
      error.message === "MONITOR_INITIAL_CHAT_PROJECT_MISMATCH";
  }
  if (!projectMismatch) throw new Error("SELF_TEST_PROJECT_GUARD_FAILED");

  const expected = {
    runId: "run:self-test",
    shiftId: "monitor-a",
    chatRef: "chat-a",
  };

  let stored = null;
  const created = await ensureInitialRun(
    async (operation, input = {}) => {
      if (operation === "run.list") return stored ? [stored] : [];
      if (operation === "run.create") {
        if (stored) throw new Error("MONITOR_RUN_ALREADY_EXISTS");
        stored = sampleRun();
        return stored;
      }
      if (operation === "run.read") return stored;
      throw new Error(`SELF_TEST_UNEXPECTED_${operation}`);
    },
    expected,
    3,
  );
  if (created.status !== "CREATED" || created.shift.state !== "BOOTING")
    throw new Error("SELF_TEST_CREATE_FAILED");

  const existing = await ensureInitialRun(
    async (operation) => {
      if (operation === "run.list") return [stored];
      throw new Error(`SELF_TEST_UNEXPECTED_${operation}`);
    },
    expected,
    3,
  );
  if (existing.status !== "EXISTING")
    throw new Error("SELF_TEST_RESEED_FAILED");

  const raced = await ensureInitialRun(
    async (operation) => {
      if (operation === "run.list") return [];
      if (operation === "run.create")
        throw new Error("MONITOR_RUN_ALREADY_EXISTS");
      if (operation === "run.read") return stored;
      throw new Error(`SELF_TEST_UNEXPECTED_${operation}`);
    },
    expected,
    3,
  );
  if (raced.status !== "EXISTING")
    throw new Error("SELF_TEST_RACE_RECONCILIATION_FAILED");

  let identityConflict = false;
  try {
    exactInitialRun(
      sampleRun({
        shifts: {
          "monitor-a": {
            shiftId: "monitor-a",
            chatRef: "chat-b",
            generation: 1,
            state: "BOOTING",
          },
        },
      }),
      expected,
    );
  } catch (error) {
    identityConflict =
      error instanceof Error &&
      error.message === "MONITOR_INITIAL_RUN_IDENTITY_CONFLICT";
  }
  if (!identityConflict)
    throw new Error("SELF_TEST_IDENTITY_GUARD_FAILED");

  let stateConflict = false;
  try {
    exactInitialRun(
      sampleRun({
        activeShiftId: "monitor-a",
        shifts: {
          "monitor-a": {
            shiftId: "monitor-a",
            chatRef: "chat-a",
            generation: 1,
            state: "ACTIVE",
          },
        },
      }),
      expected,
    );
  } catch (error) {
    stateConflict =
      error instanceof Error &&
      error.message === "MONITOR_INITIAL_RUN_STATE_CONFLICT";
  }
  if (!stateConflict)
    throw new Error("SELF_TEST_STATE_GUARD_FAILED");

  console.log("PROFLOW_MONITOR_INITIAL_SEED_SELF_TEST=PASS");
}

async function main() {
  if (process.argv.includes("--self-test")) {
    await selfTest();
    return;
  }
  if (process.argv.includes("--help")) {
    console.log(
      "usage: monitor-initial-seed.mjs --run-id ID --shift-id ID --chat-url URL [--workspace PATH]",
    );
    return;
  }

  const runId = valueArg("--run-id");
  const shiftId = valueArg("--shift-id");
  const chatUrl = valueArg("--chat-url");
  if (!runId) throw new Error("MONITOR_INITIAL_RUN_ID_REQUIRED");
  if (!shiftId) throw new Error("MONITOR_INITIAL_SHIFT_ID_REQUIRED");
  if (!chatUrl) throw new Error("MONITOR_INITIAL_CHAT_URL_REQUIRED");

  const workspace = resolve(valueArg("--workspace", DEFAULT_WORKSPACE));
  const stateRoot = join(
    workspace,
    ".proflow/runtime/modules/execution-browser-extension",
  );
  const sharedFacts = JSON.parse(
    await readFile(join(stateRoot, "shared-facts.json"), "utf8"),
  );
  const facts = sharedFacts?.facts;
  if (!facts || typeof facts !== "object")
    throw new Error("SHARED_FACTS_INVALID");

  const endpoint = loopback(factString(facts, "monitorControlEndpoint"));
  const token = await credential(
    factString(facts, "monitorControlTokenFile"),
  );
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
  if (!Number.isInteger(config?.revision))
    throw new Error("MONITOR_CONFIG_INVALID");
  if (
    typeof config?.projectLocator !== "string" ||
    config.projectLocator.length === 0
  )
    throw new Error("MONITOR_PROJECT_BINDING_MISSING");

  const identity = monitorChatIdentity(chatUrl, config.projectLocator);
  const ensured = await ensureInitialRun(
    control,
    {
      runId,
      shiftId,
      chatRef: identity.chatRef,
    },
    config.revision,
  );

  console.log(
    JSON.stringify({
      contract: "proflow.monitor-initial-seed.v1",
      status: ensured.status,
      runId: ensured.run.runId,
      runVersion: ensured.run.version,
      shiftId,
      generation: ensured.shift.generation,
      shiftState: ensured.shift.state,
      chatRef: identity.chatRef,
      chatUrl: identity.chatUrl,
      configRevision: config.revision,
    }),
  );
}

main().catch((error) => {
  console.error(
    `PROFLOW_MONITOR_INITIAL_SEED=FAIL ${safeCode(
      error instanceof Error ? error.message : "",
      "MONITOR_INITIAL_SEED_FAILED",
    )}`,
  );
  process.exit(1);
});
