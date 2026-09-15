# ProFlow Browser Extension automation

唯一职责：exact Chrome registration/path → loaded-version probe → conditional `chrome.runtime.reload()` → post-reload version reconcile。

```text
node automation/proflow-browser-extension/reload.mjs --workspace /Users/agent/Desktop/proton-workspace
```

它不决定“是否应该 reload”。真实 Acceptance 必须先按 Acceptance Skill 获得 `exclusive` Browser lease 并证明 RELOAD 有必要。`--self-test` 只测本地 contract/helper，不触发真实 Chrome。
