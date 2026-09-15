import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createBrokerAuthority } from "../dist/authority.js";
import { createBrokerHttpRuntime, listenBrokerHttp } from "../dist/broker.js";
import { resolveBrokerConfiguration } from "../dist/config.js";

function fakeSessionFactory() {
  const sessions = [];
  let nextId = 0;
  let factoryClosed = false;
  return {
    sessions,
    isReady() {
      return sessions.some((session) => session.isReady());
    },
    openSession() {
      if (factoryClosed) throw new Error("factory closed");
      const id = ++nextId;
      let ready = false;
      let closed = false;
      const calls = [];
      const session = {
        id,
        calls,
        isReady() {
          return ready && !closed;
        },
        async listTools() {
          ready = true;
          return {
            tools: [
              {
                name: "read_file",
                description: "Read one file",
                inputSchema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["path"],
                  properties: { path: { type: "string" } },
                },
              },
              {
                name: "start_search",
                description: "Search files",
                inputSchema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["path"],
                  properties: { path: { type: "string" } },
                },
              },
              {
                name: "write_file",
                description: "Write one file",
                inputSchema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["value"],
                  properties: { value: { type: "string" } },
                },
              },
            ],
          };
        },
        async callTool(params) {
          ready = true;
          calls.push(params);
          return {
            content: [
              {
                type: "text",
                text: `${id}:${String(params.arguments?.value ?? params.arguments?.path ?? "")}`,
              },
            ],
          };
        },
        async close() {
          closed = true;
          ready = false;
        },
      };
      sessions.push(session);
      return session;
    },
    async close() {
      factoryClosed = true;
      await Promise.allSettled(sessions.map((session) => session.close()));
    },
  };
}

async function connectClient(name, endpoint) {
  const client = new Client({ name, version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  return client;
}

async function assertToolDenied(client, input) {
  let denied = false;
  try {
    const result = await client.callTool(input);
    denied = result?.isError === true;
  } catch {
    denied = true;
  }
  assert.equal(denied, true);
}

async function seedAuthorityState(root, filename = "authority-state.json") {
  const stateFile = join(root, filename);
  await writeFile(
    stateFile,
    `${JSON.stringify(
      { contract: "mcp-broker-authority-state-file.v2", state: "OPEN", generation: 0 },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  return stateFile;
}

function authorityOptions(root, stateFile) {
  return {
    controllerTokenFile: join(root, "controller.token"),
    stateFile,
    readOnlyTools: ["read_file", "start_search"],
    leaseTtlMs: 300_000,
  };
}

test("configuration selects authority v2 read-only allowlist and rejects v1 fence config", () => {
  const config = resolveBrokerConfiguration({
    MCP_BROKER_ID: "local-dev",
    MCP_BROKER_URL_FILE: "/tmp/local-dev-mcp.url",
    MCP_BROKER_UPSTREAM_COMMAND: "npx",
    MCP_BROKER_AUTHORITY_CONTROLLER_TOKEN_FILE: "/tmp/local-dev-authority.token",
    MCP_BROKER_AUTHORITY_STATE_FILE: "/tmp/local-dev-authority-state.json",
    MCP_BROKER_AUTHORITY_READ_ONLY_TOOLS_JSON: '["read_file","start_search"]',
    MCP_BROKER_AUTHORITY_LEASE_TTL_MS: "300000",
  });
  assert.deepEqual(config.authority, {
    controllerTokenFile: "/tmp/local-dev-authority.token",
    stateFile: "/tmp/local-dev-authority-state.json",
    readOnlyTools: ["read_file", "start_search"],
    leaseTtlMs: 300000,
  });
  assert.throws(
    () =>
      resolveBrokerConfiguration({
        MCP_BROKER_ID: "local-dev",
        MCP_BROKER_URL_FILE: "/tmp/local-dev-mcp.url",
        MCP_BROKER_UPSTREAM_COMMAND: "npx",
        MCP_BROKER_AUTHORITY_CONTROLLER_TOKEN_FILE: "/tmp/token",
        MCP_BROKER_AUTHORITY_STATE_FILE: "/tmp/state",
        MCP_BROKER_AUTHORITY_EFFECTFUL_TOOLS_JSON: '["write_file"]',
      }),
    /authority v1 configuration/,
  );
});

test("two downstream HTTP clients keep independent upstream sessions", async () => {
  const factory = fakeSessionFactory();
  const runtime = createBrokerHttpRuntime(factory, "fixture");
  const endpoint = await listenBrokerHttp(runtime, "127.0.0.1", 0);
  try {
    const first = await connectClient("first", endpoint);
    const second = await connectClient("second", endpoint);
    try {
      await Promise.all([first.listTools(), second.listTools()]);
      assert.equal(factory.sessions.length, 2);
      await first.callTool({ name: "read_file", arguments: { path: "/tmp/one" } });
      await second.callTool({ name: "read_file", arguments: { path: "/tmp/two" } });
      assert.equal(factory.sessions[0].calls.length, 1);
      assert.equal(factory.sessions[1].calls.length, 1);
    } finally {
      await Promise.allSettled([first.close(), second.close()]);
    }
  } finally {
    await runtime.close();
    await factory.close();
  }
});

test("authority v2 prepares, session-binds, promotes, downgrades and rotates without bearer tokens", async () => {
  const root = await mkdtemp(join(tmpdir(), "mcp-broker-v2-"));
  const factory = fakeSessionFactory();
  const stateFile = await seedAuthorityState(root);
  const controllerTokenFile = join(root, "controller.token");
  await writeFile(controllerTokenFile, "controller-token-0123456789abcdef0123456789\n", { mode: 0o600 });
  const authority = createBrokerAuthority(authorityOptions(root, stateFile));
  const controllerToken = "controller-token-0123456789abcdef0123456789";
  const runtime = createBrokerHttpRuntime(factory, "authority-fixture", { authority, controllerToken });
  const endpoint = await listenBrokerHttp(runtime, "127.0.0.1", 0);
  const baseUrl = endpoint.replace(/\/mcp$/, "");
  const admin = async (pathname, body) => {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        authorization: `Bearer ${controllerToken}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { response, body: await response.json() };
  };

  try {
    const oldClient = await connectClient("old-monitor", endpoint);
    const nextClient = await connectClient("next-monitor", endpoint);
    try {
      await Promise.all([oldClient.listTools(), nextClient.listTools()]);
      const claimOne = "claim-one-0123456789abcdef0123456789";
      const preparedOne = await admin("/authority/v2/prepare", {
        expectedGeneration: 0,
        generation: 1,
        scopeRef: "scope:one",
        chatRef: "chat:one",
        claimToken: claimOne,
      });
      assert.equal(preparedOne.response.status, 200);
      assert.equal(preparedOne.body.state, "ACTIVE");
      assert.equal(preparedOne.body.current.mode, "BOOT_READ");
      assert.equal(preparedOne.body.current.claimPending, true);
      assert.equal(preparedOne.body.current.sessionLive, false);
      assert.equal(typeof preparedOne.body.current.bindingRef, "string");
      assert.equal("leaseRef" in preparedOne.body.current, false);
      assert.equal(JSON.stringify(preparedOne.body).includes(claimOne), false);

      await assertToolDenied(oldClient, {
        name: "read_file",
        arguments: { path: "/tmp/before-claim" },
      });
      const firstClaimResult = await oldClient.callTool({
        name: "broker_authority_claim",
        arguments: { claimToken: claimOne },
      });
      const firstClaim = JSON.parse(firstClaimResult.content[0].text);
      assert.equal(firstClaim.contract, "mcp-broker-authority-claim.v2");
      assert.equal(firstClaim.mode, "BOOT_READ");
      assert.equal(firstClaim.sessionLive, true);
      assert.equal(typeof firstClaim.bindingRef, "string");
      assert.equal(typeof firstClaim.leaseRef, "string");
      assert.equal("brokerAuthorityToken" in firstClaim, false);

      await oldClient.callTool({ name: "read_file", arguments: { path: "/tmp/boot-read" } });
      await assertToolDenied(oldClient, {
        name: "write_file",
        arguments: { value: "boot-write-denied" },
      });
      await assertToolDenied(oldClient, {
        name: "read_file",
        arguments: { path: root },
      });

      const promotedOne = await admin("/authority/v2/promote", {
        expectedGeneration: 0,
        generation: 1,
        scopeRef: "scope:one",
        bindingRef: firstClaim.bindingRef,
        leaseRef: firstClaim.leaseRef,
      });
      assert.equal(promotedOne.body.current.mode, "ACTIVE_MUTATION");
      await oldClient.callTool({ name: "write_file", arguments: { value: "active-write" } });
      await assertToolDenied(nextClient, {
        name: "read_file",
        arguments: { path: "/tmp/not-bound" },
      });

      const downgraded = await admin("/authority/v2/downgrade", {
        expectedGeneration: 1,
        scopeRef: "scope:one",
      });
      assert.equal(downgraded.body.current.mode, "HANDOFF_READ");
      await oldClient.callTool({ name: "read_file", arguments: { path: "/tmp/handoff" } });
      await assertToolDenied(oldClient, {
        name: "write_file",
        arguments: { value: "handoff-write-denied" },
      });

      const claimTwo = "claim-two-0123456789abcdef0123456789";
      const preparedTwo = await admin("/authority/v2/prepare", {
        expectedGeneration: 1,
        generation: 2,
        scopeRef: "scope:two",
        chatRef: "chat:two",
        claimToken: claimTwo,
      });
      assert.equal(preparedTwo.body.state, "ROTATING");
      assert.equal(preparedTwo.body.successor.claimPending, true);
      assert.equal(preparedTwo.body.successor.sessionLive, false);

      const secondClaimResult = await nextClient.callTool({
        name: "broker_authority_claim",
        arguments: { claimToken: claimTwo },
      });
      const secondClaim = JSON.parse(secondClaimResult.content[0].text);
      assert.equal(secondClaim.mode, "BOOT_READ");
      const promotedTwo = await admin("/authority/v2/promote", {
        expectedGeneration: 1,
        generation: 2,
        scopeRef: "scope:two",
        bindingRef: secondClaim.bindingRef,
        leaseRef: secondClaim.leaseRef,
      });
      assert.equal(promotedTwo.body.state, "ACTIVE");
      assert.equal(promotedTwo.body.current.mode, "ACTIVE_MUTATION");
      await nextClient.callTool({ name: "write_file", arguments: { value: "new-active" } });
      await assertToolDenied(oldClient, {
        name: "read_file",
        arguments: { path: "/tmp/old-is-fenced" },
      });

      const revoked = await admin("/authority/v2/revoke", { reason: "monitor disabled" });
      assert.equal(revoked.body.state, "OPEN");
      await oldClient.callTool({ name: "write_file", arguments: { value: "normal-after-revoke" } });
    } finally {
      await Promise.allSettled([oldClient.close(), nextClient.close()]);
    }
  } finally {
    await runtime.close();
    await factory.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("authority v2 restart marks persisted leases non-live and permits same-claim rebind only after loss", async () => {
  const root = await mkdtemp(join(tmpdir(), "mcp-broker-rebind-"));
  try {
    const stateFile = await seedAuthorityState(root);
    const options = authorityOptions(root, stateFile);
    const first = createBrokerAuthority(options);
    const claimToken = "restart-claim-0123456789abcdef0123456789";
    first.prepareSuccessor({
      expectedGeneration: 0,
      generation: 1,
      scopeRef: "scope:restart",
      chatRef: "chat:restart",
      claimToken,
    });
    first.registerConsumer("consumer:first");
    const claimed = first.claim({ claimToken }, "consumer:first");
    assert.equal(first.status().current.sessionLive, true);

    const restored = createBrokerAuthority(options);
    assert.equal(restored.status().state, "ACTIVE");
    assert.equal(restored.status().current.sessionLive, false);
    restored.registerConsumer("consumer:second");
    const rebound = restored.claim({ claimToken }, "consumer:second");
    assert.equal(rebound.bindingRef, claimed.bindingRef);
    assert.equal(rebound.leaseRef, claimed.leaseRef);
    assert.equal(restored.status().current.sessionLive, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("authority v1 active state fails closed instead of silently migrating", async () => {
  const root = await mkdtemp(join(tmpdir(), "mcp-broker-v1-state-"));
  try {
    const stateFile = join(root, "state.json");
    await writeFile(
      stateFile,
      `${JSON.stringify({
        contract: "mcp-broker-authority-state-file.v1",
        state: "ACTIVE",
        scopeRef: "old",
        generation: 1,
        claimHash: "a".repeat(64),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })}\n`,
      { mode: 0o600 },
    );
    assert.throws(() => createBrokerAuthority(authorityOptions(root, stateFile)), /explicit migration/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
