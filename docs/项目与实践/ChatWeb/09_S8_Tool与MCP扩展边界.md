# 09｜S8 Tool 与 MCP 扩展边界：先证明执行 ownership，再谈 Agent loop

状态：`S8 FINAL_ACCEPTED / implementation chatweb@84991250209a6d3271702e2b8938085a51cf30d4 / context chatweb@2af62fadb6fcaea9ecfdf6699678f976b90b2a03`

## 这一阶段真正解决什么

S8 不是“给 Chat 加几个工具按钮”，也不是提前实现一个 Agent 平台。它只回答一个架构问题：当外部能力不再是只读 Context，而是可能产生副作用、需要 approval、cancel、retry 和恢复时，ChatWeb 应该把执行权放在哪里。

S5 已证明 ContextProvider 是 generation 前 bounded read；S8 刻意不复用这条语义。Tool execution 被单独冻结成 server-side execution boundary：

```text
ToolProvider capability
        ↓
Trusted Runtime executable allowlist
        ↓
explicit invocation attempt
```

Browser、ModelProvider、ContextProvider 都不能直接拥有 Tool execution。

## 为什么 S8 不接入 ChatRun

当前没有真实 model tool-call producer，也没有 Browser tool-result consumer。如果此时为了“看起来完整”修改 ChatRun、SSE、Message、Artifact，就会先造一套没有 consumer 的 Agent framework。

因此 S8 明确不改 `@chatweb/chat-contract`、不新增 Tool SSE event、不把 ToolInvocation 写入 Conversation/Message/ChatRun，也不把 `ToolExecutionResult` 暴露给 Browser。只有未来真实 tool-call producer 与 execution consumer 出现，才做独立 Contract Amendment。

## 最小 Tool Contract 怎么定

Tool identity 使用 `providerId + toolName`。不同 Provider 可以有同名 Tool，同一 Provider 内 toolName 必须唯一。`ToolExecutionInput` 显式带 `runId/invocationId/toolName/arguments`，`AbortSignal` 由 Runtime 调用方传入；一次 `execute()` 只代表一次 invocation attempt。

Tool descriptor 额外声明 `effect = READ_ONLY | MUTATING`。这个字段不是 approval 的替代品，而是未来 Runtime policy 的输入。S8 不执行 mutating Tool，也不做 generic automatic retry，因为非幂等调用不能套用纯 Context 的重试假设。

## Final Review 抓到的 ownership 问题

第一版 `ToolProviderRegistry` 直接把 Provider 自己列出的 Tool 全部注册为可执行能力。这个设计对未来 MCP 很危险：MCP server 如果动态增加一个 `admin` 或 mutating Tool，Trusted Runtime 会在没有显式配置的情况下自动获得执行能力。

真正需要区分的是：

```text
provider discovery = 上游声称自己有什么
runtime allowlist   = 本系统允许执行什么
```

最终 Registry 改成 `register(provider, allowedTools)`。Provider 可以 discovery，但 discovery 不等于 enablement。测试特意让 `alpha` Provider 暴露 `search + admin(MUTATING)`，Runtime 只 allowlist `search`，此时 `alpha/admin` resolve 必须失败。

这个纠偏延续了 S3/S7 的同一原则：能力发现和执行授权是不同 ownership。

Final Review 随后又抓到第二个更隐蔽的问题：Registry 虽然 `Object.freeze` 了 descriptor 和 inputSchema 顶层，但 JSON Schema 常有嵌套 `properties/items`。调用方如果还持有原始嵌套对象，就能在注册后修改 schema，导致 executable allowlist 的契约发生漂移。最终改为注册时递归复制并冻结 JSON-compatible schema；循环、函数、undefined、非有限数字等非 JSON 值直接拒绝。新增测试证明外部把原 schema 的 `query.type` 从 string 改成 number 后，Registry 中仍保持 string，嵌套对象也处于 frozen 状态。
## MCP 为什么只是 adapter source

MCP 是一种外部 Tool capability/transport 来源，不是 ChatWeb 新的核心 Domain。未来 MCP adapter 的职责是把 MCP tool schema 映射成 generic `ToolDescriptor`，并把一次 Tool execution 映射成 MCP call；server URL、credential、process lifecycle 仍留在 Trusted Runtime。

Browser 不能直连任意 MCP server，也不能提交 MCP endpoint/key。S8 没有新增公开 MCP admin surface。

## 当前机械证据

最终候选 `pnpm test:s8` = API 31/31 + Web S7 regression 11/11 = **42/42 PASS**。API production build PASS。

source-only Architecture/Non-goal Gate 证明：ChatRun Tool import=0、Browser Tool surface=0、shared wire Tool surface=0、Model/Context coupling=0、Tool→Chat 跨边界 import=0、Nest Tool composition=0、MCP transport=0、Agent loop=0、Runtime executable allowlist ownership PASS、provider discovery 不等于 enablement、generated output=0、`git diff --check` PASS，最终 `S8_STATIC_GATE_FAIL=0`。

## 工程方法上的收获

“先建立抽象，再找真实 consumer”很容易制造半成品框架。S8 反过来：只实现已经能被验证的独立执行边界，并用大量 **0** 证明没有越界接入。这里的价值不在功能数量，而在于给未来 Tool/MCP/Agent 留下不会污染 Chat/Context 的稳定 seam。

## 可以用于面试的核心表达

“我没有把 MCP 当成另一种 RAG，也没有为了工具调用提前造 Agent loop。先把 ToolProvider 定义成一次显式 execution attempt，并把 capability discovery 和 executable allowlist 分权：Provider 只能声明能力，Trusted Runtime 决定哪些 Tool 真正可执行。Final Review 还抓到两类隐蔽风险：第一版 Registry 会自动信任 Provider discovery；修正后即使 MCP server 新增 mutating tool，也不会自动获得执行资格。随后又发现 shallow freeze 会让嵌套 Tool schema 在注册后被外部引用改写，最终改成 JSON-compatible deep clone + deep freeze。”

当前状态：S8 已 Final Accepted。implementation=`chatweb@84991250209a6d3271702e2b8938085a51cf30d4`，context baseline=`chatweb@2af62fadb6fcaea9ecfdf6699678f976b90b2a03`；执行门已进入 S9 Public Delivery / Operations。
