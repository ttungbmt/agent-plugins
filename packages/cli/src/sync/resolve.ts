import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, posix, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { parse } from 'yaml'
import { sameSource } from './identity.js'
import { checkMcp, normalizeMcp, sameMcp } from './mcp.js'
import { parseShorthand } from './shorthand.js'
import type { Conflict, ItemDeclaration, ItemKind, ItemSource, MarketplaceDeclaration, MarketplaceSource, McpConfig, McpDeclaration, PluginDeclaration, Selection } from './types.js'

export type Fetch = (url: string) => Promise<string>
/** URL Preset từ xa → sha256 nội dung đã chấp nhận. */
export type PresetPins = Record<string, string>

export type ResolveContext = {
  fetch: Fetch
  /** Mã băm đã ghim trong Lock. */
  pins: PresetPins
  update: boolean
  cacheDir: string
  /** false ở `--dry-run`/`--check`: không ghi cache Preset từ xa xuống đĩa. */
  writeCache?: boolean
  defaultPresetsDir: string
}

export type ResolvedConfig = {
  declarations: MarketplaceDeclaration[]
  /** Khai báo plugin đã gộp; hậu tố `@marketplace` chưa được kiểm tra. */
  plugins: PluginDeclaration[]
  /** Khai báo skill đã gộp theo nguồn. */
  skills: ItemDeclaration[]
  /** Khai báo agent đã gộp theo nguồn. */
  agents: ItemDeclaration[]
  /** Khai báo MCP server đã phân giải (tra Danh mục MCP) và đã gộp; tên bị `false` đã được bỏ. */
  mcpServers: McpDeclaration[]
  /**
   * Xung đột giữa các Khai báo MCP server, tách riêng khỏi `conflicts` vì MCP server có không gian tên riêng: một
   * marketplace, plugin hay Skill cùng tên không bị chặn theo, và ngược lại.
   */
  mcpConflicts: Conflict[]
  /** Mã băm của mọi Preset từ xa đã dùng lần này, để ghi lại vào Lock. */
  pins: PresetPins
  conflicts: Conflict[]
  notices: string[]
}

export class ConfigError extends Error {}

type PresetDocument = { kind?: string; metadata?: { name?: string }; spec?: { presets?: unknown; extends?: unknown; marketplaces?: unknown; plugins?: unknown; skills?: unknown; agents?: unknown; mcpServers?: unknown } }
type LoadedPreset = { id: string; label: string; doc: PresetDocument; dir: string }
type Resolution = ResolveContext & { root: string; usedPins: PresetPins; catalog?: Promise<Record<string, McpConfig>> }

/** Phân giải Config thành tập Khai báo marketplace, theo docs/design/ap-sync.md. */
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
  const graph: PresetGraph = { ancestors: new Map(), contributions: [], plugins: [], skills: [], agents: [], mcpServers: [] }
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
  const skills = mergeItems('skill', [...graph.skills, ...(await own_('skill', config.spec?.skills))])
  const agents = mergeItems('agent', [...graph.agents, ...(await own_('agent', config.spec?.agents))])
  const ownMcp = (await readMcpServers(config.spec?.mcpServers, configLabel, resolution)).map(
    (d): McpContribution => ({ ...d, presets: [null], shadows: ['*'] }),
  )
  const mcpServers = mergeMcpServers([...graph.mcpServers, ...ownMcp])
  notices.push(...skills.notices, ...agents.notices, ...mcpServers.notices)

  return {
    declarations: [...kept, ...own],
    plugins,
    skills: skills.declarations,
    agents: agents.declarations,
    mcpServers: mcpServers.declarations,
    mcpConflicts: mcpServers.conflicts,
    pins: resolution.usedPins,
    conflicts: [...merged.conflicts.filter((c) => !ownNames.has(c.name)), ...skills.conflicts, ...agents.conflicts],
    notices,
  }
}

/** Khai báo của một Preset, kèm Preset đó để so thứ tự ưu tiên. */
type Contribution = { declaration: MarketplaceDeclaration; presetId: string }
type PresetGraph = {
  /** Preset → mọi Preset nằm trong cây `extends` của nó (trực tiếp hoặc gián tiếp). */
  ancestors: Map<string, Set<string>>
  contributions: Contribution[]
  /** Khai báo plugin theo thứ tự nạp: Preset cha trước, con sau. */
  plugins: PluginDeclaration[]
  /** Khai báo skill và Khai báo agent theo thứ tự nạp, mỗi mục của một Preset. */
  skills: ItemDeclaration[]
  agents: ItemDeclaration[]
  /** Khai báo MCP server theo thứ tự nạp. */
  mcpServers: McpContribution[]
}

/** Khai báo MCP server của một Preset hoặc Config; `server` null là `false` (bỏ server kế thừa). */
type McpContribution = { name: string; server: McpConfig | null; origin: string } & Pick<ItemDeclaration, 'presets' | 'shadows'>

/**
 * Gộp khai báo giữa các Preset (ADR 0004):
 * - Preset thắng mọi Preset trong cây `extends` của nó, thay cả entry;
 * - còn lại là ngang hàng: cùng source thì gộp field phụ (khai báo sau thắng), khác source thì là preset-clash.
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
 * Gộp khai báo plugin theo thứ tự (Preset cha, Preset con, Config): trùng khoá thì khai báo sau thắng.
 * Hậu tố `@marketplace` được kiểm tra khi sync, vì tên của marketplace khai báo dạng rút gọn nằm trong Lock/State/settings.
 */
function mergePlugins(declarations: PluginDeclaration[]): PluginDeclaration[] {
  const merged = new Map<string, PluginDeclaration>()
  for (const d of declarations) merged.set(d.id, d)
  return [...merged.values()]
}

/**
 * Gộp Khai báo skill (hoặc Khai báo agent) theo nguồn (bỏ qua `ref`), cùng luật với marketplace: khai báo thắng mọi
 * khai báo nó `shadows` (Preset con thắng Preset cha, Config thắng mọi Preset) và thay cả danh sách tên được chọn; các
 * khai báo ngang hàng thì lấy hợp tập (xem `unionSelections`), khác `ref` thì là preset-clash.
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
 * Gộp Khai báo MCP server theo tên (ADR 0004, ADR 0006): khai báo thắng mọi khai báo nó `shadows` và thay cả cấu hình;
 * các khai báo ngang hàng phải giống hệt nhau sau khi phân giải (kể cả `false`), khác thì là preset-clash.
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

/** Hợp hai tập tên: chọn ∪ chọn = hợp tên; trừ E ∪ chọn S = trừ (E∖S); trừ E1 ∪ trừ E2 = trừ (E1∩E2). */
function unionSelections(a: Selection, b: Selection): Selection {
  if (Array.isArray(a)) return Array.isArray(b) ? [...new Set([...a, ...b])] : { exclude: b.exclude.filter((n) => !a.includes(n)) }
  if (Array.isArray(b)) return { exclude: a.exclude.filter((n) => !b.includes(n)) }
  return { exclude: a.exclude.filter((n) => b.exclude.includes(n)) }
}

/** `a` thắng `b` khi mọi Preset khai báo `b` nằm trong cây `extends` của `a`, hoặc `a` là Config. */
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

/** `path` của một Nguồn skill/Nguồn agent, chuẩn hoá (`./a/b/` → `a/b`); `null` khi là gốc nguồn. */
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

/** Cùng một marketplace: cùng tên, hoặc cùng source khi một bên là dạng rút gọn chưa biết tên. */
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

/** Nạp một Preset và cây `extends` của nó; mỗi Preset chỉ nạp một lần. Trả về id của Preset. */
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
  for (const [kind, raw, into] of [['skill', preset.doc.spec?.skills, graph.skills], ['agent', preset.doc.spec?.agents, graph.agents]] as const) {
    for (const d of await readItems(kind, raw, preset.label, preset.dir)) {
      const source = rebasePath(d.source, preset, resolution.root)
      into.push({ ...d, source, origin: preset.label, presets: [preset.id], shadows: [...ancestors] })
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

/** Đường dẫn tương đối trong một Preset được tính theo file Preset đó, rồi quy về thư mục Config. */
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

/** Preset từ xa chỉ được tải qua https. */
function isRemote(location: string): boolean {
  return location.startsWith('https://')
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** `extends`/`presets` nhận một tham chiếu hoặc một list. */
function list(refs: unknown): string[] {
  if (refs === undefined || refs === null) return []
  return Array.isArray(refs) ? refs : [refs as string]
}

/** `dir` là thư mục file khai báo; đường dẫn cục bộ trong Khai báo rút gọn được tính theo nó. */
async function readMarketplaces(raw: unknown, origin: string, dir: string): Promise<MarketplaceDeclaration[]> {
  if (!raw) return []
  if (Array.isArray(raw)) {
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

/** `plugins` là map `name@marketplace: bool`, hoặc list `name@marketplace` viết tắt cho toàn bộ `true`. */
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
 * `skills` (hoặc `agents`) là list; mỗi mục là một nguồn (mọi Skill/Agent trong đó), `{ source, skills }` (`{ source, agents }`)
 * chọn một số tên, hoặc `{ source, exclude }` lấy mọi thứ trừ một số. Dạng map có thể kèm `path`: thư mục trong nguồn
 * chứa chúng, là một phần của nguồn (với nguồn `directory` thì được gộp vào đường dẫn của nó).
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
 * `mcpServers` là map theo tên: `true` lấy nguyên cấu hình trong Danh mục MCP (kể cả khi Preset cha đã định nghĩa
 * inline cùng tên), map là cấu hình inline, `false` bỏ MCP server kế thừa (ADR 0006).
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

/** Danh mục MCP đi kèm `ap` (`mcp-servers.yaml` cạnh các Preset mặc định), nạp một lần khi có `true` đầu tiên. */
function mcpCatalog(resolution: Resolution): Promise<Record<string, McpConfig>> {
  const path = join(resolution.defaultPresetsDir, 'mcp-servers.yaml')
  resolution.catalog ??= readFile(path, 'utf8').then(
    (text) => {
      try {
        const servers = (parse(text) as { servers?: Record<string, McpConfig> } | null)?.servers ?? {}
        // `description` chỉ để đọc danh mục, không phải field của `.mcp.json`.
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
