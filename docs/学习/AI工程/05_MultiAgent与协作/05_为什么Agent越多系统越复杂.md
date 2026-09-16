# 为什么 Agent 越多，系统越复杂

> 唯一职责：解释 Multi-Agent 的增量收益、组织成本、Persistent/Ephemeral 选择与 Agent Explosion。

## 每增加一个 Agent，都新增一组分布式责任

### 本节新词

- **Multi-Agent（多 Agent 系统）**：多个相对独立责任主体共同完成任务的系统。它可能带来并行和专业化，也同时引入通信、状态、权限和失败边界。
- **Agent Explosion（Agent 膨胀）**：为了角色名、Prompt 差异或局部能力不断新增 Agent，最终组织成本增长快于有效能力。

Multi-Agent 不是单 Agent 的免费升级。Agent Explosion（Agent 膨胀）指系统为了拆职责不断增加 Agent，结果协调成本增长得比有效能力更快。每增加一个独立责任主体，就会增加 Identity、Discovery、Routing、State、Permission、Communication、Failure、Eval 和 Ownership 成本。

```text
收益：并行、专门化、Context 隔离、权限隔离、独立生命周期
成本：协调、冲突、等待、重复工作、故障传播、观测与治理
```

这与 Microservice Explosion 相似：如果边界不是由真实责任和独立变化驱动，拆分只会把本地复杂度变成分布式复杂度。

## 用增量价值抵扣协调税

### 本节新词

- **Coordination Tax（协调税）**：拆分后为 Discovery、Routing、Handoff、等待、冲突处理和结果整合付出的额外成本。
- **Incremental Value（增量价值）**：新 Agent 相对更简单基线真正增加的质量、并行或隔离收益，扣除协调、状态、权限、失败和 Eval 成本后的净收益。
- **Baseline（基线）**：用来比较新架构是否真的更好的最小可靠方案，例如单 Agent、Workflow 或 bounded Subagent。

```text
Incremental value
= quality / parallelism / isolation gain
- coordination / state / permission / failure / eval tax
```

每增加一个独立 Agent，都同时增加一个新的责任与分布式边界。只有增量收益长期大于协调税，Multi-Agent 才成立；否则应降回 Skill、Tool、Workflow 或 Ephemeral Subagent。

## 为什么多个角色不等于多个 Agent

### 本节新词

- **Role Prompt（角色提示）**：在同一 Runtime/Task 中让模型临时采用 planner、reviewer、executor 等不同工作视角的提示配置；它不自动产生独立责任主体。
- **State Machine（状态机）**：由一个明确 Owner 维护合法状态转换的确定性结构。多个角色可以共享同一 State Machine，而不必拆成多个 Agent。

一个 Runtime 可以在不同步骤使用 planner、reviewer、executor 等角色提示，但仍由一个 Task Owner 和 State Machine 负责。只有当主体拥有独立责任、生命周期、权限或资源边界时，拆成 Agent 才可能有意义。

不要从组织图开始，应从失败证据开始：单 Context 是否污染？资源是否需要隔离？责任是否独立演化？并行是否真的降低延迟？

## Persistent vs Ephemeral

### 本节新词

- **Persistent Agent（持久 Agent）**：跨任务长期拥有身份、State、Permission、Memory 或外部责任关系的 Agent。
- **Ephemeral Agent（临时 Agent）**：只为一次有界任务存在，完成后释放身份和资源；适合局部工作可由 Parent 验收的场景。
- **Identity Continuity（身份连续性）**：同一主体需要跨多个任务保持稳定身份和责任关系，是持久 Agent 成本成立的重要理由。

### Ephemeral Agent

为一个局部任务创建，完成后释放。适合高弹性、低身份连续性、结果可由 Parent 验证的工作。优势是治理面小；缺点是每次需要重新装配 Context。

### Persistent Agent

长期拥有责任域、身份、权限、Memory 或外部关系。适合持续监控、长期队列、领域 Owner。代价是版本升级、权限审计、状态迁移、在线健康和责任接管。

不要为了“有个角色”就创建 Persistent Agent。长期身份必须对应长期责任。

## Agent Explosion 的症状

- 每个技能、Tool 或 Prompt 都有一个 Agent；
- Agent 名称很多，但 Owner 与权限不清；
- 同一 Task 被多个 Agent 重复理解和摘要；
- 大量消息只为同步对方刚做了什么；
- Shared State 冲突靠对话解决；
- 调试必须跨多个 Trace 才知道真实 Effect；
- 模型与 Token 成本增长，但成功率没有显著提升；
- 新增一个 Agent 比修改一个确定性模块更容易，于是组织持续膨胀。

## 与微服务的类比和差异

### 本节新词

- **Microservice Explosion（微服务膨胀）**：服务拆分过细后，网络、发现、版本、部署、故障和 Ownership 成本超过边界收益的现象；Agent Explosion 有类似结构。
- **Semantic Drift（语义漂移）**：概率 Agent 的错误可能不是显式异常，而是理解、目标或判断逐渐偏移，因此比普通服务更依赖 Outcome Eval 和 Evidence。

相似处：边界、服务发现、版本、网络失败、重试、幂等、可观测性、Ownership。  
差异处：Agent 行为具有概率性，输入 Context 变化大，错误可能表现为语义偏移而不是显式异常。因此它比普通服务更需要 Outcome Eval 和 Evidence。

类比的目的不是说 Agent 必须部署成服务，而是提醒：**一旦责任主体独立，分布式系统问题就已经出现。**

## Incremental Value Test

### 本节新词

- **Incremental Value Test（增量价值测试）**：把 Multi-Agent 与最小可靠基线在同一真实任务集上比较质量、错误、延迟、成本、人工和恢复结果。
- **Wall-clock Latency（墙钟延迟）**：从用户开始等待到整个任务真正结束的实际时间；并行是否有价值最终要看它有没有降低这个时间。
- **Human Intervention Delta（人工介入变化量）**：引入新 Agent 后人工审批、修复和接管增加还是减少。

把 Multi-Agent 与最小可靠单 Agent / Workflow 基线比较：

```text
task success delta
critical error delta
wall-clock latency delta
total token / tool / infrastructure cost
human intervention delta
recovery quality
coordination failures
```

如果只提高“看起来更像团队”的可解释性，却没有改善 Outcome，拆分不成立。

还值得单独看一个反向指标：**本来由单 Agent、Workflow 或普通函数就能完成的任务，有多少仍被系统拆出了额外 Agent。** 这里把它作为 over-delegation（过度委派）观察项；它是本课程采用的评估口径，不是假装存在统一行业阈值。过度委派上升，通常说明组织复杂度正在吞噬收益。

## 先找现有 Agent，再创建新 Agent

Registry / Discovery 已由上一章定义。这里关注一个治理问题：在创建新主体之前，系统有没有先复用已有责任主体？

### 本节新词

- **Identity Garbage（身份垃圾）**：动态创建后无人维护、无人回收、没有长期责任价值的 Agent 身份和资源。

动态系统的顺序应该是：

```text
明确缺失责任
→ Registry / Discovery 查已有主体
→ Capability + Permission + load 过滤
→ 能协作则协作
→ 无合适主体且长期价值成立，才创建
```

否则按需生成会制造无人维护的临时组织和身份垃圾。

## Concurrency 与资源冲突

### 本节新词

- **Concurrency（并发）**：多个 Agent 在同一时间推进任务；只有写集合和资源能隔离时才会转化成实际加速。
- **Lease（租约）**：一个 Agent 在有限时间内独占浏览器、工作树、设备等资源的使用权。
- **Cancellation（取消）**：停止一个仍在执行或等待的任务，并阻止其迟到结果继续产生副作用。

并行只在写集合和资源可隔离时有收益。多个 Agent 争用同一浏览器、工作树、手机模型或外部账号时，需要 lease、queue、version 和 cancellation。不能用更多 Agent 绕过物理互斥。

取消也不能只发一句“停下”。一个更可靠的状态链是：

```text
RUNNING
→ CANCEL_REQUESTED
→ stop scheduling new model/tool invocations
→ cancel what can be cancelled
→ reconcile uncertain effects / persist checkpoint
→ CANCELLED
```

已经在途的迟到结果不能因为后来返回成功就继续写 Shared State；它仍要通过当前 Owner / Version / Effect 状态检查。

## Failure Containment

### 本节新词

- **Failure Containment（故障隔离）**：限制一个 Agent 的错误只能影响明确 Scope，不通过共享 Context、State 或自动消息无限扩散。
- **Error Budget（错误预算）**：允许某类失败发生的上限或容忍范围，可用于判断某个 Agent 是否应该继续自动运行。
- **Takeover Owner（接管 Owner）**：当前 Agent 失败、取消或失联后，明确由谁接管未完成责任。

每个 Agent 应有：

- 明确输入与输出合同；
- 权限和副作用范围；
- 时间/成本/重试预算；
- 可取消 Task；
- 结构化 Event；
- Evidence 与版本；
- Parent 或接管 Owner。

没有这些边界，错误会通过共享 Context 和自动消息迅速传播。

## 什么时候值得 Multi-Agent

- 责任域可以独立演化；
- Context 或权限需要强隔离；
- 子任务真正可并行；
- 专门化带来测得的质量增益；
- 一个主体无法合理拥有全部生命周期；
- 协作合同和最终 Owner 可以明确。

不值得：简单流程、共享写高度耦合、单 Agent 尚未建立 Eval、拆分只是为了模仿人类部门。

## 简化顺序

当系统过度复杂时，按以下顺序收缩：

1. 把无独立责任的 Agent 降为 Skill/Tool；
2. 把只做一次工作的 Persistent Agent 降为 Ephemeral Subagent；
3. 把频繁 Handoff 改为 Delegation/Collaboration；
4. 把可确定的协商改为结构化 Workflow；
5. 合并共享同一 State Owner 的主体；
6. 保留真正需要权限、Context 或生命周期隔离的边界。

## ProFlow Lens｜三个角色为什么还不能证明 Multi-Agent 必要

ProFlow 已经存在多个角色、Worker binding、事件和浏览器执行边界，但这些责任仍可以由固定 Workflow + Runtime 合同稳定协调。只有真实任务反复要求动态 Discovery、独立长期身份、权限隔离或可测并行收益时，才值得继续升级 Multi-Agent。**角色数量是现象，独立责任与增量价值才是证据。**

## 复杂度警报应反馈到哪些章节

- 前四章说明怎样拆、交接、组织和互操作；本章负责问“是否值得”；
- Eval/Economics 提供增量价值证据；
- Platform 只有在多产品、多责任主体重复需要同一协调设施时才抽取；
- ProFlow 真实系统章必须先证明单 Agent/Workflow 的边界，不能预设 Multi-Agent 是终点。

## 检查新增 Agent 是否偿还协作成本

1. 为什么角色数量不能证明 Agent 数量？
2. Persistent Agent 需要什么长期责任来证明其成本？
3. Multi-Agent 的基线应该和什么比较？
4. 哪些症状说明系统正在发生 Agent Explosion？

## 学习导航

[← 上一章](04_A2A解决了什么问题.md) · [新版目录](../README.md) · [下一章 →](../06_执行环境与评估/01_研究Agent怎样建立证据链.md)
