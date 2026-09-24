import { ledger, type Ledger } from './ledger.js'
import type { Conflict, Scope } from './types.js'

/** `target`: the Scope the Sync targets; `user`: the `user` Scope that User-scoped declarations are synced to. */
export type Side = 'target' | 'user'

/** What a planner returns for one Scope; the same shape as `planPlugins` and `planMcp`. */
export type KindPlan<A, D> = { actions: A[]; conflicts: Conflict[]; notices?: string[]; adopted: D[]; forgotten: string[] }

/**
 * A kind of Managed entry that can be declared at the `user` Scope and move between it and the targeted Scope: Plugin
 * entries (ADR 0012) and MCP servers (ADR 0014). `D` is its declaration, `M` its Managed entry, `A` a planned action.
 */
export type MovableKind<D, M, A> = {
  /** The name that identifies a declaration, Managed entry or action; conflicts carry the same name. */
  key(x: D | M | A): string
  /** Plans one Scope; the kind closes over that Scope's settings and the other Configs' claims there. */
  plan(declarations: D[], managed: M[], side: Side): KindPlan<A, D>
  isRemoval(action: A): boolean
  record(declaration: D): M
  /**
   * Runs one action at `at`; returns the Managed entry to record, or null to leave the record alone (a removal is
   * dropped from the records by `scopeMove`). `owns` tells whether that Scope already manages a key.
   */
  run(action: A, at: Scope, owns: (key: string) => boolean): Promise<M | null>
}

/**
 * Syncs one movable kind to the targeted Scope and, unless the Sync targets `user`, its User-scoped declarations to the
 * `user` Scope, under the Scope move rules of ADR 0011, 0012 and 0014:
 * - `user` additions run before the targeted Scope's actions and `user` removals after them, so an entry moving between
 *   the two Scopes is never missing from both;
 * - a removal on one side is held while the other side has a conflict with the same key;
 * - once setting an entry up at one Scope failed, its removal from the other Scope is refused, so it stays at its old Scope;
 * - an entry moving back from `user` keeps this Config's claim there until the targeted Scope has it.
 * `user.claims` are this Config's previous claims at `user`, which also count as moving back.
 */
export function scopeMove<D extends { scope?: 'user' }, M, A>(
  kind: MovableKind<D, M, A>,
  declarations: D[],
  target: { scope: Scope; managed: M[] },
  user: { managed: M[]; claims: M[] } | null,
) {
  const lifted = user ? declarations.filter((d) => d.scope === 'user') : []
  const declared = { target: declarations.filter((d) => !lifted.includes(d)), user: lifted }
  const plans = {
    target: kind.plan(declared.target, target.managed, 'target'),
    user: user && kind.plan(lifted, user.managed, 'user'),
  }
  const ledgers: { target: Ledger<M>; user: Ledger<M> | null } = {
    target: ledger(target.managed, kind.key, plans.target, kind.record),
    user: user && ledger(user.managed, kind.key, plans.user!, kind.record),
  }
  const conflicted = {
    target: new Set(plans.target.conflicts.map((c) => c.name)),
    user: new Set(plans.user?.conflicts.map((c) => c.name)),
  }
  const heldBy = (other: Set<string>) => (a: A) => !(kind.isRemoval(a) && other.has(kind.key(a)))
  const userActions = plans.user?.actions ?? []
  const scopeOf = (side: Side): Scope => (side === 'user' ? 'user' : target.scope)
  /** Keys whose setup failed, with the Scope it failed at. */
  const failed = new Map<string, Scope>()

  return {
    plans,
    conflicts: [...plans.target.conflicts, ...(plans.user?.conflicts ?? [])],
    notices: [...(plans.target.notices ?? []), ...(plans.user?.notices ?? [])],
    /** Keys of the Manual entries adopted without any action, targeted Scope first. */
    adopted: [...ledgers.target.adopted, ...(ledgers.user?.adopted ?? [])],
    steps: {
      before: userActions.filter((a) => !kind.isRemoval(a)),
      target: plans.target.actions.filter(heldBy(conflicted.user)),
      after: userActions.filter((a) => kind.isRemoval(a)).filter(heldBy(conflicted.target)),
    },

    /** Runs one of `steps` at its side and updates that side's records; returns the action's key. */
    async apply(action: A, side: Side): Promise<string> {
      const key = kind.key(action)
      const at = scopeOf(side)
      const owned = ledgers[side]!
      const failedAt = failed.get(key)
      if (kind.isRemoval(action) && failedAt && failedAt !== at) {
        throw new Error(`"${key}" is kept here until it is set up in ${failedAt} settings`)
      }
      let recorded: M | null
      try {
        recorded = await kind.run(action, at, (k) => owned.has(k))
      } catch (error) {
        if (!kind.isRemoval(action)) failed.set(key, at)
        throw error
      }
      if (kind.isRemoval(action)) owned.delete(key)
      else if (recorded) owned.set(recorded)
      return key
    },

    /**
     * What to save for `side` once every step ran: its Managed entries, the ones it released, and this Config's claims —
     * the `settled` declarations (not caught in a conflict), plus, at `user`, the entries moving back.
     */
    saved(side: Side, settled: (declaration: D) => boolean): { owned: M[]; released: M[]; claims: M[] } {
      const owned = ledgers[side]
      if (!owned) return { owned: [], released: [], claims: [] }
      const claims = declared[side].filter(settled).map(kind.record)
      if (side === 'user') {
        const liftedKeys = new Set(lifted.map(kind.key))
        const seen = new Set<string>()
        for (const m of [...user!.managed, ...user!.claims]) {
          const key = kind.key(m)
          if (seen.has(key) || liftedKeys.has(key)) continue
          seen.add(key)
          if (failed.get(key) === target.scope || conflicted.target.has(key)) claims.push(m)
        }
      }
      return { owned: owned.values(), released: owned.released, claims }
    },
  }
}
