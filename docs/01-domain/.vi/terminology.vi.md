# Thuật ngữ

## Tổng quan

Tài liệu này định nghĩa bộ thuật ngữ chuẩn được sử dụng xuyên suốt `agent-plugins`.

Mục đích của nó là đảm bảo rằng:

- tài liệu sản phẩm,
- kiến trúc,
- manifest,
- logic của resolver,
- output của CLI,
- test,
- thảo luận giữa các contributor

sử dụng cùng một bộ từ vựng một cách nhất quán.

Để biết chi tiết về ngữ nghĩa và các mối quan hệ, xem `domain-model.md`.

---

# 1. Mô hình tư duy cốt lõi

Mô hình chuẩn là:

```text
Provider
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

Dạng rút gọn:

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

# 2. Provider

**Provider** là nguồn upstream, nhà phát hành hoặc chủ sở hữu cung cấp một hoặc nhiều Package.

Ví dụ:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

Dùng Provider khi trả lời câu hỏi:

> Tooling này đến từ đâu?

Không dùng Provider với nghĩa là runtime target.

---

# 3. Package

**Package** là đơn vị có thể cài đặt hoặc phân phối do một Provider cung cấp.

Ví dụ:

```text
superpowers
frontend-design
python-development
ecc
```

Dùng Package khi trả lời câu hỏi:

> Đơn vị nào được cài đặt hoặc tải về?

Một Package có thể chứa nhiều Component.

---

# 4. Component

**Component** là một đơn vị chức năng nằm bên trong một Package.

Các loại được hỗ trợ có thể bao gồm:

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

Ví dụ:

```text
skill:test-driven-development
agent:security-reviewer
hook:post-tool-use
mcp:github
```

Dùng Component khi trả lời câu hỏi:

> Package này expose chức năng cụ thể nào?

---

# 5. Capability

**Capability** là một khả năng mang tính ngữ nghĩa, độc lập với implementation của nó.

Ví dụ:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
security.review
knowledge.research
product.discovery
```

Dùng Capability khi trả lời câu hỏi:

> Agent environment có thể làm được gì?

Capability là abstraction chính nằm giữa intent của người dùng và implementation của provider.

---

# 6. Capability Implementation

**Capability Implementation** là một Component được map vào một Capability.

Ví dụ:

```text
Capability:
engineering.testing.tdd

Implementation:
superpowers/superpowers#skill:test-driven-development
```

Nhiều implementation có thể cùng cung cấp một Capability.

---

# 7. Capability Requirement

**Capability Requirement** nghĩa là một Capability được yêu cầu bởi:

```text
Preset
Profile
Project
another Capability
```

Nó thể hiện intent, không phải implementation.

Ví dụ:

```text
frontend-engineer
→ engineering/core
→ engineering.testing.tdd
```

---

# 8. Cardinality

**Cardinality** xác định số lượng implementation của một Capability thường có thể được active cùng lúc.

Các giá trị được hỗ trợ:

```text
one
many
```

### one

Thông thường chỉ một implementation active mới nên thỏa mãn Capability.

Ví dụ:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
```

### many

Nhiều implementation tương thích có thể cùng tồn tại.

Ví dụ có thể bao gồm:

```text
knowledge.research
framework expertise
security knowledge
```

---

# 9. Preset

**Preset** là một composition có thể tái sử dụng gồm các Capability và, tùy chọn, các Preset khác.

Ví dụ:

```text
workflow/core
engineering/core
engineering/security
stacks/nextjs
knowledge/research
```

Dùng Preset khi trả lời câu hỏi:

> Những capability nào thường đi cùng nhau?

---

# 10. Profile

**Profile** là một role hoặc working context có thể tái sử dụng, được compose từ các Preset.

Ví dụ:

```text
frontend-engineer
backend-engineer
fullstack-engineer
product-manager
researcher
second-brain
```

Dùng Profile khi trả lời câu hỏi:

> Role này thường cần những baseline capability nào?

---

# 11. Project

**Project** đại diện cho agent environment mong muốn của một repository hoặc workspace cụ thể.

Một Project có thể chọn:

```text
profile
presets
policy
targets
overrides
```

Dùng Project khi trả lời câu hỏi:

> Repository cụ thể này cần gì?

---

# 12. Policy

**Policy** định nghĩa các ràng buộc được sử dụng trong quá trình resolution và materialization.

Policy có thể quản lý:

```text
provider trust
allowed sources
hooks
commands
scripts
MCP servers
experimental components
update behavior
```

Dùng Policy khi trả lời câu hỏi:

> Điều gì được phép?

---

# 13. Catalog

**Catalog** là tập metadata đã được curate mà resolver biết đến.

Nó chứa:

```text
Providers
Packages
Capabilities
Implementation mappings
```

Dùng Catalog khi nói đến những gì khả dụng một cách chuẩn và đã được curate.

Không dùng Catalog như một từ đồng nghĩa với upstream repository.

---

# 14. Resolution

**Resolution** là kết quả cụ thể được tạo ra bằng cách đánh giá:

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

Dùng Resolution khi trả lời câu hỏi:

> Chính xác những implementation nào nên được active?

---

# 15. Resolver

**Resolver** là domain service tính toán ra một Resolution.

Về mặt khái niệm:

```text
Project
↓
Profile
↓
Presets
↓
Capabilities
↓
Candidates
↓
Policy filtering
↓
Target filtering
↓
Conflict resolution
↓
Selected Implementations
```

---

# 16. Candidate

**Candidate** là một Capability Implementation đang được xem xét trong quá trình resolution.

Candidate có thể trở thành:

```text
Eligible
Rejected
Suppressed
Selected
```

---

# 17. Eligible Candidate

**Eligible Candidate** thỏa mãn tất cả các hard constraint.

Ví dụ:

```text
allowed by policy
compatible with target
available in selected version
not explicitly disabled
```

Tính eligible được đánh giá trước preference và priority.

---

# 18. Selected Implementation

**Selected Implementation** là Candidate được chọn để thỏa mãn một Capability Requirement.

Với:

```text
cardinality: one
```

thông thường sẽ có một selected implementation.

Với:

```text
cardinality: many
```

có thể có nhiều.

---

# 19. Suppressed Implementation

**Suppressed Implementation** là implementation hợp lệ và eligible, nhưng không được chọn vì một Candidate khác đã thỏa mãn Capability.

Ví dụ:

```text
engineering.testing.tdd

Selected:
Superpowers

Suppressed:
Matt Pocock
ECC
```

Suppressed không có nghĩa là không hợp lệ.

---

# 20. Rejected Implementation

**Rejected Implementation** là implementation không thỏa mãn một hard constraint.

Ví dụ:

```text
denied by policy
unsupported target
version incompatible
missing dependency
explicit conflict
```

Khác biệt:

```text
Suppressed
→ eligible but not selected

Rejected
→ not eligible
```

---

# 21. Resolution Decision

**Resolution Decision** ghi lại lý do vì sao một Candidate được:

```text
selected
suppressed
rejected
```

Nó có thể bao gồm:

```text
capability
candidate
priority
policy result
target compatibility
reason
dependency path
```

Resolution Decision giúp đảm bảo khả năng giải thích.

---

# 22. Resolution Context

**Resolution Context** là toàn bộ tập input được Resolver sử dụng.

Về mặt khái niệm:

```text
Catalog
Distribution Lock
Project Manifest
Profile
Presets
Policy
Target
Overrides
```

---

# 23. Conflict

**Conflict** tồn tại khi nhiều lựa chọn không thể cùng tồn tại một cách an toàn.

Ví dụ:

```text
two active implementations of a cardinality-one capability
mutually exclusive workflows
incompatible components
```

Conflict có thể là:

```text
implicit
explicit
```

---

# 24. Dependency

**Dependency** biểu diễn việc một entity yêu cầu một entity khác.

Ví dụ:

```text
Preset → Preset
Preset → Capability
Profile → Preset
Capability → Capability
Component → Component
```

Dependency có thể là bắt buộc (hard) hoặc tùy chọn (optional).

---

# 25. Hard Dependency

**Hard Dependency** là dependency bắt buộc để đảm bảo tính hợp lệ.

Nếu A yêu cầu B:

```text
A → B
```

thì A không thể tiếp tục active nếu thiếu B.

---

# 26. Optional Dependency

**Optional Dependency** cải thiện hoặc mở rộng chức năng nhưng không bắt buộc.

Việc thiếu nó không nên tự động khiến environment trở nên không hợp lệ.

---

# 27. Target

**Target** là một agent runtime mà Resolution được materialize vào.

Ví dụ:

```text
claude-code
codex
gemini
opencode
hermes
```

Định danh của Target phải được giữ tách biệt với định danh của Capability.

---

# 28. Source Adapter

**Source Adapter** chuyển đổi một upstream ecosystem thành metadata nội bộ đã được chuẩn hóa.

Ví dụ:

```text
GitHub adapter
Claude marketplace adapter
Superpowers adapter
ECC adapter
filesystem adapter
```

Dùng Source Adapter khi trả lời câu hỏi:

> Hệ thống hiểu external source này như thế nào?

---

# 29. Target Adapter

**Target Adapter** chuyển đổi một Resolution thành native configuration cho một Target runtime.

Ví dụ:

```text
Resolution
↓
Claude Code Adapter
↓
Claude-native configuration
```

Dùng Target Adapter khi trả lời câu hỏi:

> Resolved state được biểu diễn trên runtime này như thế nào?

---

# 30. Materialization

**Materialization** là quá trình áp dụng một Resolution vào một Target.

Nó có thể bao gồm:

```text
generating files
installing packages
enabling components
updating managed state
```

---

# 31. Desired State

**Desired State** là trạng thái ngữ nghĩa do người dùng khai báo.

Nguồn chính:

```text
agent-plugins.yaml
```

Nó mô tả những gì nên tồn tại.

---

# 32. Actual State

**Actual State** là trạng thái hiện tại của target runtime.

Nó có thể bao gồm cả:

```text
agent-plugins-managed state
manually managed state
```

---

# 33. Managed State

**Managed State** là phần con của Actual State thuộc quyền sở hữu của `agent-plugins`.

Hệ thống không nên mặc định cho rằng nó sở hữu các runtime configuration không liên quan.

---

# 34. Sync

**Sync** là quá trình reconcile nhằm đưa Managed State tiến về Desired State.

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

# 35. Project Manifest

**Project Manifest** là cấu hình dạng khai báo của một consumer project.

Tên file khuyến nghị:

```text
agent-plugins.yaml
```

Nó có thể chứa:

```text
profile
presets
targets
policy
overrides
```

---

# 36. Lockfile

**Lockfile** ghi lại kết quả cụ thể của quá trình resolution.

Nó tồn tại để hỗ trợ:

```text
reproducibility
traceability
version pinning
provenance
```

---

# 37. Project Lockfile

**Project Lockfile** ghi lại resolved state của một consumer project.

Tên file khuyến nghị:

```text
agent-plugins.lock
```

Nó có thể bao gồm:

```text
capabilities
implementations
packages
components
versions
immutable references
targets
```

---

# 38. Distribution Lock

**Distribution Lock** ghi lại các upstream version đã được distribution `agent-plugins` curate và test.

Tên khái niệm khuyến nghị:

```text
catalog.lock
```

Khác biệt:

```text
catalog.lock
→ curated distribution baseline

agent-plugins.lock
→ consumer project resolution
```

---

# 39. Provenance

**Provenance** ghi lại nguồn gốc của một Package hoặc Component.

Ví dụ:

```text
provider
repository
version
commit
ownership
source
```

Provenance nên luôn được hiển thị rõ xuyên suốt resolution và lockfile.

---

# 40. Ownership

**Ownership** mô tả ai là người maintain một entity, xét trong mối quan hệ với `agent-plugins`.

Các giá trị chuẩn:

```text
first-party
third-party
```

Ownership không giống với trust.

---

# 41. First-Party

**First-Party** nghĩa là được tạo ra hoặc maintain bởi project `agent-plugins`.

Ví dụ:

```text
ownership: first-party
```

Không dùng `official` như một từ đồng nghĩa với first-party.

---

# 42. Third-Party

**Third-Party** nghĩa là được maintain bên ngoài project `agent-plugins`.

Một third-party provider vẫn có thể là:

```text
official
curated
community
```

---

# 43. Native

**Native** mô tả một phân loại về source/origin dành cho các implementation được lưu trữ và maintain bên trong repository này.

Vị trí khuyến nghị:

```text
plugins/native/
```

Kết hợp điển hình:

```text
source: native
ownership: first-party
```

---

# 44. First-Party vs Native

Dùng:

```text
first-party
```

cho ownership.

Dùng:

```text
native
```

cho source/origin.

Hai khái niệm này có liên quan nhưng được cố ý tách biệt.

---

# 45. Trust

**Trust** mô tả một phân loại về policy hoặc curation.

Các mức khuyến nghị:

```text
first-party
official
curated
community
untrusted
```

Trust có thể ảnh hưởng đến:

```text
eligibility
installation
hook execution
MCP execution
review requirements
```

---

# 46. Official

**Official** nghĩa là Package hoặc Provider được phát hành bởi tổ chức chịu trách nhiệm cho target ecosystem hoặc sản phẩm đó.

Ví dụ:

```text
Anthropic official plugin
```

Không dùng `official` với nghĩa là code first-party của `agent-plugins`.

---

# 47. Curated

**Curated** nghĩa là đã được các catalog maintainer của `agent-plugins` review và phê duyệt một cách tường minh.

Curated không ngụ ý ownership first-party.

---

# 48. Community

**Community** nghĩa là được maintain bên ngoài và có sẵn cho hệ sinh thái, nhưng không nhất thiết đã được curate chính thức.

Community không tự động có nghĩa là không an toàn.

---

# 49. Untrusted

**Untrusted** nghĩa là policy hoặc catalog hiện tại không cấp đủ mức trust để sử dụng tự động.

Nó không nhất thiết có nghĩa là độc hại.

---

# 50. Security-Sensitive Component

**Security-Sensitive Component** là một Component có khả năng thực thi hoặc có hành vi tương tác với bên ngoài.

Ví dụ:

```text
hook
script
command
MCP server
external binary integration
```

Những Component như vậy nên được Policy đánh giá trước khi kích hoạt.

---

# 51. Integrity

**Integrity** mô tả bằng chứng cho thấy nội dung được tải về khớp với nội dung mong đợi.

Ví dụ:

```text
checksum
hash
signature
```

---

# 52. Version

**Version** là một tham chiếu release mà con người có thể đọc được.

Ví dụ:

```text
6.4.1
v2.8.0
```

Một version có thể không phải là bất biến.

---

# 53. Immutable Reference

**Immutable Reference** xác định chính xác một nội dung cụ thể.

Ví dụ:

```text
Git commit SHA
content hash
archive checksum
immutable release artifact
```

Lockfile nên ưu tiên immutable reference khi có thể.

---

# 54. Discovered Component

**Discovered Component** là component được tìm thấy trong một upstream source nhưng chưa chắc đã được phê duyệt để sử dụng.

Vòng đời:

```text
Discovered
↓
Reviewed
↓
Curated
↓
Mapped
↓
Eligible
```

---

# 55. Curated Component

**Curated Component** là một Component đã được phê duyệt để tham gia vào catalog resolution.

Quá trình curate có thể bổ sung:

```text
capability mapping
priority
trust metadata
target compatibility
security metadata
```

---

# 56. Deprecated Implementation

**Deprecated Implementation** là implementation vẫn được biết đến nhưng thông thường không nên được chọn cho các resolution mới.

Nó có thể vẫn cần thiết để tái tạo các lockfile cũ.

---

# 57. Removed Implementation

**Removed Implementation** là implementation không còn khả dụng từ source của nó.

Việc gỡ bỏ có thể ảnh hưởng đến:

```text
capability coverage
reproducibility
existing project lockfiles
```

---

# 58. Update

**Update** là một quá trình chuyển đổi có chủ đích từ một upstream state sang một upstream state khác.

Ví dụ:

```text
new package version
new commit
component addition
component removal
metadata change
```

Update khác với Sync thông thường.

---

# 59. Update Impact

**Update Impact** mô tả tác động về mặt ngữ nghĩa của một Update.

Ví dụ:

```text
capability implementation changed
component removed
new security-sensitive component
target compatibility changed
new dependency
```

---

# 60. Diagnostic

**Diagnostic** là phản hồi có cấu trúc được tạo ra trong quá trình:

```text
validation
resolution
sync
update
```

Một Diagnostic có thể chứa:

```text
severity
code
message
entity
dependency path
remediation
```

---

# 61. Validation

**Validation** kiểm tra xem configuration và catalog state có hợp lệ về mặt cấu trúc và ngữ nghĩa hay không.

Ví dụ:

```text
schema validation
reference validation
cycle detection
duplicate ID detection
```

Validation không nhất thiết thực hiện toàn bộ Resolution.

---

# 62. Explainability

**Explainability** là khả năng trả lời vì sao một Package, Component hoặc implementation được chọn.

Trace chuẩn:

```text
Project
→ Profile
→ Preset
→ Capability
→ Implementation
→ Package
→ Provider
```

---

# 63. Reproducibility

**Reproducibility** nghĩa là cùng một tập input đã được lock có thể tái tạo một resolved environment tương đương.

Nó phụ thuộc vào:

```text
stable manifests
deterministic resolution
version pinning
immutable references
lockfiles
```

---

# 64. Idempotence

**Idempotence** nghĩa là việc áp dụng lặp lại cùng một thao tác sẽ không tạo thêm thay đổi nào khi desired state đã đạt được.

Ví dụ:

```text
ap sync
ap sync
ap sync
```

nên hội tụ về cùng một Managed State.

---

# 65. Override

**Override** là một ngoại lệ tường minh ở cấp Project đối với hành vi được kế thừa.

Ví dụ:

```text
enable capability
disable capability
select specific implementation
```

Override nên luôn tường minh và có giới hạn.

---

# 66. Bundle

**Bundle** nghĩa là nhiều capability hoặc component được đóng gói cùng nhau thành một distribution artifact.

Bundle **không** phải là một khái niệm composition first-class trong V1.

Ưu tiên dùng:

```text
Preset
```

cho semantic composition.

---

# 67. Addon

**Addon** là một thuật ngữ UX dành cho một Preset tùy chọn.

Về mặt khái niệm:

```text
Addon = optional Preset
```

Addon không phải là một domain entity first-class trong V1.

---

# 68. Overlay

**Overlay** chỉ việc chỉnh sửa hoặc patch được áp dụng lên trên một external implementation.

Overlay không phải là một khái niệm first-class trong V1.

Ưu tiên dùng:

```text
policy
capability mapping
native replacement
```

trước khi đưa overlay vào.

---

# 69. Plugin

**Plugin** là một thuật ngữ đóng gói đặc thù của runtime.

Nó có thể tương ứng với một Package trong một số runtime, đặc biệt là Claude Code, nhưng không nên định nghĩa core domain model.

Dùng:

```text
Package
```

cho domain modeling độc lập với runtime.

Dùng:

```text
Plugin
```

khi thảo luận về native format của một runtime.

---

# 70. Skill

**Skill** là một loại Component đại diện cho instruction, kiến thức hoặc hành vi workflow có thể tái sử dụng.

Chỉ dùng Skill khi implementation cụ thể là một skill.

Không dùng Skill như một từ đồng nghĩa với Capability.

---

# 71. Agent

**Agent** là một loại Component đại diện cho một worker context chuyên biệt, tự chủ hoặc bán tự chủ.

Không dùng Agent như một từ đồng nghĩa với Profile.

---

# 72. Workflow

**Workflow** là một Component hoặc một quy trình ngữ nghĩa đại diện cho một cách thực hiện tác vụ theo thứ tự.

Ví dụ:

```text
planning workflow
TDD workflow
review workflow
```

Workflow có thể được implement dưới dạng Skill, Agent hoặc một cơ chế native của runtime.

---

# 73. Rule

**Rule** là một loại Component đại diện cho instruction hoặc ràng buộc hành vi mang tính lâu dài.

Rule có thể đặc thù theo từng runtime.

---

# 74. Hook

**Hook** là một Component được kích hoạt bởi các sự kiện của runtime.

Hook thường nhạy cảm về security vì chúng có thể thực thi code hoặc command.

---

# 75. Command

**Command** là một Component được người dùng hoặc runtime gọi, expose một thao tác tường minh.

Command có thể thực thi được và do đó có thể cần được Policy đánh giá.

---

# 76. MCP

**MCP** chỉ các tích hợp Model Context Protocol được expose bởi một Package hoặc Component.

Các tích hợp MCP có thể kết nối agent với các tool, dữ liệu hoặc service bên ngoài.

Nhìn chung, chúng nên được coi là nhạy cảm về security.

---

# 77. LSP

**LSP** chỉ các tích hợp Language Server Protocol.

Một tích hợp LSP được biểu diễn như một Component khi nó tham gia vào agent tooling environment.

---

# 78. Runtime

**Runtime** là hệ thống AI agent thực tế thực thi hoặc sử dụng configuration được sinh ra.

Ví dụ:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

Trong domain model, Runtime được biểu diễn thông qua một Target.

---

# 79. Environment

**Environment** là một thuật ngữ không chính thức, mang nghĩa rộng, mô tả tập hiệu lực gồm các capability, component, package, configuration và runtime state mà một người dùng hoặc project có thể sử dụng.

Environment không phải là một entity first-class chuẩn trong V1.

Ưu tiên các thuật ngữ chính xác hơn như:

```text
Desired State
Resolution
Managed State
Actual State
```

---

# 80. Quy tắc đặt tên chuẩn

Dùng danh từ số ít cho tên entity:

```text
Provider
Package
Component
Capability
Preset
Profile
Policy
Project
Target
Resolution
```

Dùng lowercase kebab-case cho ID khi phù hợp:

```text
frontend-engineer
engineering-core
claude-code
```

Dùng ID phân cấp phân tách bằng dấu chấm cho Capability:

```text
engineering.testing.tdd
knowledge.research
security.review
```

Dùng `/` cho ID của Preset có phân loại:

```text
engineering/core
stacks/nextjs
knowledge/research
```

---

# 81. Thuật ngữ ưu tiên

Ưu tiên:

```text
Capability
```

thay vì:

```text
feature
ability
functionality
```

khi nói đến hành vi ngữ nghĩa đã được chuẩn hóa.

Ưu tiên:

```text
Package
```

thay vì:

```text
plugin
```

khi thảo luận về các đơn vị có thể cài đặt độc lập với runtime.

Ưu tiên:

```text
Preset
```

thay vì:

```text
bundle
pack
group
```

khi mô tả composition capability có thể tái sử dụng.

Ưu tiên:

```text
Profile
```

khi mô tả một role làm việc.

Ưu tiên:

```text
Policy
```

khi mô tả các ràng buộc.

---

# 82. Thuật ngữ cần tránh hoặc dùng cẩn thận

Tránh dùng:

```text
plugin
```

như thuật ngữ chung cho mọi domain object.

Tránh dùng:

```text
profile
```

cho các stack đặc thù của project.

Tránh dùng:

```text
preset
```

cho danh sách package đặc thù của provider, trừ khi có chủ đích rõ ràng.

Tránh dùng:

```text
official
```

như một từ đồng nghĩa với first-party.

Tránh dùng:

```text
native
```

như một từ đồng nghĩa với ownership.

Tránh dùng:

```text
addon
```

như một domain entity riêng biệt.

Tránh dùng:

```text
bundle
```

khi ý muốn nói là semantic composition.

---

# 83. Các phân biệt thường gặp

## Provider vs Package

```text
Provider
→ who / where

Package
→ what gets installed
```

---

## Package vs Component

```text
Package
→ installation unit

Component
→ functional unit
```

---

## Component vs Capability

```text
Component
→ implementation

Capability
→ semantic intent
```

---

## Preset vs Profile

```text
Preset
→ reusable capability composition

Profile
→ role using presets
```

---

## Profile vs Project

```text
Profile
→ who / working role

Project
→ repository-specific needs
```

---

## Policy vs Priority

```text
Policy
→ eligibility

Priority
→ preference among eligible candidates
```

---

## Suppressed vs Rejected

```text
Suppressed
→ valid but not selected

Rejected
→ invalid under current constraints
```

---

## First-Party vs Native

```text
First-party
→ ownership

Native
→ source/origin
```

---

## Catalog vs Upstream

```text
Upstream
→ what exists externally

Catalog
→ what this project knows and curates
```

---

## Sync vs Update

```text
Sync
→ reconcile project desired state

Update
→ deliberately change upstream version/state
```

---

## Resolution vs Materialization

```text
Resolution
→ decide what should be used

Materialization
→ apply that decision to a runtime
```

---

# 84. Trace chuẩn

Khi giải thích vì sao một thứ tồn tại, hãy dùng thứ tự sau:

```text
Project
   ↓
Profile
   ↓
Preset
   ↓
Capability
   ↓
Capability Implementation
   ↓
Component
   ↓
Package
   ↓
Provider
```

Khi giải thích quá trình thực thi:

```text
Resolution
   ↓
Lockfile
   ↓
Target Adapter
   ↓
Materialization
   ↓
Managed State
```

---

# 85. Vòng đời chuẩn

External tooling thường đi theo vòng đời:

```text
Provider
   ↓
Discovered Package / Component
   ↓
Curated
   ↓
Mapped to Capability
   ↓
Eligible Candidate
   ↓
Selected Implementation
   ↓
Locked
   ↓
Materialized
```

---

# 86. Tóm tắt bảng thuật ngữ

| Thuật ngữ | Định nghĩa ngắn |
|---|---|
| Provider | Nguồn hoặc nhà phát hành các Package |
| Package | Đơn vị có thể cài đặt/phân phối |
| Component | Đơn vị chức năng bên trong một Package |
| Capability | Khả năng ngữ nghĩa độc lập với provider |
| Capability Implementation | Component implement một Capability |
| Preset | Composition có thể tái sử dụng gồm các Capability |
| Profile | Role có thể tái sử dụng được compose từ các Preset |
| Project | Configuration mong muốn của một repository |
| Policy | Các ràng buộc được áp dụng trong quá trình resolution |
| Catalog | Metadata đã được curate về Provider/Package/Capability |
| Resolver | Tính toán ra các implementation cụ thể |
| Resolution | Kết quả của quá trình resolution |
| Candidate | Implementation được Resolver xem xét |
| Selected | Candidate được chọn để thỏa mãn một Capability |
| Suppressed | Eligible Candidate không được chọn |
| Rejected | Candidate không thỏa mãn một hard constraint |
| Target | Agent runtime nhận resolved state |
| Source Adapter | Chuẩn hóa upstream metadata |
| Target Adapter | Tạo ra output native của runtime |
| Materialization | Áp dụng Resolution vào một Target |
| Desired State | Trạng thái ngữ nghĩa do người dùng khai báo |
| Actual State | Trạng thái hiện tại của runtime |
| Managed State | Runtime state thuộc quyền sở hữu của `agent-plugins` |
| Sync | Reconcile Managed State với Desired State |
| Project Lockfile | Project resolution có thể tái tạo |
| Distribution Lock | Upstream baseline đã được curate |
| Provenance | Nguồn gốc và lịch sử source |
| Trust | Phân loại mức độ tin cậy theo policy/curation |
| Native | Source được lưu trữ bên trong repository này |
| First-Party | Thuộc quyền sở hữu của project này |
| Diagnostic | Phản hồi có cấu trúc về validation/resolution |

---

# 87. Quy tắc về thuật ngữ

Khi đưa vào một thuật ngữ mới, hãy tự hỏi:

1. Đã có thuật ngữ chuẩn nào mô tả khái niệm này chưa?
2. Thuật ngữ mới là một domain entity thực sự hay chỉ là ngôn ngữ UX?
3. Nó có chồng lấn với một khái niệm hiện có không?
4. Nó có cải thiện độ rõ ràng đủ để biện minh cho việc mở rộng bộ từ vựng không?

Nếu không, hãy tái sử dụng thuật ngữ hiện có.

---

# 88. Thuật ngữ trong một câu

> **Dùng Provider cho nguồn gốc, Package cho việc cài đặt, Component cho implementation, Capability cho intent, Preset cho composition, Profile cho role, Project cho nhu cầu của repository, Policy cho ràng buộc, Resolution cho lựa chọn cụ thể, và Target Adapter cho việc materialize vào runtime.**