import type { Conflict } from './sync/types.js'

/** Applies a text style such as `red` or `bold`; `util.styleText` fits, and the default leaves text plain. */
export type Style = (format: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'bold' | 'dim', text: string) => string

const plain: Style = (_, text) => text

/**
 * Renders conflicts for the terminal. Conflicts in one `group` share a cause and a fix, so they are listed once under
 * its title, one row per origin, instead of repeating the same sentence per conflict.
 */
export function formatConflicts(conflicts: Conflict[], style: Style = plain): string {
  const blocks = Map.groupBy(conflicts, (c, i) => (c.group ? `${c.reason}\0${c.group.title}` : `\0${i}`))

  const heading = style('red', `✖ ${conflicts.length} ${conflicts.length === 1 ? 'conflict' : 'conflicts'}`)
  const lines = [...blocks.values()].map((block) => {
    const { group, name, detail } = block[0]!
    if (!group) return [`  ${style('bold', name)}`, `    ${detail}`]

    const byOrigin = Map.groupBy(block, (c) => describeOrigin(c.group!.origin))
    const width = Math.max(...[...byOrigin.keys()].map((o) => o.length))
    return [
      `  ${group.title}`,
      ...[...byOrigin].map(([origin, fromOrigin]) => `    ${style('dim', origin.padEnd(width))}  ${fromOrigin.map((c) => style('bold', c.group!.item)).join(', ')}`),
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
