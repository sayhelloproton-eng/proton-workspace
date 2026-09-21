#!/usr/bin/env python3
"""Public Browser readiness action: canonical Playwright recovery + controlled group."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import uuid
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[2]
RECOVER = Path(__file__).resolve().parent / "playwright-recover.py"
GROUP = WORKSPACE / "tools/browser/playwright-controlled-group.py"
BOUNDARY = (
    WORKSPACE
    / "skills/chat-local-acceptance-automation-protocol/scripts/browser-run-boundary.py"
)


class ReadyError(RuntimeError):
    pass


def run(command: list[str], timeout: float, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            text=True,
            capture_output=True,
            input=input_text,
            timeout=timeout,
            check=False,
            env={**__import__("os").environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
    except subprocess.TimeoutExpired as exc:
        raise ReadyError(f"TIMEOUT:{Path(command[0]).name}") from exc


def boundary(action: str, run_id: str, outcome: str | None = None) -> None:
    if action == "open":
        record = {
            "eventType": "AUTOMATION_START",
            "runId": run_id,
            "project": "workspace-browser",
            "scenario": "playwright-ready",
            "acceptanceMode": "SAME_SCENE",
            "neededCapabilities": ["CONNECT", "RECOVER", "IDENTIFY"],
            "knownPathHit": True,
            "freshEvidenceWindowBound": True,
        }
        command = [sys.executable, str(BOUNDARY), "open", "--mode", "exclusive", "--input", "-"]
    else:
        record = {
            "eventType": "AUTOMATION_RUN",
            "runId": run_id,
            "outcome": outcome,
            "failureClass": "NONE" if outcome == "PASS" else "TOOL_RUNTIME_FAILURE",
            "sideEffectState": "NOT_APPLICABLE" if outcome == "PASS" else "UNKNOWN",
        }
        command = [sys.executable, str(BOUNDARY), "close", "--input", "-"]
    result = run(command, 10, json.dumps(record))
    if result.returncode != 0:
        raise ReadyError(f"BOUNDARY_{action.upper()}_FAILED")


def parse_group(stdout: str) -> dict:
    try:
        value = json.loads(stdout.strip())
    except json.JSONDecodeError as exc:
        raise ReadyError("CONTROLLED_GROUP_RESULT_INVALID") from exc
    if value.get("contract") != "workspace.playwright-controlled-group.v1":
        raise ReadyError("CONTROLLED_GROUP_CONTRACT_INVALID")
    result = value.get("result")
    if not isinstance(result, dict) or result.get("status") != "READY":
        raise ReadyError("CONTROLLED_GROUP_NOT_READY")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inside-boundary", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--endpoint-file")
    parser.add_argument("--connect-timeout", type=float, default=25.0)
    parser.add_argument("--lifecycle-timeout", type=float, default=60.0)
    args = parser.parse_args()

    run_id = f"playwright-ready:{int(time.time() * 1000)}:{uuid.uuid4()}"
    opened = False
    try:
        if not args.inside_boundary:
            boundary("open", run_id)
            opened = True
        recover = [
            sys.executable,
            str(RECOVER),
            "--connect-timeout",
            str(args.connect_timeout),
            "--lifecycle-timeout",
            str(args.lifecycle_timeout),
        ]
        if args.endpoint_file:
            recover.extend(["--endpoint-file", args.endpoint_file])
        recovered = run(recover, args.lifecycle_timeout * 2 + args.connect_timeout * 2 + 20)
        if recovered.returncode != 0:
            detail = (recovered.stderr or recovered.stdout).strip().replace("\n", " ")[:320]
            raise ReadyError(f"PLAYWRIGHT_RECOVERY_FAILED:{detail or recovered.returncode}")

        group = [sys.executable, str(GROUP), "ensure"]
        if args.endpoint_file:
            group.extend(["--endpoint-file", args.endpoint_file])
        grouped = run(group, args.connect_timeout + 15)
        if grouped.returncode != 0:
            detail = (grouped.stderr or grouped.stdout).strip().replace("\n", " ")[:320]
            raise ReadyError(f"CONTROLLED_GROUP_FAILED:{detail or grouped.returncode}")
        result = parse_group(grouped.stdout)

        print(
            json.dumps(
                {
                    "contract": "workspace.playwright-ready.v1",
                    "status": "READY",
                    "groupId": result.get("groupId"),
                    "windowId": result.get("windowId"),
                    "tabCount": len(result.get("tabs", [])),
                },
                ensure_ascii=False,
            )
        )
        if opened:
            boundary("close", run_id, "PASS")
    except Exception as exc:
        if opened:
            try:
                boundary("close", run_id, "FAIL")
            except Exception:
                pass
        message = exc.args[0] if isinstance(exc, Exception) and exc.args else "PLAYWRIGHT_READY_FAILED"
        print(
            json.dumps(
                {
                    "contract": "workspace.playwright-ready.v1",
                    "status": "UNKNOWN",
                    "reason": str(message),
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        raise SystemExit(2)


if __name__ == "__main__":
    main()
