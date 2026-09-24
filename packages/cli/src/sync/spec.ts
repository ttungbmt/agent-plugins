import { posix } from 'node:path'
import { ConfigError } from './errors.js'
import { checkHook } from './hooks.js'
import { checkMcp, normalizeMcp } from './mcp.js'
import { parseShorthand } from './shorthand.js'
import { byKind, ITEM_KINDS } from './types.js'
import type { ByKind, HookDeclaration, HookGroup, ItemDeclaration, ItemKind, MarketplaceDeclaration, MarketplaceSource, McpConfig, PluginDeclaration, Selection } from './types.js'

/** A Skill, Agent, Rule or Workflow declaration as read from one document, before merging. */
export type ItemPart = Pick<ItemDeclaration, 'source' | 'select' | 'scope' | 'origin'>
/** An MCP server declaration as read from one document; a null `server` is `false` (drops an inherited server). */
export type McpPart = { name: string; server: McpConfig | null; scope?: 'user'; origin: string }
export type McpCatalog = () => Promise<Record<string, McpConfig>>

/** Every declaration one Config or Preset makes, validated but not merged. */
export type Declarations = {
  marketplaces: MarketplaceDeclaration[]
  plugins: PluginDeclaration[]
  items: ByKind<ItemPart[]>
  mcpServers: McpPart[]
  hooks: HookDeclaration[]
}

/**
 * Validate every `spec.*` key of one document, in the order marketplaces, plugins, items (`ITEM_KINDS`), MCP servers,
 * hooks. `dir` is the document's directory, against which local paths are resolved; `mcpCatalog` is only called for a
 * server taken from the MCP catalog.
 */
export async function readDeclarations(
  doc: PresetDocument,
  { origin, dir }: { origin: string; dir: string },
  mcpCatalog: McpCatalog,
): Promise<Declarations> {
  const spec = doc.spec
  const marketplaces = await readMarketplaces(spec?.marketplaces, origin, dir)
  const plugins = readPlugins(spec?.plugins, origin)
  const items = byKind((): ItemPart[] => [])
  for (const kind of ITEM_KINDS) items[kind] = (await readItems(kind, spec?.[`${kind}s`], origin, dir)).map((d) => ({ ...d, origin }))
  const mcpServers = await readMcpServers(spec?.mcpServers, origin, mcpCatalog)
  return { marketplaces, plugins, items, mcpServers, hooks: readHookDeclarations(spec?.hooks, origin) }
}

export type PresetDocument = { kind?: string; metadata?: { name?: string }; spec?: { presets?: unknown; extends?: unknown; marketplaces?: unknown; plugins?: unknown; mcpServers?: unknown; hooks?: unknown } & { [K in ItemKind as `${K}s`]?: unknown } }

const SHARED_SPEC_KEYS = ['marketplaces', 'plugins', ...ITEM_KINDS.map((kind) => `${kind}s`), 'mcpServers']
/** The keys a Preset's `spec` may carry; the parser rejects any other. */
export const PRESET_SPEC_KEYS: readonly string[] = ['extends', ...SHARED_SPEC_KEYS]
/** The keys a Config's `spec` may carry; the parser rejects any other. */
export const CONFIG_SPEC_KEYS: readonly string[] = ['presets', ...SHARED_SPEC_KEYS, 'hooks']

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

/** A Config and a Preset each read a fixed set of `spec` keys; a stray key is a mistake, not something to ignore. */
function checkSpecKeys(doc: PresetDocument, kind: 'Config' | 'Preset', label: string) {
  const keys = doc.spec && typeof doc.spec === 'object' ? Object.keys(doc.spec) : []
  if (kind === 'Config' && keys.includes('extends')) {
    throw new ConfigError(`${label}: a Config selects presets with \`spec.presets\`, not \`spec.extends\``)
  }
  if (kind === 'Preset' && keys.includes('presets')) {
    throw new ConfigError(`${label}: a Preset inherits with \`spec.extends\`, not \`spec.presets\``)
  }
  const accepted = kind === 'Config' ? CONFIG_SPEC_KEYS : PRESET_SPEC_KEYS
  const unknown = keys.find((key) => !accepted.includes(key))
  if (unknown) throw new ConfigError(`${label}: unknown key \`spec.${unknown}\`; a ${kind}'s spec takes ${accepted.join(', ')}`)
}

/**
 * The Presets a document refers to: `spec.presets` for a Config (Preset selection), `spec.extends` for a Preset
 * (Inheritance). Throws when the document uses the other key or any key its kind does not take.
 */
export function presetRefs(doc: PresetDocument, kind: 'Config' | 'Preset', label: string): string[] {
  checkSpecKeys(doc, kind, label)
  return list(kind === 'Config' ? doc.spec?.presets : doc.spec?.extends)
}

/** `extends`/`presets` take a single reference or a list. */
function list(refs: unknown): string[] {
  if (refs === undefined || refs === null) return []
  return Array.isArray(refs) ? refs : [refs as string]
}

/** The fields a map-form Marketplace declaration may carry besides `source`, as in `extraKnownMarketplaces`. */
const MARKETPLACE_EXTRAS = new Set(['autoUpdate'])

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
  return Object.entries(raw as Record<string, { source: MarketplaceSource; scope?: unknown }>).map(([name, entry]) => {
    const { source, scope, ...extras } = entry
    if (scope !== undefined && scope !== 'user') {
      throw new ConfigError(`${origin}: marketplace "${name}" has scope "${scope}"; the only scope is "user"`)
    }
    const unknown = Object.keys(extras).find((key) => !MARKETPLACE_EXTRAS.has(key))
    if (unknown) throw new ConfigError(`${origin}: marketplace "${name}" has unknown field "${unknown}"`)
    return { name, source, extras, ...(scope && { scope }), origin }
  })
}

/**
 * `plugins` is a map of `name@marketplace: bool` or `name@marketplace: { enabled, scope? }`, or a list of
 * `name@marketplace` as shorthand for all `true`.
 */
function readPlugins(raw: unknown, origin: string): PluginDeclaration[] {
  if (!raw) return []
  const entries: [string, unknown][] = Array.isArray(raw) ? raw.map((id) => [id, true]) : Object.entries(raw)
  return entries.map(([id, value]) => {
    const marketplace = /^[^@\s]+@([^@\s]+)$/.exec(id)?.[1]
    if (!marketplace) throw new ConfigError(`${origin}: plugin "${id}" must be written as name@marketplace`)
    return { id, marketplace, ...readPluginValue(id, value, origin), origin }
  })
}

/** A plugin value: `true`/`false`, or the map form `{ enabled, scope? }` whose `scope` can only be `user` (ADR 0012). */
function readPluginValue(id: string, value: unknown, origin: string): Pick<PluginDeclaration, 'enabled' | 'scope'> {
  if (typeof value === 'boolean') return { enabled: value }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ConfigError(`${origin}: plugin "${id}" must be true, false or { enabled, scope }`)
  }
  const { enabled, scope, ...rest } = value as Record<string, unknown>
  const fail = (message: string) => new ConfigError(`${origin}: plugin "${id}" ${message}`)
  const unknown = Object.keys(rest)[0]
  if (unknown !== undefined) throw fail(`has unknown field "${unknown}"`)
  if (typeof enabled !== 'boolean') throw fail('must set `enabled` to true or false')
  if (scope === undefined) return { enabled }
  if (scope !== 'user') throw fail(`has scope "${scope}"; the only scope is "user"`)
  if (!enabled) throw fail('cannot be `enabled: false` with `scope: user`')
  return { enabled, scope }
}

/**
 * `skills` (or `agents`) is a list; each entry is a source (every Skill/Agent in it), `{ source, skills }` (`{ source, agents }`)
 * selecting some names, or `{ source, exclude }` taking everything but some. The map form may add `path`: the directory
 * in the source holding them, which is part of the source (for a `directory` source it is folded into its path), and
 * `scope: user` to sync them to the `user` Scope; a `directory` source cannot be User-scoped (ADR 0013).
 */
async function readItems(kind: ItemKind, raw: unknown, origin: string, dir: string): Promise<Omit<ItemPart, 'origin'>[]> {
  const key = `${kind}s`
  if (!raw) return []
  if (!Array.isArray(raw)) throw new ConfigError(`${origin}: \`${key}\` must be a list of ${kind} sources`)
  const isNames = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string')
  return Promise.all(
    raw.map(async (item: unknown) => {
      const entry = (typeof item === 'string' ? { source: item } : item) as Record<string, unknown>
      const { source } = entry
      if (typeof source !== 'string') throw new ConfigError(`${origin}: each ${kind} entry needs a \`source\` string`)
      const unknown = Object.keys(entry).find((k) => !['source', key, 'exclude', 'path', 'scope'].includes(k))
      if (unknown) throw new ConfigError(`${origin}: "${source}" has unknown key \`${unknown}\``)
      const { scope } = entry
      if (scope !== undefined && scope !== 'user') {
        throw new ConfigError(`${origin}: "${source}" has scope "${String(scope)}"; the only scope is "user"`)
      }
      if (scope && isLocal(source)) {
        throw new ConfigError(`${origin}: "${source}" has \`scope: user\` but is a directory; only github and git sources can be User-scoped`)
      }
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
      return { source: subdir && parsed.source !== 'directory' ? { ...parsed, path: subdir } : parsed, select, ...(scope && { scope }) }
    }),
  )
}

/**
 * `mcpServers` is a map by name: `true` takes the config verbatim from the MCP catalog (even when a parent Preset defined
 * the same name inline), a map is an inline config, `false` drops an inherited MCP server (ADR 0006). A map may carry
 * `scope: user` (ADR 0014), which is stripped from the config; a map holding only `scope` takes the catalog config.
 */
async function readMcpServers(raw: unknown, origin: string, mcpCatalog: McpCatalog): Promise<McpPart[]> {
  if (!raw) return []
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ConfigError(`${origin}: \`mcpServers\` must be a map of server names to true, false or a server configuration`)
  }
  const fromCatalog = async (name: string) => {
    const server = (await mcpCatalog())[name]
    if (!server) throw new ConfigError(`${origin}: MCP server "${name}" is not in the ap catalog; declare its configuration inline`)
    return server
  }
  return Promise.all(
    Object.entries(raw).map(async ([name, value]) => {
      let server: McpConfig | null
      let scope: 'user' | undefined
      if (value === false) server = null
      else if (value === true) server = await fromCatalog(name)
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        const { scope: rawScope, ...inline } = value as McpConfig
        if (rawScope !== undefined) {
          if (rawScope !== 'user') throw new ConfigError(`${origin}: MCP server "${name}" has scope "${String(rawScope)}"; the only scope is "user"`)
          scope = 'user'
        }
        server = scope && Object.keys(inline).length === 0 ? await fromCatalog(name) : inline
      } else {
        throw new ConfigError(`${origin}: MCP server "${name}" must be true, false or a server configuration`)
      }
      if (server) {
        const error = checkMcp(name, server) ?? (scope ? projectRelativePath(name, server) : null)
        if (error) throw new ConfigError(`${origin}: ${error}`)
        server = normalizeMcp(server)
      }
      return { name, server, ...(scope && { scope }), origin }
    }),
  )
}

/**
 * A User-scoped MCP server runs in every repo, so a `command` or argument starting with `./` or `../` would point into
 * whichever project Claude Code happens to open (ADR 0014). Returns an error message, or null.
 */
function projectRelativePath(name: string, server: McpConfig): string | null {
  const relative = (value: unknown): value is string => typeof value === 'string' && /^\.\.?\//.test(value)
  if (relative(server.command)) return `MCP server "${name}" has \`scope: user\` but its command "${server.command}" is relative to the project`
  const arg = Array.isArray(server.args) ? server.args.find(relative) : undefined
  if (arg) return `MCP server "${name}" has \`scope: user\` but its argument "${arg}" is relative to the project`
  return null
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

