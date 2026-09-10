# Tool Runtime, Browser Connection and Authentication

Use this reference for `CONNECT`, `AUTHENTICATE`, and connection-related `RECOVER`. Tool infrastructure is not product state.

## CONNECT — shared MCP runtime

Canonical local lifecycle entrypoint:

```text
/Users/agent/.local/bin/gptweb-mcp
start | status | test | stop | restart
```

The shared runtime manages `repomix`, `codegraph`, `local-dev`, and `playwright-chrome`. The existing manager is the only lifecycle owner. Do not create a second LaunchAgent, watchdog, KeepAlive job, private supervisor, or alternate manager.

`stop/restart` are shared disruptive actions. Do not use them merely to refresh discovery or because one call timed out. Confirm the affected layer first and avoid interrupting another active Chat/agent unless recovery actually requires reload or the user explicitly authorizes it.

Use lifecycle evidence according to layer:

```text
gptweb-mcp status/test
→ manager/runtime summary

/Users/agent/Library/Application Support/tunnel-client/health/<alias>.url
+ GET <that-url>/readyz
→ local per-runtime liveness when control-plane status is slow/ambiguous

Browser tabs + snapshot/page screenshot
→ actual Browser control authority
```

Do not collapse those authorities. A network/control-plane timeout in a status command is not proof that the local runtime is dead. Likewise, local runtime READY is not proof that Browser control is READY.

`restart` is recovery, not diagnosis. After a required restart, use `status/test` or local liveness as appropriate, then prove Browser control separately and return to the original acceptance checkpoint.

## Playwright Browser connection proof ladder

```text
gptweb-mcp / tool runtime READY
→ Playwright extension relay connected
→ intended tab belongs to controlled context
→ debugger/tool actually controls that tab
→ snapshot/page screenshot can read intended content
```

Only the last two layers prove usable Browser control of the intended page.

`chrome-extension://.../connect.html` is Playwright MCP tool infrastructure. It is not a product page and not OAuth/GitHub login. A visible `Failed to connect to MCP relay: WebSocket error` is first `SEE + CONNECT + RECOVER`, `failureClass=TOOL_RUNTIME_FAILURE`.

A normal first bootstrap may open one `connect.html`; success means it visibly reaches connected state and subsequent business-page control proof succeeds. Repeated reappearance later must be classified as bootstrap/runtime/relay reconstruction before product mutation.

## Playwright Extension credential synchronization

Canonical local environment file:

```text
/Users/agent/.config/openai/tunnel-client/playwright-chrome.env
```

When the Extension credential changes, obtain the **current** value from the Extension's current connect/status surface and update only that existing env file. Never guess or reuse a historical value, and never print/transcribe the credential into Chat, logs, repositories, screenshots text, telemetry, or test evidence.

After an actual credential/config change:

```text
gptweb-mcp restart
→ runtime/liveness readback
→ connect.html current state if present
→ browser_tabs + snapshot/page screenshot on intended business tab
```

If a credential has appeared in Chat or a screenshot, regenerate it after the incident/verification and resynchronize through the same path.

Do not switch to an old CDP port, restart real Chrome, reinstall the Extension, or create a second relay merely because the first Browser call failed.

## AUTHENTICATE — preserve the owning transaction

Browser-mediated CLI authentication is a cross-surface continuation, not a new workflow:

```text
owning CLI/PTTY determines auth is required
→ same transaction launches Browser auth
→ ordinary auth page handled with Browser automation where safe
→ unavoidable account consent / 2FA / CAPTCHA goes to the user
→ return to same CLI/PTTY
→ owning auth authority rechecks authenticated state
→ continue original transaction
```

Do not infer "not logged in" from timeout alone. `UNKNOWN != NOT_LOGGED_IN`. Consume deterministic stdout/stderr/status evidence before starting a login mutation.

### Known shared pattern — Microsoft Dev Tunnel Browser Auth

When the product/tool owns a managed Microsoft Dev Tunnel CLI, use that product-owned binary/resolver; do not bypass it with a guessed PATH binary.

```text
devtunnel user show --json
→ current login authority

LOGGED_IN
→ continue without Browser mutation

AUTH_EXPIRED / NOT_LOGGED_IN
→ devtunnel user login --github --use-browser-auth
→ complete the same Browser-auth transaction
→ devtunnel user show --json
→ require LOGGED_IN before continuing
```

If `user show --json` times out, preserve partial stdout/stderr. Deterministic expired/login evidence may already classify the state; timeout alone must not trigger a second probe or login mutation. If evidence remains `UNKNOWN`, fail closed or use only the bounded product-owned diagnostic already specified by current product facts.

Dev Tunnel auth pages and Playwright `connect.html` are different surfaces. If Playwright infrastructure fails during auth, repair the tool connection and return to the same auth transaction; do not restart the owning CLI/PTTY workflow.

## RECOVER — tool failure stays tool failure

Repair only the failed tool layer, then return to the same product scene. Do not restart setup/install/journey work, recreate product tabs/resources, or modify product code merely because automation connection was lost.

If the original business tab still exists but controlled-group state was lost, recover that original tab into control context and prove it with `browser_tabs` plus snapshot/page screenshot. Do not duplicate the same business URL merely to make the tool see it.

## Browser control ownership

For one real Chrome profile using the Playwright Extension, establish one canonical MCP/controller as Browser owner for the current acceptance run.

If another agent/client also requests the same Extension/Profile:

```text
identify intended owner
→ leave competing request unapproved/disconnected
→ recover/prove intended owner's relay + controlled context
→ continue existing product scene
```

Do not approve multiple competing controllers merely because both are legitimate tools. A second controller may invalidate control state without changing product tabs or business state. Tool ownership loss is `CONNECT/RECOVER`, not product loss.

Likewise, `runtime_state=ready` proves only the managed runtime layer. If `browser_tabs`/snapshot repeatedly cannot read the intended Browser context, Browser control is not READY; preserve product state and stay at relay/control recovery.
