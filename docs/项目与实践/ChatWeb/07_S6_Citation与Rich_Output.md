# 07｜S6 Citation 与 Rich Output：把来源事实安全地交给 Browser

状态：`S6 FINAL_ACCEPTED / implementation chatweb@f7f8ae6 / context baseline chatweb@d60b262`

## 这一阶段真正解决什么

S5 已经让 ChatWeb 能从 ContextProvider 拿到 Context 与 generic provenance，并把 Context 作为 Runtime-owned SYSTEM message 交给模型；但 Browser 仍只能看到模型文本，看不到“本次回答实际用了哪些来源”。S6 解决的不是 Retrieval，而是把已经存在的 provenance 变成稳定、可验证、可安全展示的 Citation 输出事实。

这三种事实必须分开：

```text
Context  = 给模型消费的外部知识
Citation = 给用户看的来源事实
Answer   = 模型生成的文本
```

ProFlow RAG 仍只是外部知识能力：它拥有 Retrieval/Evidence/Context/Citation truth；ChatWeb 拥有 ChatRun、Assistant Message、public wire 与 Browser rendering。S6 没有重新打开 RAG 内部实现，也没有让 Browser 直连 RAG。

## 为什么必须先做 Contract Amendment

S5 为了不抢跑，Streaming 仍是 `run.started → message.delta* → terminal`，没有 `context.resolved` 或 Citation event。S6 若要让 Browser 获得 Citation，就不能偷偷从 SYSTEM prompt、server repository 或自然语言中反推，必须先修改正式 public wire。
S6 最小 amendment 是新增：

```text
run.started
message.citations?
message.delta*
run.completed | run.cancelled | run.error
```

`message.citations` 携带 `runId + assistantMessageId + citations[]`，只在本次 run 已经解析出可展示来源时发送；不暴露 Context 正文、budget、snapshot、degradation 或 provider 私有 DTO。

## Citation 最小模型为什么只做到这里

当前真实需要的稳定字段是：`id / label / href? / locator? / providerId / contextItemId?`。Citation 必须来自当前 ChatRun 的 `RESOLVED` provenance，并绑定该 run 的 Assistant Message；不能从模型回答中的“[1]”“来源：”等自然语言猜测。

S6 没有为了让 Acceptance Matrix 好看而造一个万能 Artifact framework。当前真实 producer 只有 streaming text + Citation，因此 Rich Output 最小集合就冻结到这两类。未来出现 code artifact、data summary、downloadable artifact 等真实 producer，再做新的 allowlisted part + Contract Amendment。

同理，provider-specific opaque metadata 当前也没有真实 Browser consumer，因此不把它强塞进 Domain/UI；Verification 改成证明 Browser 主流程只依赖稳定 PublicCitation 字段。

## 安全输出边界

Citation `href` 只接受绝对 `http:` / `https:`，并拒绝 URL credential；`javascript:`、`data:` 等非法 scheme 不能成为可点击链接。`label/locator` 始终走 React 文本渲染，不解释为 HTML，也不允许 provider 注入 React Component。
## Citation 的生命周期如何绑定 Run

Context resolution 完成后，Runtime 从 `ChatRun.contextResolutions` 生成 Citation，先写入当前 Assistant Message，再发送 `message.citations`。这样 Browser 收到的来源不是临时 UI state，而是与 `runId/assistantMessageId` 对齐的运行事实。

S6 还明确了失败、取消和 Retry：Citation 已经发送后，如果模型随后失败或用户 Stop，已解析的来源继续属于旧 run，不撤回；如果取消发生在 Context resolution 完成前，则没有 Citation。Retry 创建新 ChatRun、重新 resolve Context，并产生新的 Citation identity，不覆盖旧 attempt。

## 全仓一致性审计为什么成为 S6 的一部分

接手 S6 后先做了全仓 Spec ↔ CURRENT ↔ README ↔ runtime ↔ public contract 审计。主架构没有重新耦合 RAG internals，但发现大量“实现已经进入 S6、活跃文档仍停在 S5 candidate”的治理漂移：根 README 还写 S1 未开始；Provider/Runtime Spec 还写 P4 未冻结、RAG env 暂不创建；CURRENT 仍写 S6 NOT_STARTED；两个 S4→S5 handoff 仍混在当前接力目录；Verification 还强制不存在真实 producer 的 Artifact。

纠偏原则不是删除历史，而是分层：活跃 SDD/CURRENT 必须更新到当前事实；旧 handoff 移入 `90-历史记录`；历史 candidate/blocker 继续作为过程证据保存。最终 `02-当前接力` 只留下 CURRENT，并建立新的 S6 Runbook / REQUIRED_CONTEXT。

继续反向审计还发现更深一层 SDD 冲突：S6 已明确“不为不存在真实 producer 的 Artifact 造 framework”，但 S0 Product Spec、V0 Scope、Stage Roadmap、Domain Map 和 Ubiquitous Language 仍把 Artifact 写成当前 V0/S6 对象。于是正式做 S6 Amendment：`PRD-007` 收敛为结构化 Citation + 真实 producer 驱动的有限 Rich Output；Artifact 从当前领域术语中移除，真实 producer 出现时再独立 Amendment。

这次审计也补齐 `.env.example` 的 `PROFLOW_RAG_BASE_URL / DISPLAY_NAME / TIMEOUT_MS / CONTEXT_MAX_CHARACTERS`，避免代码支持真实 RAG、fresh setup 文档却不知道如何配置。

## Browser Acceptance 抓到的真实 bug

production static Browser fixture 先证明安全 Citation 正常展示。随后 fixture 故意发送 `javascript:` href，Browser parser 正确拒绝非法 public event，没有执行恶意链接；但这暴露了另一个真实产品问题：stream 已经 `run.started` 后发生协议校验错误时，UI 仍停在“正在思考…”并保留 Stop/activeRunId。
修复后的策略是：post-start public stream contract violation 发生后，Browser best-effort cancel server run，把对应 Assistant 明确置为 FAILED，清理 activeRunId/Stop，不提供没有事实依据的 Retry。修复后 production Browser 不再卡死。随后又修正了“没有 Retry 按钮却显示可重试”的文案漂移，只有真实 `retryRunId` 存在才显示“可重试”。

这个故障说明 public contract validation 不能只考虑“拒绝坏数据”，还必须定义**拒绝之后客户端状态机如何终止**。安全 fail-closed 如果不同时清理运行状态，也会制造新的产品死状态。

## 当前机械证据与证据边界

S6 Final Review 又发现一层更深的 Browser ownership bug：Web 之前只按 `assistantMessageId` 应用 SSE，后续 event 的 `runId` 没有强制与本流 `run.started` 一致。于是新增 Browser stream contract state machine，冻结 `run.started` 的 `runId + assistantMessageId`，拒绝 ownership mismatch、duplicate start/citation、citation-after-delta、post-terminal event，以及 EOF 缺 start/terminal；Retry 的 protocol failure 也补齐 best-effort cancel、FAILED terminalization 与 retry anchor 恢复。

最终 `pnpm test:s6` 扩为 API 24/24 + Web stream contract 6/6 = **30/30 PASS**。production Browser 进一步证明 ownership mismatch 与 Retry mismatch 都 fail-closed、恶意 Citation 不渲染，正常 happy path 不被误拒绝；safe Citation、unsafe href、HTML/script/img 文本渲染、Stop retention 与 Retry 新 Citation identity 也全部 PASS，Console 0 error/0 warning。

ownership 修复后重新执行唯一有效的 S6 Formal Gate：30/30 tests、API/Web production build、static artifact、RAG internal/DB coupling=0、Browser private config=0、unsafe HTML renderer=0、S7 Context UI=0、premature Artifact=0、duplicate shared wire=0、Web env allowlist、`out/index.html`、`git diff --check`、generated output hygiene 全 PASS。User delegated Final Review 后，S6 implementation 提交为 `chatweb@f7f8ae6`，context baseline 提交为 `chatweb@d60b262`，S6 已 Final Accepted。

## 可以用于面试的核心表达

“我没有让 RAG 的 citation DTO 直接穿透 UI，而是把本次 run 已解析的 provenance 提升成 run/message-bound PublicCitation，并通过正式 SSE Contract Amendment 增加 `message.citations`。Browser 只渲染 allowlisted 字段，URL scheme/credential 做 fail-closed 校验，不执行 provider HTML。实现中真实发现过一个协议错误后的客户端状态机 bug：坏 Citation 虽被拒绝，但 UI 仍卡在 generating；最终把 protocol failure 设计成 best-effort cancel + FAILED terminalization。S6 也没有为了验收强造 Artifact framework，只有真实 producer 出现才扩 Rich Output contract。”

## 当前版本与下一步

- S6 implementation baseline：`chatweb@f7f8ae6`。
- S6 context/final baseline：`chatweb@d60b262`；Final Accepted。
- ProFlow RAG：稳定 Maintenance baseline；S6 未产生 RAG Maintenance Change。
- 下一阶段已进入 S7 Settings / Provider Runtime；S7 仍按独立 Stage Gate 推进，不反向修改 S6 已接受事实。
