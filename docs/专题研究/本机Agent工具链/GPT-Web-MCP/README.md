# GPT Web MCP

本目录保留 GPT Web ↔ 本机 MCP 的工程历史和验证归档。`SOL-GWM-001-...md` 记录当时的 profile、持久化、故障与迁移过程，其中旧路径属于历史证据，不是当前配置模板。

当前 Source of Truth：

```text
scripts/gptweb-mcp
automation/gptweb-mcp/
tools/local-dev/
tools/codegraph/
tools/repomix/
tools/browser/
tools/mcp-shared-broker/
```

当前生成 profile 聚合到 `automation/gptweb-mcp/.runtime/profiles/`；四个 shared runtime 不再使用 `~/.config/tunnel-client/*.yaml` 作为 active configuration，也没有 gptweb-mcp LaunchAgent owner。实际操作必须回当前 workspace owner，不从历史归档复制旧启动方式。
