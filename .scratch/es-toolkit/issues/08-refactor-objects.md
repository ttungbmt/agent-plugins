---
title: Use es-toolkit object helpers
labels: []
blocked_by: [02, 03]
---

Spec: [../spec.md](../spec.md) (sections Rules, Refactors). Sites: research **Bảng đối chiếu → Object**, rows marked
**tương đương**.

## Work (commit as `refactor(sync)`)

- `omit` (13 sites), except `identity.ts` (it needs a cast: `MarketplaceSource` has an index signature), and except
  any site whose destructuring also reads the dropped field, if `omit` makes it longer (rule 3).
- `pick` in place of the local `pick` in `plan.ts`. Delete the local one.
- `pickBy` in place of the local `compact` in `store.ts`. Delete the local one.
- `omitBy` (2 sites), and `mapValues` in `preset-loader.ts` (MCP catalog).

## Acceptance

- `plan.ts` and `store.ts` no longer define `pick`/`compact`.
- The commit message lists skipped sites with reasons.
- Test and typecheck pass (plus `pack:release` and `smoke-release.sh`, recording the `dist/ap.js` size change, if this is the last of tickets 06–09 to land).
