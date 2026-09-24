---
title: Replace hand-written collection helpers with es-toolkit and built-ins
labels: [done]
---

Decision: [ADR 0016](../../docs/adr/0016-es-toolkit-for-collection-helpers.md). Research:
[es-toolkit.md](../../docs/research/es-toolkit.md). Its **Bảng đối chiếu** is the site list for every refactor
ticket. Line numbers there are from commit `31f23a2`, so find each site by its code, not by its line number.
Related: [ADR 0008](../../docs/adr/0008-distribute-ap-via-github-release-tarball.md),
[ADR 0015](../../docs/adr/0015-zod-mini-for-spec-shape.md) (precedent for a bundled devDependency).

## Problem Statement

`packages/cli` hand-writes about 73 helpers that es-toolkit or a Node 22 built-in already provides: `[...new Set()]`,
`filter(x => !b.includes(x))`, rest-destructuring to drop keys, a local `pick` and a local `compact`, and hand-rolled
`typeof x === 'object'` guards with casts.

Research also turned up two existing bugs:

- `ap init` turns `Dự Án` into `d-n`, and never re-validates a derived name.
- Workflow ordering depends on the machine's locale, and that order is written to the Lock.

The existing tests catch none of the 21 behaviour-changing replacements the research tried.

## Solution

### Rules (from ADR 0016)

1. Arrays → es-toolkit. An existing `Set` → its own methods; filtering an array by a `Set` stays
   `filter((x) => !set.has(x))`. Grouping → `Map.groupBy`. Deep equality → `isDeepStrictEqual`.
2. Banned imports: `isEqual`, `compact`, `groupBy`, `sortBy`, `orderBy`, `kebabCase`, `memoize`, `mapAsync`,
   `filterAsync`, `forEachAsync`, `reduceAsync`, `flatMapAsync`, and anything from `es-toolkit/server` or
   `es-toolkit/compat`. A test enforces the list.
3. A replacement that needs a new cast or lets `any` through is skipped. The same goes for one that makes the code
   longer, such as `omit` where the destructuring also reads the dropped field. Each refactor commit lists the sites it
   skipped and why.
4. `isPlainObject` is never imported directly. `isRecord(x): x is Record<string, unknown>` in `src/sync/guards.ts`
   wraps it.

### Dependency and types

- `es-toolkit` goes into `packages/cli` `devDependencies` (bundled by `pack-release.mjs`), imported from the root
  entry `es-toolkit`.
- `tsconfig.json` gains `"lib": ["ES2025"]`, for `Map.groupBy` and the `Set` methods. `target` stays `ES2023`, and
  esbuild's `target: node22` is untouched.

### Lock-in tests first

These tests pin **current** behaviour before any refactor lands:

- `mergeLayers`: MCP servers named `github, context7, 2fa, 7, sentry` keep that order in the result.
- `collectItems`: an all-digit item name (`7`) keeps its declaration order.
- `findWorkflows` / `listInstalledWorkflows`: the order of `audit, deploy, Deploy-prod, Zeta, zeta2`. For the
  Installed workflow `deploy` with `b.js` and `B.js`, which file wins.
- `spec: [a]` keeps its current message, ``unknown key `spec.0` ``.
- A plugin manifest whose `mcpServers` is an array keeps its current behaviour (`registry.ts`, the `pluginMcp` read).
- `init` with an ASCII directory name (`My_Cool.Repo` → `my-cool-repo`, `v1.2.3` → `v1-2-3`).

### Behaviour fixes (each its own `fix` commit)

- **`ap init`:** the derived name is `kebabCase(deburr(basename))`, using the hand-written `kebabCase`. It is then
  checked against `NAME_PATTERN`. If the check fails, throw the existing "cannot derive a Config name …; pass --name"
  error. Expected: `Dự Án` → `du-an`, `Đường Đi` → `duong-di`, `日本語` → error, `x😀y` → `x-y`.
- **Workflow order:** `localeCompare(b.name, 'en')` in `findWorkflows` and `listInstalledWorkflows`. The lock-in test
  from above now asserts a result that is the same under every `LC_ALL`.

### Refactors

Grouped by helper family, one commit each. Every commit is behaviour-preserving, and test and typecheck pass before
and after it.

## Out of scope

- Every replacement the research marked **đổi hành vi**, apart from the two fixes above: `isPlainObject` at
  `registry.ts:250` and `spec.ts:315`, `isEqual`, `groupBy`, `sortBy`, `kebabCase`, `es-toolkit/server`, and the
  `*Async` helpers.
- Sites marked **không đáng** or **không áp dụng**, unless rule 3 is met anyway.
- `sameMcp` with `-0`. It is moot, since `isDeepStrictEqual` stays.

## Done when

- Every ticket under `issues/` is `[done]`.
- `pnpm -C packages/cli test` and `typecheck` pass.
- `pnpm -C packages/cli pack:release` and `scripts/smoke-release.sh` pass. The commit of the last refactor ticket
  records the growth of `dist/ap.js`, which is expected to be about +3.5 KB.
