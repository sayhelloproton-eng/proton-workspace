---
name: feishu-knowledge-publish
description: Publish a curated local knowledge tree to a Feishu/Lark Wiki as a one-way knowledge-node projection with the current official lark-cli. Directories map to Wiki nodes, directory README.md supplies that node's body, ordinary Markdown maps to child nodes, and local knowledge files remain authoritative.
---
# Feishu Knowledge Publish

本地正式知识树是 desired state，飞书只是公开展示投影。默认正式源是 workspace `docs/知识库/` 及其 `assets/知识库/` 资源；学习、专题研究、项目实践、临时材料等先在本地积累和提炼，不因为目录相似就自动成为飞书节点。

投影单位是**知识节点**，不是“每个本地文件都创建一个远端页面”的机械镜像：

```text
本地目录                     → Wiki 节点 / 层级
<目录>/README.md             → 该目录对应 Wiki 节点的正文
普通 <目录>/文章.md          → 该目录节点下的“文章”子节点正文
source-root/README.md        → --root-node-token 对应 Wiki 根节点正文
```

因此 `README.md` 是保留的目录正文文件名，不能在飞书创建一个名为 `README` 的子节点。一个 Wiki 节点可以同时有正文和子节点；这正是本地“目录 + README.md”对飞书“目录即文档节点”的适配方式。

不建立 Stable ID、Registry、Projection Manifest、正文 merge 或双向同步。本地路径只用于本轮确定知识节点位置；远端 token 仍是运行时事实，不反写 Markdown 形成第二套身份系统。

本 Skill 拥有发布政策、授权边界和 PASS/UNKNOWN 语义；稳定机械发布流程只有一个实现 owner：

```text
/Users/agent/Desktop/proton-workspace/automation/feishu-knowledge-publish/
```

Chat、Codex、DeepSeek 等宿主要真实发布时复用这个 automation，不再各写一套 lark-cli 编排。外部写仍必须在当前任务明确授权范围内。

Authority：本地正式知识 Markdown / `assets/知识库/` 是正文真源；官方 `lark-cli --help` 与真实 dry-run 是底层 CLI 契约；远端节点 / 父路径 / 权限 / 写后结果从飞书读取确认。overwrite 前不为了比较正文 fetch 旧文档。

Canonical execution：

```text
node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs plan --source-root <root> [--path <relative.md>]...
node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs publish --source-root <root> --space-id <id> --as user|bot [--root-node-token <token>] [--path <relative.md>]...
```

如果发布 `source-root/README.md`，必须显式提供 `--root-node-token`，否则 fail closed；不能退化成创建 `README` 页面。目录 README 发布到已有 / 新建的目录节点正文，普通 Markdown 仍按标题创建或复用子节点。同父级同标题节点唯一则复用，不存在才 create；歧义 fail closed。

无图文章直接 overwrite + 最小验证。有图文章必须：本地 preflight → 全部 `drive +upload` 到调用者 Drive 成功（不得使用 `--wiki-token`，避免图片资源变成 Wiki 导航子节点）→ owner-local 临时 token body → overwrite → 最小验证；任何 upload 未得到确定 token 都不能先写缺图正文。

`node-create` 或 overwrite timeout / UNKNOWN 必须先读远端 authority reconcile；只有证明 NOT_APPLIED 才能重试。图片 upload 无确定 token 时保留 UNKNOWN 并停止当前文档。

远端若已成为多人协作真源，应先改变 ownership，而不是在发布器里引入 merge。详细 CLI、目录节点投影、图片与恢复约束见 `references/01-publish-contract.md`、`02-image-pipeline.md`、`03-efficiency-and-recovery.md`。
