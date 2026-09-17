# RAG 如何变成独立 Capability Service

当 Knowledge（知识构建）、Retrieval（检索）、Evidence（采用证据）和 Context（模型上下文）已经能在一个进程里工作时，项目还不能算“独立 RAG 服务”。真正的分界点是：另一个产品能不能只通过稳定公开接口使用它，而不需要知道内部数据库、索引、模型配置和策略参数。

这条边界也是逐步长出来的。最初只是把内部能力暴露给站点；后来公共 Contract（跨进程接口契约）开始收缩，ChatWeb 接入又暴露出“消费者复制 Provider 策略”的双真源问题；真实 HTTP smoke（烟雾测试）还进一步证明，产品故障、Runtime 故障和 Harness（验收夹具）故障必须分开判断。最终才形成 `Capability Service`（能力服务：通过稳定跨进程接口对外提供受控能力，而不暴露内部领域和存储实现）。

## 公共接口为什么从“能调到”逐步收缩成“只暴露必要控制”

早期 `site-api-contract` 最终收敛为 `rag-api-contract`。公开 `POST /v1/rag/query` 只允许 query、可选 source path prefix、correlationId，以及消费者自己的 `context.maxCharacters`。

已经由 Eval（评测）冻结的 Retrieval / Evidence 策略不能通过 HTTP 被重新定义。消费者不允许提交 snapshot、rerank、maxEvidence、Embedding profile 等内部策略。字符预算只允许向下缩小；超过 provider capability ceiling（服务端能力上限）时，由 RAG public error contract 自己拒绝。

这条边界后来抓到过一次跨仓 ownership（职责归属）问题：ChatWeb 曾复制 RAG 的 `25748` ceiling。最终删除这份复制，ChatWeb 只拥有“我请求多少”的 consumer budget（消费预算），RAG 独自拥有“最多允许多少”的 provider policy（服务端策略）。

这个过程说明，分仓之后最危险的不是 import 关系，而是**同一个策略值被两个项目各自维护**。

## 为什么 Application Orchestration 与 HTTP Delivery 要拆开

`ExecuteRagQuery` 是 framework-free application orchestration（不依赖 Nest 的应用编排）：

```text
Hybrid Retrieval
→ RRF
→ Evidence Selection
→ Context Building
→ Finalize
```

Nest Controller 只负责 request validation（请求校验）、调用 Application、映射 response / error。这样换 HTTP framework 不会改 RAG 领域规则，反过来 Controller 也不能偷偷加入“低分就拒答”或“打开 reranker”一类策略。

公开错误也不直接返回 `error.message`。稳定错误码把 400 invalid request、422 context budget unsatisfiable、503 unavailable、500 failed 分开，同时避免数据库名、Runtime endpoint、stack 等内部事实泄漏。

这一步把“HTTP 能调用”提升成了“外部调用不会夺走内部策略所有权”。

## ChatWeb 的接入为什么必须经过 Adapter

ChatWeb 先建立 provider-neutral `ContextProvider`（与具体知识服务无关的上下文接口），再实现 `ProFlowRagHttpContextProvider`。Adapter（适配器：把一个系统的公开数据映射成另一个系统自己的接口）只做三件事：读取 server-only RAG base URL / timeout / budget；调用 `/v1/rag/query`；把 RAG Context / Citation 映射成 ChatWeb 的 generic content / provenance（通用内容与来源信息）。

它不 import ProFlow RAG package，不读数据库，也不知道 pgvector、ChunkBuild 或 indexBuildId。真实两仓链路验证了四种产品事实：

```text
zero-RAG              → 普通 Chat 继续工作
required RAG success  → Context 进入生成
optional unavailable  → 记录 degradation 后继续
required unavailable  → generation 前 fail closed
```

这组验证让“RAG 可插拔”从架构宣言变成了可以被观察的事实。

## 一次 HTTP 启动误报为什么值得保留

Capability Service 的验证不能停在代码能编译。真实 smoke 会启动构建后的 Nest / Fastify，经 HTTP 调 PostgreSQL、Embedding、Retrieval、Evidence、Context 和 Citation。

它曾暴露一个典型 Harness 问题：API 在共享机器负载下超过 10 秒才 listen，测试误判 `P4_API_START_FAILED`。独立启动证明产品正常后，把 Harness deadline 调整为 30 秒并监听 child exit / log，才重新得到稳定 Gate。

这里没有为了让测试变绿去改业务逻辑，而是先区分：**Product（产品逻辑）、Runtime（真实运行环境）还是 Harness（验证器）谁拥有这个失败。** HTTP 200 不是全部证据，但 Harness timeout 也不能自动等于产品失败。

## 分仓什么时候才真正成立

最终判断标准不是“两个项目放在两个 Git 仓库”，而是：

- ChatWeb 可以完全移除 RAG adapter，普通 Chat 仍工作；
- RAG 可以独立 rebuild、serve、evaluate；
- 两边只共享公开 Contract，不共享 Domain / DB / 内部 policy；
- required / optional、Context composition 属 Chat Runtime；
- Retrieval / Evidence / Context / Citation policy 属 RAG。

走到这一步，ProFlow RAG 才从“一个项目里的后端模块”真正变成独立知识能力。前面的接口收缩、跨仓双真源和 Harness 误报，正是这个边界逐步被验证出来的过程。
