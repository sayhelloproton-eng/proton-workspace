# 手机模型调研、选型、测试与验证全景归档

> 归档范围：`SOL-MOB-001`、端侧模型研究、MLXHub/Qwen/Gemma/Privacy AI/OpenCode、Tool Proposal、FAST/REASON、Execution Flow Runtime 手机能力验证，以及相关 Chat / 项目记忆。
> 原始归档日期：2026-08-12
> 当前性质：**历史技术归档 / 已迁移研究材料**。本文保留当时可验证事实和演进证据，不再承担 2026-09 当前手机模型实现真值。
> 当前目录：`docs/专题研究/端侧模型/`；不会因为曾位于旧 `docs/technical` 而自动进入飞书。
> 事实纪律：历史、失效实验、当前实现和未来方向严格分开。

## 1. 这套文档解决什么问题

过去手机模型方向的事实散落在专题 Chat、续接 Chat、旧 `SOL-MOB-001`、测试脚本/结果、OpenCode 实验和 Execution Flow Runtime live gate 中。本归档已经把这些材料提炼为一个自包含入口，回答四个长期问题：

1. 2026-08 当时为什么选择 iPhone 17 Pro + MLXHub LAN Server + Qwen3.5 4B FAST/REASON；
2. 哪些能力真正经过真机验证，哪些只是早期构想；
3. 哪些失败来自模型，哪些来自测试脚本、协议适配或运行环境；
4. 这些实验如何推动 Provider、调度、权限与 Execution 边界演进。

旧原始方案和实验代码已经完成知识吸收后退休。需要理解“今天 ProFlow 怎样使用端侧模型”时，应回到当前 ProFlow Source / Spec / Runtime Reality 和 [ProFlow｜手机模型实验如何塑造 Capability-Driven Model Runtime](../../../项目与实践/ProFlow/10-手机模型实验如何塑造Capability-Driven-Model-Runtime.md)，而不是把本归档的 2026-08 snapshot 当当前合同。

## 2. 2026-08 冻结快照

```text
Phone Runtime = MLXHub LAN Server on iPhone 17 Pro

FAST
  = sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think
  = default / high-frequency / structured judgement / Vision

REASON
  = mlx-community/Qwen3.5-4B-MLX-4bit
  = explicit low-frequency escalation

Scheduling
  = one device-global serial inference lane
  = max inference concurrency 1

Authority
  = model produces judgement / proposal
  = Flow / Runtime / Policy / Approval / Executor own control and side effects
```

这是 2026-08-12 归档时的冻结快照，不是永久的“当前配置”。当时 Execution Flow Runtime `0.0.0-lab.13.3.1` 的 FAST 与 REASON 手机能力 gate 已完成；对应实验实现随后完成使命并退休，其稳定语义已经进入当前项目架构与本专题材料。

## 3. 状态标记

| 标记 | 含义 |
|---|---|
| **FROZEN** | 在对应历史时间点冻结的基线，不自动等于今天仍冻结 |
| **VALIDATED** | 有真实设备 / API / 文件系统 / 测试证据 |
| **ACCEPTED** | 当时已接受的架构或工程决策 |
| **HISTORICAL** | 当时真实存在，只用于理解演进 |
| **SUPERSEDED** | 后续已被替代，不得继续当成当前方案 |
| **INVALID-AS-VERDICT** | 实验执行过，但因 harness/checker 问题不能作为模型能力结论 |
| **OPEN** | 仍需在未来条件变化后重新验证 |

## 4. 阅读顺序

| 顺序 | 文档 | 主要问题 |
|---|---|---|
| 1 | [01-研究路线与选型时间线](01-研究路线与选型时间线.md) | 从最早构想到当时选型经历了什么 |
| 2 | [02-运行时与模型选型](02-运行时与模型选型.md) | 为什么当时是 MLXHub + Qwen FAST/REASON |
| 3 | [03-API-Vision-Context-性能与稳定性验证](03-API-Vision-Context-性能与稳定性验证.md) | API、Vision、长上下文、热稳定测到了什么 |
| 4 | [04-语义合同-Approval边界与安全验证](04-语义合同-Approval边界与安全验证.md) | 手机模型如何做候选判断而不拥有控制权 |
| 5 | [05-Tool-Proposal-OpenCode与执行权限](05-Tool-Proposal-OpenCode与执行权限.md) | native tool_calls 为什么失败，Tool Proposal 为什么仍可用 |
| 6 | [06-FAST-REASON角色与调度](06-FAST-REASON角色与调度.md) | FAST/REASON 的职责、切换和资源约束 |
| 7 | [07-Execution-Flow-Runtime手机能力验证](07-Execution-Flow-Runtime手机能力验证.md) | 当时实验 Runtime 的 capability gate 如何收口 |
| 8 | [08-失败-误报-被替代结论与经验](08-失败-误报-被替代结论与经验.md) | 哪些失败不能再被误读 |
| 9 | [09-实验资产与证据索引](09-实验资产与证据索引.md) | 结论来自哪些历史证据，哪些原始资产已退休 |
| 10 | [10-Chat与记忆来源索引](10-Chat与记忆来源索引.md) | 这些知识来自哪些 Chat / 项目记忆 |
| 11 | [11-当前冻结基线与后续使用约束](11-当前冻结基线与后续使用约束.md) | 2026-08 冻结快照和后续重测条件 |
| 12 | [12-关键结论证据矩阵](12-关键结论证据矩阵.md) | 关键结论、证据等级与解释边界 |

## 5. 当前 Owner 与历史来源的关系

当前仍保留的本地材料：

- [端侧模型节点与单模型多角色服务构想与验证方案](../端侧模型节点与单模型多角色服务构想与验证方案.md)：**HISTORICAL / Proposal**；保留早期目标和边界，不代表今天的选型。
- [ProFlow｜手机模型实验如何塑造 Capability-Driven Model Runtime](../../../项目与实践/ProFlow/10-手机模型实验如何塑造Capability-Driven-Model-Runtime.md)：当前项目实践层对这些实验怎样影响正式架构的总结。
- 本目录 `01～12`：已经吸收原始方案、实验和 Chat 的长期有用事实。

迁移前的重要来源身份仍可作为 provenance 记住，但不再要求文件继续存在：

```text
legacy SOL-MOB-001
= Phase 2 手机模型服务方案 / 真机实验入口
= 已吸收到本归档与 ProFlow 实践

legacy SOL-P3-MOB-001
= Phase 3 Provider 接入边界
= 已吸收到本归档与当前 ProFlow Provider/Model Runtime 语义

legacy experiments/execution-flow-runtime
= 当时的 VERIFIED LAB IMPLEMENTATION
= 实验代码已退休，稳定结论已吸收
```

这比保留一份旧仓作为“可点击证据库”更符合当前单一真源原则：历史来源身份可以保留，当前知识和工程 Owner 必须可辨认。

## 6. 不把什么混在一起

```text
理论 context window
!= 推荐生产上下文预算

HTTP 200
!= 语义正确

finish_reason=stop
!= 结构化输出完整

model confidence
!= execution authorization

MLXHub native tool_calls fail
!= Qwen 不会做工具选择/参数提案

模型能力 gate PASS
!= Browser/Gateway/Approval/Task/Local 全平台集成 PASS

压力测试发热
!= 日常生产 duty-cycle 必然不可用

历史 frozen snapshot
!= 今天的 current runtime truth
```

## 7. 当前维护规则

1. 本目录是历史研究归档；需要今天的实现事实时，先查当前项目 Owner。
2. 新的手机模型实验不再回写旧 `SOL-MOB-001` 或已退休实验目录，而是进入当前专题或真实项目的实验 Owner。
3. 只有设备、Serving、模型 Artifact、Inference Contract 或产品使用场景发生实质变化，才值得重新做对应 capability gate。
4. 旧 `phase3-runtime-integration-spike`、`phase3-final-platform-acceptance` 和 `execution-flow-runtime` 只作为历史来源名，不是当前正式包。
5. 物理地址、局域网 IP、临时模型槽位等实验环境事实不进入公共合同。
