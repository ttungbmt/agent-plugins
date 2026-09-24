---
title: Add `spec.ts` and read every document through `readDeclarations`
labels: [ready-for-agent]
blocked_by: [01]
---

Spec: [../spec.md](../spec.md) (section `spec.ts`). ADR 0004, ADR 0006. Pure refactor.

## Work

- Move `PresetDocument`, the `read*` functions, `readPluginValue`, `itemsPath`, `isLocal`, `projectRelativePath` and
  `MARKETPLACE_EXTRAS` into `spec.ts`, behind `readDeclarations` and `presetRefs`.
- `presetRefs` absorbs `checkSpecKeys`; `PRESET_SPEC_KEYS`/`CONFIG_SPEC_KEYS` move into `spec.ts`.
- `collect` and `resolveConfig` call `readDeclarations` once per document. `collect` still attaches `presets`/`shadows`
  and rebases sources itself (the loader comes in ticket 04).
- A Preset's `hooks` are not merged (`checkSpecKeys` already rejects them); leave a comment pointing to hooks ticket 03.

## Acceptance

- `spec.test.ts`: one test per key through `readDeclarations`, covering a valid map form and one error (unknown
  field) with its message; `presetRefs` rejects `spec.presets` in a Preset and `spec.extends` in a Config.
- `resolve.test.ts` passes unchanged.
- Test and typecheck pass.
