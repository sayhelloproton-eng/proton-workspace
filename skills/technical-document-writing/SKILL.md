---
name: technical-document-writing
description: Write or rewrite one technical document around a real reader task, verified facts, evidence, mechanisms, trade-offs, sufficient information depth and varied forms that reduce understanding cost. Use for project explanations, architecture explanations, technical articles, README-style narratives, engineering knowledge and other documents that need to be understandable and defensible. Do not classify documents into governance types, build dependency graphs, manage registries/lifecycle, publish externally, or invent unsupported facts.
---

# Technical Document Writing

## Core question

给定真实材料和一个明确读者，怎样把**这一篇**技术文档写得清楚、完整、可信，而且经得住追问？

本 Skill 只负责一篇文档本身。它不建立文档分类体系，不要求 ADR / PRD / Architecture 等固定类型，不建立稳定 ID、Registry、Document Bundle、生命周期或文档依赖图。结构只服从读者任务、事实关系和文章要回答的问题。

## When to use

适用于：

- 从零写一篇技术文章、项目说明、架构解释、README 式说明或工程知识文章；
- 已有材料很多，但需要组织成一条清楚的叙事和论证主线；
- 现有文档结构混乱，需要重写而不是只做句子润色；
- 面向个人知识库或公开知识沉淀，需要把学习、实践、判断、实现、证据、失败和边界说明清楚；
- 需要让技术内容既有足够信息维度，又能用图、表、代码、例子等合适形式降低理解成本。

如果结构已经成立，只是中文表达僵硬、模板化或翻译腔明显，后置使用 `chinese-technical-writing-naturalizer`。如果事实本身还没有查清，先获取事实，不要用写作掩盖事实缺口。

## Minimum inputs

开始前只需要确认五件事：

1. **读者**：谁会读？他为什么点开？
2. **读者任务**：读完以后，他要理解、判断或执行什么？
3. **核心问题**：这篇文章主要回答哪一个问题？
4. **事实与证据**：哪些已经验证，哪些仍是推断、计划或未知？
5. **边界**：哪些内容不属于本文，哪些缺口目前无法关闭？

信息不完整可以写，但不允许把未知写成已知，把目标设计写成当前实现。

## Workflow

### 1. Ground the facts

先确认支撑正文的事实。描述本地系统时优先核对当前源码、测试、CLI、运行结果或其他直接证据；描述外部产品、标准和 API 时优先使用当前的一手资料。详细规则见 `references/02-evidence-and-verification.md`。

### 2. Freeze the reader outcome

先写一句内部工作句：**“读完以后，这个读者应该能判断 / 理解 / 完成什么？”**

如果这句话说不清，先不要列章节。标题不是信息架构的起点，读者任务才是。

### 3. Build the argument, not a template

根据真实信息关系组织文章。常见关系包括：问题与约束、因果、机制、状态变化、比较、演进、流程、权衡和证据链。可以组合，但不要机械生成“背景 / 目标 / 设计 / 实现 / 总结”。

重要结论、当前状态和适用范围应尽早出现；细节再逐层展开。详细原则见 `references/01-writing-principles.md`。

### 4. Write claim and evidence together

每个重要技术判断都要么：

- 紧邻真实证据；
- 明确标记为 accepted decision / inference / hypothesis / recommendation / future plan；
- 或直接说明证据缺口。

不要把所有来源堆到文末，让读者自己猜哪条来源支撑哪句话。

### 5. Explain the mechanism

不要停在“做了什么”。尽量把责任、输入输出、状态变化、控制边界、失败路径和为什么这样设计写出来。

尤其避免只有结果没有机制的句子，例如“提升了可靠性”“完成了治理”“支持了自动化”。读者应该能继续追问：**谁做的、怎么做的、在哪个边界生效、失败时发生什么？**

### 6. Build information depth before compression

**丰富不是字多，而是信息维度足够。** 在材料允许的情况下，正式知识文章应尽量覆盖与核心问题真正相关的多个维度，例如：背景 / 问题、真实场景、核心判断、机制、关键技术细节、例子、失败或边界、证据 / 结果、演进与进一步思考。

这些维度不是固定章节模板，也不要求每篇文章全部出现。没有事实支撑的维度宁可缺省；已有真实材料则不要为了“简洁”把正文压成几个结论、几个 bullet 或一段摘要。先保住能支撑理解和追问的信息，再删除重复和空话。

### 7. Use varied forms when they reduce understanding cost

内容形状应跟随信息关系，而不是全文只用一种形式。正常段落负责因果和论证；表格负责精确比较与映射；真实代码、命令、配置、Schema 和输入输出承担实现说明或证据；图负责关系、流程和状态。

架构、流程、时序、状态、拓扑、层级等关系，如果用等宽文本能稳定表达，优先考虑 fenced code block 中的 ASCII / Unicode 文本图。它应依赖空格、连线、箭头和少量标签保持可读，便于 Markdown 保存、Git diff 和持续修改。复杂全景、首页总览或文本图明显不够清楚时，再使用正式图片。

不要求每篇文章强制有图，也不能为了“形式丰富”堆装饰。判断标准是：换一种形式后，读者是否能更快、更准确地理解同一事实关系。

### 8. Review from the reader's next question

完成初稿后，不是问“像不像正式文档”，而是问：

- 哪里会让读者误解当前状态？
- 哪里只有结论，没有证据或机制？
- 哪个术语出现时还没有足够上下文？
- 哪段可以删掉而不损失任何判断信息？
- 一个不了解隐藏上下文的技术读者接下来最可能追问什么？正文有没有真实入口可以继续深入？

使用 `references/03-review-checklist.md` 做最终检查。

### 9. Polish last

结构和事实通过后，再做语言层面的自然化、压缩和节奏调整。中文文章需要时调用 `chinese-technical-writing-naturalizer`，但润色不得改变事实强度和技术边界。

## Output quality gate

一篇完成的技术文档至少满足：

- 读者不用猜文章为什么存在；
- 主线能解释章节为什么按这个顺序出现；
- 当前实现、目标、计划、推断和建议没有混写；
- 重要结论能回到证据，或者明确暴露证据缺口；
- 机制和边界足以支撑技术追问，而不只是给出漂亮结论；
- 材料足够时包含多个真实信息维度，而不是只剩结论、摘要和 bullet；
- 段落、表格、代码 / 命令、文本图和图片按信息关系选择，形式丰富但不装饰化；
- 标题和格式帮助扫描，不代替正常解释；
- 没有为了“完整”机械添加空章节；
- 文档脱离另一套 Registry、关系图或隐藏上下文仍能独立读懂。

## Environment boundary

本 Skill 只定义写作与审阅方法，不拥有文件写入、Git、浏览器、发布或其他宿主权限。ChatGPT Chat、Codex、DeepSeek 或其他 Agent 使用各自环境最直接的搜索、文件和验证工具；不得为了使用本 Skill 强行套用 Chat-only 本机工程、吞吐或自动化协议。
