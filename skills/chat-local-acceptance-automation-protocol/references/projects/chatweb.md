# ChatWeb Acceptance Automation

Load this reference only for ChatWeb acceptance involving shared Playwright Chrome control, MCP discovery, or READ_ONLY MCP execution.

## Authority split

ChatWeb repository: `/Users/agent/Desktop/proton-workspace/repos/chatweb`.
Shared broker implementation: `/Users/agent/Desktop/proton-workspace/tools/mcp-shared-broker`.
Shared lifecycle owner: `/Users/agent/Desktop/proton-workspace/automation/gptweb-mcp` through `/Users/agent/Desktop/proton-workspace/scripts/gptweb-mcp`.

For ChatWeb Wave F, keep readiness and execution authority separate:

- `MCP_LOCAL_DEV_READY_URL_FILE` and `MCP_CHROME_READY_URL_FILE` prove only managed-runtime readiness through `/readyz`.
- Playwright MCP execution uses the broker-owned loopback endpoint written to `mcp-endpoints/playwright-chrome.url`; that endpoint is the actual Streamable HTTP `/mcp` authority.
- Local Dev execution uses the Broker v2 loopback endpoint written to `mcp-endpoints/local-dev.url`; readiness and execution endpoint are separate facts.
- Current Playwright ownership is `gptweb-mcp → tunnel-client(playwright-chrome) → tools/browser/playwright-chrome-broker.sh → tools/mcp-shared-broker → exactly one lazy @playwright/mcp --extension → Playwright Extension → Chrome`.
- Current Local Dev ownership is `gptweb-mcp → tools/local-dev/gptweb-mcp-service.sh → tunnel-client(local-dev) + tools/mcp-shared-broker authority v2 → Desktop Commander`.
- The Local Dev service owns the Local Dev-specific Broker startup/configuration; there is no separate Local Dev Broker launcher.
- The Extension-visible client identity is `Playwright MCP`. Retired direct wrappers such as `playwright-chrome-mcp.sh` and `chatweb-mcp-shared-broker.sh` must not be recreated as alternate owners.
- One raw Playwright owner does **not** prove separate ChatGPT consumers have isolated page/context state. Fresh ChatWeb Browser acceptance must continue to use the common `SHARED-BROWSER-ATOMIC-SCENE` rule until end-to-end session isolation is mechanically proven.
- Existing-scene recovery must recover that exact scene; an ephemeral-page fast path is not a substitute for required persisted conversation/auth/resource identity.
- Never derive `/mcp` by rewriting a tunnel-client readiness/operator URL.
- ChatWeb must not own a second raw Local Dev, Desktop Commander, Broker, or Playwright MCP process/controller.

## Known Wave F path

Use this project-specific acceptance order:

1. prove the canonical shared runtime manager is READY;
2. prove the required Broker execution endpoint exists, is loopback-only, and belongs to the canonical owner;
3. for Playwright, prove the single Broker-owned upstream and preserve Browser single-owner/atomic-scene constraints;
4. for Local Dev, use only `mcp-endpoints/local-dev.url` and Broker v2 authority; do not direct-spawn Desktop Commander;
5. start ChatWeb 4310 and prove it has no raw MCP child process;
6. prove `GET /chat/tools` exposes only Runtime-approved public metadata and enabled READ_ONLY MCP tools are AVAILABLE;
7. run a real ChatRun with a selected READ_ONLY MCP Tool only when that tool has the authoritative execution endpoint;
8. prove at most one ToolInvocation with the real provider/tool/effect and that Browser Tool Drawer state matches the public/runtime state.

F1 discovery does not require model generation. F2 real one-hop execution is not complete from `/chat/tools` alone; it must execute through the normal ChatRun and model path.

## First divergence

If the canonical manager is READY but ChatWeb MCP tools are `UNAVAILABLE`, do not restart the shared runtime first. Classify by execution authority:

- Playwright MCP: verify `mcp-endpoints/playwright-chrome.url` and the single broker-owned upstream; do not direct-spawn another `@playwright/mcp --extension`.
- Local Dev: verify `mcp-endpoints/local-dev.url`, Broker v2 liveness/readiness, and current authority state; do not direct-spawn Desktop Commander or recreate a second Broker.

If a ChatWeb page, selected tab, or controlled-page set changes while the canonical raw Playwright owner remains READY, treat it first as the common multi-consumer Browser isolation problem, not as a ChatWeb product failure. Use the atomic Browser-scene rule and preserve already-proven product checkpoints.

The accepted F1 checkpoint must be reused during F2 recovery; do not reconstruct it by starting duplicate MCP servers.
