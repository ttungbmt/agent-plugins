import { describe, expect, it } from 'vitest'
import { scopeMove, type MovableKind, type Side } from './scope-move.js'
import type { Conflict, Scope } from './types.js'

type Declaration = { name: string; value: string; origin: string; scope?: 'user' }
type Entry = { name: string; value: string; origin: string }
type Action = { kind: 'put'; name: string; declaration: Declaration } | { kind: 'drop'; name: string }

/**
 * A kind whose planner puts every declaration not yet managed with the same value and drops every managed name no
 * longer declared; names in `conflicting[side]` are conflicts instead. `run` logs each call and fails the names in `failing`.
 */
function fakeKind(opts: { conflicting?: Partial<Record<Side, string[]>>; failing?: string[] } = {}) {
  const runs: string[] = []
  const kind: MovableKind<Declaration, Entry, Action> = {
    key: (x) => x.name,
    plan(declarations, managed, side) {
      const conflicting = new Set(opts.conflicting?.[side] ?? [])
      const conflicts: Conflict[] = []
      const actions: Action[] = []
      for (const declaration of declarations) {
        if (conflicting.has(declaration.name)) conflicts.push({ name: declaration.name, reason: 'manual-entry', detail: '' })
        else if (!managed.some((m) => m.name === declaration.name && m.value === declaration.value)) {
          actions.push({ kind: 'put', name: declaration.name, declaration })
        }
      }
      for (const m of managed) {
        if (conflicting.has(m.name)) conflicts.push({ name: m.name, reason: 'manual-entry', detail: '' })
        else if (!declarations.some((d) => d.name === m.name)) actions.push({ kind: 'drop', name: m.name })
      }
      return { actions, conflicts, adopted: [], forgotten: [] }
    },
    isRemoval: (a) => a.kind === 'drop',
    record: ({ name, value, origin }) => ({ name, value, origin }),
    async run(action, at) {
      runs.push(`${action.kind} ${action.name} @${at}`)
      if (opts.failing?.includes(action.name)) throw new Error(`${action.name} failed`)
      return action.kind === 'put' ? kind.record(action.declaration) : null
    },
  }
  return { kind, runs }
}

const declared = (name: string, scope?: 'user'): Declaration => ({ name, value: 'v', origin: 'config', ...(scope ? { scope } : {}) })
const managed = (name: string): Entry => ({ name, value: 'v', origin: 'config' })
const settled = () => true

async function applyAll<A>(move: { steps: { before: A[]; target: A[]; after: A[] }; apply(a: A, side: Side): Promise<string> }) {
  const errors: string[] = []
  const steps = [
    ...move.steps.before.map((a) => [a, 'user'] as const),
    ...move.steps.target.map((a) => [a, 'target'] as const),
    ...move.steps.after.map((a) => [a, 'user'] as const),
  ]
  for (const [action, side] of steps) await move.apply(action, side).catch((e: Error) => errors.push(e.message))
  return errors
}

describe('scopeMove', () => {
  it('plans every declaration at the targeted Scope when the Sync targets `user`', async () => {
    const { kind, runs } = fakeKind()
    const move = scopeMove(kind, [declared('a'), declared('b', 'user')], { scope: 'user' as Scope, managed: [] }, null)

    expect(move.steps.before).toEqual([])
    expect(move.steps.after).toEqual([])
    await applyAll(move)
    expect(runs).toEqual(['put a @user', 'put b @user'])
    expect(move.saved('target', settled).owned.map((r) => r.name)).toEqual(['a', 'b'])
  })

  it('adds User-scoped declarations before the targeted Scope and removes at `user` after it', async () => {
    const { kind, runs } = fakeKind()
    const move = scopeMove(
      kind,
      [declared('a'), declared('b', 'user')],
      { scope: 'project', managed: [managed('gone')] },
      { managed: [managed('old')], claims: [] },
    )

    await applyAll(move)
    expect(runs).toEqual(['put b @user', 'put a @project', 'drop gone @project', 'drop old @user'])
    expect(move.saved('target', settled)).toMatchObject({ owned: [managed('a')], claims: [managed('a')] })
    expect(move.saved('user', settled)).toMatchObject({ owned: [managed('b')], claims: [managed('b')] })
  })

  it('holds a removal on one side while the other side has a conflict with the same key', () => {
    const toUser = scopeMove(
      fakeKind({ conflicting: { user: ['x'] } }).kind,
      [declared('x', 'user')],
      { scope: 'project', managed: [managed('x')] },
      { managed: [], claims: [] },
    )
    expect(toUser.steps.target).toEqual([])
    expect(toUser.conflicts.map((c) => c.name)).toEqual(['x'])

    const back = scopeMove(
      fakeKind({ conflicting: { target: ['x'] } }).kind,
      [declared('x')],
      { scope: 'project', managed: [] },
      { managed: [managed('x')], claims: [] },
    )
    expect(back.steps.after).toEqual([])
  })

  it('keeps an entry at its old Scope when setting it up at the new one failed', async () => {
    const { kind, runs } = fakeKind({ failing: ['x'] })
    const move = scopeMove(kind, [declared('x', 'user')], { scope: 'project', managed: [managed('x')] }, { managed: [], claims: [] })

    const errors = await applyAll(move)
    expect(errors).toEqual(['x failed', '"x" is kept here until it is set up in user settings'])
    expect(runs).toEqual(['put x @user'])
    expect(move.saved('target', settled).owned).toEqual([managed('x')])
  })

  it('keeps a `user` claim for an entry moving back while the targeted Scope failed it or has a conflict', async () => {
    const failed = fakeKind({ failing: ['x'] })
    const move = scopeMove(failed.kind, [declared('x')], { scope: 'project', managed: [] }, { managed: [managed('x')], claims: [] })
    await applyAll(move)
    expect(move.saved('user', settled)).toMatchObject({ owned: [managed('x')], claims: [managed('x')] })

    const conflicted = scopeMove(
      fakeKind({ conflicting: { target: ['x'] } }).kind,
      [declared('x')],
      { scope: 'project', managed: [] },
      { managed: [], claims: [managed('x')] },
    )
    expect(conflicted.saved('user', settled).claims).toEqual([managed('x')])

    const done = scopeMove(fakeKind().kind, [declared('x')], { scope: 'project', managed: [] }, { managed: [managed('x')], claims: [] })
    await applyAll(done)
    expect(done.saved('user', settled)).toMatchObject({ owned: [], claims: [] })
  })

  it('claims only the settled declarations of each side', () => {
    const move = scopeMove(fakeKind().kind, [declared('a'), declared('b', 'user')], { scope: 'project', managed: [] }, { managed: [], claims: [] })
    const onlyB = (d: Declaration) => d.name === 'b'

    expect(move.saved('target', onlyB).claims).toEqual([])
    expect(move.saved('user', onlyB).claims).toEqual([managed('b')])
  })
})
