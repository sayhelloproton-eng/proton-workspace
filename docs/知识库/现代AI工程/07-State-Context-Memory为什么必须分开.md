# State、Context、Memory 为什么必须分开

一个长任务做了两天以后，聊天历史里可能同时存在昨天的计划、已经失败的尝试、旧 Tool Result、当前文件状态、用户偏好、模型猜测和今天的新事实。如果系统把这些内容重新全部塞给模型，再让模型自己判断“哪个才是真的”，任务越长越容易被自己的历史带偏。

因此长期 Agent 必须先回答四个不同问题：**现在到底是什么、过去发生过什么、过去哪些内容未来值得复用、这一轮模型到底应该看到什么。** 对应的就是 State、History、Memory 和 Context。

## 四种信息对象必须先分开

State（状态）是继续执行依赖的 Current Truth（当前真值）。

History（历史）记录过去发生过什么，天然包含已经过期的内容。

Memory（记忆）是从过去信息里经过治理后、未来仍值得复用的内容。

Runtime Context（运行时上下文）是某一次 Model Invocation 真正送给模型的工作集。

~~~text
State   → 现在是什么？
History → 过去发生了什么？
Memory  → 过去什么以后还值得复用？
Context → 这一轮模型真正看到什么？
~~~

这四个对象可以共享数据库，却不能共享语义。

## State：如果过期会直接导致错误动作，就不能只当历史

一个跨天发布 Task 的关键 State 可能包括：

~~~text
status = WAITING_APPROVAL
owner = deployment-agent
artifact_version = sha-123
approval = none
pending_action = publish sha-123
~~~

只要其中任何一项过期，后续动作都可能错误。因此它们必须由正式 Source of Truth 维护，而不是只存在于对话摘要里。

一个实用判断是：

> **如果一条信息过期后仍被使用，会直接导致错误动作，它优先属于 State。**

模型对现实的解释不是 State。模型可以判断“凭证可能过期”，但只有权威来源验证后，系统才能提交对应 Current Truth。

## History：保留时间过程，不代表拥有当前真值

History 可以保存 Messages、Events、旧 Plans、旧 Tool Outputs 和失败探索。

它适合回答：

- 当时系统看到了什么；
- 哪次尝试为什么失败；
- 谁在什么时候做了什么；
- 过去有哪些讨论。

但 History 天然包含过期事实。昨天写着“版本 A 等待发布”，今天可能已经是版本 C。

~~~text
latest history item
≠ authoritative current truth
~~~

时间顺序和权威顺序是两条不同轴。

## Context：系统保存了，不等于模型这一轮应该看到

每一次 Invocation 都应该重新装配 Minimal Sufficient Context（最小充分上下文）：信息足够完成当前判断，但不把整个世界无差别塞进去。

典型来源包括：

~~~text
System / task instructions
+ current Goal
+ selected State
+ relevant Memory
+ retrieved Knowledge
+ recent Tool Result
+ necessary History
+ available Capability metadata
→ Runtime Context
~~~

因此：

~~~text
persisted somewhere
≠ visible to current model
~~~

反过来，模型这一轮看过某段内容，也不表示它应该被长期保存。

## Context Assembly 需要优先级

当 State、Memory、RAG、History 和 Tool Result 同时争抢 Token Budget 时，系统必须先保 correctness-critical 信息。

一种常见优先关系是：

~~~text
hard instructions / policy
→ current goal
→ current authoritative state
→ required evidence
→ current tool observations
→ relevant knowledge
→ relevant memory
→ low-value history
~~~

具体顺序会随业务变化，但不能让大量最近聊天把当前 Artifact Version、Approval 或 Pending Action 挤出 Context。

Context Budget 因而不仅是模型窗口大小问题，也是 Runtime / Harness 的资源分配问题。

## Context Engineering 比 Prompt Engineering 更上游

Prompt Engineering 主要优化“已经决定进入本轮输入的信息怎样表达”。

Context Engineering 首先决定：

- 这次模型该看到什么；
- 哪些 State 是关键；
- 哪些 History 已经过期；
- 哪些 Memory 相关；
- 哪些知识需要检索；
- 哪些 Tool Schema 真有必要；
- 怎样在 Token / Latency Budget 内排序和压缩。

所以 Prompt 是 Context 的一部分，不是 Context Engineering 的全部。

## Context Window 也不是 Runtime Context

~~~text
Context Window
= 模型一次调用的容量上限

Runtime Context
= 系统本轮实际选出的工作集

RAG Context
= 检索系统贡献的一部分外部证据
~~~

128K Context Window 不意味着每轮应该塞 128K，也不意味着模型拥有 128K 长期 Memory。

## Memory 不是 save-all，而是 Promotion

Memory Write 更准确地叫 Promotion（晋升）：从过去信息中判断某条内容是否值得成为未来可复用对象。

一个 Memory Candidate 至少应该回答：

~~~text
What：记什么？
Source：来自哪里？
Scope：谁能复用？
Lifetime：多久有效？
Trust：可信度怎样？
Retrieval：什么时候应该想起？
Update Rule：什么新事实会让它失效？
~~~

“用户明确表达的长期偏好”和“模型推测用户可能喜欢某方案”显然不是同一可信度。

因此 Inference 不能静默晋升为 Fact。

## Memory Write 和 Memory Read 是两套不同决策

Memory Write Gate（记忆写入门：判断候选信息是否值得晋升）可以检查：

~~~text
source trust
+ explicitness
+ recurrence
+ scope
+ sensitivity
+ expected lifetime
+ contradiction
~~~

Memory Read Gate（记忆读取门：判断已有 Memory 是否适合进入当前 Task）则检查当前 Goal、Permission、Freshness、Scope 和相关性。

这两个 Gate 不能共用一句“相似度够高就用”。

一条内容值得保存，不代表每个任务都应该看到；一次任务检索到某条内容，也不代表它应该永久保存。

## Semantic、Episodic、Procedural 回答“记什么”

Memory 可以按内容类型区分：

- Semantic Memory（语义记忆）：稳定事实或知识；
- Episodic Memory（情景记忆）：某次具体经历、过程和结果；
- Procedural Memory（程序性记忆）：反复验证后形成的方法和做法。

Short-term / Long-term 则回答“记多久”。

这两组分类是两条轴，不能机械对应。一次项目事故可以是长期 Episodic Evidence；一个刚形成但只对当前 Task 有效的方法也可能只是短期 Procedural Hint。

## Memory Scope 越大，错误传播越危险

Memory 可以属于 Session、Task、Agent、Project、User 等不同 Scope。

Least Memory Scope（最小记忆作用域）是一个很重要的默认：不确定信息先留在最小必要范围，只有证据充分才扩大复用边界。

一条错误 Task Memory 影响一个任务，一条错误 User / Global Memory 可能污染之后很多任务。

## Memory 必须有生命周期和冲突治理

Memory 不能是 append-only 文本池。至少要支持：

~~~text
Create
Update
Merge
Invalidate
Delete
~~~

用户偏好变化、项目版本变化、事实被权威来源更新以后，旧 Memory 要失效、降权或被新版本替代。

否则 Retrieval 可能同时返回冲突的新旧记忆，让模型自己猜。

## TTL、Version、Supersession 让“忘记”成为正式能力

TTL（Time To Live，有效期）适合天然会过期的信息。

~~~text
“用户长期偏好中文”
→ 可能长期有效，但允许用户修改

“当前项目主分支是 main”
→ 需要项目 Scope 和版本

“临时 API 状态异常”
→ 只应短期存在

“旧架构 A 已被 B 取代”
→ 旧 Memory 应标记 superseded
~~~

Supersession（替代关系：新事实明确取代旧事实）比简单删除更适合需要追溯的系统，因为 History 仍然可以解释为什么过去做过不同判断。

## Memory Provenance 决定它能被相信到什么程度

一条 Memory 如果只有文本，没有来源和形成过程，未来很难判断还能不能复用。

至少应尽量保留：

~~~text
source
created_at
scope
trust / evidence
version
last_verified_at
supersedes / invalidated_by
~~~

模型生成的摘要可以成为 Memory Candidate，但如果它把推断写成事实，Provenance 应暴露这个强度差异。

## Memory Retrieval 不只是 Vector Top-K

当前 Goal 需要什么过去经验，至少要经过：

~~~text
Goal / Task / State
↓
need detection
↓
scope / permission / type filter
↓
keyword / metadata / vector retrieval
↓
rerank
↓
freshness / trust / conflict gate
↓
selected Memory
↓
Context Assembly
~~~

相似度高不能覆盖 Scope、Freshness 和 Authority。

## Knowledge Source 和 Memory 的 Authority 不同

Git、Spec、Database、正式文档属于 Knowledge Source。Memory 来自过去交互和经历的治理后复用。

两者都可能进入 Context，但冲突时不能让历史 Memory 覆盖当前 Source of Truth。

一种实用优先关系是：

~~~text
Current authoritative source
→ Fresh verified evidence
→ Current State
→ Relevant Memory
→ Historical conversation
~~~

这不是所有业务的绝对法律，但体现一个关键原则：**越接近当前权威现实的来源，越应该优先于过去经验。**

RAG 怎样获得外部知识由第 03 篇负责；这里不再重复检索管线，只讨论这些知识进入 Runtime Context 后与 State / Memory 的关系。

## Summary 能压缩 History，却不能替代 State

Context 变长以后，Summary（摘要）可以把大量低价值讨论压成语义背景。

但 Summary 是概率压缩，不适合独自保存：

- 当前 Owner；
- Artifact Version；
- Permission；
- Approval；
- Pending Action；
- Evidence Reference；
- Task Status。

~~~text
Summary
→ semantic compression

State
→ continuation-critical current truth

Checkpoint
→ recovery-safe persisted execution point
~~~

三者解决不同问题。

## Context Compaction 的前提是关键事实已经升到正确对象

Context Compaction（上下文压缩）不是“把旧内容删掉”。安全流程更像：

~~~text
working context grows
↓
reach safe point
↓
persist current State / Artifact / Evidence
↓
archive History
↓
summarize or reference low-value context
↓
rebuild cleaner Context
~~~

从 Context 移除不等于从系统删除。

压缩后还应该重新确认：

~~~text
Goal still present?
Current State still authoritative?
Pending Work still exact?
Artifact / Evidence refs preserved?
Open risks preserved?
Stop / approval conditions preserved?
~~~

如果答案依赖“模型应该还能记得”，说明真正重要的信息还没有升到正确对象。

## 长期系统更应该传稳定引用，而不是复制整个世界

当 Artifact、Evidence、Spec 很大时，Context 可以携带稳定引用和必要摘要，需要细节时再按引用读取。

这会同时改善：

- Token 成本；
- Freshness；
- Provenance；
- 多 Agent 隔离；
- Handoff 质量。

例如交接时传 commit_sha、artifact_ref、evidence_ref、task_version，比复制几十页 Conversation 更可靠。

## 为什么长任务“越做越笨”往往是信息架构问题

模型质量没有变化，但 Context 不断积累旧计划、失败尝试、过期 Tool Result 和重复说明，Signal-to-Noise Ratio（信噪比）会持续下降。

于是模型开始：

- 重复已经失败的路径；
- 使用旧版本事实；
- 忽略最初约束；
- 在冲突材料里随机取一个；
- 输出越来越长却越来越不确定。

解决方向不是无限扩大 Context Window，而是把信息放回正确对象：State 存真值，History 做追溯，Memory 只保留可复用过去，Context 每轮重新装配。

## Context / Memory 也需要自己的 Eval

如果引入 Memory 后只看“用户感觉更懂我”，很难判断是否真的改善任务。

可以单独评：

~~~text
Memory write precision
→ 不该记的是否被写入

Memory retrieval precision / recall
→ 该想起的有没有想起

staleness / contradiction rate
→ 旧记忆是否污染新任务

context usefulness
→ 进入本轮的信息是否真正帮助结果

context cost
→ 为这些信息付出了多少 Token / latency
~~~

Memory 是一套会长期传播信息的系统，因此也需要回归集和冲突样本。

## Memory 不是存储选型，而是治理语义

Memory 的核心不是“存在哪里”，而是：过去哪些信息经过 Scope、Trust、Lifetime、Conflict 和 Provenance 治理后，未来仍然值得复用。

向量数据库只是可能的 Retrieval 实现，不改变这条责任分界：

~~~text
State
≠ History
≠ Memory
≠ Context
≠ Knowledge Source
~~~

当前真值属于 State，权威外部资料属于 Knowledge Source，可复用过去属于 Memory，本轮模型真正看到的工作集属于 Context。

只有把这些对象分开，后面的 Harness、Recovery、Handoff 和 Multi-Agent 才不会全部退化成“把更多聊天历史传过去”。
