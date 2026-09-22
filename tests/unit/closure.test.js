import assert from 'node:assert/strict'
import {describe, it} from 'node:test'

import {requiresClosure, scanReferences} from '../../packages/cli/src/lib/closure.js'

const shipped = (...names) => new Set(names)

describe('requiresClosure', () => {
  it('pulls in what a seed declares, transitively', () => {
    const {included} = requiresClosure(['a'], shipped('a', 'b', 'c'), {
      a: {requires: ['b']},
      b: {requires: ['c']},
    })

    assert.deepEqual([...included].sort(), ['a', 'b', 'c'])
  })

  it('leaves a component nothing points at out of the closure', () => {
    const {included} = requiresClosure(['a'], shipped('a', 'unrelated'), {})
    assert.deepEqual([...included], ['a'])
  })

  // lib/validate.js:12-16 relies on this: the cycle is reported there, so the
  // closure must terminate rather than be the thing that catches it.
  it('terminates on a cycle', () => {
    const {included} = requiresClosure(['a'], shipped('a', 'b'), {
      a: {requires: ['b']},
      b: {requires: ['a']},
    })

    assert.deepEqual([...included].sort(), ['a', 'b'])
  })

  it('records the back edge of a cycle, so a cycle is still visible downstream', () => {
    const {edges} = requiresClosure(['a'], shipped('a', 'b'), {
      a: {requires: ['b']},
      b: {requires: ['a']},
    })

    assert.deepEqual(edges, [{from: 'a', to: 'b'}, {from: 'b', to: 'a'}])
  })

  it('rejects a requires target the package does not ship', () => {
    assert.throws(
      () => requiresClosure(['a'], shipped('a'), {a: {requires: ['ghost']}}),
      /UNRESOLVED_COMPONENT_REFERENCE: "ghost"/,
    )
  })

  it('rejects a seed the package does not ship', () => {
    assert.throws(() => requiresClosure(['ghost'], shipped('a'), {}), /UNRESOLVED_COMPONENT_REFERENCE: "ghost"/)
  })

  it('is stable when a seed appears twice', () => {
    const {included} = requiresClosure(['a', 'a'], shipped('a', 'b'), {a: {requires: ['b']}})
    assert.deepEqual([...included].sort(), ['a', 'b'])
  })
})

describe('scanReferences', () => {
  // Advisory only. The header of closure.js records why: measured against
  // mattpocock-skills@c55ee46 the scan both missed real edges and invented
  // false ones, so `ap audit` nominates and a curator decides.
  it('reports the namespaced form when a reference is namespaced', () => {
    const hits = scanReferences('call superpowers:test-driven-development here', 'x', [
      'test-driven-development',
    ])

    assert.equal(hits.length, 1)
    assert.equal(hits[0].form, 'namespaced')
  })

  it('reports the slash form for a path-shaped reference', () => {
    const hits = scanReferences('see skills/grilling for detail', 'x', ['grilling'])
    assert.equal(hits[0].form, 'slash')
  })

  it('reports a bare name', () => {
    const hits = scanReferences('first read grilling, then start', 'x', ['grilling'])
    assert.equal(hits[0].form, 'bare')
  })

  it('never reports the component itself', () => {
    assert.deepEqual(scanReferences('tdd tdd tdd', 'tdd', ['tdd']), [])
  })

  it('reports nothing when a name does not appear', () => {
    assert.deepEqual(scanReferences('nothing relevant here', 'x', ['grilling']), [])
  })

  // `ap audit` shows a curator the strongest candidates first.
  it('orders hits by how often each name appears', () => {
    const body = 'alpha alpha alpha and beta'
    const hits = scanReferences(body, 'x', ['beta', 'alpha'])

    assert.deepEqual(hits.map((h) => h.name), ['alpha', 'beta'])
  })

  // The guard is `(?<![a-z0-9-/:])` — a longer name that merely contains the
  // sibling's name is not a reference to it.
  it('does not match a name embedded in a longer word', () => {
    assert.deepEqual(scanReferences('grilling-with-docs is separate', 'x', ['grilling']), [])
  })
})
