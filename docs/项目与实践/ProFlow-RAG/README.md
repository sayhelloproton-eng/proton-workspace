# ProFlow RAG 工程实战记录

这个目录专门记录 `proflow-rag` 从设计到上线的真实实现过程，面向复盘、学习和面试，不承担产品 Spec 的权威职责。

**这里的主角是“怎么实现出来”，不是“怎么验收通过”。** 每篇正文优先保留当时的问题、实现顺序、代码/数据演进、失败与修复、实验如何改变设计；Gate / commit / Final Acceptance 只放在阶段尾部作为结果证据，不能代替实现过程。

## 它记录什么

- 每个阶段为什么这样设计，以及当时有哪些替代方案。
- 实际实现步骤、关键代码边界和验证方法。
- 遇到的真实问题、错误现象、根因、排查过程和修复。
- Chunk、Embedding、Retrieval、Rerank、Evidence、Context、Citation、Eval 等实验数据。
- 架构发生调整时，为什么调整、付出了什么代价、如何验证新方案。
- 最终可用于简历、项目介绍和面试追问的工程事实。

## 它不是什么

- 不是 `proflow-rag/docs/specs` 的复制品。
- 不是 `proflow-rag/docs/context` 的接力状态或 Gate 证据归档。
- 不是只写“最终正确方案”的成果汇报。
- 不是把实现流水账原样堆进文档。
- 不把未验证猜测写成项目事实。

## 当前产品边界

2026-09-06 的 ADR-012 已把 ChatWeb 拆成独立公开产品。`proflow-rag` 当前定位为 headless RAG Capability Service，只负责 Knowledge / Retrieval / Evidence / Context / Citation / Eval / Runtime；Conversation、Generation、Streaming、Tool/MCP/Agent 与 Public Chat UI 属于独立 `chatweb`。

## 主线

`00 项目起点 → 01 P0 工程骨架 → 02 P1 Knowledge → 03 P2 Retrieval → P3 Evidence/Context → P4 RAG Capability API → P5 Citation/Provenance → P6 RAG Eval → P7 ChatWeb Integration → P8 RAG Runtime → V0 Release → Post-V0 Consolidation / Maintenance`

每个阶段结束前，必须更新对应实战记录以及问题、决策、实验、面试索引。

## 阶段记录

- `01_P0_工程与SDD执行骨架.md`：工程承载体、真实工具链问题与 P0 Verification。
- `02_P1_Knowledge_Management知识构建.md`：从 source authority 到 ACTIVE KnowledgeSnapshot 的完整知识构建全过程。
- `03_P2_Retrieval查询检索.md`：Query Orchestration 重基线、snapshot-bound lexical/vector read path，以及 Hybrid/RRF/Rerank/Eval。
- `04_P3_Evidence_Context证据与上下文.md`：从 ranked candidates 到 EvidenceSet / ContextBundle 的模型、选择、预算、No Evidence 与 Eval。
- `05_P4_RAG_Capability_API.md`：把冻结 RAG pipeline 产品化为独立 wire contract / HTTP API，并验证 consumer 权限与错误边界。
- `06_P5_Citation_Provenance.md`：把 selected Evidence 单向投影为 immutable GitHub Citation / Provenance，并验证 snapshot/content/source identity。
- `07_P6_RAG_Quality_Eval.md`：把 Retrieval / Evidence / Context / Citation / Snapshot / Contract / latency 合成系统级 RAG Capability Eval。
- `08_P7_ChatWeb_Integration.md`：用独立 ChatWeb consumer 真实验证 public RAG contract、failure policy、paired latency 与跨仓 ownership。
- `09_P8_RAG_Runtime_Operations.md`：仓库 owner API lifecycle、readiness、内部 system status、degradation 与 Runtime Gate。
- `10_V0_RAG_Capability_Release.md`：正式 Knowledge rebuild operator、Fresh Quick Start、Release Gate、跨仓总验收与 V0 closeout。

## 当前沉淀覆盖状态

- P0：已结项，工程骨架与执行机制已完整记录。
- P1：Final Acceptance PASS，Knowledge Management 从 source authority 到 ACTIVE Snapshot 已完整记录。
- P2：Final Acceptance PASS，Retrieval 从 snapshot-bound read path 到 Hybrid / RRF / Rerank / Eval / Closeout 已完整记录。
- P3：Final Acceptance PASS；Evidence / Context 从 Rebaseline、Selection、Context Building、No Evidence / Degradation 到固定 Gold Eval 与 Stage Closeout 已完整记录。
- P4：Final Acceptance PASS，RAG Capability API 已正式 closeout。
- P5：Final Acceptance PASS；CitationDescriptor / immutable permalink / real HTTP provenance 已完整记录并正式结项。
- P6：Final Acceptance PASS；13-case public HTTP RAG Capability Eval、分层质量与 latency baseline 已完整记录并正式结项。
- P7：Final Acceptance PASS；ChatWeb adapter / real cross-repo E2E / ownership boundary 已正式结项。
- P8：Final Acceptance PASS；API lifecycle / public readiness / system status / failure semantics / P6 regression 与吞吐量化样本已正式结项。
- V0：Final Acceptance PASS；正式 rebuild operator、Knowledge/Retrieval/Citation/RAG Eval/Runtime/ChatWeb consumer 与 real E2E 已完整通过；Post-V0 又补齐 live-surface cleanup、DB schema consolidation、正式 rollback operator、Service Guide 与 Maintenance Mode，完整记录从 source authority 到长期 service maintenance 的实现过程。
- `90` 只收录值得长期复用的问题与排障，不把一次性命令/脚本笔误当项目问题。
- `91` 记录架构决策与取舍；`92` 只记录真正改变设计判断的实验；`93` 记录可用于项目介绍与面试追问的事实。

阅读状态时，以每篇正文顶部的 `状态` 为当前结论；正文内部的“下一步/下一门/当时”属于历史过程叙事，不覆盖顶部状态。已结项阶段若出现会被误读成当前状态的“进行中/等待验收”，应视为文档一致性缺陷并及时修正。

## 学习与记录优先级

用户背景是资深前端开发工程师。本实战档案优先展开 RAG 核心链路与后端工程化，包括 Source、Corpus、Chunk、Embedding、Index、Hybrid Retrieval、RRF、Rerank、Evidence、Context、Citation、Eval，以及 PostgreSQL/pgvector、运行时边界、并发与故障处理。

ChatWeb 自己的 Generation、Conversation、UI 和 Tool/Agent 能力进入独立 ChatWeb 工程实战档案，不再挤进本目录。前端、Monorepo、常规 TypeScript、普通 Git/网络波动仅在影响 RAG 架构、正确性或形成真实排障案例时简要保留。
