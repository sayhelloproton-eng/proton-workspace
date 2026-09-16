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
- verify branch / HEAD / dirty WIP and the owner facts required by `nextAction`;
- preserve unrelated WIP; never clean/reset/stash it for convenience;
- restore `CURRENT.REQUIRED_CONTEXT` and the Phase 4 runbook before treating handoff as sufficient context;
- when `handoffState=READY_FOR_TAKEOVER`, claim the named `nextShiftId` before new mutation;
- continue from `nextAction`; do not rebuild historical context or restart broad audits.

Takeover is proven only when the successor can truthfully reply:

`PROFLOW_LOOP_TAKEOVER_ACCEPTED <shiftId>`

This token proves shift ownership/context takeover; it does not by itself prove `REAL_SCENE` readiness.

### WORK

The active shift owns the current ProFlow implementation/verification/acceptance stage end-to-end.
Use the shared Engineering and Acceptance protocols normally.
Before returning to a live checkpoint after repairs, enforce the REAL_SCENE gate above.
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
确认接班后先回复：PROFLOW_LOOP_TAKEOVER_ACCEPTED <current.md 中的 nextShiftId>，然后继续处理 ProFlow。
```

Do not paste the whole handoff into the new chat. The successor must read the local truth itself.

## Successor claim / predecessor retirement — HARD RULE

After the successor has read the context and accepted the named shift:

- successor becomes the only ProFlow mutation owner;
- successor records itself as `ACTIVE` in the next checkpoint update;
- predecessor performs no further local/product mutation;
- predecessor may do only minimum read-only observation needed to prove takeover, then stops.

If successor creation or takeover cannot be proven, predecessor remains owner.
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

**这是 ProFlow 专属 Skill。Monitor Chat 是「学习」项目中的独立网页 Chat；一个班次一个 owner。每班先恢复 CURRENT / REQUIRED_CONTEXT / Phase 4 使命，再证明真实 Workspace 与运行字节一致；不一致就只修 REAL_SCENE first divergence。接近 4h 时把真实 checkpoint 写入唯一 current context，新班确认接管后旧班立即停止 mutation。**
