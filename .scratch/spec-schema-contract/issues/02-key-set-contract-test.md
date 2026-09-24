---
title: Contract test between the `spec` key constants and both JSON schemas
labels: [done]
blocked_by: [01]
---

Spec: [../spec.md](../spec.md) (Solution 2).

## Work

- Add `packages/cli/src/sync/spec-schema.test.ts`. It reads both schemas the way `mcp-catalog.test.ts` does.
- Assert `keys(preset.properties.spec.properties)` equals `PRESET_SPEC_KEYS` and
  `keys(config.properties.spec.properties)` equals `CONFIG_SPEC_KEYS`, minus the known gaps.
- Assert every key present in both schemas' `spec` is `{ "$ref": "preset.schema.json#/properties/spec/properties/<key>" }`
  in `config.schema.json`.
- Known-gap list, each entry `{ schema, key, owner }` pointing at the ticket that owns the schema work:
  - `rules` in both schemas → `.scratch/rules/issues/10-schema-preset-docs.md`
  - `hooks` in `config.schema.json` → `.scratch/hooks/issues/03-hooks-in-presets.md`

  The test fails if a listed gap is already present in the schema, so whoever closes it must also delete the entry.
- Add a line to rules/10 and hooks/03 acceptance: "remove the matching entry from the known-gap list in
  `spec-schema.test.ts`".
- In `CLAUDE.md` Architecture, change the "A new `spec.*` key touches three places" bullet to add that
  `spec-schema.test.ts` reports which place is missing.

## Acceptance

- The test passes on the current tree with only the two gaps listed.
- Removing a key from one schema, or adding a key to a constant without the schema, turns it red with a message naming
  the key and the file.
- Adding `rules` to `preset.schema.json` without removing its gap entry turns it red.
- Test and typecheck pass.
