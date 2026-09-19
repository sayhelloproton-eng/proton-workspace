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

Playwright/Chrome 的跨 Chat 稳定机械恢复统一由 workspace automation owner 承担：

```text
/Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/
```

Skill 不再维护 `runtime-start/runtime-stop/runtime-status` wrapper，也不临场拼 relay URL、端口、PID 或 MCP transaction。Skill 只负责：先证明恢复动作被允许、获取正确 Browser lease、识别业务目标身份、决定是否需要 RECOVER；一旦进入恢复，机械步骤交给 automation。

正常恢复入口：

```text
python3 /Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/playwright-recover.py
```

该入口是 bounded state machine：先执行一次 canonical `browser_tabs(list)` handshake；若失败，读取 canonical runtime 状态；DOWN 时只 `start` 一次，READY 但 control 失败时只 `stop → start` 一次；然后再连接一次。整个调用最多一次 lifecycle intervention，仍失败即 fail closed，重新识别 first divergence，不追加第二 transport。

连接恢复后，如果原业务 Tab 不在当前受控组，只允许对**已存在且 durable identity 唯一**的原 Tab 执行：

```text
python3 /Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/playwright-rebind-existing-tab.py --target-tab-id <owner-tab-id>
```

也可使用 exact URL / Chat ID 等 durable selector；歧义时 automation 必须 fail closed。`playwright-connect-once.py` 是同一 automation owner 下的低层原子动作，通常只由 recovery 或诊断调用，不是新的 Skill runtime owner。

旧 Welcome 页面可以残留，也可能继续显示历史 `connected`；它不是当前 control authority。不要刷新/修补旧 relay，不要手改 `mcpRelayUrl`，不要硬编码 relay port/UUID，不要新建第二 controller/window/business tab，也不要仅凭 runtime READY 宣称 Browser control READY。真实恢复完成仍要求 canonical Browser tool 能返回，并在合同需要时证明目标业务页可读。

如果 workspace recovery 仍失败，停止自动恢复并重新识别 first divergence。只有当前 native UI 明确证明存在 automation 无法安全操作的人机 debugger/consent 阻塞时，才请求用户执行那个单一不可替代动作。

## Credential

唯一 Browser credential owner：

```text
/Users/agent/Desktop/proton-workspace/tools/browser/.secrets/playwright-chrome.env
```

退役位置 `/Users/agent/.config/openai/tunnel-client/playwright-chrome.env` 和 `~/.config/tunnel-client/playwright-chrome.yaml` 不得重建为 active configuration。credential 变化只更新 Tool-owned 文件，绝不打印到 Chat、日志、截图证据或 telemetry。正常 stale-relay recovery 不要求用户复制 token；只有 current owner 明确证明 token mismatch 时才进入 credential repair。

## AUTHENTICATE

Browser auth 是 owning CLI/PTTY 的同一 transaction continuation：CLI 明确 AUTH_EXPIRED/NOT_LOGGED_IN → Browser 完成人机步骤 → 回到原 transaction → CLI 重新确认。timeout/UNKNOWN 不是“未登录”，不能触发盲目 login。

Microsoft Dev Tunnel 统一走 `/Users/agent/Desktop/proton-workspace/scripts/dev-tunnel auth [--login]`。Dev Tunnel auth 和 Playwright `connect.html` 是不同 surface。

## RECOVER

只修 first divergence 所属 Tool 层，然后回原产品 checkpoint。不要因为 Tool 断线重建产品资源、重复 business tab、修改产品代码或 restart 整条链。Browser control ownership 始终是 broker-owned 单一 `Playwright MCP` upstream；第二 controller 是竞争 owner，不是恢复手段。
