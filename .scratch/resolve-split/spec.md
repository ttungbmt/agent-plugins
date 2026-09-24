---
title: Split `resolve.ts` into a preset loader, a spec reader and a merge module
labels: [ready-for-agent]
---

Terms: [CONTEXT.md](../../CONTEXT.md) (Config, Preset, Inheritance, Preset selection, Bundled/Local/Remote preset,
MCP catalog, Hook declaration). Decisions this refactor must preserve:
[ADR 0004](../../docs/adr/0004-preset-extends-vs-config-presets.md),
[ADR 0006](../../docs/adr/0006-mcp-servers-inline-plus-bundled-catalog.md), and the User-scoped rules of ADR 0011–0014
that live in the merge functions.

## Problem Statement

`packages/cli/src/sync/resolve.ts` (715 lines) does three jobs that need three different kinds of test:

1. **Loading** Presets (Local, Remote, Bundled), the Remote preset cache and pins, the `extends` walk with cycle
   detection, rebasing relative paths, and the MCP catalog. Depends on `fetch` and the filesystem.
2. **Reading** each `spec.*` key by hand (`readMarketplaces`, `readPlugins`, `readItems`, `readMcpServers`,
   `readHookDeclarations`). Each is called twice, once in `collect` for a Preset and once in `resolveConfig` for the
   Config, with different post-processing each time.
3. **Merging** by Inheritance and Preset selection (`mergePresets`, `mergePlugins`, `mergeItems`, `mergeMcpServers`,
   `checkUserScopedPlugins`, and the Config's marketplace override inline in `resolveConfig`). This is pure
   computation, yet every precedence case in `resolve.test.ts` has to be written as YAML files through `makeTree`.

Precedence is also encoded twice: marketplaces use the `ancestors` map with `presetId`, while every other kind uses
`presets`/`shadows` with `outranks`. The two are equivalent, since `shadows` is built as `[...ancestors]`.

Smaller issues: `shorthand.ts` imports `ConfigError` from `resolve.ts`, which imports `shorthand.ts` (an import cycle).
`describeItemSource` and `withoutRef` live in `resolve.ts` but are used by `format-report.ts`, `commands/sync.ts` and
`collect-items.ts`.

## Solution

Three modules in `packages/cli/src/sync/`, with `resolveConfig` left as thin orchestration. **This is a pure
refactor:** no change to `ResolvedConfig`, the Lock pins, or any conflict, notice or error message. The one exception
is the order of errors, listed under "Accepted deviation". `resolve.test.ts` and `init/init.test.ts` must pass
unchanged, apart from import lines.

### `errors.ts` and `identity.ts`: small moves

- `ConfigError` moves to `errors.ts`, which breaks the `resolve.ts` ⇄ `shorthand.ts` import cycle.
- `describeItemSource` and `withoutRef` move to `identity.ts`, next to `sameSource`.
- Callers import from the new locations. `resolve.ts` does not re-export them.

### `preset-loader.ts`: loading Presets

```ts
export type PresetDocument = { kind?: string; metadata?: { name?: string }; spec?: { … } }

export type LoadedPreset = {
  id: string
  label: string
  doc: PresetDocument
  dir: string
  /** Every Preset in this one's `extends` tree, directly or indirectly. */
  shadows: string[]
  /** Rebase a relative `directory`/`file` source onto the Config directory; throws for a Remote preset. */
  rebase(source: MarketplaceSource): MarketplaceSource
}

export function presetLoader(ctx: ResolveContext, root: string): {
  /** Every Preset reachable from `refs` through `extends`, each yielded once, after its parents. */
  presets(refs: string[]): AsyncIterable<LoadedPreset>
  /** The MCP catalog shipped with `ap`, read once, on the first call. */
  mcpCatalog(): Promise<Record<string, McpConfig>>
  /** Hashes of every Remote preset loaded so far. */
  pins(): PresetPins
}
```

- Behind the interface:
  - classifying a ref (URL, relative path, bare name, relative path inside a Remote preset);
  - the https-only rule;
  - falling back to the cache when `fetch` fails;
  - checking pins and honouring `update`;
  - skipping the cache write when `writeCache` is `false`;
  - the Bundled preset `metadata.name` check;
  - cycle detection, loading each Preset once, and computing ancestors;
  - `rebasePath`.
- `presets()` reads `spec.extends` through `presetRefs(doc, 'Preset', label)` from `spec.ts`.
- **An async generator on purpose.** It yields a Preset right after its parents and before the next sibling is loaded,
  so the caller reads each Preset's declarations at the same point `collect` does today. A declaration error in Preset
  A is still reported before a load error in a later Preset B.
- Keep today's quirks:
  - `load` runs before the "already loaded" check, so a shared Remote preset is fetched once per reference;
  - the MCP catalog read is lazy, and a missing catalog file is `{}`.
- The `fetch` seam already has two adapters (the real fetch and the test fakes). The filesystem stays
  local-substitutable through `makeTree`, so no new port is needed.

### `spec.ts`: reading one document

```ts
export type ItemPart = Pick<ItemDeclaration, 'source' | 'select' | 'scope' | 'origin'>
export type McpPart = { name: string; server: McpConfig | null; scope?: 'user'; origin: string }

export type Declarations = {
  marketplaces: MarketplaceDeclaration[]
  plugins: PluginDeclaration[]
  items: ByKind<ItemPart[]>
  mcpServers: McpPart[]
  hooks: HookDeclaration[]
}

/** `spec.presets` for a Config, `spec.extends` for a Preset (ADR 0004); the other key throws. */
export function presetRefs(doc: PresetDocument, kind: 'Config' | 'Preset', label: string): string[]

/** Validate every `spec.*` key of one document, in the order marketplaces, plugins, items (ITEM_KINDS), MCP servers, hooks. */
export function readDeclarations(
  doc: PresetDocument,
  at: { origin: string; dir: string },
  mcpCatalog: () => Promise<Record<string, McpConfig>>,
): Promise<Declarations>
```

- This is the only runtime validation of `spec.*`. A new `spec.*` key touches this file and the two JSON schemas.
- Every read sets `origin` the same way.
- Local paths in Shorthand declarations are still resolved against `at.dir`. Rebasing onto the Config directory is the
  caller's job, through `LoadedPreset.rebase`.

### `merge.ts`: Inheritance and Preset selection

```ts
/** One document's declarations, in load order. The Config's layer is last, with presets [null] and shadows ['*']. */
export type Layer = { declarations: Declarations; presets: [string] | [null]; shadows: string[] }

export function mergeLayers(layers: Layer[]): Omit<ResolvedConfig, 'pins'>

/** `a` wins over `b` when every Preset declaring `b` is in `a`'s `extends` tree, or `a` is the Config. */
export function outranks(a, b): boolean   // still used by collect-items.ts
```

- Behind the interface:
  - the four per-kind merges;
  - `checkUserScopedPlugins`;
  - `unionSelections` and `selectionsOverlap`;
  - the Config's marketplace override, which matches by name *or* source and drops preset-clashes on a name the
    Config declares;
  - hooks, taken from the Config's layer only (see below).
- Marketplaces between Presets switch from the `ancestors` map to `shadows`: `extendsPreset(o, m)` becomes
  `o.shadows.includes(m.presetId)`. The `ancestors` map leaves the interface.
- Output order is part of the interface and must be kept:
  - `notices`: marketplace merge, then Config marketplace overrides, then plugins, then items in `ITEM_KINDS` order,
    then MCP servers;
  - `conflicts`: marketplaces (minus the names the Config declares), then plugins, then items. `mcpConflicts` stays
    separate.
- Errors thrown: `checkUserScopedPlugins`, and one origin selecting the same item with and without `scope: user`.
- No I/O, so `merge.test.ts` builds layers in memory.

### `resolveConfig` after the split

1. Read the Config file (the "run `ap init`" error is unchanged).
2. Call `presetRefs(config, 'Config', label)`.
3. For each Preset from `loader.presets(refs)`, call `readDeclarations`, rebase `marketplaces` and `items` sources with
   `preset.rebase`, and push a `Layer`.
4. Push the Config's layer.
5. Return `{ ...mergeLayers(layers), pins: loader.pins() }`.

**Preset hooks stay ignored**, as they are today. Step 3 builds a Preset's layer with `hooks: []`, with a comment
pointing to `.scratch/hooks/issues/03-hooks-in-presets.md`. That ticket then reduces to a `mergeHooks` in `merge.ts`.

Because `readDeclarations` reads every key, a Preset with an invalid `spec.hooks` would start failing validation. To
avoid that, pass the Preset document to `readDeclarations` with `spec.hooks` removed.

## Coordination with `spec-schema-contract`

`spec-schema-contract` landed first (`6aa46f5`..`e41080a`): `checkSpecKeys` replaced `extendsRefs`, and a Preset with
`spec.hooks` is now rejected as an unknown key. So:

- `presetRefs` absorbs `checkSpecKeys`, and `PRESET_SPEC_KEYS`/`CONFIG_SPEC_KEYS` move with it into `spec.ts`
  (`spec-schema.test.ts` changes its import line only).
- There is no "remove `spec.hooks` before reading" step. Build a Preset's layer with `hooks: []` and keep the comment
  pointing to hooks ticket 03.

## Accepted deviation

`readDeclarations` reads every key of the Config before any merge runs. Today, reading and merging are interleaved:
`checkUserScopedPlugins` runs before the Config's items, MCP servers and hooks are read, and `mergeItems` for one item
kind (the same-origin "with and without `scope: user`" error) runs before the next kind is read.

So when a Config has **both** a read error in a later key and one of those two merge errors, the read error is now
reported first. Every other error order is kept, including the order across Presets. Note this in the commit message.

## Out of scope

- One interface for every `spec.*` key (parse + merge + schema, like `ItemHandler`). Rejected: the merge rules differ
  per kind, so the interface would be as big as the code behind it (the same reason `EntryHandler` was rejected in
  `.scratch/scope-move-module/spec.md`).
- Routing the Config's marketplace override through `outranks`. This changes behaviour: today a Config declaring `x`
  with source A overrides a Preset declaring `y` with source A, and `sameMarketplace` would not match them.
- Fetching a shared Remote preset only once. This is a behaviour change (fewer fetches, cache writes, `fetch` calls in
  tests).
- Moving precedence cases from `resolve.test.ts` to `merge.test.ts`. That can follow once `merge.test.ts` exists.
- Generating the JSON schemas from the parser.
- No Lock/State change, so no new ADR.

## Done when

- `resolve.ts` holds only `resolveConfig`, its types (`Fetch`, `PresetPins`, `ResolveContext`, `ResolvedConfig`) and
  the orchestration above.
- No `read*` function is called in two places. Precedence is encoded only as `presets`/`shadows`.
- There is no import cycle between `resolve.ts` and `shorthand.ts`.
- `resolve.test.ts` and `init/init.test.ts` pass unchanged, apart from import lines.
- `pnpm -C packages/cli test` and `pnpm -C packages/cli typecheck` pass.
