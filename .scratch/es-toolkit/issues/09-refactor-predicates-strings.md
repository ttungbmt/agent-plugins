---
title: Use `isRecord`, es-toolkit predicates and `trimEnd`
labels: [done]
blocked_by: [02, 03]
---

Spec: [../spec.md](../spec.md) (sections Rules, Refactors). Sites: research **Bảng đối chiếu → Predicate** and
**String, function, promise, util, server**, rows marked **tương đương**.

## Work (commit as `refactor(sync)`)

- `isRecord` at `hooks.ts` (2 sites) and `spec.ts` (the `{}`-message site). Drop the cast `as SettingsHooks` where
  `isRecord` makes it redundant. **Do not** touch `registry.ts:250` or `spec.ts:315` (out of scope).
- `isEmptyObject` (2 sites), `isNotNil` (3 sites, dropping the hand-written type guards).
- `trimEnd(s, '/')` for the 6 `.replace(/\/+$/, '')` sites.
- `once` in `preset-loader.ts` and `asyncNoop` in `skills.ts`, only if they satisfy rule 3; otherwise list them as
  skipped.
- If this is the last of tickets 06–09 to land, run `pack:release` and `smoke-release.sh`, and record the `dist/ap.js` size change in the commit message.

## Acceptance

- The `spec: [a]` and `mcpServers: [...]` tests from ticket 03 pass unmodified.
- Test and typecheck pass (plus `pack:release` and `smoke-release.sh` when last).
