#!/usr/bin/env python3
"""Deterministic semantic and negative-regression gate for this Acceptance Skill."""
from __future__ import annotations
import json, os, subprocess, sys, tempfile
from pathlib import Path

def fail(message: str) -> None:
    print(f"ACCEPTANCE_BASELINE=FAIL {message}", file=sys.stderr)
    raise SystemExit(2)

def require(text: str, token: str, owner: str) -> None:
    if token not in text:
        fail(f"missing {token!r} in {owner}")

def run(args: list[str], cwd: Path, env: dict[str, str], timeout: int) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, env=env, text=True, capture_output=True, timeout=timeout, check=False)

def run_logger(root: Path, record: dict, ledger: Path) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy(); env["PYTHONDONTWRITEBYTECODE"] = "1"
    return subprocess.run([sys.executable, str(root / "scripts/append-run-log.py"), "--input", "-", "--ledger", str(ledger)], input=json.dumps(record), text=True, capture_output=True, env=env, timeout=20, check=False)

def expect(root: Path, record: dict, should_pass: bool, label: str) -> None:
    with tempfile.TemporaryDirectory(prefix="acceptance-log-probe-") as temp:
        result = run_logger(root, record, Path(temp) / "ledger.jsonl")
        if (result.returncode == 0) != should_pass:
            fail(f"logger probe {label} expected {'PASS' if should_pass else 'FAIL'} but exit={result.returncode}")

def expect_sequence(root: Path, steps: list[tuple[dict, bool]], label: str) -> None:
    with tempfile.TemporaryDirectory(prefix="acceptance-log-sequence-") as temp:
        ledger = Path(temp) / "ledger.jsonl"
        for index, (record, should_pass) in enumerate(steps, 1):
            result = run_logger(root, record, ledger)
            if (result.returncode == 0) != should_pass:
                fail(f"logger sequence {label} step {index} expected {'PASS' if should_pass else 'FAIL'} but exit={result.returncode}")

def check_text_hygiene(root: Path) -> None:
    for path in root.rglob("*"):
        if not path.is_file() or ".runs" in path.parts or "__pycache__" in path.parts: continue
        if path.name == ".DS_Store": fail(".DS_Store must not be a Skill artifact")
        if path.suffix not in {".md", ".py", ".yaml", ".yml"} and path.name != ".gitignore": continue
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if line.endswith(" ") or line.endswith("\t"): fail(f"trailing whitespace: {path.relative_to(root)}:{number}")

def main() -> None:
    root = Path(__file__).resolve().parents[1]
    required = [
        ".gitignore", "SKILL.md", "agents/openai.yaml",
        "references/common-capabilities.md", "references/browser-and-system-ui.md", "references/cli-pty-and-process.md",
        "references/tool-runtime-and-auth.md", "references/validation-baseline.md", "references/lost-context-regression.md",
        "references/run-logging.md", "references/skill-evolution.md", "references/project-instructions.md",
        "scripts/append-run-log.py", "scripts/browser-run-boundary.py", "scripts/validate-baseline.py", "scripts/validate-skill.py",
    ]
    for relative in required:
        if not (root / relative).is_file(): fail(f"missing required file: {relative}")

    text = {name: (root / name).read_text(encoding="utf-8") for name in required if name.endswith((".md", ".yaml")) or name == ".gitignore"}
    skill = text["SKILL.md"]; common = text["references/common-capabilities.md"]; browser = text["references/browser-and-system-ui.md"]
    runtime = text["references/tool-runtime-and-auth.md"]; validation = text["references/validation-baseline.md"]
    lost = text["references/lost-context-regression.md"]; logging = text["references/run-logging.md"]
    evolution = text["references/skill-evolution.md"]; project = text["references/project-instructions.md"]; ignore = text[".gitignore"]

    for capability in ["SEE", "IDENTIFY", "ACT", "WAIT", "LISTEN", "CONNECT", "AUTHENTICATE", "RECOVER", "VERIFY"]:
        require(skill, f"`{capability}`", "SKILL.md")
    for rule in [
        "SINGLE-AUTOMATION-SOURCE-OF-TRUTH", "EYES-FIRST", "SEE-BEFORE-CONTROL-RECOVERY", "REUSE-EXISTING-BROWSER-CONNECTION",
        "SHARED-BROWSER-USAGE-GUARD", "IDENTIFY-BEFORE-MUTATE", "KNOWN-PATH-FIRST", "FIRST-DIVERGENCE-BEFORE-FALLBACK",
        "USER-PATH-INTEGRITY", "ACCEPTANCE-LEVEL-AWARE", "CHECKPOINT-AFTER-PROOF", "FAILURE-CLASSIFY-BEFORE-REPAIR",
        "SIDE-EFFECT-RECONCILIATION", "MINIMUM-SUFFICIENT-PROOF", "CONTINUE-EXISTING-BEFORE-RESTART", "ASYNC-CONTINUATION-BARRIER", "RUN-BOUNDARY-FIRST",
        "RETURN-CONTROL-CLOSES-RUN", "HARNESS-VALID-BEFORE-SCORING", "EVIDENCE-GOVERNED-EVOLUTION",
        "DETERMINISTIC-MECHANICS-BELOW-MODEL", "REALITY-IS-ACCEPTANCE-NOT-THE-MAIN-DEBUGGER",
    ]:
        require(skill, rule, "SKILL.md")
    for token in ["## Execution priority — HARD RULE", "Acceptance is a **proof gate, not the main debugger**", "## Stage boundary — HARD RULE", "## Long asynchronous work — HARD RULE"]:
        require(skill, token, "SKILL.md")
    for token in ["work pool", "mandatory replan", "every additional readback"]:
        require(skill, token, "SKILL.md")

    for token in ["Observation is read-only by default", "Uncertain mutation requires reconciliation", "## Stage boundary", "## Async rule"]:
        require(common, token, "common-capabilities.md")
    for token in ["work before status", "mandatory replan", "intervening meaningful work cycle"]:
        require(common, token, "common-capabilities.md")
    if "## Script promotion rule" in common: fail("script promotion has duplicate semantic owner in common-capabilities.md")
    require(browser, "`SEE` is observation, not a hidden mutation channel", "browser-and-system-ui.md")
    require(browser, "APPLIED | NOT_APPLIED | UNKNOWN", "browser-and-system-ui.md")

    for token in ["SHARED-RUNTIME-OWNER-FIRST", "Do not directly spawn a second raw MCP server", "Browser control ownership", "runtime_state=ready", "browser_tabs"]:
        require(runtime, token, "tool-runtime-and-auth.md")
    for token in ["LOCAL_ACCEPTANCE_AUTOMATION_PROTOCOL=v1", "必须先使用 Local Dev 读取并注入当前本机", "/Users/agent/Desktop/proton-workspace/skills/chat-local-acceptance-automation-protocol/SKILL.md", "在 Skill 读取完成前，不得开始任何本机 Acceptance 自动化操作", "唯一 Source of Truth"]:
        require(project, token, "project-instructions.md")
    for forbidden in ["EXECUTION_ENTRY", "CANONICAL_ASSET", "AUTHORITY_SOURCE", "RECOVERY_PATH", "DO_NOT_REPEAT", "CURRENT", "writeback", "Browser", "CLI", "PTY", "MCP"]:
        if forbidden in project: fail(f"legacy project-instructions responsibility remains: {forbidden}")

    for index in range(1, 25): require(lost, f"## R{index} —", "lost-context-regression.md")
    for index in range(1, 10): require(lost, f"`B{index}", "lost-context-regression.md")
    for token in ["L0 入口", "L1", "L2", "L3", "scripts/validate-skill.py", "validate-baseline.py", "git diff --check", "SINGLE-AUTOMATION-SOURCE-OF-TRUTH", "Runtime/API", "UNKNOWN reconciliation", "RETURN-CONTROL-CLOSES-RUN", "script-promotion single owner"]:
        require(validation, token, "validation-baseline.md")
    for token in ["## MAINLINE-FIRST", "OBSERVE → CLASSIFY → PLACE → PROMOTE → MUTATE → VALIDATE → LEARN", "## Information-preserving simplification", "MOVED_TO_CANONICAL_OWNER", "## Script promotion gate — SOLE OWNER", "references/projects/<project>.md", "PROJECT_REFERENCE_UPDATE", "REMOVE_OR_MERGE_EXISTING_GUIDANCE", "8 completed comparable runs", "scripts/validate-skill.py"]:
        require(evolution, token, "skill-evolution.md")
    for token in [".runs/", "__pycache__/", "*.py[cod]"]: require(ignore, token, ".gitignore")
    for token in ["CONTEXT_KNOWLEDGE_MIGRATION_GAP", "sideEffectState", "embedded secret-like values", "AUTOMATION_START", "TERMINAL_RUN_LOG_MISSED", "freshEvidenceWindowBound", ".runs/tmp/<runId>/", ".runs/artifacts/<runId>/", "browser-run-boundary.py"]:
        require(logging, token, "run-logging.md")
    cli = text["references/cli-pty-and-process.md"]
    for token in ["LISTEN — fresh evidence only", "runtime", "log cursor/offset", "dependency-point only", "work pool", "mandatory replan", "meaningful intervening work"]:
        require(cli, token, "cli-pty-and-process.md")
    check_text_hygiene(root)

    start = {"eventType": "AUTOMATION_START", "runId": "baseline-valid", "neededCapabilities": ["LISTEN", "VERIFY"], "freshEvidenceWindowBound": True, "acceptanceMode": "DIRECT"}
    terminal = {"runId": "baseline-valid", "outcome": "DONE", "failureClass": "NONE", "sideEffectState": "NOT_APPLICABLE", "testLayer": "L2", "harnessValidity": "VALID", "behavioralVerdict": "PASS"}
    expect_sequence(root, [(start, True), (terminal, True)], "paired-valid-l2")
    expect_sequence(root, [(start, True), (start, False)], "duplicate-start")
    expect(root, terminal, False, "terminal-without-start")
    expect(root, {"eventType": "AUTOMATION_START", "runId": "fresh-window-required", "neededCapabilities": ["LISTEN"], "freshEvidenceWindowBound": False}, False, "listen-without-fresh-window")

    retrospective = {"runId": "retrospective-valid", "outcome": "BLOCKED", "failureClass": "PREREQUISITE_NOT_READY", "sideEffectState": "NOT_APPLICABLE", "retrospectiveReconciliation": True, "evidenceProvenance": "authoritative runtime readback", "capabilityMisses": ["TERMINAL_RUN_LOG_MISSED"]}
    expect(root, retrospective, True, "retrospective-valid")
    expect(root, {**retrospective, "evidenceProvenance": ""}, False, "retrospective-no-provenance")
    expect(root, {**retrospective, "capabilityMisses": []}, False, "retrospective-no-miss")
    negative = {**retrospective, "runId": "negative-base"}
    expect(root, {**negative, "harnessValidity": "INVALID", "behavioralVerdict": "PASS"}, False, "invalid-harness-pass")
    expect(root, {**negative, "testLayer": "L9"}, False, "invalid-layer")
    expect(root, {**negative, "sideEffectState": "MAYBE"}, False, "invalid-side-effect")
    secret_field = "api" + "Key"
    expect(root, {**negative, secret_field: "dummy"}, False, "secret-key")
    secret_value = "PLAYWRIGHT_MCP_EXTENSION_" + "TOKEN=dummy-not-a-real-secret"
    expect(root, {**negative, "note": secret_value}, False, "secret-value")
    expect(root, {**negative, "failureClass": "CONTEXT_KNOWLEDGE_MIGRATION_GAP"}, True, "context-gap-class")

    boundary_env = os.environ.copy(); boundary_env["PYTHONDONTWRITEBYTECODE"] = "1"
    boundary = run([sys.executable, str(root / "scripts/browser-run-boundary.py"), "self-test"], root, boundary_env, timeout=180)
    if boundary.returncode != 0:
        fail("browser run boundary self-test failed", boundary.stdout + boundary.stderr)
    print(boundary.stdout.strip())

    public_core = skill + common + browser + runtime + validation + evolution
    for forbidden in ["Real-3", "@tomflow", "platform start", "ProFlow Tasks"]:
        if forbidden in public_core: fail(f"project-specific token leaked into common core: {forbidden}")

    print("ACCEPTANCE_BASELINE=PASS")
    print("CAPABILITY_COUNT=9")
    print("REGRESSION_SCENARIOS=24")
    print("BEHAVIORAL_SMOKE_CASES=9")
    print("SINGLE_AUTOMATION_TRUTH=PASS")
    print("RUN_BOUNDARY_GUARDS=PASS")
    print("LOGGER_GUARDS=PASS")
    print("EVOLUTION_GOVERNANCE=PASS")

if __name__ == "__main__": main()
