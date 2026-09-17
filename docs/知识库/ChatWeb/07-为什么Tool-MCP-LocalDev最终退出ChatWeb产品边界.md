# 为什么 Tool、MCP、Local Dev 最终退出 ChatWeb 产品边界

ChatWeb 曾经真实实现并验收过 Tool（工具执行）、MCP（Model Context Protocol，模型上下文协议）、Local Dev（本机开发工具入口）和 Chrome 只读调用；后来又主动把这些能力从当前 Web Chat 产品里撤掉。

这段经历最值得理解的不是“做了又删”，而是一个更常见的产品工程问题：**技术上已经证明可行的能力，是否仍然值得成为产品长期职责？** ChatWeb 的答案最终是否定的，但此前实验暴露出的权限、进程归属、执行边界和会话隔离问题都保留下来，进入了更合适的工程层。

## 工具执行为什么一开始就不能塞进 Context Provider

`ContextProvider`（上下文提供者）是在模型生成前做受预算的只读数据解析；Tool execution（工具执行）则可能产生真实副作用，还涉及 Approval（审批）、幂等（重复执行不会制造第二份业务结果）、retry（重试）和 recovery（失败恢复）。两者生命周期完全不同。

因此 ChatWeb 早期先建立独立 `ToolProvider` 和 `ToolExecutionInput`，但刻意不让它直接改 ChatRun、不扩 public SSE（公开流式协议），也不提前制造 Agent loop（模型连续自主调用工具的循环）。这一步先证明“工具应该有自己的执行边界”，而不是先追求一个看起来完整的工具产品。

一次关键 Review（审查）随后发现更危险的问题：第一版 Registry（能力注册表）会把 Provider discovery（外部能力发现）直接变成可执行能力。对 MCP 来说，这意味着外部 server 新增一个 `admin` 或 `MUTATING`（会产生副作用）工具后，可能自动进入执行范围。

最终边界被明确拆成：

```text
provider discovery（发现它存在）
≠ runtime enablement（运行时允许它执行）
≠ approval（本次副作用已经获得批准）
```

`register(provider, allowedTools)` 由 Trusted Runtime（可信运行时）维护 allowlist（明确允许列表）；nested JSON Schema（嵌套输入结构定义）在注册时 deep clone + deep freeze（深拷贝并递归冻结），避免调用方之后改写已经生效的 executable policy snapshot（可执行策略快照）。

## 真实 MCP 验证暴露了“进程就绪”和“谁有权执行”是两件事

当工具能力开始进入真实 UI 验证时，第一个问题不是“Local Dev 和 Chrome 能不能启动”，而是本机已经存在 canonical shared owner（唯一共享进程归属方）。如果 ChatWeb 再 direct-spawn（直接启动）第二个 Desktop Commander 或第二个 Playwright MCP，就会出现两个 controller（控制者）；Chrome 场景甚至会争用同一个 Extension / Profile。

因此 ChatWeb 被约束为：**不拥有这些 MCP 子进程的生命周期，只消费共享运行时暴露出来的能力。**

接下来又发现 readiness（就绪状态：共享进程活着并可被发现）不等于 execution authority（执行权限：当前消费者真的拥有可调用的执行端点）：

- Playwright Chrome 有 broker-owned loopback execution endpoint（由共享代理拥有的本机回环执行端点），所以 `READ_ONLY`（只读）的一次工具调用可以真实执行；
- Local Dev 当时只有 readiness，没有共享 execution endpoint，因此 public metadata（公开能力信息）可以显示，但执行必须保持 `UNAVAILABLE`；
- `MUTATING` 工具在 Approval Flow（审批流程）建立以前始终不可执行。

这不是纸面推理。对应机械证据曾达到 API 78/78 + Web 10/10、focused endpoint-authority（执行端点归属）12/12；真实 API 与 Browser 也都通过 `browser_snapshot` 完成过 one-hop（一次）只读调用。

## 为什么真实 PASS 以后，产品仍然决定把它移出去

后续产品方向逐渐收敛成日常 Web Chat。当前核心需求是 Chat、Thinking（思考模式）、附件、Voice（语音）、Citation 和智能联网，而不是在聊天产品里直接操作本机开发环境和浏览器自动化。

如果继续保留 generic Tool catalog（通用工具目录），产品就必须长期承担一整套额外复杂度：

- 本机资源权限和副作用审批；
- MCP transport（传输连接）与共享 Runtime 的生命周期；
- per-consumer browser session isolation（每个消费者独立浏览器会话）；
- `MUTATING` Tool 的 durable approval / recovery（可持久恢复的审批与恢复）；
- Browser public schema（前端公开结构）与 private transport（私有传输配置）的泄漏风险；
- Tool loop / Agent loop 带来的新状态机。

这些问题都是真的，也都值得工程化，但它们更适合由 workspace、ProFlow 和共享自动化能力承担，而不是成为 ChatWeb Web Chat 的默认产品职责。**退出产品边界并不是否定实现，而是在维护复杂度和当前用户价值之间重新做取舍。**

## 为什么 Intelligent Web Search 可以留下来

Intelligent Web Search（智能联网搜索）是一个更窄的 server-owned READ_ONLY research capability（服务端拥有的只读研究能力）。它只接受 bounded query（受长度和轮数约束的查询），不能访问任意本机资源，也没有通用 public Tool catalog。Browser 只看到“联网 off / auto”，Runtime 则拥有 provider、budget（预算）、provenance（来源追踪）和失败语义。

因此当前架构可以同时成立两件事：ChatWeb 支持智能联网，但不提供通用 MCP / Local Dev / Chrome 执行面。Search 的存在不能被推导成“既然已经有执行器，就顺便把所有本机工具放回来”。

## 工具退出产品以后，最有价值的经验被提升到共享工程层

真实 Browser 自动化还暴露了另一个问题：一个 Playwright raw owner（底层浏览器自动化进程）并不等于多个 Chat 自动拥有隔离的 page / context（页面与浏览器上下文）。多个消费者仍可能共享 stateful current page（有状态的当前页面），一个会话切页以后影响另一个会话。

这个问题最终被提升到 workspace 的公共 Acceptance Automation Skill（验收自动化技能），用 target-bound / isolated scene（绑定明确目标并隔离场景）的方式处理，而不是继续让 ChatWeb 产品源码承担自动化 SOP（标准操作流程）。

这段历史留下的长期经验可以概括为：**产品事实回到产品，跨项目方法回到共享 Skill，运行时能力回到真正 Owner。** 一项能力可以退出产品，但它暴露出的工程边界不应该一起被删除。

## 当前结论

历史 Tool / MCP 实验继续保留在证据档案里，用来解释为什么 discovery（发现）、readiness（就绪）、enablement（启用）、execution（执行）和 approval（审批）必须分层；当前 ChatWeb 则保持 Web Chat 边界，不提供通用 Tool / MCP / Local Dev / Chrome execution surface（执行面）。

未来如果真实用户需求重新出现，这些能力应该作为新的产品能力重新建模、重新验收，而不是因为历史上曾经 PASS 就直接复活旧入口。
