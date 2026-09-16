# Harness 与 Runtime 支撑能力区别

> 唯一职责：比较平台不是“模型多强”，而是怎样用 Harness / Runtime 帮模型把任务做完。

## Harness 是什么

可以把模型理解成大脑，把 Harness 理解成：

```text
身体
+ 工作记忆
+ 工具箱
+ 工作场地
+ 安全规则
```

本专题用五根支柱观察 Harness：

```text
Loop
Context
Runtime
State
Verification
```

模型能力决定推理上限，Harness 决定系统能否稳定接近这个上限。

## 三条最典型的路线

### Claude Code：工程规则型 Harness

重点不是“有 Tool”，而是把工程经验表达为 Agent 可执行的规则和能力：Skills、Subagents、Hooks、MCP、Permission、项目指令等。

它更适合研究：

- 怎样把团队经验编码进 Agent；
- 怎样把确定性 Hook 和概率性 Skill 分开；
- 怎样让 Subagent 承担独立上下文与责任；
- 怎样让项目规则长期进入工作流。

### Codex：Task Delegation 型 Harness

Codex 更值得观察的是任务工位与委派：Task、Worktree / 隔离执行、Cloud / Background、并行任务监督。

它回答的问题更接近：

> 一个人怎样同时把多个完整工程任务交给多个执行单元，并保持可 Review、可合并、可验收？

### OpenCode：Runtime Ownership 型 Harness

OpenCode 的研究价值在于拆开：Model、Provider、Agent、Tool、Plugin、Runtime。

它更适合研究：

- 怎样替换 Provider；
- 怎样让模型与 Agent 定义解耦；
- 怎样扩展 Plugin / Tool；
- 怎样把 Agent Runtime 自己掌握在开发者手里。

## 其他平台的 Harness 重心

- Cursor：Editor state、代码上下文、Diff、Review 与 Human-Agent loop；
- Kiro：Spec / Intent 先行，减少执行阶段的目标漂移；
- Qoder：长任务持续推进与任务级持久性；
- Qwen Code：兼容多种生态资产的 Runtime 边界；
- GitHub Copilot：Repository / Issue / PR / CI 等真实协作状态与 Agent 连起来。

## 比较时必须拆开的四层

```text
model ability
≠ harness ability
≠ plugin ability
≠ ecosystem ability
```

例如一个平台可以使用同样的模型，但因为 Context、Tool、State、Sandbox、Verification 不同，最终任务完成率完全不同。

## 一个稳定判断

真正进入长任务后，平台竞争会越来越从“用了哪个模型”转向：

```text
谁能更好地组织任务
谁能给模型更干净的 Context
谁能提供更强的执行环境
谁能可靠恢复
谁能验证结果
谁能控制权限和副作用
```

这也是 Coding Agent 逐渐走向 Agent Runtime / Workspace 的原因。
