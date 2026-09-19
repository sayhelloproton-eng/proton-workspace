---
name: chat-local-engineering-protocol
description: "High-throughput staged protocol for ChatGPT Chat local engineering: reality first, one owner, complete implementation stages, non-blocking long work, whole-file mutation, and verification/release only at stage gates."
---

# Chat 本机工程协议

This Skill is the single rule owner for **ChatGPT Chat ↔ Local Machine** engineering under `/Users/agent/Desktop/proton-workspace`. References explain mechanics/evidence; they do not define a second protocol.

## Scope and authority — HARD RULE

Before any Local engineering action, Chat MUST use Local Dev to read the current Local copy of this Skill. Authority order:

```text
current Local SKILL.md
> stricter repository-local constraints
> project bootstrap instruction
> handoff / historical chat / reference / cached context
```

This Skill governs ChatGPT Chat only. It does not govern Codex or other autonomous coding agents unless the current user message explicitly opts them in. Never modify Codex configuration, skills, hooks, shell environment, or AGENTS.md merely to enforce this Chat-only protocol.

## Execution priority — HARD RULE

```text
CURRENT REALITY / EYES
→ FACT OWNER + FIRST DIVERGENCE
→ COMPLETE STAGE SCOPE
→ HIGH-THROUGHPUT IMPLEMENTATION
→ STAGE FREEZE
→ STAGE VERIFY
→ ACCEPTANCE / RELEASE / PUBLISH
```

Priority is: **reality and correctness > owner/first divergence > stage completeness > automation/throughput > test > release**.

- **EYES-FIRST / REALITY-FIRST.** For visible/runtime defects, inspect the authoritative current surface before source speculation. UI/browser observation semantics belong to `chat-local-acceptance-automation-protocol`; Engineering consumes the proven reality and repairs the owning boundary.
- **OWNER-FIRST.** Find the earliest owner that can explain the fact. Do not patch a downstream symptom while an upstream identity/runtime/authority mismatch is already proven.
- **AUTOMATION-BELOW-MODEL.** Model judgment chooses scope/owner/design; stable deterministic mechanics belong in scripts/automation. Throughput is an execution guarantee, not permission to skip reality or correctness.

## Stage discipline — HARD RULE

**严禁边改边测。** Real tests are stage gates, not implementation probes.

```text
IMPLEMENTATION STAGE
→ finish the whole agreed scope
→ STAGE FREEZE
→ TEST / TYPECHECK / BUILD / E2E as one verification stage
→ ACCEPTANCE when required
→ RELEASE / PUBLISH only after prior gates pass and authorization exists
```

During implementation, only **mechanical integrity checks** are allowed: expected-state/drift checks, whole-file materialization/apply integrity, syntax/parse sanity when needed, path/schema existence, and `git diff --check`. Do not run unit/integration tests, typecheck, build, E2E, Full Suite, or real Acceptance between source edits merely to steer the next edit.

If Stage Verify fails:

```text
capture the failure set / first owning boundary
→ close that verification attempt
→ open one Repair Stage
→ complete the repair scope
→ Stage Freeze again
→ verify again
```

Do not alternate `test A → patch → test A → patch`. Full Suite and Acceptance are final gates for a stable stage. Publish/deploy/release must never be used as a debugging transport.

Normal target: one Engineering Decision completes one implementation stage. If a large stage genuinely requires multiple mutation decisions, formal tests remain deferred until the implementation scope is complete.

Detailed test/long-task/release mechanics: `references/tests-and-long-tasks.md`.

## Phase lock — HARD RULE

The mutation control plane remains:

```text
ACQUIRE → FROZEN → BUNDLE_READY → APPLIED → VERIFY → DONE
```

`VERIFY` inside a non-final implementation decision means mechanical integrity only. Formal Stage Verify is allowed only after the implementation stage is frozen.

Core invariants:
- one **Engineering Decision** is the mutation unit; file count is not;
- Chat owns semantic design and complete next-version files;
- Local performs mechanical whole-file CREATE/REPLACE/DELETE and declared verification only;
- preserve unrelated WIP; never clean/revert/stage/commit/push without authorization, except release-bound commits mechanically authorized by an explicit release request;
- after FROZEN, `LSR_AFTER_SNAPSHOT = 0` unless named evidence reopens ACQUIRE;
- normal mutation target: `LMR = 1`, one payload transaction, one verification start;
- `BUNDLE_READY` requires complete next-version files, expected state, verification plan, self-review, and token-independent envelope body before the frozen runner starts.

## ACQUIRE — reality, contract, owner, minimum source

Preferred shape:

```text
current reality / acceptance contract / failing proof
→ owner / seam / blast radius
→ minimum implementation context
→ complete source for actual changed files
→ FROZEN
```

Scenario routing:
- **S1 KNOWN_SCOPE_SMALL** — Local authority → one native batch source read → FROZEN. With 2+ known files, first read MUST be `read_multiple_files`.
- **S2 KNOWN_SCOPE_LARGE** — Repomix exact snapshot → FROZEN.
- **S3 UNKNOWN_SCOPE / CROSS_MODULE** — one structure-discovery round + one current-filesystem round by default → minimal seams → complete changed-file source → FROZEN.
- **S4 VERIFY_FAILURE** — capture failure set / first owner → Repair Stage; source reread only when new source is actually required.
- **S5 TIMEOUT / UNKNOWN** — recover same authority/session/effect before any retry.
- **S6 RUNTIME / BROWSER** — runtime/CLI/PID/log facts from their owner; visible user reality from EYES/Acceptance.
- **S7 SOURCE_DRIFT / CONCURRENT_WIP** — fail closed inside the single apply transaction.

Do not buy extra reads/searches for reassurance. Additional acquisition requires a named evidence gap that can change scope, design, or verification.

Tool ownership detail lives in `references/tools-and-context.md`.

## Throughput and automation — HARD RULE

Primary KPI is `USER_PERCEIVED_WALL`: Chat cognition + Tool/transport + Local compute + recovery/retry + harness mistakes. Optimize avoidable waiting and repeated transactions only after reality/owner correctness is secured.

High-value defaults:
- batch adjacent evidence;
- freeze as soon as evidence is sufficient;
- one whole-file mutation round per Decision;
- no per-file/hunk mutation loops;
- no blind retry;
- no model polling just to learn “still running”;
- compress repeated deterministic control-plane sequences into one helper transaction whenever no model judgment is needed between steps;
- use existing deterministic scripts/automation instead of rebuilding mechanics in Chat;
- timing/telemetry must reuse naturally available evidence and must not create extra work.

Detailed metrics/failure families live in `references/metrics-and-antipatterns.md` and `references/execution-policy.yaml`.

## Long tasks — HARD RULE

For build, install, deploy, publish, Full Suite, or any known-slow task:

```text
START ONCE
→ record PID/session/log + terminal authority
→ plan the current eligible mainline work pool
→ execute that pool to exhaustion
→ proactively replan downstream gate-safe work
→ only when no eligible work remains: inspect terminal authority
→ inspect PID/session only if terminal authority cannot close the result
→ if still RUNNING/UNKNOWN: treat that as a mandatory REPLAN trigger
→ execute every newly eligible task to exhaustion
→ return control only after exhaustive replanning proves no safe relevant work remains
```

**ASYNC CONTINUATION BARRIER.** A task becomes `ASYNC_BOUND` when it is known-slow **or** its first Local call returns a live PID/session with `running/timeout` instead of a terminal result. After that boundary:
- do **not** directly inspect the PID/session/status just because the async task started; first execute all currently known mainline-relevant work that does not depend on the async result, does not cross the current Stage/Gate, and is safe under the current owner/authority;
- after the current work pool is exhausted, Chat must **replan forward** for additional downstream preparation, evidence, bookkeeping, adoption/recovery preparation, or other gate-safe work that can be completed without the async result;
- only when both the current work pool and that proactive replan produce no eligible work may Chat inspect the terminal Owner authority; PID/session is a fallback only when terminal authority cannot decide;
- a `RUNNING` / unresolved readback is **not** a return condition. It is a mandatory signal to plan another round of eligible work and execute it before considering another status readback;
- there is no fixed “one PID readback per turn” rule. Instead, every additional readback for the same authority requires a real intervening cycle of **replan → meaningful mainline work → work-pool exhaustion**. Two status reads with no meaningful work between them are polling and are forbidden;
- return control is allowed only after the post-readback replan also finds no new eligible work and every remaining meaningful action either depends on the async terminal result or would cross the current Stage/Gate;
- do not invent unrelated busywork, speculative refactors, or premature next-Gate actions merely to stay active;
- never follow one unresolved readback with a probe chain such as `read_process_output → list_sessions → ps/status/health/log` just to wait;
- the next user continuation resumes from the recorded authority; it must not restart the work.

Do not synchronously hold Chat open merely waiting. The objective is not to “stay busy”; it is to **exhaust all safe, relevant, gate-correct work before returning control**. npm publish/release is always detached/non-blocking; exact Registry version is the publication authority. Timeout/UNKNOWN never authorizes a duplicate non-idempotent action.

Details: `references/tests-and-long-tasks.md`.

## BUNDLE_READY / APPLIED — whole-file mutation

Use the stable whole-file control plane:

```text
complete CREATE/REPLACE/DELETE files
+ expected state from build-expected-state.mjs
+ verification plan
→ execute-frozen-decision.mjs
→ receiver derives manifest/bundle
→ drift-gated apply
→ declared verification
→ durable receipt / terminal marker
```

Normal path forbids model-authored patch transport, per-file edit loops, shell-embedded source/heredoc/base64 payloads, Local source-design transformers, and ad-hoc apply harnesses.

After `ENVELOPE_READY`, the next Local tool transaction MUST be the single payload send; no source read/search/plan change/verify redesign/polling may intervene. On response/session loss, recover the durable receipt before considering rerun.

Wire/mechanical details are owned by the scripts and `references/execution-policy.yaml`; do not duplicate them into project docs.

## Stage Verify / Acceptance / Release — HARD RULE

Formal verification starts only after Stage Freeze. Run the smallest stage-appropriate batch first; Full Suite is a Stage Gate, not a debugging loop. Failure returns to a Repair Stage, not an interleaved patch/test loop.

Acceptance is owned by `chat-local-acceptance-automation-protocol`. Read-only EYES may provide a pre-implementation failing proof, but real stage Acceptance occurs after Engineering verification is stable.

Release/publish/deploy is the final delivery phase. It requires an explicit user release/delivery intent and the required prior gates. Never publish a temporary version merely to discover whether the implementation works.

## Codex execution boundary — HARD RULE

“交给 Codex / 让 Codex 审计 / 生成给 Codex 的提示词” defaults to producing a handoff prompt, not hidden Codex execution. Direct Codex execution requires explicit authorization in the current user message and that authorization is single-use. Taking over an existing named session does not authorize starting another one.

## POST-DONE — learning without hijacking delivery

Every Local engineering turn appends one compact throughput record through `scripts/append-throughput-log.py`; do not hand-write the ledger. Record only observed timings/metrics and keep unresolved UI wall as `PENDING_UI`.

Learning is evidence-driven: one-off incidents stay telemetry; repeated/causally clear patterns may update references; a demonstrated safety/correctness invariant may justify a HARD RULE. A Skill change is a separate Engineering Decision and must self-host. Mainline work always outranks method tuning.

## Core principle

**先看现实，找对 Owner，一次做完整阶段；异步任务先把当前和后续所有可安全推进的主线工作做尽，再看终态；若仍未完成就重新规划并继续，只有所有可能任务都耗尽后才返回控制权；测试、Acceptance、发布只在阶段 Gate 做。**

References: `references/tools-and-context.md`, `references/tests-and-long-tasks.md`, `references/metrics-and-antipatterns.md`, `references/execution-policy.yaml`, `references/validation-evidence.md`, `references/dual-environment.md`, `references/project-instructions-v3.md`.
