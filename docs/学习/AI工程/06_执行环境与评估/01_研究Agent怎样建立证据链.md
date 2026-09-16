# 研究 Agent 怎样建立证据链

> 唯一职责：解释研究计划、证据缺口、检索重规划、来源冲突与停止条件。  
> 阅读前最好先懂 Reasoning、RAG 与 Agent Loop；State/Context/Memory 和 Durable Execution 可作为运行时参考，Execution Environment 不是前置章节。

<a id="ch15-learning-question"></a>
## 从一个无法一次回答完的研究问题开始

假设你要判断“某项 AI 技术现在是否真的适合生产使用”。不同来源可能给出相反结论：官方文档说能力已经上线，旧评测还在讨论早期限制，社区帖子又混入个人体验。如果只是多搜几篇然后写一篇更长的总结，很容易把来源数量误当成证据质量。

研究型 Agent 真正需要维护的是：**哪些主张已经有可靠证据，哪些关键问题仍然缺证据，哪些来源互相冲突，以及继续搜索是否还会改变结论。**后面的专业词都围绕这条证据链逐步出现。

<a id="ch15-30s-core"></a>
## 搜到资料只是开始，缺什么证据会改变下一步

一次普通搜索可以找到候选资料；研究型 Agent 还要持续判断：当前结论缺什么材料、哪些来源互相冲突、下一步应该换问题还是换来源，以及什么时候继续搜索已经没有明显收益。

```text
明确研究问题
↓
拆成可验证的子问题
↓
搜索 / 阅读 / 记录来源
↓
还有关键缺口或冲突？
├─ 有 → 改后续问题与来源策略
└─ 没有 → 检查是否已经足够停止
↓
形成可回到原始来源的结论
```

Reasoning 提高单次判断质量，RAG 提供检索和上下文装配，Agent Loop 让新观察改变下一步。本章接下来才逐个给研究计划、主张、证据链、缺口和停止规则命名。

<a id="ch15-15m-mainline"></a>
## 从研究目标走到有停止条件的证据闭环

<a id="ch15-definition"></a>
### 3.1 Deep Research 的 Agent 性来自“路线可变”

#### 本节新词

- **Deep Research（深度研究）**：围绕一个研究目标持续规划、检索、阅读、补证、重新规划和综合的 Agent 工作方式。本节关注的是“新证据会改变下一步”，不要把它和一次长回答混淆。
- **Research Goal（研究目标）**：整个研究任务最终要回答的问题和交付边界，属于任务层，而不是某一次搜索 Query。
- **Agent Loop（Agent 决策循环）**：根据新 Observation 决定下一步动作的循环机制。Deep Research 使用这种动态性，但研究证据、来源和停止规则仍需单独治理。


固定执行 `query → top-k → answer` 仍是一次检索增强回答。Deep Research 会主动产生 Research Question，发现证据缺口或冲突后换 Query、换 Source、扩展或收缩范围。

<a id="ch15-search-rag-research"></a>
### 3.2 Search ≠ RAG ≠ Deep Research

#### 本节新词

- **Search（搜索）**：从外部信息空间发现候选资料，主要回答“可能在哪里有答案”。它不负责证明候选是否足以支撑结论。
- **RAG（Retrieval-Augmented Generation，检索增强生成）**：为当前模型调用检索并装配外部知识。本节只用它做边界比较，完整机制由 RAG 章负责。
- **Retrieval（检索）**：按查询从知识系统中找回候选证据的过程；它是研究链的一部分，不等同于完整研究。


Search 负责候选发现；RAG 为某次回答取回并装配相关知识；Deep Research 维护整个 Research Goal 下的计划、缺口、冲突和停止条件。三者可组合，但不是成熟度替代关系。

<a id="ch15-research-plan"></a>
### 3.3 Research Plan（研究计划）：先明确要证明什么

#### 本节新词

- **Research Plan（研究计划）**：把 Research Goal 拆成子问题、待验证主张、来源类型、预算和停止条件的可修订计划。它处在研究任务控制层，不是必须机械走完的固定 Workflow。
- **Claim（主张）**：研究最终准备对外表达、需要证据支持的判断。Claim 与 Source 不同：来源是材料，主张是你希望证明的内容。
- **Source Policy（来源策略）**：规定哪些来源优先、哪些只能辅助、哪些需要更高 Freshness 或权威性，用来避免“搜到就算证据”。


Plan 至少表达：子问题、需要什么来源类型、关键 claim 的证据标准、freshness 要求、预算和停止条件。Plan 是工作假设，不是必须执行到底的固定 Workflow。

<a id="ch15-knowledge-gap"></a>
### 3.4 Knowledge Gap（知识缺口）驱动下一步

#### 本节新词

- **Knowledge Gap（知识缺口）**：为了回答 Research Goal 仍然缺失的关键事实、来源或反例。它直接决定下一步查什么，不等于“我还没读够网页”。
- **Coverage（覆盖度）**：关键子问题和主张是否都已有足够证据触达。覆盖度关注研究问题，而不是来源数量。


研究循环的高价值状态不是“已读 30 个网页”，而是“哪些关键问题仍缺证据”。

```text
Known claims
+ supporting evidence
+ unresolved conflicts
+ missing subquestions
→ next research action
```

<a id="ch15-evidence-chain"></a>
### 3.5 Claim（主张）→ Evidence（证据）→ Source（来源）→ Citation（引用）/ Provenance（来源链）

#### 本节新词

- **Research Evidence（研究证据）**：在研究场景中能够支持或反驳某个 Claim、并可重新检查的事实、数据或原文。它沿用 Durable Execution 的 Evidence 原则，但额外强调 Source 与 Citation 可回读。
- **Source（来源）**：Evidence 来自的原始文档、论文、规范、数据库或官方页面。多个网页转载同一原始消息时，Source 独立性并没有增加。
- **Citation（引用）**：让读者从 Claim 回到 Source 的可访问指针。Citation 证明“可以回读”，但不自动证明 Source 权威或 Claim 成立。
- **Provenance（来源链 / 溯源）**：记录 Evidence 从原始 Source 到摘录、综合和最终 Claim 的路径，用来判断证据是否独立、是否被误转述。


这里后文简称 Evidence。引用真正有价值的地方，是让结论能回到可检查来源。多个站点转载同一条消息，不等于多个独立 Evidence。关键结论优先第一手/官方来源；二手材料可以补背景，但不应制造虚假的证据独立性。

<a id="ch15-conflict"></a>
### 3.6 Evidence Conflict（证据冲突）：冲突不能平均掉

#### 本节新词

- **Evidence Conflict（证据冲突）**：两个或多个来源对同一 Claim 给出不兼容结论。处理它要比较时间、定义、范围和 Authority，不能按网页数量投票。
- **Primary Source（第一手来源）**：最接近事实产生位置的原始论文、规范、官方数据或项目仓库。它通常比转述更有权威性，但仍需检查版本与适用范围。
- **Authority（权威性）**：在当前问题上某个来源被信任到什么程度；它与语义相似度、网站数量不是一回事。


遇到不同来源冲突时，应记录：claim、source authority、publication/fact date、scope、definitions、是否独立、可否获得 primary source。不能把“多数网页说 X”自动升级为 Truth。

<a id="ch15-replan"></a>
### 3.7 Replan（重新规划）：新证据改变路线

#### 本节新词

- **Replan（重新规划）**：证据缺口或冲突出现后，修改后续问题、来源或范围的动作。它体现的是研究路径可变，而不是重新写一份漂亮计划。
- **Counterexample（反例）**：能够挑战当前 Claim 的事实或案例。主动寻找反例可以减少研究只收集支持材料的确认偏差。


Replan 可能意味着：提出新问题、换 Source、改变时间范围、寻找反例、运行计算、缩小结论强度。这里的动态性才是 Deep Research 与静态搜索流水线的核心差异。

<a id="ch15-stopping"></a>
### 3.8 Stopping Criteria（停止条件）：研究不能因为还能搜就永远搜

#### 本节新词

- **Stopping Criteria（停止条件）**：判断研究何时已经足够、应结束或转人工的明确规则，通常结合 Coverage、冲突、Freshness、预算和证据质量。
- **Marginal Utility（边际效用）**：再增加一次搜索或一个来源，还能让结论改善多少。边际效用很低时继续搜索只会增加成本和噪声。
- **Uncertainty（不确定性）**：现有证据无法安全消除的未知或冲突。成熟研究可以明确保留不确定性，而不是为了“有答案”强行下结论。


至少检查：Coverage、Evidence Quality、Conflict Resolution、Freshness、Budget、Marginal Utility。

一个实用停止规则：关键 claim 已被足够可靠来源支撑，重大冲突有解释或被明确保留为 uncertainty，继续搜索不再显著改变结论。

<a id="ch15-research-runtime"></a>
### 3.9 Research Runtime（研究运行时）怎样承接研究过程

#### 本节新词

- **Research Runtime（研究运行时）**：把 Plan、Budget、Source Policy、Evidence refs 和研究状态放进长期 Task 的执行环境。它是 Runtime 原语在研究场景的特化，不是新的 Runtime 定义。
- **Evidence Ref（证据引用）**：指向已保存证据对象或来源位置的稳定引用，避免每一轮都复制完整材料。


Research Runtime 可以维护 Plan、State、Source Policy、Budget、Stopping、Artifact 与 Evidence refs。它把“Runtime 与 Task”一章的原语应用到研究场景，并不另造一套 Runtime 定义。

<a id="ch15-least-privilege"></a>
### 3.10 Read-heavy Least Privilege（偏只读的最小权限）

#### 本节新词

- **Least Privilege（最小权限）**：只给予完成当前责任所需的最小能力和数据访问范围。研究任务主要理解世界，因此默认应偏只读。
- **Read-heavy（偏只读）**：大多数动作是搜索、读取和分析，而不是修改现实世界。它描述权限形态，不代表研究 Agent 永远不能触发后续动作。


研究责任通常是“理解世界”，因此默认权限应偏向只读。会研究不意味着自动拥有发布、删除、发送、交易等高副作用权限；研究结论要触发现实动作时，仍要经过 Durable Execution 的权限、审批和证据门槛。

<a id="ch15-deep-read"></a>
## 研究对象不是网页，而是可证伪的 Claim 图

比“保存网页列表”更强的研究状态是：

```text
Claim A
├─ Evidence A1 → Source 1
├─ Evidence A2 → Source 2
└─ Conflict C1 → Source 3

Gap G1
→ needs primary source / newer data / counterexample
```

这样 Replan 和 stopping 都围绕知识缺口，而不是围绕浏览次数。

<a id="ch15-current-facts"></a>
## 当前研究产品与来源事实

截至 2026-09-03，OpenAI 官方帮助文档仍说明：Deep Research 可以使用公开 Web、指定站点、上传文件和符合权限条件的连接应用；执行前会生成可审阅和修改的研究计划；执行中可以查看进度并中断以调整重点或来源；最终返回带 Citation / Source Link 的结构化报告。这个产品案例说明了 Plan、Source、Progress、Citation 四类稳定责任，但不能反过来作为所有 Deep Research 系统的统一定义。

官方来源：[OpenAI Help Center｜Deep research in ChatGPT](https://help.openai.com/en/articles/10500283-deep-research-faq)。

本章已把稳定研究闭环与带时间戳的产品事实分开。

<a id="ch15-canonical-references"></a>
## 研究闭环怎样进入真实环境和评估

- Reasoning / inference-time compute → [Reasoning 章](../01_模型智能/05_推理模型改变了什么.md)。
- Retrieval / RAG / Knowledge Source → [RAG 章](../02_知识与能力/01_模型怎样使用外部知识.md)。
- Agent Loop / Harness → [Agent Loop 章](../03_Agent与Workflow/03_Agent怎样自主决定下一步.md)。
- Context → [State/Context/Memory 章](../04_Harness与Runtime/02_为什么要分开状态上下文与记忆.md)。
- Evidence / Truth / Permission → [Durable Execution 章](../04_Harness与Runtime/04_长任务怎样安全恢复.md)。
- Execution Environments → [Execution Environment 章](03_怎样为Agent提供安全的执行环境.md)，不是本章 prerequisite。
- Agent Eval → [Evaluation 章](04_怎样证明Agent真的完成了任务.md)。

<a id="ch15-review"></a>
## 用这些问题检查研究是否真正闭环

1. 为什么 RAG 搜十次也不一定等于 Deep Research？
2. Knowledge Gap 怎样驱动下一步？
3. 为什么转载不能算独立证据？
4. Evidence Conflict 应如何保留？
5. Research stopping 至少看哪六类条件？
6. 为什么 Research Agent 默认 read-heavy？

## 学习导航

[← 上一章](../05_MultiAgent与协作/05_为什么Agent越多系统越复杂.md) · [新版目录](../README.md) · [下一章 →](02_Agent怎样进入浏览器和代码环境.md)
