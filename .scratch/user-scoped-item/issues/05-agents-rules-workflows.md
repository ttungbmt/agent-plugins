---
title: "User-scoped agents, rules and workflows"
labels: [ready-for-agent]
blocked_by: [03]
---

# 05: User-scoped agents, rules and workflows

Spec: [../spec.md](../spec.md), decisions 5, 8. ADR 0013, ADR 0009, ADR 0010.

**What to build:** the behaviour of 03 for the other three item kinds.

**Blocked by:** 03.

- [ ] A parametrised case runs the core `project`-Sync scenario of 03 (install at `user`, State pin, no Lock entry,
      `(user)` label) for Agents, Rules and Workflows.
- [ ] A User-scoped Rule source installs into its Namespace under `~/.claude/rules/`.
- [ ] A plugin-bound Workflow under a User-scoped entry is skipped with a notice under "all", and is a conflict when
      selected by name, as at the project Scope.
- [ ] Tests at the `sync()` seam.
