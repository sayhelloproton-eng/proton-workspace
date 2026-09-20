# ProFlow 当前端到端 Journey：从产品目标到真实交付，再回到下一轮

第一次从外部看 ProFlow，很容易先看到 Custom GPT、Browser Extension、模型运行时和一组 Task API，然后把它理解成“一个工具很多的多 Agent 平台”。

真正决定系统形状的不是工具数量，而是：

> **一个产品目标进入以后，哪些事实由谁拥有，怎样推进到真实执行，失败后怎样恢复，完成后怎样决定下一轮。**

这篇文章只负责建立**当前系统心智模型**。它沿一条端到端 Journey 把 Task、Agent、Execution、Model、Deployment 五个领域以及外层 Monitor 串起来。

它不是 ProFlow 的历史演进史。为什么早期方案失败、Phase 2 / Phase 3 为什么重写、哪些事故塑造了今天的边界，请回到 [ProFlow 总览](./README.md) 和 [历史证据与决策档案](./历史证据与决策档案.md)。

同样需要注意：本文解释的是当前长期机制和已接受的系统边界，不维护实时项目进度。某个能力今天是否已经实现、发布、安装、启用或通过真实验收，必须回到 `repos/proflow` 的 Spec / Source / Test / Runtime / CURRENT 判断。

![ProFlow 全景架构图（双飞轮）](../../../assets/知识库/ProFlow全景架构图-双飞轮.png)

## 先建立一个判断框架：事实、决定权、执行权不是一回事

ProFlow 最重要的设计原则是 Fact Owner（事实归属方：某类正式可变事实唯一可信来源）。

一个组件可以：

- 观察事实；
- 请求动作；
- 执行动作；
- 把结果送给别的组件；

但这些能力都不自动意味着它有资格改变业务结论。

当前实施规范把长期事实拆成五个领域：

| 领域 | 它真正拥有的事实 | 典型问题 |
| --- | --- | --- |
| Task / 任务与编排 | Task、Node、`runNo`、TaskRoleBinding、TaskDocument、TaskGroup、Campaign、Product Intent | 当前工作做到哪里？下一 Node 是谁？什么时候允许开始、等待、失败、完成？ |
| Agent / 智能体运行与协作 | Agent Package、Role、Role Credential、Worker / Conversation identity、Product Discussion、Collaboration Message | 谁承担哪个岗位？哪条 Conversation 属于哪个工作身份？ |
| Execution / 执行 | Intent、Effect、Approval、Result、Artifact、Evidence、UNKNOWN 与恢复 | 一个真实操作到底有没有发生？能否安全重试？ |
| Model / 模型与推理 | FAST / REASON、Capability Profile、推理队列和 Provider 调用 | 当前需要什么推理？真实 Provider 能不能提供？ |
| Deployment / 部署治理 | Module 生命周期、外部资源、包版本、Workspace 安装与运行状态 | 这些能力怎样真正存在于当前机器和外部环境？ |

`platform-host` 是 Composition Root（组合根：负责装配和连接各领域运行组件的入口），不是第六个业务领域。

Gateway、Browser Extension、Provider、CLI 等也可能位于关键链路中央，但“调用很多东西”不等于“拥有很多事实”。

因此整条系统都可以用一个问题检查：

```text
这个事实最终听谁的？
```

答不清时，系统通常很快会出现第二真源。

## 一张主链先把系统串起来

下面这张图表达的是 ProFlow 当前的目标运行关系和稳定 Owner 边界。它是**机制地图**，不是“每个 Gate 当前已经 PASS”的状态表。

```text
用户提出产品目标
        │
        ▼
Product Discussion
收敛 Goal / Scope / Cost / Privacy / License / Risk
        │
        ▼
ProductDocument + scoped ProductIntent
        │
        ▼
Task Owner 校验并物化 Task
        │
        ├── Product Worker
        ├── Dev Worker
        └── Test / Ops Worker
        │
        ▼
Requirement → TaskDocument
        │
        ▼
Task READY / ACTIVE
        │
        ▼
Node READY
        │
        ▼
Task Observer / Reconciliation
        │
        ▼
Browser Driver restore + wake 正确 Worker
        │
        ▼
Worker fresh-read 当前事实
→ startNode
→ 一个 Worker Turn 内连续工作
        │
        ├── Task / Document Action
        ├── peer clarification
        ├── engineering tools
        └── durable Effect → Execution
        │
        ▼
complete / wait / fail
        │
        ▼
下一 Node / Task terminal
        │
        ▼
Test / Acceptance / Evidence
        │
        ▼
terminal evidence 回到 Product Discussion
        │
        ├── GAP_REMAINS → 新 ProductIntent → 新的有界 Task
        └── GOAL_SATISFIED → Closure
```

围绕这条主链还有三类支撑：

- Model Runtime 提供受控推理；
- Deployment 确保 package、resource、workspace、runtime 真的存在；
- Monitor 工程飞轮在平台自身暴露缺口时修 ProFlow，再把系统送回原产品场景。

下面按技术读者最自然的追问展开。

## 一、产品目标为什么不能直接变成 Task

用户说“继续把这个产品做好”时，通常混着目标、功能、技术方案、成本、部署和未知项。

如果直接把这句话变成一个长期 Task，会出现两个问题：

1. Goal 会不断变化，而 Task 又失去清晰结束条件；
2. 后续 Agent 会把新想法、旧约束和临时方案不断塞进同一份工作事实。

所以 ProFlow 把 Product Goal 和 Task 分开。

产品讨论负责把一个模糊目标收敛成可交付输入：

```text
Initial Brief
→ Goal
→ Scope / Non-Scope
→ Cost / Privacy / License / Risk
→ Research
→ Options
→ First-principles reduction
→ ProductDocument
→ scoped ProductIntent
```

这里最重要的边界是：

```text
Product Discussion
拥有 Goal 级认知

Task
拥有一份有界工作
```

Goal 可以长期演进；Task 必须能够结束。

### Product 决定“应该做什么”，Task Owner 决定“能否安全创建”

Product 不应该直接获得任意 `createTask`、任意 binding 或任意状态写入权。

它提交的是受约束 Product Intent；Task Owner 再校验：

- caller identity；
- Goal revision；
- Scope / Constraints；
- 前序 Task 结果；
- idempotency identity；
- Campaign / prerequisite。

只有通过这些 Owner-side 校验，才允许物化新的 Task。

这让“模型认为应该继续”与“系统正式承认存在下一份 Task”成为两件不同的事。

### Campaign Authorization 不是无限自动化授权

持续产品迭代也不能每一轮都机械重复同一份人工确认。

Campaign Authorization 保存的是一个明确边界内的持续授权，例如 Goal、Scope、成本、隐私、License 和风险约束。

自动 start 前仍然要重新读取当前事实：

```text
Task 仍 READY？
Campaign 仍 OPEN？
Goal revision 仍一致？
Authorization 未撤销？
Task scope 仍在授权范围内？
成本 / 隐私 / License / 风险仍未越界？
前置条件仍满足？
```

任何实质越界都重新回到人类决策。

因此：

```text
Campaign Authorization
!= 永久授权

Task READY
!= 任意副作用已授权
```

## 二、Task 创建以后，为什么还要单独建立 Worker

Task 物化以后，先有的是正式业务对象：

- `taskId`；
- ordered Nodes；
- required roles；
- formal documents；
- empty / partial bindings。

它并不等于真实 ChatGPT Conversation 已经存在。

运行期需要把长期 Role 映射成当前 Task 中真正工作的 Worker / Conversation：

```text
Agent Package
→ deployed Role
→ Task-bound Worker
→ Conversation identity / locator
```

这个链路解决的是一个经常被 UI 隐藏的问题：

> **Role、Worker、Conversation 和 Browser Tab 不是同一种身份。**

`tabId / windowId / contentInstanceId` 只表示“此刻从哪里控制页面”，不能成为业务身份。

Chrome 刷新、Extension reload、Tab 重建都不应该自动制造第二个 Worker。

### 创建一半失败，只补缺的部分

假设三个角色里：

```text
Product = BOUND
Dev     = BOUND
Test    = MISSING
```

恢复只应该补 Test。

如果一次创建调用 timeout，也必须先回到真实 ChatGPT 页面和 Task binding 核对 Conversation 是否已经出现，而不能直接理解成“没有创建”。

这里已经和 Execution 的 UNKNOWN 使用同一种恢复思想：

```text
response lost
!= effect not happened
```

### Requirement 不能靠 Conversation Memory 传递

前置 Product Discussion 里的认知要进入 Task，必须变成 Owner-backed document。

```text
ProductDocument
→ ProductIntent
→ Task materialization
→ Requirement / TaskDocument
→ Worker fresh-read
```

模型记得某句话，不等于系统拥有这份 Requirement。

Task 是否 READY，也应该由 Owner facts 计算，而不是由模型说“我准备好了”。

## 三、Task / Node 怎样推进，而不是让 Agent 轮流说“继续”

Task 和 Node 把多 Agent 协作从“聊天顺序”变成正式工作流。

核心状态关系可以理解成：

```text
Task
PENDING
→ READY
→ ACTIVE
→ SUCCEEDED

异常路径
→ WAITING / FAILED / PAUSED / TERMINATED

Node
PENDING
→ READY
→ IN_PROGRESS
→ SUCCEEDED
```

v1 刻意没有先做通用 DAG。真实需要只是：

- 有序 Node；
- 明确 Owner；
- 显式状态转换；
- reopen / recovery；
- 可审计的历史。

### startTask 不是点亮 UI，而是一次正式状态转换

`startTask` 必须重新校验：

- expected version；
- required binding；
- prerequisite；
- start authority。

然后在同一正式转换里：

```text
Task → ACTIVE
首 Node → READY
currentNodeId → 正确节点
```

这样不会出现 Task 已 ACTIVE，但首 Node 还没有正式准备好的半状态。

### Observer 发现“该继续”，但不替 Worker 工作

Task Observer 正常路径读取正式事实，再检测确定性条件：

```text
READ owner facts
→ DETECT deterministic next condition
→ REQUEST typed carrier action
```

Node READY 时，职责依次是：

```text
Task Observer
→ 请求 Browser wake

Browser Driver
→ 恢复正确 Conversation
→ 物理投递 wake

Worker
→ fresh-read Task / Node
→ startNode

Task Owner
→ 承认 Node IN_PROGRESS
```

这四步故意拆开。

Observer 发现下一步，不拥有 Worker 行为；Browser 负责送达，不拥有 workflow truth；Worker 接受工作，但最终状态仍由 Task Owner 记录。

### completeNode 只有在正式输出成立以后才释放下一步

```text
current Node → SUCCEEDED
        ↓
还有下一 Node？
├─ 有 → next Node READY
└─ 无 → Task SUCCEEDED
```

如果只是：

- Execution 仍 RUNNING；
- 模型暂时 busy；
- Browser 正在恢复；
- peer message 等待投递；

都不应该为了“看起来卡住了”就映射成 Task FAILED 或 WAITING。

## 四、WAITING 为什么只能表达业务 blocker

这是 Phase 2 以后很重要的一条语义收敛。

早期很容易把所有“正在等”都塞进一个 waiting 状态：

```text
等审批
等模型
等 Browser
等 peer
等真实 Effect
等用户输入
```

但这些等待属于不同 Owner。

Task 的 `WAITING` 应该只表示真正的业务 blocker，例如：

- Requirement 需要人类确认；
- 产品方向需要正式决策；
- 外部业务输入缺失。

下面这些继续留在自己的 Owner：

```text
Execution RUNNING / WAITING_APPROVAL
Collaboration delivery pending
Browser recovery
Model queue busy
```

这就是：

> **Business Wait != Execution Lease，也 != Runtime busy。**

如果把不同等待强行折成 Task WAITING，恢复时很快就会出现多个状态机互相覆盖。

## 五、reopen 为什么不是“失败后重新建一套”

可信失败修复以后，`reopenNode` 保留同一个 Task / Node identity，增加新的运行轮次，再让目标 Node 回到 READY。

这样：

- TaskRoleBinding 可以继续复用；
- 原 Worker Conversation 可以恢复；
- 旧 run history 不被覆盖；
- Failure / Evidence 继续存在；
- 后续 Test 能知道这是同一份 Requirement 的新一轮执行。

```text
same Task
same logical Node
new runNo
preserved evidence
```

这比“失败以后重新创建 Task 和三支 Agent”更容易审计，也更符合恢复语义。

## 六、Agent 怎样保持身份稳定，又不会变成自由聊天网络

ProFlow 长期角色数量刻意保持少。

原因不是三个角色在理论上最优，而是每新增一个长期 Role，都同时增加：

- identity；
- credential；
- Conversation；
- permission；
- collaboration；
- recovery；
- E2E acceptance。

专业能力可以通过 Knowledge、Context、Tool 或临时 Research 增加；只有真正出现独立长期事实和生命周期时，才值得新增长期 Role。

### Worker Turn 不是一个新的持久实体

一次 wake 以后，Worker 本来就可以在同一 Turn 内连续推理和调用 Action：

```text
wake
→ reason
→ Action A
→ result
→ Action B
→ result
→ formal Task action
```

不需要 Browser 每完成一步都再发送一句“继续”。

只有真正跨 Turn 的异步现实出现时，例如：

- 等待 peer reply；
- 等待 durable Execution；
- 等待 Approval；
- 等待外部现实结果；

当前 Turn 才结束，之后再由正式 Observer / Carrier 恢复同一个 Worker。

### Collaboration 只处理局部问讯

`askPeer / replyPeer` 适合同一 Task 内的局部澄清：

- Dev 问 Product 一个 Requirement 歧义；
- Test 问 Dev 一个复现细节。

它不应该承载：

- 正式 Requirement；
- Technical Design；
- Test Result；
- Task 状态转换；
- 跨 Task 产品续轮。

否则聊天消息会重新长成第二条隐藏 Workflow。

逻辑消息和物理送达也要分层：

```text
Agent Owner
→ 创建 PENDING logical message

Browser
→ restore target Worker
→ physical submit
→ readback fingerprint

Agent Owner
→ 记录 DELIVERED / FAILED / UNKNOWN
```

页面 submit timeout 后，如果无法证明消息是否已经进入 Conversation，就先核对现实，不能直接再发送一次。

## 七、真实执行为什么必须把“调用结果”和“现实结果”分开

Execution 负责最危险的一类事实：

> **一个会改变真实世界的动作到底有没有发生。**

一次可靠执行至少区分：

```text
Intent
→ Policy / Approval
→ Precondition Evidence
→ Effect
→ Postcondition Evidence
→ Result
```

Result、Artifact 和 Evidence 不是同一件事。

例如：

- 拿到一个 patch 文件，不证明 patch 已应用；
- Browser click 返回，不证明消息已经进入目标 Conversation；
- publish 命令 timeout，不证明 Registry 里没有新版本。

### UNKNOWN 是正式结果

真实副作用最重要的不是 SUCCESS / FAILED 二选一，而是：

| 状态 | 含义 | 下一步 |
| --- | --- | --- |
| `APPLIED` | 有证据证明副作用已经发生 | 接受现实，继续业务判断 |
| `NOT_APPLIED` | 有证据证明副作用没有发生 | 合同允许时才考虑重试 |
| `UNKNOWN` | 目前既不能证明发生，也不能证明没有发生 | 进入 Reality Reconciliation |

Reality Reconciliation 的本质是回到真正权威的现实重新确认：

| Effect | 现实回读 |
| --- | --- |
| Browser submit | 目标 Conversation message fingerprint |
| Git commit | HEAD / commit identity |
| Process start | PID / listener / process identity |
| Package publish | exact package@version |
| SaaS resource create | stable remote identity |

核心规则只有一句：

> **A failed command is not proof that an effect did not happen.**

不能证明没发生，就没有资格安全重试。

### Approval 也有不同层级

至少要区分：

```text
Task start authorization
!=
Execution Approval
!=
ChatGPT 页面 Action Permission
```

页面点过 Allow，不等于 Execution Owner 已经建立正式 Approval；Execution Approval 成立，也不等于真实 Effect 已经成功。

UI 不能成为隐形权限系统。

## 八、Browser Extension 为什么是 Driver，不是业务大脑

Browser Extension 连接的是不可替代的页面现实：

- restore Conversation；
- read DOM / page state；
- input / click / submit；
- permission / attention；
- Worker create / wake；
- collaboration delivery；
- product discussion delivery；
- external resource provisioning；
- local tool bridge；
- Monitor page lane。

它内部可以有很多 Lane，但这些 Lane 共享基础设施，不共享业务状态机。

一句话概括：

> **Driver 负责让流程真正发生；Owner 负责定义什么事实成立。**

### Observation 必须是只读 Reality

Phase 2 曾经发生过很典型的错误：

```text
observe
→ 自动 scroll
→ viewport 改变
→ user_reviewing / precondition 被影响
→ 下一次 observe 再改变页面
```

于是形成稳定边界：

```text
OBSERVE
→ read only

MUTATE
→ input / click / scroll / submit

VERIFY
→ 重新观察 postcondition
```

Observation 不能为了“更容易看”顺手改变被观察对象。

### Delivery 一旦成立，不能被下游 response 反向改写

另一类历史事故是：

```text
Browser submit
→ Delivery 已确认
→ Controller 后续 response / Action 失败
→ 整个 Browser command 又被标成 FAILED
```

这样恢复时就可能重复发送。

正确边界是：

```text
Browser Effect
→ Delivery evidence
→ SUCCEEDED
→ END

Controller continuation
→ 独立生命周期
```

这也是为什么 ProFlow 后来不断强调 Effect terminal boundary。

## 九、模型为什么只有推理权，没有工作流决定权

Model Domain 对外提供逻辑推理角色，例如 FAST / REASON。

这里最重要的不是某个具体模型名称，而是：

- 能力必须 live probe，而不是根据 model ID 猜；
- physical device 的并发、队列和切换限制应该由 Runtime 吸收；
- Provider 配置不应该穿透业务 Flow；
- 模型负责 assessment，不负责覆盖 hard policy。

权威关系仍然是：

```text
Owner current fact
> deterministic invariant / policy
> model assessment
> Conversation / DOM / log guess
```

模型可以：

- 分类；
- 诊断；
- 解释；
- 提出候选；
- 做受约束判断。

但不能越过：

- identity；
- version；
- scope；
- idempotency；
- Human Approval；
- Task Owner transition。

## 十、Deployment 为什么必须一直追到 Runtime

Deployment 经历过从中央 Planner 到 Module 自治的收缩。

当前设计要求 owning Module 自己拥有 setup、status、start、stop 和恢复语义；Platform CLI 只负责发现、排序、调用和聚合。

这里最关键的是：

```text
install
!= setup
!= start
!= runtime adopted
```

源码修改也必须穿过真实供应链：

```text
Source Truth
→ Package Truth
→ Registry Truth
→ Installed Truth
→ Runtime / Product Truth
```

例如 Extension load directory 已经指向新文件，如果 Chrome 没有 reload、真实 Extension instance 没有变化，就不能说用户正在运行新版本。

同样，Provider config 写对了，也不能证明真实服务支持 structured output、Vision 或 thinking mode；这些都需要当前 Reality。

## 十一、Task 成功以后，产品为什么还没结束

`Task SUCCEEDED` 只说明一份有边界的工作已经完成，不等于整个 Product Goal 已经满足。

terminal 以后，旧 Task 应停止继续驱动。

Product continuation 再读取：

```text
Goal / Campaign
Authorization
Product Intent
Task terminal fact
TaskDocument
Test / Deployment / Product Evidence
```

然后只有两类产品级结论：

```text
GAP_REMAINS
→ 具体 Gap
→ 新 Evidence
→ 新 ProductIntent
→ 新的有界 Task

GOAL_SATISFIED
→ Closure
```

同一个 Gap 如果没有：

- 新证据；
- 可测进展；
- 实质不同的新方案；

就不能只换一个措辞继续自动创建 Task。

所以持续迭代最重要的能力之一是：

> **知道什么时候停止。**

## 十二、Monitor 怎样支撑 ProFlow，又为什么不是第四个产品 Agent

真实产品运行会暴露 ProFlow 自己的问题：

- Observer 可能漏 wake；
- Browser 页面可能变化；
- Package 可能没有真正进入 Runtime；
- Provider 可能漂移；
- Acceptance Harness 可能制造假失败。

Monitor 工程飞轮负责：

```text
观察 Source / Runtime / Browser / Evidence
→ 找 first divergence
→ 使用工程工具修 ProFlow
→ 重新证明受影响事实层
→ 回到原真实场景
```

它不进入 Product / Dev / Test 业务 Role，也不替这些 Agent 做目标产品决策。

还有一条更通用的边界：

> **运行接力、页面防重或业务 shift 状态，不能自动等价成本机工具 authority。**

如果某种旧会话失权语义没有在真正 trusted ingress 上被强制执行，就不能因为应用层写了一个 active owner 字段而宣称旧 caller 已经被 revoke。

这类当前实现细节变化很快，所以本文只保留边界；具体 Monitor run / shift / browser / local tool 状态由当前 ProFlow Spec、Runtime 和 Acceptance Evidence 负责。

## 十三、用一份真实工作把五个领域重新串一次

假设目标是“给一个真实产品增加一项功能”。

```text
1. 用户给 Product Discussion 一个 Goal
   收敛目标、边界和风险

2. Product 研究、比较方案、形成 ProductDocument
   把模糊目标变成 scoped ProductIntent

3. Task Owner 校验 Intent
   identity / scope / revision / idempotency / prerequisite

4. Task Owner 创建一份有界 Task
   Task 获得正式 identity 和 ordered Nodes

5. Agent / Browser 为 Product / Dev / Test 恢复或建立正确 Worker
   Task 保存稳定 binding

6. Requirement 进入 TaskDocument
   Worker 以后 fresh-read 正式输入

7. Task 正式 start
   首 Node READY

8. Task Observer 发现确定性 next action
   Browser restore + wake 正确 Worker

9. Worker startNode
   Task Owner 承认 IN_PROGRESS

10. Dev 在 Worker Turn 中连续工作
    读 Context / Source
    调 Engineering Tool
    必要副作用进入 Execution

11. Dev 写正式 output 并 completeNode
    Task 释放 Test Node

12. Test / Ops 独立读取 Requirement 和 Evidence
    做 Test / Runtime / Product 验证

13. 如果可信失败
    保存失败 Evidence
    wait / fail / reopen 按正式 Owner 语义处理
    不靠聊天一句“再试一次”覆盖历史

14. 最后一个 Node complete
    Task terminal

15. terminal evidence 回 Product Discussion
    GAP_REMAINS → 新 ProductIntent → 新 Task
    GOAL_SATISFIED → Closure

16. 如果途中暴露的是 ProFlow 自身缺陷
    Monitor 修 ProFlow
    → 重新证明 Source / Package / Workspace / Runtime / Reality
    → 回到原产品场景
```

到这里，五个领域可以压成五句话：

```text
Task
负责工作事实、顺序和任务边界

Agent
负责谁来思考、以什么身份协作

Execution
负责真实动作到底发生了什么

Model
负责怎样得到受约束的推理

Deployment
负责这些能力怎样真实存在于环境里
```

Browser、Gateway、CLI、`platform-host` 都可能很重要，但不能因为位置居中就接管领域事实。

## 十四、这篇文章怎样处理“当前状态”

本文刻意不维护“今天哪个 Gate PASS、哪个 Runtime enabled、哪个 Campaign started”这类即时状态。

原因很简单：

> **正式知识应该解释机制和工程判断；当前项目状态只能由当前 Owner 决定。**

如果要判断现在到底成立到哪一层，应回到：

```text
repos/proflow/spec
→ 当前设计与 Contract

repos/proflow/spec/.../CURRENT.md
→ 当前阶段与接力导航

Source / Test
→ 当前实现和验证

Package / Registry / Workspace
→ 当前分发与安装事实

Runtime / Browser / External Reality
→ 用户今天真正运行到什么
```

同一篇长期文章里出现“某个 Gate 今天 PASS / NOT_RUN”，很快就会过期，并重新制造第二份 Current State。

本文只保留一条不会因为项目进度变化而失效的证据纪律：

```text
设计存在
!= 源码已实现

源码已实现
!= 测试已证明

测试已通过
!= 包已发布

包已发布
!= Workspace 已安装

Workspace 已安装
!= Runtime 已采用

Runtime 已启动
!= 真实产品路径已通过
```

## 最后，用一句话理解 ProFlow

ProFlow 的核心不是“多 Agent 自动做事”，而是把长期产品迭代拆成一组：

- 有唯一事实 Owner；
- 有明确授权边界；
- 能恢复真实副作用；
- 能独立验收；
- 能保留失败和历史；
- 知道什么时候进入下一轮；
- 也知道什么时候必须停止；

的正式工程流程。

```text
产品目标
→ 有界 Task
→ 正确 Worker
→ 真实执行
→ Reality Evidence
→ 正式 Task 结果
→ Product Review
→ 下一轮或关闭
```

如果继续深挖，02～07 分别回答复用与控制面、多 Agent 身份、Browser Driver、长期运行、AI 工程治理以及源码到真实产品这六个问题；这篇只负责给它们提供同一张端到端地图。
