import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const DEFAULT_WORKSPACE = "/Users/agent/Desktop/proton-workspace";
export const MONITOR_BOOT_PROOF_V4 = "proflow.monitor-boot-proof.v4";

export function valueArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

export function hasFlag(name) {
  return process.argv.includes(name);
}

export function requiredArg(name) {
  const value = valueArg(name);
  if (!value) throw new Error(`ARG_${name.replace(/^--/, "").replaceAll("-", "_").toUpperCase()}_REQUIRED`);
  return value;
}

export function parseJsonArg(name, fallback = null) {
  const raw = valueArg(name);
  if (raw === null) return fallback;
  try {
    const value = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new Error(`ARG_${name.replace(/^--/, "").replaceAll("-", "_").toUpperCase()}_INVALID`);
  }
}

export async function textArg({ textName = "--text", fileName = "--text-file" } = {}) {
  const inline = valueArg(textName);
  const file = valueArg(fileName);
  if (inline && file) throw new Error("TEXT_INPUT_CONFLICT");
  if (inline) return inline;
  if (file) {
    const value = await readFile(resolve(file), "utf8");
    if (!value.trim()) throw new Error("TEXT_INPUT_EMPTY");
    return value;
  }
  throw new Error("TEXT_INPUT_REQUIRED");
}

export function stableRef(kind, value) {
  const digest = createHash("sha256").update(JSON.stringify(value)).digest("hex");
  return `monitor-maintenance:${kind}:sha256:${digest}`;
}

export function stableRequestId(operation, input) {
  return stableRef(operation.replaceAll(".", "-"), input);
}

function endpoint(value) {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) throw new Error("MONITOR_CONTROL_ENDPOINT_NOT_LOOPBACK");
  return parsed.href.replace(/\/$/, "");
}

function factString(facts, name) {
  const value = facts?.[name];
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`FACT_${name.toUpperCase()}_MISSING`);
  return value;
}

async function credential(path) {
  const value = (await readFile(path, "utf8")).trim();
  if (value.length < 32) throw new Error("MONITOR_CONTROL_CREDENTIAL_INVALID");
  return value;
}

export async function createMonitorApiClient({
  workspace = DEFAULT_WORKSPACE,
  timeoutMs = 5_000,
} = {}) {
  const root = resolve(workspace);
  const sharedFactsPath = join(
    root,
    ".proflow/runtime/modules/execution-browser-extension/shared-facts.json",
  );
  const shared = JSON.parse(await readFile(sharedFactsPath, "utf8"));
  const facts = shared?.facts;
  if (!facts || typeof facts !== "object") throw new Error("SHARED_FACTS_INVALID");

  const base = endpoint(factString(facts, "monitorControlEndpoint"));
  const token = await credential(factString(facts, "monitorControlTokenFile"));

  async function invoke(operation, input = {}) {
    let response;
    try {
      response = await fetch(`${base}/v1/monitor/control`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ operation, input }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new Error("MONITOR_CONTROL_TRANSPORT_UNKNOWN");
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error("MONITOR_CONTROL_BODY_INVALID");
    }
    if (!response.ok || body?.ok !== true)
      throw new Error(
        typeof body?.error === "string" && body.error.length
          ? body.error
          : `MONITOR_CONTROL_HTTP_${response.status}`,
      );
    return body.value;
  }

  return Object.freeze({ workspace: root, endpoint: base, invoke });
}

export async function negotiateBootProofContract(client) {
  try {
    const capabilities = await client.invoke("capabilities.read");
    if (
      !capabilities ||
      typeof capabilities !== "object" ||
      capabilities.contract !== "proflow.monitor-control-capabilities.v1" ||
      !Array.isArray(capabilities.bootProofContracts) ||
      capabilities.bootProofContracts.some((item) => typeof item !== "string") ||
      typeof capabilities.preferredBootProofContract !== "string"
    ) throw new Error("MONITOR_CONTROL_CAPABILITIES_INVALID");
    if (
      capabilities.preferredBootProofContract !== MONITOR_BOOT_PROOF_V4 ||
      !capabilities.bootProofContracts.includes(MONITOR_BOOT_PROOF_V4)
    ) throw new Error("MONITOR_BOOT_PROOF_V4_NOT_SUPPORTED");
    return MONITOR_BOOT_PROOF_V4;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "MONITOR_CONTROL_OPERATION_UNSUPPORTED"
    ) throw new Error("MONITOR_BOOT_PROOF_RUNTIME_ADOPTION_REQUIRED");
    throw error;
  }
}

export function findChatByShift(state, shiftId, { includeAbandoned = false } = {}) {
  const matches = Object.entries(state?.chats ?? {}).filter(([, chat]) =>
    chat &&
    typeof chat === "object" &&
    chat.shiftId === shiftId &&
    (includeAbandoned || chat.takeover?.abandonedAt === null)
  );
  if (matches.length !== 1) throw new Error("MONITOR_SHIFT_CHAT_NOT_UNIQUE");
  const [chatId, chat] = matches[0];
  return { chatId, chat };
}

export function currentProjection(current, state) {
  const currentChatId = current?.currentChatId ?? null;
  const driveTargetChatId = current?.driveTargetChatId ?? null;
  const currentChat = currentChatId ? state?.chats?.[currentChatId] ?? null : null;
  const driveTarget = driveTargetChatId ? state?.chats?.[driveTargetChatId] ?? null : null;
  return {
    currentChatId,
    currentShiftId: currentChat?.shiftId ?? null,
    mutationMode: current?.mutationMode ?? "NONE",
    driveTargetChatId,
    driveTargetShiftId: driveTarget?.shiftId ?? null,
    pendingBootstrap: current?.pendingBootstrap ?? null,
  };
}

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runMain(main, prefix) {
  try {
    await main();
  } catch (error) {
    const code = error instanceof Error ? error.message : "MONITOR_MAINTENANCE_FAILED";
    console.error(`${prefix}=FAIL ${code}`);
    process.exitCode = 1;
  }
}
