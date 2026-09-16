# 多个 Agent 怎样组织协作

> 唯一职责：解释 Supervisor、P2P、Blackboard、Event-driven、Registry 与 Discovery 怎样组织多个独立责任主体，并补充拓扑对 Agent Routing 提供哪些事实。本章假设读者已经掌握 Subagent、Delegation/Handoff、Shared State 和 Private Context。

## 组织拓扑先回答谁负责、谁能决定、谁写真值

### 本节新词

- **Organization Topology（组织拓扑）**：多个 Agent 的责任、通信和共享真值关系怎样连接。它描述“谁和谁协作、谁拥有决定权”，不是画多少个圆圈。
- **Ownership（所有权／责任归属）**：某个 Goal、Task、State 或 Artifact 到底由谁负责推进和提交。
- **Truth Ownership（真值所有权）**：哪个主体有权把候选结果正式提交为共享事实。没有这个边界，多 Agent 很容易互相覆盖。

Multi-Agent 拓扑不是画“很多智能体圆圈”，而是回答三组组织问题：

1. 谁发现当前缺什么责任或能力；
2. 怎样找到合适的 Agent；
3. 谁协调工作、提交共同真值并承担最终责任。

没有一种拓扑永远最好。Controller、Supervisor、Hierarchy、Peer-to-Peer、Blackboard 和 Event-driven 分别优化不同问题，成熟系统经常混合使用。

## 1. 拓扑选择的四个变量

### 本节新词

- **Responsibility Distribution（责任分布）**：最终责任是集中在一个主体，还是分散给多个独立主体。
- **Knowledge Distribution（知识分布）**：完成任务所需专业信息是集中在单一 Context，还是分散在多个领域主体。
- **Coordination Intensity（协调强度）**：参与者之间需要多频繁交换状态、等待依赖和解决冲突。

先看四个变量，再选组织形态：

| 变量 | 要问什么 |
|---|---|
| Responsibility | 最终责任集中还是分布 |
| Knowledge | 专业信息集中还是分散 |
| Coordination | 任务依赖强不强、是否需要频繁同步 |
| Truth | 谁能把结果提交为共享事实 |

模型数量、供应商和进程数量不是拓扑的第一决定因素。

## 2. Controller–Worker

### 本节新词

- **Controller（控制者）**：把已知工作拆成边界明确的子任务，并负责整合 Worker 结果的中心责任。
- **Worker（工作者）**：执行 Controller 分配的局部任务，通常不需要彼此协调。
- **Map/Reduce（映射／归约）**：先把多个独立分片并行处理，再由中心汇总结果的计算模式。Controller–Worker 常适合这种结构。

Controller 把已知工作拆成边界清楚的子任务，Worker 执行，Controller 汇总并负责最终交付。

适合：

- Map/reduce 式并行；
- 多文件或多数据分片；
- Parent 能明确拆分与验收；
- Worker 不需要彼此协调。

风险：

- Controller 成为 Context 和吞吐瓶颈；
- 拆分错误会系统性传播；
- Worker 只返回结论，证据丢失；
- 把每个函数调用都包装成 Worker。

Controller–Worker 不自动等于多个独立 Agent；它也可以只是同一 Runtime 内的 Subagent 调度。

## 3. Supervisor

### 本节新词

- **Supervisor（监督者）**：不仅分配固定分片，还会观察中间进展、选择 Specialist、调整优先级并决定何时停止的中心协调主体。
- **Specialist（专业 Agent）**：围绕某个领域或方法承担稳定专业责任的 Agent。Supervisor 应路由责任，不应复制 Specialist 全部 Context。
- **Single Point of Bottleneck（单点瓶颈）**：所有信息和决策都必须经过一个 Supervisor 时，吞吐、Context 和故障会集中在该节点。

Supervisor 不必预先写死所有分片，而是观察进度、选择专家、调整优先级并决定何时停止。

适合：

- 问题结构会随中间结果变化；
- 专业 Agent 数量较多；
- 需要统一 Goal、预算和最终验收；
- 责任仍需集中。

风险：

- Supervisor 只听摘要，形成信息瓶颈；
- 所有动作都绕中心，延迟与成本上升；
- Supervisor 既执行又评审，缺乏独立证据；
- “总管 Agent”变成不可测试的万能角色。

Supervisor 应协调责任，不应复制每个专家的完整 Context。

## 4. Hierarchical Organization

### 本节新词

- **Hierarchical Organization（分层组织）**：按领域或阶段把责任组织成多层，例如 Product Goal → Domain Lead → Specialist。
- **Domain Lead（领域负责人）**：某一层负责压缩下层信息、协调专业责任并向上提交 Evidence / Blocker 的主体。
- **Escalation（升级上报）**：下层遇到超出权限、能力或 Scope 的阻塞时，把问题和证据交给更高责任层处理。

当 Agent 数量、领域和 Context 超过单层 Supervisor 的承载能力，可以按领域或阶段建立层级。

例如：

Product goal → Domain lead → Specialist → Tool/Environment。

层级的价值是压缩责任和信息流，不是制造头衔。每层都应明确：

- 接收什么 Task；
- 能提交什么 State；
- 向上返回哪些 Evidence；
- 何时升级阻塞；
- 谁拥有最终 Outcome。

层级过深会造成摘要失真、责任模糊和协调延迟。

## 5. Peer-to-Peer

### 本节新词

- **P2P / Peer-to-Peer（对等协作）**：Agent 可以直接寻找和请求其他责任主体，不要求所有请求经过中心 Supervisor。
- **Bounded Delegation（受限委派）**：对等协作仍必须限制可委派的 Scope、预算和权限，防止循环委派与责任扩散。
- **Shadow Truth（影子真值）**：只存在于私有对话、没有正式提交进 Shared State 的“共同理解”，容易导致双方以为状态已经一致。

Peer-to-Peer 允许 Agent 根据当前 Need 直接寻找协作者，不要求所有请求经过中心。

适合：

- 责任天然分布；
- 领域关系动态；
- 中心节点无法掌握全部专业知识；
- 每个 Agent 有稳定身份和合同。

风险：

- 循环委派；
- 重复工作；
- 双方都以为对方负责；
- 私有对话产生未提交的“影子真值”；
- 权限和成本失控。

P2P 必须依赖可查询 Registry、明确 Task identity、bounded delegation 和可审计 Event。

## 6. Blackboard / Shared Workspace

### 本节新词

- **Blackboard（黑板模式）**：多个 Agent 围绕一个共享工作对象读取已提交状态并增加 Finding / Evidence / Decision，而不是彼此转述完整聊天。
- **Shared Workspace（共享工作区）**：保存可审计共享对象和稳定引用的协作空间。它不等于所有人的 Private Context 全部公开。

Blackboard 让 Agent 围绕共享工作对象协作，而不是互相转述整段聊天。

适合：

- 多专业角色围绕同一 Case/Task/Artifact 工作；
- 各自贡献 Evidence、Hypothesis 或 Decision；
- 新状态可以唤醒相关 Agent；
- 需要保留来源和版本。

Blackboard 不等于“所有 Context 全部共享”。共享区应存可审计对象和引用；局部推理、临时草稿与敏感内容仍留在 Private Context。

Shared State 的语义和写入纪律由上一章负责，本章只关心它怎样支撑拓扑。

## 7. Event-driven Organization

### 本节新词

- **Event-driven Collaboration（事件驱动协作）**：只有当共享状态发生有意义变化时才唤醒相关 Agent，适合异步、长生命周期和稀疏协作。
- **Idempotent Consumer（幂等消费者）**：同一 Event 被重复投递时不会产生重复业务副作用的消费方。
- **Event Ordering（事件顺序）**：多个 Event 到达顺序可能影响 State；系统必须处理乱序和重复，而不能假设网络天然有序。

Event-driven 组织在状态变化时唤醒 Agent：

- new evidence；
- task blocked；
- approval granted；
- artifact ready；
- policy violation；
- deadline reached。

它适合异步、长生命周期和稀疏协作，避免 Agent 互相轮询。

关键边界：

- Event 表示已经发生的事实，不是自然语言愿望；
- 消费者应支持幂等；
- 事件顺序和重复投递要有处理策略；
- Event 不能替代当前 State；
- 唤醒 Agent 不等于授权它执行高风险动作。

## 8. 混合拓扑

### 本节新词

- **Control Plane（控制平面）**：统一维护 Goal、Policy、Budget、Task identity 等高权组织规则的层。去中心化协作不代表必须删除 Control Plane。
- **Event Bus（事件总线）**：负责在生产者和消费者之间分发结构化 Event 的基础设施，使异步主体不需要互相轮询。

真实系统常组合：

- 中央 Control Plane 维护 Goal、Policy、Budget；
- Supervisor 做任务分解与路由；
- Specialists 通过 P2P 获取专业协助；
- Blackboard 保存共享 Artifact/Evidence；
- Event Bus 处理异步唤醒；
- Human Approval 控制关键责任转移和外部副作用。

选择混合架构时，每增加一种通信路径都要说明它解决什么失败，否则可观测性和调试成本会迅速上升。

## 9. Agent Registry

### 本节新词

- **Agent Registry（Agent 注册表）**：记录系统中有哪些可用 Agent、责任域、能力、输入输出合同、权限边界、Runtime endpoint、版本和运行画像。
- **Stable Identity（稳定身份）**：跨请求和发现过程仍能唯一定位同一个 Agent 的身份。
- **Reliability Profile（可靠性画像）**：按历史 Eval 记录某个 Agent 的成功率、延迟、成本和失败切片，用于 Routing。

Registry 回答“系统里有哪些可用 Agent”，至少可以记录：

- stable identity；
- responsibility / domain；
- capabilities；
- accepted task schema；
- output / evidence contract；
- permission boundary；
- runtime / endpoint；
- lifecycle and availability；
- cost / latency / reliability profile；
- version。

Registry 是逻辑责任，不要求第一版拆成独立微服务。静态配置、数据库或 Runtime metadata 都可以实现。

## 10. Discovery

### 本节新词

- **Discovery（发现）**：根据当前 Need 从 Registry 中筛出可能适合承担责任的候选 Agent；发现不是最终 Routing。
- **Hard Filter（硬过滤）**：先按 Task Schema、Domain、Permission、Availability、协议可达性等确定条件排除不可能候选。
- **Candidate Agent（候选 Agent）**：通过基本约束、值得进入排序比较的责任主体。

Discovery 从当前 Need 中产生候选集合。它不是直接做最终选择。

典型流程：

Need → hard filters → candidate agents → rank → route。

Hard filters 应先处理：

- Task schema 是否兼容；
- Domain / capability 是否匹配；
- Permission 和数据边界是否允许；
- Agent 是否可用；
- Runtime/协议是否可达。

语义相似度只能帮助找候选，不能覆盖权限、身份和合同。

## 11. Routing：拓扑只补充 Agent-specific 信号

Routing 章已经正式定义 Agent Routing。本章只补组织层特有的判断：候选 Agent 不只是“能力像不像”，还要看责任连续性、数据所在位置、当前负载、权限边界和历史可靠性。

例如当前 Owner 已经掌握必要 State 和 Context，而且仍有能力完成下一步时，频繁换 Agent 往往只会增加 Handoff；如果敏感数据只能留在某个 Runtime/区域，数据位置又会直接缩小候选集合。

因此拓扑层提供给 Routing 的是这些 Agent-specific facts：

```text
capability / domain fit
+ identity / permission
+ current owner continuity
+ load / availability
+ data locality
+ historical reliability
→ candidate ranking signals
```

最终“由谁承担责任”的决策仍由 [Routing / Policy](../04_Harness与Runtime/05_任务怎样选择模型和路径.md) 负责。Model Routing、Tool Routing 和 Agent Routing 也不在本章重新比较。

## 12. Dynamic Creation 是最后选项

### 本节新词

- **Dynamic Agent Creation（动态创建 Agent）**：运行时发现没有合适主体后临时生成新的独立责任主体。它是高成本选项，不应替代 Tool、Skill 或一次性 Subagent。
- **TTL（Time to Live，存活时间）**：动态 Agent 在没有继续价值时多长时间后应销毁或休眠的生命周期上限。
- **Reclamation（回收）**：任务结束后释放 Agent 占用的身份、Runtime、权限和资源，防止永久堆积。

Discovery 没找到候选时，不要立即创建新 Agent。依次判断：

1. 当前 Agent 加一个 Tool 是否足够；
2. 加载现有 Skill 是否足够；
3. 创建一次性 Subagent 是否足够；
4. 是否真的需要独立身份、权限、State 和生命周期；
5. 新 Agent 完成后是销毁、休眠还是进入 Registry。

动态创建必须有 Budget、TTL（Time to Live，存活时间）、Parent/Owner、权限上限和回收规则。

## 13. 并发与 Truth

### 本节新词

- **Immutable Version（不可变版本）**：Artifact 一旦生成，旧版本内容不再原地修改，而是创建新版本；Evidence 可以精确绑定版本。
- **Reconciliation（对账）**：并发写入或状态冲突后重新读取权威 State，决定保留、合并还是拒绝哪一个结果。
- **Committed Fact（已提交事实）**：经过 Owner、Version 和验证门禁正式进入 Shared State 的事实，与 Hypothesis 分开保存。

拓扑允许并发，不代表允许多个 Agent 无条件写同一 State。常见控制：

- 单一 Owner 写关键字段；
- optimistic version / compare-and-set；
- append-only Event；
- Artifact 使用 immutable version；
- 冲突进入显式 reconciliation；
- Hypothesis 与 committed Fact 分开。

并发收益只有在隔离成本、合并成本和冲突率可控时才成立。

## 14. 拓扑设计最容易失败的地方

### 把群聊当协作协议

自然语言能协商，但不能可靠表达 Ownership、Version、Status 和 Effect。

### Semantic routing 覆盖硬约束

“最像”不代表有权限、有空或能承担输出合同。

### 所有 Agent 都写 Shared State

共享很快变成不可追溯的最后写入获胜。

### 为每个 Capability 创建 Agent

Tool/Skill 能解决的问题被升级成独立生命周期，形成 Agent Explosion。

### 为了去中心化删除 Control Plane

没有统一 Task identity、Policy、Budget 和 Audit 时，系统很难知道谁在负责。

## 15. 把拓扑原则落成工程选择

### 本节新词

- **Coordination Calls（协调调用）**：Agent 为了分工、同步、确认、冲突处理而额外产生的通信次数。它不直接创造业务结果，却会增加延迟和成本。
- **Conflict Rate（冲突率）**：并行主体对同一 State / Artifact 产生不兼容结果的比例，用来判断并发收益是否真的大于协调成本。

选择顺序：

1. 单 Agent + Tool/Skill；
2. Parent + bounded Subagent；
3. Controller–Worker；
4. Supervisor + Specialists；
5. Blackboard / Event-driven；
6. 有真实独立责任时再引入 P2P 或跨 Runtime Agent。

对每次升级测量：任务质量、并行节省、协调调用数、合并成本、冲突率、人工介入和端到端延迟。

## 组织能力地图：长期 Eval 还应该告诉系统“怎样组合更好”

这是老版保留下来的一个高价值视角。这里把 **Organizational Capability Map（组织能力地图）**当作课程分析模型，而不是行业标准对象：长期 Eval 不只记录“Agent A 会什么”，还可以积累“什么任务用什么责任组合最有效”。

```text
普通 Bug
→ Developer

Browser Bug
→ Developer + Browser capability

高风险发布
→ Developer + Test + Deployment gate

跨模块大重构
→ Developer + Research Subagent + Independent Test
```

于是组织选择也能形成闭环：`Eval Data → Capability / Organizational Map → Agent Routing Policy → 下一轮执行组合`。这张图的价值不在于让系统自动增加更多 Agent，而是帮助它学会什么时候一个主体就够、什么时候需要 Subagent、什么时候才值得真正拆出独立责任。

## 组织拓扑怎样连接交接与互操作

- [Subagent](01_什么时候需要Subagent.md)定义 Context/Responsibility Isolation；
- [Delegation、Handoff、Shared State](02_怎样委派与交接任务.md)定义责任和信息怎样流转；
- 本章只在这些原语之上组织拓扑、Registry、Discovery，并向通用 Routing 提供 Agent-specific facts；
- [A2A](04_A2A解决了什么问题.md)解释跨 Runtime 互操作；
- [Agent Explosion](05_为什么Agent越多系统越复杂.md)评估组织复杂度；
- [Routing / Policy](../04_Harness与Runtime/05_任务怎样选择模型和路径.md)维护通用路由与调度基础设施。

## 检查拓扑是否服务于真实责任

1. Controller–Worker 与 Supervisor 的责任差异是什么？
2. P2P 为什么必须有 Registry、Task identity 和 bounded delegation？
3. Blackboard 为什么不等于共享全部 Context？
4. Event 与 State 的区别是什么？
5. Registry 与 Discovery 分别回答什么？
6. 拓扑应该向 Agent Routing 提供哪些组织事实，而不自己成为第二个 Routing Owner？
7. 动态创建 Agent 前应该先尝试哪些更小的升级？

## 学习导航

[← 上一章](02_怎样委派与交接任务.md) · [新版目录](../README.md) · [下一章 →](04_A2A解决了什么问题.md)
