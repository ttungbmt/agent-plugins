import { parse } from 'yaml'
import type { Location } from './files.js'
import type { ItemKind, ItemSource, Scope } from './types.js'

/** A Skill/Agent found in a fetched source: `path` is the Skill directory or Agent file, for copying. */
/** `blocked`: why it can't be installed on its own (plugin-bound Workflow); it still appears in the Source catalog. */
export type FoundItem = { name: string; path: string; sha256: string; blocked?: string }

/**
 * An Installed skill/agent in a Scope's directory. `symlink`: created by another tool (e.g. `npx skills`).
 * `files`: Workflows only (identified by `meta.name`, not the file name, ADR 0010) — every file with this name, the first
 * being the Installed workflow; with two or more files Claude Code can only run one.
 */
export type InstalledItem = { name: string; symlink: boolean; sha256: string; files?: string[] }

/**
 * How one kind of thing is fetched from a source and installed into a Scope (ADR 0005): a Skill is a `<name>/SKILL.md`
 * directory, an Agent a `<name>.md` file. Source fetching, the Source catalog and ownership rules are shared by all kinds.
 */
export type ItemHandler = {
  kind: ItemKind
  /** The directory Claude Code reads for each Scope; `null` when the Scope has none (the `local` scope). */
  dir(scope: Scope, location: Location): string | null
  /** Finds the things in `root` (the fetched source root, or its `path`). */
  find(root: string, source: ItemSource): Promise<FoundItem[]>
  /**
   * Rules only (ADR 0009): the subdirectory that everything from `source` is installed into. The on-disk identity
   * (Lock/State, Installed rule) is `<namespace>/<name in source>`, while the Source catalog and the declaration's
   * selection use the name in the source.
   */
  namespace?(source: ItemSource): string
  /** `namespaces`: Namespaces currently declared or present in Lock/State; only used by kinds with a `namespace`. */
  list(dir: string, namespaces: string[]): Promise<InstalledItem[]>
  /** Replaces the installed `name` with a copy of `from`. An old symlink is only unlinked, leaving its target untouched. */
  install(from: string, dir: string, name: string): Promise<void>
  remove(dir: string, name: string): Promise<void>
}

export const ITEM_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * The frontmatter `name` of `text`; `undefined` when there is no frontmatter. Frontmatter that is not valid YAML (e.g.
 * `description: Use when: ...` without quotes) is still loaded by Claude Code, so in that case the `name:` line is read
 * instead of failing the whole source.
 */
export function frontmatterName(text: string): string | undefined {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1]
  if (front === undefined) return undefined
  let name: unknown
  try {
    name = (parse(front) as { name?: unknown } | null)?.name
  } catch {
    name = /^name:[ \t]*(['"]?)(.*?)\1[ \t]*$/m.exec(front)?.[2]
  }
  return typeof name === 'string' && name ? name : undefined
}
