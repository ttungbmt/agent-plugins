import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, posix, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { parse } from 'yaml'
import { sameSource } from './identity.js'
import { checkHook } from './hooks.js'
import { checkMcp, normalizeMcp, sameMcp } from './mcp.js'
import { parseShorthand } from './shorthand.js'
import { byKind, ITEM_KINDS } from './types.js'
import type { ByKind, Conflict, HookDeclaration, HookGroup, ItemDeclaration, ItemKind, ItemSource, MarketplaceDeclaration, MarketplaceSource, McpConfig, McpDeclaration, PluginDeclaration, Selection } from './types.js'

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

export class ConfigError extends Error {}

type PresetDocument = { kind?: string; metadata?: { name?: string }; spec?: { presets?: unknown; extends?: unknown; marketplaces?: unknown; plugins?: unknown; mcpServers?: unknown; hooks?: unknown } & { [K in ItemKind as `${K}s`]?: unknown } }
type LoadedPreset = { id: string; label: string; doc: PresetDocument; dir: string }
type Resolution = ResolveContext & { root: string; usedPins: PresetPins; catalog?: Promise<Record<string, McpConfig>> }

/** Resolve a Config into its set of Marketplace declarations, per docs/design/ap-sync.md. */
export async function resolveConfig(configPath: string, ctx: ResolveContext): Promise<ResolvedConfig> {
  const configLabel = basename(configPath)
  const text = await readFile(configPath, 'utf8').catch(() => {
    throw new ConfigError(`${configLabel} not found; run \`ap init\` to create one`)
  })
  const config = parse(text) as PresetDocument
  if (config.spec?.extends !== undefined) {
    throw new ConfigError(`${configLabel}: a Config selects presets with \`spec.presets\`, not \`spec.extends\``)
  }
  const resolution: Resolution = { ...ctx, root: dirname(configPath), usedPins: {} }
  const graph: PresetGraph = { ancestors: new Map(), contributions: [], plugins: [], items: byKind(() => []), mcpServers: [] }
  for (const ref of list(config.spec?.presets)) await collect(ref, resolution.root, [], graph, resolution)

  const own = await readMarketplaces(config.spec?.marketplaces, configLabel, resolution.root)
  const merged = mergePresets(graph)
  const notices = [...merged.notices]
  const kept = merged.declarations.filter((d) => {
    const override = own.find((o) => (o.name !== null && o.name === d.name) || sameSource(o.source, d.source))
    if (!override) return true
    if (!sameSource(override.source, d.source) || !isDeepStrictEqual(override.extras, d.extras)) {
      notices.push(overrideNotice(override, d))
    }
    return false
  })
  const ownNames = new Set(own.map((o) => o.name))
  const plugins = mergePlugins([...graph.plugins, ...readPlugins(config.spec?.plugins, configLabel)])
  const own_ = (kind: ItemKind, raw: unknown) =>
    readItems(kind, raw, configLabel, resolution.root).then((ds) =>
      ds.map((d): ItemDeclaration => ({ ...d, origin: configLabel, presets: [null], shadows: ['*'] })),
    )
  const items = {} as ByKind<ReturnType<typeof mergeItems>>
  for (const kind of ITEM_KINDS) items[kind] = mergeItems(kind, [...graph.items[kind], ...(await own_(kind, config.spec?.[`${kind}s`]))])
  const mergedItems = ITEM_KINDS.map((kind) => items[kind])
  const ownMcp = (await readMcpServers(config.spec?.mcpServers, configLabel, resolution)).map(
    (d): McpContribution => ({ ...d, presets: [null], shadows: ['*'] }),
  )
  const mcpServers = mergeMcpServers([...graph.mcpServers, ...ownMcp])
  notices.push(...mergedItems.flatMap((m) => m.notices), ...mcpServers.notices)

  return {
    declarations: [...kept, ...own],
    plugins,
    items: byKind((kind) => items[kind].declarations),
    mcpServers: mcpServers.declarations,
    mcpConflicts: mcpServers.conflicts,
    hooks: readHookDeclarations(config.spec?.hooks, configLabel),
    pins: resolution.usedPins,
    conflicts: [...merged.conflicts.filter((c) => !ownNames.has(c.name)), ...mergedItems.flatMap((m) => m.conflicts)],
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
  plugins: PluginDeclaration[]
  /** Declarations of each item kind in load order, each entry from one Preset. */
  items: ByKind<ItemDeclaration[]>
  /** MCP server declarations in load order. */
  mcpServers: McpContribution[]
}

/** An MCP server declaration from a Preset or Config; a null `server` is `false` (drops an inherited server). */
type McpContribution = { name: string; server: McpConfig | null; origin: string } & Pick<ItemDeclaration, 'presets' | 'shadows'>

/**
 * Merge declarations across Presets (ADR 0004):
 * - a Preset wins over every Preset in its `extends` tree, replacing the whole entry;
 * - the rest are peers: the same source merges extra fields (the later declaration wins), a different source is a
 *   preset-clash.
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
    const rival = rest.find((d) => !sameSource(d.source, first.source))
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
      if (!sameSource(d.source, overrider.declaration.source) || !isDeepStrictEqual(d.extras, overrider.declaration.extras)) {
        notices.push(overrideNotice(overrider.declaration, d))
      }
    }
  }

  return { declarations, conflicts, notices }
}

/**
 * Merge Plugin declarations in order (parent Preset, child Preset, Config): on a duplicate key the later declaration wins.
 * The `@marketplace` suffix is checked during Sync, since the name of a marketplace from a Shorthand declaration lives in
 * the Lock/State/settings.
 */
function mergePlugins(declarations: PluginDeclaration[]): PluginDeclaration[] {
  const merged = new Map<string, PluginDeclaration>()
  for (const d of declarations) merged.set(d.id, d)
  return [...merged.values()]
}

/**
 * Merge Skill declarations (or Agent declarations) by source (ignoring `ref`), with the same rules as marketplaces: a
 * declaration wins over every declaration it `shadows` (a child Preset beats its parent, the Config beats every Preset)
 * and replaces the whole list of selected names; peer declarations are unioned (see `unionSelections`), and a different
 * `ref` is a preset-clash.
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
    const [first, ...rest] = winners as [ItemDeclaration, ...ItemDeclaration[]]
    const rival = rest.find((d) => !sameSource(d.source, first.source))
    if (rival) {
      const name = describeItemSource(withoutRef(first.source))
      conflicts.push({ name, reason: 'preset-clash', detail: `"${name}" is declared with different refs by ${first.origin} and ${rival.origin}` })
      continue
    }
    const winner = rest.reduce(
      (acc, d) => ({
        ...acc,
        select: unionSelections(acc.select, d.select),
        presets: [...acc.presets, ...d.presets],
        shadows: [...acc.shadows, ...d.shadows],
      }),
      first,
    )
    merged.push(winner)
    for (const loser of group.filter((d) => !winners.includes(d))) {
      if (!sameSource(loser.source, winner.source) || !isDeepStrictEqual(loser.select, winner.select)) {
        notices.push(`${winner.origin} overrides ${kind}s from "${describeItemSource(loser.source)}" declared by ${loser.origin}`)
      }
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
    const rival = rest.find((d) => !sameMcp(d.server, first.server))
    if (rival) {
      conflicts.push({ name, reason: 'preset-clash', detail: `MCP server "${name}" is declared differently by ${first.origin} and ${rival.origin}` })
      continue
    }
    if (first.server) declarations.push({ name, server: first.server, origin: first.origin })
    for (const loser of group.filter((d) => !winners.includes(d))) {
      if (!sameMcp(loser.server, first.server)) notices.push(`${first.origin} overrides MCP server "${name}" declared by ${loser.origin}`)
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

/** `a` wins over `b` when every Preset declaring `b` is in `a`'s `extends` tree, or `a` is the Config. */
export function outranks(a: Pick<ItemDeclaration, 'presets' | 'shadows'>, b: Pick<ItemDeclaration, 'presets'>): boolean {
  if (b.presets.includes(null)) return false
  return a.shadows.includes('*') || b.presets.every((p) => a.shadows.includes(p as string))
}

export function describeItemSource(source: ItemSource): string {
  if (source.source === 'directory') return String(source.path)
  const where = String(source.repo ?? source.url)
  const at = source.ref ? `${where}${source.source === 'github' ? '@' : '#'}${source.ref}` : where
  return source.path ? `${at} (${source.path})` : at
}

export function withoutRef({ ref: _, ...source }: ItemSource): ItemSource {
  return source
}

/** The `path` of a Skill source/Agent source, normalized (`./a/b/` → `a/b`); `null` for the source root. */
function itemsPath(raw: unknown, source: string, origin: string): string | null {
  const path = typeof raw === 'string' ? posix.normalize(raw).replace(/\/+$/, '') : ''
  if (!path || posix.isAbsolute(path) || path === '..' || path.startsWith('../')) {
    throw new ConfigError(`${origin}: \`path\` of "${source}" must be a relative path inside the source`)
  }
  return path === '.' ? null : path
}

function isLocal(source: string): boolean {
  return source.startsWith('./') || source.startsWith('../') || source.startsWith('/')
}

/** The same marketplace: the same name, or the same source when one side is a Shorthand declaration with no known name. */
function sameMarketplace(a: MarketplaceDeclaration, b: MarketplaceDeclaration): boolean {
  if (a.name && b.name) return a.name === b.name
  return sameSource(a.source, b.source)
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

  const ancestors = new Set<string>()
  graph.ancestors.set(preset.id, ancestors)
  for (const parent of extendsRefs(preset)) {
    const id = await collect(parent, preset.dir, [...stack, preset], graph, resolution)
    ancestors.add(id)
    for (const a of graph.ancestors.get(id) ?? []) ancestors.add(a)
  }

  for (const d of await readMarketplaces(preset.doc.spec?.marketplaces, preset.label, preset.dir)) {
    graph.contributions.push({ declaration: { ...d, source: rebasePath(d.source, preset, resolution.root) }, presetId: preset.id })
  }
  graph.plugins.push(...readPlugins(preset.doc.spec?.plugins, preset.label))
  for (const kind of ITEM_KINDS) {
    for (const d of await readItems(kind, preset.doc.spec?.[`${kind}s`], preset.label, preset.dir)) {
      const source = rebasePath(d.source, preset, resolution.root)
      graph.items[kind].push({ ...d, source, origin: preset.label, presets: [preset.id], shadows: [...ancestors] })
    }
  }
  for (const d of await readMcpServers(preset.doc.spec?.mcpServers, preset.label, resolution)) {
    graph.mcpServers.push({ ...d, presets: [preset.id], shadows: [...ancestors] })
  }
  return preset.id
}

function extendsRefs(preset: LoadedPreset): string[] {
  if (preset.doc.spec?.presets !== undefined) {
    throw new ConfigError(`${preset.label}: a Preset inherits with \`spec.extends\`, not \`spec.presets\``)
  }
  return list(preset.doc.spec?.extends)
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

/** `extends`/`presets` take a single reference or a list. */
function list(refs: unknown): string[] {
  if (refs === undefined || refs === null) return []
  return Array.isArray(refs) ? refs : [refs as string]
}

/** `dir` is the declaring file's directory; local paths in Shorthand declarations are resolved against it. */
async function readMarketplaces(raw: unknown, origin: string, dir: string): Promise<MarketplaceDeclaration[]> {
  if (!raw) return []
  if (Array.isArray(raw)) {
    if (!raw.every((item) => typeof item === 'string')) {
      throw new ConfigError(
        `${origin}: \`marketplaces\` list items must be source strings; use the \`name: { source }\` map form for extra fields`,
      )
    }
    return Promise.all(
      raw.map(async (text: string) => ({ name: null, source: await parseShorthand(text, dir, origin), extras: {}, origin })),
    )
  }
  return Object.entries(raw as Record<string, { source: MarketplaceSource }>).map(([name, { source, ...extras }]) => ({
    name,
    source,
    extras,
    origin,
  }))
}

/** `plugins` is a map of `name@marketplace: bool`, or a list of `name@marketplace` as shorthand for all `true`. */
function readPlugins(raw: unknown, origin: string): PluginDeclaration[] {
  if (!raw) return []
  const entries: [string, unknown][] = Array.isArray(raw) ? raw.map((id) => [id, true]) : Object.entries(raw)
  return entries.map(([id, enabled]) => {
    const marketplace = /^[^@\s]+@([^@\s]+)$/.exec(id)?.[1]
    if (!marketplace) throw new ConfigError(`${origin}: plugin "${id}" must be written as name@marketplace`)
    if (typeof enabled !== 'boolean') throw new ConfigError(`${origin}: plugin "${id}" must be true or false`)
    return { id, marketplace, enabled, origin }
  })
}

/**
 * `skills` (or `agents`) is a list; each entry is a source (every Skill/Agent in it), `{ source, skills }` (`{ source, agents }`)
 * selecting some names, or `{ source, exclude }` taking everything but some. The map form may add `path`: the directory
 * in the source holding them, which is part of the source (for a `directory` source it is folded into its path).
 */
async function readItems(kind: ItemKind, raw: unknown, origin: string, dir: string): Promise<Pick<ItemDeclaration, 'source' | 'select'>[]> {
  const key = `${kind}s`
  if (!raw) return []
  if (!Array.isArray(raw)) throw new ConfigError(`${origin}: \`${key}\` must be a list of ${kind} sources`)
  const isNames = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string')
  return Promise.all(
    raw.map(async (item: unknown) => {
      const entry = (typeof item === 'string' ? { source: item } : item) as Record<string, unknown>
      const { source } = entry
      if (typeof source !== 'string') throw new ConfigError(`${origin}: each ${kind} entry needs a \`source\` string`)
      let select: Selection
      if (!(key in entry) && !('exclude' in entry)) select = { exclude: [] }
      else if (key in entry && 'exclude' in entry) {
        throw new ConfigError(`${origin}: "${source}" cannot have both \`${key}\` and \`exclude\``)
      } else if ('exclude' in entry) {
        if (!isNames(entry.exclude)) throw new ConfigError(`${origin}: \`exclude\` of "${source}" must be a non-empty list of ${kind} names`)
        select = { exclude: [...new Set(entry.exclude)] }
      } else {
        if (!isNames(entry[key])) throw new ConfigError(`${origin}: \`${key}\` of "${source}" must be a non-empty list of ${kind} names`)
        select = [...new Set(entry[key] as string[])]
      }
      const subdir = 'path' in entry ? itemsPath(entry.path, source, origin) : null
      const shorthand = subdir && isLocal(source) ? `${source.replace(/\/+$/, '')}/${subdir}` : source
      const parsed = await parseShorthand(shorthand, dir, origin, kind)
      if (parsed.source !== 'github' && parsed.source !== 'git' && parsed.source !== 'directory') {
        throw new ConfigError(`${origin}: ${kind} source "${source}" must be owner/repo, a git URL or a directory`)
      }
      return { source: subdir && parsed.source !== 'directory' ? { ...parsed, path: subdir } : parsed, select }
    }),
  )
}

/**
 * `mcpServers` is a map by name: `true` takes the config verbatim from the MCP catalog (even when a parent Preset defined
 * the same name inline), a map is an inline config, `false` drops an inherited MCP server (ADR 0006).
 */
async function readMcpServers(raw: unknown, origin: string, resolution: Resolution) {
  if (!raw) return []
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ConfigError(`${origin}: \`mcpServers\` must be a map of server names to true, false or a server configuration`)
  }
  return Promise.all(
    Object.entries(raw).map(async ([name, value]) => {
      let server: McpConfig | null
      if (value === false) server = null
      else if (value === true) {
        server = (await mcpCatalog(resolution))[name] ?? null
        if (!server) throw new ConfigError(`${origin}: MCP server "${name}" is not in the ap catalog; declare its configuration inline`)
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        server = value as McpConfig
      } else {
        throw new ConfigError(`${origin}: MCP server "${name}" must be true, false or a server configuration`)
      }
      if (server) {
        const error = checkMcp(name, server)
        if (error) throw new ConfigError(`${origin}: ${error}`)
        server = normalizeMcp(server)
      }
      return { name, server, origin }
    }),
  )
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

/** `hooks` is a map by name: each name is a matcher group in Claude Code's exact format, `false` drops an inherited Hook (ADR 0007). */
function readHookDeclarations(raw: unknown, origin: string): HookDeclaration[] {
  if (raw === undefined || raw === null) return []
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ConfigError(`${origin}: \`hooks\` must be a map of hook names to false or a hook (event, matcher, hooks)`)
  }
  return Object.entries(raw).flatMap(([name, value]) => {
    if (value === false) return []
    if (value === true) throw new ConfigError(`${origin}: hook "${name}" cannot be true: ap has no hook catalog yet; declare the hook inline`)
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ConfigError(`${origin}: hook "${name}" must be false or a hook (event, matcher, hooks)`)
    }
    const error = checkHook(name, value as Record<string, unknown>)
    if (error) throw new ConfigError(`${origin}: ${error}`)
    return [{ name, group: value as HookGroup, origin }]
  })
}
