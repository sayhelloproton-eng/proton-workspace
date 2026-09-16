# 01｜P0 工程与 SDD 执行骨架

状态：已结项（2026-09-04 用户确认）

## 阶段目标

建立最小 pnpm Workspace、NestJS + Fastify API、公共 wire contract、配置与基础验证，让后续 RAG 能力有稳定承载体，但不提前实现 Knowledge/Retrieval/Generation。

## 为什么 P0 必须先做

真实 RAG 不是 Notebook。后面每一步都会依赖编译、配置、模块边界、数据库、脚本和验证入口。P0 的目的不是做“架子工程”，而是把后续实验放进一个可持续演进、可审计的工程环境。

## 本阶段重点学习

- Monorepo 中两个部署单元为什么是 `apps/api` 与 `apps/site`。
- DDD Context、Capability、Infrastructure、Delivery 怎样映射到代码，而不互相越权。
- `site-api-contract` 为什么只能共享 wire protocol，不能泄露 Domain Model。
- SDD Requirement → implementation → verification evidence 怎样开始真正闭环。

## 当前已知 Gate

`build + typecheck + health smoke + architecture boundary` 通过后，才进入 P1 Knowledge Management。

## 实战记录

从真正创建工程文件开始追加。所有出现的问题、返工、工具选择、依赖冲突和验证结果都保留在本文件，而不是只写最终状态。
## P0 前置｜先建立跨 Chat 上下文连续性

在真正创建 NestJS 工程前，先参考 ProFlow `spec/平台架构与公共约定/00-公共上下文`，把已经验证过的长项目接力机制迁移到 `proflow-rag/docs/context/`。这个动作解决的不是 RAG 算法问题，而是长周期工程中“换 Chat 后重新学习、重复探索、忘记 Gate”的执行风险。

没有照搬 ProFlow Phase 3 的 Deployment、Real-3、Browser 等专用知识，只保留可迁移机制：长期规则 / CURRENT / Runbook / 历史四层 ownership、`CURRENT.REQUIRED_CONTEXT` 动态加载、Authority 分层、`DO_NOT_REPEAT`、Round Closeout 和失忆接管检查。

RAG 项目又增加了自己的要求：当前阶段轴固定为 P0→P8；关键能力必须先讲解再实现；每个阶段同时更新 Verification 与本实战档案；设计变化仍回 SDD，不允许公共上下文变成第二套 Spec。

真实验证不是“目录创建成功”，而是模拟一个失忆执行者只读取最小入口。Gate 结果：`CURRENT_COUNT=1`、`REQUIRED_CONTEXT_PATHS=7`、成功恢复 `P0_ENGINEERING_SKELETON`、`BLOCKER=NONE`、`FORGETFUL_HANDOFF_GATE_PROBLEMS=0`。

工程证据：`proflow-rag@7ded602` 建立上下文机制，`c339565` 同步 CURRENT 基线。下一步才进入 P0 工程骨架实现。


## P0 实现记录｜2026-09-04

### 真实环境与目标

执行机实际为 Node `v24.19.0`、pnpm `11.21.0`。项目没有把 Node 24 固化成产品要求，而是冻结 `node >=20`；当前机器版本只是 Verification Evidence。Registry 实测 NestJS `12.0.1`、Fastify `5.12.1`、TypeScript `7.0.2`。

P0 创建了 pnpm workspace、`apps/api` NestJS + Fastify 最小应用、纯 TypeScript Config、public `/health`、唯一 `packages/site-api-contract`，以及 architecture/config/health 三类 repo-owned Gate。没有连接数据库、手机模型，也没有写任何 RAG 业务。

### 问题一｜TypeScript 7 让旧 Node resolution 假设失效

第一次 `pnpm verify:p0` 在 contract package typecheck 失败：`TS5108: moduleResolution=node10 has been removed`。初始配置使用 `moduleResolution: Node`，在 TypeScript 7 中等价的旧解析模式已经被移除。

这里没有降级 TypeScript，也没有关闭 typecheck；先把问题限定为工具链配置，最小切到现代 Node resolution。这个动作随后暴露第二个更深的事实。

### 问题二｜NestJS 12 已经处在 ESM 边界

切换现代 Node resolution 后，API 出现 `TS1479`：当前应用被识别为 CommonJS，但 `@nestjs/common/core/platform-fastify` 是 ECMAScript Module。说明“继续用 CommonJS 省事”已经不是中性选择，而是在逆当前生态制造兼容层。

最终采用 `module/moduleResolution = NodeNext`，两个 workspace package 显式 `type=module`，相对 import 使用 Node ESM 可执行的 `.js` specifier。再次 typecheck/build 后通过。这个调整没有改变任何 DDD/SDD 边界，只校准了运行时模块制式。

### 问题三｜Registry 网络抖动不是自动等于安装失败

安装 Fastify 依赖时 npm Registry 多个 GET 出现 `ECONNRESET`，pnpm 按自己的 retry policy 等待并成功完成安装与 lockfile。没有因为中间 warning 重跑整条 install，也没有把网络抖动升级成产品 blocker。

### P0 Gate

实现 commit：`a09f9e1 feat: establish P0 engineering skeleton`。在该精确 HEAD、clean worktree 上重新运行 `pnpm verify:p0`：

```text
ARCHITECTURE_GATE=PASS
typecheck=PASS
build=PASS
CONFIG_SMOKE=PASS
HEALTH_SMOKE=PASS
residual_api_process=NONE
```

Health Smoke 会真实启动构建产物、动态取得空闲端口、HTTP 请求 `/health`、检查 wire payload，再关闭进程；它不是“编译成功”的同义词。Architecture Gate 同时检查两个 apps、三个 Context、唯一 shared package、database ownership 目录和跨 Context/shared contract 泄漏。

### 这一阶段真正学到的东西

- Monorepo 不是为了目录漂亮，而是显式表达 `api` 与 `site` 两个独立部署单元。
- Modular Monolith 可以同时拥有 DDD 边界与单进程运行时，不需要为了 Context 就拆微服务。
- `site-api-contract` 只共享 wire protocol；Domain Model 不因为 TypeScript 类型方便就跨部署单元传播。
- 工具链版本也是工程事实：先机械确认当前版本，再决定配置，不要拿旧经验当永恒默认。
- Smoke Test 的价值在于跨越“代码能编译”和“构建产物真的能提供服务”的边界。

## P0 用户讨论后的最终认知

实现完成后没有直接以机械 Gate 作为最终验收，而是逐项讨论工程含义。最终确认：Fastify 可先理解为“把 HTTP 服务真正启动并接住请求的运行层”，不是 API Gateway；NestJS 负责应用内部 Module / Controller / DI 的组织。

`site-api-contract` 被确认应保持“极细”：它是 Site 与 API 共同遵守的 wire contract / 边界规则包，只放真实跨网络边界的数据结构，不承载 Domain Model、Service、Repository 或通用 Utils。

Architecture Gate 的定位也被收敛为“承重墙报警器”：硬拦部署单元、Bounded Context、共享契约、数据 ownership 等系统语义变化，但不锁死 Context 内部目录、类名、Adapter 或普通重构。

用户确认 P0 可以结项后，`a09f9e1` 才由 implementation candidate 升级为正式 P0 implementation baseline。该过程同时形成新的执行纪律：机械验证通过后必须先讲解/讨论，用户确认后才 closeout 和推进下一阶段。
