# Tool Runtime, Browser Connection and Authentication

本 reference 只管 `CONNECT / AUTHENTICATE / RECOVER`。Tool infrastructure 不是产品状态。

## Canonical MCP owner

```text
/Users/agent/Desktop/proton-workspace/scripts/gptweb-mcp
→ automation/gptweb-mcp/
→ tools/local-dev | codegraph | repomix | browser
```

生成 profile 位于 `/Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/.runtime/profiles/`。`~/.config/tunnel-client/{local-dev,codegraph,repomix,playwright-chrome}.yaml` 是退役位置；四个 legacy alias profile 出现即 ownership conflict。第三方状态仍在 `/Users/agent/Library/Application Support/tunnel-client/health/<alias>.url` 等 tunnel-client 自有目录。

`SHARED-RUNTIME-OWNER-FIRST`：先读 canonical owner，再决定 reconnect/recover。**Do not directly spawn a second raw MCP server**，也不要创建第二 LaunchAgent、watchdog、broker 或 Browser controller。当前 workspace 没有 gptweb-mcp LaunchAgent。

Local Dev 由 `tools/local-dev/gptweb-mcp-service.sh` 管 tunnel-client + workspace `mcp-shared-broker`；Broker endpoint 位于 tunnel-client 的 `mcp-endpoints/local-dev.url`。runtime readiness 和 MCP execution endpoint 是不同 authority。

Playwright canonical chain：

```text
gptweb-mcp
→ automation/gptweb-mcp/.runtime/profiles/playwright-chrome.yaml
→ tools/browser/playwright-chrome-broker.sh
→ tools/mcp-shared-broker
→ one @playwright/mcp --extension
→ Playwright Extension → Chrome
```

Single process owner 不等于 per-consumer session isolation。多个 consumer 只能复用受支持的 broker surface；不得通过再起一个 controller 修 session bleed。

## Shared Browser guard

真实 Browser-control run：`AUTOMATION_START → shared lease → ACT/SEE/VERIFY → AUTOMATION_RUN → release`。Extension/Chrome/gptweb/tunnel-client/broker restart、Extension reload 或需要 restart 的 credential rotation 都必须先升级 `exclusive`。冲突时报 `SHARED_BROWSER_IN_USE`，不得抢 lease、杀其他 run 或重启共享 owner。

owner READY 不等于 Browser control READY；`runtime_state=ready` 只证明 runtime 层。`browser_tabs` / snapshot 只能在 Acceptance 合同真的需要 Browser control 时使用，不能作为“已有 Extension 连接还活不活”的探针。已知连接存在时，新出现 `connect.html` 是 duplicate handshake，应停在 TOOL_RUNTIME_FAILURE/HARNESS boundary。

## Credential

唯一 Browser credential owner：

```text
/Users/agent/Desktop/proton-workspace/tools/browser/.secrets/playwright-chrome.env
```

退役位置 `/Users/agent/.config/openai/tunnel-client/playwright-chrome.env` 和 `~/.config/tunnel-client/playwright-chrome.yaml` 不得重建为 active configuration。credential 变化只更新 Tool-owned 文件，绝不打印到 Chat、日志、截图证据或 telemetry。

## AUTHENTICATE

Browser auth 是 owning CLI/PTTY 的同一 transaction continuation：CLI 明确 AUTH_EXPIRED/NOT_LOGGED_IN → Browser 完成人机步骤 → 回到原 transaction → CLI 重新确认。timeout/UNKNOWN 不是“未登录”，不能触发盲目 login。

Microsoft Dev Tunnel 统一走 `/Users/agent/Desktop/proton-workspace/scripts/dev-tunnel auth [--login]`。Dev Tunnel auth 和 Playwright `connect.html` 是不同 surface。

## RECOVER

只修 first divergence 所属 Tool 层，然后回原产品 checkpoint。不要因为 Tool 断线重建产品资源、重复 business tab、修改产品代码或 restart 整条链。Browser control ownership 始终是 broker-owned 单一 `Playwright MCP` upstream；第二 controller 是竞争 owner，不是恢复手段。
