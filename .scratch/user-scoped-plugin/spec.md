---
title: User-scoped plugin
labels: [ready-for-agent]
---

Glossary: [CONTEXT.md](../../CONTEXT.md), sections Plugin, Marketplace and Ownership. Decision:
[ADR 0012](../../docs/adr/0012-user-scoped-plugin.md), building on
[ADR 0011](../../docs/adr/0011-user-scoped-marketplace.md) and
[ADR 0003](../../docs/adr/0003-managed-entries-per-scope-state.md). Current behaviour:
[docs/design/ap-sync.md](../../docs/design/ap-sync.md). Blocked by the User-scoped marketplace feature
(`.scratch/user-scoped-marketplace/`), whose State key and move-between-Scopes machinery this reuses.

## Problem Statement

Some plugins (`claude-code-setup`, `commit-commands`…) are personal tools a user wants in every repo, including repos
that do not use `ap`. Today a Plugin declaration is always written to the Scope the Sync targets. The only way to get
one into `~/.claude` is `ap sync --scope user` with a separate Config, which means two Configs and dropping the plugin
from the shared Preset.

## Solution

A Plugin declaration accepts a map form with `scope: user`:

```yaml
spec:
  plugins:
    claude-code-setup@claude-plugins-official: { enabled: true, scope: user }
```

Whatever Scope the Sync targets, `ap` installs, enables and removes that plugin at the `user` Scope, under the claim
rules of ADR 0003.

## Decisions

1. **Declaration.** The boolean form is unchanged. The map form accepts only `enabled` (boolean, required) and `scope`
   (only `user`, optional); anything else is a `ConfigError`. Configs and Presets both accept it.
   `config.schema.json` and `preset.schema.json` gain the map form on plugin values.
2. **Enabled only.** `enabled: false` with `scope: user` is a `ConfigError`.
3. **Marketplace.** The plugin's `@marketplace` must be a User-scoped marketplace; otherwise a `ConfigError` (a
   Shorthand declaration can never be one).
4. **Target.** A User-scoped plugin always syncs to `user`. When the Sync already targets `user`, `scope` has no effect.
5. **Ownership.** ADR 0003 unchanged: claims in `~/.agent-plugins/state.json`, keyed by (Config path, targeted Scope)
   as in the User-scoped marketplace spec; uninstalled only when no Config claims it. Reuse `planPlugins` with the
   `user` Scope's actual entries, managed records and `shared` claims.
6. **Duplicate declarations.** `scope` is part of the declaration: identical declarations merge, two peer Presets that
   disagree on `scope` are a preset clash, and a Config overrides a Preset (with a notice).
7. **Opt-out.** A Config that redeclares `name@mp: false` (no `scope`) drops its `user` claim and writes `false` to
   the targeted Scope; Claude Code's precedence (project over user) turns the plugin off in that repo.
8. **Lock.** `agent-plugins.lock` does not record User-scoped plugins.
9. **Order.** User-scope plugin actions run after User-scope marketplace actions. If the marketplace failed, the plugin
   fails with `marketplace "…" is not ready`, through the existing `failedMarketplaces` path.
10. **Moving between Scopes.** Adding or dropping `scope: user` on a plugin that is Managed at the other Scope installs
    or enables it at the new Scope first, then uninstalls or unsets it at the old one. When the old Scope is `user` and
    another Config still claims it, only this Config's claim is dropped.
11. **Reporting.** `--dry-run` labels User-scope plugin actions with `(user)`; `--check` counts drift at `user`.
12. **Rollout.** The `base` Bundled preset marks `claude-code-setup`, `claude-md-management`, `commit-commands` and
    `skill-creator` with `scope: user`; `typescript-lsp`, `security-guidance`, `hookify` and `code-simplifier` stay at
    the targeted Scope. The repo's own `.claude/` and Lock are regenerated with `pnpm ap sync`.

## User Stories

1. As a Preset author, I want to mark a plugin `scope: user`, so every repo using my Preset shares one enabled plugin
   in `~/.claude`, and repos without `ap` get it too.
2. As an `ap` user, I want dropping the declaration in one repo to leave the plugin alone while another repo still
   claims it, so repos do not break each other.
3. As an `ap` user, I want a repo to turn the plugin off by redeclaring it `false` in its Config.
4. As an `ap` user, I want `--dry-run` to show changes to `~/.claude` separately.
5. As an `ap` user, I want a typo (`scope: global`, `enable: true`) or a user-scoped plugin on a project-only
   marketplace to be an error, so broken user settings never get written.

## Out of scope

- `enabled: false` at `user`.
- Any `scope` value other than `user`; `scope` on Skills, Agents, Rules, Workflows, MCP servers or hooks.
- Cleaning up claims of Configs that no longer exist on disk.
