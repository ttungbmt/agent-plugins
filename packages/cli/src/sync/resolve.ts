import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { parse } from 'yaml'
import { ConfigError } from './errors.js'
import { describeItemSource, sameSource, withoutRef } from './identity.js'
import { sameMcp } from './mcp.js'
import { presetRefs, readDeclarations, type McpPart, type PresetDocument } from './spec.js'
import { byKind, ITEM_KINDS } from './types.js'
import type { ByKind, Conflict, HookDeclaration, ItemDeclaration, ItemKind, MarketplaceDeclaration, MarketplaceSource, McpConfig, McpDeclaration, PluginDeclaration, Selection } from './types.js'

export type Fetch = (url: string) => Promise<string>
/** Remote preset URL → sha256 of its accepted content. */
export type PresetPins = Record<string, string>

export type ResolveContext = {
  fetch: Fetch
  /** Hashes pinned in the Lock. */
  pins: PresetPins
  update: boolean
  cacheDir: string
  /** false under `--dry-run`/`--check`: don't write the Remote preset cache to disk. */
  writeCache?: boolean
  defaultPresetsDir: string
}

export type ResolvedConfig = {
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
  /** Hashes of every Remote preset used this run, to write back to the Lock. */
  pins: PresetPins
  conflicts: Conflict[]
  notices: string[]
}

type LoadedPreset = { id: string; label: string; doc: PresetDocument; dir: string }
type Resolution = ResolveContext & { root: string; usedPins: PresetPins; catalog?: Promise<Record<string, McpConfig>> }

/** Resolve a Config into its set of Marketplace declarations, per docs/design/ap-sync.md. */
export async function resolveConfig(configPath: string, ctx: ResolveContext): Promise<ResolvedConfig> {
  const configLabel = basename(configPath)
  const text = await readFile(configPath, 'utf8').catch(() => {
    throw new ConfigError(`${configLabel} not found; run \`ap init\` to create one`)
  })
  const config = parse(text) as PresetDocument
  const refs = presetRefs(config, 'Config', configLabel)
  const resolution: Resolution = { ...ctx, root: dirname(configPath), usedPins: {} }
  const graph: PresetGraph = { ancestors: new Map(), contributions: [], plugins: [], items: byKind(() => []), mcpServers: [] }
  for (const ref of refs) await collect(ref, resolution.root, [], graph, resolution)

  const declared = await readDeclarations(config, { origin: configLabel, dir: resolution.root }, () => mcpCatalog(resolution))
  const own = declared.marketplaces
  const merged = mergePresets(graph)
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
  const ownPlugins = declared.plugins.map(
    (d): PluginContribution => ({ ...d, presets: [null], shadows: ['*'] }),
  )
  const plugins = mergePlugins([...graph.plugins, ...ownPlugins])
  checkUserScopedPlugins(plugins.winners, [...kept, ...own], marketplaceConflicts)
  const ownItems = (kind: ItemKind) => declared.items[kind].map((d): ItemDeclaration => ({ ...d, presets: [null], shadows: ['*'] }))
  const items = {} as ByKind<ReturnType<typeof mergeItems>>
  for (const kind of ITEM_KINDS) items[kind] = mergeItems(kind, [...graph.items[kind], ...ownItems(kind)])
  const mergedItems = ITEM_KINDS.map((kind) => items[kind])
  const ownMcp = declared.mcpServers.map(
    (d): McpContribution => ({ ...d, presets: [null], shadows: ['*'] }),
  )
  const mcpServers = mergeMcpServers([...graph.mcpServers, ...ownMcp])
  notices.push(...plugins.notices, ...mergedItems.flatMap((m) => m.notices), ...mcpServers.notices)

  return {
    declarations: [...kept, ...own],
    plugins: plugins.declarations,
    items: byKind((kind) => items[kind].declarations),
    mcpServers: mcpServers.declarations,
    mcpConflicts: mcpServers.conflicts,
    hooks: declared.hooks,
    pins: resolution.usedPins,
    conflicts: [...marketplaceConflicts, ...plugins.conflicts, ...mergedItems.flatMap((m) => m.conflicts)],
    notices,
  }
}

/** A Preset's declaration, together with that Preset for comparing precedence. */
type Contribution = { declaration: MarketplaceDeclaration; presetId: string }
type PresetGraph = {
  /** Preset → every Preset in its `extends` tree (directly or indirectly). */
  ancestors: Map<string, Set<string>>
  contributions: Contribution[]
  /** Plugin declarations in load order: parent Preset first, child after. */
  plugins: PluginContribution[]
  /** Declarations of each item kind in load order, each entry from one Preset. */
  items: ByKind<ItemDeclaration[]>
  /** MCP server declarations in load order. */
  mcpServers: McpContribution[]
}

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
function mergePresets({ ancestors, contributions }: PresetGraph) {
  const groups: Contribution[][] = []
  for (const c of contributions) {
    const group = groups.find((g) => g.some((m) => sameMarketplace(m.declaration, c.declaration)))
    if (group) group.push(c)
    else groups.push([c])
  }

  const declarations: MarketplaceDeclaration[] = []
  const conflicts: Conflict[] = []
  const notices: string[] = []
  const extendsPreset = (child: Contribution, parent: Contribution) => ancestors.get(child.presetId)?.has(parent.presetId)

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

    for (const loser of group.filter((m) => !winners.includes(m))) {
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
  const groups = new Map<string, PluginContribution[]>()
  for (const c of contributions) groups.set(c.id, [...(groups.get(c.id) ?? []), c])

  const declarations: PluginDeclaration[] = []
  const allWinners: PluginDeclaration[] = []
  const conflicts: Conflict[] = []
  const notices: string[] = []
  for (const [id, group] of groups) {
    const winners = group.filter((d) => !group.some((o) => o !== d && outranks(o, d)))
    allWinners.push(...winners)
    const first = winners[0]!
    const { presets: _, shadows: __, ...winner } = winners.at(-1)!
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
  const groups = new Map<string, ItemDeclaration[]>()
  for (const d of declarations) {
    const key = JSON.stringify(withoutRef(d.source))
    groups.set(key, [...(groups.get(key) ?? []), d])
  }

  const merged: ItemDeclaration[] = []
  const conflicts: Conflict[] = []
  const notices: string[] = []
  for (const group of groups.values()) {
    const winners = group.filter((d) => !group.some((o) => o !== d && outranks(o, d)))
    const byScope = [...new Set(winners.map((d) => d.scope))].map((scope) => winners.filter((d) => d.scope === scope))
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
    for (const loser of group.filter((d) => !winners.includes(d))) {
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
  const groups = new Map<string, McpContribution[]>()
  for (const c of contributions) groups.set(c.name, [...(groups.get(c.name) ?? []), c])

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
    for (const loser of group.filter((d) => !winners.includes(d))) {
      if (!same(loser)) notices.push(`${first.origin} overrides MCP server "${name}" declared by ${loser.origin}`)
    }
  }
  return { declarations, conflicts, notices }
}

/** Union of two selections: select ∪ select = union of names; exclude E ∪ select S = exclude (E∖S); exclude E1 ∪ exclude E2 = exclude (E1∩E2). */
function unionSelections(a: Selection, b: Selection): Selection {
  if (Array.isArray(a)) return Array.isArray(b) ? [...new Set([...a, ...b])] : { exclude: b.exclude.filter((n) => !a.includes(n)) }
  if (Array.isArray(b)) return { exclude: a.exclude.filter((n) => !b.includes(n)) }
  return { exclude: a.exclude.filter((n) => b.exclude.includes(n)) }
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
  return a.shadows.includes('*') || b.presets.every((p) => a.shadows.includes(p as string))
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

/** Load a Preset and its `extends` tree; each Preset is loaded only once. Returns the Preset's id. */
async function collect(ref: string, from: string, stack: LoadedPreset[], graph: PresetGraph, resolution: Resolution) {
  const preset = await load(ref, from, resolution)
  if (stack.some((p) => p.id === preset.id)) {
    const start = stack.findIndex((p) => p.id === preset.id)
    const chain = [...stack.slice(start), preset].map((p) => p.label).join(' -> ')
    throw new ConfigError(`preset cycle: ${chain}`)
  }
  if (graph.ancestors.has(preset.id)) return preset.id
  const parents = presetRefs(preset.doc, 'Preset', preset.label)

  const ancestors = new Set<string>()
  graph.ancestors.set(preset.id, ancestors)
  for (const parent of parents) {
    const id = await collect(parent, preset.dir, [...stack, preset], graph, resolution)
    ancestors.add(id)
    for (const a of graph.ancestors.get(id) ?? []) ancestors.add(a)
  }

  // A Preset's `spec.hooks` is rejected by `presetRefs` until hooks ticket 03 (.scratch/hooks/issues/03-hooks-in-presets.md).
  const declared = await readDeclarations(preset.doc, { origin: preset.label, dir: preset.dir }, () => mcpCatalog(resolution))
  for (const d of declared.marketplaces) {
    graph.contributions.push({ declaration: { ...d, source: rebasePath(d.source, preset, resolution.root) }, presetId: preset.id })
  }
  for (const d of declared.plugins) {
    graph.plugins.push({ ...d, presets: [preset.id], shadows: [...ancestors] })
  }
  for (const kind of ITEM_KINDS) {
    for (const d of declared.items[kind]) {
      const source = rebasePath(d.source, preset, resolution.root)
      graph.items[kind].push({ ...d, source, presets: [preset.id], shadows: [...ancestors] })
    }
  }
  for (const d of declared.mcpServers) {
    graph.mcpServers.push({ ...d, presets: [preset.id], shadows: [...ancestors] })
  }
  return preset.id
}

/** A relative path in a Preset is resolved against that Preset's file, then rebased onto the Config directory. */
function rebasePath(source: MarketplaceSource, preset: LoadedPreset, root: string): MarketplaceSource {
  if ((source.source !== 'directory' && source.source !== 'file') || typeof source.path !== 'string') return source
  if (isAbsolute(source.path)) return source
  if (isRemote(preset.dir)) {
    throw new ConfigError(`relative path "${source.path}" cannot be used in remote preset ${preset.label}`)
  }
  const rebased = relative(root, resolve(preset.dir, source.path))
  return { ...source, path: rebased.startsWith('..') ? rebased : `./${rebased}` }
}

async function load(ref: string, from: string, resolution: Resolution): Promise<LoadedPreset> {
  const isRelative = ref.startsWith('./') || ref.startsWith('../')
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return loadRemote(ref, resolution)
  if (isRemote(from) && isRelative) return loadRemote(new URL(ref, from).href, resolution)
  if (isRelative) return loadLocal(resolve(from, ref), resolution)
  return loadDefaultPreset(ref, resolution)
}

async function loadRemote(url: string, resolution: Resolution): Promise<LoadedPreset> {
  if (!isRemote(url)) throw new ConfigError(`remote presets must use https: ${url}`)
  const cachePath = join(resolution.cacheDir, `${sha256(url)}.yaml`)

  let text: string
  try {
    text = await resolution.fetch(url)
  } catch (error) {
    text = await readFile(cachePath, 'utf8').catch(() => {
      throw new ConfigError(`cannot fetch preset ${url}: ${(error as Error).message}`)
    })
  }

  const hash = sha256(text)
  const pin = resolution.pins[url]
  if (pin && pin !== hash && !resolution.update) {
    throw new ConfigError(`preset ${url} changed since it was pinned; run \`ap sync --update\` to accept the new content`)
  }
  resolution.usedPins[url] = hash
  if (resolution.writeCache !== false) {
    await mkdir(resolution.cacheDir, { recursive: true })
    await writeFile(cachePath, text)
  }

  return { id: url, label: url, doc: parse(text) as PresetDocument, dir: url }
}

async function loadLocal(path: string, resolution: Resolution): Promise<LoadedPreset> {
  const label = relative(resolution.root, path)
  const text = await readFile(path, 'utf8').catch(() => {
    throw new ConfigError(`preset file not found: ${label}`)
  })
  return { id: path, label, doc: parse(text) as PresetDocument, dir: dirname(path) }
}

async function loadDefaultPreset(ref: string, ctx: ResolveContext): Promise<LoadedPreset> {
  const path = join(ctx.defaultPresetsDir, `${ref}.yaml`)
  const text = await readFile(path, 'utf8').catch(() => {
    throw new ConfigError(`unknown preset "${ref}"`)
  })
  const doc = parse(text) as PresetDocument
  if (doc.metadata?.name !== ref) {
    throw new ConfigError(`default preset metadata.name "${doc.metadata?.name}" must match its file name "${ref}"`)
  }
  return { id: path, label: ref, doc, dir: ctx.defaultPresetsDir }
}

/** Remote presets are only fetched over https. */
function isRemote(location: string): boolean {
  return location.startsWith('https://')
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** The MCP catalog shipped with `ap` (`mcp-servers.yaml` next to the Bundled presets), loaded once on the first `true`. */
function mcpCatalog(resolution: Resolution): Promise<Record<string, McpConfig>> {
  const path = join(resolution.defaultPresetsDir, 'mcp-servers.yaml')
  resolution.catalog ??= readFile(path, 'utf8').then(
    (text) => {
      try {
        const servers = (parse(text) as { servers?: Record<string, McpConfig> } | null)?.servers ?? {}
        // `description` is only for reading the catalog; it is not a `.mcp.json` field.
        return Object.fromEntries(Object.entries(servers).map(([name, { description: _, ...server }]) => [name, server]))
      } catch (error) {
        throw new ConfigError(`the ap catalog ${path} is not valid YAML: ${(error as Error).message}`)
      }
    },
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return {}
      throw new ConfigError(`cannot read the ap catalog ${path}: ${error.message}`)
    },
  )
  return resolution.catalog
}