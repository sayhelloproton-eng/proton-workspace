# ProFlow 各领域流程：从产品目标到真实交付，再回到下一轮

第一次从外部看 ProFlow，很容易先看到 Custom GPT、Browser Extension、MCP、模型运行时和一堆 Task API，然后把它理解成“一个工具很多的多 Agent 平台”。真正决定系统形状的不是工具数量，而是**一个产品目标进入以后，哪些事实由谁拥有、怎样推进到真实执行、失败后怎样恢复、完成后怎样决定下一轮。**

这篇文章只做一件事：沿一条端到端 Journey（完整业务旅程：从产品目标进入系统一直走到真实结果和下一轮）把当前五个领域串起来。具体技术专题交给 02～07 深挖，避免这里再变成第二份规格书。

![ProFlow 全景架构图（双飞轮）](../../../assets/知识库/ProFlow全景架构图-双飞轮.png)

## 先建立一个判断框架：事实、决定权、执行权不是一回事

ProFlow 最重要的设计原则是 Fact Owner（事实归属方：某类正式可变事实唯一可信来源）。一个组件可以观察事实、请求动作甚至执行动作，但不因此自动拥有改变业务结论的资格。

当前系统把长期事实拆成五个领域：

| 领域 | 它真正拥有的事实 | 典型问题 |
| --- | --- | --- |
| Task / 任务与编排 | Task、Node、`runNo`、TaskRoleBinding、TaskDocument、TaskGroup、Campaign、Product Intent | 当前工作做到哪里？下一 Node 是谁？这份 Task 是否允许开始？ |
| Agent / 智能体运行与协作 | Agent Package、Role、Role Credential、ProductDiscussionSession、Collaboration Message | 谁承担哪个岗位？哪条 Conversation 属于哪个工作身份？ |
| Execution / 执行 | Intent、Effect、Approval、Result、Artifact、Evidence、UNKNOWN 与恢复 | 一个真实操作到底有没有发生？证据是什么？能否安全重试？ |
| Model / 模型与推理 | FAST / REASON、Capability Profile（模型能力档案：通过真实探测记录当前模型实际能力）、推理队列和 Provider 调用 | 这次需要哪种推理？当前模型真的具备这项能力吗？ |
| Deployment / 部署治理 | Module 生命周期、外部资源、包版本、Workspace 安装与运行状态 | 系统怎样真正被安装、配置、启动、更新和重新观察？ |

`platform-host` 是 Composition Root（组合根：负责装配和连接各领域运行组件的入口），不是第六个业务领域。它可以组合 Task Reconciliation（任务核对：重新读取正式事实并判断是否存在确定性下一步）、Agent、Execution 和 Model 客户端，但不能为了方便再保存一份 Task、Role 或 Execution 真值。

因此整条系统都可以用一个问题检查：

```text
这个事实最终听谁的？
```

答不清时，自动化通常很快会出现第二真源。

## 一张主链先把系统串起来

Phase 4（第四阶段）的正式产品目标链与已经稳定的 Task / Agent / Execution 主链可以放在同一张图里。这里要注意：**架构目标、源码存在和真实验收是不同层级。** 当前 Foundation 仍未 READY，文末会单独列出 2026-09-17 的证据状态。

```text
用户提出产品目标
        │
        ▼
Product Discussion
确认 Goal / Scope / COST / Privacy / License / Risk
        │
        ▼
ProductDocument + scoped ProductIntent
        │
        ▼
Task Owner exactly-once materialize Task(PENDING)
        │
        ├── fresh Product Worker
        ├── fresh Dev Worker
        └── fresh Test/Ops Worker
        │
        ▼
正式 Requirement → TaskDocument
        │
        ▼
Task READY
        │
        ▼
Human start
或仍在 CampaignAuthorization 边界内的合法自动 start
        │
        ▼
Task ACTIVE → Node READY
        │
        ▼
Task Observer / Reconciliation
        │
        ▼
Browser Driver restore + wake 正确 Worker
        │
        ▼
Worker startNode → IN_PROGRESS
        │
        ▼
一个 Worker Turn 内连续工作
├─ Task / Document Actions
├─ askPeer / replyPeer
├─ Repomix / CodeGraph / Local Dev
├─ Web Search / File / Code Interpreter
└─ 需要 durable recovery 的真实 Effect → Execution Runtime
        │
        ▼
Worker complete / wait / fail
        │
        ▼
下一 Node READY → 下一角色
        │
        ▼
最后一个 Node 完成 → Task SUCCEEDED
        │
        ▼
Task Observer STOP_DRIVING
        │
        ▼
terminal evidence 回到 Product Discussion
        │
        ├── GAP_REMAINS → 新 ProductIntent → 新的有界 Task
        └── GOAL_SATISFIED → Campaign CLOSED
```

围绕这条主链还有三条支撑链：Model Runtime 提供受控推理，Deployment 保证真实资源和版本已经存在，Monitor 工程飞轮负责发现并修复 ProFlow 自己的平台缺口。

下面按读者最自然的几个问题展开。

## 一、产品目标为什么不能直接变成 Task

用户说“把这个产品继续做好”时，通常还混着目标、功能、技术方案、成本、部署和很多未知项。直接把这句话变成 Task，会让一个应该有边界的工作单元变成长期需求池。

Phase 4 因此把 ProductDiscussionSession（产品讨论会话：在具体 Task 之前围绕一个产品 Goal 持续收敛目标的正式会话）放在 Task 前面。目标流程是：

```text
Initial Brief
→ 澄清 Goal
→ 确认 Scope / Non-Scope
→ 确认成本、隐私、License、风险边界
→ Research
→ 比较候选方案
→ 第一性原理做减法
→ ProductDocument
→ 一份有边界的 ProductIntent
```

这里的身份必须和 Task Worker 分开：

```text
ProductDiscussionSession
≠
Task-scoped Product Worker
```

产品讨论属于 Goal 级上下文；Task 创建以后，为 Product / Dev / Test 建立新的 Task-scoped Worker（任务内工作实例：只服务这一份 Task 的具体 Conversation）。这样旧产品讨论不会被误当成 Task binding，也不会让不同 Task 共用一条工作 Conversation。

### Product 负责提出工作，Task Owner 负责安全创建

Product 不获得任意 `createTask`、binding 或状态写入权。它提交受约束的 Product Intent（产品意图：描述下一份有界工作应该是什么的正式请求），Task Owner 再验证身份、Goal revision、Scope、Constraints、前序结果和幂等键。

```text
Product cognition
→ ProductDocument
→ submitProductTaskIntent
→ Task Owner validation
→ durable ProductIntent
→ exactly-one Task(PENDING)
```

幂等（同一个语义请求重复提交也不会产生第二份业务结果）在这里非常重要：网络丢响应不能多造一份 Task；同一个 key 如果换了内容也不能悄悄覆盖原 Intent。

### Campaign Authorization 解决“每一轮是否都重新问人”

持续迭代既不能每个 Task 都重新让用户做完全相同的确认，也不能让 Product 自己想开就开。

CampaignAuthorization（活动授权：用户对既定 Goal、Scope、成本、隐私、License 和风险边界的一段持续授权）保存的是允许范围，不是无限权限。

后续 Task 到 READY 时，自动 start 必须重新读取当前事实：

```text
Task 仍 READY？
Campaign 仍 OPEN？
Goal revision 仍一致？
Authorization 未撤销？
Task scope 仍在授权范围内？
成本 / 隐私 / License / 风险未越界？
TaskGroup prerequisite 仍满足？
```

任一不满足就不能自动产生 start Effect。目标实质变化、Scope 明显扩张、付费、OAuth / 新账户授权、隐私或 License 边界变化、高风险不可逆操作，都重新回到人类决策。

## 二、Task 创建以后，为什么还要单独创建三个 Worker

Task 物化后先拥有正式 `taskId`、有序 Node、三个岗位声明和空 binding，但它还没有真实 ChatGPT Worker。

运行期需要把三个长期 Role（角色：稳定职责与权限的逻辑岗位）分别映射成当前 Task 的 Conversation：

```text
Product
Controller / Dev
Test / Ops
```

完整身份链是：

```text
Agent Package
→ deployed Role / g-id
→ Task-bound Worker / c-id
→ conversationLocator
```

其中 `g-id` 表示真实部署的 Custom GPT，`c-id` 表示这份 Task 中该角色的工作 Conversation，`conversationLocator` 是 Browser 以后恢复这条 Conversation 的稳定定位信息。

`tabId / windowId / contentInstanceId` 只表示“此刻浏览器从哪里控制”，不是业务身份。Chrome 刷新、Extension reload、Tab 关闭都不能自动制造第二个 Worker。

### 创建一半失败，只补缺的那个

例如 Product 和 Dev 已经确认创建，Test 未完成：

```text
Product = BOUND
Dev     = BOUND
Test    = MISSING
```

恢复只允许补 Test。若某次创建请求 timeout，也先回真实 ChatGPT 页面和 Task binding 检查 Conversation 是否已经存在，而不是把 timeout 直接理解成“没创建”。这个恢复规则和 Execution 的 UNKNOWN 是同一种工程原则。

### Requirement 不是靠聊天记忆传递

前置 Product Discussion 里的认识要变成正式 Task 输入，必须进入 Owner-backed document（由正式 Owner 持有的文档事实）：

```text
ProductDocument
→ ProductIntent
→ Task materialization
→ transferProductIntentToTask
→ TaskDocument(REQUIREMENT)
→ Worker fresh-read
```

Task 只有在 Requirement、required role binding 和必要 TaskGroup 前置条件都满足以后，才由 Task Owner 算出 READY。模型“觉得准备好了”不是状态转换依据。

## 三、Task / Node 怎样推进，而不是靠 Agent 轮流说“继续”

Task（任务：有明确目标、范围和结束条件的正式工作）与 Node（节点：Task 中由某个角色承担的一步工作）把多 Agent 协作从聊天顺序变成持久化工作流。

v1 刻意没有做通用 DAG（有向无环图：用任意图结构表达复杂依赖的工作流模型），主链是有序 Node + 显式状态转换 + reopen。

```text
Task: PENDING → READY → ACTIVE → SUCCEEDED
                    ↘ WAITING / FAILED / PAUSED / TERMINATED

Node: PENDING → READY → IN_PROGRESS → SUCCEEDED
                          ↘ WAITING / FAILED / TERMINATED
```

### startTask 把“可以开始”变成正式业务事实

`startTask` 不是把一个 UI 按钮点亮，而是在一个事务里重新校验 Task version、binding、TaskGroup eligibility 和 start authority，然后同时把 Task 置为 ACTIVE、首 Node 置为 READY，并更新 `currentNodeId`。

这样不会出现 Task 已 ACTIVE、首 Node 却没准备好的半状态。

### Node READY 后，Observer 只发现下一步，不代替 Worker 工作

Task Observer（任务观察器：读取当前 Owner facts 并发现确定性下一动作的应用层协调器）正常路径不调用模型：

```text
READ current owner facts
→ DETECT deterministic condition
→ REQUEST typed carrier action
```

Node READY 时：

```text
Task Observer
→ 请求 Browser wake
→ Browser 恢复正确 Conversation 并投递 NODE_READY
→ Worker fresh-read Task / Node
→ Worker 自己调用 startNode
→ Task Owner 把 Node 置为 IN_PROGRESS
```

这四步故意拆开：Observer 发现“该继续”，Browser 负责物理送达，Worker 正式接受工作，Task Owner 才改变 workflow truth（工作流正式事实）。

### completeNode 只在正式输出成立后释放下一 Node

当前 Worker 满足 required outputs 后调用 `completeNode`：

```text
current Node → SUCCEEDED
        ↓
还有下一 Node？
├─ 有 → next Node PENDING → READY
└─ 无 → Task → SUCCEEDED
```

如果是可信业务失败才使用 `failNode`。Execution 仍在 RUNNING、模型暂时忙、Browser 在恢复、协作消息等待投递，都不能为了“看起来停住了”就映射成 Task FAILED 或 WAITING。

### WAITING 表示业务 blocker，不是所有等待

`waitNode` 只表达真正需要业务输入或正式决策的阻塞，例如用户确认、Requirement 澄清或外部业务输入缺失。

下面这些等待保留在自己的 Owner：

```text
Execution RUNNING / WAITING_APPROVAL
Collaboration delivery pending
Browser recovery
Model queue busy
```

一类事实只在一个 Owner 中存在，恢复时才不会出现互相打架的状态机。

### reopen 是新一轮执行，不是删除旧历史

可信失败被修复以后，`reopenNode` 保留同一个 Task / Node，增加新的 `runNo`，让目标 Node 回到 READY，并按规则把后续 Node 重置到 PENDING。

TaskRoleBinding 保留，所以系统恢复原来的 Worker Conversation；旧 run 的 history、文档和 Evidence 也保留。这比“失败以后重建整个 Task 和三支 Agent”更容易审计和恢复。

## 四、Agent 怎样保持身份稳定，又不会变成自由聊天网络

ProFlow v1 固定 Product、Controller / Dev、Test / Ops 三个长期复合岗位。这样做不是因为三个角色“最聪明”，而是因为长期角色越多，身份、权限、Conversation、协作、恢复和 E2E（端到端）路径都会乘法增加。

专业能力可以通过 Knowledge、Context、工具和临时研究增加；只有真正出现独立长期事实和生命周期时，才值得新增长期 Role。

### Worker Turn 不需要 Browser 每一步都发送“继续”

Worker Turn（智能体工作轮次：一次 wake 进入 Conversation 后，模型连续推理、调用多个 Action 并处理返回结果的连续工作段）不是持久化 Entity，也没有单独 Scheduler。

```text
wake
→ reason
→ Action A
→ result
→ Action B
→ result
→ formal Task action
```

Action result 本来就会回到当前 GPT Turn。只有等待 Peer reply、Execution durable result、Approval 或跨 Turn 的异步现实结果时，当前 Turn 才结束；结果后来 ready，再由 Observer 恢复同一个 Worker。

### Collaboration 只处理局部问讯

`askPeer / replyPeer` 用于同一 Task 内的短问题，例如 Dev 问 Product 一个 Requirement 歧义，Test 问 Dev 一个复现细节。

正式 Requirement、Technical Design、Test Result、Task 状态转换和跨 Task 续轮不能塞进 Message Center（消息中心：保存同一 Task 内局部问答的正式通道）。否则聊天消息会重新长成第二条隐藏 Workflow。

逻辑消息与物理送达也分层：

```text
Agent Owner creates PENDING message
→ Browser restores target Worker
→ physical submit
→ page fingerprint Evidence
→ Agent Owner records DELIVERED / FAILED / UNKNOWN
```

页面 submit 超时以后，如果无法证明消息有没有送达，就先核对现实，不能再发一遍。

多 Agent 的完整身份、权限与协作设计见 [03｜多 Agent 如何从更多角色收敛成稳定协作系统](./03-多Agent如何从更多角色收敛成稳定协作系统.md)。

## 五、真实执行为什么要把“调用结果”和“现实结果”分开

Execution（执行领域）负责最危险的一类事实：一个会改变真实世界的动作到底有没有发生。

一次可靠执行至少要区分：

```text
Intent
→ Policy / Approval
→ Precondition Evidence
→ Effect Started
→ Postcondition Evidence
→ Result
```

Result（结果：系统对这次执行的可信结论）、Artifact（产物：执行生成的文件、报告或其它对象）和 Evidence（证据：支持这个结论的现实证明）不能混成一件事。拿到一个 patch 文件不证明 patch 已应用；点过 Browser send 也不证明消息已经进入 Conversation。

### UNKNOWN 是正式结果，不是失败的另一种写法

真实副作用最重要的三态是：

```text
APPLIED
= 有证据证明已经发生

NOT_APPLIED
= 有证据证明没有发生

UNKNOWN
= 目前既不能证明发生，也不能证明没有发生
```

当调用 timeout，而 Effect 可能已经开始时，下一步是 Reality Reconciliation（真实结果核对：回到文件、Git、进程、Browser、Registry 或远端资源重新确认现实），不是 blind retry（盲重试：在不知道原副作用结果时再次执行同一动作）。

例如：

```text
browser.submit → 查目标 Conversation fingerprint
git.commit     → 查 HEAD / commit identity
process.start  → 查 PID / listener / command
npm publish    → 查 exact package@version
GPT create     → 查 stable g-id / live resource
```

确认已发生就接受现实；确认没发生才在合同允许时重新执行；仍然无法确认就保持 UNKNOWN。

### Direct Tool 与 Durable Execution 是两条路径

Worker 在当前 Turn 里直接调用 Repomix、CodeGraph、Local Dev 时，不需要给每个 grep、read、test 命令建立 durable `executionRef`。

当前 Direct Tool（直接工具：结果直接回到当前 Worker Turn 的本机工程调用）路径是：

```text
Custom GPT Action
→ Agent Gateway
→ Platform Host admission
→ Browser Extension Local Tool lane
→ execution-local
→ macOS
→ result 回当前 Worker Turn
```

需要持久审批、跨 Turn 恢复或真实副作用证据的操作才进入 Durable Execution（持久执行：拥有独立生命周期、证据和恢复语义的执行记录）。两条路径都受边界约束，但不强行共用一个生命周期。

### Approval 还有三个不同层次

Task start authorization、Execution Approval（执行审批：针对真实 Effect 的持久安全事实）和 ChatGPT 页面 Action Permission 是三件事。

```text
页面点了 Allow
≠ Execution Approval 已成立

Execution Approval 已成立
≠ Effect 已经执行成功

Task 可以 start
≠ 后续任意副作用都被授权
```

这个区分防止 Browser UI 成为隐形权限系统。

长期执行、UNKNOWN 和恢复机制详见 [05｜ProFlow 怎样从一次跑通走向长期可运行的工程系统](./05-ProFlow怎样从一次跑通走向长期可运行的工程系统.md)。

## 六、Browser Extension 为什么是 Driver，不是业务大脑

ProFlow 的 Chrome Extension（浏览器扩展：驻留在 Chrome 中连接真实页面和本机桥接能力的运行组件）是 Browser Driver（浏览器驱动层：把系统已经形成的意图落到页面，并把页面现实重新带回系统）。

它内部同时驱动多条 Lane（隔离通道：共享 Chrome 基础设施，但不共享业务状态机和执行队列）：

```text
Browser Session / Page Reality
Task UI
Worker create / restore / wake
Collaboration delivery
Permission / Attention
Product discussion / review delivery
Custom GPT Provisioning
Local Tool
Monitor
Recovery / System Observer
```

这些线共享页面观察、Chrome API、bridge、heartbeat 等底层能力，但不能因为都能控制 Tab 就共享一套业务队列。

一条消息提交的可靠语义不是“click 成功”，而更接近：

```text
WRITE
→ COMMIT：回读输入和预期一致
→ READY：提交动作真实可用
→ CLICK
→ REALITY：目标 Conversation 出现同一 fingerprint
```

DOM-first（DOM 优先：能从页面结构确定事实时优先读取结构化页面，而不是先让模型猜截图）是主路径，Vision（视觉识别：从截图理解页面状态）只在确定性页面信息不足时补位。

一句话概括扩展边界：

> **Driver 负责让流程真正发生；Owner 负责定义什么事实成立。**

完整 12 条浏览器流程见 [04｜ProFlow 浏览器扩展如何驱动浏览器内各条流程](./04-ProFlow浏览器扩展如何驱动浏览器内各条流程.md)。

## 七、模型为什么只有推理权，没有工作流决定权

Model Domain（模型领域）对外提供 `FAST / REASON / AUTO` 逻辑角色。当前 Phase 4 的目标部署形状是一个 Provider、一个 selected model，再用不同模式形成两种逻辑推理：

```text
FAST
→ selected model
→ chat_template_kwargs.enable_thinking = false

REASON / UI 可显示 THINK
→ selected model
→ chat_template_kwargs.enable_thinking = true
```

模型名不是能力证明。Provider URL、model inventory、thinking mode、structured output（结构化输出：要求模型返回可机器解析结构）、Vision、context / output 边界都需要 live probe（在线探测：向当前真实服务发受限请求验证能力）。

同一台端侧设备还不能假设能够稳定并发多个推理角色，因此 Model Runtime 使用 single-flight（单通道串行：同一物理推理通道一次只运行一个请求）和有界优先级队列，把设备限制吸收在 Runtime 内。

模型正常用于认知、分类、诊断和受控 assessment，但不能覆盖 hard policy、Owner version、identity、scope、idempotency 或 Human Approval。

```text
Owner current fact
> deterministic invariant / policy
> model assessment
> Conversation / DOM / log guess
```

模型和端侧算力为什么这样设计，见 [07｜ProFlow 如何从源码走到真实可运行产品](./07-ProFlow如何从源码走到真实可运行产品.md) 的模型 Reality Chain。

## 八、Deployment 为什么必须一直追到 Runtime

Deployment（部署治理领域）经历过从中央 Planner 到 Module 自治的收缩。当前每个 Module（模块：拥有自己 setup、status、start、stop 和恢复语义的自治部署单元）统一提供七个标准能力：

```text
install
uninstall
status
setup
docs
start
stop
```

Platform CLI（平台命令行入口）只负责发现 Module、按依赖顺序调用、聚合结果和 package-manager orchestration（包管理编排）；它不读取 Module 私有配置，也不保存第二份“全平台真值”。

### install、setup、start 回答的是不同问题

`install` 让 Workspace 拥有正确 package；`setup` 让每个 Module 自己完成机器可完成的配置，并只把真实外部授权留给人；`start` 只在 setup status 已满足时启动 Runtime。

Chrome、Extension、Dev Tunnel、Model Provider、Custom GPT 都属于真实 External Resource（外部资源：不在本机进程内，但当前产品运行依赖的对象），需要自己的 readback 和恢复语义。

### 源码修好并不等于用户运行到新代码

影响 Runtime 的修改至少要穿过：

```text
Source Truth
→ Package Truth
→ Registry Truth
→ Installed Truth
→ Runtime / Product Truth
```

源码、打包产物、Registry 版本、实际 `node_modules`、运行进程和浏览器 Extension 是不同事实层。

例如 Extension load directory 已经换成新文件，如果 Chrome 还没 reload 并产生新的真实 `extensionInstanceId` / heartbeat，就不能说 Runtime 已采用新版本。

这条供应链与模型能力链一起在 [07｜ProFlow 如何从源码走到真实可运行产品](./07-ProFlow如何从源码走到真实可运行产品.md) 展开。

## 九、Task 成功以后，产品为什么还没结束

`Task SUCCEEDED` 只说明这一份有边界的工作已经完成，不等于整个 Product Goal 满足。

Task terminal 后，Task Observer 停止驱动旧 Task。Product continuation（产品续轮：把 terminal 结果送回原产品讨论并判断是否值得再建 Task）再基于正式 Owner facts 构造 Product Review 输入。

Product 重新读取：

```text
Campaign / Authorization
Product Intent
Task terminal version
TaskDocument
Test / Deployment / Product Evidence
```

然后只有两种产品级方向：

```text
GAP_REMAINS
→ 记录具体 Gap + 新证据
→ 新 ProductIntent
→ 新的有边界 Task

GOAL_SATISFIED
→ Campaign CLOSED
→ 停止创建下一 Task
```

同一个 Gap 如果没有新证据、没有可测进展，也没有实质不同的新方案，就不能换个措辞继续自动创建 Task。持续迭代最重要的能力之一，是知道什么时候停止。

## 十、Monitor 怎样支撑 ProFlow，又为什么不能算第四个产品 Agent

真实产品运行会暴露 ProFlow 自己的问题：Observer 可能漏 wake，Extension 页面可能变化，Package 可能没进入 Runtime，模型 Provider 可能漂移，Acceptance Harness（验收框架：自动重放真实路径并收集证据的工具体系）自己也可能制造假失败。

Monitor（工程监控与自迭代通道：使用普通 Chat 观察、修复和验证 ProFlow 自身）负责外层工程飞轮：

```text
观察当前 Source / Runtime / Browser / Evidence
→ 找 first divergence（最早偏离点：第一处已经与正式合同不一致的事实）
→ 使用工程工具修 ProFlow
→ 重新证明 Source / Package / Workspace / Runtime
→ 回到原真实场景
→ 继续观察
```

它不进入 Product / Dev / Test 业务 Role，也不替这些 Agent 做目标产品决策。

### 2026-09-17 的 Monitor 边界已经和早期方案不同

当前 Source Gate 和 Workspace / Runtime Adoption 都已经 PASS；仍未完成的是 Real Acceptance（真实验收）：真实 Browser turn loop、飞书 delivery、4h rotation 等还没有正式跑完。Workspace 配置也仍故意保持 `enabled=false / notificationsEnabled=false`。

同时，旧的“Monitor 接班时撤销旧 Chat 的 Local Dev、给新 Chat 发工具 lease”的方案已经废止。当前边界是：

```text
Local Dev
= 通用、无状态 MCP
= 普通 Chat 都可以直接使用
= Monitor 不授予，也不撤销

Monitor run / shift
= 记录业务运行、交接、boot、takeover 等协调事实
= 不等于本机工具权限

Extension monitor memory lock
= 只在进程内抑制重复页面动作
= Extension restart 后重新 unlocked
= 当前接受多个 Monitor Chat 可能竞争
```

这种设计不靠“旧 Chat 被物理封锁”保证正确，而依靠当前 Owner facts、expected version、幂等、Effect receipt 和 UNKNOWN reconciliation 抵抗重复或竞态。

Monitor 与长期运行的更多细节见 [05｜ProFlow 怎样从一次跑通走向长期可运行的工程系统](./05-ProFlow怎样从一次跑通走向长期可运行的工程系统.md)。

## 十一、用一份真实工作把五个领域重新串一次

假设目标是“给一个真实产品增加一项功能”。完整流程可以简化成：

```text
1. 用户给 Product Discussion 一个 Goal
   Agent 保存讨论身份，产品层保存 Goal / Campaign 相关事实

2. Product 调研、比较方案、写 ProductDocument
   收敛 Scope、Constraints、Acceptance

3. Product 提交 scoped ProductIntent
   Task Owner 校验身份、scope、revision、idempotency

4. Task Owner exactly-once 创建 Task(PENDING)
   Task 获得正式身份和 ordered Nodes

5. Browser Driver 为 Product / Dev / Test 创建 fresh Task Worker
   Task 保存稳定 TaskRoleBinding

6. Requirement 转入 TaskDocument
   binding + document + prerequisite 齐全后 Task READY

7. Human 或有效 CampaignAuthorization 允许 start
   Task ACTIVE，第一个 Node READY

8. Task Observer 发现确定性 READY
   Browser restore + wake 正确 Worker

9. Worker 调 startNode
   Task Owner 承认 Node IN_PROGRESS

10. Dev 在 Worker Turn 中工作
    Repomix 看大上下文
    CodeGraph 看结构关系
    Local Dev 读取/修改/运行本机工程
    需要持久恢复的 Effect 进入 Execution

11. Dev 写正式 output 并 completeNode
    Task 释放 Test Node

12. Test/Ops 独立读取 Requirement 和 Evidence
    运行真实验证，写 Test Result

13. 如果可信失败
    保留失败 Evidence，按正式 Task 语义 WAIT / reopen
    不靠聊天一句“再试一次”覆盖历史

14. 最后一个 Node complete
    Task SUCCEEDED，Observer STOP_DRIVING

15. terminal evidence 回 Product Discussion
    GAP_REMAINS → 新 ProductIntent → 新 Task
    GOAL_SATISFIED → Campaign CLOSED

16. 如果途中暴露的是 ProFlow 平台缺陷
    Monitor 修 ProFlow → 证明 Runtime adoption → 回原场景
    不由 Monitor 越权替业务 Agent 完成产品工作
```

到这里，五个领域的责任可以再压成五句话：

```text
Task
负责“工作事实、顺序和产品任务边界”

Agent
负责“谁来思考、以什么身份协作”

Execution
负责“真实动作到底发生了什么”

Model
负责“需要推理时怎样得到受约束的判断”

Deployment
负责“这些能力怎样真正存在于当前机器和外部资源上”
```

Browser、Gateway、`platform-host` 都是关键基础设施，但它们不能因为位置居中就顺手接管领域事实。

## 十二、当前证据边界：文章里的“设计”不能冒充“已经跑完”

截至 2026-09-17，可以明确写成当前事实的是：

| 能力 | 当前证据层级 |
| --- | --- |
| 五领域边界、Owner、Task / Node / Execution / Deployment 基础语义 | 当前 normative truth（正式规范真源） |
| Task Observer backend reconciliation、Worker / Browser Driver 边界 | 当前规范和源码主线 |
| Phase 3 Real-1 / Real-2 / Real-3 | PASS / FROZEN / CLOSED，Phase 3 已封版 |
| Product Intent / Campaign Authorization / Product continuation | Phase 4 正式架构目标和 canonical contract 已冻结并进入主线；Foundation 仍需按当前证据继续收口 |
| Monitor source | PASS |
| Monitor Workspace / Runtime Adoption | PASS |
| Monitor Real Acceptance | `NOT_RUN`；真实 Browser turn loop、飞书、4h rotation 等仍待正式验收 |
| Monitor 长期运行开关 | 当前仍为 `enabled=false / notificationsEnabled=false` |
| Phase 4 Foundation | `NOT_READY` |
| Banner Studio Campaign | `NOT_STARTED` |
| Phase 5 自我迭代 | future direction |

这张表比“源码里已经有某个 class / API”更重要。ProFlow 对自己的要求和对目标产品一样：**Source、Package、Workspace、Runtime、Reality 必须一层一层证明。**

## 最后，用一句话理解 ProFlow

ProFlow 的核心不是“多 Agent 自动做事”，而是把长期产品迭代拆成一组**有唯一事实 Owner、有明确授权边界、能恢复真实副作用、能独立验收、并且知道什么时候进入下一轮或停止**的流程。

```text
产品目标
→ 有界 Task
→ 正确 Worker
→ 真实执行
→ Reality Evidence
→ 正式 Task 结果
→ Product Review
→ 下一轮或关闭
```

如果继续深挖，02～07 分别回答复用与控制面、多 Agent 身份、Browser Driver、长期运行、AI 工程治理以及源码到真实产品这六个问题；这篇只负责给它们提供同一张端到端地图。
