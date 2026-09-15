---
name: chat-local-acceptance-automation-protocol
description: Single source of truth for ChatGPT Chat local acceptance automation: eyes first, user-path reality, first divergence, safe shared-browser control, checkpoint recovery, and stage-final proof.
---

# Chat Local Acceptance Automation Protocol

This Skill applies only to **ChatGPT Chat** executing local acceptance automation. Product code mutation is owned by `chat-local-engineering-protocol`.

## Scope and authority — HARD RULE

**SINGLE-AUTOMATION-SOURCE-OF-TRUTH.** This Skill + owned references/scripts are the only ChatGPT Chat acceptance-automation protocol. Project Formal Spec/current product state/runtime reality remain product truth, but projects must not maintain competing Browser/CLI/MCP/recovery/testing/logging SOPs.

Stable deterministic mechanics may live in Skill scripts or workspace `automation/`, but their policy/acceptance semantics must have one owner. Legacy project runbooks are migration evidence only.

## Execution priority — HARD RULE

```text
EYES / CURRENT USER REALITY
→ IDENTIFY TARGET + OWNER
→ FIRST DIVERGENCE
→ MINIMUM NEEDED ACT / WAIT / LISTEN
→ IMMEDIATE EYES READBACK
→ CHECKPOINT / RECONCILE
→ STAGE-FINAL VERIFY
```

**EYES-FIRST is the first operational rule.** Do not repair tools, restart Browser infrastructure, inspect source, or chase logs before using an available read-only current surface that can answer the question.

Acceptance is a **proof gate, not the main debugger**. Read-only `SEE` may establish a pre-implementation failing proof. Once a product defect/owning boundary is proven, preserve the scene/checkpoint, switch to Engineering, let the implementation stage finish and verify, then return to the same user scene for real proof.

Do not run a Full Fresh / broad mutating Acceptance journey while implementation is still moving merely to guide coding.

## Capability model

Public capabilities are `SEE`, `IDENTIFY`, `ACT`, `WAIT`, `LISTEN`, `CONNECT`, `AUTHENTICATE`, `RECOVER`, `VERIFY`.

```text
SEE(read-only by default)
→ IDENTIFY
→ ACT only when required
→ SEE
→ reconcile uncertain side effects
→ CHECKPOINT
→ VERIFY only the contract-required proof
```

Detailed capability semantics: [references/common-capabilities.md](references/common-capabilities.md).

## Core invariants — HARD RULES

- **EYES-FIRST.** Use authoritative current reality first: DOM/snapshot for semantic Web facts, screenshot for visual/pixel/geometry/error-surface facts, screenshot + AX for privileged/native UI.
- **SEE-BEFORE-CONTROL-RECOVERY.** Observation-only work stays read-only when an independent eyes path exists; do not reconnect/restart merely to observe.
- **REUSE-EXISTING-BROWSER-CONNECTION.** Existing canonical Browser ownership wins. A new `connect.html`/connection prompt is a duplicate handshake unless owner authority proves the existing connection unusable.
- **SHARED-BROWSER-USAGE-GUARD.** Acquire `shared` lease before real Playwright control; globally disruptive Browser/runtime actions require `exclusive`; conflict fails closed at `SHARED_BROWSER_IN_USE`.
- **IDENTIFY-BEFORE-MUTATE.** Freshly prove exact target identity; position/tab index/stale coordinates/global order are not identity.
- **KNOWN-PATH-FIRST.** Reuse the proven helper/path; surprising output reopens observation/diagnosis, not invention of a second transport.
- **FIRST-DIVERGENCE-BEFORE-FALLBACK.** Stop at the earliest mechanically proven mismatch and route to its owner.
- **USER-PATH-INTEGRITY.** Internal API/DB/source shortcuts may diagnose but cannot manufacture Acceptance PASS.
- **ACCEPTANCE-LEVEL-AWARE.** `SAME_SCENE` for exact failed scene, `FAST_REPLAY` for affected behavior, `FULL_FRESH` only for explicit from-zero/stage-final proof.
- **CHECKPOINT-AFTER-PROOF.** Preserve meaningful proven progress in current product-state authority before advancing.
- **FAILURE-CLASSIFY-BEFORE-REPAIR.** Distinguish human/prerequisite/harness/tool/product/spec/context/unknown before mutation.
- **SIDE-EFFECT-RECONCILIATION.** Lost/timed-out mutation result is `APPLIED | NOT_APPLIED | UNKNOWN` only after durable authority readback; retry requires proven `NOT_APPLIED`.
- **MINIMUM-SUFFICIENT-PROOF.** Gather only evidence required for the next decision/contract.
- **CONTINUE-EXISTING-BEFORE-RESTART.** Preserve current PID/session/PTTY/tab/auth/checkpoint before recreating anything.
- **RUN-BOUNDARY-FIRST.** Open exactly one `AUTOMATION_START` before the first acceptance mutation/long wait/connect/recover/log-dependent proof and bind fresh evidence.
- **RETURN-CONTROL-CLOSES-RUN.** Before final/handoff/blocked return, append truthful terminal `AUTOMATION_RUN` and prove the run closed.
- **HARNESS-VALID-BEFORE-SCORING.** Broken/truncated/contaminated harness evidence is `HARNESS_INVALID`, not product/model truth.
- **EVIDENCE-GOVERNED-EVOLUTION.** Mainline first; promote only repeated/causally clear evidence or demonstrated invariants.
- **DETERMINISTIC-MECHANICS-BELOW-MODEL.** Stable repeated mechanics belong in scripts/automation under the promotion contract; do not create naming-only wrappers.
- **REALITY-IS-ACCEPTANCE-NOT-THE-MAIN-DEBUGGER.** Use reality to establish scene/first divergence/final proof; Engineering owns source diagnosis and repair.

## Stage boundary — HARD RULE

Read-only eyes/failing-proof work may happen before implementation. Real mutating acceptance and stage-final proof must not be interleaved with active source edits.

When Acceptance proves `PRODUCT_DEFECT`:

```text
preserve checkpoint + current scene
→ close/hand off the acceptance run truthfully
→ Engineering Repair Stage
→ Engineering Stage Verify
→ reopen/continue Acceptance from SAME_SCENE or FAST_REPLAY
```

Do not keep clicking through a broken product while code changes underneath the scene. `FULL_FRESH` belongs at explicit stage/release gates, not in the repair loop.

## Long asynchronous work — HARD RULE

`WAIT` is allowed when the next acceptance decision truly depends on completion. Otherwise:

```text
start once
→ bind PID/session/log/event authority
→ continue independent acceptance work
→ check at dependency point only
```

No model-driven “still running?” polling. If control returns to the user while work remains asynchronous, close the current automation run truthfully; a later continuation opens a new run and reuses the product checkpoint/owner authority.

## Run evidence — HARD RULE

Every real acceptance run uses:

```text
AUTOMATION_START(runId, fresh evidence boundary)
→ real acceptance work
→ AUTOMATION_RUN(same runId, terminal or hand-off outcome)
```

Default writer: `python3 scripts/append-run-log.py --input -`. Before returning control, run `python3 scripts/check-open-runs.py --run-id <runId> --fail-on-open`. Logging failure is `AUTOMATION_LOGGING=FAIL`; never replay product mutation just to repair telemetry.

Detailed schema/privacy/artifacts: [references/run-logging.md](references/run-logging.md).

## Engineering boundary

Project code/product-helper mutation is never owned here. On a proven product defect, preserve the Acceptance checkpoint and switch to `chat-local-engineering-protocol`. After Engineering Stage Verify passes, return to the same scene and prove the user-visible result.

Stable project-specific automation mechanics that cannot generalize belong in the canonical workspace automation owner or a narrow Skill-owned conditional reference; never create a second project-local acceptance protocol.

## Conditional loading

- Web/native UI/EYES/geometry/foreground → [references/browser-and-system-ui.md](references/browser-and-system-ui.md)
- CLI/PTTY/long process/WAIT/LISTEN/UNKNOWN → [references/cli-pty-and-process.md](references/cli-pty-and-process.md)
- MCP/runtime/Browser connection/auth/recovery → [references/tool-runtime-and-auth.md](references/tool-runtime-and-auth.md)
- Validation/harness scoring → [references/validation-baseline.md](references/validation-baseline.md)
- Telemetry/artifacts/batch learning → [references/run-logging.md](references/run-logging.md)
- Skill organization/simplification/evolution → [references/skill-evolution.md](references/skill-evolution.md)
- Project bootstrap/product-fact boundary → [references/project-instructions.md](references/project-instructions.md)
- Lost-context regressions → [references/lost-context-regression.md](references/lost-context-regression.md)

Do not load all references by default.

## Core principle

**先看用户真实世界，再识别对象和第一 divergence；能只看就不动，能复用就不重建；实现阶段结束后再做真实 Acceptance，最终 PASS 必须来自真实用户路径。**
