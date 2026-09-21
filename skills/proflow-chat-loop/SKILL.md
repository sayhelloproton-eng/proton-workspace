---
name: proflow-chat-loop
description: ProFlow-only ChatGPT web Monitor shift loop for continuity, one-owner mutation, deterministic Browser/runtime actions, handoff and final Acceptance.
---

# ProFlow Chat Loop

## Project identity — HARD RULE

This Skill applies only to ProFlow Monitor Chat in ChatGPT project **学习** under `/Users/agent/Desktop/proton-workspace`. It does not replace ProFlow Formal Spec/CURRENT, Node Monitor runtime truth, the shared Engineering Skill, or the shared Acceptance Skill.

## Context ownership — HARD RULE

```text
ProFlow project context
→ repos/proflow/spec/平台架构与公共约定/00-公共上下文/README.md
→ CURRENT.md
→ CURRENT.REQUIRED_CONTEXT
→ required Phase 4 project Runbooks

Chat Loop continuation
→ skills/proflow-chat-loop/SKILL.md
→ skills/proflow-chat-loop/.handoff/current.md

Monitor runtime/lifecycle
→ Node Monitor Service
→ skills/proflow-chat-loop/.runtime/monitor-state.json

Local engineering / Browser automation policy
→ chat-local-engineering-protocol
→ chat-local-acceptance-automation-protocol
```

`.handoff/current.md` owns only continuation semantics. It must not copy ProFlow CURRENT or Node runtime into a second snapshot.

`skills/proflow-chat-loop/.runtime/monitor-state.json` is the only durable Temporary Chat Loop runtime JSON. Node Monitor Service is its sole writer.

`handoffState` and `nextShiftId` are handoff intent consumed by `monitor-handoff-finalize.mjs`; they never prove completed handoff, current ownership, takeover, or mutation permission.

## Monitor drive contract — HARD RULE

Formal drives are only:

```text
BOOTSTRAP
TURN_WAKE
HANDOFF
```

Browser/Extension is scheduler + physical carrier, never task decision-maker. Node Monitor state owns lifecycle truth. Platform Host is authenticated relay only. Execution Runtime + Browser effect owner owns create/submit APPLIED/NOT_APPLIED/UNKNOWN truth.

Normal TURN_WAKE uses fixed neutral text and at most one model continuation hint. Hint is advisory; it never overrides Formal Spec/CURRENT, Chat Loop authority, or Node runtime.

Notification failure never replays a business Browser effect.

## Canonical controlled Browser group — HARD RULE

All Monitor Browser work occurs inside one canonical Playwright controlled group. User tabs outside the group are untouched.

Normal steady state: one current Monitor conversation tab in the group. Formal handoff overlap: at most predecessor + successor in the same group. No third Monitor conversation.

Durable identity:

```text
current/drive-target chatId
→ exact conversationLocator
→ fresh browserTarget when available
→ exact physical tab
```

Tab index, visual position, recent focus, or groupId is not business identity.

Before any Monitor observe/screenshot/submit/verify/recovery, **artifact identity comes first**. The project action must prove:

```text
source static package fingerprint
= .proflow-materialization.json.packageFingerprint
= materialized static package fingerprint

and
package.json.version
= proflow.module.json.moduleVersion
= deployment descriptor.moduleVersion
= manifest.version
= materialized marker/module manifest version
```

Same moduleVersion is not sufficient. Any mismatch is `BLOCKED` before Browser boundary/connect/reload/drive. This rule exists because a same-version stale 0.1.67 runtime still contained dedicated-window creation and caused real window explosion.

Then call only:

```text
node /Users/agent/Desktop/proton-workspace/automation/proflow-maintenance/monitor-browser-step.mjs
```

It owns:

```text
EXTENSION_ARTIFACT_GUARD
→ ENSURE_CONTROLLED_GROUP
→ reconcile same UNKNOWN effect
→ runtime adoption gate
→ SYNC_TARGET
→ EXECUTE_DRIVE
→ RETIRE_CHAT
→ VERIFY_SCENE
→ DONE | BLOCKED | UNKNOWN
```

The model does not directly choose connect/recover/group/adopt/create/reload/window repair/cleanup. Generic tab/group primitives belong only to `tools/browser/playwright-controlled-group.py`.

Browser Extension reload is also fully mechanical: fixed Extension ID `eehdadpmjffomabiedcjijiakconalab` → fixed detail URL `chrome://extensions/?id=eehdadpmjffomabiedcjijiakconalab` inside the controlled group → exactly one accessible button `重新加载` → click once → instanceId/PAIRING_HEARTBEAT readback. The model must never search the Extensions list, choose a card, calculate coordinates, or call an options-page self reload.

Existing exact Chat may be adopted into the group. Physical restore is allowed only after durable identity proves zero exact matches and must use `about:blank → group → readback → exact existing conversation URL`. This restores a carrier; it does not create a new conversation or send text.

New conversation creation is legal only for formal BOOTSTRAP.

## Model-facing action surface — HARD RULE

Normal Monitor work uses these stable actions:

```text
0. INITIALIZE
   # only when Node proves no current/live Monitor
   node automation/proflow-maintenance/monitor-initialize.mjs \
     --shift-id <initialShiftId>

1. RESTORE_PATHS
   node automation/proflow-maintenance/monitor-context-manifest.mjs

2. CLAIM_SHIFT
   # only after this Chat actually read every required authority
   node automation/proflow-maintenance/monitor-claim.mjs \
     --shift-id <candidate> --authorities-read

3. REAL_SCENE_READY
   node automation/proflow-maintenance/proflow-real-scene-ready.mjs

4. MONITOR_BROWSER_STEP
   node automation/proflow-maintenance/monitor-browser-step.mjs

5. ENGINEERING
   use chat-local-engineering-protocol

6. FINALIZE_HANDOFF
   node automation/proflow-maintenance/monitor-handoff-finalize.mjs \
     --input-file <continuation.json>

7. FINAL_GATES
   node automation/proflow-maintenance/proflow-stage-prepare.mjs \
     --stage monitor-controlled-group
   → mechanical generated diff review
   → STAGE FREEZE
   node automation/proflow-maintenance/proflow-stage-verify.mjs \
     --stage monitor-controlled-group
   → official version/materialization/adoption
   node automation/proflow-maintenance/proflow-monitor-acceptance.mjs \
     --mode SAME_SCENE
   → exactly one final visual EYES proof
```

The normal model MUST NOT expand these into `playwright-recover`, group primitives, Dev Tunnel auth/ensure/host, Extension reload, Platform start/status loops, low-level boot/takeover, `handoff.complete`, `bootstrap.stage`, or Chat registration.

## Standing release authorization — HARD RULE

The user has given standing authorization for normal ProFlow package release/publish as part of continuing the engineering mainline. Do not stop to ask for per-release confirmation when the target package/version/release intent is already mechanically determined by the formal release plan and prior gates. A normal `continue / 继续处理` may proceed through version, publish, Registry readback, single-package update, materialization and adoption.

This standing authorization does **not** authorize ambiguous release targets, paid services, account/credential changes, destructive rollback, or unrelated irreversible effects. Publish timeout/UNKNOWN still requires exact Registry readback before any retry.

## What the model still owns

- actually reading and understanding every authority path returned by `monitor-context-manifest.mjs`;
- project/engineering/product semantic judgment;
- blocker, notification and continuation semantic text;
- deciding Acceptance level only at the final gate;
- the final visual EYES judgment after `READY_FOR_VISUAL_EYES`.

`--authorities-read` is non-delegable attestation.

## Diagnostic / semantic exception actions

Only when a high-level action returns a named need:

```text
monitor-current.mjs / monitor-state.mjs / monitor-config.mjs
→ read-only owner diagnosis

monitor-event.mjs blocked|clear
→ semantic blocker

monitor-injection.mjs turn-wake
→ optional advisory continuation

monitor-notify.mjs
→ semantic visibility request

monitor-successor-abandon.mjs
→ only a mechanically proven failed non-current candidate

monitor-state-adoption.mjs
→ runtime adoption diagnosis
```

Low-level initial bootstrap, boot-proof, takeover and handoff-complete helpers remain automation-internal/diagnostic owners.

UNKNOWN preserves the same effect identity and stops. Retry is allowed only after owner readback proves NOT_APPLIED.

## Boot authority / takeover — HARD RULE

A new shift first calls `monitor-context-manifest.mjs`, then actually reads:

1. shared Engineering Skill;
2. shared Acceptance Skill;
3. ProFlow public-context README and fixed long-term rules;
4. CURRENT and every repo-local CURRENT.REQUIRED_CONTEXT path;
5. required Phase 4 runbooks;
6. this Skill and the single handoff checkpoint;
7. only the runtime facts needed now from Node owner.

Then the only normal claim action is:

```text
node automation/proflow-maintenance/monitor-claim.mjs \
  --workspace /Users/agent/Desktop/proton-workspace \
  --shift-id <candidateShiftId> \
  --authorities-read
```

The helper owns bootProof.record → reconciliation → takeover.accept → current/state readback. Mutation is legal only when the target is current and `mutationMode=FULL`.

Do not manually chain boot-proof + takeover.

## Initial Monitor — HARD RULE

Only when Node owner proves no current/live Monitor and no conflicting pending bootstrap:

```text
node automation/proflow-maintenance/monitor-initialize.mjs \
  --shift-id <initialShiftId>
```

This generates fixed Initial BOOTSTRAP context, stages it, runs Browser Step and reconciles by Node readback. It does not claim the new Chat. The created Monitor must perform its own authority reads and `monitor-claim`.

## REAL_SCENE — HARD RULE

Normal runtime convergence:

```text
node automation/proflow-maintenance/proflow-real-scene-ready.mjs
```

It first enforces Extension artifact identity before any Browser/Platform recovery, then composes official Platform status, Browser Extension adoption, Dev Tunnel readiness, formal Platform start only when Platform names it, Monitor state adoption, Browser readiness and final Platform readback.

It does not build/version/publish, perform human setup, invent a second runtime, or bypass an owner. Human/setup/spec/version/materialization divergence returns BLOCKED; uncertain effects return UNKNOWN.

For a changed implementation:

```text
implementation complete
→ stage-prepare
→ mechanical generated diff review
→ Stage Freeze
→ stage-verify
→ official version/materialization/adoption
→ REAL_SCENE_READY
→ final Acceptance
```

## Shift lifecycle

```text
RESTORE_PATHS
→ READ AUTHORITIES
→ CLAIM_SHIFT
→ REAL_SCENE_READY
→ WORK
→ CHECKPOINT
→ FINALIZE_HANDOFF
→ successor READ AUTHORITIES
→ successor CLAIM_SHIFT
→ predecessor stops
```

### WORK

The current FULL owner runs the Engineering stage end-to-end. Do not start a new Monitor because a command is slow or a tool is UNKNOWN. User/external semantic blockers use the blocker/notification surfaces.

### Rotation

Node state owns rotation timing. As handoff approaches, stop starting large stages. Reconcile non-idempotent UNKNOWN before rotation.

## Handoff — HARD RULE

After the HANDOFF physical effect settles, model provides continuation semantics once:

```json
{
  "nextShiftId": "monitor-...",
  "chatLoopNextAction": "...",
  "completedThisChat": ["..."],
  "chatLoopFirstDivergence": "... or null",
  "blockers": ["..."],
  "mustPreserve": ["..."],
  "mustNotDo": ["..."]
}
```

Then:

```text
node automation/proflow-maintenance/monitor-handoff-finalize.mjs \
  --input-file <continuation.json>
```

It owns canonical current.md → handoff.complete → predecessor NONE readback → fresh bootstrap.stage → monitor-browser-step → formal create/registration.

It does not claim successor. Only successor, after its own authority reads, can call `monitor-claim --authorities-read`.

Never create a second successor while create/registration/claim is unresolved.

## Single continuation checkpoint — HARD RULE

The only Chat Loop continuation file is:

`/Users/agent/Desktop/proton-workspace/skills/proflow-chat-loop/.handoff/current.md`

It stores continuation semantics and authority references only:

```text
chatLoopContextVersion / updatedAt
handoffState / nextShiftId
chatLoopOwner / chatLoopStage / chatLoopNextAction
completedThisChat
chatLoopFirstDivergence / blockers
authority references
mustPreserve / mustNotDo
```

Do not store runtime snapshots, currentChatId/mutationMode, pendingBootstrap, Browser page state, Platform/Dev Tunnel runtime, or ProFlow NEXT_ACTION.

## Final verification / Acceptance — HARD RULE

Before Stage Freeze:

```text
node automation/proflow-maintenance/proflow-stage-prepare.mjs \
  --stage monitor-controlled-group
```

It refreshes generated test governance only. Review generated diff mechanically, then freeze.

After Stage Freeze:

```text
node automation/proflow-maintenance/proflow-stage-verify.mjs \
  --stage monitor-controlled-group
```

It runs governance check, targeted tests, Extension typecheck/build, workspace self-tests and diff checks. Failure opens one Repair Stage; no test→patch→test loop.

After Stage Verify PASS and formal version/materialization/adoption:

```text
node automation/proflow-maintenance/proflow-monitor-acceptance.mjs \
  --mode SAME_SCENE
```

`READY_FOR_VISUAL_EYES` is not PASS. Perform exactly one final visual EYES proof on the owner-known current Monitor tab.

## Flywheel objective

```text
context-manifest → model reads authorities
→ monitor-claim → FULL owner
→ real-scene-ready
→ observe CURRENT reality
→ Engineering decision / implementation
→ stage-prepare
→ Stage Freeze
→ stage-verify
→ official artifact adoption
→ monitor-acceptance → one visual EYES
→ checkpoint / handoff-finalize
→ successor repeats from current local truth
```

## Core principle

**模型只做 authority 阅读、工程/产品语义判断和 continuation 语义；路径发现、claim、Browser、Tunnel、Extension adoption、REAL_SCENE、handoff mechanics、generated gate preparation、最终测试编排全部由稳定 action 完成。一个班次一个 Node owner；只有 monitor-claim 的 FULL readback 才授予 mutation。**
