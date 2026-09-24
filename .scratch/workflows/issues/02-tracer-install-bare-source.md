---
title: Tracer bullet — cài Nguồn workflow dạng chuỗi trần thành `<meta.name>.js`
labels: [done]
blocked_by: [01, rules/01]
---

Spec: [../spec.md](../spec.md) (mục Loại item `workflow`, Tìm Workflow trong nguồn, Cài/liệt kê/gỡ). ADR 0010. Cần [rules/01](../../rules/issues/01-refactor-item-kind-map.md) (map theo `ItemKind`) đã xong.

## Việc cần làm
- `ItemKind` thêm `'workflow'`; `ItemHandler` mới `sync/workflows.ts` dùng module của ticket 01.
- `spec.workflows` trong Config chỉ nhận **chuỗi** (dạng map để ticket 03).
- `find`: gốc `path` hoặc `workflows/`; thiếu cả hai thì lỗi nguồn gợi ý `path`. Chỉ `*.js` ngay trong gốc; bỏ `*.test.*`, `_*`, file không có `meta` hợp lệ. Trùng `meta.name` trong một nguồn thì lỗi nguồn. Không dò `.claude/workflows/`.
- `dir()`: `<cwd>/.claude/workflows` (project), `<claude config dir>/workflows` (user), `null` (local → bỏ qua, in thông báo).
- `install` ghi `<dir>/<name>.js`; `remove` xoá nó. (Tên file khác và adopt: ticket 04.)
- Lock/State: khoá `workflows`, `workflowSources`.

## Acceptance (`sync-workflows.test.ts`, mẫu `sync-agents.test.ts`)
- Nguồn giả có `workflows/review.js` (`meta.name: 'code-review'`), `workflows/README.md`, `workflows/x.test.js`, `workflows/_template.js`, `workflows/lib/h.js`, `.claude/workflows/own.js` → chỉ cài `.claude/workflows/code-review.js`.
- Nguồn thiếu `workflows/`: lỗi khi không có `path`, cài được với `path: .claude/workflows`.
- Bỏ khai báo → file bị gỡ; file người dùng khác trong thư mục còn nguyên.
- Scope `local` bỏ qua kèm thông báo; scope `user` cài vào `CLAUDE_CONFIG_DIR/workflows`.
- Không có gì được ghi vào `permissions` trong settings.
