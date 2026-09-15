#!/bin/zsh
set -eu

WORKSPACE_ROOT="${PROTON_WORKSPACE_ROOT:-/Users/agent/Desktop/proton-workspace}"
TC="${TUNNEL_CLIENT_BIN:-/usr/local/bin/tunnel-client}"
PROFILE_DIR="$WORKSPACE_ROOT/automation/gptweb-mcp/.runtime/profiles"
SECRETS_DIR="$WORKSPACE_ROOT/tools/local-dev/.secrets"
KEY="${GPTWEB_MCP_RUNTIME_KEY:-$SECRETS_DIR/runtime-api.key}"
CONTROLLER_TOKEN_FILE="$SECRETS_DIR/controller.token"
BROKER_NODE="${BROKER_NODE:-/Users/agent/.nvm/versions/node/v20.20.1/bin/node}"
BROKER_SERVER="$WORKSPACE_ROOT/tools/mcp-shared-broker/dist/server.js"
UPSTREAM_NPX="${LOCAL_DEV_NPX:-/Users/agent/.nvm/versions/node/v24.19.0/bin/npx}"
HEALTH_DIR="$HOME/Library/Application Support/tunnel-client/health"
ENDPOINT_DIR="$HOME/Library/Application Support/tunnel-client/mcp-endpoints"
AUTHORITY_DIR="$HOME/Library/Application Support/tunnel-client/mcp-authority"
LOG_DIR="$WORKSPACE_ROOT/tools/local-dev/.runtime/logs"
TUNNEL_ID="tunnel_6a842e202c488191b23a1a164602f7a3"
BROKER_URL_FILE="$ENDPOINT_DIR/local-dev.url"
BROKER_PID_FILE="$AUTHORITY_DIR/local-dev-broker.pid"
BROKER_LOG="$LOG_DIR/local-dev-broker.log"
STATE_FILE="$AUTHORITY_DIR/local-dev-state.json"

runtime_ready() {
  local url_file="$HEALTH_DIR/local-dev.url"
  local base
  [[ -r "$url_file" ]] || return 1
  base="$(<"$url_file")"
  [[ -n "$base" ]] || return 1
  /usr/bin/curl --noproxy "*" -fsS --max-time 1 "$base/readyz" 2>/dev/null | grep -qx 'ready'
}

broker_endpoint() {
  [[ -r "$BROKER_URL_FILE" ]] || return 1
  local endpoint
  endpoint="$(<"$BROKER_URL_FILE")"
  [[ -n "$endpoint" ]] || return 1
  print -r -- "$endpoint"
}

broker_live() {
  local endpoint base
  endpoint="$(broker_endpoint 2>/dev/null)" || return 1
  base="${endpoint%/mcp}"
  /usr/bin/curl --noproxy "*" -fsS --max-time 1 "$base/healthz" 2>/dev/null | grep -qx 'live'
}

broker_ready() {
  local endpoint base
  endpoint="$(broker_endpoint 2>/dev/null)" || return 1
  base="${endpoint%/mcp}"
  /usr/bin/curl --noproxy "*" -fsS --max-time 1 "$base/readyz" 2>/dev/null | grep -qx 'ready'
}

prepare_broker_state() {
  mkdir -p "$SECRETS_DIR" "$ENDPOINT_DIR" "$AUTHORITY_DIR" "$LOG_DIR"
  chmod 700 "$SECRETS_DIR" "$AUTHORITY_DIR"
  if [[ ! -f "$CONTROLLER_TOKEN_FILE" ]]; then
    umask 077
    "$BROKER_NODE" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url") + "\n")' > "$CONTROLLER_TOKEN_FILE"
  fi
  chmod 600 "$CONTROLLER_TOKEN_FILE"
  if [[ ! -f "$STATE_FILE" ]]; then
    umask 077
    printf '%s\n' '{"contract":"mcp-broker-authority-state-file.v2","state":"OPEN","generation":0}' > "$STATE_FILE"
  fi
  chmod 600 "$STATE_FILE"
}

start_broker() {
  prepare_broker_state
  if broker_live; then
    echo "Local Dev Broker v2: already running"
    return 0
  fi
  if [[ -r "$BROKER_PID_FILE" ]]; then
    local existing_pid
    existing_pid="$(<"$BROKER_PID_FILE")"
    if [[ "$existing_pid" == <-> ]] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "Local Dev Broker process exists but endpoint is unavailable; preserving owner" >&2
      return 1
    fi
  fi
  rm -f "$BROKER_PID_FILE" "$BROKER_URL_FILE"
  echo "Local Dev Broker v2: starting..."
  /usr/bin/nohup /usr/bin/env -u MCP_BROKER_AUTHORITY_EFFECTFUL_TOOLS_JSON \
    MCP_BROKER_ID="local-dev" \
    MCP_BROKER_URL_FILE="$BROKER_URL_FILE" \
    MCP_BROKER_MANAGER_STDIO="false" \
    MCP_BROKER_UPSTREAM_COMMAND="$UPSTREAM_NPX" \
    MCP_BROKER_UPSTREAM_ARGS_JSON='["-y","@wonderwhy-er/desktop-commander@0.2.44"]' \
    MCP_BROKER_UPSTREAM_CLIENT_NAME="Local Dev" \
    MCP_BROKER_UPSTREAM_ENV_PASSTHROUGH="HOME,PATH,USER" \
    MCP_BROKER_AUTHORITY_CONTROLLER_TOKEN_FILE="$CONTROLLER_TOKEN_FILE" \
    MCP_BROKER_AUTHORITY_STATE_FILE="$STATE_FILE" \
    MCP_BROKER_AUTHORITY_READ_ONLY_TOOLS_JSON='["get_config","read_file","read_multiple_files","list_directory","start_search","get_more_search_results","stop_search","list_searches","get_file_info","read_process_output","list_sessions","list_processes","get_usage_stats","get_recent_tool_calls"]' \
    MCP_BROKER_AUTHORITY_LEASE_TTL_MS="18000000" \
    "$BROKER_NODE" "$BROKER_SERVER" >>"$BROKER_LOG" 2>&1 </dev/null &
  echo $! > "$BROKER_PID_FILE"
  local i
  for i in {1..150}; do
    if broker_live; then
      echo "Local Dev Broker v2: live"
      return 0
    fi
    sleep 0.1
  done
  echo "Local Dev Broker v2 failed to become live" >&2
  return 1
}

stop_broker() {
  if [[ -r "$BROKER_PID_FILE" ]]; then
    local pid
    pid="$(<"$BROKER_PID_FILE")"
    if [[ "$pid" == <-> ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      local i
      for i in {1..30}; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.1
      done
    fi
  fi
  rm -f "$BROKER_PID_FILE" "$BROKER_URL_FILE"
}

start_service() {
  start_broker
  if runtime_ready; then
    echo "Local Dev: already running"
    return 0
  fi
  local endpoint
  endpoint="$(broker_endpoint)"
  mkdir -p "$PROFILE_DIR"
  echo "Local Dev: starting through Broker v2..."
  "$TC" runtimes connect \
    --alias local-dev \
    --profile local-dev \
    --profile-dir "$PROFILE_DIR" \
    --tunnel-id "$TUNNEL_ID" \
    --runtime-api-key "file:$KEY" \
    --mcp-server-url "$endpoint"
}

stop_service() {
  "$TC" runtimes stop local-dev 2>/dev/null || true
  stop_broker
}

status_service() {
  if broker_live; then
    echo "BROKER=LIVE"
    broker_ready && echo "BROKER_UPSTREAM=READY" || echo "BROKER_UPSTREAM=NOT_READY"
  else
    echo "BROKER=DOWN"
  fi
  "$TC" runtimes status local-dev --json 2>/dev/null || true
  runtime_ready
}

case "${1:-status}" in
  start) start_service ;;
  stop) stop_service ;;
  health) runtime_ready ;;
  status) status_service ;;
  *) echo "Usage: gptweb-mcp-service.sh [start|stop|health|status]" >&2; exit 2 ;;
esac
