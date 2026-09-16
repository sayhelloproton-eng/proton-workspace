# Agent 怎样进入浏览器和代码环境

> 唯一职责：比较浏览器与代码环境中的观察、行动、反馈和完成判定。

## 同一个 Loop 进入两种反馈密度不同的环境

想象两个任务：一个 Agent 要在网页里提交申请，另一个 Agent 要在仓库里修复缺陷。它们都能沿 `Observe → Decide → Act` 循环行动，但“看到什么才算事实”“怎样验证完成”“失败后能否回滚”完全不同。浏览器更接近不断变化的外部世界，代码环境则拥有 Diff、测试、构建和版本控制等更强的机器反馈。

因此这篇不按产品名分类 Agent，而是先看它进入了什么工作环境，以及这个环境能提供多强的观察、动作和验证信号。

```text
Browser：页面、DOM、网络、会话、视觉状态、外部副作用
Coding：仓库、文件、符号、终端、测试、构建、版本控制
```

环境决定 Agent 能看见什么、能做什么、能否回滚、反馈有多机器可验证，以及多大自治才安全。

## 页面回读与测试反馈怎样改变 Agent 行为

#### 本节新词

- **Execution Environment（执行环境）**：Agent 实际观察和行动的外部世界，包括可见状态、允许动作、会话、权限和反馈方式。它不是一组 Tool 的别名。
- **Browser Agent（浏览器 Agent）**：主要在网页、浏览器会话和远端应用状态中观察与行动的 Agent。它描述的是工作环境，不自动说明业务领域。
- **Coding Agent（编码 Agent）**：主要在代码仓库、文件、终端、测试和版本控制中工作的 Agent。它通常拥有更强的机器可验证反馈，但仍不等于“改完代码就一定正确”。
- **Machine-verifiable Feedback（机器可验证反馈）**：能由程序重复检查的结果，如测试、编译、类型检查、结构化页面状态或 Diff。它与模型自我评价不同，属于外部验证信号。


```text
Browser: page/screenshot/DOM → action → page state → readback
Coding:  source/repo         → edit   → test/build → diff/result
```

Browser Agent 与 Coding Agent 的共同本质是 **Agent 进入可行动、可观察的 Environment**。差别在于反馈密度：代码环境有 Test/Build/Diff 等强机器信号，浏览器环境则更依赖页面状态、DOM、截图和真实 Effect 回读。

## 先拆开 Agent 分类的三个维度

#### 本节新词

- **Interaction（交互形态）**：人通过 Chat、Voice、IDE 或 GUI 等方式怎样与系统交互；它不等于 Agent 的业务责任。
- **Domain（业务领域）**：Agent 对哪类专业结果负责，例如 Recruiting、Finance、Software Engineering。
- **Environment（工作环境）**：Agent 在哪个外部世界中观察和行动，例如 Browser、Repository、Shell、Email 或 Database。
- **IDE（Integrated Development Environment，集成开发环境）**：把编辑、导航、调试和构建等开发能力集中在一个界面中的软件环境。它是 Coding Agent 常见的交互入口，不是 Agent Runtime 本身。
- **GUI（Graphical User Interface，图形用户界面）**：通过窗口、按钮和视觉元素与软件交互的界面形态；Browser/Computer Use 经常面对它。


Chat Agent、Browser Agent、Coding Agent、招聘 Agent、销售 Agent 经常被放进同一列表，但它们描述的不是同一个维度：

| 维度 | 回答的问题 | 示例 |
|---|---|---|
| Interaction | 人怎样与 Agent 交互 | Chat、Voice、IDE、GUI |
| Domain | Agent 对什么专业结果负责 | Recruiting、Sales、Finance、Software Engineering |
| Environment | Agent 在什么世界中观察和行动 | Browser、Repository/Shell、Email、CRM、Database、Desktop |

例如：

| Agent | Interaction | Domain | Environment |
|---|---|---|---|
| Recruiting Agent | Chat | Recruiting | Browser + Email + Database |
| Development Agent | IDE / Chat | Software Engineering | Repository + Shell + Browser |

因此 Browser Agent 主要描述 Environment，不自动说明业务责任；Coding Agent 同时强绑定 Software Engineering Domain 和 Repository/Shell/Test Environment。产品名不能替代架构分类，“它在哪里工作”也不能替代“它对什么结果负责”。

## Browser Environment

#### 本节新词

- **DOM（Document Object Model，文档对象模型）**：浏览器把页面结构表示成可查询的节点树。DOM 比截图更结构化，但未必包含用户真正看到的全部视觉状态。
- **Accessibility Tree（无障碍树）**：浏览器为辅助技术暴露的语义结构，常能提供控件角色、名称和状态。它与 DOM 有重叠，但不是同一份树。
- **Visual Computer Use（视觉计算机操作）**：根据截图或屏幕视觉信息定位并操作界面。它更接近人类使用方式，但结构信息更弱、验证成本通常更高。
- **URL（Uniform Resource Locator，统一资源定位符）**：浏览器当前资源地址，可帮助判断导航位置，但 URL 正确不等于业务状态已成功提交。
- **Readback（回读）**：动作执行后重新观察页面或权威后端，确认现实状态是否真的改变。点击成功与业务完成之间必须靠回读闭环。


Browser Agent 的 Observation 可能来自 DOM、accessibility tree、截图、URL、网络响应和应用状态。单一信号都不完整：DOM 可能隐藏视觉状态，截图缺少语义结构，网络成功不代表页面完成业务流程。

动作包括点击、输入、滚动、上传、下载、导航和调用页面 API。它们可能产生真实外部 Effect，如发送消息、付款、删除数据，因此 Action 必须区分只读探索与高副作用提交。

完成判定应优先使用稳定信号：目标对象出现在回读列表、服务端状态变化、确认号、下载文件内容、可验证页面状态。不能只因按钮被点击或页面出现 toast 就宣称成功。

## Coding Environment

#### 本节新词

- **Git**：分布式版本控制系统，用来记录源码历史和变更边界。Coding Agent 需要区分 Git 已提交事实与本地工作区变化。
- **HEAD**：Git 当前检出位置所指向的提交。它表示基线位置，不包含尚未提交的工作区修改。
- **SHA（Secure Hash Algorithm，安全哈希算法）**：Git 提交常用哈希标识；在工程沟通中通常用提交 SHA 精确指向某个版本。
- **WIP（Work in Progress，进行中的工作）**：尚未完成或尚未提交的本地改动。WIP 可能属于用户或其他任务，Agent 不能把它当成自己的修改随意覆盖。
- **Diff（差异）**：两个版本或工作区状态之间的具体文本变化。Diff 能证明“改了什么”，但不能单独证明行为正确。
- **Lint / Linter（静态风格与规则检查 / 检查器）**：通过确定性规则发现格式、风格或部分代码问题；它与单元测试、类型检查负责的范围不同。


Coding Agent 的优势是反馈密度高：文件 Diff、类型检查、测试、构建、lint、Git status 都能提供机器可验证信号。它也有复杂边界：工作树可能已有用户修改、测试可能不完整、命令 `exit=0` 只证明进程正常结束，不证明行为正确；依赖和网络也可能漂移。

可靠流程：

```text
inspect repository and instructions
→ scope exact files
→ edit
→ diff/readback
→ targeted tests
→ broader validation when justified
→ report residual uncertainty
```

Agent 不应把“能运行命令”误解为“可执行任意命令”。分支、提交、发布、删除和外部写入需要独立授权边界。

## 共同的环境合同

#### 本节新词

- **Environment Contract（环境合同）**：明确环境可观察对象、允许动作、权限、Effect 语义、验证和恢复规则的接口边界。它让 Runtime 不必依赖某个具体 Browser 或 IDE 产品名。
- **Observation Schema（观察结构）**：环境回传给 Agent 的结构化信息合同，例如 URL、元素状态、退出码、文件变化。它描述“看到了什么”，不是最终 Truth。
- **Action Schema（动作结构）**：Agent 可以提出的动作类型、参数和限制。结构合法不等于动作已授权或执行成功。
- **Effect Semantics（副作用语义）**：一次动作会不会改变外部世界、能否重复、能否回滚以及成功如何确认。


```text
observation schema
action schema
permission / approval
effect semantics
verification method
timeout / unknown behavior
recovery / rollback
artifact and evidence references
```

Browser/Coding 的工具实现不同，但 Runtime 可以使用同一 Task/Event/Evidence 原语。

## 关键差异

| 维度 | Browser | Coding |
|---|---|---|
| 状态来源 | 远端应用 + 本地会话 | 文件系统 + Git + 工具链 |
| 可重复性 | 页面与会话易漂移 | 固定 commit 下较高 |
| 验证 | 页面/服务端回读 | tests/build/diff |
| 回滚 | 常依赖业务能力 | Git/文件可较强回滚 |
| 高风险动作 | 发送、购买、删除、公开 | 删除、提交、推送、发布 |
| 并发隔离 | tab/profile/account | worktree/branch/workspace |

## 两类环境最容易制造的完成错觉

- 浏览器中只看截图，不确认目标元素与外部状态；
- Coding 中只看退出码，不检查 Diff 与测试实际覆盖；
- Timeout 后立即重复点击或重复发布；
- 把页面文字、仓库文件当成高权指令；
- 多 Agent 共享同一 tab 或 worktree 并发写；
- 用最终 Artifact 存在替代“它由正确过程和版本产生”的 Evidence。

## Environment-specific Harness

#### 本节新词

- **Environment-specific Harness（环境专用 Harness）**：针对特定工作环境补充定位、会话、测试、Diff、下载或回读能力的工程托架。它是 Harness 的场景特化，不是新的 Runtime。
- **Tool Surface（工具面）**：当前任务实际暴露给模型的可调用能力集合。环境能力再丰富，也应只暴露当前任务需要的最小集合。


Browser 需要元素定位、视觉/结构双观察、会话与下载管理、敏感动作确认。Coding 需要仓库指令发现、搜索、精确编辑、测试选择、Diff 和 Git 边界。两者都需要最小工具面、作用域、预算和外部回读。

## 先按反馈密度选择环境能力

#### 本节新词

- **API（Application Programming Interface，应用程序编程接口）**：软件之间以结构化参数和结果直接交互的接口。相比纯视觉 UI，它通常更容易验证和重试，但并非所有真实任务都提供可用 API。
- **SDK（Software Development Kit，软件开发工具包）**：厂商或平台提供的一组库、类型、工具和示例，用来更方便地调用其 API 或运行时能力。
- **OCR（Optical Character Recognition，光学字符识别）**：从图片中识别文字。它在纯视觉环境中可辅助读取，但会引入识别误差，不能替代结构化 DOM/Accessibility 信息。
- **Computer Use（计算机操作）**：让 Agent 通过鼠标、键盘或视觉界面操作通用软件的能力。它解决“真实任务只能在界面里完成”的问题，但风险和验证要求通常高于结构化 API。
- **Feedback Density（反馈密度）**：环境在每次动作后能提供多少可定位、可机器检查的信号。反馈越密，Agent 越容易发现错误并修正。


优先选择反馈更结构化、动作更可逆的接口：API/DOM 通常优于纯视觉，静态分析和测试优于让模型猜代码效果。但当真实任务只能通过视觉 UI 或运行环境完成时，Computer Use 是必要能力，不应假装底层 API 一定存在。

自治级别取决于：观察可靠性、动作可逆性、验证强度、影响范围和恢复能力，而不是模型品牌。

## 环境专门化怎样交给 Sandbox 与 Eval

- Deep Research 主要在信息环境中行动；Browser/Coding 进入可产生真实 Effect 的环境；
- 下一章不再重复 DOM / OCR / Computer Use，而是专门深化 Sandbox、资源隔离、Blast Radius 和高副作用执行边界；
- Eval 章比较 Trajectory、Artifact 与 Outcome；
- Harness/Runtime 提供 Workspace、长期 State、Recovery 和 Evidence 原语；安全执行章只把这些原语落到真实资源边界。

## 检查 Agent 是否真的读回了环境

1. Browser/Coding Agent 的差异为什么主要来自 Environment？
2. Tool success 与 Goal success 分别怎样验证？
3. Timeout 后为什么不能盲目重复高副作用动作？
4. 哪些信号使 Coding Environment 更容易机器验证？

## 学习导航

[← 上一章](01_研究Agent怎样建立证据链.md) · [新版目录](../README.md) · [下一章 →](03_怎样为Agent提供安全的执行环境.md)
