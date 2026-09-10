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


def run_logger(root: Path, record: dict) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    with tempfile.TemporaryDirectory(prefix="acceptance-log-probe-") as temp:
        input_path = Path(temp) / "event.json"
        ledger_path = Path(temp) / "ledger.jsonl"
        input_path.write_text(json.dumps(record), encoding="utf-8")
        return subprocess.run(
            [sys.executable, str(root / "scripts/append-run-log.py"), "--input", str(input_path), "--ledger", str(ledger_path)],
            text=True,
            capture_output=True,
            env=env,
            timeout=20,
            check=False,
        )


def expect_logger(root: Path, record: dict, should_pass: bool, label: str) -> None:
    result = run_logger(root, record)
    passed = result.returncode == 0
    if passed != should_pass:
        fail(f"logger probe {label} expected {'PASS' if should_pass else 'FAIL'} but exit={result.returncode}")


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
        "CONTINUE-EXISTING-BEFORE-RESTART", "HARNESS-VALID-BEFORE-SCORING",
        "EVIDENCE-GOVERNED-EVOLUTION", "DETERMINISTIC-MECHANICS-BELOW-MODEL",
        "REALITY-IS-ACCEPTANCE-NOT-THE-MAIN-DEBUGGER",
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

    for index in range(1, 24):
        require(lost, f"## R{index} —", "lost-context-regression.md")
    for index in range(1, 9):
        require(lost, f"`B{index}", "lost-context-regression.md")

    for layer in ("L0", "L1", "L2", "L3"):
        require(validation, f"### {layer}", "validation-baseline.md")
    for token in (
        "scripts/validate-skill.py", "secret-like values", "Single-source regression",
        "SINGLE-AUTOMATION-SOURCE-OF-TRUTH",
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

    for token in ("CONTEXT_KNOWLEDGE_MIGRATION_GAP", "sideEffectState", "embedded secret-like values"):
        require(logging, token, "run-logging.md")

    check_text_hygiene(root)

    valid = {
        "runId": "baseline-valid", "outcome": "DONE", "failureClass": "NONE",
        "sideEffectState": "NOT_APPLICABLE", "testLayer": "L2",
        "harnessValidity": "VALID", "behavioralVerdict": "PASS",
    }
    expect_logger(root, valid, True, "valid-l2")
    expect_logger(root, {**valid, "harnessValidity": "INVALID", "behavioralVerdict": "PASS"}, False, "invalid-harness-pass")
    expect_logger(root, {**valid, "testLayer": "L9"}, False, "invalid-layer")
    expect_logger(root, {**valid, "sideEffectState": "MAYBE"}, False, "invalid-side-effect")
    expect_logger(root, {**valid, "apiKey": "dummy"}, False, "secret-key")
    expect_logger(root, {**valid, "note": "PLAYWRIGHT_MCP_EXTENSION_TOKEN=dummy-not-a-real-secret"}, False, "secret-value")
    expect_logger(root, {**valid, "failureClass": "CONTEXT_KNOWLEDGE_MIGRATION_GAP"}, True, "context-gap-class")

    public_core = skill + common + browser + runtime + validation + evolution
    for forbidden in ("Real-3", "@tomflow", "platform start", "ProFlow Tasks"):
        if forbidden in public_core:
            fail(f"project-specific token leaked into common core: {forbidden}")

    print("ACCEPTANCE_BASELINE=PASS")
    print("CAPABILITY_COUNT=9")
    print("REGRESSION_SCENARIOS=23")
    print("BEHAVIORAL_SMOKE_CASES=8")
    print("SINGLE_AUTOMATION_TRUTH=PASS")
    print("LOGGER_GUARDS=PASS")
    print("EVOLUTION_GOVERNANCE=PASS")


if __name__ == "__main__":
    main()
