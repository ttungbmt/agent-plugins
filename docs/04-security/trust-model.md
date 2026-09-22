# Trust Model

**Status:** Draft  
**Version:** 0.1.0  
**Last Updated:** 2026-09-21

---

# 1. Purpose

This document defines the trust model for the Agent Plugins platform.

The trust model determines how the system evaluates confidence in:

- package sources;
- publishers;
- publishers;
- repositories;
- package revisions;
- adapters;
- overlays;
- generated artifacts;
- registries;
- organization-controlled content.

The trust model does not determine whether something is safe by itself.

Instead, it provides structured evidence that can be consumed by:

```text
Policy
Security controls
Update logic
CLI diagnostics
User review
Organization governance
```

The core principle is:

> Trust is explicit, contextual, evidence-based, and never equivalent to permission.

---

# 2. Trust vs Security

Trust and security are related but distinct.

```text
Trust Model
    → How much confidence do we have in this entity?

Security Model
    → What risks exist and what controls protect the system?

Policy
    → What is allowed?
```

Example:

```text
Package:
  trusted vendor

Capability:
  shell execution

Policy:
  shell execution denied

Result:
  blocked
```

A trusted package does not automatically receive dangerous permissions.

---

# 3. Trust vs Permission

The following MUST remain separate:

```text
trust
permission
capability
risk
```

Example:

```text
Trust:
  high

Risk:
  high

Permission:
  denied
```

This is valid.

Another example:

```text
Trust:
  low

Risk:
  low

Permission:
  allowed
```

may also be valid depending on policy.

Trust MUST NOT directly map to unrestricted execution.

---

# 4. Core Principles

The trust model follows these principles:

1. **Trust is explicit**
2. **Trust is contextual**
3. **Trust is not binary**
4. **Trust is not transitive by default**
5. **Trust is not permanent**
6. **Trust requires provenance**
7. **Trust can degrade**
8. **Trust can be overridden by policy**
9. **Unknown means unknown**
10. **Identity is not safety**
11. **Popularity is not trust**
12. **Integrity is not trust**
13. **Trust decisions must be explainable**
14. **Trust metadata must be deterministic**

---

# 5. Trust Subjects

Trust MAY be assigned to:

```text
Source
Publisher
Publisher
Repository
Package
Revision
Adapter
Registry
Overlay
Organization
```

Trust SHOULD NOT be attached only to package names.

Trust belongs to a specific identity and provenance context.

---

# 6. Trust Dimensions

A single scalar trust score is discouraged.

Trust SHOULD instead be modeled through dimensions.

Recommended dimensions:

```text
identity
provenance
integrity
ownership
review
maintenance
distribution
execution
```

Example:

```yaml
trust:
  identity: verified
  provenance: verified
  integrity: verified
  ownership: known
  review: curated
  maintenance: active
```

---

# 7. Trust Classification

For V1, the platform SHOULD use a small categorical trust model.

Recommended levels:

```text
first-party
trusted-vendor
verified-community
community
unknown
```

These values describe source confidence, not execution permission.

---

# 8. First-Party

`first-party` means:

> Content authored and maintained under direct control of the Agent Plugins project or the controlling organization.

Typical properties:

```text
known maintainers
controlled repository
controlled review process
controlled release process
known provenance
```

Example:

```yaml
trust:
  level: first-party
```

First-party content still MUST pass normal validation and policy.

---

# 9. Trusted Vendor

`trusted-vendor` means:

> External content from an upstream publisher that has been explicitly curated and approved.

Typical examples:

```text
known reputable upstream repository
manually curated vendor import
approved by organization policy
```

Trusted vendor status SHOULD require explicit configuration.

It MUST NOT be inferred solely from popularity.

---

# 10. Verified Community

`verified-community` means:

> Community content whose publisher identity and provenance are verified, but which is not directly controlled by the organization.

Typical properties:

```text
publisher identity known
repository ownership verified
revision integrity verified
package metadata valid
```

It does not imply detailed content review.

---

# 11. Community

`community` means:

> Third-party content with identifiable provenance but without elevated trust guarantees.

Example:

```text
public GitHub repository
known revision
valid manifest
unknown publisher review process
```

Community content SHOULD receive conservative defaults.

---

# 12. Unknown

`unknown` means:

> The system lacks enough evidence to assign a stronger trust classification.

Unknown MUST NOT be treated as equivalent to community.

Examples:

```text
unverified downloaded archive
missing publisher identity
unresolved provenance
ambiguous repository origin
```

Unknown SHOULD generally be denied by strict organizational policies.

---

# 13. Local Content

Local content requires separate treatment.

A local path is not automatically trustworthy.

Possible classifications:

```text
local-controlled
local-project
local-unknown
```

For V1, local content MAY reuse:

```text
first-party
community
unknown
```

depending on ownership context.

The important rule is:

> Locality does not imply trust.

---

# 14. Trust Evidence

Trust decisions SHOULD derive from observable evidence.

Potential evidence includes:

```text
repository identity
publisher identity
organization ownership
cryptographic signature
immutable revision
integrity hash
manual approval
review history
source configuration
registry verification
```

Trust MUST NOT be inferred from package description text.

---

# 15. Identity

Identity answers:

> Who claims ownership of this artifact?

Examples:

```text
GitHub organization
registry publisher
repository owner
organization namespace
```

Possible identity states:

```text
verified
known
self-asserted
unknown
```

Verified identity does not imply safe content.

---

# 16. Provenance

Provenance answers:

> Where exactly did this content come from?

Example:

```yaml
provenance:
  sourceType: git
  repository: https://github.com/example/project
  revision: abc123
  path: packages/foo
```

Trust SHOULD require provenance for external packages.

---

# 17. Integrity

Integrity answers:

> Is this content identical to the content that was expected?

Example:

```yaml
integrity:
  algorithm: sha256
  digest: ...
```

Integrity protects against tampering.

It does not prove that the original content was benign.

Therefore:

```text
integrity != trust
```

---

# 18. Authenticity

Authenticity answers:

> Did the expected publisher produce this artifact?

Potential evidence:

```text
signed Git tag
signed package
verified registry publisher
release signature
```

Authenticity SHOULD strengthen trust evidence.

---

# 19. Review

Review answers:

> Has this content been examined by a trusted process?

Possible review levels:

```text
none
automated
manual
curated
organization-approved
```

Review status MAY be included in trust metadata.

---

# 20. Ownership

Ownership describes control of the source.

Example:

```yaml
ownership:
  type: organization
  identity: openai
```

Ownership SHOULD be distinguishable from package authorship.

---

# 21. Trust Metadata

Recommended canonical representation:

```yaml
trust:
  level: trusted-vendor

  identity:
    status: verified

  provenance:
    status: verified

  integrity:
    status: verified

  review:
    status: curated
```

The exact schema belongs in `source-spec.md` or a future trust schema.

---

# 22. Trust Sources

Trust information MAY come from:

```text
built-in defaults
organization configuration
workspace configuration
project configuration
registry metadata
manual approval
```

Trust SHOULD NOT be self-assigned by the package being evaluated.

Example of forbidden semantics:

```yaml
trust:
  level: first-party
```

inside an arbitrary community package.

The package may declare identity information, but trust classification comes from the consuming system.

---

# 23. Trust Authority

Recommended precedence:

```text
organization policy
      ↓
workspace trust config
      ↓
project trust config
      ↓
registry evidence
      ↓
source default
```

Higher-authority configuration may reduce trust.

Increasing trust SHOULD require explicit authority.

---

# 24. Trust Escalation

Trust escalation means:

```text
community
→ trusted-vendor
```

This SHOULD require explicit configuration or verified authority.

A package MUST NOT escalate itself.

---

# 25. Trust Downgrade

Trust MAY automatically downgrade when evidence changes.

Example:

```text
verified repository
→ repository owner changed
```

or:

```text
trusted revision
→ source changed
```

Potential result:

```text
trusted-vendor
→ unknown
```

Trust downgrade SHOULD be surfaced prominently.

---

# 26. Trust Is Revision-Sensitive

Trust in a repository does not necessarily imply trust in every revision.

Example:

```text
repository = trusted-vendor
revision A = reviewed
revision B = new/unreviewed
```

The system MAY model:

```text
source trust
+
revision trust
```

separately.

---

# 27. Package Trust

Effective package trust SHOULD be derived from multiple signals.

Conceptually:

```text
Source Trust
+
Publisher Trust
+
Revision Evidence
+
Integrity
+
Review
→
Effective Trust Context
```

This does NOT need to be a numeric formula.

---

# 28. No Numeric Trust Score

V1 SHOULD NOT expose trust as:

```text
87/100
```

Reasons:

```text
false precision
hard-to-explain weighting
unstable interpretation
encourages unsafe threshold logic
```

Categorical evidence is preferred.

---

# 29. Effective Trust

The system MAY expose:

```text
declared trust
effective trust
```

Example:

```text
Configured:
  trusted-vendor

Effective:
  unknown

Reason:
  integrity verification failed
```

Critical evidence failure SHOULD lower effective trust.

---

# 30. Trust Constraints

Trust levels SHOULD form a capability-independent ordering for policy convenience:

```text
first-party
    ↓
trusted-vendor
    ↓
verified-community
    ↓
community
    ↓
unknown
```

This ordering represents confidence only.

It MUST NOT automatically map to permission levels.

---

# 31. Policy Interaction

Policies MAY reference trust.

Example:

```yaml
allow:
  trust:
    - first-party
    - trusted-vendor
```

Or:

```yaml
deny:
  when:
    trust: community
    capability: shell-execute
```

Trust therefore becomes policy input.

---

# 32. Capability-Aware Trust Policies

Policy SHOULD support combinations.

Example:

```text
community package
+
documentation skill
→ allowed
```

but:

```text
community package
+
runtime hook
→ denied
```

This is preferable to globally banning all community content.

---

# 33. Trust and Risk

Trust and risk MUST remain orthogonal.

Example matrix:

| Trust | Risk | Possible Policy |
|---|---|---|
| First-party | Low | Allow |
| First-party | High | Review / restrict |
| Community | Low | Allow |
| Community | High | Deny |
| Unknown | Any | Deny by default |

The table is illustrative.

Policy remains authoritative.

---

# 34. Trust and Permissions

Permission decisions MAY depend on trust.

Example:

```text
filesystem-read

first-party
    → may be allowed

community
    → review required

unknown
    → denied
```

But permissions MUST be explicitly enforced.

---

# 35. Trust and Adapters

Adapters represent highly privileged components.

Recommended initial trust rule:

```text
Only first-party or explicitly trusted adapters may execute.
```

Adapter trust classifications SHOULD be stricter than package trust classifications.

---

# 36. Third-Party Adapters

Before third-party adapters are supported, the system SHOULD require:

```text
verified provenance
trusted publisher
integrity
explicit installation
explicit adapter trust
sandboxing or permission controls
```

An ordinary community package MUST NOT be able to register executable adapter code.

---

# 37. Source Adapter Trust

Source adapters can retrieve external content and therefore require privileged trust.

For V1:

```text
Source adapters = trusted application code
```

Package trust does not imply Source Adapter trust.

---

# 38. Target Adapter Trust

Target adapters can generate filesystem operations.

Therefore:

```text
Target adapter compromise
→ potential filesystem compromise
```

Their trust requirements SHOULD be high.

---

# 39. Registry Trust

Registry trust answers:

> How much do we trust metadata provided by this registry?

Possible classification:

```text
official
trusted
community
unknown
```

Registry trust is separate from package trust.

---

# 40. Registry Metadata

A trusted registry MAY provide:

```text
publisher identity
integrity
signatures
security advisories
provenance
```

But the system SHOULD independently verify integrity where possible.

---

# 41. Trust Chains

Trust MAY form chains.

Example:

```text
Organization
    trusts
Official Registry
    verifies
Publisher
    publishes
Package
```

However:

> Trust MUST NOT automatically transit through every relationship.

Each link SHOULD have explicit semantics.

---

# 42. Non-Transitive Trust

Example:

```text
Organization trusts Vendor A
Vendor A depends on Community Package B
```

This MUST NOT imply:

```text
Organization trusts Package B
```

Dependency trust MUST be independently evaluated.

---

# 43. Dependency Trust

Every resolved dependency SHOULD retain its own trust metadata.

The effective graph may contain mixed trust levels:

```text
first-party
├── trusted-vendor
├── community
└── community
```

Policy evaluates the graph accordingly.

---

# 44. Transitive Dependency Visibility

Users SHOULD be able to identify lower-trust transitive dependencies.

Example:

```text
plugin:foo
  trusted-vendor

depends on:
  plugin:bar
    community
```

This SHOULD appear in diagnostics when relevant.

---

# 45. Minimum Trust

A project or Profile MAY specify minimum trust.

Example:

```yaml
minimumTrust: trusted-vendor
```

This is shorthand for policy behavior.

It SHOULD NOT bypass the Policy Engine.

---

# 46. Profile Trust Requirements

Profiles MAY define expected trust constraints.

For example:

```text
enterprise-secure
```

may require:

```text
first-party
or
trusted-vendor
```

while:

```text
experimentation
```

may permit community packages.

---

# 47. Environment-Specific Trust

Trust policy MAY differ by environment.

Example:

```text
development
    community allowed

production
    trusted-vendor minimum
```

The package itself retains the same trust metadata.

Only policy changes.

---

# 48. Trust and Overlays

Overlays modify package semantics.

Their provenance and ownership MUST therefore be tracked.

Example:

```text
Vendor package
    trust: trusted-vendor

Organization overlay
    trust: first-party
```

The resulting package SHOULD preserve both origins.

---

# 49. Overlay Trust Does Not Replace Base Trust

A trusted overlay on an untrusted base does not automatically produce a trusted package.

Example:

```text
Base:
  community

Overlay:
  first-party
```

Effective trust SHOULD still expose the community base dependency.

---

# 50. Effective Package Composition

A composed package SHOULD expose trust contributions:

```text
base source
overlay sources
dependencies
adapter
```

Trust SHOULD not collapse into a misleading single label without context.

---

# 51. Trust Provenance Graph

Conceptually:

```text
Community Source
       │
       ▼
Vendor Import
       │
       ▼
Organization Overlay
       │
       ▼
Resolved Component
       │
       ▼
Claude Adapter
```

Each node has separate provenance and trust.

---

# 52. Trust Changes

The system SHOULD detect trust-relevant changes during updates.

Examples:

```text
source changed
publisher changed
repository transferred
signature missing
integrity algorithm changed
new transitive dependency
```

These changes SHOULD be surfaced separately from ordinary content diffs.

---

# 53. Update Trust Review

Example:

```text
TRUST CHANGE

plugin:foo

Previous:
  trusted-vendor

Candidate:
  community

Reason:
  source repository changed
```

This SHOULD block by default under strict policy.

---

# 54. Publisher Changes

If package ownership changes:

```text
publisher A
→ publisher B
```

existing trust MUST NOT automatically transfer.

This should be treated as a trust boundary event.

---

# 55. Repository Transfer

Git hosting platforms may allow repository transfers.

A repository URL that still resolves after a transfer does not guarantee identical ownership.

Source adapters SHOULD record stable owner identity where possible.

---

# 56. Package Rename

Package renaming MUST NOT be treated as equivalent identity without explicit metadata.

Example:

```text
foo
→ foo-next
```

The system SHOULD not automatically inherit trust.

---

# 57. Namespace Trust

Namespaces MAY have trust metadata.

Example:

```text
vendor:mattpocock/*
```

may be trusted-vendor.

But namespace rules SHOULD remain explicit.

Wildcards SHOULD be carefully controlled.

---

# 58. Trust Matching

Trust configuration MAY support matching:

```text
source
publisher
namespace
repository
package
revision
```

Specific rules SHOULD override broad rules.

---

# 59. Trust Rule Precedence

Recommended specificity order:

```text
revision
    ↓
package
    ↓
repository
    ↓
publisher
    ↓
namespace
    ↓
source
    ↓
default
```

More specific trust rules override less specific rules.

---

# 60. Trust Rule Example

```yaml
trust:
  defaults:
    community: community

  publishers:
    mattpocock:
      level: trusted-vendor

  packages:
    vendor:experimental-package:
      level: community
```

The package-specific rule overrides publisher-level trust.

---

# 61. Trust Configuration Ownership

Trust configuration SHOULD typically be managed by:

```text
organization
team
project owner
```

rather than imported package authors.

---

# 62. User Overrides

Individual developers MAY be allowed to lower trust.

Example:

```text
trusted-vendor
→ community
```

Increasing trust beyond organization limits SHOULD generally be prohibited.

---

# 63. Trust Ceiling

Organization configuration MAY define maximum assignable trust.

Example:

```text
Project cannot elevate community package above verified-community.
```

This prevents local configuration from bypassing governance.

---

# 64. Trust Floor

Organizations MAY also enforce minimum trust for certain environments.

Example:

```text
production:
  minimumTrust: trusted-vendor
```

Again, this is implemented through policy.

---

# 65. Trust and Lockfile

The lockfile SHOULD capture trust-relevant evidence, not just classification.

Example:

```yaml
packages:
  foo:
    source: ...
    revision: abc123

    trust:
      level: trusted-vendor
      provenanceVerified: true
      integrityVerified: true
```

Whether the final trust classification itself belongs in the lockfile SHOULD be decided carefully.

---

# 66. Dynamic vs Locked Trust

Two categories exist:

```text
artifact evidence
policy evaluation
```

Artifact evidence can be locked:

```text
source
revision
hash
signature
publisher
```

Trust policy may change independently.

Therefore the lockfile SHOULD prioritize recording evidence rather than only a derived trust label.

---

# 67. Re-Evaluation

Trust SHOULD be recalculated when:

```text
policy changes
source metadata changes
publisher identity changes
integrity fails
registry evidence changes
```

Locked package content may remain unchanged while effective trust changes.

---

# 68. Offline Trust

Offline builds MUST be able to evaluate trust using locked/local evidence.

They SHOULD NOT require contacting a registry solely to determine trust.

Remote trust metadata MAY be refreshed separately.

---

# 69. Revocation

Trust MAY need to be revoked.

Examples:

```text
compromised publisher
malicious revision
compromised signing key
registry incident
```

A future trust system MAY support revocation records.

---

# 70. Local Revocation

V1 SHOULD allow local policy to immediately deny:

```text
publisher
package
revision
source
```

without waiting for remote registry updates.

---

# 71. Trust Expiration

Some trust evidence MAY expire.

Examples:

```text
manual approval
temporary exception
publisher verification
```

The model SHOULD support future expiry metadata.

Example:

```yaml
trust:
  expiresAt: 2027-01-01
```

V1 MAY omit enforcement.

---

# 72. Manual Approval

Manual approval SHOULD be explicit.

Example:

```yaml
trustOverrides:
  plugin:foo:
    level: trusted-vendor
    reason: "Reviewed internally"
```

Recommended metadata:

```text
who
when
reason
scope
```

---

# 73. Approval Scope

Approval SHOULD specify scope:

```text
all revisions
specific revision
version range
repository
package
```

Specific revision approval is safest.

---

# 74. Temporary Trust

A temporary trust override MAY be useful for evaluation.

It MUST NOT silently become permanent.

Example concept:

```text
trusted until:
  date
or
  specific update
```

---

# 75. Trust Auditability

Trust decisions SHOULD be auditable.

The system SHOULD answer:

```text
Why is this trusted?

Who approved it?

Which evidence supports it?

Which policy allowed it?

Has trust changed?
```

---

# 76. CLI Trust Inspection

Future CLI:

```bash
agent-plugins inspect plugin:foo --trust
```

Potential output:

```text
Trust: trusted-vendor

Evidence:
  ✓ Publisher verified
  ✓ Source approved
  ✓ Immutable revision
  ✓ Integrity verified
  ✓ Curated import

Policy:
  organization/default
```

---

# 77. Trust Explanation

The CLI SHOULD expose machine-readable explanation.

Example:

```json
{
  "level": "trusted-vendor",
  "evidence": [
    "publisher-verified",
    "source-approved",
    "integrity-verified"
  ]
}
```

---

# 78. Trust Warnings

Warnings SHOULD appear when trust is weaker than expected.

Example:

```text
WARNING TRUST_TRANSITIVE_DEPENDENCY

plugin:foo is trusted-vendor but depends on:

  plugin:bar
  trust: community
```

---

# 79. Unknown Trust UX

The CLI SHOULD clearly distinguish:

```text
unknown
```

from:

```text
untrusted
```

Unknown means insufficient evidence.

Untrusted MAY mean explicit negative classification or denial.

---

# 80. Explicit Distrust

Future model MAY include:

```text
blocked
revoked
malicious
```

These are not ordinary trust levels.

They are denial states.

Example:

```text
revoked
```

MUST override positive trust evidence.

---

# 81. Trust State vs Trust Level

Recommended model:

```text
Trust State:
  active
  unknown
  revoked
  blocked

Trust Level:
  first-party
  trusted-vendor
  verified-community
  community
```

This avoids overloading the trust hierarchy.

---

# 82. Negative Trust Evidence

Potential negative evidence:

```text
integrity mismatch
revoked key
repository ownership change
malware report
manual deny
security advisory
```

Critical negative evidence SHOULD dominate positive trust signals.

---

# 83. Trust Conflict

Example:

```text
Publisher:
  trusted-vendor

Revision:
  revoked
```

Effective result MUST be:

```text
blocked
```

Specific negative evidence overrides broad trust.

---

# 84. Trust Resolution Algorithm

Conceptually:

```text
collect evidence
      ↓
apply explicit blocks/revocations
      ↓
apply specific trust rules
      ↓
apply broader trust rules
      ↓
validate evidence requirements
      ↓
derive effective trust
      ↓
pass to Policy
```

This process MUST be deterministic.

---

# 85. Trust Requirements by Level

Possible requirements:

## first-party

```text
controlled source
known ownership
known provenance
```

## trusted-vendor

```text
approved upstream
verified provenance
immutable revision
integrity
```

## verified-community

```text
verified identity
verified provenance
integrity
```

## community

```text
known source
known revision
```

## unknown

```text
requirements not satisfied
```

Exact requirements SHOULD be configurable.

---

# 86. Trust Profiles

Organizations MAY define named trust profiles.

Example:

```text
strict
balanced
experimental
```

These SHOULD expand into Policy and trust configuration.

---

# 87. Strict Trust Profile

Example conceptual rules:

```text
first-party
trusted-vendor

allowed

verified-community
review required

community
denied

unknown
denied
```

---

# 88. Balanced Trust Profile

Example:

```text
first-party
trusted-vendor
verified-community
allowed

community
allowed for low-risk capabilities

unknown
denied
```

---

# 89. Experimental Trust Profile

Example:

```text
community allowed

unknown requires explicit approval

dangerous capabilities still restricted
```

Trust profiles MUST NOT override critical security invariants.

---

# 90. Trust and Profiles

Agent Plugins Profiles such as:

```text
frontend
backend
second-brain
```

SHOULD NOT hard-code trust semantics unless the Profile is specifically security-oriented.

Trust belongs primarily to Policy/configuration.

---

# 91. Trust and Presets

Presets select capabilities/packages.

They SHOULD NOT automatically grant trust.

Example:

```text
preset:frontend-quality
```

may select a vendor package, but that package remains subject to trust evaluation.

---

# 92. Trust and Publisher Selection

When multiple publishers implement the same capability, trust MAY influence selection.

Example:

```text
capability: code-review
```

publishers:

```text
first-party/reviewer
trusted-vendor/reviewer
community/reviewer
```

The resolver MAY use trust as one deterministic selection constraint.

---

# 93. Trust Is Not Ranking Quality

A higher-trust publisher does not necessarily mean:

```text
better quality
better prompts
more capable
```

Trust describes confidence and governance.

Quality SHOULD be modeled separately.

---

# 94. Publisher Selection Policy

Publisher selection might follow:

```text
compatibility
policy
trust requirements
explicit preference
priority
```

Trust SHOULD not silently override an explicit user/publisher selection unless Policy requires it.

---

# 95. Trust and Search

Catalog search MAY display trust.

Example:

```text
NAME                  TRUST
frontend-quality      first-party
ecc                    trusted-vendor
foo-reviewer           community
```

Search ranking SHOULD NOT silently promote packages solely due to trust.

---

# 96. Trust and Discovery

Discovery may find untrusted content.

This is acceptable.

Important distinction:

```text
discoverable
!=
installable
```

Trust and Policy decide whether discovered content may enter the effective environment.

---

# 97. Trust and Installation

Before installation:

```text
Resolved Graph
      ↓
Trust Evaluation
      ↓
Policy Evaluation
      ↓
Adapter Validation
      ↓
Install
```

The exact ordering of trust/policy implementation may be integrated, but both decisions must occur before mutation.

---

# 98. Trust and Build

Build SHOULD fail when Policy requires trust evidence that cannot be established.

Example:

```text
trusted-vendor required

package integrity:
  unknown
```

Result:

```text
fail
```

---

# 99. Trust and CI

CI SHOULD use stronger trust guarantees.

Recommended:

```text
immutable lockfile
integrity verification
strict Policy
no new trust approvals
```

CI SHOULD NOT interactively approve unknown trust.

---

# 100. Trust Changes in Pull Requests

Trust-sensitive lockfile/config changes SHOULD be obvious during code review.

Examples:

```text
new source
new publisher
trust elevation
new community dependency
revision change
```

---

# 101. Trust Diff

Future CLI:

```bash
agent-plugins diff --trust
```

Potential output:

```text
+ community:foo

~ vendor:bar
  trusted-vendor → community

! publisher changed
```

---

# 102. Update Trust Gates

An update MAY proceed automatically only if its trust characteristics remain compatible with Policy.

Example:

```text
trusted-vendor
→ trusted-vendor
```

could proceed.

But:

```text
trusted-vendor
→ community
```

SHOULD require explicit review or fail.

---

# 103. New Dependency Gate

A trusted package update that introduces a new community dependency SHOULD be treated as a trust change.

Example:

```text
plugin:A
trusted-vendor

new dependency:
plugin:B
community
```

This MUST be surfaced.

---

# 104. Trust and Signatures

Signatures provide evidence of authenticity.

They SHOULD NOT directly map to trust level.

Example:

```text
signed by unknown publisher
```

is still not equivalent to trusted-vendor.

---

# 105. Trust Root

Organizations MAY define trust roots.

Examples:

```text
approved GitHub organizations
approved registry publishers
approved signing keys
```

Trust roots SHOULD be explicit configuration.

---

# 106. Multiple Trust Roots

Different ecosystems may use different roots:

```text
GitHub organization ownership
registry publisher ID
signature key
internal repository namespace
```

The canonical trust model SHOULD normalize their evidence.

---

# 107. Trust Anchors

A trust anchor is evidence accepted without further delegation.

Examples:

```text
organization-owned signing key
internal Git server
first-party repository
```

Trust anchors MUST be configured, not package-controlled.

---

# 108. Trust Delegation

Future implementations MAY support delegation.

Example:

```text
Organization
trusts
Vendor
to publish
namespace: vendor/*
```

Delegation MUST be scoped.

Unbounded delegation SHOULD be avoided.

---

# 109. Delegation Scope

Possible scope:

```text
namespace
repository
package
capability
time period
```

Trust delegation MUST NOT automatically include third-party dependencies.

---

# 110. Trust Revocation Priority

Revocation MUST take precedence over delegation.

Example:

```text
Vendor trusted
Package revision revoked
```

Result:

```text
revision blocked
```

---

# 111. Compromise Response

When a trust anchor is compromised:

```text
revoke trust anchor
      ↓
re-evaluate packages
      ↓
identify affected lockfiles
      ↓
block updates/builds if necessary
```

---

# 112. Trust Persistence

Trust decisions MAY live in:

```text
organization policy
workspace config
project config
local user config
```

The canonical repository SHOULD clearly distinguish persistent trust declarations from transient CLI choices.

---

# 113. No Hidden Trust Cache

The system SHOULD NOT silently remember interactive trust decisions outside visible configuration.

Example:

```text
"Trust this package forever?"
```

must result in an explicit persisted trust record if accepted.

---

# 114. Trust Prompting

Interactive trust prompts SHOULD be rare.

Prefer:

```text
Policy/configuration
```

over repeated prompts.

When prompting is necessary, display:

```text
entity
source
publisher
revision
risk
requested trust change
```

---

# 115. Trust Elevation UX

Never phrase:

```text
This package is safe. Trust it?
```

Prefer:

```text
This package currently has community trust.

Source:
...

Revision:
...

Elevate to trusted-vendor for this revision?
```

This preserves accurate semantics.

---

# 116. Trust Expiry UX

If trust evidence expires, the CLI SHOULD explain why re-evaluation is required.

Example:

```text
Manual approval expired.

Package:
  plugin:foo

Approved revision:
  abc123

Current revision:
  def456
```

---

# 117. Trust Data Model

Conceptual structure:

```ts
interface TrustContext {
  subject: TrustSubject

  state:
    | "active"
    | "unknown"
    | "blocked"
    | "revoked"

  level?:
    | "first-party"
    | "trusted-vendor"
    | "verified-community"
    | "community"

  evidence: TrustEvidence[]

  reasons: TrustReason[]
}
```

---

# 118. Trust Evidence Model

Conceptually:

```ts
interface TrustEvidence {
  type:
    | "publisher"
    | "repository"
    | "integrity"
    | "signature"
    | "manual-review"
    | "organization-ownership"

  status:
    | "verified"
    | "unverified"
    | "failed"

  source: string
}
```

Exact implementation may differ.

---

# 119. Trust Reason

Trust evaluation SHOULD produce reasons.

Example:

```ts
interface TrustReason {
  code: string
  message: string
}
```

Potential codes:

```text
TRUST_SOURCE_FIRST_PARTY
TRUST_PUBLISHER_VERIFIED
TRUST_MANUAL_APPROVAL
TRUST_INTEGRITY_FAILED
TRUST_PUBLISHER_CHANGED
TRUST_REVISION_UNREVIEWED
```

---

# 120. Trust Diagnostics

Recommended diagnostics:

```text
TRUST_UNKNOWN

TRUST_LEVEL_TOO_LOW

TRUST_DOWNGRADE

TRUST_PUBLISHER_CHANGED

TRUST_SOURCE_CHANGED

TRUST_REVISION_UNVERIFIED

TRUST_TRANSITIVE_DEPENDENCY

TRUST_REVOKED

TRUST_OVERRIDE_DENIED
```

---

# 121. Trust Diagnostic Example

```text
ERROR TRUST_LEVEL_TOO_LOW

Package:
  community:foo

Effective trust:
  community

Required:
  trusted-vendor

Policy:
  organization/production

Suggestion:
  Use an approved publisher or request an explicit trust review.
```

---

# 122. Trust Determinism

Given identical:

```text
trust configuration
evidence
source metadata
revision
policy
```

the effective trust decision MUST be identical.

Trust evaluation MUST NOT depend on:

```text
search popularity
download counts
runtime randomness
local current time
```

except explicit expiry semantics.

---

# 123. Popularity

Metrics such as:

```text
GitHub stars
downloads
forks
```

MAY be displayed as informational metadata.

They MUST NOT automatically grant trust.

---

# 124. Reputation

Future reputation systems MAY assist human review.

They SHOULD remain separate from authoritative trust classification unless explicitly configured.

---

# 125. AI-Based Trust

AI analysis MAY eventually identify suspicious package behavior.

AI output MUST NOT be the sole basis for elevated trust.

It MAY contribute:

```text
warning
review recommendation
risk signal
```

but not silently grant trusted status.

---

# 126. Trust and Security Advisories

Security advisories MAY reduce effective trust or block specific revisions.

Example:

```text
trusted-vendor package
+
known malicious revision
→ blocked
```

Specific negative evidence overrides general trust.

---

# 127. Trust History

Future implementations SHOULD preserve trust history.

Example:

```text
2026-08-01 community
2026-08-10 verified-community
2026-09-01 trusted-vendor
2026-09-20 revoked
```

Useful for audits and incident response.

---

# 128. Trust Review Workflow

A mature workflow MAY be:

```text
Discover
   ↓
Verify provenance
   ↓
Inspect package
   ↓
Review permissions
   ↓
Review source
   ↓
Assign trust
   ↓
Apply Policy
```

Trust assignment SHOULD be auditable.

---

# 129. Vendor Onboarding

To classify a source as `trusted-vendor`, recommended review includes:

```text
verify repository identity
verify publisher identity
review maintenance history
review package scope
review executable behavior
define allowed namespaces
pin source
enable integrity
```

---

# 130. Community Promotion

Promotion:

```text
community
→ verified-community
```

SHOULD require stronger identity/provenance evidence.

Promotion:

```text
verified-community
→ trusted-vendor
```

SHOULD require explicit organizational curation.

---

# 131. Trust Boundaries for Initial Project

For the initial Agent Plugins implementation:

```text
first-party
    → trusted by default

vendor
    → explicitly curated

community
    → untrusted by default

adapters
    → first-party only
```

This keeps V1 simple and safe.

---

# 132. V1 Trust Scope

V1 SHOULD support:

```text
trust levels
source-level trust
package-level override
revision provenance
integrity evidence
Policy integration
trust diagnostics
trust downgrade detection
```

V1 SHOULD NOT require:

```text
public PKI
complex reputation
distributed trust
automated trust scoring
community voting
```

---

# 133. V1 Default Trust

Recommended defaults:

```text
canonical first-party
    → first-party

explicit vendor source
    → trusted-vendor

known external source
    → community

unresolved source
    → unknown
```

No external content SHOULD default to trusted-vendor without explicit configuration.

---

# 134. Pre-Community Requirements

Before broad community package support:

```text
provenance
integrity
trust classification
trust diagnostics
Policy integration
transitive trust visibility
source namespace protection
```

MUST be available.

---

# 135. Pre-Third-Party Adapter Requirements

Before supporting community adapters:

```text
adapter trust
publisher verification
integrity
permissions
sandboxing
revocation
```

SHOULD exist.

---

# 136. Core Trust Invariants

The following are normative.

## Invariant 1 — Trust is not permission

Trusted entities remain subject to Policy.

## Invariant 2 — Trust cannot self-escalate

Packages MUST NOT assign their own effective trust.

## Invariant 3 — Trust is provenance-aware

External trust decisions MUST retain source identity.

## Invariant 4 — Trust is revision-aware

A trusted repository does not automatically imply all revisions are trusted.

## Invariant 5 — Trust is not automatically transitive

Dependencies are evaluated independently.

## Invariant 6 — Integrity is not trust

A valid hash proves consistency, not safety.

## Invariant 7 — Identity is not trust

Verified authorship does not prove safe behavior.

## Invariant 8 — Negative evidence dominates

Revocation and integrity failure override positive trust.

## Invariant 9 — Unknown remains unknown

Missing evidence MUST NOT be interpreted positively.

## Invariant 10 — Trust decisions are explainable

Effective trust MUST be traceable to evidence and rules.

---

# 137. Reference Trust Flow

```text
External Package
      │
      ▼
Source Identity
      │
      ▼
Publisher Identity
      │
      ▼
Provenance
      │
      ▼
Integrity
      │
      ▼
Trust Rules
      │
      ▼
Effective Trust Context
      │
      ▼
Policy Engine
      │
      ▼
Allow / Deny / Review
```

---

# 138. Reference Dependency Flow

```text
plugin:A
trust: trusted-vendor
      │
      ├── plugin:B
      │   trust: trusted-vendor
      │
      └── plugin:C
          trust: community
```

Effective environment trust is not simply:

```text
trusted-vendor
```

The lower-trust dependency MUST remain visible.

---

# 139. Trust Decision Example

Input:

```text
Package:
  vendor:foo

Source:
  approved vendor repository

Revision:
  abc123

Integrity:
  verified

Publisher:
  verified

Review:
  curated
```

Result:

```text
Trust state:
  active

Trust level:
  trusted-vendor
```

Policy then decides whether the package's capabilities are permitted.

---

# 140. Trust Failure Example

Input:

```text
Package:
  vendor:foo

Expected revision:
  abc123

Actual content:
  integrity mismatch
```

Result:

```text
Trust state:
  blocked
```

The previous trusted-vendor classification MUST NOT override the integrity failure.

---

# 141. Architecture Relationship

The complete flow becomes:

```text
Source Adapter
      ↓
Provenance + Evidence
      ↓
Trust Evaluation
      ↓
Canonical Catalog
      ↓
Resolver
      ↓
Resolved Graph
      ↓
Policy
      ↓
Allowed Graph
      ↓
Target Adapter
```

Implementation MAY evaluate trust during catalog loading and revalidate it after resolution.

The important property is:

> Policy always receives sufficient trust context for every selected entity.

---

# 142. Relationship to Security Model

`security-model.md` defines:

```text
threats
attack surfaces
security boundaries
controls
```

`trust-model.md` defines:

```text
trust subjects
trust levels
evidence
trust derivation
trust changes
```

Together:

```text
Trust
+
Risk
+
Policy
=
Security decision
```

---

# 143. Relationship to Source Spec

`source-spec.md` SHOULD define how source evidence is obtained:

```text
repository
revision
publisher
integrity
signature
```

`trust-model.md` defines how that evidence contributes to trust.

---

# 144. Relationship to Policy Spec

`policy-spec.md` defines decisions such as:

```text
allow
deny
require
```

based on trust context.

Example:

```text
trust <= community
AND
capability = shell-execute
→ deny
```

Trust Model itself MUST NOT perform final authorization.

---

# 145. Relationship to Lockfile

`lockfile-spec.md` SHOULD preserve trust-relevant immutable evidence.

Examples:

```text
source
publisher
revision
integrity
signature identity
```

Trust evaluation MAY then be reproduced without trusting mutable remote metadata.

---

# 146. Relationship to Update Spec

`update-spec.md` MUST detect:

```text
trust downgrade
publisher change
source change
new transitive trust
integrity changes
```

Trust-changing updates SHOULD receive elevated review.

---

# 147. Relationship to Adapter Spec

Adapters themselves have trust requirements.

For V1:

```text
Adapters
=
trusted application components
```

Future community adapters require stronger isolation and trust mechanisms.

---

# 148. Recommended Repository Location

Recommended:

```text
docs/
├── architecture/
│   ├── architecture.md
│   ├── security-model.md
│   └── trust-model.md
```

or, if current structure is flatter:

```text
docs/
├── security-model.md
├── trust-model.md
```

`trust-model.md` belongs alongside `security-model.md`, not under adapter/source implementation details.

---

# 149. Initial Implementation Priority

Implement trust in this order:

```text
1. Provenance

2. Source identity

3. Integrity

4. Basic trust levels

5. Trust configuration

6. Trust diagnostics

7. Policy integration

8. Dependency trust visibility

9. Update trust diff

10. Revocation
```

Avoid building sophisticated publisher reputation systems early.

---

# 150. Final Decision Summary

The Agent Plugins trust model adopts:

```text
Trust
    = structured confidence based on evidence

Trust
    != permission

Trust
    != integrity

Trust
    != identity

Trust
    != popularity
```

The initial trust hierarchy is:

```text
first-party
    ↓
trusted-vendor
    ↓
verified-community
    ↓
community
    ↓
unknown
```

with separate blocking states such as:

```text
blocked
revoked
```

The strongest design rule is:

> Trust informs Policy; Trust never replaces Policy.

This keeps source confidence, runtime risk, and authorization as independent architectural concerns.