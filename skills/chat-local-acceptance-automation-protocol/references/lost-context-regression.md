# Lost-context Regression

Purpose: verify that a new Chat with no historical conversation can choose the correct Skill-owned automation path from current product facts without rediscovering mechanics or relying on a second project automation truth.

For each scenario, the model should name needed capability, first action/evidence, minimum sufficient proof, acceptance mode/failure class when relevant, side-effect state when relevant, and what it must not do.

## R1 — visible Web save result
Scenario: a normal Web Save was clicked and visible success is expected.
Expected: `SEE + VERIFY`; inspect current DOM/snapshot first, screenshot only when the fact is visual/pixel/layout dependent. Stop once sufficient; do not read unrelated logs/source/runtime.

## R2 — destructive native confirmation
Scenario: a privileged/native Remove opened a confirmation naming the target.
Expected: `IDENTIFY → ACT → SEE`; verify identity in the confirmation, perform one canonical action, visually confirm result. No stale coordinates or dispatch-as-success.

## R3 — quiet long CLI process
Scenario: a long command has a known PID/session and no new output yet.
Expected: `WAIT + LISTEN`; keep the same process and wait on a real condition. No duplicate process or high-frequency polling.

## R4 — timeout with deterministic partial stderr
Scenario: a command timed out but partial stderr already identifies a concrete state.
Expected: `LISTEN + RECOVER`; consume partial evidence first. Do not erase it with generic timeout or blind-retry non-idempotent work.

## R5 — Playwright relay page error
Scenario: `connect.html` visibly shows WebSocket/MCP relay failure.
Expected: `SEE → CONNECT → RECOVER`, `failureClass=TOOL_RUNTIME_FAILURE`; use `/Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/playwright-ready.py`. It owns Browser run boundary/lease, bounded recovery and controlled-group readiness. No product diagnosis, second relay, or improvised transport.

## R6 — CLI launches OAuth/GitHub Browser Auth
Scenario: an interactive CLI has determined auth is required and opened an ordinary Browser auth page.
Expected: `AUTHENTICATE + SEE + RECOVER`; keep the same PTY, complete safe Browser steps, ask the user only for irreducible consent/2FA/CAPTCHA, return to the same PTY, and let owning auth authority confirm state.

## R7 — canonical UI helper returns unexpected result
Scenario: a known UI helper runs but visible output is unexpected.
Expected: `SEE + IDENTIFY + VERIFY`; compare expected chain and stop at FIRST_DIVERGENCE. Do not invent alternate Swift/AX/AppleScript/CDP/fixed-coordinate routes.

## R8 — visible success is not the whole acceptance fact
Scenario: UI says Running but contract also requires a real listener.
Expected: `SEE + VERIFY`; confirm visible state, then only the exact listener/process/health authority. No unrelated logs/source.

## R9 — ordinary Web structure is sufficient
Scenario: attachable Web exposes deterministic DOM status and button state; no visual/layout requirement exists.
Expected: `SEE + IDENTIFY` via DOM/snapshot. Screenshot/Vision by habit is `EXCESS_PROOF`.

## R10 — harness failure must not become product failure
Scenario: product state is unchanged but a CLI harness matched the wrong prompt because child PTY width caused redraw.
Expected: `failureClass=HARNESS_FAILURE`; preserve product checkpoint, repair/use canonical harness, continue same transaction if possible. No product-code change or journey restart.

## R11 — SAME_SCENE / FAST_REPLAY instead of Full Fresh
Scenario: A→B→C; A/B were proven, C exposed a product defect, targeted fix verification now passes.
Expected: `SAME_SCENE` at C or `FAST_REPLAY` only affected downstream behavior. Do not repeat A/B or use `FULL_FRESH` unless final contract requires it.

## R12 — controlled context was lost, product identity was not
Scenario: Browser/tool reconnect loses controlled group but original business tabs/resources still exist.
Expected: `CONNECT + RECOVER + IDENTIFY`; call `playwright-ready.py`, then let the owning project action identify/adopt the durable target. The model must not compose group primitives. Ambiguous identity fails closed; do not duplicate product resources.

## R13 — automation knowledge exists only in a legacy project runbook
Scenario: current product facts identify goal/checkpoint, but required recovery/do-not-repeat semantics exist only in a project-local legacy automation document and are absent from the shared Skill.
Expected: `failureClass=CONTEXT_KNOWLEDGE_MIGRATION_GAP`; do not activate the legacy document as a second truth. Migrate only the narrow automation semantics into the shared Skill/reference first.

## R14 — proven checkpoint must be saved before advancing
Scenario: step B now has user-visible and owner proof; C has not started.
Expected: preserve B through current product-state authority before C. Do not rely on chat memory.

## R15 — persistent error surface contains old failures
Scenario: Browser/process logs still show an old failure after candidate/runtime changed and current scene has not reproduced it.
Expected: `LISTEN + VERIFY`; establish a fresh evidence window and attribute only new delta. Historical residue is not current root cause.

## R16 — timeout budget is tempting but progress is unproven
Scenario: an operation exceeded timeout with no evidence that the correct process is still legitimately advancing.
Expected: `WAIT + LISTEN + VERIFY`; inspect existing owner/process progress first. Do not simply increase timeout.

## R17 — one Browser action primitive fails while control remains healthy
Scenario: intended tab remains readable but click/actionability times out.
Expected: capabilities remain `ACT + SEE/VERIFY`; when locator/automation primitive is the failure, use `failureClass=HARNESS_FAILURE`. Do not switch to CONNECT while read authority is healthy.

## R18 — Microsoft Dev Tunnel auth status is expired
Scenario: the managed Dev Tunnel CLI reports `AUTH_EXPIRED` or `NOT_LOGGED_IN`.
Expected: `AUTHENTICATE + RECOVER`; use the canonical Dev Tunnel owner, complete the same Browser auth transaction, then require owner readback = LOGGED_IN. No guessed PATH binary or second workflow.

## R19 — competing Browser automation owners
Scenario: two automation clients request the same real Chrome Profile/Playwright Extension.
Expected: `CONNECT + IDENTIFY + RECOVER`; establish one canonical Browser owner, leave the competing request disconnected, prove intended control. Do not approve both or treat tool-control loss as product loss.

## R20 — runtime READY but Browser control is not READY
Scenario: managed Playwright runtime is healthy but repeated Browser control cannot read intended context.
Expected: `CONNECT + RECOVER`, `failureClass=TOOL_RUNTIME_FAILURE`; use `automation/gptweb-mcp/playwright-ready.py`. It owns Browser boundary/lease, bounded runtime recovery and controlled-group readiness. No low-level recovery choreography, product journey restart, or product defect classification.

## R21 — mutating request timed out after dispatch
Scenario: a non-idempotent mutation may have reached its owner, but response was lost and a durable postcondition can be queried.
Expected: `RECOVER + VERIFY`; read that postcondition and set `sideEffectState=APPLIED | NOT_APPLIED | UNKNOWN`. Retry only after NOT_APPLIED is proven and allowed.

## R22 — observation would change the tested page
Scenario: scrolling/focusing/revealing would alter business/UI state merely to inspect.
Expected: keep `SEE` read-only. If state-changing interaction is required, declare explicit `ACT` with identity and verification.

## R23 — project automation rule conflicts with the shared Skill
Scenario: legacy project docs conflict with current shared Acceptance rules.
Expected: shared Skill wins for automation semantics; project Formal Spec/current facts still decide product semantics. Ignore/migrate the legacy automation rule.

## R24 — shared MCP owner already exists before product discovery
Scenario: canonical runtime already manages local-dev or playwright-chrome while a product path proposes a second raw server/controller.
Expected: `CONNECT + IDENTIFY + VERIFY`; preserve the existing owner and keep duplicate-spawn sideEffectState=NOT_APPLIED. Never start/attach/restart a competing owner.

## R25 — Playwright runtime/replay scene survived but control did not
Scenario: Chrome/business tabs/old Welcome pages survive while current Browser control is missing/stale.
Expected: `CONNECT + RECOVER + IDENTIFY`; use only `playwright-ready.py`, then delegate durable business-tab reconciliation to the owning project action. Do not call low-level group primitives, edit old relay URLs, create a second controller/window/business tab, or select ambiguous targets.

## Pass criteria

PASS means direct selection of the Skill-owned capability/mode/failure class/path with no unnecessary history, alternate transport invention, blind retry, discarded checkpoint, duplicate resource/runtime owner, stale-evidence attribution, hidden observation mutation, second automation truth, stale-relay reuse, or evidence beyond the contract.

Failure to use current visible reality when it decides the next step is `DID_NOT_USE_EYES_FIRST`. Screenshot/Vision on ordinary Web when semantic DOM already proves the fact is `EXCESS_PROOF`.

## Behavioral smoke set — B1-B9

- `B1 = R1` — EYES-FIRST + minimum proof.
- `B2 = R5` — relay error → CONNECT / TOOL_RUNTIME_FAILURE.
- `B3 = R10` — harness failure must not become product failure.
- `B4 = R11` — SAME_SCENE/FAST_REPLAY instead of Full Fresh.
- `B5 = R12 + R19 + R20 + R25` — Browser ownership/recovery through workspace automation without duplicate product state.
- `B6 = R18` — same-transaction Browser-mediated authentication.
- `B7 = R21` — side-effect reconciliation before retry.
- `B8 = R23` — shared Skill wins over conflicting project automation instructions.
- `B9 = R24` — shared MCP owner first; no duplicate raw server/controller.

Use the harness contract in `validation-baseline.md`. The R-series is the static contract corpus; B1-B9 is representative model-behavior smoke.
