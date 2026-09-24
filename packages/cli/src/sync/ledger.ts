/** The Managed entries of one kind in one Scope, kept up to date while a Sync applies its steps (ADR 0003). */
export type Ledger<M> = {
  get(key: string): M | undefined
  has(key: string): boolean
  /** Records `entry`, replacing the one with the same key in place. */
  set(entry: M): void
  delete(key: string): void
  /** What is saved to the Lock/State as the Scope's Managed entries. */
  values(): M[]
  /** Managed entries the plan forgot: no longer this Config's, saved as released so another Config can take them over. */
  released: M[]
  /** Keys of the Manual entries the plan adopted, for the "ap now manages …" notice. */
  adopted: string[]
}

/**
 * Starts from the Lock/State's Managed entries, drops what the plan `forgotten` and records what it `adopted`: a Manual
 * entry that already matches its declaration.
 */
export function ledger<M, A>(
  managed: M[],
  key: (entry: M) => string,
  plan: { adopted: A[]; forgotten: string[] },
  toRecord: (adopted: A) => M,
): Ledger<M> {
  const records = new Map(managed.map((m) => [key(m), m]))
  for (const k of plan.forgotten) records.delete(k)
  const adopted = plan.adopted.map(toRecord)
  for (const m of adopted) records.set(key(m), m)
  return {
    get: (k) => records.get(k),
    has: (k) => records.has(k),
    set: (m) => void records.set(key(m), m),
    delete: (k) => void records.delete(k),
    values: () => [...records.values()],
    released: managed.filter((m) => plan.forgotten.includes(key(m))),
    adopted: adopted.map(key),
  }
}
