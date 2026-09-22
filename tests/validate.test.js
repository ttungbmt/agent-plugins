import assert from 'node:assert/strict'
import {cpSync, mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {after, describe, it} from 'node:test'
import {fileURLToPath} from 'node:url'

import {inspectCatalog} from '../packages/cli/src/lib/catalog.js'
import {graphDiagnostics} from '../packages/cli/src/lib/validate.js'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const scratch = mkdtempSync(join(tmpdir(), 'ap-validate-'))
after(() => rmSync(scratch, {force: true, recursive: true}))

/** A case is the base distribution with one file swapped in. */
function check(caseName) {
  const root = join(scratch, caseName ?? 'base')
  cpSync(join(fixtures, 'base'), root, {recursive: true})
  if (caseName) cpSync(join(fixtures, 'cases', caseName), root, {recursive: true})

  const {catalog, diagnostics} = inspectCatalog(root)
  const all = diagnostics.length > 0 ? diagnostics : [...diagnostics, ...graphDiagnostics(catalog)]
  return {
    catalog,
    codes: all.filter((d) => d.severity === undefined || d.severity === 'error').map((d) => d.code),
    notes: all.filter((d) => d.severity === 'info').map((d) => d.code),
    warnings: all.filter((d) => d.severity === 'warning').map((d) => d.code),
  }
}

describe('catalog validation', () => {
  it('accepts a well-formed distribution', () => {
    const {catalog, codes} = check(null)
    assert.deepEqual(codes, [])
    assert.equal(catalog.capabilities.size, 1)
    assert.equal(catalog.packages.size, 1)
  })

  // catalog-spec.md:2303-2325 names this exact case: `prioroty: 100` must fail
  // rather than be silently ignored.
  it('rejects an unknown field', () => {
    assert.deepEqual(check('unknown-field').codes, ['UNKNOWN_FIELD'])
  })

  it('rejects a duplicate canonical ID', () => {
    assert.deepEqual(check('duplicate-id').codes, ['DUPLICATE_CAPABILITY'])
  })

  it('rejects an implementation pointing at no Package', () => {
    assert.deepEqual(check('missing-ref').codes, ['UNKNOWN_PACKAGE'])
  })

  // security-model.md:831-835 forbids a mutable ref as the pinned identity.
  it('rejects a mutable source ref', () => {
    assert.deepEqual(check('bad-sha').codes, ['INVALID_MANIFEST'])
  })

  // source.js:113 hard-throws without it.
  it('rejects a Package with no discovery manifest', () => {
    assert.deepEqual(check('no-manifest').codes, ['MISSING_FIELD'])
  })

  // ADR 0010 D2 defines `ecosystem`; build.js always filters to the closure,
  // so accepting the value would install the wrong thing silently.
  it('rejects an unimplemented materialization mode', () => {
    assert.deepEqual(check('materialization-ecosystem').codes, ['INVALID_MANIFEST'])
  })

  // resolution-spec.md:1107-1118 makes this an error by default; ADR 0010 D6
  // reads a dense requires graph as a sign the Package should be an ecosystem.
  it('rejects a cycle in declared requires', () => {
    assert.deepEqual(check('requires-cycle').codes, ['COMPONENT_CYCLE'])
  })

  // catalog-spec.md:340-361 — Capability IDs carry a semantic namespace.
  it('rejects a Capability ID with no namespace', () => {
    assert.deepEqual(check('bad-capability-id').codes, ['INVALID_CAPABILITY_ID'])
  })

  // The guard at catalog.js:21 used to swallow this, which is how a committed
  // 0-byte roles/default.yaml survived while declaring no Role at all.
  it('rejects an empty manifest', () => {
    assert.deepEqual(check('empty-file').codes, ['INVALID_MANIFEST'])
  })

  // catalog-spec.md:3011-3022 — a dependency-only Component is legitimate and
  // permanent, so it is reported as a note. Were it a warning, `--strict` could
  // never pass and would stop being worth running.
  it('notes a requires target that implements no Capability', () => {
    const {notes, warnings} = check(null)
    assert.deepEqual(notes, ['UNCURATED_DEPENDENCY'])
    assert.deepEqual(warnings, [])
  })
})
