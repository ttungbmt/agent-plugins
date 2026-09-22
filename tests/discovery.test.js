import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {after, describe, it} from 'node:test'

import {buildMarketplace, computeVersion} from '../packages/cli/src/lib/build.js'
import {applyPolicy} from '../packages/cli/src/lib/pipeline.js'
import {readComponents} from '../packages/cli/src/lib/source.js'

const scratch = mkdtempSync(join(tmpdir(), 'ap-discovery-'))
after(() => rmSync(scratch, {force: true, recursive: true}))

let counter = 0

/** Stage a snapshot tree. `files` maps a relative path to its contents. */
function snapshot(files) {
  const dir = join(scratch, `snap-${counter++}`)
  for (const [rel, body] of Object.entries(files)) {
    const full = join(dir, rel)
    mkdirSync(dirname(full), {recursive: true})
    writeFileSync(full, body)
  }

  return dir
}

const pkg = (discovery) => ({metadata: {id: 'acme-skills'}, spec: {discovery}})

const skill = (name) => `---\nname: ${name}\n---\n\nbody of ${name}\n`
const agent = (name) => `---\nname: ${name}\nmodel: inherit\n---\n\nbody of ${name}\n`

describe('readComponents — manifest strategy', () => {
  // The measured reason the strategy exists: mattpocock/skills carries 38
  // SKILL.md and ships 25, so the tree is not the shipping list.
  it('reads only what the manifest lists', () => {
    const dir = snapshot({
      '.claude-plugin/plugin.json': JSON.stringify({skills: ['./skills/tdd'], version: '1.2.3'}),
      'skills/tdd/SKILL.md': skill('tdd'),
      'skills/unshipped/SKILL.md': skill('unshipped'),
    })

    const {components, upstreamVersion} = readComponents(
      pkg({manifest: '.claude-plugin/plugin.json', strategy: 'manifest'}),
      dir,
    )

    assert.deepEqual([...components.keys()], ['tdd'])
    assert.equal(components.get('tdd').type, 'skill')
    assert.equal(upstreamVersion, '1.2.3')
  })

  // ADR 0013 D1. Pointing `manifest` at a plugin.json that enumerates nothing
  // used to yield an empty Map and a silently empty projection — which is how
  // wshobson/agents would have resolved to zero components.
  it('fails when the manifest enumerates nothing', () => {
    const dir = snapshot({
      '.claude-plugin/plugin.json': JSON.stringify({name: 'ui-design', version: '1.0.5'}),
      'agents/ui-designer.md': agent('ui-designer'),
    })

    assert.throws(
      () => readComponents(pkg({manifest: '.claude-plugin/plugin.json', strategy: 'manifest'}), dir),
      /DISCOVERY_EMPTY/,
    )
  })
})

describe('readComponents — convention strategy', () => {
  // Five of the six reference ecosystems in README.md ship no component arrays
  // at all; code-simplifier is one agent under agents/ and nothing else.
  it('discovers agents, skills and commands by layout', () => {
    const dir = snapshot({
      '.claude-plugin/plugin.json': JSON.stringify({name: 'ui-design', version: '1.0.5'}),
      'agents/ui-designer.md': agent('ui-designer'),
      'commands/ship.md': skill('ship'),
      'skills/frontend-design/SKILL.md': skill('frontend-design'),
    })

    const {components, upstreamVersion} = readComponents(pkg({strategy: 'convention'}), dir)

    assert.deepEqual([...components.keys()].sort(), ['frontend-design', 'ship', 'ui-designer'])
    assert.equal(components.get('ui-designer').type, 'agent')
    assert.equal(components.get('frontend-design').type, 'skill')
    assert.equal(components.get('ship').type, 'command')
    assert.equal(upstreamVersion, '1.0.5')
  })

  // A skill is a directory, an agent is a flat file. build.js and
  // computeVersion both have to tell them apart.
  it('records the path of the file itself, whatever its shape', () => {
    const dir = snapshot({
      '.claude-plugin/plugin.json': JSON.stringify({version: '1.0.0'}),
      'agents/ui-designer.md': agent('ui-designer'),
      'skills/tdd/SKILL.md': skill('tdd'),
    })

    const {components} = readComponents(pkg({strategy: 'convention'}), dir)

    assert.equal(components.get('tdd').sourcePath, 'skills/tdd')
    assert.equal(components.get('ui-designer').sourcePath, 'agents/ui-designer.md')
  })

  // catalog-spec.md:1396 — discovery must fail on a collision rather than
  // overwrite. Before types were real this could not arise; now it can.
  it('fails when two types claim the same name', () => {
    const dir = snapshot({
      '.claude-plugin/plugin.json': JSON.stringify({version: '1.0.0'}),
      'agents/tdd.md': agent('tdd'),
      'skills/tdd/SKILL.md': skill('tdd'),
    })

    assert.throws(() => readComponents(pkg({strategy: 'convention'}), dir), /DUPLICATE_COMPONENT/)
  })

  // security-guidance ships hooks/ and declares nothing. With no manifest to
  // read, the policy gate has to see the directory or the hook walks in.
  it('reports package-level executables found on disk', () => {
    const dir = snapshot({
      '.claude-plugin/plugin.json': JSON.stringify({version: '2.0.8'}),
      '.mcp.json': '{}',
      'hooks/hooks.json': '{}',
      'skills/tdd/SKILL.md': skill('tdd'),
    })

    const {executables} = readComponents(pkg({strategy: 'convention'}), dir)
    assert.deepEqual([...executables].sort(), ['hook', 'mcp'])
  })
})

describe('applyPolicy', () => {
  const policy = (componentTypes) => ({metadata: {id: 'default'}, spec: {componentTypes}})
  const components = new Map([
    ['tdd', {name: 'tdd', type: 'skill'}],
    ['ui-designer', {name: 'ui-designer', type: 'agent'}],
  ])

  // ADR 0013 D3. This is the assertion that was impossible before types were
  // real: policy.schema.json's own note said the agent rule was unreachable.
  it('denies a component whose type the policy forbids', () => {
    assert.throws(
      () => applyPolicy(policy({agent: 'deny', skill: 'allow'}), components, new Set(['tdd', 'ui-designer']), []),
      /COMPONENT_ACTIVATION_UNSUPPORTED: policy "default" denies ui-designer \(agent\)/,
    )
  })

  it('allows the same component when the policy permits its type', () => {
    assert.doesNotThrow(() =>
      applyPolicy(policy({agent: 'allow', skill: 'allow'}), components, new Set(['tdd', 'ui-designer']), []),
    )
  })

  it('denies a package-level executable the policy forbids', () => {
    assert.throws(
      () => applyPolicy(policy({hook: 'deny', skill: 'allow'}), components, new Set(['tdd']), ['hook']),
      /package-level hook/,
    )
  })
})

describe('buildMarketplace — projection layout', () => {
  // The projection has to reproduce the layout the runtime reads, and a flat
  // agent .md is a different shape from a skill directory (ADR 0013 D2).
  it('lands each type in its own slot and lists it in plugin.json', () => {
    const dir = snapshot({
      '.claude-plugin/plugin.json': JSON.stringify({version: '1.0.5'}),
      'agents/ui-designer.md': agent('ui-designer'),
      'skills/tdd/SKILL.md': skill('tdd'),
      'skills/tdd/reference.md': 'supporting material',
    })

    const {components, upstreamVersion} = readComponents(pkg({strategy: 'convention'}), dir)
    const marketplace = join(scratch, `market-${counter++}`)

    const built = buildMarketplace({
      components,
      included: new Set(['tdd', 'ui-designer']),
      marketplace,
      mode: 'copy',
      packageId: 'ui-design',
      projectRootDir: join(scratch, 'proj'),
      snapshotDir: dir,
      upstreamVersion,
    })

    const pluginRoot = join(marketplace, 'plugins', 'ui-design')
    assert.equal(readFileSync(join(pluginRoot, 'agents', 'ui-designer.md'), 'utf8'), agent('ui-designer'))
    assert.equal(readFileSync(join(pluginRoot, 'skills', 'tdd', 'SKILL.md'), 'utf8'), skill('tdd'))
    // A skill ships its whole directory, not just SKILL.md.
    assert.equal(readFileSync(join(pluginRoot, 'skills', 'tdd', 'reference.md'), 'utf8'), 'supporting material')

    const manifest = JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8'))
    assert.deepEqual(manifest.agents, ['./agents/ui-designer.md'])
    assert.deepEqual(manifest.skills, ['./skills/tdd'])
    assert.equal(built.version, `1.0.5+${built.version.split('+')[1]}`)
  })

  // The digest covers type as well as bytes: the same content activates
  // differently depending on which slot it sits in.
  it('changes the version when a component changes type', () => {
    const asSkill = new Map([['x', {name: 'x', raw: 'same bytes', sourcePath: 'skills/x', type: 'skill'}]])
    const asAgent = new Map([['x', {name: 'x', raw: 'same bytes', sourcePath: 'agents/x.md', type: 'agent'}]])
    const args = {included: new Set(['x']), upstreamVersion: '1.0.0'}

    assert.notEqual(
      computeVersion({...args, components: asSkill}),
      computeVersion({...args, components: asAgent}),
    )
  })
})
