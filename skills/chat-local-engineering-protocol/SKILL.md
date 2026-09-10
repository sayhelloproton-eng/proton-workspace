---
name: chat-local-engineering-protocol
description: Scenario-aware protocol only for ChatGPT Chat orchestrating proton-workspace local engineering. Keep the phase lock and whole-file mutation invariant, but route each Engineering Decision through the minimum-sufficient evidence, cheapest authoritative primitive, and fewest safe round trips.
---

# Chat 本机工程协议

This Skill is the single rule owner for **ChatGPT Chat ↔ Local Machine** engineering under `/Users/agent/Desktop/proton-workspace`.
Repository rules may be stricter, but may not weaken these invariants. Reference files explain this Skill; they never define a second mutation model.

## Applicability scope — HARD RULE

This Skill applies only when **ChatGPT Chat** orchestrates Local engineering through tools such as CodeGraph, Repomix, Local Dev, or Playwright/AX.
It does **not** govern Codex/GPT-6 Codex sessions, Codex app/CLI/app-server/runtime, or other autonomous coding agents unless the user explicitly opts them in.
Never modify Codex configuration, AGENTS.md, Codex skills, CLI hooks, or shell environment to enforce this Chat protocol.

## Invariant kernel — HARD RULE

```text
ACQUIRE → FROZEN → BUNDLE_READY → APPLIED → VERIFY → DONE
```

- The mutation unit is one **Engineering Decision**, never one file or hunk.
- Local never decides source edits. Chat supplies complete next-version files; Local only performs mechanical whole-file CREATE/REPLACE/DELETE and real verification.
- Preserve unrelated WIP. Never stage, clean, overwrite, or commit unless explicitly authorized.
- After FROZEN, `LSR_AFTER_SNAPSHOT = 0` unless named evidence reopens ACQUIRE.
- Normal target: `LMR = 1`, one VERIFY start, no per-file mutation loop.

## Throughput objective

Primary KPI is **USER_PERCEIVED_WALL**: user request → completed engineering result.

```text
MAX_THROUGHPUT
= right fact owner
× cheapest authoritative primitive
× minimum-sufficient context
× minimum safe transactions
× one coherent Engineering Decision
```

A tool call is justified only when its evidence can change the current decision.

## ACQUIRE — Acceptance first, implementation minimal

ACQUIRE is one phase, not one literal tool call. Preferred internal order:

```text
FULL ACCEPTANCE EVIDENCE
→ DISCOVER owner / seam / blast radius
→ MINIMAL IMPLEMENTATION CONTEXT
→ lock Engineering Decision
→ FULL SOURCE only for actual changed files
→ FROZEN
```

- Acceptance criteria, failing proof, regression tests, contracts, and user intent come before broad implementation detail when available.
- Candidate scope may be conservative; **reasoning context should be narrow**.
- Do not load every candidate file in full merely because it might be related.
- Once actual changed files are known, acquire their complete source before FROZEN.
- CREATE files have no baseline source; their contract/dependency evidence must still be complete.

## Scenario router

### S1 — KNOWN_SCOPE_SMALL
Known scope; files can be returned completely by native reads.

`Local authority → ONE native batch source read → FROZEN → Chat → ONE APPLY → ONE VERIFY`

**Batch-first execution gate — HARD:**
- With 2+ known source paths, the first source-read operation MUST be one `read_multiple_files` call.
- Do not call `read_file`, `get_file_info`, `grep`, or shell commands first merely to probe line count, relevance, completeness, or “confirm” a known path.
- If the batch result itself reports truncation/remaining lines, that is evidence to reclassify the task as S2 and use an exact snapshot transport.
- `KNOWN_SCOPE_PREFLIGHT_PROBES = 0`.

For one known file, read it directly once; if the result explicitly reports truncation, switch to S2. Do not perform a separate one-line probe.

### S2 — KNOWN_SCOPE_LARGE
Known scope contains files that native reads truncate or paginate.

`Local authority → Repomix exact full snapshot → FROZEN → Chat → ONE APPLY → ONE VERIFY`

Repomix compressed output may assist discovery, but it is not a mutation-grade FROZEN snapshot.

### S3 — UNKNOWN_SCOPE / CROSS_MODULE
Blast radius is not credible yet.

`CodeGraph structure + Local native search + current WIP paths → minimal seams → actual changed-file full source → FROZEN`

CodeGraph owns structure, not complete textual candidate discovery. Native search owns current filesystem hits, including untracked WIP, not architecture. Combine their evidence when both are needed.

### S4 — VERIFY_FAILURE
Default route is not re-acquisition:

`Failure First → frozen-context repair → ONE repair bundle → failed proof only`

Reopen ACQUIRE only when the failure requires source outside the frozen package.

### S5 — TIMEOUT / UNKNOWN

`same PID/session continuation → authority recovery only if session unavailable → never blind retry`

Timeout is not proof of failure.

### S6 — RUNTIME / BROWSER
Route by fact domain:
- platform readiness/lifecycle → formal owner CLI or runtime authority;
- PID/port/process/health mismatch → Local runtime authority;
- Web UI/AX/Console/Network → Playwright/AX;
- browser-extension evidence unavailable in active context → `ENV_UNAVAILABLE`, never fabricate a negative conclusion.

Runtime mismatch is not a reason to guess from source.

### S7 — SOURCE_DRIFT / CONCURRENT WIP
Capture authority during ACQUIRE. Put final compatible HEAD/WIP/fingerprint checking **inside the ONE APPLY transaction**.
Mismatch → `SOURCE_DRIFT` → fail closed with zero mutation.

## Tool primitive policy

- CodeGraph: ownership, symbol relations, caller/callee, dependency, blast radius.
- Local native read/search APIs: ordinary known-file source and filesystem/content search.
- Repomix exact: complete large/broad mutation-grade source snapshot.
- Repomix compressed: low-token structural discovery only.
- Local process: Git authority, bundle apply, test/build/typecheck/lint/benchmark, runtime/PID/log.
- Playwright/AX: browser/UI/network/console reality.

**Do not wrap ordinary read/search in `start_process` when a native API can answer it.** Do not add per-file probes before a known-scope batch read. Process transport is reserved for real process semantics.

## FROZEN

When acceptance evidence, dependency evidence, and complete source for actual changed files are sufficient, immediately enter FROZEN.

`LSR_AFTER_SNAPSHOT = 0`.

Only these evidence triggers reopen ACQUIRE:
- `SOURCE_DRIFT`
- `VERIFICATION_FAILURE_REQUIRING_NEW_SOURCE`
- `RUNTIME_REALITY_MISMATCH`
- `EVIDENCE_TRIGGERED_SCOPE_EXPANSION`

Uncertainty, caution, curiosity, “one more grep”, or confirmation are not evidence.

## BUNDLE_READY — Whole-file Bundle Replacement

Chat produces complete next versions for every changed file:

```text
changed-files/
  path/to/a.ts
  path/to/b.ts
manifest.json   # only when DELETE is required
→ changed-files.tar
```

Operations are only `CREATE / REPLACE / DELETE`; rename is normally `CREATE + DELETE`. Even one changed file uses the same bundle model.
Normal path forbids model-authored patch/unified diff, MCP per-file edit loops, line/hunk mutation, anchor hunting, and Local sed/Python/string transformers that decide source changes.

### Deterministic materialization preference

Semantic design remains Chat-owned. When available, use a **Chat-side deterministic whole-file materializer** to preserve unchanged bytes from frozen complete source while producing the complete next-version file. Local still receives only complete file bytes and never a patch recipe.
If unavailable, Chat still produces complete files and treats unintended formatting-only drift as a BUNDLE_READY defect.

## APPLIED

One Engineering Decision targets one Local mutation round trip: `LMR = 1`.

`authority/fingerprint gate → extract/copy whole files → manifest deletes → git diff --check → changed-path summary`

Apply contains no source-design logic. Drift failure performs zero mutation.

## VERIFY

All real tests/build/typecheck/lint/benchmark run on the user's Local machine.
- Start once and keep PID/session/log authority.
- Prefer concise PASS output; return detailed failure proof first.
- Sample long tasks only when a result can change a decision.
- Frozen context sufficient → repair without source re-read.
- After repair rerun only affected proofs.
- Full Suite is a Stage Gate, never a debugging loop.

## Performance gates

Normal targets, not cross-repository promises:
- known scope / ordinary implementation: **1–3 min** user wall;
- known scope / large source: **2–4 min**;
- unknown cross-module decision: **3–5 min**;
- frozen-context repair: **+1–2 min**;
- genuinely complex architecture decision: **5–10 min**.

Routine work exceeding 10 minutes is a throughput failure until attributed to real reasoning/runtime rather than avoidable orchestration.

Hard metrics:
- `LSR_AFTER_SNAPSHOT = 0`
- `LMR_PER_DECISION = 1` target
- normal `VERIFY_START = 1`
- `KNOWN_SCOPE_PREFLIGHT_PROBES = 0`
- per-file mutation loops = 0
- blind retries = 0
- shell-wrapped ordinary read/search = 0 when native primitive exists
- Full Suite inside debugging loop = 0

## Self-hosting regression — HARD RULE

Changes to this Skill are themselves a real Engineering Decision and MUST obey this Skill. There is no special maintenance bypass.

A Skill update passes only when both are true:
- **result correctness:** the complete changed files and machine-readable mirror are internally consistent and verification passes;
- **process correctness:** the execution route obeyed the selected Scenario, Phase Lock, batch/native primitive rules, whole-file mutation model, WIP preservation, and verification/recovery constraints.

For Skill maintenance specifically:
- use current Skill files as the real source under test; do not substitute synthetic fixtures for the primary regression;
- record avoidable tool calls as failures even when the final files are correct;
- do not hide probe/read/edit/retry waste behind a later successful batch operation;
- preserve any pre-existing Git index/staging state unless the user explicitly authorizes changing it;
- self-hosting regression is judged by end-to-end user wall plus hard metrics, not Local filesystem speed alone.

`SELF_HOSTING_RESULT_CORRECT = required`
`SELF_HOSTING_PROCESS_CORRECT = required`

## Core principle

**Do not optimize for fewer tools in the abstract. Optimize for the fewest safe, authoritative evidence transactions needed to finish the Engineering Decision correctly.**

References: `references/dual-environment.md`, `references/tools-and-context.md`, `references/tests-and-long-tasks.md`, `references/metrics-and-antipatterns.md`, `references/validation-evidence.md`, `references/execution-policy.yaml`, `references/project-instructions-v3.md`.
