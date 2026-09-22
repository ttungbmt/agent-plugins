# Adapter Specification

**Status:** Design note — ahead of implementation. The prose here describes intended behaviour; it is not the contract.

## Overview

This document defines Source Adapter and Target Adapter contracts for `agent-plugins`.

Source Adapters normalize upstream facts into Publisher, Package, and Component inventory. Target Adapters translate validated Resolution and Lock state into managed runtime state.

This is a proposed V1 implementation contract, not documentation of an existing SDK. MUST, SHOULD, and MAY indicate required, recommended, and optional behavior. V1 requires one target, `claude-code`; other runtimes are future extensions.

Related contracts:

- [Architecture](../02-architecture/architecture.md): subsystem boundaries.
- [Source of truth](../02-architecture/source-of-truth.md): authoritative and derived state.
- [Resolution](../02-architecture/resolution-spec.md): selection and dependency closure.
- [Catalog](./catalog-spec.md): curated identities and implementation mappings.
- [Manifest](./manifest-spec.md): consumer intent and target selection.
- [Lockfile](./lockfile-spec.md): immutable references and dual locks.
- [Policy](./policy-spec.md): eligibility and authorization outcomes.

## 1. System boundaries

```text
Upstream / first-party source
          |
     Source Adapter
          |
Normalized inventory + curated Catalog + catalog.lock
          |
Profile + Presets + Project + Policy
          |
       Resolver
          |
Resolution + agent-plugins.lock
          |
     Target Adapter
          |
Managed runtime state
```

| Concern | Owner |
|---|---|
| Acquire and normalize upstream structure | Source Adapter and shared acquisition service |
| Capability meaning, mappings, priority | Curated Catalog |
| Expand Profiles/Presets; choose implementations | Resolver |
| Evaluate trust and permissions | Policy engine |
| Pin distribution inputs | `catalog.lock` workflow |
| Freeze project selections | `agent-plugins.lock` workflow |
| Render, inspect, plan, apply runtime changes | Target Adapter |
| Coordinate authorization, locks, and recovery | Application/sync service |

Adapters MUST NOT select alternative implementations, redefine Capability semantics, assign priorities, or weaken Policy. They report facts and limitations to the owning subsystem.

Consumer manifests cannot supply arbitrary adapter scripts. Dynamic third-party adapter loading is outside V1.

## 2. Adapter identity and compatibility

Every adapter MUST declare a stable ID, implementation version, contract version, and supported source formats or runtime compatibility range. Target descriptors also declare Component kinds, activation granularity, installation modes, and inspection limitations.

An adapter version change does not change canonical Package or Component identity. Changes affecting discovery or rendering MUST invalidate relevant cached results. Unsupported contract versions fail before mutation.

Source cache keys include immutable source identity, package subdirectory, adapter version, contract version, and normalized options. Target artifact keys include locked content digests, selected Component closure, transformations, adapter version, and rendering options. Include runtime version when it changes generated output.

Execution metadata belongs in derived inventory, artifacts, plans, and local receipts. Do not add machine-local adapter options to semantic Project intent. Any lockfile schema extension follows the lockfile contract.

## 3. Source Adapter contract

The following signatures describe responsibilities; they are not final exported SDK types.

```ts
interface SourceAdapter {
  descriptor: SourceAdapterDescriptor;
  discover(
    source: SourceDescriptor,
    context: SourceContext
  ): Promise<DiscoveryResult>;
}
```

`SourceContext` supplies acquisition services, bounded cache/scratch access, credential handles, cancellation, and operation mode.

- **Discovery/update:** mutable refs may be inspected, but output records the exact resolved immutable identity.
- **Locked reproduction:** retrieve the exact locked source. Missing content or integrity mismatch fails; never substitute a branch tip or newer version.

### 3.1 Normalized output

| Field group | Required meaning |
|---|---|
| Source identity | Locator, requested ref if present, immutable resolved ref, package subdirectory |
| Provenance | Adapter identity/version and origin of each extracted record |
| Packages | Canonical Package identity and extracted metadata |
| Components | Stable ID, kind, entrypoint, declared dependencies, supporting resources |
| Compatibility facts | Upstream constraints and known parsing/rendering limitations |
| Integrity | Algorithm and precisely defined subject for every available digest |
| Diagnostics | Structured failures, warnings, and inventory completeness |

Discovery may extract Publisher metadata but MUST NOT overwrite curated trust or ownership. Source-specific extensions may preserve unknown metadata; they must not silently become executable configuration.

An incomplete scan is not an authoritative empty inventory and MUST NOT trigger removal of previously discovered Components.

### 3.2 Transport and format separation

Prefer shared Git/filesystem acquisition with reusable format readers such as `claude-marketplace` and `agent-skills`. Publisher-specific readers are justified only by structural differences generic readers cannot express.

A repository may expose multiple Packages. Package subdirectory is part of source identity. Marketplace entries are references to inspect, not proof that referenced content is downloaded or trusted. Recursive references require bounded traversal, cycle detection, and separate provenance.

When multiple readers match, use explicit configuration or report ambiguity. Never choose based on filesystem traversal order.

### 3.3 Component normalization

Preserve canonical IDs such as:

```text
superpowers/superpowers#skill:test-driven-development
```

Preserve entrypoints, required supporting files, executable-bit requirements, relative references, declared dependencies, license notices, and source-specific metadata. A skill directory is more than its `SKILL.md`.

Duplicate IDs and paths that normalize to the same identity fail validation. Case collisions must be detected on supported destination filesystems. A renamed upstream file is not automatically a canonical identity migration.

Discovery MUST NOT infer authoritative Capability mappings from filenames or prose. Suggested mappings require a separate curation workflow. Parsing never executes upstream setup scripts, hooks, servers, or package-manager lifecycle scripts.

### 3.4 Source safety and reproducibility

Resolve entrypoints beneath the verified source root. Reject absolute archive entries, traversal outside that root, and ambiguous normalization. V1 rejects symbolic links in materialized payloads; upstreams requiring links need an explicit verified transformation before support can be claimed.

For filesystem sources, create a stable snapshot before hashing and parsing. A mutable path alone is not reproducible. Native Packages use the distribution identity and content evidence defined by the lockfile contract.

If overlays are supported, preserve the original snapshot and record overlay identity plus resulting content digest. An unrecorded vendor edit is not a locked source. This contract does not introduce a new overlay manifest format.

## 4. Target compatibility descriptor

The Resolver consumes normalized descriptors, never concrete Target Adapter implementations. Compatibility is evaluated per Component and dependency closure, not just by file extension.

| Result | Meaning | Selection behavior |
|---|---|---|
| Supported | Required behavior can be preserved | Eligible subject to Policy |
| Conditional | Named prerequisite or approval is missing | Ineligible until satisfied |
| Unsupported | Required behavior cannot be represented | Reject candidate |

Conditions include runtime version, OS, executable availability, hook event support, credential references, installation scope, and activation granularity.

Lossy conversion MUST NOT advertise full support. Optional requirements may be omitted only by the Resolver under its optional-requirement rules. The adapter cannot drop a selected Component and report success.

Unknown runtime behavior is a compatibility error rather than an assumption of support.

## 5. Target Adapter contract

```ts
interface TargetAdapter {
  descriptor: TargetAdapterDescriptor;
  inspect(context: TargetContext): Promise<ActualState>;
  plan(
    desired: ValidatedTargetState,
    actual: ActualState,
    context: PlanningContext
  ): Promise<MaterializationPlan>;
  apply(
    plan: MaterializationPlan,
    context: ApplyContext
  ): Promise<MaterializationResult>;
}
```

`ValidatedTargetState` supplies target, scope, validated Resolution/Project Lock, verified source snapshots, selected dependency closure, and Policy decisions. Preview may use a prospective lock; apply requires the same validated input digests.

Context supplies project identity, canonical root, runtime descriptor, prior receipt, and explicit target configuration. Default V1 scope is the current project. No implicit global installation is allowed.

### 5.1 Inspect

Inspection is read-only. Return observed registrations, enablement, content evidence, owned configuration entries, runtime version, and observational limitations.

Classify relevant state as managed, unmanaged, conflicted, or unknown. A matching display name is not ownership evidence. Missing receipts, inaccessible runtime state, and parsing failures must be visible. Unknown state MUST NOT be treated as absence and overwritten.

Registration, availability in a fresh session, and execution health are separate observations. State which can be established without executing installed content.

### 5.2 Plan

Planning is deterministic for identical validated inputs and observations. It MUST NOT install plugins, modify configuration, execute upstream content, change locks, or access the network. Acquisition precedes planning; missing verified content produces a diagnostic.

Each operation records:

- Stable operation ID, action, target, scope, and destination/registration.
- Package and Component provenance plus the reason for the change.
- Expected prior state and desired state, with applicable digests.
- Dependencies on earlier operations.
- Policy outcome, execution-sensitive effects, and rollback limitations.

Actions include create, update, remove, enable, disable, and preserve. Removal requires ownership evidence. Shared dependencies remain until no selected Component needs them.

The plan includes input digest, actual-state fingerprint, adapter version, ordered operations, and diagnostics. Plan hashes exclude timestamps and host-specific scratch paths. Machine-local destinations are validated separately.

`ap diff` and dry-run consume this plan. These are intended CLI integrations, not claims of implemented commands. Converged state produces no mutations.

### 5.3 Apply

Apply executes only a validated plan with matching scope and input fingerprints. Acquire a project/target lock, re-inspect affected state, and reject stale plans before mutation. Shared runtime registrations additionally require serialization or conflict detection at their shared scope.

The application must satisfy Policy review/prompt outcomes before affected operations run. Adapters cannot manufacture approval. Non-interactive execution fails when required authorization is absent.

Use argument arrays for subprocesses, not shell strings built from untrusted metadata. Bound timeout, cancellation, output, and retries.

## 6. Package installation versus Component activation

The active managed Component set MUST equal the selected implementation closure, including explicitly resolved dependencies. Downloading a Package does not authorize activating every Component it contains.

```text
Package A: TDD, debugging, planning
Package B: TDD

Selected:   A/debugging + A/planning + B/TDD
Suppressed: A/TDD
```

Use native Component filtering or a verified generated projection containing only the allowed closure. If neither is possible, fail with `COMPONENT_ACTIVATION_UNSUPPORTED`.

A full native installation is valid only when its entire automatically activated surface is included in the validated closure and allowed by Policy. Hidden hooks and servers count as activation, even if the selected skill never calls them explicitly.

Projection is a derived artifact. Preserve required resources, dependency links, applicable notices, and behavioral metadata. Namespace/path rewrites require defined transformations and fixture coverage. Arbitrary instruction rewriting, flattening prompts, or converting an agent to a skill is not transparent adaptation.

Supporting resources need not become independent semantic implementations, but executable resources still require inspection and Policy evaluation.

Report overlapping manual plugins as unmanaged overlap. Do not remove them or claim exclusivity across the whole runtime. Exclusivity applies to managed state; overlap that prevents a required guarantee blocks apply.

## 7. Claude Code V1 mapping

The native integration baseline uses plugin artifacts. Manifests live at `.claude-plugin/plugin.json`; content lives outside that metadata directory. Layouts include `skills/<name>/SKILL.md`, `agents/`, `commands/`, `hooks/hooks.json`, and `.mcp.json`. Native installation accepts marketplace-qualified identity and explicit scope. See the [Claude Code plugin reference](https://code.claude.com/docs/en/plugins-reference).

A local marketplace can reference plugin sources by relative paths through `.claude-plugin/marketplace.json`. Generated registries are distribution artifacts, not a second Catalog. See [Claude Code marketplace documentation](https://code.claude.com/docs/en/plugin-marketplaces).

The following are proposed `agent-plugins` requirements, not claims about native per-Component toggles:

| Canonical input | Adapter output or decision |
|---|---|
| Selected skill | Preserve directory, entrypoint, and required resources |
| Selected agent | Preserve supported agent metadata and instructions |
| Selected command | Preserve supported entrypoint and invocation semantics |
| Selected hook | Include only validated selected entries and resources |
| Selected MCP definition | Include validated server configuration with secret references |
| Rule/instruction without proven plugin mapping | Reject unless a separately tested mapping exists |
| Unknown or future native feature | Unsupported until explicitly implemented and tested |

Runtime support does not imply adapter support. Every advertised mapping requires fixtures for the declared runtime range. Hooks and servers require Policy evaluation before installation/activation. Discovery and dry-run never start them.

### 7.1 Materialization strategy

The proposed V1 strategy uses a generated local marketplace containing immutable, content-addressed plugin artifacts. Each Package projection contains its selected closure. A version-tested runtime bridge performs native installation; the adapter does not edit undocumented runtime cache databases.

1. Read verified locked snapshots and selected closure.
2. Render into staging and validate the complete activation surface.
3. Assign stable logical runtime names from canonical Package identity, with deterministic collision detection.
4. Generate marketplace and immutable plugin sources under an application-owned root.
5. Register/install through the tested native interface with explicit project scope.
6. Verify registration, enablement, and installed content evidence.
7. Commit successful receipt through the sync coordinator.

Track content generation separately from stable logical names so updates do not silently rename invocations. Installed bytes MUST match planned artifacts even when an older version is already cached. Refresh must not substitute unlocked content. If the native interface cannot establish this invariant, that runtime version/mode is unsupported.

The bridge must document and test its exact registration/install/update/remove invocations, supported runtime range, scope effects, and inspection evidence before release. A rendered marketplace alone does not satisfy this acceptance gate.

### 7.2 Names and references

Canonical IDs remain unchanged in Catalog and Lock state. Record runtime names separately in receipts alongside original Package/Component IDs.

Renaming a plugin can affect commands, agent references, server references, and embedded resource paths. Preserve names when possible. If collision handling requires renaming, validate all affected references or fail. Do not silently append suffixes and assume equivalent behavior.

### 7.3 Bundles and Presets

Community bundles can inform curation. They are not assumed native installation APIs. Here, Presets compose Capabilities, and the Resolver determines Components and Packages. Adapters receive locked selections rather than executing free-form bundle `installCommand` values.

Do not assume a native `/plugin bundle` command. Marketplace registration, package availability, installation, enablement, and runtime loading remain distinct steps.

## 8. Managed-state ownership

The proposed local receipt is `.agent-plugins/state/<target>.json` beneath the consumer project. It is derived machine-local state, not a replacement for `agent-plugins.lock`, and should not be committed as portable desired state.

Receipts record schema version, owner/project identity, target/scope, applied Project Lock digest, adapter version, runtime registrations, exact artifacts, owned files/configuration keys with last-applied values or digests, canonical-to-runtime mappings, transaction identity, and verification outcome.

For shared configuration use a three-way comparison: previous managed value, current observed value, and desired value. Preserve unrelated keys. User changes to previously managed values produce drift diagnostics rather than silent overwrites.

A missing receipt permits read-only reconstruction from locks and verifiable artifact metadata; it does not authorize deletion of similarly named content. Recovery or explicit adoption must establish ownership. Receipt claims must be checked against actual destinations/content before mutation.

Removal affects only owned registrations, configuration keys, and verified generated artifacts. Never remove upstream repositories, user-authored skills, or globally shared caches as an uninstall side effect. Cache garbage collection is a separate reachability-based operation.

Credentials MUST NOT enter portable artifacts, receipts, logs, or lockfiles. Resolve secret references at the appropriate runtime boundary.

## 9. Transaction and recovery

Filesystem writes and native runtime commands do not form one atomic transaction. The sync coordinator MUST use durable recovery records and must not promise atomic rollback where it cannot provide it.

```text
validate inputs and authorization
  -> acquire lock and recheck observations
  -> stage immutable artifacts
  -> persist pending journal and prior-state evidence
  -> execute ordered runtime changes
  -> verify required managed state
  -> atomically replace Project Lock, if changed
  -> atomically replace receipt
  -> mark journal complete
```

Journal records include old/proposed lock digests, affected owned state, completed operations, and recovery requirements. Journal, receipt, and generated artifacts stay beneath validated owned roots; recheck paths against symlink/reparse-point escapes before mutation.

Before lock replacement, failure preserves the previous Project Lock. Attempt compensation only for owned operations whose observed state still matches expected effects. If rollback is incomplete, retain the journal, report partial failure, and block unrelated sync until recovery.

An interruption after lock replacement but before receipt completion is distinguishable through the pending journal. Recovery re-inspects effects and finishes the receipt only for verified desired state; otherwise report/repair the incomplete transition. A lock digest alone is not proof of runtime success.

Timeout means unknown outcome, not proof that an operation did nothing. Re-inspect before retry. Cancellation follows the same recovery path as failure.

Failure to verify required state is failure. Optional omissions approved by the Resolver remain visible as degraded Resolution; apply cannot newly omit selected Components. Report reload/restart requirements separately and never claim an existing session has reloaded without evidence.

## 10. Diagnostics

Every diagnostic includes stable code, severity, stage, adapter, source/target identity, affected Package/Component, reason, and next action. Include dependency provenance and redact sensitive subprocess output.

| Code | Meaning |
|---|---|
| `ADAPTER_CONTRACT_UNSUPPORTED` | Adapter contract or receipt cannot be interpreted |
| `SOURCE_REF_UNAVAILABLE` | Exact source cannot be acquired |
| `SOURCE_INTEGRITY_MISMATCH` | Source bytes differ from recorded integrity |
| `SOURCE_DISCOVERY_INCOMPLETE` | Inventory is not authoritative |
| `SOURCE_PATH_UNSAFE` | Path escape or unsupported link |
| `COMPONENT_ID_COLLISION` | Duplicate normalized identity |
| `TARGET_RUNTIME_UNSUPPORTED` | Runtime outside tested support |
| `COMPONENT_ACTIVATION_UNSUPPORTED` | Exact selected closure cannot be activated |
| `TARGET_NAMESPACE_COLLISION` | Runtime names or paths collide |
| `UNMANAGED_STATE_CONFLICT` | Proposed mutation conflicts with user-owned state |
| `MANAGED_STATE_DRIFT` | Managed content differs from last-applied evidence |
| `PLAN_STALE` | Inputs or affected actual state changed |
| `TARGET_VERIFICATION_FAILED` | Required installed state cannot be established |
| `APPLY_PARTIAL_FAILURE` | Some operations took effect before failure |
| `RECOVERY_REQUIRED` | Pending transaction requires reconciliation |

Reuse existing Catalog, Resolver, Lockfile, and Policy diagnostics for their errors. Do not disguise a Policy denial as an unsupported format.

## 11. Acceptance and test contract

Use captured source fixtures and golden target artifacts for deterministic tests. Separate live runtime compatibility tests; fixture success alone does not prove installation works.

| Scenario | Required result |
|---|---|
| Same input with reordered directory listing | Same inventory and digests |
| Mutable branch moves during locked reproduction | Locked commit or explicit failure |
| Malformed source, duplicate IDs, path escapes | No authoritative partial inventory |
| Skill contains references and scripts | Required resources preserved without execution |
| Package has selected and suppressed skills | Only selected dependency closure active |
| Unselected hook/server in Package | Excluded safely or materialization rejected |
| Unrepresentable selected metadata | Compatibility failure; no silent conversion |
| Namespace rewrite affects cross-reference | Verified rewrite or explicit failure |
| Plan/diff/dry-run | No runtime/config/lock mutation or upstream execution |
| Second sync against converged state | No mutating operations |
| Manual plugin/unrelated configuration | Preserved; overlap visible |
| Managed content changes after planning | Stale-plan/drift failure before overwrite |
| Install times out after taking effect | Inspection before retry |
| Interruption at journal/lock/receipt boundaries | Recoverable state; no false success |
| Native cache contains old projection | Proven update to desired bytes or failure |
| Unsupported version/missing prerequisite | Actionable failure before mutation |
| Secret-bearing configuration | No leakage into portable artifacts or diagnostics |

V1 is complete only when a locked project can be materialized on the declared Claude Code version range, exact managed Component activation is verified, unmanaged state is preserved, repeated sync converges, and interruption recovery has been exercised. Future targets must satisfy the same contracts before being advertised.
