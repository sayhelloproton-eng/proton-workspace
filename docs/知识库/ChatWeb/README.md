# ChatWeb｜把“聊天页面”做成独立 Chat 产品与 Runtime

ChatWeb 最初很容易被理解成“ProFlow RAG 的聊天前端”，但真正落地以后，核心问题很快超出了 UI：多轮消息怎样成为长期事实、流式输出怎样结束、Stop / Retry 怎样不改写历史、模型和知识服务怎样组合、联网和附件怎样接入，以及哪些密钥和运行时细节绝不能进入 Browser。

因此 ChatWeb 最终形成的是一个独立的 Chat Runtime（聊天运行时：负责一次聊天从请求、上下文解析、模型生成到终态落地的服务端执行边界）和对应的 Web Chat 产品。RAG（检索增强生成）只是一个可以移除的外部 Context Provider（上下文提供者），而不是整个产品的中心。

这组文章记录稳定的产品与工程认知，不复制当前 Spec（正式设计规范）。工作树状态、ChatGPT Sites 发布状态和真实 Runtime 仍以 `/Users/agent/Desktop/proton-workspace/repos/chatweb` 的 Spec、CURRENT、源码、测试和真实 Browser 证据为准。

## 为什么正文会保留“怎么走到这里”

ChatWeb 的许多边界不是在白板上一次设计出来的。`messages[]` 在加入 Streaming / Stop / Retry 后暴露出事实身份不够；Context outage（上下文服务故障）暴露出 discovery failure 不能等于“能力已删除”；一次公开 Citation 泄漏暴露出 internal object（内部对象）不能直接序列化给 Browser；One-Hop Search（单轮搜索）面对复杂问题又推动出有界多轮 Search；已经真实 PASS 的 Tool / MCP 也因为产品价值和权限成本变化而退出 live product。

因此正文保留这些**改变当前设计的关键事故、实验和纠偏**，而不是只展示最终架构。更细的阶段、commit、验收数字和被替代路线统一进入[历史证据与决策档案](./历史证据与决策档案.md)。这样第一次阅读的人能看懂“为什么”，需要深挖时仍有完整证据入口。

## 先建立当前产品模型

```text
Browser / ChatGPT Sites
        ↓ public HTTP / SSE contract
Nest Trusted Runtime
   ├─ Conversation / ChatRun
   ├─ Model Provider
   ├─ Context Provider → ProFlow RAG
   ├─ Intelligent Web Search
   └─ Attachment / Voice adapters
        ↓
server-owned private runtime / external services
```

`Trusted Runtime`（可信运行时）持有模型 endpoint（服务地址）、credential（凭据）、timeout（超时策略）和能力策略，并执行真实调用；Browser 只表达用户选择、上传输入和展示结果。SSE（Server-Sent Events，服务端通过一个 HTTP 响应持续推送事件）让流式生成有明确事件协议，而不是让前端靠字符串猜状态。

这个分权是理解后面所有设计的入口：Browser 不拥有模型 API key、RAG 内部结构、Search budget（搜索预算）或本机执行权限；服务端也不把内部 Provider 对象原样暴露给前端。

## 从哪个问题开始读

| 你想判断什么 | 建议阅读 |
|---|---|
| 为什么 ChatWeb 不能围绕 RAG API 组织整个产品 | [01｜为什么必须从 RAG 前端变成独立产品](./01-ChatWeb为什么必须从RAG前端变成独立产品.md) |
| 多轮消息、流式输出、停止和重试怎样保持历史事实一致 | [02｜Conversation、Message、ChatRun](./02-Conversation-Message-ChatRun如何支撑Streaming-Stop-Retry.md) |
| Model Provider、Context Provider、RAG 与 Citation 怎样组合且不泄漏私有配置 | [03｜Provider / Context / RAG / Citation](./03-Provider-Context-RAG-Citation如何组合而不泄漏运行时.md) |
| “联网”为什么是服务端受控搜索，而不是模型自带的魔法能力 | [04｜从一次搜索到有界多轮 Search](./04-智能联网如何从One-Hop演进成有界多轮Search.md) |
| Thinking（思考模式）、图片、文件和语音为什么还能保持同一条 Chat 主链 | [05｜多模态进入统一 Chat Runtime](./05-Thinking-图片-文件-语音如何进入统一ChatRuntime.md) |
| Localhost、HTTPS gateway（HTTPS 网关）、Sites、技术验收与产品发布为什么必须分层 | [06｜从 Localhost 到 Sites 的分层验收](./06-从Localhost到Sites交付为什么需要分层验收.md) |
| 为什么曾经真实做通过的 Tool / MCP / Local Dev 后来仍退出当前产品 | [07｜Tool / MCP / Local Dev 的边界演进](./07-为什么Tool-MCP-LocalDev最终退出ChatWeb产品边界.md) |
| 想追阶段 commit、真实事故、测试数字和被淘汰的路线 | [历史证据与决策档案](./历史证据与决策档案.md) |

## 当前产品边界不是“历史做过什么”的合集

ChatWeb 历史上真实验证过 Tool（工具执行）、MCP（Model Context Protocol，模型上下文协议）、Chrome 只读调用和共享 MCP owner（进程归属方）。这些实验留下了重要工程经验，但当前 Web Chat 产品已经主动移除通用 Tool catalog（工具目录）、Local Dev、Chrome control、MCP discovery / execution 和 `toolSelections`。

当前保留的外部研究能力是 server-side Intelligent Web Search（服务端智能联网搜索）：它只接受受限查询，由 Runtime 控制预算、来源和失败语义，不等于开放任意本机资源执行。

这个边界提醒很重要：**曾经实现并验收通过，不代表永远属于产品。** 当前用户价值、权限成本和运行时复杂度变化以后，能力可以退出产品，但其中可复用的工程知识继续保留在知识库和共享 Skill 中。
