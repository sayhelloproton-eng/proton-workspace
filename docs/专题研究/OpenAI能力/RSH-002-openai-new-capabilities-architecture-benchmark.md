# RSH-002 OpenAI 新能力：架构 Benchmark 与项目裁决

> 记录日期：2026-09-14  
> 性质：外部能力研究结论 / 架构 Benchmark / 后续候选迭代输入。  
> 边界：本文不代表任何能力已经接入 ProFlow、ChatWeb 或 Interview System，也不改变当前 Real-3 主线。

## 1. 本轮结论

本轮收敛四项 OpenAI 新能力作为后续参考：

1. Agents API
2. WebMCP / Site Tools
3. GPT-Live / Voice
4. Deep Research

统一原则：

> 外部平台的新功能首先用于校准我们的架构边界，不是看到新 API 就直接接入。

若某项能力需要长期额外 API 成本，当前默认只作为 **benchmark / architecture reference**，不作为个人项目的新增硬依赖。

| 外部能力 | 当前落位 | 当前不做 |
| --- | --- | --- |
| Agents API | ProFlow Architecture Benchmark | 不作为 ProFlow Runtime Dependency |
| WebMCP / Site Tools | ProFlow Browser Runtime 的 Research / Progressive Enhancement | 不打断 Real-3；不继续把 ChatWeb 做成本机 Tool 入口 |
| GPT-Live / Voice | Interview System 的能力分层参考 | GPT-Live API 暂不实施 |
| Deep Research | ChatWeb Research UX / Execution Model Benchmark | 不接 OpenAI Deep Research API |

## 2. Agents API → ProFlow Architecture Benchmark

### 2.1 当前裁决

```text
Agents API
    ↓
ProFlow Architecture Benchmark
    ↓
NOT ProFlow Runtime Dependency
```

当前个人项目没有必要为了使用通用 Agent Runtime 能力，把 ProFlow 绑定到需要独立 API 成本的外部 Runtime。

本轮已确认需要纳入成本判断的能力包括模型调用、Tool、Sandbox / Container 以及其他 API 资源。ChatGPT Plus 与 OpenAI API 也不能按“同一订阅已经覆盖”处理。

因此，Agents API 的主要价值不是“替我们运行 ProFlow”，而是提供一个新的行业级对照样本，用来反向检查 ProFlow 的分层是否合理。

### 2.2 与 ProFlow 高度重合的研究能力

需要持续对照的能力包括：

- long-running agent；
- durable session；
- context management；
- context compaction；
- agent harness；
- tool orchestration；
- sandbox abstraction；
- recovery / continuation；
- progress streaming；
- subagents；
- parallel execution；
- environment abstraction。

这些能力与 ProFlow 当前正在解决的问题高度重合，因此适合作为架构 Benchmark，而不是直接替换现有系统。

### 2.3 用它反向审计四层职责

后续 Architecture Review 应强制区分：

```text
Model
  ↓
Harness
  ↓
Runtime
  ↓
Task Orchestration
```

需要回答的核心问题：

- 哪些能力属于 Harness？
- 哪些能力属于 Runtime？
- 哪些能力属于 ProFlow Task 层？
- 哪些状态必须 durable？
- 失败恢复应该在哪一层发生？
- Worker 和 Agent Session 生命周期如何对应？

建议使用下面的责任边界做审计起点：

| 层 | 主要职责 | 不应拥有 |
| --- | --- | --- |
| Model | 推理、生成、Tool intent | Task 生命周期、业务真值 |
| Harness | Prompt / Context 装配、Tool 暴露、执行治理、模型交互约束 | 业务级 Task Graph 真值 |
| Runtime | Session、执行环境、长任务运行、恢复、流式进度、Tool / Sandbox 生命周期 | Requirement、Role、Node 的业务语义 |
| Task Orchestration | Task Graph、业务状态机、Worker 绑定、人类协作、调度与重新唤醒 | 模型内部推理细节 |

### 2.4 ProFlow 仍应自己拥有的上层能力

以下能力继续属于 **Business-level Agent Orchestration**，不应因为底层 Agent API 变强而下沉或外包：

- Task Graph；
- Requirement；
- Role；
- Worker Binding；
- Node Lifecycle；
- Task Lifecycle；
- WAITING；
- Human Approval；
- Human Attention；
- Observer；
- Durable Business State；
- Resume；
- Reopen；
- occurrence identity；
- 调度；
- 重新唤醒；
- 项目级治理。

这些能力的共同点是：它们描述的是项目和业务过程的正式状态，而不是某个模型 Session 如何完成一次 Agent 执行。

### 2.5 Real-3 之后的独立研究项

Real-3 稳定后建立独立研究项：

```text
ProFlow vs OpenAI Agents API Architecture Review
```

至少比较：

1. Session 生命周期；
2. Context 生命周期；
3. Agent 恢复；
4. Worker / Agent Identity；
5. Long-running execution；
6. Tool lifecycle；
7. Failure classification；
8. Subagent / Worker delegation；
9. Sandbox / Environment；
10. Durable execution boundary。

Review 的目标不是“找接入点”，而是识别：

- 重复设计；
- 分层错误；
- 缺失能力；
- 可简化机制；
- ProFlow 已经优于通用 Agent Runtime 的能力。

## 3. WebMCP / Site Tools → ProFlow Browser Runtime

### 3.1 ChatWeb 的产品边界重新裁决

ChatWeb 不再继续投入“用户本机工具”作为核心产品路线。

停止继续扩展的目标包括：

```text
Web Chat → Local Dev
Web Chat → 本机 Shell
Web Chat → 用户 Chrome
Web Chat → 本机 MCP
Web Chat → 用户文件系统
Web Chat → 用户电脑环境
```

问题不在 Tool Calling 本身，而在 Remote Web Chat 与 User Local Environment 之间缺少可信本机执行载体：

```text
Remote Web Chat
      ↓
Desktop Agent / Extension / Local Daemon / Local Bridge
      ↓
User Local Environment
```

没有这层本机 Bridge，纯 Web 产品无法可靠、持续、安全地操作用户机器。

因此 ChatWeb 的 Tool Registry 可以继续保留架构兼容性，但不再为了“访问用户本机 Tool”继续投入产品开发。

### 3.2 WebMCP 更适合 ProFlow

ProFlow 已经拥有：

- Task；
- Worker；
- Browser Runtime；
- Local Environment；
- Browser Owner；
- Automation；
- Durable State。

因此 WebMCP / Site Tools 更适合作为 ProFlow Browser Runtime 的未来增强。

候选执行策略：

```text
ProFlow Browser Runtime

1. WebMCP / Structured Site Tool
        ↓ unavailable
2. Structured API / MCP
        ↓ unavailable
3. DOM Automation
        ↓ unavailable
4. Vision / Computer Use
```

核心原则：

> 能使用结构化 Tool 时，不优先模拟人点击网页。

### 3.3 结构化执行的潜在收益

相较纯 DOM / Vision 自动化，结构化 Site Tool 可能带来：

- 减少 selector 依赖；
- 降低 DOM 漂移影响；
- 提高确定性；
- Schema 可校验；
- 更容易做 Retry；
- 更容易实现 Idempotency；
- 更容易记录 Audit Log。

但它当前只定位为 **Research / Progressive Enhancement**，不应成为 Real-3 后立即插入的新功能。

## 4. GPT-Live / Voice → Interview System

### 4.1 真正的问题不是“Voice 看不到 Chat”

即使普通 Voice 能看到当前聊天文本，也没有解决正式面试系统的关键链路。

真正的问题是：

> 普通 Voice 当前不能调用 Chat 中配置的本机 MCP / Local Dev，因此无法直接读取本机正式面试库 Source of Truth。

用户的正式面试资产位于本机 Job Search System。理想链路是：

```text
Voice
  ↓
Local Dev / MCP
  ↓
job-search-system
  ↓
正式面试库
  ↓
动态选题
  ↓
追问
  ↓
评分
  ↓
训练结果写回
```

普通 Voice 目前不能完成这条 Repository-connected runtime 链路。

### 4.2 普通 Plus Voice 的准确定位

当前可用路线：

```text
本机正式面试库
       ↓
文本模式提前取出本轮资料
       ↓
放入当前 Chat Context
       ↓
启动 Voice
       ↓
真人语音模拟面试
```

这应命名为：

**Prepared Context Voice Interview**

而不是：

**Repository-connected Interview Runtime**

其限制包括：

- 无法实时 Retrieval 整个正式题库；
- 无法动态访问项目资料；
- 无法实时读取短板档案；
- 无法直接更新最佳答案库；
- 无法直接写回本机训练系统；
- 无法在 Voice 中调用 Local Dev。

所以“Voice 能看到 Chat”不能写成正式面试系统的问题已经解决。

### 4.3 当前正式路线：Work

当前正式面试训练路线保持：

```text
Work
  ↓
job-search-system
  ↓
正式面试库
  ↓
项目专项资料
  ↓
短板档案
  ↓
模拟面试
  ↓
评价
  ↓
训练结果
```

当前产品分工：

```text
正式面试训练 → Work
轻量免费语音练习 → 普通 Voice
```

### 4.4 GPT-Live API：BACKLOG

GPT-Live API 从技术形态上可以支撑理想链路：

```text
Live Voice
    ↕
Interview Runtime
    ↓
RAG / Retrieval
    ↓
Formal Corpus
    ↓
Question Selection
    ↓
Dynamic Follow-up
    ↓
Scoring
    ↓
Weakness Profile
```

但当前不实施，原因是它会形成长期额外 API 成本，而当前个人面试训练场景没有足够收益覆盖这一成本。

重新评估条件：

- API 成本显著下降；
- Plus 开始包含足够 API allowance；
- Voice 可以直接调用 Chat MCP / Plugin；
- 本地实时 Voice 模型成熟；
- 面试系统进入商业化阶段。

## 5. Deep Research → ChatWeb Benchmark

### 5.1 当前裁决

ChatWeb 已经在建设自己的 Research 能力：

```text
Web Search
FAST Research
THINK / Deep Research
Planner
Multi-round Search
Citation
Provenance
```

因此当前没有必要再增加：

```text
ChatWeb
  ↓
OpenAI Deep Research API
```

当前裁决：**不接 OpenAI Deep Research API。**

其价值主要是产品 UX 和执行模型 Benchmark，而不是新增收费 Runtime Dependency。

### 5.2 Research Planning

候选体验：

```text
User Goal
  ↓
Research Plan
  ↓
用户调整
  ↓
Execute
```

后续评估 ChatWeb 是否需要：

- 展示 Research Plan；
- 允许修改研究目标；
- 允许调整 Source Scope。

### 5.3 Source Control

建议继续统一抽象研究来源：

```text
Public Web
Specific Sites
Files
Context Provider
RAG
Connected Source
```

Source Scope 应成为 Research Runtime 的显式输入，而不是散落在不同 Tool 的隐式配置。

### 5.4 Research Progress

可以适度暴露高层研究阶段：

```text
Planning
Searching
Reading
Comparing
Verifying
Synthesizing
```

但不要把底层每次 Tool 调用、Query 改写和内部执行噪声全部展示给用户。

### 5.5 Interrupt / Refine

后续 Research Runtime 应研究：

```text
Research Running
      ↓
用户改变方向
      ↓
更新问题 / Source
      ↓
继续现有 Research
```

目标是允许中途修正，而不是用户每次补充条件都必须把整个研究任务推倒重来。

### 5.6 Citation / Provenance

继续重点演进：

- claim-level citation；
- source provenance；
- source inspection；
- evidence grouping；
- source quality；
- conflict handling。

### 5.7 Research Artifact

未来可考虑：

```text
Research
  ↓
Report Artifact
  ↓
继续编辑
  ↓
导出 / 分享
```

因此准确关系是：

```text
OpenAI Deep Research
        │
        │ UX / execution benchmark
        ↓
ChatWeb Research Runtime
```

而不是直接调用收费 API。

## 6. 三个项目的最终方向

### 6.1 ProFlow

后续备选：

- Agents API Architecture Benchmark；
- WebMCP / Site Tools；
- Structured Browser Execution；
- Tool-first / Browser-fallback。

约束：以上都不能打断当前 Real-3 主线。

### 6.2 ChatWeb

继续建设：

- Model Provider；
- FAST / THINK；
- Web Search；
- Deep Research；
- RAG / Context Provider；
- Image；
- File；
- Voice；
- Citation；
- Rich Output；
- Sites。

停止投入：

- Web Chat → 用户本机 Local Dev；
- Web Chat → 本机 Shell；
- Web Chat → 用户 Chrome；
- Web Chat → 本机 MCP；
- Web Chat → 用户电脑环境。

Deep Research 继续重点借鉴产品 UX 与执行模型，不直接接收费 API。

### 6.3 Interview / Job Search System

当前正式路线：

```text
Work
  ↓
本机正式面试库
  ↓
真实训练
```

普通 Plus Voice：

```text
提前准备本轮 Context
  ↓
Voice 训练
```

只作为辅助。

GPT-Live API：

```text
BACKLOG
暂不开发
```

## 7. 后续优先级

### NOW

- 保持 ProFlow Real-3 主线不被新能力调研打断；
- ChatWeb 按既有 V0 / Research / 多模态路线推进；
- Interview System 正式训练继续使用 Work + 本机正式库。

### AFTER REAL-3

- 启动 `ProFlow vs OpenAI Agents API Architecture Review`；
- 评估 Structured Browser Execution 的能力层级与 fallback 策略；
- 只在不破坏现有 Runtime 边界的前提下研究 WebMCP / Site Tools。

### BACKLOG

- GPT-Live API；
- OpenAI Deep Research API；
- 任何需要长期新增外部 API 成本、但当前没有明确收益闭环的能力。

## 8. 防止后续误读

后续讨论必须保持以下区别：

- **Voice 能读取当前 Chat Context** ≠ **Voice 能调用本机 MCP / Local Dev**；
- **Tool Calling 技术成立** ≠ **Remote Web Chat 可以直接操作用户本机**；
- **Architecture Benchmark** ≠ **Runtime Dependency**；
- **Progressive Enhancement** ≠ **Real-3 紧急功能**；
- **外部产品已提供某能力** ≠ **我们应放弃自己的 Business-level Orchestration**；
- **调研结论** ≠ **当前项目已实现状态**。

## 9. 事实与时效边界

本文沉淀的是本轮已经收敛的调研结论和项目裁决，本次落盘不重新进行外部资料搜索。

任何涉及 OpenAI 产品能力、计费、API contract、Voice / Work / Plugin 行为的未来实施，都必须在实施时重新验证最新官方事实；不能用本文的历史研究结论替代届时的当前事实。
