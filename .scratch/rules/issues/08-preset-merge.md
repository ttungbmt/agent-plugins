---
title: `spec.rules` trong Preset — kế thừa, gộp ngang hàng, `preset-clash`
labels: [ready-for-agent]
blocked_by: [03, 04]
---

Spec: [../spec.md](../spec.md) (mục Khai báo, đoạn gộp). User story 32–33. ADR 0004.

## Việc cần làm
- Đọc `spec.rules` trong Preset (vòng kind ở `resolve.ts`).
- Gộp theo luật Skill: Preset con / Config ghi đè hoặc thu hẹp; hai Preset ngang hàng khác lựa chọn trên cùng nguồn → hợp (tập chọn/loại trừ gộp trên đường dẫn).
- Khác `ref` hoặc khác `as` giữa hai Preset ngang hàng → `preset-clash`; Preset con / Config đổi `as` thì thay luôn.

## Acceptance
- `resolve.test.ts`: ghi đè bởi Preset con, thu hẹp bởi Config, hợp ngang hàng, `preset-clash` do `ref` và do `as`.
- Một test `sync-rules.test.ts` end-to-end với Preset cục bộ.
