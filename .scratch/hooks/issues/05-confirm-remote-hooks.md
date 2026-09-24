---
title: "Xác nhận Hook từ Preset từ xa"
labels: [ready-for-agent]
blocked_by: [03]
---

# 05: Xác nhận Hook từ Preset từ xa

Spec: [../spec.md](../spec.md). ADR 0007. Thuật ngữ: CONTEXT.md mục Hook và Sở hữu. (mục Xác nhận hook từ xa).

**What to build:** Khi một Preset từ xa thêm hoặc đổi nội dung một hook, `ap sync` hiện đầy đủ nhóm (tên, origin, JSON) và hỏi xác nhận trước mọi thao tác ghi; hook bị từ chối bị bỏ qua, phần còn lại vẫn sync. Trong CI, `--yes` chấp nhận trước; thiếu `--yes` khi không có TTY thì hook đó bị bỏ qua và lệnh exit 1.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Khai báo hook đã phân giải mang cờ "đến từ Preset từ xa", tính theo Preset định nghĩa bản thắng sau cùng.
- [ ] Hook cần duyệt = action `add`/`update` của hook từ xa có nội dung chưa có trong Lock/State. Nhận quản lý không cần duyệt; hook từ Config/Preset cục bộ/Preset mặc định không cần duyệt.
- [ ] `sync()` nhận tuỳ chọn `yes` và dependency hỏi xác nhận (nhận danh sách hook cần duyệt, trả về tập được chấp nhận). `yes` → chấp nhận hết; không `yes` và không dependency → từ chối hết.
- [ ] Hook bị từ chối → conflict `unconfirmed-hook`, `inSync` false, không ghi hook đó; các action khác vẫn áp dụng.
- [ ] Lần sync sau với nội dung không đổi (đã có trong Lock/State) không hỏi lại; đổi nội dung thì hỏi lại.
- [ ] `--dry-run`/`--check` không hỏi; hook cần duyệt hiện `planned` kèm notice.
- [ ] CLI thêm cờ `--yes`; khi là TTY truyền lời nhắc tương tác, chạy trước khi hiển thị tiến độ và trước mọi thao tác ghi.
- [ ] Test trong `sync-hooks.test.ts` với Preset từ xa giả (qua `fetch`): đồng ý, từ chối một phần, `yes`, không TTY, không hỏi lại, hỏi lại khi đổi, hook cục bộ không hỏi. `commands.test.ts`: `--yes` được truyền xuống nếu làm được không cần TTY thật.
