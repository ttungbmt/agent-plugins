---
title: "Reject unknown keys in item entries"
labels: [done]
blocked_by: []
---

# 01: Reject unknown keys in item entries

Spec: [../spec.md](../spec.md), decision 1 (unknown keys only). ADR 0013.

**What to build:** a Skill, Agent, Rule or Workflow declaration entry in map form that carries a key `ap` does not know
(e.g. `skill`, `scopes`) fails with a `ConfigError` naming the source and the key, instead of being silently ignored.
This is a prefactor: `scope` is not accepted yet. Behaviour for valid entries is unchanged.

**Blocked by:** None (can start immediately).

- [ ] Allowed keys per kind: `source`, the kind's selection key or `exclude`, and `path`. `as` (described
      in ADR 0009 but never implemented) is an unknown key too.
- [ ] Any other key → `ConfigError` naming the origin, the source and the unknown key, for all four kinds.
- [ ] String shorthand and every existing valid map form parse as before.
- [ ] Bundled presets and `examples/` Configs still resolve.
- [ ] Tests in `resolve.test.ts`.
