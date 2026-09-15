# Browser Tools

`tools/browser/` 聚合跨项目复用的 Browser / UI 自动化基础能力，并拥有 gptweb-mcp 的 Playwright Chrome 具体实现。

当前资产：

- `gptweb-mcp-service.sh`：Playwright Chrome MCP runtime 的 start / stop / health / status 实现，并直接声明 tunnel id、credential 和 MCP command。
- `playwright-chrome-broker.sh`：Playwright MCP 对通用 `tools/mcp-shared-broker/` 的 Browser-specific launcher。
- `playwright-open-existing-chrome.sh`：只负责把合法 Extension connect URL 打开到现有 Chrome。

Playwright Chrome 不再依赖 `~/.config/tunnel-client/playwright-chrome.yaml`；该 profile 属于已退役的第二配置真源。通用 MCP Broker 不属于 Browser，位于 `tools/mcp-shared-broker/`；跨 Tool 的生命周期顺序、single-owner guard、watchdog 与恢复编排属于 `automation/gptweb-mcp/`。

Browser 产品逻辑、项目状态机、审批和 Acceptance 策略仍由对应产品或 Skill owner 负责。
