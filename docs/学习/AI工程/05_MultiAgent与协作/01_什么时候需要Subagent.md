# 什么时候需要 Subagent

> 唯一职责：解释 Subagent 的 Context/Responsibility Isolation，以及它与独立 Agent 的边界。

## 主任务太重时，先拆一段有交付物的责任

### 本节新词

- **Subagent（子 Agent）**：由主任务临时拆出的局部执行主体，负责一段边界明确、能够独立验收的工作。它首先解决责任和 Context 隔离，不是“多一个脑子”。
- **Parent Task（父任务）**：仍然拥有总体 Goal、最终整合和完成判定的主任务。Child 成功只能证明局部交付完成。
- **Context Isolation（上下文隔离）**：只给子任务完成局部责任所需的信息，避免主 Context 被细节淹没。
- **Responsibility Isolation（责任隔离）**：每个子任务拥有唯一问题、明确交付物和停止条件，避免多个 Child 重复做同一件事。
- **Independent Agent（独立 Agent）**：拥有自己的长期身份、生命周期、权限或责任域，不依附于一次 Parent Task。

这种拆分的第一价值通常不是“多一个脑子”，而是把局部责任和它所需的 Context 隔离出去：

```text
Parent Task
  ├─ 子问题 A → focused context → result/event
  └─ 子问题 B → focused context → result/event
```

Parent 仍拥有总目标、最终整合和交付责任。只有当子主体拥有长期身份、独立生命周期、权限、状态与对外责任时，才更接近 Independent Agent。

## 为什么单一 Context 会失控

复杂任务会同时积累需求、源码、日志、研究、方案和验证结果。把所有内容留在一个 Context 中会产生：

- 重要约束被噪声稀释；
- 不同子问题的假设互相污染；
- 同一资料被重复读取；
- 长任务成本与延迟持续增长；
- 局部失败很难定位责任。

Subagent 通过 Context Isolation 让每个工作单元只看到完成局部责任所需的信息。

## Task-scoped Subagent

### 本节新词

- **Task-scoped（任务级）**：子 Agent 的生命周期和责任绑定当前 Child Task，任务结束后不需要保留永久身份。
- **Subtask Contract（子任务合同）**：明确 objective、scope、约束、预期输出、Evidence、Budget、Deadline 和 Parent identity 的结构化约定。

典型子任务合同包括：

```text
objective
scope / allowed sources
constraints
expected output
evidence requirements
budget / deadline
parent_task_id
```

子任务完成后返回可验收 Artifact、对应 Evidence，必要时再附局部发现或状态 Event；Parent 决定如何合并。不要把 Parent 的全部历史复制过去，也不要只发一句模糊的“帮我看看”。

## Subagent ≠ Independent Agent

### 本节新词

- **Identity（身份）**：一个主体在系统中的稳定身份；Independent Agent 往往拥有独立身份，而 Task-scoped Subagent 通常继承或收窄 Parent 身份。
- **Lifecycle（生命周期）**：主体从创建到结束的持续时间。是否跨任务长期存在，是区分局部 Subagent 与独立 Agent 的重要信号。

| 维度 | Task-scoped Subagent | Independent Agent |
|---|---|---|
| 生命周期 | 随子任务创建和结束 | 可跨任务长期存在 |
| 责任 | Parent 委派的局部责任 | 自己拥有明确责任域 |
| State | 多由 Parent Runtime 管理 | 有独立 State 与版本 |
| Identity/Permission | 常继承或收窄 | 独立身份与权限 |
| 对外发现 | 通常不需要 | 可能需要 Registry/Discovery |

执行在不同线程、进程或模型上，不足以证明它是独立 Agent；责任语义比部署形态更重要。

## 异步 Subagent

### 本节新词

- **Asynchronous Subagent（异步子 Agent）**：Parent 不需要保持同步等待，Child 可以独立运行并在状态变化时通过 Event 通知 Runtime。
- **Runtime Event（运行时事件）**：`CHILD_COMPLETED / FAILED / WAITING` 等会影响 Parent 可运行条件的语义变化。
- **Result Reference / Evidence Reference（结果／证据引用）**：Event 携带对实际产物和证据的稳定引用，而不是只发一段进度描述。

异步不意味着两个模型一直在线聊天。真正同步的是 Runtime Event：

```text
CHILD_CREATED
CHILD_RUNNING
CHILD_WAITING
CHILD_COMPLETED(result_ref, evidence_refs)
CHILD_FAILED(error_class)
```

Parent 可以暂停，收到 Event 后重新 Assembly Context 并 Resume。长的是 Task 和 State，不是网络连接或模型意识。

## Parent / Child 责任

### 本节新词

- **Shared Truth（共享真值）**：Parent 和多个 Child 共同依赖的受治理事实。Child 的自然语言结论不能无条件直接覆盖它。
- **Write Permission（写权限）**：合同明确允许某个 Child 修改哪些共享 State / Artifact；没有授权时，Child 默认只应返回结果而不是直接提交全局真值。

Parent 应负责：任务拆分是否合理、输入事实是否充分、结果冲突如何处理、总目标是否完成。Child 应负责：局部 Scope、证据质量、明确报告不确定性和阻塞。

Parent 不应盲信 Child 的自然语言结论；结果应带来源、版本和验证状态。Child 也不应直接修改 Parent 的共享真值，除非合同明确授予写权限。

## 并行的真实条件

### 本节新词

- **Parallelism（并行）**：多个输入互不依赖的子任务同时执行，以降低 Wall-clock Time（墙钟时间）。
- **Write Set（写集合）**：一个子任务可能修改的文件、State 或外部对象集合。多个 Child 写集合重叠时，并行会产生冲突。
- **Mutual Resource（互斥资源）**：同一时刻只能由一个任务占用的资源，例如单一浏览器会话或端侧模型设备。

只有子任务输入互不依赖、写集合可隔离、预算允许时，并行才降低墙钟时间。以下情况应串行：

- B 依赖 A 的精确输出；
- 多个子任务会写同一文件或外部对象；
- 需要同一个互斥资源；
- 中间结果会改变后续 Scope。

并行数量增加也会带来启动、Context 构建、整合和冲突成本。

## 拆出 Subagent 后反而更慢的情形

拆分不是免费的。Parent 需要支付启动、Context 构建、通信、整合、冲突处理和验证成本；这些协调成本的正式评估留到本层最后一章。

- 把每个函数调用包装成 Agent：增加协调成本，没有责任收益；
- 把完整 Context 复制给所有 Child：没有隔离，只复制成本；
- Parent 只做转发：没有真正的总责任 Owner；
- Child 直接写共享 State：并发冲突与错误事实扩散；
- 结果只有摘要没有 Evidence：无法验证和安全接管。

## 何时值得用 Subagent

当局部任务有清晰边界、需要专门 Context、能独立产出可验证结果，且整合成本低于单 Context 污染成本时使用。若只是一步 Tool 调用、一个确定性函数或必须紧密共享推理的连续步骤，保持单 Agent 更简单。

## 与后续章节的连接

- 下一章处理 Delegation/Handoff 与 Shared State；
- 组织拓扑章只有在多个独立责任主体确实存在时才适用；
- A2A 解决跨 Runtime 互操作，不是本地 Child Event 的默认协议；
- Agent Explosion 章会用增量价值检验拆分是否过度。

## 检查这次拆分有没有独立价值

1. Subagent 的第一价值为什么是 Context Isolation？
2. 哪些条件使一个主体接近 Independent Agent？
3. 异步协作真正同步的对象是什么？
4. Parent 为什么不能把最终责任也一起丢给 Child？

## 学习导航

[← 上一章](../04_Harness与Runtime/05_任务怎样选择模型和路径.md) · [新版目录](../README.md) · [下一章 →](02_怎样委派与交接任务.md)
