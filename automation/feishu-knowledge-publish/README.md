# Feishu Knowledge Publish automation

这是飞书知识库机械发布流程的唯一 workspace owner；政策/授权边界仍由 `skills/feishu-knowledge-publish/` 定义，底层直接用官方 `lark-cli`。

```text
node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs plan --source-root <root> [--path <md>]...
node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs publish --source-root <root> --space-id <id> --as user|bot [--root-node-token <token>] [--path <md>]...
```

流程：inventory once → same-path node resolve/create → image preflight/upload → token body → overwrite → fingerprint verify。node-create/overwrite UNKNOWN 先 reconcile；upload 无确定 token 时停止。临时正文只放 `.runtime/`，成功清理、失败保留 evidence。调用 publish 不自动授予外部写权限。
