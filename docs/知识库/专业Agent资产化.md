# 专业 Agent 资产化：从一次性角色到可复用工程能力

我最初把“专业 Agent”理解成一个配置问题：定义 Role、准备 Instructions 和 Knowledge、绑定 Tool 与 Policy，再补一套 Eval，最后发布到不同 Host。旧 `ai-agent-platform` 甚至把这条路完整推演成了 Role、Agent Profile、Knowledge Pack、Catalog、Release Registry 和 Publisher。

这些概念大多没有错，真正的问题出在顺序。真实项目还没有证明第二个、第三个 Agent 会怎样复用时，治理层已经开始变得比消费者更复杂；另一边，如果退回到“Prompt + 模型 + 一条会话”，一次任务又很容易跑通，却没有稳定身份、没有当前事实边界，也没有办法回答模型或环境变化以后为什么仍然值得信任。

ProFlow 后来的长期运行把这个问题压缩成了三个更稳定的问题：

~~~text
责任
→ 哪些东西应该跨任务长期存在？

现实
→ 当前这一轮到底应该相信什么？

证据
→ 凭什么扩大、维持或收回对这个 Agent 的信任？
~~~

所以我现在理解的 Agent Assetization（智能体资产化：把反复有效的智能体能力变成可复用、可验证、可演进的工程资产），已经不是“把一个 Agent 保存下来”。它更接近：**把稳定责任从模型、会话和当前任务里剥离出来；每次运行重新装配当前现实；再让 Eval、Release 和真实失败持续决定这份能力还能被信任到什么范围。**

**我们的方案先说清楚。** ProFlow 没有把“专业 Agent”实现成一份巨大的 Prompt，也没有让每个专业方向都拥有长期 Agent。我们把长期层、任务运行层和真实执行层拆开：Product、Dev、Test 只保存跨任务稳定的责任；Task 为当前工作保存 Node、Role Binding、状态和正式交接；每个 Task 中的 Role 再对应自己的 Worker 和 Conversation，Browser Tab 只负责找到、唤醒和操作真实会话，不参与业务身份。

一次真实任务大致沿着下面这条链运行：

~~~text
长期 Product / Dev / Test Role
        ↓
Task 创建固定 Role Slot / Binding
        ↓
当前 Role 获得 Task-scoped Worker
        ↓
Worker 绑定自己的 Conversation
        ↓
运行前重新读取当前 Task / State / Docs / Git / Runtime Reality
        ↓
Harness 装配本轮需要的 Context / Skill / Tool / Workspace / Permission / Validator
        ↓
Agent 在当前 Node 内判断和执行
        ↓
结果写回 Artifact / Task State / Evidence
        ↓
正式 Handoff 给下一 Role
        ↓
独立验证真实 Runtime / Browser / Outcome
        ↓
SUCCEEDED / WAITING / FAILED / Reopen
~~~

这条链里，长期资产和当前现实是刻意分开的。Role / Profile 只保存稳定责任以及对 Skill、Knowledge、Tool Contract、Policy、Eval 的引用；当前 Task、Node、Approval、Evidence、运行环境和副作用结果由各自的运行时 Owner 保存。Product 完成需求收敛后，交给 Dev 的不是一句“我已经聊清楚了”，而是正式 Requirement、Acceptance、Scope 和 Evidence；Dev 交给 Test 的也不是“代码写好了”，而是实现版本、Diff、运行方式、风险和可验证证据。Test 再从真实环境独立判断是否成立。

恢复同样依赖这套分层。浏览器刷新、Extension reload 或 Tab 消失，只意味着控制位置变化，不应该制造新的长期 Role 或第二个 Task Worker；Task 失败以后，系统先保留失败事实和 Evidence，核对当前现实，再决定 WAITING、Repair 或 Reopen，而不是重新建一套角色、重新开一条会话假装第一次执行。这样身份、任务历史和失败历史都能连续存在。

最后，Agent 的可信度不靠“配置已经完成”维持。每一版真实行为都由 Model、Role / Profile、Instructions、Knowledge、Tool Contract、Harness、Runtime 和 Policy 共同决定；相关变化进入 Eval，真实 Host 还要回读。生产失败则进入 Evidence，找到 First Divergence 和真正 Owner，修复以后留下 Regression Case，再形成下一版 Behavior Release。**这就是我们当前实际采用的资产化方案：稳定责任长期复用，当前现实每轮重建，正式状态由软件拥有，信任由证据逐步获得；只有第二个、第三个消费者真的复用了这些资产，才继续向共享平台抽象。**

## 第一次纠偏：专业能力越来越多，不代表长期 Agent 也应该越来越多

多 Agent 系统很容易沿着组织结构继续拆：前端一个、后端一个、架构一个、安全一个、研究一个、测试一个。角色名称越专业，系统表面上越像一支完整团队。

ProFlow 的路线后来几乎反过来。早期经历过 Controller-centric（以中央控制角色承接大量职责）和更多角色候选以后，长期业务角色反而压缩成 Product、Dev、Test 三类复合责任。原因不是前端、安全或架构能力不重要，而是这些专业能力大多可以通过 Knowledge、Skill、Tool 或临时子任务进入当前工作，没有必要都拥有一套独立身份、权限、上下文、恢复和验收生命周期。

真正值得长期 Agent 化的责任，至少同时满足几件事：任务会反复出现；下一步仍需要根据新观察做开放判断；它拥有现有 Owner 无法表达的独立责任；独立 Context、Permission 或验收边界确实有价值；并且存在真实消费者和可以重复执行的 Eval。

这个判断很重要，因为 Agent 不是能力资产的“最高等级”。很多经验停在更低复杂度反而更好：

~~~text
一次真实经验
→ Case

稳定判断方法
→ Skill

确定动作
→ Script / Automation

长期状态路径
→ Workflow / Task Control

开放判断 + 独立长期责任
→ Agent

多个真实消费者反复复用
→ Shared Service / Platform Primitive
~~~

每向上走一级，新增的不只是功能，还包括 Owner、Version、Permission、Recovery、Eval、Compatibility 和运维成本。一个确定性 Workflow 外面再包一个 Agent，不会自动更智能；一个 Skill 已经能稳定解决的问题，也不需要为了“Agent 化”再创造长期身份。

这也是我现在判断新角色最先问的问题：**它是否拥有一份真实、长期、无法由现有 Role、Skill 或 Workflow 表达的责任。** 如果答案不清楚，先不创建 Agent 往往比创建以后再治理更便宜。

## 把 Agent 从模型和会话里剥出来，长期身份才第一次成立

决定一项责任值得长期存在以后，第二个问题才是“这个 Agent 到底是谁”。

如果答案是某个模型，就会在模型升级时失去身份；如果答案是某个 Custom GPT 页面，就会把 Host 当成真源；如果答案是某条 Conversation，又会在换 Session、换浏览器或任务结束以后失去连续性。

ProFlow 的真实运行最终把这些对象拆开了：Product、Dev、Test 是长期 Role（角色：跨任务稳定存在的职责、决策权和验收边界）；每个 Task 中承担某个 Role 的 Worker 是任务级执行实例；Conversation 是这个 Worker 当前使用的会话载体；浏览器 Tab 只是此刻找到这条会话的位置。

这层拆分解决的不是命名问题，而是生命周期问题。Chrome 刷新、Extension reload、Tab 关闭都不应该自动制造第二个 Worker；一个角色更换模型或 Host，也不应该因此变成新的业务身份。稳定身份回答“谁长期负责这件事”，运行实例回答“这次是谁在执行”，载体只回答“现在从哪里找到它”。

旧智能体资产体系里的 Role / Agent Profile 分层在这里仍然有价值。Role 保存稳定责任，Agent Profile（智能体配置组合：描述某一版角色依赖哪些长期资产和行为约束）负责组合，而不是复制：

~~~text
Role / Mission
+ Skill references
+ Knowledge references
+ Capability / Tool requirements
+ Policy references
+ Context requirements
+ Eval contract
→ 某一版 Agent Profile
~~~

Profile 不应该把 Skill 正文、Knowledge 全文、Tool Secret、当前 Task State、一次性 Approval 和聊天历史再复制一遍。否则它会成为第二份真源：Knowledge 更新一次，要同步多份 Profile；Tool 权限变化一次，旧配置可能继续带着过期能力运行。

这种组合关系还带来一个重要结果：**身份稳定，不代表实现固定。** 同一个 Role 可以有不同模型、不同 Host，甚至不同成本和风险档位的 Profile；Executor（执行器：真正提供推理或动作能力的模型、CLI、脚本或 Runtime）也可以替换。但任何可能改变行为的替换都要重新回到 Eval，而不是因为 Role 名没变就自动继承信任。

## 同一个 Agent 每次运行都必须重新认识现实，而不是继续活在上一次会话里

长期身份稳定以后，最危险的错误反而是把“长期资产”和“当前现实”混在一起。

一个 Agent 在昨天的任务里看到过某个 branch、某条 Requirement、某次 Approval、某个 Tool Result，这些信息今天仍然可能留在 Conversation、Memory 或历史摘要里。但只要当前代码、Task State、权限或外部系统已经变化，继续相信昨天的内容就会把历史经验变成错误动作。

所以长期系统必须把几类信息拆开：

| 信息 | 它真正负责什么 |
|---|---|
| Knowledge Source（知识源） | 当前权威事实、规范和稳定知识从哪里来 |
| State（状态） | 这份具体任务现在真实做到哪里 |
| History（历史） | 过去发生过什么，包括已经过期的事实 |
| Memory（记忆） | 过去哪些内容经过治理后仍值得未来复用 |
| Context（上下文） | 这一轮模型真正应该看到的最小充分工作集 |

这些对象最终可能都以文本进入模型窗口，但权威等级完全不同。Memory 记得“项目还在方案 A”，不能覆盖当前 Git 已经进入方案 B；Conversation 里说 Task 还是 READY，也不能覆盖 Runtime 已经保存的 FAILED；过去一次 Approval 更不能因为曾经出现在 Prompt 里，就自然延续到新任务。

这也是为什么稳定 Profile 不应该保存“当前 Context”，而只声明 Context Requirement：需要哪些来源、什么新鲜度、什么权限和预算。真正执行时，由 Harness（工程托架：为当前一轮组织 Instructions、Context、Tool、Workspace、Validator 和反馈的系统层）重新装配工作环境。

可以把一次运行理解成一次“重新编译”：

~~~text
长期 Role / Profile
        ↓
声明稳定责任与依赖

当前 Task / State / Workspace / Permission
        ↓
Harness 选择并组织当前工作集

Model + Tool Surface + Validator
        ↓
Agent Runtime Instance

Runtime
→ 保存 Task Identity、State、Event、Owner、Recovery
~~~

这里 Harness 解决“这一轮怎样更容易做对”，Runtime（长期任务运行时）解决“任务怎样跨轮次、跨进程继续存在”。两者都不应该被塞回一份巨大 Prompt。

这个分层也解释了为什么“把更多上下文给模型”经常会让长任务越来越差。旧计划、失败尝试、过期 Tool Result、历史摘要不断累积以后，模型窗口虽然更满，Signal-to-Noise Ratio（信噪比）却更低。真正的长期能力不是永久携带全部历史，而是关键真值已经升到 State、Knowledge 和 Evidence，每次调用只重新组织当前决策真正需要的部分。

## 可信不是“配置完成”，而是能证明这套行为在什么范围内成立

Agent 能完成一次任务，只能证明当时那组模型、Context、Tool、Policy 和环境组合成功过。概率模型、外部工具和运行环境都可能变化，因此专业 Agent 的信任必须由可重复证据支撑。

我现在更愿意把 Eval（评估：用可重复标准判断 Agent 的结果、路径和真实效果是否满足要求）分成四层来看：

| 层 | 需要证明什么 |
|---|---|
| Task / Final Answer | 是否理解并完成了任务 |
| Trajectory（执行路径） | Tool 是否选对，是否越权、空转、错误重试，是否在该停时停 |
| Artifact（正式产物） | 代码、文档、配置等交付物本身是否正确 |
| Outcome / Effect（真实结果 / 副作用） | 现实世界是否真的发生目标变化，用户目标是否真正成立 |

这四层不能越级互相证明。测试通过不能证明公开环境已经更新；生成了代码不代表用户路径可用；模型自己说“完成”更不能当作 Outcome Evidence（结果证据）。ProFlow 长期把 package、真实 Runtime、Browser / ChatGPT Journey 和阶段验收分层，就是为了避免上一层 PASS 冒充下一层现实已经成立。

一旦 Agent 进入真实使用，发布对象也不能只写“模型版本”。AI 行为通常由多项因素共同决定：

~~~text
Model
+ Role / Profile
+ Instructions
+ Knowledge / Retrieval
+ Tool Contract
+ Harness
+ Runtime
+ Policy
→ Production Behavior
~~~

Behavior Release（行为发布：一组共同决定线上 AI 行为的版本组合）因此比单独的模型版本更接近真正的发布对象。Prompt 改两句、Knowledge 更新、Tool Schema 改字段、Permission 放宽、Context Builder 改策略，都可能改变最终行为，即使代码仓库没有产生一次传统意义上的“大版本”。

这也要求 Release 能回答：这一版究竟用了什么模型、什么 Profile、什么 Knowledge、什么 Tool Contract 和 Policy；通过了哪些 Eval；真实 Host 上又实际生效了什么。旧智能体资产体系里“Host 不是真源”仍然成立，但 Host readback（宿主回读：从真实外部运行载体确认实际配置）同样不能省。ProFlow 的 Custom GPT 实践已经证明，本地希望发布什么和远端实际存在什么是两类事实。

Rollback 也应该围绕完整行为组合思考。如果一次更新同时改变模型、Prompt、Knowledge 和 Tool Contract，只回滚其中一个，很可能得到一个从未评测过的新组合。更可靠的含义不是“永远不变”，而是**任何改变都能知道自己改变了什么、重新证明了什么，以及证据不足时怎样收回信任。**

## 真正的学习不是给 Prompt 再加一句，而是让失败修改正确的 Owner

长期运行以后，最有价值的资产往往不是第一次成功，而是失败怎样被留下来。

一种很常见的修复方式是：Agent 做错了，就在 Prompt 里补一句“以后不要这样”。短期看起来很快，长期会得到一份越来越长、越来越相互冲突的行为说明，而且真正的问题可能根本不在 Prompt。

一次失败可能来自不同地方：

~~~text
模型理解不足
Retrieval 拿到旧知识
Context Assembly 漏掉关键事实
Skill 触发错误
Tool Schema 或参数错误
Permission / Policy 错误
Workspace / Environment 错误
Runtime / Recovery 错误
Eval Harness 自己测错
~~~

成熟的处理方式是先保留 Evidence，再找到 First Divergence（第一处分歧：实际行为第一次偏离预期的位置）和真正 Owner，然后修对应层。Context 缺失就修 Context Builder；Skill 误触发就进入 Skill Eval；Tool 使用问题修 Tool Contract 或 Skill；权限事故修 Policy；模型在特定 Failure Slice（失败切片：一组具有相同错误模式的任务）持续不足，再考虑模型或 Routing。

修复以后，历史失败还应该进入 Regression Case（回归样本：以后每次相关变化都重新验证的失败案例）。Golden Set 不能只放漂亮成功样例，还要保留真实事故、边界输入、长 Context、环境失败以及应该拒绝或升级的场景。

运行反馈也不能直接反向修改正式资产。某次成功经验、某个用户纠正、一次新的模式首先只能成为 Candidate；只有经过重复证据、Review 和 Eval，才有资格晋升成 Knowledge、Skill、Policy 或 Profile 变化。否则“Agent 会学习”很容易变成一次偶然经历永久污染未来任务。

这形成了我现在更认可的学习闭环：

~~~text
真实任务
→ Evidence / Incident
→ 找到真正 Owner
→ Repair
→ Regression
→ Asset Revision
→ 新 Behavior Release
→ 继续观察
~~~

这里的“学习”发生在工程系统里，而不是让模型悄悄修改自己。

## 第二次纠偏：完整平台设计可以正确，但仍然可能做早了

旧 `ai-agent-platform` 对 Agent 资产的目标模型其实很完整：Role、Profile、Knowledge Pack、Capability、Tool Binding、Policy、Eval、Host Release、Catalog、Publisher 都有清楚位置。真正让我后来改变方向的，不是这些概念突然失效，而是**它们中的一部分还没有等到真实消费者，就已经开始产生治理成本。**

当时已经规划固定 `agents/`、`knowledge-packs/`、Catalog、Release Registry 和 Publisher；如果未来真的有很多专业 Agent、多个 Host、机器发现、兼容性和跨产品发布需求，这些能力完全可能再次变得有价值。但在第二个稳定 Agent 都还没有证明复用关系时，提前维护多层 Schema、Registry 和映射，只会让“平台完整”变成自己的目标。

这段经历让我形成了一个比旧架构更重要的判断：**第二个消费者才真正开始证明资产化。**

第一个 Agent 可以依赖大量专属配置跑通。第二个 Agent 如果能够直接复用已有 Skill、Knowledge、Tool Contract、Policy、Eval 和 Runtime 原语，只新增自己的长期责任、Context Requirement 和验收标准，公共资产才真正成立。反过来，如果必须复制第一套 Instructions、Knowledge、Tool 配置再大量修改，那么所谓平台资产仍然只是模板。

同样，资产治理必须允许复杂度退出。职责消失的 Agent 可以 Retire；两个长期 Role 没有独立事实和验收价值时可以合并；开放判断逐渐稳定成方法时可以降成 Skill；路径和状态已经确定时可以降成 Workflow；机械步骤继续下沉成 Automation。Shared Service 或 Platform Primitive 也应该等到 multiple consumers、stable contract、repeated maintenance 和 shared governance need 真正出现以后再抽。

所以今天保留下来的不是旧平台那套固定目录，而是几条已经被真实实践反复验证的边界：

- 长期 Role 不绑定模型、Host 或会话；
- Profile 只组合稳定资产，不复制其他 Owner 的真值；
- 当前 Task、State、Approval、Evidence 和 Secret 留在 Runtime；
- Context 每轮重新装配，Memory 不能覆盖当前权威事实；
- Agent 的信任由 Eval 和真实 Evidence 决定，不由“配置已经写完”决定；
- 失败先进入 Evidence，再修真正 Owner，并留下 Regression；
- 没有第二个真实消费者，就不急着把局部能力包装成平台。

这篇文章描述的是这些已经沉淀下来的工程判断，不宣称当前已经拥有一个通用 Agent Profile Platform、跨项目 Catalog 或完整 Release Registry。那些曾经设计过、但还没有被真实复用需求重新证明的机制，继续留在历史材料里就足够了。

回到最开始的问题：专业 Agent 和“一个配置得很好的 Prompt + 模型 + Tool”到底差在哪里？

差别不在组件数量，而在系统能不能持续回答：

**为什么这份责任值得长期存在？当前这一轮应该相信什么现实？哪组证据允许我们继续把真实任务交给它？**

当这三个问题有稳定答案，而且失败能够反过来修改下一版能力时，一个 Agent 才真正从一次性角色变成工程资产。
