import { describeItemSource, sameSource, withoutRef } from './identity.js'
import type { InstalledItem, ItemHandler } from './items.js'
import type { DesiredItem } from './plan-items.js'
import { outranks } from './resolve.js'
import { sourceRoot, type FetchedSource, type FetchSkillSource } from './skills.js'
import type { Conflict, ItemDeclaration, ItemSource, ManagedItem, SourceCatalog } from './types.js'

export type CollectedItems = {
  desired: DesiredItem[]
  /** Names in conflict or belonging to a source that could not be fetched: their installed copies are kept as is. */
  held: Set<string>
  conflicts: Conflict[]
  notices: string[]
  /** `--dry-run`/`--check`: the source was never fetched, so its contents are unknown. */
  unknown: ItemSource[]
  /** Sources that failed to fetch during apply. */
  failures: { source: ItemSource; error: string }[]
  fetched: FetchedSource[]
  /** Source catalogs to record: from sources just fetched, or kept as is for sources that needed no fetch, conflict or failed. */
  catalogs: SourceCatalog[]
}

/**
 * Determines the Skills (or Agents) needed from the Skill declarations (Agent declarations). A `github`/`git` source that
 * already has a Source catalog is only fetched again when Lock/State is not enough: `--update`, something to install is
 * missing on disk or is a manual install, or `--force` overwrites a manually edited copy.
 * A fetch takes exactly the pinned commit (the latest with `--update`). `directory` sources are always re-read. In
 * `--dry-run`/`--check` (`fetch` null) nothing is fetched. `blocked` labels sources in a preset clash: their Managed
 * entries are kept as is.
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
    // Rules: the on-disk identity is prefixed with the Namespace, while the Source catalog and selection use the name in the source (ADR 0009).
    const namespace = handler.namespace?.(source)
    const onDisk = (name: string) => (namespace ? `${namespace}/${name}` : name)
    const inSource = (name: string) => (namespace ? name.slice(namespace.length + 1) : name)
    const records = managed.filter((m) => sameSource(m.source, source))
    const catalog = opts.catalogs.find((c) => sameSource(c.source, source))
    /** A selection/exclusion entry is that exact name, or a folder containing it (Rules: `web` means every Rule under `web/`, ADR 0009). */
    const covers = (entry: string, name: string) => name === entry || name.startsWith(`${entry}/`)
    /** Names selected from `names`; selection entries that match no name are kept to report as missing or until the contents are known. */
    const selected = (names: string[]) =>
      Array.isArray(select)
        ? [...new Set(select.flatMap((entry) => (names.some((n) => covers(entry, n)) ? names.filter((n) => covers(entry, n)) : [entry])))]
        : names.filter((n) => !select.exclude.some((entry) => covers(entry, n)))
    /**
     * Selecting a name not in the source is a conflict; excluding a missing name only needs a notice. `blocked` things
     * (plugin-bound Workflows, ADR 0010) are never installed: selecting one by name is a conflict, while under "all" it is
     * skipped with a notice.
     */
    const checkNames = (available: string[], blocked: Map<string, string | undefined> = new Map()) => {
      const usable = (name: string) => {
        if (!blocked.has(name)) return true
        const why = blocked.get(name)
        const detail = `${kind} "${name}" from ${describeItemSource(source)} only runs inside its plugin${why ? ` (${why})` : ''}; declare that plugin instead`
        if (Array.isArray(select)) {
          hold([onDisk(name)])
          result.conflicts.push({ name: onDisk(name), reason: `plugin-${kind}` as Conflict['reason'], detail })
        } else result.notices.push(`skipped ${detail}`)
        return false
      }
      const missing = (Array.isArray(select) ? select : select.exclude).filter((entry) => !available.some((n) => covers(entry, n)))
      for (const name of missing) {
        if (!Array.isArray(select)) {
          result.notices.push(`${origin} excludes ${kind} "${name}" but ${describeItemSource(source)} has no such ${kind}`)
          continue
        }
        hold([onDisk(name)])
        result.conflicts.push({
          name: onDisk(name),
          reason: `missing-${kind}`,
          detail: `${origin} selects ${kind} "${name}" but ${describeItemSource(source)} has no such ${kind}`,
          group: {
            title: `${describeItemSource(source)} has no such ${kind}s`,
            hint: `fix the ${kind} names, or drop them from the selection`,
            origin,
            item: name,
          },
        })
      }
      return selected(available).filter((n) => available.includes(n)).filter(usable)
    }
    /** Things whose content comes from Lock/State without fetching; `null` when Lock/State is not enough to decide. */
    const fromRecords = (names: string[]) =>
      names.map(onDisk).map((name) => {
        const record = records.find((r) => r.name === name)
        return { name, source, sha256: record?.sha256 ?? null, from: null, origin, declaration }
      })

    const blockedIn = (c: SourceCatalog) => new Map((c.blocked ?? []).map((n) => [n, undefined]))
    if (!opts.fetch) {
      if (catalog) {
        candidates.push(...fromRecords(checkNames(catalog.names, blockedIn(catalog))))
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
      const names = selected(catalog.names).filter((n) => catalog.names.includes(n) && !catalog.blocked?.includes(n))
      const needsContent = names.map(onDisk).some((name) => {
        const record = records.find((r) => r.name === name)
        const entry = opts.installed.find((e) => e.name === name)
        return !record || !entry || (opts.force && entry.sha256 !== record.sha256)
      })
      if (!needsContent) {
        candidates.push(...fromRecords(checkNames(catalog.names, blockedIn(catalog))))
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
      const blocked = found.filter((f) => f.blocked !== undefined)
      if (fetched!.commit) {
        const catalog: SourceCatalog = { source, commit: fetched!.commit, names: found.map((f) => f.name) }
        if (blocked.length) catalog.blocked = blocked.map((f) => f.name)
        result.catalogs.push(catalog)
      }
      for (const name of checkNames(found.map((f) => f.name), new Map(blocked.map((f) => [f.name, f.blocked])))) {
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

  // Two sources yield the same name: resolved like duplicate marketplace declarations.
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
