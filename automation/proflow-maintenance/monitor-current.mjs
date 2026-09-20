#!/usr/bin/env node
import {
  createMonitorApiClient,
  currentProjection,
  hasFlag,
  printJson,
  runMain,
  valueArg,
} from "./lib/monitor-api-client.mjs";

async function main() {
  const client = await createMonitorApiClient({ workspace: valueArg("--workspace") ?? undefined });
  const [current, state] = await Promise.all([
    client.invoke("current.read"),
    client.invoke("state.read"),
  ]);
  const projection = currentProjection(current, state);
  const expectShiftId = valueArg("--expect-shift-id");
  const requireMutation = valueArg("--require-mutation");
  const allowHandoffOnly = hasFlag("--allow-handoff-only");

  let status = "OK";
  if (expectShiftId && projection.currentShiftId !== expectShiftId) {
    const candidate = Object.entries(state?.chats ?? {}).find(
      ([, chat]) =>
        chat?.shiftId === expectShiftId &&
        chat?.takeover?.abandonedAt === null,
    );
    status = candidate ? "NOT_CURRENT_YET" : "SHIFT_NOT_FOUND";
  }
  if (requireMutation) {
    const accepted =
      projection.mutationMode === requireMutation ||
      (allowHandoffOnly &&
        requireMutation === "FULL" &&
        projection.mutationMode === "HANDOFF_ONLY");
    if (!accepted) throw new Error("MONITOR_MUTATION_MODE_MISMATCH");
  }

  printJson({
    contract: "proflow.monitor-current-cli.v1",
    status,
    ...projection,
  });
  if (status !== "OK") process.exitCode = 2;
}
await runMain(main, "PROFLOW_MONITOR_CURRENT");
