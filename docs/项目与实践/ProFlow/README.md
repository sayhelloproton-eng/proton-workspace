# ProFlow｜项目历史、关键决策与工程方法沉淀

> 状态：`CURRENT_EVIDENCE_COVERED / INCREMENTAL_REFRESH_ONLY`
> 目录职责：持续沉淀 ProFlow 的历史演进、系统性决策、失败路线、关键转折与可复用工程方法。
> 事实边界：这里不是 ProFlow 当前实现真源，也不是求职物料真源；当前实现仍以 `/repos/proflow` 的 Spec / Source / Test / Registry / Product Workspace / Reality Evidence 为准。

## 1. 为什么单独建立这个目录

ProFlow 的价值不能只从最终 Package、API 和代码结构倒推。

真正需要长期保留的是：

```text
为什么最初这样选
→ 试过哪些替代路线
→ 哪些路线真实失败
→ 为什么改变架构
→ 哪些能力被保留 / 删除 / 回迁
→ 当前机制解决了什么历史问题
→ 哪些经验可以迁移到下一项目
```

因此本目录按 **Evolution Axis / Decision Episode** 组织，而不是按源码 Package 重写一份技术手册。

阅读顺序固定为：**判断与转折优先，机制其次，代码与测试作为 Evidence。**

## 2. 证据和结论怎么分层

本目录至少区分四类信息：

```text
GIT_VERIFIED / SOURCE_VERIFIED
= 可以由 Git 历史、当前源码、Spec、Test、Evidence 机械复核

CURRENT_DISK_VERIFIED
= 当前 working tree 真实存在，但尚未冻结为 Git 历史

DERIVED
= 基于多条已验证事实形成的架构结论

PROJECT_OWNER_CONFIRMED
= 用户明确做出的路线判断、取舍与目标定义
```

历史事实不能覆盖当前 Contract；当前代码也不能抹掉“为什么当初会改成这样”。

项目研究与求职叙事必须分开：这里保存完整工程史；`job-search-system` 只消费经过边界裁决的职业表达。

## 3. 当前研究入口

1. [01｜历史演进与关键转折](./01-历史演进与关键转折.md)
2. [02｜Chat、Custom GPT 与三条本机桥](./02-Chat与Custom-GPT及三条本机桥.md)
3. [03｜失败路线、真实事故与架构重启](./03-失败路线与架构重启.md)
4. [04｜多智能体角色压缩与 Authority 迁移](./04-多智能体角色压缩与Authority迁移.md)
5. [05｜自动化验收 Harness 的演进](./05-自动化验收Harness演进.md)
6. [06｜Deployment 从 Planner 到 Module 自治](./06-Deployment从Planner到Module自治.md)
7. [07｜DDD / SDD / TDD 如何真实控制大型 Agent 工程](./07-DDD-SDD-TDD如何真实控制大型Agent工程.md)
8. [08｜公共上下文：从 Handoff 到 Executable Project Memory](./08-公共上下文从Handoff到Executable-Project-Memory.md)
9. [09｜产品入口：从 Product GPT 到 Tasks Application](./09-产品入口从Product-GPT到Tasks-Application.md)
10. [10｜手机模型实验如何塑造 Capability-Driven Model Runtime](./10-手机模型实验如何塑造Capability-Driven-Model-Runtime.md)
11. [11｜复用成熟能力，但自己拥有系统真值](./11-复用成熟能力但自己拥有系统真值.md)
12. [12｜发布与 Registry：从源码绿灯到供应链真值](./12-发布与Registry从源码绿灯到供应链真值.md)
13. [13｜Browser 自动化：从万能 Host 到双平面 Reality Adapter](./13-Browser从万能Host到双平面Reality-Adapter.md)
14. [14｜为什么基于 ChatGPT：从 Host 复用到自有 Control Plane](./14-为什么基于ChatGPT从Host复用到自有Control-Plane.md)
15. [15｜Custom GPT：从在线配置到外部 Deployment Resource](./15-Custom-GPT从在线配置到外部Deployment-Resource.md)
16. [16｜实验代码如何毕业为正式架构语义](./16-实验代码如何毕业为正式架构语义.md)
17. [17｜从 UNCERTAIN 到 Reality Reconciliation](./17-从UNCERTAIN到Reality-Reconciliation.md)
18. [90｜亮点发现池](./90-亮点发现池.md)
19. [91｜全时间线覆盖审计｜2026-09-04](./91-全时间线覆盖审计-20260904.md)

后续按证据继续增加专题。不是为了凑目录；只有某条演化轴已经有足够材料、值得独立解释时才拆文档。

## 4. 当前已经确认的核心认知

“ProFlow 使用 ChatGPT”这个说法太粗。

至少要分三种角色：

```text
研发侧 Chat
→ 高价值分析、规划、审计、项目治理
→ 通过 MCP / Local Dev / CodeGraph / Browser / Repomix 使用本机工程能力

产品侧 Custom GPT
→ 版本化 Agent Role Carrier
→ 通过 Actions + Gateway 调用 ProFlow Public Contracts
→ 通过 Browser Reality 被创建、恢复、绑定和唤醒

本地 / 手机 Model Runtime
→ FAST / REASON 等受控推理角色
→ 只消费 bounded ReasoningSpec
→ 不拥有 Task、Approval 或真实 Effect Authority
```

三者都使用模型能力，但承担的系统责任完全不同。

## 5. 研究时的真值优先级

发生冲突时按以下顺序处理：

```text
当前磁盘 Source / Git diff / Runtime Reality
> 当前正式 Spec / Test / Registry
> Git 历史与历史 Evidence
> 本目录的 DERIVED 总结
```

例如 CodeGraph 索引与当前 dirty source 冲突时，以当前磁盘为真；历史方案与当前 Contract 冲突时，历史只解释“为什么变了”，不能覆盖今天的行为。

同样，`REAL_1 / REAL_2 / Deployment PASS` 不能推出 `REAL_3 PASS`；项目研究结论 PASS 也不能冒充产品工程 Gate PASS。

## 6. 与求职物料的派生边界

每条稳定发现可以被求职系统消费，但不能复制成第二份项目真源：

```text
proton-workspace/docs/项目与实践/ProFlow/
→ 完整历史 / 决策 / 失败 / trade-off / 可复用方法

repos/job-search-system/career-assets/projects/proflow/
→ Evidence / Deep Dive / Result / Acceptance
→ 后续 Resume / Interview 派生
```

项目文档回答“系统为什么变成这样”；求职物料回答“哪些能力能被本人安全、清晰、可追问地表达”。
