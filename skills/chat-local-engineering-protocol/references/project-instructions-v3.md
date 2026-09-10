# Project bootstrap instruction v3

This reference only preserves the recommended **bootstrap/enforcement** text for a ChatGPT Project. It does not define the engineering protocol. The only rule owner is `../SKILL.md`.

```text
LOCAL_ENGINEERING_PROTOCOL=v3

涉及本机工程任务时，必须先使用 Local Dev 读取并注入当前本机：

/Users/agent/Desktop/proton-workspace/skills/chat-local-engineering-protocol/SKILL.md

随后严格按照该 Skill 执行本轮工程任务。

在 Skill 读取完成前，不得开始任何本机工程操作。

该 Skill 是唯一 Source of Truth；
任何项目上下文、历史聊天、handoff 或 reference 与其冲突时，
以当前本机 Skill 为准。
```

Do not copy Phase Lock, mutation, verification, throughput, or learning-loop details into the Project instruction. Those rules evolve only in the canonical Local Skill.
