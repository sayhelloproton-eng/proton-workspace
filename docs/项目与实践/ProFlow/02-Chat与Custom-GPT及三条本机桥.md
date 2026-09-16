# ProFlow｜Chat、Custom GPT 与三条本机桥

> 状态：ACTIVE_RESEARCH
> 目的：彻底拆开“ChatGPT 能操作本机”这句过度模糊的话。

## 1. 第一件必须说清楚的事：Chat ≠ Custom GPT

#

## Chat / Planner

普通 Chat 更接近项目研发阶段的高价值认知入口：

- 和用户讨论目标与边界；
- 做产品/架构判断；
- 读项目 Context；
- 规划、审计、复盘；
- 通过工具参与真实工程执行。

它不是一个发布给 ProFlow 用户的固定 Agent Role。

#

## Custom GPT

Custom GPT 是 ChatGPT 内被配置、版本化、可复用的专业角色 Carrier：

```text
Instructions
+ Knowledge
+ Capabilities
+ Actions
+ Role-specific auth
```

在 ProFlow 中，它后来进一步拥有真实 `g-id` Role 和 `c-id` Worker Conversation identity。

#

## Model Runtime

ProFlow 自己的 FAST / REASON Model Runtime 是第三件事。

```text
Custom GPT native cognition / Actions
!=
ProFlow Model Runtime ReasoningSpec / FAST / REASON
```

当前 Spec 甚至明确禁止因为 Custom GPT 能 native Function Calling，就给本地小模型开放自主无限 Tool Loop。

## 2. 第一条桥：研发侧 Chat ↔ 本机工程——它是被吞吐瓶颈一步步逼出来的

这条历史不能从今天的 MCP / 四 Plane 倒推。`PROJECT_OWNER_CONFIRMED` 的真实顺序是：最初甚至不知道 Chat 网页版支持 MCP，只知道网页 Chat 可以选择高级模型。

#

## 阶段 A｜Codex 额度不足 → 改用 Chat 高级模型，但靠人肉搬运仓库

```text
Codex 额度成为限制
→ 转到 Chat 网页端使用高级模型
→ 手工把仓库打成压缩包上传给 Chat
→ Chat 分析 / 设计 / 审计
→ Chat 生成执行提示词
→ 把提示词交给本地 DS 执行
→ 再打包仓库上传给 Chat 审计
```

这一阶段已经证明：**高级模型本身不是唯一瓶颈，真正拖慢迭代的是本机 Context 与执行结果在人和 Chat 之间来回搬运。**

这段历史现在还有同期 Git 旁证，但要严格区分证据类型。`PROJECT_OWNER_CONFIRMED` 提供“手工 zip + Chat + 本地 DS”的具体工作现场；仓库侧则在 2026-08-01～08-02 连续出现：

```text
3db6f0a  feat(skills): add planner executor handoff protocol
2c365d3  feat(skills): install planner executor handoff v0.3
6f7a007  fix(skills): harden planner executor handoff validation
85423d2  feat(skills): freeze low-capability executor delivery
f0699e8  chore(skills): accept planner-executor-handoff v0.4.0
```

该 Skill 当时已经包含 handoff bundle、executor prompt renderer、reception ack、execution result、failure-stop、review/checkpoint 与 executor switch contract。它不能单独证明“zip 怎么传”的具体动作，但能独立证明：**同一时期项目确实在把“高级 Planner 负责边界/审计，低能力本地 Executor 负责受控执行”的人工协作模式协议化。**

#

## 阶段 B｜把“人肉搬运”脚本化，但 zip 往返仍然是瓶颈

为了减少手工操作，工作流进一步变成：

```text
Chat 分析
→ 直接生成压缩包 / 解压替换脚本
→ 本地执行脚本
→ 重新打包
→ 上传给 Chat 审计
```

这解决了部分文件替换和交付动作，却没有消除 `打包 → 上传 → 分析 → 执行 → 再打包 → 再审计` 的 Context round-trip。随着 ProFlow 变大，这套方法本身开始成为开发吞吐瓶颈。

#

## 阶段 C｜因为瓶颈才去调研，第一次知道 Chat 网页版支持 MCP

这里的因果关系很重要：**不是先知道 MCP 再决定搭 Harness，而是 zip/script 工作流已经慢到不可接受，才主动调研 Chat 有没有直接连接本机的方法。**

第一步只接 Shell：

```text
Chat Web
→ MCP
→ Shell
→ 本机文件 / 命令
```

它第一次消除了“每轮都要手工上传仓库”的硬边界，但大型工程查询仍大量依赖 `find / rg / cat / 目录遍历`，结构定位和调用链理解效率仍低。

#

## 阶段 D｜Shell 能执行，但理解大型代码仍慢 → 接 CodeGraph

```text
Shell      → 文件 / 命令 / 精确执行
CodeGraph  → symbol / caller / callee / dependency / composition / blast radius
```

这一步解决的不是“能不能访问代码”，而是**怎样减少 Chat 为理解仓库结构而进行的大量低价值搜索**。

#

## 阶段 E｜代码可以直接查改，但真实验证仍靠人 → 接 Browser MCP

手工打开页面、复现步骤、截图、把结果再告诉 Chat 仍然很慢，于是 Browser MCP 进入：

```text
Chat
→ Browser MCP
→ 真实 Chrome
→ observe / click / input / screenshot / DOM / network
→ 真实结果直接回到 Chat
```

研发闭环因此从“Chat 改代码 → 人工验证 → 人转述结果”变成“Chat 改代码 → 自己观察真实 Browser → 再修正”。

#

## 阶段 F｜工具已经齐了，但上下文吞吐仍明显弱于 Work → 接 Repomix

Shell / CodeGraph / Browser 解决了执行、结构和 Reality，但大量文件仍需要多次碎片化读取。与 Work 的实际吞吐对比后，Context throughput 成为新的瓶颈，于是加入 Repomix：

```text
零碎 read × N
→ scoped pack
→ 一次构建稳定聚合上下文
→ grep many
→ read small ranges
→ 再进入 CodeGraph / Local Dev / Browser
```

最终才逐步收敛成今天的工具分工：

```text
Repomix    = Context Plane
CodeGraph  = Structure Plane
Local Dev  = Execution Plane
Playwright = Reality Plane
```

`gptweb-mcp` 再负责这些本机工具 runtime 的统一生命周期与恢复。**这张四 Plane 图是结果，不是起点。**

#

## 这条研发桥真正值得讲什么

它不是“接了几个 MCP”。更准确的是：

> 在用高级模型迭代大型工程的过程中，连续识别并消除 Human Context Transfer、Code Navigation、Reality Feedback、Context Throughput 四类瓶颈，把“Chat + 人工压缩包 + 本地模型执行”的低吞吐工作流逐步工程化成可直接操作本机、理解代码结构、验证真实页面并批量吸收上下文的 AI Development Harness。

**这条桥的用户是“开发 ProFlow 的 Chat”，不是 ProFlow 产品中的 Custom GPT Worker。**

## 3. 第二条桥：产品侧 Custom GPT ↔ 本机 Capability

早期产品链：

```text
用户自然语言
→ Custom GPT
→ GPT Action
→ Public Tunnel
→ Action / Agent Gateway
→ Local Runtime / Domain Public API
→ allowlisted capability
→ structured result
```

这条链的关键设计不是网络本身，而是权限分层：

```text
模型表达 intent
≠ 模型直接获得 Mac 权限
```

Gateway 负责外部协议、认证和路由；真正的本机/Browser Effect 后来统一进入 Execution。

**这条桥的用户是“运行 ProFlow 产品的 Custom GPT Worker”。**

## 4. 第三条桥：平台状态 ↔ 空闲的 Custom GPT Conversation

Custom GPT Actions 是请求—响应式调用。历史设计明确记录：

> 外部系统不能把异步结果直接推入已经空闲的模型推理轮次。

所以 Phase 2 引入 Browser Host：

```text
Task Signal / Dispatch
→ Browser Host 找到 GPT / Conversation
→ 注入最小 Wake Envelope
→ Custom GPT 被重新唤醒
→ 再通过 Action 查询最新正式 Context
```

这是一条方向相反的桥：

```text
Action Bridge
Custom GPT → Platform

Wake Bridge
Platform → Custom GPT Conversation
```

如果没有把这两条方向分开，Browser Host 很容易同时承担 Action、状态机、等待、页面观察、继续执行，最终变成隐藏 Workflow Engine。Phase 2 正是因此踩坑。

## 5. 三条桥后来怎样重新收敛

当前 ProFlow 的方向不是让 Browser 做更多，而是：

```text
Task facts / Owner state
→ deterministic Observer
→ typed WAKE intent
→ Execution-owned Browser Carrier
→ Custom GPT Conversation
```

同时大 Context 不再靠 Browser 粘贴：

```text
Worker
→ getNodeContext / getTaskDocument Action
→ Gateway
→ File Bridge
→ Conversation-native file handling / Code Interpreter
```

于是 Browser 只保留它不可替代的 Reality 职责：

- CREATE / RESTORE / WAKE；
- g-id / c-id identity observation；
- 页面状态与 permission UI；
- screenshot / Vision fallback；
- physical delivery evidence。

## 6. 这条主线真正能讲什么

它不是“我接了几个 MCP / API”。

更强的故事是：

> 同一个 ChatGPT 产品生态里，研发 Chat、Custom GPT Carrier、本地 Model Runtime 分属三种不同认知/运行角色；针对它们与本机世界之间不同方向、不同权限、不同生命周期的问题，逐步形成了独立的研发桥、Action 调用桥和 Browser 唤醒桥，并在真实失败后持续削薄桥接层的业务职责。

这比“ChatGPT + Gateway + Browser”更接近 ProFlow 的真实系统思考。
