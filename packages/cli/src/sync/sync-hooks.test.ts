import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { fakeClaude } from './fake-claude.js'
import { readJson, settingsPath } from './files.js'
import { sync, type SyncMode } from './index.js'
import { makeTree } from './test-helpers.js'
import type { Scope } from './types.js'

const FORMAT = { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'npx prettier --write' }] }
const NOTIFY = { hooks: [{ type: 'command', command: 'notify-send done' }] }
const USER_HOOK = { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'my-own-linter' }] }

function config(hooks: string) {
  return `kind: Config\nmetadata: { name: demo }\nspec:\n  hooks: ${hooks}\n`
}

const FORMAT_YAML = `format: { event: PostToolUse, matcher: "Edit|Write", hooks: [{ type: command, command: "npx prettier --write" }] }`
const NOTIFY_YAML = `notify: { event: Stop, hooks: [{ type: command, command: "notify-send done" }] }`

async function setup(files: Record<string, string>, opts: { homedir?: string } = {}) {
  const cwd = await makeTree(files)
  const homedir = opts.homedir ?? (await makeTree({}))
  const claude = fakeClaude({ cwd, homedir, marketplaces: {} })
  const deps = {
    exec: claude.exec,
    fetch: async () => {
      throw new Error('offline')
    },
    homedir,
    defaultPresetsDir: join(cwd, 'default-presets'),
    env: {},
  }
  const run = (mode: SyncMode = 'apply', extra: { scope?: Scope } = {}) => sync({ cwd, scope: extra.scope ?? 'project', mode }, deps)
  const settings = (scope: Scope = 'project') => readJson<Record<string, any>>(settingsPath(scope, { cwd, homedir }))
  const writeSettings = async (value: unknown, scope: Scope = 'project') => {
    const path = settingsPath(scope, { cwd, homedir })
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, JSON.stringify(value))
  }
  const read = async (path: string) => readFile(join(cwd, path), 'utf8').catch(() => undefined)
  const lock = async () => parse((await read('agent-plugins.lock')) ?? '') ?? {}
  const userState = async () => (await readJson<Record<string, any>>(join(homedir, '.agent-plugins/state.json')))[join(cwd, 'agent-plugins.yaml')]
  const setConfig = (text: string) => writeFile(join(cwd, 'agent-plugins.yaml'), text)
  return { cwd, homedir, claude, run, settings, writeSettings, lock, userState, setConfig }
}

const hook = (kind: string, name: string, status = 'done') => expect.objectContaining({ target: 'hook', kind, name, status })

describe('sync hooks', () => {
  it('writes each declared hook as its own matcher group in project settings, without calling claude', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${FORMAT_YAML}, ${NOTIFY_YAML} }`) })

    const report = await t.run()

    expect(report.actions).toEqual([hook('add', 'format'), hook('add', 'notify')])
    expect(t.claude.calls).toEqual([])
    expect((await t.settings()).hooks).toEqual({ PostToolUse: [FORMAT], Stop: [NOTIFY] })
    expect((await t.lock()).hooks).toEqual([
      { name: 'format', group: { event: 'PostToolUse', ...FORMAT }, origin: 'agent-plugins.yaml' },
      { name: 'notify', group: { event: 'Stop', ...NOTIFY }, origin: 'agent-plugins.yaml' },
    ])
    expect(await t.run('check')).toEqual({ actions: [], conflicts: [], notices: [], inSync: true })
  })

  it('keeps other settings keys and user hooks, even on the same event and matcher', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${FORMAT_YAML} }`) })
    await t.writeSettings({ permissions: { allow: ['Bash(ls)'] }, hooks: { PostToolUse: [USER_HOOK], Stop: [NOTIFY] }, model: 'opus' })

    await t.run()
    expect(await t.settings()).toEqual({
      permissions: { allow: ['Bash(ls)'] },
      hooks: { PostToolUse: [USER_HOOK, FORMAT], Stop: [NOTIFY] },
      model: 'opus',
    })

    await t.setConfig(config('{}'))
    expect((await t.run()).actions).toEqual([hook('remove', 'format')])
    expect(await t.settings()).toEqual({
      permissions: { allow: ['Bash(ls)'] },
      hooks: { PostToolUse: [USER_HOOK], Stop: [NOTIFY] },
      model: 'opus',
    })
  })

  it('updates a changed hook in place and removes a dropped one, cleaning up empty keys', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${FORMAT_YAML} }`) })
    await t.writeSettings({ hooks: { PostToolUse: [USER_HOOK] } })
    await t.run()
    await t.writeSettings({ hooks: { PostToolUse: [FORMAT, USER_HOOK] } })

    await t.setConfig(config(`{ format: { event: PostToolUse, matcher: Edit, hooks: [{ type: command, command: prettier }] } }`))
    expect((await t.run()).actions).toEqual([hook('update', 'format')])
    const changed = { matcher: 'Edit', hooks: [{ type: 'command', command: 'prettier' }] }
    expect((await t.settings()).hooks).toEqual({ PostToolUse: [changed, USER_HOOK] })

    await t.setConfig(config(`{ format: { event: Stop, hooks: [{ type: command, command: prettier }] } }`))
    expect((await t.run()).actions).toEqual([hook('update', 'format')])
    expect((await t.settings()).hooks).toEqual({ PostToolUse: [USER_HOOK], Stop: [{ hooks: [{ type: 'command', command: 'prettier' }] }] })

    await t.setConfig(config('{}'))
    expect((await t.run()).actions).toEqual([hook('remove', 'format')])
    expect(await t.settings()).toEqual({ hooks: { PostToolUse: [USER_HOOK] } })
    expect((await t.lock()).hooks).toBeUndefined()

    await t.writeSettings({ model: 'opus' })
    await t.setConfig(config(`{ ${NOTIFY_YAML} }`))
    await t.run()
    await t.setConfig(config('{}'))
    await t.run()
    expect(await t.settings()).toEqual({ model: 'opus' })
  })

  it('leaves exactly one group behind when a hook is renamed', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${FORMAT_YAML} }`) })
    await t.run()

    await t.setConfig(config(`{ ${FORMAT_YAML.replace('format:', 'prettier:')} }`))
    expect((await t.run()).actions).toEqual([hook('add', 'prettier'), hook('remove', 'format')])
    expect((await t.settings()).hooks).toEqual({ PostToolUse: [FORMAT] })
    expect((await t.lock()).hooks.map((h: { name: string }) => h.name)).toEqual(['prettier'])
  })

  it('compares groups by value: key order and an empty, "*" or missing matcher do not matter, and it writes what was declared', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`{ notify: { hooks: [{ command: "notify-send done", type: command, timeout: 5 }], matcher: "*", event: Stop } }`),
    })
    await t.run()

    expect((await t.settings()).hooks).toEqual({ Stop: [{ matcher: '*', hooks: [{ command: 'notify-send done', type: 'command', timeout: 5 }] }] })
    expect((await t.lock()).hooks[0].group).toEqual({ event: 'Stop', hooks: [{ command: 'notify-send done', type: 'command', timeout: 5 }] })
    expect((await t.run('check')).inSync).toBe(true)

    await t.setConfig(config(`{ notify: { event: Stop, matcher: "", hooks: [{ type: command, timeout: 5, command: "notify-send done" }] } }`))
    expect((await t.run('check')).inSync).toBe(true)
  })

  it('keeps unknown handler fields as written', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`{ guard: { event: PreToolUse, hooks: [{ type: command, command: guard, asyncRewake: true, rewakeMessage: "x", args: [] }] } }`),
    })
    await t.run()

    expect((await t.settings()).hooks.PreToolUse).toEqual([
      { hooks: [{ type: 'command', command: 'guard', asyncRewake: true, rewakeMessage: 'x', args: [] }] },
    ])
  })

  it('syncs into local and user settings, recording hooks in their State', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${FORMAT_YAML} }`) })

    expect((await t.run('apply', { scope: 'local' })).actions).toEqual([hook('add', 'format')])
    expect((await t.run('apply', { scope: 'user' })).actions).toEqual([hook('add', 'format')])

    expect((await t.settings('local')).hooks).toEqual({ PostToolUse: [FORMAT] })
    expect((await t.settings('user')).hooks).toEqual({ PostToolUse: [FORMAT] })
    expect(await t.settings('project')).toEqual({})
    expect((await t.userState()).hooks).toEqual([{ name: 'format', group: { event: 'PostToolUse', ...FORMAT }, origin: 'agent-plugins.yaml' }])
    expect((await t.run('check', { scope: 'local' })).inSync).toBe(true)

    await t.setConfig(config('{}'))
    expect((await t.run('apply', { scope: 'user' })).actions).toEqual([hook('remove', 'format')])
    expect(await t.settings('user')).toEqual({})
    expect(await t.settings('local')).toEqual({ hooks: { PostToolUse: [FORMAT] } })
  })

  it.each(['project', 'local', 'user'] as const)('in %s scope: adds, updates in place and removes, keeping other keys and user hooks', async (scope) => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${FORMAT_YAML} }`) })
    await t.writeSettings({ model: 'opus', hooks: { PostToolUse: [USER_HOOK] } }, scope)

    expect((await t.run('dry-run', { scope })).actions).toEqual([hook('add', 'format', 'planned')])
    expect(await t.settings(scope)).toEqual({ model: 'opus', hooks: { PostToolUse: [USER_HOOK] } })

    expect((await t.run('apply', { scope })).actions).toEqual([hook('add', 'format')])
    expect(await t.settings(scope)).toEqual({ model: 'opus', hooks: { PostToolUse: [USER_HOOK, FORMAT] } })
    expect((await t.run('check', { scope })).inSync).toBe(true)
    for (const other of (['project', 'local', 'user'] as const).filter((s) => s !== scope)) expect(await t.settings(other)).toEqual({})

    await t.writeSettings({ model: 'opus', hooks: { PostToolUse: [FORMAT, USER_HOOK] } }, scope)
    await t.setConfig(config(`{ format: { event: PostToolUse, matcher: Edit, hooks: [{ type: command, command: prettier }] } }`))
    expect((await t.run('apply', { scope })).actions).toEqual([hook('update', 'format')])
    const changed = { matcher: 'Edit', hooks: [{ type: 'command', command: 'prettier' }] }
    expect(await t.settings(scope)).toEqual({ model: 'opus', hooks: { PostToolUse: [changed, USER_HOOK] } })

    await t.setConfig(config('{}'))
    expect((await t.run('apply', { scope })).actions).toEqual([hook('remove', 'format')])
    expect(await t.settings(scope)).toEqual({ model: 'opus', hooks: { PostToolUse: [USER_HOOK] } })
    expect((await t.run('check', { scope })).inSync).toBe(true)
  })

  it('does not write a managed hook again once it is gone from settings, so an edited copy never runs twice', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${FORMAT_YAML} }`) })
    await t.run()
    const edited = { ...FORMAT, hooks: [{ type: 'command', command: 'npx prettier --write --cache' }] }
    await t.writeSettings({ hooks: { PostToolUse: [edited] } })

    expect((await t.run()).actions).toEqual([])
    expect((await t.settings()).hooks).toEqual({ PostToolUse: [edited] })
  })

  it('reports progress for each hook action after the single settings write', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${FORMAT_YAML}, ${NOTIFY_YAML} }`) })
    const events: string[] = []

    await sync(
      { cwd: t.cwd, scope: 'project', mode: 'apply' },
      {
        exec: t.claude.exec,
        fetch: async () => '',
        homedir: t.homedir,
        defaultPresetsDir: join(t.cwd, 'default-presets'),
        onProgress: (e) => events.push(`${e.phase} ${e.action.target} ${e.action.name}`),
      },
    )

    expect(events).toEqual(['start hook format', 'end hook format', 'start hook notify', 'end hook notify'])
  })

  it('plans without writing on dry-run, and --check fails while hook actions remain', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${FORMAT_YAML} }`) })

    expect((await t.run('dry-run')).actions).toEqual([hook('add', 'format', 'planned')])
    const check = await t.run('check')
    expect(check.actions).toEqual([hook('add', 'format', 'planned')])
    expect(check.inSync).toBe(false)
    expect(await t.settings()).toEqual({})
    expect(await t.lock()).toEqual({})
  })
})
