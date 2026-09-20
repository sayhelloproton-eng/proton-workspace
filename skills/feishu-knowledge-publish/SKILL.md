---
name: feishu-knowledge-publish
description: Canonical one-way desired-state publication from the local formal knowledge tree to Feishu Wiki. The model selects scope; automation owns target discovery, projection, reconciliation, images, readback and stable receipts.
---
# Feishu Knowledge Publish

本地正式知识树是 Truth，飞书只是 Projection。正常发布时模型只做一个决定：这次同步什么。

## Canonical path — HARD RULE

正式知识库只使用：

    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs plan
    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs sync --changed
    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs sync --all
    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs reconcile --all
    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs verify

普通正文/图片变化用 sync --changed；明确全量正文覆盖用 sync --all；目录、父子关系、删除、重命名、order 或 managed tree 改变用 reconcile --all；只检查用 verify；先看动作使用 plan。

## 模型禁止重新做的事 — HARD RULE

Canonical publish 时不得重新搜索 Space ID，不得重新推导目录投影，不得逐篇手工调用 wiki/docs/drive，不得自己维护图片 token，不得用 Browser 判断发布成功，不得在 UNKNOWN 后盲重试。

这些机械事实和动作由 automation 与 knowledge-target.json 单一拥有。

只有 automation 返回 TARGET_IDENTITY_MISMATCH、AMBIGUOUS_NODE、STRUCTURE_CONFLICT、UNKNOWN_SIDE_EFFECT / IMAGE_UPLOAD_UNKNOWN、UNSUPPORTED_REMOTE_OPERATION 或其它明确 BLOCKED receipt 时，才重新把判断权交给模型。

## Desired-state semantics

Space 是容器。智能体工程探索是 Space 第一篇正式文档，不是 Space Root。managed top-level、首文档 anchor、本地 source mapping 和身份由 deployment config 固定。

reconcile --all 才拥有结构性副作用：create missing、move/re-parent wrong nodes、delete stale、overwrite body、verify。若 sibling order 或结构无法原地精确收敛，允许在 managed projection 边界内保留 firstDocument anchor、重建其余 managed tree；普通远端 node token 因而不是稳定内容 ID。sync 不主动删除或移动结构。

README 只提供节点正文，不创建 README 子节点。顶级导航标题由 deployment config 固定，正文 H1 不允许覆盖导航标题。

正常 sync / reconcile 复用每篇写后的 readback 作为正文与图片终态证据，不再追加第二轮全量正文 fetch；只有显式 verify 才做纯只读全量扫描。成功 receipt 已经是终态 authority，模型不得为了“再确认一下”追加 verify、node-list 或 Browser 检查。

## UNKNOWN

写副作用只允许 NOT_STARTED / SUCCEEDED / FAILED / UNKNOWN。UNKNOWN 必须先 reconcile 现实；receipt 标记 safeToRetry=false 时禁止重复非幂等动作。

真实外部写仍要求当前任务已有授权。详细机制只在异常诊断时读取 references/01-publish-contract.md、02-image-pipeline.md、03-efficiency-and-recovery.md。
