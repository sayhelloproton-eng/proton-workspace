# Feishu Tools

底层优先直接使用官方 `lark-cli`；不维护重复的 read/write wrapper。

当前知识库发布使用 `wiki +node-get/+node-list/+node-create`、`docs +fetch/+update`、`drive +upload`。`skills/feishu-knowledge-publish/` 拥有发布政策；`automation/feishu-knowledge-publish/` 是稳定机械流程唯一实现 owner；`tools/feishu/` 只有在官方 CLI 缺少跨调用方都需要的原子能力时才增加 helper。

正式图片发布必须先 upload 成功，再让 automation 生成临时 token-backed `<img src="..."/>` 正文并 overwrite。不要重新引入 Registry、Stable ID、正文 diff、双向同步或第二发布器。
