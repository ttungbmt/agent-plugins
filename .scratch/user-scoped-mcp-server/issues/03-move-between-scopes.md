---
title: "Move an MCP server between the targeted Scope and `user`"
labels: [ready-for-agent]
blocked_by: [02, user-scoped-plugin/03]
---

# 03: Move an MCP server between the targeted Scope and `user`

Spec: [../spec.md](../spec.md), decision 10. ADR 0014.

**What to build:** adding or dropping `scope: user` on a server that is Managed at the other Scope.

- [ ] Adding `scope: user`: added at `user` first, then removed at the targeted Scope and dropped from the Lock (or
      `local` State).
- [ ] Dropping `scope: user`: added at the targeted Scope first, then this Config's `user` claim is dropped; removed
      from `user` only when no other Config claims it.
- [ ] A failure at the new Scope leaves the old Scope untouched.
- [ ] `cross-scope` does not report two copies of the same declaration.
- [ ] Tests next to ticket 02's.
