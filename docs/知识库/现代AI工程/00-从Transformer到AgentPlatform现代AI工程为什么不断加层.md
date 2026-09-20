# 从 Transformer 到 Agent Platform：现代 AI 工程为什么不断加层

现代 AI 很容易被理解成一串模型、框架和产品的时间线。对技术开发者更有用的问题是：**每一次技术演进到底把什么新责任带进了软件系统，哪些确定性责任仍然不能交给模型。**

这篇不按年份罗列产品，而是沿着责任变化往下看：模型进入更真实的任务以后，软件为什么不得不一层层补上知识、行动、状态、权限、恢复、证据和协作。

模型能够生成语言，并不等于它知道最新事实；知道事实，并不等于它能改变现实；能调用工具，并不等于它会在开放环境里自主选择下一步；Agent 能循环，并不等于任务可以跨一天继续；任务能恢复，也不等于多个独立 Agent 可以安全协作；几个应用都能工作，也不等于值得抽成共享平台。

所以现代 AI 工程不是组件越来越多，而是模型进入更真实的世界以后，软件不得不逐步接管 Truth、State、Permission、Effect、Recovery、Evidence 和协作。

## 第一层：Transformer 先提供可扩展的概率智能底座

Transformer（以注意力机制为核心的神经网络架构）改变大模型的关键，不只是“用了 Attention”。它提供了一种适合大规模并行训练、让序列中不同位置直接建立依赖的计算结构。

在语言建模里，文本被切成 Token，再映射成向量。Self-Attention 让一个位置根据当前表示判断应该关注哪些位置，多层 Block 逐步形成更抽象的上下文表示。Decoder-only Transformer 最终通过 next-token prediction 持续生成文本。

这解决了“大规模学习语言、知识和模式”的问题，却留下第一条边界：

~~~text
模型参数里学到的模式和知识
≠
当前世界的实时真值
~~~

模型可以知道很多，却不知道此刻仓库有哪些未提交修改，也不知道刚刚发生的订单状态。

## 第二层：Foundation Model 与 Post-training 把模型变成可复用智能组件

Scaling 让模型从专项能力逐渐变成 Foundation Model。In-context Learning 让同一个模型仅靠当前 Context 中的任务说明和示例临时适配许多任务；SFT、Preference Optimization 和 Chat 产品层又把“会续写”塑造成更稳定的“会协助”。

Reasoning Model 进一步把推理时计算变成可分配预算。

这一层的核心变化是：

~~~text
Model
从“某个任务的算法”
变成
可被不同产品重复调用的概率智能组件
~~~

但模型仍然只拥有参数世界和当前 Context，无法自己成为实时事实系统。

## 第三层：RAG 把外部 Truth 带进当前推理

RAG（Retrieval-Augmented Generation，检索增强生成）让模型在回答前先去外部 Knowledge Source 找证据，再把相关材料装进本轮 Context。

这使 Git、文档、数据库、论文、企业知识库可以在不重新训练模型的情况下进入推理。

但“有向量库”远远不够。不同问题需要不同 Truth：语义资料可以走 Vector，精确符号适合 Keyword，代码关系适合 CodeGraph，版本事实回 Git，结构化统计交给 SQL。

因此这一层真正增加的责任不是 Vector DB，而是：

> **从正确的事实 Owner 找到当前、可验证、具有来源的证据。**

## 第四层：Tool 与 Capability 把模型判断连接到真实动作

Structured Output 把自然语言结果收敛成软件可解析的结构；Tool Calling 让模型可以提出“希望调用什么能力、参数是什么”。

系统从：

~~~text
用户问题
→ 模型回答
~~~

变成：

~~~text
用户目标
→ 模型提出 Action
→ 软件校验
→ Executor 执行
→ Observation 回来
→ 模型继续判断
~~~

MCP 进一步标准化 Host 与外部 Tool / Resource 的连接。

但从这一层开始，系统必须永久记住一条边界：

~~~text
能提出动作
≠ 有权执行

Tool Result
≠ Real Effect

Real Effect
≠ Goal Success
~~~

模型负责语义选择，Permission、Policy、Executor、Readback 和最终 Truth 必须由模型外的软件拥有。

## 第五层：Workflow 与 Agent 开始分配“下一步由谁决定”

如果路径已知，普通代码、Chain 或 Workflow 最稳定。

~~~text
确定路径
→ Code / Workflow

下一步依赖新的 Observation
→ Agent
~~~

Agent 真正新增的是 Decision Loop：根据 Goal 和环境反馈动态选择下一步，而不是“有一个角色名”。

~~~text
Observe
→ Decide
→ Act
→ Observe again
→ Continue / Replan / Stop
~~~

这解决了固定流程无法合理枚举开放路径的问题，也带来了新的不确定性：循环、空转、错误 Tool、Goal Drift、状态漂移和错误完成判断。

因此 Agent 从来不意味着“把所有控制都交给模型”。确定性规则、权限和最终验证反而必须更明确。

## 第六层：Runtime 让 Task 比 Model Invocation 活得更久

一个模型调用可以结束，一个 Browser Session 可以重建，但审批、构建和跨天任务不会因此消失。

Runtime 把长期责任变成正式对象：

~~~text
Task
+ State
+ Event
+ Owner
+ Scheduler
+ Routing
+ wait / resume condition
~~~

于是第一次出现一条非常重要的工程边界：

~~~text
Model Invocation lifetime
≠ Session lifetime
≠ Task lifetime
~~~

长的是 Task，不是模型连接。

Runtime 让任务可以 WAITING、被 Event 唤醒、换一轮 Invocation 继续，也可以在进程重启后重新进入执行。

## 第七层：State、History、Memory、Context 被迫分家

长任务出现以后，聊天历史不再适合作为所有信息的唯一容器。

~~~text
State
→ 现在是什么

History
→ 过去发生过什么

Memory
→ 过去什么值得未来复用

Context
→ 这一轮模型真正看到什么
~~~

昨天的旧计划可以留在 History，却不能覆盖 Current Truth；Context 可以压缩，却不能把关键 State 一起“摘要掉”；模型推断可以成为 Memory Candidate，却不能未经治理直接晋升为事实。

这一步让 Context Engineering 从“Prompt 写得好不好”升级成“当前 Decision 到底需要哪些真实信息”。

## 第八层：Harness 把重心从“编路径”转向“编环境”

有 Agent Loop 和 Runtime，仍不代表模型能稳定完成复杂任务。

Harness（工程托架）开始负责当前工作环境：

~~~text
Instructions
+ Context
+ Tool / Skill surface
+ Workspace
+ Sandbox
+ Validator
+ Feedback
+ Budget / Stop Rule
~~~

Workflow 时代主要是 Programming the Path；Agent 时代更接近 Programming the Environment。

路径可以开放，但行动空间、可见事实、可用能力、风险边界和反馈必须被工程化。

同一个模型放进不同 Coding Agent 产品，效果差异经常首先来自 Harness，而不是模型名称。

## 第九层：Durable Execution 让副作用可以安全恢复

一旦 Agent 可以付款、发信、发布、删除或提交表单，最大的风险往往不是“模型答错”，而是系统不知道真实 Effect 到底有没有发生。

Timeout 只说明没有按时获得确定响应，不等于业务失败。

~~~text
execute
→ timeout / disconnect
→ effect = UNKNOWN
→ query authoritative source
→ effect exists / absent / still ambiguous
→ commit / safe retry / wait / human
~~~

Checkpoint、Operation Identity、Idempotency、Reconciliation、Approval、Evidence 和 Truth Commit 都在这一层成为硬责任。

这里的本质是：

> **模型可以提出动作，只有现实执行、验证并被权威状态提交以后，结果才能成为后续系统依赖的事实。**

## 第十层：Subagent 与 Multi-Agent 只在责任真的可以拆时成立

单一 Agent 的 Context 太重、权限不应共享、局部工作真正可并行，或者需要独立验证时，可以先拆 Subagent。

Delegation 只把局部责任委派出去；Handoff 才改变同一个 Task 的 Owner。

真正独立的 Agent 则意味着更强边界：Identity、Context、Permission、State 或 Lifecycle 独立存在。

每增加一个独立主体，都会新增 Ownership、Shared State、Handoff、Routing、Conflict、Recovery、Observability 和 Coordination Tax。

Multi-Agent 因而不是单 Agent 的“高级版本”，而是一种只有在独立责任真实存在时才值得购买的组织结构。

A2A 解决跨独立 Runtime / Agent 的互操作，不应该替代同一 Runtime 内更直接的原生协调。

## 第十一层：Environment 与 Eval 把“看起来完成”拉回现实

研究、浏览器、代码环境都遵循 Observe → Decide → Act，但它们面对的现实不同。

Research 依赖 Claim、Source、Evidence 和知识缺口；Browser 依赖 DOM、视觉状态、Session 和业务 Readback；Coding 则拥有 Repo、Shell、Diff、Compiler、Test、Build 和 Git。

这些环境提供不同 Feedback Density，也决定不同自治上限。

Agent 进入真实环境以后，系统必须同时回答：

1. 它最多能影响什么——由 Sandbox、Permission、Blast Radius 管理；
2. 它到底有没有完成——由 Evidence、Validator、Eval 和 Outcome 判断。

Observability 记录发生了什么，Eval 判断质量，Outcome 才回答真实目标是否满足。

## 第十二层：Platform 只共享已经反复出现的稳定责任

多个产品都能运行，不代表马上应该建设 Platform。

平台化只有在多个真实应用反复需要相同责任，而且这些合同已经逐渐稳定时才有证据，例如 Model Gateway / Provider Adapter、Knowledge / Retrieval、Capability、Runtime、Identity / Policy、Eval / Observability、Cost / Quota / Multi-tenancy。

合理演进通常是：

~~~text
product-owned implementation
→ shared convention
→ library / schema
→ shared service
→ control plane / platform
~~~

平台负责共享责任，不应该吞掉 Domain Workflow 和 Business Outcome。

## 历史里的热潮，最后往往不是消失，而是降到更合适的一层

现代 AI 工程的演进不是一条“旧技术被新技术淘汰”的直线。很多曾经被当成终局的东西，后来都没有消失，而是从系统中心退回了更准确的位置。

Prompt-first 没有消失，但 Prompt 不再等于整个产品；Vector Search 没有消失，但它只是 Retrieval 的一种表示和召回方式；Graph 没有消失，但固定状态和依赖图不再冒充完整 Runtime；AutoGPT 式无限自治留下了 Agent Loop，却把 Stop Rule、State、Permission 和 Recovery 的缺口暴露出来；Multi-Agent 也不会因为角色更多就自动成为正确架构。

可以把这种“热潮—降层”模式画成：

~~~text
新能力出现
→ 被当成可以解释整个系统
→ 真实失败暴露边界
→ 责任重新拆分
→ 新能力保留在它最擅长的一层
~~~

因此历史反例不是失败资产。它们告诉我们：**一项技术真正成熟的标志，往往不是覆盖更多概念，而是终于知道自己不负责什么。**

## 面对新的 AI 技术，先问七个问题

以后还会不断出现新的模型、协议、Agent 框架和平台。判断它们是否值得把架构再抬高一层，可以先问：

1. **它解决了上一层哪个已经反复出现的真实问题？**
2. **它真的接管了一项新的长期工程责任，还是只是重新包装已有能力？**
3. **采用以后，Truth、State、Permission、Effect 和 Recovery 分别由谁拥有？**
4. **其中哪些部分本来可以继续留在确定性代码、普通 Workflow 或现有 Tool 里？**
5. **它失败时能不能解释第一分歧、恢复路径和完成证据，而不只是给一个“Agent failed”？**
6. **相对更简单的 Baseline，它在质量、延迟、成本、隔离或可靠性上增加了什么可测价值？**
7. **如果明天替换掉这个具体产品或框架，哪些稳定合同、数据、证据和工程方法仍然可以留下？**

这七个问题比追逐名字更耐久。它们把技术判断重新拉回责任、证据和可替换性。

## 这条演进不是“越往下越高级”

现代 AI 工程最容易犯的错误，是把这十二层理解成成熟度排行榜。

真正稳定的反向原则是：

> **确定性越高，越应该下降到代码；真实复杂度没有出现，就不要提前上升。**

同一个系统可以同时存在：

~~~text
规则校验         → Script / Code
高频窄语义判断   → Small Model
固定业务路径     → Workflow
开放探索         → Agent
长期任务         → Runtime
高风险外部动作   → Policy + Approval
局部独立责任     → Subagent
跨产品公共责任   → Platform
~~~

这不是架构不统一，而是让每一种问题停在自己的最低充分复杂度。

## 把十二层收束成一条责任转移

从 Transformer 到 Agent Platform，真正不断变化的是“谁来承担责任”。

~~~text
Model
→ 概率智能计算

Knowledge / Retrieval
→ 外部事实和证据

Tool / Capability
→ 真实行动接口

Workflow / Agent
→ 固定路径与动态决策

Runtime
→ 长期 Task 连续性

State / Context / Memory
→ 真值、工作集与可复用过去

Harness
→ 当前工作环境

Durable Execution
→ 副作用、授权、恢复和证明

Subagent / Multi-Agent
→ 独立责任的组织

Environment / Eval
→ 现实反馈和结果判断

Platform
→ 多产品共享的稳定责任
~~~

这条责任图最后落到同一个原则：

> **模型负责处理模糊性，软件负责保存确定事实、约束真实副作用，并证明结果。**

完整的复杂度升级与降级判断可继续读 [Agent 工程复杂度与边界](../Agent工程/Agent工程复杂度与边界.md)。下一篇则从最底层开始，解释模型本身为什么能够理解和生成文本。
