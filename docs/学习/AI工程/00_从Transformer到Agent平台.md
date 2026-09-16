# 从 Transformer 到 Agent 平台

> 唯一职责：用一条因果时间线解释现代 AI 为什么从模型能力逐层走向外部知识、真实行动、长期任务、协作、评估与平台，不在这里重复各专题的完整定义。
> 这是因果导航图，不是第二本教材。稳定定义进入对应专题章节；快速变化事实由各章在“当前事实核验”中注明时间与来源。

## 先看这条演进链为什么会不断加层

#### 本节新词

- **Transformer（Transformer 架构）**：让序列中的不同位置能够直接交换信息、并适合大规模并行训练的神经网络架构。这里先把它当成现代大模型的模型计算底座，内部注意力计算细节留给下一章。
- **Foundation Model（基座模型）**：在大规模通用数据上训练、可以继续适配许多下游任务的模型底座。它提供广泛能力起点，不等于已经拥有企业知识、外部工具或长期任务运行能力。
- **Agent Loop（Agent 决策循环）**：让模型根据环境反馈反复决定下一步并采取动作的闭环。它把模型从“一次回答”推进到动态行动，但不自动提供可靠恢复。
- **AI Platform（AI 平台）**：当多个 AI 应用反复需要同一组模型、知识、能力、长期任务运行、治理和评估责任时形成的共享底座。它是演进结果之一，不是所有项目必须抵达的终点。


```text
模型架构出现
→ 通用能力通过大规模训练增强
→ 模型被训练成可交互助手
→ 外部知识与真实能力接入
→ 模型开始动态决定下一步
→ 长任务与真实执行环境进入系统
→ 多主体协作、评估和治理变得必要
→ 重复工程责任逐渐平台化
```

这条线更适合理解成：**旧抽象不断降层，成为下一阶段的基础设施**，而不是被新技术简单删除。

## 2017｜Transformer：把序列建模推向可扩展并行训练

#### 本节新词

- **RNN（Recurrent Neural Network，循环神经网络）**：按序列顺序递归处理信息的神经网络路线，长序列并行训练受顺序依赖限制。
- **LSTM（Long Short-Term Memory，长短期记忆网络）**：带门控结构的 RNN 变体，用来缓解普通 RNN 的长期依赖问题；它与后文 Agent Memory 不是同一个概念。
- **Self-Attention（自注意力）**：序列内部各位置按相关性读取彼此信息的机制，是 Transformer Block 的核心计算之一。
- **Token（词元）**：模型处理文本时使用的基本离散单位，可能是一个字、词的一部分或符号。
- **Autoregressive Generation（自回归生成）**：按已经生成的 Token 继续预测下一个 Token 的生成方式；训练可以并行，不代表生成阶段没有顺序。


RNN/LSTM 的顺序依赖让长距离关系和大规模并行训练很难继续扩张。Transformer 用 Self-Attention 改写了这条路径：训练更容易并行，长距离位置也能直接建立联系。它没有取消生成时的先后顺序，却成为后续语言模型和多模态模型最重要的骨架之一。

往下读：[Transformer 章](01_模型智能/01_Transformer为什么改变了大模型.md#ch01-30s-core)。

## 2018～2020｜BERT / GPT：理解路线与生成路线分化

#### 本节新词

- **BERT（Bidirectional Encoder Representations from Transformers）**：以 Encoder 为主、强调双向上下文表示的预训练模型路线，长期影响向量表示、分类、匹配和重排序等理解任务。
- **GPT（Generative Pre-trained Transformer，生成式预训练 Transformer）**：以 Decoder、自回归 next-token 目标为主的生成模型路线，后来成为通用生成式大模型主干。
- **Encoder / Decoder（编码器 / 解码器）**：Transformer 中两类典型结构角色。Encoder 更偏把输入形成上下文表示，Decoder 更适合按上下文逐步生成输出。
- **In-context Learning（上下文学习，ICL）**：模型不更新权重，仅根据当前 Context 中的任务说明和示例临时适配任务的能力。


BERT 和 GPT 都从 Transformer 出发，却分别把双向表示和自回归生成推成主路线。后来 GPT 成为通用生成主干，不代表 BERT “失败”：Encoder 路线仍长期服务表示、匹配、分类和检索精排；GPT 一侧的 In-context Learning 则逐渐改变了“每个任务都要重新训练”的开发方式。

往下读：[BERT/GPT 章](01_模型智能/02_BERT与GPT为什么走向不同方向.md#ch02-30s-core)。

## 2020～2022｜Scaling：从专项模型走向 Foundation Model

#### 本节新词

- **Scaling（规模化扩展）**：系统增加 Parameters、Training Tokens 和 Compute，并研究能力怎样随这些变量变化的训练路线。
- **Parameters（参数）**：训练得到并长期存储在模型中的数值权重，是模型容量和计算成本的重要组成部分。
- **Training Tokens（训练 Token）**：预训练过程中模型实际学习过的 Token 数量，与模型参数规模一起影响训练结果。
- **Compute（计算量）**：训练或推理消耗的计算资源。Scaling 不是只增加参数，数据和 Compute 同样重要。
- **Benchmark（基准评测）**：在统一任务和评分条件下比较模型能力的测试。公开 Benchmark 能提供参考，但不能直接替代真实业务 Eval。


GPT-3 前后的 Scaling 把 Parameters、Training Tokens 和 Compute 一起推高，使“一个基座覆盖很多任务”成为现实路线。规模扩大带来更强的通用能力，却没有产生“参数越大就一定更适合所有业务”的简单规律；公开 Benchmark 也不能替代真实任务 Eval。后来 MoE、压缩、小模型和多模型分工，反而都是 Scaling 时代继续追问“能力怎样更高效落地”的结果。

往下读：[Scaling 章](01_模型智能/03_大模型能力怎样随规模增长.md#ch03-30s-core)。

## 2021｜代码模型与 Copilot：可执行反馈成为 Agent 的试验场

#### 本节新词

- **Codex**：OpenAI 早期面向代码生成/理解的模型路线名称，后来又被用于软件工程 Agent 产品；同名不代表系统层级相同。
- **Copilot（副驾驶）**：模型提供建议或候选操作，人类仍在真实写入、提交或其他外部动作发生前审核、接受或修改的协作模式。
- **IDE（Integrated Development Environment，集成开发环境）**：把代码编辑、导航、调试、构建等能力集中在一个开发环境中的软件。Copilot 早期的重要落点就是 IDE。
- **Diff（差异）**：两个代码/文件状态之间的具体变化。它给 Coding Agent 提供了比自然语言自评更强的外部反馈。


通用语言模型会补全代码片段，还不等于能围绕仓库完成软件工程工作。早期 Codex 一类代码模型把自然语言与生成、补全、解释和修复连接起来，Copilot 再把它嵌进 IDE，由人类在真实写入前审阅。代码环境的特殊价值在于它能编译、运行、测试并比较 Diff，于是形成了高密度反馈循环：`Generate → Compile/Run/Test → Observe → Revise`。会生成函数不等于理解整个仓库，语法通过也不等于业务正确；真正留下的是 human-in-the-loop 与后来 Coding Agent 使用 Repository/Shell/Test 反馈纠错的路线。
- **历史边界**：2021 年的 Codex 主要是面向代码的模型与开发接口；2025 年后的 Codex 已经进入隔离环境执行、长期任务、工具操作和可验证结果的 Agent 产品层。二者同名，但系统层级不同。
- **事实来源**：[OpenAI 对早期 Codex 的研究说明](https://cdn.openai.com/papers/Economic_Impacts_Research_Agenda.pdf)记录了它从 GPT-3 派生、面向多种编程语言训练，并通过开发接口和 Copilot 服务代码补全与生成；[2025 Codex 发布说明](https://openai.com/index/introducing-codex/)则描述了隔离环境、命令执行、测试和可验证结果。
- **继续阅读**：[生成式 AI 产品化](03_Agent与Workflow/01_从提示词到AI应用.md) · [Browser/Coding Environment](06_执行环境与评估/02_Agent怎样进入浏览器和代码环境.md)。

## 2022｜ChatGPT：从“会续写”到“可交互助手”

#### 本节新词

- **Post-training（后训练）**：在基础预训练之后，用指令数据、偏好信号等进一步塑造模型行为的阶段。它让模型更像助手，但不负责外部权限和执行。
- **SFT（Supervised Fine-Tuning，监督微调）**：用高质量输入—期望输出样本继续训练模型，使它学会遵循目标行为。
- **RLHF（Reinforcement Learning from Human Feedback，人类反馈强化学习）**：利用人类偏好信号训练/优化模型行为的一类方法。
- **DPO（Direct Preference Optimization，直接偏好优化）**：直接用偏好成对数据优化模型的一类后训练方法，与 RLHF 同属偏好对齐路线但训练形式不同。
- **Chat Template（对话模板）**：把 System/User/Assistant 等消息组织成模型实际输入 Token 序列的格式约定。


Base Model 会续写，却不天然知道怎样稳定服从用户意图、角色和格式。Instruction Data、SFT、Preference/RLHF/DPO 与 Chat Template 把模型逐步塑造成可交互助手。这里最容易留下的误解是把 Alignment 当成一种算法，或者把 Chat Assistant 直接等同于 Agent；真正沉淀下来的，是 Post-training 和 Base/Instruct/Chat 这套行为分层。

往下读：[Post-training 章](01_模型智能/04_基础模型怎样变成对话助手.md#ch04-30s-core)。

### 平行支线｜图像生成与多模态为什么不能从历史里删掉

#### 本节新词

- **Diffusion Model（扩散模型）**：通过逐步去噪学习生成图像等数据的一类生成模型路线，推动了 2022 前后的图像生成浪潮。
- **Multimodal Model（多模态模型）**：能够联合处理文本、图像、音频等不同模态输入/输出的模型。它让模型能读取和生成的不再只有文本。
- **VLM（Vision-Language Model，视觉语言模型）**：联合理解视觉与语言输入的模型类别，是模型读取截图、图表和软件界面的重要能力前置。


同一时期，扩散式图像生成、视觉编码器与多模态模型把“语言模型主线”扩展成文本、图像、音频和界面共同参与的系统。它们不是本书的独立一级目录，因为本书关注 AI Engineering 责任，而不是按模态分册；但它们留下了稳定影响：输入/输出不再只有文本，系统观察可以来自截图与音频，工具、存储和评估必须理解不同形态的产物，软件界面操作也越来越依赖多模态感知。**目录降层不等于历史删除。**

## 2022～2023｜生成式 AI 产品化：Prompt、Copilot、RAG、开放模型

#### 本节新词

- **Prompt（提示词）**：一次模型调用中交给模型的任务说明、输入和约束。Prompt 是最早、成本最低的应用控制手段之一。
- **Tool（工具）**：模型可以请求使用的外部能力，例如查询数据库、调用业务接口或执行代码；模型提出调用不等于动作已经执行。
- **Schema（模式／结构合同）**：用字段、类型、枚举等规则描述软件期望的数据结构，便于后续解析和检查。
- **RAG（Retrieval-Augmented Generation，检索增强生成）**：在模型回答前从外部知识源检索并装配证据，让参数外、会变化或私有知识进入本轮模型输入。
- **Vector Search（向量检索）**：按语义表示相似度寻找候选资料的检索方式；它只是 RAG 的一种基础设施，不等于完整 Knowledge System。
- **Function Calling（函数调用）**：模型用结构化方式表达“希望调用哪个 Tool、参数是什么”的调用意图。意图生成不等于现实动作已经执行。
- **Structured Outputs（结构化输出）**：要求模型输出满足指定 Schema 和字段类型合同，方便软件解析和验证。结构正确仍不等于业务正确。
- **Open-weight Model（开放权重模型）**：模型权重可按许可证下载、部署或适配的一类发布方式；开放权重不等于无限制开源或零部署成本。
- **Plugin（插件）**：把一组外部能力/适配打包接入产品的扩展形态。历史上 Plugin 帮助证明“模型连接外部服务”有产品价值。


模型进入产品以后，很快暴露出两个缺口：参数里的知识会过时，模型也不能凭一段文本安全地改变外部系统。Prompt/Copilot、RAG、Vector Search、Function Calling、Structured Outputs 和开放权重生态都在补这些缺口。`一个 Prompt = 一个产品`、`Vector DB = Knowledge Base` 等简化后来退潮，但上下文工程、检索工程、结构化能力合同，以及人仍在副作用前把关的 Copilot 模式留下了。

往下读：[RAG 章](02_知识与能力/01_模型怎样使用外部知识.md#ch06-30s-core) · [Tool 章](02_知识与能力/03_模型怎样安全调用工具.md#ch07-30s-core)。

这一阶段的 Tool 演进也有一条清晰因果链：聊天产品中的 Plugin → 开发者需要稳定描述“能调用什么、参数是什么” → Function Calling / Structured Outputs → 软件运行层负责校验、授权、执行与回传。

Plugin 证明“模型连接外部服务”有产品价值；Function Calling 把连接收敛成更稳定的调用意图与 Schema 合同。模型生成调用参数不等于外部动作已经成功，这个边界后来成为 Agent 运行系统的基础。

## 2023｜GPT-4：多模态助手把 Observation 从文本扩展到真实界面

#### 本节新词

- **Observation（观察）**：Agent 从 Tool、页面、环境或数据源读到的当前信息。多模态模型让截图和视觉状态也能成为 Observation。
- **Artifact（产物）**：任务正式生成或修改、可被版本化/验证的交付对象；在多模态场景中可能是文本、图像、文件或其他形式。


- **历史节点**：GPT-4 于 2023-03-14 发布，被定义为可接收文本和图像输入、输出文本的大型多模态模型；图像输入最初仍处于有限开放阶段。
同一个助手开始理解文档、图表、截图和视觉问题以后，Observation 不再只有文本。浏览器和通用界面操作需要读取页面视觉状态，Coding Agent 也会遇到截图、图表和 UI 结果，因此多模态成为执行环境的重要前置能力。但“模型看见了截图”不等于“系统已经拿到可靠状态”，Benchmark 提升也不等于可以安全自治；页面回读、证据和评估仍然需要软件层负责。
- **当前事实边界**：这里只记录 2023 年历史发布事实，不把当年的接口名称、价格或可用范围当成今天的产品说明。
- **事实来源**：[OpenAI GPT-4 发布页](https://openai.com/index/gpt-4-research/)。

## 2023｜ReAct / AutoGPT：Agent Loop 第一次大规模进入工程视野

#### 本节新词

- **ReAct（Reason + Act，推理—行动）**：让模型在分析、Action 与 Observation 之间循环，使新环境结果改变下一步。
- **AutoGPT**：2023 年早期开放式自治 Agent 热潮中的代表项目之一，推动 Agent Loop 进入大众工程视野，也暴露无限循环和成本失控等问题。
- **Goal Drift（目标漂移）**：长循环中 Agent 的局部动作逐渐偏离原始 Goal 的失败模式。
- **Toolformer**：探索让语言模型学习何时以及怎样调用外部能力的研究工作；它解决“什么时候调用能力”的模型决策问题，不等于完整的长期任务运行系统。


ReAct / AutoGPT 让 `Observe → Decide → Act → Observe` 进入大众工程视野：模型不再只完成固定步骤，而是依据新 Observation 改变下一步。很快暴露的也正是自治的代价——Goal Drift、重复动作、成本失控、状态丢失、无法恢复，以及“模型说完成了”却没有证据。Toolformer 等旁支也在探索何时调用外部能力。最后留下来的不是“无限自治”，而是 Agent Loop 与能力合同、执行、Observation、验证之间的分层。

往下读：[Agent Loop](03_Agent与Workflow/03_Agent怎样自主决定下一步.md)。

## 2023～2025｜从 Graph-first 到 Runtime / Harness

#### 本节新词

- **Task（任务）**：跨一次模型调用继续存在的工作责任对象，记录目标、当前状态和完成条件。
- **State（状态）**：继续执行依赖的当前事实；它不能只存在于聊天历史中。
- **Event（事件）**：记录“发生了什么”的事实信号，可触发后续状态变化或任务恢复。
- **Scheduler（调度器）**：决定等待中的任务何时重新获得执行机会，以及多个任务怎样竞争有限资源。
- **Runtime（运行时）**：让长期 Task、State、Event、Scheduler 和真实执行责任跨模型调用或进程持续存在的软件层。
- **Harness（工程托架）**：围绕 Agent 的当前工作环境组织必要材料、可用能力、工作空间、权限边界、结果检查和反馈，使每一步更容易做对。
- **Checkpoint（检查点）**：在可恢复安全点保存继续执行所需事实的恢复对象；它不是聊天摘要。
- **WAITING（等待）**：Task 尚未结束，但当前没有必要继续调用模型的合法状态。
- **Recovery（恢复）**：Task 从中断、失败或 UNKNOWN 中重新确认现实状态并决定后续路径的整体过程。
- **Approval（审批）**：高风险动作真正执行前，由人或更高权主体对这一次具体动作给出显式授权；它和长期 Permission 不是一回事。


Agent 真正跑进长任务以后，单次 Prompt 和固定调用链开始承担不了当前状态、审批、断线和副作用恢复。Task、State、Event、Checkpoint、Scheduler、Recovery 逐渐变成独立工程责任；Context 也从“完整聊天”转成可以按当前需要重新装配的工作集。由此形成一条很重要的边界：Model Invocation 可以结束，Task 仍然存在；Context 可以重建，影响正确性的 State 不能只靠聊天摘要保存。

往下读：[Runtime/Task 章](04_Harness与Runtime/01_一次回答怎样变成长任务.md#ch10-runtime-definition) → [State/Context/Memory 章](04_Harness与Runtime/02_为什么要分开状态上下文与记忆.md#ch11-information-model) → [Durable Execution 章](04_Harness与Runtime/04_长任务怎样安全恢复.md#ch12-30s-core)。

## 2024～2026｜MCP：能力连接开始协议化

#### 本节新词

- **MCP（Model Context Protocol，模型上下文协议）**：标准化 AI Host 与外部工具、资源、提示模板等能力之间连接和互操作边界的协议。它解决连接，不自动解决信任、权限或长期任务运行。
- **Capability Interoperability（能力互操作）**：让不同 Host/系统以统一协议发现和使用外部能力，而不要求每个组合都写私有连接层。


当不同 AI Host 都需要连接外部 Tool、Resource 和 Prompt 时，为每个组合维护私有接入层会迅速重复。MCP 把这类连接协议化，但它没有顺便解决 Runtime、Trust 或 Authorization。它留下的核心边界很朴素：**“系统能连接这项能力”与“当前任务被允许使用它”是两件事。**

往下读：[MCP/Capability 章](02_知识与能力/04_MCP怎样连接外部能力.md#ch08-mcp-definition)。

## 2024～2026｜Reasoning / Computer Use / Coding Agent / Deep Research

#### 本节新词

- **Reasoning（推理计算）**：在一次模型调用中投入更多推理时计算以提高复杂判断质量；它与 Agent 多步行动循环不同。
- **Computer Use（计算机操作）**：让模型通过屏幕、鼠标、键盘或结构化界面操作通用软件环境的能力。
- **Coding Agent（编码 Agent）**：在代码仓库、终端、测试和构建环境中动态行动并利用机器反馈迭代的 Agent。
- **Deep Research（深度研究）**：围绕开放研究目标持续规划、检索、识别知识缺口、处理来源冲突并重新规划的研究型 Agent Loop。


这一阶段其实在同时补三种不同缺口：Reasoning 把更多计算放进一次 Decision；Computer Use / Browser 让视觉与页面状态进入真实软件 Observation；Coding Agent 借助 Source/Diff/Test/Build/Shell 获得高密度机器反馈；Deep Research 则让开放研究围绕 Knowledge Gap 和证据冲突持续改路线。它们都增强了 Agent 能力，却没有合并成同一种系统原语。

继续阅读：[Reasoning 章](01_模型智能/05_推理模型改变了什么.md) · [Deep Research 章](06_执行环境与评估/01_研究Agent怎样建立证据链.md) · [Execution Environment 章](06_执行环境与评估/03_怎样为Agent提供安全的执行环境.md)。

## 2025～2026｜Multi-Agent / A2A：从“多个模型”走向独立责任主体

#### 本节新词

- **A2A（Agent-to-Agent）**：面向独立 Agent 之间能力发现、任务协作和产物交付的互操作协议边界。
- **Subagent（子 Agent）**：由父任务临时拆出、只负责一段有明确输入和交付物的局部责任；最终总体目标仍由父任务负责。
- **Multi-Agent（多 Agent 系统）**：多个拥有相对独立责任、状态或权限边界的 Agent 共同完成更大目标。数量增加会同时增加协调成本。
- **Shared State（共享状态）**：多个责任主体都需要共同依赖的受治理当前事实；共享不代表每个 Agent 都能自由覆盖。
- **Independent Agent（独立 Agent）**：拥有独立责任、身份、状态或生命周期、权限边界的 Agent 主体；多个模型工作单元不自动等于多个独立 Agent。
- **Delegation（委派）**：当前责任方把局部工作交给另一个主体，但仍保留总体责任。
- **Handoff（交接）**：同一责任对象正式转移给另一主体，需要明确当前状态、版本和可回读证据。
- **Coordination Tax（协作税）**：多个 Agent 为通信、路由、共享状态、冲突处理和结果整合付出的新增系统成本。


当单 Agent 的 Context、权限或责任边界真的不够时，Subagent、Delegation/Handoff、Shared State、Registry/Discovery 和 A2A 才开始有必要。早期最容易把“更多角色”误认为更高级的架构；后来更稳的判断变成：局部子任务先用 Subagent，同一 Runtime 内优先原生协调，只有独立责任主体确实存在时才承担 Multi-Agent 的协调税。

往下读：[Multi-Agent 组织章](05_MultiAgent与协作/03_多个Agent怎样组织协作.md) · [A2A/互操作章](05_MultiAgent与协作/04_A2A解决了什么问题.md)。

## 2025～2026｜Agent Eval：从“调用成功”转向真实结果

#### 本节新词

- **Evidence（证据）**：能够被重新检查、用于支持某个事实或完成判断的材料，例如测试结果、页面回读、版本记录或来源文档；模型自述“完成了”不算证据。
- **Trajectory Eval（轨迹评估）**：判断 Agent 选择 Tool、使用 Evidence、停止与恢复的执行路径是否合理。
- **Outcome Eval（结果评估）**：回到用户/业务最终 Success Criteria 判断真实目标是否达成。
- **Failure Slice（失败切片）**：按任务、风险、环境或错误类别拆分失败，避免平均分掩盖关键问题。
- **Economics（经济性）**：把质量、成本、延迟、可靠性和人工负担联合起来判断一个架构值不值。
- **Evaluation / Eval（评估）**：用明确标准判断系统是否满足目标，不等于只记录系统发生过什么。
- **Observability（可观测性）**：记录和关联执行过程中发生了什么、在哪里发生、耗时与状态如何，帮助解释问题但不替代质量判断。


当系统开始执行真实动作以后，“API 200”“Tool success”或“多个 Agent 都说完成”都不再足够。评估于是从单次回答扩展到 Task、Trajectory、Artifact、Evidence 和最终 Outcome，并把 Failure Slice、Regression、Human Load、Recovery 和 Economics 放进同一套判断里。Observability 解释发生了什么，Eval 判断做得好不好，Economics 再问这套复杂度值不值。

往下读：[Evaluation 章](06_执行环境与评估/04_怎样证明Agent真的完成了任务.md#ch17-30s-core)。

## 2026 平台收束｜Model 只是责任图中的一层

#### 本节新词

- **Vertical Agent（垂直 Agent）**：围绕特定领域责任，结合领域工作材料、业务流程、可用能力、当前状态和评估标准形成的 Agent 产品形态。
- **Governance（治理）**：把身份、权限、策略、审计、成本和合规约束持续落实到共享平台执行路径。


最终系统从“模型产品”收敛成：

```text
Business Goal
→ Product / Interaction
→ Workflow / Agent
→ Harness / Runtime
→ Knowledge + 外部能力 + Model Intelligence
→ Infrastructure
→ 真实影响 / 证据
→ Eval / Business Outcome
```

平台成熟度取决于能否把概率智能可靠接进真实业务，并证明新增复杂度确实有价值。

- **继续阅读**：[AI Platform 章](07_AI平台与产品/01_AI平台到底共享什么.md#ch18-responsibility-map)。
- **Current facts**：进入各专题章的“当前事实核验”，按标注日期重新核验易变化的产品与协议事实。

<a id="technology-rise-fall-assets"></a>
## 技术兴衰 / 反例资产｜旧热潮留下了什么

| 曾经热门的简化说法 | 后来暴露的真实边界 | Durable landing |
|---|---|---|
| 一个 Prompt 就能做产品 | Prompt 只是 Context / Runtime / Product 的一部分 | Post-training 章 / State/Context/Memory 章 / AI Platform 章 |
| 聊天套壳就是长期壁垒 | 真实价值还依赖知识、工具、业务流程、权限和评估 | AI Platform 章 |
| Vector DB 就是 Knowledge Base | Vector 只解决一种检索；Authority / Freshness / Metadata / Hybrid Retrieval 仍需要工程 | RAG 章 |
| Prompt Engineer 就是完整 AI 工程 | Prompt 能力被吸收到 Context / Product / Agent Engineering | State/Context/Memory 章 / AI Platform 章 Career Lens |
| AutoGPT 无限自治 | Agent Loop 还需要长期任务运行、停止条件、权限、证据和恢复机制 | Agent Loop、Runtime 与恢复章节 |
| Multi-Agent 一定强于 Single Agent | Coordination Tax 可能超过增量价值 | Multi-Agent 组织章 / Evaluation 章 |
| MCP / A2A 越多越先进 | 协议只在真实边界出现时增加 | MCP/Capability 章 / A2A/互操作章 / AI Platform 章 |

2023 年 LangChain / LlamaIndex 是 LLM 应用工程化的重要历史例子：前者常用于串联 Model、Prompt、Tool/Agent 等应用组件，后者长期聚焦 data/retrieval/knowledge workflows。这里保留的是**历史角色**，不把它们今天的具体接口当作长期不变的定义。

## 把时间线压成三次责任转移

上面的时间线已经讲过每个节点，这里只保留三个真正改变工程责任的转折：

```text
2017～2022
模型先变成通用能力底座和可交互助手
Model Capability → Assistant Behavior

2022～2023
模型被装进产品，外部知识、Tool、结构化合同出现
Assistant → AI Application

2023～2026
模型开始反复作用于真实环境，软件必须接管状态、权限、恢复和证据
AI Application → Agent Runtime / Platform
```

第一段让“一个模型服务许多任务”成为可能；第二段迫使开发者处理模型之外的知识、接口和产品反馈；第三段则把概率决策接进真实软件世界。越往后，新增的不是“更大的 Prompt”，而是软件对 Truth、Effect、State、Permission、Recovery 和 Eval 承担更多责任。

这也是为什么 2023 之后看起来框架越来越多，真正稳定的抽象却越来越接近经典软件工程：**模型负责处理模糊性，软件负责保存确定事实和约束真实副作用。**

## AI 开发范式演进｜开发者逐步把什么交给模型

这条线和年份不同，它回答“控制权放在哪里”。不需要再读九段历史，只看每一步新增了什么责任：

| 范式 | 主要把什么交给模型 | 软件仍必须拥有的边界 |
|---|---|---|
| Prompt-first | 一次生成的理解与表达 | 输入、格式、验收 |
| Chain-first | 多个模型步骤里的局部生成 | 固定执行顺序 |
| Workflow / Graph | 图中的局部判断 | State Transition、允许路径 |
| ReAct / Agent Loop | 下一步动作选择 | Goal、停止条件、Effect 边界 |
| Runtime-first | 模型调用可以反复进入长期任务 | Task、State、Event、Recovery |
| Context Engineering / Harness | 当前工作材料和局部工作环境 | Context 来源、Tool surface、隔离执行环境、Validator |
| Subagent | 有界局部责任 | Parent 总责任、结果验收 |
| Multi-Agent | 独立主体间的协作 | Ownership、Shared State、Handoff、协调成本 |
| Agent Platform | 多产品重复的可靠性能力 | 业务差异、Domain Outcome、平台退出条件 |

这里最重要的不是“后一个取代前一个”。Chain、Graph、Agent 仍会共存；变化的是旧抽象逐渐降层，成为新系统里的一个原语。真正需要动态决策的地方才交给模型，确定路径和高风险边界继续留在软件里。

## Agent 时代的关键支线｜不同技术在补不同缺口

| 支线 | 当时在补什么问题 | 后来留下什么 | 继续阅读 |
|---|---|---|---|
| Memory 热潮 | 长任务/多轮以后信息会丢 | 当前 State、历史记录、可复用 Memory 与本轮 Context 必须拆开；Memory 不是聊天向量库 | State/Context/Memory 章 |
| Context Engineering | Prompt 已无法表达完整工作集 | 动态装配 Goal/State/Knowledge/Memory/Tool Result，成为 Harness 核心 | State/Context/Memory 章 / Agent Loop 章 |
| Agentic RAG | 单次 Top-K 证据不足 | Agent 可以决定是否检索、改写查询、换检索方式、继续补证据 | RAG 章 + Agent Loop 章 |
| GraphRAG / Knowledge Graph 回潮 | Vector 对关系、多跳、全局结构不敏感 | Graph 是另一类 Retrieval 结构，不是 Vector DB 的升级替代 | RAG 章 |
| Structured Outputs | 自然语言结果难进入软件合同 | Schema 可解析，但语义/权限/执行成功仍需软件验证 | Tool 章 |
| MCP | Tool/Resource 接入各自为政 | Capability interoperability；连接标准化但不等于 Runtime/Trust | MCP/Capability 章 |
| A2A | 独立 Agent 跨 Runtime/组织协作 | Independent responsibility subject 的 interoperability | A2A/互操作章 |
| Computer Use | 结构化接口和页面结构不覆盖所有 UI 世界 | 截图、页面结构、网络响应等观察 + 可治理真实动作 | Execution Environment 章 |
| Reasoning | 单次决策质量仍受计算预算限制 | 推理时计算预算成为可路由资源 | Reasoning 章 |
| Deep Research | 开放问题需要多轮找证据和重规划 | Goal/Gap/Conflict 驱动的研究型 Agent Loop | Deep Research 章 |
| Coding Agent | 软件环境天然能给机器可验证反馈 | 测试、编译器、版本控制和运行环境与模型形成强纠错循环 | Execution Environment 章 |

这些技术之间没有一条“越靠后越先进”的排行榜。它们分别解决 Knowledge、Capability、Decision、Environment、Runtime、Interoperability、Evaluation 等不同责任。

### Multi-Agent 为什么热过，又为什么重新降温

当 Single Agent Context 过载、权限边界复杂、多个专业责任真实存在时，拆 Agent 很自然；但拆分同时引入 Coordination Tax：Message、Handoff、Shared State、一致性、并发、Recovery、Observability 和 Cost。

所以成熟判断从：

```text
一个 Agent 不够强
→ 再加几个 Agent
```

变成：

```text
Single Agent + Good Harness 是默认基线
↓
明确证明上下文、责任、权限或生命周期边界确实存在
↓
Subagent / Independent Agent
↓
用 Eval 比较增量 Outcome、Reliability、Human Load、Cost
↓
只有收益超过 Coordination Tax 才保留
```

这也是 Agent Engineering 从“像人类团队”回到“先看真实失败和收益证据，再决定是否升级架构”的过程。

<a id="seven-question-learning-contract"></a>
## 以后遇到新技术，先问这七个问题

以后遇到任何新模型、协议、框架或 Agent 产品，都问：

1. 它出现前的问题是什么？
2. 核心突破是什么？
3. 为什么会迅速爆发？
4. 当时高估了什么？
5. 后来暴露了什么问题？
6. 今天留下了什么稳定价值？
7. 它应该落在哪个专题章节？

## 学习导航

[新版目录](README.md) · [下一章 →](01_模型智能/01_Transformer为什么改变了大模型.md)
