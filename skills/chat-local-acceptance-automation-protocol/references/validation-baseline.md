# Validation Baseline

L0 入口仍是：

```text
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-skill.py
```

它只依赖本 Skill 和 workspace Git：本地检查 `SKILL.md` frontmatter、运行 `validate-baseline.py`、编译 Python 语法并执行 `git diff --check`。不得把 `~/.codex`、另一个 Agent 宿主的私有 Skill 安装或隐藏全局 validator 作为必需依赖；宿主自己的 validator 只能作为可选附加检查。

L1 由 `references/lost-context-regression.md` 与 `scripts/validate-baseline.py` 提供 deterministic contract regression。L2 是 fresh-chat behavioral smoke；L3 是真实项目 Acceptance evidence。坏掉的 L2 harness 记为 INVALID/BLOCKED，不能驱动错误的规则变更。

事实按 owner 分层验证：Runtime/API 事实优先走 runtime/API owner；只有 UI-owned 事实或真实交互才进入 Browser。任何层的 PASS 都不能替代合同明确要求的另一层 PASS。

`SINGLE-AUTOMATION-SOURCE-OF-TRUTH` 指 Acceptance 政策只有本 Skill 一个 owner。稳定的项目专属 deterministic executor 可以位于 workspace `automation/`，但什么时候能调用、需要什么 lease/身份/证据、什么算 PASS 仍由本 Skill/reference 唯一定义。

Deterministic baseline 至少覆盖：hard-rule/reference wiring、shared-runtime owner-first/no duplicate spawn、run boundary、fresh evidence、UNKNOWN reconciliation、secret rejection、RETURN-CONTROL-CLOSES-RUN、Runtime/API owner-first 与 script-promotion single owner。
