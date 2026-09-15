#!/usr/bin/env python3
"""Coordinate shared Browser use and fail closed before global disruptive recovery.

This is local-only acceptance coordination, not product state and not Browser-readiness proof.
A Browser-control run acquires `shared`; a run must hold `exclusive` before any action
that can interrupt other consumers. Active use is tied to open Acceptance run boundaries.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MODES = {"shared", "exclusive"}
SKILL_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEDGER = SKILL_ROOT / ".runs" / "ledger.jsonl"
DEFAULT_LEASE_DIR = SKILL_ROOT / ".runs" / "browser-usage"


class GuardError(RuntimeError):
    pass


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_events(ledger: Path) -> list[dict[str, Any]]:
    if not ledger.exists():
        return []
    events: list[dict[str, Any]] = []
    try:
        for number, line in enumerate(ledger.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            value = json.loads(line)
            if not isinstance(value, dict):
                raise GuardError(f"ledger line {number} is not an object")
            events.append(value)
    except (OSError, json.JSONDecodeError) as exc:
        raise GuardError(f"cannot read acceptance ledger: {exc}") from exc
    return events


def run_state(events: list[dict[str, Any]], run_id: str) -> tuple[str, dict[str, Any] | None]:
    same = [event for event in events if event.get("runId") == run_id]
    starts = [event for event in same if event.get("eventType") == "AUTOMATION_START"]
    terminals = [event for event in same if event.get("eventType") == "AUTOMATION_RUN"]
    if len(starts) > 1 or len(terminals) > 1:
        raise GuardError(f"run boundary integrity failure: {run_id}")
    if len(starts) == 1 and len(terminals) == 0:
        return "open", starts[0]
    if len(starts) == 1 and len(terminals) == 1:
        return "closed", starts[0]
    if len(starts) == 0 and len(terminals) == 0:
        return "missing", None
    raise GuardError(f"run boundary incomplete: {run_id}")


def lease_path(lease_dir: Path, run_id: str) -> Path:
    digest = hashlib.sha256(run_id.encode("utf-8")).hexdigest()
    return lease_dir / f"{digest}.json"


def load_leases(lease_dir: Path) -> list[tuple[Path, dict[str, Any]]]:
    if not lease_dir.exists():
        return []
    leases: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(lease_dir.glob("*.json")):
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise GuardError(f"cannot read Browser lease {path.name}: {exc}") from exc
        if not isinstance(value, dict):
            raise GuardError(f"Browser lease is not an object: {path.name}")
        run_id = value.get("runId")
        mode = value.get("mode")
        if not isinstance(run_id, str) or not run_id or mode not in MODES:
            raise GuardError(f"Browser lease contract invalid: {path.name}")
        leases.append((path, value))
    return leases


def classify_leases(
    events: list[dict[str, Any]], leases: list[tuple[Path, dict[str, Any]]]
) -> tuple[list[tuple[Path, dict[str, Any]]], list[tuple[Path, dict[str, Any]]]]:
    active: list[tuple[Path, dict[str, Any]]] = []
    stale: list[tuple[Path, dict[str, Any]]] = []
    for path, lease in leases:
        state, _ = run_state(events, lease["runId"])
        if state == "open":
            active.append((path, lease))
        else:
            stale.append((path, lease))
    return active, stale


def atomic_write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def locked(lease_dir: Path):
    lease_dir.mkdir(parents=True, exist_ok=True)
    lock_path = lease_dir.parent / "browser-usage.lock"
    handle = lock_path.open("a+", encoding="utf-8")
    fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
    return handle


def conflict_text(leases: list[tuple[Path, dict[str, Any]]]) -> str:
    return ";".join(
        f"{lease['runId']}@{lease.get('project') or '-'}:{lease['mode']}"
        for _, lease in leases
    )


def acquire(ledger: Path, lease_dir: Path, run_id: str, mode: str) -> dict[str, Any]:
    if mode not in MODES:
        raise GuardError(f"unsupported mode: {mode}")
    handle = locked(lease_dir)
    try:
        events = load_events(ledger)
        state, start = run_state(events, run_id)
        if state != "open" or start is None:
            raise GuardError(f"acquire requires one open AUTOMATION_START: {run_id}")
        leases = load_leases(lease_dir)
        active, stale = classify_leases(events, leases)
        for path, _ in stale:
            path.unlink(missing_ok=True)

        others = [(path, lease) for path, lease in active if lease["runId"] != run_id]
        conflicts = (
            others
            if mode == "exclusive"
            else [(path, lease) for path, lease in others if lease["mode"] == "exclusive"]
        )
        if conflicts:
            raise GuardError(f"SHARED_BROWSER_IN_USE {conflict_text(conflicts)}")

        current = next((lease for _, lease in active if lease["runId"] == run_id), None)
        effective_mode = mode
        if current is not None and current["mode"] == "exclusive":
            effective_mode = "exclusive"
        lease = {
            "contract": "chat-local-browser-usage-lease.v1",
            "runId": run_id,
            "project": start.get("project"),
            "mode": effective_mode,
            "recordedAt": now(),
        }
        atomic_write(lease_path(lease_dir, run_id), lease)
        return {
            "action": "acquire",
            "runId": run_id,
            "project": start.get("project"),
            "mode": effective_mode,
            "activeOtherCount": len(others),
            "prunedStaleCount": len(stale),
        }
    finally:
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def release(ledger: Path, lease_dir: Path, run_id: str) -> dict[str, Any]:
    handle = locked(lease_dir)
    try:
        events = load_events(ledger)
        state, _ = run_state(events, run_id)
        if state != "closed":
            raise GuardError(f"release requires terminal AUTOMATION_RUN: {run_id}")
        path = lease_path(lease_dir, run_id)
        existed = path.exists()
        path.unlink(missing_ok=True)
        return {"action": "release", "runId": run_id, "released": existed}
    finally:
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def status(ledger: Path, lease_dir: Path) -> dict[str, Any]:
    handle = locked(lease_dir)
    try:
        events = load_events(ledger)
        active, stale = classify_leases(events, load_leases(lease_dir))
        return {
            "activeCount": len(active),
            "active": [lease for _, lease in active],
            "staleCount": len(stale),
            "stale": [lease for _, lease in stale],
        }
    finally:
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def append_event(ledger: Path, event: dict[str, Any]) -> None:
    with ledger.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, separators=(",", ":")) + "\n")


def self_test() -> None:
    with tempfile.TemporaryDirectory(prefix="browser-usage-guard-") as temp:
        root = Path(temp)
        ledger = root / "ledger.jsonl"
        lease_dir = root / "browser-usage"
        start_a = {"eventType": "AUTOMATION_START", "runId": "run-a", "project": "a"}
        start_b = {"eventType": "AUTOMATION_START", "runId": "run-b", "project": "b"}
        append_event(ledger, start_a)
        append_event(ledger, start_b)

        assert acquire(ledger, lease_dir, "run-a", "shared")["mode"] == "shared"
        assert acquire(ledger, lease_dir, "run-b", "shared")["mode"] == "shared"
        try:
            acquire(ledger, lease_dir, "run-a", "exclusive")
        except GuardError as exc:
            assert "SHARED_BROWSER_IN_USE" in str(exc)
        else:
            raise AssertionError("exclusive lease must fail while another shared run is active")

        append_event(ledger, {"eventType": "AUTOMATION_RUN", "runId": "run-b", "outcome": "DONE"})
        upgraded = acquire(ledger, lease_dir, "run-a", "exclusive")
        assert upgraded["mode"] == "exclusive"
        assert upgraded["prunedStaleCount"] == 1

        append_event(ledger, {"eventType": "AUTOMATION_START", "runId": "run-c", "project": "c"})
        try:
            acquire(ledger, lease_dir, "run-c", "shared")
        except GuardError as exc:
            assert "SHARED_BROWSER_IN_USE" in str(exc)
        else:
            raise AssertionError("shared lease must fail while another run holds exclusive")

        append_event(ledger, {"eventType": "AUTOMATION_RUN", "runId": "run-a", "outcome": "DONE"})
        assert release(ledger, lease_dir, "run-a")["released"] is True
        try:
            acquire(ledger, lease_dir, "run-a", "shared")
        except GuardError as exc:
            assert "open AUTOMATION_START" in str(exc)
        else:
            raise AssertionError("closed run must not acquire a Browser lease")

    print("BROWSER_USAGE_GUARD_SELF_TEST=PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ledger", default=str(DEFAULT_LEDGER))
    parser.add_argument("--lease-dir", default=str(DEFAULT_LEASE_DIR))
    subparsers = parser.add_subparsers(dest="action", required=True)

    acquire_parser = subparsers.add_parser("acquire")
    acquire_parser.add_argument("--run-id", required=True)
    acquire_parser.add_argument("--mode", choices=sorted(MODES), required=True)

    status_parser = subparsers.add_parser("status")
    status_parser.add_argument("--json", action="store_true")

    release_parser = subparsers.add_parser("release")
    release_parser.add_argument("--run-id", required=True)

    subparsers.add_parser("self-test")
    args = parser.parse_args()

    try:
        if args.action == "self-test":
            self_test()
            return
        ledger = Path(args.ledger).expanduser().resolve()
        lease_dir = Path(args.lease_dir).expanduser().resolve()
        if args.action == "acquire":
            result = acquire(ledger, lease_dir, args.run_id, args.mode)
            print(
                "BROWSER_USAGE_GUARD=PASS "
                f"action=acquire runId={result['runId']} mode={result['mode']} "
                f"activeOthers={result['activeOtherCount']} stalePruned={result['prunedStaleCount']}"
            )
            return
        if args.action == "release":
            result = release(ledger, lease_dir, args.run_id)
            print(
                "BROWSER_USAGE_GUARD=PASS "
                f"action=release runId={result['runId']} released={'YES' if result['released'] else 'NO'}"
            )
            return
        payload = status(ledger, lease_dir)
        if args.json:
            print(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
        else:
            print(
                "BROWSER_USAGE_GUARD=STATUS "
                f"active={payload['activeCount']} stale={payload['staleCount']}"
            )
            for lease in payload["active"]:
                print(
                    "ACTIVE | "
                    f"{lease['runId']} | {lease.get('project') or '-'} | {lease['mode']}"
                )
    except GuardError as exc:
        print(f"BROWSER_USAGE_GUARD=FAIL {exc}", file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
