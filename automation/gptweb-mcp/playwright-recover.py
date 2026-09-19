#!/usr/bin/env python3
"""Bounded deterministic recovery for the canonical Playwright Chrome owner."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OWNER = ROOT / "gptweb-mcp"
CONNECT = ROOT / "playwright-connect-once.py"


class RecoveryError(RuntimeError):
    pass


def run(command: list[str], timeout: float) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RecoveryError(f"timeout:{Path(command[0]).name}") from exc


def connect(timeout: float, endpoint_file: str | None) -> subprocess.CompletedProcess[str]:
    command = [sys.executable, str(CONNECT), "--timeout", str(timeout)]
    if endpoint_file:
        command.extend(["--endpoint-file", endpoint_file])
    return run(command, timeout + 5)


def runtime_state(timeout: float) -> str:
    result = run([str(OWNER), "status", "playwright-chrome"], timeout)
    if result.returncode != 0:
        raise RecoveryError("runtime-status-command-failed")
    header = next(
        (line for line in result.stdout.splitlines() if line.startswith("========== playwright-chrome [")),
        "",
    )
    if "[READY]" in header:
        return "READY"
    if "[DOWN]" in header:
        return "DOWN"
    raise RecoveryError("runtime-status-unclassified")


def lifecycle(action: str, timeout: float) -> None:
    result = run([str(OWNER), action, "playwright-chrome"], timeout)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip().replace("\n", " ")[:240]
        raise RecoveryError(f"runtime-{action}-failed:{detail or result.returncode}")


def fail(stage: str, error: str, code: int = 2) -> None:
    print(f"PLAYWRIGHT_RECOVER=FAIL stage={stage} error={error}", file=sys.stderr)
    raise SystemExit(code)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recover the canonical Playwright Browser control with at most one lifecycle intervention."
    )
    parser.add_argument("--endpoint-file")
    parser.add_argument("--connect-timeout", type=float, default=25.0)
    parser.add_argument("--lifecycle-timeout", type=float, default=60.0)
    args = parser.parse_args()
    if not (0 < args.connect_timeout <= 120):
        fail("input", "invalid-connect-timeout")
    if not (0 < args.lifecycle_timeout <= 180):
        fail("input", "invalid-lifecycle-timeout")

    first = connect(args.connect_timeout, args.endpoint_file)
    if first.returncode == 0:
        print("PLAYWRIGHT_RECOVER=PASS path=connect-only")
        return

    try:
        state = runtime_state(min(args.lifecycle_timeout, 15.0))
        if state == "DOWN":
            lifecycle("start", args.lifecycle_timeout)
            path = "start"
        else:
            lifecycle("stop", args.lifecycle_timeout)
            lifecycle("start", args.lifecycle_timeout)
            path = "restart"
    except RecoveryError as exc:
        fail("runtime", str(exc), 4)

    final = connect(args.connect_timeout, args.endpoint_file)
    if final.returncode != 0:
        detail = (final.stderr or final.stdout).strip().replace("\n", " ")[:300]
        fail("connect", detail or "connect-after-lifecycle-failed", 3)
    print(f"PLAYWRIGHT_RECOVER=PASS path={path}")


if __name__ == "__main__":
    main()
