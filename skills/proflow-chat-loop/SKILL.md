---
name: proflow-chat-loop
description: ProFlow-only ChatGPT web Monitor shift loop for continuous engineering handoff, one-active-shift ownership, Phase 4 mission recovery, real-scene gating, and near-4h successor rotation inside the 学习 project.
---

# ProFlow Chat Loop

## Project identity — HARD RULE

**PROFLOW-SPECIFIC ONLY.** This Skill exists only to drive continuous iteration of:

`/Users/agent/Desktop/proton-workspace/repos/proflow`

Do not use it for ChatWeb, Job Search System, or any other project.
It owns ProFlow Chat-to-Chat continuation only; shared Engineering and Acceptance protocols keep their own authority.

**Monitor Chat is a separate ChatGPT web chat inside the `学习` project.**
The chat that creates or supervises a Monitor Chat is not itself the Monitor Chat.
A successor is a newly created ChatGPT web chat, not a ProFlow Task/Worker and not a Codex/CLI session.

Exactly one Monitor shift may own ProFlow mutation at a time.


## Context ownership boundary — HARD RULE

Three different contexts have different owners and MUST NOT be merged:

```text
ProFlow project context
→ repos/proflow/spec/.../02-当前接力/CURRENT.md
→ CURRENT.REQUIRED_CONTEXT + Formal Spec / Phase docs

ProFlow Chat Loop continuation
→ skills/proflow-chat-loop/.handoff/current.md

Monitor runtime / lifecycle
→ Node Monitor Service
→ .proflow/runtime/modules/execution-browser-extension/monitor/monitor-state.json
```

- **ProFlow CURRENT is project context.** It owns project phase, gates, project blocker/next action, product/engineering context and REQUIRED_CONTEXT. `proflow-chat-loop` must read it; it must not replace it.
- **`.handoff/current.md` is Chat Loop continuation only.** It owns cross-Chat continuity: current loop objective/stage, what this Chat completed, the next Chat Loop action, Chat-specific blockers, owner/receipt references, `mustPreserve/mustNotDo`, and formal handoff intent.
- **Node Monitor Service is the Monitor runtime authority.** Its JSON/state APIs own `currentChatId`, chat records, derived mutation mode, boot proof, takeover, pending bootstrap, browser target/page observation, hold, pending dispatch, notification outbox, idempotency and migration.

`.handoff/current.md` MUST NOT copy Node runtime values or ProFlow project CURRENT values into a competing snapshot. If continuity depends on them, record only the authority/reference that the next Chat must fresh-read.

`handoffState` and `nextShiftId` are the only machine-consumed fields intentionally kept in `.handoff/current.md`: they express **Chat Loop handoff intent** for `monitor-handoff-complete.mjs`. They do not prove handoff completion, current ownership, takeover, or mutation permission; Node state/readback proves those facts.

## Browser drive + visibility contract — HARD RULE

The Browser/Extension is the **scheduler and physical carrier, never the task decision-maker**. Node Monitor state is the sole Monitor truth writer. Platform Host is only an authenticated relay into the existing Execution Runtime / Browser effect owner; it MUST NOT run an independent Monitor polling scheduler or invent a drive.

Monitor has three drive classes:

```text
BOOTSTRAP
→ first message of a newly created blank successor Chat
→ fixed bootstrap template + successor bootstrap context produced only after formal predecessor handoff completes

TURN_WAKE
→ after the current ACTIVE Monitor produces a newly settled assistant turn and READY is stable
→ fixed neutral wake template + at most one pending model-authored continuation intent for the next round

HANDOFF
→ at the round boundary when now >= rotationDueAt
→ fixed handoff template + Node-owned mechanical handoff facts
→ HANDOFF has priority over TURN_WAKE; any pending TURN_WAKE intent is invalidated before send
```

The Browser chooses **when and which drive class**. The Monitor model chooses semantic engineering work. Browser/Node must never invent a Task, Phase, repair target, human decision, or blocker resolution.

Drive side effects are idempotent by stable `driveId/messageRef/contentFingerprint`. A timeout/transport loss is `UNKNOWN`, never permission to resend with a new identity. Reconciliation must reuse the same Execution identity.

### Notification ownership — HARD RULE

All Monitor notifications use one Node-owned notification outbox and the existing Workspace Feishu/Lark webhook transport. There is no direct Model-to-webhook path and no second notification system.

Mechanical notifications are Node-owned:

```text
HANDOFF_STARTED
BROWSER_ACTION_FAILED / browser-effect UNKNOWN
UNKNOWN_TIMEOUT
LOOP_STALLED
TAKEOVER_STALLED
CHAT_REGISTERED / CURRENT_CHAT_SWITCHED / SUCCESSOR_ABANDONED when configured as visible
```

Normal TURN_WAKE is **silent**. Model-authored semantic notifications (user decision required, external blocker, serious product risk, important semantic milestone) are requested through the Monitor notification API/script and then enter the same Node outbox.

Notification delivery failure changes only notification reality. It MUST NOT replay TURN_WAKE, HANDOFF, BOOTSTRAP, Chat create, Task, Approval, deployment, or any other side effect.

### Dedicated Monitor window — HARD RULE

Every Monitor Chat owns a **dedicated Chrome window**. Its Monitor tab must remain the active tab of that window; the window itself may stay `focused=false` so normal user foreground work is not stolen.

Before Monitor `observe / submit / verify / screenshot`, the Browser owner must verify the exact Chat tab is active in its dedicated window. If the Chat is found in a shared window or inactive tab, move the **same tab** into a dedicated window / reactivate it, invalidate stale content-session identity, and re-observe before any write. Never duplicate the conversation merely to repair window state.

During handoff, predecessor and successor may coexist in separate dedicated windows and each Monitor tab may be active in its own window. This physical requirement does not change the one-writer rule: only the current ACTIVE shift may mutate ProFlow.

## Canonical Monitor Chat tab lifecycle — HARD RULE

This invariant applies across the entire ProFlow Maintenance automation chain: business actions, prerequisite/recovery Browser work, runtime convergence, and Acceptance. It is not limited to the Monitor business-action helpers.

### Steady-state invariant

Normal Monitor steady state has exactly **one ChatGPT conversation tab** for the current Monitor Chat. Non-Chat support tabs (for example extension manager or auth/support surfaces) do not count as Monitor Chat tabs, but they must never be mistaken for the Monitor conversation target.

The canonical Monitor Chat tab is resolved from owner-backed identity, in this order:

```text
current/drive-target chatId
→ exact conversationLocator
→ fresh browserTarget { windowId, tabId } when present
→ exact same tab recovered from Browser reality
```

Tab index, visual position, recently focused tab, or "the only ChatGPT-looking page" is not identity.

### Before every Chat action

Before any Chat-facing `observe / screenshot / submit / verify / recovery / reconnect` action:

1. resolve the existing canonical Chat tab;
2. prove it is the exact target Chat;
3. prove that tab is **active in its own dedicated Chrome window**;
4. only then perform the action.

If the exact tab exists but is inactive, activate the **same tab**.
If it is in a shared/wrong window, move the **same tab** into its dedicated window, activate it, invalidate stale content-session identity, then rebind/re-observe.
Do not create or duplicate a Chat tab merely to repair focus, window placement, controller state, or observation freshness.

### Creation gate

Opening a new ChatGPT conversation tab is forbidden except for a formally authorized `BOOTSTRAP` create:

```text
Node owner proves bootstrap is legally staged
+ no unresolved pending create
+ no live successor for that handoff
→ Browser may create exactly one blank Chat tab
→ BOOTSTRAP is submitted once
→ real chatId/conversationLocator is captured
→ that exact tab becomes the successor canonical tab
```

A Browser/controller timeout, missing tab-list result, stale content identity, auth uncertainty, slow command, or UNKNOWN effect never authorizes a second Chat tab.

### Handoff overlap exception

The only normal exception to the one-Chat-tab steady state is formal handoff overlap:

```text
predecessor dedicated window → exactly one predecessor Chat tab
successor dedicated window   → exactly one successor Chat tab
```

No third Monitor Chat tab is allowed. After successor `current.read` proves `currentChatId=successor` and `mutationMode=FULL`, the predecessor is no longer a valid mutation/drive target and the Browser lifecycle must converge back to the one-Chat-tab steady state once no reconciliation evidence still depends on the predecessor page.

### Recovery rule

`Browser control UNKNOWN != Chat tab absent`.

On controller/session/list-tabs failure, preserve the canonical tab identity and recover/reconnect the existing Browser control path. Never translate control-plane uncertainty into `new tab`, duplicate conversation, duplicate successor, or a new Browser owner.

## Maintenance business action protocol — HARD RULE

This section is the **operational fast path for the Monitor / Maintenance business layer only**. It intentionally does **not** define Browser, Dev Tunnel, Platform startup, or other prerequisite/post-runtime automation; those are separate layers. Once this layer is reachable, the model must use these action contracts instead of rereading helper source or reconstructing the state machine from chat history.

### Execution model

```text
fresh owner projection still sufficient?
→ YES: reuse it
→ NO: READ_CURRENT
   → FULL: continue current Monitor work
   → HANDOFF_ONLY: handoff actions only
   → NONE: inspect pendingBootstrap; READ_STATE only if needed

READ_STATE only when READ_CURRENT cannot decide the next legal action
or when a mutation/physical effect needs reconciliation.
```

Scripts own facts and validated state transitions. The Skill owns routing. The model owns semantic judgement. Never move routing policy into ad-hoc shell logic or infer business truth from process prose.

### Input ownership

- **Mechanical identity**: `chatId / shiftId / currentChatId / nextShiftId / requestId` must come from current owner state, handoff authority, or helper defaults. Do not invent or manually copy them when a helper can resolve them.
- **Semantic input**: blocker reason, continuation intent, handoff content, notification title/message, and abandon reason are model-authored.
- **Attestation input**: flags such as `--authorities-read` assert an action the calling Monitor Chat itself actually completed. They are never auto-filled or delegated.
- Mutation helpers derive a stable request identity by default. On timeout/transport loss, reconcile the owner before any retry; never change identity merely to retry.

### Expected helper time

These budgets cover the local Monitor helper itself, not Browser physical effects:

```text
FAST   expected <= 5s
NORMAL expected <= 15s
```

A local helper exceeding its budget is abnormal control/runtime latency, not evidence that a business transition is still progressing. Read-only actions may be retried as reads. A mutating action that times out is `UNKNOWN` until owner state/receipt proves `APPLIED | NOT_APPLIED | UNKNOWN`; do not blindly replay it.

Current measured reference on the ProFlow workspace (2026-09-20; observations, not hard limits):

```text
READ_CURRENT live owner          0.824s
READ_STATE live owner            0.157s
READ_CONFIG live owner           0.151s
migration inspect/assert live    0.147-0.161s
isolated mutation helper CLI     0.216-3.203s
formal Monitor owner tests       6/6 PASS, 0.976s suite
Maintenance helper tests         7/7 PASS, 0.310s suite
```

The stable routing budget remains `FAST <= 5s`, `NORMAL <= 15s`; do not turn these observed numbers into tighter retry deadlines.

### Fast result router

```text
READ_CURRENT
├─ mutationMode=FULL
│  └─ current owner established → continue ProFlow work
├─ mutationMode=HANDOFF_ONLY
│  └─ no normal mutation → WRITE_HANDOFF / COMPLETE_HANDOFF path only
└─ mutationMode=NONE
   ├─ pendingBootstrap != null
   │  └─ bootstrap already staged → do not stage/create another
   └─ otherwise
      └─ READ_STATE once

READ_STATE
├─ pendingDispatch != null
│  └─ reconcile the SAME dispatch/effect; no new identity
├─ hold != null
│  └─ remain blocked until CLEAR_BLOCK
├─ live candidate bootProofAt == null
│  └─ candidate Monitor Chat must PUBLISH_BOOT_PROOF
├─ live candidate bootProofAt != null && activatedAt == null
│  └─ candidate Monitor Chat must ACCEPT_TAKEOVER
└─ candidate/current activated and current projection is FULL
   └─ owner established → continue ProFlow work
```

A pending TURN_WAKE intent is not a reason to add another intent. Replace it only when the old intent is mechanically proven stale.

### Action cards

#### ACTION: READ_CURRENT

- **OWNER**: Node Monitor state.
- **WHEN**: first business-layer decision without a fresh projection; after takeover/handoff/recovery; before any ProFlow mutation when ownership is uncertain.
- **COMMAND**: `node automation/proflow-maintenance/monitor-current.mjs [--expect-shift-id <id>] [--require-mutation FULL|HANDOFF_ONLY]`
- **INPUT**: normally none; expected shift comes from current handoff/candidate authority.
- **OUTPUT**: `contract, status, currentChatId, currentShiftId, mutationMode, driveTargetChatId, driveTargetShiftId, pendingBootstrap`.
- **TIME**: FAST.
- **NEXT**: route only by the Fast result router above.
- **NEVER**: never equate non-null `currentChatId` with mutation permission; `mutationMode` is the gate.

#### ACTION: READ_STATE

- **OWNER**: Node Monitor state.
- **WHEN**: READ_CURRENT is insufficient; reconcile timeout/UNKNOWN; inspect candidate, hold, pending dispatch, notification, idempotency, or migration facts.
- **COMMAND**: `node automation/proflow-maintenance/monitor-state.mjs`
- **INPUT**: none.
- **OUTPUT**: canonical `proflow.monitor-state.v1` with top-level `contract, config, currentChatId, pendingBootstrap, chats, notifications, idempotency, systemEventSequence, systemEvents, migration`.
- **TIME**: FAST.
- **NEXT**: inspect only the fields required by the current decision; use the Fast result router.
- **NEVER**: do not default to full-state reads on every turn and do not edit `monitor-state.json` directly.

#### ACTION: READ_CONFIG / UPDATE_CONFIG

- **OWNER**: Node Monitor state.
- **WHEN**: Maintenance needs Monitor runtime configuration; normal work should not reread config without a named reason.
- **COMMAND**: `node automation/proflow-maintenance/monitor-config.mjs`; mutation adds `--patch-json '<json>'`.
- **INPUT**: config patch is explicit Maintenance intent; request identity is stable by default.
- **OUTPUT**: full config object: `revision, enabled, notificationsEnabled, projectLocator, rotationMs, readyStableMs, observationStaleMs, observationPersistIntervalMs, unknownTimeoutMs, chatIdCaptureTimeoutMs, takeoverWarnMs, webhookTimeoutMs`; UPDATE returns the same shape with incremented `revision`.
- **TIME**: FAST.
- **NEXT**: successful update → continue from the business checkpoint; timeout on update → READ_CONFIG/READ_STATE before any retry.
- **NEVER**: no direct config/state file mutation.

#### ACTION: BLOCK / CLEAR_BLOCK

- **OWNER**: Model semantic decision → Node Monitor state.
- **WHEN**: current Monitor genuinely requires a user decision or an external prerequisite; clear only after the blocker is resolved.
- **COMMAND**: `monitor-event.mjs blocked --kind USER_DECISION_REQUIRED|EXTERNAL_BLOCKER --incident-ref <ref> --reason <text>`; clear with `monitor-event.mjs clear`.
- **INPUT**: `kind / incidentRef / reason` are model semantic input; current chat identity is resolved by helper unless an explicit owner-backed target is required.
- **OUTPUT**: `{ chatId, type, accepted }`; `type` is `BLOCKED` or `BLOCKER_CLEARED`, and successful owner acceptance returns `accepted=true`.
- **TIME**: FAST.
- **NEXT**: BLOCK accepted → stop normal mutation; CLEAR accepted → READ_CURRENT if ownership may have changed, otherwise resume from the preserved checkpoint.
- **NEVER**: do not encode an ordinary slow command or tool timeout as a semantic blocker without an actual external/user dependency.

#### ACTION: STAGE_TURN_WAKE_INTENT

- **OWNER**: Model semantic intent → Node Monitor state; Browser remains the physical sender.
- **WHEN**: the model has a useful advisory continuation for the next TURN_WAKE.
- **COMMAND**: `node automation/proflow-maintenance/monitor-injection.mjs turn-wake --text '<intent>'`; use `--replace` only for a proven-stale pending intent.
- **INPUT**: advisory text; target defaults to current chat.
- **OUTPUT**: `{ chatId, type: "TURN_WAKE_INJECTION_STAGED", accepted: true }`.
- **TIME**: FAST.
- **NEXT**: staging success → stop; scheduler consumes it at the next legal TURN_WAKE. `MONITOR_TURN_WAKE_ALREADY_PENDING` → keep existing intent unless it is proven stale.
- **NEVER**: intent is not authority, not a task decision, and not permission to send Browser text manually.

#### ACTION: REQUEST_NOTIFICATION

- **OWNER**: Model requests semantics; Node notification outbox owns delivery.
- **WHEN**: user decision, external blocker, serious product risk, or important semantic milestone merits visibility.
- **COMMAND**: `node automation/proflow-maintenance/monitor-notify.mjs --kind <kind> --incident-ref <ref> --title '<title>' --message '<message>'`.
- **INPUT**: semantic notification content.
- **OUTPUT**: if notifications are disabled: `{ status: "DISABLED" }`; otherwise a `MonitorNotificationItem` with `notificationId, eventId, dedupeKey, source, kind, chatId, incidentRef, title, message, status, attempts, retryable, createdAt, lastAttemptAt, sentAt, lastError`. Fresh enqueue status is `PENDING`. The stable `requestId` is an idempotency input/receipt identity, not a normal stdout field.
- **TIME**: FAST.
- **NEXT**: enqueue success ends this action; delivery status is independent of the business transition.
- **NEVER**: notification failure must never replay TURN_WAKE, HANDOFF, BOOTSTRAP, deployment, or any other side effect.

#### ACTION: WRITE_HANDOFF

- **OWNER**: predecessor Monitor model.
- **WHEN**: HANDOFF drive is active and the predecessor has reached a safe atomic checkpoint.
- **COMMAND**: replace the single authority `skills/proflow-chat-loop/.handoff/current.md`.
- **INPUT**: Chat Loop continuation semantics only: what this Chat completed, Chat-specific first divergence/blocker, next Chat Loop action, `mustPreserve/mustNotDo`, references to ProFlow/Node/receipt authorities, and—only for formal rotation—one successor `nextShiftId`. Do not copy Node runtime or ProFlow CURRENT values into the handoff.
- **OUTPUT**: `handoffState: READY_FOR_TAKEOVER` with a non-null `nextShiftId`.
- **TIME**: model-authored; file write itself should be FAST.
- **NEXT**: after the physical HANDOFF effect is settled and no dispatch is unresolved → COMPLETE_HANDOFF.
- **NEVER**: do not create parallel handoff files; do not put predecessor-only creation mechanics into successor `chatLoopNextAction`.

#### ACTION: COMPLETE_HANDOFF

- **OWNER**: predecessor Monitor → Node Monitor state.
- **WHEN**: current handoff file is READY_FOR_TAKEOVER, HANDOFF physical effect is settled, mutation mode is HANDOFF_ONLY (unless already completed), and no pending dispatch exists.
- **COMMAND**: `node automation/proflow-maintenance/monitor-handoff-complete.mjs`.
- **INPUT**: current chat + `nextShiftId` are resolved from owner state and handoff.
- **OUTPUT**: `{ chatId, nextShiftId, completedAt, mutationMode: "NONE" }`; idempotent repeat additionally returns `status: "ALREADY_COMPLETED"`.
- **TIME**: FAST.
- **NEXT**: completion → STAGE_BOOTSTRAP for the named successor.
- **NEVER**: never complete while `MONITOR_DISPATCH_UNRESOLVED`; predecessor must not resume ordinary ProFlow mutation afterward.

#### ACTION: STAGE_BOOTSTRAP

- **OWNER**: predecessor/initial Maintenance semantic staging → Node Monitor state; Browser owns real Chat creation/registration.
- **WHEN**: initial Monitor has no current/live candidate, or a predecessor handoff is formally complete and no live successor/pending bootstrap exists.
- **COMMAND**: initial: `monitor-injection.mjs bootstrap --initial --shift-id <shift> --text-file <fresh-context>`; successor: `monitor-injection.mjs bootstrap --shift-id <shift> --text-file <fresh-context>`.
- **INPUT**: expected shift identity from handoff/initial plan plus freshly composed bootstrap context.
- **OUTPUT**: canonical `pendingBootstrap`: `injectionId, sourceChatId, expectedShiftId, text, projectLocator, stagedAt, phase`, plus `create { operationId, messageRef, contentFingerprint, effectRef, state }`. Fresh stage uses `phase=PENDING_CREATE` and `create.state=STARTED`.
- **TIME**: FAST for staging only.
- **NEXT**: success → stop business-layer staging and let Browser physical create/registration proceed; later READ_CURRENT/READ_STATE reconciles the result.
- **NEVER**: `MONITOR_BOOTSTRAP_ALREADY_PENDING` or `MONITOR_LIVE_SUCCESSOR_EXISTS` forbids staging another; there is no standalone production `chat.register` action.

#### ACTION: PUBLISH_BOOT_PROOF

- **OWNER**: successor Monitor Chat itself.
- **WHEN**: successor has independently restored all three required context owners: ProFlow project context (`CURRENT` + `CURRENT.REQUIRED_CONTEXT` + required Phase 4 docs), Chat Loop continuation (this Skill + continuation checkpoint), and current Monitor runtime identity from Node state.
- **COMMAND**: `node automation/proflow-maintenance/monitor-boot-proof.mjs --shift-id <shift> --authorities-read`.
- **INPUT**: shift identity from registered candidate state; `--authorities-read` is a non-delegable model attestation.
- **OUTPUT**: helper publishes only `proflow.monitor-boot-proof.v4`, separating `projectContextProofs` from `chatLoopContextProof`; wrapper also exposes `proofContract`. Existing persisted v3 proofs remain legacy-readable, but no new v3 proof may be produced. An old live Node that explicitly returns `MONITOR_CONTROL_OPERATION_UNSUPPORTED` for `capabilities.read` yields `MONITOR_BOOT_PROOF_RUNTIME_ADOPTION_REQUIRED`; timeout/transport UNKNOWN, malformed capabilities, or a capability-aware Node without v4 support also fail closed.
- **TIME**: NORMAL.
- **NEXT**: RECORDED/ALREADY_RECORDED → ACCEPT_TAKEOVER; ALREADY_ACTIVE → READ_CURRENT and require target current + FULL before work.
- **NEVER**: Maintenance Chat, Browser carrier, or predecessor must not attest for the successor.

#### ACTION: ACCEPT_TAKEOVER

- **OWNER**: successor Monitor → Node Monitor state.
- **WHEN**: candidate boot proof exists; predecessor handoff is complete when there is a predecessor; no hold/pending dispatch blocks takeover.
- **COMMAND**: `node automation/proflow-maintenance/monitor-takeover.mjs --shift-id <shift>`.
- **INPUT**: shift identity from registered candidate state.
- **OUTPUT**: helper wrapper `contract, status, shiftId, chatId, current`; `ACCEPTED` additionally includes nested owner `result { chatId, activatedAt, rotationDueAt, currentChatId, mutationMode }`. `current` is the authoritative readback projection.
- **TIME**: NORMAL.
- **NEXT**: only `currentChatId == target chatId && currentShiftId == shiftId && mutationMode == FULL` means takeover complete → resume ProFlow work. `MONITOR_BOOT_PROOF_REQUIRED` → PUBLISH_BOOT_PROOF. `MONITOR_HANDOFF_REQUIRED` → restore predecessor handoff authority.
- **NEVER**: never set `currentChatId` directly, never infer takeover from chat prose, and never create another successor because takeover is slow.

#### ACTION: ABANDON_SUCCESSOR

- **OWNER**: Maintenance/Monitor decision → Node Monitor state.
- **WHEN**: a mechanically proven failed candidate is not current/active and has no unresolved pending dispatch.
- **COMMAND**: `node automation/proflow-maintenance/monitor-successor-abandon.mjs --shift-id <candidate> --reason '<proven reason>'`.
- **INPUT**: candidate shift from owner state; reason must name the mechanically proven failure.
- **OUTPUT**: `ABANDONED` wrapper contains `contract, status, shiftId, chatId, result { chatId, abandonedAt }`; `ALREADY_ABANDONED` contains `contract, status, shiftId, chatId, abandonedAt`. The semantic abandon reason is input/state, not echoed by the formal owner result.
- **TIME**: FAST.
- **NEXT**: after abandonment, replacement may be staged only through the normal handoff/bootstrap preconditions.
- **NEVER**: timeout alone is not proof of failure; `MONITOR_SUCCESSOR_ABANDON_FORBIDDEN` means keep/reconcile the candidate.

#### ACTION: INSPECT_MIGRATION / ASSERT_ADOPTED

- **OWNER**: Node Monitor state; read-only Maintenance recovery surface.
- **WHEN**: cutover/recovery specifically needs legacy adoption evidence. Not part of the normal per-turn path.
- **COMMAND**: `node automation/proflow-maintenance/monitor-migrate-legacy.mjs [--assert-adopted]`.
- **INPUT**: none.
- **OUTPUT**: `contract, status, owner, applyMode, legacy, migration`; `status` is `MIGRATED | OWNER_ADOPTED_WITH_LEGACY_PRESENT | NO_LEGACY_MIGRATION_REQUIRED`.
- **TIME**: FAST.
- **NEXT**: assertion success → return to READ_CURRENT; failure routes to the owning runtime repair, not direct state mutation.
- **NEVER**: helper does not apply migration; `--apply` is forbidden because migration apply belongs to formal Node owner startup.

### Shared output / UNKNOWN router

Use these result families without reopening helper source:

```text
status=OK + mutationMode=FULL
→ continue work

status=NOT_CURRENT_YET
→ READ_STATE; route candidate by bootProofAt / activatedAt

status=SHIFT_NOT_FOUND
→ READ_STATE; do not create a replacement from this fact alone

RECORDED | ALREADY_RECORDED
→ ACCEPT_TAKEOVER

ALREADY_ACTIVE
→ READ_CURRENT; work only if target is current + FULL

ACCEPTED | ALREADY_CURRENT
→ require readback current target + FULL, then continue

MONITOR_BOOT_PROOF_REQUIRED
→ successor PUBLISH_BOOT_PROOF

MONITOR_HANDOFF_REQUIRED
→ predecessor handoff authority incomplete

MONITOR_DISPATCH_UNRESOLVED
→ reconcile the same dispatch/effect; no new identity

MONITOR_TURN_WAKE_ALREADY_PENDING
→ keep existing intent; replace only if proven stale

MONITOR_BOOTSTRAP_ALREADY_PENDING | MONITOR_LIVE_SUCCESSOR_EXISTS
→ do not stage/create another successor

MONITOR_SUCCESSOR_ABANDON_FORBIDDEN
→ keep/reconcile current candidate

timeout | transport loss on a mutation helper
→ READ_CURRENT / READ_STATE / receipt using the same owner authority
→ classify APPLIED | NOT_APPLIED | UNKNOWN
→ retry only after proven NOT_APPLIED, preserving stable identity
```

### Global business-layer prohibitions

- Never directly write `monitor-state.json`; Node Monitor state is the sole business-state writer.
- Never manually invent a Chat registration or current-chat switch.
- Never let Maintenance Chat impersonate successor boot attestation.
- Never convert a Browser/transport timeout into a new Chat, new request identity, blocker, or abandon decision without owner-backed proof.
- Never use full `READ_STATE` merely for reassurance when a fresh `READ_CURRENT` projection already decides the next action.
- Never let notification delivery outcome change the underlying business side effect.
- Never treat model-authored continuation text as authority; current reality, Formal Spec, CURRENT, and handoff remain superior.

## Boot authority and Phase 4 mission — HARD RULE

Every Monitor shift restores **separate owners**, never one merged context bundle.

### Shared execution protocol

1. `/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/SKILL.md`

### Chat Loop continuation

1. `/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/SKILL.md`
2. `/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/.handoff/current.md`

These own only Maintenance/Monitor Chat-to-Chat continuation. They do not own ProFlow project state or Monitor runtime state.

### ProFlow project context

1. `/Users/agent/Desktop/proton-workspace/repos/proflow/spec/平台架构与公共约定/00-公共上下文/README.md`
2. Follow that README's fixed core order, including long-term rules 01 / 02 / 05.
3. `/Users/agent/Desktop/proton-workspace/repos/proflow/spec/平台架构与公共约定/00-公共上下文/02-当前接力/CURRENT.md`
4. Read every **repo-local** path in `CURRENT.REQUIRED_CONTEXT`.
5. While `CURRENT_PHASE = PHASE4`, read the required Phase 4 project Runbook(s), including `docs/phase4/04-自动迭代运行计划.md` when current authority requires it.

`CURRENT.REQUIRED_CONTEXT` MUST NOT contain the Chat Loop checkpoint or Node runtime JSON. ProFlow project context MUST NOT be copied into `.handoff/current.md`.

### Monitor runtime/lifecycle

Use the Node Monitor Service (`READ_CURRENT` / `READ_STATE`) for current Chat/shift, mutationMode, bootstrap/takeover/handoff state, page binding, pending dispatch, hold, notification/idempotency and other live lifecycle facts. Do not recover these from CURRENT or handoff prose.

Before real Browser/UI automation, read `/Users/agent/Desktop/proton-workspace/skills/chat-local-acceptance-automation-protocol/SKILL.md`.

### Boot proof publication — HARD RULE

完成上面的固定 authority、CURRENT.REQUIRED_CONTEXT、Phase 4 runbook 与 handoff 读取后，Monitor Chat **必须先发布正式 boot proof，再通过 takeover helper 取得 mutation ownership**。唯一正式 helper 是：

```text
node /Users/agent/Desktop/proton-workspace/automation/proflow-maintenance/monitor-boot-proof.mjs \
  --workspace /Users/agent/Desktop/proton-workspace \
  --shift-id <当前候选 shiftId> \
  --authorities-read

node /Users/agent/Desktop/proton-workspace/automation/proflow-maintenance/monitor-takeover.mjs \
  --workspace /Users/agent/Desktop/proton-workspace \
  --shift-id <同一 shiftId>
```

`--authorities-read` 是当前 successor Monitor Chat 对“各 owner 已分别真实读取”的显式确认；Maintenance Chat、Browser carrier 或 predecessor 不得代发。boot helper 从 Node Monitor state 解析真实 `chatId/shiftId`，分别机械验证 ProFlow project context 与 Chat Loop continuation 路径，并先调用只读 `capabilities.read`。只有明确支持 v4 的 live Node 才允许写入新的 boot proof；旧 live Node 不支持该 capability operation 时返回 `MONITOR_BOOT_PROOF_RUNTIME_ADOPTION_REQUIRED`，不得写 v3 compatibility envelope。任何 UNKNOWN 都不允许降级。helper 只调用 `bootProof.record`，不会切换 `currentChatId`、不会直接写 state、不会自动 takeover。

takeover 必须通过 `takeover.accept` 原子完成；成功后 helper 立即 `current.read` 回读，只有目标 `chatId/shiftId` 已成为 current 且 `mutationMode=FULL` 才算取得 ProFlow mutation ownership。registered-but-not-active successor 的 `mutationMode=NONE`；predecessor 在 `handoff.complete` 后即使仍是 `currentChatId`，`mutationMode` 也必须为 `NONE`。Browser scheduler 只在观察/恢复后请求下一条 drive；Platform Host 只是 authenticated relay，不存在独立 Monitor polling coordinator。

若 boot helper 返回 `RECORDED`、`ALREADY_RECORDED` 或 `ALREADY_ACTIVE`，只表示 boot proof 条件满足；它**不等于 takeover**。只有 `monitor-takeover.mjs` 的 owner readback 成功后，Monitor 才可回复 `PROFLOW_LOOP_TAKEOVER_ACCEPTED <shiftId>` 并开始 ProFlow mutation。Initial Monitor 也必须从 `monitor-injection.mjs bootstrap --initial` 的正式 Browser create 路径产生真实 Chat；禁止恢复 legacy `run.create/shift.activate` 语义。

A new shift must be able to state, **with source ownership preserved**:

```text
from ProFlow project context: current Phase / Gate / REQUIRED_CONTEXT / project blocker / project NEXT_ACTION
from Chat Loop continuation: current Chat-loop objective / completedThisChat / chatLoopNextAction
from Node runtime: current Chat/shift/mutationMode and only the lifecycle facts needed now
```

If these cannot be resolved, do not reconstruct them from old chat prose. Restore the missing authority first.

Owner routing:

```text
Monitor runtime/lifecycle  → Node Monitor Service
ProFlow project context    → Formal Spec / README / CURRENT / REQUIRED_CONTEXT
Chat Loop continuation     → proflow-chat-loop Skill + .handoff/current.md
Local execution mechanics  → Engineering / Acceptance Skill
```

Do not rank these as interchangeable snapshots. A fact is resolved only by its owner; stale copies in another context have no authority. Revalidate only the owner facts required by the next decision.

## REAL_SCENE gate — HARD RULE

The flywheel is allowed to repair ProFlow when reality is not ready, but it MUST NOT continue downstream live Acceptance, product iteration, or declare PASS on a mixed/stale runtime.
Before live Monitor work resumes after a code/runtime change, prove the real-scene chain:

```text
current source reality
→ verified built artifact
→ official Workspace adoption
→ formal owner lifecycle
→ running process loaded implementation identity
→ current external / Browser / Provider reality
```

Minimum proof, as applicable to the affected scope:

- current source branch / HEAD / dirty WIP are known and unrelated WIP is preserved;
- affected source has passed its Stage Verify and the artifact used by runtime was built from that accepted source;
- the official Platform module catalog / installed graph selects the intended artifact source for this environment;
- local development may use the official `workspace` module source when Platform selects it; manually launching `repos/proflow/packages/*/dist/...` as a shadow runtime does **not** satisfy Workspace adoption;
- services are started through their formal Platform / Module lifecycle, not a parallel hand-launched owner;
- PID / command / load path / moduleVersion or equivalent owner evidence proves the running process actually loaded the adopted implementation;
- required runtime health/readiness and current Gateway / tunnel / Browser / model-provider facts are freshly observed;
- no older process, stale package, or duplicate Browser/runtime owner is silently satisfying the same port or role.

If any required layer is missing or inconsistent, record:

`REAL_SCENE_NOT_READY`

Then the active shift may only repair/reconcile the earliest real-scene divergence until the chain is proven again. Do not continue to a later Acceptance checkpoint just because source tests passed.

## Single Chat Loop continuation context — HARD RULE

The only ProFlow **Chat Loop continuation checkpoint** is:

`/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/.handoff/current.md`

Do not create parallel handoff-final.md, handoff-v2.md, copied chat summaries, or another Chat Loop truth store.
At handoff/resume, replace `current.md` with one complete **Chat Loop continuation** snapshot.
`.handoff/` is local operational state and MUST remain Git-ignored.

This file does not own ProFlow project state and does not own Monitor runtime state. It must point the next Chat to ProFlow CURRENT and Node Monitor Service instead of restating their values.

`handoffState` / `nextShiftId` are Chat Loop handoff intent only. `monitor-handoff-complete.mjs` consumes them, but Node Monitor state remains the sole proof that the lifecycle transition actually completed.

## Shift lifecycle

```text
TAKEOVER
→ RESTORE PHASE 4 MISSION
→ PUBLISH BOOT PROOF
→ VERIFY MINIMUM OWNER FACTS
→ VERIFY / REPAIR REAL_SCENE
→ WORK
→ CHECKPOINT
→ PREPARE HANDOFF
→ CREATE ONE SUCCESSOR CHAT
→ SUCCESSOR CLAIMS
→ PREDECESSOR STOPS
```

### TAKEOVER

A new shift must:

- read the authorities above before engineering mutation;
- publish formal boot proof through `monitor-boot-proof.mjs` after completing those reads and before replying with the takeover token;
- fresh-read ProFlow CURRENT / required owner facts needed by the project action, plus any owner references named by `chatLoopNextAction`;
- preserve unrelated WIP; never clean/reset/stash it for convenience;
- restore `CURRENT.REQUIRED_CONTEXT` and the Phase 4 runbook before treating handoff as sufficient context;
- when `handoffState=READY_FOR_TAKEOVER`, claim the named `nextShiftId` before new mutation;
- execute `chatLoopNextAction` for Chat continuity, then continue the ProFlow project only from fresh `CURRENT.NEXT_ACTION`; do not reconstruct project state from handoff prose.

Takeover is proven only when the successor has successfully published boot proof and can truthfully reply:

`PROFLOW_LOOP_TAKEOVER_ACCEPTED <shiftId>`

This token proves shift ownership/context takeover; it does not by itself prove `REAL_SCENE` readiness.

### WORK

The active shift owns the current ProFlow implementation/verification/acceptance stage end-to-end.
Use the shared Engineering and Acceptance protocols normally.
Before returning to a live checkpoint after repairs, enforce the REAL_SCENE gate above.
When the ACTIVE Monitor completes a newly settled assistant turn, continuation is driven only by the `TURN_WAKE` contract above; the Browser must not invent or restate the next task. If the Monitor reaches an external dependency or needs user judgement, preserve that reality and surface it through the existing notification path; do not turn the wake prompt into a synthetic decision.
Do not create another Monitor Chat because a command is slow or a tool times out.
Never allow predecessor and successor chats to mutate ProFlow concurrently.

### Rotation deadline — HARD RULE

Record `shiftStartedAt` when the Monitor shift becomes active.
Begin handoff preparation as elapsed time approaches four hours; target **3h30–3h45**.
Do not start a new large stage once handoff preparation begins.
Earlier rotation is allowed when context pressure, UI latency, or tool reliability clearly degrades.

Do not rotate blindly while a non-idempotent side effect is UNKNOWN.
Reconcile it first or record the exact UNKNOWN authority in the handoff.

## PREPARE HANDOFF — HARD RULE

Before creating the successor, the active shift must:

- enter the `HANDOFF` drive path; Node state emits/deduplicates the corresponding `HANDOFF_STARTED` visibility event through the single Monitor notification outbox;
- finish the current safe atomic action or stop at a mechanically named first divergence;
- reconcile timed-out/non-idempotent effects as `APPLIED | NOT_APPLIED | UNKNOWN`;
- close Acceptance runs it owns and release Browser leases unless the current Acceptance protocol explicitly supports handoff;
- record only durable owner/receipt references needed by the next Chat; do not copy PID/session/runtime values when their owner can be fresh-read;
- refresh `.handoff/current.md` with Chat Loop continuation semantics plus references to ProFlow CURRENT / Node Monitor / other durable owners;
- set exactly one `chatLoopNextAction` for the successor Chat; the ProFlow project action itself comes from fresh `CURRENT.NEXT_ACTION`;
- set `handoffState: READY_FOR_TAKEOVER` and allocate exactly one `nextShiftId`.

The handoff must name one `chatLoopNextAction` and point runtime/project dependencies to their authorities rather than copying their values.
Never put credentials, tokens, Authorization values, or copied private browser content in the handoff.

## CREATE SUCCESSOR CHAT

Successor creation is real Browser automation and MUST follow the shared Acceptance Skill.
Reuse the canonical Browser/CDP owner; do not restart Chrome or create a second Browser controller merely to rotate chats.
Create the successor in its **own dedicated Chrome window** (or move the exact newly created Chat tab into one) and verify that successor tab is active in that window before submit/boot observation. Keep the predecessor in its own dedicated window during overlap; do not move either Monitor into the user's ordinary browsing window.

The predecessor creates exactly one blank Chat in ChatGPT project **`学习`**. The first message is the BOOTSTRAP drive.

BOOTSTRAP is composed only **after formal handoff completion**:

```text
fixed bootstrap template
+ successor bootstrap context
```

The dynamic successor bootstrap context may include the formal handoff reference/key facts, current Phase/CURRENT/REQUIRED_CONTEXT pointers, required Engineering/ProFlow Loop authorities, Chat-specific recovery reference / `chatLoopNextAction`, owner/receipt references for unresolved effects, and other takeover continuity facts needed by the new shift. It must not be generated early and then allowed to go stale while predecessor work continues.

The fixed bootstrap template must require the successor to read current local authority itself, including:

```text
/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/SKILL.md
/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/SKILL.md
/Users/agent/Desktop/proton-workspace/repos/proflow/spec/平台架构与公共约定/00-公共上下文/README.md
/Users/agent/Desktop/proton-workspace/repos/proflow/spec/平台架构与公共约定/00-公共上下文/02-当前接力/CURRENT.md
/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/.handoff/current.md
```

The new blank Chat has no real chatId before the first message. Browser sends BOOTSTRAP once, waits for the URL to become `.../c/<chatId>`, then registers that real chatId through Node state. On timeout/UNKNOWN it must reconcile the same creation operation; it must not blindly create/send another successor.

Do not paste the whole handoff into the new chat. The successor must still restore authority from local truth.

## Successor claim / predecessor retirement — HARD RULE

After the successor has read the context, published boot proof, and successfully completed `takeover.accept`:

- Node Monitor state atomically switches `currentChatId`, predecessor `nextChatId`, successor `activatedAt/rotationDueAt`;
- successor becomes the only ProFlow mutation owner only after `current.read` proves its `mutationMode=FULL`;
- predecessor performs no further local/product mutation; after formal handoff completion its mutation mode is already `NONE`;
- predecessor may do only minimum read-only observation needed to prove takeover, then stops.

If successor boot-proof publication, Browser creation/registration, or takeover cannot be proven, do not infer ownership from chat prose or `shiftId` alone. Never create a second successor while the first create/takeover result is UNKNOWN.

## Handoff content contract

`current.md` must remain compact and own only Chat Loop continuation semantics:

```text
chatLoopContextVersion / updatedAt
handoffState / nextShiftId              # handoff intent only
chatLoopOwner / chatLoopStage / chatLoopNextAction
completedThisChat
chatLoopFirstDivergence / blockers
authorityReferences                    # ProFlow CURRENT / Node Monitor / receipts
mustPreserve / mustNotDo
```

Do not store copied values for `currentChatId`, `mutationMode`, boot proof, takeover, pendingBootstrap, browserTarget, page state, notification/outbox/idempotency, Platform/Dev Tunnel runtime, ProFlow phase/gates/project NEXT_ACTION, repo runtime snapshot, or Acceptance runtime state. Those belong to their own authorities and must be fresh-read when needed.

During formal Monitor rotation, `handoffState: READY_FOR_TAKEOVER` plus non-null `nextShiftId` is a semantic request consumed by `monitor-handoff-complete.mjs`; it is not runtime proof. Node Monitor state/readback decides the actual lifecycle result.

## ProFlow flywheel objective

```text
Monitor Chat restores Phase 4 mission from CURRENT + REQUIRED_CONTEXT
→ publishes owner-backed boot proof
→ Node Monitor state validates boot proof and atomically activates/takes over the shift
→ proves or repairs REAL_SCENE
→ observes current ProFlow reality
→ identifies the owner / next Engineering Decision
→ implements and verifies
→ converges the real Workspace/runtime
→ returns to the exact live checkpoint
→ records the one checkpoint
→ hands off before chat degradation
→ successor continues from local truth
→ repeat
```

The loop succeeds only when continuity is mechanical, one-owner-at-a-time, and every live PASS is tied to the actual runtime rather than source-only or mixed-environment evidence.

## Core principle

**这是 ProFlow 专属 Skill。Monitor Chat 是「学习」项目中的独立网页 Chat；一个班次一个 owner。每班先恢复 CURRENT / REQUIRED_CONTEXT / Phase 4 使命，再发布正式 boot proof，由 Node Monitor state 原子切换 ACTIVE/currentChat ownership；Browser 只负责观察、时机与物理投递，Platform Host 只负责把 Node 计划转交现有 Execution Runtime。接近 4h 时把真实 checkpoint 写入唯一 current context，新班完成 boot proof 并正式接管后旧班立即停止 mutation。**
