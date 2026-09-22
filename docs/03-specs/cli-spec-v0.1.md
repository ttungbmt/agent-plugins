# Agent Plugins CLI Cheatsheet

**Status:** Archived — describes a retired design (the `Source` entity, `catalog/sources/`, `dist/` output). Superseded by `docs/03-specs/` and ADR 0010. Kept for history; do not treat as current.

Quick operational reference for the `agent-plugins` CLI.

The CLI manages the full lifecycle of agent content:

```text
source
  ↓
sync
  ↓
discover
  ↓
catalog
  ↓
resolve
  ↓
lock
  ↓
build
  ↓
install
  ↓
update
```

---

# 1. CLI Mental Model

`agent-plugins` is not just an installer.

It operates across several layers:

```text
UPSTREAM
Source
  ↓

CATALOG
Package
Component
Capability
  ↓

SELECTION
Preset
Profile
Policy
  ↓

RESOLUTION
Resolver
Lockfile
  ↓

RUNTIME
Build
Install
Claude Code / Codex / Gemini / ...
```

The most important distinction:

```text
sync      = get upstream content

resolve   = decide what should be used

build     = generate runtime-specific artifacts

install   = put generated artifacts into the target runtime
```

---

# 2. Command Structure

General syntax:

```bash
agent-plugins <command> [subcommand] [arguments] [options]
```

Short alias:

```bash
ap <command> [subcommand] [arguments] [options]
```

Recommended alias:

```bash
alias ap="agent-plugins"
```

Examples:

```bash
ap status
ap source list
ap sync superpowers
ap capability show debugging
ap resolve
ap install
```

---

# 3. Command Groups

```text
agent-plugins
│
├── init                Initialize agent-plugins in a project
│
├── source              Manage upstream sources
├── package             Inspect registered packages
├── capability          Inspect semantic capabilities
├── preset              Manage reusable capability sets
├── profile             Manage runtime configurations
├── policy              Inspect resolution policies
├── runtime             Inspect supported runtimes
│
├── sync                Fetch upstream content
├── discover            Detect components from sources
├── resolve             Select concrete implementations
├── lock                Manage resolved versions
│
├── build               Generate runtime artifacts
├── install             Install artifacts into runtime
├── uninstall           Remove managed artifacts
├── update              Update upstream versions
│
├── search              Search catalog content
├── inspect             Inspect effective state
├── diff                Show pending changes
├── validate            Validate configuration
├── status              Show system summary
├── doctor              Diagnose problems
│
├── cache               Manage local cache
├── import              Import external/local content
└── export              Export resolved content
```

---

# 4. Global Options

These options should work across most commands.

## `--help`

Show command documentation.

```bash
agent-plugins --help
agent-plugins source --help
agent-plugins resolve --help
```

Short form:

```bash
agent-plugins -h
```

---

## `--version`

Show CLI version.

```bash
agent-plugins --version
```

---

## `--config <path>`

Use a specific configuration file.

```bash
agent-plugins status \
  --config ./configs/team.yaml
```

Default:

```text
./agent-plugins.yaml
```

---

## `--profile <id>`

Use a specific profile for the command.

```bash
agent-plugins resolve \
  --profile claude-code
```

---

## `--preset <id>`

Override the preset.

```bash
agent-plugins resolve \
  --preset software-engineer
```

---

## `--policy <id>`

Override the resolution policy.

```bash
agent-plugins resolve \
  --policy trusted-only
```

---

## `--runtime <id>`

Target a specific runtime.

```bash
agent-plugins build \
  --runtime claude-code
```

---

## `--json`

Return machine-readable JSON.

```bash
agent-plugins status --json
```

Useful for:

```text
CI
shell scripts
jq
automation
other CLIs
```

---

## `--quiet`

Suppress normal output.

```bash
agent-plugins validate --quiet
```

Useful in scripts when only exit code matters.

---

## `--verbose`

Show additional operational information.

```bash
agent-plugins resolve --verbose
```

---

## `--debug`

Show low-level diagnostic information.

```bash
agent-plugins sync --debug
```

Use for CLI development or troubleshooting.

---

## `--dry-run`

Show what would happen without changing persistent state.

```bash
agent-plugins install --dry-run
```

Commands that mutate state should generally support this option.

---

## `--yes`

Automatically accept confirmation prompts.

```bash
agent-plugins install --yes
```

Useful in CI or automation.

---

# 5. `agent-plugins init`

## What it does

Initializes `agent-plugins` configuration inside a project.

It creates the minimum configuration necessary for the project to use the system.

Typical generated file:

```text
agent-plugins.yaml
```

Possible content:

```yaml
profile: claude-code
preset: software-engineer
policy: default
```

## Syntax

```bash
agent-plugins init
```

## Example

Interactive:

```bash
agent-plugins init
```

Possible questions:

```text
Runtime:
  Claude Code

Preset:
  software-engineer

Policy:
  default

Create agent-plugins.yaml?
  Yes
```

Non-interactive:

```bash
agent-plugins init \
  --runtime claude-code \
  --preset software-engineer \
  --policy default
```

## State

```text
READ:  project
WRITE: agent-plugins.yaml
```

## Use when

Use once when adopting `agent-plugins` in a new project.

---

# 6. `agent-plugins source`

Manages upstream sources.

A source answers:

> Where does agent content come from?

Examples:

```text
Anthropic Skills
Superpowers
Everything Claude Code
Matt Pocock Skills
local Git repository
local filesystem
```

---

## `source list`

### What it does

Lists all registered upstream sources.

### Syntax

```bash
agent-plugins source list
```

### Example

```bash
ap source list
```

Possible output:

```text
ID             TYPE   STATUS    REF
anthropic      git    enabled   main
superpowers    git    enabled   main
ecc            git    enabled   main
matt-pocock    git    disabled  main
```

### Read/write

```text
READ ONLY
```

---

## `source show <id>`

### What it does

Shows the full definition of one source.

### Syntax

```bash
agent-plugins source show <source-id>
```

### Example

```bash
ap source show superpowers
```

Possible output:

```text
Source: superpowers

Type:
  git

Repository:
  https://github.com/obra/superpowers.git

Ref:
  main

Trust:
  curated

Status:
  enabled

Last sync:
  2026-09-22
```

---

## `source add <location>`

### What it does

Registers a new upstream source.

It does not necessarily download the source immediately.

### Syntax

```bash
agent-plugins source add <location> [options]
```

### Example

```bash
agent-plugins source add \
  https://github.com/obra/superpowers \
  --id superpowers
```

Local repository:

```bash
agent-plugins source add \
  ./my-skills \
  --id local-skills \
  --type local
```

### State

```text
WRITE:
catalog/sources/
```

---

## `source remove <id>`

### What it does

Removes the source registration.

It should not automatically remove installed components unless explicitly requested.

### Syntax

```bash
agent-plugins source remove <id>
```

### Example

```bash
ap source remove ecc
```

---

## `source enable <id>`

Enable a registered source.

```bash
ap source enable superpowers
```

---

## `source disable <id>`

Disable a source from future resolution.

```bash
ap source disable ecc
```

Existing lockfile entries remain unchanged until re-resolution.

---

# 7. `agent-plugins sync`

## What it does

Fetches or refreshes local copies of upstream sources.

Think:

```text
catalog/sources/
       ↓
     sync
       ↓
local source cache
```

`sync` does **not** decide which skills should be installed.

It only ensures local upstream state is available.

## Syntax

```bash
agent-plugins sync [source...]
```

## Sync all

```bash
agent-plugins sync
```

## Sync one source

```bash
agent-plugins sync superpowers
```

## Sync several

```bash
agent-plugins sync \
  superpowers \
  anthropic \
  ecc
```

## Force refresh

```bash
agent-plugins sync superpowers --force
```

## Without existing cache

```bash
agent-plugins sync superpowers --no-cache
```

## Preview

```bash
agent-plugins sync --dry-run
```

## Possible output

```text
Syncing sources...

✓ superpowers
  main → 5c739ad

✓ anthropic
  main → 29f4d02

✓ ecc
  main → f58102e

3 sources synced.
```

## State

```text
READ:
catalog/sources/

WRITE:
.agent-plugins/cache/sources/
```

---

# 8. `agent-plugins discover`

## What it does

Scans synchronized sources and detects usable components.

Typical components:

```text
skills
agents
commands
prompts
hooks
workflows
rules
```

Think:

```text
source repository
      ↓
   discover
      ↓
detected components
```

It answers:

> What reusable agent content exists inside this source?

## Syntax

```bash
agent-plugins discover [source]
```

## Example

```bash
agent-plugins discover superpowers
```

Possible output:

```text
Source: superpowers

Detected:

Skills
  brainstorming
  systematic-debugging
  test-driven-development
  writing-plans
  executing-plans

Agents
  0

Commands
  0

5 components discovered.
```

## Discover only skills

```bash
agent-plugins discover superpowers \
  --type skill
```

## Discover all sources

```bash
agent-plugins discover
```

## Show unregistered components

```bash
agent-plugins discover superpowers \
  --unregistered
```

Useful when upstream adds new skills.

---

# 9. `agent-plugins package`

A package is a logical collection of components.

Examples:

```text
superpowers
anthropic-skills
ecc-core
first-party-development
```

---

## `package list`

### What it does

Lists all known packages.

```bash
agent-plugins package list
```

Possible output:

```text
PACKAGE             SOURCE          COMPONENTS
superpowers         superpowers     14
anthropic-skills    anthropic       8
development         first-party     6
architecture        first-party     4
```

---

## `package show <id>`

Shows package metadata.

```bash
agent-plugins package show superpowers
```

---

## `package components <id>`

Lists components belonging to the package.

```bash
agent-plugins package components superpowers
```

Filter:

```bash
agent-plugins package components superpowers \
  --type skill
```

Possible output:

```text
TYPE    ID
skill   brainstorming
skill   systematic-debugging
skill   test-driven-development
skill   writing-plans
```

---

# 10. `agent-plugins capability`

A capability represents **what the system can do**, independent of the concrete implementation.

Example:

```text
debugging
```

may map to:

```text
superpowers/systematic-debugging
ecc/debugging
first-party/debugging
```

---

## `capability list`

### What it does

Lists known semantic capabilities.

```bash
agent-plugins capability list
```

Possible output:

```text
CAPABILITY             IMPLEMENTATIONS
brainstorming           2
debugging               3
test-driven-development 2
architecture-design     1
code-review             4
```

---

## `capability show <id>`

### What it does

Shows capability metadata and candidate implementations.

```bash
agent-plugins capability show debugging
```

Possible output:

```text
Capability:
  debugging

Description:
  Systematic investigation and resolution of software defects.

Implementations:

  1. superpowers/systematic-debugging
  2. ecc/debugging
  3. development/debugging
```

---

## `capability implementations <id>`

Shows only concrete implementations.

```bash
agent-plugins capability implementations debugging
```

---

# 11. `agent-plugins preset`

A preset defines:

> Which capabilities do I want?

Example:

```text
software-engineer
```

may include:

```text
brainstorming
planning
debugging
testing
code-review
documentation
```

---

## `preset list`

```bash
agent-plugins preset list
```

Possible output:

```text
PRESET              CAPABILITIES
minimal             5
developer           11
software-engineer   18
architect            15
researcher           12
full                 43
```

---

## `preset show <id>`

Shows the preset definition.

```bash
agent-plugins preset show software-engineer
```

Possible output:

```text
Preset:
  software-engineer

Capabilities:
  brainstorming
  planning
  systematic-debugging
  test-driven-development
  code-review
  documentation
```

---

## `preset create <id>`

Creates a new preset.

```bash
agent-plugins preset create backend-engineer
```

---

## `preset clone`

Copies an existing preset.

```bash
agent-plugins preset clone \
  software-engineer \
  backend-engineer
```

---

# 12. `agent-plugins profile`

A profile describes:

> Where and how should a preset run?

Typical profile:

```text
claude-code
```

can resolve to:

```text
runtime: claude-code
preset: software-engineer
policy: default
```

---

## `profile list`

```bash
agent-plugins profile list
```

---

## `profile show <id>`

```bash
agent-plugins profile show claude-code
```

Possible output:

```text
Profile:
  claude-code

Runtime:
  claude-code

Preset:
  software-engineer

Policy:
  default
```

---

## `profile use <id>`

Sets the active profile.

```bash
agent-plugins profile use claude-code
```

Possible persistent configuration:

```yaml
profile: claude-code
```

---

## `profile current`

Shows the effective profile.

```bash
agent-plugins profile current
```

---

# 13. `agent-plugins policy`

A policy controls **what resolver is allowed to choose**.

Policy may define:

```text
trust requirements
source allowlist
source denylist
conflict strategy
version constraints
update rules
license constraints
```

---

## `policy list`

```bash
agent-plugins policy list
```

---

## `policy show <id>`

```bash
agent-plugins policy show trusted-only
```

Possible output:

```text
Policy:
  trusted-only

Minimum trust:
  curated

Community sources:
  denied

Unknown licenses:
  denied

Conflict strategy:
  priority
```

---

# 14. `agent-plugins resolve`

This is one of the most important commands.

## What it does

Turns abstract capability requests into concrete implementations.

Input:

```text
Preset
Profile
Policy
Catalog
```

Output:

```text
resolved package/component/version
```

Example:

```text
debugging
    ↓
superpowers/systematic-debugging
    ↓
obra/superpowers@5c739ad
```

## Syntax

```bash
agent-plugins resolve [capability...] [options]
```

## Resolve active configuration

```bash
agent-plugins resolve
```

## Resolve a preset

```bash
agent-plugins resolve \
  --preset software-engineer
```

## Resolve for Claude Code

```bash
agent-plugins resolve \
  --runtime claude-code
```

## Resolve one capability

```bash
agent-plugins resolve debugging
```

## Resolve several

```bash
agent-plugins resolve \
  debugging \
  code-review \
  testing
```

## Override implementation

```bash
agent-plugins resolve debugging \
  --use superpowers/systematic-debugging
```

## Preview only

```bash
agent-plugins resolve --dry-run
```

## Explain selection

```bash
agent-plugins resolve --verbose
```

Possible output:

```text
Resolving debugging...

Candidates:

  superpowers/systematic-debugging
    trust: curated
    priority: 100

  ecc/debugging
    trust: curated
    priority: 80

Selected:
  superpowers/systematic-debugging

Reason:
  Highest eligible priority under policy "default"

Revision:
  5c739ad
```

## State

Normally:

```text
READ:
catalog
preset
profile
policy

WRITE:
lockfile
```

With:

```bash
--dry-run
```

no lockfile is modified.

---

# 15. `agent-plugins lock`

The lockfile stores the exact resolved state.

It makes installations reproducible.

---

## `lock show`

Show the currently pinned resolution.

```bash
agent-plugins lock show
```

Example:

```text
debugging
  superpowers/systematic-debugging
  revision: 5c739ad

testing
  superpowers/test-driven-development
  revision: 5c739ad
```

---

## `lock verify`

Checks whether locked content is available and valid.

```bash
agent-plugins lock verify
```

---

## `lock diff`

Shows differences between current catalog and lockfile.

```bash
agent-plugins lock diff
```

Example:

```text
superpowers

Locked:
  5c739ad

Latest synced:
  b31e422

Status:
  update available
```

---

# 16. `agent-plugins build`

## What it does

Transforms canonical content into runtime-specific artifacts.

Example:

```text
canonical skill
      ↓
Claude Code adapter
      ↓
Claude Code plugin structure
```

## Syntax

```bash
agent-plugins build [options]
```

## Default build

```bash
agent-plugins build
```

## Claude Code

```bash
agent-plugins build \
  --runtime claude-code
```

## Specific profile

```bash
agent-plugins build \
  --profile claude-code
```

## Clean previous build

```bash
agent-plugins build --clean
```

## Custom output

```bash
agent-plugins build \
  --output ./dist
```

## Possible output

```text
Building runtime: claude-code

Resolved components:
  18 skills
  4 agents
  2 commands

Generated:
  dist/claude-code/plugins/development/

✓ Build complete
```

## State

```text
READ:
lockfile
canonical content

WRITE:
dist/
```

---

# 17. `agent-plugins install`

Another core lifecycle command.

## What it does

Installs already-resolved agent content into the selected runtime or project.

Think:

```text
dist/
 ↓
install
 ↓
runtime
```

For Claude Code this might mean generating or registering Claude-compatible plugins.

## Syntax

```bash
agent-plugins install [component...] [options]
```

## Install active configuration

```bash
agent-plugins install
```

## Install for Claude Code

```bash
agent-plugins install \
  --runtime claude-code
```

## Project scope

```bash
agent-plugins install \
  --scope project
```

## User scope

```bash
agent-plugins install \
  --scope user
```

## Install a preset

```bash
agent-plugins install \
  --preset software-engineer
```

## Install one capability

```bash
agent-plugins install debugging
```

## Preview changes

```bash
agent-plugins install --dry-run
```

Possible output:

```text
Install plan:

Runtime:
  Claude Code

Scope:
  project

Add:
  18 skills
  4 agents
  2 commands

Remove:
  1 obsolete skill

Modify:
  plugin metadata

No changes have been made.
```

Then:

```bash
agent-plugins install
```

## State

```text
WRITE:
runtime/project installation
```

---

# 18. `agent-plugins uninstall`

## What it does

Removes artifacts previously managed by `agent-plugins`.

It should avoid deleting unmanaged user files.

## Syntax

```bash
agent-plugins uninstall [component...]
```

## Example

```bash
agent-plugins uninstall debugging
```

Remove managed runtime installation:

```bash
agent-plugins uninstall \
  --runtime claude-code
```

Preview:

```bash
agent-plugins uninstall \
  --dry-run
```

---

# 19. `agent-plugins update`

## What it does

Moves locked sources/components toward newer upstream revisions.

This command should never silently upgrade everything without showing resolution effects.

Recommended process:

```text
check
 ↓
compare
 ↓
resolve
 ↓
validate
 ↓
update lock
```

---

## Check updates

```bash
agent-plugins update --check
```

Possible output:

```text
Updates available:

superpowers
  5c739ad → b31e422

anthropic
  unchanged

ecc
  f58102e → 821cc10
```

---

## Update all eligible sources

```bash
agent-plugins update
```

---

## Update one source

```bash
agent-plugins update superpowers
```

---

## Preview

```bash
agent-plugins update --dry-run
```

---

# 20. `agent-plugins diff`

## What it does

Shows the difference between two layers of state.

Useful before:

```text
update
install
commit
CI
```

## Default

```bash
agent-plugins diff
```

Recommended default comparison:

```text
lock
vs
installed state
```

## Catalog vs lock

```bash
agent-plugins diff \
  --from catalog \
  --to lock
```

## Lock vs installed

```bash
agent-plugins diff \
  --from lock \
  --to installed
```

Possible output:

```text
Capabilities

+ architecture-review
- legacy-debugging

Changed:

debugging
  ecc/debugging
    →
  superpowers/systematic-debugging
```

---

# 21. `agent-plugins validate`

## What it does

Validates configuration and catalog integrity.

It should catch problems before resolution or installation.

## Validate everything

```bash
agent-plugins validate
```

Possible checks:

```text
YAML syntax
schema validation
duplicate IDs
missing source references
missing packages
unknown capabilities
invalid runtime
invalid preset
policy violations
broken component paths
```

## Catalog

```bash
agent-plugins validate catalog
```

## Sources

```bash
agent-plugins validate sources
```

## Packages

```bash
agent-plugins validate packages
```

## Capabilities

```bash
agent-plugins validate capabilities
```

## Presets

```bash
agent-plugins validate presets
```

## Strict CI mode

```bash
agent-plugins validate --strict
```

Possible output:

```text
✓ 4 sources
✓ 12 packages
✓ 37 capabilities
✓ 6 presets
✓ 4 profiles
✓ 3 policies

0 errors
2 warnings
```

---

# 22. `agent-plugins search`

## What it does

Searches known catalog content.

## Search everything

```bash
agent-plugins search debugging
```

Possible output:

```text
Capabilities
  debugging

Skills
  superpowers/systematic-debugging
  ecc/debugging

Packages
  development
```

## Skills only

```bash
agent-plugins search debugging \
  --type skill
```

## Capability only

```bash
agent-plugins search architecture \
  --type capability
```

## Restrict source

```bash
agent-plugins search testing \
  --source superpowers
```

---

# 23. `agent-plugins inspect`

## What it does

Shows effective resolved configuration and explains how the system reached it.

This is primarily a debugging/exploration command.

## Inspect current state

```bash
agent-plugins inspect
```

## Inspect capability

```bash
agent-plugins inspect debugging
```

## Explain resolution

```bash
agent-plugins inspect debugging \
  --explain
```

Possible output:

```text
Capability:
  debugging

Requested by:
  preset/software-engineer

Candidates:

  superpowers/systematic-debugging
    eligible: yes
    priority: 100

  ecc/debugging
    eligible: yes
    priority: 80

Selected:
  superpowers/systematic-debugging

Why:
  package priority

Pinned revision:
  5c739ad
```

Think:

```text
inspect = "why is the system like this?"
```

---

# 24. `agent-plugins status`

## What it does

Shows a high-level summary of the current environment.

This should be one of the most frequently used commands.

```bash
agent-plugins status
```

Possible output:

```text
Agent Plugins

Project
  ./agent-plugins.yaml

Profile
  claude-code

Preset
  software-engineer

Policy
  default

Runtime
  claude-code

Catalog
  Sources        4
  Packages       12
  Capabilities   37

Resolution
  Requested      18
  Resolved       18
  Conflicts      0

Installation
  Installed      18
  Drift          0

Updates
  Available      2
```

`status` should not change state.

---

# 25. `agent-plugins doctor`

## What it does

Diagnoses environment and configuration problems.

Think:

```text
doctor = "is my installation healthy?"
```

## Syntax

```bash
agent-plugins doctor
```

Possible output:

```text
Environment

✓ Git available
✓ Node.js supported
✓ config file found
✓ catalog valid
✓ source cache writable
✓ lockfile valid
✓ Claude Code detected
✓ Claude Code adapter available
✓ installation matches lockfile

Health:
  OK
```

Verbose:

```bash
agent-plugins doctor --verbose
```

Use this when:

```text
sync fails
build fails
runtime is not detected
installation behaves unexpectedly
lockfile seems broken
```

---

# 26. `agent-plugins cache`

Cache contains disposable local artifacts.

It must not be treated as source of truth.

---

## `cache status`

```bash
agent-plugins cache status
```

Possible output:

```text
Cache

Sources:
  1.4 GB

Artifacts:
  220 MB

Manifests:
  3 MB
```

---

## `cache list`

```bash
agent-plugins cache list
```

---

## `cache prune`

Removes unused/stale cache entries.

```bash
agent-plugins cache prune
```

---

## `cache clear`

Remove all cache.

```bash
agent-plugins cache clear
```

One source:

```bash
agent-plugins cache clear superpowers
```

---

# 27. `agent-plugins runtime`

## What it does

Inspects target runtime support.

Examples:

```text
Claude Code
Codex
Gemini CLI
OpenCode
```

## List

```bash
agent-plugins runtime list
```

Possible output:

```text
RUNTIME       STATUS
claude-code   supported
codex         experimental
gemini-cli    experimental
opencode      planned
```

## Show

```bash
agent-plugins runtime show claude-code
```

## Detect

```bash
agent-plugins runtime detect
```

Possible output:

```text
Detected:

Claude Code
  available: yes
  project: yes

Codex
  available: yes
  project: no
```

---

# 28. `agent-plugins import`

## What it does

Imports existing content into the canonical model.

Typical uses:

```text
local skill
local package
third-party repo
legacy agent folder
```

## Import local skill

```bash
agent-plugins import \
  ./skills/my-skill
```

Into package:

```bash
agent-plugins import \
  ./skills/my-skill \
  --package development
```

## Import repository

```bash
agent-plugins import \
  https://github.com/example/skills
```

Preview:

```bash
agent-plugins import ./legacy-skills \
  --dry-run
```

---

# 29. `agent-plugins export`

## What it does

Exports resolved canonical content into another representation.

## Runtime export

```bash
agent-plugins export \
  --runtime claude-code
```

## Output location

```bash
agent-plugins export \
  --runtime claude-code \
  --output ./export
```

## Manifest export

```bash
agent-plugins export \
  --format manifest
```

---

# 30. Read vs Write Commands

## Read-only commands

Safe commands:

```text
source list
source show

package list
package show
package components

capability list
capability show

preset list
preset show

profile list
profile show
profile current

policy list
policy show

search
inspect
status
doctor

runtime list
runtime show
runtime detect

diff
```

---

## Commands that may modify repository state

```text
init
source add
source remove
source enable
source disable

preset create
preset clone

profile use

resolve
lock

import
```

---

## Commands that modify generated/runtime state

```text
sync
build
install
uninstall
update
cache clear
cache prune
export
```

---

# 31. Main Lifecycle

The standard workflow is:

```bash
agent-plugins sync

agent-plugins resolve

agent-plugins diff

agent-plugins validate

agent-plugins build

agent-plugins install
```

Meaning:

```text
sync
Fetch upstream content
        ↓

resolve
Choose implementations
        ↓

diff
Review what changes
        ↓

validate
Ensure everything is valid
        ↓

build
Generate runtime artifacts
        ↓

install
Apply to runtime
```

---

# 32. Initial Setup Workflow

```bash
agent-plugins init
```

Then:

```bash
agent-plugins sync
```

Then:

```bash
agent-plugins resolve
```

Then:

```bash
agent-plugins validate
```

Then:

```bash
agent-plugins install
```

Full:

```bash
agent-plugins init
agent-plugins sync
agent-plugins resolve
agent-plugins validate
agent-plugins build
agent-plugins install
```

---

# 33. Daily Workflow

Typical daily use should stay small:

```bash
agent-plugins status
```

Check upstream:

```bash
agent-plugins update --check
```

If needed:

```bash
agent-plugins sync
agent-plugins resolve
agent-plugins diff
agent-plugins install
```

---

# 34. Add New Community Source

Example:

```bash
agent-plugins source add \
  https://github.com/example/skills \
  --id example
```

Then:

```bash
agent-plugins sync example
```

Discover content:

```bash
agent-plugins discover example
```

Inspect:

```bash
agent-plugins source show example
```

Validate:

```bash
agent-plugins validate
```

---

# 35. Investigate a Skill

You know the keyword:

```text
debugging
```

Search:

```bash
agent-plugins search debugging
```

Then:

```bash
agent-plugins capability show debugging
```

Then:

```bash
agent-plugins inspect debugging --explain
```

Flow:

```text
search
  ↓
capability show
  ↓
inspect --explain
```

---

# 36. Switch Preset

Current:

```bash
agent-plugins preset show software-engineer
```

Try architect:

```bash
agent-plugins resolve \
  --preset architect \
  --dry-run
```

Review:

```bash
agent-plugins diff
```

Apply:

```bash
agent-plugins install \
  --preset architect
```

---

# 37. Switch Runtime

Check runtimes:

```bash
agent-plugins runtime list
```

Resolve for Codex:

```bash
agent-plugins resolve \
  --runtime codex
```

Build:

```bash
agent-plugins build \
  --runtime codex
```

Install:

```bash
agent-plugins install \
  --runtime codex
```

---

# 38. Debug a Conflict

Suppose:

```text
Capability debugging has 3 valid implementations.
```

Run:

```bash
agent-plugins inspect debugging \
  --explain
```

If necessary:

```bash
agent-plugins resolve debugging \
  --use superpowers/systematic-debugging
```

Then:

```bash
agent-plugins lock show
```

---

# 39. Safe Upgrade Workflow

Do not directly run an uncontrolled upgrade.

Recommended:

```bash
agent-plugins update --check
```

Then:

```bash
agent-plugins sync
```

Resolve:

```bash
agent-plugins resolve
```

Inspect changes:

```bash
agent-plugins diff
```

Validate:

```bash
agent-plugins validate
```

Build:

```bash
agent-plugins build
```

Finally:

```bash
agent-plugins install
```

---

# 40. CI Workflow

Recommended CI checks:

```bash
agent-plugins validate --strict
```

Then:

```bash
agent-plugins lock verify
```

Then:

```bash
agent-plugins resolve --check
```

Then:

```bash
agent-plugins build
```

Typical CI:

```bash
agent-plugins validate --strict
agent-plugins lock verify
agent-plugins resolve --check
agent-plugins build
```

---

# 41. Exit Codes

Recommended stable exit-code contract:

```text
0   success

1   unknown/general failure

2   invalid CLI input

3   configuration validation failure

4   resolution failure/conflict

5   source/sync failure

6   build failure

7   install/uninstall failure

8   policy violation

9   lockfile mismatch

10  runtime unavailable
```

Automation should depend on exit codes instead of parsing CLI text.

---

# 42. Output Conventions

Success:

```text
✓ source synced
✓ resolution complete
✓ validation passed
```

Warning:

```text
! newer revision available
```

Failure:

```text
✗ capability resolution failed
```

Actions:

```text
ADD
REMOVE
UPDATE
KEEP
SKIP
```

Example:

```text
UPDATE superpowers
  5c739ad → b31e422

ADD
  architecture-review

REMOVE
  legacy-debugging
```

---

# 43. Recommended MVP CLI

Do not implement every command immediately.

## Phase 1

Build:

```text
init

source
  list
  show

sync

capability
  list
  show

preset
  list
  show

resolve

validate

build

install

status

doctor
```

This is already enough for:

```text
configure
fetch
select
validate
materialize
install
```

---

## Phase 2

Add:

```text
discover
package
profile
policy
runtime
lock
diff
update
inspect
search
```

---

## Phase 3

Add advanced operations:

```text
import
export
uninstall
cache
source add/remove
preset create/clone
```

---

# 44. Command Responsibility Matrix

| Command | Main responsibility | Changes state |
|---|---|---:|
| `init` | initialize consumer project | Yes |
| `source` | manage upstream registrations | Sometimes |
| `sync` | fetch upstream data | Yes |
| `discover` | detect source components | Usually No |
| `package` | inspect package metadata | No |
| `capability` | inspect semantic capabilities | No |
| `preset` | manage capability selections | Sometimes |
| `profile` | manage runtime configuration | Sometimes |
| `policy` | inspect resolution rules | No |
| `runtime` | inspect target runtimes | No |
| `resolve` | choose concrete implementations | Yes |
| `lock` | inspect/manage pinned resolution | Sometimes |
| `build` | generate runtime artifacts | Yes |
| `install` | apply artifacts to runtime | Yes |
| `uninstall` | remove managed artifacts | Yes |
| `update` | move to newer upstream content | Yes |
| `search` | search catalog | No |
| `inspect` | explain effective state | No |
| `diff` | compare states | No |
| `validate` | verify integrity | No |
| `status` | summarize state | No |
| `doctor` | diagnose environment | No |
| `cache` | manage local disposable state | Sometimes |
| `import` | bring external content into model | Yes |
| `export` | write external representation | Yes |

---

# 45. Command vs Domain Concept

```text
Source
  → source
  → sync
  → discover

Package
  → package

Capability
  → capability

Preset
  → preset

Profile
  → profile

Policy
  → policy

Resolution
  → resolve
  → lock
  → inspect

Runtime
  → runtime
  → build
  → install

Operations
  → diff
  → validate
  → status
  → doctor
```

---

# 46. Frequently Used Commands

### What is currently active?

```bash
ap status
```

### What sources do I have?

```bash
ap source list
```

### Fetch latest source content?

```bash
ap sync
```

### Find a skill/capability?

```bash
ap search debugging
```

### See implementations of a capability?

```bash
ap capability show debugging
```

### Why was this implementation selected?

```bash
ap inspect debugging --explain
```

### See what will change?

```bash
ap diff
```

### Check configuration?

```bash
ap validate
```

### Generate runtime artifacts?

```bash
ap build
```

### Apply runtime installation?

```bash
ap install
```

### Check upstream updates?

```bash
ap update --check
```

### Diagnose problems?

```bash
ap doctor
```

---

# 47. The Most Important Distinctions

Do not confuse:

```text
source add
```

with:

```text
sync
```

`source add` registers a source.

`sync` fetches it.

---

Do not confuse:

```text
sync
```

with:

```text
update
```

`sync` refreshes what upstream currently contains.

`update` changes what locked version you intend to use.

---

Do not confuse:

```text
resolve
```

with:

```text
install
```

`resolve` chooses.

`install` applies.

---

Do not confuse:

```text
build
```

with:

```text
install
```

`build` generates runtime artifacts.

`install` places those artifacts where the runtime can use them.

---

Do not confuse:

```text
status
```

with:

```text
doctor
```

`status` tells you:

> What is my current state?

`doctor` tells you:

> Is something wrong?

---

Do not confuse:

```text
inspect
```

with:

```text
show
```

`show` displays one resource.

`inspect` explains effective/resolved behavior.

---

# 48. Golden Path

For most users:

```bash
ap init
```

then:

```bash
ap sync
```

then:

```bash
ap resolve
```

then:

```bash
ap diff
```

then:

```bash
ap validate
```

then:

```bash
ap build
```

then:

```bash
ap install
```

Conceptually:

```text
INIT
configure project
     ↓

SYNC
fetch upstream
     ↓

RESOLVE
choose implementations
     ↓

DIFF
review changes
     ↓

VALIDATE
verify integrity
     ↓

BUILD
generate runtime representation
     ↓

INSTALL
apply to runtime
```

---

# 49. Golden CLI Principles

The CLI should follow these rules:

```text
Commands should map directly to domain concepts.

Read operations should be safe by default.

Mutating operations should support --dry-run.

Destructive operations should require explicit intent.

Resolution should always be explainable.

Updates should always be reviewable.

Automation should use --json.

Scripts should rely on exit codes.

Runtime-specific behavior should remain behind adapters.

Cache should always be disposable.

The same command should behave consistently across runtimes.
```

---

# 50. One-Line Command Reference

```text
init
Initialize agent-plugins in a project.

source
Register and inspect upstream sources.

sync
Fetch upstream source content locally.

discover
Detect skills, agents, commands, and other components.

package
Inspect logical packages and their components.

capability
Inspect semantic capabilities and implementations.

preset
Define or inspect reusable capability selections.

profile
Select runtime + preset + policy configuration.

policy
Control what the resolver may choose.

runtime
Inspect supported AI runtimes.

resolve
Turn abstract capabilities into concrete implementations.

lock
Pin exact resolved revisions.

build
Generate runtime-specific artifacts.

install
Apply generated artifacts to the target runtime.

uninstall
Remove artifacts managed by agent-plugins.

update
Move locked content toward newer upstream revisions.

search
Find sources, packages, skills, and capabilities.

inspect
Explain effective configuration and resolution decisions.

diff
Show changes between catalog, lock, build, and installed state.

validate
Verify configuration and catalog integrity.

status
Show a concise summary of current state.

doctor
Diagnose environment and configuration problems.

cache
Manage disposable local cache.

import
Bring external content into the canonical model.

export
Produce portable or runtime-specific output.
```

---

# Golden Rule

```text
source     → WHERE content comes from
sync       → GET the content
discover   → FIND what exists
capability → WHAT it can do
preset     → WHAT we want
profile    → WHERE/HOW we run
policy     → WHAT is allowed
resolve    → WHAT wins
lock       → WHAT exact version
build      → HOW runtime sees it
install    → MAKE runtime use it
diff       → WHAT will change
inspect    → WHY it happened
doctor     → WHAT is wrong
```

> A good `agent-plugins` CLI should let a user answer four questions quickly:
>
> **What do I have? What will be selected? Why was it selected? What will change if I apply it?**