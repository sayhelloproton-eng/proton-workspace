# 验证依据

本文件只保存实测证据摘要；唯一规则 owner 是 `../SKILL.md`。数字是样本，不是跨仓性能承诺。

## Round-trip dominance

ProFlow 实测：
- 6-file whole-file apply：Local ≈0.69s，Tool wall ≈9.25s。
- 同 6 文件拆成 6 次调用：Tool wall ≈104.4s，约 11.3×。
- 10-file whole-file apply：Local ≈0.79s。

结论：文件数量不是分钟级瓶颈，控制面 transaction 数量更重要。

## Primitive selection

同类已知源码读取：
- Local native `read_multiple_files` 样本 Tool duration ≈650ms；
- shell batch read ≈9.05s；
- 3 次独立 shell read 合计 ≈26.56s。

结论：普通 read/search 应优先 native primitive，`start_process` 不应充当通用文件 API。

## Large-source snapshot

`platform-host/src/index.ts` 约 2829 行时，native multi-read 样本只返回前 1000 行，存在 Fake Freeze 风险。
Repomix exact 成功一次完整取得 4211 行 / 32.6k tokens 的 mutation-grade snapshot。
Repomix compressed 可把同类 discovery payload 大幅压缩，但不能替代完整 changed-file source。

## Scenario discovery

真实 provider-busy recovery 中：
- CodeGraph 能给出结构 ownership，却漏过实际 dirty `deployment/role-mapper.ts`；
- tracked `git grep` 会漏 untracked regression test；
- Local native filesystem search 能看到当前 WIP/untracked hits。

结论：未知 scope 需要按事实域组合结构 evidence + 当前 filesystem evidence。

## Verification efficiency

- 3 个 proof 一次 batched verify ≈10.69s Tool wall；拆 3 次 ≈25.61s，约 2.39×。
- frozen-context targeted reverify Local ≈2.66s；同 package full suite Local ≈25.3s，约 9.5×。
- VERIFY FAIL 后一次无必要 source reacquire 样本额外 ≈22.15s Tool wall。

结论：Failure First + frozen repair + targeted reverify 是 debugging 默认路线。

## Timeout / UNKNOWN

真实 whole-file apply 曾出现 Tool timeout 但 authority recovery 证明 mutation 已成功。保留 PID/session 时 continuation 成本远低于新开 authority process；fixture blind retry 产生两次 effect attempt。

结论：start once，same-session recovery first，never blind retry。

## Semantic-context experiments

真实历史 blind replay：
- 大而全 package：约 12,163 行 / 120.9k tokens，在 Decision 前触发 context compression，throughput fail。
- compressed discovery → 40.5k full exact：能得到正确 owner，但出现未被 acceptance 要求的 over-design。
- 完整 acceptance evidence + 35 行 implementation seam：几乎逐字命中真实 `executionRequestContext` 提交。
- 完整 acceptance + 473 行 owner + 74 行 direct dependency，总约 757 行：几乎完全命中 Tasks Web self-contained 提交。

结论：**Acceptance-first + Implementation-minimal** 是当前最佳语义输入形态。

## Whole-file materialization

真实 500+ 行 whole-file blind materialization 中，语义设计命中但第一次完整文件比历史 oracle 少 1 个空行。
结论：whole-file transport 本身仍正确；大量 unchanged bytes 的手工重生成存在 formatting-only drift，应优先发展 Chat-side deterministic whole-file materialization，同时保持 Local 只接收完整文件。
