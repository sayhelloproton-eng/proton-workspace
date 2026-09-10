# Validation Baseline

This reference defines how to validate this Skill without turning Skill-testing into a larger project than the acceptance work it exists to accelerate.

## Four layers

### L0 — structural / deterministic gate

Canonical entrypoint for every Skill change:

```text
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-skill.py
```

`validate-skill.py` owns the mechanical L0 sequence: current skill-creator structural validation, `validate-baseline.py`, Python syntax compilation without repository bytecode generation, `git diff --check`, and Git-ignore hygiene for `.runs/` / `__pycache__`.

Do not manually rediscover the skill-creator path or run `py_compile` in a way that leaves `__pycache__` under the Skill.

### L1 — scenario contract regression

`references/lost-context-regression.md` owns R1-R23. `scripts/validate-baseline.py` mechanically proves required scenario/routing/ownership anchors and runs functional logger guard probes. L1 proves protocol consistency, not model behavior.

### L2 — fresh-chat behavioral smoke

Use a genuinely new/temporary Chat with no historical conversation dependency. The representative set is B1-B8, but normal edits run only affected B cases; do not rerun every synthetic case after every wording change.

For each smoke case, return only the scoring contract: capabilities, first action/evidence, authority, acceptance mode, failure class, side-effect state when relevant, minimum proof, recovery, and do-not-repeat behavior.

### L3 — real acceptance evidence

Real project acceptance runs are the primary long-term evolution source. Synthetic smoke catches routing regressions; it must not dominate engineering time. Accumulate valid `AUTOMATION_RUN` telemetry and improve the Skill in evidence-driven batches.

## Harness validity — HARD GATE

A behavioral sample is `VALID` only when all applicable conditions hold:

- the fresh Chat receives the complete current `SKILL.md`;
- every conditional Skill reference required by the scenario is available;
- project-specific questions include current product facts/spec/current-state authority, plus any applicable Skill-owned project reference;
- no hidden expected answer, failure class, mode, or side-effect state is leaked into the prompt;
- the Chat has no historical conversation dependency;
- the automation conducting the test can reliably deliver and read the sample.

If any condition is missing, use `harnessValidity=INVALID` and `behavioralVerdict=INVALID`. The writer enforces this relationship. Invalid samples remain harness evidence but are not model failures or Skill regressions.

A Browser-dependent smoke is invalid if Browser control cannot reliably deliver/read the prompt or result. `runtime READY` alone is insufficient.

## Behavioral verdict

```text
PASS            correct route with minimum-sufficient cognition/evidence
PASS_WITH_MISS  safe/correct route but avoidable over-routing or excess evidence
FAIL            wrong authority/mode/class, unsafe retry, duplicate mutation/resource, missed first divergence, or second automation truth
INVALID         harness contract was not satisfied
```

## Baseline completion rule

A release-quality protocol baseline requires L0 + L1 PASS. L2 should have recent representative evidence when the behavioral harness is healthy; a broken L2 harness is `INVALID/BLOCKED`, not a reason to mutate rules. L3 real runs continuously supersede synthetic confidence.

## Deterministic guard coverage

`validate-baseline.py` must mechanically catch at least:

```text
missing hard-rule/reference/scenario wiring
project automation promoted outside the single Skill truth
invalid behavioral field combinations
unknown failure/mode/side-effect enums
secret-like field names
secret-like values embedded in free-text fields
missing Git-ignore hygiene
script-promotion duplicate owner
```

A green baseline that accepts one of these negative probes is itself a validation defect.

## Single-source regression

The test suite must preserve `SINGLE-AUTOMATION-SOURCE-OF-TRUTH`: project material may supply product truth/facts, but active automation mechanics live only in this Skill. Lost-context R23 is the semantic regression for conflicting project automation instructions.

## Evolution governance regression

Every Skill mutation preserves the route to `references/skill-evolution.md`, including MAINLINE-FIRST, one semantic owner, evidence promotion, script promotion, and anti-bloat constraints.
