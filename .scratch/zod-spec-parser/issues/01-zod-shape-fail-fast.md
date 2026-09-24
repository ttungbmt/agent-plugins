---
title: Check `spec.*` shape with `zod/mini`, still stopping at the first error
labels: [ready-for-agent]
blocked_by: []
---

Spec: [../spec.md](../spec.md) (sections Two phases, Messages, Spec keys, Dependency). ADR 0015.

## Work

- Add `zod` to `devDependencies` and import it as `zod/mini`.
- Write the `Spec` schemas (Config and Preset) in `spec.ts` with a message on every node, and the path-based formatter.
- Run the two phases. At the end of each phase, throw a `ConfigError` for the **first** issue only (after the
  unknown-key-first sort). Keep the semantic phase's `Promise.all` behaviour for now. Reporting every error is
  ticket 03.
- Remove `itemsPath`, and move the Hook group check from `checkHook` into the schema. Delete `checkHook`,
  `REQUIRED`/`GROUP_KEYS` in `hooks.ts`, and move its tests into `spec.test.ts`.
- Derive `PRESET_SPEC_KEYS`/`CONFIG_SPEC_KEYS` from the schema.
- Reject the inputs listed in ADR 0015 with the 7 new messages.

## Acceptance

- `spec.test.ts`:
  - one test per new rejection (including `marketplaces: { acme: null }` and `skills: [null]`, which crash today);
  - `enable: true` reports `has unknown field "enable"`;
  - no fixture produces `Invalid input`.
- `resolve.test.ts`, `spec-schema.test.ts` and `sync-*.test.ts` pass. List any test changed for `plugins: false`/`0`/`''`
  becoming an error.
- `pack:release` and `smoke-release.sh` pass. Record the `dist/ap.js` and `ap.tgz` size deltas in the commit message.
- Test and typecheck pass.
