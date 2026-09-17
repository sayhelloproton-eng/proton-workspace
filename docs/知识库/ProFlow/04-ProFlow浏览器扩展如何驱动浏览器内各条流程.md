# ProFlow 浏览器扩展如何驱动浏览器内各条流程

ProFlow 的 Chrome Extension（浏览器扩展：驻留在 Chrome 中、负责连接真实页面和本机桥接能力的运行组件）不是一个只会“点按钮”的插件。更准确的定位是 Browser Driver（浏览器驱动层：把系统已经形成的意图真实落到浏览器页面，并把页面现实重新带回系统）。

这篇文章只回答一个问题：**扩展在浏览器里到底驱动哪些流程，每条流程什么时候触发、做什么、产生什么结果，又把事实交回谁。**

先建立一个最重要的心智：扩展可以很主动，但它不是业务大脑。它会维持连接、观察页面、恢复 Conversation、提交消息、处理权限页面、部署 Custom GPT、承载 Local Tool 和 Monitor；但它不能因为“能控制浏览器”，就自己决定 Task 是否完成、Agent 消息是否成立、审批是否通过。

Owner（事实归属方：某类正式事实最终由谁保存和判定）仍然分布在 Task、Agent、Execution、Deployment 等领域。Browser Driver 的工作是**让现实真正发生，并把 Observation / Evidence / Result 带回对应 Owner**。

## 一张图先建立位置关系

```text
Task / Agent / Execution / Deployment 正式事实
                ↓
       Platform Host / Runtime
                ↓
Bridge（本机桥：把类型化命令送入 Chrome，并接收结果）
                ↓
       Browser Extension Driver
                ↓
┌──────────────────────────────────────────────┐
│ 会话 │ 页面现实 │ Worker │ 协作 │ Permission │
│ Product 会话 │ GPT 部署 │ Local Tool │ Monitor │
│ Task UI │ Recovery / System Observer          │
└──────────────────────────────────────────────┘
                ↓
       Chrome / ChatGPT / GPT Editor
                ↓
       Observation / Evidence / Result
                ↓
            对应 Owner
```

Extension 内部使用多条 Lane（隔离通道：共享 Chrome 基础设施，但不共享业务状态机和执行队列）。这是它既能承担很多浏览器工作，又不会重新长成 Universal Workflow Engine（万能工作流引擎：在页面层偷偷决定业务下一步）的关键。

## 浏览器里实际有哪几条流程

| 流程 | 什么时候触发 | Extension 负责什么 | 最终交回谁 |
| --- | --- | --- | --- |
| 安装 / 配对 | `platform setup` 或重新验证在线状态 | 准备 unpacked 扩展与运行配置，完成 hello / heartbeat | Deployment / Module setup |
| Browser Session | Extension 启动、Chrome 重启、Bridge 断线 | hello、heartbeat、keepalive、命令轮询、结果回报、重连 | Browser 调用方 |
| 页面现实 | 页面观察或 Browser command | 打开、观察、输入、提交、验证、截图、受限页面操作 | Execution / Carrier 调用方 |
| Task UI | 用户点击扩展入口 | 打开正式 `/tasks` surface，必要时回退扩展页面 | Task Application |
| Worker Carrier | Worker 创建、恢复、唤醒 | 找到正确 Conversation、绑定稳定身份、投递正式 trigger | Task / Agent Runtime |
| Collaboration | Agent 已有 PENDING message | 把已有消息物理送到目标 Worker，并证明送达 | Agent Collaboration Owner |
| Permission / Attention | ChatGPT Action Permission 阻塞 | 观察 blocker，执行正式分类后的 auto / human action | Policy / Carrier / Attention Owner |
| Product discussion / review | Task 前产品讨论或 Task terminal 后复盘 | 投递 Bootstrap / Product Review Required | Product / Campaign 流程 |
| Custom GPT Provisioning | Agent setup 创建或同步角色 GPT | 操作 GPT Editor，配置 Instructions、Action、Knowledge、Auth、模型 | Agent Deployment / Module setup |
| Local Tool | 授权 Chat 调 Local Dev / Repomix / CodeGraph | 独立 session、queue、Effect Gate、notice、结果回传 | Local Tool Host |
| Monitor | 普通 `/c/*` Monitor Chat 启用或恢复 | 观察 Monitor Chat、恢复页面、上报 observation | Monitor Owner |
| Recovery / System Observer | Extension 启动、Bridge 重连、关键状态变化 | 有界恢复协作、请求 `task.reconcileAll`、做只读系统诊断 | 后端各 Owner |

这张表表达的是一个很关键的区别：**Driver 负责让流程真正发生；Owner 负责定义什么事实成立。**

## 安装与配对：历史 pairing 不能冒充当前在线

浏览器扩展本身也是 Deployment Module（部署模块：拥有自己 setup、status 和运行准备语义的部署单元）。

`platform setup` 进入浏览器扩展 setup 后，会准备 unpacked 目录、运行配置和本机 Bridge，然后先尝试重新验证当前扩展是否真实在线：

```text
platform setup
→ 准备扩展文件 / runtime config
→ 尝试发现已有 session
→ hello + heartbeat 重新成立？
   ├─ 是：直接复用，进入 READY
   └─ 否：打开 chrome://extensions
          → 用户完成 Chrome 必须的人机确认
          → Extension hello
          → heartbeat
          → READY
```

如果等待超时，结果是 `PAIRING_TIMEOUT`，不是假 READY。已经准备好的配置可以保留，下次 setup 重新验证 Reality（现实：此刻真实存在的外部状态）。

## Browser Session：Service Worker 不会永久不死

MV3（Manifest V3：当前 Chrome 扩展使用的清单与运行模型）后台运行在 Service Worker（后台服务：由 Chrome 管理、可能被挂起和重新唤醒的扩展环境）中，所以 Driver 不能把“进程一直活着”当成前提。

主会话大致是：

```text
Extension startup / reconnect alarm
→ 恢复 extensionInstanceId
→ session hello
→ 建立 browserSessionEpoch
→ heartbeat + keepalive
→ poll typed command
→ 执行 command
→ report result
→ 断线后重新建立 session
```

会话之下承载 `LIST_TABS / OPEN / OBSERVE / SUBMIT / VERIFY / SCREENSHOT / PERFORM` 等浏览器原语。它们只回答页面动作和页面事实，不自动解释业务含义。

## 页面现实：OBSERVE 不应该偷偷 MUTATE

Phase 2 的一个真实教训是：早期 Observation（观察：只读取页面当前状态）为了“看最新内容”会主动 scroll，结果观察本身改变 viewport，又反过来影响下一轮判断。

后来形成明确边界：

```text
OBSERVE
→ 只读 Reality

scroll / focus / click / input / submit / reveal
→ 显式 Effect（副作用：会改变浏览器或外部现实的动作）
```

Content Script（页面脚本：注入网页、负责读取 DOM 并执行受控页面动作的扩展脚本）持续提供 URL、页面状态、消息 fingerprint、blocker 等结构化事实。

主路径遵循 DOM-first（DOM 优先：能从页面结构确定事实时，优先使用结构化元素，而不是让模型猜截图）：

```text
observe current DOM
→ input / click / submit
→ 等待新的 observation
→ verify postcondition
→ 必要时 screenshot / Vision
```

Vision（视觉识别：通过截图理解页面状态）是补位，不是默认决策者。无论 DOM 还是 Vision，动作以后都要重新读 Reality。

## `SUBMIT` 为什么不能只看“点击成功”

消息提交是最容易制造重复副作用的地方。

Browser Driver 不应该在 send click 返回以后直接宣告成功，而是继续观察目标 Conversation，直到同一 message fingerprint 真实出现。只有这时，物理 Delivery（投递：消息已经进入目标 Conversation）才成立。

同样，后面的 Agent 回答错误也不能反向把 Delivery 改写成失败：

```text
Browser submit 已有 Evidence
→ 物理副作用已经发生

下游 Agent response 异常
→ 是下一阶段的问题
→ 不能为了修下游再发送同一条消息
```

## Task UI：扩展按钮只是入口，不是 Task 数据库

用户点击扩展图标时，当前流程优先从本机 Bridge 获取 bootstrap session，然后打开 loopback `/tasks` Web surface；只有正式页面不可用时才回退扩展内置页面。

```text
点击 Extension action
→ mint task session
→ 打开 /tasks
→ 必要时 fallback extension page
```

Extension 提供入口和 Browser Reality，Task 数据、状态、版本和权限仍然来自 Task Application / Task Owner。

## Worker Carrier：create、restore、wake 是三个动作

Worker Carrier（Worker 承载流程：把正式 Worker 身份映射到真实 ChatGPT Conversation，并负责恢复与物理唤醒）是扩展最关键的运行期流程之一。

### `worker.create`

```text
Task 需要 roleRef 的 Worker
→ 打开对应 Role GPT
→ 提交唯一 WORKER_BIND bootstrap fingerprint
→ 确认消息真实出现
→ 观察新 Conversation identity
→ 得到 workerRef / conversationLocator
→ 回写 Task binding
```

它会创建新的外部 Conversation，因此必须有稳定幂等边界。

### `worker.restore`

Chrome 重启、Tab 消失、Extension reload 都不能成为创建第二个 Worker 的理由。restore 根据 `taskId / roleRef / workerRef / conversationLocator` 找回原 Conversation，不创造新业务身份。

因此必须区分：

```text
稳定身份
→ roleRef / workerRef / conversationLocator / g-id

瞬时定位
→ tabId / windowId / contentInstanceId
```

### `worker.wake`

Wake 消费后端已经形成的正式 trigger，例如 `NODE_READY / REOPEN / EXECUTION_RESULT_READY / PEER_REPLY_READY / RECOVERY_RESUME / TASK_RESUMED`。

```text
正式 wake intent
→ restore 原 Worker
→ continuation / human-deny guard
→ 页面 writable 检查
→ submit proflow.agent.browser-trigger.v1
→ 验证 fingerprint
→ 回报 delivery evidence
```

Extension 负责“把 wake 真送进去”，不负责决定哪个 Node 应该 READY。

## Collaboration：只运送已经成立的逻辑消息

Agent Collaboration（智能体协作：同一 Task 不同 Worker 之间的正式 ask / reply）先在 Agent Owner 中形成 durable PENDING message。Browser 之后才承担物理投递：

```text
Agent Owner：PENDING
→ 读取 target binding
→ restore 目标 Worker
→ durable collaboration.deliver
→ 页面验证 fingerprint
→ Evidence
→ Agent Owner 记录 DELIVERED / FAILED / UNKNOWN
```

Extension 自己不再维护第二个业务消息队列。启动时可以有界恢复 PENDING，但上一轮结果如果是 UNKNOWN（未知：当前既不能证明发生，也不能证明未发生），不能为了“恢复”再发一遍。

## Permission / Attention：能点 Allow，不代表有资格裁决

ChatGPT Action 可能让页面进入 `BLOCKED`，出现 permission UI。Extension 会读取 blocker fingerprint、目标 host、operation 等事实，再消费正式分类结果：

```text
AUTO_ALLOW
DEFER
HUMAN_REQUIRED
```

Routine Permission（常规权限：规则已经足以确定处理方式的页面权限）可以尝试一次自动动作；上下文不足、规则要求人、自动动作失败或用户已经拒绝时，则进入 Carrier Attention（浏览器人工关注项：需要用户明确决定的当前阻塞）。

用户 `deny` 不是“点一下按钮就结束”。Extension 还会记录 continuation denial，后续同一 Worker / Conversation 的自动 wake guard 会抑制继续推进，避免“用户刚拒绝，系统又自己继续”。

这里的边界始终是：Browser 可以执行 Allow / Deny 的物理动作，Policy（策略：系统预先定义允许、拒绝或需要人工判断的规则）和 Human Approval（人工审批：由有权的人明确授权高风险动作）仍然在业务层。

## Product discussion / review：它不是 Task Worker 的特殊分支

Phase 4 以后，Product 会话横跨 Task 前后，因此 Extension 有独立产品会话线。

`product.discussion.bootstrap.deliver` 把 Product Discussion Bootstrap 投进稳定 Product Conversation，并明确禁止携带 `taskId / nodeId / runNo / workerRef`。这说明它属于 Task 之前的产品讨论，不是 Worker wake。

Task terminal 后，`product.review.deliver` 再把 `PRODUCT_REVIEW_REQUIRED` 投回原 Product Conversation，带上 campaign / intent / terminal task 等正式引用，让 Product 基于真实结果做 Gap Review。

Extension 只负责物理送达。是否还有产品差距、是否需要下一 Task，仍然由 Product / Campaign 流程决定。

## Custom GPT Provisioning：同一个扩展里的另一种生命周期

Provisioning（资源物化：把本地 Agent Package 真正创建或同步成 ChatGPT 中的 Custom GPT）使用独立 lane、独立 Bridge 和 GPT Editor 页面，不进入 Worker 运行状态机。

新角色大致经历：

```text
Agent Package
→ 准备 Action Schema / Knowledge / credential
→ 打开 /gpts/editor
→ 填 Instructions
→ 配 Action / Auth / Knowledge / Model / Capabilities
→ 创建 Private GPT
→ 得到 stable g-id
→ readback live material
→ 返回 LIVE_CREATED
```

已有角色采用 read-before-write（先读后写：先检查远端真实状态，只有确认漂移才允许修改）：

```text
INSPECT_CUSTOM_GPT
→ LIVE_MATCHED：零 mutation
→ LIVE_DRIFTED：原 g-id 原位同步
→ UNKNOWN：不新建第二个 GPT，也不盲目 Update
```

这条线属于 Deployment，不属于 Task Worker。

## Local Tool：本机工程工具必须与 Worker Browser 流程隔离

Local Tool（本机工程工具通道：让授权 Chat 使用 Local Dev、Repomix、CodeGraph 等本机能力）虽然也由 Extension 维持浏览器侧 session，但拥有自己的 Bridge、heartbeat、queue 和 Effect Gate（副作用闸门：命令真正可能改变本机现实之前的执行边界）。

```text
Host 形成 tool command
→ 校验 workspace / role / deadline / authority
→ Extension Local Tool lane 领命
→ 必要的 workspace notice
→ Effect Gate
→ 本机 Tool Provider
→ result 回 Host
```

只读请求可以受控并发；Local Dev mutate / run / process start-input-stop 等潜在副作用需要独占。命令越过 Effect Gate 后 timeout，结果进入 `LOCAL_TOOL_RESULT_UNKNOWN`，下一步先看本机现实，不能直接重跑。

独立 lane 还有一个现实价值：长时间 Local Dev / Repomix 命令不能堵住 Worker wake、Browser heartbeat 或页面观察。**共享 Chrome 不等于共享执行队列。**

## Monitor：支撑 ProFlow 工程飞轮，不是第四个产品 Agent

Monitor Lane（监控通道：专门观察普通 `chatgpt.com/c/*` 工程 Chat 的隔离流程）服务的是 ProFlow 自身工程迭代，不属于目标产品 Worker。

启用后，Extension 会找到 `/c/*` 页面、注入独立 monitor content script、读取 Chat observation，并把状态送回 Monitor Owner；Chrome startup / alarm 后还能恢复已存在页面。

Monitor 不能借用 Worker 的 `WAKE_GUARD`、`CARRIER_ATTENTION_ACTION` 或任意业务 `PERFORM` 原语。负责修 ProFlow 的 Chat 可以拥有自己的工程工具，但不能因此获得目标产品 Task Worker 的隐式控制权。

源码里存在某个 Monitor primitive，并不等于完整 Runtime Adoption 和 Real Acceptance 已经完成；最终状态必须以当前运行时证据为准。

## Recovery / System Observer：重连不是从零开始

Chrome 会挂起 Service Worker，Bridge 会重连，Content Script instance 会替换。因此恢复本身也是正式流程：

```text
恢复页面 observation
→ 恢复 permission / continuation snapshot
→ 有界扫描 PENDING collaboration
→ 恢复可安全恢复的物理投递
→ 请求后端 task.reconcileAll
→ 异步启动 System Observer assessment
```

Task Reconciliation（任务核对：重新读取正式 Task 事实并判断是否存在应该继续的工作）仍由后端 Owner 完成。Extension 只触发恢复，不重新实现 Task scheduler。

System Observer（系统观察器：最低优先级、只读综合 Task、Worker、协作、Execution、Carrier、Model、Deployment 等状态的诊断流程）可以 drill-down 并形成 assessment；Reason 不可用或上下文过大时宁可 `DEFERRED`，也不修改任何 owner fact。

## Playwright 和 macOS AX 是两个 Reality Plane

普通 Web / ChatGPT 页面在 debugger attach 成立后，Playwright 适合做 DOM、Network 和 page screenshot；Chrome privileged UI（特权界面：如 `chrome://extensions`、Toolbar、系统文件选择器）则需要 macOS AX（macOS 辅助功能自动化接口）和系统截图。

```text
Playwright
→ 普通 Web Reality

macOS AX / system screenshot
→ privileged UI Reality
```

历史上还真实出现过“Tab 能看见、甚至进入 controlled group，但 Chrome 仍拒绝 `chrome.debugger.attach`”。因此：**visible 不等于 controllable，controllable 更不等于业务 identity。**

## 多条 Lane 为什么必须隔离

这些流程都运行在同一个 Extension package，最容易犯的错误就是因为底层都能访问 Tab，就让它们共用业务队列和状态。

如果这么做，一个 Local Dev 长命令可能堵住 Worker wake；一次 GPT deployment 失败可能污染 Task Worker；Monitor 可能越权触发业务 Conversation；Browser 又会重新长成隐藏中央工作流。

所以两句话必须同时成立：

> **Extension 是浏览器里的主动 Driver。**
>
> **Chrome 是共同执行环境，不是共同业务 Owner。**

## 用一条 Worker wake 看完整链路

```text
Task Owner
确认某个 Node READY
        ↓
Task Observer
形成 worker wake intent
        ↓
Execution / Browser command
        ↓
Browser Driver
restore workerRef 对应 Conversation
        ↓
Permission / continuation guard
        ↓
submit typed trigger
        ↓
页面出现同一 fingerprint
        ↓
Evidence 证明 Browser Effect 已发生
        ↓
Worker fresh-read Task / Node
        ↓
Worker 通过正式 Action 推进业务
```

Extension 在中间做了很多工作，却没有替 Task Owner 决定 Node 状态。这正是 Browser Driver 与业务 Owner 的边界。

## 历史来源与证据入口

这篇文章主要吸收：`13-Browser从万能Host到双平面Reality-Adapter.md`、`15-Custom-GPT从在线配置到外部Deployment-Resource.md`，并继承 `05-自动化验收Harness演进.md` 中 Playwright / AX Reality 经验、`17-从UNCERTAIN到Reality-Reconciliation.md` 中 no-blind-retry 规则，以及当前 Browser Extension 源码对 Worker、Collaboration、Permission、Product discussion、Provisioning、Local Tool、Monitor、Task UI、Recovery / System Observer 多条 lane 的现实校准。

历史文章用于解释为什么 Browser 会从万能 Host 收缩成 Driver；今天每条 command、lane 和 runtime 状态仍以当前源码与真实运行证据为准。
