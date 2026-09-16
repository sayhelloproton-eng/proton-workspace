# Git 真源与飞书知识投影

> 定位：跨项目的知识发布与文档治理专题材料。这里沉淀稳定原则和真实发布边界，不承担项目运行真值，也不要求所有本地材料都进入飞书。

## 1. 当前模型：轻映射，重提炼

当前知识体系只保留一个简单关系：

```text
Git / proton-workspace
= 本地工程与知识真源

本地 docs
= 工程材料 / 研究材料 / 过程记录 / 学习材料 / 知识候选

成熟主题
→ 提炼 / 重写
→ 飞书知识库
= 正式对外展示投影
```

本地材料可以很多，飞书正式知识可以很少。完成标准不是文件数一致，而是重要知识有 Owner、成熟知识有正式入口、历史材料已裁决、没有重复真源。

## 2. 从旧知识系统保留下来的原则

### Git 是唯一正式真源

旧 ADR-002 最值得保留的判断是：Git 与飞书不能同时成为可独立修改的正式事实源。版本、Diff、Review、回滚和工程证据应留在 Git；飞书提供阅读、分享和知识展示体验。

因此：

- 不做自动双向同步；
- 飞书人工编辑不会自动覆盖 Git；
- 飞书发布成功也不会改变项目代码、Spec、Task 或 Runtime Truth；
- 真正影响未来执行的知识，先回到当前 Git Owner 再发布。

### 文档和资源应一起可迁移

旧 ADR-003 / SOL-004 中仍成立的是 Document Bundle 思路：正文需要图片时，本地 Markdown 与本地资源保持在同一个可 Review 的主题范围，Publisher 再转换成飞书原生媒体。

保留：相对资源、上传前 preflight、图片发布失败时不能把缺图正文冒充完成、远端媒体 token 不回写本地正文。

不再保留：为了资源、节点和文档建立独立 Registry 或稳定 Asset ID 映射。

### Provider 元数据不定义知识真值

旧 ARC-004 中仍成立的边界是：Space ID、Node Token、revision、媒体 token 等只是 Feishu Adapter / Publisher 的执行元数据，不能反向定义领域知识身份。

发布层只负责“怎样把已经决定好的知识安全投影出去”，不拥有“什么内容应该成为正式知识”的语义决定。

## 3. 从 Feishu CLI 实验保留下来的机械经验

历史 `lark-cli` 实验给出的长期经验继续有效，但具体 CLI 版本和 Schema 在真正发布时必须重新核验：

- 优先使用官方 `lark-cli`；
- 创建 Space / Node 前先查重，不能把 timeout 当成“肯定没创建”；
- `visibility`、OpenAPI 可读与互联网公开不是同一个概念；
- CLI 不支持的元数据更新不能靠猜测内部接口补齐；
- 创建、overwrite 或上传结果不确定时，先读远端 authority 对账，再决定是否重试；
- 发布后必须回读标题、正文/指纹和必要媒体结果，不能只凭命令退出码宣布完成。

这些经验现在由 workspace 的发布 Skill / Automation 继续承载，而不是重新写一套同步服务。

## 4. 当前唯一发布实现 Owner

政策与授权边界：

```text
skills/feishu-knowledge-publish/
```

稳定机械实现：

```text
automation/feishu-knowledge-publish/
```

底层执行优先使用官方：

```text
lark-cli
```

不再新增第二 Publisher、同步数据库、Projection Registry 或节点映射业务系统。

## 5. 成熟主题的发布流程

目标流程是：

```text
选择已经成熟的主题
→ 决定对应的飞书展示节点 / 栏目
→ plan / dry-run / 查重
→ 复用唯一节点或安全创建
→ 图片 preflight + upload（如需要）
→ render
→ whole-document overwrite
→ read-back verify
→ timeout / UNKNOWN 时 reconcile
```

飞书的栏目顺序是展示层决策，可以与 Git 目录顺序不同。一个成熟主题可以由多份本地材料提炼而来；不要求“一个本地文件 = 一个飞书节点”，也不要求所有本地材料被发布。

## 6. 明确淘汰的旧复杂度

以下路线不再恢复：

```text
本地文件 ID ↔ 飞书节点 ID 的业务 Registry
代码模块 ↔ 文档 ↔ 飞书严格 1:1
Platform Registry 管知识发布状态
为了同步新增数据库 / Relation / Release / Migration Schema
Feishu Native 自动晋升并反写 Git
所有本地文档自动发布
为了目录一致性制造额外 Protocol
```

旧 `SOL-KNO-001` 的价值主要是证明了这套治理可以被做出来，也证明了它的维护成本。当前体系选择更小的解法：语义提炼由人和模型完成，重复机械发布由现有 Automation 完成。

## 7. 当前需要收口的一个 drift

最新文档体系要求“按成熟主题投影、飞书展示顺序可以独立”，但当前 `feishu-knowledge-publish` Skill 仍保留 `same-path projection` 表述；同时迁移上下文期望的正式发布源命名与当前本机目录/Skill 还存在 `docs/knowledge` 与 `docs/知识库` 的命名差异。

这属于发布政策 drift，不应通过新增 Registry 或映射层解决。第一次正式发布前，只需要把现有 Skill / Automation 的输入与节点选择语义收敛到最新原则，并保留原有 overwrite、图片、UNKNOWN reconciliation 等稳定机械能力。

## 8. 发布前的判断门槛

一篇内容只有同时满足下面条件才值得进入飞书：

- 主题已经成熟，近期不会因项目事实快速变化而大改；
- 已经区分当前事实、历史过程和推导结论；
- 没有第二真源或旧 Owner 冲突；
- 重要来源和 Evidence 能被回查；
- 对外展示确实有价值，而不是仅为了“同步完整”；
- 发布后的远端内容可以通过当前 Publisher 回读验证。

不满足时继续留在本地材料层即可。这不是缺失，而是知识尚未完成提炼。

## 9. 本地材料、公开仓与秘密的边界

旧 `ENG-001` 与 `SOL-003` 里值得长期保留的不是 `.private-context` 这一个目录设计，而是更简单的边界：**可进入 Git 的材料、可公开的材料、可以被 Agent 读取的私有材料、真正的 Secret 不是同一集合。**

长期规则：

- 公共 Git 可以保存代码、架构、已脱敏实验、研究摘要和自己拥有版权的知识材料；
- 私人工作材料、简历原件、未脱敏业务数据、认证缓存和未授权第三方全文不能因为“对 Agent 有帮助”就进入公开仓；
- Token、Cookie、密码、私钥、API Key 等 Secret 不放在 Markdown、Prompt 或普通私有资料目录中，应交给环境、Keychain 或受控 Secret Owner；
- Agent 读取私有材料时只取当前任务所需的最小范围；对外输出前再做脱敏与人工/规则 Review；
- 大型第三方源码镜像和原始导出不是个人知识资产。长期需要的是可验证摘要、来源引用和自己的结论。

具体项目可以选择自己的私有目录或存储方案，不需要 workspace 再强制一种 `.private-context` 目录协议。

## 10. 知识候选怎样晋升，而不是把每次事故都写成规则

旧 Engineering Insight Pilot 最有价值的不是某个 Registry，而是一条低成本知识提炼纪律：

```text
事件 / 材料出现
→ Screening：值不值得长期保留？证据够不够？
├─ 低价值 / 一次性噪声 → reject
├─ 证据不足 → needs evidence
└─ 有复用价值 → full extraction
                    ↓
              candidate / provisional
                    ↓
              重复证据 / 人工 Review
                    ↓
              稳定知识 / Skill / 正式主题
```

Screening 应比 Full extraction 便宜。历史 Pilot 中，轻量 Screening 能保留“继续、补证据、拒绝”这些关键分叉，而不急着生成完整洞见资产。这个思路比“所有材料都自动总结并发布”更适合当前轻量体系。

评估提炼方法时，优先使用：同一批真实案例、相同输入、固定 Rubric、正例 + 证据不足例 + 低价值负例，并同时比较输出质量与成本。单次受控 Pilot 可以证明结构差异，但不能包装成独立盲测或统计显著结论。

知识晋升的核心不是多维护一个 maturity database，而是保持证据纪律：一次成功不自动变成通用规则；模型推断不冒充 Fact；重复出现且因果清楚的经验才值得提高稳定性和传播等级。
