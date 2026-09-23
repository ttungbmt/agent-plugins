import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readJson, SCOPES, settingsPath, writeJson, type Location } from './files.js'
import { crossScopeConflict, manualEntryConflict, sameInstall, sameSource } from './identity.js'
import type { Conflict, KnownEntry, MarketplaceDeclaration, MarketplaceSource, Scope, ScopedEntry } from './types.js'

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

  /** Entry của các scope còn lại: chúng dùng chung bản cài với scope đang sync. */
  async function listElsewhere(scope: Scope): Promise<ScopedEntry[]> {
    const others = SCOPES.filter((s) => s !== scope)
    return (await Promise.all(others.map(async (s) => (await list(s)).map((e) => ({ ...e, scope: s }))))).flat()
  }

  async function writeEntry(scope: Scope, name: string, entry: Record<string, unknown> | undefined) {
    const settings = await readSettings(scope)
    const { [name]: _, ...rest } = settings.extraKnownMarketplaces ?? {}
    settings.extraKnownMarketplaces = entry ? { ...rest, [name]: entry } : rest
    await writeJson(settingsPath(scope, location), settings)
  }

  /** Cài lại một entry có sẵn: `add` lại nguồn của nó để bản cài chung trỏ về đó, rồi ghi lại entry nguyên dạng. */
  async function reinstall(scope: Scope, entry: KnownEntry) {
    await runMarketplaceCommand('add', sourceArgument(entry.source), '--scope', scope)
    await writeEntry(scope, entry.name, { source: entry.source, ...entry.extras })
  }

  /**
   * Khai báo marketplace qua `claude plugin marketplace add`. Tên do claude resolve; nếu tên đó đè lên
   * một entry khác source mà `mayReplace` không cho phép, hoặc trùng tên khác source với entry của scope khác
   * (dạng rút gọn chỉ biết tên sau `add`), entry cũ và bản cài của nó được khôi phục rồi ném ConflictError.
   */
  async function put(
    declaration: MarketplaceDeclaration,
    scope: Scope,
    { mayReplace }: { mayReplace: (name: string) => boolean },
  ): Promise<{ name: string }> {
    const before = await list(scope)
    const elsewhere = await listElsewhere(scope)
    await runMarketplaceCommand('add', sourceArgument(declaration.source), '--scope', scope)
    const after = await list(scope)
    const changed = after.find((e) => !before.some((b) => isDeepStrictEqual(b, e)))
    const name = declaration.name ?? changed?.name
    if (!name) throw new Error(`claude did not declare a marketplace for ${sourceArgument(declaration.source)}`)

    const previous = before.find((b) => b.name === name)
    const other = elsewhere.find((e) => e.name === name && !sameInstall(e.source, declaration.source, location.cwd))
    if (other) {
      await writeEntry(scope, name, previous && { source: previous.source, ...previous.extras })
      await reinstall(other.scope, other)
      throw new ConflictError(crossScopeConflict(name, other.scope))
    }
    if (previous && !sameSource(previous.source, declaration.source) && !mayReplace(name)) {
      await reinstall(scope, previous)
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

  function sourceArgument(source: MarketplaceSource): string {
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

  return { list, listElsewhere, put, patch, remove }
}
