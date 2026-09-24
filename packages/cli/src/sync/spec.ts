import { posix } from 'node:path'
import { isEmptyObject, trimEnd, uniq, without } from 'es-toolkit'
import * as z from 'zod/mini'
import { ConfigError } from './errors.js'
import { isRecord } from './guards.js'
import { checkMcp, normalizeMcp } from './mcp.js'
import { parseShorthand } from './shorthand.js'
import { byKind, ITEM_KINDS } from './types.js'
import type { ByKind, HookDeclaration, ItemDeclaration, ItemKind, MarketplaceDeclaration, MarketplaceSource, McpConfig } from './types.js'

// The shape of `spec` is checked in one synchronous parse (ADR 0015); the semantic steps (Shorthand sources, the MCP
// catalog) run after it as plain code. Messages use `{}` for the subject (plugin id, marketplace, MCP server or hook
// name, item source) and `{n}` for a handler number: a schema cannot know the key it sits under, so `issueLines` fills
// them in from the issue path.

const scope = (subject: string) =>
  z.optional(z.literal('user', { error: (iss) => `${subject} has scope "${String(iss.input)}"; the only scope is "user"` }))

const MarketplaceEntry = z.strictObject(
  {
    source: z.looseObject({ source: z.string() }, { error: 'marketplace {} needs a `source` map with a `source` type' }),
    autoUpdate: z.optional(z.boolean({ error: '`autoUpdate` of marketplace {} must be true or false' })),
    scope: scope('marketplace {}'),
  },
  {
    error: (iss) =>
      iss.code === 'unrecognized_keys' ? `marketplace {} has unknown field "${iss.keys[0]}"` : 'marketplace {} must be { source, autoUpdate, scope }',
  },
)
/** A list of Shorthand declarations, or a map of names to `{ source, …extras, scope? }`. */
const Marketplaces = z.union(
  [
    z.pipe(
      z.array(z.string({ error: '`marketplaces` list items must be source strings; use the `name: { source }` map form for extra fields' })),
      z.transform((texts) => texts.map((text) => ({ name: null, text }) as const)),
    ),
    z.pipe(
      z.record(z.string(), MarketplaceEntry),
      z.transform((map) =>
        Object.entries(map).map(([name, { source, scope, ...extras }]) => ({ name, source: source as MarketplaceSource, extras, ...(scope && { scope }) })),
      ),
    ),
  ],
  { error: '`marketplaces` must be a list of sources or a map of names to { source }' },
)

const PLUGIN_ID = /^[^@\s]+@([^@\s]+)$/
const PLUGIN_ID_ERROR = 'plugin {} must be written as name@marketplace'
const PluginId = z.string({ error: PLUGIN_ID_ERROR }).check(z.regex(PLUGIN_ID, { error: PLUGIN_ID_ERROR }))
/** The map form `{ enabled, scope? }`, whose `scope` can only be `user` and needs `enabled: true` (ADR 0012). */
const PluginSettings = z
  .strictObject(
    { enabled: z.boolean({ error: 'plugin {} must set `enabled` to true or false' }), scope: scope('plugin {}') },
    { error: (iss) => (iss.code === 'unrecognized_keys' ? `plugin {} has unknown field "${iss.keys[0]}"` : undefined) },
  )
  .check(z.refine((s) => s.enabled || !s.scope, { error: 'plugin {} cannot be `enabled: false` with `scope: user`' }))
const PluginValue = z.union([z.pipe(z.boolean(), z.transform((enabled) => ({ enabled }))), PluginSettings], {
  error: 'plugin {} must be true, false or { enabled, scope }',
})
/** `id` is `name@marketplace`, `marketplace` its suffix; `scope: user` marks a User-scoped plugin (ADR 0012), always `enabled`. */
const plugin = (id: string, value: { enabled: boolean; scope?: 'user' }) => ({ id, marketplace: PLUGIN_ID.exec(id)![1]!, ...value })
/** A map of `name@marketplace: bool | { enabled, scope? }`, or a list of `name@marketplace` as shorthand for all `true`. */
const Plugins = z.union(
  [
    z.pipe(z.array(PluginId), z.transform((ids) => ids.map((id) => plugin(id, { enabled: true })))),
    z.pipe(z.record(PluginId, PluginValue), z.transform((map) => Object.entries(map).map(([id, value]) => plugin(id, value)))),
  ],
  { error: '`plugins` must be a list of name@marketplace or a map of them to true, false or { enabled, scope }' },
)

function isLocal(source: string): boolean {
  return source.startsWith('./') || source.startsWith('../') || source.startsWith('/')
}

const PATH_ERROR = '`path` of {} must be a relative path inside the source'
/** The `path` of an item source, normalized (`./a/b/` → `a/b`); `null` for the source root. */
const ItemsPath = z.pipe(
  z
    .pipe(z.string({ error: PATH_ERROR }), z.transform((raw) => trimEnd(posix.normalize(raw), '/')))
    .check(z.refine((p) => !!p && !posix.isAbsolute(p) && p !== '..' && !p.startsWith('../'), { error: PATH_ERROR })),
  z.transform((p) => (p === '.' ? null : p)),
)

/**
 * `skills` (or `agents`, …) is a list; each entry is a source (every item in it), `{ source, skills }` selecting some
 * names, or `{ source, exclude }` taking everything but some. The map form may add `path`, the directory in the source
 * holding them, and `scope: user`; a directory source cannot be User-scoped (ADR 0013).
 */
function itemEntry(kind: ItemKind) {
  const key = `${kind}s`
  const names = (field: string) => {
    const error = `\`${field}\` of {} must be a non-empty list of ${kind} names`
    return z.optional(z.pipe(z.array(z.string({ error }), { error }).check(z.minLength(1, { error })), z.transform((n) => uniq(n))))
  }
  const Entry = z.strictObject(
    {
      ...({ [key]: names(key) } as {}),
      source: z.string({ error: `each ${kind} entry needs a \`source\` string` }),
      exclude: names('exclude'),
      path: z.optional(ItemsPath),
      scope: scope('{}'),
    },
    { error: (iss) => (iss.code === 'unrecognized_keys' ? `{} has unknown key \`${iss.keys[0]}\`` : `each ${kind} entry needs a \`source\` string`) },
  )
  // The selection key differs per kind, which the inferred type cannot follow, so it is read by name.
  const selected = (e: z.output<typeof Entry>) => (e as Record<string, unknown>)[key] as string[] | undefined
  return z.pipe(
    z.pipe(z.transform((item: unknown) => (typeof item === 'string' ? { source: item } : item)), Entry).check(
      z.refine((e) => !(selected(e) && e.exclude), { error: `{} cannot have both \`${key}\` and \`exclude\`` }),
      z.refine((e) => !(e.scope && isLocal(e.source)), { error: '{} has `scope: user` but is a directory; only github and git sources can be User-scoped' }),
    ),
    z.transform((e) => ({ source: e.source, subdir: e.path ?? null, select: selected(e) ?? { exclude: e.exclude ?? [] }, ...(e.scope && { scope: e.scope }) })),
  )
}
const itemList = (kind: ItemKind) => z.array(itemEntry(kind), { error: `\`${kind}s\` must be a list of ${kind} sources` })
const ItemLists = Object.fromEntries(ITEM_KINDS.map((kind) => [`${kind}s`, z.nullish(itemList(kind))])) as {
  [K in ItemKind as `${K}s`]: z.ZodMiniOptional<z.ZodMiniNullable<ReturnType<typeof itemList>>>
}

/**
 * `mcpServers` is a map by name: `true` takes the config from the MCP catalog, a map is an inline config, `false` drops an
 * inherited MCP server (ADR 0006). A map may carry `scope: user` (ADR 0014), which is stripped from the config; a map
 * holding only `scope` takes the catalog config.
 */
const McpValue = z.union(
  [
    z.pipe(z.literal(false), z.transform(() => ({ kind: 'drop' }) as const)),
    z.pipe(z.literal(true), z.transform(() => ({ kind: 'catalog' }) as const)),
    z.pipe(
      z.looseObject({ scope: scope('MCP server {}') }),
      z.transform(({ scope, ...inline }) =>
        scope && isEmptyObject(inline)
          ? ({ kind: 'catalog', scope } as const)
          : ({ kind: 'inline', inline: inline as McpConfig, ...(scope && { scope }) } as const),
      ),
    ),
  ],
  { error: 'MCP server {} must be true, false or a server configuration' },
)
const McpServers = z.record(z.string(), McpValue, { error: '`mcpServers` must be a map of server names to true, false or a server configuration' })

/** Required fields for each handler type (docs/research/hooks.md §1). */
const HANDLER_FIELDS = { command: ['command'], http: ['url'], mcp_tool: ['server', 'tool'], prompt: ['prompt'], agent: ['prompt'] } as const
const handler = <T extends keyof typeof HANDLER_FIELDS>(type: T) =>
  z.looseObject({
    type: z.literal(type),
    ...Object.fromEntries(HANDLER_FIELDS[type].map((f) => [f, z.string({ error: `handler {n} of hook {} (${type}) needs \`${f}\`` })])),
  } as { type: z.ZodMiniLiteral<T> } & Record<(typeof HANDLER_FIELDS)[T][number], z.ZodMiniString>)
const HookHandlerSchema = z.discriminatedUnion('type', [handler('command'), handler('http'), handler('mcp_tool'), handler('prompt'), handler('agent')], {
  error: 'handler {n} of hook {} needs a `type`: command, http, mcp_tool, prompt or agent',
})
const HOOK_LIST_ERROR = 'hook {} needs a non-empty `hooks` list of handlers'
const EVENT_ERROR = 'hook {} needs an `event` string'
/** One matcher group in Claude Code's exact format; handlers keep every field besides the required ones (ADR 0007). */
const HookGroupSchema = z.strictObject(
  {
    event: z.string({ error: EVENT_ERROR }).check(z.minLength(1, { error: EVENT_ERROR })),
    matcher: z.optional(z.string({ error: '`matcher` of hook {} must be a string' })),
    hooks: z.array(HookHandlerSchema, { error: HOOK_LIST_ERROR }).check(z.minLength(1, { error: HOOK_LIST_ERROR })),
  },
  { error: (iss) => (iss.code === 'unrecognized_keys' ? `hook {} has unknown key \`${iss.keys[0]}\`; a hook has only event, matcher and hooks` : undefined) },
)
/** `hooks` is a map by name: each name is a matcher group, `false` drops an inherited Hook. */
const Hooks = z.record(
  z.string(),
  z.union([z.literal(false), HookGroupSchema], {
    error: (iss) => (iss.input === true ? 'hook {} cannot be true: ap has no hook catalog yet; declare the hook inline' : 'hook {} must be false or a hook (event, matcher, hooks)'),
  }),
  { error: '`hooks` must be a map of hook names to false or a hook (event, matcher, hooks)' },
)

const SpecShape = z.object(
  { marketplaces: z.nullish(Marketplaces), plugins: z.nullish(Plugins), ...ItemLists, mcpServers: z.nullish(McpServers), hooks: z.nullish(Hooks) },
  { error: '`spec` must be a map' },
)
const Spec = z.nullish(SpecShape)

/** A merged Plugin declaration. */
export type PluginDeclaration = z.output<typeof Plugins>[number] & { origin: string }
/** The selected names, or everything in the source except the names in `exclude` (`exclude: []` means all). */
export type Selection = z.output<ReturnType<typeof itemEntry>>['select']
/** A handler in a matcher group, in Claude Code's exact format; every field besides the required ones is kept verbatim. */
export type HookHandler = z.output<typeof HookHandlerSchema>
/** A Hook: a matcher group (`matcher`, `hooks`) together with the event that holds it under the settings' `hooks` key. */
export type HookGroup = z.output<typeof HookGroupSchema>

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
 * Validate every `spec.*` key of one document: first the shape of every key in one parse, then the semantic steps
 * (Shorthand sources, the MCP catalog) in the order marketplaces, items (`ITEM_KINDS`), MCP servers. Throws one
 * ConfigError holding every shape problem or, when the shape is valid, every semantic problem in entry order.
 * `dir` is the document's directory, against which local paths are resolved; `mcpCatalog` is only called for a
 * server taken from the MCP catalog.
 */
export async function readDeclarations(
  doc: PresetDocument,
  { origin, dir }: { origin: string; dir: string },
  mcpCatalog: McpCatalog,
): Promise<Declarations> {
  const parsed = Spec.safeParse(doc.spec)
  if (!parsed.success) throw new ConfigError(issueLines(parsed.error.issues, doc.spec, origin))
  const spec = parsed.data ?? {}

  const errors: string[] = []
  /** Run every step of one section; keep each ConfigError, in entry order, and return the steps that succeeded. */
  const settle = async <T>(steps: Promise<T>[]): Promise<T[]> =>
    (await Promise.allSettled(steps)).flatMap((result) => {
      if (result.status === 'fulfilled') return [result.value]
      if (!(result.reason instanceof ConfigError)) throw result.reason
      errors.push(...result.reason.messages)
      return []
    })

  const marketplaces = await settle(
    (spec.marketplaces ?? []).map(async (m): Promise<MarketplaceDeclaration> =>
      m.name === null ? { name: null, source: await parseShorthand(m.text, dir, origin), extras: {}, origin } : { ...m, origin },
    ),
  )
  const plugins = (spec.plugins ?? []).map((p) => ({ ...p, origin }))
  const items = byKind((): ItemPart[] => [])
  for (const kind of ITEM_KINDS) {
    items[kind] = await settle(
      (spec[`${kind}s`] ?? []).map(async ({ source, subdir, select, scope }): Promise<ItemPart> => {
        // A `directory` source folds `path` into its own path; other sources keep it as a field.
        const shorthand = subdir && isLocal(source) ? `${trimEnd(source, '/')}/${subdir}` : source
        const parsed = await parseShorthand(shorthand, dir, origin, kind)
        if (parsed.source !== 'github' && parsed.source !== 'git' && parsed.source !== 'directory') {
          throw new ConfigError(`${origin}: ${kind} source "${source}" must be owner/repo, a git URL or a directory`)
        }
        return { source: subdir && parsed.source !== 'directory' ? { ...parsed, path: subdir } : parsed, select, ...(scope && { scope }), origin }
      }),
    )
  }
  const mcpServers = await settle(
    Object.entries(spec.mcpServers ?? {}).map(async ([name, value]): Promise<McpPart> => {
      if (value.kind === 'drop') return { name, server: null, origin }
      const scope = 'scope' in value ? value.scope : undefined
      let server = value.kind === 'inline' ? value.inline : (await mcpCatalog())[name]
      if (!server) throw new ConfigError(`${origin}: MCP server "${name}" is not in the ap catalog; declare its configuration inline`)
      const error = checkMcp(name, server) ?? (scope ? projectRelativePath(name, server) : null)
      if (error) throw new ConfigError(`${origin}: ${error}`)
      server = normalizeMcp(server)
      return { name, server, ...(scope && { scope }), origin }
    }),
  )
  if (errors.length) throw new ConfigError(errors)
  // A Hook group is written to settings exactly as the user wrote it, so it is taken from the input, not the parse output.
  const rawHooks = (doc.spec?.hooks ?? {}) as Record<string, HookGroup | false>
  const hooks = Object.keys(spec.hooks ?? {}).flatMap((name) => (rawHooks[name] === false ? [] : [{ name, group: rawHooks[name]!, origin }]))
  return { marketplaces, plugins, items, mcpServers, hooks }
}

/** One `<origin>: <message>` line per issue, entries in parse order, each entry's unknown keys first. */
function issueLines(issues: z.core.$ZodIssue[], spec: unknown, origin: string): string[] {
  return unknownKeysFirst(flatten(issues, [])).map((iss) => `${origin}: ${fill(iss.message, iss.path, spec)}`)
}

/** Within one entry (a marketplace, plugin, item entry, MCP server or hook), a typo like `enable` reads better as an unknown key. */
function unknownKeysFirst(issues: z.core.$ZodIssue[]): z.core.$ZodIssue[] {
  const entry = (iss: z.core.$ZodIssue) => JSON.stringify(iss.path.slice(0, 2))
  const entries = uniq(issues.map(entry))
  const unknown = (iss: z.core.$ZodIssue) => Number(iss.code !== 'unrecognized_keys')
  return issues.toSorted((a, b) => entries.indexOf(entry(a)) - entries.indexOf(entry(b)) || unknown(a) - unknown(b))
}

/** A union's issues from the branch that took the input's type (not a root type mismatch), else the union's own. */
function flatten(issues: z.core.$ZodIssue[], base: PropertyKey[]): z.core.$ZodIssue[] {
  return issues.flatMap((iss) => {
    const path = [...base, ...iss.path]
    if (iss.code === 'invalid_union') {
      const rootMismatch = (b: z.core.$ZodIssue[]) => b.some((e) => e.path.length === 0 && (e.code === 'invalid_type' || e.code === 'invalid_value'))
      const branch = iss.errors.find((b) => !rootMismatch(b))
      if (branch) return flatten(branch, path)
    }
    if (iss.code === 'invalid_key') return flatten(iss.issues as z.core.$ZodIssue[], path)
    return [{ ...iss, path }]
  })
}

/** `{}` → the quoted subject named by `path` (a map key, a list element, or an item entry's `source`); `{n}` → the handler number. */
function fill(message: string, path: PropertyKey[], spec: unknown): string {
  const [section, at] = path
  const container = (spec as Record<string, unknown> | null)?.[section as string]
  let subject: unknown = at
  if (Array.isArray(container)) {
    const entry = container[at as number]
    subject = isRecord(entry) ? entry.source : entry
  }
  const n = path.findLast((p) => typeof p === 'number')
  return message.replaceAll('{}', `"${String(subject)}"`).replaceAll('{n}', String(Number(n) + 1))
}

export type PresetDocument = { kind?: string; metadata?: { name?: string }; spec?: { presets?: unknown; extends?: unknown; marketplaces?: unknown; plugins?: unknown; mcpServers?: unknown; hooks?: unknown } & { [K in ItemKind as `${K}s`]?: unknown } }

const SPEC_KEYS = Object.keys(SpecShape.def.shape)
/** The keys a Preset's `spec` may carry; the parser rejects any other. Hooks in Presets wait for hooks ticket 03. */
export const PRESET_SPEC_KEYS: readonly string[] = ['extends', ...without(SPEC_KEYS, 'hooks')]
/** The keys a Config's `spec` may carry; the parser rejects any other. */
export const CONFIG_SPEC_KEYS: readonly string[] = ['presets', ...SPEC_KEYS]

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

/** `extends`/`presets` take a single reference or a list. */
const PresetRefs = z.pipe(z.nullish(z.union([z.pipe(z.string(), z.transform((ref) => [ref])), z.array(z.string())])), z.transform((refs) => refs ?? []))

/**
 * The Presets a document refers to: `spec.presets` for a Config (Preset selection), `spec.extends` for a Preset
 * (Inheritance). Throws when the document uses the other key or any key its kind does not take.
 */
export function presetRefs(doc: PresetDocument, kind: 'Config' | 'Preset', label: string): string[] {
  checkSpecKeys(doc, kind, label)
  const key = kind === 'Config' ? 'presets' : 'extends'
  const refs = PresetRefs.safeParse(doc.spec?.[key])
  if (!refs.success) throw new ConfigError(`${label}: \`spec.${key}\` must be a preset reference or a list of them`)
  return refs.data
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
