---
title: "`ap init` strips diacritics and re-validates a derived name"
labels: [done]
blocked_by: [02, 03]
---

Spec: [../spec.md](../spec.md) (section Behaviour fixes). ADR 0016. Design: `docs/design/ap-init.md`.

## Work (`/tdd`, commit as `fix(cli)`)

- Derive the name as `kebabCase(deburr(basename(cwd)))`: `deburr` from es-toolkit, `kebabCase` the local one.
- Check the derived name against `NAME_PATTERN`. On failure, throw the existing "cannot derive a Config name …;
  pass --name" `ConfigError`.
- Update `docs/design/ap-init.md` (Vietnamese) to say that the name is stripped of diacritics and re-validated.

## Acceptance

- `Dự Án` → `du-an`, `Đường Đi` → `duong-di`, `x😀y` → `x-y`, `日本語` → error.
- The ASCII cases from ticket 03 are unchanged.
- Test and typecheck pass.
