---
title: "Sở hữu: nhận quản lý, Hook bị sửa tay hoặc xoá tay"
labels: [ready-for-agent]
blocked_by: [01]
---

# 02: Sở hữu: nhận quản lý, Hook bị sửa tay hoặc xoá tay

Spec: [../spec.md](../spec.md). ADR 0007. Thuật ngữ: CONTEXT.md mục Hook và Sở hữu. (mục Luật lập kế hoạch). ADR 0003.

**What to build:** `ap` cư xử đúng khi người dùng đã tự đụng vào settings: Hook viết tay giống hệt khai báo được nhận quản lý thay vì ghi trùng; nhóm do `ap` quản lý bị sửa tay thì báo xung đột thay vì ghi đè âm thầm; bị xoá tay thì được thêm lại.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Manual nhóm khớp đúng một Khai báo hook (sau chuẩn hoá) → nhận quản lý: ghi vào Lock/State, không sửa settings, báo một lần.
- [ ] Manual có field thừa so với khai báo → để nguyên; `ap` thêm nhóm của mình.
- [ ] Managed hook không còn khớp nhóm nào, và event đó có một nhóm Manual cùng matcher → conflict `modified-hook`, không ghi; `--force` thay nhóm Manual đó bằng khai báo.
- [ ] Managed hook không còn khớp nhóm nào và không có nhóm cùng matcher → `add` lại.
- [ ] `Conflict.reason` có `modified-hook`; mô tả cờ `--force` nhắc tới hook.
- [ ] Test trong `sync-hooks.test.ts` cho từng trường hợp.
