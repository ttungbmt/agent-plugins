---
title: Module đọc `meta` và phụ thuộc của một script workflow (acorn)
labels: [done]
blocked_by: []
---

Spec: [../spec.md](../spec.md) (mục Đọc `meta`). ADR 0010. Không phụ thuộc refactor, làm song song được.

## Việc cần làm
- Thêm `acorn` vào `packages/cli`. Kiểm tra bundle (`ap.tgz`, ADR 0008) vẫn không có dependency lúc chạy.
- `sync/workflow-meta.ts`, hàm thuần nhận `string`:
  - `workflowName(text)`: trả `meta.name` khi `export const meta = { … }` là object literal, không có spread, và `name` là chuỗi khớp `ITEM_NAME`; ngược lại trả `undefined`. Parse module (`ecmaVersion: 'latest'`, `sourceType: 'module'`, `allowAwaitOutsideFunction: true`); lỗi parse thì trả `undefined`.
  - `workflowRefs(text)`: `{ agentTypes: string[], workflows: string[] }` từ các literal `agentType: '<x>'` và `workflow('<x>', …)`. Bỏ qua giá trị tạo lúc chạy.
  - `isPluginBound(refs)`: có `agentType` chứa `:`.

## Acceptance (`workflow-meta.test.ts`)
- Nhận: file thường; file minify một dòng (`export const meta={name:"scan",…}`); comment block trước `meta`; `await` ở top-level trong thân script.
- Không nhận: `meta` có spread hoặc giá trị tính toán; `name` là biến hoặc template có biểu thức; `name` chứa `/` hoặc `:`; lỗi cú pháp; file không có `meta`.
- `workflowRefs` tìm được `agentType: 'ecc:code-reviewer'`, `agentType: "general-purpose"`, `workflow('content-guard', args)`; bỏ qua `agentType: table[lang]`.
