import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveBrokerConfiguration } from "../dist/config.js";

const base = {
  MCP_BROKER_ID: "local-dev",
  MCP_BROKER_URL_FILE: "/tmp/local-dev-mcp.url",
  MCP_BROKER_UPSTREAM_COMMAND: "npx",
};

test("manager stdio defaults on and can be disabled for HTTP-only sidecar lifecycle", () => {
  assert.equal(resolveBrokerConfiguration(base).managerStdio, true);
  assert.equal(
    resolveBrokerConfiguration({ ...base, MCP_BROKER_MANAGER_STDIO: "false" }).managerStdio,
    false,
  );
  assert.throws(
    () => resolveBrokerConfiguration({ ...base, MCP_BROKER_MANAGER_STDIO: "maybe" }),
    /MCP_BROKER_MANAGER_STDIO must be true or false/,
  );
});
