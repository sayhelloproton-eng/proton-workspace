#!/usr/bin/env node
console.error(
  "PROFLOW_MONITOR_INITIAL_SEED=FAIL MONITOR_INITIAL_SEED_RETIRED_USE_MAINTENANCE_BOOTSTRAP",
);
console.error(
  "Use: node automation/proflow-maintenance/monitor-injection.mjs bootstrap --initial --shift-id <id> --text-file <fresh-bootstrap-context>",
);
process.exit(2);
