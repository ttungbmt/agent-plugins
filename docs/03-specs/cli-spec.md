# CLI Specification

**Status:** Design note — ahead of implementation. The prose here describes intended behaviour; it is not the contract.  
**Version:** 0.1.0  
**Last Updated:** 2026-09-21

---

# 1. Purpose

This document defines the command-line interface for the Agent Plugins system.

The CLI is the primary human- and automation-facing interface for:

- discovering packages;
- managing project configuration;
- selecting Profiles and Presets;
- resolving dependencies;
- evaluating policies;
- creating and updating lockfiles;
- rendering target-native artifacts through adapters;
- installing generated artifacts;
- updating external sources;
- validating repository state;
- inspecting resolution decisions;
- diagnosing environment problems.

The CLI MUST remain a thin orchestration layer over the core domain.

```text
User / CI / Script
        │
        ▼
┌─────────────────┐
│       CLI       │
└────────┬────────┘
         │
         ▼
┌────────────────────────────┐
│      Application API       │
├────────────────────────────┤
│ Catalog                    │
│ Resolver                   │
│ Policy Engine              │
│ Lockfile                   │
│ Adapter Engine             │
│ Update Engine              │
│ Validation                 │
└──────────────┬─────────────┘
               │
               ▼
        Domain / Storage
```

The CLI MUST NOT become the implementation location for core business rules.

---

# 2. Design Principles

The CLI follows these principles:

1. **Thin CLI, rich core**
2. **Intent-oriented commands**
3. **Safe by default**
4. **Deterministic behavior**
5. **Human-friendly interactive UX**
6. **Machine-friendly automation**
7. **Inspectable before mutation**
8. **Explicit destructive operations**
9. **Composable commands**
10. **Stable exit codes**
11. **Stable structured output**
12. **No hidden resolution**
13. **No hidden network operations**
14. **Configuration over CLI complexity**
15. **Progressive disclosure**

The CLI SHOULD be pleasant for:

```text
first-time user
      ↓
daily interactive use
      ↓
advanced automation
      ↓
CI/CD
```

without creating separate command systems for each audience.

---

# 3. Non-Goals

The CLI is not:

- the canonical data model;
- the package resolver;
- the policy engine;
- the target renderer;
- the source adapter;
- the package registry;
- a shell scripting framework;
- a general-purpose package manager;
- a replacement for Git;
- a replacement for target-native runtimes.

Commands MUST delegate domain behavior to application services.

---

# 4. Executable Name

The initial executable name is:

```bash
agent-plugins
```

Examples:

```bash
agent-plugins init
agent-plugins resolve
agent-plugins build
```

A shorter alias MAY be introduced later.

Possible aliases:

```text
ap
apl
agentp
```

Aliases are outside the V1 contract.

Documentation SHOULD use the canonical executable:

```text
agent-plugins
```

---

# 5. CLI Architecture

Recommended architecture:

```text
CLI
 │
 ├── command parsing
 ├── argument validation
 ├── interaction
 ├── formatting
 ├── progress reporting
 └── exit handling
        │
        ▼
Application Layer
 │
 ├── catalog service
 ├── resolve service
 ├── build service
 ├── install service
 ├── update service
 ├── diagnostics service
 └── configuration service
        │
        ▼
Domain
```

Command implementations SHOULD resemble:

```ts
async function run(args: Args) {
  const input = parseInput(args)

  const result = await application.resolve(input)

  return presenter.render(result)
}
```

They SHOULD NOT resemble:

```ts
async function run(args: Args) {
  // parse manifests
  // traverse dependencies
  // resolve versions
  // evaluate policy
  // modify lockfile
  // render Claude files
}
```

---

# 6. Command Model

The general syntax is:

```text
agent-plugins <command> [subcommand] [arguments] [options]
```

Examples:

```bash
agent-plugins catalog list

agent-plugins profile show frontend

agent-plugins resolve --profile frontend

agent-plugins build --target claude

agent-plugins update

agent-plugins doctor
```

Commands SHOULD use nouns for resources and verbs for actions.

---

# 7. Command Families

Recommended V1 command tree:

```text
agent-plugins
│
├── init
│
├── catalog
│   ├── list
│   ├── search
│   └── show
│
├── package
│   ├── list
│   └── show
│
├── preset
│   ├── list
│   └── show
│
├── profile
│   ├── list
│   └── show
│
├── resolve
│
├── plan
│
├── build
│
├── install
│
├── diff
│
├── validate
│
├── doctor
│
├── lock
│   ├── show
│   └── verify
│
├── update
│
├── adapter
│   ├── list
│   ├── show
│   └── capabilities
│
├── source
│   ├── list
│   ├── show
│   └── refresh
│
├── cache
│   ├── status
│   ├── clean
│   └── prune
│
├── config
│   ├── get
│   ├── set
│   └── list
│
├── completion
│
└── version
```

Not every command MUST ship in the first implementation milestone.

---

# 8. Core Workflow

The common project workflow SHOULD be:

```text
init
 ↓
inspect catalog
 ↓
select profile / preset
 ↓
resolve
 ↓
plan
 ↓
build
 ↓
diff
 ↓
install
```

For an existing project:

```text
update
 ↓
resolve
 ↓
lock
 ↓
build
 ↓
install
```

Conceptually:

```bash
agent-plugins init

agent-plugins resolve

agent-plugins plan --target claude

agent-plugins build --target claude

agent-plugins install --target claude
```

---

# 9. `init`

## Purpose

Initialize Agent Plugins configuration inside a project.

```bash
agent-plugins init
```

Interactive mode MAY ask for:

```text
Project name
Default profile
Target runtimes
Configuration location
Lockfile preference
```

Example resulting structure:

```text
.agent-plugins/
└── config.yaml

agent-plugins.lock
```

Exact repository layout is defined by `repository-structure.md`.

---

# 10. Init Safety

`init` MUST NOT overwrite existing configuration without explicit permission.

If configuration already exists:

```text
ERROR PROJECT_ALREADY_INITIALIZED
```

Possible explicit behavior:

```bash
agent-plugins init --force
```

`--force` MUST NOT silently destroy unrelated files.

---

# 11. Non-Interactive Initialization

Automation MUST be possible without prompts.

Example:

```bash
agent-plugins init \
  --profile frontend \
  --target claude \
  --target codex \
  --yes
```

Interactive questions MUST have command-line equivalents where practical.

---

# 12. `catalog`

The `catalog` command exposes the discoverable package universe.

```bash
agent-plugins catalog list
```

Possible output:

```text
ID                         TYPE       SOURCE
superpowers                plugin     first-party
typescript                 skill      first-party
ecc                        plugin     vendor
frontend-engineering       preset     first-party
```

---

# 13. `catalog search`

Search catalog metadata.

```bash
agent-plugins catalog search typescript
```

Search MAY consider:

- ID;
- name;
- description;
- tags;
- capabilities;
- provider;
- component type.

Example:

```bash
agent-plugins catalog search \
  --capability testing
```

---

# 14. `catalog show`

Inspect one catalog entry.

```bash
agent-plugins catalog show superpowers
```

Human output SHOULD include:

```text
Identity
Source
Version
Provider
Components
Capabilities
Dependencies
Compatibility
Provenance
```

Machine output:

```bash
agent-plugins catalog show superpowers --json
```

---

# 15. `package`

`package` focuses on canonical Packages rather than all catalog entities.

```bash
agent-plugins package list
agent-plugins package show superpowers
```

It SHOULD be useful when debugging dependency relationships.

---

# 16. `preset`

Inspect reusable Presets.

```bash
agent-plugins preset list

agent-plugins preset show frontend-core
```

A Preset describes reusable selections.

The CLI MUST NOT imply that Presets are runtime targets.

---

# 17. `profile`

Inspect Profiles.

```bash
agent-plugins profile list

agent-plugins profile show frontend
```

Output SHOULD explain inheritance and composition.

Example:

```text
frontend

Extends:
  engineering-base

Presets:
  web-core
  typescript
  frontend-quality

Packages:
  superpowers

Policies:
  standard
```

---

# 18. Effective Profile Inspection

The CLI SHOULD support inspecting the effective Profile after inheritance.

Example:

```bash
agent-plugins profile show frontend --resolved
```

This answers:

> What configuration does this Profile effectively represent?

It MUST NOT perform Target Adapter rendering.

---

# 19. `resolve`

`resolve` computes the effective canonical dependency graph.

```bash
agent-plugins resolve
```

With explicit Profile:

```bash
agent-plugins resolve --profile frontend
```

Resolution MUST use the rules defined by `resolution-spec.md`.

---

# 20. Resolve Output

Default output SHOULD summarize:

```text
Profile: frontend

Packages        12
Skills          34
Agents           7
Commands         5
Hooks            2

Warnings         1
Conflicts        0
```

Detailed mode:

```bash
agent-plugins resolve --verbose
```

Machine mode:

```bash
agent-plugins resolve --json
```

---

# 21. Resolution Explanation

One of the most important CLI debugging features SHOULD be:

```bash
agent-plugins resolve --explain
```

Example:

```text
skill:typescript
  selected because:
    profile:frontend
      → preset:web-core
        → plugin:typescript-suite
          → skill:typescript
```

This allows users to understand:

> Why is this component installed?

---

# 22. Explain a Specific Component

The CLI SHOULD eventually support:

```bash
agent-plugins resolve --why skill:typescript
```

Example:

```text
skill:typescript

frontend
└── web-core
    └── typescript-suite
        └── skill:typescript
```

Possible future complementary command:

```bash
agent-plugins resolve --why-not agent:foo
```

---

# 23. Resolution Must Be Pure

`resolve` SHOULD NOT modify target runtime directories.

It MAY:

- read manifests;
- read project configuration;
- read the lockfile;
- evaluate policy;
- generate an in-memory resolution;
- optionally update the lockfile when explicitly requested.

It MUST NOT implicitly install generated artifacts.

---

# 24. `plan`

`plan` computes target rendering operations without applying them.

```bash
agent-plugins plan --target claude
```

Example:

```text
Target: claude

CREATE .claude/skills/typescript/SKILL.md
CREATE .claude/agents/code-reviewer.md
UPDATE .claude/settings.json

3 operations
```

This command is central to safe operation.

---

# 25. Multi-Target Plan

```bash
agent-plugins plan \
  --target claude \
  --target codex
```

The resolver SHOULD run once.

Target adapters then independently generate Render Plans.

---

# 26. `build`

`build` renders target-native output.

```bash
agent-plugins build --target claude
```

Default output location MAY be:

```text
dist/claude/
```

depending on project configuration.

`build` SHOULD NOT install files into a target's active project location unless explicitly configured.

---

# 27. Build Multiple Targets

```bash
agent-plugins build \
  --target claude \
  --target codex \
  --target gemini
```

Architecture:

```text
Profile
   │
   ▼
Resolver
   │
   ▼
Resolved Graph
   ├── Claude Adapter → dist/claude
   ├── Codex Adapter  → dist/codex
   └── Gemini Adapter → dist/gemini
```

---

# 28. Build Reproducibility

By default, build SHOULD use the lockfile.

Conceptually:

```bash
agent-plugins build --frozen-lockfile
```

CI SHOULD use frozen mode by default.

A frozen build MUST fail if configuration and lockfile state are inconsistent.

---

# 29. `install`

`install` applies rendered output to the current project.

Example:

```bash
agent-plugins install --target claude
```

Conceptually:

```text
resolve
  ↓
policy
  ↓
lock verification
  ↓
adapter validation
  ↓
render plan
  ↓
render
  ↓
apply filesystem operations
```

---

# 30. Install Preview

Users SHOULD be able to inspect installation before mutation:

```bash
agent-plugins install --target claude --dry-run
```

Equivalent conceptual pipeline:

```text
everything except filesystem mutation
```

---

# 31. Install Confirmation

Interactive install MAY ask for confirmation when significant mutation is detected.

Example:

```text
12 files will be created
3 files will be updated
1 generated file will be removed

Proceed? [Y/n]
```

The following MUST work non-interactively:

```bash
agent-plugins install --yes
```

---

# 32. Generated File Ownership

The CLI MUST distinguish:

```text
files owned by agent-plugins
```

from:

```text
files owned by the user
```

Generated-file metadata SHOULD make ownership identifiable.

The installer MUST NOT delete or overwrite unknown user files merely because they occupy a target directory.

---

# 33. `diff`

Compare desired state against current generated state.

```bash
agent-plugins diff --target claude
```

Output MAY contain:

```text
+ create
~ update
- remove
= unchanged
```

Example:

```text
+ .claude/skills/react/SKILL.md
~ .claude/agents/reviewer.md
- .claude/commands/legacy.md
```

---

# 34. Diff Modes

Useful modes MAY include:

```bash
agent-plugins diff --summary

agent-plugins diff --content

agent-plugins diff --json
```

Default mode SHOULD avoid excessive output.

---

# 35. `validate`

Validate canonical repository and project configuration.

```bash
agent-plugins validate
```

Validation SHOULD cover:

- schemas;
- manifests;
- catalog;
- canonical IDs;
- references;
- dependency declarations;
- duplicate IDs;
- Profile inheritance;
- Preset references;
- policies;
- lockfile structure;
- adapter configuration.

---

# 36. Target Validation

Specific target validation:

```bash
agent-plugins validate --target claude
```

This additionally invokes Target Adapter compatibility checks.

It SHOULD NOT write output.

---

# 37. Strict Validation

CI MAY use:

```bash
agent-plugins validate --strict
```

Strict mode MAY convert selected warnings into errors.

The exact warning policy MUST be deterministic and documented.

---

# 38. `doctor`

`doctor` diagnoses the local environment.

```bash
agent-plugins doctor
```

It MAY inspect:

```text
CLI version
Node/runtime version
Project configuration
Lockfile state
Adapter availability
Target runtime availability
Filesystem permissions
Cache state
Schema compatibility
```

Example:

```text
✓ agent-plugins 0.1.0
✓ configuration found
✓ lockfile valid
✓ Claude adapter available
! Codex runtime not detected
✓ cache healthy
```

---

# 39. Doctor vs Validate

These commands have different responsibilities.

```text
validate
    = Is project data/configuration valid?

doctor
    = Is my environment healthy enough to operate?
```

This distinction MUST remain clear.

---

# 40. `lock`

Inspect and verify lockfile state.

```bash
agent-plugins lock show
```

Example:

```text
Lockfile version: 1

Packages: 14
Sources: 5
Targets: 2

Generated with:
  agent-plugins 0.1.0
```

---

# 41. Lock Verification

```bash
agent-plugins lock verify
```

It SHOULD detect:

- invalid schema;
- configuration drift;
- source integrity mismatch;
- unavailable locked package;
- adapter incompatibility;
- unsupported lockfile version.

---

# 42. Lockfile Mutation

Lockfile mutation SHOULD primarily occur through commands such as:

```text
resolve
update
install
```

rather than manual `lock update` operations.

A dedicated command MAY later exist:

```bash
agent-plugins lock regenerate
```

but SHOULD remain explicit.

---

# 43. `update`

`update` updates package/source selections according to `update-spec.md`.

Examples:

```bash
agent-plugins update
```

Specific package:

```bash
agent-plugins update superpowers
```

Specific source:

```bash
agent-plugins update --source community
```

---

# 44. Update Preview

Update SHOULD support:

```bash
agent-plugins update --dry-run
```

Example:

```text
superpowers
  2.1.0 → 2.2.0

ecc
  a42f01c → b391af2

No files have been changed.
```

---

# 45. Update Scope

Useful future options:

```bash
agent-plugins update --patch

agent-plugins update --minor

agent-plugins update --major
```

Exact semantics are defined by `update-spec.md`.

The CLI MUST NOT invent independent update semantics.

---

# 46. `adapter`

Inspect available adapters.

```bash
agent-plugins adapter list
```

Example:

```text
TARGET

claude      1.0.0
codex       1.0.0
gemini      0.3.0

SOURCE

local       1.0.0
git         0.5.0
```

---

# 47. Adapter Inspection

```bash
agent-plugins adapter show claude
```

Output SHOULD contain:

```text
ID
Version
Adapter API version
Type
Capabilities
Configuration
Compatibility
```

---

# 48. Adapter Capabilities

```bash
agent-plugins adapter capabilities claude
```

Example:

```text
skills                 native
agents                 native
commands               native
hooks                  native
project-instructions   native
nested-agents          unsupported
```

This is especially useful when comparing target behavior.

---

# 49. `source`

Inspect configured package sources.

```bash
agent-plugins source list
```

Possible output:

```text
first-party
vendor
community
github
```

---

# 50. Source Inspection

```bash
agent-plugins source show community
```

Output MAY include:

```text
Adapter
Location
Revision strategy
Trust level
Cache status
Last refresh
```

---

# 51. Source Refresh

```bash
agent-plugins source refresh
```

This refreshes source metadata.

It SHOULD NOT automatically update locked package selections.

Important distinction:

```text
source refresh
    = learn what exists

update
    = change selected versions/revisions
```

---

# 52. `cache`

External sources MAY use local caches.

Useful commands:

```bash
agent-plugins cache status

agent-plugins cache clean

agent-plugins cache prune
```

---

# 53. Cache Safety

`cache clean` SHOULD NOT mutate:

- canonical sources;
- project configuration;
- generated target files;
- lockfiles.

Only reproducible cache data may be removed.

---

# 54. `config`

Inspect CLI/project configuration.

Examples:

```bash
agent-plugins config list

agent-plugins config get defaultTarget

agent-plugins config set defaultTarget claude
```

Not all configuration SHOULD necessarily be writable through CLI in V1.

---

# 55. Configuration Scope

The CLI SHOULD distinguish:

```text
global
workspace
project
command
```

Possible future syntax:

```bash
agent-plugins config set \
  defaultTarget claude \
  --global
```

Project-local configuration SHOULD normally take precedence over global preferences.

---

# 56. Configuration Precedence

Recommended precedence:

```text
CLI arguments
      ↓
Environment variables
      ↓
Project configuration
      ↓
Workspace configuration
      ↓
User configuration
      ↓
Built-in defaults
```

Higher layers override lower layers.

This precedence MUST be deterministic.

---

# 57. Environment Variables

Environment variables SHOULD use a stable prefix:

```text
AGENT_PLUGINS_
```

Examples:

```text
AGENT_PLUGINS_LOG_LEVEL
AGENT_PLUGINS_CACHE_DIR
AGENT_PLUGINS_CONFIG
AGENT_PLUGINS_NO_COLOR
```

Secrets SHOULD NOT be stored in ordinary project configuration.

---

# 58. Global Options

Recommended global options:

```text
--help
--version

--config <path>

--profile <id>

--target <id>

--json

--quiet
--verbose

--no-color

--offline

--yes

--dry-run
```

Not every option applies to every command.

Commands MUST reject meaningless options rather than silently ignoring them.

---

# 59. `--json`

Structured output is required for automation.

Example:

```bash
agent-plugins resolve --json
```

JSON output MUST be valid JSON.

It MUST NOT contain:

- spinners;
- ANSI colors;
- progress text;
- banners;
- human prose before or after the JSON document.

---

# 60. Structured Output Contract

Machine-readable responses SHOULD follow a stable envelope.

Example:

```json
{
  "schemaVersion": "cli-output/v1",
  "command": "resolve",
  "success": true,
  "data": {},
  "diagnostics": []
}
```

Command-specific data belongs under:

```text
data
```

Warnings and errors SHOULD use structured diagnostics.

---

# 61. JSON Evolution

Structured CLI output MUST be treated as an API.

Breaking changes SHOULD require a schema version change.

For example:

```text
cli-output/v1
cli-output/v2
```

Human-readable output does not carry the same compatibility guarantees.

---

# 62. Quiet Mode

```bash
agent-plugins build --quiet
```

Quiet mode SHOULD suppress non-essential progress and informational output.

Errors MUST still be shown.

---

# 63. Verbose Mode

```bash
agent-plugins resolve --verbose
```

Verbose mode SHOULD expose useful operational details.

It MUST NOT reveal secrets.

A future deeper mode MAY exist:

```bash
--debug
```

Debug output SHOULD go to stderr.

---

# 64. Color

Color SHOULD be enabled for compatible interactive terminals.

Users MUST be able to disable it:

```bash
--no-color
```

The CLI SHOULD honor:

```text
NO_COLOR
```

where appropriate.

Machine output MUST never rely on color for meaning.

---

# 65. Interactive Mode

Human-facing workflows MAY use:

- selection prompts;
- confirmation prompts;
- searchable lists;
- progress indicators;
- checkboxes.

Example:

```text
Select targets:

◉ Claude
◉ Codex
○ Gemini
○ OpenCode
```

Interactive UI is presentation only.

It MUST produce the same application request that could have been produced through flags.

---

# 66. Non-Interactive Mode

The CLI MUST work completely without TTY interaction.

CI environments MUST NOT become blocked waiting for prompts.

Detection SHOULD consider:

```text
stdin/stdout TTY
CI environment
--yes
explicit non-interactive configuration
```

When required input is missing in non-interactive mode, fail clearly.

---

# 67. Prompts

Prompts MUST have:

- clear descriptions;
- safe defaults;
- explicit destructive warnings;
- keyboard-accessible interaction.

Prompt answers MUST NOT change domain semantics compared with equivalent flags.

---

# 68. Dry Run

Commands that mutate state SHOULD support:

```bash
--dry-run
```

Examples:

```bash
agent-plugins install --dry-run

agent-plugins update --dry-run

agent-plugins cache clean --dry-run
```

Dry run MUST NOT mutate persistent state.

---

# 69. Offline Mode

```bash
agent-plugins build --offline
```

Offline mode prohibits network access.

It MAY use:

- canonical local repository;
- lockfile;
- local source cache.

If required content is unavailable:

```text
ERROR OFFLINE_SOURCE_UNAVAILABLE
```

The CLI MUST NOT silently connect to the network.

---

# 70. Network Transparency

Commands SHOULD clearly distinguish network-capable operations.

Expected examples:

```text
catalog list
    normally local

resolve
    normally local when locked

build
    local

install
    local

source refresh
    network possible

update
    network possible
```

Target rendering MUST NOT require network access.

---

# 71. Progress Indicators

Long-running interactive operations MAY show progress:

```text
Resolving packages...
Fetching sources...
Validating Claude target...
Rendering artifacts...
```

Progress MUST be disabled for:

```text
--json
non-TTY output
```

and SHOULD be suppressed for:

```text
--quiet
```

---

# 72. Logging

Logs and command output are different channels.

Recommended model:

```text
stdout → requested command result
stderr → diagnostics / logs / progress
```

This allows:

```bash
agent-plugins resolve --json > result.json
```

without corrupting JSON output.

---

# 73. Diagnostics

All application errors SHOULD eventually map to structured diagnostics.

Example:

```text
AP_RESOLVE_VERSION_CONFLICT
AP_ADAPTER_UNSUPPORTED_CAPABILITY
AP_MANIFEST_INVALID
AP_LOCK_OUTDATED
AP_SOURCE_UNAVAILABLE
AP_PATH_COLLISION
```

Diagnostic codes SHOULD remain stable.

---

# 74. Human Error Format

Example:

```text
Error: Target does not support required capability.

Code:
  AP_ADAPTER_UNSUPPORTED_CAPABILITY

Target:
  codex

Component:
  hook:session-start

Suggestion:
  Remove the hook or choose a compatible target.
```

Errors SHOULD explain:

```text
what happened
where
why
what the user can do next
```

---

# 75. Exit Codes

The CLI MUST use stable exit codes.

Recommended initial contract:

```text
0   Success

1   General failure

2   Invalid CLI usage

3   Configuration error

4   Validation failure

5   Resolution failure

6   Policy rejection

7   Lockfile failure

8   Source failure

9   Adapter failure

10  Filesystem/apply failure
```

Additional specific error meaning SHOULD primarily use diagnostic codes rather than creating dozens of process exit codes.

---

# 76. Warnings

Warnings MUST NOT produce non-zero exit codes by default.

Example:

```text
WARNING AP_ADAPTER_CAPABILITY_DEGRADED
```

Strict mode MAY promote warnings:

```bash
agent-plugins validate --strict
```

---

# 77. Signal Handling

The CLI SHOULD gracefully handle:

```text
SIGINT
SIGTERM
```

When interrupted during a mutating operation, it SHOULD avoid leaving partially applied generated state whenever feasible.

---

# 78. Atomic Apply

Installation SHOULD use atomic or transaction-like filesystem behavior when practical.

Conceptually:

```text
create plan
    ↓
render temporary artifacts
    ↓
validate
    ↓
apply
```

A failed render SHOULD NOT leave half-generated target configuration.

---

# 79. Backups

The system SHOULD normally avoid modifying files it does not own.

When modifying an owned generated artifact, regeneration is preferable to ad-hoc backup creation.

For operations affecting user-managed files, explicit safeguards are required.

Automatic accumulation of:

```text
file.bak
file.bak2
file.old
```

SHOULD be avoided.

---

# 80. Idempotency

Repeated commands SHOULD be idempotent where applicable.

Example:

```bash
agent-plugins install --target claude
agent-plugins install --target claude
```

with no changed inputs SHOULD produce:

```text
No changes.
```

and not rewrite files unnecessarily.

---

# 81. Determinism

The CLI MUST preserve determinism from the underlying core.

The following:

```bash
agent-plugins build --target claude
```

with identical:

```text
configuration
catalog
lockfile
adapter version
source content
```

SHOULD generate identical artifacts.

---

# 82. Working Directory Discovery

When executed from a nested directory:

```text
repo/
├── agent-plugins.yaml
└── apps/
    └── web/
        └── src/
```

running:

```bash
cd apps/web/src
agent-plugins resolve
```

SHOULD be able to discover the project root.

Discovery MUST have deterministic boundary rules.

It SHOULD stop at:

- configuration root;
- Git repository root;
- filesystem root;

according to documented precedence.

---

# 83. Explicit Project Path

Users SHOULD be able to override discovery.

Example:

```bash
agent-plugins resolve --project /workspace/my-project
```

or equivalent project-root option.

The final option name SHOULD remain consistent across commands.

---

# 84. Monorepo Support

The CLI SHOULD be designed for future monorepo use.

Possible model:

```text
repository configuration
        │
        ├── app A profile
        ├── app B profile
        └── shared defaults
```

V1 MAY support only one project context per invocation.

The data model MUST NOT prevent future workspace support.

---

# 85. CI Mode

The CLI SHOULD automatically behave conservatively in CI.

Recommended CI characteristics:

```text
no prompts
no spinner
stable output
frozen lockfile
deterministic build
non-zero failure codes
```

Explicit configuration SHOULD override automatic detection where sensible.

---

# 86. Recommended CI Workflow

Example:

```bash
agent-plugins validate --strict

agent-plugins lock verify

agent-plugins build \
  --target claude \
  --frozen-lockfile

agent-plugins diff --check
```

Possible `--check` semantics:

```text
exit non-zero if generated state differs
```

---

# 87. `diff --check`

For CI:

```bash
agent-plugins diff --target claude --check
```

Expected behavior:

```text
0 → generated state is current

non-zero → drift exists
```

This enables repository enforcement without mutating files.

---

# 88. Completion

The CLI SHOULD provide shell completion.

```bash
agent-plugins completion bash

agent-plugins completion zsh

agent-plugins completion fish
```

Completion MAY include:

- commands;
- flags;
- Profile IDs;
- Preset IDs;
- Target Adapter IDs.

Network access SHOULD NOT be required for completion.

---

# 89. Help

Every command MUST provide:

```bash
--help
```

Examples:

```bash
agent-plugins --help

agent-plugins resolve --help

agent-plugins adapter --help
```

Help text SHOULD be concise and task-oriented.

---

# 90. Examples in Help

Important commands SHOULD include example invocations.

For example:

```text
Examples:

  agent-plugins resolve --profile frontend

  agent-plugins resolve --profile backend --json
```

Help SHOULD avoid becoming full documentation.

---

# 91. Version

```bash
agent-plugins version
```

and:

```bash
agent-plugins --version
```

SHOULD expose:

```text
CLI version
Core version
Adapter API version
```

Verbose form MAY expose runtime information.

---

# 92. Compatibility Inspection

Future versions MAY support:

```bash
agent-plugins version --verbose
```

Example:

```text
agent-plugins        1.3.0
core                 1.3.0
adapter API          1

node                 24.x

claude adapter       2.1.0
codex adapter        1.8.0
```

---

# 93. Command Aliases

V1 SHOULD avoid excessive aliases.

Preferred:

```bash
agent-plugins catalog list
```

rather than supporting many variants:

```text
ls
list
l
show-all
packages
pkg-ls
```

A small number of obvious aliases MAY exist later.

Discoverability is more important than saving a few keystrokes.

---

# 94. Resource Addressing

Commands SHOULD use canonical references when ambiguity exists.

Examples:

```text
plugin:superpowers
skill:typescript
agent:code-reviewer
preset:frontend-core
profile:frontend
```

Short IDs MAY be accepted when unambiguous.

Example:

```bash
agent-plugins catalog show superpowers
```

If ambiguous:

```text
ERROR AMBIGUOUS_REFERENCE

Matches:
  plugin:superpowers
  preset:superpowers
```

---

# 95. Target Selection

Target selection MAY come from:

```text
CLI
Project config
Profile
Default config
```

Explicit CLI target has highest precedence.

Example:

```bash
agent-plugins build --target claude
```

Multiple targets:

```bash
agent-plugins build \
  --target claude \
  --target codex
```

---

# 96. Profile Selection

Similarly:

```bash
agent-plugins resolve --profile frontend
```

If the project defines:

```yaml
defaultProfile: frontend
```

then:

```bash
agent-plugins resolve
```

uses that Profile.

The selected Profile SHOULD be visible in verbose or summary output.

---

# 97. Preset Overrides

The CLI MAY eventually support ephemeral Preset augmentation:

```bash
agent-plugins resolve \
  --profile frontend \
  --with security
```

However, V1 SHOULD avoid excessive command-level composition features.

Persistent composition belongs in project configuration.

---

# 98. CLI vs Configuration

A key principle:

```text
Configuration
    = persistent intent

CLI arguments
    = invocation-specific intent
```

For example:

```yaml
defaultProfile: frontend

targets:
  - claude
  - codex
```

should avoid requiring:

```bash
agent-plugins build \
  --profile frontend \
  --target claude \
  --target codex
```

on every invocation.

The simpler command becomes:

```bash
agent-plugins build
```

---

# 99. Mutation Boundaries

Commands can be categorized:

### Read-only

```text
catalog list
catalog search
catalog show

package list
package show

preset list
preset show

profile list
profile show

resolve

plan

diff

validate

doctor

lock show
lock verify

adapter list
adapter show
adapter capabilities

source list
source show

cache status

config get
config list
```

### Mutating

```text
init

build
install

update

source refresh

cache clean
cache prune

config set
```

The distinction SHOULD be reflected in documentation and tests.

---

# 100. Mutation Transparency

Before significant mutation, the CLI SHOULD know:

```text
what will change
where it will change
who owns those files
whether operation is reversible
```

This information originates from the application's plan rather than CLI guesses.

---

# 101. Security

The CLI MUST:

- validate all external paths;
- prevent path traversal;
- avoid arbitrary execution from package metadata;
- avoid logging secrets;
- respect Policy;
- verify source integrity when available;
- avoid silently executing hooks during discovery;
- clearly surface executable content;
- avoid unsafe automatic overwrite.

---

# 102. Remote Code

Fetching a package MUST NOT imply executing code from the package.

The following must remain separate:

```text
fetch
normalize
validate
resolve
render
execute
```

The Agent Plugins CLI itself SHOULD generally not execute package-defined runtime logic.

Execution belongs to the target runtime.

---

# 103. Telemetry

V1 SHOULD NOT require telemetry.

If telemetry is introduced later:

- it MUST be documented;
- it SHOULD be privacy-preserving;
- secrets and package content MUST NOT be collected;
- user controls MUST be explicit.

Telemetry MUST NOT affect deterministic command behavior.

---

# 104. Update Notifications

The CLI MAY tell users a new CLI version exists.

Example:

```text
A newer agent-plugins version is available.
```

This MUST NOT block normal operations.

Network checks SHOULD be disabled in:

```text
offline mode
CI where appropriate
```

and SHOULD be cacheable.

---

# 105. CLI Package Architecture

Recommended TypeScript structure:

```text
packages/
└── cli/
    ├── src/
    │   ├── commands/
    │   │   ├── init.ts
    │   │   ├── resolve.ts
    │   │   ├── plan.ts
    │   │   ├── build.ts
    │   │   ├── install.ts
    │   │   ├── update.ts
    │   │   └── ...
    │   │
    │   ├── presenters/
    │   │   ├── human/
    │   │   └── json/
    │   │
    │   ├── prompts/
    │   ├── progress/
    │   ├── errors/
    │   └── index.ts
    │
    └── test/
```

Core services SHOULD live outside `packages/cli`.

---

# 106. Core Package Boundary

Example:

```text
packages/
├── cli/
├── core/
├── resolver/
├── policy/
├── adapters/
├── catalog/
└── config/
```

or equivalent modular structure.

The exact package structure is defined by `repository-structure.md`.

The architectural rule is more important than package names:

```text
CLI → Application/Core

Core -X→ CLI
```

Core MUST NOT depend on CLI presentation libraries.

---

# 107. Presentation Layer

Human and machine output SHOULD be separate presenters.

Example:

```text
ResolveResult
     │
     ├── HumanPresenter
     │
     └── JsonPresenter
```

This avoids business logic such as:

```ts
if (args.json) ...
```

being spread throughout domain code.

---

# 108. Interactive UI Technology

If the implementation uses:

```text
TypeScript
+
oclif
+
Ink
```

recommended responsibility is:

```text
oclif
    command discovery
    argument/flag parsing
    help
    completion
    lifecycle

Ink
    optional richer interactive UI

Core packages
    all domain behavior
```

Ink MUST NOT become required for non-interactive use.

Simple commands SHOULD remain lightweight.

---

# 109. Rich Terminal Output

The CLI MAY use:

- tables;
- trees;
- badges;
- symbols;
- progress indicators;
- formatted diagnostics.

Example:

```text
frontend

├─ superpowers
│  ├─ debugging
│  └─ testing
│
├─ typescript
│  └─ strict-types
│
└─ ecc
   └─ code-review
```

Formatting MUST degrade gracefully on limited terminals.

---

# 110. Unicode

Unicode symbols MAY improve interactive UX:

```text
✓
✗
!
→
├─
└─
```

ASCII-compatible output SHOULD be possible where necessary.

Machine output MUST not depend on Unicode decorations.

---

# 111. Stable Ordering

All CLI listings SHOULD use deterministic sorting.

For example:

```text
catalog list
adapter list
profile list
```

MUST NOT depend on filesystem enumeration order.

Ordering SHOULD normally be:

```text
explicit declared order
then stable lexical order
```

depending on resource semantics.

---

# 112. Pagination

V1 local catalogs likely do not require pagination.

If remote catalogs become large, pagination MAY be introduced for interactive commands.

Machine output SHOULD allow complete deterministic retrieval where practical.

---

# 113. Search Ranking

`catalog search` MAY rank results.

Ranking MUST only affect presentation.

It MUST NOT influence resolution.

Resolver selection is based on explicit dependency semantics, not search ranking.

---

# 114. Plugin Installation UX

A future convenience workflow MAY support:

```bash
agent-plugins add plugin:superpowers
```

and:

```bash
agent-plugins remove plugin:superpowers
```

These commands would mutate persistent project intent.

However, V1 SHOULD consider whether direct manifest editing is preferable before committing to these APIs.

If implemented:

```text
add/remove
```

MUST modify configuration and then invoke the normal resolution pipeline.

They MUST NOT directly copy target files.

---

# 115. Future `add`

Potential semantics:

```bash
agent-plugins add superpowers
```

Conceptually:

```text
modify project selection
        ↓
resolve
        ↓
update lock
        ↓
show resulting plan
```

Installation remains separate unless an explicit convenience mode is introduced.

---

# 116. Future `remove`

Potential semantics:

```bash
agent-plugins remove superpowers
```

The CLI MUST show dependent impacts.

Example:

```text
Removing plugin:superpowers also removes:

  skill:debugging
  skill:testing
  agent:reviewer
```

Implicit orphan cleanup SHOULD follow resolver rules.

---

# 117. Convenience Commands

Future shorthand MAY exist:

```bash
agent-plugins sync
```

Conceptually:

```text
resolve
→ update lock if allowed
→ build
→ install
```

However, convenience commands MUST remain compositions of existing primitives.

They MUST NOT introduce new semantics.

---

# 118. `sync` Recommendation

V1 SHOULD delay `sync` until individual primitives are stable.

Users should first have clear mental models for:

```text
resolve
build
install
update
```

After those semantics stabilize, `sync` can safely orchestrate them.

---

# 119. Command Stability

Commands SHOULD be classified internally:

```text
stable
experimental
deprecated
```

Experimental commands SHOULD be clearly marked.

Breaking stable CLI syntax SHOULD follow semantic-versioning rules.

---

# 120. Deprecation

Deprecated commands SHOULD:

1. continue functioning for a defined period;
2. display a migration message;
3. point to the replacement;
4. eventually be removed only in an appropriate breaking release.

Example:

```text
`agent-plugins render` is deprecated.

Use:
  agent-plugins build
```

---

# 121. CLI API Compatibility

The CLI exposes three compatibility surfaces:

```text
1. command syntax
2. exit codes
3. structured output
```

Human formatting MAY evolve more freely.

Automation SHOULD rely on:

```text
--json
diagnostic codes
documented exit codes
```

rather than parsing human text.

---

# 122. Testing Strategy

CLI tests SHOULD include:

### Unit tests

```text
argument parsing
presenters
diagnostic formatting
configuration precedence
```

### Command tests

```text
resolve
build
install
update
```

### Integration tests

```text
CLI → core → adapter → filesystem
```

### Snapshot tests

Useful for human-readable output.

### Contract tests

Required for JSON output and exit codes.

---

# 123. CLI Fixtures

Recommended fixtures:

```text
tests/
└── fixtures/
    ├── empty-project/
    ├── basic-project/
    ├── frontend-profile/
    ├── conflict/
    ├── outdated-lock/
    ├── unsupported-target/
    └── multi-target/
```

Tests SHOULD use isolated temporary directories.

---

# 124. Golden Workflow Tests

Important full workflows SHOULD be tested.

Example:

```text
init
 ↓
resolve
 ↓
build
 ↓
install
 ↓
diff
```

Expected final result:

```text
diff = clean
```

---

# 125. Performance

Common local commands SHOULD feel immediate.

Performance priorities:

```text
catalog inspection
configuration loading
resolution
validation
incremental build
```

Network operations SHOULD expose progress separately from local computation.

---

# 126. Lazy Loading

Heavy dependencies SHOULD be loaded only by commands that need them.

For example:

```text
catalog show
```

SHOULD NOT initialize:

```text
all target adapters
interactive UI runtime
network clients
```

unless necessary.

---

# 127. Caching

CLI-level caching SHOULD remain minimal.

Domain-level source caching belongs to source infrastructure.

The CLI may display cache state but MUST NOT create a second competing cache architecture.

---

# 128. V1 Required Commands

Recommended minimum V1:

```text
agent-plugins init

agent-plugins catalog list
agent-plugins catalog show

agent-plugins profile list
agent-plugins profile show

agent-plugins resolve

agent-plugins plan

agent-plugins build

agent-plugins install

agent-plugins diff

agent-plugins validate

agent-plugins doctor

agent-plugins lock verify

agent-plugins adapter list
agent-plugins adapter show

agent-plugins version
```

---

# 129. V1.1 Commands

Recommended next phase:

```text
catalog search

update

source list
source show
source refresh

cache status
cache prune

config get
config list

completion
```

---

# 130. Later Commands

Possible later additions:

```text
add
remove
sync

why-not

graph

inspect

migrate

adapter test

source add
source remove
```

They SHOULD NOT be implemented before the domain semantics are stable.

---

# 131. Recommended Daily UX

For normal users, the happy path SHOULD eventually be very small.

Initial setup:

```bash
agent-plugins init
```

Inspect:

```bash
agent-plugins resolve
```

Preview:

```bash
agent-plugins plan
```

Apply:

```bash
agent-plugins install
```

Later:

```bash
agent-plugins update
```

Most complexity SHOULD remain available but optional.

---

# 132. Recommended Developer UX

Repository contributors MAY commonly use:

```bash
agent-plugins validate

agent-plugins resolve --explain

agent-plugins build

agent-plugins diff

agent-plugins doctor
```

Adapter developers MAY use:

```bash
agent-plugins adapter show claude

agent-plugins validate --target claude
```

---

# 133. Recommended CI UX

CI SHOULD commonly use:

```bash
agent-plugins validate --strict

agent-plugins lock verify

agent-plugins build --frozen-lockfile

agent-plugins diff --check
```

No interactive prompts are permitted in this flow.

---

# 134. Core Command Semantics

The most important distinction is:

```text
catalog
    discover what exists

profile / preset
    inspect intended composition

resolve
    determine canonical effective graph

plan
    determine target filesystem changes

build
    render target artifacts

install
    apply target artifacts

diff
    compare desired and current state

update
    change selected source versions/revisions

validate
    check correctness

doctor
    check environment health
```

These meanings SHOULD remain stable.

---

# 135. Anti-Patterns

The CLI MUST avoid:

### Fat commands

```text
500-line command handlers containing domain logic
```

### Target-specific top-level commands

Avoid:

```text
agent-plugins claude-install
agent-plugins codex-install
```

Prefer:

```text
agent-plugins install --target claude
```

### Hidden update behavior

Avoid:

```text
build automatically pulling latest packages
```

### Hidden installation

Avoid:

```text
resolve writing .claude files
```

### Human-output parsing

Automation SHOULD NOT need to scrape formatted terminal output.

### Flag explosion

Do not expose every internal resolver option as a CLI flag.

---

# 136. Target-Agnostic CLI

The command model MUST remain independent from target ecosystems.

Correct:

```bash
agent-plugins build --target claude

agent-plugins build --target codex
```

Incorrect architectural direction:

```bash
agent-plugins claude build
agent-plugins codex resolve
agent-plugins gemini install
```

because this would let target ecosystems dominate the command architecture.

Targets are parameters to operations.

They are not the primary domain hierarchy.

---

# 137. Source-Agnostic CLI

Similarly, the normal user SHOULD not need source-specific commands such as:

```text
github-install
marketplace-install
git-install
```

Instead:

```text
source adapters
```

abstract external representation.

Source-specific configuration belongs to Source Adapter configuration.

---

# 138. Explainability

The CLI SHOULD make important system decisions inspectable.

Users should be able to answer:

```text
Why is this package here?

Where did it come from?

Which profile selected it?

Which policy affected it?

Which version/revision was chosen?

Which adapter rendered it?

Why was a feature omitted?

Which files will change?
```

This is a core product requirement rather than a debugging afterthought.

---

# 139. Future `inspect`

A unified future command MAY provide:

```bash
agent-plugins inspect skill:typescript
```

Possible output:

```text
Canonical ID
Provider
Source
Version
Selected by
Capabilities
Dependencies
Policy status
Target mappings
Generated artifacts
```

This could become the primary deep-debugging interface.

---

# 140. Future `graph`

A future command MAY expose dependency graphs.

```bash
agent-plugins graph
```

Possible formats:

```bash
agent-plugins graph --format tree

agent-plugins graph --format json

agent-plugins graph --format mermaid
```

Graph visualization MUST use resolver output rather than independently reconstructing dependencies.

---

# 141. Application Service API

The CLI SHOULD ultimately depend on a stable application API resembling:

```ts
interface AgentPluginsApplication {
  init(input: InitInput): Promise<InitResult>

  catalog(input: CatalogInput): Promise<CatalogResult>

  resolve(input: ResolveInput): Promise<ResolveResult>

  plan(input: PlanInput): Promise<PlanResult>

  build(input: BuildInput): Promise<BuildResult>

  install(input: InstallInput): Promise<InstallResult>

  diff(input: DiffInput): Promise<DiffResult>

  update(input: UpdateInput): Promise<UpdateResult>

  validate(input: ValidateInput): Promise<ValidateResult>

  doctor(input: DoctorInput): Promise<DoctorResult>
}
```

This API could later be reused by:

```text
CLI
TUI
Desktop UI
Web UI
IDE extension
automation API
```

---

# 142. CLI as One Client

Architecturally:

```text
                  ┌──────── CLI
                  │
                  ├──────── TUI
Application API ──┼──────── GUI
                  │
                  ├──────── IDE
                  │
                  └──────── Automation
```

The CLI is therefore a first-class client of the platform, not the platform itself.

This is important for long-term scalability.

---

# 143. Core Invariants

The following invariants are normative.

### Invariant 1 — Thin CLI

Core domain rules MUST NOT live in command handlers.

### Invariant 2 — Explicit mutation

Read-only commands MUST NOT unexpectedly mutate project state.

### Invariant 3 — Resolution before rendering

Target operations MUST consume canonical resolved state.

### Invariant 4 — Adapter neutrality

The top-level CLI architecture MUST remain target-independent.

### Invariant 5 — Source neutrality

The CLI MUST NOT hard-code external source semantics into normal commands.

### Invariant 6 — Deterministic automation

Non-interactive execution MUST be deterministic.

### Invariant 7 — Machine-readable interface

Important commands MUST support stable structured output where automation benefits.

### Invariant 8 — No hidden networking

Network operations MUST be explicit or predictable.

### Invariant 9 — Safe apply

Filesystem mutations MUST originate from validated plans.

### Invariant 10 — Explainability

Users MUST be able to inspect important resolution and rendering decisions.

---

# 144. Reference Workflow

The complete architecture becomes:

```text
User
 │
 ▼
CLI
 │
 ▼
Configuration
 │
 ▼
Catalog
 │
 ▼
Profile / Preset
 │
 ▼
Resolver
 │
 ▼
Policy Engine
 │
 ▼
Resolved Graph
 │
 ├──────────────► Lockfile
 │
 ▼
Target Adapter
 │
 ▼
Render Plan
 │
 ▼
Rendered Artifacts
 │
 ▼
Filesystem Apply
```

External source flow:

```text
External Repository
       │
       ▼
Source Adapter
       │
       ▼
Canonical Package
       │
       ▼
Catalog
```

The CLI orchestrates these components but does not redefine their semantics.

---

# 145. Reference Command Flow

For:

```bash
agent-plugins install \
  --profile frontend \
  --target claude
```

the internal conceptual flow is:

```text
CLI

↓ parse arguments

Project Configuration

↓ load

Catalog

↓ resolve profile

Resolver

↓ produce canonical graph

Policy Engine

↓ filter / validate

Lockfile

↓ verify/update according to mode

Claude Target Adapter

↓ validate

Render Plan

↓ inspect collisions

Renderer

↓ produce artifacts

Filesystem Layer

↓ apply atomically

Install Result

↓ present

CLI
```

Every layer has a distinct responsibility.

---

# 146. Final Command Taxonomy

Recommended long-term taxonomy:

```text
DISCOVER

catalog
package
preset
profile
adapter
source


UNDERSTAND

resolve
plan
diff
inspect
graph


VERIFY

validate
doctor
lock


CHANGE

init
add
remove
update
build
install
sync


MAINTAIN

cache
config
completion
version
```

This taxonomy is conceptual.

It does not need to appear directly in command syntax.

---

# 147. Decision Summary

The CLI architecture adopts:

```text
CLI
    = orchestration + interaction + presentation

Core
    = business semantics

Resolver
    = effective environment

Policy
    = permissions and constraints

Lockfile
    = reproducible state

Source Adapter
    = external → canonical

Target Adapter
    = canonical → target-native

Filesystem Layer
    = controlled mutation
```

The recommended command lifecycle is:

```text
discover
    ↓
resolve
    ↓
plan
    ↓
build
    ↓
diff
    ↓
install
```

with:

```text
update
```

explicitly separated from:

```text
build/install
```

to preserve reproducibility.

---

# 148. Related Specifications

This specification SHOULD be read together with:

```text
domain-model.md
capability-model.md

architecture.md
repository-structure.md
source-of-truth.md

resolution-spec.md
catalog-spec.md
manifest-spec.md
lockfile-spec.md
policy-spec.md
adapter-spec.md
update-spec.md

cli-spec.md
```

Responsibility boundaries:

```text
manifest-spec
    → defines package metadata

catalog-spec
    → defines discoverability

resolution-spec
    → determines the effective canonical graph

policy-spec
    → determines what is permitted

lockfile-spec
    → records reproducible resolved state

adapter-spec
    → translates system boundaries

update-spec
    → evolves versions and revisions

cli-spec
    → exposes these capabilities to humans and automation
```

---

# 149. Recommended Implementation Direction

For the planned stack:

```text
TypeScript
+
oclif
+
Ink
```

recommended responsibility is:

```text
oclif
├── command routing
├── args / flags
├── help
├── completion
└── command lifecycle

Ink
├── init wizard
├── interactive selection
├── rich resolution explorer
└── future advanced TUI flows

Application/Core
├── catalog
├── resolver
├── policy
├── lockfile
├── update
├── adapters
└── filesystem planning
```

The most important implementation rule remains:

```text
Command
    ↓
Application Service
    ↓
Domain
```

never:

```text
Command
    ↓
business logic
    ↓
filesystem
```

This keeps the system extensible enough for a future:

```text
CLI
TUI
VS Code extension
Web UI
Desktop application
Agent/MCP interface
```

all sharing the same underlying platform.