# 从一次构建走向长期 Maintenance

一个 RAG Demo 可以靠开发者手动启动数据库、跑脚本、换索引。一个长期 `Capability Service`（能力服务）必须让这些动作有正式 Owner、可恢复状态和明确副作用。ProFlow RAG 的维护能力不是一次性补齐的，而是经历了几个明显转折：先把 API 进程状态从“能启动”变成可判断的 readiness（就绪状态），再把知识构建收进正式 operator（运维入口），随后补上受限 rollback（回滚），最后清理拆仓后残留的旧文档和空数据库结构。

`Maintenance`（维护模式：核心能力稳定后，以数据更新、故障恢复和真实消费者需求驱动变更）不是停止演进，而是改变默认行为：不再为了继续开发而无限扩 scope，每次变化都要来自明确的知识更新、运行问题或 consumer requirement（消费者需求）。

## `/health` 为什么从“进程活着”演进成“能力是否可服务”

早期 `/health` 基本等价于 liveness（存活：进程能回应 HTTP）。随着知识快照和 Embedding 成为真实依赖，单看进程已经不够，于是 readiness 被拆出来：

```text
DB + ACTIVE Snapshot + Embedding 正常 → ready
DB / Snapshot 正常，Embedding offline → degraded
DB 或 ACTIVE Snapshot truth 不成立    → unavailable
```

Reranker 默认关闭，所以它不应成为 readiness blocker（就绪阻断项）。Public health 只暴露 `ok/degraded/unavailable`；数据库、模型、PID、endpoint 等诊断进入 operator status，不泄漏给公网消费者。

这次拆分把“进程是否活着”和“能力是否足够可靠地服务请求”变成了两个不同事实。

## API 进程为什么需要自己的生命周期 Owner

仓库最终提供 `runtime:api:start/status/stop`。PID / log 放在 `.runtime/api`；start 会检查 build、端口和旧 PID；status 同时核对进程 ownership 与 `/health`；stop 只向 owning PID 发信号，并使用 bounded shutdown（有界关闭）。

这套设计刻意不让 API start 自动 migration 或 rebuild。启动进程是可逆 Runtime 动作，Knowledge activation 是 truth mutation（会改变在线知识真值的操作），不能因为“方便”绑成一条隐式副作用链。

## Knowledge rebuild 为什么必须从内部步骤变成正式入口

Source、Corpus、Chunk、Index、Embedding、Validate、Activate 这些能力早就分别存在，但 fresh-clone（干净克隆）视角暴露了一个问题：维护者仍需要知道内部步骤并手工串起来，说明维护路径还没有真正产品化。

最终建立：

```text
SOURCE
→ CORPUS
→ CHUNK
→ PERSIST
→ INDEX_PLAN
→ EMBED
→ VALIDATE
→ 可选 ACTIVATE
```

`knowledge:rebuild --commit <40hex>` 可以固定 source；默认只构建并验证，不自动切 ACTIVE，只有显式 `--activate` 才发生知识真值切换。中断后同一 commit 重跑复用 immutable build（不可变构建），而不是清空重来。

历史真实 operator 对当时 ACTIVE commit 执行得到 806 documents、7,624 chunks、7,670 embeddings、pending=`0`；已有 COMPLETE index 被复用，未携带 `--activate` 时 ACTIVE 前后保持不变。这个过程证明“正式入口”不仅是包一层 CLI，而是必须保留原有身份、幂等和副作用边界。

## Rollback 为什么不能只存在于 Domain 测试里

事务层早已证明 rollback 能成立，但如果维护者仍需进入数据库手工切 snapshot，服务维护路径就没有闭合。因此后来增加 `knowledge:rollback --snapshot-id <id>`，只允许 previous successful snapshot（上一成功快照），并让 status 明确显示当前 ACTIVE 与唯一可回退目标。

它拒绝任意历史版本跳转，也不允许手工 UPDATE 冒充产品能力。这里从“内部机制存在”到“运维人员有正式、安全入口”的差距，是长期服务和 Demo 的一个重要分界。

## 为什么 V0 通过以后还要继续清理边界

V0（首个可交付版本）Gate 全绿以后，仓库仍残留拆仓前的 Site、Conversation、Generation、Phone、Tunnel 等 superseded（已被新设计替代）内容，以及从未使用的空数据库 schema。它们不会让测试失败，却会误导下一位维护者或 AI。

最终做了两层收敛：仍有历史价值的旧 Spec 移到 legacy archive（历史档案）；live tree 只表达 headless RAG。真实数据库先查询对象数，确认空 `answering` / `quality` schema 后通过 0005 / 0006 migration 无 `CASCADE` 删除，没有修改已经执行过的旧 migration checksum。

这里的经验是：**代码边界、文档边界和数据库现实必须一起收敛。** 只改架构图，不代表运行系统已经完成拆分。

## 维护期真正稳定的接口

开发过程里的阶段编号最终都可以退休，长期需要维护的是几条稳定能力：

- rebuild：从确定 source 构建新的可验证 Snapshot；
- activate：显式切换在线知识真值；
- rollback：受限恢复到上一成功版本；
- query：只读消费当前或已固定 Snapshot；
- status / readiness：区分进程、依赖和能力状态；
- Eval：在变更后证明 Retrieval / Evidence / Context / Citation 没被悄悄破坏。

这也是项目从“开发工程”走向“长期服务”的真正分界线：不是某个阶段编号结束，而是曾经需要开发者记忆的操作逐步变成了可验证、可恢复、可交接的产品能力。
