# Browser Tools

`tools/browser/` owns cross-project Browser / UI automation primitives and the concrete Playwright Chrome MCP runtime surface.

## Canonical controlled tab group

Stable Chrome controlled-group mechanics are owned by:

```text
/Users/agent/Desktop/proton-workspace/tools/browser/playwright-controlled-group.py
```

Supported actions:

```text
ensure
list
adopt      --target-tab-id <id> | --exact-url <url> | --chat-id <id>
create     --url <http(s)|chrome-extension|chrome://extensions-url>
duplicate  --target-tab-id <id> | --exact-url <url> | --chat-id <id>
close      --target-tab-id <id> | --exact-url <url> | --chat-id <id>
click-button --target-tab-id <id> | --exact-url <url> | --chat-id <id> \
             --name <accessible-name> [--expect-text <readback>]
```

### Shared Chat / Acceptance controller path

When Chat/Acceptance already has a canonical Playwright controller, an existing business tab MUST be adopted by that same session. Do not run a second MCP session merely to perform `adopt`.

Prepare the deterministic action:

```text
python3 /Users/agent/Desktop/proton-workspace/tools/browser/playwright-controlled-group.py \
  adopt \
  --target-tab-id <id> \
  --exact-url <url> \
  --chat-id <id> \
  --prepare-current-session
```

The receipt returns `actionFile`. Execute that file with the **already connected canonical** Playwright `browser_run_code_unsafe(filename=...)`, then clean the runtime artifact:

```text
python3 /Users/agent/Desktop/proton-workspace/tools/browser/playwright-controlled-group.py \
  --cleanup-action-file <actionFile>
```

Direct Local CLI execution of `adopt` fails closed. This prevents a helper-created MCP session from becoming a second Browser controller or leaving the exact business target in a stale, unconnected Playwright group.

Hard invariants:

- the Playwright Extension `connect.html` page is a temporary selector/control carrier, not the durable business-tab location;
- the existing canonical Playwright session/group is the only allowed owner for shared Chat/Acceptance adoption;
- `adopt` requires one durable unique target and **never moves the business target to the selector window**;
- when `adopt` targets another window, the existing canonical Playwright group moves to the target window, the exact target joins that group and must appear in Extension `connectedTabIds`, then the temporary selector page closes;
- after successful adoption, the target remains in its original window and the selector is gone, preserving a dedicated single-business-tab window when that is the product invariant;
- `create` remains `about:blank → group → group readback → navigation`; the only allowed `chrome://` destination is `chrome://extensions`, so Extension maintenance can stay inside the controlled group;
- `click-button` requires durable target identity + controlled-group membership, resolves exactly one Playwright role=button by accessible name, never uses screen coordinates, and may require one explicit confirmation text;
- `duplicate` and `close` require durable target identity and controlled-group membership;
- group identity is Browser runtime state, not durable product/SQL identity;
- this owner never creates a Chrome window, never migrates the durable business target across windows, and never types/submits product text.

Project automation must consume these generic mechanics instead of reproducing `chrome.tabs.group`, `chrome.tabGroups`, cross-window control-group migration, or grouped creation logic.

## Current assets

- `gptweb-mcp-service.sh`: Playwright Chrome MCP runtime start / stop / health / status implementation; declares tunnel id, credential and MCP command.
- `playwright-chrome-broker.sh`: Browser-specific launcher for the shared MCP broker.
- `playwright-open-existing-chrome.sh`: opens only a legal Extension connect URL into existing Chrome.
- `playwright-controlled-group.py`: generic deterministic controlled-group lifecycle and current-session action preparation.

Playwright Chrome no longer depends on `~/.config/tunnel-client/playwright-chrome.yaml`; that profile is retired. The generic MCP Broker lives in `tools/mcp-shared-broker/`. Cross-Tool runtime lifecycle, single-owner guard, watchdog and recovery orchestration remain under `automation/gptweb-mcp/`.

Browser product logic, project state machines, approvals and Acceptance policy remain owned by the corresponding product or Skill.
