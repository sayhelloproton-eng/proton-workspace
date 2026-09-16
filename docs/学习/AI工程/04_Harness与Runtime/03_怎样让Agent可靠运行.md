# 怎样让 Agent 可靠运行

> 唯一职责：解释怎样通过当前工作材料、可用能力、权限边界、隔离环境和结果检查，构成一个让 Agent 更容易做对事的工作环境。

## 当 Agent 进入真实仓库，光有 Loop 为什么不够

### 本节新词

- **Harness（工程托架）**：围绕 Agent Loop 设计工作环境，决定这一轮模型能看到什么、能调用什么、在哪里操作、哪些动作受限，以及结果怎样被验证。
- **Work Environment（工作环境）**：Agent 实际进行判断和动作时所处的 Context、Tool、Workspace、权限和反馈条件。Harness 的主要作用是设计这个环境，而不是替模型思考。
- **Output Contract（输出合同）**：规定结果必须满足的结构、字段、格式或可验证要求，让后续软件能够消费和检查模型输出。

让模型进入一个真实仓库时，只告诉它“完成任务”远远不够。它还需要知道该读哪些事实、能用哪些工具、哪里允许写、什么动作要审批，以及怎样用测试、Diff 或外部回读证明结果。缺少这些条件，Agent Loop 即使能够不断决定下一步，也只是在一个边界模糊、反馈稀薄的环境里持续试错。

因此，工程上需要把这些工作条件显式组织起来：

```text
任务说明 + 当前工作材料 + 可用能力
+ 权限边界 + 隔离环境 + 结果检查
+ 反馈 + 预算 + 输出合同
= Harness
```

它不会让概率模型突然变成确定程序，却能减少无关选择、补足证据、限制危险动作并缩短反馈周期。这里讨论的是“怎样让当前工作更容易做对”；任务怎样跨时间存在、崩溃后怎样恢复，仍然属于 Runtime。

## Programming the Path → Programming the Environment

### 本节新词

- **Programming the Path（编写路径）**：开发者提前定义任务应该经过哪些步骤和分支，是 Workflow 时代的主要控制方式。
- **Programming the Environment（编写环境）**：当下一步由 Agent 动态选择时，工程重点转向限定可行动空间、提供高质量反馈和验证边界。

Workflow 时代主要编写路径；Agent 时代路径会动态变化，工程重心转向环境：

- 模型看见哪些 Context；
- 能用哪些 Tool，描述是否清楚；
- 哪些方法沉淀为 Skill；
- 在哪个 Workspace / Sandbox 操作；
- 哪些动作需要 Approval；
- 怎样快速获得测试、Diff、截图和状态回读；
- 什么输出必须满足结构合同。

这不是放弃控制，而是把控制从“每一步怎么走”转成“允许在什么空间里走、怎样知道走对了”。

## Harness 与 Runtime

上一章已经正式定义 Runtime 和 Task Continuity。这里不再重讲，只把它们和 Harness 放在同一张责任表里：

| 责任 | Harness | Runtime |
|---|---|---|
| 核心问题 | 怎样让当前工作更容易做对 | 怎样让 Task 跨时间持续存在 |
| 主要对象 | Context、Tool、Skill、Workspace、Validator | Task、State、Event、Checkpoint、Scheduler |
| 失败关注 | 选错工具、缺证据、越权、反馈差 | 中断、重复副作用、状态丢失、无法恢复 |

同一产品可以把二者做在一个框架里，但概念上必须拆开，否则会把“框架支持 memory”误解为系统已经有可靠 State。

## Instructions：长期规则不是人格装饰

### 本节新词

- **Instruction（指令）**：告诉 Agent 当前目标、范围、约束或工作规则的信息。有效指令需要有来源和作用域，而不是只描述“你是一个优秀助手”。
- **Instruction File（指令文件）**：把仓库或工作区长期规则写进可版本化文件的做法，`AGENTS.md`、`CLAUDE.md` 是常见文件名示例。文件只是规则来源，不是 Agent 本体。
- **Scope（作用域）**：某条指令在哪个目录、任务、身份或环境中生效。相同文件名不代表全仓库自动拥有同一优先级。

有效指令应该提供：目标、范围、事实优先级、授权边界、停止规则和交付标准。重复口号或模糊角色设定会占用 Context，却不改善决策。

长期指令文件（如项目说明）是 Harness 的输入，不是 Agent 本体。它们可能过期、冲突或只在某个目录生效，因此 Context Assembly 必须记录来源与作用域。

### AGENTS.md / CLAUDE.md 不是 Agent

#### 本节新词

- **Discovery Rule（发现规则）**：Runtime 按什么目录、文件名或配置查找适用指令的规则。文件是否生效取决于发现规则和 Scope。
- **Precedence（优先级）**：多个指令来源冲突时，哪一层约束优先。它需要由产品/Runtime 明确，而不是让模型按语气猜。

这类文件是项目指令源，通常记录目录约定、测试方式、代码风格、禁止事项和交付标准。Runtime 发现并读取它们，再把当前任务适用的部分组装进 Context。

边界可以压成两行：

- AGENTS.md / CLAUDE.md = Instructions source；
- Agent = Model + Runtime + Context + State + Tools + Loop + Permission。

新增一份指令文件是在配置现有 Harness，不是凭空创建一个拥有独立身份、生命周期和责任的 Agent。文件名也不赋予内容更高权限；它是否生效取决于 Runtime 的发现规则、目录作用域和指令优先级。

### 指令层级：外部内容首先是 Data

#### 本节新词

- **Instruction Hierarchy（指令层级）**：不同来源的指令冲突时采用的控制优先关系。低优先级数据不能仅凭文字内容升级成高优先级指令。
- **Untrusted Data（不可信数据）**：网页、文件、RAG 片段、Tool Result 等需要被读取但不能自动获得控制权的内容。

不同产品的角色名称会变化，但稳定原则是：低优先级内容不能推翻高优先级约束，外部数据不能仅凭自然语言形式把自己升级成可信指令。

从高到低可以理解为：Platform / Runtime hard policy → System / Developer / project instructions → User task → Tool Result / Web / File / RAG content。

网页、仓库文件、检索片段和 Tool Result 可能包含“忽略之前规则”之类文字。它们首先是 Untrusted Data；外部数据试图借文字改变更高权约束，这类攻击通常称为 Prompt Injection（提示注入）。下一章会把它正式放进 Control Plane / Data Plane 与 Effect 治理；本章只关心 Harness 不要把数据自动升级成指令。

Harness 至少要记录 instruction source、scope 和 precedence，并把模型软遵循与软件硬边界分开：

- 模型负责理解并尽量遵循有效指令；
- Runtime 负责 Capability filtering、Permission、Approval 和副作用执行；
- Validator / Evidence 负责证明输出与现实结果；
- 冲突无法安全消解时停止并请求更高权来源裁决。

## Context：给当前动作最小充分工作集

### 本节新词

- **Context（上下文）**：这一轮模型调用实际可见的工作集。它可以来自 State、History、Memory、Knowledge、Tool Result 和当前指令。
- **Minimal Sufficient Context（最小充分上下文）**：完成当前判断所需的信息足够完整，但不无差别塞入整个仓库、所有聊天和全部 Tool Schema。

Harness 不应把整个仓库、全部聊天和所有 Tool Schema 同时塞给模型。它应组合：

```text
current goal + constraints
current task state
relevant source excerpts / references
available actions
recent observations
required evidence and output contract
```

过少会让模型猜；过多会稀释优先级、引入过期事实和增加成本。Context 的完整边界属于 State/Context/Memory 章，本章关注它怎样成为工作环境的一部分。

## Tool Surface：少而清晰

### 本节新词

- **Tool Surface（工具暴露面）**：当前任务真正暴露给模型的 Tool 集合及其 Schema/描述。Surface 越大，选择冲突、Context 成本和权限面通常越大。
- **Tool Discovery（工具发现）**：从平台可用能力中找出与当前 Task 有关的候选 Tool。
- **Permission Filtering（权限过滤）**：在模型看到或执行 Tool 前，先按身份、Scope 和 Policy 去掉当前不允许使用的能力。

Tool 设计影响 Agent 的可控性：

- 名称面向业务意图，而不是泄露底层数据库；
- schema 清楚表达必填、枚举和边界；
- 返回 Result、Evidence 与可分类错误；
- 高副作用动作与只读查询分开；
- 只暴露当前任务真正需要的能力；
- Tool discovery 与 Permission filtering 先于模型选择。

Tool 越多不等于 Agent 越强。相似工具、模糊描述和巨量 schema 会增加错误选择。

## Skill：可复用方法，不是另一个 Tool

### 本节新词

- **Skill（技能）**：可复用的程序性知识，组织“怎样完成一类工作”的阅读顺序、决策规则、脚本、模板和验证流程。
- **Procedural Knowledge（程序性知识）**：关于“怎样做”的方法知识，与 Tool 提供的动作原语不同。

落到工具链里，两者的分工可以这样看：

```text
Tool: read_file, search, run_test
Skill: 如何做一次可审计的文档迁移
```

Skill 不能绕过 Permission，也不拥有长期 Task State。把每条提示都包装成 Skill 会制造另一种能力爆炸。

## Workspace 与 Sandbox

### 本节新词

- **Workspace（工作空间）**：当前任务可操作的仓库、目录、浏览器、终端或其他环境范围。
- **Sandbox（沙箱）**：通过文件、进程、网络或权限隔离，限制任务能够影响的环境边界。Sandbox 的目标是缩小破坏面，不是简单禁用所有能力。
- **Identity（身份）**：当前执行者或服务以谁的身份访问文件、网络和外部系统；权限判断必须绑定身份而不是只看模型建议。

Agent 必须知道自己在哪个环境工作：当前目录、仓库、分支、可写范围、依赖、网络与认证边界。Sandbox 的价值不是简单“禁用一切”，而是：

- 将读、写、执行、网络和外部副作用分层；
- 把高风险操作收窄到精确目标；
- 为并行工作提供隔离；
- 保留可回滚或可重建边界；
- 防止环境内容被当成高权指令。

开放能力与安全边界可以同时存在，关键是 Scope、Identity、Policy 与 Evidence。

## Permission 与 Approval 怎样进入 Harness

Tool 章已经区分 Capability 与执行授权，下一章会正式定义 Permission、Policy 和 Approval。Harness 在这里负责的是更靠前的一步：**不要把当前身份无权使用的能力暴露成普通候选，也不要让高风险动作只靠 Prompt 约束。**

例如只读代码审计可以暴露 search/read/test，却不必同时给 push、release、production delete；确实需要高风险 Effect 时，再把精确目标、版本和参数交给 Runtime 的 Policy / Approval 链。

模型可以提出动作，Harness 可以缩小工作面，但最终授权不能由模型自己扩大。

## Validators 与反馈密度

### 本节新词

- **Validator（验证器）**：检查输出或现实结果是否满足结构、测试、业务或状态要求的机制。
- **Compiler / Type Checker（编译器／类型检查器）**：检查代码能否被正确编译、类型关系是否成立的确定性反馈。
- **Linter（静态规则检查器）**：检查格式、风格或静态规则的问题，不等于功能测试。
- **External Readback（外部回读）**：动作完成后重新从真实环境读取状态，确认“现实世界是否真的变化”。
- **LLM Judge（大模型评审器）**：用强模型辅助判断开放语义质量，适合模糊评价；能机械判定的问题不应优先交给它。
- **Feedback Density（反馈密度）**：Agent 每完成小步后能获得多少可定位、可行动的反馈。反馈越快越具体，错误越不容易沿长链累积。

模型最需要的不是更多赞美，而是快速、可定位的反馈：

- schema validator：结构是否可解析；
- compiler/type checker：代码是否成立；
- tests：行为是否满足样例；
- linter/style gate：机械规则；
- diff/scope check：是否越界；
- external readback：现实状态是否真的改变；
- domain evaluator：业务 Outcome 是否满足。

能机械判定的先机械判定；LLM judge 用于模糊质量，不替代确定性验证。

## Budgets 与 Stop Rules

### 本节新词

- **Budget（预算）**：限制 Agent 可使用的步数、时间、Token、Tool 调用、并发、Retry 或外部成本。
- **Stop Rule（停止规则）**：明确什么条件下成功结束、阻塞等待、升级风险或因预算耗尽而停止。

Harness 应明确限制：步数、时间、Token、Tool calls、并发、重试和外部成本。预算不是单纯节流，而是迫使 Agent 在有限资源中选择高信息动作。

停止条件包括成功、阻塞、需要用户输入、风险升级、预算耗尽和不可恢复失败。持续忙碌不是可靠性。

## 四种看似省事、实际会失控的做法

### 万能 Prompt

把 Context、Policy、方法、业务数据和长期状态全部塞进系统提示，会造成不可测试的单体配置。

### Tool 全量暴露

模型面对几十或几百个重叠 Tool，选择质量下降，权限面扩大，Context 成本增加。

### 只给 Agent 自我反思

没有测试、Diff、环境回读或外部 Evidence，自我批评仍在同一信息闭环内。

### Harness 替代 Runtime

上下文组织得再好，也不能解决进程崩溃后 Task 在哪、刚才副作用是否发生、如何安全 Resume。

## 从最小可用的 Harness 开始

不要先给这套组合起一个新的框架名字。第一版只需要让当前任务拥有足够的 Context、最小 Tool surface、受控 Workspace、机械 Validator 和可回读 Evidence：

```text
明确目标与 Scope
→ 最小 Tool surface
→ 正确 Context
→ 受控 Workspace
→ 机械 Validator
→ Evidence readback
```

只有真实失败显示不足时，再增加更复杂的 Skill loading、动态 Tool retrieval、多 Sandbox 或模型 Critic。Critic 可以提出问题，但不能替代测试、外部回读或独立 Evidence；Harness 复杂度同样要用 Eval 证明。

## Harness 在整套系统中的交接位置

- Agent Loop 决定下一步，Harness 设计它工作的环境；
- Runtime 保存长期 Task 与 State；
- Durable Execution 处理断线、UNKNOWN、Recovery 与 Evidence commit；
- Execution Environment 章把 Sandbox、Browser、Coding 和 Computer Use 放进真实反馈闭环；
- Platform 只在多个应用反复需要同一 Harness 责任时抽取共享能力。

## 读完后应该能回答

1. Harness 与 Runtime 的核心问题分别是什么？
2. Tool、Skill、Instruction 为什么不能混成一个概念？
3. 为什么 Tool 越多可能让 Agent 越差？
4. 哪些验证应由确定性程序完成？
5. 一个最小可靠 Harness 必须具备哪些元素？

## 学习导航

[← 上一章](02_为什么要分开状态上下文与记忆.md) · [新版目录](../README.md) · [下一章 →](04_长任务怎样安全恢复.md)
