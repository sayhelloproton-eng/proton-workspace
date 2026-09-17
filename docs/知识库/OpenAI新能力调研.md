# OpenAI 新能力调研

这篇文章不做“OpenAI 最近又发布了什么”的新闻汇总，也不把一堆新名词摆在一起。

我真正关心的是另一件事：**OpenAI 现在已经把哪些 Agent、Coding、Research、Voice 和 Browser 能力做成了可用产品或 API，这些能力和我现在的 ProFlow、ChatWeb、Motor、本机 Agent 工具链分别是什么关系？哪些可以直接替代，哪些值得借鉴，哪些暂时不应该动。**

这份调研会持续更新，但本文当前事实以 **2026 年 9 月 17 日** 为时间点。凡是 OpenAI 产品能力、套餐、API、模型和价格，后续真正实施时都必须重新核验。

为了让文章能直接指导后续迭代，我不按 OpenAI 的产品目录来写，而按“它能替我省掉哪一层”来理解。

先看结论地图：

| OpenAI 能力 | 用人话说它解决什么 | 和我们最接近的东西 | 当前判断 |
| --- | --- | --- | --- |
| Agents API | OpenAI 帮你托管一套能长期跑、会用工具、会分派子 Agent 的 Agent 执行底座 | ProFlow 的 Harness / Runtime 下层 | **重点研究，但不替代 ProFlow 的业务控制面** |
| Codex App Server | 把 Codex 整套工作循环直接开放给你自己的程序或界面 | Motor、本机 Agent 工具链、未来自研 Runtime | **最值得尽快技术验证** |
| Codex MCP / Exec / SDK | 用不同深度把 Codex 接进现有流程 | MCP、Automation、脚本 | **按场景复用，不需要全选** |
| Responses API 新能力 | 让一次模型调用逐渐能处理长期状态、后台任务、工具编排和中途改方向 | ChatWeb Runtime、Agent Harness | **持续吸收设计，不急着绑定** |
| Site tools / WebMCP | 网站主动告诉 Agent“你可以直接调用这些功能”，不必全靠点页面 | ProFlow Browser Runtime、ChatGPT Sites | **非常值得做结构化 Browser 增强** |
| GPT-Live-1 | 一边听、一边说，并把复杂推理和工具动作交给后台 Agent | Interview System / Voice | **技术路线成立，当前成本下先不接** |
| Deep Research | 把计划、找资料、限定来源、中途纠偏、引用报告做成完整研究流程 | ChatWeb Research | **主要借鉴产品和执行方式，不直接替代** |
| ChatGPT Apps / MCP | 让 ChatGPT 成为可以连接外部系统并执行动作的 Agent Host | 当前 Chat → MCP → 本机工具链 | **继续利用，但不能假设所有套餐能力一致** |

这张表里最重要的变化有两个。

第一，**Agents API 已经不再只是一个概念上的对照物。** 2026 年 9 月 10 日，OpenAI 已经把支撑 Codex 的 Agent 执行框架正式做成公开 Beta API。

第二，**Codex App Server 比 Agents API 更直接影响我们现在的 Motor 路线。** 它不是另一个云 API，而是把 Codex 本身的完整工作循环、会话、审批、工具和事件流开放给自己的 Client；而且它支持直接使用 ChatGPT 账号登录。这意味着它有机会承接我们今天依赖网页 Chat 才能获得的一部分能力，同时保留本机工程环境。

所以后面我会先讲这两个，再讲 Browser、Research 和 Voice。

---

## Agents API：OpenAI 开始直接提供“长期 Agent 的运行底座”

以前调用模型，大体可以理解成：

```text
我的程序
→ 发 Prompt / Context
→ 模型回答
→ 我的程序自己决定下一步
```

如果要让 Agent 长时间工作，你还得自己处理：

```text
上下文越来越长怎么办
工具越来越多怎么选
任务跑几小时甚至几天怎么办
失败以后从哪里继续
文件和代码在哪里执行
子 Agent 怎么并行
中间结果放哪里
```

2026 年 9 月 10 日公开 Beta 的 **Agents API**，就是 OpenAI 开始把这一整层直接提供出来。

官方对它的定位非常明确：它使用和 Codex 相同的 Agent Harness（Agent 执行框架：负责上下文、工具调用、Agent Loop 和子 Agent 协调的那层逻辑），并由 OpenAI 托管和维护。

用最简单的话说：

```text
以前
你租模型
Agent 怎么跑，自己写

现在 Agents API
你不仅租模型
还可以把 Agent 的一部分“跑法”一起交给 OpenAI
```

### 它现在已经具体做到什么

截至 2026-09-17，官方已经明确提供这些能力：

- 长时间 Agent Session；
- 自动管理和压缩长上下文；
- MCP、函数和内置工具；
- Tool Search（工具搜索：工具太多时只把相关工具定义加载给模型）；
- Programmatic Tool Calling（程序化工具调用：让 Agent 用代码并行、串联和过滤工具结果，而不是每一步都把结果塞回模型）；
- 子 Agent 并行；
- 文件、中间结果和 Artifact；
- OpenAI 托管 Sandbox（沙箱：隔离的代码和文件执行环境）；
- 也可以接自己的基础设施或第三方 Sandbox；
- Session、Event、Item、Webhook、Tracing 等长期运行需要的运行事实。

这已经和我们过去一年里不断讨论的“一个 Agent Runtime 到底应该有什么”非常接近。

### 和 ProFlow 到底重合在哪里

如果只看能力名称，很容易得出一个过头的结论：

> OpenAI 都做 Agents API 了，那 ProFlow 是不是没必要了？

不是。

先把 ProFlow 当前的几层拆开：

```text
模型
↓
Agent Harness / 单个 Agent 怎么工作
↓
执行 Runtime / 工具 / 环境
↓
Task / Node / Role / Worker / 审批 / 恢复
↓
真实产品迭代流程
```

Agents API 对前两三层的重合非常高。

它可以明显替你承担：

- 单个 Agent 的长期上下文；
- Agent Loop；
- 工具选择和调用；
- 子 Agent；
- 运行环境；
- 长 Session；
- 一部分失败恢复；
- 中间文件和结果；
- 运行事件和可观测信息。

但 ProFlow 现在真正最有独立价值的部分并不只在这里。

ProFlow 自己拥有的这些东西，仍然不是 Agents API 自动替你定义的：

```text
Requirement
Role
Worker Binding
Task Graph
Node Lifecycle
Task Lifecycle
WAITING
Human Approval
Human Attention
Observer
Resume / Reopen
occurrence identity
产品 Campaign
Product / Dev / Test 角色关系
真实产品验收
产品 Gap Review
```

这些描述的是：

> **一个真实产品目标，在多角色、多轮次、多真实副作用的情况下，业务上到底进行到哪里。**

Agents API 描述的重点更接近：

> **一个 Agent Session 怎样可靠地工作。**

二者有重合，但不是同一个层次。

### 最值得 ProFlow 借鉴的不是“换成 API”，而是重新审计分层

Agents API 真正带来的压力是：

如果 OpenAI 已经把下面这些事情做成成熟平台能力：

```text
上下文管理
自动压缩
工具搜索
程序化工具调用
子 Agent
环境
长 Session
运行恢复
```

那么 ProFlow 后续就必须持续回答：

> 这些能力哪些还值得自己维护？

而不是因为历史上已经写了，就永远保留。

所以后续对 ProFlow 最有价值的审计不是“要不要接 Agents API”，而是逐项判断：

| 问题 | 要重新判断什么 |
| --- | --- |
| Context | 是否还有必要自己管理低层压缩和 Session 上下文 |
| Tool | 工具发现和结果过滤能否借鉴 Tool Search / Programmatic Calling |
| Subagent | ProFlow Worker 和模型侧子 Agent 是否需要明确分层 |
| Environment | 哪些执行环境应该属于 ProFlow，哪些可以外包给 Sandbox |
| Recovery | Agent Session 恢复和业务 Task 恢复是否混在一起 |
| Observability | 哪些运行事件属于底层 Agent，哪些才是业务 Evidence |

如果一个能力只是“让模型连续工作得更稳”，以后就要非常谨慎地继续堆进 ProFlow 业务层。

### Agents API 当前为什么不适合直接替换 ProFlow

第一个原因是产品边界。

ProFlow 当前不仅是 Agent Harness，而是一个真实 Task / Worker / Execution / Deployment Control Plane（控制面：保存长期正式状态和状态转换的系统层）。把底层 Agent Runtime 换掉，不应该把业务真值一起交出去。

第二个原因是当前系统已经在真实场景里形成大量 Owner 和恢复语义。现在为了追一个新 API 改底层，会把 Phase 4 当前主线重新变成基础设施迁移。

第三个原因是成本和依赖。

Agents API 本身目前没有单独的平台附加费，官方说法是按使用的模型 Token 和工具计费。但它仍然属于 OpenAI API 计费体系，**不是因为我有 ChatGPT Plus，就自动拥有无限 Agents API 使用量。**

这和我们当前依赖固定 ChatGPT 订阅做高强度工程工作的成本结构不同。

所以目前最合理的位置是：

```text
Agents API
= ProFlow 下层 Runtime 的强对照样本
= 未来可能替换一部分低层自研能力
≠ 现在就替掉 ProFlow
```

---

## Codex App Server：这可能比 Agents API 更直接改变 Motor 的下一步

如果说 Agents API 是“把 Agent 托管到 OpenAI 云上”，那么 **Codex App Server** 是另一条完全不同的路线。

它解决的问题是：

> 我已经很喜欢 Codex 的工作方式，但我不想只能在 Codex CLI、IDE 或官方 App 里用。我能不能把 Codex 整套 Agent 能力嵌进自己的程序？

OpenAI 给出的答案就是 App Server。

### 它不是一个普通 REST API

App Server 是一个长期运行的本机进程。

你的程序启动它以后，通过 stdin / stdout 保持一条双向 JSON 消息通道。

概念上是：

```text
我的程序 / Motor UI
        ↕
Codex App Server
        ↕
Codex Core / Codex Harness
        ↕
模型 + Shell + 文件 + MCP + Skills
```

它不是：

```text
发一次 HTTP
→ 等一个最终文本
```

而是：

```text
Client 发一个请求
→ Agent 开始工作
→ Server 不断发进度事件
→ Tool 开始 / 完成
→ Diff 出现
→ 需要审批时 Server 主动问 Client
→ Client allow / deny
→ Agent 继续
→ 最后 Turn 完成
```

这和一个真正的 Agent Runtime 更接近。

### 它把 Codex 里的三层对象说得非常清楚

OpenAI 当前把交互拆成三个最核心的对象：

```text
Thread
= 一条长期会话

Turn
= 用户发起的一轮 Agent 工作

Item
= 这一轮里的具体事件或产物
  例如用户消息、Agent 消息、Tool、审批、Diff
```

Item 还有明确生命周期：

```text
started
→ delta（如果是流式内容）
→ completed
```

这套模型很值得和我们现在的系统对照。

ChatWeb 当前有：

```text
Conversation
Message
ChatRun
```

ProFlow 当前有：

```text
Task
Node
Worker
Conversation
Execution Effect
Evidence
```

Motor 当前又有：

```text
Chat Turn
Monitor Shift
Handoff
Browser Wake
```

Codex 的 `Thread / Turn / Item` 提供了一个非常干净的低层 Agent 事件模型。

它不一定能替代上面的业务对象，但很适合作为底层参考：

> **Agent 一轮工作内部发生的消息、工具、Diff、审批和进度，是否应该统一成一套 Item 生命周期，而不是每种能力自己发一套事件？**

### 为什么它比 MCP 更适合暴露“完整 Codex”

OpenAI 自己早期也尝试过把 Codex 直接做成 MCP Server。

后来发现一个问题：MCP 很适合暴露“工具”，但完整 Coding Agent 的交互比普通 Tool Call 丰富得多。

例如：

- 一个 Turn 里持续流出很多事件；
- Diff 需要不断更新；
- Server 可能主动请求审批；
- Thread 要持久化；
- Client 断开以后还要恢复；
- Auth、模型发现、Config 也是 Agent 产品的一部分。

这些东西硬塞成几个 MCP Tool 会很别扭。

所以 OpenAI 最终把 App Server 做成了双向 JSON-RPC 风格协议。

这里给我们的启发非常直接：

> **MCP 很适合能力边界，但不一定适合承载整个 Agent Runtime。**

这也正好能校准我们未来“自研 MCP”的边界。

未来自研 MCP 应该更像：

```text
高约束工程能力
apply_frozen_decision
reconcile_side_effect
browser_act_with_identity
run_long_operation
```

而不是试图把：

```text
Motor 的整个生命周期
ProFlow 的 Task Graph
Chat 的所有状态
```

全塞进一个 MCP Server。

### 对 Motor 最关键的一点：App Server 支持直接用 ChatGPT 账号登录

这是这一轮调研里最值得注意的新信息。

App Server 当前认证支持：

```text
API Key
或
ChatGPT 登录
```

官方协议示例里，ChatGPT 登录完成以后甚至会返回：

```text
planType: "plus"
```

它还提供 ChatGPT rate limit 和 usage 查询接口。

OpenAI 的 Codex 帮助文档也明确说明：

```text
用 ChatGPT 账号登录 Codex
→ 使用 ChatGPT 计划的 Codex 使用量和计费体系

自己提供 API key
→ 使用 API 计费
```

这件事和我们当前路线高度相关。

我们过去两个月大量工程优化的一个现实背景，就是：

> 我已经有 ChatGPT Plus 的固定订阅，希望尽可能把高能力模型的使用放在这个订阅里，而不是把每一轮工程都变成 API Token 账单。

现在 App Server 至少从官方协议层证明了一件事：

> **“自定义 Client + Codex Harness + ChatGPT 登录”这条路线是存在的。**

这和 Agents API 完全不同。

### 它可能怎样改变 Motor

今天 Motor / Monitor 的核心链路大致还是：

```text
Browser Extension
→ 驱动网页 Chat
→ Chat 使用 MCP 工具
→ 本机工程
→ Browser 验证
→ 自动注入下一轮提示
```

网页 Chat 既是：

- 高能力模型入口；
- Agent Host；
- 对话 UI；
- Tool Calling Host；
- 长上下文载体。

因此我们必须解决：

- Chat 页面身份；
- Tab / Window；
- 页面是否结束一轮；
- 自动注入；
- 4 小时换班；
- Browser owner；
- UI 恢复；
- Monitor Handoff。

如果未来 Motor 改成 App Server 路线，可能变成：

```text
Motor Runtime / Client
        ↕
Codex App Server
        ↕
Codex Harness
        ↓
Local Repo / MCP / Skills
        ↓
真实工程
```

那么很多“因为网页 Chat 是 Host 才存在的问题”就有机会消失：

- 不需要靠 DOM 判断 Agent Turn 是否结束；
- 不需要为了继续运行自动向输入框发“继续”；
- Thread / Turn 有正式协议；
- Approval 是正式 Server Request；
- Diff / Tool / Message 有正式事件；
- Client 断开后 Thread 可以恢复；
- 可以直接读取使用量和 rate limit；
- UI 可以是我们自己的，也可以根本没有 UI。

这不是小优化，而是可能改变 Motor 控制方式的一层。

### 但现在不能直接说“Motor 换成 Codex App Server”

原因也很明确。

第一，今天 Motor 用的是普通 ChatGPT Chat，不只是在写代码。

它还承担：

- 产品判断；
- 架构讨论；
- 长文档整理；
- 浏览器真实验收；
- 跨项目知识判断。

Codex 虽然越来越通用，但它的核心产品定位仍然是工程和 Coding Agent。我们需要真实测试它做 Motor 主脑时的质量，而不是从协议能力推断模型工作方式一定完全等价。

第二，我们当前两套 Skill、Local Dev、CodeGraph、Repomix、Playwright、Browser Acceptance 已经真实工作。迁移不能为了“协议更漂亮”重新造一套系统。

第三，App Server 的 ChatGPT 登录虽然明确支持 Plus，但**自定义 Client 实际运行时的使用额度、模型可选范围、长时间任务消耗和现有 Plus 工作方式的差异仍需要本机实测。**

所以目前最合理的动作不是迁移，而是一个隔离技术验证：

```text
Codex App Server Spike

1. ChatGPT Plus 登录
2. 建一个 Thread
3. 发起一个真实工程 Turn
4. 观察 Item / Tool / Diff / Approval
5. 接一个现有 MCP
6. 看 Skill 是否可复用
7. 中断 Client 后恢复 Thread
8. 测 rate limit / usage
9. 和当前 Chat + MCP 同一个工程任务对比
```

如果这条 Spike 成立，它应该进入 Motor 后续最高优先级候选之一。

---

## Codex 还有四种接入方式，不要把它们混成一种东西

Codex 现在至少可以从四个不同深度接入。

| 方式 | 最适合什么 | 能拿到多少 Codex 能力 |
| --- | --- | --- |
| App Server | 自己做 UI、Agent Client、长期 Runtime | 最完整 |
| `codex mcp-server` | 已经有 MCP Host，只想把 Codex 当一个工具调用 | 较窄 |
| Codex Exec | CI、脚本、一次性非交互任务 | 单次执行 |
| Codex SDK | TypeScript 程序里直接控制本地 Codex | 比 App Server 简单，但能力面更小 |

### `codex mcp-server`：把 Codex 当成一个 Tool

如果已有 Agent Host 想说：

```text
“这里有一个 Codex 工具，需要时叫它去改代码”
```

那 MCP Server 很方便。

但它的上限也很明显：完整 Codex Thread、Diff、审批和丰富事件不一定都适合映射成 MCP Tool。

对我们来说，它更像：

```text
ProFlow / Motor
→ 调用 Codex Worker
```

而不是：

```text
Codex 成为整个 Motor Runtime
```

### Codex Exec：非常适合确定性自动化边界

Exec 是一次性、可脚本化的非交互执行。

典型适合：

```text
CI
代码审查
生成报告
一次性修复
流水线里的某个 Agent Step
```

它和我们“Automation below Model”的思想很契合。

如果某个流程已经明确到：

```text
给 Codex 一个任务
→ 跑完
→ 输出结构化结果
→ exit 0 / non-zero
```

就没必要为了这一步维护长期 App Server 会话。

### Codex SDK：适合 TypeScript 内嵌，但不是完整协议面

Codex SDK 更像普通程序库。

优点是不用自己写 JSON-RPC Client。

缺点是目前语言和能力面都比 App Server 小。

所以如果只是做一个 Node 服务里很轻的 Coding Agent 功能，可以先看 SDK；如果目标是 Motor 这种完整长期 Agent Host，App Server 更值得研究。

---

## Responses API 也在变：普通“模型请求”正在逐渐长成 Agent Runtime

除了 Agents API，OpenAI 现在的普通 API 层也已经比过去的“Chat Completions”丰富很多。

当前官方文档已经把下面这些能力作为核心概念：

```text
Conversation state
Background mode
Streaming
WebSocket mode
Mid-turn steering
Multi-agent
Compaction
Webhooks
```

工具层又增加了：

```text
Web Search
File Search
MCP
Skills
Tool Search
Programmatic Tool Calling
Async Tool Calling
Shell
Computer Use
Apply Patch
Local Shell
Code Interpreter
```

不用背这些词。

它们总体只说明一个变化：

> **OpenAI 的 API 正从“模型回答接口”，逐渐变成“模型 + 状态 + 工具 + 长任务 + Agent 编排”的运行层。**

### 对 ChatWeb 最有价值的是“执行协议”，不是绑死 OpenAI

ChatWeb 当前已经自己拥有：

```text
Conversation
Message
ChatRun
Streaming
Stop / Retry
Provider
Context Provider
Web Search
Attachment / Voice
Citation
```

所以不能因为 OpenAI Responses API 现在越来越完整，就把 ChatWeb 重写成 OpenAI UI。

ChatWeb 的独立价值之一，就是 Provider 可以替换，当前还能连接自己的手机模型、RAG 和 Search。

但 OpenAI 现在这些能力很值得反向检查 ChatWeb：

- Background mode 对长 ChatRun 怎么建模；
- Mid-turn steering 对“生成中用户改方向”怎么处理；
- WebSocket 对长期双向交互是否比纯 SSE 更合适；
- Conversation state 哪些应该由 Provider 持有，哪些必须仍由 ChatWeb 自己持久化；
- Tool Search 怎样避免一次把大量工具 Schema 塞进 Context；
- Programmatic Tool Calling 怎样减少模型在机械 Tool Call 之间反复进出。

这里最应该吸收的是机制，不是供应商绑定。

### 对本机 Agent 工具链最值得借的是 Tool Search 和程序化工具调用

我们现在已经有：

```text
Local Dev
CodeGraph
Repomix
Playwright
以后还会有自研 MCP
```

工具越来越多以后，一个非常现实的问题是：

> 每一轮是不是要把所有 Tool Schema 都喂给模型？

OpenAI 的 Tool Search 思路就是：只有真正相关的工具，才在需要时加载。

这和我们当前“Fact Owner 优先”的路由思想非常接近，但它更进一步进入了 Harness 层。

Programmatic Tool Calling 则对应另一个已经反复踩过的问题：

```text
Tool A
→ 模型看结果
→ Tool B
→ 模型看结果
→ Tool C
→ 模型过滤
```

如果 A/B/C 之间没有真正需要模型判断的地方，这就是控制平面碎片化。

OpenAI 现在的方向也是：让 Agent 可以在代码里并行、串联和过滤工具结果，只把真正有价值的信息送回模型上下文。

这和我们当前 Automation / Runner 的方向几乎是同一个原则：

> **确定性的工具编排尽量不要每一步都重新消耗模型。**

---

## Site tools / WebMCP：Browser Agent 不一定永远靠“看页面再点击”

我们现在的 Browser 自动化大体还是：

```text
看页面
→ 找目标
→ click / type / navigate
→ 再看页面确认
```

这已经比纯 Vision 稳很多，但仍然依赖 UI 结构。

Site tools 给了另一种思路。

### 网站自己把“可以做什么”告诉 Agent

WebMCP 是一个还在实验阶段的开放提议。

OpenAI 在自己的产品里把它实现成 **Site tools**。

一个网页可以主动注册：

```text
search_products
add_to_cart
create_comment
find_section
save_design
```

以及每个动作需要什么参数。

Agent 打开这个页面以后，不一定要：

```text
找按钮
→ 猜按钮语义
→ 点击
```

而可以直接：

```text
调用 add_to_cart({ sku, qty })
```

而且动作仍然发生在当前网页自己的登录态和业务逻辑里。

### 这对 ProFlow Browser Runtime 非常有价值

ProFlow 现在已经有 Browser Driver、真实页面识别和 Browser Acceptance。

后续更合理的 Browser 能力层级可以是：

```text
当前页面有 Site Tool
→ 优先使用结构化 Site Tool

没有
→ 再使用 DOM / Accessibility Tree

再不行
→ Vision / Computer Use
```

也就是说：

> 能调用网站明确提供的函数，就不要先模拟一个人去点按钮。

这种方式的好处很实际：

- 参数可校验；
- UI 改个位置不一定影响 Agent；
- 行为名称更明确；
- 更容易记录审计日志；
- 更容易做幂等和副作用分类；
- Agent 不需要浪费大量上下文解释“这个蓝色按钮可能是什么”。

### 但 WebMCP 不能替代 Browser

Site tools 只有网站主动提供时才存在。

大量现有网站不会提供。

而且有些任务本来就是视觉任务：

```text
这个页面是否遮挡
图表是否正确
按钮间距是否一致
用户是否真的看到成功状态
```

这些仍然必须看真实页面。

所以正确关系不是：

```text
WebMCP 替代 Playwright
```

而是：

```text
结构化 Site Tool
+ Browser 真实观察
+ DOM 操作
+ 必要时 Vision
```

### 对 ChatWeb / Sites 也有另一层意义

ChatWeb 后续部署到 ChatGPT Sites 以后，如果某些产品能力适合 Agent 直接操作，可以让网站自己暴露 Site Tool。

这意味着：

> ChatWeb 不需要重新变成一个“本机 MCP 控制台”，也能让 ChatGPT / Codex 在页面内部获得结构化操作能力。

这是“让网页 Agent-ready”与“让网页控制用户电脑”之间非常重要的区别。

---

## GPT-Live-1：真正的实时语音已经可以和后台 Agent 分工

以前我们讨论 Voice 时，最容易把问题理解成：

> 语音模型说话自然不自然？

现在这个问题已经不是最大的技术障碍了。

GPT-Live-1 已经能同时听和说，也就是用户还在说话时，它仍然持续理解，而不是严格等“你说完一轮，我再说一轮”。

更重要的是，它可以把复杂推理和工具动作委托给后台模型或 Agent。

概念上是：

```text
GPT-Live-1
负责实时听说、停顿、打断、自然交流
        ↓
后台 Agent / Model
负责复杂推理、查资料、调用工具
        ↓
结果回到 Live Voice
```

这比过去简单的：

```text
Speech-to-Text
→ LLM
→ Text-to-Speech
```

更接近一个真正的语音 Agent。

### 这终于能在技术上支撑“正式面试系统 + Voice”

我们理想的面试链一直是：

```text
语音交流
↓
读取正式面试库
↓
根据当前短板选题
↓
动态追问
↓
评分
↓
训练结果写回
```

以前普通 Chat Voice 最大的问题不是“听不懂”，而是它不能稳定成为这个 Repository-connected Runtime 的工具入口。

如果用 GPT-Live-1 自己搭一个 Voice Runtime，这条链在技术上已经很清楚：

```text
GPT-Live-1
↕
Interview Agent
↓
RAG / 正式题库 / 项目资料
↓
选题、追问、评分、写回
```

### 为什么当前仍然不做

原因不是技术不成立，而是成本收益不成立。

当前 GPT-Live-1 API 按实时语音时间收费，后台模型和工具调用还会另外计费。

而我现在已经能通过：

```text
Work + 本机资料
```

完成正式训练，也能用普通 Voice 做轻量练习。

为了个人面试训练再维护一套实时 Voice Runtime，目前没有足够收益。

因此当前结论仍然是：

```text
技术路线 = 已成立
个人项目当前实施 = 暂缓
```

真正值得重新评估的条件包括：

- API 成本下降；
- ChatGPT 计划里出现可复用的 Live Agent 接入；
- Voice 能直接使用我们已经有的本机 Tool / Plugin；
- 面试系统变成需要独立产品化的长期应用。

---

## Deep Research：它最值得抄的不是“会搜索”，而是整个研究过程

ChatWeb 已经有自己的 Web Search 和 Research 方向。

所以我们没有必要因为 OpenAI 有 Deep Research，就直接变成：

```text
ChatWeb
→ OpenAI Deep Research API
```

但 OpenAI 现在的 Deep Research 已经把几个非常关键的产品问题做得更完整。

### 开始研究前先把目标讲清楚

当前 Deep Research 会先明确：

- 你最终想得到什么；
- 报告大概长什么样；
- 要使用什么来源；
- 哪些网站可以或不可以搜索。

这比一上来就疯狂 Search 更稳。

ChatWeb 后续也应该保持：

```text
Research Goal
→ Plan
→ Source Scope
→ Execute
```

尤其 THINK / Deep Research 模式里，用户应该能先看见“它准备怎么查”。

### 来源范围应该是一等输入

OpenAI 现在允许 Research：

- 限定可信网站；
- 使用文件；
- 使用 App / MCP 的读取能力；
- 把外部资料和公开 Web 混合起来。

这和 ChatWeb 当前的：

```text
Public Web
Files
Context Provider
RAG
```

高度一致。

后续 ChatWeb 应该继续把 Source Scope（资料范围）做成正式输入，而不是让每个 Search Tool 自己偷偷决定。

### Research 运行中可以改方向

现在 Deep Research 支持在运行过程中：

```text
查看进度
→ 中断
→ 补充问题或新来源
→ 继续
```

这非常值得借鉴。

因为真实研究经常是：

> 查到一半以后，我才知道真正的问题是什么。

如果用户每补一句条件都必须整轮重跑，长任务成本会非常高。

这和 OpenAI API 现在出现的 Mid-turn Steering（执行中改方向）其实是同一个产品趋势。

### 引用和来源仍然是 ChatWeb 必须自己拥有的产品能力

ChatWeb 当前已经把 Citation、Provenance、Source Inspection 当成正式能力。

即使以后底层 Search 或 Research Provider 换成 OpenAI，也不应该把前端产品里的来源身份完全交给 Provider。

因为 ChatWeb 最终仍然要回答：

```text
这句话来自哪里
哪条证据支持它
多个来源冲突怎么办
用户怎样打开和检查来源
```

这属于 Chat 产品自己的可信交互。

所以 Deep Research 当前最适合的定位仍然是：

```text
Research 产品与执行方式的参考
≠ ChatWeb 必须依赖的 Runtime
```

---

## ChatGPT Apps / MCP：我们已经在用这条路线，但它仍然有产品边界

我们过去两个月的本机 Agent 工具链已经证明：

```text
ChatGPT
→ MCP
→ Secure MCP Tunnel
→ 本机工具
```

可以成为真实工程入口。

当前 OpenAI 官方产品也在继续扩大 MCP App 能力：

- ChatGPT 可以连接自定义 MCP App；
- 本机或私网 MCP 可以通过 Secure MCP Tunnel 进入支持的产品；
- 不再要求 Server 必须有固定 `search / fetch` 才能连接；
- 部分企业套餐已经开始支持完整 write / modify 动作；
- Deep Research 可以使用自定义 App 的读取能力。

但是这里不能把“协议能力存在”写成“所有套餐里都一样”。

截至当前官方说明，完整写入型 MCP 的开放范围仍然和套餐、Workspace 类型有关，而且仍处于 Beta 演进中。

所以我们的原则仍然应该是：

```text
产品文档写官方边界
本机系统看真实运行事实
```

如果当前 Chat 里 Local Dev 已经可以真实工作，就以本机 Runtime 为准；但不能据此推导“任何普通用户装一个 MCP 都能获得同样写权限”。

这对以后把能力公开给别人尤其重要。

---

## 把这些新能力放回我们现在的四条主线

看完每项能力以后，再回到我们自己，关系会更清楚。

### ProFlow：最重要的是守住“业务控制面”，下层要越来越敢于复用

ProFlow 不应该和 OpenAI 比谁能写出更多 Agent Runtime 功能。

真正应该坚持的是：

```text
Task
Role
Worker
Business State
Effect
Evidence
Human Decision
Recovery
Product Iteration
```

这些长期业务事实。

而下面这些能力，以后都应该更开放地评估复用：

```text
Agent Session
Context Compaction
Tool Search
Subagent
Sandbox
Agent Event Stream
基础 Agent Recovery
```

如果 Agents API 或其他成熟 Runtime 能稳定解决，就没必要为了“自研完整”而重复做。

因此 ProFlow 后续边界应该越来越像：

```text
ProFlow
= 业务级 Agent Orchestration / Control Plane

底层 Agent Harness
= 可以替换、可以比较、可以复用
```

而不是把两层绑死。

### Motor：Codex App Server 是当前最应该验证的新入口

Motor 当前最重的依赖之一是网页 Chat Host。

这个 Host 给了我们很强的模型和现成 Tool Loop，但也带来了：

- Browser 驱动；
- Turn 完成检测；
- 自动续轮；
- Chat Handoff；
- UI 状态恢复；
- 页面生命周期。

App Server 第一次提供了一个非常现实的替代候选：

```text
仍然使用 Codex / ChatGPT 账户能力
但 Agent Loop 有正式协议
Client 可以由我们自己控制
```

所以在这批能力里，Motor 的优先级最明确：

> **先验证 Codex App Server，不先重写 Motor。**

如果验证不成立，当前 Browser Motor 继续跑；如果验证明显更稳、更省控制面，再决定是否演进。

### 本机 Agent 工具链：自研 MCP 和 App Server 是互补，不是二选一

我们未来计划做“限制更死”的自研 MCP，这个方向并没有因为 App Server 出现而失效。

相反，边界更清楚了：

```text
App Server
= Agent 怎么想、怎么跑、怎么维持 Thread / Turn / Approval

自研 MCP
= Agent 被允许怎样操作本机现实
```

一个负责 Agent Harness，一个负责高约束能力合同。

例如：

```text
Motor / App Server
        ↓
自研 Engineering MCP
        ↓
apply_frozen_decision
run_long_operation
reconcile_effect
        ↓
真实 Mac / Git / Browser
```

这比“自研一个大 MCP，把整个 Agent Runtime 都塞进去”合理得多。

### ChatWeb：继续做独立 Chat 产品，不因为 OpenAI API 变强就退化成壳

ChatWeb 当前真正的价值是：

- 自己拥有 Conversation / Message / ChatRun；
- Provider 可替换；
- RAG 可替换；
- Search 自己控制；
- Citation 自己控制；
- 可以使用手机模型；
- 可以作为独立 Sites 产品。

OpenAI Responses / Research / Voice 的新能力，都可以成为 Provider 或参考实现，但不应该让 ChatWeb 失去产品独立性。

真正值得持续吸收的是：

- 长任务怎么展示；
- 运行中怎么改方向；
- Tool 越来越多怎么降 Context 成本；
- Voice 和后台 Agent 怎么分工；
- Research 怎么控制来源；
- 浏览器怎样优先结构化 Tool。

---

## 现在到底该做什么

把所有新东西研究完以后，最危险的是产生一种错觉：

> 每个新能力都应该马上接进项目。

这会让主线永远被新技术打断。

所以我把当前动作压成四类。

### 现在就值得验证

**Codex App Server。**

原因不是它“新”，而是它可能直接降低 Motor 当前最复杂的一层控制成本，同时仍有机会继续使用 ChatGPT 计划里的 Codex 能力。

验证范围应该非常小：

```text
ChatGPT Plus 登录
→ Thread / Turn
→ 一次真实 repo 工程任务
→ MCP Tool
→ Approval
→ Diff / Event
→ 断开恢复
→ usage / rate limit
```

只做技术验证，不改主产品。

### 继续重点观察

**Agents API。**

它的发展会直接告诉我们：行业里“Agent Harness / Runtime”最终会标准化到什么程度。

尤其关注：

- 长 Session；
- Context Compaction；
- Tool Search；
- Programmatic Tool Calling；
- Multi-agent；
- Environment；
- Agent Recovery。

这些能力越成熟，ProFlow 越应该只保留自己真正独有的业务层。

### 可以直接借鉴设计

**Deep Research、Site tools / WebMCP、Responses API 的运行中交互。**

它们非常适合直接影响：

```text
ChatWeb Research UX
ProFlow Browser Runtime
Motor Tool Routing
```

但不需要为了借鉴设计就立刻接一个收费 API。

### 当前暂时不做

**GPT-Live-1 正式接入。**

技术已经足够有吸引力，但个人面试训练当前仍然有 Work / Voice 可用，额外 Voice Runtime 和 API 费用暂时没有明确收益闭环。

---

## 和 9 月 14 日旧调研相比，哪些判断已经变化

旧调研不是错了，但三天时间里已经有几件事需要更新。

### Agents API 从“外部架构参考”变成了真正可调用的公开 Beta

旧稿把它主要当作未来对照。

现在官方已经公开 API、Session、Environment、Tool、Subagent 和 Sandbox 能力。

因此现在更准确的判断是：

```text
不是“是否存在”
而是“以后哪一层值得被它替代”
```

### 成本判断要修正得更精确

旧稿容易给人一种印象：Agents API 本身会再收一层平台费。

当前官方说明是：Agents API 公测阶段没有额外 API 附加费，主要还是模型 Token 和工具使用成本。

但它仍然是 API 计费，不等于 ChatGPT Plus 包含。

这个区别必须保留。

### Codex App Server 是旧稿里最大的缺项

旧稿没有把它作为正式研究对象。

而当前事实显示：它已经是 OpenAI 推荐的 Codex 一等集成方式，并且开放了：

- Thread；
- Turn；
- Item；
- Approval；
- Auth；
- Tool / MCP；
- Skill；
- Diff；
- Event；
- ChatGPT 登录；
- Rate limit / Usage。

这和 Motor 的关系远高于一般 API，所以必须升级成独立主线。

### Voice 也已经从“未来技术可能”变成“技术路线明确、成本暂不值”

GPT-Live-1 已经把实时语音和后台 Agent 分工做成正式 API 能力。

所以现在不能再写成：

> “理想 Voice Runtime 未来可能做得到。”

更准确是：

> “现在已经做得到，但我们当前不值得为它付出额外成本和维护面。”

### Deep Research 的“中途纠偏”现在更值得 ChatWeb 学

当前 Deep Research 已经把：

```text
研究计划
来源控制
实时进度
中途追加要求和来源
引用报告
```

连成完整体验。

这比单纯“多轮搜索”更接近 ChatWeb 后续真正应该完善的 Research 产品。

---

## 最后形成的判断

这一轮调研以后，我对 OpenAI 新能力的判断不是“OpenAI 越来越强，所以我们做的东西没意义”。

反而更清楚了。

过去很多东西我们之所以自己做，是因为当时外部平台没有把它做成稳定能力。

现在行业平台开始补上：

```text
长 Session
Context 管理
Tool Search
子 Agent
Sandbox
完整 Coding Harness
实时 Voice
结构化网站工具
长期 Research
```

这意味着我们以后应该更敢于把**通用底层能力**交给成熟平台。

但真正不应该轻易交出去的是：

```text
我们自己的产品目标
业务状态
Task / Role / Worker 语义
真实副作用事实
验收标准
恢复规则
产品迭代决策
跨 Provider 的产品能力
```

所以长期方向应该越来越清楚：

```text
通用 Harness / Runtime
→ 尽量复用、可替换

本机高约束动作
→ 用 Tool / 自研 MCP 做硬合同

产品级长期真值
→ ProFlow / ChatWeb 自己拥有

持续自迭代
→ Motor 把上面几层串起来
```

在所有新能力里，**Codex App Server 是当前最值得我们真正动手验证的一项**。

因为它第一次同时碰到了我们最关心的三件事：

```text
完整 Agent Harness
+ 本机工程环境
+ ChatGPT 账号 / 计划使用量
```

如果这一条真实验证成立，Motor 的下一阶段可能不再只是“怎样把网页 Chat 自动驱动得更稳”，而会变成：

> **怎样让一个可编程、可恢复、可观测的 Codex Harness 成为 Motor 的 Agent 执行入口，同时继续复用我们已经成熟的本机工具、Skill、Automation 和真实验收体系。**

这会是比继续给 Browser Loop 加规则更值得研究的一层。

---

## 当前参考资料

以下主要使用 OpenAI 官方当前资料；日期和产品行为在真正实施时需要重新确认。

### Agents API

- Introducing the Agents API
  https://openai.com/index/introducing-the-agents-api/
- Agents API documentation
  https://developers.openai.com/api/docs/guides/agents-api/overview

### Codex App Server / Codex integration

- Unlocking the Codex harness: how we built the App Server
  https://openai.com/index/unlocking-the-codex-harness/
- Codex App Server documentation
  https://developers.openai.com/codex/app-server
- Using Codex with your ChatGPT plan
  https://help.openai.com/en/articles/11369540

### Voice

- GPT-Live-1 in the API
  https://openai.com/index/introducing-gpt-live-1-in-the-api/
- GPT-Live documentation
  https://developers.openai.com/api/docs/guides/live
- Realtime API
  https://platform.openai.com/docs/api-reference/realtime

### Deep Research

- Introducing deep research
  https://openai.com/index/introducing-deep-research/
- Deep research API guide
  https://developers.openai.com/api/docs/guides/deep-research

### ChatGPT MCP / Apps / Site tools

- Developer mode and MCP apps in ChatGPT
  https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt
- WebMCP Challenge / Site tools
  https://openai.com/webmcp-challenge/
