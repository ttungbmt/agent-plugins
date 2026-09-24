import { describe, expect, it } from 'vitest'
import { ledger } from './ledger.js'

type Entry = { name: string; origin: string }
const key = (e: Entry) => e.name
const entry = (name: string, origin = 'a'): Entry => ({ name, origin })

describe('ledger', () => {
  it('drops forgotten entries from the records and lists them as released', () => {
    const records = ledger([entry('x'), entry('y'), entry('z')], key, { adopted: [], forgotten: ['y'] }, (e: Entry) => e)

    expect(records.values()).toEqual([entry('x'), entry('z')])
    expect(records.released).toEqual([entry('y')])
    expect(records.has('y')).toBe(false)
  })

  it('records adopted entries through toRecord and returns their keys', () => {
    const records = ledger([entry('x')], key, { adopted: [{ id: 'y', from: 'b' }], forgotten: [] }, (a: { id: string; from: string }) =>
      entry(a.id, a.from),
    )

    expect(records.values()).toEqual([entry('x'), entry('y', 'b')])
    expect(records.adopted).toEqual(['y'])
    expect(records.get('y')).toEqual(entry('y', 'b'))
  })

  it('replaces an entry by key in place and deletes by key', () => {
    const records = ledger([entry('x'), entry('y')], key, { adopted: [], forgotten: [] }, (e: Entry) => e)

    records.set(entry('x', 'new'))
    records.delete('y')
    records.set(entry('z'))

    expect(records.values()).toEqual([entry('x', 'new'), entry('z')])
    expect(records.released).toEqual([])
  })
})
