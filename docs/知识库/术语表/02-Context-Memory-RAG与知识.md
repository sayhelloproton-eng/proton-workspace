# L2｜Context、Memory、RAG 与知识

> 这一层回答：**模型这一轮到底应该看到什么，外部知识和过去经验怎样进入 Context 而不污染 Current Truth？**
>
> 阅读方式不是按字母背词，而是先看下面的关系链，再把每个术语放回真实系统位置。

~~~text
Knowledge Source / State / Memory → Retrieval → Candidate → Rerank → Context Assembly → Model → Citation / Eval
~~~

## 术语表

| 术语 | 一句话 | 典型场景 | 关键边界 / 易混 |
|---|---|---|---|
| State（状态） | 下一步执行必须依赖的 Current Truth。 | Task status、当前 Node、当前版本、Approval 状态。 | State ≠ History；过期状态会直接导致错误动作。 |
| History（历史） | 过去发生过什么的记录。 | 旧消息、旧计划、失败尝试、事件记录。 | History 可保留追溯，但不能自动当 Current Truth。 |
| Context（上下文） | 某一次模型调用真正需要看到的工作集。 | Goal + State + Evidence + 知识 + Tool Result。 | Context ≠ Memory ≠ Knowledge Base。 |
| Runtime Context | Runtime 在一次 Model Invocation 前实际装配的上下文。 | 把当前 Task、Tool、Evidence 组装进模型请求。 | 它是运行时派生物，不是 Source of Truth。 |
| Context Source | 可以被 Context 编译器读取的正式来源。 | Git、Task Store、Memory、RAG、Tool Result。 | Source 保持自己的事实边界。 |
| Context Package | 针对 Consumer/Role/Task/Phase 编译出的可分发上下文包。 | 给 Executor 和 Reviewer 生成不同 Context。 | Package 是派生物，不是真源。 |
| Context Instance | 某一次真实模型调用最终使用的 Context 实例。 | Package 加最新 State/Tool Result 后发给模型。 | Task/Permission/Source 变化后旧 Instance 不能静默复用。 |
| Context Engineering | 决定模型这一轮应该看到什么、以什么顺序看到的信息工程。 | 长任务压缩、RAG 结果选择、Tool Schema 筛选。 | Prompt Engineering 更偏“选进来的信息怎么表达”。 |
| Working Set | 当前任务真正需要频繁访问的最小信息集合。 | 代码重构只带相关模块、规则、State。 | Working Set 过大降低信噪比。 |
| Scope | 一条信息、权限或任务适用的边界。 | 项目、用户、Task、Role、时间范围。 | Scope 不明确会导致 Memory/Permission 污染。 |
| Lifetime | 信息或状态应该有效多久。 | 一次调用、一次 Task、长期用户偏好。 | Lifetime ≠ Storage Duration。 |
| Token Budget | 为当前 Context/生成允许消耗的 Token 上限。 | 控制成本和窗口占用。 | Budget 是约束，不等于 Context Window 最大值。 |
| Latency Budget | 当前任务允许消耗的时间预算。 | 实时 Chat、Tool 调用、检索。 | Latency 与 Token/Reasoning Budget 常互相影响。 |
| Signal-to-Noise Ratio | 进入 Context 的有效信号相对噪声比例。 | 长任务越做越笨时检查旧计划和重复日志。 | 大 Context Window 不自动提高信噪比。 |
| Context Compaction | 在保留关键事实前提下压缩或引用低价值历史。 | 长 Task 定期重建更干净的 Context。 | Compaction ≠ 删除 Current State。 |
| Safe Point | 可以持久化关键事实并安全重建 Context/恢复执行的位置。 | 阶段完成、Effect 已验证后。 | Safe Point 必须先保存 continuation-critical facts。 |
| Summary | 对 History 做概率语义压缩的摘要。 | 长对话压缩。 | Summary ≠ State/Checkpoint。 |
| Reference-based Context | 通过稳定引用而不是复制全文来装配 Context。 | 传 commit_sha、artifact_ref、evidence_ref。 | 引用必须能重新解析到真实对象。 |
| Freshness（新鲜度） | 信息距离当前真实状态有多新。 | RAG、Memory、缓存、Spec。 | 相关性高但过期的信息仍可能危险。 |
| Authority（权威度） | 一个来源对某类事实拥有多强解释权。 | Git/Runtime API 优先于旧聊天。 | Authority ≠ Similarity。 |
| Provenance（来源链） | 记录信息从哪里来、何时验证、经过什么处理。 | Evidence、Memory、RAG Chunk。 | 没有 Provenance 的摘要难以长期信任。 |
| Knowledge Source | 拥有正式知识事实边界的来源。 | Git 文档、Spec、Database。 | Knowledge Source ≠ Memory。 |
| Knowledge Base | 组织和保存可检索知识的一组内容与索引。 | 项目知识库、RAG Corpus。 | Knowledge Base ≠ Context。 |
| Knowledge Pack | 从正式知识按 Consumer/Role 派生的稳定知识包。 | 给某类 Agent 提供公共知识背景。 | Knowledge Pack ≠ Context Package；不放实时 Task State。 |
| Memory（记忆） | 从过去经历中经过治理、未来仍值得复用的信息。 | 用户长期偏好、Agent 可复用经验。 | Memory 不能替代 Current State。 |
| Working Memory | 当前任务中短期维持、随任务快速变化的信息。 | 当前假设、临时中间结果。 | Working Memory ≠ Long-term Memory。 |
| Long-term Memory | 跨多个 Session/Task 仍需保留的信息。 | 稳定偏好、长期经验。 | 必须有 Scope、更新和删除机制。 |
| Episodic Memory | 围绕某次具体经历保存的记忆。 | 某次事故、一次用户交互。 | Episode 不自动升级为通用规则。 |
| Semantic Memory | 抽象成概念、事实和关系的长期记忆。 | “某项目采用某架构”的稳定知识。 | 冲突时需服从当前权威来源。 |
| Procedural Memory | 关于“怎么做”的可复用方法知识。 | 调试方法、操作步骤。 | 成熟确定性步骤更适合下沉 Skill/Script。 |
| Profile Memory | 与某个用户/主体长期偏好和特征相关的记忆。 | 语言偏好、稳定工作方式。 | 不能越过用户的更新/删除意图。 |
| Memory Candidate | 尚未晋升为正式长期记忆的候选信息。 | 模型从对话中识别可能有复用价值的事实。 | Candidate 必须经过 Scope/Trust/Conflict 判断。 |
| Memory Promotion | 把候选信息经过验证后晋升为长期可复用 Memory。 | 重复稳定偏好、已验证经验。 | Promotion ≠ 自动保存所有聊天。 |
| Memory Retrieval | 根据当前 Goal/Scope 从长期记忆中找回相关信息。 | 新 Task 需要历史偏好或经验。 | 相似度高不能覆盖 Freshness/Authority。 |
| Memory Conflict | 新旧记忆互相冲突的状态。 | 用户偏好变化、项目版本更新。 | 必须合并、失效或保留版本关系。 |
| Memory Deletion | 正式使某条长期记忆不再被未来任务使用。 | 用户要求忘记、事实失效。 | 删除语义要区别于仅从 Context 移除。 |
| TTL | Time To Live，信息天然有效的时间窗口。 | 临时异常、短期配置。 | TTL 到期后应失效或重新验证。 |
| Supersession | 新事实明确替代旧事实，同时保留历史关系。 | 架构 A 被 B 替代。 | 比静默覆盖更利于追溯。 |
| RAG | 推理前从外部知识源检索相关证据并提供给模型。 | 知识问答、Agent 获取私有/最新知识。 | RAG ≠ Vector Database。 |
| Knowledge Source Ingestion | 把外部资料纳入可检索知识系统的入口过程。 | 文件、网页、数据库进入 RAG。 | 进入系统前仍需版权、权限和版本治理。 |
| Loader | 负责从特定来源加载原始内容。 | PDF、Markdown、DB、Web。 | Loader ≠ Parser。 |
| Parser | 把原始格式解析成可处理结构。 | HTML/Markdown/PDF 结构化。 | Parser 负责结构，不负责语义排序。 |
| Cleaner / Normalizer | 清理噪声并统一格式、编码和字段。 | 去页眉、统一空格、标准化 metadata。 | 清洗不能偷偷改变原始事实。 |
| Chunk | RAG 中用于索引和检索的内容单元。 | 段落、章节、代码块。 | Chunk ≠ Document。 |
| Chunking | 把文档切成检索单元的过程。 | 构建 RAG Index。 | 切得过小丢语义，过大降低定位精度。 |
| Chunk Overlap | 相邻 Chunk 之间重复保留一部分内容。 | 减少语义被边界切断。 | Overlap 太大增加重复召回和成本。 |
| Structure-aware Chunking | 利用标题、段落、代码结构切块。 | 技术文档、Spec、代码。 | 比固定字数更能保留语义边界。 |
| Metadata | 附着在文档/Chunk 上的结构化描述。 | source、version、path、time、tenant。 | Metadata 可用于 Filter，不替代正文。 |
| Embedding | 把文本映射到向量空间的表示。 | 语义检索。 | Embedding ≠ RAG。 |
| Embedding Model | 专门生成检索向量的模型。 | Corpus 和 Query 向量化。 | Query/Document 最好使用兼容模型。 |
| Vector | Embedding 生成的数值表示。 | 计算相似度。 | Vector 本身不包含可读证据。 |
| Vector Store / Vector Database | 存储向量并支持近邻搜索的系统能力。 | pgvector、专用向量库。 | 它只是 Retrieval 实现之一。 |
| Similarity / Cosine Similarity | 衡量两个向量在语义空间接近程度的指标。 | 向量召回。 | 高相似不等于高事实权威。 |
| Indexing | 把知识转成可高效检索的索引结构。 | BM25、Vector Index。 | Index 是派生物，应能从 Source 重建。 |
| Inverted Index | 记录词项到文档/位置映射的倒排结构。 | 全文检索、BM25。 | 适合 lexical retrieval。 |
| BM25 | 基于词频和文档统计的经典文本相关性排序算法。 | 关键词检索。 | BM25 与向量语义召回互补。 |
| Dense Retrieval | 使用 Embedding 向量做语义召回。 | 表达不同但语义相近的问题。 | 可能漏掉精确标识和稀有词。 |
| Sparse / Lexical Retrieval | 基于词项稀疏表示或直接词匹配的检索。 | 代码标识、产品名、错误码。 | 与 Dense Retrieval 互补。 |
| Hybrid Retrieval | 并行组合 Dense 和 Lexical/BM25 结果。 | 既要语义又要精确词命中。 | 需要 Fusion/Rerank 解决多路分数不可比。 |
| Retriever | 执行 Query → 候选文档/Chunk 召回的组件。 | RAG 查询阶段。 | Retriever ≠ Reranker。 |
| Recall（召回率） | 应该被找到的相关内容中实际找到了多少。 | 评估第一阶段 Retrieval。 | Recall 高可能伴随更多噪声。 |
| Precision（精确率） | 返回内容中真正相关的比例。 | 评估检索质量。 | Precision 与 Recall 需要平衡。 |
| Top-K | 从候选中保留前 K 个。 | 检索、Rerank 前候选集。 | 这里与模型采样 Top-K 不是同一层。 |
| Candidate Fusion | 把多路 Retriever 的候选合并成统一集合。 | Hybrid Search。 | 合并前需处理去重与分数尺度。 |
| RRF | Reciprocal Rank Fusion，用各路排名而不是原始分数融合候选。 | BM25 + Vector 混合召回。 | RRF 是 Fusion 方法，不是 Reranker 模型。 |
| Reranker | 对第一阶段候选做更昂贵、更精细的二次排序。 | Top-K 后选更少高质量 Context。 | Reranker 不负责从全库初次召回。 |
| Cross-Encoder | 把 Query 与候选一起输入模型直接打相关分。 | 高质量 Rerank。 | 通常比双塔 Embedding 更慢。 |
| Query Rewrite | 把原问题改写成更适合检索的 Query。 | 口语问题、上下文补全。 | 改写必须保留原意，防止 Query Drift。 |
| Query Expansion | 为 Query 增加同义词、实体或相关表达。 | 提高 Recall。 | 扩展过度会引入噪声。 |
| Query Classification | 先判断问题类型，再选择检索策略。 | FAQ/代码/实体/时间敏感问题分流。 | 分类错误会把 Query 送错 Retriever。 |
| Metadata Filter | 按结构化字段缩小候选范围。 | tenant、project、version、date。 | Filter 常比相似度更适合硬边界。 |
| Context Assembly | 把检索结果、State、Memory 等组织成最终模型 Context。 | RAG 最后进入生成前。 | 不是把所有 Top-K 原样拼接。 |
| Context Compression | 对候选内容压缩、去重或提取与当前问题相关片段。 | Token Budget 紧张时。 | 不能丢关键 Evidence/Qualifier。 |
| Retrieval Budget | 限制检索轮数、候选数、Token 和延迟的预算。 | Deep Research、Agentic RAG。 | 检索越多不一定越好。 |
| Grounding | 让回答显式受外部 Evidence 约束。 | 知识问答、事实型 Agent。 | Grounding 不等于模型永不 Hallucinate。 |
| Citation | 指向具体 Evidence/Source 的引用。 | 回答标注来源。 | Citation 让读者回查，不证明来源一定正确。 |
| Abstain | 当证据不足时主动不做确定性回答。 | 高风险问答、检索无命中。 | Abstain 是质量策略，不是失败。 |
| Retrieval Eval | 独立评估检索阶段是否找对内容。 | Recall@K、Evidence Hit。 | 不要只用最终回答掩盖检索问题。 |
| Generation Eval | 评估模型基于 Context 生成的回答质量。 | Faithfulness、Completeness。 | 和 Retrieval Eval 分开才能定位问题。 |
| RAG Eval | 联合评估 Retrieval、Context 和 Generation 的质量。 | 端到端 RAG 回归。 | 端到端分数不能替代分阶段诊断。 |
| Recall@K | 前 K 个检索结果中覆盖正确证据的比例类指标。 | 评估 Top-K 是否足够。 | K 越大不代表用户体验越好。 |
| Faithfulness | 生成内容是否忠实于提供的 Evidence/Context。 | 检测无依据扩写。 | Faithful 不等于完整。 |
| Completeness | 应该回答的重要点是否被覆盖。 | 知识问答评估。 | Completeness 与 Conciseness 需要权衡。 |
| Agentic Retrieval | 由 Agent 根据中间结果动态决定下一次检索。 | 复杂研究、多跳问题。 | Agentic 不意味着无限搜索。 |
| Deep Research | 通过规划、多轮检索、证据组织和综合形成研究结果的长流程。 | 复杂外部研究。 | 必须有 Source Policy、Stopping Criteria 和 Evidence。 |

## 这一层必须真正会区分

- **State ≠ History ≠ Memory ≠ Context**：现在、过去、可复用过去、本轮工作集是四个对象。
- **Knowledge Source ≠ Memory**：正式权威知识和经历型长期记忆的 Authority 不同。
- **Embedding ≠ Retrieval ≠ Rerank ≠ RAG**：表示、召回、重排、端到端检索增强生成不是一回事。
- **Knowledge Pack ≠ Context Package ≠ Context Instance**：稳定知识派生、角色/任务上下文包、单次调用实例的生命周期不同。
- **Similarity ≠ Authority ≠ Freshness**：相关不代表权威，也不代表最新。
