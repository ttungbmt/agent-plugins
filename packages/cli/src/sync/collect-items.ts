import { sameSource } from './identity.js'
import type { InstalledItem, ItemHandler } from './items.js'
import type { DesiredItem } from './plan-items.js'
import { describeItemSource, outranks, withoutRef } from './resolve.js'
import { sourceRoot, type FetchedSource, type FetchSkillSource } from './skills.js'
import type { Conflict, ItemDeclaration, ItemSource, ManagedItem, SourceCatalog } from './types.js'

export type CollectedItems = {
  desired: DesiredItem[]
  /** Tên đang xung đột hoặc thuộc nguồn chưa tải được: Bản cài của chúng được giữ nguyên. */
  held: Set<string>
  conflicts: Conflict[]
  notices: string[]
  /** `--dry-run`/`--check`: nguồn chưa từng tải nên chưa biết có gì. */
  unknown: ItemSource[]
  /** Nguồn không tải được khi apply. */
  failures: { source: ItemSource; error: string }[]
  fetched: FetchedSource[]
  /** Danh mục nguồn cần ghi lại: của nguồn vừa tải, hoặc giữ nguyên với nguồn không cần tải, đang xung đột hay tải lỗi. */
  catalogs: SourceCatalog[]
}

/**
 * Xác định các Skill (hoặc Agent) cần có từ Khai báo skill (Khai báo agent). Nguồn `github`/`git` đã có Danh mục nguồn
 * thì chỉ được tải lại khi Lock/State không đủ: `--update`, có thứ cần cài mà chưa có trên đĩa hoặc là bản cài tay,
 * hay `--force` ghi đè bản bị sửa tay.
 * Khi tải thì lấy đúng commit đã ghim (mới nhất với `--update`). Nguồn `directory` luôn được đọc lại. Ở `--dry-run`/`--check`
 * (`fetch` null) thì không tải gì. `blocked` là nhãn các nguồn đang preset-clash: Managed entry của chúng được giữ nguyên.
 */
export async function collectItems(
  handler: ItemHandler,
  declarations: ItemDeclaration[],
  managed: ManagedItem[],
  opts: {
    catalogs: SourceCatalog[]
    installed: InstalledItem[]
    fetch: FetchSkillSource | null
    update: boolean
    force: boolean
    blocked: Set<string>
    onFetch?: (source: ItemSource, run: () => Promise<void>) => Promise<void>
  },
): Promise<CollectedItems> {
  const { kind } = handler
  const result: CollectedItems = { desired: [], held: new Set(), conflicts: [], notices: [], unknown: [], failures: [], fetched: [], catalogs: [] }
  const hold = (names: string[]) => names.forEach((n) => result.held.add(n))
  const sameRepo = (a: ItemSource, b: ItemSource) => sameSource(withoutRef(a), withoutRef(b))
  for (const record of managed) {
    if (opts.blocked.has(describeItemSource(withoutRef(record.source)))) hold([record.name])
  }
  result.catalogs.push(...opts.catalogs.filter((c) => opts.blocked.has(describeItemSource(withoutRef(c.source)))))

  const candidates: (DesiredItem & { declaration: ItemDeclaration })[] = []
  for (const declaration of declarations) {
    const { source, origin, select } = declaration
    // Rule: định danh trên đĩa có Namespace ở trước, còn Danh mục nguồn và lựa chọn dùng tên trong nguồn (ADR 0009).
    const namespace = handler.namespace?.(source)
    const onDisk = (name: string) => (namespace ? `${namespace}/${name}` : name)
    const inSource = (name: string) => (namespace ? name.slice(namespace.length + 1) : name)
    const records = managed.filter((m) => sameSource(m.source, source))
    const catalog = opts.catalogs.find((c) => sameSource(c.source, source))
    const selected = (names: string[]) => (Array.isArray(select) ? select : names.filter((n) => !select.exclude.includes(n)))
    /** Chọn tên không có trong nguồn là xung đột; loại trừ tên không có chỉ cần báo. */
    const checkNames = (available: string[]) => {
      const missing = (Array.isArray(select) ? select : select.exclude).filter((n) => !available.includes(n))
      for (const name of missing) {
        if (!Array.isArray(select)) {
          result.notices.push(`${origin} excludes ${kind} "${name}" but ${describeItemSource(source)} has no such ${kind}`)
          continue
        }
        hold([onDisk(name)])
        result.conflicts.push({ name: onDisk(name), reason: `missing-${kind}`, detail: `${origin} selects ${kind} "${name}" but ${describeItemSource(source)} has no such ${kind}` })
      }
      return selected(available).filter((n) => available.includes(n))
    }
    /** Thứ lấy nội dung từ Lock/State, không cần tải; `null` khi Lock/State không đủ để quyết định. */
    const fromRecords = (names: string[]) =>
      names.map(onDisk).map((name) => {
        const record = records.find((r) => r.name === name)
        return { name, source, sha256: record?.sha256 ?? null, from: null, origin, declaration }
      })

    if (!opts.fetch) {
      if (catalog) {
        candidates.push(...fromRecords(checkNames(catalog.names)))
        continue
      }
      if (!Array.isArray(select) && records.length === 0) {
        result.unknown.push(source)
        hold(managed.filter((m) => sameRepo(m.source, source)).map((m) => m.name))
        continue
      }
      candidates.push(...fromRecords(selected(records.map((r) => inSource(r.name)))))
      continue
    }

    if (catalog && !opts.update) {
      const names = selected(catalog.names).filter((n) => catalog.names.includes(n))
      const needsContent = names.map(onDisk).some((name) => {
        const record = records.find((r) => r.name === name)
        const entry = opts.installed.find((e) => e.name === name)
        return !record || !entry || (opts.force && entry.sha256 !== record.sha256)
      })
      if (!needsContent) {
        candidates.push(...fromRecords(checkNames(catalog.names)))
        result.catalogs.push(catalog)
        continue
      }
    }

    const pinned = opts.update ? null : (catalog?.commit ?? records.find((r) => r.commit)?.commit ?? null)
    try {
      let fetched: FetchedSource | undefined
      const run = async () => {
        fetched = await opts.fetch!(source, pinned)
      }
      await (opts.onFetch ? opts.onFetch(source, run) : run())
      result.fetched.push(fetched!)
      const found = await handler.find(sourceRoot(fetched!, source), source)
      if (fetched!.commit) result.catalogs.push({ source, commit: fetched!.commit, names: found.map((f) => f.name) })
      for (const name of checkNames(found.map((f) => f.name))) {
        const item = found.find((f) => f.name === name)!
        candidates.push({ name: onDisk(name), source, sha256: item.sha256, from: item.path, origin, declaration })
      }
    } catch (error) {
      result.failures.push({ source, error: (error as Error).message })
      if (catalog) result.catalogs.push(catalog)
      hold(managed.filter((m) => sameRepo(m.source, source)).map((m) => m.name))
      if (Array.isArray(select)) hold(select.map(onDisk))
    }
  }

  // Hai nguồn cùng cho ra một tên: phân xử như trùng khai báo marketplace.
  const names = [...new Set(candidates.map((c) => c.name))]
  for (const name of names) {
    const group = candidates.filter((c) => c.name === name)
    const winners = group.filter((c) => !group.some((o) => o !== c && outranks(o.declaration, c.declaration)))
    const [winner, ...rest] = winners
    const rival = rest.find((c) => !sameSource(c.source, winner!.source))
    if (rival) {
      hold([name])
      result.conflicts.push({
        name,
        reason: 'preset-clash',
        detail: `${kind} "${name}" comes from both ${describeItemSource(winner!.source)} (${winner!.origin}) and ${describeItemSource(rival.source)} (${rival.origin})`,
      })
      continue
    }
    for (const loser of group.filter((c) => !winners.includes(c) && !sameSource(c.source, winner!.source))) {
      result.notices.push(`${winner!.origin} overrides ${kind} "${name}" from ${describeItemSource(loser.source)} declared by ${loser.origin}`)
    }
    const { declaration: _, ...desired } = winner!
    result.desired.push(desired)
  }
  return result
}
