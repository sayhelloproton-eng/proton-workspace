#!/usr/bin/env python3
"""Append one compact, validated acceptance telemetry event."""

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
CAPABILITIES = {"SEE", "IDENTIFY", "ACT", "WAIT", "LISTEN", "CONNECT", "AUTHENTICATE", "RECOVER", "VERIFY"}
FRESH_WINDOW_CAPABILITIES = {"WAIT", "LISTEN", "CONNECT", "RECOVER"}
ACCEPTANCE_MODES = {"DIRECT", "SAME_SCENE", "FAST_REPLAY", "FULL_FRESH"}
FAILURE_CLASSES = {
    "NONE", "HUMAN_EXTERNAL", "PREREQUISITE_NOT_READY", "HARNESS_FAILURE",
    "TOOL_RUNTIME_FAILURE", "PRODUCT_DEFECT", "SPEC_EXTERNAL_MISMATCH",
    "CONTEXT_KNOWLEDGE_MIGRATION_GAP", "UNKNOWN",
}
SIDE_EFFECT_STATES = {"NOT_APPLICABLE", "APPLIED", "NOT_APPLIED", "UNKNOWN"}
TEST_LAYERS = {"L0", "L1", "L2", "L3"}
HARNESS_VALIDITIES = {"VALID", "INVALID", "NOT_APPLICABLE"}
BEHAVIORAL_VERDICTS = {"PASS", "PASS_WITH_MISS", "FAIL", "INVALID", "NOT_APPLICABLE"}
EVENT_TYPES = {"AUTOMATION_START", "AUTOMATION_RUN", "WALL_UPDATE", "BATCH_REVIEW"}
SECRET_KEY_RE = re.compile(
    r"(?:^|[_-])(?:token|secret|password|passwd|credential|authorization|api[_-]?key)(?:$|[_-])|"
    r"(?:token|secret|password|passwd|credential|authorization|api[_-]?key)$",
    re.IGNORECASE,
)
SECRET_VALUE_RES = (
    re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{8,}", re.IGNORECASE),
    re.compile(
        r"\b(?:PLAYWRIGHT_MCP_EXTENSION_TOKEN|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN|ID[_-]?TOKEN|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTHORIZATION|API[_-]?KEY|APIKEY)\s*[:=]\s*[^\s,;]+",
        re.IGNORECASE,
    ),
    re.compile(
        r"[?&](?:token|access_token|refresh_token|id_token|api_key|apikey|secret|password|credential)=[^&\s]+",
        re.IGNORECASE,
    ),
)
SKILL_ROOT = Path(__file__).resolve().parents[1]
CONTROLLED_INPUT_ROOT = SKILL_ROOT / ".runs" / "tmp"


def fail(message: str) -> None:
    print(f"AUTOMATION_LOGGING=FAIL {message}", file=sys.stderr)
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
    elif isinstance(value, str):
        if any(pattern.search(value) for pattern in SECRET_VALUE_RES):
            fail(f"secret-like value rejected at {path}")


def validate_capabilities(record: dict[str, Any]) -> None:
    for field in ("neededCapabilities", "usedCapabilities"):
        value = record.get(field)
        if value is None:
            continue
        if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
            fail(f"{field} must be a string array")
        unknown = sorted(set(value) - CAPABILITIES)
        if unknown:
            fail(f"unknown capabilities in {field}: {','.join(unknown)}")

    misses = record.get("capabilityMisses")
    if misses is not None and (not isinstance(misses, list) or any(not isinstance(item, str) for item in misses)):
        fail("capabilityMisses must be a string array")

    for field in ("knownPathHit", "minimumSufficientProof", "eyesUsedWhenVisible", "freshEvidenceWindowBound", "retrospectiveReconciliation"):
        value = record.get(field)
        if value is not None and not isinstance(value, bool):
            fail(f"{field} must be boolean or null")


def validate_enum(record: dict[str, Any], field: str, allowed: set[str]) -> None:
    value = record.get(field)
    if value is not None and (not isinstance(value, str) or value not in allowed):
        fail(f"{field} must be one of: {','.join(sorted(allowed))}")


def validate_routing(record: dict[str, Any]) -> None:
    validate_enum(record, "acceptanceMode", ACCEPTANCE_MODES)
    validate_enum(record, "failureClass", FAILURE_CLASSES)
    validate_enum(record, "sideEffectState", SIDE_EFFECT_STATES)


def validate_behavior(record: dict[str, Any]) -> None:
    validate_enum(record, "testLayer", TEST_LAYERS)
    validate_enum(record, "harnessValidity", HARNESS_VALIDITIES)
    validate_enum(record, "behavioralVerdict", BEHAVIORAL_VERDICTS)

    layer = record.get("testLayer")
    harness = record.get("harnessValidity")
    verdict = record.get("behavioralVerdict")

    if layer == "L2" and (harness is None or verdict is None):
        fail("L2 requires harnessValidity and behavioralVerdict")
    if harness == "INVALID" and verdict != "INVALID":
        fail("harnessValidity=INVALID requires behavioralVerdict=INVALID")
    if verdict == "INVALID" and harness != "INVALID":
        fail("behavioralVerdict=INVALID requires harnessValidity=INVALID")
    if harness == "VALID" and verdict == "NOT_APPLICABLE":
        fail("harnessValidity=VALID cannot use behavioralVerdict=NOT_APPLICABLE")


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
        print(f"AUTOMATION_INPUT_CLEANUP=FAIL path={input_path} error={exc}", file=sys.stderr)
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


def validate_run_boundary(record: dict[str, Any], event_type: str, events: list[dict[str, Any]]) -> None:
    run_id = record.get("runId")
    same = [event for event in events if event.get("runId") == run_id]
    starts = [event for event in same if event.get("eventType") == "AUTOMATION_START"]
    terminals = [event for event in same if event.get("eventType") == "AUTOMATION_RUN"]

    if event_type == "AUTOMATION_START":
        if not isinstance(record.get("freshEvidenceWindowBound"), bool):
            fail("AUTOMATION_START requires freshEvidenceWindowBound boolean")
        if starts or terminals:
            fail(f"runId already has a run boundary: {run_id}")
        needed = set(record.get("neededCapabilities") or [])
        if needed & FRESH_WINDOW_CAPABILITIES and record.get("freshEvidenceWindowBound") is not True:
            fail("WAIT/LISTEN/CONNECT/RECOVER start requires freshEvidenceWindowBound=true")
        return

    if event_type != "AUTOMATION_RUN":
        return
    if terminals:
        fail(f"runId already has a terminal AUTOMATION_RUN: {run_id}")

    retrospective = record.get("retrospectiveReconciliation") is True
    if retrospective:
        provenance = record.get("evidenceProvenance")
        misses = record.get("capabilityMisses") or []
        if not isinstance(provenance, str) or not provenance.strip():
            fail("retrospective reconciliation requires evidenceProvenance")
        if "TERMINAL_RUN_LOG_MISSED" not in misses:
            fail("retrospective reconciliation requires TERMINAL_RUN_LOG_MISSED")
    elif len(starts) != 1:
        fail("AUTOMATION_RUN requires exactly one prior AUTOMATION_START")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help=f"JSON from stdin (-) or a controlled file under {CONTROLLED_INPUT_ROOT}")
    parser.add_argument("--ledger", help="override ledger path, primarily for tests")
    args = parser.parse_args()

    record, input_path = load_record(args.input)
    event_type = record.setdefault("eventType", "AUTOMATION_RUN")
    if event_type not in EVENT_TYPES:
        fail(f"unsupported eventType: {event_type}")
    if event_type in {"AUTOMATION_START", "AUTOMATION_RUN", "WALL_UPDATE"} and not record.get("runId"):
        fail("runId is required")
    if event_type == "AUTOMATION_RUN" and not record.get("outcome"):
        fail("outcome is required for AUTOMATION_RUN")

    validate_capabilities(record)
    validate_routing(record)
    validate_behavior(record)
    reject_secrets(record)

    ledger = Path(args.ledger) if args.ledger else Path(__file__).resolve().parents[1] / ".runs" / "ledger.jsonl"
    events = load_events(ledger)
    validate_run_boundary(record, event_type, events)

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
    print(f"AUTOMATION_LOGGING=PASS eventType={event_type} ledger={ledger} input={input_mode} cleanup={'PASS' if cleanup_ok else 'FAIL'}")


if __name__ == "__main__":
    main()
