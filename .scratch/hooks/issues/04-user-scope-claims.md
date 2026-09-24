---
title: "Scope user: đếm claim Hook giữa các Config"
labels: [ready-for-agent]
blocked_by: [01]
---

# 04: Scope user: đếm claim Hook giữa các Config

Spec: [../spec.md](../spec.md). ADR 0007. Thuật ngữ: CONTEXT.md mục Hook và Sở hữu. (mục Luật lập kế hoạch, Lock/State). ADR 0003.

**What to build:** Nhiều repo cùng sync hook vào scope `user` mà không gỡ hay đảo ngược hook của nhau: một hook chỉ bị gỡ khi không Config nào còn claim nó, và hai Config khai báo cùng tên khác nội dung là xung đột.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] State có `hookClaims`; đọc claim của Config khác như `mcpClaims`.
- [ ] Bỏ khai báo mà Config khác còn claim đúng nội dung → bàn giao sở hữu, không gỡ khỏi settings.
- [ ] Config khác claim cùng tên khác nội dung → `shared-clash`; `--force` không vượt qua.
- [ ] Test hai Config dùng chung homedir trong `sync-hooks.test.ts`: bàn giao, gỡ khi hết claim, `shared-clash`.
