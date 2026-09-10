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

## Repomix hygiene

Repomix 被选中时先约束输入：
- scope 已知优先 `includePatterns`；
- `ignorePatterns` 至少递归排除 `**/node_modules/**`、`**/.git/**`、`**/.next/**`、`**/dist/**`、`**/build/**`、`**/coverage/**`；
- 再补已知 repository-specific generated/cache trees；
- 不仅依赖 `.gitignore` / built-in exclusion；
- 不得过滤掉 acceptance evidence 或 changed-file complete source。

## Freeze boundary

满足当前 Decision 的最小充分证据后立即 FROZEN。之后只有 canonical Skill 定义的 named evidence trigger 能重新 ACQUIRE；“再确认一下”不是 evidence。