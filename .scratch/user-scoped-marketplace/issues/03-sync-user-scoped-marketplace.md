---
title: "Sync User-scoped marketplaces to `user` from any Scope"
labels: [done]
blocked_by: [01, 02]
---

# 03: Sync User-scoped marketplaces to `user` from any Scope

Spec: [../spec.md](../spec.md), decisions 3, 4, 6, 7, 8, 10. ADR 0011, ADR 0003, ADR 0001.

**What to build:** the tracer bullet. A `project` or `local` Sync plans the User-scoped marketplaces against the
`user` Scope (its settings, State and claims) and the rest against the targeted Scope, applies the `user` actions
first, and lets plugins at the targeted Scope use them.

- [x] `project` Sync with a User-scoped marketplace → `claude plugin marketplace add … --scope user`; the entry is
      absent from project settings and from `agent-plugins.lock`; the claim is in user State under
      (Config path, `project`).
- [x] Patch (e.g. `autoUpdate` changed) and removal at `user` follow ADR 0003: removed only when no other Config claims
      it; `shared-clash` against a different claim, not overridable by `--force`; Manual entry adopted or conflicting
      as usual.
- [x] `checkMarketplaces` accepts `name@<user-scoped marketplace>` at the targeted Scope; no `missing-marketplace`.
- [x] User-scope marketplace actions run before plugin actions; a failed `add` makes dependent plugins fail with
      `not ready`.
- [x] `--scope user` Sync: the flag has no effect.
- [x] `--dry-run` labels actions outside the targeted Scope, e.g. `planned add claude-plugins-official (user)`;
      `--check` reports drift at `user`.
- [x] `fakeClaude` handles the cross-scope case as `claude` 2.1.281 does (project install with a user-only
      marketplace succeeds).
- [x] Removing it from `user` while `*@<name>` plugin entries sit at the `user` Scope is a `manual-entry` conflict
      (`claude plugin marketplace remove` would drop them); `--force` removes it anyway. Added during implementation.
- [x] Tests in `sync-user-scoped.test.ts` covering `project`, `local` and `user` targeted Scopes.
