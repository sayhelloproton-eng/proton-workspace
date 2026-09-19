#!/bin/zsh
set -eu

WORKSPACE_ROOT="${PROTON_WORKSPACE_ROOT:-/Users/agent/Desktop/proton-workspace}"
TC="${TUNNEL_CLIENT_BIN:-/usr/local/bin/tunnel-client}"
PROFILE_DIR="$WORKSPACE_ROOT/automation/gptweb-mcp/.runtime/profiles"
KEY="${GPTWEB_MCP_RUNTIME_KEY:-$WORKSPACE_ROOT/tools/local-dev/.secrets/runtime-api.key}"
HEALTH_DIR="$HOME/Library/Application Support/tunnel-client/health"
TUNNEL_ID="tunnel_6a842e202c488191b23a1a164602f7a3"
LOCAL_DEV_NPX="${LOCAL_DEV_NPX:-/Users/agent/.nvm/versions/node/v24.19.0/bin/npx}"

runtime_ready() {
  local url_file="$HEALTH_DIR/local-dev.url"
  local base
  [[ -r "$url_file" ]] || return 1
  base="$(<"$url_file")"
  [[ -n "$base" ]] || return 1
  /usr/bin/curl --noproxy "*" -fsS --max-time 1 "$base/readyz" 2>/dev/null | grep -qx 'ready'
}

start_service() {
  if runtime_ready; then
    echo "Local Dev: already running"
    return 0
  fi
  mkdir -p "$PROFILE_DIR"
  echo "Local Dev: starting..."
  "$TC" runtimes connect \
    --alias local-dev \
    --profile local-dev \
    --profile-dir "$PROFILE_DIR" \
    --tunnel-id "$TUNNEL_ID" \
    --runtime-api-key "file:$KEY" \
    --mcp-command "$LOCAL_DEV_NPX -y @wonderwhy-er/desktop-commander@0.2.44"
}

stop_service() {
  "$TC" runtimes stop local-dev 2>/dev/null || true
}

status_service() {
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
