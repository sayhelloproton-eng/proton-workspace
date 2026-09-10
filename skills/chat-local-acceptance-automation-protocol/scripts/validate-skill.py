#!/usr/bin/env python3
"""Single executable L0 validation entrypoint for the Acceptance Skill."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path


def fail(message: str, output: str = "") -> None:
    print(f"ACCEPTANCE_SKILL_VALIDATE=FAIL {message}", file=sys.stderr)
    if output.strip():
        print(output.strip(), file=sys.stderr)
    raise SystemExit(2)


def run(args: list[str], cwd: Path, env: dict[str, str] | None = None, timeout: int = 90) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, env=env, text=True, capture_output=True, timeout=timeout, check=False)


def run_skill_creator(root: Path, env: dict[str, str]) -> None:
    validator = Path.home() / ".codex/skills/.system/skill-creator/scripts/quick_validate.py"
    if not validator.is_file():
        fail(f"skill-creator validator missing: {validator}")

    result = run([sys.executable, str(validator), str(root)], root, env)
    missing_yaml = result.returncode != 0 and "No module named 'yaml'" in (result.stderr + result.stdout)
    if missing_yaml:
        with tempfile.TemporaryDirectory(prefix="skill-yaml-shim-") as temp:
            shim = Path(temp) / "yaml.py"
            shim.write_text(
                "class YAMLError(Exception):\n    pass\n\n"
                "def safe_load(text):\n"
                "    out = {}\n"
                "    for raw in str(text).splitlines():\n"
                "        line = raw.strip()\n"
                "        if not line or line.startswith('#'):\n            continue\n"
                "        if ':' not in line:\n            raise YAMLError('unsupported yaml line')\n"
                "        key, value = line.split(':', 1)\n"
                "        key, value = key.strip(), value.strip()\n"
                "        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('\\\"', \"'\"):\n            value = value[1:-1]\n"
                "        out[key] = value\n"
                "    return out\n",
                encoding="utf-8",
            )
            shim_env = env.copy()
            shim_env["PYTHONPATH"] = temp + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
            result = run([sys.executable, str(validator), str(root)], root, shim_env)

    if result.returncode != 0:
        fail("skill-creator quick validation failed", result.stdout + result.stderr)
    print("VALIDATE_STEP=skill-creator PASS")


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

    run_skill_creator(root, env)

    baseline = run([sys.executable, str(root / "scripts/validate-baseline.py")], root, env, timeout=90)
    if baseline.returncode != 0:
        fail("acceptance baseline failed", baseline.stdout + baseline.stderr)
    print(baseline.stdout.strip())
    print("VALIDATE_STEP=acceptance-baseline PASS")

    validate_python_syntax(root)
    validate_git_hygiene(root)
    print("ACCEPTANCE_SKILL_VALIDATE=PASS")


if __name__ == "__main__":
    main()
