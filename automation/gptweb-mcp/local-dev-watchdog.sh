#!/bin/zsh
set -eu

WATCHDOG_ID="LD-WD-003"
RUNTIME_DIR="$HOME/Library/Application Support/Proton/local-dev-watchdog"
HEALTH_FILE="$HOME/Library/Application Support/tunnel-client/health/local-dev.url"
STATE_FILE="$RUNTIME_DIR/backoff.state"
SUSPECT_FILE="$RUNTIME_DIR/unhealthy.state"
EVENT_LOG="$RUNTIME_DIR/events.log"
LOCK_DIR="$RUNTIME_DIR/run.lock"
PROFILE_DIR="$RUNTIME_DIR/profiles"
KEY="$RUNTIME_DIR/runtime-api.key"
TC="/usr/local/bin/tunnel-client"
NPX="/Users/agent/.nvm/versions/node/v24.19.0/bin/npx"
TUNNEL_ID="tunnel_6a842e202c488191b23a1a164602f7a3"
BACKOFF_MAX_SECONDS=300
mkdir -p "$RUNTIME_DIR" "$PROFILE_DIR"
runtime_ready() {
  local base
  [[ -r "$HEALTH_FILE" ]] || return 1
  base="$(<"$HEALTH_FILE")"
  [[ -n "$base" ]] || return 1
  /usr/bin/curl --noproxy "*" -fsS --max-time 2 "$base/readyz" 2>/dev/null | /usr/bin/grep -qx 'ready'
}
read_state() {
  local failures=0 next_at=0 state
  if [[ -r "$STATE_FILE" ]]; then
    state="$(<"$STATE_FILE")"; failures="${state%% *}"; next_at="${state##* }"
    [[ "$failures" == <-> ]] || failures=0; [[ "$next_at" == <-> ]] || next_at=0
  fi
  print -r -- "$failures $next_at"
}
write_state() { printf '%s %s\n' "$1" "$2" > "${STATE_FILE}.tmp.$$"; /bin/mv "${STATE_FILE}.tmp.$$" "$STATE_FILE"; }
event() { printf '%s %s\n' "$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$EVENT_LOG"; }
if runtime_ready; then /bin/rm -f "$STATE_FILE" "$SUSPECT_FILE"; echo "LOCAL_DEV_WATCHDOG id=$WATCHDOG_ID state=READY"; exit 0; fi
if ! /bin/mkdir "$LOCK_DIR" 2>/dev/null; then echo "LOCAL_DEV_WATCHDOG id=$WATCHDOG_ID state=LOCKED"; exit 0; fi
trap '/bin/rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT HUP INT TERM
now="$(/bin/date +%s)"
if [[ ! -r "$SUSPECT_FILE" ]]; then printf '%s\n' "$now" > "$SUSPECT_FILE"; event "id=$WATCHDOG_ID state=SUSPECT first=$now"; echo "LOCAL_DEV_WATCHDOG id=$WATCHDOG_ID state=SUSPECT"; exit 0; fi
first_unhealthy="$(<"$SUSPECT_FILE")"; [[ "$first_unhealthy" == <-> ]] || first_unhealthy="$now"
if (( now - first_unhealthy < 20 )); then event "id=$WATCHDOG_ID state=CONFIRMING age=$((now-first_unhealthy))"; echo "LOCAL_DEV_WATCHDOG id=$WATCHDOG_ID state=CONFIRMING"; exit 0; fi
state="$(read_state)"; failures="${state%% *}"; next_at="${state##* }"
if (( now < next_at )); then echo "LOCAL_DEV_WATCHDOG id=$WATCHDOG_ID state=BACKOFF failures=$failures next=$next_at"; exit 0; fi
event "id=$WATCHDOG_ID state=RECOVERING unhealthyFor=$((now-first_unhealthy))"
echo "LOCAL_DEV_WATCHDOG id=$WATCHDOG_ID state=RECOVERING"
"$TC" runtimes stop local-dev >/dev/null 2>&1 || true
/bin/sleep 1
if "$TC" runtimes connect --alias local-dev --profile local-dev --profile-dir "$PROFILE_DIR" --tunnel-id "$TUNNEL_ID" --runtime-api-key "file:$KEY" --mcp-command "$NPX -y @wonderwhy-er/desktop-commander@0.2.44"; then
  /bin/sleep 2
  if runtime_ready; then /bin/rm -f "$STATE_FILE" "$SUSPECT_FILE"; event "id=$WATCHDOG_ID state=RECOVERED"; echo "LOCAL_DEV_WATCHDOG id=$WATCHDOG_ID state=RECOVERED"; exit 0; fi
fi
failures=$(( failures + 1 )); if (( failures >= 6 )); then delay=$BACKOFF_MAX_SECONDS; else delay=$((15 * (2 ** (failures - 1)))); (( delay > BACKOFF_MAX_SECONDS )) && delay=$BACKOFF_MAX_SECONDS; fi
write_state "$failures" "$((now + delay))"
event "id=$WATCHDOG_ID state=RECOVERY_FAILED failures=$failures retryIn=${delay}s"
echo "LOCAL_DEV_WATCHDOG id=$WATCHDOG_ID state=RECOVERY_FAILED failures=$failures retryIn=${delay}s" >&2
exit 0
