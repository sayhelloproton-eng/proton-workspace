# ProFlow Monitor Chat Loop 临时实施计划 v4

> 状态：TEMP / 审计收敛完成 / 待实施
> 作用：作为本轮 Monitor Chat Loop 重构的唯一临时执行计划。
> 生命周期：实现完成、Engineering Verify、Runtime Convergence、Real Acceptance 全部通过后删除。
> 范围：仅 ProFlow Monitor Chat Loop；普通 Product / Worker Browser 流程不得被污染。
> 长期规则仍由 Formal Spec、Engineering Skill、Acceptance Skill、ProFlow Chat Loop Skill 负责；本文件不成为第二长期 authority。

---

# 1. 全量审计后的最终裁决

这次重构不是从零重写 Monitor，也不是把现有可靠性机制全部删除。

最终策略：

1. 简化业务状态：
   - 删除旧 run / shift / BOOTING / ACTIVE / DRAINING / RETIRED / STOPPED 平行状态机。
   - 删除正式路径上的 runs/*.json 与 observations/*.json 双 truth。
   - 不再保留独立 Monitor Coordinator。

2. 保留并复用当前已经成熟的可靠性资产：
   - loopback + bearer token。
   - shared-facts 中现有 endpoint / token-file 发现机制。
   - Browser dedicated Monitor lane。
   - monitor.chat.create / monitor.chat.submit 现有执行能力。
   - effectStarted 与 APPLIED / NOT_APPLIED / UNKNOWN reconciliation 语义。
   - contentInstanceId 与 Extension instance identity。
   - boot proof 内容证明。
   - atomic file write。
   - Feishu delivery 的 PENDING / ATTEMPTING / SENT / FAILED / UNCERTAIN / STALE 语义。

3. 新设计只建立一个 Monitor 业务状态 Owner：
   - Node Monitor Service。
   - 一个正式 Monitor 状态 JSON：monitor-state.json。
   - Notification outbox 也并入该 JSON，不再保留第二个 Monitor notification-outbox.json。
   - credential / shared-facts 仍属于平台基础设施，不属于 Monitor 业务状态，不计为第二 Monitor truth。

核心原则：

    简化业务状态
    ≠
    删除 identity / side-effect reconciliation / crash recovery 等可靠性机制。

---

# 2. 最终架构

    Monitor ChatGPT Model
            |
            | Local Dev / MCP
            v
    automation/proflow-maintenance/*
            |
            | loopback authenticated control
            v
    Monitor Node Service  <---------------- Browser Extension Monitor lane
            |                                   |
            | sole Monitor state writer         | eyes + hands + timing
            v                                   |
       monitor-state.json                       |
            |                                   |
            +------ notification outbox --------+
                            |
                            v
                     Feishu Webhook

Browser 的页面副作用执行仍复用现有 execution-browser-extension capability owner：

    Browser scheduler
        -> existing monitor.chat.create / monitor.chat.submit
        -> effectStarted
        -> existing executor / Browser reality
        -> reconcile APPLIED | NOT_APPLIED | UNKNOWN
        -> Node 只投影协调状态

Node 不重新发明第二套 Browser effect truth。

---

# 3. Owner 与硬不变量

## 3.1 One Monitor state writer

只有 Node Monitor Service 可以写 monitor-state.json。

禁止：

- Browser 直接写 JSON。
- Model 直接写 JSON。
- helper 直接写 JSON。
- Maintenance 直接手改 JSON。

所有正式 mutation 都走 Monitor control API。

## 3.2 One active ProFlow mutation owner

注册新 Chat 不等于新 Chat 已经接管。

    REGISTERED
    !=
    ACTIVE

只有满足全部条件：

    successor 已真实注册
    + successor 自己读取 authority
    + successor 自己发布 boot proof
    + predecessor handoff 已完成（若存在）
    + successor 提交 TAKEOVER_ACCEPTED
    + Node 校验全部前置条件
    -> Node 原子切 currentChatId

以后 successor 才获得 ProFlow FULL mutation 权。

## 3.3 mutationMode 是派生事实，不额外保存 lifecycle

Node / helper 对每个 Chat 派生：

FULL
- chatId == currentChatId
- takeover.activatedAt != null
- hold == null
- handoff.startedAt == null
- handoff.completedAt == null

HANDOFF_ONLY
- chatId == currentChatId
- takeover.activatedAt != null
- hold == null
- handoff.startedAt != null
- handoff.completedAt == null

NONE
- 其它所有情况。

因此：

- predecessor HANDOFF_COMPLETED 后，即使 currentChatId 尚未切换，mutationMode 也必须是 NONE。
- registered-but-not-active successor 的 mutationMode 必须是 NONE。
- held Chat 的 mutationMode 必须是 NONE。
- HANDOFF_ONLY 只允许完成当前安全原子动作、reconcile UNKNOWN、写正式 handoff、准备 successor bootstrap；禁止开启新的普通大 Stage。

ProFlow Chat Loop Skill 实施时必须同步要求：
在任何 Monitor Model 本机 mutation 前先经过 current/mutation gate。

## 3.4 One notification outlet

最终只有 Node notification owner 可以调用 Feishu Webhook。

    Browser mechanical fact ----                                 -> Node outbox -> Feishu
    Model semantic request -----/

Browser / Model 都不得直接绕过 Node 调 Webhook。

## 3.5 No blind retry

任何可能产生外部副作用的动作：

- CREATE_CHAT
- SUBMIT_MESSAGE
- REGISTER
- notification delivery

遇到 transport timeout / response lost 时：

    UNKNOWN
    -> reconcile current reality / existing execution receipt
    -> APPLIED | NOT_APPLIED | UNKNOWN
    -> 只有 NOT_APPLIED 才允许 retry

UNKNOWN 不能被当成 FAILED。

## 3.6 Browser side-effect truth 只有一个 Owner

CREATE_CHAT 和 SUBMIT_MESSAGE 的真实副作用 Owner 继续是现有：

- monitor.chat.create
- monitor.chat.submit
- execution-browser reconciliation

新 monitor-state.json 中的 pendingBootstrap / pendingDispatch 只是协调 checkpoint。

它们不得自己独立判断 APPLIED / NOT_APPLIED。

## 3.7 Conversation identity 必须强校验

Chat 注册不能只提交 chatId。

Node 必须同时校验：

- chatId。
- conversationLocator。
- configured projectLocator。
- hostname 必须是 chatgpt.com。
- conversationLocator 必须属于 configured Project。
- URL 中解析出的 chatId 必须等于提交 chatId。

## 3.8 Observation identity 必须防迟到覆盖

Browser observation identity 至少包含：

- extensionInstanceId。
- contentInstanceId。
- observationEpoch。
- chatId / conversationLocator。

新 content instance 绑定成功后：

- Node 增加 observationEpoch。
- 旧 epoch / 旧 contentInstanceId 的迟到 observation 必须拒绝。
- 不能让旧 content script 覆盖新页面事实。

---

# 4. 正式状态文件

最终正式 Monitor 业务状态文件只有：

    <official workspace>/
    .proflow/runtime/modules/execution-browser-extension/monitor/monitor-state.json

写入要求：

- parent directory mode 0700。
- state file mode 0600。
- Node 进程内串行化状态事务。
- temp write + fsync + atomic rename；实现可复用现有 atomic primitive 并补足 durability。
- parse / contract 不合法时 fail closed。
- 不自动用默认值覆盖损坏文件。
- secrets 不进入 state。

保留在平台基础设施中的非业务状态文件：

- shared-facts。
- Monitor control bearer token file。
- Feishu webhook secret file。

它们不是 Monitor lifecycle / state truth。

---

# 5. v1 State Contract

顶层必须有 schema contract，不能把“不要 optimistic version”误解成“不要 schema version”。

示例：

    {
      "contract": "proflow.monitor-state.v1",

      "config": {
        "revision": 1,
        "enabled": false,
        "notificationsEnabled": false,
        "projectLocator": null,
        "rotationMs": 14400000,
        "readyStableMs": 1200,
        "observationStaleMs": 30000,
        "observationPersistIntervalMs": 30000,
        "unknownTimeoutMs": 60000,
        "chatIdCaptureTimeoutMs": 30000,
        "takeoverWarnMs": 1200000,
        "webhookTimeoutMs": 5000
      },

      "currentChatId": null,

      "pendingBootstrap": null,

      "chats": {},

      "notifications": {
        "outbox": []
      },

      "idempotency": {
        "receipts": {}
      },

      "systemEventSequence": 0,
      "systemEvents": [],

      "migration": null
    }

说明：

- 不保存全局业务 version。
- config.revision 仅用于配置 freshness / cache invalidation，不是 run optimistic-lock owner。
- 业务并发由单 Node writer + operation idempotency 保证。

---

# 6. Config 字段

| 字段 | 含义 | 规则 |
|---|---|---|
| revision | 配置修订号 | Node config update 后 +1 |
| enabled | Monitor 自动驱动总开关 | 默认 false |
| notificationsEnabled | 飞书通知开关 | 默认 false；不影响事实落盘 |
| projectLocator | 唯一 ChatGPT Project | enable 前必须有效 |
| rotationMs | 班次周期 | 默认 4h |
| readyStableMs | READY 必须连续稳定多久才可发送 | 避免 stop 按钮瞬时消失误判 |
| observationStaleMs | observation 多久未刷新即失效 | stale 时禁止发送 |
| observationPersistIntervalMs | 同状态 heartbeat 持久化节流 | 防止每 15s 重写整个 JSON |
| unknownTimeoutMs | UNKNOWN 持续多久触发机械异常 | 超时后 notify |
| chatIdCaptureTimeoutMs | BOOTSTRAP 后等待真实 chatId | 超时不重发首轮 |
| takeoverWarnMs | successor 注册但未激活多久触发 stalled 通知 | 只通知，不自动 abandon |
| webhookTimeoutMs | webhook transport timeout | timeout -> UNCERTAIN |

默认值保持安全：

    enabled = false
    notificationsEnabled = false

projectLocator 缺失时不得 enable。

---

# 7. Chat record

每个真实 ChatGPT conversation：

    chats[chatId] = {
      "shiftId": "monitor-a",
      "conversationLocator": "https://chatgpt.com/g/<project>/c/<chatId>",

      "previousChatId": null,
      "nextChatId": null,

      "registeredAt": "...",
      "bootstrapInjectionId": "...",

      "browserTarget": {
        "windowId": 1,
        "tabId": 2,
        "lastUrl": "...",
        "boundAt": "..."
      },

      "takeover": {
        "bootProofAt": null,
        "activatedAt": null,
        "abandonedAt": null,
        "abandonReason": null,
        "replacedByChatId": null
      },

      "rotationDueAt": null,

      "page": {
        "state": "UNKNOWN",
        "extensionInstanceId": "...",
        "contentInstanceId": "...",
        "observationEpoch": 1,
        "changedAt": "...",
        "observedAt": "..."
      },

      "handoff": {
        "startedAt": null,
        "completedAt": null,
        "nextShiftId": null
      },

      "hold": null,

      "injections": {
        "turnWake": null
      },

      "pendingDispatch": null,

      "eventSequence": 0,
      "events": []
    }

字段原则：

- chatId 只作为 chats map key，不重复存一份。
- previousChatId 在 REGISTER 时可以建立。
- predecessor.nextChatId 不在 REGISTER 时写。
- predecessor.nextChatId 只有 successor TAKEOVER_ACCEPTED 成功时才原子写入。
- 因此 registered-but-abandoned successor 不污染 canonical chain。

---

# 8. Page / Observation Contract

page.state 只允许：

- READY
- BUSY
- UNKNOWN

分类：

    stop-generating visible
    -> BUSY

    no stop-generating
    + composer/page stable
    -> READY candidate

    cannot prove either
    -> UNKNOWN

READY 发送门：

    page.state == READY
    + now - page.changedAt >= readyStableMs
    + now - page.observedAt <= observationStaleMs
    + observation instance is current
    -> READY_STABLE

否则禁止自动发送。

同状态 heartbeat：

- 更新内存 freshness。
- 不追加 PAGE_OBSERVED durable event。
- 仅每 observationPersistIntervalMs 最多持久化一次 observedAt。
- state 发生变化时立即持久化。

Observation bind：

1. 新 Extension/content instance 恢复目标 Chat。
2. Browser lane 用 exact browserTarget + conversationLocator 做 BIND。
3. Node 校验 identity 后增加 observationEpoch，并写新的 extensionInstanceId/contentInstanceId。
4. 之后 SAMPLE 必须携带当前 epoch。
5. 旧 epoch SAMPLE 返回 STALE_OBSERVATION，不修改 state。

browserTarget 是恢复 hint，不是业务 identity：
tabId/windowId 失效时必须重新用 conversationLocator / Project reality 对焦。

---

# 9. Prompt 模型

三类消息保持用户已经裁决的语义。

## 9.1 BOOTSTRAP

组成：

    fixed BOOTSTRAP template
    +
    pendingBootstrap.text

动态包由 predecessor Model 在正式 handoff 收口后生成。

首个历史班由 Maintenance Model 根据当前 authority 生成 initial bootstrap。

动态包至少包含：

- handoff authority 路径与关键事实。
- 当前 ProFlow Phase / CURRENT / REQUIRED_CONTEXT。
- Engineering / Acceptance / ProFlow Loop authority 路径。
- 当前真实恢复点。
- nextAction。
- WIP。
- UNKNOWN side effects。
- expectedShiftId。
- 新班 mutationMode=NONE，先完成 boot proof / takeover 的规则。

动态包不是 canonical handoff。
successor 仍必须重新读取本机 authority。

## 9.2 TURN_WAKE

组成：

    fixed TURN_WAKE template
    +
    optional previous-turn continuation intent

continuation intent：

- 由上一轮同一个 Model 自己产生。
- 只用于 continuity。
- 是 advisory hint，不是 authority。
- 当前 reality / Formal Spec / handoff / CURRENT 始终优先。
- 一次性消费。
- rotation due 时丢弃。
- 不存在时允许只发 fixed base。

TURN_WAKE fixed template 必须明确：

    如果动态提示与当前 reality / authority 冲突，以当前 reality / authority 为准。

registered-but-not-active successor 也可以收到 TURN_WAKE，
但 mutationMode 必须仍为 NONE，只允许继续 bootstrap / authority restore / boot proof / takeover 工作。

## 9.3 HANDOFF

组成：

    fixed HANDOFF template
    +
    Node/Browser 当前机械上下文

机械上下文：

- chatId / shiftId。
- rotationDueAt。
- current time。
- mutationMode。
- page freshness。
- pending effect reality。
- handoff authority path。
- 固定 handoff rules。

不保留 Model 预生成的 handoff injection。

真正 handoff 语义由当前 Model 收到 HANDOFF 后，根据整个 Chat + 本机 reality 生成。

---

# 10. pendingBootstrap

目标 Chat 尚无 chatId，因此 BOOTSTRAP pre-chat lifecycle 必须是顶层状态。

结构：

    {
      "injectionId": "inj-bootstrap-...",
      "sourceChatId": "chat-a",
      "expectedShiftId": "monitor-b",
      "text": "...",
      "stagedAt": "...",

      "phase": "PENDING_CREATE",

      "create": {
        "operationId": null,
        "effectRef": null,
        "state": null
      },

      "target": null,

      "submit": {
        "dispatchId": null,
        "messageRef": null,
        "contentFingerprint": null,
        "effectRef": null,
        "state": null
      }
    }

phase：

- PENDING_CREATE
- CREATE_UNKNOWN
- CHAT_CREATED
- SEND_UNKNOWN
- SENT_AWAITING_CHAT_ID

注意：

pendingBootstrap 不自己成为 Browser side-effect truth。

create.state / submit.state 只能投影现有 execution-browser capability owner 的 reconciliation 结果。

流程：

    PENDING_CREATE
    -> reserve logical create operation
    -> existing monitor.chat.create
    -> APPLIED | NOT_APPLIED | UNKNOWN

    UNKNOWN
    -> existing execution/browser reconcile
    -> never create second Chat blindly

    APPLIED
    -> save target
    -> CHAT_CREATED

    CHAT_CREATED
    -> existing monitor.chat.submit
    -> APPLIED | NOT_APPLIED | UNKNOWN

    APPLIED
    -> SENT_AWAITING_CHAT_ID

    SENT_AWAITING_CHAT_ID
    -> capture /c/<chatId>
    -> REGISTER

Extension / Node restart 后必须从 effectRef / target / current Browser reality 恢复，而不是自己再发一次。

---

# 11. pendingDispatch

TURN_WAKE / HANDOFF 的协调 checkpoint：

    {
      "dispatchId": "dispatch-...",
      "kind": "TURN_WAKE",
      "messageRef": "...",
      "contentFingerprint": "...",
      "injectionId": "inj-turn-...",
      "effectRef": "...",
      "startedAt": "...",
      "state": "UNKNOWN"
    }

kind：

- TURN_WAKE
- HANDOFF

state：

- STARTED
- UNKNOWN

APPLIED / NOT_APPLIED 是 terminal reconciliation 结果，不长期作为 pending state 保存。

规则：

- pendingDispatch 非 null 时绝不开始第二条 Monitor 消息。
- TURN_WAKE injectionId 可 null。
- HANDOFF injectionId 必须 null。
- 结果 APPLIED：投影 MESSAGE_SENT，清 pendingDispatch。
- 结果 NOT_APPLIED：清 unresolved，允许复用同一 logical dispatch 重新执行。
- 结果 UNKNOWN：保留 pendingDispatch，禁止 blind retry。
- Node 不自行通过时间推断 APPLIED/NOT_APPLIED。

---

# 12. Browser scheduler 的最终优先级

Browser 每次调度先计算 driveTarget。

driveTarget 规则：

1. 若存在 pendingBootstrap pre-chat effect：
   - 驱动 pendingBootstrap create/send/chatId capture。
2. 若 predecessor handoff 已完成，且存在一个未 abandoned、registered-but-not-active successor：
   - driveTarget = successor。
3. 否则：
   - driveTarget = currentChatId。

对 active current Chat：

    1. observation 是否 current + READY_STABLE？
       否 -> 不发

    2. pendingDispatch != null？
       是 -> reconcile，不发第二条

    3. hold != null？
       是 -> 停止自动驱动

    4. handoff.startedAt != null && completedAt == null？
       是 -> 等 Model 完成交接

    5. handoff.completedAt != null？
       是 -> 不再普通 TURN_WAKE；只走 successor lifecycle

    6. now >= rotationDueAt？
       是 -> discard pending turnWake -> HANDOFF

    7. 否则
       -> TURN_WAKE

对 registered-but-not-active successor：

    1. READY_STABLE？
       否 -> 不发

    2. pendingDispatch != null？
       是 -> reconcile

    3. hold != null？
       是 -> 停止

    4. takeover.abandonedAt != null？
       是 -> 停止

    5. takeover.activatedAt != null？
       是 -> 重新按 active current 规则

    6. 否则
       -> TURN_WAKE
       -> 只能继续 authority restore / boot proof / takeover
       -> mutationMode 保持 NONE

硬优先级：

    unresolved side effect
    > hold
    > handoff in progress
    > handoff completed / successor lifecycle
    > rotation
    > normal turn wake

---

# 13. HOLD / BLOCKED

Model 判断需要：

- 用户决策。
- 用户输入。
- external dependency。
- 无法自主解决的 blocker。

流程：

    Model
    -> BLOCKED
    -> Node 写当前 Chat hold
    -> Model 请求 semantic notification
    -> Model 本轮结束
    -> Browser 看到 hold 后不 TURN_WAKE / 不自动 HANDOFF

hold：

    {
      "kind": "USER_DECISION_REQUIRED",
      "incidentRef": "incident-...",
      "reason": "...",
      "since": "..."
    }

允许写 hold：

- active current Chat。
- registered-but-not-active successor。

只允许写自己 Chat 的 hold。

BLOCKER_CLEARED：

- 同一 Chat 确认真正恢复后清自己的 hold。
- PREVIOUS_SHIFT 不允许重新修改 hold。

active current Chat clear 后：

- rotation 已过期 -> HANDOFF。
- 未过期 -> TURN_WAKE。

---

# 14. Register / Project identity

当前正式实现**没有独立 production `chat.register` operation**。

真实 successor Chat 的注册只发生在现有 `monitor.chat.create` Browser effect 被 Execution owner 证明 `APPLIED` 的 settlement transaction 内。Execution 返回真实 `chatRef + conversationLocator` 后，Node owner 必须校验：

- pendingBootstrap 存在且 identity 与同一 create operation 匹配。
- expectedShiftId 匹配注册目标 shiftId。
- previousChatId 与 pendingBootstrap.sourceChatId 一致。
- conversationLocator 是 https://chatgpt.com。
- conversationLocator 位于 configured projectLocator 下。
- URL 解析的 chatId == effect 返回的 chatRef。
- 当前不存在同一个 live shiftId / incompatible chat identity。

同一 settlement 事务：

- 建立 chats[chatId]。
- registeredAt = now。
- previousChatId = predecessor。
- conversationLocator / browserTarget 保存。
- bootstrapInjectionId 保存。
- takeover 全部未激活。
- rotationDueAt = null。
- 清 pendingBootstrap。
- 记录 CHAT_REGISTERED system/chat event。

注册明确不做：

- 不切 currentChatId。
- 不写 predecessor.nextChatId。
- 不赋予 successor mutation 权。

Maintenance / Model / CI 不得通过独立 helper 伪造 chatId 注册；contract test 应直接测试 Node owner / Browser settlement seam。

---

# 15. Boot proof / Takeover

boot proof 必须由 successor Model 自己完成。

保留现有 boot proof 内容证明能力：

- PROJECT。
- public context README。
- long-term rules。
- CURRENT。
- REQUIRED_CONTEXT。
- Phase 4 docs。
- HANDOFF。
- Local Dev Engineering Skill proof。

boot proof helper：

- 允许对 registered-but-not-active successor 操作。
- 校验 Chat identity / expectedShiftId。
- 写 BOOT_PROOF_RECORDED。
- 不自动激活。

TAKEOVER_ACCEPTED 使用独立高权限 operation / helper，不允许 generic event 脚本伪造。

前置条件：

- target 已注册。
- target 未 abandoned。
- target.bootProofAt != null。
- target.previousChatId 与 predecessor 匹配。
- predecessor 若存在：
  - predecessor == currentChatId。
  - predecessor.handoff.completedAt != null。
  - predecessor.handoff.nextShiftId == target.shiftId。
- target 尚未 activated。
- target hold == null。
- 没有 unresolved target dispatch。

原子事务：

    target.takeover.activatedAt = now
    target.rotationDueAt = now + config.rotationMs
    predecessor.nextChatId = target.chatId   （若 predecessor 存在）
    currentChatId = target.chatId
    CURRENT_CHAT_SWITCHED

这是正常路径唯一 current owner 切换入口。

---

# 16. HANDOFF completion

HANDOFF_STARTED：

- 只有 HANDOFF submit 已由 effect owner 证明 APPLIED 后才写 handoff.startedAt。

Model 收到 HANDOFF 后：

    mutationMode = HANDOFF_ONLY

允许：

- 完成当前安全原子动作。
- reconcile UNKNOWN。
- close/release owned Acceptance lease。
- 写唯一 handoff authority。
- 准备 successor bootstrap。

禁止：

- 新开普通大 Stage。
- 新开无关 mutation。

正式完成顺序：

    1. write fresh .handoff/current.md
    2. monitor-handoff-complete.mjs
    3. predecessor mutationMode becomes NONE
    4. only now stage fresh pendingBootstrap for nextShiftId

monitor-handoff-complete.mjs：

- 自己读取正式 handoff authority。
- 机械提取 / 校验 nextShiftId。
- 校验当前 Chat mutationMode == HANDOFF_ONLY（已完成时允许幂等 readback）。
- 调专用 handoff.complete operation。
- **不要求 pendingBootstrap**，避免重新形成“bootstrap 依赖 handoff、handoff 又依赖 bootstrap”的循环。

Node 前置条件：

- caller chatId == currentChatId。
- handoff.startedAt != null。
- handoff.completedAt == null（同 nextShiftId 的重复完成返回 ALREADY_COMPLETED）。
- pendingDispatch == null。

successor `bootstrap.stage` 的前置条件反过来要求：

- predecessor handoff.completedAt != null。
- predecessor handoff.nextShiftId == expectedShiftId。
- 当前没有另一个 live successor。

成功：

    handoff.completedAt = now
    handoff.nextShiftId = nextShiftId

从这一刻开始 predecessor mutationMode = NONE。

---

# 17. Successor abandon / replacement

必须支持 registered-but-not-active successor 失败后的正式恢复。

可 abandon 条件：

- Chat 已注册。
- takeover.activatedAt == null。
- takeover.abandonedAt == null。
- Chat 不是 currentChatId。
- 没有 unresolved Browser effect。
- Maintenance 明确调用专用 successor-abandon helper。

Node：

    takeover.abandonedAt = now
    takeover.abandonReason = explicit reason

规则：

- 不自动把 timeout 当 abandon。
- takeoverWarnMs 只触发 stalled notification。
- abandoned candidate 永远不能 TAKEOVER_ACCEPTED。
- predecessor.nextChatId 此时仍为 null，因此 canonical chain 未被污染。
- predecessor 仍是 current owner，但 handoff 已完成，所以 mutationMode 仍是 NONE。
- Maintenance / predecessor handoff authority 可以 stage replacement pendingBootstrap。
- replacement 必须使用新的 unique shiftId；不复用失败候选 shiftId。
- 同一 predecessor 同时最多存在一个 live registered-but-not-active successor candidate。
- replacement 最终 takeover 成功时，可把 abandoned candidate.takeover.replacedByChatId 指向 replacement，作为诊断历史。

---

# 18. 首个历史 Monitor

没有 predecessor 时：

    currentChatId = null
    pendingBootstrap = null

流程：

    Maintenance Model
    -> 读取当前 ProFlow authority
    -> monitor-injection bootstrap --initial
    -> pendingBootstrap sourceChatId = null
    -> Browser CREATE_CHAT
    -> BOOTSTRAP
    -> capture chatId
    -> REGISTER
    -> successor Model restore authority
    -> boot proof
    -> TAKEOVER_ACCEPTED
    -> currentChatId = first chat

Initial REGISTER 仍然不自动激活。

---

# 19. Notification Owner / Outbox

为满足“Monitor 正式状态只一个 JSON”，原 notification-outbox.json 的状态并入：

    monitor-state.json
    -> notifications.outbox

Outbox item：

    {
      "notificationId": "...",
      "eventId": "...",
      "dedupeKey": "...",
      "source": "MODEL",
      "kind": "USER_DECISION_REQUIRED",
      "chatId": "...",
      "incidentRef": "...",
      "title": "...",
      "message": "...",
      "status": "PENDING",
      "attempts": 0,
      "retryable": true,
      "createdAt": "...",
      "lastAttemptAt": null,
      "sentAt": null,
      "lastError": null
    }

status 保留现有成熟语义：

- PENDING
- ATTEMPTING
- SENT
- FAILED
- UNCERTAIN
- STALE

delivery 算法：

1. Node state transaction：
   - PENDING -> ATTEMPTING。
   - 生成 attempt identity。
   - 原子写 state。
2. 释放 state writer lock。
3. 执行 webhook fetch。
4. 再进入 state transaction：
   - confirmed success -> SENT。
   - confirmed non-retryable failure -> FAILED。
   - transport timeout / response lost -> UNCERTAIN。
5. UNCERTAIN 不自动 blind retry。

这样不会让慢网络请求阻塞所有 Monitor state mutation。

通知 ownership：

Browser 可以请求机械事实：

- UNKNOWN_TIMEOUT。
- LOOP_STALLED。
- BROWSER_ACTION_FAILED。
- CHAT_REGISTER_FAILED。
- TAKEOVER_STALLED。

Model 可以请求语义事实：

- USER_DECISION_REQUIRED。
- EXTERNAL_BLOCKER。
- CRITICAL_PRODUCT_RISK。
- IMPORTANT_MILESTONE。

Node 自己产生的事实无需 Browser 再请求：

- CHAT_REGISTERED。
- CURRENT_CHAT_SWITCHED。
- SUCCESSOR_ABANDONED。
- NOTIFICATION_SENT / FAILED / UNCERTAIN。

TURN_WAKE 正常轮次不发飞书。

dedupeKey：

    source + chatId + kind + incidentRef

同 incident 重试不重复通知。

---

# 20. Idempotency 与历史压缩

diagnostic events 不能兼任长期 idempotency ledger。

顶层：

    idempotency.receipts[requestId]

至少记录：

- operation。
- target identity。
- terminal / pending。
- firstSeenAt。
- terminalAt。
- result summary / stable error。
- referenced effectRef（若有）。

规则：

- 相同 requestId + 相同 payload -> 返回原结果。
- 相同 requestId + 不同 payload -> conflict。
- pending side-effect receipt 在 terminal 前不得 compact。
- terminal receipt 默认保留至少 7 天。
- receipts 最大 2048；达到上限时只淘汰最老、terminal、未被任何 pending state 引用的 receipt。
- 无安全可淘汰项时 fail closed，而不是删除 active idempotency evidence。

events：

- active current / live successor 的关键 side-effect events 不 compact。
- previous shift 的 diagnostic events 可压缩到最近 128 条。
- snapshot 字段必须足以判断当前业务事实，不能只依赖被裁掉 event。
- PAGE_OBSERVED heartbeat 不进入 events。

Chat snapshot 不做激进淘汰：
四小时轮换即使运行一年，压缩过 events 后仍可接受。
先保证可解释性，不为了过早优化破坏 previous/next 链。

---

# 21. 单一物理 API transport

为了降低 blast radius，不为 REST 风格重写当前 loopback wiring。

继续复用当前正式 transport：

    POST /v1/monitor/control

request：

    {
      "operation": "...",
      "input": {}
    }

response：

    {
      "ok": true,
      "value": {}
    }

失败：

    {
      "ok": false,
      "error": "MONITOR_..."
    }

继续：

- bind 127.0.0.1 only。
- bearer token。
- token 从 shared-facts / token file 解析。
- Model 不手工拼 secret。
- Browser observation 可以继续通过当前 Extension bridge transport 到 Node，但在 Node Owner 层归一为同一套 operation / transition rules。

逻辑 API / operations：

| operation | 调用方 | 权限 |
|---|---|---|
| config.read | Browser / Maintenance | read |
| config.update | Maintenance | config mutation |
| state.read | Maintenance / debug | read |
| current.read | Browser / Model helper | read |
| bootstrap.stage | Model / initial Maintenance | pre-chat high-level staging |
| chat.bind | Browser | physical target identity bind |
| chat.observe | Browser | BIND / SAMPLE observation |
| chat.event | Model helper | 低权限普通事件 |
| bootProof.record | successor boot-proof helper | 高权限 proof |
| handoff.complete | current handoff helper | 高权限 transition |
| takeover.accept | successor takeover helper | 高权限 owner switch |
| successor.abandon | Maintenance helper | 高权限 recovery |
| drive.next | Browser scheduler | read/reserve next logical drive |
| drive.authorize | Platform/Execution relay | authorize exact reserved drive |
| drive.result | Platform/Execution relay | settle same Execution identity |
| notification.enqueue | Model helper / Node internal owner | notification |
| notification.readOutbox | Maintenance / Node | read |
| notification.deliver | Node worker / Maintenance | delivery |

真实 Chat registration 是 `monitor.chat.create` 的 APPLIED settlement 内部事务，不暴露独立 `chat.register` control operation。

generic chat.event 明确不能提交：

- BOOT_PROOF_RECORDED。
- HANDOFF_COMPLETED。
- TAKEOVER_ACCEPTED。
- SUCCESSOR_ABANDONED。
- CURRENT_CHAT_SWITCHED。

高权限状态转换必须走专用 operation。

---

# 22. Error Contract

至少固定：

- MONITOR_DISABLED
- MONITOR_STATE_CORRUPT
- MONITOR_AUTH_INVALID
- MONITOR_PROJECT_BINDING_MISSING
- MONITOR_CURRENT_ABSENT
- MONITOR_CHAT_NOT_FOUND
- MONITOR_CHAT_IDENTITY_MISMATCH
- MONITOR_CHAT_PROJECT_MISMATCH
- MONITOR_STALE_OBSERVATION
- MONITOR_NOT_READY_STABLE
- MONITOR_DISPATCH_UNRESOLVED
- MONITOR_BOOTSTRAP_ALREADY_PENDING
- MONITOR_BOOTSTRAP_IDENTITY_CONFLICT
- MONITOR_BOOTSTRAP_ALREADY_CONSUMED
- MONITOR_HANDOFF_NOT_STARTED
- MONITOR_HANDOFF_BOOTSTRAP_REQUIRED
- MONITOR_HANDOFF_NEXT_SHIFT_MISMATCH
- MONITOR_BOOT_PROOF_REQUIRED
- MONITOR_TAKEOVER_PREDECESSOR_MISMATCH
- MONITOR_TAKEOVER_TARGET_ABANDONED
- MONITOR_TAKEOVER_HOLD_ACTIVE
- MONITOR_SUCCESSOR_ABANDON_FORBIDDEN
- MONITOR_LIVE_SUCCESSOR_EXISTS
- MONITOR_NOTIFICATION_KIND_FORBIDDEN
- MONITOR_NOTIFICATION_UNCERTAIN

HTTP transport mapping继续稳定：

- 400 invalid contract / transition。
- 401 auth。
- 404 missing resource。
- 409 identity / transition / pending side-effect conflict。
- 500 Node state owner internal failure。

---

# 23. 自动化脚本交付清单

正式目录：

    /Users/agent/Desktop/proton-workspace/automation/proflow-maintenance/

## 23.1 monitor-current.mjs

用途：

- current.read。
- 输出 owner + driveTarget + mutationMode。
- Model 本机 mutation gate。

支持：

    monitor-current.mjs
    monitor-current.mjs --expect-shift-id monitor-b
    monitor-current.mjs --require-mutation FULL
    monitor-current.mjs --allow-handoff-only

规则：

- registered-but-not-active -> NOT_CURRENT_YET / mutation NONE。
- predecessor handoff completed -> current owner 仍存在，但 mutation NONE。
- 不允许仅凭 currentChatId 判断 mutation 权。

## 23.2 monitor-state.mjs

- state.read。
- 只读。
- Maintenance / debug。

## 23.3 monitor-config.mjs

- config.read / update。
- 仅 operator / Maintenance。
- Model 普通工作不修改 config。

## 23.4 chat registration（无 standalone helper）

不交付 `monitor-register.mjs`。

原因：

- 当前正式 control contract 不暴露 `chat.register`。
- 真实 Chat identity 只能来自 Browser `monitor.chat.create` 的 APPLIED settlement。
- Maintenance / Model 手工输入 chatId + conversationLocator 会重新引入可伪造 registration seam。
- CI / contract test 直接测试 Node owner / Browser settlement seam，不通过生产 helper 制造注册事实。

## 23.5 monitor-event.mjs

只允许低权限 Model 事件：

- BLOCKED。
- BLOCKER_CLEARED。
- 其它后续正式 allowlist 的普通事实。

不能提交高权限 transition。

## 23.6 monitor-injection.mjs

支持：

    turn-wake
    bootstrap

turn-wake：
- stage 当前 Chat 下一轮 continuation intent。

bootstrap：
- stage 顶层 pendingBootstrap。

支持 initial：

    monitor-injection.mjs bootstrap --initial ...

不支持 handoff injection。

## 23.7 monitor-handoff-complete.mjs

专用高权限 helper。

职责：

- 读取正式 .handoff/current.md。
- 提取 / 校验 nextShiftId。
- 校验当前 Chat mutationMode == HANDOFF_ONLY（同一 nextShiftId 已完成时允许幂等回读）。
- 校验当前 HANDOFF physical dispatch 已 settled，不存在 pendingDispatch。
- 调 handoff.complete。
- 完成后 predecessor mutationMode 必须为 NONE。
- 不校验 pendingBootstrap；successor bootstrap 必须在 handoff.complete 之后 fresh stage。

## 23.8 monitor-boot-proof.mjs

迁移现有 helper：

- 保留现有 context proof。
- 支持 registered-but-not-active successor。
- 调 bootProof.record。
- 不自动 TAKEOVER。
- predecessor / Maintenance 不代发 successor proof。

## 23.9 monitor-takeover.mjs

专用高权限 helper：

- 只允许 successor Model 调。
- 先验证 boot proof。
- 验证 predecessor handoff。
- 调 takeover.accept。
- 成功后再 monitor-current --expect-shift-id 读回。

## 23.10 monitor-successor-abandon.mjs

Maintenance recovery helper：

- 只能 abandon registered-not-active candidate。
- 必须显式 reason。
- 不能 abandon current / activated Chat。
- 调 successor.abandon。

## 23.11 monitor-notify.mjs

Model semantic notification。

不接受 webhook URL / secret。

## 23.12 monitor-migrate-legacy.mjs

一次性 cutover helper：

- dry-run / inspect。
- build candidate state。
- apply 只在 legacy truth unambiguous 时执行。
- 不在 runtime 正常循环中长期使用。

## 23.13 lib/monitor-api-client.mjs

统一：

- shared-facts endpoint/token discovery。
- auth。
- JSON request/response。
- timeout。
- stable error。
- idempotent requestId。
- timeout / UNKNOWN 语义。

不得：

- 直接写 state。
- 自建第二 cache truth。
- 启动 shadow server。
- blind retry 非幂等 transition。

## 23.14 旧 helper 收敛

monitor-debug.mjs：
- 若 current/state 已完全覆盖则删除。
- 否则只读新 state API。

monitor-initial-seed.mjs：
- 改成新 bootstrap --initial 的兼容 wrapper 或删除。
- 不再创建 legacy run。

reload.mjs：
- 保留。
- 继续是 Extension 运维能力，不属于 state model。

---

# 24. 固定 Prompt Template Owner

三份 fixed base：

- BOOTSTRAP。
- TURN_WAKE。
- HANDOFF。

只有一个 source owner。

目标：

    execution-browser-extension/extension/runtime/monitor-prompts.ts

Stage A owner analysis 若证明同包其它位置更合适，可调整文件名，但必须：

- 单 owner。
- Browser compose。
- Node 不复制字符串。
- Model 不写 fixed template。
- prompt composition tests。
- TURN_WAKE base 明确 dynamic continuation 只是 hint，reality/authority 优先。

---

# 25. 现有 Browser capability 的复用

这是 v4 的关键收敛点。

当前已经存在：

- monitor.chat.create。
- monitor.chat.submit。
- effectStarted。
- Browser hasMessage / locator 验证。
- UNKNOWN_SIDE_EFFECT。
- execution reconcile。

新 Browser scheduler 不允许绕开它们直接重新实现另一套 submit/create truth。

目标链路：

    Browser scheduler decision
        -> reserve logical operation in Node
        -> existing monitor.chat.create / submit
        -> existing execution effect boundary
        -> existing reconciliation
        -> report terminal/unknown result to Node
        -> Node update checkpoint

pendingBootstrap / pendingDispatch 只保存：

- logical operation identity。
- messageRef / contentFingerprint。
- effectRef / execution identity。
- target hint。
- coordination phase。

不复制：

- second APPLIED detector。
- second hasMessage truth。
- second retry policy。

如果源码 reality 证明某个当前 executor seam 不能直接供 scheduler 复用，
Stage A 必须在 execution-browser-extension 内做最小适配，
而不是重写一整套新的 Browser effect owner。

---

# 26. Successor BOOTSTRAP 可以跨多轮完成

新班首轮不保证一定在单个 Model turn 内完成全部 authority restore。

因此 registered-but-not-active successor 允许：

    BOOTSTRAP turn
    -> READY
    -> TURN_WAKE
    -> 继续 authority restore
    -> boot proof
    -> TAKEOVER

但所有这些轮次：

    mutationMode = NONE

Browser 发送 TURN_WAKE 只是让它继续 boot/takeover，
不是允许它修改 ProFlow。

如果 successor 需要用户决策：

    BLOCKED
    -> hold
    -> notify
    -> stop auto wake

这避免“首轮没完成 boot proof 就永久卡死”。

---

# 27. Notification delivery UNKNOWN

Webhook delivery timeout：

    ATTEMPTING
    -> transport timeout / ack lost
    -> UNCERTAIN

UNCERTAIN：

- 不自动 retry。
- 不把“没收到 response”解释成“飞书没收到”。
- 后续相同 dedupeKey 请求被 suppress 或返回 UNCERTAIN existing item。
- Maintenance 可以查看 outbox。
- 只有明确的新 incidentRef 才是新通知。

这保留当前 outbox 比简单 FAILED 更成熟的语义。

---

# 28. Legacy -> v1 Migration / Cutover

当前真实 legacy state：

- monitor-config.json。
- runs/*.json。
- observations/*.json。
- notification-outbox.json。
- handoff-artifacts/*。
- legacy coordinator/lifecycle rules。

不能直接让新 state 和旧 state 并行写。

## 28.1 Cutover 原则

    old owner
    -> stop / quiesce
    -> read exact legacy truth
    -> build v1 candidate
    -> validate
    -> atomic write monitor-state.json
    -> start new owner
    -> verify adoption
    -> old paths become readonly history
    -> Acceptance 通过后清理 legacy runtime files

全程不存在双 writer。

## 28.2 自动可迁移的 legacy 情形

至少支持：

A. exactly one ACTIVE shift
- currentChatId = active chatRef。
- activatedAt / rotationDueAt 从 legacy shift 迁移。
- boot proof 迁移。
- latest observation 迁移为 page snapshot。
- notification outbox 状态迁入 notifications.outbox。

B. initial BOOTING, no active shift
- 注册为 not-active candidate。
- currentChatId = null。
- boot proof 若存在可迁移。
- 不自动 activate。

## 28.3 Fail-closed legacy 情形

以下不自动猜：

- 多个 ACTIVE。
- DRAINING + BOOTING 关系不明确。
- activeShiftId 与 shift state 冲突。
- observation chatRef 与 run identity 冲突。
- legacy outbox parse 不完整。
- legacy state schema 损坏。

返回 MIGRATION_REQUIRES_MANUAL_RESOLUTION。

不自动制造 handoff.startedAt / completedAt。

## 28.4 Cutover rollback

新 runtime 尚未正式 adopted 前失败：
- legacy owner 仍是 rollback authority。

新 runtime 已 adopted 后失败：
- disable Monitor。
- repair new owner。
- 不恢复新旧双写。

Acceptance 通过后：
- 删除旧正式 runtime Monitor JSON truth。
- 保留必要的非 JSON evidence/log only if existing governance requires。
- 最终正式 Monitor state JSON 只剩 monitor-state.json。

migration evidence 写入 monitor-state.json.migration 字段，不新增长期 migration JSON truth。

---

# 29. 缺失恢复流程：successor failed

    predecessor handoff completed
        |
        | mutationMode NONE
        v
    successor registered
        |
        v
    boot / takeover stalls
        |
        +-- hold? -> wait user
        |
        +-- takeoverWarnMs exceeded -> mechanical notify
        |
        +-- Maintenance decides unrecoverable
                |
                v
         monitor-successor-abandon
                |
                v
         candidate abandoned
                |
                v
         stage replacement bootstrap
                |
                v
         create/register replacement
                |
                v
         boot proof
                |
                v
         TAKEOVER_ACCEPTED
                |
                v
         predecessor.nextChatId = replacement

没有任何一步需要手改 JSON。

---

# 30. contentInstanceId rollover 流程

    Extension/content reload
        |
        v
    new extensionInstanceId / contentInstanceId
        |
        v
    Browser lane rebind exact conversation target
        |
        v
    chat.observe BIND
        |
        v
    Node validates chat + locator + target
        |
        v
    observationEpoch += 1
        |
        v
    accept new SAMPLE only
        |
        +-- old epoch SAMPLE -> reject STALE_OBSERVATION
        |
        +-- current epoch SAMPLE -> update state/freshness

避免旧 content script 的迟到事件覆盖当前页面。

---

# 31. disable / enable / restart 流程

## disable

config.enabled = false 后：

- Browser 不开始新 CREATE / SUBMIT。
- 已经 STARTED / UNKNOWN 的 side effect 不假装取消；继续 reconciliation。
- Node 继续允许 read / recovery / notification outbox inspection。
- 不自动清 pending state。

## enable

enable 前必须：

- state contract valid。
- projectLocator valid。
- 没有 unresolved migration。
- Browser runtime 可绑定。

enable 后：

    read current state
    -> reconcile pending side effects
    -> bind observation identity
    -> only then resume scheduler

## Node restart

    read monitor-state.json
    -> validate contract
    -> restore serial writer
    -> ATTEMPTING notification from dead process -> UNCERTAIN
    -> do not replay sends
    -> Browser reconnect
    -> reconcile pending Bootstrap/dispatch

## Extension restart

    read config/current
    -> query exact Monitor targets
    -> rebind observation instance
    -> reconcile effectRef / target
    -> no duplicate Chat / message

---

# 32. 核心流程图

## 32.1 正常工作循环

    current active Chat
        |
        v
    Model works
        |
        +-- optional turnWake intent
        |
        v
    Model turn ends
        |
        v
    Browser BUSY -> READY_STABLE
        |
        v
    scheduler priority gate
        |
        +-- unresolved effect -> reconcile
        +-- hold -> stop
        +-- rotation due -> HANDOFF
        |
        +-- normal -> TURN_WAKE
                        |
                        v
                    next Model turn

## 32.2 TURN_WAKE

    optional continuation intent
        |
        v
    reserve pendingDispatch
        |
        v
    existing monitor.chat.submit
        |
        v
    effectStarted
        |
        +-- APPLIED -> MESSAGE_SENT -> consume intent -> clear pending
        |
        +-- NOT_APPLIED -> clear unresolved -> retry same logical dispatch allowed
        |
        +-- UNKNOWN -> keep pending -> reconcile -> no second send

## 32.3 Rotation / HANDOFF

    READY_STABLE
        |
        v
    rotation due
        |
        +-- pending turnWake -> discard ROTATION_DUE
        |
        v
    fixed HANDOFF + mechanical context
        |
        v
    existing monitor.chat.submit
        |
        +-- APPLIED -> handoff.startedAt
        |
        +-- UNKNOWN -> reconcile; never TURN_WAKE
        |
        v
    Model mutationMode HANDOFF_ONLY
        |
        v
    write formal handoff
        |
        v
    handoff.complete
        |
        v
    predecessor mutationMode NONE
        |
        v
    stage fresh successor bootstrap

## 32.4 Successor create / bootstrap / register

    handoff completed
    + pendingBootstrap
        |
        v
    existing monitor.chat.create
        |
        +-- UNKNOWN -> reconcile, no second Chat
        |
        v
    blank Chat target
        |
        v
    fixed BOOTSTRAP + dynamic package
        |
        v
    existing monitor.chat.submit
        |
        +-- UNKNOWN -> reconcile, no resend
        |
        v
    /c/<realChatId>
        |
        v
    same monitor.chat.create APPLIED settlement:
      validate project/chat identity
      register real chatId in Node state
      clear pendingBootstrap
        |
        v
    REGISTERED_NOT_ACTIVE

## 32.5 Successor boot / takeover

    registered successor
        |
        v
    Model reads authorities
        |
        +-- turn ends early -> TURN_WAKE with mutation NONE
        |
        v
    boot proof
        |
        v
    monitor-takeover
        |
        v
    Node validates predecessor + proof + handoff
        |
        v
    atomic:
      successor activatedAt
      successor rotationDueAt
      predecessor.nextChatId
      currentChatId
        |
        v
    successor mutationMode FULL

## 32.6 HOLD

    Model needs user/external input
        |
        v
    BLOCKED
        |
        v
    hold + semantic notify
        |
        v
    Browser stops auto-drive
        |
        v
    user/dependency resolves
        |
        v
    Model verifies
        |
        v
    BLOCKER_CLEARED
        |
        +-- rotation overdue -> HANDOFF
        +-- otherwise -> TURN_WAKE

## 32.7 Message UNKNOWN

    reserve logical dispatch
        |
        v
    existing execution effect owner
        |
        v
    response lost
        |
        v
    UNKNOWN
        |
        v
    existing reconcile
        |
        +-- APPLIED -> project success into Monitor state
        +-- NOT_APPLIED -> allow same logical retry
        +-- UNKNOWN -> keep gate closed + notify if stalled

Node 不建立第二套 DOM-based applied detector。

## 32.8 Notification UNKNOWN

    PENDING
      |
      v
    ATTEMPTING persisted
      |
      v
    webhook fetch
      |
      +-- success -> SENT
      +-- confirmed failure -> FAILED
      +-- timeout/ack lost -> UNCERTAIN
                                  |
                                  v
                           no automatic retry

## 32.9 Legacy cutover

    legacy owner quiesced
        |
        v
    read old config/run/observation/outbox
        |
        v
    exact mapping?
      /   \
    yes    no
     |      |
     v      v
    build   fail closed
    v1      manual resolution
     |
     v
    atomic monitor-state.json
     |
     v
    new runtime adoption
     |
     v
    Acceptance
     |
     v
    remove legacy Monitor truth

---

# 33. 通知 / Prompt / Owner 冲突矩阵

| 场景 | 唯一 owner | 禁止 |
|---|---|---|
| READY/BUSY/UNKNOWN | Browser observation | Model 猜 DOM |
| observation instance bind | Browser + Node validation | content script 自己替换 epoch |
| 何时发下一条 | Browser scheduler | Model 控制 timer |
| TURN_WAKE 内容重点 | previous Model intent | Browser 发明任务 |
| rotation | config + Browser scheduler | Model 自己决定 4h |
| HANDOFF 时机 | Browser | Model 抢占普通轮 |
| handoff 语义 | Model | Browser 生成项目总结 |
| successor bootstrap 内容 | predecessor Model | Browser 编业务上下文 |
| CREATE / SUBMIT side effect | existing execution-browser capability | Node 重造第二 effect owner |
| Chat identity | ChatGPT URL + Node project validation | 只信 chatId |
| register | Browser -> Node | register 激活 |
| boot proof | successor Model helper | predecessor 代发 |
| takeover | dedicated takeover op | generic event 切 current |
| predecessor mutation gate | derived mutationMode | 仅看 currentChatId |
| mechanical notify | Browser / Node | Model 重复 |
| semantic notify | Model | Browser 猜语义 |
| Feishu transport | Node outbox | Model/Browser 直连 webhook |
| Monitor JSON | Node | helper / Browser 写文件 |

---

# 34. Legacy Skill / Rule 收敛

实施时必须同步更新 proflow-chat-loop Skill 中与新设计冲突的内容：

1. TURN_WAKE
旧：
- 只能固定中性文本，不能附带 nextAction。

新：
- fixed neutral base
- 可附带上一轮同一 Model 自己产生的 continuation intent
- intent 只是 advisory，reality / authority 优先
- Browser/Node 仍不能发明任务。

2. Coordinator
旧：
- Coordinator 激活 / 驱动 shift。

新：
- Browser scheduler 负责 timing。
- Node state owner 负责 transition validation / current switch。
- 不保留独立 Coordinator 组件。

3. Mutation gate
新增：
- Monitor Model 本机 mutation 前必须确认 mutationMode。
- predecessor handoff completed 后即使仍是 currentChatId，也不得继续普通 ProFlow mutation。
- successor takeover 前 mutationMode NONE。

4. TURN_WAKE notification
旧：
- 每次 wake 可能飞书。

新：
- 正常 TURN_WAKE 静默。
- 只有异常 / blocker /换班关键点按 ownership 通知。

Acceptance Skill 中仍保留：

- exact target / no global tab reliance。
- timeout/unknown side-effect reconciliation。
- same-scene proof。
- lease/recovery 规则。

---

# 35. 旧源码迁移范围

重点 owner：

- packages/execution-browser-extension/src/monitor-owner.ts
- packages/execution-browser-extension/src/monitor-control-server.ts
- packages/execution-browser-extension/src/monitor-control-client.ts
- packages/execution-browser-extension/src/monitor-chat-protocol.ts
- packages/execution-browser-extension/src/monitor-chat-delivery-executor.ts
- packages/execution-browser-extension/src/browser-reconciliation.ts
- packages/execution-browser-extension/extension/monitor-content.ts
- packages/execution-browser-extension/extension/runtime/monitor-lane.ts
- extension background composition
- deployment adapter / Platform composition
- skills/proflow-chat-loop
- automation/proflow-browser-extension/*

明确保留：

- monitor.chat.create / submit execution path。
- browser reconcile。
- content instance identity concept。
- boot proof proof-content。
- monitor control bearer auth / shared facts。
- webhook delivery semantics。

明确替换：

- run.create / run.read / run.list 正式 lifecycle。
- shift.activate / beginDrain / writeHandoff / prepareNext / takeover 旧 state machine。
- separate observations/*.json。
- separate notification-outbox.json。
- separate monitor-config.json（配置并入 monitor-state.json）。
- handoff-artifact / nextChatPrompt artifact 作为正式 Monitor truth。
- 独立 Coordinator 组件语义。

旧文件可以在 migration / rollback 窗口短暂存在，
但新 owner adopted 后不得继续正式读写。

---

# 36. 正式 Contract 文档

Stage A 实施时新增一个短的正式代码 contract 文档。

建议位置：

    packages/execution-browser-extension/DOCS-monitor-state.md

必须包含：

- proflow.monitor-state.v1 完整 schema。
- 字段字典。
- mutationMode 派生规则。
- observation identity / epoch。
- prompt composition。
- pendingBootstrap。
- pendingDispatch 与 effect owner 边界。
- register != activate。
- boot proof / takeover。
- abandon / replacement。
- hold。
- notifications / UNCERTAIN。
- idempotency receipts。
- logical operations。
- migration / cutover。
- invariants。

临时计划删除后，代码 contract 仍可独立理解。

---

# 37. Engineering / CI Gate

当前仓库不新造 GitHub Actions。
使用现有 package tests、root tests、typecheck、build、test-governance、relevant architecture/root gates。

必须覆盖：

## 37.1 State owner

- state contract parse。
- corrupt fail closed。
- atomic state write。
- config defaults disabled。
- config update / revision。
- one writer serialization。
- idempotency receipt exact retry。
- conflicting retry rejected。
- idempotency compaction safety。
- event compaction safety。

## 37.2 Observation

- READY / BUSY / UNKNOWN classifier。
- READY debounce。
- stale observation blocks send。
- heartbeat coalescing。
- contentInstanceId rollover。
- old epoch rejected。
- Extension instance rebind。

## 37.3 Browser effect reuse

- scheduler 调用 existing monitor.chat.create。
- scheduler 调用 existing monitor.chat.submit。
- pending state 不自行伪造 APPLIED。
- APPLIED projection。
- NOT_APPLIED retry。
- UNKNOWN blocks duplicate send/create。
- executor reconciliation regression。
- monitor-chat-delivery-executor 增加直接覆盖测试（当前覆盖不足）。

## 37.4 Prompt

- BOOTSTRAP fixed + dynamic。
- TURN_WAKE fixed + optional advisory intent。
- HANDOFF fixed + mechanical context。
- no Model handoff injection。
- rotation discards turnWake。
- successor not-active TURN_WAKE keeps mutation NONE。

## 37.5 Register / takeover

- projectLocator validation。
- chatId / locator mismatch rejected。
- register does not switch current。
- register does not write predecessor.nextChatId。
- boot proof only successor。
- takeover requires proof。
- takeover requires predecessor handoff。
- atomic current switch + nextChatId。
- mutationMode FULL/HANDOFF_ONLY/NONE。

## 37.6 Successor recovery

- registered successor stalls。
- hold while not active。
- abandon forbidden for current/active。
- abandon candidate。
- replacement bootstrap。
- replacement takeover。
- canonical previous/next chain not polluted by abandoned candidate。

## 37.7 Notification

- outbox inside one state JSON。
- source/kind allowlist。
- semantic/mechanical separation。
- dedupe。
- ATTEMPTING persisted before network。
- success -> SENT。
- confirmed failure -> FAILED。
- timeout -> UNCERTAIN。
- UNCERTAIN no blind retry。
- normal TURN_WAKE silent。

## 37.8 Migration

- legacy ACTIVE exact migration。
- legacy initial BOOTING migration。
- ambiguous DRAINING fail closed。
- outbox status preservation。
- content observation migration。
- new state adoption。
- no legacy writes after cutover。
- rollback before adoption。
- no dual writer。

## 37.9 Boundary regression

- Product / Worker Browser flow untouched。
- Monitor dedicated lane only。
- no task/worker scope leak。
- shared browser session rules still pass。
- old runs/observations/outbox/config no formal new writes。

---

# 38. Real Acceptance

Engineering Verify PASS 后才执行真实 Acceptance。

至少覆盖：

1. Initial first Monitor：
   - initial bootstrap。
   - CREATE。
   - first submit。
   - chatId capture。
   - register not active。
   - boot proof。
   - takeover。
   - current switch。

2. Normal multi-turn：
   - BUSY -> READY_STABLE。
   - fixed + dynamic TURN_WAKE。
   - dynamic intent consumed once。
   - missing intent fallback。

3. Observation recovery：
   - Extension reload。
   - new contentInstanceId。
   - old observation rejected。
   - exact Chat rebind。

4. Message UNKNOWN：
   - controlled lost response。
   - no duplicate send。
   - existing reconciliation resolves or stays UNKNOWN。

5. HOLD：
   - semantic blocker。
   - Feishu once。
   - no auto wake。
   - manual resolution。
   - clear hold。

6. Rotation：
   - shortened controlled rotation config。
   - pending turnWake discarded。
   - HANDOFF APPLIED。
   - predecessor HANDOFF_ONLY。
   - formal handoff。
   - bootstrap staged。
   - HANDOFF_COMPLETED。
   - predecessor mutation NONE。

7. Successor：
   - create/register。
   - multi-turn boot if needed。
   - takeover。
   - current switch only after proof。

8. Failed successor：
   - registered but not active。
   - stalled notify。
   - abandon。
   - replacement。
   - successful takeover。

9. Notification：
   - Browser mechanical。
   - Model semantic。
   - dedupe。
   - no TURN_WAKE spam。
   - controlled transport timeout -> UNCERTAIN, no duplicate retry。

10. Cutover：
    - current legacy reality preserved。
    - new owner adopted。
    - no old truth writes。
    - only monitor-state.json remains formal Monitor business JSON.

11. Product / Worker：
    - no regression。
    - Monitor lane does not steal normal Chrome targets。

---

# 39. 实施阶段

## Stage A — Contract Freeze

一次性固定：

- state v1 schema。
- field dictionary。
- config defaults。
- mutationMode。
- observation epoch。
- logical operations。
- error contract。
- prompt templates。
- effect-owner boundary。
- notification ownership。
- idempotency retention。
- migration mapping。
- formal DOCS-monitor-state.md。

完成后 FROZEN。

## Stage B — Node state owner

实现：

- one monitor-state.json。
- config。
- state/current read。
- bootstrap staging/effect projection。
- Browser create-settlement registration / chat bind-observe-event。
- boot proof。
- handoff.complete。
- takeover.accept。
- successor.abandon。
- notifications outbox。
- idempotency receipts。
- atomic state persistence。
- restart recovery。

## Stage C — Browser scheduler / effect integration

实现：

- READY/BUSY/UNKNOWN。
- readyStable / stale gate。
- observation instance bind。
- driveTarget。
- decision priority。
- existing create/submit capability integration。
- UNKNOWN reconciliation。
- chatId capture。
- exact target recovery。
- mechanical notifications。

不重新造第二 Browser executor。

## Stage D — Automation helpers

实现：

- monitor-current.mjs
- monitor-state.mjs
- monitor-config.mjs
- monitor-event.mjs
- no standalone monitor-register.mjs; Browser create settlement owns registration
- monitor-injection.mjs
- monitor-handoff-complete.mjs
- monitor-boot-proof.mjs
- monitor-takeover.mjs
- monitor-successor-abandon.mjs
- monitor-notify.mjs
- monitor-migrate-legacy.mjs
- lib/monitor-api-client.mjs

## Stage E — Skill / Legacy convergence

- update proflow-chat-loop。
- remove Coordinator authority。
- update TURN_WAKE rule。
- add mutationMode gate。
- stop legacy run/observation/config/outbox formal writes。
- old helper migration/delete。
- migration dry-run。

## Stage F — Engineering Verify

Stage Freeze 后一次执行：

- targeted package tests。
- new helper tests。
- typecheck。
- build。
- relevant root/governance gates。
- git diff --check。

失败进入独立 Repair Stage，不边改边测。

## Stage G — Runtime convergence / cutover

- official Platform owner quiesce。
- legacy migration。
- build/adopt new runtime。
- Extension reload/adoption。
- exact state owner identity。
- no shadow process。
- no dual writer。

## Stage H — Real Acceptance

按第 38 节执行。

## Stage I — Cleanup

全部 PASS 后：

- 删除 legacy Monitor runtime truth。
- 删除不再需要的 old helpers。
- 删除本临时计划。
- 若 automation/proflow-maintenance/.tmp 为空则删除目录。
- 保留正式代码、正式 contract、稳定 automation、验证证据。

---

# 40. Done 标准

只有全部满足才完成：

- Monitor 业务状态正式只有 monitor-state.json 一个 JSON truth。
- Node 是唯一 Monitor state writer。
- Browser / Model 都不直接写状态。
- existing Browser create/submit + reconciliation 被复用，没有第二 effect owner。
- READY/BUSY/UNKNOWN 正确。
- ready debounce / stale observation 正确。
- contentInstanceId/epoch 防迟到覆盖。
- TURN_WAKE / HANDOFF / BOOTSTRAP 三类 prompt 无冲突。
- dynamic TURN_WAKE 只是 hint，不是 authority。
- register != activate。
- predecessor handoff completed 后 mutation NONE。
- successor boot proof 前 mutation NONE。
- TAKEOVER_ACCEPTED 才切 currentChatId。
- predecessor.nextChatId 只在 takeover 成功时建立。
- failed successor 可以 abandon / replacement。
- HOLD 真正停止自动驱动。
- notification outbox 并入单一 state JSON。
- UNCERTAIN 不 blind retry。
- Model / Browser notification ownership 无重复。
- normal TURN_WAKE 静默。
- projectLocator + conversationLocator + chatId 强校验。
- idempotency receipts 独立于 diagnostic event compaction。
- legacy cutover 无双 writer、无双 truth。
- ProFlow Chat Loop Skill 与新实现一致。
- Engineering Verify PASS。
- Runtime Convergence PASS。
- Real Acceptance PASS。
- Product / Worker Browser 无回归。

全部 PASS 后，本临时计划必须删除，再继续后续 Maintenance 自动化讨论。

