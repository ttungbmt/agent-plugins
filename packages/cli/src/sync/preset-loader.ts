import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { mapValues, omit } from 'es-toolkit'
import { parse } from 'yaml'
import { ConfigError } from './errors.js'
import { presetRefs, type McpCatalog, type PresetDocument } from './spec.js'
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

/** A Preset reached from the Config, with its place in the `extends` graph. */
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

type Loaded = Pick<LoadedPreset, 'id' | 'label' | 'doc' | 'dir'>
type Resolution = ResolveContext & { root: string; usedPins: PresetPins; catalog?: Promise<Record<string, McpConfig>> }

/**
 * Loads Local, Remote and Bundled presets for the Config in `root`. A Remote preset is fetched over https, pinned by
 * content hash (a changed hash throws unless `update`) and cached for when `fetch` fails.
 */
export function presetLoader(ctx: ResolveContext, root: string): {
  /**
   * Every Preset reachable from `refs` through `extends`, each yielded once, right after its parents and before the next
   * Preset is loaded. Throws on a cycle, and when a Preset uses a `spec` key a Preset does not take.
   */
  presets(refs: string[]): AsyncIterable<LoadedPreset>
  /** The MCP catalog shipped with `ap`, read once, on the first call; a missing catalog is empty. */
  mcpCatalog: McpCatalog
  /** Hashes of every Remote preset loaded so far. */
  pins(): PresetPins
} {
  const resolution: Resolution = { ...ctx, root, usedPins: {} }
  const ancestorsOf = new Map<string, Set<string>>()

  async function* walk(ref: string, from: string, stack: Loaded[]): AsyncGenerator<LoadedPreset, string> {
    const preset = await load(ref, from, resolution)
    if (stack.some((p) => p.id === preset.id)) {
      const start = stack.findIndex((p) => p.id === preset.id)
      const chain = [...stack.slice(start), preset].map((p) => p.label).join(' -> ')
      throw new ConfigError(`preset cycle: ${chain}`)
    }
    if (ancestorsOf.has(preset.id)) return preset.id
    const parents = presetRefs(preset.doc, 'Preset', preset.label)

    const ancestors = new Set<string>()
    ancestorsOf.set(preset.id, ancestors)
    for (const parent of parents) {
      const id = yield* walk(parent, preset.dir, [...stack, preset])
      ancestors.add(id)
      for (const a of ancestorsOf.get(id) ?? []) ancestors.add(a)
    }
    yield { ...preset, shadows: [...ancestors], rebase: (source) => rebasePath(source, preset, root) }
    return preset.id
  }

  return {
    async *presets(refs) {
      for (const ref of refs) yield* walk(ref, root, [])
    },
    mcpCatalog: () => mcpCatalog(resolution),
    pins: () => resolution.usedPins,
  }
}

/** A relative path in a Preset is resolved against that Preset's file, then rebased onto the Config directory. */
function rebasePath(source: MarketplaceSource, preset: Loaded, root: string): MarketplaceSource {
  if ((source.source !== 'directory' && source.source !== 'file') || typeof source.path !== 'string') return source
  if (isAbsolute(source.path)) return source
  if (isRemote(preset.dir)) {
    throw new ConfigError(`relative path "${source.path}" cannot be used in remote preset ${preset.label}`)
  }
  const rebased = relative(root, resolve(preset.dir, source.path))
  return { ...source, path: rebased.startsWith('..') ? rebased : `./${rebased}` }
}

async function load(ref: string, from: string, resolution: Resolution): Promise<Loaded> {
  const isRelative = ref.startsWith('./') || ref.startsWith('../')
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return loadRemote(ref, resolution)
  if (isRemote(from) && isRelative) return loadRemote(new URL(ref, from).href, resolution)
  if (isRelative) return loadLocal(resolve(from, ref), resolution)
  return loadDefaultPreset(ref, resolution)
}

async function loadRemote(url: string, resolution: Resolution): Promise<Loaded> {
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

async function loadLocal(path: string, resolution: Resolution): Promise<Loaded> {
  const label = relative(resolution.root, path)
  const text = await readFile(path, 'utf8').catch(() => {
    throw new ConfigError(`preset file not found: ${label}`)
  })
  return { id: path, label, doc: parse(text) as PresetDocument, dir: dirname(path) }
}

async function loadDefaultPreset(ref: string, ctx: ResolveContext): Promise<Loaded> {
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
        return mapValues(servers, (server) => omit(server, ['description']))
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
