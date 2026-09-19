# Agent 系统的责任边界：我们为什么选择 DDD、怎样落地，以及它带来了什么

复杂 Agent 系统真正难的地方，往往不是“模型够不够聪明”，而是系统越来越大以后，同一个词开始被不同模块解释成不同东西，同一份状态开始被多个组件同时声称拥有，外部 Provider 的字段又不断渗进业务语义。短任务里这些问题可以被一次对话掩盖，长期任务、恢复、多 Agent 协作和真实副作用一出现，它们就会变成架构问题。

ProFlow 后来选择 DDD，不是因为我们想把系统做成一套“标准 DDD 架构”，而是因为反复出现的故障都指向同一个问题：**同一类事实到底由谁拥有，哪些对象应该一起变化，哪些对象必须被分开，边界之间又应该通过什么稳定语言协作。**

DDD（Domain-Driven Design，领域驱动设计：围绕真实业务问题、统一语言、责任边界和业务规则组织复杂软件的方法）正好提供了一套成熟的思考工具。

这篇文章只回答四个问题：

~~~text
DDD 到底是什么？
→ 为什么我们会选择它？
→ 我们具体是怎么做 DDD 的？
→ DDD 最后给系统带来了什么？
~~~

它不会重复展开 Task、Recovery、RAG、权限等已经有正式 Owner 的主题；这些内容只作为 DDD 是否真的落地过的工程证据。

## DDD 到底是什么：不是微服务，也不是一套代码框架

很多人第一次接触 DDD，会把它理解成一组架构名词：Entity、Aggregate、Domain Event、Repository、Bounded Context。再往后，很容易继续把它和微服务、事件驱动、Event Sourcing 绑定在一起。

这些都可能和 DDD 一起出现，但都不是 DDD 的核心。

DDD 真正关心的是：**复杂业务里的语言、事实、规则和责任应该怎样被建模，才能让软件长期保持同一种含义。**

它大致有两层。

第一层是战略设计，解决“系统应该怎样划边界”。

- Ubiquitous Language（统一语言：业务和工程在同一责任范围内使用同一套稳定词义）解决“同一个词到底是什么意思”；
- Bounded Context（限界上下文：一套业务模型、规则和语言保持内部一致的边界）解决“这套含义在哪个范围内成立”；
- Context Map（上下文映射：描述不同边界之间依赖和协作关系的视图）解决“边界之间怎样连接，而不是互相读取内部状态”；
- Anti-corruption Layer（防腐层：把外部系统的语言翻译成内部稳定语义的隔离层）解决“外部 Provider 怎么变化，都不要把内部模型带偏”。

第二层是战术建模，解决“边界内部怎样表达身份、状态和不变量”。

- Entity（实体：即使属性变化，也要持续追踪同一个身份的对象）；
- Value Object（值对象：由当前取值定义、不需要长期身份的对象）；
- Aggregate（聚合：必须作为一个一致性单元维护的一组业务状态）；
- Aggregate Root（聚合根：外部修改聚合时必须经过的入口）；
- Domain Event（领域事件：已经由业务 Owner 确认发生的领域事实）。

Port / Adapter（端口 / 适配器）并不是 DDD 独有的概念，它更接近六边形架构等方法；但在我们的实践里，它和防腐层配合得很好：上层只依赖稳定业务能力，外部 Browser、模型、Git、SaaS 的私有协议留在 Adapter 一侧。

所以如果只压缩成一句话：

> **DDD 不是教你多建几个类，而是逼你先回答：业务语言是什么、谁拥有事实、哪些规则必须一起成立、外部变化应该停在哪个边界。**

## 为什么我们选择 DDD：系统真正失控的是语义和 Authority，不是代码量

ProFlow 早期并不是先学完 DDD，再照着设计。

相反，是系统不断撞到真实问题以后，才发现这些问题本质上都属于领域边界问题。

### 同一个对象被不同运行载体冒充

长期 Agent 运行以后，Task、Role、Worker、Conversation、Browser Tab、Node、Execution 会同时存在。

如果这些概念没有稳定语言，很容易出现这样的偷换：

~~~text
Conversation 断了
→ 被理解成 Task 断了

Browser Tab 刷新了
→ 被理解成 Worker 消失了

Node 重开
→ 被理解成重新创建一个长期 Worker

一次 Execution 成功
→ 被理解成整个 Task 已完成
~~~

这些错误不是代码语法问题，而是模型边界错了。

今天 ProFlow 会明确区分长期 Task、任务内 Worker 身份、Conversation 载体和 runNo（执行轮次编号），就是因为这些对象生命周期不同，不能共享同一个身份。

### 同一类事实开始出现多个 Authority

另一个更危险的问题，是多个组件都觉得自己有资格决定同一件事。

历史上 Product GPT 一度负责确定性 bootstrap，同时 Application / Task Owner 本身也已经掌握固定 Role 和 readiness 规则；Browser Host 也曾经承担过过多 Task 驱动责任；中央 Deployment Planner 复制各 Module 自己已经拥有的部署真值。

这会形成一种很隐蔽的双真值：

~~~text
组件 A 认为当前事实是 X
组件 B 认为当前事实是 Y
两边都能写
→ 系统只能靠同步和补丁维持表面一致
~~~

DDD 给我们的第一个直接帮助，就是把问题改写成：

> **这类事实到底属于哪个领域，最终谁有权写？**

其它组件可以读取 Contract、提交 Command、产生 Result，但不能顺手复制一份自己的“当前真值”。

### 外部实现不断污染业务语言

Browser 有 Tab、Target、Selector；模型 Provider 有 Model ID、finish reason、token 字段；Git、飞书和其它 SaaS 也都有自己的对象。

如果这些技术字段直接进入业务核心，很快就会出现：

~~~text
chrome target id
→ 被拿来判断 Worker Identity

provider model name
→ 被拿来定义 Role

HTTP / SDK 返回值
→ 被拿来决定 Task 是否完成
~~~

这意味着业务模型已经被 Infrastructure（基础设施实现）反向控制。

DDD 的防腐思想正好要求：外部系统可以很具体，内部语言必须保持稳定。

### AI 特别容易把局部修复变成语义漂移

这个问题在 AI 深度参与开发以后更明显。

模型很擅长看 failing test、找到最近的源码、快速修一个局部问题。只要没有稳定的领域语言和 Owner，它就很容易把“让测试通过”变成“重新解释系统应该是什么”。

于是局部 patch 越多，系统越可能发生：

~~~text
字段还在
但含义变了

状态机还能跑
但谁拥有状态变了

测试全绿
但边界已经换了
~~~

所以我们选择 DDD，真正原因不是“项目够大了应该上 DDD”，而是：

> **我们需要一套能在跨 Chat、跨模块、跨 Runtime 的长期工程里保护语义和 Authority 的方法。**

## 我们具体怎么做 DDD：第一步不是画领域图，而是把语言说清楚

我们没有从“应该有几个 Bounded Context”开始。

第一步反而是最朴素的：把系统里最容易互相替代的词拆开。

例如：

| 词 | 在当前工程里的稳定含义 |
|---|---|
| Task | 跨执行轮次长期存在的工作对象 |
| Role | 稳定职责，不等于某个模型或会话 |
| Worker | 某个 Task 中承担 Role 的长期执行身份 |
| Conversation | Worker 当前使用的交互载体 |
| Node | Task 内一个受控责任节点 |
| runNo | 同一 Node 的某次执行轮次，不产生新的长期身份 |
| Result | 一次执行产生的输出 |
| Evidence | 支撑某个事实或完成声明的可复核证据 |

这一步对应 DDD 的 Ubiquitous Language。

它真正解决的问题不是“术语统一看起来专业”，而是让 Spec、Contract、代码、测试、Chat 和运行日志里，同一个词尽量保持同一种含义。

如果某个词在不同地方长期承担两种含义，我们不会靠解释文档硬维持，而会继续追问：是不是边界本身划错了？

## 第二步：先找 Fact Owner，再决定 Bounded Context

Bounded Context 最容易被误解成“一个模块”“一个仓库”或者“一个微服务”。

我们实际判断边界时，更关心下面几个问题：

~~~text
这组对象使用的是不是同一套语言？
谁有权修改这些事实？
它们的生命周期是否一致？
哪些业务规则必须同时成立？
失败和恢复是否应该一起发生？
外部实现替换时，这组事实是否应该保持不变？
~~~

这些问题如果长期得到不同答案，就说明它们很可能不属于同一个模型边界。

例如 Task 和一次 Execution 高度相关，但它们并不是同一个东西：

~~~text
Task
→ 长期目标、Version、Scope、Acceptance、正式状态

Execution
→ 针对某个 Task Version 的一次实际尝试
~~~

Execution 可以失败、重试、换 Runtime；Task Identity 仍然可以保持不变。

同样，Browser Tab 可以定位当前 Conversation，但 Tab 生命周期不应该决定 Worker 生命周期。

因此我们不是先说“这里必须有一个 Task Context、一个 Execution Context”，再强迫代码服从；而是先用真实生命周期、写入权和不变量证明它们确实需要不同责任边界。

DDD 在这里给我们的不是固定模块图，而是一套**判断边界是否真实存在的方法**。

## 第三步：用 Entity、Value Object 和 Aggregate 思考身份与一致性

长期 Agent 系统对身份特别敏感。

有些东西必须持续追踪“是不是原来的那个对象”。

Task 就属于这种对象。它的状态、执行轮次、当前节点都可以变化，但我们仍然需要知道它是不是原来的同一个 Task。

这就是 Entity 的思路：身份比当前属性更重要。

Worker 也类似。在 ProFlow 中，Chrome refresh、Extension reload 或 Node reopen 都不应该凭空产生第二个 Task-bound Worker。

另一些对象更接近 Value Object。例如某一版冻结后的 Scope、Acceptance 条件或一组配置值，关注的是“这组值是什么”，而不是“它是不是昨天那个对象实例”。

Aggregate 则帮助我们回答另一个问题：

> **哪些状态如果允许被不同路径随意修改，就会破坏同一组业务不变量？**

例如对一个长期 Task 来说，Goal、Version、Scope、Acceptance 与正式 State 之间存在约束。外部执行器可以提交 Result，但不能因为自己运行成功就直接把这些长期事实改成另一个世界。

我们并没有因为使用 Aggregate 思想，就建设一个通用 Aggregate Store。这里的价值首先是**确定一致性边界和修改入口**。

## 第四步：边界之间只通过公开 Contract 交流

一个边界划出来以后，如果其它模块仍然可以随意读取它的内部表、内部对象和临时字段，这个边界实际上并不存在。

所以 DDD 在我们的工程里总是和 Contract（契约：边界对外稳定暴露的输入、输出、状态与错误语义）一起出现。

关系更接近：

~~~text
Domain Owner
→ 拥有内部模型和正式事实
→ 发布稳定 Contract
→ 其它领域依赖 Contract
→ 不复制内部 Truth
~~~

例如 Execution 需要知道当前允许执行什么，它应该依赖正式的 Task Contract / 当前 Version，而不是自己维护一份 Task 真值。

Context Map 在这里也不是为了画一张“系统全景图”，而是帮助回答：

~~~text
谁是上游 Owner？
谁是下游 Consumer？
通过什么 Contract 协作？
谁能写？
谁只能读？
哪里需要 Adapter / 防腐层？
~~~

只有真实存在的依赖才值得进入 Context Map，不为了架构完整建立全局对象关系图。

## 第五步：用防腐层阻止 Provider 反向定义领域

Agent 工程天然会连接很多外部系统，因此这是 DDD 在我们这里最实用的一层。

外部世界可以拥有自己的语言：

~~~text
Browser
→ tab / target / selector

Model Provider
→ model id / finish reason / private error

SaaS
→ page / revision / run / block
~~~

内部领域只接受自己稳定的语言：

~~~text
Task
Execution
Capability
Evidence
Identity
State
~~~

中间通过 Adapter 和防腐层翻译。

所以：

~~~text
Browser Tab
→ 可以成为 Locator
→ 不能直接成为 Worker Identity

Provider response
→ 可以被 Adapter 翻译成 Execution Result
→ 不能直接宣布 Task Completed
~~~

这种隔离带来的最大价值，不只是“以后换 Provider 比较方便”。

更重要的是：**外部产品的生命周期、错误码和字段变化，不再自动拥有修改业务规则的权力。**

## 第六步：DDD 不只用来拆边界，也用来删除错误边界

这是我们实践里很重要的一点。

很多 DDD 文章只讨论“怎么拆 Context”，但 ProFlow 真实演进给我们的另一个经验是：

> **一个组件如果已经没有独立事实和独立业务规则，它就不应该因为历史存在继续保留。**

几个历史变化很典型：

- Browser Host 曾经承担过更重的 Universal Task Driver，后来这些 Task Authority 被收回正确 Owner；
- Product GPT 曾经持有确定性 bootstrap，后来固定 Role / Binding / readiness 迁回 Application / Task Owner；
- `chatgpt-carrier` 在失去独立长期事实以后被直接退休；
- 中央 Deployment Planner 因为复制 Module Truth 被削薄。

这些动作表面上是在“删组件”，本质上都在回答同一个 DDD 问题：

~~~text
它现在还拥有哪类独立领域事实？
如果没有
→ 为什么还应该成为一个长期边界？
~~~

所以我们使用 DDD 的结果不是系统越来越碎，而是：

**有真实 Ownership 的边界被加强，没有独立 Ownership 的边界被删除。**

## 第七步：DDD 决定边界，SDD 冻结承诺，TDD 把不变量变成可执行证明

DDD 在我们的工程里不是单独工作的。

ProFlow 后来形成了一条比较清楚的分工：

~~~text
DDD
→ 谁拥有事实？
→ 边界在哪里？
→ 哪些业务不变量必须成立？

SDD
→ 把这些边界、Contract、State、失败语义冻结成正式系统承诺

TDD / Test Plan / Acceptance
→ 把冻结后的不变量变成机器和真实场景可以失败的证明
~~~

例如“Node reopen 不得创建第二个长期 Worker”首先是领域语义。

DDD 负责说明为什么 Worker Identity 属于长期责任，而不是一次执行；SDD 把这个语义写成正式设计和 Contract；测试再证明旧实现如果创建第二个 Worker 就必须失败。

这也是为什么 DDD 对 AI 工程特别重要：模型可以不断换，Chat 可以失忆，实现可以重写，但只要领域语言、Owner 和不变量仍然稳定，下一轮开发就有可以重新进入的语义基线。

## DDD 给我们带来了什么：最重要的是语义稳定，而不是多了多少架构模式

如果只看代码结构，很容易低估 DDD 真正带来的变化。

### 第一，系统开始知道“谁说了算”

过去很多故障最后都会追到双 Authority：两个地方都保存状态，两个组件都觉得自己可以推进。

DDD 把设计讨论不断拉回 Fact Owner：

~~~text
Task Truth
→ Task Owner

Execution Result
→ Execution Owner

Browser Reality
→ Browser / Adapter observation

外部资源事实
→ 对应外部 Authority readback
~~~

这让系统不再主要依靠“多处同步正确”维持一致性。

### 第二，长期身份和一次执行真正分开

Task、Worker、Conversation、Node、runNo 被明确分层以后，恢复不再等于重建。

Runtime 可以重启，Browser 可以刷新，Conversation 可以更换，执行可以进入下一 runNo，但长期业务身份仍然可以持续。

这直接降低了长期 Agent 最难处理的一类风险：**运行载体变化导致业务世界被复制。**

### 第三，失败更容易被限制在正确边界

如果 Provider 报错，只应该先影响对应 Execution；如果 Browser locator 失效，只应该影响定位和恢复；如果一次 Tool Call timeout，也不能自动改写长期 Task Truth。

边界越清楚，故障越不容易从 Infrastructure 一路污染到 Domain。

### 第四，Provider 和产品实现更容易替换

当业务层依赖的是稳定 Contract，而不是某个 Provider 的私有对象，替换模型、Browser 接入方式或外部 SaaS 时，需要变化的主要是 Adapter，而不是整套产品语义。

这种可替换性不是“为了未来做抽象”，而是边界正确以后自然产生的结果。

### 第五，Spec 和 Test 终于有了稳定对象

没有领域不变量时，测试只能验证“当前代码是不是按当前写法工作”。

DDD 把更稳定的问题提前说清楚：

~~~text
哪些身份不能变？
哪些状态只能由 Owner 修改？
哪些条件必须一起满足？
哪些外部变化不能改变业务语义？
~~~

这些规则进入 SDD 和 Test Plan 后，测试开始保护系统语义，而不是保护某一次实现形状。

### 第六，它给了我们删除复杂度的依据

旧架构里很多组件“设计上说得通”，但真实消费者和独立 Ownership 不足。

DDD 让我们能够问：

> 这个层如果没有独立语言、状态、不变量和 Fact Owner，为什么还值得存在？

这比单纯问“代码有没有被调用”更有价值。

旧 `ai-agent-platform` 最终被拆掉，大量 Registry、全局 Asset ID、统一 Publisher 和过早平台化设计没有继续保留，也和这种判断一致：**可以抽象，不代表现在应该抽象。**

## DDD 也有成本：边界一旦正式，就会产生 Change Amplification

DDD 不是免费的。

当一个领域语义已经进入 Contract、Spec、Test、Runtime 和多个 Consumer，再修改它时，影响自然会被放大：

~~~text
领域判断改变
→ Contract
→ State / failure semantics
→ SDD
→ Test Plan
→ implementation
→ package / consumer
→ runtime evidence
~~~

这种 Change Amplification（变更放大：一个稳定语义变化会沿正式依赖链传播）确实增加了修改成本。

但对于长期 Agent 工程，这种成本很多时候是保护，而不是浪费。

如果一个原本跨越多个模块的语义变化只改一个文件就“完成”了，反而要警惕是不是其它 Owner、Consumer 和 Evidence 根本没有被同步。

DDD 真正不适合的是另一种场景：问题很简单、状态短暂、规则稳定、一个模块就能清楚拥有全部事实。这时候硬拆 Context、Aggregate 和大量 Contract，只会制造治理税。

所以我们现在不会因为“用了 DDD”就：

- 把每个 Bounded Context 做成微服务；
- 把每个 Agent Role 当成一个 Context；
- 建通用 Aggregate Store 或 Domain Event Store；
- 为所有对象建立全局 Registry；
- 为了“将来可能复用”提前平台化。

DDD 对我们来说首先是一套**建模和裁决方法**，不是基础设施采购清单。

## 最后怎么判断自己是不是真的在做 DDD

如果把这套实践压缩到最小，不需要先问“我们有没有 Repository、Domain Service、Event Bus”。

更有用的是问四个问题：

~~~text
同一个业务词，在这个边界里是不是只有一个稳定含义？

这类正式事实，到底只有谁有权写？

哪些状态和规则必须作为一个一致性单元维护？

外部 Provider、Runtime 或 UI 改变时，哪些业务语义必须保持不变？
~~~

能持续回答这四个问题，并让 Contract、Spec、Test 和代码都服从同一个答案，DDD 才真正进入工程。

这也是我们最终从 ProFlow 得到的认识：

**选择 DDD，不是为了把系统设计得更“企业级”，而是为了让一个会长期运行、会失败恢复、会更换执行载体、又会被多个 AI 持续修改的系统，始终知道自己在谈什么、谁拥有事实、什么绝不能被一次局部实现偷偷改掉。**
