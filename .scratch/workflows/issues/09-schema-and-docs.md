---
title: Schema và tài liệu cho Workflow
labels: [ready-for-agent]
blocked_by: [03, 05, 07]
---

Spec: [../spec.md](../spec.md) (mục Schema, tài liệu). User story 26.

## Việc cần làm
- `preset.schema.json`, `config.schema.json`: thêm `workflows` (chuỗi hoặc `{ source, path?, workflows | exclude }`, `oneOf` cấm cả hai).
- `docs/design/ap-sync.md`: mục Workflow theo khuôn mục Agent — định danh `meta.name`, cài phẳng, conflict `missing-workflow`/`modified-workflow`/`plugin-workflow`, khoá `workflows`/`workflowSources`/`workflowClaims`, không ghi quyền.
- Preset `agent-plugins`: không đổi (xem spec).

## Acceptance
- Ví dụ trong spec validate được; ví dụ có cả `workflows` + `exclude` bị từ chối.
