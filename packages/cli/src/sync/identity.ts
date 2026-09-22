import { isDeepStrictEqual } from 'node:util'
import type { Conflict, MarketplaceDeclaration, MarketplaceSource } from './types.js'

export function sameSource(a: MarketplaceSource, b: MarketplaceSource): boolean {
  return isDeepStrictEqual(a, b)
}

/** Khai báo có chỉ tới marketplace này không: theo tên, hoặc theo source với dạng rút gọn chưa biết tên. */
export function identifies(declaration: MarketplaceDeclaration, marketplace: { name: string; source: MarketplaceSource }) {
  return declaration.name ? declaration.name === marketplace.name : sameSource(declaration.source, marketplace.source)
}

export function manualEntryConflict(name: string, why = 'a different source'): Conflict {
  return {
    name,
    reason: 'manual-entry',
    detail: `settings already has a manual entry "${name}" with ${why}; use --force to overwrite`,
  }
}
