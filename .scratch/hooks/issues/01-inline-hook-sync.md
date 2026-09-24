---
title: "Tracer: Khai báo hook inline trong Config được sync vào settings"
labels: [ready-for-agent]
blocked_by: []
---

# 01: Tracer: Khai báo hook inline trong Config được sync vào settings

Spec: [../spec.md](../spec.md). ADR 0007. Thuật ngữ: CONTEXT.md mục Hook và Sở hữu. (mục Đọc khai báo, Chuẩn hoá, Luật lập kế hoạch, Ghi settings, Lock/State, Báo cáo)

**What to build:** Người dùng viết `spec.hooks` trong `agent-plugins.yaml` (map theo tên → `{ event, matcher?, hooks: [handler…] }`), chạy `ap sync` và thấy mỗi Khai báo hook thành một nhóm matcher riêng trong khoá `hooks` của `settings.json` ở Scope đích (`project`, `local` hoặc `user`), không gọi `claude`. Sửa khai báo thì nhóm được thay tại chỗ; bỏ khai báo thì nhóm bị gỡ. Chỉ Config, chưa có Preset; chưa có nhận quản lý, claim hay xác nhận.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Đọc `spec.hooks` của Config: phải là map; giá trị là `false` hoặc object có `event` (chuỗi), `matcher` (chuỗi, tuỳ chọn), `hooks` (mảng ≥ 1). `true` → lỗi cấu hình nhắc chưa có danh mục hook; khoá lạ ở cấp nhóm → lỗi.
- [ ] Handler cần `type` thuộc `command | http | mcp_tool | prompt | agent` và field bắt buộc của type (theo research §1); mọi field khác giữ nguyên văn khi ghi.
- [ ] So sánh nhóm theo giá trị sâu, không theo thứ tự khoá; `matcher` rỗng, `"*"` hoặc vắng mặt là một. Ghi ra đúng như người dùng viết.
- [ ] Thêm nhóm vào cuối mảng của event; update thay đúng vị trí; remove gỡ nhóm và xoá mảng event rỗng, xoá `hooks` rỗng.
- [ ] Mọi khoá khác trong settings và mọi Hook của người dùng (kể cả cùng event, cùng matcher) giữ nguyên.
- [ ] Mọi action hook của một Scope gộp thành một lần ghi file, rồi mới ghi Lock/State (`hooks`: tên, nhóm đã chuẩn hoá, origin).
- [ ] `SyncAction.target` có `'hook'`, `name` là tên Khai báo hook; tiến độ hiện như các loại khác.
- [ ] `--dry-run`/`--check` không ghi file; `--check` exit 1 khi còn action hook.
- [ ] Test mới `sync-hooks.test.ts` theo mẫu `sync-mcp.test.ts` phủ các ý trên ở cả ba Scope; test parse trong `resolve.test.ts`. Test sync hiện có qua nguyên vẹn.
