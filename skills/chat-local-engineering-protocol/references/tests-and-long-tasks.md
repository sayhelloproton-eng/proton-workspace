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
build
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

## Long work: start once, never babysit, exhaust useful work

任何已知慢任务都遵循：

```text
start exactly once
→ record PID/session
→ record log path when available
→ record terminal Owner authority / target identity
→ plan all currently eligible mainline work
→ execute it to exhaustion
→ replan downstream gate-safe work
→ only after the work pool stays empty: inspect terminal authority
→ PID/session only when terminal authority cannot close
→ RUNNING/UNKNOWN => mandatory replan + more useful work
→ return only after exhaustive replanning finds nothing else safe and relevant
```

任务在两种情况下进入 `ASYNC_BOUND`：本来就是 known-slow，或第一次 Local 调用已经返回 live PID/session + `running/timeout`。

进入后，**异步任务本身不能成为本轮结束条件，也不能成为立刻检查 PID 的理由**。Chat 先执行所有同时满足以下条件的当前工作：
- 与当前主线直接相关；
- 不依赖该异步任务的终态；
- 不越过当前 Stage / Gate；
- 不要求猜测尚未确认的 owner/runtime truth；
- 可以在当前 authority 与安全边界下独立完成。

当前任务池做空后，Chat 还必须主动向后规划一轮，例如：下一 Gate 的只读准备、release/adoption 依赖梳理、owner/identity 只读事实、后续自动化入口准备、文档/契约一致性检查等，只要它们仍属于主线、不过 Gate、且不依赖异步终态。**只有“当前任务池为空 + 主动再规划仍找不到任务”时，才允许第一次检查终态/PID。**

状态检查顺序：

```text
work pool exhausted
→ proactive replan finds no eligible work
→ terminal Owner authority first
→ satisfied: PASS/APPLIED, continue next gated work
→ unresolved: inspect recorded PID/session if needed
   → dead: read terminal log/output once, classify
   → alive/RUNNING:
        mandatory replan of current + downstream gate-safe work
        → execute all newly eligible work
        → exhaust work pool again
        → only then may terminal authority/PID be checked again
```

同一个 authority 在同一个 turn **不再设固定“一次 readback”上限**。新的约束更严格：任何两次 readback 之间必须存在真实的 `replan → meaningful mainline work → work-pool exhaustion` 循环；没有实质工作就连续查状态，仍然属于 polling，禁止。

`RUNNING` / `UNKNOWN` 绝不能直接触发 return。每次 unresolved readback 后都必须重新规划；只有重新规划确认**所有剩余有意义的主线动作都依赖异步终态，或继续动作会跨 Gate**，且没有新任务可做时，才允许把控制权还给用户。

禁止为了“保持忙碌”去做无关清理、额外重构、扩 scope 或提前进入下一 Gate。也不得追加 `list_sessions → ps/status/health → log` 形成等待链。下一次用户 continuation 从已记录 authority 恢复，不重启任务。

## npm publish / release — absolute non-blocking

Use the dedicated model-facing action where available. Supply intent once; the action
starts a detached worker and promptly returns a durable receipt. The model does not
compose release commands, track PID/session/log, poll, or synchronously wait.

`RUNNING` → safe independent work or return control → later read the same durable status.
`PASS` → follow the owner's next action. `BLOCKED` → resolve the named prerequisite.
`UNKNOWN` → reconcile exact publication authority before explicit retry. `FAIL` → repair
the named gate/automation failure. Process/log inspection is automation fault diagnosis only.

Exact Registry version remains publication authority; a timeout never proves absence.
Never publish temporary versions to test release automation. Publish occurs only in an
authorized delivery phase after required gates. Project-specific commands belong to
project Skills and the release owner, not this shared protocol.

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
first exhaust all useful work that does not depend on this result
→ replan once for additional gate-safe work
→ read DURABLE_RECEIPT
   → terminal: consume result, do not rerun
   → nonterminal: replan/continue useful work
   → inspect PID/session only after work exhaustion and only if receipt cannot close the decision
```

已经记录 `passed=true` 的 verification command 不重复执行。只有新的失败证据或未完成 checkpoint 才允许 targeted recovery。

runner 只有在 `BUNDLE_READY` 且完整 envelope 已准备好时才能启动；不要故意把 `chat-local>` 等待态跨 turn 留给下一 Chat。

## Output density

PASS 只返回 concise terminal summary；FAIL 返回最小充分 failing proof/path/stack/stderr。Runtime mismatch 查事实 owner，不回源码猜运行态。
