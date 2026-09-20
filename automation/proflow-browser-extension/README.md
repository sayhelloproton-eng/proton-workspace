# ProFlow Browser Extension automation

本目录只拥有 **Browser Extension 运维与兼容入口**。Monitor v4 的正式 Maintenance 状态/生命周期 helper 已统一迁到：

`/Users/agent/Desktop/proton-workspace/automation/proflow-maintenance/`

## Extension reload

```text
node automation/proflow-browser-extension/reload.mjs --workspace /Users/agent/Desktop/proton-workspace
```

当 Acceptance 已证明 exact registration/path 正确，且当前 evidence 明确要求 reload 时，可显式使用：

```text
node automation/proflow-browser-extension/reload.mjs \
  --workspace /Users/agent/Desktop/proton-workspace \
  --force
```

`reload.mjs` 仍是 Extension 运维 owner；它不拥有 Monitor state、drive decision、handoff 或 takeover。

真实 Acceptance 调用 reload 前必须按 Acceptance Skill 获取所需 Browser lease。不得把 reload 当作调试 transport。

## Monitor compatibility entrypoints

以下旧路径只为历史调用兼容，不再拥有业务语义：

### boot proof

```text
node automation/proflow-browser-extension/monitor-boot-proof.mjs ...
```

该入口只转发到：

`automation/proflow-maintenance/monitor-boot-proof.mjs`

正式 operation 是 `bootProof.record`，不是 legacy `shift.bootProof`。

### debug

```text
node automation/proflow-browser-extension/monitor-debug.mjs
```

该入口只读新 `config.read/current.read/state.read/notification.readOutbox`，不再读取 legacy run/observation truth。

### initial seed

`monitor-initial-seed.mjs` 已正式退役并 fail closed。

Initial Monitor 必须使用：

```text
node automation/proflow-maintenance/monitor-injection.mjs bootstrap \
  --initial \
  --shift-id <shiftId> \
  --text-file <fresh-bootstrap-context>
```

随后由 Browser scheduler → Execution `monitor.chat.create` 创建真实 Chat，并在 APPLIED settlement 中注册真实 chatId。

## Monitor v4 owner boundary

- Browser Extension：页面观察、timing、physical carrier。
- Platform Host：authenticated thin relay。
- Node Monitor state：唯一 Monitor business state writer。
- Execution Runtime + Browser executor：create/submit side-effect truth。
- Model：工程语义、continuation intent、handoff 内容、semantic notification request。

本目录不得恢复：
- `run.create/run.list/run.read`
- `shift.bootProof/shift.activate`
- independent Monitor polling coordinator
- direct Monitor JSON writes
- standalone production `chat.register`
