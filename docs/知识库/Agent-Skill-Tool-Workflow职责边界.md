# Agent、Skill、Tool、Script 与 Workflow：怎样把判断、方法、能力和状态分开

Agent 工程里有一类混乱特别常见：同一段“让 AI 做事”的逻辑，既可以写进 Prompt，也可以包装成 Skill，还可以做成 Tool、Script、Workflow，甚至有人会直接再建一个 Agent。

这些东西都能影响 Agent 的行为，但它们并不负责同一件事。混在一起以后，最直接的后果不是“概念不优雅”，而是系统开始难触发、难测试、难授权、难恢复：稳定规则藏在 Prompt 里，确定性步骤每次让模型重新判断，长期状态偷偷寄存在 Skill 文本里，Tool 一接上就默认获得过大的权限。

我现在更愿意用一条很朴素的责任线来拆它们：

```text
Agent      → 现在该怎么判断？
Skill      → 这类问题通常应该怎么做？
Tool       → 系统能调用什么真实能力？
Script     → 已经确定的步骤怎样稳定执行？
Workflow   → 一个长期任务现在做到哪里、下一步怎样继续？
Permission → 当前主体到底能做什么？
Policy     → 在什么条件下允许、拒绝或要求审批？
Knowledge  → 做判断时依据哪些稳定事实和方法？
```

这篇不再讨论“什么时候应该从 Chat 升级到 Agent、Workflow 或 Platform”，那已经在 [《Agent 工程复杂度与边界》](./Agent工程复杂度与边界.md) 里展开。这里假设我们已经决定要使用 Agent，只回答另一个更具体的问题：**一项能力到底应该放在哪个对象里，怎样避免把所有东西最后都塞回一份巨大 Prompt。**

---

## 先从一个真实场景看：本机工程任务为什么不能只写一份 Prompt

假设我要让 ChatGPT 在本机修改一个仓库，并且要求它：

- 先读取当前工程事实；
- 找到真正的 Owner；
- 不要边改边测；
- 多文件变更一次冻结；
- 确定性机械步骤交给 Runner；
- 长任务不要傻等；
- Timeout 后不能盲目重试；
- 最后做验证并留下证据。

最简单的做法，是把这些全写进一份超长 Prompt。

短期当然能工作，但很快会遇到几个问题。

第一，里面既有需要模型理解的工程判断，又有完全确定的机械动作。模型每轮都要重新读、重新理解，既浪费上下文，又可能执行出不同顺序。

第二，“应该怎么做”和“有没有权限做”混在一起。Prompt 可以说“不要 Push”，但它本身不能真正阻止一个高权限 Tool 执行 Push。

第三，Prompt 没有稳定生命周期。规则变化以后，很难知道哪些任务使用了哪一版方法，哪些失败应该反向修改规则。

第四，长期任务状态不应该靠 Prompt 记。任务做到哪一步、哪个动作已经发生、能不能继续重试，这些都应该是系统事实。

今天我的实际本机链路已经把这几件事拆开了：

```text
Chat / Agent
负责理解当前问题和做工程判断
        ↓
chat-local-engineering-protocol
负责“本机工程这类任务应该怎样做”
        ↓
Local Dev / CodeGraph / Repomix / Playwright
负责读取事实或执行真实动作
        ↓
Frozen Runner / Automation
负责已经确定的机械步骤
        ↓
Git / Runtime / Browser / Test
负责提供真实结果和证据
```

如果是 ProFlow 这种长期任务，还会再多一层：

```text
Task / Node / Binding / Run
负责长期状态、交接、失败和恢复
```

同一件“让 Agent 把工作做完”的事，被拆进不同 Owner 以后，系统反而更简单，因为每一层只需要回答一种问题。

---

## 先记住最重要的一张表

| 对象 | 它真正回答的问题 | 适合放什么 | 不应该拥有 |
|---|---|---|---|
| Prompt | 这一次我要告诉模型什么 | 当前目标、临时约束、当前上下文 | 长期方法真源、硬权限、长期状态 |
| Knowledge / Reference | 我们已经知道什么 | 稳定事实、解释、案例、背景 | 任务执行状态 |
| Agent | 当前下一步怎样判断 | 理解、计划、选择、Review、异常判断 | 确定性机械流程、硬安全边界 |
| Skill | 这类重复任务通常怎样做 | 方法、判断点、停止条件、资源组织 | 长期 Task State、Secret |
| Script / Automation | 已经确定的步骤怎样重复执行 | 转换、校验、批处理、固定状态机 | 开放式语义判断 |
| Tool / Adapter | 系统可以调用什么真实能力 | 文件、Shell、Browser、API、DB、外部动作 | 业务目标、角色职责 |
| Capability | 上层依赖的稳定能力语义是什么 | 与实现解耦的能力合同 | 具体 Tool 私有细节 |
| Permission | 当前主体能访问什么 | action、resource、scope、duration | 风险判断逻辑 |
| Policy | 什么条件下允许、拒绝、审批 | 风险、审批、证据和停止规则 | 真实执行 |
| Workflow / Task Control | 长期工作现在处于哪里 | 状态、版本、等待、重试、恢复、交接 | 专业判断本身 |

真正容易出问题的地方，几乎都发生在两种对象责任重叠以后。

例如：

```text
把 Script 写成 Skill
→ 已经确定的步骤每次仍让模型解释

把 Skill 写成 Prompt
→ 方法无法稳定发现、测试和复用

把 Tool 当 Skill
→ 系统只知道“能做什么”，不知道“什么时候该这样做”

把 Workflow 写进 Skill
→ 长任务状态跟着文本和 Session 漂移

把 Permission 写进 Prompt
→ 模型知道“不该做”，但系统仍然技术上允许它做
```

所以第一原则不是“选哪个流行概念”，而是先确认这段逻辑到底属于哪一种责任。

---

## Agent：把不确定环境里的下一步留给模型判断

Agent（智能体：围绕目标，根据上下文和反馈持续决定下一步的执行主体）最有价值的地方，是处理**事先不能完全写死**的问题。

例如排查一个复杂 Bug 时，下一步可能是：

- 先读源码；
- 发现结构不清，再看 CodeGraph；
- 发现真正问题在 Runtime，再查日志；
- 发现是 UI Reality，再去 Browser；
- 新证据推翻原判断，再改变修复方案。

这类路径无法提前列成一个固定 Script，因为“下一步是什么”依赖刚刚观察到的结果。

Agent 适合承担：

```text
理解目标
识别缺口
选择下一步
判断哪种证据更可信
比较多个方案
处理例外
做 Review
决定停止还是继续
```

但模型能做判断，不代表什么都应该交给它。

如果某个动作已经稳定到每次都一样，就应该继续向下沉；如果某种状态必须跨 Session 长期存在，就应该交给 Workflow / Task Owner；如果是权限边界，则必须由 Runtime 强制。

**Agent 应该拥有判断，不应该吞掉所有系统责任。**

---

## Skill：它保存的不是“能力”，而是可复用的做事方法

Skill（技能：围绕一类重复任务，封装方法、判断点、停止条件和按需资源的程序性知识）最容易和 Tool 混淆。

一个简单区别是：

```text
Tool 回答：我能做什么？
Skill 回答：遇到这类问题，我应该怎样做？
```

Local Dev 可以读文件、跑命令，这是 Tool 能力。

`chat-local-engineering-protocol` 告诉 Chat：什么时候先看 Reality，什么时候找 Owner，什么时候冻结范围，长任务怎样处理，Timeout 后怎样恢复。这是 Skill。

同样，Playwright 能截图、点击、读 DOM，这是 Tool；“真实 UI 验收时先观察哪个事实、什么时候可以操作、什么结果才算通过”属于 Acceptance Skill。

因此一个 Skill 通常同时包含三类东西：

```text
判断规则
→ 什么情况下走哪条路径

程序性方法
→ 这类任务按什么顺序推进

资源入口
→ 需要时去读哪些 Reference、调用哪些 Script / Tool
```

它不是一个新的执行器，也不应该为了“Skill 化”复制 Tool 的全部接口说明。

---

## 什么内容值得做成 Skill，什么不值得

创建 Skill 之前，我会先问七个问题：

1. 这类任务是否反复出现？
2. 是否存在稳定的方法，而不是只有一次性的答案？
3. Agent 是否仍然需要做语义判断？
4. 输入、输出和停止条件能否说清楚？
5. 是否有真实失败案例可以反过来校准方法？
6. 是否能设计正例和负例来验证触发是否正确？
7. 这套方法是否比“直接写一份文档”多出真正的执行价值？

满足多数条件，Skill 才开始值得存在。

### 只是一份稳定知识：写 Reference

例如：

- 某个系统的架构说明；
- 某个协议的概念解释；
- 一个项目的历史决策；
- 一份接口字段说明。

这些材料可能被 Skill 使用，但它们本身没有“任务触发 → 判断 → 输出”的方法过程。

### 规则完全确定：写 Script 或普通代码

例如：

- 比较 Hash；
- 校验 Schema；
- 检查路径；
- 构造固定 Manifest；
- 批量重命名；
- 判断一个枚举是否合法。

已经可以机器定义的规则，再包装成 Skill 只会重新引入不确定性。

### 任务重复，但每次都需要判断：做 Skill

例如：

- 本机工程修改；
- 技术文档写作；
- Acceptance 验收；
- 多源知识提炼；
- 故障根因分析。

这些任务有稳定方法，但不能提前知道每次应该读哪个文件、采纳哪个方案、在哪个边界停止。

### 需要长期状态：不要让 Skill 假装成 Workflow

一旦出现：

- 跨小时、跨天；
- 等待外部事件；
- Pause / Resume；
- Retry / Compensation；
- 多角色正式交接；
- 状态必须跨 Session 存在；

状态就应该进入 Workflow / Task Control。

Skill 可以告诉 Agent“怎样处理一个 WAITING Task”，但它不应该自己成为 WAITING Task 的数据库。

---

## 一个可用 Skill，至少要把触发和停止说清楚

很多所谓 Skill 其实只是一份“最佳实践文档”。真正进入 Agent 工作流以后，最先暴露的问题通常不是正文写得不够多，而是**什么时候触发不清楚**。

一个可治理 Skill 至少应该回答：

| 部分 | 必须解决的问题 |
|---|---|
| Name / Description | 什么任务应该触发，哪些相邻任务不要触发 |
| Preconditions | 开始前必须满足哪些事实、权限和状态 |
| Inputs | 最小必要输入从哪里来，哪些来源可信 |
| Workflow | 哪些步骤固定，哪些地方需要判断 |
| Outputs | 最终必须交付什么，什么算完成 |
| Stop Rules | 什么未知、风险或冲突出现时必须停止 |
| Relationships | 和相邻 Skill、Tool、Workflow 的边界在哪里 |
| Evidence | 如何证明方法真的执行正确 |

这里面我越来越重视两个东西：**非触发条件**和**停止条件**。

只有正向描述的 Skill 很容易不断扩大自己的职责：只要任务沾一点边，就觉得“也可以用我”。最后每个 Skill 都变成万能方法。

停止条件同样重要。Agent 的失败很多不是“不会继续”，而是“在缺证据时还继续”。一个成熟 Skill 应该明确告诉 Agent：什么情况不能靠猜，必须回到 Fact Owner、请求输入，或者 fail closed。

---

## Skill 的目录不是为了形式完整，而是为了按需加载

在我的当前 workspace 里，一个成熟 Skill 常见结构是：

```text
skills/<skill-name>/
├── SKILL.md
├── references/
├── scripts/
├── assets/
└── tests/
```

它们不是为了把目录做漂亮，而是承担不同信息密度。

`SKILL.md` 只应该保存完成任务必需的主方法和硬边界。

`references/` 放深层解释、低频规则、长案例和机械细节。只有真正需要时才读取。

`scripts/` 放已经确定、不需要模型重新判断的执行步骤。

`assets/` 放 Schema、模板、Fixture 或其他固定资源。

`tests/` 用来验证触发、Contract、脚本或关键行为。

这种结构实现的是 Progressive Disclosure（渐进披露：先给 Agent 最小必要信息，只有任务真正需要时才继续加载更深资源）：

```text
先知道有哪些 Skill
        ↓
任务匹配以后读 SKILL.md
        ↓
出现具体问题再读 Reference
        ↓
确定性步骤调用 Script
        ↓
真实世界动作调用 Tool
```

它对 Token 的意义非常直接：**不是每个任务都把所有规则、所有案例和所有工具文档塞进上下文。**

---

## Skill 和 Script 的分界，是“这一步还需要判断吗”

我自己的 Skill 演进里，这条边界非常重要。

早期工程规则经常全部写在 Skill 中：

```text
先做 A
再做 B
再检查 C
最后执行 D
```

如果每一步之间都需要模型根据新证据判断，这没有问题。

但当 A、B、C、D 已经长期固定，而且模型只是机械照抄时，继续保留在 Skill 正文里就是浪费。

因此现在更倾向：

```text
Skill
负责：什么时候进入这条流程、范围是什么、异常怎么判断

Automation / Runner
负责：稳定机械序列怎样一次执行完
```

本机工程的 frozen decision runner 就是这个变化的例子。

Chat 仍然负责：

- 哪些文件应该变；
- 为什么这样变；
- 验证计划是什么。

一旦内容冻结，materialize、drift gate、whole-file apply、verification 和 durable receipt 都是稳定机械步骤，不需要模型在中间反复重新进入。

这背后是一条很稳定的原则：

> **模型负责不确定判断，程序负责已经确定的动作。**

这不是把 Agent “做弱”，而是把模型的注意力留给它真正有优势的地方。

---

## Tool：能力入口越强，越不能把权限藏在说明文字里

Tool（工具：向 Agent 暴露真实数据读取或副作用操作的接口）解决的是“能不能做”。

例如：

```text
Local Dev
→ 读写文件、执行进程、读取 Git / Runtime

Playwright
→ 读取 Browser Reality、点击、输入、截图

Web Search
→ 查询外部实时信息

API Adapter
→ 调用某个业务服务
```

Tool Schema 可以约束参数，但“参数合法”不等于“业务上允许执行”。

因此只要 Tool 开始产生真实副作用，就必须把下面几件事分开：

```text
Tool
= 技术上能不能执行

Permission
= 当前主体有没有访问这个动作和资源的权限

Policy
= 当前风险、状态和业务条件下应不应该执行

Approval
= 某个高风险动作是否获得了正式授权

Sandbox / Scope
= 即使允许，最多能影响到哪里
```

Prompt 里的“请不要删除重要文件”只能影响模型判断，不能代替真正的文件范围和 OS / Runtime 边界。

---

## Capability：只有需要替换实现时，才值得从 Tool 上再抽一层

Capability（能力合同：描述系统“能完成什么”，但不绑定具体工具实现）是一个很容易提前抽象过头的概念。

例如：

```text
Browser Read
Browser Action
Repository Read
Repository Write
Knowledge Retrieve
Document Publish
```

这些可以是稳定能力语义。

实际实现则可能是：

```text
Browser Action
→ Playwright
→ Browser Extension
→ 未来另一个 Adapter
```

什么时候 Capability 值得独立存在？通常是下面至少一项已经真实发生：

- 同一能力有两个以上执行器；
- 多个产品依赖同一个能力语义；
- Permission / Policy 需要围绕能力表达，而不是绑死工具品牌；
- Tool 需要替换，但上层不应该跟着改；
- 需要独立做健康、版本或兼容性治理。

如果目前只有一个调用方、一个 Tool、没有替换需求，直接绑定具体 Adapter 往往更简单。

所以：

```text
Tool 是实现
Capability 是稳定语义
```

但 Capability 不是每个 Tool 都必须拥有的一层包装。

---

## Permission、Policy 和 Approval 也不能混成一份“安全规则”

Permission（权限）回答的是：**当前主体拥有哪些动作和资源范围。**

常见维度包括：

- action；
- resource type；
- target / path / branch；
- read / write / delete / publish；
- environment；
- duration / expiry；
- task / version；
- evidence requirement。

Policy（策略）回答的是：**在当前条件下，这个动作是否应该被允许。**

它可以依赖风险、Task State、资源类型、用户授权、证据要求等事实。

Approval（审批）则是一条具体授权事实。它不应该是永久的“以后都可以”，而应该尽量绑定：

```text
谁
+ 对哪个任务 / 版本
+ 做什么动作
+ 作用于什么目标
+ 在什么 Scope 内
+ 有效到什么时候
```

任务目标、版本或作用范围发生变化以后，旧 Approval 不应被自然语言“顺手沿用”。

这也是为什么安全规则不能只写进 Skill。Skill 可以告诉 Agent“高风险写入前应该请求审批”，但真正决定有没有批准，必须来自正式 Owner。

---

## 风险越高，越应该把自由度从模型手里拿走

不同 Tool Action 的风险并不一样。

一个实用分法是：

| 风险 | 典型动作 | 系统重点 |
|---|---|---|
| 低 | 只读查询、纯计算、静态校验 | 最小权限、记录结果 |
| 中 | 本地文件写入、受控配置修改 | 明确 Scope、验证、证据 |
| 高 | Push、外部发布、公开通知 | 明确授权、回读、回滚 |
| 极高 | 删除、支付、凭据、不可逆动作 | 默认拒绝、独立批准、强审计 |

这里真正值得保留的不是四级名称，而是方向：

> **风险越高，越不能靠 Agent 自觉；系统应该把可选动作、资源范围和重试空间压得更小。**

Tool 越强，Skill 里的自然语言纪律越不应该成为唯一安全线。

---

## Workflow：它拥有的是长期状态，不是“更复杂的方法”

Workflow（工作流：保存多步骤依赖、状态变化、等待和恢复的机制）经常被误解成“高级 Skill”。

两者最大的区别不是步骤多少，而是：**状态需不需要独立于当前 Agent / Session 长期存在。**

Skill 可以描述：

```text
遇到验证失败
→ 先判断 first divergence
→ 收集 failure set
→ 打开 Repair Stage
```

但如果一个真实 Task 已经处于 FAILED、WAITING、REOPEN，谁负责保存这个状态？

不能是 Skill 文本，也不能是模型记忆。

这时需要正式 Task / Workflow Owner：

```text
Task ID
Task Version
Current State
Node / Step
Execution
Approval
Result
Evidence
Checkpoint
Resume / Reopen
```

因此：

```text
Skill
= 如何处理这类情况

Workflow / Task Control
= 这个具体任务现在究竟处于什么情况
```

这是长期 Agent 系统里非常重要的一条边界。

---

## Agent Profile 只应该“组合”，不要复制所有东西

不同系统会把稳定 Agent 配置叫 Profile、Definition、Role Config 或其他名称。名字不重要，关键是它应该承担**组合**，而不是成为第二份真源。

一个稳定角色可能需要引用：

```text
Role / Mission
Skill
Knowledge
Capability / Tool Binding
Policy
Eval
```

但不应该把 Skill 正文、Knowledge 全文、Tool Secret、当前 Task State、一次性 Approval 全都复制进 Profile。

否则任何一个资产变化，都要人工同步一堆重复配置。

更合理的关系是：

```text
Agent Profile
声明“我依赖哪些稳定资产”
        ↓
Runtime
在当前 Task 中解析真实 Context、Tool、Permission 和状态
```

这篇不继续展开 Profile 的版本、发布和 Host 投影；那属于后续“Agent 资产与运行实例”主题。这里只保留一个原则：**组合根可以引用，不要复制别的 Owner 的真值。**

---

## 一个 Skill 怎样从经验变成真正可复用的资产

Skill 不应该从“我想写一个 Skill”开始，而应该从真实重复问题开始。

我更认可下面这条演进：

```text
真实问题反复出现
        ↓
临时解决方法开始稳定
        ↓
积累成功与失败案例
        ↓
抽出 Trigger / Contract / Stop Rule
        ↓
把确定性步骤下沉到 Script
        ↓
建立正例 / 负例 / 异常 Eval
        ↓
真实任务复用
        ↓
新事故继续修订
```

这比先设计一套很漂亮的 Skill 模板更重要。

当前本机工程 Skill 就是从真实事故中长出来的：长任务阻塞、错误 Tool Owner、边改边测、Timeout 后盲重试、Browser owner 冲突、确定性控制面重复调用。规则不是为了补齐目录，而是因为同一类失败反复出现。

这也意味着 Skill 必须允许退役。

如果某个 Skill 长期没有真实触发，或者其大部分逻辑已经完全确定并被 Automation 吸收，它就应该被缩小、合并甚至删除，而不是因为“已经写好了”永久存在。

---

## Skill Eval 重点测的不是“回答好不好看”，而是方法边界对不对

对开放任务，最终结果质量当然重要，但 Skill 自己还有一组更具体的验证对象。

至少应该覆盖：

### 正向触发

真正属于这类任务时，Skill 能被发现并进入正确方法。

### 负向触发

相邻但不属于它的任务，不应该被误吸进来。

### 输入不完整

缺少必要事实时，Skill 应该停、询问或回 Fact Owner，而不是补猜。

### 高风险输入

越权、危险或不可逆动作，应该进入正确 Denial / Approval 路径。

### 确定性步骤

已经下沉到 Script 的东西，不应该又被模型自由改写。

### 输出 Contract

产物结构、证据和完成条件是否满足。

### 失败与恢复

失败后是否进入正确状态，而不是无限重试或者假装成功。

所以一个 Skill 真正成熟，不是因为文档写得长，而是因为：

> **该触发时能触发，不该触发时不抢任务；能推进，也知道什么时候必须停。**

---

## 多 Agent 共享 Skill，比复制多份角色 Prompt 更重要

如果 Product、Dev、Test 都需要“读取项目事实”“做本机工程”“生成证据”，最差的做法之一是给三个 Agent 各复制一套相似方法，然后分别维护。

更清楚的结构是：

```text
共享 Skill / Tool / Contract
        ↑
不同 Agent / Role
├── 不同目标
├── 不同 Context
├── 不同 Permission
└── 不同验收责任
```

Role 的差异应该主要来自长期职责、权限、上下文和验收，而不是复制公共方法。

同样，只有 Prompt 不同，也不足以成为新 Agent。

如果只是“同一个 Agent 在一种任务里换一套方法”，Skill 往往比新建 Role 更合适。

真正值得拆 Agent 的情况，通常仍然是：

- 独立 Context；
- 权限隔离；
- 真正并行；
- 专业判断差异；
- 独立验收；
- 失败隔离。

这和上一篇复杂度文章的结论一致，但这里强调的是资产复用方式：**角色负责责任差异，Skill 负责方法复用。**

---

## 把我现在的系统放进这张责任图

如果只看术语，很容易觉得这些概念还是抽象。把当前 workspace 放进去以后会直观很多。

| 当前真实对象 | 它属于什么 | 为什么 |
|---|---|---|
| ChatGPT Chat | Agent / Host | 承担开放式分析、判断、设计和 Review |
| `chat-local-engineering-protocol` | Skill | 定义本机工程任务的方法、边界和停止规则 |
| `technical-document-writing` | Skill | 定义怎样把真实材料组织成可读技术文档 |
| Skill 的 `references/` | Knowledge / Reference | 只有需要深层规则时才加载 |
| Frozen Decision Runner | Script / Automation | 冻结以后按确定顺序 materialize、apply、verify、receipt |
| Local Dev | Tool | 提供本机文件、进程、Git 和真实执行能力 |
| CodeGraph | 专用 Tool | 提供调用链、依赖和 blast radius 结构事实 |
| Playwright Chrome | Browser Tool | 提供真实页面观察和交互 |
| `mcp-shared-broker` | Runtime infrastructure | 解决 Browser shared owner，不定义业务方法 |
| ProFlow Task / Node | Workflow / Task Control | 保存长期产品任务状态、交接、失败和恢复 |
| ProFlow Product / Dev / Test | Role / Agent responsibility | 长期拥有不同目标、判断和验收责任 |

这张表也是一个很好的反向检查。

如果以后发现：

```text
某个 Skill 里有 100 行纯机械命令
→ 考虑下沉 Automation

某个 Automation 开始根据自然语言自由决定 Scope
→ 判断被放错层了

某个 Tool 说明里写满业务流程
→ Tool 和 Skill 混了

某个 Skill 记录“这个 Task 当前 RUNNING”
→ 长期状态 Owner 错了

某个 Prompt 说“禁止删除”但 Tool 实际可删全盘
→ 安全边界没有真正落地
```

责任图就已经告诉我们该往哪里修。

---

## 一张选择表：新逻辑到底应该放哪

| 你现在手上的东西 | 优先放哪里 |
|---|---|
| 一段稳定事实、概念解释、案例 | Knowledge / Reference |
| 一次任务临时要求 | Prompt / Current Context |
| 反复出现、但每次仍需要判断的方法 | Skill |
| 输入输出和规则完全确定 | Script / Automation |
| 对文件、Browser、API、DB 的真实操作 | Tool / Adapter |
| 多种 Tool 都能实现的稳定上层语义 | Capability（有真实复用后再抽） |
| 当前主体可访问的资源和动作范围 | Permission |
| 风险、审批、停止和证据规则 | Policy |
| 某一次高风险动作的正式授权 | Approval |
| 跨 Session 的任务状态、等待、恢复 | Workflow / Task Control |
| 独立长期责任、上下文、权限或验收主体 | Agent / Role |

如果一段逻辑同时满足两行，不代表表失效，通常只是说明它应该被拆成两层。

例如“发布知识”可能是：

```text
Skill
决定什么值得发布、发布前应该检查什么
        ↓
Automation
做查重、上传、覆盖、回读
        ↓
Tool
调用真实发布 API
        ↓
Policy / Approval
控制外部写入是否允许
```

这比把整套流程塞进一个“发布 Agent Prompt”更容易理解，也更容易测试。

---

## 最常见的九种放错位置

### 1. 把知识说明包装成 Skill

没有 Trigger、流程和输出，只是一篇背景文档。保留为 Reference 更直接。

### 2. 把确定性脚本包装成 Agent

每次让模型重新解释固定规则，增加成本和方差。

### 3. 把 Tool 当成 Skill

接了 MCP 不等于 Agent 自动知道什么时候、为什么、用什么顺序调用。

### 4. 把 Skill 当成 Workflow

把长期状态、等待和重试藏进文本，Session 一变状态就漂移。

### 5. 把 Prompt 当成 Permission

模型知道限制，不代表 Runtime 强制限制。

### 6. 把 Capability 和 Tool 一开始就做成两套巨大 Registry

没有第二实现和第二调用方时，先直接绑定更简单。

### 7. 给每个 Agent 复制一套公共 Skill

方法开始分叉，修一次事故要同步多份 Prompt。

### 8. Skill 只写“应该做什么”，不写什么时候停止

模型在缺证据、越权或未知状态下仍然继续。

### 9. Skill 越写越长，却从不把确定性步骤下沉

最终每个任务都花大量 Token 重新读取机械细节。

这些反模式看起来不同，根因其实一样：**Owner 错了。**

---

## 最后只保留一个判断方法

以后再遇到一段“要不要做成 Skill / Tool / Workflow”的逻辑，我会按下面顺序判断：

```text
它只是稳定事实吗？
→ Reference

它只是当前一次任务的临时要求吗？
→ Prompt / Context

规则已经完全确定吗？
→ Script / Automation

仍然需要根据语义和反馈判断吗？
→ Skill + Agent

需要操作真实世界吗？
→ Tool / Adapter

是否需要把具体 Tool 与上层语义解耦？
→ 有真实复用以后再抽 Capability

这个主体到底能不能做？
→ Permission

当前条件下到底应不应该做？
→ Policy / Approval

状态必须跨 Session 长期存在吗？
→ Workflow / Task Control

是否真的出现独立长期责任、上下文、权限或验收？
→ 再考虑新 Agent / Role
```

这套拆法最重要的结果，不是让系统拥有更多名词，而是让模型不再承担本来应该由程序、权限系统和状态机承担的责任。

对我现在的工程体系来说，最终可以压成一句话：

> **Agent 负责判断，Skill 负责方法，Tool 负责连接现实，Script / Automation 负责确定执行，Workflow 负责长期状态，Permission / Policy 负责约束权力；Knowledge 为它们提供依据，但不替任何一层做决定。**
