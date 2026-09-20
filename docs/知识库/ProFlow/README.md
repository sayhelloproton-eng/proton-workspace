# ProFlow｜从多智能体对话到持续产品迭代系统

ProFlow 是一套围绕真实产品迭代建立的智能体工程系统。它复用 ChatGPT 的对话、模型、文件和 Custom GPT 等成熟宿主能力，但把 Task（任务）、身份、权限、真实副作用、恢复、部署和验收这些长期事实留在自己的 Control Plane（控制面：保存正式业务事实、状态转换和恢复规则的系统层）里。

它要解决的不是“怎样让多个 Agent 多聊几轮”，而是一个更难的工程问题：

> **一个产品目标怎样在跨 Chat、跨浏览器、跨进程和跨版本的真实环境里持续推进，同时始终知道谁拥有事实、什么动作真正发生过、失败以后从哪里恢复、什么证据才足以宣布完成。**

这组文章主要写给技术研发读者。真正值得讨论的不是“功能多不多”，而是这些机制为什么出现、早期设计在哪里失败、Owner 为什么重新划分、哪些语义被真实验证过，以及今天哪些边界仍然必须保持。

![ProFlow 全景架构图（双飞轮）](../../../assets/知识库/ProFlow全景架构图-双飞轮.png)

## 90 秒看懂 ProFlow

如果只快速判断这套系统值不值得继续读，可以先看五个问题。

| 工程问题 | ProFlow 的处理方式 | 它避免的风险 |
| --- | --- | --- |
| 多个智能体怎样不互相抢决定权 | Fact Owner（事实归属方）+ Task / Agent / Execution / Model / Deployment 五领域 | 模型、浏览器、运行时各自保存一份“真相” |
| 浏览器里的 Agent 怎样跨刷新和重启继续工作 | Role / Worker / Conversation 稳定身份与 Browser Driver 分离 | Tab、窗口或页面实例被误当业务身份 |
| timeout 后怎样判断真实副作用有没有发生 | `APPLIED / NOT_APPLIED / UNKNOWN` + Reality Reconciliation | 把 timeout 当失败后盲目重试，产生重复副作用 |
| AI 长期开发大型工程怎样不把架构修歪 | DDD、SDD、TDD、阶段冻结和真实验收 | 为修一个局部问题偷偷改变 Owner、契约或状态机 |
| 源码通过为什么还不能宣布产品可用 | Source → Package → Registry → Installed → Runtime / Product 多层真值 | 新源码没有真正进入包、工作区、进程、Extension 或用户路径 |

这五个问题不是项目开工时一次设计出来的。它们是在真实 Browser、真实 Task、真实发布、真实设备和真实恢复事故里一步步暴露出来的。

## 当前系统为什么最终形成五个领域

当前 ProFlow 实施规范把长期业务事实拆成五个领域：

| 领域 | 它拥有的核心事实 | 它回答的问题 |
| --- | --- | --- |
| Task / 任务与编排 | Task、Node、版本、运行轮次、角色绑定、正式任务文档、产品意图与 Campaign | 工作现在做到哪里，什么时候允许开始、等待、失败、完成或进入下一轮 |
| Agent / 智能体运行与协作 | Agent Package、Role、Worker、Product Discussion、协作消息 | 谁承担什么岗位，哪条 Conversation 属于哪个工作身份 |
| Execution / 执行 | Intent、Effect、Approval、Result、Artifact、Evidence、UNKNOWN | 一个真实动作到底有没有发生，能否安全恢复或重试 |
| Model / 模型与推理 | FAST / REASON、Capability Profile、队列和 Provider 调用 | 哪种推理能力当前真实可用，怎样受控调用 |
| Deployment / 部署治理 | Module 生命周期、外部资源、包版本、安装与运行状态 | 这些能力怎样真正进入当前机器和外部资源 |

`platform-host` 是 Composition Root（组合根：把各领域运行组件装配起来的入口），不是第六个业务领域。Gateway、Browser Extension、Provider 等是连接领域与真实世界的 Adapter / Driver；它们可以非常主动，但不能因为位于链路中央就顺手接管业务真值。

最重要的权威顺序可以压成一行：

```text
Owner current fact
> deterministic policy / invariant
> model assessment
> Conversation / DOM / log guess
```

也就是：**现实和正式 Owner 优先，模型判断不能覆盖已经成立的业务事实。**

## ProFlow 不是一次设计出来的

从研发视角看，ProFlow 最值得保留的不是一串 Phase 名称，而是每一次架构变化背后的 Trigger → Failure → Why → Decision。

### 起点｜先证明 AI 能不能安全碰到真实工程环境

最早的问题很直接：ChatGPT / Custom GPT 能不能在受控边界内调用本机 Mac 能力，公网入口、Action、Gateway、本机执行和权限链能不能形成最小可信闭环。

这个阶段的价值不是“做出了平台”，而是把一个抽象设想变成了可以真正观察的链路：

```text
模型提出意图
→ 受控入口
→ Policy / Capability
→ 本机或 Browser Effect
→ Result / Evidence
→ 模型继续判断
```

Cloudflare 等路线真实试过，也真实放弃过。早期原型的任务就是尽快撞最危险的假设，而不是保护已经写出来的代码。

### Phase 2｜能力已经能跑，但用户成了人工 orchestrator

Phase 2 把 Controller、Task Control、Local Control、Browser Host 和端侧模型输入串成真实 MVP。Level 2 Read Path 和 Level 3 Write Path 逐步证明：Task、Approval、Browser Submit、Delivery、Controller continuation 等核心能力确实可以发生。

但这个阶段也暴露了一个非常重要的用户体验事实：为了让链路继续，用户需要不断手工 Reload、检查 Binding、查看 Poll、回读 Approval Draft、检查 Dispatch / Journal、确认页面状态。

也就是说，系统虽然“能跑”，用户却在验收现场承担了大量本应属于平台的协调职责：

```text
目标产品期望
用户给目标
→ 平台协调
→ 只有真正需要决策时才找人
→ 平台继续
→ 完成

Phase 2 现实
用户给目标
→ 用户不断观察内部状态
→ 用户帮助判断哪一步该继续
→ 用户充当 manual orchestrator / debugger
```

这不是 UI 小问题，而是在提醒系统：**内部生命周期还没有真正被自己的 Owner 接住。**

### Phase 2 后半程｜真正的问题不是 DOM，而是生命周期所有权

真实 Browser 串联继续往前以后，一批看似无关的问题同时出现：

- Observation 为了“看最新内容”主动 scroll，观察本身开始改变页面；
- Approval waiting 期间 claim / reclaim 不断增长；
- Controller Wake 与 generation、composer、Action confirmation 互相竞争；
- Browser Delivery 已经真实发生，下游 response failure 却又把原 Browser Work 反向判成失败；
- Browser Host 同时承担 heartbeat、binding、polling、observation、approval、response wait、wake 等越来越多职责。

这些问题的共同根因不是 selector 不够稳，而是 Observation、Execution、Approval waiting、Response lifecycle、Human interaction、Continuation 被绑进了同一个生命周期。

Phase 2 因此留下了一组后来反复复用的工程语义：

```text
OBSERVE != MUTATE

Delivery terminal
!= downstream response lifecycle

Business Wait
!= Execution Lease

Wake
= notification / continuation delivery
!= workflow owner

Browser Driver
!= hidden Workflow Engine

真实 Browser
= final Acceptance
!= primary state-machine debugger
```

这组结论比当时任何一个 class、package 或 Browser command 都更重要。

### Phase 3｜保留真实语义，不保留旧实现

Phase 2 收口时形成了一条后来一直非常重要的迁移原则：

> **保留已经被真实验证的语义，不等于保留当时的实现。**

换句话说：

```text
prototype code
可以删除

旧 package / class / internal API
可以重写

已经由真实失败和真实验收证明的安全语义
不能因为重构一起消失
```

因此 Phase 3 可以颠覆性重塑仓库和 Runtime，但必须显式保留、迁移或正式废弃那些已经被真实证明的重要边界，例如：

- identity / binding；
- idempotency；
- one-time Approval；
- Delivery evidence；
- no blind retry after uncertain side effect；
- Claim / Delivery / Result 等不同生命周期；
- Provider 与业务语义分离。

Phase 3 随后用 DDD 重新划分 Fact Owner，用 SDD 冻结 Contract / State / Failure semantics，再让测试和实现服从这些边界。Task、Agent、Execution、Model、Deployment 五领域不是为了让架构图更完整，而是为了让不同生命周期各自拥有唯一事实。

这时项目发生的关键变化是：

> 从“让一个更聪明的总控协调所有事情”，转向“让每个 Owner 只拥有自己能够负责和恢复的事实”。

### Phase 3 实现期｜真正成熟的动作往往是删除错误抽象

领域边界建立以后，很多工作不是继续增加功能，而是删除重复 Owner：

- Browser 不再拥有通用 Task Workflow；
- 确定性初始化和状态迁移回到真正 Application / Domain Owner；
- 重复 Carrier / Wrapper 被退休；
- Deployment 从中央 Planner 收缩成 Module 自治；
- Provider 只暴露稳定能力，不把设备、模型 App 或业务路由写进 Contract。

这里形成了一个很实用的复杂度判断：

```text
成熟外部机制可以直接使用
→ REUSE

外部能力成熟，但需要自己的 identity / lifecycle / recovery
→ WRAP

对象本身就是 ProFlow 长期事实
→ BUILD

自研层只是复制别的 Owner，没有独立事实
→ DELETE
```

所以 ProFlow 的架构演进并不是“越来越多”，而是不断尝试、撞失败、重新找 Owner，再删除没有资格存在的层。

### Real-1 / Real-2 / Real-3｜源码正确以后，还要证明真实世界真的采用了它

进入真实部署以后，项目又暴露出另一类问题：Source 绿了，用户不一定真的运行到这份代码。

于是验证逐渐拆成多个事实层：

```text
Source Truth
→ Package Truth
→ Registry Truth
→ Installed Truth
→ Runtime / Product Truth
```

真实 Browser、Custom GPT、Tunnel、模型服务、包仓库和 Fresh Workspace 各自拥有自己的 Reality。Real-1 / Real-2 / Real-3、SAME SCENE、FAST REPLAY、FULL FRESH 等不同 Gate 证明的是不同层级，不能互相冒充。

这里留下的稳定原则是：

> **上游通过，不能推出下游已经成立；工程完成最终必须回到真实用户路径证明。**

### Phase 4｜从“一份 Task 成功”走向持续产品迭代

前面的阶段解决了“一份 Task 怎样可信地工作和恢复”，但长期产品还有另一个问题：

> 一个开放的 Product Goal 怎样持续演进，同时保证每一份 Task 都有边界、有结束条件，而且系统不会因为 Agent 还能想到优化点就无限续轮？

因此当前产品迭代设计把 Product Discussion、Product Intent、Campaign Authorization、Product / Dev / Test 三角色、独立验收和 Product Review 连接起来：

```text
真实产品目标
→ 产品讨论与约束收敛
→ 有界 Product Intent
→ 有界 Task
→ Dev / Test 真实执行与独立验证
→ terminal evidence
→ Product Review
   ├─ GAP_REMAINS + 新证据 → 下一份有界 Task
   └─ GOAL_SATISFIED → Closure
```

这里最关键的不是自动创建更多 Task，而是把两件事分开：

```text
Product Goal
可以长期存在和演进

单个 Task
必须有边界、验收和终态
```

长期自动化真正需要的不是“永远继续”，而是**知道什么时候值得继续、什么时候必须停。**

### 外层 Monitor｜修 ProFlow，但不冒充 ProFlow 已经自主迭代自己

真实产品运行会不断暴露 ProFlow 自己的缺口。Monitor 工程飞轮因此位于外层：

```text
观察真实 ProFlow
→ 找 first divergence
→ 修复 ProFlow
→ 重新验证
→ 回到原产品场景
```

它服务于 ProFlow 产品飞轮，但不是第四个 Product Agent，也不应该把“Chat 使用工程工具修 ProFlow”包装成“ProFlow 已经完全自主迭代自己”。

未来如果自我迭代继续推进，仍然需要保留目标、成本、权限、高风险动作和独立验收的人类边界。

## 两个飞轮是什么关系

ProFlow 的主角始终是产品迭代飞轮：

```text
产品目标
→ Task / Agent / Execution
→ 真实产品增量
→ Test / Acceptance
→ Product Review
→ 下一轮或收口
```

Monitor 位于外层，只负责发现并修复 ProFlow 自己的平台缺口，再把系统送回原产品场景：

```text
Monitor 工程飞轮
观察 ProFlow → 修复 → 验证 → 回原场景
                │
                ▼
ProFlow 产品飞轮
理解目标 → 编排 → 执行 → 验收 → 产品续轮
```

它们共享知识、模型算力、工程工具、浏览器、本机 Runtime、Git、Package、网络和真实用户环境，但职责不同。

## 这套系统最值得追问的几个设计取舍

第一，**为什么复用 ChatGPT，却不把 Task 和权限放在 ChatGPT 里？**

因为成熟 Host 值得复用，但长期产品事实必须自己拥有。详见 [02｜为什么选择 ChatGPT，又为什么必须拥有自己的 Control Plane](./02-为什么选择ChatGPT又为什么必须拥有自己的Control-Plane.md)。

第二，**为什么最后只保留少量长期 Agent Role？**

因为长期 Role 增加的是身份、权限、Conversation、恢复和验收空间，不是免费的“智力”。详见 [03｜多 Agent 如何从更多角色收敛成稳定协作系统](./03-多Agent如何从更多角色收敛成稳定协作系统.md)。

第三，**为什么 Browser Extension 不能成为 Workflow Engine？**

因为它负责不可替代的页面现实，但业务状态必须留在真正 Owner。详见 [04｜ProFlow 浏览器扩展如何驱动浏览器内各条流程](./04-ProFlow浏览器扩展如何驱动浏览器内各条流程.md)。

第四，**为什么 timeout 和重启会改变系统架构？**

因为真实副作用可能已经发生，恢复不能等价于重试。详见 [05｜ProFlow 怎样从一次跑通走向长期可运行的工程系统](./05-ProFlow怎样从一次跑通走向长期可运行的工程系统.md)。

第五，**为什么 AI 工程反而需要更严格的阶段门和证据？**

因为模型很擅长局部优化，更容易把一个局部 PASS 误当成整体完成。详见 [06｜ProFlow 如何用 AI 工程方法与实验治理控制复杂度](./06-ProFlow如何用AI工程方法与实验治理控制复杂度.md)。

第六，**为什么源码绿了以后还要继续追 Package、Registry、Workspace 和 Runtime？**

因为用户运行的是实际产物和实际进程，不是 Git diff。详见 [07｜ProFlow 如何从源码走到真实可运行产品](./07-ProFlow如何从源码走到真实可运行产品.md)。

## 当前进度不由这篇长期知识维护

正式知识应该解释稳定机制、失败和架构演进，不应该同时维护一份易变的项目进度表。

如果需要判断“ProFlow 今天到底做到哪里”，应该直接回到当前工程 Owner：

```text
repos/proflow/spec
→ 当前实施规范

repos/proflow/spec/.../CURRENT.md
→ 当前阶段 / 接力 / Gate 状态

Source / Test / Package / Runtime / Browser / External Reality
→ 当前实现和真实运行事实
```

本文中的历史 Phase、事故和验收只用于解释“为什么今天会这样设计”，不能覆盖新的 Source、Spec 或 Runtime Reality。

## 这组知识文章怎样和工程真源对应

ProFlow 长期区分三层来源：

```text
当前工程真源
= repos/proflow 的 Spec / Source / Test / Runtime / Owner Evidence

历史证据与决策档案
= 仍值得追溯的时间线、事故、Decision Episode、commit 锚点、反例与证据边界

正式知识文章
= 把当前真源和历史证据按技术问题重新提炼成长期可读的工程知识
```

“提炼”意味着合并重复、降低理解成本，不意味着删除失败路线、反例、取舍、证据和边界。

需要追问“这个判断为什么出现、哪次事故触发、当时有什么证据”时，进入 [ProFlow 历史证据与决策档案](./历史证据与决策档案.md)；需要判断“现在到底是什么”时，回到 `repos/proflow` 当前 Owner。

## 阅读地图

如果第一次接触 ProFlow，推荐先读 01，再按问题进入专题：

1. [01｜ProFlow 当前端到端 Journey：从产品目标到真实交付，再回到下一轮](./01-ProFlow是怎么一步步长出来的.md) —— 先建立五领域、Task / Worker / Execution、产品续轮和 Monitor 的整体运行模型。
2. [02｜为什么选择 ChatGPT，又为什么必须拥有自己的 Control Plane](./02-为什么选择ChatGPT又为什么必须拥有自己的Control-Plane.md) —— 看复用与自研边界、Carrier、Action 与 Authority。
3. [03｜多 Agent 如何从更多角色收敛成稳定协作系统](./03-多Agent如何从更多角色收敛成稳定协作系统.md) —— 看 Role / Worker / Conversation 身份与正式协作。
4. [04｜ProFlow 浏览器扩展如何驱动浏览器内各条流程](./04-ProFlow浏览器扩展如何驱动浏览器内各条流程.md) —— 看 Browser Driver 的多 Lane、Observation / Mutation 和现实回读。
5. [05｜ProFlow 怎样从一次跑通走向长期可运行的工程系统](./05-ProFlow怎样从一次跑通走向长期可运行的工程系统.md) —— 看 UNKNOWN、Recovery、Handoff、真实验收和长期续跑。
6. [06｜ProFlow 如何用 AI 工程方法与实验治理控制复杂度](./06-ProFlow如何用AI工程方法与实验治理控制复杂度.md) —— 看 Research、MVP、DDD / SDD / TDD、阶段 Gate 与停止条件。
7. [07｜ProFlow 如何从源码走到真实可运行产品](./07-ProFlow如何从源码走到真实可运行产品.md) —— 看 Module 自治、供应链真值、Runtime adoption 与模型能力验证。

如果继续追历史证据，再进入 [ProFlow 历史证据与决策档案](./历史证据与决策档案.md)。

> **ProFlow 最终追求的不是让 AI 做更多动作，而是让 AI 在真实复杂系统里长期工作时，决定权、现实、证据和恢复路径仍然清楚。**
