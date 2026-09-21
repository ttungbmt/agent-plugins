# Update Specification

**Status:** Draft  
**Version:** 0.1.0  
**Last Updated:** 2026-09-21

---

# 1. Purpose

This document defines how Agent Plugins discovers, evaluates, selects, previews, and applies updates to externally versioned or revisioned content.

The Update Engine manages changes to:

- package versions;
- source revisions;
- source metadata;
- transitive dependencies;
- integrity metadata;
- provenance;
- trust-relevant evidence;
- adapter versions where explicitly requested.

The Update Engine MUST preserve:

```text
reproducibility
+
determinism
+
policy enforcement
+
trust visibility
+
user control
```

The central rule is:

> Updating resolved dependencies is separate from rendering or installing target artifacts.

---

# 2. Core Update Model

The canonical update flow is:

```text
Current Configuration
        +
Current Lockfile
        │
        ▼
Discover Candidates
        │
        ▼
Evaluate Constraints
        │
        ▼
Fetch Candidate Metadata
        │
        ▼
Verify Provenance / Integrity
        │
        ▼
Trust Evaluation
        │
        ▼
Resolve Candidate Graph
        │
        ▼
Policy Evaluation
        │
        ▼
Compare Current vs Candidate
        │
        ▼
Update Plan
        │
        ▼
User / Automation Approval
        │
        ▼
Write New Lockfile
```

Target rendering does not occur as part of this process by default.

---

# 3. Update Is Not Install

The following operations MUST remain distinct:

```text
update
    = evolve resolved dependency state

build
    = render target-native artifacts

install
    = apply target-native artifacts
```

Therefore:

```bash
agent-plugins update
```

MUST NOT implicitly behave as:

```text
update
→ build
→ install
```

unless a future explicit convenience command such as `sync` intentionally composes those primitives.

---

# 4. Update Is Not Source Refresh

These operations are also distinct:

```text
source refresh
    = discover what is currently available

update
    = change what this project selects
```

Example:

```bash
agent-plugins source refresh
```

may discover:

```text
foo 1.2.0
foo 1.3.0
foo 2.0.0
```

while the lockfile remains:

```text
foo 1.2.0
```

until:

```bash
agent-plugins update foo
```

is explicitly performed.

---

# 5. Goals

The Update Engine MUST:

1. preserve deterministic dependency selection;
2. never silently cross configured constraints;
3. preserve exact provenance;
4. verify integrity where required;
5. expose trust changes;
6. expose policy changes;
7. expose transitive dependency changes;
8. support dry-run;
9. update the lockfile atomically;
10. support targeted updates;
11. preserve unrelated locked dependencies where practical;
12. avoid target-specific behavior;
13. avoid filesystem installation;
14. remain explainable.

---

# 6. Non-Goals

The Update Engine is not responsible for:

- installing generated artifacts;
- rendering target files;
- executing migration scripts from packages;
- running package hooks;
- choosing arbitrary newer packages outside configured constraints;
- silently changing project configuration;
- selecting a different Provider without resolver justification;
- automatically accepting new trust levels;
- automatically bypassing Policy.

---

# 7. Update Inputs

An update operation consumes:

```text
Project Configuration

Current Lockfile

Catalog

Source Configuration

Source Metadata

Resolution Rules

Policy

Trust Configuration

Update Strategy
```

Optional input MAY include:

```text
specific package
specific source
version constraint
update class
offline mode
```

---

# 8. Update Output

The Update Engine SHOULD produce:

```ts
interface UpdateResult {
  plan: UpdatePlan

  diagnostics: Diagnostic[]

  changed: boolean

  lockfile?: Lockfile
}
```

Before application, it MUST be possible to obtain only the plan.

---

# 9. Update Plan

An `UpdatePlan` describes proposed dependency-state changes.

Conceptually:

```ts
interface UpdatePlan {
  currentGraph: ResolvedEnvironment

  candidateGraph: ResolvedEnvironment

  changes: UpdateChange[]

  trustChanges: TrustChange[]

  policyChanges: PolicyImpact[]

  diagnostics: Diagnostic[]
}
```

The plan MUST be inspectable before lockfile mutation.

---

# 10. Update Change Types

Recommended change classes:

```text
added
removed
upgraded
downgraded
revision-changed
source-changed
provider-changed
metadata-changed
unchanged
```

Example:

```text
plugin:superpowers

1.4.0
→
1.5.0
```

---

# 11. Version Update

For versioned packages:

```text
1.2.0
→
1.3.0
```

the Update Engine MUST verify that the candidate satisfies:

```text
manifest constraints
project constraints
Profile constraints
Policy
source restrictions
```

---

# 12. Revision Update

Git-like sources may use immutable revisions instead of semantic versions.

Example:

```text
4f99cc1
→
8b713e4
```

The Update Engine MUST preserve the exact resulting revision in the lockfile.

---

# 13. Floating Source References

Configuration MAY reference:

```text
main
master
latest
stable
```

but the lockfile SHOULD contain an immutable resolved revision.

Example:

```yaml
source:
  requested: main
  resolved: 8b713e4
```

Updating the source re-resolves the floating reference.

---

# 14. Candidate Discovery

Candidate discovery asks:

> Which versions or revisions could replace the current locked selection?

Candidate discovery MUST respect configured source boundaries.

It MUST NOT query arbitrary package registries.

---

# 15. Candidate Sources

Candidates MAY come from:

```text
configured Git repository
configured package registry
configured vendor source
configured community catalog
local source
```

Only explicitly configured or resolver-approved sources may participate.

---

# 16. Candidate Selection

Candidate selection SHOULD be deterministic.

Given identical:

```text
available candidates
constraints
policy
trust evidence
resolver configuration
```

the same candidate MUST be selected.

---

# 17. Update Strategy

The update strategy controls which candidate changes may be considered.

Possible strategies:

```text
locked
patch
minor
major
latest-compatible
revision
```

V1 MAY implement only a subset.

---

# 18. Locked Strategy

`locked` means:

```text
do not change selected versions or revisions
```

This mode is useful for ordinary build/install operations.

---

# 19. Patch Strategy

Example:

```text
1.2.3
→
1.2.x
```

Candidates such as:

```text
1.2.4
1.2.8
```

may be considered.

But:

```text
1.3.0
```

must not.

---

# 20. Minor Strategy

Example:

```text
1.2.3
→
1.x
```

May include:

```text
1.3.0
1.7.2
```

but not:

```text
2.0.0
```

---

# 21. Major Strategy

Major update mode MAY consider any compatible available version according to project rules.

Example:

```text
1.2.3
→
2.0.0
```

Major updates SHOULD receive stronger review.

---

# 22. Default Update Strategy

The default SHOULD be conservative.

Recommended V1 behavior:

```text
respect declared dependency constraints
```

rather than:

```text
always select latest available
```

Explicit flags MAY narrow or widen update scope.

---

# 23. CLI Examples

Update all eligible packages:

```bash
agent-plugins update
```

Specific package:

```bash
agent-plugins update superpowers
```

Explicit canonical reference:

```bash
agent-plugins update plugin:superpowers
```

Dry run:

```bash
agent-plugins update --dry-run
```

---

# 24. Future Update Classes

Future CLI MAY support:

```bash
agent-plugins update --patch
agent-plugins update --minor
agent-plugins update --major
```

The CLI only expresses strategy.

Semantics belong to the Update Engine.

---

# 25. Targeted Package Update

Updating one package SHOULD minimize unrelated changes.

Example:

```bash
agent-plugins update plugin:foo
```

The Update Engine SHOULD preserve unrelated locked selections unless dependency constraints force changes.

This property is called:

```text
minimal unlock
```

---

# 26. Minimal Unlock

For a targeted update:

```text
foo
```

the engine SHOULD initially unlock:

```text
foo
+
dependencies whose existing locked versions become incompatible
```

It SHOULD NOT re-resolve the entire ecosystem unnecessarily.

---

# 27. Dependency Cascade

A targeted update MAY require transitive changes.

Example:

```text
foo 1.0
→
foo 2.0

foo 2.0 requires bar >=3
```

Current:

```text
bar 2.1
```

Therefore update plan MAY contain:

```text
foo 1.0 → 2.0
bar 2.1 → 3.2
```

The cascade MUST be visible.

---

# 28. Reverse Dependency Impact

If an update would violate another package's requirement:

```text
package A requires B < 3
package C candidate requires B >= 3
```

the operation MUST either:

```text
find a valid solution
```

or fail with a resolution conflict.

It MUST NOT silently break A.

---

# 29. Full Update

A full update may unlock all eligible dependencies.

Conceptually:

```text
current constraints
+
latest allowed candidates
→
new resolved graph
```

Even in full update mode, configured constraints remain authoritative.

---

# 30. Update and Profiles

Profiles determine desired environment composition.

Updating MUST NOT silently add packages that are not selected by:

```text
Profile
Preset
project configuration
dependencies
```

Availability alone does not imply inclusion.

---

# 31. Update and Presets

If a Preset itself is externally versioned, updating it MAY change package composition.

Such changes MUST be surfaced.

Example:

```text
preset:frontend-core

before:
  typescript
  testing

after:
  typescript
  testing
  accessibility
```

The newly introduced dependency MUST appear in the Update Plan.

---

# 32. Update and Provider Selection

If multiple providers satisfy a capability, an update MUST NOT casually switch providers.

Provider changes require resolver justification.

Example:

```text
provider:
  mattpocock
→
  first-party
```

must be reported explicitly.

---

# 33. Provider Change Classification

Provider changes SHOULD be considered higher impact than ordinary version updates.

Recommended change type:

```text
provider-changed
```

They SHOULD require explicit review unless project configuration intentionally allows automatic provider switching.

---

# 34. Update and Source Identity

An update from:

```text
github.com/org/foo
```

to:

```text
github.com/other/foo
```

is not a normal version update.

It is:

```text
source-changed
```

and MUST receive elevated scrutiny.

---

# 35. Source Changes

Source changes MUST expose:

```text
old source
new source
old publisher
new publisher
old trust
new trust
```

when available.

---

# 36. Repository Transfer

A repository ownership transfer MAY preserve the same repository name.

The Update Engine SHOULD detect trust-relevant ownership changes when source metadata supports it.

Such a change MUST NOT be treated as an ordinary revision bump.

---

# 37. Update and Provenance

Every candidate MUST have sufficient provenance before adoption.

At minimum, external candidates SHOULD identify:

```text
source
revision/version
path if applicable
```

---

# 38. Candidate Integrity

Where integrity is required, candidate content MUST be verified before it becomes the new locked state.

The new integrity digest MUST be generated only after successful verification.

---

# 39. Integrity Failure

If candidate integrity verification fails:

```text
ERROR UPDATE_INTEGRITY_FAILURE
```

The candidate MUST be rejected.

The current lockfile MUST remain unchanged.

---

# 40. Update and Trust

Every candidate MUST be evaluated under the Trust Model.

Trust evaluation SHOULD occur before final policy authorization.

Conceptually:

```text
Candidate
   ↓
Evidence
   ↓
Trust Evaluation
   ↓
Effective Trust Context
```

---

# 41. Trust Changes

Update plans MUST surface trust-relevant changes.

Examples:

```text
trusted-vendor
→
community
```

or:

```text
publisher verified
→
publisher unknown
```

---

# 42. Trust Downgrade

A trust downgrade SHOULD block the update by default under conservative policy.

Example:

```text
TRUST_DOWNGRADE

plugin:foo

trusted-vendor
→
community
```

---

# 43. Trust Upgrade

A trust upgrade MAY be displayed but MUST NOT bypass normal policy evaluation.

Example:

```text
community
→
verified-community
```

Trust changes are evidence changes, not authorization decisions.

---

# 44. New Transitive Trust

A candidate update may introduce new transitive dependencies.

Example:

```text
plugin:A
trusted-vendor

new dependency:
plugin:B
community
```

This MUST appear in trust-impact output.

---

# 45. Update and Policy

Candidate resolution MUST pass the Policy Engine before being accepted.

Pipeline:

```text
Candidate Graph
      ↓
Trust Context
      ↓
Policy Evaluation
      ↓
Allowed / Denied
```

---

# 46. Policy Rejection

If the candidate graph violates policy:

```text
ERROR UPDATE_POLICY_REJECTED
```

the update MUST fail.

Current state remains unchanged.

---

# 47. Policy Change Due to Update

A previously allowed package MAY become disallowed due to new capabilities.

Example:

```text
foo 1.2
capabilities:
  documentation
```

candidate:

```text
foo 1.3
capabilities:
  documentation
  shell-execute
```

This MUST be surfaced and evaluated.

---

# 48. Capability Diff

The Update Plan SHOULD include capability changes.

Example:

```text
plugin:foo

Capabilities added:
  shell-execute

Capabilities removed:
  none
```

This is particularly important for security-sensitive capabilities.

---

# 49. Security-Sensitive Changes

The Update Engine SHOULD highlight:

```text
new hooks
new shell execution
new network access
new filesystem write
new secret access
new process spawn
new external source
```

These changes SHOULD receive elevated severity.

---

# 50. Update Risk Classification

Update changes MAY be classified as:

```text
low
medium
high
critical
```

However, risk SHOULD remain separate from Trust.

Example:

```text
trusted-vendor update
+
new shell-execute
=
high-risk change
```

---

# 51. Risk Is Not Authorization

Risk classification is informational unless referenced by Policy.

Policy remains authoritative.

---

# 52. Update Preview

Before application, human-readable preview SHOULD include:

```text
package changes
source changes
provider changes
transitive changes
capability changes
trust changes
policy impact
```

Example:

```text
plugin:superpowers
  1.4.0 → 1.5.0

Transitive:
  skill:debugging
    updated

Capabilities:
  + structured-debugging

Trust:
  unchanged

Policy:
  allowed
```

---

# 53. Dry Run

```bash
agent-plugins update --dry-run
```

MUST perform enough work to generate a realistic Update Plan.

It MUST NOT modify:

```text
project config
lockfile
target artifacts
source-of-truth content
```

Cache writes MAY be allowed only if cache semantics explicitly permit harmless reproducible caching.

---

# 54. Dry-Run Equivalence

Given unchanged external candidate data:

```text
dry-run plan
```

and:

```text
actual update plan
```

SHOULD be equivalent.

---

# 55. Update Approval

Interactive mode MAY request confirmation after displaying the plan.

Example:

```text
3 packages will change.
1 new transitive dependency will be added.
No trust downgrade detected.

Apply update? [y/N]
```

---

# 56. Non-Interactive Update

CI and automation MUST not block on prompts.

Example:

```bash
agent-plugins update --yes
```

Still MUST obey:

```text
Policy
Trust rules
integrity
constraints
```

`--yes` is confirmation, not authorization bypass.

---

# 57. Update Application

Applying an update modifies the lockfile or other update-owned state.

It SHOULD NOT modify target runtime artifacts.

Conceptually:

```text
Validated Update Plan
      ↓
Generate Candidate Lockfile
      ↓
Validate Candidate Lockfile
      ↓
Atomic Replace
```

---

# 58. Atomic Lockfile Update

Lockfile replacement SHOULD be atomic.

Failure during writing MUST NOT leave a partially written lockfile.

Recommended strategy:

```text
serialize temporary file
↓
validate
↓
fsync where practical
↓
atomic rename
```

---

# 59. Configuration Mutation

`update` SHOULD NOT normally rewrite project configuration.

For example:

```yaml
foo: ^1.0.0
```

should remain unchanged while the lockfile moves:

```text
1.2.0
→
1.4.0
```

---

# 60. Constraint-Widening Update

If the user wants to change:

```text
^1
→
^2
```

that is a configuration change.

It MAY eventually be supported by a separate explicit command or option.

It MUST NOT happen silently during ordinary update.

---

# 61. Downgrades

Updates generally move toward newer versions, but candidate resolution MAY produce a downgrade when necessary.

Example:

```text
A update
requires older compatible B
```

Any downgrade MUST be shown explicitly.

---

# 62. Explicit Downgrade

Future CLI MAY support:

```bash
agent-plugins update foo --to 1.2.0
```

Such behavior is effectively a version-selection operation and MUST still run through normal validation.

---

# 63. Pinning

Project configuration MAY pin:

```text
exact semantic version
exact Git revision
```

Pinned dependencies MUST NOT update unless the pin itself is explicitly changed or override semantics are requested.

---

# 64. Version Ranges

If configuration uses:

```text
^1.2.0
```

the Update Engine may select any candidate allowed by that range and update strategy.

The lockfile records the exact result.

---

# 65. Update Scope

The update request MAY target:

```text
all packages
one package
multiple packages
one source
one Provider
one Profile-derived subtree
```

V1 SHOULD prioritize:

```text
all
single package
source
```

---

# 66. Source-Scoped Update

Example:

```bash
agent-plugins update --source vendor
```

Only dependencies resolved from that source SHOULD be unlocked initially.

Dependency cascades MAY affect others if required.

---

# 67. Provider-Scoped Update

Future:

```bash
agent-plugins update --provider mattpocock
```

may update packages from that Provider.

This SHOULD not be part of V1 unless needed.

---

# 68. Update Selection Stability

When several candidate versions satisfy constraints, selection MUST use stable ordering.

For semantic versions, typically:

```text
highest allowed stable version
```

unless configured otherwise.

---

# 69. Pre-Release Versions

Pre-release versions SHOULD NOT be selected by default for stable dependency constraints.

Example:

```text
2.0.0-beta.1
```

requires explicit allowance.

---

# 70. Stable vs Pre-Release

If current locked version is stable:

```text
1.5.0
```

candidate:

```text
2.0.0-beta.1
```

MUST NOT replace it under ordinary update.

---

# 71. Existing Pre-Release Dependency

If project configuration explicitly uses a pre-release line, update MAY remain within compatible pre-release versions.

Semantics SHOULD follow the versioning specification.

---

# 72. Yanked or Deprecated Versions

Source metadata MAY identify a version as:

```text
deprecated
yanked
revoked
```

The Update Engine SHOULD avoid selecting such candidates.

Security revocation MUST override normal version preference.

---

# 73. Current Version Becomes Revoked

If the currently locked revision becomes explicitly revoked:

```text
agent-plugins update
```

SHOULD surface a high-severity diagnostic.

A safe replacement may be proposed if available.

---

# 74. No Valid Candidate

If no allowed update candidate exists:

```text
No update available.
```

This is normally not an error.

---

# 75. Candidate Exists but Is Blocked

If a newer version exists but is rejected:

```text
Update available but blocked.
```

The reason SHOULD be visible:

```text
Policy
Trust
constraint
compatibility
integrity
```

---

# 76. Update Explainability

Users SHOULD be able to answer:

```text
Why was version X selected?

Why was version Y rejected?

Why did dependency Z change?

Why did trust change?

Why was update blocked?
```

---

# 77. Candidate Explanation

Future CLI MAY expose:

```bash
agent-plugins update foo --explain
```

Example:

```text
Selected 1.5.0 because:

✓ satisfies ^1.2.0
✓ allowed by policy
✓ source trust accepted
✓ stable release

Rejected 2.0.0 because:

✗ outside configured range
```

---

# 78. Update Diagnostics

Recommended diagnostic codes:

```text
UPDATE_NO_CANDIDATE

UPDATE_CONSTRAINT_REJECTED

UPDATE_RESOLUTION_CONFLICT

UPDATE_SOURCE_CHANGED

UPDATE_PROVIDER_CHANGED

UPDATE_TRUST_DOWNGRADE

UPDATE_POLICY_REJECTED

UPDATE_INTEGRITY_FAILURE

UPDATE_NEW_SENSITIVE_CAPABILITY

UPDATE_TRANSITIVE_CHANGE

UPDATE_LOCK_WRITE_FAILED
```

---

# 79. Exit Codes

CLI maps Update Engine failures to the normal CLI error model.

For example:

```text
resolution failure
→ resolver exit class

policy rejection
→ policy exit class

source failure
→ source exit class
```

Update-specific diagnostic codes SHOULD provide the precise reason.

---

# 80. Update and Lockfile

The new lockfile MUST capture:

```text
exact selected version/revision
source provenance
integrity
dependency relationships
relevant adapter metadata
```

according to `lockfile-spec.md`.

---

# 81. Lockfile Diff

Update preview SHOULD derive a semantic diff rather than showing raw lockfile text only.

Example:

```text
UPDATED
  plugin:foo
    1.2.0 → 1.4.0

ADDED
  skill:new-capability

REMOVED
  skill:legacy
```

Raw diff MAY also be available.

---

# 82. Stable Lockfile Serialization

An update MUST NOT reorder unrelated lockfile entries unnecessarily.

Stable serialization reduces noisy Git diffs.

---

# 83. Unchanged Dependencies

If an entry is unchanged, its serialized representation SHOULD remain identical where possible.

---

# 84. Lockfile Metadata

Volatile metadata such as:

```text
updatedAt
machine hostname
local path
```

SHOULD be avoided unless needed.

Otherwise every update produces unnecessary diffs.

---

# 85. Update and Adapters

Ordinary package update SHOULD NOT automatically update Target Adapters unless adapters are part of the explicit update scope.

Adapters are privileged application components and should have independent lifecycle semantics.

---

# 86. Adapter Updates

Future:

```bash
agent-plugins update --adapters
```

MAY update adapter packages.

Adapter updates MUST highlight:

```text
capability mapping changes
generated output changes
target compatibility changes
```

---

# 87. Adapter Major Updates

A major adapter update SHOULD receive elevated review because generated target structure may change significantly.

---

# 88. Core / CLI Updates

Updating the Agent Plugins CLI itself is outside the project dependency Update Engine unless explicitly integrated later.

Package dependency update and application self-update SHOULD remain separate concepts.

---

# 89. Update and Overlays

External package updates MUST preserve overlays.

Flow:

```text
New upstream candidate
      ↓
Normalize
      ↓
Apply existing overlays
      ↓
Validate
      ↓
Resolve
```

---

# 90. Overlay Compatibility

An upstream update MAY break an overlay.

Example:

```text
overlay modifies field X
```

but new upstream removed X.

This MUST produce an explicit overlay conflict.

---

# 91. Overlay Conflict

Recommended diagnostic:

```text
UPDATE_OVERLAY_CONFLICT
```

The lockfile MUST remain unchanged if required overlays cannot be applied successfully.

---

# 92. Overlay Diff

Update preview SHOULD distinguish:

```text
upstream changes
overlay changes
effective changes
```

where useful.

---

# 93. Vendor Update

A curated vendor package update SHOULD preserve upstream provenance.

Example:

```text
vendor/mattpocock

revision:
abc123 → def456
```

Local modifications SHOULD exist as overlays rather than edits to vendor content.

---

# 94. Vendor Review

Vendor update workflow MAY require stronger approval than ordinary first-party changes.

This is policy/configuration controlled.

---

# 95. First-Party Packages

First-party packages authored directly in the repository generally do not need Update Engine version resolution.

Their content changes through normal repository commits.

They may still participate in:

```text
catalog
resolver
lockfile identity
```

depending on lockfile design.

---

# 96. Local Path Sources

Local source updates MAY mean:

```text
content hash changed
```

rather than:

```text
version changed
```

V1 MAY treat local canonical sources as current repository state rather than externally updated dependencies.

---

# 97. Remote Source Refresh

Source adapters MAY cache remote metadata.

Update SHOULD refresh candidate metadata as necessary unless:

```text
offline
```

or cache policy says otherwise.

---

# 98. Offline Update

Offline update MAY only use cached candidate metadata and content.

Example:

```bash
agent-plugins update --offline
```

If no newer cached candidate exists:

```text
No cached update candidate.
```

The command MUST NOT access the network.

---

# 99. Offline Safety

Offline mode MUST never silently disable:

```text
integrity checks
policy
trust evaluation
```

It simply restricts evidence and candidates to locally available data.

---

# 100. Cached Candidate Staleness

Cached source metadata MAY include freshness information.

The CLI MAY warn:

```text
Candidate metadata is 14 days old.
```

but SHOULD NOT invent newer state.

---

# 101. Network Failure

If update requires network and source access fails:

```text
ERROR SOURCE_UNAVAILABLE
```

Current lockfile remains valid and unchanged.

---

# 102. Partial Source Failure

If updating all packages and one required source fails, the default SHOULD be:

```text
fail whole update
```

rather than committing a partially updated lockfile.

Atomic project-state changes are preferred.

---

# 103. Partial Updates

Future explicit behavior MAY support independent partial updates.

If implemented, it MUST be opt-in and produce clear semantics.

V1 SHOULD avoid this complexity.

---

# 104. Update Transaction

The update operation SHOULD behave transactionally:

```text
discover
fetch
validate
resolve
policy
plan
serialize lock
commit
```

Failure before commit leaves current project state unchanged.

---

# 105. Update Failure Recovery

Because ordinary update only changes lockfile state, recovery SHOULD be simple.

If commit fails:

```text
retain old lockfile
```

Temporary artifacts MUST be cleaned up.

---

# 106. Update and Generated Artifacts

After successful update:

```text
generated target files may now be stale
```

The CLI SHOULD inform the user.

Example:

```text
Lockfile updated.

Target artifacts may need rebuilding.

Run:
  agent-plugins build
```

---

# 107. Drift After Update

`agent-plugins diff`

SHOULD show target artifacts that differ from the newly resolved state.

This is intentional.

---

# 108. Convenience Sync

A future:

```bash
agent-plugins sync
```

MAY compose:

```text
update
→ build
→ install
```

but only as an explicit higher-level operation.

Each underlying step retains its own semantics.

---

# 109. CI Update Behavior

CI SHOULD normally verify state rather than autonomously update dependencies.

Recommended:

```text
lock verify
build --frozen-lockfile
```

rather than:

```text
update
```

during ordinary validation.

---

# 110. Automated Update Bots

Future automation MAY create update PRs.

Ideal flow:

```text
scheduled job
     ↓
update --dry-run
     ↓
apply candidate lockfile
     ↓
tests
     ↓
generate PR
```

The PR exposes the update for human review.

---

# 111. Automated Update PR Content

An update PR SHOULD include:

```text
package changes
transitive changes
trust changes
capability changes
security-sensitive changes
test result
```

---

# 112. Auto-Merge

Auto-merge policies MAY eventually allow low-risk updates.

For example:

```text
patch update
+
same source
+
same trust
+
no new capabilities
+
all tests pass
```

But this is outside V1.

---

# 113. Security Update

Security advisories MAY cause the Update Engine to prioritize a safe candidate.

However, it MUST NOT violate configured compatibility or Policy silently.

If no valid secure candidate exists, report clearly.

---

# 114. Forced Security Update

The system SHOULD NOT silently force a major update.

Instead:

```text
current version vulnerable
safe candidate requires breaking update
```

should produce an actionable diagnostic.

---

# 115. Revoked Version

If a version is explicitly revoked by trusted security metadata, the update system SHOULD strongly warn or block depending on policy.

---

# 116. Update Compatibility

Candidate compatibility MAY include:

```text
canonical schema version
core API compatibility
Adapter API compatibility
runtime requirements
target compatibility
```

A candidate incompatible with the current platform MUST be rejected.

---

# 117. Runtime Compatibility

Example:

```text
plugin foo 2.0 requires:
  Agent Plugins >= 2
```

Current:

```text
Agent Plugins 1.x
```

Candidate MUST be rejected.

---

# 118. Target Compatibility

Packages SHOULD remain target-neutral, but some capabilities may not be renderable by configured targets.

Update MAY therefore introduce target compatibility problems.

These MUST be detected before final acceptance where target configuration is known.

---

# 119. Target Compatibility Change

Example:

```text
package update adds hook capability

configured target:
  Codex

Codex adapter:
  hook unsupported
```

The Update Plan MUST surface the incompatibility.

Depending on configuration, update MAY fail.

---

# 120. Multi-Target Compatibility

For projects targeting multiple runtimes:

```text
Claude
Codex
Gemini
```

candidate graph SHOULD be checked against all required targets when project policy demands cross-target compatibility.

---

# 121. Optional Target Compatibility

A project MAY allow target-specific capability degradation.

Such behavior MUST follow `adapter-spec.md`.

The Update Engine MUST not invent new degradation semantics.

---

# 122. Update Ordering

Update changes SHOULD have stable presentation ordering.

Recommended grouping:

```text
critical security/trust changes

source/provider changes

direct package changes

transitive changes

capability changes
```

Within groups, use canonical stable ordering.

---

# 123. Human Output

Default output SHOULD prioritize meaningful change over raw dependency noise.

Example:

```text
3 direct updates
5 transitive updates
1 new capability
0 trust downgrades
```

Users MAY request detailed mode.

---

# 124. JSON Output

Machine output MUST expose structured data.

Example:

```json
{
  "schemaVersion": "cli-output/v1",
  "command": "update",
  "success": true,
  "data": {
    "changed": true,
    "changes": []
  },
  "diagnostics": []
}
```

---

# 125. Stable Machine Contract

Update JSON output is part of the CLI compatibility surface.

Automation SHOULD NOT parse formatted human output.

---

# 126. Update History

The primary history mechanism SHOULD remain:

```text
Git
+
lockfile commits
```

Agent Plugins does not need a separate update-history database in V1.

---

# 127. Auditability

A lockfile Git diff SHOULD allow maintainers to determine:

```text
what changed
where it came from
which revision was selected
```

Trust/capability summary can supplement this.

---

# 128. Update Metadata

The lockfile SHOULD avoid storing ephemeral update-process metadata such as:

```text
person who ran update
CLI invocation
interactive choice history
```

unless required for reproducibility.

Those belong to source control history or CI metadata.

---

# 129. Update Policies

Update-specific organizational constraints SHOULD preferably be expressed through Policy or configuration.

Examples:

```text
deny major updates automatically

require trusted-vendor

deny new executable capabilities
```

Avoid scattered one-off CLI flags.

---

# 130. Update Configuration

Project configuration MAY eventually define:

```yaml
update:
  strategy: minor

  allowPrerelease: false

  requireSameSource: true
```

Exact schema belongs in `configuration-spec.md`.

---

# 131. Source Update Policy

Example:

```yaml
update:
  sourceChange: deny
```

This prevents automatic replacement of package source identity.

---

# 132. Provider Update Policy

Example:

```yaml
update:
  providerChange: require-approval
```

Provider switching is not treated as a routine patch.

---

# 133. Sensitive Capability Policy

Example:

```yaml
update:
  newSensitiveCapabilities: deny
```

Again, actual authorization SHOULD integrate with Policy.

---

# 134. Update Constraint Precedence

Recommended precedence:

```text
explicit CLI scope
      ↓
project update config
      ↓
dependency constraints
      ↓
Policy
      ↓
trust requirements
      ↓
source availability
```

Policy and security constraints cannot be bypassed by a broader CLI update request.

---

# 135. `--major` Does Not Override Policy

Example:

```bash
agent-plugins update foo --major
```

means:

```text
consider major candidates
```

not:

```text
ignore policy and trust restrictions
```

---

# 136. `--yes` Does Not Override Trust

Likewise:

```bash
--yes
```

only suppresses confirmation.

It MUST NOT suppress trust downgrade diagnostics or policy rejection.

---

# 137. Update Locks

If multiple processes attempt to update the same lockfile concurrently, the system SHOULD prevent races.

Possible strategy:

```text
filesystem lock
optimistic content hash
```

Implementation detail may vary.

---

# 138. Optimistic Lockfile Concurrency

Before replacing the lockfile, the engine MAY verify:

```text
current lockfile hash
==
hash observed at operation start
```

If not:

```text
ERROR UPDATE_CONCURRENT_MODIFICATION
```

---

# 139. Version Control Conflicts

Git merge conflicts in lockfiles MUST NOT be silently resolved by update tooling unless a deterministic regeneration path is explicitly requested.

---

# 140. Lockfile Regeneration

A future:

```bash
agent-plugins lock regenerate
```

may resolve from project configuration.

This is distinct from targeted update because it may select an entirely new compatible graph.

---

# 141. Update vs Regeneration

```text
update
    = evolve existing locked state

regenerate
    = solve from configuration with reduced regard for prior locked choices
```

This distinction matters for minimal churn.

---

# 142. Determinism

Given identical:

```text
current lockfile
source metadata
candidate content
configuration
policy
trust rules
Update strategy
```

the Update Plan MUST be identical.

---

# 143. Time Dependence

Current time SHOULD NOT influence version selection except where explicit expiration or advisory validity semantics require it.

Such dependencies MUST be modeled explicitly.

---

# 144. Search Popularity

Update selection MUST NOT depend on:

```text
GitHub stars
download count
search ranking
community popularity
```

unless a future explicit provider-selection policy specifies such metadata.

---

# 145. Network Response Order

Candidate selection MUST NOT depend on nondeterministic network response order.

Results must be normalized and sorted deterministically.

---

# 146. Update Engine API

Conceptually:

```ts
interface UpdateEngine {
  plan(
    input: UpdateInput
  ): Promise<UpdatePlan>

  apply(
    plan: UpdatePlan
  ): Promise<UpdateResult>
}
```

Discovery MAY be delegated to Source Adapters.

---

# 147. Update Input

Conceptually:

```ts
interface UpdateInput {
  config: ProjectConfiguration

  lockfile: Lockfile

  scope: UpdateScope

  strategy: UpdateStrategy

  offline: boolean
}
```

---

# 148. Update Scope

Conceptually:

```ts
type UpdateScope =
  | { type: "all" }
  | { type: "package"; id: CanonicalReference }
  | { type: "source"; id: SourceId }
```

Additional scopes MAY be added later.

---

# 149. Update Candidate

Conceptually:

```ts
interface UpdateCandidate {
  package: CanonicalReference

  current?: ResolvedPackage

  candidate: PackageDescriptor

  source: SourceReference

  provenance: Provenance

  integrity?: Integrity

  trust?: TrustContext
}
```

---

# 150. Update Change

Conceptually:

```ts
interface UpdateChange {
  subject: CanonicalReference

  kind:
    | "added"
    | "removed"
    | "upgraded"
    | "downgraded"
    | "revision-changed"
    | "source-changed"
    | "provider-changed"

  before?: ResolvedPackage

  after?: ResolvedPackage
}
```

---

# 151. Update Planning Purity

Planning SHOULD avoid persistent mutation.

It MAY:

```text
query sources
use cache
fetch candidate artifacts
verify candidates
```

but MUST NOT commit project state.

---

# 152. Source Adapter Responsibility

Source Adapters answer:

```text
What candidates exist?

How do I fetch this candidate?

What immutable identity does it have?

Does fetched content match expected evidence?
```

The Update Engine decides:

```text
Should this candidate replace current locked state?
```

---

# 153. Resolver Responsibility

The Update Engine MUST use the same resolver used by ordinary project resolution.

It MUST NOT implement an independent dependency solver.

---

# 154. Policy Responsibility

The Update Engine MUST use the same Policy Engine as ordinary resolution/install flows.

There MUST NOT be a weaker "update policy."

---

# 155. Trust Responsibility

The Update Engine consumes trust evaluation.

It SHOULD NOT create an independent trust hierarchy.

---

# 156. Lockfile Responsibility

The Lockfile module owns:

```text
serialization
schema
validation
atomic persistence contract
```

The Update Engine supplies the new resolved state.

---

# 157. CLI Responsibility

The CLI owns:

```text
arguments
interactive confirmation
presentation
exit handling
```

It MUST NOT implement update selection rules directly.

---

# 158. Testing Requirements

Update Engine tests MUST include:

```text
no update available

single package patch

single package minor

dependency cascade

resolution conflict

source change

provider change

trust downgrade

new transitive dependency

new sensitive capability

Policy rejection

integrity failure

dry run

atomic lock update

minimal unlock
```

---

# 159. Determinism Tests

The same candidate set in different enumeration orders MUST produce identical Update Plans.

---

# 160. Update Security Tests

Security regression tests SHOULD include:

```text
malicious candidate source

integrity mismatch

source namespace substitution

trust self-escalation

new executable hook

overlay bypass attempt

Policy bypass attempt
```

---

# 161. Update E2E Test

Core scenario:

```text
Given
  locked foo 1.0

And
  source contains foo 1.1

When
  update --dry-run

Then
  plan shows foo 1.0 → 1.1
  lockfile unchanged

When
  update

Then
  lockfile contains 1.1
  target artifacts unchanged

When
  build/install

Then
  target artifacts update
```

This separation MUST be tested explicitly.

---

# 162. Transitive Update E2E

Example:

```text
foo 1.0
└── bar 1

foo 2.0
└── bar 2
```

Updating foo should clearly expose bar's transition.

---

# 163. Trust Change E2E

Example:

```text
foo 1.0
trusted-vendor
```

candidate:

```text
foo 1.1
source changed
community
```

Expected:

```text
trust downgrade surfaced
Policy blocks update
lockfile unchanged
```

---

# 164. Overlay Update E2E

Example:

```text
vendor package
+
local overlay
```

Update upstream.

Expected:

```text
overlay reapplied
effective package validated
```

or:

```text
explicit overlay conflict
lockfile unchanged
```

---

# 165. Performance

Update performance SHOULD prioritize:

```text
minimal remote requests
metadata caching
minimal unlock
parallel candidate metadata fetch
```

without sacrificing determinism.

---

# 166. Parallel Discovery

Candidate metadata MAY be fetched concurrently.

Final evaluation MUST normalize results before deterministic selection.

---

# 167. Cache

Source metadata and fetched artifacts MAY be cached.

Cache MUST NOT alter semantic selection.

A cache hit and cache miss should produce equivalent Update Plans.

---

# 168. Update Resource Limits

External candidate discovery SHOULD respect source/security resource limits.

Examples:

```text
maximum versions inspected
maximum archive size
maximum metadata size
```

---

# 169. V1 Scope

V1 SHOULD support:

```text
full update

single-package update

source-scoped update

dry run

minimal unlock

semantic version updates

Git revision updates

trust diff

Policy evaluation

integrity verification

atomic lockfile update
```

---

# 170. Deferred Features

V1 SHOULD defer:

```text
automatic update scheduling

automatic update PR generation

auto-merge

provider auto-switching

complex update policies

interactive dependency solver

AI update recommendations

remote update service
```

---

# 171. Recommended Initial CLI

V1:

```bash
agent-plugins update

agent-plugins update <package>

agent-plugins update --source <source>

agent-plugins update --dry-run

agent-plugins update --yes
```

Later:

```bash
--patch
--minor
--major
--to
--explain
```

---

# 172. Update Invariants

The following are normative.

## Invariant 1 — Update does not install

Updating dependencies MUST NOT mutate target-native artifacts.

## Invariant 2 — Current state remains valid on failure

Failed updates MUST NOT partially replace locked state.

## Invariant 3 — Policy remains authoritative

Update MUST NOT bypass Policy.

## Invariant 4 — Trust changes remain visible

Trust-relevant candidate changes MUST NOT be hidden.

## Invariant 5 — Provenance is preserved

Every new external locked state MUST retain exact provenance.

## Invariant 6 — Integrity is verified

Where integrity is required, candidate integrity MUST be verified before commit.

## Invariant 7 — Minimal update scope

Targeted updates SHOULD avoid unnecessary unrelated dependency changes.

## Invariant 8 — Configuration is not silently widened

Ordinary update MUST NOT rewrite dependency constraints to accept newer versions.

## Invariant 9 — Resolver semantics are shared

Update MUST use the canonical Resolver.

## Invariant 10 — Deterministic selection

Identical update inputs MUST produce identical plans.

---

# 173. Reference Architecture

```text
                 Source Adapters
                       │
                       ▼
               Candidate Metadata
                       │
                       ▼
┌─────────────────────────────────────────┐
│              Update Engine              │
│                                         │
│  Candidate Discovery                    │
│        ↓                                │
│  Constraint Evaluation                  │
│        ↓                                │
│  Integrity / Provenance                 │
│        ↓                                │
│  Trust Evaluation                       │
│        ↓                                │
│  Resolver                               │
│        ↓                                │
│  Policy                                 │
│        ↓                                │
│  Update Diff                            │
└───────────────────┬─────────────────────┘
                    │
                    ▼
               Update Plan
                    │
                    ▼
                 Approval
                    │
                    ▼
             New Lockfile
```

Afterwards, independently:

```text
New Lockfile
    ↓
build
    ↓
Target Adapter
    ↓
install
```

---

# 174. Responsibility Boundaries

```text
Source Adapter
    → discovers and fetches candidates

Trust Model
    → evaluates confidence/evidence

Resolver
    → computes valid dependency graph

Policy Engine
    → determines whether graph is permitted

Update Engine
    → compares old and candidate resolved states

Lockfile
    → persists exact reproducible state

Target Adapter
    → renders updated state later

CLI
    → presents and orchestrates
```

---

# 175. Relationship to Source Spec

`source-spec.md` defines:

```text
how candidates are discovered and fetched
```

`update-spec.md` defines:

```text
how candidates are evaluated against current locked state
```

---

# 176. Relationship to Resolution Spec

`resolution-spec.md` determines:

```text
whether the candidate dependency graph is valid
```

The Update Engine MUST NOT duplicate resolver behavior.

---

# 177. Relationship to Lockfile Spec

`lockfile-spec.md` defines:

```text
how the selected update state becomes reproducible
```

The Update Engine determines when a new lockfile should replace the current one.

---

# 178. Relationship to Trust Model

`trust-model.md` defines:

```text
trust levels
evidence
trust derivation
trust downgrade
```

The Update Engine exposes trust changes but does not redefine trust.

---

# 179. Relationship to Policy Spec

`policy-spec.md` decides:

```text
whether the candidate graph may be accepted
```

A newer version is irrelevant if Policy rejects it.

---

# 180. Relationship to Security Model

`security-model.md` defines update-related threats such as:

```text
supply-chain compromise
source substitution
integrity mismatch
publisher compromise
new executable capabilities
```

`update-spec.md` defines where those risks are surfaced in the update flow.

---

# 181. Relationship to Overlay Spec

`overlay-spec.md` defines how local semantic modifications are applied.

Update MUST reapply existing overlays against the new upstream candidate before acceptance.

---

# 182. Relationship to Adapter Spec

Target Adapter compatibility MAY be validated during update planning.

However, adapters do not select update versions.

---

# 183. Relationship to CLI Spec

`cli-spec.md` exposes:

```text
update
update --dry-run
update <package>
```

but actual update semantics are defined here.

---

# 184. Recommended Implementation Order

Implement the Update Engine after:

```text
Source Model
Resolver
Policy
Trust
Lockfile
Overlay
```

Minimum sequence:

```text
1. UpdatePlan model

2. Candidate discovery abstraction

3. Semantic version candidate selection

4. Git revision candidate selection

5. Minimal unlock

6. Re-resolution

7. Trust comparison

8. Policy evaluation

9. Semantic diff

10. Atomic lockfile write

11. CLI update command

12. E2E tests
```

---

# 185. Final Decision Summary

The update architecture adopts:

```text
Update
    = controlled evolution of locked canonical state
```

not:

```text
Update
    = fetch latest and overwrite everything
```

The canonical process is:

```text
discover
→ verify
→ resolve
→ trust
→ policy
→ diff
→ approve
→ lock
```

and explicitly stops before:

```text
build
→ install
```

The most important invariant is:

> An update may change what the project is locked to, but it must never silently change what is installed, what is trusted, or what is permitted.