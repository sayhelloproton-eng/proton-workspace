#!/usr/bin/env python3
"""Read-only detector for unmatched acceptance AUTOMATION_START records."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def fail(message: str) -> None:
    print(f"OPEN_RUN_CHECK=FAIL {message}", file=sys.stderr)
    raise SystemExit(2)


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
                fail(f"ledger line {number} is not an object")
            events.append(value)
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot read ledger: {exc}")
    return events


def summarize(events: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    by_run: dict[str, dict[str, Any]] = {}
    issues: list[str] = []
    for event in events:
        run_id = event.get("runId")
        event_type = event.get("eventType")
        if event_type not in {"AUTOMATION_START", "AUTOMATION_RUN"} or not isinstance(run_id, str):
            continue
        state = by_run.setdefault(run_id, {"starts": [], "terminals": []})
        key = "starts" if event_type == "AUTOMATION_START" else "terminals"
        state[key].append(event)

    open_runs: list[dict[str, Any]] = []
    for run_id, state in by_run.items():
        starts = state["starts"]
        terminals = state["terminals"]
        if len(starts) > 1:
            issues.append(f"duplicate starts for {run_id}: {len(starts)}")
        if len(terminals) > 1:
            issues.append(f"duplicate terminals for {run_id}: {len(terminals)}")
        if starts and not terminals:
            start = starts[0]
            open_runs.append(
                {
                    "runId": run_id,
                    "project": start.get("project"),
                    "scenario": start.get("scenario"),
                    "recordedAt": start.get("recordedAt"),
                }
            )

    open_runs.sort(key=lambda item: (str(item.get("recordedAt") or ""), item["runId"]))
    return open_runs, issues


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ledger", help="override acceptance ledger path")
    parser.add_argument("--run-id", help="limit to one runId")
    parser.add_argument("--project", help="limit to one exact project name")
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    parser.add_argument("--fail-on-open", action="store_true", help="exit 1 when selected open runs exist")
    args = parser.parse_args()

    ledger = (
        Path(args.ledger)
        if args.ledger
        else Path(__file__).resolve().parents[1] / ".runs" / "ledger.jsonl"
    )
    open_runs, issues = summarize(load_events(ledger))
    if args.run_id:
        open_runs = [item for item in open_runs if item["runId"] == args.run_id]
    if args.project:
        open_runs = [item for item in open_runs if item.get("project") == args.project]

    payload = {
        "ledger": str(ledger),
        "openCount": len(open_runs),
        "openRuns": open_runs,
        "integrityIssues": issues,
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    else:
        print(f"OPEN_RUN_CHECK={'OPEN' if open_runs else 'CLOSED'} count={len(open_runs)}")
        for item in open_runs:
            print(
                "OPEN | "
                f"{item['runId']} | {item.get('project') or '-'} | "
                f"{item.get('scenario') or '-'} | {item.get('recordedAt') or '-'}"
            )
        for issue in issues:
            print(f"INTEGRITY | {issue}", file=sys.stderr)

    if args.fail_on_open and open_runs:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
