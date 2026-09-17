# 从 Localhost 到 Sites 交付为什么需要分层验收

ChatWeb 很早就能在 localhost 打开页面，也很早就有 production build。真正走到发布时却不断证明：**代码能跑、当前开发机能跑、干净 checkout 能重建、正式 Sites 拓扑已上线，是四件不同的事。**

这条认识是被交付过程一步步逼出来的：静态导出让原来的 preview 命令直接失效；公网 tunnel（隧道）问题最后追到资源配额而不是业务代码；SSE（Server-Sent Events，服务端流式事件）断开又暴露 access log 只监听 `finish` 的盲区；干净 checkout 证明技术可重建以后，正式 Sites 拓扑仍然没有被证明，于是“已经发布”的结论被重新打开。最终才形成技术、产品交付和公开发布三层 Gate（验收门）。

## 最终交付拓扑为什么要从真实部署位置反推

正式产品目标是：

```text
ChatGPT Sites static frontend
        ↓ HTTPS
4310 persistent public gateway
        ↓
local Nest Trusted Runtime
```

Backend 继续 loopback-only（只监听本机回环地址），公网暴露由受控 gateway / operations 层完成；Tunnel 不是 Chat Domain dependency（聊天领域依赖）。Frontend 同一 Next 源码支持本地开发和 Sites static export（静态导出）。

早期曾用 `next start` 作为 production preview；加入 `output: "export"` 后它真实 exit 1，因为产物已经变成静态 `out/`。本地生产预览因此改为 `serve out`，形成：

```text
next dev
→ next build
→ serve out
→ ChatGPT Sites
```

这个失败很小，却验证了一个长期原则：**交付拓扑改变以后，验证方式也必须跟着改变，不能继续沿用旧 Runtime 假设。**

## Liveness 与 Readiness 为什么要分开

`GET /health` 只证明 Nest 进程活着，不同步探测远端 Model / RAG；`GET /health/ready` 判断当前 Chat Runtime 是否至少拥有可用的 allowlisted Model（允许列表中的模型）。这样外部模型波动不会把 health endpoint 自己拖成故障源，也不会在 public response 里泄漏 provider endpoint / key。

这里把“进程能回答 HTTP”和“产品当前具备服务能力”拆成了两个可独立观察的事实。

## 一次 Tunnel 配额问题为什么不能靠反复重建解决

公网交付阶段使用 persistent tunnel（持久隧道）验证稳定公网身份。Backend 或 tunnel host 单独重启后，同一 public origin 能恢复，是“可运营”比“曾经访问成功”更重要的证据。

过程中 tunnel create 曾出现 rate-limit（限流）表象，最终追到资源数量配额。系统没有反复 create，而是先枚举资源 ownership（归属），只删除一个能证明无 port / host / client / description 的孤儿 tunnel。

这次故障留下的不是一个 CLI 技巧，而是：**外部资源 mutation（修改）前先证明 Owner；状态不明时不能靠重试制造更多资源。**

## SSE 断开为什么暴露了 Observability 的终态盲区

第一版 request access log 只监听 `response.finish`。SSE client 中途断开时 Node 可能只触发 `close`，最需要排障的请求反而没有日志。最终变成 `finish→completed / close→closed` 的 exactly-once（恰好一次）终态记录，只保存 requestId / method / path / status / duration / outcome，不记录 query / body / Authorization / Cookie。

最初“读一字节就断开”的 fixture 太快，provider 已先自然完成，仍记录 completed。换成慢 SSE fixture 后才真实得到一次且仅一次 `outcome=closed`。这说明 Failure-path（失败路径）验收里，fixture timing（夹具时序）本身也是事实条件。

## 为什么综合测试全绿以后还要做 Clean Checkout

综合质量 Gate 历史结果曾达到 API `40/40` + Web `11/11`、Requirement→Verification→Evidence=`50→25→25`、source gate 和 production build 全 PASS。它还真实补出了 Model timeout 缺口，并把 timeout policy 收回 Runtime single owner（单一归属方）。

但当前工作区早已有 node_modules / cache / runtime。为了证明“别人只拿 committed source 也能重建”，后续技术门使用 clean checkout + frozen lockfile（干净检出 + 冻结锁文件）：`211/211` packages install，fresh verification 仍 `51/51`，最终 marker `V0_FRESH_VERIFY_EXIT=0`。

这一步解决的是可重复构建，不是正式线上交付。

## 为什么技术可重建以后，“Release”还会被重新打开

历史上 fresh technical evidence 一度被解释成 `V0_RELEASE=YES`。后来重新审计正式交付拓扑，发现当时 Browser / Public evidence 仍使用 tunnel-hosted frontend，而正式目标应该是 ChatGPT Sites frontend → 4310 gateway。于是旧 release 状态被重开。

这个纠偏最终形成三层明确门：

- Technical reproducibility（技术可重复）：committed source 能否从零重建；
- Product production delivery（真实产品交付）：Sites + public backend 拓扑能否完成 E2E（端到端验收）；
- Public source release（公开源码发布）：License / version / tag 等公开治理是否授权。

三者可以在不同时间分别 PASS，不能压成一个 `released=true`。

## 为什么最后一层验收必须看真实 Browser

静态 build、API tests 和 source gate 只能证明源代码与产物；真正交付还要验证 Browser 从正式页面跨 Origin 请求 Trusted Runtime、Streaming、CORS、Citation、Stop / Retry、能力入口和 private-config boundary（私有配置边界）。

因此 Sites Production Gate 不该为了“更稳”重跑全部历史 Gate，而应消费已经稳定的机械证据，只重新验证真正变化的 production topology（生产拓扑）与 real Browser path。

从 localhost 到 Sites 的整个过程最终证明：**发布不是最后跑一次大测试，而是逐层证明不同事实；上游 Gate 已稳定时，只重新验证真正变化的那一层。**
