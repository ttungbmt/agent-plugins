import { expect, test } from 'vitest'
import { formatConflicts } from './format-conflicts.js'
import type { Conflict } from './sync/types.js'

const missing = (plugin: string): Conflict => ({
  name: `${plugin}@official`,
  reason: 'missing-marketplace',
  detail: `base enables "${plugin}@official" but no preset or Config declares a marketplace named "official"`,
  cause: 'base enables plugins from marketplace "official", but no preset or Config declares it',
})

test('conflicts sharing a cause are listed once under it', () => {
  expect(formatConflicts([missing('a'), missing('b')])).toBe(
    [
      '✖ 2 conflicts',
      '',
      '  base enables plugins from marketplace "official", but no preset or Config declares it:',
      '    · a@official',
      '    · b@official',
    ].join('\n'),
  )
})

test('a conflict without a cause keeps its own detail', () => {
  const manual: Conflict = { name: 'mp', reason: 'manual-entry', detail: 'settings already has a manual entry "mp"; use --force to overwrite' }
  expect(formatConflicts([missing('a'), manual])).toBe(
    [
      '✖ 2 conflicts',
      '',
      '  base enables plugins from marketplace "official", but no preset or Config declares it:',
      '    · a@official',
      '',
      '  mp',
      '    settings already has a manual entry "mp"; use --force to overwrite',
    ].join('\n'),
  )
})

test('a single conflict reads in the singular', () => {
  expect(formatConflicts([missing('a')]).split('\n')[0]).toBe('✖ 1 conflict')
})

test('styles the heading and the names', () => {
  const style = (format: string, text: string) => `<${format}>${text}</${format}>`
  expect(formatConflicts([missing('a')], style).split('\n')).toEqual([
    '<red>✖ 1 conflict</red>',
    '',
    '  base enables plugins from marketplace "official", but no preset or Config declares it:',
    '    · <bold>a@official</bold>',
  ])
})
