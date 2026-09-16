# 14｜S12 Chat 产品化与多模态

> 状态：`FINAL_ACCEPTED / WAVE_A_PASS / WAVE_B_PASS / WAVE_C_FINAL_PASS / WAVE_E_FINAL_PASS / WAVE_F_F1_FINAL_PASS / WAVE_F_F2_FINAL_PASS / WAVE_D_FINAL_PASS / FINAL_PRODUCT_GATE_FINAL_PASS`。本文是工程学习记录，不替代 ChatWeb CURRENT / Owner Spec。

## 1. 为什么在 Sites Production Gate 前插入 S12

S11 结束时 ChatWeb 已经“能聊天、能联网”，但真实 Browser 仍更像工程验证壳：raw model selection 暴露给用户，附件/语音/工具没有完整产品入口，布局也不具备日常 Chat 产品的使用感。继续直接部署 Sites 只能证明“技术链通了”，不能证明产品可用。

因此发布顺序被主动改成：`S11 → S12 Productization → S12 Final Product Gate → ChatGPT Sites Production Gate`。这不是推翻既有 V0 技术 Gate，而是补齐此前缺失的真实产品验收层。

## 2. Phase 0：先用真实 Runtime 裁决，不靠想象设计

手机 MLX 同时存在 Fast no-think 与标准 Qwen3.5。实测发现顶层 `enable_thinking` 不可靠，而 `chat_template_kwargs.enable_thinking` 能真正控制 Qwen3.5 thinking；但 think=true 的 reasoning 会混入 `content`。因此产品层只暴露 `thinkingMode=off|on`，Runtime 持有真实 model mapping，Think 采用 hidden reasoning pass → clean final pass。

Vision 同样先做真实探针：当前 Qwen3.5 对 URL 与 data-URI 图片都能识别，因此首版不需要公网临时媒体 URL，图片可在 Trusted Runtime 内编码成 data-URI 后交给模型。

## 3. Wave A：从工程后台改成 Chat 产品壳

Wave A 保留 Chat/Search/Context/Stop/Retry 既有行为，只重构信息架构：Sidebar、Conversation、Composer、Capability Bar、Settings。联网进入主 Composer；raw provider/model/context 退入高级层；图片、文件、工具、语音建立明确产品入口，不伪造未完成能力。

真实 Chrome 最终覆盖 Desktop/Mobile、Settings、Search toggle、普通 Chat、Stop→Retry；Console 0 error/0 warning。过程中还发现 4300 已是新前端、4310 却仍运行旧 pre-S11 dist，真实 Browser 因 `webSearchMode` 被旧 Runtime 拒绝。恢复本机 Runtime 权威状态后通过，证明 UI Review 也能捕获部署现场漂移。

## 4. Wave B：深度思考是产品能力，不是模型下拉框

Browser 正式请求从 raw `providerId/modelId` 改为 `thinkingMode`；`/chat/models` public discovery 被移除，`/chat/capabilities` 只公开公开能力。ChatRun 冻结 thinkingMode，Retry 不读取当前 UI 新偏好；Search structured decision 强制 non-thinking，避免 reasoning 污染 JSON。

Think 的私有推理永远不进入 SSE/Assistant Message。机械 Gate 证明 hidden reasoning 隔离，真实 Browser 证明 Fast/Think routing、Retry freeze 与 public-wire private mapping=0。手机 MLX 曾出现 TCP 可连接但 HTTP 完全不响应，ChatWeb 正确映射 `PROVIDER_TIMEOUT`；恢复后真机 Gate 补齐，因此该事件应建模为 external Runtime degradation，而不是 ChatWeb failure。

## 5. Wave C：Attachment 属于 UserMessage，而不是 Tool/Run

最重要的 ownership 裁决是：Attachment 是用户消息事实。UserMessage 保存 immutable `AttachmentRef`，raw bytes 留在 server-side bounded AttachmentStore；ChatRun 不再复制一份附件 snapshot。Retry 引用同一个 trigger UserMessage，天然保持附件不漂移。

Browser 上传使用 multipart；正式 ChatRun 只传 attachment IDs。单文件最大 10 MiB、单消息最多 8 个附件。图片支持 JPEG/PNG/WebP；文档支持 txt/md/json/code/PDF/DOCX。绑定后的附件不可删除或重新绑定，duplicate/unsupported 全部 fail-closed。

## 6. Vision 与文档消费链

图片链：`Browser upload → AttachmentStore → provider-neutral image part → Trusted Runtime data-URI → MLX Vision`。真实 Chrome 生成包含 `WAVE C / VISION 42` 的 PNG，同时上传含 `ORANGE-NEBULA-731` 的 Markdown，手机 Fast 模型准确读取两项。

文档链：`Attachment bytes → DocumentTextExtractor → bounded untrusted block → ModelGenerationMessage`。文本单文件 24k chars、全历史总计 48k chars；PDF 使用 `pdfjs-dist`，DOCX 使用 Mammoth raw text。解析器错误统一映射成产品错误，不把第三方 stack 泄漏给 Browser。

## 7. 最有价值的一次失败：PDF/DOCX 首次真机拒答

PDF 与 DOCX extractor focused tests 已经分别抽出 `VIOLET-COMET-842` 与 `TEAL-ORBIT-519`，但第一次真实 Browser 请求手机模型却回答“无法读取附件”。没有继续盲改 parser，而是 Failure-First 分层取证：

1. production dist 的 ChatRun 捕获证明最终 ModelProvider messages 中确实包含两个随机码；
2. 把完全相同 messages 直接发给手机 Fast，模型立即正确返回两个码；
3. 再用一次性 localhost 透明代理捕获 4310 真实 outbound HTTP body，确认 model、thinking=false、SYSTEM guard、PDF/DOCX 文本全部正确；
4. 代理链 Browser 重放 PASS；关闭代理、恢复 4310 直连手机后再次重放仍 PASS。

因此首次拒答被裁决为**单次小模型行为/运行态偶发**，不是 Attachment pipeline 缺陷。这个案例说明：模型输出错误不等于数据链错误，必须逐层验证事实到底在哪一层丢失。

## 8. Wave C Final Gate

- API regression：60/60 PASS；
- Web regression：10/10 PASS；
- PDF/DOCX provider tests：3/3 PASS；
- Traceability：55 Requirement → 29 Verification → 29 Evidence，PASS；
- Source Gate：PASS；
- Web/API production build：PASS；
- `git diff --check`：PASS；
- real Browser：Vision、Markdown、PDF、DOCX、upload/remove/bind/public wire PASS；当前导航 Console 0 error / 0 warning；
- terminal marker：`S12_WAVE_C_FINAL_GATE_RC=0`。

## 9. Wave E：Tool UX 先解决“看见和选择”，不抢跑 MCP execution

S8 已经有 server-side ToolProvider boundary，S11 已经有真实 Built-in `web/search`，所以 Wave E 不重新造 Tool Runtime。它只把用户真正需要的产品语义接出来：Composer 联网开关、Tool Drawer、安全 public metadata，以及“Built-in / MCP”的可见分类。

公开 `GET /chat/tools` 只暴露 `id/displayName/description/sourceType/effect/availability/approvalRequired`。`inputSchema`、credential、provider config、tool arguments、MCP transport 都留在 Trusted Runtime。MCP 区域在未接入时必须明确显示空态，不能为了 UI 看起来完整而伪造 Local Dev / Chrome 已连接。

## 10. Wave E 的第一类真实失败：源码已经新了，Runtime 仍是旧 dist

代码 Gate 已经通过，但真实 4310 的 `/chat/tools` 仍然 404。这个现象如果只看 source 很容易被误判成 controller 没注册；真实进程检查证明 4310 仍运行修改前的旧 `dist/main.js`。

处理方式没有“凭记忆重建 env”，而是先恢复旧 PID 的 server-only env，再只替换 4310。必须保留 Fast/Think routing、手机 MLX base、RAG、Web Search、CORS 和各 timeout/budget。4300、RAG、手机模型都不碰。public-wire repair build 后第二次只替换 4310，新 PID 与旧配置 exact match PASS。

这个案例再次说明：**Source Truth 与 Runtime Reality 是两套必须同时验证的事实**。源码 Gate PASS 只能证明“下一次正确启动会工作”，不能证明当前 listener 已经装载了新代码。

## 11. Wave E 的第二类真实失败：内部 provenance 被直接 JSON 序列化到 public SSE

Fast+Search 第一次真实 Browser Review 已经正确完成搜索，但 network response 暴露了 `message.citations[].providerId="web"`。内部 Citation/ToolInvocation 需要 provider identity 做 provenance，这不是错误；错误在于 SSE encoder 把内部 event 原样序列化，导致 internal model 穿透 public wire。

最终裁决不是删除内部 `providerId`，而是建立明确的 **internal event → public event projection**：

- Trusted Runtime 内部 Citation/ToolInvocation 继续保留 owner/provenance identity；
- public `PublicCitation` 只允许 `id/label/href/locator/contextItemId`；
- SSE encoder 对每种 event 做 allowlist projection；
- Browser citation parser 同样拒绝额外字段；
- UI 不再显示内部 provider chip。

新增 targeted regression 主动注入私有字段，证明 encoder 不会序列化。Web Search 内部 provenance regression 同时保持 PASS，因此修复完成了分层，而不是牺牲内部事实。

## 12. Wave E Final Browser Acceptance

最终真实 Chrome 证据：

- Desktop Tool Drawer：Built-in Web Search 正常；READ_ONLY/AVAILABLE 可见；
- Composer “联网”与 Drawer “使用/使用中”共享同一 `webSearchMode`，不存在两套状态；
- Mobile 390×844：Tool Drawer 真实可见，Built-in/MCP/共享开关一致；
- Fast+Search：真实 request=`thinkingMode:off + webSearchMode:auto`，HTTP 200；public SSE 私有字段=0；Browser 不直连 private ToolProvider/MCP endpoint；
- Think：真实 request=`thinkingMode:on + webSearchMode:off`，HTTP 200 + terminal；public SSE 私有字段=0；
- ProFlow RAG：required context 真实 run 200 + terminal；Browser 只通过 4310 public selection contract，不直连 RAG；
- 最终 Console：0 error / 0 warning。

机械侧：原 Wave E code Gate 为 API 60/60、Web 10/10、Tool metadata/Registry/Controller 8/8、Browser metadata parser 2/2、Traceability/Source/API build/Web build/diff-check 全 PASS；public-wire repair 后 targeted API、API/Web build、diff-check 再次 PASS。终态：`S12_WAVE_E_TOOL_UX=PASS`。

## 13. 从 Wave E 得到的工程原则

1. **Discovery、Enablement、Approval 必须分层。** 能发现 MCP Tool 不等于 ChatWeb 已启用，更不等于用户批准执行。
2. **Public DTO 不应复用 Internal Domain Object。** 直接 JSON serialization 会让未来新增内部字段自动变成 public API。
3. **Browser Review 必须看 Network Response Body。** 只看 UI DOM 不足以发现 provider/model/schema 等隐式泄漏。
4. **Runtime replacement 必须保存精确环境。** 尤其当本机同时存在手机模型、RAG、Web Search、CORS、timeout/budget 时，凭记忆 restart 很容易造出第二个问题。
5. **移动端失败先区分 harness 与产品。** DOM/tool 的 actionability 或 attribute 误判不能直接升级为 Product failure。

## 14. Wave F F1：MCP Discovery 的第一件事是 ownership，不是启动进程

F1 第一次真实 Runtime Acceptance 暴露的根因，不是“Local Dev/Chrome MCP 不可用”，而是 ChatWeb 试图再次启动它们。本机已经由 `gptweb-mcp` 管理一套 Local Dev / Playwright Chrome shared runtime；如果 ChatWeb 再 direct-spawn Desktop Commander 或第二个 `@playwright/mcp --extension`，就会制造第二个 MCP server/controller。Chrome 场景更危险，因为两个 controller 会争用同一个 Extension/Profile。

这次反例把一个重要边界讲清楚：**raw stdio MCP 是进程绑定的 stdin/stdout，不是天然可复用的多客户端 socket。** “复用已有 MCP”必须通过明确支持多客户端的 manager/tunnel/broker surface。

因此 F1 收窄为“managed shared-runtime readiness + ChatWeb Runtime allowlist → public metadata”：

- ChatWeb 不拥有 Local Dev / Playwright MCP 子进程生命周期；
- server-only readiness authority 只证明 managed runtime ready；
- READY 后只发布 ChatWeb 自己 allowlist 的已知 READ_ONLY Tool；
- readiness 失败时 fail-closed 为 `UNAVAILABLE`；
- F1 不执行 `tools/call`，也不向 Browser 暴露 transport/private config。

## 15. F1 Final Acceptance：证明“复用 owner”而不是只证明 UI 有卡片

机械 Gate、Runtime 与 Browser 都最终 PASS。关键不是“页面上有 MCP 卡片”，而是 4310 API PID 没有创建第二个 MCP direct child；真实 Tool metadata 与 manager readiness 一致，public wire 没有 health URL/file、command、args、credential、schema 或 transport config。

Browser 验收中出现过 `<summary>` actionability timeout 与 Next dev `/favicon.ico` 噪音，这些都按 harness/非目标 failure domain 处理，不冒充产品缺陷，也不拿 F1 functional PASS 替代后续 Final Product Gate 的 Console 0/0。

终态：`S12_WAVE_F_F1_DISCOVERY=FINAL_PASS`。

## 16. Wave F F2：readiness 与 execution authority 必须拆开

F2 不重做 discovery，而是回答：**如何在不创建第二个 Local Dev/Playwright owner 的情况下真正执行 READ_ONLY MCP Tool？**

最终实现把 lifecycle/readiness authority 与 execution authority 分开：

- `MCP_*_READY_URL_FILE` 只证明 manager-owned runtime readiness；
- execution endpoint 必须来自真实 shared execution seam，禁止把 `/readyz` 或 operator URL 改写成 `/mcp`；
- Playwright Chrome 最终拥有 broker-owned loopback execution endpoint；
- Local Dev 当时没有 shared execution endpoint，因此 public metadata 可见但 execution `UNAVAILABLE`，严格 fail-closed；
- Browser 只发送 public `toolSelections`，不拿 input schema、arguments、endpoint、transport config；
- 只开放 Runtime-approved READ_ONLY，MUTATING 在 Approval Flow 前保持不可执行；
- S11 one-hop `max 1 ToolInvocation / ChatRun` 不变量保持。

真实证据：API 78/78 + Web 10/10、focused endpoint-authority 12/12、API/Web build PASS；`/chat/tools` 中 Chrome 5 个 READ_ONLY AVAILABLE，Chrome MUTATING 全部 `UNAVAILABLE + approvalRequired=true`，Local Dev READ_ONLY 因无 execution endpoint 全部 UNAVAILABLE。真实 API + Browser one-hop 都通过 `chrome/browser_snapshot` 完成正常 ChatRun。

终态：`S12_WAVE_F_F2_READ_ONLY_EXECUTION=FINAL_PASS`。

## 17. Wave D Voice：不为“语音”另造一套 Agent Runtime

Voice 最终走的是：

`Browser SpeechRecognition → Trusted Runtime /chat/voice/normalize → server-owned Qwen Fast hidden normalize → normal ChatRun → Browser speechSynthesis`

这里最重要的不是 API 数量，而是 ownership：Browser 负责真实麦克风和系统语音能力；Trusted Runtime 只把候选 transcript 做受限 Normalize，禁止替用户回答或新增意图；Normalize 后才进入正式 User Message。server-side STT 只保留 optional seam，因为当前手机 MLX `/v1/audio/transcriptions=404`，用户也明确不希望为了过 Gate 在 Intel Mac 再部署独立语音模型。

Code Gate 最终 API 83/83、Web 10/10、API/Web build、diff-check PASS。真人验收中两轮真实语音都产生 `/chat/voice/normalize=201 → /chat/runs/stream=200`；用户最终明确确认扬声器实际听到 TTS，Browser 回到 IDLE。

终态：`S12_WAVE_D_VOICE=FINAL_PASS / HUMAN_SPEECH_E2E_PASS / TTS_AUDIBLE_USER_CONFIRMED`。

## 18. Final UI Review：产品入口要按用户心智收敛

Final Review 又做了两次很典型的“看起来是功能，实际是产品边界”的修正。

第一，用户截图左下角黑色 `N` 被误认为个人中心。源码审计 + Browser 语义证明它实际是 Next.js Dev Tools indicator。产品根本没有 Profile/Account/User Menu。最终在 Next dev config 中关闭 dev indicator，同时明确 S12/V0 不提供账号体系；正式“设置”只管理 Chat 能力。

第二，用户明确不要“＋附件/file picker”，只要复制粘贴与拖拽。因此 Attachment Entry 被重新收敛为：

- 不提供 hidden file input；
- 不提供系统 file picker；
- 不提供“＋ 添加图片或文件”；
- Composer 接收 Drag&Drop；
- textarea 接收 clipboard file/image Paste；
- 两条入口继续复用既有 `uploadAttachment → AttachmentStore → pending preview/remove` 数据链。

这类调整不改变 Attachment Domain ownership，却显著改变产品心智和最终 UI contract。

## 19. Final Product Gate：重新证明“能用”，而不是只拼历史 PASS

S12 Final Gate 先完成机械证据：API 83/83、Web 10/10、Traceability `55→29→29`、Source Gate、API/Web production build、`git diff --check` 全 PASS；随后做 fresh Browser product smoke。

手机模型恢复后，最终 fresh generation 证据全部闭合：

- Fast：页面真实返回 `FAST-OK`；
- Think：页面真实返回 `THINK-OK`；
- Vision + File：真实 Drag&Drop 同时加入纯红 PNG 与含 `FILE-CODE-731` 的文本，模型返回 `RED | FILE-CODE-731`；
- Search AUTO：真实 ChatRun completed，页面渲染完整回答 + 5 Citation + 5 href；
- Chrome MCP one-hop：选中 `Chrome · browser_snapshot`，正常 ChatRun completed，页面最终返回 `MCP-OK`；
- Stop/Retry：Think 长任务真实 Stop，页面进入 `已停止，可重试`，4310 cancel=201；同 scene `重新生成` 后完成第二次 Think 回答，未重复 User Message；
- non-model Browser：Desktop/Mobile、Tool/MCP visibility、Voice 入口、private-config marker=0、Console 0/0 均已通过。

终态：`S12_FINAL_PRODUCT_GATE=FINAL_PASS / S12_CHAT_PRODUCTIZATION=FINAL_ACCEPTED`。

## 20. Paste 自动化为什么没有被伪造成 PASS

Drag&Drop 已有真实 Browser `POST /chat/attachments=201`，并在 Final Vision/File smoke 中再次被真实消费。但 Paste 遇到的不是产品报错，而是当前 Playwright/Extension 无法把 macOS system clipboard 桥接进页面。

为了不把猜测写成结论，做了最小对照：系统剪贴板里放普通文本 `PASTE-HARNESS-PROBE`，同样用 Playwright `Meta+V` 聚焦 ChatWeb textarea，最终 input value 仍为空。也就是说，自动化连纯文本系统剪贴板都读不到，无法据此判定附件 `onPaste` 失败。

因此当前裁决是：Paste code/contract/build PASS；真实 OS clipboard E2E=`HARNESS_FAILURE / NOT_APPLIED / NON_PRODUCT`。没有使用 synthetic `ClipboardEvent` 冒充真人路径，也没有为了自动化方便恢复 file picker。

## 21. 共享 Playwright 的一次重要自动化纠偏

S12 收尾时还暴露了共享 MCP 的更深一层问题：本机已经只有一个 canonical Playwright MCP raw owner，但“单进程”并不等于“多个 Chat 已经获得独立 Browser session/page state”。多个 downstream consumer 仍可能共享 stateful current page/context，导致一个 Chat 切页后另一个 Chat 的后续调用落到错误页面。

正确结论不是再启动第二个 Playwright，而是把**owner 唯一性**与**session isolation**分开。当前主线为了不被 shared current-page 漂移阻塞，使用 target-bound / atomic 临时页场景：在一个受控事务里创建或识别目标 ChatWeb page，完成 DOM/截图/操作/取证后关闭，并恢复原页面；不跨多次调用依赖 global current tab。

这个结论已提升到 ChatGPT Chat 公共 Acceptance Automation Skill；ChatWeb 项目只保留产品/拓扑事实，不维护第二套 Browser automation SOP。

## 22. S12 收口后的当前主线

S12 已经不是“开发中”或“F2 NEXT”。当前真实状态：

- `S12_CHAT_PRODUCTIZATION=FINAL_ACCEPTED`；
- `S12_FINAL_PRODUCT_GATE=FINAL_PASS`；
- `CURRENT_EXECUTION_GATE=V0_SITES_PRODUCTION_GATE`；
- `V0_RELEASE=NO`，直到真实 ChatGPT Sites production deployment + E2E 完成。

S12 最终最大的工程价值不是多加了几个按钮，而是把 UI、模型路由、附件、工具、Voice、Browser automation 与发布拓扑的 ownership 都收敛到了可以复验的边界。下一步不应再重跑 S12 全量 Gate，而应进入真实 Sites Production Gate。
