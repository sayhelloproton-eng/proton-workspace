#!/usr/bin/env node
import { access } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  createMonitorApiClient,
  hasFlag,
  printJson,
  runMain,
  valueArg,
} from "./lib/monitor-api-client.mjs";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (hasFlag("--apply"))
    throw new Error("MONITOR_STATE_ADOPTION_INSPECTOR_READ_ONLY");

  const client = await createMonitorApiClient({
    workspace: valueArg("--workspace") ?? undefined,
  });
  const state = await client.invoke("state.read");
  const canonicalStatePath = join(
    client.workspace,
    "skills/proflow-chat-loop/.runtime/monitor-state.json",
  );
  const formerRoot = join(
    client.workspace,
    ".proflow/runtime/modules/execution-browser-extension/monitor",
  );
  const formerCanonicalStatePath = join(formerRoot, "monitor-state.json");
  const retiredLegacyPaths = [
    join(formerRoot, "monitor-config.json"),
    join(formerRoot, "notification-outbox.json"),
    join(formerRoot, "runs"),
    join(formerRoot, "observations"),
  ];

  const checks = {
    controlStateContract: state?.contract === "proflow.monitor-state.v1",
    loopEnabledContract: typeof state?.config?.loopEnabled === "boolean",
    sharedFactPointsToCanonical:
      client.monitorStatePath !== null &&
      resolve(client.monitorStatePath) === resolve(canonicalStatePath),
    canonicalStatePresent: await exists(canonicalStatePath),
    formerCanonicalAbsent: !(await exists(formerCanonicalStatePath)),
    retiredSplitLegacyAbsent: true,
  };
  for (const path of retiredLegacyPaths) {
    if (await exists(path)) {
      checks.retiredSplitLegacyAbsent = false;
      break;
    }
  }

  const adopted = Object.values(checks).every(Boolean);
  if (hasFlag("--assert-adopted") && !adopted)
    throw new Error("MONITOR_STATE_RUNTIME_ADOPTION_REQUIRED");

  printJson({
    contract: "proflow.monitor-state-adoption.v1",
    status: adopted ? "ADOPTED" : "NOT_ADOPTED",
    owner: "TEMPORARY_CHAT_LOOP_NODE_STATE",
    canonicalStatePath,
    liveSharedFactStatePath: client.monitorStatePath,
    formerCanonicalStatePath,
    checks,
  });
}
await runMain(main, "PROFLOW_MONITOR_STATE_ADOPTION");
