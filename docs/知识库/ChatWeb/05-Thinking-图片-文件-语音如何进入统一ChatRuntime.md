# Thinking、图片、文件、语音如何进入统一 Chat Runtime

Chat 产品一旦加入深度思考、Vision（图像理解）、文档和 Voice（语音），很容易为每种能力再造一套消息模型或执行入口。ChatWeb 的实际演进走了相反方向：每增加一种输入或生成方式，都先问“它是不是需要新的聊天事实系统？”最后的答案一直是否定的——**这些能力都回到同一条 Conversation / ChatRun 主链，只在各自边界增加必要 Adapter（适配器）。**

这个结论不是先验规则。Thinking 先经历参数实测才找到真正有效的控制位；PDF / DOCX 又经历过“解析已成功但小模型仍回答读不到”的真实误判；Paste 自动化因为没有真实 OS clipboard 能力被判成 Harness gap；Voice 也因为当前模型不是 ASR（自动语音识别）而保持 turn-based（轮次式）边界。正是这些过程把“统一主链”和“能力边界”一起验证出来。

## Thinking 为什么先从真实参数效果开始

真实手机 Runtime 验证表明，顶层 `enable_thinking` 不可靠，而 `chat_template_kwargs.enable_thinking` 能真正控制 Qwen3.5 thinking。当前产品因此只暴露 `thinkingMode=off|on`；Trusted Runtime（可信运行时）持有真实 model mapping（模型映射）和参数。

当前稳定 editable generation fields（可编辑生成参数）只有：

| 产品控制 | Runtime 映射 | Fast/OFF | Think/ON |
|---|---|---:|---:|
| Thinking | `chat_template_kwargs.enable_thinking` | false | true |
| Temperature | `temperature` | 0.7 | 1.0 |
| Top P | `top_p` | 0.8 | 0.95 |
| Max output tokens | `max_tokens` | 2048 | 2048 |

`stream=true` 固定开启，不属于用户配置。很多字段虽然 Runtime 会宽松 HTTP 200，但没有可观测效果，因此不能因为“请求没报错”就写成 supported（已支持）。

当前 MLX reasoning（模型推理内容）可能混入 `content`，所以 Think 使用 hidden reasoning pass → clean final pass：私有推理不进入 SSE（Server-Sent Events，服务端流式事件）和最终 Assistant Message。

## Attachment 为什么最终归 UserMessage，而不是 Tool 或 Run

Attachment（附件：用户消息携带的不可变资源引用）是用户输入事实。Browser 先 multipart 上传，得到 server-side attachment id；正式 ChatRun 只提交这些 id。Raw bytes（原始二进制）留在 bounded `AttachmentStore`，Retry 引用同一个 trigger UserMessage，自然复用相同附件 ownership。

这比把附件复制进每个 Run 更稳：历史消息、Retry 和实际二进制资源不会产生多份互相漂移的身份。

当前正式 V0 文档类型是 TXT / MD / JSON / PDF / DOCX；CSV 和任意代码扩展名不会因为 MIME 看起来像文本就自动进入支持合同。单文件最大 10 MiB、每消息最多 8 个；文档 extraction budget（提取预算）为 24,000 chars/document、48,000 chars total。

## Vision 与文档为什么走不同 Adapter，却回到同一 Model message

图片由 Runtime 转成 provider-neutral image part（与具体模型无关的图片部分），再由 OpenAI-compatible adapter 映射成实际 provider wire。真实测试覆盖 JPEG、PNG OCR、UI screenshot、WebP、multi-image、mixed image+text、Fast / Think Vision。GIF 当前明确 unsupported。

文档则先经过 `DocumentTextExtractor`（文档文本提取器），把提取结果作为 bounded untrusted block（有界不可信文本块）注入 Model message。Parser failure（解析失败）明确 fail closed，不把第三方 stack 泄漏给 Browser。

一次很有价值的真实失败发生在 PDF / DOCX：Extractor focused tests 已能抽出随机码，但首次手机模型回答“无法读取附件”。后续 production-dist message 捕获、direct phone replay、transparent outbound proxy 都证明 PDF / DOCX 文本确实进入最终请求；恢复直连后又再次 PASS。因此这次被裁决为单次小模型 / 运行态偶发，而不是为了“修好模型回答”去乱改 parser。

这个过程说明：**模型答错，不等于输入链没送到。** 先证明事实 Owner，再决定修哪一层。

## 为什么附件入口最后只保留 Paste + Drag&Drop

底层 multipart / store 能力不等于产品必须提供 file picker。用户明确要求复制粘贴与拖拽，最终移除 hidden file input、“＋附件”和系统 picker；两种入口继续复用相同 upload / store / preview / remove 数据链。

Drag&Drop 已有真实 Browser `POST /chat/attachments=201` 和模型消费证据。Paste 的 OS clipboard 自动化当时无法由 Playwright / Extension 桥接，甚至纯文本 `Meta+V` 也进不了 textarea，因此只裁决为 Harness gap（验收能力缺口），没有用 synthetic `ClipboardEvent` 冒充真人 PASS。

这里保留下来的过程价值不在“自动化没做成”，而在于：**测试工具做不到的事不能被伪造事件替代成真人验收通过。**

## Voice 为什么没有另造一套 Agent Runtime

当前 Voice 主链是 turn-based / half-duplex（轮流半双工：用户说完一轮，模型完整回答并播报，再进入下一轮）：

```text
Browser SpeechRecognition
→ /chat/voice/normalize
→ server-owned bounded normalize
→ normal ChatRun
→ final assistant text
→ Browser speechSynthesis
```

Normalize 只能整理 transcript（语音转写文本），不能替用户回答或新增意图。server-side STT 是 optional seam（可选扩展接口）；当前手机 Qwen text model 不是 ASR，不能因为它“是模型”就拿来做转写。

历史真人验收中两轮真实语音都走过 normalize `201` → chat run `200`，用户确认 TTS（文本转语音）实际可听。这个能力仍不是 realtime audio、full duplex、streaming ASR→LLM→TTS 或可打断 WebRTC Voice。

## 一条主链是怎样被这些能力反复验证的

Thinking 只是 generation mode；图片和文件只是 UserMessage 的输入资源；Voice Input 最终变成正常 UserMessage；所有回答仍由同一个 ChatRun 生命周期、Streaming、Stop、Retry 和 Citation 规则治理。

参数实测、PDF / DOCX 误判、Paste Harness gap 和 Voice 边界没有推动出第二套聊天系统，反而不断验证了同一原则：**能力可以增加 Adapter，但不能轻易增加第二套事实模型。**
