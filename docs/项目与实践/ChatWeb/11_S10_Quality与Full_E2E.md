# 11｜S10 Quality / Full E2E / Failure Matrix：让最终验收自己发现缺口

状态：`S10 FINAL_ACCEPTED / implementation chatweb@5e90b343e14b506a1ac4823ea92918c4782b3c2d / context chatweb@4a3296691acbfc1639cb6f580c18792e9b26ea7a / 51_OF_51_PASS / TRACEABILITY_50_25_25_PASS / REAL_PUBLIC_PASS`

## 这一阶段不是“再写一批测试”

S0～S9 已经逐阶段建立了产品、运行时和公网证据，但这些证据仍分散在不同 suite、Runbook 和历史验收里。S10 的目标不是增加功能，而是把 V0 的 Requirement、Verification、Evidence 收敛成一条可以机械执行的最终 Gate，并允许 Final Matrix 反过来暴露真实实现缺口。

最终统一入口是 `pnpm verify:s10`：API/Web regressions、traceability、source architecture/security gate、Web static production build、API production build一次执行。

## Traceability 为什么必须双向

第一版全仓抽取发现两种相反问题：有 Requirement 在 Owner Spec 中存在却没进 Acceptance Matrix；也有 Tool/Operations Requirement 只活在 Matrix，没有 Owner Spec 定义。后者说明“验收表”正在偷偷变成需求真源。

因此最终脚本不只检查 `Owner Spec → Matrix`，还检查 `Matrix → Owner Spec`，并继续要求每个 VER 有定义、被 Requirement 使用、且在 Final Evidence Matrix 恰好出现一次。当前机械链为 **50 Requirement → 25 Verification → 25 Evidence rows PASS**。

## Final Matrix 真正抓出的产品缺口：Model timeout

`VER-FAIL-001` 早已要求 model/context timeout，但实现只有 Context timeout。S10 没有用“历史上没超时过”把它解释掉，而是正式新增 `CTR-PROV-006`：Model generation 使用 server-owned deadline；timeout 与 caller cancel 必须是不同语义。

新增 `MODEL_PROVIDER_TIMEOUT_MS`，默认 120000ms，仅存在于 Trusted Runtime。timeout 映射 `PROVIDER_TIMEOUT`；用户 Stop 仍是 Abort/CANCELLED；非法 SSE 是 `PROVIDER_INVALID_RESPONSE`；transport failure 是 `SERVICE_UNAVAILABLE`。

## Final Review 又发现 policy 双真源

第一版实现同时在 runtime config 和 OpenAI-compatible adapter 里写了 120s 默认值。功能能跑、测试也绿，但 ownership 不干净：以后改一个默认值可能产生漂移。

最终删除 adapter fallback，Runtime config 成为 timeout policy 唯一 owner；adapter 只执行显式传入的 `timeoutMs`。这和 S5 的“Consumer/Provider policy 不复制”是同一类工程原则：稳定 contract 可以共享，策略默认值只能有一个 owner。

## 自动化缺口的补齐

S10 新增了三类关键 regression：

- 两轮 Conversation application test，证明第二轮 Model input 真正包含第一轮 effective assistant history，而不仅是 Domain projection 单测。
- forged provider / private request field 在 SSE headers flush 前 fail-closed，避免先 200 streaming 再报安全错误。
- Model timeout、invalid SSE、timeout vs caller cancel，补齐最终 failure matrix。

最终 API 40/40 + Web 11/11 = **51/51 PASS**。

## 最终公网证据

因为 S10 修改了 Model generation runtime，历史 S9 公网证据不能直接替代最终代码。于是只重跑受影响链路：

1. Normal：final production Browser 正常得到 `public-ok`。
2. Timeout：单次 stream 得到 `slow-part` 后 `PROVIDER_TIMEOUT`；partial 保留、UI 回到就绪、Retry 可用、无自动 replay。
3. Stop→Retry：首 run 得到 `stop-part` 后 Stop，partial 保留并 `/cancel` 一次；Retry 只走 `/retry` 一次，新 Assistant 得到 `retry-ok`，没有重复 User Message。

Browser Console 0 error / 0 warning；storage/HTML/resource URL 中 provider secret、本机 fixture endpoint、timeout/private env probe 均为 0。

## Harness failure 也必须分域

公网 final Gate 中多次出现 10～30 秒 model discovery 等待超时，以及 Playwright MCP 重连后 current page 被切到自身 `connect.html`。这些都没有直接改产品，而是通过 API/tunnel/DOM/resource/fixture 多层事实恢复原因。Stop fixture 还因为机器负载导致首 delta 晚到约一分钟，最终把等待窗口与 provider timeout 分开控制，避免“自动化等待失败 = 产品失败”。

## S10 当前结论

统一机械 Gate：51/51 PASS；traceability 50→25→25 PASS；source gate PASS；API/Web production build PASS；最终公网 normal/timeout/Stop→Retry PASS。S10 已于 2026-09-09 User Final Review 通过并 Final Accepted。

implementation=`chatweb@5e90b343e14b506a1ac4823ea92918c4782b3c2d`，context baseline=`chatweb@4a3296691acbfc1639cb6f580c18792e9b26ea7a`。当前执行门已进入独立 V0 Release Gate；`V0_RELEASE` 仍为 NO，必须经过 fresh setup / final acceptance matrix / release readiness 后才能改变。
