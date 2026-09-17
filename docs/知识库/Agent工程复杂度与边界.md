# Agent 工程复杂度与边界：什么时候该升级，什么时候应该降级

Agent 工程里最容易犯的一类错误，是把“架构更复杂”理解成“能力更高级”。多一个 Agent、多一层 Workflow、多一个 Registry、多一套 Runtime，看起来都更像“真正的 Agent 系统”，但它们同时也会增加新的状态、权限、恢复、验证和维护成本。

我现在更愿意用另一条标准判断系统是不是应该继续升级：**上一层是不是已经出现了真实、反复、无法用更轻方案稳定解决的问题。** 如果没有，复杂度本身就不是能力，而是债务。

这篇文章不讨论哪家 Agent 框架更强，也不再重复 [Coding Agent](./Coding-Agent.md) 里已经展开的 Model、Harness、Runtime 和 Workspace 生态差异；也不重复 [本机 Agent 工具链](./本机Agent工具链.md) 里 Chat 怎样获得本机执行能力。这里只回答一个更基础的问题：

> **一个 AI 能力什么时候只需要模型或脚本，什么时候值得升级成 Agent，什么时候才真的需要 Workflow、Task Control、多 Agent 或平台？**

全文的主线可以先压成一句话：

> **复杂度要由真实需求购买；能用更低层级稳定完成并证明结果，就不要升级。**

这不是保守，而是一种工程约束。Agent 的价值来自把原本由人承担、又确实需要动态判断的责任交给系统；而不是把所有确定性流程重新包装成模型调用。

---

## 先不要问“要不要上 Agent”，先看现在是谁在兜底

判断复杂度之前，最有用的问题不是“现在流行什么框架”，而是：**一项任务从目标到完成，中间有哪些责任还靠人临时记住、临时确认和临时修复。**

一个看起来已经“接了模型和工具”的系统，真实任务里仍可能主要靠人维持：

| 责任 | 简单 AI 工具里通常是谁承担 | 系统升级后可能由谁承担 |
|---|---|---|
| 目标和约束 | 用户反复解释 | Task / Contract |
| 当前上下文 | 人复制文件、贴日志、提醒旧结论 | Context 机制、知识源、运行时读取 |
| 任务状态 | 人脑、聊天历史 | Session State 或持久 Task State |
| 下一步判断 | 人或模型 | Agent |
| 确定性步骤 | 人手动执行 | Script / Automation |
| 外部动作 | 人点按钮、复制命令 | Tool / Executor |
| 权限 | 人临时决定 | Permission / Policy / Approval |
| 结果验证 | 人看模型摘要 | Test、Diff、Readback、Evidence |
| 副作用核对 | 人去外部系统确认 | Reality Reconciliation |
| 中断恢复 | 重新解释、从头执行 | Checkpoint / Resume |
| 跨角色协作 | 靠聊天顺序 | Handoff / Task State / Shared Contract |
| 能力复用 | 复制 Prompt | Skill / Capability / Adapter / Platform |

这张表比“用了几个 Agent”更能说明系统成熟度。

如果目标、上下文、状态、执行、验证和恢复仍然全部靠人串起来，那么模型再聪明，也只是一个高能力工具。反过来，如果系统已经能稳定承担这些责任，也不代表一定需要多 Agent 或完整平台；它可能只是一个设计良好的单 Agent Runtime。

所以复杂度判断的真正对象不是“模型数量”，而是**工程责任有没有发生转移**。

---

## 一条实用的复杂度阶梯：每一级都在接管新的责任

为了判断“下一层值不值得”，我会把常见 AI 工程形态拆成七级。它不是行业标准，也不是必须逐级升级的成熟度排行榜。同一个产品可以同时在不同任务上使用不同层级。

```text
L0  确定性代码 / Script
    ↓
L1  代码补全
    ↓
L2  对话辅助
    ↓
L3  Agent / Coding Agent
    ↓
L4  Tool-connected Agent
    ↓
L5  Workflow / Task Control
    ↓
L6  Agent Platform
```

这里最重要的不是编号，而是每次向上到底多接管了什么。

| 层级 | 系统主要接管什么 | 状态主要在哪里 | 最大新增风险 | 什么时候值得升级 |
|---|---|---|---|---|
| L0 确定性代码 / Script | 固定规则和机械执行 | 输入 / 输出、文件或数据库 | 规则错误 | 规则已经明确，不需要模型判断 |
| L1 代码补全 | 局部生成 | IDE / 当前文件 | 局部错误 | 需要更大范围理解时 |
| L2 对话辅助 | 分析、设计、解释 | Session | 上下文漂移、结论未落盘 | 需要直接进入真实工程时 |
| L3 Agent | 多步判断、读写工程、执行验证 | Session + Repo / Workspace | 越界、环境污染、错误执行 | 需要操作外部系统时 |
| L4 Tool-connected Agent | 外部 Tool / API / Browser 副作用 | Session + 外部系统 | 权限、重复副作用、外部不一致 | 需要跨 Session 状态和恢复时 |
| L5 Workflow / Task Control | 任务版本、状态、审批、执行、证据、恢复 | Task / Execution Store | 状态竞争、重复执行、补偿失败 | 多个真实场景共享同一控制机制时 |
| L6 Agent Platform | 多产品、多角色、多执行器的共用控制面 | 跨产品 Runtime / Registry | 抽象过度、治理失控、维护成本 | 复用已经被真实业务证明时 |

需要特别强调：**L6 不是终点。** 很多优秀系统永远不需要 Agent Platform。一个稳定 Script、一个 Coding Agent、一个 Application Service，可能就是正确的最终形态。

---

## L0：规则已经确定，就不要让模型重新思考

最容易被低估的一层其实是普通程序和 Script（脚本：输入输出和执行逻辑可以被机器明确描述的确定性程序）。

如果一件事已经满足：

```text
输入可以定义
规则可以定义
输出可以验证
失败可以用状态 / 退出码表达
不需要语义判断
```

那么继续让模型每次“理解一下再执行”，通常只会增加 Token、延迟和行为方差。

例如：

- 计算 Hash；
- 校验 JSON / YAML Schema；
- 检查重复 ID；
- 生成固定 Manifest；
- 比较两个确定性文件集合；
- 根据明确规则执行 whole-file CREATE / REPLACE / DELETE；
- 检查 Git diff 是否包含格式错误。

这些任务不是“太简单所以不配 Agent”，而是**已经成熟到不需要 Agent**。

这也是本机工程实践后来形成 `AUTOMATION-BELOW-MODEL` 的原因：稳定机械步骤下沉到 Script / Automation，模型只保留真正需要判断的部分。

因此复杂度选择的第一条规则应该是：

> **如果问题已经能被确定性表达，优先把它降到模型以下。**

---

## L1：代码补全只需要理解局部，不需要拥有任务

代码补全解决的是非常局部的问题：当前光标附近应该补什么、某个 API 怎样使用、一个模式接下来通常是什么。

系统承担：

- 基于当前文件和附近上下文生成候选；
- 提供语法、模式和 API 建议。

人仍然承担：

- 为什么要改；
- 应该改哪几个模块；
- 依赖影响；
- 测试；
- Git；
- 是否接受结果。

这种模式的优点恰恰来自责任少：状态小、权限小、恢复简单，模型出错也通常停留在局部文本。

只有当任务开始反复要求“理解跨文件约束”“比较多个方案”“生成完整设计”“追踪一个较长问题”时，才需要 L2。

---

## L2：对话辅助扩大了认知范围，但现实仍由人搬运

Chat 把 AI 从“当前几行代码”扩展到更大的认知问题：需求澄清、技术调研、架构比较、跨文件草稿、故障分析。

这一级真正增加的是**语义范围**，不是执行权。

典型链路仍然是：

```text
人描述问题
→ 模型分析
→ 模型给建议 / 代码
→ 人去真实环境执行
→ 人把结果带回来
```

因此这一级最常见的问题不是代码生成能力，而是：

- 聊天里的稳定结论没有进入正式资产；
- 长会话里旧状态和新状态混在一起；
- 模型说“可以这样做”，很容易被误听成“已经做完”；
- 当前磁盘、Git、Browser、外部服务仍然需要人翻译给模型。

当人的主要工作开始变成“搬运现实”，就出现 L3 的升级信号：让 Agent 进入真实工作环境。

这也是我自己的本机工具链为什么从 Chat、压缩包、Bundle，最终演进到 MCP 和 Local Dev：不是为了让 Chat 看起来更 Agentic，而是因为人工搬运已经成为主要损耗。

---

## L3：Agent 的分界点不是“会聊天”，而是会围绕目标持续判断和行动

Agent（智能体：根据目标、上下文和反馈持续判断下一步，并调用能力推进任务的执行主体）和普通对话助手的关键区别，不是有没有系统提示词，而是是否出现了一个持续循环：

```text
理解当前目标
→ 选择下一步
→ 读取或调用能力
→ 观察结果
→ 更新判断
→ 继续，直到完成、阻塞或停止
```

Coding Agent 是这一层最成熟的例子之一。它可以：

- 读取仓库；
- 搜索和理解代码；
- 修改多个文件；
- 运行命令；
- 执行测试；
- 查看 Diff；
- 根据失败结果继续修正。

但一旦 Agent 可以真实修改环境，系统就新增了一批以前不需要承担的工程责任：

```text
它现在在哪个 repo / branch / worktree？
允许改到什么范围？
网络能不能访问？
它修改了哪些文件？
测试真的跑了吗？
失败以后现场还在吗？
摘要是否和真实 working tree 一致？
```

所以“Agent 比 Chat 高级”的真正含义不是 UI 更酷，而是：**系统开始承担真实执行责任。**

这也是为什么 [Coding Agent](./Coding-Agent.md) 里会把 Harness 和 Runtime 放在模型之外重点讨论。任务一旦进入真实世界，模型能力只是其中一层。

---

## L4：Tool-connected Agent 把风险从本地工程扩大到外部世界

当 Agent 不只操作自己的工作目录，还能通过 MCP、API、Browser、数据库、SaaS 或其他 Tool 改变外部系统时，问题发生第二次质变。

Tool（工具：向 Agent 提供某种原子能力或外部事实访问入口）本身解决“能做什么”；但系统必须另外回答：

- 这个 Agent **有没有权**调用；
- 当前身份是谁；
- 参数是否合法；
- 这个动作是否可逆；
- 是否需要人工批准；
- 失败以后能不能重试；
- 如果响应丢了，外部副作用到底发生没有；
- 外部系统和本地状态是否一致。

这时 Permission（权限：允许主体访问哪些资源和动作）、Policy（策略：根据身份、状态和风险判断允许或拒绝）、Approval（审批：高风险动作继续前需要获得的正式授权）开始成为真实系统责任。

最大的错误之一，是把“Tool Call 返回失败”直接理解成“事情没发生”。

一个发布请求、资源创建、付款、Browser 提交或者远端写入，在网络 timeout 时可能已经成功，只是 response 没回来。

正确状态可能是：

```text
command result = timeout
business side effect = UNKNOWN
```

此时必须做 Reality Reconciliation（真实结果核对：回到真正拥有该业务状态的系统确认副作用是否已发生），而不是盲目 retry。

这个阶段开始以后，Prompt 里的“请小心一点”已经不能承担安全边界。身份、权限、Allowlist、Schema、审批、读回和幂等必须进入 Runtime 或 Tool 合同。

---

## L5：当任务开始脱离 Session，才真正需要 Workflow / Task Control

Tool-connected Agent 仍然可以完成很多任务。只有当“这次工作”开始拥有比当前会话更长的生命周期时，才需要 Workflow（工作流：管理多步骤依赖、状态变化、重试和恢复的机制）或者 Task Control（任务控制：把任务身份、版本、状态、审批、执行、证据和恢复变成系统对象）。

典型升级信号包括：

- 任务跨小时、跨天或跨 Session；
- 必须等待外部事件；
- 任务需要多个正式阶段；
- 需要暂停 / 恢复；
- 某一步失败只应局部重试；
- 旧审批不能自动授权新版本；
- 多个执行者需要接力；
- 同一任务可能并发更新；
- timeout 后必须知道原动作是否已生效；
- 用户需要知道“现在到底做到哪一步”。

此时 Session 已经不够，因为 Session 只是交互容器，不应该成为长期业务状态数据库。

一个最小 Task Control 至少开始出现：

```text
Goal
→ Task
→ Task Version
→ Plan / Node
→ Approval
→ Execution
→ Result
→ Evidence
→ Accepted / Failed / Waiting / Resume
```

它带来的不是“更多自动化”，而是一套新的系统责任：

- 状态机；
- 版本；
- 乐观并发；
- 幂等；
- Checkpoint；
- Retry Budget；
- Evidence；
- 副作用记录；
- Safe Continuation。

复杂度也明显上升。

原本一次 Agent 调用失败，可以重新跑；有了 Task Control 以后，重新跑本身就可能是错误，因为前半段已经发生了不可重复副作用。

所以 L5 的成立条件不是“流程有三步”，而是**状态和恢复已经成为业务问题。**

---

## 三步直线流程，不值得为了“Agentic”画成 Workflow Graph

这是一个非常实用的反例。

假设过程只是：

```text
读取输入
→ 转换
→ 保存
```

每一步确定、同步、失败可从头安全重做，也没有跨 Session 状态，那么普通函数、Script 或 Application Service 就够了。

把它改造成：

```text
Node A
→ Edge
→ Node B
→ Edge
→ Node C
```

不会自动增加可靠性，只会增加：

- Workflow 定义；
- State Store；
- 节点输入输出；
- Trace；
- 错误分支；
- 部署和调试面。

真正需要图或状态机的不是“步骤数量”，而是：

```text
分支和依赖是否真实存在？
等待是否真实存在？
恢复是否真实存在？
并发是否真实存在？
状态是否必须跨进程 / Session 存活？
```

如果答案都是否，就不该为了“看起来像 Agent 系统”提前上重型编排。

---

## L6：平台成立的前提不是功能多，而是复用已经发生

Agent Platform（智能体平台：让多个真实产品、入口、角色或执行器复用同一套状态、安全、执行、证据和恢复机制的系统层）是整条复杂度阶梯里最容易过度设计的一层。

平台最常见的诱惑是：

> “这些以后别的产品也会需要，不如现在统一做掉。”

问题在于“以后会需要”不是复用证据。

一个机制真正值得下沉为平台能力，通常至少应该满足多数条件：

- 被两个以上真实产品或工程场景重复需要；
- 语义不依赖某一个业务领域；
- 需要统一身份、状态、权限、证据或恢复；
- 已经能形成稳定输入输出 Contract；
- 更换模型、Executor 或 Provider 时，上层业务不应该重写；
- 有真实调用方；
- 有可验证的质量、成本或可靠性收益；
- 复制两份实现的成本已经高于维护共享层。

例如，下面这些有可能成为平台责任：

```text
Task / Version / State
Identity / Policy / Approval
Executor Adapter
Evidence / Side-effect / Recovery
Context Contract
Agent / Skill / Capability distribution
```

而下面这些通常不应该为了“平台完整”提前自研：

- 模型本身；
- 某个 Provider 的全部功能；
- 只有一个产品使用的业务对象；
- 单一工具参数；
- 某个 UI 的产品体验；
- 还没有第二调用方的抽象层。

平台不是“把所有东西放到中间”。平台真正有价值的时候，是**它把已经反复出现的共同责任拿走，让上层产品变简单。**

---

## 多 Agent 不是 L7，它是一种组织选择

Multi-Agent（多智能体协作：多个拥有独立职责、上下文或执行生命周期的 Agent 围绕同一目标协作）经常被误解成单 Agent 之后的“更高级阶段”。

我现在不会把它放进纵向阶梯。

因为一个系统完全可能：

- L3 就用多个临时 Agent；
- L5 只用一个 Agent + 强 Task Control；
- L6 平台也只服务几个单 Agent 产品。

拆 Agent 的合理理由至少要带来一种真实变化：

- 独立 Context；
- 不同 Model；
- 不同 Permission；
- 真正并行；
- 独立专业判断；
- 独立验收；
- 失败隔离；
- 不同成本或运行环境。

只有“Prompt 不一样”通常不够。

因为每增加一个 Agent，也会新增：

```text
Handoff 成本
+ Shared State 成本
+ Review 成本
+ Integration 成本
+ Identity 成本
+ Permission 成本
+ Recovery 成本
```

所以 Multi-Agent 的收益公式更接近：

```text
独立上下文收益
+ 真正并行收益
+ 职责隔离收益
+ 专业判断收益
-
交接成本
-
共享状态成本
-
验收成本
-
集成和恢复成本
```

如果新 Agent 只是复制同样的上下文、调用同样的 Tool、最后还要由同一个主 Agent 全部重读一遍，系统可能只是把一项工作拆成更多 Token 消耗。

ProFlow 的实际路线就是一个很好的反例：它没有因为“多 Agent”继续复制公司组织图，而是长期把角色压成 Product / Dev / Test 三类复合责任，并且第一版主动限制通用 DAG、无限 Loop、动态 Agent Discovery 和任意并行。

这种做法牺牲了“看起来更自主”的观感，却减少了身份组合、Browser Conversation、Approval 状态、恢复空间和 E2E 路径。

所以判断要不要再拆一个 Agent，不必再看“角色数量”或“看起来够不够 Agentic”，只问一件事：**这个新 Agent 是否真的带来了独立 Context、Permission、并行、验收或失败隔离中的至少一种价值。** 如果没有，先用单 Agent + Skill，通常更轻、更稳。

这个判断也自然带出下一层边界：Agent、Skill、Tool、Script、Workflow 本来就不是一条从低到高的升级链，而是一组承担不同责任的工程对象。

---

## Agent、Skill、Tool、Script、Workflow 不是一条“高级程度”链

这里还需要避免另一种常见误解：把 Agent、Skill、Tool、Script、Workflow 看成从低到高的产品等级。

它们解决的是不同问题。

| 对象 | 它回答的问题 | 是否适合承担长期状态 |
|---|---|---:|
| 文档 / Reference | 已经知道什么 | 否 |
| Prompt | 这一次告诉模型什么 | 否 |
| Script | 已经确定的步骤怎样稳定执行 | 通常否 |
| Skill | 一类重复任务应该怎样做 | 否 |
| Tool | 系统能调用什么外部能力 | 状态通常由外部 Owner 拥有 |
| Agent | 当前不确定环境下下一步该怎么判断 | 通常不是长期业务状态 Owner |
| Workflow / Task Control | 一个长任务现在处于哪里、怎样继续 | 是 |
| Platform | 多个场景共同依赖哪些稳定控制能力 | 是 |

Skill（技能：把一类重复任务的程序性知识、判断步骤和停止条件做成可复用方法）不是 Tool；Tool 提供“能做什么”，Skill 说明“遇到这类任务应该怎样做”。

Script 也不是低配 Skill。如果逻辑已经完全确定，Script 反而比 Skill 更稳定、更便宜。

Workflow 更不是“大号 Skill”。Skill 不应该偷偷保存长期任务状态；需要等待、重试、审批、补偿、跨 Session 恢复时，状态必须离开 Skill 文本，进入正式 Task / Workflow Owner。

这篇只保留这些选择边界。Skill 怎样设计 Trigger、Reference、Script 和 Eval，属于另一个独立主题，不在这里展开。

---

## Capability 也不等于 Tool：平台最容易在这里抽象过头

Capability（能力合同：用稳定输入输出描述“系统可以完成什么”，而不绑定某个具体实现）和 Tool 也不是同一个对象。

例如“读取当前 Git 状态”可以是一项能力；今天可能由 Local Dev 实现，另一个 Runtime 也可能提供同类能力。

当系统只有一个实现、一个调用方时，没有必要为了“架构漂亮”先造一层复杂 Capability Registry。

只有下面情况逐渐出现，稳定能力合同才开始有价值：

```text
同一能力有多个 Executor
或
多个上层产品依赖同一语义
或
权限 / Policy 需要围绕能力而不是具体工具表达
或
Provider 必须可以替换
```

这也是平台抽象的普遍规律：**先出现真实变化，再提取稳定接口。**

不要先画一个巨大能力地图，再等待未来实现来证明它。

---

## 复杂度增加以后，真正增长的是五类“系统税”

架构升级不会只增加能力，也会增加持续成本。为了判断收益是否覆盖成本，我会把复杂度税拆成五类。

### 1. 状态税

系统需要回答更多“现在在哪里”：

```text
当前 Task 是哪个版本？
哪个 Node 在 RUNNING？
哪个 Worker 拿着 Lease？
哪个外部动作已经发生？
哪个结果属于哪次 run？
```

状态越多，竞争、过期和恢复问题越多。

### 2. 身份与权限税

一个 Chat 可以只有“用户和模型”；多 Agent / 多 Executor 系统很快需要区分：

```text
Role
Worker
Session
Runtime
Executor
Credential
Permission Scope
Approval
```

身份不清时，系统可能不是“做错”，而是“正确动作由错误主体执行”。

### 3. 协调税

多个 Agent、多个阶段和多个系统之间需要 Handoff、共享事实、冲突处理、结果合并和 Review。

越多参与者，越不能依赖“大家看到同一段聊天”。

### 4. 恢复税

越能产生副作用，失败就越不能简单从头重跑。

系统需要知道：

```text
最后一个确定成功点在哪里？
哪些动作幂等？
哪些副作用状态 UNKNOWN？
当前现场还能不能继续？
应该 Retry、Resume、Reopen、Cancel 还是 Terminate？
```

### 5. 治理税

共享层开始出现以后，还要持续承担：

- Contract 兼容；
- 版本；
- Eval；
- 监控；
- 发布；
- Migration；
- 文档；
- Owner；
- 退役策略。

如果一个“公共平台能力”只有一个真实调用方，却已经开始维护这些东西，通常说明抽象时机过早。

---

## 责任应该放在哪一层，而不是全塞进 Agent

旧平台研究曾用六层模型定位责任。这个模型到今天仍然有价值，但我把它当成**分析工具**，不是要求部署六个服务。

| 层 | 负责什么 | 不应该吞掉什么 |
|---|---|---|
| 表现层 | Chat、Web、CLI、IDE、Mobile 的交互和结果呈现 | Task 真值、权限规则 |
| 编排层 | 多步骤、Task、路由、Handoff、等待和恢复 | 专业推理本身 |
| 认知层 | 理解、计划、判断、Review | 持久状态和硬安全边界 |
| 能力层 | 稳定 Capability / Skill / Port | Provider 私有细节 |
| 执行层 | Tool、Executor、Adapter、Sandbox、真实副作用 | 产品语义决定 |
| 基础层 | 模型、Git、DB、网络、身份、设备、Cloud / Local | 业务领域语言 |

除此之外，还有几类责任天然横跨多个层：

```text
身份 / 权限
状态 / 存储
证据 / 审计
可观测性 / Eval
治理 / 演进
```

这个分层真正要防止的是两种错误。

第一种是**模型吞掉系统责任**。例如把权限写在 Prompt 里，把 Task State 放在聊天历史里，把“测试通过”当成模型自述。

第二种是**平台吞掉产品责任**。例如把 Story、Character、Scene、Shot 这类 AI 视频业务对象提前做成通用平台模型。

好的边界不是层越多越好，而是每类事实有一个真正应该拥有它的 Owner。

---

## 一个很重要的反例：旧 ai-agent-platform 证明“能设计出来”不等于“现在就值得拥有”

旧 `ai-agent-platform` 曾经形成过非常完整的目标模型：Platform Registry、Asset Relation、Release、Migration、Projection、Knowledge Pack、Task Control、Evidence、Recovery、Agent Profile 等都有细致设计。

其中很多判断本身并没有错。问题在于，当时一部分复杂度跑在真实需求前面。

例如知识体系一度尝试维护：

```text
本地资产
↔ Registry ID
↔ Relation
↔ Release
↔ Migration
↔ Feishu Projection
```

工程上完全可以做出来，Schema、Validator 和流程也可以很严谨。

但当真实目标只是“把成熟知识整理出来并发布给人看”时，这套映射产生的维护成本明显高于它解决的问题。

后来的体系因此转向更轻的原则：

```text
本地材料自然积累
→ 成熟主题提炼
→ 正式知识
→ 需要时再投影
```

也就是“轻映射、重提炼”。

这段经历给复杂度控制留下一个非常直接的判断：

> **一个抽象可以被实现，不等于它已经拥有存在价值。**

平台设计最危险的不是技术做不到，而是能做、做得很漂亮、但真实调用方还没有出现。

---

## ProFlow 给出的另一面：真正需要复杂度时，不要假装它不存在

“不要过度设计”也不能走到另一个极端：为了架构简单，把已经真实出现的状态问题继续塞在 Chat 或临时脚本里。

ProFlow 的长期任务就属于这种情况。

当系统开始需要：

- Product / Dev / Test 长期角色；
- Task / Node；
- Worker Binding；
- Browser Conversation；
- WAITING / FAILED / REOPEN；
- `runNo`；
- 正式 Requirement / Test Result；
- 跨浏览器重启恢复；

这些问题已经不能靠“Prompt 写清楚一点”解决。

它们需要正式身份、状态和 Owner。

所以 ProFlow 一边主动减少角色、限制动态能力，一边又真正建设 Task / Node / Binding / Recovery。这看起来是两个相反动作，其实遵循同一原则：

```text
没有真实需求的复杂度 → 删除
已经成为长期事实的复杂度 → 正式建模
```

复杂度控制从来不是“一律做简单”，而是**只为真实复杂性付费。**

---

## 本机 Agent 工具链说明了第三条原则：先分清 Fact Owner，再决定要不要增加组件

本机 Agent 工具链一开始只有一个通用本机 Tool，理论上已经可以读文件、跑命令和 grep。

后面之所以增加 CodeGraph、Repomix、Playwright，不是因为“工具越多越强”，而是出现了三类清楚的事实边界：

- 代码调用链和 blast radius 反复靠 grep 重建，应该有结构 Owner；
- 大仓库上下文反复零碎读取，应该有大范围 Snapshot Owner；
- UI 最终结果无法由源码证明，应该有真实 Browser Owner。

随后 Skill 和 Automation 也是同样逻辑：

```text
工具已经能做
但 Chat 反复用错 / 重复调用
→ Skill 负责方法约束

方法已经稳定
但每轮仍让模型执行机械步骤
→ Automation / Runner 下沉确定性流程
```

甚至 `mcp-shared-broker` 也经历过一次重要收缩：它可以被设计成更通用的共享 Broker，但实践证明真正需要 shared owner 的主要是 Browser；Local Dev、CodeGraph、Repomix 没必要为了“统一”都经过 Broker。

于是复杂度又被主动降回去了。

这说明组件数量不是目标。正确问题永远是：

> **新增这一层以后，哪个真实责任有了更清楚、更便宜、更可靠的 Owner？**

答不出来，就不该加。

---

## 什么时候应该升级：先找“上一层无法承受的压力”

实践里可以按下面顺序判断。

### 先问 1：这是模型能力问题，还是工程责任问题？

如果只是模型不理解领域、推理质量不足，先改善 Context、Knowledge、模型或问题表达。

不要因为一次回答不好，就增加 Workflow、Agent Role 或 Registry。

### 再问 2：确定性代码能不能解决？

如果输入输出和规则已经明确，优先 Script / Application Service。

只有仍然需要语义判断时，才需要 Agent / Skill。

### 再问 3：Agent 是否真的需要进入真实环境？

如果任务只需要分析、建议和写作，Chat 可能已经足够。

只有需要持续读取反馈、执行、验证，才值得给 Agent Tool 和 Runtime。

### 再问 4：有没有跨出本地边界的真实副作用？

如果要写外部系统、提交表单、发布、付款、创建远端资源，就需要身份、Policy、Approval 和副作用核对。

### 再问 5：任务状态是否必须脱离当前 Session？

如果一次对话内可以安全完成，不要急着建设 Task Store。

只有跨 Session、等待、并发、恢复、正式交接已经出现，Task Control 才有价值。

### 再问 6：多个 Agent 是否真的拥有不同责任？

如果只是 Prompt 不同，先考虑单 Agent + Skill。

只有独立 Context、Permission、Model、并行、验收或失败隔离真实存在时，才拆 Agent。

### 最后问 7：平台复用已经发生了吗？

不要用“以后应该会有第二个产品”证明平台层。

至少要看到第二个真实调用场景，并且共享机制比复制实现明显更便宜、更可靠。

---

## 一张实用决策表：用最小系统解决当前问题

| 真实问题 | 优先选择 | 暂时不要做 |
|---|---|---|
| 固定规则转换 / 校验 | Script / 普通代码 | Agent |
| 需要分析、设计、写作 | Chat / Model | Task Runtime |
| 需要多步读写代码和测试 | Coding Agent | 多 Agent 平台 |
| 需要重复语义方法 | Agent + Skill | 为每个方法新建 Agent |
| 需要访问一个外部 API | Tool / Adapter + 明确权限 | 通用 Capability Registry |
| 有高风险外部写入 | Tool + Policy + Approval + Readback | 只靠 Prompt 禁止 |
| 任务跨 Session / 等待 / 恢复 | Task Control / Workflow | 把状态藏进聊天 |
| 不同专业责任需要隔离 | 多 Agent + Handoff | 复制同一上下文制造角色 |
| 同一控制机制被多个真实产品复用 | Platform capability | 预建全平台 |
| Provider 只有一个且近期不会替换 | 直接 Adapter / 配置 | 空洞 Router |
| UI 只需要线性三步 | Application Service | Workflow Engine |

这张表的目标不是限制未来，而是避免在还没有证据的时候购买未来复杂度。

---

## 把这套判断放回我的实际需求：现在到底该停在哪一层

如果只看前面的 L0～L6，很容易误以为一个人的整套系统应该统一停在某一级。我的实际情况恰好说明这不是正确用法：**不同问题应该停在不同复杂度，整个工作区是一种混合架构，而不是“整体升级到 Agent Platform”。**

| 我的真实需求 | 最小合适形态 | 现在的做法 | 为什么不能更轻 | 为什么暂时不该更重 | 继续升级的真实信号 |
|---|---|---|---|---|---|
| 技术研究、架构判断、知识提炼 | L2 Chat / 高能力 Model | Chat 负责分析、综合、写作和决策；正式结论再进入 Git 知识 | 纯 Script 无法完成开放式语义判断 | 大部分工作没有长期业务状态，不需要 Task Runtime | 研究任务开始跨天自动运行、需要事件等待、独立恢复和正式状态 |
| 本机工程修改与真实验证 | L3～L4 Agent + Tool | Chat 通过 Local Dev、CodeGraph、Repomix、Playwright 直接读取和操作真实工程；Skill 约束方法，Automation 承担机械步骤 | 只聊天会重新变成人工搬运文件、日志和 Browser 结果 | 每一次代码修改都建持久 Task 会增加无收益的状态和治理成本 | 大量工程任务必须跨 Session 持续、并发执行，并且需要统一 Task 身份和恢复 |
| Motor / Monitor 自迭代 | L4 为主，带少量 L5 特征 | Chat 能观察真实系统、使用本机工具、执行、验收，并通过 loop / handoff 继续下一轮 | 单纯 Chat 建议无法形成观察→执行→验证→再决策闭环 | 当前不需要为了 Motor 再复制一套通用 Task Platform；长期业务状态仍应由真正的产品 Owner 承担 | Motor 自身出现独立长期 Task、并发 Worker、正式审批、跨 Session 状态和恢复需求 |
| ProFlow 的长期产品迭代 | L5 Task Control + 有界 Multi-Agent | Task / Node、Role / Worker Binding、正式 Handoff、WAITING / FAILED / REOPEN、`runNo`、Browser Reality 等已经成为产品事实 | Session 和 Prompt 无法可靠承载长期身份、失败历史和恢复 | 还不能仅因为 ProFlow 一套产品已经复杂，就宣称需要通用 L6 平台 | 第二个真实产品复用同一 Task / Approval / Evidence / Recovery 合同，并证明共享比复制更便宜 |
| ChatWeb 产品本身 | 普通应用 + 按需 L4 Tool 能力 | Conversation、Streaming、Provider、RAG、Web Search、Vision / File / Voice 等由 Chat Runtime 组合 | 需要真实产品 Runtime，不能只靠一次模型调用 | ChatWeb 的产品目标不是建设通用 Agent Control Plane，不应把 ProFlow 的 Task 模型硬塞进去 | 产品真的出现长任务、后台 Agent、等待 / 恢复，并且这些成为用户可见核心语义 |
| ProFlow RAG | Capability Service（能力服务） | 独立负责 Knowledge、Retrieval、Evidence、Context、Citation 和 API；质量通过 Eval 与维护流程治理 | 普通 Prompt 不能替代稳定检索和引用服务 | RAG 服务本身不需要为了“AI 化”拥有 Agent、Workflow 或多角色 | 出现必须由动态 Agent 长期规划检索、跨步骤研究并持久恢复的业务需求 |
| 知识发布 | L2 语义判断 + L0 Automation | 人 / 模型决定什么值得提炼和怎样表达；成熟以后由确定性 Publisher 做查重、上传、覆盖和回读 | 全自动 Script 不能决定知识价值、事实强度和文章结构 | 发布机械过程已经足够确定，不值得每一步继续让 Agent 自由决策 | 发布渠道真正出现多阶段审批、异步等待、跨系统补偿，而且普通 Automation 无法稳定承载 |
| `proton-workspace` 公共能力 | 共享 Tool / Skill / Automation，而不是产品平台 | 工作区共享本机工具、Skills、自动化和知识；各产品仍拥有自己的产品真值 | 每个项目各造一份 Local Dev / Browser / 写作规则会重复维护 | “跨项目共享一些工程能力”不等于“所有产品必须共享一套业务 Control Plane” | 多个产品开始重复同一稳定运行时责任，并且共享合同已经被真实验证 |
| 未来 AI 视频工作流 | 先从产品纵向切片开始 | 当前仍是研究候选，Story / Character / Scene / Shot 等应先属于产品领域 | 只做单次视频生成无法验证真正的创作工作流价值 | 不能因为未来可能复杂，就提前建设完整媒体平台和通用 Agent 平台 | 第二个真实业务也重复需要同样的 Provider、Approval、Evidence、Recovery 等通用机制 |

这张表带来的结论和“我们现在缺不缺一个 Agent Platform”很不一样。

**当前真正合理的状态不是把所有东西统一升级，而是有意保持分层：**

```text
开放式判断
→ Chat / Agent

确定性机械动作
→ Script / Automation

真实本机与外部世界
→ Tool / Adapter / Browser

真正长期、有业务状态的协作
→ ProFlow Task Control

跨产品已经证明稳定的工程能力
→ proton-workspace 共享 Tool / Skill / Automation

只有多个真实产品反复需要同一套长期控制机制
→ 再考虑 L6 Agent Platform
```

这也解释了为什么旧 `ai-agent-platform` 拆掉以后，并不是“平台方向失败了”。真正被保留下来的能力反而更清楚：应该属于产品的回到产品，应该属于共享工程基础设施的进入 workspace，已经确定的机械步骤下降为 Automation，只有仍然需要动态判断的部分留给 Agent。

所以按我当前的需求，最重要的并不是“还差哪一个大平台模块”，而是继续保持这条边界：**ProFlow 为已经真实出现的长期任务复杂度付费；Motor 为观察、判断和迭代闭环付费；公共工作区只共享真正重复的能力。等第二个产品把同一套控制问题再次逼出来，再购买更高一级的平台复杂度。**

---

## 降级也是正确决策，而且往往比升级更难

工程文化通常更容易奖励“加了什么”，很少奖励“删掉一层”。但 Agent 系统越长期，主动降级越重要。

下面这些情况都应该认真考虑降级。

### Agent 不稳定，但规则已经稳定

```text
Agent
→ Script / deterministic runner
```

如果模型每次都在做相同判断，而且答案已经可以写成程序，就不应该继续付推理成本。

### 多 Agent 只是复制上下文

```text
多个近似角色
→ 单 Agent + 多 Skill / Reference
```

没有独立身份、权限、并行和验证价值时，角色数量只会增加 Handoff。

### Workflow 只有线性固定步骤

```text
Workflow Engine
→ Application Service / Script
```

没有长期状态，就不要人为制造状态机。

### Provider Router 实际没有选择

```text
Router
→ 一个明确 Adapter
```

一个 Provider 不需要“路由架构”。

### Task Store 没有跨 Session 价值

```text
Persistent Task
→ Session State
```

如果任务天然短小、失败可重跑，持久化状态只会增加治理成本。

### Registry 没有真实消费者

```text
复杂 Registry
→ 文件系统 / Git / 一个轻量索引
```

结构化资产关系只有被检索、影响分析、发布或运行时真正消费时才有价值。

### 公共 Broker 没有共享 Owner 问题

```text
Shared Broker
→ Direct Runtime
```

本机工具链最终把 Broker 收窄到 Browser，就是一个真实例子。

降级不是“架构失败”，而是系统终于知道自己真正需要什么。

---

## 平台成立以后，也必须持续证明它仍然值得存在

一个平台能力一旦建立，并不意味着永久合理。

它需要持续回答：

```text
还有几个真实调用方？
是否真的减少重复实现？
升级一次要改几个产品？
Contract 是否稳定？
运行成本和治理成本是多少？
有没有更成熟的外部能力可以替代？
如果移除这一层，上层会不会反而更简单？
```

尤其在 AI 生态里，外部产品变化很快。曾经必须自建的能力，半年后可能已经成为 Codex、ChatGPT、云平台或开源 Runtime 的成熟能力。

此时正确动作可能不是继续维护自研系统，而是退回 Adapter，只保留自己的业务语义和必要控制面。

这也是为什么“Build vs Buy vs Compose”不应该只在项目启动时做一次。Agent 平台需要周期性重新判断：**这层复杂度是不是还在替我们省钱。**

---

## “平台化”最值得保留的不是架构图，而是一组不变量

回头看旧平台研究，真正值得留下来的并不是完整模块图，而是下面这些长期判断：

1. **模型能判断，不代表系统已经拥有状态。**
2. **Tool 能执行，不代表 Agent 有权执行。**
3. **命令返回失败，不代表副作用一定没有发生。**
4. **Session 能继续聊天，不代表长期 Task 有正式身份。**
5. **Prompt 能描述规则，不代表它是硬安全边界。**
6. **多 Agent 能并行，不代表人能并行验收同样多的结果。**
7. **抽象可以实现，不代表已经有真实复用价值。**
8. **一个平台能力只有让多个真实场景更简单，才值得成为平台。**
9. **确定性越高，越应该下沉到 Script / Automation。**
10. **复杂度需要可以退出，不能只能继续叠加。**

这些不变量比某个 Agent 框架的 API 更耐久。

---

## 如果只记一个判断流程，就记这一条

面对任何“要不要再加一层”的设计，可以按这个顺序走：

```text
当前问题是什么？
    ↓
它是事实 / Context / 模型能力问题吗？
    ├─ 是 → 先修事实和认知输入
    ↓ 否
规则已经确定吗？
    ├─ 是 → Script / 普通代码
    ↓ 否
需要持续语义判断吗？
    ├─ 是 → Agent / Skill
    ↓
需要操作真实外部系统吗？
    ├─ 是 → Tool + Permission / Policy / Readback
    ↓
状态必须跨 Session 吗？
    ├─ 是 → Workflow / Task Control
    ↓
多个角色真的需要独立 Context / Permission / 并行 / Review 吗？
    ├─ 是 → Multi-Agent
    ↓
同一控制机制已经被多个真实产品复用吗？
    ├─ 是 → Platform capability
    ↓
否则停在当前层级
```

这里的“停”不是放弃演进，而是明确告诉系统：**现在没有足够证据购买下一层复杂度。**

---

## 最后的判断：成熟不是层级更高，而是责任更清楚

从代码补全、Chat、Coding Agent、本机 Tool、ProFlow 到旧 `ai-agent-platform`，我自己的理解发生过一个很明显的变化。

早期很容易把“能力更多”理解成进步：更多 Agent、更多 Workflow、更多平台模块、更多 Registry、更多自动化。

真正经历长任务、外部副作用、Browser Reality、失败恢复、多 Agent 协作和平台过度设计以后，评价标准变了。

我现在更关心：

```text
这个问题真正的 Owner 是谁？
哪一层必须做判断？
哪一层应该确定性执行？
状态应该活多久？
权限在哪里强制？
失败以后怎样恢复？
结果怎样证明？
这一层复杂度有没有真实调用方？
能不能删？
```

所以 Agent 工程的成熟，不是系统最终都长成 Agent Platform，而是它越来越知道：**什么责任必须由系统正式承担，什么应该留给模型判断，什么应该下降为确定性代码，什么根本不该存在。**

如果要把整篇压成两句话，就是：

> **复杂度要由真实需求购买。**
>
> **使用能够稳定完成任务并证明结果的最低复杂度架构；升级要有证据，降级也同样是正确的工程决策。**
