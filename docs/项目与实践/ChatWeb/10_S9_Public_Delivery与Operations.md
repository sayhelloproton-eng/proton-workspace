# 10｜S9 Public Delivery 与 Operations：把“能跑”变成“公网可运营”

状态：`S9 FINAL_ACCEPTED / implementation chatweb@51014647ad77983a9e589febdf5a627c21f52c9e / context chatweb@3841cde59e7e549d46880d36ea4884cef6f30e26 / 46_OF_46_PASS`

## 这一阶段真正解决什么

S1 已经确定部署拓扑：Next static frontend 面向 Sites，本机 Nest 是 Trusted Runtime，通过 tunnel 提供公网 API。S9 不重做架构，而是回答更难的一层：这套东西在真实公网环境里，能不能稳定启动、被监控、被重启、被浏览器安全访问，并且故障时留下可信运营事实。

因此 S9 的核心不是“加一个部署脚本”，而是把四个边界做成可验证事实：liveness/readiness、public network、restart stability、request observability。

## Liveness 与 Readiness 为什么必须分开

`GET /health` 只证明 Nest 进程活着，不探测外部 Model/RAG。`GET /health/ready` 只判断当前 Chat runtime 是否至少有一个 allowlisted Model；没有 Model 时 503 fail-closed。

这样 health 本身不会因为远端 provider 慢或断网变成新的故障源，也不会把 provider endpoint/key/timeout/budget 暴露出去。

## Public tunnel 的 ownership

Backend 继续只 bind loopback。公网能力来自官方 Dev Tunnel CLI，tunnel 是 operations tool，不进入 ChatWeb runtime dependency，也不进入 Chat Domain。使用 persistent named tunnel 的目的只有一个：Backend 或 host process 重启后，public API origin 仍然稳定。

真实执行中第一次 create 被服务端 quota/rate-limit 表象拦截。最终不是反复重试，而是先核对现有资源，只删除一个可证明为 0 port / 0 host / 0 client / 无描述的孤儿 tunnel，再建立 ChatWeb 专用资源。这个过程验证了一个运维原则：外部资源 mutation 前必须先证明 ownership。

## Restart 不是“服务重新起来了”这么简单

S9 分两层验证 restart：

1. Backend 单独停止时，同一 public URL 明确不可用；4310 重新监听后，同一 URL 恢复 health/ready/SSE。
2. Tunnel host 单独断开时公网不可达；重新 host 同一 persistent tunnel 后，public origin 不变并恢复完整请求链。

所以真正被验证的是 `stable public identity + recoverable local runtime`，而不是某次进程偶然启动成功。

## Request correlation 的 Final Review bug

第一版 middleware 给每个请求生成 `x-request-id`，并在 `response.finish` 后写 method/path/status/duration。普通 HTTP 和完整 SSE 都没问题，但 streaming 客户端中途断开时，Node response 可能只触发 `close`。这意味着“最需要排障的异常请求”反而可能没有 access fact。

最终改为：

```text
finish -> outcome=completed
close  -> outcome=closed
两者竞争 -> exactly once
```

日志只保留 requestId/method/path/status/duration/outcome；query、body、Authorization、Cookie 都不记录。

## 为什么第一次 close 验收不能算数

最初用普通 fixture 做“客户端读 1 byte 就断开”，日志仍是 `completed`。原因不是实现错误，而是 fixture 太快：provider 在客户端真正 close 前就完成了。

于是换成临时慢 SSE fixture，让 provider 在首段之后保持连接，再主动断开。最终得到一条且仅一条 `outcome=closed`，request body marker 没进入日志，同时 fixture 观察到 upstream response close。这个例子说明：验证 failure path 时，fixture timing 本身也是测试条件。

## 真实 Public Browser 证据

最终使用 production static `out/` 作为公网 frontend，Browser 真实访问 HTTPS frontend，再跨 Origin 请求 HTTPS Trusted Runtime。模型 discovery、SSE Chat、精确 ACAO、`x-request-id` 全部 PASS；最终 smoke 显示 `S9 final browser smoke -> public-ok`。

Browser Console 0 error / 0 warning；storage/HTML/resource URL 中 provider secret、本机 model endpoint 与 RAG private env probe 均为 0。

## 最终机械证据

- API 35/35 + Web 11/11 = **46/46 PASS**。
- API production build PASS；Web production static export PASS。
- Public TLS/CORS/health/readiness/model discovery/SSE PASS。
- Backend restart 与 tunnel reconnect 后 public origin 均稳定。
- client-close access fact：`outcome=closed` exactly once，body marker=0。
- source-only Formal Gate 全项 PASS：Browser private facts=0、runtime tunnel coupling=0、unsafe logging=0、health private leak=0、generated output=0、lockfile drift=0。

## 工程方法上的收获

S9 最重要的不是 tunnel 本身，而是把“交付环境中的真相”分层：产品代码、进程、fixture、自动化、外部 SaaS 配额分别有自己的 failure domain。只有把这些层拆开，才能避免因为 tunnel quota 去改产品，也不会因为 fast fixture 把 `completed` 错判成 `closed`。

## 可以用于面试的核心表达

“我把一个本机 Trusted Runtime 做到真实公网可运营时，没有把 tunnel SDK 塞进业务代码，而是保持 Backend loopback-only，用 persistent tunnel 只负责 transport。健康检查拆成 liveness/readiness，request observability 只记录非敏感元数据。Final Review 发现 finish-only access log 会漏掉 SSE 客户端断连，于是补了 finish/close 双终态和 exactly-once guard，并用慢 SSE fixture 真实证明公网 client abort 会记录 `outcome=closed`、同时不会泄漏 request body。”

当前状态：S9 已 Final Accepted。implementation=`chatweb@51014647ad77983a9e589febdf5a627c21f52c9e`，context baseline=`chatweb@3841cde59e7e549d46880d36ea4884cef6f30e26`；执行门已进入 S10 Quality / Full E2E / Failure Matrix。
