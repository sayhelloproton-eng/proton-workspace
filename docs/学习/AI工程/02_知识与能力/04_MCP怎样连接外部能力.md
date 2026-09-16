# MCP 怎样连接外部能力

> 唯一职责：解释当外部能力分散在不同进程、产品和团队以后，MCP 怎样把连接方式标准化，以及协议明确没有替系统解决什么。
> 读完要能回答：同一个查询或动作能力为什么值得通过统一协议暴露，连接成功以后为什么仍然需要权限、信任和任务治理？
> 阅读前最好先理解 Tool 与 Capability。本章只处理协议连接和能力暴露；Agent 协作、长期任务责任和业务权限留到后续章节。

<a id="ch08-30s-core"></a>
<a id="ch08-3m-mental-model"></a>
## 同一个订单查询能力，为什么不想给每个 AI 产品重接一遍

假设订单查询既要给桌面助手用，也要给 IDE 里的 Agent 和企业工作流使用。如果每个产品都重新约定“怎么发现能力、参数怎么写、结果怎么返回”，连接成本会随着产品数量重复增长。MCP 解决的就是这段**协议边界**：让不同 AI 应用可以用共同约定连接外部能力。

### 本节新词

- **MCP — Model Context Protocol（模型上下文协议）**：标准化 AI 应用与外部 Tool、Resource 等 Context/Capability 之间如何发现、请求和返回数据的协议。它解决连接互操作，不等于 Agent Runtime。
- **Protocol（协议）**：通信双方共同遵守的消息结构、方法和交互规则。协议可以让不同实现互通，但不会自动替业务决定权限、真值和恢复策略。
- **MCP Host（MCP 宿主）**：发起并管理 MCP 集成的 AI Application，负责用户交互、模型整合和一个或多个 MCP Client 的协调。
- **MCP Client（MCP 客户端）**：Host 内与某个 MCP Server 通信的协议组件。一个 Host 可以为不同 Server 建立不同 Client。
- **MCP Server（MCP 服务端）**：向 Client 暴露 Context 或可执行能力的程序，可以运行在本机，也可以是远端服务。

```text
AI Application / Host
        │
        ├─ Client ── MCP ── Server A
        └─ Client ── MCP ── Server B
```

这张图只说明“谁和谁通过协议连接”。模型这一轮能看到哪些 Tool、是否允许执行、Server 是否可信、结果能否成为 Truth，都还是 Host / Runtime 与业务系统自己的责任。

<a id="ch08-15m-mainline"></a>
<a id="ch08-deep-read"></a>
## MCP 标准化了什么，又刻意没有拥有什么

<a id="ch08-mcp-definition"></a>
### 3.1 MCP 的稳定责任：Capability Interoperability

#### 本节新词

- **Capability Interoperability（能力互操作）**：不同 Host / Client 能用共同协议发现并调用外部能力，而不需要为每一对产品重新设计私有连接。MCP 的核心价值在这里，不在业务编排。
- **Interoperability（互操作性）**：彼此独立实现的系统按照共同合同交换信息并协同工作的能力。它不表示双方共享内部状态或信任等级。

MCP 的稳定价值可以抽象成：

```text
AI application
↓ standardized protocol
external context / data / tools
```

它减少每个 AI product 为每种外部能力重新发明一套发现、schema、调用和传输合同的成本。

但它没有把 Tool 变成 Agent，也没有自动替代应用自己的 Runtime / Permission / Recovery。

<a id="ch08-host-client-server"></a>
### 3.2 Host / Client / Server

开篇已经介绍 Host / Client / Server，这里只把职责边界说清楚。Host 管 AI 应用与安全边界；Client 是 Host 内面向一个 Server 的协议连接；Server 暴露聚焦的 Context / Capability。

这是一组协议角色，不等于你的业务系统必须部署成三个微服务。

<a id="ch08-mcp-primitives"></a>
### 3.3 Tool / Resource / Prompt：三种 Server primitive

#### 本节新词

- **Primitive（协议原语）**：协议直接定义的一类基础对象和操作语义。MCP 当前 Server 核心原语包括 Tools、Resources、Prompts。
- **Resource（资源）**：Server 提供给 AI 应用读取的 Context/Data，例如文件内容、数据库记录或 API 响应；它偏数据，不是动作。
- **Prompt（提示模板）**：Server 可暴露的可复用交互模板，例如 System Prompt 或 Few-shot 示例；它是协议对象，不等于 Host 的最高优先级 System Instruction。

当前规范的 Server features 可以直接看成三类：`tools` 提供可调用动作，`resources` 提供可读 Context/Data，`prompts` 提供可复用模板。Tool 的通用动作合同已经在上一章讲过，这里只关心它们怎样作为 MCP primitive 被协议暴露。

```text
MCP Server
├─ tools
├─ resources
└─ prompts
```

MCP 只是定义这些对象怎样被协议暴露和消费，不意味着它们在业务层拥有同等权限。

<a id="ch08-server-catalog-filter"></a>
### 3.4 Server catalog ≠ Model-visible capability set

#### 本节新词

- **Server Catalog（服务端能力目录）**：Server 当前能够列出的 Tool / Resource / Prompt 全集。它回答“Server 有什么”，不表示模型这一轮都应该看到。
- **Model-visible Capability Set（模型可见能力集合）**：经过 Permission、Scope、Availability 和 Relevance 过滤后，真正装入当前模型 Context 的少量候选能力。
- **Scope（作用域）**：限定某项能力、数据或权限在哪个用户、Workspace、Task、资源范围内有效的边界。

一个 Server 可以暴露 100 个 Tools，但模型这一轮不应该自动看到全部 100 个。

```text
Server capabilities
↓
Host / Runtime policy & scope
↓
Relevance / capability discovery
↓
small model-visible set
```

这与 Tool 章的 Registry / Discovery / Selection 原则一致。MCP 负责提供能力协议，Host/Runtime 决定“当前真正暴露什么”。

<a id="ch08-model-runtime-mcp"></a>
### 3.5 Model 想用 / Runtime 能用 / MCP 送达

#### 本节新词

- **Transport（传输）**：把协议消息从 Client 送到 Server 的通信机制。MCP 当前支持 Stdio 与 Streamable HTTP 等传输；Transport 负责送达，不拥有 Tool Selection 或 Permission。
- **Stdio — Standard Input/Output（标准输入输出）**：本地进程可通过标准输入/输出流交换 MCP 消息的传输方式，常用于 Host 启动本地 Server。
- **Streamable HTTP（可流式 HTTP）**：用于远程 MCP 通信的 HTTP 传输方式，可结合流式响应；它属于传输层，不改变 Tool/Resource 语义。

```text
Model
→ proposes Tool

Runtime / Host
→ availability + permission + policy

MCP Client
→ protocol request

MCP Server
→ capability execution / result
```

因此不要说“MCP 负责 Tool Selection / Permission”。它可以携带相关 metadata / capability 信息，但业务裁决仍属于平台治理层。

<a id="ch08-stateless-core"></a>
### 3.6 当前协议事实｜2026-07-28 Stateless Protocol Core

#### 本节新词

- **Stateless Protocol Core（无会话状态协议核心）**：MCP `2026-07-28` 中每个请求都携带处理它所需的协议版本和相关 Client 能力，不依赖前一个协议请求保存的 Session。
- **Self-contained Request（自包含请求）**：单个请求带有服务端理解本次协议调用所需的元数据，使请求可以独立处理。
- **Handshake（握手）**：旧版本中 Client/Server 在正式调用前通过 `initialize / initialized` 协商协议和能力的初始化交换；`2026-07-28` 核心已移除这段握手。
- **Session / `Mcp-Session-Id`（会话／会话标识）**：旧核心用于把多次协议请求关联到同一协议会话的机制；新核心不再依赖它，但业务仍可有自己的显式状态。
- **Sticky Session（会话粘性）**：负载均衡时把同一 Session 的请求固定到同一后端实例的部署策略。无协议 Session 后，MCP 请求更容易落到任意兼容 Server 实例。
- **Round-robin Load Balancer（轮询负载均衡）**：按顺序把请求分配给多个 Server 实例的简单负载均衡方式；它管理流量，不负责 Capability 语义。

当前 `2026-07-28` 规范把 MCP core 改为 **stateless, self-contained requests（无协议会话的自包含请求）**：每次 request 自带 protocol version、client identity / capabilities 等必要信息；旧 `initialize/initialized` handshake 和 `Mcp-Session-Id` 已从新 core 移除。

这带来的直接系统意义是：协议请求可以更自然地落到普通 HTTP infrastructure 后的任意 server instance，而不用依赖协议级 sticky session。

核验来源：[MCP Architecture overview](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture) 与 [MCP 2026-07-28 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28/)。

<a id="ch08-protocol-business-state"></a>
### 3.7 Protocol stateless ≠ Business stateless

#### 本节新词

- **Business State（业务状态）**：Workspace、购物车、数据库事务等业务对象跨调用持续存在的信息。协议无 Session 不要求这些对象消失。
- **Explicit Handle（显式句柄）**：Server 返回给 Client、后续调用再作为普通参数传回的状态标识，例如 `workspace_id`。它把业务状态关联显式化，而不是藏在 Transport Session 中。

协议层没有 session，不代表 Browser Workspace、shopping cart、database transaction 等业务对象必须无状态。

官方发布说明明确给出一种稳定模式：Server 创建显式 handle，例如：

```text
create_workspace()
→ workspace_id

next call
→ workspace_id as ordinary argument
```

这样 state 变成业务可见对象，而不是隐藏在传输 session 里。

**业务 State 留在 State/Context/Memory 章节，长期任务对象留在后面的 Runtime/Task 章节；MCP 不拥有你的业务状态机。**

<a id="ch08-server-discover"></a>
### 3.8 当前协议事实｜`server/discover` 与每请求能力声明

#### 本节新词

- **`server/discover`（服务端发现请求）**：`2026-07-28` 提供的可选 discovery RPC。Client 如果希望在调用前了解 Server 的协议版本与 Capabilities，可以主动调用并缓存结果；协议并不要求每次业务请求前先做 discovery。
- **Per-request Capability Declaration（每请求能力声明）**：Client 在每次请求的 `_meta` 中声明与该请求相关的能力，而不是依赖一次 Session 握手永久协商。
- **Capability Negotiation（能力协商）**：Client 和 Server 依据双方声明决定哪些协议能力可以安全使用；它解决协议兼容，不等于业务 Permission。
- **`_meta`（协议元数据字段）**：MCP 请求/结果中承载协议版本、Client/Server 信息和能力声明等扩展元数据的结构。

`2026-07-28` 的核心变化是：每个 request 自带本次调用所需的协议信息；`server/discover` 只是给“想预先了解 Server 能力”的 Client 使用的可选发现调用，不是处理普通请求的前置条件。发现结果可以缓存。

这并没有替代 Tool 章 Capability Discovery 的应用语义：协议 Discovery 告诉你“Server 支持什么”，平台仍要做 Permission、Relevance 和 Task-aware Filtering。

<a id="ch08-mrtr"></a>
### 3.9 MRTR：Stateless core 中的多轮输入交换

#### 本节新词

- **MRTR — Multi Round-Trip Requests（多往返请求）**：一个 MCP 请求在中途需要用户/Client 补充输入时，通过返回“还需要输入”的结果，再让 Client 带答案重新提交原调用的交互模式。
- **`input_required`（需要输入）**：MRTR 结果类型之一，表示当前调用尚未完成，需要 Client 收集指定输入后继续。
- **`inputResponses`（输入响应）**：Client 对 Server 请求的附加输入作答后，重新提交时携带的响应集合。

实际交互时，Server 先返回 `input_required`，Client 收集所需输入，再把 `inputResponses` 带回原调用继续执行。它解决的是“调用尚未完成，但需要补充输入”的协议交互问题。

```text
Tool call
→ input_required
→ collect input
→ resume/retry call with input
```

这不自动把 Server 变成独立 Agent。

<a id="ch08-mcp-tasks"></a>
### 3.10 MCP Tasks：长执行仍可能只是 Capability Invocation

#### 本节新词

- **MCP Tasks Extension（MCP Tasks 扩展）**：`io.modelcontextprotocol/tasks` 扩展让 Server 对部分长时间 `tools/call` 返回可轮询的 Task Handle，而不是阻塞等待最终结果。当前公开规范仍标为 Draft。
- **Extension（扩展）**：在 MCP Core 之外按正式扩展框架增加可协商能力的机制；Tasks 不再是 Core 原语。
- **Task Handle（任务句柄）**：Server 生成的可持久标识，Client 用它后续查询、更新或取消同一次长执行。
- **Polling（轮询）**：Client 周期性调用 `tasks/get` 查询任务状态和最终结果的方式，不要求 Server 主动保持长连接。
- **Durable State Machine（持久状态机）**：Tasks 扩展把长请求执行状态表示成可跨请求持续查询的状态对象；它仍只是 capability invocation 的生命周期，不自动成为独立 Agent。

`2026-07-28` 把 Tasks 从 experimental core 移到 `io.modelcontextprotocol/tasks` extension framework。当前公开的 Tasks extension specification 仍标为 **Draft**；该 draft 支持 Server 对 `tools/call` 返回 durable task handle，Client 再通过 `tasks/get` 等方法获取后续状态 / 结果。

这个对象解决：

```text
long-running capability call
→ durable handle
→ poll / update / cancel
→ eventual result
```

但：

MCP 里的 Task 只描述 capability invocation 的协议生命周期；它不能替代本地长期业务任务，也不能因为“有 Task ID、支持异步”就自动升级成独立 Agent。跨 Agent 协作里的任务对象由后面的 A2A 章节单独定义。

是否是独立 Agent 要看 responsibility / planning / state / lifecycle ownership，而不是“有没有 Task ID、会不会异步”。

核验来源：[MCP 2026-07-28 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28/) 与 [MCP Tasks Extension Draft](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)。

<a id="ch08-result-truth"></a>
### 3.11 MCP Result ≠ Truth

上一章已经定义 Tool Result 与 Evidence。这里新增的是协议边界：

#### 本节新词

- **MCP Result（MCP 结果）**：Server 通过 MCP 返回的协议结果对象，首先只是外部 Observation / Result。Host 仍需按业务规则验证，不能因为 JSON-RPC 调用成功就提交为 Truth。
- **Truth Commit（真值提交）**：Runtime 在 Evidence 足够、验证通过后把某个状态正式接受为当前系统事实的动作；完整机制留到 Durable Execution。

MCP Server 返回的结果首先是外部 Observation / Result。

```text
MCP Result
↓
Validation / Evidence
↓
Runtime policy
↓
Truth Commit
```

Result contract 的 generic Tool 侧属于 Tool 章；Truth / Evidence / Commit 属于 Durable Execution 章。

<a id="ch08-trust-boundary"></a>
### 3.12 MCP 标准化连接，不标准化信任

#### 本节新词

- **Authentication（身份认证）**：确认“调用者是谁”的过程，例如 OAuth Token、API Key 或其他身份凭据。
- **Authorization（授权）**：在身份已知后判断“这个调用者能不能访问这项能力/资源”。Authentication 通过不代表 Authorization 自动通过。
- **Consent（用户同意）**：对敏感数据或有副作用操作，由用户明确同意本次访问/执行的交互边界。
- **Access Control（访问控制）**：系统强制限制哪些身份能访问哪些 Tool / Resource 的机制，必须由 Host/Server/基础设施执行。
- **Tool Annotation / Description（工具注解／描述）**：Server 提供的能力元数据，可帮助 Host 和模型理解 Tool，但来自外部 Server 的描述仍属于需要信任判断的数据。

当前官方规范明确把 consent、authorization、access control、tool safety 视为实现者必须处理的安全问题，并指出协议本身不能替实现者强制这些原则。

因此：

```text
MCP connection established
≠ server trusted
≠ tool authorized
≠ result true
```

Server 的 Tool description / annotation 也应被当成需要信任判断的数据，而不是自动可信控制指令。

<a id="ch08-connector-plugin-skill"></a>
### 3.13 Connector / Plugin / Skill：不要放在协议一层

这些对象在前后章节各有自己的责任，这里只看它们与 MCP 的关系。一个产品接入层可以直接调用 vendor API，也可以把 MCP 藏在内部；一个可安装扩展也可能同时带 Tool、接入配置和工作方法。

MCP 改变的是连接与发现方式，不会把“产品适配”“扩展打包”或“怎样完成一类任务的方法知识”自动变成同一种对象。Skill 的方法语义留给 Agent Loop 章，本章不再重新定义。

<a id="ch08-mcp-vs-a2a"></a>
### 3.14 MCP ≠ A2A

#### 本节新词

- **A2A — Agent-to-Agent（智能体到智能体互操作）**：面向独立 Agent 责任主体之间发现、委托和交换任务结果的互操作边界；完整机制在 Multi-Agent 章节展开。
- **Independent Responsibility Subject（独立责任主体）**：拥有自己任务责任、状态/生命周期和结果承诺的 Agent 一方。另一端只是提供 Operation/Capability 时，Tool/MCP 通常更自然。

稳定判断先问另一端是什么：

```text
Capability / Operation provider
→ Tool / MCP 更自然

Independent responsibility subject
→ Agent / A2A 更自然
```

这是工程决策模型，不是“有 HTTP / LLM / Task ID 就一定是哪类协议”的硬判定。

A2A 的完整机制在 A2A/互操作章展开；这里仅说明它与 MCP 的边界。

<a id="ch08-when-mcp"></a>
### 3.15 什么时候值得从直接 Tool / Connector 升级到 MCP

#### 本节新词

- **Adapter（适配器）**：把一个外部系统的私有接口和数据结构转换成平台内部统一合同的组件。MCP 可以减少跨 Host 的重复 Adapter，但并不让所有一对一 API 都必须协议化。
- **Ecosystem Boundary（生态边界）**：同一 Capability 需要被多个独立 Host / 产品共同发现和使用时形成的共享接入范围，常比单一项目调用更值得采用标准协议。

如果你只有一个内部函数，直接 Tool 往往更简单。

MCP 更有价值的情形通常是：

- 同一 Capability 需要被多个 Host / client ecosystem 使用；
- 希望统一 discovery / schema / transport；
- 需要清晰的 process / organization boundary；
- 希望降低每个平台写定制 adapter 的重复成本。

所以复杂度升级仍遵循：**问题需要什么边界，就引入什么边界。**

例如 RAG 章的 `Custom GPT → Action/API → Local Retrieval Runtime` 项目链，本身已经有清晰的一对一能力入口时，直接 Action/API 就足够；只有未来同一 Retrieval Capability 需要被多个 Host/Agent 生态统一发现和使用，MCP 才可能成为更自然的互操作边界。不要为了“协议化”把一个已经清楚的项目调用路径绕复杂。

<a id="ch08-boundary-map"></a>
<a id="ch08-canonical-references"></a>
## 协议边界怎样接入 Workflow、Runtime 与 A2A

- Tool / Capability / Registry / Idempotency → [Tool 章](03_模型怎样安全调用工具.md)。
- RAG / Knowledge → [RAG 章](01_模型怎样使用外部知识.md)。
- Skill / Agent Loop → [ReAct / Agent Loop](../03_Agent与Workflow/03_Agent怎样自主决定下一步.md#ch09-agent-loop)；Harness → [Harness 章](../04_Harness与Runtime/03_怎样让Agent可靠运行.md)。
- Runtime / Task → [Runtime/Task 章](../04_Harness与Runtime/01_一次回答怎样变成长任务.md)；State / Context → [State/Context/Memory 章](../04_Harness与Runtime/02_为什么要分开状态上下文与记忆.md)；Permission / Truth / Recovery → [Durable Execution 章](../04_Harness与Runtime/04_长任务怎样安全恢复.md)；A2A → [A2A/互操作章](../05_MultiAgent与协作/04_A2A解决了什么问题.md)。

<a id="ch08-current-facts"></a>
## 当前协议事实｜2026-09-03

#### 本节新词

- **SDK（Software Development Kit，软件开发工具包）**：把协议类型、客户端/服务端调用和常见集成流程封装成开发者可直接使用的代码工具。SDK 是规范的一种实现，不等于协议规范本身。

MRTR 与 Stateless Core 已在前文解释，这里不再重新定义，只核对当前版本与官方来源。

当前事实以 MCP 官方 `2026-07-28` 文档为准：

- [Architecture overview](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)：Host / Client / Server 角色、Data/Transport 两层、每请求 `_meta` 能力声明、`server/discover`、Tools / Resources / Prompts 等核心原语。
- [2026-07-28 Specification 发布说明](https://blog.modelcontextprotocol.io/posts/2026-07-28/)：无协议 Session/Handshake 的 Stateless Core、MRTR、Header Routing、Authorization Hardening、Tasks 移入扩展。
- [Tasks Extension Draft](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)：`io.modelcontextprotocol/tasks`、`tasks/get / update / cancel`、Server-directed Task creation 与 Polling 生命周期。
- [TypeScript SDK v2 migration](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28)：说明 2026-07-28 协议支持在 SDK 中需要显式启用，并给出认证与 per-era wire codec 的迁移边界。

稳定架构结论不依赖某一个版本号：MCP 标准化能力连接，但不替 Host/Runtime 决定业务 Permission、Truth、Recovery 或 Agent 责任。旧 `2025-11-25` 的 Session/Handshake 语义不再作为当前规范事实。

<a id="ch08-review-self-check"></a>
## 用这些问题检查协议理解

1. MCP 最稳定的责任是什么？
2. Host、Client、Server 分别承担什么？
3. 为什么 Server 有 100 个 Tool 不代表模型该看到 100 个？
4. Protocol stateless 为什么不等于业务 stateless？
5. MRTR 解决什么？
6. MCP Tasks 为什么不自动意味着独立 Agent？
7. MCP Result 为什么不等于 Truth？
8. “MCP 标准化连接，不标准化信任”具体指什么？
9. Connector、Plugin、Skill 与 MCP 分别在哪一层？
10. MCP 与 A2A 的最短判断问题是什么？

## 学习导航

[← 上一章](03_模型怎样安全调用工具.md) · [新版目录](../README.md) · [下一章 →](../03_Agent与Workflow/01_从提示词到AI应用.md)
