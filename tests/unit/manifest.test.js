import assert from 'node:assert/strict'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {after, describe, it} from 'node:test'

import {API_VERSION, loadManifest} from '../../packages/cli/src/lib/catalog.js'

const scratch = mkdtempSync(join(tmpdir(), 'ap-manifest-'))
after(() => rmSync(scratch, {force: true, recursive: true}))

let counter = 0
function manifest(body) {
  const path = join(scratch, `m-${counter++}.yaml`)
  writeFileSync(path, body)
  return path
}

/**
 * There is no project.schema.json, so kind and apiVersion are the only things
 * the project manifest is checked for at all.
 */
describe('loadManifest', () => {
  it('accepts the one supported version', () => {
    const doc = loadManifest(manifest(`apiVersion: ${API_VERSION}\nkind: Project\nspec:\n  role: r\n`))
    assert.equal(doc.spec.role, 'r')
  })

  // manifest-spec.md:2364-2383 — fail clearly, never parse best-effort.
  it('names the version it was given and the one it wanted', () => {
    assert.throws(
      () => loadManifest(manifest('apiVersion: agent-plugins.dev/v99\nkind: Project\n')),
      /UNSUPPORTED_API_VERSION: .* declares "agent-plugins.dev\/v99", expected "agent-plugins.dev\/v1alpha1"/,
    )
  })

  // The retired spelling must fail rather than be silently translated
  // (ADR 0014 D2 — there are no users yet, so nothing is owed a migration).
  it('rejects the retired agent-plugins/v1 spelling', () => {
    assert.throws(
      () => loadManifest(manifest('apiVersion: agent-plugins/v1\nkind: Project\n')),
      /UNSUPPORTED_API_VERSION/,
    )
  })

  it('reports a missing version rather than defaulting one', () => {
    assert.throws(() => loadManifest(manifest('kind: Project\n')), /declares "\(none\)"/)
  })

  it('still checks kind first', () => {
    assert.throws(() => loadManifest(manifest('kind: Role\n')), /expected kind Project, found Role/)
  })
})
