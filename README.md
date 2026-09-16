# proton-workspace

`proton-workspace` 是个人 AI 工程工作区，也是 workspace 级本机基础设施的唯一源码、配置和运行资产 owner。

## Boundary

- `repos/`：独立产品仓库，各自拥有 build / release / deploy / 产品 runtime。
- `skills/`：方法、判断、协议；不吞并可独立运行的执行器。
- `tools/`：跨项目可复用的原子执行能力。
- `automation/`：稳定、确定性的多步骤执行流程。
- `scripts/`：少量稳定的人类/系统薄入口。
- `assets/`、`docs/`：静态资源和长期知识材料。

## Single owner

ChatGPT Web 本机 MCP 只走：

```text
scripts/gptweb-mcp
→ automation/gptweb-mcp/
→ tools/local-dev | codegraph | repomix | browser
→ tools/mcp-shared-broker（需要时）
```

四个 Secure MCP runtime 的生成 profile 统一写到：

```text
automation/gptweb-mcp/.runtime/profiles/
```

`~/.config/tunnel-client/{local-dev,codegraph,repomix,playwright-chrome}.yaml` 是退役位置；发现即视为 ownership conflict。第三方 `tunnel-client` 自己不可迁移的状态仍允许位于 `~/Library/Application Support/tunnel-client/`。

当前不维护 `gptweb-mcp` LaunchAgent。其他 Chat 不得自行恢复 LaunchAgent、第二套 profile、broker、watchdog 或生命周期 owner。

Microsoft Dev Tunnel 走 `scripts/dev-tunnel → automation/dev-tunnel → tools/dev-tunnel`；ProFlow 产品自带 npm tunnel 不归这里接管。

飞书发布规则由 `skills/feishu-knowledge-publish/` 拥有，稳定机械流程由 `automation/feishu-knowledge-publish/` 执行，底层直接使用官方 `lark-cli`。ProFlow Extension 的稳定 reload 执行器由 `automation/proflow-browser-extension/` 拥有，Acceptance Skill 只拥有调用条件和 PASS 语义。

workspace 自有 runtime/cache/log 跟随 owner 聚合到 `tools/**/.runtime/`、`automation/**/.runtime/` 或对应 Skill 私有 evidence 目录。项目施工产物不得把 Engineering Skill `.runtime` 当公共临时目录。

## Environment boundary

`chat-local-engineering-protocol` 和 `chat-local-acceptance-automation-protocol` 只约束 ChatGPT Chat ↔ 本机工具链。Codex、DeepSeek 等继续使用各自原生工具和权限，不为了复用 Chat 协议改变自己的执行路径。
