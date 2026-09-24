---
title: "Move items between the targeted Scope and `user`"
labels: [ready-for-agent]
blocked_by: [03, 04]
---

# 06: Move items between the targeted Scope and `user`

Spec: [../spec.md](../spec.md), decisions 4, 9. ADR 0013.

**What to build:** adding or dropping `scope: user` on an entry whose items are Managed at the other Scope.

**Blocked by:** 03, 04.

- [ ] Adding `scope: user`: items are installed at `user` first, then removed from the targeted Scope and the Lock;
      the report shows each pair as one Scope move.
- [ ] Dropping `scope: user`: items are installed at the targeted Scope first, then removed from `user`; when another
      Config still claims them at `user`, only this Config's claim is dropped.
- [ ] A Config overriding a Preset's User-scoped entry with the same source and no `scope` (opt-out) takes the same
      path, with the override notice from 02.
- [ ] A failure installing at the new Scope leaves the old Scope untouched.
- [ ] Tests at the `sync()` seam, following the Scope move cases of the User-scoped marketplace and plugin features.
