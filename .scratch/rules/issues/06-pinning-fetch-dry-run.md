---
title: Ghim commit, tải lại khi cần, `--dry-run`/`--check` không tải
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (mục Cài/liệt kê/gỡ, đoạn cuối). User story 24–27.

## Việc cần làm
- Nguồn rule ghim commit trong `ruleSources`; chỉ lấy commit mới khi `--update`.
- Ghim riêng với Nguồn skill/agent kể cả cùng repo, nhưng dùng chung fetcher: cùng source + commit chỉ tải một lần.
- Điều kiện tải lại như Skill: không có gì đổi thì không tải (chạy offline được).
- `--dry-run`/`--check` tính kế hoạch Rule từ Danh mục nguồn, không tải.

## Acceptance
- Test: nguồn giả có hai commit; không `--update` giữ commit cũ, có `--update` cài bản mới.
- Test: cùng repo khai báo ở cả `skills` và `rules` → fetcher được gọi một lần.
- Test: sync lần hai không đổi gì → fetcher không được gọi; `--check` trả khác biệt mà fetcher không được gọi.
