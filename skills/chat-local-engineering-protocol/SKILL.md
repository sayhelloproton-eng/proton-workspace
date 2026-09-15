---
name: chat-local-engineering-protocol
description: High-throughput protocol for ChatGPT Chat orchestrating proton-workspace local engineering with hard phase locks, whole-file mutation, authoritative tools, and evidence-driven self-improvement.
---

# Chat 本机工程协议

This Skill is the single rule owner for **ChatGPT Chat ↔ Local Machine** engineering under `/Users/agent/Desktop/proton-workspace`.
References explain rules or preserve evidence; they do not define a second protocol.

## Scope and authority — HARD RULE

This Skill applies only when **ChatGPT Chat** orchestrates Local engineering through CodeGraph, Repomix, Local Dev, Playwright/AX, or equivalent tools. It does not govern Codex app/CLI/app-server/runtime or other autonomous coding agents unless the user explicitly opts them in.

Before any Local engineering action, Chat MUST use Local Dev to read the current Local copy of this Skill and use that content as the execution protocol for the task.

Authority for the shared protocol:

```text
current Local SKILL.md
> stricter repository-local constraints
> project bootstrap instruction
> handoff / historical chat / reference / cached context
```

Repository rules may add stricter constraints but may not weaken this protocol. Project instructions should only bootstrap/enforce loading this Skill. Never modify Codex configuration, Codex skills, hooks, shell environment, or AGENTS.md merely to enforce this Chat-only protocol.

## Codex execution boundary — HARD RULE

ChatGPT Chat must not directly invoke, start, resume, steer, or send work to Codex CLI, Codex app-server, Codex binaries, or equivalent autonomous Codex execution merely because the user says “交给 Codex”, “让 Codex 审计”, “生成提示词给 Codex”, or similar delegation language. Those phrases default to **produce a prompt / handoff for the user to run in Codex**, not hidden Codex execution by Chat.

Direct Codex execution is allowed only when the **current user message explicitly authorizes that specific direct Codex execution**. Authorization is single-use and non-inheritable: a prior-turn approval, project history, handoff, or earlier permission does not authorize a later Codex invocation. If the user explicitly asks Chat to take over an **existing already-running Codex session**, that authorization applies only to observing/recovering/continuing the named existing session as requested; it does not authorize starting another Codex process or silently creating a replacement session.

When the user expects a visible Codex conversation, do not substitute an invisible/background CLI session. If direct execution is not currently authorized, generate the exact audit/work prompt and stop at the handoff boundary.

## Phase lock — HARD RULE

```text
ACQUIRE → FROZEN → BUNDLE_READY → APPLIED → VERIFY → DONE
```

Core invariants:
- one **Engineering Decision** is the mutation unit; file count is not;
- Chat owns semantic design and complete next-version files;
- Local performs only mechanical whole-file CREATE/REPLACE/DELETE plus real verification;
- preserve unrelated WIP; never stage, clean, overwrite unrelated work, or commit without authorization. An explicit user instruction to publish/release the current or named release authorizes only the release-bound version/release commit(s) mechanically required by the repository's formal release workflow; do not ask for a second commit confirmation. This does not authorize unrelated commits or push;
- after FROZEN, `LSR_AFTER_SNAPSHOT = 0` unless named evidence reopens ACQUIRE;
- `BUNDLE_READY` means all complete next-version files, semantic operations, expected state, verification plan, self-review, and the token-independent envelope body are final; only deterministic substitution of the runner-issued token may remain;
- the frozen runner MUST NOT start before `BUNDLE_READY`;
- normal targets: `LMR = 1`, one VERIFY start, no per-file mutation loop.

## Throughput objective

Primary KPI:

```text
USER_PERCEIVED_WALL
= Chat reasoning/context/orchestration
+ Tool/transport wall
+ Local compute
+ recovery/retry tax
+ harness/setup/transport mistakes
```

Optimize the highest-weight avoidable tax first. Local filesystem speed is only a component, not a substitute for user-perceived throughput. A tool call is justified only when its evidence can change the current decision.

For per-turn accounting, use one compact `phaseTimingsMs` object with canonical keys:

```text
bootstrap, caseSetup, acquire, semantic, bundle, apply, verify, recovery, postDone
```

Each value is directly observed wall milliseconds or `null`; never invent precision or convert model intuition into fake timing. `caseSetup` is benchmark/replay preparation, not part of the measured Engineering Decision, but if it happens inside the same user turn it still contributes to `USER_PERCEIVED_WALL` and must remain visible.

Do not create extra Tool calls merely to measure phases. Reuse existing Tool/process telemetry and naturally available phase boundaries. Unmeasured time stays unattributed for later batch review instead of being guessed.

## ACQUIRE — acceptance first, implementation minimal

Preferred order:

```text
acceptance / failing proof / contract
→ owner / seam / blast-radius discovery
→ minimum implementation context
→ lock Engineering Decision
→ complete source for actual REPLACE files
→ FROZEN
```

Rules:
- ACQUIRE is one phase, not one literal tool call.
- Candidate scope may be conservative; reasoning context should be minimum-sufficient.
- Do not load every candidate file merely because it might be related.
- CREATE files need complete contract/dependency evidence even though no baseline source exists.

### Scenario routing

- **S1 KNOWN_SCOPE_SMALL** — Local authority → one native batch source read → FROZEN.
  - with 2+ known source paths, the first source-read operation MUST be `read_multiple_files`;
  - no preflight `read_file/get_file_info/grep/shell` probes merely to confirm known paths;
  - explicit truncation is evidence to reclassify to S2.
- **S2 KNOWN_SCOPE_LARGE** — Local authority → Repomix exact snapshot → FROZEN.
- **S3 UNKNOWN_SCOPE / CROSS_MODULE** — one structure-discovery round + one current-filesystem discovery round by default → minimal seams → one batch complete changed-file source → FROZEN. Extra discovery requires a named evidence gap that can change the Decision.
- **S4 VERIFY_FAILURE** — Failure First → repair from frozen context → targeted reverify; reopen only if new source is genuinely required.
- **S5 TIMEOUT / UNKNOWN** — continue same PID/session first; recover authority only if unavailable; never blind retry.
- **S6 RUNTIME / BROWSER** — route by fact owner: formal CLI/runtime for lifecycle, Local for PID/port/process/log, Playwright/AX for UI/Console/Network.
- **S7 SOURCE_DRIFT / CONCURRENT_WIP** — final HEAD/branch/file-fingerprint gate lives inside the single APPLY transaction and fails closed before mutation.

### Tool ownership

- CodeGraph: ownership, caller/callee, dependency, blast radius.
- Local native read/search: ordinary current filesystem/source evidence.
- Repomix exact: large/broad mutation-grade complete snapshot.
- Repomix compressed: structural discovery only.
- Local process: Git authority, apply runner, tests/build/typecheck/lint/benchmark, PID/log/runtime.
- Playwright/AX: browser/UI/network/console reality.

Do not wrap ordinary read/search in `start_process` when a native API can answer it.

### Decision transaction discipline — DEFAULT

After scenario classification, buy at most one discovery round per unresolved fact domain by default. Batch adjacent evidence into the same authoritative transaction when possible. Any additional discovery/search/read round MUST have a named evidence gap whose answer can change scope, design, or verification; “more confidence” alone is not enough.

For benchmark/replay work, case selection and environment preparation are outside the measured Engineering Decision unless the acceptance criteria themselves require them. Prepare the case package first; do not spend measured ACQUIRE on broad Git-history browsing, repository cloning, dependency re-materialization, or teardown that is unrelated to the Decision. If such setup is genuinely required, record it separately as benchmark/setup cost.

A hidden oracle may hide the historical implementation and expected output details, but it MUST NOT introduce a new requirement. Any public symbol, contract, side effect, ordering rule, or compatibility behavior required for PASS must already be stated in acceptance or mechanically derivable from the supplied contract. If the first oracle failure reveals a requirement that was not available before FROZEN, invalidate that benchmark sample as `HARNESS_HIDDEN_REQUIREMENT`; do not score the resulting repair loop as model quality.

### Local process fast path

For short non-interactive mechanical commands that do not require zsh-specific syntax/profile state, prefer an explicit lightweight shell such as `/bin/sh` when supported. Do not change the user's global default shell for this protocol. Shell-path stalls are runtime/recovery evidence, not a reason to reopen source acquisition.

### Known-slow long-running process detachment — HARD RULE

When direct evidence or repeated Local history shows a command commonly exceeds normal Chat tool wait — for example package build, publishability, release/publish, deploy, install, or a full test suite — first decide whether its terminal result is required before the current user turn can make the next decision.

If the terminal result is **not required in the current turn**:
- start the long operation exactly once using a process/session that can outlive the initiating tool wait; prefer detached/background execution when supported;
- record durable authority: `PID_OR_SESSION`, `LOG_PATH` when available, and the expected `TERMINAL_AUTHORITY` / target identity;
- once start is mechanically confirmed, return control to the user. Same-turn status polling after detached start is forbidden: do not repeatedly call `read_process_output`, `ps`, health/status endpoints, registry queries, or fixed-interval waits merely to learn “still running”;
- a short Tool timeout around a known-slow task is not a failure/recovery trigger when PID/session authority proves the operation started; never start a replacement copy merely because the initiating Tool wait expired;
- protocol bookkeeping that does not inspect the long-running process, such as the required throughput-ledger append, may still complete before returning control.

When a later user turn or a downstream Engineering Decision actually requires the outcome, check in this order:
1. read the terminal Owner authority first;
2. if the terminal condition is already satisfied, classify PASS/APPLIED without inspecting the process;
3. otherwise inspect the recorded PID/session **once**;
4. if it is alive, classify `RUNNING`, report that fact, and stop;
5. if it is dead, read its terminal log/output once, classify the failure/outcome, and retry a non-idempotent action only after `NOT_APPLIED` / `FAILED` is mechanically proven.

For npm package publish/release, the exact Registry version (`npm view <package>@<version> version`) is the side-effect authority; build/publish process output is secondary evidence.

#### npm publish / release non-blocking — HARD RULE

For npm package publish/release specifically, **synchronous terminal waiting is forbidden**, even when the final Registry result would otherwise be needed in the same user turn.

- start the publish/release exactly once in a detached or otherwise durable process;
- record `PID_OR_SESSION`, `LOG_PATH` when available, and the exact `<package>@<version>` Registry target;
- immediately continue any independent work that does not depend on Registry publication; do not hold the Chat open waiting for publish completion;
- same-turn `read_process_output`, PID polling, fixed-interval waiting, or repeated Registry polling merely to watch publication progress is forbidden;
- when a later downstream decision actually needs publication state, query exact Registry authority first with `npm view <package>@<version> version` (or an equivalent exact Registry read);
- if the exact Registry version exists, classify `APPLIED/PASS` regardless of the original publish process output;
- if the exact Registry version is absent, inspect the recorded PID/session once; if alive, classify `RUNNING` and continue other independent work or return control; if dead, read the terminal log/output once and classify;
- retry publish only after `NOT_APPLIED` / `FAILED` is mechanically proven;
- if no independent work remains, return control to the user rather than synchronously waiting for npm publish/release to finish.

This package-specific rule overrides the generic terminal-required same-turn allowance below. A model waiting synchronously for npm publish/release terminal completion is a **HIGH-SEVERITY throughput violation**.

If the terminal result **is required in the current turn**, same-session waiting is allowed for non-publish long-running work, but sample only when new evidence can change a decision. Fixed-interval polling remains forbidden.

Repeated same-turn polling of known-slow work is a **HIGH-SEVERITY throughput regression** because it blocks user control without adding decision value.

### Repomix context hygiene — HARD RULE

When Repomix is selected:
- prefer `includePatterns` when scope is known;
- explicitly recurse-ignore at least `**/node_modules/**`, `**/.git/**`, `**/.next/**`, `**/dist/**`, `**/build/**`, `**/coverage/**`, plus known repository-specific generated/cache trees;
- do not rely only on `.gitignore` or Repomix built-ins;
- never filter out acceptance evidence or complete source required for changed files.

## FROZEN — HARD RULE

Enter FROZEN as soon as evidence is sufficient. Then `LSR_AFTER_SNAPSHOT = 0`.

Only these triggers reopen ACQUIRE:
- `SOURCE_DRIFT`
- `VERIFICATION_FAILURE_REQUIRING_NEW_SOURCE`
- `RUNTIME_REALITY_MISMATCH`
- `EVIDENCE_TRIGGERED_SCOPE_EXPANSION`

Uncertainty, caution, curiosity, or “one more grep” are not evidence.

## BUNDLE_READY and APPLIED — Whole-file Bundle Replacement

Chat emits complete next-version files with semantic operations. Local harness derives transport metadata:

```text
Chat: complete file + CREATE/REPLACE, or DELETE path
Local: manifest.json + changed-files.tar + receipt.json
Authority: expected-state.json
Verification: verification-plan.json
```

Rename is normally `CREATE new + DELETE old`. Even one changed file uses the same model.

### Expected-state derivation — DEFAULT

Once the complete changed-path set is known and before `BUNDLE_READY`, derive the current authority mechanically instead of hand-authoring file-state metadata:

```text
node skills/chat-local-engineering-protocol/scripts/build-expected-state.mjs \
  --repo <repoRoot> \
  --path <changed-path-1> \
  --path <changed-path-2>
```

Chat owns the repository root and the semantic changed-path set; Local derives current `HEAD`, branch, path existence, and `sha256` for existing files. Do not hand-author `exists` / `sha256` on the normal path when this helper is available. The resulting `chat-local-expected-state.v1` JSON is frozen into the envelope, and the apply runner still rechecks it immediately before mutation to fail closed on concurrent drift.

### Data Plane / Control Plane — HARD RULE

Data Plane carries complete file bytes, semantic operations, authority, and verification intent. Control Plane is only a short stable-runner invocation. Internal manifest/tar representation belongs to Local deterministic mechanics, not Chat.

Normal path forbids:
- model-authored patch/unified diff as mutation transport;
- MCP per-file edit/line/hunk/anchor loops;
- Local sed/Python/string transformers that decide source changes;
- source text, tar bytes, large base64, or heredocs embedded in shell commands;
- ad-hoc apply harnesses rewritten per Decision;
- model-authored `chat-local-manifest.v1` on the default streaming/frozen path.

Preferred transport:

```text
complete files + CREATE/REPLACE/DELETE operations
+ expected state + verification plan
→ one stable frozen-decision runner
→ receiver derives manifest and materializes changed-files.tar
→ authority/fingerprint-gated whole-file apply
→ batched targeted verify
→ deterministic terminal receipt/prompt
```

### Streaming whole-file envelope — DEFAULT FAST PATH

When Local Dev exposes an interactive process channel and changed payloads are UTF-8/LF text, start the stable receiver `scripts/materialize-whole-file-envelope.mjs` once, then send **all** complete next-version files with their `CREATE|REPLACE` operation, any `DELETE` paths, expected state, and verification plan through one `interact_with_process` stdin envelope.

Default wire semantics are operation-oriented: `FILE <token> <CREATE|REPLACE> <path> ... END <token>` and `DELETE <token> <path>`. The receiver derives canonical `chat-local-manifest.v1` locally. Chat MUST NOT serialize that manifest on the default path. A legacy `FILE <token> <path>` + `MANIFEST` mode may remain only for compatibility with already-prepared transports and must not be selected for new Decisions.

Source bytes in this path are Data Plane stdin, never shell-command payload. The receiver is prompt-aware so process startup/interaction can return on a deterministic `>` prompt instead of waiting for generic timeout detection. Normal target: one envelope payload transaction per Engineering Decision, then one stable apply invocation. Do not split a 200-line file into 7–10 model↔tool write transactions when the streaming receiver is available.

The streaming receiver intentionally supports UTF-8 text normalized to LF with a final newline. Binary or line-ending-sensitive files require a binary-safe transport; do not force them through the text envelope. Native chunked file-write remains a fallback only when the receiver transport is unavailable or unsuitable.

### Frozen execution control plane — DEFAULT FAST PATH

When complete next-version files, expected state, and targeted verification are all known at FROZEN, finish self-review and construct the complete token-independent operation envelope first. Only after entering `BUNDLE_READY` may Chat start `scripts/execute-frozen-decision.mjs`.

After the runner emits `ENVELOPE_READY=<token>` / `chat-local>`, the **next Local tool transaction MUST be the one `interact_with_process` payload send**. Between ready marker and payload send there must be zero source reads, searches, schema discovery, plan changes, verification redesign, runner/interface reads, or model-driven polling. Runtime-token substitution is the only allowed preparation after ready.

After that envelope, the stable Local runner owns the mechanical chain `derive manifest → materialize → apply → verify → receipt`; Chat MUST NOT re-enter between those steps merely to choose runner paths, staging paths, internal manifest fields, apply arguments, or verify commands again.

The frozen-decision runner must emit `chat-local-result>` on every terminal PASS / FAIL / UNKNOWN path before process exit. Treat that marker as the deterministic control-return boundary so Chat can receive terminal evidence without waiting for delayed PTY/process-exit detection. Preserve failure evidence; clean temporary staging only after terminal PASS unless explicitly requested otherwise.

Normal target for this path: one process start + one envelope interaction, `DATA_PLANE_PAYLOAD_TRANSACTIONS=1`, `MODEL_AUTHORED_MANIFEST=0`, `LMR=1`, `VERIFY_START=1`, `READY_TO_PAYLOAD_INTERVENING_TOOL_CALLS=0`, and zero model re-entry between mechanical apply/verify steps. Record `RUNNER_READY_TO_PAYLOAD_GAP_MS` when naturally observable; do not add timing-only calls. The deterministic process criterion is zero intervening Local tool calls, not an artificial millisecond SLA.

If this runner is unavailable or unsuitable, fall back to the lower-level receiver + stable apply + verify path without changing the Whole-file mutation model.

If binary archive upload is unavailable and the streaming receiver cannot be used, native file-write may place **complete next-version files only** into Local temp staging before mechanical tar creation. This fallback changes Data Plane calls but does not change `LMR=1` and must never write repository source directly.

Stable apply semantics live in `scripts/apply-whole-file-bundle.mjs`. The runner may validate repo/branch/HEAD/file fingerprints, paths/checksums, unpack/copy/delete whole files, run `git diff --check`, and write a receipt. It must contain zero source-design logic.

On mutation `TIMEOUT / UNKNOWN`, preserve transport/evidence and recover the prior outcome before any retry or cleanup.

## VERIFY

All real test/build/typecheck/lint/benchmark work runs on the user's Local machine.

- start once; keep PID/session/log authority;
- Failure First: return concise failing proof/path/stack/stderr;
- if frozen context is sufficient, repair without source reread;
- rerun only affected proofs after repair;
- Full Suite is a Stage Gate, not a debugging loop;
- sample long tasks only when the result has decision value; do not poll merely to learn “still running”;
- known-slow work whose terminal result is not needed in the current turn follows the detachment HARD RULE above.

## Performance gates

Normal targets, not cross-repository promises:
- known scope / ordinary: **1–3 min** user wall;
- known scope / large source: **2–4 min**;
- unknown cross-module: **3–5 min**;
- frozen repair: **+1–2 min**;
- genuinely complex architecture: **5–10 min**.

Routine work over 10 minutes is a throughput failure until attributable to unavoidable reasoning/runtime rather than orchestration waste.

Hard process metrics:
- `LSR_AFTER_SNAPSHOT = 0`
- `LMR_PER_DECISION = 1` target
- normal `VERIFY_START = 1`
- `KNOWN_SCOPE_PREFLIGHT_PROBES = 0`
- `KNOWN_SLOW_DETACHED_SAME_TURN_POLLS = 0`
- per-file mutation loops = 0
- blind retries = 0
- shell-embedded mutation payload = 0
- normal streaming `DATA_PLANE_PAYLOAD_TRANSACTIONS = 1`
- normal streaming `MODEL_AUTHORED_MANIFEST = 0`
- normal frozen `READY_TO_PAYLOAD_INTERVENING_TOOL_CALLS = 0`
- record `RUNNER_READY_TO_PAYLOAD_GAP_MS` when naturally observable
- normal frozen control-plane model re-entry between mechanical steps = 0
- Full Suite inside debugging loop = 0
- `POST_DONE_REVIEW = 1` for every real Local Engineering Decision
- `THROUGHPUT_LEDGER_RECORD = 1` for every user turn that performs Local engineering under this Skill

## Throughput benchmark and Skill evolution — HARD RULE

Throughput testing and protocol evolution are separate loops. Do not mutate the benchmark fixture, mutate this Skill, and score the same replay as one mixed experiment.

### Throughput benchmark loop

Use this sequence:

```text
PREPARE_CASE → FREEZE_FIXTURE → CLEAN_REPLAY → CAPTURE_UI_WALL
→ ATTRIBUTE → SCORE → DECIDE_NEXT_ACTION
```

Rules:
- case preparation, baseline restoration, harness repair, dependency setup, and hidden-oracle fairness checks happen before the measured replay;
- freeze the case inputs/acceptance/authority/verification contract before replay and do not “fix the benchmark” inside the measured Decision;
- when evaluating one optimization hypothesis, replay the same representative case before switching to a new case;
- always score three independent axes: `RESULT_CORRECTNESS`, `PROCESS_CORRECTNESS`, `THROUGHPUT`;
- `THROUGHPUT` is `PENDING_UI` until a real user-visible wall is available; Local compute or observable-path timings alone cannot declare the user-wall gate PASS;
- append a later `WALL_UPDATE` when the Chat UI wall becomes available;
- attribute only directly observed timings. After wall resolution, `UNATTRIBUTED_WALL_MS = USER_PERCEIVED_WALL - sum(observed attributable wall)` may be derived, but its internal composition must not be guessed;
- explicitly separate harness/setup defects, Local/runtime variance, runner-ready-to-payload gaps, model/Chat orchestration, and accepted unattributed wall;
- if the user explicitly accepts a remaining unattributed wall as an acceptable cost, record that decision and stop investigating it unless it later regresses or blocks the target.

### Skill evolution loop

Organize each protocol iteration as one causal experiment:

```text
EVIDENCE → HYPOTHESIS → ONE_SKILL_DECISION → SELF_HOST
→ SAME_CASE_REPLAY → COMPARE → KEEP / REVERT / FREEZE
```

Rules:
- one iteration should target one dominant, causally supported failure family or invariant; do not batch unrelated “improvements” merely because the Skill is already open;
- classify the owner before changing rules: `BENCHMARK_HARNESS`, `SHARED_SKILL`, `LOCAL_RUNTIME/TOOL`, `MODEL/CHAT_RUNTIME`, or `PROJECT`; only `SHARED_SKILL` defects belong in this Skill;
- a harness correction is a separate setup Decision and must be completed before the next measured replay;
- a Shared Skill change is a separate Engineering Decision and must self-host through this Phase Lock before it can be used as the new baseline;
- compare the new replay against the immediately previous valid replay of the same case on correctness, process metrics, user wall, attributable wall, and failure families;
- do not promote a rule because one noisy run was faster. Prefer causally clear invariants or repeated comparable evidence;
- if a change reduces one tax but introduces new process/harness failures, do not call the iteration a throughput win merely because the final code passes;
- once a clean replay passes result/process correctness and the remaining wall is either within target or explicitly accepted by the user, freeze that protocol baseline. After freeze, stop self-modifying until new evidence demonstrates a regression, a new safety/correctness invariant, or the user explicitly starts a new iteration cycle.

The purpose of iteration is to remove the highest-weight avoidable tax, not to keep the Skill permanently in motion.

## POST-DONE｜Throughput Learning Loop — HARD RULE

Every real Local Engineering Decision that reaches DONE runs one lightweight loop:

```text
OBSERVE → REFLECT → EVOLVE
```

**OBSERVE** — record enough evidence to explain throughput: `USER_PERCEIVED_WALL`, `phaseTimingsMs`, Local compute, observable Tool/transport wall, attributable Chat orchestration tax, avoidable calls/round trips, recovery/harness mistakes, `RESULT_CORRECTNESS`, `PROCESS_CORRECTNESS`, and throughput-gate result.

**REFLECT** — identify reusable causes, especially redundant acquisition, context amplification, unnecessary polling, shell/runner startup tax, fragmented transfer/apply/verify, runner-ready-to-payload gaps, and avoidable recovery.

### Per-turn throughput ledger — HARD RULE

Every user turn that loads this Skill and performs Local engineering MUST leave one compact record when control returns to the user, including `DONE`, `FAIL_CLOSED`, `BLOCKED`, or other terminal/hand-off outcomes.

Raw records live at:

`/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/.throughput/ledger.jsonl`

Use `python3 scripts/append-throughput-log.py --input <record.json>` for every new `DECISION`, `WALL_UPDATE`, or `BATCH_REVIEW` event. The writer validates the canonical field names/types, exact phase timing keys, wall-time state, duplicate Decision IDs, WALL_UPDATE targets, record size, and secret-like fields/values before it appends under a file lock. Direct ad-hoc writes of new throughput events are forbidden; historical schema drift remains historical evidence and is not rewritten merely to normalize it.

A normal `DECISION` record should contain only compact execution evidence: recorded time/id, scenario/outcome, `USER_PERCEIVED_WALL` when known, `phaseTimingsMs`, avoidable calls, `LSR_AFTER_SNAPSHOT`, `LMR`, verify starts, result/process correctness, throughput gate, failure-family tags, and one short note. Never put source code, credentials, secrets, or large logs into the ledger.

`phaseTimingsMs` has exactly these canonical keys:

```text
bootstrap, caseSetup, acquire, semantic, bundle, apply, verify, recovery, postDone
```

Values are observed milliseconds or `null`. Keep `phaseTimingStatus` as `COMPLETE` only when every materially relevant phase is directly observed; otherwise use `PARTIAL`. Do not estimate missing phase values merely to make the sum resemble the UI wall. Batch review may derive unattributed wall from the resolved UI wall and known timings.

Timing telemetry must not perturb the measured task: do not add timing-only source reads, searches, process starts, polling, or Local calls. Prefer timings already returned by Tool/process telemetry; otherwise record `null`.

The Chat UI wall is often visible only after the assistant finishes. In that case record `userWallSec: null` with `wallStatus: "PENDING_UI"`. If the user later provides the actual UI wall, append one validated `WALL_UPDATE` referencing the prior Decision ID; do not rewrite historical events merely to fill that field.

The ledger is **telemetry/evidence, not protocol/source mutation**. A single validated append through the dedicated writer is therefore exempt from Whole-file Bundle Replacement and Self-hosting regression, and MUST NOT recursively create another Engineering Decision. This exception applies only to append-only throughput telemetry at the path above.

Raw per-turn records are not copied into `SKILL.md` or `validation-evidence.md`. They accumulate for batch analysis. Default evolution window: after **8 completed records with resolved wall time** since the last `BATCH_REVIEW`, or whenever the user explicitly requests review, run one aggregate review of wall-time distribution, repeated failure families, avoidable transaction patterns, phase-timing distribution, unattributed wall, and correctness/process trends. Distill only reusable evidence into references; change canonical rules only when the existing evidence-promotion standard is met. Append a compact validated `BATCH_REVIEW` marker after the review.

A demonstrated safety/correctness invariant may still justify an immediate separate Skill Decision instead of waiting for the batch window.

**EVOLVE** — every task should learn; not every task should modify the Skill.
- one-off or weakly attributed observations stay as evidence;
- repeated or causally clear evidence may become a preference/default;
- demonstrated safety/correctness invariants may justify a HARD RULE;
- any Shared Skill rule/reference/machine-readable change is a new independent Engineering Decision and must self-host through the full Phase Lock;
- prefer replacing/simplifying obsolete rules over accumulating parallel rules;
- keep representative examples/benchmarks/failures in references, not the canonical rule body.

The learning loop must remain cheaper than the waste it is meant to remove.

## Self-hosting regression — HARD RULE

A Skill change is itself a real Engineering Decision. It passes only when both are true:
- **result correctness** — changed files and necessary machine-readable mirrors are internally consistent and verification passes;
- **process correctness** — the route obeyed Phase Lock, scenario/tool rules, whole-file mutation, WIP preservation, and recovery/verification constraints.

Use current Skill files as the primary regression source. Do not hide avoidable calls, harness/transport failures, recovery tax, or user-visible waiting behind an eventual PASS. Preserve pre-existing index/staging state unless explicitly authorized otherwise.

The dedicated `.throughput/ledger.jsonl` append-only telemetry exception above is intentionally excluded from this self-hosting rule to avoid recursive self-modification.

## Core principle

**Use the fewest safe, authoritative evidence transactions needed to finish one Engineering Decision correctly.**

References: `references/tools-and-context.md`, `references/dual-environment.md`, `references/tests-and-long-tasks.md`, `references/metrics-and-antipatterns.md`, `references/validation-evidence.md`, `references/execution-policy.yaml`, `references/project-instructions-v3.md`.
