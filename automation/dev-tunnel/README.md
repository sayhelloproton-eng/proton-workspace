# Microsoft Dev Tunnel lifecycle

`automation/dev-tunnel/` 是 workspace 级 Microsoft Dev Tunnel 生命周期 owner，入口为 `scripts/dev-tunnel`。

## Public readiness action

正常模型/项目 automation 不再自己编排 auth / ensure / host / status：

```text
scripts/dev-tunnel ready <TUNNEL_ID> <PORT> [--public]
```

固定状态机：

```text
auth reality
→ tunnel create/reuse
→ HTTP port reconcile
→ local host owner reuse/start
→ public URL readback
→ remote hostConnections readback
→ READY
```

只有明确 `AUTH_EXPIRED / NOT_LOGGED_IN` 才进入 browser auth；timeout / UNKNOWN 不会盲目登录、重建 Tunnel 或重复 host。发现非本机 owner 的 existing remote host 时 fail closed。

低层诊断/owner 操作仍保留：`resolve`、`auth [--login]`、`ensure ID PORT [--public]`、`start|host|status|stop|recover ID`、`resource METHOD JSON`。这些不是正常模型主路径。

CLI binary/cache 由 `tools/dev-tunnel/.runtime/cli/` 持有；host PID、日志和状态由 `automation/dev-tunnel/.runtime/` 持有。OpenAI Secure MCP Tunnel 与 Microsoft Dev Tunnel 是两个独立资源。
