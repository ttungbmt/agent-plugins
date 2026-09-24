---
title: Chọn và loại trừ Rule theo đường dẫn (`rules` / `exclude` / `path`)
labels: [done]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (mục Khai báo). User story 2–5, 23.

## Việc cần làm
- `spec.rules` nhận thêm map `{ source, path?, rules | exclude }` (chưa có `as`, để ticket 04). Không được có cả `rules` lẫn `exclude`; mỗi cái ≥ 1 mục.
- Mục chọn/loại trừ là đường dẫn không đuôi: trỏ file là một Rule, trỏ thư mục là tiền tố. Mở rộng tiền tố sau khi có Danh mục nguồn.
- Chọn đường dẫn không tồn tại → conflict `missing-rule`; loại trừ đường dẫn không tồn tại → chỉ thông báo.
- Gộp nhiều khai báo cùng nguồn trong một Config theo luật hiện có của Skill.

## Acceptance
- Test: chọn thư mục (`[common, web]`), chọn file lẻ (`[security]`, `[web/coding-style]`), `exclude`, `missing-rule`.
- `resolve.test.ts`: dạng hợp lệ, lỗi khi có cả `rules` và `exclude`, lỗi khi list rỗng, `path` tuyệt đối/ra ngoài nguồn bị từ chối.
- Thu hẹp lựa chọn → Rule không còn chọn bị gỡ.
