# 如何用 Eval 和降级治理 RAG 质量

RAG 质量最容易被一个漂亮回答掩盖。ProFlow RAG 没有把“最终文字看起来不错”当系统级证据，而是把 Retrieval、Evidence、Context、Citation、Contract 和 Runtime 分层验证，让一次退化可以定位到真正的 Owner（事实归属方）。

`Eval`（评测：用固定数据集和机械指标比较系统行为）在这个项目里不是最后才补的一张成绩单。它先抓到“离线已经验证的精确检索能力没有进入线上路径”，后来又参与推导 Evidence / Context 参数、判断 Reranker 是否适合默认开启，甚至反过来暴露评测器自己的排序和 SQL 错误。也就是说，评测本身参与了设计演进。

## 固定 Gold，先防止结果出来以后再改题

统一检索评测建立了 `p2-retrieval-v0` 13-case Gold Dataset（人工预先确认正确来源的固定评测集），包括 8 个自然语义题和 5 个精确工程题。每题绑定 immutable source provenance（不可变源码来源），因此不能在看到系统结果后偷偷换答案。

第一次统一 Eval 就抓到在线 Lexical 漏接 exact signal：此前已经验证 Exact Engineering Recall@10=`1.0`，但 online lexical 只有 `0.1538`。修复真实 read path 后，最终：

```text
lexical Recall@10 = 0.6923
vector  Recall@10 = 0.8462
Hybrid coverage@20 = 1.0000
RRF d20/k30 Recall@10 = 1.0000
RRF d20/k30 MRR = 0.6581
```

这比“换一个更强模型”更有价值，因为它发现的是**能力已经被证明，但没有真正进入产品执行路径**。

## 评测为什么从 Retrieval 继续扩到整条 Capability

检索层稳定后，同一套 Gold 又被用来推导 Evidence 与 Context 的最小充分参数 `9/2/25748`；随后 public HTTP query（公开查询接口）进入统一 Capability Eval，同时观察 Retrieval、Evidence、Context、Citation、Snapshot / Contract、No Evidence、degradation 和 latency（延迟）。

历史正式 Gate 中 13/13 public query 完成，Evidence case hit/full Gold=`100%`，Context case hit/full Gold=`100%`，Citation correctness=`100%`，Snapshot / Contract consistency=`100%`。旧 Mac 当时 API total observed baseline 为 p50=`1800.29ms`、p95=`11504.95ms`。

这些数字只代表那台机器与当时版本的机械基线，不是产品 SLO（Service Level Objective，服务等级目标）。保留这条边界，是为了防止一次历史机器测量被包装成长期性能承诺。

## Degradation 为什么不能把错误事实伪装成可用

项目在多次 Runtime 故障中逐渐把失败分成两类：

- 暂时可用性问题：Embedding timeout / unavailable，可以 lexical-only 继续，并明确记录 degradation（降级）；Reranker 异常可以完整回退 RRF。
- 一致性问题：Embedding model / profile / dimension / normalization mismatch、Snapshot identity 冲突等，必须 fail closed（失败即停止）。

原因很直接：少一路检索可能降低质量，但错误向量空间会让系统“看起来正常返回”，却把知识污染藏起来。可用性可以降级，事实身份不能降级。

## Reranker 的默认策略为什么被持续负载改变

单个案例曾证明 BGE reranker（重排序模型）能纠正一个明显 RRF 噪声；如果只看这个案例，很容易宣布“加 reranker 提升质量”。随后把它放到 13-case 持续 workload（连续负载）后，15 秒 ceiling 内 13/13 timeout，全部走 RRF fallback，最终质量指标与原 RRF 完全一致。

于是结论不是“reranker 无用”，而是：**在当前硬件上默认关闭，但保留能力和失败回退。** 这是 Eval 把“模型有能力”与“产品应默认开启”分开的典型过程。

## 验证器自己出错时为什么不能顺手改业务

一次知识构建 Eval 曾因 PostgreSQL text ordering 与 JavaScript `localeCompare` canonical ordering（规范排序）不同而重算 chunk-set hash 假失败；后续 capability benchmark（能力基准测试）也曾写错 Snapshot join，误用不存在的字段。

两次都没有为了让测试变绿改业务数据，而是回到真正的 canonical identity（规范身份）和 repository 链修 Eval adapter。这个过程留下了一个重要判断：**Eval 也是软件，它有自己的输入假设、排序规则、SQL 和 Harness failure domain。** 一个红灯首先说明“观察到不一致”，不自动证明被测系统一定错。

## 最终要形成的是可解释的回归系统

一个好的 RAG Eval 应该让维护者回答：

```text
Source / Corpus 变了吗？
Retrieval 召回掉了吗？
Evidence selection 漏了吗？
Context budget 截掉关键证据了吗？
Citation 漂了吗？
Runtime 只是降级，还是 identity 已不可信？
```

只有这些问题可以分层回答，后续调模型、参数、索引或运行时才知道提升来自哪里，退化又发生在哪一层。这个能力不是一次性“测个分数”，而是经过线上缺口、参数选择、模型负载和验证器误报逐步长成的回归系统。
