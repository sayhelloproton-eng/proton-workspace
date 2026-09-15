import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createBrokerAuthority } from "./authority.js";
import {
  connectManagerStdio,
  createBrokerHttpRuntime,
  createSharedStdioUpstreamFactory,
  createStreamableHttpProcessUpstreamFactory,
  listenBrokerHttp,
  type BrokerRuntimeOptions,
} from "./broker.js";
import { resolveBrokerConfiguration } from "./config.js";

export async function startSharedBroker(environment: Readonly<Record<string, string | undefined>> = process.env) {
  const config = resolveBrokerConfiguration(environment);
  const upstreamFactory = config.upstream.transport === "streamable-http"
    ? createStreamableHttpProcessUpstreamFactory(config)
    : createSharedStdioUpstreamFactory(config);
  let runtimeOptions: BrokerRuntimeOptions = {};
  if (config.authority) {
    const controllerToken = (await readFile(config.authority.controllerTokenFile, "utf8")).trim();
    if (controllerToken.length < 32) {
      throw new Error("Broker authority controller token must contain at least 32 characters.");
    }
    runtimeOptions = Object.freeze({
      authority: createBrokerAuthority(config.authority),
      controllerToken,
    });
  }
  const httpRuntime = createBrokerHttpRuntime(upstreamFactory, config.brokerId, runtimeOptions);
  let managerServer: Awaited<ReturnType<typeof connectManagerStdio>> | undefined;
  let endpoint: string | undefined;
  let closed = false;

  const close = async () => {
    if (closed) return;
    closed = true;
    await Promise.allSettled([
      managerServer?.close() ?? Promise.resolve(),
      httpRuntime.close(),
    ]);
    await upstreamFactory.close().catch(() => undefined);
    if (endpoint) await rm(config.urlFile, { force: true }).catch(() => undefined);
  };

  try {
    endpoint = await listenBrokerHttp(httpRuntime, config.host, config.port);
    await mkdir(path.dirname(config.urlFile), { recursive: true });
    await writeFile(config.urlFile, `${endpoint}\n`, { encoding: "utf8", mode: 0o600 });
    if (config.managerStdio) {
      managerServer = await connectManagerStdio(upstreamFactory, config.brokerId, runtimeOptions.authority);
    }
  } catch (error) {
    await close();
    throw error;
  }

  return Object.freeze({
    brokerId: config.brokerId,
    endpoint,
    managerStdio: config.managerStdio,
    close,
  });
}

async function main(): Promise<void> {
  try {
    const runtime = await startSharedBroker(process.env);
    console.error(`MCP shared broker ${runtime.brokerId} ready at ${runtime.endpoint}`);
    let stopping = false;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      void runtime.close().finally(() => { process.exitCode = 0; });
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    if (runtime.managerStdio) process.stdin.once("end", stop);
  } catch (error) {
    console.error(`MCP shared broker failed to start: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) void main();
