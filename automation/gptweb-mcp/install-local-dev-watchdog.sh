#!/bin/zsh
set -eu

WATCHDOG_ID="LD-WD-003"
LABEL="com.proton.gptweb-mcp.local-dev-watchdog"
WORKSPACE_ROOT="${PROTON_WORKSPACE_ROOT:-/Users/agent/Desktop/proton-workspace}"
SOURCE_PLIST="$WORKSPACE_ROOT/automation/gptweb-mcp/launchagents/$LABEL.plist"
SOURCE_SCRIPT="$WORKSPACE_ROOT/automation/gptweb-mcp/local-dev-watchdog.sh"
SOURCE_KEY="$WORKSPACE_ROOT/tools/local-dev/.secrets/runtime-api.key"
TARGET_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
RUNTIME_DIR="$HOME/Library/Application Support/Proton/local-dev-watchdog"
TARGET_SCRIPT="$RUNTIME_DIR/local-dev-watchdog.sh"
TARGET_KEY="$RUNTIME_DIR/runtime-api.key"
DOMAIN="gui/$(/usr/bin/id -u)"
/usr/bin/plutil -lint "$SOURCE_PLIST" >/dev/null
/bin/mkdir -p "$HOME/Library/LaunchAgents" "$RUNTIME_DIR"
/usr/bin/install -m 0700 "$SOURCE_SCRIPT" "$TARGET_SCRIPT"
/usr/bin/install -m 0600 "$SOURCE_KEY" "$TARGET_KEY"
if /bin/launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then /bin/launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true; fi
/usr/bin/install -m 0644 "$SOURCE_PLIST" "$TARGET_PLIST"
/bin/launchctl bootstrap "$DOMAIN" "$TARGET_PLIST"
/bin/launchctl enable "$DOMAIN/$LABEL"
/bin/launchctl kickstart -k "$DOMAIN/$LABEL"
echo "LOCAL_DEV_WATCHDOG_INSTALL=PASS id=$WATCHDOG_ID label=$LABEL runtime=$RUNTIME_DIR"
