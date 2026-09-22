# Jev：为什么有些 AI 工作不需要生成语言，只需要做决策

很多 AI 系统里都有一类很常见的工作：判断一条消息属于哪个类型、当前流程该继续还是升级、一个风险是否已经超过阈值、几个候选动作里哪个更合适。

这些问题需要语义理解，却不一定需要“生成一段话”。

这也是理解 Jev 最好的入口。TypeSafe AI 在 2026 年 9 月 15 日发布 Jev，并把它称为第一个 System One Model（系统一型模型）。这个名称目前主要来自 TypeSafe 自己的产品分类，还不能当成已经被整个研究界接受的标准术语。更稳妥的理解是：**Jev 是一个面向软件决策的通用 Decision Model（决策模型）**。

它读取 State（状态），回答预先定义的 Typed Question（类型化问题），返回软件可以直接使用的概率化判断，而不是先生成自然语言，再由程序从文字里解析出结果。

本文只解决几个实际问题：Jev 到底是什么、为什么不直接用 LLM、它怎样输入输出、概率应该怎样理解、放进 Agent（智能体）系统时负责哪一层，以及什么时候不应该使用它。

## 为什么我会对 Jev 产生强烈共鸣

我不是先从论文或 Benchmark 里意识到“Decision Model（决策模型）可能有价值”的。相反，这个问题先在真实工程里把我折磨了很久。

过去一段时间，我一直在推进 ProFlow 和它外围的 Monitor Chat Loop。最初的直觉很简单：既然 GPT-5.6 这类模型已经具备很强的推理、代码和工具使用能力，那么把它放进工程流程以后，需求迭代应该明显比传统开发快。

真正跑起来以后，感受却没有这么简单。

一个长期工程任务并不是只有“设计方案”和“写代码”。模型每推进一步，都可能重新面对大量辅助判断：

~~~text
现在真实状态是什么？
上一轮动作到底有没有执行？
当前应该继续、等待还是恢复？
这个 timeout 是调用失败，还是副作用已经发生但响应丢了？
应该调用哪个工具？
浏览器当前是不是目标页面？
扩展到底有没有刷新成功？
长任务还要不要继续等？
当前是不是已经可以进入测试？
什么时候该换 Chat？
交接时哪些事实必须保留？
~~~

这些事情里有一部分确实需要复杂推理，但大量工作并不值得每次都重新启动一次高级模型的完整 Reasoning（推理）。

我的主观体感是：在很长一段时间里，大量 Chat 时间都消耗在这种“为了维持工程推进而反复重建现场、判断状态、编排步骤、确认结果”的工作上。这个比例没有做过严格统计，所以不能当成 Benchmark；但它足够明显，以至于我开始把“怎样减少模型不必要思考”本身当成工程问题。

真正让我痛苦的也不只是 Token 成本。

更大的成本是 USER_PERCEIVED_WALL（用户感知墙钟时间）：

~~~text
模型重新理解上下文
+
模型规划机械步骤
+
一次次 Tool 往返
+
等待长任务
+
重新检查状态
+
timeout / UNKNOWN 后恢复
+
因为执行编排错误而返工
~~~

模型越强，如果整个系统仍然让它负责太多低价值控制工作，人反而会变成那个一直盯着模型、提醒它“你现在应该做什么”的控制层。

这也是为什么有一段时间，我甚至觉得这种 AI 开发比传统“古法编程”更累：代码当然写得更快了，但我要不断监督一个通用模型是否还记得当前事实、有没有跑偏、是否真的执行成功。

## 我现在怎样降低模型心智负担

后来我在 proton-workspace 里逐渐形成了一条很明确的原则：

> **模型只负责真正需要语义理解和工程判断的部分；稳定、重复、确定的机械步骤必须下沉到模型之外。**

这条原则现在已经直接写进本机工程协议：

~~~text
AUTOMATION-BELOW-MODEL
模型负责 scope / owner / design
稳定 deterministic mechanics 下沉到 scripts / automation
~~~

它不是一句抽象原则，而是被拆成了几类具体做法。

### 先把“事实是什么”从模型脑子里拿出去

长期任务里最危险的一件事，是模型每次根据聊天记录重新猜当前状态。

所以我把不同事实交给不同 Authority（权威源）：

~~~text
ProFlow 项目事实
→ Formal Spec / CURRENT

Chat-to-Chat continuation
→ 唯一 handoff checkpoint

Monitor runtime / lifecycle
→ Node Monitor Service

真实浏览器结果
→ Browser / Readback

真实源码、Git、进程
→ Local runtime / tooling
~~~

模型不再拥有这些事实，只读取它们。

这样做的目的不是让系统“文档更多”，而是避免每个 Chat 都重新推理：

> “我记得上次好像已经做到了这里？”

Current Truth（当前真值）应该由系统保存，而不是由模型记忆维持。

### 再把“怎么做”从模型脑子里拿出去

最典型的例子，是浏览器扩展刷新。

早期如果让模型自己完成这件事，它需要理解和编排很多步骤：

~~~text
确认 workspace 里的扩展版本
→ 查询 Registry 最新版本
→ 判断是否需要更新 package
→ 找 Chrome 当前实际加载版本
→ 打开指定 Extension detail 页面
→ 激活正确 tab / window
→ 截图
→ 识别刷新按钮位置
→ 点击 reload
→ 再读取 Chrome 实际加载版本
→ 确认新版本真的生效
→ 恢复原来的前台
→ 关闭临时维护 tab
~~~

如果这些步骤每次都让模型重新想一次，看起来“模型很智能”，实际却是在重复支付编排成本。

现在它被压成一个高层 Action：

~~~text
browser-extension-update
~~~

Action 内部自己完成版本 currentness（新鲜度）检查、Browser reload、版本 readback（回读）和清理。

如果 workspace package 本身不是最新，直接返回：

~~~text
BLOCKED
→ UPDATE_WORKSPACE_EXTENSION_PACKAGE
~~~

如果 Chrome 已经加载目标版本：

~~~text
NOOP
→ EXTENSION_ALREADY_EXPECTED_VERSION
~~~

只有真的需要刷新时才进入浏览器动作；最后必须重新读取 loadedVersion，确认它等于 expectedVersion，才能返回 PASS / READY。

模型看到的不再是十几个浏览器细节，而是一个 Receipt（回执）。

### 把整个模型可见操作面缩小

Monitor Maintenance 现在明确规定了 Model Cognitive Boundary（模型认知边界）。

正常 successor Chat 不应该为了“理解下一步”去读：

~~~text
helper 源码
PID / process tree
pnpm / node_modules
Chrome 低层细节
Tunnel identity
内部 lifecycle API
~~~

模型保持的是 one-receipt working set（单回执工作集）：读 Authority、claim 一次，后面只消费高层 Action 返回的：

~~~text
status
stage
firstDivergence
requiredAction
next
~~~

只要内部 mechanics（机械实现）没有改变高层 Contract（契约），它就不应该重新进入模型 Context。

这实际上是在主动控制：

> **一次模型调用究竟需要放进脑子里的变量有多少。**

### Dev Tunnel 也从“模型编排”变成一个动作

Microsoft Dev Tunnel 过去需要模型自己串：

~~~text
auth
→ ensure tunnel
→ reconcile port
→ start / reuse host
→ status
→ public URL readback
→ remote connection readback
~~~

现在正常路径只有：

~~~text
scripts/dev-tunnel ready
~~~

它内部固定收敛：

~~~text
auth reality
→ tunnel create / reuse
→ HTTP port reconcile
→ local host owner reuse / start
→ public URL readback
→ remote hostConnections readback
→ READY
~~~

timeout / UNKNOWN 不允许模型凭感觉重新登录、重建 Tunnel 或重复启动 host。

### 飞书发布也只让模型决定“同步什么”

知识库发布曾经同样消耗大量模型心智：找 Space、找根节点、推导目录、处理 README 语义、上传图片、判断 UNKNOWN、决定删除还是重建、再做 readback。

现在 Skill 的要求已经收敛成一句话：

> **模型只决定这次同步什么。**

剩下这些：

~~~text
target discovery
projection
create / move / delete
image upload
body overwrite
readback
reconcile
receipt
~~~

都属于发布 Automation（自动化）。

成功 Receipt 已经是终态 Authority，模型不得为了“再确认一下”继续追加 Browser 检查和第二轮 verify。

### 连测试和等待方式也在减少模型往返

过去另一个非常耗时的模式是：

~~~text
改一点
→ test
→ 看错误
→ 再思考
→ 再改一点
→ test
→ 再思考
~~~

这会把一个 Implementation Stage（实现阶段）切成大量 Reasoning ↔ Tool 的小循环。

现在本机工程协议要求：

~~~text
完成整个 Implementation Stage
→ Stage Freeze
→ 一次 Stage Verify
→ 得到完整 failure set
→ 开一个 Repair Stage
→ 再 Verify
~~~

长任务也类似。

Build、Publish、Deploy 启动以后，模型不能把自己变成 Poller（轮询器）：

~~~text
查一次状态
→ 还没好
→ 再查
→ 还没好
→ 再想一下
→ 再查
~~~

正确方式是把当前所有不依赖结果的工作做尽，只有真正需要终态时再读 Authority。

这些规则的目的都一样：**减少没有新增工程判断价值的模型轮次。**

## 这些做法解决了什么，还剩什么没有解决

到这里，我已经把很多原来由 GPT 承担的责任搬了出去：

~~~text
事实
→ Runtime / Authority

稳定方法
→ Skill

怎么做
→ Action / Workflow

机械执行
→ Automation / Tool

结果确认
→ Readback / Receipt

验证编排
→ Stage Gate
~~~

因此高级模型可以把更多注意力放在真正值得推理的事情上：

~~~text
目标到底是什么？
First Divergence 在哪个 Owner？
架构为什么失败？
应该怎样修改设计？
这个新异常以前没有出现过，应该怎么解决？
~~~

但还有一层很难完全靠确定性代码下沉：

~~~text
当前更像 READY、BUSY 还是 UNKNOWN？
应该 CONTINUE、WAIT、RECOVER 还是 ESCALATE？
这次异常是不是已经值得调用高级推理模型？
当前证据是不是足够？
是否需要人工介入？
~~~

这些问题有一个共同特点：

> **问题已经明确，答案空间也已经明确，但现实信息是模糊的，规则很难完整写出来。**

过去这一层通常还是交给 GPT-5.6 这样的通用 Reasoning Model。

这也是我看到 Jev 时会觉得它和自己正在做的事情非常接近的原因。

我已经在工程里不断把“怎么做”从模型里搬出去；Jev 提出的下一步是：

> **连一部分“该做哪个”的模糊判断，也不一定需要完整的大语言模型推理。**

两者不是一回事，但方向是连续的：

~~~text
我现在的 Automation
→ 把“怎么做”确定化

Jev / Decision Model
→ 把“该选哪个”独立成快速概率判断

Reasoning LLM
→ 只保留真正开放、复杂、未知的问题
~~~

这就是后面理解 Jev 最重要的现实背景。

## 先建立一张最重要的心智模型

判断一项工作应该交给谁，可以先问三个问题：

~~~text
规则已经明确，答案可以机械算出来？
→ Code / Rule / SQL

问题已经明确，候选答案也明确，
但现实信息很模糊，规则很难完整写出？
→ Decision Model / Jev

连问题怎样拆、方案有哪些、下一步怎样探索都不明确？
→ LLM / Reasoning Model
~~~
这三层之外，还有真正改变现实的执行层：

~~~text
Workflow / Tool / Runtime
→ 权限、状态、确定性执行、真实副作用和结果回读
~~~

所以 Jev 不是“让 AI 决定一切”。更准确的边界是：

~~~text
Code
→ 已知问题 + 已知规则

Jev
→ 已知问题 + 已知答案空间 + 模糊判断

LLM
→ 开放问题 + 需要探索的解法空间

Workflow / Tool / Runtime
→ 确定性执行和真实世界状态
~~~

后面的 API、概率、校准和 Agent 架构，都只是把这张图继续展开。

## 为什么 Structured Output 还没有解决这个问题

今天的大语言模型已经可以通过 JSON Schema、Function Calling 或 Structured Output（结构化输出）返回枚举和对象。

例如系统只需要：

~~~json
{
  "action": "recover"
}
~~~

这已经很像一个软件决策接口，但底层仍然是 Autoregressive Generation（自回归生成）：模型逐 Token（词元）生成字符串，再由运行时验证结构。

Structured Output 解决的是“怎样让语言模型的输出更容易被软件读取”，没有改变“先生成语言，再得到决策”这条计算路径。
Jev 采用的是另一种输出合同：

~~~text
State
+
Typed Questions
↓
Decision Model
↓
Typed Probabilistic Answers
~~~

TypeSafe 官方文档对它的描述很直接：Jev 不生成文本，而是针对状态评估类型化问题，直接返回类型化值和 Probability Distribution（概率分布）。Choice 和 Score 还会返回 Confidence（置信度）。

这并不意味着语言生成没有价值。写代码、写文章、解释原因、设计架构，本来就需要开放输出空间。Jev 只是在指出：**如果软件最终只需要一个有界判断，就没有必要为了得到这个判断先生成一段语言。**

## 一次 Jev 调用到底长什么样

TypeSafe 当前 API 的核心心智模型可以压成两部分：

~~~text
state
+
questions
↓
answers
~~~

State（状态）是这次判断需要看到的材料，可以是字符串，也可以是结构化 JSON Object / Array。官方建议复杂业务优先使用带字段名的对象。

例如一个 Agent Runtime（智能体运行时）可以准备：

~~~json
{
  "runtime": {
    "browser_connected": true,
    "page_state": "unclear"
  },
  "task": {
    "status": "running",
    "retry_count": 1,
    "last_effect": "submit"
  },
  "last_receipt": {
    "status": "UNKNOWN",
    "reason": "response timed out"
  }
}
~~~
State 只描述事实和上下文。真正要判断什么，由 Questions（问题集合）定义。

同一份 State 可以一次问：

~~~text
当前页面更接近 READY / BUSY / UNKNOWN？
是否存在重复副作用风险？
是否需要人工介入？
当前异常严重程度是多少？
~~~

官方文档明确说明：同一次请求里的问题共享同一个 State，但彼此独立评估，可以混合不同问题类型。

## Choice、Noul、Score：三个决策原语

| Primitive | 适合回答什么 | 主要返回 |
|---|---|---|
| Choice（多选判断） | 已知候选中是哪一个 | choice、probabilities、confidence |
| Noul（真假判断） | 一个命题是否成立 | noul，0～1 |
| Score（程度评分） | 位于一个有顺序的程度区间哪里 | score、legend、probabilities、confidence |

Choice 适合 Routing（路由）和分类，例如：

~~~text
WAIT
RECOVER
ESCALATE
ASK_HUMAN
~~~

Noul 适合“是否成立”的问题，例如“是否存在重复副作用风险”。它直接返回 Yes 为真的概率：接近 1 表示强烈倾向 Yes，接近 0 表示强烈倾向 No，接近 0.5 表示模型拿不准。

一个容易混淆的细节是：**Noul 没有独立的 confidence 字段。** Choice 和 Score 才额外返回 confidence，用来描述整个概率分布有多集中。
Score 适合有顺序的程度，例如：

~~~text
0  几乎无风险
1  低风险
2  明显风险
3  高风险
~~~

它返回的不只是某个整数档位，还可以给出沿这些等级的连续位置和概率分布。

## 为什么要拆成 Atomic Judgment，而不是问一个“大问题”

Jev 的设计不是把一个完整 Agent 目标换一种 Prompt 再问一次。

官方文档明确建议：每个问题只做一个快速、边界清楚的 Atomic Judgment（原子判断）。如果一个判断需要同时权衡很多独立因素，就拆开，然后由代码组合。

不要问：

> 综合所有信息，现在最好的处理方案是什么？

可以拆成：

~~~text
任务是否已经完成？
页面状态更接近 READY / BUSY / UNKNOWN？
上一次副作用是否可能已经发生？
当前证据是否足够继续？
是否需要人工介入？
~~~

然后由普通代码组合：

~~~text
if duplicate_risk is high
and effect_state is unknown
→ do not replay

if page_state is unknown
and evidence_sufficient is false
→ observe / escalate
~~~

这里真正改变的是责任边界：**模型负责提供小而清晰的概率判断，系统负责怎样组合这些判断。**
## Parallel Sampler 为什么适合这种任务形状

普通 LLM 的输出是顺序生成的：

~~~text
token 1
→ token 2
→ token 3
→ ...
→ parse / validate
→ decision
~~~

TypeSafe 声称 Jev 使用新的 Parallel Sampler（并行采样器），可以在一次 Query（查询）中并行产生多个问题的结构化输出，而不是逐 Token 生成答案。

官方文档也建议：只要多个问题使用同一份 State，就尽量放进一次请求。它把这种“提前把可能会用到的问题一起问掉”的方式称为 Speculative Fan-out（推测式并行展开）。

TypeSafe 当前公开的服务延迟范围是约 70～500ms，并报告过相对前沿 LLM 很大的速度和成本优势。但这些数字来自厂商自己的服务和 Benchmark（基准测试），应该理解为“这种架构可能显著更高效”的证据，而不是“Jev 在所有任务都快几十倍或上百倍”的普遍定律。

TypeSafe 目前也没有公开足够细的内部 Architecture（模型架构）和 Parallel Sampler 实现，因此可以确认输出范式不同，但不能替它补写未公开的内部机制。

## RLCD 到底训练的是什么

TypeSafe 把自己的训练方法称为 RLCD（Reinforcement Learning for Calibrated Decisions，面向校准决策的强化学习）。

用训练目标来理解更简单：

~~~text
RLHF
→ 更偏向优化“什么回答更符合人类偏好”

RLVR
→ 更偏向优化“怎样得到可验证的正确结果”

RLCD
→ TypeSafe 声称优化“正确决策 + 校准概率”
~~~
这里最值得理解的不是名字，而是输出合同。

Jev 不只要选出一个答案，还希望返回的概率具有可校准意义。一个理想的 Calibrated Model（经过概率校准的模型）在大量相似案例上，如果经常给出 0.8，那么这些判断大约应该有 80% 最终为真。

这是群体统计性质，不是对某一次请求的保证。

TypeSafe 已经公开 RLCD 的目标，但没有公开完整 Reward Function（奖励函数）、Loss（损失函数）和训练 Recipe（训练配方）。因此“RLCD 具体怎样训练出来”目前仍属于公开信息不足的部分。

## Probability、Confidence 和 Threshold 不是一回事

Probability（概率）回答：

> 模型把多少概率放在某一个具体答案上？

例如：

~~~text
RECOVER    0.82
WAIT       0.10
ESCALATE   0.08
~~~

Confidence（置信度）回答：

> 整个 Choice / Score 的概率分布有多集中？

Threshold（阈值）则属于应用系统：

> 什么条件下允许自动执行，什么条件下必须升级、复核或者拒绝？

因此正确关系是：

~~~text
Jev
→ probability / confidence

Eval
→ 这些信号在我的任务上到底有多可靠

Policy
→ 哪种风险下使用什么 threshold

Runtime
→ act / review / escalate / human
~~~
高风险动作即使模型非常确定，也可以继续要求 Human Approval（人工批准）。概率模型不应该拥有权限本身。

## Jev 在 Agent Loop 里最适合放在哪里

一个把所有事情都交给 LLM 的 Agent Loop（智能体循环）很容易变成：

~~~text
Observe
→ LLM 判断下一步
→ Tool
→ LLM 判断结果
→ LLM 决定继续 / 重试
→ Tool
→ LLM 再判断
→ ...
~~~

其中很多调用并没有发生真正开放的复杂推理，只是在重复回答有限状态问题。

Jev 更自然的位置是 Decision Layer（决策层）：

~~~text
Authoritative State / Receipt
          ↓
     Deterministic Policy
   先过滤不允许的动作
          ↓
      Decision Space
          ↓
         Jev
          ↓
 probability / confidence
          ↓
  ┌───────┼──────────┐
  ▼       ▼          ▼
Action    LLM       Human
确定动作  复杂推理    高风险 / 人工
~~~

顺序很重要：**Policy before Jev**。权限、硬规则和明确禁止的动作先由代码处理，Jev 只在合法候选里判断哪个更合适。
低置信度、Decision Space（决策空间）不完整、异常模式新颖或者需要开放推理时，则升级给更强 LLM。

例如一次执行得到：

~~~json
{
  "task_status": "RUNNING",
  "effect": "submit",
  "effect_readback": "UNKNOWN",
  "browser_state": "UNCLEAR",
  "retry_count": 1
}
~~~

代码能够直接确定：

~~~text
effect_readback == UNKNOWN
→ 禁止盲目重复非幂等 submit
~~~

这一条已经有明确规则，不需要 Jev。

剩下可能需要判断：

~~~text
当前页面更像仍在处理，还是已经异常？
现有证据够不够继续恢复？
是否值得升级给复杂诊断模型？
是否应该要求人工确认？
~~~

这些问题都有明确答案空间，但很难靠几个 if 把各种文本、日志和上下文覆盖完整，这正是 Decision Model 的目标形状。

如果问题进一步变成“为什么这个边界反复出现 UNKNOWN，应该怎样重构系统”，它已经从有界判断变成开放诊断和设计，应该回到 Reasoning LLM。

## Jev 和相邻技术到底是什么关系

| 技术 | 最适合的任务形状 | 和 Jev 的关键区别 |
|---|---|---|
| Rule / SQL | 规则和计算已经明确 | Jev 不该替代确定性规则 |
| Task-specific Classifier | 固定任务分类或评分 | 通常围绕固定任务训练 |
| Structured-output LLM | 通用生成能力 + 结构化结果 | 底层仍是自回归生成 |
| Small LLM | 更低成本承担窄语义任务 | 仍以语言生成范式为主 |
| Reward Model | 给候选结果打分、排序 | 常作为训练或排序组件 |
| Jev | 运行时定义的有界判断 | 原生返回类型化概率决策 |
Jev 和传统 Classifier（分类器）最容易被混淆。

它们的输出形态确实很像：输入材料，得到各标签概率。区别在于，传统专项分类器往往把任务和标签空间固化在训练阶段；Jev 试图让“问题是什么、候选有哪些”也可以在 Inference Time（推理时）定义。

这不意味着专项分类器已经过时。如果任务稳定、数据充足、调用规模巨大，专用分类器仍可能在准确率、延迟和成本上更好。

更准确的价值是：**面对一个新的有界语义判断，Jev 提供了一个不需要先为每个任务单独训练模型的通用 Baseline（基线）。**

## 独立测试给了哪些修正

Jev 发布后很快出现了独立测试，这些结果比单看厂商 Benchmark 更能帮助理解边界。

Parallel 在 Search Reranking（搜索重排）、Topic Classification（主题分类）和 Query Freshness（查询时效性判断）上测试 Jev。它观察到 Jev 的 Zero-shot（零样本）能力很强，但其内部专用模型在部分分类任务上仍然更好。

这说明 Jev 更合理的问题不是“它能不能打败所有分类器”，而是：

> 面对一个新的模糊判断，是先用通用决策模型快速建立可用基线，还是立即投入数据、训练、部署和长期维护一个专项模型？

另一个独立的 Jev Calibration Audit（概率校准审计）则发现了更重要的工程问题：Probability（概率）不是脱离任务定义、数据分布和问题写法就永远可靠的常数。

其中一个特别有价值的实验是 Abstention（弃权）测试：当一个本来可能“无法判断”的任务没有提供 unknown 选项时，模型会被迫在剩余合法候选中选择，甚至可能高置信度地选错。

因此 Decision Space 本身就是系统设计的一部分。
一个现实的 Choice 往往需要考虑：

~~~text
UNKNOWN
OTHER
ABSTAIN
ESCALATE
ASK_HUMAN
~~~

具体保留哪一种退出路径，由业务语义决定。

独立审计还显示，同一判断用 Noul 和二选一 Choice 表达时，概率不一定完全一致；这意味着 Question Instructions（问题描述）、Criteria（候选定义）和 Primitive 类型本身都属于 Decision Contract（决策合同），不能把它们当成随手可改的文案。

## Type-safe 不等于语义永远正确

TypeSafe 强调 Jev 的 Typed Output（类型化输出）被限制在定义好的 Schema（结构）里。

例如只允许：

~~~text
WAIT
RECOVER
ESCALATE
~~~

模型不会突然返回一个程序没有定义的第四种字符串。

这解决的是 Type Safety（类型安全），不是 Semantic Correctness（语义正确性）。真实答案可能是 WAIT，而 Jev 完全可以合法地返回 RECOVER。

因此生产系统仍然必须保留：

~~~text
Eval
Threshold
Policy
Outcome Readback
Regression
Fallback
~~~

“不会输出非法类型”不能被写成“不会判断错误”。

## Jev 最容易被错误使用的地方

第一种错误，是把已经能写成确定性规则的逻辑重新交给 Jev。例如：

~~~text
retry_count >= 3
→ STOP
~~~
这类规则由代码执行更便宜、更可靠，也更容易审计。

第二种错误，是 State 本身不可信。Jev 只会根据提供的材料判断。如果 Runtime 写着 Browser READY，但真实浏览器已经断开，再好的 Decision Model 也无法替系统修复错误事实。

第三种错误，是答案空间本身还没有想清楚。如果真正需要的是“设计一种新的恢复策略”，但候选只有 WAIT / RETRY / RECOVER，Jev 不会自动创造完整的新方案。

第四种错误，是直接把概率当业务授权。“RECOVER = 0.95”不等于“允许修改生产环境”。Probability 是模型信号；Authorization（授权）来自系统 Policy。

第五种错误，是没有自己的 Eval 就设置统一阈值。不同 Decision、不同错误成本和不同数据分布都可能需要不同 Gate（门槛）。

## 当前能力和现实限制

截至 2026 年 9 月 22 日，TypeSafe 官方文档明确说明：

~~~text
Jev 当前处理文本型 State
State 可以是 string / JSON object / array
图片、音频、视频暂不直接支持
主要训练语言是英语
其它语言包括 CJK 可以输入，但当前准确率较低
~~~

独立审计在英韩对照数据上也观察到韩语准确率下降，因此非英语业务需要单独评测，不能直接继承英语阈值。

官方当前公开用法是 Hosted API（托管接口）和 SDK。TypeSafe 没有公开 Jev 官方权重或正式 Self-host（自行部署）方案，因此“真正的官方 Jev”目前应按外部模型服务理解。

社区已经出现本地开源 Decision Model 和 Jev-compatible（Jev 接口兼容）项目，但它们可以复现接口或设计思想，不等于 TypeSafe 官方 Jev。
## 真正进入生产以后，应该怎样治理

一个稳妥的引入顺序可以是：

~~~text
Define Decision Spec
→ 定义问题、候选、退出路径和业务含义

Golden Set
→ 保存有人工或真实 Outcome 标签的案例

Offline Eval
→ 测准确率、概率、失败切片

Shadow Mode
→ 看真实流量，但不控制动作

Threshold / Escalation
→ 按风险决定自动、复核、升级

Canary
→ 小范围获得真实 Outcome

Drift / Regression
→ 模型、问题和 State Schema 变化后持续回归
~~~

尤其要注意：Question Instructions、Criteria 和 State Schema 都属于生产合同。

如果把“什么叫 UNKNOWN”改了一句话，本质上已经修改模型面对的任务定义，应该重新跑 Eval。

模型版本也应进入发布纪律。生产日志最好记录响应里的实际 Model Version（模型版本），而不是只记录 latest 之类别名。模型版本变化后，过去测出的 Probability Distribution（概率分布）和 Threshold 不应该被自动假设仍然有效。

## Small Model 和 Decision Model 不是同一个维度

Small Model（小模型）主要回答：

> 什么任务值得使用更便宜、更低延迟的模型资源？

Decision Model 回答：

> 这项工作真的需要语言生成吗，还是只需要一个有界概率判断？

两者可以重叠，但不是同义词。
~~~text
Small Model
→ 更偏计算规模、部署位置和成本策略

Decision Model
→ 更偏任务形状和输出合同
~~~

一个小 LLM 仍然可以自回归生成文字；一个 Decision Model 则可以专门围绕分类、评分、路由、门控和有限候选判断设计。

这也是 Jev 最值得学习的地方：它迫使系统明确区分 Think（思考）、Decide（判断）和 Execute（执行），而不是把三者都塞进一次大模型调用。

## 怎样判断一个任务是否值得尝试 Jev

可以按下面的顺序判断：

~~~text
规则能完整写出来？
→ Code，不用 Jev

输出必须生成开放文本、代码、方案？
→ LLM

问题清楚，答案集合也能预先定义？
→ 继续

判断需要理解文本或复杂结构状态，
而手写规则容易脆弱？
→ Jev candidate

结果能通过真实标签 / Outcome 做 Eval？
→ 可以进入实验

高风险动作？
→ Jev 只提供信号，Policy / Human 保留最终控制
~~~

一句话概括：

> **Jev 最适合“我们知道要判断什么，也知道可能有哪些答案，但无法稳定写出所有判断规则”的地方。**

## 来源与时间边界

本文关于 Jev 当前能力的事实核验于 **2026 年 9 月 22 日**。Jev 仍处于快速演进阶段，API、模型版本、价格、语言能力和 Benchmark 都可能变化；实际使用前应重新检查官方文档。

主要一手来源：

- [TypeSafe｜Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [TypeSafe Docs｜Introduction](https://docs.typesafe.ai/introduction)
- [TypeSafe Docs｜State](https://docs.typesafe.ai/concepts/state)
- [TypeSafe Docs｜Primitives](https://docs.typesafe.ai/primitives)
- [TypeSafe Docs｜Confidence](https://docs.typesafe.ai/confidence)

独立观察：

- [Parallel｜Testing out Jev: real-world developer experience](https://parallel.ai/blog/testing-jev)
- [jev-calibration-audit｜Independent API-only calibration audit](https://github.com/jujumilk3/jev-calibration-audit)

阅读这些结果时需要保留事实强度：TypeSafe 关于 RLCD、校准、速度和效率的描述属于厂商声明；Parallel 和独立审计只能证明各自数据集、模型版本和实验条件下的观察，不能直接推广成所有业务上的普遍结论。
