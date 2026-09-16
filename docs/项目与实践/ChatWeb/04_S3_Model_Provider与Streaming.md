# 04｜S3 Model Provider 与 Streaming：让 ChatRun 接上真实生成边界

状态：`Mechanical PASS / User Review PASS / Final Accepted / chatweb@dc84ff1`

## 这一阶段解决什么

S2 解决的是“聊天事实怎么成立”，S3 解决的是“这些事实如何被一个真实模型 stream 驱动”。关键不是调用一次 HTTP，而是把 provider payload、ChatRun 状态、SSE public protocol、Abort 与 secret ownership 分开。

## 为什么 ModelProvider 要比 OpenAI adapter 更窄

领域层只需要 `runId/modelId/messages → text-delta/completed`。OpenAI-compatible 的 `choices[].delta`、HTTP headers、Bearer key、base URL 都是 adapter/runtime 细节。这样未来换本地模型或其他 compatible endpoint 时，不需要让 Conversation/UI 认识原始响应。

## server allowlist 的价值

Browser 只拿公开 `providerId/modelId/displayName`，不能上传 endpoint/key。`/chat/runs/stream` 对未知字段 fail closed，因此“选择模型”和“配置模型供应商”是两个不同权限面。

## Streaming 真正难在哪里

首个 delta 一旦展示就成为事实。此后失败不能偷偷重放完整回答；Stop 也不能删除已出现文本。S3 把正常、partial failure、cancel 都映射回 S2 的 AssistantMessage/ChatRun terminal state。

## 真实证据

11/11 tests、typecheck、build PASS；真实 Nest + OpenAI-compatible fixture 验证 normal SSE=`started→delta→delta→completed`，cancel=`started→delta→cancelled`。fixture 看到了 server-only Bearer probe，并在 cancel 后记录 slow stream close；公开 model metadata 与 SSE 中 private probe/base URL 均为 0 泄漏。

## 执行方法纠偏

第一次“一体化 smoke harness”失败在 child readiness，不是产品失败。恢复事实后改成 fixture/API/client 三独立进程，快速定位并完成真实链路。这也验证了 Stage Batch Fast Path：已有代码 Gate 不因为 smoke harness 问题重复跑。
