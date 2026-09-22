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

type PresetDocument = { kind?: string; metadata?: { name?: string }; spec?: { presets?: unknown; marketplaces?: unknown } }
type LoadedPreset = { id: string; label: string; doc: PresetDocument; dir: string }
type Resolution = ResolveContext & { root: string; usedPins: PresetPins }

/** Phân giải Config thành tập Khai báo marketplace, theo docs/design/ap-sync.md. */
export async function resolveConfig(configPath: string, ctx: ResolveContext): Promise<ResolvedConfig> {
  const text = await readFile(configPath, 'utf8').catch(() => {
    throw new ConfigError(`${basename(configPath)} not found; run \`ap init\` to create one`)
  })
  const config = parse(text) as PresetDocument
  const resolution: Resolution = { ...ctx, root: dirname(configPath), usedPins: {} }
  const fromPresets: MarketplaceDeclaration[] = []
  for (const ref of presetRefs(config)) await collect(ref, resolution.root, [], fromPresets, resolution)

  const own = readMarketplaces(config.spec?.marketplaces, basename(configPath))
  const merged = mergePresets(fromPresets)
  const notices: string[] = []
  const kept = merged.declarations.filter((d) => {
    const override = own.find((o) => (o.name !== null && o.name === d.name) || sameSource(o.source, d.source))
    if (!override) return true
    if (!sameSource(override.source, d.source) || !isDeepStrictEqual(override.extras, d.extras)) {
      notices.push(`${override.origin} overrides "${d.name ?? override.name ?? d.source.repo}" declared by ${d.origin}`)
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

/** Gộp khai báo giữa các Preset: cùng marketplace và source thì gộp field phụ (Preset sau thắng), khác source thì là preset-clash. */
function mergePresets(all: MarketplaceDeclaration[]): { declarations: MarketplaceDeclaration[]; conflicts: Conflict[] } {
  const kept: MarketplaceDeclaration[] = []
  const conflicts: Conflict[] = []
  const clashed = new Set<string>()

  for (const d of all) {
    const index = kept.findIndex((k) => (d.name ? k.name === d.name : !k.name && sameSource(k.source, d.source)))
    const same = kept[index]
    if (!same) {
      kept.push(d)
    } else if (sameSource(same.source, d.source)) {
      kept[index] = { ...same, extras: { ...same.extras, ...d.extras } }
    } else if (!clashed.has(d.name as string)) {
      const name = d.name as string
      clashed.add(name)
      conflicts.push({ name, reason: 'preset-clash', detail: `"${name}" is declared differently by ${same.origin} and ${d.origin}` })
    }
  }

  return { declarations: kept.filter((d) => !d.name || !clashed.has(d.name)), conflicts }
}

async function collect(ref: string, from: string, stack: LoadedPreset[], out: MarketplaceDeclaration[], resolution: Resolution) {
  const preset = await load(ref, from, resolution)
  if (stack.some((p) => p.id === preset.id)) {
    const start = stack.findIndex((p) => p.id === preset.id)
    const chain = [...stack.slice(start), preset].map((p) => p.label).join(' -> ')
    throw new ConfigError(`preset cycle: ${chain}`)
  }
  for (const child of presetRefs(preset.doc)) await collect(child, preset.dir, [...stack, preset], out, resolution)
  const declarations = readMarketplaces(preset.doc.spec?.marketplaces, preset.label)
  out.push(...declarations.map((d) => ({ ...d, source: rebasePath(d.source, preset, resolution.root) })))
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

function presetRefs(doc: PresetDocument): string[] {
  return (doc.spec?.presets as string[] | undefined) ?? []
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
