# Browser and System UI Capabilities

Use this reference when acceptance needs `SEE`, `IDENTIFY`, `ACT`, or visible `VERIFY` in Browser/macOS UI.

## SEE — current reality first, read-only by default

If a UI action has a decision-relevant visible result, inspect the current surface immediately.

```text
ACT → CURRENT UI REALITY → only-if-needed OWNER/RUNTIME AUTHORITY
```

- Attachable ordinary Web: prefer current URL + semantic DOM/snapshot; use page screenshot when pixels, layout, visual status, geometry, or an error surface matter.
- `chrome://`, privileged extension UI, native picker/confirmation, or another visible surface Playwright cannot attach: use fresh privileged/system screenshot; add AX when structure/identity/bounds matter.
- A fresh user-provided screenshot is current eyes evidence only when no intervening mutation made it stale.

`SEE` is observation, not a hidden mutation channel. Do not scroll, focus, reveal, click, type, dismiss, or navigate merely to make inspection easier when those actions can change tested state. If such an interaction is genuinely required to observe or continue, classify it as `ACT`, bind identity, and verify the resulting state.

Do not replace visible reality with helper exit status, CLI output, source reasoning, old screenshots, or downstream success. Conversely, do not invoke screenshot/Vision by habit when ordinary DOM/snapshot already answers the acceptance question.

### Visual geometry and pointer-path acceptance

When the acceptance claim is exact spacing, alignment, sizing, anchoring, or another measurable visual relation, a screenshot alone is not sufficient proof. Use current DOM/AX bounding boxes and computed geometry for the exact claim, then add a screenshot only when overall visual gestalt is also part of the contract. Do not certify “padding/alignment is fixed” from source values or visual impression when rendered geometry can be measured.

For hover/popover/tooltip behavior, verify the real pointer journey rather than only `visible=true` at the trigger:

```text
trigger hover
→ move through the actual transit gap
→ enter content surface
→ verify it remains visible/readable
→ verify anchor distance + viewport collision/overflow behavior required by the contract
```

If the same visible criterion is still wrong after one repair, stop screenshot-driven numeric tweaking. Preserve the scene, measure the first geometry/cascade/interaction divergence, and hand the root cause back to engineering before another product mutation.

Screenshot evidence has three distinct states: captured, inspected by the assistant, and delivered to the user through an actually accessible conversation artifact. A local file path or tool preview proves capture/inspection only; never claim the user received the screenshot unless delivery is mechanically established.

## IDENTIFY — prove the object, not its position

Bind the intended target to current reality before mutation. Useful identity evidence includes URL/title/content, DOM semantics, AX labels/roles, owner identifiers, and current geometry tied to the same target.

Never use card number, tab index, global AX order, old screenshot coordinates, or "the first matching control" as durable identity. If a destructive confirmation appears, verify identity again inside that surface. Playwright controlled group, relay connection, or tab handle proves automation state only; it does not replace product/business identity.

### SHARED-BROWSER-ATOMIC-SCENE — HARD RULE

A single shared Playwright/Browser controller does **not** imply that multiple Chat/agent consumers have independent `current page`, tab selection, BrowserContext, or page state. Never carry a mutable global-current-page assumption across separate automation calls when another consumer may use the same controller.

For ordinary Web acceptance on a shared controller:

```text
fresh target identity inside the current transaction
→ smallest real user-path action / observation sequence
→ capture decision-relevant DOM / screenshot / Network / Console evidence
→ reconcile side effects before any retry
→ restore the original foreground page before returning control
```

When the acceptance scene is intentionally fresh and does not require pre-existing page/session state, prefer one atomic Playwright transaction that creates an ephemeral business page, executes the real public path, captures evidence, closes that page, and restores the original page in `finally`. This is a harness-control technique, not permission to bypass product behavior: the temporary page must still traverse the public UI/runtime path and must not replace required persisted identity, authentication, conversation state, or an existing resource that the scenario specifically requires.

When existing page state matters, recover and bind that exact page by durable identity inside the same transaction where possible. Do not repeatedly `select tab N → act → select tab N` across calls; tab position is not ownership. If the target page disappears from the controlled context, another consumer changes the controlled-page set, or action results land in a different page, classify the first divergence as `MULTI_BROWSER_OWNER_CONFLICT` / `HARNESS_FAILURE` unless runtime authority proves a different owner. Do not mutate product code or spawn a second Browser controller to compensate.

A background page object may exist while screenshot/locator operations are unsupported or stalled by the current Browser/Extension transport. Do not infer that background screenshots are always possible merely because standard Playwright normally permits them. Prefer semantic DOM when it works; when pixel evidence is required and the transport needs foreground ownership, perform `bringToFront → observe/capture → restore original page` inside one atomic transaction so no shared-current-page state escapes between tool calls.

If an atomic Browser call times out after a potentially mutating action, reconcile the durable product/runtime postcondition before retrying. A timeout is never permission to recreate the page, resubmit the message, repeat an upload, or replay another user mutation blindly.

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

### Browser Extension lifecycle semantics

Treat Extension `INSTALL`, `RELOAD`, and `UNINSTALL` as different actions with different preconditions and proof. Never collapse them into one generic "setup" mutation.

- **INSTALL** requires current registration authority to prove the target Extension is `MISSING`. The action registers/loads the new Extension. PASS requires fresh registration identity plus the product-required runtime proof such as loaded version, heartbeat, or owner verification. If a test fixture must first remove an old Extension to create the `MISSING` precondition, that removal is explicit `caseSetup`/cleanup and is not part of INSTALL.
- **RELOAD** requires an already registered Extension with the exact expected identity and load path. The action reloads that same registration so Chrome adopts updated material/version. It must not unregister/reinstall the Extension. PASS requires post-reload loaded-version/runtime proof, not merely a dispatched reload.
- **UNINSTALL** is destructive explicit removal. Execute it only when the user/acceptance contract asks for removal, cleanup, or a fixture reset. It is never an implicit prerequisite for INSTALL, RELOAD, or ordinary deployment adoption.
- A higher-level **DEPLOY/ADOPT** helper may branch on current authority: `MISSING → INSTALL`, exact existing identity/path → `RELOAD`, and disabled/wrong-path/ambiguous reality → fail closed at that first divergence. It must expose which branch ran and must never hide an automatic UNINSTALL.

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

Browser/native reality establishes the user scene, classifies failure, and proves final result. Once the scene plus first divergence identifies the owning boundary, stop speculative Browser/native operations; switch to the engineering owner for diagnosis/repair, then return to the same user scene for real verification.

## Known-path freeze and recovery

If a validated helper already owns a mechanical UI action, reuse it. Unexpected visible output means return to current eyes/identity and classify the divergence. Do not immediately try a new Swift, AppleScript, fixed-coordinate, CDP, AX, or navigation route.

If Browser tool reconnect loses controlled context, recover the original business tabs/scene where possible. Tool recovery must not create duplicate product tabs/resources, repeat user mutations, or restart a product journey. After control is restored, prove the original target page is readable before continuing.
