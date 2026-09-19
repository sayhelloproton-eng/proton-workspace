# ProFlow Browser Extension automation

本目录统一拥有 ProFlow Browser Extension 的稳定机械流程：registration/probe/reload/version reconciliation、Monitor 只读诊断快照，以及 Monitor shift 的正式 boot-proof publication。

Extension reload：

```text
node automation/proflow-browser-extension/reload.mjs --workspace /Users/agent/Desktop/proton-workspace
```

当 Acceptance 已证明 exact registration/path 正确、且 source/deployment package fingerprint 存在同版本字节漂移时，可显式使用：

```text
node automation/proflow-browser-extension/reload.mjs --workspace /Users/agent/Desktop/proton-workspace --force
```

`--force` 只跳过“loaded version 已等于 expected version”这一短路判断；它仍然先验证唯一 registration/path，并且仍只执行同一 registration 的 `chrome.runtime.reload()`，绝不 uninstall/reinstall。

Monitor Debug Collector：

```text
node automation/proflow-browser-extension/monitor-debug.mjs --workspace /Users/agent/Desktop/proton-workspace
```

可选 `--run-id`、`--chat-ref`、`--since-minutes`。Collector 只读收集 Bridge session、Monitor config/run/observation/outbox、Extension verification 和最近 Monitor structured logs；credential 只在进程内用于 loopback owner 调用，绝不输出 token，也不修改 Monitor/Browser 状态。

Monitor boot proof：

```text
node automation/proflow-browser-extension/monitor-boot-proof.mjs \
  --workspace /Users/agent/Desktop/proton-workspace \
  --shift-id <current-shift-id> \
  --authorities-read
```

`monitor-boot-proof.mjs` 只允许在 Monitor Chat 已真实完成 `proflow-chat-loop` 固定 authority + `CURRENT.REQUIRED_CONTEXT` 读取后调用。`--authorities-read` 是调用 Chat 对该事实的显式确认；helper 会再次机械验证固定 authority、CURRENT 动态 REQUIRED_CONTEXT 与 handoff 路径均存在，从正式 Monitor owner 唯一解析 run/chat identity，并且只调用 `shift.bootProof`。它**不会**调用 `shift.activate`、不会改 runtime JSON、不会提交 Chat 文本；ACTIVE 与后续 neutral `TURN_WAKE` 必须继续由 Platform Monitor coordinator 正式驱动。若环境中同名 shift 不唯一，可显式补 `--run-id`；重复调用对已有 bootProof 只做只读回报。

真实 Acceptance 调用 reload 之前，必须先按 Acceptance Skill 获得 `exclusive` Browser lease，并且当前证据真的要求 RELOAD。Monitor Debug Collector 是 read-only Engineering 诊断，不需要借 reload 制造证据。`reload.mjs --self-test` 与 `monitor-boot-proof.mjs --self-test` 只测本地 contract/helper，不触发真实 Chrome 或 Monitor 状态变更。
