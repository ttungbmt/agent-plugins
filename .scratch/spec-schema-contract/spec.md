---
title: Keep the `spec.*` parser and the Config/Preset JSON schemas from drifting
labels: [ready-for-agent]
---

Terms: [CONTEXT.md](../../CONTEXT.md) (Config, Preset). Related open tickets that own schema work this spec must not
duplicate: [rules/10](../rules/issues/10-schema-preset-docs.md) (`spec.rules` in both schemas) and
[hooks/03](../hooks/issues/03-hooks-in-presets.md) (`spec.hooks` in Presets and both schemas).

## Problem Statement

Adding a `spec.*` key means editing three places by hand: the parser in `packages/cli/src/sync/resolve.ts` (the only
runtime validation), `packages/schemas/schemas/config.schema.json` and `preset.schema.json`. Nothing checks that they
agree, and today they don't:

| key | parser reads it in | `preset.schema.json` | `config.schema.json` |
|---|---|---|---|
| `rules` | Config and Preset (via `ITEM_KINDS`) | missing (rules/10) | missing (rules/10) |
| `hooks` | Config only | missing (hooks/03) | missing (hooks/03) |
| unknown key, e.g. `skils` | silently ignored | rejected (`additionalProperties: false`) | rejected |

So the drift goes both ways. A Config using `rules` works but the editor (via the `$schema` line `ap init` writes)
flags it as an error. A typo'd key is flagged by the editor but `ap sync` ignores it, and the parser is meant to be the
only runtime validation. The same goes for `hooks` in a Preset: the parser never reads it, so it is ignored today.

## Options considered

- **Generate the schemas from the parser** (rewrite the parser in zod/typebox and emit JSON Schema). Rejected. Most of
  the parser is semantic checks a schema can't express (`scope: user` with a directory source, `path` inside the
  source, MCP catalog lookup, path rebasing). The rewrite would lose the origin-prefixed error messages, add a runtime
  dependency to the Release tarball (ADR 0008), and put at risk the hand-written `description`/`examples`/titled `oneOf`
  that make the schemas useful in an editor.
- **Generate or back the parser with the schema** (ajv at runtime). Rejected. The semantic checks stay, so this adds a
  second validation layer instead of removing one of the three places. ajv errors
  (`/spec/skills/0 must match exactly one schema in oneOf`) are worse than the current ones, and ajv would move from
  devDependency into the bundle.
- **Keep the three places hand-written and add a contract test.** Chosen. It needs no new dependency and doesn't change
  what users see at runtime, except that unknown keys are now rejected. It follows the precedent of
  `mcp-catalog.test.ts`, which already validates the catalog against its schema with `Ajv2020`.

## Solution

1. **One declaration of the accepted keys.** `resolve.ts` exports `PRESET_SPEC_KEYS` and `CONFIG_SPEC_KEYS`, built
   from a shared list plus `ITEM_KINDS`. They list exactly the keys the parser reads for each document kind. The
   parser rejects any other key under `spec` with a `ConfigError`. The existing `extends`-in-Config and
   `presets`-in-Preset checks become special cases that keep their own, more helpful messages.
2. **A key-set contract test** checks each schema's `properties.spec.properties` against those constants. It also
   checks that every key shared by both schemas is a `$ref` from `config.schema.json` into the same key of
   `preset.schema.json`, the convention that keeps the two schemas from drifting apart. Keys whose schema is owned by
   an open ticket go on an explicit known-gap list. Each gap names its ticket, and the test fails once a gap is closed
   but still listed, so the list only shrinks.
3. **A shape corpus** runs every sample Config in `examples/` and every default Preset in `packages/cli/presets/`
   through both ajv and the parser, and expects both to accept. A few invalid fixtures are ones both must reject. This
   catches drift below the key level (a new field on an entry), without claiming full equivalence.

## Implementation Decisions

- The key constants live in `resolve.ts`, next to the parser that consumes them. They don't go in `types.ts`, because
  nothing outside resolution needs them.
- Rejecting unknown keys is a behaviour change: a Config or Preset with a stray `spec` key used to sync and now fails.
  The error names the key and lists the accepted ones. Remote Presets are affected too, which is correct, since they
  were silently losing that key.
- `hooks` is in `CONFIG_SPEC_KEYS` but not in `PRESET_SPEC_KEYS` until hooks/03 lands. That ticket adds it to the
  constant and removes it from the known-gap list.
- Tests read the schemas the way `mcp-catalog.test.ts` does, from `packages/schemas/schemas/` relative to the package.
- `CLAUDE.md` (Architecture → "A new `spec.*` key…") mentions that the contract test points at whichever place was
  missed.

## Testing Decisions

- `resolve.test.ts` (or the nearest existing resolve test): an unknown key under `spec` is rejected for a Config, a
  local Preset and a remote Preset. `extends` in a Config and `presets` in a Preset keep their current messages.
- `spec-schema.test.ts`: the key-set contract and the `$ref` convention, plus the known-gap list behaviour (a gap that is
  closed but still listed fails).
- The shape corpus goes in the same file, built with `makeTree` and `fakeClaude` from `test-helpers.ts`/`fake-claude.ts`
  so it stays offline.

## Out of Scope

- Unknown keys outside `spec` (`kind`, `metadata`, top-level).
- Writing the schema for `rules` and `hooks` (rules/10, hooks/03).
- Proving full equivalence between the parser and the schemas.
