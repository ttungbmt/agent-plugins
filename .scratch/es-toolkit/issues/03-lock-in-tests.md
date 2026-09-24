---
title: Pin the behaviours no current test covers
labels: []
blocked_by: []
---

Spec: [../spec.md](../spec.md) (section Lock-in tests first). Research: **Những chỗ đổi hành vi**.

## Work

Add tests that pin **current** behaviour, next to the file each one covers:

- `merge.test.ts`: MCP servers `github, context7, 2fa, 7, sentry` keep that order out of `mergeLayers`. Also pin a
  key named `__proto__`.
- `collectItems` (the closest existing test file): an all-digit item name keeps its declaration order.
- Workflows: the name order for `audit, deploy, Deploy-prod, Zeta, zeta2`, and which of `b.js`/`B.js` becomes the
  Installed workflow `deploy`. Pin today's `localeCompare` result under `en`; ticket 05 makes it locale-independent.
- `spec.test.ts`: `spec: [a]` gives ``unknown key `spec.0` ``.
- `registry`: a plugin manifest with `mcpServers: [...]` keeps its current result.
- `init.test.ts`: `v1.2.3` → `v1-2-3`, `My Project v2` → `my-project-v2`.

## Acceptance

- Every new test passes on the current code.
- Each one fails when the matching behaviour-changing replacement from the research is applied to it: `groupBy`,
  `sortBy`, `isPlainObject`, or es-toolkit's `kebabCase`. Check this locally and revert.
- Test and typecheck pass.
