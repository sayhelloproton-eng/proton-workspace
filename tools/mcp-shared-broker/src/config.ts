import path from "node:path";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const DEFAULT_CONNECT_TIMEOUT_MS = 20_000;
const MAX_CONNECT_TIMEOUT_MS = 60_000;

export type BrokerUpstreamTransport = "stdio" | "streamable-http";

export interface BrokerConfiguration {
  readonly brokerId: string;
  readonly host: string;
  readonly port: number;
  readonly urlFile: string;
  readonly connectTimeoutMs: number;
  readonly managerStdio: boolean;
  readonly upstream: Readonly<{
    transport: BrokerUpstreamTransport;
    command: string;
    args: readonly string[];
    clientName: string;
    env: Readonly<Record<string, string>>;
    url?: string;
    cwd?: string;
  }>;
}

function required(name: string, value: string | undefined): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) throw new Error(`${name} is required.`);
  return normalized;
}

function parsePort(value: string | undefined): number {
  if (value == null || value.trim() === "") return 0;
  if (!/^\d+$/.test(value)) throw new Error("MCP_BROKER_HTTP_PORT must be an integer from 0 to 65535.");
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("MCP_BROKER_HTTP_PORT must be an integer from 0 to 65535.");
  }
  return port;
}

function parseTimeout(value: string | undefined): number {
  if (value == null || value.trim() === "") return DEFAULT_CONNECT_TIMEOUT_MS;
  if (!/^\d+$/.test(value)) throw new Error(`MCP_BROKER_CONNECT_TIMEOUT_MS must be an integer from 1 to ${MAX_CONNECT_TIMEOUT_MS}.`);
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > MAX_CONNECT_TIMEOUT_MS) {
    throw new Error(`MCP_BROKER_CONNECT_TIMEOUT_MS must be an integer from 1 to ${MAX_CONNECT_TIMEOUT_MS}.`);
  }
  return timeout;
}

function parseManagerStdio(value: string | undefined): boolean {
  if (value == null || value.trim() === "") return true;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error("MCP_BROKER_MANAGER_STDIO must be true or false.");
}

function parseArgs(value: string | undefined): readonly string[] {
  if (value == null || value.trim() === "") return Object.freeze([]);
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (cause) {
    throw new Error("MCP_BROKER_UPSTREAM_ARGS_JSON must be valid JSON.", { cause });
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error("MCP_BROKER_UPSTREAM_ARGS_JSON must be a JSON string array.");
  }
  return Object.freeze([...parsed]);
}

function parseTransport(value: string | undefined): BrokerUpstreamTransport {
  const normalized = value?.trim() || "stdio";
  if (normalized === "stdio" || normalized === "streamable-http") return normalized;
  throw new Error("MCP_BROKER_UPSTREAM_TRANSPORT must be stdio or streamable-http.");
}

function parseUpstreamUrl(value: string | undefined, transport: BrokerUpstreamTransport): string | undefined {
  const normalized = value?.trim();
  if (transport === "stdio") {
    if (normalized) throw new Error("MCP_BROKER_UPSTREAM_URL is only valid with streamable-http transport.");
    return undefined;
  }
  const raw = required("MCP_BROKER_UPSTREAM_URL", normalized);
  let url: URL;
  try {
    url = new URL(raw);
  } catch (cause) {
    throw new Error("MCP_BROKER_UPSTREAM_URL must be an absolute loopback HTTP URL.", { cause });
  }
  const hostname = url.hostname.replace(/^\[/, "").replace(/\]$/, "");
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(hostname)) {
    throw new Error("MCP_BROKER_UPSTREAM_URL must use loopback HTTP.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("MCP_BROKER_UPSTREAM_URL must not contain credentials, query, or fragment.");
  }
  return url.toString();
}

function parseEnvPassthrough(
  value: string | undefined,
  environment: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string>> {
  if (value == null || value.trim() === "") return Object.freeze({});
  const keys = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
  const resolved: Record<string, string> = {};
  for (const key of keys) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`MCP_BROKER_UPSTREAM_ENV_PASSTHROUGH contains invalid environment variable name: ${key}`);
    }
    const current = environment[key];
    if (current === undefined) {
      throw new Error(`MCP_BROKER_UPSTREAM_ENV_PASSTHROUGH requested missing environment variable: ${key}`);
    }
    resolved[key] = current;
  }
  return Object.freeze(resolved);
}

export function resolveBrokerConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): BrokerConfiguration {
  const brokerId = required("MCP_BROKER_ID", environment.MCP_BROKER_ID);
  const host = environment.MCP_BROKER_HTTP_HOST?.trim() || "127.0.0.1";
  if (!LOOPBACK_HOSTS.has(host)) throw new Error("MCP_BROKER_HTTP_HOST must be loopback-only.");
  const urlFile = required("MCP_BROKER_URL_FILE", environment.MCP_BROKER_URL_FILE);
  if (!path.isAbsolute(urlFile)) throw new Error("MCP_BROKER_URL_FILE must be an absolute path.");
  const cwd = environment.MCP_BROKER_UPSTREAM_CWD?.trim();
  if (cwd && !path.isAbsolute(cwd)) throw new Error("MCP_BROKER_UPSTREAM_CWD must be an absolute path.");
  const transport = parseTransport(environment.MCP_BROKER_UPSTREAM_TRANSPORT);
  const upstreamUrl = parseUpstreamUrl(environment.MCP_BROKER_UPSTREAM_URL, transport);
  const upstreamClientName =
    environment.MCP_BROKER_UPSTREAM_CLIENT_NAME?.trim() || `mcp-shared-broker-upstream:${brokerId}`;
  const upstreamEnvironment = parseEnvPassthrough(
    environment.MCP_BROKER_UPSTREAM_ENV_PASSTHROUGH,
    environment,
  );
  return Object.freeze({
    brokerId,
    host,
    port: parsePort(environment.MCP_BROKER_HTTP_PORT),
    urlFile,
    connectTimeoutMs: parseTimeout(environment.MCP_BROKER_CONNECT_TIMEOUT_MS),
    managerStdio: parseManagerStdio(environment.MCP_BROKER_MANAGER_STDIO),
    upstream: Object.freeze({
      transport,
      command: required("MCP_BROKER_UPSTREAM_COMMAND", environment.MCP_BROKER_UPSTREAM_COMMAND),
      args: parseArgs(environment.MCP_BROKER_UPSTREAM_ARGS_JSON),
      clientName: upstreamClientName,
      env: upstreamEnvironment,
      ...(upstreamUrl ? { url: upstreamUrl } : {}),
      ...(cwd ? { cwd } : {}),
    }),
  });
}
