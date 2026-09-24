---
title: Add `preset-loader.ts` and reduce `resolveConfig` to orchestration
labels: [done]
blocked_by: [03]
---

Spec: [../spec.md](../spec.md) (sections `preset-loader.ts` and `resolveConfig` after the split). ADR 0004,
ADR 0006. Pure refactor, apart from the accepted deviation in the spec.

## Work

- Move `load`, `loadRemote`, `loadLocal`, `loadDefaultPreset`, `collect` (as the `presets()` async generator),
  `rebasePath`, `mcpCatalog`, `isRemote`, `sha256` and `list` into `preset-loader.ts`. `Resolution` and `usedPins`
  become the loader's private state.
- Keep the fetch-per-reference behaviour for a shared Remote preset and the lazy MCP catalog read.
- `resolveConfig` becomes the five steps listed in the spec.
- Mention the accepted deviation (the order of a Config hook error vs. `checkUserScopedPlugins`) in the commit message.

## Acceptance

- `preset-loader.test.ts`:
  - parents are yielded before children, and a shared parent once;
  - a cycle throws with its chain;
  - a relative ref inside a Remote preset resolves against its URL;
  - `rebase` throws for a Remote preset;
  - `pins()` holds the hashes of every Remote preset loaded.
- `resolve.test.ts` and `init/init.test.ts` pass unchanged, apart from import lines.
- The spec's "Done when" list holds.
- Test and typecheck pass.
