---
title: `spec.workflows` trong Preset — kế thừa, gộp ngang hàng, `preset-clash`
labels: [done]
blocked_by: [03]
---

Spec: [../spec.md](../spec.md) (mục Khai báo). User story 25. ADR 0004.

## Việc cần làm
- Đọc `spec.workflows` trong Preset (vòng kind ở `resolve.ts`).
- Gộp theo luật Agent: Preset con / Config ghi đè hoặc thu hẹp; hai Preset ngang hàng khác lựa chọn trên cùng nguồn → hợp; khác `ref` → `preset-clash`.

## Acceptance
- `resolve.test.ts`: ghi đè bởi Preset con, thu hẹp bởi Config, hợp ngang hàng, `preset-clash` do `ref`.
- Một test `sync-workflows.test.ts` end-to-end với Preset cục bộ.
