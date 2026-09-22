# ProFlow Monitor Maintenance automation

本目录是 Temporary Chat Loop 的 deterministic workflow owner。业务 truth 始终属于 Node Monitor Service；脚本不直接写 `monitor-state.json`，也不建立第二份 cache truth。

## Single-package npm release action

Intent: 发布一个已完成开发与提交的 ProFlow npm package。

```bash
node automation/proflow-maintenance/package-release.mjs release '{"package":"dev-tunnel"}'
node automation/proflow-maintenance/package-release.mjs status '{"package":"dev-tunnel"}'
# Only after UNKNOWN reconciliation, explicitly retry the same release:
node automation/proflow-maintenance/package-release.mjs retry '{"package":"dev-tunnel"}'
```

Input is exactly one `package` (directory name or npm name), plus optional `summary`.
Do not pass repo paths, versions, Registry URLs, changeset IDs or shell commands.
The adapter delegates once to canonical `pnpm package:release <package>` in ProFlow.
ProFlow alone owns changeset/version/build/Registry/publish mechanics.

Output preserves the canonical receipt and adds the Maintenance status/retry commands:

```json
{"contract":"proflow.package-release.v2","status":"RUNNING","stage":"QUEUED","runId":"...","package":"dev-tunnel","receiptPath":".../receipt.json","next":"PACKAGE_RELEASE_STATUS"}
```

`RUNNING`: return immediately and continue safe independent work; later invoke status.
Never poll, sleep, inspect PID/log, or manually orchestrate npm release.
`PASS`: continue `next=PACKAGE_ADOPTION`. `BLOCKED`: resolve `requiredAction`.
`UNKNOWN`: restore authority before explicit retry; transport timeout is not proof of failure.
`FAIL`: repair the named package gate or automation error.
For multiple packages, call this single-package action sequentially and consume each terminal receipt.
There is no release-many/release-all action. Tests never publish a real or temporary version.

## Model-facing public actions

正常 Monitor 模型只记住这些稳定入口：

```text
# 仅在没有 current/live Monitor 时创建首班
node automation/proflow-maintenance/monitor-initialize.mjs \
  --shift-id <initialShiftId>
# 若返回 requiredAction=READ_CURRENT_PROJECT_EYES：
# → current canonical Playwright browser_evaluate(function="() => location.href")
# → 将 Browser 返回 URL 原样交回同一 action：
node automation/proflow-maintenance/monitor-initialize.mjs \
  --shift-id <initialShiftId> \
  --project-observed-url <currentProjectUrl>

# 机械解析本班必须读取的 authority 路径
node automation/proflow-maintenance/monitor-context-manifest.mjs

# authorities 已真实阅读后，一次完成 boot proof + takeover + FULL readback
node automation/proflow-maintenance/monitor-claim.mjs \
  --shift-id <shiftId> --authorities-read

# 收敛真实运行环境，只修可机械修复的 first divergence
node automation/proflow-maintenance/proflow-real-scene-ready.mjs

# ProFlow 专属 Dev Tunnel convergence；正常由 REAL_SCENE_READY 内部调用
node automation/proflow-maintenance/proflow-dev-tunnel-ready.mjs

# Monitor Browser 唯一常规项目动作
node automation/proflow-maintenance/monitor-browser-step.mjs

# 仅当 Browser Step 返回 MONITOR_CONTROLLED_GROUP_ADOPTION_REQUIRED
node automation/proflow-maintenance/monitor-browser-adopt.mjs prepare
# → current canonical Playwright browser_run_code_unsafe(filename=<actionFile>)
node automation/proflow-maintenance/monitor-browser-adopt.mjs complete \
  --action-file <actionFile>
# complete 只清理 one-shot actionFile；随后总是重新调用 monitor-browser-step.mjs 做权威 reconcile/continue
# Playwright 结果 UNKNOWN 时也禁止先重放 adopt；只有 Browser Step 再次返回 ADOPTION_REQUIRED 才允许重新 prepare

# 交接时模型只提交结构化 continuation 语义
node automation/proflow-maintenance/monitor-handoff-finalize.mjs \
  --input-file <continuation.json>

# Product Campaign owner fresh-read 为 CLOSED 后终止整个产品迭代 Loop
node automation/proflow-maintenance/monitor-loop-finalize.mjs \
  --campaign-ref <campaignRef> --product-owner-closed-read
```

模型仍负责 authority 理解、工程/产品语义判断、continuation/blocker/notification 语义。模型不再负责首班 bootstrap/create、boot/takeover 串联、Browser reconnect/group、Tunnel lifecycle、Extension reload/adoption、Platform start/status 编排、handoff complete/bootstrap/create。

## Model cognitive boundary

正常 successor 的路由 authority 只在 `skills/proflow-chat-loop/SKILL.md`。模型保持 one-receipt working set：authority 只读一次，claim 一次，之后只消费最新高层 Action receipt 的 `status / stage / firstDivergence / requiredAction / next`。正常运行不得为了“理解下一步”读取本目录脚本源码、helper 实现、PID/process tree、pnpm/node_modules、Chrome 细节或 Tunnel identity。

本目录允许内部 mechanics 演进，但只要高层 contract/receipt 不变，就不应把新内部步骤暴露给 model-facing surface。低层 helper 只服务高层 Action；不得因为某个 timeout/warning 让 successor 模型临场拆解成一串诊断命令。

## Owner gate actions

ProFlow product verification belongs to exactly one package:

```bash
pnpm --dir repos/proflow package:gate <one-package>
pnpm --dir repos/proflow package:build <one-package>
```

Call the gate after Stage Freeze, and build only when needed. Separate affected owners
require separate model calls. Tool/action tests stay with their owning tool; there is no
stage aggregator mixing package tests with workspace helper tests. Aggregate stage
prepare/verify actions are removed; stale callers must route directly to the owning
package Gate/Build. Explicit repo governance is separate and is never package release test evidence.

After owning package Gate PASS and formal version/materialization/adoption, use
`proflow-monitor-acceptance.mjs --mode SAME_SCENE`, followed by final visual EYES.

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

任何 Browser action 之前，`monitor-browser-step.mjs` 都先要求 source/static artifact、materialization marker、materialized payload 与 package-owned version facts 精确一致。same-version stale artifact 也必须 BLOCKED，且不能打开 Browser boundary。`tools/browser/playwright-controlled-group.py` 是唯一通用 tab/group owner；ProFlow helper 不复制 `chrome.tabs.group` / `chrome.tabGroups` / `chrome.windows.create`。所有 Browser 动作固定先定位 canonical controlled group，再从该 group membership 定位 exact target tab，最后执行动作；普通 inspect/sync/fingerprint/reload/retire 不允许先全局搜 tab，也不允许自动收编组外目标。physical restore 遇到 group miss 只返回 `MONITOR_CONTROLLED_GROUP_ADOPTION_REQUIRED`。此时唯一恢复动作是 `monitor-browser-adopt prepare → current canonical Playwright 执行 actionFile → monitor-browser-adopt complete → rerun monitor-browser-step`；Automation 从 Node owner 取 exact conversationLocator + chatId，模型不选择 tab/group/window。`complete` 只清理 one-shot artifact，Browser Step fresh-read 当前 Node owner 并负责 reconcile；即使 Playwright 返回 UNKNOWN，也不得在 Browser Step readback 前重放 adopt。Browser control UNKNOWN 永远不等于 Chat absent。

## ProFlow Dev Tunnel

`proflow-dev-tunnel-ready.mjs` 是 thin convergence adapter。它不拥有 tunnel identity、port、auth、Microsoft CLI resolver 或 host lifecycle；这些全部由 workspace 已安装 npm package `@tomflow/proflow-dev-tunnel` 拥有。Action 只调用 package bin：

```text
node_modules/.bin/proflow-dev-tunnel reconcile --workspace <workspace> --json
```

Action 仅消费包的 `proflow.dev-tunnel-cli.v1` JSON，映射成 `proflow.dev-tunnel-ready.v1`；不读取包的状态文件。缺少回执或执行结果不确定时返回 UNKNOWN，不回退、不重复调用。包负责认证恢复、双 token 原子替换和 host 恢复。

## Context ownership

```text
ProFlow project context   → repos/proflow README / CURRENT / REQUIRED_CONTEXT / project Runbook
Chat Loop continuation    → skills/proflow-chat-loop/SKILL.md + .handoff/current.md
Monitor runtime/lifecycle → Node Monitor Service
```

`monitor-context-manifest.mjs` 只解析路径，不能替代模型真实阅读。新的 boot proof 只允许 v4；正常模型不直接调用 low-level boot/takeover helper，而由 `monitor-claim.mjs` 完成并 readback。

## Initial Monitor

`monitor-initialize.mjs` 仅在没有 current/live Monitor 且没有冲突 pending bootstrap 时合法。若 Node 已有 durable `projectLocator`，它机械启用 Loop 后继续；若 `projectLocator` 为空，它先返回 `BLOCKED / requiredAction=READ_CURRENT_PROJECT_EYES`，要求当前 canonical Playwright 只读 `browser_evaluate(function="() => location.href")`，再将 Browser 返回 URL 原样通过 `--project-observed-url` 交回同一 action。模型不得解析、裁剪、拼 slug、硬编码或推断 locator；Node 将当前 Project conversation/root URL canonicalize，并把 `projectLocator + loopEnabled=true` 作为一次 config update 持久化后，才允许生成固定 Initial BOOTSTRAP、调用低层 stage owner、执行 `monitor-browser-step.mjs` 并按 Node state 对账。它返回 `REGISTERED | STAGED | BLOCKED | UNKNOWN`，且不会替新 Chat claim。

## Product iteration completion

Product owner fresh-read 证明 active Campaign 为 `CLOSED` 后，模型调用 `monitor-loop-finalize.mjs`。它不重新判断产品是否完成，只消费这个 owner fact；机械要求无 pending bootstrap/dispatch/UNKNOWN/handoff/hold/turn-wake/successor，调用 Node sole lifecycle operation `loop.complete`，readback `loopEnabled=false`、`mutationMode=NONE`、`drive.next=null`，随后唯一 checkpoint 收成 `LOOP_COMPLETE / nextShiftId=none`，不创建 successor。active Loop 禁止通过 generic config 直接 disable。

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
- `@tomflow/proflow-dev-tunnel` npm package：Dev Tunnel CLI resolver、auth、workspace credential、host lifecycle 与 readiness 唯一 owner。
- `proflow-dev-tunnel-ready.mjs`：thin package adapter；只调用已安装 package 的 `reconcile --json` 并映射 receipt。
- `browser-extension-update.mjs`：ProFlow Extension package identity / Extension ID / currentness + generic reload orchestration。
- `lib/browser-extension-artifact-guard.mjs`：source/materialization identity guard。
- `tools/browser/chrome-extension-refresh.mjs`：跨项目通用 Extension reload owner。
- `proflow-real-scene-ready.mjs`：跨 runtime owner 收敛，不建立第二 truth。
- `monitor-browser-adopt.mjs`：仅在 group miss 后消费 Node-owned exact target，准备 current-session generic adopt action，并在执行后清理 one-shot artifact；reconcile 统一回到 `monitor-browser-step.mjs`，不复制 Browser group primitives。
- `monitor-loop-finalize.mjs`：消费 Product-owner `Campaign CLOSED` attestation，机械完成 Monitor Loop terminal convergence，不建立第二份产品完成 truth。
- Node Monitor Service：Temporary Chat Loop sole lifecycle writer。
- Execution Runtime + Browser effect owner：真实 create/submit side-effect truth。
- Model：authority 阅读、工程/产品语义、continuation 与最终视觉判定。
