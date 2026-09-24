---
title: Ghim commit, tải lại khi cần, `--dry-run`/`--check`, claims ở scope `user`
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (mục Cài/liệt kê/gỡ). User story 19, 20, 22. ADR 0003.

## Việc cần làm
- Nguồn workflow ghim commit trong `workflowSources`; chỉ lấy commit mới khi `--update`. Ghim riêng với các loại khác, dùng chung fetcher (cùng source + commit tải một lần).
- Không có gì đổi thì không tải; `--dry-run`/`--check` tính từ Danh mục nguồn.
- Khoá `workflowClaims` ở State scope `user` (sau rules/01 chỉ là thêm một mục trong map).

## Acceptance
- Test: hai commit, không `--update` giữ bản cũ, có `--update` cài bản mới.
- Test: cùng repo ở `agents` và `workflows` → fetcher gọi một lần; sync lần hai không gọi fetcher; `--check` không gọi fetcher.
- Test claims: hai Config cùng scope `user`, gỡ ở A giữ file, gỡ ở cả hai thì file mất.
