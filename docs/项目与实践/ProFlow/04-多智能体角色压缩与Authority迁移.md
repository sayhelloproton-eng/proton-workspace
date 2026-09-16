# ProFlow｜多智能体角色压缩与 Authority 迁移

> 状态：ACTIVE_RESEARCH / STRONG_EVIDENCE
> 核心问题：为什么 ProFlow 最终不是“更多、更动态的 Agent”，而是固定三个复合岗位？为什么 Product GPT 后来又失去了 New Task bootstrap 权？

## 1. Phase 2 的起点其实是 Controller-centric

2026-08-05 的 `SOL-CTL-001` 第一宿主就是 ChatGPT Custom GPT，总控负责目标理解、计划生成/修订、下一步决策、任务推进、审批识别和结果复审。

当时文档已经允许任务由“前置产品经理角色”产生，但 Phase 2 MVP 真正实现和验证的核心仍是：

```text
Task / Goal
→ Controller
→ Task Control / Local / Browser
→ Result / Approval / Uncertain
→ Controller continuation
```

也就是说，早期系统不是“三 Agent 团队”，而是一个强 Controller + 多个执行域。

## 2. 2026-08-11：三角色出现，但它首先是一种“复杂度压缩”

`8ee6de8` 首次把第一版业务验证冻结成三个复合角色：

```text
运营 + 产品经理
项目管理 + 研发
测试 + 运维
```

同一批 Task 设计又明确：第一版**不做并行 Node**。即使前端/后端现实中可并行，也先统一归入“项目管理 + 研发”的一个研发 Node；未来只有真实需要多 Worker / 多子工作时，才考虑 WorkItem / 并行 Node。

当前 Spec 进一步把这条原则锁死：

```text
不建立并行 Node
不建立通用 DAG / Edge Engine
不建立无限 Loop Engine
不建立 dynamic agent discovery / capability matching
不新增 Persona / 专业化 Role
```

专业知识优先通过 Knowledge 增量吸收，而不是先继续拆 Agent。

#

## 这说明什么

三角色不是组织架构模拟，也不是为了证明“Multi-Agent”。它实际是在压缩真实软件生命周期：

```text
需求发现 / 运营判断 → Product
项目推进 / 技术实现   → Controller-Dev
测试 / 部署 / 验收    → Test-Ops
```

先只保留三个长期职责边界，把“角色数量、并行调度、动态匹配”从 v1 复杂度预算中主动删除。

## 3. 三角色第一版仍然是 Product-GPT-first

2026-08-11 的 Agent Domain 文档显示，Product Worker 当时很特殊：

```text
用户主动进入新的 Product GPT Conversation
→ 充分沟通
→ 形成需求
→ Product 查询当前 Role
→ 创建 Task
→ 绑定自己并选择 Dev/Test
```

也就是说，虽然已经从单 Controller 扩展为三角色，但 Product GPT 仍然持有 **pre-Task bootstrap / team discovery** 权。

这是一个重要的中间态：

```text
Controller-centric
→ Product-GPT-first three-role team
→ Application-first fixed-role team
```

不能直接从 Phase 2 跳到当前架构。

## 4. 2026-08-15：真正关键的变化是 Authority 回迁

v2.1 架构裁决明确：

```text
Extension 是唯一 New Task 入口

Product GPT 不再：
- createTask()
- listRegisteredRoles()
- dynamic select Dev/Test

原因：这些确定性工作已经可以由 Application 完成
```

随后 `32363da` 真正在实现中删除 Product 的 `createTask / listRegisteredRoles / getRegisteredRole` 主链，并把身份拆成：

```text
agentPackageRef       = 逻辑岗位
roleRef               = 已部署 Custom GPT / g-id
workerRef             = Task 内具体 Worker
conversationLocator   = 真实 Conversation locator
```

Task readiness 也从“模型/页面看起来准备好”变成固定三 binding + Requirement 等 Owner facts 的确定性判断。

## 5. 为什么这比“三个 Agent”更值得讲

真正的工程判断是：

> **能被程序确定的系统 bootstrap、组队、身份、readiness，不因为模型很聪明就交给模型。**

因此当前结构是：

```text
Application / Task Owner
→ 创建 Task / 固定岗位 / durable binding / readiness

Product / Dev / Test-Ops Agent
→ 只在已经存在的业务上下文中处理真正需要智能判断的工作
```

这是一种“智能最小授权”原则：让模型承担不确定性，而不是承担所有权。

## 6. Trade-off

固定三个复合角色当然付出了代价：

- v1 不能动态插入专业 Agent；
- 不支持前端/后端等并行角色拓扑；
- 不做 capability matching；
- 一个复合角色内部职责较宽；
- Product/Dev/Test 的结构需要产品预先裁决。

换来的则是：

- 角色身份稳定；
- Task binding 可持久化、可恢复；
- Custom GPT Provisioning 数量有界；
- Browser/Conversation identity 可验证；
- Collaboration target 可确定；
- Real Journey 和 Deployment 都能形成有限状态空间。

## 7. 当前亮点候选

比“实现三个 Custom GPT 多智能体”更准确的表述是：

> **从单 Controller 演进到三复合岗位，但刻意拒绝 Agent 数量膨胀和动态拓扑；再把 New Task、组队与 readiness 从 Product GPT Authority 迁回确定性 Application / Task Owner，让模型只处理角色内真正需要智能判断的部分。**

## 8. 主要证据

```text
2026-08-05  5b1edbe  Phase2 Controller MVP；允许前置产品经理，但核心仍 Controller-centric
2026-08-11  8ee6de8  首次冻结三个复合角色 + 第一版不做并行 Node
2026-08-11  d4d7863  Product-GPT-first 三角色工作流
2026-08-15  v2.1 ruling  Extension 成为唯一 New Task 入口
2026-08-15  32363da  删除 Product createTask / role discovery 主链
当前 Spec            禁止 dynamic agent topology / 专业化 Role / 并行 Node
```
