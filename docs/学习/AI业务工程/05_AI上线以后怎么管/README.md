# 05 AI 上线以后怎么管

AI 进入真实业务以后，管理重点会从“能不能做出来”变成三个生产问题：**看不看得见、控不控得住、能不能形成治理闭环。**

这个目录收成三篇：

1. [01_AI上线以后怎么看得见问题.md](01_AI上线以后怎么看得见问题.md) —— 从单次 Trace 到整体 Drift：怎么还原一次任务，怎么监控质量、可靠性、成本和行为变化，怎么把异常绑定到具体版本和业务结果。
2. [02_AI线上问题怎么排查恢复和管住变更.md](02_AI线上问题怎么排查恢复和管住变更.md) —— 把 Model / Prompt / Knowledge / Tool / Workflow 作为完整 Behavior Release 管理；再讲 Token 暴涨、Agent 卡死、死循环怎么排查，以及 Retry、Fallback、Checkpoint、Idempotency、Circuit Breaker、Rollback、Human Handoff 怎么恢复。
3. [03_怎么用AI反过来治理质量和业务.md](03_怎么用AI反过来治理质量和业务.md) —— 用 AI 做线上质量抽检、失败聚类、Incident Triage、越权审计、用户反馈归类、知识缺口和流程瓶颈分析，但保留规则、统计、证据引用和人工 Gate。

阅读顺序：**先让线上 AI 可见，再让变更和故障可控，最后才让 AI 反过来帮助治理质量和业务。**
