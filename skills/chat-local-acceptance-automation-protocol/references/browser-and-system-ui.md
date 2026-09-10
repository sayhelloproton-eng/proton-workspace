# Browser and System UI Capabilities

Use this reference when acceptance needs `SEE`, `IDENTIFY`, `ACT`, or visible `VERIFY` in Browser/macOS UI.

## SEE — current reality first, read-only by default

If a UI action has a visible, decision-relevant result, inspect the current surface immediately.

```text
ACT → CURRENT UI REALITY → only-if-needed OWNER/RUNTIME AUTHORITY
```

- Attachable ordinary Web: prefer current URL + semantic DOM/snapshot; use page screenshot when pixels, layout, visual status, geometry, or an error surface matter.
- `chrome://`, privileged extension UI, native picker/confirmation, or another visible surface Playwright cannot attach: use fresh privileged/system screenshot; add AX when structure/identity/bounds matter.
- A fresh user-provided screenshot is current eyes evidence only when no intervening mutation made it stale.

`SEE` is observation, not a hidden mutation channel. Do not scroll, focus, reveal, click, type, dismiss, or navigate merely to make inspection easier when those actions can change tested state. If such an interaction is genuinely required to observe or continue, classify it as `ACT`, bind identity, and verify the resulting state.

Do not replace visible reality with helper exit status, CLI output, source reasoning, old screenshots, or downstream success. Conversely, do not invoke screenshot/Vision by habit when ordinary DOM/snapshot already answers the acceptance question.

## IDENTIFY — prove the object, not its position

Bind the intended target to current reality before mutation. Useful identity evidence includes URL/title/content, DOM semantics, AX labels/roles, owner identifiers, and current geometry tied to the same target.

Never use card number, tab index, global AX order, old screenshot coordinates, or "first matching button" as durable identity. If a destructive confirmation appears, verify identity again inside that surface. Playwright controlled group, relay connection, or tab handle proves automation state only; it does not replace product/business identity.

## ACT — use the surface's real control boundary

Use Playwright for attachable ordinary Web pages and keep it backgrounded by default. Use AX/system UI plus real system input only for privileged/native surfaces that require it.

A privileged/native mutation should be one short foreground critical section:

```text
fresh eyes + target identity
→ derive current bounds if needed
→ one canonical mutation
→ immediate eyes readback
→ leave foreground
```

Do not activate Chrome, move the real mouse/keyboard, or take full-desktop screenshots for ordinary Web work. Do not let another automation tool steal focus during a native/privileged confirmation or picker transaction.

A successful click, keypress, `AXPress`, navigation request, or helper exit proves dispatch only. If the expected result is observable, the next action is current reality readback, not another mutation.

### Action primitive failure is not connection failure

If tabs/URL/snapshot/page screenshot remain readable but one interaction primitive such as click/actionability times out, keep the capability route at `ACT + SEE/VERIFY` and classify `failureClass=HARNESS_FAILURE` when the automation primitive/locator is what failed. Do not switch to `CONNECT` or restart relay/runtime while read authority remains healthy. Use an already-proven semantically equivalent interaction only when it preserves the same user-visible behavior and identity, then confirm the result.

If read/control authority itself is no longer usable, that is a separate `CONNECT/RECOVER` decision and may be `TOOL_RUNTIME_FAILURE`.

## Reality batch for ambiguous multi-surface failures

When a Browser side effect is `UNKNOWN`, content appears in the wrong page, navigation lands on unexpected identity, or UI and owner facts disagree, do one bounded observation batch before new mutation:

```text
relevant current pages / screenshots
+ current URL + DOM/snapshot (or AX for privileged UI)
+ requested durable identity / owner truth
+ exact effect/runtime state when needed
→ compare expected chain
→ stop at FIRST_DIVERGENCE
```

Batch only adjacent evidence needed to identify the earliest mismatch. Do not inspect one page, mutate another, inspect a third, and destroy the original scene.

## Side-effect reconciliation in Browser flows

If a Browser mutation may have happened but the command/transport result is lost, use a durable postcondition when one exists: exact URL, stable resource identity, message/content fingerprint, owner binding, or another product-owned observable fact. Re-read current reality and classify the effect `APPLIED | NOT_APPLIED | UNKNOWN`.

A surviving tab alone is not proof that click/input/upload/submit occurred. When no durable postcondition can prove the effect, preserve `UNKNOWN` rather than replaying the mutation.

## VERIFY — minimum sufficient proof

A purely visible fact may be closed by current DOM/snapshot/screenshot/AX evidence. A cross-layer fact such as "UI says running and the real service is listening" needs current UI reality plus the smallest owner/runtime readback proving the non-visible requirement.

For ordinary Web control readiness, the intended page must be in the controlled context and actually readable by snapshot/page screenshot. A relay page, debugger banner, or group membership alone is not business-page control.

Minimum proof is defined by the acceptance contract, not by whichever evidence is easiest to collect.

## Reality is acceptance, not the main debugger

Browser/native reality establishes the user scene, classifies failure, and proves final result. Once the scene plus first divergence identifies the owning boundary, stop speculative Browser/native operations and switch to engineering diagnosis. After the fix, return to the same user scene.

## Known-path freeze and recovery

If a validated helper already owns a mechanical UI action, reuse it. Unexpected visible output means return to current eyes/identity and classify the divergence. Do not immediately try a new Swift, AppleScript, fixed-coordinate, CDP, AX, or navigation route.

If Browser tool reconnect loses controlled context, recover the original business tabs/scene where possible. Tool recovery must not create duplicate product tabs/resources, repeat user mutations, or restart a product journey. After control is restored, prove the original target page is readable before continuing.
