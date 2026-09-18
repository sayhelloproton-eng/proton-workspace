# Agent 怎样进入真实世界工作

Agent 真正进入工程系统以后，最重要的变化不是“多了几个 Tool”，而是它开始面对一个会变化、会失败、会产生副作用的真实世界。研究网页、浏览器页面、代码仓库看起来都属于“外部环境”，但它们能提供的 Observation（观察）、允许的 Action（动作）和完成证据完全不同。

因此这篇不按产品名分类 Agent，而是回答三个问题：**Agent 在什么环境里工作，它怎样观察和行动，它凭什么知道现实真的发生了预期变化。**

## 先把 Interaction、Domain、Environment 分开

“Chat Agent、Browser Agent、Coding Agent、招聘 Agent”经常被放进同一个列表，实际上描述的是不同维度。

| 维度 | 回答的问题 | 例子 |
|---|---|---|
| Interaction（交互形态） | 人怎样与系统交互 | Chat、Voice、IDE、GUI |
| Domain（业务领域） | Agent 对什么专业结果负责 | Recruiting、Finance、Software Engineering |
| Environment（执行环境） | Agent 在什么世界中观察和行动 | Web、Browser、Repository、Shell、Email、Database |

一个招聘 Agent 可以通过 Chat 与人交流，却主要在 Browser、Email 和 Database 中工作；一个开发 Agent 可以从 IDE 进入，但实际操作 Repository、Shell、Browser 和 CI。

这个区分很重要，因为**环境决定可见事实、动作风险、反馈密度和验证方式。**

## 研究环境：目标不是“找到网页”，而是建立证据链

Deep Research（深度研究）和普通 Search 最大区别，不是搜索次数更多，而是后续路线会被新证据改变。

一个研究任务真正维护的是：

~~~text
Research Goal
↓
subquestions / claims
↓
search / read sources
↓
evidence coverage + conflicts + gaps
↓
replan if needed
↓
stopping criteria
↓
report with provenance / citations
~~~

Search 负责发现候选资料；RAG 负责为一次模型调用检索和装配知识；Deep Research 则维护整个研究 Goal 下的 Claim、Evidence Gap、Conflict 和停止条件。

所以：

~~~text
Search ≠ RAG ≠ Deep Research
~~~

## 研究计划应该围绕“要证明什么”，不是“准备搜几次”

Research Plan（研究计划）至少要表达：

- 研究目标；
- 需要回答的子问题；
- 准备对外表达的关键 Claim（主张）；
- 什么类型的 Source 优先；
- Freshness 要求；
- 哪些 Claim 需要第一手证据；
- 时间 / Token / 搜索预算；
- 什么时候停止。

Plan 是可修订假设，不是固定 Workflow。找到新证据以后，Agent 可以缩小范围、换来源、补反例或降低结论强度。

## Knowledge Gap 才是研究 Loop 的驱动力

“已经读了 30 个网页”不是高价值状态。真正有用的是：

~~~text
已支持的 claims
+ supporting evidence
+ unresolved conflicts
+ missing questions
→ next research action
~~~

Knowledge Gap（知识缺口）表示为了回答最终问题仍缺什么事实、来源或反例。

它让 Research Agent 不再机械重复搜索，而是根据缺口改变路线。

## Claim → Evidence → Source → Citation 是研究的最小证据链

Claim 是最终准备表达的判断；Evidence 是支持或反驳它的可检查材料；Source 是 Evidence 来自的原始文档、规范、论文、数据库或官方页面；Citation（引用）让读者能回到 Source。

~~~text
Claim
↓ supported by
Evidence
↓ comes from
Source
↓ reachable through
Citation / Provenance
~~~

多个网页转载同一条官方消息，并不等于多份独立 Evidence。来源数量不能替代来源独立性和 Authority。

## 来源等级不能靠“搜到几个结果”决定

Research Agent 还需要 Source Authority（来源权威性：某个来源对某类事实拥有多强的直接证明能力）。

一个常见优先顺序是：

~~~text
primary / official source
→ direct measurement / current owner
→ high-quality secondary analysis
→ community discussion
→ unsourced aggregation
~~~

但不同 Claim 的 Owner 不同：公司 API 行为优先看官方文档和真实请求；代码当前实现优先看仓库；公众争议问题可能需要多方独立来源。

“第一手”也不是自动正确，只是 Evidence 距离原始事实更近。

## Evidence Conflict 不能靠多数票平均掉

两个来源冲突时，需要比较：

- publication / fact date；
- version；
- scope；
- definition；
- source authority；
- 是否来自同一原始出处；
- 能否获得 Primary Source。

如果冲突仍然无法消除，成熟研究可以明确保留 Uncertainty，而不是为了“给答案”硬压成一个确定结论。

## Research 的停止条件同样重要

开放 Web 永远还能再搜一页。没有 Stopping Criteria（停止条件），Research Agent 很容易持续消耗资源却不提高结论质量。

至少检查：

~~~text
Coverage
Evidence quality
Conflict resolution
Freshness
Budget
Marginal utility
~~~

关键 Claim 已有足够可靠证据，重大冲突已解释或明确保留为不确定性，继续搜索不再显著改变结论时，就应该停止。

## Browser Environment：一次点击不等于业务完成

Browser Agent 面对的是不断变化的远端应用。它可能通过多种 Observation Channel 看页面：

- DOM（文档对象模型）；
- Accessibility Tree（无障碍语义树）；
- Screenshot（截图）；
- URL；
- Network response；
- 应用状态或后端 API。

这些信号各有盲区。DOM 有结构但可能不能表达所有视觉状态；Screenshot 接近用户视角却缺少精确语义；URL 正确也不证明业务对象已保存。

因此 Browser Action 必须和 Readback（回读）成对出现。

~~~text
observe
→ click / type / navigate / upload
→ observe again
→ verify target business state
~~~

按钮被点击、Toast 出现、HTTP 返回 200，都只是局部 Observation，不是最终 Goal Success。

## Screenshot 是“眼睛”，但不是唯一 Truth

截图最接近用户真正看到的页面，因此特别适合回答：

- 页面是否加载；
- 弹窗是否遮挡；
- 按钮是否出现；
- 用户可见状态是否变化。

但截图无法可靠回答所有结构和业务问题。

所以 Browser Acceptance 常常需要组合：

~~~text
Screenshot / visual
+ DOM / accessibility
+ URL
+ business readback
~~~

“截图等价眼睛”意味着先看现实，不意味着“只看截图”。

## Browser Session Identity 必须和 Task 绑定清楚

浏览器里的 Tab、Profile、Cookie、Conversation 都带 Session State。

如果自动化拿错 Tab，操作可能完全正确却发生在错误页面。

因此真实 Browser Harness 至少要知道：

~~~text
target task
browser profile / session
target tab / page identity
current URL / app identity
authenticated user / scope
~~~

共享 Browser 资源还需要 Owner / Lease。不能假设上一轮全局 page 变量永远还是当前目标。

## 结构化接口通常优于纯视觉，但真实世界不能假设永远有 API

如果同一动作同时有稳定 API、DOM 和纯视觉 Computer Use（计算机操作）三种入口，通常优先选择更结构化、可验证、可恢复的接口。

原因不是“视觉模型不够强”，而是结构化接口能提供更低歧义的参数和结果。

但很多真实任务只有 GUI，或者 API 不暴露用户真正能完成的流程。这时 Computer Use 就不是退而求其次的玩具，而是必要能力。

正确原则是：

> **优先使用反馈更清楚、动作更可验证的接口；没有结构化入口时再让视觉 Agent 进入界面，并提高验证和风险门槛。**

## Coding Environment：最宝贵的是高密度机器反馈

Coding Agent 工作在 Repository、Filesystem、Shell、Compiler、Test、Build 和 Git 组成的环境里。

它比纯浏览器环境更容易形成可靠闭环，因为很多结果可以机械验证：

~~~text
source / repo
→ edit
→ diff
→ typecheck / test / build
→ git status / artifact
~~~

但代码环境同样存在现实边界：

- HEAD 只是 Git 基线，不包含本地 WIP；
- exit=0 只说明进程成功退出，不证明业务行为正确；
- Test 通过只证明覆盖范围内行为；
- 工作树里可能有用户未提交改动；
- 网络和依赖状态会漂移；
- Commit 存在不代表 Release 已部署。

真正可靠的 Coding Agent 需要同时观察 Repo Truth、Diff、Test 和目标环境结果。

## 工作区漂移必须在真正写入前被发现

Agent 可能先基于源码 A 做分析，几分钟后真正 Apply 时用户或另一个 Agent 已经把文件改成 B。

Source Drift（源漂移：决策依据的当前文件在执行前已经变化）要求系统：

~~~text
read / snapshot
→ decide
→ fingerprint / version check
→ apply only if still same
~~~

如果不一致就 Fail Closed，重新获取事实。

这比“先覆盖再看 Git diff”安全得多，因为用户 WIP 可能已经被不可逆覆盖。

## Environment Contract：不同环境可以共享同一套责任语言

Browser 和 Coding Tool 完全不同，但 Runtime 可以要求一个共同 Environment Contract（环境合同）：

~~~text
observation schema
action schema
permission / approval
effect semantics
verification method
timeout / unknown behavior
recovery / rollback
artifact / evidence references
~~~

这样 Runtime 不必理解每一个 Browser Driver 或 IDE 产品，只依赖稳定的 Observation / Action / Evidence 合同。

这里不重复解释 UNKNOWN、Reconciliation 和 Effect Commit；这些恢复语义由第 09 篇负责。

## Workspace 告诉 Agent 在哪工作，Sandbox 决定它能影响多远

Workspace 是任务工作范围，例如一个 Repo、一个 worktree、一个 Browser Profile。

Sandbox（沙箱）则负责限制 Blast Radius（影响半径）：一次错误最多能改到哪里。

~~~text
Task workspace
↓
execution sandbox
├─ readable paths
├─ writable paths
├─ allowed processes
├─ network destinations
└─ scoped credentials
~~~

Agent 需要读整个仓库，不代表能写整个磁盘；需要打开生产页面，不代表能执行删除。

工作范围和影响范围不是同一边界。

## 文件、进程、网络、凭证都属于 Sandbox

安全执行不是“限制文件写入”这么简单。

文件边界要区分 Read / Write / Delete。

进程边界要考虑 Shell 会继续启动脚本、包管理器和子进程，环境变量也可能携带 Secret。

网络边界要明确允许访问哪些目标，避免一个本地错误变成数据外泄或生产副作用。

Credential（凭证）最好是当前 Task 所需的 Scoped Credential，而不是让模型控制的进程直接获得长期高权限 Secret。

必要时可让一个受信任的 Privileged Executor 代替模型进程执行高权动作。

## Preview / Dry-run 能降低高风险动作的不确定性

对某些操作，可以在真正 Effect 前生成 Preview（预览：展示即将发生的变化）或 Dry-run（试运行：执行验证路径但不提交真实副作用）。

例如：

~~~text
delete 100 objects
→ preview exact object set
→ policy / human review
→ execute

deploy
→ build + plan
→ verify target / version
→ publish
~~~

Dry-run 不是所有系统都能提供，也不能证明最终执行一定成功，但它能把一部分未知从 Effect Boundary 前暴露出来。

## 越出当前边界时，正确行为是停下来升级权限

当任务从只读变写入、从本地访问变公网、从普通编辑变发布 / 付款 / 删除时，系统应该出现明确 Gate：

~~~text
proposed action
↓
inside current boundary?
├─ yes → execute
└─ no  → deny / request approval / narrower privileged executor
~~~

不要让模型因为“我判断这次安全”就临时扩大 Sandbox。

## 环境里的文字仍然只是 Data

Browser 页面、README、日志、Issue、Tool Result 里都可能出现诱导指令。

它们是 Data Plane，不能仅凭自然语言内容获得更高 Instruction Authority。

因此真实环境越强，Prompt Injection 风险越需要由 Instruction hierarchy、Permission、Sandbox 和 Effect Gate 一起约束，而不是只告诉模型“注意安全”。

## Environment Drift 不只有源码变化

浏览器、服务和远端系统也会漂移：

- Session 过期；
- 登录身份变化；
- 页面版本变化；
- API schema 更新；
- 依赖服务重启；
- Browser Extension reload；
- 设备离线；
- Credential 失效。

因此恢复时先问：

~~~text
current environment still same?
↓ no
re-observe / re-auth / rebind / replan
↓
then continue
~~~

不要用昨天的 Observation 直接操作今天的环境。

## Feedback Density 决定自治边界

一个环境如果每一步都能快速返回精确、机器可验证的信号，Agent 更容易纠错。

代码环境通常 Feedback Density 高；视觉 GUI 通常更低；Research 环境的难点则是 Source Authority 和 Evidence Conflict。

自治程度不应按“模型品牌”决定，而应该结合：

~~~text
observation reliability
+ action reversibility
+ verification strength
+ blast radius
+ recovery capability
~~~

模型更聪明只改变“能不能做”，不自动改变“应该被允许做多少”。

## 三类环境的完成证据不同

| 环境 | 不能只看什么 | 更强的完成证据 |
|---|---|---|
| Research | 搜索次数 / 文章长度 | Claim coverage、来源质量、冲突处理、可回读 Citation |
| Browser | click success / toast / screenshot | 目标对象、服务端状态、确认号、真实 readback |
| Coding | edit success / exit code | Diff、targeted tests、build、Git / runtime / external outcome |

这一篇只回答“不同 Environment 怎样产生 Observation、Action 和可验证回读”；下一篇会把这些分散 Evidence 收拢成系统性的 Eval。

## Browser 和 Coding 环境最终差在反馈与验证

Browser 与 Coding 都遵循 Observe–Decide–Act Loop，但 Environment Contract 和 Feedback Density 明显不同。

Coding 环境拥有 Repo、Diff、Compiler、Test、Build、Git 等高密度机器反馈，可重复性和局部回滚通常更强；Browser 面对远端会话和不断变化的 GUI，结构化信号与可逆性更弱，因此更依赖 DOM / Visual 双观察、Session Identity、业务状态 Readback、Sandbox 和高风险 Effect Gate。

Browser 自动化容易误操作，常常不是模型“看不懂按钮”，而是 Target Tab、登录身份、页面版本或业务状态已经漂移。Screenshot 能提供用户可见现实，DOM / Accessibility 能提供结构，业务 Readback 才能进一步确认真实对象状态。

无论哪类环境，最重要的边界都相同：

> **Action Success 不等于 Goal Success。**

下一篇继续回答：**怎样把 Trace、Evidence、现实 Outcome 和成本放到同一套 Eval 里，证明 Agent 不只是“能运行”，而是真的做对并值得。**
