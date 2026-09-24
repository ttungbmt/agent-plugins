---
title: Raise the TypeScript `lib` to ES2025
labels: []
blocked_by: []
---

Spec: [../spec.md](../spec.md) (section Dependency and types). ADR 0016.

## Work

- Add `"lib": ["ES2025"]` to `packages/cli/tsconfig.json`. Leave `target` at `ES2023`.
- No source changes.

## Acceptance

- `Map.groupBy` and `new Set().difference` typecheck without TS2550. Check this with a throwaway file; do not commit it.
- Test and typecheck pass. Record the typecheck wall time before and after (3 runs) in the commit message.
