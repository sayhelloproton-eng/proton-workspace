# 12｜发布与 Registry：从源码绿灯到供应链真值

> 状态：`ACTIVE_RESEARCH / STRONG_EVIDENCE`
> 主题：ProFlow 如何把 npm Release 从“开发后的发布动作”升级成独立的 Artifact / Registry / Install / Runtime Truth 链。
> 边界：本文讨论的是工程发布与 Deployment Acceptance，不声称生产级供应链平台、组织级 DevSecOps 或大规模发布吞吐。

## 1. 最初的问题不是“怎么发 npm”，而是“源码绿了以后，用户拿到的到底是不是同一个东西”

在 Monorepo 内开发时，很多问题会被 Workspace 本地解析掩盖：

```text
Source 可编译
Tests PASS
Workspace package 可 import
```

并不能推出：

```text
真正 pack 出来的 tarball 内容正确
npm Registry 上的 package@version 正确
Fresh Workspace 安装到的 descriptor / adapter 正确
真实用户启动的 Runtime 正确
```

ProFlow 后来的发布治理，本质上是在拆开这些不同的 Reality。

## 2. 第一层拆分：Package Version 不等于 Contract Version

正式兼容性规范首先冻结了四种不同版本事实：

```text
Package Version
Contract Version
Schema Version
Runtime / Module Version
```

一个 npm package 可以升级实现而继续提供同一 Contract；反过来 Public Contract 发生 Breaking Change，也不能只靠 package bump 偷偷改变语义。

这一步很重要，因为它阻止发布系统把“发了新包”误写成“业务协议已经升级”。

当前 pre-1.0 还额外规定：23 个正式 package **不是 fixed version group**。

```text
有真实变化的 package
→ 独立 bump

没有变化的 package
→ 保持原版本
```

内部开发依赖继续使用 `workspace:^`，版本传播交给 pnpm；ProFlow 不再自研第二套 dependency propagation 算法。

## 3. 第二层拆分：源码能运行，不等于 Package Artifact 可消费

ProFlow 的 `publishability` 不是检查 `package.json` 有没有 `files` 字段，也不是只跑一次 `npm pack`。

它会：

```text
选中真实 package
→ pnpm pack
→ 把 tarball 放入临时目录
→ 创建隔离 consumer
→ npm install --ignore-scripts 安装这些 tarball
→ import 所有公开 JavaScript export
→ 执行所有发布 bin 的 --help smoke
```

也就是说，验证对象从源码目录切换成了**真正会被消费者安装的产物**。

这能抓到 Workspace 本地开发最容易掩盖的问题：

```text
exports 指错 dist
文件没被 pack
build artifact 过期
bin 指向不存在文件
发布后依赖无法解析
```

因此 `publishability PASS` 代表的是 Package Reality，而不是 Source Reality。

## 4. 真实事故：version 已经变了，但 dist 还是旧的

2026-08-30 的发布 Closeout 暴露了这条边界最典型的事故。

版本事实已经升级，但发布前没有重新构建对应 artifact，最终出现近似这种分叉：

```text
package.json.version                 = NEW
proflow.module.json.moduleVersion    = NEW
deployment source descriptor         = NEW
dist/deployment descriptor           = OLD
```

在源码工作区里，很多检查仍然可能看起来正常；真正从 Registry/Fresh install 加载已发布 descriptor 时，版本不一致才以 `DESCRIPTOR_INVALID` 暴露。

随后提交 `bafb4bb fix: rebuild artifacts before publish` 把 canonical release 改成：

```text
release:sync:check
→ build
→ publishability
→ publish
```

这次事故把一个隐含假设彻底推翻：**build artifact 不是源码的天然镜像，它自己是一层会 stale 的 Reality。**

## 5. 第三层拆分：Package Artifact 正确，也不等于 Registry Truth 已成立

发布以后还存在另一类不确定性：命令返回什么，不等于 Registry 最终已经是什么。

当前 `package-release.mjs` 对每个 release target 先做 exact query：

```text
npm view <package@version> version
```

只接受三种语义：

```text
PRESENT
MISSING
ERROR / UNKNOWN
```

只有明确 `MISSING` 的版本才进入 publish queue。

如果 Registry query 不是明确 404，而是 timeout、异常响应或其它错误，脚本直接：

```text
Registry exact query is UNKNOWN
→ refuse to publish
```

因为 npm version 是不可重复覆盖的外部事实，UNKNOWN 状态下盲目重发不是安全恢复。

## 6. Publish 命令失败，也不能直接判发布失败

当前 release 脚本对 `pnpm publish` 的处理延续了 Execution 领域相同的 UNKNOWN 思想。

如果 publish 命令 timeout / error / non-zero：

```text
先不重试
→ 对本轮 MISSING release set 再做 Registry exact readback
```

如果权威 Registry 已经存在所有目标版本：

```text
command = UNKNOWN / FAIL
Registry reality = APPLIED
→ 接受 Registry reality
```

只有 Registry 仍明确缺失目标，才保留失败。

这意味着发布恢复不是：

```text
命令报错 → 再 publish 一次
```

而是：

```text
命令结果不确定 → 查询外部 Authority → 再决定下一步
```

**No blind retry** 从业务 Effect 一直贯穿到了软件发布。

## 7. Release Set 也不由手工 package list 决定

2026-08-17 开始引入 pnpm native release management；后续又经历 package-scoped release 与 changeset/ledger 收敛。

当前正式流程是：

```text
change intent
→ pnpm release plan
→ workspace dependent propagation
→ version facts sync
→ affected package build / publishability
→ Registry exact preflight
→ publish only MISSING targets
→ exact readback
```

这里有两个重要取舍。

第一，**依赖传播交给 package manager**，不维护第二套“谁依赖谁所以该 bump 谁”的算法。

第二，ProFlow 只额外维护自己必须拥有的 package-owned version facts：

```text
package.json.version
= proflow.module.json.moduleVersion
= deployment/descriptor.ts.moduleVersion
= Browser manifest.version（存在时）
```

`release:sync:check` 发现它们漂移时直接 fail-closed。

## 8. 第四层拆分：Registry 有包，不等于 Product Workspace 真正装对了

安装阶段再次重新建立真值。

Platform CLI 不把 Registry search result 直接当成已安装模块，而是：

```text
Registry discovery
→ 选择 governed @tomflow/proflow-* package + exact version
→ 一个 package-manager transaction 写入并安装完整 managed set
→ --ignore-scripts
→ 从真实 node_modules 重新 discovery
→ resolve deployment/descriptor + deployment/adapter
→ 校验 package metadata
→ 校验 descriptor.moduleVersion 与 package.json.version
→ 再构造 Module graph / dispatch install
```

所以：

```text
Registry Truth
≠ Installed Truth
```

真实 node_modules 中缺 artifact、export map 错、descriptor load 失败、version mismatch，都必须在 Installed discovery 阶段重新暴露。

Workspace 还会检测 npm / pnpm / yarn lockfile 与 `packageManager` 声明冲突；无法唯一确认当前 package manager 时，不擅自修改用户 Workspace。

## 9. 第五层拆分：Installed Truth 仍然不等于 Runtime / Product Truth

最终 Deployment Freeze 明确禁止用以下路径作为产品验收 Authority：

```text
local tarball
npm link
workspace symlink
repo source override
```

原因不是这些工具不能用于开发调试，而是它们会绕过真正用户会经历的供应链。

最终证明必须从：

```text
global real npm platform-cli latest
→ Fresh Product Workspace
→ 真实 Registry 安装 23/23 modules
→ status fail-closed
→ setup
→ Browser / Dev Tunnel / Model / 3 Role GPT
→ start / status
→ repeat setup / repeat status
→ stop / cold restart / final status
```

2026-09-01 Final Freeze 才把这条链裁决为 `Deployment PASS / FROZEN`。

所以连“包已经正确安装”都不是最终结论；真实服务、外部资源、恢复与普通用户 Journey 还必须继续证明。

## 10. 最终形成的是五层 Truth Chain

整条发布 / 部署链可以压缩成：

```text
Source Truth
→ 当前源码、Spec、Test 是否一致

Package Truth
→ 真正 pack 出来的 artifact 是否可被隔离 consumer 消费

Registry Truth
→ exact package@version 是否真实存在于 npm Authority

Installed Truth
→ Fresh Workspace 实际 node_modules 是否安装了正确 descriptor / adapter / version / dependency graph

Runtime / Product Truth
→ 用户真实启动、外部资源、恢复与 Journey 是否成立
```

最重要的不变量是：

> **Upstream PASS cannot impersonate downstream reality.**

源码绿灯不能冒充 artifact；artifact 正确不能冒充 Registry；Registry 有包不能冒充 Fresh install；安装成功不能冒充 Runtime/Product success。

## 11. 为什么 real-npm-only 最后变成硬规则

项目中间曾大量使用 pack/tarball 做快速验证，这对于 Package Gate 本身是合理的；`publishability` 今天仍然会这么做。

但 Deployment Acceptance 最后明确禁止把它升级成用户 Reality 的替代品，因为本地 tarball 会跳过：

```text
Registry publication
exact version visibility
dist-tag / Registry readback
真实 package resolution
Fresh bootstrap 路径
```

所以必须区分两个使用场景：

```text
Tarball isolated consumer
= Package Truth 的验证工具

Real npm Fresh Workspace
= Deployment / Product Truth 的验收入口
```

同一个技术手段放在不同 Gate 中，证据含义完全不同。

这也是 ProFlow 测试体系反复强调的原则：**验证工具必须与它声称证明的 Reality 对齐。**

## 12. 发布凭据与 Git 也被拆成不同授权边界

正式发布治理还明确区分：

```text
npm publish authorization
≠ git push authorization
```

即使用户允许真实发包，也不能自动推出允许 push。

npm 侧使用 Granular Access Token，保留账号 WebAuthn / 2FA；只允许记录 token 名称和 policy，不读取、输出或提交 secret。发布时使用短生命周期环境变量与 `0600` 临时 npmrc，结束后清理。

这说明 Release Transaction 不只是版本脚本，还同时包含：

```text
source state
artifact state
registry state
credential boundary
authorization boundary
```

每一层都需要显式 owner，而不是为了自动化把权限揉成一个“发布机器人万能凭据”。

## 13. Trade-off：这套治理会显著增加 Release Ceremony

代价是真实的：版本意图、sync、build、isolated publishability、Registry exact preflight/readback、Fresh install 都需要时间；严格 UNKNOWN 还可能让发布停下来等待权威状态恢复。

但它换来的不是形式上的“流程完整”，而是能回答一个非常具体的问题：**用户当前运行的东西，能不能沿证据链追溯回这次源码变更？**

## 14. 对大型多包工程可复用的 Release 判断顺序

遇到发布问题时，不要从“publish 命令成功没”开始，而按层恢复 Authority：

```text
1. Source
   当前 checkout / version intent / tests 是否一致？

2. Artifact
   build 后真正 pack 的内容是否可被隔离 consumer 使用？

3. Registry
   exact package@version 当前到底 PRESENT / MISSING / UNKNOWN？

4. Installed
   Fresh Workspace 真正装到了什么？descriptor / adapter / dependency 是否一致？

5. Runtime
   普通用户公开入口、外部资源、recovery 是否真实成立？
```

某层 UNKNOWN 时先恢复该层真值，不靠上游结论猜下游现实。

如果只需证明 Package Truth，可以用 tarball；如果声称 Deployment 成功，就必须走真实分发入口。**Gate 决定证据，不是工具自己决定证据。**

## 15. Resume / Interview 边界

可以安全主张：

- 设计多 package 独立版本、Contract Version 与 Package Version 分离的发布治理；
- 建立 version facts sync、真实 pack + isolated consumer publishability、Registry exact preflight/readback；
- 通过真实 stale-dist / `DESCRIPTOR_INVALID` 事故，把 build artifact 纳入发布 transaction；
- 将 publish UNKNOWN 收敛为 Registry authority reconciliation，禁止 blind republish；
- 将真实 npm Fresh Workspace 设为 Deployment Acceptance，而不是用本地 tarball/link 冒充用户路径；
- 把 Source / Package / Registry / Installed / Runtime 五层 Truth 分开验收。

必须保持边界：

- npm、pnpm、Registry、Changesets 等第三方机制不是个人实现；
- 不声称生产级供应链、安全合规平台或组织级发布规模；
- Final Freeze 证明的是 ProFlow 当前个人项目的真实部署闭环，不代表生产 SLA；
- 当前 Real-3 仍未通过，Deployment PASS 不能越级推导整个产品 Final GO。

最适合总结这条经历的两句话是：

> **Source green is not artifact truth; artifact truth is not deployment truth.**

> **Upstream PASS cannot impersonate downstream reality.**
