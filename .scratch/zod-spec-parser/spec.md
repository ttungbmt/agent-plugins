---
title: Check the shape of `spec.*` with `zod/mini` and report every error in a file
labels: [ready-for-agent]
---

Decision: [ADR 0015](../../docs/adr/0015-zod-mini-for-spec-shape.md). Research:
[spec-validation-libraries.md](../../docs/research/spec-validation-libraries.md). Prototype (a primary source, not code
to copy blindly): branch `worktree-agent-a92379e4552989eea`, files `packages/cli/proto/spec.zodmini.ts`,
`proto/types.zod.ts`, with the measuring scripts under `proto/`. Terms: [CONTEXT.md](../../CONTEXT.md) (Config, Preset,
Shorthand declaration, MCP catalog, User-scoped …). Related: [ADR 0008](../../docs/adr/0008-distribute-ap-via-github-release-tarball.md),
`.scratch/spec-schema-contract/spec.md` (the contract test, kept).

## Problem Statement

`packages/cli/src/sync/spec.ts` checks every `spec.*` key by hand:

- Its types in `types.ts` are written separately from the checks.
- Some inputs crash `ap` with a raw `TypeError` (`marketplaces: { acme: null }`, `skills: [null]`).
- Others slip through silently (a map-form marketplace with no `source` or with a string `source`, `autoUpdate: 'yes'`,
  a string `spec`, `presets: [1]`).
- `ap` stops at the first error, so a Config with three typos takes three runs to fix.
- The order of semantic errors depends on timing: `Promise.all` lets a synchronous `parseShorthand` failure beat an
  earlier entry's pending `stat`.

## Solution

### Two phases inside `readDeclarations`

`readDeclarations(doc, at, mcpCatalog)` and `presetRefs(doc, kind, label)` keep their signatures.

1. **Shape.** One synchronous `Spec.safeParse(doc.spec)` against a `zod/mini` schema. It covers:
   - types and unknown fields;
   - same-entry cross-field rules (`scope: user` needs `enabled: true`; `skills`/`exclude` together; a directory source
     with `scope: user`);
   - `itemsPath`;
   - the whole Hook group check (a `strictObject` plus a `discriminatedUnion` on handler `type`), which replaces
     `checkHook` in `hooks.ts`.
2. **Semantics.** Plain code, run only when the shape is valid: `parseShorthand`, the MCP catalog lookup, `checkMcp`,
   `projectRelativePath`, `normalizeMcp`.

Async steps stay out of the schema. Zod orders async issues by when they finish, and `checkMcp` has to see catalog
configs, which only exist after the lookup.

### Messages

- Each schema node carries its message, with a `{}` placeholder for the subject (and `{n}` for a handler number).
- A small formatter fills the placeholder from the issue path (a map key, a list index, or an item entry's `source`) and
  prefixes `<origin>: `.
- It opens `invalid_union`/`invalid_key` issues and uses the branch matching the input's type.
- Every existing message text is kept word for word. The 7 new ones cover the inputs listed in ADR 0015.
- `zod/mini` loads no locale, so a node without a message shows `Invalid input`. A test must fail if any spec fixture
  produces `Invalid input`.

### Error order and reporting every error

- **Shape phase:** every issue in the file. Unknown-key issues come first (stable sort), then the rest in Zod's order.
  This keeps `enable: true` reported as `has unknown field "enable"` rather than `must set enabled`.
- **Semantic phase:** every error, through `Promise.allSettled`, in entry order within the file.
- **Across Presets:** unchanged. A Preset's errors still stop resolution before the next Preset is loaded.
- `ConfigError` carries `messages: string[]`. Its `message` is the lines joined with `\n`, so existing `toThrow(...)`
  tests and callers that print `error.message` keep working.
- The commands print one line per error, each `<file>: <message>` (check how oclif's `this.error` renders a multi-line
  message and keep every line self-contained).

### Types

- `Selection`, `HookGroup`/`HookHandler` and `PluginDeclaration` are derived from the schema (`z.output`).
  `PluginDeclaration` needs an annotation so that `scope?: 'user'` survives the boolean branch.
- Everything else in `types.ts` stays hand-written: MCP config types, sources (produced by `parseShorthand`), and the
  fields added after reading (`origin`, `presets`, `shadows`).

### Spec keys

`PRESET_SPEC_KEYS`/`CONFIG_SPEC_KEYS` come from the schema's keys (`Object.keys(… .shape)`), so the list has one source.
The JSON schemas stay hand-written and `spec-schema.test.ts` keeps checking them against these keys.

### Dependency

`zod` (4.6.x, imported as `zod/mini`) goes in `devDependencies`, like every bundled dependency (ADR 0008). Expected
growth: `dist/ap.js` +56 KB plain, `ap.tgz` +12 KB. Run `pack:release` and `smoke-release.sh` to confirm.

## Out of scope

- Generating JSON Schema from Zod (`z.toJSONSchema`), and `z.xor`.
- Reporting semantic errors for the valid parts of a file that also has shape errors.
- Reporting errors across several Presets at once.
- Zod types for MCP configs (`McpConfig` stays an opaque `Record` checked by `checkMcp`).
- Hooks in Presets (hooks ticket 03). The Preset schema simply has no `hooks` key.

## Done when

- `spec.ts` checks shape only through the `zod/mini` schema; `itemsPath` and `checkHook` are gone.
- A Config with several shape errors prints every one, one line each, in the order above.
- The inputs listed in ADR 0015 are rejected with their messages, and none of them crash.
- `resolve.test.ts`, `spec-schema.test.ts` and `sync-*.test.ts` pass. Tests change only where a behaviour change is
  intended; each such change is listed in the ticket that makes it.
- `pnpm -C packages/cli test`, `pnpm -C packages/cli typecheck`, `pack:release` and `smoke-release.sh` pass.
