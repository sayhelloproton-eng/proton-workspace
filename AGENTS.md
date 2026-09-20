# AGENTS.md

## ChatGPT Chat → Local Engineering Protocol｜CHATGPT-ONLY

`CHATGPT_CHAT_LOCAL_ENGINEERING_PROTOCOL=REQUIRED`

本节**仅适用于 ChatGPT Chat** 通过 CodeGraph、Repomix、Local Dev、Playwright/AX 等工具编排本机工程。ChatGPT Chat 在执行本机 mutation / test / build / Git write 前必须读取并遵循：

`/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/SKILL.md`

该共享 Skill 是 ChatGPT Chat ↔ Local execution mechanics 的 workspace-level 单一规则 owner。仓库规则只补充项目语义、领域、安全、Review 与发布约束；更严格的仓库规则对 ChatGPT Chat 继续生效。当前 Chat 已读取同版本后无需重复读取。

**Codex exclusion — HARD:** Codex / GPT-6 Codex / Codex app / Codex CLI / app-server/runtime / Codex-native sessions 必须忽略本节，也不得因为本节被要求读取上述 shared Skill。本节不改变 Codex 的 AGENTS 层级、仓库工作流、skills、CLI/hooks、shell environment 或任何本机 Codex 配置；Codex 继续仅遵循本文件其余原有的非 ChatGPT 项目规则。

## Workspace role

This repository is the personal multi-product engineering workspace `proton-workspace`.

## Public knowledge base publication boundary — HARD RULE

`docs/知识库/` 是独立可读的正式技术知识。正文直接呈现项目为什么发生、怎样演进、哪里失败、形成什么机制、证据和边界；不得把内部受众画像、职业用途或“这是写给谁看的”元叙事写进公开正文。写作时可以内部考虑不同理解门槛，但最终文章必须脱离这些内部画像也能自然成立。

硬边界：

1. `docs/知识库/` 不是内部过程仓、项目仓库镜像或文档类型分类树。
2. 不按“学习 / 调研 / 实验 / 复盘 / 技术方案”等形成方式作为一级导航；这些是材料属性，不是正式知识结构。
3. 项目实践是主要事实来源，工程专题从真实问题中自然形成；二者可以互相引用，但不建立严格一一映射、路径依赖或复杂同步机制。
4. 每个公开主题都应能回到真实项目、代码、测试、运行、事故、Eval 或其他可核验事实；计划和推断不得写成已完成能力。
5. 内部工作材料应服务本人和 AI 的持续工程工作，并与公开知识库的阅读结构解耦。
6. 最终知识结构必须基于真实迁移后的项目与工程资产确认，不为了目录对称提前制造空分类。
7. 一级正式阅读 / 发布遍历顺序由 `docs/知识库/_order.json` 单一拥有。当前一级固定为 `智能体工程探索`、`现代AI工程`、`Agent工程`、`工程工具与运行时`、`ProFlow-RAG`、`ChatWeb`、`AI业务工程`、`术语表`；`智能体工程探索/README.md` 是 Space 首文档正文，ProFlow 各篇直接挂在它下面。
8. 同一个正式知识节点不得同时由“根文件 + 同名目录”双重拥有；目录型主题统一使用 `<目录>/README.md` 作为该节点正文。

## Hard boundaries

1. Treat `proton-workspace` as the workspace/control plane for multiple products.
2. Product repositories live under `repos/<product>/` and remain independent Git repositories.
3. Never absorb `repos/**` into the root pnpm workspace or root lockfile.
4. Never create cross-repository `workspace:`, relative package, or link dependencies between the root workspace and products.
5. Workspace orchestration may invoke a product's own documented `test`, `build`, `release`, `publish`, or equivalent commands, but must not take ownership of that product's internal package graph.
6. Do not commit product source from `repos/**` into this repository.
7. Retired predecessor repositories are reference-only and must not be treated as current platform, runtime, documentation, or governance truth.
8. Do not invent a final new-platform name or platform instance directory before that naming decision is frozen.
9. Keep the workspace root minimal; create shared directories only when a real owner or capability exists.
10. Prefer Node.js built-in capabilities and already-frozen workspace tooling over adding dependencies without evidence.

## Runtime baseline

- Node.js: `24.19.0`
- Package manager: `pnpm@11.21.0`
- Module system: ESM
