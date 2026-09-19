# gptweb-mcp automation

唯一链路：

```text
scripts/gptweb-mcp
→ automation/gptweb-mcp/gptweb-mcp
→ tools/local-dev | codegraph | repomix | browser
```

四个 Tool service 自己声明 tunnel id、credential owner 和 MCP command；本 automation 只编排 `start|stop|restart|status|doctor|reconcile|watchdog`。

## Local Dev dedicated watchdog

Local Dev 的用户授权后台守护编号为 `LD-WD-001`，LaunchAgent label 为 `com.proton.gptweb-mcp.local-dev-watchdog`。

它每 30 秒从 Local Dev 进程之外读取 tunnel-client 的 `health/local-dev.url` 并探测 `/readyz`。只有探测失败时才调用 canonical `gptweb-mcp restart local-dev`；它不调用 `status local-dev`，不守护 CodeGraph、Repomix 或 Playwright，也不创建第二套 runtime owner。恢复失败采用 15 秒起步、最长 300 秒的指数退避。

安装/刷新入口：

```text
/bin/zsh /Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/install-local-dev-watchdog.sh
```

运行日志和退避状态统一位于：

```text
/Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/.runtime/local-dev-watchdog/
```

## Playwright Browser control recovery

Playwright/Chrome 的跨 Chat 稳定恢复动作也由本目录统一拥有；Acceptance Skill 只决定是否允许恢复、需要哪种 Browser lease，以及目标业务 Tab 的 durable identity，不再自己维护 runtime lifecycle wrapper。

```text
playwright-connect-once.py
  → 只发起一次 canonical MCP browser_tabs(list)，建立/验证当前 handshake

playwright-recover.py
  → bounded recovery state machine
  → first connect-once
  → DOWN: gptweb-mcp start playwright-chrome → connect-once
  → READY but connect failed: gptweb-mcp stop → start playwright-chrome → connect-once
  → 最多一次 lifecycle intervention；仍失败则 fail closed

playwright-rebind-existing-tab.py
  → 只把一个已存在且 durable identity 唯一的业务 Tab 加回当前 Playwright group
  → 歧义时 fail closed；不创建业务 Tab
```

正常入口优先使用：

```text
python3 /Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/playwright-recover.py
python3 /Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/playwright-rebind-existing-tab.py --target-tab-id <tab-id>
```

`playwright-connect-once.py` 是 recovery 内部/诊断原子动作。不要在 Skill 中复制 `start/stop/status` wrapper；runtime lifecycle 始终调用本目录 `gptweb-mcp` owner。

## Generated profiles

`tunnel-client runtimes connect` 的生成 profile 必须定向到：

```text
/Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/.runtime/profiles/
```

它们是可重建 runtime projection，不是手工配置真源。以下旧 alias profile 不允许共存：

```text
~/.config/tunnel-client/local-dev.yaml
~/.config/tunnel-client/codegraph.yaml
~/.config/tunnel-client/repomix.yaml
~/.config/tunnel-client/playwright-chrome.yaml
```

`start/restart/reconcile/doctor/watchdog` 发现旧 profile 时 fail closed。第三方 `tunnel-client` 自己的 health/process/endpoint 状态仍位于 `~/Library/Application Support/tunnel-client/`。

除用户授权的 `LD-WD-001` 外，当前不维护 workspace 或外部 `gptweb-mcp` LaunchAgent。其他 Chat 不得自行恢复第二套 LaunchAgent、profile、broker、watchdog 或生命周期 owner。

通用 watchdog 状态留在 `automation/gptweb-mcp/.runtime/watchdog/`。Local Dev 专属 watchdog 状态留在 `automation/gptweb-mcp/.runtime/local-dev-watchdog/`。Local Dev 直接使用 tunnel-client 的 stdio MCP supervision，不启动 shared broker，不读写旧 authority state。
