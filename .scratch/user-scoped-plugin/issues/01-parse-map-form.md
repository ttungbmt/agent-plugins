---
title: "Parse map-form plugin declarations with `scope: user`"
labels: [done]
blocked_by: []
---

# 01: Parse map-form plugin declarations with `scope: user`

Spec: [../spec.md](../spec.md), decisions 1, 2, 3, 6. ADR 0012.

**What to build:** `resolve.ts` accepts `name@mp: { enabled, scope? }` beside the boolean form and carries `scope` on
`PluginDeclaration`; both schemas describe it. No sync behaviour changes yet.

- [ ] Boolean and list forms parse as before.
- [ ] Map form with only `enabled` equals the boolean form.
- [ ] Unknown field, missing/non-boolean `enabled`, or `scope` other than `user` → `ConfigError` naming the plugin.
- [ ] `enabled: false` with `scope: user` → `ConfigError`.
- [ ] `scope: user` on a plugin whose marketplace is not a User-scoped marketplace (including a Shorthand
      declaration) → `ConfigError`.
- [ ] Duplicate declarations: identical merge; peer Presets disagreeing on `scope` → preset clash; Config overrides a
      Preset with a notice.
- [ ] `config.schema.json` and `preset.schema.json` accept the map form; tests in `resolve.test.ts`.
