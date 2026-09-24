import { expect, test } from 'vitest'
import type { Style } from './format-conflicts.js'
import { formatReport } from './format-report.js'
import type { SyncAction } from './sync/index.js'

const plugin = (kind: SyncAction['kind'], name: string, extra: Partial<SyncAction> = {}): SyncAction => ({
  target: 'plugin',
  kind,
  name,
  source: null,
  status: 'done',
  ...extra,
})

test('actions are listed under a heading per kind, with a totals line', () => {
  expect(formatReport({ actions: [plugin('install', 'tdd@mp'), plugin('uninstall', 'old@mp')] })).toBe(
    [
      'Plugins (2)',
      '  + tdd@mp  installed',
      '  - old@mp  uninstalled',
      '',
      '✔ 1 installed, 1 uninstalled',
    ].join('\n'),
  )
})

test('an install at the user Scope and an uninstall of the same plugin from the targeted Scope show as one Scope move', () => {
  const actions = [plugin('install', 'a@mp', { scope: 'user' }), plugin('install', 'fresh@mp'), plugin('uninstall', 'a@mp')]
  expect(formatReport({ actions }, { scope: 'project' })).toBe(
    [
      'Plugins (2)',
      '  → a@mp      moved project → user',
      '  + fresh@mp  installed',
      '',
      '✔ 1 moved, 1 installed',
    ].join('\n'),
  )
})

test('a failed action shows its error and turns the totals line into a failure', () => {
  const actions: SyncAction[] = [
    plugin('install', 'a@mp'),
    { target: 'mcp', kind: 'add', name: 'playwright', source: null, status: 'failed', error: 'npx not found' },
  ]
  expect(formatReport({ actions })).toBe(
    [
      'Plugins (1)',
      '  + a@mp        installed',
      '',
      'MCP servers (1)',
      '  ✖ playwright  npx not found',
      '',
      '✖ 1 installed, 1 failed',
    ].join('\n'),
  )
})

test('planned actions (dry-run, check) read as what a Sync would do', () => {
  const actions = [
    plugin('install', 'a@mp', { scope: 'user', status: 'planned' }),
    plugin('enable', 'b@mp', { status: 'planned' }),
    plugin('uninstall', 'a@mp', { status: 'planned' }),
  ]
  expect(formatReport({ actions })).toBe(
    [
      'Plugins (2)',
      '  → a@mp  move project → user',
      '  + b@mp  enable',
      '',
      '2 to change: 1 move, 1 enable',
    ].join('\n'),
  )
})

test('an action outside the targeted Scope names its Scope, and a whole source is named by where it comes from', () => {
  const actions: SyncAction[] = [
    { target: 'marketplace', kind: 'add', name: 'mp', source: null, status: 'done', scope: 'user' },
    { target: 'skill', kind: 'install', name: null, source: { source: 'github', repo: 'o/r' }, status: 'done' },
  ]
  expect(formatReport({ actions })).toBe(
    [
      'Marketplaces (1)',
      '  + mp            added at user',
      '',
      'Skills (1)',
      '  + all from o/r  installed',
      '',
      '✔ 1 added, 1 installed',
    ].join('\n'),
  )
})

test('headings are bold, symbols colored by outcome, and verbs dim beside the name', () => {
  const tag: Style = (format, text) => `<${format}>${text}</${format}>`
  const actions: SyncAction[] = [
    plugin('install', 'a@mp', { scope: 'user' }),
    plugin('uninstall', 'a@mp'),
    { target: 'mcp', kind: 'add', name: 'pw', source: null, status: 'failed', error: 'boom' },
  ]
  expect(formatReport({ actions }, { style: tag }).split('\n')).toEqual([
    '<bold>Plugins</bold> <dim>(1)</dim>',
    '  <blue>→</blue> a<dim>@mp</dim>  <dim>moved</dim> <cyan>project</cyan> <dim>→</dim> <magenta>user</magenta>',
    '',
    '<bold>MCP servers</bold> <dim>(1)</dim>',
    '  <red>✖</red> pw    <red>boom</red>',
    '',
    '<red>✖</red> 1 moved, <red>1 failed</red>',
  ])
})

test('the totals line ends with how long an applying Sync took', () => {
  expect(formatReport({ actions: [plugin('install', 'a@mp')] }, { elapsedMs: 11_940 }).split('\n').at(-1)).toBe('✔ 1 installed in 11.9s')
  expect(formatReport({ actions: [plugin('install', 'a@mp')] }, { elapsedMs: 420 }).split('\n').at(-1)).toBe('✔ 1 installed in 420ms')
})
