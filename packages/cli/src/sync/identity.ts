import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import type { Conflict, ItemSource, KnownEntry, ManagedEntry, MarketplaceDeclaration, MarketplaceSource, PluginDeclaration, Scope } from './types.js'

export function sameSource(a: MarketplaceSource, b: MarketplaceSource): boolean {
  return isDeepStrictEqual(a, b)
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

/**
 * Whether two sources yield the same install. The `path` of a `directory`/`file` source is compared after resolving it
 * against the Config directory, since `ap` writes it relative while `claude` writes it absolute.
 */
export function sameInstall(a: MarketplaceSource, b: MarketplaceSource, cwd: string): boolean {
  return sameSource(absolute(a, cwd), absolute(b, cwd))
}

function absolute(source: MarketplaceSource, cwd: string): MarketplaceSource {
  const local = source.source === 'directory' || source.source === 'file'
  return local && typeof source.path === 'string' ? { ...source, path: resolve(cwd, source.path) } : source
}

/** Whether a declaration points to this marketplace: by name, or by source for a Shorthand declaration whose name is still unknown. */
export function identifies(declaration: MarketplaceDeclaration, marketplace: { name: string; source: MarketplaceSource }) {
  return declaration.name ? declaration.name === marketplace.name : sameSource(declaration.source, marketplace.source)
}

/** The name of the marketplace a declaration points to; for a Shorthand declaration with no known name, look it up by source in the Lock/State, then in settings. */
export function knownName(declaration: MarketplaceDeclaration, managed: ManagedEntry[], actual: KnownEntry[]): string | null {
  return (
    declaration.name ??
    managed.find((m) => identifies(declaration, m))?.name ??
    actual.find((e) => sameSource(e.source, declaration.source))?.name ??
    null
  )
}

export function missingMarketplaceConflict(plugin: PluginDeclaration): Conflict {
  return {
    name: plugin.id,
    reason: 'missing-marketplace',
    detail: `${plugin.origin} enables "${plugin.id}" but no preset or Config declares a marketplace named "${plugin.marketplace}"`,
    group: {
      title: `marketplace "${plugin.marketplace}" is not declared, but these plugins use it`,
      hint: 'declare it under spec.marketplaces in a preset or the Config',
      origin: plugin.origin,
      item: plugin.id.slice(0, plugin.id.lastIndexOf('@')),
    },
  }
}

export function manualEntryConflict(name: string, why = 'a different source'): Conflict {
  return {
    name,
    reason: 'manual-entry',
    detail: `settings already has a manual entry "${name}" with ${why}; use --force to overwrite`,
  }
}

export function sharedClashConflict(name: string, config: string): Conflict {
  return {
    name,
    reason: 'shared-clash',
    detail: `${config} declares "${name}" differently in user scope; declare it the same way in both Configs`,
  }
}

export function crossScopeConflict(name: string, scope: Scope): Conflict {
  return {
    name,
    reason: 'cross-scope',
    detail: `${scope} settings declares "${name}" from another source, and Claude Code installs one marketplace per name for the whole machine; rename or remove one of them`,
  }
}
