# 怎样为 Agent 提供安全的执行环境

> 唯一职责：解释 Agent 进入真实软件环境后，怎样观察、行动、限制影响范围、验证结果并安全恢复。
> 前置阅读：工具调用、动态决策循环、长期任务运行、信息状态与安全恢复章节；研究型 Agent 不是本章前置。

<a id="ch16-learning-question"></a>
## Agent 进入真实环境后，风险从哪里出现

一个 Agent 只读网页时，错误通常只是“看错”；一旦它能够点击提交、执行 Shell、修改文件或控制桌面，错误会变成真实 Effect。此时问题不再只是模型是否聪明，而是：动作能影响多大范围、谁授权、执行后怎样验证、超时后怎样确认现实状态。

上一章已经比较 Browser 与 Coding Environment；本章继续向下抽象出共同的安全执行边界。

<a id="ch16-30s-core"></a>
## 安全执行先问“它能影响什么”，不是“它能看见什么”

上一章已经讲过 DOM、Accessibility Tree、Screenshot、OCR、API、Computer Use，以及 Browser/Coding 环境各自怎样反馈。本章不再重教观察通道，而是沿用那些 Observation，继续追问一个更危险的问题：**Agent 的一次错误最多能改到哪里？**

沿用 Harness 章对 Sandbox（沙箱）的基本定义：它用文件、进程、网络或权限隔离限制任务能影响的环境。本章把这个定义展开成真实的执行边界。

#### 本节新词

- **Blast Radius（影响半径）**：一次错误、越权或失控动作最多能影响的资源范围。安全执行的目标不是假设 Agent 永不犯错，而是把错误限制在可恢复范围内。
- **Least Privilege（最小权限）**：只给当前任务完成目标所必需的最低权限，并尽量缩短权限持续时间。它既适用于文件和网络，也适用于凭证与高风险 Tool。

```text
Task Workspace
↓
Sandbox / execution boundary
├─ readable paths
├─ writable paths
├─ allowed processes
├─ network destinations
└─ scoped credentials

越出边界
→ deny / request approval / use a narrower trusted proxy
```

<a id="ch16-3m-mental-model"></a>
<a id="ch16-three-dimensions"></a>
## Workspace 告诉 Agent 在哪工作，Sandbox 决定它能影响多远

Workspace 可以是一份代码仓库、一个浏览器 Profile、一组下载文件或某个临时目录。它描述任务工作的范围，但**工作范围不自动等于写权限范围**。

例如 Coding Agent 需要读取整个仓库来理解依赖，不代表它必须能写整个磁盘；Browser Agent 需要打开付款页面，也不代表它可以跳过审批直接提交。Sandbox 的价值就在这里：把“任务需要看见的世界”和“任务允许改变的世界”分开。

<a id="ch16-15m-mainline"></a>
## 把 Sandbox 落到四类资源边界

<a id="ch16-browser-environment"></a>
### 3.1 文件系统：读、写、删除不是同一种权限

代码任务常见的安全边界可以是：仓库源码允许读取，只允许写当前 Workspace；用户主目录、系统目录、密钥目录和其他项目默认不可写。删除、覆盖大范围文件或修改 Workspace 外路径，应有更高门槛。

这里不要迷信“模型会遵守 Prompt”。真正的限制必须落到执行器、操作系统权限、容器/沙箱策略或受控文件 Tool 上。Prompt 只能说明规则，不能替代强制边界。

<a id="ch16-coding-environment"></a>
### 3.2 进程：能运行 Shell，不等于能启动任何东西

Shell 会把权限扩展到子进程、脚本、构建工具和包管理器，因此进程边界要回答：允许启动哪些命令、工作目录在哪里、环境变量能看到什么、子进程是否继承同样限制、后台进程何时回收。

对高风险命令，与其让模型自己判断“这次应该没问题”，更稳妥的是由执行层按命令类别、目标资源和当前任务策略做 Gate。

<a id="ch16-dom-visual"></a>
### 3.3 网络：默认可联网会把本地错误变成外部 Effect

网络访问不仅是“能不能搜索网页”。它还可能上传文件、调用生产 API、下载并执行未知内容，或把本地秘密带出受控环境。

因此网络策略应根据任务决定：完全离线、只允许固定域名/服务、只允许只读请求，还是经过受控代理访问外部系统。是否默认拒绝取决于任务和产品，但**网络目的地必须是显式治理对象**，不能隐藏在模型自由浏览里。

<a id="ch16-machine-verifiable-feedback"></a>
### 3.4 凭证与身份：不要把“能调用”做成“拿到所有 Secret”

Agent 需要访问 Git、云服务或业务 API 时，优先给当前任务所需的 scoped credential，而不是把长期高权限密钥直接放进 Context、日志或任意子进程环境变量。

凭证最好能限制资源、动作和有效期；如果某个 Effect 只能由高权限身份完成，可以让受信执行器代为提交，而不是把原始高权限凭证交给模型控制的进程。

<a id="ch16-environment-harness"></a>
### 3.5 Harness 组织工作面，Sandbox 强制 Effect 边界

Harness 可以为 Browser 选择 DOM/视觉通道、管理下载和会话，为 Coding 选择搜索、编辑、测试与 Diff；Sandbox 则回答这些能力**实际允许碰什么资源**。

两者配合后，Tool Surface 可以很丰富，但每个 Tool 的可见范围、可写范围和高风险动作仍受 Runtime / Policy 控制。不要把“工具少”误当成安全，也不要把“工具多”直接等同于越权。

<a id="ch16-environment-runtime"></a>
### 3.6 越出边界时，系统应该停下来，而不是让模型自己放行

当任务需要从只读升级为写入、从本地访问升级为外网、从普通文件修改升级为发布/付款/删除时，执行层应形成明确的权限升级点。前面的 Durable Execution 已经解释 Permission、Policy 和 Approval；这里把它们落到环境资源上。

```text
proposed action
↓
within current sandbox boundary?
├─ yes → execute
└─ no  → deny / approval / narrower privileged executor
```

<a id="ch16-tool-vs-goal-application"></a>
### 3.7 执行成功以后仍要回读现实

沙箱只能限制“能影响多远”，不能证明任务已经做对。动作执行后仍然要沿用前文的 `Observe → Verify → Evidence → State Commit`：文件写成功要看 Diff/测试，浏览器点击成功要看页面或业务状态，API 返回 2xx 也要确认目标 Effect。

<a id="ch16-timeout-application"></a>
### 3.8 Timeout 之后先对账，不要重复制造副作用

高副作用动作超时后，Durable Execution 里的 `UNKNOWN → Reconciliation` 原则仍然成立。付款、发布、提交表单、远端删除都应先读取权威状态，再决定继续、等待还是安全重试。本章不重定义 Recovery，只说明真实环境必须提供可回读的状态入口。

<a id="ch16-multimodal-prereq"></a>
### 3.9 观察能力沿用上一章，安全边界不依赖某一种感知方式

DOM、Screenshot、OCR、Computer Use、Shell、Test 都只是不同 Observation / Action channel。视觉模型更强不会自动扩大允许权限；结构化 API 更稳定也不代表可以绕过 Approval。**感知能力决定 Agent 看得见什么，Sandbox 与 Policy 决定它被允许改变什么。**

<a id="ch16-security"></a>
### 3.10 环境里的文字仍然只是低信任数据

沿用 Durable Execution 已经学过的 Data / Control、Prompt Injection、Authentication / Authorization 边界：网页、仓库文件、日志和 Tool Result 里的文字不能因为“看起来像命令”就改变高优先级 Goal、权限或策略。

这在 Browser/Coding 场景尤其重要，因为 Agent 不只会阅读，还可能产生真实 Effect。安全边界必须由 Sandbox、Permission、Policy、Approval 和执行后验证共同强制；不能只在 Prompt 里提醒模型“不要做危险动作”。

<a id="ch16-deep-read"></a>
## 用 Blast Radius 决定自治级别

评估一个新执行环境时，优先问：

1. 当前任务需要读哪些资源，真正需要写哪些资源？
2. 子进程和脚本会不会突破当前边界？
3. 网络可以访问哪里，是否可能把本地数据带出去？
4. Agent 拿到的是原始高权限 Secret，还是受限凭证/代理能力？
5. 哪些动作必须升级权限或等待 Approval？
6. Effect 发生后，去哪读取权威状态？
7. Timeout / UNKNOWN 时怎样对账，怎样回退？

这些问题决定可接受的自治范围。模型能力更强，只会改变“能不能做”，不会自动改变“应不应该被允许做”。

<a id="ch16-current-facts"></a>
## 当前 Computer Use 与执行环境事实

以下例子核验于 2026-09-03，只用于说明当前产品怎样落实执行环境，不把产品实现当成通用定义：

- OpenAI 早期 Computer-Using Agent 公开说明展示了以 Screenshot 为 Observation、通过虚拟鼠标与键盘行动的 perception → reasoning → action 循环；这仍适合作为视觉 Computer Use 的机制案例。
- OpenAI 当前模型文档显示 GPT-5.6 系列支持 Computer Use；更重要的是，2026 年的 Codex 安全部署说明把 Sandbox 与 Approval 明确配合：Sandbox 限制可写路径、网络和受保护资源，越出边界的动作进入审批；网络访问也通过受管策略限制目标。这是本章“资源边界 + 权限升级”的一个当前实现例子，不是所有 Agent 产品必须照抄的配置。

这些产品事实支持本章的稳定 Environment 模型，但不能反过来成为 Browser Agent 或 Coding Agent 的通用定义。

官方来源：[Computer-Using Agent](https://openai.com/index/computer-using-agent/)、[OpenAI Models](https://developers.openai.com/api/docs/models)、[Running Codex safely](https://openai.com/index/running-codex-safely/)。

本章已把稳定环境定义与带时间戳的产品事实分开。

<a id="ch16-canonical-references"></a>
## 环境反馈怎样交给 Evidence 与 Eval

- Tool / Capability → [Tool 章](../02_知识与能力/03_模型怎样安全调用工具.md)。
- Browser/Coding 的观察通道与 Computer Use → [浏览器和代码环境](02_Agent怎样进入浏览器和代码环境.md)；Harness / Sandbox 基础定义 → [Harness 章](../04_Harness与Runtime/03_怎样让Agent可靠运行.md)。
- Runtime / Task → [Runtime/Task 章](../04_Harness与Runtime/01_一次回答怎样变成长任务.md)。
- State / Context → [State/Context/Memory 章](../04_Harness与Runtime/02_为什么要分开状态上下文与记忆.md)。
- Recovery / Permission / Truth / Evidence → [Durable Execution 章](../04_Harness与Runtime/04_长任务怎样安全恢复.md)。
- Deep Research → [Deep Research 章](01_研究Agent怎样建立证据链.md)，是另一种 Agent specialization，不是 Execution Environment 章 prerequisite。
- Agent Eval → [Evaluation 章](04_怎样证明Agent真的完成了任务.md)。

<a id="ch16-review"></a>
## 用这些问题检查环境自治边界

1. Workspace 与 Sandbox 分别解决什么问题？
2. 为什么“能读整个仓库”不等于“能写整个磁盘”？
3. 进程、网络和凭证为什么都属于 Sandbox 的实际边界？
4. 什么动作应该越出当前边界并触发 Approval，而不是直接放宽整个环境？
5. Sandbox 为什么只能限制 Blast Radius，不能证明 Goal 已完成？
6. Timeout / UNKNOWN 后，执行环境必须提供什么权威回读入口？

## 学习导航

[← 上一章](02_Agent怎样进入浏览器和代码环境.md) · [新版目录](../README.md) · [下一章 →](04_怎样证明Agent真的完成了任务.md)
