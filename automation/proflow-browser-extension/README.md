# ProFlow Browser Extension automation

本目录只拥有 **Browser Extension 运维与 runtime adoption**。Monitor 生命周期属于 `automation/proflow-maintenance/`。

## Public adoption action

正常模型不再自己判断 probe / reload / instanceId / heartbeat：

```text
node automation/proflow-browser-extension/adopt.mjs \
  --workspace /Users/agent/Desktop/proton-workspace
```

固定状态机：

```text
source/package static fingerprint
→ materialization marker + materialized static fingerprint exact
→ verification fresh + exact ? ALREADY_CURRENT
→ Browser ready / controlled group
→ exact registration/path proof
→ fixed detail URL chrome://extensions/?id=eehdadpmjffomabiedcjijiakconalab
→ exactly one button "重新加载" click
→ visible "已重新加载" readback when available
→ new extensionInstanceId
→ PAIRING_HEARTBEAT verification readback
→ ADOPTED | UNKNOWN
```

`adopt.mjs` 在打开任何 Browser boundary 之前先执行 artifact guard。source static package fingerprint、`.proflow-materialization.json.packageFingerprint`、materialized static package fingerprint 与 package-owned version facts 必须全部一致；**同一个 moduleVersion 不足以证明 current**。任何 stale/corrupt/materialization mismatch 直接 BLOCKED，不 connect、不 reload。它只采用 **已经正式 materialize 的 Extension**，不 build、不 version、不 publish。

## Low-level reload owner

`reload.mjs` 是唯一 Extension reload 原子 owner，Extension ID 固定为 `eehdadpmjffomabiedcjijiakconalab`，不得由模型/参数覆盖。它自己也在任何 Browser action 之前执行 artifact guard；即使绕过 `adopt.mjs` 直接调用，source/materialization/version 不一致时也只能返回 BLOCKED，不能打开详情页或点击刷新。唯一 UI 路径固定为：

```text
canonical controlled group
→ about:blank
→ group + readback
→ chrome://extensions/?id=eehdadpmjffomabiedcjijiakconalab
→ role=button / accessible name="重新加载" / exactly one
→ click once
→ optional visible "已重新加载"
→ support tab cleanup
```

不再访问 Extension options 自刷页，不搜索扩展列表，不使用坐标，也不通过 `/usr/bin/open` 创建组外页面。真正 reload 成功仍由 `adopt.mjs` 的新 `extensionInstanceId + PAIRING_HEARTBEAT` 裁决；即使点击调用丢失返回，只要 heartbeat 对账证明新实例，settlement 可收敛为 `RECONCILED_BY_HEARTBEAT`.

低层直接调用只用于 automation 内部/诊断：

```text
node automation/proflow-browser-extension/reload.mjs --workspace /Users/agent/Desktop/proton-workspace
```

## Monitor compatibility

旧 `monitor-boot-proof.mjs` 只转发到 `automation/proflow-maintenance/monitor-boot-proof.mjs`；`monitor-debug.mjs` 只读 current state；`monitor-initial-seed.mjs` 已退役并 fail closed。

Initial Monitor 正常只通过 `automation/proflow-maintenance/monitor-initialize.mjs`；低层 `monitor-injection bootstrap --initial` 仅供内部 owner。

Ownership：
- Browser Extension：页面 Reality、timing、physical carrier。
- Platform Host：authenticated relay。
- Node Monitor state：唯一 Monitor lifecycle writer。
- Execution Runtime + Browser executor：create/submit side-effect truth。
- Model：工程语义，不编排 reload/adoption mechanics。
