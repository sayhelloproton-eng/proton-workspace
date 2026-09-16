# 12｜V0 Release Gate：用干净 checkout 证明“别人也能重建”

状态：`TECHNICAL_GATE_PASS / PRODUCT_RELEASE_REOPENED / V0_SITES_PRODUCTION_GATE_ACTIVE / PUBLIC_SOURCE_RELEASE_NOT_YET`

## 为什么 S10 全绿还不等于 Release

S10 证明当前工作区的代码、架构、Browser、公网 failure matrix 都成立；但开发机已经有 node_modules、build cache 和长期运行环境。V0 技术 Gate 再加一层问题：只拿 committed repository，能不能从干净 checkout 重建并再次通过完整矩阵？

因此当时创建独立 fresh clone，固定到 `chatweb@4a3296691acbfc1639cb6f580c18792e9b26ea7a`，执行 `pnpm install --frozen-lockfile`，最终 211/211 packages 完成安装。

## Fresh full gate

同一 fresh clone 执行 `pnpm verify:s10`：API 40/40 + Web 11/11 = 51/51 PASS；Requirement→Verification→Evidence=`50→25→25 PASS`；16 项 source gate PASS；Next static export 与 Nest production build PASS；最终标记 `V0_FRESH_VERIFY_EXIT=0`。

第一次 fresh verify 的终态输出因本地 MCP 连接中断丢失。没有把“PID 消失”当 PASS，也没有重做 setup；确认 verify 是幂等 test/build 后，在同一 fresh clone 重跑 verify，直到拿到明确 exit 0。

## 为什么旧的 V0_RELEASE=YES 被重新打开

fresh clone 证明的是**技术可重建性**，不是正式生产拓扑已经上线。当时后续 Browser/Public evidence 使用了 tunnel-hosted frontend；之后重新审计真实目标后确认正式线上形态必须是：

`ChatGPT Sites static frontend → 4310 persistent HTTPS gateway → local Nest Trusted Runtime`

Dev Tunnel 只负责 4310 gateway，不负责托管正式 frontend。于是旧 `V0_RELEASE=YES` 被真实 deployment topology supersede：fresh technical evidence 继续有效，但不能再被解释为“生产发布已经完成”。

当前正式状态是：

- `V0_TECHNICAL_GATE=PASS`；
- `S12_CHAT_PRODUCTIZATION=FINAL_ACCEPTED`；
- `S12_FINAL_PRODUCT_GATE=FINAL_PASS`；
- `V0_SITES_PRODUCTION_GATE=ACTIVE`；
- `V0_RELEASE=NO`，直到 Sites production deploy + production E2E 真正闭合。

## 当前 Sites Production Gate 要证明什么

下一步不重跑已经通过的 S10/S12 全量测试，而是只证明生产交付事实：

1. 本轮唯一 frontend source / Sites version authority 明确；
2. 同一 `apps/web` static export 通过 Sites compatibility/package；
3. 正式 Deploy 到 ChatGPT Sites；
4. Sites 前端只读取公开 `NEXT_PUBLIC_CHATWEB_API_BASE_URL`，并指向正式 4310 HTTPS gateway；
5. Browser 从真实 Sites 页面完成至少 normal Chat 与关键 capability smoke，并证明 CORS/public wire/private-config boundary 仍成立；
6. 只有这组 production evidence PASS 后，才重新裁决 `V0_RELEASE=YES`。

## Release 与公开源码发布不是同一个门

首次公开源码发布前，License 仍必须由用户明确确认。仓库当前没有冻结公开 License / SemVer / tag 规则，所以产品 V0 production release 与 public source release 继续分开治理。

`PUBLIC_SOURCE_RELEASE=NO` 不会否定技术/产品 Gate；同样，未来 `V0_RELEASE=YES` 也不会自动授权源码公开。

## 可复盘的工程结论

Release 不能只问“测试绿不绿”，而要分别回答三件事：

- committed source 能否从零重建；
- production topology 是否按真实交付目标运行；
- public-source governance 是否已被明确授权。

ChatWeb 的真实经历证明：这三个问题可以在不同时间分别 PASS，不能压成一个 `released=true`。
