# Skills

`skills/` 统一保存 `/Users/agent/Desktop/proton-workspace` 下的全部 AI Skills，包括跨项目通用 Skill 与项目专属 Skill。数量不是目标；触发准确、职责单一、边界明确、能在真实任务里复用才是目标。

## 当前 Skills

### Chat 专用协议

- `chat-local-engineering-protocol/`：ChatGPT Chat ↔ 本机工程执行协议。
- `chat-local-acceptance-automation-protocol/`：ChatGPT Chat 本机 Acceptance 自动化协议。

这两个 Skill **只服务 ChatGPT Chat**。Codex、DeepSeek 或其他本地 Agent 不受其执行 mechanics 约束，也不应为了兼容它们而放弃本地更直接的工具。

它们可以规定怎样选择、使用和验证 Local Dev / CodeGraph / Repomix / Browser，但不拥有这些 runtime 的启动实现。共享 MCP 生命周期唯一进入 `automation/gptweb-mcp/`，薄入口位于 `scripts/gptweb-mcp`。

### 项目专属

- `proflow-chat-loop/`：**仅服务 ProFlow** 的 Monitor Chat 持续迭代与 4h 前交接 Skill；不得用于 ChatWeb、Job Search System 或其它项目。

### 通用能力

- `chinese-technical-writing-naturalizer/`：在不损失事实与技术边界的前提下，让中文技术表达更自然、更具体、更像真实工程交流。
- `technical-document-writing/`：从读者任务、事实证据和叙事结构出发，把一篇技术文档写完整、写清楚、写得可验证。
- `engineering-retrospective/`：从真实开发、调试、验收和失败中识别少量值得长期复用的工程经验。
- `feishu-knowledge-publish/`：把本地 `docs/知识库/` 按同路径单向覆盖发布到飞书知识库。

## 边界

- 所有 Skill 统一位于 `/Users/agent/Desktop/proton-workspace/skills/`；项目专属 Skill 通过目录名、frontmatter、scope 规则和 self-test 明确限制项目边界，不在项目仓库另建第二份 Skill 真源。
- Skill 负责“什么时候做、为什么做、如何判断、什么算完成”，不吞并通用执行器。
- 通用机械能力进入 `tools/`；跨能力的确定性重复流程进入 `automation/`。
- 只用于 Skill 自身完整性检查的 validator / self-test 可以与 Skill 共置。
- 通用 Skill 不强制某个宿主采用 Chat-only 协议；执行方式由当前环境自己的工具和权限决定。
