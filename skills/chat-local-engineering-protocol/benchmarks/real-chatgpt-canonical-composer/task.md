# Clean Replay Task｜26m44 Canonical Composer Case

This is the clean replay of the historical benchmark that previously consumed `26m44s` user wall.

## Execution

1. Before any Local engineering action, use Local Dev to read `/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/SKILL.md` and obey it as the sole protocol owner.
2. Use only `/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/benchmarks/real-chatgpt-canonical-composer` as the benchmark case. Do not choose another case, browse Git history, clone, install, create/copy `node_modules`, or rebuild the environment.
3. ACQUIRE once from `acceptance.md`, `case.json`, `acceptance/upstream-requirement.md`, the 2 measured baseline files, and the 2 read-only dependencies. Do not read the hidden oracle before candidate Apply.
4. Perform real semantic reasoning: understand the requirement, decide the selection seam/behavior, generate complete next-version versions of the 2 measured files, and self-review them.
5. Enter FROZEN. Keep `LSR_AFTER_SNAPSHOT=0` unless the Skill defines a legal reopen trigger.

## Frozen authority — do not reinterpret

`case.json.applyAuthority` is the canonical authority for this extracted replay target. The target is an extracted historical snapshot nested under the workspace, not a standalone Git checkout.

- `baselineCommit` is provenance only; NEVER copy it into `expected-state.head`.
- NEVER substitute the parent workspace HEAD/branch into the target authority.
- Use `case.json.applyAuthority` literally: `head=null`, `branch=null`, plus exact changed-file SHA-256 fingerprints.
- The fingerprints are the source-drift gate for this replay.

## Frozen Control Plane — exact path

After FROZEN, do not read receiver/apply/runner source and do not rediscover runner arguments or internal manifest schema.

Start exactly once:

`/usr/bin/env node /Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/scripts/execute-frozen-decision.mjs`

Wait for `ENVELOPE_READY=<token>` and `chat-local>`.
Then issue exactly one `interact_with_process` payload using this operation-oriented wire grammar:

```text
FILE <token> <CREATE|REPLACE> <repo-relative-path>
<complete next-version file bytes>
END <token>
...repeat FILE/END for every CREATE/REPLACE file...
DELETE <token> <repo-relative-path>   # only when a DELETE mutation exists
EXPECTED <token> <case.json.applyAuthority-json-one-line>
VERIFY <token> <case.json.verificationPlan-json-one-line>
COMMIT <token>
```

Use the operation/path pairs from `case.json.mutations` literally. Paths are relative to `case.json.applyAuthority.repoRoot`, so use `packages/...`, not `target/packages/...`.

**Do not send `MANIFEST`.** The Local receiver derives canonical `chat-local-manifest.v1` mechanically from the FILE/DELETE operations. Model-authored manifest schema is not part of the default Frozen Control Plane.

The envelope contains both complete changed files, their operations, expected state, and verification plan. Target: `DATA_PLANE_PAYLOAD_TRANSACTIONS=1`, `MODEL_AUTHORED_MANIFEST=0`, `LMR=1`, `VERIFY_START=1`.

`chat-local-result>` is the terminal control-return boundary. Once it appears, do not poll merely to wait for process exit. Judge the returned terminal evidence directly.

## Verification

The supplied `case.json.verificationPlan` runs candidate test + hidden oracle together in one Local Node test process. Naming the hidden-oracle path in the verification plan is allowed; reading its source before candidate Apply is forbidden.

If verification fails, use Failure First. Repair from frozen context when sufficient; only a Skill-defined legal reopen trigger permits new source acquisition. Never blind retry.

## Benchmark constraints

- Same business target and same historical parent baseline as the old 26m44 run.
- The target files have been freshly restored from baseline `9d69ad3c84ba76b2cd98c3357e408a1ddbf07249` before this task was handed off.
- Setup preflight is already proven: baseline visible test PASS; baseline hidden oracle FAIL.
- The old hidden-requirement defect is corrected: every required public contract is explicit in `acceptance.md`.
- No patch/unified diff, no direct repo/source edit loop, no chunked `write_file` Data Plane unless the frozen runner is unavailable.
- Do not stage, commit, or clean unrelated WIP.
- User wall gate: `<= 180s`.

Finish with RESULT_CORRECTNESS, PROCESS_CORRECTNESS, THROUGHPUT, `LSR_AFTER_SNAPSHOT`, `LMR`, `VERIFY_START`, `DATA_PLANE_PAYLOAD_TRANSACTIONS`, `MODEL_AUTHORED_MANIFEST`, mechanical model re-entry count, directly observable phase timings, avoidable calls/failure families, and append the required throughput ledger record with `PENDING_UI` wall if needed.
