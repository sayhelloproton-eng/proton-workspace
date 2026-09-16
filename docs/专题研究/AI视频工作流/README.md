# AI 视频工作流｜产品概念与低成本验证路线

> 状态：`RESEARCH_CANDIDATE / IMPLEMENTATION_NOT_STARTED`
> 定位：保留旧平台时期已经形成、但不依赖旧平台架构的 AI 视频产品思路；作为后续业务 Demo / 产品验证候选，不把历史平台组件写成当前实现事实。

## 1. 为什么这个主题值得保留

AI 视频创作不是一次“Prompt → 视频”。稳定作品通常还需要：

- 理解故事、人物、场景和冲突；
- 维持人物外观、场景风格和镜头连续性；
- 把章节拆成分镜、镜头和生成任务；
- 在图像、视频、声音 Provider 之间选择与替换；
- 记录输入、模型、参数、成本、结果和失败；
- 支持人工复审、修订、重试和版本管理；
- 最终形成可展示、可解释、可追踪的作品。

因此它适合作为一个真实业务纵向切片：既能验证生成模型能力，也能验证结构化业务对象、Provider Adapter、人工 Review、成本、Evidence 和 Recovery 是否真的给用户带来价值。

## 2. 当前阶段

当前只承诺“概念和验证路线成立”，不声称已经存在 AI 视频产品。

```text
Concept accepted
→ 选择真实故事样本
→ 做最小纵向切片
→ 观察人工编辑价值 / 质量 / 成本
→ 再决定是否进入正式产品设计
```

旧文档曾把它描述为某个平台的第一个上层业务产品；这个平台身份已经失效。现在只保留业务问题与实验价值。

## 3. 四个低成本验证切片

### Slice 1｜Story → 可编辑结构

输入一段真实故事，输出候选：

```text
Story
Character
Scene
Chapter
Conflict / Plot Point
```

同时保留来源位置、版本、置信度和人工修订。

验证问题不是“模型能不能总结故事”，而是：**结构化结果是否真的帮助人理解、修改和继续创作。** 如果只是换一种格式复述原文，没有编辑价值，就停止扩大架构。

### Slice 2｜批准结构 → Storyboard / Shot Plan

把人工确认后的故事结构转换为：

```text
Storyboard
Shot
Camera
Duration
Continuity Constraints
```

验证：镜头计划能否被人稳定修改；修改后是否仍能追溯到人物、场景和故事对象；连续性约束是否真正降低返工。

### Slice 3｜单 Shot → Prompt → 单 Provider

先只接一个真实 Provider，不提前建设全模型平台。

记录：

```text
Shot
→ Prompt / Constraints
→ Provider + Model + Parameters
→ Result
→ Latency / Cost / Failure
```

验证：Provider 私有字段是否能被限制在 Adapter；一次失败是否可解释；生成质量和成本是否处于可接受范围。

### Slice 4｜Review → Retry → Demo

对多个候选结果做人工 Review，记录：

```text
Evaluation
Issue
Revision
Approval
Final Demo
Evidence
```

验证：用户能否明确知道“为什么改、改了什么、哪一版更好”，最终形成一个可展示作品，而不是只留下大量不可追踪的生成文件。

## 4. 领域对象只作为候选

第一轮可能需要的对象包括：

| 领域 | 候选对象 | 第一验证问题 |
|---|---|---|
| Story | Story / Chapter / Plot Point / Conflict | 能否表达原故事且允许人工修订？ |
| Character | Character / Appearance / Trait / Reference | 人物设定能否跨阶段复用？ |
| Scene | Scene / Location / Time / Mood | 场景语义能否变成视觉约束？ |
| Shot | Storyboard / Shot / Camera / Duration | 是否形成真正可执行的镜头计划？ |
| Prompt | Template / Version / Negative Constraint | 能否稳定承接上游领域约束？ |
| Generation | Provider / Model / Parameter / Result | 一次生成的事实和成本能否回查？ |
| Review | Evaluation / Issue / Revision / Approval | 是否形成可解释的质量闭环？ |
| Asset | Image / Video / Audio / Metadata / Lineage | 资产来源和版本是否可追踪？ |

这些对象在真实 Slice 证明需要之前都不冻结为完整 DDD，也不因为“以后可能用”提前建立 Registry。

## 5. 产品与通用工程能力的边界

AI 视频业务应该拥有：

- 故事、人物、场景、分镜；
- 创作体验与人工编辑流程；
- 媒体质量标准；
- 作品与媒体资产的业务意义。

通用工程层只在真实重复出现后考虑抽取：

- Task / Result / Recovery；
- Provider Adapter；
- Approval / Evidence；
- 成本与调用记录；
- 安全执行和可观测性。

一个机制只服务 AI 视频时，就先留在产品内；只有第二个真实场景也需要同一稳定责任，才重新评估共享层。

## 6. 进入开发前的 Evidence Gate

至少先具备：

- 一个真实故事样本；
- 明确的第一用户与“完成”定义；
- Slice 1 的人工编辑验收标准；
- 媒体版权、隐私、内容安全边界；
- 第一 Provider 与成本预算；
- 大型媒体不进入公共 Git 的存储策略；
- 明确停止条件。

停止条件可以包括：结构化没有编辑价值、人物/镜头连续性无法改善、生成成本不可接受、Provider 可用性不足，或者业务实验明显拖慢更高优先级主线。

## 7. 非目标

当前不做：

- 完整视频编辑器；
- 全自动长片生产；
- 一开始就接入大量 Provider；
- 完整媒体资产平台；
- 全套专业 Agent 组织；
- 用未来架构图冒充已经实现的产品。

## 8. 风险与后续研究

后续真正打开本专题时，需要重新核验：

- 当前主流图像 / 视频 / 音频模型质量、价格、区域和 API；
- 人物一致性与长镜头连续性的当前能力边界；
- 审美评估怎样结合人工 Rubric 与可机械指标；
- 媒体存储、Hash、Lineage 和版本的最小实现；
- 云端生成与本地编排的成本和吞吐；
- 版权、隐私、内容安全和 Provider 条款。

在这些外部事实重新验证前，本文只作为产品研究候选，不作为实现合同。
