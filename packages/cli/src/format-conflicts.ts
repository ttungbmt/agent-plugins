import type { Conflict } from './sync/types.js'

/** Applies a text style such as `red` or `bold`; `util.styleText` fits, and the default leaves text plain. */
export type Style = (format: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'bold' | 'dim', text: string) => string

const plain: Style = (_, text) => text

/**
 * Renders conflicts for the terminal. Conflicts in one `group` share a cause and a fix, so they are listed once under
 * its title, one row per origin, instead of repeating the same sentence per conflict.
 */
export function formatConflicts(conflicts: Conflict[], style: Style = plain): string {
  const blocks = new Map<string, Conflict[]>()
  for (const c of conflicts) {
    const key = c.group ? `${c.reason}\0${c.group.title}` : `\0${blocks.size}`
    blocks.set(key, [...(blocks.get(key) ?? []), c])
  }

  const heading = style('red', `✖ ${conflicts.length} ${conflicts.length === 1 ? 'conflict' : 'conflicts'}`)
  const lines = [...blocks.values()].map((block) => {
    const { group, name, detail } = block[0]!
    if (!group) return [`  ${style('bold', name)}`, `    ${detail}`]

    const byOrigin = new Map<string, string[]>()
    for (const c of block) {
      const origin = describeOrigin(c.group!.origin)
      byOrigin.set(origin, [...(byOrigin.get(origin) ?? []), c.group!.item])
    }
    const width = Math.max(...[...byOrigin.keys()].map((o) => o.length))
    return [
      `  ${group.title}`,
      ...[...byOrigin].map(([origin, items]) => `    ${style('dim', origin.padEnd(width))}  ${items.map((i) => style('bold', i)).join(', ')}`),
      `  ${style('dim', `fix: ${group.hint}`)}`,
    ]
  })
  return [heading, ...lines.flatMap((block) => ['', ...block])].join('\n')
}

/**
 * Names a bundled preset as one. Its origin is the bare preset name, while a Config, a local preset and a remote preset
 * carry a file name, a path or a URL; the origin itself stays bare because it is recorded in the Lock.
 */
function describeOrigin(origin: string): string {
  return /^[\w-]+$/.test(origin) ? `preset ${origin}` : origin
}
