# 如何用好 AI

这个专题不按 Prompt、RAG、Agent、MCP 等技术名词组织，而按真实使用 AI 时会遇到的问题来组织。

目标很直接：让老板、产品、工程师都能从问题出发，知道 AI 该用在哪、怎么做好、怎么更快更省、怎么判断效果、上线后怎么管、怎么保证安全，以及怎么把一次成功沉淀成长期能力。

## 目录导航

- [01_AI到底应该用在哪](01_AI到底应该用在哪.md)：从研发主视角判断 AI 值得进入哪里、什么时候应该重做流程，以及从辅助走向连续执行后，任务为什么开始需要上下文、状态、验证、恢复、权限和 Harness。
- [02_怎么让AI真正把事情做好](02_怎么让AI真正把事情做好.md)：从研发主视角讲清 AI 为什么“能做但做不好”，以及怎样从任务与业务理解、上下文、输出合同、证据与反馈，一路判断到 Context、RAG、Tool、Memory、Workflow 和训练到底什么时候该出现。
- [03_怎么让AI更快更省](03_怎么让AI更快更省/README.md)：收敛成两篇。第一篇先诊断 AI / Agent 为什么会越来越慢、越来越贵；第二篇按工程手段做减法：确定性步骤优先程序化、CLI/脚本化，再进入结构索引与按需取数、Tool 边界治理、Context/Prompt/表示压缩、History/State/Memory 生命周期、Cache、输出预算和模型分工，并用 CodeGraph / `.codegraph`、RTK、Headroom、Repomix、Serena、Caveman、Mem0 等真实实现说明。
- [04_怎么知道AI到底好不好](04_怎么知道AI到底好不好/README.md)：收敛成两篇。第一篇讲模型到底怎么评：真实 Evaluation Run、公开 Benchmark、Internal Eval、核心指标、多个模型公平比较，以及 OpenAI、Anthropic、Stanford HELM、SWE-bench、Arena 等真实评测路线；第二篇讲 AI 系统到底怎么评：RAG、Agent、Internal Golden Set、Regression、Shadow / Canary / A-B、线上失败回灌和最终业务结果。
- [05_AI上线以后怎么管](05_AI上线以后怎么管/README.md)：收敛成三篇。第一篇讲 AI 上线以后怎么看得见问题：从单次 Trace / Span / Outcome 到整体质量、可靠性、成本和 Drift；第二篇把 Behavior Release、Token 暴涨 / Agent 卡死 / 死循环排查，以及 Retry / Recovery / Fallback / Rollback 串成完整故障链；第三篇讲怎么用 AI 反过来做质量抽检、异常发现、自动审计和运营分析。
- [06_怎么把AI变成长期能力](06_怎么把AI变成长期能力/README.md)：最终收束成四篇。第一篇把一次成功沿 Case / Template / CLI / Skill / Workflow / Agent / Shared Service 逐步资产化，并绑定 Contract、Owner、Version 和 Eval；第二篇从真实重复里长出 Model / Knowledge / Tool / Eval / Trace / Registry / Golden Path 等公共 Primitive；第三篇完整吸收原 06，把 Permission / Identity / Sensitive Data / Prompt Injection / Tool & Supply Chain / Blast Radius / Audit / Security Eval / Risk Tier 变成可复用的平台治理能力；第四篇把 Production Failure、Security Incident、Regression、Asset、Platform、Review / 协作方式和 Capability Map 连成持续变强的组织能力飞轮。

## 写作与审计标准：什么叫“接地气”

“接地气”不是故意口语化，而是读者看完以后，能把内容带回自己的工作里判断、行动和避坑。

- **先讲真实问题，不先讲概念。** 从“为什么会失败、为什么没提效、哪里卡住”开始，专业词只在解释解决办法时出现。
- **观点必须落到具体场景。** 不能只写抽象结论；关键判断要有真实正例、反例或完整推演。
- **必须解释为什么。** 不只说“应该怎么做”，还要说明问题为什么发生、方法为什么有效。
- **正例和反例都要有。** 既讲什么时候值得用，也讲什么时候不该用、什么时候条件不成熟。
- **必须算真实代价。** 除模型效果外，还要考虑 Review、返工、等待、系统接入、权限、维护和失败成本。
- **必须给判断方法。** 读完后要知道以后遇到类似问题该问什么、怎么判断，而不是只记住几个术语。
- **专业词必须服务于问题。** Prompt、RAG、Harness、Eval、Agent 等只能作为解决具体问题的机制，不能反过来主导叙事。
- **删掉不能指导行动的空话。** “AI 正在重塑业务”“积极拥抱智能化”这类话，如果不能继续落到判断和做法，就不写。
- **不站在行业观察者的位置训人。** 少写“很多团队都……”“企业往往……”“大家容易……”这类没有证据、又带评判感的泛化句；直接把问题、场景和判断条件摆出来。

每一节至少要回答四件事：**发生了什么问题、为什么会这样、怎么判断、具体怎么办。**

案例不是装饰，而是论证的一部分。好的案例应该尽量讲清：**原来怎么做 → 卡在哪里 → 为什么想到 AI → AI 实际解决了哪一步 → 哪一步没解决 → 最后业务有没有真的变好。**

最终验收标准：**做过真实项目的人看完会觉得“这就是我遇到的问题”；没做过的人看完，也知道以后遇到这种情况该怎么判断。**
