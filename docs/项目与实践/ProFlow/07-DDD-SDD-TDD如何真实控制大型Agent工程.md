# ProFlow｜DDD / SDD / TDD 如何真实控制大型 Agent 工程

> 状态：ACTIVE_RESEARCH / STRONG_EVIDENCE
> 核心问题：这三个方法在 ProFlow 里到底做了什么？哪些真实变更证明它们不是方法论标签？又付出了什么成本？

## 1. 先给结论：三者不是同一件事

在 ProFlow 里，更准确的分工是：

```text
DDD  → 谁拥有事实，系统边界怎么划
SDD  → 这一次架构/业务语义到底承诺什么
TDD  → 这些承诺怎样变成可执行证明
```

它们最终形成一条约束链：

```text
Owner / Boundary
→ Frozen Rule / Contract
→ Test Plan / Critical Proof
→ Executable Test
→ Implementation
→ Real Evidence
```

这套链路最重要的作用，不是让代码“更规范”，而是**限制人和 AI 为了当前实现方便，顺手改写系统语义。**

## 2. DDD 真正解决的是“谁说了算”，不是把目录拆漂亮

当前治理文档明确禁止 `package == Bounded Context` 的偷懒映射。DDD 在 ProFlow 里最实际的问题始终是：

> 这类事实到底由谁拥有？其它组件只能怎样消费？

几个已经发生过的真实结果：

```text
Task        → workflow / TaskRoleBinding / TaskDocument
Execution   → real-world effect / approval / result / evidence
Agent       → Role / Worker identity semantic / logical collaboration
Browser     → physical browser effect / observation
Model       → bounded assessment / inference
Deployment  → Module lifecycle contract / external resource governance
```

这些边界不是只写在图里；当某个组件越界时，后续实现会被实际削掉、迁走或删除。

#

## 2.1 DDD 案例一：Browser 做得太多 → 被削薄

Phase 2 的 Browser Host 一度承担 observation、dispatch、wake、approval waiting、continuation 等越来越多职责。Phase 3 最终不是继续增强它，而是把它压回 Reality Carrier。

2026-08-15：

```text
5278fc6
replace universal Task Driver
with deterministic Observer/Carrier modules
```

流程事实回 Task，real effect 回 Execution，Browser 只保留自己真正拥有的页面 Reality。

#

## 2.2 DDD 案例二：`chatgpt-carrier` 没有独立 Owner → 整包删除

退休前该 package 自述：

```text
Business Fact Owner: none
```

当 concrete GPT readiness 已经分别归 Agent Package、Browser Provisioning、Role Registry、Gateway probe 后，它只剩 ChatGPT Web reachability observation。2026-08-28 `eaae824` 直接退休整个 package。

这说明 DDD 在 ProFlow 里不只会制造边界，也会**删除失去独立 ownership 理由的边界**。

#

## 2.3 DDD 案例三：Product GPT 的确定性 Authority 被拿回 Application

2026-08-15 v2.1 裁决明确：

```text
Extension 是唯一 New Task 入口
Product GPT 不再 createTask / listRegisteredRoles / dynamic select Dev/Test
```

随后 `32363da` 真正删除这些 Product-facing operation，并把逻辑岗位、已部署 Role、Task Worker、Conversation identity 分开。

这里的判断不是“Product 模型不够聪明”，而是：**bootstrap / teaming / readiness 属于可确定的 Task/Application truth，就不应该归认知模型。**

#

## 2.4 DDD 案例四：Deployment 自己也不能拥有第二套 Module Truth

早期 Platform 曾保存 DeploymentPlan / State / PendingAction / Verification / Effective Config，并提供 Plan/Apply/Verify/Doctor 等中央管理能力。

2026-08-20 这套结构被连续删除，最终变成：

```text
Module owns behavior / private config / operational truth
Platform owns discovery / ordering / forwarding / aggregation
```

DDD 的 Owner 原则因此不仅约束 Task/Execution，也反过来让 Platform **主动放弃中央大脑**。

## 3. SDD 真正解决的是“先裁决语义，再允许代码追上”

ProFlow 的 SDD 不是“先写一份设计文档”这么简单。当前规则要求：

```text
实现 Evidence 如果反证 Frozen Contract / Design
→ STOP
→ Contract / Design Change
→ 更新受影响 SDD / Test Plan
→ 调整测试
→ 才继续实现
```

也就是说，**当前代码不能因为已经存在，就反过来成为业务语义的最高权威。**

这对于 AI/Codex 开发尤其重要：模型很容易根据当前代码和 failing test 找到一个“最方便的局部修复”，但那个修复可能是在偷偷重写 Owner、状态机或跨域边界。

## 4. SDD 案例一：8 月 15 日 Task / Agent / Browser 架构改造

时间顺序非常清楚：

```text
02:26  8e66b90  先落 3552 行架构裁决 v2.1
02:41  a33a477  再更新全仓 Test expectation / proof inventory
04:10  32363da  才实现 Task/Agent identity + binding 新合同
09:53  5278fc6  再把 Browser universal Task Driver 替换成 Observer/Carrier
```

`a33a477` 不是普通补测。它在实现改动前已经把新语义写成可执行/静态期望，例如：

- Product GPT-facing OpenAPI 不再允许 `createTask / listRegisteredRoles / getRegisteredRole`；
- v1 恰好是三个 fixed logical Agent Packages；
- reopen 不创建第二个 Worker；
- Browser 不再存在 per-Action continue scheduler；
- stable identity 不依赖 frame/persistent tab；
- Task progression 必须回 Owner facts。

然后实现才去追这些新的已裁决期望。

这就是 SDD 的实际价值：**先把“我们要什么系统”从当前实现里抽出来冻结，再让实现发生迁移。**

## 5. SDD 案例二：8 月 20 日 Deployment 七命令重构

第二个案例更加干净：

```text
17:07  0968242  freeze seven-command platform surface
17:21  36c59a6  align seven-command Test Plans
17:59  def5628  refactor Module Contract
18:05  6eab785  refactor Template / Conformance / Skill
18:34  10a527e  make Chrome / Provider setup Module-owned
22:34  450f724  enforce executable setup closure
```

这次 Test Plan 在实现前就已经规定：

- exactly seven Platform commands；
- `status/setup/docs` 只聚合 Module owner；
- `configStatus/missingConfig` 退出标准 schema；
- `start` 不再有 Platform preflight/validate；
- Fresh Workspace Golden Path 必须显式经历 `status → setup → status → start`。

随后代码才删除旧管理面并迁移 Module lifecycle。

## 6. SDD 还有一个重要能力：允许“停止”，而不是让 AI 自动扩大 Scope

`30033e6` 为 Deployment 重构冻结四段 STOP gate：

```text
R1 Docs truth
→ R2 Module Contract / seams
→ R3 Platform CLI
→ R4 Tests / Golden Path
→ STOP
```

R2 明确写：如果为了完成 Deployment 重构必须进入业务源码，立即 `DOMAIN_BLOCKER`。

`e84aefd` 又把 Module Skill 的停止条件补到：

```text
PENDING_DECISION
NOT_FROZEN
ACCEPTANCE_NOT_FROZEN
SPEC_GAP
PENDING_SPIKE
→ STOP，不得猜测补全
```

对于 Agent 驱动开发，这类“拒绝继续”的协议与自动执行能力同样重要。

## 7. TDD 在 ProFlow 里不是“有测试”，而是把 Spec 变成 Proof

当前 `AGENTS.md` 把实现门固定成：

```text
Frozen rule / contract
→ Test Plan proof / scenario
→ executable test first
→ RED
→ minimum implementation
→ GREEN
→ refactor
```

Module Test Plan 还会把：

```text
Frozen TODO
→ Critical Proof
→ Risk / Failure family
→ Required Test Layer
→ Required Evidence
```

显式绑定起来。

例如 Task 和 Execution 的 Test Plan 会明确哪些层是 `REQUIRED`、哪些是 `NOT_APPLICABLE`；不能为了模板完整凭空新增测试，也不能用 Fake 替代已经要求的 Real Local / Real External / Persistence / Process proof。

## 8. TDD 的机械证据边界要说准确

仓库能证明：

1. Test Plan 在 Implementation Wave 前已经冻结；
2. 多次重大变更存在“设计/测试期望先落，生产实现后改”的 Git 顺序；
3. 后续 presmoke / targeted gate 会机械暴露不满足新 Contract 的残差。

但 Git **不能证明每一个功能都存在单独提交的 RED commit**。本地 `RED → GREEN` 可能发生在同一次工作会话或同一个最终提交之前。

因此安全表述是：

> **ProFlow 把 RED-first 写成正式实施 Gate，并能从多次重大变更中证明 Test expectation 先于实现迁移；但不把“每个功能都有可追溯 RED commit”包装成事实。**

## 9. 这套方法的真实成本：Change Amplification 是故意存在的

它最大的代价是：**一个真正的语义变更不会只改一处代码。**

8 月 15 日 v2.1 这次变更的传播规模是：

```text
架构裁决 8e66b90   1 file   +3552
Test/proof a33a477 75 files  +28171 / -3234
Task impl 32363da   8 files   +573 / -445
Browser impl 5278fc6 6 files  +256 / -243
```

其中 `a33a477` 包含大量生成式 test inventory / matrix / governance evidence，并不等于 2.8 万行都是手写业务测试；但它仍然准确反映了一件事：**架构语义一旦改变，需要同步更新跨包 proof surface。**

8 月 20 日 Deployment 七命令也一样：Design、Test Plan、Module Contract、Template、Conformance、Skill、Chrome/Provider Adapter、Setup Closure 连续传播，而不是只改 `platform-cli` 的 command switch。

这种 Change Amplification 会带来：

- 变更速度比 ad-hoc patch 慢；
- 文档和 Test Plan 维护成本高；
- generated index / proof inventory 也需要重建；
- 一个跨域设计决定会触发多个 package 的同步修改；
- 如果 Frozen Contract 本身判断错了，纠偏成本会明显放大。

## 10. 为什么在 ProFlow 里仍然值得付这个成本

因为项目的主要实施者不只有“一个一直记得全部上下文的人”，还有会换会话、会失忆、会局部优化的 Chat / Codex / Agent。

对这种开发方式，最大的危险之一是：

```text
当前 test fail
→ AI 找到最短代码修改
→ 局部 GREEN
→ 但 Owner / Contract / Runtime boundary 已悄悄漂移
```

DDD / SDD / TDD 联合后的目标正好相反：

```text
先问 Owner 是否正确
→ 再问 Contract 是否已经裁决
→ 再问 Test Plan 要证明什么
→ 最后才允许最小实现
```

它牺牲局部修改速度，换取的是**跨 Chat、跨 package、跨真实 Runtime 的语义稳定性**。

## 11. 这套方法还解释了为什么 Phase 2 可以被重写而不是被复制

Phase 3 新仓库明确把旧 `ai-agent-platform` 设为 reference-only：

```text
不建立 runtime dependency
不 wholesale copy legacy architecture
```

但 Phase 2 已验证的 Approval、Idempotency、Delivery、UNKNOWN、no-blind-retry 等语义不能丢。

如果没有“Owner → Rule/Contract → Proof”的抽象层，重建只能二选一：复制旧实现，或者重新发明一遍。

SDD/TDD 让项目可以：

```text
丢掉旧 implementation shape
保留已经验证的 semantic contract
再用新实现重新证明
```

所以它也是 `REWRITE IMPLEMENTATION / PRESERVE VALIDATED SEMANTICS` 能成立的基础。

## 12. 最终应该怎么理解 DDD + SDD + TDD

不是：

```text
DDD / SDD / TDD = 三个高级工程 buzzword
```

而是：

```text
DDD = 决定谁有资格修改哪类事实
SDD = 决定修改前必须先冻结哪种系统承诺
TDD = 决定这个承诺必须怎样被机器证明
```

如果再把 ProFlow 后期的研发基建和真实验收接上，完整链条是：

```text
DDD            → owner / boundary
SDD            → rule / contract / decision
TDD            → executable proof
Public Context → 跨 Chat 保持执行记忆与纪律
Reality Gate   → 证明外部世界真的成立
```

这五层共同回答的是：**一个由 AI 长期参与开发的大型工程，怎样避免每轮都从当前代码和当前聊天重新发明系统。**

## 13. 当前一级亮点候选

> **ProFlow 不是简单“采用 DDD/SDD/TDD”，而是把三者组合成 AI 工程治理协议：DDD 固定 Truth Ownership，SDD 要求架构语义先于实现冻结，TDD 把 Critical Proof 变成机器 Gate；当实现反证设计或 Acceptance 未冻结时，Agent 必须 STOP 而不是自行扩 Scope。代价是明显的 Change Amplification，但它换来了跨 Chat、跨 package、跨 Runtime 的语义稳定性，并支持 Phase 3 在不复制旧架构的前提下迁移 Phase 2 已验证语义。**

## 14. 主要证据

```text
2026-08-13  c23691b / f6496bb  Frozen Phase3 baseline / implementation spec 先于领域实现
2026-08-15  8e66b90            v2.1 architecture ruling
2026-08-15  a33a477            test/proof expectations 先于对应实现迁移
2026-08-15  32363da / 5278fc6  Task/Agent/Browser implementation follow-up
2026-08-17  e84aefd            ACCEPTANCE_NOT_FROZEN → STOP rule
2026-08-20  0968242            seven-command design freeze
2026-08-20  30033e6            four-step refactor STOP gates / DOMAIN_BLOCKER
2026-08-20  36c59a6            seven-command Test Plan alignment
2026-08-20  def5628+           implementation follows frozen design/test plan
2026-08-28  eaae824            retire ownership-less chatgpt-carrier
当前 AGENTS/Test Plans            RED-first / SPEC_GAP / Real-vs-Fake / Critical-Proof gates
```
