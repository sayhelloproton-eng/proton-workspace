# 03｜S2 Conversation Core：把聊天语义从 Spec 变成可执行领域模型

状态：`Mechanical PASS / User Review PASS / Final Accepted / chatweb@e22a1c8`

## 为什么 S2 不先做接口

S1 已解决“工程怎么跑”；S2 的问题是“一次聊天事实究竟怎么成立”。如果先做 HTTP/SSE，很容易让 route/controller 反过来决定 Conversation、Retry 与 history 语义。于是 S2 只做纯领域核心，Nest 仍只有 health HTTP surface。

## 一次批量实现了什么

`Conversation` 只拥有 message 顺序和当前 `activeRunId`；历史 ChatRun 不塞回 aggregate snapshot。`ChatRun` 表示一次 assistant 尝试，model/context selections 在创建后冻结。Retry 永远创建新 run 并引用旧 run，旧 message/run 事实不改写。

Assistant output 有 draft 与 `COMPLETED/PARTIAL/CANCELLED/FAILED` 终态；history projection 对同一个 trigger user message 只选择一个 effective assistant attempt：优先最新 completed，否则使用最新有可见内容的 partial/cancelled。Retry 自身 history 在 trigger user message 截止，不把被重试旧 attempt 再喂给模型。

## persistence port 为什么没有直接选数据库

S2 只建立 `ConversationRepository` 端口，并用 `InMemoryConversationRepository` 做 repository smoke。它是测试 adapter，不是生产 durable storage。这样可以验证领域对象能保存/回读，同时避免在没有数据量、部署和迁移证据时提前选择 SQLite/Postgres/ORM。

## Stage Batch Fast Path 的第一次实际效果

本阶段没有按 Conversation/Message/Run/Retry 分成多个小 Gate。代码和测试资产一次写完，最后统一跑 5 个 domain/repository tests、API typecheck/build 和 architecture checks。第一次 Gate 只出现测试夹具的类型收窄错误；修正后只重跑受影响检查。测试编译生成的 `dist-test/` 未 ignore 也在阶段末 Git hygiene 一次发现并处理。

## 当前结论

S2 Mechanical Gate、User Review 与 Final Acceptance 均 PASS，正式实现基线为 `chatweb@e22a1c8`。S3 的 Model Provider/Streaming 建立在这个已验证 Conversation Core 上。
