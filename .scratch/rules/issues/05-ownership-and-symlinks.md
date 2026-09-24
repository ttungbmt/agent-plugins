---
title: Luật sở hữu cho Rule — adopt, `manual-entry`, `modified-rule`, symlink
labels: [done]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (mục Cài, liệt kê, gỡ). User story 15–22. ADR 0003, 0009.

## Việc cần làm
- Theo đúng đường của Agent, theo từng file trong Namespace:
  - file có sẵn trùng đường dẫn + trùng nội dung → adopt (báo một lần);
  - trùng đường dẫn khác nội dung → `manual-entry`, `--force` thay;
  - Managed rule bị sửa tay → `modified-rule` cả khi update lẫn khi gỡ, `--force` ghi đè/gỡ.
- File người dùng tự thêm trong Namespace, không trùng Rule nào → để nguyên, không báo.
- Thư mục Namespace là symlink → `manual-entry` cho mọi Rule cần cài vào đó, không ghi xuyên qua; `--force` chỉ gỡ link rồi cài thư mục thật (đích của link còn nguyên).
- File Rule là symlink trong Namespace thật → Manual entry.
- Thêm `modified-rule` vào union conflict reason và report schema.

## Acceptance
- Test cho từng trường hợp trên, gồm kiểm tra đích symlink không bị sửa sau `--force`.
- Gỡ Rule không xoá file người dùng trong cùng thư mục cha.
