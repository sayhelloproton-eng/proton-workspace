#!/usr/bin/env node
import { resolveMonitorContext } from "./lib/monitor-context.mjs";
import { printJson, runMain, valueArg } from "./lib/monitor-api-client.mjs";

async function main() {
  const context = await resolveMonitorContext(
    valueArg("--workspace") ?? "/Users/agent/Desktop/proton-workspace",
  );
  printJson({
    contract: "proflow.monitor-context-manifest.v1",
    status: "READY",
    workspace: context.workspace,
    owners: {
      engineering: [context.engineeringSkill, context.acceptanceSkill],
      project: {
        fixed: context.projectPaths,
        required: context.requiredAbsolute,
      },
      chatLoop: context.chatLoopPaths,
      runtime: {
        current:
          "/Users/agent/Desktop/proton-workspace/automation/proflow-maintenance/monitor-current.mjs",
        state:
          "/Users/agent/Desktop/proton-workspace/automation/proflow-maintenance/monitor-state.mjs",
      },
    },
    readOrder: context.readOrder,
  });
}
await runMain(main, "PROFLOW_MONITOR_CONTEXT_MANIFEST");
