# 怎样证明 Agent 真的完成了任务

> 唯一职责：解释 Task/Trajectory/Artifact/Outcome Eval、Evidence、Trace 与回归评估。

<a id="ch17-30s-core"></a>
## API 成功只能证明调用结束，不能证明任务完成

一个 Agent 调用了部署 API，返回 `200`，日志里每一步也都存在。此时最多只能确认“调用链走完了”；如果服务没有真正更新、用户目标没有满足，Task 仍然失败。可靠评估必须把“发生了什么”“有哪些证据”“按什么标准判断”“最终 Outcome 是否成立”拆开。

#### 本节新词

- **Observability（可观测性）**：通过 Log、Trace、Metric 等信息还原系统发生了什么以及为什么这样走。它回答过程事实，不直接给出质量结论。
- **Evaluation / Eval（评估）**：使用明确标准判断模型、Agent、Artifact 或 Outcome 做得好不好。它需要 Criterion / Rubric 或可机械检查的成功条件。
- **Outcome（结果 / 业务结果）**：用户或业务最终真正需要发生的结果。局部 Tool success、Artifact 生成或 Trace 完整都不能替代 Outcome。

```text
Observability：发生了什么，为什么这样走
Evidence：哪些可回读事实支持结论（沿用 Durable Execution）
Evaluation：做得好不好，是否满足标准
```

API 全部返回 200、Tool Call 全部成功、Trace 完整，都不能证明业务目标完成。Agent Eval（Agent 评估）必须从单次输出扩展到 Task、Trajectory、Artifact 和最终 Outcome。

## Trace、Evidence、Eval 与 Outcome 逐层回答不同问题

#### 本节新词

- **Trace（执行轨迹）**：按时间串联一次 Task 中的模型调用、Tool、Observation、State Transition 等步骤，用于解释过程。完整 Trace 仍可能描述一条最终失败的路径。
- **Log（日志）**：组件在运行中记录的事件或文本信息，是 Observability 的基础材料之一。Log 可以成为 Evidence candidate，但必须与具体 Claim、版本和来源绑定。


```text
Trace / Log      → 发生了什么
Evidence         → 有什么可核验事实
Eval             → 做得好不好
Outcome          → 对最终目标有没有价值
```

Observability、Evidence 和 Eval 是三层不同问题。系统可观测不代表结果正确；模型说“完成”也不是证据。Agent 必须把执行轨迹、Artifact 和现实 Effect 转成可复算的质量判断。

## 四层 Eval

### Task / Final Answer Eval

#### 本节新词

- **Task Eval（任务评估）**：判断当前 Task 的要求是否被正确理解和完成，适合回答、抽取、生成等直接交付。
- **Final Answer Eval（最终回答评估）**：专门检查最终自然语言或结构化回答的准确性、完整性、格式和约束；它不覆盖真实外部副作用。


目标是否被正确理解，最终回答是否完整、准确、符合格式和约束。适合问答、提取和生成任务，但不足以评估真实副作用。

### Trajectory Eval

#### 本节新词

- **Trajectory Eval（轨迹评估）**：判断 Agent 的执行路径是否合理，包括 Tool 选择、重复动作、越权、停止和证据使用。它评的是“怎样做”，而不是只看最终答案。
- **Trajectory（执行路径）**：从初始 Goal 到结果的一系列 Observation、Decision 和 Action。它比单纯 Trace 更强调决策质量。


观察执行路径：是否选择正确工具、是否重复搜索、是否越权、是否在错误证据上继续、是否正确停止。好 Outcome 可能来自坏路径的侥幸，坏 Outcome 也可能是环境故障。

### Artifact Eval

#### 本节新词

- **Artifact Eval（产物评估）**：检查代码、文档、文件、计划等正式交付物的结构、内容、版本和 Scope。

沿用 Durable Execution 对 Artifact 的定义，这里只评它的结构、质量、版本与范围。Artifact 存在不等于真实系统已应用，也不等于生成过程合规。

### Outcome / Effect Eval

#### 本节新词

- **Outcome Eval（结果评估）**：回到用户/业务成功标准，判断最终目标是否真正达成。它通常比局部 Tool 或 Artifact 指标更接近最终价值。
- **Effect Eval（真实影响评估）**：检查外部世界的状态变化是否符合预期，例如数据库记录、部署状态或页面对象。Effect 是可观察变化，Outcome 是这些变化是否满足最终目标。


回读现实世界：任务状态、数据库记录、页面对象、部署状态、测试行为是否符合成功标准。这通常是最强信号。

## 什么才算完成证据

Evidence 应绑定：

```text
claim / criterion
source or observation
version / timestamp
actor / tool
artifact or effect reference
validation method
```

日志是 Evidence 候选，不自动是证明。一个截图可能证明页面显示，但不证明服务端持久化；一个测试通过证明覆盖范围内行为，不证明生产状态。

## Observability Trace Model

#### 本节新词

- **Trace Model（轨迹数据模型）**：规定 `task_id / attempt / model invocation / tool call / state transition / artifact / evaluation` 等对象怎样关联，使一次执行可以追溯。
- **Attempt / Trial（尝试 / 试验轮次）**：同一个代表性任务的一次独立执行。概率系统需要多次 Trial 才能估计稳定性和方差。
- **Telemetry（遥测数据）**：系统自动采集的 latency、usage、error、model/version 等运行指标，服务 Observability 与后续 Eval。


一次 Task 至少要串联：

```text
task_id → attempt/trial → model invocation
        → tool call → result/observation
        → state transition → artifact/effect
        → evaluation
```

记录 model/version、prompt/context references、tool inputs、latency、usage、errors、policy decision 和 state version。敏感 Context 不必全文记录，可使用受控引用与摘要。

## Grader 选择

#### 本节新词

- **Grader（评分器 / 评估器）**：按照 Criterion 对输出、Artifact 或 Outcome 给出通过/失败或分数的组件。能机械判断时优先 deterministic grader。
- **Rubric（评分准则）**：把开放质量拆成可解释评分维度和等级的规则，常用于人工或 LLM Judge。
- **LLM-as-a-Judge（模型裁判）**：用另一个模型依据 Rubric 评审语义质量，适合难以机械判断的内容，但需要校准和人工抽样。
- **Deterministic Evaluator（确定性评估器）**：使用 Schema、规则、测试或精确匹配得到可重复结果的评估器。它不应被 LLM Judge 替代。


```text
exact/schema/rule check      能机械判断时优先
unit/integration test         行为与合同
environment readback         真实 Effect
human review                 高价值、主观或风险判断
LLM-as-Judge                 模糊质量与规模化辅助
```

LLM Judge 也要校准：定义 rubric、对照人工样本、检查位置/长度/风格偏差，并保留不确定结果。

## Trial 与概率系统

单次成功不能代表可靠。对代表性任务重复 Trial，统计成功率、关键错误和方差。固定随机性可以帮助复现，但生产输入、模型和环境仍会漂移。

## Golden Set、Failure Slice 与 Regression

#### 本节新词

- **Golden Set（黄金样本集）**：一组已知输入、期望结果或 Evidence 的代表性测试样本，用作稳定回归基线。
- **Failure Slice（失败切片）**：按领域、风险、Context 长度、Tool 或错误类型把失败分组，帮助定位平均分掩盖的系统性问题。
- **Regression Eval（回归评估）**：模型、Prompt、Tool、Runtime 或 Policy 改动后重复运行固定评估，确认旧能力没有退化。
- **Benchmark（基准评测）**：在统一任务和评分条件下比较系统表现的标准化评测。公开 Benchmark 提供外部参考，但不能替代本系统真实分布。


Golden Set 应来自真实任务，不只包含顺利样例。Failure Slice 按领域、语言、工具、风险、Context 长度、环境和错误类型分组。平均分可能掩盖一个关键 Slice 的系统性失败。

每次模型、Prompt、Tool、Runtime 或 Policy 变更后跑回归；不仅比较最终分数，还比较成本、延迟、调用次数和关键错误。

## Offline 与 Online Eval

#### 本节新词

- **Offline Eval（离线评估）**：在固定数据和可复现环境中运行的评估，适合开发、对比和回归。
- **Online Eval（在线评估）**：在真实流量和真实环境中观察质量、用户行为和失败分布。高风险动作不能无边界在线试验。
- **Shadow（影子运行）**：让新方案接收真实输入但不影响正式结果，用于低风险比较。
- **Canary（金丝雀发布 / 小流量试运行）**：只让一小部分真实流量进入新方案，观察关键指标后再扩大范围。


Offline 适合可复现比较、回归和开发速度；Online 反映真实分布、用户行为与环境故障。线上不能无边界试验高风险动作，应使用 shadow、canary、只读或审批策略。

## Failure Taxonomy

#### 本节新词

- **Failure Taxonomy（失败分类体系）**：按照模型、检索、Tool、Permission、Environment、Runtime、Coordination、Evaluator 等责任层归类失败，避免把所有问题都归因为“模型不够强”。
- **Evaluator Defect（评估器缺陷）**：评分规则、测试或 Judge 自身错误导致的误判。Eval 系统也必须被验证。


- model understanding / reasoning；
- retrieval / evidence；
- tool selection / parameters；
- permission / policy；
- environment observation；
- runtime / recovery；
- coordination / handoff；
- evaluator defect。

把所有失败归为“模型不够强”会导致错误升级。

## 什么时候值得升级评估架构

Eval 不只选模型，也判断架构：Agent 是否比 Workflow 好；Multi-Agent 是否带来增量；RAG 是否优于更简单检索；Platform abstraction 是否减少重复且不损失自治。没有基线对照，复杂架构无法证明价值。

## 评估最容易被哪些代理指标带偏

- 只看最终答案，不看真实 Effect；
- 只评一次，不看方差；
- 只看平均分，不看关键 Slice；
- 用 LLM Judge 评本可机械判断的格式和测试；
- Observability 收集海量日志，却不能关联 Task 与版本；
- 评测集泄漏到 Prompt 或训练数据；
- 指标改善但人工介入和成本大幅上升。

## ProFlow Lens｜Package Test 为什么不能替代真实 Browser Journey

ProFlow 把证据分层：设计/候选、package test、materialized extension/runtime、真实 Chrome/ChatGPT journey、最终 Phase Gate。前一层通过只能证明对应责任，不能向上“冒充 READY”。这正说明了为什么架构判断必须绑定证据层级：**测试通过是 Evidence 的一种，不是最终 Outcome 的同义词。**

## Evidence、Eval 与 Economics 怎样分工

- Durable Execution 定义 Observation、Evidence、Truth commit；本章定义怎样评分；
- 环境章提供可回读 Effect；
- Economics 章把质量与成本、延迟、可靠性放在一起；
- Routing、Multi-Agent 和 Platform 都必须受 Eval 反馈约束。

## 检查“做对了”是否真的有证据

1. Observability、Evaluation、Evidence 分别回答什么？
2. 为什么 Tool success 不是 Outcome success？
3. 什么时候应使用机械 Grader，什么时候需要 LLM Judge？
4. Failure Slice 为什么比平均分更能指导架构？

## 学习导航

[← 上一章](03_怎样为Agent提供安全的执行环境.md) · [新版目录](../README.md) · [下一章 →](05_怎样计算Agent的真实成本.md)
