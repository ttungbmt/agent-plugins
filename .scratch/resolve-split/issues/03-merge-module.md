---
title: Add `merge.ts` with `mergeLayers`, and encode precedence only as `shadows`
labels: [done]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (section `merge.ts`). ADR 0004, ADR 0012, ADR 0013. Pure refactor.

## Work

- Move `mergePresets`, `mergePlugins`, `mergeItems`, `mergeMcpServers`, `checkUserScopedPlugins`, `unionSelections`,
  `selectionsOverlap`, `outranks`, `sameMarketplace`, `sameDeclaration` and `overrideNotice` into `merge.ts`, behind
  `mergeLayers`. Move the Config's marketplace override (`kept`, `ownNames`) from `resolveConfig` in as well.
- Marketplace contributions carry `presets`/`shadows` like the other kinds. Drop the `ancestors` map from the merge
  input.
- `collect-items.ts` imports `outranks` from `merge.ts`.
- Build the Config's layer after the Presets' layers, and take hooks from the Config's layer only.

## Acceptance

- `merge.test.ts`, with layers built in memory:
  - a child Preset overrides its parent (with a notice);
  - two peer Presets with different sources clash;
  - the Config overrides a marketplace declared under a different name but with the same source, and drops a
    preset-clash on a name it declares;
  - peer item selections are unioned;
  - the same item selected at both Scopes by peers clashes, and throws when both selections come from one origin;
  - peer MCP servers that differ clash;
  - notices come out in the order the spec lists.
- `resolve.test.ts` passes unchanged. Merged notices and conflicts are in the same order for every existing test.
- Test and typecheck pass.
