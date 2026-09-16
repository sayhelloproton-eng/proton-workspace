# 04 怎么知道 AI 到底好不好

这个目录只保留两篇正文，边界很清楚：**第一篇评模型本身，第二篇评真实 AI 系统。**

1. [01_模型到底怎么评.md](01_模型到底怎么评.md) —— 从一次真实 Evaluation Run 开始，讲公开 Benchmark、内部真实任务、Evaluation Protocol、Accuracy / F1 / Exact Match / pass@k / Resolution Rate / Win Rate / Calibration 等指标、多个模型公平比较，以及 OpenAI、Anthropic、Stanford HELM、SWE-bench、LM Evaluation Harness、Arena 等真实评测路线。
2. [02_AI系统到底怎么评.md](02_AI系统到底怎么评.md) —— 模型能力过线以后，继续评 RAG、Agent 和完整业务系统：Retrieval / Generation、Outcome、Trajectory、Side Effect、Reliability、Internal Golden Set、Regression、CI、Shadow / Canary / A-B、线上失败回灌和最终业务结果。

阅读顺序：**先回答“哪个模型更适合我”，再回答“用这个模型搭出来的系统在真实业务里到底能不能稳定工作”。**
