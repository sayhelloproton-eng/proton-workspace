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

A timeout means the command did not complete within budget. It does **not** erase partial stdout/stderr. Consume deterministic partial evidence first, then decide whether any fallback is still necessary.

Persistent diagnostics can contain stale entries. When attribution matters, bind observation to the current run using a start time, PID/session, log offset, event cursor, cleared error surface, or another bounded fresh-evidence window. Historical errors are context, not current root cause, until the current scene reproduces them.

Keep a stable identity for long work when available: current run/goal, PID or session, log/output location, start time, and expected stop condition. Only manage processes that the current run actually owns; unknown PIDs are observation-only.

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
