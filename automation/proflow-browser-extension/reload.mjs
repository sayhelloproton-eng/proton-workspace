#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { inspectBrowserExtensionArtifact } from "./lib/artifact-guard.mjs";

const CONTRACT = "proflow.browser-extension.detail-reload.v1";
const ID = "eehdadpmjffomabiedcjijiakconalab";
const DETAIL_URL = `chrome://extensions/?id=${ID}`;
const DETAIL_TITLE_SUFFIX = "ProFlow Execution Browser";
const ROOT = "/Users/agent/Desktop/proton-workspace";
const GROUP = join(ROOT, "tools/browser/playwright-controlled-group.py");
const NATIVE = fileURLToPath(new URL("./reload-native.swift", import.meta.url));

const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const real = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
};

const normalize = (value) => {
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
};

function registration(chrome, load) {
  const matches = [];
  for (const entry of readdirSync(chrome, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const json = JSON.parse(
        readFileSync(join(chrome, entry.name, "Secure Preferences"), "utf8"),
      );
      const registered = json?.extensions?.settings?.[ID];
      if (
        registered &&
        typeof registered.path === "string" &&
        real(registered.path) === real(load)
      )
        matches.push({ profile: entry.name, path: registered.path });
    } catch {}
  }
  if (matches.length !== 1)
    throw new Error(
      matches.length
        ? "BROWSER_EXTENSION_REGISTRATION_NOT_UNIQUE"
        : "BROWSER_EXTENSION_REGISTRATION_NOT_FOUND",
    );
  return matches[0];
}

function subprocess(command, args, { timeout = 30_000, input } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout,
    input,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  if (result.error) throw result.error;
  return result;
}

function groupAction(args, timeoutMs = 25_000) {
  const result = subprocess("python3", [GROUP, ...args], { timeout: timeoutMs });
  if (result.status !== 0)
    throw new Error(
      result.stderr.trim().split(/\r?\n/).at(-1) ||
        "CONTROLLED_GROUP_ACTION_FAILED",
    );
  const value = JSON.parse(result.stdout.trim());
  if (
    value?.contract !== "workspace.playwright-controlled-group.v1" ||
    !value?.result
  )
    throw new Error("CONTROLLED_GROUP_RESULT_INVALID");
  return value.result;
}

function closeDetailTab(tabId) {
  try {
    const closed = groupAction(
      [
        "close",
        "--target-tab-id",
        String(tabId),
        "--exact-url",
        DETAIL_URL,
      ],
      15_000,
    );
    return closed.status === "CLOSED" ? "PASS" : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function freshDetailTab() {
  const current = groupAction(["list"]);
  const existing = (current.tabs ?? []).filter(
    (tab) => normalize(tab.url) === normalize(DETAIL_URL),
  );
  let reconciledDetailTabs = 0;
  for (const tab of existing) {
    if (!Number.isInteger(tab?.tabId))
      throw new Error("EXTENSION_DETAIL_PAGE_TAB_INVALID");
    if (closeDetailTab(tab.tabId) !== "PASS")
      throw new Error("EXTENSION_DETAIL_PAGE_RECONCILE_UNKNOWN");
    reconciledDetailTabs += 1;
  }

  const opened = groupAction(["create", "--url", DETAIL_URL], 35_000);
  if (opened.status !== "READY" || !Number.isInteger(opened.tabId))
    throw new Error("EXTENSION_DETAIL_PAGE_NOT_READY");
  if (normalize(opened.url) !== normalize(DETAIL_URL))
    throw new Error("EXTENSION_DETAIL_PAGE_URL_MISMATCH");
  return { tabId: opened.tabId, reconciledDetailTabs };
}

function activateDetailTab(tabId) {
  const script = `
set previousBundle to ""
try
  tell application "System Events"
    set frontProcess to first application process whose frontmost is true
    set previousBundle to bundle identifier of frontProcess as text
  end tell
end try

tell application "Google Chrome"
  set targetCount to 0
  set targetWindowId to ""
  set previousTabId to ""
  set bx1 to 0
  set by1 to 0
  set bx2 to 0
  set by2 to 0

  repeat with w in windows
    set tabCount to count of tabs of w
    repeat with i from 1 to tabCount
      set t to tab i of w
      if (id of t as text) is "${tabId}" then
        if (URL of t as text) is not "${DETAIL_URL}" then error "EXTENSION_DETAIL_APPLESCRIPT_URL_MISMATCH"
        set targetCount to targetCount + 1
        set targetWindowId to id of w as text
        set previousTabId to id of active tab of w as text
        set b to bounds of w
        set bx1 to item 1 of b
        set by1 to item 2 of b
        set bx2 to item 3 of b
        set by2 to item 4 of b
        set active tab index of w to i
        set index of w to 1
      end if
    end repeat
  end repeat

  if targetCount is not 1 then error "EXTENSION_DETAIL_APPLESCRIPT_TARGET_COUNT:" & targetCount
  activate
  delay 0.25

  set verified to false
  set activeTitle to ""
  set activeUrl to ""
  repeat with w in windows
    if (id of w as text) is targetWindowId then
      if (id of active tab of w as text) is not "${tabId}" then error "EXTENSION_DETAIL_APPLESCRIPT_ACTIVE_TAB_MISMATCH"
      set activeUrl to URL of active tab of w as text
      if activeUrl is not "${DETAIL_URL}" then error "EXTENSION_DETAIL_APPLESCRIPT_ACTIVE_URL_MISMATCH"
      set activeTitle to title of active tab of w as text
      set verified to true
    end if
  end repeat
  if verified is not true then error "EXTENSION_DETAIL_APPLESCRIPT_WINDOW_MISSING"
end tell

tell application "System Events"
  if frontmost of process "Google Chrome" is not true then error "EXTENSION_DETAIL_CHROME_NOT_FRONTMOST"
end tell

return previousBundle & "|||" & targetWindowId & "|||" & previousTabId & "|||" & (bx1 as text) & "|||" & (by1 as text) & "|||" & (bx2 as text) & "|||" & (by2 as text) & "|||" & activeTitle & "|||" & activeUrl
`;
  const result = subprocess("/usr/bin/osascript", ["-e", script], {
    timeout: 10_000,
  });
  if (result.status !== 0)
    throw new Error(
      result.stderr.trim().split(/\r?\n/).at(-1) ||
        "EXTENSION_DETAIL_APPLESCRIPT_ACTIVATE_FAILED",
    );
  const parts = result.stdout.trim().split("|||");
  if (parts.length !== 9)
    throw new Error("EXTENSION_DETAIL_APPLESCRIPT_RESULT_INVALID");
  const [previousBundle, windowId, previousTabId, x1, y1, x2, y2, title, url] =
    parts;
  if (normalize(url) !== normalize(DETAIL_URL))
    throw new Error("EXTENSION_DETAIL_APPLESCRIPT_URL_READBACK_MISMATCH");
  if (!title.includes(DETAIL_TITLE_SUFFIX))
    throw new Error("EXTENSION_DETAIL_APPLESCRIPT_TITLE_MISMATCH");
  const bounds = [x1, y1, x2, y2].map(Number);
  if (bounds.some((value) => !Number.isFinite(value)))
    throw new Error("EXTENSION_DETAIL_APPLESCRIPT_BOUNDS_INVALID");
  return {
    previousBundle,
    windowId,
    previousTabId,
    bounds,
    title,
    url,
  };
}

function restoreForeground(state) {
  if (!state) return "NOT_NEEDED";
  const previousBundle = String(state.previousBundle ?? "");
  const previousWindowId = String(state.windowId ?? "");
  const previousTabId = String(state.previousTabId ?? "");
  const script = `
tell application "Google Chrome"
  repeat with w in windows
    if (id of w as text) is "${previousWindowId}" then
      set tabCount to count of tabs of w
      repeat with i from 1 to tabCount
        if (id of tab i of w as text) is "${previousTabId}" then
          set active tab index of w to i
        end if
      end repeat
    end if
  end repeat
end tell

set previousBundle to "${previousBundle}"
if previousBundle is not "" then
  try
    tell application id previousBundle to activate
  end try
end if
return "RESTORED"
`;
  const result = subprocess("/usr/bin/osascript", ["-e", script], {
    timeout: 10_000,
  });
  return result.status === 0 ? "PASS" : "UNKNOWN";
}

function nativeReload(tabId, workspace, timeoutMs) {
  const runtimeDir = join(workspace, "tools/browser/.runtime/native-eyes");
  mkdirSync(runtimeDir, { recursive: true });
  const screenshot = join(runtimeDir, "proflow-extension-reload-current.png");
  const activation = activateDetailTab(tabId);
  let restore = "UNKNOWN";
  try {
    const capture = subprocess(
      "/usr/sbin/screencapture",
      ["-x", "-m", screenshot],
      { timeout: 10_000 },
    );
    if (capture.status !== 0)
      throw new Error(
        capture.stderr.trim().split(/\r?\n/).at(-1) ||
          "EXTENSION_DETAIL_SCREENSHOT_FAILED",
      );

    const native = subprocess(
      "/usr/bin/swift",
      [
        NATIVE,
        "--screenshot",
        screenshot,
        "--window-bounds",
        activation.bounds.join(","),
      ],
      { timeout: timeoutMs + 20_000 },
    );
    if (native.status !== 0)
      throw new Error(
        native.stderr.trim().split(/\r?\n/).at(-1) ||
          "EXTENSION_NATIVE_RELOAD_FAILED",
      );
    const value = JSON.parse(native.stdout.trim());
    if (
      value?.contract !== "proflow.browser-extension.native-reload.v1" ||
      value?.status !== "DISPATCHED"
    )
      throw new Error("EXTENSION_NATIVE_RELOAD_RESULT_INVALID");
    return {
      ...value,
      screenshot,
      chromeWindowId: activation.windowId,
      detailTitle: activation.title,
    };
  } finally {
    restore = restoreForeground(activation);
    if (restore !== "PASS")
      console.error("BROWSER_EXTENSION_FOREGROUND_RESTORE=UNKNOWN");
  }
}

function selfTest() {
  assert.equal(ID, "eehdadpmjffomabiedcjijiakconalab");
  assert.equal(
    DETAIL_URL,
    "chrome://extensions/?id=eehdadpmjffomabiedcjijiakconalab",
  );
  assert.equal(DETAIL_TITLE_SUFFIX, "ProFlow Execution Browser");
  assert.equal(normalize(DETAIL_URL), DETAIL_URL);
  assert.equal(dirname(NATIVE), dirname(fileURLToPath(import.meta.url)));
  console.log("BROWSER_EXTENSION_DETAIL_RELOAD_SELF_TEST=PASS");
}

async function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  if (process.argv.includes("--extension-id"))
    throw new Error("BROWSER_EXTENSION_ID_IS_FIXED");

  const workspace = arg("--workspace", ROOT);
  const timeoutMs = Number(arg("--timeout-ms", "10000"));
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000)
    throw new Error("EXTENSION_RELOAD_TIMEOUT_INVALID");

  const artifact = await inspectBrowserExtensionArtifact({ workspace });
  if (artifact.status !== "READY") {
    console.log(
      JSON.stringify({
        contract: CONTRACT,
        status: "BLOCKED",
        reason: artifact.reason,
        artifact,
      }),
    );
    process.exitCode = 3;
    return;
  }

  const load = join(
    workspace,
    ".proflow",
    "deployment",
    "browser-extension",
    "execution-browser-extension",
  );
  const expected = String(
    JSON.parse(readFileSync(join(load, "manifest.json"), "utf8")).version || "",
  );
  if (!expected) throw new Error("WORKSPACE_EXTENSION_VERSION_MISSING");

  registration(
    join(homedir(), "Library", "Application Support", "Google", "Chrome"),
    load,
  );

  const { tabId, reconciledDetailTabs } = freshDetailTab();
  let cleanup = "UNKNOWN";
  try {
    const dispatched = nativeReload(tabId, workspace, timeoutMs);
    console.log(
      JSON.stringify({
        contract: CONTRACT,
        status: "DISPATCHED",
        extensionId: ID,
        detailUrl: DETAIL_URL,
        expectedVersion: expected,
        tabId,
        reconciledDetailTabs,
        native: dispatched,
      }),
    );
  } finally {
    cleanup = closeDetailTab(tabId);
    if (cleanup !== "PASS")
      console.error("BROWSER_EXTENSION_DETAIL_TAB_CLEANUP=UNKNOWN");
  }
}

main().catch((error) => {
  console.error(
    `BROWSER_EXTENSION_DETAIL_RELOAD=FAIL ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
