---
title: Đổi Namespace bằng `as`, chuyển nhà và `namespace-clash`
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (mục Namespace). User story 11–14. ADR 0009.

## Việc cần làm
- Khai báo map nhận `as`: một đoạn đường dẫn hợp lệ (`ITEM_NAME`, không `/`). `path` không ảnh hưởng Namespace.
- Đổi `as` → cài ở Namespace mới, gỡ Managed rule ở Namespace cũ.
- Hai nguồn đã gộp khác nhau cùng Namespace → cả hai gây conflict `namespace-clash` (gợi ý đặt `as`): không cài, không gỡ gì của chúng, giữ nguyên Managed rule.
- Thêm `namespace-clash` vào union conflict reason và report schema.

## Acceptance
- Test: `as` tuỳ chỉnh; đổi `as` (Namespace cũ biến mất, mới có đủ file); hai repo khác owner cùng tên → `namespace-clash` và Managed rule cũ còn nguyên; cùng repo khác `path` + `as` khác nhau cài song song.
- `resolve.test.ts`: `as` có `/` hoặc ký tự không hợp lệ bị từ chối.
