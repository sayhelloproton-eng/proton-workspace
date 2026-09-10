LOCAL_ENGINEERING_PROTOCOL=v3

- 硬 Phase Lock 不变：`ACQUIRE → FROZEN → BUNDLE_READY → APPLIED → VERIFY → DONE`。
- 最小工作单位是 Engineering Decision；文件数不是 mutation unit；正常目标 `LMR=1`。
- ACQUIRE 改为 scenario-aware：先完整 Acceptance Evidence，再找 owner/blast radius，再读最小 implementation seam；Decision 锁定后，只给实际 changed files 补齐完整源码，然后立即 FROZEN。
- 已知小/中 scope 优先 Local native batch read；已知大文件用 Repomix exact；未知跨模块用 CodeGraph structure + Local native search/WIP evidence；不要把普通 read/search 包进 `start_process`。
- Candidate scope 可以保守，但 reasoning context 必须 minimum-sufficient；禁止默认整 package/整仓 full-source 灌入 Chat。
- FROZEN 后 `LSR_AFTER_SNAPSHOT=0`。只有 SOURCE_DRIFT、VERIFICATION_FAILURE_REQUIRING_NEW_SOURCE、RUNTIME_REALITY_MISMATCH、EVIDENCE_TRIGGERED_SCOPE_EXPANSION 才能重开 ACQUIRE。
- Chat 负责语义设计和 changed files 完整新版本；Local 不拥有行/块修改逻辑。默认 mutation transport 仍只有 Whole-file Bundle Replacement：完整文件 → `changed-files.tar` → 一次 CREATE/REPLACE/DELETE。
- Apply 内嵌 HEAD/WIP/fingerprint drift gate；不一致 fail closed、零 mutation，避免为了安全单独增加一次 RTT。
- VERIFY 本机真实执行、start once、Failure First；冻结包足够时直接 Chat 修复，只重跑失败 proof；Full Suite 只做 Stage Gate。
- timeout/UNKNOWN 优先续读同 PID/session；session 不可用才恢复 authority；非幂等动作禁止 blind retry。
- Runtime 按事实 owner 路由：平台 readiness→正式 CLI/runtime owner；PID/port→Local runtime；Web UI/Console/Network→Playwright/AX；不要用源码猜 runtime。
- 主 KPI 是 `USER_PERCEIVED_WALL`，不是 Local mechanical time。普通已知 scope 目标 1–3min，大源码 2–4min，未知跨模块 3–5min，复杂架构 5–10min；普通任务 >10min 默认视为 throughput failure，除非有真实 reasoning/runtime 证据。
- 共享 Skill：`/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/SKILL.md` 是唯一规则 owner；references 只解释/记录证据。
- 本协议只约束 ChatGPT Chat ↔ Local engineering；不得修改或约束 Codex app/CLI/app-server/skills/AGENTS.md/hooks。
