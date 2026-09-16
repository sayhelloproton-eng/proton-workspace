# ProFlow｜Deployment 从 Planner/Executor 到 Module 自治

> 状态：ACTIVE_RESEARCH / STRONG_EVIDENCE
> 核心问题：ProFlow 的自动部署为什么最后不是一个更强的 Deployment Engine，而是一个更薄的 Platform CLI？六命令为什么又演进成七命令？

## 1. 早期：Platform 自己像一个 Deployment Brain

Phase 3 早期 Deployment 设计曾提供大量平台级概念：

```text
search
modules
preflight
install
uninstall
upgrade
plan
apply
start
stop
restart
status
verify
doctor
manifest
```

Platform 还拥有自己的：

```text
DeploymentPlan
DeploymentState
PendingAction
VerificationRecord
Effective Config
overall READY / observer summary
Plan persistence / resume
```

当时的直觉是：复杂系统需要一个统一 Deployment Planner / Executor，把各 Module 的配置、依赖、人工动作、验证和恢复编成一条平台工作流。

## 2. 问题：Platform 开始复制每个 Module 的真值

这套模型的问题不是“代码多”，而是 ownership 开始漂移。

Platform 如果自己保存：

```text
Module config
missing config
verification
pending action
repair/retry state
runtime readiness
```

就会和真正拥有 Chrome、Tunnel、Model、Agent、Execution 等现实的 Module 形成第二套状态。

于是 Deployment 本身开始违反 ProFlow 在其它领域已经形成的原则：

> **一类事实应该只有一个真正 Owner。**

## 3. 2026-08-20 凌晨：先做一次大规模减法

`3d12ead docs(deployment): align thin six-command platform model` 把一级产品面直接收缩为：

```text
modules
docs
install
uninstall
start
stop
```

同时明确退休：

```text
search / plan / apply / upgrade / preflight / restart
status / verify / doctor / manifest
```

随后几次实现提交不是“隐藏旧功能”，而是真删：

- `6433de1` 删除 Deployment observer summary、effective config、generated install docs、plan persistence、platform state；
- `d5f1b4e` 删除 `DeploymentIntent / DeploymentPlan / DeploymentState / PendingAction / ApplyResult` 等合同；
- `eec2e7f` 删除旧 config materializer、registry descriptor helper 和其它 middleman。

也就是说：**不是换 CLI 名字，而是把 Platform 自己那套 Deployment 状态机拆掉。**

## 4. 六命令还不够薄：`modules` 和 start-preflight 仍然在解释 Module

六命令版本已经写出：

```text
Module / package owns logic and truth
Platform CLI owns discovery, dispatch, aggregation and ordering
Package manager owns npm dependency operations
```

但此时仍有两个残留：

1. `platform modules` 还聚合 `configStatus / missingConfig / runtimeStatus`，容易让 Platform 继续解释“模块缺什么”；
2. `platform start` 还先分发 validate/preflight，形成一层 Platform 视角的二次 readiness gate。

这说明“Platform 要薄”不能只靠删命令，还必须让管理面本身与 Owner 对齐。

## 5. 2026-08-20 下午：七命令不是加功能，而是冻结标准 Module 管理协议

`0968242 docs(deployment): freeze seven-command platform surface` 最终冻结：

```text
install
uninstall
status
setup
docs
start
stop
```

并把 `modules` 也移出用户产品面。

核心规则变成：

```text
Platform knows who to call and in what order.
Module knows how it works.
```

对应关系只是标准转发：

```text
platform install   → package sync + Module.install
platform uninstall → Module.uninstall + package remove
platform status    → Module.status
platform setup     → Module.setup
platform docs      → Module.docs
platform start     → status gate + Module.start
platform stop      → Module.stop
```

Platform 不再拥有 Module config/status/setup/docs/start/stop 的业务 truth。

## 6. 为什么 `setup` 必须成为独立标准能力

`install` 与 `setup` 被刻意分开，因为现实系统里存在三种不同配置事实：

```text
Module 自己能确定
→ Module.install 自动 materialize

其它 Producer 已经拥有
→ public Contract / shared fact 自动获取

真正的用户选择 / 外部现实
→ Module.setup
```

例如 Chrome 登录、Custom GPT Web、Tunnel OAuth、Provider Secret 等，不可能全部在 package install 时静默完成；但这也不等于要让用户自己阅读文档、复制内部路径和 token。

`Module.setup` 的目标因此被冻结为：**最少用户操作、最少往返、最快到 READY。**

## 7. Setup 从“文档提示”进一步被逼成可执行闭环

同一天晚些时候，`93b3585 / 6f8073a / 1b1121f` 又继续收紧：

```text
当前 reality
→ 自动完成所有 machine-owned 步骤
→ 真正不可自动时才 ACTION_REQUIRED
→ 最小 Human Action
→ package-owned executable / verify
→ Module.status.setupStatus = READY
```

`SETUP.md` 不允许只是 prose，每个推进步骤都要有：

```text
Step ID / Goal
Executable
Human Action（可选）
Verify
Success Condition
```

甚至 Conformance 会机械检查：不能要求用户手工搬 deterministic path、token、loopback endpoint、shared fact。

这让“自动部署”从一句产品目标变成了 Module Contract 的强制组成部分。

## 8. `platform setup` 为什么全量扫描，但又不能成为 Workflow Engine

最终 setup 的默认语义是：

```text
Discover all Modules
→ dependency order
→ READY 跳过
→ non-READY 全部调用 Module.setup
→ 即使 ACTION_REQUIRED / FAILED 也继续观察
→ 最后一次聚合完整结果
```

目的只是减少“跑一次命令才知道下一个 blocker”的往返。

但 Platform 仍然：

- 不理解 Microsoft / Chrome / GPT / Tunnel / Model 的业务步骤；
- 不保存 step index；
- 不生成 module-specific instructions；
- 不成为 config bus；
- 不替 Module 做 verify/repair。

因此这是**聚合多个自治 setup owner**，不是重建旧的 Plan/Apply Workflow Engine。

## 9. 这条线真正值得讲什么

不是“写了一个七命令 CLI”。

更准确的项目故事是：

> **早期曾建设完整 Deployment Planner / Apply / Resume / Verify 状态机，但在工程推进中发现它正在复制各 Module 的 operational truth，于是主动删除 Plan、Platform State、Effective Config、Verification 等第二真源；先收缩为薄六命令，再进一步冻结七标准 Module 能力，让每个 Module 对自己的 install/status/setup/docs/start/stop 负责，Platform 只做发现、排序、转发和聚合。**

而自动化部署的产品原则则被压到 Contract 层：

> **能自动就自动；必须人工才问；能脚本验证不靠口头确认。**

这既是 DDD Ownership 的实践，也是“降低用户心智”的产品化实现。

## 10. Trade-off

Module 自治不是没有成本：

- 每个 Module 都必须实现一致的七能力；
- `SETUP.md` / executable / verification 的治理成本提高；
- shared fact 必须建立正式 producer contract，不能由中央 config bus 临时拼装；
- Platform 很难通过一个中央 state machine 做“聪明”的全局 repair；
- extra capability 需要用户/AI 去 owning Module 使用，而不是 Platform 代理一切。

换来的则是：

- 没有第二份 Module truth；
- 新 Module 可以 generic discovery / forwarding；
- 外部资源逻辑不会不断进入 Platform CLI；
- setup 更容易自动化并精确暴露不可约人工步骤；
- reinstall / recovery / status 可以始终回到 Owner reality；
- 用户最终只面对稳定产品命令，而不是内部 Deployment Engine 概念。

## 11. 主要证据

```text
早期              Platform Planner/Executor + Plan/Apply/Upgrade/Verify/Doctor 等管理面
2026-08-20 03:11  3d12ead thin six-command model
2026-08-20 03:56  6433de1 删除 plan/state/effective-config/observer persistence
2026-08-20 04:00  d5f1b4e 删除 DeploymentPlan/State/PendingAction 等合同
2026-08-20 07:45  eec2e7f 删除 obsolete deployment helpers
2026-08-20 17:07  0968242 freeze seven-command Module surface
2026-08-20 22:03  93b3585 setup closure workflow
2026-08-20 22:07  6f8073a executable setup closure
2026-08-20 22:11  1b1121f setup acceleration invariant
2026-08-21 10:20  3bbcdd4 close seven-command contract
```
