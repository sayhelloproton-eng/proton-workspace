# 13｜Browser 自动化：从万能 Host 到双平面 Reality Adapter

> 状态：`ACTIVE_RESEARCH / STRONG_EVIDENCE`
> 主题：ProFlow 如何在产品 Browser Runtime 与研发验收 Harness 两条线上，逐步把 Browser 从“万能执行宿主”收缩为受边界约束的 Reality Adapter。
> 边界：本文不是 Playwright/Chrome 自动化教程，也不把浏览器扩展、Playwright 或 macOS AX 等第三方/系统机制归为个人实现。

## 1. 为什么 Agent 系统一开始绕不开 Browser

Custom GPT / ChatGPT 页面存在一类 API 很难替代的真实状态：

```text
Conversation 是否真的存在
页面当前是否 busy / idle
消息是否真的进入 composer / conversation
Action Allow / Deny 是否正在等待真人
GPT Builder / Publish UI 当前是什么状态
Chrome Extension 是否真实加载并运行
```

所以 Browser 从一开始就不是装饰性 UI 自动化，而是系统接触 SaaS Reality 的必要边界。

## 2. Phase 2 的 Browser Host 证明了能力，也暴露了错误的职责组合

Phase 2 已经真实跑通过 Browser Observe、Dispatch、Approval、Delivery、Controller continuation 等链路。

但为了让这条链工作，Browser Host 逐渐同时承担：

```text
heartbeat / binding / polling
observation / scrolling
execution
approval waiting
human-control detection
response waiting
controller wake
journal / recovery
```

到 2026-08-10，项目自己的复盘已经把核心问题定性为：

> Observation、Execution、Approval waiting、Response lifecycle、Human interaction、Continuation 被耦合在同一个 Browser command 生命周期里。

这不是“selector 不够稳”，而是生命周期 Ownership 错了。

## 3. `OBSERVE != MUTATE` 来自真实页面反馈环

Phase 2 的 Observation 曾为了“跟上最新消息”主动滚动页面。

长 Conversation 增长后，这种行为产生反馈环：

```text
observe
→ scroll / viewport 改变
→ 页面状态变化
→ user_reviewing / precondition 判断变化
→ 下一次 observe 再改变页面
```

因此正式经验被冻结为：Observation 必须纯读；scroll、focus、click、composer write、reveal 都是显式 Effect 或执行内部的局部动作。

这条原则后来也进入研发自动化：先 snapshot / screenshot 看清 Reality，再决定动作，不能为了“观察方便”顺手改变被测页面。

## 4. Browser Effect 与后续 AI 生命周期必须拆开

另一个真实事故是：Browser message 已经完成 Delivery，但 Browser Host 继续等待 Controller response；后续 ChatGPT Action Allow / generation 变化又把原 Browser Work 反向判 FAILED。

这逼出了明确的不可逆边界：

```text
Browser submit
→ Delivery confirmed
→ Browser Effect SUCCEEDED
→ END

Controller continuation
→ 独立成功 / 失败 / 阻塞
```

后续模型 response 不能改写已经发生的页面副作用。

所以 Browser 只证明自己的物理 Effect；业务继续走不走、Task 是否完成，由各自 Owner 决定。

## 5. Browser Host 不应该成为隐藏 Workflow Engine

Phase 2 的正式结论直接写下了这条原则。

理想 Browser Executor 只有一条短链：

```text
receive command
→ validate target / authorization
→ observe precondition
→ execute exactly one browser capability
→ confirm effect
→ report
→ END
```

Task progression、Approval business wait、Continuation、Retry/Recovery policy 不应该因为 Browser “有能力做”就落进 Browser Runtime。

这和 ProFlow 后来删除重复 Authority 的其它案例一致：**技术能力不构成业务 Ownership。**

## 6. 2026-08-15：Universal Task Driver 被真正删除

这条设计不是停在文档里。

提交 `5278fc6 feat(browser): replace universal Task Driver with deterministic Observer/Carrier modules` 做了直接重构：

```text
删除 createExecutionBrowserTaskDriver / task-driver.ts
→ 新增 deterministic Task Observer
→ 新增 low-priority read-only System Observer
→ 新增 Carrier Controller
→ Platform Host 删除 execution-runtime:task-driver compatibility surface
```

旧 Task Driver 会读取 Role、启动 Node、发 `worker.wake`、承担 Task progression；新 Task Observer 只读取 `getTaskDriveProjection()`，在 binding/READY 事实满足时请求最小 WAKE。

真正的 Worker 被唤醒后，仍要通过 Task Owner 正式接受工作。Browser 不替 Task Owner 推进业务状态。

## 7. Business Identity 与 Browser Locator 被故意分离

当前 Browser Carrier 使用：

```text
stable: workerRef / conversationLocator
transient: tabId / windowId / contentInstanceId
```

也就是说，Tab 不是 Worker 的业务身份。

页面刷新、Extension reload、Chrome/Playwright 重连都可能改变 transient locator，但不能因此创建第二个 Worker Conversation。

这也是为什么当前 Real-3 明确要求纳管 `worker.create` 产生的**原始 Conversation Tab**，禁止为了自动化再打开同 URL 第二份页面：重复 Tab 会制造 Browser reality 歧义，却不会创造新的合法业务 identity。

## 8. DOM 是主执行面，Vision 是 fallback，不是反过来

当前 Extension README 明确：

```text
DOM / programmatic input = PRIMARY
screenshot → Vision      = FALLBACK
```

原因是 Browser 自动化要尽量使用结构化、可定位、可验证的页面事实；Vision 只补动态页面或 DOM 不足的现实缺口。

同样，真实 Browser write 继续复用 Execution 的 durable semantics：Effect 不确定时进入 UNKNOWN/reconciliation，不能因为页面操作“看起来可能没成功”就盲目 replay。

所以 Browser Reality 强，并不代表所有页面判断都应该视觉化。

## 9. 研发侧的第一条原则：真实 Browser 是 Acceptance，不是主要 Debugger

Phase 2 收口已经明确要求 Phase 3 加强 deterministic state-machine、fake clock、approval timing、crash/replay、delivery boundary 等自动测试，让真实 Chrome 只验证最终能力和少量不可替代的现实约束。

这条原则后来没有被 Playwright 推翻，而是被强化：

```text
先在 Source / Contract / deterministic tests 收窄不确定性
→ 再进入 Browser Reality
→ Browser 只回答“真实页面现在到底怎样”
```

如果一开始就用真实 Chrome 找所有逻辑 bug，页面状态、焦点、网络和外部平台变化会把领域问题与 Harness 问题混在一起。

## 10. Playwright 进入以后，Browser 控制仍然不是“一把梭”

当前真实自动化被拆成两个控制平面：

```text
Playwright Chrome
→ 普通 Web / ChatGPT Conversation / 可 debugger attach 页面
→ DOM / Network / page screenshot authority

macOS AX + system screenshot
→ chrome://extensions / toolbar / Load unpacked / system picker
→ 跨扩展 chrome-extension:// 等不可 attach 但真人可见页面
```

普通 Web 一旦可由 Playwright attach，就禁止退回 AX；AX 只处理 Chrome privileged / Extension security boundary。

这不是工具偏好，而是把每种 Reality 交给真正有 authority 的观察面。

## 11. “Tab 在组里”不等于“Playwright 已经控制页面”

2026-09-03 的真实测试又打破了一个直觉。

另一个扩展的 `chrome-extension://...` Tab 可以被加入 Playwright controlled group，甚至出现在 connected tab ID 中；但真正 `chrome.debugger.attach` 时 Chrome 会拒绝：

```text
Cannot access a chrome-extension:// URL of different extension
```

因此至少要分三层：

```text
Tab group membership
→ debugger attach
→ snapshot / screenshot / DOM 实际可读
```

只有后两层真正成立，才能说 Playwright 拥有页面控制 authority。**Visible / grouped does not imply controllable.**

## 12. Browser Effect 的最终真值来自 reconciliation，不来自“事件发出”

当前 Browser executor 对真实写操作继续服从 Execution 的 durable Effect 语义。

如果 Effect 已经开始、随后进程/Bridge/页面响应丢失，恢复时不会因为“命令失败”就直接重发，而是根据持久化 precondition 重新观察现实。

其中 `worker.create / worker.wake / collaboration.deliver / browser.submit` 都有可验证的 durable postcondition：稳定 Worker/Conversation、目标 message fingerprint、真实页面内容与 Owner binding 可以共同证明 APPLIED / NOT_APPLIED。

`browser.navigate` 只有重新观察到 exact expected URL 才能证明 APPLIED。

而 click / input / upload 等没有足够 durable postcondition 的动作，在 restart 后即使原 Tab 还存在，也不能推出 Effect 已发生；当前实现明确返回 `UNKNOWN`。

因此 Browser Effect 的恢复原则是：**能证明才收敛；不能证明就保留 UNKNOWN。**

## 13. Harness 自己也可能制造“假的产品问题”

2026-09-01 的 FULL FRESH 暴露了一类完全不同的失败：Browser Extension 产品功能最终能通过，但测试机器人自己在安装/卸载和 CLI TTY 驱动上反复犯错。

真实问题包括：临时重写 AX helper、错误定位 Remove、系统 picker 时序不稳定、按键事件发出后直接判完成、Clack 选项重绘时误切默认值。

这些错误把分钟级恢复时间混进最终总耗时，因此该轮功能 Evidence 保留，但总性能计时被明确判为 `HARNESS_OVERHEAD / INVALID_FOR_HAPPY_PATH_BASELINE`。

项目因此冻结唯一 UI helper 和固定状态机：

```text
locate
→ mutate
→ observe visible state change
→ verify
```

`AXPress=success`、键盘事件已发送、脚本 exit 0 都只代表输入动作发生，不代表 UI mutation 已完成。

## 14. Playwright controlled group 也是运行态，不是业务 Owner

当前 Real-3 固定把 `ProFlow Tasks + Product/Dev/Test-Ops 三个真实 Worker Conversation` 放进同一个 Playwright controlled group。

但这个 group 只是自动化控制上下文：Chrome、Playwright Extension 或本机 runtime 重启后，它可能消失，而真实业务 Tab 仍然存在。

正确恢复不是重新创建 Task/Conversation，而是：

```text
确认原始业务 Tab 仍在
→ 恢复 Playwright connection
→ 把原始 Tab 重新纳入 controlled group
→ browser_tabs + snapshot/screenshot 证明控制权
→ 从原 checkpoint 继续
```

这再次说明：Browser 自动化状态不能升级成 Task/Worker truth。**Control context is recoverable runtime state, not durable business identity.**

## 15. 第 13 条与“产品入口演进”不是同一件事

第 09 条回答的是：**Task / Approval 这种产品控制面应该放在哪里，才能最符合 Authority 与可观察性。**

第 13 条回答的是：**无论产品入口在哪里，Browser 本身究竟能拥有什么、能证明什么、什么时候必须退回 Owner authority。**

两条轴的交点是当前 `/tasks`：它迁移到 loopback Web surface，是因为普通 Web 更容易进入 Playwright Reality Plane；但这个页面并没有因此获得 Task/Approval ownership，它仍只是调用正式 Public API。

所以不能把这两条合并成“把 Side Panel 改成网页”：

```text
Product Surface axis
= product control should live where humans and automation can observe it

Browser Reality axis
= browser control/observation must never become durable business truth
```

前者解决产品入口，后者解决 Reality Adapter 的责任边界。

## 16. 最终形成的 Browser Authority Ladder

整个演进可以压缩成一条判断链：

```text
1. Product / Task / Agent Owner fact
   → durable business truth

2. Execution intent / precondition / evidence
   → real-world effect truth

3. Browser stable carrier identity
   → roleRef + workerRef + conversationLocator

4. Browser control plane
   → Playwright attach / AX visible control

5. Transient locator
   → tabId / windowId / contentInstanceId / focus
```

越往下越接近瞬时 UI reality，也越不能反向覆盖上层 durable truth。

真正稳定的原则不是“Browser 很重要”或“Browser 不可信”，而是：**Browser owns irreducible reality, not workflow authority.**

## 17. Trade-off：边界更清楚，但自动化系统本身更复杂

把 Browser 削薄并不意味着 Browser 工程更简单。

系统仍要维护 stable Conversation identity、content session freshness、Bridge heartbeat、typed command、Playwright controlled group、privileged UI helper、截图/DOM Evidence、restart recovery 与 UNKNOWN reconciliation。

双平面自动化还要求明确切换规则：普通 Web 优先 Playwright，Chrome privileged UI 才进入 AX；动作后必须回到可观察面，再由 Owner readback确认业务结果。

代价是 Harness、Runbook 和恢复路径明显变多；收益是领域状态不会被 UI transient state 污染，测试失败也更容易区分产品问题、Browser Reality 问题和 Harness 自身问题。

这是典型的“减少业务 Authority，增加边界治理”的工程取舍。

## 18. Resume / Interview 边界

可以安全主张：

- 用真实 Chrome 事故识别 Browser lifecycle ownership 错误，并推动 Universal Task Driver → deterministic Observer / Carrier；
- 将 Observation、Effect、Approval wait、Continuation 与业务状态拆开，冻结 `OBSERVE != MUTATE`、Delivery terminal boundary、Wake notification 等原则；
- 建立 `workerRef/conversationLocator` 与 tab/content locator 的稳定身份分层；
- 设计 Playwright 普通 Web + macOS AX privileged UI 的双平面真实 Browser 验收路径；
- 把 UI automation 固定为 `locate → mutate → observe → verify`，并显式隔离 `HARNESS_OVERHEAD`；
- 对 Browser side effect 使用 durable precondition + reality reconciliation，无法证明时保留 UNKNOWN 而不盲重放。

必须保持边界：Playwright、Chrome debugger、macOS AX/Swift 都是第三方/系统能力；不把浏览器自动化包装成自研通用 RPA 平台；不把当前 dirty `/tasks` 迁移写成已经 Final/Frozen；也不能因为 Browser Harness 强就声称 Real-3 已通过。

最适合总结这条经历的是：

> **Browser owns irreducible reality, not workflow authority.**

> **Visible does not imply controllable; controllable does not imply business identity.**
