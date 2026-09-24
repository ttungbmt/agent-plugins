---
title: "Mark personal plugins user-scoped in `base`; update design docs"
labels: [ready-for-agent]
blocked_by: [02, 03]
---

# 04: Mark personal plugins user-scoped in `base`; update design docs

Spec: [../spec.md](../spec.md), decision 12. ADR 0012.

- [ ] `packages/cli/presets/base.yaml`: `claude-code-setup`, `claude-md-management`, `commit-commands`,
      `skill-creator` → `{ enabled: true, scope: user }`; the other four stay boolean.
- [ ] `docs/design/ap-sync.md` gains a "User-scoped plugin" section (Vietnamese) mirroring "User-scoped marketplace".
- [ ] `pnpm ap sync` regenerates the repo's `.claude/` and `agent-plugins.lock` (run with `CLAUDE_CONFIG_DIR` pointed
      at a scratch directory or in the Docker sandbox, since it writes to `user`).
- [ ] `pnpm -C packages/cli test` and `pnpm -C packages/cli typecheck` pass.
