# ChatWeb Acceptance Automation

Load this reference only for ChatWeb acceptance involving MCP discovery or READ_ONLY MCP execution.

## Authority split

ChatWeb repository: `/Users/agent/Desktop/proton-workspace/repos/chatweb`.
Shared broker: `/Users/agent/Desktop/proton-workspace/repos/ai-agent-platform/apps/mcp-shared-broker`.

For ChatWeb Wave F, keep readiness and execution authority separate:

- `MCP_LOCAL_DEV_READY_URL_FILE` and `MCP_CHROME_READY_URL_FILE` prove only managed-runtime readiness through `/readyz`.
- The shared broker URL file is the execution authority and points to the actual loopback Streamable HTTP `/mcp` endpoint.
- Never derive `/mcp` by rewriting a tunnel-client readiness/operator URL.
- ChatWeb must not own a second raw Local Dev or Playwright MCP process/controller.

## Known Wave F path

Use this project-specific acceptance order:

1. prove the canonical shared runtime owner is READY;
2. prove the broker execution endpoint exists and is loopback-only;
3. start ChatWeb 4310 and prove it has no raw MCP child process;
4. prove `GET /chat/tools` exposes only Runtime-approved public metadata and enabled READ_ONLY MCP tools are AVAILABLE;
5. run a real ChatRun with a selected READ_ONLY MCP Tool;
6. prove at most one ToolInvocation with the real provider/tool/effect;
7. prove Browser Tool Drawer state matches the public/runtime state.

F1 discovery does not require model generation. F2 real one-hop execution is not complete from `/chat/tools` alone; it must execute through the normal ChatRun and model path.

## First divergence

If the canonical manager is READY but ChatWeb MCP tools are all `UNAVAILABLE`, do not restart the shared runtime first. Check whether ChatWeb confused the readiness URL with the broker execution endpoint. That mismatch is a ChatWeb runtime-integration defect, not proof that Local Dev or Playwright is disconnected.

The accepted F1 checkpoint must be reused during F2 recovery; do not reconstruct it by starting duplicate MCP servers.
