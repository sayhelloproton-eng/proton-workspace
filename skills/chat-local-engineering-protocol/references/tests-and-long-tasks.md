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

## Known-slow detached fast path

当当前机器或重复历史已经证明某类命令通常很慢，例如 package build、publishability、release/publish、deploy、install、full suite，先判断本回合是否真的需要它的终态。

若本回合不需要终态：

```text
start exactly once
→ record PID/session
→ record log path when available
→ record terminal Owner authority / target identity
→ return control
→ same-turn polling = 0
```

启动确认后不要继续 `read_process_output`、`ps`、health/status、Registry query 或固定间隔等待，只为了判断“还活着吗”。协议账务可以继续，但不得再检查这个长任务。

后续用户再次询问，或下游 Decision 真正依赖结果时：

```text
terminal Owner authority first
→ satisfied: PASS/APPLIED, stop
→ not satisfied: inspect recorded PID/session once
   → alive: RUNNING, stop
   → dead: read terminal log/output once
            → classify
            → retry only after proven NOT_APPLIED/FAILED
```

对于 npm publish/release，**Registry exact version** 是发布副作用的最终 authority：

```text
npm view <package>@<version> version
```

如果 exact version 已存在，就直接判定发布 APPLIED；不需要再关心原 publish 进程是否仍在。只有 Registry 未满足时，才检查 PID 一次；PID 已退出才读取日志一次。

### npm publish / release 绝对非阻塞

npm publish/release 是比普通 known-slow task 更严格的特例：**无论当前 turn 是否最终需要发布终态，模型都禁止同步等待 publish/release 完成。**

```text
start exactly once, detached/durable
→ record PID/session + log path + exact package@version
→ immediately continue independent work
→ same-turn process wait / PID polling / fixed-interval polling = 0
→ later dependency point: npm view exact Registry authority first
```

Registry exact version 已存在时直接判 `APPLIED/PASS`。Registry 仍不存在时才检查 PID 一次；PID 活着就判 `RUNNING` 并继续其他独立工作或把控制权还给用户，PID 已退出才读一次 terminal log。只有机械证明 `NOT_APPLIED/FAILED` 后才能重试。

如果已经没有其他独立工作，也必须把控制权还给用户，不能为了等 npm 发布完成而把 Chat 卡住。该规则覆盖普通 long-running task 的“当前 turn 需要终态时可 same-session wait”例外。

对于**非 npm publish/release** 的 known-slow task，若本回合确实必须等待终态，可以保留 same session，但只在新证据会改变决策时采样，禁止固定周期 polling。

## Release-bound Git authorization

用户明确要求“发布/release”当前或命名版本时，该指令已经授权仓库正式 release workflow 为该 release 所机械需要的版本/发布 commit；不要再为了同一个 release 二次询问“是否可以 commit”。授权只覆盖 release-bound commit，不覆盖无关 commit，也不自动授权 push。

## Timeout / UNKNOWN

```text
same PID/session
→ if unavailable, recover runtime authority
→ retry only after proven failure
```

Timeout 不是失败证明。对已知慢任务，只要 PID/session 已机械证明启动成功，普通 Tool wait timeout 不进入 recovery，更不能启动第二份。非幂等 mutation/publish/deploy/start 的 UNKNOWN 禁止 blind retry。

## Durable frozen-decision authority

Frozen runner 的终态不能只依赖 PTY/session 输出。`execute-frozen-decision.mjs` 必须在 apply 前创建并输出受控路径：

```text
DURABLE_RECEIPT=/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/.runtime/frozen-decisions/<authority-id>/decision-receipt.json
```

该 receipt 是 session/output 丢失后的机械恢复 authority。runner 必须原子更新它，至少覆盖 `READY_TO_APPLY`、`APPLYING`、`APPLIED_VERIFYING` / `VERIFYING`、每个 verification checkpoint，以及 terminal `PASS | VERIFY_FAILED | APPLY_FAILED | UNKNOWN_AFTER_MUTATION | FAIL_CLOSED`。staging cleanup 不得删除 durable receipt。

若 Local Dev/PTTY/session output 丢失：

```text
read DURABLE_RECEIPT first
→ terminal status: consume result, do not rerun
→ nonterminal status: recover latest checkpoint/currentVerification
→ inspect PID/session only if receipt cannot close the decision
→ never restart apply/verify merely because chat/tool output disappeared
```

已经在 receipt 中记录为 `passed=true` 的 verification command 不因输出丢失而重跑。只有新的失败证据或未完成 checkpoint 才允许 targeted recovery。

runner 只有在 `BUNDLE_READY` 且完整 envelope 已准备好、可以在当前 turn 紧接 `ENVELOPE_READY` 发送时才启动。不要有意把 `chat-local>` 等待态跨 turn 留给下一个 Chat；若无法继续，应在任何 apply 前 fail closed，而不是留下不透明的等待进程。

Durable receipt 属于受控临时恢复证据，不是项目文件，也不得落 workspace root。终态已被消费且恢复窗口结束后，可由后续 hygiene 清理；UNKNOWN/未完成状态必须保留到 reconciliation 完成。

## Output density

PASS 返回 concise terminal summary；FAIL 返回最小但充分的 failing proof/path/stack/stderr。不要把完整成功日志重新灌入 Chat。

Runtime mismatch 优先查拥有该事实的 CLI/PID/log/browser authority，不要回源码猜运行态。
