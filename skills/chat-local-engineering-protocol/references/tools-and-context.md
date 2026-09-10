# 工具与上下文协议

本文件只解释 ACQUIRE/FROZEN 与工具分工；唯一规则 owner 是 `../SKILL.md`。

## Evidence-first acquisition

ACQUIRE 的推荐顺序：

```text
完整 Acceptance Evidence
→ owner / seam / blast-radius discovery
→ 最小 implementation context
→ Engineering Decision
→ actual changed files 的完整源码
→ FROZEN
```

Candidate scope 可以保守，reasoning context 不应因此被迫变大。

## Scenario-aware routing

- 已知小/中 scope：Local native `read_multiple_files/read_file`。
- 已知大文件：Repomix exact full snapshot。
- 未知跨模块：CodeGraph structural evidence + Local native search + WIP paths，再只取必要 seams。
- Runtime/UI：按 owner CLI、Local runtime authority、Playwright/AX 的事实域路由，不从源码猜 runtime。

## Primitive preference

普通 read/search 优先原生 API。不要为了“统一流程”把 `cat/git show/grep` 包进昂贵 `start_process`。

`start_process` 保留给真正需要进程语义的事情：Git authority、whole-file apply、test/build/typecheck/lint/benchmark、runtime/PID/log。

Repomix compressed 适合低 token discovery；Repomix exact 才能承担大文件 mutation-grade snapshot。

## FROZEN read lock

满足当前 Engineering Decision 的最小充分证据后立即 FROZEN：

`LSR_AFTER_SNAPSHOT = 0`

只有 `SOURCE_DRIFT / VERIFICATION_FAILURE_REQUIRING_NEW_SOURCE / RUNTIME_REALITY_MISMATCH / EVIDENCE_TRIGGERED_SCOPE_EXPANSION` 能重开 acquisition。
模型的不确定、谨慎、想确认一次，不是 evidence。

## Authority boundaries

- CodeGraph：结构、ownership、caller/callee、dependency、blast radius。
- Local native read/search：当前 filesystem 文本事实和 WIP 可见性。
- Repomix：大/广源码 snapshot。
- Local process：Git/runtime/真实执行/PID/log/whole-file apply。
- Playwright/AX：浏览器页面、AX、Console、Network。

不要要求单个工具承担它不拥有的事实域。
