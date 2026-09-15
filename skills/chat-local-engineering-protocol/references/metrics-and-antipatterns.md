# 指标与反模式

`../SKILL.md` 是唯一规则 owner。本文件只把重复失败压缩成少量 failure families，避免维护几十条近义反例。

## 观测维度

主指标是 `USER_PERCEIVED_WALL`。拆分时区分：Chat reasoning/context/orchestration、Tool/transport、Local compute、recovery/retry、harness/setup/transport mistake。

过程正确性至少关注：`LSR_AFTER_SNAPSHOT`、`LMR_PER_DECISION`、`VERIFY_START`、preflight probe、blind retry、polling、`KNOWN_SLOW_DETACHED_SAME_TURN_POLLS`、mutation fragmentation，以及 benchmark harness 是否污染业务墙钟。

## Failure families

### 1. Acquisition / context amplification

典型失败：FROZEN 后无证据重读；已知 scope 先 probe 再 batch；把 candidate package/full repo 全量灌入；acceptance 太窄导致返工；Repomix 未显式递归排除 dependency/generated/cache tree。

### 2. Remote-IDE mutation

典型失败：patch/unified diff、逐文件/逐 hunk edit、anchor hunting、Local transformer 决定源码变化、一个 Engineering Decision 多次 mutation、把 file count 当 mutation unit。

### 3. Transport / harness expansion

典型失败：把 source/base64/tar/heredoc 塞进 shell；每轮重写 apply harness；shell quoting/平台命令/临时依赖假设造成无业务价值失败；Data Plane staging 因缺目录/错误 overwrite mode 产生额外往返；未在 `BUNDLE_READY` 前确认 envelope grammar / required records，启动 runner 后才发现 payload shape 错误。

### 4. Verification / recovery waste

典型失败：debugging loop 反复 Full Suite；只为确认“还在运行”而高频 polling；timeout/UNKNOWN 后 blind retry；终态未知时先删 transport/evidence；本可 same-session continuation 却新开 process；runner/apply/verify 已执行但只依赖短生命周期 PTY 输出，session 丢失后又重复验证；`ENVELOPE_READY` 后故意跨 turn 留下等待进程，导致 payload 上下文丢失后重新冻结。

**HIGH-SEVERITY 子类：known-slow detached polling regression。** 当本机或重复历史已经证明 build/publishability/release/deploy/install/full-suite 是慢任务，并且当前回合不依赖终态时，启动后仍持续 `read_process_output` / `ps` / health / Registry 查询，把 Chat 卡在“正在思考”，属于高权重吞吐回归。目标是 `KNOWN_SLOW_DETACHED_SAME_TURN_POLLS = 0`。后续检查必须按 `terminal authority → PID/session once → log once if dead`，而不是围着进程循环观察。

**HIGH-SEVERITY 子类：terminal authority loss / duplicate verify。** Frozen runner 必须把 apply 和 verification checkpoint 增量写入受控 `skills/chat-local-engineering-protocol/.runtime/frozen-decisions/<authority-id>/decision-receipt.json`。Tool/session 输出丢失后先读该 durable receipt；已完成 PASS proof 不重复执行。只有 receipt 无法给出 terminal/checkpoint 事实时才继续 PID/session recovery。目标是把 `FROZEN_RUNNER_RESPONSE_LOST`、`TERMINAL_RECEIPT_UNAVAILABLE`、`VERIFY_TERMINAL_AUTHORITY_LOST` 这类 recovery tax 压到 0，而不是靠重复 build/test 掩盖终态丢失。

### 5. Authority / mirror drift

典型失败：用源码猜 Runtime；正文升级但 machine-readable mirror/runner/reference 仍表达旧模型；reference 逐渐复制出第二套规范。

### 6. Throughput accounting distortion

典型失败：用 Local mechanical time 冒充用户总墙钟；把 harness/recovery 错误从成绩中扣掉；最终 PASS 掩盖前面的无效 tool calls。

### 7. Benchmark harness scope expansion

历史回放若只需要临时 case 与必要源码/验收证据，却为每个 case 重建整仓、重新物化 `node_modules`/安装依赖并删除完整 sandbox，会把环境 setup/teardown 错误注入单个 Engineering Decision。

优先做法：只抽取当前 Decision 所需文件/证据到临时 case。若独立全仓环境确实是测试前提，则把一次性 setup/teardown 单独归因，不伪装成业务吞吐。

### 8. Visual trial-and-error amplification

典型失败：只看截图连续试 `padding/margin/top/left`；隐藏 grid track、row-gap、父级 flex/grid、line-height、intrinsic control size 或 later-loaded override 才是真正 owner，却反复修改表面数值；已有成熟 hover/popover primitive 仍自建 state + absolute positioning，随后为 anchor 漂移、pointer gap、collision、focus 行为继续打补丁。

优先做法：第一次 visual refinement 就把 screenshot（仅在 pixels/gestalt 需要时）、DOM/AX geometry、computed style/final cascade owner 与可复用 UI primitive 一次收齐。同一视觉 criterion 第一次 repair 后仍失败，下一轮强制进入 root-cause measurement，不允许第二次 blind numeric tuning。

## 使用原则

新增失败优先归入既有 family；只有出现新的因果类型时才增加类别。案例细节放 `validation-evidence.md`，不要把每次事故永久扩展成一条新反模式。
