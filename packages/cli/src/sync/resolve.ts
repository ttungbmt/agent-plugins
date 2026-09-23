import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { parse } from 'yaml'
import { sameSource } from './identity.js'
import type { Conflict, MarketplaceDeclaration, MarketplaceSource } from './types.js'

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
  /** Mã băm của mọi Preset từ xa đã dùng lần này, để ghi lại vào Lock. */
  pins: PresetPins
  conflicts: Conflict[]
  notices: string[]
}

export class ConfigError extends Error {}

type PresetDocument = { kind?: string; metadata?: { name?: string }; spec?: { presets?: unknown; extends?: unknown; marketplaces?: unknown } }
type LoadedPreset = { id: string; label: string; doc: PresetDocument; dir: string }
type Resolution = ResolveContext & { root: string; usedPins: PresetPins }

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
  const graph: PresetGraph = { ancestors: new Map(), contributions: [] }
  for (const ref of list(config.spec?.presets)) await collect(ref, resolution.root, [], graph, resolution)

  const own = readMarketplaces(config.spec?.marketplaces, configLabel)
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

  return {
    declarations: [...kept, ...own],
    pins: resolution.usedPins,
    conflicts: merged.conflicts.filter((c) => !ownNames.has(c.name)),
    notices,
  }
}

/** Khai báo của một Preset, kèm Preset đó để so thứ tự ưu tiên. */
type Contribution = { declaration: MarketplaceDeclaration; presetId: string }
type PresetGraph = {
  /** Preset → mọi Preset nằm trong cây `extends` của nó (trực tiếp hoặc gián tiếp). */
  ancestors: Map<string, Set<string>>
  contributions: Contribution[]
}

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

/** Cùng một marketplace: cùng tên, hoặc cùng source khi một bên là dạng rút gọn chưa biết tên. */
function sameMarketplace(a: MarketplaceDeclaration, b: MarketplaceDeclaration): boolean {
  if (a.name && b.name) return a.name === b.name
  return sameSource(a.source, b.source)
}

function overrideNotice(winner: MarketplaceDeclaration, loser: MarketplaceDeclaration): string {
  return `${winner.origin} overrides "${loser.name ?? winner.name ?? loser.source.repo}" declared by ${loser.origin}`
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

  for (const d of readMarketplaces(preset.doc.spec?.marketplaces, preset.label)) {
    graph.contributions.push({ declaration: { ...d, source: rebasePath(d.source, preset, resolution.root) }, presetId: preset.id })
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

function readMarketplaces(raw: unknown, origin: string): MarketplaceDeclaration[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((repo: string) => ({ name: null, source: { source: 'github', repo }, extras: {}, origin }))
  }
  return Object.entries(raw as Record<string, { source: MarketplaceSource }>).map(([name, { source, ...extras }]) => ({
    name,
    source,
    extras,
    origin,
  }))
}
