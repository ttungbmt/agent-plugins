# Release Process

**Status:** Draft  
**Version:** 0.1.0  
**Last Updated:** 2026-09-21

---

# 1. Purpose

This document defines the release process for the Agent Plugins project.

The release process governs how changes move from:

```text
development
    ↓
validation
    ↓
versioning
    ↓
release candidate
    ↓
publication
    ↓
verification
```

The process applies to releaseable artifacts such as:

- CLI packages;
- core libraries;
- adapter packages;
- schema packages;
- published manifests or registries;
- release archives;
- future plugins or SDKs.

The primary goals are:

```text
reproducibility
+
traceability
+
security
+
compatibility
+
safe rollback
```

---

# 2. Release Principles

The project follows these release principles:

1. **Main must remain releasable**
2. **No release without passing quality gates**
3. **Version changes are explicit**
4. **Breaking changes require migration guidance**
5. **Release artifacts are built in CI**
6. **Published artifacts are immutable**
7. **The source commit is traceable from every release**
8. **Release automation must not bypass security controls**
9. **Release state must be reproducible**
10. **Adapters may version independently**
11. **Schema and lockfile compatibility are release concerns**
12. **Release rollback must be planned before release**

---

# 3. Release Model

Recommended model:

```text
Feature Branch
      ↓
Pull Request
      ↓
main
      ↓
Release Preparation
      ↓
Release Candidate
      ↓
Stable Release
```

The project SHOULD avoid maintaining long-lived release branches unless required later.

`main` SHOULD represent the next releasable state.

---

# 4. Release Channels

The project MAY support the following channels:

```text
dev
canary
beta
rc
stable
```

Recommended initial scope:

```text
stable
rc
```

Other channels SHOULD be introduced only when there is a clear need.

---

# 5. Stable Releases

Stable releases use standard semantic versions:

```text
1.0.0
1.1.0
1.1.1
2.0.0
```

Stable releases indicate that the version has passed all required release gates.

---

# 6. Release Candidates

Release candidates SHOULD use:

```text
1.0.0-rc.1
1.0.0-rc.2
```

Release candidates are intended for:

```text
final compatibility validation
cross-platform testing
real-world usage
migration verification
```

RC releases SHOULD be built through the same pipeline as stable releases.

---

# 7. Beta Releases

Future beta releases MAY use:

```text
1.2.0-beta.1
```

Beta indicates that the feature set is mostly complete but may still change.

Beta releases SHOULD NOT imply API stability.

---

# 8. Canary Releases

Canary builds MAY eventually be generated from `main`.

Example:

```text
1.3.0-canary.<commit>
```

Canary releases are useful for:

```text
adapter testing
integration testing
early validation
```

They MUST NOT replace release candidates.

---

# 9. Semantic Versioning

The project SHOULD follow Semantic Versioning.

```text
MAJOR.MINOR.PATCH
```

Interpretation:

```text
MAJOR
    breaking compatibility change

MINOR
    backward-compatible feature

PATCH
    backward-compatible fix
```

Detailed rules belong in:

```text
versioning-spec.md
```

---

# 10. Versioned Surfaces

Different compatibility surfaces may require independent version tracking.

Examples:

```text
CLI version

Core version

Manifest schema version

Lockfile version

Adapter API version

Individual adapter version

CLI JSON schema version

Registry API version
```

These versions MUST NOT be assumed to evolve together.

---

# 11. Package Versioning Strategy

If the repository becomes a monorepo with multiple published packages, packages SHOULD use independent versioning unless strong coupling requires fixed versions.

Example:

```text
@agent-plugins/core            1.4.0
@agent-plugins/adapter-kit     1.2.0
@agent-plugins/adapter-claude  2.0.1
@agent-plugins/cli             1.6.0
```

Independent versioning reduces unnecessary releases.

---

# 12. Fixed Version Groups

Some packages MAY be versioned together.

Possible examples:

```text
core
catalog
resolver
policy
```

if their public APIs are tightly coupled.

Fixed groups SHOULD be explicit in release configuration.

---

# 13. Adapter Versioning

Adapters SHOULD version independently.

Example:

```text
Claude Adapter  2.3.0
Codex Adapter   1.4.1
```

An adapter release MUST document changes to:

```text
capability support
output structure
target compatibility
mapping behavior
```

---

# 14. Adapter API Version

Adapter implementation version is separate from Adapter API version.

Example:

```yaml
version: 2.3.0
adapterApiVersion: 1
```

Changing adapter implementation MAY NOT require changing Adapter API version.

Breaking the adapter contract DOES.

---

# 15. Schema Versioning

Schemas SHOULD carry their own explicit versions.

Example:

```text
manifest/v1
lockfile/v1
cli-output/v1
```

Schema version changes MUST be reviewed independently from package semantic versions.

---

# 16. Breaking Schema Changes

A breaking schema change MUST include:

```text
new schema version
migration strategy
compatibility statement
tests
documentation
```

Example:

```text
manifest/v1
→
manifest/v2
```

The CLI SHOULD provide migration support where appropriate.

---

# 17. Changesets

The repository SHOULD use Changesets or an equivalent explicit release-intent mechanism.

Each meaningful user-visible change SHOULD create a change entry.

Example:

```text
.changeset/
└── calm-wolves-resolve.md
```

A changeset SHOULD describe:

```text
affected package
release level
user-visible change
```

---

# 18. When a Changeset Is Required

Changesets SHOULD be required for:

```text
new features

bug fixes affecting behavior

public API changes

CLI behavior changes

adapter output changes

schema changes

compatibility changes
```

Changesets MAY be skipped for:

```text
internal refactoring

tests only

documentation only

CI changes

non-user-visible cleanup
```

unless those changes affect release artifacts.

---

# 19. Changeset Example

```yaml
---
"@agent-plugins/resolver": minor
"@agent-plugins/cli": minor
---

Add resolution provenance and expose `resolve --why`.
```

The exact format depends on the selected release tooling.

---

# 20. Breaking Changes

Breaking changes MUST explicitly state:

```text
what breaks
who is affected
migration path
replacement behavior
```

A breaking change MUST NOT be hidden inside a generic feature release note.

---

# 21. Release Notes Categories

Recommended release note sections:

```text
Highlights

Added

Changed

Fixed

Deprecated

Removed

Security

Migration

Compatibility
```

Only include relevant sections.

---

# 22. Security Releases

Security fixes MAY require an accelerated release process.

However, security releases MUST still preserve:

```text
artifact traceability
tests
versioning
integrity
```

Some public details MAY be withheld until users have had time to update.

---

# 23. Release Responsibility

A release actor SHOULD have permission to:

```text
trigger release workflow
approve publication
create Git tag
publish packages
create release entry
```

Release permissions SHOULD be limited to maintainers.

---

# 24. Human vs Automation Responsibility

Recommended split:

```text
Human
    approves release intent

CI
    computes versions
    builds artifacts
    runs tests
    signs/proves artifacts
    publishes
    verifies release
```

Humans SHOULD NOT build production artifacts manually from local machines.

---

# 25. Release Preconditions

Before release preparation:

```text
main is green

required PRs merged

required changesets present

migration documentation complete

security review complete where required

compatibility review complete
```

---

# 26. Release Preparation

Release preparation SHOULD generate:

```text
next versions

updated changelog

updated package manifests

updated compatibility metadata
```

This MAY occur through an automated release PR.

---

# 27. Release Pull Request

Recommended workflow:

```text
changes merged to main
        ↓
release automation
        ↓
Release PR
```

The Release PR includes:

```text
version bumps
changelog updates
changeset consumption
generated release metadata
```

---

# 28. Release PR Review

Reviewers SHOULD verify:

```text
version bumps are correct

breaking changes are visible

migration notes exist

unexpected packages are not released

changelog accurately reflects changes
```

---

# 29. Release Candidate Flow

For significant releases:

```text
Release PR
    ↓
merge
    ↓
RC build
    ↓
validation
    ↓
stable promotion
```

Example:

```text
1.0.0-rc.1
1.0.0-rc.2
1.0.0
```

---

# 30. Release Gate Overview

Stable releases MUST pass:

```text
Static checks

Unit tests

Integration tests

Contract tests

Adapter conformance

Golden tests

Security tests

Determinism tests

E2E tests

Cross-platform validation

Build verification
```

---

# 31. Static Gates

Required:

```text
lint
typecheck
architecture dependency checks
```

Any failure blocks release.

---

# 32. Unit Test Gate

All required unit tests MUST pass.

Critical modules include:

```text
resolver
policy
trust
lockfile
path handling
```

---

# 33. Integration Gate

Required integration suites SHOULD include:

```text
catalog + resolver

resolver + policy

lockfile + resolver

adapter + render plan

filesystem apply

CLI + application
```

---

# 34. Adapter Conformance Gate

Every production adapter MUST pass the adapter conformance suite.

A failure in any stable adapter blocks release when that adapter is part of the release.

---

# 35. Golden Test Gate

Golden fixture changes MUST be intentional.

Release automation MUST fail if:

```text
expected generated output
!=
actual generated output
```

without committed fixture changes.

---

# 36. Security Gate

Required security tests SHOULD include:

```text
path traversal

unknown file overwrite

policy bypass

trust escalation

integrity mismatch

prototype pollution

secret leakage
```

Critical failures block release.

---

# 37. Determinism Gate

The release pipeline SHOULD verify that selected builds run twice and produce identical artifacts.

Example:

```text
build A
build B
compare hashes
```

Differences block release unless explicitly expected and documented.

---

# 38. E2E Gate

Required product flow:

```text
init
↓
validate
↓
resolve
↓
plan
↓
build
↓
install
↓
diff
```

Expected final result:

```text
No changes.
```

---

# 39. Multi-Target Gate

Once multiple production adapters exist, release validation SHOULD include:

```text
same resolved graph
→ Claude
→ Codex
```

and later additional stable targets.

---

# 40. Cross-Platform Gate

Before stable V1, releases SHOULD be validated on:

```text
Linux
Windows
macOS
```

At minimum, core CLI behavior and filesystem handling MUST be tested on supported platforms.

---

# 41. Runtime Compatibility Matrix

CI SHOULD test supported runtime versions.

Example:

```text
Node current LTS

Node next supported LTS
```

The supported matrix MUST be documented.

---

# 42. Build Environment

Production artifacts MUST be built in a clean CI environment.

The build SHOULD NOT depend on:

```text
maintainer machine state

global packages

uncommitted files

local cache correctness

personal environment variables
```

---

# 43. Frozen Dependencies

Release builds SHOULD use frozen package-manager lockfiles.

Example:

```bash
pnpm install --frozen-lockfile
```

No dependency resolution should occur implicitly during release.

---

# 44. Agent Plugins Lockfile

Where relevant, internal fixtures or release examples SHOULD also use frozen Agent Plugins lockfile behavior.

This validates reproducibility at both package-manager and project levels.

---

# 45. Offline Validation

Where practical, release validation SHOULD run:

```bash
agent-plugins build --offline --frozen-lockfile
```

against representative fixtures.

This verifies that target rendering does not require network access.

---

# 46. Artifact Build

Release artifacts MAY include:

```text
npm packages

CLI binaries

archives

checksums

SBOM

provenance attestations
```

The exact distribution model may evolve.

---

# 47. Artifact Integrity

Published artifacts SHOULD include strong checksums.

Recommended:

```text
SHA-256
```

Example:

```text
agent-plugins-1.0.0.tar.gz
agent-plugins-1.0.0.tar.gz.sha256
```

---

# 48. Artifact Provenance

Every release artifact SHOULD be traceable to:

```text
repository
commit
tag
workflow run
version
```

This provenance SHOULD be machine-verifiable where supported.

---

# 49. Supply Chain Provenance

Future stable releases SHOULD consider publishing:

```text
SLSA-style provenance

build attestations

SBOM
```

This is strongly recommended before ecosystem-scale adoption.

---

# 50. Artifact Signing

Future releases MAY sign:

```text
Git tags
release archives
package artifacts
```

Signing keys MUST be managed separately from ordinary developer credentials.

---

# 51. Git Tags

Stable releases SHOULD create annotated tags.

Example:

```text
v1.3.0
```

Package-specific tags MAY be used if independently versioned packages require them.

Example:

```text
cli-v1.3.0
adapter-claude-v2.0.0
```

The repository SHOULD choose one consistent convention.

---

# 52. Tag Immutability

Published release tags MUST be treated as immutable.

Do not retarget an existing release tag.

If a release is bad:

```text
publish a new version
```

rather than changing history.

---

# 53. Publication

Publication MUST happen only after successful release validation.

Publishing SHOULD be performed automatically from trusted CI.

---

# 54. npm Publication

If npm is used, recommended controls include:

```text
scoped packages

2FA / trusted publishing

restricted publish permissions

provenance where supported
```

Long-lived npm tokens SHOULD be avoided where modern trusted publishing is available.

---

# 55. Registry Tags

npm-like registries MAY use channels:

```text
latest
next
beta
canary
```

Recommended:

```text
stable → latest

RC/beta → next
```

Canary SHOULD use a dedicated tag.

---

# 56. Stable Promotion

Promotion from RC to stable SHOULD NOT require source-code changes unless fixes were introduced.

The stable artifact SHOULD be built from the exact approved source state.

---

# 57. Release Notes

Every stable release SHOULD have release notes.

Release notes SHOULD emphasize:

```text
user-visible behavior

compatibility

migrations

security

adapter changes
```

Avoid listing every internal refactor.

---

# 58. Changelog

`CHANGELOG.md` SHOULD contain durable release history.

Recommended structure:

```text
# Changelog

## 1.2.0

### Added
...

### Fixed
...
```

The changelog SHOULD be generated or assisted by structured changesets.

---

# 59. Release Notes vs Changelog

Use:

```text
CHANGELOG.md
    durable repository history

GitHub/registry release notes
    release announcement and summary
```

The two MAY share generated content.

---

# 60. Migration Notes

If users must take action, the release MUST include a migration section.

Example:

```text
Migration

`target.adapter` was renamed to `target.id`.

Run:

agent-plugins migrate
```

---

# 61. Deprecation Lifecycle

Recommended lifecycle:

```text
introduce replacement
      ↓
mark deprecated
      ↓
emit warning
      ↓
document migration
      ↓
remove in breaking release
```

Avoid immediate removal of established stable behavior.

---

# 62. Compatibility Report

Major releases SHOULD summarize compatibility changes across:

```text
CLI syntax

CLI JSON

manifest schemas

lockfiles

adapter APIs

configuration

target output
```

---

# 63. Release Verification

Immediately after publication, CI SHOULD verify the released artifacts.

Example:

```text
install published CLI
      ↓
run --version
      ↓
run smoke test
      ↓
run minimal project build
```

---

# 64. Package Installation Smoke Test

Example:

```bash
npm install -g <released-package>

agent-plugins --version

agent-plugins validate
```

Testing MUST use the published artifact rather than the local workspace.

---

# 65. CLI Release Smoke Test

At minimum verify:

```text
--version

--help

validate

resolve

build
```

against a known fixture.

---

# 66. Adapter Release Smoke Test

Adapter publication SHOULD verify:

```text
adapter loads

metadata valid

capabilities valid

representative fixture renders
```

---

# 67. Release Failure

If publication partially fails:

```text
STOP
```

Do not continue blindly.

Determine:

```text
what published successfully

what failed

whether artifacts are immutable

whether a new version is required
```

---

# 68. Partial Publication

If immutable artifacts were already published, do not overwrite them.

Publish corrective versions.

Example:

```text
1.2.0 broken
→
1.2.1 fixed
```

---

# 69. Rollback Philosophy

Package registries often do not support safe true rollback.

Therefore the primary rollback mechanism is:

```text
forward fix
```

rather than replacing a published artifact.

---

# 70. Bad Release Response

Recommended flow:

```text
detect issue
    ↓
stop promotion
    ↓
mark release affected
    ↓
identify impacted users
    ↓
prepare patch
    ↓
run accelerated full gate
    ↓
publish patch
```

---

# 71. Package Deprecation

If a published npm package version is severely broken, it MAY be marked deprecated with guidance.

Example message:

```text
This version contains a critical resolver bug.
Upgrade to 1.2.1.
```

---

# 72. Security Incident Release

For critical security fixes:

```text
private fix
    ↓
security tests
    ↓
maintainer approval
    ↓
publish patch
    ↓
advisory
```

Details SHOULD be coordinated according to the project's security disclosure process.

---

# 73. Release Audit Trail

The project SHOULD retain:

```text
release PR

approvals

workflow run

source commit

tag

artifact hashes

published package metadata
```

This provides an audit trail.

---

# 74. Release Authorization

Only trusted maintainers SHOULD be able to approve stable releases.

CI workflows SHOULD use protected environments where available.

---

# 75. Secrets

Release credentials MUST NOT be available to ordinary PR workflows from untrusted contributors.

Publishing secrets SHOULD only be exposed inside protected release jobs.

---

# 76. Fork Pull Requests

Untrusted fork PRs MUST NOT receive:

```text
registry tokens

signing keys

production credentials
```

CI should run tests without privileged credentials.

---

# 77. Trusted Publishing

Where supported, OIDC-based trusted publishing SHOULD be preferred over stored long-lived tokens.

This reduces credential exposure.

---

# 78. Branch Protection

`main` SHOULD require:

```text
pull request

required CI checks

review

no direct force push
```

Release tags SHOULD be protected where platform capabilities allow.

---

# 79. Required Checks

Recommended required checks:

```text
lint

typecheck

unit

integration

architecture

security
```

Additional release-only checks:

```text
E2E

cross-platform

adapter conformance

determinism

published artifact smoke
```

---

# 80. Dependency Update Releases

Dependency-only releases SHOULD still pass normal gates.

Security dependency upgrades MAY be released as PATCH when public behavior remains compatible.

---

# 81. Adapter Mapping Changes

A change to target output MAY be:

```text
PATCH
```

for bug fixes,

```text
MINOR
```

for backward-compatible new mappings,

or:

```text
MAJOR
```

if generated output compatibility is intentionally broken.

---

# 82. Target Runtime Changes

External target runtimes may change independently.

Adapter updates responding to those changes SHOULD document:

```text
target runtime version

old behavior

new behavior

compatibility limitations
```

---

# 83. Emergency Adapter Release

Adapters MAY need faster release cycles than core.

Independent adapter versioning SHOULD allow:

```text
Claude runtime changes
→ release Claude adapter only
```

without unnecessarily releasing resolver/core.

---

# 84. Release Cadence

The project SHOULD prefer demand-driven releases rather than arbitrary frequent release schedules during early development.

Possible future cadence:

```text
patch
    as needed

minor
    grouped regularly

major
    intentionally planned
```

---

# 85. Pre-1.0 Releases

Before V1.0, the project may evolve more rapidly.

However:

```text
documented schemas
stable CLI machine interfaces
lockfile formats
```

SHOULD still avoid gratuitous breakage.

Pre-1.0 does not mean compatibility is irrelevant.

---

# 86. V1.0 Gate

Before V1.0:

```text
canonical domain stable

manifest schema stable

resolver semantics stable

policy semantics stable

trust model stable

lockfile stable

Adapter API stable

CLI core stable

CLI JSON versioned

migration strategy exists

security review complete

cross-platform validation complete
```

---

# 87. Major Release Gate

Every major release SHOULD include:

```text
migration guide

breaking change summary

compatibility matrix

upgrade tests

rollback guidance
```

---

# 88. Upgrade Test

Test:

```text
previous stable version
      ↓
existing project
      ↓
new CLI version
      ↓
validate
      ↓
migrate if needed
      ↓
build/install
```

This SHOULD be automated for supported upgrade paths.

---

# 89. Fresh Install Test

Release validation MUST also test:

```text
clean environment
      ↓
install released package
      ↓
init
      ↓
resolve
      ↓
build
```

Upgrade tests alone are insufficient.

---

# 90. Migration Validation

When a release includes migrations:

```text
old fixture
→ migrate
→ validate
→ build
```

MUST succeed.

Migration SHOULD be idempotent where specified.

---

# 91. Release Metadata

A release SHOULD record:

```text
version

Git commit

build timestamp

runtime requirements

schema versions

Adapter API version
```

Build timestamp SHOULD NOT affect functional output determinism.

---

# 92. Runtime Version Requirements

Package metadata SHOULD accurately declare supported runtime versions.

Example:

```json
{
  "engines": {
    "node": ">=24"
  }
}
```

Exact support depends on the project policy.

---

# 93. Release Artifact Naming

Artifact names SHOULD be deterministic.

Example:

```text
agent-plugins-v1.2.0-linux-x64.tar.gz
agent-plugins-v1.2.0-windows-x64.zip
```

if standalone binaries are introduced.

---

# 94. Checksums File

Future release archives SHOULD provide:

```text
SHA256SUMS
```

Example:

```text
<digest>  agent-plugins-v1.2.0-linux-x64.tar.gz
```

---

# 95. SBOM

Before broader distribution, the project SHOULD generate a Software Bill of Materials.

Recommended standard MAY include:

```text
CycloneDX
SPDX
```

Tool choice is implementation-specific.

---

# 96. Provenance Attestation

CI SHOULD eventually generate verifiable provenance connecting:

```text
source commit
→ CI workflow
→ release artifact
```

This strengthens supply-chain security.

---

# 97. Reproducible Release Builds

Where practical, the project SHOULD work toward:

```text
same source
+
same toolchain
+
same dependencies
→
same release artifact
```

Exact byte-level reproducibility MAY be introduced incrementally.

---

# 98. Toolchain Pinning

Release workflows SHOULD pin or clearly define:

```text
Node version

package manager version

build tooling

release tooling
```

Using `mise` or equivalent for development SHOULD align with CI where practical.

---

# 99. Release Tooling Updates

Changes to release tooling SHOULD be reviewed carefully.

Examples:

```text
Changesets configuration

publish workflow

registry authentication

artifact signing
```

These changes affect supply-chain security.

---

# 100. Release Workflow Files

Release automation SHOULD live in source control.

Example:

```text
.github/
└── workflows/
    ├── ci.yml
    ├── release.yml
    └── release-verify.yml
```

Exact platform is implementation-specific.

---

# 101. Release Workflow Separation

Recommended:

```text
ci.yml
    validation

release.yml
    version + publish

release-verify.yml
    post-publish verification
```

This keeps responsibilities clear.

---

# 102. Manual Release Inputs

Manual release workflows SHOULD minimize free-form user inputs.

Prefer selecting:

```text
release channel
approved commit
```

over manually typing package versions.

Version calculation SHOULD come from changesets/versioning rules.

---

# 103. Dry Run

Release tooling SHOULD support a dry-run mode where possible.

Dry run SHOULD display:

```text
packages to release
versions
tags
registry destinations
release notes
```

without publishing anything.

---

# 104. Release Plan

Before publication, the system SHOULD be able to produce a release plan.

Example:

```text
Release Plan

@agent-plugins/core
  1.4.0 → 1.5.0

@agent-plugins/cli
  1.7.2 → 1.8.0

@agent-plugins/adapter-claude
  unchanged
```

This plan SHOULD be reviewed automatically or manually.

---

# 105. Release Plan Validation

Release planning SHOULD detect:

```text
missing changesets

invalid dependency ranges

package version conflicts

unpublished dependent requirements

breaking compatibility
```

---

# 106. Internal Dependencies

When package A depends on package B and B changes, release tooling MUST determine whether A requires a version update.

This SHOULD be handled consistently by monorepo release tooling.

---

# 107. Workspace Protocols

Internal package dependencies SHOULD use the workspace mechanism supported by the package manager.

Before publishing, resulting package manifests MUST contain valid registry-compatible dependency ranges.

---

# 108. Private Packages

Packages not intended for public release SHOULD be marked appropriately.

Release automation MUST NOT accidentally publish private internal packages.

---

# 109. Publication Allowlist

The repository SHOULD explicitly define publishable packages.

Avoid:

```text
publish every package under packages/
```

as an implicit rule.

---

# 110. Release Channels per Package

Adapters MAY use RC or beta channels independently.

Example:

```text
@agent-plugins/adapter-hermes@0.5.0-beta.1
```

while the CLI remains stable.

---

# 111. CLI Compatibility Release

Any breaking change to stable CLI command syntax requires a MAJOR release after V1.

Example:

```text
agent-plugins build
→ removed
```

is breaking.

---

# 112. CLI JSON Compatibility

Breaking changes to:

```text
cli-output/v1
```

SHOULD result in a new output schema version.

The CLI package semantic version SHOULD reflect the compatibility impact.

---

# 113. Diagnostic Compatibility

Removal or semantic reuse of stable diagnostic codes SHOULD be treated as a compatibility change.

New diagnostic codes can normally be added backward-compatibly.

---

# 114. Lockfile Compatibility

Lockfile readers SHOULD define supported versions explicitly.

A release that cannot read a previously supported lockfile version may be breaking.

---

# 115. Adapter Compatibility

An adapter release SHOULD declare compatibility with:

```text
Adapter API version

core version range

target runtime versions
```

where applicable.

---

# 116. Release Notes for Adapters

Adapter release notes SHOULD prioritize:

```text
new capabilities

changed mappings

new unsupported cases

target runtime compatibility

generated-file changes
```

---

# 117. Release Approval Checklist

Before stable publication:

```text
[ ] Release plan reviewed

[ ] Versions correct

[ ] Changelog reviewed

[ ] Breaking changes documented

[ ] Migration documented

[ ] CI green

[ ] Security suite green

[ ] Adapter conformance green

[ ] Determinism green

[ ] E2E green

[ ] Cross-platform green

[ ] Release credentials protected

[ ] Target commit confirmed
```

---

# 118. Post-Release Checklist

After publication:

```text
[ ] Tags created

[ ] Packages visible

[ ] Checksums verified

[ ] Release notes published

[ ] Published CLI installs

[ ] CLI version correct

[ ] Smoke tests pass

[ ] Representative adapter build passes

[ ] Documentation links valid

[ ] Release announcement prepared if needed
```

---

# 119. Monitoring After Release

Maintainers SHOULD monitor for:

```text
installation failures

runtime compatibility issues

adapter rendering regressions

migration failures

security reports
```

immediately after significant releases.

---

# 120. Release Hotfix

Hotfix flow:

```text
reproduce issue
    ↓
add regression test
    ↓
minimal fix
    ↓
required release gates
    ↓
PATCH release
```

Avoid bundling unrelated features into hotfixes.

---

# 121. Emergency Security Patch

Security hotfixes MAY skip ordinary scheduling but MUST NOT skip essential security verification.

Required:

```text
reproduction
regression test
fix
security review
release build
post-release verification
```

---

# 122. Roll Forward

The default recovery strategy is:

```text
bad 1.2.0
    ↓
fix
    ↓
1.2.1
```

Published artifacts MUST NOT be silently replaced.

---

# 123. Yank / Deprecate

Registry-level removal SHOULD be rare.

Prefer package deprecation when users may already depend on the version.

True removal MAY be appropriate for credential leaks or severe legal/security situations.

---

# 124. Release Retention

Stable releases and their metadata SHOULD remain available long term.

Canary artifacts MAY use shorter retention policies.

---

# 125. Documentation Versioning

Before V1, documentation MAY track `main`.

After stable APIs emerge, the project SHOULD consider versioned documentation for major versions.

---

# 126. Examples and Fixtures

Release changes MUST update examples when behavior changes.

Broken documentation examples are considered release defects.

---

# 127. README Version References

Avoid hard-coding volatile version numbers in many locations.

Where possible, examples should remain version-independent.

---

# 128. Release Notes Automation

Automation MAY derive release notes from Changesets and commit metadata.

Human review is still required for major releases and migrations.

---

# 129. Contributor Workflow

Normal contributors SHOULD NOT need registry credentials.

Their workflow ends at:

```text
PR
+
changeset
```

Maintainers and CI handle publication.

---

# 130. Maintainer Workflow

Recommended:

```text
review release PR
      ↓
merge
      ↓
CI produces RC/stable artifacts
      ↓
approve protected publication environment
      ↓
verify release
```

---

# 131. Release Process for V0.x

During early development, a lightweight process is acceptable:

```text
Changesets
+
CI
+
automated npm publish
+
GitHub release
```

Do not prematurely build a complex release platform.

---

# 132. Recommended V0.x Tooling

Initial stack:

```text
Changesets

GitHub Actions

pnpm

npm trusted publishing if available
```

Optional later:

```text
Sigstore
SBOM
provenance attestations
```

---

# 133. V0.x Release Flow

Recommended flow:

```text
PR
 ↓
Changeset
 ↓
Merge main
 ↓
Automated Release PR
 ↓
Review Release PR
 ↓
Merge
 ↓
CI publish
 ↓
Git tag + release notes
 ↓
Post-publish smoke test
```

This is the recommended default process for the project.

---

# 134. Future Stable Release Flow

As the project matures:

```text
Development
    ↓
Release PR
    ↓
RC
    ↓
Cross-platform validation
    ↓
Migration validation
    ↓
Security approval
    ↓
Stable promotion
    ↓
Attestation + SBOM
    ↓
Post-release verification
```

---

# 135. Release Architecture

Release flow MUST remain separate from runtime architecture.

```text
Source Repository
      ↓
CI
      ↓
Test / Validate
      ↓
Build
      ↓
Sign / Attest
      ↓
Registry / Release Host
```

Runtime packages must not need release credentials.

---

# 136. Security Boundary

Release infrastructure is a privileged trust boundary.

Compromise of release credentials could compromise:

```text
CLI

adapters

libraries

users downstream
```

Release infrastructure MUST therefore receive stricter controls than normal CI.

---

# 137. Two-Person Review

For mature stable releases, critical releases MAY require two-person review.

Recommended particularly for:

```text
major releases

security-sensitive changes

release workflow changes

signing changes
```

Not required for early V0.x patch releases.

---

# 138. Protected Environment

Stable publishing SHOULD use a protected CI environment.

Features MAY include:

```text
maintainer approval

restricted secrets

deployment history

audit log
```

---

# 139. Release Workflow Changes

Any PR modifying:

```text
release.yml

registry authentication

package publication

signing

provenance
```

SHOULD receive elevated review.

---

# 140. Release Secrets

Where credentials cannot be eliminated, they MUST be:

```text
short-lived where possible

least privilege

stored in CI secret management

rotated periodically
```

They MUST NOT appear in logs.

---

# 141. Release Reproducibility

Every published version SHOULD be reproducible from its Git tag using documented tooling.

At minimum:

```text
checkout tag

install frozen dependencies

run build
```

must recreate logically equivalent artifacts.

---

# 142. Release Audit Command

Future tooling MAY expose:

```bash
agent-plugins release verify
```

for maintainers.

It could verify:

```text
tag
version
checksums
published packages
provenance
```

This is not part of the normal end-user CLI.

---

# 143. Internal Release Tooling

Release-specific tooling SHOULD remain outside normal end-user command architecture.

Avoid polluting:

```text
agent-plugins
```

with maintainer-only release commands unless there is a strong reason.

Repository scripts are usually preferable.

---

# 144. Recommended Scripts

Possible repository scripts:

```bash
pnpm release:check

pnpm release:version

pnpm release:build

pnpm release:publish

pnpm release:verify
```

Exact commands may be implemented through Changesets and CI.

---

# 145. Release Dry Run Script

Recommended:

```bash
pnpm release:check
```

should perform:

```text
changeset validation

version plan

compatibility checks

full required tests

package build
```

without publishing.

---

# 146. Local Publication

Production publication from developer machines SHOULD be discouraged.

A manual local publish SHOULD require emergency procedures and maintainer authorization.

---

# 147. Release Failure Modes

The process SHOULD explicitly handle:

```text
test failure

build failure

registry failure

partial publication

tag failure

release-note failure

post-publish verification failure
```

Not all failures require the same remediation.

---

# 148. Pre-Publish Failure

If failure occurs before any artifact is published:

```text
fix
→ rerun
```

No release version needs to change unless the version was externally exposed.

---

# 149. Post-Publish Failure

If immutable packages have already been published:

```text
do not replace

diagnose

release patch
```

---

# 150. Post-Publish Smoke Failure

If smoke tests fail:

```text
mark release affected

stop further channel promotion

create regression issue

prepare hotfix
```

---

# 151. Release Metrics

Useful release metrics MAY include:

```text
release frequency

failed release rate

hotfix frequency

time from merge to release

rollback/forward-fix frequency
```

Metrics SHOULD help improve reliability, not incentivize release volume.

---

# 152. Release Quality

The project SHOULD optimize for:

```text
predictable releases
>
frequent releases
```

especially while core contracts are stabilizing.

---

# 153. Breaking Change Budget

Major breaking changes SHOULD be grouped when possible.

Avoid repeated small breaking releases that create migration fatigue.

---

# 154. Release Communication

Major changes SHOULD clearly communicate:

```text
why change was made

what users need to do

what remains compatible

what is removed
```

---

# 155. Deprecation Warnings

Warnings SHOULD identify:

```text
deprecated feature

replacement

planned removal version if known
```

Example:

```text
`render` is deprecated.
Use `build`.

Planned removal: v2.
```

---

# 156. Stable Contract Definition

After V1, stable contracts include at least:

```text
canonical manifest schema

core resolution semantics

lockfile compatibility

Adapter API

CLI stable commands

CLI JSON schema

diagnostic code meanings
```

Changes to these surfaces require release impact analysis.

---

# 157. Experimental Contract

Experimental features MAY change without full major-version guarantees.

They MUST be clearly marked.

Experimental features SHOULD NOT silently become stable.

---

# 158. Adapter Experimental Status

New adapters MAY initially be marked experimental.

Example:

```yaml
status: experimental
```

Promotion to stable SHOULD require:

```text
conformance passing

golden coverage

real-world validation

compatibility documentation
```

---

# 159. Adapter Stability Levels

Possible future states:

```text
experimental

beta

stable

deprecated
```

This is distinct from trust level.

---

# 160. Package Deprecation Lifecycle

A published package MAY transition:

```text
stable
→ deprecated
→ unsupported
```

Deprecation MUST include migration guidance when an alternative exists.

---

# 161. Release Checklist — Patch

Patch release:

```text
[ ] Regression reproduced

[ ] Fix tested

[ ] No breaking changes

[ ] Required CI passes

[ ] Changelog updated

[ ] Publication verified
```

---

# 162. Release Checklist — Minor

Minor release:

```text
[ ] Features documented

[ ] Backward compatibility reviewed

[ ] Required migration notes added

[ ] Adapter output diffs reviewed

[ ] E2E passes

[ ] Release notes reviewed
```

---

# 163. Release Checklist — Major

Major release:

```text
[ ] Breaking changes enumerated

[ ] Migration guide complete

[ ] Compatibility matrix updated

[ ] Upgrade tests pass

[ ] RC validated

[ ] Security review complete

[ ] Documentation updated

[ ] Maintainer approval obtained
```

---

# 164. Release Checklist — Security

Security release:

```text
[ ] Vulnerability reproduced

[ ] Regression test added

[ ] Fix reviewed

[ ] Disclosure plan reviewed

[ ] Affected versions identified

[ ] Patch release ready

[ ] Security advisory prepared
```

---

# 165. Release Invariants

The following are normative.

## Invariant 1 — CI-built artifacts

Production artifacts MUST be built by trusted automation.

## Invariant 2 — Immutable releases

Published release artifacts MUST NOT be modified in place.

## Invariant 3 — Traceable releases

Every release MUST map to a specific source commit.

## Invariant 4 — Version intent is explicit

User-visible changes MUST participate in version planning.

## Invariant 5 — Quality gates cannot be bypassed silently

Stable publication requires required gates to pass.

## Invariant 6 — Breaking changes require migration guidance

Stable breaking changes MUST be documented.

## Invariant 7 — Release credentials remain isolated

Untrusted PRs MUST NOT receive publishing credentials.

## Invariant 8 — Published artifacts are verified

Post-publication smoke verification is required.

## Invariant 9 — Security fixes receive regression tests

Every release fixing a security defect SHOULD retain a regression test.

## Invariant 10 — Forward fix over mutation

A bad immutable release is corrected by a new version.

---

# 166. Recommended Initial Implementation

For the first project releases, implement:

```text
pnpm workspace

Changesets

GitHub Actions

npm publication

GitHub Releases

post-publish smoke test
```

Initial pipeline:

```text
PR
→ changeset
→ main
→ release PR
→ merge
→ publish
→ verify
```

This provides sufficient rigor without overengineering.

---

# 167. Recommended Future Enhancements

Later add:

```text
RC promotion

signed tags

SBOM

provenance attestation

trusted publishing

cross-platform binaries

release verification tooling

security advisory automation
```

---

# 168. Relationship to Versioning

`versioning-spec.md` defines:

```text
what version changes mean
```

`release-process.md` defines:

```text
how those versions are prepared, validated, and published
```

---

# 169. Relationship to Testing

`testing-strategy.md` defines:

```text
what must be tested
```

`release-process.md` defines:

```text
which test suites block release
```

---

# 170. Relationship to Migration

`migration-spec.md` defines:

```text
how incompatible state is transformed
```

`release-process.md` requires migrations to be validated and documented before relevant releases.

---

# 171. Relationship to Security

`security-model.md` defines supply-chain and credential risks.

The release process enforces controls such as:

```text
protected publishing

immutable artifacts

provenance

integrity

least-privilege credentials
```

---

# 172. Relationship to Trust

Published official packages and adapters form part of the project's trust root.

Therefore release infrastructure SHOULD receive the highest operational trust controls in the project.

---

# 173. Relationship to Adapters

Adapter releases may move independently from core releases.

Release tooling MUST support this without forcing unrelated packages to publish.

---

# 174. Relationship to CLI

CLI releases MUST preserve documented:

```text
command compatibility

exit codes

JSON output contracts

diagnostic semantics
```

according to their stability guarantees.

---

# 175. Recommended Repository Files

Eventually:

```text
.changeset/
├── config.json
└── *.md

.github/
└── workflows/
    ├── ci.yml
    ├── release.yml
    └── release-verify.yml

CHANGELOG.md
CONTRIBUTING.md
SECURITY.md

docs/
├── release-process.md
├── versioning-spec.md
└── migration-spec.md
```

---

# 176. Reference Release Flow

```text
Contributor
    │
    ▼
Feature PR
    │
    ├── code
    ├── tests
    ├── docs
    └── changeset
    │
    ▼
main
    │
    ▼
Release Automation
    │
    ▼
Release PR
    │
    ▼
Maintainer Review
    │
    ▼
Merge
    │
    ▼
Trusted CI
    │
    ├── lint
    ├── typecheck
    ├── tests
    ├── security
    ├── conformance
    ├── E2E
    └── build
    │
    ▼
Publish
    │
    ├── registry
    ├── Git tag
    ├── release notes
    └── checksums/provenance
    │
    ▼
Post-Release Verification
```

---

# 177. Final Decision Summary

The recommended release strategy is:

```text
Changesets
+
Semantic Versioning
+
Release PR
+
Trusted CI publication
+
Post-publication verification
```

The release process should remain:

```text
explicit
deterministic
reviewable
reproducible
auditable
```

The most important rule is:

> A release is not simply a version bump; it is a verified transformation from a reviewed source commit into immutable, traceable artifacts.