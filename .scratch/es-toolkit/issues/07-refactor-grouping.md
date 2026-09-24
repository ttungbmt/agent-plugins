---
title: Group with `Map.groupBy`
labels: []
blocked_by: [01, 03]
---

Spec: [../spec.md](../spec.md) (sections Rules, Refactors). Sites: research **Bảng đối chiếu → Mảng**, the `groupBy`
and `countBy` rows, including the two marked **đổi hành vi**. `Map.groupBy` keeps insertion order, so those two are
safe here.

## Work (commit as `refactor(sync)`)

- Replace the hand-built grouping `Map`s/objects in `merge.ts` (plugin id, JSON key, `scope`, MCP server name),
  `collect-items.ts` (item name), `format-conflicts.ts` and `format-report.ts` with `Map.groupBy`, where it is
  shorter. `workflows.ts:59-71` stays as it is (it has its own `unshift` logic).
- `countBy` in `format-report.ts` may use es-toolkit's `countBy`. Its keys are fixed verbs, never numeric.

## Acceptance

- The ordering tests from ticket 03 pass unmodified.
- Test and typecheck pass (plus `pack:release` and `smoke-release.sh`, recording the `dist/ap.js` size change, if this is the last of tickets 06–09 to land).
