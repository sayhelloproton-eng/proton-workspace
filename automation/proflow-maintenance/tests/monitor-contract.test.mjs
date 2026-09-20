import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function source(name) {
  return readFile(join(root, name), "utf8");
}

test("formal helper inventory excludes standalone chat.register", async () => {
  const names = new Set(await readdir(root));
  assert.equal(names.has("monitor-register.mjs"), false);
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
    "monitor-migrate-legacy.mjs",
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

test("new boot proof is v4-only and old runtime requires adoption", async () => {
  const helper = await source("monitor-boot-proof.mjs");
  const client = await readFile(join(root, "lib/monitor-api-client.mjs"), "utf8");
  assert.match(helper, /negotiateBootProofContract/);
  assert.match(helper, /projectContextProofs/);
  assert.match(helper, /chatLoopContextProof/);
  assert.doesNotMatch(helper, /HANDOFF:|contextProofs:/);
  assert.match(client, /capabilities\.read/);
  assert.match(client, /MONITOR_CONTROL_OPERATION_UNSUPPORTED/);
  assert.match(client, /MONITOR_BOOT_PROOF_RUNTIME_ADOPTION_REQUIRED/);
  assert.match(client, /MONITOR_CONTROL_TRANSPORT_UNKNOWN/);
  assert.match(client, /MONITOR_BOOT_PROOF_V4_NOT_SUPPORTED/);
});

test("migration helper refuses direct apply ownership", async () => {
  const text = await source("monitor-migrate-legacy.mjs");
  assert.match(text, /MONITOR_MIGRATION_APPLY_OWNED_BY_NODE/);
  assert.doesNotMatch(text, /writeFile|rename|copyFile|monitor-state\.json/);
});

test("semantic notification helper cannot accept webhook credentials", async () => {
  const text = await source("monitor-notify.mjs");
  assert.doesNotMatch(text, /webhook|secret|tokenFile|authorization/);
  assert.match(text, /source: "MODEL"/);
});
