#!/usr/bin/env python3
"""Bind one existing uniquely identified Chrome tab into the current Playwright group."""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

CONNECT_SCRIPT = Path(__file__).with_name("playwright-connect-once.py")
EXTENSION_CONNECT_PREFIX = "chrome-extension://mmlmfjhmonkocbjadbfplnigmagldckm/connect.html"


def fail(message: str, code: int = 2) -> None:
    print(f"PLAYWRIGHT_REBIND_EXISTING_TAB=FAIL error={message}", file=sys.stderr)
    raise SystemExit(code)


def load_connect_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("workspace_playwright_connect_once", CONNECT_SCRIPT)
    if spec is None or spec.loader is None:
        fail("connect-module-unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def call_rebind(mcp: ModuleType, endpoint: str, timeout: float, selector: dict[str, object]) -> bool:
    initialize = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": mcp.DEFAULT_PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": {"name": "workspace-playwright-rebind-existing-tab", "version": "1.0"},
        },
    }
    message, session_id = mcp.post_json(endpoint, initialize, timeout, expected_id=1)
    if not session_id or not isinstance(message, dict) or "error" in message:
        raise mcp.ConnectOnceError("initialize failed")
    result = message.get("result")
    protocol_version = (
        result.get("protocolVersion")
        if isinstance(result, dict) and isinstance(result.get("protocolVersion"), str)
        else mcp.DEFAULT_PROTOCOL_VERSION
    )
    code = f"""async (page) => {{
  const selector = {json.dumps(selector, separators=(',', ':'))};
  const pages = page.context().pages();
  const connectPages = pages.filter(p => p.url().startsWith({json.dumps(EXTENSION_CONNECT_PREFIX)}));
  if (connectPages.length !== 1) throw new Error(`CONTROLLED_CONNECT_PAGE_COUNT:${{connectPages.length}}`);
  return await connectPages[0].evaluate(async (selector) => {{
    const self = await chrome.tabs.getCurrent();
    if (!self || self.groupId < 0) throw new Error('CURRENT_CONNECT_PAGE_NOT_GROUPED');
    let matches = await chrome.tabs.query({{}});
    if (selector.targetTabId !== null) matches = matches.filter(t => t.id === selector.targetTabId);
    if (selector.exactUrl !== null) matches = matches.filter(t => t.url === selector.exactUrl);
    if (selector.chatId !== null) matches = matches.filter(t => (t.url || '').includes(selector.chatId));
    const sameWindow = matches.filter(t => t.windowId === self.windowId);
    if (sameWindow.length !== 1) throw new Error(`TARGET_IDENTITY_AMBIGUOUS:${{sameWindow.length}}`);
    const target = sameWindow[0];
    if (target.groupId !== self.groupId) await chrome.tabs.group({{tabIds:[target.id], groupId:self.groupId}});
    const after = await chrome.tabs.get(target.id);
    if (after.groupId !== self.groupId) throw new Error('REBIND_READBACK_MISMATCH');
    return {{tabId:after.id, windowId:after.windowId, groupId:after.groupId, url:after.url, title:after.title}};
  }}, selector);
}}"""
    try:
        mcp.post_json(
            endpoint,
            {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}},
            timeout,
            session_id=session_id,
            protocol_version=protocol_version,
        )
        tool_message, _ = mcp.post_json(
            endpoint,
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": "browser_run_code", "arguments": {"code": code}},
            },
            timeout,
            session_id=session_id,
            protocol_version=protocol_version,
            expected_id=2,
        )
        if not isinstance(tool_message, dict) or "error" in tool_message:
            raise mcp.ConnectOnceError("browser_run_code failed")
        tool_result = tool_message.get("result")
        if isinstance(tool_result, dict) and tool_result.get("isError") is True:
            raise mcp.ConnectOnceError("rebind rejected by Browser owner")
        return mcp.close_session(endpoint, session_id, protocol_version)
    except Exception:
        mcp.close_session(endpoint, session_id, protocol_version)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebind one existing tab into current Playwright group.")
    parser.add_argument("--target-tab-id", type=int)
    parser.add_argument("--exact-url")
    parser.add_argument("--chat-id")
    parser.add_argument("--endpoint-file")
    parser.add_argument("--timeout", type=float, default=25.0)
    args = parser.parse_args()
    if args.target_tab_id is None and not args.exact_url and not args.chat_id:
        fail("one durable selector is required")
    if args.timeout <= 0 or args.timeout > 120:
        fail("invalid-timeout")
    mcp = load_connect_module()
    endpoint_file = Path(args.endpoint_file) if args.endpoint_file else mcp.DEFAULT_ENDPOINT_FILE
    selector = {
        "targetTabId": args.target_tab_id,
        "exactUrl": args.exact_url,
        "chatId": args.chat_id,
    }
    try:
        endpoint = mcp.load_endpoint(endpoint_file)
        cleanup_ok = call_rebind(mcp, endpoint, args.timeout, selector)
    except mcp.ConnectOnceError as exc:
        fail(str(exc))
    print(
        "PLAYWRIGHT_REBIND_EXISTING_TAB=PASS "
        f"sessionCleanup={'PASS' if cleanup_ok else 'UNKNOWN'}"
    )


if __name__ == "__main__":
    main()
