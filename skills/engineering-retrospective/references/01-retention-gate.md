# Retention Gate

## 目的

Retention gate 只回答一个问题：这次事件是否值得继续投入成本，形成长期可复用的工程经验？

它不是状态总结，也不是“任务结束仪式”。对多数普通任务，正确结果就是 `skip`。

## 四个判断维度

### 1. Evidence

至少存在可指向的事实来源：测试、运行结果、日志、代码状态、重复观察、用户纠正或其他可复核证据。

如果连“到底发生了什么”都不稳定，返回 `needs_evidence`。

### 2. Mechanism

能否解释决定结果的机制，而不是只复述症状？常见机制包括 ownership、state transition、ordering、trust boundary、contract、permission、recovery、observability、tool capability 和 information flow。

没有机制、只有“这次很难/很慢/报错了”，通常 `skip` 或 `needs_evidence`。

### 3. Novelty

它是否改变了现有认识？

- 推翻了旧假设；
- 暴露现有规则缺口；
- 发现旧工具/流程已不再合适；
- 给已有经验增加了重要反例或边界。

只是已有规范再次按预期生效，不需要重复沉淀。

### 4. Future effect

能否明确说出下一次要改变什么？例如新增一个设计检查、调整验证顺序、增加恢复门、改变工具选择、补一个回归 case，或在某条件下明确停止。

如果行动只能写成“更仔细”“多关注”“加强沟通”，说明经验还没有提炼完成。

## Decision

- `skip`：缺少长期价值，或只是一次性噪声/已知规则/普通修复。
- `needs_evidence`：价值可能存在，但事实、原因、机制或验证还不足。
- `capture`：Evidence + Mechanism + Future effect 都成立，且 Novelty 足够高。

高影响 single case 可以直接 `capture`；不要求等到重复三次。重复发生只是提高置信度，并可能证明现有防线确实失效。

## 特别有价值的信号

用户在同一类问题上反复纠正 Agent、相同 workaround 多次出现、一次“成功”后来被发现只是表面成功、超时后 side effect 状态不明、或者一个低层工具限制反复污染上层流程，通常都值得至少过一次完整 gate。
