#!/usr/bin/env python3
"""Append one compact, schema-validated Chat local engineering throughput event."""

from __future__ import annotations

import argparse
import fcntl
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MAX_RECORD_BYTES = 16 * 1024
EVENT_TYPES = {"DECISION", "WALL_UPDATE", "BATCH_REVIEW"}
PHASE_KEYS = (
    "bootstrap",
    "caseSetup",
    "acquire",
    "semantic",
    "bundle",
    "apply",
    "verify",
    "recovery",
    "postDone",
)
DECISION_KEYS = {
    "eventType", "recordedAt", "id", "scenario", "outcome", "userWallSec",
    "wallStatus", "phaseTimingsMs", "phaseTimingStatus", "avoidableCalls",
    "LSR_AFTER_SNAPSHOT", "LMR", "verifyStarts", "resultCorrectness",
    "processCorrectness", "throughputGate", "failureFamilies", "note",
    "runnerReadyToPayloadGapMs", "dataPlanePayloadTransactions",
    "modelAuthoredManifest", "readyToPayloadInterveningToolCalls",
}
WALL_UPDATE_KEYS = {"eventType", "recordedAt", "targetId", "userWallSec", "note"}
BATCH_REVIEW_KEYS = {
    "eventType", "recordedAt", "id", "note", "resolvedWallCount", "recordCount",
}
SECRET_KEY_RE = re.compile(
    r"(?:^|[_-])(?:token|secret|password|passwd|credential|authorization|api[_-]?key)(?:$|[_-])|"
    r"(?:token|secret|password|passwd|credential|authorization|api[_-]?key)$",
    re.IGNORECASE,
)
SECRET_VALUE_RES = (
    re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{8,}", re.IGNORECASE),
    re.compile(
        r"\b(?:ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN|ID[_-]?TOKEN|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTHORIZATION|API[_-]?KEY|APIKEY)\s*[:=]\s*[^\s,;]+",
        re.IGNORECASE,
    ),
    re.compile(
        r"[?&](?:token|access_token|refresh_token|id_token|api_key|apikey|secret|password|credential)=[^&\s]+",
        re.IGNORECASE,
    ),
)
SKILL_ROOT = Path(__file__).resolve().parents[1]
CONTROLLED_INPUT_ROOT = SKILL_ROOT / ".throughput" / "tmp"


def fail(message: str) -> None:
    print(f"THROUGHPUT_LOGGING=FAIL {message}", file=sys.stderr)
    raise SystemExit(2)


def reject_secrets(value: Any, path: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if SECRET_KEY_RE.search(str(key)):
                fail(f"secret-like field rejected at {path}.{key}")
            reject_secrets(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            reject_secrets(child, f"{path}[{index}]")
    elif isinstance(value, str) and any(pattern.search(value) for pattern in SECRET_VALUE_RES):
        fail(f"secret-like value rejected at {path}")


def resolve_input_path(input_arg: str) -> Path | None:
    if input_arg == "-":
        return None
    path = Path(input_arg).expanduser().resolve()
    root = CONTROLLED_INPUT_ROOT.resolve()
    try:
        path.relative_to(root)
    except ValueError:
        fail(f"file input must be under {root} or use --input -")
    return path


def load_record(input_arg: str) -> tuple[dict[str, Any], Path | None]:
    input_path = resolve_input_path(input_arg)
    try:
        text = sys.stdin.read() if input_path is None else input_path.read_text(encoding="utf-8")
        record = json.loads(text)
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot read input JSON: {exc}")
    if not isinstance(record, dict):
        fail("input JSON must be an object")
    return record, input_path


def cleanup_input(input_path: Path | None) -> bool:
    if input_path is None:
        return True
    try:
        input_path.unlink()
        root = CONTROLLED_INPUT_ROOT.resolve()
        parent = input_path.parent
        while parent != root:
            try:
                parent.rmdir()
            except OSError:
                break
            parent = parent.parent
        return True
    except OSError as exc:
        print(f"THROUGHPUT_INPUT_CLEANUP=FAIL path={input_path} error={exc}", file=sys.stderr)
        return False


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
        fail(f"cannot read existing ledger: {exc}")
    return events


def require_string(record: dict[str, Any], field: str) -> None:
    if not isinstance(record.get(field), str) or not record[field].strip():
        fail(f"{field} must be a non-empty string")


def require_nonnegative_number(value: Any, field: str, allow_null: bool = False) -> None:
    if value is None and allow_null:
        return
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
        fail(f"{field} must be a non-negative number{' or null' if allow_null else ''}")


def require_nonnegative_int(record: dict[str, Any], field: str) -> None:
    value = record.get(field)
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        fail(f"{field} must be a non-negative integer")


def reject_unknown(record: dict[str, Any], allowed: set[str]) -> None:
    unknown = sorted(set(record) - allowed)
    if unknown:
        fail(f"unknown fields: {','.join(unknown)}")


def validate_decision(record: dict[str, Any], events: list[dict[str, Any]]) -> None:
    reject_unknown(record, DECISION_KEYS)
    for field in ("id", "scenario", "outcome", "resultCorrectness", "processCorrectness", "throughputGate"):
        require_string(record, field)
    if any(event.get("id") == record["id"] and event.get("eventType", event.get("type")) == "DECISION" for event in events):
        fail(f"duplicate DECISION id: {record['id']}")

    phases = record.get("phaseTimingsMs")
    if not isinstance(phases, dict) or set(phases) != set(PHASE_KEYS):
        fail("phaseTimingsMs must contain exactly the canonical phase keys")
    for key in PHASE_KEYS:
        require_nonnegative_number(phases[key], f"phaseTimingsMs.{key}", allow_null=True)

    if record.get("phaseTimingStatus") not in {"PARTIAL", "COMPLETE"}:
        fail("phaseTimingStatus must be PARTIAL or COMPLETE")
    wall_status = record.get("wallStatus")
    if wall_status not in {"PENDING_UI", "RESOLVED", "NOT_APPLICABLE"}:
        fail("wallStatus must be PENDING_UI, RESOLVED, or NOT_APPLICABLE")
    user_wall = record.get("userWallSec")
    if wall_status == "PENDING_UI" and user_wall is not None:
        fail("PENDING_UI requires userWallSec=null")
    if wall_status == "RESOLVED":
        require_nonnegative_number(user_wall, "userWallSec")
    elif user_wall is not None:
        require_nonnegative_number(user_wall, "userWallSec")

    for field in ("avoidableCalls", "LSR_AFTER_SNAPSHOT", "LMR", "verifyStarts"):
        require_nonnegative_int(record, field)
    for field in ("dataPlanePayloadTransactions", "readyToPayloadInterveningToolCalls"):
        if field in record:
            require_nonnegative_int(record, field)
    if "runnerReadyToPayloadGapMs" in record:
        require_nonnegative_number(record["runnerReadyToPayloadGapMs"], "runnerReadyToPayloadGapMs", allow_null=True)
    if "modelAuthoredManifest" in record and not isinstance(record["modelAuthoredManifest"], bool):
        fail("modelAuthoredManifest must be boolean")

    families = record.get("failureFamilies")
    if not isinstance(families, list) or any(not isinstance(item, str) for item in families):
        fail("failureFamilies must be a string array")
    if "note" in record and (not isinstance(record["note"], str) or len(record["note"]) > 2048):
        fail("note must be a string at most 2048 characters")


def validate_wall_update(record: dict[str, Any], events: list[dict[str, Any]]) -> None:
    reject_unknown(record, WALL_UPDATE_KEYS)
    require_string(record, "targetId")
    require_nonnegative_number(record.get("userWallSec"), "userWallSec")
    if not any(event.get("id") == record["targetId"] for event in events):
        fail(f"WALL_UPDATE target does not exist: {record['targetId']}")
    if "note" in record and not isinstance(record["note"], str):
        fail("note must be a string")


def validate_batch_review(record: dict[str, Any]) -> None:
    reject_unknown(record, BATCH_REVIEW_KEYS)
    require_string(record, "id")
    require_string(record, "note")
    for field in ("resolvedWallCount", "recordCount"):
        if field in record:
            require_nonnegative_int(record, field)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help=f"JSON from stdin (-) or a controlled file under {CONTROLLED_INPUT_ROOT}")
    parser.add_argument("--ledger", help="override ledger path, primarily for tests")
    args = parser.parse_args()

    record, input_path = load_record(args.input)
    event_type = record.get("eventType")
    if event_type not in EVENT_TYPES:
        fail(f"eventType must be one of: {','.join(sorted(EVENT_TYPES))}")
    reject_secrets(record)

    ledger = Path(args.ledger) if args.ledger else Path(__file__).resolve().parents[1] / ".throughput" / "ledger.jsonl"
    events = load_events(ledger)
    if event_type == "DECISION":
        validate_decision(record, events)
    elif event_type == "WALL_UPDATE":
        validate_wall_update(record, events)
    else:
        validate_batch_review(record)

    record.setdefault("recordedAt", datetime.now(timezone.utc).isoformat())
    payload = json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
    if len(payload.encode("utf-8")) > MAX_RECORD_BYTES:
        fail(f"record exceeds {MAX_RECORD_BYTES} bytes")

    ledger.parent.mkdir(parents=True, exist_ok=True)
    with ledger.open("a", encoding="utf-8") as handle:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        handle.write(payload)
        handle.flush()
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    cleanup_ok = cleanup_input(input_path)
    input_mode = "stdin" if input_path is None else "controlled-file"
    print(f"THROUGHPUT_LOGGING=PASS eventType={event_type} ledger={ledger} input={input_mode} cleanup={'PASS' if cleanup_ok else 'FAIL'}")


if __name__ == "__main__":
    main()
