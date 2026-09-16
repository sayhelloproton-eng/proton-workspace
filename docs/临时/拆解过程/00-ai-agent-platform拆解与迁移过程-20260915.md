# ai-agent-platform 拆解与迁移过程｜2026-09-15

## 1. 目的

本轮不是继续维护 `ai-agent-platform`，而是把失败旧平台拆开：真实有价值的能力回到正确 Owner，跨项目能力进入 `proton-workspace`，历史经验进入文档，重复实现和过度治理直接删除。

核心原则：**做减法；不整仓迁移；轻映射、重提炼；当前事实回到真实项目 Owner。**

## 2. 新的归属关系

- **ProFlow**：Agent Runtime、Task、Workflow、Execution、Model Runtime、Browser Execution、Deployment 等产品运行真值。
- **proton-workspace**：跨项目复用的 Skills、Tools、Automation、Scripts、研究与长期工程材料。
- **ai-agent-platform**：不再作为产品或底层平台，仅作为 legacy 文档原料库，待 `docs/` 完成最后拆解后退休。

## 3. 已完成的代码与能力拆解

### Skills

旧项目 Skills 已拆解并删除；跨项目能力统一到 `proton-workspace/skills/`。保留并收敛为 `technical-document-writing`、`engineering-retrospective`、`feishu-knowledge-publish`、中文技术写作与 Chat 本机工程/Acceptance 协议等现役 Skill。

### Platform Registry / Agent Profiles

旧 `platform-registry/` 与 `agent-profiles/` 已退休。它们代表了旧体系“文档、代码、飞书、Agent 资产严格映射”的重治理路线，不再重建同类中央控制面。

### Browser MCP Broker

旧 `apps/mcp-shared-broker` 已迁到 `proton-workspace/tools/browser/mcp-shared-broker`，作为共享 Browser MCP 协调器保留。实际浏览器能力仍由 Playwright/Browser MCP 提供。`gptweb-mcp` 与运行时配置的最终 workspace 化、Broker 优化和切换另行处理，不在本轮混入。

### Dev Tunnel

旧 `apps/dev-tunnel` 已删除。ProFlow 的 Microsoft Dev Tunnel 由自身 `dev-tunnel` 模块拥有；`gptweb-mcp` 使用的是 OpenAI `tunnel-client`，不再维护 legacy 通用 Dev Tunnel 包。

### apps/

旧 `action-gateway`、`browser-host-runtime`、`execution-runtime`、`local-runtime` 已全部删除。其真实能力已分别演化进入 ProFlow 的 `agent-gateway`、`task-orchestration`、`execution-runtime`、`execution-browser-extension`、`execution-local`、`model-runtime`、`platform-host` 等正式 Owner。

### packages/

旧 `auth`、`contracts`、`local-control`、`policy`、`task-control` 已全部删除。不再建立中央公共包；认证、合同、策略、Task 与真实 Effect 分别归属于拥有业务语义的当前领域 Owner。

## 4. Context 的裁决

旧 `context/` 把项目定位、架构、阶段、知识治理和 Planner/Executor 规则集中维护为第二套项目事实。随着旧产品退出，这些内容已经大面积失真，并且与当前“自然积累、按主题提炼”的文档策略冲突。

裁决：**整个 `context/` 删除，不迁移，不重建 workspace 级中央 Context 体系。**

仍然有效的经验只保留为原则：项目知识、Task State、用户 Memory 与运行证据不是同一个东西；当前能力必须回到代码、测试和真实运行证据验证。

## 5. Execution Flow Runtime 实验的收口

`experiments/execution-flow-runtime` 是一个有价值的实验，但已经完成使命，不再保留第二套 Runtime 源码。

它验证并推动了这些长期有效的判断：

1. **确定性流程拥有控制流**：模型输出是数据，不能偷偷拥有 `next node`、命令或真实 Effect 权限。
2. **FAST / REASON 是语义角色**：升级由 Flow / Runtime 显式决定，不是模型内部的“思考开关”。
3. **确定性事实不交给模型判断**：必须执行的命令、结构化前置条件应由代码和状态机控制。
4. **Capability 必须受控**：固定 `command_ref`、`shell=false`、rooted file read、allowlist、超时和输出边界优于 raw shell/filesystem。
5. **绑定显式化**：`{"$ref":"..."}` 比魔法字符串绑定更安全、更容易验证。
6. **模型 Provider 是可替换后端**：端侧 MLXHub FAST/REASON 共享串行 Lane，不应反向拥有 Task 或 Effect 真值。
7. **模块只声明部署需求**：模块可以暴露 requirements，但跨模块拓扑、确认和 apply 必须由平台 Deployment Owner 统一处理。
8. **运行结果与 HTTP 传输状态分层**：语法接受后的业务 `completed/blocked/failed` 应由结构化 Result 表达。

这些语义现在已经被更成熟地拆入 ProFlow：`model-runtime` 负责结构化推理，`execution-runtime` 负责真实 Effect / Result / Evidence / UNKNOWN，`execution-local` 负责受控本地执行。因此实验代码、Schema、CLI、Fixtures 和 Live Tests 本轮整体退休；经验保留，代码不迁。

## 6. 本轮一并退休的仓库外壳

旧 `scripts/` 只剩仓库自检，且仍要求已经删除的 `context/`；因此与根 Node/npm 工程壳一起退休：`package.json`、`package-lock.json`、`.nvmrc`、`tsconfig.base.json`、旧项目 `AGENTS.md` 与 `knowledge.config.yaml` 不再作为当前工程入口。

本地生成和运行残留同时清理：`.local-state/`、`.runtime/`、`.omo/`、`tmp/`、`node_modules/`、`.codegraph` 和根 `.DS_Store`。这些不是长期资产，其中 `.local-state/` 还包含历史飞书发布/认证过程数据，更不应迁移。

## 7. docs/ 的当前处理状态

`docs/` 是 legacy 中唯一按资产价值逐项裁决的主体，不复制旧目录树，也不恢复“本地文档 ↔ 飞书 ↔ 代码模块”的严格一一映射。

截至 2026-09-16，第一阶段裁决中的 **A｜保留迁移 150 个文件已经完整物化到 `proton-workspace/docs/` 工作树**：

```text
docs/学习          61
docs/专题研究      30
docs/项目与实践    59
--------------------
A 类合计          150
```

旧仓中这些 A 类路径已经不存在。迁移保留的是材料价值，不是旧平台目录身份；当前项目事实仍回到 ProFlow、ChatWeb、ProFlow RAG 等真实 Owner。

剩余主线是：

```text
B｜吸收提炼 156
→ 按主题与现有 A 类材料去重，只迁独有知识和证据

C｜直接淘汰 701
→ 依赖确认后集中删除，不再维护旧治理、重复 Spec、第三方镜像和过程壳
```

成熟知识后续才进入飞书展示。飞书是知识投影，不要求本地文件数量、目录顺序或代码模块与远端节点严格一一对应。

## 8. 当前停止点

代码、实验 Runtime、Context、旧脚本和本地运行状态已经拆完；A 类长期材料已进入新的 workspace 主题目录。当前 `proton-workspace/docs/` 仍是工作树材料，尚未进入当前 `main` HEAD；因此“Git 真源唯一”还没有完成最终落库。

接下来继续沿唯一裁决清单处理 B、C，并修正 A 中遗留的旧路径/旧 Owner 叙事。完成本地 Review 后再进入 Git；只有成熟主题才进入 Feishu publish 流程。

本轮不 push。任何后续迁移都继续以当前真实项目和 workspace Owner 为准，而不是让 legacy 文档反向约束新架构。
