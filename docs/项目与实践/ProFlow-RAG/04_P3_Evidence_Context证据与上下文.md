# 04｜P3 Evidence / Context 证据与上下文

状态：P3 Final Acceptance PASS（P3-A～P3-E 与 Stage Closeout 已完成）

## P3 为什么不是“把 Top-K 文本拼起来”

P2 已经解决“候选怎么召回和排序”，但 ranked candidate 还不能直接等价成给 consumer 的上下文。P3 要继续回答两件事：哪些候选真正升级成 Evidence，以及在有限预算下怎样形成可追溯的 ContextBundle。

这一阶段仍属于 `RAG Query Orchestration`，没有新建 Bounded Context。ChatWeb 的 Conversation、Prompt、FAST/THINK、Generation 都不进入这里；Citation 也留到 P5，只能从已经选出的 Evidence 反向构造 provenance。

## P3-A｜先冻结模型，不先写选择算法

P3-A 的第一条纪律是：**先确定 Evidence/Context 是什么，再决定怎么选、怎么拼。** 因此本门没有实现 Top-K、去重、source diversity、threshold 或 payload delimiter。

`Evidence` 当前至少保留：

```text
evidenceId
snapshotId
chunkId
content
contentSha256
source coordinate
candidateRank
selectionRank
```

`EvidenceSet` 只有 `AVAILABLE | NO_EVIDENCE` 两种形状。跨 Snapshot 混装、重复 Evidence/Chunk、selectionRank 不连续都会 fail closed。这样后面的 Eval/Trace 才能回答“这条证据从哪个候选、哪份知识快照选出来”。

## ContextBundle 为什么用字符预算

P3-A 把 V0 budget 冻结成 `maxCharacters`，不是 token。原因不是字符更高级，而是 token 数依赖具体 tokenizer；如果 RAG Contract 直接绑定某个 Chat 模型 tokenizer，Evidence/Context ownership 就又被 Generation 反向污染。

因此当前 ContextBundle 只记录：

```text
snapshotId
payload
evidenceIds
source refs
budget.maxCharacters
usedCharacters
truncation facts
```

P3-C 才决定 Evidence 怎样被包装、分隔和截断。未来如果需要 token-aware optimization，也必须以显式 Contract amendment 引入，而不是读取 FAST/THINK 或某个模型名字偷偷换预算语义。

## Source 为什么在 Context 中仍要能追溯

ContextBundle 的 evidenceIds 与 source refs 必须与 EvidenceSet 精确一致。这样 P5 Citation 可以从实际 selected Evidence 的 immutable source coordinate 构造引用，而不是让模型或 consumer 自己补 path/line/commit。

P3-A smoke 已覆盖 source drift、unknown evidence、budget overrun、cross-snapshot 与 NO_EVIDENCE Context 禁止等情况。

## P3-A 正式 Gate

`pnpm verify:p3a` 完整退出 0：architecture、typecheck、build 与 Evidence/Context rebaseline smoke 全 PASS。这个 Gate 不需要 PostgreSQL/Embedding/Reranker，因为本门只有纯 Domain/Spec rebaseline，也没有修改 Knowledge truth。

```text
P3A_EVIDENCE_SET=PASS
P3A_SINGLE_SNAPSHOT=PASS
P3A_NO_EVIDENCE_SHAPE=PASS
P3A_CONTEXT_BUNDLE=PASS
P3A_CONTEXT_BUDGET=PASS unit=characters
P3A_SOURCE_REF_INTEGRITY=PASS
P3A_NO_P4_P5_GENERATION_FIELDS=PASS
```

下一门 P3-B 才真正进入 Evidence Selection：以 P2 final ranked candidates 为输入，讨论去重、source diversity、候选 rank、内容重复和 selection policy。P3-A 已通过 User Review；按门禁先完成双仓精确 closeout，随后才进入 P3-B。

## P3-A 复盘｜这一步真正冻结了什么

P3-A 最重要的认知不是新增两个 TypeScript interface，而是把 `Candidate → Evidence → Context` 三层语义彻底分开。Candidate 只是 P2 的排序结果；Evidence 表示本次 QueryExecution 真正采用、能够回到 immutable source 的知识事实；ContextBundle 则是从 Evidence 派生、受显式预算约束的 consumer payload。后续任何 selection、截断或 Citation 都只能沿这个方向继续，不能反向污染 Retrieval。

这里选择 `maxCharacters` 而不是 token budget，是一个有意的 ownership 决策：P3 需要一个与生成模型无关、可以机械验证的预算单位。token-aware optimization 并没有被否定，只是必须等未来有稳定 tokenizer contract 后显式 amendment；不能因为 ChatWeb 选了 FAST/THINK 或换了模型，就让同一个 RAG query 的 Evidence/Context 语义偷偷变化。

`ContextBundle.sources` 也不是提前做 Citation。它只是把实际 Evidence 的 immutable source coordinate 带到 Context 边界，保证 P5 将来只能从已采用 Evidence 派生 provenance；P5 不能参与 P3-B selection，也不能让生成模型自己补 path/line/commit。

`NO_EVIDENCE` 在 P3-A 只冻结**形状**：空 EvidenceSet 不能构造 Context。P3-D 后续负责冻结 No Evidence / degradation 状态语义；若需要 semantic relevance acceptance signal，则必须由 P3-E Eval 校准，不能提前把未验证 threshold 伪装成领域不变量。

本轮 targeted Gate 首次 RED 只是 smoke 文件的 JavaScript 换行转义错误，修正后原 Domain 模型无需修改并完整 PASS，因此没有把它升级成 RAG 项目问题。真正值得沉淀的是：Mechanical Gate 应尽量直接验证领域承重墙，并把“脚本错误”和“领域设计错误”分开判断。

## P3-B｜Evidence Selection 为什么不能等于 Top-K

P2 的职责是给候选排序，P3-B 的职责不是再发明一套相关性评分，而是把这个最终顺序治理成一组真正会被系统采用的 Evidence。当前正式 Retrieval baseline 的 reranker 默认关闭，所以 P3-B 没有把输入绑死在 `RerankStageResult` 上，而是引入最小 `RankedEvidenceCandidate(snapshotId, chunkId, candidateRank)` 视图：默认路径把 RRF `fusionRank` 映射过来，将来显式启用 rerank 时也可以把 `finalRank` 映射进来。这样 Evidence Selection 依赖的是“P2 最终顺序”这个语义，而不是某个排序实现。

Application 层只拿 candidate id 去 `KnowledgeReadContract.getChunks` hydration，补齐 content、content hash 和 immutable source coordinate；它看不到 Knowledge 的内部 index/build identity。Domain selector 再按 `candidateRank` 从前往后确定性扫描，因此 selected Evidence 的相对顺序永远不会反转 P2。

当前只治理三类集合问题：

```text
exact duplicate content  -> contentSha256 去重
单一 source file 垄断   -> maxPerSource
Evidence 集合过大       -> maxEvidence
```

这里的 `maxEvidence` 和 `maxPerSource` 都是**显式 policy input，不是已经冻结的产品参数**。fixture 使用 `3/2`，真实 smoke 使用 `5/2`，只是为了让 Mechanical Gate 能覆盖 duplicate/source/evidence-limit 分支。正式值必须等 P3-E 在固定 Dataset 上评估 Evidence recall、冗余度与后续 Context 预算后再定。

## 为什么 decision reason 不放进 Evidence

P3-B 为每个候选生成独立 decision trace：

```text
SELECTED
DUPLICATE_CONTENT
SOURCE_LIMIT
EVIDENCE_LIMIT
```

这是执行策略事实，不是 Evidence 的身份。把 `selectionReason` 塞进 Evidence 会让同一个 immutable knowledge fact 因策略变化而改变领域形状，所以当前把 trace 与 EvidenceSet 分离。Evidence 本身仍只保存 snapshot/chunk/content/source/candidateRank/selectionRank。

## 邻近 Chunk 为什么没有在 P3-B 合并

同一文件连续 Chunk 看起来很适合在选择阶段拼起来，但“合并以后 payload 长什么样、边界怎么表达、预算如何扣、截断从哪里发生”已经进入 Context assembly。P3-B 只用 per-source cap 防止同一来源占满 EvidenceSet，不做邻近 Chunk merge；真正的包装、拼接和截断留到 P3-C。

同样，空 candidate list 当前可以机械地产生结构性 `NO_EVIDENCE`，但“有候选却不够相关时是否应该 NO_EVIDENCE”当时仍没有 threshold。P3-D 后续负责裁决状态语义，并最终把未校准 semantic cutoff 明确推迟到 P3-E Eval；P3-B 不能凭感觉拍一个 score cutoff。

## P3-B 正式 Gate

`pnpm verify:p3b` 完整 exit 0，依次通过 architecture、typecheck、build、PostgreSQL prepare/migrate、Embedding Runtime status 与真实 Evidence Selection smoke。4 个 migration 全部 `SKIPPED`，本门没有新增 migration。

真实 query 继续使用 P2 冻结 baseline：

```text
lexicalLimit = 20
vectorLimit = 20
RRF k = 30
rerankDefault = false
```

本次 snapshot1 得到 39 个 RRF candidates；使用仅用于 probe 的 `maxEvidence=5 / maxPerSource=2` 后，实际 selected 顺序为：

```text
7398: candidateRank 1 -> selectionRank 1
5347: candidateRank 2 -> selectionRank 2
7228: candidateRank 3 -> selectionRank 3
5349: candidateRank 4 -> selectionRank 4
872:  candidateRank 5 -> selectionRank 5
```

正式 smoke 同时验证 duplicate content、source diversity、decision trace、rank preservation、空 candidates 的结构性 NO_EVIDENCE、policy baseline 未冻结、默认路径不依赖 reranker、没有 Context/Citation 字段，以及 DB read-only。

## P3-B 复盘｜Selection 是“集合治理”，不是第二个 Reranker

这一门最重要的边界是：**Retrieval 决定谁更相关，Evidence Selection 决定哪些已排序知识事实值得一起被采用。** 如果 P3-B 再读取 fusionScore/rerankScore 重新打分，就会制造第二套 relevance system，P2 的 Eval 结论也失去意义。当前实现只消费最终 rank，并以确定性规则处理重复与来源集中问题，因此后续能清楚区分：Recall/ordering 问题回到 P2，Evidence 集合问题留在 P3-B/P3-E。

P3-B 已完成 User Review 与双仓 closeout；当前进入 P3-C Context Building。

## P3-C｜Context Building 为什么不能只是 `join()`

P3-B 已经决定“哪些 Evidence 被采用、优先级是什么”，P3-C 不能因为字符预算又偷偷做一次 selection。最容易犯的错误是：某条高 rank Evidence 太长时跳过去，把后面更短的 Evidence 填进剩余空间。这样表面上提高了字符利用率，实际上却让 Context budget 反向改写了 Evidence priority。

因此 P3-C 冻结成 **whole-Evidence contiguous prefix**：严格按 `selectionRank` 从前往后尝试加入完整 Evidence；下一条放不下就停止，后面的 Evidence 全部作为 omitted suffix。不能跳过，也不能重排。

## 为什么禁止截半 Evidence

Evidence 已经携带完整 `contentSha256`、immutable source coordinate 与 chunk identity。如果 Context 从中间砍掉一条 Evidence，但仍然只保存原 Evidence ID/source range，就无法诚实表达“实际只使用了这条 Evidence 的一部分”。这会让 Context provenance 与真实 payload 不一致。

所以当前规则是：

```text
完整 Evidence 放得下 -> include
下一条完整 Evidence 放不下 -> stop
第一条都放不下 -> fail closed
```

第一条放不下时抛 `CONTEXT_BUDGET_TOO_SMALL_FOR_FIRST_EVIDENCE`，而不是输出 `NO_EVIDENCE`。因为这里的问题是 **Context budget 不够**，不是“没有相关证据”。No Evidence / degradation 状态语义由 P3-D 冻结；semantic relevance acceptance signal 若需要则由 P3-E Eval 校准。

## Separator 为什么也要算预算

P3-C 使用固定 separator：

```text


---


```

运行时长度为 7 characters。预算必须按最终 payload 的真实字符数计算，所以 separator 也要扣预算；如果只统计 Evidence content、不统计包装字符，`usedCharacters` 就会和真实 payload 长度发生漂移。

当前仍使用 P3-A 冻结的 `maxCharacters`，没有引入 tokenizer，也没有根据 FAST/THINK 或某个生成模型改变预算语义。

## Truncation facts 为什么是“有序后缀”

当预算只能装下前 N 条 Evidence 时，`omittedEvidenceIds` 不是随便列出“没放进去的几条”，而必须精确等于 EvidenceSet 从 N+1 开始的完整有序 suffix。这样 trace 才能证明：系统只是因为预算停止，并没有在 Context 阶段重新选择知识。

同时 `ContextBundle.evidenceIds` 与 `sources` 必须保持一一同序，source coordinate 直接来自 included Evidence。这里仍然不是 Citation；P5 以后只能从这些已经纳入 Context 的 provenance 继续派生。

## P3-C 正式 Gate

`pnpm verify:p3c` 完整 exit 0，architecture、typecheck、build、PostgreSQL prepare/migrate、Embedding Runtime status 与真实 Context Building smoke 全 PASS；4 个 migration 全部 `SKIPPED`，没有新增 DB 写入。

正式 smoke 覆盖：

```text
P3C_WHOLE_EVIDENCE_PREFIX=PASS
P3C_SEPARATOR_BUDGETED=PASS separator_chars=7
P3C_PARTIAL_EVIDENCE_FORBIDDEN=PASS
P3C_BUDGET_TOO_SMALL_FAIL_CLOSED=PASS
P3C_TRUNCATION_SUFFIX_INTEGRITY=PASS
P3C_SOURCE_ORDER_INTEGRITY=PASS
P3C_POLICY_BASELINE_NOT_FROZEN=PASS
P3C_NO_CONTEXT_RESELECTION=PASS
P3C_NO_CITATION_OR_GENERATION=PASS
P3C_READ_ONLY_DB=PASS
```

真实链路继续沿 P2 frozen Retrieval → P3-B → P3-C：snapshot1 中 P3-B selected=5，probe budget 下 P3-C included=2 / omitted=3，最终 `usedCharacters=7718`。这个数值只证明真实 assembly/truncation 能工作，**不代表 7718 或当前 probe budget 已经是产品 baseline**；正式 Context budget 仍要等 P3-E Eval。

## P3-C 复盘｜预算只能裁剪表示，不能改写证据优先级

这一门最重要的工程边界是：**Evidence priority 属于 P3-B，Context budget 只决定“前缀能表示到哪里”。** 一旦允许跳过高 rank Evidence、截半 Evidence 或用字符利用率重新挑选条目，P3-C 就会变成隐藏的第二个 Evidence Selector，P3-B 的 decision trace 也失去解释力。

whole-Evidence prefix 看起来没有“尽量塞满”那么聪明，但它保持了 rank、identity、source provenance 和 truncation trace 四者一致。后续如果 Eval 证明需要更细粒度利用预算，应通过显式的新模型（例如可追溯 fragment identity）演进，而不是在现有 Evidence identity 下静默切半文本。

P3-C 已完成 User Review；按门禁先完成双仓精确 closeout，随后才进入 P3-D No Evidence / Degradation。

## P3-D｜No Evidence 和 Degradation 为什么必须分开

P3-D 最重要的不是“找一个分数阈值”，而是先把两个经常被混在一起的问题拆开：**有没有可用 Evidence**，以及**这次执行是否发生了可恢复降级**。当前模型因此使用两条正交轴：`EvidenceSet=AVAILABLE|NO_EVIDENCE` 描述证据可用性，`degradation[]` 描述 Retrieval/Rerank 等 stage 的运行质量。

这意味着 Embedding timeout 后退化成 lexical-only，只要 lexical 仍选出了 Evidence，最终就应该是 `DEGRADED + AVAILABLE Evidence`，而不是 `NO_EVIDENCE`。反过来，如果 lexical-only 最终也没有 candidate，则可以同时是 `NO_EVIDENCE` 和 `RETRIEVAL_EMBEDDING_TIMEOUT/UNAVAILABLE`：前者说明结果为空，后者说明执行路径发生过什么。

当前 outcome 映射很明确：

```text
final candidates = 0
→ NO_EVIDENCE / EMPTY_FINAL_CANDIDATES

AVAILABLE + degradation=[]
→ COMPLETED

AVAILABLE + degradation!=[]
→ DEGRADED
```

## 为什么 P3-D 没有拍 relevance cutoff

默认 Retrieval baseline 仍是 RRF，`fusionScore` 是 rank fusion 的计算结果，不是经过校准的“相关概率”；reranker 又默认关闭。如果此时写 `fusionScore < 0.x → NO_EVIDENCE`，只是把一个数学量误装成业务置信度。

因此 P3-D 明确选择 fail closed：final candidates 非空却传入 `NO_EVIDENCE` 时，返回 `NO_EVIDENCE_RELEVANCE_POLICY_NOT_CALIBRATED`。这不是说系统永远不能做“有候选但证据不足”的判断，而是要求 P3-E 先用固定 Gold/Eval 找到可重复、可解释的 acceptance signal，再显式 amendment。

## Degradation 为什么要带 stage

如果最终只保存 `TIMEOUT`，排障时根本不知道是 Query Embedding、Reranker 还是未来其他模型调用超时。P3-D 因此把 stage 写进 canonical code：

```text
RETRIEVAL_EMBEDDING_TIMEOUT
RETRIEVAL_EMBEDDING_UNAVAILABLE
RERANK_MODEL_UNAVAILABLE
RERANK_TIMEOUT
RERANK_PROFILE_MISMATCH
RERANK_INVALID_RESPONSE
```

这类 degradation 是执行事实，不应该改变 Evidence identity；同时 reason 缺失、意外、重复或未知都会 fail closed，避免 trace 产生自相矛盾的状态。

## P3-D 正式 Gate

`pnpm verify:p3d` 最终持久日志 run 完整 exit 0，architecture、typecheck、build、PostgreSQL prepare/migrate、Embedding Runtime status 与 P3-D smoke 全 PASS；4 个 migration 全部 SKIPPED。

真实链路覆盖两种结果：正常 Hybrid Retrieval 经过 P3-B/P3-C 后最终 `COMPLETED`；人为制造 Query Embedding Timeout 后触发真实 lexical-only fallback，仍能形成 Evidence/Context，最终 `DEGRADED` 并带 `RETRIEVAL_EMBEDDING_TIMEOUT`。fixture 还覆盖结构性空 candidates → `NO_EVIDENCE(EMPTY_FINAL_CANDIDATES)`，以及 No Evidence 仍保留 degradation。DB 前后状态相同。

第一次正式 Gate 的工具会话结果不可恢复，所以没有拿它冒充 PASS；恢复确认无残留进程后，使用持久日志与 exit-code 文件重新完整执行，只有最终 exit 0 的 run 被作为正式证据。这是工程验证里“未知结果先恢复状态，不盲目重试/不猜结论”的实际例子。

## P3-D 复盘｜No Evidence 是知识结果，Degradation 是执行事实

这一门最重要的认知是：**“没有证据”和“系统降级运行”不是同一个维度。** 把两者压成一个状态，会让 consumer 无法区分“知识库确实没有结果”和“向量分支挂了但 lexical 还能工作”，也会让 Eval 无法判断质量下降来自数据还是 runtime。

P3-D 当前只冻结可证明的状态机，不凭直觉补 semantic threshold。P3-E 才会拿固定评测集判断是否需要“候选存在但证据不足”的 acceptance signal，并同时评估 P3-B/P3-C 的集合与字符预算 baseline。

P3-D 已完成 User Review；按门禁先完成双仓精确 closeout，随后才进入 P3-E Evidence / Context Eval。

## P3-E｜参数不是“经验值”，而是固定 Gold 上的最小充分解

P3-B/P3-C 一直故意没有拍死 `maxEvidence / maxPerSource / maxCharacters`，因为参数如果只来自一次 probe，就只是“看起来够用”。P3-E 直接复用 P2 已人工确认的 13-case Gold：先保证 Recall 不掉，再在完整覆盖的方案里压 Evidence 数和 Context 字符成本。

第一轮粗 sweep 曾得到 `12/2 + 32000 chars`，但进一步审计发现 comparator 把 source diversity 放在 Evidence 数量成本之前，而且 32000 只是档位边界。修正后做 refined sweep，最终最小 full-coverage Evidence profile 收敛为：

```text
maxEvidence = 9
maxPerSource = 2
case hit = 100%
mean Gold chunk recall = 100%
full Gold case = 100%
```

`maxPerSource=1` 会损伤需要同一 source 多个 Gold Chunk 的 case；`8/2` 也会漏一个 Gold case。所以 `9/2` 不是“喜欢 9 条”，而是当前固定 Dataset 上满足 Recall-first 的最小充分配置。

Context 同样没有把粗档 `32000` 直接当 baseline，而是对每个 case 找到“最后一个 Gold Evidence 的 selectionRank”，再计算 whole-Evidence prefix 到该位置的精确字符数。所有 case 的最大必要值是：

```text
maxCharacters = 25748
avg usedCharacters = 15986.46
p95 = 25748
truncation rate = 7.69%
Gold coverage = 100%
```

这就是为什么真实 Eval 应该回答“最少要多少”，而不是在 24k/32k 两档里机械选一个能过的数字。

## Semantic NO_EVIDENCE｜为什么最终 baseline 是 NONE

P3-E 额外放了 8 个明显超出 ProFlow 知识域的问题，例如 Kubernetes HPA、SwiftUI、CUDA、Terraform。它们不是正式 Gold，只用于看当前排序信号有没有拒答分离能力。结果 RRF 仍会为这些问题强行返回 ProFlow candidate，而且正例/负例 top1 RRF score 有明显重叠。

保持 13 个正例一个都不误杀时，安全 threshold 只能拒绝 37.5% exploratory negatives。因此 `fusionScore` 不具备足够的 semantic acceptance 校准能力，V0 正式冻结：

```text
semanticAcceptance = NONE
```

这不是“放弃 No Evidence”，而是继续使用 P3-D 已证明的结构性空候选 + fail-closed；未来只有正式负例 Gold 与更可靠 signal 出现后，才允许 amendment。

## P3 阶段级总 Gate｜一次 build，连续验证 A～E

为了避免前四个小门“2 个核心 TS，却反复维护十几个治理文件”的流程税，P3-E 收口开始改成 Stage-level High Throughput。正式 `pnpm verify:p3` 只做一次 architecture/typecheck/build/DB/runtime，然后连续回归 P3-A/B/C/D smoke 和 P3-E Eval。

最终持久日志 run `exit=0`，A～E 全 PASS，`P3E_FROZEN_BASELINE_MATCH=PASS`、reranker default 仍 OFF、DB read-only。也就是说，速度优化不是删掉质量门，而是把重复的五次 Gate 合并成一次 Stage Gate。

P3 已完成 Final Review 与最终验收；本阶段正式 closeout，下一阶段进入 P4 RAG Capability API。
