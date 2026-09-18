# Multi-Agent 怎样协作，又为什么很容易失控

Multi-Agent（多智能体系统）最容易被误读成“一个 Agent 不够聪明，所以多找几个一起讨论”。真正进入工程以后，每增加一个独立 Agent，系统增加的不是一个 Prompt，而是一组新的 Identity、Context、Permission、State、Communication、Failure 和 Ownership 边界。

因此组织设计的第一问题不是“要几个 Agent”，而是：**有哪些责任必须独立存在，谁拥有最终 Truth，独立带来的收益能不能覆盖协调税。**

第 10 篇已经处理 Parent / Child Delegation 和 Handoff；这一篇只讨论当多个**真正独立责任主体**同时存在以后，系统应该怎样组织它们。

## 先看四个变量，再选拓扑

Multi-Agent Organization（多智能体组织拓扑）通常由四件事决定：

1. Responsibility Distribution：最终责任集中还是分散；
2. Knowledge Distribution：专业信息是否天然分散；
3. Coordination Intensity：参与者之间需要多频繁同步；
4. Truth Ownership：谁有权提交共享事实。

模型数量和进程数量不是第一判断因素。

## Controller–Worker：适合可预先拆分的并行

Controller 把已知工作拆成边界清楚的分片，Worker 各自处理，Controller 汇总。

~~~text
100 个文件独立扫描
→ 10 个 Worker 并行
→ Controller reduce results
~~~

风险是 Controller 成为 Context / throughput 瓶颈，而且拆分错误会系统性传播。

它也不一定等于多个 Independent Agent；完全可以只是同一 Runtime 下的一组临时 Subagent。只有 Worker 拥有独立长期责任边界时，才真正进入本篇的 Multi-Agent 语义。

## Supervisor：结构会变化，但总体责任仍集中

Supervisor（监督者）不仅分配固定分片，还会观察进展、选择 Specialist、调整优先级、决定停止。

适合问题结构会随中间结果改变，但总体责任仍要集中。

风险是：

- 所有信息都经过 Supervisor，形成摘要瓶颈；
- 中心既执行又评审，缺独立 Evidence；
- Supervisor 逐渐变成“万能 Agent”；
- 所有动作绕中心导致延迟和成本增加。

Supervisor 的价值是协调责任，不是把所有专业 Context 吸回自己。

## Hierarchy：单层中心承载不了责任时再分层

Hierarchical Organization（分层组织）把责任按领域或阶段压缩：

~~~text
Product Goal
→ Domain Lead
→ Specialist
→ Tool / Environment
~~~

每层都应该明确接收什么 Task、能提交什么 State、向上返回什么 Evidence、何时 Escalate。

层级过深会带来摘要失真和责任模糊。组织图越像公司，不代表系统越成熟。

## Peer-to-Peer：责任真正分布时才有价值

P2P（对等协作）允许 Agent 直接发现并请求其他责任主体，不必所有消息都经过中心。

这要求比“两个 Agent 能聊天”强得多：

- Stable Identity；
- Task Identity；
- Registry；
- bounded delegation；
- Permission；
- Event / Audit；
- 循环委派检测。

否则很容易出现双方都以为对方负责、重复工作，以及 Shadow Truth（影子真值：只存在私有对话却没有正式提交的共同理解）。

## Blackboard：共享工作对象，不共享全部脑内过程

Blackboard（黑板模式）让多个 Agent 围绕 Shared Workspace 贡献 Finding、Evidence、Decision，而不是互相转述完整聊天。

~~~text
Shared Task / Artifact
├─ committed facts
├─ evidence refs
├─ open questions
└─ decisions

Agent A Private Context
Agent B Private Context
Agent C Private Context
~~~

共享区保存受治理对象；局部假设和草稿继续保留在 Private Context。

这样可以减少 Multi-Agent 的 Context 污染。

## Event-driven：只在状态真正变化时唤醒相关主体

Event-driven Collaboration（事件驱动协作）适合异步、长生命周期系统。

例如：

~~~text
new evidence
artifact ready
approval granted
task blocked
deadline reached
~~~

Event 表示已经发生的变化，不是命令。消费者还需要处理重复投递、乱序和当前 Version。

Event-driven 可以显著减少 Agent 之间互相轮询。

## Multi-Agent 会新增一类“协调型失败”

单 Agent 主要担心错误判断和错误动作；Multi-Agent 还会增加：

~~~text
double ownership
→ 两个 Agent 都认为自己负责

orphan task
→ 谁都认为对方负责

delegation loop
→ A → B → C → A

deadlock
→ 互相等待对方先完成

duplicate work
→ 多个 Agent 重复做同一任务

merge conflict
→ 局部结果分别正确，合并后冲突

stale handoff
→ 新 Owner 已推进，旧 Owner 仍提交
~~~

这些问题不是换更强模型就会消失，必须由 Identity、Version、Lease、Event 和 Stop Rule 治理。

Handoff 的握手、Write Set 和 Child Acceptance 已由第 10 篇展开；这里关心的是这些失败怎样随着 Agent 数量和组织拓扑被放大。

## Delegation Loop 必须有结构化检测

如果 Agent A 把任务交给 B，B 又根据语义发现“最合适的是 A”，系统可能无限转发。

Delegation Path（委派路径：当前工作经过哪些责任主体）应该能够被 Runtime 读取。

可以设置：

~~~text
max delegation depth
visited agent / task identities
same-goal cycle detection
budget inheritance
~~~

发现环路时优先停止并回到上级 Owner，而不是让模型继续“沟通解决”。

## Registry 和 Discovery 只有在真的有多个可选择主体时才成立

Agent Registry（智能体注册表）可以记录：

- stable identity；
- responsibility / domain；
- accepted task contract；
- capabilities；
- permission boundary；
- endpoint / runtime；
- availability；
- version；
- latency / cost / reliability profile。

Discovery（发现）应该先用 Schema、Domain、Permission、Availability、Protocol Reachability 等硬条件过滤，再进入语义 Ranking。

如果系统只有固定三个角色，没有动态选择需求，先造 Registry 往往是过度设计。

## Registry 里的 Availability 会过期

Registry 记录 Agent 存在，不代表它此刻真的能接任务。

Availability（可用性）至少可能受：

- runtime health；
- current load；
- capability version；
- credential / permission；
- workspace；
- model availability；
- maintenance state

影响。

因此动态 Discovery 需要 Freshness。一个几小时前的 AVAILABLE=true 不能永久作为路由依据。

Persistent Agent 还可能需要 Heartbeat、Lease 或其他健康事实，但这些机制只有在真实动态选择需求出现以后才值得购买。

## Dynamic Agent Creation 应该是最后选项

找不到合适协作者时，优先顺序应该是：

~~~text
现有 Tool 能解决？
↓ no
现有 Skill 能解决？
↓ no
一次性 Subagent 能解决？
↓ no
是否真的需要独立 Identity / State / Permission / Lifecycle？
↓ yes
create independent agent
~~~

动态创建还需要 Budget、TTL（存活时间）、Owner、权限上限和 Reclamation（回收），否则会产生 Identity Garbage。

## A2A 解决跨独立 Runtime 的互操作

A2A / Agent2Agent Protocol（智能体到智能体协议）适合两个彼此独立的 Agent 系统协作：各自拥有自己的 Runtime、Identity、State 和内部 Tool，调用方不需要知道对方内部实现。

可以用这个边界区分 Tool / MCP 与 A2A：

~~~text
Operation contract
→ Tool / MCP 倾向

Goal + independent planning / state / lifecycle / responsibility
→ Independent Agent / A2A 倾向
~~~

A2A 真正有价值的地方，是通信双方只需要约定外部协议，不要求把自己的 Prompt、Tool、Memory 或内部 Workflow 全部暴露给对方。远端执行可以保持 Opaque（不透明）：调用方关心的是对方声明的能力、协作 Task、消息和最终 Artifact，而不是共享“脑内过程”。

## Agent Card、Message、Task、Artifact 各自承担不同协议责任

A2A 对象不能因为名字熟悉就直接映射成本地 Runtime 对象。

**Agent Card（智能体名片）**负责对外描述一个 Agent / Agent System 的身份、能力、端点和交互方式。它更像可发现的协议自描述，不是该系统完整的内部组织图，也不自动证明当前 Runtime 健康可用。

**Message（消息）**负责双方交换内容和协作输入。收到一条 Message 不等于本地 State 已经发生正式状态迁移。

**A2A Task（协议任务）**描述双方在协议层共同追踪的一段工作生命周期，但它不等于本地 Runtime Task。远端 Task 状态可以映射进本地 Task / Event，本地 Runtime 仍然拥有自己的 Owner、Version、Policy 和 Recovery。

**Artifact（协议产物）**是远端 Agent 返回的正式输出对象，例如报告、文件或结构化结果。但：

~~~text
remote Artifact
≠ local Evidence
≠ local Truth
~~~

本地系统仍然需要按自己的 Contract 验收 Artifact，必要时重新读取 Source 或执行 Validator，才能把结果晋升成 Current Truth。

因此 A2A 解决的是**独立系统怎样互操作**，不是把双方的 State、Permission 和 Evidence 语义强行合并成一套。

## 同一 Runtime 内不要为了“标准”强行绕 A2A

如果几个 Agent 已经共享同一 Task Store、State、Event、Scheduler 和 Permission，Native Coordination（原生协调）通常更直接。

~~~text
same runtime
→ native task / event / state

cross runtime / organization / vendor
→ A2A becomes useful
~~~

不要为了架构先进，让同一个进程里的两个 Worker 先出 HTTP 再回来。

## Adapter 和 A2A 不是同一层

不同 Coding Harness 可能有各自 Session、Thread、Turn、Hook、Approval API。平台需要 Adapter 把这些私有 Lifecycle 映射成本地合同。

~~~text
vendor harness lifecycle
→ Adapter
→ local Runtime contract

independent remote Agent
→ A2A
→ protocol adapter
→ local Runtime contract
~~~

Adapter 处理私有产品表面，A2A 处理独立责任主体的互操作。

## MCP 和 A2A 是互补边界，不是上下级协议

MCP 更接近 Capability Interoperability：Host 怎样连接外部 Tool、Resource 和能力服务。

A2A 更接近 Independent Responsibility Interoperability：一个拥有自己 Runtime 和责任边界的 Agent System 怎样和另一个独立系统协作。

~~~text
需要一个外部动作 / 数据能力
→ Tool / MCP

需要把 Goal 交给一个独立责任主体
→ A2A / remote Agent
~~~

一个远端 Agent 内部当然也可以自己使用 MCP；两者解决的不是同一个层次。

## 物理资源不会因为 Agent 更多就自动并行

多个 Agent 并不会自动让同一浏览器、同一 worktree、同一手机模型获得并行能力。

争用互斥资源时仍然需要 Queue、Lease、Version、Cancellation。

~~~text
5 Agents
→ 1 Browser Profile
→ still 1 mutable UI reality
~~~

如果同时操作，很可能互相改变页面状态。

资源调度应该围绕真实资源建立 Lease，而不是围绕 Agent 数量想象并行度。

## Multi-Agent 最大的问题是 Coordination Tax

每个新 Agent 都会增加：

~~~text
Identity
Discovery
Routing
Context assembly
Communication
Shared State
Handoff
Permission
Failure boundary
Observability
Eval
Integration
~~~

Incremental Value（增量价值）应该这样理解：

~~~text
quality / parallelism / isolation gain
-
coordination / state / permission / recovery / eval tax
~~~

只有长期为正，拆分才成立。

## Agent Explosion 和 Microservice Explosion 很像

Agent Explosion（Agent 膨胀）常见症状：

- 每个 Skill / Tool 都包装成 Agent；
- Agent 名字很多，Owner 不清；
- 多个主体重复理解同一 Task；
- 大量消息只用于同步对方刚做什么；
- 共享状态冲突靠聊天解决；
- Debug 必须跨很多 Trace 才找到真实 Effect；
- Token / latency 上升，但 Outcome 没改善。

这和微服务过度拆分类似，只是 Agent 还多一层概率性 Semantic Drift（语义漂移）。

## Persistent Agent 需要长期责任才能偿还成本

Ephemeral Agent（临时 Agent）随 Task 创建、结束后释放，治理面小。

Persistent Agent（持久 Agent）跨任务拥有长期 Identity、Permission、Memory、State 或外部责任关系，需要承担升级、权限审计、状态迁移、在线健康和接管。

长期身份必须对应长期责任；“经常用到”本身不足以证明它应该永久存在。

## 独立评审只有在错误来源真的独立时才有价值

Multi-Agent 常被用来做“一个生成、一个 Critic”。

但如果两个 Agent：

- 使用同一模型；
- 看到同一 Context；
- 使用同一错误资料；
- 采用同一 Prompt 偏差；

它们的错误很可能高度相关。

Independent Review（独立评审：让评审主体拥有不同证据入口、检查标准或独立验证器）真正提高可靠性的地方，是错误来源被解耦。

例如代码修改后，Compiler / Test 往往比第二个模型再说一句“看起来没问题”更独立。

## Failure Containment：独立主体必须有独立破坏边界

每个 Agent 最好都拥有：

- input / output contract；
- permission scope；
- side-effect scope；
- budget；
- cancellation；
- structured events；
- evidence；
- parent / takeover owner。

否则一个 Agent 的错误会通过共享 Context 和自动消息扩散到整个组织。

## Multi-Agent Eval 必须和更简单的基线比较

不能只记录“5 个 Agent 最后成功了”。

至少比较：

~~~text
task success
critical error
wall-clock
total model / tool cost
human intervention
handoff failures
duplicate work
merge conflicts
recovery success
~~~

还应该观察 Coordination Overhead（协调开销：为了组织多个 Agent 而额外产生的通信、等待、合并和状态管理成本）。

如果并行减少 20% 执行时间，却增加 2 倍 Token、更多人工 Review 和更高冲突率，它未必是更好的系统。

## 系统过度复杂时可以反向收缩

~~~text
无独立责任 Agent
→ Skill / Tool

一次性 Persistent Agent
→ Ephemeral Subagent

频繁 Handoff
→ Delegation / Collaboration

确定性协商
→ Workflow / structured state transition

共享同一 State Owner 的多个主体
→ merge
~~~

保留真正需要 Context、Permission、生命周期或独立验证的边界。

## ProFlow 是“角色很多不等于 Multi-Agent 越动态越好”的反例

ProFlow 有多个角色、Worker Binding、事件和浏览器执行，但这本身不能证明动态 Multi-Agent 必要。

只有真实任务反复显示固定角色无法覆盖责任变化、动态 Discovery 能带来可测并行或质量收益，并且 Shared State、Permission、Handoff 已经能治理时，才值得继续升级。

角色数量是现象，独立责任和增量价值才是证据。

## 组织模式最终按责任分布选择

Controller–Worker 适合固定分片；Supervisor 适合任务结构动态但中心责任仍在；Blackboard 适合围绕共享对象协作；Event-driven 适合异步稀疏协作；P2P 只在责任真正分布且 Registry、Identity、Permission 完备时使用；跨独立 Runtime 才考虑 A2A。

选择之前先回答四个问题：

~~~text
最终责任集中还是分散？
专业知识是否天然分布？
参与者需要多频繁同步？
谁有权提交 Shared Truth？
~~~

Multi-Agent 只有在相对于单 Agent / bounded Subagent 的增量价值能长期覆盖 Coordination Tax 时才成立；协调失败本身也必须进入 Eval。

下一篇把这些责任主体放进现实环境，比较 Research、Browser 和 Coding 世界分别怎样观察、行动和验证。
