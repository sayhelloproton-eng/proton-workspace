# ProFlow 如何用 AI 工程方法与实验治理控制复杂度

AI（人工智能）深度参与大型工程以后，最危险的问题不一定是“模型不会写代码”。更常见的风险恰好相反：模型很擅长解决眼前 failing test，于是可以连续用最短 patch 把局部修绿，却在几轮以后悄悄改变 Owner、状态机和系统边界。

ProFlow 用三类方法控制这个矛盾：DDD（领域驱动设计：围绕长期事实和责任划分系统边界）回答“谁拥有事实”，SDD（规格驱动设计：实现前冻结契约、状态、失败语义和关键边界）回答“系统承诺什么”，TDD（测试驱动开发：把冻结承诺转成可执行证明）回答“机器怎样证明承诺成立”。它们之外还需要第一性原理剪枝、实验治理、阶段 Gate（阶段门：只有上一阶段完成并冻结后才进入正式验证）和真实验收。

这篇文章不是一份方法论术语表，而是从真实工程链解释：**一个模糊目标怎样逐步收敛成可实现、可证明、可审计、可长期接力的系统，同时又保留实验探索的速度。**

## 复杂工程的起点通常是模糊目标，不是清晰需求

ProFlow 后来形成的主链更接近：

```text
大而模糊的目标
→ 需求调研 / 技术选型
→ MVP 验证关键假设
→ 头脑风暴展开候选路线
→ DDD 划 Owner / Boundary
→ 第一性原理删除非必要复杂度
→ SDD 冻结系统承诺
→ Acceptance / Test Plan 冻结证明标准
→ 编码实现
→ TDD / executable proof
→ Package / Deployment
→ AI cross-audit
→ 一致性 / 稳定性修复
→ targeted proof
→ SAME SCENE / FAST REPLAY
→ FULL FRESH / real acceptance
→ Freeze
→ 把稳定经验下沉到 Script / Skill / Project Memory
```

其中 MVP（最小可行产品：用最低成本验证关键假设的版本）负责尽早发现方向错误；Acceptance（验收：用预先冻结的证据标准判断系统在真实路径上是否成立）负责在后段证明用户真正得到结果。

这条链的价值不是增加流程仪式，而是**逐步减少实现阶段还可以随意决定的事情**。越往后，模型越应该执行已经裁决的系统，而不是替前面的产品和架构问题重新投票。

## Research / MVP 的任务是尽早撞假设

Research（调研：在正式设计前获取外部能力、约束和候选路线的事实）和 MVP 解决的不是同一件事。前者扩大已知事实，后者用最便宜的真实实现去撞最危险的假设。

Cloudflare、Phase 2 Browser Host、`execution-flow-runtime` lab 都证明过：一份代码能跑，只能说明关键假设有可行解，不代表这份实现形状值得长期保留。

Phase 2 收口时明确出现过这样的判断：

```text
MVP COMPLETE
Production Ready = NO
```

当核心能力已经成立、关键失败模式已经暴露、下一阶段设计输入已经足够，就可以停止继续打磨实验实现。

验证型代码的价值由它增加了多少信息决定，不由已经投入了多少时间决定。

## DDD 真正解决的是“这件事最后听谁的”

DDD 在 ProFlow 里不是目录命名方法。最实用的问题始终是：

> 这类事实到底由谁拥有？其它组件只能通过什么 Contract 消费？

Contract（契约：跨边界可依赖的输入、输出、状态与错误规则）把 Owner 的正式语义暴露给其它组件，而不是允许其它组件复制一份自己的真值。

这套判断真正删除过东西：Browser Host 太重，最终移除 Universal Task Driver；Product GPT 持有确定性 bootstrap，后来把 Authority 迁回 Task Owner；`chatgpt-carrier` 已经没有独立长期事实，08-28 的 `eaae824` 直接退休；中央 Deployment Planner 复制各 Module truth，也被削薄。

所以 DDD 在这里既负责建立边界，也负责**删除已经失去独立 Ownership 理由的边界**。

## 第一性原理不是“从零想”，而是把已经不需要的复杂度删掉

工程变大以后，很容易因为历史投入保留过多层：这个 Planner 已经写了、这个状态表已经建了、这个包装器看起来还能用。

第一性原理在 ProFlow 里的实际用法更接近：

```text
这个层到底拥有哪类独立事实？
如果删掉，哪个真实能力会消失？
它是在治理外部机制，还是复制另一个 Owner？
当前阶段真的需要这部分灵活性吗？
```

如果答案只是“已有代码依赖它”，并不足以构成长久存在的理由。

## SDD 的作用是阻止源码反向定义系统

SDD 解决的是 AI 工程里很危险的一种路径：模型看到当前实现和 failing test，就默认“系统本来就应该这样”。

正式规则是：

```text
实现 Evidence 反证 Frozen Contract / Design
→ STOP
→ 回到 Design Change
→ 更新受影响 SDD / Test Plan
→ 再允许实现继续
```

没有这层，开发很容易变成：

```text
当前 test fail
→ 找最短 patch
→ 局部 GREEN
→ Owner / state machine / boundary 静默漂移
```

SDD 让“实现方便”失去架构投票权。

## 2026-08-15 展示了设计先裁决、实现随后迁移

当天的顺序很有代表性：

```text
8e66b90
→ v2.1 architecture ruling

a33a477
→ Test expectation / proof inventory

32363da
→ Task / Agent identity + binding implementation

5278fc6
→ Browser universal Task Driver 收缩为 Observer / Carrier
```

实现前，新的 proof expectation 已经写明 Product GPT-facing OpenAPI 不再允许 `createTask / listRegisteredRoles / getRegisteredRole`，固定三个 Agent Package，reopen 不创建第二个 Worker，Browser 不再保留 per-Action continue scheduler，稳定身份不能依赖 persistent Tab。

这不是“文档先写”这么简单，而是先把新的系统语义从旧实现中独立出来，再让代码追上它。

## TDD 在这里是在机器层证明 Frozen Contract

TDD 的目标不是测试数量，而是把已经冻结的规则变成可以自动失败的证明条件。

概念关系是：

```text
Frozen Rule / Contract
→ Test Plan Critical Proof
→ executable test
→ 实现满足 proof
→ refactor while preserving proof
```

历史工程中确实使用过 RED → GREEN（先让新证明在旧实现上失败，再用最小实现让它通过）的 TDD 节奏；但当前 Chat 本机工程执行又进一步增加了阶段纪律：**完整实现阶段不能边改边跑正式测试。** 当前执行协议要求先完成整批实现并 Stage Freeze（阶段冻结），再统一进入 Stage Verify（阶段验证）；验证失败则开启一个 Repair Stage，而不是 `test → patch → test → patch` 循环。

这两者并不冲突。设计 / TDD 层先定义“什么证明应该失败、什么才算通过”；具体一次高吞吐本机实现则把代码完整落地后，再在阶段 Gate 运行这些正式证明。

Test Plan（测试计划：把冻结规则、风险、Required Test Layer 和所需 Evidence 映射到可执行验证）会把 Frozen TODO、Critical Proof、Failure family 与证据要求绑定起来。

历史 Git 能证明多次重大变更里 proof expectation 先于对应实现，也能证明 RED-first 被写成正式 Gate；但不能因此虚构“每一个功能都有独立 RED commit”。很多 RED→GREEN 发生在同一次工作会话中。

## Change Amplification 是成本，也是保护

Change Amplification（变更放大：一个跨域语义变化会同步影响规格、测试、实现、包和证据）让工程看起来“改一个点却动很多层”。

```text
领域规则
→ Public Contract
→ 状态 / 失败语义
→ 技术设计
→ Test Plan
→ Executable Test
→ Consumer
→ Package Version
→ Runtime Adoption
→ Evidence
```

08-15 v2.1 的传播就很明显：架构裁决先落地，随后大量 Test / proof inventory 和多个实现包一起迁移。它确实比 ad-hoc patch（临时补丁：只针对眼前症状的局部修改）慢，如果 Frozen Contract 判断错了，返工还更贵。

换来的东西是跨 Chat、跨 package、跨 Runtime 的语义稳定，而不是一次 patch 的最短路径。

## Experiment 必须能快速错，但不能偷偷毕业

Phase 2 后期仍有很多未知：FAST / REASON、Provider、routing、scheduler、transport。如果直接在正式 package 里边试边定，实验实现会反过来定义公共 Contract。

所以建立了：

```text
experiments/execution-flow-runtime/
```

lab.1～13 用于快速验证。到 EF-6 的历史 handoff 阶段，项目明确停止 lab.14，并把结果分类；这段实验发生在已退休的旧来源中，因此保留裁决，不再把旧 SHA 当成今天仍可回读的 Git 证据：

```text
ADOPT AS-IS
ADOPT SEMANTICS / REWRITE IMPLEMENTATION
MIGRATE AFTER COMMONS
DEPRECATE
```

这套机制最终留下的规则是：

```text
Experiment discovers.
Spec decides.
Test proves.
Owner implements.
```

投入时间不是实验代码进入正式架构的理由。

## Commons Freeze 防止局部实验定义全平台语言

实验里的局部 Result、Capability、Envelope 即使先跑通，也不能自动变成所有领域的公共语义。

Commons Freeze（公共跨域合同冻结：先确定跨领域共用的最小合同，再允许实验语义迁入正式实现）因此成为实验毕业前的门。

后续 integration spike（集成探针：临时证明跨域 seam 是否成立的最小实现）也是同一思路。它只负责回答“这条 seam 能不能成立”；正式 Spec、Test Plan 和 Owner 实现建立后，spike 可以删除。

Prototype code is disposable（原型代码可丢弃），validated semantics are durable（被真实验证过的语义应该保留），这是 ProFlow 从实验走向正式架构的重要原则。

## STOP Gate 与自动执行能力同样重要

Agent 很容易把“还能继续做”理解成“应该继续做”。ProFlow 因此把前置事实不足明确成 STOP Gate（停止门：条件不足时禁止模型自己补全或扩大范围）：

```text
PENDING_DECISION
NOT_FROZEN
ACCEPTANCE_NOT_FROZEN
SPEC_GAP
PENDING_SPIKE
DOMAIN_BLOCKER
```

历史上的 `30033e6`、`e84aefd` 等提交把这些停止条件逐步变成工程纪律。

后来这套心智又扩展到运行时：真实副作用 UNKNOWN 先做 Reality Reconciliation（真实结果核对：回到权威现实确认副作用到底有没有发生）；Acceptance 没冻结不提前宣布完成；同一个 Product Gap 没有新证据也不机械续建下一 Task。

**会执行是一种能力，会停也是一种能力。**

## 实现阶段为什么要高吞吐，但验收必须阶段冻结

AI 工程还有另一个常见浪费：每改一个文件就跑一遍大测试，或者在实现还没稳定时不断调 E2E。这样既慢，又让模型在验证噪声里频繁改方向。

当前本机工程协议把实现与验证明确分成两个阶段：

```text
CURRENT REALITY / owner / first divergence
→ 完整理解并冻结 Scope
→ whole-file / bundle 高吞吐实现
→ Stage Freeze
→ Stage Verify
→ 必要的 SAME SCENE / Acceptance
→ Release / Publish（有明确授权时）
```

whole-file / bundle（整文件批量事务：一次准备完整下一版本文件并在 drift gate 下整体应用）减少模型和本机之间的反复 patch 往返，也让一次 Engineering Decision 更接近一个完整阶段，而不是一个 hunk。

验证失败后先收集失败集合和 first owner，再开启一个新的 Repair Stage；不在同一个阶段里边测边改。

这并不降低测试重要性，反而让测试回到正确的位置：**正式测试用来证明冻结实现，不用来替模型探索下一行代码该怎么写。**

## 工具演进的方向是把机械工作搬到模型下面

ProFlow 自身开发工具链也经历了明确演化：

```text
手工 zip + Chat + 本地执行器
→ Chat 生成 bundle / script
→ MCP / Local Dev
→ CodeGraph
→ Browser / Playwright
→ Repomix
→ repo-owned helper / Runbook / Skill / Automation
```

MCP（模型上下文协议：让 Chat 通过标准接口调用本机或外部工具）解决的是“怎样把能力接进来”，不是“怎样决定该做什么”。

每增加一层都对应上一代工作方式的真实瓶颈。最终分工越来越清楚：

```text
模型
→ owner / scope / design / trade-off / exception 等高价值判断

Script / Tool / Skill / Automation
→ 稳定、重复、可机械化的读取、执行、验证和恢复
```

Automation-below-model（自动化下沉到模型之下：稳定机械动作交给确定性工具，模型保留难以压缩的认知判断）不是削弱模型，而是避免把高级推理浪费在每轮都一样的动作上。

## Project Memory 也是工程控制的一部分

如果下一 Chat 每次都重新发现执行入口、工具规则和失败路线，再好的 DDD / SDD / TDD 也会在会话边界失效。

Executable Project Memory（可执行项目记忆：让失忆的新 Chat 能从稳定入口恢复真实工程行为）保存 CURRENT、稳定规则、Runbook、Authority source、Recovery path、Do-not-repeat 和历史 Evidence。

它和 Spec、Test 一样，都在阻止下一轮 AI 只根据“眼前源码 + 当前聊天”重新发明系统。

## 这套方法最终控制的是什么

把所有环节串起来：

```text
Research / MVP
→ 发现真实问题

DDD
→ 决定谁拥有这些事实

First Principles
→ 删除无独立价值的复杂度

SDD
→ 冻结系统承诺

Acceptance / Test Plan + TDD
→ 冻结并执行证明标准

Experiment Governance
→ 允许未知快速探索，但不直接毕业为架构

STOP Gate
→ 前置事实不足时拒绝继续

Automation / Skill / Project Memory
→ 把稳定机械知识搬出模型会话

Real Acceptance
→ 最后回现实证明系统成立
```

ProFlow 为此付出了更多 Spec、Test Plan、跨域同步和真实验收成本。但对于一个主要由会换 Chat、会失忆、又非常擅长局部优化的 AI 持续参与开发的系统，**语义稳定比每一次 patch 的最短路径更重要。**

## 历史来源与证据入口

这篇文章主要吸收：`07-DDD-SDD-TDD如何真实控制大型Agent工程.md`、`16-实验代码如何毕业为正式架构语义.md`、`08-公共上下文从Handoff到Executable-Project-Memory.md`，并吸收 `03-失败路线与架构重启.md` 中主动停止旧路线的案例，以及 `05-自动化验收Harness演进.md` 中分层验证对工程节奏的反作用。

这些材料记录的是方法如何被真实问题逼出来，而不是把某套流行方法论套到项目上。今天的 Chat 本机工程执行纪律以当前 `chat-local-engineering-protocol` 为准；ProFlow 产品本身的领域与运行语义仍以当前 `repos/proflow/spec`、源码、测试和真实 Runtime 为准。
