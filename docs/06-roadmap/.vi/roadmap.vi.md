# Roadmap

**Trạng thái:** Đang hoạt động
**Phiên bản:** 0.1.0
**Cập nhật lần cuối:** 2026-09-21

---

# 1. Mục đích

Tài liệu này định nghĩa roadmap triển khai cho project Agent Plugins.

Roadmap chuyển kiến trúc và các đặc tả thành một trình tự bàn giao tăng dần.

Project nên phát triển theo hướng sau:

```text
Canonical Model
      ↓
Validation
      ↓
Catalog
      ↓
Resolution
      ↓
Policy
      ↓
Lockfile
      ↓
Adapters
      ↓
CLI
      ↓
Source Integration
      ↓
Update System
      ↓
Ecosystem
```

Roadmap có chủ đích ưu tiên tính đúng đắn, tính tất định và khả năng bảo trì hơn là tích lũy nhanh các integration.

---

# 2. Định hướng sản phẩm

Agent Plugins nên trở thành một hệ thống trung lập về công cụ để quản lý các capability AI-agent có thể tái sử dụng trên nhiều project và runtime.

Nó nên hỗ trợ:

```text
first-party content
+
vendor content
+
community content
+
project overlays
+
profiles
+
presets
+
policies
+
multiple runtime targets
```

trong khi vẫn duy trì một model chuẩn duy nhất.

Dài hạn:

```text
Skills
Agents
Prompts
Commands
Hooks
Tool configurations
Context/instructions
        │
        ▼
Canonical Capability Layer
        │
        ▼
Profiles / Presets / Policies
        │
        ▼
Resolver + Lockfile
        │
        ▼
Target Adapters
        │
        ├── Claude
        ├── Codex
        ├── Gemini
        ├── OpenCode
        ├── Hermes
        └── future runtimes
```

---

# 3. Nguyên tắc của Roadmap

Quá trình phát triển MUST tuân theo các nguyên tắc sau.

## 3.1 Core trước integration

Không xây dựng nhiều runtime integration trước khi domain chuẩn ổn định.

## 3.2 Đặc tả trước implementation

Hành vi của các subsystem chính SHOULD được định nghĩa trong một spec trước khi triển khai.

## 3.3 First-party trước tiên

Nội dung first-party là nơi kiểm chứng ban đầu.

Việc ingest nội dung từ vendor và cộng đồng sẽ đến sau.

## 3.4 Tính tất định trước sự tiện lợi

Ưu tiên:

```text
resolve
plan
build
install
```

trước khi triển khai các command tiện lợi như:

```text
sync
auto-update
auto-discovery
```

## 3.5 Tường minh thay vì "phép thuật"

Tránh hành vi ngầm định liên quan đến:

- dependency resolution;
- truy cập mạng;
- cập nhật package;
- xóa file;
- chuyển đổi target.

## 3.6 Capability tăng dần

Mỗi phase SHOULD để lại repository ở trạng thái có thể sử dụng được.

---

# 4. Tổng quan milestone

Trình tự milestone được khuyến nghị:

```text
M0  Foundation
M1  Canonical Domain
M2  Catalog & Validation
M3  Resolver
M4  Policy & Lockfile
M5  Target Adapter Framework
M6  Claude Adapter
M7  CLI MVP
M8  Codex Adapter
M9  Vendor & Source Model
M10 Update Engine
M11 Profiles & Presets UX
M12 Multi-Target Production Readiness
M13 Community Ecosystem
M14 Advanced Tooling
```

---

# 5. Phase 0 — Nền tảng

## Mục tiêu

Thiết lập repository, các tiêu chuẩn kỹ thuật, cấu trúc tài liệu và ranh giới của project.

## Sản phẩm bàn giao

```text
README.md
AGENTS.md
CONTRIBUTING.md

docs/
├── problem.md
├── problem.vi.md
├── vision.md
├── goals.md
├── non-goals.md
├── requirements.md
└── ...
```

Công cụ cho repository:

```text
TypeScript

package manager
workspace configuration

Biome
TypeScript strict mode

Vitest

Changesets or equivalent

CI
pre-commit / pre-push checks
```

Khung workspace được khuyến nghị:

```text
packages/
├── core/
├── cli/
├── adapters/
└── schemas/

plugins/
profiles/
presets/

docs/
tests/
```

## Tiêu chí hoàn thành

- repository build thành công;
- pipeline lint/typecheck/test đã tồn tại;
- CI pass;
- cấu trúc tài liệu kiến trúc đã tồn tại;
- ranh giới package đã được định nghĩa.

---

# 6. Phase 1 — Domain Model chuẩn

## Mục tiêu

Triển khai bộ từ vựng domain cốt lõi, độc lập với mọi runtime.

Các đặc tả chính:

```text
domain-model.md
terminology.md
capability-model.md
manifest-spec.md
```

## Các thực thể cốt lõi

Triển khai type cho:

```text
Package
Component
Capability
Publisher
Source

Skill
Agent
Prompt
Command
Hook

Preset
Profile

Policy

CanonicalReference
```

Ví dụ:

```ts
type CanonicalReference =
  | `plugin:${string}`
  | `skill:${string}`
  | `agent:${string}`
  | `prompt:${string}`
  | `command:${string}`
  | `hook:${string}`
```

## Sản phẩm bàn giao

```text
packages/core/
├── domain/
├── identifiers/
├── capabilities/
└── errors/
```

Schema:

```text
package manifest
component manifest
profile
preset
policy
```

## Tiêu chí hoàn thành

Core model MUST:

- không chứa logic riêng cho Claude;
- không chứa logic riêng cho Codex;
- không chứa giả định về filesystem;
- sử dụng ID chuẩn;
- hỗ trợ khai báo dependency;
- hỗ trợ metadata của capability.

---

# 7. Phase 2 — Schema, Catalog & Validation

## Mục tiêu

Tạo một repository chuẩn hợp lệ và có thể truy vấn được.

Các đặc tả chính:

```text
catalog-spec.md
manifest-spec.md
repository-structure.md
source-of-truth.md
```

## Triển khai

### Validation schema

```text
manifest validator
profile validator
preset validator
policy validator
```

### Repository scanner

Phát hiện:

```text
plugins/
skills/
agents/
prompts/
hooks/
profiles/
presets/
```

### Catalog builder

Đầu ra về mặt khái niệm:

```ts
interface Catalog {
  packages: Map<PackageId, Package>
  components: Map<ComponentId, Component>
  profiles: Map<ProfileId, Profile>
  presets: Map<PresetId, Preset>
}
```

### Validation tham chiếu

Phát hiện:

```text
duplicate IDs
missing dependencies
invalid references
invalid manifests
cyclic static structures
```

## Hỗ trợ CLI

Command nội bộ/dev ban đầu MAY cung cấp:

```bash
agent-plugins validate

agent-plugins catalog list

agent-plugins catalog show
```

## Tiêu chí hoàn thành

Repository có thể trả lời:

```text
What packages exist?

What components exist?

Where did they come from?

Are all references valid?
```

---

# 8. Phase 3 — Resolver

## Mục tiêu

Xây dựng engine tất định biến intent của project thành một graph chuẩn có hiệu lực.

Đặc tả chính:

```text
resolution-spec.md
```

## Đầu vào của Resolver

```text
catalog
profile
preset
project config
dependency constraints
overlays
```

## Đầu ra của Resolver

```ts
interface ResolvedEnvironment {
  profile: ProfileId

  packages: ResolvedPackage[]
  components: ResolvedComponent[]

  edges: ResolutionEdge[]
  diagnostics: Diagnostic[]
}
```

## Các tính năng Resolution

V1:

```text
direct dependencies
transitive dependencies
preset composition
profile inheritance
deduplication
stable ordering
conflict detection
```

Sau này:

```text
optional dependencies
conditional capabilities
complex version constraints
```

## Khả năng giải thích

Xây dựng provenance trong quá trình resolution.

Ví dụ:

```text
frontend
└── preset:web-core
    └── plugin:typescript
        └── skill:typescript
```

## Tiêu chí hoàn thành

Với các đầu vào giống hệt nhau:

```text
resolver(input) = deterministic graph
```

Resolution MUST NOT:

- render file target;
- fetch tài nguyên mạng;
- cài đặt bất cứ thứ gì.

---

# 9. Phase 4 — Policy Engine

## Mục tiêu

Áp dụng các ràng buộc của tổ chức và project sau khi resolution.

Đặc tả chính:

```text
policy-spec.md
```

## Các capability Policy V1

Hỗ trợ:

```text
allow package
deny package

allow component type
deny component type

source restrictions

capability restrictions

target restrictions
```

Ví dụ:

```yaml
deny:
  sources:
    - untrusted-community

  capabilities:
    - executable-hook
```

## Pipeline

```text
Resolved Graph
      ↓
Policy Evaluation
      ↓
Allowed Graph
```

## Tiêu chí hoàn thành

Policy MUST:

- tạo ra diagnostics có cấu trúc;
- không bao giờ âm thầm loại bỏ nội dung quan trọng;
- tách biệt khỏi logic của resolver.

---

# 10. Phase 5 — Lockfile

## Mục tiêu

Làm cho resolution có thể tái tạo được.

Đặc tả chính:

```text
lockfile-spec.md
```

Lockfile SHOULD ghi lại:

```text
resolved package versions

source revisions

integrity hashes

dependency graph identity

adapter versions

schema versions
```

Về mặt khái niệm:

```yaml
lockfileVersion: 1

packages:
  superpowers:
    version: 1.2.0

sources:
  vendor:
    revision: abc123

targets:
  claude:
    adapterVersion: 1.0.0
```

## Command

```bash
agent-plugins lock show
agent-plugins lock verify
```

## Tiêu chí hoàn thành

Một môi trường đã lock có thể được tái tạo mà không chọn phiên bản mới.

---

# 11. Phase 6 — Adapter Framework

## Mục tiêu

Triển khai abstraction adapter trước khi triển khai nhiều target.

Đặc tả chính:

```text
adapter-spec.md
```

Tạo:

```text
packages/adapters/
├── source/
└── target/
```

Adapter SDK:

```text
packages/adapter-kit/
├── types.ts
├── diagnostics.ts
├── render-plan.ts
├── validation.ts
└── test-kit.ts
```

Contract cốt lõi của Target Adapter:

```ts
interface TargetAdapter {
  metadata(): AdapterMetadata

  capabilities(): TargetCapabilities

  validate(
    input: ResolvedEnvironment
  ): ValidationResult

  plan(
    input: ResolvedEnvironment
  ): RenderPlan

  render(
    plan: RenderPlan
  ): RenderedArtifact[]
}
```

## Sản phẩm bàn giao

- adapter manifest;
- khai báo capability;
- render plan;
- conformance test;
- các helper render tất định.

## Tiêu chí hoàn thành

Một adapter giả/thử nghiệm pass bộ conformance test dùng chung cho adapter.

---

# 12. Phase 7 — Claude Adapter

## Mục tiêu

Sử dụng Claude làm target production đầu tiên để kiểm chứng kiến trúc.

Lý do:

Hệ sinh thái của Claude cung cấp các primitive phong phú:

```text
skills
agents
commands
hooks
project instructions
```

Điều này khiến nó trở thành một bài kiểm tra sức chịu tải hữu ích cho model chuẩn.

## Triển khai các ánh xạ

Ví dụ:

```text
skill
→ .claude/skills/<id>/SKILL.md

agent
→ .claude/agents/<id>.md

command
→ .claude/commands/<id>.md
```

Metadata native của target SHOULD được adapter sinh ra.

## Kiểm thử

Golden fixture:

```text
basic skill
multiple skills
agent
command
hook
full plugin
collision
unsupported metadata
```

## Tiêu chí hoàn thành

Một profile chuẩn có thể render ra một cấu hình project Claude hoàn chỉnh và hợp lệ.

---

# 13. Phase 8 — CLI MVP

## Mục tiêu

Cung cấp pipeline ứng dụng ổn định thông qua CLI.

Đặc tả chính:

```text
cli-spec.md
```

Công nghệ được khuyến nghị:

```text
TypeScript
+
oclif
+
Ink
```

Các command V1:

```text
init

catalog list
catalog show

profile list
profile show

resolve

plan

build

install

diff

validate

doctor

lock verify

adapter list
adapter show

version
```

## Luồng cốt lõi

```bash
agent-plugins init

agent-plugins resolve

agent-plugins plan --target claude

agent-plugins install --target claude
```

## Kiến trúc CLI

```text
CLI
 ↓
Application services
 ↓
Core
```

KHÔNG PHẢI:

```text
CLI
 ↓
domain logic
 ↓
filesystem
```

## Tiêu chí hoàn thành

Người dùng có thể khởi tạo một project và cài đặt một profile first-party vào Claude hoàn toàn thông qua CLI.

---

# 14. Milestone MVP

Tại thời điểm này, sản phẩm có ý nghĩa đầu tiên đã hoàn thành.

Phạm vi MVP:

```text
Canonical manifests

Catalog

Profiles

Presets

Resolver

Policy

Lockfile

Claude target adapter

CLI

First-party plugins
```

Luồng được hỗ trợ:

```text
first-party package
      ↓
profile
      ↓
resolver
      ↓
policy
      ↓
lockfile
      ↓
Claude adapter
      ↓
install
```

Không bắt buộc cho MVP:

```text
GitHub marketplace
community package discovery
automatic remote updates
multiple target adapters
GUI
TUI explorer
remote registry
```

---

# 15. Phase 9 — Codex Adapter

## Mục tiêu

Kiểm chứng rằng kiến trúc chuẩn thực sự độc lập với target.

Việc thêm Codex MUST NOT đòi hỏi thay đổi:

```text
canonical package manifests
profiles
presets
resolver semantics
```

Chỉ phần biểu diễn target SHOULD thay đổi.

## Công việc dự kiến

```text
Codex capability mapping

project instructions mapping

skills mapping

agent mapping if supported

unsupported capability diagnostics
```

## Bài kiểm tra kiến trúc then chốt

Phase này trả lời câu hỏi:

> Có phải chúng ta đã vô tình thiết kế một abstraction cho Claude thay vì một abstraction chuẩn?

Bất kỳ thiết kế lại lớn nào đối với model chuẩn do Codex đòi hỏi SHOULD kích hoạt một đợt review kiến trúc.

## Tiêu chí hoàn thành

Cùng một Profile có thể sinh ra:

```text
Claude output

and

Codex output
```

từ một graph đã resolve.

---

# 16. Phase 10 — Multi-Target Build

## Mục tiêu

Build nhiều môi trường target từ một lần resolution chuẩn.

Ví dụ:

```bash
agent-plugins build \
  --profile frontend \
  --target claude \
  --target codex
```

Pipeline:

```text
Profile
   ↓
Resolver
   ↓
Resolved Graph
   ├── Claude Adapter
   └── Codex Adapter
```

Resolver MUST NOT chạy dependency resolution riêng cho từng target.

## Tiêu chí hoàn thành

Việc render đa target hoạt động một cách tất định.

---

# 17. Phase 11 — Nền tảng Source Adapter

## Mục tiêu

Đưa vào việc ingest package bên ngoài.

Các Source Adapter ban đầu:

```text
local
git
```

Sau này:

```text
github
marketplace
community-registry
```

Quy tắc kiến trúc chính:

```text
External Source
      ↓
Source Adapter
      ↓
Canonical Package
```

## Triển khai

```text
fetch
normalize
verify
cache
provenance
```

Package bên ngoài MUST trở thành các đối tượng chuẩn trước khi resolution.

## Tiêu chí hoàn thành

Một package từ Git repository có thể được chuẩn hóa và được resolver thông thường sử dụng.

---

# 18. Phase 12 — Vendor Layer

## Mục tiêu

Hỗ trợ các package upstream được tuyển chọn mà không sửa trực tiếp mã nguồn vendor.

Model repository:

```text
first-party/
vendor/
overlays/
```

Ví dụ:

```text
Vendor source
     ↓
Imported canonical content
     ↓
Overlay
     ↓
Effective package
```

Các trường hợp sử dụng:

```text
Superpowers

Matt Pocock skills

ECC

community agent repositories
```

Hệ thống SHOULD bảo toàn:

```text
upstream provenance
local modifications
update compatibility
```

## Tiêu chí hoàn thành

Nội dung vendor có thể được cập nhật mà không phá hủy các tùy chỉnh cục bộ.

---

# 19. Phase 13 — Overlay Engine

## Mục tiêu

Cho phép các chỉnh sửa cục bộ có kiểm soát đối với các package được import.

Các thao tác overlay MAY hỗ trợ:

```text
add
replace
merge
remove
```

Ví dụ:

```text
vendor agent
   +
organization instructions
   +
personal additions
```

Overlay MUST tách biệt với hành vi của Target Adapter.

```text
Overlay
    = semantic change

Adapter
    = representation change
```

## Tiêu chí hoàn thành

Các bản cập nhật package upstream có thể được áp dụng trong khi vẫn bảo toàn các overlay cục bộ.

---

# 20. Phase 14 — Update Engine

## Mục tiêu

Phát triển an toàn các phiên bản và revision của package bên ngoài.

Đặc tả chính:

```text
update-spec.md
```

Các command:

```bash
agent-plugins update

agent-plugins update superpowers

agent-plugins update --dry-run
```

Luồng update:

```text
locked revision
      ↓
discover candidate
      ↓
compatibility check
      ↓
resolve
      ↓
policy
      ↓
preview
      ↓
lockfile update
```

## Update MUST NOT

tự động:

```text
install target artifacts
execute package code
overwrite overlays
```

## Tiêu chí hoàn thành

Các dependency bên ngoài có thể được cập nhật an toàn với một kế hoạch thay đổi hiển thị rõ ràng.

---

# 21. Phase 15 — Hoàn thiện hệ thống Profile

## Mục tiêu

Biến Profile thành abstraction cấu hình chính hướng tới người dùng.

Các ví dụ profile ban đầu:

```text
software-engineer

frontend
backend

product-manager

second-brain
```

Kế thừa profile:

```text
engineering-base
├── frontend
├── backend
└── fullstack
```

Ví dụ:

```text
frontend
    extends engineering-base
    + web preset
    + frontend quality preset
```

## Tiêu chí hoàn thành

Người dùng thông thường SHOULD hiếm khi cần tự chọn từng skill riêng lẻ.

---

# 22. Phase 16 — Thư viện Preset

## Mục tiêu

Tạo các gói capability có thể tái sử dụng.

Ví dụ:

```text
mental-models

typescript

frontend-quality

backend-quality

testing

security

documentation

product-management

second-brain
```

Preset SHOULD:

- có thể compose;
- tương đối nhỏ;
- hướng theo capability;
- độc lập với target.

Tránh các preset nguyên khối chứa mọi thứ.

---

# 23. Phase 17 — Thư viện nội dung First-Party

## Mục tiêu

Xây dựng một lớp nội dung được tuyển chọn với chất lượng cao.

Cấu trúc được khuyến nghị:

```text
first-party/
├── mental-models/
├── engineering/
├── product/
├── knowledge/
├── research/
└── operations/
```

Các nhóm capability tiềm năng:

```text
Mental Models

Software Engineering

Frontend Engineering

Backend Engineering

Architecture

Testing

Security

DevOps

Product Management

Research

Writing

Second Brain

Knowledge Management
```

First-party SHOULD ưu tiên chất lượng hơn số lượng.

---

# 24. Phase 18 — Hoàn thiện Capability Resolution

## Mục tiêu

Chuyển từ composition dựa trên package sang composition nhận biết capability.

Ví dụ:

```yaml
requires:
  - capability: code-review

prefers:
  - capability: typescript-analysis
```

Resolver MAY cuối cùng sẽ chọn publisher.

Ví dụ:

```text
Capability:
  code-review

Publishers:
  first-party/reviewer
  vendor/ecc-reviewer
  community/reviewer
```

Tính năng này SHOULD NOT được triển khai cho đến khi package resolution ổn định.

---

# 25. Phase 19 — Lựa chọn Publisher

## Mục tiêu

Cho phép nhiều implementation của cùng một capability.

Việc lựa chọn MAY phụ thuộc vào:

```text
Profile
Policy
Priority
Trust
Version
Compatibility
User override
```

Ví dụ:

```text
capability: typescript-best-practices

publisher:
  mattpocock
```

hoặc:

```text
publisher:
  first-party
```

Việc lựa chọn Publisher MUST luôn tất định.

---

# 26. Phase 20 — Gemini Adapter

Thêm:

```text
target/gemini
```

Phase này tiếp tục kiểm chứng tính khả chuyển giữa các runtime.

Tiêu chí thành công:

Cùng một package chuẩn SHOULD NOT đòi hỏi thay đổi riêng cho Gemini.

---

# 27. Phase 21 — OpenCode Adapter

Thêm:

```text
target/opencode
```

Tập trung vào:

```text
agent representation
commands
tool configuration
project instructions
```

---

# 28. Phase 22 — Hermes Adapter

Thêm:

```text
target/hermes
```

Các capability tiềm năng:

```text
agents
skills
delegation
tool configuration
memory-related instructions
```

Adapter này MAY có ngữ nghĩa biểu diễn khác biệt đáng kể.

Sự khác biệt đó là điều được dự kiến và nên được giữ tách biệt.

---

# 29. Phase 23 — Ma trận Capability của Adapter

## Mục tiêu

Cung cấp cho người dùng thông tin minh bạch về khả năng tương thích runtime.

Ví dụ:

| Capability | Claude | Codex | Gemini | OpenCode | Hermes |
|---|---|---|---|---|---|
| Skills | Native | Map | Map | Map | Native |
| Agents | Native | Map | Map | Native | Native |
| Commands | Native | Map | Map | Native | Map |
| Hooks | Native | Hạn chế | Hạn chế | Đặc thù | Đặc thù |

Nguồn có thẩm quyền vẫn là metadata của adapter.

CLI có thể cung cấp:

```bash
agent-plugins adapter capabilities claude
```

---

# 30. Phase 24 — Kiểm tra & Debug

Thêm các command như:

```bash
agent-plugins inspect skill:typescript

agent-plugins graph

agent-plugins resolve --why skill:typescript
```

Người dùng SHOULD có thể trả lời:

```text
Why is this installed?

Where did this come from?

Which Profile selected it?

Which Publisher supplied it?

Which target files were generated?

Which policy affected it?
```

Khả năng giải thích là một yếu tố khác biệt cốt lõi.

---

# 31. Phase 25 — TUI phong phú

Khi các primitive của CLI đã ổn định, đưa vào các trải nghiệm terminal phong phú hơn.

Ink MAY cung cấp:

```text
Profile browser

Catalog explorer

Dependency graph explorer

Install preview

Adapter compatibility viewer

Update review
```

Ví dụ:

```text
┌ Profiles ──────────┐
│ frontend           │
│ backend            │
│ second-brain       │
└────────────────────┘

┌ Capabilities ──────┐
│ ✓ TypeScript       │
│ ✓ Testing          │
│ ✓ Code Review      │
│ ! Hooks / Codex    │
└────────────────────┘
```

TUI MUST gọi cùng các application service như các command CLI.

---

# 32. Phase 26 — Wizard Preset cho Project

Cải thiện quá trình onboarding:

```bash
agent-plugins init
```

Luồng ví dụ:

```text
What are you building?

> Software Engineering
  Product Management
  Second Brain
  Research

Role?

> Frontend
  Backend
  Fullstack

Targets?

✓ Claude
✓ Codex
```

Kết quả:

```yaml
profile: frontend

targets:
  - claude
  - codex
```

Wizard ánh xạ intent của người dùng sang cấu hình chuẩn.

Nó không đưa vào ngữ nghĩa domain riêng biệt nào.

---

# 33. Phase 27 — Community Catalog

## Mục tiêu

Hỗ trợ các package cộng đồng có thể khám phá được.

Model khả dĩ:

```text
community catalog
      ↓
metadata index
      ↓
source adapters
      ↓
canonical packages
```

Bắt buộc trước khi ra mắt:

```text
provenance
integrity
trust metadata
license metadata
security review model
```

Không ra mắt việc thực thi package cộng đồng trước khi các ranh giới tin cậy đủ trưởng thành.

---

# 34. Phase 28 — Model tin cậy & bảo mật

Đưa vào phân loại nguồn:

```text
first-party

trusted-vendor

verified-community

community

local
```

Policy MAY áp đặt:

```yaml
sources:
  allow:
    - first-party
    - trusted-vendor
```

Các tính năng khác:

```text
integrity hashes

signature verification

license inspection

executable-content warnings

malicious-path validation
```

---

# 35. Phase 29 — Remote Registry

Một remote registry MAY cuối cùng sẽ cung cấp:

```text
package metadata

versions

capabilities

provenance

compatibility

integrity

documentation
```

Registry MUST NOT trở thành bắt buộc cho việc sử dụng first-party cục bộ.

Hoạt động offline SHOULD vẫn khả thi.

---

# 36. Phase 30 — Xuất bản Package

Các command tiềm năng trong tương lai:

```bash
agent-plugins package validate

agent-plugins package pack

agent-plugins package publish
```

Trước khi hỗ trợ publish, cần định nghĩa:

```text
package format

signing

versioning

ownership

namespace policy
```

---

# 37. Phase 31 — Tích hợp IDE

Các integration khả dĩ:

```text
VS Code

Cursor

JetBrains
```

Các tính năng tiềm năng:

```text
profile selection

catalog browser

generated artifact inspection

resolution graph

update notifications

policy diagnostics
```

Các integration IDE MUST tái sử dụng Application API.

---

# 38. Phase 32 — Giao diện MCP / Agent

Cung cấp nền tảng Agent Plugins cho các AI agent.

Các thao tác tiềm năng:

```text
search catalog

inspect capability

resolve profile

show generated plan

validate configuration
```

Các hành động làm thay đổi trạng thái SHOULD yêu cầu ranh giới quyền hạn chặt chẽ hơn.

---

# 39. Phase 33 — Giao diện Web / Desktop

Chỉ sau khi Application API đã trưởng thành.

Kiến trúc khả dĩ:

```text
                 CLI
                  │
                 TUI
                  │
Application API ──┼── IDE
                  │
                 MCP
                  │
                 Web
                  │
               Desktop
```

Đây là lý do logic domain MUST không bao giờ được nhúng vào CLI.

---

# 40. Phase 34 — Enterprise Policy

Các capability doanh nghiệp trong tương lai MAY bao gồm:

```text
organization-wide allowlists

mandatory packages

forbidden sources

approved adapter versions

license policies

security policies

workspace defaults
```

Phân lớp:

```text
organization
    ↓
workspace
    ↓
project
    ↓
user
```

Thứ tự ưu tiên MUST được đặc tả một cách tường minh.

---

# 41. Phase 35 — Workspace / Monorepo

Hỗ trợ:

```text
repo root
├── shared profile
├── frontend project
├── backend project
└── documentation project
```

Cấu hình khả dĩ:

```yaml
workspace:
  defaults:
    profile: engineering-base

projects:
  apps/web:
    profile: frontend

  apps/api:
    profile: backend
```

Resolution SHOULD hỗ trợ caching dùng chung trong khi vẫn bảo toàn sự cô lập giữa các project.

---

# 42. Phase 36 — Incremental Build

Tối ưu hóa:

```text
changed package
     ↓
affected canonical components
     ↓
affected target artifacts
```

Thay vì build lại mọi thứ.

Đây chủ yếu là tối ưu hóa hiệu năng và SHOULD không đi trước ngữ nghĩa ổn định.

---

# 43. Phase 37 — Migration Framework

Khi các schema phát triển, hỗ trợ:

```bash
agent-plugins migrate
```

Các migration tiềm năng:

```text
manifest v1 → v2

lockfile v1 → v2

project config v1 → v2
```

Migration SHOULD:

```text
preview
backup where needed
apply deterministically
validate result
```

---

# 44. Phase 38 — Bộ công cụ phát triển Plugin

Cung cấp scaffolding:

```bash
agent-plugins create plugin

agent-plugins create skill

agent-plugins create agent

agent-plugins create preset
```

Các file được sinh ra MUST tuân theo schema chuẩn.

Template SHOULD giữ ở mức tối giản.

---

# 45. Phase 39 — Bộ công cụ phát triển Adapter

Các command tiềm năng:

```bash
agent-plugins adapter test ./adapters/target/foo

agent-plugins adapter validate foo

agent-plugins adapter fixture foo
```

Cung cấp dùng chung:

```text
adapter SDK

conformance suite

golden fixtures

test utilities
```

---

# 46. Phase 40 — Hệ sinh thái trưởng thành

Khi trưởng thành, nền tảng có thể trông như sau:

```text
                    Agent Plugins

                         │
         ┌───────────────┼──────────────┐
         │               │              │
    First Party       Vendor       Community
         │               │              │
         └───────────────┼──────────────┘
                         │
                  Canonical Catalog
                         │
                 Profiles / Presets
                         │
                     Policies
                         │
                     Resolver
                         │
                     Lockfile
                         │
                Target Adapter Layer
              ┌──────┬──────┬───────┐
              │      │      │       │
           Claude  Codex  Gemini  Hermes ...
```

---

# 47. Thứ tự triển khai được khuyến nghị

Thứ tự thực tế SHOULD là:

```text
01. Repository foundation

02. Terminology

03. Canonical types

04. Schema definitions

05. Manifest parser

06. Repository scanner

07. Validation engine

08. Catalog

09. Preset loader

10. Profile loader

11. Resolver

12. Resolution explainability

13. Policy engine

14. Lockfile

15. Adapter API

16. Adapter SDK

17. Claude adapter

18. Render plan

19. Filesystem planner

20. Filesystem apply layer

21. CLI foundations

22. validate command

23. catalog commands

24. profile commands

25. resolve command

26. plan command

27. build command

28. install command

29. diff command

30. doctor command

31. Codex adapter

32. Multi-target builds

33. Source adapter API

34. Git source adapter

35. Vendor model

36. Overlay engine

37. Update engine

38. Preset/profile UX

39. More target adapters

40. Community ecosystem
```

---

# 48. Ranh giới MVP được khuyến nghị

Ranh giới MVP mạnh nhất là:

```text
first-party canonical repository
+
profile/preset composition
+
deterministic resolver
+
policy
+
lockfile
+
Claude adapter
+
CLI
```

Mọi thứ trước đó là nền tảng.

Mọi thứ sau đó là mở rộng hệ sinh thái.

MVP nên chứng minh:

> Một cấu hình chuẩn duy nhất có thể sinh ra và quản lý một cách đáng tin cậy một môi trường agent runtime thực tế.

---

# 49. User Story của MVP

Một developer clone hoặc cài đặt Agent Plugins.

Họ chạy:

```bash
agent-plugins init
```

Chọn:

```text
Profile:
  frontend

Target:
  Claude
```

Sau đó:

```bash
agent-plugins resolve
```

Họ kiểm tra:

```text
frontend

├── mental-models
├── superpowers
├── typescript
├── frontend-engineering
├── testing
└── code-review
```

Sau đó:

```bash
agent-plugins plan
```

Cuối cùng:

```bash
agent-plugins install
```

Project nhận được các file native của target chính xác.

Sau này:

```bash
agent-plugins diff
```

trả về:

```text
No changes.
```

Đây là vòng lặp sản phẩm hoàn chỉnh đầu tiên.

---

# 50. V0.1

Phạm vi đề xuất:

```text
canonical model

schemas

catalog

validation

basic profile

basic preset

resolver

Claude adapter

basic CLI
```

Mục tiêu:

```text
first successful end-to-end build
```

---

# 51. V0.2

Thêm:

```text
lockfile

policy

resolution explanation

render plan

diff

safe install
```

Mục tiêu:

```text
reproducible and inspectable usage
```

---

# 52. V0.3

Thêm:

```text
Codex adapter

multi-target build

adapter capability inspection
```

Mục tiêu:

```text
prove target neutrality
```

---

# 53. V0.4

Thêm:

```text
Source Adapter API

Git source

vendor packages

provenance

integrity
```

Mục tiêu:

```text
consume external ecosystems safely
```

---

# 54. V0.5

Thêm:

```text
overlay system

update engine

vendor update workflows
```

Mục tiêu:

```text
maintain upstream-derived content
```

---

# 55. V0.6

Thêm:

```text
profile maturity

preset library

first-party capability library

publisher selection foundations
```

Mục tiêu:

```text
improve daily usability
```

---

# 56. V0.7

Thêm các target bổ sung:

```text
Gemini
OpenCode
Hermes
```

Mục tiêu:

```text
broaden runtime coverage
```

---

# 57. V0.8

Thêm:

```text
community catalog

trust metadata

security policies

package discovery
```

Mục tiêu:

```text
safe ecosystem expansion
```

---

# 58. V0.9

Tập trung vào:

```text
stability

migration

performance

documentation

plugin author DX

adapter author DX

CI integrations
```

Mục tiêu:

```text
release candidate
```

---

# 59. V1.0

V1.0 SHOULD đại diện cho một contract ổn định đối với:

```text
canonical manifests

profiles

presets

resolution

policies

lockfile

adapter API

CLI core commands
```

Mức hỗ trợ target tối thiểu SHOULD bao gồm ít nhất:

```text
Claude
Codex
```

và tốt nhất là thêm một runtime có sự khác biệt đáng kể.

V1.0 SHOULD ưu tiên sự ổn định của API thay vì số lượng tính năng.

---

# 60. Những gì không nên xây dựng quá sớm

Tránh đầu tư sớm vào:

```text
remote marketplace

public package registry

web application

desktop application

complex TUI

recommendation AI

automatic package selection

agent-generated configuration

remote execution

cloud synchronization
```

trước khi các contract cốt lõi ổn định.

Những tính năng này nhân lên độ phức tạp mà không kiểm chứng được nền tảng.

---

# 61. Các checkpoint kiến trúc

Sau các phase lớn, dừng lại và kiểm tra các giả định kiến trúc.

## Checkpoint A — Sau Resolver

Câu hỏi:

> Hệ thống có thể biểu đạt composition của project mà không tham chiếu đến các khái niệm của target runtime không?

Nếu không, hãy xem lại domain model.

---

## Checkpoint B — Sau Claude Adapter

Câu hỏi:

> Adapter có chỉ biến đổi phần biểu diễn không?

Nếu các manifest chuẩn chứa cấu trúc riêng cho Claude, hãy xem lại các ranh giới.

---

## Checkpoint C — Sau Codex Adapter

Câu hỏi:

> Cùng một graph chuẩn có thể nhắm tới cả Claude và Codex không?

Nếu không, hãy điều tra sự rò rỉ abstraction.

---

## Checkpoint D — Sau khi import Vendor

Câu hỏi:

> Các package upstream có thể cập nhật mà không cần sửa mã nguồn first-party không?

Nếu không, hãy xem lại sự tách biệt giữa source và overlay.

---

## Checkpoint E — Trước Community Registry

Câu hỏi:

> Provenance, tính toàn vẹn, policy và các ranh giới tin cậy đã đủ mạnh chưa?

Nếu chưa, hãy trì hoãn việc thực thi nội dung cộng đồng.

---

# 62. Roadmap tài liệu

Các đặc tả SHOULD được hoàn thành đại khái theo thứ tự này:

```text
problem.md

vision.md

goals.md

non-goals.md

requirements.md

use-cases.md

terminology.md

domain-model.md

capability-model.md

architecture.md

repository-structure.md

source-of-truth.md

manifest-spec.md

catalog-spec.md

resolution-spec.md

policy-spec.md

lockfile-spec.md

adapter-spec.md

update-spec.md

cli-spec.md

roadmap.md
```

Sau đó là tài liệu tập trung vào implementation:

```text
configuration-spec.md

overlay-spec.md

source-spec.md

security-model.md

testing-strategy.md

error-model.md

versioning-spec.md

migration-spec.md

contributing.md
```

---

# 63. Các tài liệu tiếp theo cần làm ngay

Sau `roadmap.md`, các đặc tả tiếp theo được khuyến nghị là:

```text
1. configuration-spec.md

2. overlay-spec.md

3. source-spec.md

4. update-spec.md

5. error-model.md

6. security-model.md

7. testing-strategy.md

8. versioning-spec.md

9. migration-spec.md
```

Trong số này, ưu tiên cao nhất là:

```text
configuration-spec.md
```

vì CLI, Profile, target, source và policy đều cần một contract cấu hình project cụ thể.

---

# 64. Backlog kỹ thuật trước mắt

Khi tài liệu đã đủ, bắt đầu với:

```text
Epic 1
Canonical schema

Epic 2
Manifest parser

Epic 3
Repository scanner

Epic 4
Catalog

Epic 5
Validation engine

Epic 6
Resolver

Epic 7
Policy

Epic 8
Lockfile

Epic 9
Adapter SDK

Epic 10
Claude adapter

Epic 11
CLI

Epic 12
End-to-end workflow
```

---

# 65. Các phụ thuộc milestone được đề xuất

```text
Foundation
    ↓
Canonical Domain
    ↓
Schemas
    ↓
Catalog
    ↓
Resolver
    ↓
Policy
    ↓
Lockfile
    ↓
Adapter Framework
    ↓
Claude Adapter
    ↓
CLI MVP
    ↓
Codex Adapter
    ↓
Multi-target
    ↓
External Sources
    ↓
Vendor + Overlay
    ↓
Update Engine
    ↓
Community
```

Mỗi phase phía sau SHOULD giả định rằng các contract phía trước đã đủ ổn định.

---

# 66. Định nghĩa hoàn thành — Tính năng

Một tính năng chỉ hoàn thành khi nó bao gồm, nếu áp dụng:

```text
implementation

types

schema

validation

tests

diagnostics

documentation

CLI/API exposure

migration impact review
```

Một tính năng không được coi là hoàn thành chỉ vì happy path của nó hoạt động.

---

# 67. Định nghĩa hoàn thành — Milestone

Một milestone SHOULD thỏa mãn:

```text
all required specs implemented

tests passing

no critical architecture violations

deterministic behavior confirmed

documentation updated

end-to-end fixture working
```

---

# 68. Quality Gate

Trước khi merge công việc kiến trúc cốt lõi:

```text
typecheck

lint

unit tests

integration tests

schema tests

snapshot tests

determinism tests
```

Các thay đổi adapter còn yêu cầu thêm:

```text
adapter conformance tests

golden output tests
```

---

# 69. Chỉ số thành công

Thành công giai đoạn đầu SHOULD được đo bằng chất lượng kiến trúc thay vì số lượt tải xuống.

Các chỉ số nội bộ hữu ích:

```text
% deterministic builds

resolver test coverage

adapter conformance rate

number of target-specific fields in canonical model
    → target should approach zero

percentage of first-party packages portable across targets

average number of manual steps required for install/update

number of unexplained resolution decisions
    → target zero
```

---

# 70. Thuộc tính kỹ thuật North-Star

Bài kiểm tra thành công kiến trúc mạnh nhất là:

```text
New target runtime added
        ↓
new Target Adapter
        ↓
existing canonical packages unchanged
```

Tương tự:

```text
New external source added
        ↓
new Source Adapter
        ↓
resolver unchanged
```

Và:

```text
New CLI/TUI/GUI added
        ↓
new client
        ↓
domain core unchanged
```

Nếu các thuộc tính này vẫn đúng, kiến trúc đang scale đúng cách.

---

# 71. Tóm tắt Roadmap cuối cùng

Project SHOULD phát triển qua bốn kỷ nguyên chính.

## Kỷ nguyên 1 — Nền tảng

```text
Domain
Schemas
Catalog
Resolver
Policy
Lockfile
```

Mục tiêu:

```text
correct canonical system
```

---

## Kỷ nguyên 2 — Bàn giao Runtime

```text
Adapter framework
Claude
CLI
Codex
Multi-target
```

Mục tiêu:

```text
usable product
```

---

## Kỷ nguyên 3 — Quản lý hệ sinh thái

```text
Source adapters
Vendor
Overlay
Update
Profiles
Preset library
More runtimes
```

Mục tiêu:

```text
scalable personal/team capability platform
```

---

## Kỷ nguyên 4 — Platform

```text
Community registry
Trust model
IDE
MCP
TUI
Web/Desktop
Enterprise policy
```

Mục tiêu:

```text
full agent capability management platform
```

Thứ tự ưu tiên được khuyến nghị vẫn là:

```text
correctness
    >
portability
    >
reproducibility
    >
usability
    >
ecosystem size
```

Ban đầu, một hệ thống nhỏ, tất định với ranh giới rõ ràng có giá trị hơn một plugin catalog lớn với kiến trúc không ổn định.