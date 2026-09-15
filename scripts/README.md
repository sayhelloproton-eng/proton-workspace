# Workspace Scripts

`scripts/` 是 workspace 的薄入口层；真实能力在 `tools/`，确定性编排在 `automation/`。

当前入口：

- `gptweb-mcp` → `automation/gptweb-mcp/gptweb-mcp`
- `dev-tunnel` → `automation/dev-tunnel/cli.mjs`

不是每个 Automation 都需要根级 wrapper。飞书知识发布和 ProFlow Extension reload 当前直接调用各自 `automation/` 路径，避免为了目录对称再造一层。

外部 `~/.local/bin` 若存在也只能是这些入口的投影，不能成为第二源码真源。
