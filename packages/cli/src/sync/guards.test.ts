import { describe, expect, it } from 'vitest'
import { isRecord } from './guards.js'

describe('isRecord', () => {
  it.each([
    { name: '{}', value: {}, expected: true },
    { name: 'Object.create(null)', value: Object.create(null), expected: true },
    { name: '[]', value: [], expected: false },
    { name: 'null', value: null, expected: false },
    { name: 'new Date()', value: new Date(), expected: false },
  ])('$name → $expected', ({ value, expected }) => {
    expect(isRecord(value)).toBe(expected)
  })
})
