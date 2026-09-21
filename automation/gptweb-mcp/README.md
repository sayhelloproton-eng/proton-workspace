# gptweb-mcp automation

唯一 runtime 链路：

```text
scripts/gptweb-mcp
→ automation/gptweb-mcp/gptweb-mcp
→ tools/local-dev | codegraph | repomix | browser
```

四个 Tool service 自己声明 tunnel id、credential owner 和 MCP command；本目录只编排 `start|stop|restart|status|doctor|reconcile|watchdog` 与 Playwright Browser control 的 deterministic connect/recover。

## Public Browser readiness action

模型/项目 automation 正常只需要一个 Browser readiness 动作：

```text
python3 /Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/playwright-ready.py
```

它机械执行：

```text
canonical connect attempt
→ bounded runtime recover when needed
→ controlled-group ensure
→ READY | UNKNOWN
```

公开调用自己持有 Acceptance Browser run boundary + exclusive lease；被更高层 automation 调用时可使用内部 `--inside-boundary`，避免嵌套 lease。模型不再自己串 `connect-once / recover / group ensure`。

低层 owner 仍然分离：
- `playwright-recover.py`：bounded connect/start-or-restart/connect。
- `playwright-connect-once.py`：单次 handshake 原子动作。
- `tools/browser/playwright-controlled-group.py`：唯一通用 tab/group owner，负责 `ensure / list / adopt / create / duplicate / close`。

本目录不拥有 tab/group 实现，也不保留 rebind 兼容入口。

## Local Dev dedicated watchdog

Local Dev 的用户授权后台守护编号为 `LD-WD-001`，LaunchAgent label 为 `com.proton.gptweb-mcp.local-dev-watchdog`。它只守护 Local Dev，不守护 CodeGraph、Repomix 或 Playwright，也不创建第二套 runtime owner。

安装/刷新：

```text
/bin/zsh /Users/agent/Desktop/proton-workspace/automation/gptweb-mcp/install-local-dev-watchdog.sh
```

运行资产位于 `automation/gptweb-mcp/.runtime/`。Generated tunnel-client profiles 也只写这里；旧 `~/.config/tunnel-client/*.yaml` alias profile 不允许与当前 owner 共存。

除用户授权的 `LD-WD-001` 外，当前不维护 workspace 或外部 `gptweb-mcp` LaunchAgent。
