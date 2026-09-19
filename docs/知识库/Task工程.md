# Task 工程：怎样把目标冻结成可执行、可移交、可验证的长期任务

很多 Agent 系统在“小任务”阶段看起来都能工作：用户提需求，模型理解，调用工具，返回结果。但一旦任务跨多个小时、多个角色、多个 Workspace，甚至中间要等待、失败、重开或交接，单靠 Conversation 很快就不够了。

真正困难的不是“模型能不能继续说下去”，而是：**原始 Goal 怎样被收敛成一个长期存在的工作对象；谁可以改它；执行器到底被允许做什么；任务换人、换会话、换执行轮次以后，哪些东西必须保持不变；最后又凭什么宣布完成。**

这就是 Task Engineering（任务工程：把目标转化为可版本化、可执行、可恢复、可验收的长期工作单元，并用稳定合同约束规划、执行、移交和完成）的核心问题。

我们的实际方案可以先压成一条链：

~~~text
用户 Goal / Change / Incident / Recovery Request
        ↓
读取当前事实与约束
        ↓
Problem Framing
问题、目标状态、Scope、Non-scope、未知项
        ↓
Decision Tier
这是谁有权决定的问题？
        ↓
Plan Freeze
冻结目标、范围、依赖、验收与风险
        ↓
Task Decomposition
拆成可以独立推进和验收的工作单元
        ↓
Task Contract
Version / Scope / Role / Capability / Context
Approval / Acceptance / Evidence / Stop / Git Policy
        ↓
Execution Gate
执行前确认合同、现实、权限和验证都已成立
        ↓
Role / Worker Binding
        ↓
Execution Lane
Workspace / Worktree / Executor / Lease / Budget
        ↓
Result + Deterministic Evidence
        ↓
Semantic Review
        ↓
Handoff / Integration / Readback
        ↓
Task Owner 提交正式状态
        ↓
Complete / Reopen / Follow-up
~~~

ProFlow 后来真正稳定下来的不是某个固定 Task Schema，而是这条责任链：**模型负责理解、规划和判断；Task Owner 负责长期事实；执行器只能在冻结合同内行动；现实结果必须经过 Evidence 和 Owner 才能改变 Task Truth。**

在当前 ProFlow 的真实建模里，这套方案还进一步落到了具体对象上：一个 Task 保留总目标和长期身份，Product / Dev / Test 以受控 Node 承担不同阶段责任；TaskRoleBinding（任务角色绑定：把长期 Role 和这个 Task 中的固定 Worker 对应起来）保证 Chrome refresh、Extension reload 或 Node reopen 不会凭空创建第二个执行者；runNo 只表示新的执行轮次，不改变原 Task、Node 和长期责任。这样失败历史、恢复历史和当前执行可以同时成立，而不会因为 Conversation 或 Tab 改变就重建整个任务世界。

## Goal 不是 Task，Plan 也不是 Task

Task 工程最先要解决的，是把几种经常混在一起的对象分开。

用户说“把 ProFlow 的 Monitor 跑通”，这是一个 Goal（目标：希望最终出现什么结果）。Planner 进一步判断要先修 Browser observation、再恢复 Worker、最后做真实场景验收，这是 Plan（计划：怎样达到目标的当前决策路径）。真正进入执行以后，某个可独立推进、可验收、有稳定身份的工作单元才是 Task。

它们之间的关系更接近：

~~~text
Goal
→ 为什么做、最终希望出现什么

Plan
→ 当前认为应该怎样做

Task
→ 哪一块工作被正式承诺、由谁推进、怎样判断完成

Execution
→ 某个执行器针对某个 Task Version 的一次实际尝试

Session / Conversation
→ 承载某次认知或交互的宿主实例

Result
→ 一次 Execution 产出的结果

Evidence
→ 支撑某个完成声明的可重新检查事实
~~~

这几层如果不分开，长期运行很快就会产生假连续性。

例如 Conversation 还在，不代表 Task 没有换 Version；一次 Execution 成功，也不代表 Task 的所有 Acceptance 都已满足；Plan 中决定“后面需要部署”，也不等于当前 Task 已经获得发布权限。

ProFlow 后来把 Role、Worker、Conversation、Task、Node、run occurrence 分开，本质上也是在处理同一个问题：**运行载体可以变化，但长期责任和事实身份不能跟着页面一起漂。**

因此 Task 不应该被理解成“一段 Prompt”或“一次模型调用”。它更接近一个 Contract-backed State Object（由合同和状态支撑的长期工作对象）。

## 真正进入执行之前，先冻结问题和计划

很多 Agent 任务失败并不是执行能力不够，而是执行开始得太早。

如果 Problem Framing（问题框定：先明确当前问题、目标状态、范围、约束和未知项）还没有完成，模型很容易从“用户说了什么”直接跳到“我要改哪些文件”。这样做短任务可能碰巧成功，长任务则会把未确认假设变成后续所有角色共同依赖的伪事实。

因此在 Task 形成前，至少要回答：

~~~text
当前真正的问题是什么？
谁受影响？
希望最终出现什么可观察结果？
哪些事实已经确认？
哪些仍然未知？
Scope / Non-scope 是什么？
哪些变化会触发产品、架构或安全决策？
Acceptance 能否被真实观察？
~~~

接下来才进入 Plan Freeze（计划冻结：把已经确认的目标、范围、依赖、验收和风险固定为当前版本，执行阶段不允许靠口头临时扩张）。

Plan Freeze 不是说以后永远不能变，而是让变化有代价、有记录、有 Version。

~~~text
Plan v1
→ Executor 已开始工作
→ 用户新增一个会改变 Scope / Acceptance 的要求
→ 不能“顺手一起做”
→ 回到 Planner / Owner
→ 形成 Plan v2 / Task Version v2
→ 旧 Approval、旧 Lease、旧未集成结果重新校验
~~~

真正需要版本化的通常不是每一句解释，而是会改变执行世界的东西：

- Goal；
- Scope、Allowed、Forbidden；
- Source Commit 或关键 Input；
- Acceptance；
- Role / Permission；
- Git Operating Policy；
- 高风险 Target；
- Evidence Requirement；
- Stop Condition；
- 重要依赖和集成方式。

这也是为什么“边做边改需求”在 Agent 系统里风险比普通聊天高得多。人类开发者可能凭经验发现需求已变，模型则很容易继续沿用旧 Context 中看似仍然合理的约束。Task Version 是把这种变化从“聊天感觉”提升为正式事实。

## 不是所有变化都由 Executor 决定：先分清 Decision Tier

长期 Task 还需要解决一个经常被忽略的问题：执行过程中遇到新情况时，**谁有权决定下一步**。

如果所有未知都交给 Executor 自己补齐，Task Contract 再完整也会在运行中被慢慢改写。更稳定的做法是先按决策影响范围分层：

| 决策类型 | 典型问题 | 正确处理 |
|---|---|---|
| 无需新决策 | 已有规则已经唯一确定下一步 | 按合同继续执行 |
| 局部执行决策 | 实现顺序、局部算法、工具选择 | 在冻结 Scope / Acceptance 内由受权角色决定 |
| 架构决策 | 改变 Fact Owner、状态所有权、模块边界或 Adapter Contract | 回到架构 Owner，先改设计再继续 |
| 产品决策 | 改变用户、价值、产品范围或成功定义 | 回到 Product Owner |
| 高风险决策 | 权限、删除、生产写入、外部发布、重大成本 | 进入明确 Approval / Policy 边界 |

这个分层保护的是“局部自主”与“目标修改权”之间的边界。

例如 Dev 在冻结 Contract 内选择两个等价实现，不需要把每个函数命名都升级成产品决策；但如果实现过程中发现“只有把 Browser 重新变成 Task State Owner 才能继续”，这已经不是代码选择，而是在改变系统 Authority，必须 STOP 并回到架构层。

因此一个真正需要 Owner 裁决的 Decision Request，至少应该说明：

~~~text
当前要决定什么？
已经确认了哪些事实？
有哪些可行选项？
各自影响什么？
为什么当前 Task 无权自行选择？
如果现在不决定，会阻断什么？
~~~

决策记录最好还能保留被拒绝方案和适用范围。这样后续 Agent 才知道“方案 B 没采用”是因为当时被裁决，而不是因为上一轮忘了想到。

## Task Decomposition 的目标不是多拆，而是让每个边界都能被独立证明

Plan Freeze 以后还不能立刻把所有步骤都变成并行 Task。Task Decomposition（任务分解：把一个已确认计划拆成具有独立目标、依赖、验收和责任边界的工作单元）真正要优化的是**可验收性和责任清晰度**，不是 Task 数量。

一个好的 Task 通常满足：

1. 只有一个清晰主目标；
2. 完成以后可以独立判断对错；
3. 依赖可以用稳定对象或版本表达，而不是“等另一个 Chat 做完”；
4. 高不确定性的认知工作和确定性的机械执行尽量分开；
5. 高风险副作用和普通实现尽量分开；
6. 会修改共享 Canonical Asset 的工作尽量集中，避免多个并行窗口同时碰同一个 Owner；
7. 并行任务在拆分时就指定 Integration 责任，而不是最后才问“谁来合并”；
8. 无法真实验证的工作不能因为模型会生成结果，就伪装成可自动完成的 Task。

例如“大规模重构整个 Runtime”通常不是一个好 Task，因为它同时混合架构判断、源码修改、迁移、测试、发布和真实采用。更可控的拆法是先冻结一个可以独立证明的能力边界，再决定是否继续下一阶段。

~~~text
Goal
→ 建立新的长期执行能力

Plan
→ 先冻结 Contract
→ 再实现 Owner
→ 再迁移 Consumer
→ 再做真实 Adoption

Task A
→ Contract / Owner 语义成立

Task B
→ 当前 Consumer 切换并通过验证

Task C
→ 真实 Runtime Adoption

Integration
→ 共同基线和最终 Acceptance
~~~

这里不意味着“每个阶段都必须新建一个 Task”。如果几个步骤共享同一个 Owner、同一 Workspace、同一验收，而且拆开只会增加 Handoff，它们更适合留在一个 Task 内作为 Node 或 Stage。

ProFlow 的 Product / Dev / Test 就体现了这种取舍：它们承担不同认知与验收责任，但仍围绕同一个 Task 身份协作，而不是把同一目标拆成三个互不相关的 Task。

**Task Decomposition 的尺度最终由独立责任、独立风险和独立验收决定，不由流程图看起来有几步决定。**

## Task Contract 不是字段越多越好，而是让执行器没有必要猜

旧平台曾经把 Task Contract 设计成很完整的 Schema。长期来看，真正稳定的价值不在字段数量，而在一个原则：

> **执行器不应该靠猜测补全影响结果、权限或完成判定的关键条件。**

一个成熟 Task 至少要能表达下面几类信息：

| 责任 | Task 需要明确什么 |
|---|---|
| Goal | 完成后应出现什么结果 |
| Scope | 哪些对象属于本任务，哪些明确不属于 |
| Action Boundary | Allowed / Forbidden，什么能做、什么不能做 |
| Input | 使用哪个 Source、版本、文件、外部对象 |
| Dependency | 哪些前置必须先成立 |
| Role | 谁负责规划、执行、Review、集成或批准 |
| Capability | 本轮允许使用哪些真实能力 |
| Context | 当前角色需要读取哪些 Owner |
| Acceptance | 怎样观察“做到” |
| Evidence | 完成声明必须附带什么证据 |
| Approval | 哪些动作到哪一步必须重新获得授权 |
| Stop Condition | 哪些情况必须暂停、阻断或重新规划 |
| Git Policy | Branch / Worktree / Commit / Push 等操作边界 |
| Budget | 时间、成本、Token、重试和资源上限 |
| Output Contract | 当前角色必须交付什么结果 |

这类合同的价值，在我们的本机工程流程里已经反复出现。

例如一个工程 Task 如果只写“修复这几个文件”，但没有说明能不能 Commit、能不能 Push、是否允许新建 Worktree、能不能清掉用户已有 WIP，执行器就必须猜。模型越强，这种“善意补全”反而越危险。

所以 Guidance Tier（指导细度：任务说明要写到多细）和 Execution Authority（执行授权：执行器实际可以做什么）必须分开。

~~~text
说明很详细
≠
权限很大

说明很简短
≠
权限很小
~~~

一个完全冻结的 Whole-file bundle 可以几乎不需要执行器做语义判断，但依然可能没有 Push 权限；一个复杂架构调查需要很强的推理指导，但也可以保持只读。

**模型能力不能自动扩大 Authority。**

## Execution Gate 决定的是“现在有没有资格开始”，不是“有没有人愿意继续做”

Task Contract 已经存在，也不意味着可以立刻执行。真正进入可写执行以前，还需要 Execution Gate（执行门：对 Task Version、现实环境、权限和验证条件做最后一次前置确认）。

至少要确认：

~~~text
Task ID / Version 明确
Source Commit / Input 可定位
Scope / Allowed / Forbidden 明确
Git Operating Policy 已知
所需 Context 可读取且没有明显过期
Capability / Tool 当前可用
需要的 Approval 已满足，或尚未到审批点
Acceptance / Evidence 要求可执行
Workspace / Worktree 状态可解释
Budget / Timeout / Retry / Stop Condition 已知
~~~

这里任何一项关键条件失败，都不应该由 Executor “降低标准以后继续”。

正确结果可能是：

~~~text
BLOCKED
→ 关键依赖或事实缺失

WAITING
→ 等待 Approval / 外部事件 / 资源

REPLAN
→ 发现当前 Task Version 已经不再适用

READY
→ 只有这时才允许进入写执行
~~~

这条 Gate 在 AI 工程里尤其重要，因为强模型很擅长在条件不完整时主动补方案。它会让系统“看起来没有卡住”，但代价是执行器开始替 Planner、架构 Owner 或用户承担未授权决策。

预算同样属于 Gate。达到时间、重试、Token 或成本边界以后，正确动作是暂停或重新规划，而不是为了继续完成而偷偷降低验证要求。

## Role、Worker 和 Execution 是不同层，Task 才是协作的共同对象

多角色协作最容易退化成“多个 Agent 相互发消息”。真正可恢复的协作不能把 Conversation 当成共享状态。

在 ProFlow 里，长期 Role（角色：稳定责任定义）和 Task-bound Worker（绑定到具体 Task 的执行者身份）被刻意分开。Conversation 是 Worker 的交互载体，Browser Tab 更只是 Locator。真正跨这些载体持续存在的是 Task、Node、Binding、Requirement、Test Result 和 Execution occurrence。

这意味着：

~~~text
Role
→ 我长期负责什么

Task-bound Worker
→ 在这个 Task 中由谁承担该责任

Conversation
→ 当前通过哪个宿主会话工作

Execution / runNo
→ 这一次具体执行轮次
~~~

Node reopen 是一个很好的例子。失败以后重新做，并不需要创建第二个 Task，也不应该创建第二套 Product / Dev / Test Worker。原 Task、原 Node 和原 Role Binding 继续存在，只是进入新的 execution occurrence。

这条设计保护了两件事：

1. 旧失败历史仍然存在；
2. 新一轮执行不会被伪装成“第一次”。

因此 Handoff（移交：一个责任主体把某个 Task Version 下的明确工作状态交给另一个主体）也不能只是“我做到这里，你继续”。

一个可靠 Handoff 至少要让接收方重新建立：

~~~text
Task ID / Version
当前 Goal / Scope
Source / Workspace
已完成与未完成
当前 Execution Point
Artifact / Evidence
已确认 Side Effect
当前风险与 Blocker
下一动作
继续条件
~~~

真正进入多执行者场景后，最好还要有 Receipt（移交回执：接收方明确 Accept、Reject 或要求补充），否则“消息发出去了”和“责任已经转移”是两回事。

但这里也不能反向过度设计。局部 ask / reply 不需要每次升级成 Task Handoff；只有责任、状态、输入或继续权真的发生转移时，才值得使用正式 Handoff。

## Execution Lane 把“谁来做”进一步收敛成“在哪里、以什么现实边界做”

Task Contract 约束语义，Execution Lane（执行通道：把某个 Task Version 和具体 Executor、Workspace、权限及资源边界绑定起来的运行单元）约束现实。

一个可写 Execution 至少要知道：

~~~text
Task / Version
Executor
Workspace / Worktree
Branch / Source Commit
Scope
Permission / Secret ref
Lease
Environment / Tool version
Budget
Result / Log / Side-effect destination
~~~

这不是为了制造一个复杂 Lane Registry，而是解决真实并行问题。

如果两个 Worker 同时修改一个共享 Workspace，即使它们各自理解的 Scope 不冲突，也可能因为 untracked 文件、依赖安装、生成产物、Git Index 或同一外部资源而互相污染。

所以“可以并行”不能从“两个 Task 看起来互不相关”推出。至少要同时判断：

~~~text
依赖是否已满足？
Write Set 是否冲突？
Git Ref 是否冲突？
外部资源是否冲突？
端口 / Runtime 是否冲突？
是否有隔离 Workspace？
谁负责最终 Integration？
~~~

在我们当前 Chat 本机工程实践里，这个原则已经进一步收敛成：多个并行工程分支应有独立 Worktree / Owner；共享 Context、导航或正式知识的最终修改，则在共同最新基线上由一个明确 Integrator 收口。

这比“让更多 Agent 同时工作”更重要。Multi-Agent 的吞吐收益只有在**隔离 + 汇合**同时成立时才真实存在。

Executor 的选择也不应该永久绑定品牌。更稳定的路由依据是任务的不确定性、风险、Capability、成本、时间和验证方式：强模型承担高不确定性判断，Script / Automation 承担确定性机械动作，本机或 Browser Executor 承担真实副作用。ChatGPT、Codex 或某个 Provider 只是当前实现实例，不应该成为 Task Role 的语义本身。详细 Routing 机制仍由长期任务和复杂度边界文章承担，这里只保留 Task 对 Executor 的选择约束。

## Result、确定性验证、语义复审和 Completion 必须分层

一次 Execution 返回 exit code 0，只能证明那次命令成功；一个 Agent 说“代码已经改好了”，只能说明它形成了这个判断。

Task Completion（任务完成）必须回答的是更强的问题：

> 当前 Task Version 的所有 Required Acceptance 是否已经由足够 Evidence 支撑，而且真实副作用、集成和剩余边界都已经处理？

因此至少要分四层：

~~~text
Executor
→ Result

Deterministic Validator
→ Test / Typecheck / Schema / Diff / Hash / API Readback 等可重复证明

Semantic Reviewer
→ Goal / Scope / Fact Strength / Architecture / Safety / Limitation 是否仍成立

Task Owner
→ 根据 Acceptance 和 Evidence 提交正式 Task State
~~~

Deterministic Validation（确定性验证：同一输入下可以稳定重复判断的机器证明）适合回答“这个明确条件是否成立”；Semantic Review（语义复审：重新检查成果是否仍满足真实目标、边界和事实关系）负责机器证明覆盖不到的问题。

一个 Reviewer 不应该只读 Executor 摘要，而应该尽量回到真实 Artifact 与 Evidence，至少检查：

- Goal 与成果是否一致；
- 有没有越过 Scope；
- Current Fact、Target Design、Inference 是否被混写；
- 是否改变了 Owner、状态机或跨模块 Contract；
- 安全、权限和副作用是否仍在允许边界；
- Registry、Context、Migration、Release 等关联现实是否需要一起处理；
- 限制和未完成项有没有被诚实保留。

语义复审的结果也不只有 PASS / FAIL：

~~~text
Accept
→ 可以进入 Completion

Accept with Follow-up
→ 当前任务可完成，但形成独立后续项

Request Changes
→ 回到当前 Task 的 Repair / Implementation

Reject / Replan
→ 当前 Plan 或 Task Version 本身不再成立
~~~

例如代码测试全部 PASS，如果用户真正需要的是一个浏览器 Journey 可用，那么代码 Gate 只能证明 Source / Build 层；Browser Reality 仍然必须独立验证。反过来，Browser 看起来成功，也不能替代 Git Diff、测试和正式 Artifact 的事实。

ProFlow 的 Product / Dev / Test 长期角色，本质上也不是为了模仿真实公司组织，而是把不同完成判断拆开：Dev 可以提出实现完成，Test 需要依据正式 Acceptance 和真实 Evidence 做独立验证，Task Owner 再根据状态规则推进。

所以“完成”不是一个自然语言形容词，而是一条 Owner-backed transition（由事实所有者提交的状态迁移）。

真正 Closeout（收口：把 Task 的最终状态和可追溯事实固定下来）还应留下：

~~~text
最终状态
接受的 Result
满足的 Acceptance
关键 Evidence
Side-effect / External Readback
Release / Migration / Projection 状态
未完成项与 Follow-up Task
需要反馈给 Context / Knowledge 的候选经验
最终 Source Commit / Artifact Version
~~~

这样下一个 Agent 接手时，不需要从聊天记录推断“这个任务到底怎么结束的”。

## Failure、WAITING 和 Reopen 不应该破坏 Task 身份

长期 Task 一定会遇到等待、失败和中断。

这些情况的详细恢复机制已经由《长期 Agent 怎样安全执行和恢复》和《一次回答怎样变成长期任务》承担，这里只保留它们对 Task Contract 的影响。

第一，WAITING 是合法状态，不是“模型卡住了”。Task 可能等待 Approval、外部 Job、另一个 Node、用户决定或真实资源恢复。等待期间应该释放不必要的执行资源，而不是让 Agent 用轮询维持一种“看起来还活着”的假执行。

第二，Timeout 不应该直接把业务 Effect 写成 FAILED。对有副作用的动作，真实结果可能已经发生，必须先 Reconciliation，再决定 Resume、Retry、Reopen 或人工处理。

第三，Reopen 应该保留 Task Identity。

~~~text
同一个 Task / Node
旧 run = FAILED
        ↓
确认失败原因与当前 Reality
        ↓
reopen
        ↓
new runNo / new occurrence
        ↓
复用原长期责任与 binding
        ↓
重新读取最新 Context / Evidence
~~~

如果每次失败都新建 Task，系统会丢掉已经发生的 Effect 身份、原 Acceptance、历史 Evidence 和责任归属。

Cancel / Terminate、Deadline、Retry / Fallback 等完整生命周期已经由现有长期任务 Owner 说明，这里不再复制。Task 工程只坚持一个边界：**恢复、取消或强制终止都不能通过创建第二个任务世界来逃避原来的身份、Evidence 和副作用历史。**

这也是“Task 长期存在”真正比“Conversation 长期存在”更有价值的地方：Conversation 可以消失，Task 仍然可以从正式事实恢复。

## 并行最终不是多开几个 Worker，而是把依赖和集成变成正式设计

旧 ARC-016 曾经用 MVP-0～MVP-7 描述平台能力依赖。具体路线已经属于历史，但其中一个长期判断仍然成立：

**并行能力必须晚于身份、Version、Evidence、隔离和冲突治理。**

如果 Task 本身还没有稳定 Version，多执行者就不知道自己基于哪一版输入；如果 Evidence 不能按 Task / Execution 分离，最终结果就无法验收；如果没有 Workspace 隔离，并行只是更快地产生冲突。

一个真正可并行的 Task Group 至少需要：

~~~text
Dependency Graph
        ↓
可运行 Task
        ↓
冻结 Version / Scope / Acceptance
        ↓
独立 Execution Lane
        ↓
各自产出 Result / Evidence
        ↓
Integrator
        ↓
Conflict Resolution
        ↓
Integrated Result
        ↓
集成后重新验证
        ↓
Reality Readback
~~~

Integrator（集成者：负责把多个已通过局部验证的结果在共同现实中合并并重新验证）也是一个经常被忽略的角色。

两个分支各自测试通过，只能证明两个局部世界成立。合并以后依赖、类型、配置、路由、文档和运行现实都可能产生新的问题。因此 Integration 自己必须拥有 Acceptance，而不是把两个 PASS 简单相加。

集成完成以后还要回读真正被改变的 Owner。Git 场景至少要重新确认当前 Branch / Commit、Worktree / Index / Untracked，以及如果发生了 Push / Merge，Remote SHA 是否真的对应本地结论；Package、Release、Projection 或 Runtime 场景也要分别回到 Registry、Installed Workspace、Runtime 或真实消费端确认。**本地 Integration 成功，不等于目标系统已经采用。**

这也说明为什么多任务并行不应该被当成默认性能优化。**只有当任务切分稳定、隔离成本小于串行等待，而且集成责任和最终 Readback 都清楚时，并行才真正降低总成本。**

## Task 工程最终保护的是“长期意图不被执行过程偷偷改写”

把整条链压缩以后，Task Engineering 的核心不是 Task Store、状态枚举或 Workflow Engine，而是几个稳定不变量：

~~~text
Goal 先于 Task
Plan 先冻结，再执行
Decision Tier 决定谁有权改变什么
Task 有稳定 Identity 和 Version
执行器不拥有目标修改权
Scope / Authority / Acceptance 不靠模型猜
Task 拆分服从独立责任、风险和验收
Execution Gate 不通过就不写执行
Role 与 Worker / Session / Execution 分层
可写执行绑定明确 Workspace / Lane
Handoff 转移责任，不复制聊天
Result 不等于 Evidence
确定性验证不等于语义复审
Evidence 不自动等于 Completion
Task Owner 才提交正式状态
失败和 reopen 不制造第二个任务世界
并行必须有隔离、依赖、Integration 和 Readback
~~~

这些不变量可以由不同 Runtime 实现，不要求先建设通用 Workflow Engine，也不要求所有项目都拥有持久 Task。

如果任务天然短小、一次 Session 可以安全完成、失败可以整体重跑，就没有必要购买这套复杂度。只有当目标开始跨 Session、跨角色、等待外部事件、产生不可忽略的副作用、需要正式恢复或独立验收时，Task 才从“一个待办事项”升级成真正的工程对象。

ProFlow 已经走到了这一步，所以它需要 Task / Node / Worker Binding / State / Reopen。ChatWeb 的普通产品开发却不需要把每一个小 UI 改动都塞进同一套产品 Task Runtime。

这也是我们现在对 Task 工程最重要的边界判断：

> **不是所有工作都应该被 Task 化；但一旦一项工作必须长期存在，Task 就应该比任何一次 Conversation 更可信。**
