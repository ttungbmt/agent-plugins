import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../sync/resolve.js'
import { makeTree } from '../sync/test-helpers.js'
import { init } from './index.js'

async function makeRepo(dirName: string, files: Record<string, string> = {}) {
  const cwd = join(await makeTree({}), dirName)
  await mkdir(cwd)
  for (const [path, content] of Object.entries(files)) await writeFile(join(cwd, path), content)
  return cwd
}

const read = (cwd: string, path: string) => readFile(join(cwd, path), 'utf8')

describe('init', () => {
  it('writes a Config named after the directory, with the schema modeline', async () => {
    const cwd = await makeRepo('My_Cool.Repo')

    const result = await init({ cwd })

    const text = await read(cwd, 'agent-plugins.yaml')
    expect(text.split('\n')[0]).toMatch(/^# yaml-language-server: \$schema=https:\/\/.*config\.schema\.json$/)
    expect(parse(text)).toEqual({ kind: 'Config', metadata: { name: 'my-cool-repo' }, spec: {} })
    expect(result.configPath).toBe(join(cwd, 'agent-plugins.yaml'))
  })

  it('uses --name instead of the directory name', async () => {
    const cwd = await makeRepo('whatever')
    await init({ cwd, name: 'team-tools' })
    expect(parse(await read(cwd, 'agent-plugins.yaml')).metadata.name).toBe('team-tools')
  })

  it('rejects a name that is not kebab-case', async () => {
    const cwd = await makeRepo('whatever')
    await expect(init({ cwd, name: 'Team Tools' })).rejects.toThrow(/kebab-case/)
  })

  it('asks for --name when the directory name has no usable characters', async () => {
    const cwd = await makeRepo('___')
    await expect(init({ cwd })).rejects.toThrow(/--name/)
  })

  it('refuses to overwrite an existing Config without --force', async () => {
    const cwd = await makeRepo('demo', { 'agent-plugins.yaml': 'kind: Config\n' })

    await expect(init({ cwd })).rejects.toThrow(/already exists.*--force/)
    expect(await read(cwd, 'agent-plugins.yaml')).toBe('kind: Config\n')
    await expect(read(cwd, '.gitignore')).rejects.toThrow()

    await init({ cwd, force: true })
    expect(parse(await read(cwd, 'agent-plugins.yaml')).metadata.name).toBe('demo')
  })

  it('creates .gitignore with the local-only paths', async () => {
    const cwd = await makeRepo('demo')
    const result = await init({ cwd })
    expect(await read(cwd, '.gitignore')).toBe('.agent-plugins/state.local.json\n.agent-plugins/cache/\n')
    expect(result.gitignoreAdded).toEqual(['.agent-plugins/state.local.json', '.agent-plugins/cache/'])
  })

  it('appends only missing lines to an existing .gitignore', async () => {
    const cwd = await makeRepo('demo', { '.gitignore': 'node_modules/\n.agent-plugins/cache/' })

    const result = await init({ cwd })

    expect(await read(cwd, '.gitignore')).toBe('node_modules/\n.agent-plugins/cache/\n.agent-plugins/state.local.json\n')
    expect(result.gitignoreAdded).toEqual(['.agent-plugins/state.local.json'])

    const again = await init({ cwd, force: true })
    expect(again.gitignoreAdded).toEqual([])
    expect(await read(cwd, '.gitignore')).toBe('node_modules/\n.agent-plugins/cache/\n.agent-plugins/state.local.json\n')
  })

  it('produces a Config that resolves to no declarations', async () => {
    const cwd = await makeRepo('demo')
    const { configPath } = await init({ cwd })

    const resolved = await resolveConfig(configPath, {
      fetch: async () => {
        throw new Error('network not expected')
      },
      pins: {},
      update: false,
      cacheDir: join(cwd, '.agent-plugins/cache'),
      defaultPresetsDir: join(cwd, 'default-presets'),
    })

    expect(resolved).toMatchObject({ declarations: [], conflicts: [] })
  })
})
