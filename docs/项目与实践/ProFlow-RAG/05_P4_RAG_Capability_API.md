# 05｜P4 RAG Capability API

状态：Final Acceptance PASS；P4 已正式 closeout

## 这一阶段解决什么

P1～P3 已经能在进程内完成 Knowledge → Retrieval → Evidence → Context，但外部 ChatWeb/CLI 还没有稳定调用边界。P4 的任务不是再发明 RAG 算法，而是把已经验证过的能力变成**独立进程也能消费的产品 Contract**。

最重要的区分是：Domain/Application Contract 解决“系统内部各层如何协作”，wire contract 解决“另一个进程允许看到和提交什么 JSON”。外部 consumer 不应该因为能发 HTTP，就获得修改 Snapshot、Evidence 数量、reranker 或 semantic threshold 的权力。

## 为什么把 site-api-contract 改成 rag-api-contract

P0 时前端 Site 和 API 还在同一个产品里，所以有 `site-api-contract`。ADR-012 已把 ChatWeb 拆成独立产品；如果 P4 继续沿用旧名字，会让错误 ownership 继续固化。因此 P4 把 live package 迁移成 `@proflow-rag/rag-api-contract`，只承载 health 与 RAG Query wire DTO。

它不导出 Domain Model、Repository、PostgreSQL/index identity，也不放 Conversation、Message、Generation、Streaming、Agent 类型。这样 ChatWeb 可以依赖协议，但不能依赖 RAG 内部源码。

## HTTP 请求为什么只能“缩小”而不能“改策略”

P2/P3 已用真实 Eval 冻结：Retrieval=`20/20/k30/rerankOff`，Evidence/Context=`9/2/25748/NONE`。P4 不能让 consumer 通过请求再造一套策略。

因此 `POST /v1/rag/query` 只允许 query、可选 sourcePathPrefix、可选 correlationId，以及 `context.maxCharacters`。其中字符预算只能 `<=25748`：consumer 可以因为自己的 token/UX 约束少拿 Context，但不能要求更多 Evidence、打开 reranker、指定 snapshot 或提高 Context baseline。未知字段直接 400，而不是静默忽略。

## ExecuteRagQuery 与 Controller 的职责

`ExecuteRagQuery` 是 framework-free Application orchestration：按固定顺序执行 Hybrid Retrieval → RRF → Evidence Selection → Context Building → Finalize。Nest Controller 只做 request shape 校验、调用 Application、把 outcome 映射成 JSON/error code。

这样 HTTP/Nest 以后可以替换，但 RAG 核心链不跟着 Delivery 改；反过来，Controller 也不能偷偷塞一条“低分就拒答”或“开 reranker”的业务规则。

## Error Contract 为什么不能直接返回 error.message

跨进程 API 需要稳定 error code，也要避免把数据库名、runtime URL、stack 或内部 invariant 文本泄露出去。P4 因此把公开失败收敛为：400 INVALID_REQUEST / CONTEXT_BUDGET_EXCEEDS_BASELINE，422 CONTEXT_BUDGET_UNSATISFIABLE，503 RAG_UNAVAILABLE，500 RAG_FAILED。

特别是 422：用户主动把 Context budget 缩得太小，第一条完整 Evidence 都放不下。这不是 NO_EVIDENCE，也不是服务不可用，而是“请求约束无法满足”。

## 真实 HTTP 验证

P4 smoke 不是直接 new Controller，而是启动 build 后的真实 Nest + Fastify 进程，经 HTTP 调用 PostgreSQL、Embedding、Retrieval、Evidence、Context。固定 Gold 正常请求返回 9 条以内 Evidence、同 source 不超过 2 条、默认 Context budget=25748；8000-char narrowing 成功。unknown `maxEvidence`、25749 扩大预算、1-char 不可满足预算分别得到预期 400/400/422。DB before/after 相同，response 没有 Citation/Answer/Generation。

正式 `pnpm verify:p4` 完整 exit 0：architecture/typecheck/build、4 migration SKIPPED、Embedding Runtime health、真实 HTTP smoke 全 PASS。

## 一个真实的验证工具问题

第一次 targeted smoke 报 `P4_API_START_FAILED`。不是 API 真起不来，而是 smoke 只等 10 秒；机器同时有其他高负载任务时，child 还没调度到 listen 就被判失败。独立启动 build 后 API 后，Nest 路由和 listen 都正常。

修正方式不是把失败忽略掉，而是让 harness 最多等 30 秒，同时监听 child 提前退出并保留真实 logs。之后 targeted smoke 和正式 Stage Gate 都通过。这个案例说明：**测试超时本身也是假设，假阴性必须用真实进程证据区分“产品坏了”和“测试窗口不合理”。**

## P4 最终心智模型

P4 不提升 RAG 智力，它建立的是“能力产品化边界”：内部拥有复杂的 Snapshot/Retrieval/Evidence/Context，外部只看到一个稳定、最小、可验证、不能越权的 RAG Capability Contract。P5 Citation 会在这个 Contract 上做向后兼容扩展，而不是反过来改变 P4 已冻结的 Evidence/Context 策略。
