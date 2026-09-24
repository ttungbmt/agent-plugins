---
title: "Move a plugin between the targeted Scope and `user`"
labels: [done]
blocked_by: [02]
---

# 03: Move a plugin between the targeted Scope and `user`

Spec: [../spec.md](../spec.md), decision 10. ADR 0012.

**What to build:** adding or dropping `scope: user` on a plugin that is Managed at the other Scope.

- [ ] Adding `scope: user`: installed/enabled at `user` first, then uninstalled/unset at the targeted Scope and dropped
      from the Lock (or `local` State).
- [ ] Dropping `scope: user`: installed/enabled at the targeted Scope first, then this Config's `user` claim is
      dropped; uninstalled from `user` only when no other Config claims it.
- [ ] A failure at the new Scope leaves the old Scope untouched.
- [ ] Tests in `sync-user-scoped.test.ts`.
