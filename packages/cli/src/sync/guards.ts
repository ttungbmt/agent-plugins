import { isPlainObject } from 'es-toolkit'

/**
 * Whether `value` is a plain object: `{}` or `Object.create(null)`, never an array, `null` or a class instance.
 * Wraps es-toolkit's `isPlainObject`, which narrows to `Record<PropertyKey, any>`, so `any` stays out (ADR 0016).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value)
}
