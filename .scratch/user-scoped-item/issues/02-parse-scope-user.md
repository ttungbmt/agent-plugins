---
title: "Parse `scope: user` on item entries"
labels: [done]
blocked_by: [01]
---

# 02: Parse `scope: user` on item entries

Spec: [../spec.md](../spec.md), decisions 1, 2, 3, 4, 12. ADR 0013.

**What to build:** item entries in map form accept `scope: user`, and the resolved item declaration carries it. No Sync
behaviour changes yet: a User-scoped entry still installs at the targeted Scope until 03.

**Blocked by:** 01.

- [ ] `scope: user` accepted on Skill, Agent, Rule and Workflow entries with every selection form (all, select,
      `exclude`), with or without `path`.
- [ ] `scope` with any other value → `ConfigError`.
- [ ] `scope: user` with a `directory` source → `ConfigError` naming the source.
- [ ] Two entries of the same source with different `scope` stay separate declarations.
- [ ] Same item selected at both Scopes: identical declarations merge; peer Presets disagreeing on `scope` → preset
      clash; a Config overrides a Preset, and a child Preset its parent, with a notice.
- [ ] `config.schema.json` and `preset.schema.json` accept `scope` (enum `user`) on every item entry map form, and a new
      map form `{ source, scope }` meaning all items of the source.
- [ ] Tests in `resolve.test.ts`, following the map-form marketplace and plugin cases.
