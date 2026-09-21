# ProFlow Monitor Maintenance automation

本目录是 Temporary Chat Loop 的 deterministic workflow owner。业务 truth 始终属于 Node Monitor Service；脚本不直接写 `monitor-state.json`，也不建立第二份 cache truth。

## Model-facing public actions

正常 Monitor 模型只记住这些稳定入口：

```text
# 仅在没有 current/live Monitor 时创建首班
node automation/proflow-maintenance/monitor-initialize.mjs \
  --shift-id <initialShiftId>

# 机械解析本班必须读取的 authority 路径
node automation/proflow-maintenance/monitor-context-manifest.mjs

# authorities 已真实阅读后，一次完成 boot proof + takeover + FULL readback
node automation/proflow-maintenance/monitor-claim.mjs \
  --shift-id <shiftId> --authorities-read

# 收敛真实运行环境，只修可机械修复的 first divergence
node automation/proflow-maintenance/proflow-real-scene-ready.mjs

# Monitor Browser 唯一项目动作
node automation/proflow-maintenance/monitor-browser-step.mjs

# 交接时模型只提交结构化 continuation 语义
node automation/proflow-maintenance/monitor-handoff-finalize.mjs \
  --input-file <continuation.json>
```

模型仍负责 authority 理解、工程/产品语义判断、continuation/blocker/notification 语义。模型不再负责首班 bootstrap/create、boot/takeover 串联、Browser reconnect/group、Tunnel lifecycle、Extension reload/adoption、Platform start/status 编排、handoff complete/bootstrap/create。

## Final gate actions

实现阶段最后一个**允许修改 generated artifact** 的动作：

```text
node automation/proflow-maintenance/proflow-stage-prepare.mjs \
  --stage monitor-controlled-group
```

它只执行 generated test-governance refresh，不运行 tests/typecheck/build/Acceptance。机械检查 generated diff 后进入 Stage Freeze。

Stage Freeze 后只调用纯验证入口：

```text
node automation/proflow-maintenance/proflow-stage-verify.mjs \
  --stage monitor-controlled-group
```

它执行 targeted Monitor tests、Extension typecheck/build、governance check、workspace self-tests 和 diff check，并记录每一步耗时；不会修改 test-governance inventory。

Stage Verify PASS、正式版本/materialization/adoption 完成后：

```text
node automation/proflow-maintenance/proflow-monitor-acceptance.mjs \
  --mode SAME_SCENE
```

它最多返回 `READY_FOR_VISUAL_EYES`；最终视觉 PASS 仍由模型对 owner-known current Monitor tab 做一次 EYES 判定。

## Browser action ownership

ProFlow Browser 正常只调用：

```text
node automation/proflow-maintenance/monitor-browser-step.mjs
```

内部固定：

```text
EXTENSION_ARTIFACT_GUARD
→ ENSURE_CONTROLLED_GROUP
→ reconcile existing UNKNOWN effect
→ runtime adoption gate
→ SYNC_TARGET
→ EXECUTE_DRIVE through Platform Host /application/monitor
→ RETIRE_CHAT only with owner proof
→ VERIFY_SCENE
→ DONE | BLOCKED | UNKNOWN
```

任何 Browser action 之前，`monitor-browser-step.mjs` 都先要求 source/static artifact、materialization marker、materialized payload 与 package-owned version facts 精确一致。same-version stale artifact 也必须 BLOCKED，且不能打开 Browser boundary。`tools/browser/playwright-controlled-group.py` 是唯一通用 tab/group owner；ProFlow helper 不复制 `chrome.tabs.group` / `chrome.tabGroups` / `chrome.windows.create`。physical restore 只有在 durable identity 唯一证明 exact existing Chat 没有物理 tab 时才允许，且固定 `about:blank → group → readback → exact existing conversation URL`。Browser control UNKNOWN 永远不等于 Chat absent。

## Context ownership

```text
ProFlow project context   → repos/proflow README / CURRENT / REQUIRED_CONTEXT / project Runbook
Chat Loop continuation    → skills/proflow-chat-loop/SKILL.md + .handoff/current.md
Monitor runtime/lifecycle → Node Monitor Service
```

`monitor-context-manifest.mjs` 只解析路径，不能替代模型真实阅读。新的 boot proof 只允许 v4；正常模型不直接调用 low-level boot/takeover helper，而由 `monitor-claim.mjs` 完成并 readback。

## Initial Monitor

`monitor-initialize.mjs` 仅在没有 current/live Monitor 且没有冲突 pending bootstrap 时合法。它生成固定 Initial BOOTSTRAP、调用低层 stage owner、执行 `monitor-browser-step.mjs` 并按 Node state 对账，返回 `REGISTERED | STAGED | BLOCKED | UNKNOWN`。它不会替新 Chat claim。

## Handoff

正常路径：

```text
HANDOFF physical effect settled
→ model supplies continuation JSON once
→ monitor-handoff-finalize.mjs
→ canonical current.md
→ handoff.complete
→ predecessor mutationMode=NONE readback
→ fresh bootstrap.stage
→ monitor-browser-step
→ formal monitor.chat.create / registration
→ successor reads authorities
→ successor monitor-claim.mjs --authorities-read
→ FULL readback
→ browser-step retires predecessor
```

没有 standalone `chat.register`。创建/submit 的 APPLIED/NOT_APPLIED/UNKNOWN truth 仍属于 Execution owner。

## Diagnostic / semantic surfaces

仅当高层 action 返回明确需要时才直接调用：

```text
monitor-current.mjs / monitor-state.mjs / monitor-config.mjs
monitor-event.mjs blocked|clear
monitor-injection.mjs turn-wake
monitor-notify.mjs
monitor-successor-abandon.mjs
monitor-state-adoption.mjs
```

低层 `monitor-injection bootstrap`、`monitor-boot-proof`、`monitor-takeover`、`monitor-handoff-complete` 都是 automation 内部/诊断 owner，不是正常模型流程。

## UNKNOWN

Mutation helper 使用稳定 identity。timeout/transport loss 先由同一高层 action 或 Node/Execution owner readback 对账；只有明确 `NOT_APPLIED` 才允许重放，`UNKNOWN` 停止。

## Ownership summary

- `tools/browser/playwright-controlled-group.py`：通用 controlled-group owner。
- `automation/gptweb-mcp/playwright-ready.py`：Browser readiness convergence。
- `scripts/dev-tunnel ready`：Dev Tunnel readiness convergence。
- `automation/proflow-browser-extension/adopt.mjs`：Extension adoption convergence。
- `proflow-real-scene-ready.mjs`：跨 runtime owner 收敛，不建立第二 truth。
- Node Monitor Service：Temporary Chat Loop sole lifecycle writer。
- Execution Runtime + Browser effect owner：真实 create/submit side-effect truth。
- Model：authority 阅读、工程/产品语义、continuation 与最终视觉判定。
