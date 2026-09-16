# ProFlow｜从 UNCERTAIN 到 Reality Reconciliation

> 状态：ACTIVE_RESEARCH / STRONG_EVIDENCE
> 主题：ProFlow 如何从 Phase 2 Browser 的“结果不确定”，逐步形成跨 Execution、Agent、Browser、Release 的 `UNKNOWN → authority readback → reconciliation → no blind retry` 现实一致性原则。
> 边界：这不是把所有错误都叫 UNKNOWN；只有副作用已经可能发生、但当前证据不足以判定最终现实的场景才进入这一状态。

## 1. 起点是一个非常具体的事故类型

Phase 2 的 Browser/Task 链路已经遇到：动作可能真实发生，但响应、页面、Controller continuation 或 transport 在后续阶段失败。

如果系统简单执行：

```text
request error
→ mark FAILED
→ retry
```

就可能把“响应丢了”误判成“Effect 没发生”，制造重复消息、重复 Browser 操作或重复外部资源。

## 2. Phase 2 先用 `UNCERTAIN` 承认“系统不知道”

Git 时间线显示这不是 Phase 3 才发明：

```text
08-04  Phase 2 validation plan 已有 UNCERTAIN
08-06  c3ea9bf safe recovery + uncertain reporting
08-06  1a7244a durable receipts + recovery
08-07  f45e7ce Browser lifecycle / exactly-once recovery
```

关键变化是：系统不再强迫每个异常落到 FAILED/SUCCEEDED 二选一。**不知道，是一种比伪造确定性更安全的状态。**

## 3. Phase 3 把它正式化成 Effect State

2026-08-11 Execution Domain 冻结 `Result / Evidence / UNKNOWN_SIDE_EFFECT / Recovery`，并明确把“业务结果”和“现实副作用是否发生”拆开。

当前正式 Effect 语义至少是：

```text
APPLIED
NOT_APPLIED
UNKNOWN
```

只有能证明现实 postcondition，才有资格从 UNKNOWN 收敛。

## 4. Runtime 的关键动作不是 retry，而是 `reconcile(request, precondition)`

当前 Execution 在 Effect 开始前持久化 intent/precondition；如果 `sideEffectState=STARTED` 后异常或 restart，重新进入时先调用具体 executor 的 reconciliation。

```text
现实证据明确已发生     → APPLIED
现实证据明确未发生     → NOT_APPLIED
无法可靠证明           → UNKNOWN
```

UNKNOWN 默认 `retryable=false`。因为“不能证明发生”与“证明没有发生”完全不是一回事。

## 5. Local Effect 用不同 postcondition 证明不同现实

当前 local executor 会针对 file.write、git.commit、package install、managed process 等分别读取现实：文件 hash、Git index/commit、package manifest、process registry/identity。

如果进程可能已经 spawn 但 durable registry 缺失，代码明确拒绝返回 NOT_APPLIED；那会诱导下一次盲目 start。没有证据时宁可 UNKNOWN。

## 6. Browser 把“页面动作”重新翻译成 durable postcondition

Browser 只有在能重新观察到稳定事实时才收敛：

```text
worker.wake / collaboration.deliver / browser.submit
→ message fingerprint / stable Conversation evidence

worker.create
→ Task binding + 唯一匹配 Conversation candidate

browser.navigate
→ exact expected URL
```

普通 click/input/upload 缺少足够 durable postcondition；restart 后不能从“Tab 还存在”推出 effect 已完成，因此保持 UNKNOWN。

这就是为什么 **event dispatched != mutation completed**，也为什么 Browser 不拥有最终业务 Truth。

## 7. Agent Collaboration 不把 UNKNOWN 翻译成“再发一次”

Agent Message 的逻辑 truth 与 Browser physical delivery 分开。Execution 返回 UNKNOWN 时，Message 保持 durable PENDING，并记录 execution/evidence/error；Carrier 后续看到 UNKNOWN 不再次触发物理投递。

现实是否已送达，必须先由 Execution/Browser reconciliation 解决。

这避免了最危险的一类 exactly-once 幻觉：逻辑层为了追求“最终成功”，在不知道上一笔是否送达时再次发送。

## 8. Task 也拒绝吸收别人的 UNKNOWN

Task Domain 明确区分：

```text
业务 workflow WAITING / FAILED
!=
Execution UNKNOWN_SIDE_EFFECT
```

技术链路的不确定性留在它所属的 Owner；Task Observer 等待现实收敛。只有业务 Worker 真正确认 workflow blocker，才通过正式 Task transition 进入 WAITING/FAILED。

## 9. Release 把同一原则扩展到 npm Registry

发布不是业务 Execution，却面临相同问题：`pnpm publish` timeout/non-zero 时，版本可能已经真正写入 Registry。

因此 canonical release 不盲目 republish：

```text
publish command UNKNOWN / FAIL
→ exact Registry readback
→ version exists      → 接受 APPLIED reality
→ version still absent → 按明确 MISSING 处理
→ Registry query UNKNOWN → STOP
```

不可变 npm version 让 no-blind-retry 的价值尤其明显。

## 10. Custom GPT `LIVE_CREATED` 是同一原则的另一种形态

远端 GPT 已真实创建但后续 validation 失败时，不能 rollback 本地 identity 再 create。Recovery 必须先保存已经成立的 external reality，再重试只读 validation。

所以 UNKNOWN/Reconciliation 不只是一个 Execution enum，而是一种跨外部资源的判断纪律：**mutation command 的局部结果不能覆盖 external authority。**

## 11. 最终形成的是一条 Authority Ladder

```text
Command / transport result
→ 只能证明调用链局部发生了什么

Durable precondition / intent
→ 证明我们原本准备做什么

External / owner readback
→ 证明现实现在是什么

Reconciliation
→ APPLIED / NOT_APPLIED / UNKNOWN

Owner business transition
→ 才决定 Task / Agent / Deployment 的正式状态
```

越靠前越不能越级宣布后面的 Truth。

## 12. Trade-off：系统有时会故意停在“不知道”

严格 UNKNOWN 会让恢复更慢，也需要为不同 capability 编写可验证 postcondition、Evidence 与 reconciliation adapter；有些场景最终仍要人工观察。

但这换来的是：不会为了“自动恢复成功率”制造重复不可逆 Effect，也不会让技术异常污染业务状态。

## 13. 和 2B Durable Effect 的边界

2B 解释当前 Execution 实现如何 persist-before-effect、Approval、reconcile；本专题解释的是**这套语义为什么从真实事故里形成，并如何跨 Browser / Agent / Release / SaaS Resource 成为项目级现实一致性原则**。

所以它值得作为一级演化轴，而 2B 继续作为技术证据层。

## 14. 求职可讲的核心

可以讲：从 Phase 2 Browser uncertain delivery/recovery 事故出发，把“不确定现实”建模成一等状态；Phase 3 进一步将 Effect 收敛为 APPLIED/NOT_APPLIED/UNKNOWN，并基于 capability-specific postcondition 做 reality reconciliation，原则继续复用到 Agent collaboration、npm publish 与 Custom GPT external resource recovery。

不能讲：实现了通用分布式事务或严格 exactly-once 外部系统；现实不可观测时系统仍会 UNKNOWN/STOP/Human。

最稳定的两句总结：

> **A failed command is not proof that an effect did not happen.**

> **If reality cannot be proven, preserve uncertainty before retrying mutation.**
