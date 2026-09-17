# ProFlow 怎样从一次跑通走向长期可运行的工程系统

Agent（智能体：能够理解目标、调用工具并完成一段工作的模型角色）把一个 Demo 跑通并不难。真正困难的是时间拉长以后：Chat 会换班、Browser 会刷新、进程会重启、命令会 timeout、真实副作用可能已经发生、测试工具本身也会出错，Task 成功以后还要判断究竟该不该继续下一轮。

ProFlow 后来发现，这些看起来属于“记忆、执行、测试、Monitor、产品迭代”的问题，其实都在问同一件事：**系统怎样跨时间保持连续，而且每次恢复都知道现在应该相信什么。**

可以把长期运行理解成三种连续性：

```text
状态连续
→ 换 Chat、换 Tab、重启进程以后还能知道工作做到哪里

现实连续
→ timeout 以后还能确认副作用到底发生没有

证明连续
→ 修完问题以后能回到正确现场验证，而不是每次从世界开端重跑
```

## 第一种连续性：Conversation 不是长期状态数据库

早期长任务很自然地依赖 Conversation 和 handoff（交接材料：把上一班的滚动事实和未决事项交给下一班）。只要旧 Chat 还在，很多信息似乎都“记得”；换一个 Chat 后，新执行者又要重新摸索入口、工具、当前状态和失败路线。

ProFlow 后来把三种记忆拆开：

```text
Conversation Context
= 当前这一轮判断需要的局部上下文

Task / Runtime State
= 当前工作做到哪里、谁在做、哪些真实操作已经发生

Project Memory
= 跨 Chat / 跨 Task 长期保留的规则、入口、恢复方法和历史证据
```

Task（任务：有明确目标、范围和结束条件的正式工作）与 Node（节点：Task 中由某个角色承担的一步工作）提供业务骨架。Worker Conversation 可以关闭，Browser 可以重启，但 Task 仍保存 Requirement、节点顺序、Role binding、状态、`runNo`、version 和历史。

这背后的关键是 Fact Owner（事实归属方：某类正式事实唯一可信来源）。Task 是 READY、IN_PROGRESS、WAITING 还是 FAILED，不能由某个 Chat 的记忆或某个 Tab 的视觉状态决定。

## `reopen` 不是把历史抹掉重来

恢复失败 Node 时，正式语义保留同一个 `taskId / nodeId`，增加新的 `runNo`。旧 run 的失败仍然存在，新 run 是明确的恢复轮次。

这让系统以后能够回答：哪一轮失败、为什么失败、哪一轮恢复、用了什么新 Evidence（证据：支持某个正式结论的现实证明）。长期工程不能靠“最终成功”把中间历史擦掉。

## Project Memory 从 handoff 逐渐变成可执行资产

2026-08-24 的 `1d458f1` 是公共上下文正式化的重要锚点。目标不是保存所有聊天内容，而是让下一班在旧 Chat 不存在时仍然能找到稳定入口。

随着 Real-1 / Real-2 / Real-3、Tunnel、Browser 和 Deployment 事故不断积累，handoff 又出现新问题：文件很多、内容都在，但下一班不知道该先读哪一份、哪份是当前真值。

09-03 的 `c85e986` 进一步把公共上下文分成长期规则、CURRENT、自动化知识和历史。

中间还有一次非常重要的反例：为了让上下文“短而稳定”，材料被压缩得太狠。新 Chat 能理解原则，却不知道真正执行所需的五件事：

```text
EXECUTION_ENTRY
从哪里开始？

CANONICAL_ASSET
哪个脚本 / API / Tool 是稳定入口？

AUTHORITY_SOURCE
当前事实去哪里读？

RECOVERY_PATH
断连、timeout、UNKNOWN 后怎么恢复？

DO_NOT_REPEAT
哪些旧路线已经证明无效？
```

于是形成 Executable Project Memory（可执行项目记忆：不仅记录结论，还能让失忆的新执行者直接恢复真实工作）。

项目甚至做过 Lost-context Simulation（失忆上下文模拟：故意不给新 Chat 完整历史，只给正式入口材料，验证能否恢复执行）。这使“跨 Chat 连续”第一次从写文档变成可验收能力。

## Monitor 换班现在解决的是运行协调，不是本机工具撤权

Monitor（监控工程 Chat：观察、修复和验证 ProFlow 自身的工程会话）进入长周期后，单纯 handoff 仍然不够。系统还需要知道当前 Run（一次连续自迭代运行）和 Shift（其中一班 Chat 值守周期）是谁、交接材料在哪里、新 Chat 是否真的完成了上下文恢复，以及旧班何时进入 retired 状态。

因此完整 rotation（轮换：把运行协调和上下文从一班 Chat 交给下一班）至少包含：

```text
旧班进入 DRAINING
→ reconcile 已知 RUNNING / UNKNOWN Effect
→ 生成 HANDOFF
→ 生成 NEXT_CHAT_PROMPT
→ 创建 / 恢复下一班 Chat
→ 下一班读取固定公共上下文 + CURRENT + HANDOFF
→ boot proof
→ Monitor Owner takeover
→ 新班 ACTIVE
→ 旧班 RETIRED
```

但 2026-09-17 的当前设计已经明确删除了早期“Monitor 接班时撤销旧 Chat Local Dev 权限、再给新 Chat 发 lease”的方案。

Local Dev 现在是通用、无状态 MCP（模型上下文协议工具：让 Chat 直接使用本机 Desktop Commander 能力），Monitor 不控制它，旧班和新班都可以正常使用。Run / Shift / boot / takeover 是 Monitor 的业务协调事实，不是本机工具授权。

Extension 内部仍有一个 monitor memory lock（监控内存锁：只在当前 Service Worker 进程内抑制重复页面动作）。它初始为 unlocked，执行受控页面动作时临时 acquire，`finally` 后 release；Extension restart 后重新 unlocked。当前设计接受 Monitor Chat 可能存在竞态，不用持久 CAS lock、lease 或 broker fencing 假装全局排他。

因此这一版长期安全依靠的是：

```text
Owner current fact
+ expectedVersion
+ idempotency
+ Effect receipt
+ APPLIED / NOT_APPLIED / UNKNOWN reconciliation
+ 明确 handoff / boot / shift 状态
```

而不是“只有一个 Chat 在操作系统层面拥有写权限”。这也是为什么 4 小时 rotation 的真实验收仍然重要：它要证明交接和 Browser 效果真的成立，而不是证明旧 Chat 被剥夺了 Local Dev。

## 第二种连续性：timeout 最危险的不是失败，而是不知道有没有发生

真实世界里的很多操作都会产生 Effect（副作用：会改变文件、进程、浏览器或外部服务现实的动作）。

最危险的恢复逻辑是：

```text
timeout
→ 当成失败
→ 再执行一次
```

因为 timeout 只说明调用方没有拿到确定结果，不证明副作用没有发生。

Phase 2 已经出现 `UNCERTAIN`；08-06 的 `c3ea9bf`、`1a7244a` 和 08-07 的 `f45e7ce` 继续强化 durable receipt（持久回执：在调用方失联后仍可重新读取的执行结果记录）与 recovery。进入 Phase 3 后，Execution 把结果收敛成三态：

| 状态 | 含义 | 下一步 |
| --- | --- | --- |
| `APPLIED` | 已有现实证据证明副作用发生 | 接受现实，继续业务判断 |
| `NOT_APPLIED` | 已有证据证明副作用没有发生 | 重新校验后，合同允许时才可重试 |
| `UNKNOWN` | 当前既不能证明发生，也不能证明没发生 | 停止盲重试，先核对现实 |

Reality Reconciliation（真实结果核对：结果不确定时回到权威现实确认实际状态）由此成为通用恢复原则。

## Reconciliation 必须回到各自真实世界

不同副作用的“现实”不同：

| 操作 | 应回读什么 |
| --- | --- |
| `file.write` | 文件是否存在、内容 / hash 是否匹配 |
| `git.commit` | HEAD、commit identity、index reality |
| `process.start` | PID、listener、启动命令、进程身份 |
| `browser.submit` / `worker.wake` | 正确 Conversation 是否出现同一 fingerprint |
| `worker.create` | Task binding 与稳定 Worker / Conversation identity |
| `npm publish` | exact `package@version` 是否真实存在于 Registry |
| Custom GPT create | stable g-id 与 Builder resource 是否已经出现 |

这里最重要的边界是：Execution UNKNOWN 不能直接被 Task FAILED 吸收。Execution 只回答“这个真实副作用发生了吗”；Task 回答“业务节点是否完成、等待或失败”。两套状态机不能互相冒充。

## 发布、Browser 和 Custom GPT 都在重复同一条 no-blind-retry 规则

Browser 已经证明消息进入 Conversation 后，下游 Agent 回答异常不能把 Browser submit 改写成“未发生”，否则系统会发送第二次。

`pnpm publish` timeout 后也不能直接再次 publish，而要查询 Registry（包仓库：npm 等发布产物的外部权威来源）的 exact version；存在就承认已发布，不存在才按合同恢复，Registry 自己也不确定就保持 UNKNOWN。

远端 GPT 已经 `LIVE_CREATED` 后，后续 validation 失败同样不能删除本地身份重建第二个 GPT。应该保留原 g-id，在原资源上修复。

这三种场景看起来完全不同，恢复心智却完全相同：**先承认现实可能已经改变，再决定下一步。**

## 第三种连续性：修完以后要回正确现场证明

真实 E2E（端到端验收：从用户入口一直验证到真实结果）很贵。早期 Browser E2E 同时负责发现问题、定位问题和最终证明，导致每次修复都可能重新经历 OAuth、GPT、Tunnel、Browser setup。

进入 Phase 3 后，验证逐渐分层：

```text
Spec / Contract / package proof
→ affected targeted proof
→ FAST REPLAY
→ SAME SCENE
→ FULL FRESH / Real Product Acceptance
```

FAST REPLAY（快速重放：只升级受影响产物并重放必要下游）适合便宜回归；SAME SCENE（原场景复测：回到最早失败现场证明 first divergence 已消失）保留现场；FULL FRESH（全新环境完整验收：从真实 latest artifact 和全新用户环境跑完整 Journey）负责阶段终局证明。

这三者不是互相竞争，而是不同成本档位。

## Real-1 / Real-2 / Real-3 为什么要拆开

一条巨大 E2E 红灯很难告诉你问题在哪。历史上逐渐把现实分层：

```text
Real-1
→ Registry / Fresh Workspace / install / setup / runtime / external resource

Real-2
→ Custom GPT Editor / provisioning / g-id / auth / role readiness

Real-3+
→ Product Task / Worker / Conversation Journey
```

这样失败时可以继续问：供应链错、外部 SaaS 资源错，还是业务 Journey 错，而不是每次都把所有问题扔给“端到端失败”。

截至 2026-09-17，Real-1 已 PASS，Real-2 已 PASS / FROZEN，Real-3 已 PASS / CLOSED，Phase 3 已封版。这些结果证明 Phase 3 基线，不自动替 Phase 4 的新流程做验收。

## 成功必须回到第一次使用的普通用户视角

08-31 的 `c6c8a98`、`52bf3e3` 把 Deployment Acceptance（部署验收：证明真实用户公开路径能够完整使用系统）从内部 API 视角转成第一次使用 ProFlow 的普通用户。

正常路径只能走真实 package、Fresh Workspace、公开 Platform CLI、真实 Browser / Tunnel / Model / Custom GPT。内部脚本、直接 SQLite 修改、共享事实注入可以用于诊断，却不能绕过产品缺陷后宣布用户成功。

一句话就是：**修复可以在工程视角完成，成功必须回用户视角证明。**

## Harness 自己也会制造假失败

09-01 的一轮 FULL FRESH 同时暴露产品问题和 Acceptance Harness（验收框架：重复执行真实验收、收集证据并区分产品与测试工具问题的自动化体系）问题，例如 AX helper、文件选择器时序、UI event 已发但页面 mutation 尚未完成、TTY prompt 驱动错误。

于是系统开始区分：

```text
Product / Platform time
vs
HARNESS_OVERHEAD（验收工具自身造成的额外耗时）
```

Harness bug 不能通过改产品 Contract 来“修绿”；被 Harness 污染的耗时也不能拿来做 happy-path baseline。

稳定 UI 流程逐渐冻结为：

```text
locate
→ mutate
→ observe visible state
→ verify
```

输入事件成功不等于页面现实已经完成变化。

## Product 连续迭代为什么还需要停止条件

系统能恢复、能验收以后，才有资格讨论持续迭代真实产品。

主链逐渐变成：

```text
真实问题 / Product Brief
→ Product 讨论与约束确认
→ Research / Brainstorm / 第一性原理做减法
→ Requirement / Acceptance
→ 有边界 Task
→ Product / Dev / Test
→ 实现 + 独立验证 + 真实验收
→ Product Gap Review
   ├─ 还有重要差距 + 有新证据 → 下一 Task
   └─ Goal 已满足 → Closure
```

Product Gap Review（产品差距复盘：基于上一轮真实产品结果判断剩余差距）最重要的问题不是“还能优化什么”，而是**下一轮为什么值得存在**。

如果同一个 Gap 没有新证据、没有新的可证伪方案，也没有可测进展，就应该停止自动续建。持续迭代如果没有 STOP 条件，很快就会变成无限优化循环。

## Monitor 飞轮与产品飞轮是什么关系

产品飞轮负责迭代目标产品；Monitor 工程飞轮负责修 ProFlow 自己。

```text
目标产品暴露 ProFlow 缺口
→ Monitor 读取 Source / Runtime / Browser / Evidence
→ 找 first divergence 和 Owner
→ 用工程工具修 ProFlow
→ Source / Package / Workspace / Runtime / Reality 重新收敛
→ 回到原产品 SAME SCENE
→ ProFlow 继续产品迭代
```

Monitor 不是第四个业务 Agent，也不替 Product / Dev / Test 做目标产品工作。它支撑产品飞轮能够长期继续。

截至 2026-09-17，Monitor Source Gate 和 Workspace / Runtime Adoption 都已经 PASS；Monitor Real Acceptance 仍为 `NOT_RUN`。当前 Workspace 配置仍故意保持 `enabled=false / notificationsEnabled=false`，所以长期 Monitor 尚未正式开启。真实 Browser turn loop、飞书 delivery 和 4h rotation 仍需要独立证据，不能从源码和 adoption PASS 推导。

## 一条长期运行的 Authority Ladder

把所有恢复问题压成一条 Authority Ladder（权威阶梯：从局部信号逐层上升到正式业务结论的可信顺序）：

```text
Command / transport result
→ 只证明局部调用发生了什么

Durable intent / precondition
→ 证明原本准备做什么

Owner / external readback
→ 证明现实现在是什么

Reconciliation
→ APPLIED / NOT_APPLIED / UNKNOWN

Owner business transition
→ 才能改变 Task / Agent / Deployment 正式状态
```

越靠前的信号，越没有资格越级替后面作结论。

## 长期可靠真正意味着什么

长期可靠不是“系统永不失败”，也不是“每个错误都自动重试”。它意味着失败以后仍然知道：

```text
现在相信谁
刚才的副作用有没有可能已经发生
不知道时什么时候必须停
下一班从哪里恢复
哪些旧路不能再走
修完以后回哪个现场证明
什么时候应该结束产品续轮
```

模型不会因此获得更多最终决定权。相反，时间越长、现实越复杂，就越需要把事实归属、执行权限、Evidence、Recovery 和 STOP 条件放在模型会话之外。

## 历史来源与证据入口

这篇文章主要吸收：`03-失败路线与架构重启.md`、`05-自动化验收Harness演进.md`、`08-公共上下文从Handoff到Executable-Project-Memory.md`、`17-从UNCERTAIN到Reality-Reconciliation.md`，并吸收原长期运行总文档中 Monitor rotation、Product Gap Review 和真实验收的独有内容。

这些历史材料解释长期可靠机制为什么出现；某个当前 Task、Monitor、Acceptance gate 是否已经通过，仍应以当前 Owner fact、Runtime 和真实证据为准。Monitor 的 2026-09-17 当前边界以当日 `CURRENT.md` 和 owning Module 事实为准，不沿用已经废止的 Local Dev lease / fencing 方案。
