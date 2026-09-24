---
title: Tracer bullet — cài Nguồn rule dạng chuỗi trần vào Namespace mặc định
labels: [ready-for-agent]
blocked_by: [01]
---

Spec: [../spec.md](../spec.md) (mục Loại item `rule`, Namespace, Tìm Rule trong nguồn, Cài/liệt kê/gỡ). ADR 0009.

## Việc cần làm
- `ItemKind` thêm `'rule'`; `ItemHandler` mới (`sync/rules.ts`). Định danh Rule = đường dẫn tương đối trong gốc rules, bỏ `.md`, phân cách `/`, mỗi đoạn khớp `ITEM_NAME`. Định danh trên đĩa = `<ns>/<đường dẫn>`.
- `spec.rules` trong Config chỉ nhận **chuỗi** (dạng map để ticket 03/04).
- Namespace mặc định: `github` → repo, `git` → tên cuối URL bỏ `.git`, `directory` → tên thư mục; viết thường.
- Gốc rules: `path` nếu có, không thì `rules/`; thiếu cả hai → lỗi nguồn gợi ý `path`. Lấy `*.md` đệ quy, bỏ `README.md` (mọi cấp, không phân biệt hoa thường), bỏ `.git`; không dò `.claude/rules/`.
- `dir()`: `<cwd>/.claude/rules` (project), `<claude config dir>/rules` (user), `null` (local → bỏ qua, in thông báo).
- Cài giữ cấu trúc thư mục; gỡ xoá file, thư mục cha rỗng tới hết Namespace, Namespace rỗng. Liệt kê chỉ quét Namespace đang khai báo hoặc có trong Lock/State.
- Lock/State: khoá `rules`, `ruleSources` (Managed rule có `name`, `source`, `sha256`, `origin`; Danh mục nguồn ghi đường dẫn **không** kèm Namespace).

## Acceptance (`sync-rules.test.ts`, mẫu theo `sync-agents.test.ts`)
- Nguồn giả có `rules/common/a.md`, `rules/web/b.md` (link `../common/a.md`), `rules/README.md`, `.claude/rules/x.md` → cài đúng `.claude/rules/<ns>/common/a.md`, `web/b.md`; không có README, không có `x.md`.
- Nguồn thiếu `rules/`: lỗi khi không `path`, cài được khi có `path`.
- Bỏ khai báo → Rule bị gỡ, Namespace rỗng bị xoá; file người dùng ngay dưới `.claude/rules/` còn nguyên.
- Scope `local` bỏ qua kèm thông báo; scope `user` cài vào `CLAUDE_CONFIG_DIR/rules`.
