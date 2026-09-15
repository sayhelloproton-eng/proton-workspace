# Common Automation Capabilities

This is the project-independent capability map for ChatGPT Chat acceptance work. Start from **what a tester needs to do**, not from a favorite tool. This file owns capability semantics; project-specific product facts do not redefine them.

## Capability loop

```text
SEE(read-only by default) → IDENTIFY → ACT → SEE
                                  ↓
                         reconcile if uncertain

WAIT / LISTEN support asynchronous work.
CONNECT / AUTHENTICATE restore access to the real surface.
RECOVER preserves the existing scene and uncertain-effect evidence.
VERIFY closes only the proof required by the acceptance contract.
A proven step becomes a reusable CHECKPOINT before moving on.
```

Capabilities may compose, but the model should invoke the smallest set needed for the next decision.

## Capability matrix

| Capability | Use when | Preferred implementation | Minimum sufficient proof |
|---|---|---|---|
| `SEE` | current result/state is observable | attachable Web: DOM/snapshot first, page screenshot when pixels/layout/visual status matter; privileged/native: fresh screenshot + AX as needed | current surface answers the question without hidden mutation |
| `IDENTIFY` | a target will be read or mutated | URL/title/content, DOM/AX label, current bounds, PID/process ownership, exact file/resource/business identity | target is uniquely tied to intended owner |
| `ACT` | one real user-equivalent mutation is required | existing canonical helper/tool; Playwright for attachable Web; AX/system input for privileged/native | dispatch is known; outcome is then observed/reconciled |
| `WAIT` | state changes asynchronously | explicit condition/event/process completion; low-frequency bounded observation only when necessary | condition reached or bounded timeout/UNKNOWN |
| `LISTEN` | non-visual runtime evidence matters | stdout/stderr, process log, Console/Network, event stream | relevant fresh evidence, preserving partial output |
| `CONNECT` | automation cannot reach/control the surface | existing runtime/relay/controlled-context path | transport + actual target control both proven |
| `AUTHENTICATE` | real flow requires login/consent | keep owning CLI/PTTY transaction; Browser for ordinary auth; user only for unavoidable human factors | owning authority confirms authenticated state |
| `RECOVER` | prior action timed out/disconnected/failed | original PID/session/PTTY/tab/auth/checkpoint and durable postcondition first | prior state/effect classified without duplicate mutation |
| `VERIFY` | decide PASS/FAIL/continue | current user reality plus exact owner/runtime authority only when required | all contract-required proof, no unrelated evidence |

## Cross-capability invariants

**EYES-FIRST is not screenshot-everywhere.** On ordinary attachable Web, semantic DOM/snapshot state is usually cheaper and more precise; use screenshot when the acceptance fact is visual, geometric, pixel-level, or structure is insufficient. On privileged/native UI, screenshot + AX is the normal eyes path.

**Observation is read-only by default.** `SEE` must not casually scroll, focus, reveal, click, type, or otherwise change the tested state merely to inspect it. If observation requires a state-changing interaction, declare it as `ACT`, preserve identity, and verify its effect.

**Identity is not position.** Card order, tab index, stale coordinates, global AX order, PID coincidence, matching display text alone, controlled-group membership, or relay/session identity cannot authorize destructive mutation or replace durable business identity.

**Action is not outcome.** Click/keypress/AXPress/API/helper/exit-0 proves dispatch only. Observe the expected state change and use a second authority only when the acceptance fact requires it.

**Uncertain mutation requires reconciliation.** Command/transport failure is not proof of `NOT_APPLIED`. Read a durable postcondition from the owning/external authority and classify `APPLIED`, `NOT_APPLIED`, or `UNKNOWN`. Only mechanically proven `NOT_APPLIED` can make retry eligible, subject to the real contract.

**Checkpoint after proof.** Preserve a meaningful proven step through the current product-state authority before advancing. The checkpoint contains enough to resume, not a second copy of full logs/history.

**Wait for conditions, not time.** Prefer explicit UI state, event, PID completion, port/readiness, or log marker over model-managed sleep/poll loops.

**Timeout is not a fix.** Increase a budget only when current authority/progress evidence shows the same correct operation is legitimately slow; never hide first divergence, wrong owner, dead process, or harness failure.

**Fresh evidence beats historical residue.** Bind diagnosis to a current run identity/time/log offset or bounded reproduction window before attributing persistent logs, error pages, badges, Console history, or event streams.

**Preserve evidence on timeout.** Partial stdout/stderr/log/UI state remains evidence. Consume it before fallback. Non-idempotent `UNKNOWN` requires reconciliation before any retry.

**Recover before recreate.** Original process/session/tab/PTTY/auth transaction/checkpoint is valuable state. Do not throw it away merely because a tool session or connection was rebuilt.

**Known helper freeze.** One proven helper/path is the default owner. Unexpected output reopens observation/diagnosis, not transport invention.

**First divergence wins.** Once the earliest mismatch is mechanically proven, stop downstream speculative actions and route to that owner. A later timeout is a symptom until the earlier mismatch is closed.

**User path integrity.** Internal state injection may diagnose a defect but cannot manufacture acceptance PASS. Real acceptance returns to the public user/product path.

**Reality is expensive evidence.** Use Browser/native reality to establish the actual scene and prove final behavior, not as an unlimited debugger. Once current evidence identifies the owning boundary, switch to engineering diagnosis and later return to the same scene.

## Acceptance mode routing

| Mode | Default use | Must not do |
|---|---|---|
| `DIRECT` | one bounded acceptance fact with no prior failed checkpoint | expand into a full journey without evidence |
| `SAME_SCENE` | recover the exact failed scene/checkpoint after timeout, tool repair, or product fix | restart earlier already-proven steps |
| `FAST_REPLAY` | routine repair: changed/affected gate + only necessary downstream user behavior | redo unrelated login/setup/Fresh/external creation merely for confidence |
| `FULL_FRESH` | explicit from-zero, release, or stage-final acceptance | act as the default recovery/debug loop |

`FULL_FRESH` is a proof mode, not a troubleshooting reflex.

## Failure routing

Before repair, classify the failure family independently from capability selection:

- `HUMAN_EXTERNAL`: unavoidable human consent/2FA/CAPTCHA/external manual prerequisite is incomplete.
- `PREREQUISITE_NOT_READY`: a legitimate producer/dependency has not established the required fact yet.
- `HARNESS_FAILURE`: matcher, helper locator, terminal geometry, command shape, automation focus, or test runner is wrong while product truth is not disproven.
- `TOOL_RUNTIME_FAILURE`: MCP/relay/browser-control/runtime infrastructure is unavailable.
- `PRODUCT_DEFECT`: the public/frozen behavior is clear and product implementation violates it.
- `SPEC_EXTERNAL_MISMATCH`: correct behavior requires changing a frozen contract/owner assumption or external reality invalidates it; stop for a contract decision.
- `CONTEXT_KNOWLEDGE_MIGRATION_GAP`: the single Skill lacks automation knowledge required for lost-context execution and that knowledge exists only in non-authoritative history/project material; migrate it here before claiming executable continuity.
- `UNKNOWN`: evidence is insufficient; preserve state and gather only the next resolving authority.

A capability is **what action is needed**; a failure class is **why the current route is blocked**. Do not write hybrid labels such as `ACT/HARNESS` as if they were one dimension.

## Tool mapping, not tool-driven routing

- Playwright Chrome implements `SEE/IDENTIFY/ACT/VERIFY` for attachable ordinary Web pages and exposes Console/Network for `LISTEN`.
- macOS AX + fresh screenshot implements privileged/native `SEE/IDENTIFY`; system keyboard/mouse/CGEvent implements privileged/native `ACT` when necessary.
- Local Dev implements local CLI `ACT`, process/PID/file/runtime `IDENTIFY`, `WAIT/LISTEN`, and local authority `VERIFY`.
- PTY/expect-style harnesses implement deterministic interactive CLI `ACT/WAIT/LISTEN`.
- `/Users/agent/Desktop/proton-workspace/scripts/gptweb-mcp` is the canonical shared MCP lifecycle entrypoint used by `CONNECT/RECOVER`; `restart` is recovery, not a generic diagnostic action.
- Microsoft Dev Tunnel uses the workspace-owned `/Users/agent/Desktop/proton-workspace/scripts/dev-tunnel` authority for managed CLI resolution, auth, create/reuse, host lifecycle and recovery. Products provide service topology and ingress policy; they must not guess a system `devtunnel` binary or recreate the lifecycle.

Read specialized references only when those capabilities are needed.

## Script policy owner

Script promotion, anti-wrapper rules, and the current public-script decision are owned only by [skill-evolution.md](skill-evolution.md). This capability reference must not maintain a second promotion policy.
