# 05｜S4 基础 Chat UI：把领域事实和 Streaming 真正交给 Browser

状态：`S4 Final Accepted / learning archive complete`

## 这一阶段真正解决什么

S2 解决 Conversation/Message/ChatRun 事实，S3 解决 ModelProvider 与 Streaming Runtime，S4 才第一次把这些能力交给真实 Browser。目标不是做一张“像 ChatGPT 的页面”，而是让 UI 对 S2/S3 已冻结语义负责：同一 Conversation 连续多轮、typed SSE、Stop 保留 partial、Retry 创建新 attempt、Browser 永远拿不到 provider secret。

S4 仍然不做 RAG、Citation/Rich Output、Settings、Tool/MCP/Agent。Context Provider + ProFlow RAG 留给 S5。

## 开始前的关键架构触发：S1-D 必须 reopen

S1-D 时 Web 没有 fetch、API 没有 Chat route，也没有稳定 wire DTO，所以当时“不建 shared package”是正确决策。S4 开始后，Web 首次真实消费：

```text
GET  /chat/models
POST /chat/runs/stream
POST /chat/runs/:runId/cancel
POST /chat/runs/:runId/retry
```

同时还要消费 `run.started / message.delta / terminal` SSE event。此时 Browser/API 已经共同维护同一组 request/response/error/event shape，S1-D 预设 reopen trigger 正式成立。

## 为什么 shared contract 只能这么窄

最终建立 `packages/chat-contract`，只有 `README.md / index.d.ts / package.json`。它只放 Browser/API 共同维护的公开 wire type；Conversation Domain、ModelProvider、credential、RAG 内部类型、运行时代码都禁止进入。

这说明 shared package 的判断标准不是“以后可能复用”，而是“现在是否存在两个真实 consumer 共同维护同一个稳定契约”。S1-D 与 S4 并不矛盾：前者在 consumer=0 时拒绝抽象，后者在前提改变后增量建立最小抽象。

## Web 的实现落点

`apps/web/app/chat-api-client.ts` 只认识公共 Contract：读取 model list、POST stream、解析 SSE、cancel、retry。它不 import Nest，也不知道 OpenAI `choices[].delta`、provider endpoint 或 Bearer key。

`apps/web/app/chat-app.tsx` 拥有 Browser-only presentation state：conversation list、active conversation、UI message、selected model、composer、busy/loading/error。它根据 typed event 更新 UI，而不是从文本猜状态。

`page.tsx` 只把经过 `runtime-config.ts` 验证的公开 `apiBaseUrl` 传给 ChatApp；private endpoint/key 仍然不能跨 Browser boundary。

## UI 如何映射 Streaming 事实

`run.started` 到来时，UI 才确认 server conversationId/runId/assistantMessageId，并把本轮 User Message 与 Assistant draft 放入当前会话；`message.delta` 只追加到对应 assistant draft；terminal event 决定 COMPLETED/CANCELLED/FAILED。

因此 UI 没有自己发明 ChatRun 生命周期，而是消费 Runtime 的 typed fact。这一点对 Stop/Retry 特别重要。

## Stop 为什么不是“把文字清空”

真实 Stop 链路是：Browser 调 `POST /chat/runs/:runId/cancel` → Runtime abort 当前 AbortController → 同一个 signal 传播到 provider fetch → upstream stream close → Runtime 保存 `CANCELLED` terminal fact → UI 保留已经看见的 partial 文本并显示“已停止，可重试”。

Browser E2E 真实看到：

```text
你: slow
Assistant: hello
→ Stop
Assistant: hello
已停止，可重试
```

fixture 同时记录 `STREAM_CLOSED slow-first`，证明不是只改 UI 文案，而是真的停止了上游生成。

## Retry 为什么不能再发一条 User Message

S4 补出公开 `POST /chat/runs/:runId/retry`。Browser 只给旧 runId；API 读取旧 run，调用 S2 的 `createRetryRun`，保留 `retryOfRunId`，复用旧 model/context selection，再创建新的 assistant draft。

真实 Browser Retry 后同一对话只有 3 条消息：`USER + cancelled assistant + completed retry assistant`。第二个 assistant 得到 `hello retry-ok`，没有多出一条 User Message。这样 UI 和领域事实保持一致，而不是把 Retry 降级成“重新发送 prompt”。

## Conversation list 为什么只是 presentation，不是新的 Domain

S4 的会话列表是 Browser 当前 session 的 presentation state；server identity 只在 `run.started` 后回填。S4 没有趁机引入 branch/tree、durable conversation list API 或新的持久化语义。真实验证只证明新建、切换和当前页面内消息恢复。

## 阶段末统一 Mechanical Gate

这次按 S1 效率复盘后的新规则，没有在每个组件后完整测试。UI、Retry、shared contract 全部实现完以后才统一跑：backend tests 12/12 PASS，Web/API typecheck PASS，Next/Nest build PASS，shared-contract、secret、cross-import、no-RAG/no-Tool 越界检查 PASS，`out/index.html` 与 `git diff --check` PASS。

这说明“测试最后统一跑”不是降低质量，而是把验证频率从子任务级收敛到 Stage 级；真正失败时再只补跑受影响检查。

## 为什么 Browser Acceptance 最终不用 next dev

最初真实 Chrome 打开 `next dev` 页面时，Next HMR WebSocket 在当前自动化环境持续失败，页面静态结构存在，但客户端状态出现噪音。API/CORS 本身并没有坏：浏览器直接 fetch `/chat/models` 是 200。

S4 的真实生产形态本来就是 `next build → out/ → serve/Sites`，因此最终验收切到 static `out/`。这不是“绕过 dev 问题”，而是把 acceptance 对准真正交付 artifact。

随后又发现 `serve` 页面 Origin 是 `http://localhost:3100`，而测试 API 最初只 allow `http://127.0.0.1:3100`。两者端口相同但 Origin 不同，CORS 正确拒绝。测试 allowlist 对齐真实 Origin 后模型加载恢复。

## Browser E2E 的真实证据

生产页面完成 hydration 后，模型列表加载到 `test-model · fixture`；第一轮 `第一轮问题 → hello world`，第二轮 `你好 → hello world` 请求带回同一 server conversationId。随后完成 Stop/Retry、新建对话、旧对话切换与消息恢复。

最终网络看到 `/chat/models=200`、多个 `/chat/runs/stream=200`、cancel=201、retry=200；Console 为 0 error / 0 warning。Accessibility snapshot 能解析 sidebar/navigation/current conversation region、heading、combobox、textbox、status 与 buttons。

## 这次真正踩过的坑

1. **Next dev HMR 噪音**：HMR WebSocket 失败不能直接等同于 production UI 失败。先区分 dev harness 与 production artifact。
2. **Origin 细节**：`localhost` 与 `127.0.0.1` 是不同 Origin；CORS allowlist 必须匹配 Browser 实际地址。
3. **Playwright stable-click 假超时**：按钮在 snapshot/DOM 中可见且 enabled，但自动化层等待稳定性超时。后续用 DOM 原生 click + network/snapshot 交叉确认，不能把工具等待失败冒充业务失败。
4. **slow fixture 窗口太短**：工具往返超过 5/20 秒导致 slow 自行完成，看不到 Stop。只把临时 fixture 窗口延长到 120 秒，不修改产品 runtime。
5. **wrapper/session 状态不可靠**：工具连接 502 时先读 `/tmp` Gate log/marker；已经完成的 12/12 tests/build 不重复执行。

这些问题共同说明：E2E 里要同时区分 product、test fixture、automation harness、process wrapper 四种 failure domain。

## S4 后留下的稳定边界

```text
Browser/Sites
  ↓ @chatweb/chat-contract
Nest Chat Runtime
  ↓ ModelProvider
OpenAI-compatible endpoint
```

Browser 只拿公开 model metadata 与 Chat wire data；Runtime 拥有 run lifecycle、Retry truth、Abort 和 provider credential。S5 加 ContextProvider 时必须沿用这个 ownership，而不是让 RAG 重新穿透 UI/Domain。

## 可以用于面试的核心表达

“我不是先画一个聊天界面，而是先把 Conversation/ChatRun 与 Streaming/Abort 语义冻结，再让 Browser 只消费 typed public contract。S4 真正难的是 Stop/Retry 和边界：Stop 必须把 Abort 传到上游并保留 partial，Retry 必须创建新 ChatRun 而不能重复 User Message；同时在 Web 第一次真实消费 wire contract 时才建立最小 shared package。最后我用 production static artifact 做真实 Chrome E2E，而不是用 dev HMR 结果冒充生产验收。”

## 最终版本基线

- S4 implementation/evidence：`chatweb@b4bb285`
- S4 final baseline / handoff metadata：`chatweb@d3a90a2`
- 下一阶段：S5 `NOT_STARTED`，由下一 Chat 接手。
