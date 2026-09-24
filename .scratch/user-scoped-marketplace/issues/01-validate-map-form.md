---
title: "Validate map-form marketplace entries and accept `scope: user`"
labels: [done]
blocked_by: []
---

# 01: Validate map-form marketplace entries and accept `scope: user`

Spec: [../spec.md](../spec.md), decisions 1–2. ADR 0011. Glossary: CONTEXT.md, User-scoped marketplace.

**What to build:** `readMarketplaces` (`resolve.ts`) rejects unknown fields in map-form entries and parses `scope`
into the Marketplace declaration, so later tickets can route on it. `scope` is not copied into `extras`, so it never
reaches settings. Nothing is synced to `user` yet.

- [x] Map-form entry with a field other than `source`, `autoUpdate`, `scope` → `ConfigError` naming the origin, the
      marketplace and the field.
- [x] `scope` other than `user` → `ConfigError`.
- [x] `MarketplaceDeclaration` (`types.ts`) carries the scope; `extras` never contains `scope`.
- [x] Duplicate rules: identical declarations merge; peer Presets disagreeing on `scope` → preset clash; a Config
      without `scope` overrides a Preset with `scope: user`, with a notice.
- [x] `marketplaceEntry` in `config.schema.json` and `preset.schema.json` gains `scope: { enum: [user] }` with a
      description.
- [x] Tests in `resolve.test.ts` for each case.
