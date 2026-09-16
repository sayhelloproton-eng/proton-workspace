# ProFlow｜自动化验收 Harness 的演进

> 状态：ACTIVE_RESEARCH / STRONG_EVIDENCE
> 核心问题：ProFlow 为什么最后形成 `targeted gate → SAME SCENE → FAST REPLAY → FULL FRESH`，而不是“每次改完都重跑所有测试和真实 Browser”？

## 1. Phase 2：真实 Browser 既是验收场，也是调试场

2026-08-05～08-09 的 Git 历史里，Browser Host 在真实路径上连续出现 lifecycle、recovery、Approval、wake、user control、response wait 等问题。

这阶段的真实 Browser 很重要，因为它第一次证明：

```text
Custom GPT / Browser / Task / Local / Approval
```

确实可以串起来。

但它也暴露一个效率问题：**昂贵的真实 E2E 同时承担“发现架构问题、定位问题、证明修复”三种职责。** 每次失败都可能重新进入长链，测试本身变成调试器。

Phase 2 收口因此明确提出：真实 Browser 验收不应继续承担无限现场调试职责。

## 2. Phase 3：先把便宜、确定的问题挡在 Reality Gate 前面

独立 ProFlow 重建后，测试顺序收敛成：

```text
Frozen Spec / Contract
→ Frozen Test Plan
→ package / domain / contract test
→ presmoke / composition
→ real external gate
```

2026-08-15～16 连续出现 `presmoke batch1..6`，分别关闭 Task、Agent、Browser、Execution、Model、Deployment 等残差。

这个阶段的关键不是 test count，而是**分层证据**：能由 deterministic test 发现的 owner / contract / transport 问题，不再等真实 Browser 才暴露。

## 3. Real-1 / Real-2 / Real-3：不同 Reality 被拆成独立门

随后真实验证继续分层：

```text
Real-1
→ Registry / Fresh Workspace / install / setup / runtime / external resource

Real-2
→ 真实 Custom GPT Editor / Provisioning / g-id / Auth / Role readiness

Real-3+
→ 真正产品 Task / Worker / Conversation Journey
```

这样一个大 E2E 失败时，不再只能得到“系统没跑通”，而能知道失败属于哪一类 Reality Owner。

## 4. 2026-08-31：部署验收从“技术跑通”升级为“普通用户真的能用”

`c6c8a98` 与 `52bf3e3` 是重要转折。

之前 `PLATFORM_READY=YES` 足以说明技术主链能运行；之后完整 `DEPLOYMENT_SUCCESS` 还必须通过：

```text
Cognitive Load
Automation
CLI Interaction
Default Output
```

同时测试身份被冻结成：**模拟第一次使用 ProFlow 的普通用户。**

正常 Journey 只能走：

```text
真实 npm latest
→ Fresh Product Workspace
→ 公开 Platform CLI
→ 真实 Browser / Tunnel / Model / Custom GPT
```

源码、内部 package CLI、手改 `.proflow` / SQLite / shared facts 只能在失败后的工程诊断阶段使用，不能替用户绕过产品缺陷。

## 5. 固定循环：用户视角失败 → 工程修复 → 回原用户场景

```text
普通用户 E2E
→ 保存真实失败现场
→ 临时进入工程视角定位 Root Cause
→ 最小修复
→ changed + affected targeted regression
→ 退出工程视角
→ 回 SAME SCENE 重放
```

这条纪律的关键是：**修复成功不能用源码或内部状态证明，必须回到原失败的用户场景重新证明。**

## 6. 2026-09-01：测试 Harness 自己也会出 Bug，因此必须治理

最终 FULL FRESH 暴露了一个反直觉问题：产品功能可以是对的，但测试机器人自己可能很差。

真实事故包括：

- 临时重写 Browser AX helper；
- UI event 已发送就误判 mutation 完成；
- file picker Select 时序错误；
- CLI TTY prompt 被错误按键改变默认选项；
- 临时 `/tmp` helper 与已经验证过的稳定路径并存。

结果是：功能 Evidence 有效，但总耗时被判 `HARNESS_OVERHEAD` 污染，**不允许作为产品 happy-path 性能基线。**

因此测试基础设施也被冻结出自己的工程规则：

```text
唯一 repo-owned helper
locate → mutate → observe visible state → verify
事件已发送 != 状态已完成
成熟复杂 UI flow = FROZEN / DO NOT TOUCH
Harness 时间与 Product 时间分开统计
```

## 7. FAST REPLAY / SAME SCENE / FULL FRESH 为什么出现

#

## FAST REPLAY｜日常修复

```text
只升级 changed / affected artifact
→ 回原失败步骤
→ 重放必要下游
→ 最小 lifecycle / readiness 验证
```

FAST REPLAY 不重新 Fresh，不重做已经 PASS 的 OAuth、GPT 创建和远端资源创建，也不为每个 Bug 跑全仓。

#

## SAME SCENE｜失败恢复

失败停在哪一层，就从哪一层恢复。install / publish / create / deploy 等非幂等 mutation 如果结果不明，先恢复 authority；`UNKNOWN` 不是“从头再来”的信号。

#

## FULL FRESH｜阶段最终证明

```text
真实 latest artifact
→ 真正 Fresh 环境
→ 完整用户 Journey
→ 真实外部系统
→ final readiness / acceptance
```

最终用户链不能为了提速裁剪，但它只在 release / 大阶段收口低频运行。

## 8. 最终形成的是验证成本金字塔

```text
便宜 / 高频
source + contract + package tests
        ↓
changed / affected gates
        ↓
FAST REPLAY / SAME SCENE
        ↓
真实 Browser / External Reality
        ↓
FULL FRESH / Product Acceptance
昂贵 / 低频
```

真实 E2E 与工程 Gate 是两条不同证据链：

```text
测试全绿 ≠ 外部 Reality 已成立
UI 看起来成功 ≠ 代码没有回归
```

两者最终在 Acceptance 汇合。

## 9. 这条线真正值得讲什么

不是“我写了很多自动化测试”。

更强的项目故事是：

> **在真实 Browser / CLI / SaaS / Tunnel / Model 共同参与的复杂 Agent 系统里，把测试从一次性 E2E 脚本逐步演进成分层 Acceptance Harness：便宜问题前置，失败后 SAME SCENE 恢复，日常用 FAST REPLAY，阶段收口才 FULL FRESH；同时把测试机器人自身的失败、性能污染和稳定 UI helper 也纳入治理。**

换句话说：**让昂贵 Reality Test 从调试工具变成最终证明工具。**

## 10. 主要证据

```text
2026-08-05~09 Phase2 Browser Host 连续真实修复
2026-08-15~16 Phase3 presmoke batch1..6
2026-08-17+   Real-1 Fresh / Registry / Deployment
2026-08-24+   Real-2 Custom GPT Provisioning
2026-08-31    c6c8a98 Deployment Product Acceptance 四门
2026-08-31    52bf3e3 普通用户视角 E2E
2026-09-01    cb9dd64 FAST REPLAY / FULL FRESH / SAME SCENE 方法论
2026-09-01    6a1fd0f Browser/TTY Harness 事故复盘
2026-09-01    a80547e 最终真实 Fresh Product Acceptance PASS
```
