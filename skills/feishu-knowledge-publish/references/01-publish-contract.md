# Feishu Publish Contract

## Source of truth

这个 Skill 不复制一套固定 CLI API。每次真实发布以当前环境中的官方 `lark-cli` 为准：

```text
lark-cli --version
lark-cli <domain> <command> --help
lark-cli skills read lark-doc/...
lark-cli skills read lark-drive/...
```

版本号只用于诊断，不是永久契约。

本地正式知识 Markdown 是正文真源。通常使用 workspace `docs/知识库/` 作为 `--source-root`；其它学习、研究、项目和临时材料只有在被提炼进正式知识树后才进入发布面。

## 当前已验证命令面

当前本机 `lark-cli 1.0.95` 已验证存在：

```text
wiki +node-get
wiki +node-list
wiki +node-create
docs +fetch
docs +update
drive +upload
```

知识库投影不再依赖旧 `lark_read.mjs`、`lark_write.mjs`、Registry 或 Stable ID。

## 节点身份

发布时只需要区分三件事：

- Wiki space；
- parent node；
- 当前节点 token / obj token。

`wiki +node-list` 用于列出某个 space 或 parent 下的直接子节点；需要完整分页时显式使用 `--page-all`。`wiki +node-get` 用于确认一个 node / object token 的真实节点信息。

本地相对路径是人的稳定定位方式，远端 token 是本次执行的运行时事实。不要把 token 反写成本地 Markdown 当长期身份系统。

## Directory-as-document projection

飞书 Wiki 的一个节点可以同时有正文和子节点，本地文件系统目录本身却不能承载正文。因此正式投影采用“目录 + README.md”表示一个知识节点：

```text
source-root/
├── README.md
└── 项目实践/
    ├── README.md
    └── ProFlow/
        ├── README.md
        └── 调度与失败恢复.md
```

投影为：

```text
<root Wiki node>                   ← source-root/README.md
└── 项目实践                       ← 项目实践/README.md
    └── ProFlow                    ← ProFlow/README.md
        └── 调度与失败恢复          ← 调度与失败恢复.md
```

规则：

- **Directory = Wiki Node**：目录名决定节点层级和默认标题；
- **Directory/README.md = Wiki Node Body**：README 不创建额外子节点，而是覆盖对应目录节点正文；
- **ordinary Markdown = Child Wiki Node**：普通 `xxx.md` 创建 / 复用同级 `xxx` 子节点，并覆盖其正文；
- **root README requires root node**：发布 `source-root/README.md` 时必须显式提供 `--root-node-token`；缺失时 fail closed，绝不创建 `README` 页面；
- 目录没有 README 也可以作为纯导航节点存在，只要其下有需要发布的后代节点；
- README 只是本地适配文件名，不是知识标题，也不出现在远端导航树中。

这不是额外 Registry，也不是第二套映射表；节点关系直接从本地知识树和本轮远端导航事实推导。

## 正文覆盖

已有或刚创建的 docx 节点统一使用：

```bash
lark-cli docs +update \
  --doc <obj-or-node-token> \
  --command overwrite \
  --doc-format markdown \
  --content @./publish.md
```

多行正文优先 `@file`，避免 shell 转义破坏。`@file` 必须使用当前 cwd 下的安全相对路径。

目录 README 与普通文章进入正文覆盖阶段后没有区别：最终都 overwrite 已解析出的目标 Wiki 节点。图片资源必须先上传到调用者 Drive，再由临时发布正文引用返回的 `file_token`；不要用 `--wiki-token` 把图片挂到知识节点下面，否则图片文件会进入 Wiki 导航树。

## 不读旧正文

发布语义是：

```text
local body = desired state
remote body = replaceable projection
```

所以 overwrite 前不 `docs +fetch` 旧正文，不做 Markdown diff，不做模型语义 merge，也不逐块更新。

节点树读取不属于“旧正文比较”，可以且应该在批量开始时完成。

## 写后最小验证

写后允许轻量 `docs +fetch` 或节点查询确认：

- 节点仍在预期父路径；
- README 没有被错误发布成名为 `README` 的远端子节点；
- 图片资源没有成为 Wiki 导航子节点；
- 文档出现预期标题 / 首段等基本指纹；
- CLI 没有资源 warning / partial failure；
- 图片文章的 token-backed 图片没有失败。

验证 side effect 即可，不需要重新把远端全文与本地逐字比较。

## External write boundary

Help、内置 Skill、`--dry-run`、`plan` 和只读节点查询可以用于 Skill 自测。真正的 `node-create`、`drive +upload`、`docs +update` 都是外部写；必须由当前任务授权覆盖，不能因为“在开发发布 Skill”就自动获得写权限。
