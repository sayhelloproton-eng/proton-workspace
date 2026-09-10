# Skill Evolution and Organization

This reference is the maintenance contract for future Chats that organize, simplify, or evolve the single Acceptance automation truth. It prevents real-run evidence from becoming an incident notebook or being split back into project-local protocols.

## Maintenance entry contract

Changing this Skill is Local engineering. Before any mutation, load the current local `chat-local-engineering-protocol`, then read current `SKILL.md`, this reference, and only the references/evidence needed for the proposed change.

Authority order for automation maintenance:

```text
current Local Acceptance Skill + deterministic validation
→ fresh valid real acceptance evidence / compact telemetry
→ current project Formal Spec/runtime/current-state facts as product evidence
→ legacy project automation docs / historical handoff/chat as migration evidence only
```

Historical/project automation text never overrides this Skill merely because it is more detailed or repeated more often.

## MAINLINE-FIRST — HARD MAINTENANCE RULE

Method work must not hijack the user's real acceptance goal.

```text
MAINLINE EXECUTION
→ capture counterexample / metric / candidate learning
→ only repair Skill/Harness immediately when it blocks safe continuation or proves a safety/correctness invariant
→ close the current mainline gate
→ review reusable evidence in batch
→ evolve the single owner only when promotion is justified
```

A useful improvement idea is not permission to stop a real product journey and redesign the Skill.

## Evolution loop

```text
OBSERVE → CLASSIFY → PLACE → PROMOTE → MUTATE → VALIDATE → LEARN
```

- **OBSERVE** — concrete run result, valid batch pattern, demonstrated invariant, or explicit user design decision.
- **CLASSIFY** — common rule, project-specific automation, product fact, harness issue, deterministic-mechanic candidate, telemetry issue, or noise.
- **PLACE** — choose exactly one canonical owner inside this Skill for automation semantics.
- **PROMOTE** — decide whether evidence is durable enough to leave telemetry/history.
- **MUTATE** — use the Engineering Skill's whole-file control plane.
- **VALIDATE** — run canonical L0/L1 and only affected behavioral/direct tests.
- **LEARN** — preserve compact evidence and next review trigger; do not immediately start another rewrite without new evidence.

## Evidence promotion gate

Use the smallest durable layer justified by evidence:

- One ordinary run, unusual timeout, or weakly attributed miss → local `.runs/ledger.jsonl` / project evidence only.
- Repeated comparable misses or causally clear cross-project finding → common reference/routing candidate.
- Demonstrated safety/correctness invariant → may justify immediate HARD RULE.
- Stable project-specific acceptance automation that cannot generalize → narrow Skill-owned project reference, created only when real evidence requires it.
- Product Formal Spec, current product state, business/resource identity → remain project product truth; do not copy them into the Skill unless a small reference is necessary to name an automation target safely.
- `HARNESS_INVALID` → improve testing mechanics, not model routing.
- `UNKNOWN` without proven owner/cause → no Skill mutation.

Default aggregate review: after 8 completed comparable runs with resolved wall time, or explicit user request.

## Canonical placement map

| Content | Canonical owner |
|---|---|
| High-frequency cross-project HARD RULE / top routing | `SKILL.md` |
| Capability definitions / tool mapping | `references/common-capabilities.md` |
| Browser/native UI mechanics | `references/browser-and-system-ui.md` |
| CLI/PTTY/process/wait mechanics | `references/cli-pty-and-process.md` |
| MCP runtime, Browser connection, auth | `references/tool-runtime-and-auth.md` |
| Test layers, harness validity, scoring | `references/validation-baseline.md` |
| Synthetic lost-context scenarios | `references/lost-context-regression.md` |
| Telemetry schema, miss codes, batch metrics | `references/run-logging.md` |
| Skill organization / evidence and script promotion | `references/skill-evolution.md` |
| Stable non-generalizable project acceptance automation | `references/projects/<project>.md` only when needed |
| Deterministic automation mechanics | `scripts/` |
| Discovery metadata | `agents/openai.yaml` |
| Raw run evidence | local-only `.runs/ledger.jsonl` |
| Product contract/current business truth | project Formal Spec/current mechanical authority; input only, not automation protocol |

A rule has one semantic owner. Other Skill files may link to that owner but should not restate a competing version. Project repositories may point to this Skill but do not own an alternate automation SOP.

## Anti-bloat and deduplication

Before adding text, ask whether an existing rule/reference can be clarified, replaced, merged, or deleted. Prefer replacement over accumulation.

Keep `SKILL.md` as the small always-loaded router/invariant set. Detailed mechanics and conditional knowledge belong in references. Raw incidents and long logs never belong in canonical rule text.

Do not create an eager project-profile catalog. A `references/projects/<project>.md` file is allowed only when a real stable project-specific automation path cannot safely be represented by common rules + current product facts; it must remain narrow and conditional.

Do not grow this Skill into an acceptance runtime, state database, compiler, policy engine, or second orchestration platform. Scripts hide stable mechanics; they do not own product workflow state.

Do not create README/changelog/history files merely to narrate Skill evolution. Current canonical files plus local compact ledgers are the authority.

## Script promotion gate — SOLE OWNER

Promote a mechanic into `scripts/` only when all applicable conditions are true:

```text
repeated or strongly justified deterministic mechanic
+ stable inputs/actions/results
+ mechanically decidable PASS/FAIL/UNKNOWN
+ fail-closed safety boundary where mutation exists
+ reduces model cognition or avoidable tool transactions
+ can be directly validated without product-specific state injection
```

Project-independent scripts are preferred. A project-specific script belongs here only when it is genuinely acceptance automation rather than product implementation and centralizing it avoids a competing project automation truth.

Never create a wrapper that only renames an authoritative tool.

Current decisions:

- no generic wrapper around Playwright, AX, Local Dev, PTY, or `gptweb-mcp` merely for naming consistency;
- `append-run-log.py` is justified by locking/schema/privacy enforcement;
- `validate-baseline.py` is justified by deterministic semantic/negative regression probes;
- `validate-skill.py` is justified as the single executable L0 entrypoint, replacing repeated validator-path/PyYAML/pycache orchestration by the model.

When a script is promoted, its public contract states input, result semantics, authority, failure/UNKNOWN behavior, and secret/privacy boundary.

## Future-Chat maintenance procedure

1. Load current local Engineering Skill before local action.
2. Read current `SKILL.md`, this reference, and minimum relevant references/evidence in one batch when paths are known.
3. State one Engineering Decision: evidence promoted, canonical owner files, behavior change, obsolete/duplicate guidance replaced, and targeted verification.
4. Freeze scope; do not browse history for reassurance.
5. Apply complete next-version files through the current Engineering control plane; preserve unrelated WIP and do not stage/commit without authorization.
6. Run `PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-skill.py`. Run only affected L2 behavioral cases when routing/model behavior changed and the harness is valid. Directly test changed scripts when the canonical validator does not already exercise their contract. L3 real runs remain primary evidence.
7. If verification exposes a frozen-context defect, repair as the same decision; redesign only if new evidence changes the decision.
8. Record compact engineering throughput evidence and applicable acceptance/batch evidence. Report unresolved misses and next evidence trigger.

## Batch-review procedure

A `BATCH_REVIEW` is analysis, not permission to rewrite everything. Aggregate only comparable valid runs and inspect result/process correctness, wall time, acceptance-mode selection, failure classification, side-effect reconciliation, capability misses, first divergence, checkpoint reuse, known-path hit rate, unnecessary polling/tool switches, and harness invalidity.

For every candidate change, choose one:

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

Do not require the next Chat to reconstruct current automation truth from old conversations or project-local automation documents. If durable automation knowledge exists only there, migrate it into this Skill or leave it explicitly non-authoritative.
