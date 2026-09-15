# Microsoft Dev Tunnel capability

`tools/dev-tunnel/` 只保存 Microsoft Dev Tunnel 的通用底层执行能力：固定版本 CLI resolver。它不拥有产品端口、服务拓扑、public/auth 决策、生命周期编排或产品 readiness。

CLI 二进制与校验元数据属于该 Tool 自己的本地运行资产，统一保存在 `tools/dev-tunnel/.runtime/cli/`，不再散落到 `~/Library/Application Support/proton-workspace/`。版本、平台选择、下载与 checksum 校验由 `cli-resolver.mjs` 负责。

跨步骤的 auth/create/reuse/host/status/recovery 生命周期属于 `automation/dev-tunnel/`；其 PID、日志和状态保存在 `automation/dev-tunnel/.runtime/`。产品通过 `scripts/dev-tunnel` 消费，不建立跨仓 package/link 依赖。`tools/dev-tunnel/cli.mjs` 已退役，避免 Tool 与 Automation 形成两个 CLI 入口。
