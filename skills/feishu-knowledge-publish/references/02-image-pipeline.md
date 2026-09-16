# Image Pipeline

## Hard order

知识库文章引用本地图片时，正式发布顺序是：

```text
local image preflight
→ remote image pre-upload
→ collect token
→ render temporary token-backed body
→ whole-document overwrite
→ verify
```

正文不能先以“图片以后补”的状态覆盖到公开知识库。

## Local Markdown first

本地 Markdown 是正文真源，也必须能被普通 Markdown 阅读器直接预览。知识库正文引用本地图片时，canonical 写法使用标准 Markdown 相对路径：

```markdown
![alt](../../assets/知识库/example.png)
```

发布器负责把标准本地图片引用解析为发布资源；正文不应为了适配飞书 CLI 而使用会破坏本地预览的专有语法。历史 `![alt](@path)` 只作为兼容输入继续识别，不再作为新文档推荐写法。

## Local preflight

覆盖正文之前先解析文章里的全部本地图片引用，并确认：

- 文件真实存在；
- 文件属于 workspace 可发布静态资源，通常来自 `assets/知识库/`；
- 不是 Base64 Data URI、临时缓存或一次性测试输出；
- 格式和大小满足当前 CLI/飞书限制；
- 同一图片路径在本轮内只上传一次。

任何一项失败，当前文档停止。

HTTP(S)、Data URI 等非本地图片不是本地 pre-upload 对象；发布器不得把它们误判成本机文件路径。

## Why the native local-image shortcut is not canonical here

当前 CLI 支持一种带 `@` 的本地图片输入形式：

```markdown
![alt](@./images/photo.png)
```

但是对 `docs +update --command overwrite --doc-format markdown` 的真实 dry-run 显示调用顺序为：

```text
1. update document with image placeholder
2. upload local image
3. bind uploaded token to placeholder block
4. conditional cleanup on failure
```

这个实现适合一般写文档，但不满足用户要求的“图片上传成功以后再覆盖知识库正文”，而且 `@path` 不是普通 Markdown 阅读器可直接解析的图片路径。因此正式知识库正文保持标准 Markdown，发布阶段由 automation 先解析、预上传，再替换为 token-backed body。

## Pre-upload path

目标节点解析或创建后，图片先上传到调用者 Drive，而不是挂到 Wiki 节点下面：

```bash
lark-cli drive +upload \
  --file ./image.png
```

当前 `lark-cli` 在省略 `--folder-token` 与 `--wiki-token` 时会上传到调用者 Drive 根目录。真实发布已经确认：如果使用 `--wiki-token <target-wiki-node-token>`，上传的图片会成为该 Wiki 节点的 `file` 子节点，从而污染知识库导航树，因此正式知识发布禁止这种用法。

保存返回的 `file_token` 作为**本轮临时发布数据**，不要写回 Git Markdown，也不要建立长期 Registry。然后生成临时 `publish.md`，把本地图片语法替换为 token-backed DocxXML 图片标签：

```xml
<img src="FILE_TOKEN" caption="alt text"/>
```

只有全部图片都有成功 token 后才允许执行正文 overwrite。

## Verification

当前本机已确认：

- `drive +upload` 省略 `--folder-token` / `--wiki-token` 时上传到调用者 Drive 根目录；
- `drive +upload --wiki-token ...` 会把资源创建成 Wiki `file` 子节点，不能用于正式知识图片；
- `docs +update` 接受 `<img src="TOKEN"/>` 形式的 token-backed 图片正文。

正式发布后还必须从远端确认两件事：正文中的图片已经解析为飞书资源，且目标知识节点下面没有因为图片上传产生额外 Wiki 子节点。

## Repeated publishes

本 Skill 不为了图片建立永久 token 表。后续如果真实发布证明重复上传造成明显成本，再把“资源复用/清理”作为独立工程问题解决；不要在尚无证据时重新造旧式 Asset Registry。
