import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { BrokerAuthorityConfiguration } from "./config.js";

export const AUTHORITY_CLAIM_TOOL = "broker_authority_claim";

export type BrokerAuthorityMode = "HANDOFF_READ" | "BOOT_READ" | "ACTIVE_MUTATION";

export class BrokerAuthorityError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 403) {
    super(message);
    this.name = "BrokerAuthorityError";
    this.code = code;
    this.status = status;
  }
}

type AuthorityBinding = {
  scopeRef: string;
  generation: number;
  chatRef: string;
  mode: BrokerAuthorityMode;
  claimHash: string;
  bindingRef: string;
  leaseRef?: string;
  consumerHash?: string;
  expiresAt: string;
};

type AuthorityState =
  | { state: "OPEN" }
  | { state: "ACTIVE"; current: AuthorityBinding }
  | { state: "ROTATING"; current: AuthorityBinding; successor: AuthorityBinding };

type PersistedAuthorityState =
  | {
      contract: "mcp-broker-authority-state-file.v2";
      state: "OPEN";
      generation: 0;
    }
  | {
      contract: "mcp-broker-authority-state-file.v2";
      state: "ACTIVE";
      current: AuthorityBinding;
    }
  | {
      contract: "mcp-broker-authority-state-file.v2";
      state: "ROTATING";
      current: AuthorityBinding;
      successor: AuthorityBinding;
    };

export type BrokerAuthorityBindingProjection = Readonly<{
  scopeRef: string;
  generation: number;
  chatRef: string;
  mode: BrokerAuthorityMode;
  claimPending: boolean;
  bindingRef: string;
  leaseRef?: string;
  sessionLive: boolean;
  expiresAt: string;
}>;

export type BrokerAuthorityProjection =
  | Readonly<{
      contract: "mcp-broker-authority-state.v2";
      state: "OPEN";
      generation: 0;
    }>
  | Readonly<{
      contract: "mcp-broker-authority-state.v2";
      state: "ACTIVE";
      current: BrokerAuthorityBindingProjection;
    }>
  | Readonly<{
      contract: "mcp-broker-authority-state.v2";
      state: "ROTATING";
      current: BrokerAuthorityBindingProjection;
      successor: BrokerAuthorityBindingProjection;
    }>;

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BrokerAuthorityError(`${name}_INVALID`, `${name} must be an object.`, 400);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new BrokerAuthorityError(`${name}_INVALID`, `${name} must be a non-empty string.`, 400);
  }
  return value.trim();
}

function secret(value: unknown, name: string): string {
  const parsed = text(value, name);
  if (parsed.length < 32) {
    throw new BrokerAuthorityError(`${name}_INVALID`, `${name} must contain at least 32 characters.`, 400);
  }
  return parsed;
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new BrokerAuthorityError(`${name}_INVALID`, `${name} must be a non-negative integer.`, 400);
  }
  return Number(value);
}

function positiveInteger(value: unknown, name: string): number {
  const parsed = nonNegativeInteger(value, name);
  if (parsed === 0) {
    throw new BrokerAuthorityError(`${name}_INVALID`, `${name} must be a positive integer.`, 400);
  }
  return parsed;
}

function mode(value: unknown): BrokerAuthorityMode {
  if (value === "HANDOFF_READ" || value === "BOOT_READ" || value === "ACTIVE_MUTATION") return value;
  throw new BrokerAuthorityError("BROKER_AUTHORITY_MODE_INVALID", "Broker authority mode is invalid.", 400);
}

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeHash(value: unknown, name: string): string {
  const parsed = text(value, name);
  if (!/^[0-9a-f]{64}$/.test(parsed)) {
    throw new BrokerAuthorityError(`${name}_INVALID`, `${name} must be a sha256 hex digest.`, 400);
  }
  return parsed;
}

function hashesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function matchesSecret(expectedHash: string, value: unknown): boolean {
  return typeof value === "string" && value.length > 0 && hashesEqual(expectedHash, hashToken(value));
}

function trustedConsumer(value: string | undefined): string {
  if (!value) {
    throw new BrokerAuthorityError(
      "BROKER_AUTHORITY_CONSUMER_REQUIRED",
      "Broker authority claim requires a trusted downstream HTTP consumer session.",
      409,
    );
  }
  return value;
}

function persistedBinding(value: unknown): AuthorityBinding {
  const raw = record(value, "BROKER_AUTHORITY_BINDING");
  const binding: AuthorityBinding = {
    scopeRef: text(raw.scopeRef, "BROKER_AUTHORITY_SCOPE_REF"),
    generation: positiveInteger(raw.generation, "BROKER_AUTHORITY_GENERATION"),
    chatRef: text(raw.chatRef, "BROKER_AUTHORITY_CHAT_REF"),
    mode: mode(raw.mode),
    claimHash: safeHash(raw.claimHash, "BROKER_AUTHORITY_CLAIM_HASH"),
    bindingRef: text(raw.bindingRef, "BROKER_AUTHORITY_BINDING_REF"),
    expiresAt: text(raw.expiresAt, "BROKER_AUTHORITY_EXPIRES_AT"),
  };
  if (Number.isNaN(Date.parse(binding.expiresAt))) {
    throw new BrokerAuthorityError("BROKER_AUTHORITY_EXPIRES_AT_INVALID", "Broker authority expiry is invalid.", 400);
  }
  const leaseRef = raw.leaseRef === undefined ? undefined : text(raw.leaseRef, "BROKER_AUTHORITY_LEASE_REF");
  const consumerHash = raw.consumerHash === undefined ? undefined : safeHash(raw.consumerHash, "BROKER_AUTHORITY_CONSUMER_HASH");
  if (Boolean(leaseRef) !== Boolean(consumerHash)) {
    throw new BrokerAuthorityError(
      "BROKER_AUTHORITY_BINDING_INVALID",
      "Broker authority leaseRef and consumerHash must be persisted together.",
      400,
    );
  }
  return {
    ...binding,
    ...(leaseRef ? { leaseRef } : {}),
    ...(consumerHash ? { consumerHash } : {}),
  };
}

function loadState(stateFile: string): AuthorityState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(stateFile, "utf8"));
  } catch (cause) {
    throw new TypeError(`Broker authority state file is required and must contain valid JSON: ${stateFile}`, { cause });
  }
  const raw = record(parsed, "BROKER_AUTHORITY_STATE");
  if (raw.contract === "mcp-broker-authority-state-file.v1") {
    if (raw.state === "OPEN" && nonNegativeInteger(raw.generation, "BROKER_AUTHORITY_GENERATION") === 0) {
      return { state: "OPEN" };
    }
    throw new TypeError("Active broker authority v1 state requires explicit migration; refusing silent conversion.");
  }
  if (raw.contract !== "mcp-broker-authority-state-file.v2") {
    throw new TypeError("Broker authority state file contract mismatch.");
  }
  if (raw.state === "OPEN") {
    if (nonNegativeInteger(raw.generation, "BROKER_AUTHORITY_GENERATION") !== 0) {
      throw new TypeError("Open broker authority state must use generation 0.");
    }
    return { state: "OPEN" };
  }
  if (raw.state === "ACTIVE") return { state: "ACTIVE", current: persistedBinding(raw.current) };
  if (raw.state === "ROTATING") {
    const current = persistedBinding(raw.current);
    const successor = persistedBinding(raw.successor);
    if (successor.generation !== current.generation + 1) {
      throw new TypeError("Rotating broker authority successor generation must advance by one.");
    }
    return { state: "ROTATING", current, successor };
  }
  throw new TypeError("Broker authority state must be OPEN, ACTIVE, or ROTATING.");
}

function persistedState(state: AuthorityState): PersistedAuthorityState {
  if (state.state === "OPEN") {
    return { contract: "mcp-broker-authority-state-file.v2", state: "OPEN", generation: 0 };
  }
  if (state.state === "ACTIVE") {
    return { contract: "mcp-broker-authority-state-file.v2", state: "ACTIVE", current: state.current };
  }
  return {
    contract: "mcp-broker-authority-state-file.v2",
    state: "ROTATING",
    current: state.current,
    successor: state.successor,
  };
}

function persistState(stateFile: string, state: AuthorityState): void {
  const directory = path.dirname(stateFile);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = `${stateFile}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(persistedState(state), null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    renameSync(temporary, stateFile);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}

function toolSchema(tool: Tool): Record<string, unknown> {
  return typeof tool.inputSchema === "object" && tool.inputSchema !== null && !Array.isArray(tool.inputSchema)
    ? tool.inputSchema as Record<string, unknown>
    : { type: "object" };
}

function absolutePathCandidates(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") {
    if (path.isAbsolute(value)) output.push(path.resolve(value));
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) absolutePathCandidates(item, output);
    return output;
  }
  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value as Record<string, unknown>)) absolutePathCandidates(item, output);
  }
  return output;
}

function overlapsPath(candidate: string, protectedPath: string): boolean {
  return (
    candidate === protectedPath ||
    candidate.startsWith(`${protectedPath}${path.sep}`) ||
    protectedPath.startsWith(`${candidate}${path.sep}`)
  );
}

export function createBrokerAuthority(
  configuration: Pick<
    BrokerAuthorityConfiguration,
    "controllerTokenFile" | "stateFile" | "readOnlyTools" | "leaseTtlMs"
  > & { readonly now?: () => Date },
) {
  if (configuration.readOnlyTools.length === 0) {
    throw new TypeError("Broker authority requires at least one read-only tool.");
  }
  if (!Number.isInteger(configuration.leaseTtlMs) || configuration.leaseTtlMs < 60_000 || configuration.leaseTtlMs > 86_400_000) {
    throw new TypeError("Broker authority lease TTL must be between 60000 and 86400000 ms.");
  }
  if (!path.isAbsolute(configuration.stateFile) || !path.isAbsolute(configuration.controllerTokenFile)) {
    throw new TypeError("Broker authority state/controller files must be absolute paths.");
  }

  const now = configuration.now ?? (() => new Date());
  const readOnlyTools = new Set(configuration.readOnlyTools);
  const protectedPaths = [configuration.stateFile, configuration.controllerTokenFile].map((item) => path.resolve(item));
  const liveConsumers = new Set<string>();
  let state = loadState(configuration.stateFile);

  const consumerLive = (binding: AuthorityBinding): boolean =>
    Boolean(binding.consumerHash && liveConsumers.has(binding.consumerHash));

  const projection = (binding: AuthorityBinding): BrokerAuthorityBindingProjection => ({
    scopeRef: binding.scopeRef,
    generation: binding.generation,
    chatRef: binding.chatRef,
    mode: binding.mode,
    claimPending: !(binding.leaseRef && binding.consumerHash),
    bindingRef: binding.bindingRef,
    ...(binding.leaseRef ? { leaseRef: binding.leaseRef } : {}),
    sessionLive: consumerLive(binding),
    expiresAt: binding.expiresAt,
  });

  const status = (): BrokerAuthorityProjection => {
    if (state.state === "OPEN") {
      return Object.freeze({ contract: "mcp-broker-authority-state.v2", state: "OPEN", generation: 0 });
    }
    if (state.state === "ACTIVE") {
      return Object.freeze({
        contract: "mcp-broker-authority-state.v2",
        state: "ACTIVE",
        current: Object.freeze(projection(state.current)),
      });
    }
    return Object.freeze({
      contract: "mcp-broker-authority-state.v2",
      state: "ROTATING",
      current: Object.freeze(projection(state.current)),
      successor: Object.freeze(projection(state.successor)),
    });
  };

  const fresh = (binding: AuthorityBinding): AuthorityBinding => {
    if (now().getTime() > Date.parse(binding.expiresAt)) {
      throw new BrokerAuthorityError("BROKER_AUTHORITY_LEASE_EXPIRED", "Broker authority lease has expired.");
    }
    return binding;
  };

  const currentGeneration = (): number =>
    state.state === "OPEN" ? 0 : state.state === "ACTIVE" ? state.current.generation : state.current.generation;

  const preparedBinding = (input: Record<string, unknown>): AuthorityBinding => ({
    scopeRef: text(input.scopeRef, "BROKER_AUTHORITY_SCOPE_REF"),
    generation: positiveInteger(input.generation, "BROKER_AUTHORITY_GENERATION"),
    chatRef: text(input.chatRef, "BROKER_AUTHORITY_CHAT_REF"),
    mode: "BOOT_READ",
    claimHash: hashToken(secret(input.claimToken, "BROKER_AUTHORITY_CLAIM_TOKEN")),
    bindingRef: `broker-binding:${randomUUID()}`,
    expiresAt: new Date(now().getTime() + configuration.leaseTtlMs).toISOString(),
  });

  const bindingByClaim = (claimToken: unknown): AuthorityBinding => {
    const supplied = secret(claimToken, "BROKER_AUTHORITY_CLAIM_TOKEN");
    const candidates = state.state === "OPEN"
      ? []
      : state.state === "ACTIVE"
        ? [state.current]
        : [state.current, state.successor];
    const found = candidates.find((candidate) => matchesSecret(candidate.claimHash, supplied));
    if (!found) {
      throw new BrokerAuthorityError("BROKER_AUTHORITY_CLAIM_INVALID", "Broker authority claim token is invalid.");
    }
    return fresh(found);
  };

  const bindingByConsumer = (consumerRef: string | undefined): AuthorityBinding | undefined => {
    if (!consumerRef) return undefined;
    const consumerHash = hashToken(consumerRef);
    const candidates = state.state === "OPEN"
      ? []
      : state.state === "ACTIVE"
        ? [state.current]
        : [state.current, state.successor];
    return candidates.find(
      (candidate) =>
        candidate.consumerHash === consumerHash && liveConsumers.has(consumerHash),
    );
  };

  const save = (): BrokerAuthorityProjection => {
    persistState(configuration.stateFile, state);
    return status();
  };

  return Object.freeze({
    status,
    registerConsumer(consumerRef: string) {
      liveConsumers.add(hashToken(trustedConsumer(consumerRef)));
    },
    unregisterConsumer(consumerRef: string) {
      liveConsumers.delete(hashToken(trustedConsumer(consumerRef)));
    },
    downgradeForHandoff(input: unknown) {
      const raw = record(input, "BROKER_AUTHORITY_DOWNGRADE");
      if (state.state !== "ACTIVE") {
        throw new BrokerAuthorityError("BROKER_AUTHORITY_STATE_INVALID", "Authority downgrade requires ACTIVE state.", 409);
      }
      const binding = fresh(state.current);
      if (
        nonNegativeInteger(raw.expectedGeneration, "BROKER_AUTHORITY_EXPECTED_GENERATION") !== binding.generation ||
        text(raw.scopeRef, "BROKER_AUTHORITY_SCOPE_REF") !== binding.scopeRef
      ) {
        throw new BrokerAuthorityError("BROKER_AUTHORITY_GENERATION_STALE", "Authority downgrade does not match current binding.", 409);
      }
      if (binding.mode !== "ACTIVE_MUTATION" && binding.mode !== "HANDOFF_READ") {
        throw new BrokerAuthorityError("BROKER_AUTHORITY_MODE_INVALID", "Only ACTIVE_MUTATION can enter handoff.", 409);
      }
      binding.mode = "HANDOFF_READ";
      return save();
    },
    prepareSuccessor(input: unknown) {
      const raw = record(input, "BROKER_AUTHORITY_PREPARE");
      const expectedGeneration = nonNegativeInteger(raw.expectedGeneration, "BROKER_AUTHORITY_EXPECTED_GENERATION");
      const generation = positiveInteger(raw.generation, "BROKER_AUTHORITY_GENERATION");
      if (expectedGeneration !== currentGeneration() || generation !== expectedGeneration + 1) {
        throw new BrokerAuthorityError("BROKER_AUTHORITY_GENERATION_STALE", "Authority prepare generation is stale.", 409);
      }
      const scopeRef = text(raw.scopeRef, "BROKER_AUTHORITY_SCOPE_REF");
      const chatRef = text(raw.chatRef, "BROKER_AUTHORITY_CHAT_REF");
      const claim = secret(raw.claimToken, "BROKER_AUTHORITY_CLAIM_TOKEN");
      const matchesPrepared = (binding: AuthorityBinding) =>
        binding.generation === generation &&
        binding.scopeRef === scopeRef &&
        binding.chatRef === chatRef &&
        binding.mode === "BOOT_READ" &&
        matchesSecret(binding.claimHash, claim);
      if (state.state === "ACTIVE" && state.current.generation === generation && matchesPrepared(state.current)) {
        return status();
      }
      if (state.state === "ROTATING" && matchesPrepared(state.successor)) return status();
      const next = preparedBinding(raw);
      if (state.state === "OPEN") {
        state = { state: "ACTIVE", current: next };
        return save();
      }
      if (state.state !== "ACTIVE" || state.current.mode !== "HANDOFF_READ") {
        throw new BrokerAuthorityError("BROKER_AUTHORITY_STATE_INVALID", "Successor prepare requires HANDOFF_READ current binding.", 409);
      }
      state = { state: "ROTATING", current: state.current, successor: next };
      return save();
    },
    promoteSuccessor(input: unknown) {
      const raw = record(input, "BROKER_AUTHORITY_PROMOTE");
      const expectedGeneration = nonNegativeInteger(raw.expectedGeneration, "BROKER_AUTHORITY_EXPECTED_GENERATION");
      const generation = positiveInteger(raw.generation, "BROKER_AUTHORITY_GENERATION");
      const target =
        state.state === "ROTATING"
          ? state.successor
          : state.state === "ACTIVE" && state.current.mode === "BOOT_READ"
            ? state.current
            : undefined;
      if (!target || generation !== target.generation || expectedGeneration !== generation - 1) {
        throw new BrokerAuthorityError("BROKER_AUTHORITY_GENERATION_STALE", "Authority promote generation is stale.", 409);
      }
      fresh(target);
      if (
        text(raw.scopeRef, "BROKER_AUTHORITY_SCOPE_REF") !== target.scopeRef ||
        text(raw.bindingRef, "BROKER_AUTHORITY_BINDING_REF") !== target.bindingRef ||
        text(raw.leaseRef, "BROKER_AUTHORITY_LEASE_REF") !== target.leaseRef ||
        !target.consumerHash ||
        !target.leaseRef ||
        !consumerLive(target)
      ) {
        throw new BrokerAuthorityError("BROKER_AUTHORITY_BINDING_STALE", "Successor binding is not live or does not match.", 409);
      }
      target.mode = "ACTIVE_MUTATION";
      state = { state: "ACTIVE", current: target };
      return save();
    },
    revoke(input: unknown) {
      const raw = record(input, "BROKER_AUTHORITY_REVOKE");
      text(raw.reason, "BROKER_AUTHORITY_REVOKE_REASON");
      state = { state: "OPEN" };
      return save();
    },
    claim(input: unknown, consumerRef?: string) {
      const raw = record(input, "BROKER_AUTHORITY_CLAIM");
      const target = bindingByClaim(raw.claimToken);
      const consumer = trustedConsumer(consumerRef);
      const consumerHash = hashToken(consumer);
      if (!liveConsumers.has(consumerHash)) {
        throw new BrokerAuthorityError("BROKER_AUTHORITY_CONSUMER_NOT_LIVE", "Claiming downstream session is not live.", 409);
      }
      if (target.consumerHash && target.leaseRef && consumerLive(target)) {
        if (target.consumerHash !== consumerHash) {
          throw new BrokerAuthorityError("BROKER_AUTHORITY_SESSION_IN_USE", "Authority is already bound to another live session.", 409);
        }
      } else {
        target.consumerHash = consumerHash;
        target.leaseRef ??= `broker-lease:${randomUUID()}`;
        persistState(configuration.stateFile, state);
      }
      return Object.freeze({
        contract: "mcp-broker-authority-claim.v2" as const,
        scopeRef: target.scopeRef,
        generation: target.generation,
        chatRef: target.chatRef,
        mode: target.mode,
        bindingRef: target.bindingRef,
        leaseRef: target.leaseRef,
        sessionLive: true as const,
        expiresAt: target.expiresAt,
      });
    },
    decorateTool(tool: Tool): Tool {
      return { ...tool, inputSchema: toolSchema(tool) } as Tool;
    },
    claimToolDefinition(): Tool {
      return {
        name: AUTHORITY_CLAIM_TOOL,
        description:
          "Bind the prepared Monitor Local Dev authority to this trusted downstream MCP session. Returns refs only; no bearer authority token is issued.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["claimToken"],
          properties: { claimToken: { type: "string" } },
        },
      };
    },
    authorizeToolCall(name: string, input: Record<string, unknown>, consumerRef?: string): Record<string, unknown> {
      if (state.state === "OPEN") return { ...input };
      const binding = bindingByConsumer(consumerRef);
      if (!binding) {
        throw new BrokerAuthorityError(
          "BROKER_AUTHORITY_REQUIRED",
          "Local Dev authority is bound to another or not-yet-claimed MCP session.",
        );
      }
      fresh(binding);
      if (binding.mode === "ACTIVE_MUTATION") return { ...input };
      if (!readOnlyTools.has(name)) {
        throw new BrokerAuthorityError(
          "BROKER_AUTHORITY_MODE_DENIED",
          `${binding.mode} allows only explicitly configured read-only Local Dev tools.`,
        );
      }
      const candidatePaths = absolutePathCandidates(input);
      if (candidatePaths.some((candidate) => protectedPaths.some((protectedPath) => overlapsPath(candidate, protectedPath)))) {
        throw new BrokerAuthorityError(
          "BROKER_AUTHORITY_PROTECTED_PATH",
          "Read-only Monitor authority cannot access broker authority secret/state paths.",
        );
      }
      return { ...input };
    },
  });
}

export type BrokerAuthority = ReturnType<typeof createBrokerAuthority>;
