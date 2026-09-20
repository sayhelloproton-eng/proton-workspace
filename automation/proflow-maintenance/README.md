# ProFlow Monitor Maintenance automation

本目录是 Monitor v4 的正式 Maintenance helper owner。所有业务状态读写都通过 Node Monitor Control API；脚本不直接写 `monitor-state.json`，也不建立第二份 cache truth。
## Context ownership

Maintenance helper 只连接三个独立 owner，不合并上下文：

```text
ProFlow project context  → repos/proflow 的 README / CURRENT / REQUIRED_CONTEXT / project Runbook
Chat Loop continuation   → workspace proflow-chat-loop Skill + continuation checkpoint
Monitor runtime/lifecycle→ Node Monitor Service / monitor-state.json
```

`monitor-boot-proof.mjs` 先通过只读 `capabilities.read` 协商 boot-proof contract。任何**新** boot proof 都只允许 `proflow.monitor-boot-proof.v4`，并使用分离的 `projectContextProofs` / `chatLoopContextProof`。旧 live Node 若明确返回 `MONITOR_CONTROL_OPERATION_UNSUPPORTED`，helper 返回 `MONITOR_BOOT_PROOF_RUNTIME_ADOPTION_REQUIRED`，不会生成 v3；transport UNKNOWN、格式异常或“capability 已存在但未声明 v4”同样 fail closed。Node parser 仅保留已持久化 v3 proof 的 legacy-read 兼容。

## Read surfaces

```text
node automation/proflow-maintenance/monitor-current.mjs
node automation/proflow-maintenance/monitor-state.mjs
node automation/proflow-maintenance/monitor-config.mjs
```

`monitor-current.mjs` 是本机 mutation gate。是否可修改 ProFlow 必须看 `mutationMode`，不能只看 `currentChatId`。

## Model semantic surfaces

```text
node automation/proflow-maintenance/monitor-event.mjs blocked \
  --kind USER_DECISION_REQUIRED \
  --incident-ref <ref> \
  --reason <text>

node automation/proflow-maintenance/monitor-event.mjs clear

node automation/proflow-maintenance/monitor-injection.mjs turn-wake \
  --text "<advisory continuation>"

node automation/proflow-maintenance/monitor-notify.mjs \
  --kind USER_DECISION_REQUIRED \
  --incident-ref <ref> \
  --title "<title>" \
  --message "<message>"
```

TURN_WAKE continuation 只是 hint；真实 authority 优先。普通 TURN_WAKE 不发送通知。

## Handoff / successor

正确顺序：

```text
HANDOFF physical effect applied
-> predecessor writes .handoff/current.md
-> monitor-handoff-complete.mjs
-> predecessor mutationMode = NONE
-> monitor-injection.mjs bootstrap --shift-id <next> --text-file <fresh-context>
-> Browser creates the real Chat and registers it from effect settlement
-> successor restores authority
-> successor monitor-boot-proof.mjs --shift-id <next> --authorities-read
-> successor monitor-takeover.mjs --shift-id <next>
-> atomic currentChatId switch
```

没有独立 `chat.register` helper。真实 Chat 注册只来自 Browser `monitor.chat.create` 的已确认 settlement。

失败 successor：

```text
node automation/proflow-maintenance/monitor-successor-abandon.mjs \
  --shift-id <candidate> \
  --reason "<mechanically proven reason>"
```

Timeout 本身不允许 abandon；必须先确认没有 unresolved Browser effect。

## Initial Monitor

```text
node automation/proflow-maintenance/monitor-injection.mjs bootstrap \
  --initial \
  --shift-id monitor-a \
  --text-file <fresh-bootstrap-context>
```

Initial 只允许在没有 current Chat、没有 live candidate 时 staging。随后 Browser scheduler 通过正式 create effect 创建真实 Chat。

## Legacy migration

```text
node automation/proflow-maintenance/monitor-migrate-legacy.mjs
node automation/proflow-maintenance/monitor-migrate-legacy.mjs --assert-adopted
```

Migration apply 只由正式 Node owner 启动路径执行。helper 不直接写 state；`--apply` 会 fail closed。

## Idempotency / UNKNOWN

Mutation helper 默认从输入生成稳定 requestId。Control timeout/transport loss 返回 UNKNOWN 类错误，调用方必须先读取 owner state / receipt 再决定是否重试，禁止换 requestId 盲重放。

## Ownership

- Browser Extension：页面观察、timing、physical carrier。
- Platform Host：authenticated thin relay。
- Node Monitor state：唯一业务状态 writer、transition validation、notification outbox。
- Execution Runtime + Browser effect owner：create/submit 的 APPLIED / NOT_APPLIED / UNKNOWN truth。
- Model：工程语义、continuation intent、handoff 内容、semantic notification request。
