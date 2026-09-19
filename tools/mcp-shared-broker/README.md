# MCP Shared Browser Broker

只负责多个 Chat / consumer 共享一个 Chrome / Browser owner，不负责 Local Dev、Monitor ownership 或 mutation authority。

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

## Health

`/healthz` 只表示 Broker 进程存活；`/readyz` 只有在至少一个 upstream MCP client session 已连接后才返回 `200 ready`。`MCP_BROKER_URL_FILE` 只在 downstream listener 存活期间存在。

## Current workspace use

`tools/browser/playwright-chrome-broker.sh` 启动 Browser shared owner。Local Dev 直接走 tunnel-client stdio MCP，完全独立。历史 authority 配置及 state 不再读取。

## Build and verify

```bash
pnpm --dir tools/mcp-shared-broker test
```

本工具是独立 workspace Tool，不吸收 `repos/**` 的产品 package graph。
