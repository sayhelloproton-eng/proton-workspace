#!/usr/bin/env python3
"""Deterministic semantic and negative-regression gate for this Acceptance Skill."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def fail(message: str) -> None:
    print(f"ACCEPTANCE_BASELINE=FAIL {message}", file=sys.stderr)
    raise SystemExit(2)


def require(text: str, token: str, owner: str) -> None:
    if token not in text:
        fail(f"missing {token!r} in {owner}")


def run_logger(root: Path, record: dict, ledger_path: Path) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return subprocess.run(
        [sys.executable, str(root / "scripts/append-run-log.py"), "--input", "-", "--ledger", str(ledger_path)],
        input=json.dumps(record),
        text=True,
        capture_output=True,
        env=env,
        timeout=20,
        check=False,
    )


def expect_logger(root: Path, record: dict, should_pass: bool, label: str) -> None:
    with tempfile.TemporaryDirectory(prefix="acceptance-log-probe-") as temp:
        result = run_logger(root, record, Path(temp) / "ledger.jsonl")
        passed = result.returncode == 0
        if passed != should_pass:
            fail(f"logger probe {label} expected {'PASS' if should_pass else 'FAIL'} but exit={result.returncode}")


def expect_logger_sequence(root: Path, steps: list[tuple[dict, bool]], label: str) -> None:
    with tempfile.TemporaryDirectory(prefix="acceptance-log-sequence-") as temp:
        ledger = Path(temp) / "ledger.jsonl"
        for index, (record, should_pass) in enumerate(steps, 1):
            result = run_logger(root, record, ledger)
            passed = result.returncode == 0
            if passed != should_pass:
                fail(f"logger sequence {label} step {index} expected {'PASS' if should_pass else 'FAIL'} but exit={result.returncode}")


def check_text_hygiene(root: Path) -> None:
    for path in root.rglob("*"):
        if not path.is_file() or ".runs" in path.parts or "__pycache__" in path.parts:
            continue
        if path.name == ".DS_Store":
            fail(".DS_Store must not be a Skill artifact")
        if path.suffix not in {".md", ".py", ".yaml", ".yml"} and path.name != ".gitignore":
            continue
        text = path.read_text(encoding="utf-8")
        for number, line in enumerate(text.splitlines(), 1):
            if line.endswith(" ") or line.endswith("\t"):
                fail(f"trailing whitespace: {path.relative_to(root)}:{number}")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    required_paths = [
        ".gitignore", "SKILL.md", "agents/openai.yaml",
        "references/common-capabilities.md", "references/browser-and-system-ui.md",
        "references/cli-pty-and-process.md", "references/tool-runtime-and-auth.md",
        "references/validation-baseline.md", "references/lost-context-regression.md",
        "references/run-logging.md", "references/skill-evolution.md",
        "references/project-instructions.md", "scripts/append-run-log.py",
        "scripts/validate-baseline.py", "scripts/validate-skill.py",
    ]
    for relative in required_paths:
        if not (root / relative).is_file():
            fail(f"missing required file: {relative}")

    skill = (root / "SKILL.md").read_text(encoding="utf-8")
    common = (root / "references/common-capabilities.md").read_text(encoding="utf-8")
    browser = (root / "references/browser-and-system-ui.md").read_text(encoding="utf-8")
    runtime = (root / "references/tool-runtime-and-auth.md").read_text(encoding="utf-8")
    logging = (root / "references/run-logging.md").read_text(encoding="utf-8")
    project = (root / "references/project-instructions.md").read_text(encoding="utf-8")
    lost = (root / "references/lost-context-regression.md").read_text(encoding="utf-8")
    validation = (root / "references/validation-baseline.md").read_text(encoding="utf-8")
    evolution = (root / "references/skill-evolution.md").read_text(encoding="utf-8")
    ignore = (root / ".gitignore").read_text(encoding="utf-8")

    capabilities = ["SEE", "IDENTIFY", "ACT", "WAIT", "LISTEN", "CONNECT", "AUTHENTICATE", "RECOVER", "VERIFY"]
    for capability in capabilities:
        require(skill, f"`{capability}`", "SKILL.md")

    hard_rules = [
        "SINGLE-AUTOMATION-SOURCE-OF-TRUTH", "EYES-FIRST", "IDENTIFY-BEFORE-MUTATE",
        "KNOWN-PATH-FIRST", "FIRST-DIVERGENCE-BEFORE-FALLBACK", "USER-PATH-INTEGRITY",
        "ACCEPTANCE-LEVEL-AWARE", "CHECKPOINT-AFTER-PROOF", "FAILURE-CLASSIFY-BEFORE-REPAIR",
        "SIDE-EFFECT-RECONCILIATION", "MINIMUM-SUFFICIENT-PROOF",
        "CONTINUE-EXISTING-BEFORE-RESTART", "RUN-BOUNDARY-FIRST", "RETURN-CONTROL-CLOSES-RUN",
        "HARNESS-VALID-BEFORE-SCORING", "EVIDENCE-GOVERNED-EVOLUTION",
        "DETERMINISTIC-MECHANICS-BELOW-MODEL", "REALITY-IS-ACCEPTANCE-NOT-THE-MAIN-DEBUGGER",
    ]
    for rule in hard_rules:
        require(skill, rule, "SKILL.md")

    for token in ("Observation is read-only by default", "Uncertain mutation requires reconciliation"):
        require(common, token, "common-capabilities.md")
    if "## Script promotion rule" in common:
        fail("script promotion has duplicate semantic owner in common-capabilities.md")

    require(browser, "`SEE` is observation, not a hidden mutation channel", "browser-and-system-ui.md")
    require(browser, "APPLIED | NOT_APPLIED | UNKNOWN", "browser-and-system-ui.md")

    for token in (
        "/Users/agent/.config/openai/tunnel-client/playwright-chrome.env",
        "/Users/agent/Library/Application Support/tunnel-client/health/<alias>.url",
        "SHARED-RUNTIME-OWNER-FIRST", "Do not directly spawn a second raw MCP server",
        "Browser control ownership", "runtime_state=ready", "browser_tabs",
    ):
        require(runtime, token, "tool-runtime-and-auth.md")

    for token in (
        "LOCAL_ACCEPTANCE_AUTOMATION_PROTOCOL=v1",
        "必须先使用 Local Dev 读取并注入当前本机",
        "/Users/agent/Desktop/proton-workspace/skills/chat-local-acceptance-automation-protocol/SKILL.md",
        "在 Skill 读取完成前，不得开始任何本机 Acceptance 自动化操作",
        "唯一 Source of Truth",
    ):
        require(project, token, "project-instructions.md")
    for forbidden in (
        "EXECUTION_ENTRY", "CANONICAL_ASSET", "AUTHORITY_SOURCE", "RECOVERY_PATH", "DO_NOT_REPEAT",
        "CURRENT", "writeback", "Browser", "CLI", "PTY", "MCP",
    ):
        if forbidden in project:
            fail(f"legacy project-instructions responsibility remains: {forbidden}")

    for index in range(1, 25):
        require(lost, f"## R{index} —", "lost-context-regression.md")
    for index in range(1, 10):
        require(lost, f"`B{index}", "lost-context-regression.md")

    for layer in ("L0", "L1", "L2", "L3"):
        require(validation, f"### {layer}", "validation-baseline.md")
    for token in (
        "scripts/validate-skill.py", "secret-like values", "Single-source regression",
        "SINGLE-AUTOMATION-SOURCE-OF-TRUTH", "missing AUTOMATION_START",
        "shared-runtime owner-first / duplicate-spawn guard", "Runtime/API owner proof first",
    ):
        require(validation, token, "validation-baseline.md")

    evolution_anchors = [
        "## MAINLINE-FIRST", "OBSERVE → CLASSIFY → PLACE → PROMOTE → MUTATE → VALIDATE → LEARN",
        "## Script promotion gate — SOLE OWNER", "references/projects/<project>.md",
        "PROJECT_REFERENCE_UPDATE", "REMOVE_OR_MERGE_EXISTING_GUIDANCE",
        "8 completed comparable runs", "scripts/validate-skill.py",
    ]
    for token in evolution_anchors:
        require(evolution, token, "skill-evolution.md")

    for token in (".runs/", "__pycache__/", "*.py[cod]"):
        require(ignore, token, ".gitignore")

    for token in (
        "CONTEXT_KNOWLEDGE_MIGRATION_GAP", "sideEffectState", "embedded secret-like values",
        "AUTOMATION_START", "TERMINAL_RUN_LOG_MISSED", "freshEvidenceWindowBound",
        ".runs/tmp/<runId>/", ".runs/artifacts/<runId>/",
    ):
        require(logging, token, "run-logging.md")

    for token in ("Fast fresh-window path", "runtime readiness", "log cursor/offset"):
        require((root / "references/cli-pty-and-process.md").read_text(encoding="utf-8"), token, "cli-pty-and-process.md")

    check_text_hygiene(root)

    start = {
        "eventType": "AUTOMATION_START", "runId": "baseline-valid",
        "neededCapabilities": ["LISTEN", "VERIFY"], "freshEvidenceWindowBound": True,
        "acceptanceMode": "DIRECT",
    }
    terminal = {
        "runId": "baseline-valid", "outcome": "DONE", "failureClass": "NONE",
        "sideEffectState": "NOT_APPLICABLE", "testLayer": "L2",
        "harnessValidity": "VALID", "behavioralVerdict": "PASS",
    }
    expect_logger_sequence(root, [(start, True), (terminal, True)], "paired-valid-l2")
    expect_logger_sequence(root, [(start, True), (start, False)], "duplicate-start")
    expect_logger(root, terminal, False, "terminal-without-start")
    expect_logger(
        root,
        {"eventType": "AUTOMATION_START", "runId": "fresh-window-required", "neededCapabilities": ["LISTEN"], "freshEvidenceWindowBound": False},
        False,
        "listen-without-fresh-window",
    )

    retrospective = {
        "runId": "retrospective-valid", "outcome": "BLOCKED",
        "failureClass": "PREREQUISITE_NOT_READY", "sideEffectState": "NOT_APPLICABLE",
        "retrospectiveReconciliation": True, "evidenceProvenance": "authoritative runtime readback",
        "capabilityMisses": ["TERMINAL_RUN_LOG_MISSED"],
    }
    expect_logger(root, retrospective, True, "retrospective-valid")
    expect_logger(root, {**retrospective, "evidenceProvenance": ""}, False, "retrospective-no-provenance")
    expect_logger(root, {**retrospective, "capabilityMisses": []}, False, "retrospective-no-miss")

    negative_base = {**retrospective, "runId": "negative-base"}
    expect_logger(root, {**negative_base, "harnessValidity": "INVALID", "behavioralVerdict": "PASS"}, False, "invalid-harness-pass")
    expect_logger(root, {**negative_base, "testLayer": "L9"}, False, "invalid-layer")
    expect_logger(root, {**negative_base, "sideEffectState": "MAYBE"}, False, "invalid-side-effect")
    expect_logger(root, {**negative_base, "apiKey": "dummy"}, False, "secret-key")
    expect_logger(root, {**negative_base, "note": "PLAYWRIGHT_MCP_EXTENSION_TOKEN=dummy-not-a-real-secret"}, False, "secret-value")
    expect_logger(root, {**negative_base, "failureClass": "CONTEXT_KNOWLEDGE_MIGRATION_GAP"}, True, "context-gap-class")

    public_core = skill + common + browser + runtime + validation + evolution
    for forbidden in ("Real-3", "@tomflow", "platform start", "ProFlow Tasks"):
        if forbidden in public_core:
            fail(f"project-specific token leaked into common core: {forbidden}")

    print("ACCEPTANCE_BASELINE=PASS")
    print("CAPABILITY_COUNT=9")
    print("REGRESSION_SCENARIOS=24")
    print("BEHAVIORAL_SMOKE_CASES=9")
    print("SINGLE_AUTOMATION_TRUTH=PASS")
    print("RUN_BOUNDARY_GUARDS=PASS")
    print("LOGGER_GUARDS=PASS")
    print("EVOLUTION_GOVERNANCE=PASS")


if __name__ == "__main__":
    main()
