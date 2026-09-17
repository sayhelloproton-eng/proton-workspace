# ProFlow 如何从源码走到真实可运行产品

源码测试都绿了，为什么用户仍可能运行到旧代码？`pnpm publish` 报错，为什么包可能已经发成功？配置里选了一个“thinking model”，为什么系统仍然不能相信它真的支持所需推理？Custom GPT 在 Builder 里看起来存在，为什么 Deployment 仍然可能不是 READY？

这些问题表面上分别属于部署、发布、外部 SaaS 和模型运行时，背后却反复暴露同一种错误：**把声明当成现实。**

这篇文章只沿一条主线展开：一个“我已经配置 / 构建 / 发布 / 选择好了”的上游声明，要经过哪些 Reality（现实：当前外部系统真实存在的状态）层级，才有资格变成“用户现在真的运行着它，而且它真的具备需要的能力”。

## 先记住两条 Reality Chain

软件从源码走到用户环境，需要逐层建立真值：

```text
Source Truth
→ Package Truth
→ Registry Truth
→ Installed Truth
→ Runtime / Product Truth
```

模型从配置名字走到可用推理角色，也要逐层建立事实：

```text
Provider endpoint
→ live inventory
→ bounded capability probe
→ Capability Profile
→ FAST / REASON role mapping
→ Runtime readiness
```

两条链共享同一个原则：**上游通过，不能冒充下游现实成立。**

## Deployment 为什么最初会长成中央大脑

Phase 3 早期 Platform Deployment（平台部署层：组织模块安装、配置、启动和验证的系统能力）一度拥有非常完整的中央能力：plan、apply、verify、doctor、manifest、effective config、pending action、overall READY 等。

这种设计很符合直觉：系统复杂了，就让一个聪明的 Deployment Planner 把所有步骤编成统一工作流。

真正实现以后却出现一个更根本的问题：Chrome、Tunnel、Model、Agent、Execution 本来就最清楚自己的配置、外部资源和运行状态，Platform 再保存一份，就产生第二个 Reality 数据库。

## Module 自治不是少几个命令，而是把事实还给 Owner

2026-08-20 的一组提交真正删除了中央状态机：

```text
3d12ead
→ 收缩 platform surface

6433de1
→ 删除 plan / state / effective-config / observer persistence

d5f1b4e
→ 删除 DeploymentPlan / DeploymentState / PendingAction

eec2e7f
→ 删除 obsolete deployment helpers

0968242
→ 冻结 Module lifecycle surface
```

Module（模块：拥有自己配置、setup、状态、启动和恢复语义的自治单元）最终统一为七个能力：

```text
install
uninstall
status
setup
docs
start
stop
```

Platform CLI（平台命令行入口：负责发现 Module、按依赖顺序调用并汇总结果）还存在 Workspace 包维护用的 `platform update`，但它不是第八个 Module lifecycle capability。

新的关系可以压成：

```text
Platform knows who to call and in what order.
Module knows how it works and whether it is ready.
```

## `install` 与 `setup` 为什么必须分开

现实系统里至少有三类输入：

```text
Module 自己能确定
→ install / setup 自动 materialize

其它 Owner 已经拥有
→ 通过正式 Contract 获取

只有用户真的知道或必须授权
→ ACTION_REQUIRED
```

Chrome 登录、Tunnel OAuth、Provider Secret、Custom GPT Web 不可能全部在 package install 时静默完成；但也不应该因此把路径、endpoint、可探测配置等机器可以自己完成的东西都丢给用户手填。

所以 `Module.setup` 的产品目标是：**机器能做的自己做；只有用户真的知道或必须授权的内容才要求用户行动。**

SETUP 文档也因此从 SOP（标准操作步骤：告诉人按顺序手工做什么）逐渐变成可执行合同：每一步都要说明 Goal、Executable、Human Action、Verify 和 Success Condition。

## `platform setup` 可以聚合，但不能重新变成 Workflow Owner

Platform setup 会按依赖顺序查看所有 Module，READY 的跳过，non-READY 的调用 owning Module.setup。某个 Module 返回 ACTION_REQUIRED 或 FAILED 时，平台仍可继续观察其它独立 Module，最后一次性聚合结果，降低用户往返。

但 Platform 不保存 step index，不重新拥有 Module private config，也不替 Module 做 repair。

**聚合多个 Owner，不等于拥有多个 Owner 的状态。**

## Custom GPT 为什么也属于 Deployment Reality

源码里存在一个 Agent Package，不代表 ChatGPT SaaS 里已经有对应 Private GPT，更不代表 Instructions、Knowledge、Action Schema、Auth 和 Model 都与当前 package 一致。

Real-2 因此把 Custom GPT Provisioning（资源物化：把本地角色声明真实创建或同步成外部 SaaS Role）纳入正式部署：

```text
Agent Package material
→ GPT Editor
→ Instructions / Knowledge / Capabilities / Action / Auth / Model
→ create or inspect Private GPT
→ stable g-id
→ live readback
→ durable Role
→ Gateway / Carrier validation
```

这里最关键的恢复语义是 `LIVE_CREATED`。远端 GPT 一旦已经创建，后续 validation failure 不能把本地 Role 删除后重新 create；系统必须保留原 g-id，再做只读验证或原位修复。

这说明 Deployment 管的不只是本机进程，也包括 External Resource（外部资源：不在本机进程内，但产品运行依赖的真实对象）。

## Package Version、Contract Version、Schema Version 必须分开

多 package 工程里至少有：

```text
Package Version
Contract Version
Schema Version
Runtime / Module Version
```

实现升级可以继续提供同一 Public Contract；Breaking Contract 也不能只靠 package bump 暗中发生。

正式 packages 也不是 fixed version group（固定版本组：所有包无论是否变化都同步升级）。有真实变化的 package 才独立 bump；依赖传播交给 package manager，而不是 ProFlow 再造第二套 dependency propagation。

## Source 能跑，不代表真正发布的包能被用户消费

Publishability（可发布性验证：把真实打包产物放进隔离 consumer 中安装并调用公开入口）专门建立 Package Truth。

典型链路：

```text
pnpm pack
→ 真实 tarball
→ isolated consumer
→ install --ignore-scripts
→ import public exports
→ smoke published bins --help
```

它能抓到 Workspace 开发环境容易掩盖的问题：exports 指错 dist、文件没进包、artifact 过期、bin 不存在、发布后的依赖无法解析。

所以 `publishability PASS` 只证明 package artifact 成立，不证明 Registry 或用户安装成立。

## stale dist 事故为什么改变了发布真值模型

2026-08-30 的真实 Closeout 出现过：

```text
package.json.version              = NEW
proflow.module.json.moduleVersion = NEW
deployment source descriptor      = NEW
dist descriptor                   = OLD
```

源码检查大量通过，直到 Fresh install 才以 `DESCRIPTOR_INVALID` 暴露。

`bafb4bb` 随后把 canonical release 顺序收敛为：

```text
version / descriptor sync
→ build
→ publishability
→ publish
```

事故真正推翻的是“dist 天然跟着 source 更新”的假设。Build artifact（构建产物：真正被打包和分发的文件）自己就是一层会 stale 的 Reality。

## publish 命令的返回值也不能冒充 Registry Truth

Registry（包仓库：npm 等正式分发系统的权威来源）对 exact `package@version` 的事实至少分成：

```text
PRESENT
MISSING
UNKNOWN / ERROR
```

只有明确 `MISSING` 才应该进入 publish queue。

如果 `pnpm publish` timeout、non-zero 或连接丢失，恢复不是“再 publish 一次”，而是 exact readback：

```text
publish command UNKNOWN / FAIL
→ Registry exact query
→ version exists
   → 接受 APPLIED reality
→ version absent
   → 才按 MISSING 处理
→ Registry query 也 UNKNOWN
   → STOP
```

npm version 是不可重复覆盖的外部事实，所以 blind republish 不是恢复策略。

## Registry 有包以后，还必须重新建立 Installed Truth

Fresh Workspace 安装后，系统要从真实 `node_modules` discovery：

```text
Registry resolution
→ package-manager transaction
→ real node_modules
→ load module descriptor / adapter
→ validate package metadata
→ validate moduleVersion
→ build Module graph
```

因此：

```text
Registry Truth
!=
Installed Truth
```

本地 tarball、npm link、workspace symlink 可以做 Package Gate，却不能拿来证明真实 Deployment Acceptance，因为它们绕过了用户实际经历的 Registry resolution 和 Fresh bootstrap。

## 五层供应链真值最终是怎样分工的

```text
Source Truth
→ 当前源码、Spec、Test 是否一致

Package Truth
→ 真正 pack 出来的 artifact 能否被隔离 consumer 使用

Registry Truth
→ exact package@version 是否真实存在

Installed Truth
→ Fresh Workspace 实际安装了什么

Runtime / Product Truth
→ 当前进程、Extension、模型、外部资源和用户 Journey 是否真的采用并工作
```

最后一层尤其重要：当前 Source 已经升级，不代表正在跑的进程、Chrome Extension 或外部 GPT 已经采用新字节。

用户最终使用的是 Runtime，不是 Git diff。

## 模型也需要自己的 Reality Chain

FAST / REASON 逻辑角色在手机实验之前已经存在。真机实验真正改变的不是角色名，而是让抽象设计遇到物理算力限制。

历史样本观察到：FAST 短请求常见几秒，REASON 可能到几十秒；同设备并发会明显放大延迟，甚至出现 409 / busy；structured output（结构化输出：要求模型按机器可解析格式返回结果）还可能被 reasoning 内容污染。

这些数字只是当时样本，不是今天所有模型的 SLA（服务级别目标：对性能或可用性的正式承诺）。

留下来的工程结论是：**逻辑推理角色不能假设拥有独立物理通道。**

## Single-flight 为什么比“并发两个模型角色”更符合端侧现实

同一物理设备上，FAST 和 REASON 可能只是同一个模型的不同推理模式，也可能共享一个推理后端。

历史策略因此收敛到 single-flight（单通道串行：同一物理推理通道一次只运行一个请求）+ bounded priority queue（有界优先级队列）。

业务 Flow 只表达“这次需要 FAST 还是 REASON”；设备并发、模型切换、资源竞争、timeout 和 cancellation 由 Model Runtime 吸收。

这样具体手机或本机模型的物理限制不会泄漏成每条业务 Workflow 的特殊分支。

## Provider 为什么不应该暴露设备身份

2026-08-26 的 `ea9bed3 / 47bc8dc` 把 Provider（模型服务提供端：暴露兼容推理接口和模型 inventory 的实际服务）收敛为：

```text
OpenAI-compatible HTTP(S) URL
+ optional authentication
+ /v1/models inventory
+ reachability / protocol observation
```

iPhone、具体 App、某个本地推理产品、FAST / REASON 映射都不应该进入 Provider Contract。

Provider 只回答“我现在提供哪些可调用模型”；Model Runtime 再通过真实请求判断这些模型具备什么能力。

## Model ID 为什么不是 Capability Evidence

模型名字里带 `think / no-think / vision` 只能是候选信号，不能作为能力证据。

Model Capability Profile（模型能力档案：通过真实 probe 记录文本、视觉、结构化输出、思考模式、上下文和输出边界）必须来自 live probe（在线探测：向当前服务发真实受限请求验证能力）。

历史验证还暴露过 Provider 差异：thinking 可能出现在 `<think>`，也可能在 `reasoning_content`；structured output 有的原生支持 `response_format`，有的只能依靠 prompt + parse / repair。

因此 Runtime 信的是“实际成功过的协议行为”，不是模型名或产品宣传。

## Endpoint 可以记住，READY 仍然必须服从当前现实

一个 Provider URL 即使当前不可达，也可能是用户已经明确提供过的非敏感 intent。完全丢掉它会让服务恢复后用户重复输入。

所以需要区分：

```text
用户曾经选择过 endpoint
!=
endpoint 当前已经验证 READY
```

URL 可以持久化，下次 setup 重新 probe；服务不可达时不能发布 fake READY。Inventory fingerprint 改变后，旧 Capability Evidence 和 role mapping 也应该失效并重新验证。

## 分层算力真正解决的是什么

最终结构不是“手机模型替代云模型”，而是把不同认知成本放到不同层：

```text
ChatGPT / 高能力模型
→ 产品讨论、架构裁决、复杂规划、长上下文认知

ProFlow Model Runtime
→ ReasoningSpec、Policy、FAST / REASON routing、受控 assessment

本地 / 手机 / LAN 模型
→ 高频、bounded、结构化、低成本推理

Local / Browser / External Reality
→ 真正 Effect 与 Evidence
```

端侧模型的价值来自任务收缩：上下文更小、输出更严格、权限更低、频率更高、失败更容易回退，而不是让小模型成为完整 Agent Controller。

## 从 Source 到 Product，最后真正要回答的问题

部署、发布和模型运行时看起来是三套工程，实际上一直在反复阻止下面这些偷换：

```text
Platform state
不能冒充 Module reality

source version
不能冒充 dist artifact

publish command
不能冒充 Registry reality

Registry package
不能冒充 Fresh installed reality

installed package
不能冒充 current Runtime adoption

model name / config
不能冒充 live capability

旧 capability evidence
不能冒充当前 provider readiness
```

这些 readback、probe、Fresh Workspace、外部资源验证会让产品化比“改源码并跑测试”慢很多，却换来一个真正重要的能力：当用户问“我现在运行的是什么、这个模型现在真正能做什么”时，系统能够沿着 Evidence 链回答，而不是沿着配置文件猜。

## 历史来源与证据入口

这篇文章主要吸收：`06-Deployment从Planner到Module自治.md`、`10-手机模型实验如何塑造Capability-Driven-Model-Runtime.md`、`12-发布与Registry从源码绿灯到供应链真值.md`、`15-Custom-GPT从在线配置到外部Deployment-Resource.md`，并吸收 `17-从UNCERTAIN到Reality-Reconciliation.md` 中发布 UNKNOWN / readback 的恢复原则。

历史材料解释这些 Reality Chain 为什么出现；今天 exact package version、Module readiness、Provider capability、Runtime adoption 和外部资源状态，仍必须回当前 Registry、Installed Workspace、Runtime 和真实页面核对。
