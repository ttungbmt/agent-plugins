---
title: Move `ConfigError`, `describeItemSource` and `withoutRef` out of `resolve.ts`
labels: [done]
blocked_by: []
---

Spec: [../spec.md](../spec.md) (section `errors.ts` and `identity.ts`). Pure refactor.

## Work

- Add `packages/cli/src/sync/errors.ts` with `ConfigError`.
- Move `describeItemSource` and `withoutRef` into `identity.ts`.
- Update every importer: `shorthand.ts`, `collect-items.ts`, `format-report.ts`, `commands/sync.ts`,
  `commands/init.ts`, `init/index.ts`. Add no re-exports from `resolve.ts`.

## Acceptance

- `shorthand.ts` no longer imports `resolve.ts`.
- Test and typecheck pass with no test edits beyond import lines.
