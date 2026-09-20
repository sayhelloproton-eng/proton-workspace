# 现代 AI 工程：从 Transformer 到 Agent Platform 的历史演进线

现代 AI 工程不是突然从“大模型”跳到“Agent Platform”的。2017 之后的每一次重要变化，都在解决上一阶段留下的真实问题：模型先学会更好地表示和生成语言，随后变成通用能力底座和可交互助手；当参数知识不够新、不够私有，外部检索进入系统；当“会回答”还不能改变现实，Tool 和能力协议出现；当下一步无法预先写死，Agent Loop 出现；当任务开始跨时间、跨进程、跨真实副作用继续存在，Runtime、Harness、Recovery、Eval 和平台治理才逐步成为独立工程责任。

这条时间线不是产品年表，也不是“越新越先进”的排行榜。它更适合用来理解：**某项技术为什么会在那个阶段出现，它替代了什么假设，又把哪些旧能力降成下一层基础设施。**

## 2017｜Transformer：现代大模型的计算底座出现

Transformer 用 Self-Attention（自注意力：让序列中不同位置直接按相关性读取彼此信息）改变了序列建模。相比依赖顺序递归的 RNN / LSTM 路线，它更适合并行训练，也更容易扩展到更大的数据和模型规模。

Transformer 本身并不等于大语言模型，也不等于 Agent。它首先解决的是：**怎样让模型在长序列里有效建立关系，并把训练扩展到更大的计算规模。**

后面的语言模型、代码模型、多模态模型和大多数现代生成模型，都建立在这一计算范式之上。

继续读：[模型为什么能够理解和生成文本](./01-模型为什么能够理解和生成文本.md)。

## 2018～2020｜BERT 与 GPT：理解路线和生成路线分化

Transformer 出现以后，BERT 和 GPT 分别把两种路线推向成熟。

BERT 主要沿 Encoder 路线发展，用双向上下文学习表示，长期影响分类、匹配、Embedding 和检索等理解型任务。GPT 则沿 Decoder-only、自回归 next-token prediction 发展，训练目标和开放式生成天然一致，后来逐渐成为通用对话、代码和 Agent 模型的主干。

两条路线更适合理解为分工：

~~~text
Encoder-oriented
→ 表示 / 匹配 / 分类 / 检索

Decoder-only autoregressive
→ 生成 / 对话 / 代码 / 通用任务接口
~~~

继续读：[通用模型怎样一步步变成今天的智能模型](./02-通用模型怎样一步步变成今天的智能模型.md)。

## 2020～2022｜Scaling：专项模型开始让位于 Foundation Model

随着 Parameters、Training Tokens 和 Compute 同时扩大，模型开始出现更广泛的通用能力。GPT-3 前后的 Scaling 让“训练一个通用底座，再适配许多任务”成为现实工程路线，Foundation Model（基础模型）由此进入主流。

这一步改变的不只是模型大小，也改变了应用开发方式：

~~~text
过去
→ 一个任务训练一个专项模型

后来
→ 一个通用模型
→ Prompt / Few-shot / Post-training / RAG / Tool
→ 适配大量任务
~~~

Scaling 也很快暴露边界：更大不等于在所有业务都更好，训练数据、推理成本、延迟、硬件和任务切片同样重要。MoE、小模型、多模型路由等路线，本质上都在继续追问“能力怎样更高效地被使用”。

## 2021｜代码模型与 Copilot：AI 第一次大规模进入可执行反馈环境

代码生成把模型从“生成文本”推进到“生成可以被机器立即检查的 Artifact”。

Codex 一类代码模型和早期 Copilot 把 AI 嵌入 IDE，人仍然控制真实写入和提交，但模型开始获得一种极其重要的环境反馈：

~~~text
Generate
→ Compile / Run / Test
→ Observe
→ Revise
~~~

代码环境后来成为 Agent 最重要的试验场之一，因为 Diff、Compiler、Test、Git、Shell 都能提供高密度、机器可验证的反馈。

这条路线最终从 Completion 继续演进到 Coding Agent、Task、isolated workspace 和长期 Agent Workspace。

专题可继续读：[Coding Agent 真正竞争的是什么](../Coding-Agent.md)。

## 2022｜ChatGPT：Base Model 变成可交互助手

基础模型会续写，却不天然知道怎样稳定遵循用户指令、角色和交互格式。

Post-training（后训练）开始承担这个缺口：SFT 用高质量指令—回答数据塑造行为，RLHF / DPO 等偏好优化继续调整模型更愿意产生什么样的回答，再配合 Chat Template、System/User/Assistant 消息结构和产品层上下文，通用模型逐渐变成可交互助手。

这一步把 AI 从“模型 API”推向大众软件产品。但 Chat Assistant 仍然主要是在当前 Context 中回答问题，它还没有自动获得最新私有知识、外部权限、长期 Task State 或真实执行能力。

### 同期支线｜Diffusion 与多模态扩展了模型能感知和生成的世界

2022 前后，Diffusion Model 推动图像生成爆发；视觉语言模型和多模态模型则让文本之外的图像、音频、截图和界面状态逐渐进入模型输入输出。

这条支线没有成为本系列的独立一级主题，但它对后续 Agent Engineering 很重要：Browser / Computer Use 需要视觉 Observation，Artifact 不再只是文本，验证和存储也必须处理更多模态。

## 2022～2023｜生成式 AI 产品化：Prompt、RAG、Tool 和开放模型快速扩张

模型进入产品以后，两类缺口很快变得明显。

第一类是**参数知识边界**：模型不知道今天刚更新的规范、公司私有文档和本地仓库当前状态。RAG（检索增强生成）因此把外部 Knowledge Source、检索、重排和 Citation 带进一次模型调用。

第二类是**行动边界**：模型会生成语言，却不能凭一句文本安全修改数据库、调用 API 或提交表单。Structured Output、Function Calling 和 Tool Contract 因此开始把模型判断收敛成软件可执行的结构。

同时，开放权重模型、LangChain、LlamaIndex 等生态快速扩张，应用工程开始从“写一个 Prompt”走向“组合模型、知识、工具和流程”。

这一阶段留下的稳定认识是：

~~~text
Prompt
≠ Product

Vector DB
≠ Knowledge System

Tool Call Proposal
≠ Real Effect
~~~

继续读：
[模型为什么必须使用外部知识](./03-模型为什么必须使用外部知识.md)；
[模型怎样从“会回答”变成“能做事”](./04-模型怎样从会回答变成能做事.md)。

## 2023｜GPT-4 与多模态助手：Observation 不再只有文本

多模态大模型让截图、图表、文档视觉结构逐渐进入通用助手能力。

这对 Agent 的影响不是“模型多了一种输入格式”这么简单，而是它开始能够观察真实软件界面。Browser、Computer Use 和视觉验收因此获得新的模型入口。

但“模型看见页面”仍然不等于“系统知道业务状态”。Screenshot、DOM、URL、Network 和业务 Readback 各自只能证明一部分现实，后来的 Environment Contract 和 Evidence 机制正是在解决这一点。

继续读：[Agent 怎样进入真实世界工作](./12-Agent怎样进入真实世界工作.md)。

## 2023｜ReAct / AutoGPT：Agent Loop 进入大众工程视野

ReAct 把 Reasoning、Action 和 Observation 串成循环；AutoGPT 等项目则把开放式自治 Agent 推到大众视野。

一个最小 Agent Loop 由此变得清楚：

~~~text
Goal
→ Observe
→ Decide
→ Act
→ Observe again
→ Continue / Replan / Stop
~~~

这解决了固定 Workflow 无法提前枚举所有路径的问题，也马上暴露了新的失败：Goal Drift、重复调用和空转、Tool 成本失控、Context 不断膨胀、状态丢失，以及模型自己宣布完成却没有 Evidence。

后来的 Agent Engineering 没有保留“无限自治”这个想象，而是开始给开放 Loop 加上正式 Runtime、Stop Rule、Permission、Recovery 和 Eval。

继续读：[从 Prompt、Copilot、Workflow 到 Agent](./05-从Prompt-Copilot-Workflow到Agent.md)。

## 2023～2025｜从 Graph-first 走向 Runtime-first 与 Harness

早期 Agent 框架很容易把复杂系统理解成“多画几个 Node 和 Edge”。Graph 确实适合表达确定分支和状态转换，但长期任务很快暴露出更深的问题：

- Model Invocation 会结束，Task 还要继续；
- Session 会断开，Current State 不能消失；
- Build、Approval、Webhook 需要正式 WAITING；
- 进程重启以后必须恢复；
- Context 太长以后需要重新装配；
- Agent 进入真实仓库后需要 Workspace、Sandbox、Validator 和反馈。

于是 Runtime（长期任务运行时）和 Harness（围绕 Agent 组织工作环境的工程托架）逐渐成为比“图怎么画”更稳定的抽象。

~~~text
Agent Loop
→ 决定下一步

Runtime
→ 让长期责任持续存在

Harness
→ 让当前这一轮更容易做对
~~~

继续读：
[一次回答怎样变成长期任务](./06-一次回答怎样变成长期任务.md)；
[State、Context、Memory 为什么必须分开](./07-State-Context-Memory为什么必须分开.md)；
[Agent 为什么需要 Harness](./08-Agent为什么需要Harness.md)；
[长期 Agent 怎样安全执行和恢复](./09-长期Agent怎样安全执行和恢复.md)。

## 2024～2026｜MCP：外部能力连接开始协议化

当越来越多 AI Host 都需要连接文件、浏览器、Git、数据库和 SaaS，如果每一对 Host / Tool 都维护私有插件接口，集成成本会迅速上升。

MCP（Model Context Protocol，模型上下文协议）开始标准化 Host 与外部 Tool / Resource 等能力之间的连接和互操作边界。

它真正解决的是 Capability Interoperability，而不是 Permission、Runtime、Business Truth 或 Recovery。

“能连接”与“当前任务有权使用”始终是两件事。协议不会替 Runtime 和业务系统拥有权限、状态和真实 Effect。

MCP 的完整边界在 [模型怎样从“会回答”变成“能做事”](./04-模型怎样从会回答变成能做事.md) 中展开。

## 2024～2026｜Reasoning、Computer Use、Coding Agent、Deep Research 向不同方向增强 Agent

这一阶段并不是“所有能力合成一个超级 Agent”，而是几条不同支线同时成熟。

Reasoning Model 把更多计算放到推理时，使一次 Decision 的质量可以按任务复杂度动态增加预算。

Computer Use 让模型进入通用 GUI，必须面对视觉 Observation、Session、可逆性和高风险 Effect。

Coding Agent 利用 Repo、Shell、Diff、Compiler、Test、Git 等高密度反馈形成更强闭环。

Deep Research 则围绕开放研究 Goal、Knowledge Gap、Source Authority、Evidence Conflict 和停止条件持续改写研究路线。

这些支线共同说明：模型能力不断增强以后，系统真正稀缺的不再只是“更聪明的模型”，而是**正确环境、可验证反馈、长期状态和受治理的真实行动**。

## 2025～2026｜Multi-Agent 与 A2A：从“多个模型”走向独立责任主体

当一个 Agent 的 Context、权限或责任边界真的不够，系统开始拆 Subagent 和独立 Agent。

这时复杂度不再只是模型调用，而是出现新的分布式责任：

~~~text
Identity
Ownership
Shared State
Delegation
Handoff
Registry / Discovery
Permission
Failure containment
Coordination Tax
~~~

A2A（Agent-to-Agent Protocol）关注彼此独立 Runtime / Agent 之间怎样发现、通信、交付 Task 和 Artifact。

Multi-Agent 的成熟判断也发生了变化：从“多几个 Agent 会不会更聪明”，转向“独立责任是否真实存在，以及增量价值是否能覆盖协调税”。

继续读：
[什么时候应该拆 Subagent，怎样委派和交接](./10-什么时候应该拆Subagent怎样委派和交接.md)；
[Multi-Agent 怎样协作，又为什么很容易失控](./11-Multi-Agent怎样协作又为什么很容易失控.md)。

## 2025～2026｜Agent Eval：从“调用成功”转向“真实结果”

Agent 可以调用 Tool 以后，HTTP 200、tool_success 和“模型说完成了”都不再足够。

Evaluation 开始从单轮回答扩展到整条执行链：

~~~text
Trace
→ Evidence
→ Task / Trajectory / Artifact Eval
→ Real Outcome
→ Economics
~~~

系统还需要看 Failure Slice、Regression、p95 Latency、Human Intervention、Recovery 和 Cost per Successful Outcome。

Observability 回答“发生了什么”，Eval 判断“做得好不好”，Outcome 才回答“用户目标是否真的满足”。

继续读：[怎样证明 Agent 做对了，而且值得这么做](./13-怎样证明Agent做对了而且值得这么做.md)。

## 2026｜平台收束：Model 变成责任图中的一层

当多个真实 AI 产品反复需要相同的 Model Gateway、Knowledge、Capability、Runtime、Identity / Policy、Eval 和 Observability，平台化才开始有证据。

合理路径通常是：

~~~text
product-owned implementation
→ shared convention
→ library / schema
→ shared service
→ control plane / platform
~~~

平台不是 AI 项目的默认终点。它只应该共享已经稳定、重复出现的工程责任，而不应该吞掉领域 Workflow 和 Business Outcome。

继续读：[AI 能力怎样最终变成产品和平台](./14-AI能力怎样最终变成产品和平台.md)。

## 并行演进｜小模型和端侧推理重新分配计算成本

大模型越强，系统越需要决定“哪些任务根本不值得进入最强模型”。

高频、边界窄、输出可验证的语义任务可以交给小模型或专用模型，复杂和高风险长尾再升级更强模型：

~~~text
Deterministic first
→ Semantic Small-first
→ Strong / Reasoning Model
→ Human / Policy for high-risk effects
~~~

这条路线没有创造新的长期责任主体，而是把模型重新放回“可被 Runtime 路由的计算资源”。

继续读：[小模型为什么会成为 AI 系统里的高频语义执行层](./15-小模型为什么会成为AI系统里的高频语义执行层.md)。

## 把九年演进压成三次责任转移

### 2017～2022｜Model Capability → Assistant Behavior

Transformer、Scaling、Foundation Model 和 Post-training 先让模型从专项能力变成通用智能底座，再变成可交互助手。

### 2022～2023｜Assistant → AI Application

RAG、Tool、Structured Output、Copilot 和产品框架把模型装进真实软件，外部知识、能力合同和产品反馈成为正式工程问题。

### 2023～2026｜AI Application → Agent Runtime / Platform

Agent Loop 把下一步选择交给模型以后，软件必须接管长期 Task、State、Permission、Effect、Recovery、Evidence、Eval 和多主体协作；当这些责任跨产品反复出现，才进一步形成平台。

稳定下来的原则是：

> **模型负责处理模糊性，软件负责保存确定事实、约束真实副作用，并证明结果。**

## AI 开发范式并不是一代替代一代

控制权逐步变化，可以画成：

~~~text
Prompt-first
→ Chain-first
→ Workflow / Graph
→ ReAct / Agent Loop
→ Runtime-first
→ Context Engineering / Harness
→ Subagent
→ Multi-Agent
→ Agent Platform
~~~

后面的抽象不会把前面的抽象删除。今天一个成熟系统仍然可能同时使用 Rule / SQL、Prompt、Workflow、Agent、Runtime、Subagent 和 Platform Service，区别只是每一种问题停在自己的最低充分复杂度。

## 一手来源与时间边界

这条时间线包含论文、协议和产品生态的外部事实。正文的责任是解释“为什么工程责任会继续加层”，不是让作者自己的归纳替代原始来源。几个关键历史节点至少可以回到下面这些一手材料：

- Transformer：Vaswani 等人的 *Attention Is All You Need*，<https://arxiv.org/abs/1706.03762>
- BERT：Devlin 等人的 *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*，<https://arxiv.org/abs/1810.04805>
- GPT-3 / few-shot scaling：OpenAI *Language Models are Few-Shot Learners*，<https://openai.com/index/language-models-are-few-shot-learners/>
- MCP：官方 2026 roadmap，<https://blog.modelcontextprotocol.io/posts/mcp-roadmap/>
- A2A：官方协议规范，<https://a2a-protocol.org/dev/specification/>

这些链接不是为了把整篇改成论文综述，而是建立 Claim 强度边界：

~~~text
论文 / 规范明确提出的事实
→ 可以按对应时间点陈述

多个产品同时出现的工程趋势
→ 明确写成观察与归纳，不冒充统一行业标准

2026 年仍快速变化的产品能力
→ 使用前重新核验，不把本文时间线当 Current Product Documentation
~~~

因此“Transformer 出现于 2017”“BERT / GPT 路线怎样分化”“MCP / A2A 解决什么协议层问题”可以回到一手来源；“行业正在从 Graph-first 走向 Runtime-first”这类说法则仍然是本文基于多个工程系统做出的分析判断，两者不使用同一种事实强度。

## 17 篇正文怎样接到这条历史线

| 文章 | 在历史线中主要负责什么 |
|---|---|
| [00｜从 Transformer 到 Agent Platform：现代 AI 工程为什么不断加层](./00-从Transformer到AgentPlatform现代AI工程为什么不断加层.md) | 把时间线抽象成工程责任逐层增加的因果图 |
| [01｜模型为什么能够理解和生成文本](./01-模型为什么能够理解和生成文本.md) | Transformer、Token、Attention、自回归生成 |
| [02｜通用模型怎样一步步变成今天的智能模型](./02-通用模型怎样一步步变成今天的智能模型.md) | BERT/GPT、Scaling、Post-training、Reasoning |
| [03｜模型为什么必须使用外部知识](./03-模型为什么必须使用外部知识.md) | RAG、Retrieval、Evidence、Citation |
| [04｜模型怎样从“会回答”变成“能做事”](./04-模型怎样从会回答变成能做事.md) | Structured Output、Tool、Capability、MCP |
| [05｜从 Prompt、Copilot、Workflow 到 Agent](./05-从Prompt-Copilot-Workflow到Agent.md) | 应用控制权怎样从固定路径走向动态决策 |
| [06｜一次回答怎样变成长期任务](./06-一次回答怎样变成长期任务.md) | Runtime Task、Event、Scheduler、Routing |
| [07｜State、Context、Memory 为什么必须分开](./07-State-Context-Memory为什么必须分开.md) | 长任务的信息模型 |
| [08｜Agent 为什么需要 Harness](./08-Agent为什么需要Harness.md) | Agent 工作环境与反馈 |
| [09｜长期 Agent 怎样安全执行和恢复](./09-长期Agent怎样安全执行和恢复.md) | Durable Execution、UNKNOWN、Recovery |
| [10｜什么时候应该拆 Subagent，怎样委派和交接](./10-什么时候应该拆Subagent怎样委派和交接.md) | 局部责任拆分和 Ownership 转移 |
| [11｜Multi-Agent 怎样协作，又为什么很容易失控](./11-Multi-Agent怎样协作又为什么很容易失控.md) | 独立 Agent 的组织拓扑、A2A 和协调税 |
| [12｜Agent 怎样进入真实世界工作](./12-Agent怎样进入真实世界工作.md) | Research、Browser、Coding Environment |
| [13｜怎样证明 Agent 做对了，而且值得这么做](./13-怎样证明Agent做对了而且值得这么做.md) | Evidence、Eval、Economics |
| [14｜AI 能力怎样最终变成产品和平台](./14-AI能力怎样最终变成产品和平台.md) | Business Outcome、Platformization |
| [15｜小模型为什么会成为 AI 系统里的高频语义执行层](./15-小模型为什么会成为AI系统里的高频语义执行层.md) | Small-first、Multi-Model、端侧和模型适配 |
| [16｜把整套 AI 工程知识放回真实系统和真实岗位](./16-把整套AI工程知识放回真实系统和真实岗位.md) | 用真实项目和岗位责任反向校验整条演进线 |

阅读顺序仍然建议从 00 到 16，因为每篇都接住上一阶段留下的问题；但真正要保留的不是这些名词，而是能够继续判断：**新技术到底补了哪一种缺口，它有没有真的接管新的工程责任，以及它带来的复杂度是否已经被现实证明值得。**
