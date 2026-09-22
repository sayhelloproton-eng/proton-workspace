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
    "monitor-browser-adopt.mjs",
    "monitor-loop-finalize.mjs",
    "proflow-dev-tunnel-ready.mjs",
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
  assert.equal(text.includes('"loop.complete"'), true);
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
  assert.match(step, /CHECK_CONTROLLED_GROUP_ADOPTION/);
  assert.match(step, /physical\("restore"/);
  assert.match(
    step,
    /VERIFY_EFFECT_POSTCONDITION[\s\S]*application\.drive\(\)/,
  );
  assert.doesNotMatch(step, /prompt-textarea|browser_type|sendMessage/);
});

test("physical Browser helper is controlled-group first and never sends Chat text", async () => {
  const text = await source("monitor-browser-physical.py");
  const production = text.split("\ndef self_test()")[0];
  for (const required of [
    "chrome.tabs.query({{groupId: selector.groupId}})",
    "chrome.tabs.update",
    "chrome.tabs.reload",
    "chrome.debugger.sendCommand",
    "MONITOR_TARGET_NOT_IN_CONTROLLED_GROUP",
  ]) assert.equal(production.includes(required), true, required);
  for (const forbidden of [
    "chrome.tabs.query({})",
    "chrome.windows.create",
    "chrome.tabs.sendMessage",
    "monitor.chat.submit",
    "monitor.chat.create",
  ]) assert.equal(production.includes(forbidden), false, forbidden);
  assert.doesNotMatch(production, /execute_group\([\s\S]{0,120}"adopt"/);
});

test("Browser adoption action consumes the generic current-session owner without reimplementing group mechanics", async () => {
  const text = await source("monitor-browser-adopt.mjs");
  const production = text.split("function selfTest()")[0];
  assert.match(text, /playwright-controlled-group\.py/);
  assert.match(text, /--prepare-current-session/);
  assert.match(text, /requiredTool: "browser_run_code_unsafe"/);
  assert.match(text, /conversationLocator/);
  assert.match(text, /chatId/);
  assert.match(text, /--cleanup-action-file/);
  assert.match(text, /RERUN_MONITOR_BROWSER_STEP_FOR_RECONCILIATION/);
  assert.doesNotMatch(production, /chrome\.tabs|chrome\.tabGroups|chrome\.windows/);
  assert.doesNotMatch(production, /playwright-rebind-existing-tab/);
  assert.match(text, /MONITOR_BROWSER_ADOPT_SELF_TEST_DURABLE_IDENTITY_VIOLATION/);
});

test("ProFlow Dev Tunnel action delegates solely to the installed npm package owner", async () => {
  const action = await source("proflow-dev-tunnel-ready.mjs");
  const realScene = await source("proflow-real-scene-ready.mjs");
  for (const required of [
    "node_modules/.bin/proflow-dev-tunnel",
    '"reconcile"',
    '"--json"',
    "proflow.dev-tunnel-cli.v1",
    "proflow.dev-tunnel-ready.v1",
    "@tomflow/proflow-dev-tunnel",
    "COMPLETE_DEV_TUNNEL_AUTH",
    "ENGINEERING_DEV_TUNNEL_OWNER",
    "RECONCILE_DEV_TUNNEL_OWNER",
    'next: "REAL_SCENE_READY"',
  ]) assert.equal(action.includes(required), true, required);
  for (const forbidden of [
    "scripts/dev-tunnel",
    "automation/dev-tunnel",
    "tools/dev-tunnel",
    "PROTON_DEV_TUNNEL_CLI_COMMAND",
    "workspace.dev-tunnel-ready.v1",
    "proflow-aeb1e6d087caaf089de01d41",
    "41705",
  ]) assert.equal(action.includes(forbidden), false, forbidden);
  assert.match(realScene, /proflow-dev-tunnel-ready\.mjs/);
  assert.doesNotMatch(realScene, /scripts\/dev-tunnel|async function tunnelIdentity/);
});

test("aggregate stage actions are absent; verification routes to one package owner", async () => {
  const names = new Set(await readdir(root));
  assert.equal(names.has("proflow-stage-prepare.mjs"), false);
  assert.equal(names.has("proflow-stage-verify.mjs"), false);

  const workspace = resolve(root, "../..");
  const skill = await readFile(
    join(workspace, "skills/proflow-chat-loop/SKILL.md"),
    "utf8",
  );
  assert.match(skill, /package:gate <one-package>/);
  assert.match(skill, /package:build <one-package>/);
  assert.doesNotMatch(skill, /proflow-stage-prepare|proflow-stage-verify/);
});

test("Chat Loop Skill exposes a low-cognition stable Action surface with no low-level bypass", async () => {
  const workspace = resolve(root, "../..");
  const skill = await readFile(
    join(workspace, "skills/proflow-chat-loop/SKILL.md"),
    "utf8",
  );
  const surface = skill
    .split("## Model-facing action surface — HARD RULE")[1]
    .split("## Standing release authorization — HARD RULE")[0];

  assert.match(skill, /## Successor decision loop — HARD RULE/);
  assert.match(skill, /one-receipt working set/);
  assert.match(skill, /Receipt routing is deterministic/);
  assert.match(skill, /requiredAction=ENGINEERING_DEV_TUNNEL_OWNER/);
  assert.match(skill, /requiredAction=RECONCILE_DEV_TUNNEL_OWNER/);

  const refs = [
    ...surface.matchAll(
      /node (automation\/proflow-maintenance\/[^ \\\n]+)/g,
    ),
  ].map((match) => match[1]);
  const uniqueRefs = [...new Set(refs)];
  for (const ref of uniqueRefs) await access(join(workspace, ref));

  for (const required of [
    "monitor-initialize.mjs",
    "monitor-context-manifest.mjs",
    "monitor-claim.mjs",
    "proflow-real-scene-ready.mjs",
    "proflow-dev-tunnel-ready.mjs",
    "monitor-browser-step.mjs",
    "monitor-browser-adopt.mjs",
    "monitor-handoff-finalize.mjs",
    "monitor-loop-finalize.mjs",
    "proflow-monitor-acceptance.mjs",
  ]) assert.equal(surface.includes(required), true, required);

  assert.doesNotMatch(
    surface,
    /scripts\/dev-tunnel|monitor-boot-proof\.mjs|monitor-takeover\.mjs|chrome:\/\/extensions/,
  );

  const handoff = await readFile(
    join(workspace, "skills/proflow-chat-loop/.handoff/current.md"),
    "utf8",
  );
  assert.match(handoff, /monitor-context-manifest\.mjs/);
  assert.match(
    handoff,
    /monitor-claim\.mjs --shift-id <candidateShiftId> --authorities-read/,
  );
  assert.match(handoff, /one-receipt working set/);
  assert.doesNotMatch(
    handoff,
    /publish its \*\*own\*\* formal boot proof|then run formal takeover/,
  );
});

test("loop finalizer requires Product-owner closure attestation and never invents product completion", async () => {
  const text = await source("monitor-loop-finalize.mjs");
  assert.match(text, /--product-owner-closed-read/);
  assert.match(text, /"loop\.complete"/);
  assert.match(text, /handoffState: LOOP_COMPLETE/);
  assert.match(text, /nextShiftId: none/);
  assert.match(text, /mutationMode: "NONE"/);
  assert.doesNotMatch(text, /recordProductGoalSatisfied|getProductCampaign/);
});
