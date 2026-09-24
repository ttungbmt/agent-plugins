---
title: Order workflows independently of the machine's locale
labels: []
blocked_by: [03]
---

Spec: [../spec.md](../spec.md) (section Behaviour fixes). ADR 0016 (section Hai thay đổi hành vi đi kèm, Migration).

## Work (`/tdd`, commit as `fix(sync)`)

- In `workflows.ts`, `findWorkflows` and `listInstalledWorkflows` compare with `localeCompare(b.name, 'en')`.
- Make the ticket 03 workflow test locale-proof. If `Intl` in the test runner allows it, run the comparison under a
  second locale (for example `sv`) and assert the same result.
- The commit message carries the migration note from ADR 0016.

## Acceptance

- The workflow order and the Installed workflow are the same whatever `LC_ALL` is.
- `pnpm ap sync --dry-run` at the repo root leaves `agent-plugins.lock` unchanged.
- Test and typecheck pass.
