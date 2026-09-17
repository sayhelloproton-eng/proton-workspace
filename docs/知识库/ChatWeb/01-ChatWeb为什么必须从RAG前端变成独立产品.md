# ChatWeb 为什么必须从 RAG 前端变成独立产品

“给 RAG（检索增强生成）加一个聊天页面”是很自然的起点，但如果产品继续沿这条路径生长，Conversation（会话）、Streaming（流式输出）、模型选择、Retry（重试）、Citation（引用）、Settings（设置）甚至工具执行都会逐渐围绕 RAG API 组织。短期开发很快，长期却会把“聊天产品”变成“某个知识服务的 UI”。

ChatWeb 最关键的第一步因此不是挑 React 组件，而是重新定义 ownership（职责归属：哪类事实和生命周期由哪个系统负责）。判断边界是否真的成立也很直接：**把 RAG 拔掉以后，普通 Chat 还能不能完整工作？**

```text
ChatWeb
  = Chat UI
  + Conversation / ChatRun
  + Model generation / Streaming
  + Search / Attachment / Voice
  + Product UX

ProFlow RAG
  = Knowledge build
  + Retrieval / Evidence / Context / Citation
```

## “两个仓库”不等于两个系统，能独立运行才算真正拆开

ChatWeb 有一条重要 System Invariant（系统不变量）：RAG adapter（适配器）可以完全移除，普通 Chat 仍能通过 Model Provider（模型提供者：负责真正生成回答的外部能力接口）运行。

因此 ChatWeb 不拥有 Corpus（语料集）、Chunk（知识片段）、Embedding（向量表示）、pgvector 或 Knowledge Snapshot（知识快照）构建；ProFlow RAG 也不拥有 Conversation、Message（消息事实）、ChatRun（一次生成尝试）、模型生成、流式协议或 Browser UI。两边通过 Context Provider Contract（上下文提供者接口契约）连接，而不是共享数据库或直接 import 对方内部 TypeScript 类型。

这个约束比“代码分别放在两个仓库”更强，因为它要求任意一边内部重构时，另一边只要公开契约不变就不需要跟着修改。

## Model、Context 和 Tool 看起来都叫“能力”，生命周期却完全不同

早期最诱人的抽象是做一个万能 `CapabilityProvider.execute()`，让各种能力都走同一套接口。最终没有这样做，因为三个场景的生命周期和失败语义差异很大：

```text
Model Provider
  → 长连接 Streaming / Cancel / partial failure

Context Provider
  → generation 前的 bounded read（受预算只读解析）

Tool execution
  → 可能有副作用 / Approval（审批）/ retry / recovery（恢复）
```

它们可以共享 descriptor metadata（能力描述元数据），但不能为了接口整齐而抹平行为 Contract。后来的 Web Search 也遵守同一原则：Runtime 可以在内部复用 invocation（一次调用）抽象，却不会因此把 Browser 暴露成通用 Tool 平台。

## ChatWeb 真正拥有的是聊天事实和一次生成怎样完成

Conversation（会话：一组按顺序发生的用户与 Assistant 消息）、Message（内容事实）和 ChatRun（一次生成尝试）构成 Chat Domain（聊天领域模型）。Runtime 负责决定并记录：

- 一次 ChatRun 使用什么生成模式；
- 生成前解析哪些 Context；
- Streaming 事件怎样映射成 Assistant Message；
- Stop 怎样向上游传播；
- Retry 怎样产生新的 attempt（尝试），而不是改写旧 run；
- required / optional Context 失败后是否继续；
- Search 什么时候需要继续、最多做多少轮；
- terminal state（终态）何时成立。

Browser 只消费 public contract（公开接口契约）并维护 presentation state（界面展示状态），不成为这些业务事实的第二个数据库。

## 部署位置后来证明也是架构输入，不只是运维细节

早期架构曾基于“一个 Public Web deployable（可部署单元）”选择 Next.js 全栈单体。补齐真实交付目标后才发现：Frontend（前端）既要在 localhost 运行，也要部署到 ChatGPT Sites；Trusted Backend（可信后端）则必须留在本机持有 secret（密钥和私有配置），再通过受控 HTTPS gateway（网关）暴露 API。

于是拓扑调整为：

```text
Next.js static frontend
  ├─ localhost
  └─ ChatGPT Sites
        ↓ HTTPS
NestJS Trusted Runtime
  └─ local loopback → controlled gateway
```

这次纠偏发生在大量业务代码之前，成本很低，却留下一个长期有效的架构判断：**系统边界不能只从源码模块推导，部署位置、网络边界和 secret location（私有配置放在哪里）同样是一等输入。**

## 产品独立以后，RAG 接入反而更简单

ChatWeb 先建立 provider-neutral Context Runtime（不绑定某个具体知识服务的上下文运行机制），等 ProFlow RAG 的公开契约稳定后，再补一个最小 HTTP adapter。最终 zero-RAG（不开启知识服务）、required RAG（必须成功）、optional unavailable（可选但不可用）和 required unavailable（必选但不可用）四条真实链都被验证。

这条路径比直接 import RAG 内部 Service 多了一层契约设计，却换来了真正的独立演进：RAG 更换索引策略不会迫使 Chat UI 改；ChatWeb 增加 Thinking、Voice 或 Search，也不会把聊天产品职责倒灌回知识服务。

从外部看，这个项目最值得关注的不是“拆了两个仓库”，而是**用可拔除性、公开契约和真实失败场景证明了边界确实存在**。
