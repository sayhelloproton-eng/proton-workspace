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
NEED → CAPABILITY → KNOWN PATH/SCRIPT → ACT → CURRENT REALITY
→ FIRST DIVERGENCE / MINIMUM SUFFICIENT PROOF
→ SIDE-EFFECT RECONCILIATION when uncertain
→ CHECKPOINT → CONTINUE / RECOVER / STOP
```

Do not begin from tool names. Begin from the capability needed now.

## Common capability model

The public capabilities are: `SEE`, `IDENTIFY`, `ACT`, `WAIT`, `LISTEN`, `CONNECT`, `AUTHENTICATE`, `RECOVER`, `VERIFY`.
Read [references/common-capabilities.md](references/common-capabilities.md) for their project-independent contracts and tool mapping.

## Execution rules — HARD RULES

**EYES-FIRST.** If an action has a decision-relevant visible result, confirm current UI reality immediately. `EYES` means the authoritative current surface, not "take a screenshot after every action": on attachable ordinary Web prefer semantic DOM/snapshot state when it answers the question; use page screenshot when pixels, layout, visual status, geometry, or an error surface matter. On privileged/native UI, fresh screenshot + AX is the primary eyes path.

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

Every acceptance automation run that reaches `DONE`, `FAIL_CLOSED`, `BLOCKED`, `UNKNOWN`, or a hand-off appends one compact record with `python3 scripts/append-run-log.py --input <result.json>`. Behavioral self-tests may use `testLayer`, `harnessValidity`, and `behavioralVerdict`; invalid harness samples remain evidence but never count as model-quality failures.

If logging fails, report `AUTOMATION_LOGGING=FAIL` without rerunning product mutation.

## Engineering boundary

Acceptance automation behavior is owned only here. Project Formal Spec/current product facts remain the authority for product semantics and current state. If evidence proves repository product code or a product helper must change, preserve the current acceptance checkpoint and switch that mutation to `chat-local-engineering-protocol`; after verification, return to the same acceptance scene.

Do not create a second project-local acceptance automation protocol. When a stable project-specific automation path is genuinely necessary and cannot be generalized, migrate it into a narrow conditional reference under this Skill; project documents may point to that reference but must not restate a competing execution/recovery SOP.

## Core principle

**One automation truth, minimum cognition: use this Skill-owned path plus current product facts, observe the right reality, reconcile uncertain effects, preserve proven checkpoints, stop at the first divergence, and gather no more proof than the acceptance contract requires.**
