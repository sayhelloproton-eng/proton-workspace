# L7｜Eval、可观测性、路由与平台

> 这一层回答：**怎样证明 Agent 做对了、出了问题怎样定位，以及什么时候能力才值得平台化？**
>
> 阅读方式不是按字母背词，而是先看下面的关系链，再把每个术语放回真实系统位置。

~~~text
Execution → Telemetry / Trace → Eval / Failure Slice → Routing / Policy → Release → Business Outcome / Feedback Loop
~~~

## 术语表

| 术语 | 一句话 | 典型场景 | 关键边界 / 易混 |
|---|---|---|---|
| Eval / Evaluation | 用固定样本、标准和方法衡量模型或 AI 系统质量。 | 模型、RAG、Agent 回归。 | Eval ≠ Acceptance。 |
| Golden Set | 经过人工确认、可稳定重复使用的高质量评估样本集。 | 回归测试。 | Golden Set 需要版本化和维护。 |
| Benchmark | 用于横向/纵向比较系统能力的一组标准任务和指标。 | 模型选型、系统演进。 | 公开 Benchmark 不等于真实业务分布。 |
| Rubric | 把开放质量拆成可评分维度和标准的规则。 | 回答质量、Agent Outcome。 | Rubric 应可解释，避免只给总分。 |
| Grader | 根据 Rubric 对输出进行评分的执行器。 | 规则、人工、LLM Judge。 | Grader 本身也需要校准。 |
| LLM-as-Judge | 让模型根据 Rubric 对开放语义结果评分。 | 文本质量、复杂 Outcome。 | 能确定性验证的内容不要交给 Judge。 |
| Deterministic Evaluator | 用代码/规则得到确定结果的评估器。 | Schema、exact match、状态检查。 | 优先用于可机械判断的目标。 |
| Deterministic Eval | 由确定性 Evaluator 组成的评估。 | API contract、文件结构。 | 与 LLM Judge 互补。 |
| Offline Eval | 在固定数据集和离线环境中重复评估。 | 发布前回归。 | 无法完全代表线上真实分布。 |
| Online Eval | 在真实流量/运行中评估系统表现。 | A/B、Shadow、生产指标。 | 需要安全、隐私和统计纪律。 |
| Regression Eval | 验证新版本是否破坏已有能力。 | 模型/Prompt/Runtime 变更。 | 每次改进都应关注 Failure Slice。 |
| Task Eval | 按完整 Task 是否满足目标进行评估。 | Agent 长任务。 | 不同于单次模型回答分数。 |
| Final Answer Eval | 只评最终输出内容质量。 | 问答、报告。 | 可能看不到错误 Trajectory。 |
| Trajectory Eval | 评估 Agent 过程中的 Observation/Decision/Action 路径。 | 工具选择、重试、成本。 | 用于诊断“答案对但过程危险”。 |
| Artifact Eval | 评估生成的代码、文件、报告等产物质量。 | Coding Agent。 | Artifact 存在不等于正确。 |
| Outcome Eval | 评估业务最终结果是否达成。 | 任务成功率、业务影响。 | 是比文本质量更高一层的指标。 |
| Effect Eval | 评估现实副作用是否正确发生且符合约束。 | 发布、浏览器操作。 | 需要 External Readback。 |
| Failure Taxonomy | 按原因和层级对失败进行系统分类。 | Model/Harness/Tool/Runtime/Evaluator。 | 没有 Taxonomy 就容易把所有失败归模型。 |
| Failure Slice | 按任务类型、风险、长度等切分失败分布。 | 找局部退化。 | 总平均会掩盖关键坏切片。 |
| Evaluator Defect | 评估器本身误判、漏判或标准错误。 | 假红灯/假绿灯。 | Eval 系统也必须被测试。 |
| Canary Eval | 先在小范围版本/样本上做验证再扩大。 | 模型、Prompt、Behavior Release。 | 适合降低回归 Blast Radius。 |
| Shadow Eval | 新系统在不影响真实结果的情况下旁路运行评估。 | Routing/模型替换。 | Shadow 输出不能直接产生生产 Effect。 |
| Coverage | 评估集覆盖真实任务空间的程度。 | 用例设计。 | 数量多不代表覆盖好。 |
| Counterexample | 能推翻当前规则或暴露边界的反例。 | 测试假设。 | 高价值 Eval 应主动找反例。 |
| Observability（可观测性） | 通过外部信号还原系统内部状态和执行过程的能力。 | 复杂 Agent 故障定位。 | Observability ≠ Logging。 |
| Logs | 离散事件和文本记录。 | 错误、Tool Call、状态变化。 | 日志需要结构化和关联 ID。 |
| Metrics | 可聚合的数值时间序列。 | 成功率、延迟、成本。 | Metric 适合趋势，不保存完整因果链。 |
| Trace | 把一次请求/Task 跨组件执行链串起来。 | Task→Model→Tool→State。 | Trace 由多个 Span 组成。 |
| Span | Trace 中一段具体操作及其时间、属性和结果。 | Model Invocation、DB Query。 | Span 过细/过粗都会影响诊断。 |
| Agent Trace | 专门记录 Agent Decision、Tool、State 变化的 Trace。 | 长任务诊断。 | 需要和普通服务 Trace 关联。 |
| Tool Trace | 记录 Tool 调用、参数摘要、延迟和结果的链路。 | 工具可靠性。 | 敏感参数需脱敏。 |
| Telemetry | 系统自动产生并收集的运行观测数据总称。 | Logs/Metrics/Traces。 | Telemetry 是手段，不是目标。 |
| Trace Context | 跨服务传播 Trace ID/Parent 等关联信息。 | 分布式链路追踪。 | 没有传播就难串完整链。 |
| Sampling | 只保留部分观测数据以控制成本。 | Trace 大流量。 | Sampling 不能把关键错误全部采掉。 |
| Structured Logging | 用稳定字段而不是纯自然语言记录日志。 | task_id、run_id、status。 | 便于查询与关联。 |
| SLI | Service Level Indicator，实际测量的服务指标。 | 成功率、延迟。 | SLI 是测量值。 |
| SLO | Service Level Objective，对 SLI 设定的目标范围。 | 99.9% 可用性、p95 延迟。 | SLO 是内部目标。 |
| SLA | Service Level Agreement，对外承诺的服务等级协议。 | 商业服务合同。 | SLA 往往比内部 SLO 更保守。 |
| Error Budget | 允许系统在 SLO 目标内消耗的失败额度。 | 平衡发布速度与可靠性。 | Budget 用完应收紧变更。 |
| p50 Latency | 50% 请求低于该延迟的中位数。 | 日常性能。 | 不能代表尾部用户体验。 |
| p95 Latency | 95% 请求低于该延迟。 | 高分位延迟。 | 比平均值更能看到慢请求。 |
| Tail Latency | 分布尾部少量最慢请求的延迟。 | Agent Tool/模型服务。 | 长链系统尾延迟会叠加。 |
| Critical Error Rate | 会导致安全、数据、严重业务失败的错误比例。 | 高风险 Agent。 | 应单独于普通失败率观察。 |
| Recovery Success Rate | 发生中断/未知后成功恢复到正确状态的比例。 | Durable Agent。 | 只看 Task Success 看不到恢复能力。 |
| Model Gateway | 统一接入多个模型 Provider、处理路由和治理的网关层。 | FAST/REASON、多模型。 | Gateway ≠ Model 本身。 |
| Router | 根据输入特征和 Policy 选择目标模型/Agent/Tool。 | 模型路由、Agent 路由。 | Router 需要可观测决策理由。 |
| Model Routing | 按任务、能力、成本、延迟选择模型。 | 小模型/大模型协作。 | 不是简单“越大越好”。 |
| Reasoning Routing | 按任务复杂度决定是否升级更高推理投入。 | FAST→THINK。 | 升级条件应通过 Eval 校准。 |
| Tool Routing | 根据意图和环境选择具体 Tool/Adapter。 | 多搜索 Provider。 | 先 Permission Filter 再路由。 |
| Agent Routing | 把 Task 分配给合适 Specialist/Worker。 | Multi-Agent。 | 路由错误会产生协调税。 |
| Escalation | 当前层能力不足或风险升高时升级到更强模型/人工/更严格流程。 | 小模型置信不足。 | Escalation 应有明确触发条件。 |
| Priority Queue | 按优先级而非单纯到达顺序调度工作。 | 多 Task Scheduler。 | 需要 Aging 防止低优先级饥饿。 |
| Concurrency Limit | 限制同一资源同时执行的任务数量。 | 模型服务、浏览器。 | 保护资源和稳定性。 |
| Admission Control | 在工作进入系统前判断当前是否有能力接收。 | 模型过载、队列保护。 | 比事后 Timeout 更主动。 |
| Backoff | 失败后逐步延长重试间隔。 | 网络/限流恢复。 | Backoff 不解决 UNKNOWN Effect。 |
| Resource Lock | 防止多个执行者同时修改同一资源的锁。 | 共享浏览器/文件。 | 锁要有 Owner/TTL。 |
| Mutual Exclusion | 保证某临界区同一时间只有一个执行者进入。 | 写共享 State。 | 互斥降低并发冲突但会影响吞吐。 |
| Aging | 等待越久逐步提升优先级的调度策略。 | Priority Queue。 | 防止 Starvation。 |
| Quota | 限制用户/租户/Provider 可使用的资源额度。 | Token、请求、成本。 | Quota ≠ Budget；Quota 常是更长期资源配额。 |
| Policy Version | 标识当前决策使用哪一版规则。 | 路由、安全、审批。 | 便于回放和解释行为变化。 |
| Decision Record | 记录关键架构/策略决策、原因和适用边界。 | 路由策略、平台边界。 | 不是每个小改动都需要重型记录。 |
| Cost per Success | 每成功完成一个目标平均付出的模型、工具和人工成本。 | 比较 Agent 方案。 | 比单纯 Token Cost 更接近业务价值。 |
| Operational Tax | 为了维护某种架构长期付出的额外运维、协调和治理成本。 | Multi-Agent、平台化。 | 功能收益必须覆盖长期税。 |
| AI Platform | 把模型、能力、运行、治理、评估等公共责任沉淀成可复用底座。 | 多个 AI 产品共享能力。 | Platform 不应吞掉产品领域真值。 |
| Agent Application | 围绕具体用户任务构建、以 Agent 为核心执行主体的应用。 | Research/Coding Agent 产品。 | Application ≠ Platform。 |
| Agent-Workflow Layer | 在模型能力上组织 Agent、Workflow、Task 和 Runtime 的应用运行层。 | 长期任务编排。 | 不等于模型基础设施。 |
| AI Feature | 普通产品中的一个 AI 功能点。 | 摘要、改写、分类。 | 并非所有 AI Feature 都需要 Agent。 |
| Capability Layer | 把可复用 Tool/服务抽象成稳定能力接口的层。 | RAG、Browser、Search。 | 能力层应保持 Provider 可替换。 |
| Infrastructure Layer | 提供 Compute、Storage、Network、Model Serving 等底层资源。 | 云、端侧模型。 | Infra 不拥有产品 Goal。 |
| Knowledge Layer | 负责 Knowledge/Retrieval/Context 等可复用知识能力。 | RAG Service。 | 不应夺取业务 Task State。 |
| Platform Host | 承载 Agent/Skill/Capability 的具体产品或运行宿主。 | Chat、IDE、服务端 Runtime。 | Host 是部署/产品边界。 |
| Platformization | 把多产品重复且稳定的能力收敛成平台公共能力。 | 共享模型网关、Eval。 | 没有复用证据时过早平台化会增加复杂度。 |
| Business Outcome | 用户/业务真正获得的结果。 | 任务完成、成本降低、收入提升。 | 模型分数只是中间指标。 |
| Cost Attribution | 把模型/工具/基础设施成本归因到具体 Task、Tenant 或 Capability。 | 生产成本治理。 | 没有归因就难优化 Cost per Success。 |
| Architecture by Evidence | 根据真实失败、负载和实验逐步升级架构。 | 从单 Agent 到 Multi-Agent。 | 避免凭想象提前加层。 |
| Architecture Fitness Function | 持续验证某个架构约束是否仍成立的自动检查。 | 依赖边界、性能、可靠性。 | 让架构原则可被回归。 |
| Maturity Path | 能力从实验、候选、试点到稳定生产的演进路径。 | Agent/Skill/模型发布。 | 不同阶段要求不同 Evidence。 |
| Minimum Viable AI System | 能用最小复杂度验证核心用户价值和关键风险的 AI 系统。 | 新产品 V0。 | 不是功能最少，而是验证闭环最小。 |
| Paved Road | 平台提供的一条默认、低摩擦、已验证的标准交付路径。 | 模型接入、Eval、Release。 | 允许例外，但例外要承担额外成本。 |
| Shared Contract | 多个产品共同依赖的稳定接口与语义。 | Capability/API。 | 共享实现可以换，Contract 要稳定。 |
| Shared Library | 复用代码包而不是独立服务的共享方式。 | Schema、SDK。 | 不必所有复用都平台服务化。 |
| Shared Service | 通过网络为多个产品提供公共能力的服务。 | RAG、Model Gateway。 | 服务化带来运维和网络成本。 |
| Vertical Agent | 围绕某个专业业务域构建的 Agent。 | 客服、代码、安全。 | 专业化应建立在真实领域数据/流程上。 |
| Adoption | 能力被真实产品/团队持续使用的程度。 | 平台价值。 | 做出来不等于被采用。 |
| Feedback Loop | 运行结果、用户反馈、Eval 反过来驱动下一轮系统改进的闭环。 | 持续优化。 | 反馈必须区分噪声、Evidence 和真实趋势。 |
| Release | 把经过验证的版本正式交付给目标环境/消费者。 | 模型/Prompt/代码/行为配置上线。 | Release ≠ Deploy 单一步骤。 |
| Deployment | 把可运行 Artifact 放到目标环境并启动。 | 服务上线。 | 部署成功仍需 Readback/Acceptance。 |
| Projection | 从正式真源派生出的阅读/分发形态。 | 网站、知识展示。 | Projection 不应反向成为第二真源。 |
| Canonical | 同一知识/资产问题当前正式承接的主版本。 | 旧文被新版替代。 | Canonical 可以演进，不等于永久冻结。 |
| Registry | 在确有机器查询需求时保存身份、状态或关系的结构化索引。 | Provider/Agent/Package Catalog。 | Registry 不自动是 Source of Truth。 |
| Source of Truth | 对某类 Current Truth 拥有最终解释权的正式来源。 | Git、Task Store、Runtime API。 | Reference/Cache 不等于真源。 |
| Fact Owner | 某类事实最早、最权威的归属边界。 | 文件内容看文件系统，Task 状态看 Task Store。 | 修问题先找 Owner，避免下游补丁。 |

## 这一层必须真正会区分

- **Eval ≠ Acceptance**：Eval 衡量一类系统质量，Acceptance 判断这次交付是否过 Gate。
- **Logs ≠ Metrics ≠ Trace**：离散记录、聚合趋势、完整链路分别回答不同问题。
- **Model Routing ≠ Reasoning Routing ≠ Agent Routing**：选择模型、推理投入、责任主体是三种路由。
- **AI Feature ≠ Agent Application ≠ AI Platform**：一个功能、完整 Agent 产品、公共复用底座的复杂度不同。
- **Deploy ≠ Release ≠ Business Outcome**：运行起来、正式交付、产生真实价值是三层。
