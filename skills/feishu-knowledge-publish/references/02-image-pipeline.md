# Image Pipeline

图片机制完全属于 automation，正常模型不逐张管理 token。

## Pipeline

    local image preflight
    → fetch current target body
    → unique caption token reuse
    → upload only missing image
    → render token-backed temporary body
    → overwrite
    → readback verify

本地 Markdown 始终使用普通相对图片路径。历史 @path 输入可以兼容，但不是新文档推荐写法。

Automation 只在同一目标正文中按唯一 caption 回收现有 file token。caption 对应多个 token 时不猜；没有可复用 token 才上传。不要建立长期图片 token Registry，也不要把 token 反写 Git Markdown。

缺图使用 drive +upload 到调用者 Drive。禁止把 --wiki-token 用在正式知识图片上传，因为资源会变成 Wiki 导航 child。只有得到确定 file_token 后才允许 overwrite 正文。

图片 upload 没有得到确定 token 时返回 IMAGE_UPLOAD_UNKNOWN，sideEffectState=UNKNOWN，safeToRetry=false。模型不得直接重新 upload；只有真实 authority 能证明 NOT_APPLIED 时才允许新尝试。

写后 fetch 必须确认正文指纹仍在，并且每个本地图片 caption 已解析为远端图片资源。verify 命令统一汇总 images=PASS 或 BLOCKED。
