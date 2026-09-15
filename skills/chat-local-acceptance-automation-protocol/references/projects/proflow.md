# ProFlow Acceptance Automation

本 reference 只在 ProFlow Acceptance 需要项目专属 Browser Extension 生命周期或 Custom GPT 自动化规则时加载。

## Browser Extension

保持三个动作独立：`INSTALL`、`RELOAD`、`UNINSTALL`。`UNINSTALL` 绝不是 RELOAD 的默认前置条件。

稳定 RELOAD 执行器已经从 Skill 拆出，唯一 owner 是：

```text
node /Users/agent/Desktop/proton-workspace/automation/proflow-browser-extension/reload.mjs \
  --workspace /Users/agent/Desktop/proton-workspace
```

真实 Acceptance 调用它之前，必须先满足本 Skill 的 Browser usage guard；Extension reload 是全局破坏性动作，因此必须已经拿到 `exclusive` lease，并且当前证据真的要求 RELOAD。执行器只证明 registration/path、loaded version、reload dispatch 和 post-reload version；它不证明 pairing/runtime readiness，也不代表最终产品 PASS。

Fresh INSTALL 仍是不同路径：只有 precondition=MISSING 时执行，并用新 registration/path + loaded-version/heartbeat 证明。不得通过隐式 `UNINSTALL → INSTALL` 模拟。

## Cold restart recovery

如果 ProFlow cold start/status 已证明 registration/path/version 正确，只是当前 runtime session offline，优先恢复同一 session：

```text
platform setup --module execution-browser-extension
→ wait terminal result
→ platform status / fresh heartbeat
```

不要先 uninstall/install/reload，也不要 broad setup。timeout/UNKNOWN 先恢复同一 PID/result。

## Custom GPT material

任何可能修改现有 managed GPT 的操作，先看当前编辑器真实状态：精确 GPT identity、无 save/draft error、managed Action 数量符合当前产品、只存在当前 Gateway domain、无 `Unknown domain`。已有 managed Action 必须原位编辑；只有现实证明不存在 managed Action 才允许 `Create new action`。出现 duplicate/Unknown domain/save error 时停在第一 divergence，不盲目重跑 setup。

## Operation-chain diagnosis

跨层问题优先使用 `repos/proflow/scripts/operation-chain-diagnose.mjs` 的 task/operation/correlation/execution 入口，定位 previous successful boundary + first divergence；只有投影明确缺证据时才钻原始日志。诊断投影不是第二 truth store，时间邻近也不能冒充 EXACT correlation。
