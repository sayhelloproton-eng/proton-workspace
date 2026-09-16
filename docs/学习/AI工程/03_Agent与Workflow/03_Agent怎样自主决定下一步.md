# Agent 怎样自主决定下一步

> 唯一职责：解释模型如何依据 Observation 动态决定下一步，以及 Agent Loop 的收益和失败方式。

## 当下一步无法预先写死，模型开始参与决策

### 本节新词

- **Agent（智能体）**：围绕一个目标持续读取环境信息、选择动作，并根据新结果继续决策的系统角色。它不是模型名称，也不是“调用过一次 Tool”的聊天接口。
- **Agent Loop（Agent 决策循环）**：反复执行 `Observe → Decide → Act → Observe` 的控制循环，让后续路径可以随环境反馈改变。
- **Observation（观察）**：环境、Tool、用户或子任务返回给 Agent 的信息。它是后续判断的输入，不自动等于已经验证的事实。
- **Goal（目标）**：这次长期行为最终要达到的结果。Goal 描述“要完成什么”，不等于当前 Plan（计划）或下一步 Action（动作）。

Agent 的关键不是“调用了 Tool”，而是进入 Agent Loop（智能体循环）：模型观察当前状态、决定动作、读取结果，再根据新观察重新决定下一步。

```text
Goal
  ↓
Observe → Decide → Act → Observe → ... → Stop
```

ReAct 把 reasoning 与 acting 交替起来；Agent Loop 把这种模式做成可执行控制循环。但 Loop 只提供动态决策，**不自动提供 Task 连续性、权限、恢复、证据或成功保证**。

## 从 Tool Use 到 Agent

### 本节新词

- **Tool Use（工具使用）**：系统调用外部能力完成某个动作。它可以发生在固定 Workflow 中，不足以单独证明系统拥有 Agent Loop。
- **Dynamic Policy（动态策略）**：下一步动作不能在设计时完全枚举，而要根据当前 Observation 在允许范围内选择。Agent 更接近受约束的动态策略，而不是人格标签。

一次 Function Calling 可以是固定 Workflow 的一个节点。只有当调用结果改变后续计划，而后续动作不是预先写死时，系统才进入 Agent Loop：

```text
固定：extract → search → summarize

动态：
  先检查已有证据
  → 发现时间范围不清
  → 查询版本历史
  → 发现冲突
  → 改查权威来源
  → 判断证据是否足够
```

因此 Agent 更接近“受约束的动态策略”，不是一个人格标签。

## ReAct 解决了什么

### 本节新词

- **ReAct（Reason + Act，推理—行动）**：把分析、行动和新观察交替组织起来的决策模式。它让模型可以先行动获得信息，再依据新信息修正下一步。
- **Reason（分析）**：在 ReAct 语境中指为当前动作进行判断和比较；它不等于必须向外公开模型的私有 Chain of Thought。
- **Act（行动）**：让环境发生可观察变化，或主动获得新信息的动作，例如调用 Tool、查询资料或请求用户补充。

纯生成只能依赖当前 Context。ReAct 允许模型：

- 把不确定问题转成外部观察；
- 用 Tool 结果修正先前假设；
- 把长目标拆成当前动作；
- 在证据不足时继续探索；
- 发现失败后选择替代路径。

它真正改变的是信息流：模型不再一次性猜完整答案，而是可以通过行动获得新信息。

<a id="ch09-agent-loop"></a>
## 一个最小 Agent Loop

### 本节新词

- **Policy（策略／政策规则）**：对模型 Proposal（提议）进行允许、拒绝或约束的确定性规则层。它负责“能不能这样做”，不是让模型自己批准自己。
- **Runtime（运行时）**：承接真实执行、任务生命周期和环境交互的软件层。本章只展示它在 Loop 里的位置，后续 Runtime 章完整展开。
- **Reducer（状态归并器）**：把新的 Observation 按明确规则应用到现有 Task State，生成下一版状态，而不是直接把模型描述当成事实。
- **Validator（校验器）**：依据 Schema、业务规则或外部证据检查结果是否满足要求。
- **State Commit（状态提交）**：在验证后把可接受的变化写入任务状态，形成下一轮可依赖的输入。

```text
while task not terminal:
  context = assemble(task_state, recent_events, available_capabilities)
  proposal = model.decide(context)
  checked = policy.validate(proposal)
  result = runtime.execute(checked)
  observation = normalize(result)
  task_state = reducer.apply(observation)
  if success_criteria_met(task_state): stop
```

即使伪代码很短，责任也必须分开：

- Model 提议；
- Policy 决定是否允许；
- Runtime 执行；
- Reducer 提交状态；
- Validator 判断 Effect；
- Stop rule 决定是否终止。

把所有责任都写进一个 Prompt，会让系统无法区分“模型说做了”和“现实中已完成”。

## Action 不只有 Tool Call

### 本节新词

- **Action（动作）**：Agent 当前决定执行的下一步。它既可以调用 Tool，也可以请求输入、等待、委派、读取证据、更新计划或明确停止。
- **Blocked（阻塞）**：任务因为缺输入、权限、外部条件或资源而暂时不能继续。正确处理可能是等待或上报，而不是无限重试。

Agent 的 Action 可以是：

- 调用 Tool；
- 向用户请求缺失输入；
- 委派局部任务；
- 等待外部事件；
- 读取更多证据；
- 更新计划；
- 明确停止并报告阻塞。

“什么都不做并等待”在长期任务里可能是正确动作；无界重试通常不是。

## Planner–Executor

### 本节新词

- **Planner（规划器）**：维护长期目标、约束、依赖、阶段和完成标准的责任。它决定“接下来应该解决哪类问题”。
- **Executor（执行器）**：在当前状态下执行一个受限动作，并把结果交回系统。
- **Plan Version（计划版本）**：某一时刻被接受的计划快照。计划发生调整时保留版本边界，避免把后来修改的计划误写成早先已经执行的事实。

复杂任务需要同时维护两种尺度：

```text
Planner：目标、约束、依赖、完成标准、计划版本
Executor：在当前 State 下执行一个受限动作
```

Planner 不必是独立 Agent；它可以是同一 Runtime 中的一次模型调用或确定性模块。分离的价值是避免每次局部失败都重写长期目标，也避免计划文本被误当作已执行事实。

## Observation：Tool Result 还不是 Truth

### 本节新词

- **Truth（系统真值）**：经过来源、版本和验证规则确认后，系统愿意让后续决策依赖的事实。
- **Evidence（证据）**：支持某个 Fact（事实判断）的可检查材料，例如 API 回读、测试结果、文件 Diff 或截图。Observation 只有经过核验才可能成为 Evidence。
- **Fact（事实判断）**：系统对现实状态作出的具体断言，例如“部署版本 X 已经生效”。它需要 Evidence 支撑，不能只来自模型语言。

Agent 收到的可能是：

- API 返回；
- 页面截图或 DOM；
- 命令退出码与输出；
- 文件 Diff；
- 用户回复；
- Timeout；
- 子任务 Event。

它们首先是 Observation。是否支持某个 Fact，要经过来源、版本、完整性和验证规则判断。否则 Agent 容易在错误观察上继续做出一串逻辑自洽的错误动作。

## Stop Condition

### 本节新词

- **Stopping Condition（停止条件）**：明确规定 Loop 何时成功结束、失败退出或进入 Blocked 的规则。
- **Budget（预算）**：允许 Agent 消耗的步数、时间、Tool 调用或成本上限。预算是控制无界循环的硬边界。
- **Success Criteria（成功标准）**：能够验证 Goal 已达到的条件，例如测试通过、外部状态回读一致或所需证据齐全。

一个 Loop 至少要有：

```text
success criteria
failure / blocked criteria
step budget
time / cost budget
tool-call budget
critical error boundary
human approval boundary
```

“模型觉得完成了”不是强 Stop Condition。更可靠的是可验证 Outcome，例如测试通过、外部状态回读一致、要求的证据齐全。

## AutoGPT 热潮留下什么

### 本节新词

- **Goal Drift（目标漂移）**：Agent 在多轮行动中逐渐偏离原始目标或约束，却仍沿着内部自洽的方向继续执行。
- **Error Accumulation（错误累积）**：早期一次错误 Observation 或 Decision 被后续步骤持续引用，使长链错误不断放大。

早期 AutoGPT 证明了开放式 Loop 的吸引力，也快速暴露：

- 目标漂移；
- 重复调用与成本失控；
- 错误记忆累积；
- Tool 成功被误当作 Goal 成功；
- 长链误差放大；
- 缺少恢复和可靠停止。

这不是 Agent 概念失败，而是说明 `Loop ≠ reliable system`。后来真正留下的是受约束 Agent、结构化 Tool、Harness、Runtime、Eval 与 Evidence。

## Workflow 与 Agent 可以混合

不要把二者当互斥阵营：

- Workflow 负责合规骨架，Agent 负责局部开放探索；
- Agent 产生 Proposal，Workflow/Policy 决定允许的 Transition；
- Agent 发现新计划，Runtime 持久化 Plan Version；
- 固定验证节点包住不确定生成节点。

选择标准不是“哪个更先进”，而是谁能以最低复杂度满足成功率、风险、延迟和恢复要求。

## Agent Loop 最容易失控的地方

### 把聊天机器人叫 Agent

如果它只生成回复，没有外部行动、持续状态和动态下一步，称 Assistant 更准确。

### 无限循环直到成功

没有预算、失败分类、状态对账和停止条件的重试，会扩大副作用和成本。

### 让模型自己审批自己

模型可以解释风险，不能独占高权动作授权。Permission 和 Approval 必须由确定性边界执行。

### 保存全部 Chain of Thought 当 Memory

隐式推理不等于可复用事实；应保存 Task State、Evidence、Decision 与必要摘要，而不是把模型内部思路当 Truth。

## 从受限 Loop 开始

适合 Agent Loop：目标可定义、路径难穷举、环境能反馈、动作可约束、结果可验证。  
不适合：规则完全确定、错误代价极高且不可回滚、环境缺少可靠观察、成功无法定义、一次函数即可完成。

最小可靠路径是：

```text
Goal → constrained proposal → authorized action
     → observation → validation → state commit → stop/resume
```

## Loop 与 Runtime、Harness 怎样衔接

### 本节新词

- **Harness（工程托架）**：围绕 Agent Loop 提供 Context、Tool、权限、环境、验证和证据边界的工程结构，让动态决策运行在受控空间中。
- **Trajectory（执行轨迹）**：一次任务实际经历的 Observation、Decision、Action 和结果序列。Eval 可以检查 Trajectory 是否高效、安全，以及最终 Outcome 是否达到目标。

- Chain/Workflow 仍拥有确定性骨架；本章只引入动态下一步；
- 架构选择章判断是否值得从 Workflow 升级 Agent；
- Runtime 把 Loop 放进长期 Task，Harness 设计工作环境；
- Multi-Agent 只有在责任边界确实需要拆分时才出现；
- Eval 根据 Trajectory 与 Outcome 判断 Loop 是否创造增量价值。

## 检查任务是否真的需要 Agent

1. Tool Calling 为什么不自动等于 Agent？
2. Model、Policy、Runtime、Validator 分别拥有什么责任？
3. 为什么 Observation 不能直接提交为 Truth？
4. AutoGPT 热潮真正留下了哪些稳定原语？
5. 什么证据能证明 Agent 比 Workflow 更值得？

## 学习导航

[← 上一章](02_什么时候该用工作流.md) · [新版目录](../README.md) · [下一章 →](04_怎样选择合适的AI架构.md)
