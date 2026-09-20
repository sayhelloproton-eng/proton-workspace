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

## 先分清这篇文章的两条主线

这篇文章很长，因为同一段实践最后长出了两类不同知识。它们互相解释，但**不能互相冒充 Current Owner**。

第一条是**本机工具与 Runtime 基础设施**：

~~~text
Local Dev / Desktop Commander
+ CodeGraph
+ Repomix
+ Playwright
+ tunnel-client / Broker / Watchdog
→ Chat 怎样稳定获得本机与 Browser Reality
~~~

第二条是**Chat 本机工程执行方法**：

~~~text
Reality First
→ Owner First
→ Stage Freeze
→ ASYNC Return Barrier
→ whole-file transaction
→ Acceptance
→ Automation below model
~~~

本文保留两条线怎样从真实瓶颈和事故里共同长出来，方便读者理解“为什么”。但今天的硬规则和即时配置分别由真正 Owner 决定：

- 当前 Chat 本机工程协议：`skills/chat-local-engineering-protocol/SKILL.md`；
- MCP service 编排与恢复：`automation/gptweb-mcp/`；
- 各 Tool 的具体 Runtime：`tools/**`；
- Browser / UI Acceptance 方法：对应 Acceptance Skill 与真实 Browser evidence。

因此这里出现的命令、版本、Runtime 状态和协议片段都必须带时间边界。**知识文章解释演进；Skill / Automation / Tool / Runtime 才拥有今天应该怎么执行。** 这样就不会因为一篇长文同时讲到了工具和方法，又悄悄形成第二份工程协议。

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
- **MCP Registry**：官方公共 Server 元数据注册与发现层。2025 年发布时处于 Preview；截至 2026-09-20，官方 Registry reference 已暴露 `v1.0.0` API，而 MCP 协议与治理仍在持续演进。因此它可以作为分发与发现层观察，但不能因为版本号已经进入 1.0 就把 Registry 当成本机执行真值或假定所有生态兼容性已经冻结。

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
