#!/usr/bin/env node
import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
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

async function legacySnapshot(workspace) {
  const root = join(
    workspace,
    ".proflow/runtime/modules/execution-browser-extension",
  );
  const runsRoot = join(root, "runs");
  let runFiles = [];
  try {
    runFiles = (await readdir(runsRoot)).filter((name) => name.endsWith(".json"));
  } catch {}
  const files = {
    monitorConfig: await exists(join(root, "monitor-config.json")),
    notificationOutbox: await exists(join(root, "notification-outbox.json")),
    runs: runFiles,
    observationsDir: await exists(join(root, "observations")),
  };
  return {
    root,
    files,
    legacyPresent:
      files.monitorConfig ||
      files.notificationOutbox ||
      files.runs.length > 0 ||
      files.observationsDir,
  };
}

async function main() {
  if (hasFlag("--apply"))
    throw new Error("MONITOR_MIGRATION_APPLY_OWNED_BY_NODE");

  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const legacy = await legacySnapshot(client.workspace);
  const state = await client.invoke("state.read");
  const migrated = state?.migration?.source === "legacy-monitor-v1";
  const adopted = state?.contract === "proflow.monitor-state.v1";

  if (hasFlag("--assert-adopted")) {
    if (!adopted) throw new Error("MONITOR_STATE_NOT_ADOPTED");
    if (legacy.legacyPresent && !migrated)
      throw new Error("MONITOR_LEGACY_MIGRATION_NOT_RECORDED");
  }

  printJson({
    contract: "proflow.monitor-migration-inspect.v1",
    status: migrated
      ? "MIGRATED"
      : legacy.legacyPresent
        ? "OWNER_ADOPTED_WITH_LEGACY_PRESENT"
        : "NO_LEGACY_MIGRATION_REQUIRED",
    owner: "NODE_MONITOR_STATE",
    applyMode: "FORMAL_OWNER_STARTUP_ONLY",
    legacy,
    migration: state?.migration ?? null,
  });
}
await runMain(main, "PROFLOW_MONITOR_MIGRATE_LEGACY");
