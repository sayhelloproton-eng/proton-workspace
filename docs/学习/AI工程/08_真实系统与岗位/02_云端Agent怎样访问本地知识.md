# 云端 Agent 怎样访问本地知识

> 唯一职责：验证云端交互、受控入口、本地检索、权限与证据的端到端边界。

## 云端模型不应直接获得本机文件系统

如果一个云端 Agent 需要回答“我本机仓库当前实现是什么”，最危险的设计是直接给它任意路径读取或 Shell 权限。更合理的链路是：云端只表达业务查询，本地受控入口验证身份和 Scope，再由本地 Runtime 读取权威资料并返回最小充分 Evidence。

#### 本节新词

- **Custom GPT（自定义 GPT）**：ChatGPT 中可配置 Instructions、Knowledge、Capabilities、Apps/Actions 等能力的 GPT 产品形态。本章把它作为云端交互入口案例，不把它等同于通用 Agent Runtime。
- **Local Retrieval Runtime（本地检索运行时，本章案例架构名）**：本章用这个名字指代位于本机/私有环境、负责读取权威资料并返回受控 Evidence 的运行组件。它是本地架构对象，不是行业统一产品名。
- **Capability Boundary（能力边界）**：云端能请求哪些高层动作、不能越过哪些本地权限的明确接口边界。

```text
Custom GPT / cloud interaction
  ↓ HTTPS Action contract
Public ingress / tunnel
  ↓ authenticated Agent Gateway
Local Retrieval Runtime
  ↓ Vector + Keyword + CodeGraph + Git + SQL
Authoritative local sources
  ↑ result + provenance + evidence
```

云端模型不应直接获得本机文件系统。Gateway（网关）只暴露经过约束的窄 Capability（能力入口）；Local Runtime（本地运行时）负责读取权威来源、执行 Hybrid Retrieval 并返回可验证结果。

## 为什么上传 Knowledge 不够

#### 本节新词

- **Knowledge（GPT Knowledge / 上传知识）**：在 GPT 产品中上传、供回答时作为参考资料使用的文件。它适合相对稳定资料，不应假设会自动同步本地 Git、DB 或 Task State。
- **Dynamic Knowledge（动态知识）**：会随 Git、Database、Runtime State 或外部系统持续变化的事实，需要在请求时读取权威来源。


上传文件适合相对稳定参考资料，但不能假设它自动跟随本地 Git、数据库和任务状态变化。动态知识需要实时访问权威系统，并保留版本、权限和 Provenance。

## Capability Boundary

#### 本节新词

- **Narrow Capability（窄能力）**：围绕一个明确业务意图暴露的受控接口，例如 `search_project_knowledge(...)`。它与任意文件读取/SQL/Shell 这类宽权限接口相对。
- **Scope（作用范围）**：本次调用允许访问的仓库、目录、项目、版本或数据域，用来限制 Capability 的影响面。
- **Result Schema（结果模式）**：返回结果必须满足的结构合同，方便云端稳定解析 Evidence、Source、Version 和错误。


对外接口应是 `search_project_knowledge(query, scope, version)`，而不是 `read_any_path` 或 `run_sql`。上层表达业务意图，Runtime 选择 Vector/Keyword/CodeGraph/Git/SQL 后端。

Capability Contract 包含：输入约束、允许 Scope、身份、超时、结果 schema、Evidence、错误分类和审计字段。

## Public Ingress 与协议边界

#### 本节新词

- **Public Ingress（公网入口）**：让外部云服务能够访问本地/私有服务的网络入口。可达性不等于身份和权限已经安全。
- **Tunnel（隧道）**：把私有网络中的服务通过中间通道暴露到可访问地址的网络机制。Tunnel 解决 transport reachability，不自动提供 Auth、Policy 或 Retrieval Truth。
- **HTTPS（HTTP Secure，安全 HTTP）**：使用 TLS 加密的 HTTP 通信。它保护传输链路，但不能证明请求者有业务权限。
- **OpenAPI**：描述 HTTP API endpoint、参数、认证和 Schema 的机器可读规范；当前 GPT Actions 使用 OpenAPI 描述外部 API。
- **HTTPS Action Contract（HTTPS 动作合同，本章工作称呼）**：为了描述本案例，把“云端 Action 通过 HTTPS + Auth + OpenAPI 调用受控本地能力”简称为这条合同；它不是通用协议名称。


OpenAI 当前产品合同要求 Action 连接一个由 OpenAPI 描述、并按配置完成认证的 external API。本案例选择通过公网可达的 HTTPS ingress / tunnel 把这项 API 暴露给云端；**公网 HTTPS 是本地架构实现，不写成 GPT Actions 的通用协议定义。** 私有 MCP transport 也不能仅因为名字里同样有“tunnel”，就直接替换这条 Action/API 链路；如果改变接入协议，需要单独做架构判断。

Tunnel 只解决这套实现里的网络可达，不拥有认证、业务权限或 Retrieval Truth。Gateway 仍要验证调用身份、Capability allowlist、速率、响应大小和敏感数据边界。

## 本地 Runtime 后面可以连接多种 Truth

云端只需要表达“我要查什么”，不应该指定“去哪个本地数据库查”。真正的检索选择留在本地：语义问题可能走 Vector，精确符号走 Keyword，代码关系走 CodeGraph，版本事实回 Git，结构化事实交给 SQL。

这些 Retriever、Query Plan、融合和冲突规则已经由 [检索系统怎样找到正确资料](../02_知识与能力/02_检索系统怎样找到正确资料.md) 正式负责。本章只关心一个端到端边界：**检索细节留在私有环境，云端拿到的是带 source / version / authority / snippet 的最小必要结果。**

## Local Runtime 要把私有实现收进一个稳定结果合同

#### 本节新词

- **Result Normalization（结果标准化）**：把不同本地来源的字段、错误和 Evidence 转成统一返回结构，避免云端依赖某个 Vector DB、Git 命令或数据库实现。
- **Minimum Sufficient Evidence（最小充分证据）**：足以支持当前判断、又不过度泄露本地资料的证据集合。

Local Runtime 沿用检索章节的 Query Plan、Rerank、Freshness 和 Authority，只额外承担这条“云端—本地”边界上的两件事：先按身份和 Scope 执行本地查询，再把结果收敛为稳定合同。它不把整个仓库、完整 SQL 结果或任意文件内容原样推到云端。

## Security Boundary

#### 本节新词

- **Agent Gateway（Agent 网关）**：位于公网入口后，负责 Auth、Capability allowlist、Scope、速率和结果大小等治理，再把合法请求转给本地 Runtime。
- **Allowlist（允许列表）**：明确列出允许访问的域、Capability、路径或资源。未在列表中的对象默认拒绝。
- **Secret（密钥 / 敏感凭证）**：API Key、Token、Client Secret 等认证材料，不应进入模型返回或可见 Context。
- **Rate Limit（速率限制）**：限制单位时间内的调用数量，防止滥用和资源耗尽；它不替代业务 Permission。


- 公网入口不暴露任意文件/命令；
- 本地监听与公网转发分层；
- Token/Secret 不进入模型结果；
- 路径与仓库 Scope allowlist；
- read capability 与 write capability 分离；
- 每次结果记录 source/version；
- 高敏数据可只返回存在性或受控摘要。

## 云端入口连接本地知识时最容易踩的坑

- 把上传 Knowledge 当实时 State；
- 把 Vector DB 当 Source of Truth；
- Tunnel ready 就宣称端到端可用；
- 把 MCP endpoint 当普通 REST Action ingress；
- Gateway 允许模型传任意本机路径；
- 只返回自然语言答案，没有引用和版本；
- 索引过期却没有 Freshness signal。

## 怎样一层层证明这条连接链真的可用

不要再为这套顺序发明一个新的“Validation Ladder”概念，直接按证据强度验证即可：

```text
contract/schema test
→ local runtime retrieval test
→ gateway auth/policy test
→ public HTTPS reachability
→ Custom GPT Action parse
→ authenticated real call
→ source/evidence readback
```

前一层通过不能替代后一层。公网返回 HTTP `200` 只能证明一次请求有响应；只有身份、权限、本地来源、版本和 Evidence 都能在真实调用中回读，这条云端到本地的链路才算可用。

## 当前产品事实｜2026-09-03

截至 2026-09-03，OpenAI 官方文档仍说明：GPT 的 Knowledge 用于上传参考资料；Actions 用于连接开发者定义的 external APIs；配置 Action 需要 API 认证信息与 OpenAPI Schema，支持 None、API Key 或 OAuth 等认证方式。产品可用性和 Workspace 限制会变化，因此本章只把它作为当前云端入口案例。

官方来源：[GPTs in ChatGPT](https://help.openai.com/en/articles/8554407-gpts-faq)、[Configuring actions in GPTs](https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts)。

## 什么时候上传文件就够，什么时候需要本地 Runtime

资料稳定、规模小、没有本地权限和版本事实时，上传 Knowledge 或简单搜索已经足够。只有知识持续变化、存在多种 Truth、需要访问私有环境并保留版本证据时，Local Retrieval Runtime 才开始偿还它的复杂度。

写操作不要顺手塞进同一个检索入口。读取本地知识和改变本地世界是两类风险完全不同的 Capability，后者应单独设计权限、审批和恢复链。

## 检查这条连接链是否真实可用

1. 为什么 Tunnel 不拥有认证和业务权限？
2. 为什么云端 Agent 不应直接获得任意本机文件访问？
3. Hybrid Retrieval 的后端由谁选择？
4. 什么证据才能证明云端到本地链路真实可用？

## 学习导航

[← 上一章](01_ProFlow为什么从工作流走向Agent平台.md) · [新版目录](../README.md) · [下一章 →](03_端侧模型与云端模型怎样分工.md)
