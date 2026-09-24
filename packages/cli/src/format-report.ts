import type { Style } from './format-conflicts.js'
import type { Scope, SyncAction, SyncReport } from './sync/index.js'
import { describeItemSource } from './sync/identity.js'
import { ITEM_KINDS, type ItemKind } from './sync/types.js'

const plain: Style = (_, text) => text

const GROUP_TITLES: Record<SyncAction['target'], string> = {
  marketplace: 'Marketplaces',
  plugin: 'Plugins',
  skill: 'Skills',
  agent: 'Agents',
  rule: 'Rules',
  workflow: 'Workflows',
  mcp: 'MCP servers',
  hook: 'Hooks',
}

const PAST: Record<SyncAction['kind'], string> = {
  add: 'added',
  readd: 're-added',
  patch: 'patched',
  install: 'installed',
  enable: 'enabled',
  disable: 'disabled',
  update: 'updated',
  uninstall: 'uninstalled',
  unset: 'unset',
  remove: 'removed',
  fetch: 'fetched',
}

const SYMBOL: Record<SyncAction['kind'], '+' | '~' | '-'> = {
  add: '+',
  readd: '+',
  install: '+',
  enable: '+',
  patch: '~',
  update: '~',
  disable: '-',
  uninstall: '-',
  unset: '-',
  remove: '-',
  fetch: '+',
}

/** One line of the report: an action, or a Scope move folding an add/install at `user` with a removal from `scope`. */
type Row = { action: SyncAction; move?: Scope }

export type FormatReportOptions = {
  /** The Scope the Sync targets, named as the origin of a Scope move. */
  scope?: Scope
  style?: Style
  /** How long an applying Sync took, shown at the end of the totals line. */
  elapsedMs?: number
}

/** Renders a Sync report for the terminal: one block per kind of target, then a line of totals. */
export function formatReport(
  report: Pick<SyncReport, 'actions'>,
  { scope = 'project', style = plain, elapsedMs }: FormatReportOptions = {},
): string {
  const rows = toRows(report.actions, scope)
  const groups = new Map<SyncAction['target'], Row[]>()
  for (const row of rows) groups.set(row.action.target, [...(groups.get(row.action.target) ?? []), row])

  const width = Math.max(...rows.map((r) => label(r.action).length))
  const blocks = [...groups].map(([target, group]) => [
    `${style('bold', GROUP_TITLES[target])} ${style('dim', `(${group.length})`)}`,
    ...group.map((row) => `  ${symbol(row, style)} ${name(row.action, width, style)}  ${detail(row, style)}`),
  ])

  const totals = new Map<string, number>()
  for (const row of rows) totals.set(outcome(row), (totals.get(outcome(row)) ?? 0) + 1)
  const counts = [...totals].map(([word, n]) => (word === 'failed' ? style('red', `${n} ${word}`) : `${n} ${word}`)).join(', ')
  const planned = rows.every((r) => r.action.status === 'planned')
  const mark = rows.some(isFailed) ? style('red', '✖') : style('green', '✔')
  const took = elapsedMs === undefined ? '' : ` ${style('dim', `in ${elapsedMs < 1000 ? `${elapsedMs}ms` : `${(elapsedMs / 1000).toFixed(1)}s`}`)}`
  const footer = planned ? `${rows.length} to change: ${counts}` : `${mark} ${counts}${took}`

  return [...blocks.flatMap((block, i) => (i === 0 ? block : ['', ...block])), '', footer].join('\n')
}

const ARRIVING = new Set<SyncAction['kind']>(['add', 'readd', 'install'])
const LEAVING = new Set<SyncAction['kind']>(['remove', 'uninstall', 'unset'])

/** Folds each Scope move into the row of its add/install, dropping the matching removal. */
function toRows(actions: SyncAction[], scope: Scope): Row[] {
  const isMove = (a: SyncAction, b: SyncAction) =>
    a.scope === 'user' && ARRIVING.has(a.kind) && !b.scope && LEAVING.has(b.kind) &&
    a.target === b.target && a.name !== null && a.name === b.name
  const rows: Row[] = []
  for (const a of actions) {
    const arrival = rows.find((r) => !r.move && isMove(r.action, a))
    if (arrival) {
      arrival.move = scope
      if (a.status === 'failed') arrival.action = a
    } else rows.push({ action: a })
  }
  return rows
}

const isFailed = (row: Row) => row.action.status === 'failed'

const SYMBOL_COLOR = { '+': 'green', '~': 'yellow', '-': 'red' } as const

function symbol(row: Row, style: Style): string {
  if (isFailed(row)) return style('red', '✖')
  if (row.move) return style('blue', '→')
  const s = SYMBOL[row.action.kind]
  return style(SYMBOL_COLOR[s], s)
}

/** The verb for a row: present tense while planned (dry-run, check), past tense once applied. */
function outcome(row: Row): string {
  if (isFailed(row)) return 'failed'
  const planned = row.action.status === 'planned'
  if (row.move) return planned ? 'move' : 'moved'
  return planned ? (row.action.kind === 'readd' ? 're-add' : row.action.kind) : PAST[row.action.kind]
}

function detail(row: Row, style: Style): string {
  if (isFailed(row)) return style('red', row.action.error ?? 'failed')
  const scopeName = (s: Scope) => style(s === 'user' ? 'magenta' : 'cyan', s)
  if (row.move) return `${style('dim', outcome(row))} ${scopeName(row.move)} ${style('dim', '→')} ${scopeName('user')}`
  if (row.action.scope) return `${style('dim', `${outcome(row)} at`)} ${scopeName(row.action.scope)}`
  return style('dim', outcome(row))
}

/** The name padded to `width`, with the marketplace of a plugin id dimmed since most rows share it. */
function name(a: SyncAction, width: number, style: Style): string {
  const text = label(a)
  const pad = ' '.repeat(width - text.length)
  const at = a.target === 'plugin' ? text.lastIndexOf('@') : -1
  return at > 0 ? `${text.slice(0, at)}${style('dim', text.slice(at))}${pad}` : `${text}${pad}`
}

/** The action's name; an unknown name for an item kind means every item of its source. */
function label(a: SyncAction): string {
  if (a.name) return a.name
  if (ITEM_KINDS.includes(a.target as ItemKind) && a.source) return `all from ${describeItemSource(a.source)}`
  return a.source ? JSON.stringify(a.source) : '?'
}
