---
title: Derive `Selection`, `HookGroup`/`HookHandler` and `PluginDeclaration` from the schema
labels: [done]
blocked_by: [01]
---

Spec: [../spec.md](../spec.md) (section Types). ADR 0015.

## Work

- Replace the hand-written `Selection`, `HookGroup`, `HookHandler` and `PluginDeclaration` in `types.ts` with
  `z.output` of the schema. `PluginDeclaration` needs an annotation so that `scope?: 'user'` survives the boolean branch.
- Leave every other type in `types.ts` hand-written.

## Acceptance

- `types.ts` no longer declares those four shapes by hand.
- No other file changes except type imports.
- Test and typecheck pass. Record the typecheck wall time before and after (3 runs) in the commit message.
