---
title: Luật sở hữu theo `meta.name` — adopt (kể cả khác tên file), `manual-entry`, `modified-workflow`, trùng tên, symlink
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (mục Cài, liệt kê, gỡ). User story 11–17. ADR 0003, 0010.

## Việc cần làm
- `list` đọc `meta.name` của mọi `*.js` (file và symlink) ngay trong thư mục; `InstalledItem` thêm tên file thật (trường tuỳ chọn, Skill/Agent không dùng).
- So khớp theo `meta.name`:
  - cùng tên, cùng nội dung với Workflow cần cài → adopt (báo một lần); file khác tên giữ tên tới lần ghi tiếp theo;
  - cùng tên, khác nội dung → `manual-entry`; `--force` thay (gỡ file cũ, ghi `<name>.js`);
  - Managed workflow bị sửa tay → `modified-workflow` cả khi update lẫn khi gỡ; `--force` ghi đè/gỡ.
- File là symlink → Manual entry; `--force` chỉ gỡ link, không đụng đích.
- Hai Manual entry cùng `meta.name` → cảnh báo (không phải conflict).
- File không có `meta` hợp lệ và file có tên chưa khai báo → để nguyên, không báo.
- Thêm `modified-workflow` vào union conflict reason và report schema.

## Acceptance
- Test cho từng trường hợp trên, gồm: adopt `foo.js` (meta `review`) rồi bỏ khai báo → `foo.js` bị gỡ; đích symlink không bị sửa sau `--force`; cảnh báo trùng tên có đủ hai tên file.
