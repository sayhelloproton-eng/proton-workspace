# 怎样计算 Agent 的真实成本

> 唯一职责：解释 Capability、Cost、Latency、Reliability、Model Tier、Tool Calls 与 Human Intervention 的联合决策。

## 最强模型不一定产生最低的完成成本

如果一个便宜模型每次只花强模型的十分之一，但经常失败、触发两次重试、再让人工修复，它可能比“一次成功”的强模型更贵。反过来，让最强模型处理所有简单分类，也会浪费延迟和算力。生产系统真正要比较的是：**完成一个有用、可靠 Outcome，到底付出了多少总成本和等待。**

#### 本节新词

- **Agent Economics（Agent 经济性）**：把质量、成本、延迟、可靠性、Tool 调用和人工负担放到同一决策框架中，判断某条 Agent 路径是否值得。
- **Cost per Success（每次成功成本）**：模型、Tool、基础设施、Retry、Fallback 和人工总成本除以真正成功的任务数。它比 cost per call 更接近业务真实成本。
- **Useful Outcome（有效结果）**：既满足用户/业务目标，又达到最低质量和可靠性要求的 Outcome；低质量“完成”不能算作节省成本。

生产 Agent 不是能力越强越好，而是要降低 Cost per Success（每次成功完成任务的成本）：把一次任务可能发生的模型调用、工具执行、重试和人工接管成本加总，再除以真正成功的任务数。它要求联合优化：

```text
Value = Outcome quality × reliability × business value
        - model/tool/infrastructure cost
        - latency penalty
        - human intervention
        - critical failure risk
```

便宜但频繁失败不便宜；能力最强但延迟不可接受也不可用。Agent Economics 研究的是完成一个可靠 Outcome 的总成本。

## 用 Useful Outcome 衡量整条执行链

```text
Useful Outcome
───────────────
Cost × Latency × Failure Risk × Human Load
```

Agent Economics 不是“省 Token”，而是**为每个任务分配刚好够用的模型、工具、并发和人工介入预算**。更强模型、更长推理和更多 Agent 都可能提高单次能力，同时恶化延迟、成本和故障面。

## 成本不只有 Token

#### 本节新词

- **Token Cost（Token 成本）**：模型输入、输出和部分推理计算按 Token 计费或消耗的成本，只是 Agent 总成本的一部分。
- **Infrastructure Cost（基础设施成本）**：Sandbox、计算、存储、队列、网络和自托管资源带来的运行成本。
- **Failure Cost（失败成本）**：错误执行、业务损失、返工、人工修复和重复调用产生的额外代价。


- model input/output/reasoning tokens；
- Tool/API/搜索/浏览器费用；
- Sandbox、计算、存储、队列和网络；
- 重试、Fallback、重复检索；
- 人工审批、纠错和客服；
- 失败造成的业务损失；
- 工程维护、评测和治理成本。

应计算 cost per successful task，而不是 cost per call。

## Latency 结构

#### 本节新词

- **Latency（延迟）**：从任务进入系统到用户获得可用结果所经历的时间。本章关注端到端 Task latency，而不是只看模型生成时间。
- **Time to First Token（首 Token 时间，TTFT）**：模型开始生成第一个输出 Token 前的等待时间，是交互体验的一部分，但不能代表整条 Agent 链延迟。
- **p50 / p95 Latency（50/95 分位延迟）**：分别描述一半请求和 95% 请求在多长时间内完成，用来观察典型与尾部延迟。
- **Tail Latency（尾延迟）**：少量特别慢任务形成的延迟尾部，多轮 Tool/Agent 链尤其容易被它放大。


```text
queue wait
+ model time to first token / completion
+ tool and environment latency
+ sequential turns
+ approval wait
+ recovery / retry
= end-to-end task latency
```

Agent 的多轮调用会放大尾延迟。并行只能压缩独立阶段，不能绕过依赖和互斥资源。

## Reliability

#### 本节新词

- **Reliability（可靠性）**：系统在目标条件和任务分布下持续产生正确结果的能力。它关注重复成功，而不是一次 Demo。
- **Critical Error Rate（关键错误率）**：会造成严重业务或安全后果的失败比例，通常需要比普通错误更高权重。
- **Recovery Success Rate（恢复成功率）**：任务进入超时、失败或 UNKNOWN 后能够安全恢复并达到正确状态的比例。


单步成功率在长链中相乘。即使每步 95% 成功，十个强依赖步骤的整链成功率也会明显下降。可靠性还包括：关键错误率、重复副作用率、恢复成功率、数据新鲜度和人工接管质量。

减少步骤、增强机械验证、限制动作空间，有时比换更强模型更有效。

## 模型档位和推理预算怎样进入成本账

Reasoning 章已经定义 Reasoning Budget，Routing 章已经定义 FAST / REASON、Fallback 和模型选择。本章不再重讲这些机制，只问一个经济问题：**多花的推理和切换成本，是否换来了更高的真实完成率？**

比较时要按真实任务切片，而不是只看总体平均分：

- FAST 路径便宜，但失败后升级会产生额外调用与等待；
- REASON 路径更贵，只有在对应任务切片稳定提高成功率时才值得；
- 小模型做分类/路由未必比规则更划算；
- 高 reasoning effort 只有带来测得增益才值得；
- Fallback 要计入额外延迟、二次调用以及可能变化的行为分布。

不要把模型排行榜当成本模型。真实价格、上下文、缓存、调用次数和失败率共同决定成本。

## Tool Calls 与 Agent Loop 税

#### 本节新词

- **Tool Call（工具调用）**：一次调用外部能力的动作。每增加一次 Tool Call 都增加延迟、失败点和权限面。
- **Agent Loop Tax（Agent 循环税）**：开放 Agent Loop 为重新规划、重复检索、额外模型调用和中间输出付出的新增成本。它必须由更高成功率或更少人工来偿还。
- **Cache（缓存）**：保存可复用计算或检索结果以减少重复成本。缓存必须绑定版本、权限和 Freshness，否则省钱会换来旧事实。


每个 Tool Call 增加延迟、失败点、权限面和观测成本。开放 Loop 还可能重复搜索、来回改计划和产生无用中间输出。

优化顺序：删掉无增益步骤；用确定性代码合并可预测处理；缓存稳定结果；并行独立查询；只在需要新判断时再次调用模型。

## Human Intervention

#### 本节新词

- **Human Intervention（人工介入）**：人在 Agent 流程中进行审批、复核、接管或修复的工作时间。它既是成本，也可能是高风险路径正确的治理设计。
- **Planned Review（计划内复核）**：产品主动安排的人类审核，例如高风险审批；它不同于系统失败后的 Repair Work。
- **Supervision Burden（看守负担）**：用户需要持续盯着系统、频繁纠偏才能完成任务的隐性成本。


人工不是失败指标本身。高风险审批可能是正确产品设计。需要区分：

- planned review：刻意的人在环；
- exception handling：Agent 无法安全继续；
- repair work：系统错误导致返工；
- supervision burden：用户必须持续看守。

目标不是零人工，而是把人工放在高价值判断和异常上。

## Capability / Cost / Latency / Reliability Frontier

#### 本节新词

- **Pareto Frontier（帕累托前沿）**：一组无法在不牺牲其他维度的情况下继续改善某一维的方案集合。这里用于比较 Capability、Cost、Latency 和 Reliability 的取舍。
- **Capability / Cost / Latency / Reliability Frontier（能力—成本—延迟—可靠性前沿）**：把不同 Agent/模型配置放到多目标空间比较，避免寻找一个不存在的“全局最佳模型”。


不存在一个配置在所有维度最优。系统应寻找 Pareto frontier：无法在不牺牲另一维的情况下继续改善。不同任务使用不同 Policy，而不是全局固定“最佳模型”。

## Multi-Agent Economics

#### 本节新词

- **Multi-Agent Economics（多 Agent 经济性）**：计算多主体协作带来的并行/专业化收益，是否超过 Context、消息、整合、冲突和协调成本。
- **Wall-clock Time（墙钟时间）**：从真实时钟看任务经历的总时间。并行可以降低墙钟时间，但不会自动降低总计算量。


多 Agent 可能降低墙钟时间、提供独立评审或专业化；也会增加 Context、消息、整合、冲突和重复调用。必须与单 Agent/Workflow 基线比较增量，而不是只展示并行过程。

## Build vs Buy / Platform Economics

#### 本节新词

- **Build vs Buy（自建还是采购）**：比较自己建设能力与使用外部产品/服务的总体成本、控制权和维护责任。
- **Platform Economics（平台经济性）**：多个产品共享 Gateway、Runtime、Eval、Permission 等共性责任后，是否真正摊薄建设和治理成本。
- **Operational Tax（运营税）**：平台本身的升级、迁移、值守、兼容和治理成本；平台复用收益必须覆盖这部分税。


平台化只有在共性责任重复出现时摊薄成本。过早平台会增加抽象、迁移和运营税；过晚则让每个产品重复建设 Gateway、Eval、Permission 和 Runtime。

判断输入包括产品数量、团队数量、差异率、失败成本、合规要求和共性能力变化频率。

## 关键指标

```text
task success rate
critical error rate
cost per successful outcome
p50 / p95 end-to-end latency
tool calls and model turns per task
retry / fallback rate
human minutes per task
recovery success rate
value or revenue per task
```

不要只优化平均值；高价值任务与高风险 Slice 应有不同权重。

## 成本优化为什么常常伤害完成率

- 用便宜模型，但失败后两次重试和人工修复；
- 用最强模型处理所有简单分类；
- 并行十个 Agent，只为最后丢弃九份结果；
- 缓存没有版本和权限边界，省钱却返回过期事实；
- 只量 Token，不量 Tool、等待和人工；
- 为降延迟跳过 Evidence，最终增加错误成本。

## 用 Cost per Success 做取舍

先定义 Outcome 与风险，再建立简单基线；按真实 Slice 测量质量、延迟、成本和人工；只对瓶颈增加更强模型、Reasoning、并行、缓存或平台能力；每次升级用回归 Eval 验证总价值。

## 经济性信号怎样反馈给路由与平台

- Eval 提供质量与可靠性证据；本章判断值不值；
- Routing 把 Economics 变成运行时 Policy；
- Agent Explosion 用这些指标判断 Multi-Agent 增量；
- Platformization 用总成本和复用收益判断共性责任是否值得抽取。

## 检查便宜是否真的更划算

1. 为什么 cost per call 不等于 cost per successful task？
2. Agent 的端到端延迟由哪些部分组成？
3. 人工介入什么时候是正确设计，什么时候是系统缺陷？
4. Multi-Agent 需要和什么基线比较经济性？

## 学习导航

[← 上一章](04_怎样证明Agent真的完成了任务.md) · [新版目录](../README.md) · [下一章 →](../07_AI平台与产品/01_AI平台到底共享什么.md)
