# 15｜S12 Settings UI 精修与吞吐复盘

> 本文只记录 ChatWeb 项目专有案例与现场事实。公共 ChatGPT Chat 工程/Acceptance 方法已经提升到共享 Skill，本文件不重复维护第二套自动化协议。

## 1. 本轮目标不是新增能力，而是把设置右栏真正收成产品

S12 Final Product Gate 通过后，设置右栏继续进行产品级精修。整体信息架构已经冻结：桌面端保持 `左侧会话列表｜中间聊天区｜右侧常驻设置栏`，右栏顺序固定为 `生成参数 → MCP → 模型与运行时`，不再恢复三个 Settings Tab，也不重新设计整体页面。

这轮的工作重点变成：参数状态辨识、控件形式、主题颜色、Tooltip/HoverCard、卡片 spacing、MCP 信息密度和运行时说明。部署仍暂停，未因为 UI 精修重新打开 Sites Production Gate。

## 2. 已经收敛的产品事实

生成参数只展示当前手机 MLX Hub 路径里真正需要的产品控制：
- `enable_thinking` 使用 Switch；Fast=off，Think=on；
- `temperature`、`top_p` 使用 Slider + 数字输入；
- `max_tokens` 保留输入，并用黄色 `!` 提示当前异常 finish_reason 行为；
- `stream` 不是用户配置，固定显示 `SSE · 固定开启`；
- 顶部按钮文案固定为 `恢复推荐值`，内部按当前 Think / 非 Think 恢复两套不同推荐参数。

当前推荐值：Think=`temperature 1.0 / top_p 0.95 / max_tokens 2048`；非 Think=`0.7 / 0.8 / 2048`。右栏主题统一使用偏 ChatGPT 的青绿色，warning 保留黄色，不做多色装饰。

MCP 区已经去掉独立“工具”大标题，直接显示 MCP provider；方法列表不平铺，保持二级展开。模型与运行时放在最后，显示 `MLX Hub · iPhone` 与当前 `mlx-community/Qwen3.5-4B-MLX-4bit`，不暴露 endpoint / credential / private runtime config。

## 3. Tooltip 反复漂移的根因不是“差几个像素”

早期参数帮助和标题帮助使用 React hover state + CSS absolute/fixed positioning 手写。为避免遮挡主聊天区，随后又叠加 `right/top/left` override，结果出现三个问题：

1. Tooltip 与 trigger 距离越来越远，视觉 anchor 不稳定；
2. 鼠标从图标移动到内容区时会穿过 gap，浮层提前消失；
3. 为不同位置分别写 magic offset，顶部生成参数、unsupported、runtime 三套规则逐渐分叉。

当前 Web package 已有 Radix Dialog / Slider / Tabs，但没有专门的 HoverCard dependency。后续 Tooltip 收口不应继续叠加 `left:-58px`、`top:24px` 一类补丁，而应统一为成熟 HoverCard/Tooltip primitive，让 primitive 自己负责 anchor、collision、pointer transition、focus 与 accessibility。

## 4. 用户连续三次指出的 padding，最后证明不是 padding 本身

这是本轮最典型的吞吐反例。源码里参数卡已经写成对称：

`padding: 13px 12px`

但真实页面肉眼仍然明显“上窄下宽”。前几轮继续改 padding，并没有解决。最后改用真实 Playwright geometry 量化，得到：

- `temperature / top_p / max_tokens`：visible top ≈14px，bottom ≈20px；
- `stream`：top ≈14.3px，bottom ≈20.8px；
- `enable_thinking`：top ≈17.5px，bottom ≈24.5px。

进一步读取 computed grid tracks 后发现：参数说明 `<small>` 虽然已经 `display:none`，但 `.generation-parameter` 仍继承原来的两行 Grid 和 `row-gap: 6px`。真实计算结果仍是类似 `25px 0px + 6px gap`，也就是隐藏第二行留下了一个“ghost row / ghost gap”。

因此真正 owner 是**布局 track**，不是 `padding` 数值。正确下一刀是让参数卡真正变成单行布局：隐藏说明不再参与 Grid，label / Switch / Slider / Input / SSE badge 在同一行垂直居中，然后再用 geometry 验证 `visualTop ≈ visualBottom`。

截至本记录落库时，这个根因已经机械定位，但产品源码的最终单行修复尚未落盘；不能把它写成已完成 PASS。

## 5. 为什么这件事拖了三轮

吞吐损失主要来自视觉问题使用了错误证据层：

`用户截图 → 猜 padding → 改 CSS → 再截图 → 仍不对`

而不是一开始就走：

`用户截图 → DOM bounds + computed style + final cascade owner → root cause → 一次修复 → geometry + screenshot verify`

同样，Hover 问题早期也把“交互 primitive 缺失”当成“位置数值不合适”处理，导致 anchor、pointer gap、collision 分别补丁化。两类问题本质相同：没有先找到真正 owner，就进入了 numeric trial-and-error。

## 6. 自动化现场也暴露了两个边界

第一，共享 Playwright controller 不保证目标 ChatWeb page 永远还在 controlled context。后段曾出现本地 `4300` HTTP 正常，但 Browser tool 只剩用户的 ChatGPT foreground page。此时不能为了验收直接导航/覆盖用户当前页；应把它裁决为 harness/control-context 缺口，而不是产品故障。

第二，本机截图文件存在、工具能够读取，只证明 `CAPTURED / INSPECTED`；此前用户在手机端看不到本机截图，说明这并不等于真正 `USER_DELIVERED`。后续不能再把本机路径或工具预览说成“截图已经发给用户”。

## 7. 本轮共享方法已经提升，但项目案例保持在这里

这轮公共层已经更新两类共享知识：

- Engineering：visual refinement ACQUIRE 需要 geometry / computed style / final cascade / reusable primitive；同一视觉 criterion 一次 repair 后仍失败，下一轮必须 root-cause measurement；
- Acceptance：精确 spacing/alignment 使用 geometry gate；hover/popover 要验证真实 pointer path；截图 capture / inspect / delivery 分开；用户 handoff/chat switch 前必须闭合已开始的 automation run。

这些是跨项目规则，属于共享 Skill。ChatWeb 特有的三栏设置布局、MLX Hub、Qwen 参数、具体 ghost grid row、当前文件和实际测量值，只保留在本工程实践文档。

## 8. 下一 Chat 的精确接手点

当前第一优先级只有一个：修复参数卡 ghost row / row-gap，使五张参数卡真实上下留白一致，并用 Playwright geometry 复验。

该项 PASS 后再做 HoverCard/Tooltip primitive 替换，并一次验证：trigger→gap→content 全路径保持可见、浮层紧贴 anchor、unsupported 浮层无内部滚动、viewport collision 正常。最后再做整栏视觉截图复核。

不要重新设计右栏，不要恢复“工具”大标题，不要重新做三个 Settings Tab，不要部署，也不要把尚未落盘的 padding 修复写成已完成。
