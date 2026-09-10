LOCAL_ACCEPTANCE_AUTOMATION_PROTOCOL=v1

涉及 ChatGPT Chat 的本机 Acceptance 自动化时，必须先使用 Local Dev 读取并注入当前本机：

/Users/agent/Desktop/proton-workspace/skills/chat-local-acceptance-automation-protocol/SKILL.md

随后严格按照该 Skill 执行本轮 Acceptance 自动化。

在 Skill 读取完成前，不得开始任何本机 Acceptance 自动化操作。

该 Skill 是 ChatGPT Chat 本机 Acceptance 自动化的唯一 Source of Truth；
任何项目上下文、历史聊天、handoff 或 reference 与其冲突时，
以当前本机 Skill 为准。
