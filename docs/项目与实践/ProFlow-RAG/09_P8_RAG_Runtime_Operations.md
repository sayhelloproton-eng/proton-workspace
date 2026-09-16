# 09｜P8 RAG Runtime / Operations：把“能调用”做成“能长期运行”

状态：`Final Acceptance PASS`

P7 证明了外部项目能调用 RAG，但一个服务要长期存在，还必须回答：谁启动 API、什么时候算 ready、Embedding 掉了是不是整体挂了、数据库挂了该返回什么、服务停止时怎样保证不误杀别的进程。P8 就是在补这些运行时能力。

## 1. 先清理拆仓前遗留的 Runtime 心智

进入 P8 时，Runtime Spec 里还残留 phone model / grounded answer / generation 等拆仓前职责。第一步不是写代码，而是按 ADR-012 把运行时重新基线成 headless RAG：RAG 只管理 API、PostgreSQL truth、Embedding、optional Reranker、Knowledge Snapshot 和故障降级，不再拥有生成模型。

## 2. 发现第一个真实缺口：`/health` 只是“进程活着”

原 `/health` 基本等价于静态 `ok`。Nest 进程即使连不上数据库、没有 ACTIVE Snapshot，也会看起来健康。P8 把它拆成真正的 RAG readiness：

- DB + ACTIVE Snapshot + Embedding 正常 → `ready`；
- DB/Snapshot 正常但 Embedding offline → `degraded`，因为 P2/P3 已证明还能 lexical-only；
- DB 或 ACTIVE Snapshot truth 无法建立 → `unavailable`。

Reranker 默认 OFF，因此它不能成为 readiness blocker。Public health 只暴露 `ok/degraded/unavailable`，DB/model/PID/endpoint 这些内部诊断只进入 operator status。

## 3. 给 API 建立真正的 runtime owner

此前 API 只有 `node dist/main.js`，没有仓库自己的生命周期。P8 新增 `runtime:api:start/status/stop`：PID 和 log 放在 `.runtime/api`；start 先检查 build、端口与旧 PID；status 同时核对进程命令 ownership 和 `/health`；stop 只向 owning PID 发送 SIGTERM，bounded wait 后仍不退出才 SIGKILL。

这里特意没有让 `start` 自动 migration 或 rebuild。启动服务是可逆 runtime 动作，Knowledge activation 是 truth mutation，两者不能偷偷绑在一起。

## 4. 再增加内部 system status

Public health 不能泄露细节，但 operator 排障必须知道哪层坏了，所以新增 `runtime:system:status`，内部聚合 API / PostgreSQL / ACTIVE Snapshot / Embedding / optional Reranker。这样 consumer 看到的是抽象 readiness，维护者看到的是具体 owner 状态。

## 5. 实现和验证过程中的真实问题

第一版 runtime smoke 里有一条组合断言会制造必然假失败，在真正跑 Gate 前自审计发现并删除。这是 first-pass harness quality 的一次反例。

随后 targeted 执行时 Local Dev connector 返回 502，但持久 exit/log 最终证明 typecheck、build 和五个 runtime 场景全部 PASS，因此没有盲重跑。

第一次 Formal Gate 中，P8 自己的 API lifecycle、public health、Embedding degradation、DB unavailable、system status 已全部 PASS；失败发生在后面的旧 P6 Eval——共享旧 Mac 上 Nest 启动超过了原 30 秒窗口。最终只修 Eval harness 为 90 秒 overall deadline + bounded health fetch，不修改 P8 产品逻辑，再跑一次 Gate 得到 exit 0。

## 6. P8 最终形成了什么

到这里，ProFlow RAG 不只是“有一个 HTTP endpoint”，而是已经有仓库 owner 的启动/停止、readiness、故障降级和内部运行状态。Embedding 掉线时服务不会误报完全死亡；数据库或 ACTIVE Snapshot truth 丢失时也不会冒充可用。

阶段末同时回归了 13-case RAG Capability 和 degradation。P8 还是第一份主动采集吞吐数据的阶段：initial blast radius 23 files，最终 semantic implementation 24 files，DCR≈95.8%，3 次 implementation mutation，Mutation Density≈8 files/call，atomic batch retry=0。
