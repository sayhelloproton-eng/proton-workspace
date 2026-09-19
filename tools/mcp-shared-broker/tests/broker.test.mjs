import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createBrokerHttpRuntime, createSharedStdioUpstreamFactory, listenBrokerHttp } from "../dist/broker.js";
import { resolveBrokerConfiguration } from "../dist/config.js";
import { fileURLToPath } from "node:url";

test("Browser clients share one upstream owner; closing a consumer preserves the owner", async () => {
  const config = resolveBrokerConfiguration({
    MCP_BROKER_ID: "browser",
    MCP_BROKER_URL_FILE: "/tmp/browser-fixture.url",
    MCP_BROKER_UPSTREAM_COMMAND: process.execPath,
    MCP_BROKER_UPSTREAM_ARGS_JSON: JSON.stringify([fileURLToPath(new URL("./browser-fixture.mjs", import.meta.url))]),
  });
  const factory = createSharedStdioUpstreamFactory(config);
  const runtime = createBrokerHttpRuntime(factory, "browser");
  const endpoint = await listenBrokerHttp(runtime, "127.0.0.1", 0);
  const clients = [];
  try {
    clients.push(await connectClient("chat-a", endpoint), await connectClient("chat-b", endpoint));
    const snapshots = [];
    for (const client of clients) {
      assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), ["browser_snapshot"]);
      snapshots.push(JSON.parse((await client.callTool({ name: "browser_snapshot" })).content[0].text));
    }
    assert.equal(snapshots[0].owner, snapshots[1].owner);
    assert.deepEqual(snapshots.map(snapshot => snapshot.calls), [1, 2]);
    await clients[0].close();
    const third = JSON.parse((await clients[1].callTool({ name: "browser_snapshot" })).content[0].text);
    assert.equal(third.owner, snapshots[0].owner);
    assert.equal(third.calls, 3);
    assert.equal((await fetch(endpoint.replace(/\/mcp$/, "/authority/v2/status"))).status, 404);
  } finally {
    await Promise.allSettled(clients.map(client => client.close()));
    await runtime.close();
    await factory.close();
  }
});

test("obsolete authority environment is ignored, including invalid and missing state files", () => {
  const config = resolveBrokerConfiguration({
    MCP_BROKER_ID: "browser",
    MCP_BROKER_URL_FILE: "/tmp/browser.url",
    MCP_BROKER_UPSTREAM_COMMAND: "node",
    MCP_BROKER_AUTHORITY_STATE_FILE: "/does/not/exist",
    MCP_BROKER_AUTHORITY_READ_ONLY_TOOLS_JSON: "invalid",
    MCP_BROKER_AUTHORITY_LEASE_TTL_MS: "invalid",
  });
  assert.equal("authority" in config, false);
});

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
