# Tools

`tools/` 保存 workspace 级、跨项目可复用的可执行能力。

组织原则：**按能力 / 功能域聚合，不按协议、进程寿命或运行形态分类。** MCP、CLI、Broker、Adapter、Bridge、Helper 都只是实现形态，不再拆成顶层 `mcp/`、`cli/`、`services/`。

例如：

```text
tools/
├── browser/
├── local-dev/
├── feishu/
└── model/
```

只有真实能力存在时才创建对应域。命名可使用 `mcp-`、`cli-`、`broker-`、`adapter-`、`bridge-`、`helper-` 等前缀表达实现形态。

边界：

- 产品专属 Runtime、Gateway、Task Store、业务状态机继续留在对应产品仓库；
- workspace Tool 可以被 Skill、Automation、Scripts、人或多个项目共同调用；
- 长驻服务和一次性 CLI 都可以属于同一个能力域，不再为“service”另造顶层目录；
- 从 legacy 仓迁入的 Tool 必须先解除旧产品身份和路径耦合，并通过独立验证。

Microsoft Dev Tunnel CLI resolver、auth、lifecycle 与 readiness 已全部归 `@tomflow/proflow-dev-tunnel` npm package；`tools/dev-tunnel` 退役，避免形成第二实现。
