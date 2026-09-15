#!/bin/zsh
set -eu

url="${@: -1}"
case "$url" in
  chrome-extension://mmlmfjhmonkocbjadbfplnigmagldckm/connect.html?*) ;;
  *) exit 64 ;;
esac

/usr/bin/osascript - "$url" <<'APPLESCRIPT'
on run argv
  set targetUrl to item 1 of argv
  tell application "Google Chrome"
    activate
    if (count of windows) = 0 then make new window
    tell front window to make new tab with properties {URL:targetUrl}
  end tell
end run
APPLESCRIPT
