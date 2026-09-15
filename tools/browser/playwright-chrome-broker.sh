#!/bin/zsh
set -eu

WORKSPACE_ROOT="${PROTON_WORKSPACE_ROOT:-/Users/agent/Desktop/proton-workspace}"
BROKER_NODE="${BROKER_NODE:-/Users/agent/.nvm/versions/node/v20.20.1/bin/node}"
BROKER_SERVER="$WORKSPACE_ROOT/tools/mcp-shared-broker/dist/server.js"
ENDPOINT_DIR="$HOME/Library/Application Support/tunnel-client/mcp-endpoints"
PLAYWRIGHT_OUTPUT_DIR="$WORKSPACE_ROOT/tools/browser/.runtime/playwright-mcp"
PLAYWRIGHT_MCP_BIN="${PLAYWRIGHT_MCP_BIN:-/Users/agent/.npm/_npx/9833c18b2d85bc59/node_modules/.bin/playwright-mcp}"

mkdir -p "$ENDPOINT_DIR" "$PLAYWRIGHT_OUTPUT_DIR"
cd "$PLAYWRIGHT_OUTPUT_DIR"

export MCP_BROKER_ID="playwright-chrome"
export MCP_BROKER_URL_FILE="$ENDPOINT_DIR/playwright-chrome.url"
export MCP_BROKER_UPSTREAM_COMMAND="$PLAYWRIGHT_MCP_BIN"
export MCP_BROKER_UPSTREAM_ARGS_JSON="[\"--cdp-endpoint\",\"chrome\",\"--output-dir\",\"$PLAYWRIGHT_OUTPUT_DIR\"]"
export MCP_BROKER_UPSTREAM_CLIENT_NAME="Playwright MCP"
unset MCP_BROKER_UPSTREAM_ENV_PASSTHROUGH

exec "$BROKER_NODE" "$BROKER_SERVER"
