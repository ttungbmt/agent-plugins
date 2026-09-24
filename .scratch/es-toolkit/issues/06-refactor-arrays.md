---
title: Use es-toolkit array helpers
labels: []
blocked_by: [02, 03]
---

Spec: [../spec.md](../spec.md) (sections Rules, Refactors). Sites: research **Bảng đối chiếu → Mảng**, rows marked
**tương đương**.

## Work (commit as `refactor(sync)`)

- `uniq` (7 sites), `union` (2), `difference` (7 array sites), `differenceWith` (3), `intersection` (2), `isSubset`
  (1), `without` (1), `partition` (4), `uniqBy` (1).
- Leave the three sites that filter an array by an existing `Set` (research lines `init/index.ts:64`,
  `registry.ts:221`, `workflows.ts:127`) as they are, per rule 1.
- `partition` in `index.ts` and `scope-move.ts` keeps its outer condition for the `user`-target case (see the research
  note).

## Acceptance

- No behaviour change: the tests pass unmodified.
- The commit message lists every skipped site with its reason (rule 3).
- Test and typecheck pass (plus `pack:release` and `smoke-release.sh`, recording the `dist/ap.js` size change, if this is the last of tickets 06–09 to land).
