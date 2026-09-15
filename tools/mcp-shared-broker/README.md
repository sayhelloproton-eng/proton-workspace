# MCP Shared Broker

`tools/mcp-shared-broker/` 是 workspace 级通用 MCP 基础工具，不属于 Browser 或 Local Dev。任何 MCP Tool Server 需要稳定的单一进程 owner、同时服务多个下游 client/session 时，都可以复用它提供的 stdio / loopback Streamable HTTP 传输桥；authority v2 是可选能力，不绑定某个具体 Tool。

## Upstream modes

- `stdio`（默认）：所有下游 session 共享一个 lazy upstream stdio MCP client/process，适合无状态或允许共享 upstream session 的 Tool Server；
- `streamable-http`：Broker 启动一个 upstream process，但每个下游 MCP session 获得独立 upstream Streamable HTTP `Client`，用于需要保留 consumer session identity 的有状态 Server。

Broker 只转发标准 `tools/list` 与 `tools/call`。它不拥有产品审批、ChatRun、业务状态机或 Browser 业务策略。

## Core configuration

- `MCP_BROKER_ID`
- `MCP_BROKER_URL_FILE`
- `MCP_BROKER_MANAGER_STDIO`：默认 `true`；HTTP-only sidecar 设置为 `false`
- `MCP_BROKER_UPSTREAM_TRANSPORT`：`stdio` 或 `streamable-http`
- `MCP_BROKER_UPSTREAM_COMMAND`
- `MCP_BROKER_UPSTREAM_ARGS_JSON`
- `MCP_BROKER_UPSTREAM_URL`：仅 `streamable-http` 使用，必须为 loopback HTTP
- `MCP_BROKER_UPSTREAM_CLIENT_NAME`
- `MCP_BROKER_UPSTREAM_ENV_PASSTHROUGH`
- `MCP_BROKER_UPSTREAM_CWD`
- `MCP_BROKER_CONNECT_TIMEOUT_MS`

## Authority v2

Authority v2 只有在以下配置同时存在时启用：

- `MCP_BROKER_AUTHORITY_CONTROLLER_TOKEN_FILE`
- `MCP_BROKER_AUTHORITY_STATE_FILE`
- `MCP_BROKER_AUTHORITY_READ_ONLY_TOOLS_JSON`

状态文件使用 `mcp-broker-authority-state-file.v2`。运行态为 `OPEN | ACTIVE | ROTATING`，绑定模式为：

```text
BOOT_READ
ACTIVE_MUTATION
HANDOFF_READ
```

Controller 使用 loopback-only `/authority/v2/status`、`/downgrade`、`/prepare`、`/promote`、`/revoke`。下游 HTTP consumer 通过 `broker_authority_claim` 把预先准备的 binding 绑定到自己的 MCP session；claim 后只返回 binding / lease refs，不签发可继续传递的 bearer authority token。

在 `BOOT_READ` 与 `HANDOFF_READ` 中只允许显式配置的 read-only tools，并拒绝读取 authority state/token 受保护路径；`ACTIVE_MUTATION` 才允许正常 mutation。Broker restart 后持久化 binding 仍在，但旧 session 不再被视为 live，可按同一 claim 重新绑定到恢复后的 consumer session。

旧的 `MCP_BROKER_AUTHORITY_EFFECTFUL_TOOLS_JSON` 属于 v1 配置，v2 会 fail closed，不做静默迁移。

## Health

`/healthz` 只表示 Broker 进程存活；`/readyz` 只有在至少一个 upstream MCP client session 已连接后才返回 `200 ready`。`MCP_BROKER_URL_FILE` 只在 downstream listener 存活期间存在。

## Current workspace use

- `tools/local-dev/broker-v2.sh`：HTTP-only Local Dev Broker v2 sidecar；
- `tools/browser/playwright-chrome-broker.sh`：Playwright Chrome 的 broker-owned upstream。

## Build and verify

```bash
pnpm --dir tools/mcp-shared-broker test
```

本工具是独立 workspace Tool，不吸收 `repos/**` 的产品 package graph。
