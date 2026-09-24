---
title: Add es-toolkit, the `isRecord` guard and the banned-import test
labels: []
blocked_by: []
---

Spec: [../spec.md](../spec.md) (sections Rules, Dependency and types). ADR 0016.

## Work

- Add `es-toolkit` to `packages/cli` `devDependencies`, then run `pnpm install`.
- Create `src/sync/guards.ts` with `isRecord(value: unknown): value is Record<string, unknown>`, wrapping es-toolkit's
  `isPlainObject`. Give it a unit test covering `{}`, `Object.create(null)`, `[]`, `null` and `new Date()`.
- Add a test that reads every non-test `.ts` file under `src/` and fails when an `es-toolkit` import names a banned
  function, or when the import path is `es-toolkit/server` or `es-toolkit/compat`. The failure message names the file,
  the import and ADR 0016. Keep the banned list in one place, in the test itself.
- Add a CLAUDE.md line naming this test next to the existing es-toolkit convention.

## Acceptance

- The import test fails on a scratch file that imports `isEqual` (check this, then delete the file).
- Test and typecheck pass.
