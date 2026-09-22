# Domain Model

## Tổng quan

Tài liệu này định nghĩa domain model chuẩn (canonical) cho `agent-plugins`.

Mục đích của domain model là thiết lập một bộ từ vựng ổn định và một tập quan hệ rõ ràng giữa các khái niệm được sử dụng xuyên suốt trong:

- yêu cầu sản phẩm,
- manifest,
- metadata của catalog,
- logic của resolver,
- policy,
- lockfile,
- source adapter,
- target adapter,
- hành vi của CLI.

Domain model nên độc lập với bất kỳ runtime đơn lẻ nào như Claude Code, Codex, Gemini, OpenCode hay Hermes.

Luồng chuẩn là:

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
Profile + Project + Policy
   ↓
Resolution
   ↓
Lockfile
   ↓
Target Adapter
```

Một mô hình tư duy ngắn gọn hơn là:

```text
Source
  ↓
Capability
  ↓
Composition
  ↓
Resolution
  ↓
Distribution
```

---

# 1. Mục tiêu của domain

Domain model cần giúp trả lời nhất quán các câu hỏi sau:

```text
Where does this tooling come from?

What is the installable unit?

What functionality does it contain?

What semantic capability does that functionality provide?

Which capabilities should be active for this role or project?

Which implementation should provide each capability?

Which components are allowed under the current policy?

What exact state was resolved?

How is that state materialized into a target runtime?
```

---

# 2. Ranh giới domain

Domain được chia thành năm khu vực logic.

```text
Source
├── Publisher
├── Package
└── Component

Semantic
└── Capability

Composition
├── Preset
├── Profile
├── Project
└── Policy

Resolution
├── Resolution
├── Resolution Decision
└── Lockfile

Integration
├── Source Adapter
└── Target Adapter
```

Các ranh giới này nên được giữ tách biệt về mặt khái niệm, ngay cả khi phần triển khai lưu trữ một số trong chúng cùng nhau.

---

# 3. Publisher

## Định nghĩa

Một **Publisher** đại diện cho nguồn gốc, nhà phát hành hoặc upstream source chịu trách nhiệm cho một hoặc nhiều package.

Một Publisher trả lời câu hỏi:

> **Tooling này đến từ đâu?**

Ví dụ:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

Một publisher có thể đại diện cho:

- một dự án open-source,
- một tổ chức,
- một hệ sinh thái runtime chính thức,
- chính dự án `agent-plugins`,
- một nguồn curated khác.

---

## Định danh Publisher

Một Publisher phải có một định danh chuẩn (canonical identifier) ổn định.

Ví dụ:

```text
superpowers
```

Tên hiển thị có thể khác:

```text
Superpowers
```

Định danh của Publisher không nên được suy ra từ văn bản hiển thị.

---

## Thuộc tính của Publisher

Về mặt khái niệm, một Publisher có thể chứa:

```text
id
display name
description

ownership
trust classification

source metadata
repository
documentation

discovery strategy
update strategy
```

---

## Quyền sở hữu Publisher

Ownership mô tả ai là người duy trì publisher so với `agent-plugins`.

Các giá trị khuyến nghị:

```text
first-party
third-party
```

Ví dụ:

```text
agent-plugins
→ first-party

superpowers
→ third-party
```

Ownership và trust là hai khái niệm khác nhau.

Một third-party publisher vẫn có thể được tin cậy rất cao.

---

## Trust của Publisher

Trust đại diện cho mức độ tin cậy được gán bởi policy của project hoặc bởi quá trình curation catalog.

Các phân loại có thể có gồm:

```text
first-party
official
curated
community
untrusted
```

Các giá trị này mô tả bối cảnh trust, không phải ownership.

---

# 4. Package

## Định nghĩa

Một **Package** là đơn vị có thể cài đặt hoặc phân phối được cung cấp bởi một Publisher.

Một Package trả lời câu hỏi:

> **Cần fetch, cài đặt hoặc tham chiếu đơn vị nào để có được các component này?**

Ví dụ có thể gồm:

```text
superpowers
frontend-design
python-development
ecc
```

---

## Vì sao cần Package

Package và Component phải được giữ tách biệt vì mức độ chi tiết khi cài đặt ở runtime có thể khác với mức độ chi tiết khi lựa chọn theo ngữ nghĩa.

Ví dụ:

```text
Package: superpowers

contains:

Component A → planning
Component B → debugging
Component C → TDD
```

Resolver có thể chỉ chọn:

```text
planning
debugging
```

nhưng vẫn cần cài đặt toàn bộ package.

Do đó:

```text
selected component
≠
installation unit
```

---

## Thuộc tính của Package

Về mặt khái niệm:

```text
id
publisher
display name
description

source
version
immutable reference
integrity metadata

supported targets

contained components
dependencies

security metadata
update strategy
```

---

## Định danh Package

Một package nên có định danh chuẩn, được scope theo publisher khi cần thiết.

Về mặt khái niệm:

```text
publisher/package
```

Ví dụ:

```text
superpowers/superpowers
anthropic/frontend-design
wshobson/python-development
```

---

# 5. Component

## Định nghĩa

Một **Component** là một đơn vị chức năng nằm trong một Package.

Một Component trả lời câu hỏi:

> **Package này cung cấp chức năng cụ thể nào?**

Ví dụ:

```text
skill:test-driven-development
agent:security-reviewer
hook:post-tool-use
command:review
mcp:github
lsp:typescript
```

---

## Các loại Component

Domain model ban đầu nên hỗ trợ ít nhất:

```text
skill
agent
command
hook
rule
mcp
lsp
workflow
```

Các loại khác có thể được bổ sung sau.

Core model nên tránh giả định rằng mọi runtime đều sử dụng tất cả các loại component.

---

## Định danh Component

Một tham chiếu component chuẩn nên là duy nhất và không mơ hồ trên phạm vi toàn cục.

Về mặt khái niệm:

```text
publisher/package#type:name
```

Ví dụ:

```text
superpowers/superpowers#skill:test-driven-development
```

Một ví dụ khác:

```text
ecc/ecc#agent:security-reviewer
```

---

## Thuộc tính của Component

Về mặt khái niệm:

```text
id
type
package

name
description

target compatibility

security classification

capability mappings

dependencies
conflicts
```

---

# 6. Capability

## Định nghĩa

Một **Capability** đại diện cho một khả năng mang tính ngữ nghĩa, độc lập với phần triển khai của nó.

Một Capability trả lời câu hỏi:

> **Môi trường agent có thể làm được gì?**

Ví dụ:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
engineering.architecture
security.review
knowledge.research
product.discovery
```

Capability là abstraction trung tâm của domain model.

---

# 7. Định danh Capability

Capability ID phải mô tả intent ngữ nghĩa, không phải định danh của publisher.

Nên dùng:

```text
engineering.testing.tdd
```

Tránh:

```text
superpowers.tdd
ecc.tdd
matt.tdd
```

Điều này cho phép thay đổi implementation mà không làm thay đổi intent của người dùng.

---

# 8. Namespace của Capability

Capability sử dụng namespace phân cấp.

Mẫu khuyến nghị:

```text
<domain>.<area>.<capability>
```

Ví dụ:

```text
workflow.planning

engineering.requirements
engineering.testing.tdd
engineering.debugging
engineering.review

frontend.design
frontend.accessibility

backend.api-design

security.review

knowledge.research
knowledge.synthesis

product.discovery

devops.kubernetes

gis.spatial-analysis
```

Namespace nên thể hiện ngữ nghĩa thay vì cấu trúc repository.

---

# 9. Capability Implementation

Một component có thể implement một hoặc nhiều capability.

Ví dụ:

```text
superpowers/superpowers#skill:test-driven-development

implements:

engineering.testing.tdd
```

Nhiều component có thể cùng implement một capability.

Ví dụ:

```text
engineering.testing.tdd

├── superpowers/...#skill:test-driven-development
├── mattpocock/...#skill:tdd
└── ecc/...#skill:tdd-workflow
```

Chúng được gọi là **Capability Implementation**.

---

# 10. Cardinality của Capability

Một Capability định nghĩa số lượng implementation đang hoạt động có thể cùng tồn tại trong điều kiện thông thường.

Các giá trị ban đầu:

```text
one
many
```

---

## Cardinality: one

Thông thường chỉ nên có một implementation đang hoạt động cung cấp capability.

Ví dụ:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
```

Lý do:

Nhiều workflow cạnh tranh nhau có thể tạo ra hành vi không nhất quán.

---

## Cardinality: many

Nhiều implementation tương thích có thể cùng tồn tại.

Ví dụ có thể gồm:

```text
knowledge.research
framework expertise
database expertise
security knowledge
```

Các implementation này có thể bổ sung cho nhau thay vì cạnh tranh nhau.

---

# 11. Priority của Capability

Các implementation có thể có priority tường minh.

Ví dụ:

```text
engineering.testing.tdd

100 → Superpowers
80  → Matt Pocock
70  → ECC
```

Priority chỉ là một đầu vào của quá trình resolution.

Nó không được ghi đè:

```text
policy restrictions
target compatibility
version compatibility
explicit project override
```

---

# 12. Capability Requirement

Một **Capability Requirement** đại diện cho intent rằng một capability cần tồn tại trong môi trường đã được resolve.

Requirement có thể bắt nguồn từ:

```text
Preset
Profile
Project
another capability
```

Ví dụ:

```text
frontend-engineer
→ engineering/core
→ engineering.testing.tdd
```

Requirement không quyết định implementation.

Resolution sẽ quyết định implementation ở bước sau.

---

# 13. Preset

## Định nghĩa

Một **Preset** là một tổ hợp có thể tái sử dụng gồm các capability và tùy chọn thêm các preset khác.

Một Preset trả lời câu hỏi:

> **Những capability nào thường đi cùng nhau?**

Ví dụ:

```text
workflow/core
engineering/core
engineering/security

stacks/typescript
stacks/nextjs

domains/frontend
domains/backend
domains/product

knowledge/research
knowledge/writing
```

---

## Trách nhiệm của Preset

Một Preset có thể:

```text
include capabilities
include other presets
provide reusable composition
```

Một Preset nhìn chung không nên:

```text
select publisher implementations
encode user identity
encode one specific project
contain runtime installation logic
```

---

## Ví dụ Preset

```text
engineering/core

├── workflow.planning
├── engineering.testing.tdd
├── engineering.debugging
├── engineering.review
└── engineering.verification
```

---

# 14. Composition của Preset

Preset có thể tham chiếu đến các preset khác.

Ví dụ:

```text
frontend

├── engineering/core
├── engineering/testing
├── frontend/design
└── frontend/accessibility
```

Đồ thị composition phải luôn không có chu trình (acyclic).

Không hợp lệ:

```text
A → B
B → C
C → A
```

---

# 15. Profile

## Định nghĩa

Một **Profile** đại diện cho một role hoặc bối cảnh làm việc có thể tái sử dụng.

Một Profile trả lời câu hỏi:

> **Loại người dùng này thường cần những capability nền tảng nào?**

Ví dụ:

```text
frontend-engineer
backend-engineer
fullstack-engineer
platform-engineer
product-manager
researcher
second-brain
```

---

## Trách nhiệm của Profile

Profile chủ yếu nên compose các preset.

Ví dụ:

```text
frontend-engineer

├── workflow/core
├── engineering/core
├── domains/frontend
└── stacks/typescript
```

Thông thường, một Profile không nên:

```text
reference publisher-specific components
pin package versions
contain project-specific stack details
contain runtime installation logic
```

---

# 16. Profile và Preset

Sự khác biệt là:

```text
Preset
→ reusable capability group

Profile
→ reusable working role composed from presets
```

Ví dụ:

```text
Preset:
engineering/security

Profile:
backend-engineer
```

Một profile sử dụng nhiều preset.

Một preset không đại diện cho một người hay một role.

---

# 17. Profile và Project

Sự khác biệt là:

```text
Profile
→ who / what role is working

Project
→ what the current repository requires
```

Ví dụ:

```text
Profile:
frontend-engineer

Project A:
Next.js + Cloudflare

Project B:
React + Vite
```

Profile vẫn có thể tái sử dụng cho cả hai project.

---

# 18. Project

## Định nghĩa

Một **Project** đại diện cho môi trường agent mong muốn của một consumer repository hoặc workspace cụ thể.

Một Project trả lời câu hỏi:

> **Project này cần gì?**

Một Project có thể chọn:

```text
profile
presets
policy
targets
capability overrides
```

---

## Ví dụ Project

```yaml
profile: frontend-engineer

presets:
  - stacks/nextjs
  - stacks/cloudflare
  - engineering/security

targets:
  - claude-code

policy: default
```

Project mô tả intent.

Thông thường nó không nên liệt kê mọi component cấp thấp.

---

# 19. Project Override

Project có thể override intent về capability được kế thừa.

Ví dụ:

```text
enable capability
disable capability
select specific implementation
```

Override nên luôn tường minh.

Chúng không nên trở thành một cơ chế vá (patch) không giới hạn.

---

# 20. Policy

## Định nghĩa

Một **Policy** định nghĩa các ràng buộc được áp dụng trong quá trình resolution và materialization.

Một Policy trả lời câu hỏi:

> **Những implementation và hành vi nào được phép?**

Policy có thể quản lý:

```text
publisher trust
source classification
hooks
commands
scripts
MCP servers
experimental components
publisher preference
update behavior
```

---

## Ví dụ Policy

```text
default

Allowed trust:
first-party
official
curated
community

External hooks:
review

External MCP:
prompt

Experimental:
deny
```

---

# 21. Policy không phải là Profile

Một Profile trả lời câu hỏi:

```text
What capabilities do I normally need?
```

Một Policy trả lời câu hỏi:

```text
What is allowed?
```

Ví dụ:

```text
Profile:
backend-engineer

Policy:
strict
```

Hai mối quan tâm này phải được giữ tách biệt.

---

# 22. Policy không phải là Priority của Capability

Priority của capability mô tả các implementation được ưu tiên.

Policy ràng buộc những implementation nào đủ điều kiện.

Về mặt khái niệm:

```text
Candidates
   ↓
Policy Filter
   ↓
Eligible Candidates
   ↓
Priority / Resolution
```

Do đó:

```text
policy > priority
```

Một candidate có priority cao nhưng bị policy từ chối thì không thể được chọn.

---

# 23. Resolution

## Định nghĩa

Một **Resolution** là kết quả được tính toán từ việc đánh giá:

```text
Project
+
Profile
+
Presets
+
Capabilities
+
Policy
+
Catalog
+
Target
```

Một Resolution trả lời câu hỏi:

> **Chính xác những capability, implementation, package và component nào nên được kích hoạt?**

---

# 24. Resolution Pipeline

Về mặt khái niệm:

```text
Project
   ↓
Profile
   ↓
Presets
   ↓
Capability Requirements
   ↓
Candidate Implementations
   ↓
Policy Filtering
   ↓
Target Filtering
   ↓
Conflict Resolution
   ↓
Selected Components
   ↓
Required Packages
   ↓
Resolved Versions
   ↓
Resolution
```

---

# 25. Resolution Decision

Một **Resolution Decision** thể hiện lý do một implementation được chọn hoặc bị từ chối.

Một decision có thể ghi lại:

```text
capability
candidate
selected / rejected
reason
policy result
priority
target compatibility
dependency path
```

Điều này hỗ trợ khả năng giải thích (explainability).

---

## Ví dụ Decision

```text
Capability:
engineering.testing.tdd

Candidate:
Superpowers / test-driven-development

Decision:
selected

Reasons:
allowed by policy
compatible with claude-code
priority 100
```

Một ví dụ khác:

```text
Candidate:
Publisher X / tdd

Decision:
rejected

Reason:
community publisher denied by strict policy
```

---

# 26. Capability bắt buộc và tùy chọn

Khi khả thi, model nên phân biệt giữa:

```text
required
optional
```

Thiếu một capability bắt buộc sẽ khiến resolution thất bại.

Thiếu một capability tùy chọn có thể tạo ra:

```text
warning
degraded state
```

tùy thuộc vào policy và cấu hình.

Sự phân biệt này có thể được đưa vào dần dần nếu ban đầu V1 coi mọi capability được yêu cầu đều là bắt buộc.

---

# 27. Dependency

Một **Dependency** thể hiện việc một thực thể yêu cầu một thực thể khác.

Các quan hệ có thể có gồm:

```text
Preset → Preset

Preset → Capability

Profile → Preset

Project → Preset

Component → Component

Capability → Capability
```

Dependency nên tường minh và không có chu trình khi áp dụng được.

---

# 28. Hard Dependency

Một hard dependency phải tồn tại thì thực thể yêu cầu nó mới hợp lệ.

Ví dụ:

```text
Capability A
requires
Capability B
```

Vô hiệu hóa B trong khi vẫn giữ A sẽ gây ra lỗi validation hoặc resolution.

---

# 29. Optional Dependency

Một optional dependency cải thiện hoặc mở rộng chức năng nhưng không bắt buộc để đảm bảo tính hợp lệ.

Ví dụ:

```text
knowledge.research

optionally enhances with:

browser.automation
```

Optional dependency không nên âm thầm trở thành bắt buộc.

---

# 30. Conflict

Một **Conflict** thể hiện hai hoặc nhiều lựa chọn đang hoạt động không thể cùng tồn tại một cách an toàn.

Ví dụ:

```text
multiple implementations of a cardinality-one capability

incompatible runtime components

mutually exclusive workflows
```

Conflict có thể là:

```text
implicit
explicit
```

---

## Conflict ngầm định

Được suy ra từ cardinality của capability.

Ví dụ:

```text
engineering.testing.tdd
cardinality: one
```

Hai implementation cùng được chọn sẽ tạo ra conflict.

---

## Conflict tường minh

Được khai báo trực tiếp giữa các component hoặc package.

Ví dụ:

```text
Component A
conflicts with
Component B
```

Conflict tường minh nên hiếm gặp và được ghi lại tài liệu.

---

# 31. Catalog

## Định nghĩa

**Catalog** là tập metadata đã được curate mà resolver biết đến.

Nó chứa:

```text
Publishers
Packages
Capability definitions
Implementation mappings
```

Catalog trả lời câu hỏi:

> **Những implementation nào hiện có và chúng ánh xạ tới các capability ngữ nghĩa như thế nào?**

---

# 32. Catalog và Upstream Source

Catalog được curate.

Upstream được discover.

Ví dụ:

```text
Upstream publisher
contains 300 components

Source Adapter
discovers 300

Catalog
curates 20
```

Do đó:

```text
discovered
≠
approved
≠
active
```

Đây là các trạng thái riêng biệt.

---

# 33. Discovered Component

Một **Discovered Component** là một component được nhận diện từ một upstream source adapter.

Nó không tự động trở thành một phần của catalog đã được curate.

Vòng đời:

```text
Upstream
   ↓
Discovered
   ↓
Reviewed
   ↓
Curated
   ↓
Mapped to Capability
   ↓
Eligible for Resolution
```

---

# 34. Curated Component

Một **Curated Component** là một component bên ngoài hoặc native đã được phê duyệt để tham gia vào catalog.

Curation có thể bao gồm:

```text
capability mapping
trust classification
priority
target compatibility
security review metadata
```

---

# 35. Source Adapter

## Định nghĩa

Một **Source Adapter** chuyển đổi một hệ sinh thái nguồn bên ngoài thành metadata nội bộ đã được chuẩn hóa.

Một Source Adapter trả lời câu hỏi:

> **Làm thế nào để hiểu upstream source này?**

Ví dụ:

```text
GitHub
Claude marketplace
Superpowers
ECC
Agent Skills
filesystem
```

---

## Trách nhiệm của Source Adapter

Một source adapter có thể:

```text
discover packages
discover components
read versions
resolve source metadata
extract integrity metadata
normalize upstream manifests
```

Nó không nên:

```text
choose user capabilities
apply profile composition
decide final implementation winners
```

Những việc đó thuộc về resolver.

---

# 36. Target

Một **Target** đại diện cho một agent runtime mà trạng thái đã resolve có thể được materialize vào.

Ví dụ:

```text
claude-code
codex
gemini
opencode
hermes
```

Định danh Target nên được giữ tách biệt với định danh capability.

---

# 37. Target Compatibility

Một implementation có thể hỗ trợ:

```text
all targets
specific targets
no currently supported target
```

Ví dụ:

```text
Component A

supports:
- claude-code
- codex
```

Resolver phải xem xét compatibility trước khi lựa chọn.

---

# 38. Target Adapter

## Định nghĩa

Một **Target Adapter** chuyển đổi trạng thái đã resolve và chuẩn hóa thành cấu hình native cho một Target runtime.

Một Target Adapter trả lời câu hỏi:

> **Resolution này nên được biểu diễn như thế nào trên runtime này?**

Ví dụ:

```text
Resolution
   ↓
Claude Code Adapter
   ↓
Claude-native configuration
```

---

## Trách nhiệm của Target Adapter

Một target adapter có thể:

```text
validate target support
render target files
translate package references
install supported packages
reconcile managed state
```

Nó không nên định nghĩa lại ý nghĩa ngữ nghĩa của capability.

---

# 39. Materialization

**Materialization** là quá trình áp dụng một Resolution vào một Target.

Về mặt khái niệm:

```text
Resolution
    ↓
Target Adapter
    ↓
Materialized Runtime State
```

Materialization có thể bao gồm:

```text
generating files
installing packages
enabling components
updating managed configuration
```

---

# 40. Desired State

**Desired State** là trạng thái ngữ nghĩa do người dùng khai báo.

Nguồn chính:

```text
Project Manifest
```

Nó bao gồm:

```text
profile
presets
policy
target
overrides
```

Desired state không nhất thiết giống hệt runtime state.

---

# 41. Actual State

**Actual State** là trạng thái hiện đang được materialize của một target runtime.

Ví dụ:

```text
installed package A
installed package B
manual package C
```

Đồng bộ hóa sẽ so sánh:

```text
Desired State
vs
Actual State
```

---

# 42. Managed State

**Managed State** đại diện cho tập con của Actual State do `agent-plugins` kiểm soát.

Ví dụ:

```text
Actual State

├── package A  ← managed
├── package B  ← managed
└── package C  ← manually managed
```

`agent-plugins` không nên mặc định nhận quyền sở hữu đối với các runtime state không liên quan.

---

# 43. Sync

**Sync** là thao tác reconciliation đưa Managed State tiến dần về Desired State đã được resolve.

Về mặt khái niệm:

```text
Desired State
     ↓
Resolution
     ↓
Diff
     ↓
Reconciliation
     ↓
Managed State
```

Sync nên có tính idempotent.

---

# 44. Lockfile

## Định nghĩa

Một **Lockfile** ghi lại chính xác kết quả cụ thể của quá trình resolution.

Một Lockfile trả lời câu hỏi:

> **Chính xác trạng thái nào đã được chọn?**

Nó là cầu nối giữa:

```text
semantic intent
```

và:

```text
reproducible implementation state
```

---

# 45. Project Lockfile

Project lockfile thuộc về một consumer project.

Tên file khuyến nghị:

```text
agent-plugins.lock
```

Nó có thể chứa:

```text
resolved capabilities
selected implementations
packages
components
versions
immutable references
target information
integrity metadata
resolution metadata
```

---

# 46. Distribution Lock

Bản phân phối `agent-plugins` có thể duy trì một lock riêng thể hiện trạng thái upstream publisher đã được kiểm thử.

Về mặt khái niệm:

```text
catalog.lock
```

File này trả lời câu hỏi:

> Bản phân phối này đã curate và kiểm thử những phiên bản upstream nào?

Nó khác với project lockfile.

---

# 47. Distribution Lock và Project Lockfile

```text
catalog.lock

controls:
curated upstream baseline

agent-plugins.lock

controls:
resolved consumer project state
```

Về mặt khái niệm:

```text
Distribution
   ↓
catalog.lock
   ↓
Project Resolution
   ↓
agent-plugins.lock
```

---

# 48. Version

Một Package có thể cung cấp một version dễ đọc với con người nhưng có thể thay đổi (mutable).

Ví dụ:

```text
6.4.1
v2.8.0
main
```

Để đảm bảo khả năng tái tạo, một mutable version nên được resolve thành một immutable reference.

---

# 49. Immutable Reference

Ví dụ:

```text
Git commit SHA
content hash
archive checksum
immutable release artifact
```

Lockfile nên ưu tiên immutable reference khi có thể.

---

# 50. Integrity

**Integrity Metadata** cung cấp bằng chứng rằng nội dung được lấy về khớp với artifact đã được lock.

Các dạng có thể có:

```text
checksum
hash
signature
```

V1 có thể chỉ hỗ trợ một số cơ chế integrity, nhưng domain nên chừa chỗ cho chúng.

---

# 51. Provenance

## Định nghĩa

**Provenance** ghi lại nguồn gốc của một package hoặc component.

Ví dụ:

```text
ownership: third-party
publisher: superpowers
repository: obra/superpowers
version: v6.4.1
commit: abc123
```

Provenance phải được giữ lại qua quá trình resolution và đưa vào lockfile khi khả thi.

---

# 52. Native

`native` mô tả một phân loại nguồn cho các component được triển khai bên trong repository `agent-plugins`.

Vị trí khuyến nghị:

```text
plugins/native/
```

Ví dụ:

```text
plugins/native/second-brain/
```

Một native component thông thường có:

```text
ownership: first-party
source: native
```

---

# 53. First-Party và Native

Hai khái niệm này có liên quan nhưng không đồng nhất.

```text
first-party
→ ownership classification

native
→ source/origin classification
```

Ví dụ:

```text
ownership: first-party
source: native
```

Sự phân biệt này giúp model giữ được độ chính xác nếu sau này bổ sung thêm các phương thức phân phối mới.

---

# 54. Third-Party

Một **Third-Party Component** được duy trì bên ngoài dự án `agent-plugins`.

Nó vẫn có thể là:

```text
official
curated
community
```

Third-party không có nghĩa là không đáng tin cậy.

---

# 55. Derived Component

Một native component có thể được lấy cảm hứng từ hoặc phát triển dựa trên công trình bên ngoài.

Về mặt khái niệm:

```text
native implementation

derivedFrom:
external publisher/component
```

Provenance nên bảo toàn mối quan hệ này khi có liên quan.

---

# 56. Trust

**Trust** đại diện cho một phân loại curation hoặc policy được áp dụng cho publisher, package hoặc component.

Trust có thể ảnh hưởng đến:

```text
eligibility
automatic installation
hook execution
MCP execution
update review requirements
```

Trust nên luôn tường minh.

---

# 57. Component nhạy cảm về bảo mật

Các component có khả năng thực hiện hành vi bên ngoài hoặc hành vi thực thi nên được phân loại là nhạy cảm về bảo mật (security-sensitive).

Ví dụ:

```text
hook
script
command
MCP server
external binary integration
```

Việc đánh giá policy phải diễn ra trước khi các component như vậy được kích hoạt.

---

# 58. Trạng thái Implementation

Về mặt khái niệm, một capability implementation có thể tồn tại ở một số trạng thái vòng đời:

```text
discovered
curated
deprecated
disabled
removed
```

V1 có thể không cần tất cả các trạng thái, nhưng model không nên giả định rằng mọi implementation đã biết đều đang hoạt động.

---

# 59. Deprecated Implementation

Một deprecated implementation vẫn được biết đến nhưng thông thường không nên được chọn cho các lần resolution mới.

Nó có thể vẫn cần thiết để tái tạo các lockfile cũ.

Sự phân biệt này rất quan trọng cho việc phát triển hệ sinh thái một cách an toàn.

---

# 60. Removed Implementation

Một removed implementation không còn được cung cấp bởi publisher của nó.

Phân tích cập nhật catalog nên xác định các capability bị ảnh hưởng bởi việc loại bỏ.

Các lockfile hiện có có thể trở nên không tái tạo được nếu immutable artifact bên dưới không còn truy cập được.

---

# 61. Resolution Context

Một **Resolution Context** là tập đầy đủ các đầu vào được dùng để tính toán một Resolution.

Về mặt khái niệm:

```text
catalog
distribution lock
project manifest
profile
presets
policy
target
overrides
```

Context này nên đủ để giải thích các resolution decision.

---

# 62. Candidate

Một **Candidate** là một capability implementation được xem xét trong quá trình resolution.

Vòng đời:

```text
Capability Requirement
       ↓
Candidate Discovery
       ↓
Policy Filtering
       ↓
Target Filtering
       ↓
Conflict Resolution
       ↓
Selected / Rejected
```

---

# 63. Eligible Candidate

Một Candidate là **Eligible** khi nó thỏa mãn tất cả các ràng buộc cứng.

Ví dụ:

```text
allowed by policy
compatible with target
available in selected version
not explicitly disabled
```

Priority nhìn chung chỉ được áp dụng sau khi đã xác lập eligibility.

---

# 64. Selected Implementation

**Selected Implementation** là candidate được chọn để đáp ứng một capability requirement.

Với:

```text
cardinality: one
```

thông thường nên có đúng một selected implementation.

Với:

```text
cardinality: many
```

có thể có nhiều.

---

# 65. Suppressed Implementation

Một **Suppressed Implementation** là một candidate hợp lệ nhưng không được chọn vì một candidate khác đã đáp ứng capability.

Ví dụ:

```text
engineering.testing.tdd

selected:
Superpowers

suppressed:
Matt Pocock
ECC
```

Các suppressed candidate nên vẫn hiển thị với các công cụ explainability.

---

# 66. Rejected Implementation

Một **Rejected Implementation** là implementation không thỏa mãn một ràng buộc cứng.

Các lý do có thể có:

```text
policy denied
target unsupported
version incompatible
explicit conflict
missing dependency
```

Rejected và suppressed không phải là cùng một trạng thái.

```text
suppressed
→ eligible but not selected

rejected
→ not eligible
```

---

# 67. Resolution Failure

Resolution thất bại khi desired state không thể tạo ra một môi trường hợp lệ.

Ví dụ:

```text
required capability has no eligible implementation

ambiguous cardinality-one capability

dependency cycle

hard conflict

unsupported required target capability
```

Các lỗi nên tường minh và giải thích được.

---

# 68. Resolution Warning

Một warning cho biết hành vi bị suy giảm nhưng có thể vẫn hợp lệ.

Ví dụ:

```text
optional capability unavailable

deprecated implementation selected from existing lockfile

partial target support
```

Warning không được âm thầm che giấu các lỗi bắt buộc.

---

# 69. Diagnostic

Một **Diagnostic** là một thông điệp có cấu trúc được tạo ra trong quá trình:

```text
validation
resolution
sync
update
```

Một diagnostic nên chứa:

```text
severity
code
message
entity
dependency path
suggested remediation
```

khi khả thi.

---

# 70. Update

Một **Update** đại diện cho một thay đổi có chủ đích từ một trạng thái upstream sang trạng thái khác.

Ví dụ:

```text
package version update
publisher ref update
component addition
component removal
component metadata change
```

Update tách biệt với sync thông thường.

---

# 71. Update Impact

**Update Impact** mô tả các thay đổi ngữ nghĩa do một upstream update gây ra.

Các tác động có thể có:

```text
capability unchanged
capability implementation changed
component removed
new security-sensitive component
new dependency
target compatibility changed
```

Việc review update nên tập trung vào tác động ngữ nghĩa, không chỉ vào số phiên bản.

---

# 72. Quan hệ trong domain

Các quan hệ chính là:

```text
Publisher
  1 ─── * Package

Package
  1 ─── * Component

Component
  * ─── * Capability

Preset
  * ─── * Capability

Preset
  * ─── * Preset

Profile
  1 ─── * Preset

Project
  0..1 ─── 1 Profile

Project
  * ─── * Preset

Project
  0..1 ─── 1 Policy

Project
  1 ─── * Target

Resolution
  1 ─── * Selected Implementation

Selected Implementation
  1 ─── 1 Component

Component
  * ─── 1 Package

Package
  * ─── 1 Publisher
```

---

# 73. Sơ đồ thực thể khái niệm

```text
┌────────────┐
│  Publisher  │
└─────┬──────┘
      │ 1
      │
      │ *
┌─────▼──────┐
│  Package   │
└─────┬──────┘
      │ 1
      │
      │ *
┌─────▼──────┐
│ Component  │
└─────┬──────┘
      │ *
      │ implements
      │ *
┌─────▼──────┐
│ Capability │
└─────▲──────┘
      │ *
      │ required by
      │ *
┌─────┴──────┐
│   Preset   │◄────────┐
└─────▲──────┘         │
      │ *              │ compose
      │                │
┌─────┴──────┐         │
│  Profile   │         │
└─────▲──────┘         │
      │                │
      │ selected by    │
      │                │
┌─────┴──────┐         │
│  Project   │─────────┘
└─────┬──────┘
      │
      ├──────── Policy
      │
      └──────── Target
                │
                ▼
           ┌───────────┐
           │ Resolver  │
           └─────┬─────┘
                 │
                 ▼
           ┌───────────┐
           │Resolution │
           └─────┬─────┘
                 │
                 ▼
           ┌───────────┐
           │ Lockfile  │
           └───────────┘
```

---

# 74. Hướng phụ thuộc trong domain

Hướng phụ thuộc ngữ nghĩa mong muốn là:

```text
Profile
   ↓
Preset
   ↓
Capability
```

chứ không phải:

```text
Profile
   ↓
Package
```

Và:

```text
Capability
   ↓
Implementation Mapping
   ↓
Component
   ↓
Package
   ↓
Publisher
```

Sự đảo ngược này giữ cho intent của người dùng độc lập với publisher.

---

# 75. Invariant độc lập với Publisher

Cấu hình của consumer thông thường không nên phụ thuộc vào định danh publisher.

Nên dùng:

```text
frontend-engineer
→ engineering.testing.tdd
```

Tránh:

```text
frontend-engineer
→ superpowers/test-driven-development
```

Cấu hình đặc thù theo publisher thuộc về:

```text
catalog
implementation mappings
explicit advanced override
```

---

# 76. Invariant độc lập với Target

Các core capability phải luôn trung lập với runtime.

Nên dùng:

```text
engineering.testing.tdd
```

Tránh:

```text
claude.testing.tdd
codex.testing.tdd
```

Implementation đặc thù theo target thuộc về:

```text
component metadata
resolution
target adapter
```

---

# 77. Invariant về Composition

Việc tái sử dụng chủ yếu nên diễn ra thông qua Preset.

Nên dùng:

```text
Profile
├── workflow/core
├── engineering/core
└── frontend
```

Tránh các chuỗi kế thừa sâu giữa các Profile.

---

# 78. Invariant về Resolution

Resolution phải luôn deterministic với cùng một đầu vào.

Về mặt khái niệm:

```text
resolve(context) = resolution
```

Với cùng một context đã được chuẩn hóa:

```text
resolution A
=
resolution B
```

---

# 79. Invariant về Explainability

Mọi selected implementation đều nên giải thích được thông qua một dependency path.

Ví dụ:

```text
Project
→ frontend-engineer
→ engineering/core
→ engineering.testing.tdd
→ Superpowers
```

Nếu hệ thống không thể giải thích vì sao một implementation tồn tại, thì model chưa đầy đủ.

---

# 80. Invariant về Provenance

Mọi external component đã được resolve nên giữ lại đủ provenance để xác định nguồn gốc của nó.

Tối thiểu, khi có sẵn:

```text
publisher
package
source
version
immutable reference
```

---

# 81. Invariant về Managed State

`agent-plugins` không được ngầm nhận quyền sở hữu đối với cấu hình runtime không liên quan.

Chỉ những state được tạo ra hoặc được `agent-plugins` chấp nhận quản lý một cách tường minh mới thuộc về Managed State.

---

# 82. Invariant về Generated State

Các artifact được sinh ra không định nghĩa sự thật của domain.

Hướng phụ thuộc phải luôn là:

```text
Domain Model
      ↓
Canonical Metadata
      ↓
Generated Runtime Artifacts
```

Không bao giờ:

```text
Generated Runtime Artifact
      ↓
defines Domain Model
```

---

# 83. Chuyển đổi trạng thái trong domain

Một external component điển hình sẽ đi qua:

```text
Discovered
   ↓
Curated
   ↓
Mapped
   ↓
Eligible
   ↓
Selected
   ↓
Locked
   ↓
Materialized
```

Sau đó, một implementation có thể trở thành:

```text
Deprecated
   ↓
Removed
```

---

# 84. Mô hình trạng thái Resolution

Về mặt khái niệm:

```text
Unknown
   ↓
Candidate
   ├── Rejected
   │
   └── Eligible
         ├── Suppressed
         │
         └── Selected
                ↓
              Locked
                ↓
            Materialized
```

Thuật ngữ này nên được sử dụng nhất quán trong các diagnostic của resolver.

---

# 85. Ví dụ — Frontend Engineer

```text
Profile
frontend-engineer

      ↓

Presets
workflow/core
engineering/core
domains/frontend
stacks/typescript

      ↓

Capability
engineering.testing.tdd

      ↓

Candidates
Superpowers
Matt Pocock
ECC

      ↓

Policy + Target

      ↓

Selected
Superpowers/test-driven-development

      ↓

Package
superpowers

      ↓

Lockfile

      ↓

Claude Code Adapter
```

---

# 86. Ví dụ — Second Brain

```text
Profile
second-brain

      ↓

Presets
knowledge/research
knowledge/writing
knowledge/synthesis
tools/obsidian

      ↓

Capabilities
knowledge.research
knowledge.writing
knowledge.synthesis
knowledge.management

      ↓

Implementations
Native
Matt Pocock
ECC
other curated publishers

      ↓

Resolution

      ↓

No unrelated engineering workflows
```

Ví dụ này xác nhận rằng domain không chỉ dành riêng cho lập trình.

---

# 87. Ví dụ — Policy làm thay đổi Resolution

Cho trước:

```text
Capability:
security.review
```

Các candidate:

```text
Publisher A
priority: 100
trust: community

Publisher B
priority: 80
trust: curated
```

Policy:

```text
allow:
first-party
official
curated
```

Resolution:

```text
Publisher A
→ Rejected by policy

Publisher B
→ Eligible
→ Selected
```

Điều này chứng minh:

```text
policy > priority
```

---

# 88. Ví dụ — Tách biệt Package và Component

Package:

```text
superpowers
```

Các component:

```text
planning
debugging
TDD
verification
```

Các capability đã được resolve:

```text
planning
debugging
verification
```

TDD có thể được cung cấp từ nơi khác.

Package vẫn có thể được cài đặt một lần vì các component được chọn cần đến nó.

Do đó:

```text
Package installation
does not imply
all package components are semantically selected
```

Sự phân biệt này phải luôn tường minh xuyên suốt kiến trúc.

---

# 89. Từ vựng chuẩn

Các thuật ngữ sau là chuẩn và nên được sử dụng nhất quán:

```text
Publisher
Package
Component
Capability
Capability Implementation
Capability Requirement

Preset
Profile
Project
Policy

Candidate
Eligible Candidate
Selected Implementation
Suppressed Implementation
Rejected Implementation

Resolution
Resolution Decision
Resolution Context

Target
Source Adapter
Target Adapter
Materialization

Desired State
Actual State
Managed State
Sync

Catalog
Project Lockfile
Distribution Lock

Provenance
Trust
Integrity

Diagnostic
Update
Update Impact
```

Tránh đưa ra các từ đồng nghĩa cho những khái niệm này khi không có nhu cầu rõ ràng.

---

# 90. Các thuật ngữ cố ý không phải first-class

Các thuật ngữ sau có thể được dùng trong UX hoặc trong trao đổi nhưng không phải là thực thể domain first-class trong V1:

```text
Addon
Bundle
Overlay
Persona
Environment Pack
Plugin Group
```

Ví dụ:

```text
Addon
→ represented internally as an optional Preset
```

Điều này giúp giữ cho domain model gọn nhẹ.

---

# 91. Ranh giới Aggregate

Ở cấp độ domain khái niệm, các ranh giới nhất quán chính là:

## Catalog Aggregate

Chứa:

```text
Publisher
Package
Capability
Implementation Mapping
```

Chịu trách nhiệm cho:

```text
identity
references
curation
availability
```

---

## Composition Aggregate

Chứa:

```text
Preset
Profile
```

Chịu trách nhiệm cho:

```text
reusable capability intent
```

---

## Project Aggregate

Chứa:

```text
Project
Policy Selection
Target Selection
Overrides
```

Chịu trách nhiệm cho:

```text
consumer desired state
```

---

## Resolution Aggregate

Chứa:

```text
Resolution
Resolution Decisions
Selected Implementations
Diagnostics
```

Chịu trách nhiệm cho:

```text
deterministic concrete selection
```

---

## Lock Aggregate

Chứa:

```text
Project Lockfile
immutable package/component resolution
```

Chịu trách nhiệm cho:

```text
reproducibility
```

Đây là các ranh giới khái niệm; chúng không đòi hỏi database hoặc service riêng biệt.

---

# 92. Domain Service

Một số hành vi không tự nhiên thuộc về một thực thể duy nhất.

Về mặt khái niệm, các thao tác này là domain service.

Ví dụ:

```text
Capability Resolver

Policy Evaluator

Conflict Resolver

Dependency Graph Validator

Target Compatibility Evaluator

Lockfile Builder

Resolution Explainer
```

Phần triển khai của chúng thuộc về kiến trúc, không thuộc về tài liệu này.

---

# 93. Core Domain

Core domain thực sự của `agent-plugins` không phải là việc tải package.

Mà là:

```text
Capability Modeling
+
Composition
+
Policy-Aware Resolution
+
Explainability
+
Reproducibility
```

Việc tích hợp publisher và materialization vào target hỗ trợ cho phần core đó.

Sự phân biệt này nên ảnh hưởng đến thứ tự ưu tiên trong kiến trúc.

---

# 94. Supporting Domain

Các supporting domain bao gồm:

```text
Source Discovery

Package Retrieval

Runtime Materialization

CLI Presentation

Update Detection

Catalog Generation
```

Chúng quan trọng nhưng không nên định nghĩa core semantic model.

---

# 95. Tóm tắt các Invariant của domain

Các invariant quan trọng nhất là:

```text
1. Capability IDs are publisher-independent.

2. Profiles primarily compose Presets.

3. Presets primarily compose Capabilities.

4. Publisher selection occurs during resolution.

5. Policy filtering happens before preference selection.

6. Cardinality-one capabilities resolve to at most one active implementation.

7. Identical inputs produce deterministic resolution.

8. Every selected implementation is explainable.

9. External components retain provenance.

10. Package installation does not imply semantic activation of every contained component.

11. Target-specific behavior does not redefine semantic capability identity.

12. Generated artifacts are not authoritative domain state.

13. Sync manages only explicitly managed runtime state.

14. Project intent and user role remain distinct.

15. LLM behavior is not required for deterministic core resolution.
```

---

# 96. Domain Model trong một câu

> **`agent-plugins` mô hình hóa tooling bên ngoài thành các Publisher chứa Package và Component, chuẩn hóa các Component đó thành các Capability ngữ nghĩa, compose các Capability thông qua Preset và Profile, ràng buộc chúng bằng bối cảnh Project và Policy, và resolve chúng một cách deterministic thành một môi trường runtime có thể tái tạo.**