---
title: "Share User-scoped items across Configs"
labels: [ready-for-agent]
blocked_by: [03]
---

# 04: Share User-scoped items across Configs

Spec: [../spec.md](../spec.md), decisions 6, 7. ADR 0013, ADR 0003.

**What to build:** two repos declaring the same User-scoped source share one install and one pin in the `user` Scope,
under the claim rules of ADR 0003.

**Blocked by:** 03.

- [ ] Config B syncing a source Config A already pinned reuses A's commit; `~/.claude/skills/<name>` is not rewritten.
- [ ] Config A dropping the entry while B still claims it keeps the Skills and hands ownership to B.
- [ ] Once no Config claims a Skill, the next Sync that releases it removes it.
- [ ] Syncs of the same Config at `project` and at `user` keep separate claims (State key per Config path and targeted
      Scope).
- [ ] `ap sync --update` in a `project` or `local` Sync fetches the latest commit of User-scoped sources and updates
      the shared pin; actions are labelled `(user)`.
- [ ] The same source at the project Scope keeps its own pin in the Lock, independent of the `user` pin.
- [ ] Two Configs declaring the same Skill name from different sources at `user` → conflict that `--force` does not
      override.
- [ ] Tests at the `sync()` seam.
