# 07｜P6 RAG Quality Eval

状态：Final Acceptance PASS；P6 已正式结项

## P6 解决什么

P2 已测 Retrieval，P3 已测 Evidence/Context，P5 已验证 Citation，但这些还是局部门。P6 把它们收敛成一个 RAG Capability 级 EvalRun：同一批固定 Gold 同时观察 Retrieval、Evidence、Context、Citation、Snapshot/Contract、No Evidence、degradation 与 API latency。

## 为什么不评“答案好不好”

`proflow-rag` 是 headless RAG Capability Service，不拥有 Generation。P6 只评它真正拥有的事实链，避免外部模型文字“听起来不错”掩盖 Retrieval 或 provenance 缺陷。Generation grounding 属于 ChatWeb 自己的 Eval。

## Dataset 为什么继续复用 13-case Gold

`p6-rag-capability-v0` 复用已经人工确认且绑定 immutable source commit 的 P2 13-case Gold，不根据 P6 输出事后改题提分。这样跨 P2→P3→P6 的指标才可比较。

## 真实系统级结果

正式 `verify:p6` 中，13/13 public HTTP query 全部完成；Evidence case hit/full Gold=100%，Context case hit/full Gold=100%，Citation correctness=100%，Snapshot/Contract consistency=100%，structural NO_EVIDENCE PASS，DB read-only，reranker 仍默认 OFF。

旧 Mac Formal Gate 的 API total observed baseline 为 p50=1800.29ms、p95=11504.95ms、max=11504.95ms。它是 mechanical baseline，不是产品 SLO；P7/P8 用同一口径继续测 integration/runtime overhead。

## 一个真实的 Eval Adapter 错误

第一次 targeted Eval 报 `ib.repository_snapshot_id does not exist`。这不是 RAG 质量回归，而是 benchmark 自己写错 Snapshot join。读取正式 repository 后确认权威链：`knowledge_snapshots → index_builds → chunk_builds → corpus_manifests → repository_snapshots`。

修复只影响 Eval adapter，因此没有重跑已经 PASS 的所有层，而只做 syntax + affected benchmark 复验，最后由唯一 `verify:p6` 给系统级证明。这是 “Reverify the Blast Radius, Not the Universe” 的真实案例。

## P6 最终心智

Eval 的目的不是制造一个总分，而是让一次 RAG execution 的每一层都能独立失败、独立解释、跨版本回归。只有这样，后续调 Retrieval、Context 或 Runtime 时，才知道提升来自哪里、退化发生在哪一层。
