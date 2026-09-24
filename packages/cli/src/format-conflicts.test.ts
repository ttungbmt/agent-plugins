import { expect, test } from 'vitest'
import { formatConflicts } from './format-conflicts.js'
import type { Conflict } from './sync/types.js'

const missing = (plugin: string, origin: string): Conflict => ({
  name: `${plugin}@official`,
  reason: 'missing-marketplace',
  detail: `${origin} enables "${plugin}@official" but no preset or Config declares a marketplace named "official"`,
  group: {
    title: 'marketplace "official" is not declared, but these plugins use it',
    hint: 'declare it under spec.marketplaces in a preset or the Config',
    origin,
    item: plugin,
  },
})

test('conflicts in one group are listed once, split by origin, with one fix', () => {
  expect(formatConflicts([missing('a', 'agent-plugins.yaml'), missing('b', 'base'), missing('c', 'agent-plugins.yaml')])).toBe(
    [
      '✖ 3 conflicts',
      '',
      '  marketplace "official" is not declared, but these plugins use it',
      '    agent-plugins.yaml  a, c',
      '    preset base         b',
      '  fix: declare it under spec.marketplaces in a preset or the Config',
    ].join('\n'),
  )
})

test('an origin is named as a preset only when it is a bare preset name', () => {
  const lines = formatConflicts([missing('a', 'team.yaml'), missing('b', 'https://x.test/p.yaml'), missing('c', 'base')]).split('\n')
  expect(lines.slice(3, 6)).toEqual(['    team.yaml              a', '    https://x.test/p.yaml  b', '    preset base            c'])
})

test('a conflict without a group keeps its own detail', () => {
  const manual: Conflict = { name: 'mp', reason: 'manual-entry', detail: 'settings already has a manual entry "mp"; use --force to overwrite' }
  expect(formatConflicts([manual]).split('\n')).toEqual([
    '✖ 1 conflict',
    '',
    '  mp',
    '    settings already has a manual entry "mp"; use --force to overwrite',
  ])
})

test('styles the heading, the items and the fix', () => {
  const style = (format: string, text: string) => `<${format}>${text}</${format}>`
  expect(formatConflicts([missing('a', 'base')], style).split('\n')).toEqual([
    '<red>✖ 1 conflict</red>',
    '',
    '  marketplace "official" is not declared, but these plugins use it',
    '    <dim>preset base</dim>  <bold>a</bold>',
    '  <dim>fix: declare it under spec.marketplaces in a preset or the Config</dim>',
  ])
})
