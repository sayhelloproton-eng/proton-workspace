# Acceptance Run Logging

Every real acceptance automation run has a visible beginning and a visible terminal/handoff record. The ledger improves this Skill in batches; it is not a reason to rewrite protocol text after every run.

Default local-only ledger:

```text
<skill-root>/.runs/ledger.jsonl
```

`.runs/` is intentionally Git-ignored. Raw run evidence must never become a committed Skill artifact.

Use `python3 scripts/append-run-log.py --input -` by default and stream the compact JSON record over stdin. The writer locks concurrent appends, validates capability/routing/behavioral fields, validates uncertain side-effect state, rejects secret-like keys **and embedded secret-like values**, rejects oversized records, and enforces the run-start/terminal pairing contract.

For real Browser-control runs, prefer `python3 scripts/browser-run-boundary.py open|close ...` rather than manually issuing separate logger / Browser-lease / closure-check calls. It preserves the same ledger and lease authorities while compressing stable mechanical steps into one Local transaction per boundary.

## Artifact placement and lifecycle — HARD RULE

`/Users/agent/Desktop/proton-workspace` is a shared workspace root, **not a temporary-file directory**. Acceptance automation must never place run JSON, screenshots, logs, status files, diagnostic scripts, or other runtime artifacts directly in that root. Do not hide violations with `.gitignore`; prevent the wrong path.

Use these owners:

```text
Authoritative run telemetry:
  <skill-root>/.runs/ledger.jsonl

Retained local-only visual/evidence artifacts that are intentionally kept:
  <skill-root>/.runs/artifacts/<runId>/...

Ephemeral acceptance input/intermediate files when stdin is not practical:
  <skill-root>/.runs/tmp/<runId>/...
```

The normal logging path is stdin, so no input file is created at all. If a file input is genuinely required, `append-run-log.py` accepts it only from the controlled acceptance temp root above. After a successful ledger append, the writer deletes that input file and removes now-empty per-run parent directories. If cleanup reports `AUTOMATION_INPUT_CLEANUP=FAIL`, the ledger append is already authoritative: do **not** replay the product action or append the same run event again; remove/reconcile only the residue before returning control.

A screenshot, DOM capture, or other binary/large artifact is not embedded in the ledger. Retain it only when the acceptance contract needs later human/audit inspection, and then place it under `.runs/artifacts/<runId>/`. Otherwise delete it at terminal closure. Large runtime logs remain with their runtime owner or controlled temp path and are referenced only by compact metadata when necessary.

At terminal closure:

```text
ledger record written
→ intended retained artifacts already under .runs/artifacts/<runId>/
→ ephemeral inputs/intermediates removed
→ no acceptance runtime artifact in workspace root
```

## Fast run boundary

Normal real run:

```text
AUTOMATION_START
→ bind fresh evidence window once
→ execute the known path
→ read only decision-relevant fresh evidence
→ AUTOMATION_RUN
```

Browser-control run boundary compression:

```text
open:  browser-run-boundary.py open --mode <shared|exclusive> --input -
close: browser-run-boundary.py close --input -
```

`open` validates and appends the start record, then acquires the Browser lease in the same Local transaction. `close` appends the terminal record, releases the lease, and proves the run is closed in the same Local transaction. If lease acquisition fails before any product action, the helper fail-closes the just-opened run instead of leaving an orphan start.

`AUTOMATION_START` is intentionally cheap. It exists because terminal-only logging can make an entire failed or interrupted run invisible. Its `recordedAt` is the minimum fresh-evidence time boundary. When the run needs `WAIT`, `LISTEN`, `CONNECT`, or `RECOVER`, set `freshEvidenceWindowBound=true` and bind the stable PID/session/log cursor or equivalent owner evidence when available before the first relevant action.

Do not replace this with a broad post-hoc grep. If a service/runtime is not listening, first-divergence evidence is the missing runtime/listener; no log tailer can manufacture heartbeat/events from a process that never ran.

The same `runId` must be used by exactly one start and one terminal `AUTOMATION_RUN`. A terminal event without a prior start fails closed unless it is an explicit historical repair using `retrospectiveReconciliation=true`, a non-empty `evidenceProvenance`, and capability miss `TERMINAL_RUN_LOG_MISSED`.

## Handoff and interruption closure

A user-requested handoff, chat switch, explicit stop, or other return of control does not suspend the run-boundary contract. Before returning control, if this Chat opened an `AUTOMATION_START`, it must append the matching terminal `AUTOMATION_RUN` with the truthful current outcome, failure class, and side-effect state. Use the existing outcome field to describe the handoff/interruption; do not invent a second event type or leave an open start for the next Chat to infer.

If the terminal record was already missed in an earlier Chat, the next Chat must use the documented retrospective-reconciliation path. It must not silently backfill the run as though the terminal event had been written on time. This keeps handoff state mechanical and prevents lost-context recovery from becoming a second source of automation truth.

## Mechanical open-run guard

Use the read-only checker to make run closure mechanical rather than memory-based:

```text
python3 scripts/check-open-runs.py --run-id <runId> --fail-on-open
```

Run it after appending the terminal record and before returning control. Exit `0` proves that the selected run has no unmatched `AUTOMATION_START`; exit `1` means it is still open and this Chat must either append the truthful terminal record or explicitly report why logging cannot be completed. The checker never mutates the ledger and never fabricates an outcome.

For hygiene/audit only, `python3 scripts/check-open-runs.py --project <project>` lists all open historical runs in that project. Historical opens are not automatically owned by the current Chat and must not be silently closed; use retrospective reconciliation only when current authoritative evidence can support it.

## Event types

`AUTOMATION_START` opens a run boundary. `AUTOMATION_RUN` closes it with a terminal or hand-off outcome. `WALL_UPDATE` may later attach user-visible wall time to an existing run. `BATCH_REVIEW` records a compact aggregate review marker.

A useful start record may contain:

```text
runId, project, scenario
acceptanceMode
neededCapabilities
knownPathHit
freshEvidenceWindowBound
```

A useful terminal run record may contain:

```text
runId, project, scenario, outcome
resultCorrectness, processCorrectness
automationWallSec, userWallSec, wallStatus
acceptanceMode, failureClass, sideEffectState
canonicalPaths, scripts
toolCalls, avoidableCalls, pollCalls, toolSwitches
checkpointReused, checkpointAdvanced, firstDivergence, authorityResult
freshEvidenceWindowUsed
failureFamilies
```

Capability-oriented fields are optional for backward compatibility but should be present when naturally known:

```text
neededCapabilities
usedCapabilities
capabilityMisses
knownPathHit
minimumSufficientProof
eyesUsedWhenVisible
```

## Acceptance mode, failure class, side-effect state

`acceptanceMode`:

```text
DIRECT | SAME_SCENE | FAST_REPLAY | FULL_FRESH
```

`failureClass`:

```text
NONE
HUMAN_EXTERNAL
PREREQUISITE_NOT_READY
HARNESS_FAILURE
TOOL_RUNTIME_FAILURE
PRODUCT_DEFECT
SPEC_EXTERNAL_MISMATCH
CONTEXT_KNOWLEDGE_MIGRATION_GAP
UNKNOWN
```

`sideEffectState` is orthogonal to failure class:

```text
NOT_APPLICABLE | APPLIED | NOT_APPLIED | UNKNOWN
```

A command can fail while `sideEffectState=APPLIED`; a transport timeout can leave `sideEffectState=UNKNOWN`. Do not use `failureClass` to guess physical effect truth.

## Capability misses

Use short reusable codes, not essays. Current common codes:

- `DID_NOT_USE_EYES_FIRST`
- `IDENTITY_NOT_VERIFIED`
- `DID_NOT_REUSE_KNOWN_PATH`
- `CHECKPOINT_NOT_REUSED`
- `CHECKPOINT_NOT_SAVED`
- `BLIND_RETRY`
- `EXCESS_PROOF`
- `UNNECESSARY_TOOL_SWITCH`
- `MODEL_POLLING_TAX`
- `MISSED_FIRST_DIVERGENCE`
- `WRONG_ACCEPTANCE_MODE`
- `MISCLASSIFIED_HARNESS_OR_TOOL_FAILURE`
- `DUPLICATED_PRODUCT_RESOURCE`
- `STALE_EVIDENCE_USED`
- `TIMEOUT_INFLATION`
- `CONNECT_MISCLASSIFIED`
- `OBSERVATION_MUTATED_STATE`
- `SIDE_EFFECT_NOT_RECONCILED`
- `SECOND_AUTOMATION_TRUTH_USED`
- `FRESH_EVIDENCE_WINDOW_NOT_BOUND`
- `TERMINAL_RUN_LOG_MISSED`
- `POST_HOC_LOG_RECONSTRUCTION`

## Retrospective repair

Retrospective reconciliation exists only to repair a previously missed terminal record from current authoritative evidence. It must not be used as a convenience path for new runs.

Required terminal fields when `retrospectiveReconciliation=true`:

```text
evidenceProvenance    # short description of the authority used
capabilityMisses      # must include TERMINAL_RUN_LOG_MISSED
```

If historical evidence cannot distinguish `APPLIED | NOT_APPLIED | UNKNOWN`, preserve `UNKNOWN`. Do not backdate `recordedAt`; the ledger must show when the reconstruction was actually written.

## Privacy and size

Never log token, secret, password, credential, Authorization data, API keys, copied auth values, source code, full stdout/stderr, screenshots, or large logs. The writer rejects secret-bearing field names and common embedded forms such as `Bearer ...`, `TOKEN=...`, or secret-bearing URL query parameters. It fails closed rather than redacting an event whose safety is ambiguous.

A single serialized event must remain at or below 16 KiB.

## Behavioral self-test telemetry

Optional fields:

```text
testLayer          # L0 | L1 | L2 | L3
harnessValidity    # VALID | INVALID | NOT_APPLICABLE
behavioralVerdict  # PASS | PASS_WITH_MISS | FAIL | INVALID | NOT_APPLICABLE
```

For L2, `harnessValidity` and `behavioralVerdict` are required. `harnessValidity=INVALID` requires `behavioralVerdict=INVALID`; an `INVALID` verdict is not allowed with a valid harness. These are executable writer constraints, not documentation-only conventions.

Useful behavioral miss codes include:

- `OVER_ROUTED_CAPABILITY`
- `HARNESS_CONTEXT_INCOMPLETE`
- `MULTI_BROWSER_OWNER_CONFLICT`
- `RUNTIME_READY_CONTROL_NOT_READY`

Invalid harness samples may document testing infrastructure failures, but they must not be aggregated as model-quality failures or used to justify routing-rule changes.

## Batch improvement

Do not edit the Skill after every run. Default review window: after **8 completed comparable runs with resolved wall time**, or when the user explicitly asks for review.

Batch review compares acceptance-mode selection, failure classification, side-effect reconciliation, needed vs used capabilities, known-path hit rate, eyes/minimum-proof behavior, repeated misses, avoidable calls/switches/polls, checkpoint reuse/advancement, first-divergence quality, fresh-evidence-window discipline, start/terminal pairing, harness overhead, result/process correctness, and user wall time.

A `BATCH_REVIEW` analyzes evidence; it does not authorize a rewrite. Use [skill-evolution.md](skill-evolution.md) for promotion/placement and MAINLINE-FIRST discipline.
