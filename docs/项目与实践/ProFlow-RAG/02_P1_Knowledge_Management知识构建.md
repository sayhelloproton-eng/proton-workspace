# 02｜P1 Knowledge Management 知识构建

状态：已结项（P1-A～P1-H 全部 Mechanical Gate / User Review / Final Acceptance PASS；主仓最终基线 `943841e0b37667ce8267b47bab31448f611eeb3e`）

## 这一阶段要回答的核心问题

不是“怎样做向量搜索”，而是：**ProFlow 某一个确定版本，怎样变成可重现、可检索、可验证、可切换的知识快照？**

## 为什么第一步不是 Chunk

GitHub `main` 会移动，本地 workspace 还可能有未提交修改。若直接对“眼前目录”切 Chunk，后面即使检索命中，也无法回答这些证据到底属于哪个版本。

所以 P1 从这条链开始：

```text
remote main
→ resolve immutable commit SHA
→ RepositorySnapshot
→ deterministic corpus manifest
→ Parse / Chunk
→ PostgreSQL / pgvector
→ Embedding / Index
→ Validate
→ Active KnowledgeSnapshot
```

## 实现顺序

1. P1-A：Source Authority / RepositorySnapshot。
2. P1-B：Corpus include/exclude 与 deterministic manifest。
3. P1-C：Doc / Code / Test structure-aware chunking。
4. P1-D：Knowledge PostgreSQL ownership 与 repository adapter。
5. P1-E：Embedding Profile 的真实模型/维度/指令/归一化/延迟与 Corpus compatibility 实验；最终 Baseline 为 Mac llama.cpp + EmbeddingGemma dense Q4_K，Generation 继续使用 iPhone Qwen3.5。
6. P1-F：lexical + vector candidate index build；按 F1 Schema → F2 Lexical Eval → F3 Vector Sample → F4 Full Candidate Build 四个小门推进。
7. P1-G：validation、atomic activation、rollback。
8. P1-H：Knowledge Eval 与阶段复盘。

## P1-A｜Source Authority / RepositorySnapshot（已验收）

RAG 第一层不是 Chunk，而是先固定知识原料的身份。GitHub `main` 是移动引用，本地 workspace 又可能含未提交/未推送内容，所以公共知识真源必须从远程公开 `main` 解析成 immutable commit。

实现基线 `proflow-rag@f853aea`：Knowledge Domain 建立 `RepositorySnapshot(repositoryUrl/ref/commitSha)`；Application 只请求“解析远端 ref”；Git Adapter 使用公开 HTTPS + `git ls-remote`，不使用本地 `git rev-parse main`。Port/Adapter 属于后端实现手段，学习重点仍是 source authority 与可重现性。

RepositorySnapshot 与 KnowledgeSnapshot 不能合并：前者表示“源码原料批次”，后者表示这个原料经过 Corpus、Chunk、Embedding、Index、Validate 后的“可查询知识成品”。同一 commit 未来换 Chunk/Embedding 配置可以生成不同 KnowledgeSnapshot。

真实 smoke 在 GitHub ProFlow `main` 连续解析两次，得到相同 `c85e986b56eca8be3e5c016a14bc1470ee656d87`；architecture/typecheck/build 同时 PASS。这里证明的是测试窗口内同一 authority 能稳定映射到同一 immutable source，并不是假设 `main` 永远不变化。

面试表达可压缩为：**先固定 immutable source snapshot，再构建 derived RAG artifacts，避免本地脏工作区、移动分支和索引版本漂移破坏 citation/reproducibility。**

## P1-B｜Corpus Policy / Corpus Manifest（已验收）

**Corpus（语料集）**：真正允许进入 RAG 的原始知识集合，不等于整个 Git 仓库。**Manifest（清单）**：把每个 tracked file 是否进入 Corpus、属于什么知识类别、若排除则为什么排除，明确记录成可审计清单。

实现基线 `proflow-rag@f073fee`，并在 P1-C 真实读取内容时把 Corpus Policy 修订为 `proflow-public-v0.2`。固定 ProFlow commit `c85e986...` 共 873 个 Git tree entries，最终接纳 806、排除 67。主要知识类别包括 spec 325、test 149、source 110、package docs 73、module metadata 70、deployment 60；3 个 `custom-gpt-knowledge.zip` 明确排除，另有 1 个 `custom-gpt.openapi.yaml` 是指向已入库真实文件的 symlink（符号链接/文件别名），因此以 `SYMLINK_ALIAS` 显式排除，避免同一知识重复索引。`spec/...Secret与安全.md` 正常保留，因为“讨论 Secret 的知识文档”不是敏感资产。

**Deterministic（确定性的）**：同一 commit + 同一 corpus policy 重跑，必须得到完全相同的 manifest。v0.2 的真实 SHA-256 为 `66e5c6adee6ffd7cfb8f8c3fb6070e75fe2f7e30d03c42e361c12b094077e7b2`。这个 amendment 也说明 Manifest 必须认识 Git entry type，而不能只根据路径猜文件性质；否则 symlink 会在真正读取内容时才暴露，甚至造成重复知识或路径风险。

RAG 价值：Corpus 太宽会把噪声带入后续检索，太窄则会让真正答案从源头缺失。V0 当前的 `806/873` 是可评估基线，不是永久真理，后续会被 Retrieval/Eval 结果反向校准。

面试表达可压缩为：**先将 immutable source 通过版本化、可审计的 corpus policy 收敛为 deterministic manifest，再做 chunk/index，避免“整个仓库直接向量化”导致噪声、不可复现和来源不透明。**

## P1-C｜Structure-aware Chunking（已验收）

**Chunk（知识片段）**不是为了机械地把文件切小，而是让检索尽量拿到“刚好包含完整答案证据”的一块内容。当前实现先按内容类型选择结构：Markdown 用 heading/section，TypeScript 用 AST symbol，Test 用 testcase/setup；只有结构单元过大或无法解析时才退化到文本切分。

真实基线：固定 ProFlow `c85e986...` 的 806 个 Corpus documents → 7,624 chunks；Markdown 4,089、TypeScript AST 2,008、Test AST 1,131、text fallback 396，TypeScript parser fallback=0。每个 Chunk 都携带 `repository + commit + file + lines`，并通过原文 round-trip，保证未来 Citation 能回到真实来源。

`chars` 是 characters（字符数），当前 p50=296 / p95=4,281 / max=6,000；它不是模型 Token。`6,000 chars / overlap=4 lines` 只是 V0 guardrail，不是最佳参数。代码小 symbol 可能过碎、较大块可能噪声偏多，后续由 Retrieval/Eval 校准，不在 P1-C 先拍脑袋优化。

面试表达可压缩为：**按文档/代码/测试的真实语义结构切 Chunk，保留 immutable source coordinate，并让 chunk size/overlap 由真实 retrieval eval 校准，而不是固定字符数盲切。**

## P1-D｜PostgreSQL / pgvector 持久化（已验收并收口）

**PostgreSQL** 在这一层解决的是“知识构建事实如何长期保存”，不是“怎样提高检索质量”。P1-A/B/C 已经确定了 source、Corpus 与 Chunk，但如果这些对象只存在 Node.js 内存里，进程结束后就失去可追溯状态；P1-D 因此把它们持久化到 Knowledge Management 自己拥有的 `knowledge` schema。

当前真实运行时是 Postgres.app PostgreSQL 17.10 + pgvector 0.8.2，数据库 `proflow_rag`。`0001_knowledge_foundation` migration 创建 `knowledge / answering / quality / system` 四个逻辑 schema，其中 P1-D 的 Repository Adapter 只写 `knowledge.*`；共享一个物理数据库不等于共享业务表 ownership。Migration runner 使用 version + SHA-256 checksum 管数据库结构历史，重复执行会 `SKIPPED`，已执行版本被修改则直接失败。

真实链路不是 fixture：固定 ProFlow commit → 873 Manifest entries → 806 accepted CorpusDocuments → 7,624 Chunks → `PostgresKnowledgeBuildRepository.saveCorpusBuild()`。整次保存放在同一个 transaction（事务）中，7,624 Chunk 虽按 200 条分 batch 写入，但任一阶段失败都会 rollback，避免留下半套知识数据。RepositorySnapshot / Manifest / Document / ChunkBuild 的唯一约束与 `chunkSetHash` 一起保证 idempotency（幂等）：同一构建重复执行不重复插入，若同一构建身份却出现不同 Chunk 集合则拒绝覆盖。

最后一个真实缺陷发生在 hydration（数据库行还原领域对象）：PostgreSQL 的 `NULL` 被 Adapter 还原成 `{ parentLabel: undefined, part: undefined }`，而 P1-C canonical shape 在缺省时直接省略 key，导致严格 round-trip 失败。最终只修改 PostgreSQL Adapter：`NULL/[]` 对应的 optional 字段不创建 key；没有修改 P1-C Domain，也没有降低 smoke 断言。

验证结果：targeted `pnpm smoke:postgres-knowledge` PASS；完整 `pnpm verify:p1d` 的 architecture/typecheck/build/db:prepare/db:migrate/smoke 全部 PASS；SQL 直接 readback 为 manifest entries=873、documents=806、chunks=7,624、pgvector=0.8.2。Manifest hash 与 P1-C chunk set hash 均保持不变，证明修复只改变 hydration shape，没有改变知识内容。

面试表达可压缩为：**用版本化 migration 建立按 bounded context 划分的 PostgreSQL ownership，通过 Repository Port/Adapter 隔离 Domain 与 SQL；以 transaction + unique constraints + deterministic hash 保证全量知识构建的原子性和幂等性，并用真实 806/7,624 数据做数据库 round-trip 验证。**

## P1-E｜Embedding Profile（已验收并收口）

**Embedding（向量表示）**可以理解为“给文本一个语义坐标”。Query 和 Chunk 使用同一套模型、维度、指令模板和归一化规则后，系统才能用 cosine 等距离比较“谁更像谁”。因此 `EmbeddingProfile` 不是模型名而已，而是向量空间身份：model/artifact、dimensions、instruction profile、normalization、version 任一关键项变化，都可能意味着旧向量不能继续安全复用。

这次 ProFlow RAG 先尝试让手机同时做 Generation + Embedding。真实 MLXHub 虽然能稳定提供 Qwen3.5 chat，但 `/v1/embeddings` 不存在；另一个手机 Gateway 也没有公开 embedding contract。这里学到的第一点是：**模型能装在设备里，不等于应用 Runtime 对外提供了你需要的能力契约。** blocker 在 API surface，不在 embedding 数学能力。

用户确认后，Embedding 回退到旧 Intel Mac：用项目固定的 llama.cpp Intel x64 预编译 Runtime，通过 `runtime:embedding:start` 自动检查/下载缺失依赖并校验 SHA-256；Generation 仍由手机 Qwen3.5 4B 承担。Domain 只依赖 Model Gateway，不关心 `embed()` 最终跑在 Mac 还是手机。

首个真实候选是 EmbeddingGemma 300M Q8：输出 768 维，L2 norm≈1；8 个真实 ProFlow Gold Query + hard negatives 全部把 Expected Source 排到 Top1，`Recall@1=1.0 / MRR=1.0`。这里的关键验收方法不是“让 LLM 说效果好”，而是人工先知道正确资料在哪里，再机械看向量检索能否把它排前面。

为了降低旧 Mac CPU 成本，继续做 Q8→Q4 A/B。第一份社区 Q4 虽然自己的 8 题也能 Top1，但同文本 Q4/Q8 cosine 接近 0，最终确认它缺少当前新版 GGUF 的 dense post-processing modules，因此根本不是公平的纯量化 A/B。这个坑说明：**文件名都叫同一个模型不够，embedding space parity 必须实测。**

正确候选改为 `cduk/embeddinggemma-300m-GGUF-with-dense-modules` 的 dense Q4_K。相同文本 Q4↔Q8 cosine mean=`0.9894`，8 个固定文本的 pairwise similarity correlation=`0.998129`；同一套 Retrieval sanity 仍然 8/8 Top1。固定 24 条 workload 的 llama-server CPU time 从 Q8 `19.55s` 降到 Q4 `11.82s`，CPU cost 约下降 39.5%，模型文件也从约 318 MiB 降到约 228 MiB。因此当前正式 candidate 选择 dense Q4_K，而不是继续为 Q8 付更高成本。

完整 Corpus 不能用字符数猜 token。对 7,624 个 Chunk 按真正的 Document instruction `title: {title} | text: {content}` 全量 tokenizer 后：总计 1,847,677 tokens，`<=512=6897`、`513~1024=290`、`1025~2048=400`、`>2048=37`。也就是说 99.51% Chunk 可以直接进入 EmbeddingGemma 的 2048-token 上限，只有 0.49% 需要特殊处理。

那 37 个超长 Chunk 不回头破坏 P1-C，也不允许 truncate。正确做法是在 P1-F **Derived Index** 层把一个原始 Chunk 派生成多个 `<=2048` token embedding windows；一个 Source Chunk 可以对应多个 vector，命中后按 `chunkId` 聚合/去重，最终仍返回原始完整 Chunk 和 SourceCoordinate。这里进一步建立了一个重要心智：**Source Chunk 是知识/引用单元，不必强制等于 1 个 vector。**

性能上也纠正了一个错误结论。早期把所有 Chunk 都用 `ubatch=2048` 粗估出约 27.8h，这个数字后来作废，因为 90.46% Chunk 根本不需要 2048 档。按 token bucket 分层 benchmark，并用 llama-server 自身 CPU time 排除共享开发机的抢占噪声后，前三档 7,587 个 Chunk（99.51%）模型计算工作量估算约 `3.15 + 0.93 + 2.55 = 6.63 CPU-hours`。这仍只是分层估算，不是假装已经完成真实 full rebuild；真正 P1-F build 后还要记录完整 wall-clock、vector storage 和 retrieval latency。

最后又用手机 Qwen3.5 做了 4 个 grounded-answer sanity：人工固定 Question + Expected Source，从 PostgreSQL 读取真实 Chunk，只允许模型依据这些资料回答，最终 4/4 PASS。它验证的是“Retriever 找对以后，小模型能否基于 Evidence 正确回答”，而不是让生成模型反过来给 Embedding 质量背书。

P1-E 最终 Baseline 可以压缩成：**Mac llama.cpp + EmbeddingGemma 300M dense Q4_K，768d / L2 / max 2048；Query/Code/Document instruction 固定；99.51% Corpus 直接 embedding，0.49% 在 P1-F 派生 windows；Generation 继续使用手机 Qwen3.5 4B。** Mechanical Gate、User Review、Final Acceptance 已全部 PASS，主仓 implementation baseline=`8b6291e`，学习档案 baseline=`a6068e7`。

## P1-F｜Candidate Index Build（已验收）

P1-F 的关键心智不是“把 vector 塞进 Chunk 表”，而是把已经冻结的 Source Chunk 派生成可重建、可丢弃、可比较的检索资产。Source Chunk 继续承担知识与 Citation 身份；Lexical/Vector 都属于 `index_build` 下的 Derived Index，因此失败、重建、换 profile 都不能污染 P1-C/P1-D 真源。

F1 落地 `0002_candidate_retrieval_indexes` 后：`knowledge.index_builds` 记录一次 Candidate build 的 embedding/lexical/planner profile 和状态；`lexical_index_entries` 保存 FTS/exact 检索文本；`vector_index_inputs` 保存一个 Chunk 派生出的一个或多个 embedding input，并允许 vector 暂时为空，从而支持 checkpoint/resume。真实数据库仍是 7,624 Source Chunks，但已规划出 7,624 lexical rows 和 7,670 vector inputs，说明 37 个超长 Chunk 的 1:N window 关系确实发生在 Derived Index，而不是回头改 Chunk。

P1-F 最终按四个小门推进：**F1 Schema / Build Identity → F2 Lexical Baseline Eval → F3 Vector Plan + Sample → F4 Full Candidate Build**。F2 已用 10 个真实 Gold Cases 对同一 7,624 Chunk Candidate 做 A/B：`simple` FTS OR-term 的 `Recall@10=0.30 / MRR=0.15 / p50≈550ms`，说明它可以作为宽松词项召回辅助，但不能单独承担中文自然问题；把 path/CLI/symbol/error 等人工保留的 exact terms 通过 trigram GIN 做 indexed substring 后，`Recall@10=1.00 / MRR=0.8533 / p50≈201ms`。`PACKAGE_JSON_INVALID` 的 `EXPLAIN ANALYZE` 真实走了 `lexical_index_entries_text_trgm_idx` Bitmap Index Scan，单次执行约 12.4ms。

反过来，把整个自然语言 query 直接做 `word_similarity` fuzzy trigram 的结果只有 `Recall@10=0.60 / MRR=0.3843`，p50 还达到约 14.7s，因此明确拒绝。这里学到的不是“trigram 好/坏”，而是**同一个数据库能力放在不同职责上效果完全不同**：它适合工程 exact substring 的索引加速，不适合冒充自然语言语义检索。

F3 已完成 Mechanical Gate，而且严格控制为 6 个样本：先写 4 个普通 Chunk，再以 `embedding IS NULL` 续跑第 5 个，前 4 条 `embedded_at` 保持不变，证明 checkpoint/resume 真正生效；随后临时把 llama.cpp 切到 `ubatch=1024`，只为一个 628-token Derived Window 生成第 6 个 vector，并在完成后恢复在线默认 `ubatch=512`。

这 6 个样本全部是 `vector(768)` 且 L2≈1；其中 Derived Window 为 `chunk_id=3318 / window_ordinal=1 / char 4272..6000`，持久化 `embedding_input` 能由原始 Source Chunk 的 JS `slice()` 精确重建。`verify:index:vector-sample` 还验证了现有 Index Build 遇到 embedding model identity 漂移会抛 `INDEX_BUILD_PROFILE_DRIFT`，以及 pgvector `<=>` cosine exact self-query 能把该 Derived Window 排在 Top1、distance≈0。这里的几十毫秒只证明查询链路正确，因为当前只有 6 vectors；HNSW/IVFFlat 仍必须等 7,670 Candidate vectors 全量完成后才能根据真实 latency 裁决。

另一个重要实现纠偏是：batch resume 不能每批都重新 `PrepareCandidateIndex`、再次 tokenize 7,624 Chunk。现在 `index:embed-batch` 只恢复既有 `index_build` identity，然后直接查询 pending rows，因此 F4 才能真正跨进程、跨 Chat 续跑。F3 的 Mechanical Gate 与用户 Review 均已 PASS；进入 F4 时从 `embedded=6 / pending=7664 / status=BUILDING` 原地续跑，不清空、不覆盖这 6 个已验证样本。

## P1-F4｜Full Candidate Build（已验收）

F4 从 `embedded=6 / pending=7664` 原地续跑，没有清空或重建前 6 个已验证样本。最终 `knowledge.index_builds.index_build_id=1` 状态为 `COMPLETE`，7,670/7,670 vector inputs 全部完成，pending=0；7,624 Source Chunks 与 7,624 lexical rows 保持不变。

全量向量完整性验证为 768 dimensions 7,670/7,670、L2 normalization 7,670/7,670。vector heap 约 6.2MB，含 TOAST/indexes 总量约 38MB。full-corpus exact pgvector Top10 两轮稳定在 p50≈300~341ms、p95≈505~552ms，执行计划仍为 Seq Scan + Sort。

这里没有因为“向量已经全量了”就立刻加 HNSW/IVFFlat。ANN 会改变 Recall/ordering，且 Active Snapshot 与 index build 隔离会影响索引设计；在 Latency Budget 尚未冻结前，exact scan 被保留为后续 A/B 的控制组。

## P1-G｜Validate / Atomic Activate / Rollback（已验收）

P1-G 引入最终 `KnowledgeSnapshot` 生命周期和唯一 ACTIVE 约束。Candidate 只有在 source chunk、lexical、vector count、dimension、normalization 等 invariant 全部通过后才能进入 READY，再用 transaction 原子激活；旧 ACTIVE 在成功切换后变为 RETIRED。

Activation 与 rollback 都在数据库 commit 成功后发布 `KnowledgeSnapshotActivated`。event delivery failure 不允许反向撤销已提交的 ACTIVE 事实；幂等重试不会重复切换。rollback 只允许回到当前 ACTIVE 的直接上一成功版本，避免任意旧 Snapshot 被误恢复。

真实结果最终保持 `snapshot1 / index1 / ACTIVE`，唯一 ACTIVE=1，fixture activation/rollback 及历史均清理，只保留真实 activation history。

## P1-H｜Knowledge Management Eval / Closeout（已验收）

P1-H 做的是阶段级 Eval，不是简单重复 smoke。它重新从固定 Git commit 验证 source authority、873 Manifest、806 Documents、7,624 Chunk 与 chunk-set hash，再对数据库中 7,624 lexical rows、7,670 vector inputs、content/input hash、dimension/L2、唯一 ACTIVE Snapshot 做全量一致性检查。

Eval 首次 RED 暴露了真实规格缺口：`DOM-KM-006` 要求完整 Knowledge build failure 留下 IngestionRun 审计证据，但系统当时只有 `index_builds.failure_stage/failure_code`。因此新增 `0004_knowledge_ingestion_runs`、Domain lifecycle、Repository/Application 与 failure/complete/stage guard；P8 才负责真正的 full rebuild scheduler/orchestration。

另一次 RED 来自 Eval 自身：数据库 `ORDER BY text` 与 JavaScript 原 chunk-set 构建使用的 `localeCompare` 排序规则不同，导致重算 hash 假失败。修复方式不是修改数据，而是让 Eval 读出后复用原 canonical ordering。这个问题提醒：**验证器也必须共享被验证系统的 canonical identity 规则，否则测试本身会制造漂移。**

最终 `pnpm verify:p1h` 输出 `P1H_MECHANICAL_GATE=PASS`；数据库为 migrations=4、snapshots=1、active=1、chunks=7624、lexical=7624、vectors=7670、pending=0，IngestionRun smoke fixture 全部清理。P1 最终主仓基线为 `943841e0b37667ce8267b47bab31448f611eeb3e`。

## P1 阶段结论

P1 最终建立的不是“一堆向量”，而是一条可重现知识供应链：immutable source → deterministic corpus → structure-aware Chunk → PostgreSQL truth → versioned lexical/vector derived index → validated KnowledgeSnapshot → atomic ACTIVE → full-stage Eval。P2 从这里开始只能只读消费 ACTIVE/已 pin RETIRED Snapshot，不能重新拥有 Knowledge build 权限。
