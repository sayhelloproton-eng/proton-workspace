#!/bin/zsh
set -eu

WORKSPACE_ROOT="${PROTON_WORKSPACE_ROOT:-/Users/agent/Desktop/proton-workspace}"
TC="${TUNNEL_CLIENT_BIN:-/usr/local/bin/tunnel-client}"
PROFILE_DIR="$WORKSPACE_ROOT/automation/gptweb-mcp/.runtime/profiles"
KEY="${GPTWEB_MCP_RUNTIME_KEY:-$WORKSPACE_ROOT/tools/browser/.secrets/runtime-api.key}"
HEALTH_DIR="$HOME/Library/Application Support/tunnel-client/health"
TUNNEL_ID="tunnel_6a87d86124c48191bf21aa52c93005be"
BROKER_LAUNCHER="$WORKSPACE_ROOT/tools/browser/playwright-chrome-broker.sh"

runtime_ready() {
  local url_file="$HEALTH_DIR/playwright-chrome.url"
  local base
  [[ -r "$url_file" ]] || return 1
  base="$(<"$url_file")"
  [[ -n "$base" ]] || return 1
  /usr/bin/curl --noproxy "*" -fsS --max-time 1 "$base/readyz" 2>/dev/null | grep -qx 'ready'
}

start_service() {
  if runtime_ready; then
    echo "Playwright Chrome: already running"
    return 0
  fi
  mkdir -p "$PROFILE_DIR"
  echo "Playwright Chrome: starting..."
  "$TC" runtimes connect \
    --alias playwright-chrome \
    --profile playwright-chrome \
    --profile-dir "$PROFILE_DIR" \
    --tunnel-id "$TUNNEL_ID" \
    --runtime-api-key "file:$KEY" \
    --mcp-command "/bin/zsh $BROKER_LAUNCHER"
}

stop_service() {
  "$TC" runtimes stop playwright-chrome 2>/dev/null || true
}

status_service() {
  "$TC" runtimes status playwright-chrome --json 2>/dev/null || true
  runtime_ready
}

case "${1:-status}" in
  start) start_service ;;
  stop) stop_service ;;
  health) runtime_ready ;;
  status) status_service ;;
  *) echo "Usage: gptweb-mcp-service.sh [start|stop|health|status]" >&2; exit 2 ;;
esac
