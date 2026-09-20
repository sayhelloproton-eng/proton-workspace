# Coding Agent 真正竞争的是什么：从模型、Harness、Runtime 到 Agent Workspace

如果只把 Coding Agent（编码智能体：能够理解软件任务、读取工程上下文、调用工具，并持续推进开发工作的智能系统）理解成“更聪明的代码补全”，很多平台差异都会看不懂。

同一个模型放进不同产品，最后可能像两个完全不同的“程序员”：一个适合人在编辑器里持续协作，一个适合把完整任务交出去后台执行；一个擅长把团队工程规则编进 Agent，另一个则把模型、工具、Provider 和 Runtime 尽量交给开发者自己控制。真正拉开差距的，往往不是模型本身，而是模型外面怎样组织任务、上下文、工具、状态、权限、恢复和验证。

2026 年 9 月初，我集中研究过 Claude Code、Codex、OpenCode、Cursor、Kiro、Qoder、Qwen Code、CodeBuddy / WorkBuddy、TRAE 和 GitHub Copilot。具体功能变化很快，所以这里不做永久排行榜。真正值得留下来的，是一套更稳定的判断框架：**先看模型之外的工程层，再看平台把什么工作对象放在中心；再看能力怎样被包装、迁移和验证；最后看任务变长以后，系统能不能真正演进成 Agent Workspace。**

全文只围绕一条问题链展开：

```text
同一个模型为什么换个平台表现差很多？
→ Model / Harness / Runtime / Workspace 分别负责什么？
→ 为什么不同平台会长成不同产品？
→ Skill / MCP / Agent / Hook / Plugin 是什么关系？
→ 哪些能力能跨平台迁移，哪些被 Runtime 锁住？
→ 长任务、多 Agent 和更高自主性会逼出哪些新问题？
→ 最后应该怎样评价和选择一个 Coding Agent 平台？
```

## 先把 Model、Harness、Runtime 和 Workspace 四层分开

两个产品都能接同一个模型，都能读文件、调用终端、连接 MCP、创建子 Agent，并不意味着它们完成复杂工程任务的能力相同。真正进入工程场景以后，至少要把四层责任分开：

```text
Model
提供理解、推理、生成和判断
        ↓
Harness
组织上下文、规则、工具和工作循环
        ↓
Runtime
承载任务状态、执行环境、权限、调度、恢复和验证
        ↓
Workspace
让人、Agent、任务、代码和证据围绕同一工作对象长期协作
```

Model（模型）决定推理能力上限。它可以理解代码、推断原因、生成方案和判断候选动作，但它并不天然知道当前仓库真实状态、任务已经执行到哪里、工具调用是否真的成功、某个动作有没有权限、失败后应该怎样恢复。

Harness（智能体工作框架：围绕模型组织上下文、工具、规则、工作循环和验证的系统层）决定模型怎样进入工程任务。可以把它理解成模型外面的“身体、工作记忆、工具箱、工作场地和安全规则”。

这轮研究用五根支柱观察 Harness：

| 支柱 | 它真正负责什么 |
|---|---|
| Loop | Agent 怎样从理解任务进入执行、观察、再判断和继续 |
| Context | 每一步模型到底看到哪些代码、规则、历史和证据 |
| Runtime | 工具、任务、隔离环境、并发和权限怎样真实运行 |
| State | 系统怎样保存“现在做到哪了”，而不是让模型靠聊天历史猜 |
| Verification | 怎样用测试、文件、Git 或运行状态证明结果真的成立 |

Runtime（运行时：承载任务生命周期、状态、执行环境、并发、权限和失败恢复的程序层）面对的是更确定性的工程问题：任务身份、当前状态、并发、隔离环境、权限边界、超时、副作用核对、失败恢复和终态判断。

Workspace（工作空间：人、Agent、任务、代码、证据和协作状态共同存在的长期工作环境）决定产品的工作中心到底是什么：当前文件、Editor（编辑器）、Task（任务）、Repository（代码仓库）、Issue、PR（合并请求）、Spec（规格：把目标、约束和预期结果显式化的工作对象），还是更广义的 Work。

所以至少要保留这条边界：

```text
model ability
≠ harness ability
≠ runtime ability
≠ plugin ability
≠ ecosystem ability
```

同一个模型，在一个平台里可能拥有干净上下文、稳定工具、明确状态和可靠验证；换到另一个平台以后，也可能只能靠不断变长的聊天历史维持现场。模型没换，任务质量却可以差很多。

“支持 MCP”只说明能接某类外部能力，不证明 Runtime 能安全恢复一个执行到一半的长任务；“支持子 Agent”也不证明多个 Agent 之间已经有稳定状态、交接和验收机制。

## 平台差异真正来自它把什么放在工作中心

2026 年 9 月初那轮研究里，最稳定的比较方法不是统计功能数量，而是看平台首先围绕什么对象组织工作。

| 平台 | 当时更接近的产品形态 | 工作中心 | 最值得观察的问题 |
|---|---|---|---|
| Claude Code | 可编程 Coding Harness | Agent + 工程规则 | 怎样把团队经验、规则和生命周期控制编进 Agent |
| Codex | 任务委派与执行系统 | Task + Delegation | 怎样把完整任务交给隔离工位并并行监督 |
| OpenCode | 开放 Agent Runtime / Harness | Runtime + Ownership | 怎样让模型、Provider、Agent、Tool、Plugin 保持可替换 |
| Cursor | AI IDE + Cloud Agent / Project | Editor + Agent + Project | 人怎样在 IDE 高频协作，同时把长任务、并行与自动化交给云端运行单元 |
| Kiro | Spec-driven 开发产品 | Intent / Spec | 怎样先收紧需求、约束和计划，再进入执行 |
| Qoder | 长任务 Coding Agent 平台 | Long-running Task | 一个任务怎样持续推进到交付 |
| Qwen Code | 开放兼容型 Coding Harness | Runtime + Compatibility | 不同生态资产到底能迁到什么程度 |
| CodeBuddy / WorkBuddy | 企业 Agent 产品族 | Organization + Agent | 企业接入、组织治理、生态迁移和托管能力怎样结合 |
| TRAE | Code / Work 双工作形态 | Work Mode | Coding Harness 怎样扩展到更广工作对象 |
| GitHub Copilot | GitHub 原生 Agent 层 | Repo / Issue / PR / CI | Agent 怎样进入已有研发生命周期真值 |

这张表不是排名，而是一张“优化对象地图”。

围绕 Editor 组织的产品，会天然重视当前文件、光标、代码上下文、Diff（代码差异）、Review（代码审查）和高频人机往返；围绕 Task 组织的产品，会更关注任务隔离、后台执行、长生命周期、并行委派和最终交付；围绕 Runtime 组织的产品，会把“模型、Provider、Agent、工具和插件到底由谁控制”放在更中心的位置。

围绕 Spec 的产品试图在执行前先收紧 Intent（意图：用户真正希望系统达到的目标）和约束，减少 Agent 做得很快却走错方向；围绕 Repository、Issue、PR 和 CI（持续集成）的产品，则天然站在真实研发协作事实之上。

### 三条最典型的 Harness 路线

Claude Code 最值得研究的不是“它也会调用工具”，而是怎样把工程经验表达成 Agent 可长期使用的规则和能力。Skill、Subagent、Hook、MCP、Permission、项目指令等能力组合起来以后，团队方法不再只存在于一次 Prompt 里。

它更适合研究：

- 怎样把团队经验编码进 Agent；
- 怎样把确定性 Hook 和概率性 Skill 分开；
- 怎样让 Subagent 承担独立上下文和责任；
- 怎样让项目规则长期进入工作流。

Codex 更值得观察 Task Delegation（任务委派：把完整任务交给独立执行单元，而不是只让模型回答下一步）。Task、Worktree（Git 工作树隔离）、Cloud / Background（云端 / 后台执行）和并行任务监督回答的是：

> 一个人怎样同时把多个完整工程任务交给多个执行单元，并保持可 Review、可合并、可验收？

OpenCode 的研究价值则在 Runtime Ownership（运行时所有权：开发者能在多大程度上自行选择和替换底层执行组件）。它把 Model、Provider、Agent、Tool、Plugin、Runtime 拆得更开，更适合研究 Provider 替换、私有模型、自定义工具、Plugin 扩展和 Agent Runtime 二次开发。

可以把三条路线压成：

```text
Claude Code → Harness 怎样表达工程经验
Codex       → Harness 怎样承载完整任务委派和隔离执行
OpenCode    → Harness / Runtime 到底由谁拥有和改造
```

### 其他产品有自己的优化中心

Cursor 的历史起点确实是 Human-Agent Interaction（人机协作过程）和 IDE 内的 Editor state、代码 Context、Diff、Review、即时修改。**但这个判断不能再被写成它今天的能力边界。** 2026-09-10 发布的 Projects 已经把 Cursor 推到 Cloud Agents / coordinator / parallel delegation / shared long-term context；Automations 又允许按 Git、Slack、Webhook 或 schedule 触发后台 Cloud Agent。更准确的说法是：IDE 协作仍是 Cursor 的重要根基，但它已经明显向长期 Agent Workspace 与事件驱动 Runtime 扩展。

Kiro 更强调 Intent / Spec 先行，处理的是一个常见失败源：目标和约束本身没有冻结，Agent 执行得越快，可能偏得越远。

Qoder 更值得观察长任务持续推进与任务级持久性。这里的核心不是一次 Session 回答，而是任务怎样跨更长时间保持目标、状态和交付责任。

Qwen Code 更适合作为兼容实验场：它主动吸收其他 Coding Agent 生态里的指令、Skill、插件结构和开放协议，很适合暴露“文件能读”和“行为真的等价”之间的差距。

CodeBuddy / WorkBuddy 值得观察企业能力、组织接入、托管能力和 Claude 生态兼容诉求怎样结合。

TRAE 已经不能只按 IDE 理解，它在 Code / Work 等不同工作形态之间扩展。

GitHub Copilot 的特殊位置来自 GitHub 已经拥有 Repository、Issue、PR、Actions、Review 等真实研发生命周期对象，Agent 不需要重新发明一套协作世界。

### 产品族、Runtime 和第三方生态不能混写

2026 年 9 月初，OpenAI 更适合按下面理解：

```text
ChatGPT
├─ Chat
├─ Work
└─ Codex
```

Work 面向更广的长期、多步骤工作；Codex 聚焦软件与技术任务。不能把 Codex 等同于 ChatGPT 全部 Agent 能力。

Anthropic 则更接近：

```text
Claude
├─ Chat
├─ Cowork
└─ Claude Code
```

Claude Code 是 Coding Harness，不代表 Claude 全产品。

腾讯的 CodeBuddy、WorkBuddy、Managed Agents 更适合按产品族理解，而不是简单解释成一次产品改名。

OpenCode Core 与 Oh My OpenCode（OMO）也必须分开：前者是核心 Runtime / Harness，后者是其上的第三方增强体验与编排层。Qoder 和 TRAE 同样已经不能只用“IDE”概括。

先把产品族、核心 Runtime、第三方生态和兼容层拆开，才不会把不同 Owner（职责归属：某项能力真正属于哪一层或哪一个产品）的能力混到一起。

### “支持”不等于“擅长”

平台发布一个新按钮，只能证明“支持”，不能直接升级成成熟优势。

这轮研究给“擅长”设了一个证据门槛：

```text
官方长期持续主打
+ 产品 / Harness 结构确实支撑
+ 真实使用模式反复出现
+ 已知代价能够解释
```

按 2026 年 9 月初的原始研究，Claude Code 的辨识度更接近 Agent Engineering / Harness 表达，Codex 更接近 Task Delegation 和多任务执行，OpenCode 更接近 Open Harness / Runtime Ownership，Cursor 当时更接近 Human-Agent IDE 协作。到 2026-09-20 再看，Cursor 的 Cloud Agents、Projects 与 Automations 已经明显扩张了它的 Runtime / Workspace 责任，所以这里保留的是“历史中心如何形成”的分析，不把早期标签当成当前能力上限。

Qoder 的 Long-running Autonomous Delivery、Kiro 的 Spec-driven Agentic Development、Qwen Code 的 Compatibility-first Open Harness、CodeBuddy / WorkBuddy 的企业 Agent 路线、TRAE 从 Coding 向 Work 扩展的方向都已经很明显，但当时仍需要更多同规模、长期、独立使用证据校准强度。GitHub Copilot 的 GitHub 生态已经非常成熟，但其“多 Agent 工作入口”仍在快速演进。

使用这些判断时继续保持四条纪律：不写“永久冠军”；不把新功能直接升级成成熟优势；中国平台和海外平台用同一证据门槛；社区反馈可以作为使用证据，但不能替代产品结构和官方合同。

两两比较往往比做大排行榜更有信息量：

```text
Codex vs Qoder
→ 横向任务委派规模 vs 纵向长任务持续交付

Claude Code vs OpenCode
→ Harness 表达深度 vs Harness / Runtime 所有权

Cursor vs Kiro
→ Human-Agent Interaction vs Intent / Spec 收敛
```

## Plugin、Skill、MCP、Agent、Hook 不是同一层能力

团队工程经验如果永远只存在于一次 Prompt（提示词：发送给模型的任务说明、事实和约束文本）里，就很难版本化、分发、组合、升级和跨项目复用。

Coding Agent 生态里经常一起出现 Plugin、Skill、MCP、Agent、Hook。更清楚的关系是：

```text
Plugin
├─ Skill   → 当前 Agent 应该怎么做
├─ MCP     → 当前 Agent 能连接什么外部 Tool / Data / Capability
├─ Agent   → 谁作为独立 Worker 去做
└─ Hook    → 哪个生命周期节点系统必须确定性做什么
```

Plugin（插件）是能力的包装、安装和分发边界，不是一种单独智能能力。

Skill（技能：把某类任务的程序性知识、步骤和约束做成可复用资产）适合 SOP（标准操作流程）、领域知识和工作方法。它通常仍然依赖模型理解和遵循。

MCP（Model Context Protocol，模型上下文协议：让 Agent 用相对统一的方式连接外部工具、数据和能力）解决的是能力连接，不负责 Agent 生命周期和组织方式。

Agent / Subagent（子智能体：拥有独立上下文、职责或执行生命周期的工作单元）回答的是“谁独立去做”。只有 Context、Model、Permission、并行需求、独立判断或失败隔离确实需要变化时，拆 Agent 才有明显价值；否则一个 Skill 往往更轻。

Hook（生命周期钩子：在固定事件发生时由 Runtime 确定性触发的动作）回答“某个生命周期节点系统必须做什么”。Hook 与 Skill 最大区别是：Hook 由 Runtime 确定性触发，Skill 仍需要模型采纳和执行。

一个成熟能力还必须把控制边界拆开：

```text
知识 / 方法        → Skill
外部工具 / 数据    → MCP
独立职责           → Agent
确定性生命周期动作 → Hook
有没有权执行       → Permission
最多能影响什么     → Sandbox
怎样证明真的完成   → Verification
```

Permission（权限）回答“有没有权做”；Sandbox（沙箱：把执行动作限制在受控资源范围内的隔离环境）回答“即使获权，最多能影响什么”；Verification（验证）回答“做完以后怎样证明结果真的发生”。

所以模型知道“不要删除文件”，不等于系统真的阻止了删除；模型说“测试通过”，也不等于测试真的执行过。

### 什么时候应该拆 Agent，什么时候 Skill 就够了

拆出独立 Agent 至少应该带来一种真实变化：独立 Context、不同 Model、不同 Permission、真正并行、独立判断，或者失败隔离。

新的 Agent 同时会带来 Handoff（交接）、Shared State（共享状态）、Review 和 Integration（集成：把多个独立结果安全地合回同一系统）成本：

```text
Context 隔离收益
+ 并行收益
+ 职责隔离收益
-
Handoff 成本
Shared State 成本
Review 成本
Integration 成本
```

Multi-Agent（多智能体协作）是一种组织结构，不是一枚能力勋章。

## 生态强不强，不看插件数量

一个 Coding Agent 生态真正强不强，至少要看六个维度：

1. 能力是否有稳定的包装格式；
2. 安装和分发是否顺畅；
3. Runtime 是否真的执行这些语义；
4. 第三方资产是否能升级、版本化和长期维护；
5. 平台是否拥有足够大的真实工作入口；
6. 跨平台迁移成本是否能够解释。

不同平台的生态策略也明显不同。

| 平台 / 产品族 | 生态策略的主要特征 |
|---|---|
| Claude Code | Plugin、Skill、Subagent、Hook、MCP、Project Instructions 等形成较完整工程 Agent 抽象 |
| Qwen Code | 主动吸收其他生态和开放协议，适合验证哪些资产真正可移植 |
| OpenCode | Runtime 可扩展、Provider / Agent / Plugin 可控，第三方创新空间大 |
| OpenAI / Codex | 产品级分发和 Task Runtime 结合更深，App / Plugin 能力与产品工作入口结合 |
| CodeBuddy / WorkBuddy | 企业能力与 Claude 生态兼容诉求结合，迁移已有资产是重要价值 |
| GitHub Copilot | 优势来自 GitHub 自身的 Repo、Issue、PR、Actions、Review 等研发入口 |

生态的真正价值，不是把插件列表做长，而是让工程经验从“一次 Prompt”变成能安装、升级、复用并被真实 Runtime 消费的长期资产。

## 开放标准为什么通常只收敛稳定边缘

多个平台开始互相兼容以后，很容易把“大家都支持某种目录”直接叫行业标准。

更稳妥的成熟度阶梯是：

```text
产品私有实现
→ 稳定产品约定
→ 事实惯例 / de facto compatibility
→ 有公开 Spec 的开放规范
→ 中立治理的开放标准
```

2026 年 9 月初值得长期关注的几个边界包括：

| 对象 | 主要解决的问题 |
|---|---|
| AGENTS.md | 项目级 Agent 指令怎样被不同工具读取 |
| Agent Skills / `SKILL.md` | 程序性知识怎样做成可移植资产 |
| MCP | Agent 怎样连接 Tool / Data / Capability |
| A2A | Agent 与 Agent System 怎样发现和通信 |
| Agent Plugins v1 | Plugin 怎样用较稳定的开放核心包装和分发 |

A2A（Agent-to-Agent：面向不同 Agent 或 Agent System 之间发现、通信和协作的协议）连接的是 Agent；MCP 连接的是工具、数据和能力。两者不在同一层。

Claude Code Plugin 有很强生态影响，但它首先仍是平台生态约定。很多平台主动兼容，不等于它自动成为中立开放标准。

### 为什么 Agent Plugins v1 没有统一所有东西

相对稳定、容易跨 Runtime 的部分主要是：

```text
Skill
MCP
```

而下面这些对象和具体 Runtime 高度绑定：

```text
Commands
Agent lifecycle
Hooks
Permission
Sandbox
Recovery
Memory
```

Agent 怎样启动退出、Hook 在什么时候触发、Permission 怎样判定、Sandbox 能隔离到哪里、Memory 怎样保存、Recovery 怎样恢复，都直接属于 Runtime 行为。

健康的开放规范更适合标准化“稳定边缘”，而不是为了字段统一强行抹平 Runtime 核心。

### 兼容至少分三层

```text
语法兼容
文件能读、字段能解析
        ↓
结构兼容
Manifest、Skill、MCP、Agent 等对象能被正确映射
        ↓
语义兼容
生命周期、Hook、Permission、参数、阻断和恢复行为真的等价
```

所以必须保留两条边界：

```text
能安装 ≠ 能运行
能运行 ≠ 行为等价
```

Qwen Code 是一个很好的兼容观察样本：开放 Skill / MCP 相对容易直接吸收，但 Commands、Agents、Hooks 等更深 Runtime 语义不会天然获得同样行为。这恰好说明 Portable Core（可移植核心：在多个 Runtime 之间仍能保持相近语义的能力）通常停在稳定边缘。

更健康的跨平台结构是：

```text
Portable Core
├─ Skill
├─ MCP
└─ 平台无关配置

Runtime Adapter
├─ Claude
├─ OpenCode
├─ Qwen
├─ Codex
└─ 其他平台
```

不要先设计一个巨大统一 Manifest（清单文件：描述插件包含哪些能力和配置），再强迫所有平台适配。开放标准负责最大公约数，Runtime Adapter（运行时适配层）保留平台真正有价值的差异。

## Usher 把“跨平台兼容”变成了具体工程问题

Usher 当时主要依据 Claude Code Plugin 协议表达能力。真正的问题不是“继续永远绑定 Claude”或者“马上重构成统一标准”，而是：

> Usher 里面哪些是真正的平台无关能力，哪些只是 Claude Runtime 的表达方式？

因此形成了下面的能力模型：

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

当时逐项判断得到：

| 能力 | 可移植性 | 原因 |
|---|---|---|
| Skill / `SKILL.md` | 高 | 程序性知识最容易跨 Runtime |
| MCP | 高 | 已有开放协议边界 |
| Agent Prompt / Role | 中高 | 文本和职责易迁，但 Worker 生命周期不同 |
| Agent Runtime 参数 | 中 | Model、Context、Permission、并行语义不同 |
| Hook | 中低 | 生命周期事件和阻断语义高度依赖 Runtime |
| Plugin Manifest | 低到中 | 可以转换，但不是统一能力模型 |
| Permission / Sandbox / Monitor / LSP | 低 | 深度依赖具体 Harness / Runtime；LSP 指语言服务协议能力 |

正确实施顺序不是先造一个巨大抽象，而是：

```text
审计真实 Usher 仓库
→ 按 Skill / MCP / Agent / Hook / Permission 等能力层分类
→ 标记 Portable Core
→ 在 Qwen Code / CodeBuddy / OpenCode 等目标 Runtime 做真实导入实验
→ 对比语法、结构、语义兼容
→ 只有重复差异稳定出现后，才抽 Capability Model
→ 平台特有能力继续保留 Adapter
```

Qwen Code 很适合作为兼容实验场，因为它对开放 Skill、MCP 和其他 Coding Agent 生态有较强兼容诉求，容易暴露哪些能力真的能迁，哪些只是在文件层“看起来兼容”。

必须保留当前事实边界：**这轮研究只完成了 Usher 的架构判断，没有授权，也没有执行 Usher 的真实跨平台重构。** 如果未来重新打开这个问题，仍然要从真实仓库审计和真实导入实验开始。

## 长任务会把竞争推向 Runtime、Workspace 和 Trust Runtime

Coding 场景是通用执行型 Agent 最容易先成熟的环境之一，因为软件工程天然有大量可机器验证的反馈：

```text
结构化输入
文件和 Tool API
Git 恢复
Tests
CI
相对清楚的成功 / 失败信号
```

因此很多通用 Agent 能力会先在 Coding 场景被逼成熟：

```text
Agent Loop
→ Context
→ Tools
→ Skills
→ MCP
→ Sandbox
→ Subagent
→ Background Task
→ Checkpoint / Recovery
```

产品中心也在变化：

```text
Code Completion
→ Chat in IDE
→ Task / Workspace
```

IDE 不会消失，但更可能从唯一工作中心变成专业操作、代码检查和 Review 的重要视图；Task 则拥有更独立的身份、生命周期和执行环境。

Agent 生命周期也在变长：

```text
一次 Session
→ Background Task
→ Persistent Worker
→ Event-driven Worker
```

Persistent Worker（持续工作单元）不会因为一次会话结束就丢掉任务身份和状态；Event-driven Worker（事件驱动工作单元）可以由外部事件触发继续工作。一旦生命周期变长，Identity、State、Permission、Recovery、Observability（可观测性：外部能够持续看到系统状态和异常）和 Evidence 都必须成为系统事实，而不能只留在聊天文本里。

### Harness 会越来越平台化

真正进入长任务以后，平台竞争会越来越从“用了哪个模型”转向：

```text
谁能更好地组织任务
谁能给模型更干净的 Context
谁能提供可靠执行环境
谁能控制权限和副作用
谁能在失败以后恢复
谁能验证结果
谁能把多个 Agent 的结果重新合起来
```

这也是 Harness 逐渐平台化、Runtime 越来越重要、Workspace 从 UI 概念变成工作事实承载层的原因。

### Multi-Agent 增长以后，人类先遇到 Review 瓶颈

多个 Agent 可以带来并行、上下文隔离和职责隔离，但也会新增共享状态、交接、冲突解决、结果合并和验收成本。

```text
Context 隔离收益
+ 并行收益
+ 职责隔离收益
-
Handoff 成本
Shared State 成本
Review 成本
Integration 成本
```

十个 Agent 可以同时写代码，并不意味着一个人可以同时高质量验收十份结果。Review、Integration 和 Acceptance（验收：从真实结果判断目标是否完成）反而会越来越稀缺。

人的价值也会更多集中到：

```text
Intent
Domain Knowledge
Architecture
Constraint
Evaluation
Trade-off
Judgment
```

也就是目标、领域事实、架构边界、约束、评测、取舍和最终判断。

### 自主性越高，Trust Runtime 越不能是附属能力

当 Agent 只给建议时，错误通常停在文本层；当 Agent 可以改文件、运行 Shell、访问网络、操作浏览器、提交代码甚至长期后台执行以后，错误会进入真实世界。

这时需要一层 Trust Runtime（可信运行层：约束自主执行风险、保留证据并支持恢复的系统能力）：

```text
Permission
Sandbox
Credential
Approval
Audit
Observability
Recovery
Evidence
```

Credential（凭据）决定 Agent 以什么身份访问外部系统；Approval（审批）决定哪些高风险动作需要正式授权；Audit（审计）记录谁在什么时候做了什么；Recovery 负责在任务中断或副作用结果不确定以后重新建立真实状态；Evidence 则把“模型说完成了”变成可复核事实。

长期趋势可以压缩成：

```text
Coding Agent Harness
        ↓
Agent Workspace / Task Runtime
        ↓
General Work Harness
```

这是一条架构方向，不意味着所有产品最终长得一样。有人继续以 IDE 为中心，有人围绕 Task，有人强调企业 Organization，有人强调开放 Runtime，也有人直接依托现有 SaaS（软件即服务）协作事实。

真正共同的变化只有一条：**任务越长、Agent 越自主，模型之外的 Runtime、Workspace、权限、恢复和证据越重要。**

## 最后怎样判断和选择一个 Coding Agent 平台

选平台不应该从“谁最好”开始，而应该先回答自己的工作是什么形状。

六个问题通常已经足够：

1. 我的主要工作对象是 Editor、Task、Runtime、Spec 还是 Organization（组织）？
2. 人要不要持续留在 Loop（工作循环）里，还是主要在任务前后监督？
3. 任务生命周期是几分钟、几小时，还是需要长期持续？
4. 我是否需要自己拥有 Model、Provider 和 Runtime？
5. 我要的是跨平台 Portable Skill，还是某个平台专属的 Rich Capability（丰富能力）？
6. 最终怎样验证任务真的完成，而不是只得到一段“完成了”的回答？

| 主要目标 | 更值得优先观察的路线 | 真正要看的东西 |
|---|---|---|
| IDE 高频协作 + 长期 Project | Cursor | Editor Context、Diff、Cloud Agents、Projects、Automations、并行委派 |
| 把完整任务委派出去 | Codex | Task、隔离执行、后台 / 云端任务、并行监督、验收 |
| 把团队经验编进 Agent | Claude Code | Skill、Subagent、Hook、MCP、Project Instruction、Permission |
| 自己掌握 Agent Stack | OpenCode | Provider routing、私有模型、Runtime 插件、Agent / Tool 解耦 |
| 长期自主开发 | Qoder 等长任务路线 | 真实长任务 Eval、状态、恢复、持续推进、最终交付 |
| 企业 Agent | CodeBuddy / WorkBuddy 等企业路线 | 组织身份、权限、审计、内部模型、知识接入、迁移和运维责任 |
| 跨平台 Skill / Plugin | 多 Runtime 实验 | Claude Code / OpenCode / Codex / Qwen Code 四种不同边界 |

做跨平台 Skill / Plugin 时，不应该只押一家 Runtime。四个实验角分别能观察不同问题：

```text
Claude Code → Rich Harness / 源范式
OpenCode    → Runtime Ownership
Codex       → Task / Worktree / Cloud Delegation
Qwen Code   → Compatibility / Portable Core 验证
```

如果这六个问题没有答案，平台选型很容易退化成品牌偏好。

## 外部一手来源与时间边界

这篇文章包含具体平台比较，因此不能只靠作者印象维护“当前事实”。下面保留一组**一手来源入口**，用于核验会快速变化的产品能力；正文中的产品标签只是某个时间点的分析，不是永久分类。

- Claude / Agent Skills：<https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills>
- OpenAI Codex CLI：<https://developers.openai.com/codex/cli>
- OpenAI Codex Cloud：<https://developers.openai.com/docs/cloud>
- OpenCode Provider：<https://opencode.ai/docs/providers>
- Cursor Cloud Agents：<https://cursor.com/docs/cloud-agent>
- Cursor Projects：<https://cursor.com/docs/agent/projects>
- Cursor Automations：<https://cursor.com/docs/cloud-agent/automations>
- Kiro：<https://kiro.dev/docs/>
- Qoder：<https://docs.qoder.com/quick-start>
- Qwen Code：<https://github.com/QwenLM/qwen-code>
- GitHub Copilot：<https://docs.github.com/en/copilot>

这些来源用于核验“平台当前提供什么”。本文自己的判断仍然是更高一层的问题：这些能力由 Harness、Runtime、Workspace 还是 Trust Runtime 承担，真实长任务里是否有足够 Evidence 支撑“擅长”这个结论。

## 平台快照会过期，但判断框架应该留下来

本文保留的是 2026 年 9 月初那轮研究形成的平台地图。具体按钮、版本、Marketplace（扩展市场）、Cloud Agent、插件格式、兼容矩阵和产品命名都会继续变化，真正用于当前选型时应该重新核验。

长期更值得复用的是下面这些判断：

- 先看产品工作中心，而不是功能数量；
- Model、Harness、Runtime、Plugin、Ecosystem 分层判断；
- Plugin 是包装和分发边界，不是一种单独能力；
- Skill、MCP、Agent、Hook 的责任不同；
- Permission、Sandbox、Verification 不能被 Prompt 代替；
- Multi-Agent 的收益必须覆盖 Handoff、共享状态、Review 和 Integration 成本；
- 跨平台兼容至少区分语法、结构和语义；
- 开放标准优先标准化稳定边缘，不强行统一 Runtime 核心；
- 平台“擅长”需要持续证据，而不是一次功能发布；
- 任务越长，Runtime、Workspace、Recovery 和 Evidence 越重要；
- 自主性越高，Trust Runtime 越重要。

把整篇文章压缩成一张责任图，就是：

```text
Model
决定推理上限
        ↓
Harness
决定模型怎样获得规则、上下文、工具和工作循环
        ↓
Runtime
决定任务能不能持续运行、恢复和验证
        ↓
Workspace
决定人、Agent 和真实工作围绕什么对象协作
        ↓
Trust Runtime
决定自主执行是否可控、可审计、可恢复、可证明
```

最开始使用 Coding Agent 时，很容易把体验全部归因给模型：这个模型更聪明，那个模型写代码更快。把不同平台、能力体系、兼容边界和长期任务放到同一套责任框架里以后，判断会发生变化。

**模型决定智能上限，Harness 决定模型怎样工作，Runtime 决定工作能不能持续，Workspace 决定人和 Agent 围绕什么长期协作；而 Permission、Sandbox、Recovery、Verification 和 Evidence 决定这套越来越自主的系统到底能不能被信任。**

Coding Agent 因此不只是开发效率工具。它也是通用执行型 Agent 最成熟的工程试验场之一：模型怎样进入真实环境、怎样长期工作、怎样和其他 Agent 协作、怎样获得权限、怎样失败恢复、怎样接受人的监督，以及怎样证明自己真的完成任务，这些问题都已经在 Coding 场景提前发生。
