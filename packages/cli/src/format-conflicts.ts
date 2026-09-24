import type { Conflict } from './sync/types.js'

/** Applies a text style such as `red` or `bold`; `util.styleText` fits, and the default leaves text plain. */
export type Style = (format: 'red' | 'bold', text: string) => string

const plain: Style = (_, text) => text

/**
 * Renders conflicts for the terminal. Conflicts sharing a `cause` are listed once under it, so eight plugins from one
 * undeclared marketplace read as one problem instead of eight near-identical lines.
 */
export function formatConflicts(conflicts: Conflict[], style: Style = plain): string {
  const groups = new Map<string, Conflict[]>()
  for (const c of conflicts) {
    const key = c.cause ? `${c.reason}\0${c.cause}` : `\0${groups.size}`
    groups.set(key, [...(groups.get(key) ?? []), c])
  }

  const heading = style('red', `✖ ${conflicts.length} ${conflicts.length === 1 ? 'conflict' : 'conflicts'}`)
  const blocks = [...groups.values()].map((group) => {
    const first = group[0]!
    return first.cause
      ? [`  ${first.cause}:`, ...group.map((c) => `    · ${style('bold', c.name)}`)]
      : [`  ${style('bold', first.name)}`, `    ${first.detail}`]
  })
  return [heading, ...blocks.flatMap((lines) => ['', ...lines])].join('\n')
}
