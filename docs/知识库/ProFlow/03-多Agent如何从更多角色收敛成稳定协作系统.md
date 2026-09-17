# 多 Agent 如何从“更多角色”收敛成稳定协作系统

第一次看 Multi-Agent（多智能体：多个长期角色围绕同一目标分工协作）的系统，很容易把“角色更多”理解成“能力更强”。ProFlow 的真实路线几乎相反：越接近长期运行，越需要减少长期角色、稳定身份、限制协作通道，并把正式交接从聊天记忆迁到可恢复的业务事实。

今天的 Product / Dev / Test 三个复合角色，不是一次组织架构模仿，而是从 Controller-centric（以总控智能体为中心）的早期路线、Product-GPT-first 的过渡方案和真实 Browser 运行问题里逐步压出来的。

这篇文章只回答一个问题：**多个 Agent 怎样组成一支可以跨 Task、跨 Conversation、跨浏览器重启继续工作的团队，而不是一群会互相聊天的模型？**

## 先减少角色，再讨论自治

Phase 2 的主循环明显以 Controller 为中心：

```text
User Goal
→ Controller
→ Task / Local / Browser capability
→ Result / Approval / Uncertain
→ Controller continuation
```

它非常适合快速验证跨域能力能不能串起来，但也会自然把越来越多责任吸进中央大脑：理解目标、决定下一步、观察 Browser、识别审批、复审结果、恢复失败。

2026-08-11 的 `8ee6de8` 没有继续拆更多专家，而是把长期业务岗位压成三种复合责任：

| 角色 | 长期负责 | 不应该吞掉 |
| --- | --- | --- |
| Product / Ops | 目标、约束、需求收敛、产品级判断 | 不直接写产品源码，不替 Test 宣布通过 |
| Controller / Dev | 技术方案、实现、工程质量、版本与运行结果 | 不偷偷改产品 Goal / Acceptance |
| Test / Ops | 独立验证、真实环境、部署、故障 Evidence | 不替 Dev 修完再自己宣布 PASS |

为什么不是前端、后端、数据库、架构、安全、SRE 各做一个长期 Agent？因为 v1 需要先稳定的是**长期责任边界**，不是复制公司组织图。

专业能力可以通过 Context、Knowledge、工具和临时子任务增加；只有当某项责任拥有独立长期事实、生命周期和协作价值时，才值得增加新的长期 Role（角色：稳定职责与权限的逻辑岗位）。

## 第一版刻意不做“看起来更 Agentic”的东西

早期规范主动限制了通用 DAG（有向无环图：用任意图结构表达复杂依赖的工作流模型）、无限 Loop、动态 Agent Discovery、动态 Capability Matching 和任意并行。

代价是灵活性降低；收益却非常具体：

```text
更少的 identity 组合
更少的 Browser Conversation
更少的 Approval / 权限状态
更小的恢复空间
更有限的 E2E 路径
更清楚的责任归属
```

这不是永久禁止动态角色，而是建立一个长期原则：**复杂度要由已经出现的真实需求购买。**

## 从 Product-GPT-first 到 Application-first，变化的是 Authority

三角色形成后，Product GPT 一度仍然承担角色发现、Task 创建和部分 bootstrap。逻辑上很顺：Product 最先理解用户目标，就让它顺便把团队组起来。

问题在于，固定角色和 Task readiness 一旦已经有确定规则，系统就出现两个 Authority（决定权：谁有资格改变某类正式事实）：

```text
Product GPT 认为应该有哪些角色
        ↕
Task / Application 已经知道固定岗位与 binding 状态
```

2026-08-15 的 v2.1 于是把确定性部分迁回 Application / Task Owner。`8e66b90`、`a33a477` 冻结设计与 proof，`32363da` 落实现实，Browser 侧的 `5278fc6` 又继续把 Universal Task Driver 拆掉。

结果不是“模型被削弱”，而是职责变得更清楚：

```text
Application / Task Owner
→ 建 Task shell
→ 建固定 Role slot
→ 保存 TaskRoleBinding
→ 决定 readiness 与 lifecycle

Product / Dev / Test
→ 在正式上下文里处理必须靠认知完成的工作
```

## 一个 Agent 到底是谁：Role、Worker、Conversation、Tab 必须拆开

Browser 真正参与运行以后，最危险的歧义不是模型回答错，而是系统把“角色”“某个 Task 的执行者”“真实 Conversation”“当前 Tab”混成一个身份。

ProFlow 后来把身份分层：

```text
agentPackageRef
= 可部署的逻辑岗位材料

roleRef
= 当前部署后的稳定 Role identity，通常映射到 g-id

workerRef
= 某个 Task 里承担该 Role 的 Worker

conversationLocator
= 找回真实 Worker Conversation 的稳定定位

tabId / windowId / contentInstanceId
= 当前浏览器控制位置，不是业务身份
```

这样一来，Chrome 刷新、Extension reload、Tab 关闭都不会自动制造第二个 Worker。Task reopen 也可以复用原 Task binding，同时通过新的 `runNo` 表示新的执行轮次。

稳定身份回答“这是谁”，瞬时 locator 只回答“现在从哪里控制它”。

## Role 与 Worker 分开以后，部署期和运行期自然分成两条生命线

一个 Custom GPT 的 g-id 可以跨很多 Task 长期存在；一个 Worker Conversation 属于某个具体 Task 协作实例。

```text
Agent Package
→ 部署成稳定 Role / g-id
→ Task 绑定 Role
→ 为当前 Task 创建 Worker Conversation / c-id
→ 保存 workerRef + conversationLocator
```

所以 Custom GPT Provisioning（资源物化：把角色材料创建或同步成外部 GPT）与 Worker Carrier（Worker 承载：创建、恢复和唤醒某个 Task 的真实 Conversation）不能因为都发生在 Chrome 里就合成一套状态机。

前者回答“角色资源是否存在并配置正确”；后者回答“这个 Task 的 Worker 现在在哪里、怎样继续”。Browser 的具体实现放在下一篇展开。

## Task / Node 把协作从“谁下一句说什么”变成持久工作流

三角色真正进入工程系统以后，不再靠 Conversation 热度推进，而是进入持久化 Task（任务：有明确目标、范围和结束条件的正式工作）与 Node（节点：Task 中由某个角色承担的一步工作）：

```text
Requirement
→ Task
→ ordered Node
→ Role Binding
→ Worker start / complete
→ 下一 Node / WAITING / FAILED / terminal
```

正式交接也不再是一句“我做完了，你继续”。

Product → Dev 至少要留下 Requirement、Acceptance、Scope / Non-Scope、约束和关键 Evidence；Dev → Test 要留下实现摘要、Git / 版本、运行方式、影响范围和风险；Test → Product / Dev 要留下 Test Result、first divergence、复现和真实验收结果。

这些长期事实属于 TaskDocument、Git、Test Result、Runtime / Deployment evidence 等 Owner。Conversation 只承载当前工作需要的局部上下文。

## `askPeer / replyPeer` 为什么只能是局部问讯

同一个 Task 里的 Worker 当然需要互相问问题。Dev 可能需要 Product 澄清一句 Requirement，Test 也可能需要 Dev 提供复现细节。

Message Center（消息中心：保存同一 Task 内局部 ask / reply 协作的正式通道）适合短问题和短答案，但不应该承担：

```text
正式 Requirement 交接
Test Result
Task / Node 状态迁移
跨 Task 广播
产品下一轮调度
```

否则它会变成第二条隐藏 Workflow。

如果局部问讯已经演变成真正 blocker，就应该进入 Task 的 WAITING、acknowledge、reopen 等正式语义，而不是让消息本身偷偷改变工作流。

## 逻辑消息和物理投递也必须分层

Agent 领域先形成 durable PENDING message，Browser 才负责把这条已存在的消息送进目标 Conversation：

```text
Agent Owner
→ PENDING message
→ 找到目标 Task binding
→ restore 目标 Worker
→ Browser physical delivery
→ 页面 fingerprint Evidence
→ Agent Owner 记录 DELIVERED / FAILED / UNKNOWN
```

这层拆分解决了一个长期恢复问题：页面 submit 超时以后，系统不能因为“逻辑上希望送达”就再发一遍。物理结果如果是 UNKNOWN（未知：当前既无法证明已经发生，也无法证明没有发生），必须先核对现实。

所以 Multi-Agent 协作最后并不是“Agent 互相聊天”，而是**持久逻辑消息 + 可核对的物理投递**。

## Product 入口为什么又重新打开“Task 之前谁先思考”的问题

Application-first 解决了确定性 bootstrap，却带来另一个产品问题：如果 Task 在 Product 完成 goal-level 讨论前就创建，初始 Brief 很容易过早固化成正式 Requirement。

Phase 4 因此探索新的边界：

```text
用户 / Chat 提供初始 Brief
→ Product / Ops 做 goal-level discussion
→ Research / Brainstorm / 约束确认 / 做减法
→ owner-backed Product Docs
→ 受限 Product Intent
→ Task Owner 幂等 materialize Task
→ 新的 Task-scoped Product / Dev / Test Workers
```

这不是把原始 `createTask / startTask / setStatus` 权限还给 Product。Product 提交受约束的 Intent（意图：描述“希望系统建立什么工作”的业务请求），Task Owner 仍然负责实际 Task 创建、固定角色、幂等和状态。

同样，创建也不等于启动授权。Campaign Authorization（活动授权：用户对既定 Goal / Scope / 成本 / 隐私 / 风险边界的一段持续授权）与 Product Intent 被刻意分开，越出授权边界就重新要求人确认。

这些 Phase 4 能力是否已经完全通过 Runtime Acceptance，必须看当前 Source、Runtime 和真实验收；历史设计材料不能单独把目标写成已完成事实。

## Reopen 为什么不应该创建第二支团队

一个 Node 失败后重新做，并不意味着换一个 Task 或新建三个 Worker。正式 `reopen` 语义保留同一个 `taskId / nodeId`，增加新的 `runNo`，把目标 Node 重新置为 READY，并按规则重置后续 Node。

TaskRoleBinding 仍然存在；对应角色仍然是同一个 Task Worker，只是进入新的执行轮次。

这个设计让失败历史和恢复历史同时成立：旧 run 没被抹掉，新 run 也不会被伪装成“第一次执行”。

## 多智能体最终优化的不是数量，而是歧义

把这条演进压缩以后，ProFlow 的 Multi-Agent 结构是：

```text
最少但稳定的长期角色
+ 明确 Fact Owner（事实归属方：某类正式事实唯一可信来源）
+ Role / Worker / Conversation 分层身份
+ 有界 Task / Node
+ 正式 handoff
+ 局部 collaboration channel
+ 只在需要认知判断处使用模型
```

它牺牲了一部分“动态、自由、像真人组织”的观感，换来真正影响长期运行的东西：状态可以持久化、身份可以恢复、页面可以重连、权限可以证明、失败可以 reopen、验收可以独立完成。

如果未来增加新的长期 Agent，最值得问的问题仍然不是“这个角色听起来专业吗”，而是：**它是否拥有一个真实、长期、无法由现有 Owner 表达的独立责任。**

## 历史来源与证据入口

这篇文章主要吸收：`04-多智能体角色压缩与Authority迁移.md`、`09-产品入口从Product-GPT到Tasks-Application.md`，以及 `13-Browser从万能Host到双平面Reality-Adapter.md` 中与身份、Observer / Carrier 边界有关的内容；`15-Custom-GPT从在线配置到外部Deployment-Resource.md` 提供 Role / g-id 与 Worker 生命周期分离的证据。

历史材料解释“为什么三角色和身份模型会这样收敛”；今天具体 Task 状态、Action contract、Phase 4 Product Intent 与 Campaign 进度，仍应以当前 `repos/proflow` 的 Spec、源码和真实验收为准。
