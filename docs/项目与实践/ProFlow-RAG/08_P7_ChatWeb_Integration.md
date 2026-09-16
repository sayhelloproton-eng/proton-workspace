# 08｜P7 ChatWeb Integration：把 RAG 真正做成外部可消费服务

状态：`Final Acceptance PASS；P7 已正式结项`

P7 不是再给 RAG 增加检索算法，而是第一次把 P0～P6 做出的能力放到“另一个完全独立的项目”面前验证。目标很具体：ChatWeb 不知道 pgvector、Chunk、Embedding、Snapshot build 的任何内部实现，只拿到一个 HTTP base URL，仍然能够得到可供模型使用的 Context 和可追溯 Citation。

## 1. 先把集成边界钉死

P4 已经提供 `POST /v1/rag/query`，P5 又把 Citation 固定到 selected Evidence，因此 P7 没有重新设计第二套 API。我们先规定 consumer 只能知道 `query / context.maxCharacters / correlationId` 和公开 response；snapshot、rerank、maxEvidence、Embedding profile、数据库配置都仍由 RAG 自己拥有。

这一步很重要，因为最容易走偏的方案其实是“为了 ChatWeb 方便，直接 import RAG package 或读数据库”。那样虽然开发快，但两个仓库会重新粘在一起，ADR-012 的分仓就失去意义。

## 2. ChatWeb 侧先做 provider-neutral seam

ChatWeb S5 先实现通用 `ContextProvider / ContextProviderRegistry`，让 Chat Runtime 只认 `ContextResult`，而不是认“ProFlow RAG”。然后才增加 `ProFlowRagHttpContextProvider` 这个具体 adapter。

adapter 的职责只有三件事：

1. 从 server-only 环境变量读取 RAG base URL / timeout / ChatWeb 自己的 context budget；
2. 发送 `query + context.maxCharacters + correlationId`；
3. 把 RAG `Context + Citation` 映射为 ChatWeb generic `content + provenance`。

`NO_EVIDENCE` 映射成 `NO_CONTEXT`；503/transport failure 变成 `SERVICE_UNAVAILABLE`；adapter 自己超时变成 `CONTEXT_TIMEOUT`。required/optional 的业务选择不放在 RAG adapter，而由 Chat Runtime 决定。

## 3. 第一次真实两仓链路

真正验证的链路是：

`ChatWeb Runtime → ProFlowRagHttpContextProvider → POST /v1/rag/query → Retrieval/Evidence/Context/Citation → ChatWeb SYSTEM context → deterministic Model fixture`。

我们同时验证两种产品事实：没有 RAG 时普通 Chat 必须继续工作；启用 RAG 时 required provider 失败要在生成前 fail closed，optional provider 失败则记录 degradation 后继续。这样 RAG 是可插拔能力，不是 ChatWeb 的基础依赖。

## 4. 实现过程中踩过的坑

### broad scan 把构建产物也读进来了

第一次跨仓搜索把 `apps/web/out` 纳入上下文。工具调用次数看起来少了，但有效信息密度反而下降。这次直接促成 Minimum-Sufficient Batch：Batch-first 不是“范围越大越好”，而是一次取得完成当前工程决策所需的最小完整上下文。

### HTTP fixture 正确，但 test runner 不退出

adapter 的直接 HTTP request/result 是正确的，可测试 runner 因 open handle 不退出。这里没有把“测试没退出”直接解释成“产品失败”，而是先把事实分成 Product 与 Harness 两层，再修 fixture cleanup。

### latency 第一次算出了负 overhead

一开始用两个独立 run 相减：一次直接 RAG、一次 ChatWeb→RAG。旧 Mac 抖动很大，于是得到负 overhead。这个数字没有被硬解释，而是废弃测量方式，改成 transparent proxy 对同一请求做 paired measurement。

### stale runner 污染启动和延迟

前几次失败测试留下了已知 test runner 进程。只清理我们自己识别出的 PID，不能用 `pkill node` 这类广域操作。随后把 shutdown 改成 bounded cleanup。

### consumer 一度复制了 RAG 的 Context ceiling

后期重新检查跨仓 ownership 时发现，ChatWeb adapter 配置里曾直接写死 `25748`，这是 P3 Eval 冻结出的 RAG policy，不应该由 consumer 再维护一份。最终删除这个上游常量复制：ChatWeb 只保证自己的 budget 是正整数，是否超过当前 RAG 能力上限由 `/v1/rag/query` 的 public contract 自己裁决。修正后 ChatWeb S5 22/22、API build 和真实 ChatWeb→RAG integration 继续 PASS。这个修正不是改算法，而是在实现过程中继续收紧“Provider owns policy，Consumer owns request”这条边界。

## 5. P7 最终形成了什么

RAG 到这里第一次真正从“一个仓库里的后端”变成“另一个仓库可以只靠稳定 HTTP Contract 使用的 capability service”。ChatWeb 没有 import RAG internals，Knowledge DB 在整个消费链保持 read-only。

阶段末证据：ChatWeb S5 tests 22/22 PASS，真实 zero-RAG / required-RAG / optional unavailable / required unavailable fail-closed / DB read-only 全 PASS。cleanup 后 paired observation 约为 RAG core 4298ms、HTTP 4447ms、Chat→Model 4648ms、consumer overhead 201ms；这些是当前机器观测值，不是产品 SLO。
