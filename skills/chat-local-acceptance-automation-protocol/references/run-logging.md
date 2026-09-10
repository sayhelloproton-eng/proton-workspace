# Acceptance Run Logging

Every acceptance automation run reaching a terminal or hand-off outcome appends one compact JSONL event. The ledger improves this Skill in batches; it is not a reason to rewrite protocol text after every run.

Default local-only ledger:

```text
<skill-root>/.runs/ledger.jsonl
```

`.runs/` is intentionally Git-ignored. Raw run evidence must never become a committed Skill artifact.

Use `python3 scripts/append-run-log.py --input <result.json>`. The writer locks concurrent appends, validates capability/routing/behavioral fields, validates uncertain side-effect state, rejects secret-like keys **and embedded secret-like values**, and rejects oversized records.

## Event types

`AUTOMATION_RUN` is the default. `WALL_UPDATE` may later attach user-visible wall time to an existing run. `BATCH_REVIEW` records a compact aggregate review marker.

A useful run record may contain:

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

Batch review compares acceptance-mode selection, failure classification, side-effect reconciliation, needed vs used capabilities, known-path hit rate, eyes/minimum-proof behavior, repeated misses, avoidable calls/switches/polls, checkpoint reuse/advancement, first-divergence quality, fresh-evidence-window discipline, harness overhead, result/process correctness, and user wall time.

A `BATCH_REVIEW` analyzes evidence; it does not authorize a rewrite. Use [skill-evolution.md](skill-evolution.md) for promotion/placement and MAINLINE-FIRST discipline.
