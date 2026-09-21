#!/usr/bin/env python3
"""Deterministic Chrome controlled-tab-group actions for canonical Playwright MCP.

Stable group mechanics live here. Chat/Acceptance that already owns a canonical
Playwright session MUST prepare an action file and execute it through that existing
session; it must not open a second MCP session merely to adopt an existing business tab.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any
from uuid import uuid4

DEFAULT_ENDPOINT_FILE = (
    Path.home()
    / "Library/Application Support/tunnel-client/mcp-endpoints/playwright-chrome.url"
)
DEFAULT_PROTOCOL_VERSION = "2025-03-26"
EXTENSION_CONNECT_PREFIX = (
    "chrome-extension://mmlmfjhmonkocbjadbfplnigmagldckm/connect.html"
)
DEFAULT_GROUP_TITLE = "Playwright · Playwright MCP"
DEFAULT_GROUP_COLOR = "green"
ACTION_RUNTIME_DIR = Path(__file__).with_name(".runtime") / "controlled-group-actions"
SUPPORTED_ACTIONS = {
    "ensure",
    "list",
    "adopt",
    "create",
    "duplicate",
    "close",
    "click-button",
}


class ControlledGroupError(RuntimeError):
    pass


def fail(message: str, code: int = 2) -> None:
    print(f"PLAYWRIGHT_CONTROLLED_GROUP=FAIL error={message}", file=sys.stderr)
    raise SystemExit(code)


def load_endpoint(path: Path) -> str:
    try:
        endpoint = path.expanduser().resolve().read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise ControlledGroupError(
            f"endpoint file unreadable: {exc.strerror or exc}"
        ) from exc
    parsed = urllib.parse.urlsplit(endpoint)
    if (
        parsed.scheme != "http"
        or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
        or parsed.path != "/mcp"
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise ControlledGroupError("canonical endpoint must be loopback HTTP /mcp")
    return endpoint


def decode_jsonrpc(raw: bytes, content_type: str, expected_id: int) -> dict[str, Any]:
    text = raw.decode("utf-8", errors="replace").strip()
    if not text:
        raise ControlledGroupError("empty MCP response")
    candidates: list[object] = []
    if "text/event-stream" in content_type:
        for line in text.splitlines():
            if not line.startswith("data:"):
                continue
            item = line[5:].strip()
            if not item or item == "[DONE]":
                continue
            try:
                candidates.append(json.loads(item))
            except json.JSONDecodeError:
                continue
    else:
        try:
            candidates.append(json.loads(text))
        except json.JSONDecodeError as exc:
            raise ControlledGroupError("MCP response is not valid JSON") from exc
    for candidate in candidates:
        if isinstance(candidate, dict) and candidate.get("id") == expected_id:
            return candidate
    raise ControlledGroupError(f"MCP response missing id={expected_id}")


def post_json(
    endpoint: str,
    payload: dict[str, Any],
    timeout: float,
    *,
    session_id: str | None = None,
    protocol_version: str | None = None,
    expected_id: int | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    headers = {
        "accept": "application/json, text/event-stream",
        "content-type": "application/json",
    }
    if session_id:
        headers["mcp-session-id"] = session_id
    if protocol_version:
        headers["mcp-protocol-version"] = protocol_version
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            returned_session = response.headers.get("mcp-session-id")
            if expected_id is None:
                return None, returned_session
            return (
                decode_jsonrpc(
                    raw,
                    response.headers.get("content-type", ""),
                    expected_id,
                ),
                returned_session,
            )
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace").strip().replace("\n", " ")
        raise ControlledGroupError(
            f"HTTP {exc.code}: {detail[:240] or exc.reason}"
        ) from exc
    except urllib.error.URLError as exc:
        raise ControlledGroupError(f"transport error: {exc.reason}") from exc
    except TimeoutError as exc:
        raise ControlledGroupError("MCP request timed out") from exc


def close_session(endpoint: str, session_id: str, protocol_version: str) -> bool:
    request = urllib.request.Request(
        endpoint,
        headers={
            "accept": "application/json, text/event-stream",
            "mcp-session-id": session_id,
            "mcp-protocol-version": protocol_version,
        },
        method="DELETE",
    )
    try:
        with urllib.request.urlopen(request, timeout=2) as response:
            response.read()
            return 200 <= response.status < 300
    except (OSError, urllib.error.URLError):
        return False


def tool_text(message: dict[str, Any]) -> str:
    result = message.get("result")
    if not isinstance(result, dict):
        raise ControlledGroupError("browser tool result missing")
    content = result.get("content")
    parts: list[str] = []
    if isinstance(content, list):
        for item in content:
            if (
                isinstance(item, dict)
                and item.get("type") == "text"
                and isinstance(item.get("text"), str)
            ):
                parts.append(item["text"])
    joined = "\n".join(parts)
    if result.get("isError") is True:
        raise ControlledGroupError(joined.strip() or "browser tool rejected action")
    if not joined.strip():
        raise ControlledGroupError("browser tool result empty")
    return joined


def parse_result_text(text: str) -> dict[str, Any]:
    match = re.search(r"### Result\s*\n(\{.*?\})\s*\n### ", text, flags=re.DOTALL)
    raw = match.group(1) if match else text.strip()
    if not (raw.startswith("{") and raw.endswith("}")):
        raise ControlledGroupError("browser result JSON missing")
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ControlledGroupError("browser result JSON invalid") from exc
    if not isinstance(value, dict):
        raise ControlledGroupError("browser result must be an object")
    return value


def run_code(
    endpoint: str,
    timeout: float,
    code: str,
    *,
    client_name: str = "workspace-playwright-controlled-group",
    unsafe: bool = False,
) -> tuple[dict[str, Any], bool]:
    initialize = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": DEFAULT_PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": {"name": client_name, "version": "1.0"},
        },
    }
    message, session_id = post_json(endpoint, initialize, timeout, expected_id=1)
    if not session_id or not isinstance(message, dict) or "error" in message:
        raise ControlledGroupError("initialize failed")
    result = message.get("result")
    protocol_version = (
        result.get("protocolVersion")
        if isinstance(result, dict) and isinstance(result.get("protocolVersion"), str)
        else DEFAULT_PROTOCOL_VERSION
    )
    try:
        post_json(
            endpoint,
            {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}},
            timeout,
            session_id=session_id,
            protocol_version=protocol_version,
        )
        tool_message, _ = post_json(
            endpoint,
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "browser_run_code_unsafe" if unsafe else "browser_run_code",
                    "arguments": {"code": code},
                },
            },
            timeout,
            session_id=session_id,
            protocol_version=protocol_version,
            expected_id=2,
        )
        if not isinstance(tool_message, dict) or "error" in tool_message:
            raise ControlledGroupError("browser_run_code failed")
        value = parse_result_text(tool_text(tool_message))
        cleanup_ok = close_session(endpoint, session_id, protocol_version)
        return value, cleanup_ok
    except Exception:
        close_session(endpoint, session_id, protocol_version)
        raise


def build_group_code(action: str, selector: dict[str, object]) -> str:
    payload = {
        **selector,
        "action": action,
        "connectPrefix": EXTENSION_CONNECT_PREFIX,
        "defaultTitle": DEFAULT_GROUP_TITLE,
        "defaultColor": DEFAULT_GROUP_COLOR,
    }
    return f"""async (page) => {{
  const args = {json.dumps(payload, separators=(",", ":"))};
  const context = page.context();
  const normalize = (value) => {{
    try {{ return new URL(value).href; }} catch {{ return null; }}
  }};
  const connectPages = context.pages().filter(
    p => p.url().startsWith(args.connectPrefix)
  );
  if (connectPages.length !== 1)
    throw new Error(`CONTROLLED_CONNECT_PAGE_COUNT:${{connectPages.length}}`);

  const adopted = await connectPages[0].evaluate(async (args) => {{
    const normalize = (value) => {{
      try {{ return new URL(value).href; }} catch {{ return null; }}
    }};
    const summarizeTab = (tab) => ({{
      tabId: tab.id,
      windowId: tab.windowId,
      groupId: tab.groupId,
      url: tab.url ?? null,
      title: tab.title ?? null,
      active: tab.active === true,
      status: tab.status ?? null
    }});
    const wait = (milliseconds) =>
      new Promise(resolve => setTimeout(resolve, milliseconds));

    let self = await chrome.tabs.getCurrent();
    if (!self || !Number.isInteger(self.id) || !Number.isInteger(self.windowId))
      throw new Error('CONTROLLED_CONNECT_TAB_INVALID');

    const ensureGroup = async () => {{
      let groupId = Number.isInteger(self.groupId) ? self.groupId : -1;
      if (groupId < 0) {{
        groupId = await chrome.tabs.group({{
          tabIds: [self.id],
          createProperties: {{windowId: self.windowId}}
        }});
        await chrome.tabGroups.update(groupId, {{
          title: args.defaultTitle,
          color: args.defaultColor,
          collapsed: false
        }});
      }}
      const group = await chrome.tabGroups.get(groupId);
      const readback = await chrome.tabs.get(self.id);
      if (readback.groupId !== groupId)
        throw new Error('CONTROLLED_GROUP_CONNECT_READBACK_MISMATCH');
      self = readback;
      return {{groupId, group}};
    }};

    const {{groupId}} = await ensureGroup();

    const groupResult = async () => {{
      const group = await chrome.tabGroups.get(groupId);
      const tabs = await chrome.tabs.query({{groupId}});
      return {{
        status: 'READY',
        groupId,
        windowId: group.windowId,
        title: group.title ?? '',
        color: group.color ?? null,
        collapsed: group.collapsed === true,
        tabs: tabs.map(summarizeTab)
      }};
    }};

    if (args.action === 'ensure' || args.action === 'list')
      return await groupResult();

    if (args.action === 'create') {{
      const group = await chrome.tabGroups.get(groupId);
      let created = null;
      try {{
        created = await chrome.tabs.create({{
          windowId: group.windowId,
          active: false,
          url: 'about:blank'
        }});
        if (!Number.isInteger(created.id))
          throw new Error('CONTROLLED_GROUP_CREATE_TAB_INVALID');
        await chrome.tabs.group({{tabIds: [created.id], groupId}});
        let grouped = await chrome.tabs.get(created.id);
        if (grouped.groupId !== groupId || grouped.windowId !== group.windowId)
          throw new Error('CONTROLLED_GROUP_CREATE_GROUP_READBACK_MISMATCH');

        await chrome.tabs.update(created.id, {{url: args.url}});
        for (let attempt = 0; attempt < 120; attempt += 1) {{
          await wait(100);
          grouped = await chrome.tabs.get(created.id);
          if (grouped.groupId !== groupId)
            throw new Error('CONTROLLED_GROUP_CREATE_MEMBERSHIP_LOST');
          if (grouped.status === 'complete')
            return {{...summarizeTab(grouped), status: 'READY'}};
        }}
        throw new Error('CONTROLLED_GROUP_CREATE_NAVIGATION_TIMEOUT');
      }} catch (error) {{
        if (created && Number.isInteger(created.id)) {{
          try {{ await chrome.tabs.remove(created.id); }} catch {{}}
        }}
        throw error;
      }}
    }}

    let all = await chrome.tabs.query({{}});
    let matches = all.filter(tab => tab.id !== self.id);
    if (Number.isInteger(args.targetTabId))
      matches = matches.filter(tab => tab.id === args.targetTabId);
    if (typeof args.exactUrl === 'string' && args.exactUrl.length > 0)
      matches = matches.filter(tab => normalize(tab.url) === normalize(args.exactUrl));
    if (typeof args.chatId === 'string' && args.chatId.length > 0)
      matches = matches.filter(tab => (tab.url || '').includes(args.chatId));

    if (matches.length === 0)
      return {{status: 'NOT_FOUND', groupId}};
    if (matches.length > 1)
      return {{
        status: 'AMBIGUOUS',
        groupId,
        matchCount: matches.length
      }};

    let target = matches[0];

    if (args.action === 'adopt') {{
      const targetWindowId = target.windowId;
      if (!Number.isInteger(target.id) || !Number.isInteger(targetWindowId))
        throw new Error('CONTROLLED_GROUP_TARGET_INVALID');

      const groupBefore = await chrome.tabGroups.get(groupId);
      const selectorWindowId = self.windowId;
      let groupMoved = false;

      if (groupBefore.windowId !== targetWindowId) {{
        await chrome.tabGroups.move(groupId, {{
          windowId: targetWindowId,
          index: -1
        }});
        groupMoved = true;
        for (let attempt = 0; attempt < 120; attempt += 1) {{
          await wait(50);
          const movedGroup = await chrome.tabGroups.get(groupId);
          self = await chrome.tabs.get(self.id);
          if (
            movedGroup.windowId === targetWindowId &&
            self.windowId === targetWindowId &&
            self.groupId === groupId
          ) break;
          if (attempt === 119)
            throw new Error('CONTROLLED_GROUP_WINDOW_MIGRATION_TIMEOUT');
        }}
      }}

      target = await chrome.tabs.get(target.id);
      if (target.windowId !== targetWindowId)
        throw new Error('CONTROLLED_GROUP_TARGET_WINDOW_CHANGED');
      if (target.groupId !== groupId) {{
        await chrome.tabs.group({{tabIds: [target.id], groupId}});
        target = await chrome.tabs.get(target.id);
      }}
      if (target.windowId !== targetWindowId || target.groupId !== groupId)
        throw new Error('CONTROLLED_GROUP_ADOPT_READBACK_MISMATCH');

      let connected = false;
      for (let attempt = 0; attempt < 120; attempt += 1) {{
        const status = await chrome.runtime.sendMessage({{
          type: 'getConnectionStatus'
        }}).catch(() => null);
        connected = Array.isArray(status?.connections) &&
          status.connections.some(connection =>
            Array.isArray(connection?.connectedTabIds) &&
            connection.connectedTabIds.includes(target.id)
          );
        if (connected) break;
        await wait(50);
      }}
      if (!connected)
        throw new Error('CONTROLLED_GROUP_TARGET_ATTACH_TIMEOUT');

      if (target.active !== true)
        target = await chrome.tabs.update(target.id, {{active: true}});
      const readback = await chrome.tabs.get(target.id);
      if (
        readback.windowId !== targetWindowId ||
        readback.groupId !== groupId ||
        readback.active !== true
      ) throw new Error('CONTROLLED_GROUP_TARGET_ACTIVE_READBACK_MISMATCH');

      const members = await chrome.tabs.query({{groupId}});
      return {{
        ...summarizeTab(readback),
        status: 'READY',
        selectorTabId: self.id,
        selectorWindowId,
        groupMoved,
        groupMemberCountBeforeSelectorClose: members.length,
        selectorCloseRequired: self.id !== readback.id
      }};
    }}

    const group = await chrome.tabGroups.get(groupId);
    if (target.groupId !== groupId || target.windowId !== group.windowId)
      throw new Error('TARGET_NOT_IN_CONTROLLED_GROUP');

    if (args.action === 'click-button')
      return {{...summarizeTab(target), status: 'TARGET_READY'}};

    if (args.action === 'duplicate') {{
      let duplicate = await chrome.tabs.duplicate(target.id);
      if (!Number.isInteger(duplicate?.id))
        throw new Error('CONTROLLED_GROUP_DUPLICATE_INVALID');
      duplicate = await chrome.tabs.get(duplicate.id);
      if (duplicate.windowId !== group.windowId)
        throw new Error('CONTROLLED_GROUP_DUPLICATE_WINDOW_MISMATCH');
      if (duplicate.groupId !== groupId) {{
        await chrome.tabs.group({{tabIds: [duplicate.id], groupId}});
        duplicate = await chrome.tabs.get(duplicate.id);
      }}
      if (duplicate.groupId !== groupId)
        throw new Error('CONTROLLED_GROUP_DUPLICATE_READBACK_MISMATCH');
      return {{...summarizeTab(duplicate), status: 'READY'}};
    }}

    if (args.action === 'close') {{
      const tabId = target.id;
      await chrome.tabs.remove(tabId);
      try {{
        await chrome.tabs.get(tabId);
        throw new Error('CONTROLLED_GROUP_CLOSE_READBACK_MISMATCH');
      }} catch (error) {{
        if (String(error?.message || error).includes('No tab with id'))
          return {{status: 'CLOSED', tabId, groupId, windowId: group.windowId}};
        throw error;
      }}
    }}

    throw new Error('CONTROLLED_GROUP_ACTION_INVALID');
  }}, args);

  if (args.action === 'click-button') {{
    if (adopted.status !== 'TARGET_READY')
      throw new Error('CONTROLLED_GROUP_CLICK_TARGET_NOT_READY');
    const targetUrl = normalize(adopted.url);
    let targetPage = null;
    for (let attempt = 0; attempt < 120; attempt += 1) {{
      targetPage = context.pages().find(
        p => normalize(p.url()) === targetUrl
      ) ?? null;
      if (targetPage) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }}
    if (!targetPage)
      throw new Error('CONTROLLED_GROUP_CLICK_PLAYWRIGHT_TARGET_TIMEOUT');

    const button = targetPage.getByRole('button', {{
      name: args.name,
      exact: true
    }});
    const buttonCount = await button.count();
    if (buttonCount !== 1)
      throw new Error(`CONTROLLED_GROUP_CLICK_BUTTON_COUNT:${{buttonCount}}`);
    await button.waitFor({{state: 'visible', timeout: 5000}});
    if (!(await button.isEnabled()))
      throw new Error('CONTROLLED_GROUP_CLICK_BUTTON_DISABLED');
    await button.click();

    if (typeof args.expectText === 'string' && args.expectText.length > 0) {{
      const confirmation = targetPage.getByText(args.expectText, {{exact: true}});
      await confirmation.waitFor({{state: 'visible', timeout: 5000}});
    }}
    return {{
      ...adopted,
      status: 'CLICKED',
      buttonName: args.name,
      confirmationText: args.expectText ?? null
    }};
  }}

  if (
    args.action === 'adopt' &&
    adopted.status === 'READY' &&
    adopted.selectorCloseRequired === true
  ) {{
    const targetUrl = normalize(adopted.url);
    let targetPage = null;
    for (let attempt = 0; attempt < 120; attempt += 1) {{
      targetPage = context.pages().find(p => normalize(p.url()) === targetUrl) ?? null;
      if (targetPage) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }}
    if (!targetPage)
      throw new Error('CONTROLLED_GROUP_ADOPT_PLAYWRIGHT_TARGET_TIMEOUT');

    await connectPages[0].close();
    for (let attempt = 0; attempt < 120; attempt += 1) {{
      const selectors = context.pages().filter(
        p => p.url().startsWith(args.connectPrefix)
      );
      if (selectors.length === 0) {{
        const stillTarget = context.pages().find(
          p => normalize(p.url()) === targetUrl
        );
        if (!stillTarget)
          throw new Error('CONTROLLED_GROUP_ADOPT_TARGET_LOST_AFTER_SELECTOR_CLOSE');
        return {{
          ...adopted,
          selectorClosed: true
        }};
      }}
      await new Promise(resolve => setTimeout(resolve, 50));
    }}
    throw new Error('CONTROLLED_GROUP_SELECTOR_CLOSE_TIMEOUT');
  }}

  return adopted;
}}"""


def validate_action(
    action: str,
    *,
    target_tab_id: int | None,
    exact_url: str | None,
    chat_id: str | None,
    url: str | None,
    name: str | None,
    expect_text: str | None,
    timeout: float,
) -> None:
    if action not in SUPPORTED_ACTIONS:
        raise ControlledGroupError("unsupported action")
    if timeout <= 0 or timeout > 120:
        raise ControlledGroupError("invalid timeout")
    if action == "create":
        if not url:
            raise ControlledGroupError("create requires --url")
        parsed = urllib.parse.urlsplit(url)
        normal_web = (
            parsed.scheme in {"http", "https", "chrome-extension"}
            and bool(parsed.hostname)
        )
        chrome_extensions = (
            parsed.scheme == "chrome"
            and parsed.hostname == "extensions"
            and parsed.path in {"", "/"}
            and not parsed.username
            and not parsed.password
            and not parsed.fragment
        )
        if not (normal_web or chrome_extensions):
            raise ControlledGroupError(
                "create URL must be http(s), chrome-extension, or chrome://extensions"
            )
    if action in {"adopt", "duplicate", "close", "click-button"} and (
        target_tab_id is None and not exact_url and not chat_id
    ):
        raise ControlledGroupError("durable target selector required")
    if action == "click-button":
        if not name or not name.strip():
            raise ControlledGroupError("click-button requires --name")
        if expect_text is not None and not expect_text.strip():
            raise ControlledGroupError("--expect-text must be non-empty")


def action_selector(
    *,
    target_tab_id: int | None,
    exact_url: str | None,
    chat_id: str | None,
    url: str | None,
    name: str | None,
    expect_text: str | None,
) -> dict[str, object]:
    return {
        "targetTabId": target_tab_id,
        "exactUrl": exact_url,
        "chatId": chat_id,
        "url": url,
        "name": name,
        "expectText": expect_text,
    }


def prepare_current_session_action(action: str, selector: dict[str, object]) -> Path:
    ACTION_RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    target = ACTION_RUNTIME_DIR / f"{action}-{uuid4().hex}.js"
    target.write_text(build_group_code(action, selector), encoding="utf-8")
    return target.resolve()


def cleanup_action_file(raw: str) -> Path:
    root = ACTION_RUNTIME_DIR.resolve()
    target = Path(raw).expanduser().resolve()
    if target.parent != root or target.suffix != ".js":
        raise ControlledGroupError("action file is outside controlled runtime directory")
    try:
        target.unlink()
    except FileNotFoundError:
        pass
    return target


def execute_group_action(
    action: str,
    *,
    target_tab_id: int | None = None,
    exact_url: str | None = None,
    chat_id: str | None = None,
    url: str | None = None,
    name: str | None = None,
    expect_text: str | None = None,
    endpoint_file: Path | None = None,
    timeout: float = 25.0,
) -> tuple[dict[str, Any], bool]:
    validate_action(
        action,
        target_tab_id=target_tab_id,
        exact_url=exact_url,
        chat_id=chat_id,
        url=url,
        name=name,
        expect_text=expect_text,
        timeout=timeout,
    )
    if action == "adopt":
        raise ControlledGroupError(
            "adopt requires the existing canonical Playwright session; "
            "use --prepare-current-session and execute the returned actionFile "
            "with browser_run_code_unsafe"
        )
    endpoint = load_endpoint(endpoint_file or DEFAULT_ENDPOINT_FILE)
    selector = action_selector(
        target_tab_id=target_tab_id,
        exact_url=exact_url,
        chat_id=chat_id,
        url=url,
        name=name,
        expect_text=expect_text,
    )
    return run_code(endpoint, timeout, build_group_code(action, selector), unsafe=True)


def self_test() -> None:
    selector = {
        "targetTabId": 7,
        "exactUrl": "https://example.com/",
        "chatId": "chat-a",
        "url": None,
        "name": None,
        "expectText": None,
    }
    code = build_group_code("adopt", selector)
    required = [
        "chrome.tabs.getCurrent",
        "chrome.tabs.group",
        "chrome.tabGroups.get",
        "chrome.tabGroups.update",
        "chrome.tabGroups.move",
        "getConnectionStatus",
        "connectedTabIds.includes(target.id)",
        "chrome.tabs.update(target.id, {active: true})",
        "await connectPages[0].close()",
        "CONTROLLED_GROUP_ADOPT_TARGET_LOST_AFTER_SELECTOR_CLOSE",
    ]
    if any(item not in code for item in required):
        raise ControlledGroupError("self-test missing controlled-group primitive")
    forbidden = [
        "chrome.windows.create",
        "chrome.tabs.move(target.id",
        "chrome.tabs.move(target.id,",
    ]
    if any(item in code for item in forbidden):
        raise ControlledGroupError("self-test found forbidden business-tab migration")

    prepared = prepare_current_session_action("adopt", selector)
    try:
        if prepared.read_text(encoding="utf-8") != code:
            raise ControlledGroupError("prepared action differs from canonical code")
        if prepared.parent != ACTION_RUNTIME_DIR.resolve():
            raise ControlledGroupError("prepared action runtime path mismatch")
    finally:
        cleanup_action_file(str(prepared))
    if prepared.exists():
        raise ControlledGroupError("prepared action cleanup failed")

    try:
        execute_group_action(
            "adopt",
            target_tab_id=7,
            exact_url="https://example.com/",
            chat_id="chat-a",
        )
        raise ControlledGroupError("direct adopt did not fail closed")
    except ControlledGroupError as exc:
        if "existing canonical Playwright session" not in str(exc):
            raise

    create_code = build_group_code(
        "create",
        {
            "targetTabId": None,
            "exactUrl": None,
            "chatId": None,
            "url": "https://example.com/",
            "name": None,
            "expectText": None,
        },
    )
    blank = create_code.index("url: 'about:blank'")
    grouped = create_code.index("chrome.tabs.group({tabIds: [created.id], groupId})")
    navigate = create_code.index("chrome.tabs.update(created.id, {url: args.url})")
    if not (blank < grouped < navigate):
        raise ControlledGroupError("create invariant must be blank -> group -> navigate")
    if "chrome.windows.create" in create_code:
        raise ControlledGroupError("self-test forbids window creation")

    validate_action(
        "create",
        target_tab_id=None,
        exact_url=None,
        chat_id=None,
        url="chrome://extensions/?id=extension-id",
        name=None,
        expect_text=None,
        timeout=25.0,
    )
    click_code = build_group_code(
        "click-button",
        {
            "targetTabId": 9,
            "exactUrl": "chrome://extensions/?id=extension-id",
            "chatId": None,
            "url": None,
            "name": "重新加载",
            "expectText": "已重新加载",
        },
    )
    click_required = [
        "getByRole('button'",
        "CONTROLLED_GROUP_CLICK_BUTTON_COUNT",
        "button.click()",
        "getByText(args.expectText",
        "status: 'CLICKED'",
    ]
    if any(item not in click_code for item in click_required):
        raise ControlledGroupError("self-test missing click-button invariant")
    if "chrome.windows.create" in click_code:
        raise ControlledGroupError("click-button must not create a window")
    print("PLAYWRIGHT_CONTROLLED_GROUP_SELF_TEST=PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        nargs="?",
        choices=sorted(SUPPORTED_ACTIONS),
    )
    parser.add_argument("--target-tab-id", type=int)
    parser.add_argument("--exact-url")
    parser.add_argument("--chat-id")
    parser.add_argument("--url")
    parser.add_argument("--name")
    parser.add_argument("--expect-text")
    parser.add_argument("--endpoint-file")
    parser.add_argument("--timeout", type=float, default=25.0)
    parser.add_argument("--prepare-current-session", action="store_true")
    parser.add_argument("--cleanup-action-file")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    if args.cleanup_action_file:
        if args.action is not None or args.prepare_current_session:
            fail("cleanup action cannot be combined with action execution")
        try:
            removed = cleanup_action_file(args.cleanup_action_file)
        except ControlledGroupError as exc:
            fail(str(exc))
        print(
            json.dumps(
                {
                    "contract": "workspace.playwright-controlled-group-action.v1",
                    "action": "CLEANUP",
                    "actionFile": str(removed),
                    "status": "CLEAN",
                },
                ensure_ascii=False,
            )
        )
        return

    if args.action is None:
        fail("ACTION_REQUIRED")

    try:
        validate_action(
            args.action,
            target_tab_id=args.target_tab_id,
            exact_url=args.exact_url,
            chat_id=args.chat_id,
            url=args.url,
            name=args.name,
            expect_text=args.expect_text,
            timeout=args.timeout,
        )
        selector = action_selector(
            target_tab_id=args.target_tab_id,
            exact_url=args.exact_url,
            chat_id=args.chat_id,
            url=args.url,
            name=args.name,
            expect_text=args.expect_text,
        )
        if args.prepare_current_session:
            action_file = prepare_current_session_action(args.action, selector)
            print(
                json.dumps(
                    {
                        "contract": "workspace.playwright-controlled-group-action.v1",
                        "action": args.action.upper(),
                        "executionMode": "CURRENT_PLAYWRIGHT_SESSION",
                        "actionFile": str(action_file),
                        "cleanupRequired": True,
                    },
                    ensure_ascii=False,
                )
            )
            return
        result, cleanup_ok = execute_group_action(
            args.action,
            target_tab_id=args.target_tab_id,
            exact_url=args.exact_url,
            chat_id=args.chat_id,
            url=args.url,
            name=args.name,
            expect_text=args.expect_text,
            endpoint_file=Path(args.endpoint_file) if args.endpoint_file else None,
            timeout=args.timeout,
        )
    except ControlledGroupError as exc:
        fail(str(exc))

    print(
        json.dumps(
            {
                "contract": "workspace.playwright-controlled-group.v1",
                "action": args.action.upper(),
                "result": result,
                "sessionCleanup": "PASS" if cleanup_ok else "UNKNOWN",
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
