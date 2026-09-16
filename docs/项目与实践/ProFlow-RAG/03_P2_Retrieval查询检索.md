# 03｜P2 Retrieval 查询检索

状态：P2 Final Acceptance PASS（P2-A～P2-F 与 Closeout 已正式验收；下一阶段 P3 Evidence / Context）

## 这一阶段真正要解决什么

P1 已经把固定 ProFlow commit 构造成唯一 ACTIVE KnowledgeSnapshot。P2 不再负责“知识怎么生成”，而是回答：**一次 query 怎样只读绑定一个确定 Snapshot，从 lexical / vector 两路得到可审计 Candidate，并逐步进入 Hybrid、RRF、Rerank？**

ChatWeb 拆仓后，这一阶段的终点也变了。`proflow-rag` 不再生成 Answer；Retrieval 的责任是提供稳定、可追溯的候选与后续 Evidence/Context 输入。

```text
Query
→ pin Active Snapshot
→ lexical recall
→ vector recall
→ Hybrid
→ RRF
→ Rerank
→ Candidate Set
```

## P2-A｜从 Grounded Answering 重基线为 RAG Query Orchestration

ADR-012 把 ChatWeb 拆成独立产品后，旧 `Grounded Answering` ownership 已经失效。Conversation、Thread、Message、Generation、FAST/THINK、token streaming、Chat feedback 都移出 `proflow-rag`；本仓库保留 QueryExecution、Retrieval、Evidence/Context/Citation orchestration 与 degradation/trace。

P2-A 因此先改承重墙而不是写检索算法：当前 Context 改为 `rag-query-orchestration`，旧规格进入 `grounded-answering-legacy`，数据库 ownership 占位从 `answering` 纠正为未来 `query`。没有为了空 schema 名字制造无业务价值 migration。

最重要的不变量是 single-snapshot execution：QueryExecution 开始时读取一个 Active Snapshot descriptor，此后 lexical/vector/chunk read 全部显式携带同一个 `snapshotId`。后台即使发生 activation，本次 execution 也不能混入新 Snapshot。
## P2-B｜真实 KnowledgeReadContract 只读链路

P2-B 没有复用 P1 的 build repository，因为那会把写能力、index identity 和 SQL 细节泄漏到 Query Context。新建的 `KnowledgeReadContract` 是 Knowledge Management 对查询域唯一允许的 Published Contract：

```text
getActiveSnapshot()
lexicalSearch(snapshotId, ...)
vectorSearch(snapshotId, ...)
getChunks(snapshotId, ...)
```

Contract DTO 自己拥有类型，不导出 Knowledge Aggregate，也不暴露 `indexBuildId/chunkBuildId`。PostgreSQL adapter 在内部把 `snapshotId` 解析到真正的 index/chunk build，再执行查询。这样 Query Domain 只知道“我在读哪个知识版本”，不知道“这个版本在数据库里怎样实现”。

### Lexical read

当前 lexical branch 复用 P1-F 已验证的 `simple` FTS OR-term 基线，并支持 `sourcePathPrefix`。它返回 `snapshotId/chunkId/rank/score`，不把 SQL rank 伪装成跨 branch 可比较分数。

### Vector read

Vector branch 使用 pinned Snapshot 的 EmbeddingProfile 做硬 guard：profile id、dimensions、L2 normalization 任一不兼容都拒绝查询。数据库仍使用 P1-F 建立的 7,670 个 vector inputs 与 exact pgvector cosine baseline，没有提前引入 ANN。

37 个超长 Source Chunk 在 Derived Index 中存在多个 windows。查询时先在每个 `chunkId` 内选择距离最小的 window，再输出一个 VectorCandidate，因此一个 Source Chunk 不会因为多个 embedding windows 重复占满候选位；同时保留 `windowOrdinal` 作为 branch evidence。

### 为什么 RETIRED Snapshot 仍可读

`getActiveSnapshot()` 只会给新 execution 当前 ACTIVE；但一个 execution pin 完以后，后台可能正好激活新版本，使旧 Snapshot 变成 RETIRED。若 read adapter 此时只允许 ACTIVE，本次请求会在中途失败。

因此在线 read 的规则是：ACTIVE 可作为新 execution 起点，ACTIVE/RETIRED 都允许已知 `snapshotId` 继续只读；READY/BUILDING/FAILED 不可进入在线 query。这个区别把“能否开始新请求”和“已 pin 请求能否完成”分开了。

## P2-B｜真实验证

正式 `pnpm verify:p2b` 依次通过 architecture、typecheck、build、db prepare/migrate 与真实 read-path smoke。4 个既有 migration 全部 `SKIPPED`，说明 P2-B 没有修改数据库结构或知识状态。

真实 snapshot1 结果：lexical candidates=10、vector candidates=10；用数据库中一个既有向量做 self-query，Top1 返回同一 Source Chunk、cosine distance=0；随后把两路 Top3 合并去重并 hydration，6/6 Chunk 都能还原 content、content hash、SourceCoordinate 和 structure metadata。

同时验证了：错误 EmbeddingProfile 被拒绝、错误维度被拒绝、不存在 snapshot 被拒绝、路径过滤只返回指定前缀、业务 read 前后 Knowledge DB counts 与 activation history 完全相同。最终数据库仍是 `snapshot1 ACTIVE / index1 COMPLETE / chunks=7624 / lexical=7624 / vectors=7670 / pending=0`。

这里必须区分“read path correctness”和“retrieval quality”。Vector self-query 只证明 pgvector + snapshot binding + DTO hydration 的链路正确，不证明真实自然语言 query 已经有足够 Recall；真正的 lexical-only / vector-only / hybrid / RRF / rerank 对比在 P2 后续 Eval 中完成。

## P2-A / P2-B 阶段结论

P2-A/P2-B 已经把 Retrieval 从旧 Chat 后端里抽成真正 headless RAG capability：Query 固定知识版本，Knowledge 只通过 Published Contract 暴露只读能力，Lexical/Vector 原始候选有明确 branch identity，内部 persistence identity 不跨 Context 泄漏。

下一步 P2-C 才组合 lexical/vector 两路成为 Hybrid candidate set；P2-D 再做 RRF。不会直接把 FTS score 与 cosine distance 相加，因为它们量纲不同，必须保留 branch rank/score 后再用 rank fusion 处理。

## 面试表达

30 秒版本：**我把 RAG 在线检索做成 snapshot-bound 的只读契约：一次 query 先 pin Active KnowledgeSnapshot，lexical/vector/getChunks 全链携带同一 snapshotId；PostgreSQL adapter 隐藏 indexBuildId 和内部 schema。向量侧对多 window Chunk 先选最佳 window 再按 Source Chunk 去重，同时校验 EmbeddingProfile、维度和归一化。真实 7,624 Chunk / 7,670 vector 数据上 read-path smoke、profile guard、只读 DB invariant 全部通过。**


## P2-B User Review

2026-09-07 用户在 Published Contract、真实 smoke、数据库只读证据和过程文档 ownership 纠偏完成后明确继续下一步，因此 P2-B 正式验收。主线进入 P2-C Hybrid Retrieval；本阶段不会提前实现 RRF。

## P2-C｜Hybrid Retrieval（Mechanical Gate PASS）

P2-C 不是把两个列表简单拼接，更不是把 FTS score 与 cosine distance 直接相加。两种 score 的含义、方向和尺度都不同：Lexical `score` 越大通常越相关，Vector 当前保存的是 cosine `distance`，越小越接近。若直接线性求和，看似得到一个总分，实际上会把不可比较的量纲伪装成统一 relevance。

因此本门先建立 `HybridCandidatePool`。一个 Source Chunk 在 pool 中只出现一次，但可以同时保留两路证据：

```text
HybridCandidate
├─ snapshotId
├─ chunkId
├─ lexical? { rank, score }
└─ vector?  { rank, distance, windowOrdinal }
```

Pool 没有 `fusedScore`，也没有“综合相关性 rank”。实现只提供 deterministic canonical order，目的是让结果可重复比较和测试，不能把这个顺序当成 relevance。真正把 branch rank 转成统一排序的是下一门 P2-D RRF。

P2-B 已经能接受 query vector，但还没有负责“用户文本怎样生成 query vector”。如果 P2-C 继续只拿数据库已有向量做 self-query，那么只能证明 merge 算法成立，不能叫真实 Hybrid Retrieval。因此这一门补上 `QueryEmbeddingPort`、本地 Query Embedding Adapter 和 `RunHybridRetrieval`，形成真正在线链路：
```text
text query
→ pin Active KnowledgeSnapshot
→ 按 Snapshot EmbeddingProfile 构造 query instruction
→ Local Embedding Runtime
→ lexical / vector parallel recall
→ HybridCandidatePool
```

### 一个真实错误假设：Embedding response 的 model 字段不能证明运行时身份

为了防止“同样 768 维、但实际加载了另一个模型”的静默污染，最初给 Embedding Adapter 增加了 `response.model === expectedModelId` 校验。随后专门用错误 model id 做 smoke，测试却没有按预期失败。

实测发现 llama.cpp `/v1/embeddings` 会回显请求中的 `model` 字段；因此它只能说明客户端发了什么，不能证明服务端真正加载了什么。这个 guard 看起来很合理，实际上没有任何安全价值。

最终改为 Query Embedding 前读取 `/v1/models`，检查 llama.cpp 当前真实 loaded model path/id 是否对应 pinned Snapshot `modelId`。正确 runtime `embeddinggemma-300M-Q4_K-dense` 通过；故意使用错误 model expectation 时稳定拒绝。这里的工程教训是：**Runtime identity 必须取自运行时权威状态，不能拿 request echo 当事实来源。**

### P2-C 真实验证

正式 `pnpm verify:p2c` 完整通过 architecture、typecheck、build、db prepare/migrate、Embedding Runtime health 与 Hybrid smoke。4 个 migration 全部 SKIPPED，没有修改 Knowledge truth。
```text
fixture merge:
lexical=10
vector=10
union=19
overlap=1

真实 text query:
online union=20
query embedding=PASS
runtime model guard=PASS
single snapshot=PASS
read-only DB=PASS
```

P2-C 到这里仍然没有回答“20 个候选谁排第一”。这是刻意的阶段边界，而不是缺功能。当前结果只是一个保留全部 branch evidence 的候选集合；P2-D 才引入 RRF，把不同检索器的 rank 转换成统一 fusion order，并通过 Eval 冻结参数。

## P2-C 阶段结论

Hybrid Retrieval 的第一层价值不是某个神奇综合分数，而是让 lexical 的工程精确词优势与 vector 的语义召回优势同时存在，并且不丢掉各自原始证据。当前链路已经从“read path correctness”升级成真实 `text query → query embedding → 双路 recall → deduplicated hybrid pool`。

30 秒面试表达：**我没有直接相加全文 score 和向量 distance，而是先建立保留两路 rank/score/distance 的 Hybrid Candidate Pool；同一 Source Chunk 跨 branch 去重但不丢证据。Query vector 由 pinned Snapshot 的 EmbeddingProfile 生成，并通过 `/v1/models` 校验运行时真实模型身份，避免同维度错误模型静默污染。下一层再用 RRF 做统一排序。**


## P2-C User Review

2026-09-07 用户在 HybridCandidatePool、真实 Query Embedding、runtime model identity guard、正式 `verify:p2c` 与数据库只读证据展示后明确继续下一步，因此 P2-C 正式验收。下一门进入 P2-D RRF Fusion；P2-C 不承担 rerank。

## P2-D｜RRF Fusion（Mechanical Gate PASS）

P2-C 已经把 lexical/vector 两路候选合并成无全局排序的 HybridCandidatePool。P2-D 才真正回答“不同检索器的结果怎样得到一个统一顺序”。这里没有尝试把 FTS score 与 cosine distance 归一化后相加，而是使用 Reciprocal Rank Fusion（RRF，倒数排名融合）。

RRF 只相信每个 branch 内部已经形成的相对顺序：

```text
fusionScore(chunk)
= Σ 1 / (k + branchRank)
```

例如一个 Chunk 同时是 lexical rank=2、vector rank=1，它会累加两路贡献；只在一路出现的 Chunk只有一项贡献。这样做的核心价值是避免假装两种原始分数处在同一量纲。

当前实现输出：

```text
RrfFusedCandidate
├─ snapshotId / chunkId
├─ fusionRank
├─ fusionScore
└─ branches[]  # 原 lexical/vector rank/score/distance 证据不丢
```

`k` 没有在 P2-D 被拍成“最佳参数”。代码要求调用方显式传入，当前 smoke 用 `60` 只为了验证算法；真正 baseline 要由 P2-F 固定 Dataset 的 Recall/MRR/ordering A/B 决定。
### 为什么还要保留原 branch 证据

RRF 给出了统一排序，但它不是把原始证据“洗掉”。后续 Trace/Eval 仍然需要知道某个 Chunk 是 lexical 命中、vector 命中还是双路命中，以及各自 rank/score/distance。否则一旦排序异常，只剩一个 fusionScore，无法解释哪一路出了问题。

因此 RRF 结果保留完整 `branches[]`，新增的是 `fusionRank/fusionScore`，不是替换 P2-C evidence。

### P2-D 真实验证

Fixture 专门把 lexical score 和 vector distance 改成相反极值，但保持 branch rank 不变；两次 RRF 的 `fusionRank/fusionScore` 完全一致。这是对“RRF 只使用 rank”的机械证明，而不是代码注释里的承诺。

真实 text query 继续复用 snapshot1 与 P2-C Hybrid Retrieval，得到 20 个 fused candidates。`k=60` 下 Top5 为：

```text
3567  0.01639344
7228  0.01639344
5347  0.01612903
7428  0.01612903
2698  0.01587302
```

同时验证非法 `k`、跨 Snapshot candidate 会拒绝；fusion 前后 activation history、lexical/vector 数量不变，说明 P2-D 仍是纯只读 Query 逻辑。Reranker 没有被调用。

完整一键 `pnpm verify:p2d` 在当前工具连接器上两次因长执行窗口被截断，因此没有把它伪写成 PASS。组成该命令的 architecture、typecheck、build、db prepare/migrate、Embedding Runtime status、RRF smoke 已分别取得明确 exit 0，Mechanical Gate 按这些等价组成证据判定 PASS。

## P2-D 阶段结论

P2-D 完成后，Retrieval 第一次拥有统一 relevance order，但仍保持可解释：原始异量纲分数没有被强行混算，统一顺序来自 branch rank 的 reciprocal contribution。下一门 P2-E 才允许独立 Reranker 在 bounded RRF candidates 上重新排序；失败时必须还能回退到这里冻结的 RRF 顺序。

## P2-D User Review

2026-09-07 用户在 RRF 纯 rank 公式、raw-score independence、真实 20-candidate fusion、只读 DB 与组成 Gate 全部明确展示后要求继续下一步，因此 P2-D 正式验收。下一门进入 P2-E Reranker；RRF 顺序作为 reranker failure 时的冻结回退基线。

## P2-E｜Reranker（Mechanical Gate PASS）

P2-D 的 RRF 已经给出统一排序，但它只利用 lexical/vector 的 branch rank，不理解 query 与完整 Chunk 的细粒度语义关系。P2-E 的目标是让一个独立 Reranker 只处理 RRF 前面的有限候选，再输出更精细的 relevance order。

这一步没有直接沿用旧 Spec 里的“iPhone 专用 Reranker”。先做真实 capability probe 后发现：手机 MLXHub 虽然健康、模型列表正常，但 `/v1/rerank`、`/rerank`、`/v1/reranking` 当前全部 404。也就是说，**设备上有模型并不等于 Runtime 提供了项目所需的 contract。**

还尝试过用现有 Qwen3.5 4B Chat Completion 做 listwise rerank。模型约 4.5 秒返回可解析 JSON，但 5 个 candidate 漏掉 1 个。对于 rerank，输出必须是输入候选的完整 permutation；漏项、重复或陌生 ID 都不能被静默接受。因此这条路线被拒绝，而不是因为“LLM 不会排序”。

### 候选模型不是“能跑就算通过”

为了避免把 Runtime 可调用误当成 Reranker 可用，P2-E 对候选模型同时看排序 sanity 与在线 latency。Qwen3-Reranker-0.6B Q8 在同一 3-document sanity 上能正确把 `platform start` 文档排在前面，但耗时约 57.53 秒；结论是质量可用、在线性能不可用。随后测试 Q4_K_M，耗时降到约 11.65 秒，但把无关的 cooking 文档排到第一；结论是性能改善不能抵消质量失败。

最终选择 `BGE-Reranker-v2-M3-Q4_K_M` 作为 P2-E Mechanical candidate。它固定到 immutable revision `f427681a3131087b55c48107878c36c3e9740791`，SHA-256=`cc1d06602269713f710569a5eb371beff4edd0a1e988299bcc46821392b8cca5`，通过当前固定的 `llama.cpp b10516 --rerank` 暴露 `/v1/rerank`。同一 3-document sanity 正确得到 start > stop > cooking，单次约 5.51 秒。

### 为什么 Reranker 只处理 bounded prefix

老 Intel Mac 的实际 latency 对 candidate 数量和文本长度非常敏感。固定同一 query 做小范围 sweep：

```text
2 candidates × 200 chars ≈ 4.55s
3 candidates × 200 chars ≈ 6.33s
3 candidates × 300 chars ≈ 9.02s
3 candidates × 600 chars ≈ 22.50s
```

因此 P2-E 把 `maxCandidates` 与 `maxDocumentChars` 做成显式参数，不把候选深度和文本预算藏在 Adapter 常量里。Mechanical smoke 使用 `3×200` 只是为了证明能力与失败语义；它不是产品参数。P2-F 必须在固定 Dataset 上同时比较质量收益和 latency，再决定正式 budget。

### RerankPort 与失败回退

Query Context 只依赖 `RerankPort`，Infrastructure 才知道 localhost、llama.cpp、模型路径和 `/v1/rerank`。Adapter 必须把返回结果验证成输入 candidate ID 的完整 permutation：漏项、重复、陌生 ID、非有限 score、模型身份不匹配都属于失败，不能部分接受。

Application 成功时只重排 bounded RRF prefix，并继续保留 `fusionRank/fusionScore/branches`；未进入 rerank 的 tail 保持原 RRF 顺序。失败时返回机器可读的 `DEGRADED_RRF_FALLBACK`，整条 candidate order 必须与原 RRF 完全一致，而且不能虚构 `rerankScore`。

正式 smoke 已覆盖 timeout、profile mismatch、invalid response、model unavailable 四类失败，全部机械证明回退顺序与 RRF 原样一致。

### P2-E 真实 Query 结果

固定 query `How does ProFlow determine whether platform modules are ready to start?`，RRF Top3 为 `3567,7228,5347`。人工回读后，`3567` 只是 `DOCUMENT-INDEX.json` 的索引片段，而 `7228` 直接描述 `Start readiness` 与 `Module.status.setupStatus READY`。BGE rerank 将顺序改成：

```text
7228  rerankScore= 4.080003
5347  rerankScore=-5.028484
3567  rerankScore=-6.593247
```

这至少证明当前候选在真实 ProFlow Chunk 上能纠正一个明显的 RRF 排序噪声，但单案例不能证明总体质量提升；RRF-only vs RRF+Rerank 的正式结论留给 P2-F Eval。

### P2-E 正式 Gate

`pnpm verify:p2e` 本次完整退出 0，依次通过 architecture、typecheck、build、PostgreSQL prepare/migrate、Embedding Runtime status、Reranker Runtime ownership/health 与真实 rerank smoke。4 个 migration 全部 SKIPPED，Knowledge truth 没有被修改。

```text
P2E_RERANK=PASS
P2E_RRF_CANDIDATES=20
P2E_BOUNDED_CANDIDATES=3
P2E_DOCUMENT_CHAR_BUDGET=200
P2E_RERANK_LATENCY_MS=6153.54
P2E_RERANK_SCORE_COMPLETE=PASS
P2E_TIMEOUT_RRF_FALLBACK=PASS
P2E_PROFILE_MISMATCH_RRF_FALLBACK=PASS
P2E_INVALID_RESPONSE_RRF_FALLBACK=PASS
P2E_MODEL_UNAVAILABLE_RRF_FALLBACK=PASS
P2E_READ_ONLY_DB=PASS
```

重复运行同一 `3×200` 还观察到约 7.03 秒和 11.25 秒，说明这台 2C/4T Intel Mac 上存在明显抖动。因此 P2-E 只冻结 capability correctness、runtime identity、bounded input 和 degradation，不把一次 smoke latency 冒充产品 SLO。

## P2-E 阶段结论

P2-E 最重要的不是“终于接了一个模型”，而是把 Reranker 变成一个可替换、可失败、可验证的独立能力：模型和物理设备停留在 Model Gateway，RRF 是永远存在的安全基线；任何 Reranker 异常都只能显式降级，不能让一次 RAG query 因辅助排序模型失败而整体失败。

30 秒面试表达：**我没有把 reranker 当成一个必须成功的黑盒。先实测 iPhone MLXHub 没有 rerank contract，再用同一 sanity 淘汰了“质量对但 57 秒”的 Q8 和“更快但排错”的 Q4，最后用 llama.cpp 原生 `/v1/rerank` 固定 BGE-Reranker-v2-M3 Q4_K_M。应用层只把 bounded RRF prefix 交给 RerankPort；timeout、模型不匹配、坏响应或服务离线都完整回退 RRF，并保留所有 fusion evidence。**


## P2-E User Review

2026-09-07 用户在 reranker 候选 A/B、BGE Runtime、真实 RRF→Rerank 结果、四类 RRF fallback、完整 `pnpm verify:p2e` 与工程实战证据展示后明确继续，因此 P2-E 正式验收。下一门进入 P2-F Retrieval Eval / Failure / Latency；P2-E 的 `3×200` 只是 Mechanical baseline，不提前冻结产品参数。

## P2-F｜Retrieval Eval / Failure / Latency（Mechanical Gate PASS）

P2-F 不是再加一种检索算法，而是第一次把 P2-B～P2-E 放进同一份固定 Gold Dataset 里横向比较。第一版 Dataset `p2-retrieval-v0`（SHA-256=`a086cb359eedf59df5008030991d7094d3da21bf67bbf4440e2b12402e26838d`）共 13 题：8 个自然语义题、5 个精确工程题；每题都绑定 snapshot1 的真实 source path / label / chunk provenance，并且 13/13 都能回溯到 P1 已人工验证的 semantic sanity 或 lexical regression case。这样可以防止“先跑结果、再改题让指标变好”。

### Eval 先抓到了上游回归，而不是直接给 P2 打高分

第一轮真实 baseline 中，vector Recall@10=0.8462，但 online lexical Recall@10 只有 0.1538；这与 P1-F 已验证的 EXACT_INDEXED Recall@10=1.0 明显冲突。继续追链发现：P1 lexical baseline 是 `FTS_OR + indexed exact substring`，而 P2 `KnowledgeReadContract.lexicalSearch()` 初版只接了 FTS_OR，`RetrievalQuery.exactTerms` 实际没有进入在线 read path。

修复没有给 benchmark 喂 Gold，而是在 Query Orchestration 增加确定性 engineering token/phrase extractor：路径、camelCase、`Module.status`、`PACKAGE_JSON_INVALID`、`release:publish`、`workspace:^`、`Worker Binding`、`Node Command` 等保留原样；普通品牌词和短缩写不会自动升级成 exact signal。PostgreSQL Adapter 继续使用 P1 已验证的 trigram-index `ILIKE` exact path，再与 FTS_OR 在 lexical branch 内做 deterministic merge。

修复后 13-case：lexical Recall@10=0.6923/MRR=0.4793；其中 EXACT_ENGINEERING lexical Recall@10=1.0000。vector Recall@10=0.8462/MRR=0.6408；Hybrid coverage 在 depth20 达到 1.0000。

### 为什么最终选 depth20 / k30，而不是最高 MRR 的 depth5

RRF sweep 覆盖 branch depth=5/10/20 与 k=10/30/60/100。`d5/k10` 的 MRR=0.6692，看起来最高，但 Recall@10 只有 0.9231，会漏掉 Gold。`d20` 是唯一把 Recall@10 拉到 1.0000 的 branch depth；在 full-coverage 组里 `k=30` 的 MRR=0.6581 最高，因此冻结：

```text
lexicalLimit = 20
vectorLimit = 20
RRF k = 30
rerankDefaultEnabled = false
```

这个裁决体现的是“先保证召回完整，再优化排序”，而不是只追一个平均分。分组结果也成立：NATURAL RRF Recall@10=1.0000/MRR=0.5903；EXACT_ENGINEERING RRF Recall@10=1.0000/MRR=0.7667。

### Reranker 为什么保留能力但默认关闭

P2-E 的单次 smoke 曾在 3×200 chars 下约 6～11 秒，并且个别案例能纠正 RRF 顺序。但 P2-F 必须看最终 `d20/k30` baseline 下的持续在线负载。最终 operational A/B 给 rerank 一个显式 15 秒 eval ceiling（只是评测控制，不是产品 SLO）：13/13 case 都在 ceiling 内 timeout，并按 P2-E 已冻结语义完整回退 RRF；RERANKED=0、FALLBACK=13、TIMEOUT=13。fallback 后 Recall@10=1.0000、MRR=0.6581，与原 RRF 完全一致。

因此 P2-F 不删除 RerankPort/BGE Runtime，而是冻结“capability available, default OFF”。未来换硬件、模型或 runtime 后仍可重新 A/B；当前老 Intel Mac 不应该让一个辅助排序步骤把默认查询拖到十几秒甚至几十秒。

### Failure Gate：Embedding 失败不能把整个 Retrieval 拖死

P2-F 还发现 `RunHybridRetrieval` 初版在 Query Embedding unavailable/timeout 时会整条失败。现在只对暂时不可用/超时显式降级为 `DEGRADED_LEXICAL_ONLY`，并确保 vector branch 完全不存在；但 runtime model/profile mismatch、dimension/normalization/response invariant 等一致性错误仍 fail closed，不能用 fallback 掩盖数据污染。

正式 smoke 已证明 timeout fallback、unavailable fallback、profile mismatch fail-closed、vector branch absent、DB read-only 全部 PASS。

### P2-F 正式 Gate

`pnpm verify:p2f` 完整 exit 0，覆盖 architecture、typecheck、build、PostgreSQL prepare/migrate、Embedding Runtime status、13-case core regression 与 retrieval degradation smoke；4 个 migration 全部 SKIPPED，Knowledge truth 未修改。默认 RRF-only 最近机械 latency 约为 embedding p50≈112ms、branches p50≈1.26s、total p50≈1.39s；不同机器负载下曾更低，因此这里只作为当前硬件 evidence，不冒充产品 SLO。

P2-F 也明确没有偷加 ANN。当前 exact pgvector 仍保留为控制组；只有后续产品 latency SLO 明确证明需要，才允许做 exact-vs-ANN 的 recall+latency A/B。

## P2-F 阶段结论

P2-F 最重要的产出不是一个漂亮分数，而是把 Retrieval 从“若干能工作的组件”变成一条有固定 Gold、回归阈值、失败语义和默认策略的可验收链路：精确工程词重新回到 online lexical；Hybrid depth20 保证 Gold coverage；RRF k30 成为默认排序；Reranker 在当前硬件上默认关闭但保留可替换能力；Embedding 临时不可用时 lexical 仍能服务。

30 秒面试表达：**我没有直接拿 reranker 个例当 RAG 质量结论，而是建立 13-case 固定 Gold，逐层比较 lexical、vector、Hybrid、RRF 和 Rerank。Eval 先发现 P2 online lexical 漏接了 P1 已验证的 exact-index signal，我把它修回生产 read path后，最终 depth20/k30 的 RRF Recall@10 达到 1.0、MRR 0.6581。持续负载下 BGE reranker 13/13 在 15 秒评测 ceiling 内 timeout，所以保留能力但默认关闭；Embedding timeout/unavailable 则降级 lexical-only，而 profile mismatch 继续 fail closed。**


## P2-F User Review

2026-09-07 用户在 13-case Gold、exact lexical 回归修复、d20/k30 RRF baseline、rerank 默认 OFF、embedding degradation 与完整 `pnpm verify:p2f` 展示后明确继续，因此 P2-F 正式验收。下一步仅进入 P2 Closeout：汇总 P2-A～P2-F 阶段基线、确认 Gate/DB/Runtime/文档一致性；未完成 P2 Closeout 前不进入 P3 Evidence / Context。


## P2 Closeout｜阶段总验收（Mechanical Gate PASS）

P2 Closeout 没有再添加新的 Retrieval 算法，而是回答一个更重要的工程问题：**P2-A～P2-F 形成的能力是否能作为一个连续、可回归、可接力的 Retrieval 阶段整体交付？**

六个实现基线形成连续主线：`c32d89c → b42ab3f → c191fbf → 3570a9c → da55e85 → 0404ed4`。Closeout 没有重跑代价极高的 full reranker A/B，而是重新验证 architecture/typecheck/build、4 migrations、两个 Runtime、P2-B read path、P2-C Hybrid、P2-D RRF、P2-F 13-case core regression 与 embedding degradation。整条阶段回归完整 exit 0。

最终 Retrieval policy 仍是：

```text
lexicalLimit = 20
vectorLimit = 20
rrfK = 30
rerankDefaultEnabled = false
Gold Dataset = p2-retrieval-v0 / 13 cases
RRF Recall@10 = 1.0000
RRF MRR = 0.6581
```

Knowledge truth 仍保持唯一 ACTIVE snapshot、7,624 Source Chunks、7,624 lexical rows、7,670 vectors、0 pending。也就是说 Eval、failure probe 与 Closeout 都没有为了验收去改知识数据。

Closeout 还再次确认了阶段边界：ChatWeb/Generation 不属于 RAG Retrieval；Evidence / Context / Citation 属于 P3/P5 后续能力；ANN 没有产品 SLO 证明必要性，因此没有为了“更高级”提前引入。

这一阶段真正形成的工程方法是：**先把每层能力做成独立可测 Gate，再让 Eval 找真实回归，最后用阶段 Closeout 验证这些局部门能够拼成一个稳定整体。** P2 Closeout Mechanical Gate 已通过。

## P2 Closeout User Review / Final Acceptance

2026-09-07 用户在六个实现基线、阶段级回归、DB/Runtime readback、边界审计与 Closeout Gate evidence 全部展示后明确“继续，按计划下一步”，因此 P2 Closeout User Review 正式 PASS，`P2_FINAL_ACCEPTANCE=PASS`。P2 Retrieval 至此结项；下一阶段进入 P3 Evidence / Context，仍遵守 Mechanical Gate → User Review → commit 的逐门纪律。
