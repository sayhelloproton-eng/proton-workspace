#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const target = resolve(
  new URL("../proflow-maintenance/monitor-boot-proof.mjs", import.meta.url).pathname,
);
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], {
  stdio: "inherit",
});
if (result.error) {
  console.error(`PROFLOW_MONITOR_BOOT_PROOF=FAIL ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
