# 智能联网如何从 One-Hop 演进成有界多轮 Search

“模型联网”听起来像一个模型功能，但在 ChatWeb 里，真正访问互联网的是 Trusted Runtime（可信运行时）。模型负责判断现有证据是否够、下一步搜什么；Search adapter（搜索适配器）负责发请求、限制资源、标准化结果和记录 provenance（来源轨迹）。

这条能力的演进很清楚：最初先用 One-Hop（单轮搜索）证明“模型表达意图、Runtime 执行、Citation 来自真实来源”这条最小边界；真实 Retry 又暴露出实时搜索不能复用旧结果；复杂问题需要第二个查询后，才扩成有界多轮 Search。每一步都先解决一个已经出现的问题，而不是先造一个通用 Agent loop。

## One-Hop 为什么先限制成一次搜索

当时模型侧没有可靠 native `tools/tool_calls` surface（原生工具调用接口），于是使用 strict structured decision（严格结构化决策）：模型只能输出 `answer` 或 `web_search(query)`。一次 `ChatRun`（一次生成尝试）最多一次 Search，Search 后只允许一次 final generation，不再回 planner（规划判断）。

这个设计刻意不是 Agent loop。它先证明三件事：模型只表达 intent（意图）；Runtime 执行真实外部请求；Search provenance 直接形成 Citation，而不是让模型自己编 URL。

最小链跑通以后，才有资格讨论下一步扩展，否则“多轮”只会放大一个还没证明的执行边界。

## Retry 为什么逼出了 fresh search

Search 是实时外部事实。Retry（重试）如果复用旧 Search result，会把“重新尝试”变成“拿几分钟前缓存事实再生成一次”。因此 Retry 冻结旧 `webSearchMode`，但创建 fresh ChatRun、fresh invocation（新的真实搜索调用）和 fresh Search。

Search failure 也不能偷偷退回模型记忆。在 AUTO 模式已经判断需要实时证据后，若 Search unavailable，正确结果是显式失败，而不是给一个看起来流畅却可能过期的答案。

这一步把“搜索结果”从普通生成中间变量提升成了有时效性的运行事实。

## One-Hop 在复杂问题上为什么不够

复杂问题可能需要先搜 A，看到结果后再决定搜 B。只有当这种需求真实出现以后，系统才扩成：

```text
Browser webSearchMode=off|auto
→ ChatRun freeze mode
→ planner: answer | web_search(query)
→ Runtime Search
→ normalized evidence + provenance
→ planner observe accumulated evidence
→ answer 或新的 materially different query
→ bounded repeat
→ final generation
```

AUTO 不保证一定 Search，也不保证固定轮数。默认 `WEB_SEARCH_MAX_ROUNDS=6`，硬上限 10；`WEB_SEARCH_MAX_RESULTS` 默认 5、上限 10；query 最大 512 chars；同一 run 的归一化重复 query 必须停止搜索。所有这些 budget（预算）都归 server config，Browser 和模型不能修改。

“多轮”因此不是无限自主，而是**模型可以继续判断，Runtime 始终拥有次数、输入和终止边界。**

## 多轮 Search 为什么仍然没有演进成通用 Tool 平台

当前 Search input 只有 bounded query（受限查询），adapter 只做 server-owned READ_ONLY outbound research（服务端拥有的只读外部研究）。它不能传任意 URL / header，也不能变成本机执行器。

Browser public wire 只暴露 `webSearchMode=off|auto` 与 capability availability；Search endpoint、credential、timeout、results / round budget、raw provider response 都不进入 Browser。当前 live product 也不提供 generic `/chat/tools` catalog、Local Dev、Chrome control、MCP 或任意本机资源执行。

也就是说，One-Hop 扩成多轮只扩大了“研究深度”，没有扩大“权限种类”。

## 一次模型漂移为什么让 Evidence 被明确当成不可信数据

Search result 可能包含网页作者写的 prompt-like 指令。Runtime 将它 normalize / sanitize（标准化 / 清洗）后作为 `untrusted reference evidence`（不可信参考数据）注入，不能因为结果里写着“忽略之前规则”就改变系统 policy。

真实手机模型还暴露过 grounding drift（证据约束漂移）：韩文职位 `최고매출책임자` 曾被扩写成 CEO、CMO 或加中文解释。最后对姓名、职位、日期、数字、组织关系等高风险事实要求同一 source block 明确支持，并在 final-output 处增加 exact-text guard（精确文本保护）。最终 Browser Retry 只保留来源原文，不再擅自翻译职位。

这次事故把“有搜索结果”进一步收紧成“答案中的高风险事实必须被来源明确支持”。

## Citation 为什么始终是 Runtime 事实

每次真实 Search 都有自己的 invocation lifecycle（调用生命周期）和 provenance。最终 Citation 直接由 accumulated provenance（累计来源记录）生成，模型不能从文字中自造 href。

当前 Bing RSS adapter 只提供 title / url / snippet 级证据，所以多轮 planner 虽能交叉补证，也不应被描述成完整正文抓取型 Deep Research。若未来引入 page fetch，应该单独扩能力和安全边界，而不是把“搜索次数更多”宣传成另一个产品。

## 这条能力最终留下的不是“联网按钮”

联网能力从一次搜索演进成有界多轮以后，稳定下来的其实是一条受控执行链：

```text
Model 决定是否需要证据
Runtime 决定能不能搜、搜几次、搜什么
Search provider 返回不可信材料
Runtime 记录 provenance
Model 只能基于证据生成
Browser 只看到答案和公开 Citation
```

One-Hop、fresh Retry、多轮预算、grounding guard 都是这条链逐步长出来的证据。模型拥有判断空间，但网络权限、预算和事实来源始终留在可审计的系统边界里。
