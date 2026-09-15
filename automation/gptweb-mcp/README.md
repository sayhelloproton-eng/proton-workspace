# gptweb-mcp automation

唯一链路：

```text
scripts/gptweb-mcp
→ automation/gptweb-mcp/gptweb-mcp
→ tools/local-dev | codegraph | repomix | browser
```

四个 Tool service 自己声明 tunnel id、credential owner 和 MCP command；本 automation 只编排 `start|stop|restart|status|doctor|reconcile|watchdog`。

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

当前没有 workspace 或外部 `gptweb-mcp` LaunchAgent。其他 Chat 不得自行恢复 LaunchAgent；以后若用户重新要求后台自启动，应另开工程决策。

watchdog 状态留在 `automation/gptweb-mcp/.runtime/watchdog/`。Local Dev Broker 日志留在 `tools/local-dev/.runtime/logs/`。
