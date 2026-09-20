# 怎样证明 Agent 做对了，而且值得这么做

Agent 可以完整打印出每一次模型调用、Tool Call 和日志，仍然可能没有完成用户目标；也可能最后产物正确，但过程靠一次危险的越权动作碰巧成功。可靠评估因此不能只问“最终答案像不像”，而要分开四件事：**发生了什么、哪些事实支持结论、系统按什么标准做得好不好、最终 Outcome 是否真的有价值。**

再向前一步，生产系统还必须回答：为了这个 Outcome 付出的延迟、模型调用、工具成本和人工是不是值得。

## Observability、Evidence、Evaluation、Outcome 不是同一层

Observability（可观测性）通过 Log、Trace、Metric 告诉我们系统发生了什么。

Evidence（证据）是能够重新检查、支持某个 Claim 的事实材料。

Evaluation / Eval（评估）使用 Criterion 或 Rubric 判断结果做得好不好。

Outcome（业务结果）是用户最终真正需要发生的结果。

~~~text
Trace / Log
→ what happened

Evidence
→ what can be verified

Eval
→ was it good enough

Outcome
→ did the real goal succeed
~~~

Trace 很完整，不代表路径正确；Artifact 存在，不代表业务已经生效；模型自评“完成”更不是证据。

## Trace 应该能把一次 Task 的关键对象串起来

一个有用的 Trace Model（轨迹数据模型）至少能够关联：

~~~text
task_id
→ attempt / trial
→ model invocation
→ tool call
→ observation
→ state transition
→ artifact / effect
→ evaluation
~~~

还应该能回到 model / version、context references、tool inputs、latency、usage、errors、policy decision 和 state version。

敏感 Context 不一定全文记录，可以保存受控引用，但不能让调试只剩一堆互相无法关联的日志行。

## Agent Eval 至少有四个层级

### Task / Final Answer Eval

判断任务要求是否被理解并完成，回答是否准确、完整、格式正确。

它适合问答、抽取、总结，但不足以评估真实外部 Effect。

### Trajectory Eval

Trajectory（执行路径）关注 Agent 怎样做：

- Tool 是否选对；
- 是否重复无效搜索；
- 是否越权；
- 是否基于错误 Evidence 继续；
- 是否在应当停止时停止；
- 是否产生不必要模型轮次。

一个好结果可能来自坏路径的侥幸，因此 Trajectory 仍值得评。

### Artifact Eval

检查代码、文档、计划、Build 等正式产物：结构、内容、Scope、Version、测试结果。

Artifact 存在只证明“有产物”，不证明它已进入真实环境。

### Outcome / Effect Eval

回读现实世界：部署是否真的更新、数据库状态是否正确、用户问题是否解决、业务成功标准是否满足。

Effect 是现实变化，Outcome 是这些变化是否真正满足 Goal。

这通常是最强一层。

## Evidence 必须绑定 Claim、版本和来源

一条成熟 Evidence 记录至少知道：

~~~text
claim / criterion
source / observation
version / timestamp
actor / tool
artifact / effect reference
validation method
~~~

一张截图只能证明截图范围内看到了什么；一个 Test 只能证明它覆盖的行为；一个 Git SHA 只能定位版本。

证据强度必须和 Claim 对齐，不能向上越级。

## Deterministic Grader 优先处理可机械判断的问题

Grader（评估器）可以是：

- exact match / schema rule；
- unit / integration test；
- compiler / type checker；
- environment readback；
- human review；
- LLM-as-a-Judge。

能用程序确定判断的内容，不应该优先交给 LLM Judge。

LLM Judge 更适合开放语义质量，例如解释是否清楚、方案是否覆盖关键因素。使用时需要 Rubric、人工校准和不确定区间，因为 Judge 本身也有偏差。

## 单次 PASS 不能证明概率系统可靠

模型和 Agent 存在随机性、环境漂移和长尾输入。代表性任务应该重复 Trial（独立试验轮次），看成功率、关键错误和方差。

固定 Seed 可以帮助复现部分行为，但不能消除线上输入和外部系统变化。

可靠性是重复成功能力，不是一张 Demo 截图。

## Golden Set 是回归基线，不是只放漂亮样例

Golden Set（黄金样本集）应该来自真实任务，包含：

- 常见成功场景；
- 历史失败；
- 边界输入；
- 高风险 Case；
- 长 Context；
- Tool / Environment Failure；
- 应该拒答或升级的样本。

模型、Prompt、Tool、Runtime 或 Policy 改动后跑 Regression Eval，比较结果是否退化。

## Failure Slice 比平均分更能指导架构

总体 95 分可能掩盖“生产删除”这一 Slice 只有 60 分。

Failure Slice（失败切片）可以按：

- domain；
- language；
- risk；
- context length；
- tool；
- environment；
- failure type；
- model / route。

架构调整应该针对稳定 Slice，而不是因为一个平均分不够就换更强模型。

## Failure Taxonomy 防止所有问题都被归到“模型不够强”

一次失败可能属于：

~~~text
model understanding / reasoning
retrieval / evidence
context assembly
tool selection / parameters
permission / policy
environment observation
runtime / recovery
coordination / handoff
evaluator defect
~~~

如果 Harness 自己构造了非法输入，20/20 全红也不能判模型失败。

端侧模型曾真实遇到这种情况：能力门禁的 Harness 在请求到达模型前就因 $ref 结构错误被拒绝。修复 Harness 后模型才真正被测。这类案例说明 Eval 系统自身也必须先被验证。详见 [端侧模型](../工程工具与运行时/端侧模型.md)。

## Offline Eval 和 Online Eval 各自解决什么

Offline Eval（离线评估）在固定数据和可复现环境中运行，适合开发对比和回归。

Online Eval（在线评估）面对真实流量和真实环境，能暴露分布变化、真实用户行为和系统故障。

上线前可以使用：

~~~text
Offline
→ Shadow
→ Canary
→ gradual expansion
~~~

Shadow（影子运行）接真实输入但不影响正式结果；Canary（金丝雀）只让小部分低风险流量进入新方案。

高风险副作用不能为了收集数据无边界在线实验。

## ProFlow 的 Evidence Ladder 为什么重要

ProFlow 长期区分：

~~~text
design / candidate
< package test
< materialized runtime / extension
< real Chrome / ChatGPT journey
< phase gate / repeated outcome
~~~

前一层通过只证明自己那一层责任，不能向上冒充 READY。

Package Test PASS 不等于真实 Browser Journey PASS；Extension 已构建不等于用户旅程已经成功。

这是一条比“测试覆盖率多少”更重要的证据纪律。

## 做对以后，还要问“值不值”

Agent Economics（智能体经济性）把 Capability、Cost、Latency、Reliability 和 Human Load 放在同一张账里。

一个便宜模型如果经常失败、触发两次 Retry 再让人工修复，可能比一次成功的强模型更贵。

因此真正要看的是 Cost per Successful Outcome（每个成功结果的总成本），而不是 Cost per Call。

## Agent 的总成本不只有 Token

至少包括：

- model input / output / reasoning cost；
- Tool / Search / Browser / API cost；
- infrastructure；
- queue / storage / network；
- retry / fallback；
- human approval；
- repair work；
- supervision burden；
- evaluation / governance / maintenance；
- critical failure cost。

只优化 Token 价格，很容易把成本转移到人工和失败上。

## 延迟应该按 Task 端到端计算

End-to-end latency 包含：

~~~text
queue wait
+ model TTFT / completion
+ tool / environment latency
+ sequential turns
+ approval wait
+ recovery / retry
~~~

Agent 多轮调用会放大 Tail Latency。平均模型调用 2 秒，不代表 Task p95 也快。

因此应该记录 p50 / p95，而不是只报一条最好看的单次耗时。

## Reliability 在长链里会相乘

如果每个强依赖步骤成功率都是 95%，十个步骤串起来的整链可靠性会明显下降。

因此提高 Outcome Reliability 的方法不只是换更强模型，还包括：

- 删除无必要步骤；
- 把确定逻辑下沉代码；
- 加机械 Validator；
- 缩小 Tool Surface；
- 改善 Context；
- 让失败可恢复；
- 减少长串顺序依赖。

## Agent Loop 也有“循环税”

每多一次 Tool Call / Model Turn 都会增加：

- latency；
- failure point；
- context growth；
- permission surface；
- observability cost。

开放 Loop 只有在重新规划真的提升成功率时才值得。

优化顺序常常是：

~~~text
remove useless step
→ deterministic code for predictable work
→ cache stable result
→ parallelize independent work
→ invoke model only when new judgment is needed
~~~

## Human Intervention 不是越少越好

要区分：

- Planned Review：设计上就需要人审批；
- Exception Handling：系统遇到无法安全继续的异常；
- Repair Work：系统错误导致人工返工；
- Supervision Burden：用户必须一直盯着系统才能不出错。

高风险 Approval 是正确治理，不应该和“Agent 失败需要人救火”混成一个指标。

真正目标是把人工放在高价值判断和风险节点，而不是追求零人工。

## 没有一个配置在质量、成本、延迟、可靠性上全部最优

可以用 Pareto Frontier（帕累托前沿）理解：有些方案更便宜，有些更快，有些更可靠，但不存在全局冠军。

不同 Task Slice 应使用不同 Policy：

~~~text
low-risk classification
→ small / fast model

complex planning
→ reason model

high-risk effect
→ stronger validation + approval
~~~

这也是 Routing 存在的经济学理由。

## Multi-Agent 也必须交经济学作业

多 Agent 可能降低 Wall-clock Time、提高专业化和独立评审，但会增加 Context、Communication、Merge、Conflict、Review 成本。

所以必须和单 Agent / bounded Subagent 基线比较：

~~~text
task success delta
critical error delta
wall-clock delta
total cost delta
human intervention delta
coordination failures
recovery quality
~~~

“看起来像团队”不是 Outcome。

## Platform 也有自己的运营税

共享 Gateway、Runtime、Eval、Permission 可以摊薄多个产品成本，但平台本身会产生版本、迁移、SLO、值守、兼容和治理成本。

Platform Economics 的问题是：

> 多个产品获得的复用收益，是否长期大于这层公共能力的 Operational Tax。

没有真实消费者的平台，调用量再大也不证明价值。

## Eval 应该反过来决定架构，而不是只给模型打分

真正成熟的 Eval 会回答：

- Agent 是否真的比 Workflow 好；
- Multi-Agent 是否有增量；
- RAG 是否比简单检索更好；
- Small Model 是否值得承接流量；
- Platform 是否让多个产品更快更安全；
- 某个 Harness 改动是否真正改善 Outcome。

没有 Baseline 和 Counterfactual，复杂系统只能证明“能运行”，无法证明“值得”。

## 一套完整 Agent Eval 最终要闭合到 Outcome 与 Economics

完整评估不能停在 Final Answer。

第一层通过 Trace / Observability 还原过程；第二层让 Evidence 绑定具体 Claim；第三层把 Eval 分成 Task / Answer、Trajectory、Artifact、Outcome / Effect；第四层用重复 Trial、Golden Set 和 Failure Slice 判断稳定性；最后再把 success rate、critical error、p95 latency、Cost per Successful Outcome 和 Human Intervention 放到一起，判断这套架构是否真的值得。

这也解释了为什么 Eval 不只是“模型评测”：

> **它最终是架构反馈系统。**

下一篇会把这套反馈放回产品层：**什么时候一个 AI 能力已经组成真正产品，什么时候多个产品反复出现的责任才值得被抽成平台。**
