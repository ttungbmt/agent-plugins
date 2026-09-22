import assert from 'node:assert/strict'
import {join} from 'node:path'
import {describe, it} from 'node:test'

import {marketplaceName} from '../../packages/cli/src/lib/build.js'
import {projectPaths} from '../../packages/cli/src/lib/paths.js'

describe('projectPaths', () => {
  // Pure string joins. Every managed path hangs off one root, so a project can
  // be moved or copied without any of them being recomputed from elsewhere.
  it('derives every managed path from the project root', () => {
    const p = projectPaths('/tmp/proj')

    assert.equal(p.root, '/tmp/proj')
    assert.equal(p.manifest, join('/tmp/proj', 'agent-plugins.yaml'))
    assert.equal(p.lock, join('/tmp/proj', 'agent-plugins.lock'))
    assert.equal(p.managed, join('/tmp/proj', '.agent-plugins'))
    assert.equal(p.marketplace, join('/tmp/proj', '.agent-plugins', 'marketplace'))
    assert.equal(p.state, join('/tmp/proj', '.agent-plugins', 'state'))
    assert.equal(p.receipt, join('/tmp/proj', '.agent-plugins', 'state', 'claude-code.json'))
  })

  it('keeps the managed tree inside the project', () => {
    for (const value of Object.values(projectPaths('/tmp/proj'))) {
      assert.ok(value.startsWith('/tmp/proj'), `${value} escaped the project root`)
    }
  })
})

describe('marketplaceName', () => {
  // ADR 0010 D9: Claude Code keys known_marketplaces.json by name for the whole
  // machine, so two projects sharing a name silently evict each other.
  it('gives two same-named projects different marketplace names', () => {
    assert.notEqual(marketplaceName('/home/a/work/app'), marketplaceName('/home/b/work/app'))
  })

  it('is stable for one path', () => {
    assert.equal(marketplaceName('/home/a/work/app'), marketplaceName('/home/a/work/app'))
  })

  it('carries the project basename so a human can recognise it', () => {
    assert.match(marketplaceName('/home/a/work/mealops'), /^ap-mealops-[0-9a-f]{8}$/)
  })
})
