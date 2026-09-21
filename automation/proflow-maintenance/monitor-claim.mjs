#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  createMonitorApiClient,
  currentProjection,
  findChatByShift,
  hasFlag,
  printJson,
  requiredArg,
  valueArg,
} from "./lib/monitor-api-client.mjs";

const workspace =
  valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace";
const shiftId = requiredArg("--shift-id");
if (!hasFlag("--authorities-read")) {
  printJson({
    contract: "proflow.monitor-claim.v1",
    status: "BLOCKED",
    reason: "MONITOR_BOOT_AUTHORITIES_NOT_ATTESTED",
    shiftId,
  });
  process.exit(3);
}

function runScript(path, args, timeoutMs = 30_000) {
  const result = spawnSync(process.execPath, [path, ...args], {
    cwd: workspace,
    encoding: "utf8",
    timeout: timeoutMs,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  if (result.error) return { ok: false, error: result.error.message, result };
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout).trim().split(/\r?\n/).at(-1);
    return { ok: false, error: detail || "MONITOR_HELPER_FAILED", result };
  }
  try {
    return { ok: true, value: JSON.parse(result.stdout.trim()), result };
  } catch {
    return { ok: false, error: "MONITOR_HELPER_RESULT_INVALID", result };
  }
}

function failureStatus(reason) {
  return /UNKNOWN|TRANSPORT|TIMEOUT/i.test(reason) ? "UNKNOWN" : "BLOCKED";
}

async function readTarget(client) {
  const [current, state] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  const target = findChatByShift(state, shiftId);
  return { current, state, target, projection: currentProjection(current, state) };
}

async function main() {
  const client = await createMonitorApiClient({ workspace });
  let truth = await readTarget(client);
  if (
    truth.projection.currentChatId === truth.target.chatId &&
    truth.projection.currentShiftId === shiftId &&
    truth.projection.mutationMode === "FULL"
  ) {
    printJson({
      contract: "proflow.monitor-claim.v1",
      status: "ALREADY_CLAIMED",
      shiftId,
      chatId: truth.target.chatId,
      current: truth.projection,
    });
    return;
  }

  const bootPath = join(
    workspace,
    "automation/proflow-maintenance/monitor-boot-proof.mjs",
  );
  let boot = runScript(bootPath, [
    "--workspace",
    workspace,
    "--shift-id",
    shiftId,
    "--authorities-read",
  ]);
  if (!boot.ok) {
    truth = await readTarget(client);
    if (!truth.target.chat.takeover?.bootProofAt) {
      printJson({
        contract: "proflow.monitor-claim.v1",
        status: failureStatus(boot.error),
        stage: "BOOT_PROOF",
        reason: boot.error,
        shiftId,
      });
      process.exit(failureStatus(boot.error) === "UNKNOWN" ? 2 : 3);
      return;
    }
    boot = { ok: true, value: { status: "RECONCILED_APPLIED" } };
  }

  const takeoverPath = join(
    workspace,
    "automation/proflow-maintenance/monitor-takeover.mjs",
  );
  let takeover = runScript(takeoverPath, [
    "--workspace",
    workspace,
    "--shift-id",
    shiftId,
  ]);
  truth = await readTarget(client);
  if (!takeover.ok) {
    if (
      truth.projection.currentChatId !== truth.target.chatId ||
      truth.projection.currentShiftId !== shiftId ||
      truth.projection.mutationMode !== "FULL"
    ) {
      printJson({
        contract: "proflow.monitor-claim.v1",
        status: failureStatus(takeover.error),
        stage: "TAKEOVER",
        reason: takeover.error,
        shiftId,
        boot: boot.value,
        current: truth.projection,
      });
      process.exit(failureStatus(takeover.error) === "UNKNOWN" ? 2 : 3);
      return;
    }
    takeover = { ok: true, value: { status: "RECONCILED_APPLIED" } };
  }

  if (
    truth.projection.currentChatId !== truth.target.chatId ||
    truth.projection.currentShiftId !== shiftId ||
    truth.projection.mutationMode !== "FULL"
  ) {
    printJson({
      contract: "proflow.monitor-claim.v1",
      status: "UNKNOWN",
      stage: "READBACK",
      reason: "MONITOR_CLAIM_READBACK_MISMATCH",
      shiftId,
      current: truth.projection,
    });
    process.exit(2);
    return;
  }

  printJson({
    contract: "proflow.monitor-claim.v1",
    status: "CLAIMED",
    shiftId,
    chatId: truth.target.chatId,
    boot: boot.value,
    takeover: takeover.value,
    current: truth.projection,
  });
}
main().catch((error) => {
  printJson({
    contract: "proflow.monitor-claim.v1",
    status: "UNKNOWN",
    reason: error instanceof Error ? error.message : "MONITOR_CLAIM_FAILED",
    shiftId,
  });
  process.exitCode = 2;
});
