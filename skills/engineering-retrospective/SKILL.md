---
name: engineering-retrospective
description: Review a meaningful engineering episode and decide whether it contains a reusable lesson worth retaining. Use after non-trivial development, debugging, acceptance, recovery, architecture change or repeated course-correction, or when explicitly asked to summarize lessons learned. Default to a lightweight retention gate; produce nothing for routine work. Never invent root causes, auto-promote one incident into policy, or let this Skill grant file/Git/tool permissions.
---

# Engineering Retrospective

## Core question

这次真实工作里，有没有出现一条**以后会改变工程判断或执行方式**的经验？

默认答案可以是“没有”。本 Skill 的目标不是给每个任务写总结，而是在重要经验即将随着聊天和执行现场消失之前，把它筛出来、讲清楚。

## Trigger

两种触发方式：

- **显式触发**：用户要求复盘、总结经验、判断是否值得沉淀；
- **轻量自动检查**：一个非平凡开发、调试、验收、恢复或架构阶段结束时，内部快速过一次 retention gate。

以下信号值得重点检查：

- 原工程假设被真实证据推翻；
- 同类错误、返工或用户纠正在多个步骤/任务中重复；
- 一次 near miss 暴露了 ownership、state、contract、permission、recovery、observability 或 evidence 缺口；
- 新工具、API、工作流或约束让旧做法明显过时；
- 某个问题表面修复后，真正机制比原先认识更深；
- 现有 Skill、Tool、Automation、测试或验收缺少一条可验证边界。

拼写修复、已知规则再次正常生效、纯状态汇报、没有机制的一次性环境噪声，直接跳过。

## Retention gate

先做最小判断，只返回三个内部结果之一：

- `skip`：没有长期复用价值，不产出复盘；
- `needs_evidence`：可能重要，但原因、机制或验证还不足；
- `capture`：有证据、有机制，而且会改变未来动作。

筛选标准见 `references/01-retention-gate.md`。自动检查的默认输出是静默 `skip`；不要为了证明 Skill 被调用而生成文档。

## Distillation workflow

只有 `capture` 才继续：

1. **还原事实**：发生了什么，证据是什么，哪些结论只是推断。
2. **找被推翻的假设或缺口**：之前为什么会走错、漏掉或浪费时间。
3. **解释机制**：定位真正决定结果的结构，而不是停在错误码、产品名或一次命令。
4. **提炼未来动作**：写成设计检查、测试、验收门、恢复策略、工具选择或退出条件；默认 1–3 条。
5. **写边界和反例**：说明何时成立，以及什么合理场景下不该直接套用。
6. **保留证据入口**：让未来读者能回到项目、测试、日志、代码或原始事件判断类比是否成立。
7. **决定落点**：只形成经验记录，或提出 Skill / Tool / Automation / Test 的改进建议；正式改动必须另开工程决策。

机制与抽象方法见 `references/02-mechanism-and-boundary.md`，从经验到正式改进的边界见 `references/03-from-lesson-to-change.md`。

## Suggested record

```text
发生了什么
证据与验证
原来的假设 / 缺口
真正机制
以后改变什么
适用边界 / 反例
原始证据入口
```

这是信息检查表，不是强制文章模板。若要把经验写成正式公开知识文章，再交给 `technical-document-writing`；若只是中文表达需要润色，再使用 `chinese-technical-writing-naturalizer`。

## Guardrails

- 未验证的 root cause 必须标成假设；不要为了“完整复盘”补齐不存在的原因。
- 一个事件可以值得记录，但不能自动升级成全局 HARD RULE。
- 重复出现会增强证据，但“出现次数多”本身不等于机制正确。
- 不复制完整聊天流水、命令日志或时间线作为经验文档。
- 不把“更仔细”“加强沟通”“多测试”当作可执行经验。
- 不自动修改 Skill、Tool、Automation、项目规范或知识库；本 Skill 只提出候选改进，除非当前任务另有明确修改授权。

## Environment boundary

这个 Skill 可以被 Chat、Codex、DeepSeek 或其他 Agent 使用，只定义反思和提炼方法。各宿主使用自己的原生工具和权限；Chat-only 吞吐、自动化和本机协议不得外溢到本地 Agent。
