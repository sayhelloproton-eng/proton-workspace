---
name: chinese-technical-writing-naturalizer
description: Edit existing Chinese technical writing so it becomes natural, concrete, concise and engineer-like without losing facts, terminology, evidence, uncertainty, code or technical boundaries. Use for 去 AI 味, 去模板化, 去翻译腔, awkward sentence/paragraph restructuring, density recovery, or style normalization across Chinese technical writing. Do not invent facts, disguise authorship, resolve project truth, design a new document from scratch, or force one prose template across a corpus.
---

# Chinese Technical Writing Naturalizer

## Core question

怎样把**已经有内容基础**的中文技术文章改得自然、具体、可信、好读，同时不损失任何决策相关信息？

这里的“自然”不是伪装成人类写作，也不是追求 AI detector 分数。目标是让读者顺着真实问题、因果、工程约束和证据读下去，而不是被翻译腔、模板句式、空评价和机械结构拖慢。

## Trigger

适用于已有中文技术内容的表达优化：

- 用户说“去 AI 味”“写自然一点”“不要像翻译稿/教材/汇报模板”；
- 文章事实基本稳定，但句子僵硬、段落可互换、因果关系弱；
- 压缩或重写后需要确认数字、术语、代码、链接、证据或边界有没有丢失；
- 一组文章需要统一基本表达质量，但仍要保留各自结构和声音。

不要用本 Skill 解决“这篇文档本来应该怎么设计”。从零组织一篇技术文档、确定读者任务和文章主线时，由 `technical-document-writing` 主导；本 Skill 可以作为后置编辑。

## Modes

- **Diagnose**：只定位问题和风险，不改正文。
- **Light edit**：修翻译腔、空话、模板句、重复、连接生硬和局部节奏。
- **Deep rewrite**：当问题出在段落组织、因果链或内容密度时，重建局部结构。
- **Corpus pass**：批量统一术语、证据纪律和基本语气，但禁止把所有文章改成同一套标题、开头、三段式或结尾。

默认选择能完成目标的最小模式。局部问题不要升级成全文重写。

## Non-negotiable invariants

开始改写前先冻结语义契约，详见 `references/01-editing-contract.md`。除非用户明确授权内容变化，否则必须保留：

- 事实、日期、数字、系统名、状态、当前实现与目标设计的区别；
- 专业术语、定义、关键比较、失败条件、例外和适用边界；
- 代码、命令、Schema、URL、引用、测试结果和真实证据；
- verified fact / accepted decision / inference / hypothesis / recommendation / future plan 的强度差异；
- 文章原本真正负责回答的问题，以及真正承载信息的表格、列表和图示语义。

不得为了“更像人”虚构事故、客户、角色经历、指标、benchmark、引用或生产环境事实。若需要例子但没有真实材料，只能明确写成假设示例。

## Workflow

1. **锁语义**：确认读者、文章核心问题、不可损失事实、术语、证据和边界。
2. **诊断问题层级**：先判断问题在句子、段落、章节还是信息密度，不要用句子润色掩盖结构问题。需要时读 `references/02-structure-and-language-signals.md`。
3. **恢复因果与主体**：优先写清谁在什么约束下做什么、发生了什么变化、为什么、结果如何。深度重写时读 `references/03-scenario-reconstruction.md`。
4. **删模板，不删信息**：空洞的“首先/其次/最后”“本质上”“不是 A 而是 B”“综上”可以删；真正承担概念边界、对比和推理的结构必须保留。
5. **让定义服务阅读过程**：定义放在读者第一次真正需要它的位置，不要为了“完整”先堆术语卡片。
6. **让例子承担解释**：能用真实例子、反例、失败条件说明区别时，不要再用一段抽象口号重复同一个结论。
7. **控制压缩损失**：短不是目标。删掉重复和空话，但不要一起删掉例子、机制、反例、操作细节和因果桥梁。
8. **做语义回归**：重要改写后检查数字、URL、代码、术语、证据、状态和边界，详见 `references/04-semantic-regression-and-density-audit.md`。

## Mechanical audit

可使用：

```bash
python3 scripts/audit_markdown.py scan ARTICLE.md
python3 scripts/audit_markdown.py compare BEFORE.md AFTER.md
```

脚本只负责发现模板化信号和机械可恢复项的变化：它不评分文风，不判断作者身份，也不能证明语义完全等价。脚本报损失时要求人工复核；脚本 PASS 也不代表文章一定好。

## Corpus work

批量处理时先从已接受文章里抽取一个很短的 voice profile，只统一术语、事实强度、证据纪律和基本阅读节奏。禁止统一章节数、标题名、开头句式、示例位置或结尾模板。文章之间的差异来自各自问题和证据，而不是随机换同义词。

## Output

根据请求直接返回修改后的正文或诊断。重要改写时补充：

- 使用了哪种 mode；
- 结构上改了什么、为什么；
- 哪些事实、术语和边界被刻意保留；
- 是否仍有事实或来源缺口；
- 机械语义回归是否发现潜在损失。

## Environment boundary

本 Skill 只定义编辑方法，不拥有文件写入、Git、发布或宿主执行权限。ChatGPT Chat、Codex、DeepSeek 等各自使用当前环境最直接的搜索、文件和验证工具；不得为了使用本 Skill 强行套用 Chat-only 吞吐、自动化或本机执行协议。
