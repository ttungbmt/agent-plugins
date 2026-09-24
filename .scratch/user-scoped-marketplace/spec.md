---
title: User-scoped marketplace
labels: [ready-for-agent]
---

Glossary: [CONTEXT.md](../../CONTEXT.md), sections Marketplace and Ownership. Decision:
[ADR 0011](../../docs/adr/0011-user-scoped-marketplace.md), building on
[ADR 0001](../../docs/adr/0001-delegate-settings-writes-to-claude-cli.md) and
[ADR 0003](../../docs/adr/0003-managed-entries-per-scope-state.md). Current behaviour:
[docs/design/ap-sync.md](../../docs/design/ap-sync.md).

## Problem Statement

`claude-plugins-official` is used by nearly every repo, so it belongs in `~/.claude`, not repeated in every project's
settings. Today a Sync writes every declaration to the one Scope it targets. The only way to get a marketplace into
the `user` Scope is `ap sync --scope user`, which moves the whole Config there (plugins, skills, MCP servers…).

The map form also passes every extra field through to settings unchecked. A user who wrote `scope: global` got no
error; the field was silently written into `extraKnownMarketplaces`.

## Solution

A Marketplace declaration in map form accepts `scope: user`:

```yaml
spec:
  marketplaces:
    claude-plugins-official:
      source: { source: github, repo: anthropics/claude-plugins-official }
      autoUpdate: true
      scope: user
```

Whatever Scope the Sync targets, `ap` adds, patches and removes that entry at the `user` Scope, under the claim rules
of ADR 0003. Plugin declarations that use it stay at the targeted Scope.

## Decisions

1. **Declaration.** Only the map form takes `scope`; its only value is `user` (omitted = the targeted Scope). Configs
   and Presets both accept it. The map form accepts only `source`, `autoUpdate` and `scope`; anything else is a
   `ConfigError`. `config.schema.json` and `preset.schema.json` gain `scope: { enum: [user] }` on `marketplaceEntry`.
2. **Duplicate declarations.** `scope` is part of the declaration like `source`: identical declarations merge, two
   peer Presets that disagree on `scope` are a preset clash, and a Config overrides a Preset (with a notice). A repo
   keeps the marketplace at `project` by redeclaring it in its Config without `scope`.
3. **Target.** A User-scoped marketplace always syncs to `user`. When the Sync already targets `user`, the flag has no
   effect.
4. **Ownership.** ADR 0003 unchanged: Managed entry counted by claim in `~/.agent-plugins/state.json`; removed only
   when no Config claims it. Manual entry matching the declaration is adopted; a different Manual entry is a conflict
   `--force` overrides; a different claim by another Config is `shared-clash`, which `--force` does not override.
5. **State key.** User-scope State is keyed by (Config path, targeted Scope), so a `project` Sync and a `--scope user`
   Sync of the same Config keep separate claims. A `user`-targeted record keeps the Config path as its key, so existing
   State needs no migration; other targets use `<Config path>#<scope>`.
6. **Lock.** `agent-plugins.lock` does not record User-scoped marketplaces.
7. **Plugins.** `checkMarketplaces` treats a User-scoped marketplace as declared for plugins at the targeted Scope.
   `claude` 2.1.281 installs a project-scope plugin whose marketplace is only in user settings, and writes only
   `enabledPlugins` to project settings.
8. **Order.** User-scope marketplace actions run before any plugin action. If one fails, dependent plugins fail with
   `marketplace "…" is not ready`, through the existing `failedMarketplaces` path.
9. **Moving between Scopes.** Adding or dropping `scope: user` on an entry that is Managed at the other Scope adds it
   at the new Scope first, then removes it from the old one. The `cross-scope` check does not fire between the two
   copies of that one declaration.
10. **Reporting.** `--dry-run` labels every action outside the targeted Scope with its Scope, e.g.
    `planned add claude-plugins-official (user)`. `--check` counts drift at `user` for User-scoped marketplaces.
11. **Rollout.** The `base` Bundled preset marks `claude-plugins-official` with `scope: user`; the repo's own `.claude/`
    and Lock are regenerated with `pnpm ap sync`.

## User Stories

1. As a Preset author, I want to mark a marketplace `scope: user`, so every repo using my Preset shares one entry in
   `~/.claude` instead of repeating it in project settings.
2. As an `ap` user, I want plugins from that marketplace to stay enabled per repo, so one repo's choice does not turn a
   plugin on everywhere.
3. As an `ap` user, I want dropping the declaration in one repo to leave the entry alone while another repo still
   claims it, so repos do not break each other.
4. As an `ap` user, I want `--dry-run` to show changes to `~/.claude` separately, so a project sync never edits my user
   settings by surprise.
5. As an `ap` user, I want a typo in a map-form entry (`scope: global`, `autoupdate`) to be an error, so it does not
   silently land in settings.
6. As an `ap` user, I want a repo to opt out by redeclaring the marketplace in its Config, so I can keep it project-local.

## Out of scope

- `scope` on Shorthand declarations, plugins, Skills, Agents, Rules, Workflows, MCP servers or hooks.
- Any value of `scope` other than `user`.
- Cleaning up claims of Configs that no longer exist on disk (already ignored by ADR 0003).
