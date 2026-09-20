# Agent 项目治理：怎样从 Task 事实形成阶段基线，而不是靠进度汇报

长期 Agent 项目最容易出现一种“看起来很透明、实际上很模糊”的状态：每天都有进度、测试不断变绿、提交持续增加、Agent 也能解释自己做了什么，但当你追问“这个阶段到底完成了吗”“现在用户真实跑到哪一版”“还有哪些 blocker”“为什么可以进入下一阶段”，回答却开始依赖聊天记忆和个人判断。

问题不在于汇报写得不够详细，而在于 **Task State（单个任务状态）和 Project State（项目整体状态）不是同一种事实。**

一个 Task 成功，只能证明这个工作单元完成；一组源码测试 PASS，只能证明当前 Source 层满足对应测试；一次发布命令返回成功，也不能自动证明 Registry、Installed Workspace 和 Runtime 已经采用。项目要宣布一个阶段完成，必须把多个 Owner 的事实重新聚合，再通过 Stage Gate（阶段门：只有满足当前阶段冻结条件和证据要求，才允许进入下一阶段）形成新的 Baseline（基线：某个时间点经过确认、以后可以共同引用的项目事实快照）。

我们的实际方案可以先压成：

~~~text
Reporting Window
时间 / Branch / Commit / Task / Release / Migration 范围
        +
Git / Source
Task / Node
Test / Evidence
Package / Registry
Installed Workspace
Runtime / Browser / External Readback
        ↓
按 Owner 核对当前 Reality
        ↓
Project State
completed / in_progress / blocked / planned / placeholder / unknown
        ↓
区分
Drift / Gap / Issue / Risk / Dependency
        ↓
Decision Request（必要时）
        ↓
Phase Review
阶段目标、必需资产、证据、未关闭 blocker
        ↓
Stage Gate
        ↓
Baseline Candidate
        ↓
Owner / Reviewer 确认
        ↓
Baseline Freeze
        ↓
Context / Roadmap Update Candidate
        ↓
下一阶段
~~~

这套治理的核心不是“项目多一个 Dashboard”，而是：**任何阶段结论都必须能回到具体版本、Task、Evidence 和现实回读；摘要可以改变表达方式，但不能改变底层事实。**

## Task State 回答“这个工作单元在哪”，Project State 回答“这个阶段真正形成了什么”

Task Engineering 解决的是一个 Goal 怎样变成长期可执行对象。项目治理面对的是更高一层的问题：多个 Task、多个 Artifact、多个 Runtime Reality 叠在一起以后，项目整体应该如何判断。

两者不能直接等价。

~~~text
Task A = succeeded
Task B = succeeded
Task C = blocked

≠

Project = 66% complete
~~~

除非项目已经提前定义这三个 Task 就是完整分母，而且它们的重要性、依赖、证据和阶段关系完全相同，否则“2 / 3 = 66%”只是算术，不是 Project State。

同样，一个关键 Task FAILED，也不一定等于整个项目 FAILED。它可能有替代方案，也可能只阻断下一阶段而不影响已经冻结的上一阶段能力。

所以 Project State 更接近：

~~~text
这个阶段想建立什么能力？
哪些正式资产已经形成？
哪些真实路径已经被证明？
哪些必须条件还没成立？
哪些事实存在 Drift？
哪些 blocker 会阻止下一阶段？
当前哪些结论可以被冻结为新 Baseline？
~~~

这也是为什么用户经常问“整体进度是多少”时，真正有价值的回答不应该只有一个百分比。百分比可以作为沟通层估计，但下面必须有阶段分母和事实来源。

例如：

~~~text
Phase 目标：真实 Deployment 可采用

Source / Tests       PASS
Package              PASS
Registry             PASS
Fresh Install        PASS
Runtime Adoption     PENDING

→ 不能因为前四项都通过就写“100% 完成”
→ 更准确的 Project State 是：
   工程产物已完成，真实采用 Gate 未关闭
~~~

ProFlow 从源码走到真实运行的历史反复证明：**上游事实通过，不能冒充下游现实成立。**

## “当前进度”必须先固定 Reporting Window，否则今天和昨天会被写进同一份现实

Project Status（项目状态报告：对一个明确范围内的多个事实 Owner 做聚合后的治理视图）必须有时间和版本边界。

至少要知道：

~~~text
Reporting Window
├── 起止时间
├── Branch
├── 起始 / 结束 Commit
├── 涉及 Task / Node
├── Release / Migration
├── 当前 Phase / Capability Scope
├── 外部依赖
└── 报告受众
~~~

“最近”“当前”“这一阶段”如果没有这些边界，很容易把历史证据混进现在。

例如上周某个 Runtime Acceptance 通过过，并不能证明今天当前安装版本仍然通过；上一轮 Browser 截图证明页面可用，也不能证明 Extension reload 后的新实例已经采用；某次模型 Capability probe 成功，也不能在 Provider inventory 变化以后永久作为 READY 证据。

所以 Project Governance 的第一动作不是生成摘要，而是**冻结观察窗口**。

这和 Context Engineering 的 Freshness 有关系，但职责不同：Context Engineering 决定这一轮 Agent 应该看到什么；Project Governance 决定这一时间窗口里哪些事实有资格组成项目状态。

## 项目状态不是一个大字段，而是一组来自不同 Owner 的事实

一个复杂 Agent 项目没有单一数据库可以天然回答“现在一切怎样”。

不同事实仍然归不同 Owner：

| 问题 | 应回到哪里 |
|---|---|
| 当前源码是什么 | Git / Source |
| Task / Node 现在是什么状态 | Task Owner / Runtime |
| 测试是否通过 | Test Runner / CI / Evidence |
| Package 是否真的可消费 | Packaged Artifact / Isolated Consumer |
| Registry 是否已有 exact version | Registry readback |
| Fresh Workspace 实际安装什么 | Installed Workspace |
| Runtime 是否采用新字节 | Current Process / Runtime Status |
| Browser 用户路径是否真实成立 | Browser Reality |
| 外部资源是否已经创建或更新 | 对应 SaaS / API Readback |
| 正式知识或 Spec 当前说什么 | 正式 Owner 文档 |
| 下一阶段是否授权 | Project Owner / Stage Decision |

Project State 的职责是**聚合这些 Owner，而不是取代它们。**

因此一个项目状态系统最好保存引用和结论，而不是复制所有底层事实。否则 Project Dashboard 自己又会变成第二真源。

~~~text
Task Owner says READY
Runtime says old process still running
Browser says old behavior

→ Project State 不能选一个最好看的值
→ 应记录 Reality Drift
→ 当前能力仍不能升级为 adopted
~~~

ProFlow 的 Deployment 演进已经验证过同样的教训：中央 Platform 一度保存各 Module 的配置和 READY 判断，最后因为复制 Module Reality 而被削薄。项目治理也必须避免同样错误。

**Governance aggregates truth; it does not own every truth.**

## completed、planned 和 unknown 必须能被看出区别

长期项目最危险的状态不是失败，而是把不同事实强度全部写成“进行中”。

至少应区分：

| 状态 | 含义 |
|---|---|
| completed | 当前阶段要求已经满足，并进入正式基线 |
| in_progress | 有有效 Task / Execution 正在推进 |
| blocked | 已知阻塞存在，而且解除条件明确 |
| planned | 已接受进入 Roadmap，但尚未成为可执行 Task |
| placeholder | 架构中保留位置，当前尚未承诺实现 |
| superseded | 已被新的正式方案取代 |
| retired | 已退出当前体系并完成关闭 |
| unknown | 证据不足，不能安全判断 |

这里最重要的是 unknown。

如果没有 unknown，Agent 和项目报告就会被迫把信息不足翻译成“应该差不多”“预计已经”“大概是旧版本”，最终把不确定性伪装成状态。

同样，accepted、planned、implemented、verified、released、adopted 也不能混在一起。

~~~text
Accepted
→ 决定做

Planned
→ 已进入后续路线，但尚未变成当前执行事实

Implemented
→ Source 已经存在

Verified
→ 对应 Gate 有证据

Released
→ 版本进入正式分发

Adopted
→ 当前真实消费环境已经采用
~~~

一条能力可能同时是：

~~~text
设计 accepted
后续 planned
源码 implemented
测试 verified
包 released
当前 Runtime NOT adopted
~~~

这不是状态矛盾，而是现实本来就分层。

项目治理的价值，就是让这些分层同时可见，而不是为了给管理者一个“绿色状态”把它们压成单值。

## Drift、Gap、Issue、Risk 和 Dependency 不能统一叫“待优化”

项目汇报里最容易丢信息的一句话是：“目前还有一些待优化项。”

不同问题其实要求完全不同的动作。

**Drift（漂移）**：两个本应一致的正式事实现在不一致。

例如 Source 已经是新版本，但 Installed Workspace 仍是旧包；正式 Context 仍引用已经 superseded 的结论。

**Gap（缺口）**：目标能力和当前已证明能力之间还差什么。

例如已经有 Task Store，但还没有真实 Reopen Acceptance。

**Issue（问题）**：已经发生、现在需要处理的具体异常。

例如 Extension reload 后 Observer 没有重新建立 binding。

**Risk（风险）**：还没发生，但可能影响目标、成本、安全或时间。

例如外部 Provider 最近行为变化，下一阶段对它依赖较高。

**Dependency（依赖）**：某个任务或阶段继续前必须成立的内部或外部条件。

例如 Runtime Adoption 必须等待 exact package 安装完成。

它们之间可以互相转化，但不能在报告里抹平。

~~~text
Risk 成真
→ Issue

Source / Runtime 不一致
→ Drift

目标需要 Runtime Adoption，但没有真实验证
→ Gap

下一阶段必须先完成 Runtime Adoption
→ Dependency
~~~

为什么要分这么细？因为 Project Governance 的工作不是“把问题记录下来”，而是决定下一步是否可以继续。

Drift 往往需要 Reconcile；Gap 需要新 Task；Issue 需要 Repair；Risk 需要 Mitigation；Dependency 需要排序或 WAITING。

如果全叫 TODO，系统就失去了治理语义。

## Decision Request 要把“需要确认”压成一个真正可裁决的问题

Project Governance 很容易退化成另一种低质量自动化：发现一个 blocker，就给 Owner 留一句“请确认下一步”。

这种信息几乎没有治理价值，因为真正困难的不是知道“需要决定”，而是让决策者在不重新通读整个项目的情况下，清楚知道**到底在决定什么，以及不决定会怎样**。

一个合格的 Decision Request（决策请求：把当前无法由既有规则自动裁决的问题压缩成可由正确 Owner 做出的选择）至少应该包含：

~~~text
决策问题
→ 到底需要 Owner 决定什么

已确认事实
→ 哪些是 Source / Runtime / Evidence 已证明的

候选选项
→ 当前真正可行的选择，不把不存在的路线凑进来

影响
→ 对 Scope / Architecture / Risk / Cost / Schedule / User Outcome 有什么影响

推荐与依据
→ Agent / Planner 可以给工程建议，但要把依据暴露出来

不决定的后果
→ 会阻断哪个 Task / Gate / Release，还是可以安全等待

最迟决策点
→ 到什么时候以前必须决定，超过以后会失效什么
~~~

如果证据不足以比较选项，正确的 Decision Request 可以是“需要先补哪类 Evidence”，而不是强迫 Owner 在未知上投票。

它还应该指向正确 Owner。架构边界问题不能扔给 Executor，产品价值变化不能由 Test 代决定，高风险外部副作用也不能因为“项目要赶进度”就绕过 Approval。

这和 Task 工程里的 Decision Tier 是同一条边界在项目层的表达：**治理的作用不是替 Owner 做所有决定，而是把决定压缩到 Owner 真正需要承担的最小问题。**

## Stage Gate 不是“测试全绿”，而是证明上一阶段已经足够稳定，可以购买下一层复杂度

Stage Gate 最容易被误解成测试门。

测试当然重要，但一个阶段真正能否关闭，还取决于这个阶段承诺的完整事实有没有成立。

在我们的工程实践里，一个典型阶段更接近：

~~~text
Reality / Owner 已确认
→ Scope 和 Contract 冻结
→ Implementation 完整
→ Stage Freeze
→ Stage Verify
→ 必要的真实 Acceptance
→ Release / Adoption（如果本阶段要求）
→ Baseline
~~~

其中任何一层都不能自动替代下一层。

例如：

~~~text
unit tests PASS
≠ package 可发布

package 可发布
≠ Registry 已存在

Registry 已存在
≠ Fresh Workspace 已安装

Installed Truth 成立
≠ Runtime 已采用

Runtime READY
≠ 用户 Journey 已通过
~~~

因此 Gate 的设计应该从阶段目标倒推 Evidence，而不是先列“我们有哪些测试”。

这里有一个非常重要的原则：**下一阶段新增的复杂度，必须建立在上一阶段已经被真实证明的能力上。**

比如多任务并行不能早于稳定 Task Identity、Version、Evidence 和隔离；多执行器动态路由不能仅因为写了 Adapter 接口就宣布成立，至少需要第二个真实 Executor 在同一 Contract 下通过真实路径。

这和我们今天的复杂度判断一致：

~~~text
没有真实压力
→ 不买下一层复杂度

有了目标设计
→ 仍不算实现

有了源码
→ 仍不算现实采用

只有对应 Gate 关闭
→ 才升级 Project State
~~~

Stage Gate 因此既是质量机制，也是**复杂度购买机制**。

## Baseline 不是备份，而是“从这个点以后大家共同相信什么”

阶段通过以后，需要形成 Baseline Candidate（基线候选：把这个阶段当前可以正式承认的项目事实集中成一个待确认快照）。

一个 Baseline Candidate 至少应该回答：

~~~text
Branch / Commit 是什么？
正式资产有哪些？
哪些能力已经完成？
哪些只是 planned / placeholder？
关键 Evidence 在哪里？
当前 Release / Migration 状态怎样？
有哪些已知 Drift / Risk？
哪些旧内容已经 superseded？
还有哪些未完成项？
下一条主线是什么？
Workspace / Runtime / External Reality 是否可解释？
~~~

它不是一份压缩后的周报，而是下一阶段重新启动时的**共同事实入口**。

Candidate 只有在语义 Review 和必要 Owner 确认以后，才进入 Baseline Freeze（基线冻结：把某个时间点的项目事实正式确认为后续讨论和计划的共同起点）。

冻结以后发生的新事实，不应该偷偷回写旧 Baseline。

~~~text
Baseline B12
→ 当前正式事实

后续出现新 Incident
→ 新 Event / New Task

修复后
→ B13 Candidate
→ Review
→ B13 Freeze
~~~

这样才能保留演进历史。

如果每次项目状态变化都直接覆盖一个 CURRENT 文档，又不保留 Commit / Evidence / Baseline 关系，未来很难判断“这个结论当时是否成立，还是后来才补写进去”。

Git 历史可以保存文件版本，但 Project Baseline 解决的是**哪些文件和现实事实在同一个阶段上被共同承认**。

## Baseline 可以触发 Context / Roadmap 更新，但不能反过来制造新真值

阶段冻结以后，项目的 CURRENT、Roadmap、Handoff 或其他长期 Context 往往确实需要更新，否则下一轮 Agent 仍会读到旧现实。

但这里必须保留 Owner 边界：

~~~text
Baseline Freeze
→ 生成 Context / Roadmap Update Candidate
→ 回到对应 Owner
→ 在当前最新共同基线上更新
→ 重新检查引用和事实强度
→ 之后才成为下一轮正式入口
~~~

Project Governance Agent 可以指出：

- 哪些 CURRENT 事实已经过期；
- Roadmap 哪些项应从 planned 变成 active 或 completed；
- 哪些旧设计已经 superseded；
- 下一阶段应该把哪些 Owner 放进 REQUIRED_CONTEXT；
- 哪些新的 Risk / Dependency 需要暴露。

但它不能因为“Baseline 已冻结”就直接拥有所有这些文档的写入权。

尤其在多窗口并行时，共享 Context / Roadmap 必须基于最新共同 Commit / Baseline 集成；某个支线根据自己的局部世界改写公共 CURRENT，会把已经正确的 Project State 再次污染成分叉真值。

Roadmap 也必须继续区分 accepted、planned、placeholder。Baseline 证明“现在是什么”，不能顺手把“下一步想做什么”改写成已经承诺或已经完成。

因此 Baseline 和 Context 的关系不是双向互相覆盖，而是：

> **Baseline 提供已确认事实；Context / Roadmap Owner 决定怎样把这些事实投影成下一轮可执行入口。**

## 百分比可以用，但必须说明分母是什么

真实项目沟通仍然需要“现在大概多少进度”。

问题不是百分比本身，而是把它冒充成机器事实。

一个有意义的百分比至少应该说明它基于什么：

~~~text
按 Task 数量？
按 Required Gate？
按能力项？
按估算工作量？
按风险加权？
按当前 Phase 的 Completion Criteria？
~~~

对于 Agent 工程，我更倾向先给阶段事实，再给估计百分比。

例如：

~~~text
Phase Gate
- Contract       PASS
- Source         PASS
- Tests          PASS
- Package        PASS
- Fresh Install  PASS
- Runtime        PENDING
- User Journey   NOT STARTED

进度估计：约 75%
性质：沟通估计，不是正式 Project State
主要 blocker：Runtime Adoption
~~~

这样百分比不会吃掉真正重要的信息。

尤其当最后一个 Gate 是高风险、最难的真实验收时，“6 个 Gate 完成 5 个 = 83%”也不意味着剩余工作只占 17%。Project Status 应该允许百分比和 blocker severity 同时存在。

**数字用于压缩沟通，Gate 用于决定状态。**

一个成熟项目汇报可以按受众压缩，但底层通常至少能追到：范围与基线、目标与阶段、已完成事实及证据、当前进行中、阻塞与风险、漂移与缺口、Release / Migration、需要决策、下一阶段依赖，以及仓库 / Runtime / 外部系统回读。这里不要求固定模板，要求的是这些信息在需要追问时不能凭空消失。

## Project Governance Agent 可以生成候选，但不能成为项目真值来源

Agent 很适合做项目治理中的大量认知工作：

- 汇总多个 Task；
- 找出状态矛盾；
- 识别 Drift；
- 对照 Stage Criteria；
- 生成 Baseline Candidate；
- 发现漏掉的 Migration / Release / Evidence；
- 生成 Decision Request；
- 生成 Context / Roadmap Update Candidate。

但它不能因为“看过很多信息”就自动获得最终 Authority。

更合理的链路是：

~~~text
Agent 读取固定 Reporting Window
        ↓
按 Owner 收集事实
        ↓
标记冲突 / unknown
        ↓
生成 Project State Candidate
        ↓
需要裁决时生成 Decision Request
        ↓
检查 Stage Gate
        ↓
生成 Baseline Candidate
        ↓
Owner / Reviewer 确认
        ↓
正式 Baseline
        ↓
生成 Context / Roadmap Update Candidate
        ↓
对应 Owner 更新下一轮入口
~~~

这和知识治理里“Feedback 只能先成为 Candidate”是同一种纪律。

项目治理 Agent 的输出也不应该直接把计划写成已完成、不应该把 Executor 自述提升成 Evidence，更不能因为一个状态难以查询就自己推断成绿色。

真正成熟的 Project Governance 不是“AI 自动替你报项目”，而是**AI 帮你持续发现哪些项目结论还没有足够事实支撑，并把必须由人或正式 Owner 决定的问题压缩到最小。**

## 项目治理最终管理的不是进度，而是“什么时候可以相信下一步”

把这套机制压缩以后，Agent Project Governance 可以收敛成几个不变量：

~~~text
Task State 不等于 Project State
Reporting Window 必须可定位
项目事实来自各自 Owner
摘要不能成为第二真源
completed / planned / unknown 必须分开
Drift / Gap / Issue / Risk / Dependency 必须分开
Decision Request 必须暴露事实、选项、影响和决策时点
上游 PASS 不能冒充下游 Reality
Stage Gate 从目标倒推 Evidence
Gate 关闭以后才购买下一层复杂度
Baseline 是共同事实，不是漂亮汇报
Baseline 只生成 Context / Roadmap 更新候选，不抢它们的 Owner
百分比只是沟通估计，必须暴露分母
Governance Agent 生成 Candidate，不提交最终 Truth
~~~

这套治理不要求先建设一个 Project Management Platform。

在项目还小的时候，一个固定 CURRENT、Git、Task 列表和阶段 Checklist 就足够；当多个 Task、Release、Runtime、外部资源和 Agent 同时推进以后，再逐步结构化 Reporting Window、Decision Request、Gate、Baseline 和自动 Drift 检查。

真正值得保留的不是旧平台里的 Project Status Schema，而是一个更简单的原则：

> **只有当上一阶段的事实已经被足够证据固定下来，系统才有资格把下一阶段当成新的现实。**

这也是为什么 Project Governance 不是“管理进度”，而是在管理整个 Agent 工程里最昂贵的一件事：**什么时候可以继续相信并向前走。**
