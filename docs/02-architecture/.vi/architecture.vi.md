# Kiến trúc

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.

## Tổng quan

Tài liệu này định nghĩa kiến trúc hệ thống của `agent-plugins`.

Kiến trúc được thiết kế để hỗ trợ product model cốt lõi:

```text
Publisher
   ↓
Package
   ↓
Component
   ↓
Capability
   ↓
Preset
   ↓
Role + Project + Policy
   ↓
Resolver
   ↓
Lockfile
   ↓
Target Adapter
```

Hệ thống cần luôn:

- hướng capability,
- deterministic,
- có khả năng giải thích,
- reproducible,
- độc lập với publisher,
- độc lập với target ở tầng core,
- có thể mở rộng mà không cần độ phức tạp framework không cần thiết.

Nguyên tắc kiến trúc trung tâm là:

> **Giữ semantic intent ở core, cô lập hành vi đặc thù của từng hệ sinh thái sau các adapter, và đảm bảo resolution là deterministic trước khi bắt đầu materialization.**

---

# 1. Mục tiêu kiến trúc

Kiến trúc phải cho phép:

```text
capability-first configuration

reusable presets and roles

publisher-independent user intent

deterministic resolution

policy-aware selection

conflict detection

full provenance

reproducible lockfiles

safe target materialization

multi-runtime extensibility
```

Kiến trúc cũng phải tránh:

```text
publisher logic leaking into roles

runtime-specific concepts leaking into the domain

generated files becoming authoritative

CLI code becoming business logic

source discovery becoming resolution logic

package installation becoming capability semantics
```

---

# 2. Phong cách kiến trúc

`agent-plugins` nên sử dụng một kiến trúc module hóa lấy cảm hứng từ:

```text
Domain-Driven Design
+
Hexagonal / Ports and Adapters
+
Functional Core / Imperative Shell
+
Dependency Inversion
```

Điều này không đòi hỏi phải implement các pattern này một cách hình thức hoặc quá mức.

Cách hiểu thực tế là:

```text
Domain Model
    ↓
Application / Resolution Logic
    ↓
Ports
    ↓
Adapters
```

Các hệ thống bên ngoài nên phụ thuộc vào core model.

Core model không nên phụ thuộc vào các hệ thống bên ngoài.

---

# 3. Kiến trúc tổng thể

```text
┌──────────────────────────────────────────┐
│                CLI / UX                  │
│                                          │
│ init sync list search explain diff doctor│
└─────────────────────┬────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────┐
│           Application Services           │
│                                          │
│ project loading                          │
│ validation                               │
│ orchestration                            │
│ resolution                               │
│ sync                                     │
│ update                                   │
└─────────────────────┬────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────┐
│               Core Domain                │
│                                          │
│ Publisher                                 │
│ Package                                  │
│ Component                                │
│ Capability                               │
│ Preset                                   │
│ Role                                  │
│ Policy                                   │
│ Project                                  │
│ Resolution                               │
│ Lockfile                                 │
└──────────────┬───────────────────────────┘
               │
        ┌──────┴────────┐
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│Source Ports  │  │Target Ports  │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│Source        │  │Target        │
│Adapters      │  │Adapters      │
│              │  │              │
│GitHub        │  │Claude Code   │
│Marketplace   │  │Codex         │
│Superpowers   │  │Gemini        │
│ECC           │  │OpenCode      │
│Filesystem    │  │Hermes        │
└──────────────┘  └──────────────┘
```

---

# 4. Nguyên tắc cốt lõi: Domain First

Core domain không được phụ thuộc vào:

```text
Claude Code
Codex
GitHub APIs
filesystem layout of an upstream publisher
oclif
Ink
specific YAML libraries
network APIs
```

Core nên hoạt động trên các domain object đã được normalize.

Ví dụ:

```text
CapabilityRequirement
CandidateImplementation
PolicyResult
ResolutionDecision
```

thay vì các object đặc thù của runtime như:

```text
ClaudePluginEntry
GitHubRepositoryResponse
```

---

# 5. Các tầng kiến trúc chính

Kiến trúc được chia thành năm tầng chính.

```text
1. Domain

2. Application

3. Source Integration

4. Target Integration

5. Presentation
```

Hạ tầng hỗ trợ bao gồm:

```text
schemas
serialization
filesystem
generated artifacts
testing
```

---

# 6. Domain Layer

Domain Layer chứa semantic model và các business rule deterministic.

Các khái niệm chính:

```text
Publisher
Package
Component
Capability
Capability Implementation

Preset
Role
Policy
Project

Candidate
Resolution
Resolution Decision

Lockfile
Diagnostic
```

Domain Layer không nên chứa bất kỳ lời gọi filesystem hay network trực tiếp nào.

---

# 7. Domain Services

Hành vi domain không thuộc về một entity duy nhất một cách tự nhiên nên được implement thông qua domain service.

Các service chính bao gồm:

```text
Capability Resolver

Dependency Graph Builder

Policy Evaluator

Conflict Resolver

Compatibility Evaluator

Resolution Explainer

Lockfile Builder
```

Các service này nên deterministic với cùng một input.

---

# 8. Application Layer

Application Layer điều phối các thao tác domain.

Các trách nhiệm điển hình:

```text
load project

load catalog

load policies

validate inputs

construct resolution context

invoke resolver

build lockfile

invoke target adapter

calculate diff

apply sync

run update workflows
```

Application Layer có thể sử dụng port cho filesystem, source adapter và target adapter.

Nó không nên chứa semantics lựa chọn cốt lõi vốn thuộc về Domain Layer.

---

# 9. Presentation Layer

Presentation layer chính của V1 là CLI.

Stack được khuyến nghị:

```text
TypeScript
oclif
Ink
```

CLI nên giữ mỏng.

Về mặt khái niệm:

```text
CLI Command
     ↓
Application Service
     ↓
Domain
```

Tránh:

```text
CLI Command
     ↓
complex resolution logic
```

---

# 10. Trách nhiệm của CLI

CLI có thể xử lý:

```text
argument parsing

interactive prompts

terminal rendering

user confirmation

exit codes

format selection
```

CLI nên ủy thác:

```text
validation

resolution

policy evaluation

conflict handling

lockfile generation

sync planning
```

cho các application/core service có thể tái sử dụng.

---

# 11. Source Integration Layer

Source Integration Layer hiểu các hệ sinh thái publisher bên ngoài.

Ví dụ:

```text
Git repository

Claude marketplace

Agent Skills format

Superpowers structure

ECC structure

filesystem source
```

Mục đích của nó là normalization.

Về mặt khái niệm:

```text
External Source
      ↓
Source Adapter
      ↓
Normalized Package / Component Metadata
```

---

# 12. Ranh giới của Source Adapter

Một Source Adapter phải trả lời được:

```text
What packages exist?

What components exist?

What versions or refs exist?

Where does each component originate?

What metadata can be extracted?
```

Nó không được trả lời:

```text
Which capability should the project use?

Which candidate should win?

Which role needs this package?
```

Đó là mối quan tâm của resolver và catalog.

---

# 13. Interface của Source Adapter

Về mặt khái niệm:

```ts
interface SourceAdapter {
  discover(source: SourceDescriptor): Promise<DiscoveredSource>
}
```

Implementation cụ thể có thể khác.

Về mặt khái niệm, output đã normalize nên bao gồm:

```text
Publisher metadata

Packages

Components

Versions

Source refs

Integrity metadata

Raw compatibility metadata
```

---

# 14. Source Adapter generic và Source Adapter đặc thù cho publisher

Ưu tiên adapter generic khi có thể.

Ví dụ:

```text
github
filesystem
claude-marketplace
agent-skills
```

Adapter đặc thù cho publisher phù hợp khi cấu trúc upstream đủ khác biệt.

Ví dụ:

```text
superpowers
ecc
```

Hệ thống không nên tạo một custom adapter cho mỗi publisher khi không cần thiết.

---

# 15. Discovery không phải là curation

Source adapter có thể discover hàng trăm component.

Điều đó không biến các component đó thành một phần của curated catalog.

Về mặt kiến trúc:

```text
Upstream
   ↓
Source Adapter
   ↓
Discovered Metadata
   ↓
Curation
   ↓
Canonical Catalog
```

Các giai đoạn này phải được giữ tách biệt.

---

# 16. Catalog Layer

Catalog đại diện cho tập hợp đã được curate mà resolver có thể sử dụng.

Nội dung canonical:

```text
Publishers

Packages

Capabilities

Capability implementation mappings
```

Catalog có thể tham chiếu đến các Component đã được discover mà không cần sao chép thủ công toàn bộ metadata upstream của chúng.

---

# 17. Trách nhiệm của Catalog

Catalog xác định:

```text
which publishers are recognized

which packages are supported

which components are curated

which capabilities exist

which implementations map to capabilities

default implementation priorities

lifecycle metadata
```

Nó không nên xác định resolution riêng cho từng project.

---

# 18. Source of truth của Catalog

Các thư mục authoritative được khuyến nghị:

```text
catalog/
├── publishers/
├── packages/
└── capabilities/
```

Các file này là canonical.

Các component index được generate là dữ liệu dẫn xuất.

---

# 19. Index của các Component đã discover

Các Component upstream nên được discover và normalize vào một index được generate.

Ví dụ:

```text
generated/catalog/components.json
```

Điều này tránh việc sao chép thủ công như:

```text
catalog/components/
```

cho mọi item upstream của third-party.

Index được generate có thể được tạo lại từ:

```text
publisher source configuration
+
source adapters
+
distribution lock
```

---

# 20. Native Component

Các implementation first-party nằm trong:

```text
plugins/native/
```

Ví dụ:

```text
plugins/native/
├── product-management/
├── second-brain/
└── gis/
```

Native component là source code authoritative chứ không phải metadata third-party được discover.

Chúng vẫn tham gia vào cùng model Package / Component / Capability đã normalize.

---

# 21. Composition Layer

Composition được biểu diễn thông qua:

```text
Presets
Roles
Projects
```

Hướng phụ thuộc:

```text
Role
   ↓
Preset
   ↓
Capability
```

Project có thể compose thêm preset và override.

---

# 22. Lưu trữ Preset

Các preset canonical nằm trong:

```text
presets/
```

Ví dụ:

```text
presets/
├── workflow/
├── engineering/
├── stacks/
├── domains/
├── knowledge/
└── tools/
```

Preset là input khai báo authoritative.

---

# 23. Lưu trữ Role

Các role canonical nằm trong:

```text
roles/
```

Ví dụ:

```text
roles/
├── frontend-engineer.yaml
├── backend-engineer.yaml
├── product-manager.yaml
└── second-brain.yaml
```

Role nên chủ yếu tham chiếu đến Preset.

---

# 24. Lưu trữ Policy

Các policy tái sử dụng nằm trong:

```text
policies/
```

Ví dụ:

```text
default.yaml
strict.yaml
personal.yaml
enterprise.yaml
```

Policy được resolve độc lập với Role.

---

# 25. Project Manifest

Các consumer repository định nghĩa desired state thông qua:

```text
agent-plugins.yaml
```

Về mặt khái niệm:

```yaml
apiVersion: agent-plugins.dev/v1alpha1

role: frontend-engineer

presets:
  - stacks/nextjs
  - stacks/cloudflare
  - engineering/security

policy: default

targets:
  - claude-code
```

Project Manifest nên giữ ngắn gọn.

---

# 26. Xây dựng Resolution Context

Trước khi resolution bắt đầu, Application Layer xây dựng một Resolution Context đã normalize.

Về mặt khái niệm:

```text
Catalog

Distribution Lock

Project Manifest

Resolved Role

Resolved Presets

Policy

Target

Existing Project Lockfile

Overrides
```

Không được thực hiện target materialization nào trước khi context này được validate.

---

# 27. Resolution Pipeline

Resolution pipeline cốt lõi là:

```text
Load Project
     ↓
Validate Project
     ↓
Expand Role
     ↓
Expand Presets
     ↓
Collect Capability Requirements
     ↓
Deduplicate Requirements
     ↓
Expand Capability Dependencies
     ↓
Build Capability Graph
     ↓
Find Candidate Implementations
     ↓
Apply Hard Constraints
     ↓
Apply Policy
     ↓
Apply Target Compatibility
     ↓
Check Implementation Dependencies
     ↓
Resolve Conflicts
     ↓
Apply Overrides
     ↓
Apply Preferences / Priorities
     ↓
Apply Cardinality
     ↓
Select Components
     ↓
Deduplicate Packages
     ↓
Resolve Versions
     ↓
Produce Resolution
```

---

# 28. Resolution phải pure khi khả thi

Về mặt khái niệm, resolver deterministic nên hoạt động như:

```text
resolve(context) → resolution
```

Nó không nên:

```text
download packages

modify filesystem

prompt user

write lockfiles

call an LLM
```

Các side effect này thuộc về bên ngoài core resolver.

---

# 29. Functional Core, Imperative Shell

Một nguyên tắc kiến trúc hữu ích là:

```text
Imperative Shell

load files
fetch metadata
read runtime state

        ↓

Functional Core

validate
build graph
resolve
compare

        ↓

Imperative Shell

write lockfile
materialize runtime
display output
```

Điều này giúp hành vi của resolver dễ test hơn.

---

# 30. Mở rộng requirement

Việc mở rộng Role và Preset nên diễn ra trước khi lựa chọn implementation.

Đúng:

```text
Role
    ↓
Presets
    ↓
All Capability Requirements
    ↓
Deduplicate
    ↓
Resolve
```

Tránh:

```text
Resolve Preset A independently

Resolve Preset B independently

merge later
```

Cách sau có thể vô tình kích hoạt các implementation cạnh tranh nhau.

---

# 31. Graph Model

Resolver hoạt động trên nhiều graph tách biệt về mặt logic.

```text
Preset Graph

Capability Graph

Component Dependency Graph

Package Dependency Graph
```

Các graph này không được gộp lẫn với nhau.

---

# 32. Preset Graph

Biểu diễn composition:

```text
Preset A
→ Preset B
```

Được dùng cho:

```text
composition expansion
cycle detection
provenance
```

---

# 33. Capability Graph

Biểu diễn các semantic dependency:

```text
engineering.testing.e2e
→ tooling.browser
```

Được dùng cho:

```text
dependency expansion
cycle detection
resolution ordering
impact analysis
```

---

# 34. Component Dependency Graph

Biểu diễn các requirement của implementation.

Ví dụ:

```text
security-review-agent
→ security-rules
```

Được dùng sau khi lựa chọn candidate hoặc trong quá trình kiểm tra eligibility.

---

# 35. Package Dependency Graph

Biểu diễn các dependency cài đặt giữa các Package.

Graph này thuộc về logic distribution/materialization chứ không phải semantic Capability composition.

---

# 36. Policy Evaluation

Policy đóng vai trò là một bộ lọc eligibility.

Về mặt khái niệm:

```text
Candidates
    ↓
Policy Evaluator
    ↓
Allowed / Denied / Review
```

Priority chỉ nên được áp dụng sau các hạn chế policy bắt buộc.

---

# 37. Kiến trúc Policy

Policy Evaluator nên sử dụng metadata đã normalize.

Ví dụ:

```text
Candidate
├── publisher trust
├── ownership
├── component type
├── security metadata
└── source
```

và:

```text
Policy
```

để tạo ra:

```text
PolicyDecision
```

Ví dụ:

```text
allow
deny
review
prompt
```

---

# 38. Policy không được phụ thuộc vào CLI

Policy engine không nên trực tiếp prompt người dùng.

Thay vào đó:

```text
Policy Evaluator
→ review required
```

Tầng application/CLI quyết định cách xử lý kết quả đó.

Điều này giữ được hành vi non-interactive trong CI.

---

# 39. Đánh giá Target Compatibility

Việc kiểm tra target compatibility nên diễn ra trước lựa chọn cuối cùng.

Về mặt khái niệm:

```text
Candidate
+
Target
     ↓
Compatibility Evaluator
     ↓
supported / partial / unsupported
```

Metadata về target compatibility có thể đến từ:

```text
catalog metadata
source discovery
target adapter capabilities
```

---

# 40. Conflict Resolver

Conflict Resolver xử lý:

```text
cardinality conflicts

explicit component conflicts

package conflicts where relevant

mutually exclusive implementations
```

Nó nên tạo ra các Resolution Decision có cấu trúc.

---

# 41. Cardinality Resolution

Với:

```text
cardinality: one
```

resolver chọn tối đa một implementation eligible.

Với:

```text
cardinality: many
```

có thể chọn nhiều implementation eligible không xung đột.

---

# 42. Tính mơ hồ

Nếu nhiều candidate vẫn hợp lệ ngang nhau và kiến trúc không định nghĩa một preference deterministic có ý nghĩa, resolution nên fail một cách tường minh.

Ưu tiên:

```text
Ambiguous capability resolution
```

thay vì:

```text
arbitrary implementation selection
```

---

# 43. Package Deduplication

Việc lựa chọn capability diễn ra ở cấp Component.

Việc cài đặt diễn ra ở cấp Package.

Do đó resolver nên chuyển đổi:

```text
Selected Components
       ↓
Required Packages
       ↓
Deduplicated Packages
```

Ví dụ:

```text
Component A ─┐
Component B ─┼→ Package X
Component C ─┘
```

Package X chỉ nên được cài một lần.

---

# 44. Cài đặt Package không đồng nghĩa với kích hoạt Component

Một Package có thể chứa các Component không được chọn về mặt semantic.

Ví dụ:

```text
Package X

├── TDD
├── Debugging
└── Planning
```

Resolution có thể chọn:

```text
Debugging
Planning
```

trong khi TDD được cung cấp bởi Package Y.

Kiến trúc phải giữ được sự phân biệt này.

---

# 45. Version Resolution

Version resolution nên diễn ra sau khi semantic selection xác định được các Package cần thiết.

Về mặt khái niệm:

```text
Selected Components
     ↓
Packages
     ↓
Version Constraints
     ↓
Distribution Lock
     ↓
Existing Project Lock
     ↓
Resolved Immutable Version
```

---

# 46. Tính ổn định của lock hiện có

Quá trình đồng bộ thông thường nên ưu tiên giữ nguyên một lock hợp lệ hiện có.

`ap sync` không nên tự động xem xét lại mọi upstream version.

Về mặt khái niệm:

```text
valid locked state
+
unchanged desired state
=
preserve selection
```

Update là một workflow riêng biệt.

---

# 47. Distribution Lock

Repository `agent-plugins` duy trì một upstream baseline đã được curate.

Về mặt khái niệm:

```text
catalog.lock
```

Nó có thể pin:

```text
publisher
package
version
commit
integrity
```

Điều này đại diện cho upstream state đã được test.

---

# 48. Project Lockfile

Các consumer project duy trì:

```text
agent-plugins.lock
```

Nó ghi lại Resolution thực tế của project.

Về mặt khái niệm:

```text
Capability
→ Implementation
→ Component
→ Package
→ Publisher
→ Version / Commit
```

---

# 49. Dual-Lock Model

Hai tầng lock phục vụ các mục đích khác nhau.

```text
catalog.lock
      ↓
curated upstream baseline

Project Resolution
      ↓

agent-plugins.lock
      ↓
consumer reproducibility
```

Không bao giờ được nhầm lẫn project lock với distribution lock.

---

# 50. Lockfile Builder

Lockfile Builder nhận một Resolution đã hoàn tất.

Nó không nên tự đưa ra các quyết định semantic selection một cách độc lập.

Đúng:

```text
Resolution
    ↓
Lockfile Builder
```

Tránh:

```text
partial resolution
    ↓
Lockfile decides winner
```

---

# 51. Target Integration Layer

Sau khi Resolution hoàn tất, Target Integration Layer sẽ materialize nó.

Kiến trúc:

```text
Resolution
   ↓
Target Adapter
   ↓
Materialization Plan
   ↓
Diff
   ↓
Apply
```

---

# 52. Ranh giới của Target Adapter

Một Target Adapter nên biết:

```text
runtime-specific file formats

runtime-specific plugin structure

installation locations

supported component types

managed-state markers

native runtime features
```

Nó không nên định nghĩa lại:

```text
Capability meaning

Role semantics

Preset composition

publisher priority
```

---

# 53. Interface của Target Adapter

Về mặt khái niệm:

```ts
interface TargetAdapter {
  inspect(context): Promise<ActualState>

  plan(
    resolution,
    actualState
  ): Promise<MaterializationPlan>

  apply(
    plan
  ): Promise<MaterializationResult>
}
```

API cụ thể có thể khác.

Việc tách biệt:

```text
inspect
plan
apply
```

cho phép hành vi diff và dry-run an toàn.

---

# 54. Claude Code Target Adapter

Claude Code là target đầu tiên được khuyến nghị cho V1.

Adapter chịu trách nhiệm chuyển đổi Resolution thành các khái niệm native của Claude như:

```text
plugins

skills

agents

commands

hooks

marketplace references

runtime configuration
```

Mapping cụ thể thuộc về `adapter-spec.md`.

---

# 55. Giữ nguyên các tính năng native của runtime

Kiến trúc không nên ép mọi target về một format lowest-common-denominator.

Ví dụ:

```text
Claude Code supports feature X
Codex supports feature Y
```

Mỗi Target Adapter có thể expose hành vi native khi tương thích với semantic intent.

Các khái niệm domain dùng chung nên được giữ ở mức tối thiểu.

---

# 56. Target Capabilities

Mỗi Target Adapter có thể expose một capability descriptor.

Về mặt khái niệm:

```text
supported component types

runtime constraints

feature flags

installation modes
```

Điều này cho phép kiểm tra compatibility mà không cần nhúng logic đặc thù của runtime vào core.

---

# 57. Materialization Plan

Trước khi thay đổi runtime state, adapter nên tạo ra một Materialization Plan.

Ví dụ:

```text
Install:
+ package A

Enable:
+ component B

Update:
~ package C

Remove:
- managed package D

Preserve:
manual package E
```

Plan này là nền tảng cho:

```text
ap diff

dry-run

sync confirmation

testing
```

---

# 58. Ranh giới Managed State

Target adapter phải phân biệt:

```text
agent-plugins-managed state
```

với:

```text
manual runtime state
```

Chỉ managed state mới được tự động reconcile.

Adapter có thể sử dụng:

```text
generated manifest

state metadata

lockfile markers

managed directories
```

để theo dõi ownership.

---

# 59. Kiến trúc Sync

`ap sync` tuân theo:

```text
Load Desired State
      ↓
Resolve
      ↓
Load Actual State
      ↓
Build Materialization Plan
      ↓
Display Diff
      ↓
Apply Plan
      ↓
Verify
      ↓
Write / Confirm Lock State
```

Thứ tự ghi lock cụ thể phải đảm bảo rằng materialization thất bại sẽ không bị ghi nhận sai là thành công.

---

# 60. Nguyên tắc transaction của Sync

Khi khả thi:

```text
resolve
→ plan
→ apply
→ verify
→ commit state
```

Tránh:

```text
write final lockfile
→ materialization fails
```

vì điều này có thể để lại state không nhất quán.

---

# 61. Idempotence

Với input không thay đổi:

```text
sync(state)
→ state'

sync(state')
→ state'
```

Lần sync thứ hai không nên tạo ra thay đổi có ý nghĩa nào.

Điều này nên được test ở cấp adapter integration.

---

# 62. Kiến trúc Validation

Validation diễn ra ở nhiều cấp.

```text
Schema Validation

Reference Validation

Graph Validation

Semantic Validation

Resolution Validation

Target Validation
```

Các giai đoạn này nên được giữ phân biệt để diagnostics tốt hơn.

---

# 63. Schema Validation

Kiểm tra tính đúng đắn về cấu trúc.

Ví dụ:

```text
required fields

enum values

ID syntax

data types
```

Được implement chủ yếu thông qua:

```text
packages/schemas
```

---

# 64. Reference Validation

Kiểm tra:

```text
publisher exists

package exists

capability exists

preset exists

role exists

policy exists
```

---

# 65. Graph Validation

Kiểm tra:

```text
preset cycles

capability cycles

invalid dependency graph
```

---

# 66. Semantic Validation

Kiểm tra các rule như:

```text
publisher-specific capability IDs forbidden

invalid cardinality combinations

deprecated references

illegal override semantics
```

---

# 67. Resolution Validation

Kiểm tra xem các capability bắt buộc có thực sự resolve được hay không dưới:

```text
catalog

policy

target

version constraints
```

---

# 68. Target Validation

Kiểm tra xem state đã chọn có thể được materialize trên một runtime hay không.

Ví dụ:

```text
selected hook
+
target lacks hook support
=
error or degraded state
```

tùy thuộc vào semantics của requirement.

---

# 69. Kiến trúc Diagnostics

Diagnostics nên là các domain object có cấu trúc thay vì chuỗi văn bản thuần.

Về mặt khái niệm:

```text
code

severity

message

entity

source location

dependency path

details

remediation
```

Điều này cho phép CLI render:

```text
human-readable output
JSON output
CI output
```

từ cùng một tập diagnostics.

---

# 70. Kiến trúc Explainability

Các quyết định resolution nên được ghi lại trong quá trình resolution thay vì được tái dựng theo heuristic sau đó.

Về mặt khái niệm:

```text
Resolution
├── selections
├── decisions
└── diagnostics
```

Điều này cho phép:

```bash
ap explain engineering.testing.tdd
```

mà không cần implement lại logic suy luận của resolver.

---

# 71. Luồng dữ liệu Explainability

```text
Capability Requirement
      ↓
Candidate Generation
      ↓
Policy Decisions
      ↓
Compatibility Decisions
      ↓
Conflict Decisions
      ↓
Selection Decision
      ↓
Resolution Trace
```

Mỗi giai đoạn quan trọng đều đóng góp thông tin trace.

---

# 72. Kiến trúc Search

Search nên hoạt động chủ yếu trên các index được generate thay vì liên tục quét toàn bộ raw manifest.

Ví dụ:

```text
generated/catalog/search-index.json
```

Index có thể bao gồm:

```text
capabilities

aliases

presets

roles

publishers

packages

components
```

Metadata canonical vẫn là authoritative.

---

# 73. Generated Artifacts

Thư mục generated được khuyến nghị:

```text
generated/
├── catalog/
│   ├── components.json
│   └── search-index.json
└── targets/
    ├── claude-code/
    ├── codex/
    └── ...
```

Các file được generate phải có thể generate lại hoàn toàn.

---

# 74. Marketplace Manifest được generate

Đối với distribution cho Claude Code:

```text
.claude-plugin/marketplace.json
```

nên được xem là output dẫn xuất nếu khả thi.

Nguồn của nó nên đến từ:

```text
catalog

native plugins

package metadata

distribution lock
```

thay vì được duy trì thủ công như một nguồn authoritative độc lập.

---

# 75. Phân cấp Source-of-Truth

Phân cấp được ưu tiên là:

```text
Authoritative Source
       ↓
Normalized / Generated Metadata
       ↓
Target-Specific Generated Artifacts
       ↓
Consumer Managed State
```

Ví dụ:

```text
catalog/publishers/
catalog/packages/
catalog/capabilities/
presets/
roles/
policies/
plugins/native/

        ↓

generated/

        ↓

.claude-plugin/marketplace.json

        ↓

agent-plugins.lock
runtime managed state
```

---

# 76. Kiến trúc Repository

Monorepo được khuyến nghị:

```text
agent-plugins/
├── apps/
│   └── cli/
│
├── packages/
│   ├── core/
│   ├── schemas/
│   ├── source-adapters/
│   └── target-adapters/
│
├── catalog/
│   ├── publishers/
│   ├── packages/
│   └── capabilities/
│
├── presets/
├── roles/
├── policies/
│
├── plugins/
│   └── native/
│
├── generated/
│
├── tests/
├── examples/
├── docs/
└── tools/
```

Semantics chi tiết của từng thư mục thuộc về `repository-structure.md`.

---

# 77. Ranh giới Package

V1 nên giữ ranh giới package nội bộ ở mức thô.

Khuyến nghị:

```text
apps/cli

packages/core

packages/schemas

packages/source-adapters

packages/target-adapters
```

Tránh tạo hàng chục package quá sớm.

---

# 78. packages/core

`packages/core` sở hữu:

```text
domain model

catalog interfaces

graph logic

resolver

policy evaluation

conflict resolution

lockfile domain logic

diagnostics

explainability
```

Nó nên có tối thiểu dependency.

---

# 79. packages/schemas

`packages/schemas` sở hữu:

```text
manifest schemas

runtime validators

schema versions

serialization contracts
```

Các schema có thể có:

```text
publisher.schema.json
package.schema.json
capability.schema.json
preset.schema.json
role.schema.json
policy.schema.json
project.schema.json
lockfile.schema.json
```

---

# 80. packages/source-adapters

Sở hữu phần tích hợp upstream.

Cấu trúc có thể có:

```text
source-adapters/
└── src/
    ├── github/
    ├── claude-marketplace/
    ├── agent-skills/
    ├── superpowers/
    ├── ecc/
    └── filesystem/
```

Các adapter này phụ thuộc vào core contract.

Core không được phụ thuộc vào các adapter cụ thể.

---

# 81. packages/target-adapters

Sở hữu phần tích hợp runtime.

Cấu trúc có thể có:

```text
target-adapters/
└── src/
    ├── claude-code/
    ├── codex/
    ├── gemini/
    ├── opencode/
    └── hermes/
```

Chỉ Claude Code cần được implement trong V1.

---

# 82. apps/cli

Sở hữu:

```text
oclif commands

Ink rendering

interactive prompts

CLI error formatting

exit codes
```

Nó phụ thuộc vào các API application/core.

CLI không được trở thành cách duy nhất để sử dụng core.

---

# 83. Hướng phụ thuộc nội bộ

Khuyến nghị:

```text
schemas
   ↑

core
   ↑
   ├──────── source-adapters
   ├──────── target-adapters
   │
   └──────── application orchestration
                ↑
               CLI
```

Cụ thể hơn:

```text
CLI
→ Core/Application

Source Adapters
→ Core contracts

Target Adapters
→ Core contracts

Core
→ Schemas / minimal shared utilities
```

Không bao giờ:

```text
Core
→ CLI

Core
→ Claude adapter

Core
→ GitHub adapter
```

---

# 84. Dependency Rule

Dependency nên hướng vào trong, về phía các abstraction ổn định.

```text
runtime-specific
      ↓
application
      ↓
domain
```

Module càng ở trung tâm thì càng nên chứa ít giả định bên ngoài.

---

# 85. Ranh giới Serialization

Domain object và tài liệu YAML/JSON không nhất thiết phải là cùng một kiểu.

Luồng được khuyến nghị:

```text
Raw YAML
   ↓
Schema Validation
   ↓
DTO / Manifest
   ↓
Domain Normalization
   ↓
Domain Objects
```

Điều này tránh việc coupling logic resolver trực tiếp với cấu trúc serialized thô.

---

# 86. Manifest Versioning

Manifest nên bao gồm một version.

Version khởi đầu được khuyến nghị:

```text
agent-plugins.dev/v1alpha1
```

Version thuộc về serialization contract chứ không phải semantic domain identity.

---

# 87. Kiến trúc Migration

Các thay đổi schema trong tương lai có thể sử dụng:

```text
v1alpha1
→ v1beta1
→ v1
```

Migration nên diễn ra trước domain normalization.

Về mặt khái niệm:

```text
Old Manifest
    ↓
Migration
    ↓
Current Manifest DTO
    ↓
Domain Model
```

---

# 88. Kiến trúc Update

Update được cố ý tách biệt khỏi sync.

```text
Sync
→ reconcile desired project state

Update
→ reconsider upstream state
```

Điều này ngăn chặn dependency churn ngoài ý muốn.

---

# 89. Update Check Pipeline

Về mặt khái niệm:

```text
Current Distribution Lock
       ↓
Source Adapters
       ↓
Available Upstream State
       ↓
Normalize
       ↓
Compare
       ↓
Impact Analysis
       ↓
Update Report
```

Không có thay đổi nào xảy ra trong quá trình:

```text
ap update --check
```

---

# 90. Update Apply Pipeline

```text
Review Update
      ↓
Select New Upstream Ref
      ↓
Regenerate Discovery Metadata
      ↓
Validate Catalog
      ↓
Run Resolver Tests
      ↓
Run Adapter Tests
      ↓
Update Distribution Lock
      ↓
Regenerate Derived Artifacts
```

Đây là một thao tác dành cho maintainer.

---

# 91. Update Impact Analysis

Impact analysis nên kết nối:

```text
Publisher Change
    ↓
Package Change
    ↓
Component Change
    ↓
Capability Mapping
    ↓
Preset Impact
    ↓
Role Impact
```

Các reverse index được generate có thể giúp việc này hiệu quả.

---

# 92. Kiến trúc Local-First

Chức năng cốt lõi không nên yêu cầu:

```text
hosted API

user account

central database

LLM service
```

Repository local và CLI nên đủ cho:

```text
validation

resolution

sync

explain

diff

doctor
```

với điều kiện có quyền truy cập vào package source khi cần tải về.

---

# 93. Không yêu cầu database

V1 không yêu cầu database.

State chính có thể vẫn là:

```text
YAML

JSON

lockfiles

generated indexes
```

Database có thể trở nên hữu ích sau này cho:

```text
large registry search

hosted services

analytics
```

nhưng không được định hình kiến trúc V1.

---

# 94. Không yêu cầu runtime service

Resolver nên hoạt động như một thao tác CLI/library.

V1 không yêu cầu daemon chạy lâu dài.

---

# 95. Không dùng LLM trong core resolution

Kiến trúc phải giữ được:

```text
deterministic core
```

LLM sau này có thể hỗ trợ:

```text
capability classification suggestions

catalog review

documentation

project recommendations
```

nhưng output của nó không được là điều kiện bắt buộc để tái tạo một Resolution.

---

# 96. Kiến trúc tương lai có AI hỗ trợ

Sự hỗ trợ của AI trong tương lai nên nằm bên ngoài deterministic core.

Được ưu tiên:

```text
LLM Recommendation Layer
       ↓
Suggested Manifest Change
       ↓
User / Policy Approval
       ↓
Deterministic Resolver
```

Tránh:

```text
Resolver
→ ask LLM which package wins
```

---

# 97. Kiến trúc Security

Security nên được giải quyết thông qua:

```text
provenance

trust metadata

policy filtering

security-sensitive component classification

integrity metadata

explicit update review
```

Project không cung cấp một execution sandbox hoàn chỉnh.

---

# 98. Security Boundary

Ranh giới rủi ro cao nhất nằm trước materialization.

Về mặt khái niệm:

```text
External Source
    ↓
Discovered Component
    ↓
Curated Metadata
    ↓
Policy Evaluation
    ↓
Selected Component
    ↓
Materialization
```

Hành vi thực thi được của third-party không được bỏ qua luồng này.

---

# 99. Kiến trúc Integrity

Khi có thể:

```text
human version
    ↓
immutable reference
    ↓
integrity metadata
```

nên được ghi nhận trong quá trình locking.

Ví dụ:

```text
release v6.4
→ commit abc123

archive
→ sha256 ...
```

---

# 100. Kiến trúc Provenance

Provenance nên được truyền qua toàn bộ pipeline.

```text
Publisher
    ↓
Package
    ↓
Component
    ↓
Candidate
    ↓
Selected Implementation
    ↓
Lockfile
```

Materialization không bao giờ được xóa metadata nguồn gốc khỏi các bản ghi managed-state khi metadata đó cần cho diagnostics.

---

# 101. Kiến trúc xử lý lỗi

Lỗi nên được phân loại.

Các nhóm được khuyến nghị:

```text
configuration

validation

resolution

policy

compatibility

source

materialization

update

internal
```

Exit code của CLI sau này có thể được map với các nhóm này.

---

# 102. Nguyên tắc xử lý thất bại

Ưu tiên fail sớm ở tầng semantic cao nhất có thể.

Ví dụ:

```text
unknown capability
```

nên fail trước:

```text
target adapter installation
```

Điều này giúp lỗi dễ hiểu.

---

# 103. Thất bại một phần

Với state bắt buộc:

```text
fail explicitly
```

Với state tùy chọn:

```text
emit warning / degraded result
```

Không được âm thầm bỏ qua các capability bắt buộc đã được yêu cầu.

---

# 104. Kiến trúc Testing

Testing nên phản ánh các ranh giới kiến trúc.

```text
Schema Tests

Domain Unit Tests

Graph Tests

Resolver Tests

Policy Tests

Adapter Contract Tests

Golden Output Tests

Integration Tests

CLI E2E
```

---

# 105. Resolver Unit Test

Resolver test nên pure bất cứ khi nào có thể.

Input:

```text
in-memory catalog

project

policy

target
```

Output:

```text
Resolution
```

Không nên yêu cầu filesystem hay network thật.

---

# 106. Golden Adapter Test

Target adapter nên sử dụng fixture và golden snapshot.

Ví dụ:

```text
Resolution Fixture
      ↓
Claude Adapter
      ↓
Generated Files
      ↓
Golden Expected Output
```

Điều này đặc biệt quan trọng đối với các runtime format.

---

# 107. Source Adapter Test

Source adapter nên được test với các fixture đã được capture thay vì yêu cầu upstream service thật cho mọi test.

Các live integration test có thể chạy riêng.

---

# 108. Integration Test

Một integration test quan trọng của V1 nên bao phủ:

```text
Project Manifest
      ↓
Catalog
      ↓
Resolution
      ↓
Lockfile
      ↓
Claude Adapter
      ↓
Materialized Fixture Environment
```

---

# 109. End-to-End Test

CLI E2E nên validate:

```bash
ap init
ap sync
ap explain
ap diff
ap doctor
```

trên một fixture được kiểm soát.

---

# 110. Kiến trúc CI

Về lâu dài CI nên chạy:

```text
lint

typecheck

unit tests

schema validation

catalog validation

graph validation

resolver tests

adapter tests

integration tests

generated artifact check

build
```

Việc kiểm tra generated artifact có thể sử dụng:

```text
generate
git diff --exit-code
```

---

# 111. Các bất biến kiến trúc

Hệ thống phải giữ được:

```text
1. Core capabilities are publisher-independent.

2. Core capabilities are target-independent.

3. Roles compose Presets.

4. Presets compose Capabilities.

5. Resolution occurs before materialization.

6. Policy eligibility occurs before priority selection.

7. Source discovery is separate from curation.

8. Curation is separate from project resolution.

9. Components are selected semantically.

10. Packages are installed physically.

11. Package installation does not imply all contained Components are active.

12. Existing valid lock state is preserved during normal sync.

13. Update and sync remain separate operations.

14. Source adapters normalize upstream formats.

15. Target adapters preserve runtime-native formats.

16. Generated artifacts are never authoritative.

17. CLI contains minimal business logic.

18. Resolver is deterministic.

19. Core resolution does not require an LLM.

20. Managed state is explicitly bounded.
```

---

# 112. Phạm vi kiến trúc V1

V1 nên implement:

```text
Domain entities

Schema validation

Catalog loading

Preset/Role expansion

Dependency graphs

Policy evaluation

Capability resolver

Conflict resolution

Resolution decisions

Project lockfile

Distribution lock support

Source adapter abstraction

Claude Code target adapter

Materialization planning

CLI

Diagnostics

Testing
```

---

# 113. Phạm vi Source Adapter của V1

V1 không cần tổng quát hóa hoàn hảo mọi hệ sinh thái upstream.

Một tập khởi đầu thực tế:

```text
filesystem

GitHub / Git source

Claude marketplace

Superpowers

ECC
```

Matt Pocock và các publisher khác có thể sử dụng adapter generic khi có thể.

---

# 114. Phạm vi Target của V1

Bắt buộc:

```text
Claude Code
```

Được dành chỗ về mặt kiến trúc:

```text
Codex
Gemini
OpenCode
Hermes
```

Không implement các abstraction layer phức tạp nhưng rỗng chỉ để phục vụ các target giả định.

Target port nên giữ ở mức tối thiểu cho đến khi có adapter thật thứ hai kiểm chứng nó.

---

# 115. Quy tắc phát triển kiến trúc

Khi giới thiệu một abstraction mới, hãy hỏi:

```text
Does V1 already have two real implementations requiring this abstraction?
```

Nếu không:

```text
prefer the simpler design
```

trừ khi domain model yêu cầu rõ ràng ranh giới đó.

---

# 116. Tránh kiến trúc framework quá sớm

Không đưa vào:

```text
microservices

event bus

CQRS

distributed cache

database repositories

plugin runtime kernel

service mesh
```

cho V1.

Hệ thống kỳ vọng chủ yếu là:

```text
local CLI
+
library
+
declarative catalog
+
filesystem state
```

---

# 117. Architecture Decision Records

Các quyết định kiến trúc quan trọng nên được ghi lại dưới dạng ADR.

Các ADR ban đầu:

```text
0001-capability-based-resolution.md

0002-publisher-package-component.md

0003-composition-over-inheritance.md

0004-no-addon-entity.md

0005-source-target-adapters.md

0006-dual-lock-model.md
```

Các ADR có khả năng bổ sung:

```text
0007-deterministic-resolver.md

0008-generated-artifacts-not-source-of-truth.md

0009-claude-code-first-target.md
```

---

# 118. Ví dụ — Luồng Resolution đầy đủ

```text
agent-plugins.yaml

role:
frontend-engineer

presets:
stacks/nextjs
engineering/security

policy:
default

target:
claude-code

        ↓

Project Loader

        ↓

Role Expansion

frontend-engineer
→ workflow/core
→ engineering/core
→ domains/frontend
→ stacks/typescript

        ↓

Preset Expansion

        ↓

Capability Requirements

workflow.planning
engineering.testing.tdd
engineering.debugging
frontend.design
security.review
...

        ↓

Capability Graph

        ↓

Candidate Generation

TDD:
Superpowers
Matt Pocock
ECC

        ↓

Policy Filter

        ↓

Target Compatibility

        ↓

Priority / Conflict Resolution

        ↓

Selected Components

        ↓

Package Deduplication

        ↓

Version Resolution

        ↓

Resolution

        ↓

agent-plugins.lock

        ↓

Claude Code Adapter

        ↓

Materialization Plan

        ↓

Sync

        ↓

Managed Claude Code State
```

---

# 119. Ví dụ — Luồng Explainability

```bash
ap explain engineering.testing.tdd
```

Application:

```text
Load Project Lock / Resolution
        ↓
Find Capability
        ↓
Read Requirement Provenance
        ↓
Read Candidate Decisions
        ↓
Render Explanation
```

Output có thể có:

```text
Capability:
engineering.testing.tdd

Required by:
frontend-engineer
→ engineering/core

Candidates:
Superpowers
Matt Pocock
ECC

Selected:
Superpowers

Why:
allowed by policy
supported on Claude Code
priority 100
```

Không cần một resolver implementation riêng cho explain.

---

# 120. Ví dụ — Luồng Update

```text
catalog.lock
    ↓
Current Superpowers ref

Source Adapter
    ↓
New upstream ref

Diff
    ↓

Components changed

    ↓

Capability Impact

    ↓

Preset / Role Impact

    ↓

Maintainer Review

    ↓

Update catalog.lock

    ↓

Regenerate

    ↓

Test
```

Các consumer project giữ nguyên cho đến khi lockfile của chính chúng được update một cách có chủ đích.

---

# 121. Tóm tắt kiến trúc

Kiến trúc có thể được tóm tắt như sau:

```text
External Ecosystems
        ↓
Source Adapters
        ↓
Normalized Metadata
        ↓
Curated Catalog
        ↓
Capabilities
        ↓
Presets / Roles / Project
        ↓
Policy-Aware Resolver
        ↓
Resolution
        ↓
Lockfile
        ↓
Target Adapter
        ↓
Materialization Plan
        ↓
Managed Runtime State
```

Hệ thống được cố ý chia thành:

```text
understand upstream
        ↓
model semantics
        ↓
compose intent
        ↓
resolve deterministically
        ↓
materialize natively
```

---

# 122. Kiến trúc trong một câu

> **`agent-plugins` là một resolver local-first, capability-driven, được xây dựng quanh một deterministic core, một curated catalog, các source adapter để normalize các hệ sinh thái bên ngoài, và các target adapter để materialize an toàn các agent environment reproducible vào các runtime native.**