# 测试与长任务

`../SKILL.md` 是唯一规则 owner。本文件只解释 VERIFY / long-running process 的执行意图。

## Verification shape

正常 Decision：一次 batched targeted VERIFY。

失败后：Failure First；冻结源码足够时直接修复，只重跑受影响 proof。Full Suite 留给 Stage Gate，不进入 debugging loop。

## Start once

```text
start once
→ keep PID/session/log authority
→ sample only when result can change a decision
→ terminal result
```

不要为了知道“还在运行”而 polling。

## Timeout / UNKNOWN

```text
same PID/session
→ if unavailable, recover runtime authority
→ retry only after proven failure
```

Timeout 不是失败证明。非幂等 mutation/publish/deploy/start 的 UNKNOWN 禁止 blind retry。

## Output density

PASS 返回 concise terminal summary；FAIL 返回最小但充分的 failing proof/path/stack/stderr。不要把完整成功日志重新灌入 Chat。

Runtime mismatch 优先查拥有该事实的 CLI/PID/log/browser authority，不要回源码猜运行态。