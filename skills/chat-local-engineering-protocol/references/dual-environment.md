# Whole-file Bundle Replacement

This reference explains mutation transport only. `../SKILL.md` is the sole rule owner.

## Model

```text
Local authority/source evidence
→ Chat Engineering Decision
→ complete next-version files
→ one guarded Local whole-file apply
→ real Local verification
```

Reasoning may start from narrow seams, but every REPLACE file must be complete before FROZEN. CREATE files need complete contract/dependency evidence.

## Data Plane / Control Plane

Data Plane carries bytes and metadata in one Local temp area:

```text
changed-files.tar
manifest.json
expected-state.json
receipt.json
```

`changed-files.tar` contains complete next-version files at repository-relative paths. `manifest.json` declares CREATE/REPLACE/DELETE. `expected-state.json` carries repo/branch/HEAD and changed-file fingerprints. `receipt.json` is produced by the runner.

Control Plane is one short invocation of the stable runner. Its command size must not scale with source bytes.

## Streaming fast path

For UTF-8/LF text payloads, `../scripts/materialize-whole-file-envelope.mjs` is the preferred Data Plane receiver when Local Dev interactive stdin is available:

```text
start receiver once
→ receiver prints prompt/token
→ one interact payload carries every complete file + manifest + expected state
→ receiver writes temp staging + changed-files.tar
→ stable apply runner performs guarded repository mutation
```

This removes the impedance mismatch between a whole-file semantic unit and a 25–30-line file-write primitive. Source bytes travel over stdin, not inside a shell command. The receiver is prompt-aware so the tool can return on a deterministic `>` prompt rather than paying a generic timeout just to discover readiness/completion.

The receiver is intentionally text-only: UTF-8, LF, final newline. Binary or line-ending-sensitive payloads need a binary-safe transport. Chunked native file-write remains a fallback, not the normal path, when the streaming receiver is available.

## Stable runner

`scripts/apply-whole-file-bundle.mjs` owns mechanical apply semantics only. It may validate authority, paths and fingerprints, unpack/copy/delete whole files, run `git diff --check`, and write a receipt. It may not decide source changes.

The normal apply transaction is:

```text
authority/fingerprint gate
→ validate bundle
→ CREATE / REPLACE / DELETE
→ git diff --check
→ receipt
```

Rename is normally `CREATE new + DELETE old`.

## Failure lifecycle

On `TIMEOUT / UNKNOWN`, keep transport/evidence and continue the same PID/session when possible. If that authority is unavailable, recover state before considering a retry. Cleanup only after a terminal outcome is known.

Formatting-only drift in a complete file is a materialization defect; it is not a reason to abandon whole-file transport.
