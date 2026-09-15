# 测试、阶段 Gate 与长任务

`../SKILL.md` 是唯一规则 owner。本文件只展开 Stage Verify、长任务、发布与 frozen receipt 的机械语义。

## Stage model

正式测试不是开发探针：

```text
IMPLEMENT
→ STAGE FREEZE
→ STAGE VERIFY
→ ACCEPTANCE when required
→ RELEASE / PUBLISH when authorized
```

### Implementation-time mechanical checks

开发阶段允许的只是不会把实现变成“边改边测”的机械完整性检查，例如：
- expected-state / HEAD / fingerprint drift gate；
- whole-file envelope/materialize/apply 完整性；
- 必要的语法/parse sanity；
- 路径、schema、文件存在性；
- `git diff --check`。

这些检查回答“这次文件是否完整、可解析、没有机械损坏”，不回答产品行为是否正确。

### Formal Stage Verify

以下都属于阶段 Gate，默认必须等实现范围完成并 Stage Freeze 后再跑：

```text
unit / integration tests
typecheck / lint when used as correctness gate
build / publishability
E2E / browser acceptance
full regression / Full Suite
```

正常阶段只启动一次 batched verification。不要在每个文件、每个小修、每个猜测后启动测试。

### Failure handling

Stage Verify 失败时先收集当前 failure set 和 first owning boundary，然后结束这一轮验证：

```text
VERIFY FAIL
→ failure set / first divergence
→ REPAIR STAGE
→ complete all scoped repairs
→ STAGE FREEZE
→ VERIFY AGAIN
```

禁止 `test A → patch → test A → patch → test B → patch` 的交错循环。只有新证据真正改变 repair scope 时才重新 acquisition。

Full Suite 永远是 Stage Gate，不进入 debugging loop。Acceptance 同理：发现产品 defect 后应回 Engineering Repair Stage，修完再回同一 Acceptance scene，而不是一边真实验收一边持续改源码。

## Long work: start once, never babysit

任何已知慢任务都遵循：

```text
start exactly once
→ record PID/session
→ record log path when available
→ record terminal Owner authority / target identity
→ continue independent work
→ check only at the dependency point
```

启动确认后，不要继续 `read_process_output`、`ps`、health/status、Registry query 或固定间隔等待，只为知道“还活着吗”。如果没有独立工作，直接把控制权还给用户。

依赖点真正到来时：

```text
terminal Owner authority first
→ satisfied: PASS/APPLIED, stop
→ unresolved: inspect recorded PID/session once
   → alive: RUNNING, continue independent work or return control
   → dead: read terminal log/output once
            → classify
            → retry only after proven NOT_APPLIED/FAILED
```

普通 known-slow task 若当前决策真的必须等待终态，可以保持同一 session，但只能在新证据会改变决策时采样，禁止固定周期 polling。

## npm publish / release — absolute non-blocking

npm publish/release 无条件禁止同步等待：

```text
start once, detached/durable
→ record PID/session + log + exact package@version
→ continue independent work immediately
→ later dependency point: npm view exact Registry authority first
```

最终 authority：

```text
npm view <package>@<version> version
```

exact version 已存在即 `APPLIED/PASS`，无需再关心原 publish 进程。Registry 尚未满足时才检查 PID 一次；PID 活着判 `RUNNING`，PID 已退出才读日志一次。只有机械证明 `NOT_APPLIED/FAILED` 后才能重试。

禁止 publish 一个临时版本来调试实现。Publish 只能发生在 Stage Verify / required Acceptance 之后的正式 delivery phase。

## Release-bound Git authorization

用户明确要求 release/publish 当前或命名版本时，正式 release workflow 所机械需要的 release-bound commit 已被授权，不需要重复询问。授权不覆盖无关 commit，也不自动授权 push。

## Timeout / UNKNOWN

```text
same PID/session or durable effect authority
→ recover current outcome
→ retry only after proven failure / NOT_APPLIED
```

Timeout 不是失败证明。对已确认启动的慢任务，Tool wait timeout 不进入 blind recovery，更不能起第二份。非幂等 mutation/publish/deploy/install/update 的 `UNKNOWN` 必须 reconcile。

## Durable frozen-decision authority

Frozen runner 的终态不能只依赖 PTY/session。`execute-frozen-decision.mjs` 在 apply 前创建：

```text
skills/chat-local-engineering-protocol/.runtime/frozen-decisions/<authority-id>/decision-receipt.json
```

receipt 原子记录至少：`READY_TO_APPLY`、`APPLYING`、`APPLIED_VERIFYING` / `VERIFYING`、verification checkpoints，以及 terminal `PASS | VERIFY_FAILED | APPLY_FAILED | UNKNOWN_AFTER_MUTATION | FAIL_CLOSED`。

若 Tool/PTTY/session output 丢失：

```text
read DURABLE_RECEIPT first
→ terminal: consume result, do not rerun
→ nonterminal: recover latest checkpoint/currentVerification
→ inspect PID/session only if receipt cannot close the decision
```

已经记录 `passed=true` 的 verification command 不重复执行。只有新的失败证据或未完成 checkpoint 才允许 targeted recovery。

runner 只有在 `BUNDLE_READY` 且完整 envelope 已准备好时才能启动；不要故意把 `chat-local>` 等待态跨 turn 留给下一 Chat。

## Output density

PASS 只返回 concise terminal summary；FAIL 返回最小充分 failing proof/path/stack/stderr。Runtime mismatch 查事实 owner，不回源码猜运行态。
