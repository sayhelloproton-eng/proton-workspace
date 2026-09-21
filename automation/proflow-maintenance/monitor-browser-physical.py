#!/usr/bin/env python3
"""ProFlow Monitor physical Browser actions inside the canonical controlled group.

This helper never types or submits Chat text. Generic group lifecycle is owned only by
tools/browser/playwright-controlled-group.py. This project helper consumes that owner
before any Monitor EYES/physical action.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import urllib.parse
from pathlib import Path
from types import ModuleType
from typing import Any

WORKSPACE = Path(__file__).resolve().parents[2]
GROUP_HELPER = WORKSPACE / "tools/browser/playwright-controlled-group.py"


def fail(message: str, code: int = 2) -> None:
    print(f"PROFLOW_MONITOR_BROWSER_PHYSICAL=FAIL error={message}", file=sys.stderr)
    raise SystemExit(code)


def load_group_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        "workspace_playwright_controlled_group",
        GROUP_HELPER,
    )
    if spec is None or spec.loader is None:
        fail("CONTROLLED_GROUP_HELPER_UNAVAILABLE")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def monitor_code(
    action: str,
    exact_url: str,
    chat_id: str,
    group_id: int,
    fingerprint: str | None = None,
) -> str:
    selector = {
        "action": action,
        "exactUrl": exact_url,
        "chatId": chat_id,
        "groupId": group_id,
        "fingerprint": fingerprint,
    }
    return f"""async (page) => {{
  const selector = {json.dumps(selector, separators=(',', ':'))};
  const connectPrefix = "chrome-extension://mmlmfjhmonkocbjadbfplnigmagldckm/connect.html";
  const connectPages = page.context().pages().filter(p => p.url().startsWith(connectPrefix));
  if (connectPages.length !== 1)
    throw new Error(`CONTROLLED_CONNECT_PAGE_COUNT:${{connectPages.length}}`);

  return await connectPages[0].evaluate(async (selector) => {{
    const normalize = (value) => {{
      try {{ return new URL(value).href; }} catch {{ return null; }}
    }};
    let members = await chrome.tabs.query({{groupId: selector.groupId}});
    let matches = members.filter(
      tab =>
        normalize(tab.url) === normalize(selector.exactUrl) &&
        (tab.url || '').includes(`/c/${{selector.chatId}}`)
    );
    if (matches.length === 0)
      return {{
        status: 'NOT_FOUND',
        chatId: selector.chatId,
        groupId: selector.groupId,
        url: selector.exactUrl
      }};
    if (matches.length > 1)
      return {{
        status: 'AMBIGUOUS',
        chatId: selector.chatId,
        groupId: selector.groupId,
        url: selector.exactUrl,
        matchCount: matches.length
      }};

    let target = matches[0];
    const inspect = async () => {{
      target = await chrome.tabs.get(target.id);
      if (target.groupId !== selector.groupId)
        throw new Error('MONITOR_TARGET_LEFT_CONTROLLED_GROUP');
      const groupMembers = await chrome.tabs.query({{groupId: selector.groupId}});
      return {{
        status: 'READY',
        chatId: selector.chatId,
        tabId: target.id,
        windowId: target.windowId,
        groupId: target.groupId,
        grouped: true,
        url: target.url,
        active: target.active === true,
        groupMemberCount: groupMembers.length
      }};
    }};

    if (selector.action === 'inspect')
      return await inspect();

    if (selector.action === 'sync') {{
      target = await chrome.tabs.update(target.id, {{active: true}});
      const checked = await inspect();
      if (!checked.active)
        throw new Error('MONITOR_TARGET_ACTIVATION_FAILED');
      return checked;
    }}

    if (selector.action === 'fingerprint') {{
      if (typeof selector.fingerprint !== 'string' || selector.fingerprint.length === 0)
        throw new Error('MONITOR_FINGERPRINT_REQUIRED');
      const debuggee = {{tabId: target.id}};
      let attachedByUs = false;
      const evaluate = async () => {{
        const expression = `(() => {{
          const fingerprint = ${{JSON.stringify(selector.fingerprint)}};
          return [...document.querySelectorAll('[data-message-author-role="user"]')]
            .some(element => (element.textContent || '').includes(fingerprint));
        }})()`;
        return await chrome.debugger.sendCommand(
          debuggee,
          'Runtime.evaluate',
          {{expression, returnByValue: true}}
        );
      }};
      try {{
        let response;
        try {{
          response = await evaluate();
        }} catch {{
          await chrome.debugger.attach(debuggee, '1.3');
          attachedByUs = true;
          response = await evaluate();
        }}
        return {{
          ...(await inspect()),
          fingerprintFound: response?.result?.value === true
        }};
      }} finally {{
        if (attachedByUs) {{
          try {{ await chrome.debugger.detach(debuggee); }} catch {{}}
        }}
      }}
    }}

    if (selector.action === 'reload') {{
      await chrome.tabs.reload(target.id);
      for (let attempt = 0; attempt < 120; attempt += 1) {{
        await new Promise(resolve => setTimeout(resolve, 100));
        try {{
          target = await chrome.tabs.get(target.id);
          if (
            target.groupId === selector.groupId &&
            normalize(target.url) === normalize(selector.exactUrl) &&
            target.status === 'complete'
          ) return await inspect();
        }} catch {{}}
      }}
      throw new Error('MONITOR_TARGET_RELOAD_TIMEOUT');
    }}

    throw new Error('MONITOR_PHYSICAL_ACTION_INVALID');
  }}, selector);
}}"""


def execute_group(
    group: ModuleType,
    action: str,
    *,
    exact_url: str | None = None,
    chat_id: str | None = None,
    url: str | None = None,
    endpoint_file: Path | None = None,
    timeout: float,
) -> tuple[dict[str, Any], bool]:
    return group.execute_group_action(
        action,
        exact_url=exact_url,
        chat_id=chat_id,
        url=url,
        endpoint_file=endpoint_file,
        timeout=timeout,
    )


def run_monitor_code(
    group: ModuleType,
    *,
    action: str,
    exact_url: str,
    chat_id: str,
    group_id: int,
    fingerprint: str | None,
    endpoint_file: Path | None,
    timeout: float,
) -> tuple[dict[str, Any], bool]:
    endpoint = group.load_endpoint(endpoint_file or group.DEFAULT_ENDPOINT_FILE)
    return group.run_code(
        endpoint,
        timeout,
        monitor_code(action, exact_url, chat_id, group_id, fingerprint),
        client_name="proflow-monitor-browser-physical",
        unsafe=True,
    )


def validate_identity(exact_url: str | None, chat_id: str | None) -> tuple[str, str]:
    if not exact_url or not chat_id:
        raise ValueError("EXACT_MONITOR_IDENTITY_REQUIRED")
    parsed = urllib.parse.urlsplit(exact_url)
    if parsed.scheme != "https" or parsed.hostname != "chatgpt.com":
        raise ValueError("MONITOR_CONVERSATION_LOCATOR_INVALID")
    if f"/c/{chat_id}" not in parsed.path:
        raise ValueError("MONITOR_CHAT_IDENTITY_MISMATCH")
    return exact_url, chat_id


def run_action(args: argparse.Namespace) -> None:
    try:
        exact_url, chat_id = validate_identity(args.exact_url, args.chat_id)
    except ValueError as exc:
        fail(str(exc))

    group = load_group_module()
    endpoint_file = Path(args.endpoint_file) if args.endpoint_file else None
    cleanup_states: list[bool] = []

    try:
        ensured, cleanup_ok = execute_group(
            group,
            "ensure",
            endpoint_file=endpoint_file,
            timeout=args.timeout,
        )
        cleanup_states.append(cleanup_ok)
        if ensured.get("status") != "READY" or not isinstance(ensured.get("groupId"), int):
            raise RuntimeError("CONTROLLED_GROUP_NOT_READY")
        group_id = int(ensured["groupId"])

        if args.action == "inspect":
            result, cleanup_ok = run_monitor_code(
                group,
                action="inspect",
                exact_url=exact_url,
                chat_id=chat_id,
                group_id=group_id,
                fingerprint=None,
                endpoint_file=endpoint_file,
                timeout=args.timeout,
            )
            cleanup_states.append(cleanup_ok)

        elif args.action in {"sync", "fingerprint", "reload"}:
            adopted, cleanup_ok = execute_group(
                group,
                "adopt",
                exact_url=exact_url,
                chat_id=chat_id,
                endpoint_file=endpoint_file,
                timeout=args.timeout,
            )
            cleanup_states.append(cleanup_ok)
            if adopted.get("status") in {"NOT_FOUND", "AMBIGUOUS"}:
                result = adopted
            elif adopted.get("status") != "READY":
                raise RuntimeError("MONITOR_CONTROLLED_GROUP_ADOPT_FAILED")
            else:
                result, cleanup_ok = run_monitor_code(
                    group,
                    action=args.action,
                    exact_url=exact_url,
                    chat_id=chat_id,
                    group_id=group_id,
                    fingerprint=args.fingerprint,
                    endpoint_file=endpoint_file,
                    timeout=args.timeout,
                )
                cleanup_states.append(cleanup_ok)

        elif args.action == "restore":
            adopted, cleanup_ok = execute_group(
                group,
                "adopt",
                exact_url=exact_url,
                chat_id=chat_id,
                endpoint_file=endpoint_file,
                timeout=args.timeout,
            )
            cleanup_states.append(cleanup_ok)
            if adopted.get("status") == "AMBIGUOUS":
                result = adopted
            else:
                if adopted.get("status") == "NOT_FOUND":
                    created, cleanup_ok = execute_group(
                        group,
                        "create",
                        url=exact_url,
                        endpoint_file=endpoint_file,
                        timeout=args.timeout,
                    )
                    cleanup_states.append(cleanup_ok)
                    if created.get("status") != "READY":
                        raise RuntimeError("MONITOR_EXISTING_CONVERSATION_RESTORE_FAILED")
                elif adopted.get("status") != "READY":
                    raise RuntimeError("MONITOR_CONTROLLED_GROUP_ADOPT_FAILED")
                result, cleanup_ok = run_monitor_code(
                    group,
                    action="sync",
                    exact_url=exact_url,
                    chat_id=chat_id,
                    group_id=group_id,
                    fingerprint=None,
                    endpoint_file=endpoint_file,
                    timeout=args.timeout,
                )
                cleanup_states.append(cleanup_ok)

        elif args.action == "retire":
            adopted, cleanup_ok = execute_group(
                group,
                "adopt",
                exact_url=exact_url,
                chat_id=chat_id,
                endpoint_file=endpoint_file,
                timeout=args.timeout,
            )
            cleanup_states.append(cleanup_ok)
            if adopted.get("status") in {"NOT_FOUND", "AMBIGUOUS"}:
                result = adopted
            elif adopted.get("status") != "READY":
                raise RuntimeError("MONITOR_CONTROLLED_GROUP_ADOPT_FAILED")
            else:
                closed, cleanup_ok = group.execute_group_action(
                    "close",
                    target_tab_id=int(adopted["tabId"]),
                    endpoint_file=endpoint_file,
                    timeout=args.timeout,
                )
                cleanup_states.append(cleanup_ok)
                if closed.get("status") != "CLOSED":
                    raise RuntimeError("MONITOR_TARGET_RETIRE_READBACK_MISMATCH")
                result = {
                    "status": "RETIRED",
                    "chatId": chat_id,
                    "tabId": adopted["tabId"],
                    "groupId": group_id,
                    "url": exact_url,
                }
        else:
            raise RuntimeError("MONITOR_PHYSICAL_ACTION_INVALID")

    except Exception as exc:
        fail(str(exc))

    print(
        json.dumps(
            {
                "contract": "proflow.monitor-browser-physical.v1",
                "action": args.action.upper(),
                "result": result,
                "controlledGroupId": group_id,
                "sessionCleanup": (
                    "PASS" if cleanup_states and all(cleanup_states) else "UNKNOWN"
                ),
            },
            ensure_ascii=False,
        )
    )


def self_test() -> None:
    code = monitor_code(
        "fingerprint",
        "https://chatgpt.com/g/g-p-learning/c/chat-a",
        "chat-a",
        17,
        "fingerprint-1",
    )
    required = [
        "chrome.tabs.query({groupId: selector.groupId})",
        "grouped: true",
        "chrome.tabs.update",
        "chrome.tabs.reload",
        "chrome.debugger.sendCommand",
    ]
    if any(item not in code for item in required):
        fail("SELF_TEST_MONITOR_GROUP_ACTIONS_MISSING")
    forbidden = [
        "chrome.windows.create",
        "chrome.tabs.group",
        "chrome.tabGroups",
        "sendMessage(",
        "browser_type",
        "prompt-textarea",
    ]
    if any(item in code for item in forbidden):
        fail("SELF_TEST_GENERIC_GROUP_OWNER_BYPASS")
    if not GROUP_HELPER.as_posix().endswith(
        "/tools/browser/playwright-controlled-group.py"
    ):
        fail("SELF_TEST_CONTROLLED_GROUP_OWNER_PATH_INVALID")
    print("PROFLOW_MONITOR_BROWSER_PHYSICAL_SELF_TEST=PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        nargs="?",
        choices=["inspect", "sync", "restore", "fingerprint", "reload", "retire"],
    )
    parser.add_argument("--exact-url")
    parser.add_argument("--chat-id")
    parser.add_argument("--target-tab-id", type=int)
    parser.add_argument("--fingerprint")
    parser.add_argument("--endpoint-file")
    parser.add_argument("--timeout", type=float, default=25.0)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if args.action is None:
        fail("ACTION_REQUIRED")
    if args.action == "fingerprint" and not args.fingerprint:
        fail("MONITOR_FINGERPRINT_REQUIRED")
    if args.timeout <= 0 or args.timeout > 120:
        fail("INVALID_TIMEOUT")
    run_action(args)


if __name__ == "__main__":
    main()
