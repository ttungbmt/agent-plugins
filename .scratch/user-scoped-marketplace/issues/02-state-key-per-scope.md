---
title: "Key user-scope State by (Config path, targeted Scope)"
labels: [done]
blocked_by: []
---

# 02: Key user-scope State by (Config path, targeted Scope)

Spec: [../spec.md](../spec.md), decision 5. ADR 0003, ADR 0011.

**What to build:** `store.ts` keys each Config's records in `~/.agent-plugins/state.json` by Config path plus the
Scope the Sync targeted, so a `project` Sync and a `--scope user` Sync of the same Config keep separate claims. No
behaviour change for users yet: today only `--scope user` Syncs write there.

- [x] A record for targeted Scope `user` keeps the Config path as its key, so existing State needs no migration; a
      record for targeted Scope `project` or `local` is keyed `<Config path>#<scope>`. The suffix is stripped wherever
      the key is used as a path (existence check, conflict messages).
- [x] Two records of the same Config under different targeted Scopes both count as claims for the shared-claim rules;
      a record for a Config no longer on disk is still ignored.
- [x] Writing one record never drops the other record of the same Config.
- [x] Tests in `store.test.ts` through `createStore().load/save`, with an optional `target` (the Scope the Sync
      targets, default: the stored Scope).
