import { isDeepStrictEqual } from 'node:util'
import { readJson, settingsPath, writeJson, type Location } from './files.js'
import type { HookDeclaration, HookGroup, ManagedHook, Scope } from './types.js'

/** The settings `hooks` key: event → matcher groups. User groups may contain anything, so they stay opaque. */
export type SettingsHooks = Record<string, unknown>

export type PlannedHookAction =
  | { kind: 'add' | 'update'; name: string; declaration: HookDeclaration }
  | { kind: 'remove'; name: string }

export type HookPlan = {
  actions: PlannedHookAction[]
  /** A Managed hook no longer declared and already gone from settings: only needs removing from Lock/State. */
  forgotten: string[]
}

/** Canonical form for comparing and writing to Lock/State: an empty, `"*"` or absent `matcher` matches everything, so it is dropped. */
export function normalizeHook({ event, matcher, hooks, ...rest }: HookGroup): HookGroup {
  return { event, ...(matcher === undefined || matcher === '' || matcher === '*' ? {} : { matcher }), hooks, ...rest }
}

/** Whether two groups have the same content: compared by deep value, not key order. */
export function sameHook(a: HookGroup, b: HookGroup): boolean {
  return isDeepStrictEqual(normalizeHook(a), normalizeHook(b))
}

/** Index of the group in settings that matches exactly one Managed hook, or -1. */
function locate(hooks: SettingsHooks, record: ManagedHook): number {
  return groupsOf(hooks, record.group.event).findIndex(
    (g) => g !== null && typeof g === 'object' && !Array.isArray(g) && sameHook({ event: record.group.event, ...(g as Omit<HookGroup, 'event'>) }, record.group),
  )
}

function groupsOf(hooks: SettingsHooks, event: string): unknown[] {
  const groups = hooks[event]
  return Array.isArray(groups) ? groups : []
}

/**
 * Computes the steps that bring a Scope's `hooks` key in line with the declarations. Each Hook declaration is its own
 * matcher group; a Managed hook is recognised by the content recorded in Lock/State, since settings have no identifier for
 * a Hook. A Managed hook whose declaration is unchanged but is gone from settings is left alone: we can't yet tell a manual
 * deletion (add it back) from a manual edit (adding it back would run it twice).
 */
export function planHooks(desired: HookDeclaration[], actual: SettingsHooks, managed: ManagedHook[]): HookPlan {
  const actions: PlannedHookAction[] = []
  for (const declaration of desired) {
    const { name } = declaration
    const record = managed.find((m) => m.name === name)
    if (!record) actions.push({ kind: 'add', name, declaration })
    else if (!sameHook(record.group, declaration.group)) actions.push({ kind: 'update', name, declaration })
  }

  const forgotten: string[] = []
  for (const record of managed) {
    if (desired.some((d) => d.name === record.name)) continue
    if (locate(actual, record) === -1) forgotten.push(record.name)
    else actions.push({ kind: 'remove', name: record.name })
  }
  return { actions, forgotten }
}

/**
 * Applies the steps to the `hooks` key and returns the new key (null when no groups remain): adds go to the end of the
 * event's array, `update` replaces in place (a changed event moves it to the end of the new event's array), `remove`
 * drops the group. Empty event arrays are deleted; all other groups stay as they are.
 */
export function nextHooks(hooks: SettingsHooks, actions: PlannedHookAction[], managed: ManagedHook[]): SettingsHooks | null {
  const next: SettingsHooks = { ...hooks }
  const groups = (event: string) => (next[event] = [...groupsOf(next, event)]) as unknown[]
  for (const action of actions) {
    const record = managed.find((m) => m.name === action.name)
    const at = record ? locate(next, record) : -1
    if (action.kind === 'remove') {
      if (at !== -1) groups(record!.group.event).splice(at, 1)
      continue
    }
    const { event } = action.declaration.group
    const written = settingsGroup(action.declaration.group)
    if (at !== -1 && record!.group.event === event) {
      groups(event)[at] = written
      continue
    }
    if (at !== -1) groups(record!.group.event).splice(at, 1)
    groups(event).push(written)
  }
  for (const [event, value] of Object.entries(next)) if (Array.isArray(value) && value.length === 0) delete next[event]
  return Object.keys(next).length ? next : null
}

/** The group as written to settings: exactly as the user wrote it, minus `event`, since that is the key holding the group. */
function settingsGroup({ event: _, ...group }: HookGroup) {
  return group
}

/** The `hooks` key in the Scope's settings. */
export async function readSettingsHooks(scope: Scope, location: Location): Promise<SettingsHooks> {
  return hooksOf(await readJson(settingsPath(scope, location)))
}

/** Applies all hook steps of a Scope in one write, re-reading settings right before writing to keep every other key. */
export async function writeSettingsHooks(scope: Scope, location: Location, actions: PlannedHookAction[], managed: ManagedHook[]) {
  const path = settingsPath(scope, location)
  const settings = await readJson<Record<string, unknown>>(path)
  const hooks = nextHooks(hooksOf(settings), actions, managed)
  if (hooks) settings.hooks = hooks
  else delete settings.hooks
  await writeJson(path, settings)
}

function hooksOf({ hooks }: { hooks?: unknown }): SettingsHooks {
  return hooks && typeof hooks === 'object' && !Array.isArray(hooks) ? (hooks as SettingsHooks) : {}
}
