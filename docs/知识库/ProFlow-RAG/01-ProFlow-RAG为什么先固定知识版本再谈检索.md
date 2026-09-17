# ProFlow RAG 为什么先固定知识版本再谈检索

很多 RAG（检索增强生成）项目会先讨论 Chunk（知识片段怎么切）、Embedding（怎样把文本变成向量）和 Vector DB（向量数据库怎么存、怎么搜）。ProFlow RAG 先解决了一个更基础的问题：**检索到的知识到底属于哪个确定版本？** 如果版本身份不稳定，后面的召回、Citation（引用）、Eval（评测）和 Rollback（回滚）即使功能都能跑，也很难证明它们面对的是同一个知识世界。

这篇文章要回答的不是“为什么不用向量检索”，而是为什么**版本、构建身份和可追溯性必须先于检索算法**。

## `main` 能告诉你最新代码，却不能充当知识版本

Git `main` 是 moving reference（移动引用：同一个名字会不断指向新的 commit），本地 workspace（工作目录）还可能包含未提交修改。如果直接读取“当前目录”构建索引，系统以后即使能返回文件名和行号，也无法可靠回答“这条证据当时来自哪一版源码”。

ProFlow RAG 因此先把公开远端 ref（Git 引用）解析成 immutable commit（不可变提交：内容身份固定的 Git SHA），形成 `RepositorySnapshot`（源码快照：本次知识构建所使用的确定源码版本）。随后才构建 `KnowledgeSnapshot`（知识快照：同一批原料经过语料筛选、切分、向量化、索引和验证后形成的可查询成品）。

两者必须分开，因为同一个 commit 完全可能用不同的切分规则、Embedding 配置或索引策略构建出不同知识快照。

```text
remote main
  ↓ resolve
immutable commit
  ↓
RepositorySnapshot
  ↓ Corpus / Chunk / Index / Validate
KnowledgeSnapshot
```

## 固定 commit 以后，还要明确“哪些文件算知识”

Corpus（语料集：真正允许进入知识构建的原始材料集合）不是“整个仓库全部塞进去”。它需要一套显式 Policy（准入规则），决定哪些文件进入、哪些排除，以及为什么排除。

固定 ProFlow 历史基线里，873 个 Git 树条目最终接纳 806 个文档、排除 67 个；压缩资产、符号链接别名等都被明确排除，而不是简单按“这个后缀看起来像文档”判断。

`Manifest`（构建清单：逐文件记录是否纳入、知识类别和排除原因）还必须 deterministic（确定性的：同一 commit 与同一规则重跑得到同一结果）。历史 `proflow-public-v0.2` 的 Manifest SHA-256 是 `66e5c6adee6ffd7cfb8f8c3fb6070e75fe2f7e30d03c42e361c12b094077e7b2`。这个 hash（内容校验值）的意义不是展示复杂度，而是让“知识原料有没有偷偷变化”可以被机械检查。

## Chunk 的第一职责是保留知识身份，而不是凑模型长度

ProFlow RAG 使用 structure-aware chunking（按内容结构切分）：Markdown 按 heading / section（标题与章节）切，TypeScript 按 AST（Abstract Syntax Tree，抽象语法树）symbol（代码符号）切，Test 按 testcase / setup（测试用例与准备逻辑）切；无法安全结构化时才退化到普通文本切分。

固定历史基线中，806 个文档得到 7,624 个 `Source Chunk`（源知识片段）：Markdown 4,089、TypeScript AST 2,008、Test AST 1,131、text fallback 396，TypeScript parser fallback（解析器退化）为 0。每个片段都保留 repository、commit、file、line range，因此后面的 Citation 可以回到同一份不可变源码，而不是只拿到一段无法证明来源的文本。

随后出现了一个很关键的工程问题：**一个 Source Chunk 不应该被迫等于一个向量。** 7,624 个片段里有 37 个超过 2,048 token（模型分词单位）。系统没有 truncate（截断）原始知识，也没有反过来破坏 Chunk 身份，而是在 `Derived Index`（派生索引：可重建、可丢弃的检索资产）层把长片段拆成多个 embedding windows（向量化窗口），最终形成 7,670 个 vector inputs（向量输入）。命中后仍归并回原 Source Chunk。

这使“知识事实怎么分段”和“某个 Embedding 模型一次能吃多少文本”保持了独立。

## PostgreSQL 保存事实，pgvector 只是其中一种检索能力

PostgreSQL（关系型数据库）在这里首先负责持久化、约束和事务，不是为了追求数据库品牌。Source Snapshot、Manifest、Document、Chunk、Index Build、KnowledgeSnapshot 和 IngestionRun（一次知识摄取运行）都需要长期事实；pgvector（PostgreSQL 的向量扩展）让向量数据与关系数据、全文检索事实留在同一数据库边界内。

构建过程用 migration（数据库迁移）版本和 checksum（校验和）管理结构历史，并通过 transaction（事务：一组写入要么全部成功、要么全部回滚）、唯一约束与 deterministic hash（确定性内容哈希）保证原子性和幂等（同一次构建重复执行不会生成第二份业务事实）。于是“重跑”不再等于“再造一套不知道和旧数据什么关系的索引”。

## Embedding Profile 决定的不是模型名字，而是向量空间身份

Embedding（向量表示）能否兼容，不能只看模型名和输出维度。`EmbeddingProfile` 还记录维度、instruction（嵌入提示）、normalization（归一化方式）和版本等，因为其中任一关键项变化，都可能让新旧向量不再可比较。

项目曾验证手机 Generation Runtime（文本生成运行时）可以聊天，但没有 `/v1/embeddings` 接口，于是 Embedding 回到 Mac 上的 llama.cpp；Generation 仍可继续由手机模型承担。随后又发现一份社区 Q4（4-bit 量化）文件虽然名字相似，但和 Q8（8-bit 量化）对同一文本生成的向量 cosine similarity（余弦相似度）接近 0，根因是缺少 dense modules（稠密向量模块）。

最终选择具备空间一致性的 EmbeddingGemma dense Q4_K。真实对照结果是：同文本 Q4↔Q8 cosine mean=`0.9894`，pairwise similarity correlation（成对相似度相关性）=`0.998129`，8 个固定检索 sanity case（基本正确性用例）仍全部 Top1；同一固定 workload（工作负载）的模型 CPU time 从 Q8 `19.55s` 降到 Q4 `11.82s`。

这组数据支撑的是一个很具体的判断：**“模型能加载”不是能力证明，“输出维度一样”也不是向量空间兼容证明。** 真正的空间身份必须用相同数据做交叉验证。

## 知识构建成功，还不等于这版知识可以上线查询

Candidate build（候选构建）完成后，`KnowledgeSnapshot` 还要验证 source、chunk、index、vector、profile 等 invariant（不变量：系统必须始终成立的约束）。验证通过后先进入 `READY`，再用 transaction 原子切换成唯一 `ACTIVE`。旧的 `ACTIVE` 会变为 `RETIRED`，但已经 pin（固定使用）旧快照的在线请求仍可以读完。

Rollback（回滚）也不是随便把数据库某一行 UPDATE 回去。正式维护路径只允许切回 previous successful snapshot（上一成功快照），并保留 activation history（激活历史）。这样“当前知识版本是谁”始终是一个可审计事实，而不是运维人员心里的记忆。

## 最终得到的不是一堆向量，而是一条可复现的知识供应链

```text
Source authority
→ immutable RepositorySnapshot
→ deterministic Corpus Manifest
→ structure-aware Source Chunk
→ persistent build facts
→ lexical / vector Derived Index
→ validated KnowledgeSnapshot
→ atomic ACTIVE
```

后面的 Retrieval（检索）、Evidence（采用证据）、Context（模型上下文）、Citation（引用）和 Eval 都建立在这条版本边界之上。没有这一层，召回质量再高，也很难证明结果属于哪个源码版本、能不能重建、能不能回滚，以及引用是否仍然可信。
