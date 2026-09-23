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
  reason: 'manual-entry' | 'preset-clash' | 'shared-clash' | 'cross-scope'
  detail: string
}
