# Automation

`automation/` 保存 workspace 级、可重复执行的确定性工作流；它回答“怎样稳定跑完已经定义好的步骤”，不拥有工程判断。

当前 owner：

- `gptweb-mcp/`：四个 Secure MCP runtime 的生命周期与 watchdog，以及 Playwright Browser control 的 deterministic connect / recover / rebind。
- `dev-tunnel/`：Microsoft Dev Tunnel 的 auth / ensure / host / recover。
- `feishu-knowledge-publish/`：Wiki 路径解析/创建、图片预上传、token body、overwrite、UNKNOWN reconciliation。
- `proflow-browser-extension/`：ProFlow Extension registration/probe/reload/version reconciliation，以及 Monitor owner/session/observation/structured-log 的只读 Debug Collector。

规则：不复制 `tools/` 原子能力；不把判断/方法论塞进 automation；项目专属但跨 Chat 必须保持唯一 owner 的稳定机械路径可以放这里，避免不同 Chat 各造一套互相抢占。Skill 只保留策略、权限和验收语义；跨 Skill 的稳定 runtime/recovery 工作流优先下沉到这里。
