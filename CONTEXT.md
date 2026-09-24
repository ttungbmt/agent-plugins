# Agent Plugins

The `ap` CLI declares the marketplaces and plugins you want in Claude Code in YAML files, then syncs them into Claude
Code's settings.

## Declarations

**Config**:
The `agent-plugins.yaml` file (`kind: Config`) — the single entry point `ap` reads. It selects Presets and may declare
extra marketplaces of its own.
_Avoid_: Manifest, Project, profile

**Preset**:
A reusable block of declarations (`kind: Preset`) that can inherit from another Preset.
_Avoid_: template, bundle

**Inheritance**:
The relationship a Preset declares through `spec.extends`: the child Preset receives the parent's declarations and may
override them.
_Avoid_: include, import, selection (that is for a Config)

**Preset selection**:
A Config listing Presets under `spec.presets`; selected Presets are peers.
_Avoid_: extends, inheritance (that is for a Preset)

**Bundled preset**:
A Preset shipped with `ap`, referenced by bare name.
_Avoid_: built-in preset, default config

**Local preset**:
A Preset that is a file in the user's repo, referenced by relative path.

**Remote preset**:
A Preset fetched over `https://`, pinned by content hash.

## Marketplace

**Marketplace**:
A Claude Code plugin source, identified by the name declared in its `marketplace.json`.

**Marketplace declaration**:
An entry in `spec.marketplaces` of a Config or Preset — desired state.
_Avoid_: marketplace entry (that is for settings)

**Shorthand declaration**:
A Marketplace declaration written as a single source string (GitHub `owner/repo`, git URL, URL to a `marketplace.json`,
or local path). Its name is unknown until `claude` reads the `marketplace.json`.
_Avoid_: source string

**User-scoped marketplace**:
A Marketplace declaration in map form with `scope: user`. It is synced to the `user` Scope whatever Scope the Sync
targets, while Plugin declarations that use it stay at the targeted Scope. See
[ADR 0011](docs/adr/0011-user-scoped-marketplace.md).
_Avoid_: global marketplace, pinned marketplace

**Known marketplace entry**:
An entry in `extraKnownMarketplaces` of Claude Code's settings — actual state.

**Installed marketplace**:
A marketplace cloned to the machine and recorded by name in `known_marketplaces.json`, shared by every Scope.
`claude plugin install` only sees Installed marketplaces, so a Known marketplace entry with no Installed marketplace
is out of sync.

## Plugin

**Plugin declaration**:
A `name@marketplace` key in `spec.plugins` of a Config or Preset, with an enabled/disabled value — desired state. The
`@marketplace` suffix is the name of a declared Marketplace; for a Shorthand declaration, that name is only known after
the first `add`.

**Plugin entry**:
A key in `enabledPlugins` of Claude Code's settings — the actual enabled/disabled state at one Scope.
_Avoid_: enabled plugin (when the key's value is `false`)

**User-scoped plugin**:
A Plugin declaration in map form with `enabled: true` and `scope: user`. It is synced to the `user` Scope whatever
Scope the Sync targets, and its marketplace must be a User-scoped marketplace. See
[ADR 0012](docs/adr/0012-user-scoped-plugin.md).
_Avoid_: global plugin

**Installed plugin**:
A plugin downloaded to the machine, recorded per Scope but sharing one cache directory across the machine. A `true`
Plugin entry with no Installed plugin at that Scope is out of sync.
_Avoid_: install (when talking about the settings key)

## Skill

**Skill**:
A standalone `<name>/SKILL.md` directory that Claude Code loads from a Scope's skills directory; it does not go through
a Marketplace or Plugin. A skill packaged inside a plugin is not called a Skill.
_Avoid_: agent skill (when talking about a skill inside a plugin)

**Skill source**:
A place holding one or more Skills (e.g. the GitHub repo `owner/repo`).

**Skill declaration**:
An entry in `spec.skills` of a Config or Preset — desired state. A string is a Skill source and installs every Skill in
it; a map either selects Skills or excludes Skills (installing the rest). A Skill is identified by its name; the same
name from different sources follows the same duplicate-declaration rule as Marketplaces.

**Source catalog**:
The names of every Skill in a Skill source (or every Agent in an Agent source, every Rule in a Rule source, every
Workflow in a Workflow source) at the pinned commit, including ones not installed. Skill, Agent, Rule and Workflow
sources are pinned separately, even when they share a repo. A fixed commit means a fixed catalog, which is how `ap`
knows what "all" covers without fetching the source again.

**Installed skill**:
A Skill directory present in a Scope's skills directory — actual state. Exists only at the `project` and `user` Scopes.

## Agent

**Agent**:
A standalone `<name>.md` file (subagent) that Claude Code loads from a Scope's agents directory; it does not go through
a Marketplace or Plugin. An agent packaged inside a plugin is not called an Agent — it is enabled along with the plugin
through its Plugin declaration.
_Avoid_: subagent (when talking about declarations), agent inside a plugin

**Agent source**:
A place holding one or more Agents (e.g. the GitHub repo `owner/repo`).

**Agent declaration**:
An entry in `spec.agents` of a Config or Preset — desired state. Same forms and merge rules as a Skill declaration: a
string is an Agent source (installs every Agent), a map selects or excludes Agents. An Agent is identified by the name
in its frontmatter.

**Installed agent**:
An Agent file present in a Scope's agents directory — actual state. Exactly one `.md` file; exists only at the
`project` and `user` Scopes.

## Rule

**Rule**:
A standalone `.md` file that Claude Code loads from a Scope's rules directory, identified by its path relative to the
Rule source without the `.md` suffix (e.g. `web/coding-style`, `security`). It has no frontmatter name. `README.md` is
not a Rule.
_Avoid_: instruction, rule group (when talking about one file)

**Rule source**:
A place holding one or more Rules (e.g. the GitHub repo `owner/repo`), rooted at the declared `path` or at its `rules/`
directory. Only Rules in Claude Code's format are accepted.

**Rule declaration**:
An entry in `spec.rules` of a Config or Preset — desired state. Same forms as a Skill declaration (string, select,
exclude), but each selected or excluded entry is a path: a file is one Rule, a directory is every Rule beneath it.

**Namespace**:
The subdirectory of a Scope's rules directory that every Rule from one Rule source is installed into, keeping the
source's directory structure. Defaults to the lowercased repo name and can be changed with `as`. Two different sources
may not share a Namespace.
_Avoid_: prefix, rule group

**Installed rule**:
A Rule file present in a Namespace of a Scope's rules directory — actual state. Exists only at the `project` and `user`
Scopes.

## MCP server

**MCP server**:
A standalone MCP server that Claude Code loads from a Scope's MCP config (`.mcp.json` for `project`, `~/.claude.json`
for `local`/`user`); it does not go through a Marketplace or Plugin. A server packaged inside a plugin (shown as
`plugin:<plugin>:<server>`) is not called an MCP server — it is enabled along with the plugin through its Plugin
declaration.
_Avoid_: MCP (when talking about a server inside a plugin)

**MCP server declaration**:
A named key in `spec.mcpServers` of a Config or Preset — desired state. `true` takes the config verbatim from the MCP
catalog; a map is an inline config in Claude Code's exact format; `false` drops an inherited MCP server. Identified by
name. Secrets may only be written as `${VAR}` placeholders.

**User-scoped MCP server**:
An MCP server declaration carrying `scope: user` next to its inline fields, or a map holding only `scope: user` (which
takes the config from the MCP catalog). It is synced to the `user` Scope whatever Scope the Sync targets; `ap` strips
`scope` before writing. See [ADR 0014](docs/adr/0014-user-scoped-mcp-server.md).
_Avoid_: global MCP server

**MCP catalog**:
The set of MCP server configs shipped with `ap`, looked up by name through the value `true`. Users do not declare
catalogs of their own; to reuse configs, write a Preset containing only `mcpServers`.
_Avoid_: registry, catalog (when talking about the MCP Registry)

**Installed MCP server**:
An MCP server config present in a Scope's MCP config — actual state. One in `.mcp.json` only runs after the user
approves it; `ap` never approves on the user's behalf.

## Workflow

**Workflow**:
A standalone `.js` file that Claude Code loads from a Scope's workflows directory, starting with a literal
`export const meta = { name, … }`; it does not go through a Marketplace or Plugin. Identified by `meta.name`, not by
file name. A workflow packaged inside a plugin (run as `<plugin>:<name>`) is not called a Workflow — it is enabled along
with the plugin through its Plugin declaration.
_Avoid_: workflow script (when talking about declarations), workflow inside a plugin, GitHub Actions workflow

**Workflow source**:
A place holding one or more Workflows (e.g. the GitHub repo `owner/repo`), rooted at the declared `path` or at its
`workflows/` directory. Only `*.js` files directly in the root count, skipping `*.test.*` and files starting with `_`;
a file without a literal `meta` carrying a valid `name` is not a Workflow.

**Workflow declaration**:
An entry in `spec.workflows` of a Config or Preset — desired state. Same forms and merge rules as an Agent declaration:
a string is a Workflow source (installs every Workflow), a map selects or excludes Workflows by `meta.name`. A Workflow
tied to a plugin (calling an `agentType` of the form `<plugin>:<agent>`) is never installed: selecting it by name is a
conflict, and when it falls under "all" it is skipped with a notice.

**Installed workflow**:
A `<meta.name>.js` file present in a Scope's workflows directory — actual state. Installed flat, with no Namespace.
Exists only at the `project` and `user` Scopes.

## Hook

**Hook**:
A standalone matcher group (event, matcher, handlers) under the `hooks` key of a Scope's settings; it does not go
through a Marketplace or Plugin. A hook packaged in a plugin or declared in a Skill's or Agent's frontmatter is not
called a Hook — it travels with whatever contains it.
_Avoid_: hook handler (when talking about the whole group), hook inside a plugin

**Hook declaration**:
A named key in `spec.hooks` of a Config or Preset — desired state. The value is a Hook in Claude Code's exact format;
`false` drops an inherited Hook. Identified by name, which exists only inside `ap` and never appears in settings. Only
self-contained Hooks are accepted; a Hook that needs a bundled script belongs in a plugin.

**Installed hook**:
A Hook present in a Scope's settings — actual state. An Installed hook created by `ap` is always its own matcher group
for exactly one Hook declaration, never shared with the user's Hooks; it is recognised by content, since settings carry
no identifier for Hooks. Exists at all three Scopes.

## Ownership

**Managed entry**:
A Known marketplace entry, Plugin entry, Installed skill, Installed agent, Installed rule, Installed workflow or
Installed hook that `ap` created and recorded in Lock/State; `ap` may change or remove it.

**Manual entry**:
A Known marketplace entry, Plugin entry, Installed skill, Installed agent, Installed rule, Installed workflow or
Installed hook the user added; `ap` never changes or removes it. When it matches exactly one declaration, `ap` adopts it
and it becomes a Managed entry.

## Syncing

**Sync**:
Bringing a Scope's Known marketplace entries, Plugin entries, Installed plugins, Installed skills, Installed agents,
Installed rules, Installed workflows and Installed hooks in line with the resolved declarations.

**Scope**:
The Claude Code settings layer a Sync targets: `project`, `local` or `user`.

**Lock**:
The committed `agent-plugins.lock` file, recording Managed entries at the `project` Scope, the Source catalogs of the
pinned Skill, Agent, Rule and Workflow sources, and the hashes of Remote presets.

**State**:
The record of Managed entries and Source catalogs for the `local` or `user` Scope; never committed.
_Avoid_: lock (for a personal Scope)

## Distribution

**Release tarball**:
The `ap.tgz` file (and `ap-<ver>.tgz`) attached to a GitHub Release, containing `ap` bundled into one file with no
runtime dependencies; users install it with `npm i -g <url>`. See
[ADR 0008](docs/adr/0008-distribute-ap-via-github-release-tarball.md).
_Avoid_: npm package, build (when talking about what users install)
