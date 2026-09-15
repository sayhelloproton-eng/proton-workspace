# 指标与反模式

`../SKILL.md` 是唯一规则 owner。本文件压缩重复失败为少量 failure families，并保留吞吐 benchmark / Skill evolution 的详细治理；案例细节放 `validation-evidence.md`。

## 观测维度

主指标：`USER_PERCEIVED_WALL`。只记录自然获得的证据，区分 Chat cognition/orchestration、Tool/transport、Local compute、recovery/retry、harness/setup mistakes。

过程正确性至少关注：`LSR_AFTER_SNAPSHOT`、`LMR_PER_DECISION`、verify starts、preflight probes、blind retry、polling、mutation fragmentation、formal-test-before-stage-freeze，以及 benchmark harness 是否污染用户墙钟。

## Performance targets

正常目标，不是跨仓库硬 SLA：
- known scope / ordinary：**1–3 min** user wall；
- known scope / large source：**2–4 min**；
- unknown cross-module：**3–5 min**；
- frozen repair：**+1–2 min**；
- genuinely complex architecture：**5–10 min**。

Routine work 超过 10 分钟默认视为吞吐回归，除非能机械归因到不可避免的 reasoning/runtime，而不是编排浪费。

## Failure families

### 1. Reality / owner miss

典型失败：有当前 UI/runtime authority 却先猜源码；追最后一个 timeout 而不是 first divergence；在错误 owner 修 downstream symptom；把旧截图/旧日志当当前现实。

### 2. Acquisition / context amplification

FROZEN 后无证据重读；已知 scope 先 probe 再 batch；全仓灌入而不是 minimum-sufficient；Repomix 未显式排除 dependency/generated/cache tree。

### 3. Mutation fragmentation

patch/unified diff、逐文件/逐 hunk、anchor hunting、Local transformer 决定源码变化、一个 Decision 多轮 mutation、把 file count 当 mutation unit。

### 4. Edge-test amplification — HIGH SEVERITY

实现尚未完成就反复 unit/typecheck/build/E2E；`test → patch → test → patch`；每个小文件都启动验证；用 Full Suite 当 debugger；真实 Acceptance 尚在跑就继续改产品。

正确路线：

```text
complete implementation stage
→ STAGE FREEZE
→ one verification stage
→ failure set
→ one Repair Stage
→ verify again
```

目标：`FORMAL_TEST_STARTS_BEFORE_STAGE_FREEZE = 0`。

### 5. Long-task / recovery waste — HIGH SEVERITY

启动 known-slow build/publish/deploy/install/full-suite 后持续 `read_process_output` / `ps` / health / Registry polling；Tool timeout 后启动第二份；终态未知先删 evidence；session 丢失后重复已经 PASS 的 verification。

正确顺序：`terminal authority → PID/session once → log once if dead`。Frozen runner 先读 durable receipt。目标：`KNOWN_SLOW_DETACHED_SAME_TURN_POLLS = 0`。

### 6. Release-as-debugger — HIGH SEVERITY

为了知道代码能否工作而 publish 临时版本、deploy 到生产、做 release commit；Stage Verify 或 required Acceptance 尚未完成就进入 delivery。

Release/publish/deploy 是最后阶段，不是调试 transport。

### 7. Transport / harness expansion

把 source/base64/tar/heredoc 塞进 shell；每轮重写 apply harness；runner ready 后才重新设计 payload/verify；因为工具连接问题造第二 broker/controller/profile。

### 8. Authority / mirror drift

用源码猜 Runtime；canonical text 更新但 execution-policy/validator/reference 仍表达旧模型；同一规则在多个 reference 演化成不同版本。

### 9. Throughput accounting distortion

用 Local mechanical time 冒充用户总墙钟；最终 PASS 掩盖无效 Tool calls；为了测时间新增 Tool call；把 setup/recovery 错误从墙钟中剔除。

### 10. Visual trial-and-error amplification

只看截图连续试 `padding/margin/top/left`，不量 geometry/cascade/primitive owner；同一可见 criterion 一次 repair 后仍继续 blind numeric tuning。

优先做法：第一次就收齐必要 screenshot/DOM/AX geometry/computed style/final owner；第二次修前必须先证明新的 first divergence。

## Throughput benchmark governance

Benchmark/replay 与业务实现、Skill evolution 是分离的循环：

```text
PREPARE_CASE → FREEZE_FIXTURE → CLEAN_REPLAY → CAPTURE_UI_WALL
→ ATTRIBUTE → SCORE → DECIDE_NEXT_ACTION
```

规则：
- case preparation、baseline restore、harness repair、dependency setup、hidden-oracle fairness 在 measured replay 之前完成；
- fixture/acceptance/authority/verification contract 在 replay 前冻结，不能在 measured Decision 中“顺手修 benchmark”；
- 一次 optimization hypothesis 只比较同一个 representative case；
- 独立评分 `RESULT_CORRECTNESS`、`PROCESS_CORRECTNESS`、`THROUGHPUT`；
- 没有真实 Chat UI wall 时，吞吐只能是 `PENDING_UI`，Local timing 不能冒充用户墙钟；
- setup/harness/recovery 错误仍计入用户等待，不能从成绩中扣掉；
- hidden oracle 可以隐藏历史实现，但不能引入 acceptance 中不存在的新 requirement；否则样本是 `HARNESS_HIDDEN_REQUIREMENT`，不能把 repair loop 归因给模型能力；
- 用户明确接受剩余 unattributed wall 后停止追查，直到它回归或阻塞目标。

## Skill evolution governance

每次协议迭代是一个因果实验：

```text
EVIDENCE → HYPOTHESIS → ONE_SKILL_DECISION → SELF_HOST
→ SAME_CASE_REPLAY → COMPARE → KEEP / REVERT / FREEZE
```

先分类 owner：`BENCHMARK_HARNESS | SHARED_SKILL | LOCAL_RUNTIME/TOOL | MODEL/CHAT_RUNTIME | PROJECT`。只有 `SHARED_SKILL` defect 才改本 Skill。

规则：
- 一次迭代只解决一个主 failure family / invariant，不因为 Skill 已打开就批量塞无关“优化”；
- harness 修复是独立 setup Decision；Shared Skill change 也必须独立 self-host；
- 新 replay 和立即前一个 valid same-case replay 比较 correctness、process、user wall、attributable wall、failure families；
- 单次噪声速度提升不能晋升规则；引入 process/harness regression 的改动不能算 throughput win；
- clean replay 已正确且剩余 wall 达标/被用户接受后，冻结 baseline；除非新 regression、新 safety/correctness invariant 或用户显式开始新一轮，不继续自我改写。

## 使用原则

新增事故优先归入既有 family。只有新的因果类型才新增类别；不要把每次事故永久扩成新的 HARD RULE。吞吐学习必须比它试图消除的浪费更便宜。
