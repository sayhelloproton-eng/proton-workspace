#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "audit_markdown.py"


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(SCRIPT), *args], text=True, capture_output=True, check=False)


class AuditMarkdownTest(unittest.TestCase):
    def test_scan_reports_signals_without_scoring_authorship(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            source = Path(raw) / "source.md"
            source.write_text("# 标题\n\n首先说明 API ≠ UI。本质上这很重要。\n", encoding="utf-8")
            result = run("scan", str(source))
            self.assertEqual(result.returncode, 0, result.stderr)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["file_count"], 1)
            self.assertEqual(payload["signal_totals"]["ordered_connectors"], 1)
            self.assertEqual(payload["signal_totals"]["not_equal"], 1)
            self.assertIn("not_authorship_or_quality_score", payload["purpose"])

    def test_safe_rewrite_has_no_mechanical_losses(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            before = root / "before.md"
            after = root / "after.md"
            body = "# 标题\n\nAPI ≠ UI。数字 42，见 https://example.com，运行 `pnpm test`。\n\n```sh\necho ok\n```\n"
            before.write_text(body, encoding="utf-8")
            after.write_text(body.replace("数字 42，见", "这里保留数字 42，并参考"), encoding="utf-8")
            result = run("compare", str(before), str(after))
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertEqual(json.loads(result.stdout)["potential_losses"], {})

    def test_lossy_rewrite_requires_review(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            before = root / "before.md"
            after = root / "after.md"
            before.write_text("# 标题\n\nAPI 42 https://example.com `pnpm test`\n", encoding="utf-8")
            after.write_text("# 标题\n\n这里只剩结论。\n", encoding="utf-8")
            result = run("compare", str(before), str(after))
            self.assertEqual(result.returncode, 1, result.stdout)
            payload = json.loads(result.stdout)
            self.assertTrue(payload["review_required"])
            for category in ("urls", "inline_code", "numbers", "terms"):
                self.assertIn(category, payload["potential_losses"])

    def test_skill_keeps_scope_and_environment_boundaries(self) -> None:
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        for marker in (
            "语义契约",
            "AI detector",
            "不得为了“更像人”虚构",
            "technical-document-writing",
            "Environment boundary",
            "不得为了使用本 Skill 强行套用 Chat-only",
        ):
            self.assertIn(marker, skill)
        self.assertNotIn("project-knowledge-governance", skill)
        self.assertNotIn("planner-executor-handoff", skill)

    def test_progressive_references_exist(self) -> None:
        for name in (
            "01-editing-contract.md",
            "02-structure-and-language-signals.md",
            "03-scenario-reconstruction.md",
            "04-semantic-regression-and-density-audit.md",
        ):
            self.assertTrue((ROOT / "references" / name).is_file(), name)


if __name__ == "__main__":
    unittest.main()
