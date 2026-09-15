---
name: chat-local-acceptance-automation-protocol
description: Single source of truth for ChatGPT Chat local acceptance automation across projects, covering browser, CLI, runtime, recovery, verification, telemetry, and evidence-driven evolution.
---

# Chat Local Acceptance Automation Protocol

This Skill applies only to **ChatGPT Chat** executing local acceptance and automation work. It does not govern Codex app/CLI/app-server/runtime, Claude Code, OpenCode, or other autonomous coding agents.

## Scope and authority — HARD RULE

**SINGLE-AUTOMATION-SOURCE-OF-TRUTH.** This Skill, including its owned references and scripts, is the sole normative source for ChatGPT Chat acceptance automation across projects. Project Formal Spec/current state/runtime reality still define product truth — what should happen and what is happening — but project repositories must not maintain a competing Browser/CLI/MCP/recovery/testing/logging/automation protocol. Legacy project automation runbooks are migration evidence, not a second active authority. Stable project-specific automation that cannot be generalized belongs in a conditional reference owned by this Skill.

Repository product code mutation remains governed by the separate `chat-local-engineering-protocol`; that delegation is an engineering control-plane boundary, not a second acceptance-automation truth source.

## Goal

Reduce model cognition during real automation. Select a known capability/path, execute it, consume the minimum sufficient evidence, and think deeply only when reality contains a genuinely new divergence.

Default loop:

```text
RUN BOUNDARY → NEED → CAPABILITY → KNOWN PATH/SCRIPT → EXECUTE MINIMUM NEEDED CAPABILITY → CURRENT REALITY
→ FIRST DIVERGENCE / MINIMUM SUFFICIENT PROOF
→ SIDE-EFFECT RECONCILIATION when uncertain
→ CHECKPOINT → CONTINUE / RECOVER / STOP → TERMINAL RUN RECORD
```

Do not begin from tool names. Begin from the capability needed now.

## Common capability model

The public capabilities are: `SEE`, `IDENTIFY`, `ACT`, `WAIT`, `LISTEN`, `CONNECT`, `AUTHENTICATE`, `RECOVER`, `VERIFY`.
Read [references/common-capabilities.md](references/common-capabilities.md) for their project-independent contracts and tool mapping.

## Execution rules — HARD RULES

**EYES-FIRST.** If an action has a decision-relevant visible result, confirm current UI reality immediately. `EYES` means the authoritative current surface, not "take a screenshot after every action": on attachable ordinary Web prefer semantic DOM/snapshot state when it answers the question; use page screenshot when pixels, layout, visual status, geometry, or an error surface matter. On privileged/native UI, fresh screenshot + AX is the primary eyes path.

**SEE-BEFORE-CONTROL-RECOVERY.** When the acceptance question is observation-only and a fresh screenshot, semantic DOM/snapshot, or fresh user-provided image can answer it, remain in `SEE/VERIFY`. Do not escalate to `CONNECT/RECOVER`, repair Browser ownership/session isolation, restart relay/controller, select/create tabs, or mutate foreground merely to obtain observation. A broken or contended control path is not a blocker for an observation that has an independent read-only eyes path. Escalate Browser control only when the contract genuinely requires `ACT`, permission/system interaction, exact pointer/hover semantics, or the required evidence cannot be obtained through the read-only path. This rule outranks “fix the harness first” convenience.

**REUSE-EXISTING-BROWSER-CONNECTION.** If the canonical Playwright owner/Extension connection is already present or READY, or fresh visible evidence proves an existing `Playwright MCP` connection, a later Browser-tool attempt that opens another `chrome-extension://.../connect.html` or connection prompt is a duplicate handshake unless current owner authority proves the existing connection is unusable. Once such an existing connection is known, do not invoke a Playwright Browser tool merely to probe whether Browser control/readiness is usable: even an apparently read-only call can initialize another downstream client/Extension handshake and open a fresh `connect.html` before returning evidence. Use non-Playwright owner/liveness evidence, an independent read-only eyes path, or a fresh user-provided screenshot for observation; if the contract genuinely requires Browser control and it cannot be proven without invoking Playwright, preserve `UNKNOWN / HARNESS_BLOCKED` rather than probing speculatively. Do not approve the new connection, copy/configure its connection credential, restart the relay/controller, or create a second Browser owner merely to satisfy `SEE/VERIFY`. Preserve the existing connection and product tabs; use the existing read-only eyes path or fresh user-provided screenshot when sufficient, otherwise classify the observation path unavailable. Enter `CONNECT/RECOVER` only when the acceptance contract genuinely requires Browser control and current authority proves the existing connection cannot serve it. This rule outranks tool-driven reconnect convenience.

**SHARED-BROWSER-USAGE-GUARD.** The real Chrome profile, Playwright Extension, broker, and canonical Playwright owner are shared infrastructure. After `AUTOMATION_START` and before the first Playwright Browser operation or mutation of Browser connection state, acquire a `shared` lease with `scripts/browser-usage-guard.py`. Multiple normal Browser consumers may hold `shared` leases and must still obey atomic-scene rules. Before any globally disruptive action—Extension reload/disable-enable, Chrome quit/restart/profile restart, `gptweb-mcp`/tunnel/broker/Playwright-owner stop or restart, or credential rotation that requires restart—the same run MUST first acquire or upgrade to an `exclusive` lease. If any other active Browser lease exists, fail closed at `SHARED_BROWSER_IN_USE`; do not reload, kill, restart, rotate, or steal ownership. The lease is coordination authority only, not Browser-readiness proof. Append the terminal `AUTOMATION_RUN` before releasing the lease; abandoned open runs remain visible until explicitly reconciled. Detailed mechanics live in [references/tool-runtime-and-auth.md](references/tool-runtime-and-auth.md).

**IDENTIFY-BEFORE-MUTATE.** Freshly prove the target identity before mutation, and again in a destructive confirmation surface when available. Position, tab index, stale coordinates, global AX order, or "the first matching control" are not identity. Automation control context is runtime state, not durable business identity.

**KNOWN-PATH-FIRST.** Reuse an existing proven helper/path before designing another transport. A surprising result means observe and diagnose; it does not authorize a second Swift/AX/AppleScript/CDP/PTY path.

**FIRST-DIVERGENCE-BEFORE-FALLBACK.** When actual reality differs from the expected chain, stop at the earliest mechanically proven mismatch and route to that owner. Do not chase the last downstream timeout/error or continue new mutations after an upstream identity/authority mismatch is already proven.

**USER-PATH-INTEGRITY.** Acceptance PASS must come through the real public user/product path. Internal APIs, direct DB/state edits, source inspection, or injected evidence may diagnose a defect when authorized; they must not manufacture a user-visible PASS or replace the real journey.

**ACCEPTANCE-LEVEL-AWARE.** Recovery starts from the latest proven checkpoint. Use `SAME_SCENE` for the original failed scene, `FAST_REPLAY` for only changed/affected downstream behavior, and `FULL_FRESH` only when the contract explicitly requires a from-zero/stage-final proof. Full Fresh is not a generic recovery reflex.

**CHECKPOINT-AFTER-PROOF.** When a meaningful acceptance step becomes mechanically proven, preserve that checkpoint through the project's current product-state authority before moving on. A later failure must not force reconstruction of already-proven progress from chat memory.

**FAILURE-CLASSIFY-BEFORE-REPAIR.** Before changing product state/code, distinguish: `HUMAN_EXTERNAL`, `PREREQUISITE_NOT_READY`, `HARNESS_FAILURE`, `TOOL_RUNTIME_FAILURE`, `PRODUCT_DEFECT`, `SPEC_EXTERNAL_MISMATCH`, `CONTEXT_KNOWLEDGE_MIGRATION_GAP`, or `UNKNOWN`. Harness/tool/prerequisite/context failures must not become product defects; spec/external mismatch stops for a contract decision.

**SIDE-EFFECT-RECONCILIATION.** If a mutating action may have occurred but its result/response is lost or timed out, do not infer `NOT_APPLIED`. Identify the durable postcondition, read the owning/external authority, and classify `APPLIED | NOT_APPLIED | UNKNOWN`. Retry is considered only after `NOT_APPLIED` is mechanically proven and the contract permits it; `UNKNOWN` preserves uncertainty and stops blind replay.

**MINIMUM-SUFFICIENT-PROOF.** Collect only the evidence required by the acceptance contract for the next decision. A visible-only fact may need one current UI readback; a cross-layer fact may require user reality plus the exact owner/runtime authority. Stop when the contract is satisfied.

**CONTINUE-EXISTING-BEFORE-RESTART.** Recover the current PID/session/PTTY/tab/auth transaction/checkpoint before starting again. `UNKNOWN` is never permission for a blind retry or duplicate product resource.

**RUN-BOUNDARY-FIRST.** Before the first acceptance mutation, long wait, connect/recover step, or log-dependent verification, append exactly one `AUTOMATION_START` for the run and bind the fresh-evidence window. The start record is the minimum time boundary; when `WAIT`, `LISTEN`, `CONNECT`, or `RECOVER` is needed, also bind the stable PID/session/log cursor or equivalent owner evidence when available before the first relevant action. Reuse the same `runId` through the scene and append one terminal `AUTOMATION_RUN` before returning control. A missed historical terminal record is repaired only by explicit retrospective reconciliation; never silently pretend it was logged on time.

**RETURN-CONTROL-CLOSES-RUN.** If this Chat opened an `AUTOMATION_START`, it must not return control through a final answer, handoff, explicit stop, or tool-blocked status until it has appended the truthful terminal `AUTOMATION_RUN` and run `check-open-runs.py --run-id <runId> --fail-on-open`. When turn/tool capacity is degrading, close the run truthfully at the current checkpoint before spending time on optional diagnosis. If logging infrastructure itself is unavailable, report `AUTOMATION_LOGGING=FAIL`, preserve the open-run evidence, and never claim that the run was closed.

**HARNESS-VALID-BEFORE-SCORING.** A behavioral/lost-context result counts only when the harness supplied the complete current Skill, all conditional references required by the scenario, and the current product facts/spec needed by any project-specific question. A truncated paraphrase, historical-chat contamination, leaked expected answer, or broken Browser/tool control makes the sample `HARNESS_INVALID`.

**EVIDENCE-GOVERNED-EVOLUTION.** When organizing or updating this Skill, read [references/skill-evolution.md](references/skill-evolution.md). Raw one-off evidence stays telemetry unless it proves a safety/correctness invariant. Promote only repeated or causally clear findings, preserve one semantic owner, and keep the main product/acceptance goal ahead of method work.

**DETERMINISTIC-MECHANICS-BELOW-MODEL.** Repeated deterministic mechanics with stable inputs, result semantics, and safety gates belong in `scripts/` only under the promotion contract owned by `skill-evolution.md`. Do not create wrappers that merely rename an existing tool.

**REALITY-IS-ACCEPTANCE-NOT-THE-MAIN-DEBUGGER.** Obtain enough current reality to classify the failure and prove the first divergence. Once the owning boundary is known, stop expensive Browser/native speculation; switch to the engineering owner for diagnosis/repair, then return to the same scene for real verification.

## Conditional loading

- Visible Web, `chrome://`, native UI, screenshots, AX, foreground/system input → [references/browser-and-system-ui.md](references/browser-and-system-ui.md).
- Interactive CLI, PTY, long process, wait, stdout/stderr/log, timeout/UNKNOWN → [references/cli-pty-and-process.md](references/cli-pty-and-process.md).
- MCP runtime/relay, Playwright `connect.html`, controlled context, Browser-mediated authentication, Microsoft Dev Tunnel Browser Auth → [references/tool-runtime-and-auth.md](references/tool-runtime-and-auth.md).
- Validation layers, harness validity, and behavioral smoke scoring → [references/validation-baseline.md](references/validation-baseline.md).
- Run telemetry and batch learning → [references/run-logging.md](references/run-logging.md).
- Organizing, simplifying, or evolving this Skill from evidence → [references/skill-evolution.md](references/skill-evolution.md).
- Project bootstrap, product-fact boundary, and project-specific automation ownership → [references/project-instructions.md](references/project-instructions.md).
- Lost-context scenario corpus → [references/lost-context-regression.md](references/lost-context-regression.md).

Do not load all references by default. Project-specific automation references are created only from real evidence and loaded only for that project/scenario.

## Run evidence — HARD RULE

Every real acceptance automation run uses one paired run boundary:

```text
AUTOMATION_START(runId, fresh evidence boundary)
→ real acceptance work
→ AUTOMATION_RUN(same runId, terminal or hand-off outcome)
```

Use `python3 scripts/append-run-log.py --input -` by default. A terminal event without a prior start fails closed unless it is an explicit historical repair using `retrospectiveReconciliation=true`, a non-empty `evidenceProvenance`, and capability miss `TERMINAL_RUN_LOG_MISSED`. Behavioral self-tests may use `testLayer`, `harnessValidity`, and `behavioralVerdict`; invalid harness samples remain evidence but never count as model-quality failures.

After writing the terminal record and before returning control, mechanically prove the current run is closed with `python3 scripts/check-open-runs.py --run-id <runId> --fail-on-open`. The checker is read-only; it never invents or repairs a terminal result. Project-wide open-run output is hygiene evidence only and historical gaps still require retrospective reconciliation.

If logging fails, report `AUTOMATION_LOGGING=FAIL` without rerunning product mutation.

## Engineering boundary

Acceptance automation behavior is owned only here. Project Formal Spec/current product facts remain the authority for product semantics and current state. If evidence proves repository product code or a product helper must change, preserve the current acceptance checkpoint and switch that mutation to `chat-local-engineering-protocol`; after verification, return to the same acceptance scene.

Do not create a second project-local acceptance automation protocol. When a stable project-specific automation path is genuinely necessary and cannot be generalized, migrate it into a narrow conditional reference under this Skill; project documents may point to that reference but must not restate a competing execution/recovery SOP.

## Core principle

**One automation truth, minimum cognition: use this Skill-owned path plus current product facts, observe the right reality, reconcile uncertain effects, preserve proven checkpoints, stop at the first divergence, and gather no more proof than the acceptance contract requires.**
