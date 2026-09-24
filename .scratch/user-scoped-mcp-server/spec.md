---
title: User-scoped MCP server
labels: [ready-for-agent]
---

Glossary: [CONTEXT.md](../../CONTEXT.md), sections MCP server and Ownership. Decision:
[ADR 0014](../../docs/adr/0014-user-scoped-mcp-server.md), building on
[ADR 0006](../../docs/adr/0006-mcp-servers-inline-plus-bundled-catalog.md),
[ADR 0011](../../docs/adr/0011-user-scoped-marketplace.md),
[ADR 0012](../../docs/adr/0012-user-scoped-plugin.md) and
[ADR 0003](../../docs/adr/0003-managed-entries-per-scope-state.md). Intended behaviour:
[docs/design/ap-sync.md](../../docs/design/ap-sync.md), "User-scoped MCP server". Blocked by the User-scoped plugin
feature (`.scratch/user-scoped-plugin/`), whose move-between-Scopes machinery this reuses, and by the remote-hook
confirmation ticket (`.scratch/hooks/issues/05-confirm-remote-hooks.md`), whose prompt this reuses.

## Problem Statement

Some MCP servers (`context7`…) are personal tools a user wants in every repo. Today an MCP server declaration is
always written to the Scope the Sync targets. The only way to get one into `~/.claude.json` is `ap sync --scope user`
with a separate Config.

## Solution

An MCP server declaration accepts `scope: user`, beside inline fields or alone (catalog lookup):

```yaml
spec:
  mcpServers:
    context7: { scope: user }                 # from the MCP catalog
    my-tool: { command: npx, args: [-y, my-tool], scope: user }
```

Whatever Scope the Sync targets, `ap` adds, updates and removes that server at the `user` Scope through
`claude mcp add-json/remove --scope user`, under the claim rules of ADR 0003.

## Decisions

1. **Declaration.** `true`, `false` and inline maps are unchanged. A map may carry `scope` (only `user`); `ap` strips
   it before normalising, comparing and writing. A map holding only `scope: user` takes the config from the MCP
   catalog, exactly like `true` (unknown name → `ConfigError`). Configs and Presets both accept it;
   `config.schema.json` and `preset.schema.json` describe it.
2. **Relative paths.** A User-scoped MCP server whose `command` or any `args` element starts with `./` or `../` is a
   `ConfigError`.
3. **Target.** A User-scoped MCP server always syncs to `user`. When the Sync already targets `user`, `scope` has no
   effect.
4. **Ownership.** ADR 0003 unchanged: claims in `~/.agent-plugins/state.json` keyed by (Config path, targeted Scope);
   removed only when no Config claims it. Reuse `planMcp` with the `user` Scope's actual servers, managed records and
   `shared` claims. A different config claimed by another Config is `shared-clash`; `--force` overwrites.
5. **Duplicate declarations.** `scope` is part of the declaration: identical declarations merge, two peer Presets that
   disagree are a `preset-clash`, and a Config overrides a Preset (with a notice).
6. **Remote presets.** A User-scoped MCP server whose origin is a Remote preset and whose content is not yet in State
   needs confirmation, with the same prompt and `--yes` rule as hooks (ADR 0007): no TTY and no `--yes` → skipped,
   warned, non-zero exit; the rest still syncs.
7. **Opt-out.** `name: false` drops only this Config's claim. If another Config still claims the server at `user`,
   `ap` prints a notice suggesting `/mcp` to turn it off for this repo. `ap` never writes `disabledMcpServers`.
8. **Lock.** `agent-plugins.lock` does not record User-scoped MCP servers.
9. **Order.** No ordering constraint against other actions; no `not ready` state.
10. **Moving between Scopes.** Adding or dropping `scope: user` on a server Managed at the other Scope adds it at the
    new Scope first, then removes it at the old one. When the old Scope is `user` and another Config still claims it,
    only this Config's claim is dropped. `cross-scope` does not count two copies of one declaration as a conflict.
11. **Reporting.** `--dry-run` labels User-scope MCP actions with `(user)`; `--check` counts drift at `user`.
    User-scoped servers are left out of the `.mcp.json` approval notice; the plugin-MCP name-clash notice still
    applies.
12. **Rollout.** No Bundled preset changes. `docs/design/ap-sync.md` (already updated) and a sample under `examples/`.

## User Stories

1. As a Preset author, I want to mark an MCP server `scope: user`, so every repo using my Preset shares one server in
   `~/.claude.json`.
2. As an `ap` user, I want dropping the declaration in one repo to leave the server alone while another repo still
   claims it.
3. As an `ap` user, I want a Remote preset not to install a command that runs in every repo without my confirmation.
4. As an `ap` user, I want `--dry-run` to show changes to `~/.claude.json` separately.
5. As an `ap` user, I want a typo (`scope: global`) or a repo-relative path on a user-scoped server to be an error.

## Out of scope

- Any `scope` value other than `user`; `scope` on Skills, Agents, Rules, Workflows or hooks.
- Writing `disabledMcpServers` or any other direct edit of `~/.claude.json`.
- Moving catalog servers to `user` in `base`.
- Cleaning up claims of Configs that no longer exist on disk.
