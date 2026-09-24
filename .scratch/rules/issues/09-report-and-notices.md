---
title: Báo cáo Rule — tiến trình listr, `--json`, số Rule luôn nạp, cảnh báo `applyTo`
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (mục Tìm Rule trong nguồn). User story 28, 29, 36, 37.

## Việc cần làm
- Chỉ đọc frontmatter (nội dung copy nguyên vẹn):
  - in "N rule luôn được nạp" cho mỗi nguồn = Rule được cài không có `paths`;
  - cảnh báo Rule có `applyTo` hoặc đuôi `.instructions.md` (định dạng Copilot, sẽ luôn được nạp).
- Tiến trình Rule trong listr như Skill/Agent.
- `--json`: action và conflict của Rule cùng khuôn Skill/Agent (`target: 'rule'`); cập nhật report schema.

## Acceptance
- Test: nguồn có 2 Rule không `paths` + 1 có `paths` → thông báo "2"; file `x.instructions.md` và file có `applyTo` → cảnh báo nhưng vẫn cài.
- Test snapshot `--json` có action `install` với `target: 'rule'`.
