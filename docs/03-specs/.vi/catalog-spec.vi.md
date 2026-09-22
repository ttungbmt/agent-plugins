# Đặc tả Catalog

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.  
**Hợp đồng chuẩn tắc:** `packages/schemas/schemas/{provider,package,capability}.schema.json` (source-of-truth.md §16, §55)

## Tổng quan

Tài liệu này định nghĩa định dạng catalog chuẩn được sử dụng bởi `agent-plugins`.

Catalog là lớp metadata được tuyển chọn (curated), kết nối các hệ sinh thái tooling bên ngoài với mô hình capability ngữ nghĩa.

Catalog trả lời các câu hỏi:

```text
Which Providers are recognized?

Which Packages are supported?

Which Capabilities exist?

Which Components implement those Capabilities?

Which implementations are preferred by default?

Which upstream state is curated and tested?
```

Catalog phải luôn:

- mang tính khai báo (declarative),
- con người có thể review được,
- máy có thể validate được,
- deterministic,
- nhận biết Provider (provider-aware),
- hướng capability (capability-oriented),
- độc lập với các project sử dụng nó.

Catalog không phải là project manifest và không được chứa ý định (intent) riêng của project.

---

# 1. Phạm vi

Đặc tả này định nghĩa:

```text
catalog directory structure

Provider manifests

Package manifests

Capability manifests

implementation mappings

canonical IDs

references

validation

loading

normalization

generated component inventories

distribution locking

catalog versioning
```

Đặc tả này không định nghĩa:

```text
Project manifests
Project lockfiles
Policy files
Preset/Profile files
runtime materialization
CLI behavior
```

Những phần đó được định nghĩa riêng.

---

# 2. Cấu trúc Catalog chuẩn

Cấu trúc chuẩn là:

```text
catalog/
├── providers/
│   ├── superpowers.yaml
│   ├── mattpocock.yaml
│   ├── ecc.yaml
│   ├── anthropic.yaml
│   ├── wshobson.yaml
│   └── agent-plugins.yaml
│
├── packages/
│   ├── superpowers.yaml
│   ├── mattpocock-skills.yaml
│   ├── ecc.yaml
│   └── ...
│
└── capabilities/
    ├── workflow/
    ├── engineering/
    ├── frontend/
    ├── backend/
    ├── security/
    ├── knowledge/
    ├── product/
    ├── devops/
    ├── tooling/
    └── gis/
```

Catalog bao gồm ba lớp entity có thẩm quyền (authoritative):

```text
Provider
Package
Capability
```

Inventory Component của bên thứ ba thường được khám phá (discover) tự động thay vì được duy trì thủ công dưới dạng các file catalog hạng nhất (first-class).

---

# 3. Quy tắc nguồn sự thật (Source-of-Truth) của Catalog

Có thẩm quyền (authoritative):

```text
catalog/providers/
catalog/packages/
catalog/capabilities/
```

Được dẫn xuất (derived):

```text
generated/catalog/components.json
generated/catalog/search-index.json
generated/catalog/reverse-index.json
```

Trạng thái phân phối được khóa (locked):

```text
catalog.lock
```

Chiều phụ thuộc là:

```text
Provider / Package Metadata
        +
Source Discovery
        +
Capability Curation
        ↓
Normalized Catalog
```

Các artifact được sinh ra (generated) không bao giờ được trở thành nguồn duy nhất của metadata ngữ nghĩa.

---

# 4. Manifest Envelope

Tất cả Catalog manifest chuẩn nên sử dụng một envelope chung.

Cấu trúc khuyến nghị:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Provider

metadata:
  id: superpowers
  name: Superpowers

spec:
  ...
```

Các kind được hỗ trợ trong V1:

```text
Provider
Package
Capability
```

Envelope chung cung cấp:

```text
schema version
entity kind
canonical identity
display metadata
specification body
```

---

# 5. `apiVersion`

Giá trị ban đầu:

```text
agent-plugins.dev/v1alpha1
```

Tất cả Catalog manifest có thẩm quyền phải khai báo schema version của chúng.

Version kiểm soát cấu trúc được serialize.

Nó không thay đổi danh tính ngữ nghĩa (semantic identity) của entity.

---

# 6. `kind`

Các giá trị được phép trong V1:

```text
Provider
Package
Capability
```

`kind` được khai báo phải khớp với schema được dùng để validate file.

Ví dụ:

```yaml
kind: Capability
```

phải được validate bằng Capability schema.

---

# 7. Metadata chung

Metadata chung khuyến nghị:

```yaml
metadata:
  id: engineering.testing.tdd
  name: Test-Driven Development
  description: Test-first software development workflow.
```

Các field bắt buộc:

```text
id
name
```

`description` nên là bắt buộc ở những nơi có ý nghĩa, đặc biệt là với Capability.

---

# 8. Canonical ID

Canonical ID phải:

```text
stable
unique within their entity scope
machine-friendly
human-readable
```

ID không nên được sinh ra từ tên hiển thị tại runtime.

Khi đã ổn định, việc thay đổi ID nên được xử lý như một migration thay vì một thao tác đổi tên thông thường.

---

# 9. Provider ID

Provider ID sử dụng kebab-case chữ thường.

Ví dụ:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

Pattern khuyến nghị:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Provider ID là duy nhất trên toàn cục trong Catalog.

---

# 10. Package ID

Package ID sử dụng kebab-case chữ thường.

Ví dụ:

```text
superpowers
mattpocock-skills
frontend-design
ecc
```

Danh tính Package chuẩn được giới hạn phạm vi (scoped) theo Provider:

```text
<provider-id>/<package-id>
```

Ví dụ:

```text
anthropic/frontend-design
```

Về mặt kỹ thuật, hai Provider có thể expose các Package có cùng ID cục bộ.

---

# 11. Capability ID

Capability ID sử dụng các namespace ngữ nghĩa chữ thường, phân tách bằng dấu chấm.

Ví dụ:

```text
workflow.planning
engineering.testing.tdd
security.review
knowledge.research
```

Pattern khuyến nghị:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$
```

Thông thường, Capability ID không được chứa tên Provider hoặc tên Target.

---

# 12. Tham chiếu Component

Một tham chiếu Component chuẩn phải không mơ hồ trên toàn cục.

Cú pháp khái niệm khuyến nghị:

```text
<provider>/<package>#<type>:<name>
```

Ví dụ:

```text
superpowers/superpowers#skill:test-driven-development

ecc/ecc#agent:security-reviewer

anthropic/frontend-design#skill:frontend-design
```

Cách encode chính xác có thể thay đổi trước khi có V1 ổn định, nhưng danh tính ngữ nghĩa phải luôn không mơ hồ.

---

# 13. Publisher Manifest

Một Publisher manifest định danh bên xuất bản nội dung: một dự án upstream,
hoặc một chủ sở hữu first-party.

Publisher chỉ mang **danh tính và trust**. Nó không mang toạ độ fetch — xem §17.

Ví dụ:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Publisher

metadata:
  id: superpowers
  name: Superpowers
  description: Workflow-oriented engineering skills.

spec:
  homepage: https://github.com/obra/superpowers
  repository: https://github.com/obra/superpowers
  trust: curated
```

ADR 0011 đã khai tử tên `Provider` cho entity này. Từ "provider" không được
dùng ở bất kỳ đâu trong dự án; trong các tài liệu đã archive nó mang nghĩa
Publisher.

---

# 14. Các field bắt buộc của Publisher

Một Publisher phải định nghĩa:

```text
metadata.id
metadata.name
spec
```

Không field nào dưới `spec` là bắt buộc, vì chưa field nào dưới `spec` được
resolver đọc. Publisher được load, kiểm tra tồn tại, ngoài ra là trơ. Field
chỉ được thêm vào schema khi đã có consumer đọc nó, không thêm trước.

---

# 15. Ownership của Publisher

Ownership phân biệt:

```text
first-party
third-party
```

Ownership không được suy ra chỉ từ vị trí nguồn, và nó là một khái niệm khác
với trust (§16).

**Chưa có trong schema.** `spec.ownership` được hoãn cho tới khi có một Policy
gate đọc nó, theo ADR 0011 D6. Trong lúc đó, ownership được thể hiện qua giá
trị `first-party` của `spec.trust`.

---

# 16. Trust Baseline của Publisher

Một Publisher có thể khai báo trust baseline:

```yaml
trust: curated
```

Các giá trị cho phép:

```text
first-party
official
curated
community
untrusted
```

Đây là metadata catalog nền, và phải đến từ curate tường minh, không bao giờ
từ độ phổ biến (§147). Policy vẫn có thể áp luật chặt hơn. Chưa Policy gate
nào đọc nó.

---

# 17. Source của Publisher — đã chuyển xuống Package

Publisher **không có** `spec.source`. Toạ độ fetch nằm ở Package:

```yaml
# catalog/packages/<id>.yaml
spec:
  source:
    type: git
    url: https://github.com/obra/superpowers.git
    ref: <commit SHA 40 ký tự hex>
```

Lý do (ADR 0011 D5): một Publisher có thể ship từ nhiều repository. Một khối
`repository:` cho mỗi Publisher sẽ buộc phải tách một Publisher cho mỗi
repository, làm entity tụt xuống thành toạ độ fetch và phá mất phân biệt giữa
*ai xuất bản* và *bytes nằm ở đâu*. Trust cũng phải ổn định khi repository
được di chuyển.

Xem §24 cho hình dạng của Package source.

---

# 18. Discovery của Publisher — đã chuyển xuống Package

Publisher **không có** `spec.discovery`. Discovery được khai báo theo từng Package:

```yaml
# catalog/packages/<id>.yaml
spec:
  discovery:
    manifest: .claude-plugin/plugin.json
```

Plugin manifest của upstream được đọc thay vì glob cả cây, vì một repository
có thể chứa nhiều Component hơn số nó thực sự ship: `mattpocock/skills` có 38
tệp `SKILL.md` nhưng chỉ ship 25.

Cấu hình discovery không được chứa mapping Capability mang tính ngữ nghĩa.

---

# 19. Link của Publisher

Metadata tham khảo, tuỳ chọn:

```yaml
spec:
  homepage: https://www.aihero.dev
  repository: https://github.com/mattpocock/skills
```

Link chỉ mang tính tham khảo. `spec.repository` không bao giờ được định nghĩa
danh tính fetch canonical — danh tính đó nằm ở `Package.spec.source` (§24).

---

# 20. Native Publisher

Publisher native được khuyến nghị:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Publisher

metadata:
  id: agent-plugins
  name: Agent Plugins

spec:
  trust: first-party
```

Nội dung native vẫn nằm tại:

```text
plugins/native/
```

---

# 21. Package Manifest

Một Package manifest định nghĩa một đơn vị cài đặt hoặc phân phối thuộc về
đúng một Publisher.

Ví dụ:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Package

metadata:
  id: mattpocock-skills
  name: Matt Pocock Skills

spec:
  publisher: mattpocock

  materialization: collection

  source:
    type: git
    url: https://github.com/mattpocock/skills.git
    ref: c55ee46073ed923f86ce59a5eb3b6d895095d1b7

  discovery:
    manifest: .claude-plugin/plugin.json

  targets:
    - claude-code

  components:
    tdd:
      requires: [codebase-design]
```

`materialization` được định nghĩa ở ADR 0010 D2. `components.<name>.requires`
do người curate khai báo, không bao giờ suy ra từ nội dung Component.

---

# 22. Các field bắt buộc của Package

Một Package phải định nghĩa:

```text
metadata.id
metadata.name

spec.publisher
spec.materialization
spec.source
spec.discovery
```

---

# 23. Tham chiếu Publisher

Mỗi Package phải tham chiếu đúng một Publisher.

Ví dụ:

```yaml
publisher: superpowers
```

Tham chiếu phải resolve được tới:

```text
catalog/publishers/superpowers.yaml
```

Tham chiếu Publisher không tồn tại làm Catalog validation fail với
`UNKNOWN_PUBLISHER`. Publisher không được Package nào tham chiếu sẽ bị báo
`UNUSED_PUBLISHER`.

---

# 24. Source của Package

Package source là toạ độ fetch đầy đủ và tuyệt đối — không phải đường dẫn
tương đối so với bất cứ thứ gì trên Publisher.

```yaml
source:
  type: git
  url: https://github.com/mattpocock/skills.git
  ref: c55ee46073ed923f86ce59a5eb3b6d895095d1b7
```

`type` là cách truy cập. Nó là một **field enum, không phải entity**: không có
tệp catalog nào cho `git`, và nó không bao giờ được gọi là provider (ADR 0011
D4). Backend được hiện thực trong code; `git` là giá trị duy nhất ở V1.

`ref` phải là commit SHA bất biến 40 ký tự. `main`, `latest` và `HEAD` bị cấm
(security-model.md:831-835) và bị từ chối cả ở schema lẫn lúc fetch. ADR 0010
D7 cũng loại source type `github`, vì nó clone qua SSH và fail khi không có key.

---

# 25. Discovery của Package

Discovery ở cấp Package tinh chỉnh những gì Package manifest khai báo (§18).

Ví dụ:

```yaml
discovery:
  include:
    - skills/**
  exclude:
    - internal/**
```

Các quy tắc discovery xác định các Component.

Chúng không quyết định các ánh xạ Capability ngữ nghĩa.

---

# 26. Metadata Target của Package

Một Package có thể khai báo khả năng tương thích target ở mức tổng quát.

Ví dụ:

```yaml
targets:
  - claude-code
```

Metadata ở cấp Component có thể giới hạn thêm phạm vi hỗ trợ.

Khả năng tương thích tổng quát của Package không được tự động ngụ ý rằng mọi Component bên trong đều hoạt động giống hệt nhau trên mọi Target.

---

# 27. Chiến lược version của Package

Các giá trị khái niệm khuyến nghị:

```text
distribution-lock
fixed
native
```

Ví dụ:

```yaml
version:
  strategy: distribution-lock
```

Ý nghĩa:

```text
exact version/ref is resolved from catalog.lock
```

Các native package có thể sử dụng:

```yaml
version:
  strategy: native
```

---

# 28. Metadata bảo mật của Package

Một Package có thể chứa các chú thích (annotation) liên quan đến bảo mật.

Ví dụ:

```yaml
security:
  mayContainExecutableComponents: true
```

Tuy nhiên, rủi ro thực thi thực tế nên ưu tiên được khám phá hoặc mô hình hóa ở cấp Component.

Tránh các field toàn cục quá đơn giản như:

```yaml
safe: true
```

---

# 29. Capability Manifest

Một Capability manifest định nghĩa ý định ngữ nghĩa (semantic intent) và các implementation đã được tuyển chọn của nó.

Ví dụ:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.testing.tdd
  name: Test-Driven Development
  description: >
    Provides a test-first software development workflow.

spec:
  cardinality: one

  stability: stable

  tags:
    - testing
    - engineering

  implementations:
    - component: superpowers/superpowers#skill:test-driven-development
      priority: 100

    - component: mattpocock/skills#skill:tdd
      priority: 80

    - component: ecc/ecc#skill:tdd-workflow
      priority: 70
```

---

# 30. Các field bắt buộc của Capability

Một Capability phải định nghĩa:

```text
metadata.id
metadata.name
metadata.description

spec.cardinality
spec.implementations
```

Danh sách implementation chỉ có thể tạm thời để trống đối với các Capability thử nghiệm hoặc đang được lên kế hoạch, nếu các quy tắc validation cho phép một cách tường minh.

Các Capability stable bắt buộc thông thường nên có ít nhất một implementation.

---

# 31. Cardinality của Capability

Các giá trị được phép trong V1:

```text
one
many
```

Ví dụ:

```yaml
cardinality: one
```

Cardinality mang tính ngữ nghĩa và độc lập với số lượng implementation.

---

# 32. Stability của Capability

Các giá trị khuyến nghị:

```text
experimental
stable
deprecated
removed
```

Ví dụ:

```yaml
stability: stable
```

Nếu bị bỏ qua trong V1, giá trị mặc định có thể là:

```text
experimental
```

cho đến khi taxonomy ổn định.

---

# 33. Dependency của Capability

Một Capability có thể khai báo các dependency ngữ nghĩa.

Ví dụ:

```yaml
requires:
  - tooling.browser
```

Các dependency tùy chọn có thể được biểu diễn riêng.

Ví dụ:

```yaml
optional:
  - knowledge.web-research
```

Ngữ nghĩa chính xác của optional nên thống nhất với `resolution-spec.md`.

---

# 34. Alias của Capability

Alias tùy chọn:

```yaml
aliases:
  - tdd
  - test-driven-development
```

Alias hữu ích cho:

```text
search
migration
CLI discovery
```

Alias không được trở thành canonical ID.

---

# 35. Tag của Capability

Tag chỉ mang tính thông tin.

Ví dụ:

```yaml
tags:
  - testing
  - engineering
```

Tag không nên ảnh hưởng trực tiếp đến resolution deterministic trong V1.

---

# 36. Implementation của Capability

Mỗi implementation ánh xạ một Component tới Capability.

Field bắt buộc:

```text
component
```

Khuyến nghị:

```text
priority
```

Các field có thể có trong tương lai:

```text
status
targets
notes
constraints
```

---

# 37. Ví dụ ánh xạ implementation

```yaml
implementations:
  - component: superpowers/superpowers#skill:test-driven-development
    priority: 100
```

Điều này có nghĩa là:

```text
the referenced Component is a curated implementation of this Capability
```

Nó không có nghĩa là:

```text
the Component is always selected
```

Việc lựa chọn thuộc về Resolver.

---

# 38. Priority của implementation

Priority là một số nguyên.

Khoảng giá trị khuyến nghị:

```text
0–1000
```

Ví dụ:

```yaml
priority: 100
```

Giá trị cao hơn biểu thị mức ưu tiên mặc định mạnh hơn của Catalog.

Priority không phải là:

```text
quality score
trust score
popularity score
```

---

# 39. Priority mặc định

Nếu bị bỏ qua, cần định nghĩa một giá trị mặc định deterministic duy nhất.

Khuyến nghị:

```text
0
```

Nên sử dụng priority tường minh cho các Capability có `cardinality: one` với nhiều implementation cạnh tranh nhau.

---

# 40. Status của implementation

Một ánh xạ về sau có thể hỗ trợ:

```text
active
deprecated
disabled
removed
```

Ví dụ:

```yaml
status: deprecated
```

Nếu bị bỏ qua:

```text
active
```

có thể được giả định.

---

# 41. Thay thế Capability

Các Capability deprecated có thể tham chiếu tới một Capability thay thế.

Ví dụ:

```yaml
stability: deprecated

replacement:
  capability: engineering.testing.tdd
```

Capability thay thế phải tham chiếu tới một Capability đang tồn tại.

---

# 42. Inventory Component

Định nghĩa Component bên ngoài nói chung không nên được sao chép thủ công dưới dạng:

```text
catalog/components/*.yaml
```

Thay vào đó:

```text
Source Adapter
    ↓
generated/catalog/components.json
```

Inventory được sinh ra ghi nhận các dữ kiện (fact) từ upstream.

Các ánh xạ Capability tham chiếu tới canonical Component ID từ inventory đó.

---

# 43. Inventory Component gốc (Native)

Native Component thì khác.

Source implementation thực tế của chúng nằm tại:

```text
plugins/native/
```

Native Component có thể được khám phá từ các file đó bằng cùng một mô hình Component đã chuẩn hóa.

Chúng không cần được sao chép thủ công vào một Component catalog riêng theo kiểu bên thứ ba.

---

# 44. Bản ghi Component được sinh ra

Về mặt khái niệm:

```json
{
  "id": "superpowers/superpowers#skill:test-driven-development",
  "provider": "superpowers",
  "package": "superpowers",
  "type": "skill",
  "name": "test-driven-development",
  "sourcePath": "skills/test-driven-development",
  "targets": ["claude-code"]
}
```

Định dạng này chỉ mang tính minh họa.

Schema chính xác của dữ liệu được sinh ra thuộc về các implementation contract.

---

# 45. Nguồn metadata của Component

Metadata của Component có thể kết hợp:

```text
upstream discovered facts
+
Package metadata
+
curated annotations
```

Ví dụ:

```text
name
→ discovered

type
→ discovered

source path
→ discovered

Capability mapping
→ curated

priority
→ curated

trust override
→ curated if needed
```

---

# 46. Thứ tự ưu tiên metadata

Thứ tự ưu tiên khuyến nghị cho metadata Component đã chuẩn hóa:

```text
immutable upstream fact
        +
explicit curated annotation
        ↓
normalized Component
```

Metadata được tuyển chọn chỉ có thể chú thích hoặc ghi đè những field được thiết kế tường minh cho việc tuyển chọn.

Không được âm thầm viết lại nguồn gốc (provenance) mang tính dữ kiện.

---

# 47. Nạp Catalog

Về mặt khái niệm, việc nạp Catalog nên tuân theo:

```text
Read manifests
    ↓
Schema validation
    ↓
Canonical ID validation
    ↓
Reference validation
    ↓
Load generated Component inventory
    ↓
Resolve Capability implementation references
    ↓
Normalize
    ↓
Build Catalog
```

---

# 48. Thứ tự nạp

Thứ tự nạp khuyến nghị:

```text
1. Providers

2. Packages

3. Components

4. Capabilities
```

bởi vì:

```text
Package references Provider

Component references Package

Capability implementation references Component
```

Catalog đã chuẩn hóa cuối cùng không nên phụ thuộc vào thứ tự của filesystem.

---

# 49. Liệt kê filesystem

Việc nạp manifest phải sắp xếp các tên file được khám phá theo thứ tự chuẩn trước khi xử lý.

Không được dựa vào thứ tự liệt kê thư mục của hệ điều hành.

Điều này hỗ trợ việc chẩn đoán và sinh dữ liệu một cách deterministic.

---

# 50. Validation Provider

Validate:

```text
unique Provider ID

valid ID syntax

valid ownership

valid source type

valid discovery adapter

valid trust classification
```

Nếu discovery của Provider tham chiếu tới một adapter không khả dụng:

```text
validation fails
```

---

# 51. Validation Package

Validate:

```text
unique Provider/Package identity

Provider exists

valid source configuration

valid version strategy

valid targets

valid discovery configuration
```

Một Package không được tự tham chiếu chính nó như một dependency nếu về sau package dependency được hỗ trợ.

---

# 52. Validation Capability

Validate:

```text
unique Capability ID

valid namespace

valid cardinality

valid stability

all aliases valid

all dependencies exist

all implementation Component references exist

all priorities valid
```

---

# 53. Validation chu trình dependency của Capability

Đồ thị dependency của Capability phải không có chu trình (acyclic).

Ví dụ lỗi:

```text
CAPABILITY_CYCLE

engineering.testing.e2e
→ tooling.browser
→ tooling.automation
→ engineering.testing.e2e
```

---

# 54. Validation xung đột alias

Alias không được tạo ra hành vi tìm kiếm hoặc migration mơ hồ.

Không hợp lệ:

```text
Capability A alias: tdd

Capability B alias: tdd
```

trừ khi alias được giới hạn phạm vi một cách tường minh.

Quy tắc khuyến nghị cho V1:

```text
global alias uniqueness
```

---

# 55. Validation tham chiếu Component

Với mọi implementation của Capability:

```text
component must exist
```

Ví dụ ánh xạ không hợp lệ:

```yaml
component: superpowers/superpowers#skill:does-not-exist
```

nên làm validation thất bại.

---

# 56. Validation quan hệ thành viên Package

Mọi Component phải resolve tới một Package hợp lệ.

Ví dụ:

```text
superpowers/superpowers#skill:tdd
```

yêu cầu:

```text
Provider: superpowers
Package: superpowers
```

phải tồn tại.

---

# 57. Validation quan hệ thành viên Provider

Mọi Package phải resolve tới một Provider hợp lệ.

Chuỗi quan hệ:

```text
Capability
→ Component
→ Package
→ Provider
```

phải luôn có thể duyệt được.

---

# 58. Component ID trùng lặp

Source discovery phải phát hiện các Component ID đã chuẩn hóa bị trùng lặp.

Ví dụ:

```text
two upstream files normalize to the same Component reference
```

Trường hợp này nên làm discovery/generation thất bại thay vì âm thầm ghi đè.

---

# 59. Ánh xạ Capability trùng lặp

Một Component có thể chủ ý implement nhiều Capability.

Tuy nhiên, cùng một ánh xạ:

```text
Capability
+
Component
```

không được xuất hiện hai lần.

Các ánh xạ trùng lặp nên làm validation thất bại.

---

# 60. Validation priority với Cardinality-One

Với:

```text
cardinality: one
```

có nhiều implementation active, thông thường maintainer nên cung cấp priority tường minh.

Nếu các priority giống hệt nhau:

```text
validation may allow it
```

nhưng nên cảnh báo rằng Resolution tại runtime có thể trở nên mơ hồ.

---

# 61. Cảnh báo của Catalog

Các cảnh báo hữu ích bao gồm:

```text
Capability has no implementation

stable Capability only has deprecated implementations

cardinality-one Capability has equal-priority candidates

deprecated Capability still used in Preset/Profile

Package has no discovered Components

curated implementation references deprecated Component
```

Cảnh báo không nhất thiết làm Catalog trở nên không hợp lệ.

---

# 62. Lỗi của Catalog

Các lỗi bao gồm:

```text
duplicate canonical ID

invalid schema

missing Provider

missing Package

missing Component

invalid Capability dependency

dependency cycle

invalid Component reference

unknown adapter

invalid enum
```

Lỗi ngăn không cho sử dụng Catalog.

---

# 63. Chuẩn hóa Catalog

Các file Catalog được serialize nên được chuyển đổi thành các domain object đã chuẩn hóa trước khi Resolution.

Ví dụ:

```text
YAML
↓
Manifest DTO
↓
Normalized Provider / Package / Capability
↓
Catalog
```

Resolver không nên tiêu thụ trực tiếp các cấu trúc YAML thô.

---

# 64. Catalog đã chuẩn hóa

Về mặt khái niệm:

```text
Catalog

providers:
  Map<ProviderId, Provider>

packages:
  Map<PackageRef, Package>

components:
  Map<ComponentRef, Component>

capabilities:
  Map<CapabilityId, Capability>

implementations:
  Map<CapabilityId, CapabilityImplementation[]>
```

Các cấu trúc dữ liệu chính xác là chi tiết implementation.

---

# 65. Index của Catalog

Các index tại runtime có thể được xây dựng trong bộ nhớ:

```text
Capability → Implementations

Component → Capabilities

Package → Components

Provider → Packages
```

Các index này nên được dẫn xuất.

Chúng không cần các file có thẩm quyền độc lập.

---

# 66. Sinh Reverse Index

Một reverse index được sinh ra có thể chứa:

```text
Component → Capabilities

Capability → Presets

Preset → Profiles

Provider → Packages
```

Hữu ích cho:

```text
impact analysis
search
explainability
update reporting
```

---

# 67. Search Index

File được sinh ra:

```text
generated/catalog/search-index.json
```

có thể chứa các field có thể tìm kiếm đã được phi chuẩn hóa (denormalized):

```text
ID

name

description

aliases

tags

entity kind
```

Search index không bao giờ được ảnh hưởng đến resolution ngữ nghĩa.

---

# 68. Distribution Lock

Catalog sử dụng:

```text
catalog.lock
```

để ghim (pin) trạng thái upstream chính xác.

Về mặt khái niệm:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: CatalogLock

providers:
  superpowers:
    packages:
      superpowers:
        version: 6.4.0
        ref: abc123...
        integrity: ...
```

Định dạng chính xác thuộc về `lockfile-spec.md` hoặc phần con distribution-lock trong đó.

---

# 69. Catalog Manifest so với Distribution Lock

Package manifest:

```text
What Package is this?
```

Distribution lock:

```text
Which exact version is currently curated?
```

Không đặt các commit được ghim, vốn liên tục thay đổi, trực tiếp vào metadata định danh của Package, trừ khi một Package cố định (fixed) chủ ý yêu cầu điều đó.

---

# 70. Version của Catalog

Catalog có thể expose một định danh ở cấp phân phối (distribution-level).

Các cách biểu diễn có thể có:

```text
Git commit

release version

catalog digest
```

Định danh này có thể được ghi lại trong lockfile của consumer.

---

# 71. Catalog Digest

Một digest deterministic có thể được tính trên trạng thái Catalog có thẩm quyền đã chuẩn hóa.

Về mặt khái niệm:

```text
catalogDigest =
hash(
  providers
  packages
  capabilities
  distribution lock
)
```

Preset, Profile và Policy có thể có digest riêng hoặc tham gia vào một distribution digest rộng hơn, tùy thuộc vào thiết kế lockfile.

---

# 72. Serialize deterministic

Output Catalog đã chuẩn hóa được sinh ra nên sử dụng thứ tự ổn định.

Khuyến nghị:

Provider:

```text
sort by Provider ID
```

Package:

```text
sort by Provider ID, then Package ID
```

Component:

```text
sort by Component reference
```

Capability:

```text
sort by Capability ID
```

Danh sách implementation:

```text
sort by priority descending
then Component reference ascending
```

Output ổn định giúp cải thiện việc review và khả năng tái lập (reproducibility).

---

# 73. Thay đổi Catalog

Các thay đổi Catalog phải diễn ra thông qua các chỉnh sửa có chủ ý.

Ví dụ:

```text
add Provider

add Package

add Capability

change implementation mapping

change priority

deprecate Capability
```

Source discovery không được âm thầm thay đổi các file Catalog có thẩm quyền.

---

# 74. Thêm một Provider

Các bước bắt buộc:

```text
1. Create Provider manifest

2. Create one or more Package manifests

3. Configure discovery adapter

4. Pin approved upstream state in catalog.lock

5. Run discovery

6. Review Components

7. Add Capability mappings

8. Validate Catalog

9. Run resolver tests

10. Regenerate derived indexes
```

---

# 75. Thêm một Package

Bắt buộc:

```text
Provider exists

Package ID selected

source configured

discovery configured

curated version pinned if external
```

Sau đó:

```text
discover
validate
curate mappings
```

---

# 76. Thêm một Capability

Trước khi thêm một Capability, hãy tuân theo checklist của Capability Model.

Sau đó tạo:

```text
catalog/capabilities/<namespace>/<name>.yaml
```

Ví dụ:

```text
catalog/capabilities/engineering/testing/tdd.yaml
```

---

# 77. Thêm một Implementation

Để ánh xạ một Component:

```text
confirm Component exists

review semantics

review security metadata

review Target support

assign default priority

add mapping to Capability
```

Không nên ánh xạ một Component chỉ vì tên của nó trông có vẻ tương tự.

---

# 78. Gỡ bỏ một Implementation

Ưu tiên chuyển đổi theo vòng đời (lifecycle):

```text
active
→ deprecated
→ removed
```

khi hữu ích.

Việc gỡ bỏ một ánh xạ có thể ảnh hưởng đến các thành phần hiện có:

```text
Presets
Profiles
consumer lockfiles
```

Cần thực hiện phân tích tác động (impact analysis).

---

# 79. Gỡ bỏ một Capability

Một Capability stable thông thường nên được:

```text
deprecated
```

trước khi:

```text
removed
```

khi có thể migration.

Capability thay thế nên được ghi lại trong tài liệu.

---

# 80. Cập nhật Provider

Việc cập nhật một Provider không tự động thay đổi các ánh xạ Catalog ngữ nghĩa.

Workflow:

```text
new upstream state
    ↓
source adapter discovery
    ↓
component diff
    ↓
mapping validation
    ↓
maintainer review
    ↓
catalog.lock update
```

Ánh xạ chỉ được thay đổi nếu việc review ngữ nghĩa yêu cầu.

---

# 81. Component mới được khám phá

Các Component mới được:

```text
discovered
```

chứ không tự động được:

```text
curated
```

Chúng có thể xuất hiện trong các báo cáo discovery/update mà không trở thành ứng viên (candidate) của Resolver.

---

# 82. Component upstream bị gỡ bỏ

Nếu một Component upstream biến mất:

```text
generated inventory reports removal
```

Các ánh xạ Capability tham chiếu tới nó trở nên không hợp lệ đối với trạng thái curated mới.

Tooling cập nhật nên xác định các Capability bị ảnh hưởng.

---

# 83. Đổi tên Component

Nếu upstream đổi tên một Component:

```text
old Component reference
→ removed/deprecated

new Component reference
→ discovered
```

Maintainer phải review xem Component mới có tương đương về mặt ngữ nghĩa hay không trước khi ánh xạ lại.

Không tự động giả định rằng việc đổi tên là tương đương.

---

# 84. Tái cấu trúc repository của Provider

Nếu cấu trúc thư mục thay đổi mà danh tính ngữ nghĩa của Component không đổi, Source Adapter có thể giữ nguyên các canonical Component ID ổn định khi có thể.

Danh tính Component chuẩn không nhất thiết phải phụ thuộc vào đường dẫn source vật lý.

---

# 85. Tính ổn định của danh tính Component

Component ID nên ưu tiên danh tính logic từ upstream thay vì các đường dẫn filesystem dễ thay đổi.

Tốt:

```text
#skill:test-driven-development
```

Có thể dễ vỡ:

```text
#skill:skills/v2/testing/tdd/SKILL.md
```

Đường dẫn source nên tiếp tục là metadata thay vì là danh tính khi có thể.

---

# 86. Tách biệt Catalog và Policy

Catalog có thể định nghĩa:

```text
baseline trust classification

Component security facts

default implementation priority
```

Policy định nghĩa:

```text
what current Project allows or prefers
```

Catalog không được mã hóa các quyết định policy riêng của Project.

---

# 87. Tách biệt Catalog và Profile

Catalog trả lời:

```text
what exists?
```

Profile trả lời:

```text
what does this role need?
```

Profile không được nhúng bên trong Catalog manifest.

---

# 88. Tách biệt Catalog và Preset

Catalog định nghĩa các Capability ngữ nghĩa.

Preset định nghĩa việc kết hợp (composition) Capability có thể tái sử dụng.

Không thêm:

```yaml
recommendedPresets:
```

vào bên trong mọi Capability chỉ để mã hóa composition.

Các quan hệ ngược có thể được sinh ra.

---

# 89. Tách biệt Catalog và Target

Catalog có thể mô tả khả năng tương thích của Component/Package.

Target adapter định nghĩa hành vi materialization tại runtime.

Không đặt các chỉ dẫn render riêng cho Claude bên trong Capability manifest.

---

# 90. Tách biệt Catalog và Source Adapter

Source Adapter:

```text
discovers upstream facts
```

Catalog:

```text
defines project curation
```

Một Source Adapter không được quyết định:

```text
Capability priority
Profile membership
Preset membership
```

---

# 91. Tách biệt Catalog và Resolver

Catalog:

```text
Candidate universe
```

Resolver:

```text
Project-specific selection
```

Catalog không nên chứa các field như:

```text
selected: true
```

đối với các implementation thông thường.

Việc lựa chọn phụ thuộc vào ngữ cảnh.

---

# 92. Tách biệt Catalog và Lockfile

Catalog định nghĩa các implementation khả dĩ.

Lockfile ghi lại các implementation được chọn cho một Project.

Không lưu trạng thái đã resolve riêng của consumer trong Catalog.

---

# 93. Extension Field

V1 nên tránh các extension field tùy ý không có kiểu (untyped).

Nếu cần metadata mở rộng, hãy sử dụng một cấu trúc có namespace rõ ràng.

Về mặt khái niệm:

```yaml
extensions:
  some-namespace:
    ...
```

Ưu tiên bổ sung các schema field được định nghĩa rõ ràng khi một khái niệm trở nên hữu ích rộng rãi.

---

# 94. Comment

Comment YAML được phép dùng cho maintainer.

Tuy nhiên, hành vi ngữ nghĩa không bao giờ được phụ thuộc vào comment.

Mọi metadata liên quan đến máy phải được biểu diễn dưới dạng cấu trúc.

---

# 95. Đặt tên file

File Provider:

```text
<provider-id>.yaml
```

File Package:

```text
<package-id>.yaml
```

File Capability:

```text
<final-capability-segment>.yaml
```

nằm trong các thư mục namespace.

Ví dụ:

```text
engineering/testing/tdd.yaml
```

---

# 96. Mỗi file một entity

Quy tắc ưu tiên cho V1:

```text
one Provider per file

one Package per file

one Capability per file
```

Lợi ích:

```text
clean diffs
easy ownership
simple references
easy generation
easy review
```

Các inventory lớn được sinh ra là ngoại lệ.

---

# 97. Provider có nhiều Package

Một Provider có thể có nhiều file Package.

Ví dụ:

```text
Provider:
anthropic

Packages:
anthropic/frontend-design
anthropic/typescript-lsp
anthropic/plugin-dev
```

Mỗi Package vẫn có thể được tham chiếu độc lập.

---

# 98. Xung đột tên Package

Nếu hai Provider cùng có:

```text
core
```

thì danh tính đầy đủ của chúng vẫn khác nhau:

```text
provider-a/core

provider-b/core
```

Tính duy nhất của Package ID cục bộ chỉ bắt buộc trong phạm vi một Provider.

---

# 99. Xung đột tên Capability

Capability ID là duy nhất trên toàn cục.

Không có giới hạn phạm vi theo Provider.

Do đó:

```text
engineering.testing.tdd
```

chỉ có thể tồn tại một lần dưới dạng một Capability ngữ nghĩa chuẩn.

---

# 100. Field không xác định

Hành vi khuyến nghị cho V1:

Các manifest có thẩm quyền nên mặc định từ chối các field không xác định.

Điều này giúp phát hiện:

```text
typos

stale fields

unsupported semantics
```

Ví dụ:

```yaml
prioroty: 100
```

nên thất bại thay vì bị âm thầm bỏ qua.

---

# 101. Tương thích về sau (Forward Compatibility)

Các field tùy chọn mới có thể được bổ sung trong các schema version sau này.

Consumer nên validate theo giá trị đã khai báo:

```text
apiVersion
```

thay vì chấp nhận các field không xác định một cách mù quáng.

---

# 102. Định dạng manifest

Phong cách khuyến nghị:

```text
2-space indentation

UTF-8

LF line endings

stable key order where practical
```

Việc định dạng nên được tự động hóa khi có thể.

---

# 103. Thứ tự key chuẩn

Thứ tự khuyến nghị:

```text
apiVersion
kind
metadata
spec
```

Bên trong `metadata`:

```text
id
name
description
```

Bên trong `spec`, sắp xếp các field theo mức độ quan trọng về ngữ nghĩa thay vì theo bảng chữ cái khi điều đó giúp dễ đọc hơn.

---

# 104. Lệnh validate Catalog

Về mặt khái niệm:

```bash
ap catalog validate
```

hoặc lệnh tương đương dành cho maintainer:

```bash
pnpm validate:catalog
```

Cách đặt tên CLI trong V1 có thể khác.

Validation nên có thể tái sử dụng từ CI.

---

# 105. Lệnh sinh Catalog

Về mặt khái niệm:

```bash
pnpm generate:catalog
```

nên:

```text
load Provider/Package metadata

read catalog.lock

run source adapters

normalize Components

validate references

generate Component inventory

generate indexes
```

Nó không được tự động viết lại các ánh xạ Capability đã được tuyển chọn.

---

# 106. Pipeline kiểm tra Catalog

Trình tự CI khuyến nghị:

```text
Schema Validate
      ↓
Discover / Load Components
      ↓
Reference Validate
      ↓
Graph Validate
      ↓
Semantic Validate
      ↓
Generate Indexes
      ↓
Check Drift
```

---

# 107. Catalog Drift

Các artifact Catalog được sinh ra bị lỗi thời (stale) khi:

```text
canonical metadata changed
```

hoặc:

```text
catalog.lock changed
```

mà không được sinh lại.

CI nên phát hiện điều này.

---

# 108. Tính deterministic của Catalog

Với cùng các đầu vào giống hệt nhau:

```text
Provider manifests

Package manifests

Capability manifests

catalog.lock

source adapter version

upstream immutable refs
```

Việc sinh Catalog phải tạo ra output đã chuẩn hóa tương đương.

---

# 109. Tính deterministic của Discovery

Source adapter nên hoạt động trên trạng thái upstream bất biến đã được ghim khi có thể.

Tránh xây dựng inventory chuẩn được sinh ra từ:

```text
latest branch head
```

mà không có lock.

Ưu tiên:

```text
commit SHA
```

---

# 110. Tính deterministic của Native Package

Native package đến từ trạng thái hiện tại của repository.

Đối với các bản phân phối đã release, chính commit/release của repository cung cấp ranh giới bất biến.

---

# 111. Quy tắc bảo mật của Catalog

Việc nạp Catalog không được thực thi code upstream tùy ý.

Discovery nên kiểm tra các file và manifest dưới dạng dữ liệu.

Tránh:

```text
running install scripts

executing hooks

loading untrusted JS config through eval
```

trong quá trình sinh Catalog.

---

# 112. Discovery mang tính khai báo

Khi có thể, discovery nên sử dụng:

```text
filesystem inspection

manifest parsing

known format parsing
```

thay vì thực thi tooling của provider.

---

# 113. Xử lý symlink

Source adapter nên định nghĩa hành vi xử lý symlink một cách deterministic.

Khuyến nghị:

```text
do not follow symlinks outside the checked-out provider root
```

trừ khi được yêu cầu tường minh và được xử lý an toàn.

Điều này tránh việc vô tình duyệt ra ngoài phạm vi.

---

# 114. An toàn đường dẫn

Các đường dẫn source đã chuẩn hóa phải luôn tương đối so với source root đã được ghim.

Từ chối path traversal như:

```text
../../outside
```

---

# 115. Review bảo mật cho ánh xạ Capability

Việc ánh xạ một Component không tự động làm cho nó an toàn.

Maintainer nên review các Component nhạy cảm về bảo mật như:

```text
hooks
commands
scripts
MCP servers
```

Metadata mang tính dữ kiện liên quan nên có sẵn cho việc đánh giá Policy.

---

# 116. Trust metadata phải tường minh

Không suy ra trust từ:

```text
GitHub stars

download count

repository popularity
```

một cách tự động.

Các chỉ số như vậy có thể một ngày nào đó hỗ trợ việc review của maintainer, nhưng chúng không phải là phân loại trust.

---

# 117. Ví dụ Provider ban đầu

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Provider

metadata:
  id: superpowers
  name: Superpowers
  description: Engineering workflow capabilities.

spec:
  ownership: third-party

  trust:
    baseline: curated

  source:
    type: git
    repository: obra/superpowers

  discovery:
    adapter: superpowers
```

---

# 118. Ví dụ Package ban đầu

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Package

metadata:
  id: superpowers
  name: Superpowers

spec:
  provider: superpowers

  source:
    path: .

  version:
    strategy: distribution-lock

  targets:
    - claude-code
```

---

# 119. Ví dụ Capability ban đầu

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.testing.tdd
  name: Test-Driven Development
  description: >
    Guides implementation using a test-first development cycle.

spec:
  cardinality: one

  stability: experimental

  aliases:
    - tdd
    - test-driven-development

  tags:
    - engineering
    - testing

  implementations:
    - component: superpowers/superpowers#skill:test-driven-development
      priority: 100

    - component: mattpocock/skills#skill:tdd
      priority: 80

    - component: ecc/ecc#skill:tdd-workflow
      priority: 70
```

---

# 120. Ví dụ Capability có dependency

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.testing.e2e
  name: End-to-End Testing
  description: >
    Provides end-to-end testing capabilities.

spec:
  cardinality: many

  stability: experimental

  requires:
    - tooling.browser

  implementations:
    - component: ecc/ecc#agent:e2e-runner
      priority: 100
```

---

# 121. Ví dụ Capability deprecated

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.tdd
  name: TDD

spec:
  cardinality: one

  stability: deprecated

  replacement:
    capability: engineering.testing.tdd

  implementations: []
```

Điều này cho phép migration có kiểm soát.

---

# 122. Ví dụ Native Package

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Package

metadata:
  id: second-brain
  name: Second Brain

spec:
  provider: agent-plugins

  source:
    path: plugins/native/second-brain

  version:
    strategy: native

  targets:
    - claude-code
```

---

# 123. Mô hình hợp nhất Catalog

Về mặt khái niệm, Catalog đã chuẩn hóa được lắp ghép từ:

```text
Provider Manifests

        +

Package Manifests

        +

Discovered Component Inventory

        +

Capability Manifests

        +

Distribution Lock
```

Kết quả là một mô hình đầu vào thống nhất duy nhất cho Resolver.

---

# 124. Contract của Catalog Loader

Về mặt khái niệm:

```ts
interface CatalogLoader {
  load(input: CatalogInput): Promise<Catalog>
}
```

`CatalogInput` có thể bao gồm:

```text
catalog root

generated Component inventory

distribution lock
```

Catalog Loader chỉ nên trả về trạng thái đã chuẩn hóa và đã được validate.

---

# 125. Catalog không hợp lệ không được nạp một phần

Hành vi khuyến nghị:

```text
any hard validation error
→ Catalog load fails
```

Không trả về một Catalog chỉ hợp lệ một phần cho Resolver.

Điều này ngăn chặn các thiếu sót bị che giấu.

---

# 126. Vị trí lỗi

Thông tin chẩn đoán (diagnostic) của Catalog nên bao gồm:

```text
file

field/path

entity ID

error code

message
```

Ví dụ:

```text
catalog/capabilities/engineering/testing/tdd.yaml

spec.implementations[2].component

UNKNOWN_COMPONENT
```

---

# 127. Mã chẩn đoán của Catalog

Các mã ban đầu khuyến nghị:

```text
INVALID_MANIFEST

DUPLICATE_PROVIDER

DUPLICATE_PACKAGE

DUPLICATE_CAPABILITY

DUPLICATE_COMPONENT

UNKNOWN_PROVIDER

UNKNOWN_PACKAGE

UNKNOWN_COMPONENT

UNKNOWN_CAPABILITY

INVALID_CAPABILITY_ID

INVALID_PROVIDER_ID

INVALID_PACKAGE_ID

INVALID_COMPONENT_REF

INVALID_CARDINALITY

INVALID_STABILITY

INVALID_PRIORITY

CAPABILITY_CYCLE

ALIAS_COLLISION

UNKNOWN_SOURCE_ADAPTER

MISSING_IMPLEMENTATION
```

---

# 128. Kiểm tra chất lượng Catalog

Ngoài schema validation, CI nên kiểm tra các điều kiện chất lượng như:

```text
unused Provider

Package with zero Components

Capability with zero active implementations

duplicate semantic aliases

deprecated mapping still preferred

missing documentation description
```

Một số nên tiếp tục chỉ là cảnh báo thay vì lỗi.

---

# 129. Nguyên tắc tuyển chọn Catalog

Việc tuyển chọn Catalog nên ưu tiên:

```text
semantic clarity

small representative provider set

explicit overlap modeling

high-confidence mappings

stable IDs

security visibility
```

hơn là:

```text
maximum component count

automatic inclusion

provider popularity

taxonomy completeness
```

---

# 130. Được tuyển chọn không có nghĩa là đầy đủ

Một Provider có thể expose:

```text
300 Components
```

trong khi chỉ:

```text
20
```

được ánh xạ vào các Capability chuẩn.

Điều này là bình thường.

Catalog là một lớp ngữ nghĩa được tuyển chọn, không phải là một bản sao (mirror) đầy đủ của upstream.

---

# 131. Discovery Component so với tính đủ điều kiện (Eligibility)

Một Component có thể tồn tại trong trạng thái discovery được sinh ra nhưng vẫn không đủ điều kiện cho Resolution vì:

```text
no Capability mapping exists
```

Điều này là hợp lệ.

Chỉ riêng discovery không expose nó thông qua việc kết hợp capability thông thường.

---

# 132. Tham chiếu Component trực tiếp

Nói chung, V1 nên hạn chế việc các consumer Project tham chiếu trực tiếp tới Component thô.

Nếu trong tương lai có các cơ chế thoát (escape hatch) nâng cao cho phép điều này, các tham chiếu đó vẫn phải resolve thông qua danh tính Catalog/Component.

Mô hình ưu tiên cho người dùng vẫn là:

```text
Capability
```

chứ không phải:

```text
Component
```

---

# 133. Sự tiến hóa của Catalog

Các thay đổi Catalog được chia thành nhiều loại.

## Không mang tính ngữ nghĩa (Non-Semantic)

Ví dụ:

```text
description typo

documentation link
```

## Bổ sung (Additive)

Ví dụ:

```text
new Provider

new Package

new Capability

new implementation
```

## Ảnh hưởng đến việc lựa chọn (Selection-Affecting)

Ví dụ:

```text
priority change

new higher-priority implementation

implementation deprecation
```

## Phá vỡ tương thích (Breaking)

Ví dụ:

```text
Capability ID removal

Capability semantic change

Component identity change
```

Các thay đổi ảnh hưởng đến việc lựa chọn và phá vỡ tương thích cần được review bổ sung.

---

# 134. Tương thích của Catalog

Một Catalog mới hơn có thể vẫn tương thích với một Project Lock cũ hơn.

Quá trình sync thông thường nên giữ nguyên Project Lock hợp lệ hiện có theo `resolution-spec.md`.

Thay đổi Catalog không tự động kéo theo thay đổi project.

---

# 135. Release Catalog

Một bản release Catalog lý tưởng nên bao gồm:

```text
validated manifests

pinned catalog.lock

generated Component inventory

generated indexes

resolver tests

adapter tests
```

Điều này tạo ra một bản phân phối được tuyển chọn nhất quán.

---

# 136. Catalog Diff

Tooling dành cho maintainer về sau nên hỗ trợ diff ngữ nghĩa.

Ví dụ:

```text
Provider added

Package version changed

Component added

Component removed

Capability mapping changed

Priority changed

Capability deprecated
```

Điều này hữu ích hơn so với chỉ diff YAML thô.

---

# 137. Phân tích tác động của Catalog

Với một Component bị thay đổi:

```text
Component
    ↓
Capabilities
    ↓
Presets
    ↓
Profiles
```

Với một Capability bị thay đổi:

```text
Capability
    ↓
Presets
    ↓
Profiles
```

Các reverse index được sinh ra có thể hỗ trợ việc này.

---

# 138. Kiểm thử Catalog

Các bài kiểm thử Catalog nên bao gồm:

```text
all manifests validate

all references resolve

all IDs unique

all Capability graphs acyclic

all mapped Components exist

all Packages belong to Providers

all generated inventory deterministic

all initial V1 Profiles resolve successfully
```

---

# 139. Các bài kiểm thử Resolution tiêu biểu

Catalog nên cung cấp fixture bao phủ các trường hợp:

```text
TDD with multiple competing Providers

Capability with cardinality many

Policy filtering

Target incompatibility

deprecated implementation

Package containing selected and suppressed Components
```

Điều này chứng minh Catalog không chỉ hợp lệ về cú pháp mà còn hữu ích về mặt ngữ nghĩa.

---

# 140. Phạm vi Catalog V1

Các Provider ban đầu:

```text
superpowers

mattpocock

ecc

anthropic

wshobson

agent-plugins
```

Phạm vi Capability ban đầu nên được chủ động giới hạn ở những gì cần thiết cho các Profile tiêu biểu.

---

# 141. Các domain Capability trong V1

Các domain ban đầu khuyến nghị:

```text
workflow

engineering

frontend

backend

security

knowledge

product

tooling
```

Các domain bổ sung như:

```text
devops
gis
```

có thể được thêm vào khi các ví dụ V1 thực tế yêu cầu.

---

# 142. Mức tối thiểu của Catalog V1

Catalog V1 phải đủ để resolve ít nhất:

```text
frontend-engineer

backend-engineer

product-manager

second-brain
```

với sự chồng lấn provider có ý nghĩa.

---

# 143. Tiêu chí thành công của Catalog V1

Catalog sẵn sàng cho V1 khi:

```text
Provider manifests validate

Package manifests validate

Capability manifests validate

all implementation references resolve

TDD overlap is represented correctly

policy metadata exists for security-sensitive sources

catalog.lock pins external sources

component discovery is deterministic

generated indexes have no drift

representative Profiles resolve successfully
```

---

# 144. Anti-Pattern của Catalog — Kết hợp lấy Provider làm trung tâm

Tránh:

```yaml
profile:
  plugins:
    - superpowers
    - ecc
```

Catalog nên cho phép:

```text
Capability
→ implementations
```

chứ không khuyến khích các gói provider làm abstraction chính.

---

# 145. Anti-Pattern của Catalog — Sao chép Component thủ công

Tránh sao chép thủ công mọi Component upstream vào:

```text
catalog/components/
```

trừ khi có lý do kỹ thuật thuyết phục.

Ưu tiên discovery dựa trên adapter.

---

# 146. Anti-Pattern của Catalog — Metadata render runtime trong Capability

Tránh:

```yaml
claude:
  installPath: ...
```

bên trong một định nghĩa Capability ngữ nghĩa.

Thông tin như vậy thuộc về Target Adapter hoặc metadata của implementation.

---

# 147. Anti-Pattern của Catalog — Trust dựa trên độ phổ biến

Tránh:

```yaml
trust: curated
```

chỉ vì:

```text
repository has many stars
```

Phân loại trust phải đến từ việc tuyển chọn tường minh.

---

# 148. Anti-Pattern của Catalog — Mỗi Skill một Capability

Không tạo một Capability chuẩn mới chỉ vì một Skill upstream tồn tại.

Một Skill có thể:

```text
map to an existing Capability

support another implementation

remain discovered but uncurated
```

---

# 149. Anti-Pattern của Catalog — Tên Provider trong Capability ID

Tránh:

```text
superpowers.tdd

ecc.security-review
```

Sử dụng danh tính ngữ nghĩa:

```text
engineering.testing.tdd

security.review
```

---

# 150. Anti-Pattern của Catalog — Version mới nhất làm trạng thái mong muốn

Tránh metadata Package như:

```yaml
version: latest
```

đối với các Package bên ngoài được tuyển chọn.

Ưu tiên:

```text
version selection
→ catalog.lock
```

---

# 151. Anti-Pattern của Catalog — Metadata được sinh ra làm chuẩn

Không chỉnh sửa thủ công:

```text
generated/catalog/components.json
```

để sửa các vấn đề ngữ nghĩa.

Hãy sửa:

```text
source adapter

canonical Catalog metadata

upstream pin
```

rồi sinh lại.

---

# 152. Anti-Pattern của Catalog — Giá trị mặc định ngữ nghĩa ẩn

Tránh các hành vi ngữ nghĩa quan trọng được suy ra chỉ từ cách đặt tên file hoặc vị trí thư mục.

Ví dụ:

```text
folder name security/
```

không được tự động gán:

```text
security.* capability
```

Canonical ID phải tường minh.

---

# 153. Các bất biến (Invariant) của Catalog

Catalog phải đảm bảo:

```text
1. Every Provider has a stable canonical ID.

2. Every Package belongs to exactly one Provider.

3. Every Component belongs to exactly one Package.

4. Every Capability has one canonical semantic ID.

5. Capability IDs are provider-independent.

6. Capability IDs are target-independent.

7. Implementation mappings reference valid Components.

8. Semantic mappings are curated, not automatically inferred.

9. Component discovery does not imply Capability eligibility.

10. Distribution versions are pinned outside semantic identity.

11. Generated inventories contain no unique semantic curation.

12. Catalog loading is deterministic.

13. Catalog validation happens before Resolution.

14. Upstream latest does not automatically become curated state.

15. Stable Capability semantics should evolve conservatively.
```

---

# 154. Tóm tắt quy trình xử lý Catalog

```text
Provider Manifests
      │
      ├───────────────┐
      ▼               │
Package Manifests     │
      │               │
      ▼               │
catalog.lock          │
      │               │
      ▼               │
Source Adapters       │
      │               │
      ▼               │
Discovered Components │
      │               │
      └──────┐        │
             ▼        ▼
        Capability Manifests
             │
             ▼
          Validation
             │
             ▼
       Normalized Catalog
             │
       ┌─────┴─────┐
       ▼           ▼
   Resolver     Generators
```

---

# 155. Mô hình tư duy tối giản về Catalog

```text
Provider
   ↓
Package
   ↓
Discovered Component
   ↓
Curated Capability Mapping
   ↓
Resolver Candidate
```

Sự tách biệt then chốt là:

```text
what exists upstream
≠
what it means semantically
≠
what a Project selects
```

---

# 156. Catalog trong một câu

> **Catalog của `agent-plugins` là một ánh xạ mang tính khai báo, được tuyển chọn và được quản lý phiên bản, từ các Provider và Package tới các Component đã chuẩn hóa và các Capability độc lập với provider, trong đó các version bên ngoài được ghim riêng và mọi ánh xạ ngữ nghĩa đều được validate trước khi trở thành ứng viên của Resolver.**
