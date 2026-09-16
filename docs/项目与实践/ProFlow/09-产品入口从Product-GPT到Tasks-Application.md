# ProFlow｜产品入口从 Product GPT 到 Tasks Application

> 状态：ACTIVE_RESEARCH / STRONG_EVIDENCE
> 建立：2026-09-04
> 主题：ProFlow 的产品入口如何从“在 Chat 里先想清楚再建 Task”，逐步演进成确定性 Application bootstrap + Task 状态机 + Product Worker cognition + 独立 Tasks Web surface。
> 边界：当前 `Side Panel → loopback /tasks` 仍处 dirty working tree；本文会严格区分 Git 历史与当前磁盘事实。

## 1. 这条历史不是 UI 改版史，而是 Authority 迁移史

如果只看最终界面，会误以为 ProFlow 做了几次前端重构：

```text
Product GPT
→ Extension Side Panel
→ ProFlow Tasks Page
```

真正变化的是：**哪些事情允许模型决定，哪些事情必须由确定性 Application / Task Owner 决定。**

最终形成的分工更接近：

```text
Application / Task Owner
→ 建立确定性的 Task shell、固定角色槽位、readiness、start/reopen 控制

Product Worker
→ 澄清目标、约束、验收，写正式 REQUIREMENT

Execution / Browser
→ 创建/恢复真实 Worker Conversation 与其它 real-world effects

Tasks Surface
→ 给人提供明确、可观察、可恢复的产品控制面
```

所以产品入口演进的核心原则不是“哪个入口更智能”，而是：

> **Authority follows determinism. 能确定的事情离开模型；真正需要认知判断的事情留给模型。**

## 2. 第一阶段：8 月 13 日，Product GPT 真的拥有 pre-Task bootstrap

`GIT_VERIFIED` — `45b2a97`（2026-08-13，Agent Core Wave 4）中的 Product GPT Instructions 明确写：

```text
先与用户完整澄清需求
→ 需求充分后再创建 Task
```

它当时的 Action surface 还直接包含：

```text
listRegisteredRoles
getRegisteredRole
createTask
getTask
putTaskDocument
getTaskDocument
askPeer
replyPeer
```

这说明早期产品主线是：

```text
Conversation first
→ Product GPT 理解需求
→ GPT 查询可用角色
→ GPT 创建 Task
→ 后续进入协作
```

也就是说，**认知、组队发现和系统 bootstrap 曾经集中在 Product GPT 一侧。**

## 3. 为什么后来把 New Task 从 Product GPT 拿走

`GIT_VERIFIED` — 2026-08-15 的文档 / 测试 / 实现序列非常清楚：

```text
41107b6  文档 overlay 先删除 Product GPT 的 createTask / role discovery Actions
8e66b90  v2.1 architecture ruling 正式冻结 Extension-first New Task
 a33a477  test/proof expectation 锁定新的 Product Action surface
32363da  Task / Agent identity 与 worker binding 实现迁移
7643d24  Product Instructions 最终同步为“GPT 不创建 Task”
```

新的 Product Instructions 变成：

```text
Extension 先 createTask(PENDING)
→ Product Worker 被绑定到已存在的 Task
→ Product 再澄清 Requirement
→ putTaskDocument(REQUIREMENT)
```

这不是削弱 Agent，而是把确定性工作拿回系统：

```text
固定三个长期岗位
固定 Task shell / Plan / RoleBinding slot
固定 readiness prerequisite
```

这些不需要模型动态发现、猜测或规划。

## 4. 第一层 Authority Migration：Cognition-owned Bootstrap → Application-owned Bootstrap

早期：

```text
Product GPT
= requirement cognition
+ role discovery
+ create Task
```

迁移后：

```text
Application / Task Owner
= create deterministic PENDING Task
+ establish fixed Product / Dev / Test-Ops role slots

Product GPT
= work inside existing Task
+ clarify requirement
+ persist formal requirement through owner contract
```

`DERIVED` — 这是 ProFlow 从“Agent 当系统大脑”向“Agent 嵌入可信状态机”迈出的关键一步。

模型仍然拥有高价值认知，但不再拥有无需认知的 topology/bootstrap authority。

## 5. Side Panel 一开始甚至不是 Task Application

`GIT_VERIFIED` — `f309934`（2026-08-13，Execution Browser Carrier Wave 5）第一次引入 Side Panel。

当时页面标题只是：

```text
ProFlow Browser Status
```

TS 逻辑几乎只有：

```text
PROFLOW_SIDE_PANEL_SNAPSHOT
→ JSON.stringify(snapshot)
→ 每 2 秒刷新
```

所以 Side Panel 的起点是**Browser reality / status observation surface**，不是产品任务中心。

这一点很重要，因为后来的 Task Application 并非从一开始就预设，而是在真实主线需要明确人类控制面后逐步长出来。

## 6. 8 月 16 日：Side Panel 开始承担真正的产品 Application

`GIT_VERIFIED` — `5996c15` 把 Side Panel 从 status viewer 大幅扩展为 Task Application，开始支持：

```text
task.list
task.get
task.create
task.start
task.ensureWorkers
node.reopen
```

并逐步加入：

```text
Approval UI
System Assessment summary
Browser Carrier status
```

这里出现了另一个重要变化：

> **用户与系统之间不再只有 GPT Conversation。**

人开始拥有一个显式产品控制面，用来创建、观察、确认启动、恢复 Worker、处理 Approval，而不是要求某个 Agent 在对话里间接代表这些系统操作。

## 7. 第二层 Authority Refinement：Application 也不能拥有 Requirement cognition

Side Panel 刚成为 Task Application 时，第一版 New Task 表单允许用户直接填写 Requirement，并由 Extension 在 `createTask` 时 seed：

```text
initialDocuments = [REQUIREMENT]
```

这其实和新 Product 语义发生了冲突：如果 Product Worker 的职责是和用户澄清 Requirement，那么 Application 预写正式 Requirement 就绕过了 Product cognition。

`GIT_VERIFIED` — `55022cb`（2026-08-16）在 commit message 里直接写：

```text
F2-R02/P1-19:
Extension New Task no longer seeds the formal REQUIREMENT.
```

实现同步改成：

```text
initialDocuments: []
```

UI 也从 Requirement textarea 改成：

```text
Requirement clarified by the Product Worker after binding; not seeded here.
```

所以 Authority 不是简单从 GPT 全部搬给 Application，而是再次细分：

```text
Application owns deterministic structure
Product Worker owns ambiguous requirement cognition
Task Owner owns formal Requirement fact
```

## 8. Product-first 并不等于重新把系统卡在 Product GPT 上

`GIT_VERIFIED` — `55022cb` 同时把三角色 Worker provisioning 从串行 Product→Dev→Test 改成并发；`d894a51`（2026-08-16）又进一步定义：

```text
三个 worker.create 同时 dispatch
→ task.create 只等待 Product Worker durable bind
→ Dev / Test provisioning 继续作为 durable、idempotent Execution effects
→ 缺失 binding 由 ensureWorkers 后续恢复
```

commit message 明确写：

```text
Task stays PENDING until all three bindings + requirement exist.
```

因此 Product-first 的真实含义是：

> **先让需求沟通路径可用，而不是让 Product GPT 重新成为整个系统的串行阻塞点。**

当前 Task readiness 仍由确定性规则控制：Requirement + 三个完整 RoleBinding 缺一不可。

## 9. 一个更成熟的产品循环由此形成

```text
用户在 Application 建立 Task shell
→ 系统并发创建三个 Worker Conversation
→ Product durable bind 后先与用户澄清
→ Product 写 REQUIREMENT
→ Dev/Test Worker 继续完成 binding
→ Requirement + 3 bindings 完整
→ Task deterministic READY
→ 用户 Confirm / Start
→ Dev / Test-Ops 进入正式 Node 工作
```

这个循环里没有任何一层可以单独“宣布系统 ready”：

- Conversation 打开 ≠ binding 完整；
- Product 说需求清楚 ≠ REQUIREMENT 已正式写入；
- 三个 Worker 存在 ≠ Task READY；
- UI button 可点 ≠ Owner prerequisite 满足。

## 10. 当前又发生一次产品入口迁移：Side Panel → ProFlow Tasks

`CURRENT_DISK_VERIFIED / NOT_GIT_FROZEN` — 当前 dirty working tree 已把：

```text
side-panel.html → tasks.html
side-panel.ts   → tasks.ts
```

同时 Manifest 删除：

```text
sidePanel permission
side_panel default_path
```

改成 Extension Action：

```text
Open ProFlow Tasks
```

所以这不是当前已经提交的历史节点，不能写成 frozen final architecture；但当前磁盘和 Public Context 已经能证明它正在承担真实 Real-3 产品入口。

## 11. 为什么不继续使用 chrome-extension:// Side Panel

这次迁移有一个非常具体的现实触发，而不是“普通网页看起来更好”。

`SOURCE_VERIFIED` — Real-3 工具运行中机械确认：Playwright Extension 可以看到另一个 Extension 的 `chrome-extension://...` Tab，甚至加入同一 controlled group，但 Chrome 在真正 `chrome.debugger.attach` 时会拒绝：

```text
Cannot access a chrome-extension:// URL of different extension
```

因此必须区分：

```text
Tab visible in group
≠ Playwright debugger attached
≠ DOM / snapshot / screenshot controllable
```

原 Extension 页面仍可以通过 AX / 系统截图做 privileged UI 自动化，但这会让普通产品 Task 操作落入昂贵、抢焦点、系统级的 Reality path。

## 12. loopback `/tasks` 把普通产品 UI 放回正常 Web Reality Plane

当前主路径变成：

```text
用户点击 Extension action
→ Extension runtime 使用内部 bearer 请求 /v1/tasks/session
→ Bridge mint one-time bootstrap
→ 打开原始 /tasks/bootstrap/<token> Tab
→ 302 到 /tasks
→ HttpOnly / SameSite=Strict / Path=/tasks session
→ 普通 Tasks Web UI
```

Web surface 暴露：

```text
/tasks
/tasks/app.js
/tasks/api/status
/tasks/api/task
/tasks/api/approval
```

但 Platform Host bearer 不暴露到页面；页面只持有 scope 到 `/tasks` 的 HttpOnly loopback session。

如果 Bridge 不可用，才 fallback 到 Extension-owned `tasks.html`。

这意味着 Product Surface 和 privileged Extension capability 被正式分层：

```text
普通 Task / Approval / status interaction
→ loopback Web / Playwright

Chrome privileged UI / extension install / cross-extension forbidden target
→ AX / system UI helper
```

## 13. 为什么这个变化对自动化验收也重要

ProFlow 的真实用户入口仍然是 Extension action，不是测试代码直接访问内部 API。

Public Context 已冻结：

```text
每次打开/恢复 Tasks
→ 必须真实触发 Extension action
→ mint 新 session
→ 使用 action 打开的原始 Tasks Tab
→ 把原 Tab 纳入 Playwright controlled group
```

禁止：

```text
页面已经存在
→ 测试 harness 偷懒复用旧 session

或

额外复制一个 /tasks Tab
→ 让 Playwright 看得见
```

因为这会污染真实 tab/session identity，甚至给 Browser Carrier 引入重复 reality。

所以这个 Web surface 同时服务两个目标：

1. 降低普通用户产品交互对 privileged UI 的依赖；
2. 让真实 E2E 能在不抢用户焦点的 Playwright Reality Plane 里稳定观察和操作。

## 14. 这条演进最值得讲的不是“做了页面”

更准确的历史是：

```text
Product GPT owns pre-Task cognition + bootstrap
↓
Application owns deterministic New Task / fixed team shell
↓
Product Worker owns Requirement cognition
↓
Task Owner owns readiness / formal facts
↓
Side Panel grows from status viewer into human control surface
↓
ordinary product surface separates from privileged Extension UI
↓
loopback Tasks Web becomes controllable Reality Plane
```

`DERIVED` — ProFlow 的产品化过程实际上不断在问：

> **这一步真的需要模型判断吗？真的需要 privileged Browser UI 吗？如果不需要，就把它迁回更确定、更可观察、更可恢复的层。**

## 15. Trade-off

这条路线也增加了系统成本：

- Application 需要自己的 UI / operation envelope；
- loopback Web 需要 session/bootstrap/cookie 安全边界；
- Bridge unavailable 仍要保留 extension-page fallback；
- Product-first 创建意味着 Task 会合法停留在 PENDING，需要 readiness 正确表达“Requirement/Bindings 尚未齐”；
- 显式 Application 比“所有事情都在 Chat 里做”更不魔法，但也更可治理。

项目主动接受这些成本，换取：

```text
更少的模型隐式 Authority
更清晰的人类控制面
更稳定的 restart / recovery
更可靠的 Browser automation
更低的测试与用户焦点干扰
```

## 16. Resume / Interview 边界

可以安全讲：

> 将早期由 Product GPT 承担的角色发现和 Task 创建逐步迁回确定性 Application/Task Owner，只保留 Requirement 澄清等真正需要模型认知的环节；同时把 Browser Side Panel 从状态查看器演进成显式 Task 控制面，并在真实 Chrome 跨扩展 debugger 限制下继续迁移为 Browser-package-owned loopback Tasks Web surface，使普通产品交互能进入可自动化、可观察的 Web Reality Plane。

不能讲：

- 当前 `/tasks` dirty migration 已经 Final/Frozen；
- 已完成 Real-3 全 Journey；
- 这是通用 Agent UI Framework；
- Side Panel 迁移只是为了“方便测试”。

最核心的可复用判断是：

> **Authority follows determinism；Product surface follows observability.**
