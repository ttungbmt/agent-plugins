---
title: Add the `scopeMove` module, tested through an in-memory `MovableKind`
labels: [done]
blocked_by: [01]
---

Spec: [../spec.md](../spec.md) (section `scope-move.ts` and "Behaviour that has to be preserved exactly"). ADR 0011,
0012, 0014. This ticket only adds the module; `sync()` is not touched yet.

## Work

- `packages/cli/src/sync/scope-move.ts` with `MovableKind` and `scopeMove(kind, declarations, target, user)`, built on
  `ledger`.
- It covers: the split on `scope: 'user'` (when `user` is `null`, everything goes to the targeted Scope); planning
  both sides; `steps.before` / `target` / `after` with the cross-side hold; the failed-at-Scope map and its error
  message (`"<key>" is kept here until it is set up in <scope> settings`); `saved()` with owned, released and claims,
  including moving-back claims.

## Acceptance (`scope-move.test.ts`, fake `MovableKind`, no registry)

- With `user: null`, every declaration is planned at the targeted Scope and `before`/`after` are empty.
- A User-scoped declaration yields a `before` step; a removal at `user` yields an `after` step.
- A targeted-Scope removal is held when `user` has a conflict with the same key, and the reverse.
- When a non-removal step fails at one Scope, the removal of the same key at the other Scope throws the error
  above, and the entry stays in that Scope's `saved().owned`.
- Moving-back claim: an entry managed at `user` and no longer User-scoped keeps a `user` claim while the targeted
  Scope has a conflict for it or failed it; `claims` passed in are included (MCP behaviour), and passing `[]` gives the
  plugin behaviour.
- Test and typecheck pass.
