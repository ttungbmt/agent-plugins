---
title: Report every shape error of a file, then every semantic error in entry order
labels: [ready-for-agent]
blocked_by: [01]
---

Spec: [../spec.md](../spec.md) (section Error order and reporting every error). ADR 0015.

## Work

- `ConfigError` gets `messages: string[]`; `message` is the lines joined with `\n`.
- Shape phase: throw one `ConfigError` holding every issue, sorted unknown keys first.
- Semantic phase: gather every error with `Promise.allSettled` in entry order, and throw them together.
- `commands/sync.ts` and `commands/init.ts` print one line per message, each keeping its `<file>: ` prefix. Check how
  oclif's `this.error` renders multi-line text; exit code stays 2.
- Across Presets nothing changes: resolution still stops at the first Preset with errors.

## Acceptance

- `spec.test.ts`: a Config with several shape errors yields all of them, in order; a Config with a shape error and a
  semantic error yields only the shape error; several semantic errors come out in entry order however long each
  `stat` takes (use a fake `parseShorthand` delay or a slow directory to prove it).
- A command-level test (or a manual check noted in the commit message) shows the multi-line output.
- Existing tests pass. `toThrow(string)` still matches by substring.
- Test and typecheck pass.
