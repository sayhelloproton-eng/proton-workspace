#!/usr/bin/env python3
"""Compress Browser Acceptance run/lease boundaries into one Local transaction."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

SKILL_ROOT = Path(__file__).resolve().parents[1]
LOGGER = SKILL_ROOT / "scripts" / "append-run-log.py"
GUARD = SKILL_ROOT / "scripts" / "browser-usage-guard.py"
CHECKER = SKILL_ROOT / "scripts" / "check-open-runs.py"
DEFAULT_LEDGER = SKILL_ROOT / ".runs" / "ledger.jsonl"
DEFAULT_LEASE_DIR = SKILL_ROOT / ".runs" / "browser-usage"


def fail(message: str, output: str = "", code: int = 2) -> None:
    print(f"BROWSER_RUN_BOUNDARY=FAIL {message}", file=sys.stderr)
    if output.strip():
        print(output.strip(), file=sys.stderr)
    raise SystemExit(code)


def run(args: list[str], input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return subprocess.run(args, input=input_text, text=True, capture_output=True, env=env, timeout=30, check=False)


def load_record(input_arg: str) -> dict[str, Any]:
    if input_arg != "-":
        fail("only --input - is supported; stream compact JSON over stdin")
    try:
        value = json.loads(sys.stdin.read())
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON input: {exc}")
    if not isinstance(value, dict):
        fail("input JSON must be an object")
    return value


def append_event(record: dict[str, Any], ledger: Path) -> subprocess.CompletedProcess[str]:
    return run([
        sys.executable,
        str(LOGGER),
        "--input",
        "-",
        "--ledger",
        str(ledger),
    ], json.dumps(record, ensure_ascii=False))


def guard_command(ledger: Path, lease_dir: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return run([
        sys.executable,
        str(GUARD),
        "--ledger",
        str(ledger),
        "--lease-dir",
        str(lease_dir),
        *args,
    ])


def check_closed(ledger: Path, run_id: str) -> subprocess.CompletedProcess[str]:
    return run([
        sys.executable,
        str(CHECKER),
        "--ledger",
        str(ledger),
        "--run-id",
        run_id,
        "--fail-on-open",
    ])


def close_after_acquire_failure(start: dict[str, Any], ledger: Path) -> None:
    terminal = {
        "eventType": "AUTOMATION_RUN",
        "runId": start["runId"],
        "project": start.get("project"),
        "scenario": start.get("scenario"),
        "outcome": "BOUNDARY_ACQUIRE_FAILED",
        "resultCorrectness": "NOT_APPLICABLE",
        "processCorrectness": "PASS",
        "acceptanceMode": start.get("acceptanceMode"),
        "failureClass": "HARNESS_FAILURE",
        "sideEffectState": "NOT_APPLICABLE",
        "neededCapabilities": start.get("neededCapabilities", []),
        "usedCapabilities": [],
        "capabilityMisses": [],
        "knownPathHit": start.get("knownPathHit"),
        "minimumSufficientProof": True,
        "freshEvidenceWindowUsed": False,
        "firstDivergence": "Browser lease acquisition failed before any product action",
        "authorityResult": "Boundary helper auto-closed the run; no Browser product mutation started",
    }
    result = append_event(terminal, ledger)
    if result.returncode != 0:
        fail("cannot auto-close run after lease acquisition failure", result.stdout + result.stderr)


def open_boundary(record: dict[str, Any], mode: str, ledger: Path, lease_dir: Path) -> int:
    if record.get("eventType") != "AUTOMATION_START" or not record.get("runId"):
        fail("open requires AUTOMATION_START with runId")
    logged = append_event(record, ledger)
    if logged.returncode != 0:
        fail("cannot append AUTOMATION_START", logged.stdout + logged.stderr)

    acquired = guard_command(
        ledger,
        lease_dir,
        "acquire",
        "--run-id",
        str(record["runId"]),
        "--mode",
        mode,
    )
    if acquired.returncode != 0:
        close_after_acquire_failure(record, ledger)
        checked = check_closed(ledger, str(record["runId"]))
        if checked.returncode != 0:
            fail("lease acquisition failed and run closure could not be proven", checked.stdout + checked.stderr)
        print("BROWSER_RUN_BOUNDARY=BLOCKED action=open runClosed=YES", file=sys.stderr)
        if acquired.stderr.strip():
            print(acquired.stderr.strip(), file=sys.stderr)
        return 3

    print(f"BROWSER_RUN_BOUNDARY=PASS action=open runId={record['runId']} mode={mode}")
    return 0


def close_boundary(record: dict[str, Any], ledger: Path, lease_dir: Path) -> int:
    record.setdefault("eventType", "AUTOMATION_RUN")
    if record.get("eventType") != "AUTOMATION_RUN" or not record.get("runId") or not record.get("outcome"):
        fail("close requires AUTOMATION_RUN with runId and outcome")

    logged = append_event(record, ledger)
    if logged.returncode != 0:
        fail("cannot append terminal AUTOMATION_RUN", logged.stdout + logged.stderr)

    released = guard_command(
        ledger,
        lease_dir,
        "release",
        "--run-id",
        str(record["runId"]),
    )
    checked = check_closed(ledger, str(record["runId"]))
    if checked.returncode != 0:
        fail("terminal record written but run remains open", checked.stdout + checked.stderr)
    if released.returncode != 0:
        fail(
            "run closed but Browser lease release failed; do not replay product work",
            released.stdout + released.stderr,
        )

    print(f"BROWSER_RUN_BOUNDARY=PASS action=close runId={record['runId']} closed=YES")
    return 0


def invoke_self(args: list[str], record: dict[str, Any] | None = None) -> subprocess.CompletedProcess[str]:
    return run(
        [sys.executable, str(Path(__file__).resolve()), *args],
        None if record is None else json.dumps(record, ensure_ascii=False),
    )


def self_test() -> None:
    with tempfile.TemporaryDirectory(prefix="browser-run-boundary-") as temp:
        root = Path(temp)
        ledger = root / "ledger.jsonl"
        lease_dir = root / "leases"
        common = ["--ledger", str(ledger), "--lease-dir", str(lease_dir)]
        start_a = {
            "eventType": "AUTOMATION_START",
            "runId": "run-a",
            "project": "self-test",
            "scenario": "happy-path",
            "acceptanceMode": "DIRECT",
            "neededCapabilities": ["SEE"],
            "knownPathHit": True,
            "freshEvidenceWindowBound": False,
        }
        opened = invoke_self(["open", "--mode", "shared", "--input", "-", *common], start_a)
        if opened.returncode != 0:
            fail("self-test happy open failed", opened.stdout + opened.stderr)
        terminal_a = {
            "eventType": "AUTOMATION_RUN",
            "runId": "run-a",
            "outcome": "PASS",
            "failureClass": "NONE",
            "sideEffectState": "NOT_APPLICABLE",
        }
        closed = invoke_self(["close", "--input", "-", *common], terminal_a)
        if closed.returncode != 0:
            fail("self-test happy close failed", closed.stdout + closed.stderr)

        start_b = {**start_a, "runId": "run-b", "scenario": "shared-holder"}
        holder = invoke_self(["open", "--mode", "shared", "--input", "-", *common], start_b)
        if holder.returncode != 0:
            fail("self-test holder open failed", holder.stdout + holder.stderr)
        start_c = {**start_a, "runId": "run-c", "scenario": "exclusive-conflict"}
        blocked = invoke_self(["open", "--mode", "exclusive", "--input", "-", *common], start_c)
        if blocked.returncode != 3:
            fail("self-test conflict did not fail closed", blocked.stdout + blocked.stderr)
        events = [json.loads(line) for line in ledger.read_text(encoding="utf-8").splitlines() if line.strip()]
        c_events = [event for event in events if event.get("runId") == "run-c"]
        if [event.get("eventType") for event in c_events] != ["AUTOMATION_START", "AUTOMATION_RUN"]:
            fail("self-test conflict left incomplete run boundary")
        terminal_b = {
            "eventType": "AUTOMATION_RUN",
            "runId": "run-b",
            "outcome": "PASS",
            "failureClass": "NONE",
            "sideEffectState": "NOT_APPLICABLE",
        }
        closed_b = invoke_self(["close", "--input", "-", *common], terminal_b)
        if closed_b.returncode != 0:
            fail("self-test holder close failed", closed_b.stdout + closed_b.stderr)
    print("BROWSER_RUN_BOUNDARY_SELF_TEST=PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="action", required=True)

    open_parser = subparsers.add_parser("open")
    open_parser.add_argument("--mode", choices=["shared", "exclusive"], required=True)
    open_parser.add_argument("--input", required=True)
    open_parser.add_argument("--ledger", default=str(DEFAULT_LEDGER))
    open_parser.add_argument("--lease-dir", default=str(DEFAULT_LEASE_DIR))

    close_parser = subparsers.add_parser("close")
    close_parser.add_argument("--input", required=True)
    close_parser.add_argument("--ledger", default=str(DEFAULT_LEDGER))
    close_parser.add_argument("--lease-dir", default=str(DEFAULT_LEASE_DIR))

    subparsers.add_parser("self-test")
    args = parser.parse_args()

    if args.action == "self-test":
        self_test()
        return
    record = load_record(args.input)
    ledger = Path(args.ledger).expanduser().resolve()
    lease_dir = Path(args.lease_dir).expanduser().resolve()
    if args.action == "open":
        raise SystemExit(open_boundary(record, args.mode, ledger, lease_dir))
    raise SystemExit(close_boundary(record, ledger, lease_dir))


if __name__ == "__main__":
    main()
