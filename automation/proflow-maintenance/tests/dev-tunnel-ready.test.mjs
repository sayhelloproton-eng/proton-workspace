import assert from "node:assert/strict";
import { test } from "node:test";
import { devTunnelReady } from "../proflow-dev-tunnel-ready.mjs";
const receipt = { contract: "proflow.dev-tunnel-cli.v1", action: "RECONCILE", workspace: "/fixture", status: "READY", credential: "VALID", tunnel: "READY", host: "RUNNING", publicBaseUrl: "https://fixture.example/", reason: "DEV_TUNNEL_READY", next: "REAL_SCENE_READY" };
test("one installed package command owns readiness", () => {
  let calls = 0;
  const result = devTunnelReady("/fixture", (command, args) => {
    calls++;
    assert.equal(command, "/fixture/node_modules/.bin/proflow-dev-tunnel");
    assert.deepEqual(args, ["reconcile", "--workspace", "/fixture", "--json"]);
    return { status: 0, stdout: JSON.stringify(receipt) };
  });
  assert.equal(result.status, "READY"); assert.equal(calls, 1);
});
for (const result of [
  { status: 0, stdout: "old package human output" },
  { status: null, stdout: JSON.stringify(receipt) },
  { status: 0, stdout: JSON.stringify({ ...receipt, workspace: "/other" }) },
  { status: 0, stdout: JSON.stringify({ ...receipt, host: "STOPPED" }) },
]) test("invalid or ambiguous package output never falls back or reports READY", () => {
  let calls = 0;
  assert.equal(devTunnelReady("/fixture", () => { calls++; return result; }).status, "UNKNOWN");
  assert.equal(calls, 1);
});
test("auth action comes from structured owner receipt", () => {
  const result = devTunnelReady("/fixture", () => ({ status: 1, stdout: JSON.stringify({ ...receipt, status: "ACTION_REQUIRED", next: "COMPLETE_DEV_TUNNEL_AUTH" }) }));
  assert.equal(result.status, "ACTION_REQUIRED");
  assert.equal(result.requiredAction, "COMPLETE_DEV_TUNNEL_AUTH");
});

test("active model entrypoints expose the npm owner and no retired lifecycle", async () => {
  const { readFile } = await import("node:fs/promises");
  const root = new URL("../../../", import.meta.url);
  for (const path of ["README.md", "automation/README.md", "automation/proflow-maintenance/README.md", "scripts/README.md", "tools/README.md", "skills/proflow-chat-loop/SKILL.md", "skills/chat-local-acceptance-automation-protocol/references/tool-runtime-and-auth.md"]) {
    const text = await readFile(new URL(path, root), "utf8");
    assert.match(text, /@tomflow\/proflow-dev-tunnel/, path);
    assert.doesNotMatch(text, /scripts\/dev-tunnel|automation\/dev-tunnel|tools\/dev-tunnel|PROTON_DEV_TUNNEL_CLI_COMMAND|workspace\.dev-tunnel-ready\.v1/, path);
  }
});
