# 测试与长任务协议

唯一规则 owner 是 `../SKILL.md`。

## Verification pyramid

所有 test/build/typecheck/lint/benchmark 必须在用户本机真实执行。

正常 Decision：`ONE batched targeted VERIFY`。
失败后：Failure First，优先返回 failing proof/path/stack/stderr；冻结源码足够时直接在 Chat 修复，再只重跑失败 proof。
Full Suite 只在 Stage Gate 使用，不进入 debugging loop。

## Start once

```text
START ONCE
→ keep PID/session/log authority
→ decision-value sampling only
→ terminal result
```

不要为了知道“还在运行”而高频 polling。

## Timeout / UNKNOWN recovery order

```text
same PID/session continuation
→ if session unavailable, recover authority from PID/log/status
→ only after proven failure may a retry be considered
```

Timeout 不是失败证明。非幂等 mutation/publish/deploy/start 的 UNKNOWN 禁止 blind retry。

## Result density

PASS 默认返回 concise terminal summary。失败返回最小但足够的 proof 和环境分类，不把完整 PASS 日志重新灌入 Chat。

## Runtime mismatch

Runtime evidence 与 source evidence 分域。Declared/shared facts 与真实 PID/port/browser 不一致时，先查 Runtime authority；不要回到源码反复 grep 猜原因。
