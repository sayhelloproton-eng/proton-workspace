# Efficiency and Recovery

## Batch once, not per document

批量发布开始时构建一次本地知识节点清单：

```text
source path
projection kind: NODE_BODY | CHILD_DOCUMENT
target logical node path
local image references
fingerprint
```

其中 `README.md` 的 projection kind 是 `NODE_BODY`，目标是目录对应节点；普通 Markdown 是 `CHILD_DOCUMENT`，目标是同级标题子节点。不要先把 README 机械转换成页面再补救。

再读取一次目标范围内的 Wiki 导航树，建立本轮内存映射。之后逐篇复用，不从根节点重新扫描。

## What not to optimize with AI

以下步骤是确定性的，不需要模型逐篇重新判断：

- 文件枚举；
- `README.md` 与普通 Markdown 的投影类型判断；
- 相对路径拆分和目录节点定位；
- 图片存在性检查；
- 同父级标题匹配；
- overwrite 命令形状；
- 成功 / 失败状态汇总。

这些稳定机械步骤由 `automation/feishu-knowledge-publish/` 统一实现。模型负责决定“什么内容值得进入正式知识树、正文如何写”，不负责重复手工编排发布命令。

## Root README preflight

如果发布集合包含 `source-root/README.md`，必须在任何远端写之前确认已经提供 `--root-node-token`。缺失时整批 fail closed，避免先发布其它文档再在根 README 处形成部分副作用。

`plan` 可以在没有 root token 时展示 `<root-node>` 逻辑目标，因为它不发生外部写；真正 `publish` 必须完成 root preflight。

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
2. 如果目标节点 / 正文指纹 / 资源已经存在，按实际 side effect 继续；
3. 只有证明未应用时才重试；
4. 不通过新建同名“副本”规避不确定状态。

目录 README 的 reconcile 目标是目录节点本身，不能通过创建 `README` 子节点规避不确定状态。

## Per-document failure isolation

批量同步中一篇失败，不代表其余文章都必须回滚。记录失败路径和阶段；只有当共享前置条件失效（身份、space、权限、CLI 契约、root token）时才停止整批。

图片文章要特别记录失败发生在 `preflight`、`pre-upload`、`render`、`overwrite` 还是 `verify`，避免把“图片没上传”和“正文没写入”混成一个错误。

## Remote collaboration boundary

直接 overwrite 的前提是飞书知识库只是本地正式知识树的发布面。如果某篇远端文档已经成为多人协作真源，就不应继续由本 Skill 覆盖；应先改变 ownership，而不是在发布流程里重新引入双向 merge。
