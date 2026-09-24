---
title: "Move an entry between the targeted Scope and `user`"
labels: [done]
blocked_by: [03]
---

# 04: Move an entry between the targeted Scope and `user`

Spec: [../spec.md](../spec.md), decision 9. ADR 0011. Design: docs/design/ap-sync.md, `cross-scope`.

**What to build:** adding or dropping `scope: user` on an entry that is already Managed at the other Scope moves it
without a window where plugins lose their marketplace, and without a false `cross-scope` conflict.

- [x] Managed at `project`, now `scope: user` → add at `user`, then remove from `project` (and from the Lock).
- [x] `scope: user` dropped → add at the targeted Scope, then release the claim at `user` (removed only if no other
      Config claims it).
- [x] The `elsewhere` check does not fire between the two copies of the same declaration; a different source at
      another Scope still does.
- [x] Tests for both directions, including one where another Config still claims the `user` entry.
