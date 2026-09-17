# 为什么选择 ChatGPT，又为什么必须拥有自己的 Control Plane

如果 ChatGPT 已经有对话、模型、文件、搜索、代码解释器和 Custom GPT，为什么还要再做 ProFlow？反过来，如果 ProFlow 要自己管理任务、执行、恢复和部署，为什么不干脆把聊天产品也一起重做？

理解 ProFlow 最省力的入口不是先看模块，而是先回答这个问题。项目最后形成的边界是：**成熟的交互、认知和协议能力尽量复用；一旦进入长期业务事实、真实副作用和恢复，决定权必须回到自己的系统。**

Control Plane（控制面：保存正式业务事实、权限、状态转换和恢复规则的系统层）就是为这件事存在的。它不是为了把 ChatGPT 包一层，也不是为了证明“自研比复用高级”，而是让外部 Host（宿主：提供模型、Conversation、文件、Actions 等成熟产品能力的平台）发生变化时，Task、身份、权限和真实执行仍然有稳定真值。

## 先看一次真实动作，边界就会清楚很多

用户在一个专业角色里提出需求时，最容易想象成：模型理解需求，调用工具，拿结果，再回复用户。

ProFlow 从早期 MVP（最小可行产品：用最低成本验证关键假设的版本）开始，就没有让这条链直接获得本机最终权限：

```text
用户自然语言
→ ChatGPT / Custom GPT 认知
→ typed Action（类型化动作：把自然语言意图收敛成明确的操作合同）
→ Gateway（网关：认证并把外部请求送到正确内部边界）
→ Domain Owner / Policy
→ Execution
→ Mac / Browser / SaaS / Model 等 Reality
→ readback / Evidence
→ 正式业务状态
→ 返回 Conversation
```

Host 负责“理解和交互”，ProFlow 负责“这个意图是否合法、谁有权处理、真实动作有没有发生、结果是否足以改变业务状态”。

所以“基于 ChatGPT”从来不等于“把业务状态保存在 ChatGPT”。

## 三种都在用模型的东西，实际上不是同一类系统

项目历史里反复出现一种诱惑：既然它们都叫 GPT、都能推理，就让它们共用职责。真正跑起来以后，三者必须分开。

| 形态 | 主要用途 | 可以拥有 | 不应该拥有 |
| --- | --- | --- | --- |
| 研发 Chat | 和人讨论、读工程 Context、做架构判断、操作工程工具 | 当前研发上下文、受限工程工具使用权 | 产品 Task、Approval、Execution 的正式真值 |
| Product / Dev / Test Custom GPT | 承载专业角色、Conversation、Actions 和局部认知 | 当前角色认知、当前会话 | 任意本机权限、Task 数据库、全局工作流决定权 |
| Model Runtime（模型运行时：为平台内部提供受控 FAST / REASON 等推理能力） | 分类、诊断、有界推理 | capability、queue、inference result | Workflow Authority、Human Approval、无限 Tool Loop |

一个产品 Agent 能调用 Action，不代表它应该任意改 Task；一个本地模型能返回 `ALLOW`，也不等于系统已经授权；研发 Chat 能修改 ProFlow 源码，更不意味着它是产品里的第四个业务 Agent。

这条边界后来可以压成一句话：**谁能思考，不等于谁拥有事实；谁能执行，不等于谁拥有决定权。**

## 三条桥解决的是三个完全不同的方向

### 研发桥：Chat 怎样进入本机工程

最早的工程链路很笨重：本机仓库人工打包给 Web Chat，Chat 再生成 planner / executor handoff，本地执行器修改后重新打包审计。08-01～08-02 的 `3db6f0a`、`2c365d3`、`6f7a007`、`85423d2`、`f0699e8` 等提交保留了这段痕迹。

后面的工具并不是一次设计出来，而是每遇到一个已经证明存在的瓶颈才增加：

```text
人工搬上下文太慢
→ Local Dev / MCP

大仓结构与 blast radius 查询太慢
→ CodeGraph

人替 AI 看真实页面太慢
→ Browser / Playwright

大范围上下文读取仍然吞吐不足
→ Repomix

稳定机械流程每个 Chat 重复思考
→ Script / Skill / Automation
```

最终形成的分工很清楚：Repomix 负责大上下文，CodeGraph 负责结构关系，Local Dev 负责本机现实，Browser 自动化负责页面现实。它们服务的是“开发 ProFlow 的 Chat”，不是产品 Task 的业务状态机。

### Action Bridge：产品 Agent 怎样请求 ProFlow

```text
Product / Dev / Test Conversation
→ Action
→ Public Tunnel
→ Gateway
→ Task / Agent / Execution 等 Owner Contract
→ structured result
```

这里的关键不是 HTTP，而是 Anti-Corruption Layer（防腐层：把外部协议和模型表达隔离在内部领域语义之外）。模型说“我想做什么”，跨越 Gateway 后必须变成有身份、有 schema、有版本、有权限边界的请求。

因此 Action 返回 200 只能说明一次调用链成功，不能自动证明 Task 完成、Effect 已生效或调用者有资格改变任意状态。

### Wake Bridge：平台怎样让已经空闲的 Conversation 再工作

Action 是 request-response。某个 Worker 当前 Turn 结束以后，新的 Task 事实不会凭空进入已经结束的模型推理。

于是系统需要反方向链路：

```text
Task / Collaboration 新事实
→ Observer 形成最小 wake intent
→ Browser Driver 找回原 Worker Conversation
→ 投递 typed wake
→ Worker fresh-read 当前 Task / Node
→ 继续通过正式 Action 工作
```

Wake 只负责“把已经成立的继续信号送进去”。它不拥有“为什么现在应该继续”的业务判断。早期 Browser Host 的一个核心问题，就是把“能看页面、能唤醒”逐渐扩张成了“顺便决定工作流下一步”。

## 为什么一定要自己拥有 Control Plane

可以复用的能力很多，但下面这些事实必须独立于 Host 生存：

| 外部能力可以复用 | ProFlow 必须自己拥有 |
| --- | --- |
| Chat / Conversation UX | Task / Node lifecycle |
| 高能力模型 | Role / Worker / Binding identity |
| Actions / HTTP transport | Auth / Policy / Approval semantics |
| Browser / SaaS UI | Execution intent / Effect / Evidence |
| Tunnel / MCP / Provider 协议 | Recovery / Reality Reconciliation |
| OpenAI-compatible API | Capability qualification / routing |
| Custom GPT 页面 | Product iteration history / owner-backed docs |

如果这些事实跟着某个 SaaS 页面、某段 Conversation 或某个 Provider 的行为一起漂移，系统就没有真正的恢复能力。

因此 ProFlow 后来形成了一个实用的裁决框架：

| 选择 | 什么时候用 | 历史例子 |
| --- | --- | --- |
| `REUSE` | 外部能力成熟，而且不拥有 ProFlow 业务真值 | ChatGPT UX、Git/npm、OpenAI-compatible 协议、工程工具 |
| `WRAP` | 外部能力成熟，但需要补 identity、lifecycle、verification、recovery | Dev Tunnel、模型 Provider、Custom GPT、Browser Reality |
| `BUILD` | 对象本身就是长期事实或 Authority | Task、Execution、Role Binding、Gateway Policy |
| `DELETE` | 自研层开始复制别的 Owner，制造第二真源 | `chatgpt-carrier`、中央 Deployment Planner、万能 Browser workflow |

最实用的判断题是：**如果明天把 ChatGPT、Tunnel 或模型 Provider 换掉，哪些东西应该保持不变？** 应该保持不变的部分，才更接近 ProFlow 真正需要自己拥有的语义。

## Product GPT 为什么曾经能创建 Task，后来又失去这项权限

早期 Product GPT 除了理解产品，还承担过角色发现、Task 创建和协作 bootstrap。08-13 左右，它真实拥有过 `listRegisteredRoles`、`getRegisteredRole`、`createTask`、Task Document 和 peer message 等能力。

这在早期很自然：Product 最先理解用户目标，让它顺手把队伍组起来看起来最省事。

但三角色固定以后，很多事情已经不再需要模型判断：

```text
需要认知判断
→ 目标是什么意思？需求是否合理？Scope 怎么收敛？

已经可以确定
→ 固定有哪些岗位？binding 是否齐？Task 是否 READY？
```

2026-08-15 的 v2.1 因此把确定性 Authority（决定权：谁有资格改变某类正式事实）迁回 Application / Task Owner。`8e66b90`、`a33a477` 先冻结设计与 proof expectation，`32363da` 再把 Product 的 `createTask / listRegisteredRoles / getRegisteredRole` 主链真正删除。

这条变化后来被总结成 Authority follows determinism（决定权跟随确定性：程序已经可以可靠确定的结构和状态，不因为模型更强就继续交给模型）。

## 但 Application 也不能把 Product 的认知工作抢走

Authority 回迁不是“AI 越少做越好”。Side Panel 成为 Task Application 后，第一版 New Task UI 曾预先 seed Requirement；但 Product Worker 本来就负责和用户澄清真正需求，于是同一份 Requirement 出现了两个语义来源。

`55022cb` 随后删除初始 Requirement seeding，把责任重新拆开：

```text
Application
→ 创建确定性 Task shell

Product
→ 完成需求认知与语义收敛

Task Owner
→ 保存正式 Requirement fact
```

这件事比“谁来填一个字段”更重要。它说明 ProFlow 并不是把权力机械地从模型收回程序，而是持续追问：**这一步到底需要认知，还是已经可以确定性完成？**

## 产品入口为什么还会跟着可观察性改变

Browser Extension 的 Side Panel 最初更像运行状态入口，后来逐渐长成 Task application surface。到 09-03 的历史工作树，又出现 Side Panel → loopback `/tasks` Web surface 的迁移探索。

直接原因不是“普通网页更漂亮”，而是 Chrome 安全边界：另一个 Extension 的 `chrome-extension://` 页面即使能被看见，也未必能被 Playwright 真正 debugger attach。于是产品控制面开始靠近更稳定的 Reality Plane（现实观察面：可以可靠读取、自动化和验收的界面）。

这个历史留下的原则是 Product surface follows observability（产品控制面跟随可观察性：正式操作入口应尽量位于可以稳定观察、验收和恢复的界面上）。

历史材料把当时 `/tasks` 迁移标为 `CURRENT_DISK_VERIFIED / NOT_GIT_FROZEN`，所以它能证明当时的方向与问题，不能单独替今天的最终实现作证。

## Custom GPT 也从“在线配置”变成了外部部署资源

早期 Instructions、Knowledge、Capabilities、Action Schema 很像人工维护的 Builder 配置。Real-2 以后，这些角色材料逐渐进入 Agent Package，并通过 Provisioning（资源物化：把本地声明真实创建或同步成外部 SaaS 资源）形成稳定的 g-id / role identity。

```text
Agent Package material
→ GPT Editor
→ Instructions / Knowledge / Action / Auth / Model
→ Private GPT
→ stable g-id
→ live readback
→ durable Role
```

这里仍然遵守 Control Plane 原则：ChatGPT 提供成熟角色载体，但角色的稳定身份、部署状态、Task binding 和恢复语义不能只存在于网页里。

远端 GPT 一旦已经 `LIVE_CREATED`，后续 validation 失败也不能假装“从未创建”再建一个。系统必须承认现实，保留 g-id，在原资源上继续验证或修复。

## Host-first 的成本是什么

复用 ChatGPT 并不是零成本。它只是把一类复杂度换成另一类：

```text
少做
→ Chat UI / Conversation / role UX / model product shell

多做
→ Builder drift / Action auth / external identity
→ Browser reality / provisioning / recovery / acceptance
```

ProFlow 选择承担后面这些边界治理成本，因为这些成本可以被 Adapter、Contract、Evidence 和 Recovery 管住；重新造一个成熟 Chat 产品则会把大量工程预算花在并非项目核心的问题上。

## 最终边界可以压成四层

```text
ChatGPT / Custom GPT Host
→ 交互、角色认知、Conversation、原生能力

ProFlow Control Plane
→ Task / Agent / Policy / Execution / Evidence / Recovery / Deployment

Adapters / Drivers
→ Gateway / Browser / Provider / MCP

Reality
→ Mac / Chrome / SaaS / Model / Registry / 用户真实路径
```

这四层不是说外部 Host 不重要，而是让读者知道每层回答的问题不同：Host 提供成熟体验；Control Plane 保存长期真值；Adapter 把外部机制接进来；Reality 最后用证据决定事情到底有没有发生。

## 历史来源与证据入口

这篇文章主要吸收原研究材料中的：`02-Chat与Custom-GPT及三条本机桥.md`、`09-产品入口从Product-GPT到Tasks-Application.md`、`11-复用成熟能力但自己拥有系统真值.md`、`14-为什么基于ChatGPT从Host复用到自有Control-Plane.md`，并引用 `03-失败路线与架构重启.md`、`13-Browser从万能Host到双平面Reality-Adapter.md`、`15-Custom-GPT从在线配置到外部Deployment-Resource.md` 的相关 Decision Episode（决策事件：旧方案、真实触发、裁决、代价和证据构成的一条变化链）。

这些历史材料回答“为什么走到这里”；今天某个接口、权限或运行路径到底是什么，仍应以当前 `repos/proflow` 的 Spec、源码、测试和真实 Runtime 为准。
