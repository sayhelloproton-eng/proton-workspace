# L4｜Agent、Runtime 与 Harness

> 这一层回答：**一次模型调用怎样变成长任务，Runtime 与 Harness 为什么必须分工？**
>
> 阅读方式不是按字母背词，而是先看下面的关系链，再把每个术语放回真实系统位置。

~~~text
Goal / Task → Runtime State → Harness(Context + Tool + Workspace + Validator) → Model / Agent Loop → Result → State
~~~

## 术语表

| 术语 | 一句话 | 典型场景 | 关键边界 / 易混 |
|---|---|---|---|
| Agent（智能体） | 围绕 Goal，基于 Context 和反馈持续决定下一步的执行主体。 | 代码 Agent、Research Agent、Worker。 | Agent ≠ Model；还需要 Runtime、Tool、State。 |
| Agent Loop | Agent 反复执行 Observation → Decision → Action → Observation 的控制循环。 | ReAct、连续 Tool Calling。 | Loop 是运行机制，不等于 Workflow。 |
| Runner | 驱动 Agent Loop 或执行单次 Agent Run 的运行组件。 | SDK Runner、内部执行器。 | Runner 是实现组件，不等于长期 Runtime。 |
| Agent Runtime | 维护 Task/State、装配 Context、调用 Model、执行 Tool 并推进长期责任的运行层。 | 长期 Agent、Tool Result 回填、Resume。 | Runtime ≠ Harness。 |
| Observation | 从环境或 Tool 直接看到的事实。 | HTTP 401、Task FAILED、按钮 disabled。 | Observation ≠ Assessment/Finding。 |
| Planning | 根据 Goal、State 和约束形成下一步或多步方案。 | 复杂任务拆解。 | Plan 是可变假设，不是 Current Truth。 |
| Next-step Decision | 在当前 Observation 后决定下一步 Action。 | 继续检索、调用 Tool、等待、停止。 | 是 Agentic Decision 的最小单元。 |
| Stop Condition | 满足某种成功、阻塞、风险或预算条件时结束当前 Loop。 | Goal 完成、需要 Approval、预算耗尽。 | 没有 Stop 会导致无限搜索/反思。 |
| Goal | 希望系统最终达成的业务结果。 | 完成重构、回答研究问题。 | Goal ≠ Plan ≠ Task Contract。 |
| Plan | 基于当前事实形成的执行方案。 | 先修 Owner 再验证。 | Plan 可以因新 Evidence 改变。 |
| Task | 有 Goal、Scope、状态和完成判定的正式工作对象。 | ProFlow Task、Research Task。 | Task 可跨 Session/Execution 持续。 |
| Runtime Task | 由 Runtime 持久化和调度的任务实例。 | WAITING、RUNNING、FAILED、Resume。 | Runtime Task ≠ MCP Task/Chat Thread。 |
| Task Identity | 一个长期 Task 的稳定身份。 | 跨重启、Reopen、Handoff 仍保持同一 Task。 | 不能用 Session ID 替代。 |
| Status | Task/Run 当前所处的正式状态。 | READY、RUNNING、WAITING、FAILED。 | 自然语言总结不能替代正式 Status。 |
| Turn | 一次对话或 Agent Loop 的局部轮次。 | 模型输入→输出。 | Turn ≠ Task。 |
| Thread | 保存一串对话或消息上下文的会话容器。 | Chat Thread。 | Thread ≠ Runtime Task。 |
| Session | 某个宿主/连接的会话生命周期。 | Chat、Terminal、Browser Session。 | Session 结束不应让 Task 消失。 |
| Run | 一次执行尝试或一轮 Agent 运行实例。 | 同一 Task 多次 Run。 | Run ≠ Task Identity。 |
| Model Invocation | Runtime 对模型发起的一次具体调用。 | 一次 completion/response。 | 一个 Run 可以包含多次 Invocation。 |
| Task Continuity | 长期 Task 在 Session、Process、Worker 变化后仍保持责任连续。 | 换班、重启、故障恢复。 | 依赖持久 State，不依赖聊天记忆。 |
| Task World | 完成 Task 所需的持久事实集合。 | State、Artifact、Evidence、Pending Work。 | 恢复时重建 Context 的基础。 |
| Parent Task | 拆分子责任时拥有总体 Outcome 的上级 Task。 | 多 Agent 分工。 | Parent 不能把最终责任完全委派掉。 |
| Child Task | 由 Parent 委派、可独立验收的局部 Task。 | 模块审计、局部研究。 | Child 完成不等于 Parent 成功。 |
| Dependency | 某 Task/Node 开始或完成前依赖的其他事实或工作。 | 先 Build 再 Acceptance。 | Dependency 应是显式关系。 |
| Artifact Reference | 指向 Task 产物的稳定引用。 | commit、spec、report、zip。 | Reference ≠ Artifact 内容副本。 |
| Runnable | 当前所有前置条件满足、可以被 Scheduler 执行的状态。 | READY Node。 | 存在 Task 不等于 Runnable。 |
| Late Result | 旧 Run/旧 Version 在新状态之后才返回的结果。 | 异步 Tool 超时后迟到响应。 | 必须用 Version/Operation Identity 防止覆盖新状态。 |
| Namespace | 隔离不同任务、租户或运行域身份的命名边界。 | 多租户、多并行 Task。 | Namespace 不等于 Permission。 |
| Harness（工程托架） | 围绕模型组织 Instructions、Context、Tool、Workspace、验证和反馈的工作环境。 | Coding Agent、Browser Agent。 | Runtime 让责任持续；Harness 让当前一轮更容易做对。 |
| Work Environment | Agent 当前可读取、可写、可执行的实际工作环境。 | repo、worktree、browser profile、services。 | 路径正确不代表 Identity/Freshness 正确。 |
| Output Contract | 规定 Agent 结果必须包含哪些状态、Artifact、Evidence 和风险。 | Handoff、Subagent 结果。 | 输出格式不是装饰，而是下游消费合同。 |
| Programming the Path | 开发者预先编写固定步骤和分支。 | 传统 Workflow。 | Agent 时代不能覆盖所有动态情况。 |
| Programming the Environment | 通过工具、上下文、权限和反馈设计 Agent 可探索空间。 | Harness Engineering。 | 不是放弃控制，而是改变控制位置。 |
| Instruction | 向 Agent 说明 Goal、Scope、规则和约束的控制信息。 | System/Developer/Project rules。 | Instruction ≠ 外部 Data。 |
| Instruction File | 把长期项目规则版本化保存的文件。 | AGENTS.md 类规则文件。 | 文件本身不是 Agent。 |
| Discovery Rule | Runtime 决定到哪里寻找 Instruction/Skill/Tool 的规则。 | 目录继承、插件发现。 | 发现规则决定哪些配置真正生效。 |
| Precedence | 多个指令来源冲突时的优先级。 | System > project > user > external data。 | 优先级是安全边界。 |
| Instruction Hierarchy | 按权威等级组织多层指令的整体结构。 | 系统/开发者/用户/外部内容。 | 低权 Data 不能升级成高权 Control。 |
| Untrusted Data | 可能包含恶意或误导指令、但只应作为数据处理的内容。 | 网页、RAG Chunk、邮件。 | Untrusted Data ≠ Instruction。 |
| Minimal Sufficient Context | 足以完成当前 Decision、但不过量的最小工作集。 | 大仓库只读相关模块和契约。 | 越多 Context 不一定越强。 |
| Tool Surface | 当前暴露给模型可选择的 Tool 集合。 | Harness 动态裁剪工具。 | Tool Surface 应受 Permission 和相关性限制。 |
| Permission Filtering | 在模型看到 Tool 前先按硬权限过滤能力。 | 读写分离、生产工具隐藏。 | Permission Filter 应先于模型选择。 |
| Skill | 可复用、仍需要模型判断的程序性知识和方法。 | 工程协议、调试方法。 | Skill ≠ Tool ≠ Script。 |
| Procedural Knowledge | 描述“如何完成某类任务”的知识。 | 检查顺序、停止条件、验证方法。 | 成熟确定性过程可下沉 Automation。 |
| Workspace | Agent 当前工作的仓库、worktree、浏览器或文件集合。 | 代码 Agent 修改项目。 | Workspace Identity/Freshness 必须可验证。 |
| Workspace Fingerprint | 用一组稳定事实确认工作环境仍是开始时那个环境。 | repo、branch、HEAD、WIP、service identity。 | 发现漂移应重新 Acquire。 |
| Identity | 主体或资源的稳定身份。 | Agent、Worker、Task、Workspace、Service。 | Identity ≠ 当前 Session。 |
| Compiler | 把源代码转为目标形式并发现语义/类型错误的工具。 | Coding Harness Validator。 | 可提供高密度确定性反馈。 |
| Type Checker | 验证类型约束是否成立的确定性工具。 | TypeScript、静态检查。 | 不能替代运行时业务验证。 |
| Linter | 检查代码风格和部分静态问题的工具。 | 代码质量 Gate。 | Lint PASS ≠ Build/Test PASS。 |
| Validator | 用确定性规则或外部 Evidence 检查结果是否满足要求。 | Schema、Test、Diff、Browser Readback。 | 能机械验证的不要交给 LLM 自证。 |
| Feedback Density | Agent 每做一步能获得多少具体、可行动反馈。 | Compiler/Test/Diff 比纯视觉页面反馈密度高。 | 高反馈密度能缩短错误传播链。 |
| Budget | 限制 Agent 可消耗的 turns、tokens、tool calls、wall time、money 等资源。 | 开放 Loop。 | Budget 是治理机制。 |
| Stop Rule | 明确成功、等待、升级、失败和预算耗尽时何时停止。 | 避免模型无限工作。 | Stop Rule 与 Goal/Acceptance 一起定义终点。 |
| Sandbox | 通过文件、进程、网络和权限隔离限制影响范围。 | 代码 Agent、Browser Agent。 | Readable world ≠ Writable world。 |
| Blast Radius | 某个错误动作可能影响的最大现实范围。 | 生产写入、全盘删除。 | Sandbox 的目标之一是缩小 Blast Radius。 |
| Guardrail | 在输入、执行、输出或副作用阶段阻止越权和失控的约束。 | 风险 Tool、Prompt Injection。 | Guardrail 不应只是自然语言提醒。 |
| Harness Eval | 评估 Context、Tool Surface、Instruction、Workspace、Validator 是否给模型正确工作条件。 | 排查“模型差”还是环境差。 | Harness 问题会制造假红灯。 |

## 这一层必须真正会区分

- **Model ≠ Agent ≠ Runtime ≠ Harness**：智能核心、判断主体、长期运行层、当前工作环境四层不同。
- **Task ≠ Run ≠ Session ≠ Model Invocation**：长期工作对象、执行尝试、宿主会话、单次模型调用的生命周期不同。
- **Instruction ≠ Data**：外部网页/RAG/Tool Result 首先是 Data，不能自动提升成控制规则。
- **Tool Surface ≠ Runtime Capability Set**：给模型看的能力应该是经过权限和相关性裁剪后的子集。
- **Summary ≠ Checkpoint**：语义压缩不能替代恢复所需的正式事实。
