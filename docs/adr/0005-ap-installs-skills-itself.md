# `ap` tự cài Skill, không giao cho `npx skills`

CLI `claude` không có lệnh nào quản lý Skill, nên ngoại lệ với [ADR 0001](0001-delegate-settings-writes-to-claude-cli.md) là bắt buộc. `ap` tự tải Skill source ở ref cần cài và **copy** từng thư mục Skill vào `.claude/skills/<name>` (scope `project`) hoặc `~/.claude/skills/<name>` (scope `user`); Lock/State của `ap` là nguồn sự thật duy nhất về việc Installed skill nào là Managed.

## Considered Options

- Giao cho `npx skills add … -a claude-code` (vercel-labs/skills) — bị loại: CLI đó tự ghi `skills-lock.json` / `~/.agents/.skill-lock.json`, tạo hai nguồn sự thật chồng nhau với Lock/State; bản gốc nằm ở `.agents/skills/` kèm symlink; `remove` không có output `--json`; thêm phụ thuộc npm registry lúc sync.
- Symlink từ một thư mục gốc chung — bị loại: copy thật giữ cho `.claude/skills/` tự đứng được (commit được, đồng đội clone là có) và việc so nội dung bằng hash đơn giản.

## Consequences

- Thư mục là symlink (vd. do `npx skills` tạo) luôn được coi là Manual entry.
- `ap` phải tự lo tải nguồn (git/tarball), tìm `SKILL.md` và so hash nội dung.
- Agent (subagent đứng riêng) theo cùng quyết định: `ap` tự tải Agent source và copy từng file vào `.claude/agents/<name>.md` hoặc `~/.claude/agents/<name>.md`.
- Rule cũng vậy: plugin không ship được rules, và symlink càng không dùng được, vì Claude Code chỉ nạp project rule symlink ra ngoài repo khi rule không có `paths`. Cách cài vào Namespace: [ADR 0009](0009-rule-per-file-in-namespace.md).
- Workflow (file `.js` rời) cũng vậy, dù plugin ship được workflow: `ap` chỉ lấp chỗ trống cho nguồn không đóng gói thành plugin. Cách cài phẳng theo `meta.name`: [ADR 0010](0010-workflow-flat-install-by-meta-name.md).
