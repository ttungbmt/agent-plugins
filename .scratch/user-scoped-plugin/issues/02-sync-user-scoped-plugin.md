---
title: "Sync User-scoped plugins to `user` from any Scope"
labels: [ready-for-agent]
blocked_by: [01]
---

# 02: Sync User-scoped plugins to `user` from any Scope

Spec: [../spec.md](../spec.md), decisions 4, 5, 7, 8, 9, 11. ADR 0012, ADR 0011, ADR 0003.

**What to build:** the tracer bullet. A `project` or `local` Sync plans User-scoped plugins with `planPlugins` against
the `user` Scope (its settings, installed plugins, State and `shared` claims) and the rest against the targeted Scope.

- [ ] `project` Sync → `claude plugin install <id> --scope user`; absent from project settings and from
      `agent-plugins.lock`; the claim is in user State under (Config path, `project`).
- [ ] Removal at `user` only when no other Config claims it; a Manual entry is adopted or conflicts as usual.
- [ ] Opt-out: Config redeclares `name@mp: false` without `scope` → its `user` claim is dropped, `false` is written to
      the targeted Scope.
- [ ] User-scope plugin actions run after User-scope marketplace actions; a failed marketplace `add` makes the plugin
      fail with `not ready`.
- [ ] `--scope user` Sync: `scope` has no effect.
- [ ] `--dry-run` labels actions `(user)`; `--check` reports drift at `user`.
- [ ] `fakeClaude` updated first if real `claude` differs.
- [ ] Tests in `sync-user-scoped.test.ts` covering `project`, `local` and `user` targeted Scopes.
