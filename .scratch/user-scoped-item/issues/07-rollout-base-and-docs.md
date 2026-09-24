---
title: "Rollout in `base` and docs"
labels: [ready-for-agent]
blocked_by: [04, 05, 06, user-scoped-marketplace/05, user-scoped-plugin/04]
---

# 07: Rollout in `base` and docs

Spec: [../spec.md](../spec.md), decision 13. ADR 0013.

**What to build:** the `base` Bundled preset installs `vercel-labs/skills` at `user`, and the docs describe `scope` on
item entries.

**Blocked by:** 04, 05, 06; also the rollout tickets `user-scoped-marketplace/05` and `user-scoped-plugin/04`, which edit
the same preset, docs and generated files.

- [ ] `base` declares `{ source: vercel-labs/skills, scope: user }`; the `agent-plugins` preset's project-specific
      Skills stay at the targeted Scope.
- [ ] `docs/design/ap-sync.md` (Vietnamese) documents `scope: user` on item entries, the `directory` restriction, pins
      in the `user` State, and the stricter key check.
- [ ] `pnpm ap sync` regenerates the repo's `.claude/` and `agent-plugins.lock`; `.claude/skills/find-skills` is gone
      from the project and the Lock no longer pins `vercel-labs/skills`.
- [ ] `examples/` Configs still sync (`--dry-run`) without errors.
- [ ] `pnpm -C packages/cli test` and `typecheck` pass.
