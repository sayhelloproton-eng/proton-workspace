#!/usr/bin/env python3
"""Inventory Chinese technical-writing signals and compare mechanically recoverable semantics.

This is a review aid. It does not classify authorship or score prose quality.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Iterable

SIGNALS = {
    "negative_parallel": re.compile(r"不是.{0,28}而是|并非.{0,28}而是"),
    "not_equal": re.compile(r"不等于|≠"),
    "ordered_connectors": re.compile(r"首先|其次|最后"),
    "abstract_verdict": re.compile(r"本质上|核心是|真正的|关键在于"),
    "canned_transition": re.compile(r"值得注意的是|需要强调的是|毋庸置疑|在当今.{0,20}背景下"),
    "canned_closer": re.compile(r"综上所述|总而言之|由此可见"),
}
URL_RE = re.compile(r"https?://[^\s)>\]]+")
INLINE_CODE_RE = re.compile(r"(?<!`)`([^`\n]+)`(?!`)")
NUMBER_RE = re.compile(r"(?<![\w.])\d+(?:\.\d+)?(?:%|ms|s|分钟|小时|天|年|B|K|M|GB|MB)?(?![\w.])")
TERM_RE = re.compile(r"\b[A-Z][A-Z0-9_-]{1,}\b|\b[A-Z][A-Za-z0-9]*(?:[A-Z][A-Za-z0-9]*)+\b")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)
LINK_RE = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")


def markdown_files(paths: Iterable[str]) -> list[Path]:
    found: set[Path] = set()
    for raw in paths:
        path = Path(raw).expanduser().resolve()
        if path.is_dir():
            found.update(p for p in path.rglob("*.md") if p.is_file())
        elif path.is_file():
            found.add(path)
        else:
            raise FileNotFoundError(raw)
    return sorted(found)


def prose_without_fences(text: str) -> tuple[str, int, bool, list[str]]:
    prose: list[str] = []
    code_blocks: list[str] = []
    block_lines: list[str] = []
    fence_marker: str | None = None
    fence_length = 0
    fence_count = 0
    for line in text.splitlines():
        match = re.match(r"^\s*(`{3,}|~{3,})(.*)$", line)
        if match and fence_marker is None:
            fence_count += 1
            fence_marker = match.group(1)[0]
            fence_length = len(match.group(1))
            block_lines = []
            continue
        if match and fence_marker is not None and match.group(1)[0] == fence_marker and len(match.group(1)) >= fence_length and not match.group(2).strip():
            fence_count += 1
            code_blocks.append(hashlib.sha256("\n".join(block_lines).encode("utf-8")).hexdigest())
            fence_marker = None
            fence_length = 0
            block_lines = []
            continue
        if fence_marker is None:
            prose.append(line)
        else:
            block_lines.append(line)
    return "\n".join(prose), fence_count, fence_marker is None, sorted(code_blocks)


def inventory(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    prose, fence_count, fences_balanced, code_blocks = prose_without_fences(text)
    headings = [title.strip() for _, title in HEADING_RE.findall(prose)]
    return {
        "path": str(path),
        "lines": len(text.splitlines()),
        "nonempty_lines": sum(1 for line in text.splitlines() if line.strip()),
        "h1_count": sum(1 for level, _ in HEADING_RE.findall(prose) if len(level) == 1),
        "headings": headings,
        "table_lines": sum(1 for line in prose.splitlines() if line.lstrip().startswith("|")),
        "bullet_lines": sum(1 for line in prose.splitlines() if re.match(r"^\s*[-*+]\s+", line)),
        "fence_markers": fence_count,
        "fences_balanced": fences_balanced,
        "signals": {name: len(pattern.findall(prose)) for name, pattern in SIGNALS.items()},
        "semantic_inventory": {
            "urls": sorted(set(URL_RE.findall(text))),
            "links": sorted(set(LINK_RE.findall(text))),
            "inline_code": sorted(set(INLINE_CODE_RE.findall(prose))),
            "code_blocks": code_blocks,
            "numbers": sorted(set(NUMBER_RE.findall(prose))),
            "terms": sorted(set(TERM_RE.findall(prose))),
        },
    }


def scan(paths: list[str]) -> dict:
    files = [inventory(path) for path in markdown_files(paths)]
    totals = Counter()
    heading_counts = Counter()
    for item in files:
        totals.update(item["signals"])
        heading_counts.update(item["headings"])
    repeated = {key: value for key, value in heading_counts.items() if value > 1}
    return {
        "purpose": "diagnostic_inventory_not_authorship_or_quality_score",
        "file_count": len(files),
        "signal_totals": dict(sorted(totals.items())),
        "repeated_headings": dict(sorted(repeated.items(), key=lambda item: (-item[1], item[0]))),
        "files": files,
    }


def compare(before: str, after: str) -> dict:
    left = inventory(Path(before).expanduser().resolve())
    right = inventory(Path(after).expanduser().resolve())
    losses: dict[str, list[str]] = {}
    additions: dict[str, list[str]] = {}
    for category in ("urls", "links", "inline_code", "code_blocks", "numbers", "terms"):
        old = set(left["semantic_inventory"][category])
        new = set(right["semantic_inventory"][category])
        if old - new:
            losses[category] = sorted(old - new)
        if new - old:
            additions[category] = sorted(new - old)
    findings: list[str] = []
    if left["h1_count"] != right["h1_count"]:
        findings.append(f"h1_count_changed:{left['h1_count']}->{right['h1_count']}")
    if not right["fences_balanced"]:
        findings.append("after_has_unbalanced_code_fences")
    if losses:
        findings.append("mechanically_detectable_semantic_items_missing")
    return {
        "purpose": "review_aid_not_semantic_equivalence_proof",
        "before": left,
        "after": right,
        "potential_losses": losses,
        "potential_additions": additions,
        "findings": findings,
        "review_required": bool(findings),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    scan_parser = sub.add_parser("scan", help="inventory Markdown files or directories")
    scan_parser.add_argument("paths", nargs="+")
    compare_parser = sub.add_parser("compare", help="compare one before/after Markdown pair")
    compare_parser.add_argument("before")
    compare_parser.add_argument("after")
    args = parser.parse_args()
    try:
        result = scan(args.paths) if args.command == "scan" else compare(args.before, args.after)
    except (OSError, UnicodeError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if args.command == "compare" and result["review_required"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
