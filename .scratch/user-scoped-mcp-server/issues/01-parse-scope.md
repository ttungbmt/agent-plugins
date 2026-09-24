---
title: "Parse `scope: user` on MCP server declarations"
labels: [done]
blocked_by: []
---

# 01: Parse `scope: user` on MCP server declarations

Spec: [../spec.md](../spec.md), decisions 1, 2, 5. ADR 0014.

**What to build:** `readMcpServers` in `resolve.ts` accepts `scope` on map values and carries it on `McpDeclaration`;
both schemas describe it. No sync behaviour changes yet.

- [x] `true`, `false` and inline maps without `scope` parse as before.
- [x] `{ scope: user }` alone resolves to the MCP catalog config; unknown name → `ConfigError`.
- [x] Inline map with `scope: user` → the config without `scope`, validated by `checkMcp` as today.
- [x] `scope` other than `user` → `ConfigError` naming the server.
- [x] `scope: user` with `command` or an `args` element starting with `./` or `../` → `ConfigError`.
- [x] Merge: identical declarations merge; peer Presets disagreeing on `scope` → `preset-clash`; Config overrides a
      Preset with a notice.
- [x] `config.schema.json` and `preset.schema.json` accept `scope`; tests in `resolve.test.ts`.
