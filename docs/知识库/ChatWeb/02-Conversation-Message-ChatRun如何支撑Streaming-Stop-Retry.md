# Conversation、Message、ChatRun 如何支撑 Streaming、Stop、Retry

一个最小聊天页面可以只保存 `messages[]`。但只要加入 Streaming（流式输出）、失败、Stop（用户主动停止）和 Retry（重试），就会遇到一个领域问题：**用户看到的一条 Assistant Message（助手消息），和生成这条消息的一次执行尝试，不再是同一个事实。**

ChatWeb 用三个对象把它拆开：`Conversation`（会话：消息发生的长期容器）、`Message`（内容事实：用户或 Assistant 已经产生的内容）和 `ChatRun`（生成尝试：一次具体模型执行及其状态）。这一步看起来只是数据建模，却决定了后面的停止、失败恢复、上下文和重试能不能保持历史一致。

## Message 记录“发生过什么”，ChatRun 记录“这次怎么生成”

Conversation 保存消息顺序和当前 active run（正在执行的生成尝试）；User Message 表达用户真正提交的内容；Assistant Message 表达用户已经看到的输出。ChatRun 则冻结一次 execution selection（执行选择），例如使用什么模式、解析哪些上下文、怎样结束，以及它是否由另一个 run 重试而来。

```text
User Message
   ↓ trigger
ChatRun #1 → Assistant Message #1 (CANCELLED / partial)
   ↓ retryOfRunId
ChatRun #2 → Assistant Message #2 (COMPLETED)
```

Retry 不改写旧 run，也不追加第二条 User Message。于是“第一次尝试被取消”和“同一个问题后来成功生成”可以同时保留下来，而不是为了展示最终答案把真实失败覆盖掉。

## Streaming 不是不断追加字符串，而是一条有终点的协议

SSE（Server-Sent Events：服务端沿一个 HTTP 响应持续推送事件）承载的是类型化生命周期，而不是无结构字符串。ChatWeb 使用 `run.started → message.delta* → terminal`：开始事件建立本次 run 与 Assistant Message 的身份，`message.delta` 只追加对应草稿，terminal event（终态事件）才把这次运行裁决为 `COMPLETED`、`CANCELLED` 或 `FAILED`。Citation（引用）等结构化输出也通过独立事件进入公开协议。

Browser 还维护 stream ownership state machine（流归属状态机：检查后续事件是否仍属于同一个 run 和 Assistant Message）。`runId + assistantMessageId` 必须和开头一致；duplicate start（重复开始）、citation-after-delta 的非法顺序、post-terminal event（终态后的事件）、EOF 无 terminal（连接结束但没有终态）都会 fail closed（协议不可信时拒绝继续当成成功流处理）。

关键点是：协议拒绝坏数据以后，还必须把 UI 的 active state（进行中状态）收掉。否则“安全地拒绝错误事件”也可能留下一个永远显示“正在思考”的死状态。

## Stop 只有真正传播到上游，才算停止

Stop 不是把页面里的 loading 隐藏，也不是删除已经显示的文字。真实链路是：

```text
Browser /cancel
→ Runtime AbortController
→ same AbortSignal
→ ModelProvider fetch / stream
→ upstream close
→ ChatRun = CANCELLED
→ 已显示 partial 保留
```

历史 production Browser E2E（生产形态浏览器端到端验证）真实观察到 slow fixture（慢响应测试服务）的 stream close，而不只是按钮文案变化。只要用户已经看见 partial output（部分输出），它就是发生过的事实，Stop 不能假装它从未存在。

## Retry 要继承原 run 的执行语义，但允许重新解析外部事实

一个 ChatRun 开始后会冻结 model / context / thinking 等 execution selection。用户随后修改 Settings（设置），只影响下一次新的正常 ChatRun；Retry 仍从旧 run 继承原来的模式与 required / optional policy（必选或可选策略），再创建一个新 run。

但 Context 可以重新 resolve（重新解析），因为知识服务中的外部事实可能变化；Search 也必须创建 fresh invocation（新的搜索调用），因为实时网页有时效性。这里区分的是两类东西：**用户对这次执行作出的选择需要保持不变，外部世界的读取结果则可以重新获取。**

## 多个 Assistant attempt 并存后，还要决定下一轮模型应该看到哪一个

同一个 User Message 可能对应失败、取消和成功等多个 Assistant attempt（回答尝试）。如果下一轮 history（历史上下文）把它们全部喂给模型，模型会看到重复甚至互相冲突的回答。

ChatWeb 因此建立 effective assistant attempt（有效回答投影）：优先选择最新 `COMPLETED`；如果还没有成功结果，就使用最新且有可见内容的 partial / cancelled attempt。Retry 自身重放 trigger 时，history 截止到原 User Message，不把被重试的旧 Assistant attempt 再喂进去。

这也解释了为什么“成功回答以后再生成多个版本并切换”没有被当成普通 Retry 顺手实现：一旦同一个成功回答可以有多个可选版本，系统已经进入 branch / answer-selection（分支与答案选择）模型，需要新的领域设计，而不是给现有 Retry 再加一个按钮。

## Immutable object 也会发生 stale write

接入 Context Provider（上下文提供者）后曾出现一个很典型的真实 bug：required Context 解析失败时，失败事实已经写入 repository（持久化仓储）；catch 分支却还拿着解析前的旧 immutable run snapshot（不可变但已经过期的运行快照），随后写 `FAILED` 时把刚保存的新 failure facts 覆盖掉。

最终修复不是放弃 immutable（不可变对象），而是在 terminal transition（进入终态）前回读 authoritative persisted run（持久化后的权威运行事实），再基于最新版本写终态。这个事故说明：不可变对象能避免原地修改，却不能自动解决多步骤 workflow（工作流）里的 stale snapshot（过期快照）覆盖。

## 这套模型真正解决的是“失败以后历史还能不能相信”

把内容事实和执行尝试拆开以后，Streaming、Stop、Retry、Context、Search、Citation、Attachment 都能围绕明确的 run / message identity（运行与消息身份）继续演进，而不用反复给 `messages[]` 增加例外。

更重要的是，系统允许失败、停止和重试真实发生，却不需要为了最终 UI 看起来成功而改写历史。这比“消息能不能显示出来”更接近一个长期 Chat Runtime 真正需要维护的工程事实。
