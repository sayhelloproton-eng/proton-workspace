# Tool Runtime, Browser Connection and Authentication

本 reference 只管 `CONNECT / AUTHENTICATE / RECOVER`。Tool infrastructure 不是产品状态。

## Canonical MCP owner

```text
/Users/agent/Desktop/proton-workspace/scripts/gptweb-mcp
→ automation/gptweb-mcp/
→ tools/local-dev | codegraph | repomix | browser
```

生成 profile 位于 `/Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/.runtime/profiles/`。`~/.config/tunnel-client/{local-dev,codegraph,repomix,playwright-chrome}.yaml` 是退役位置；四个 legacy alias profile 出现即 ownership conflict。第三方状态仍在 `~/Library/Application Support/tunnel-client/health/<alias>.url` 等 tunnel-client 自有目录。

`SHARED-RUNTIME-OWNER-FIRST`：先读 canonical owner，再决定 reconnect/recover。**Do not directly spawn a second raw MCP server**，也不要创建第二 LaunchAgent、watchdog、broker 或 Browser controller。当前 workspace 没有 gptweb-mcp LaunchAgent。

Local Dev 当前直接由 `tools/local-dev/gptweb-mcp-service.sh` 管理 tunnel-client → Desktop Commander stdio；它不经过 `mcp-shared-broker`，也不存在 Monitor/Chat authority、claim、lease 或 fencing。`mcp-shared-broker` 只属于共享 Browser/Playwright owner 边界。

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

owner READY 不等于 Browser control READY；`runtime_state=ready` 只证明 runtime 层。`browser_tabs` / snapshot 只能在 Acceptance 合同真的需要 Browser control 时使用，不能作为“已有 Extension 连接还活不活”的探针。已知连接存在且仍可读时，新出现 `connect.html` 是 duplicate handshake，应停在 TOOL_RUNTIME_FAILURE/HARNESS boundary；只有 owner authority 已证明旧 Browser control connection 不可用时，才允许恢复当前 canonical handshake。

## Playwright workspace automation — HARD RULE

Playwright/Chrome 的跨 Chat 正常恢复只有一个 model-facing 入口：

```text
python3 /Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/playwright-ready.py
```

它机械完成：

```text
canonical control probe
→ bounded Playwright runtime recovery when required
→ canonical controlled-group ensure
→ READY | UNKNOWN
```

公开调用自己持有 Browser run boundary + exclusive lease；项目级 automation 在已经持有边界时使用其内部组合接口，禁止模型手工嵌套 lease。

`playwright-recover.py`、`playwright-connect-once.py` 与 `tools/browser/playwright-controlled-group.py` 是底层 owner/诊断原子能力，不是正常模型编排面。项目若还需要把业务 tab 纳入工作集，必须调用项目自己的 canonical action（例如 ProFlow 的 `monitor-browser-step.mjs`），而不是模型直接拼 `ensure/adopt/create`。

通用 Browser owner 仍保证：只有一个 controlled group；durable identity 歧义 fail closed；新物理 carrier 固定 `about:blank → group → readback → navigation`；绝不因为 reconnect 复制业务资源。

旧 Welcome 页面可以残留，也可能显示历史 `connected`；它不是 current control authority。不要刷新/修补旧 relay，不要手改 `mcpRelayUrl`，不要硬编码 relay port/UUID，不要新建第二 controller/window/business tab，也不要仅凭 runtime READY 宣称 Browser control READY。

`playwright-ready.py` 返回 UNKNOWN 后停止自动恢复并重新识别 first divergence；不要再追加第二 transport。只有 native UI 明确证明存在 automation 无法安全完成的人机 debugger/consent 阻塞时，才请求用户执行那个单一不可替代动作。

## Credential

唯一 Browser credential owner：

```text
/Users/agent/Desktop/proton-workspace/tools/browser/.secrets/playwright-chrome.env
```

退役位置 `/Users/agent/.config/openai/tunnel-client/playwright-chrome.env` 和 `~/.config/tunnel-client/playwright-chrome.yaml` 不得重建为 active configuration。credential 变化只更新 Tool-owned 文件，绝不打印到 Chat、日志、截图证据或 telemetry。正常 stale-relay recovery 不要求用户复制 token；只有 current owner 明确证明 token mismatch 时才进入 credential repair。

## AUTHENTICATE

Browser auth 是 owning CLI/PTTY 的同一 transaction continuation：CLI 明确 AUTH_EXPIRED/NOT_LOGGED_IN → Browser 完成人机步骤 → 回到原 transaction → CLI 重新确认。timeout/UNKNOWN 不是“未登录”，不能触发盲目 login。

ProFlow Microsoft Dev Tunnel 统一由已安装 npm package `@tomflow/proflow-dev-tunnel` 拥有。正常入口是：

```text
node automation/proflow-maintenance/proflow-dev-tunnel-ready.mjs
```

Action 薄委托 workspace 已安装的 `node_modules/.bin/proflow-dev-tunnel reconcile --workspace <workspace> --json`，只消费结构化 receipt。若包要求 GitHub 授权，Browser 只完成人机授权并回到原 package transaction。Dev Tunnel auth 和 Playwright `connect.html` 是不同 surface。

## RECOVER

只修 first divergence 所属 Tool 层，然后回原产品 checkpoint。不要因为 Tool 断线重建产品资源、重复 business tab、修改产品代码或 restart 整条链。Browser control ownership 始终是 broker-owned 单一 `Playwright MCP` upstream；第二 controller 是竞争 owner，不是恢复手段。
