# L5｜Workflow、Subagent 与 Multi-Agent

> 这一层回答：**哪些步骤应该写死，哪些交给 Agent；什么时候拆 Subagent，什么时候真的需要 Multi-Agent？**
>
> 阅读方式不是按字母背词，而是先看下面的关系链，再把每个术语放回真实系统位置。

~~~text
Goal → Workflow / State Machine → Agentic Decision → Delegation / Child Task → Acceptance → Handoff / Integration
~~~

## 术语表

| 术语 | 一句话 | 典型场景 | 关键边界 / 易混 |
|---|---|---|---|
| Deterministic Control | 由代码/规则明确决定下一步而不交给模型自由选择。 | 固定审批、校验、状态转换。 | 确定性路径应优先交给代码。 |
| Code | 把确定规则直接固化为程序。 | 解析、验证、计算。 | Code 与 Agentic Decision 应各自承担擅长部分。 |
| Chain | 按固定顺序串联多个处理步骤。 | Prompt Chain、ETL。 | Chain 比 Graph/Workflow 更线性。 |
| Workflow | 把多步骤、多角色、状态和 Gate 组织成可控执行路径。 | Dev→Test→Review→Release。 | Workflow ≠ Agent。 |
| Graph | 用 Node/Edge 表达可分支、循环或并行流程。 | LangGraph 类执行模型。 | Graph 是控制结构，不自动等于 Agent。 |
| Node | Workflow/Graph 中的一个执行或判断单元。 | Dev Node、Test Node。 | Node ≠ Worker。 |
| Edge | 连接节点并表达转移条件的关系。 | SUCCESS→Review、FAIL→Reopen。 | Edge 可以有条件和状态语义。 |
| DAG | 不存在有向环的图。 | 构建依赖、一次性数据管线。 | 需要循环恢复时不一定适合 DAG。 |
| Branch | 根据条件选择不同执行路径。 | 权限分支、错误处理。 | Branch 可由代码或 Agent 决定。 |
| Intermediate Result | 流程中间节点产生、供后续消费的结果。 | 检索候选、测试报告。 | 中间结果不一定是最终 Artifact。 |
| Input Contract | 规定某节点/任务合法输入。 | Subtask、Tool、Workflow Node。 | 明确输入可降低隐式依赖。 |
| Output Contract | 规定某节点/任务必须交付的结果结构。 | Artifact + Evidence + Status。 | “做完了”不是 Contract。 |
| State Machine | 用有限状态和合法转移描述对象生命周期。 | Task READY/RUNNING/WAITING/FAILED。 | State Machine ≠ Event Log。 |
| State Transition | 对象从一个正式状态迁移到另一个状态。 | READY→RUNNING。 | 必须验证当前 Version/Transition Rule。 |
| Fallback | 主路径不可用时切换到备用能力或较低级策略。 | Provider 故障、RAG 降级。 | Fallback 需要明确质量/风险边界。 |
| Agentic Decision | 由模型基于当前 Observation 动态选择下一步。 | 开放研究、工具选择。 | 能确定性编码的步骤不必 Agent 化。 |
| Dynamic Policy | 根据当前 State、Risk、Environment 动态选择规则。 | 高风险操作要求 Approval。 | Policy 决策仍应由软件边界执行。 |
| ReAct | 交替进行 Reason/Act/Observation 的 Agent 方法。 | 工具型 Agent Loop。 | ReAct 是方法，不是完整 Runtime。 |
| Reason / Act | 分别表示推理判断与真实动作。 | Agent Loop。 | Act 产生 Side Effect 时需要治理。 |
| Blocked | 因为缺条件、权限或外部依赖无法继续的执行状态/判断。 | 等待用户、服务不可用。 | Blocked 不一定等于 FAILED。 |
| Reducer | 把新事件/局部结果合并进状态的确定性函数。 | Graph State 更新。 | Reducer 不应偷偷掩盖冲突。 |
| State Commit | 把经过验证的新事实正式写入 Current State。 | Tool Effect 验证后更新 Task。 | Model Claim 不能直接 Commit Truth。 |
| Planner | 负责把 Goal 拆成可执行计划或任务的角色/组件。 | 复杂项目规划。 | Planner ≠ Executor。 |
| Executor | 按 Contract 执行具体动作并产出结果。 | Tool/代码/Worker。 | Executor 不应擅自改 Goal。 |
| Plan Version | 计划的版本身份，用于判断新 Evidence 后是否已经重规划。 | 长期 Task。 | 旧 Plan 不能覆盖新 State。 |
| Success Criteria | 判断 Goal/Task 真正完成的明确条件。 | 功能、质量、Evidence 要求。 | Success Criteria ≠ 自我感觉完成。 |
| Stopping Condition | 停止搜索、循环或研究的条件。 | 证据充分、预算耗尽。 | 是开放 Agent 的必要治理。 |
| Goal Drift | 长期执行中任务目标逐渐偏离原始目标。 | 反复重规划、上下文污染。 | 需要 Task Contract/Checkpoint 校准。 |
| Error Accumulation | 每一步小误差在长链路中逐渐放大。 | 长 Agent Loop。 | 增加验证点可限制传播。 |
| Trajectory | 从 Observation、Decision、Action 到 Result 的完整执行路径。 | Agent Eval、Debug。 | 只看 Final Answer 会看不到路径问题。 |
| Handoff | 同一责任从一个主体正式交给另一个主体。 | 换班、Role 转移。 | Handoff ≠ Delegation。 |
| Collaboration | 多个主体共享信息/能力但当前 Owner 不变。 | Reviewer 提建议。 | 协作不一定改变责任。 |
| Delegation | Parent 把局部责任交给 Child，但保留总体 Outcome 责任。 | Subagent。 | Delegation ≠ Handoff。 |
| Subagent | 为局部、可隔离、可独立验收责任创建的 Child Agent。 | 模块分析、专项研究。 | 不是因为“人多”就拆 Subagent。 |
| Task-scoped Subagent | 生命周期跟随某个 Child Task 的临时 Agent。 | 一次专项分析。 | 通常继承或收窄 Parent 权限。 |
| Independent Agent | 跨多个 Task 长期存在、拥有独立责任域和身份的 Agent。 | 专业领域 Agent。 | 不同模型/进程不自动等于 Independent Agent。 |
| Context Isolation | 让 Child 只看到完成局部任务所需 Context。 | 并行 Subagent。 | 减少信息泄漏和 Token 成本。 |
| Responsibility Isolation | 让 Child 拥有明确 Scope、产物和停止条件。 | Subtask Contract。 | 没有独立验收结果就不算有效隔离。 |
| Subtask Contract | Parent 对 Child 的 objective、scope、constraints、artifact、evidence、budget 合同。 | 可靠委派。 | 一句“研究一下”不是 Contract。 |
| Child Acceptance | Parent 对 Child 结果做正式验收。 | ACCEPT / NEEDS_REVISION / REJECT。 | Child COMPLETED ≠ Parent 已接受。 |
| Return Contract | Child 返回 Parent 时必须交付的结构化结果。 | 结果、Artifact、Evidence、风险。 | Parent 不应重读全部过程才能理解。 |
| Agent-as-Tool | 把一个 Agent 封装成 Parent 可调用的局部能力。 | 专业搜索/代码审计 Agent。 | 如果拥有长期独立状态，可能超出普通 Tool 语义。 |
| Multi-Agent | 多个具有独立判断/责任边界的 Agent 协同完成系统目标。 | Supervisor + Specialist。 | 多 Agent ≠ 多线程/多模型。 |
| Supervisor | 协调多个 Agent 的上层 Agent/控制角色。 | 路由、验收、冲突处理。 | Supervisor 不能成为所有事实第二真源。 |
| Router | 根据任务类型、能力和策略把工作分给合适主体。 | Agent Routing。 | Router ≠ Planner。 |
| Worker | 在具体 Task/Role 下实际执行工作的实例。 | Dev/Test Worker。 | Worker ≠ Role。 |
| Role | 稳定职责、权限边界和协作期望。 | Planner、Dev、Test。 | Role 是抽象责任，不是运行实例。 |
| Stable Identity | Agent/Worker 跨重启、Session 仍保持可识别身份。 | 长期 Agent、Handoff。 | 身份连续性有助于状态和权限治理。 |
| State Owner | 某类可变状态唯一有权提交正式变化的主体/领域。 | Task Store 拥有 Task State。 | 多个 Writer 会制造 Shadow Truth。 |
| Truth Ownership | 明确某类 Current Truth 最终由谁解释和提交。 | 多 Agent 协作。 | 所有 Agent 都能写 Truth 会失控。 |
| Shared State | 多个 Agent 共同读写的状态。 | Blackboard、协作工作区。 | 必须控制并发、版本和写权限。 |
| Shared Truth | 多个 Agent 都依赖的权威事实集合。 | 任务状态、已确认 Effect。 | Shared Truth 需要明确 Owner。 |
| Shared Workspace | 多个 Agent 使用同一文件/资源空间。 | 并行代码 Agent。 | 容易出现写冲突和 WIP 污染。 |
| Blackboard | 多个 Agent 通过共享结构化空间发布和消费信息的协作模式。 | 研究、规划协作。 | Blackboard 不是无约束共享聊天。 |
| Event Bus | 通过事件发布/订阅连接多个执行主体。 | 异步 Agent 协作。 | Event 顺序和幂等仍需治理。 |
| Event-driven Collaboration | Agent 由有意义事件唤醒而非持续轮询。 | Node ready、Webhook。 | 事件必须有持久状态支撑。 |
| Optimistic Versioning | 提交时检查版本未变化，冲突则拒绝并重新读取。 | 多 Writer 状态更新。 | 防止迟到结果覆盖新状态。 |
| Compare-and-set | 只有当前值/版本符合预期才执行更新。 | Lease、Task State。 | 是并发控制原语。 |
| Conflict Rate | 并行主体产生互相冲突修改/判断的频率。 | 评估 Multi-Agent 拆分质量。 | 并行越多不一定吞吐越高。 |
| Coordination Tax | 为同步、路由、Handoff、冲突解决付出的额外成本。 | Multi-Agent 系统。 | 拆 Agent 前必须证明收益高于协调税。 |
| Information Funnel | 把多个 Child 的大量过程压成 Parent 可消费的高质量结果。 | 并行研究。 | 要求 Return Contract 和 Evidence。 |
| Specialist | 围绕稳定专业责任域工作的 Agent。 | 安全审计、RAG 专家。 | 专业化应该来自责任边界，不只是 Prompt 人格。 |
| Ephemeral Agent | 只为一次局部任务临时创建、完成后销毁的 Agent。 | 短期 Subagent。 | 不应拥有无边界长期 Memory。 |
| Persistent Agent | 跨任务长期存在并保持身份/责任的 Agent。 | 长期 Monitor/领域 Agent。 | 需要正式 State、Permission、Lifecycle。 |
| Agent Registry | 在确有发现需求时记录 Independent Agent 身份与能力的索引。 | A2A/动态路由。 | Registry 不能取代各 Agent 的状态 Owner。 |
| A2A | Agent-to-Agent，独立 Agent 之间交换任务、状态或结果的协作协议/模式。 | 跨 Runtime Agent 协作。 | A2A ≠ MCP；前者强调责任主体协作。 |
| Agent Card | 描述 Agent 能力、身份、端点等可发现信息的结构化声明。 | A2A Discovery。 | Card 是描述，不是实时 State。 |
| Bounded Delegation | 把 Child 的 Scope、Budget、Permission 和时间限制在 Parent 明确授权范围内。 | 安全 Subagent。 | Child 权限不应自动大于 Parent。 |
| Failure Containment | 把一个 Agent 的错误限制在局部责任和资源范围。 | 多 Agent 隔离。 | 隔离是拆 Agent 的重要价值之一。 |

## 这一层必须真正会区分

- **Workflow ≠ Agent**：Workflow 管路径和状态，Agent 管不确定环境下的判断。
- **Collaboration ≠ Delegation ≠ Handoff**：Owner 是否变化、Parent 是否保留总体责任不同。
- **Task-scoped Subagent ≠ Independent Agent**：局部临时责任和长期独立责任域不同。
- **Shared State ≠ Shared Truth**：共享可写工作区不等于所有内容都成为正式真值。
- **Parallelism ≠ Throughput**：并行增加后还要扣除 Coordination Tax、冲突和验收成本。
