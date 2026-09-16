# ChatWeb 工程实战记录

这个目录记录 `chatweb` 从产品拆分、架构基线到公开交付的真实工程过程，面向复盘、学习和面试；它**不承担 ChatWeb 项目 Spec、CURRENT 或 Gate 的权威职责**。

## 为什么单独建这个目录

ChatWeb 与 ProFlow RAG 是两个独立项目：前者负责通用 Chat 产品壳与 Chat Runtime，后者负责知识能力。既然项目已经拆仓，工程学习记录也必须拆开，否则会把“Chat 产品工程”和“RAG 工程”重新混成一条叙事。

这里重点记录 ChatWeb 自己的问题：Conversation/Message/Run、Streaming、Provider Contract、Context 插件边界、Public Web 与 Trusted Runtime、Citation/Rich Output、Settings、Tool/MCP 扩展入口、Thinking、Vision/File、Voice，以及这些设计如何被真实实现和验证。Artifact 只有真实 producer 出现时才进入后续工程记录。

## 真源边界

- 产品、领域、Contract、ADR、Verification 真源：`chatweb/docs/specs/`。
- 当前执行状态真源：`chatweb/docs/context/02-当前接力/CURRENT.md`。
- 真实实现事实：ChatWeb Git working tree / HEAD、测试、运行时与浏览器证据。
- 本目录只做**工程过程的解释层和学习层**，不能反向把项目候选写成已验收事实。

当本目录与 ChatWeb 项目仓冲突时，无条件以项目仓中更新更晚的机械事实和正式 Spec 为准。

## 同步规则

只在以下事件发生时同步学习档案：阶段 Mechanical Gate、User Review / Final Acceptance、重大 Spec/ADR 调整、真实故障与修复、会改变设计判断的实验或性能数据。普通格式调整、临时日志、未验证猜测不进入这里。

每次同步至少回读项目的阶段状态和对应 Owner Spec；有 commit 时记录精确 commit，没有 commit 时明确写 `UNBORN` 或 `working tree candidate`，禁止伪造版本基线。

## 当前主线

`00 项目起点 → 01 S0 产品与架构基线 → S1 工程骨架 → S2 Conversation Core → S3 Model Provider/Streaming → S4 Chat UI → S5 Context/RAG → S6 Citation/Rich Output → S7 Settings → S8 Tool/MCP → S9 Public Delivery → S10 Quality/E2E → V0 Technical Gate → S11 Web Search/One-hop Tool Loop → S12 Chat 产品化与多模态 → V0 Sites Production Gate`

S1-A 已完成一次真实部署拓扑纠偏：当前冻结为 Next frontend（localhost + ChatGPT Sites）与 Nest local Trusted Backend（tunnel 公网 API）。2026-09-09 又纠正 Production Gate：tunnel 只暴露 4310 API，线上 frontend 必须是真实 ChatGPT Sites；fresh V0 技术 Gate 保持 PASS，但产品发布状态被重开。

2026-09-12，S12 已完成 Wave A/B/C/E/F/D 与 Final Product Gate，终态=`S12_CHAT_PRODUCTIZATION=FINAL_ACCEPTED / S12_FINAL_PRODUCT_GATE=FINAL_PASS`。当前唯一产品发布主线是 `V0_SITES_PRODUCTION_GATE`；在真实 ChatGPT Sites deploy + production E2E 完成前，`V0_RELEASE=NO`。

## 当前记录

- `00_项目起点与产品边界.md`：为什么 ChatWeb 必须独立，以及与 ProFlow RAG 的职责拆分。
- `01_S0_产品与架构基线.md`：S0 十项设计、全量审计、真实纠偏与 Mechanical Gate。
- `02_S1_工程骨架.md`：从不可违反的 Runtime/Deployment 约束反推框架选择，并记录 S1 各子阶段真实实现与验证。
- `03_S2_Conversation_Core.md`：Conversation/Message/ChatRun、Retry、effective history 与 persistence port 的真实实现。
- `04_S3_Model_Provider与Streaming.md`：ModelProvider、OpenAI-compatible adapter、SSE/cancel 与 secret boundary 的真实实现。
- `05_S4_基础_Chat_UI.md`：Browser Chat UI、shared wire contract、Stop/Retry、production Browser E2E 与执行纠偏的完整过程。
- `06_S5_Context_Provider与RAG.md`：ContextProvider、selection/budget/failure/Abort/Retry、ProFlow RAG concrete adapter、真实跨仓 E2E、consumer/provider policy 解耦与 Final Acceptance。
- `07_S6_Citation与Rich_Output.md`：Citation public wire、run/message ownership、安全渲染、全仓一致性审计与 Browser protocol-error/stream-ownership 纠偏；S6 已 Final Accepted。
- `08_S7_Settings与Provider_Runtime.md`：公开 Provider discovery、Browser 非敏感 preference、required/optional、Retry freeze，以及 discovery outage 下“Context last-known 保留但 Model 仍可持久化”的两层 Final Review 纠偏；S7 已 Final Accepted。
- `09_S8_Tool与MCP扩展边界.md`：独立 Tool execution contract、Runtime executable allowlist、MCP adapter ownership、“discovery ≠ enablement”与 deep-freeze Final Review 纠偏；S8 已 Final Accepted。
- `10_S9_Public_Delivery与Operations.md`：公网 persistent tunnel、liveness/readiness、restart stability、request correlation，以及 SSE client-close `finish/close exactly-once` 的 Final Review 纠偏；Backend/Public Delivery operations 保持 PASS，Sites production evidence 后续被独立重开。
- `11_S10_Quality与Full_E2E.md`：最终 Requirement→Verification→Evidence traceability、统一 `verify:s10`、Model timeout 真缺口、policy 单一 ownership 与最终公网 normal/timeout/Stop→Retry；S10 已 Final Accepted。
- `12_V0_Release_Gate.md`：clean clone + frozen install + full matrix 的 V0 技术 Gate 证明，以及“旧 V0_RELEASE=YES 被真实 Sites topology supersede”的发布治理纠偏；当前 `V0_RELEASE=NO / V0_SITES_PRODUCTION_GATE=ACTIVE`。
- `13_S11_Web_Search与One-hop_Tool_Loop.md`：structured decision fallback、S8 ToolProvider 首个真实 consumer、one-hop vs Agent loop、provenance→Citation、4B grounding/title drift、Retry fresh facts 与 deterministic failure regression；已 `S11_FINAL_ACCEPTED`。
- `14_S12_Chat产品化与多模态.md`：完整记录 S12 UI、Thinking、Attachment/Vision/Document、Tool UX、MCP Discovery/READ_ONLY execution、Voice、附件入口裁决、共享 Playwright harness 纠偏与 Final Product Gate；已 `S12_FINAL_ACCEPTED`。
- `90_问题与纠偏索引.md`：真实错误假设、失败与防回归。
- `91_架构决策与权衡索引.md`：可复盘的关键设计取舍。
- `92_验证与证据索引.md`：只记录能支撑项目结论的机械证据。
- `93_面试素材索引.md`：只提炼已有项目证据，不提前编实现故事；已补 S12 Final Accepted 可陈述素材。
- `记录模板.md`：后续阶段同步格式。
