# 验证依据

`../SKILL.md` 是唯一规则 owner。本文件只保留能解释当前规则的代表性实测证据；数字是样本，不是跨仓性能承诺。

## 1. Round-trip / primitive dominance

- 6-file whole-file apply：Local ≈0.69s；同 6 文件拆成 6 次 Tool 调用 ≈104.4s，约 11.3×。
- 已知源码读取：native `read_multiple_files` ≈650ms；shell batch ≈9.05s；3 次独立 shell read ≈26.56s。

结论：普通文件操作的主要风险是 transaction amplification，不是文件数量。

## 2. Context acquisition

- native read 对约 2829 行大文件曾只返回前 1000 行；Repomix exact 可取得 mutation-grade complete snapshot。
- 历史 blind replay：约 12,163 行 / 120.9k tokens 的宽上下文触发压缩并 over-design；完整 acceptance + 35 行 seam，或约 757 行 owner/direct-dependency context，反而更接近最终正确实现。
- Repomix 若不显式递归过滤嵌套 `node_modules/.git/.next/dist/build/coverage`，dependency/generated/cache 会放大 Context。

结论：Acceptance-first、Implementation-minimal；大文件 exact，Repomix 先做 context hygiene。

## 3. Verification / recovery

- 3 个 proof batched verify ≈10.69s，拆 3 次 ≈25.61s。
- targeted reverify Local ≈2.66s；同 package full suite ≈25.3s。
- VERIFY FAIL 后一次无必要 source reacquire 曾额外产生 ≈22.15s Tool wall。
- same canonical-composer 8-test command 连续 3 次本机 `real` ≈3.14s / 4.04s / 3.80s；此前单次同类 Node test 曾出现 ≈35s 乃至完整 reverify ≈116s 的异常长尾，说明 verify runtime 有真实方差，但不是稳定的分钟级主成本。
- whole-file apply 曾 Tool timeout，但 same-session/authority recovery 证明 mutation 已成功；blind retry fixture 产生重复 effect attempt。

结论：start once、Failure First、frozen repair、targeted reverify、never blind retry；异常长尾要记录为 runtime variance，不能据此把所有 Chat wall 归因给 Local verify。

## 4. Transport / runner evidence

代表性失败与适配：
- source/tar 的超长 base64 放入 shell 或手工跨 connector 搬运，曾截断/损坏；完整文件 temp staging + mechanical tar 更可靠。
- chunked native `write_file` 会把约 200–250 行完整文件拆成 7–10 个 model↔tool transaction；repair 会按次数乘法放大这一成本。
- prompt-aware streaming receiver 原型把 2 个完整文本文件 + manifest + expected-state 合并为 1 次 stdin payload transaction；实测交互返回约 445ms，随后可机械生成 `changed-files.tar`，证明 25–30 行 chunk 不是 Whole-file 模型的不可绕开限制。
- frozen control-plane success path 已证明可由一个稳定 runner 在一次 envelope 后完成 `materialize → apply → verify → terminal receipt`；`chat-local-result>` 能作为确定性返回边界，避免为了等待 PTY/process exit 继续 polling。
- canonical-composer clean replay 随后在唯一 payload 中因模型自行构造的 manifest 缺失 `chat-local-manifest.v1` contract 而约 5m51s FAIL_CLOSED；Apply/Verify 均未开始。该失败证明 manifest 是重复机械表示，不应继续由模型序列化。
- 适配方向：默认 operation envelope 只携带完整文件 + `CREATE|REPLACE|DELETE` 操作、expected-state 和 verification-plan；receiver 本地派生 canonical manifest。旧 `MANIFEST` wire 仅保留兼容路径，不再属于默认模型协议。
- zsh shell path 曾 timeout，而等价非交互 Git authority 用 `/bin/sh` ≈504ms 完成。
- stable runner 曾因 macOS `/tmp` → `/private/tmp` realpath alias 错判 `repository root mismatch`；统一 realpath 后 regression PASS。

结论：Data Plane 与 Control Plane 分离；Whole-file fast path 应让模型只表达“完整文件 + 操作”，机械 manifest/tar/apply/verify 由稳定 Local harness 派生和执行。

## 5. User-perceived wall

真实 UI/执行样本：
- self-hosting 一轮约 83min，而 Apply ≈1.512s、Verify ≈2.346s；明确说明 Local mechanics 不是分钟级瓶颈。
- 后续同类回归约 11m39s、9m18s；10-file fixture + runner repair 约 7m31s；Local Apply/Verify 仍是秒级。
- semantic engineering replay 约 16m32s，但被历史整仓 clone、依赖物化和 teardown 污染，不能作为正常业务 Decision 的纯吞吐基线。
- Skill 全量审计/精简约 9m25s；方法论 PASS，但一次 workspace-wide marker search ≈54s。
- clean provider-busy semantic replay + evidence-driven repair 约 15m44s；无 clone/install/node_modules 污染，仍明显高于 3–5min + repair 目标。
- canonical-composer semantic replay 约 26m44s：case-selection 污染已为 0，但 hidden oracle 首次暴露 acceptance 未声明的 named export，随后一次模型语法错误和一次语义边界错误触发多轮 whole-file repair；chunked Data Plane 把每轮 repair 再放大为多次 Tool transaction。最终 candidate + oracle PASS，但该 wall 不能用于纯模型质量归因。
- 后续 clean replay 在 transport/control-plane 已收敛后约 8m01s；Local Dev 阻塞约几十秒、真实 Apply+Verify 约 7.56s，剩余 wall 主要位于模型/Chat runtime orchestration 与代码生成。
- 再下一次 clean replay 约 5m51s，但在 Apply 前因 manifest contract mismatch FAIL_CLOSED；这不是 semantic design 失败，而是 Frozen wire 仍要求模型重编码内部 manifest schema。

结论：transaction amplification 已显著下降；剩余优化应继续移除模型的机械 schema/Control Plane 职责，再评估不可归因 wall 是否主要来自模型/Chat runtime。

## 6. Batch review｜2026-09-10

首批 7 个 wall 已确认样本：`4980, 699, 558, 451, 992, 565, 944` 秒；p50=`699s`（11m39s），p95=`3783.6s`（受 83min 初始异常样本强烈拉高），Gate PASS 2 / FAIL 5。重复 failure family 中 `TOOL_TRANSACTION=3`、`CHAT_ORCHESTRATION=2` 权重最高；其余 broad search、case-selection、Data Plane、polling、harness 等多为 transaction/orchestration 的具体表现。

因此本轮只升级一个高权重默认：**Decision transaction discipline**。S3 默认每个事实域只购买一轮 discovery，额外 discovery 必须有 named evidence gap；benchmark/replay 的 case selection 与非必要环境准备移出 measured Decision。目标是先减少 Tool round trip 和 Chat orchestration amplification，再用真实任务回归验证。

## 7. Process correctness

最终文件正确不等于过程正确。无效 probe/search、重复 acquisition、错误 harness、无决策价值 polling、blind retry 或 benchmark scope expansion，都必须计入 `PROCESS_CORRECTNESS` / throughput 成本。

Hidden oracle 可以隐藏实现，不能隐藏需求。若首次 oracle failure 才暴露 acceptance 未声明的 public contract，该样本应标记 `HARNESS_HIDDEN_REQUIREMENT` 并从 model-quality repair 统计中剥离。

正反例不按事故逐条累加；新证据优先归入既有 evidence cluster。只有出现新的因果类别，才扩展本文件或 canonical rule。
