# Evidence、Context、Citation 为什么必须分层

检索把结果排好以后，仍然不能简单地把 Top-K 文本和几个链接拼进 Prompt（模型输入）。ProFlow RAG 把后半段拆成四层，是因为它们回答的是四个不同问题：

- `Candidate`（候选）：检索认为哪些内容可能相关？
- `Evidence`（证据）：这次查询真正采用了哪些可追溯知识？
- `Context`（上下文）：在长度预算内，实际把哪些证据表示给上层模型？
- `Citation`（引用）：消费者最终怎样回到那份确定源码？

```text
Candidate
  ↓ selection
Evidence
  ↓ budgeted representation
Context
  ↓ provenance projection
Citation
```

把这四层拆开以后，回答质量出现问题时，系统才能判断是“找错了、选错了、装不下，还是引用错了”，而不是把所有问题统称为“RAG 效果不好”。

## Candidate 只表示“可能相关”，不能冒充已经采用的事实

Candidate（候选）来自 Retrieval（检索）的最终排序。进入 Evidence Selection（证据选择）以后，系统不会再读取 `fusionScore`（融合分数）重做第二套相关性排序，而是接受检索层已经形成的 final rank（最终排名），只处理集合层问题：重复内容、同一来源占满集合、证据数量上限等。

Evidence（证据）表示本次 `QueryExecution`（一次查询执行）真正采用的知识事实，并保留 `snapshotId/chunkId/contentSha256/source/candidateRank/selectionRank`。为什么选中、为什么跳过之类的 selection reason（选择原因）进入独立 decision trace（决策轨迹），不写进 Evidence 身份。这样策略调整不会把同一条知识事实变成另一个对象。

这一边界不是凭感觉定的。固定 13-case Gold（13 个预先标注期望证据的基准用例）最终推导出的最小 full-coverage（完整覆盖）策略是：

```text
maxEvidence  = 9
maxPerSource = 2
```

`8/2` 会漏掉 Gold，`maxPerSource=1` 又会伤到确实需要同一 source（来源）多个 Chunk 的用例，因此 9/2 是评测结果，不是拍脑袋参数。

## Context 的职责是“怎样表示证据”，不是再选一遍证据

`ContextBundle`（上下文包：真正交给消费者的受预算文本表示）如果为了“尽量塞满”而跳过高排名 Evidence，或者把一条 Evidence 截成半条，就会悄悄形成第二个选择器。这样最终模型看到的内容与 Evidence 层声称“本次采用了什么”就会漂移。

V0 因此采用 whole-Evidence contiguous prefix（完整证据连续前缀）：严格按照 `selectionRank` 从前往后加入完整 Evidence；下一条整体放不下就停止，剩余内容形成 omitted suffix（因预算省略的后缀）。如果第一条证据都装不下，直接返回 `CONTEXT_BUDGET_TOO_SMALL_FOR_FIRST_EVIDENCE`，而不是伪装成 `NO_EVIDENCE`。

Separator（证据间分隔符）本身也计入字符预算，因为 `usedCharacters` 必须等于最终 payload（实际上下文文本）的真实长度。固定 Gold 通过反推“覆盖最后一个正确证据所需的完整前缀”得到：

```text
maxCharacters = 25748
avg usedCharacters = 15986.46
p95 = 25748
Gold coverage = 100%
```

这里选择 character budget（字符预算）而不是 token budget（模型分词预算），是一个职责边界决定：RAG 不绑定某个 Chat 模型的 tokenizer（分词器）。未来如果需要 token-aware optimization（按模型分词优化），应该显式扩展接口契约，而不是让 FAST / THINK 模型选择偷偷改变同一次 RAG Query 的证据语义。

## `NO_EVIDENCE` 和“能力降级”是两件不同的事

没有证据不等于系统降级；系统降级也不等于没有证据。比如 Embedding（向量召回）超时以后，系统可能退化为 lexical-only（只使用关键词召回）但仍然找到有效 Evidence，此时应该表达为 `DEGRADED + AVAILABLE`。只有最终候选集合确实为空时，才是结构性的 `NO_EVIDENCE / EMPTY_FINAL_CANDIDATES`。

项目还用 8 个明显 out-of-scope query（超出知识范围的查询）探索 semantic threshold（语义接受阈值）。结果发现：正例与负例的 Top1 RRF（倒数排名融合）分数明显重叠；在不误杀 13 个正例的前提下，一个安全阈值只能拒绝 37.5% 的探索性负例。因此 V0 明确冻结：

```text
semanticAcceptance = NONE
```

这不是“系统不处理无证据”，而是拒绝把未经校准的融合分数冒充“相关概率”。当有候选但系统又想判断 `NO_EVIDENCE` 时，宁可 fail closed（证据不足时拒绝武断地产生成功语义），也不凭经验拍一个阈值。

## Citation 只能从已经采用的 Evidence 派生

Citation（引用）不是模型自己生成的“参考链接”。它把 Evidence identity（证据身份）、content hash（内容哈希）和 `SourceCoordinate`（源码坐标）绑定到固定 commit 的 permalink（永久定位链接）：

```text
/blob/<40-hex-commit>/<path>#Lx-Ly
```

`main` 会移动，因此不能用于历史回答的稳定引用。Citation 顺序严格跟随 Evidence 的 `selectionRank`；commit 不一致直接 fail closed。Context 因预算可能只表示 Evidence 的前缀，但完整的 selected EvidenceSet（已选择证据集合）仍保留完整 Citation；真正进入本次 Context 的来源，可以通过 `ContextBundle.evidenceIds` 与 Citation 的证据身份做交集得到。

这让“系统采用过哪些知识”和“模型这次实际看见哪些知识”既有关联，又不会被混成同一个事实。

## 四层分离最终得到的是可诊断性

一次回答不理想时，可以沿责任边界继续追：Candidate 排错了就回到 Retrieval；候选正确但 Evidence 集合不合理就看 Selection；Evidence 正确但关键内容因预算没进入模型就看 Context policy（上下文策略）；内容正确但来源链接漂了就看 Citation / provenance（来源追踪）。

如果四层被压成“Top-K chunks + links”，这些问题都会坍缩成一个模糊结论。分层的价值不只是架构整齐，而是让质量问题能够落到真正应该修改的地方。
