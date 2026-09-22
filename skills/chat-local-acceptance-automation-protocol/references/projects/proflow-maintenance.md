# ProFlow Maintenance Chat Automation

> Scope: ProFlow Monitor v4 Maintenance / Monitor Chat lifecycle, controlled Browser recovery, REAL_SCENE convergence and final Acceptance.
> Shared automation semantics remain owned by `chat-local-acceptance-automation-protocol`; this reference only records ProFlow-specific routing.

## 0. Context owners

```text
ProFlow project context   → repos/proflow CURRENT / REQUIRED_CONTEXT / Formal Spec / project Runbook
Chat Loop continuation    → skills/proflow-chat-loop/SKILL.md + .handoff/current.md
Monitor runtime/lifecycle → Node Monitor Service / monitor-state.json
```

No layer may copy another layer into a competing truth store. Handoff prose never proves current/mutationMode; Browser reality never proves lifecycle ownership.

## 1. Formal runtime chain

```text
Monitor/Maintenance
→ Node Monitor owner
→ Platform Host authenticated relay
→ Execution Runtime
→ execution-browser-extension effect owner
→ real ChatGPT page
```

There is no independent Platform Monitor polling coordinator, no legacy `shift.activate`, and no standalone production `chat.register`. Real Chat registration only comes from confirmed `monitor.chat.create` settlement.

## 2. Model-facing action surface

```text
INITIALIZE       → monitor-initialize.mjs
RESTORE_PATHS    → monitor-context-manifest.mjs
CLAIM_SHIFT      → monitor-claim.mjs --authorities-read
REAL_SCENE       → proflow-real-scene-ready.mjs
BROWSER          → monitor-browser-step.mjs
HANDOFF          → monitor-handoff-finalize.mjs
OWNER_GATE       → pnpm --dir repos/proflow package:gate <one-package>
OWNER_BUILD      → pnpm --dir repos/proflow package:build <one-package>
REAL_ACCEPTANCE  → proflow-monitor-acceptance.mjs
```

The model does not expand these into reconnect/group primitives, Dev Tunnel steps, Extension reload, Platform start loops, boot/takeover, handoff.complete, bootstrap.stage or Chat registration.

## 3. Controlled Browser group

All ProFlow Monitor Browser work occurs inside one canonical Playwright controlled group. The generic owner is `tools/browser/playwright-controlled-group.py`; ProFlow callers do not invoke it directly.

Normal steady state: exactly one current Monitor conversation tab inside that group. During formal handoff overlap: at most predecessor + successor, both in the same group. Support/connect/auth tabs do not count as Monitor conversations.

Durable target identity order:

```text
current/drive-target chatId
→ exact conversationLocator
→ fresh browserTarget when available
→ exact physical tab
```

Tab index, focus order, visual guess, or groupId is not business identity.

`monitor-browser-step.mjs` owns:

```text
EXTENSION_ARTIFACT_GUARD
→ ENSURE_CONTROLLED_GROUP
→ reconcile UNKNOWN with same identity
→ runtime adoption gate
→ SYNC_TARGET
→ EXECUTE_DRIVE
→ RETIRE_CHAT
→ VERIFY_SCENE
→ DONE | BLOCKED | UNKNOWN
```

Existing exact Chat outside the group is adopted as the same tab. Physical restore is allowed only after durable identity proves zero exact matches, and is fixed to `about:blank → group → readback → exact existing conversation URL`. That never creates a new Chat resource or sends a message.

A new Chat resource is only a formally authorized BOOTSTRAP effect.

Browser Extension reload has one deterministic maintenance route only: fixed ID `eehdadpmjffomabiedcjijiakconalab` → fixed `chrome://extensions/?id=eehdadpmjffomabiedcjijiakconalab` detail page inside the canonical controlled group → exactly one accessibility button named `重新加载` → one click → new Extension instance/heartbeat readback. No list search, coordinates, options self-reload, duplicate window, or model-composed selector.

Before any Monitor Browser boundary opens, the workspace artifact guard must prove exact equality of the source static-package fingerprint, formal materialization marker fingerprint, and materialized static-package fingerprint, plus synchronized package/module/manifest version facts. Same moduleVersion alone is not current-artifact proof. A mismatch is a prerequisite BLOCKED state, never a reason to connect/reload/drive the old Extension.

## 4. Mutation ownership

Before local/product mutation, Node owner must prove target current + `mutationMode=FULL`. Registered-but-not-active successor is NONE; predecessor after completed handoff is NONE. Chat prose, shiftId alone, or currentChatId alone is insufficient.

Normal successor claim:

```text
model actually reads all authorities
→ monitor-claim.mjs --shift-id <candidate> --authorities-read
→ bootProof.record
→ reconcile if required
→ takeover.accept
→ current/state readback
→ CLAIMED only when target current + FULL
```

The low-level boot/takeover helpers remain internal/diagnostic.

## 5. Initial Monitor

When Node owner proves no current/live Monitor and no conflicting pending bootstrap:

```text
node automation/proflow-maintenance/monitor-initialize.mjs \
  --shift-id <initialShiftId>
```

The action resolves authority pointers, generates fixed Initial BOOTSTRAP context, stages initial bootstrap, executes Browser Step and reconciles by Node readback. Result: `REGISTERED | STAGED | BLOCKED | UNKNOWN`.

It does not claim the created Chat. The new Monitor must read authorities and call `monitor-claim.mjs --authorities-read`.

Do not manually call `monitor-injection bootstrap --initial` on the normal path.

## 6. TURN_WAKE

```text
BUSY → READY → readyStable → round boundary → rotation not due → TURN_WAKE
```

TURN_WAKE uses fixed neutral base plus at most one model continuation hint. Hint is advisory only. Project facts come from Formal Spec/CURRENT; continuity comes from Chat Loop; runtime truth comes from Node owner. Normal TURN_WAKE is silent.

## 7. Handoff

After HANDOFF physical effect settles, the predecessor supplies continuation semantics once:

```text
node automation/proflow-maintenance/monitor-handoff-finalize.mjs \
  --input-file <continuation.json>
```

The action owns:

```text
atomic current.md
→ handoff.complete
→ predecessor NONE readback
→ fresh bootstrap.stage
→ monitor-browser-step
→ formal monitor.chat.create / registration
→ SUCCESSOR_REGISTERED | SUCCESSOR_STAGED | BLOCKED | UNKNOWN
```

The successor then restores authorities and calls `monitor-claim.mjs --authorities-read`. Predecessor must not manually complete/stage/create/register/claim. Never create a second successor while the first result is unresolved.

## 8. UNKNOWN / recovery

Create/submit timeout or transport loss preserves:

```text
same driveId
same messageRef
same contentFingerprint
same Execution identity
→ APPLIED | NOT_APPLIED | UNKNOWN
```

No new idempotency identity, duplicate Chat, duplicate submit, or notification-triggered replay. UNKNOWN forbids replacement/abandon until owner truth resolves it.

## 9. REAL_SCENE

Normal runtime convergence:

```text
node automation/proflow-maintenance/proflow-real-scene-ready.mjs
```

It consumes official Platform status, Extension adoption, Dev Tunnel ready, formal Platform lifecycle when explicitly named, Monitor state adoption and Browser readiness. It stops at the first non-mechanical/human/version/spec divergence and never builds/publishes or creates a shadow runtime.

## 10. Final gate

ProFlow has no aggregate Stage Prepare / Stage Verify action. Product verification is owned by exactly one package.

After implementation is complete and Stage Freeze:

```bash
pnpm --dir repos/proflow package:gate <one-package>
```

Run build only when the selected owner needs an artifact:

```bash
pnpm --dir repos/proflow package:build <same-package>
```

Multiple affected owners require separate model calls. Repository governance is explicit `repo:*` work and is not package test/build evidence.

After the owning package Gate passes and formal version/materialization/adoption is complete:

```text
proflow-monitor-acceptance.mjs --mode SAME_SCENE
```

`READY_FOR_VISUAL_EYES` requires exactly one final visual proof on the owner-known current Monitor tab. It is not itself PASS.

## 11. Prohibitions

- no direct `monitor-state.json` writes;
- no second Browser controller/runtime owner;
- no group/window primitives from the model;
- no manual BOOTSTRAP/TURN_WAKE/HANDOFF submit;
- no replacement Chat because Browser control is UNKNOWN;
- no Maintenance impersonation of successor `--authorities-read`;
- no test→patch→test loop during implementation;
- no source/build-only evidence promoted to runtime Acceptance.
