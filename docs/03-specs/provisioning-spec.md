# Provisioning Specification — Server-Provisioned Components (MCP)

**Status:** Design note — ahead of implementation. The prose here describes intended behaviour; it is not the contract.

## Overview

This document defines how `agent-plugins` models, resolves, configures, and materializes Components that a runtime **starts as a process** rather than reads as content. The first and only such Component type in V1 is `mcp`.

It answers four questions the existing specs leave open:

```text
Where does an MCP server definition live?
How does a project supply its configuration and secrets?
What happens when a target cannot run servers?
How does Policy see a server before it is started?
```

The central claim of this specification is that MCP is **not a new kind of entity**. It is an ordinary Component that differs in *how it is materialized* and *how it is configured*. Two additions carry that difference: a `provisioning` facet on Component, and a `bindings` section in the project manifest.

Related contracts:

- [Domain model](../01-domain/domain-model.md): Component (§5), Capability (§6), Dependency (§27), Target (§36).
- [Catalog](./catalog-spec.md): curated identities and implementation mappings.
- [Manifest](./manifest-spec.md): consumer intent, overrides, target selection.
- [Resolution](../02-architecture/resolution-spec.md): selection, closure, security-sensitive components.
- [Policy](./policy-spec.md): eligibility and authorization outcomes.
- [Adapter](./adapter-spec.md): Source and Target Adapter contracts.
- [Security model](../04-security/security-model.md): execution and secret handling.
- [ADR 0015](../decisions/adr/0015-mcp-as-component.md), [ADR 0016](../decisions/adr/0016-secret-by-reference.md), [ADR 0017](../decisions/adr/0017-v1-mcp-scope.md).

---

# 1. Scope

This specification introduces:

```text
Component.provisioning        a materialization facet
Component.server              the canonical server definition
Package.spec.source.type:
  registry                    packages that carry a definition, not content
Requirement edges to
  Components                  alongside edges to Capabilities
Project.spec.bindings         per-project configuration and secret references
Target support declaration    adapter-declared, fixture-backed
```

It explicitly does **not** introduce:

```text
kind: Integration
catalog/integrations/
a second resolution graph
a CLI noun for "integration"
```

The reasoning is recorded in [ADR 0015](../decisions/adr/0015-mcp-as-component.md). In short: the strongest argument for a separate `Integration` entity — that several servers can satisfy one need, so the resolver should choose among them — is already what Capability, Capability Implementation, and cardinality do. A parallel entity would duplicate the ambiguity rules, the Policy filter, the explanation path, and the lock format rather than reuse them.

---

# 2. Two Orthogonal Axes

A Component carries two independent classifications.

`type` answers **what kind of thing is this**:

```text
skill | agent | command | hook | rule | mcp | lsp | workflow
```

`provisioning` answers **how does a target make it real**:

```text
content    files copied into the target's managed state
server     a declarative definition the runtime starts as a process
```

The axes are independent by design. Today `skill`, `agent`, and `command` are `content`; `mcp` is `server`. A future `lsp` would also be `server`, and it MUST inherit every rule in this document without amendment. That is the reason `provisioning` exists as its own field rather than being inferred from `type`.

`provisioning` defaults to `content`. A Component with `type: mcp` MUST declare `provisioning: server`; the combination `type: mcp, provisioning: content` is invalid and MUST fail validation with `INVALID_PROVISIONING`.

Per [ADR 0013](../decisions/adr/0013-component-discovery-and-typing.md) D2, Component type is discovered, not hand-written. A Source Adapter using `strategy: convention` determines `type: mcp` and `provisioning: server` from the presence of `.mcp.json` in the package tree.

---

# 3. The `server` Block

A Component with `provisioning: server` MUST carry a `server` block. The block is **target-neutral**: it describes the server as its publisher defines it, never as a particular runtime's configuration file spells it.

```yaml
server:
  transport:
    type: stdio                  # stdio | http
  command:                       # required for transport stdio
    executable: npx
    args: ["-y", "@upstash/context7-mcp@1.0.14"]
  environment:
    required:
      - name: GITHUB_TOKEN
        secret: true
        description: Fine-grained PAT with repository read scope
    optional:
      - name: GITHUB_API_URL
        secret: false
  parameters:                    # declared knobs a project may set
    database:
      type: string
      required: true
  requirements:
    executables: [node, npx]
  surface:
    tools: true
    resources: false
    prompts: false
```

Field rules:

- `transport.type` MUST be present. V1 implements `stdio` only; `http` is accepted by the schema and rejected at materialization with `TRANSPORT_UNSUPPORTED`, so a future adapter can add it without a catalog migration.
- `command.executable` and `command.args` MUST be an executable name and an argument array. A shell string MUST NOT be accepted, per [adapter-spec](./adapter-spec.md) §5.
- `command.args` SHOULD pin an immutable version. `@latest` and unpinned specifiers are subject to the same prohibition as mutable git refs in [security-model](../04-security/security-model.md) §831.
- `environment.required` declares **names only**. A value, literal or interpolated, MUST NOT appear anywhere in the catalog. See §7.
- `requirements.executables` lists host prerequisites. `ap doctor` verifies them; resolution does not, because resolution must stay machine-independent and deterministic.
- `surface` records what the server exposes. It is **not** a Capability. See §3.1.

## 3.1 `surface` is not `capabilities`

The MCP protocol calls a server's tools, resources, and prompts its "capabilities". This specification deliberately does not reuse that word: `Capability` is the central abstraction of the domain model (§6), meaning a semantic ability independent of implementation. The two senses are unrelated, and naming both `capabilities` would produce a field whose meaning depends on its nesting depth.

```text
surface      what the server exposes over the protocol   (tools, resources, prompts)
Capability   what the agent environment can do           (knowledge.library-docs)
```

`surface` is informational for humans and is consumed by Policy (a server exposing `prompts` injects instructions and MAY be held to a stricter outcome). It MUST NOT influence selection.

## 3.2 Capability mapping direction is unchanged

A server Component is mapped to Capabilities exactly like any other Component: the Capability file lists its implementations.

```yaml
# catalog/capabilities/knowledge/library-docs.yaml
kind: Capability
metadata:
  id: knowledge.library-docs
spec:
  cardinality: one
  implementations:
    - package: context7-mcp
      component: context7
```

A `provides:` field on the Component pointing back at Capabilities MUST NOT be introduced. It would express the same graph edge in two places, and the two would drift.

The payoff of this direction is that a Capability file never learns that its implementation is a server. When a second candidate appears — a skill, a different MCP, a local CLI — it is added to `implementations` and no Preset changes.

---

# 4. Registry-Sourced Packages

A first-party MCP definition has no content to fetch: the artifact is run from a package registry by the runtime, not vendored by `agent-plugins`. `Package.spec.source.type` therefore gains a value:

```yaml
kind: Package
metadata:
  id: context7-mcp
spec:
  publisher: upstash
  source:
    type: registry
    registry: npm
    package: "@upstash/context7-mcp"
    version: "1.0.14"
  targets: [claude-code]
  components:
    context7:
      type: mcp
      provisioning: server
      server:                    # see §3
```

Rules:

- `source.type: registry` means **no fetch and no sync**. `ap sync` MUST skip such Packages; there is no working tree, no content digest, and no discovery pass.
- `discovery.strategy` (ADR 0013 D1) MUST be absent. Components are declared inline, because there is nothing to discover. This is the single exception to "Components are discovered, not written", and it is admissible for the reason ADR 0013 D4 gives: the prohibition targets hand-written *mirrors of upstream facts*. Here there is no upstream inventory to mirror — the definition is the authoritative artifact.
- `version` MUST be an exact version. Ranges and dist-tags MUST be rejected.
- `ownership` follows [domain-model](../01-domain/domain-model.md) §53: `third-party` for a server someone else maintains, even though the definition is curated here. Curating a definition does not transfer maintenance.

The same Component shape is produced by the other path — an upstream `git` Package that ships `.mcp.json` — so both sources converge on one representation before resolution. That path is deferred (§14) but requires no model change.

---

# 5. Requirement Edges

Composition may name a Capability or a Component. Internally both become one edge type and one resolution pass.

```text
RequirementEdge
├── kind: capability   ref: <capability id>
└── kind: component    ref: {package, component}
```

In YAML the two stay in separate fields, so a reader never has to guess which kind an identifier is:

```yaml
kind: Preset
metadata:
  id: engineering/core
spec:
  capabilities:
    - engineering.testing.tdd
  components:
    - package: context7-mcp
      component: context7
```

A capability edge resolves through `implementations` under the existing cardinality and ambiguity rules. A component edge *is* its own selection. Both produce Selected Implementations that merge into one closure, deduplicated by `{package, component}`.

## 5.1 When to pin a Component

A Preset SHOULD name a Capability. It MAY name a Component only when no Capability for that need exists yet.

This is the deliberate relaxation of [domain-model](../01-domain/domain-model.md) §13, which says a Preset should not select publisher implementations. The relaxation buys a real property: the upgrade path is non-breaking. A pinned `context7` keeps working the day `knowledge.library-docs` gains a second implementation; the pin simply becomes the less expressive way to say the same thing.

`ap validate --strict` MUST report `PIN_WITH_CAPABILITY_AVAILABLE` when a pinned Component is an implementation of an existing Capability, naming that Capability. It is a warning, not an error: the pin is still correct, only less substitutable.

## 5.2 Project overrides

`spec.overrides` gains a `components` block, symmetric with the existing `capabilities` block ([manifest-spec](./manifest-spec.md) §31):

```yaml
overrides:
  capabilities:
    enable: [knowledge.library-docs]
    disable: []
  components:
    enable:
      - package: github-mcp
        component: github
    disable: []
```

The existing rules carry over unchanged: enabling and disabling the same reference is `CONFLICTING_OVERRIDE`; disabling something another requirement depends on fails resolution rather than producing an invalid graph.

This is the shape that a project-level "enable this MCP, disable that one" takes. It is not MCP-specific, and it lives inside `overrides` rather than in a new top-level block, because it is exactly what `overrides` already means.

---

# 6. Bindings

The catalog declares what a server **requires**. The project supplies what it **is**. That boundary is what keeps the catalog shareable and the manifest committable.

```yaml
# agent-plugins.yaml
kind: Project
spec:
  role: software-engineer
  target: claude-code
  policy: default

  bindings:
    - package: github-mcp
      component: github
      environment:
        GITHUB_TOKEN:
          from: env
          name: GH_PAT_AGENT

    - package: postgres-mcp
      component: postgres
      parameters:
        database: mealops
      environment:
        DATABASE_URL:
          from: env
          name: DATABASE_URL
```

## 6.1 Bindings are keyed by Component, not by Capability

`overrides.implementations` is keyed by Capability ID because it answers *which implementation*. `bindings` is keyed by `{package, component}` because it answers *how to configure this specific one*.

The distinction is load-bearing. Configuration does not survive substitution: the parameters of a Postgres server are meaningless to a MySQL server. Keying bindings by Capability would let an implementation override silently carry stale configuration into a different program.

The structural `{package, component}` form follows [ADR 0013](../decisions/adr/0013-component-discovery-and-typing.md) D5: `publisher/package#type:name` is a display and human-reference form, not the written form. (`manifest-spec` §36 currently shows the display form inside `overrides.implementations`; that example predates ADR 0013 and needs correcting — see §17.)

## 6.2 Parameters

`parameters` MUST match the `server.parameters` schema declared by the Component. An unknown key MUST fail with `UNKNOWN_PARAMETER` rather than being passed through, so that a typo does not silently become a no-op.

A parameter declared `required: true` with no binding MUST fail resolution with `UNBOUND_REQUIREMENT`.

## 6.3 Bindings are desired state

`bindings` belongs to the manifest, which is committed. It contains parameter values and *reference names* — never secret values (§7) — so committing it is safe and intended. Two developers on one project get the same server configuration and each supplies their own credential.

---

# 7. Secrets

This section is normative and has no exceptions.

**A secret value MUST NOT appear in the catalog, the manifest, the lockfile, or any generated artifact.** A secret is represented only by a reference:

```yaml
environment:
  GITHUB_TOKEN:
    from: env
    name: GH_PAT_AGENT
```

**The adapter materializes the reference, not the value.** A Target Adapter MUST NOT read the referenced environment variable and MUST NOT write its value anywhere. It translates the reference into the target's own indirection syntax. For Claude Code, `.mcp.json` supports `${VAR}` expansion, so the rendered output is:

```json
{ "env": { "GITHUB_TOKEN": "${GH_PAT_AGENT}" } }
```

**There is no plaintext fallback.** If a target cannot express indirection, materialization MUST fail with `SECRET_MATERIALIZATION_UNSUPPORTED`. Writing the resolved value instead is prohibited even when the user requests it, because the generated artifact is a normal project file that will be committed.

The consequence worth stating plainly: `ap sync` is never a path by which a credential enters version control.

V1 accepts `from: env` only. `from: file` and `from: command` are deferred (§14); `command` in particular is an execution vector and requires its own Policy treatment before it can be considered.

`ap doctor` checks whether a referenced variable is set in the current environment and whether `requirements.executables` are on `PATH`. It reports presence, never the value.

---

# 8. Resolution

Resolution gains no new phase and no second graph.

```text
Role / Project
   ↓
Preset expansion
   ↓
RequirementEdge[]                 capability edges and component edges, one queue
   ↓
capability edge -> select implementation (cardinality, ambiguity rules unchanged)
component edge  -> is the selection
   ↓
Selected closure                  merged, deduplicated by {package, component}
   ↓
Dependency expansion
   ↓
Policy filter
   ↓
Target support check
   ↓
Binding check
   ↓
Lock
```

## 8.1 Transitive server dependencies need no new rule

A Component may require a server Component through the ordinary dependency edge:

```yaml
components:
  browser-testing:
    requires:
      components:
        - package: playwright-mcp
          component: playwright
```

Because this is an ordinary dependency edge, [resolution-spec](../02-architecture/resolution-spec.md) §120–§121 already govern it: security-sensitive Components are visible to Policy whether selected directly or pulled in transitively, and no dependency path may bypass Policy. Reusing the edge type means that guarantee is inherited rather than reimplemented — and its existing tests keep covering it.

## 8.2 Binding check

After Policy and target support pass, resolution verifies for every selected `provisioning: server` Component that each `environment.required` entry and each required parameter has a binding. A missing binding fails at plan time:

```text
UNBOUND_REQUIREMENT
  component: github-mcp / github
  requires:  environment GITHUB_TOKEN (secret)
  required by: project -> software-engineer -> engineering/core -> engineering.review
  fix:       add a binding to agent-plugins.yaml, or disable the requirement
```

Plan time, not runtime, is the point. A missing credential must not become a server that starts and fails mid-session.

---

# 9. Policy

No new Policy machinery is required. [policy-spec](./policy-spec.md) §64 already evaluates multiple conditions and takes the strongest non-deny outcome. Server Components contribute additional conditions:

```yaml
kind: Policy
spec:
  componentTypes:
    mcp: prompt
  provisioning:
    server: prompt
  secrets:
    requiresSecret: review
```

- `componentTypes` and `provisioning` are independent gates; a Component MUST pass both. `provisioning.server` exists so that a future `lsp` is gated on arrival rather than after an incident.
- `secrets.requiresSecret` applies when a Component declares any `environment.required` entry marked `secret: true`. Handing a credential to a third-party process is a distinct decision from running that process.
- A server whose `surface.prompts` is true MAY be held to a stricter outcome, since it can inject instructions into the agent's context.

Two facts from [ADR 0013](../decisions/adr/0013-component-discovery-and-typing.md) D3 must be kept in view. First, before that ADR every discovered Component was labelled `skill`, so `mcp: deny` never blocked anything — it was an unreachable rule, not an enforced one. Second, under `strategy: convention` the executable gate must detect `.mcp.json` **on disk**, because there is no manifest key to read. Without that, a package that ships a server without declaring one passes unexamined.

---

# 10. Target Support

A target's ability to run servers is declared by its **adapter**, in code, alongside the fixtures that prove it:

```js
export const supports = {
  componentTypes: ['skill', 'agent', 'command', 'mcp'],
  provisioning: ['content', 'server'],
  transports: ['stdio'],
  features: { secretExpansion: true },
}
```

This is not a hand-written YAML descriptor, for the reason [adapter-spec](./adapter-spec.md) §7 gives: *runtime support does not imply adapter support, and every advertised mapping requires fixtures for the declared runtime range.* A YAML file claiming `provisioning: [server]` asserts something no test can check. A declaration exported by the adapter is verifiable against the adapter's own fixtures, and it cannot drift from the code that implements it.

It is also consistent with [ADR 0013](../decisions/adr/0013-component-discovery-and-typing.md) D6: `Target` is the entity name, `runtimes/` does not exist, and no new hand-authored catalog directory is introduced here.

Resolution fails when the selected closure exceeds what the target declares, with the full requirement path required by the Explainability Invariant ([domain-model](../01-domain/domain-model.md) §79):

```text
TARGET_CANNOT_MATERIALIZE
  required by: project -> software-engineer -> engineering/core -> engineering.review
  selected:    github-mcp / github   (type: mcp, provisioning: server)
  target:      codex
  reason:      adapter declares no support for provisioning "server"
  fix:         disable the capability for this target, or select a content-provisioned
               implementation
```

`ap target show claude-code` surfaces the declaration so a user can see the boundary before hitting it.

---

# 11. Materialization

The canonical `server` block is rendered by the Target Adapter. The catalog MUST NOT contain target-shaped configuration; a `claude:` or `mcpServers:` key in a catalog file is invalid.

For Claude Code, the renderer writes `.mcp.json` **inside the generated plugin artifact**. [adapter-spec](./adapter-spec.md) §7 already lists `.mcp.json` in the plugin layout, so the V1 materialization strategy (ADR 0010: a per-project generated local marketplace) needs a new renderer, not a new strategy.

Rendering rules:

- Emit only the selected closure. A server present in an upstream package but not selected MUST NOT be rendered.
- Translate environment references into `${VAR}` syntax; never resolve them (§7).
- Fail with `TRANSPORT_UNSUPPORTED` for a transport the adapter does not implement.
- Discovery, dry-run, and planning MUST NOT start a server. Materialization writes configuration; the runtime decides when to launch.

---

# 12. Lockfile

For each selected server Component the Project Lockfile records:

```text
{package, component}
type, provisioning
digest of the resolved server block
transport type
binding reference names        (names only, never values)
parameter values
policy outcome
requirement path
```

The digest makes a changed server definition visible in `ap diff` as an upstream change rather than an invisible one. Reference names are part of desired state: a project that switches `GITHUB_TOKEN` from `GH_PAT_AGENT` to another variable has changed its configuration and the lock must show it.

Values — of secrets, and of anything resolved from the environment — MUST NOT be written to the lockfile, which is committed and portable.

---

# 13. CLI

No `integration` noun is added. The concept does not exist in this domain, so a command group for it would promise an entity `ap explain` cannot explain.

The `component` group — absent from [cli-spec](./cli-spec.md) §3 today, and useful independently of MCP — provides the surface:

```bash
ap component list --type mcp
ap component show context7-mcp#mcp:context7
ap component enable github-mcp#mcp:github  # writes overrides.components.enable
ap component disable github-mcp#mcp:github
ap doctor github-mcp#mcp:github            # env references set? executables on PATH?
ap target show claude-code                 # declared support
```

Arguments use the display form of [ADR 0013](../decisions/adr/0013-component-discovery-and-typing.md) D5, not the structural form written in YAML; the publisher prefix may be omitted while the package id is unambiguous.

`ap mcp` MAY exist as an alias for `ap component list --type mcp`. An alias is a view over the domain, not a second domain.

No `ap bind` command in V1. Editing `agent-plugins.yaml` by hand is sufficient and `ap doctor` states precisely what is missing; a manifest-writing command is a surface to test that nobody needs yet.

---

# 14. V1 Scope

In scope:

```text
source.type: registry
provisioning facet, server block, surface
component requirement edges in Presets and overrides
bindings with from: env
secret-by-reference materialization and its two failure modes
Claude Code .mcp.json renderer
policy axes: provisioning, secrets.requiresSecret
component and target CLI groups
```

Deferred, with the model already able to carry them:

```text
upstream MCP discovery from git Packages shipping .mcp.json
from: file and from: command
transport: http
multi-candidate capabilities such as github | gitlab | local-git
ap bind
```

Enabling MCP at all amends the "V1 ships no hooks/MCP" decision that `policies/default.yaml` encodes and [security-model](../04-security/security-model.md) §1904 anchors. That amendment is [ADR 0017](../decisions/adr/0017-v1-mcp-scope.md), not a one-line YAML edit.

---

# 15. Diagnostics

| Code | Raised when |
|---|---|
| `INVALID_PROVISIONING` | `type: mcp` without `provisioning: server`, or an unknown provisioning value |
| `PIN_WITH_CAPABILITY_AVAILABLE` | a pinned Component already has a Capability that covers it (`--strict` warning) |
| `UNBOUND_REQUIREMENT` | a required environment reference or parameter has no binding |
| `UNKNOWN_PARAMETER` | a binding sets a parameter the Component does not declare |
| `CONFLICTING_OVERRIDE` | the same Component is both enabled and disabled |
| `TARGET_CANNOT_MATERIALIZE` | the selected closure exceeds the adapter's declared support |
| `SECRET_MATERIALIZATION_UNSUPPORTED` | a secret reference is required but the target cannot express indirection |
| `TRANSPORT_UNSUPPORTED` | the adapter does not implement the declared transport |

---

# 16. Worked Example

A project needs current library documentation and GitHub access.

```yaml
# catalog/packages/context7-mcp.yaml
kind: Package
metadata: { id: context7-mcp, name: Context7 MCP }
spec:
  publisher: upstash
  ownership: third-party
  source:
    type: registry
    registry: npm
    package: "@upstash/context7-mcp"
    version: "1.0.14"
  targets: [claude-code]
  components:
    context7:
      type: mcp
      provisioning: server
      server:
        transport: { type: stdio }
        command:
          executable: npx
          args: ["-y", "@upstash/context7-mcp@1.0.14"]
        requirements:
          executables: [node, npx]
        surface: { tools: true, resources: false, prompts: false }
```

```yaml
# catalog/capabilities/knowledge/library-docs.yaml
kind: Capability
metadata: { id: knowledge.library-docs }
spec:
  cardinality: one
  implementations:
    - package: context7-mcp
      component: context7
```

```yaml
# presets/knowledge/docs.yaml
kind: Preset
metadata: { id: knowledge/docs }
spec:
  capabilities: [knowledge.library-docs]
```

```yaml
# agent-plugins.yaml
kind: Project
spec:
  role: software-engineer
  target: claude-code
  policy: default
  presets: [knowledge/docs]
  overrides:
    components:
      enable:
        - package: github-mcp
          component: github
  bindings:
    - package: github-mcp
      component: github
      environment:
        GITHUB_TOKEN: { from: env, name: GH_PAT_AGENT }
```

Resolution selects `context7` through a Capability and `github` through a component edge, merges them into one closure, evaluates both under Policy (`mcp: prompt`; `github` additionally `secrets.requiresSecret: review`), confirms the Claude Code adapter declares `provisioning: server` and `secretExpansion`, confirms `GH_PAT_AGENT` has a binding, and renders one `.mcp.json` containing two servers — the GitHub entry carrying `"${GH_PAT_AGENT}"`, never a token.

Nothing in `knowledge/docs` records that its implementation is a server. The day a documentation *skill* becomes the better implementation of `knowledge.library-docs`, the Preset does not change.

---

# 17. Documents Requiring Update

- [`domain-model.md`](../01-domain/domain-model.md): §5 gains `provisioning`; §72 relationships; §89 vocabulary gains `Binding`, `RequirementEdge`, `Provisioning`.
- [`terminology.md`](../01-domain/terminology.md): the same three terms, and the `surface` / `Capability` distinction.
- [`catalog-spec.md`](./catalog-spec.md): `source.type: registry`; the `server` block; inline Components as the documented exception to discovery.
- [`manifest-spec.md`](./manifest-spec.md): §31 gains `overrides.components` and `spec.bindings`; §36 example corrected to the structural identity form per ADR 0013 D5.
- [`policy-spec.md`](./policy-spec.md): the `provisioning` and `secrets` axes.
- [`adapter-spec.md`](./adapter-spec.md): the `supports` declaration; the `.mcp.json` renderer; the secret-materialization prohibition.
- [`resolution-spec.md`](../02-architecture/resolution-spec.md): component requirement edges; the binding check; `TARGET_CANNOT_MATERIALIZE`.
- [`cli-spec.md`](./cli-spec.md): the `component` and `target` groups.
- [`security-model.md`](../04-security/security-model.md): §1904 scope amended by ADR 0017.

Each with its `.vi/` mirror.
