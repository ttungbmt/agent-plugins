---
title: "Mark `claude-plugins-official` user-scoped in `base`; update design docs"
labels: [ready-for-agent]
blocked_by: [03, 04]
---

# 05: Mark `claude-plugins-official` user-scoped in `base`; update design docs

Spec: [../spec.md](../spec.md), decision 11. ADR 0011.

**What to build:** ship the feature to its first user and document it.

- [ ] `packages/cli/presets/base.yaml`: `claude-plugins-official` gets `scope: user`.
- [ ] `docs/design/ap-sync.md` describes the User-scoped marketplace (declaration, ownership, order, moving between
      Scopes, reporting), in Vietnamese per the language rule.
- [ ] The repo's `.claude/` and `agent-plugins.lock` regenerated with `pnpm ap sync`, run with `CLAUDE_CONFIG_DIR`
      pointed at a scratch directory or in the Docker sandbox; the example lock files regenerated likewise.
- [ ] `pnpm -C packages/cli test` and `typecheck` pass.
