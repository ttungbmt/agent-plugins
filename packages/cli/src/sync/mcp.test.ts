import { describe, expect, it } from 'vitest'
import { planMcp } from './mcp.js'

describe('planMcp', () => {
  it('removes a managed server another Config claims only with a different configuration', () => {
    const plan = planMcp([], { docs: { command: 'docs-mcp' } }, [{ name: 'docs', server: { command: 'docs-mcp' }, origin: 'a' }], {
      force: false,
      shared: [{ name: 'docs', server: { command: 'other' }, origin: 'b', config: '/b/agent-plugins.yaml' }],
    })

    expect(plan.actions).toEqual([{ kind: 'remove', name: 'docs' }])
    expect(plan.forgotten).toEqual([])
  })
})
