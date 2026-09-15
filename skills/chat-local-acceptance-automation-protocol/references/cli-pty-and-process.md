# CLI, PTY, Wait, Listen and Process Recovery

Use this reference for `ACT`, `WAIT`, `LISTEN`, and `RECOVER` around local commands and long-running processes.

## ACT — ordinary CLI and interactive PTY

Use direct Local command execution for deterministic non-interactive commands. Use PTY for prompts, menus, terminal-size-sensitive UIs, or a command that must remain alive while Browser/native work happens.

Each public prompt is a small state transition:

```text
observe exact prompt → send one intended answer → observe transition
```

Do not use rules such as “see Yes → press Enter”, repeatedly send Enter/text, or guess defaults with arrow keys. If ordinary PTY text injection proves unreliable once for the same prompt shape, preserve the current transaction and use an already-proven expect/pexpect-style harness when available.

For TUIs that redraw by terminal width, configure the child PTY size where the product command actually runs; parent terminal size is not authority.

If an interactive CLI launches Browser authentication, keep the **same PTY transaction**. Complete the Browser portion, return to the existing PTY, and continue from its current prompt/result rather than starting the CLI again.

## WAIT — wait for a fact, not for elapsed time

Prefer explicit conditions: process exit, readiness/health, port/listener, UI state, event, prompt, file/result appearance, or a specific log marker.

Start a long action once. If observation is needed, use bounded or low-frequency reads appropriate to the expected duration. Do not create a model-driven 1–2 second polling loop and do not launch a second copy merely because output is quiet.

A timeout is a bounded-observation result, not evidence that a larger timeout is the correct fix. Before increasing a budget, prove from current process/runtime/owner evidence that the same intended operation is alive and legitimately slow. Do not use timeout inflation to mask a first divergence, wrong command shape, stalled owner, dead process, or harness failure.

## LISTEN — preserve fresh evidence already produced

Useful non-visual evidence includes stdout/stderr, process output, logs, Console/Network, and event streams. Record only the slice needed for the current decision; do not dump secret-bearing state trees.

### Fast fresh-window path

Before the first action that depends on emitted runtime/process evidence, use the run boundary from `AUTOMATION_START` and bind the smallest stable evidence identity available:

```text
run start time
+ PID/session when there is a process
+ append-only log cursor/offset when there is a known log
+ expected readiness/event stop condition
```

After the action, read only the new output/delta from that same window. Batch adjacent known log sources into one evidence transaction when the tool supports it. Do not rediscover the whole log tree after every action.

If the expected service/port/process is not listening/running, stop there: the first divergence is runtime readiness. Absence of a later heartbeat/event is then expected and must not be misclassified as a log-listener failure. Start/recover the owning runtime only through its canonical lifecycle path, then continue the same run/checkpoint and fresh window.

A timeout means the command did not complete within budget. It does **not** erase partial stdout/stderr. Consume deterministic partial evidence first, then decide whether any fallback is still necessary.

Persistent diagnostics can contain stale entries. When attribution matters, bind observation to the current run using a start time, PID/session, log offset, event cursor, cleared error surface, or another bounded fresh-evidence window. Historical errors are context, not current root cause, until the current scene reproduces them.

Keep a stable identity for long work when available: current run/goal, PID or session, log/output location, start time, and expected stop condition. Only manage processes that the current run actually owns; unknown PIDs are observation-only.

### Final lifecycle fixture hygiene

Any temporary process, runtime, or fixture started by acceptance automation rather than the product's public lifecycle remains **harness state**. Track its run owner plus PID/session or equivalent resource identity and its cleanup condition.

Before a stage-final cold stop/start/restart or production lifecycle proof, reconcile all acceptance-owned fixtures for the scene and require them to be gone unless the acceptance contract intentionally depends on them. If a lifecycle command fails while a mechanically proven acceptance-owned fixture still binds the same product port/resource, classify that first divergence as `HARNESS_FAILURE`: clean only the exact owned fixture, prove the resource is released, then rerun the same lifecycle scene. Do not diagnose or repair product lifecycle code until fixture contamination is removed. Unknown PIDs remain observation-only. A handoff must explicitly record any intentionally live owned fixture.

## RECOVER — continue existing state first

If a tool session disappears or a wait times out:

```text
recover same PID/session/PTTY/log/output
→ determine what already happened
→ continue if safe
→ retry only when idempotency/authority explicitly permits it
```

Idempotent read/test may be repeated after confirming no side effect. Publish/create/install/update/migration or other non-idempotent actions in `UNKNOWN` require authority readback before any retry.

Repairing a CLI/PTY harness must not force unrelated product work to restart. If product state is unchanged, return to the previous acceptance checkpoint.

## Result semantics

Command exit code and harness output prove only their own layer. If the command caused a visible Browser/native change, apply `EYES-FIRST`; if the acceptance fact is a runtime fact, read that exact owner. Keep `HARNESS_FAILURE` separate from product failure when the problem is prompt matching, terminal geometry, command shape, missing tool, process handling, or automation transport.

If a stale log/error and a fresh reproduction disagree, current bounded evidence wins. Preserve the old evidence only as history; do not let it continue driving current mutation after the fresh window disproves it.
