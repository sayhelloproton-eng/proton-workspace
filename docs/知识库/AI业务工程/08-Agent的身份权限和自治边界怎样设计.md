# Agent 的身份、权限和自治边界怎样设计

Agent 进入真实业务以后，安全问题很快会从“模型会不会说错话”升级成：

> **这个主体是谁，它能看什么、能做什么，以及在没有人工逐步确认时最多可以连续做到哪一步。**

Capability、Permission、Identity、Autonomy 经常被混在一起。把它们分开，是 Agent 安全工程的第一步。

## Capability、Permission、Identity、Autonomy 各回答什么

Capability 回答系统有没有完成某种动作的能力，例如：

~~~text
order.get
refund.create
refund.cancel
email.send
user.delete
~~~

Permission 回答当前主体在当前 Scope 下是否被允许执行这个动作。

Identity 回答最终是谁在执行、动作算在谁身上。

Autonomy 则回答在无需人工逐步确认时，允许连续执行到什么程度。

所以：

~~~text
系统会做
≠ 当前 Agent 有权做
≠ 当前 Task 允许做
≠ 可以无人连续做
~~~

## Permission 应该绑定 Task，而不是只绑定 Agent 名字

如果一个 Agent 平时拥有退款能力，不代表每个 Task 都能对任意订单退款。

更合理的授权上下文是：

~~~text
subject = user:u_123
agent = refund-agent
task = task_456
resource = order:order_789
action = refund.create
amount_max = 500
expires_at = ...
risk = medium
~~~

这就是 Task-scoped Permission（任务作用域权限）：权限跟着当前责任和对象走，而不是永远绑在一个 Agent 名字上。

## Least Privilege 应该同时收窄动作和参数

Least Privilege（最小权限）不只是减少 Tool 数量。

例如允许 refund.create 仍然太粗。

真正策略可能是：

~~~text
action == refund.create
AND order.user_id == current_user.id
AND amount <= order.refundable_amount
AND currency == order.currency
AND amount <= task.amount_limit
~~~

很多真实风险藏在参数里，而不是 Tool 名称里。

所以授权至少可能需要控制：

- Tool；
- Resource；
- Path；
- Tenant；
- Environment；
- Parameter；
- Credential；
- Time；
- Side Effect。

## Read 和 Write 最好分开

很多任务只需要分析，却因为 Tool Server 设计方便而顺手拿到了删除和发布权限。

更安全的默认是：

~~~text
Read Capability
→ broad enough to understand

Write Capability
→ narrow and explicit

Destructive Capability
→ separate / approval
~~~

Tool 粒度过粗，本身就是安全负债。

## 身份至少有三种常见模型

### Service Identity

所有动作都以 Agent 服务账号执行。

实现简单，但审计时只能看到“Agent 做了”，很难表达真正用户委托关系。

### User Delegation

动作以用户身份或用户授权的 Delegation 执行。

能更准确继承用户权限，但要处理 Token Scope、过期、撤权和跨系统映射。

### Agent Identity + Delegation Context

Agent 有自己稳定身份，同时记录：

~~~text
agent identity
+ on_behalf_of user
+ task
+ permission scope
~~~

这对长期 Agent、跨服务执行和审计更清楚。

Identity 不是为了给 Agent 起名字，而是让系统能追责。

## Credential 不应该直接暴露给模型

最危险的设计之一，是把 API Key、数据库密码或高权 Token 塞进 Prompt / Context。

更安全的是 Credential Broker（凭证代理：根据 Identity、Task 和 Policy 临时提供受限凭证，或由受信任执行器代做高权动作）。

~~~text
Agent proposes action
↓
Policy Engine
↓
Risk Classification
↓
Credential Broker / Privileged Executor
↓
real effect
↓
evidence
~~~

模型只需要知道“可以调用 refund.create”，不需要知道真实 Secret。

## Permission Check 必须发生在模型外

System Prompt 可以告诉模型“不要访问生产”，但它不是 Security Boundary。

真正 Permission 必须由模型外的软件强制，因为：

- Prompt 可能被忽略；
- 外部内容可能注入；
- 模型可能误判；
- Tool 可能被间接调用。

正确边界是：

~~~text
model proposes
→ Policy Engine
→ ALLOW / DENY / APPROVAL_REQUIRED
→ executor
~~~

而不是把安全寄托在模型自律上。

## Policy Engine 应该独立表达规则

Policy Engine（策略执行组件：根据主体、资源、动作、参数、风险和环境做授权决策）可以显式返回：

~~~text
ALLOW
DENY
CONDITIONAL
APPROVAL_REQUIRED
~~~

策略可以检查：

- 谁在请求；
- 为哪个 Task；
- 目标资源；
- 参数范围；
- 当前环境；
- 数据分类；
- Risk Tier；
- 是否已有 Approval。

这样业务规则和模型建议不会混在一起。

## Approval 不是 Permission 的替代品

Permission 回答“原则上是否允许”。

Approval 回答“这一次具体高风险动作是否被确认”。

一个好的 Approval 至少绑定：

~~~text
Action
Target
Parameters
Version
Evidence
Approver
Expiry
~~~

例如确认页应该显示“即将退款订单 456，金额 328 元，原因重复扣款”，而不是只弹一个模糊的“是否允许 Agent 执行”。

旧 Approval 也不能自动覆盖后来参数已经变化的新动作。

## Autonomy 应该按 Risk Tier 分层

Risk Tier（风险等级：根据动作可逆性、影响范围、数据敏感性和验证强度划分自动化上限）可以帮助确定 Agent 能自动走多远。

### Tier 0：只读、低风险

Search、Summarize、Analyze、Generate candidate，可以高自治。

### Tier 1：隔离、可逆修改

worktree edit、draft document、sandbox operation，可以自动执行，但需要 Validator。

### Tier 2：共享环境写入

shared branch、business record、external message，需要更严格 Policy / Review。

### Tier 3：高影响或不可逆

payment、production delete、release、permission change，通常要求 Explicit Approval 或 Privileged Executor。

## Risk 不只看金额

风险至少可以由：

~~~text
reversibility
blast radius
data sensitivity
external visibility
financial impact
legal impact
validation strength
recovery ability
~~~

共同决定。

金额很小但会泄露隐私的动作，仍然可能是高风险。

## Autonomy 还要受 Observation 强度影响

如果 Agent 很难知道动作是否成功，自主程度应该下降。

代码环境拥有 Diff / Test / Git Readback，自主程度可以更高；纯视觉 Browser Observation 更弱，高风险动作自治应该更低。

所以自治边界不是只看模型能力。

## Delegation 不能扩大权限

Parent Agent 把 Child Task 委派出去以后：

~~~text
child permission
≤ delegated parent permission
~~~

Child 不应该因为换了模型、Runtime 或远端 Agent，就突然获得新的高权 Capability。

跨 Agent / A2A 协作也应该明确 Permission Mapping，而不是默认远端系统自己负责。

## Tool Discovery 应该先做硬过滤

当 Tool 很多时，正确顺序更像：

~~~text
all capabilities
→ identity / permission / scope filter
→ task relevance
→ model selection
→ execution policy check
~~~

而不是：

~~~text
all tools
→ model sees everything
→ hope model behaves
~~~

这样既降低 Context，也减少越权候选暴露。

## Deny 应该是真正的终止边界

当 Policy 返回 DENY：

~~~text
DENY
→ no executor side effect
→ no silent fallback to another tool
→ record policy evidence
→ explain / escalate if allowed
~~~

不能让 Agent 因为一个 Tool 被拒绝，马上换另一个底层能力绕过同一策略。

## Runtime Policy 要能动态收紧

生产系统的风险不是固定的。

正常状态可以允许：

~~~text
read → allow
low-risk write → automatic
high-risk write → approval
~~~

事故期间可以动态变成：

~~~text
all write → approval
~~~

严重事故时进一步：

~~~text
all write → deny
~~~

这就是 Runtime Policy Enforcement（运行时策略执行）的价值：不用等重新训练模型，也不用靠发一条“请不要再操作”的 Prompt 才能收权。

## Policy Decision 应该可审计

关键动作至少可以记录：

~~~text
subject
agent
task
action
resource
parameters_hash
risk
policy_version
decision
reason_code
approval_ref
credential_ref
timestamp
effect_ref
~~~

后续才能回答：

> 为什么这次允许了，但另一次被拒绝？

Audit Log（审计日志）应该成为 Security Evidence，而不是只服务 Debug。

## Human-in-the-loop 应该集中在高价值决策

成熟系统不是所有动作都弹确认框。

更合理的是：

~~~text
low risk + strong validator
→ automatic

medium risk
→ bounded automatic + review

high risk / irreversible
→ explicit approval
~~~

人工注意力也是稀缺资源。

## Kill Switch 是最后一道运行时边界

Kill Switch（紧急停止开关）应该能快速：

- disable agent；
- disable tool；
- revoke credential；
- switch to read-only；
- block network；
- stop rollout。

它必须存在于模型外，并且可以在模型行为异常时立即生效。

## 安全模型最后要回答三个问题

任何 Agent Action 都可以追：

~~~text
Who?
→ Identity

May it?
→ Permission / Policy / Approval

How far automatically?
→ Autonomy / Risk Tier
~~~

Capability 只是能不能做。

真正把 Agent 变成可运营业务主体的是后面三层。

下一篇继续处理另一面：即使身份和权限设计正确，外部文本、数据和 Tool 本身仍然可能成为攻击输入。
