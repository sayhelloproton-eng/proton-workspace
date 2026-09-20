# Feishu Knowledge Publish automation

这是正式知识库的唯一机械发布 Owner。模型不再编排 Wiki / Docs / Drive 的底层调用，只选择同步范围。

## Canonical commands

    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs plan
    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs sync --changed
    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs sync --all
    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs reconcile --all
    node automation/feishu-knowledge-publish/feishu-knowledge-publish.mjs verify

plan 只读 desired/current/diff。sync --changed 只同步当前 Git 正文或图片变化；删除、重命名、order 变化会要求 reconcile。sync --all 覆盖全部正文，可创建缺失节点，但不主动 move/delete。reconcile --all 才做 desired-state reconciliation：create、re-parent、delete stale、overwrite、verify。若结构或 sibling order 已无法通过原地操作精确对齐，reconcile 会保留 firstDocument anchor，并重建其余 managed tree，从而保证最终顺序。verify 只读。

每个命令只输出一个稳定 JSON receipt，并同时写 .runtime/latest-receipt.json。正常路径不再要求模型解析 lark-cli 过程文本。

## Readback policy

sync / reconcile 的正文正确性证据来自每篇 overwrite 后立即执行的 readback；同一份证据同时验证正文 fingerprint 与图片。reconcile 完成全部正文后只再读取一次最终 tree，不再把全部正文重复 fetch 第二遍。

只有显式 verify 命令才执行全量正文 readback。receipt.readback 会返回 docFetchCalls、imageReuseFetches、postWriteFetches、fullVerifyFetches，用于发现机械调用退化；正常全量 reconcile 应保持 fullVerifyFetches=0。

内部回归：

    node automation/feishu-knowledge-publish/readback-regression.mjs

它只检查 publisher 的 readback 不变量，不访问飞书。

## Deployment config

knowledge-target.json 固定 Space、身份、首文档 anchor、managed top-level 与本地 source mapping。Space 只是容器；智能体工程探索是第一篇正式文档，不是整棵树 parent。

顶级导航标题由 config 固定。正文 Markdown 首个 H1 在发布时从 body 中剥离，因此 README 的长文章标题不会再改写 Wiki 导航标题。

## Failure contract

BLOCKED receipt 给出 firstDivergence、sideEffectState、safeToRetry、evidence 和当前 readback metrics。UNKNOWN 永远不自动当 FAILED 重试。

只有 TARGET_IDENTITY_MISMATCH、AMBIGUOUS_NODE、STRUCTURE_CONFLICT、UNKNOWN_SIDE_EFFECT、UNSUPPORTED_REMOTE_OPERATION 等 BLOCKED 状态才把判断权交回模型。
