---
title: Declare the accepted `spec` keys once and reject unknown ones
labels: [done]
blocked_by: []
---

Spec: [../spec.md](../spec.md) (Solution 1, Implementation Decisions).

## Work

- In `resolve.ts`, export `PRESET_SPEC_KEYS` (`extends`, `marketplaces`, `plugins`, one `<kind>s` per `ITEM_KINDS`,
  `mcpServers`) and `CONFIG_SPEC_KEYS` (the same, with `presets` instead of `extends`, plus `hooks`). Derive
  `PresetDocument['spec']` from them if that stays readable.
- `resolveConfig` and `collect` reject any other key under `spec` with a `ConfigError` that names the key and the
  document, and lists the accepted keys.
- Keep the existing `spec.extends`-in-Config and `spec.presets`-in-Preset messages. They are checked before the generic
  unknown-key error.

## Acceptance

- `resolve.test.ts`: a stray `spec` key (e.g. `skils`) fails for a Config, a local Preset and a remote Preset, and the
  error names the key.
- `hooks` in a Preset fails as an unknown key until hooks/03 adds it.
- The existing `extends`/`presets` error tests pass unchanged.
- `pnpm ap sync --dry-run` at the repo root still succeeds, so the dogfooded Config and the `agent-plugins` Preset have
  no stray keys.
- Test and typecheck pass.
