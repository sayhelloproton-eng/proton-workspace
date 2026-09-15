# Efficiency and Recovery

## Batch once, not per document

批量发布开始时构建一次本地清单：

```text
relative path
parent path
title
local image references
```

再读取一次目标范围内的 Wiki 导航树，建立本轮内存映射。之后逐篇复用，不从根节点重新扫描。

## What not to optimize with AI

以下步骤是确定性的，不需要模型逐篇重新判断：

- 文件枚举；
- 相对路径拆分；
- 图片存在性检查；
- 同父级标题匹配；
- overwrite 命令形状；
- 成功/失败状态汇总。

如果真实重复执行稳定且人工编排开始成为成本，再把这些机械步骤搬进 `automation/`。在那之前保持直接 CLI，避免为一次迁移重建小平台。

## Write-result states

外部写操作至少区分：

- `NOT_STARTED`：前置条件未通过，没有写副作用；
- `SUCCEEDED`：远端 side effect 已确认；
- `FAILED`：服务端明确失败，且不存在成功副作用；
- `UNKNOWN`：超时、连接中断或返回不完整，无法判断是否已写入。

`UNKNOWN` 不能直接当 `FAILED` 重试。

## Reconciliation

当 `wiki +node-create`、`drive +upload` 或 `docs +update` 结果不明确时：

1. 先读取对应远端 authority；
2. 如果目标节点/正文指纹/资源已经存在，按实际 side effect 继续；
3. 只有证明未应用时才重试；
4. 不通过新建同名“副本”规避不确定状态。

## Per-document failure isolation

批量同步中一篇失败，不代表其余文章都必须回滚。记录失败路径和阶段；只有当共享前置条件失效（身份、space、权限、CLI 契约）时才停止整批。

图片文章要特别记录失败发生在 `preflight`、`pre-upload`、`render`、`overwrite` 还是 `verify`，避免把“图片没上传”和“正文没写入”混成一个错误。

## Remote collaboration boundary

直接 overwrite 的前提是飞书知识库只是本地知识库的发布面。如果某篇远端文档已经成为多人协作真源，就不应继续由本 Skill覆盖；应先改变 ownership，而不是在发布流程里重新引入双向 merge。
