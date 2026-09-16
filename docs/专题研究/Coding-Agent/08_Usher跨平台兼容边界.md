# Usher 跨平台兼容边界

> 唯一职责：把本专题的插件与标准判断落到 Usher，明确哪些能力可直接迁、哪些必须保留 Runtime Adapter。

## 背景

Usher 当前主要依据 Claude Code Plugin 协议表达能力。专题的结论不是“继续永远绑定 Claude”，也不是“马上重构成统一标准”。

正确问题是：

> Usher 里面哪些是真正的平台无关能力，哪些只是 Claude Runtime 的表达方式？

## 推荐架构心智模型

```text
            Usher Capability Model
                    │
       ┌────────────┴────────────┐
       │                         │
Portable Core              Rich Runtime Adapters
Skill + MCP                Claude / OpenCode / Qwen / Codex ...
       │                         │
开放标准优先               保留平台差异
```

## 当前可移植性判断

| 能力 | 可移植性 | 原因 |
|---|---|---|
| Skill / SKILL.md | 高 | 程序性知识最容易跨 Runtime |
| MCP | 高 | 已有开放协议边界 |
| Agent Prompt / Role | 中高 | 文本和职责易迁，但 Worker 生命周期不同 |
| Agent Runtime 参数 | 中 | Model、Context、Permission、并行语义不同 |
| Hook | 中低 | 生命周期事件和阻断语义高度 Runtime-specific |
| Plugin Manifest | 低到中 | 可转换，但不是统一能力模型 |
| Permission / Sandbox / Monitor / LSP | 低 | 深度依赖具体 Harness / Runtime |

## 不应该做的重构

不要先设计一个巨大统一 Manifest，然后强迫所有平台适配它。这样很容易得到“字段统一、语义失真”。

## 正确实施顺序

```text
1. 审计 Usher 真实仓库
2. 按 Skill / MCP / Agent / Hook / Permission 等能力层分类
3. 标记哪些是 Portable Core
4. 在 Qwen Code / CodeBuddy / OpenCode 等做真实导入实验
5. 对比语法、结构、语义兼容
6. 只有重复差异稳定出现后，才抽 Capability Model
7. 平台特有能力保留 Adapter
```

## 为什么 Qwen Code 很适合作为兼容实验场

它对开放 Skill、MCP 和其他 Coding Agent 生态有较强兼容诉求，可以快速暴露：哪些能力真的能迁，哪些只是在文件层“看起来兼容”。

## 当前状态

本专题只完成架构判断，没有授权也没有执行 Usher 重构。后续如果重新打开，必须从真实仓库能力审计开始，不能依据这篇文档直接重写实现。
