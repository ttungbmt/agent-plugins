---
title: "Sync User-scoped MCP servers to `user` from any Scope"
labels: [ready-for-agent]
blocked_by: [01, user-scoped-plugin/02]
---

# 02: Sync User-scoped MCP servers to `user` from any Scope

Spec: [../spec.md](../spec.md), decisions 3, 4, 7, 8, 9, 11. ADR 0014, ADR 0006, ADR 0003.

**What to build:** the tracer bullet. A `project` or `local` Sync plans User-scoped MCP servers with `planMcp` against
the `user` Scope (`mcpServers` of `.claude.json`, State and `shared` claims) and the rest against the targeted Scope.
Blocked by `.scratch/user-scoped-plugin/issues/02` for the shared per-Scope planning path.

- [ ] `project` Sync → `claude mcp add-json <name> <json> --scope user` with `scope` stripped; absent from `.mcp.json`
      and `agent-plugins.lock`; the claim is in user State under (Config path, `project`).
- [ ] Removal at `user` only when no other Config claims it; a different config claimed elsewhere → `shared-clash`,
      `--force` overwrites; a matching Manual entry is adopted.
- [ ] Opt-out: `name: false` drops this Config's claim; another Config still claims → notice suggesting `/mcp`.
- [ ] User-scoped servers are not in the `.mcp.json` approval notice; the plugin-MCP name-clash notice checks `user`.
- [ ] `--scope user` Sync: `scope` has no effect.
- [ ] `--dry-run` labels actions `(user)`; `--check` reports drift at `user`.
- [ ] `fakeClaude` updated first if real `claude` differs.
- [ ] Tests in `sync-mcp.test.ts` (or `sync-user-scoped.test.ts`) covering `project`, `local` and `user` targeted
      Scopes.
