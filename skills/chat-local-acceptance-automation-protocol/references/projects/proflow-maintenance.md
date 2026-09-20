# ProFlow Maintenance Chat Automation

> 范围：ProFlow Monitor v4 的 Maintenance Chat → existing/new Monitor Chat 恢复、runtime convergence、SAME_SCENE 与 stage-final Acceptance。
> 通用 Acceptance 纪律仍由 `chat-local-acceptance-automation-protocol` 拥有；本文只定义 ProFlow 产品事实和 project-specific path。
## 0. Context ownership boundary

本 reference 只编排 owner，不建立合并上下文：

```text
ProFlow project context   → repos/proflow 的 CURRENT / REQUIRED_CONTEXT / Formal Spec / project Runbook
Chat Loop continuation    → workspace proflow-chat-loop Skill / continuation checkpoint
Monitor runtime/lifecycle → Node Monitor Service / monitor-state.json
```

Browser/Acceptance 只能观察或驱动物理效果，不能把其中任一层复制成另一层的 truth。尤其不得用 handoff prose 推断 current/mutationMode，也不得把 Node runtime snapshot 写回 ProFlow CURRENT。

## 1. 正式链路

```text
Maintenance Chat
→ Engineering repair / Verify
→ official Workspace adoption
→ Browser Extension Monitor observation / scheduler
→ Platform Host authenticated thin relay
→ Node Monitor state owner
→ Execution Runtime
→ existing monitor.chat.create / monitor.chat.submit effect owner
→ real Monitor Chat
→ Monitor self authority restore
→ bootProof.record
→ takeover.accept
→ current.read proves mutationMode=FULL
```

没有独立 Platform Monitor polling coordinator。
没有 `shift.activate`。
没有 standalone production `chat.register`。
真实 Chat 注册只由 `monitor.chat.create` 的 APPLIED settlement 完成。

## 2. Maintenance Chat 边界

Maintenance 是安装、修复、验收、cutover 和异常恢复层，不是 Monitor 的持续上级。

允许：
- 读取 source/build/adoption/runtime/Browser/Monitor durable reality；
- 识别 first divergence 和 owner；
- 修复 Monitor 基础设施或产品缺陷；
- 完成 Engineering Verify；
- 完成正式 runtime convergence；
- 在 SAME_SCENE / FAST_REPLAY / FULL_FRESH 对应 Gate 做真实证明；
- 只读确认 current / mutationMode / boot proof / takeover / outbox。

禁止：
- Maintenance 代 successor 声明 `--authorities-read`；
- 手改 `monitor-state.json`、legacy run/config/observation/outbox；
- 手工伪造 chat registration、boot proof 或 current switch；
- blind submit BOOTSTRAP/TURN_WAKE/HANDOFF；
- 创建第二个 successor 来绕过 UNKNOWN；
- 通过 publish/reload 制造调试证据；
- 因页面历史 Retry 就自动点击。

## 3. EYES 与 owner

真实 UI/Browser 问题必须先按 Acceptance Skill 做 EYES。

```text
DOM / snapshot = semantic current-page facts
screenshot = visual/geometry/error-surface facts
durable Node state = Monitor lifecycle/business truth
Execution durable identity = Browser effect APPLIED/NOT_APPLIED/UNKNOWN truth
```

页面现象不能覆盖 Node durable truth；内部 API/DB/source 也不能制造真实 UI Acceptance PASS。

## 3.1 Canonical Chat tab lifecycle — HARD RULE

This is the Browser-side project contract for all ProFlow Maintenance Chat automation, including prerequisites/recovery and business actions.

Normal state must contain exactly one Monitor ChatGPT conversation tab for the current Monitor. Resolve it from Node owner identity (`current/drive-target chatId`, exact `conversationLocator`, and fresh `browserTarget.windowId/tabId` when available), never from tab order or visual guesswork.

Before every Chat-facing Browser action, the exact existing target tab must be active in its dedicated window. If inactive, activate the same tab. If it is in a shared/wrong window, move the same tab into the dedicated window, activate it, invalidate stale content-session identity, and re-observe before write.

Do not open a new Chat tab for:
- Browser/controller reconnect or recovery;
- list-tabs/snapshot/screenshot timeout;
- auth uncertainty;
- stale observation/content identity;
- slow local/runtime work;
- UNKNOWN Browser effect;
- focus/window repair.

A new Chat tab is permitted only for a formally authorized `BOOTSTRAP` when Node owner facts prove no unresolved pending create and no live successor. Create exactly one blank successor tab and reuse that exact tab through chatId capture, registration, boot proof, and takeover.

Formal handoff overlap is the only normal temporary exception: one predecessor Chat tab in its dedicated window plus one successor Chat tab in a different dedicated window. No third Monitor Chat tab is allowed. After successor takeover readback proves `currentChatId=successor` and `mutationMode=FULL`, converge back to the single-Chat-tab steady state when reconciliation no longer requires the predecessor page.

`Browser control UNKNOWN` never means `Chat tab absent`; recover the canonical control/session around the same tab instead of creating another tab or Browser owner.

## 4. mutation ownership

Maintenance 或 Monitor 在本机 mutation 前必须使用：

```text
node automation/proflow-maintenance/monitor-current.mjs
```

正式判定只看 Node owner 返回的 `mutationMode`：

- `FULL`：current + activated + no hold + handoff not started；
- `HANDOFF_ONLY`：current + activated + handoff started but not completed；
- `NONE`：其它全部。

因此：
- registered-but-not-active successor = NONE；
- predecessor `handoff.complete` 后即使仍是 `currentChatId` = NONE；
- 不能仅凭 Chat 页面、shiftId、handoff 文本或 currentChatId 推断 mutation 权。

## 5. Initial Monitor

Initial path：

```text
monitor-injection.mjs bootstrap --initial
→ Node pendingBootstrap
→ Browser scheduler requests drive
→ Execution monitor.chat.create
→ real Chat created + BOOTSTRAP submitted
→ APPLIED settlement captures real chatId and registers it
→ successor/initial Monitor restores authority
→ monitor-boot-proof.mjs --authorities-read
→ bootProof.record
→ monitor-takeover.mjs
→ takeover.accept
→ current.read mutationMode=FULL
```

Initial bootstrap 只允许在没有 current Chat 且没有 live candidate 时 stage。
不要恢复 legacy `run.create` / BOOTING seed。

## 6. Normal TURN_WAKE

```text
BUSY
→ READY
→ readyStable
→ round boundary
→ rotation not due
→ TURN_WAKE
```

TURN_WAKE：
- fixed neutral base；
- 最多一个 Model continuation hint；
- hint 只作 advisory；
- ProFlow 项目事实以 Formal Spec/CURRENT 为准；Chat continuity 以 proflow-chat-loop 为准；runtime/lifecycle 以 Node owner 为准；
- successful consumption 后清除；
- rotation due 时丢弃并优先 HANDOFF；
- 正常 TURN_WAKE 不通知用户。

## 7. Handoff / successor

正确顺序：

```text
rotation due at round boundary
→ HANDOFF physical effect
→ HANDOFF_STARTED notification
→ predecessor updates the Chat Loop continuation checkpoint only
→ monitor-handoff-complete.mjs
→ handoff.complete
→ predecessor mutationMode=NONE
→ only now stage fresh successor bootstrap
→ monitor.chat.create
→ real successor registered, not current
→ successor may need multiple BOOTSTRAP/TURN_WAKE rounds with mutationMode=NONE
→ successor bootProof.record
→ takeover.accept
→ atomic currentChatId switch
```

不能在 handoff 完成前预生成 successor bootstrap。
`monitor-handoff-complete` 不要求 pendingBootstrap；反过来，`bootstrap.stage` 要求 predecessor handoff 已 completed 且 nextShiftId 匹配。

## 8. UNKNOWN / recovery

Browser create/submit timeout 或 transport loss：

```text
same driveId
same messageRef
same contentFingerprint
same Execution identity
→ reconcile APPLIED | NOT_APPLIED | UNKNOWN
```

禁止：
- 新 idempotency key；
- duplicate Chat create；
- duplicate message submit；
- notification failure触发 Browser side-effect replay。

UNKNOWN 未解时不允许 abandon successor 或创建 replacement。

## 9. HOLD / notification

BLOCKED 写入 Node-owned hold。
hold 存在时自动 drive 停止。
BLOCKER_CLEARED 只清当前 owner Chat 的 hold。

所有通知进入同一 Node outbox：
- Browser：机械 incident；
- Node：state transition incident；
- Model：semantic notification request；
- TURN_WAKE：silent。

Webhook transport timeout = `UNCERTAIN`，不得盲 retry。

## 10. Runtime convergence gate

Source Verify PASS 不等于真实运行时 PASS。

```text
accepted source
→ built artifact
→ official module adoption
→ formal Platform lifecycle
→ running PID/load path/moduleVersion identity
→ current Browser/Gateway/provider reality
```

任何一层不一致：

`REAL_SCENE_NOT_READY`

只修 earliest divergence，不进入下游 Acceptance。

## 11. Acceptance levels

Repair loop：
- exact failed scene：`SAME_SCENE`
- affected path replay：`FAST_REPLAY`
- explicit stage/release gate：`FULL_FRESH`

Stage-final Monitor v4 至少覆盖：
- initial create/register/boot/takeover；
- normal multi-turn TURN_WAKE；
- observation reload/rebind；
- UNKNOWN no-duplicate reconciliation；
- HOLD；
- rotation/HANDOFF；
- multi-turn successor boot；
- failed successor abandon/replacement；
- notification dedupe/UNCERTAIN；
- legacy cutover/no dual writer；
- Product/Worker Browser regression。

## 12. Existing M1 lesson

历史/app-template Retry 可以制造旧 classifier false positive。

```text
WAITING/UNKNOWN-like observation
≠ 必然存在当前有效 human action
```

因此 Maintenance 自动化永远不固化：

`attention-looking state → blind click Retry`

而是：

```text
EYES
→ first divergence
→ exact owner
→ Engineering repair
→ Verify
→ runtime convergence
→ SAME_SCENE proof
```

## 13. Helper owner

正式 Maintenance helper：

`/Users/agent/Desktop/proton-workspace/automation/proflow-maintenance/`

其中：
- `monitor-current` / `monitor-state`：read truth；
- `monitor-event`：低权限 semantic state；
- `monitor-injection`：TURN_WAKE/bootstrap intent；
- `monitor-handoff-complete`：formal handoff completion；
- `monitor-boot-proof`：successor self proof；
  - new proofs use v4 with separate `projectContextProofs` / `chatLoopContextProof`; existing v3 is read-only compatibility；
- `monitor-takeover`：atomic ownership switch；
- `monitor-successor-abandon`：controlled recovery；
- `monitor-notify`：Model semantic notification；
- `monitor-migrate-legacy`：migration inspect/adoption proof。

Helper 不能直接写 Monitor state、不能启动 shadow owner、不能建立第二 truth。
