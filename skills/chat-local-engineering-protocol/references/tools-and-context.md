# 工具与上下文

`../SKILL.md` 是唯一规则 owner。本文件只解释 ACQUIRE 的证据路由。

## Acquisition shape

```text
acceptance / failing proof / contract
→ owner / seam / blast radius
→ minimum implementation context
→ Engineering Decision
→ complete source for actual changed files
→ FROZEN
```

Candidate scope 可以保守，但 reasoning context 应保持 minimum-sufficient。

## Fact ownership

- CodeGraph：ownership、caller/callee、dependency、blast radius。
- Local native read/search：当前 filesystem/source/WIP 文本事实。
- Repomix exact：native read 会截断的大/广完整 snapshot。
- Repomix compressed：低 token structural discovery。
- Local process：Git authority、apply、verify、PID/log/runtime。
- Playwright/AX：页面、AX、Console、Network。

普通 read/search 优先原生 API；不要为了统一流程包装成 `start_process`。

## Mutation authority / revocation acquisition

当 acceptance 涉及本机 mutation authority、handoff、revoke、stale-client fencing 或“旧会话必须失权”时，先找**最早拥有真实连接 / session / credential 的 trusted ingress**，再判断项目内 guard 是否足够。不要从业务层标签反推 transport identity。

证据判断遵循：
- `roleRef`、`callerRef`、MCP `clientInfo.name/version`、以及 request 自带的 chat/session/run/shift id，默认都只是描述性字段；除非 trusted ingress 已把它们绑定到不可伪造的连接或 credential，否则不能作为可撤销 actor identity；
- 在声明 `FENCED` / `REVOKED` / `TAKEOVER_SAFE` 前，必须枚举所有能产生本机副作用的入口，例如 broker/MCP、direct Local Dev、terminal/shell、项目内部 tool bridge；只保护其中一条链不能证明全局失权；
- downstream/project guard 只能约束经过该 guard 的调用；任何绕过它的 mutation channel 都会让最终 authority gate 保持 `BLOCKED`；
- 若 trusted ingress 当前没有稳定的 per-consumer identity，正确结论是 `BLOCKED/NOT_FENCED`，不能把“当前 active owner/shift”自动附给所有 generic call，否则旧 consumer 会继承新 authority；
- 优先使用由 trusted ingress 颁发并绑定 consumer connection/session 的短期 lease/token，在 handoff/takeover 时 rotate/revoke；旧 consumer 在 revoke 后必须 fail closed；
- application/project 层可以提供 policy/fence state，但 transport identity 与 revoke enforcement 应由真正拥有 ingress/session 的 broker/runtime 层负责。

这类问题的 discovery 先回答“谁拥有不可伪造的 caller identity”和“是否存在 bypass mutation path”，再读业务实现细节；否则容易在错误层补 guard。

## UI visual refinement acquisition

当验收目标是 spacing、alignment、anchor、hover continuity、control geometry 等可见细节时，不要只凭截图猜 CSS 数值。最小充分证据应按当前问题组合：
- pixels / gestalt 真正影响结论时读取 fresh screenshot；
- 精确距离、尺寸、基线、留白时读取 DOM/AX bounds；
- 同时读取 computed style、父级 grid/flex/line-height/transform 与最终 cascade owner；
- 在自定义 hover/popover/switch/slider 等交互前，先确认项目已有 UI primitive/component 是否已经拥有 anchoring、collision、pointer transition、focus 与 accessibility 语义。

若同一个可见 acceptance criterion 在一次 repair 后仍失败，下一轮 ACQUIRE 必须先量化 owner geometry / cascade / interaction path，再允许新的 mutation。不要连续调 `padding`、`margin`、`top`、`left` 等 magic number 作为第二次尝试。

## Repomix hygiene

Repomix 被选中时先约束输入：
- scope 已知优先 `includePatterns`；
- `ignorePatterns` 至少递归排除 `**/node_modules/**`、`**/.git/**`、`**/.next/**`、`**/dist/**`、`**/build/**`、`**/coverage/**`；
- 再补已知 repository-specific generated/cache trees；
- 不仅依赖 `.gitignore` / built-in exclusion；
- 不得过滤掉 acceptance evidence 或 changed-file complete source。

## Freeze boundary

满足当前 Decision 的最小充分证据后立即 FROZEN。之后只有 canonical Skill 定义的 named evidence trigger 能重新 ACQUIRE；“再确认一下”不是 evidence。
