# 我怎样把 ChatGPT 变成高吞吐、可自迭代的本机 Agent 工程系统

这篇文章记录的不是一套“MCP 工具配置”，而是我过去接近两个月里不断追一个问题形成的工程路径：**怎样让高能力 Chat 少把 Token 花在搬运信息、重复操作和机械判断上，把更多注意力留给真正需要推理的事情。**

最开始，我和 ChatGPT 的协作和大多数人一样：在网页里聊需求，让它给代码，我把代码复制到本机，执行以后再把错误、文件和结果贴回去。后来变成上传压缩包、下载修改后的文件；再后来让 Chat 一次生成完整文件、替换脚本和压缩包，我只在本机执行；直到发现 ChatGPT Web 可以通过 MCP（Model Context Protocol，模型上下文协议：让 Agent 用标准接口发现并调用外部工具、数据和能力）进入真实本机，人的“搬运”职责才第一次大幅退出。

但“能操作电脑”很快又暴露出新的效率问题：一个万能文件工具并不擅长代码结构分析，大仓库反复 `read / grep` 会浪费上下文，浏览器里的真实用户结果又不是源码能证明的；工具一多，Chat 还会选错工具、重复读取、边改边测、傻等长任务、超时后盲目重试。于是系统继续演进：Local Dev、CodeGraph、Repomix、Playwright 各自成为不同事实的 Fact Owner（事实归属方：某类事实最应该从哪里读取）；再用 Skill 约束 Chat 的工作方式；再把稳定机械步骤下沉到 Automation 和确定性 Runner；最终准备把已经验证稳定的规则进一步下沉到自研 MCP，让模型的自由度更小、有效判断密度更高。

所以这篇文章同时有三个用途。

第一，它是一份工程能力说明。读者可以看到一套 Agent 工作环境不是“装几个插件”得到的，而是如何从真实失败、真实性能瓶颈和真实协作成本中逐步长出来。

第二，它是一份效率指南。别人不需要复制我的机器和目录，也可以沿着同样的问题链判断自己现在卡在哪一层：是不是还在人工搬运？是不是把所有事情交给一个万能工具？是不是已经有很多 Tool，但 Chat 仍然浪费调用？是不是规则已经稳定到应该下沉成自动化？

第三，它是 Monitor Chat 自迭代的基础设施说明。一个 Chat 如果不能稳定看到真实系统、理解结构、修改工程、操作浏览器、验证结果并把结果继续变成下一轮输入，“自迭代”就只能停留在模型给建议、人来执行。真正的闭环需要手、眼、事实边界、执行纪律和连续运行机制同时存在。

整条演进可以先压缩成一张图：

```text
只和 Chat 聊天
    ↓
人工复制代码 / 日志 / 文件
    ↓
上传、下载压缩包
    ↓
Chat 生成整包文件 + 本机替换脚本
    ↓
发现 ChatGPT Web 可以通过 MCP 进入本机
    ↓
Local Dev：让 Chat 真正读写文件、跑命令、看 Git 和进程
    ↓
CodeGraph / Repomix / Playwright：不同事实交给不同工具
    ↓
Skill：约束 Chat 怎样正确使用这些能力
    ↓
Automation / Runner：把稳定机械步骤从模型判断里拿走
    ↓
Monitor Loop：观察 → 决策 → 执行 → 验证 → 下一轮
    ↓
未来自研 MCP：把已经证明稳定的约束继续下沉成硬合同
```

贯穿这条路径的判断只有一句：

> **确定性的东西交给系统，不确定性的东西才交给模型；把 Token 花在思考上，而不是花在操作电脑上。**

## 最开始真正浪费的不是 Token 数字，而是“人充当数据总线”

最初的协作模式非常直接：

```text
ChatGPT 生成建议 / 代码
        ↓
人复制
        ↓
粘贴到本机
        ↓
执行
        ↓
把结果、报错、文件内容再复制回 Chat
```

这个阶段看起来只是麻烦，实际上存在更深的工程问题：**Chat 没有现实世界的 Fact Owner。**

它不知道当前磁盘上的文件到底是什么；不知道上一轮修改是否真的写成功；不知道 Git 当前是否 dirty；不知道某个进程仍在运行还是早已退出；不知道测试到底执行过没有。为了继续推理，它只能依赖人把现实重新翻译成自然语言。

于是大量 Token 实际消耗在“重建现实”上：

- 反复贴源码；
- 解释目录结构；
- 描述哪几个文件刚刚改过；
- 把终端日志复制到聊天里；
- 说明命令到底有没有执行成功；
- 重新讲一遍当前 Git 状态；
- 在上下文变长以后重新强调早期约束。

这类 Token 并没有增加多少新的工程判断。它们只是承担 transport（传输）职责。

更麻烦的是，人不仅是传输层，还是 Runtime（运行时）：Chat 说“执行这条命令”，真正决定什么时候执行、在哪里执行、结果有没有返回、失败以后怎么办的，都是人。

因此最初效率瓶颈可以写成：

```text
模型有推理能力
但没有本机现实
        ↓
人负责搬运现实
        ↓
大量上下文被用来描述本该直接读取的事实
        ↓
每一轮都重新建立“现在到底是什么状态”
```

这也是后面所有工具演进的起点。

## 第一次提效：压缩包把碎片传输变成了批量文件传输

下一步没有立刻进入 MCP，而是一个很朴素的改进：上传压缩包。

以前需要把多个文件逐段复制到 Chat；有压缩包以后，可以一次给完整目录或局部源码，让模型在更完整的上下文里处理，再下载修改结果。

协作方式变成：

```text
本机项目 / 文件
    ↓ zip
ChatGPT
    ↓ 修改后的文件 / zip
本机解压、覆盖、执行
```

这一步的效率提升主要来自两个方面。

一是**减少碎片化传输**。目录关系、文件名和一组相关源码可以一起进入上下文，不需要人逐文件解释。

二是**降低手工复制错误**。长代码块、缩进、遗漏文件、复制错版本的问题都减少了。

但人的角色仍然非常重：上传、下载、解压、替换、执行、收集结果都还要人工完成。Chat 仍然无法直接确认“下载后的文件是否真的替换到正确位置”。

所以压缩包解决了“文本传输效率”，没有解决“执行闭环”。

## 第二次提效：从“给我代码”变成“给我一个可以一次执行的变更包”

继续做复杂重构以后，一个新的问题出现了：即使文件可以批量上传，Chat 如果一次只给一小段修改，人仍然要不停做机械动作。

于是协作继续向 Whole-file Bundle（整文件变更包：一次包含完整 CREATE / REPLACE / DELETE 结果的变更单位）演进。

典型过程变成：

```text
Chat 完成一个完整 Engineering Decision
        ↓
生成完整的新版本文件
        ↓
生成 zip / bundle
        ↓
生成确定性的本机替换脚本
        ↓
人只执行一次
        ↓
再把最终结果交回 Chat
```

这一步第一次形成后来非常重要的责任分工：

> **模型负责决定“最终应该变成什么”，本机只负责机械地把这个结果落盘。**

它和逐 hunk、逐文件边改边看的模式完全不同。

如果一个工程决策涉及 13 个文件，理想状态不是：

```text
改文件 A
→ 看一下
→ 改文件 B
→ 跑一下
→ 再回头改 A
→ 改文件 C
```

而是：

```text
先把 13 个文件的最终状态想完整
→ Freeze
→ 一次 apply
→ 一次 verify
```

这会同时减少：

- 模型重新进入上下文的次数；
- Tool / 人工操作次数；
- 中间态被误认为最终态的风险；
- 因为局部修改而反复跑测试的时间；
- “上一轮到底改到哪里”的记忆成本。

后来 `chat-local-engineering-protocol` 里的 `ACQUIRE → FROZEN → BUNDLE_READY → APPLIED → VERIFY → DONE`，本质上就是这段人工 Bundle 实践被进一步制度化和自动化后的结果。

这个阶段还留下一个很小但很典型的教训。早期有一次把包含 `set -u` 的安装命令直接粘进 VS Code 的交互式 zsh，导致 prompt hook 访问未定义的 `RPROMPT`，出现 `RPROMPT: parameter not set`。问题不在 MCP，而在“本该封装在独立脚本里的严格 Shell 行为污染了人的交互环境”。后来这类机械逻辑越来越倾向进入脚本，而不是让人复制一大段命令到当前 Terminal。

这也是效率演进的一个缩影：**每发现一种重复而确定的人工操作，就尝试把它变成机器可重复执行的边界。**

## MCP 带来的质变：Chat 不再需要人把本机事实翻译成文字

真正的分界点，是发现 ChatGPT Web 可以连接 MCP 能力。

MCP 解决的不是“让模型更聪明”，而是给 Host（宿主：承载模型和工具调用循环的应用，例如 ChatGPT）一个标准能力面：它可以发现工具、读取参数 Schema、发起 `tools/call`，再把真实结果交回模型继续推理。

这里需要先把 Function / Tool Calling 和 MCP 分开。

```text
用户自然语言
    ↓
LLM / Agent Host
    ↓ 决定调用什么、生成参数
Tool Call
    ↓
MCP Client
    ↓
tools/call
    ↓
MCP Server
    ↓
真实文件 / Shell / Browser / API
    ↓
Tool Result
    ↓
LLM / Agent Host 继续判断
```

Function / Tool Calling 负责模型侧“要不要调用、调用什么、参数是什么”；MCP 负责能力怎样被标准化发现、传输和执行。

这一区分不是概念游戏。后来通读 Desktop Commander MCP 源码时可以直接看到：仓库里有 Tool Schema、`tools/list`、`tools/call`、参数校验和真实执行，但没有“用户说一句自然语言以后模型为什么选择 read_file”这段推理逻辑。那属于 Host / Model。

### 为什么网页 Chat 不能直接连 localhost

ChatGPT 是远端产品，本机 MCP Server 运行在开发机上。网页端不能简单把 `localhost` 当成一个远程 MCP 地址。

当前官方路径是 Secure MCP Tunnel（安全 MCP 隧道：由本机 `tunnel-client` 主动向 OpenAI 建立出站连接，把私有网络或开发机上的 MCP 能力安全暴露给受支持的 OpenAI 产品）。

概念链路是：

```text
ChatGPT
    ↓
OpenAI Secure MCP Tunnel
    ↓ outbound connection
本机 tunnel-client
    ↓ stdio / loopback
本机 MCP Server
    ↓
文件 / 进程 / 代码图 / 浏览器
```

本机不需要为了 ChatGPT 开一个公网 listener。这一点非常适合个人开发环境：Web Chat 继续负责高价值推理，本机保留真实执行环境和权限边界。

MCP 接通以后，很多过去必须靠自然语言搬运的动作第一次变成直接读事实：

```text
“把 package.json 发给我”
→ read_file

“你运行一下测试，把结果贴过来”
→ start_process / process result

“现在 git 到底是什么状态”
→ real git authority

“这个页面现在到底长什么样”
→ Browser eyes
```

Token 消耗结构因此改变了：更多 Token 可以用于理解“为什么”，而不是重复描述“现在是什么”。

## 我没有直接造工具，先调研现有 MCP 生态能不能满足需求

接入 MCP 以后，第一反应不是立即自研 Server，而是先寻找成熟工具。

这是一个后来反复保留的原则：**能复用成熟能力，就不要为了“拥有自己的系统”提前增加维护面。**

当时真正需要的第一类能力很简单：

```text
读写本机文件
执行 shell
管理长进程
查看 Git
搜索源码
处理结构化文件
```

Desktop Commander 能较完整覆盖这些能力，因此成为 Local Dev 的底层实现。

与此同时也调研过大量 MCP 工具和开发辅助产品。这里必须特别说明 `OpenMCP` 这个名字，因为现在公开生态里至少有几类完全不同的项目使用它：

| 名称 | 实际角色 | 和当前系统的关系 |
|---|---|---|
| `LSTM-Kirigaya/openmcp-client` | VS Code / Cursor / TRAE 内的 MCP 开发、Inspector、交互测试、多模型调试工具 | 适合开发和调试 MCP，不是当前本机执行 Runtime |
| `getdatanaut/openmcp` | 把 OpenAPI 转成 MCP，并能把多个 MCP Server 重新组合成一个只暴露所需 Tool 的 Server | 很接近“能力聚合 / Tool allowlist”的思路，但当前未采用 |
| `AguLeon/OpenMCP` | 面向 Computer-Using Agent 的开源、自托管 benchmark / testbed | 属于 Agent 评测环境，不是 MCP 本机运行时管理器 |
| 其他同名 OpenMCP / openmcp.app | 应用连接、平台或其他实验方向 | 名字相同，必须按仓库和产品身份判断，不能混写 |

本机当前 workspace 中没有 `OpenMCP` 的安装、源码或配置真值，因此本文不会把它写成“已经部署”。它更适合放在未来自研 MCP 的比较参照里。

同样，MCP 官方 Inspector、MCPJam、Docker MCP Toolkit / Gateway、官方 MCP Registry 也都是当前值得关注的生态组件，但承担的是不同职责：

- **MCP Inspector**：官方参考级 MCP 测试/调试客户端，现在同时提供 Web、CLI 和 TUI；
- **MCPJam**：更进一步把真实模型、跨客户端行为、OAuth 调试、Evals 和 CI Gate 放到一起；
- **Docker MCP Toolkit**：Docker Desktop 4.62+ 中的 Beta 管理面，用于发现、配置和运行容器化 MCP Server；
- **Docker MCP Gateway**：在 Client 和多个 Server 之间承担集中生命周期、路由、认证和配置；Docker 当前还把部分治理能力标成受限可用；
- **MCP Registry**：官方公共 Server 元数据注册与发现层，当前仍处于 Preview，不能把它当成完全冻结的发布基础设施。

这些工具很有价值，但它们不是一个东西，也不能自动替代当前的本机工具链。后面会单独解释它们各自适合解决哪一层问题。

## Local Dev：第一只真正进入本机的“手”

Local Dev 当前底层使用 Desktop Commander。

它不是简单的 `exec(command) → output` 包装，而是一组本机能力面：filesystem、edit、search、process、terminal、config、文件类型处理等。

从源码看，一次调用大致会经历：

```text
Tool Schema
→ MCP tools/list 暴露 JSON Schema
→ Host 产生 tools/call
→ Server 再次 Schema.parse(arguments)
→ tool dispatcher
→ handler / domain implementation
→ OS / filesystem / process
→ Tool Result
```

这个结构给了我几个很重要的认识。

### Tool Schema 不只是“给模型看的说明书”

Desktop Commander 内部用 Zod 定义参数，再转换成 MCP 暴露的 JSON Schema；真正收到调用后，Handler 还会再次做运行时校验。

所以 Schema 同时承担三件事：

```text
发现
约束
运行时校验
```

这也是未来自研 MCP 为什么可以“限制得更死”的技术基础：如果一个高层操作只允许极少参数和明确状态机，就不应该把几十个自由度重新暴露给模型。

### 文件工具背后其实有按类型分支

`read_file` 并不是所有文件都按纯文本读。它会根据文件类型进入 text、image、Excel、DOCX、PDF、binary 等不同 Handler。

`edit_block` 也不是模糊找到相似文字就直接修改。精确匹配失败以后，fuzzy worker 只返回接近匹配和 diff 建议，不替调用方自动落盘。

PDF 还是一个很好的“工具表面简单、内部域逻辑复杂”的例子：对 Agent 来说它仍然表现成普通 `read_file` / `write_pdf` 能力，内部却有独立 PDF 解析和生成分支。好的 MCP surface 应该隐藏不必要的实现复杂度，而不是把底层每一步都变成模型需要选择的 Tool。

这个细节很有价值：**一个好 Tool 不只是“能做”，还要在不确定时拒绝偷偷猜。**

### Search 不是一次 grep，而是有生命周期的检索能力

源码里的 SearchManager 会管理文件名搜索和内容搜索的运行状态，支持 start、progress、pagination 和 stop，而不是强迫一次调用返回整个仓库所有结果。

这和长进程的 session 思路很像：大范围搜索可以逐步消费，模型不需要因为结果很多就在一次 response 里吞完全部上下文。

### 长过程被设计成 Session，而不是一条永远不返回的命令

Desktop Commander 原生提供：

```text
start_process
read_process_output
interact_with_process
```

因此 OS 进程可以长时间运行，而 MCP request 保持短生命周期。

Process / Terminal 分支还会维护 session / process 状态。命令限制也不是只检查整条字符串：源码会继续处理复杂 shell 命令和嵌套命令场景，目的同样是把安全边界放在 Tool 里，而不是完全相信自然语言约束。

这个能力后来直接救了整套链路。

### MCP Apps / UI 说明“工具结果”还可以继续长成交互界面

Desktop Commander 仓库里还包含 MCP Apps / UI 支线，例如 File Preview。它证明 MCP 并不只意味着“模型调用一个无界面的函数”。Tool 结果也可以配合 UI resource / widget 形成用户可见交互，某些 UI 还能再次发起工具调用。

但这里要保持边界：UI 里再次调用 Tool，不等于仓库自己实现了完整 LLM Agent Loop。谁决定下一步仍然属于 Host / Model。

这个分支当前不是 Local Dev 的核心使用方式，但它对未来设计高层 MCP 很有启发：**复杂结果不一定都要塞回纯文本 Token，必要时可以选择更合适的交互面。**

### Remote Device 说明同一仓库里也可以同时出现 MCP Server 和 MCP Client

Desktop Commander 的 Remote Device 支线不只是“多一个 Tool”。它内部会建立 MCP Client，通过 Remote Channel 连接远端能力，并处理 claim、恢复和远端连接状态。

这对我的一个重要启发是：MCP Server / Client 不是按“一个仓库只能扮演一个角色”来划分。一个产品可以对上游暴露 Server，同时在某个子能力里作为 Client 去消费另一端能力。

当前 Local Dev 并不依赖 Remote Device 才能工作，所以这部分属于源码能力地图，不应该误写成当前 GPT Web → 本机主链的一部分。

### 当前运行版和源码研究版不是同一个版本

这里必须把历史和现状分开。

2026-09-09 我完整通读过 Desktop Commander `main` tarball，对应源码内版本 `0.2.48`，但当时拿到的是 GitHub `main` tarball，没有 `.git`，精确 commit 保持 `UNKNOWN`，不能猜。

而截至 2026-09-17，本机正式 `Local Dev` runtime 的 canonical service 脚本仍然固定运行：

```text
@wonderwhy-er/desktop-commander@0.2.44
```

所以：

```text
0.2.48
= 学习 / 源码研究快照

0.2.44
= 当前本机 Local Dev 实际 runtime pin
```

这两个事实不能因为“版本越新越好看”就合并。

### 高权限是能力，不是默认安全建议

Desktop Commander 当前实现里，`allowedDirectories=[]` 可以意味着不限制目录。我的本机开发场景曾明确授予较高权限，但这不等于别人应该照抄。

MCP Tool 自身的路径 Guardrail 也不等于操作系统 Sandbox（沙箱：从系统层限制进程能影响哪些资源）。

如果别人复用这条路线，权限范围应该根据自己的风险边界重新收紧。

## 一次真实的 120 秒事故，把“长任务”从使用技巧变成了系统规则

这套链路早期最重要的一次事故发生在 ProFlow Real-1 的 npm Registry 发布。

当时通过 Local Dev 执行：

```text
pnpm release:publish
```

调用方式是：

```text
start_process(timeout_ms=120000)
```

也就是让单个 MCP Tool Call 在前台等两分钟。

关键时间线非常清楚：

```text
2026-08-18 22:58:21.847 (+08)
Desktop Commander start_process
 timeout_ms=120000

2026-08-18 23:00:21.341 (+08)
tunnel-client:
MCP connection TTL reached; stopping response forwarding

随后：
stdio MCP command stdin write failed
write |1: file already closed

随后：
command response deadline reached; dropping without posting a response
```

从 22:58:21.847 到 23:00:21.341，大约 **119.494 秒**，和 `120000ms` 高度重合。

当时最终证据支持：

```text
CodeGraph 导致失败                         NO
多个 MCP 混用导致失败                     NO EVIDENCE
Desktop Commander 随机崩溃                NO EVIDENCE
单个 foreground MCP call 撞到约 120s 边界 CONFIRMED
stdio pipe closed                          CONFIRMED
tunnel-client 随后退出                     CONFIRMED
```

这里最容易形成错误经验：

> “超过 120 秒的本机进程都会杀死 MCP。”

这不准确。

真正危险的是：**一个 MCP request 本身长期不返回。**

### 为什么不是把 TTL 调大就结束

当时也检查过 tunnel-client 的 `MCP_CONNECTION_MAX_TTL`。它描述的是连接级生命周期，而协议里还有单个 command 的 `response_timeout` / response deadline。

因此：

```text
connection max TTL
≠ single command response deadline
```

即使把连接 TTL 配得更大，也不能证明一条 Tool Call 就可以安全阻塞几十分钟。真正稳妥的修复不是“把所有 timeout 调大”，而是改变执行模型。

正确模型应该是：

```text
Chat
→ start_process(timeout 1~5s)
→ 立即得到 PID / session
→ 当前 MCP request 结束

真正的 OS process 在后台继续

后续只有真正需要结果时
→ read_process_output / terminal authority
```

所以应该“长”的是 OS 进程，不是 MCP JSON-RPC request。

### UNKNOWN 不是 FAILED，尤其不能拿 publish / deploy 做盲重试

这次事故还逼出了第二条更重要的规则：**有副作用的操作在 timeout 以后不能自动理解为失败。**

比如 publish、release、deploy、migration 已经可能在外部系统发生，只是响应没回来。

此时状态只能是：

```text
MCP request = interrupted
underlying side effect = UNKNOWN
```

接下来必须回到外部 Fact Owner 做 Reality Reconciliation（真实结果核对：回到 Registry、生产环境、数据库或其他权威状态确认副作用到底有没有发生），只有确认 `NOT_APPLIED` 才能重试。

今天工程 Skill 里的：

```text
UNKNOWN ≠ FAILED
no blind retry
ASYNC RETURN BARRIER
terminal authority first
```

都不是凭空写出来的规范，而是从这类真实事故提炼出来的。

### CodeGraph 为什么没有照搬“所有调用必须 5 秒结束”的硬限制

任何经过同一 transport 的 MCP request 理论上都需要尊重 command lifecycle，但不同 Tool 的工作负载不能机械套同一个策略。

当时 ProFlow 的 CodeGraph 实际索引规模是：

```text
380 files
4,776 nodes
15,617 edges
~21.39 MB SQLite DB
WAL journal
```

正常 `codegraph_explore` 主要读取已经预计算好的 SQLite 图，而且输出本身有限制。在这个规模上，普通结构查询撞到 120 秒边界的风险极低。

真正可能慢的是 `codegraph init`、全量索引、超大项目或者 degraded daemon，而这些不是普通 `explore` 查询路径。

所以最终没有为了“一致”给 CodeGraph 人为加一个和 Local Dev 长 shell 一样的策略。**统一原则，不等于统一参数。**

## 一个万能 Tool 不够：效率开始取决于 Fact Owner 是否选对

Local Dev 接通以后，一开始会产生一种错觉：既然它能读文件、grep、跑 shell，似乎什么工程问题都可以用它解决。

技术上确实“可以”，但效率很快出现瓶颈。

例如用户问：

```text
这个 Service 从哪里被创建？
谁调用它？
Factory → Provider → Runtime 经过哪些层？
改这个 symbol 会影响哪些模块？
```

如果只用文件搜索，Chat 往往会：

```text
搜索一个名字
→ 读一个文件
→ 再搜 caller
→ 再读一层
→ 猜依赖
→ 再搜
```

Tool Call 多、上下文膨胀，而且模型还要自己在脑子里重建图。

于是系统开始从“有没有工具”转向“谁才是这个事实的 Owner”。

## CodeGraph：结构关系不再靠模型用 grep 自己拼

CodeGraph 负责的不是当前文件内容，而是代码结构关系：

```text
symbol
caller / callee
call path
module dependency
factory / provider / service chain
runtime composition
ownership boundary
blast radius
```

它的价值是把大量本来需要模型通过多次 `grep + read` 推导的结构关系预计算成图。

### `.codegraph` 是可重建索引，不是项目业务真值

每个 repo 自己拥有 `.codegraph` 索引。它可以包含 symbol、edge、call relation 等结构信息，但它不是：

```text
业务数据库
Task 状态
产品 Runtime 状态
Formal Spec
```

索引坏了可以重建，不能因为图里没有某个事实就宣布产品事实不存在。

这也是为什么公共 CodeGraph Server 后来从固定 ProFlow 路径改成通用：

```text
codegraph serve --mcp
```

调用时显式给 `projectPath`，每个 repo 自己初始化自己的图。`proton-workspace` 是多个 repo 的容器，不应该被当成一个“超级 CodeGraph project”。

### CodeGraph 自己的 MCP Instructions 也参与了工具路由

CodeGraph Server 会在 MCP initialize response 里给出 server-level instructions，明确引导 Agent：结构问题、call path、impact / blast radius 优先走 `codegraph_explore`，不要先用 `grep/read` 重建已经索引的结构。

这点很重要，因为高效工具选择不一定只能靠外层 Prompt。Tool Server 自己也可以通过 MCP 合同告诉 Host：“我最适合负责什么”。

今天我会把这理解成未来自研 MCP 的另一条设计线索：**Server 不只是暴露函数，也应该尽可能把自己的能力边界和正确使用条件表达清楚。**

### 结构工具和真实源码必须交叉验证

这形成了一个非常稳定的组合：

```text
结构问题
→ CodeGraph first

找到核心 symbol / path / owner 后
→ Local Dev 读取当前真实源码、Git、配置、测试和运行结果
```

一次真实联合测试就验证过这件事。

当时问题要求分析 Browser Execution 从 runtime composition 到 extension creation，而且提示词没有主动写“使用 CodeGraph”。Chat 自动先走结构图，找到：

```text
createBrowserExecutorComposition
→ createExecutionBrowserExtension
→ Browser Executor
```

然后再用 Local Dev 读真实源码，最终发现一个非常关键的语义修正：

```text
createExecutionBrowserExtension()
≠ 物理创建 Chrome Extension
```

它实际创建的是 Node 侧 Browser Executor adapter / port；真正 Chrome Extension 是 Chrome 加载 MV3 extension 后，由 background service worker 主动连接 loopback bridge。

这证明二者不是重复工具：

```text
CodeGraph
→ 快速找到结构

Local Dev
→ 证明当前实现到底是什么意思
```

当前工程协议已经把这个经验写成默认路由：未知跨模块结构问题先 CodeGraph，当前文件系统和运行事实再 Local Dev。

## Repomix：当问题从“一个 symbol”扩大到“整个仓库”

CodeGraph 解决结构关系以后，还有另一类上下文问题：第一次接管一个大仓库、跨目录审计、迁移覆盖检查、多个版本之间做广域对照。

如果仍然让 Chat：

```text
list
read
search
read
search
read
...
```

即使每一步都正确，整体 Tool Call 和 Token 开销仍然很高。

Repomix 的作用是先把大范围代码库压成一个稳定、可重复查询的上下文资产：

```text
large repo
    ↓ pack once
stable outputId
    ↓
grep output 多次定位
    ↓
read 小范围窗口
```

它适合的是：

- 首次接管大型仓库；
- 目录和内容未知；
- 跨目录、跨版本审计；
- 需要一次拿到大范围稳定 snapshot；
- 迁移覆盖检查。

它不应该代替 CodeGraph 做已知 symbol 的 caller/callee，也不应该代替 Local Dev 读取当前刚发生变化的真实磁盘状态。

当前 Repomix MCP runtime 还明确把 sandbox 限制在 workspace 的 `repos/` 下，这也是“能力大，但暴露面不必无限大”的一个例子。

工程协议后来进一步要求：做 Repomix snapshot 时显式排除 `node_modules`、`.git`、`.next`、`dist`、`build`、`coverage` 等依赖、缓存和生成树，避免“为了完整”把无价值 Token 一起打包。

## Playwright：源码正确不等于用户真的看见正确

再往后遇到的是另一种事实断层：

```text
source truth
≠ browser reality
```

代码可以看起来正确，API 可以返回 200，测试也可能 PASS，但真实页面依然可能：

- 按钮偏了；
- 弹窗挡住内容；
- 状态没刷新；
- 某个 Tab 不是目标 Tab；
- Extension 没有真正连接；
- 浏览器里加载的是旧页面或旧 runtime。

这时继续查源码只会越走越远。

Playwright Chrome 因此成为 Browser / UI 的“眼睛和手”。

在当前 Acceptance 规则里：

```text
DOM / AX
→ 语义事实

screenshot
→ 视觉、几何、错误表面事实

真实 Browser action
→ 用户路径里的副作用
```

“截图就是眼睛”并不是一句方便说法，而是 Fact Owner 原则：当问题是“用户现在到底看见什么”，Browser reality 比源码推理更高优先级。

## 四种核心工具不是越多越好，而是每种只负责自己最便宜的事实

到这一阶段，本机工程能力已经形成四个主要角：

| 工具 | 最适合回答什么 | 不应该拿它替代什么 |
|---|---|---|
| Local Dev / Desktop Commander | 当前文件、Git、Shell、Process、日志、测试、真实本机执行 | 大范围结构图推导、真实 Browser 视觉 |
| CodeGraph | symbol、调用链、依赖、ownership、blast radius | 当前 Git / 文件内容、编译测试、Runtime correctness |
| Repomix | 大仓库稳定 snapshot、广域检索、跨目录审计 | 高频当前状态、已知结构关系 |
| Playwright Chrome | DOM、截图、页面状态、真实浏览器操作、Console/Network | 代码结构、磁盘事实 |

这不是为了“专业化看起来高级”，而是为了降低 Agent 每次获取事实的成本。

如果一个结构问题需要 12 次 Local Dev 搜索才能拼出来，而 CodeGraph 一次就能给出核心路径，那么选择 Fact Owner 本身就是 Token 优化。

如果一个 UI 问题只需要一张截图就能证明，却先读十个 React 文件，同样是在浪费上下文。

这四种能力还天然形成故障隔离。早期真实事故里就出现过 Local Dev runtime 停止，而 CodeGraph 仍然健康。拆成独立 runtime 后，一个 Tool 的失败不必把所有能力一起拖死；恢复时也应该优先只恢复失败 alias，而不是“有一个坏了就全部重启”。

## 工具越来越多以后，需要一个公共 Runtime 层把它们稳定接到 Chat

工具专用化以后，新的问题出现了：四套 MCP runtime 谁启动、谁停止、谁看 health、谁保存 profile、谁在机器重启后恢复？

如果每个 Chat 自己拼命令，会产生新的配置和 owner 漂移。

于是形成了当前 `gptweb-mcp` 公共链路：

```text
scripts/gptweb-mcp
        ↓
automation/gptweb-mcp/gptweb-mcp
        ↓
┌────────────┬────────────┬────────────┬──────────────────┐
│ Local Dev  │ CodeGraph  │ Repomix    │ Playwright Chrome│
└────────────┴────────────┴────────────┴──────────────────┘
        ↓            ↓           ↓              ↓
     tunnel-client managed runtimes / MCP transport
```

当前 workspace 的职责也因此分成三层：

```text
tools/
= 原子能力，真正“会做什么”

automation/
= 稳定多步骤机械流程，回答“怎样重复跑完”

scripts/
= 人和其他系统使用的薄入口
```

这个分层非常重要。

如果一个工具真正负责“读文件”，能力放 `tools/`；如果是“按正确顺序恢复 Browser owner 再 rebind 已存在 Tab”，这是 Automation；如果只需要一个方便命令转发到 canonical automation，就放一个薄 Script。

不能为了目录对称，让每层都复制一份逻辑。

### Runtime Health 和 Functional PASS 必须分开

一个 runtime `/readyz` 返回 ready，只能证明对应生命周期已经达到“可以接受请求”的结构状态，不能证明所有业务能力都真实可用。

早期 `gptweb-mcp` 最终验收就明确分成两层：

```text
LOCAL_DEV_RUNTIME = READY
CODEGRAPH_RUNTIME = READY
```

和：

```text
LOCAL_DEV_FUNCTIONAL = PASS
CODEGRAPH_FUNCTIONAL = PASS
TOOL_SELECTION = PASS
CROSS_VERIFY = PASS
```

当前 Browser broker 也保持同样纪律：`/healthz` 是进程活着，`/readyz` 是 upstream client session 已建立；真实业务 Tab 是否正确、Extension 是否控制到目标 scene，仍然必须由 Browser reality 验证。

这条边界可以推广到所有 Agent Tool：**Health 是运行时事实，Functional PASS 是能力事实，Acceptance 是用户结果事实。三者不能互相代替。**

### Secret 和 Runtime credential 必须是基础设施边界，不是聊天内容

早期实践已经冻结过一套安全基线：

```text
Runtime credential
→ Restricted Runtime Key
→ 本地文件保存
→ chmod 600
→ 通过 file: 引用
```

长期 daemon 不使用 Admin Key；Key 不进 Chat、不进 Git、不复制到公共文档。

Tunnel ID 这类 opaque infrastructure identifier 也不应该为了“文档看起来完整”长期硬编码到公开知识文章里。

更重要的是：Tool 本身权限越大，Secret 和目录权限越应该在 Runtime / OS 边界收紧，而不是靠 Prompt 说“请不要泄露”。

## 当前四个 MCP runtime 的真实边界

截至 2026-09-17，canonical service set 是：

```text
local-dev
codegraph
repomix
playwright-chrome
```

生成出来的 tunnel-client profiles 统一属于 automation runtime projection，不再允许 `~/.config/tunnel-client/*.yaml` 作为第二配置真源。

本轮现实审计里，Local Dev 与 CodeGraph 都从各自 `/readyz` 观察到 READY；这里不会把没有完整终态证据的其他 runtime 状态顺手写成“全部 READY”。

几个当前细节尤其需要说清楚。

### Local Dev 直接走 tunnel-client，不走共享 Broker

当前链路是：

```text
ChatGPT
→ Secure MCP Tunnel
→ tunnel-client
→ Desktop Commander stdio MCP
```

Local Dev 是无状态、通用的本机执行面，不需要多个 Chat 为它争一个 Browser 类 owner。

历史迁移过程中曾经尝试过更广的 Broker adoption，把 Local Dev 等也往共享 Broker 的方向统一。实践以后发现这属于过度抽象：代码可以做通用 Broker，不代表所有 Tool 都应该经过 Broker。

当前 canonical 设计已经重新收窄：**Broker 只解决 Browser shared owner。**

### CodeGraph 和 Repomix 也直接走自己的 MCP runtime

CodeGraph 当前以通用 `serve --mcp` 形式运行，每次由调用方提供目标 repo 的 `projectPath`；不再把公共 Server 锁死到 ProFlow。

Repomix 当前独立运行，并把访问范围限制在 `repos/`。

这两个能力都没有理由为了“统一”去共享 Browser owner。

### Browser 才真正需要 mcp-shared-broker

Browser 是特殊的，因为多个 Chat 同时各自启动一套 Playwright MCP + Extension controller 会争同一个 Chrome 世界。

当前链路是：

```text
Chat / consumer
    ↓
Secure MCP Tunnel
    ↓
tunnel-client
    ↓
mcp-shared-broker
    ↓
唯一 Playwright MCP --extension upstream
    ↓
Playwright Extension
    ↓
Chrome
```

`mcp-shared-broker` 当前职责非常窄：

```text
多个 consumer
→ 共享一个 Browser owner
```

它不拥有：

- Local Dev；
- Monitor ownership；
- 产品审批；
- ChatRun；
- 工程 mutation authority；
- 产品业务状态机。

Broker `/healthz` 只证明 Broker 进程活着；`/readyz` 还要求至少一个 upstream MCP client session 已连接。即使 `readyz` 是 READY，也不能自动推导“当前业务 Tab 一定可操作”，Browser acceptance 仍要回真实 scene。

这也是后来一个反复踩坑才形成的边界：**readiness 不等于 functional acceptance。**

## 生命周期也不能让每个 Chat 随意重建

MCP Runtime 本身稳定以后，另一个效率问题是恢复。

如果工具一断，每个 Chat 都自己：

```text
查进程
→ 重启
→ 新建 profile
→ 再开一个 broker
→ 再连一次 Chrome
```

很快就会出现重复 owner。

因此当前 `automation/gptweb-mcp` 统一拥有：

```text
start
stop
restart
status
doctor
reconcile
watchdog
```

这些命令本身还必须幂等：如果 runtime 已经 READY，`start` 不应该再拉一份；如果只有某个 alias DOWN，优先恢复那个 alias，不把其他健康 runtime 一起重启。

其中 Local Dev 还有一个用户授权的专属 watchdog：`LD-WD-001`。

它的设计不是“每 30 秒无脑重启”，而是：

```text
从 Local Dev 进程之外读取 health URL
→ 探测 /readyz
→ READY：什么都不做
→ DOWN：调用 canonical restart local-dev
→ 恢复失败：指数退避
```

它只守 Local Dev，不顺手守 CodeGraph、Repomix 或 Playwright，也不创建第二套 runtime owner。

Browser 恢复同样被下沉成 bounded state machine（有界状态机）：先尝试一次 canonical connect；确实 DOWN 才 start；READY 但 connect 失败时最多做一次 stop/start；仍然失败就 fail closed，而不是模型无限重试。

### 当前运维思路是“先看失败 Owner”，不是一键全重启

日常诊断逻辑已经从“全重启试试”收敛成：

```text
Local Dev 不可用
→ 看 local-dev runtime / health
→ 看 tunnel-client local-dev 日志
→ 看 Desktop Commander / process 事实

CodeGraph 不可用
→ 看 codegraph runtime
→ 看目标 repo 的 codegraph 状态
→ 确认 projectPath / per-repo index

Browser 不可控
→ 先看真实 Browser scene
→ 再判断是 lease / shared owner / Extension / Broker / upstream 哪一层
```

只恢复 proven failure owner，避免一次故障扩大成四套 runtime 同时重建。

这类设计直接减少“工具坏了以后 Chat 自己发明恢复路径”的 Tool Call 和风险。

## 工具都接好了以后，我发现最大的吞吐瓶颈又回到了 Chat 自己

到这里看起来系统已经很完整：Chat 能读本机、看代码图、打包大仓库、操作浏览器。

但真实使用很快证明：**有工具，不等于会高效使用工具。**

典型低效行为包括：

- 明明 scope 已知，仍然逐文件读；
- 明明是结构问题，却先用 Local Dev grep 十几轮；
- 明明 Browser 一眼能看见，先读源码猜 UI；
- 一个实现阶段还没结束就开始测试；
- `test → patch → test → patch`；
- 长任务启动以后连续 `read_process_output` 问“好了没”；
- timeout 后再启动第二份非幂等任务；
- 一个 Tool 已经有 owner，连接问题时又造第二个 broker/controller/profile；
- 为了改十几个文件，模型逐文件做 mutation round-trip；
- 为了验证同一个结果，连续查 process、status、health、log；
- 同一套确定性机械步骤，每一轮都重新让模型决定一次。

这些行为的共同问题不是“模型笨”，而是**自由度太高**。

模型每多决定一次机械步骤，就会增加：

```text
Token
+ Tool transport
+ user wall time
+ 状态漂移概率
+ 错误恢复成本
```

这就是为什么系统继续从 Tool 进入 Skill Governance（技能治理：用明确规则约束 Chat 怎样使用工具和推进工程）。

## Engineering Skill：把两个月的工程事故变成 Chat 的工作纪律

`chat-local-engineering-protocol` 不是一个增加新能力的 Skill。

它做的恰恰相反：**减少 Chat 可以随意发挥的空间。**

核心优先级现在被固定成：

```text
CURRENT REALITY / EYES
→ FACT OWNER + FIRST DIVERGENCE
→ COMPLETE STAGE SCOPE
→ HIGH-THROUGHPUT IMPLEMENTATION
→ STAGE FREEZE
→ STAGE VERIFY
→ ACCEPTANCE / RELEASE
```

这几条规则分别在解决真实浪费。

### Reality First：不要用 Token 猜已经可以直接看到的事实

如果页面已经打开，就先看页面；如果 runtime 有真实 status，就读 runtime；如果 Git 是 Fact Owner，就不要从旧聊天猜当前 branch。

### Owner First：不要在 downstream 修一个 upstream 已经明确解释的问题

一个错误如果最早在身份、Runtime、配置 Owner 就已经产生，修 UI symptom 只会制造第二套状态。

### Stage Freeze：不要边改边测

正式测试只在一个完整实现阶段结束后启动。

```text
complete implementation
→ freeze
→ verify once
→ capture failure set
→ repair stage
→ verify again
```

而不是：

```text
改一点
→ 跑测试
→ 再改一点
→ 再跑测试
```

### ASYNC RETURN BARRIER：不要让 Chat 陪一个长任务一起发呆

一旦长任务已经有 PID/session/terminal authority，Chat 应该继续独立工作；真正依赖终态时最多做一次 authority readback。如果仍在运行而没有独立工作，就把控制还给用户，而不是高频轮询。

这条规则正是早期 120 秒事故的系统化版本。

### Whole-file mutation：一个 Engineering Decision 尽量只有一次本机 mutation

今天的目标已经变成：

```text
LMR = Local Mutation Round-trip
正常目标 ≈ 1 / Engineering Decision
```

模型先完成语义设计，确定 CREATE / REPLACE / DELETE 的完整结果，再进入一次机械 apply。

Skill 的价值因此不是“提醒模型认真一点”，而是把重复失败变成可执行的流程约束。

## Acceptance Skill：让“我觉得成功了”变成用户真实世界里的证明

工程代码通过以后，还有另一类浪费：把内部事实当成用户事实。

`chat-local-acceptance-automation-protocol` 把真实验收顺序固定成：

```text
EYES / CURRENT USER REALITY
→ IDENTIFY TARGET + OWNER
→ FIRST DIVERGENCE
→ MINIMUM ACT / WAIT / LISTEN
→ IMMEDIATE EYES READBACK
→ CHECKPOINT / RECONCILE
→ STAGE-FINAL VERIFY
```

几个效率原则同样来自真实问题：

- **EYES-FIRST**：能通过 DOM / screenshot 直接证明，就不要先修工具；
- **REUSE EXISTING BROWSER CONNECTION**：已有 Browser owner 优先，不因为控制失败就再开一套；
- **IDENTIFY BEFORE MUTATE**：Tab index、坐标和旧位置不是对象身份；
- **SIDE-EFFECT RECONCILIATION**：不确定的浏览器副作用先核对，不自动重放；
- **SAME_SCENE / FAST_REPLAY / FULL_FRESH 分级**：修一个局部 defect 不需要每次从零跑完整旅程；
- **MINIMUM SUFFICIENT PROOF**：只采集下一步决策需要的证据。

这让 Browser 从“模型可以到处点的自动化工具”，变成受真实场景、身份、lease 和 checkpoint 约束的验收系统。

## 但 Skill 仍然是文字：稳定机械动作不应该每次都消耗模型判断

做到 Skill 以后，吞吐仍然没有结束。

因为 Skill 只是告诉模型：

```text
先 A
再 B
然后 C
失败时 D
最后 E
```

如果 A/B/C/D/E 本身都是确定性步骤，每次还要模型重新读取规则、决定、发 Tool Call，就仍然在浪费。

这时系统形成了第二条核心原则：

> **Automation below Model。模型判断在上，稳定机械过程在下。**

当前 workspace 明确把 `automation/` 定义为：

> 可重复执行的确定性工作流；回答“怎样稳定跑完已经定义好的步骤”，不拥有工程判断。

举几个已经发生的下沉。

### Browser recover 从 Skill 文本下沉成有界程序

以前模型可能自己决定：先 status、再 stop、再 start、再 connect、再截图。

现在 `playwright-recover.py` 把允许的恢复路径固定好，模型只消费最后结果。

### Dev Tunnel、知识发布、Extension reload 都有自己的 automation owner

这些过程之所以进入 Automation，不是因为它们“复杂”，而是因为步骤已经稳定，不值得每一轮重新让模型计划。

### Frozen Decision Runner 把整文件变更的控制平面一次收完

当前 Engineering mutation 的机械路径是：

```text
complete next-version files
+ CREATE / REPLACE / DELETE
+ expected state
+ verification plan
        ↓
execute-frozen-decision
        ↓
materialize envelope
        ↓
derive manifest
        ↓
drift-gated apply
        ↓
declared verification
        ↓
durable receipt
```

模型负责“文件最终是什么”；Runner 负责 hash、manifest、bundle、drift gate、apply、verification 和 receipt。

这正是从早期“Chat 给我 zip 和脚本，我手工执行”一路演进来的自动化版本。

## 真正的吞吐指标不是某个命令有多快，而是用户等了多久

做到这里以后，效率也不能只看本机脚本时间。

工程协议把主指标定义成：

```text
USER_PERCEIVED_WALL
```

也就是用户从提出需求到得到可用结果真正感受到的总墙钟。

它包含：

```text
Chat cognition / orchestration
+ Tool / MCP transport
+ Local compute
+ recovery / retry tax
+ harness / setup mistakes
```

如果本机脚本只跑 500ms，但 Chat 为了调用它先做了 12 次读取、4 次状态检查和 3 次无效恢复，对用户来说仍然很慢。

因此后来开始记录：

- `LSR_AFTER_SNAPSHOT`：冻结后又读了多少次源码；
- `LMR`：一个决策发生了几次本机 mutation；
- verify starts：正式验证启动了几次；
- avoidable calls：多少工具调用是可避免的；
- long-task polling：是否在傻等；
- control-plane fragmentation：确定性步骤有没有被拆成很多轮 Tool Call。

这比“感觉今天快一点”更能指导 Skill 和 Automation 的下一次演进。

## 今天的完整架构：不是一堆 MCP，而是一套分层责任系统

把当前结构画在一起，大致是：

```text
┌──────────────────────────────────────────────┐
│            ChatGPT Chat / Monitor            │
│   负责：理解、判断、规划、取舍、下一步决策    │
└──────────────────────┬───────────────────────┘
                       │
             ┌─────────▼─────────┐
             │ Skills / Protocol │
             │ Engineering       │
             │ Acceptance        │
             │ ProFlow Chat Loop │
             └─────────┬─────────┘
                       │ 决定该看什么、谁是 owner
       ┌───────────────┼─────────────────────────┐
       │               │                         │
       ▼               ▼                         ▼
┌────────────┐   ┌────────────┐           ┌──────────────┐
│ CodeGraph  │   │ Local Dev  │           │   Repomix    │
│ 结构事实    │   │ 本机现实    │           │ 大仓上下文    │
└─────┬──────┘   └─────┬──────┘           └──────┬───────┘
      │                │                         │
      │                │                         │
      └──── direct tunnel-client stdio MCP ─────┘
                       │
                       │
                 ┌─────▼─────┐
                 │   Mac     │
                 │ source/git│
                 │ process   │
                 └───────────┘

另一条视觉事实链：

Chat / Acceptance
       │
       ▼
Secure MCP Tunnel
       │
       ▼
tunnel-client
       │
       ▼
mcp-shared-broker
       │  只负责 Browser shared owner
       ▼
Playwright MCP --extension
       │
       ▼
Chrome Extension / Chrome
       │
       ▼
真实用户界面
```

在这些 Tool 下方，还有一层确定性执行：

```text
Automation
├─ gptweb-mcp runtime lifecycle / recover / watchdog
├─ dev-tunnel
├─ knowledge publish
├─ browser extension reload / debug collection
└─ engineering frozen-decision runners
```

而 `scripts/` 只承担薄入口，不再复制逻辑。

这套结构的关键不是目录，而是责任：

```text
Model / Chat
→ 判断

Skill
→ 行为策略和边界

Automation
→ 已经稳定的确定性流程

Tool / MCP
→ 原子能力与硬参数合同

Product Repo
→ 产品自己的业务真值

Runtime / Browser / Git / External Service
→ 现实世界最终事实
```

## 开发工具链不能反向变成产品 Runtime

这套能力最初在 ProFlow 工程里被大量使用，很容易产生另一个架构误区：既然 Secure MCP Tunnel、Desktop Commander、CodeGraph 很有用，是不是应该把它们塞进 ProFlow 产品 Runtime？

当时明确没有这样做。

```text
Chat → MCP → Local Dev / CodeGraph / Repomix / Browser
= Developer Tooling / Engineering Harness

ProFlow Task / Node / Worker / Gateway / Product Runtime
= 产品自己的业务系统
```

开发工具链可以帮助修改、验证和观察 ProFlow，但它不因此拥有 ProFlow 的 Task 状态、业务审批、Worker identity 或产品调度。

这条边界后来也扩展到 Browser Broker：Broker 只拥有共享 Browser transport，不因为“所有 Monitor 都用它”就顺便拥有 Monitor ownership。

这是一条很值得复用的架构纪律：**一个工具因为对产品开发很重要，不等于它应该进入产品核心。**

## Monitor Chat 自迭代为什么依赖这套基础，而不是只依赖一个“继续”按钮

当工具链、Skill 和 Automation 都形成以后，一个新的可能性才真正出现：让 Chat 自己持续推动真实产品迭代。

这里需要区分“自动发下一句提示词”和真正的 self-iteration（自迭代）。

如果系统只是：

```text
Chat 回答完
→ 自动输入“继续”
→ Chat 再回答
```

那只是自动续聊。

真正的工程闭环需要：

```text
恢复当前任务与使命
        ↓
读取当前真实 Reality
        ↓
找到 Fact Owner / first divergence
        ↓
做一个完整 Engineering Decision
        ↓
真实执行和 Stage Verify
        ↓
回到 Browser / Runtime 做真实 Acceptance
        ↓
把新的事实写回 checkpoint
        ↓
下一轮从当前真实状态继续
```

当前最具体的实现是 ProFlow 专属 `proflow-chat-loop`。

它规定一个 Monitor Chat 班次一次只有一个 mutation owner；Browser 只是 scheduler 和 physical carrier，不替模型决定下一项任务；自动 wake 使用中性提示，让当前 Monitor 根据本地事实和既有规则自己判断。

Monitor 在真正继续 live iteration 以前还必须通过 `REAL_SCENE` gate：

```text
current source reality
→ verified built artifact
→ official Workspace adoption
→ formal owner lifecycle
→ running process loaded correct implementation
→ current Browser / Provider / external reality
```

如果这条链断了，Monitor 不能因为“源码测试过了”就继续往后跑，而要先修最早的 Reality divergence。

班次接近约四小时还会进行 successor rotation：把唯一 checkpoint 写入本地，新的 Chat 自己从当前 Source of Truth 恢复，确认接管以后旧 Chat 停止 mutation。

这套 Loop 之所以能成立，正是因为下面几层已经存在：

```text
CodeGraph
→ 它知道结构在哪里

Local Dev
→ 它能读写真实工程

Repomix
→ 它能在大范围上下文里接管和审计

Playwright
→ 它看得到真实用户世界

Engineering Skill
→ 它知道怎样不把工程做碎

Acceptance Skill
→ 它知道怎样证明用户路径

Automation
→ 它不用每轮重新发明机械步骤
```

所以本机工具链不是 Monitor Chat 的附属设施，而是它形成工程闭环的底盘。

## 为什么现在又开始考虑自研 MCP：这不是回到“什么都自己造”

这条演进里有一个看起来矛盾、实际上很重要的变化。

在 2026 年 8 月的早期阶段，我们明确讨论过做一个 Local Dev Guard MCP：

```text
ChatGPT
→ Guard MCP
→ Desktop Commander
```

它可以硬性拒绝超长 `timeout_ms`，也可以注入更多规则。

当时结论是：**WRAPPER = NOT ADOPTED。**

理由很合理：

- 问题刚出现；
- Desktop Commander 自己已经有 session；
- App Description + 操作纪律能解决主要事故；
- 为一个局部问题新增服务会增加维护成本；
- 还没有足够重复证据证明哪些规则真的稳定。

但一个多月以后，情况发生了变化。

现在已经不只是一条“timeout 不要写 120000”的经验，而是积累出一整组反复验证的稳定不变量：

```text
Reality First
Owner First
Stage Freeze
Whole-file mutation
Source drift fail closed
UNKNOWN 不能盲重试
Long task 必须 durable authority
Browser shared owner
Side-effect reconciliation
Minimum-sufficient proof
Deterministic mechanics below model
```

这时继续把所有规则只写在 Skill 里，反而会让模型每一轮重复理解和执行机械约束。

所以未来自研 MCP 的理由已经变了。

它不是为了“拥有自己的 MCP”，而是为了把**已经证明稳定的执行合同**下沉成硬边界。

例如未来可以暴露比底层 Tool 更高一级的能力：

```text
apply_frozen_engineering_decision(...)
```

内部保证：

```text
expected state
source drift gate
whole-file apply
verification plan
receipt
```

模型不能跳过中间步骤。

又例如：

```text
run_long_operation(...)
```

内部直接生成 durable PID/session/terminal authority，不允许模型把一个 20 分钟 build 作为 20 分钟 MCP request。

或者：

```text
reconcile_non_idempotent_effect(...)
```

只允许返回：

```text
APPLIED
NOT_APPLIED
UNKNOWN
```

并把 retry 条件写进服务器合同，而不是依赖模型“记得不要盲重试”。

Browser 也可以逐渐暴露：

```text
observe_target_with_identity(...)
act_with_shared_lease(...)
reconcile_browser_side_effect(...)
```

而不是永远把所有低层 `click / type / tab` 自由组合交给模型。

这就是所谓“限制得更死”的真正价值：

```text
自由度减少
→ 机械判断减少
→ Tool Call 减少
→ Token 减少
→ 状态方差减少
→ fail closed 更容易
→ 高层推理空间反而更干净
```

## OpenMCP、Inspector、MCPJam、Docker Gateway 应该放在未来链路的什么位置

当前外部 MCP 生态已经比两个月前丰富很多。它们不应该被简单分成“比我的方案强 / 弱”，而应该看承担哪一种责任。

| 工具 / 项目 | 当前角色 | 对当前系统最有价值的用法 |
|---|---|---|
| OpenMCP client | IDE 内开发、调试 MCP，Inspector + 多模型交互测试 | 自研 MCP 开发阶段的调试工作台候选 |
| getdatanaut OpenMCP | OpenAPI → MCP、多个 Server remix、Tool allowlist | 研究“只暴露需要的 Tool”与能力聚合 |
| AguLeon/OpenMCP | CUA benchmark / self-hosted testbed | 参考 Computer-Using Agent 的评测与可复现实验方式 |
| 官方 MCP Inspector | 协议级 tools/resources/prompts、transport、OAuth；Web / CLI / TUI 共用核心 | 自研 Server 的最低协议 Gate |
| MCPJam | 真模型 Tool Selection、参数、跨 Client、OAuth、Eval、CI | 自研 MCP 的行为 Eval 和跨 Client 回归 |
| Docker MCP Toolkit | Docker Desktop 4.62+ Beta 的容器化 Server 管理、Catalog、Profile | Server 数量增长以后研究可移植运行环境 |
| Docker MCP Gateway | 多 Server 集中生命周期、路由、认证 | 对比当前 gptweb-mcp + Browser Broker 的职责边界 |
| Official MCP Registry | 当前 Preview 的公共 Server 元数据发布与发现 | 自研能力成熟以后考虑分发，不参与当前本机执行真值 |

这里最值得吸收的不是“换掉现有系统”，而是三类成熟能力：

```text
开发调试
→ Inspector / OpenMCP

真实模型行为评测
→ MCPJam

多 Server 生命周期 / 分发
→ Docker Toolkit / Gateway / Registry
```

当前本机架构仍然有非常明确的现实优势：它已经围绕 ChatGPT Web、Secure MCP Tunnel、现有 Mac、真实 Chrome 和当前工作区形成稳定 Owner。没有理由为了追新工具把一条已经工作的链路整体推翻。

未来自研 MCP 应该做的是**复用这些生态里的测试、Eval、打包和分发能力，同时保留已经验证过的本机控制合同。**

## 如果别人也想提高 Agent 工程效率，可以按这条成熟度阶梯判断自己

这两个月的路径不是只能复刻在我的环境里。它可以转换成一套通用判断题。

### 你还在大量复制粘贴代码和日志？

先不要急着研究 Multi-Agent。

首先解决 transport：让文件、日志和执行结果能结构化进入 Agent，而不是让人做数据总线。

最低成本的进步可能只是：

```text
碎片复制
→ 整个文件
→ 压缩包
→ 可重复脚本
```

### 已经能批量交文件，但每次还要人执行几十个动作？

把一个完整变更收成一个 Bundle。

原则是：

```text
模型决定目标状态
机器执行确定性落盘
```

不要让人做逐文件 patch runner。

### 已经有 MCP，但一个万能 Tool 什么都做？

开始按 Fact Owner 拆能力。

问自己：

```text
代码结构谁最便宜？
当前磁盘事实谁最权威？
大仓上下文谁最省 Token？
用户看到的页面谁最真实？
```

不一定要用我同样的四个工具，但职责要清楚。

### 工具很多了，但 Chat 还是很慢？

先看工具使用过程，而不是继续加工具。

常见浪费包括：

```text
重复 read
错误 Fact Owner
高频轮询
边改边测
UNKNOWN 盲重试
重复建立 owner
控制平面被拆成十几个 Tool Call
```

这时应该开始写 Skill / Protocol，约束行为顺序。

### Skill 越写越长，模型每次都要读很多规则？

这通常说明一部分内容已经成熟到不该继续留在 Prompt / Skill。

把“无需模型判断的稳定序列”下沉成 Automation。

模型最好只看到：

```text
输入合同
最终 receipt
异常分类
```

而不是每轮自己执行 15 个机械步骤。

### Automation 仍然依赖模型正确组合很多底层 Tool？

这时才真正值得考虑自研 MCP / Runtime contract。

先问：

> 这条规则是否已经被多次真实事故和验证证明稳定？

如果答案是否定的，先别固化。

如果答案是肯定的，就把它变成服务器可以拒绝错误状态的硬合同，而不是继续写一条“请记得这样做”的 Prompt。

## 效率最终不是“更少 Token”一个数字，而是整个闭环的信息密度更高

这篇文章从 Token 开始，但最终关心的效率比 Token 更宽。

我现在更愿意把 Agent 工程效率理解成：

```text
有效判断
──────────────
Token + Tool Calls + Wall Time + 人工搬运 + Retry Risk
```

这个公式不是精确数学模型，而是一种设计方向。

如果一次复杂架构判断需要很多 Token，但这些 Token 真正在比较证据、分析 trade-off、设计边界，这是合理消耗。

如果几万 Token 只是因为：

- 把同一份源码重复贴三次；
- 模型连续 grep 十层调用关系；
- 长任务每十秒问一次“完成了吗”；
- 为了同一个结果启动三次测试；
- 一个 timeout 以后重新做已经发生过的 publish；
- Browser owner 冲突以后再启动一个 owner；

那就是系统问题，不是“模型价格问题”。

真正的优化目标，是不断把这类机械浪费拿掉。

于是整个演进会形成一个很有意思的方向：

```text
早期
模型自由度很高
系统能力很少
人做很多机械工作

中期
工具能力增加
模型仍负责大量调用策略

后期
Fact Owner 明确
Skill 约束策略
Automation 承担稳定流程
MCP / Runtime 承担硬不变量
模型只保留高价值判断
```

越成熟的 Agent 系统，不一定给模型更多自由；很多时候恰恰是**把已经理解清楚的部分限制得越来越死。**

## 当前事实、历史经验和未来方向必须分开

为了避免这篇文章以后被读成一份过期安装手册，最后把三类事实明确分开。

### 当前已经存在的事实

截至 2026-09-17：

- `proton-workspace` 是跨项目 Tool、Automation、Skill 和知识的长期工作区；
- canonical GPT Web MCP service set 是 Local Dev、CodeGraph、Repomix、Playwright Chrome；
- Local Dev 当前直接通过 tunnel-client 启动 Desktop Commander `0.2.44`，不走 shared broker；
- CodeGraph 当前是通用 `serve --mcp`，按 repo `projectPath` 工作；
- Repomix 是独立 MCP runtime，用于大仓库上下文；
- Browser 使用 `mcp-shared-broker` 共享唯一 Playwright owner；
- Broker 不拥有 Local Dev、Monitor 或 mutation authority；
- `gptweb-mcp` automation 统一管理四个 service 的生命周期；
- generated profiles 属于 automation runtime projection，不再把历史 `~/.config/tunnel-client/*.yaml` 当第二真源；
- Local Dev 有专属 watchdog 设计 `LD-WD-001`；
- Engineering 和 Acceptance 两套 Chat-only Skill 已经把高频失败模式正式变成协议；
- deterministic mechanics 已持续下沉到 workspace automation 和 frozen-decision runner；
- ProFlow 的 `proflow-chat-loop` 已经把这些能力用于真实 Monitor 连续迭代实验。

### 历史上真实发生、但不能当今天配置照抄的事实

包括：

- 最早只有 Local Dev + CodeGraph 两个 runtime；
- 早期 `gptweb-mcp` 曾使用更宽的 launchd 60 秒自检模型；
- 曾出现单 MCP request 接近 120 秒后断链的真实事故；
- 曾靠 App Description 指导 Local Dev 长任务纪律；
- 曾讨论 Guard MCP，但当时明确不采用；
- Broker adoption 过程中曾尝试更宽的 owner 统一，后来重新收窄到 Browser；
- Desktop Commander `0.2.48` 是源码学习快照，不是当前运行 pin；
- 某些历史 absolute path、runtime key 文件名、旧 profile 和机器细节只是当时环境证据。

这些历史不应该删除，因为它们解释“为什么今天会变成这样”；但也不能被后来的维护者复制成当前配置。

### 当前还没有实现、属于下一阶段的方向

包括：

- 自研高层 MCP / Runtime contract；
- 把更多稳定工程不变量从 Skill 下沉到服务器硬约束；
- 用官方 Inspector / MCPJam 建立自研 MCP 的协议与模型行为 Eval；
- 评估 Docker MCP Toolkit / Gateway 对多 Server 生命周期的可复用价值；
- 能力成熟以后再考虑 MCP Registry 分发；
- 把当前 ProFlow 专属 Monitor Loop 中可迁移的自迭代能力进一步抽象成更通用的工程 Monitor 基础设施。

这些都不能写成“已经完成”。

## 最后留下的不是工具清单，而是一条不断减少无效自由度的工程路线

回头看这两个月，表面上新增了很多东西：压缩包、脚本、Secure MCP Tunnel、Desktop Commander、CodeGraph、Repomix、Playwright、Broker、Watchdog、Skill、Automation、Runner、Monitor Loop。

但如果只看到这些名词，就看不到真正的主线。

真正发生的是：

```text
人肉搬运事实
→ 文件化传输
→ 批量确定性执行
→ Chat 直接读取现实
→ 不同事实交给不同 Owner
→ Chat 行为被 Skill 约束
→ 稳定机械步骤进入 Automation
→ 真实用户世界进入 Acceptance
→ 多轮工作形成 Monitor Loop
→ 已验证不变量准备继续下沉到自研 MCP
```

每往下一层走一次，都会减少一类本不该由模型承担的工作。

这也是 Monitor Chat 自迭代真正需要的基础：不是让 Chat 永远不停说话，而是让它能够在一个受控系统里持续完成：

```text
看见现实
→ 理解关系
→ 做出判断
→ 产生真实变更
→ 验证真实结果
→ 保存当前状态
→ 下一轮继续
```

如果中间任何一步仍然只能靠人把结果复制回来，自迭代就不是闭环；如果每个机械步骤仍然要求模型临场判断，吞吐和可靠性就会被自由度拖垮。

所以我现在对这套系统最稳定的判断不是“MCP 很重要”，也不是“自动化越多越好”，而是：

> **Agent 工程效率的核心，是让每类事实有正确 Owner，让每类确定性动作有稳定执行者，让模型只承担真正需要智能的判断。工具负责手和眼，Skill 负责纪律，Automation 负责机械确定性，Runtime 负责生命周期，Loop 才有资格把这些能力串成持续自迭代。**

最终目标也不是零 Token，而是让每一个 Token 都尽可能接近真正的思考。

## 外部生态参考

以下资料用于理解当前 MCP 生态角色，不代表本机已经采用：

- OpenAI：ChatGPT Developer mode / Secure MCP Tunnel 说明
  https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt
- OpenMCP client（VS Code / Cursor / TRAE MCP 开发与调试）
  https://github.com/LSTM-Kirigaya/openmcp-client
- getdatanaut OpenMCP（OpenAPI → MCP / MCP remix）
  https://github.com/getdatanaut/openmcp
- Model Context Protocol Inspector
  https://github.com/modelcontextprotocol/inspector
- MCPJam
  https://www.mcpjam.com/mcp-testing
- Docker MCP Toolkit
  https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/
- Docker MCP Gateway
  https://docs.docker.com/ai/mcp-catalog-and-toolkit/mcp-gateway/
- Official MCP Registry
  https://registry.modelcontextprotocol.io/
