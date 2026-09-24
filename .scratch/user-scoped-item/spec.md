---
title: User-scoped item
labels: [ready-for-agent]
---

Glossary: [CONTEXT.md](../../CONTEXT.md), sections Skill (User-scoped item), Agent, Rule, Workflow, Ownership and
Syncing. Decision: [ADR 0013](../../docs/adr/0013-user-scoped-item.md), building on
[ADR 0003](../../docs/adr/0003-managed-entries-per-scope-state.md),
[ADR 0005](../../docs/adr/0005-ap-installs-skills-itself.md),
[ADR 0011](../../docs/adr/0011-user-scoped-marketplace.md) and
[ADR 0012](../../docs/adr/0012-user-scoped-plugin.md). Current behaviour:
[docs/design/ap-sync.md](../../docs/design/ap-sync.md). Blocked by the User-scoped marketplace
(`.scratch/user-scoped-marketplace/`) and User-scoped plugin (`.scratch/user-scoped-plugin/`) features, whose State
key per (Config path, targeted Scope), `(user)` reporting and Scope move machinery this reuses.

## Problem Statement

Some Skills (e.g. `find-skills` from `vercel-labs/skills`, declared in the `base` Bundled preset) are personal tools a
user wants in every repo. Today every Skill, Agent, Rule and Workflow declaration is installed into the Scope the Sync
targets, so each repo that uses `base` carries its own copy in `.claude/skills/` and its own pin in the Lock. The only
way to get one into `~/.claude` is `ap sync --scope user`, which moves the whole Config there (plugins, MCP servers,
hooks…). A Sync targeting `local` cannot install items at all, because the `local` Scope has no item directories.

Separately, an item entry in map form silently ignores keys it does not know. A user who writes `scope: global` or
`scopes: user` gets no error, and the items quietly land in the targeted Scope.

## Solution

A Skill, Agent, Rule or Workflow declaration entry in map form accepts `scope: user`:

```yaml
spec:
  skills:
    - source: vercel-labs/skills
      scope: user
```

Whatever Scope the Sync targets, `ap` installs, updates and removes everything that entry selects at the `user` Scope
(`~/.claude/skills`, `agents`, `rules`, `workflows`). The pin and Source catalog live in the `user` Scope's State,
shared by every Config on the machine; the Lock does not record them. Ownership follows the claim rules of ADR 0003.
Item entries in map form reject unknown keys.

## User Stories

1. As a Preset author, I want to mark a Skill declaration entry `scope: user`, so every repo using my Preset shares one
   Installed skill in `~/.claude/skills` instead of a copy per repo.
2. As a Preset author, I want the same `scope: user` on Agent, Rule and Workflow declaration entries, so all four item
   kinds follow one rule.
3. As a Preset author, I want to split one source across two entries (one `scope: user`, one without), so I can send
   some Skills to `user` and keep others in the project.
4. As an `ap` user, I want `scope: user` to work with every selection form (a bare source meaning "all", `skills: […]`,
   `exclude: […]`), so I don't have to rewrite existing entries.
5. As an `ap` user syncing the `project` Scope, I want User-scoped items installed into `~/.claude/…`, not into
   `.claude/…`.
6. As an `ap` user syncing the `local` Scope, I want User-scoped items installed into `~/.claude/…`, so I get personal
   items without committing anything, even though `local` has no item directories.
7. As an `ap` user syncing the `user` Scope, I want `scope: user` to have no effect, so the same Config works at every
   Scope.
8. As an `ap` user, I want the pin of a User-scoped item's source recorded in `~/.agent-plugins/state.json`, not in
   `agent-plugins.lock`, so the committed Lock never carries state of my home directory.
9. As an `ap` user with two repos declaring the same User-scoped source, I want the second repo's Sync to reuse the
   commit the first one pinned, so the two repos don't flip `~/.claude/skills/<name>` back and forth.
10. As an `ap` user, I want `ap sync --update` in a `project` or `local` Sync to fetch the latest commit of User-scoped
    sources too, and to label those actions `(user)`, so I can refresh them without `--scope user`.
11. As an `ap` user, I want dropping a User-scoped entry in one repo to leave the items alone while another repo still
    claims them, so repos do not break each other.
12. As an `ap` user, I want an item removed from `~/.claude` once no Config claims it any more, so stale items do not pile
    up.
13. As an `ap` user, I want adding `scope: user` to an entry whose items are Managed at the project Scope to install
    them at `user` first and then remove them from the project, reported as one Scope move.
14. As an `ap` user, I want dropping `scope: user` from an entry to install the items at the targeted Scope first and
    then remove them from `user` (or only drop my claim when another Config still claims them).
15. As an `ap` user, I want my Config to override a Preset's User-scoped entry by redeclaring the same source without
    `scope`, with a notice, so a repo can opt out and keep the item in the project.
16. As a Preset author, I want two peer Presets that disagree on `scope` for the same item to be a preset clash, so the
    outcome never depends on Preset order.
17. As an `ap` user, I want a User-scoped entry with a local `directory` source to be a `ConfigError`, so the content
    of `~/.claude` never depends on which repo synced last.
18. As an `ap` user, I want `scope` values other than `user` to be a `ConfigError`.
19. As an `ap` user, I want any unknown key in an item entry in map form (e.g. `scopes`, `skill`) to be a
    `ConfigError`, so a typo never silently changes where items go.
20. As an `ap` user, I want `--dry-run` to label User-scope item actions `(user)`, so I can see which changes touch
    `~/.claude`.
21. As an `ap` user, I want `ap sync --check` to count drift of User-scoped items at `user`, so CI and scripts catch
    them.
22. As an `ap` user, I want a hand-made directory or a symlink (e.g. from `npx skills`) already in `~/.claude/skills`
    to be treated as a Manual entry exactly as today, so `ap` never overwrites my own Skills.
23. As an `ap` user, I want two Configs declaring the same Skill name from different sources at `user` to be a conflict
    that `--force` cannot override, as ADR 0003 already rules for the `user` Scope.
24. As an `ap` user, I want a failed fetch of a User-scoped source to fail only its own items, so the rest of the
    project Sync still applies.
25. As a Rule author, I want a User-scoped Rule source installed into its Namespace under `~/.claude/rules/`,
    just as at the project Scope.
26. As a Workflow author, I want a plugin-bound Workflow under a User-scoped entry to be skipped or rejected exactly as
    at the project Scope.
27. As an `ap` user of the `base` Bundled preset, I want `vercel-labs/skills` installed at `user`, so `find-skills` is
    available in every repo, including this one.
28. As a Config author, I want `config.schema.json` and `preset.schema.json` to offer `scope` on item entries, so my
    editor completes and validates it.

## Implementation Decisions

1. **Declaration.** Item entries in map form accept only `source`, the kind's selection key (`skills`, `agents`,
   `rules`, `workflows`) or `exclude`, `path` and `scope`. (`as`, which ADR 0009 describes for Rules, is not implemented, so it
   is an unknown key too.) Anything else is a `ConfigError`. `scope`
   accepts only `user`; omitted means the targeted Scope. Configs and Presets both accept it. The string shorthand is
   unchanged and never User-scoped.
2. **Source kind.** `scope: user` with a `directory` source is a `ConfigError`. Only `github` and `git` sources qualify.
3. **Resolved declaration.** The resolved item declaration carries an optional `scope: 'user'`, like
   `MarketplaceDeclaration` and `PluginDeclaration`. Merging by source keeps entries with different `scope` apart, so
   one source can feed both Scopes.
4. **Duplicate declarations.** An item's identity is still its name (for Rules, its Namespace path). When the same item
   is selected at both Scopes, `scope` is part of the declaration: two peer Presets that disagree are a preset clash; a
   Config overrides a Preset, and a child Preset overrides its parent, with a notice. The losing side's item is not
   installed at its Scope.
5. **Target.** User-scoped items are always planned against the `user` Scope's item directories, with the `user`
   Scope's Managed items, Source catalogs and shared claims loaded from `~/.agent-plugins/state.json`. When the Sync
   already targets `user`, they join the normal plan and `scope` has no effect.
6. **Ownership.** ADR 0003 unchanged: item claims are recorded under the (Config path, targeted Scope) State key that
   the User-scoped marketplace feature introduced; an item is removed only when no Config claims it; a Config
   releasing a claim hands ownership to another claiming Config.
7. **Pins.** The Source catalog (commit and names) of a User-scoped source is stored in the `user` Scope's State, shared
   across Configs, and reused by every later Sync. `--update` in any Sync refetches it. The same source used at the
   project Scope keeps its own, separate pin in the Lock. The Lock never records User-scoped items or their catalogs.
8. **Order.** User-scope item actions run in the existing item-kind order, alongside the other User-scope actions. A
   failed fetch fails only the items of that source.
9. **Scope move.** Adding or dropping `scope: user` on an entry whose items are Managed at the other Scope installs at
   the new Scope first, then removes from the old one; when the old Scope is `user` and another Config still claims the
   item, only this Config's claim is dropped. When the entry becomes User-scoped, the Sync report shows the pair as one
   **Scope move**, as it already does for marketplaces and plugins.
10. **Manual entries.** Existing rules unchanged: a symlink or an unrecorded directory in a `user` item directory is a
    Manual entry, adopted only when it matches exactly one declaration.
11. **Reporting.** `--dry-run` labels User-scope item actions `(user)`; `--check` counts their drift.
12. **Schemas.** `config.schema.json` and `preset.schema.json` add `scope` (enum `user`) to each item entry's map
    variants, which already set `additionalProperties: false`. Today every map variant requires `path`, the selection
    key or `exclude`, so `{ source, scope: user }` (all items of the source) needs its own variant.
13. **Rollout.** The `base` Bundled preset's `vercel-labs/skills` entry becomes `{ source: vercel-labs/skills, scope:
    user }`. The `agent-plugins` preset's project-specific Skills stay at the targeted Scope. The repo's own `.claude/`
    and Lock are regenerated with `pnpm ap sync`. `docs/design/ap-sync.md` documents `scope` on item entries.

## Testing Decisions

- Tests exercise external behaviour only: what ends up on disk under the fake home and project, in `state.json` and
  `agent-plugins.lock`, and in the Sync result (actions, `(user)` labels, conflicts, notices, drift). They do not assert
  on planner internals.
- **Primary seam: `sync()`** with its `deps` (fake `fetchSkillSource`, `fakeClaude`, `makeTree`, a temp `homedir`).
  Covers install at `user` from `project` and `local` Syncs, no effect at `user`, pin reuse across two Configs,
  `--update`, claims across Configs, Scope moves in both directions, Manual entries, `--dry-run` and `--check`, fetch
  failure isolation, Rule Namespaces and plugin-bound Workflows. Prior art: `sync-user-scoped.test.ts` for the
  User-scoped marketplace and plugin behaviour, `sync-skills.test.ts` and the other `sync-<kind>.test.ts` files for
  item installs. New cases go in a `sync-user-scoped-items.test.ts` next to them.
- **Secondary seam: `resolve()`**, only for `ConfigError`s and merge outcomes: unknown keys, `scope` other than `user`,
  `directory` source with `scope: user`, peer preset clash, Config/child override notice. Prior art: the map-form
  marketplace and plugin cases in `resolve.test.ts`.
- One parametrised pass runs the core `project`-Sync case over all four item kinds; deeper cases use Skills.
- `pnpm -C packages/cli test` and `typecheck` pass before each commit.

## Out of Scope

- `scope` on MCP servers or hooks.
- Any `scope` value other than `user`.
- `scope` per item inside an entry (`skills: [{ name, scope }]`).
- User-scoped entries with a `directory` source.
- Opting out by shadowing (a project copy hiding the `user` one): it cannot work for Skills, where `user` wins.
- Cleaning up claims of Configs that no longer exist on disk.

## Further Notes

- Same-name precedence differs by kind: a `user` Skill wins over a `project` one
  ([skills docs](https://code.claude.com/docs/en/skills.md)), while a `project` Agent wins over a `user` one
  ([sub-agents docs](https://code.claude.com/docs/en/sub-agents.md)). One rule for all four kinds cannot rely on
  shadowing, which is why decision 4 forbids installing one item at both Scopes and why a Config override is the only
  opt-out.
- A clone of a repo gets the commit its own machine's `user` State pins (or the latest on first Sync), not the commit
  the repo author saw. This is accepted in ADR 0013.
