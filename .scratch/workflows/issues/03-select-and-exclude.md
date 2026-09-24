---
title: Chọn và loại trừ Workflow theo `meta.name` (`workflows` / `exclude` / `path`)
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (mục Khai báo). User story 2–4, 18.

## Việc cần làm
- `spec.workflows` nhận thêm map `{ source, path?, workflows | exclude }`. Không được có cả hai; mỗi list ít nhất một mục; mục là `meta.name`.
- Chọn tên không có trong Danh mục nguồn → conflict `missing-workflow`; loại trừ tên không có → chỉ thông báo.
- Gộp nhiều khai báo cùng nguồn trong một Config theo luật hiện có của Agent.
- Thêm `missing-workflow` vào union conflict reason và report schema.

## Acceptance
- Test: chọn theo `meta.name` khác tên file; `exclude`; `missing-workflow`; thu hẹp lựa chọn → Workflow không còn chọn bị gỡ.
- `resolve.test.ts`: dạng hợp lệ; lỗi khi có cả `workflows` và `exclude`; lỗi khi list rỗng; `path` tuyệt đối/ra ngoài nguồn bị từ chối.
