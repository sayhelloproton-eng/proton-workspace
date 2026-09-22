# Automation

`automation/` 保存 workspace 级、可重复执行的确定性工作流；它回答“怎样稳定跑完已经定义好的步骤”，不拥有工程判断。

## Model-facing convergence actions

```text
Browser control ready
→ automation/gptweb-mcp/playwright-ready.py

Microsoft Dev Tunnel ready
→ scripts/dev-tunnel ready <id> <port>

ProFlow Browser Extension adoption
→ automation/proflow-browser-extension/adopt.mjs

ProFlow Initial Monitor creation
→ automation/proflow-maintenance/monitor-initialize.mjs

ProFlow Monitor context paths
→ automation/proflow-maintenance/monitor-context-manifest.mjs

ProFlow Monitor boot + takeover
→ automation/proflow-maintenance/monitor-claim.mjs

ProFlow REAL_SCENE convergence
→ automation/proflow-maintenance/proflow-real-scene-ready.mjs

ProFlow Monitor Browser action
→ automation/proflow-maintenance/monitor-browser-step.mjs

ProFlow Monitor handoff finalization
→ automation/proflow-maintenance/monitor-handoff-finalize.mjs

ProFlow generated gate preparation
→ automation/proflow-maintenance/proflow-stage-prepare.mjs

ProFlow final Stage Verify
→ automation/proflow-maintenance/proflow-stage-verify.mjs

ProFlow Monitor real Acceptance preparation
→ automation/proflow-maintenance/proflow-monitor-acceptance.mjs
```

这些 action 只编排已有 owner，并在 timeout/UNKNOWN 后优先 authority readback；不会建立第二份业务 truth。

## Owners

- `gptweb-mcp/`：Secure MCP runtime lifecycle/watchdog + Playwright deterministic connect/recover；tab/group primitive 属于 `tools/browser/`。
- `dev-tunnel/`：Microsoft Dev Tunnel auth / ensure / host / recover。
- `proflow-browser-extension/`：ProFlow Extension registration/reload/runtime adoption。
- `proflow-maintenance/`：Temporary Chat Loop lifecycle / Browser / Real Scene / final-gate workflow。
- `feishu-knowledge-publish/`：飞书知识发布 deterministic workflow。

规则：不复制 `tools/` 原子能力；不把判断/方法论塞进 automation；Skill 只保留策略、权限和验收语义。稳定的跨 owner 顺序、readback、UNKNOWN reconciliation 应下沉为单一 convergence action。

## ProFlow single-package release

`node automation/proflow-maintenance/package-release.mjs release '{"package":"dev-tunnel"}'`
发布一个已提交的 npm package；RUNNING 立即返回，后续用同入口 `status` 读取 durable receipt，PASS 后 adoption。
输入、状态和显式 retry 见 [Maintenance action catalog](proflow-maintenance/README.md#single-package-npm-release-action)。
