import { describe, expect, it } from 'vitest'
import { isPluginBound, workflowName, workflowRefs } from './workflow-meta.js'

const script = (meta: string, body = '') => `export const meta = ${meta}\n${body}`

describe('workflowName', () => {
  it('reads a literal meta.name', () => {
    expect(workflowName(script(`{ name: 'code-review', description: 'Review', phases: [{ title: 'Review' }] }`))).toBe('code-review')
  })

  it('reads a minified one-line script', () => {
    expect(workflowName(`export const meta={name:"scan",description:"x"};const r=await agent("go");`)).toBe('scan')
  })

  it('reads meta after a leading comment block', () => {
    expect(workflowName(`/**\n * Header\n */\n// ---\n// tags: [a]\n${script(`{ name: 'almanac' }`)}`)).toBe('almanac')
  })

  it('accepts top-level await and the workflow globals in the body', () => {
    const body = `const r = await agent('x', { agentType: 'general-purpose' })\nphase('A')\nreturn r`
    expect(workflowName(script(`{ name: 'a' }`, body))).toBe('a')
  })

  it('accepts a template literal without expressions', () => {
    expect(workflowName(script('{ name: `plain` }'))).toBe('plain')
  })

  it.each([
    ['spread', `{ ...base, name: 'a' }`],
    ['computed name', `{ name: 'a' + 'b' }`],
    ['variable name', `{ name: NAME }`],
    ['template with expression', '{ name: `a-${x}` }'],
    ['non-string name', `{ name: 42 }`],
    ['missing name', `{ description: 'x' }`],
    ['computed key', `{ ['name']: 'a' }`],
    ['name with slash', `{ name: 'a/b' }`],
    ['name with colon', `{ name: 'p:a' }`],
    ['non-object meta', `makeMeta()`],
  ])('rejects %s', (_, meta) => {
    expect(workflowName(script(meta))).toBeUndefined()
  })

  it('rejects a file without an exported meta', () => {
    expect(workflowName(`const meta = { name: 'a' }\nawait agent('x')`)).toBeUndefined()
    expect(workflowName('# README\n')).toBeUndefined()
    expect(workflowName('')).toBeUndefined()
  })

  it('rejects a syntax error', () => {
    expect(workflowName(script(`{ name: 'a' }`, 'const = ;'))).toBeUndefined()
  })

  it('rejects `export let meta`', () => {
    expect(workflowName(`export let meta = { name: 'a' }`)).toBeUndefined()
  })
})

describe('workflowRefs', () => {
  it('collects literal agentType and workflow() names', () => {
    const body = [
      `await agent('a', { agentType: 'ecc:code-reviewer' })`,
      `await agent('b', { agentType: "general-purpose", label: 'x' })`,
      `await workflow('content-guard', args)`,
      `const t = { ts: 'ecc:typescript-reviewer' }`,
      `await agent('c', { agentType: t[lang] })`,
      'await workflow(`dyn-${n}`)',
      `await agent('d', { agentType: 'general-purpose' })`,
    ].join('\n')
    expect(workflowRefs(script(`{ name: 'a' }`, body))).toEqual({
      agentTypes: ['ecc:code-reviewer', 'general-purpose'],
      workflows: ['content-guard'],
    })
  })

  it('returns nothing for an unparsable script', () => {
    expect(workflowRefs('const = ;')).toEqual({ agentTypes: [], workflows: [] })
  })
})

describe('isPluginBound', () => {
  it('is true when an agentType carries a plugin prefix', () => {
    expect(isPluginBound({ agentTypes: ['general-purpose', 'ecc:code-reviewer'], workflows: [] })).toBe(true)
    expect(isPluginBound({ agentTypes: ['general-purpose'], workflows: ['x'] })).toBe(false)
  })
})
