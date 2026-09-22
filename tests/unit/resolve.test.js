import assert from 'node:assert/strict'
import {describe, it} from 'node:test'

import {expandRole, selectImplementations} from '../../packages/cli/src/lib/resolve.js'

/**
 * Both functions are pure: they read Maps and plain objects and touch nothing
 * else. An undefined binding in this layer once survived 11 green tests
 * because nothing reached it.
 */

const catalog = ({capabilities = {}, presets = {}, roles = {}} = {}) => ({
  capabilities: new Map(Object.entries(capabilities)),
  presets: new Map(Object.entries(presets)),
  roles: new Map(Object.entries(roles)),
})

const role = (presets) => ({metadata: {id: 'r'}, spec: {presets}})
const preset = (spec) => ({spec})
const cap = (implementations, cardinality) => ({spec: {cardinality, implementations}})
const impl = (component, priority) => ({component, package: 'acme-skills', priority})

const codes = (decisions) => decisions.map((d) => d.code)

describe('expandRole', () => {
  it('collects capabilities from the role\'s presets', () => {
    const c = catalog({
      presets: {'engineering/core': preset({capabilities: ['engineering.testing.tdd']})},
      roles: {'software-engineer': role(['engineering/core'])},
    })

    const {capabilities, decisions} = expandRole(c, {spec: {role: 'software-engineer'}})

    assert.deepEqual([...capabilities], ['engineering.testing.tdd'])
    assert.deepEqual(codes(decisions), ['preset-expanded', 'required'])
  })

  it('follows presets nested inside presets', () => {
    const c = catalog({
      presets: {
        base: preset({capabilities: ['a.b']}),
        top: preset({presets: ['base']}),
      },
      roles: {r: role(['top'])},
    })

    const {capabilities} = expandRole(c, {spec: {role: 'r'}})
    assert.deepEqual([...capabilities], ['a.b'])
  })

  // A preset graph is authored by hand, so it can be made cyclic by hand.
  it('terminates on a preset cycle instead of looping', () => {
    const c = catalog({
      presets: {
        one: preset({capabilities: ['a.b'], presets: ['two']}),
        two: preset({presets: ['one']}),
      },
      roles: {r: role(['one'])},
    })

    const {capabilities} = expandRole(c, {spec: {role: 'r'}})
    assert.deepEqual([...capabilities], ['a.b'])
  })

  it('names the referrer when a preset is missing', () => {
    const c = catalog({roles: {r: role(['gone'])}})
    assert.throws(() => expandRole(c, {spec: {role: 'r'}}), /unknown preset "gone" \(required by role:r\)/)
  })

  it('rejects an unknown role', () => {
    assert.throws(() => expandRole(catalog(), {spec: {role: 'nobody'}}), /unknown role "nobody"/)
  })

  it('adds a capability the project enables', () => {
    const c = catalog({presets: {p: preset({capabilities: ['a.b']})}, roles: {r: role(['p'])}})

    const {capabilities, decisions} = expandRole(c, {
      spec: {overrides: {capabilities: {enable: ['c.d']}}, role: 'r'},
    })

    assert.deepEqual([...capabilities].sort(), ['a.b', 'c.d'])
    assert.ok(codes(decisions).includes('enabled'))
  })

  it('removes a capability the project disables', () => {
    const c = catalog({presets: {p: preset({capabilities: ['a.b']})}, roles: {r: role(['p'])}})

    const {capabilities, decisions} = expandRole(c, {
      spec: {overrides: {capabilities: {disable: ['a.b']}}, role: 'r'},
    })

    assert.deepEqual([...capabilities], [])
    assert.ok(codes(decisions).includes('disabled'))
  })

  // Pinning current behaviour, not endorsing it: disabling something that was
  // never required is a typo the user gets no signal about.
  it('says nothing when disabling a capability that was never required', () => {
    const c = catalog({presets: {p: preset({capabilities: ['a.b']})}, roles: {r: role(['p'])}})

    const {decisions} = expandRole(c, {
      spec: {overrides: {capabilities: {disable: ['never.required']}}, role: 'r'},
    })

    assert.ok(!codes(decisions).includes('disabled'))
  })

  it(
    'rejects enabling and disabling the same capability',
    {todo: 'manifest-spec.md:835 specifies CONFLICTING_CAPABILITY_OVERRIDE; disable currently just wins, silently'},
    () => {
      const c = catalog({presets: {p: preset({capabilities: []})}, roles: {r: role(['p'])}})

      assert.throws(
        () => expandRole(c, {spec: {overrides: {capabilities: {disable: ['a.b'], enable: ['a.b']}}, role: 'r'}}),
        /CONFLICTING_CAPABILITY_OVERRIDE/,
      )
    },
  )
})

describe('selectImplementations', () => {
  it('selects the sole implementation', () => {
    const c = catalog({capabilities: {'a.b': cap([impl('tdd')])}})

    const {decisions, selections} = selectImplementations(c, ['a.b'])

    assert.equal(selections.get('a.b').component, 'tdd')
    assert.deepEqual(codes(decisions), ['candidate-selected'])
  })

  // A lockfile has to be byte-stable, so iteration order cannot depend on the
  // order capabilities happened to be added to the Set.
  it('walks capabilities in sorted order whatever order they arrive in', () => {
    const c = catalog({
      capabilities: {'a.one': cap([impl('x')]), 'b.two': cap([impl('y')]), 'c.three': cap([impl('z')])},
    })

    const forward = selectImplementations(c, ['a.one', 'b.two', 'c.three'])
    const reverse = selectImplementations(c, new Set(['c.three', 'a.one', 'b.two']))

    assert.deepEqual([...forward.selections.keys()], ['a.one', 'b.two', 'c.three'])
    assert.deepEqual([...reverse.selections.keys()], [...forward.selections.keys()])
  })

  it('rejects an unknown capability', () => {
    assert.throws(() => selectImplementations(catalog(), ['nope.gone']), /UNKNOWN_CAPABILITY: "nope.gone"/)
  })

  it('rejects a capability nothing implements', () => {
    const c = catalog({capabilities: {'a.b': cap([])}})
    assert.throws(() => selectImplementations(c, ['a.b']), /UNRESOLVED_CAPABILITY: "a.b"/)
  })

  // resolution-spec.md:1553-1581 — fail rather than pick alphabetically.
  it('refuses to guess between two candidates for a cardinality-one capability', () => {
    const c = catalog({capabilities: {'a.b': cap([impl('one'), impl('two')], 'one')}})
    assert.throws(() => selectImplementations(c, ['a.b']), /AMBIGUOUS_RESOLUTION: "a.b" has 2 candidates/)
  })

  it(
    'keeps every candidate for a cardinality-many capability',
    {todo: 'resolve.js:89 takes candidates[0] regardless, so `many` silently degrades to one'},
    () => {
      const c = catalog({capabilities: {'a.b': cap([impl('one'), impl('two')], 'many')}})

      const {selections} = selectImplementations(c, ['a.b'])
      assert.deepEqual(
        [].concat(selections.get('a.b')).map((s) => s.component),
        ['one', 'two'],
      )
    },
  )

  it(
    'breaks a tie on priority',
    {todo: 'priority is in the schema and lib/validate.js:82 treats it as the tie-breaker; resolve.js never reads it'},
    () => {
      const c = catalog({capabilities: {'a.b': cap([impl('low', 1), impl('high', 900)], 'one')}})
      assert.equal(selectImplementations(c, ['a.b']).selections.get('a.b').component, 'high')
    },
  )
})
