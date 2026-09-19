# L3｜Tool、MCP 与外部能力

> 这一层回答：**模型怎样从“会说”变成“能做”，协议接入、工具选择和真实执行分别由谁负责？**
>
> 阅读方式不是按字母背词，而是先看下面的关系链，再把每个术语放回真实系统位置。

~~~text
Model → Tool Calling → Runtime → Tool / MCP Client → MCP Server / Adapter → Real World → Tool Result / Readback
~~~

## 术语表

| 术语 | 一句话 | 典型场景 | 关键边界 / 易混 |
|---|---|---|---|
| Function Calling | 模型按预定义函数 Schema 生成函数名和参数。 | 模型选择 search/getTask/readFile。 | 它表达调用意图，不代表函数已执行。 |
| Tool Calling | 模型选择 Tool 并生成结构化调用请求的上层机制。 | Web Search、Browser、Local Dev、DB。 | Function Calling 是常见实现；Tool Calling 更宽。 |
| Tool | 对真实系统进行读取或操作的能力接口。 | 读文件、点浏览器、查数据库。 | Tool 回答“能做什么”，Skill 回答“怎么做一类任务”。 |
| Tool Use | Agent 在任务中实际选择、调用、消费 Tool Result 的完整行为。 | 一次 Tool Call 之后继续推理。 | Tool Use 包含调用前后上下文。 |
| Tool Schema | Tool 输入参数和类型约束。 | read_file(path)、search(query)。 | Schema 合法不代表业务上允许。 |
| Tool Description | 给模型看的 Tool 语义说明。 | 模型做 Tool Selection。 | 描述过于实现化会降低选择质量。 |
| Tool Contract | Tool 的输入、输出、错误、副作用和幂等语义合同。 | 执行高风险操作。 | Schema 只是 Contract 的一部分。 |
| Tool Result | Tool 实际执行后的返回。 | 文件内容、API 响应、AX Tree。 | Tool Result ≠ Model 对结果的解释。 |
| Tool Result Contract | 规定 Tool 返回中哪些字段代表事实、错误和 Evidence。 | 让 Runtime 可稳定消费结果。 | 自然语言“成功”不够。 |
| Call Intent | 模型表达当前为什么要调用某能力的语义意图。 | Search、Create、Update、Validate。 | Intent ≠ 最终 Effect。 |
| Arguments | 一次 Tool Call 的具体参数值。 | path、taskId、query。 | 参数结构合法仍可能越权或过期。 |
| Tool Selection | 在可见 Tool 集合里选择最适合当前意图的能力。 | 多个搜索/浏览器工具并存。 | Selection ≠ Permission。 |
| Selection Error | 模型选择了错误 Tool 或错误能力路径。 | 该 read-only 却调用 write。 | 要区分模型选择错和 Harness 暴露错。 |
| Capability | 上层可以依赖的稳定能力语义。 | Repository Read、Browser Observe、Knowledge Retrieve。 | Capability 是语义，Tool/Adapter 是实现。 |
| Capability Contract | 规定能力输入输出、权限、副作用和 SLA 等稳定边界。 | 替换不同 Provider 仍保持上层契约。 | 不要把 Provider 私有字段泄漏成领域合同。 |
| Capability Registry | 在需要机器发现时记录可用能力身份和元数据的索引。 | 动态 Tool/Agent 发现。 | Registry ≠ Source of Truth；只有真实发现需求才需要。 |
| Discovery | 找到当前环境有哪些可用能力或 Server。 | MCP Server Catalog、Tool Catalog。 | 发现到不代表有 Permission。 |
| Availability Filter | 先剔除当前不可用或环境不匹配的能力。 | 服务离线、模型不支持某参数。 | Availability ≠ Policy。 |
| Tool Retrieval | 根据当前任务从大量 Tool 中只挑少量相关候选。 | 大 Tool Surface 的动态裁剪。 | Retrieval 不授予 Permission。 |
| Side Effect | 对真实世界造成状态变化的动作。 | 写文件、提交、发消息、创建资源。 | Read-only 查询通常没有业务副作用。 |
| Reversibility | 一个 Effect 是否能真正撤销或安全恢复。 | 删除、发布、付款前风险判断。 | 不可逆动作需要更强 Approval。 |
| Failure Class | 对 Tool 失败按网络、权限、业务、输入等类型分类。 | 决定能否 Retry/Recover。 | 不能把所有错误都归成“Tool failed”。 |
| Failure Contract | 规定错误码、retryable、unknown-effect 等失败语义。 | 长期 Agent 安全恢复。 | Failure Contract 决定 Runtime 后续动作。 |
| Semantic Validation | 在结构合法之外检查业务语义是否成立。 | 日期范围、资源状态、版本关系。 | JSON Schema 不能表达所有业务约束。 |
| Operation ID | 一次逻辑业务操作的稳定身份。 | 创建资源、发布、付款。 | Operation ID ≠ 每次网络 Request ID。 |
| Idempotency Key | 让重复请求仍归属于同一个逻辑 Effect 的幂等标识。 | Timeout 后安全重放。 | Key 有 Scope/TTL，不能无限复用。 |
| Adapter | 把稳定内部接口转换成具体 Provider/协议实现。 | 模型 Provider、Browser、Storage Adapter。 | Adapter ≠ Provider。 |
| Provider | 真正提供模型、搜索、云或第三方服务的实现方。 | OpenAI-compatible endpoint、搜索服务。 | Provider 应可替换，不应成为核心业务语言。 |
| Readback | 动作后从目标 Fact Owner 重新读取真实结果。 | 发布后查远端版本、写文件后读 diff。 | 调用返回成功不能总替代 Readback。 |
| External Readback | 从 Agent 自身之外的权威表面验证结果。 | Git、Browser、Authoritative API、Health Check。 | 防止模型自我确认闭环。 |
| MCP | 让 AI Host 以标准方式连接外部 Context 和 Capability 的 Client-Server 协议。 | Chat/Agent 接入文件、Browser、SaaS。 | MCP ≠ Tool Calling ≠ Agent Runtime。 |
| MCP Host | 承载 AI 应用并管理一个或多个 MCP Client 的主体。 | 桌面 AI、Agent Host。 | Host 负责应用侧集成，不等于 Server。 |
| MCP Client | Host 内维护到某个 MCP Server 的协议连接。 | 一个 Host 连接多个 Server。 | 通常一条 Client 连接对应一个 Server 会话。 |
| MCP Server | 向 Client 暴露 Tool、Resource、Prompt 等能力的服务。 | 本地或远程能力接入。 | Server 不负责完整 Agent Loop。 |
| Primitive | MCP 协议中定义的基础能力类别。 | Tools、Resources、Prompts 等。 | Primitive 是协议概念。 |
| MCP Tool | 通过 MCP Server 暴露的可执行动作。 | 搜索、文件、浏览器操作。 | MCP Tool 是 Agent Tool 的一种来源。 |
| MCP Resource | 通过 MCP 提供给 Host 的可读取上下文资源。 | 文件、文档、数据库内容。 | Resource 主要提供数据，不等于 Tool Action。 |
| MCP Prompt | Server 可暴露的可复用提示模板能力。 | 特定工作流输入模板。 | Prompt 不等于 Tool。 |
| Capability Discovery | Client 获取 Server 支持哪些能力的过程。 | 连接建立后读取 capabilities。 | Discovery ≠ Negotiation。 |
| Capability Negotiation | 双方根据声明决定本次会话实际启用哪些协议能力。 | 协议版本/扩展差异。 | 声明支持不代表业务 Permission。 |
| Capability Declaration | 连接参与方显式声明自己支持的能力集合。 | 初始化握手。 | Declaration 是协议事实。 |
| Model-visible Capability Set | 最终暴露给模型可选择的能力子集。 | Harness 经过权限/相关性筛选后。 | 它应小于等于 Runtime 实际能力集。 |
| Transport | 承载 MCP 消息的实际通信方式。 | stdio、Streamable HTTP。 | Transport ≠ Data Layer 语义。 |
| stdio | 通过标准输入输出在本机进程间传输 MCP 消息。 | 本地 Server。 | 适合同机进程，不是网络协议。 |
| Streamable HTTP | MCP 的远程 HTTP 传输方式。 | 远程 Server、流式消息。 | 仍需认证、会话和网络安全。 |
| Handshake | 连接建立时交换版本、能力等初始化信息。 | Client/Server 初始化。 | Handshake 成功不等于 Tool 一定可执行。 |
| Stateless Protocol Core | 尽量让单条请求自包含、核心语义不依赖隐藏连接状态的设计。 | 降低恢复复杂度。 | 某些 Transport/Session 仍可有连接状态。 |
| Self-contained Request | 请求携带处理所需的明确身份/参数，而非依赖隐式内存。 | 可恢复协议调用。 | 有利于重试和横向扩展。 |
| Session | 一段连接或交互会话。 | MCP Session、Chat Session。 | Session ≠ Task。 |
| MCP Session ID | 标识某次 MCP 会话的协议身份。 | 远程 Session 连续性。 | 不能拿它替代业务 Task ID。 |
| Sticky Session | 后续请求尽量路由到同一会话实例。 | 某些有会话状态的服务。 | Sticky 是路由策略，不等于 Durable State。 |
| Metadata | 协议消息或能力上的辅助结构化信息。 | 版本、注释、来源。 | Metadata 不应承载隐藏业务真值。 |
| Elicitation | Server 请求 Host/用户补充必要信息的一类交互能力。 | 缺参数、需要用户选择。 | Elicitation 不等于高风险 Approval。 |
| Notification | 无需对应响应的协议事件消息。 | 状态变化、进度提示。 | Notification ≠ Durable Event Store。 |
| MCP Task | MCP 中用于表达较长异步工作的任务抽象。 | 长时 Tool 操作。 | MCP Task ≠ 产品自身 Runtime Task。 |
| Task Handle | 客户端引用长任务并继续查询/操作的句柄。 | Polling/Resume。 | Handle 是引用，不是完整业务状态。 |
| Polling | 客户端定期查询异步任务当前状态。 | 没有 Push/Webhook 时。 | 过度 Polling 会增加负载和延迟。 |
| Durable State Machine | 把异步任务状态持久化为可恢复状态机。 | 跨连接长任务。 | 不应只存在进程内存。 |
| MCP Result | MCP 调用最终返回的结构化结果。 | Tool/Task 完成。 | Result 仍需业务层验证。 |
| Authentication | 证明调用主体是谁。 | 远程 MCP/API。 | Authentication ≠ Authorization。 |
| Authorization | 判断已认证主体能访问哪些能力。 | Server Tool/Resource 权限。 | 有身份不等于拥有动作权限。 |
| Consent | 用户对数据访问或动作的明确同意。 | 读取敏感资源、连接第三方。 | Consent ≠ 永久 Permission。 |
| Access Control | 执行系统根据身份和策略限制资源访问。 | Tool/Resource 边界。 | 应由软件强制，不只靠 Prompt。 |
| Tool Annotation | 对 Tool 的风险、只读、副作用等语义做协议/元数据标记。 | Host 做展示和治理。 | Annotation 是提示/元数据，最终仍需 Runtime Policy。 |
| Protocol Adapter | 把内部能力模型映射到某个外部协议。 | 内部 Tool ↔ MCP Tool。 | Adapter 不应改变核心业务语义。 |
| A2A Boundary | MCP 工具/资源协议与 Agent-to-Agent 协作协议之间的职责边界。 | Agent 既用 Tool 又委派给其他 Agent。 | MCP 主要连接能力；A2A 主要连接独立 Agent 责任。 |

## 这一层必须真正会区分

- **Function Calling ⊂ Tool Calling**：Function Calling 是常见结构化实现，Tool Calling 是更上层能力。
- **MCP ≠ Tool Calling ≠ Agent Runtime**：MCP 管标准接入，Tool Calling 管调用意图，Runtime 管真正执行和状态。
- **Capability ≠ Tool ≠ Provider**：稳定能力语义、具体调用接口、外部实现方是三层。
- **Tool Success ≠ Effect Verified**：返回成功仍可能需要外部 Readback。
- **Discovery ≠ Permission ≠ Selection**：发现得到、允许使用、模型选择必须分开。
