# Provider、Context、RAG、Citation 如何组合而不泄漏运行时

ChatWeb 的 Provider（能力提供者）体系有一条贯穿始终的安全边界：Browser 可以选择公开能力，但 endpoint、credential、timeout、模型映射、Context budget 和上游私有结构属于 Trusted Runtime（可信运行时）。这条边界不是一开始就完全清楚，而是在 Context 顺序漂移、Settings outage（设置发现接口故障）、跨仓策略复制和 Citation 字段泄漏几次真实问题里逐步收紧的。

从这些过程回头看，最终原则很稳定：**产品选择权可以公开，运行时管理权不能顺手暴露。** Browser 应该知道“我能选什么、这一轮发生了什么”，却不需要拥有后端连接方式和内部策略。

## ModelProvider 与 ContextProvider 为什么必须先分开

`ModelProvider`（模型提供者：执行流式文本生成的边界）处理长连接、delta（增量输出）、cancel 和 provider failure。`ContextProvider`（上下文提供者：在 generation 前做一次受限只读解析的边界）返回 `AVAILABLE | NO_CONTEXT`，并带 generic provenance（通用来源信息）。

Browser 只提交公开 selection（选择），例如 Context 的 `providerId + required|optional`；真正的 base URL、secret、timeout、maxCharacters 留在 Runtime registry（运行时注册表）。

这一步先把“用户选能力”和“服务怎么连接能力”分开，后面的故障处理才有明确 Owner。

## 一次顺序漂移为什么证明 Context composition 必须归 Runtime

一个 Run 可以选择 0..N Context Provider。Provider 只回答“我自己的 Context 是什么”，Runtime 决定：

- selection 顺序；
- required / optional failure policy；
- 每个 provider 的冻结 budget；
- 哪些结果最终进入 generation；
- degradation 怎样记录。

早期实现一度把顺序漂成 registry registration order（注册顺序），而且测试也跟着错误实现写。最终用“注册顺序与请求顺序相反”的 fixture（测试夹具）证明 selection array 顺序才是 frozen fact（被冻结的请求事实）。

这次事故很重要：**测试全绿也可能只是实现和测试一起漂了。** 当实现、测试和设计发生冲突时，仍要回到真正的事实 Owner。

## required 与 optional 为什么是不同产品承诺

用户显式选择 required Context 时，Provider 失败或 `NO_CONTEXT` 必须在 Model generation 前 fail closed（失败即停止）；optional 则允许继续，但必须留下 degradation fact（降级事实）。这样系统不会在用户明确说“要用这份知识”的情况下偷偷退化成普通模型记忆回答。

Context 正文作为 Runtime-owned SYSTEM generation message（运行时拥有的系统生成消息）进入模型，但不写进 Conversation Message history。它是外部不可信参考数据，不是用户说过的话，也不是 Runtime instruction authority（运行时指令权威）。

## 一次 Discovery outage 怎样修正了 Settings 语义

设置能力上线后，Browser localStorage 只保存 model capability key、Context providerId 和 required / optional；不会保存 endpoint、API key、timeout 或 budget。

随后一次真实 outage 让边界更清楚：

```text
discovery success + [] → 权威确认当前没有 provider，可清 stale preference
discovery failure      → 当前不知道 allowlist，不能当成“provider 已删除”
```

第一版把 503 当空列表，导致用户 Context preference 被永久擦除。第一次修复又因为禁止全部写回而误伤 Model preference。最终按 capability ownership（能力归属）拆开：Context outage 只让当前页 Context fail closed，Model preference 仍可保存；last-known Context 只保留安全 selection 字段。

这次过程说明，`unknown`（当前不知道）不能为了代码简单被压成 `empty`（权威确认为空）。

## RAG Adapter 为什么只消费 Public Contract

`ProFlowRagHttpContextProvider` 不 import RAG Domain，也不读 pgvector / Chunk / Snapshot。它只把 public RAG response 映射成 ChatWeb 的 generic `ContextResult`。

ChatWeb 曾复制 RAG 的 Context ceiling `25748`，后来删除：consumer（消费者）只拥有 request budget，provider（提供者）拥有 capability ceiling。这里修掉的是跨仓 policy（策略）双真源，而不是一个普通常量重复。

## 一次 Citation 泄漏为什么推动 explicit projection

Citation（引用）来源于 Runtime 已解析的 provenance，而不是从模型回答文本猜 URL。内部事实可能需要 `providerId`、ToolInvocation identity 等字段做追踪，但 Browser 不应该自动获得这些内部 owner 信息。

一次真实 Browser Review 发现 `message.citations[].providerId="web"` 被原样 JSON 序列化进 public SSE。正确修复不是删内部 provenance，而是建立 `explicit projection`（显式投影：逐字段 allowlist 地把内部对象映射成公开 DTO）：

```text
internal Citation / Tool facts
        ↓ allowlist projection
PublicCitation { id, label, href, locator, contextItemId }
        ↓
Browser
```

Browser parser 同样拒绝额外字段；URL 只接受安全的绝对 HTTP / HTTPS 且拒绝 credential。内部模型继续保留丰富事实，公开 Contract 保持最小。

## 最终安全边界是怎样被这些事故收敛出来的

Browser 能知道“有哪些能力、我选了什么、这一轮发生了什么、来源在哪里”；它不需要知道“后端连哪台机器、密钥是什么、RAG 怎么切 Chunk、Search provider 怎么配置、模型真实 ID 怎样映射”。

这不是为了隐藏实现细节而隐藏，而是 Context 顺序漂移、discovery outage、跨仓策略复制和 Citation 泄漏几次问题共同验证出的边界：**产品选择权和运行时管理权必须属于不同 Owner。**
