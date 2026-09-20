# Efficiency and Recovery

## 目标

模型不再“编排飞书发布流程”。正常路径只有：

    读主 Skill
    → 选择 changed / all / reconcile / verify
    → 调一次 automation
    → 读最终 receipt
    → 汇报

Space、首文档、目录映射、README 语义、图片、node resolve、readback 和 UNKNOWN recovery 都不应该每轮重新推导。

## Readback budget

sync / reconcile 的默认正文验证预算是：

    每篇 selected body
    → overwrite
    → 1 次 post-write fetch
    → fingerprint + image verify
    → evidence complete

有本地图片的正文可以额外有 1 次 imageReuseFetch，用于复用已有 file token。

禁止在成功完成上述 post-write readback 后，再对同一批正文自动执行第二轮 full-body fetch。结构终态仍必须独立 readback，因为 tree 和 body 是不同 authority。

只有显式 verify 命令才进行 fullVerifyFetches。正常全量 reconcile receipt 应满足 fullVerifyFetches=0。

## Stable receipt

成功 receipt 固定包含 status、mode、summary、verification、readback、unknown。阻塞 receipt 固定包含 firstDivergence、sideEffectState、safeToRetry、evidence、readback。

Automation 同时把终态写到 automation/feishu-knowledge-publish/.runtime/latest-receipt.json。工具调用超时后优先恢复这个 terminal authority，不重新启动同一发布。

readback 中的 docFetchCalls / imageReuseFetches / postWriteFetches / fullVerifyFetches 是机械效率证据，不要求模型自己统计 CLI 调用。

## Recovery rules

- create timeout：先看预期 parent 是否已出现唯一节点。
- move timeout：先按 node token + desired path readback。
- delete timeout：先重新读取 managed tree；节点不存在才视为 applied。
- overwrite timeout：先 fetch 正文指纹和图片；这次 recovery fetch 仍归 postWriteFetches。
- image upload 未返回 token：保持 UNKNOWN，不能盲重试。

## Regression owner

automation/feishu-knowledge-publish/readback-regression.mjs 锁住以下不变量：

- reconcile 不再调用 verifyAllBodies；
- reconcile 仍有最终 tree readback；
- publishOne 成功/UNKNOWN reconciliation 都必须 post-write fetch；
- verify 仍保留 full-body scan；
- receipt 暴露 readback metrics。

这是 automation 内部维护 Gate，不进入主 Skill 的正常调用路径。

## When the model may re-enter

只有稳定 receipt 返回 TARGET_IDENTITY_MISMATCH、AMBIGUOUS_NODE、STRUCTURE_CONFLICT、UNKNOWN_SIDE_EFFECT、UNSUPPORTED_REMOTE_OPERATION 等不能机械裁决的 first divergence 时，模型才读取 references 或底层 CLI。

正常成功路径禁止为了“再确认一下”重新 node-list、手工 fetch、追加 verify 或 Browser 验收。
