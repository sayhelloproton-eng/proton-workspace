#!/usr/bin/env python3
"""Single executable L0 validation entrypoint for the Acceptance Skill."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def fail(message: str, output: str = "") -> None:
    print(f"ACCEPTANCE_SKILL_VALIDATE=FAIL {message}", file=sys.stderr)
    if output.strip():
        print(output.strip(), file=sys.stderr)
    raise SystemExit(2)


def run(args: list[str], cwd: Path, env: dict[str, str] | None = None, timeout: int = 90) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, env=env, text=True, capture_output=True, timeout=timeout, check=False)


def validate_frontmatter(root: Path) -> None:
    lines = (root / "SKILL.md").read_text(encoding="utf-8").splitlines()
    if len(lines) < 4 or lines[0].strip() != "---":
        fail("SKILL.md must start with YAML frontmatter")
    try:
        end = next(index for index in range(1, len(lines)) if lines[index].strip() == "---")
    except StopIteration:
        fail("SKILL.md frontmatter is not closed")
    fields: dict[str, str] = {}
    for raw in lines[1:end]:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            fail(f"unsupported frontmatter line: {raw}")
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip().strip("\"").strip("'")
    for required in ("name", "description"):
        if not fields.get(required):
            fail(f"SKILL.md frontmatter missing {required}")
    if fields["name"] != root.name:
        fail(f"frontmatter name mismatch: {fields['name']} != {root.name}")
    print("VALIDATE_STEP=frontmatter PASS")


def validate_python_syntax(root: Path) -> None:
    for path in sorted((root / "scripts").glob("*.py")):
        try:
            compile(path.read_text(encoding="utf-8"), str(path), "exec")
        except SyntaxError as exc:
            fail(f"python syntax failed: {path.name}:{exc.lineno}: {exc.msg}")
    print("VALIDATE_STEP=python-syntax PASS")


def git_repo(root: Path) -> Path:
    result = run(["git", "rev-parse", "--show-toplevel"], root, timeout=20)
    if result.returncode != 0:
        fail("cannot resolve git repository", result.stderr)
    return Path(result.stdout.strip())


def validate_git_hygiene(root: Path) -> None:
    repo = git_repo(root)
    relative_root = root.relative_to(repo)
    diff = run(["git", "diff", "--check", "--", str(relative_root)], repo, timeout=30)
    if diff.returncode != 0:
        fail("git diff --check failed", diff.stdout + diff.stderr)

    probes = [root / ".runs/ledger.jsonl", root / "scripts/__pycache__/probe.pyc"]
    for probe in probes:
        relative = probe.relative_to(repo)
        result = run(["git", "check-ignore", "-q", "--", str(relative)], repo, timeout=20)
        if result.returncode != 0:
            fail(f"generated/local evidence path is not ignored: {relative}")

    pyc = [path for path in root.rglob("*.pyc") if ".git" not in path.parts]
    if pyc:
        fail("compiled Python artifacts remain under Skill: " + ",".join(str(path.relative_to(root)) for path in pyc))
    print("VALIDATE_STEP=git-hygiene PASS")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"

    validate_frontmatter(root)

    baseline = run([sys.executable, str(root / "scripts/validate-baseline.py")], root, env, timeout=600)
    if baseline.returncode != 0:
        fail("acceptance baseline failed", baseline.stdout + baseline.stderr)
    print(baseline.stdout.strip())
    print("VALIDATE_STEP=acceptance-baseline PASS")

    validate_python_syntax(root)
    validate_git_hygiene(root)
    print("ACCEPTANCE_SKILL_VALIDATE=PASS")


if __name__ == "__main__":
    main()
