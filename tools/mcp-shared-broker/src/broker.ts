import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  CallToolResultSchema,
  ListToolsRequestSchema,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { BrokerAuthority } from "./authority.js";
import { AUTHORITY_CLAIM_TOOL, BrokerAuthorityError } from "./authority.js";
import type { BrokerConfiguration } from "./config.js";

const MAX_HTTP_BODY_BYTES = 1_048_576;
const OWNER_STOP_GRACE_MS = 2_000;
const OWNER_KILL_GRACE_MS = 1_000;
const OWNER_READY_PROBE_MS = 500;
const OWNER_READY_RETRY_MS = 50;

type ListToolsParams = Parameters<Client["listTools"]>[0];
type CallToolParams = Parameters<Client["callTool"]>[0];
type ListToolsResult = Awaited<ReturnType<Client["listTools"]>>;
type CallToolResult = Awaited<ReturnType<Client["callTool"]>>;

export interface BrokerUpstream {
  isReady(): boolean;
  listTools(params?: ListToolsParams): Promise<ListToolsResult>;
  callTool(params: CallToolParams): Promise<CallToolResult>;
  close(): Promise<void>;
}

export interface BrokerUpstreamFactory {
  isReady(): boolean;
  openSession(): BrokerUpstream;
  close(): Promise<void>;
}

export interface BrokerHttpRuntime {
  readonly server: HttpServer;
  close(): Promise<void>;
}

export interface BrokerRuntimeOptions {
  readonly authority?: BrokerAuthority;
  readonly controllerToken?: string;
}

function createClientBackedUpstream(
  clientName: string,
  timeoutMs: number,
  connectClient: (client: Client) => Promise<void>,
  onClose?: () => void,
): BrokerUpstream {
  let client: Client | undefined;
  let connecting: Promise<Client> | undefined;
  let closed = false;

  const ensureClient = async (): Promise<Client> => {
    if (closed) throw new Error("MCP shared broker upstream session is closed.");
    if (client) return client;
    if (!connecting) {
      connecting = (async () => {
        const nextClient = new Client({ name: clientName, version: "0.1.0" });
        try {
          await connectClient(nextClient);
          client = nextClient;
          return nextClient;
        } catch (error) {
          await nextClient.close().catch(() => undefined);
          throw error;
        } finally {
          connecting = undefined;
        }
      })();
    }
    return await connecting;
  };

  return Object.freeze({
    isReady: () => client !== undefined,
    listTools: async (params?: ListToolsParams) => {
      const active = await ensureClient();
      return await active.listTools(params, { timeout: timeoutMs });
    },
    callTool: async (params: CallToolParams) => {
      const active = await ensureClient();
      return await active.callTool(params, undefined, { timeout: timeoutMs });
    },
    close: async () => {
      if (closed) return;
      closed = true;
      const pending = connecting;
      if (pending) await pending.catch(() => undefined);
      const active = client;
      client = undefined;
      if (active) await active.close().catch(() => undefined);
      onClose?.();
    },
  });
}

export function createStdioUpstream(config: BrokerConfiguration): BrokerUpstream {
  if (config.upstream.transport !== "stdio") {
    throw new Error("createStdioUpstream requires stdio upstream transport.");
  }
  return createClientBackedUpstream(
    config.upstream.clientName,
    config.connectTimeoutMs,
    async (client) => {
      await client.connect(
        new StdioClientTransport({
          command: config.upstream.command,
          args: [...config.upstream.args],
          env: { ...config.upstream.env },
          ...(config.upstream.cwd ? { cwd: config.upstream.cwd } : {}),
          stderr: "inherit",
        }),
        { timeout: config.connectTimeoutMs },
      );
    },
  );
}

export function createSharedStdioUpstreamFactory(config: BrokerConfiguration): BrokerUpstreamFactory {
  const shared = createStdioUpstream(config);
  let closed = false;
  return Object.freeze({
    isReady: () => shared.isReady(),
    openSession: () => {
      if (closed) throw new Error("MCP shared broker upstream factory is closed.");
      return Object.freeze({
        isReady: () => shared.isReady(),
        listTools: (params?: ListToolsParams) => shared.listTools(params),
        callTool: (params: CallToolParams) => shared.callTool(params),
        close: async () => undefined,
      });
    },
    close: async () => {
      if (closed) return;
      closed = true;
      await shared.close();
    },
  });
}

async function stopOwnerProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  await Promise.race([exited, delay(OWNER_STOP_GRACE_MS)]);
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGKILL");
  await Promise.race([exited, delay(OWNER_KILL_GRACE_MS)]);
}

export function createStreamableHttpProcessUpstreamFactory(config: BrokerConfiguration): BrokerUpstreamFactory {
  const upstreamUrl = config.upstream.url;
  if (config.upstream.transport !== "streamable-http" || !upstreamUrl) {
    throw new Error("Streamable HTTP upstream transport requires MCP_BROKER_UPSTREAM_URL.");
  }
  const endpoint = new URL(upstreamUrl);
  const sessions = new Set<BrokerUpstream>();
  let owner: ChildProcess | undefined;
  let ownerReady = false;
  let starting: Promise<void> | undefined;
  let closed = false;

  const ensureOwner = async (): Promise<void> => {
    if (closed) throw new Error("MCP shared broker upstream factory is closed.");
    if (ownerReady && owner && owner.exitCode === null && owner.signalCode === null) return;
    if (!starting) {
      starting = (async () => {
        let spawnError: Error | undefined;
        const child = spawn(config.upstream.command, [...config.upstream.args], {
          env: { ...getDefaultEnvironment(), ...config.upstream.env },
          stdio: ["ignore", "ignore", "inherit"],
          shell: false,
          ...(config.upstream.cwd ? { cwd: config.upstream.cwd } : {}),
        });
        owner = child;
        ownerReady = false;
        child.once("error", (error) => {
          spawnError = error;
        });
        child.once("exit", () => {
          if (owner === child) {
            owner = undefined;
            ownerReady = false;
          }
        });
        const deadline = Date.now() + config.connectTimeoutMs;
        try {
          while (Date.now() < deadline) {
            if (spawnError) throw spawnError;
            if (child.exitCode !== null || child.signalCode !== null) {
              throw new Error(
                `MCP upstream HTTP owner exited before readiness (code=${String(child.exitCode)} signal=${String(child.signalCode)}).`,
              );
            }
            try {
              const remaining = Math.max(1, deadline - Date.now());
              const response = await fetch(endpoint, {
                method: "GET",
                signal: AbortSignal.timeout(Math.min(OWNER_READY_PROBE_MS, remaining)),
              });
              await response.body?.cancel();
              ownerReady = true;
              return;
            } catch {
              await delay(Math.min(OWNER_READY_RETRY_MS, Math.max(1, deadline - Date.now())));
            }
          }
          throw new Error(`MCP upstream HTTP owner did not become reachable within ${config.connectTimeoutMs}ms.`);
        } catch (error) {
          if (owner === child) {
            owner = undefined;
            ownerReady = false;
          }
          await stopOwnerProcess(child).catch(() => undefined);
          throw error;
        }
      })().finally(() => {
        starting = undefined;
      });
    }
    await starting;
  };

  const openSession = (): BrokerUpstream => {
    if (closed) throw new Error("MCP shared broker upstream factory is closed.");
    let session: BrokerUpstream;
    session = createClientBackedUpstream(
      config.upstream.clientName,
      config.connectTimeoutMs,
      async (client) => {
        await ensureOwner();
        const transport = new StreamableHTTPClientTransport(new URL(upstreamUrl));
        await client.connect(transport as unknown as Parameters<Client["connect"]>[0], {
          timeout: config.connectTimeoutMs,
        });
      },
      () => {
        sessions.delete(session);
      },
    );
    sessions.add(session);
    return session;
  };

  return Object.freeze({
    isReady: () => ownerReady && [...sessions].some((session) => session.isReady()),
    openSession,
    close: async () => {
      if (closed) return;
      closed = true;
      const pending = starting;
      if (pending) await pending.catch(() => undefined);
      const activeSessions = [...sessions];
      sessions.clear();
      await Promise.allSettled(activeSessions.map((session) => session.close()));
      const activeOwner = owner;
      owner = undefined;
      ownerReady = false;
      if (activeOwner) await stopOwnerProcess(activeOwner).catch(() => undefined);
    },
  });
}

function createForwardingServer(
  upstream: BrokerUpstream,
  brokerId: string,
  authority?: BrokerAuthority,
  consumerRef?: string,
): Server {
  const server = new Server(
    { name: `mcp-shared-broker:${brokerId}`, version: "0.2.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const result = await upstream.listTools(request.params);
    if (!authority) return result;
    if (result.tools.some((tool) => tool.name === AUTHORITY_CLAIM_TOOL)) {
      throw new Error(`Upstream tool name ${AUTHORITY_CLAIM_TOOL} is reserved.`);
    }
    return {
      ...result,
      tools: [
        ...result.tools.map((tool) => authority.decorateTool(tool)),
        authority.claimToolDefinition(),
      ],
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (authority && request.params.name === AUTHORITY_CLAIM_TOOL) {
      return CallToolResultSchema.parse({
        content: [
          {
            type: "text",
            text: JSON.stringify(authority.claim(request.params.arguments ?? {}, consumerRef)),
          },
        ],
      });
    }
    const params = authority
      ? {
          ...request.params,
          arguments: authority.authorizeToolCall(
            request.params.name,
            request.params.arguments ?? {},
            consumerRef,
          ),
        }
      : request.params;
    const result = await upstream.callTool(params);
    return CallToolResultSchema.parse(result);
  });
  return server;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_HTTP_BODY_BYTES) throw new Error("MCP request body exceeds 1 MiB.");
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks, total).toString("utf8");
  if (!raw.trim()) throw new Error("MCP request body is empty.");
  return JSON.parse(raw) as unknown;
}

function writeText(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(body);
}

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function writeMcpError(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
}

function sessionId(request: IncomingMessage): string | undefined {
  const value = request.headers["mcp-session-id"];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function controllerAuthorized(request: IncomingMessage, controllerToken: string | undefined): boolean {
  return Boolean(controllerToken && request.headers.authorization === `Bearer ${controllerToken}`);
}

async function handleAuthorityRequest(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  options: BrokerRuntimeOptions,
): Promise<boolean> {
  if (!pathname.startsWith("/authority/v2/")) return false;
  if (!options.authority) {
    writeJson(response, 404, { error: "BROKER_AUTHORITY_DISABLED" });
    return true;
  }
  if (!controllerAuthorized(request, options.controllerToken)) {
    writeJson(response, 401, { error: "BROKER_AUTHORITY_AUTH_INVALID" });
    return true;
  }
  try {
    if (pathname === "/authority/v2/status" && request.method === "GET") {
      writeJson(response, 200, options.authority.status());
      return true;
    }
    if (pathname === "/authority/v2/downgrade" && request.method === "POST") {
      writeJson(response, 200, options.authority.downgradeForHandoff(await readJsonBody(request)));
      return true;
    }
    if (pathname === "/authority/v2/prepare" && request.method === "POST") {
      writeJson(response, 200, options.authority.prepareSuccessor(await readJsonBody(request)));
      return true;
    }
    if (pathname === "/authority/v2/promote" && request.method === "POST") {
      writeJson(response, 200, options.authority.promoteSuccessor(await readJsonBody(request)));
      return true;
    }
    if (pathname === "/authority/v2/revoke" && request.method === "POST") {
      writeJson(response, 200, options.authority.revoke(await readJsonBody(request)));
      return true;
    }
    writeJson(response, 404, { error: "BROKER_AUTHORITY_ENDPOINT_NOT_FOUND" });
    return true;
  } catch (error) {
    if (error instanceof BrokerAuthorityError) {
      writeJson(response, error.status, { error: error.code, message: error.message });
      return true;
    }
    writeJson(response, 400, {
      error: "BROKER_AUTHORITY_REQUEST_INVALID",
      message: error instanceof Error ? error.message : "Invalid broker authority request.",
    });
    return true;
  }
}

export function createBrokerHttpRuntime(
  upstreamFactory: BrokerUpstreamFactory,
  brokerId: string,
  options: BrokerRuntimeOptions = {},
): BrokerHttpRuntime {
  if (options.authority && !options.controllerToken) {
    throw new Error("Broker authority requires a controller token.");
  }
  const sessions = new Map<
    string,
    Readonly<{
      transport: StreamableHTTPServerTransport;
      server: Server;
      upstream: BrokerUpstream;
      consumerRef: string;
    }>
  >();
  const httpServer = createServer((request, response) => {
    void (async () => {
      const pathname = new URL(request.url ?? "/", "http://broker.local").pathname;
      if (await handleAuthorityRequest(request, response, pathname, options)) return;
      if (pathname === "/healthz") {
        writeText(response, 200, "live\n");
        return;
      }
      if (pathname === "/readyz") {
        writeText(
          response,
          upstreamFactory.isReady() ? 200 : 503,
          upstreamFactory.isReady() ? "ready\n" : "not ready\n",
        );
        return;
      }
      if (pathname !== "/mcp") {
        writeText(response, 404, "not found\n");
        return;
      }

      const existingId = sessionId(request);
      const existing = existingId ? sessions.get(existingId) : undefined;
      if (existing) {
        const body = request.method === "POST" ? await readJsonBody(request) : undefined;
        await existing.transport.handleRequest(request, response, body);
        return;
      }

      if (request.method !== "POST") {
        writeMcpError(
          response,
          existingId ? 404 : 400,
          existingId ? "Unknown MCP session." : "MCP session id is required.",
        );
        return;
      }
      const body = await readJsonBody(request);
      if (!isInitializeRequest(body)) {
        writeMcpError(response, 400, "Initial MCP request must initialize a session.");
        return;
      }

      const upstream = upstreamFactory.openSession();
      const consumerRef = `broker-consumer:${randomUUID()}`;
      options.authority?.registerConsumer(consumerRef);
      const downstream = createForwardingServer(upstream, brokerId, options.authority, consumerRef);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id): void => {
          sessions.set(
            id,
            Object.freeze({ transport, server: downstream, upstream, consumerRef }),
          );
        },
      });
      downstream.onclose = () => {
        const id = transport.sessionId;
        if (id) sessions.delete(id);
        options.authority?.unregisterConsumer(consumerRef);
        void upstream.close();
      };
      try {
        await downstream.connect(transport as Parameters<Server["connect"]>[0]);
        await transport.handleRequest(request, response, body);
      } catch (error) {
        options.authority?.unregisterConsumer(consumerRef);
        await downstream.close().catch(() => undefined);
        await upstream.close().catch(() => undefined);
        throw error;
      }
    })().catch((error: unknown) => {
      if (!response.headersSent) {
        writeMcpError(response, 400, error instanceof Error ? error.message : "Invalid MCP request.");
      } else {
        response.end();
      }
    });
  });

  return Object.freeze({
    server: httpServer,
    close: async () => {
      const active = [...sessions.values()];
      sessions.clear();
      await Promise.allSettled(
        active.map(async ({ server, upstream, consumerRef }) => {
          options.authority?.unregisterConsumer(consumerRef);
          await server.close().catch(() => undefined);
          await upstream.close().catch(() => undefined);
        }),
      );
      if (!httpServer.listening) return;
      await new Promise<void>((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    },
  });
}

export async function listenBrokerHttp(
  runtime: BrokerHttpRuntime,
  host: string,
  port: number,
): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    runtime.server.once("error", reject);
    runtime.server.listen(port, host, resolve);
  });
  const address = runtime.server.address();
  if (!address || typeof address === "string") {
    throw new Error("Broker HTTP listener did not expose a TCP address.");
  }
  const displayHost = host.includes(":") ? `[${host}]` : host;
  return `http://${displayHost}:${address.port}/mcp`;
}

export async function connectManagerStdio(
  upstreamFactory: BrokerUpstreamFactory,
  brokerId: string,
  authority?: BrokerAuthority,
): Promise<Server> {
  const upstream = upstreamFactory.openSession();
  const server = createForwardingServer(upstream, brokerId, authority);
  server.onclose = () => {
    void upstream.close();
  };
  try {
    await server.connect(new StdioServerTransport());
    return server;
  } catch (error) {
    await upstream.close().catch(() => undefined);
    throw error;
  }
}
