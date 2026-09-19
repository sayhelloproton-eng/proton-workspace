---
name: proflow-chat-loop
description: ProFlow-only ChatGPT web Monitor shift loop for continuous engineering handoff, one-active-shift ownership, Phase 4 mission recovery, real-scene gating, and near-4h successor rotation inside the 学习 project.
---

# ProFlow Chat Loop

## Project identity — HARD RULE

**PROFLOW-SPECIFIC ONLY.** This Skill exists only to drive continuous iteration of:

`/Users/agent/Desktop/proton-workspace/repos/proflow`

Do not use it for ChatWeb, Job Search System, ai-agent-platform, or any other project.
It owns ProFlow Chat-to-Chat continuation only; shared Engineering and Acceptance protocols keep their own authority.

**Monitor Chat is a separate ChatGPT web chat inside the `学习` project.**
The chat that creates or supervises a Monitor Chat is not itself the Monitor Chat.
A successor is a newly created ChatGPT web chat, not a ProFlow Task/Worker and not a Codex/CLI session.

Exactly one Monitor shift may own ProFlow mutation at a time.

## Browser drive + visibility contract — HARD RULE

The Browser/Extension is a **scheduler and physical carrier, never the task decision-maker**. Monitor continuation has exactly two automatic drive classes:

```text
TURN_WAKE
→ after the current ACTIVE Monitor produces a new settled assistant turn
→ exact neutral text:
  请依据当前上下文、当前真实状态与既有规则，自主判断并执行当前应采取的动作。

SHIFT_HANDOFF
→ when the current shift enters the rotation/handoff path
→ exact neutral text:
  请依据当前上下文、当前真实状态与既有规则，自主完成当前班次交接。
```

Neither drive may append a Task, Phase, `nextAction`, filename, blocker, repair target, or other concrete work instruction. The current Monitor must decide what to do from its restored context and fresh reality. The drive prompt itself must not tell the Chat to "continue", "wait", choose a particular repair, or manufacture a decision for an external dependency/human judgement.

Every automatic drive is also a user-visibility event through the **existing Workspace Feishu/Lark notification owner/outbox**:

```text
TURN_WAKE     → PROFLOW_SELF_ITERATION / MONITOR / CHAT_WAKE
SHIFT_HANDOFF → PROFLOW_SELF_ITERATION / MONITOR / HANDOFF_STARTED
```

Reuse the same Workspace webhook infrastructure already used by `PRODUCT_ITERATION / PROFLOW_PRODUCT`; do not create a second webhook system for Monitor. Notification transport failure is reconciled as notification reality and must not replay the Browser drive, Chat create, Task, Approval, deployment, or other side effect. If the Monitor itself reaches an external dependency or needs user judgement, it must preserve the real blocker and surface it through the existing visibility path rather than having the Browser prompt invent a resolution.

### Dedicated Monitor window — HARD RULE

Every Monitor Chat owns a **dedicated Chrome window**. Its Monitor tab must remain the active tab of that window; the window itself may stay `focused=false` so normal user foreground work is not stolen.

Before Monitor `observe / submit / verify / screenshot`, the Browser owner must verify the exact Chat tab is active in its dedicated window. If the Chat is found in a shared window or inactive tab, move the **same tab** into a dedicated window / reactivate it, invalidate stale content-session identity, and re-observe before any write. Never duplicate the conversation merely to repair window state.

During handoff, predecessor and successor may coexist in separate dedicated windows and each Monitor tab may be active in its own window. This physical requirement does not change the one-writer rule: only the current ACTIVE shift may mutate ProFlow.

## Boot authority and Phase 4 mission — HARD RULE

Every Monitor shift MUST restore the ProFlow mission from current local truth; it must not boot from handoff alone.
Before local work, read in this order:

1. `/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/SKILL.md`
2. `/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/SKILL.md`
3. `/Users/agent/Desktop/proton-workspace/repos/proflow/spec/平台架构与公共约定/00-公共上下文/README.md`
4. Follow that README's fixed core order, including `01-长期规则/01-总控职责与阶段门禁.md`, `01-长期规则/02-公共上下文治理规则.md`, and `01-长期规则/05-执行纪律与工具规则.md`.
5. `/Users/agent/Desktop/proton-workspace/repos/proflow/spec/平台架构与公共约定/00-公共上下文/02-当前接力/CURRENT.md`
6. Read every path listed by the current `CURRENT.REQUIRED_CONTEXT`.
7. While `CURRENT_PHASE = PHASE4`, `docs/phase4/04-自动迭代运行计划.md` is mandatory even if a later handoff forgets to mention it.
8. `/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/.handoff/current.md`
9. `/Users/agent/Desktop/proton-workspace/skills/chat-local-acceptance-automation-protocol/SKILL.md` before real Browser/UI automation.

### Boot proof publication — HARD RULE

完成上面的固定 authority、CURRENT.REQUIRED_CONTEXT、Phase 4 runbook 与 handoff 读取后，Monitor Chat **必须先发布正式 boot proof，才能宣告 takeover 或开始 ProFlow mutation**。唯一稳定 helper 是：

```text
node /Users/agent/Desktop/proton-workspace/automation/proflow-browser-extension/monitor-boot-proof.mjs \
  --workspace /Users/agent/Desktop/proton-workspace \
  --shift-id <current.md 命名的当前/下一 shiftId> \
  --authorities-read
```

`--authorities-read` 是当前 Monitor Chat 对“上述 authority 已真实读取”的显式确认；不得由维护 Chat、Browser carrier 或旧班在无法证明新班完成读取时替代确认。helper 从正式 Monitor owner 唯一解析 run/chat identity，机械验证 CURRENT 动态 REQUIRED_CONTEXT 与固定 authority 路径，并且**只提交 `shift.bootProof`**。它不得直接调用 `shift.activate`、不得手改 run/config JSON、不得用测试 helper 伪造 ACTIVE。Platform Monitor coordinator 观察到 bootProof 后才拥有 `BOOTING → ACTIVE/takeover`，并继续拥有后续 `TURN_WAKE` / `SHIFT_HANDOFF` 驱动。

若 helper 返回 `RECORDED`、`ALREADY_RECORDED` 或 `ALREADY_ACTIVE`，Monitor 才可继续 takeover 流程；其他结果一律 fail closed。`PROFLOW_LOOP_TAKEOVER_ACCEPTED <shiftId>` 必须发生在 boot-proof publication 成功之后。首次历史 shift 若创建于此规则引入之前，也必须先用同一 helper 完成一次正式 bootstrap；不能直接改 ACTIVE 来迁移。

A new shift must be able to state from current truth:

```text
current Phase / execution mode
Phase 4 Foundation state
current REQUIRED_CONTEXT
current first divergence / next owner
Self-Iteration mission from docs/phase4/04
latest rolling handoff facts
```

If these cannot be resolved, do not reconstruct them from old chat prose. Restore the missing authority first.

Authority order:

```text
current machine/runtime/product truth
> ProFlow Formal Spec / current public context / CURRENT
> shared Engineering / Acceptance Skill
> this ProFlow-specific loop Skill
> .handoff/current.md
> old chat prose/history
```

The handoff is a continuation checkpoint, not permission to trust stale runtime facts.
Revalidate only the owner facts required by the next decision.

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

## Single current context — HARD RULE

The only ProFlow loop checkpoint is:

`/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/.handoff/current.md`

Do not create parallel handoff-final.md, handoff-v2.md, copied chat summaries, or another loop truth store.
At handoff, replace `current.md` with one complete current snapshot.
`.handoff/` is local operational state and MUST remain Git-ignored.

`nextAction` is always the successor's first ProFlow action after takeover. Do not put predecessor-only rotation mechanics such as "create monitor-a" into a checkpoint that monitor-a itself will consume. Rotation mechanics belong to `handoffState / nextShiftId` and this Skill's CREATE SUCCESSOR CHAT section.

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
- verify branch / HEAD / dirty WIP and the owner facts required by `nextAction`;
- preserve unrelated WIP; never clean/reset/stash it for convenience;
- restore `CURRENT.REQUIRED_CONTEXT` and the Phase 4 runbook before treating handoff as sufficient context;
- when `handoffState=READY_FOR_TAKEOVER`, claim the named `nextShiftId` before new mutation;
- continue from `nextAction`; do not rebuild historical context or restart broad audits.

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

- enter the `SHIFT_HANDOFF` drive path and emit the corresponding `HANDOFF_STARTED` visibility event through the existing Workspace notification owner/outbox;
- finish the current safe atomic action or stop at a mechanically named first divergence;
- reconcile timed-out/non-idempotent effects as `APPLIED | NOT_APPLIED | UNKNOWN`;
- close Acceptance runs it owns and release Browser leases unless the current Acceptance protocol explicitly supports handoff;
- record long-running PID/session/log authority without polling it;
- record `realSceneState: READY | REAL_SCENE_NOT_READY | UNKNOWN` plus the evidence/first divergence that supports it;
- refresh `.handoff/current.md` with exact repo/WIP/runtime/checkpoint/next-action state;
- make `nextAction` the successor's first ProFlow action, never the predecessor's "create successor" action;
- set `handoffState: READY_FOR_TAKEOVER` and allocate exactly one `nextShiftId`.

The handoff must distinguish verified facts from last-known facts and name one next action.
Never put credentials, tokens, Authorization values, or copied private browser content in the handoff.

## CREATE SUCCESSOR CHAT

Successor creation is real Browser automation and MUST follow the shared Acceptance Skill.
Reuse the canonical Browser/CDP owner; do not restart Chrome or create a second Browser controller merely to rotate chats.
Create the successor in its **own dedicated Chrome window** (or move the exact newly created Chat tab into one) and verify that successor tab is active in that window before submit/boot observation. Keep the predecessor in its own dedicated window during overlap; do not move either Monitor into the user's ordinary browsing window.

The predecessor opens ChatGPT project **`学习`**, creates exactly one new chat, and sends:

```text
你是 ProFlow Chat Loop 的下一班 Monitor Chat。这个 Skill 只用于 ProFlow。
先读取：
/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/SKILL.md
/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/SKILL.md
/Users/agent/Desktop/proton-workspace/repos/proflow/spec/平台架构与公共约定/00-公共上下文/README.md
/Users/agent/Desktop/proton-workspace/repos/proflow/spec/平台架构与公共约定/00-公共上下文/02-当前接力/CURRENT.md
/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/.handoff/current.md

按公共上下文 README 的固定核心和 CURRENT.REQUIRED_CONTEXT 恢复 Phase 4 使命，再按 current.md 的 nextAction 接手。先复核必要 owner facts和 REAL_SCENE，不重建历史、不清理未知 WIP。
完成上述 authority 读取后，按 proflow-chat-loop Skill 使用 monitor-boot-proof.mjs 为 current.md 命名的 shift 提交正式 boot proof；成功后先回复：PROFLOW_LOOP_TAKEOVER_ACCEPTED <current.md 中的 nextShiftId>，然后继续处理 ProFlow。
```

Do not paste the whole handoff into the new chat. The successor must read the local truth itself.

## Successor claim / predecessor retirement — HARD RULE

After the successor has read the context, published boot proof, and accepted the named shift:

- successor becomes the only ProFlow mutation owner after formal coordinator takeover makes that shift ACTIVE;
- successor records itself as `ACTIVE` in the next checkpoint update;
- predecessor performs no further local/product mutation;
- predecessor may do only minimum read-only observation needed to prove takeover, then stops.

If successor boot-proof publication, activation, creation, or takeover cannot be proven, predecessor remains owner.
Never create a second successor while the first takeover result is UNKNOWN.

## Handoff content contract

`current.md` must remain compact but include, when applicable:

```text
handoffState / activeShiftId / nextShiftId / shiftStartedAt
objective / currentStage / nextAction
repo / branch / HEAD / dirtyWip ownership
completedThisShift
firstDivergence / blockers
realSceneState + realSceneEvidence
lastKnownRuntimeFacts + freshness warning
openProcesses or UNKNOWN side effects
Acceptance run + Browser lease state
mustPreserve / mustNotDo
```

## ProFlow flywheel objective

```text
Monitor Chat restores Phase 4 mission from CURRENT + REQUIRED_CONTEXT
→ publishes owner-backed boot proof
→ coordinator activates/takes over the shift
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

**这是 ProFlow 专属 Skill。Monitor Chat 是「学习」项目中的独立网页 Chat；一个班次一个 owner。每班先恢复 CURRENT / REQUIRED_CONTEXT / Phase 4 使命，再发布正式 boot proof，由 coordinator 切到 ACTIVE；随后证明真实 Workspace 与运行字节一致，不一致就只修 REAL_SCENE first divergence。接近 4h 时把真实 checkpoint 写入唯一 current context，新班完成 boot proof 并正式接管后旧班立即停止 mutation。**
