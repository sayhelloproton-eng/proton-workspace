# Microsoft Dev Tunnel lifecycle

`automation/dev-tunnel/` 是 workspace 级 Microsoft Dev Tunnel 生命周期 owner，入口为 `scripts/dev-tunnel`。

它统一负责 CLI 解析、登录状态、必要时的 browser auth continuation、Tunnel create/reuse、HTTP port reconciliation、host start/status/stop/recover。产品只提供 tunnel identity、服务端口、访问策略与自己的 ingress/readiness 语义。

常用入口：`dev-tunnel --help`、`resolve`、`auth [--login]`、`ensure ID PORT [--public]`、`start|host|status|stop|recover ID`。`resource METHOD JSON` 是产品使用的稳定进程接口。

`CLI_ERROR`、timeout、UNKNOWN 都不会自动触发登录；只有明确的 `AUTH_EXPIRED` / `NOT_LOGGED_IN` 才能进入 browser auth，并在同一 owning CLI transaction 中复核登录。

CLI binary/cache 由 `tools/dev-tunnel/.runtime/cli/` 持有；host PID、日志和状态由 `automation/dev-tunnel/.runtime/` 持有。Microsoft Dev Tunnel 的 workspace 自有运行资产不再写入 `~/Library/Application Support/proton-workspace/`。

OpenAI Secure MCP Tunnel 与 Microsoft Dev Tunnel 是两个独立资源：前者服务 ChatGPT MCP，本目录只负责本机 HTTP 服务的 Microsoft Dev Tunnel 公网暴露。
