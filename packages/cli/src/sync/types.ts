export type Scope = 'project' | 'local' | 'user'

/** Giá trị `source` trong `extraKnownMarketplaces`, ví dụ `{ source: 'github', repo: 'owner/repo' }`. */
export type MarketplaceSource = { source: string; [field: string]: unknown }

/** Khai báo marketplace đã phân giải. `name` là null khi khai báo dạng rút gọn `owner/repo`. */
export type MarketplaceDeclaration = {
  name: string | null
  source: MarketplaceSource
  extras: Record<string, unknown>
  origin: string
}

/** Khai báo plugin đã gộp: `id` là `name@marketplace`, `marketplace` là hậu tố của nó. */
export type PluginDeclaration = {
  id: string
  marketplace: string
  enabled: boolean
  origin: string
}

/** Plugin entry của một Scope (khoá trong `enabledPlugins`), kèm việc Scope đó có Bản cài plugin hay không. */
export type PluginEntry = { id: string; enabled: boolean | undefined; installed: boolean }

/** Plugin entry do `ap` quản lý, ghi trong Lock/State. */
export type ManagedPlugin = { id: string; enabled: boolean; origin: string }

/** Plugin entry một Config khai báo ở scope user, và claim đó của Config khác. */
export type PluginClaim = { id: string; enabled: boolean; origin: string }
export type SharedPluginClaim = PluginClaim & { config: string }

/** Loại thứ `ap` tự tải từ một nguồn và copy vào thư mục của Scope (ADR 0005), theo thứ tự sync và thứ tự trong Lock/State. */
export const ITEM_KINDS = ['skill', 'agent', 'rule'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

/** Một giá trị cho mỗi loại item. */
export type ByKind<T> = Record<ItemKind, T>

export function byKind<T>(make: (kind: ItemKind) => T): ByKind<T> {
  return Object.fromEntries(ITEM_KINDS.map((kind) => [kind, make(kind)])) as ByKind<T>
}

/** Nguồn skill, Nguồn agent hoặc Nguồn rule đã đọc: `github`, `git` (kèm `ref` nếu có) hoặc `directory`. */
export type ItemSource = MarketplaceSource
export type SkillSource = ItemSource

/** Tên các Skill/Agent được chọn, hoặc mọi thứ trong nguồn trừ các tên trong `exclude` (`exclude: []` là tất cả). */
export type Selection = string[] | { exclude: string[] }

/**
 * Khai báo skill hoặc Khai báo agent đã gộp theo nguồn.
 * `presets` là Preset đã khai báo nó (`null` là Config), `shadows` là các Preset nó thắng (`'*'`: mọi Preset),
 * để phân xử khi hai nguồn khác nhau cho ra cùng một tên.
 */
export type ItemDeclaration = {
  source: ItemSource
  select: Selection
  origin: string
  presets: (string | null)[]
  shadows: string[]
}

/**
 * Bản cài skill/agent do `ap` quản lý và `sha256` nội dung của nó. Commit đã cài nằm ở Danh mục nguồn; `commit` trên
 * từng mục chỉ có ở Lock/State cũ, được đọc để biết commit đã ghim và bỏ đi khi ghi lại.
 */
export type ManagedItem = { name: string; source: ItemSource; sha256: string; origin: string; commit?: string | null }

/** Danh mục nguồn: tên mọi Skill (hoặc Agent) trong một nguồn `github`/`git` ở commit đã ghim, kể cả thứ không được cài. */
export type SourceCatalog = { source: ItemSource; commit: string; names: string[] }

/** Skill/Agent một Config khai báo ở scope user, và claim đó của Config khác. */
export type ItemClaim = { name: string; source: ItemSource; origin: string }
export type SharedItemClaim = ItemClaim & { config: string }

/** Một mục trong `extraKnownMarketplaces` của settings. */
export type KnownEntry = {
  name: string
  source: MarketplaceSource
  extras: Record<string, unknown>
}

/** Known marketplace entry của một Scope khác Scope đang sync. */
export type ScopedEntry = KnownEntry & { scope: Scope }

/** Managed entry ghi trong Lock/State. */
export type ManagedEntry = {
  name: string
  source: MarketplaceSource
  origin: string
}

/** Tên một Config khai báo ở scope user, kể cả khi nó không sở hữu entry (ADR 0003). */
export type Claim = {
  name: string
  source: MarketplaceSource
  extras: Record<string, unknown>
  origin: string
}

/** Claim của một Config khác cùng dùng settings của scope user. */
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
  detail: string
}

/** Cấu hình một MCP server đúng định dạng `.mcp.json` của Claude Code (`command`/`args`/`env` hoặc `type` + `url`/`headers`). */
export type McpConfig = Record<string, unknown>

/** Khai báo MCP server đã phân giải (tra Danh mục MCP nếu là `true`) và đã gộp. */
export type McpDeclaration = { name: string; server: McpConfig; origin: string }

/** Bản cài MCP server do `ap` quản lý, ghi trong Lock/State. */
export type ManagedMcp = { name: string; server: McpConfig; origin: string }

/** MCP server một Config khai báo ở scope user, và claim đó của Config khác. */
export type McpClaim = { name: string; server: McpConfig; origin: string }
export type SharedMcpClaim = McpClaim & { config: string }
