# 什么时候应该拆 Subagent，怎样委派和交接

主 Agent 的 Context 越来越大时，最直觉的办法是“再开几个 Agent”。但如果它们复制同一份上下文、使用同一权限、写同一批文件，最后还要由主 Agent 全部重读，系统只是把一个复杂任务变成更多通信和 Token。

真正值得拆 Subagent（子智能体）的理由不是“角色更多”，而是**局部责任和 Context 可以被清楚隔离，并且结果可以独立验收。**

## Subagent 首先解决 Context / Responsibility Isolation

Context Isolation（上下文隔离）让 Child 只看到完成局部任务所需的信息，不必携带 Parent 的全部历史。

Responsibility Isolation（责任隔离）要求 Child 有明确问题、Scope、交付物和停止条件。

例如：

~~~text
Parent Task：完成一次跨模块重构
├─ Child A：只分析认证模块 blast radius
├─ Child B：只审计迁移脚本风险
└─ Parent：整合方案、做最终修改和验收
~~~

如果 Child 没有独立可验收结果，“帮我一起想想”通常不值得做成 Subagent。

## Task-scoped Subagent 和 Independent Agent 不同

Task-scoped Subagent（任务级子智能体）通常随 Child Task 创建和结束，身份和权限来自 Parent 的委派。

Independent Agent（独立智能体）则可能跨任务长期存在，拥有自己的 Identity、State、Permission 或 Responsibility Domain。

| 维度 | Task-scoped Subagent | Independent Agent |
|---|---|---|
| 生命周期 | 跟随当前 Child Task | 可跨多个 Task |
| Goal | Parent 委派的局部目标 | 自己拥有稳定责任域 |
| Identity | 常继承或收窄 | 独立身份 |
| State | 多由 Parent Runtime 管理 | 可有独立 State |
| Permission | 不超过 Parent 授权 | 可拥有独立权限边界 |
| Registry / Discovery | 通常不需要 | 可能需要 |

运行在不同进程、不同模型，不足以证明它是 Independent Agent。责任语义比部署形态更重要。

独立 Agent 的组织拓扑、Registry 和 A2A 由下一篇负责；这一篇只处理 Parent / Child 责任怎样拆出去、怎样回来。

## 一个好的 Subtask Contract 应该写什么

Parent 不能只发一句“研究一下这个问题”。

一个最小 Subtask Contract（子任务合同）至少包括：

~~~text
objective
scope / allowed sources
constraints
expected artifact / output
required evidence
budget / deadline
parent task identity
write permission
~~~

这会同时解决两件事：Child 不用猜责任，Parent 也能明确验收。

## 委派预算也应该继承或收窄

Budget 不只是 Token。Parent 把工作交给 Child 时，还要决定 Child 可以使用多少：

- 模型轮次；
- Tool 调用；
- Wall Time；
- 外部 API 费用；
- 并行 Worker；
- 可写范围；
- 高风险动作权限。

安全默认是：

~~~text
child budget
≤ delegated parent budget

child permission
≤ delegated parent permission
~~~

如果 Child 可以自行扩大预算或权限，Delegation 就会变成责任失控。

## Parent 不能把最终责任一起委派掉

Delegation（委派）意味着 Parent 把局部责任交给 Child，但 Parent 仍然对总体 Outcome 负责。

Child 可以提交：

> “认证模块调用链已完成分析，结果见 artifact A，证据见 refs X/Y。”

Parent 仍然要判断：这是否满足 Subtask Contract、是否覆盖总体 Goal、是否与其他 Child 冲突、能否接受为正式输入。

Child 的 COMPLETED 只证明局部执行结束，不等于 Parent Task 已成功。

## Child Completion 需要 Acceptance

Child 返回 COMPLETED 后，Parent 不应该无条件把结果并入 Current Truth。

更完整的链路是：

~~~text
Child COMPLETED
↓
result / artifact / evidence available
↓
Parent validates subtask contract
├─ ACCEPT
│  → merge into parent state
├─ NEEDS_REVISION
│  → reopen / delegate correction
└─ REJECT
   → discard / replan
~~~

Acceptance（接收验收：Parent 判断 Child 是否真正满足委派合同）把“Child 自己宣布完成”和“Parent 正式接受结果”分开。

## Collaboration、Delegation、Handoff 的 Owner 变化不同

这三个词经常被混用。

~~~text
Collaboration
→ 借用能力 / 信息，当前 Owner 不变

Delegation
→ 拆出局部 Child responsibility，Parent 保留总体责任

Handoff
→ 同一个责任对象的 Owner 正式转移
~~~

Handoff 最重，因为它改变长期 Ownership。

实践里通常优先：

~~~text
Collaboration → Delegation → Handoff
~~~

能不转移 Owner，就不要频繁交接。

## Handoff 不是发一段摘要，而是状态转换

真正的 Handoff 至少需要：

~~~text
current owner
new owner
exact task / state version
current goal
completed / pending work
artifact refs
evidence refs
open risks
allowed actions
success criteria
~~~

旧 Owner 提出 Handoff，新 Owner 接受确切 Version 后，Control Plane 才正式更新 Owner。

例如：

~~~text
owner=A, version=7
↓ handoff proposed to B
↓ B accepts version 7
owner=B, version=8
~~~

此后 A 的迟到写入即使执行成功，也应该被拒绝为 STALE_OWNER / STALE_VERSION，不能覆盖 B 已经推进的新状态。

## Handoff 最危险的是双 Owner 或无人 Owner

如果 A 发出 Handoff 以后就立即停止，但 B 没有成功接收，Task 会无人负责。

如果 A 和 B 同时认为自己已经接管，Task 又会出现双写。

因此 Handoff 最好是明确握手：

~~~text
A proposes transfer
↓
B reads exact task version
↓
B accepts
↓
Control Plane atomically commits new owner / version
↓
A loses write authority
~~~

在 Commit 完成之前，谁拥有责任必须有唯一答案。

## Shared State 不等于“大家都能写”

Shared State（共享状态）表示多个参与者必须共同承认的当前 Task Truth，例如 Owner、Plan Version、Approval、Confirmed Effect。

共享可见不等于共享写权限。

系统最好明确 State Owner，并使用 Optimistic Versioning 或 Compare-and-set：写入只有在当前 Version 仍等于预期版本时成功，否则返回冲突。

关键写入还应记录 Actor、Reason、Evidence 和 Previous Version。

## Private Context 可以有 Hypothesis，但不能污染 Shared Truth

Private Context（私有上下文）可以包含：

- 候选方案；
- 未验证 Hypothesis；
- 临时草稿；
- 局部 Observation。

这些内容不需要全部广播给其他 Agent。

如果要进入 Shared State，应经过 Information Funnel（信息漏斗）：

~~~text
private observation / hypothesis
↓ local validation
finding + evidence
↓ owner review / transition
shared fact / decision
~~~

一个 Hypothesis 被三个 Agent 重复，不会自动变成 Fact。

## Handoff Context 应该最小但可接管

Handoff Context（交接上下文）不是复制发送方全部 Memory / History，而是让新 Owner 能安全接手的最小充分包。

优先传稳定引用：

~~~text
task_id
state_version
artifact_ref
commit_sha
evidence_ref
pending_work
~~~

需要细节时，新 Owner 再按权限读取原始对象。

这比复制几十页 Conversation 更省 Context，也更不容易携带过期状态。

## 异步 Child 真正同步的是 Event

Parent 和 Child 不需要两个模型常驻对话。Child 状态变化通过 Runtime Event 回来：

~~~text
child_task_id
parent_task_id
status
state_version
result_ref
evidence_refs
error_class
requires_parent_action
~~~

只有 BLOCKED、NEEDS_DECISION、COMPLETED、FAILED 等会影响 Parent 下一步的语义事件，才有必要唤醒 Parent 重新决策。

普通进度可以只是状态更新，不必每次调用模型。

## Fan-out / Fan-in 必须有 Merge Contract

Fan-out（扇出：Parent 把多个独立分片并行交给多个 Child）只有在最后能明确合并时才值得。

~~~text
100 files
↓ fan-out
Child 1..10 scan separate ranges
↓
structured findings
↓ fan-in
Parent merge by file + rule + evidence
~~~

Merge Contract（合并合同：规定多个 Child 的结果如何去重、冲突处理和形成 Parent 输入）至少要说明：

- key / identity；
- conflict rule；
- duplicate rule；
- required evidence；
- missing result behavior。

如果最后只能让 Parent 阅读 10 篇长报告自己“综合一下”，并行节省的时间很可能被 Merge 成本吃掉。

## 并行只有在依赖和 Write Set 可隔离时才有价值

Subagent 并行前至少检查：

- 输入是否独立；
- B 是否依赖 A 的精确输出；
- Write Set 是否重叠；
- 是否争用同一浏览器、设备、账号；
- 中间结果是否会改变后续 Scope。

Write Set（写集合：一个 Child 被允许修改的对象集合）可以按文件、模块、业务对象或资源 Scope 表达。

~~~text
Child A → src/auth/**
Child B → docs/**
~~~

如果两个 Child 的 Write Set 开始重叠：

~~~text
stop parallel mutation
→ choose owner / serialization
→ or create explicit merge stage
~~~

不要等 Git 冲突出现以后才发现两个 Agent 一直在修改同一责任。

## Child Cancellation 也需要传播语义

Parent 被取消以后，Child 不一定能瞬间终止。

~~~text
cancel requested
→ stop new work
→ cancel queued children
→ request running children stop at safe point
→ reconcile already-started effects
→ collect final evidence
~~~

如果 Child 正在执行不可逆副作用，Parent 的“取消”不能让这个现实动作自动消失。

## 什么时候不要拆 Subagent

这些场景通常保持单 Agent 更好：

- 一次 Tool 调用；
- 一个确定性函数；
- 连续推理高度共享同一 Context；
- Child 结果无法独立验收；
- 任务 Write Set 高度耦合；
- Parent 最终必须完整重做 Child 工作才能相信结果。

Subagent 不是为了让架构图更像团队组织。

## ProFlow 的角色演进说明固定责任往往已经足够

ProFlow 长期保留 Product / Dev / Test 等明确角色和 Worker Binding，而没有因为出现多个角色就无限扩展动态 Agent Discovery。

真实复杂度主要来自 Task、Node、Binding、Browser Reality、WAITING / FAILED / REOPEN 和交接，而不是缺更多角色。

固定责任 + 正式 Task State 已经能解决的问题，不需要为了 Multi-Agent 叙事继续拆。

## Subagent 真正成立的条件

一个 Subagent 值得存在，至少同时满足几件事中的大部分：

~~~text
local responsibility is clear
+ context can be isolated
+ permission / model can be bounded
+ result can be independently accepted
+ write / resource conflict is manageable
+ parent gains real time or context savings
~~~

Parent 保留总责任；Delegation 只拆局部责任；Handoff 才转移同一个 Task 的 Owner；Shared State 必须有 Owner / Version / Evidence；Private Context 里的 Hypothesis 不能直接覆盖共同真值。

如果这些条件不成立，继续用单 Agent、Tool、Skill 或 Workflow 往往更简单。

下一篇继续向外扩：当多个真正独立的责任主体长期存在以后，组织拓扑、Registry、A2A 和协调成本怎样进入系统。
