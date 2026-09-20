import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("automation/dev-tunnel/cli.mjs");

test("Dev Tunnel auth query has its own 90s timeout while normal commands stay at 30s", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;/);
  assert.match(source, /const AUTH_QUERY_TIMEOUT_MS = 90_000;/);
  assert.match(
    source,
    /run\(\['user', 'show', '--json'\], AUTH_QUERY_TIMEOUT_MS\)/,
  );
  assert.match(
    source,
    /const run = \(argv, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS\)/,
  );
});

test("Dev Tunnel read-only control-plane queries use the 180s remote-query budget", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /const REMOTE_QUERY_TIMEOUT_MS = 180_000;/);
  assert.match(
    source,
    /run\(\['show', tunnel, '--json'\], REMOTE_QUERY_TIMEOUT_MS\)/,
  );
  assert.match(
    source,
    /run\(\['port', 'list', tunnel, '--json'\], REMOTE_QUERY_TIMEOUT_MS\)/,
  );
  assert.match(source, /const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;/);
});
