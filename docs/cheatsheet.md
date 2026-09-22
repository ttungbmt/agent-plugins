# Agent Plugins Cheatsheet

**Status:** Archived — describes a retired design. Superseded by `docs/01-domain/`, `docs/03-specs/` and ADR 0010. Kept for history; **do not treat as current.**

Retired names still used below, and what they map to today:

| In this file | Current design | Where |
|---|---|---|
| `Source`, `catalog/sources/` | **Publisher**, `catalog/publishers/` | `publisher.schema.json`, ADR 0011 |
| `Profile` = runtime/env config, `spec.{runtime, preset, policy}` | **Project** — `agent-plugins.yaml` with `spec.{role, presets, policy, targets}` | `manifest-spec.md:133-151` |
| `Preset` example `software-engineer` | that is a **Role**; presets are slash-paths like `engineering/core` | `role.schema.json`, `preset.schema.json` |
| `profiles/` | `roles/` | ADR 0012 |
| `dist/` output | `.agent-plugins/` generated tree | `paths.js` |

In the current model the four are distinct: **Role** = who is working, **Preset** = which capabilities group together, **Project** = what this repository additionally needs, **Target** = which agent runtime it is materialized into.

Quick reference for working with **agent-plugins**.

> `agent-plugins` is a curated control plane for discovering, selecting, resolving, packaging, and distributing agent capabilities across multiple AI coding runtimes.

---

## Mental Model

```text
Source
  ↓
Package
  ↓
Component
  ↓
Capability
  ↓
Preset
  ↓
Profile + Policy
  ↓
Resolver
  ↓
Lockfile
  ↓
Target Adapter
  ↓
Runtime Plugin
```

Think in this order:

```text
Where does it come from?
        ↓
What does it contain?
        ↓
What capability does it provide?
        ↓
Which capabilities do I want?
        ↓
Which implementation should win?
        ↓
How should it be installed for this runtime?
```

---

# Core Concepts

| Concept | Purpose | Example |
|---|---|---|
| Source | Upstream source of content | `superpowers` |
| Package | Logical collection from a source | `superpowers-core` |
| Component | Concrete skill, agent, command, workflow | `systematic-debugging` |
| Capability | Semantic abstraction | `debugging` |
| Preset | Reusable capability selection | `software-engineer` |
| Profile | Runtime/environment configuration | `claude-code` |
| Policy | Resolution and trust rules | `trusted-only` |
| Resolver | Chooses concrete implementations | capability → component |
| Lockfile | Pins resolved versions | commit SHA |
| Adapter | Converts source/runtime formats | Claude Code adapter |

---

# Repository Map

```text
agent-plugins/
├── catalog/
│   ├── sources/
│   ├── packages/
│   ├── capabilities/
│   └── runtimes/
│
├── packages/
│   └── ...
│
├── presets/
├── profiles/
├── policies/
├── schemas/
│
├── src/
│   ├── domain/
│   ├── application/
│   ├── adapters/
│   │   ├── source/
│   │   └── target/
│   └── cli/
│
├── tests/
├── scripts/
├── examples/
└── dist/
```

---

# Source of Truth

## External content

External/community content is declared in:

```text
catalog/sources/
```

Example:

```text
catalog/sources/superpowers.yaml
catalog/sources/anthropic.yaml
catalog/sources/ecc.yaml
```

Do **not** manually copy upstream skills into:

```text
packages/
```

---

## First-party content

Content authored and maintained by this repository belongs in:

```text
packages/
```

Example:

```text
packages/
└── architecture/
    ├── package.yaml
    ├── skills/
    ├── agents/
    ├── prompts/
    └── workflows/
```

Rule:

```text
catalog/   = metadata about things
packages/  = things we own
dist/      = generated runtime output
```

---

# Source

A source answers:

> Where does this content come from?

Example:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Source

metadata:
  id: superpowers
  name: Superpowers

spec:
  type: git

  repository:
    url: https://github.com/obra/superpowers.git
    ref: main
```

Location:

```text
catalog/sources/superpowers.yaml
```

---

# Package

A package answers:

> What logical collection of components does this source expose?

Example:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Package

metadata:
  id: superpowers

spec:
  source: superpowers

  components:
    - type: skill
      path: skills/brainstorming

    - type: skill
      path: skills/systematic-debugging

    - type: skill
      path: skills/test-driven-development
```

Location:

```text
catalog/packages/superpowers.yaml
```

---

# Component

Typical component types:

```text
skill
agent
command
prompt
workflow
hook
rule
```

Example identity:

```text
superpowers/systematic-debugging
```

Recommended canonical form:

```text
<package>/<component>
```

Example:

```text
superpowers/brainstorming
anthropic/frontend-design
first-party/designing-architecture
```

---

# Capability

A capability describes **what the agent can do**, independent of implementation.

Example:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: systematic-debugging

spec:
  implementations:
    - package: superpowers
      component: systematic-debugging

    - package: development
      component: debugging
```

Location:

```text
catalog/capabilities/systematic-debugging.yaml
```

Prefer:

```text
capability: systematic-debugging
```

over hard-coding:

```text
superpowers/systematic-debugging
```

inside presets.

---

# Capability vs Skill

```text
Capability = WHAT

Skill = HOW
```

Example:

```text
Capability
└── debugging
    ├── superpowers/systematic-debugging
    ├── ecc/debugging
    └── first-party/debugging
```

Capabilities provide portability.

Implementations can change without changing presets.

---

# Preset

A preset answers:

> What capabilities do I want?

Example:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Preset

metadata:
  id: software-engineer

spec:
  capabilities:
    - brainstorming
    - planning
    - testing
    - systematic-debugging
    - code-review
```

Location:

```text
presets/software-engineer.yaml
```

Typical presets:

```text
minimal
developer
software-engineer
architect
researcher
full
```

---

# Profile

A profile answers:

> Where and how should this preset run?

Example:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Profile

metadata:
  id: claude-code

spec:
  runtime: claude-code
  preset: software-engineer
  policy: default
```

Location:

```text
profiles/claude-code.yaml
```

Remember:

```text
Preset  = WHAT
Profile = WHERE + HOW
```

---

# Policy

Policy controls resolver behavior.

Example:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: default

spec:
  trust:
    minimum: curated

  conflicts:
    strategy: priority

  updates:
    allowMajor: false
```

Location:

```text
policies/default.yaml
```

Typical policies:

```text
default
trusted-only
permissive
enterprise
```

---

# Resolution

Input:

```text
Capability
+ Preset
+ Profile
+ Policy
```

Resolver chooses:

```text
Capability
    ↓
Package
    ↓
Component
    ↓
Pinned source version
```

Example:

```text
systematic-debugging
        ↓
superpowers/systematic-debugging
        ↓
obra/superpowers@a83f29c
```

---

# Lockfile

Lockfile records the exact resolved state.

Conceptually:

```yaml
version: 1

resolved:
  systematic-debugging:
    source: superpowers
    package: superpowers
    component: systematic-debugging
    revision: a83f29c
```

Purpose:

```text
reproducibility
deterministic builds
safe updates
rollback
auditability
```

Do not use mutable branches as the final installed identity.

Bad:

```text
main
```

Good:

```text
a83f29cf...
```

---

# Source Adapter

Source adapters normalize upstream repositories.

```text
src/adapters/source/
```

Examples:

```text
github/
git/
local/
agent-skills/
```

Responsibility:

```text
upstream format
      ↓
canonical agent-plugins model
```

Source adapters should not know anything about Claude Code, Codex, or Gemini.

---

# Target Adapter

Target adapters materialize canonical content for a runtime.

```text
src/adapters/target/
```

Examples:

```text
claude-code/
codex/
gemini-cli/
opencode/
```

Responsibility:

```text
canonical model
      ↓
runtime-specific representation
```

---

# Claude Code

Typical generated plugin:

```text
dist/
└── claude-code/
    └── plugins/
        └── development/
            ├── .claude-plugin/
            │   └── plugin.json
            ├── skills/
            ├── agents/
            ├── commands/
            ├── hooks/
            └── scripts/
```

Do not make the canonical repository structure depend on Claude Code's folder structure.

Claude Code is a **target**, not the domain model.

---

# First-Party Package

Recommended structure:

```text
packages/
└── development/
    ├── package.yaml
    │
    ├── skills/
    │   └── debugging/
    │       ├── SKILL.md
    │       ├── references/
    │       ├── examples/
    │       └── scripts/
    │
    ├── agents/
    ├── prompts/
    └── workflows/
```

---

# Skill Structure

Minimal:

```text
skills/
└── my-skill/
    └── SKILL.md
```

Recommended:

```text
skills/
└── my-skill/
    ├── SKILL.md
    ├── references/
    ├── examples/
    └── scripts/
```

Keep `SKILL.md` focused.

Move large reference material into:

```text
references/
```

Move executable helpers into:

```text
scripts/
```

---

# Workflow

A workflow orchestrates multiple capabilities/components.

Example:

```text
architecture-design

understand
    ↓
brainstorm
    ↓
domain-model
    ↓
architecture-design
    ↓
architecture-review
    ↓
ADR
```

A workflow is **not** just another name for a skill.

```text
Skill    = reusable behavior
Agent    = specialized actor
Workflow = orchestration
```

---

# Naming

Use lowercase kebab-case.

Good:

```text
systematic-debugging
software-engineer
architecture-review
test-driven-development
```

Avoid:

```text
SystematicDebugging
systematic_debugging
systematicDebugging
```

---

# IDs

Prefer stable semantic IDs.

```yaml
metadata:
  id: systematic-debugging
```

ID should not contain mutable information.

Bad:

```text
superpowers-debugging-v4
```

Better:

```text
systematic-debugging
```

Versions belong in metadata/lockfiles.

---

# File Naming

Prefer:

```text
<id>.yaml
```

Examples:

```text
catalog/sources/superpowers.yaml
catalog/packages/superpowers.yaml
catalog/capabilities/debugging.yaml

presets/software-engineer.yaml
profiles/claude-code.yaml
policies/default.yaml
```

---

# External vs First-Party

Use this rule:

```text
Did agent-plugins author and maintain it?
```

If **yes**:

```text
packages/
```

If **no**:

```text
catalog/sources/
catalog/packages/
```

---

# Vendor

Avoid using:

```text
catalog/vendor/
```

because catalog metadata and vendored content have different responsibilities.

If upstream content must be materialized locally:

```text
.agent-plugins/
└── cache/
    └── sources/
```

Recommended flow:

```text
catalog/sources/
      ↓
sync
      ↓
.agent-plugins/cache/sources/
      ↓
discover
      ↓
resolve
```

Use root-level:

```text
vendor/
```

only when vendored source is intentionally committed to Git.

---

# Cache

Runtime cache should not become source of truth.

Example:

```text
.agent-plugins/
├── cache/
│   ├── sources/
│   ├── manifests/
│   └── artifacts/
└── state/
```

Usually:

```gitignore
.agent-plugins/
dist/
```

---

# Generated Files

Generated files should be clearly separated from authored files.

Authored:

```text
catalog/
packages/
presets/
profiles/
policies/
```

Generated:

```text
dist/
.claude-plugin/marketplace.json
lock files
derived catalogs
```

Rule:

```text
Author intent once.
Generate runtime representations.
```

---

# Marketplace

Claude marketplace output should preferably be generated from canonical metadata.

```text
catalog/
packages/
        ↓
generator
        ↓
.claude-plugin/marketplace.json
```

Avoid maintaining the same metadata manually in multiple places.

---

# Trust Levels

Suggested trust model:

```text
official
curated
community
untrusted
```

Possible priority:

```text
official
   ↓
curated
   ↓
community
   ↓
untrusted
```

Trust is separate from capability quality.

---

# Conflict Resolution

Example conflict:

```text
debugging
├── superpowers/systematic-debugging
├── ecc/debugging
└── first-party/debugging
```

Resolver should use explicit rules such as:

```text
user override
    ↓
profile override
    ↓
policy
    ↓
package priority
    ↓
default implementation
```

Never rely on filesystem order.

---

# Overrides

Prefer explicit configuration:

```yaml
resolution:
  overrides:
    systematic-debugging:
      package: superpowers
      component: systematic-debugging
```

over renaming upstream skills.

Avoid modifying vendor identities just to resolve conflicts.

---

# Duplicate Names

Two packages may contain:

```text
debugging
```

Canonical identity remains unique:

```text
superpowers/debugging
ecc/debugging
```

Capability remains semantic:

```text
debugging
```

Do not solve collisions by randomly renaming upstream components.

---

# Upstream Updates

Preferred flow:

```text
fetch
 ↓
compare
 ↓
validate
 ↓
resolve
 ↓
test
 ↓
update lock
 ↓
build
```

Updating catalog metadata should not silently modify installed runtime state.

---

# Dependency Direction

Keep dependency direction:

```text
domain
  ↑
application
  ↑
adapters / infrastructure
  ↑
CLI
```

Domain must not depend on:

```text
GitHub
Claude Code
filesystem
CLI framework
```

---

# Runtime Independence

Bad domain:

```text
ClaudeSkill
ClaudeAgent
ClaudePlugin
```

Prefer:

```text
Skill
Agent
Package
Capability
```

Then:

```text
ClaudeCodeAdapter
CodexAdapter
GeminiAdapter
```

Runtime-specific concepts belong at the edge.

---

# Personal Configuration

Do not put personal project configuration into the core platform.

Avoid:

```text
presets/tung.yaml
profiles/mealops.yaml
profiles/gtel-maps.yaml
```

inside public `agent-plugins`.

Prefer a separate consumer repository:

```text
my-agent-config/
├── agent-plugins.yaml
├── presets/
├── profiles/
└── workflows/
```

`agent-plugins` should remain reusable infrastructure.

---

# Recommended MVP

Start with:

```text
catalog/
├── sources/
├── packages/
├── capabilities/
└── runtimes/

packages/
└── core/

presets/
profiles/
policies/

src/
├── domain/
├── application/
├── adapters/
│   ├── source/
│   └── target/
└── cli/

tests/
dist/
```

Do not implement everything at once.

---

# MVP Sources

Good initial sources:

```text
Anthropic Skills
Superpowers
Everything Claude Code
Matt Pocock Skills
```

Start with a small curated subset before attempting automatic discovery of hundreds of repositories.

---

# MVP Runtime

Start with:

```text
Claude Code
```

Then add:

```text
Codex
Gemini CLI
OpenCode
```

after the canonical model stabilizes.

---

# MVP Resolution

Start simple:

```text
1 capability
    ↓
1 preferred implementation
    ↓
1 package
    ↓
1 pinned revision
```

Add advanced conflict resolution later.

---

# Design Principles

```text
Canonical over runtime-specific.

Metadata over copying.

Capabilities over concrete implementations.

Explicit over implicit.

Deterministic over convenient.

Generated over duplicated.

Pinned over mutable.

Composable over monolithic.

Upstream-friendly over fork-heavy.

Progressive complexity over premature abstraction.
```

---

# Don't

Avoid:

```text
❌ Copying every community skill into packages/
❌ Editing upstream skills directly
❌ Using directory order for priority
❌ Hard-coding Claude Code concepts in domain
❌ Mixing source adapters and target adapters
❌ Treating cache as source of truth
❌ Putting personal workflows into core
❌ Maintaining generated metadata manually
❌ Renaming upstream skills just to avoid collisions
❌ Using branch names as reproducible versions
```

---

# Prefer

```text
✅ catalog/sources/
✅ packages/ for first-party content
✅ semantic capabilities
✅ explicit resolver rules
✅ pinned revisions
✅ source adapters
✅ target adapters
✅ generated runtime artifacts
✅ small composable skills
✅ schema validation
```

---

# Quick Decision Guide

### Adding a community repository?

```text
catalog/sources/
```

### Registering components from that repository?

```text
catalog/packages/
```

### Describing what those components can do?

```text
catalog/capabilities/
```

### Writing your own skill?

```text
packages/<package>/skills/
```

### Creating a reusable role/toolset?

```text
presets/
```

### Configuring Claude Code vs Codex?

```text
profiles/
```

### Controlling allowed sources or conflict behavior?

```text
policies/
```

### Supporting a new upstream format?

```text
src/adapters/source/
```

### Supporting a new AI runtime?

```text
src/adapters/target/
```

### Generated runtime output?

```text
dist/
```

---

# One-Line Rules

```text
Source tells us WHERE.

Package tells us WHAT EXISTS.

Component is the concrete UNIT.

Capability tells us WHAT IT DOES.

Preset tells us WHAT WE WANT.

Profile tells us WHERE IT RUNS.

Policy tells us WHAT IS ALLOWED.

Resolver tells us WHAT WINS.

Lockfile tells us EXACTLY WHAT WAS CHOSEN.

Source Adapter tells us HOW TO IMPORT.

Target Adapter tells us HOW TO EXPORT.
```

---

# Golden Rule

> Keep upstream content upstream, keep first-party content first-party, and let capabilities + resolution connect the two.

```text
Upstream
   ↓
Catalog
   ↓
Capability
   ↓
Resolver
   ↓
Runtime
```