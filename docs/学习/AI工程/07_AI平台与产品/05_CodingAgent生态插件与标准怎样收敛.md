# Coding Agent 生态、插件与标准怎样收敛

> 唯一职责：解释 Agent 平台如何通过生态、Plugin、Skill、MCP、Agent、Hook 等能力扩展，并区分产品协议、事实惯例和开放标准；用 Usher 说明跨平台兼容真正发生在哪一层。
>
> 时效说明：标准状态按 2026-09-05 记录。产品私有协议与开放标准都可能继续演进，判断时优先看规范治理和语义兼容，而不是只看文件名相同。

## 生态不是插件数量，而是谁定义、分发和兼容能力

一个 Agent 平台的生态至少有三种价值：

```text
对用户      我能直接获得多少可用能力
对插件作者  我的资产能迁移到多少 Runtime
对平台厂商  我能吸收多少已经存在的第三方资产
```

因此，平台做强生态可以走不同路线：

- **范式输出**：Claude Code 先把 Skill、Subagent、Hook、Plugin 等工程抽象做成稳定产品能力，其他平台开始兼容其中一部分。
- **平台分发**：OpenAI 用统一 Plugin Directory 把 Skill、App 和外部业务能力分发到 ChatGPT 与 Codex。
- **开放底座**：OpenCode 允许第三方直接进入 Runtime，甚至在它之上做 OMO、OpenWork 等不同产品体验。
- **跨生态聚合**：Qwen Code 直接吸收 Claude、Gemini、Qoder 和 Agent Plugins v1 资产，降低后来者的生态冷启动成本。
- **协议兼容**：CodeBuddy 明确兼容 Claude Code Plugin 规范，减少已有插件迁移成本。

这比单看“Marketplace 有多少条目”更能解释一个平台的生态位置。

## Plugin 不是一种能力，而是能力的包装与分发边界

把 Plugin 理解成一个容器更准确：

```text
                  Plugin Package
                        │
        ┌───────────────┼───────────────┐
      Skill             MCP            Agent
      怎么做           能做什么          谁来做
        │                │               │
        └───────────────┼───────────────┘
                       Hook
               什么时候必须做什么
                        │
              Runtime-specific 能力
          Permission / LSP / Monitor / Settings
```

同样叫 Plugin，不同平台的抽象层级可能完全不同。Claude Code Plugin 更接近完整的 Agent Capability Package；OpenCode Plugin 更接近直接进入 Runtime 的扩展模块。

## Skill、Agent、MCP、Hook 分别解决什么

### Skill：给当前 Agent 增加可复用方法

Skill 更接近程序性知识：告诉当前 Agent 某类任务应该怎样做。它通常不创建新的 Worker，因此适合 SOP、Review 方法、领域规则、调研步骤和可复用脚本说明。

### Agent：创建独立 Worker，而不只是换一段 Prompt

只有出现 Context Isolation、不同模型、不同权限、并行收益或独立判断时，拆 Agent 才真正有价值。

```text
Skill ≈ 给当前人一本操作手册
Agent ≈ 请另一个独立执行者承担任务
```

如果几个“角色 Agent”共享同一 Context、同一模型、同一权限且不能并行，只是 System Prompt 不同，Skill 往往更轻、更稳定。

### MCP：给 Agent 一个跨平台 Tool / Data 边界

Skill 解决“应该怎么做”，MCP 解决“系统真正能调用什么”。例如 Skill 可以要求审计调用链，而 MCP / Connector 提供真实的结构查询工具。两者组合后，知识与执行能力才闭环。

### Hook：把“应该”升级成 Runtime 的确定性控制

Skill 仍然依赖模型遵守；Hook 在生命周期事件发生时由 Runtime 触发，因此适合格式化、审计、Context 注入、发布前 Gate、安全检查等不能只靠模型记忆的动作。

```text
Skill       概率性：Agent 应该怎么做
Hook        确定性：这个节点系统必须做什么
Permission  权限性：Agent 有没有权做
Sandbox     环境性：即使获权，物理上最多能碰什么
```

越接近 Hook、Permission、Sandbox 和 Agent Lifecycle，能力越依赖具体 Harness，也越难原样迁移到另一个平台。

## 标准视角：先区分“产品实现、事实惯例、开放标准”

以后判断某项 Agent 能力是不是标准，可以先分五级：

```text
产品实现
→ 稳定产品约定
→ 其他平台主动兼容的事实惯例
→ 有公开 Spec 的开放规范
→ 中立治理的开放标准
```

文件名相同不代表语义相同；“兼容 Claude Code”也不自动等于“遵循行业标准”。真正需要看谁提出、谁采用、能否独立实现、治理是否脱离单一厂商。

## 当前最稳定的开放层

| 能力 | 当前性质 | 主要解决的问题 |
|---|---|---|
| AGENTS.md | 开放项目指令约定 | Repo 怎样给 Agent 长期规则 |
| Agent Skills / `SKILL.md` | 开放标准 | 可复用程序性知识怎样携带 |
| MCP | 开放协议 | Agent 怎样连接 Tool、Data 与扩展能力 |
| A2A | 开放协议 | 不同 Agent 系统怎样发现与通信 |
| Agent Plugins v1 | 开放包装规范 | Portable Skill + MCP 怎样打包分发 |

MCP 在 2026-07-28 版本继续补充 stateless core、Extensions framework、Tasks extension 与授权机制，说明它正在从早期“给模型接工具”的接口，向更完整的生产协议演进。

Agent Plugins v1 当前刻意只标准化稳定的公共层。Qwen Code 的原生支持矩阵很能说明边界：Skill 与 stdio/HTTP MCP 可以原样加载，而 Commands、Agents、Hooks 等不会按 v1 处理。这不是简单漏项，而是说明这些 Runtime-specific 语义还没有稳定到适合强行统一。

## Claude Code 的影响力应该怎样准确描述

不能说 Claude Code 发明了 Agent；AI Agent 和 Multi-Agent 远早于 Claude Code。但 Anthropic / Claude Code 确实是这一代 Agent Engineering 的重要范式输出源：MCP、Agent Skills 明确从 Anthropic 走向开放生态，Claude Plugin、Subagent、Hook 等工程抽象也形成了明显的事实兼容影响。

因此应把四件事分开：**首创、产品化、生态扩散、标准治理**。只有这样才能既不夸大 Claude Code，也不低估它对当前 Agent 工程范式的贡献。

## Usher Lens：一个 Claude Code Plugin 到底能迁移多少

Usher 的现实价值在于它不是假想案例：插件最初以 Claude Code Plugin 协议为主要表达方式，因此可以直接拿来检查跨平台兼容深度。

```text
Usher
├─ Skill / instructions
├─ MCP / external capability
├─ Agent definitions
├─ Hooks
├─ Manifest / packaging
└─ Runtime-specific behavior
```

不要再只问“Usher 支不支持 Qwen Code / CodeBuddy / OpenCode / Codex”，而应该逐层问：

| Usher 层 | 典型可移植性 | 为什么 |
|---|---:|---|
| Skill / `SKILL.md` | 高 | 已有开放 Agent Skills 语义 |
| MCP | 高 | 有独立协议边界 |
| Agent Prompt / Role | 中高 | 内容可迁，但 Worker Runtime 不同 |
| Agent Runtime 参数 | 中 | Model、Tool、Context、Background 等语义不同 |
| Hook | 中低 | Lifecycle 与阻断语义高度依赖 Runtime |
| Plugin Manifest | 低到中 | 可以做转换，但不是统一能力模型 |
| Permission / Sandbox / Monitor / LSP | 低 | 深度绑定具体 Harness |

Qwen Code 很适合用来做兼容性实验：它可以直接安装 Claude Code Marketplace / Plugin，并把 Claude Agent、Skill 等映射到自己的 Extension / Subagent 体系；对于 Agent Plugins v1，则保留标准文件原样，只加载规范覆盖的 Skill 与 MCP。

CodeBuddy 是另一种强兼容样本：官方明确允许保留 `.claude-plugin/`、`${CLAUDE_PLUGIN_ROOT}` 和 `${CLAUDE_PLUGIN_DATA}`。这说明 Claude Plugin 已经具有事实协议影响力，但仍需要验证运行时语义，而不能只看到目录能识别就宣称完全兼容。

OpenCode 则提醒我们：同一个“Plugin”词可能指完全不同抽象。OpenCode Plugin 是可进入 Agent、Model、Tool、Session、Permission 等 Runtime 行为的代码扩展，因此迁移 Claude Plugin 时往往需要 Adapter，而不是复制目录。

## 对 Usher 更稳健的架构问题

这轮学习后，问题已经从“要不要绑定 Claude Code 协议”推进到：

```text
            Usher Capability Model
                    │
       ┌────────────┴────────────┐
       │                         │
Portable Core              Rich Runtime Adapters
Skill + MCP                Claude / OpenCode / Qwen / Codex ...
       │                         │
开放标准优先               保留平台真正有价值的差异
```

这里暂时不要求 Usher 立刻重构。更稳妥的做法是先用真实仓库审计每项能力，再判断哪些应成为 Portable Core、哪些应该保留 Claude richer semantics、哪些只能由各 Runtime Adapter 实现。

## 这一篇最终要记住的判断

- 生态竞争不是插件数量竞争，而是谁能定义能力、分发能力、兼容能力。
- Plugin 是包装与分发边界，不是 Skill、Agent、MCP、Hook 的同义词。
- Skill 负责“怎么做”，Agent 负责“谁独立做”，MCP 负责“能调用什么”，Hook 负责“哪个生命周期节点必须发生什么”。
- 越靠近 Runtime，越难标准化；越像内容或协议边界，越容易成为 Portable Core。
- Claude Code Plugin 目前更接近影响力很强的事实协议；Agent Skills、MCP、A2A、Agent Plugins v1 则属于不同层次的开放规范。
- 判断兼容必须区分语法兼容、结构兼容和语义兼容；能安装不等于行为完全等价。

## 官方资料索引

- Agent Plugins Specification v1.0.0。
- Qwen Code Extensions / Agent Plugins v1。
- CodeBuddy Plugin Reference：Claude Code compatibility。
- OpenCode V2 Plugins / SDK。
- GitHub Copilot Agent Skills / Custom Agents。
- Model Context Protocol 2026-07-28 Specification。

## 学习导航

[← 上一章](04_CodingAgent平台怎样走向AgentWorkspace.md) · [新版目录](../README.md) · [下一章 →](06_不同角色怎样选择CodingAgent平台.md)