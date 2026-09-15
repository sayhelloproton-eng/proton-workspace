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

## Local preflight

覆盖正文之前先解析文章里的全部本地图片引用，并确认：

- 文件真实存在；
- 文件属于 workspace 可发布静态资源，通常来自 `assets/知识库/`；
- 不是 Base64 Data URI、临时缓存或一次性测试输出；
- 格式和大小满足当前 CLI/飞书限制；
- 同一图片路径在本轮内只上传一次。

任何一项失败，当前文档停止。

## Why the native local-image shortcut is not canonical here

当前 CLI 支持 Markdown：

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

这个实现适合一般写文档，但不满足用户要求的“图片上传成功以后再覆盖知识库正文”。因此正式知识库发布不走这个顺序。

## Pre-upload path

目标节点解析或创建后，先执行：

```bash
lark-cli drive +upload \
  --file ./image.png \
  --wiki-token <target-wiki-node-token>
```

保存返回的 `file_token` 作为**本轮临时发布数据**，不要写回 Git Markdown，也不要建立长期 Registry。

然后生成临时 `publish.md`，把本地图片语法替换为 token-backed DocxXML 图片标签。Markdown 模式会解析这些 XML 标签：

```xml
<img src="FILE_TOKEN" caption="alt text"/>
```

只有全部图片都有成功 token 后才允许执行正文 overwrite。

## Current verification level

当前本机已通过 `--dry-run` 验证两个命令面的形状：

- `drive +upload --wiki-token` 会先得到 Drive `file_token`；
- `docs +update` 接受 `<img src="TOKEN"/>` 而不会再生成本地图片上传步骤。

第一次获得真实外部发布授权时，仍应在一个可删除/可恢复的小型测试文章上确认“Drive file_token → img src copy”的服务端兼容性；若真实服务拒绝 token，fail closed 并更新本 Skill，不回退到先覆盖缺图正文。

## Repeated publishes

本 Skill 不为了图片建立永久 token 表。后续如果真实发布证明重复上传造成明显成本，再把“资源复用/清理”作为独立工程问题解决；不要在尚无证据时重新造旧式 Asset Registry。
