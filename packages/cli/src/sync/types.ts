export type Scope = 'project' | 'local' | 'user'

/** A `source` value in `extraKnownMarketplaces`, e.g. `{ source: 'github', repo: 'owner/repo' }`. */
export type MarketplaceSource = { source: string; [field: string]: unknown }

/** A resolved Marketplace declaration. `name` is null for a Shorthand declaration such as `owner/repo`. */
export type MarketplaceDeclaration = {
  name: string | null
  source: MarketplaceSource
  extras: Record<string, unknown>
  /** `user` for a User-scoped marketplace (ADR 0011); absent means the Scope the Sync targets. */
  scope?: 'user'
  origin: string
}

/** A merged Plugin declaration: `id` is `name@marketplace`, `marketplace` is its suffix. */
export type PluginDeclaration = {
  id: string
  marketplace: string
  enabled: boolean
  /** `user` for a User-scoped plugin (ADR 0012), always `enabled`; absent means the Scope the Sync targets. */
  scope?: 'user'
  origin: string
}

/** A Scope's Plugin entry (a key in `enabledPlugins`), plus whether that Scope has an Installed plugin. */
export type PluginEntry = { id: string; enabled: boolean | undefined; installed: boolean }

/** A Plugin entry managed by `ap`, recorded in the Lock/State. */
export type ManagedPlugin = { id: string; enabled: boolean; origin: string }

/** A Plugin entry a Config declares at the user scope, and the same claim made by another Config. */
export type PluginClaim = { id: string; enabled: boolean; origin: string }
export type SharedPluginClaim = PluginClaim & { config: string }

/** Kinds of item `ap` fetches from a source and copies into a Scope's directory (ADR 0005), in Sync order and Lock/State order. */
export const ITEM_KINDS = ['skill', 'agent', 'rule', 'workflow'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

/** One value per item kind. */
export type ByKind<T> = Record<ItemKind, T>

export function byKind<T>(make: (kind: ItemKind) => T): ByKind<T> {
  return Object.fromEntries(ITEM_KINDS.map((kind) => [kind, make(kind)])) as ByKind<T>
}

/** A parsed Skill source, Agent source or Rule source: `github`, `git` (with `ref` if any) or `directory`. */
export type ItemSource = MarketplaceSource
export type SkillSource = ItemSource

/** The selected Skill/Agent names, or everything in the source except the names in `exclude` (`exclude: []` means all). */
export type Selection = string[] | { exclude: string[] }

/**
 * A Skill declaration or Agent declaration merged by source.
 * `presets` are the Presets that declared it (`null` is the Config), `shadows` are the Presets it wins over (`'*'`: every
 * Preset), used to settle the case where two different sources yield the same name.
 */
export type ItemDeclaration = {
  source: ItemSource
  select: Selection
  /** `user`: a User-scoped item, synced to the `user` Scope whatever Scope the Sync targets (ADR 0013). */
  scope?: 'user'
  origin: string
  presets: (string | null)[]
  shadows: string[]
}

/**
 * An Installed skill/agent managed by `ap` and the `sha256` of its content. The installed commit lives in the Source
 * catalog; a per-item `commit` only appears in an old Lock/State, and is read to learn the pinned commit and dropped when
 * written back.
 */
export type ManagedItem = { name: string; source: ItemSource; sha256: string; origin: string; commit?: string | null }

/**
 * Source catalog: the names of every item of one kind in a `github`/`git` source at the pinned commit, including ones
 * not installed. `blocked`: names present in the source that cannot be installed standalone (plugin-bound Workflows,
 * ADR 0010).
 */
export type SourceCatalog = { source: ItemSource; commit: string; names: string[]; blocked?: string[] }

/** A Skill/Agent a Config declares at the user scope, and the same claim made by another Config. */
export type ItemClaim = { name: string; source: ItemSource; origin: string }
export type SharedItemClaim = ItemClaim & { config: string }

/** An entry in the settings' `extraKnownMarketplaces`. */
export type KnownEntry = {
  name: string
  source: MarketplaceSource
  extras: Record<string, unknown>
}

/** A Known marketplace entry of a Scope other than the one being synced. */
export type ScopedEntry = KnownEntry & { scope: Scope }

/** A Managed entry recorded in the Lock/State. */
export type ManagedEntry = {
  name: string
  source: MarketplaceSource
  origin: string
}

/** A name a Config declares at the user scope, even when it does not own the entry (ADR 0003). */
export type Claim = {
  name: string
  source: MarketplaceSource
  extras: Record<string, unknown>
  origin: string
}

/** A claim by another Config that shares the user scope's settings. */
export type SharedClaim = Claim & { config: string }

export type Conflict = {
  name: string
  reason:
    | 'manual-entry'
    | 'preset-clash'
    | 'shared-clash'
    | 'cross-scope'
    | 'missing-marketplace'
    | 'missing-skill'
    | 'modified-skill'
    | 'missing-agent'
    | 'modified-agent'
    | 'missing-rule'
    | 'modified-rule'
    | 'missing-workflow'
    | 'modified-workflow'
    | 'plugin-workflow'
  detail: string
  /** The cause shared by conflicts of the same reason, without the name; `ap sync` lists such conflicts once under it. */
  cause?: string
}

/** An MCP server config in Claude Code's exact `.mcp.json` format (`command`/`args`/`env` or `type` + `url`/`headers`). */
export type McpConfig = Record<string, unknown>

/** An MCP server declaration, resolved (looked up in the MCP catalog when `true`) and merged. */
export type McpDeclaration = {
  name: string
  server: McpConfig
  /** `user` for a User-scoped MCP server (ADR 0014); absent means the Scope the Sync targets. */
  scope?: 'user'
  origin: string
}

/** An Installed MCP server managed by `ap`, recorded in the Lock/State. */
export type ManagedMcp = { name: string; server: McpConfig; origin: string }

/** An MCP server a Config declares at the user scope, and the same claim made by another Config. */
export type McpClaim = { name: string; server: McpConfig; origin: string }
export type SharedMcpClaim = McpClaim & { config: string }

/** A handler in a matcher group, in Claude Code's exact format; every field besides `type` is kept verbatim. */
export type HookHandler = { type: string; [field: string]: unknown }

/** A Hook: a matcher group (`matcher`, `hooks`) together with the event that holds it under the settings' `hooks` key. */
export type HookGroup = { event: string; matcher?: string; hooks: HookHandler[] }

/** A resolved Hook declaration: `group` is kept exactly as the user wrote it, so it is written to settings verbatim. */
export type HookDeclaration = { name: string; group: HookGroup; origin: string }

/** An Installed hook managed by `ap`, recorded in the Lock/State: the normalized group, so it can be recognized in settings by content. */
export type ManagedHook = { name: string; group: HookGroup; origin: string }
