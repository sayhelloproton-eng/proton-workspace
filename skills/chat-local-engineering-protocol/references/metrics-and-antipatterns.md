# 指标与反模式

唯一规则 owner 是 `../SKILL.md`。

## Primary KPI

`USER_PERCEIVED_WALL = user request → completed result`。
内部拆分：Chat reasoning/context ingest + Tool/control-plane wall + Local compute + recovery tax。
不能用“Local 只花了几百毫秒”替代用户实际等待时间。

## Hard metrics

- `LSR_AFTER_SNAPSHOT = 0`，除非 named evidence trigger 重开 ACQUIRE。
- `LMR_PER_DECISION = 1` target。
- normal `VERIFY_START = 1`。
- `KNOWN_SCOPE_PREFLIGHT_PROBES = 0`：已知多文件 scope 的第一源码读取必须直接 batch-first。
- per-file mutation loop = 0。
- blind retry = 0。
- native primitive 可回答时，shell-wrapped ordinary read/search = 0。
- debugging loop 中 Full Suite = 0。

## Normal wall budgets

- known scope / ordinary: 1–3 min
- known scope / large source: 2–4 min
- unknown cross-module: 3–5 min
- frozen repair: +1–2 min
- complex architecture: 5–10 min

Routine work >10 min 默认视为 throughput failure，直到能用真实 reasoning/runtime 证明不可避免。

## Anti-patterns

1. FROZEN 后 `read → think → grep → read`。
2. 把 MCP 当 remote IDE。
3. 已知多个文件先逐个 `read_file(..., length=1)` / line-count probe，再调用 batch read。
4. 普通 read/search 通过 `start_process + cat/git show/grep` 完成。
5. 一看到 candidate 就把整个 package/full repo 灌进 Chat。
6. Acceptance evidence 太窄，导致同一 Decision 漏验收维度。
7. 完整源码过量导致 over-design。
8. model-authored patch/unified diff 作为默认 mutation transport。
9. Local Python/sed/string transformer 决定源码变化。
10. 一个 Engineering Decision 做多次 Local mutation。
11. VERIFY FAIL 后无证据重新 ACQUIRE。
12. repair loop 反复 Full Suite。
13. timeout/UNKNOWN 后 blind retry。
14. 独立 drift-check call + 独立 apply call，而 gate 可以安全内嵌 APPLY。
15. 把 file count 当 mutation unit。
16. 用 Local mechanical time 冒充用户总吞吐成绩。

## Evidence-driven fallback

Batch-first 并不要求无视截断：如果 native batch 结果明确报告 `remaining lines` / truncation，才有证据切换 S2 → Repomix exact。禁止为了预判截断而购买逐文件 probe RTT。
