import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { parse } from 'yaml'
import { ConfigError } from './errors.js'
import { mergeLayers, type Layer, type Merged } from './merge.js'
import { presetRefs, readDeclarations, type PresetDocument } from './spec.js'
import { byKind } from './types.js'
import type { MarketplaceSource, McpConfig } from './types.js'

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

export type ResolvedConfig = Merged & {
  /** Hashes of every Remote preset used this run, to write back to the Lock. */
  pins: PresetPins
}

type PresetGraph = {
  /** Preset → every Preset in its `extends` tree (directly or indirectly). */
  ancestors: Map<string, Set<string>>
  /** Each Preset's declarations in load order: parent Preset first, child after. */
  layers: Layer[]
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
  const graph: PresetGraph = { ancestors: new Map(), layers: [] }
  for (const ref of refs) await collect(ref, resolution.root, [], graph, resolution)

  const declared = await readDeclarations(config, { origin: configLabel, dir: resolution.root }, () => mcpCatalog(resolution))
  const layers = [...graph.layers, { declarations: declared, presets: [null], shadows: ['*'] } satisfies Layer]
  return { ...mergeLayers(layers), pins: resolution.usedPins }
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
  const rebase = <D extends { source: MarketplaceSource }>(d: D) => ({ ...d, source: rebasePath(d.source, preset, resolution.root) })
  const declarations = { ...declared, marketplaces: declared.marketplaces.map(rebase), items: byKind((kind) => declared.items[kind].map(rebase)) }
  graph.layers.push({ declarations, presets: [preset.id], shadows: [...ancestors] })
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