# ProFlow｜Custom GPT 从在线配置到外部 Deployment Resource

> 状态：ACTIVE_RESEARCH / STRONG_EVIDENCE
> 主题：ProFlow 如何把 ChatGPT Builder 中原本依赖人工维护的 Custom GPT，工程化成可版本化、可部署、可验证、可恢复的外部 SaaS Agent 资源。
> 边界：ChatGPT / GPT Builder / Custom GPT 本身属于 OpenAI；本文讨论的是 ProFlow 对外部资源的 materialization、identity、validation 与 recovery，不把第三方产品能力归为个人实现。

## 1. 起点不是“自动化创建 GPT”，而是人工配置无法进入 Deployment Contract

Phase 2 早期，Custom GPT 更像一个人工投影对象：

```text
Git 中准备 Instructions / Knowledge / Action
→ 人工进入 GPT Builder
→ 手工配置
→ Preview 验证
→ 人工记录线上 g-id / 状态
```

这能验证产品路线，却有一个部署层面的硬缺口：

> **源码/package 已安装，不代表真实 SaaS Agent 已存在、配置正确并且能以正确身份调用 Gateway。**

因此真正要解决的不是“少点几下鼠标”，而是把远端 GPT 的创建与验证纳入正式 Deployment Truth。

## 2. 2026-08-20：第一代方案仍然保留明显人工步骤

`GIT_VERIFIED` — 08-20 `8e2cb4b` 开始让 Module.setup 暴露 executable agent/carrier actions，但当时角色 materialization 仍带有 setup assistant / 人工在线配置色彩。

这类方案的问题不是不能用，而是不能回答几个 Deployment 必须回答的问题：

```text
线上 GPT 到底有没有被创建？
它是不是当前 package 对应的 GPT？
Bearer/Auth 是否已经写入真实 Builder？
线上配置是否与 package version 对齐？
创建后验证失败，到底该重建、回滚还是恢复？
```

如果这些问题仍由人工记忆和页面状态回答，Custom GPT 就还没有真正进入平台的 deployment lifecycle。

## 3. 2026-08-24：Real-2 开始把“在线配置”冻结成可执行 Provisioning Contract

`GIT_VERIFIED` — `1d458f1 feat(real2): freeze custom gpt provisioning b1-b5` 后，项目进入密集真实 UI 收敛：two-stage create、private publish surface、cross-tab、hidden controls、live publish readback、exact create action 等问题连续暴露并修正。

这批 commit 的意义不是 selector 数量，而是：**远端 SaaS UI 是 External Reality，必须由 deterministic Driver + readback 证明，不允许模型自由点击或固定坐标猜测。**

## 4. Agent Package 开始拥有“可物化材料”，而不只是 Prompt

Real-2 最终要求每个 Agent Package 能 materialize 一组完整的 provisioning material：

```text
displayName / description / instructions / starters
recommendedModel / capabilities
actionSchema / role-scoped Bearer
static provisioning Knowledge material
```

这里要避免一个容易混淆的说法：**动态 Task 文档不会进入永久 Role Knowledge。** Real-2 的静态 provisioning material 与运行期 `getTaskDocument / File Bridge` 是两套不同生命周期。

于是 Agent Package 的工程含义发生变化：

```text
旧：Prompt / Instructions 文件集合
新：可以把一个逻辑 Role 物化到外部 SaaS Host 的部署单元
```

## 5. 08-24：把 Product 的私有实现抽成公共 `createCustomGptRole`

`GIT_VERIFIED` — `3b74c3e` 暴露 reusable Custom GPT role creation API，`4c0423e` 首先把 Product role creation 切到公共 API；随后 Controller / Test-Ops 也迁入同一路径。

这一步真正消除的是**每个角色自己发明一套 GPT 创建流程**。角色 package 只提供材料，Browser/Agent 的公共部署能力负责 external materialization。

## 6. Auth 的转折：Bearer 不能在 GPT 创建后“再补一下”

08-25 的一串提交真实暴露了 Auth ordering：先尝试 post-create repair，随后收敛到 candidate credential 在 Create 前准备并写入同一个 Editor。

最终顺序变成：

```text
prepare candidate credential（仅内存）
→ configure Action + Bearer in current Editor
→ readback Auth state
→ create Private GPT
→ obtain real g-id / carrierUrl
→ persist Role + same credential
→ authenticated Gateway validation
```

这里最重要的不是 Bearer 本身，而是**身份材料和外部资源创建必须属于同一个受约束 deployment intent**，否则会出现“GPT 已创建，但认证身份还没闭合”的半成品 Reality。

同时 secret 被严格限制：不进入 Git、extension static assets、chrome.storage、runtime config、log 或 Evidence；真实 UI 重开后只能观察 `[HIDDEN]` 保存状态，不能把 secret readback 当验证方式。

## 7. `g-id` 从页面 URL 片段变成 durable Role identity

GPT 创建成功后返回真实：

```text
roleRef    = g-id
carrierUrl = https://chatgpt.com/g/<g-id>
```

Agent Runtime 对两者做 exact binding。它们不是授权凭据，但成为外部 Role Resource 的稳定 identity。

## 8. 最大的恢复语义转折：`LIVE_CREATED` 之后，本地失败不能抹掉远端事实

这是这条演进最值得讲的地方。

早期很自然的事务直觉是：

```text
create GPT
→ save local Role
→ validate Gateway / Carrier
→ validation fail
→ rollback local Role
```

但 2026-09-01 Fresh Deployment regression 证明这个 rollback 语义是错的：**远端 GPT 已经创建成功，本机却把 durable Role 回滚掉，会丢失唯一能指向这份不可逆 Reality 的 authority。**

因此 FINAL_FROZEN Test Plan 改成：

```text
Create 前失败
→ 没有远端 GPT
→ 不保存新 Role

LIVE_CREATED + saveCurrentRole 后 validation 失败
→ 保留同一个 roleRef / credential
→ Role 保持 non-READY
→ 下一次 setup 只重做只读 validation
→ 禁止重新 create
```

当前 `custom-gpt-role.ts` 甚至把这条原则直接写进实现注释：远端 GPT creation 对本 host 不可逆，post-create validation failure 不得 rollback durable Role，避免下一次 setup 重复造 GPT。

## 9. `READY / MISSING / DRIFT` 把远端 SaaS 状态变成可恢复的 Deployment Decision

最终 `Module.setup` 不再把“有个 GPT URL”当 READY：

```text
READY
→ 当前 Role + validation evidence 都仍与 package/gateway facts 对齐
→ 直接复用，不重复创建

MISSING
→ 没有 current Role
→ 自动 provisioning

DRIFT
→ 已有 Role，但 package/version/config reality 不再满足当前合同
→ fail closed
→ 不自动 Edit 旧 GPT
```

这是一种重要的外部资源治理取舍：**正常 setup 可以自动创建缺失资源，但不会为了“看起来自动化”去静默改写已存在的 SaaS Agent。**

显式 recreate 是另一种语义：允许创建新的 g-id，并只替换同一个 Agent Package 的 current Role binding；历史远端资源存在与“当前绑定是谁”是两件事。

## 10. Workspace create queue 解决的是外部 UI 并发，不是业务并行

真实 GPT Editor 的 create/publish surface 并不适合多个角色同时抢占，因此公共 API 最终对同一 workspace 的 GPT create 串行化。

同时队列要求 failure isolation：前一个角色创建失败不能 poison 后一个角色。这个 serial queue 属于 **SaaS provisioning physical constraint**，不能泄漏成运行期 Task/Worker 的串行业务规则。

## 11. Provisioning 与运行期 Browser Carrier 被刻意隔离

FINAL_FROZEN Test Plan 明确要求 provisioning DTO 不出现：

```text
taskId / nodeId / workerRef
conversationLocator / executionRef
```

`/gpts/editor` 的创建配置状态机，与运行期 `/g/*` Conversation 的 CREATE / RESTORE / WAKE 是两个不同生命周期。

这避免了一个很危险的设计捷径：因为两者都发生在浏览器里，就让同一个 Browser workflow 同时拥有“部署 Agent”和“推进 Task”的 Authority。

正确分层是：

```text
Deployment Provisioning
→ materialize stable Role resource

Runtime Carrier
→ materialize / restore Task-bound Worker Conversation
```

Role `g-id` 可以跨 Task 存在；Worker `c-id` 属于具体协作实例。两者都不能退化成 transient tab identity。

## 12. Real-2 验收证明的是外部 Reality，不是 DOM Fixture

最终 Gate 明确允许单测 fake DOM / Chrome API / bridge，但 Real-2 的最终证据必须来自真实 ChatGPT Editor 和真实账号环境。真实证据包括：

```text
真实 Extension hello / heartbeat
真实 /gpts/editor DOM
真实 ZIP upload
model / capability / Auth readback
真实 Private GPT create
真实 g-id / carrierUrl
真实 Role / credential persistence
真实 Gateway authenticated probe
```

最终三个角色真实创建成功，`ROLE_COUNT=3` 且三个 current Role 使用不同 g-id；同 package 连续显式 recreate 3 次，每次获得新 g-id，但 current binding 始终只有一条。

所以这里的测试结论不是“Driver 能操作假页面”，而是：**部署系统能够把 package material 稳定映射成外部 SaaS Reality，并能从失败中恢复而不制造重复资源。**

## 13. 和第 14 条 Host-first 的边界

第 14 条回答：

> 为什么不从 Chat UI 开始重造，而选择复用 ChatGPT Host？

本条回答：

> 当 Host 本身是第三方 SaaS 时，怎样让其中的 Agent 进入自己的 Deployment Contract？
## 14. 和 Release / Browser 两条轴也不同

它和第 12 条 Release Supply Chain 相似之处，是都拒绝让上游 PASS 冒充外部 Reality；但第 12 条处理 npm package/Registry/Installed Truth，本条处理 **SaaS Agent resource identity / materialization / validation**。

它和第 13 条 Browser Reality Adapter 相交，是因为真实 GPT Editor 需要 Browser 执行；但 Browser 只负责不可替代的页面 Reality，Role 当前是谁、是否 READY、credential 与 validation evidence 的 durable truth 仍归 Agent/Deployment Owner。

## 15. Trade-off：少了人工配置，增加了外部资源生命周期治理

自动 provisioning 并没有把成本变成零，而是把成本从“用户照文档手工配置”转成：

```text
Builder DOM conformance
provisioning bridge / heartbeat
material versioning
secret-safe transport
external identity
validation evidence
DRIFT / recreate / recovery
```

这是合理交换，因为这些复杂度只实现一次，正常用户不再需要理解 Schema、Bearer、g-id 保存、角色覆盖和后续验证顺序。

但代价也意味着：Host UI 变化会成为真实兼容性工作，不能把 Custom GPT provisioning 伪装成稳定的 OpenAI management API。
## 16. 最终形成的 Resource Model

```text
Agent Package
→ versioned Role material
→ deterministic SaaS provisioning
→ LIVE_CREATED external resource
→ durable g-id Role binding
→ role-scoped credential
→ authenticated validation evidence
→ READY / MISSING / DRIFT recovery

Task Runtime
→ bind stable Role
→ create / restore c-id Worker Conversation
→ execute collaboration
```

最稳定的原则是：

> **External SaaS Agent creation is a deployment effect, not a configuration note.**

以及：

> **Once external reality is created, recovery must preserve its identity before retrying validation.**

## 17. 求职可讲的核心

可以讲：把 Custom GPT 从人工 Builder 配置升级成 Agent Package 驱动的真实部署资源，建立 deterministic Editor provisioning、真实 g-id Role、Bearer/Auth、validation evidence 与不可逆 `LIVE_CREATED` recovery；真实创建三个 Private GPT 并验证同 package redeploy/current binding 语义。

不能讲：实现了 OpenAI Custom GPT management API、实现了 ChatGPT/GPT Builder、或者建立了企业级 SaaS provisioning 平台。
