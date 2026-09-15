# CLI, PTY, Wait, Listen and Process Recovery

Use this reference for `ACT`, `WAIT`, `LISTEN`, and `RECOVER` around local commands and asynchronous work.

## ACT — ordinary CLI and interactive PTY

Use direct Local command execution for deterministic non-interactive commands. Use PTY only for prompts, menus, terminal-size-sensitive UI, or a transaction that must remain alive across Browser/native work.

Each public prompt is one state transition:

```text
observe exact prompt → send one intended answer → observe transition
```

Do not repeatedly send Enter/text or guess defaults. If ordinary PTY injection proves unreliable once for the same prompt shape, preserve the transaction and use an already-proven expect/pexpect-style harness when available.

If an interactive CLI launches Browser authentication, keep the **same PTY transaction**; complete Browser auth and return to the existing PTY rather than restarting the CLI.

## WAIT — dependency-point only

Prefer explicit facts: process exit, readiness/health, port/listener, UI state, event, prompt, file/result appearance, or a log marker.

First ask: **does the next decision depend on this result now?**

If no:

```text
start/bind once
→ record PID/session/log/event authority
→ continue independent work
→ do not poll
```

If no independent work remains, return control rather than waiting. If the Chat returns control while work is still asynchronous, close the current Acceptance run truthfully; later continuation opens a new run and reuses the checkpoint/authority.

If yes, bounded condition/event waiting is allowed. Even then, do not create a 1–2 second model polling loop or launch a second copy because output is quiet.

Timeout is a bounded observation result, not evidence that a larger timeout fixes the problem. Increase budget only when owner/progress evidence proves the same correct operation is legitimately slow.

## LISTEN — fresh evidence only

Useful evidence: stdout/stderr, process output, logs, Console/Network, event streams. Record only the slice needed for the decision; do not dump secret-bearing state.

Before the first log/process-dependent action, bind the smallest fresh evidence identity:

```text
run start time
+ PID/session when present
+ append-only log cursor/offset when known
+ expected readiness/event stop condition
```

After the action, read only the new delta. Batch adjacent known sources; do not rediscover the whole log tree after every action.

If expected service/port/process is not running, that is the first divergence. Recover the canonical owner before looking for downstream heartbeat/events.

Partial stdout/stderr survives timeout and remains evidence. Persistent diagnostics may be stale; current bounded evidence wins.

## Long asynchronous work

Acceptance must not babysit build/publish/deploy/install/full-suite or another known-slow producer. When the result is not yet a dependency point, keep only durable identity and continue independent work.

At the dependency point:

```text
owner/terminal authority first
→ if satisfied: continue
→ otherwise PID/session once
   → alive: RUNNING; continue independent work or return
   → dead: log/output once; classify
```

Non-idempotent `UNKNOWN` requires durable effect reconciliation before retry.

## Final lifecycle fixture hygiene

Temporary process/runtime/fixture started by Acceptance is harness state. Track run owner + PID/session/resource identity + cleanup condition.

Before stage-final cold lifecycle proof, reconcile Acceptance-owned fixtures and require them gone unless the contract intentionally depends on them. If an owned fixture still holds the product resource/port, classify `HARNESS_FAILURE`, clean only that exact fixture, prove release, then rerun the same lifecycle scene. Unknown PIDs are observation-only.

## RECOVER — continue existing state first

```text
recover same PID/session/PTTY/log/output/checkpoint
→ determine what already happened
→ continue if safe
→ retry only when authority proves eligibility
```

Repairing the CLI/PTTY harness must not restart unrelated product work. If product state is unchanged, return to the previous Acceptance checkpoint.

## Result semantics

Command exit/harness output proves only its own layer. Visible effects require `EYES-FIRST`; runtime facts require the exact owner. Keep `HARNESS_FAILURE` separate from product failure.

If stale log/error and fresh reproduction disagree, current bounded evidence wins.
