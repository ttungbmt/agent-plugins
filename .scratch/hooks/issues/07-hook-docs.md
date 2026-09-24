---
title: "Tài liệu và thông báo cho Hook"
labels: [ready-for-agent]
blocked_by: [02, 03, 04, 05, 06]
---

# 07: Tài liệu và thông báo cho Hook

Spec: [../spec.md](../spec.md). ADR 0007. Thuật ngữ: CONTEXT.md mục Hook và Sở hữu. (mục Tài liệu).

**What to build:** Người dùng đọc `docs/design/ap-sync.md` là biết cách khai báo hook, giới hạn của nó và luật xác nhận; kết quả `ap sync` nhắc tới hook.

**Blocked by:** 02, 03, 04, 05, 06

**Status:** ready-for-agent

- [ ] Phần Hook trong `docs/design/ap-sync.md`: dạng `spec.hooks`, ghi đè và `false`, sở hữu và `modified-hook`, claim scope `user`, xác nhận hook từ xa và `--yes`, các cảnh báo.
- [ ] Nói rõ: Preset con chỉ ghi đè/bỏ được Hook có tên do `ap` quản lý, không chặn được hook từ Scope khác, plugin hay frontmatter; hook cần script thì đóng thành plugin.
- [ ] Câu "in sync" cuối lệnh nhắc tới hooks; README (nếu liệt kê các loại được sync) thêm hooks.
