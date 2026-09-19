#!/usr/bin/env python3
"""Trigger exactly one canonical Playwright MCP browser_tabs(list) request."""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_ENDPOINT_FILE = (
    Path.home()
    / "Library/Application Support/tunnel-client/mcp-endpoints/playwright-chrome.url"
)
DEFAULT_PROTOCOL_VERSION = "2025-03-26"
CLIENT_NAME = "workspace-playwright-connect-once"


class ConnectOnceError(RuntimeError):
    pass


def fail(stage: str, message: str, code: int = 2) -> None:
    print(f"PLAYWRIGHT_CONNECT_ONCE=FAIL stage={stage} error={message}", file=sys.stderr)
    raise SystemExit(code)


def load_endpoint(path: Path) -> str:
    try:
        endpoint = path.expanduser().resolve().read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise ConnectOnceError(f"endpoint file unreadable: {exc.strerror or exc}") from exc
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
        raise ConnectOnceError("canonical endpoint must be loopback HTTP /mcp")
    return endpoint


def decode_jsonrpc(raw: bytes, content_type: str, expected_id: int) -> dict[str, Any]:
    text = raw.decode("utf-8", errors="replace").strip()
    if not text:
        raise ConnectOnceError("empty MCP response")
    candidates: list[object] = []
    if "text/event-stream" in content_type:
        for line in text.splitlines():
            if not line.startswith("data:"):
                continue
            payload = line[5:].strip()
            if not payload or payload == "[DONE]":
                continue
            try:
                candidates.append(json.loads(payload))
            except json.JSONDecodeError:
                continue
    else:
        try:
            candidates.append(json.loads(text))
        except json.JSONDecodeError as exc:
            raise ConnectOnceError("MCP response is not valid JSON") from exc
    for candidate in candidates:
        if isinstance(candidate, dict) and candidate.get("id") == expected_id:
            return candidate
    raise ConnectOnceError(f"MCP response missing id={expected_id}")


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
            message = decode_jsonrpc(
                raw,
                response.headers.get("content-type", ""),
                expected_id,
            )
            return message, returned_session
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace").strip().replace("\n", " ")
        raise ConnectOnceError(f"HTTP {exc.code}: {detail[:240] or exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise ConnectOnceError(f"transport error: {exc.reason}") from exc
    except TimeoutError as exc:
        raise ConnectOnceError("MCP request timed out") from exc


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


def trigger_once(endpoint: str, timeout: float) -> bool:
    initialize = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": DEFAULT_PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": {"name": CLIENT_NAME, "version": "1.0"},
        },
    }
    message, session_id = post_json(endpoint, initialize, timeout, expected_id=1)
    if not session_id:
        raise ConnectOnceError("initialize response missing MCP session id")
    if not isinstance(message, dict) or "error" in message:
        raise ConnectOnceError("initialize failed")
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
                "params": {"name": "browser_tabs", "arguments": {"action": "list"}},
            },
            timeout,
            session_id=session_id,
            protocol_version=protocol_version,
            expected_id=2,
        )
        if not isinstance(tool_message, dict) or "error" in tool_message:
            raise ConnectOnceError("browser_tabs(list) failed")
        tool_result = tool_message.get("result")
        if isinstance(tool_result, dict) and tool_result.get("isError") is True:
            raise ConnectOnceError("browser_tabs(list) returned isError=true")
        return close_session(endpoint, session_id, protocol_version)
    except Exception:
        close_session(endpoint, session_id, protocol_version)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Issue one canonical Playwright MCP browser_tabs(list) request."
    )
    parser.add_argument("--endpoint-file", default=str(DEFAULT_ENDPOINT_FILE))
    parser.add_argument("--timeout", type=float, default=25.0)
    args = parser.parse_args()
    if args.timeout <= 0 or args.timeout > 120:
        fail("input", "--timeout must be > 0 and <= 120")
    try:
        endpoint = load_endpoint(Path(args.endpoint_file))
        cleanup_ok = trigger_once(endpoint, args.timeout)
    except ConnectOnceError as exc:
        fail("connect", str(exc))
    print(
        "PLAYWRIGHT_CONNECT_ONCE=PASS "
        f"tool=browser_tabs action=list sessionCleanup={'PASS' if cleanup_ok else 'UNKNOWN'}"
    )


if __name__ == "__main__":
    main()
