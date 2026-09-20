# 从 Prompt、Copilot、Workflow 到 Agent

现代 AI 应用最常见的过度设计，是一看到模型能调用 Tool，就立刻把整个产品做成 Agent；另一种相反错误，是路径已经充满未知，却仍然试图用固定 Workflow 把所有分支提前写死。

真正要判断的不是哪个词更“高级”，而是：**目标、路径和反馈里到底有多少可以预先确定，多少必须在运行时根据新 Observation 再决定。**

## Prompt：模型只负责一次局部计算

Prompt（提示词：当前调用给模型的目标、材料和约束）解决的是“这一轮模型该做什么”。

~~~text
input
→ Prompt
→ Model
→ output
~~~

翻译、摘要、分类、改写、解释一段代码等任务，很多到这里就够了。只要结果可以一次生成，而且不需要持续读取外部变化、执行动作和保存长期状态，就没有理由先建设 Agent。

Prompt 的天然边界也很清楚：规则和资料只存在当前 Context，不能自动成为持久状态、正式权限或现实真值。

## Copilot：模型进入工作流，但人仍然拥有下一步

Copilot（协作式 AI：在人的现有工作环境里给建议、生成或局部操作）比单次 Prompt 更接近真实生产，因为它能看到 IDE、文档、表单等当前工作 Context。

但控制权通常仍在人：

~~~text
人决定目标和下一步
→ AI 提供局部建议 / 生成
→ 人接受、修改、执行
→ 继续
~~~

代码补全、IDE Chat、文档建议都属于这一类。

它的优势来自责任少：状态和权限边界简单，错误通常停留在局部候选。只有当人的主要工作变成不断替 AI 搬运文件、日志、环境结果并决定下一步时，才出现更强自动化的需求。

## 为什么 Coding 场景很早就适合把 Copilot 推向 Agent

Coding 是 Agent 工程很早成熟起来的场景之一，一个重要原因不是代码模型“几乎不会犯错”，而是软件工程环境提供了很高的 Feedback Density（反馈密度：一次动作以后，环境能够快速返回多少可验证的新信息）。

一个仓库天然就有很多模型外部的反馈面：

~~~text
Repo / Source
→ 当前事实

Diff
→ 到底改了什么

Compiler / Typecheck
→ 结构和类型是否成立

Test
→ 指定行为是否仍然满足

Build
→ 产物能否生成

Git
→ 版本、历史和可恢复边界

Shell / Runtime
→ 真实执行结果
~~~

于是 AI 可以形成比纯聊天更扎实的闭环：

~~~text
observe repository
→ propose / edit
→ compile / test / run
→ read failure or diff
→ revise
→ verify again
~~~

这解释了为什么代码补全会自然向 IDE Chat、Tool-using Coding Agent、Task delegation 和长期工程 Runtime 演进：每往前一步，模型都能获得比“自我评价”更强的外部反馈。

但高反馈环境并不意味着可以取消控制。Compiler PASS 不能证明业务目标完成，Test 只证明它覆盖的行为，Diff 只证明文件发生变化；而一旦 Shell、Git、网络和发布能力开放，Blast Radius（影响半径：一次错误动作可能波及的真实范围）也会同步增大。

因此 Coding Agent 的优势来自：

~~~text
开放问题
+ 高密度外部反馈
+ 可隔离执行环境
+ 可审阅 Diff
+ 可重复验证
~~~

而不是来自“把整个仓库交给模型自由发挥”。更完整的软件工程产品边界继续由 [Coding Agent](../工程工具与运行时/Coding-Agent.md) 展开。

## Chain：路径固定，模型只是其中一个函数

Chain（链式调用）适合几个步骤按固定顺序执行：

~~~text
extract
→ summarize
→ classify
→ save
~~~

每一步可以是普通代码，也可以调用模型。它的优点是简单、可预测、容易测试。

如果步骤 B 永远依赖 A，而且不存在复杂状态和动态分支，不需要因为“有多个步骤”就上 Graph 或 Agent。

## Workflow：把业务路径和合法状态写进软件

Workflow（工作流：由系统预先定义步骤、分支、依赖和状态转换的执行结构）适合路径可以枚举、业务规则需要稳定控制的场景。

例如内容发布：

~~~text
Draft
→ Review
→ Approved?
   ├─ No → Revise
   └─ Yes → Publish
~~~

模型可以在某个节点做语义判断，但哪些状态合法、什么时候进入下一步，由 Workflow 定义。

这形成一个长期有效的分工：

> **模型处理模糊性，Workflow 处理确定性。**

## Graph 只有在依赖和分支真的复杂时才有价值

Graph（图式编排）适合真实存在复杂依赖、分支、循环和汇合点的任务。它通常显式表示 Node、Edge、State 和 Conditional Transition。

真正需要 Graph 的信号包括：

- 分支很多且会复用；
- 节点有明确依赖；
- 某些步骤可以等待或并行；
- 失败需要从局部节点恢复；
- 状态转换本身属于业务真值。

三步直线流程画成三个 Node 不会自动更可靠。普通 Application Service 已经足够时，Graph 只是额外抽象。

## Agent 的分界点：下一步无法提前完全写死

Agent（智能体：围绕 Goal，根据 Context 和环境反馈动态选择下一步行动的执行主体）真正新增的是 Decision Loop，而不是角色名。

最小循环可以写成：

~~~text
Goal
↓
Observe current world
↓
Decide next action
↓
Act through allowed capability
↓
Observe result
↓
Continue / Replan / Stop
~~~

例如调试未知 Bug：先看错误，再决定读哪个文件；源码显示依赖版本可疑，于是检查配置；新的 Test 又暴露环境异常，路线随 Observation 持续变化。

这种任务如果强行提前写成固定 Workflow，会制造大量并不存在的预设分支；开放 Decision Loop 反而更自然。

## ReAct 和 Plan-then-Act 是两种 Loop 组织方式

ReAct（Reason + Act：在推理和行动之间反复切换的方法）强调每获得一轮新 Observation 就继续判断下一步。

Plan-then-Act（先规划后执行）先形成较完整计划，再执行，遇到偏差再 Replan。

真实系统常常组合两者：先做有限规划，再在执行中根据环境反馈修正。

重要的不是 Prompt 里有没有写 Thought / Action / Observation，而是系统是否真的把外部 Observation 回传、允许路线变化，并拥有明确 Stop Rule 和 Validator。

## Stop Rule 必须是正式控制，而不是模型“觉得差不多”

开放 Loop 如果只有“继续，直到完成”，很容易出现：

- 反复搜索同一类资料；
- 连续调用相似 Tool，却没有新增信息；
- 把局部成功误认为 Goal 已完成；
- 达到成本或时间上限后仍然继续。

Stop Rule（停止规则：定义什么时候成功、等待、阻塞、耗尽预算或不可恢复失败）应该落到可观察条件：

~~~text
SUCCESS
→ success criteria satisfied + evidence

WAITING
→ external event / approval missing

BLOCKED
→ required capability / input unavailable

BUDGET_EXHAUSTED
→ time / turns / cost reached

FAILED
→ unrecoverable condition proven
~~~

模型输出 DONE 最多只是 Completion Candidate，不能替代真实完成判断。

## Agent 不能吞掉确定性规则

开放决策不意味着把权限、状态、重试和完成也交给模型。

更健康的分工是：

~~~text
Agent
→ decides ambiguous next step

Code / Workflow
→ owns hard rules

Runtime
→ owns long-lived task state

Policy
→ owns authorization

Executor
→ owns real effect

Validator
→ owns deterministic checks
~~~

Agent 是智能决策者，不是系统中所有事实和控制的唯一 Owner。

## Deterministic Island：开放 Agent 里仍然应该有确定性岛屿

真实 Agent 系统通常不是“全部开放”或“全部 Workflow”二选一。

Deterministic Island（确定性岛屿：在开放 Agent Loop 中由代码固定拥有的局部流程）可以承接：

- Auth / Permission；
- Schema Validation；
- 数据事务；
- Build / Test；
- 审批；
- 关键状态迁移；
- 发布 Gate。

结构更像：

~~~text
Agent decides
→ deterministic operation
→ verified observation
→ Agent decides again
~~~

这样既保留开放探索能力，又不会让每个确定步骤重新经过概率决策。

## 自主性应该按风险和反馈强度购买

Autonomy（自主性：允许 Agent 在没有人工逐步确认的情况下连续决定和行动的程度）不是一个全局开关。

至少要结合：

~~~text
action reversibility
+ blast radius
+ observation reliability
+ validation strength
→ allowed autonomy
~~~

| 场景 | 自主性倾向 |
|---|---|
| 只读代码搜索，有 Git/Test 回读 | 较高 |
| 修改隔离 worktree，可完整测试 | 中高 |
| 修改共享生产配置 | 低 |
| 付款、删除、对外发布 | 明确审批 |

模型能力提高会扩大“能做什么”，不会自动扩大“应该被授权连续做多少”。

## Agent 的失败不只是“推理错了”

至少要区分：

~~~text
Observation failure
→ 看错环境

Planning failure
→ 目标分解或路线错误

Tool selection failure
→ 选错能力或参数

State drift
→ 使用过期事实

Loop failure
→ 重复、空转、无法停止

Authority failure
→ 越权或绕过审批

Validation failure
→ 把局部成功当最终成功
~~~

这些失败属于不同 Owner。全部归因成“换更强模型”，会掩盖 Harness、Tool、Runtime 和 Policy 的真正缺陷。

## 一张最小架构选择表

| 任务形状 | 优先形态 | 原因 |
|---|---|---|
| 一次生成、无外部状态 | Prompt / Model Call | 没有长期控制需求 |
| 人决定下一步，AI 局部辅助 | Copilot | 控制简单，错误局部 |
| 固定线性步骤 | Chain / Code | 路径完全可确定 |
| 明确分支、审批、状态机 | Workflow / Graph | 状态转换本身是业务规则 |
| 下一步依赖实时 Observation | Agent | 需要动态决策 |
| Agent 跨会话、等待、恢复 | Agent + Runtime | Loop 已经不够 |
| 多个独立责任主体协作 | Multi-Agent（有证据时） | 责任边界真正独立 |

Agent 和 Runtime 不是同一次升级，Multi-Agent 也不是 Agent 的默认终点。

## Coding Agent 展示了控制权怎样继续外移

Coding 产品很适合观察另一条演进轴：

~~~text
Code Completion
→ Chat in IDE
→ Agent edits / runs tools
→ Task delegation
→ Background / long-running work
→ Agent Workspace
~~~

开始时 AI 只提供候选；后来能够进入 Repo / Shell；当任务可以被完整委派并跨时间持续以后，产品中心才从“当前编辑器”逐渐转向 Task、Workspace 和 Review。

真正增加的不是“模型会写更多代码”，而是 Runtime、State、Isolation、Recovery 和 Verification。

专题可继续读 [Coding Agent 真正竞争的是什么](../工程工具与运行时/Coding-Agent.md)。

## 什么时候应该主动停在更简单的架构

路径能够提前定义、状态转换属于业务规则时，优先 Workflow；只有下一步必须依赖运行时新观察、无法合理枚举时，才让 Agent 获得动态决策权。

真实产品经常是 Workflow 包住 Agent：

~~~text
deterministic business boundary
→ local agent decision
→ deterministic effect / validation
→ next decision
~~~

如果 Agent 开始跨小时、跨天、等待 Approval / Webhook / Build，问题已经不再是 Loop 怎么写，而是 Task 怎样持续存在，这时才进入 Runtime。

如果单 Agent 已经能闭环，也没有必要为了“多个角色”直接升级 Multi-Agent。

更完整的复杂度升降判断见 [Agent 工程复杂度与边界](../Agent工程/Agent工程复杂度与边界.md)。下一篇进入时间尺度变化：**一次模型调用可以结束，但 Task 为什么不能跟着消失。**
