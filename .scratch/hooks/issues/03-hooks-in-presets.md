---
title: "Hook trong Preset: kế thừa, ghi đè, false và schema"
labels: [ready-for-agent]
blocked_by: [01]
---

# 03: Hook trong Preset: kế thừa, ghi đè, false và schema

Spec: [../spec.md](../spec.md). ADR 0007. Thuật ngữ: CONTEXT.md mục Hook và Sở hữu. (mục Gộp, Schema). ADR 0004.

**What to build:** Tác giả Preset khai báo được `spec.hooks`; Preset con ghi đè hook cùng tên của Preset cha hoặc bỏ nó bằng `false`; Config thắng mọi Preset; Preset ngang hàng mâu thuẫn thì xung đột. Editor gợi ý và kiểm tra `hooks` qua JSON schema.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Đọc `spec.hooks` của Preset (mặc định, cục bộ, từ xa) như Config.
- [ ] Gộp cùng luật MCP server: con thắng cha theo cả khối, Config thắng mọi Preset, ghi đè khác nội dung có notice, `false` xoá tên sau khi gộp.
- [ ] Hai Preset ngang hàng cùng tên khác nội dung → `preset-clash`; Managed hook của tên đó giữ nguyên.
- [ ] `preset.schema.json` và `config.schema.json` thêm `hooks`: map tên → `false` hoặc nhóm; handler `additionalProperties: true`; `event` là chuỗi có gợi ý các event đã biết, không enum đóng; `true` không hợp lệ. Gộp cẩn thận với thay đổi chưa commit trong `preset.schema.json`.
- [ ] Test gộp trong `resolve.test.ts`; test sync một hook kế thừa, ghi đè, `false`, `preset-clash` trong `sync-hooks.test.ts`.
