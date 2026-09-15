# Feishu Publish Contract

## Source of truth

这个 Skill 不复制一套固定 CLI API。每次真实发布以当前环境中的官方 `lark-cli` 为准：

```text
lark-cli --version
lark-cli <domain> <command> --help
lark-cli skills read lark-doc/...
lark-cli skills read lark-drive/...
```

版本号只用于诊断，不是永久契约。

## 当前已验证命令面

当前本机 `lark-cli 1.0.95` 已验证存在：

```text
wiki +node-get
wiki +node-list
wiki +node-create
docs +fetch
docs +update
drive +upload
```

知识库投影不再依赖旧 `lark_read.mjs`、`lark_write.mjs`、Registry 或 Stable ID。

## 节点身份

发布时只需要区分三件事：

- Wiki space；
- parent node；
- 当前节点 token / obj token。

`wiki +node-list` 用于列出某个 space 或 parent 下的直接子节点；需要完整分页时显式使用 `--page-all`。`wiki +node-get` 用于确认一个 node/object token 的真实节点信息。

本地相对路径是人的稳定定位方式，远端 token 是本次执行的运行时事实。不要把 token 反写成本地 Markdown 当长期身份系统。

## 正文覆盖

已有或刚创建的 docx 节点统一使用：

```bash
lark-cli docs +update \
  --doc <obj-or-node-token> \
  --command overwrite \
  --doc-format markdown \
  --content @./publish.md
```

多行正文优先 `@file`，避免 shell 转义破坏。`@file` 必须使用当前 cwd 下的安全相对路径。

## 不读旧正文

发布语义是：

```text
local body = desired state
remote body = replaceable projection
```

所以 overwrite 前不 `docs +fetch` 旧正文，不做 Markdown diff，不做模型语义 merge，也不逐块更新。

节点树读取不属于“旧正文比较”，可以且应该在批量开始时完成。

## 写后最小验证

写后允许轻量 `docs +fetch` 或节点查询确认：

- 节点仍在预期父路径；
- 文档出现预期标题/首段等基本指纹；
- CLI 没有资源 warning / partial failure；
- 图片文章的 token-backed 图片没有失败。

验证 side effect 即可，不需要重新把远端全文与本地逐字比较。

## External write boundary

Help、内置 Skill、`--dry-run` 和只读节点查询可以用于 Skill 自测。真正的 `node-create`、`drive +upload`、`docs +update` 都是外部写；必须由当前任务授权覆盖，不能因为“在开发发布 Skill”就自动获得写权限。
