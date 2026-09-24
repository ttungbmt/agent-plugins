---
title: Extract the Scope move rules and Managed entry bookkeeping out of `sync()`
labels: [ready-for-agent]
---

Terms: [CONTEXT.md](../../CONTEXT.md) (Scope, Scope move, Managed entry, Manual entry, User-scoped plugin, User-scoped
MCP server). Decisions this refactor must preserve: [ADR 0003](../../docs/adr/0003-managed-entries-per-scope-state.md),
[ADR 0011](../../docs/adr/0011-user-scoped-marketplace.md), [ADR 0012](../../docs/adr/0012-user-scoped-plugin.md),
[ADR 0014](../../docs/adr/0014-user-scoped-mcp-server.md).

## Problem Statement

`sync()` in `packages/cli/src/sync/index.ts` is one ~550-line function. Item kinds scale well (one `ItemHandler` per
kind), but Marketplace, Plugin, MCP server and Hook are wired by hand, and two patterns are copied per kind:

1. **Managed entry bookkeeping**: build a record map from the Lock/State, drop `forgotten`, collect `released`, add
   `adopted` with a notice, then `set`/`delete` as steps apply. It appears 7 times (marketplace, plugin, MCP × targeted
   Scope/`user`, plus hooks), and once more for item kinds.
2. **Scope move rules** (ADR 0011/0012/0014): split declarations on `scope: 'user'`, plan the targeted Scope and `user`
   separately, run `user` additions first and `user` removals last, hold a removal on one side while the other side has
   a conflict with the same name, keep an entry at its old Scope when the step at the new Scope failed, and keep this
   Config's claim at `user` while an entry is moving back. Plugins and MCP servers carry near-identical copies of all of
   this.

A new Scope-movable kind, or a change to one of these rules, means editing several copies inside the one function.

## Solution

Two in-process modules in `packages/cli/src/sync/`. **This is a pure refactor: no change to the Lock/State format,
the step order, the report or any conflict or notice.** The existing `sync-*.test.ts` suites are the safety net and
must pass unchanged.

### `ledger.ts`: the Managed entries of one kind in one Scope

```ts
function ledger<M, A>(
  managed: M[],
  key: (m: M) => string,
  plan: { adopted: A[]; forgotten: string[] },
  toRecord: (a: A) => M,
): {
  get(key: string): M | undefined
  has(key: string): boolean
  set(m: M): void
  delete(key: string): void
  values(): M[]      // saved as Owned
  released: M[]      // managed ∩ forgotten, saved as Sharing.released
  adopted: string[]  // keys adopted by the plan, for the "ap now manages …" notice
}
```

Used by marketplaces, plugins, MCP servers, hooks (no `adopted`: pass `[]`) and item kinds.

### `scope-move.ts`: the Scope move rules, written once

```ts
type Side = 'target' | 'user'

type MovableKind<D, M, A> = {
  key(x: D | M | A): string
  /** The kind closes over each side's settings and the other Configs' claims there. */
  plan(declarations: D[], managed: M[], side: Side): { actions: A[]; conflicts: Conflict[]; notices?: string[]; adopted: D[]; forgotten: string[] }
  isRemoval(a: A): boolean
  record(declaration: D): M
  /** Returns the Managed entry to record, or null (a plugin installed with `adopt: false`). */
  run(a: A, at: Scope, owns: (key: string) => boolean): Promise<M | null>
}

function scopeMove<D extends { scope?: 'user' }, M, A>(
  kind: MovableKind<D, M, A>,
  declarations: D[],
  target: { scope: Scope; managed: M[] },
  user: { managed: M[]; claims: M[] } | null,   // null when the Sync targets `user`
): {
  declared: { target: D[]; user: D[] }               // the split on `scope: 'user'`
  plans: { target: KindPlan; user: KindPlan | null }   // for kind-specific rules left in sync()
  conflicts: Conflict[]
  notices: string[]
  adopted: string[]
  /** User additions, the targeted Scope's actions, user removals: each already filtered by the cross-side hold. */
  steps: { before: A[]; target: A[]; after: A[] }
  apply(a: A, side: Side): Promise<string>
  saved(side: Side, settled: (d: D) => boolean): { owned: M[]; released: M[]; claims: M[] }
}
```

- Behind the interface: the split on `scope`, both plans, both ledgers, the cross-side hold of removals, the
  failed-at-Scope map and the error it throws, and moving-back claims.
- **Adapters**: Plugin and MCP server, the two kinds that are identical today. Their `run` calls the `registry`, so
  tests at `sync()` level keep using `fakeClaude`, and tests at `scopeMove` level use an in-memory `MovableKind`.
- Kind-specific behaviour stays in the adapter or in `sync()`: the MCP notice for a server another Config still claims
  at `user`, the plugin's check that its marketplace is ready (`failedMarketplaces`, `checked.pending`), and the
  plugin adoption notice at run time.
- **Marketplace stays outside `scopeMove` for now.** It uses `ledger` only, because its Scope move differs: a moving
  entry is `forget`ed rather than removed, and its removals are gated on plugins (`inUse`, Manual plugin entries).
  Ticket 05 decides whether it can join.
- **Hook** has no Scope move and uses `ledger` only.

### Behaviour that has to be preserved exactly

Tickets 03 and 04 must write a characterization test first if an existing suite does not already cover one of these:

- Plugin order: `before` (user installs/enables), then **every** targeted-Scope action in planner order (installs and
  removals interleaved), then `after` (user removals). Do not split the targeted side into adds and removes.
- MCP order: the same.
- Failure pinning: a plugin removal is refused when the plugin failed at **any** Scope; an MCP removal only when the
  server failed at **the other** Scope. These agree, because a plan holds at most one action per key, so a removal
  never follows a failed setup of the same key at the same Scope. `scopeMove` uses the MCP form. For both kinds, the
  actions whose failure pins an entry are exactly the non-removals, so there is no `pinsOnFailure`.
- Moving-back claims: MCP uses the user-side managed entries **∪ the previous claims**; plugins use the managed
  entries only (`planUserScoped` does not load plugin claims). Plugins pass `claims: []` to keep that behaviour.

## Out of scope

- A shared interface for all four entry kinds (`EntryHandler`). It was rejected: hooks are one settings write with no
  Scope move, and marketplaces are coupled to plugins. An interface covering all four would be as big as the code
  behind it.
- Splitting `resolve.ts` and generating the JSON schemas from the parser. These are separate candidates.
- Any change to the Lock/State format, so no new ADR is needed.

## Done when

- `sync()` holds no per-kind `records` / `released` / `forgotten` / `adopted` bookkeeping, and no plugin- or
  MCP-specific Scope move logic.
- All existing `sync-*.test.ts` pass without edits, except test-only helper imports.
- `pnpm -C packages/cli test` and `pnpm -C packages/cli typecheck` pass.
