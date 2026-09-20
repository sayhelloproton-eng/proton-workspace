# Feishu Publish Contract

## Authority

正文 Truth 是 docs/知识库 与 assets/知识库。远端 Wiki 是单向 Projection。knowledge-target.json 是 deployment config，不是内容 Registry。正常模型不读底层 CLI 手册；automation 失败时才以当前 lark-cli --help 和真实远端 readback 诊断。

## Deployment target v3

config 固定 sourceRoot、spaceId、identity、manageEntireSpace、firstDocument 与 managedTopLevel。

Space 本身没有“知识库根文档”语义。firstDocument.nodeToken 只负责身份锚定；其它一级节点都是 Space 顶级 sibling。

managedTopLevel 与 docs/知识库/_order.json 的 knowledge-order.v2.topLevel 必须完全一致，否则 fail closed。

## Desired tree

Automation 先构建 LOCAL DESIRED TREE，再读取 REMOTE CURRENT TREE。

目录 README 只作为目录节点正文；普通 Markdown 的第一个 H1 是文章节点标题。一级导航标题由 deployment config 固定。

发布正文时剥离 Markdown 首个 H1，让 Wiki node title 与 body 解耦，避免长 README 标题把稳定导航标题改写。

firstDocument.childrenSource 可以把一个本地目录的普通文章 flatten 到首文档下面；ignoreChildren 可以保留仅本地使用的综述而不生成远端节点。

## Command semantics

plan：只读 desired/current/diff，输出 create/move/delete 计划。

sync --changed：从 Git 当前变化推导 body scope。正文新增可以创建节点；如果检测到删除、order 改变或需要 re-parent，则 BLOCKED 并要求 reconcile。

sync --all：保证全部 desired 节点存在并覆盖全部正文，但不 move、不 delete。遇到同名节点位于错误父级时 BLOCKED，而不是制造第二份副本。

reconcile --all：先收敛 managed tree，再覆盖全部正文。每篇 overwrite 后立即 readback 并验证 fingerprint / images；全部正文完成后只做最终 tree readback，不再重复执行全量正文 fetch。

verify：只读检查 tree/content/images；这是唯一主动执行全量正文 readback 的命令。manageEntireSpace=true 时，Space 内任何不在 desired tree 的节点都属于 stale。

## Readback evidence

一次成功的 post-write readback 同时证明该正文内容和图片已经被远端采用，因此它可以直接作为 reconcile / sync 的终态正文证据。再次对同一批正文全量 fetch 不增加新的 authority，只增加远端延迟。

receipt.readback 固定暴露：
- docFetchCalls：本次命令全部 docs fetch 调用；
- imageReuseFetches：写前仅用于图片 token reuse 的 fetch；
- postWriteFetches：写后终态验证 fetch；
- fullVerifyFetches：显式 verify 的全量扫描 fetch。

正常全量 reconcile 的 fullVerifyFetches 必须为 0；显式 verify 才允许大于 0。BLOCKED receipt 也保留这组指标，方便定位首个 divergence 前已经发生的 readback。

## Sibling order boundary

_order.json 是 sibling order 的唯一 Owner：topLevel 固定 Space 一级顺序，children 可为去掉数字前缀的目录显式声明直接子节点顺序。声明 children 时必须完整覆盖该目录全部可发布直接 child，否则 fail closed。

当前 Wiki Move contract 没有 sibling position 参数。reconcile --all 遇到无法原地精确收敛的结构或 sibling order 时，不让模型手工拖拽，也不通过标题数字前缀污染正式标题；它保留 firstDocument anchor，删除并按 desired traversal 重建其余 managed projection。因为飞书只是 Projection，普通远端 node token 不作为长期 Stable ID。

## External write boundary

plan/verify 只读。sync/reconcile 会产生外部写，必须有当前任务授权。reconcile 还包含高风险 node-delete；调用 reconcile --all 表示本轮已明确授权 managed tree 的结构性对齐。
