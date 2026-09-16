# 06｜P5 Citation / Provenance

状态：Final Acceptance PASS；P5 已正式结项

## Citation 和 SourceCoordinate 有什么区别

SourceCoordinate 是 Evidence 内部保存的知识坐标：repository、commitSha、filePath、startLine、endLine。Citation 是面向 consumer 的稳定 provenance descriptor：它把 Evidence identity、content hash 和 SourceCoordinate 绑定成可以直接追溯的引用。

关键点不是“生成一个链接”，而是保证链接描述的事实与本次 QueryExecution 真正采用的 Evidence 完全一致。

## 为什么必须固定 commit，而不能链接 main

`main` 是 moving branch。今天第 100 行和一个月后第 100 行可能完全不同。如果历史回答引用 `/blob/main/...`，URL 仍能打开，但已经不是当时检索到的证据。

P5 因此强制 Evidence `source.commitSha` 等于本次 pinned Snapshot `sourceCommitSha`，并构造 `/blob/<40-hex-commit>/<path>#Lx-Ly`。commit mismatch 直接 fail closed。

## Citation 为什么不能重新做 selection

P2 决定 relevance order，P3-B 决定 EvidenceSet，P3-C 决定 Context 能表示到哪个 Evidence 前缀。P5 如果再根据“链接好不好看”“来源多样性”筛一次，就会形成第三套隐藏排序。

因此 Citation 顺序严格等于 Evidence selectionRank；每条 Citation 的 evidenceId/snapshotId/contentSha256/source 必须与 Evidence 逐项一致。

## Context 截断以后引用怎么办

默认 EvidenceSet 最多 9 条，但 Context 可能因为字符预算只包含前几条。P5 仍为完整 selected EvidenceSet 保留 Citation；真正进入 Context 的 provenance 通过 `ContextBundle.evidenceIds → Citation.evidenceId` 取交集。

这样 Context budget 只是表示层约束，不会反向修改 Evidence provenance。

## 为什么 contentSha256 也进入 Citation

路径和行号说明“在哪里”，content hash 说明“当时采用的内容 identity 是什么”。真实 smoke 重新对 Evidence content 做 SHA-256，并验证等于 Citation/Evidence 的 contentSha256。

## P5 没有做什么

没有重新读取 Knowledge、没有改 Retrieval/Evidence/Context baseline、没有新增 DB migration、没有 Citation UI，也没有 Generation。ChatWeb 以后只能消费 citation/evidence id 和 URL，不能成为 provenance truth owner。

## 真实验证

正式 `pnpm verify:p5` 完整 exit 0：architecture/typecheck/build、4 migrations SKIPPED、Embedding health、真实 Nest/Fastify HTTP smoke 全 PASS。真实 Gold query 返回 9 Evidence + 9 Citation，顺序/identity/hash/source 全对齐；Context evidenceIds 都能映射 Citation；NO_EVIDENCE fixture 返回空 citations；不同 snapshot commit fail closed；DB before/after 相同。

## Batch-first 这次是否真的提速

P5 第一次原子 patch 因 README anchor 不匹配直接 0 mutation；补读 4 个 README 后，第二次一次修改 15 个既有文件并新增 3 个文件。中间只跑一轮 typecheck+syntax targeted verify，然后只跑一次 `verify:p5`。这就是“减少 connector 往返，而不是减少验证强度”的实际落地。
