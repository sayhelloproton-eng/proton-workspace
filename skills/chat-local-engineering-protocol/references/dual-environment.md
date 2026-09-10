# Whole-file Bundle Replacement

This reference explains transport only. `../SKILL.md` is the sole rule owner.

## Mental model

```text
Local authority/source evidence
→ Chat Engineering Decision
→ complete next-version files
→ changed-files.tar
→ one guarded Local whole-file apply
→ real Local verification
```

The Engineering Decision is the mutation unit. File count does not create extra mutation rounds.

## Complete-source boundary

Reasoning may begin from small implementation seams, but before FROZEN Chat must possess complete baseline source for every actual REPLACE file. CREATE files require complete contract/dependency evidence instead of nonexistent baseline bytes.

Large files that native read APIs truncate or paginate should use an exact snapshot transport such as Repomix. Compressed/structural output is discovery evidence, not mutation-grade complete source.

## Bundle boundary

The bundle contains complete files at repository-relative paths. Supported operations are:
- CREATE
- REPLACE
- DELETE through an optional manifest
- RENAME represented as CREATE + DELETE

Local never receives line-edit instructions.

## Deterministic materialization

Whole-file replacement remains the invariant, but Chat should avoid needlessly regenerating unchanged bytes when a Chat-side deterministic materializer is available. The materializer may combine frozen complete source with Chat-owned semantic decisions to emit the final complete file; it must not move source-design logic to Local.

Formatting-only drift in a complete file is a materialization defect, not a reason to abandon whole-file transport.

## Apply

The normal single Local transaction is:

```text
authority + fingerprint gate
→ unpack complete files
→ CREATE / REPLACE / DELETE
→ git diff --check
→ changed paths
```

The gate is embedded in APPLY so safety does not require a separate round trip. Mismatch fails closed before mutation.

Forbidden normal transports remain patch/unified diff, line/hunk edits, anchor-based mutation, per-file MCP edit loops, or Local source transformers that decide code changes.
