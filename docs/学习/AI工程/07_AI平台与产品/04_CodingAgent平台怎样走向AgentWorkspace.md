# Coding Agent 平台怎样走向 Agent Workspace

> 唯一职责：用“产品、支撑、擅长、未来”四个视角理解 2026 年 Coding Agent 为什么正在从单一编码工具演进成 Agent Workspace，并建立主流产品路线图。
>
> 时效说明：产品判断基于 2026-09-05 前后的官方能力与公开路线。产品变化很快，稳定结论优先落在架构方向，不把某个按钮或版本功能写成永久事实。

## 先改变问题：不要再问谁的 Coding 最强

2025 年比较 Coding Agent，很容易停在“谁改代码更准、谁支持 MCP、谁模型更强”。到 2026 年，这种比较已经不够用了：多个产品正在把工作对象从一次对话或一个文件，升级成长期 Task、独立执行环境、后台 Agent 和多任务工作台。

```text
Chat / Completion
      ↓
Coding Agent
      ↓
Task + Workspace + Runtime
      ↓
Agent Workspace
      ↓
General Work Agent / Agent Platform
```

因此真正的问题变成：**平台怎样让人定义目标、把工作交出去、保持状态、获得真实环境反馈，并在需要时重新接管？**

## 产品视角：不同平台到底在优化什么

不能把所有产品压成同一种“AI IDE”。更有用的区分，是看它把什么对象放在产品中心。

| 平台 | 当前更像什么 | 产品中心 |
|---|---|---|
| Claude Code | 可编程工程 Agent | Agent + 工程规则 |
| Codex | Agent 任务工作台 | Task + 多 Agent |
| OpenCode | 开放 Agent Harness | Runtime + 用户控制权 |
| Cursor | Human-Agent AI IDE | Editor + Agent 协作 |
| Kiro | Spec-driven Agent IDE | Intent / Spec |
| Qoder | Autonomous Development Workspace | 长任务 + Task |
| Qwen Code | 开放兼容 Coding Harness | Runtime + 生态兼容 |
| CodeBuddy / WorkBuddy | 企业研发与工作 Agent 产品族 | Organization + Agent |
| TRAE | Coding / Work 模式化 Agent 产品 | Work Mode / Code Mode |

## 支撑视角：模型之外，Harness 才决定 Agent 能不能把事做完

同一个模型放进不同 Harness，长期任务表现可能明显不同。因为 Agent 真正工作依赖的不只是推理能力，还包括下面五根支柱：

```text
Loop         想 → 做 → 观察 → 修正
Context      当前需要知道什么，怎样避免污染和遗忘
Runtime      能操作哪些文件、终端、浏览器、云环境
State        任务中断、并行、跨时间后怎样继续
Verification 怎样用测试、Diff、CI、Evidence 证明真的完成
```

Harness 还会承载 Skill、Tool、Subagent、Permission、Sandbox、Checkpoint、Memory 与 Approval。模型决定推理上限，Harness 很大程度决定系统能否稳定接近这个上限。

## 三条最典型的 Harness 路线

### Claude Code：把工程经验编进 Agent

Claude Code 的特色不是某一个 Tool，而是把项目规则、Skill、Subagent、Hook、MCP、权限和 Context 管理组合成一套完整工程 Harness。它特别适合把团队原本存在于人脑、Wiki 和口头约定里的工程经验逐步固化成 Agent 可执行资产。

```text
工程经验
→ CLAUDE.md / Rules
→ Skill
→ Agent
→ Hook
→ Plugin
```

这种表达能力也带来代价：高级用法会增加 Token 消耗、配置复杂度和 Harness 治理成本。

### Codex：给多个 Agent 稳定、隔离、可持续的工位

Codex 的产品重心越来越偏向 Task Delegation：一个 Task 对应一个 Thread / Agent，再用 Worktree、Cloud Environment、Background Work 和 Automation 提供隔离执行环境。它优化的不是“让一个 Agent 无限复杂”，而是“让很多任务可以同时被委派并被人监督”。

```text
Task A → Agent A → Worktree A
Task B → Agent B → Worktree B
Task C → Cloud / Background
                     ↓
                  Human Review
```

因此它的现实难点也会从“生成代码”逐渐转向并行结果的 Review、Integration 和 Merge。

### OpenCode：把 Harness 所有权交给开发者

OpenCode 把 Model、Provider、Agent、Tool、Plugin 和 Runtime 拆开。OpenCode 2 的嵌入式 SDK 甚至允许应用直接拥有 OpenCode Host，并通过 Plugin 改写 Agent、Model、Tool 和 Runtime 行为。

这使它特别适合多模型路由、本地模型、自建 Provider、二次产品和 Harness 研究；相应代价是更高的配置成本，以及由组合方式带来的稳定性责任。

## 其他平台为什么没有变成同一种产品

### Cursor：优化 Human-Agent Interaction

Cursor 的根仍然是 IDE。它现在同时拥有 Worktree、异步 Subagent、Cloud Agent、独立 VM、Computer Use、长期 Goal 和事件订阅，但最有辨识度的仍是人在 Editor、Diff、Terminal 与 Agent 之间快速切换和接管。它代表的是“人仍深度参与开发过程”的路线。

### Kiro：先把 Intent 结构化，再让 Agent 执行

Kiro 用 Requirement → Design → Task → Implementation 把复杂需求固化成 Spec，并把 Steering、Skill、Hook、MCP、Agent 纳入同一 Harness。它的差异不在于 Agent 数量，而在于先降低“Agent 理解错目标”的概率。

### Qoder：把界面中心从 Code 推向 Task

Qoder 明确把 Task 视为人与 Agent 的主要接口：任务可以持续数小时、暂停等待反馈、在云端 Sandbox 中恢复。它的路线更强调 Long-running Autonomous Delivery，而不是让人持续盯着代码编辑过程。

### Qwen Code：用兼容换取生态速度

Qwen Code 一边建设自己的 Subagent、Hook、Skill、MCP 和 Runtime，一边直接吸收 Claude Code Marketplace、Gemini CLI Extension、Qoder Plugin 和 Agent Plugins v1。它没有要求生态为 Qwen 从头重写，而是在尝试成为不同 Agent 资产之间的兼容层。

### CodeBuddy / WorkBuddy：从 Coding Agent 走向企业 Agent 产品族

腾讯当前不是简单把 CodeBuddy 改名成 WorkBuddy，而是形成共享账号、订阅与企业基础能力的产品族：CodeBuddy 偏研发，WorkBuddy 偏通用工作，Managed Agents 偏托管运行。CodeBuddy 又明确兼容 Claude Code Plugin 规范，这让它同时具有企业治理和生态迁移价值。

### TRAE：把 Harness 隐藏在产品模式后面

TRAE 从 IDE / SOLO 继续扩成 TraeWork，并把 Work、Code、Design 做成用户可理解的模式。它的重点不是让用户先理解 Runtime，而是把复杂 Agent 技术包装成“我要完成哪类工作”。

## GitHub Copilot：GitHub 生态正在从 Copilot 扩成 Agent 工作入口

GitHub Copilot 已不只是补全器：GitHub、IDE、CLI、Cloud Agent、Custom Agent、Subagent、Skills、MCP、Hook 和企业治理正在进入同一产品面。它还允许在 GitHub 上把任务分派给 Copilot、Claude Code、Codex 等 Agent。它的独特资产是 GitHub 本身拥有 Repo、Issue、PR、CI 和组织治理真值，因此适合作为“代码协作平台怎样吸收多 Agent”的参照样本。

## 未来视角：竞争焦点正在从 Code 迁到 Task、Runtime 与 Human Attention

从目前公开产品路线看，至少有六个共同信号已经比较清楚：

1. **Coding Agent 正成为通用执行型 Agent 的第一个成熟专业形态。** OpenAI 的 Chat / Work / Codex、Anthropic 的 Chat / Cowork / Code、TRAE 的 Work / Code 都在说明 Coding 能力正在进入更大的 Agent 产品家族。
2. **IDE 不会消失，但不再是唯一中心。** Code View 仍适合精确修改与 Review，Agent View 则围绕 Task、Status、Approval、Evidence 和异常接管组织工作。
3. **Agent 正从 Session 变成长期 Worker。** Goal、Background、Schedule、Webhook、事件订阅、Persistent Session 和 Recovery 会逐渐成为 Runtime 基础能力。
4. **Harness / Runtime 正在独立成平台层。** 越来越多产品开放 SDK、API 或托管 Runtime，应用不必自己重新实现 Agent Loop、Sandbox、Session 和事件流。
5. **人的注意力会成为新瓶颈。** 当多个 Agent 并行产出时，Review、验证、合并与异常判断比“等待模型生成”更稀缺。
6. **多 Agent 会成为基础设施，但 Agent Explosion 不会成为好架构。** 只有 Context Isolation、不同模型/权限、并行收益或独立判断成立时，拆 Agent 才有增量价值。

```text
过去：人写代码，AI 帮一点
现在：人定义 Task，Agent 执行，人 Review
未来：多个长期 Agent 持续工作，系统筛出真正需要人的异常与判断
```

因此软件工程价值不会简单消失，而会更多迁移到 Intent、Domain Knowledge、Architecture、Constraint、Evaluation、Trade-off 与 Acceptance。

## 这一篇最终要记住的判断

- Coding Agent 不是“模型加几个 Tool”，而是模型进入 Harness、Runtime、真实工作环境后的产品形态。
- Claude Code、Codex、OpenCode 的核心差异分别更接近 Harness 深度、任务委派规模和 Runtime 所有权。
- Cursor、Kiro、Qoder 分别突出 Interaction、Intent、Long-running Task 三种不同优化方向。
- Qwen Code、CodeBuddy 的兼容策略说明：生态资产迁移本身已经成为平台竞争能力。
- 2026 年真正值得观察的，不是“谁是最强 Coding CLI”，而是谁能建立可靠的 Agent Workspace / Runtime，并把人机协作和长期任务闭环做好。

## 官方资料索引

- OpenAI：ChatGPT Work and Codex；Plugins in ChatGPT and Codex。
- OpenCode：V2 SDK / Plugins。
- Qwen Code：Extensions / Agent Plugins v1。
- Cursor：Cloud Agents and Cursor Harness Improvements。
- Qoder：Introducing the All-New Qoder；Cloud Agents Overview。
- GitHub：GitHub Copilot / Custom Agents / Agent Skills。

## 学习导航

[← 上一章](03_什么时候值得建设AI平台.md) · [新版目录](../README.md) · [下一章 →](05_CodingAgent生态插件与标准怎样收敛.md)