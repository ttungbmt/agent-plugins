import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readJson, settingsPath, writeJson, type Location } from './files.js'
import { manualEntryConflict, sameSource } from './identity.js'
import type { Conflict, KnownEntry, MarketplaceDeclaration, Scope } from './types.js'

export type Exec = (command: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>

export class ConflictError extends Error {
  constructor(readonly conflict: Conflict) {
    super(conflict.detail)
  }
}

/** Known marketplace entry của từng Scope; ghi qua CLI `claude` (ADR 0001). */
export function createRegistry({ exec, ...location }: { exec: Exec } & Location) {
  const readSettings = (scope: Scope) => readJson<Record<string, any>>(settingsPath(scope, location))

  async function runMarketplaceCommand(...args: string[]) {
    const result = await exec('claude', ['plugin', 'marketplace', ...args])
    if (result.code !== 0) throw new Error(result.stderr.trim() || `claude ${args.join(' ')} exited with ${result.code}`)
  }

  async function list(scope: Scope): Promise<KnownEntry[]> {
    const known = (await readSettings(scope)).extraKnownMarketplaces ?? {}
    return Object.entries(known).map(([name, { source, ...extras }]: [string, any]) => ({ name, source, extras }))
  }

  async function writeEntry(scope: Scope, name: string, entry: Record<string, unknown>) {
    const settings = await readSettings(scope)
    settings.extraKnownMarketplaces = { ...settings.extraKnownMarketplaces, [name]: entry }
    await writeJson(settingsPath(scope, location), settings)
  }

  /**
   * Khai báo marketplace qua `claude plugin marketplace add`. Tên do claude resolve; nếu tên đó đè lên
   * một entry khác source mà `mayReplace` không cho phép, entry cũ được khôi phục và ném ConflictError.
   */
  async function put(
    declaration: MarketplaceDeclaration,
    scope: Scope,
    { mayReplace }: { mayReplace: (name: string) => boolean },
  ): Promise<{ name: string }> {
    const before = await list(scope)
    await runMarketplaceCommand('add', addArgument(declaration), '--scope', scope)
    const after = await list(scope)
    const changed = after.find((e) => !before.some((b) => isDeepStrictEqual(b, e)))
    const name = declaration.name ?? changed?.name
    if (!name) throw new Error(`claude did not declare a marketplace for ${addArgument(declaration)}`)

    const previous = before.find((b) => b.name === name)
    if (previous && !sameSource(previous.source, declaration.source) && !mayReplace(name)) {
      await writeEntry(scope, name, { source: previous.source, ...previous.extras })
      throw new ConflictError(manualEntryConflict(name))
    }
    await patch(declaration, name, scope)
    return { name }
  }

  /** Ghi entry đúng như khai báo: `source` (giữ `path` tương đối) và đúng các field phụ đã khai báo. */
  async function patch(declaration: MarketplaceDeclaration, name: string, scope: Scope): Promise<void> {
    await writeEntry(scope, name, { source: declaration.source, ...declaration.extras })
  }

  async function remove(name: string, scope: Scope): Promise<void> {
    await runMarketplaceCommand('remove', name, '--scope', scope)
  }

  function addArgument({ source }: MarketplaceDeclaration): string {
    switch (source.source) {
      case 'github':
        return source.repo as string
      case 'git':
      case 'url':
        return source.url as string
      case 'directory':
      case 'file':
        return resolve(location.cwd, source.path as string)
      default:
        throw new Error(`unsupported marketplace source "${source.source}"`)
    }
  }

  return { list, put, patch, remove }
}
