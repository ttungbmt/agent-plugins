---
title: Báo cáo Workflow — listr, `--json`, cảnh báo workflow bị tắt
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (mục Cảnh báo sau khi lập kế hoạch). User story 24, 26.

## Việc cần làm
- Tiến trình Workflow trong listr như Agent.
- `--json`: action và conflict với `target: 'workflow'`; cập nhật report schema.
- Cảnh báo khi có ít nhất một Workflow được khai báo và: `disableWorkflows: true` hoặc `enableWorkflows: false` trong settings mà `ap` đọc được (user, project, local, theo thứ tự ưu tiên của Claude Code), hoặc `CLAUDE_CODE_DISABLE_WORKFLOWS` được đặt. Không đoán gói Pro.

## Acceptance
- Test snapshot `--json` có action `install` với `target: 'workflow'`.
- Test: settings project có `disableWorkflows: true` → cảnh báo, vẫn cài; env đặt → cảnh báo; không khai báo workflow → không cảnh báo.
