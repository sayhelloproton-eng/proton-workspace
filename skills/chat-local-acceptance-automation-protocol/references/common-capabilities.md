# Common Automation Capabilities

This is the project-independent capability map for ChatGPT Chat acceptance work. Start from **what the tester needs now**, never from a favorite tool.

## Capability loop

```text
SEE(read-only by default) → IDENTIFY → ACT only if required → SEE
                                     ↓
                            reconcile if uncertain

WAIT / LISTEN support asynchronous facts.
CONNECT / AUTHENTICATE restore access.
RECOVER preserves the existing scene/effect evidence.
VERIFY closes only contract-required proof.
A proven step becomes a reusable CHECKPOINT.
```

## Capability matrix

| Capability | Use when | Preferred implementation | Minimum sufficient proof |
|---|---|---|---|
| `SEE` | current result/state is observable | Web DOM/snapshot first; screenshot for visual/geometry/error surface; privileged/native screenshot + AX | current surface answers the question without hidden mutation |
| `IDENTIFY` | a target will be read/mutated | URL/title/content, DOM/AX semantics, current bounds, exact process/resource/business identity | target is uniquely tied to intended owner |
| `ACT` | one user-equivalent mutation is required | canonical helper/tool; Playwright Web; AX/system input privileged/native | dispatch known, then immediate reality readback/reconciliation |
| `WAIT` | next decision depends on async state | explicit condition/event/process completion | condition reached or bounded timeout/UNKNOWN |
| `LISTEN` | non-visual runtime evidence matters | stdout/stderr/log/Console/Network/event stream | relevant fresh bounded evidence |
| `CONNECT` | real surface cannot be reached/controlled | existing canonical runtime/relay/context | transport + actual target control proven |
| `AUTHENTICATE` | real flow needs login/consent | keep owning CLI/PTTY transaction; Browser only for its auth surface | owning authority confirms auth |
| `RECOVER` | prior action timed out/disconnected | original PID/session/PTTY/tab/checkpoint + durable effect first | prior effect classified without duplicate mutation |
| `VERIFY` | decide PASS/FAIL/continue | current user reality + exact non-visible owner only when contract requires | complete contract proof, no unrelated evidence |

## Cross-capability invariants

**EYES-FIRST is not screenshot-everywhere.** Use the cheapest authoritative current surface. Semantic DOM/snapshot is usually best for ordinary Web facts; screenshot is required when pixels/layout/visual status/geometry matter; privileged/native UI normally uses screenshot + AX.

**Observation is read-only by default.** `SEE` must not casually scroll, focus, reveal, click, type, dismiss, or navigate merely to inspect. State-changing observation is `ACT` and must be treated as such.

**Identity is not position.** Card order, tab index, stale coordinates, global AX order, PID coincidence, matching display text alone, controlled-group membership, or relay/session identity cannot authorize destructive mutation.

**Action is not outcome.** Click/keypress/API/helper/exit-0 proves dispatch only. Observe the expected state change next.

**Uncertain mutation requires reconciliation.** Transport/command failure is not `NOT_APPLIED`. Read the durable owner/external postcondition and classify `APPLIED`, `NOT_APPLIED`, or `UNKNOWN`; only proven `NOT_APPLIED` can become retry-eligible.

**Checkpoint after proof.** Save enough proven state to resume; do not create a second history store.

**First divergence wins.** Once the earliest mismatch is proven, stop downstream speculative actions and route to that owner.

**Fresh evidence beats historical residue.** Bind logs/errors/events to current run/time/PID/cursor before attributing them.

**Recover before recreate.** Original PID/session/tab/PTTY/auth transaction/checkpoint is valuable state.

**Known helper freeze.** Unexpected output reopens observation/diagnosis, not a second Swift/AX/AppleScript/CDP/PTY path.

**User path integrity.** Internal injection may diagnose; Acceptance PASS must return to the public user/product path.

**Reality is expensive evidence.** Use it to establish scene, first divergence, and final proof—not as an unlimited debugger.

## Stage boundary

Read-only `SEE/IDENTIFY` can establish a failing proof before Engineering. Mutating Acceptance / replay / E2E is a stage gate after implementation is frozen and Engineering verification is stable, unless Acceptance itself is the explicit work stage.

A proven product defect means: checkpoint → Engineering Repair Stage → Engineering Stage Verify → return to `SAME_SCENE` / `FAST_REPLAY`.

## Async rule

**Wait for facts, not time; work before status.** Starting an async operation does not authorize an immediate PID/status check.

```text
start/bind authority once
→ plan current eligible work
→ execute to exhaustion
→ proactively replan downstream gate-safe work
→ only when the work pool remains empty: inspect terminal authority
→ PID/session only if terminal authority cannot decide
→ RUNNING/UNKNOWN: mandatory replan + more meaningful work
→ return only after exhaustive replanning finds no safe relevant work
```

If the result is still unresolved after a permitted readback, that readback is a **replan trigger**, not a return trigger. Any later readback for the same authority requires an intervening meaningful work cycle; never create a model-managed “still running?” loop. Bounded condition/event waiting is allowed only when all eligible work has been exhausted and the next decision truly depends on that fact.

## Acceptance mode routing

| Mode | Default use | Must not do |
|---|---|---|
| `DIRECT` | one bounded fact | expand into full journey without evidence |
| `SAME_SCENE` | exact failed scene/checkpoint after repair/recovery | restart already-proven steps |
| `FAST_REPLAY` | affected gate + required downstream behavior | redo unrelated setup/Fresh work |
| `FULL_FRESH` | explicit from-zero/stage-final/release proof | become default debugging loop |

## Failure routing

- `HUMAN_EXTERNAL`: unavoidable human consent/2FA/CAPTCHA incomplete.
- `PREREQUISITE_NOT_READY`: legitimate dependency has not established the fact.
- `HARNESS_FAILURE`: automation matcher/locator/focus/runner wrong while product truth is not disproven.
- `TOOL_RUNTIME_FAILURE`: MCP/relay/browser-control/runtime unavailable.
- `PRODUCT_DEFECT`: public/frozen product behavior violates the contract.
- `SPEC_EXTERNAL_MISMATCH`: frozen contract/owner assumption conflicts with external reality; stop for decision.
- `CONTEXT_KNOWLEDGE_MIGRATION_GAP`: required automation knowledge exists only in non-authoritative history/project material.
- `UNKNOWN`: evidence insufficient; preserve state and gather only the next resolving authority.

Capability = what action is needed. Failure class = why the route is blocked.

## Tool mapping

- Playwright Chrome: ordinary Web `SEE/IDENTIFY/ACT/VERIFY`, Console/Network `LISTEN`.
- macOS AX + screenshot: privileged/native `SEE/IDENTIFY`; system input only when real `ACT` is required.
- Local Dev: local CLI `ACT`, process/file/runtime `IDENTIFY`, `WAIT/LISTEN`, owner `VERIFY`.
- PTY/expect: deterministic interactive CLI `ACT/WAIT/LISTEN`.
- `/Users/agent/Desktop/proton-workspace/scripts/gptweb-mcp`: canonical shared MCP lifecycle for `CONNECT/RECOVER`.
- ProFlow Microsoft Dev Tunnel lifecycle/auth: installed npm package `@tomflow/proflow-dev-tunnel` via model-facing `automation/proflow-maintenance/proflow-dev-tunnel-ready.mjs`, which delegates only to `node_modules/.bin/proflow-dev-tunnel reconcile --workspace <workspace> --json`.

Script promotion/anti-wrapper policy is owned only by [skill-evolution.md](skill-evolution.md).
