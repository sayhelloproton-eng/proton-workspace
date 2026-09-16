# 08｜S7 Settings 与 Provider Runtime：把能力选择做成产品设置

状态：`S7 FINAL_ACCEPTED / implementation chatweb@62e862d82141f0ae43cfd1b6cb823604daedfdef / context closeout chatweb@203fb4e`

## 这一阶段真正解决什么

S3 已有 Model allowlist 与 Browser model selection，S5 已有 ContextProvider registry、`contextSelections`、required/optional 和 run freeze。S7 不再发明一套 Provider Runtime，而是把这些已经存在的能力接成用户真正能操作的 Settings 产品链。

S7 的问题不是“怎么让用户配置任意 Provider”，而是：Trusted Runtime 已经允许哪些能力，Browser 怎样安全发现、选择、记住，并在创建新 ChatRun 时提交最小公开 selection。

因此链路冻结为：

```text
Trusted Runtime private config
        ↓ public allowlist metadata
Browser Settings preference
        ↓ new-run selection
ChatRun frozen model/context facts
```

Browser 没有 endpoint、credential、timeout、budget 的配置权；这些仍然属于 Trusted Runtime。
## Public discovery 为什么必须极小

Model 继续通过 `/chat/models` 暴露 `providerId/modelId/displayName`。S7 只新增 `/chat/context-providers`，公开字段进一步收敛为 `providerId/displayName`。

Browser client 不宽松接收 Provider JSON，而是对字段做严格 allowlist：如果响应偷带 `endpoint`、`maxCharacters` 等未知字段，整条 public metadata response 直接判为 invalid。这样即使服务端未来内部 DTO 变大，也不会因为“顺手 JSON serialize”让私有配置穿透产品边界。

Browser preference 只保存：

```text
modelKey
contextSelections[]:
  providerId
  failurePolicy = required | optional
```

Context 默认不启用。用户显式启用后默认 `required`，因为“我选择了这项知识能力”不能被系统静默降级成普通 Chat；如果用户接受降级，再明确切成 `optional`。

多 Context 的顺序以当前 public discovery 顺序归一化，Registry 只做合法性与 server-owned budget lookup，不让 Browser preference 反向控制运行时资源策略。
## Retry 为什么不能读取当前 Settings

Settings 是“下一次新 run 的偏好”，不是修改历史 run 的工具。用户在一个 failed run 之后把 Context 从 required 改成 optional，点击 Retry 时 Browser 仍只提交旧 `runId`，不把当前 model/context 设置塞进 retry request。

真正的 Retry 语义仍由 Trusted Runtime 决定：旧 run 已冻结的 model/context selections 是事实，新 retry run 继承这些 selection，并重新执行 Context resolution。这样 UI 设置变化不会悄悄改写失败 attempt 的重试条件。

## Final Review 抓到的生命周期问题

最初实现中，Context discovery 503 或非法 metadata 会进入降级路径：当前页 Context Provider 列表变成空数组。问题在于后续 persistence effect 又把 reconcile 后的空 `contextSelections` 写回 localStorage，于是一次暂时 outage 永久擦除了用户 preference。

这里必须区分两个事实：

```text
discovery success + [] = 权威告诉我当前没有 provider
discovery failure      = 我现在不知道 allowlist 是什么
```

前者可以清理过期 Context preference；后者只能让当前页 Context fail-closed，不能把 unknown/unavailable 解释成 provider 已删除。第一刀曾简单禁止 outage 时全部 preference 写回，但真实 Browser 又证明这样会让普通 Chat 的 Model selection 无法持久化。最终按 ownership 拆开：outage 时 Model preference 继续保存；last-known Context selection 只通过安全 parser 提取 `providerId/failurePolicy`，不会保留 endpoint/key/budget；只有 discovery 成功返回的权威 allowlist（包括空列表）才能 reconcile/清理 Context preference。
## 真实验证说明了什么

当前 ChatWeb working tree 的 `pnpm test:s7` 为 API 26/26 + Web 11/11 = **37/37 PASS**；API production build、Next production build、TypeScript 与 3/3 static pages 全 PASS。

production `out/` + 真实 Chrome 已验证：zero-context request 不带 selection；启用 Context 默认 required；切 optional 后 request 正确；刷新恢复 model/context/policy；stale preference 按当前 allowlist sanitize；discovery 503 时普通 Chat 仍可用；夹带 private field 的 public metadata 被整包拒绝；localStorage 无 secret-like field；Retry body 为空且不吃当前新设置。

Final Review 最终组合回归进一步验证 preference lifecycle：预存带伪 private fields 的 `ctx/optional`，Context discovery 503 时从 Model 1 切到 Model 2，Model 2 正常持久化，同时 last-known `ctx/optional` 仍保留；storage 中 `endpoint/apiKey/maxCharacters` 被清洗。reload 后仍是 Model 2；恢复 discovery 后 Model 2 + Context optional 一并恢复。最终 Browser Console 0 error/0 warning。

source-only Architecture/Security Gate 只扫描真实 source roots，不把 `.next/out/dist/node_modules` 当源码；Web env allowlist、private Provider config、跨仓 RAG internal import、shared DTO ownership、unsafe HTML、settings private fields、generated output hygiene、`out/index.html`、`git diff --check` 全 PASS，`FINAL_STATIC_GATE_FAIL=0`。

## 工程方法上的收获

S7 最重要的不是 Settings UI，而是把“能力发现、用户偏好、运行事实”分成三层。UI preference 可以变化，Trusted Runtime allowlist 可以变化，但已经开始的 ChatRun 必须保持冻结；暂时无法发现 capability 也不能伪装成权威删除。

另一个经验是 Gate 本身也要有边界：这轮静态审计曾因 Bash 引号、Python regex 和误扫 `.next` 产生 harness failure/false positive。正确做法不是改产品迎合错误 Gate，而是恢复 source scope，再用真实 runtime/Browser 证据交叉确认。

## 可以用于面试的核心表达

“我把 Provider Settings 设计成 capability selection，而不是 secret admin。Browser 只能发现 allowlisted identity/display metadata，并只保存 model key、providerId 和 required/optional；endpoint、credential、timeout、budget 全在 Trusted Runtime。Final Review 连续发现两层状态语义 bug：Context discovery 临时 503 先被错误当成空 allowlist，导致 Context 偏好被擦除；第一刀保护 Context 后又误伤 Model preference 持久化。最终按能力 ownership 拆开：Context outage 只让 Context 当前页 fail-closed，Model 仍可保存；last-known Context 只保留安全 selection 字段，恢复后两者一起复原。”

当前状态：S7 已 Final Accepted。implementation=`chatweb@62e862d82141f0ae43cfd1b6cb823604daedfdef`；ChatWeb closeout/current context baseline=`chatweb@203fb4e`。执行门已进入 S8 Tool / MCP 扩展边界。