---
title: "Sync User-scoped skills from a `project` or `local` Sync"
labels: [ready-for-agent]
blocked_by: [02]
---

# 03: Sync User-scoped skills from a `project` or `local` Sync

Spec: [../spec.md](../spec.md), decisions 5, 7 (pin location), 8, 10, 11. ADR 0013.

**What to build:** the tracer bullet. A Config with a Skill entry `scope: user` synced at `project` or `local`
installs its Skills into the `user` Scope's skills directory, pins the source in the `user` Scope's State, and reports
the actions with `(user)`. Single Config only; sharing across Configs is 04.

**Blocked by:** 02.

- [ ] `project` Sync: selected Skills land in `~/.claude/skills/<name>`, not in `.claude/skills/`.
- [ ] `local` Sync: same, although `local` has no skills directory of its own.
- [ ] `user` Sync: `scope: user` has no effect; result identical to the same entry without `scope`.
- [ ] Source catalog (commit, names) and the Managed items are recorded in `~/.agent-plugins/state.json` under this
      Config's claim; `agent-plugins.lock` records neither.
- [ ] A second Sync with no changes is a no-op (pin reused, no refetch of a new commit).
- [ ] Dropping the entry (only this Config claims it) removes the Skills from `~/.claude/skills`.
- [ ] `--dry-run` labels the actions `(user)`; `--check` reports drift of a User-scoped skill at `user`.
- [ ] A failed fetch of the User-scoped source fails only its Skills; the rest of the Sync applies.
- [ ] A symlink or unrecorded directory at `~/.claude/skills/<name>` is a Manual entry exactly as today (adopted only
      when it matches).
- [ ] Tests at the `sync()` seam in a new `sync-user-scoped-items.test.ts`.
