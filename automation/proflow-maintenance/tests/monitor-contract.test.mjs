import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function source(name) {
  return readFile(join(root, name), "utf8");
}

test("formal helper inventory excludes standalone chat.register and retired migration helper", async () => {
  const names = new Set(await readdir(root));
  assert.equal(names.has("monitor-register.mjs"), false);
  assert.equal(names.has("monitor-migrate-legacy.mjs"), false);
  for (const name of [
    "monitor-current.mjs",
    "monitor-state.mjs",
    "monitor-config.mjs",
    "monitor-event.mjs",
    "monitor-injection.mjs",
    "monitor-handoff-complete.mjs",
    "monitor-boot-proof.mjs",
    "monitor-takeover.mjs",
    "monitor-successor-abandon.mjs",
    "monitor-notify.mjs",
    "monitor-state-adoption.mjs",
    "monitor-browser-step.mjs",
    "monitor-browser-physical.py",
  ]) {
    await access(join(root, name));
  }
});

test("maintenance helpers use v4 operations and contain no legacy lifecycle API", async () => {
  const files = (await readdir(root)).filter((name) => name.endsWith(".mjs"));
  const text = (await Promise.all(files.map(source))).join("\n");
  for (const forbidden of [
    '"run.list"',
    '"run.read"',
    '"run.create"',
    '"shift.bootProof"',
    '"shift.activate"',
    '"chat.register"',
    "Platform Monitor Coordinator",
  ]) assert.equal(text.includes(forbidden), false, forbidden);
  assert.equal(text.includes('"bootProof.record"'), true);
  assert.equal(text.includes('"takeover.accept"'), true);
  assert.equal(text.includes('"handoff.complete"'), true);
  assert.equal(text.includes('"bootstrap.stage"'), true);
});

test("new boot proof is v4-only, requires loopEnabled, and old runtime requires adoption", async () => {
  const helper = await source("monitor-boot-proof.mjs");
  const client = await readFile(join(root, "lib/monitor-api-client.mjs"), "utf8");
  assert.match(helper, /negotiateBootProofContract/);
  assert.match(helper, /config\?\.loopEnabled !== true/);
  assert.doesNotMatch(helper, /config\?\.enabled/);
  assert.match(helper, /projectContextProofs/);
  assert.match(helper, /chatLoopContextProof/);
  assert.doesNotMatch(helper, /HANDOFF:|contextProofs:/);
  assert.match(client, /capabilities\.read/);
  assert.match(client, /monitorStatePath/);
  assert.match(client, /MONITOR_CONTROL_OPERATION_UNSUPPORTED/);
  assert.match(client, /MONITOR_BOOT_PROOF_RUNTIME_ADOPTION_REQUIRED/);
  assert.match(client, /MONITOR_CONTROL_TRANSPORT_UNKNOWN/);
  assert.match(client, /MONITOR_BOOT_PROOF_V4_NOT_SUPPORTED/);
});

test("config helper refuses legacy enabled writes before control transport", async () => {
  const helper = await source("monitor-config.mjs");
  assert.match(helper, /MONITOR_CONFIG_LEGACY_ENABLED_FORBIDDEN/);
  assert.match(helper, /hasOwnProperty\.call\(patch, "enabled"\)/);
});

test("state adoption helper is read-only and proves live shared-fact plus filesystem convergence", async () => {
  const text = await source("monitor-state-adoption.mjs");
  assert.match(text, /MONITOR_STATE_ADOPTION_INSPECTOR_READ_ONLY/);
  assert.match(text, /monitorStatePath/);
  assert.match(text, /skills\/proflow-chat-loop\/\.runtime\/monitor-state\.json/);
  assert.match(text, /formerCanonicalAbsent/);
  assert.match(text, /retiredSplitLegacyAbsent/);
  assert.match(text, /MONITOR_STATE_RUNTIME_ADOPTION_REQUIRED/);
  assert.doesNotMatch(text, /writeFile|rename|copyFile|rm\(/);
});

test("semantic notification helper cannot accept webhook credentials", async () => {
  const text = await source("monitor-notify.mjs");
  assert.doesNotMatch(text, /webhook|secret|tokenFile|authorization/);
  assert.match(text, /source: "MODEL"/);
});

test("Browser step is the single mechanical router and delegates all message effects to Platform Host", async () => {
  const step = await source("monitor-browser-step.mjs");
  const client = await readFile(join(root, "lib/monitor-api-client.mjs"), "utf8");
  assert.match(step, /RECONCILE_EFFECT/);
  assert.match(step, /SYNC_TARGET/);
  assert.match(step, /EXECUTE_DRIVE/);
  assert.match(step, /RETIRE_CHAT/);
  assert.match(step, /VERIFY_SCENE/);
  assert.match(step, /createMonitorApplicationClient/);
  assert.match(client, /\/application\/monitor/);
  assert.match(step, /physical\("fingerprint"/);
  assert.match(step, /RESTORE_EXISTING_TAB/);
  assert.match(step, /physical\("restore"/);
  assert.match(
    step,
    /VERIFY_EFFECT_POSTCONDITION[\s\S]*application\.drive\(\)/,
  );
  assert.doesNotMatch(step, /prompt-textarea|browser_type|sendMessage/);
});

test("physical Browser helper owns tab/window lifecycle only and never sends Chat text", async () => {
  const text = await source("monitor-browser-physical.py");
  for (const required of [
    "chrome.tabs.query",
    "chrome.windows.create",
    "url:selector.exactUrl",
    "chrome.tabs.update",
    "chrome.tabs.reload",
    "chrome.tabs.remove",
    "chrome.debugger.sendCommand",
    "browser_run_code_unsafe",
  ]) assert.match(text, new RegExp(required.replaceAll(".", "\\.")));
  for (const forbidden of [
    "chrome.tabs.sendMessage",
    "monitor.chat.submit",
    "monitor.chat.create",
  ]) assert.equal(text.includes(forbidden), false, forbidden);
});
