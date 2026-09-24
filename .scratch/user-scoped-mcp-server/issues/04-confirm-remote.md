---
title: "Confirm User-scoped MCP servers from Remote presets"
labels: [ready-for-agent]
blocked_by: [02, hooks/05]
---

# 04: Confirm User-scoped MCP servers from Remote presets

Spec: [../spec.md](../spec.md), decision 6. ADR 0014, ADR 0007. Blocked by
`.scratch/hooks/issues/05-confirm-remote-hooks.md`, whose prompt and `--yes` flag this reuses.

- [ ] A User-scoped MCP server whose origin is a Remote preset and whose normalised config is not in State prompts
      before `add-json`; unchanged content does not prompt again.
- [ ] No TTY and no `--yes` → that server is skipped with a warning and a non-zero exit; the rest still syncs.
- [ ] Servers from the Config or local Presets never prompt; servers at the targeted Scope follow ADR 0006 as today.
- [ ] `--dry-run` and `--check` never prompt.
- [ ] Tests covering TTY, `--yes` and non-TTY paths.
