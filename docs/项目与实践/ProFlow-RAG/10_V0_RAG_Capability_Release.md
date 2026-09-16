# 10｜V0：把完整 RAG 工程补成可交付服务

状态：`Final Acceptance PASS；V0 已正式结项`

P0～P8 做完以后，RAG 的核心能力其实已经齐了，但“工程功能齐全”不等于“别人 clone 以后真的知道怎么把它跑起来”。V0 最后一段实现工作的重点，不是继续加算法，而是把前面零散的构建、运行和验证能力收成一个真正可交付的 service surface。

## 1. 从 Fresh clone 视角重新走一遍

我们不再从开发者已经熟悉仓库的视角看，而是假设一个新环境只拿到 README。此时发现三个问题：根 README 仍残留旧产品阶段叙事；Acceptance/Release Spec 和最新架构不完全一致；更关键的是，Knowledge build 虽然各阶段都有脚本，却没有一个正式 operator 可以从 immutable source 一路编排到可验证 Snapshot。

这说明 V0 真正缺的不是 Retrieval，而是“如何把已经实现的 Knowledge 能力作为产品操作暴露出来”。

## 2. 把 P1 的分段能力收成正式 `knowledge:rebuild`

没有重写 P1 算法，而是复用已经验证的 SourceSnapshot、Corpus、Chunk persistence、Candidate Index、Embedding、validation、Snapshot activation，新增一个很薄的 orchestration owner：

`SOURCE → CORPUS → CHUNK → PERSIST → INDEX_PLAN → EMBED → VALIDATE → ACTIVATE`。

每一步写入 IngestionRun stage/failure。`--commit <40hex>` 可以固定 source；中断后用同一 commit 重跑会复用已有 immutable build。默认只 build + embed + validate，不自动激活；只有显式 `--activate` 才切换 ACTIVE。

## 3. 第一次真实 operator smoke 先暴露 CLI 问题

最初通过 pnpm 调用 `knowledge:rebuild run ...` 时，命令行里多了前导 `--`，parser 把它误认为 command，直接打印 Usage。因为错误发生在 DB mutation 前，所以先分类为 CLI surface defect，只修 parser 对可选前导 `--` 的兼容，不动构建逻辑。

修复后正式 operator 真正进入 IngestionRun，并固定当前 ACTIVE commit。当前 index 已 COMPLETE，因此 7670 个 vectors 没有重算，而是正确恢复 `pending=0` 的已有 immutable build。真实结果：806 documents、7624 chunks、7670/7670 embeddings；不带 `--activate` 时 ACTIVE snapshot 前后完全不变。

## 4. 把 README 和运行入口补成别人能执行的顺序

V0 Quick Start 最终明确成：install/build → DB prepare/migrate → Embedding runtime → Fresh rebuild 或读取既有 ACTIVE → API start → system status。这里 PostgreSQL 仍是外部 prerequisite，Embedding/API/Knowledge operator 则由仓库自己管理。

这一步也明确了一个产品边界：API start 不做 Knowledge rebuild，Knowledge rebuild 也不隐式启动 ChatWeb；不同 owner 的生命周期保持独立。

## 5. 机器重启又暴露了“证据不是进程”

第一次 V0 Formal Gate 已启动，但机器重启后 `/tmp` log、exit 和进程一起消失。没有把“看不到进程”猜成 FAIL，也没有把之前输出猜成 PASS，而是裁决成 `EXTERNALLY_INTERRUPTED / UNKNOWN`。

重启后又发现 PostgreSQL 没启动。根据 P1 已记录的真实运行时，找回 Postgres.app PG17 原 cluster `~/Library/Application Support/ProFlowRAG/postgres-17`，而不是重新安装或新建数据库；migration 4/4 PASS 后恢复 Embedding owner。最终 Gate evidence 改存 `.runtime/release`，避免临时目录再次成为唯一证据。

## 6. 最终 Release Gate 怎么组合

`verify:v0` 没有把 P0～P8 的全部历史 Gate 傻串起来，而是组合当前最强证据：Architecture/Build/DB、正式 Knowledge operator、Knowledge Eval、Retrieval core、Citation、13-case public RAG Eval、degradation、Runtime/Ops、ChatWeb consumer 和真实 cross-repo integration。

最终 durable Gate exit 0。13-case RAG Eval 的 Evidence/Context full Gold、Citation correctness、Snapshot/Contract consistency 都保持 100%；ChatWeb consumer 22/22 PASS，真实 required/optional/zero-RAG 链也保持成立。

## 7. V0 实现完成后的系统形态

最终的 ProFlow RAG 不是“向量库 + 一个 query 函数”，而是一条完整工程链：

`公开 Git authority → immutable RepositorySnapshot → Corpus Policy → Structure-aware Chunk → PostgreSQL/pgvector → Embedding / Candidate Index → Hybrid Retrieval / RRF → Evidence Selection → Context Budget → immutable Citation → public RAG API → Eval → Runtime / Readiness → external ChatWeb consumer → rebuild/operator`。

这条链里的每个阶段都不是后来倒推出来的漂亮架构，而是在真实实现、实验、失败和修复中逐步收敛出来。Gate/PASS 只是这些实现事实最后的机械证据。

## 8. V0 之后为什么还要做一次 consolidation

V0 Gate 已经证明服务能交付，但从“以后只作为 ChatWeb 调度的长期 RAG 服务”重新审仓库时，仍看到一些不会让测试失败、却会误导维护者的历史债：`apps/site` 和 tunnel/phone probe 仍占 live surface；一仓时代的 Conversation/Generation/Public Site/Grounded Answering/SSE/Phone/Tunnel 规格虽然写了 superseded，却还混在 `docs/specs`；数据库也保留了从未使用的空 `answering` schema。

这里没有把历史直接抹掉。仍有决策价值的旧规格迁到 `docs/context/90-历史记录/legacy-specs`，live tree 则只表达当前 headless RAG。真实 PostgreSQL 先查询对象数，确认 `answering=0` 后新增 `0005`，后续又确认 `quality=0` 后新增 `0006`；两个 migration 都不用 `CASCADE`，也没有修改已经执行过的 `0001` checksum。这个做法把“代码/文档已经改架构”推进成“运行数据库真相也一致”。

## 9. 更新路径为什么必须补正式 rollback operator

前面的 P1-G 已经实现并验证 transaction rollback，但 V0 operator 只有 rebuild/prepare/embed/validate/activate/run。对未来 ChatWeb 调度维护来说，“Domain 会 rollback，但 operator 不会”仍然是不完整的服务维护路径。

因此增加 `knowledge:rollback --snapshot-id <id>`，同时让 `knowledge:rebuild:status` 输出当前 ACTIVE 和唯一允许的一步 previous rollback target。它不是开放任意历史版本切换：错误 target fail closed；真实 transaction rollback/retry 继续由 P1-G fixture 证明；维护 smoke 对当前 ACTIVE 只做幂等 no-op，避免为了验收改变线上 Knowledge truth。

## 10. 最后怎么证明“整理没有把 V0 整坏”

单独建立 `verify:consolidation`，不把 P0～P8 全历史 Gate 再串一次。它验证 Architecture/Typecheck/Build、0001～0006 migration、live apps/schema、Embedding、Knowledge maintenance、13-case public RAG capability、degradation、Runtime/Ops、ChatWeb 22/22 consumer tests/build 与真实 ChatWeb→RAG E2E。

最终 durable Gate exit 0，live apps=`api`，live DB schemas=`knowledge,system`，Service docs 与 maintenance surface PASS，真实跨仓 E2E 和 DB read-only 继续 PASS。这个尾段最终把项目从 Active Development 推到 Maintenance Mode：Knowledge data update 可独立 rebuild/activate/rollback；RAG capability/contract 的新变化原则上由 ChatWeb 或其他真实 consumer requirement 驱动。
