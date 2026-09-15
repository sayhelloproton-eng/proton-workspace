---
name: feishu-knowledge-publish
description: Publish local docs/知识库 to a Feishu/Lark Wiki as a one-way same-path projection with the current official lark-cli. Local files are authoritative; remote bodies are overwritten rather than merged.
---
# Feishu Knowledge Publish

本地知识库是 desired state，飞书只是同路径公开投影：`local relative path → same logical Wiki path → whole-document overwrite`。不建立 Stable ID、Registry、Projection Manifest、正文 merge 或双向同步。

本 Skill 拥有发布政策、授权边界和 PASS/UNKNOWN 语义；已经稳定的机械发布流程只有一个实现 owner：

```text
/Users/agent/Desktop/proton-workspace/automation/feishu-knowledge-publish/
```

Chat、Codex、DeepSeek 等宿主要真实发布时复用这个 automation，不再各写一套 lark-cli 编排。外部写仍必须在当前任务明确授权范围内。

Authority：本地 Markdown/`assets/知识库/` 是正文真源；官方 `lark-cli --help` 与真实 dry-run 是底层 CLI 契约；远端节点/父路径/权限/写后结果从飞书读取确认。overwrite 前不为了比较正文 fetch 旧文档。

Canonical execution：

```text
node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs plan --source-root <root> [--path <relative.md>]...
node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs publish --source-root <root> --space-id <id> --as user|bot [--root-node-token <token>] [--path <relative.md>]...
```

同父级同标题节点唯一则复用，不存在才 create；歧义 fail closed。无图文章直接 overwrite + 最小验证。有图文章必须：本地 preflight → 全部 `drive +upload --wiki-token` 成功 → owner-local 临时 token body → overwrite → 最小验证；任何 upload 未得到确定 token 都不能先写缺图正文。

`node-create` 或 overwrite timeout/UNKNOWN 必须先读远端 authority reconcile；只有证明 NOT_APPLIED 才能重试。图片 upload 无确定 token 时保留 UNKNOWN 并停止当前文档。

远端若已成为多人协作真源，应先改变 ownership，而不是在发布器里引入 merge。详细 CLI、图片与恢复约束见 `references/01-publish-contract.md`、`02-image-pipeline.md`、`03-efficiency-and-recovery.md`。
