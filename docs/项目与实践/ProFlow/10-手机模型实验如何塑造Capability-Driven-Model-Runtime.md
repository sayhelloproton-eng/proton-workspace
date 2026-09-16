# ProFlow｜手机模型实验如何塑造 Capability-Driven Model Runtime

> 状态：ACTIVE_RESEARCH / STRONG_EVIDENCE
> 建立：2026-09-04
> 主题：真实手机/LAN 小模型实验如何把 ProFlow 已存在的 FAST/REASON 抽象，进一步压实为能力驱动、可验证、可替换的 Model Runtime。
> 边界：本文区分“历史手机实验事实”和“当前 ProFlow Contract”；历史 Qwen/MLXHub/具体 IP 不得写回当前平台合同。

## 1. 先纠正一个容易讲错的故事

不能说：

```text
先有手机模型
→ 才发明 FAST / REASON
```

`GIT_VERIFIED` — ProFlow 在 2026-08-13 的 `0af3601` 就已经建立：

```text
FAST / REASON / AUTO
ReasoningSpec
ModelCapabilityProfile
priority lane
capability verification
```

所以手机实验的价值不是“创造角色”，而是：

> **把抽象角色放进真实受限算力后，逼出更严格的物理边界、验证合同和调度策略。**

## 2. 初始抽象已经把“角色”和“模型身份”分开

`0af3601` 的 `ModelCapabilityProfile` 已经描述：

```text
modelRef
reasoningModes: thinking / no-thinking
inputModalities: text / image
structuredOutput: native / prompted / unsupported
contextWindow
maxOutputTokens
```

`ReasoningSpec` 则描述一个调用需要什么：

```text
allowedModes
requiredModalities
maxContextBytes
maxOutputTokens
routing.startRole
allowReasonEscalation
```

这已经埋下一个关键原则：

> **Role 是业务语义；modelRef 只是部署时的物理身份。**

## 3. 真机首先证明：FAST 和 REASON 的成本不是同一个量级

`HISTORICAL_VERIFIED` — 旧 ai-agent-platform 手机实验中，同一手机/LAN 后端的 FAST 与 REASON 呈现明显不同的现实成本。

历史样本里：

```text
FAST 短请求约 3～4 秒
REASON 常见数十秒，部分样本约 46 / 80 / 104 秒
```

REASON 还真实出现过：

```text
<think> 未闭合
最终 JSON 缺失
长 reasoning 占满响应预算
```

因此模型角色开始从“两个能力档位”进一步变成调度政策：

```text
FAST = 高频、同步、受控、默认路径
REASON = 低频、显式升级、窄问题、允许慢
```

`DERIVED` — 小模型的价值不是“便宜地复制高级模型”，而是**把确定、受控、高频的认知工作压缩到足够小的角色边界**。

## 4. 真机第二个教训：物理并发必须服从设备现实

`HISTORICAL_VERIFIED` — 手机 MLXHub 实验最终把推理后端视为一条共享 lane：

```text
同设备 FAST + REASON
→ 共享物理算力
→ 跨模型并发可出现 409 model_busy

同模型并发
→ 延迟明显上升
→ 没有得到足以抵消风险的吞吐收益
```

因此历史执行合同收敛为：

```text
max inference concurrency = 1
FIFO / bounded priority
```

这不是业务 Flow 的责任。

`DERIVED` — 业务只表达“这个请求要 FAST 还是 REASON”；**设备串行、模型切换和资源竞争应该由 Runtime/Scheduler 吸收**，不能把手机物理限制泄漏成每条 Workflow 的特殊分支。

## 5. 第三个教训：不要相信“理论上可以动态开关 Thinking”

`HISTORICAL_VERIFIED` — 当时手机 MLXHub 路线实际尝试过多种动态 thinking 参数，包括 `enable_thinking`、`reasoning_effort` 等，但没有形成可靠的同 model ID 动态切换。

历史实现因此采用：

```text
FAST → no-thinking 物理模型
REASON → thinking 物理模型
```

并允许 Runtime 在两个已安装模型之间切换。

这里最重要的不是那个具体后端限制，而是验证原则：

> **Provider 声称支持什么，不等于 Runtime 已经拥有该能力。**

当前 ProFlow Provider 接口虽然允许按 FAST/REASON 注入不同 `roleBody`，但当前自动 Deployment Mapper 仍以每个 inventory model 的实测 reasoning mode 为资格依据。

因此本文不声称“当前 ProFlow 已证明同一个 model ID 可以可靠承担双角色”。

## 6. 真正的架构转折：把“手机模型”从 Provider Contract 里删除

`GIT_VERIFIED` — 2026-08-26 `ea9bed3 / 47bc8dc` 明确重构 `model-provider-api`：

```text
输入 = OpenAI-compatible HTTP(S) URL
观察 = /v1/models inventory + auth + protocol + current reachability
输出 = verified URL / protocol / inventory / observedAt
```

并明确禁止 Provider 层发布：

```text
设备身份
设备发现协议
MLXHub / Provider 产品名称
FAST / REASON 映射
```

文档直接写：本模块“不识别具体设备、应用或 Provider 产品”。

`DERIVED` — 这是 Layered Compute 真正可迁移的基础：

> 手机只是某次 Deployment；平台只消费协议和能力事实。

## 7. Runtime 不让用户先选模型，而是先让机器证明能力

8 月 26 日后的 Model Runtime 会读取 Provider 的真实 inventory，然后逐个做 bounded probe。

FAST 合格条件包括：

```text
text
Vision
structured output
no-thinking
context >= 16384
max output >= 2048
```

REASON 合格条件包括：

```text
text
structured output
thinking
context >= 16384
max output >= 2048
```

正常路径不要求用户填写 FAST / REASON model ID。

只有多个**已经通过能力验证**的等价候选仍无法唯一排序时，才 `ACTION_REQUIRED` 让用户选择。

## 8. Model ID 只做 inventory identity，不能替代 Capability Evidence

自动映射的顺序是：

```text
真实 inventory
→ 对每个 model 做 bounded probe
→ 形成 ModelDeploymentEvidence
→ 过滤 FAST / REASON 合格候选
→ previous mapping 仍合格则优先复用
→ 唯一候选自动映射
→ metadata 只做候选间辅助排序
→ 仍歧义才找用户
```

模型名里的 `fast / think / no-think` 可以作为 tie-break signal，但不能把一个未验证模型直接升级成 READY。

人工选择也不能绕过验证。

`SOURCE_VERIFIED` — 当前测试明确覆盖：即使用户把同一个不具备 THINK 能力的候选同时指定给 FAST/REASON，Role Validation 仍必须失败。

这把“选择哪个模型”从配置问题转成了**证据约束下的角色映射问题**。

## 9. 8 月 30 日真实 Deployment 又打掉了“能力声明等于能力事实”

`GIT_VERIFIED` — `20f0483` 专门修复 Model Runtime capability verification。

真实 Provider 差异包括：

```text
Thinking 可能出现在 <think>...</think>
也可能单独出现在 reasoning_content

Structured Output 可能原生支持 response_format
也可能只能靠 Prompt 产生严格 JSON
```

因此探测逻辑改成：

```text
先真调用 native structured output
→ 成功才记录 native
→ 失败再真调用 prompted path
→ 只接受裸 JSON 或整个响应只有一层 JSON fence
→ prose + JSON 仍 fail-closed
```

这让 Capability Profile 记录的是**实际成功过的协议行为**，不是配置宣称。

## 10. URL 也不是一次性配置，而是可恢复的外部 Reality

真实 Deployment 还暴露过一个产品问题：用户输入的 Provider URL 当时不可达，系统没有保留这个非敏感 binding；服务恢复后又要求用户重新输入。

后续修复把两件事分开：

```text
用户已经提供的 endpoint binding
≠
当前 endpoint 已验证 READY
```

所以可以安全持久化 URL，让下一次 setup 重新 probe；但在真实服务不可达时：

```text
不发布 fake READY shared fact
不猜 inventory
不把旧 capability evidence 当 live truth
```

`DERIVED` — Recovery 的关键不是“记住上次成功”，而是**保留可重试的配置意图，同时让 READY 永远服从当前 Reality**。

## 11. Inventory 变化会让旧映射失效，而不是继续“看起来能跑”

当前 Deployment 会持久化：

```text
inventoryFingerprint
FAST / REASON mapping
Capability Profiles
probe evidence
verifiedAt
```

`SOURCE_VERIFIED` — `status` 会重新观察 Provider inventory；如果 fingerprint 已变化：

```text
MODEL_MAPPING_STALE
→ setup BLOCKED
→ 重新自动验证 / 映射
```

不会因为本地还留着旧 `role-mapping.json` 就继续宣布 READY。

这把模型部署从静态 config 文件提升成了**受外部 inventory 变化驱动的可失效能力绑定**。

## 12. 分层算力的真正含义：把不同成本的认知放在不同层

这条历史最后形成的不是“手机替代云模型”，而是：

```text
ChatGPT / 高级模型
→ 产品讨论、架构裁决、复杂规划、长上下文认知

ProFlow Runtime
→ ReasoningSpec、Policy、FAST/REASON routing、边界与证据

本地 / 手机 / LAN 小模型
→ 高频、bounded、结构化、低成本推理

Local / Browser / External Reality
→ 真正 Effect 与 Evidence
```

手机层的价值来自**任务收缩**：

```text
上下文更小
输出更严格
权限更低
频率更高
失败更容易回退
```

而不是让端侧模型接管整个 Agent Loop。

## 13. 模型只给建议，确定性 Policy 和 Human Gate 仍在上层

旧手机能力验证与当前 ProFlow 都保持同一条 Authority 边界：

```text
Deterministic hard rule
→ FAST
→ 必要时 REASON
→ 必要时 Human / Approval
```

模型不能因为输出 `ALLOW` 就覆盖硬规则，也不能把 confidence 变成 workflow authority。

当前 ReasoningSpec 甚至会明确：

```text
FAST-first bounded classification
REASON only escalation
Human Approval remains caller-owned
```

低频 Task Diagnostic 也只允许：

```text
诊断 supplied facts
建议 next observation / recovery
禁止 complete / reopen / approve / retry / replay
```

`DERIVED` — 小模型是**bounded decision substrate**，不是自治 Controller。

## 14. 用户心智也被压缩：正常 setup 只要求机器无法推导的东西

最终产品化路径是：

```text
Provider
→ 尽量自动获得 URL / credential state / inventory

Model Runtime
→ 自动 probe capability
→ 自动映射 FAST / REASON

User
→ 只在 URL 无法机器获得时提供 URL
→ 只在多个已验证等价候选仍歧义时做一次选择
```

而不是：

```text
请用户理解手机型号
请用户理解 MLXHub
请用户手填两个 model ID
请用户自己判断哪个支持 Vision / Thinking / Structured Output
```

这和 Deployment 的大原则一致：**machine-owned fact 自动流转，ACTION_REQUIRED 只保留不可约的人类信息。**

## 15. Trade-off：Capability-driven 不等于“更简单”

这套抽象把设备细节挡在平台外，但代价是真实存在的：

```text
inventory probe 本身有耗时
候选之间要冷却，真实 setup 会变慢
严格 structured/thinking 验证可能拒绝“差不多能用”的 Provider
单 lane / 低并发牺牲理论吞吐
inventory drift 需要重新验证
映射歧义仍可能需要人类选择
```

但如果省掉这些成本，系统会重新退化成：

```text
根据 model 名猜 capability
根据旧 config 猜 READY
把设备并发限制泄漏给 Flow
让用户手工维护物理 model mapping
```

项目选择的是：**用更昂贵的 setup/probe，换运行期更稳定的语义合同和部署可替换性。**

## 16. Resume / Interview 边界

可以安全讲：

> 基于真实 iPhone/LAN 小模型实验验证 FAST/REASON 的延迟、Thinking、Structured Output 与并发限制，并将这些物理约束收敛到 Capability-driven Model Runtime：平台 Provider 只认 OpenAI-compatible URL 和 live inventory，Runtime 通过真实 probe 建立 Capability Profile、自动映射 FAST/REASON，只有证据无法消除歧义时才要求人工选择；上层 Flow 因而不绑定设备、模型名称或具体本地推理产品。

更准确的项目亮点不是“在手机跑了模型”，而是：

> **Physical Model Experiment → Capability Contract → Portable Layered Compute。**

不要夸大为：

- FAST/REASON 是手机实验后才发明；
- 当前平台固定依赖某个 Qwen、MLXHub 或 iPhone；
- 当前已证明任意同一 model ID 都能动态切换 think/no-think；
- 手机模型承担完整 Agent Controller；
- 已有生产级吞吐/SLA。

当前能证明的是：**真实端侧限制被转译成 Runtime capability、routing、recovery 与 setup policy，而没有泄漏成业务 Flow 的设备特例。**
