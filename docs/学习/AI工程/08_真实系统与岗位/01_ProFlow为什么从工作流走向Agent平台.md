# ProFlow 为什么从工作流走向 Agent 平台

> 唯一职责：用 ProFlow 贯穿验证 Workflow、Runtime、Harness、Multi-Agent 与 Platform 的升级条件。  
> 事实基线：2026-09-03 只读回读当前仓库。当前存在未提交 WIP（在制修改），本文只使用可由源码或规范确认的责任边界；候选实现、包级测试、真实浏览器旅程与最终通过状态不会混写。

## ProFlow 的每一层都由真实失败逼出来

ProFlow 的价值不在于“用了多少 AI 名词”，而在于它能把前面七层知识放回真实工程：路径什么时候够用，什么时候必须有长期 Task，真实浏览器副作用为什么需要 Evidence，多个模块什么时候才值得抽平台责任。

#### 本节新词

- **ProFlow**：本教材用来贯穿 Workflow、Runtime、Harness、执行环境和平台责任的真实工程案例。本章只使用当前源码/规范能够支持的责任边界。
- **Architecture Laboratory（架构实验场，本章学习视角）**：本章用一个持续演进的真实系统检验“什么问题逼出了什么责任”。这是教材组织案例的说法，不是通用 AI 架构术语，也不意味着其他系统应该复制 ProFlow。
- **WIP（Work in Progress，在制修改）**：工作区中尚未形成最终交付的变化。WIP 可以是有价值候选，但不能和已验证 PASS 混写。

```text
Workflow / Task Graph
→ durable Task / Node / Event
→ Execution truth / idempotency / recovery
→ Browser Carrier + Environment evidence
→ Agent Role / Worker binding
→ Model Policy FAST / REASON
→ Deployment modules + Platform Host
→ 是否需要更动态的 Multi-Agent / Platform
```

每次升级都应由失败和责任驱动，而不是把 Agent Platform 当预设终点。

## 阶段 1｜Workflow：先拥有业务路径

#### 本节新词

- **Task Graph（任务图）**：把业务过程表示为 Node、Dependency 和 State Transition 的结构。它能明确允许路径，但不会自动提供断线恢复和现实副作用真值。
- **Node（节点）**：Task Graph 中一个边界清楚的工作单元；节点完成与整个 Task 完成是不同层级。
- **Dependency（依赖）**：规定一个 Node 是否必须等待另一个对象满足条件后才能运行。


最初核心问题是把任务拆成 Node、依赖、输入和输出。路径和合法状态由系统定义，模型只处理局部模糊工作。这一阶段 Workflow 比开放 Agent 更自然，因为任务边界、文档和完成条件可显式表达。

## 阶段 2｜Task / State：聊天不能承载 Current Truth

#### 本节新词

- **Durable State（耐久状态）**：跨 Session、Process 和等待仍需保持的当前任务事实，例如 status、version、owner 和 pending work。
- **TaskRoleBinding（任务角色绑定）**：ProFlow 中把 Task/Role 与具体 Worker/Conversation 等执行身份关联的持久对象；它不能靠每次从角色名重新猜。
- **Execution History（执行历史）**：记录任务过去运行和动作过程的历史信息；它与 Current State 不同。


当任务跨会话、进程和人工等待继续，必须把 Truth 移出聊天。当前设计把 Task/Node status、version、currentNodeId、TaskRoleBinding、TaskDocument metadata、Event、Idempotency 和 Execution History 放入 durable state；Git/文档正文与 SQLite metadata 各有边界。

这一步说明：`Agent 能记住` 不是可靠方案，Runtime State 才能支持 Resume 与接管。

## 阶段 3｜Execution：动作成功必须有唯一真值

#### 本节新词

- **Execution Truth（执行真值）**：关于真实动作是否发生、产生什么结果的权威事实。Queue 接收、Worker 返回或 UI 提示都可能只是局部 Observation。
- **Idempotency Key（幂等键）**：标识同一个 logical operation 的稳定键，使安全重放可以识别“这是同一次意图”而不是产生第二次副作用。随机 UUID 本身不会自动提供幂等。
- **Fingerprint（指纹）**：从动作关键输入计算出的稳定标识，可辅助识别等价业务意图和冲突。
- **Lost-response Reconciliation（响应丢失对账）**：动作可能已发生但响应丢失时，重新读取现实状态确认 Effect，再决定恢复路径。


真实执行引入：幂等 fingerprint、approval/effect boundary、Artifact truth、lost-response reconciliation、UNKNOWN reality verification、重启不盲重放和敏感信息脱敏。核心原则：

```text
Proposal ≠ Authorized Action
Tool Result ≠ Effect
Timeout ≠ Failure
Artifact ≠ Evidence
```

Recovery 必须先确认现实，再决定继续、补偿或停止。

## 阶段 4｜Browser Carrier：环境能力不属于模型

#### 本节新词

- **Carrier（执行载体）**：在 Browser、本地设备或远端环境中真正承接物理动作的执行位置。模型提出动作，Carrier 负责实际交付与回读。
- **Environment Adapter（环境适配器）**：把 Browser/设备的私有操作和事件转换成 Runtime 可理解的稳定合同；它不拥有全局调度或业务 Truth。
- **Conversation Locator（会话定位符）**：稳定定位某个浏览器/ChatGPT 会话的引用，避免每次按角色名或页面文本猜测目标。
- **Physical Delivery Verification（物理交付验证）**：在真实页面/外部环境中回读并确认动作确实到达目标对象，而不是只看本地函数返回。


浏览器扩展/Carrier 负责真实 ChatGPT 页面中的 Conversation create/restore/wake、DOM submit、permission interaction 和 physical delivery verification。Task Observer 正常推进应是确定性的；REASON 可辅助异常诊断，但不能获得业务状态提交权。

这使 Browser Agent 回到正确位置：它是受 Runtime 驱动的 Environment Adapter，不是全局 Scheduler 或 Truth Owner。

## 阶段 5｜Role / Worker Binding：责任身份持久化

#### 本节新词

- **Worker（执行者）**：Runtime 中承担某类实际工作或会话执行责任的具体主体。Role 是责任类型，Worker 是绑定到实际执行位置的实体。
- **Role Binding（角色绑定）**：把抽象 Role 稳定关联到 Worker、Agent Package 或 Conversation Locator 的持久关系。
- **Same-value Idempotency（同值幂等）**：重复提交完全相同绑定时返回已有结果；不同值则应显式冲突，防止静默漂移。


Task 需要稳定绑定 Worker/Conversation，而不是每次按角色名猜 URL。`TaskRoleBinding(agentPackageRef/roleRef/workerRef/conversationLocator)` 一次绑定、同值幂等、异值冲突；`startNode` 从 required Agent Package 解析绑定 Worker。

这已经具备多责任主体的一些原语，但不表示系统必须升级成自由动态 Multi-Agent。固定角色 + 稳定合同可能更可靠。

## 阶段 6｜FAST / REASON 与 Policy

#### 本节新词

- **FAST / REASON**：ProFlow 中两类模型推理档位：FAST 面向低成本高频判断，REASON 面向复杂异常诊断。它们是 Policy 可选择的计算角色，不拥有硬权限。
- **Hard Rule（硬规则）**：由软件/Policy 明确执行、模型建议不能覆盖的确定性约束，例如 mandatory approval。
- **Model Provider（模型提供方）**：提供模型可达性、认证和调用能力的服务边界，不拥有业务 Capability 是否允许执行的判断。


执行决策遵循 `Policy hard rule > FAST/REASON suggestion`。FAST 处理低成本判断，REASON 处理异常或复杂诊断；mandatory Human/Approval 不能被模型的 ALLOW 覆盖。Model Provider 负责可达性和认证，不拥有业务 Capability 判断。

这验证了模型智能与 Runtime 权限必须分开。

## 阶段 7｜Deployment / Platform Host

#### 本节新词

- **Platform Host**：ProFlow 的 Application Composition Root，负责实例化模块、依赖注入、本地 Transport 与 Host 自身 Lifecycle，而不是吞并领域包内部 Truth。
- **Application Composition Root（应用组合根）**：程序启动时创建并连接主要模块/依赖的入口位置，让依赖关系集中组装而不是散落在业务代码。
- **Dependency Injection（依赖注入，DI）**：由外部组装层把实现提供给模块，而不是模块自己在内部硬编码创建依赖。
- **Platform CLI（平台命令行）**：负责模块发现、依赖顺序、Setup/Status 和 Fail-fast 的用户操作入口；它只应解释共享平台状态，不替模块定义内部业务事实。


在 ProFlow 中，Host 负责实例化、依赖注入、本地 transport 与自身 lifecycle；Task Runtime、Agent Runtime 等领域包继续保持边界，运行型模块独立启动。CLI 负责模块发现、依赖顺序、setup/status 与 fail-fast，但不理解每个模块的内部业务事实。

平台化在这里来自安装、依赖、共享事实、外部资源和恢复的重复责任，不是换一个更大的框架。

## 为什么当前不应直接“全面 Multi-Agent”

ProFlow 已有固定三角色、Worker binding、事件和 Browser Carrier。进一步动态 Discovery/Delegation 的收益必须证明：

- 固定角色无法覆盖真实责任变化；
- 动态拆分显著改善成功率或并行延迟；
- Shared State、Permission 和 Handoff 已能治理；
- 协调成本小于 Context 隔离收益。

否则继续用 Workflow + focused Subagent/Role 更稳。

## 每次架构升级靠什么证据

#### 本节新词

- **Package Test（包级测试）**：验证某个包/模块合同的自动测试证据，只覆盖其责任边界。
- **Materialized Runtime / Extension（实体化运行时 / 扩展）**：真正安装、构建或生成到目标环境中的可执行对象，比单元测试更接近真实集成状态。
- **Journey / E2E（真实旅程 / 端到端测试）**：从真实用户入口穿过实际依赖直到最终 Effect 的完整验证。E2E PASS 不能由 Package Test 代替。
- **Phase Gate（阶段门禁）**：阶段结束前必须满足的一组明确验收条件，用来防止候选状态提前写成 READY。


ProFlow 明确区分：设计/候选、自动 package tests、materialized Extension、真实 Chrome/ChatGPT journey 和最终 Phase Gate。当前工作树存在大量未提交变更与文档迁移，因此不能从某次测试数字推断当前 final PASS。

教材应保留这条纪律：**不能把尚未验证的状态写成 READY。**

## 失败与反例

- 把 Browser orchestration 当 Task truth；
- Timeout 后盲重发真实动作；
- 用角色名重构 Conversation locator；
- 让 REASON 覆盖硬 Policy；
- 用 package test 代替真实外部 E2E；
- 平台 status 把配置、进程和外部资源混成一个 READY；
- 因为已有多个角色就预设动态 Multi-Agent。

## 以后出现什么变化，才值得继续升级

这里直接沿用 Platformization 章已经定义的 **Future Trigger（未来触发器）**：今天没有证据支持的复杂度先不实现，等可观察条件真正出现再重新打开决策。

对 ProFlow 来说，这些条件包括动态责任发现、跨 Runtime Agent、稳定并行收益、长期 Agent Identity 或跨产品复用，并且需要 Eval 证明新增组织成本确实换来了结果改善。触发前保持最小可靠组织。

## 用这些问题回看 ProFlow 的升级证据

1. ProFlow 为什么先长 Runtime，而不是先长更多 Agent？
2. Browser Carrier、Task Runtime、Model Provider 分别不能拥有什么？
3. 什么证据才能把候选提升为真实 Journey PASS？
4. 哪些 Future Trigger 能证明动态 Multi-Agent 值得？

## 学习导航

[← 上一章](../07_AI平台与产品/03_什么时候值得建设AI平台.md) · [新版目录](../README.md) · [下一章 →](02_云端Agent怎样访问本地知识.md)
