# 现代 AI 工程学习地图

> 唯一职责：固定整套教材的阅读顺序、章节责任和入口，不在目录页重复专题正文。
> 这不是 AI 术语百科，而是一套通过 **技术演进 → 系统分层 → 真实工程 → 岗位验证** 建立现代 AI Engineering 架构判断力的教材。

## 先建立一张图

```text
模型智能
  ↓ 参数知识和纯生成不够
知识与能力
  ↓ 固定调用路径不够
Agent 与 Workflow
  ↓ Agent Loop 能跑不等于系统可靠
Harness 与 Runtime
  ↓ 一个责任主体开始不够
Multi-Agent 与协作
  ↓ 进入真实世界后必须获得反馈并证明结果
执行环境与评估
  ↓ 重复的工程责任开始需要共享
AI 平台与产品
  ↓
真实系统与岗位：用工程事实和市场事实校验整棵知识树
```

这棵树同时沿三条轴阅读：

- **Evolution Timeline**：上一代方案出了什么问题，下一代为什么出现；
- **AI Engineering Stack**：今天留下来的能力属于系统哪一层；
- **Reality Validation**：真实系统、失败证据和真实岗位是否支持这套判断。

## 怎么读

每篇正文开头都有“阅读前先认识这些词”。先用这一节确认本章所需的英文缩写、中文名称、系统位置和相邻概念边界，再进入场景与机制；同一个术语在负责它的主章节中完整解释，在后续章节中只补充当前场景里的作用。

### 第一次系统学习

从 [00 全景](./00_从Transformer到Agent平台.md) 开始，再按 `01` 到 `08` 顺序阅读。每一层都依赖前一层，但不是说系统必须把所有层都建出来；复杂度只在有证据时升级。

### 快速建立世界观

读 `00`，再进入每章开头的真实问题与责任图；需要做架构判断时，继续读该章的失败案例、工程选择和边界说明。重点理解两条边界：模型不等于系统，Agent Loop 不等于可靠 Runtime。

### 想做 Agent

按 `02 → 03 → 04 → 06` 阅读：先理解 Tool/Capability，再判断 Workflow 与 Agent Loop，随后补齐 Runtime/Harness，最后学习环境反馈与 Eval。不要从 Multi-Agent 开始。

### 想做 Platform

按 `03 → 04 → 05 → 06 → 07` 阅读。Platform 的前提不是组件多，而是多个产品反复遇到同一组 Runtime、治理、路由和评估问题。

### 面向真实岗位

先完成 `01 → 07` 的主干，再读 `08`。岗位名会变化，稳定的是它负责哪段系统、交付什么 Outcome、用什么 Evidence 证明完成。

## 最终章节与唯一职责（冻结）

### 00｜全景

- [00_从Transformer到Agent平台.md](./00_从Transformer到Agent平台.md)：只负责建立 2017→2026 的演进因果链、七层系统轴和技术兴衰判断框架。

### 01｜模型智能

- [01_Transformer为什么改变了大模型.md](./01_模型智能/01_Transformer为什么改变了大模型.md)：只负责解释 Token、Embedding、Attention、Q/K/V、自回归生成与 Transformer 的底座地位。
- [02_BERT与GPT为什么走向不同方向.md](./01_模型智能/02_BERT与GPT为什么走向不同方向.md)：只负责解释 Encoder/Decoder 路线分化、BERT 的历史位置与 GPT 路线为何成为通用交互底座。
- [03_大模型能力怎样随规模增长.md](./01_模型智能/03_大模型能力怎样随规模增长.md)：只负责解释参数、数据、算力、预训练、Scaling Law、Foundation Model 与能力边界。
- [04_基础模型怎样变成对话助手.md](./01_模型智能/04_基础模型怎样变成对话助手.md)：只负责解释基础模型怎样经 SFT、偏好优化和产品设计变成可交互助手。
- [05_推理模型改变了什么.md](./01_模型智能/05_推理模型改变了什么.md)：只负责解释 test-time compute、推理预算与 Reasoning Model 对能力、延迟和系统路由的影响。

### 02｜知识与能力

- [01_模型怎样使用外部知识.md](./02_知识与能力/01_模型怎样使用外部知识.md)：只负责解释知识源如何经解析、索引、检索、重排和 Context Assembly 进入本轮推理。
- [02_检索系统怎样找到正确资料.md](./02_知识与能力/02_检索系统怎样找到正确资料.md)：只负责解释不同 Retrieval Truth、组合检索、代码/关系/结构化查询及其选择依据。
- [03_模型怎样安全调用工具.md](./02_知识与能力/03_模型怎样安全调用工具.md)：只负责解释结构化输出、调用意图、Tool Contract、结果与副作用边界。
- [04_MCP怎样连接外部能力.md](./02_知识与能力/04_MCP怎样连接外部能力.md)：只负责解释 Tool、Skill、Connector、MCP 的分层，以及能力如何被发现、暴露和治理。

### 03｜Agent 与 Workflow

- [01_从提示词到AI应用.md](./03_Agent与Workflow/01_从提示词到AI应用.md)：只负责解释生成式 AI 如何从 Prompt 进入 Copilot 和真实应用，以及这次产品化改变了什么。
- [02_什么时候该用工作流.md](./03_Agent与Workflow/02_什么时候该用工作流.md)：只负责解释路径由代码决定时 Chain、Workflow、Graph 的价值与边界。
- [03_Agent怎样自主决定下一步.md](./03_Agent与Workflow/03_Agent怎样自主决定下一步.md)：只负责解释模型如何依据 Observation 动态决定下一步，以及 Agent Loop 的收益和失败方式。
- [04_怎样选择合适的AI架构.md](./03_Agent与Workflow/04_怎样选择合适的AI架构.md)：只负责比较 Code、Prompt、Chain、Workflow、Graph、Agent、Runtime、Multi-Agent、Platform，给出复杂度升级决策。

### 04｜Harness 与 Runtime

- [01_一次回答怎样变成长任务.md](./04_Harness与Runtime/01_一次回答怎样变成长任务.md)：只负责解释 Task、Turn、Thread、Session 生命周期与 Runtime 的连续性责任。
- [02_为什么要分开状态上下文与记忆.md](./04_Harness与Runtime/02_为什么要分开状态上下文与记忆.md)：只负责区分 Current Truth、当前工作集、历史记录和可复用过去。
- [03_怎样让Agent可靠运行.md](./04_Harness与Runtime/03_怎样让Agent可靠运行.md)：只负责解释 Context、Tool、Skill、Permission、Sandbox、Validator 如何构成更容易做对事的工作环境。
- [04_长任务怎样安全恢复.md](./04_Harness与Runtime/04_长任务怎样安全恢复.md)：只负责解释长任务暂停恢复、未知状态对账、幂等、Checkpoint 与 Effect/Evidence 绑定。
- [05_任务怎样选择模型和路径.md](./04_Harness与Runtime/05_任务怎样选择模型和路径.md)：只负责解释模型/Agent/Tool 路由、Policy、Model Gateway、FAST/REASON、优先队列与调度。

### 05｜Multi-Agent 与协作

- [01_什么时候需要Subagent.md](./05_MultiAgent与协作/01_什么时候需要Subagent.md)：只负责解释 Subagent 的 Context/Responsibility Isolation，以及它与独立 Agent 的边界。
- [02_怎样委派与交接任务.md](./05_MultiAgent与协作/02_怎样委派与交接任务.md)：只负责解释委派、交接、共享真值、私有上下文和 Parent/Child Runtime Event。
- [03_多个Agent怎样组织协作.md](./05_MultiAgent与协作/03_多个Agent怎样组织协作.md)：只负责解释 Supervisor、P2P、Blackboard、Event-driven、Registry、Discovery 与 Routing。
- [04_A2A解决了什么问题.md](./05_MultiAgent与协作/04_A2A解决了什么问题.md)：只负责解释同 Runtime 原生协调、跨 Runtime 通信与 A2A 的适用边界。
- [05_为什么Agent越多系统越复杂.md](./05_MultiAgent与协作/05_为什么Agent越多系统越复杂.md)：只负责解释 Multi-Agent 的增量收益、组织成本、Persistent/Ephemeral 选择与 Agent Explosion。

### 06｜执行环境与评估

- [01_研究Agent怎样建立证据链.md](./06_执行环境与评估/01_研究Agent怎样建立证据链.md)：只负责解释研究计划、证据缺口、检索重规划、来源冲突与停止条件。
- [02_Agent怎样进入浏览器和代码环境.md](./06_执行环境与评估/02_Agent怎样进入浏览器和代码环境.md)：只负责比较浏览器与代码环境中的观察、行动、反馈和完成判定。
- [03_怎样为Agent提供安全的执行环境.md](./06_执行环境与评估/03_怎样为Agent提供安全的执行环境.md)：只负责解释执行环境、Sandbox、Computer Use、Effect、Observation 与安全边界。
- [04_怎样证明Agent真的完成了任务.md](./06_执行环境与评估/04_怎样证明Agent真的完成了任务.md)：只负责解释 Task/Trajectory/Artifact/Outcome Eval、Evidence、Trace 与回归评估。
- [05_怎样计算Agent的真实成本.md](./06_执行环境与评估/05_怎样计算Agent的真实成本.md)：只负责解释 Capability、Cost、Latency、Reliability、Model Tier、Tool Calls 与 Human Intervention 的联合决策。

### 07｜AI 平台与产品

- [01_AI平台到底共享什么.md](./07_AI平台与产品/01_AI平台到底共享什么.md)：只负责解释 Model、Knowledge、Capability、Runtime、Governance、Eval 如何组合成平台责任图。
- [02_怎样把AI能力做成产品.md](./07_AI平台与产品/02_怎样把AI能力做成产品.md)：只负责解释 AI App、Vertical Agent 和领域工作流如何从业务目标走到可验证 Outcome。
- [03_什么时候值得建设AI平台.md](./07_AI平台与产品/03_什么时候值得建设AI平台.md)：只负责用重复问题、共享责任、失败证据和增量价值判断何时平台化、何时停在应用层。
- [04_CodingAgent平台怎样走向AgentWorkspace.md](./07_AI平台与产品/04_CodingAgent平台怎样走向AgentWorkspace.md)：只负责用产品、支撑、擅长与未来四个视角理解 Coding Agent 怎样演进成 Agent Workspace，以及主流平台分别在优化什么。
- [05_CodingAgent生态插件与标准怎样收敛.md](./07_AI平台与产品/05_CodingAgent生态插件与标准怎样收敛.md)：只负责解释生态、Plugin、Skill、Agent、MCP、Hook 与开放标准的层次，以及 Usher 跨平台兼容真正发生在哪一层。
- [06_不同角色怎样选择CodingAgent平台.md](./07_AI平台与产品/06_不同角色怎样选择CodingAgent平台.md)：只负责把前述平台差异转成角色选型，并给出 Agent Platform / Plugin 工程师和 Usher 的跨平台判断方法。

### 08｜真实系统与岗位

- [01_ProFlow为什么从工作流走向Agent平台.md](./08_真实系统与岗位/01_ProFlow为什么从工作流走向Agent平台.md)：只负责用 ProFlow 贯穿验证 Workflow、Runtime、Harness、Multi-Agent 与 Platform 的升级条件。
- [02_云端Agent怎样访问本地知识.md](./08_真实系统与岗位/02_云端Agent怎样访问本地知识.md)：只负责验证云端交互、受控入口、本地检索、权限与证据的端到端边界。
- [03_端侧模型与云端模型怎样分工.md](./08_真实系统与岗位/03_端侧模型与云端模型怎样分工.md)：只负责验证端侧模型、云端控制、FAST/REASON 与资源调度的真实架构取舍。
- [04_企业到底在招聘哪些AI人才.md](./08_真实系统与岗位/04_企业到底在招聘哪些AI人才.md)：只负责从真实 JD 归纳公司实际在构建哪些 AI 系统和责任域。
- [05_AI工程岗位怎样分工.md](./08_真实系统与岗位/05_AI工程岗位怎样分工.md)：只负责比较岗位族的系统边界、主要产出、共同主干与差异能力。
- [06_怎样从招聘要求反推学习路线.md](./08_真实系统与岗位/06_怎样从招聘要求反推学习路线.md)：只负责把 JD 能力映射回章节、学习缺口、项目证据与面试验证。
- [07_小模型怎样进入垂直业务.md](./08_真实系统与岗位/07_小模型怎样进入垂直业务.md)：只负责解释小模型怎样作为规则/检索与强推理模型之间的高频语义执行层，通过结构化合同、验证、路由、端侧运行和必要的模型适配，承接大量可验证业务任务。

## 每章最终要交付的判断

章节不共享固定开头、段落数量或收束格式，但读完后都应能判断：它解决了上一代方案的什么问题，核心机制与责任边界是什么，当时高估了什么，失败通常在哪里发生，今天哪些部分仍值得使用，什么时候不该升级，以及真实系统和岗位提供了什么验证证据。
