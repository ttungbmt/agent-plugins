---
title: Add `ledger` and use it for every kind's Managed entry bookkeeping in `sync()`
labels: [done]
blocked_by: []
---

Spec: [../spec.md](../spec.md) (section `ledger.ts`). Pure refactor.

## Work

- Add `packages/cli/src/sync/ledger.ts` with the `ledger(managed, key, plan, toRecord)` interface from the spec.
- In `sync()`, replace the hand-built `records`, `userRecords`, `pluginRecords`, `userPluginRecords`, `mcpRecords`,
  `userMcpRecords`, `hookRecords` and `itemRecords` maps, their `released*` lists and the four `adopted` loops with
  ledgers. The `adoptedNotice` wording and order stay the same.
- The apply functions (`applyMarketplace`, `applyPlugin`, `applyMcp`, `applyItem`, `writeHooks`) call `set`/`delete`/`has`
  on the ledgers.

## Acceptance

- `ledger.test.ts`: `forgotten` keys are dropped from `values()` and listed in `released`; `adopted` entries are
  recorded through `toRecord` and their keys returned; `set` replaces by key; the initial order is kept.
- All existing `sync-*.test.ts` and `store.test.ts` pass unchanged.
- Test and typecheck pass.
