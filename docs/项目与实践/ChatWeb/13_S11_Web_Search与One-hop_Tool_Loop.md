# S11｜Web Search 与 One-hop Tool Loop

状态：`S11_FINAL_ACCEPTED / COMMITTED_AND_MERGED`。本文是工程学习记录，不替代 ChatWeb Spec/CURRENT。

## 1. 这次真正解决的是什么

“模型能不能联网”不是模型权重自己拥有浏览器的问题。手机上的 MLX Hub / Qwen 提供 generation runtime，但真实网络访问、Search provider、credential/config、执行权限与结果 provenance 都属于 ChatWeb Trusted Runtime。S11 因此不是给 Qwen 加一个魔法联网开关，而是第一次真正消费 S8 已冻结的 ToolProvider socket。

链路：`User → ChatRun → Qwen structured decision → Runtime web/search → Search provider → provenance → Citation → Qwen grounded final answer`。Browser 只知道 `off|auto`，不执行 Tool，也看不到 Search endpoint/timeout/raw RSS。

## 2. 为什么不是 MCP，也不是 Agent loop

当前 MLX Hub 没有可靠 native `tools/tool_calls` surface，所以 S11 用严格 JSON decision fallback：只接受 `answer` 或 `web_search(query)`。这只是“模型表达调用意图”，执行权仍在 Runtime。每个 ChatRun 最多一次 Search，Search 后只允许一次最终 generation，不再回到 planner，因此没有 `search→model→search` autonomous loop。

MCP transport、Tool catalog、MUTATING Tool、Approval Flow、durable Agent runtime 都继续保持 0。S11 证明的是 ToolProvider boundary 可被真实消费，不是把 ChatWeb 偷偷升级成 Agent 平台。

## 3. Provenance 为什么必须直接变 Citation

Search adapter 把 provider-specific response normalize 成 `outputText + sources[]`。最终 Citation 直接由 `sources[]` 生成，绝不从模型回答文本反推 URL。这样即使小模型会改写文字，也不能伪造“看起来像引用”的链接。外部 Search 文本被标记为 untrusted reference data；其中任何 prompt-like 内容都不能改变 Runtime policy。

## 4. 小模型 grounding 的真实坑

真实 OpenAI 2026-08 人事问题暴露了 4B 模型的角色翻译漂移：source 是韩文 `최고매출책임자`，模型曾扩成 CEO、CMO 或加中文括号解释。只说“根据来源回答”不够。最终 guard 要求姓名/职位逐字符来自同一 source block，并在 Search results 尾部再次放置 final-output guard，禁止翻译、音译、缩写、括号解释和替代 title。

最终 Chrome Retry 只输出 `달리 라지치 / 최고매출책임자`，没有 CEO/CRO/CMO，也没有括号翻译。这里的教训是：小模型 grounding 不能只靠抽象原则，要把高风险事实类型和输出约束写成可机械回归的规则。

## 5. Retry 与实时事实

Retry 不是复用旧 Search 结果。旧 ChatRun 的 `webSearchMode` 被冻结，但 Retry 创建新的 ChatRun、ToolInvocation 和新的 Search；这样“重试”不会把几分钟前的实时事实当成仍然新鲜。真实 Browser 维持一条 User Message，失败/停止 attempt 与 Retry attempt 都作为独立 Assistant 事实保留。

## 6. Failure 必须 fail closed

Search failure 不能静默降级为“那我用模型记忆回答”。新增 regression 明确制造 `TOOL_UNAVAILABLE`：decision generation 是第 1 次模型调用，Search 失败后 `modelCall` 仍为 1，ChatRun 与 ToolInvocation 都进入 FAILED，并通过 `run.error` 暴露明确失败。

这比“尽量给用户一个答案”更重要，因为 AUTO 已经表达了需要实时外部事实；在这个前提下偷偷用旧知识回答，会把可用性问题伪装成事实正确性。

## 7. 验证与工程纠偏

最终机械矩阵：API 52/52、Web 12/12、Traceability `55→29→29`、Source Gate PASS。真实 Browser 覆盖 AUTO、OFF、HTTP 503→Retry、Citation、无重复 User、Browser 无 Bing 直连、private Search config/storage/DOM/resource leak=0、Console 0 error/0 warning。implementation=`chatweb@eaeed788108536e0d6ec42741215734acb7bfe1f`，merge=`chatweb@aabfe413f426f18aafd45b438c920b2a0ac2ccf1`。

收尾还暴露两个 harness/治理问题：旧 4330 Next dev listener 卡死，重启同一 worktree runtime 后恢复；Source Gate 把 `ToolInvocationFact.effect` 类型里的 `MUTATING` 字面量误判成真实 MUTATING execution，最终把检查范围收窄到 execution source，而不是为了过 Gate 删除正确的通用类型。

## 8. 可复用结论

- 模型表达 Tool intent，Runtime 执行 Tool。
- Discovery ≠ enablement；enablement ≠ approval。
- One-hop tool use 与 Agent loop 是不同复杂度等级。
- 实时 Search 的 Retry 必须 fresh invocation + fresh facts。
- Citation 必须绑定 Runtime provenance，不绑定模型措辞。
- 小模型 grounding 需要针对姓名、职位、日期、数字等高风险事实做更强约束。
- Failure domain 要区分 product / model endpoint / browser harness / dev server / quality gate false positive。
