# ProFlow｜公共上下文从 Handoff 到 Executable Project Memory

> 状态：ACTIVE_RESEARCH / STRONG_EVIDENCE
> 建立：2026-09-04
> 主题：跨 Chat 长周期 Agent 工程中，项目记忆如何从交接文档演进成可路由、可恢复、可验收的执行记忆系统。
> 边界：本文解释 ProFlow 的工程方法与历史演进，不替代当前 `repos/proflow/spec/平台架构与公共约定/00-公共上下文/` 真源。

## 1. 这条演进解决的不是“文档不够多”

ProFlow 的问题从来不是缺少 handoff。

真正的问题逐步变成：

```text
旧 Chat 已经知道很多
→ 新 Chat 不能继承模型内部状态
→ 把关键知识写成文档
→ 文档越来越多
→ 新 Chat 知道知识“存在”，却不知道该读哪份、哪份仍有效
→ 甚至知道原则，却不知道具体怎么执行和恢复
```

所以最终问题是：

> **如何让项目知识在 Chat 边界之外继续保持“可执行”。**

这比普通 README、项目 Wiki 或聊天摘要更接近 Context Engineering。

## 2. 第一阶段：8 月 24 日第一次把“跨 Chat 接管”变成仓库能力

`GIT_VERIFIED` — `1d458f1`（2026-08-24）第一次把 `00-公共上下文` 正式放进 ProFlow。

它并不是一个临时 `handoff.md`，而是一次性建立了：

```text
历史时间线
当前总控状态 / Real 路线
冻结架构与关键决策
测试验证与验收方法
执行纪律与工具规则
新 Chat 接管模板
历史问题与防回归
关键真源与 Evidence 导航
README
```

最初 README 已明确目标：

> 为 Phase 3 最终真实验收提供跨 Chat / Agent 的稳定公共上下文与总纲总控入口。

这说明“Chat 会耗尽、项目必须能被下一 Chat 接住”不是后期补丁，而是在 Real-2 进入真实 Browser / Custom GPT 长流程时被正式产品化的工程需求。

## 3. 第一版的设计原则其实是“小而稳定”

初版并不鼓励无限写文档，反而明确要求：

```text
公共上下文只保存跨领域、跨 Chat、长期稳定的控制信息
不要长期写死 package version / HEAD / PID / 一次性 Workspace
领域实现细节和单次 blocker 回到领域或 Evidence
```

新 Chat 的目标也不是读完所有历史，而是按最小顺序恢复：

```text
当前 Gate
→ 验收方法
→ Frozen Architecture
→ 执行纪律
→ 当前领域正式 spec / test / evidence
→ 只有追原因时才读历史
```

`DERIVED` — 这个阶段的核心抽象是 **Stable Context Pack**：把模型会话之外必须保留的控制面压缩成有限的仓库资产。

它解决了“换 Chat 直接失忆”，但还没有解决后来的“稳定知识越来越多以后怎么按需取回”。

## 4. 第二阶段：真实 Deployment / Real-3 把 handoff 自己变成了负担

`GIT_VERIFIED` — 8 月 25 日以后，Tunnel、Fresh Workspace、Browser、Provider、Registry、Deployment Closeout 持续产生新的接力文件和执行快照。

典型演进包括：

```text
Tunnel handoff
Fresh Workspace acceptance handoff
Real-3 current context
Deployment Closeout WIP
Final npm latest handoff
Next Chat prompt
Harness incident / recovery notes
```

这里出现了一个反直觉问题：

```text
为了防止 Chat 失忆
→ 不断增加 handoff
→ handoff 又包含状态、方法、历史、事故、下一步
→ 新 Chat 的读取集合越来越大
→ 同一稳定规则开始在多份文档镜像
```

`DERIVED` — 这时项目遇到的已经不是 **context loss**，而是 **context retrieval / routing failure**。

## 5. 第三个转折：经验不能只留在“当前 Chat 成功过”

`GIT_VERIFIED` — 2026-08-30～09-01 的真实 Deployment Closeout 不断把稳定执行经验回写到长期上下文。

例如真实事故逼出了：

```text
批量文档同步，而不是逐文件 read/edit/read
稳定 UI 路径第二次出现就 helper / harness 化
CLI prompt 一次响应的具体状态机，而不是宽泛 Yes 匹配
Browser / CLI / Evidence 三方交叉验证
非幂等 UNKNOWN 先恢复 Authority，再决定是否继续
长任务短批次 + PID / log / checkpoint
```

`cb9dd64`（2026-09-01）进一步把真实人机 E2E 经验抽象为：

```text
FAST REPLAY
FULL FRESH
SAME SCENE recovery
stable-flow freeze
phase timing
```

这意味着 Public Context 的职责开始从“保存当前进度”升级为：

> **保存下一 Chat 不应该重新发明的工程经验。**

## 6. 第四个转折：Context 自己也需要 Ownership

`GIT_VERIFIED` — `c85e986`（2026-09-03）把公共上下文重组为四层：

```text
01-长期规则
02-当前接力 / CURRENT
03-自动化知识库
90-历史记录
```

这不是单纯整理目录，而是给“知识”本身建立 Owner：

```text
所有 Chat 都必须知道？
→ 长期规则

下一 Chat 接着干必须知道？
→ CURRENT

某个 Package / 外部资源稳定 SOP？
→ Package Runbook

跨包机械能力？
→ 基础动作

多个动作的当前业务/验收编排？
→ Flow

只用于追事故和过去 Evidence？
→ 历史记录
```

核心规则变成：**同一稳定知识只能有一个 Owner。**

## 7. Context 从静态资料变成有生命周期的项目记忆

四层之后，项目又定义了固定维护算法：

```text
执行前
README → 长期规则 → CURRENT → REQUIRED_CONTEXT

执行中
Round 只记录真实 Evidence / failure / checkpoint

执行后
按知识类型写回唯一 Owner
```

Round Closeout 还必须回答五个问题：

1. CURRENT 是否变化？
2. 是否产生新的 Package / External Resource 稳定知识？
3. 是否产生跨包复用的自动化 / 恢复知识？
4. Flow 顺序、checkpoint 或 recovery 是否变化？
5. 是否有只应进入历史的原始 Evidence？

`DERIVED` — 这让 Context 不再是“定期整理文档”，而是进入工程循环本身：

> **执行产生新知识 → 新知识按 Owner 写回 → 下一 Chat 以更成熟的默认路径继续执行。**

## 8. 关键反例：第一次治理完成后，执行记忆仍然压缩过度

这条历史最重要的地方，是治理本身也接受 Reality Audit。

`SOURCE_VERIFIED` — `上下文治理交叉审计-20260902.md` 明确记录：治理后的第一版存在“原则保留、执行记忆压缩过度”。

真实缺口包括：

```text
P0  gptweb-mcp → tunnel-client → Playwright Extension → Real Chrome 的 runtime SOP 缺失
P0  Browser connect / recovery / 禁止旧 9229 回退的执行语义缺失
P1  Custom GPT LIVE_CREATED 后的不可逆恢复路径不够明确
P1  CLI / PTY canonical helper 没有独立 Runbook
P1  Targeted Gate / dirty-tree 单包 release 恢复入口缺失
P1  Real-3 J1～J4 有业务图，但缺真实执行入口
P1  Model Provider / Runtime READY Authority 不明确
```

也就是说：

> **“新 Chat 理解原则”不等于“新 Chat 能继续真实执行”。**

这次失败把 Context Governance 从信息压缩问题，推进成了 executable knowledge migration 问题。

## 9. Executable Knowledge Migration 的五项硬门

治理规则最终要求每个未来会被新 Chat 真实执行的领域，都必须迁移五类知识：

```text
EXECUTION_ENTRY
= 从哪个公开命令 / helper / tool 进入

CANONICAL_ASSET
= 已验证且应复用的唯一脚本 / helper / API

AUTHORITY_SOURCE
= 当前真值去哪里机械读取

RECOVERY_PATH
= timeout / UNKNOWN / 断连后按什么顺序恢复

DO_NOT_REPEAT
= 哪些旧 transport / 临时脚本 / 昂贵步骤禁止重新探索
```

只要这些内容仍然只存在于旧 handoff、历史 Chat 或事故记录，而没有进入活跃 Runbook，就明确判：

```text
CONTEXT_KNOWLEDGE_MIGRATION_GAP
```

`DERIVED` — Context 的验收单位已经从“信息是否被保存”，变成了“下一执行者能否从稳定入口恢复行为”。

## 10. 最终还给“项目记忆”做了自己的 E2E

治理完成后不是人工看目录，而是做“失忆新 Chat 执行模拟”。

限制条件故意非常苛刻：

```text
不给 90-历史记录
不给旧 handoff 全文

只给：
README
CURRENT
REQUIRED_CONTEXT
Routing Index
活跃 Runbook
```

然后验证新 Chat 能否恢复：

```text
真实 Chrome 工具链与连接恢复
CLI / PTY setup
Dev Tunnel auth / timeout / recovery
Custom GPT 创建后的安全恢复
Model Provider / Runtime READY authority
dirty tree 单包 release
Package Update 回原 checkpoint
Real-3 J1～J4 真实执行入口
```

最终机械结果记录为 `LOST_CONTEXT_SIMULATION = PASS`。

## 11. 这和 DDD / Tool Plane 是同一个思想在两个层面的延伸

业务域里，ProFlow 要求：

```text
Task truth → Task Owner
Execution truth → Execution Owner
Agent identity → Agent Owner
Deployment behavior → Module Owner
```

公共上下文后来采用同样原则：

```text
稳定铁律 → Long-term Rule Owner
当前状态 → CURRENT Owner
Package SOP → Package Runbook Owner
通用机械能力 → Primitive Owner
流程编排 → Flow Owner
历史证据 → History Owner
```

而运行这些知识时，又和研发工具四 Plane 对齐：

```text
Context Plane    → 找到足够且正确的上下文
Structure Plane  → 证明代码关系 / blast radius
Execution Plane  → 操作当前磁盘与真实进程
Reality Plane    → 观察浏览器 / 用户现实
```

`DERIVED` — ProFlow 的一个更深共同主题是：**无论是业务事实、工程知识还是工具能力，都尽量避免多份隐式真源。**

## 12. Trade-off：Executable Project Memory 也有维护成本

这套方法不是免费的。

主要成本包括：

```text
每轮必须做知识写回判断
稳定经验要从一次性事故中提炼
当前状态和历史证据必须持续分离
Runbook 不能复制成多份第二真源
旧 Context 归档前还要做 knowledge migration audit
```

如果治理过弱：

```text
下一 Chat 重复调查 / 重复发布 / 重建远端资源 / 重新踩工具坑
```

如果治理过强或压缩过度：

```text
大量治理文档
→ 读取成本高
→ 只剩原则，没有 executable detail
```

所以目标不是“保存最多 Context”，而是：**以最小活跃上下文恢复最大执行能力。**

## 13. Resume / Interview 边界

可以安全讲：

> 在长周期 AI Agent 工程里，把跨 Chat 接力从 handoff 文档逐步重构为四层项目记忆体系；为稳定知识定义 Owner、写回矩阵、执行入口、Authority、Recovery、Do-not-repeat，并用“失忆新 Chat 执行模拟”验证新会话无需加载历史全文也能恢复真实工程执行。

更强但仍准确的概括是：

> **Executable Project Memory / AI Engineering Control Plane**

不要夸大成：

- 通用 Agent Memory 产品；
- 自动学习/自主修改系统；
- 已量化提升多少倍研发效率（当前没有稳定对照实验）；
- 完全消除了跨 Chat 上下文损失。

真正可证明的是：项目把“能否跨 Chat 恢复执行”从经验问题变成了有 Owner、Migration Gate 和 E2E 的工程问题。

## 14. 可复用结论

```text
Context != 全量历史
Memory != 聊天摘要
Handoff != 可执行接管
```

长周期 Agent 项目的稳定记忆至少需要：

```text
Current State
Stable Rules
Executable Runbook
Authority Source
Recovery Path
Do-not-repeat
History / Evidence
Routing
Write-back
Lost-context Acceptance
```

这也是 ProFlow 当前最有辨识度的 AI Engineering 实践之一。
