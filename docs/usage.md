# Usage Guide

> **Status: intended usage, not yet available.** The marketplace manifest currently publishes no
> plugins and the repository contains no skills or agents. The numbered sections describe what
> roadmap milestone N0 will make true using Claude Code's native plugin mechanisms. Everything
> belonging to the deferred platform track — profiles, the first-party CLI, and overlays — is
> collected in [Appendix A](#appendix-a--platform-track) rather than interleaved here, because
> none of it is reachable until M2–M5. See [roadmap.md](roadmap.md) for sequencing and
> [specs.md](specs.md) for the contracts every example here must satisfy.

`agent-plugins` is organized as **several plugins grouped by domain**. Instead of installing every
skill and agent into every project, a project installs only the plugins it actually needs.

Candidate plugins:

```text
Agent Plugins Marketplace
│
├── core
├── architecture
├── research
├── frontend
├── backend
├── security
└── agentic-engineering
```

These are candidates, not a commitment. A plugin is built when a real workflow demands it, and
`core` is deliberately kept small.

A plugin may contain:

```text
Plugin
├── Skills
├── Agents
└── Supporting resources
```

Hooks and prompts have reserved directories in the collection, but their contracts are deferred to
M8. A manifest that declares hooks or prompts is rejected, not silently ignored.

Vendor components are managed centrally inside `agent-plugins`. Consumers never install an
upstream vendor repository directly.

---

# 1. Prerequisites


Confirm Claude Code is installed and working:

```bash
claude
```

Check the version:

```bash
claude --version
```

A plugin marketplace can be added from a GitHub repository, a Git URL, a local directory, or a
direct URL to a `marketplace.json`. Claude Code supports `user`, `project`, and `local` scopes for
marketplace and plugin installation.

---

---

# 2. Add the Marketplace


A one-time step per environment.

Assuming the repository is published at:

```text
<owner>/agent-plugins
```

add the marketplace with:

```bash
claude plugin marketplace add <owner>/agent-plugins
```

Or from inside Claude Code:

```text
/plugin marketplace add <owner>/agent-plugins
```

Claude Code reads:

```text
.claude-plugin/marketplace.json
```

and discovers the plugins it declares.

List the marketplaces:

```bash
claude plugin marketplace list
```

---

---

# 3. Local Development Marketplace


While developing `agent-plugins`, there is no need to push to GitHub to test.

From a local checkout:

```bash
claude plugin marketplace add ~/workspace/personal/agent-plugins
```

Claude Code accepts a local directory containing `.claude-plugin/marketplace.json`, which suits
development and testing.

---

---

# 4. Browse Available Plugins


Open the plugin UI:

```text
/plugin
```

Switch to:

```text
Discover
```

The `agent-plugins` marketplace lists the domain plugins available to install, with their
description, skills, agents, version, and marketplace source.

---

---

# 5. Install a Plugin


Syntax:

```text
/plugin install <plugin>@agent-plugins
```

Example:

```text
/plugin install architecture@agent-plugins
```

Claude Code installs marketplace plugins using the `plugin-name@marketplace-name` form.

---

---

# 6. Recommended Plugin Strategy


Do not install every plugin into every project.

> Install capabilities according to the project's domain, not according to what is available.

A small backend project might need only:

```text
core
architecture
backend
security
```

while a frontend application might need:

```text
core
architecture
frontend
security
```

---

---

# 7. Plugin Overview


The capabilities listed under each plugin are the intended content. Only what exists in the
repository is actually installable.

## `core`

Broadly useful capabilities.

```text
research
handoff
codebase-onboarding
writing-for-agents
```

Recommended for most projects.

---

## `architecture`

For designing or reviewing architecture.

```text
architecture-review
domain-modeling
api-design
codebase-design
architecture-decision-records

architect
```

Suits application architecture, system design, domain modeling, API design, and large
refactorings.

---

## `research`

For technical research and technology evaluation.

```text
technical-research
technology-evaluation
library-comparison
deep-research

researcher
```

Suits choosing a framework, comparing libraries, and evaluating new technology.

---

## `frontend`

Frontend engineering capabilities: React patterns, composition patterns, frontend design, UI
review, accessibility.

---

## `backend`

Backend development capabilities: API design, backend patterns, service architecture, database
integration.

---

## `security`

Security-oriented capabilities: security review, dependency review, configuration review.

Worth enabling in any repository involving authentication, authorization, public APIs, payments,
sensitive data, or production deployment.

---

## `agentic-engineering`

Capabilities for developing *with* coding agents: agentic engineering, agent evaluation, agent
architecture, handoff, agent-oriented documentation.

Suits a repository developed primarily with Claude Code, Codex, OpenCode, or similar tools.

---

---

# 8. Example: Next.js Project


Recommended:

```text
core
architecture
frontend
backend
security
```

Install:

```text
/plugin install core@agent-plugins
/plugin install architecture@agent-plugins
/plugin install frontend@agent-plugins
/plugin install backend@agent-plugins
/plugin install security@agent-plugins
```

Claude Code then loads only the capabilities relevant to that project rather than the whole
collection.

---

---

# 9. Example: Research Repository


```text
core
research
```

Install:

```text
/plugin install core@agent-plugins
/plugin install research@agent-plugins
```

`frontend`, `backend`, and `security` are unnecessary if they are not relevant.

---

---

# 10. Example: Architecture-heavy Project


For a platform or large system:

```text
/plugin install core@agent-plugins
/plugin install architecture@agent-plugins
/plugin install research@agent-plugins
/plugin install security@agent-plugins
/plugin install agentic-engineering@agent-plugins
```

---

---

# 11. Installation Scope


Claude Code supports several installation scopes.

## User Scope

Available across all of a user's projects. Suits capabilities that are genuinely always useful:

```text
core
```

Use the `/plugin` UI and select `User`.

## Project Scope

Declared for a repository and shareable with the team. Suits `architecture`, `frontend`,
`backend`, and `security` when they are part of the project's development environment. Project
scope appears in the repository's Claude settings.

## Local Scope

Enabled only for the current user in the current repository, not shared with collaborators. Suits
testing a plugin, experimenting, or temporarily enabling a capability.

---

---

# 12. Recommended Scope Strategy


```text
User
└── very few genuinely universal capabilities

Project
└── the domain plugins the repository needs

Local
└── experiments and personal capabilities
```

Avoid installing every plugin at user scope — that reproduces the global-autoload problem this
collection exists to avoid.

---

---

# 13. Using Skills


Claude Code discovers a plugin's skills automatically. You do not have to name a skill on every
request.

After installing `architecture`, you can simply ask:

```text
Review the architecture of this repository.
```

Or name a capability explicitly:

```text
Use the domain modeling skill to analyze this domain.
```

---

---

# 14. Using Agents


A plugin can provide specialized agents. For example, `architecture` provides:

```text
architect
```

Invoke it when useful:

```text
Use the architect agent to review this design.
```

An agent reuses the skills its plugin already provides instead of restating that knowledge in its
own prompt.

---

---

# 15. Updating the Marketplace Catalog


If the marketplace repository has newer content:

```bash
claude plugin marketplace update agent-plugins
```

This refreshes the marketplace catalog. It does not necessarily update the plugins already
installed.

---

---

# 16. Updating Plugins


After the marketplace is refreshed, update installed plugins through Claude Code's plugin
management workflow:

```text
/plugin
```

then open `Installed` and check which plugins have updates. Do not assume that a marketplace
update is the same thing as a plugin update.

---

---

# 17. Disable a Plugin Temporarily


To keep a plugin installed but inactive:

```text
/plugin disable architecture@agent-plugins
```

Re-enable it:

```text
/plugin enable architecture@agent-plugins
```

Claude Code treats enable/disable separately from uninstall.

---

---

# 18. Uninstall a Plugin


```text
/plugin uninstall architecture@agent-plugins
```

The plugin is then no longer loaded at that scope.

---

---

# 19. Vendor Components


Consumers do not install upstream skill repositories individually. `agent-plugins` imports
selected components centrally, at pinned commits, with provenance and checksums.

Illustrative composition — vendor references are qualified, local references are bare:

```text
architecture-review                     local
vendor:mattpocock/domain-modeling       vendor
architect                               local
```

The project only sees the abstraction:

```text
architecture
```

The `mattpocock` example is the one this repository is onboarding first. Any other upstream source
must be selected, verified, and licence-checked explicitly before it appears here.

---

---

# 20. Recommended Workflow


Day to day, with the native marketplace:

```text
Choose project capabilities
        ↓
Install the domain plugins you need
        ↓
Work normally with Claude Code
        ↓
Update the marketplace periodically
        ↓
Update selected plugins when needed
```

The platform-track equivalent, once it exists, is in [Appendix A](#appendix-a--platform-track).

---

# 21. Recommended Project Configurations


| Project kind | Plugins |
| --- | --- |
| Minimal | `core` |
| Research | `core`, `research` |
| Frontend | `core`, `architecture`, `frontend`, `security` |
| Backend | `core`, `architecture`, `backend`, `security` |
| Fullstack | `core`, `architecture`, `frontend`, `backend`, `security` |
| Agentic development | `core`, `architecture`, `research`, `agentic-engineering` |

---

---

# 22. What Not to Do


- Do not install every plugin globally.
- Do not install upstream vendor repositories into each project.
- Do not copy vendor skills between repositories by hand.
- Do not edit generated plugin output; edit the canonical source and regenerate.
- Do not edit vendor snapshots.
- Do not treat a profile as a plugin.
- Do not create a plugin for every single skill.

The intended hierarchy is:

```text
Skill
   ↓
Agent

Skills + Agents
   ↓
Plugin

Plugins
   ↓
Profile

Profile
   ↓
Project
```

---

---

# 23. Troubleshooting


## Marketplace not found

```bash
claude plugin marketplace list
```

If it is missing:

```bash
claude plugin marketplace add <owner>/agent-plugins
```

## Local marketplace changes not visible

```bash
claude plugin marketplace update agent-plugins
```

Then reload Claude Code's plugin state if necessary.

## Plugin not visible

Verify that `.claude-plugin/marketplace.json` actually contains the plugin. An empty `plugins`
array means nothing is published yet.

## Plugin installs but a skill is missing

Check what the plugin directory exposes:

```text
plugins/<id>/
├── .claude-plugin/plugin.json
├── skills/        symlinks into skills/<id>/
└── agents/
```

Verified against Claude Code 2.1.278: a symlinked **skill directory** is dereferenced at install
and works, but a symlinked **agent file is silently dropped** — no error, and `claude plugin
validate` still passes. If an agent is missing, check that it is a real file in the plugin rather
than a link. Run `claude plugin details <plugin>` to see the inventory the target actually built;
that is the only place a dropped component shows up. Note also that a component's installed ID
comes from its directory or file name, not its frontmatter `name`. Once the platform track exists, check the installed output under the consumer's
`.claude/skills/` and `.claude/agents/` and run `agent-plugins doctor`.

## A vendor capability is outdated

> Platform track (M4). Not available yet.

Do not update it in the project. Update it centrally:

```bash
agent-plugins vendor check
agent-plugins vendor diff <source>
agent-plugins vendor sync <source>
```

Vendor sync stages upstream changes for review; it never advances the accepted collection
silently. Then rebuild and release.

---

---

# 24. Upgrade Philosophy


```text
centralized maintenance
+
project-level selection
```

A vendor update flows:

```text
Vendor
  ↓
agent-plugins repository
  ↓
Review / Audit
  ↓
Build
  ↓
Marketplace release
  ↓
Selected projects
```

rather than:

```text
Vendor
  ↓
Project A
Project B
Project C
```

---

---

# 25. Quick Start


Once N0 is delivered, for an existing Claude Code project:

```bash
claude plugin marketplace add <owner>/agent-plugins
```

Then inside Claude Code:

```text
/plugin install core@agent-plugins
/plugin install architecture@agent-plugins
```

Only the capabilities relevant to that project are enabled.

---

---

# Appendix A — Platform track

> **None of this exists yet.** It is collected here so the numbered sections above describe only
> what the native marketplace can actually do. Open the platform track only when one of the
> activation conditions in [roadmap.md](roadmap.md) is met.

## Profiles (M2)

A **profile** is not a Claude Code plugin; it is a composition of plugins, so a project can select
one name instead of listing five. `profiles/nextjs.yaml`:

```yaml
version: 1
name: nextjs
extends: []
plugins:
  - core
  - architecture
  - frontend
  - security
skills: []
agents: []
```

A profile may extend another; inheritance is additive and deduplicated, and a parent is never
overridden. Every manifest carries `version: 1`, meaning the schema version, and unknown fields are
rejected.

## The `agent-plugins` CLI (M1–M3)

Profile selection lives in the project manifest rather than in a positional argument, so the
selection stays committed and reviewable:

```bash
agent-plugins init --collection agent-plugins --target claude-code --profile nextjs
agent-plugins apply --dry-run
agent-plugins apply          # writes .agent-plugins.lock.json, only after a successful install
agent-plugins sync           # honours the lock; --update re-resolves and advances it
agent-plugins doctor         # never mutates anything
agent-plugins validate       # M1
```

`init` writes `.agent-plugins.yaml`; [specs.md](specs.md) §6 gives its full shape.
`collection` is an alias mapping to a local checkout through machine-local configuration; absolute
paths must never reach the committed manifest or lock. `strategy` is `symlink` (default) or `copy`;
`mode` is `locked` (default) or `live`.

Sync adds missing managed components, updates changed ones, removes those no longer selected, and
**preserves unmanaged files**. Given:

```text
.claude/skills/
├── architecture-review     managed
├── domain-modeling         managed
└── project-custom-skill    unmanaged
```

`sync` must never remove `project-custom-skill`. Only recorded managed paths are cleaned up, and
only after checking they still match the expected file, hash, or link.

## Overlays (M5)

A vendor snapshot is never edited. The customization lives at the matching relative path:

```text
vendor/mattpocock/domain-modeling/SKILL.md
overlays/mattpocock/domain-modeling/SKILL.md
```

The build produces the effective component from vendor + overlay. The MVP contract is **file
replacement only**: an overlay file replaces the vendor file at the same relative path, untouched
vendor files are retained. Adding files, deleting files, merge, append, and patch are deferred to
M8. The component keeps its `vendor:` reference — an overlay never creates a new identity, and
plugin consumers never need to know any of this.
