# 14｜为什么基于 ChatGPT：从 Host 复用到自有 Control Plane

> 状态：`ACTIVE_RESEARCH / STRONG_EVIDENCE`
> 主题：回答 ProFlow 为什么长期保留 ChatGPT / Custom GPT 作为产品侧认知与交互 Host，同时又持续把 Task、Authority、Effect、Identity、Recovery 收回自己控制。
> 证据边界：历史仓库没有证明项目曾做过一份“Custom GPT vs 自建 Chat UI vs Claude vs 本地 Agent”的正式选型矩阵；本文只恢复 Git / 当时文档能够证明的真实路线，不虚构不存在的 bake-off。

## 1. 最早的问题不是“如何做一个聊天产品”

2026-07-28 第一份正式 `SOL-005` 已经把 MVP 问题定义得很窄：

> ChatGPT 是否能够通过 Custom GPT Action，安全、稳定、可审计地调用 Mac 本地能力。

第一条产品链因此是：

```text
用户
→ Custom GPT
→ GPT Action
→ Public Tunnel
→ Action Gateway
→ Mac Local Runtime
→ allowlisted Capability
→ structured result
```

项目从第一天就在验证“现成 AI Host 如何进入可信本机执行闭环”，而不是先建设自己的 Chat UI。

## 2. 从第一天起，Host 能表达意图，但不能直接获得机器权限

同一份 7 月 28 日计划没有把 Action 做成公网 Shell。

它先要求 Gateway 是公网唯一入口，Runtime 只在本机可达；认证成功后还必须经过 Capability allowlist。第一版 Runtime 明确禁止任意 Shell、任意路径，Tunnel 也禁止直接指向 Runtime。

阶段顺序甚至故意把 Custom GPT 配置放到最后：

```text
Contracts
→ Gateway
→ Auth
→ Policy
→ Runtime
→ first safe Capability
→ Gateway ↔ Runtime
→ Tunnel
→ Custom GPT Action
→ security review
```

也就是说，先证明安全执行底座，再让 GPT 接进来。

这个顺序从源头定义了 ProFlow 对 ChatGPT 的定位：**认知 Host 可以复用，机器 Authority 必须由自己的 Control Plane 掌握。**

## 3. 8 月 3 日的产品地图把“入口”和“系统”正式拆开

2026-08-03 的同期知识整理已经明确区分不同产品形态：

```text
Chat
= 讨论 / 分析入口

Project
= 长期会话组织

Custom GPT
= 可复用专业角色入口

Codex
= 仓库 / 终端 / 测试工程执行

API / Agent SDK
= 需要自有 UI、业务状态和运行时的产品构建入口
```

同一材料还直接写明：平台不是复制 ChatGPT 或 Codex，而是补齐入口之间缺失的 Task、Policy、Approval、Evidence、Recovery 等控制面。

这并不能证明 7 月 28 日之前做过完整产品选型，但可以证明：项目在核心实现刚启动后一周内，就已经把“复用 Host”与“自己拥有系统语义”明确区分。

## 4. Custom GPT 恰好提供了“角色 Host”所需的成熟能力面

8 月 5 日 Controller 设计把 Builder 可配置面映射成了项目资产：

```text
Name / Description / Starters
Instructions
Knowledge
Recommended Model
Capabilities
Apps / Actions
Authentication
Sharing / Publishing
Version History
```

这套 Host 已经提供了用户熟悉的对话入口、模型运行环境、专业角色包装、参考知识和外部 API 调用入口。

如果 ProFlow 的核心问题是 Task / Agent / Effect / Recovery，而不是重新设计一个聊天产品，那么先复用这些能力可以把工程预算集中到真正缺失的部分。

这里的价值是 **Product-surface reuse**，不是把第三方能力算成自研。

## 5. 但角色 Host 从来没有被允许成为运行状态数据库

8 月 5 日的 Controller 方案已经冻结：总控运行在 Custom GPT 中，但**总控本身无状态**；收到 `task_id` 后必须重新通过 Action 查询 Decision Context。

长期运行事实属于：

```text
Task / Plan / Event / Claim
→ Task Control

Git Profile / Instructions / Knowledge / Action definition
→ Agent Governance / Git

Conversation / Tab
→ Carrier location only
```

同一方案明确禁止把 ChatGPT 会话、GPT URL、浏览器标签页或旧聊天全文当 Task 状态真源。

因此 Custom GPT 的“记住这段对话”从一开始就不是系统可靠性的基础。即使换一个同角色 Conversation，只要重新取得 `task_id` 和当前 Owner facts，也应能继续工作。

## 6. Actions 的意义不是“让 GPT 有工具”，而是建立机器边界

正式 Controller 结果不从聊天正文解析，而是通过 Action / Gateway 提交结构化 Command。

Gateway 再根据认证凭据绑定真实 Profile / Role，模型自己填写的身份字段不能成为授权依据；Task Control 继续校验版本、Claim、状态迁移和 allowed command。

所以链路是：

```text
Custom GPT cognition
→ typed Action intent
→ authenticated Gateway
→ owner contract / policy
→ real capability or state mutation
→ structured result
```

而不是：

```text
模型说“我完成了”
→ 系统相信它
```

这让成熟 Host 的自然语言交互与 ProFlow 自己的机器语义之间形成 Anti-Corruption Layer。

## 7. Host 的限制没有被隐藏，而是变成新的平台能力

Custom GPT Action 是 request-response；外部系统不能把异步结果直接推入一个已经空闲的模型推理轮次。

项目没有因此放弃 Custom GPT，而是补出 Wake Bridge：

```text
Task signal
→ Browser 找到同角色 Worker Conversation
→ 注入最小 Wake
→ GPT 重新进入推理
→ Action 拉取 fresh authoritative context
```

同样，在线 Builder 配置会漂移，因此后来出现 Git Profile、release record、真实 Browser provisioning、g-id Role registration 与 carrier validation。

这是一种典型策略：**Host limitation becomes an adapter/recovery problem, not a reason to move business truth into the Host.**

## 8. Phase 3 没有抛弃 Custom GPT，而是继续拿走它不该拥有的 Authority

到 Phase 3，Product GPT 最初仍能查询 Registered Roles、动态选择 Dev/Test 并 `createTask`。

2026-08-15 v2.1 又把这些确定性能力迁回 Extension / Application：

```text
Application
→ create PENDING Task
→ establish fixed role slots
→ provision/bind Workers

Product Custom GPT
→ 在已有 Task 中理解与澄清 Requirement
→ 写正式 Requirement
→ 做角色内认知工作
```

这个变化很关键：系统越来越不依赖模型做确定性 bootstrap，但并没有因此重写一套聊天前端或替换 Custom GPT Carrier。

结论不是“GPT Authority 越多越智能”，而是：**Host 保留 cognition，Control Plane 收回 determinism。**

## 9. Agent Package 后来把外部 Host 也纳入 Deployment

08-24～25 的 Real-2 又把 Custom GPT 从“人工在线配置”推进成可部署外部资源。

平台需要 materialize：

```text
Name / Description / Instructions / Starters
Knowledge ZIP
Capabilities
Action Schema
Bearer Auth
```

再通过真实 Builder/Browser 创建 Private GPT，取得 g-id / carrierUrl，注册 durable Role 并做 Gateway/Carrier verification。

一旦 `LIVE_CREATED`，远端 GPT 就已经是不可逆现实资源；后续 validation failure 不允许简单回滚成本地 MISSING 再重复创建。

所以 Host-first 最终并不是“把 SaaS 当黑盒随便用”，而是把 SaaS 资源的 provisioning、identity、version 和 recovery 纳入自己的 Deployment Contract。

## 10. 研发侧 Chat 与产品侧 Custom GPT 必须继续分开

“项目基于 ChatGPT”最容易混淆的地方，是把研发 Chat 和产品 Custom GPT 当成同一个运行层。

```text
研发侧 Chat
→ 与 Project Owner 讨论产品、架构、计划、审计
→ 后来通过本机 Engineering Harness 使用 repo / browser reality

产品侧 Custom GPT
→ ProFlow 的版本化 Role / Worker Conversation Carrier
→ 通过 Actions + Gateway 消费 ProFlow Public Contracts
```

研发桥历史从人工 zip/本地 DS 一路演进到 MCP/CodeGraph/Browser/Repomix；产品桥则从 Custom GPT Action → Gateway → Local Capability，再增加反向 Wake。

两者共享 ChatGPT 产品环境，但解决的问题、身份、Context、Authority 和生命周期不同。

## 11. ProFlow Model Runtime 也不是 Custom GPT 的替代品

FAST / REASON Model Runtime 承担平台内部 bounded reasoning：结构化、受 ReasoningSpec 约束、可按 capability 选择本地/手机/LAN Provider。

Custom GPT Carrier 则承担用户可见的专业角色认知、Conversation 和 Actions。

因此：

```text
Custom GPT
≠ local model
≠ FAST / REASON Runtime
```

端侧小模型可以替换具体 Provider、承担高频受控判断，但它没有 Task / Approval / Browser / Agent Role Authority，也没有替代成熟 ChatGPT Host 的产品职责。

这种分层使“以后换模型”与“是否继续使用 ChatGPT 作为产品 Carrier”成为两个独立架构问题。

## 12. 能证明的“替代路线”边界是什么

当前历史仓库能证明，项目同期知道不同入口的职责差异：Codex 用于仓库/终端工程执行；API / SDK 适合需要自有 UI、业务状态和 Runtime 的产品；Custom GPT 适合专业角色入口。

但没有证据证明项目在 7 月 28 日之前正式实现并 A/B 过自建 Chat UI、Claude Carrier 或纯本地 Agent Controller。

因此不能说：

> “经过完整竞品评测后 Custom GPT 胜出。”

更准确的历史是：

> 项目先选择现成 ChatGPT / Custom GPT Host 验证最小可信 Agent 闭环；随着真实复杂度出现，持续把不该属于 Host 的状态和 Authority 外移，而不是先投入成本重建成熟交互层。

这是**演进路线判断**，不是不存在的 benchmark。

## 13. Host-first 的代价是必须承担 External Product Reality

复用 ChatGPT 并不等于零维护。

项目实际承担了：

```text
Builder 字段与配置漂移
Action / Auth / File transport 合同
GPT g-id 与 Conversation c-id identity
浏览器页面生命周期
公网入口与 Gateway 可达性
远端 GPT provisioning / validation / recovery
```

所以 Host-first 不是“省掉前端就结束”，而是把成本从通用 Chat 产品研发，转成 **外部 Host 的 Anti-Corruption、Provisioning、Verification 与 Recovery**。

这也是为什么后续 Browser Carrier、Gateway、Agent Package 和 Deployment 都需要真实 Reality Evidence。

## 14. 最终形成的架构模型：Host-first / Control-plane-owned

整条路线可以压成：

```text
ChatGPT / Custom GPT Host
→ interaction / cognition / role surface / native capabilities

ProFlow Control Plane
→ Task / Plan / Role Binding / Policy / Approval / Effect / Evidence / Recovery

Adapters
→ Actions / Gateway / Browser Carrier / File Bridge / Provider

Reality
→ Mac / Browser / external SaaS / model runtime
```

最核心的不变量是：

> **Reuse the Host; own the Control Plane.**

以及：

> **Host cognition is replaceable; business truth must remain portable.**

## 15. 它与第 02 / 11 条的边界

第 02 条回答的是“Chat、Custom GPT、Model Runtime 分别是什么，以及三条桥怎么连”。

第 11 条回答的是通用的 `REUSE / WRAP / BUILD / DELETE` Ownership 判断方法。

第 14 条专门回答：**为什么 ProFlow 产品长期保留 ChatGPT / Custom GPT 作为 Host，却没有把核心系统 Truth 一起交给 Host。**

因此三条关系是：

```text
02 = 分层与连接
11 = 通用复用方法
14 = ChatGPT Host-first 产品路线及其历史原因
```

它不是重复解释 Actions，也不是再次罗列 ChatGPT 功能，而是把“为什么基于 ChatGPT”恢复成一条可追问的架构演进。

## 16. Resume / Interview 边界

可以安全主张：

- 2026-07-28 从 Custom GPT Actions → Gateway → Local Runtime → allowlisted Capability 建立最小可信本机闭环，且从第一版就禁止 raw Shell / Runtime 直曝公网；
- 将 Custom GPT 定位为版本化、无状态的专业角色 Carrier，用 `task_id + fresh Decision Context` 恢复工作，而不是依赖聊天历史做状态数据库；
- 复用 Instructions / Knowledge / Capabilities / Actions / Auth 等成熟 Host 能力，把 Task / Policy / Approval / Effect / Evidence / Recovery 放在自有 Control Plane；
- 面对 Action request-response、Builder 漂移和 Conversation 生命周期限制，通过 Wake Bridge、Git Profile、Browser Carrier、provisioning/validation/recovery 吸收外部 Reality；
- Phase 3 持续把确定性 bootstrap Authority 从 Product GPT 迁回 Application，但保留 Custom GPT 的角色认知与交互价值。

必须保持边界：没有证据证明做过完整的 Custom GPT vs 自建 UI vs Claude/local Agent 正式 benchmark；ChatGPT / Custom GPT 的模型、UI、Builder、Actions 等是 OpenAI 产品能力，不归个人实现；当前可主张的是产品路线、边界设计、Control Plane、Adapter 与真实验证。

最适合总结这条经历的是：

> **Reuse the Host; own the Control Plane.**

> **Host cognition can move; business truth must stay portable.**
