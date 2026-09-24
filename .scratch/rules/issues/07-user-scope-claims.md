---
title: Chia sẻ Rule ở scope `user` giữa các repo bằng claims
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md). User story 31. ADR 0003.

## Việc cần làm
- Khoá `ruleClaims` trong State scope `user`, theo cơ chế `skillClaims`/`agentClaims` (sau ticket 01 chỉ là thêm một mục trong map).
- Repo A bỏ khai báo Rule mà repo B còn claim → không gỡ.

## Acceptance
- Test hai Config cùng scope `user`, mẫu theo test claims của Skill: gỡ ở A giữ file; gỡ ở cả hai thì file mất và Namespace rỗng bị xoá.
