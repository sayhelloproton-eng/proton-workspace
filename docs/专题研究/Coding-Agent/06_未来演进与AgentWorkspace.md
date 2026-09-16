# 未来演进与 Agent Workspace

> 唯一职责：解释 Coding Agent 为什么正在从“写代码工具”演进为通用执行型 Agent 的专业试验场。

## 为什么 Coding 是最适合先成熟的执行环境之一

Coding 天生拥有：

```text
结构化输入
文件和 Tool API
Git 恢复
Tests
CI
较清晰的成功 / 失败
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

之后才逐渐外溢到更广的 Work 场景。

## 产品中心正在迁移

早期：

```text
Code Completion
```

随后：

```text
Chat in IDE
```

现在越来越接近：

```text
Task / Workspace
```

IDE 不会消失，但更可能成为专业操作和 Review 视图之一，而不是唯一工作中心。

## Agent 生命周期也在变化

```text
一次 Session
→ Background Task
→ Persistent Worker
→ Event-driven Worker
```

一旦 Agent 长期存在，平台就必须承担更多 Runtime 责任：Identity、State、Permission、Recovery、Observability、Evidence。

## Harness 会越来越平台化

未来竞争重点不会只是：

> 谁接了最强模型。

而会越来越变成：

> 谁提供更可靠、更可控、更可恢复的工作 Runtime。

## 标准化会发生在边缘，不会完全吞掉 Runtime 差异

Skill、MCP、A2A、Plugin Package 会继续收敛；但 Permission、Sandbox、Agent lifecycle、Memory、Recovery、Orchestration 很可能长期保持平台差异。

## Multi-Agent 会增长，但不是越多越成熟

Agent 数量增加会带来：

```text
Context 隔离收益
+ 并行收益
-
Handoff 成本
Shared State 成本
Review 成本
Integration 成本
```

因此 Multi-Agent 是组织结构，不是能力勋章。

## 人类瓶颈会从“写代码”转向“判断”

Agent 越能自动实现，人的价值越集中在：

```text
Intent
Domain Knowledge
Architecture
Constraint
Evaluation
Trade-off
Judgment
```

同时 Review、Integration、Acceptance 会成为稀缺资源。

## 最终趋势

```text
Coding Agent Harness
        ↓
Agent Workspace / Task Runtime
        ↓
General Work Harness
```

这是方向判断，不意味着所有产品最终长得一样。
