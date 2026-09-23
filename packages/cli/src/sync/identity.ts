import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import type { Conflict, KnownEntry, ManagedEntry, MarketplaceDeclaration, MarketplaceSource, PluginDeclaration, Scope } from './types.js'

export function sameSource(a: MarketplaceSource, b: MarketplaceSource): boolean {
  return isDeepStrictEqual(a, b)
}

/**
 * Hai source có cho ra cùng một bản cài không. `path` của nguồn `directory`/`file` được so sau khi quy về
 * tuyệt đối theo thư mục Config, vì `ap` ghi nó tương đối còn `claude` ghi tuyệt đối.
 */
export function sameInstall(a: MarketplaceSource, b: MarketplaceSource, cwd: string): boolean {
  return sameSource(absolute(a, cwd), absolute(b, cwd))
}

function absolute(source: MarketplaceSource, cwd: string): MarketplaceSource {
  const local = source.source === 'directory' || source.source === 'file'
  return local && typeof source.path === 'string' ? { ...source, path: resolve(cwd, source.path) } : source
}

/** Khai báo có chỉ tới marketplace này không: theo tên, hoặc theo source với dạng rút gọn chưa biết tên. */
export function identifies(declaration: MarketplaceDeclaration, marketplace: { name: string; source: MarketplaceSource }) {
  return declaration.name ? declaration.name === marketplace.name : sameSource(declaration.source, marketplace.source)
}

/** Tên của marketplace một khai báo chỉ tới; dạng rút gọn chưa biết tên thì tra theo source trong Lock/State, rồi trong settings. */
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
