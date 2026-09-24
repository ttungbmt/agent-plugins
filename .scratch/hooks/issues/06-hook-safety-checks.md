---
title: "Cảnh báo và kiểm tra an toàn cho Hook"
labels: [ready-for-agent]
blocked_by: [01]
---

# 06: Cảnh báo và kiểm tra an toàn cho Hook

Spec: [../spec.md](../spec.md). ADR 0007. Thuật ngữ: CONTEXT.md mục Hook và Sở hữu. (mục Cảnh báo). ADR 0006 (luật secret).

**What to build:** `ap` chặn secret viết thẳng vào hook và cảnh báo những trường hợp khiến hook không chạy hoặc chạy sai chỗ, để người dùng không phải tự tìm vì sao hook im lặng.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `headers` của handler `http` có giá trị trông như secret mà không phải `${…}` → lỗi cấu hình (dùng lại luật của MCP).
- [ ] `${VAR}` trong `headers` không có trong `allowedEnvVars` của handler → notice.
- [ ] Event nằm ngoài danh sách event đã biết → notice, vẫn ghi.
- [ ] Có ít nhất một Khai báo hook và `disableAllHooks: true` ở settings của bất kỳ Scope nào đọc được, hoặc `allowManagedHooksOnly` / `strictPluginOnlyCustomization` chứa `hooks` trong managed settings nếu đọc được → notice, vẫn ghi.
- [ ] Scope `user` mà handler chứa `${CLAUDE_PROJECT_DIR}`/`$CLAUDE_PROJECT_DIR`, hoặc `command` bắt đầu bằng `./`/`../` → notice.
- [ ] Test cho từng trường hợp (resolve cho lỗi secret, sync cho notice).
