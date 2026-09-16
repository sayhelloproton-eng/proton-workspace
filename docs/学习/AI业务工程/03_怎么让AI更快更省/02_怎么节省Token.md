# 怎么节省 Token

假设现在让 Agent 去一个大仓库里排查“为什么提交订单后库存没扣”。最笨的做法，是把仓库、规则、几十个工具定义、搜索结果和历史聊天全部塞给模型，然后希望它自己找到重点。

真正有效的 Token 工程不是先追求一个漂亮的压缩比例，而是不断追问：**这一步为什么需要模型？这份内容为什么要进模型？能不能先由程序算？能不能只取结构？能不能在 Tool 边界先过滤？用完以后为什么还留着？同样的事情为什么还要再算一次？**

如果按具体项目罗列，很快会变成工具大全。更稳定的理解方式，是按照“工程手段”分类：同一种减法放在一起，项目只是这种手段的不同实现。

## 先按工程手段分成七类

```text
1. 程序化 / CLI / 脚本化
   → 确定性工作直接在模型外完成

2. 结构索引与按需取数
   → 不让模型自己扫仓库、猜关系、读无关材料

3. Tool 边界治理
   → Tool Schema 少加载，Tool Result 先过滤，中间结果少进 History

4. Context / Prompt / 表示压缩
   → 已经需要进入模型的信息，再做规则压缩、语义压缩或换表示

5. History / State / Memory 生命周期
   → 用完退出，长期信息外置，需要时再取

6. Cache 与复用
   → 已经算过而且仍有效的结果，不再重新调用模型

7. 输出预算与模型分工
   → 少生成；任务被收窄以后，再决定小模型还是强模型
```

这七类不是七个互斥插件，而是从模型外到模型内的一条减法链。优先级通常是：**能不调用模型，就不调用；能不取，就不取；能在 Tool 边界过滤，就别让模型先读；最后才考虑有损 Prompt Compression。**

## 再看工具：社区规模、落地性、许可证要一起看

下面的 Star 是 **2026-09-07 复核时的量级约数**。GitHub 数字变化很快，而且页面缓存时间并不完全一致，所以这里不追求小数点后一位的“假精确”；它只用于判断社区规模，不拿 Star 直接证明技术效果。

| 工具 | Star 约 | 接入方式 | 主要解决什么 | 现实判断 |
|---|---:|---|---|---|
| [Caveman](https://github.com/JuliusBrussee/caveman) | ≈100k | Skill / Plugin / Proxy / MCP | 少输出、压 Skill、Pixel Mode、请求侧压缩 | 社区爆款；Skill 等表面 MIT，Engine/Proxy 等核心运行时为 BSL-1.1 source-available |
| [RTK](https://github.com/rtk-ai/rtk) | ≈75k | CLI + Agent Hook / Plugin | `git/test/grep/tree` 等命令输出先压，再进 Context | 很适合直接落地；Apache-2.0，支持 Claude Code、Codex、OpenCode、Cursor 等多种 Agent |
| [CodeGraph](https://github.com/colbymchenry/codegraph) | ≈70k | CLI + MCP | `.codegraph` 预计算 symbol / call / dependency 图，查询时返回 surgical context | **我们实际在用的实现**；MIT、100% local、自动增量同步，适合 Coding Agent 直接接入 |
| [Headroom](https://github.com/headroomlabs-ai/headroom) | ≈66k | Local Proxy / SDK / MCP / Wrapper | Tool Result、日志、JSON、文件、RAG、History 进入模型前压缩 | Token Compression 头部工程实现；Apache-2.0，可观测压缩前后 Token |
| [Aider](https://github.com/Aider-AI/aider) | ≈49k | 完整 Coding Agent | Repo Map 在固定 Token Budget 内挑重要 symbol | 原理和工程验证都很成熟；如果本来不用 Aider，不必为了 Repo Map 单独换 Agent |
| [GitNexus](https://github.com/abhigyanpatwari/GitNexus) | ≈47k | CLI + MCP + Hooks | 调用链、依赖、impact、trace 提前由图计算 | 社区很大、很活跃；但许可证是 PolyForm Noncommercial，不是 OSI 开源，商业使用先看许可 |
| [Serena](https://github.com/oraios/serena) | ≈29k | MCP | symbol / reference 级语义检索和编辑 | 很适合接现有 Agent；MIT，LSP 后端免费开源 |
| [Repomix](https://github.com/yamadashy/repomix) | ≈28k | CLI / MCP / Plugin | 大仓库先压成结构化、可控的内容面 | 成熟、简单、低侵入；MIT |

这批里，**CodeGraph、RTK、Headroom、Serena、Repomix** 都能直接塞进现有工作流做 A/B；其中 CodeGraph 还是我们已经在真实研发流程里使用的工具。**Caveman** 非常值得测，但要注意 split license；**GitNexus** 技术和社区都强，但商业使用的许可证边界必须先看清；**Aider Repo Map** 更适合拿来学习“Token Budget 下怎么挑代码”，除非你本来就在用 Aider。

还有一批工具也很有价值，但更像“专项组件”，需要你改自己的数据链或应用代码：

| 工具 | Star 约 | 适合研究什么 | 为什么不放第一批 |
|---|---:|---|---|
| [Mem0](https://github.com/mem0ai/mem0) | ≈65k | 长期 Memory 外置 + 检索 | 它不是 Prompt Compressor；价值是避免每轮重放全部历史，只取当前相关 Memory |
| [TOON](https://github.com/toon-format/toon) | ≈25k | JSON / 表格数据换成更省 Token 的序列化 | 要接到 Tool Result / API 数据链，且只在合适数据形态下划算 |
| [GPTCache](https://github.com/zilliztech/GPTCache) | ≈8k | Semantic Cache，命中后整次 LLM 调用消失 | 要设计 Cache Key、相似度和失效，不能无脑套在实时数据上 |
| [LLMLingua](https://github.com/microsoft/LLMLingua) | ≈6.6k | Prompt / KV-Cache Compression | Microsoft Research、EMNLP/ACL，研究权威很强，但应用侧需要自己集成 |
| [OpenCode DCP](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning) | ≈4k | 长会话 Tool Result / History Pruning | OpenCode 实战价值高，但仓库已说明新开发重心转向 Sleev |

`Sleev` 可以作为 DCP 后继的产品化候选继续观察，但目前不放进“高 Star 开源项目榜”：它能安装、能用，不等于已经满足“公开 GitHub 主仓 + Star + 开源许可证”这套筛选标准。

## 第一类：程序化、CLI 和脚本化——确定的事情不要每次重新推理

这是最容易被低估的一类。很多所谓“Agent 优化”，本质上应该先变成一个普通程序问题。

如果一件事同时满足下面几个条件，就应该优先考虑脚本化或 CLI 化：

- 输入边界明确；
- 处理逻辑确定；
- 高频重复发生；
- 输出可以校验；
- 失败可以用退出码或明确错误表示；
- 不需要开放式理解和推理。

### 哪些事情最适合直接脚本化

研发里非常常见：

```text
JSON / Schema 校验        → validator
类型检查 / Lint / Test    → compiler / test runner
Git 状态 / diff / hash    → git
日志筛选                  → rg / grep / awk / jq / script
结构化数据转换            → jq / Python / Node / SQL
文件统计                  → find / wc / hash / mtime
代码 definition/reference → LSP
caller / callee / impact  → CodeGraph
仓库批量打包和过滤        → Repomix
测试 / Git / 搜索输出收缩 → RTK
```

这些事情如果先把原始材料发给模型，再让模型“理解一下并给出答案”，等于把确定性问题重新变成概率问题。

### CLI 的价值不只是“少 Token”

把稳定能力做成 CLI，真正得到的是一个 Agent 可以反复调用的工程接口：

```text
明确输入
↓
CLI / Script
↓
确定性处理
↓
stdout / JSON / file artifact
+ exit code
↓
Agent 只消费结果
```

这种接口有几个很实际的优势：

- **可复用**：同一个命令可以给 Codex、Claude Code、OpenCode、ProFlow、CI 使用；
- **可组合**：命令之间可以 pipe、批处理、串成脚本，而不是每一步都回到 LLM；
- **可测试**：给定输入应产生什么输出，可以直接写单测和 fixture；
- **可观测**：耗时、退出码、输出大小、失败原因都能记录；
- **可缓存**：输入和版本稳定时，可以直接复用结果；
- **可批量**：一次处理 N 个文件、N 条记录，而不是 N 次模型轮询；
- **输出可控**：可以只返回失败项、统计、ID、路径和必要字段；
- **失败边界清楚**：`exit 0/1`、stderr、错误码比一段自然语言更容易进入自动流程；
- **跨模型稳定**：模型换了，确定性能力不需要重新靠 Prompt 教一遍。

这也是为什么 CLI 是一种很适合 Agent 的“能力资产化”形式。今天 Agent 用 shell 调，明天也可以由 MCP、Workflow 或后台服务包装；核心能力不用重写。

### 不要只把 CLI 当成一堆 shell 命令

真正值得沉淀的 CLI 应该有稳定合同：

```text
command --input ... --format json

stdout：机器可消费结果
stderr：诊断信息
exit code：成功 / 失败 / 部分成功
```

例如“检查发布条件”如果每次都让 Agent 重新读 `package.json`、Git 状态、测试结果、版本号再自己判断，很容易浪费几轮。更合理的是把判断固化成：

```text
release-check
→ 检查 Git dirty
→ 检查 version
→ 跑必要 gate
→ 输出 {"ok":false,"failed":[...]}
→ Agent 再决定怎么处理失败项
```

Agent 应该负责**不确定的决策**，而不是负责每次重写一遍确定性执行逻辑。

### CLI、规则、小模型、大模型怎么分层

一个实用顺序是：

```text
能确定计算      → 程序 / CLI
能通过索引查询  → Index / LSP / Code Graph
能用规则稳定判断→ Rule
需要语义但边界窄→ 小模型
需要跨域理解推理→ 强模型
高风险最终动作  → 强验证 + 受控流程 / 人
```

如果为了“智能路由”又先调用一个大模型判断该不该调用大模型，经常只是多烧了一层 Token。能根据 endpoint、任务标签、风险等级、输入规模决定的路由，先写规则。

### 脚本化也有边界

不是所有步骤都值得写脚本。只执行一次、规则还没稳定、需求每天变化的流程，过早脚本化会把模型成本换成维护成本。

最适合资产化的步骤通常同时满足：**高频、稳定、可验证、错误影响可控。** 当脚本开始堆几十层特殊分支，或者需要不断理解新的业务语义，就应该重新判断是不是已经超出了确定性工具的边界。

## 第二类：结构索引与按需取数——先决定什么值得进入 Context

最便宜的 Token，是一开始就没有进入请求的 Token。

代码场景尤其典型。为了知道 `submitOrder` 调了谁，不需要先把几十个文件交给 LLM。可以先让程序把仓库结构算出来，再只把模型当前需要的关系返回。

这条路线有几个不同层次：

```text
整文件读取
↓
压缩代码骨架
↓
Repo Map
↓
Symbol / Reference 查询
↓
Call / Dependency / Impact Graph
```

每往下一层，更多“找关系”的工作从 LLM 移到了确定性工具。

### Repomix：先把“仓库全文”变成“可控骨架”

[Repomix](https://github.com/yamadashy/repomix) 可以按 include / ignore 控制范围，`--compress` 用 Tree-sitter 保留 class、function、interface 等结构而折叠实现，还能用 `--token-count-tree` 看 Token 主要花在哪些目录和文件。

它适合第一次建立一块代码的整体心智模型，但不能把“压缩后就全量读取”当成终点。仓库很大时，正确用法仍然是控制范围、按需读。

### Aider Repo Map：值得拆原理，但不是优先安装项

[Aider](https://github.com/Aider-AI/aider) 的 Repo Map 会抽取仓库里的定义和引用关系，再给重要 symbol 排序，在固定 Token Budget 里生成一张代码地图。

它解决的是一个很具体的问题：**仓库结构本身也放不下时，哪些函数、类和签名最值得先给模型看？**

### Serena：别读整个文件，直接问 symbol

[Serena](https://github.com/oraios/serena) 把 LSP / IDE 语义能力变成 Agent 工具：`find_symbol`、`find_referencing_symbols`、`get_symbols_overview`。模型想知道谁引用某个函数时，不必先 grep 再读一堆文件。

### CodeGraph：`.codegraph` 把“探索仓库”变成“查询已经算好的关系”

这里必须单独讲我们实际在用的 [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph)，而不是把所有同名 CodeGraph 项目混在一起。

第一次进入仓库时执行 `codegraph init`，它会建立本地 `.codegraph/`，把 symbol、引用、调用边和依赖写入 SQLite 图索引；之后文件变化由 watcher 增量同步。Agent 真正工作时，不再从 `find → grep → Read → 再 grep → 自己推 caller` 开始，而是直接问 `codegraph_explore`：

```text
源码
↓ 一次预计算
.codegraph/codegraph.db
↓ 持续增量同步
codegraph_explore("submitOrder inventory")
↓
相关 symbol 原文 + call path + blast radius
↓
LLM
```

这条路线省的不是“把同一份代码压短一点”，而是**把重复的代码发现和关系推导移出 LLM**。索引还能跨会话继续使用，下一个 Chat 不需要重新花 Token 扫一遍仓库。

当前 CodeGraph 还有一个很值得学的设计：MCP 默认只暴露一个主工具 `codegraph_explore`，更窄的 `node/search/callers/callees/impact` 仍可用但默认不全塞进 Tool List。这样既减少工具选择错误，也减少 Tool Schema 常驻 Context。

但它不是“任何任务都一定省”。CodeGraph 自己的 benchmark 显示大仓库、跨文件关系问题收益很高；GitHub 也有真实 issue 报告在中型 Go 仓库里，连续调用 `codegraph_explore` 反而比精准 Grep/Read 吃更多 Context。正确用法是：**结构问题优先图查询，已经知道具体文件和几行位置时直接 Read；不要为了用图而用图。**

### GitNexus：另一种本地代码知识图实现

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) 也会用 Tree-sitter、import/call resolution、聚类和搜索构建本地代码图，再提供 `context`、`impact`、`trace` 等查询。原理同样是“关系先算好，模型按需问”，但它当前使用 PolyForm Noncommercial 许可证，商业场景不能把“代码公开”直接理解成“可以随便商用”。

这几种工具解决不同粒度：Repomix 适合批量建立内容面，Aider 做预算内地图，Serena 精确到 symbol，CodeGraph / GitNexus 负责跨文件结构关系。它们不是谁替代谁。

## 第三类：Tool 边界治理——Schema 少展开，结果先过滤，中间过程少进 History

Agent 不是只有 Prompt 会占 Context。Tool Definition、Shell 输出、测试日志和工具间往返，同样会不断制造 Token。这里要治理的是模型和工具之间的边界。

### RTK：先把 Shell 和测试输出压掉

[RTK](https://github.com/rtk-ai/rtk) 是这一层里非常接地气的实现。它不碰模型推理，而是拦截 `git`、`test`、`grep`、`tree`、`docker` 等开发命令，把原始 stdout 先做确定性收缩：通过测试折叠成数量、失败测试保留错误，`git diff` 去掉冗余头，搜索结果按文件聚合。

```text
npm test / git diff / rg
↓
原始几百到几千行输出
↓
RTK filter
↓
失败项 / 关键字段 / 紧凑结构
↓
Agent Context
```

它的价值在于**不需要模型先读一遍垃圾再总结**。但边界也很清楚：RTK 主要拦 Shell 工具；Claude Code 自带的 `Read / Grep / Glob` 不经过 Bash Hook 时，不会自动被它压缩。

### Tool Search 与 Programmatic Tool Calling

MCP 多以后，Tool Definition 本身就可能占掉大量基础 Context。解决办法不是把每个 description 再少写两句，而是改变工具发现协议。
Anthropic 的 Tool Search 就是原生实现：先只给模型搜索工具，需要时再加载具体 Tool Definition。Atlassian 的 [mcp-compressor](https://github.com/atlassian-labs/mcp-compressor) 则把这个思路做成 MCP Proxy：模型先看到 `list_tools / get_tool_schema / invoke_tool` 这类小表面，选中以后才展开完整 Schema。

```text
传统 MCP
100 个 Tool Schema → 每轮 Context

按需 MCP
工具索引 → 选中工具 → 加载 1 个 Schema → 调用
```

Tool 很少时没必要引入这层；Tool 一多，继续手工缩 description 很快会碰到极限。

还有另一种减法：**Programmatic Tool Calling**。如果模型要连续做十次工具调用，传统 Agent 会让十份中间结果都进入 Conversation History；能把这段流程变成程序执行时，中间数据可以留在程序内存里，只把最终结果返回模型。它减少的是 Tool Roundtrip 和后续 History，而不只是 Schema。

CodeGraph 默认只向 MCP 暴露一个主 `codegraph_explore`，也属于同一个设计原则：工具能力很多，不等于模型每轮必须看到几十份完整工具说明。

## 第四类：Context、Prompt 与表示压缩——已经要进模型的信息再压

前面三类做完以后，仍然可能存在必须给模型看的长内容。到这一步才值得讨论真正的压缩。

### Headroom：跨内容类型的请求侧压缩

[Headroom](https://github.com/headroomlabs-ai/headroom) 是这条路线里更通用的工程实现。它可以作为本地 Proxy、SDK、MCP 或 Agent Wrapper，先识别内容类型，再分别处理 JSON、代码、日志、搜索结果和普通文本。

链路更像：

```text
Agent 原始 messages
↓
本地 Compression Proxy
↓
识别 JSON / Code / Log / Search / Text
↓
对应压缩器
↓
更小的 messages
↓
模型 API
```

这和“让模型自己总结一下再继续”最大的区别是：**压缩发生在模型调用之前，而且很多工作是确定性程序完成的。**

Headroom 还提供可恢复机制：压缩掉的原始内容保存在本地，需要精确内容时再按引用取回。这样压缩不必等于永久丢失。

### LLMLingua：语义 Prompt Compression

[LLMLingua](https://github.com/microsoft/LLMLingua) 走得更深：已经有一段很长的 Prompt 以后，用较小模型判断哪些句子、片段甚至 Token 更重要，再删除低价值部分，把压缩后的 Prompt 交给目标大模型。

它代表的是 Semantic Prompt Compression：

```text
长 Prompt
↓
重要性判断
↓
保留任务相关、高信息 Token
↓
压缩 Prompt
↓
目标模型
```

这类方法适合“材料必须整体经过一遍，但可以有损压缩”的场景。它比纯规则压缩更灵活，但也有额外模型成本和信息丢失风险，所以不应该排在 Context Selection 前面。

能通过索引直接不取的内容，没必要先取回来再让另一个模型帮你删。

### TOON、Caveman：信息不一定删，也可以换表示

结构化数据里，JSON 的字段名、引号、花括号会反复出现。[TOON](https://github.com/toon-format/toon) 的思路不是删除信息，而是把同一个 JSON Data Model 编成更紧凑的文本格式，尤其适合字段一致的对象数组。

例如程序内部继续使用 JSON，对 LLM 输入时再转换：

```text
业务对象 / JSON
↓
TOON 编码
↓
更紧凑的结构文本
↓
LLM
```

这属于 Representation Compression：信息基本没少，只是表示方式更适合 Tokenizer。它非常适合 Tool Result、表格数据、批量记录，但深层、不规则对象未必比 JSON 划算，仍要实测。

### Caveman：连“文本”这个表示都可以换

[Caveman](https://github.com/JuliusBrussee/caveman) 很适合拿来理解 Token 工程的边界。它当前既做结构化压缩、TOON 转换，也提供 Pixel Mode：对特别密集的长文本，先把原始内容保存到本地可恢复存储，再把文字排版成 PNG 页面，让支持视觉输入的模型读图片。

```text
密集文本 / 长日志 / Tool Catalog
↓
先保存 byte-exact 原文
↓
估算 text token 与 image token
↓
只有图片更划算才转 PNG
↓
Vision Model
↓
需要原文时按 handle retrieve
```

这里不是“AI 直接理解二进制”。真正发生的是**把文本 Token 成本换成图像输入成本**。它还会拒绝不划算的情况，例如稀疏代码转图片反而更贵，就原样通过。

Caveman 的 Skill Compressor 更直观：Skill 的 frontmatter 继续保留文本，正文可以渲染成图片页面。Agent 仍能发现 Skill，真正需要正文时再看图片。

它给了一个很有用的工程启发：**压缩不是只有删字，还可以改变表示通道，但必须有成本比较和恢复路径。**

## 第五类：History、State 与 Memory——管理信息的生命周期

长任务真正危险的不是第一轮输入大，而是一次性内容变成永久历史。这里的目标不是“记住更多”，而是让信息知道什么时候进入、什么时候退出、什么时候外置。

### 用完就退出：Pruning 与 Compaction

长 Agent 最常见的问题不是第一次请求太大，而是过去每一次工具调用都留在后面。

[OpenCode DCP](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning) 专门处理这个问题：识别旧 Tool Result、重复结果和已经完成使命的上下文，让它们从后续请求退出。DCP 项目目前也说明，更新的跨 Harness 工作已经继续向 Sleev 迁移。

主流平台也开始原生做同类事情：

- Claude Context Editing 可以按阈值清除旧 Tool Result；
- Claude Compaction 可以把长历史收敛成 compaction block，再从压缩状态继续；
- OpenAI Responses / Agents SDK 支持 server-side compaction，也可以用 `OpenAIResponsesCompactionSession` 把长 Session 改写成更短的历史。

关键不是“模型记不住了就总结”，而是把 Context 当成有生命周期的运行时资源。更稳的分层是：

```text
当前正在做什么 → Working Context
已经确认、后面还要继承 → State / Compaction
长期可复用事实 → Memory
原始日志、代码、文件 → External Store
需要追溯 → Reference / Retrieve
已经过期 → Prune
```

这里还有一个真实 trade-off：删除旧内容可能破坏 Prompt Cache 前缀。Anthropic 的 Context Editing 文档也明确提醒，清理要一次清够，否则省下的 Context 可能抵不过缓存失效成本。

### 长期信息外置：State、Memory 与 Reference

有些信息不能删，但也不应该每轮原样重放。任务状态、用户偏好、历史决策、原始证据应该进入不同的外部存储，只把当前需要的部分取回来。

[Mem0](https://github.com/mem0ai/mem0) 是这条路线里社区规模很大的代表。它不是把一段 Prompt 做文字压缩，而是把长期信息写入 Memory Layer，再按当前请求检索相关 Memory。对 Agent 来说，差别是：

```text
错误做法：过去 50 轮对话 → 每轮全部重放

外置后：
过去事实 → Memory / State / Artifact
当前任务 → retrieve top relevant facts
原始材料 → Reference，真需要再回读
```

Headroom 的 CCR 也是 Reference 思路：压缩表示进入 Context，byte-exact 原文留在外部存储，需要时再 retrieve。`.codegraph` 也是同类工程思想在代码领域的特殊形态：关系和源码索引长期保存在本地，不需要每个会话重新推一遍。

这里最重要的边界是：**Memory 不是越多越好，Retrieve 也不是把库里东西全召回来。** 如果最终还是 Top-200 全塞 Context，只是把 History 换了个数据库名字，Token 问题并没有解决。

## 第六类：Cache 与复用——已经算过的事情不要再算

如果相同结果会反复请求，最省 Token 的方法不是压缩，而是这次根本不调用模型。

[GPTCache](https://github.com/zilliztech/GPTCache) 代表 Semantic Cache 路线：把请求转成 Embedding，用向量相似度找历史请求；相似度达到门槛时直接返回已有结果。

```text
新请求
↓
Embedding
↓
相似请求检索
├─ 命中 → 直接复用结果
└─ 未命中 → 调 LLM → 写入 Cache
```

它适合答案相对稳定、允许语义复用的场景。涉及实时库存、权限状态、价格、强个性化内容时，错误复用的代价可能比省下来的 Token 更高，所以 Cache Key、失效和相似度阈值比“接一个向量库”重要得多。

## 第七类：输出预算与模型分工——少生成，任务收窄后再换小模型

### Structured Output 与 Output Budget

输出 Token 本身要付费，而且下一轮通常又会变成输入。内部节点如果只需要 `pass/fail`、文件列表、Patch 或几个字段，就不要让模型写一篇解释。

```text
内部验证节点
不要：800 字“分析过程”
而要：{"ok": false, "failed": ["test-a"], "evidence": "log:42"}
```

Structured Output 的价值不只是格式稳定，它让下游明确知道“到这里就够了”；Caveman 的 terse / output compression 也在解决同一类问题。真正面向人的最终报告再展开，内部链路尽量短。

### 小模型不是“便宜版大模型”，而是任务已经被收窄

小模型真正适合的不是所有简单问题，而是输入、输出和错误边界已经被工程系统收住的任务。

例如：

```text
输入字段固定
+ 候选类别有限
+ 输出有 Schema
+ 错误可以自动验证
+ 调用频率很高
```

这时分类、抽取、路由、轻量改写可以尝试交给小模型。反过来，陌生系统故障、跨模块重构、开放式架构设计依赖大量上下文和推理，强行下沉只会增加重试。

所以顺序是 Task-first，再 Small-first：先把任务缩窄，再决定模型能不能缩小。

### 路由也不要为了“智能”再烧一层模型

如果请求类型能根据 endpoint、任务标签、输入规模、风险等级、是否需要工具等特征判断，就先写规则。

```text
Schema 校验 → 程序
固定字段抽取 → 规则 / 小模型
普通分类 → 小模型
复杂代码分析 → 强模型
高风险最终动作 → 强验证 + 人 / 受控流程
```

只有边界真的模糊，才值得让模型做 Router。否则“为了省大模型，先调用一次大模型判断要不要用大模型”本身就很荒唐。

### 不要把模型成本偷偷转成人工成本

小模型如果经常答错，工程师每次都要检查；规则如果写成几十层特殊分支，维护成本也会不断增长。所谓“下沉”必须有自动验证、失败升级和清晰边界。

最值得程序化或小模型化的步骤通常同时满足：高频、输入输出稳定、正确性容易验证、错误影响可控。

最终目的不是“尽量不用大模型”，而是让大模型只处理那些**确实需要大模型能力**的部分。这样省下的不只是 Token，还有工具轮次、等待和不确定性。

## 真正落地时，先按类别定位问题

| 看到的问题 | 先看哪一类 | 代表手段 / 工具 |
|---|---|---|
| 校验、过滤、转换、统计反复让模型做 | 程序化 / CLI / 脚本化 | grep、jq、SQL、Test Runner、Schema Validator、自有 CLI |
| 仓库大、关系反复重新探索 | 结构索引与按需取数 | CodeGraph、Serena、GitNexus、Aider Repo Map、Repomix |
| Shell/Test/Git 输出太肥 | Tool 边界治理 | RTK、确定性输出过滤 |
| MCP 工具太多、Schema 常驻 | Tool 边界治理 | Tool Search、Lazy Schema、mcp-compressor |
| Tool Result / JSON / Log 必须进入模型但太长 | Context 压缩 | Headroom |
| 长 Prompt 已经形成 | Prompt 压缩 | LLMLingua |
| JSON / 表格表示冗余 | 表示压缩 | TOON |
| 密集文本换视觉输入更划算 | 表示通道转换 | Caveman Pixel Mode |
| History 越跑越肥 | History 生命周期 | Context Editing、Pruning、Compaction、DCP |
| 长期事实不能丢但不该常驻 | State / Memory / Reference | Mem0、Artifact / ID、Headroom CCR |
| 相似结果反复计算 | Cache 与复用 | Exact Cache、GPTCache |
| 内部节点总写长篇解释 | 输出预算 | Structured Output、Schema Contract |
| 任务已经很窄而调用频率高 | 模型分工 | Rule → 小模型 → 强模型 |

如果能用程序确定地算，就不要先让模型总结；如果能通过索引根本不取，就不要先取回来再压；如果内容以后可能精确追溯，就保留 Reference / Artifact，而不是直接丢掉。

## 工具装上以后，怎么证明它真的有效

不能看项目 README 里的高压缩率宣传就算验收。拿自己的真实任务做同一组 A/B，至少记录：

```text
同一个任务
├─ baseline：不开优化工具
└─ candidate：只开一个优化工具

比较：
输入 Token / 输出 Token
模型调用次数
Tool 调用次数
端到端耗时
最终测试是否通过
人工补上下文 / 返工次数
```

如果 Token 少了，但 Agent 反而多跑几轮才完成，不能算有效；如果代码 Context 明显缩小，同时测试通过率不降、调用轮次也没涨，这才是能留下来的工具。

因此实际接入建议一次只引入一层：**跨文件结构探索多，先测我们已经在用的 CodeGraph；Shell / Test 输出肥就测 RTK；批量建立仓库内容面再用 Repomix，symbol 精确读取用 Serena；请求和 Tool Result 仍然很重，再测 Headroom；输出和 Skill 本身太啰嗦，再测 Caveman；长会话则优先看宿主原生 Compaction / Context Editing，长期事实再考虑 Memory 外置。** 不要同时打开三种压缩器，然后看到总 Token 下降却不知道是谁起作用、谁在损伤质量。

## 一个真实任务里，这些类别怎么配合

回到开头的订单 Bug：

```text
CLI / Script 先检查 Git、环境、已知日志条件
→ CodeGraph 从 `.codegraph` 查订单到库存的调用链
→ Serena / 精确 Read 补当前 symbol 实现
→ RTK 把测试 / Git / Shell 输出收成失败项和关键字段
→ 必须进入模型的大 JSON 再由 Headroom / TOON 收缩
→ 当前结论写入 State
→ 旧 Tool Result 从 History 退出
→ 下一轮只带当前失败证据继续
→ 最终内部结果用结构化输出
```

这里没有一个“万能 Token 插件”。真正的收益来自把**确定性执行、信息选择、工具边界、压缩、状态生命周期和模型能力**分别放回适合它们的层。

## 最后记住这条顺序

```text
能脚本化就先脚本化
→ 能索引查询就不要探索
→ 只取当前必要内容
→ Tool 结果在边界先过滤
→ 仍然过长的 Context / Prompt 再压或换表示
→ 用完的 History 退出，要继承的收敛成 State
→ 长期事实外置，按需 Retrieve
→ 重复结果直接 Cache
→ 内部输出守预算
→ 任务被工程系统收窄以后，再考虑小模型
```

Prompt Compression 只是中间一层。成熟 Agent 真正做的是：**把能由程序完成的工作移出模型，把不需要的信息挡在 Context 外，把需要的信息控制生命周期，最后只让模型处理真正需要理解和推理的部分。**

另外仍要分清四类“更省但不一定减少 Token”的东西：**Prompt Cache** 主要省重复前缀费用和 Prefill；**小模型 / Model Routing / 本地模型**主要改变单价或成本归属；**Batch / 并行**主要改变吞吐和延迟；**gzip / zstd** 只压网络字节。它们都可能有价值，但不能冒充 Context Token 真的变少。

继续深挖平台实现可以看：

- [Claude：Manage tool context](https://platform.claude.com/docs/en/agents-and-tools/tool-use/manage-tool-context) —— Tool Search、Programmatic Tool Calling、Prompt Cache、Context Editing；
- [Claude：Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction) —— 长历史如何收敛后继续执行；
- [OpenAI Agents SDK：Sessions / Compaction](https://openai.github.io/openai-agents-js/guides/sessions/) —— Responses Compaction 如何替换长 Session 历史。
