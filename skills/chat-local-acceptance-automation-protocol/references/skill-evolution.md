# Skill Evolution and Organization

This reference is the maintenance contract for simplifying/evolving the single Acceptance automation truth without losing information density or hijacking product work.

## Maintenance entry contract

Changing this Skill is Local engineering. First load current `chat-local-engineering-protocol`, then read current Acceptance `SKILL.md`, this reference, and only the minimum references/evidence needed.

Authority order:

```text
current Local Acceptance Skill + deterministic validation
→ fresh valid real acceptance evidence / compact telemetry
→ current project Formal Spec/runtime/current-state facts
→ legacy project docs / handoff / chat as migration evidence only
```

## MAINLINE-FIRST — HARD MAINTENANCE RULE

Method work must not hijack the user’s real product goal.

```text
MAINLINE EXECUTION
→ capture reusable evidence
→ only fix Skill/Harness immediately when safe continuation is blocked or an invariant is proven
→ close the mainline gate
→ batch-review evidence
→ evolve the single owner only when justified
```

## Information-preserving simplification — HARD RULE

“做减法” means **remove duplication and move detail to its one canonical owner**, not delete semantics.

Before deleting or compressing guidance, every removed semantic unit must satisfy one of:

```text
MOVED_TO_CANONICAL_OWNER
MERGED_WITH_EQUIVALENT_RULE
OBSOLETE_AND_PROVEN_UNNEEDED
```

If none applies, do not delete it.

Main `SKILL.md` should contain high-frequency priority/order/HARD RULE routing only. Detailed mechanics, edge cases, examples, telemetry schemas and incidents live in conditional references/scripts/evidence.

When a baseline commit/snapshot exists, compare the changed Skill tree against it after mutation and audit:
- HARD RULE preserved or intentionally replaced;
- one canonical owner for each semantic rule;
- scripts/validators still enforce current semantics;
- no information capability lost merely to reduce line count;
- new priority order is actually visible in the always-loaded main Skill.

## Evolution loop

```text
OBSERVE → CLASSIFY → PLACE → PROMOTE → MUTATE → VALIDATE → LEARN
```

- **OBSERVE** concrete run result, repeated pattern, invariant, or explicit user design decision.
- **CLASSIFY** common rule, project-specific automation, product fact, harness issue, deterministic mechanic, telemetry issue, or noise.
- **PLACE** choose exactly one canonical owner.
- **PROMOTE** decide whether evidence deserves durable guidance.
- **MUTATE** use Engineering whole-file control plane.
- **VALIDATE** only after the complete Skill change set is applied; do not validate file-by-file while editing.
- **LEARN** preserve compact evidence and stop until new evidence justifies another iteration.

## Evidence promotion gate

- One ordinary run/weak timeout/miss → telemetry/evidence only.
- Repeated comparable miss or causally clear cross-project finding → common reference/routing candidate.
- Demonstrated safety/correctness invariant → HARD RULE allowed.
- Stable non-generalizable project Acceptance automation → narrow project reference or canonical workspace automation owner.
- Product Formal Spec/business identity/current product state → remain project truth.
- `HARNESS_INVALID` → fix harness mechanics, not model routing.
- `UNKNOWN` without proven owner → no Skill mutation.

Default aggregate review: after 8 completed comparable runs with resolved wall time, or explicit user request.

## Canonical placement map

| Content | Canonical owner |
|---|---|
| High-frequency priority / HARD RULE / top routing | `SKILL.md` |
| Capability definitions / tool mapping | `references/common-capabilities.md` |
| Browser/native UI/EYES mechanics | `references/browser-and-system-ui.md` |
| CLI/PTTY/process/wait mechanics | `references/cli-pty-and-process.md` |
| MCP runtime/Browser connection/auth | `references/tool-runtime-and-auth.md` |
| Validation layers/harness scoring | `references/validation-baseline.md` |
| Lost-context synthetic scenarios | `references/lost-context-regression.md` |
| Telemetry schema/miss codes/batch metrics | `references/run-logging.md` |
| Skill organization/evidence/script promotion | `references/skill-evolution.md` |
| Stable non-generalizable project knowledge | `references/projects/<project>.md` only when required |
| Deterministic Skill-owned mechanics | `scripts/` |
| Cross-Skill/workspace stable deterministic workflow | workspace `automation/` |
| Discovery metadata | `agents/openai.yaml` |
| Raw run evidence | local-only `.runs/ledger.jsonl` |
| Product contract/current business truth | project Formal Spec/current mechanical authority |

A rule has one semantic owner. Links may point to it; other files must not maintain a competing version.

## Anti-bloat and deduplication

Prefer replace/merge/move over accumulation. Keep main `SKILL.md` small enough that priority is obvious before edge cases. Raw incidents and large logs never enter canonical rule text.

Do not create eager project-profile catalogs, README/changelog/history files merely to narrate evolution, or a second orchestration platform inside the Skill.

## Script promotion gate — SOLE OWNER

Promote a mechanic into `scripts/` only when all applicable conditions hold:

```text
repeated or strongly justified deterministic mechanic
+ stable inputs/actions/results
+ mechanically decidable PASS/FAIL/UNKNOWN
+ fail-closed mutation boundary where relevant
+ reduces model cognition / avoidable transactions
+ directly testable without product-specific state injection
```

Never create a wrapper that only renames an authoritative tool. Cross-project service lifecycle/multi-step runtime workflows that exist independently of this Skill belong in workspace `automation/`, not hidden in Skill scripts.

Current justified Skill scripts include `append-run-log.py`, `browser-usage-guard.py`, `check-open-runs.py`, `validate-baseline.py`, and `validate-skill.py` because they enforce Skill-owned protocol/coordination/validation semantics.

## Future-Chat maintenance procedure

1. Load current Engineering Skill.
2. Read current Acceptance `SKILL.md`, this reference, and minimum relevant owner files in one batch.
3. State one Engineering Decision: canonical owner changes, obsolete duplication removed, exact behavior preserved/changed, verification plan.
4. Freeze scope; no history browsing for reassurance.
5. Apply the **complete** change set first; preserve unrelated WIP.
6. Only after the Skill stage is complete, run `PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-skill.py` and only affected behavioral/direct tests if required. No file-by-file validate/edit loop.
7. If validation fails, capture the failure set, open one Repair Stage, repair completely, then validate again.
8. Compare against the pre-change baseline when available and audit semantic retention/density.
9. Record compact throughput/evidence and report unresolved misses.

## Batch-review procedure

A `BATCH_REVIEW` analyzes comparable valid runs; it does not authorize a rewrite. Inspect result/process correctness, wall time, acceptance-mode choice, failure class, side-effect reconciliation, first divergence, checkpoint reuse, known-path hit, unnecessary polling/tool switches, and harness invalidity.

For every candidate choose one:

```text
KEEP_AS_EVIDENCE
PROJECT_REFERENCE_UPDATE
REFERENCE_UPDATE
HARD_RULE_UPDATE
SCRIPT_PROMOTION
TEST_HARNESS_UPDATE
TELEMETRY_UPDATE
REMOVE_OR_MERGE_EXISTING_GUIDANCE
```

Prefer the smallest action preventing the repeated failure. A batch with no reusable finding produces no Skill mutation.

## Maintenance handoff

Leave only compact current-state facts:

```text
CURRENT_BASELINE
EVIDENCE_PROMOTED
CANONICAL_OWNERS_CHANGED
VALIDATION_RESULT
UNRESOLVED_MISSES
NEXT_REVIEW_TRIGGER
GIT_STATE
```

Do not force the next Chat to reconstruct current automation truth from old conversations/project-local SOPs.
