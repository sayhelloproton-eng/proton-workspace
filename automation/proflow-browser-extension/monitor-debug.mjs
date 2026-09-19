#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = "/Users/agent/Desktop/proton-workspace";
const SAFE_CODE = /^[A-Z][A-Z0-9_.:-]{0,159}$/;

function valueArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}
function safeCode(value, fallback) {
  return typeof value === "string" && SAFE_CODE.test(value) ? value : fallback;
}
async function jsonFile(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
async function credential(path) {
  const value = (await readFile(path, "utf8")).trim();
  if (value.length < 32) throw new Error("CREDENTIAL_INVALID");
  return value;
}
function factString(facts, name) {
  const value = facts?.[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`FACT_${name.toUpperCase()}_MISSING`);
  return value;
}
function assertLoopback(value, name) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname))
    throw new Error(`${name}_NOT_LOOPBACK`);
  return value.replace(/\/$/, "");
}
async function requestJson(url, init, fallback) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(3000) });
  } catch {
    throw new Error(`${fallback}_TRANSPORT`);
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    throw new Error(`${fallback}_BODY_INVALID`);
  }
  if (!response.ok) throw new Error(safeCode(body?.error, `${fallback}_HTTP_${response.status}`));
  return body;
}
function picked(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(keys.flatMap((key) => Object.hasOwn(value, key) ? [[key, value[key]]] : []));
}
function observationSummary(value) {
  return picked(value, ["contract", "chatRef", "url", "contentInstanceId", "state", "fallback", "settledRef", "observedAt"]);
}
function outboxSummary(value) {
  if (!Array.isArray(value)) return { count: null, items: [] };
  const keys = ["contract", "id", "eventId", "type", "kind", "state", "status", "attemptNo", "createdAt", "updatedAt", "errorCode"];
  return { count: value.length, items: value.slice(-20).map((item) => picked(item, keys)).filter(Boolean) };
}
async function readMonitorEvents(logRoot, sinceMs) {
  const files = [join(logRoot, "events.jsonl.1"), join(logRoot, "events.jsonl")];
  const events = [];
  for (const file of files) {
    let text;
    try { text = await readFile(file, "utf8"); } catch { continue; }
    for (const line of text.split("\n")) {
      if (!line) continue;
      try {
        const value = JSON.parse(line);
        const timestamp = Date.parse(value.timestamp ?? value.receivedAt ?? "");
        if (!Number.isFinite(timestamp) || timestamp < sinceMs) continue;
        if (value.component !== "monitor" && !(typeof value.event === "string" && value.event.startsWith("MONITOR_"))) continue;
        events.push(value);
      } catch {}
    }
  }
  return events.slice(-200);
}
async function main() {
  if (process.argv.includes("--help")) {
    console.log("usage: monitor-debug.mjs [--workspace PATH] [--run-id ID] [--chat-ref REF] [--since-minutes N]");
    return;
  }
  const workspace = resolve(valueArg("--workspace", ROOT));
  const runIdFilter = valueArg("--run-id", null);
  const chatRefFilter = valueArg("--chat-ref", null);
  const sinceMinutes = Number(valueArg("--since-minutes", "30"));
  if (!Number.isFinite(sinceMinutes) || sinceMinutes <= 0 || sinceMinutes > 10080) throw new Error("SINCE_MINUTES_INVALID");
  const stateRoot = join(workspace, ".proflow", "runtime", "modules", "execution-browser-extension");
  const sharedFactsRecord = await jsonFile(join(stateRoot, "shared-facts.json"));
  const facts = sharedFactsRecord?.facts;
  if (!facts || typeof facts !== "object") throw new Error("SHARED_FACTS_INVALID");
  const monitorEndpoint = assertLoopback(factString(facts, "monitorControlEndpoint"), "MONITOR_CONTROL_ENDPOINT");
  const monitorToken = await credential(factString(facts, "monitorControlTokenFile"));
  const bridgeEndpoint = assertLoopback(factString(facts, "bridgeEndpoint"), "BRIDGE_ENDPOINT");
  const bridgeToken = await credential(factString(facts, "bridgeTokenFile"));
  const extensionId = factString(facts, "extensionId");
  const errors = [];
  const safe = async (surface, fn) => {
    try { return { ok: true, value: await fn() }; }
    catch (error) {
      const errorCode = safeCode(error instanceof Error ? error.message : "", `${surface}_FAILED`);
      errors.push({ surface, errorCode });
      return { ok: false, errorCode };
    }
  };
  const control = (operation, input = {}) => safe(`CONTROL_${operation.replaceAll(".", "_").toUpperCase()}`, async () => {
    const body = await requestJson(`${monitorEndpoint}/v1/monitor/control`, {
      method: "POST",
      headers: { authorization: `Bearer ${monitorToken}`, "content-type": "application/json" },
      body: JSON.stringify({ operation, input }),
    }, "MONITOR_CONTROL");
    if (body?.ok !== true) throw new Error(safeCode(body?.error, "MONITOR_CONTROL_REJECTED"));
    return body.value;
  });
  const session = await safe("BRIDGE_SESSION", async () => {
    const body = await requestJson(`${bridgeEndpoint}/v1/session/status`, {
      headers: { authorization: `Bearer ${bridgeToken}`, origin: `chrome-extension://${extensionId}` },
    }, "BRIDGE_SESSION");
    return picked(body, ["online", "sessionOnline", "commandConsumerReady", "extensionInstanceId", "moduleVersion"]);
  });
  const config = await control("config.read");
  const listed = await control("run.list");
  const listedRuns = listed.ok && Array.isArray(listed.value) ? listed.value : [];
  const runIds = runIdFilter
    ? [runIdFilter]
    : listedRuns.map((run) => run?.runId).filter((runId) => typeof runId === "string").slice(0, 20);
  const runs = [];
  for (const runId of runIds) {
    const result = await control("run.read", { runId });
    runs.push(result.ok ? result.value : { runId, errorCode: result.errorCode });
  }
  const chatRefs = new Set(chatRefFilter ? [chatRefFilter] : []);
  for (const run of runs) {
    if (!run || typeof run !== "object" || Array.isArray(run) || !run.shifts || typeof run.shifts !== "object") continue;
    for (const shift of Object.values(run.shifts)) {
      if (shift && typeof shift === "object" && typeof shift.chatRef === "string") chatRefs.add(shift.chatRef);
    }
  }
  const observations = [];
  for (const chatRef of chatRefs) {
    const result = await control("observation.read", { chatRef });
    observations.push(result.ok ? { chatRef, present: true, observation: observationSummary(result.value) } : { chatRef, present: false, errorCode: result.errorCode });
  }
  const outbox = await control("notification.readOutbox");
  const verification = await safe("VERIFICATION", async () => picked(await jsonFile(factString(facts, "verificationEvidenceFile")), ["contract", "moduleVersion", "loadDir", "extensionId", "extensionInstanceId", "serviceWorker", "evidenceSource", "observedAt"]));
  const monitorEvents = await readMonitorEvents(join(workspace, ".proflow", "logs", "browser-extension"), Date.now() - sinceMinutes * 60_000);
  const output = {
    contract: "proflow.monitor-debug-snapshot.v1",
    collectedAt: new Date().toISOString(),
    workspace,
    paths: {
      sharedFacts: join(stateRoot, "shared-facts.json"),
      monitorConfig: typeof facts.monitorConfigPath === "string" ? facts.monitorConfigPath : null,
      browserLog: join(workspace, ".proflow", "logs", "browser-extension", "events.jsonl"),
    },
    runtime: {
      extensionId,
      monitorControlEndpoint: monitorEndpoint,
      bridgeEndpoint,
      session,
      verification,
    },
    monitor: {
      config,
      runs,
      observations,
      outbox: outbox.ok ? { ok: true, value: outboxSummary(outbox.value) } : outbox,
      recentEvents: monitorEvents,
    },
    summary: {
      runCount: runs.length,
      chatRefCount: chatRefs.size,
      observationPresentCount: observations.filter((item) => item.present).length,
      observationMissingCount: observations.filter((item) => !item.present).length,
      recentMonitorEventCount: monitorEvents.length,
      errorCount: errors.length,
    },
    errors,
  };
  console.log(JSON.stringify(output, null, 2));
  if (errors.some((item) => item.surface === "BRIDGE_SESSION" || item.surface === "CONTROL_CONFIG_READ")) process.exitCode = 2;
}
main().catch((error) => {
  console.error(`PROFLOW_MONITOR_DEBUG=FAIL ${safeCode(error instanceof Error ? error.message : "", "MONITOR_DEBUG_FAILED")}`);
  process.exit(1);
});
