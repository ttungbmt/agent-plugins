import { isDeepStrictEqual } from 'node:util'
import { difference, intersection, isSubset, omit, partition, union } from 'es-toolkit'
import { ConfigError } from './errors.js'
import { describeItemSource, sameSource, withoutRef } from './identity.js'
import { sameMcp } from './mcp.js'
import type { Declarations, McpPart } from './spec.js'
import { byKind, ITEM_KINDS } from './types.js'
import type { ByKind, Conflict, HookDeclaration, ItemDeclaration, ItemKind, MarketplaceDeclaration, MarketplaceSource, McpDeclaration, PluginDeclaration, Selection } from './types.js'

/**
 * One document's declarations with its place in the precedence order: a Preset has `presets: [id]` and `shadows` set to
 * every Preset in its `extends` tree; the Config has `presets: [null]` and `shadows: ['*']`.
 */
export type Layer = { declarations: Declarations; presets: [string] | [null]; shadows: string[] }

export type Merged = {
  declarations: MarketplaceDeclaration[]
  /** Merged Plugin declarations; the `@marketplace` suffix is not checked yet. */
  plugins: PluginDeclaration[]
  /** Skill declarations, Agent declarations, … merged by source. */
  items: ByKind<ItemDeclaration[]>
  /** MCP server declarations, resolved (looked up in the MCP catalog) and merged; names set to `false` are dropped. */
  mcpServers: McpDeclaration[]
  /**
   * Conflicts between MCP server declarations, kept apart from `conflicts` because MCP servers have their own namespace:
   * a marketplace, plugin or Skill with the same name is not blocked along with it, and vice versa.
   */
  mcpConflicts: Conflict[]
  /** The Config's Hook declarations; names set to `false` are dropped. */
  hooks: HookDeclaration[]
  conflicts: Conflict[]
  notices: string[]
}

/**
 * Merge every layer's declarations by Inheritance and Preset selection (ADR 0004). `layers` are in load order: a
 * Preset's parents before it, the Config last. Notices come out as marketplaces, plugins, items (`ITEM_KINDS`), MCP
 * servers. Throws a ConfigError for a User-scoped plugin on a marketplace that is not User-scoped, and for one origin
 * selecting the same item with and without `scope: user`.
 */
export function mergeLayers(layers: Layer[]): Merged {
  const [presetLayers, configLayers] = partition(
    layers,
    (l): l is Layer & { presets: [string] } => l.presets[0] !== null,
  )
  const tag = <D>(l: Layer, ds: D[]) => ds.map((d) => ({ ...d, presets: l.presets, shadows: l.shadows }))

  const own = configLayers.flatMap((l) => l.declarations.marketplaces)
  const merged = mergePresets(
    presetLayers.flatMap((l) => l.declarations.marketplaces.map((declaration) => ({ declaration, presetId: l.presets[0], shadows: l.shadows }))),
  )
  const notices = [...merged.notices]
  const kept = merged.declarations.filter((d) => {
    const override = own.find((o) => (o.name !== null && o.name === d.name) || sameSource(o.source, d.source))
    if (!override) return true
    if (!sameDeclaration(override, d)) {
      notices.push(overrideNotice(override, d))
    }
    return false
  })
  const ownNames = new Set(own.map((o) => o.name))
  const marketplaceConflicts = merged.conflicts.filter((c) => !ownNames.has(c.name))
  const plugins = mergePlugins(layers.flatMap((l): PluginContribution[] => tag(l, l.declarations.plugins)))
  checkUserScopedPlugins(plugins.winners, [...kept, ...own], marketplaceConflicts)
  const items = {} as ByKind<ReturnType<typeof mergeItems>>
  for (const kind of ITEM_KINDS) items[kind] = mergeItems(kind, layers.flatMap((l): ItemDeclaration[] => tag(l, l.declarations.items[kind])))
  const mergedItems = ITEM_KINDS.map((kind) => items[kind])
  const mcpServers = mergeMcpServers(layers.flatMap((l): McpContribution[] => tag(l, l.declarations.mcpServers)))
  notices.push(...plugins.notices, ...mergedItems.flatMap((m) => m.notices), ...mcpServers.notices)

  return {
    declarations: [...kept, ...own],
    plugins: plugins.declarations,
    items: byKind((kind) => items[kind].declarations),
    mcpServers: mcpServers.declarations,
    mcpConflicts: mcpServers.conflicts,
    // Hooks are not merged yet: only the Config declares them (hooks ticket 03).
    hooks: configLayers.flatMap((l) => l.declarations.hooks),
    conflicts: [...marketplaceConflicts, ...plugins.conflicts, ...mergedItems.flatMap((m) => m.conflicts)],
    notices,
  }
}

/** A Preset's Marketplace declaration, together with that Preset and its `extends` tree for comparing precedence. */
type Contribution = { declaration: MarketplaceDeclaration; presetId: string; shadows: string[] }

/** A Plugin declaration from a Preset or Config, together with its Presets for comparing precedence. */
type PluginContribution = PluginDeclaration & Pick<ItemDeclaration, 'presets' | 'shadows'>

/** An MCP server declaration from a Preset or Config; a null `server` is `false` (drops an inherited server). */
type McpContribution = McpPart & Pick<ItemDeclaration, 'presets' | 'shadows'>

/**
 * Merge declarations across Presets (ADR 0004):
 * - a Preset wins over every Preset in its `extends` tree, replacing the whole entry;
 * - the rest are peers: the same source merges extra fields (the later declaration wins), a different source or
 *   scope is a preset-clash.
 */
function mergePresets(contributions: Contribution[]) {
  const groups: Contribution[][] = []
  for (const c of contributions) {
    const group = groups.find((g) => g.some((m) => sameMarketplace(m.declaration, c.declaration)))
    if (group) group.push(c)
    else groups.push([c])
  }

  const declarations: MarketplaceDeclaration[] = []
  const conflicts: Conflict[] = []
  const notices: string[] = []
  const extendsPreset = (child: Contribution, parent: Contribution) => child.shadows.includes(parent.presetId)

  for (const group of groups) {
    const winners = group.filter((m) => !group.some((o) => extendsPreset(o, m)))
    const [first, ...rest] = winners.map((w) => w.declaration)
    if (!first) continue
    const rival = rest.find((d) => !sameSource(d.source, first.source) || d.scope !== first.scope)
    if (rival) {
      const name = (first.name ?? rival.name) as string
      conflicts.push({ name, reason: 'preset-clash', detail: `"${name}" is declared differently by ${first.origin} and ${rival.origin}` })
      continue
    }
    const winner = rest.reduce(
      (acc, d) => ({ ...acc, name: acc.name ?? d.name, extras: { ...acc.extras, ...d.extras } }),
      first,
    )
    declarations.push(winner)

    for (const loser of difference(group, winners)) {
      const overrider = group.find((o) => winners.includes(o) && extendsPreset(o, loser)) ?? winners[0]!
      const d = loser.declaration
      if (!sameDeclaration(d, overrider.declaration)) {
        notices.push(overrideNotice(overrider.declaration, d))
      }
    }
  }

  return { declarations, conflicts, notices }
}

/**
 * Merge Plugin declarations by id (ADR 0004, ADR 0012): a declaration wins over every declaration it `shadows` (a child
 * Preset beats its parent, the Config beats every Preset); among peers the later one wins. Only `scope` must agree: a
 * different `scope` between peers is a preset-clash and overriding one gets a notice, while `enabled` is overridden
 * silently as before. A clashing plugin keeps a declaration so its Managed entry is held rather than removed.
 * `winners` holds every declaration that is not overridden, clashing ones included, for `checkUserScopedPlugins`.
 * The `@marketplace` suffix is checked during Sync, since the name of a marketplace from a Shorthand declaration lives in
 * the Lock/State/settings.
 */
function mergePlugins(contributions: PluginContribution[]) {
  const groups = Map.groupBy(contributions, (c) => c.id)

  const declarations: PluginDeclaration[] = []
  const allWinners: PluginDeclaration[] = []
  const conflicts: Conflict[] = []
  const notices: string[] = []
  for (const [id, group] of groups) {
    const winners = group.filter((d) => !group.some((o) => o !== d && outranks(o, d)))
    allWinners.push(...winners)
    const first = winners[0]!
    const winner = omit(winners.at(-1)!, ['presets', 'shadows'])
    declarations.push(winner)
    const rival = winners.find((d) => d.scope !== first.scope)
    if (rival) {
      const detail = `"${id}" is declared differently by ${first.origin} and ${rival.origin}`
      conflicts.push({ name: id, reason: 'preset-clash', detail })
      continue
    }
    for (const loser of group.filter((d) => !winners.includes(d) && d.scope !== winner.scope)) {
      notices.push(`${winner.origin} overrides plugin "${id}" declared by ${loser.origin}`)
    }
  }
  return { declarations, winners: allWinners, conflicts, notices }
}

/**
 * A User-scoped plugin must use a User-scoped marketplace (ADR 0012), so the `user` settings stand on their own. A
 * marketplace held by a preset-clash is left to that conflict.
 */
function checkUserScopedPlugins(
  plugins: PluginDeclaration[],
  marketplaces: MarketplaceDeclaration[],
  conflicts: Conflict[],
) {
  const userScoped = new Set(marketplaces.filter((d) => d.scope === 'user').map((d) => d.name))
  for (const p of plugins) {
    if (p.scope !== 'user' || userScoped.has(p.marketplace) || conflicts.some((c) => c.name === p.marketplace)) continue
    throw new ConfigError(
      `${p.origin}: plugin "${p.id}" has scope "user" but marketplace "${p.marketplace}" is not a User-scoped marketplace`,
    )
  }
}

/**
 * Merge Skill declarations (or Agent declarations) by source (ignoring `ref`), with the same rules as marketplaces: a
 * declaration wins over every declaration it `shadows` (a child Preset beats its parent, the Config beats every Preset)
 * and replaces the whole list of selected names; peer declarations are unioned (see `unionSelections`), and a different
 * `ref` is a preset-clash. `scope` splits the winners: each Scope's declarations merge on their own, so one source can
 * feed both Scopes, but peers selecting the same item at both Scopes are a preset-clash (ADR 0013).
 */
function mergeItems(kind: ItemKind, declarations: ItemDeclaration[]) {
  const groups = Map.groupBy(declarations, (d) => JSON.stringify(withoutRef(d.source)))

  const merged: ItemDeclaration[] = []
  const conflicts: Conflict[] = []
  const notices: string[] = []
  for (const group of groups.values()) {
    const winners = group.filter((d) => !group.some((o) => o !== d && outranks(o, d)))
    const byScope = [...Map.groupBy(winners, (d) => d.scope).values()]
    const clash = (what: string, a: ItemDeclaration, b: ItemDeclaration) => {
      const name = describeItemSource(withoutRef(a.source))
      conflicts.push({ name, reason: 'preset-clash', detail: `"${name}" is declared with different ${what} by ${a.origin} and ${b.origin}` })
    }
    const refClash = byScope
      .map(([first, ...rest]) => ({ first: first!, rival: rest.find((d) => !sameSource(d.source, first!.source)) }))
      .find((c) => c.rival)
    if (refClash) {
      clash('refs', refClash.first, refClash.rival!)
      continue
    }
    // `scope` is `user` or absent, so there are at most two Scopes to compare.
    const [here = [], there = []] = byScope
    const overlap = here.flatMap((a) => there.filter((b) => selectionsOverlap(a.select, b.select)).map((b) => [a, b] as const))[0]
    if (overlap) {
      const [a, b] = overlap
      if (a.origin === b.origin) {
        const name = describeItemSource(withoutRef(a.source))
        throw new ConfigError(`${a.origin}: "${name}" selects the same ${kind}s with and without \`scope: user\`; each ${kind} has one Scope`)
      }
      clash('scopes', a, b)
      continue
    }
    const kept = byScope.map(([first, ...rest]) =>
      rest.reduce(
        (acc, d) => ({
          ...acc,
          select: unionSelections(acc.select, d.select),
          presets: [...acc.presets, ...d.presets],
          shadows: [...acc.shadows, ...d.shadows],
        }),
        first!,
      ),
    )
    merged.push(...kept)
    for (const loser of difference(group, winners)) {
      const same = kept.find((d) => d.scope === loser.scope)
      if (same && sameSource(loser.source, same.source) && isDeepStrictEqual(loser.select, same.select)) continue
      const winner = winners.find((d) => outranks(d, loser)) ?? kept[0]!
      notices.push(`${winner.origin} overrides ${kind}s from "${describeItemSource(loser.source)}" declared by ${loser.origin}`)
    }
  }
  return { declarations: merged, conflicts, notices }
}

/**
 * Merge MCP server declarations by name (ADR 0004, ADR 0006): a declaration wins over every declaration it `shadows` and
 * replaces the whole config; peer declarations must be identical after resolution (including `false`), otherwise it is
 * a preset-clash.
 */
function mergeMcpServers(contributions: McpContribution[]) {
  const groups = Map.groupBy(contributions, (c) => c.name)

  const declarations: McpDeclaration[] = []
  const conflicts: Conflict[] = []
  const notices: string[] = []
  for (const [name, group] of groups) {
    const winners = group.filter((d) => !group.some((o) => o !== d && outranks(o, d)))
    const [first, ...rest] = winners as [McpContribution, ...McpContribution[]]
    const same = (d: McpContribution) => sameMcp(d.server, first.server) && d.scope === first.scope
    const rival = rest.find((d) => !same(d))
    if (rival) {
      conflicts.push({ name, reason: 'preset-clash', detail: `MCP server "${name}" is declared differently by ${first.origin} and ${rival.origin}` })
      continue
    }
    if (first.server) declarations.push({ name, server: first.server, ...(first.scope && { scope: first.scope }), origin: first.origin })
    for (const loser of difference(group, winners)) {
      if (!same(loser)) notices.push(`${first.origin} overrides MCP server "${name}" declared by ${loser.origin}`)
    }
  }
  return { declarations, conflicts, notices }
}

/** Union of two selections: select ∪ select = union of names; exclude E ∪ select S = exclude (E∖S); exclude E1 ∪ exclude E2 = exclude (E1∩E2). */
function unionSelections(a: Selection, b: Selection): Selection {
  if (Array.isArray(a)) return Array.isArray(b) ? union(a, b) : { exclude: difference(b.exclude, a) }
  if (Array.isArray(b)) return { exclude: difference(a.exclude, b) }
  return { exclude: intersection(a.exclude, b.exclude) }
}

/**
 * Whether two selections of one source can take the same item. A selection entry may be a folder (Rules, ADR 0009); two
 * exclusions always can, since the source's contents are unknown here.
 */
function selectionsOverlap(a: Selection, b: Selection): boolean {
  const covers = (entry: string, name: string) => name === entry || name.startsWith(`${entry}/`)
  if (Array.isArray(a) && Array.isArray(b)) return a.some((x) => b.some((y) => covers(x, y) || covers(y, x)))
  if (Array.isArray(a) && !Array.isArray(b)) return a.some((x) => !b.exclude.some((e) => covers(e, x)))
  if (Array.isArray(b)) return selectionsOverlap(b, a)
  return true
}

/** `a` wins over `b` when every Preset declaring `b` is in `a`'s `extends` tree, or `a` is the Config. */
export function outranks(a: Pick<ItemDeclaration, 'presets' | 'shadows'>, b: Pick<ItemDeclaration, 'presets'>): boolean {
  if (b.presets.includes(null)) return false
  // es-toolkit's `isSubset(superset, subset)`: every Preset declaring `b` is among `a.shadows`.
  return a.shadows.includes('*') || isSubset(a.shadows, b.presets)
}

/** The same marketplace: the same name, or the same source when one side is a Shorthand declaration with no known name. */
function sameMarketplace(a: MarketplaceDeclaration, b: MarketplaceDeclaration): boolean {
  if (a.name && b.name) return a.name === b.name
  return sameSource(a.source, b.source)
}

/** The same source, settings fields and scope, so overriding one with the other changes nothing. */
function sameDeclaration(a: MarketplaceDeclaration, b: MarketplaceDeclaration): boolean {
  return sameSource(a.source, b.source) && isDeepStrictEqual(a.extras, b.extras) && a.scope === b.scope
}

function overrideNotice(winner: MarketplaceDeclaration, loser: MarketplaceDeclaration): string {
  return `${winner.origin} overrides "${loser.name ?? winner.name ?? describeSource(loser.source)}" declared by ${loser.origin}`
}

function describeSource(source: MarketplaceSource): unknown {
  return source.repo ?? source.url ?? source.path
}
