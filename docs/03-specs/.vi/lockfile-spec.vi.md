# Đặc tả Lockfile

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.

## Tổng quan

Tài liệu này định nghĩa mô hình lockfile được sử dụng bởi `agent-plugins`.

Hệ thống sử dụng hai lockfile riêng biệt:

```text id="8eyb0n"
catalog.lock
```

và:

```text id="7d0n7w"
agent-plugins.lock
```

Chúng phục vụ các mục đích khác nhau.

```text id="j44ilc"
catalog.lock
→ locks the curated upstream distribution baseline

agent-plugins.lock
→ locks the concrete resolution of one consumer project
```

Mô hình dual-lock tồn tại để tách biệt:

```text id="ept1pl"
ecosystem curation
```

khỏi:

```text id="9d37fs"
project resolution
```

Sự tách biệt này là nền tảng cho khả năng tái lập, việc cập nhật có kiểm soát và khả năng giải thích.

---

# 1. Nguyên tắc cốt lõi

Luồng chuẩn là:

```text id="ujqvp5"
External Publishers
        ↓
Maintainer Curation
        ↓
catalog.lock
        ↓
Catalog
        ↓
Project Manifest
        ↓
Resolver
        ↓
agent-plugins.lock
        ↓
Target Adapter
        ↓
Managed Runtime State
```

Quy tắc then chốt là:

> **Distribution lock đóng băng trạng thái upstream nào được phê duyệt; project lock đóng băng những gì một project cụ thể thực sự đã resolve.**

---

# 2. Các loại lockfile

V1 định nghĩa hai loại lockfile.

## Distribution Lock

```text id="gw4j6j"
catalog.lock
```

Thuộc sở hữu của repository distribution `agent-plugins`.

## Project Lock

```text id="cllx4u"
agent-plugins.lock
```

Thuộc sở hữu của một consumer project.

Chúng không được gộp thành một file duy nhất.

---

# 3. Tại sao cần hai lock

Một lockfile duy nhất sẽ trộn lẫn:

```text id="zud379"
upstream curation decisions

consumer intent

project-specific implementation selection

target-specific resolution
```

Điều này khiến việc suy luận về các bản cập nhật trở nên khó khăn.

Mô hình dual-lock cung cấp:

```text id="n0pjmo"
Distribution Curator

controls:
catalog.lock

Project Maintainer

controls:
agent-plugins.yaml
agent-plugins.lock
```

---

# 4. `catalog.lock`

`catalog.lock` ghi lại chính xác trạng thái upstream được distribution `agent-plugins` chủ đích curate và kiểm thử.

Nó trả lời câu hỏi:

> **Phiên bản Catalog này công nhận chính xác những artifact upstream nào là input được phê duyệt?**

---

# 5. `agent-plugins.lock`

`agent-plugins.lock` ghi lại chính xác trạng thái đã resolve cho một consumer Project.

Nó trả lời câu hỏi:

> **Chính xác những implementation, Component, Package và phiên bản nào đáp ứng các capability mong muốn của Project này?**

---

# 6. Lockfile thuộc quyền sở hữu của Resolver

Lockfile là các artifact được sinh ra nhưng mang ý nghĩa ngữ nghĩa lâu dài.

Thông thường chúng không nên được chỉnh sửa thủ công.

Workflow được ưu tiên:

```text id="9uvt77"
intent / curated state
        ↓
Resolver / update workflow
        ↓
lockfile
```

Tránh:

```text id="zy92u8"
manual lockfile editing
```

---

# 7. Lockfile so với các file được sinh thông thường

Về mặt kỹ thuật, lockfile là dữ liệu dẫn xuất, nhưng khác với các index được sinh thông thường.

Index được sinh:

```text id="c3qiwo"
delete
→ regenerate from authoritative metadata
```

Project Lock:

```text id="rngup1"
captures a historical concrete selection
```

Do đó lockfile trở thành nguồn authoritative cho:

```text id="gpdw7p"
reproduction of the locked state
```

trong khi vẫn không phải nguồn authoritative cho:

```text id="h0u8lq"
user intent
```

---

# 8. Quan hệ source-of-truth

```text id="6avhhh"
agent-plugins.yaml
→ desired semantic state

catalog.lock
→ approved upstream baseline

agent-plugins.lock
→ exact project resolution
```

Các file này trả lời những câu hỏi khác nhau.

---

# 9. Vị trí file

Repository distribution:

```text id="v864xr"
agent-plugins/
├── catalog/
├── ...
└── catalog.lock
```

Repository của consumer:

```text id="om7pm4"
my-project/
├── agent-plugins.yaml
└── agent-plugins.lock
```

---

# 10. Envelope chung của lockfile

Cả hai lockfile nên sử dụng một envelope có version.

Về mặt khái niệm:

```yaml id="3lyxsg"
apiVersion: agent-plugins.dev/v1alpha1
kind: ProjectLock

metadata:
  ...

spec:
  ...
```

Các kind của lockfile:

```text id="sk1m6j"
CatalogLock
ProjectLock
```

---

# 11. Versioning của lockfile

Version schema của lockfile phải độc lập với:

```text id="s8ny7n"
Publisher version

Package version

Catalog release version
```

Giá trị khởi đầu được khuyến nghị:

```text id="3c0wxv"
agent-plugins.dev/v1alpha1
```

---

# 12. Tính ổn định của định dạng lockfile

Trước V1 ổn định:

```text id="0135on"
lockfile structure may evolve
```

Sau V1 ổn định:

```text id="lg2d62"
breaking changes require migration strategy
```

Lockfile không nên phụ thuộc vào hành vi parser không được tài liệu hóa.

---

# 13. Serialization tất định

Lockfile phải được serialize một cách tất định.

Trạng thái Resolution tương đương nên tạo ra nội dung lock tương đương về mặt ngữ nghĩa.

Thứ tự ổn định phải được định nghĩa cho:

```text id="mn6i1i"
Capabilities

Packages

Components

Targets

dependencies

diagnostics retained in lock
```

---

# 14. Thứ tự chuẩn

Khuyến nghị:

Capabilities:

```text id="0y49n8"
Capability ID ascending
```

Publishers:

```text id="5i9u0l"
Publisher ID ascending
```

Packages:

```text id="re4y8u"
Publisher ID
then Package ID
```

Components:

```text id="0kwj93"
canonical Component reference ascending
```

---

# 15. Phạm vi của Distribution Lock

`catalog.lock` có thể chứa resolution chính xác cho:

```text id="hs4l6a"
Publishers

Packages

upstream versions

commit refs

integrity hashes
```

Nó không nên chứa:

```text id="sa6ox7"
Project Roles

Project Presets

Project Policy

consumer Capability selections
```

---

# 16. Ví dụ Distribution Lock

Về mặt khái niệm:

```yaml id="ugvdxk"
apiVersion: agent-plugins.dev/v1alpha1
kind: CatalogLock

metadata:
  generatedBy: agent-plugins
  lockVersion: 1

spec:
  packages:
    - publisher: superpowers
      package: superpowers

      version: 6.4.0

      source:
        type: git
        repository: obra/superpowers
        ref: abc123def456

      integrity:
        algorithm: sha256
        value: ...

    - publisher: ecc
      package: ecc

      version: 2.1.0

      source:
        type: git
        repository: ...
        ref: fed987...

      integrity:
        algorithm: sha256
        value: ...
```

Schema chính xác có thể thay đổi.

---

# 17. Định danh của Distribution Lock

Mỗi Package được lock phải có thể được định danh bằng:

```text id="i27bge"
Publisher ID
+
Package ID
```

Tham chiếu chuẩn:

```text id="lyswk1"
publisher/package
```

Ví dụ:

```text id="87m82a"
superpowers/superpowers
```

---

# 18. Version trong Distribution Lock

Khi upstream cung cấp một version dễ đọc cho con người, hãy ghi lại nó.

Ví dụ:

```yaml id="nwsipn"
version: 6.4.0
```

Không nên chỉ dựa vào version để đảm bảo khả năng tái lập nếu version đó có thể bị dịch chuyển hoặc bị gắn tag lại.

---

# 19. Tham chiếu bất biến

Các Package bên ngoài được lock nên ưu tiên ghi lại một tham chiếu bất biến.

Ví dụ:

```text id="7rd0uy"
Git commit SHA

content-addressed hash

immutable release artifact ID
```

Ví dụ:

```yaml id="v0wk84"
source:
  ref: 33ad20ef8...
```

---

# 20. Metadata toàn vẹn

Khi có sẵn:

```yaml id="wd48f9"
integrity:
  algorithm: sha256
  value: ...
```

Integrity giúp phát hiện:

```text id="mz6jrh"
tampered artifact

unexpected source change

corrupted cache
```

---

# 21. Immutable ref so với integrity

Hai khái niệm này có liên quan nhưng khác nhau.

```text id="ooaaes"
immutable ref
→ identifies the intended source revision

integrity hash
→ verifies retrieved content
```

Hãy dùng cả hai khi khả thi.

---

# 22. Lock các Package native

Các Package native first-party không nhất thiết cần các entry version upstream độc lập.

Nguồn của chúng là chính distribution `agent-plugins` hiện tại.

Chúng có thể được biểu diễn thông qua:

```text id="m1jn82"
distribution version

repository commit

native package identity
```

thay vì các ref upstream bên ngoài.

---

# 23. Sinh Distribution Lock

`catalog.lock` chỉ nên thay đổi thông qua một workflow cập nhật tường minh.

Về mặt khái niệm:

```text id="l0qta6"
Current catalog.lock
       ↓
Check upstream
       ↓
Review changes
       ↓
Select approved ref
       ↓
Validate
       ↓
Test
       ↓
Write catalog.lock
```

---

# 24. Không tự động resolve bản mới nhất

Việc load Catalog thông thường không được hoạt động như:

```text id="46qthq"
version: latest
```

Thay vào đó:

```text id="gvyk5a"
Catalog
+
catalog.lock
```

định nghĩa trạng thái upstream được phê duyệt.

---

# 25. Cập nhật Distribution Lock

Ví dụ:

```text id="bj353y"
Superpowers

6.3.0
abc123

↓

6.4.0
def456
```

Thay đổi này nên được thể hiện tường minh trong `catalog.lock`.

---

# 26. Review Distribution Lock

Một bản cập nhật nên có thể được review về:

```text id="h2k0o3"
version change

Component additions

Component removals

security-sensitive additions

Capability impact

Target compatibility changes
```

Chỉ riêng chênh lệch version thô là không đủ.

---

# 27. Distribution Lock không chọn Capability

`catalog.lock` có thể lock Package X.

Điều đó không có nghĩa là:

```text id="59de0n"
all Package X Components are selected
```

Nó chỉ có nghĩa là:

```text id="lr1cv0"
this is the approved Package state available to Resolution
```

---

# 28. Phạm vi của Project Lock

`agent-plugins.lock` ghi lại:

```text id="w24bs5"
Project resolution metadata

Target

resolved Capabilities

selected implementations

selected Components

dependency Components

resolved Packages

concrete versions

immutable refs

integrity

provenance
```

---

# 29. Ví dụ Project Lock

Về mặt khái niệm:

```yaml id="qrbtaw"
apiVersion: agent-plugins.dev/v1alpha1
kind: ProjectLock

metadata:
  lockVersion: 1
  resolverVersion: 0.1.0

spec:
  target: claude-code

  resolution:
    inputDigest: sha256:...
    catalogDigest: sha256:...

  capabilities:
    - id: engineering.testing.tdd

      implementation:
        component: superpowers/superpowers#skill:test-driven-development

      requiredBy:
        - role/frontend-engineer
        - preset/engineering/core

  packages:
    - publisher: superpowers
      package: superpowers
      version: 6.4.0
      ref: abc123...

      components:
        selected:
          - skill:test-driven-development
          - skill:systematic-debugging

  ...
```

Schema cuối cùng nên tránh sự dài dòng không cần thiết trong khi vẫn bảo toàn khả năng tái lập.

---

# 30. Metadata của Project Lock

Metadata được khuyến nghị:

```text id="1vb1j0"
lock schema version

resolver version

generation tool version

resolution mode

target identity
```

Tránh đưa timestamp vào so sánh ngữ nghĩa trừ khi chúng chỉ mang tính thông tin.

---

# 31. Chính sách timestamp

Một field như:

```yaml id="hv8k7m"
generatedAt: ...
```

có thể hữu ích cho con người.

Tuy nhiên, nó không được tham gia vào việc so sánh bằng nhau về ngữ nghĩa của lock.

Việc lặp lại Resolution tương đương không nên tạo ra các diff gây nhiễu chỉ vì thời gian thay đổi.

V1 có thể bỏ hoàn toàn timestamp.

---

# 32. Version của Resolver

Ghi lại:

```text id="feps4n"
resolverVersion
```

vì các thay đổi trong thuật toán Resolver có thể ảnh hưởng đến việc lựa chọn ngay cả khi manifest và trạng thái Catalog giống hệt nhau.

Ví dụ:

```yaml id="pn4lbp"
resolverVersion: 0.1.0
```

---

# 33. Version của Resolver không phải version của CLI

Ban đầu, bản phát hành CLI và ngữ nghĩa Resolver có thể dùng chung một version package.

Về mặt khái niệm, chúng vẫn tách biệt.

Các phiên bản tương lai có thể tách riêng:

```text id="4ald9f"
tool version
resolver semantics version
lock schema version
```

---

# 34. Digest của Project Manifest

Lockfile nên ghi lại digest của Project intent đã được chuẩn hóa và có liên quan đến Resolution.

Về mặt khái niệm:

```yaml id="i0f58v"
resolution:
  manifestDigest: sha256:...
```

Digest chỉ nên bao gồm các field mang ngữ nghĩa.

---

# 35. Input của manifest digest

Input được khuyến nghị:

```text id="55tmc4"
role

presets

effective policy reference

targets

Capability overrides

Implementation overrides
```

Loại trừ:

```text id="tnv49m"
comments

whitespace

metadata.description

YAML formatting
```

---

# 36. Digest của intent đã mở rộng

Hệ thống cũng có thể ghi lại digest của semantic intent đã được mở rộng đầy đủ.

Ví dụ:

```text id="l7ew7x"
expanded Role

expanded Presets

effective Capability requirements
```

Điều này có thể cải thiện việc phân tích drift.

Nó là tùy chọn đối với V1.

---

# 37. Digest của Catalog

Project Lock nên ghi lại định danh Catalog/distribution được sử dụng trong quá trình Resolution.

Về mặt khái niệm:

```yaml id="eqru9n"
resolution:
  catalogDigest: sha256:...
```

Điều này giúp xác định liệu:

```text id="6m3uo9"
same Project intent
```

đã được resolve dựa trên:

```text id="1w3hvj"
same curated distribution
```

---

# 38. Digest của Policy

Nếu Policy có thể thay đổi trong khi vẫn giữ nguyên ID, lock nên ghi lại:

```text id="7gmbcl"
policy content digest
```

hoặc đưa nội dung Policy vào digest input rộng hơn của Resolution.

Khuyến nghị:

```text id="xtz87z"
include normalized Policy in resolutionInputDigest
```

---

# 39. Digest của Role và Preset

Tương tự, Role và Preset được tham chiếu bằng ID nhưng nội dung của chúng có thể thay đổi.

Project lock nên phát hiện các thay đổi ngữ nghĩa ngay cả khi ID vẫn giữ ổn định.

Ưu tiên:

```text id="kyrspj"
resolutionInputDigest
```

bao gồm composition đã được mở rộng và chuẩn hóa.

---

# 40. Resolution Input Digest

Định nghĩa khái niệm được khuyến nghị:

```text id="ztkcq4"
resolutionInputDigest =
hash(
  normalized project intent
  +
  expanded role
  +
  expanded presets
  +
  policy
  +
  target descriptor
  +
  relevant catalog semantic state
  +
  distribution identity
)
```

Serialization chuẩn chính xác phải là tất định.

---

# 41. Tại sao digest quan trọng

Nếu không có content digest:

```text id="fzqnkk"
Role ID unchanged
```

có thể che giấu:

```text id="nmx9xr"
Role contents changed
```

Lockfile có thể trông như vẫn cập nhật trong khi ngữ nghĩa thực tế đã thay đổi.

---

# 42. Thuật toán digest

Khuyến nghị cho V1:

```text id="137vbv"
SHA-256
```

Biểu diễn:

```text id="q9id3v"
sha256:<hex>
```

Ví dụ:

```text id="wgflg9"
sha256:a1b2c3...
```

---

# 43. Serialization chuẩn cho digest

Không bao giờ hash các byte YAML thô.

Các file thô có thể khác nhau do:

```text id="bta9tw"
comments

whitespace

key ordering
```

mà không có thay đổi ngữ nghĩa nào.

Thay vào đó:

```text id="smjp1w"
parse
↓
normalize
↓
canonical serialize
↓
hash
```

---

# 44. Các entry Capability trong lockfile

Mỗi Capability đã resolve nên xác định:

```text id="za2l2l"
Capability ID

cardinality

requirement state

selected implementation(s)
```

Các field bổ sung có thể có:

```text id="2i46yn"
requiredBy

dependencies

selection reason
```

---

# 45. Nguồn gốc yêu cầu Capability

Khi khả thi, hãy lưu đủ thông tin để giải thích:

```text id="o4evzg"
why the Capability exists
```

Ví dụ:

```yaml id="q6u6vs"
requiredBy:
  - role/frontend-engineer
  - preset/engineering/core
```

Tránh lưu các cấu trúc graph trùng lặp khổng lồ nếu chúng có thể được tái dựng một cách đáng tin cậy.

---

# 46. Implementation được chọn

Với:

```text id="1lxva9"
cardinality: one
```

một entry Capability có thể chứa một implementation được chọn.

Với:

```text id="jzuhs7"
cardinality: many
```

nó có thể chứa nhiều implementation.

Ví dụ:

```yaml id="n31g0v"
selected:
  - component: publisher/package#skill:x
```

Việc sử dụng array một cách nhất quán có thể giúp đơn giản hóa thiết kế schema.

---

# 47. Nguồn gốc của implementation được chọn

Implementation được chọn cần có thể truy vết về:

```text id="2cgfwe"
Component

Package

Publisher
```

Lock có thể tránh lặp lại toàn bộ metadata của Package bằng cách tham chiếu tới các entry Package chuẩn ở nơi khác trong lock.

---

# 48. Cấu trúc lock được chuẩn hóa

Ưu tiên tham chiếu đã chuẩn hóa thay vì lặp lại quá mức.

Ví dụ:

```text id="vo0bid"
Capabilities
→ reference Components

Components
→ reference Packages

Packages
→ reference Publishers
```

thay vì lặp lại thông tin repository/version dưới mỗi Capability.

---

# 49. Ví dụ lock cho Capability

Về mặt khái niệm:

```yaml id="8k6ef0"
capabilities:
  engineering.testing.tdd:
    cardinality: one

    selected:
      - superpowers/superpowers#skill:test-driven-development

    requiredBy:
      - role/frontend-engineer
      - preset/engineering/core
```

Dạng map hay dạng array là một lựa chọn về schema.

---

# 50. Các entry lock của Component

Trạng thái Component cần phân biệt:

```text id="dl6j4l"
selected implementation Component

dependency Component
```

Ví dụ:

```yaml id="34l98q"
components:
  - id: superpowers/superpowers#skill:test-driven-development
    role: selected

  - id: package-x/package-x#rule:shared-rules
    role: dependency
```

---

# 51. Vai trò của Component

Các giá trị khái niệm được khuyến nghị:

```text id="8966j1"
selected

dependency
```

Một Component có thể đảm nhận cả hai vai trò.

Trong trường hợp đó:

```text id="ylojg7"
roles:
  - selected
  - dependency
```

có thể chính xác hơn.

---

# 52. Ánh xạ Component sang Capability

Với các Component được chọn, lock cần có khả năng xác định những Capability nào mà chúng đáp ứng.

Ví dụ:

```yaml id="kniox3"
capabilities:
  - engineering.architecture
  - engineering.codebase-design
```

Điều này hữu ích cho việc giải thích và phân tích tác động.

---

# 53. Các candidate bị suppress

Project Lock không nhất thiết phải lưu mọi candidate bị suppress.

Đánh đổi:

Lưu tất cả candidate giúp cải thiện:

```text id="p3z7vv"
offline explainability
historical decision analysis
```

nhưng làm tăng:

```text id="hrmwlt"
lock size

churn

coupling to Catalog candidate universe
```

Khuyến nghị cho V1:

```text id="rfsmly"
persist selected state and compact selection reason

recompute non-selected candidates from current compatible Catalog when needed
```

với lưu ý rằng Catalog hiện tại có thể khác với trạng thái trong quá khứ.

---

# 54. Khả năng giải thích lịch sử

Nếu việc giải thích chính xác lịch sử là yêu cầu cốt lõi, lock có thể giữ lại một snapshot quyết định dạng gọn.

Ví dụ:

```yaml id="h4mhyw"
decision:
  selectedBecause: catalog-priority
  effectivePriority: 100
```

Tùy chọn:

```text id="s5izf3"
suppressed component IDs
```

Không nên yêu cầu toàn bộ decision graph trong V1.

---

# 55. Các candidate bị từ chối

Nhìn chung, các candidate bị từ chối không nên được lưu trong Project Lock.

Chúng là diagnostic của Resolution chứ không phải trạng thái được chọn.

Có thể có ngoại lệ cho:

```text id="nd7blx"
audit mode

enterprise traceability
```

sau này.

---

# 56. Các entry lock của Package

Mỗi Package đã được resolve cần ghi lại:

```text id="66lk2n"
Publisher

Package

version

immutable ref

source

integrity

required Components
```

---

# 57. Ví dụ lock cho Package

```yaml id="w87exr"
packages:
  - id: superpowers/superpowers

    version: 6.4.0

    source:
      type: git
      repository: obra/superpowers
      ref: abc123def456

    integrity:
      algorithm: sha256
      value: ...

    components:
      - skill:test-driven-development
      - skill:systematic-debugging
```

---

# 58. Nguồn gốc source của Package

Project Lock cần lưu đủ thông tin nguồn gốc để tái tạo Package mà không phụ thuộc vào trạng thái Catalog có thể thay đổi.

Khuyến nghị:

```text id="5rqdqo"
Publisher ID

Package ID

source type

repository/source locator

immutable ref

integrity
```

---

# 59. Vì sao cần lưu thông tin source

Nếu chỉ lưu:

```text id="0xy4fn"
publisher/package
```

thì các thay đổi Catalog trong tương lai có thể khiến việc tái tạo lịch sử trở nên mơ hồ.

Lưu nguồn gốc source giúp lock bền vững hơn về lâu dài.

---

# 60. Trùng lặp Catalog trong Project Lock

Một số trùng lặp giữa Catalog và Project Lock là có chủ đích.

Catalog sở hữu metadata ngữ nghĩa hiện tại.

Project Lock sở hữu snapshot lịch sử cụ thể cần thiết cho việc tái tạo.

Vì vậy việc lưu:

```text id="h5yecb"
source ref

integrity

version
```

ở cả `catalog.lock` và `agent-plugins.lock` là chấp nhận được.

---

# 61. Project Lock so với version của Distribution Lock

Thông thường:

```text id="0wckz4"
Project Package ref
```

sẽ tương ứng với một trạng thái Package đã được phê duyệt trong:

```text id="xhyvx1"
catalog.lock
```

Project Lock cần lưu ref cụ thể đã chọn thay vì chỉ tham chiếu gián tiếp tới distribution lock hiện tại.

---

# 62. Vì sao cần sao chép Package ref cụ thể

Xét:

```text id="75orq1"
Project resolved against Catalog v1

later Catalog updates Package X
```

Nếu Project Lock chỉ ghi:

```text id="lnmgic"
use catalog.lock Package X
```

thì việc tái tạo lịch sử sẽ thay đổi.

Vì vậy Project Lock cần lưu:

```text id="mr63ks"
exact Package ref used
```

---

# 63. Target của lockfile

Project Lock phải ghi lại định danh Target.

V1:

```yaml id="bsaxlc"
target: claude-code
```

Cấu trúc multi-target trong tương lai có thể trở thành:

```yaml id="gs71pf"
targets:
  claude-code:
    ...
  codex:
    ...
```

Không thiết kế quá mức phần này trước khi có implementation cho target thứ hai.

---

# 64. Dữ liệu lock riêng cho Target

Giữ metadata riêng cho target ở mức tối thiểu.

Project Lock chủ yếu nên biểu diễn Resolution đã được chuẩn hóa.

Các path và file được sinh ra riêng cho runtime thuộc về Target Adapter.

Metadata lock riêng cho target chỉ hợp lý khi cần thiết cho khả năng tái tạo.

---

# 65. Metadata của trạng thái được quản lý

Target Adapter có thể cần các định danh để xác định trạng thái runtime nào thuộc quyền sở hữu của nó.

Vị trí có thể:

```text id="8trdsw"
target-specific state file
```

hoặc metadata gọn trong Project Lock.

Tránh biến Lockfile ngữ nghĩa thành bản sao đầy đủ của trạng thái filesystem runtime.

---

# 66. Trạng thái thực tế không phải trạng thái lock

Project Lock:

```text id="gxss4x"
what should be concretely materialized
```

Actual State:

```text id="q8dukw"
what currently exists
```

Chúng có thể khác nhau.

Sự khác biệt đó là:

```text id="9y6q44"
runtime drift
```

---

# 67. Lockfile không đảm bảo runtime đã được áp dụng

Việc ghi Lockfile tự nó không chứng minh rằng quá trình materialization cho Target đã thành công.

Trình tự sync được ưu tiên:

```text id="0mkj1n"
resolve
↓
build materialization plan
↓
apply
↓
verify
↓
commit final lock state
```

hoặc sử dụng các marker trạng thái mang tính transaction.

---

# 68. Materialization thất bại

Nếu materialization thất bại:

```text id="gj1u8m"
do not claim successful final lock state
```

Các chiến lược khả thi:

```text id="6e481f"
keep previous lock

write temporary pending lock

rollback runtime changes
```

Hành vi chính xác thuộc về các spec adapter/sync.

---

# 69. Ghi Lockfile nguyên tử

Lockfile nên được ghi một cách nguyên tử (atomic) khi khả thi.

Ví dụ:

```text id="wpjk7j"
write temp file
↓
fsync if needed
↓
rename
```

Điều này tránh tình trạng lock bị ghi dở sau khi bị gián đoạn.

---

# 70. Validation Lockfile

Một Lockfile phải vượt qua:

```text id="n9vp4c"
schema validation

reference consistency

digest validation where applicable

Package/Component consistency

target consistency
```

trước khi được sử dụng.

---

# 71. Lockfile không hợp lệ

Nếu việc parse hoặc validation thất bại:

```text id="1cfl8u"
LOCK_INVALID
```

CLI không được âm thầm coi trạng thái lock bị lỗi định dạng là hợp lệ.

Tùy theo command:

```text id="zqu4s0"
fresh re-resolution
```

có thể thực hiện được sau khi được xử lý một cách tường minh và hiển thị cho người dùng.

---

# 72. Thiếu Project Lock

Với:

```text id="o8kblm"
ap sync
```

khi không có `agent-plugins.lock`:

```text id="7s62t5"
resolution mode = fresh
```

Resolver tạo ra một lock mới.

---

# 73. Thiếu Distribution Lock

Với các Package bên ngoài cần trạng thái curated được pin, việc thiếu `catalog.lock` nhìn chung nên khiến việc load distribution Catalog thất bại.

Diagnostic:

```text id="nlxmjv"
CATALOG_LOCK_MISSING
```

Resolution bên ngoài không nên âm thầm sử dụng upstream mới nhất.

---

# 74. Distribution Lock không đầy đủ

Nếu một Package bên ngoài được curate có trong Catalog nhưng thiếu entry lock bắt buộc:

```text id="snhjwa"
CATALOG_PACKAGE_NOT_LOCKED
```

trừ khi chiến lược version của Package đó tường minh không yêu cầu distribution locking.

---

# 75. Lockfile bị lỗi thời

Một Project Lock bị lỗi thời (stale) khi desired state liên quan tới Resolution đã thay đổi.

Ví dụ:

```text id="fr0eqf"
Project Manifest semantic change

Role content change

Preset content change

Policy change

Target change

Catalog semantic change required by project
```

---

# 76. `LOCK_STALE`

Khi lock hiện tại không thể biểu diễn desired state ngữ nghĩa hiện tại:

```text id="7flshn"
LOCK_STALE
```

nên được báo cáo.

---

# 77. Stale so với Update Available

Hai khái niệm này khác nhau.

```text id="qphblm"
LOCK_STALE
```

có nghĩa là:

```text id="nc8eyc"
current lock no longer matches required input state
```

`UPDATE_AVAILABLE` có nghĩa là:

```text id="d54kyn"
newer curated state exists
but current lock remains valid
```

Sync thông thường không nên nhầm lẫn giữa chúng.

---

# 78. Ví dụ — Manifest thay đổi

Ban đầu:

```text id="beu5dx"
stacks/nextjs
```

Mới:

```text id="vkrt6d"
stacks/nextjs
engineering/security
```

Lock hiện có thiếu các capability về security.

Kết quả:

```text id="cnyog8"
LOCK_STALE
```

Cần re-resolution.

---

# 79. Ví dụ — Có version Catalog mới

Project giữ nguyên.

Package đang bị lock:

```text id="lc6tzm"
Superpowers 6.3
```

Distribution hiện curate:

```text id="im53wh"
Superpowers 6.4
```

Nếu project lock hiện tại vẫn hợp lệ:

```text id="70cz6x"
not stale
```

Có thể:

```text id="df5frm"
update available
```

---

# 80. Ví dụ — Policy thay đổi

Project:

```text id="tstzzw"
policy: strict
```

Định nghĩa Policy thay đổi để deny một implementation hiện đang bị lock.

Lock trở nên không hợp lệ theo policy mong muốn hiện tại.

Kết quả:

```text id="xzziph"
LOCK_STALE
or LOCK_POLICY_INVALIDATED
```

Tên diagnostic chính xác có thể được tinh chỉnh.

---

# 81. Revalidation lock

Trước khi giữ lại một lock hiện có trong sync thông thường, cần kiểm tra:

```text id="ig25o4"
Capability still required

implementation still mapped

Package still available

Policy still allows it

Target still supports it

dependencies still valid

version/ref still retrievable where required
```

---

# 82. Ưu tiên lock hiện có hợp lệ

Nếu mọi kiểm tra liên quan đều đạt:

```text id="w8cfv9"
existing locked implementation
```

sẽ nhận được ưu tiên mạnh trong sync thông thường.

Điều này giúp duy trì sự ổn định.

---

# 83. Việc giữ lock không override các ràng buộc cứng

Lock hiện có phải bị loại bỏ đối với lựa chọn bị ảnh hưởng nếu:

```text id="66ncl9"
policy denies implementation

Target no longer supports it

Component removed

dependency invalid

Project override changed

Package unavailable
```

---

# 84. Tái sử dụng một phần lock

Khi ý định của Project thay đổi, các lựa chọn đã lock không bị ảnh hưởng có thể được tái sử dụng.

Ví dụ:

```text id="3qh8gn"
existing:
planning
TDD
debugging

new requirement:
security.review
```

Resolver có thể giữ lại:

```text id="876huf"
planning
TDD
debugging
```

trong khi resolve:

```text id="9w2zkr"
security.review
```

---

# 85. Vì sao tái sử dụng một phần

Tính toán lại mọi thứ có thể gây ra sự xáo trộn implementation không cần thiết.

Hành vi mong muốn:

```text id="exdg3u"
change only what must change
```

trong khi vẫn duy trì tính đúng đắn tất định.

---

# 86. Đơn vị tái sử dụng lock

Đơn vị tái sử dụng tự nhiên chủ yếu là:

```text id="o1h5b1"
Capability implementation selection
```

cộng với:

```text id="5f1qfj"
Package version
```

tùy thuộc vào dependency.

Không nên coi toàn bộ lock theo kiểu được ăn cả, ngã về không.

---

# 87. Dependency closure của Lockfile

Khi tái sử dụng một lựa chọn đã lock, toàn bộ dependency closure bắt buộc của nó cũng phải còn hợp lệ.

Không tái sử dụng:

```text id="yaoovz"
Component A
```

nếu dependency đã lock của nó:

```text id="1c11w3"
Component B
```

không còn sử dụng được.

---

# 88. Chế độ sync

Lệnh thông thường:

```text id="isq26t"
ap sync
```

sử dụng:

```text id="r7h3nu"
existing lock preservation
```

khi còn hợp lệ.

Nó không nên nâng cấp version chỉ vì đã có các version curated mới hơn.

---

# 89. Chế độ update

Lệnh tường minh:

```text id="8c6e8e"
ap update
```

có thể chủ động xem xét lại:

```text id="8a263x"
Package versions

implementation selections

newly curated alternatives
```

tùy thuộc vào phạm vi update.

---

# 90. Kiểm tra update

```text id="xu012e"
ap update --check
```

không được thay đổi:

```text id="bfydwk"
catalog.lock

agent-plugins.lock

runtime state
```

Nó chỉ báo cáo các thay đổi có thể xảy ra.

---

# 91. Distribution update so với Project update

Distribution update:

```text id="5xjmnt"
upstream
→ catalog.lock
```

Project update:

```text id="wpo8fo"
new approved distribution state
→ agent-plugins.lock
```

Đây là các thao tác độc lập với nhau.

---

# 92. Mặc định Project không thể chọn upstream mới nhất chưa được phê duyệt

Resolution thông thường phía consumer không nên bỏ qua `catalog.lock` và fetch trực tiếp:

```text id="l297si"
latest Publisher version
```

Điều này sẽ bỏ qua quá trình curation.

---

# 93. Override version nâng cao

Mặc định, V1 không nên cho phép override tùy ý version Package ở cấp Project.

Tránh:

```yaml id="uwx0xx"
packages:
  superpowers:
    version: latest
```

Điều này nằm ngoài hành vi consumer thông thường hướng theo capability.

---

# 94. Pinning nâng cao trong tương lai

Một chế độ chuyên gia trong tương lai có thể cho phép:

```text id="azgscu"
custom Package source/ref
```

nhưng nó phải được biểu diễn rõ ràng như một lối thoát (escape hatch) tường minh về trust/khả năng tái tạo.

Không bắt buộc cho V1.

---

# 95. Mục tiêu tái tạo của Lockfile

Với:

```text id="e8dio2"
Project Lock

compatible tool version

access to locked sources
```

hệ thống cần có khả năng tái dựng một môi trường đã resolve tương đương.

---

# 96. Các mức độ tái tạo

Các mức khái niệm hữu ích:

```text id="ynob7o"
semantic reproducibility

source reproducibility

byte reproducibility
```

Semantic:

```text id="ipzxbd"
same selected capabilities/components
```

Source:

```text id="enx68j"
same upstream source revisions
```

Byte:

```text id="8qp0bl"
identical fetched artifact bytes
```

V1 nên hướng tới ít nhất là tái tạo semantic + source.

Metadata integrity giúp tăng độ tin cậy ở mức byte.

---

# 97. Giới hạn của khả năng tái tạo

Việc tái tạo vẫn có thể thất bại nếu:

```text id="cf5xs0"
upstream artifact disappears

network unavailable

runtime version incompatible

external Package installation behavior changed

required external service unavailable
```

Lockfile ghi lại ý định và định danh source; nó không thể đảm bảo tính sẵn có vĩnh viễn của các nguồn bên ngoài.

---

# 98. Kiểm tra integrity của Lockfile

Khi truy xuất nội dung Package đã lock:

```text id="mu7voy"
fetch
↓
verify immutable ref
↓
verify integrity if available
↓
accept
```

Nếu không khớp thì nên thất bại.

Diagnostic được khuyến nghị:

```text id="pj41dh"
INTEGRITY_MISMATCH
```

---

# 99. Integrity không phải tùy chọn khi đã được khai báo

Nếu Lockfile chứa integrity hash, quá trình truy xuất phải xác minh nó.

Không âm thầm bỏ qua việc xác minh thất bại.

---

# 100. Source ref không khớp

Nếu revision source được truy xuất khác với ref đã lock:

```text id="994k9p"
SOURCE_REF_MISMATCH
```

ngay cả khi nhãn version upstream có vẻ giống nhau.

---

# 101. Tag có thể thay đổi

Một tag như:

```text id="0mxfqb"
v6.4.0
```

về lý thuyết có thể bị di chuyển ở upstream.

Vì vậy Lockfile nên ưu tiên:

```text id="mtvf10"
tag/version
+
immutable commit
```

khi có thể.

---

# 102. Cache cục bộ

Các Package đã tải về có thể được cache.

Cache không làm thay đổi ngữ nghĩa của lock.

```text id="xzcvta"
Lockfile
→ what content is expected

Cache
→ where content may already exist
```

Nội dung đã cache vẫn phải thỏa mãn integrity đã được lock.

---

# 103. Chế độ offline

Nếu tất cả artifact đã được lock đều có sẵn cục bộ:

```text id="5q4pf2"
reproduction may work offline
```

Core Resolution không nên yêu cầu kiểm tra phiên bản mới nhất từ remote.

---

# 104. Lockfile và source adapter

Source adapter giúp truy xuất và chuẩn hóa trạng thái upstream đã được lock.

Chúng không được âm thầm thay thế bằng một phiên bản khác nếu source đã lock không khả dụng.

Thay vào đó, hãy báo lỗi.

---

# 105. Lockfile và target adapter

Target adapter sử dụng trạng thái Resolution/Lock.

Chúng không được chọn các implementation ngữ nghĩa thay thế.

Nếu một implementation đã lock không thể được materialize:

```text id="nxn7j6"
report incompatibility
```

thay vì âm thầm thay thế.

---

# 106. Lockfile và Policy

Project Lock không ghi đè vĩnh viễn Policy hiện hành.

Trong quá trình sync thông thường:

```text id="2inf45"
existing lock
↓
revalidate under current Policy
```

Nếu không hợp lệ:

```text id="9hlzcy"
selection must change or Resolution must fail
```

---

# 107. Lockfile và ánh xạ Capability

Nếu Catalog hiện tại không còn ánh xạ Component X đã lock tới Capability Y:

```text id="re26qf"
lock requires revalidation
```

Việc bảo toàn thông thường không nên giả định rằng các ánh xạ ngữ nghĩa đã lỗi thời sẽ mãi mãi hợp lệ.

---

# 108. Snapshot ánh xạ lịch sử

Để tái lập lâu dài tốt hơn, Project Lock có thể ghi lại:

```text id="5kiz8r"
Capability → selected Component
```

một cách trực tiếp.

Nhờ đó, ngay cả khi ánh xạ trong Catalog hiện tại thay đổi, lock lịch sử vẫn có thể hiểu được.

Việc công cụ hiện tại có cho phép tái lập ánh xạ cũ hay không phụ thuộc vào chính sách tương thích.

---

# 109. Khả năng tương thích về sau của Lockfile

Các field không xác định trong lockfile nên được xử lý theo `apiVersion`.

Parser không nên âm thầm bỏ qua ngữ nghĩa từ một phiên bản tương lai chưa được hỗ trợ.

Phiên bản không được hỗ trợ:

```text id="ocgvmh"
UNSUPPORTED_LOCK_VERSION
```

---

# 110. Migration Lockfile

Trong tương lai:

```text id="f2nx8y"
v1alpha1
→ v1beta1
```

có thể cần migration.

Về mặt khái niệm:

```text id="813lsu"
Old Lock
↓
Lock Migration
↓
Current Lock DTO
↓
Validation
```

Migration phải bảo toàn các lựa chọn cụ thể về mặt ngữ nghĩa khi có thể.

---

# 111. Vị trí schema của Project Lock

Khuyến nghị:

```text id="wt6u7v"
packages/schemas/schemas/project-lock.schema.json
```

hoặc:

```text id="qlw8gc"
packages/schemas/schemas/v1alpha1/project-lock.schema.json
```

---

# 112. Vị trí schema của Catalog Lock

Khuyến nghị:

```text id="ydyb0n"
packages/schemas/schemas/catalog-lock.schema.json
```

hoặc bản tương đương có phiên bản.

---

# 113. Field không xác định trong Lockfile

Hành vi V1 được khuyến nghị:

```text id="6ekepi"
reject unknown fields
```

Điều này ngăn chặn những bất tương thích không được phát hiện.

---

# 114. Khả năng đọc hiểu của Lockfile đối với con người

Lockfile nên vẫn có thể được con người kiểm tra.

Tuy nhiên:

```text id="rlh18c"
human editing convenience
```

là thứ yếu so với:

```text id="x82xcm"
deterministic machine semantics
```

---

# 115. YAML và JSON

Project Manifest sử dụng YAML.

Đối với Lockfile, các lựa chọn phù hợp là:

```text id="3ke1rc"
YAML
JSON
```

Khuyến nghị cho V1:

```text id="t26g7v"
YAML
```

nếu ưu tiên sự nhất quán với manifest và khả năng review.

Phương án thay thế:

```text id="d34x05"
JSON
```

nếu ưu tiên tooling tất định và việc sinh file chặt chẽ hơn.

---

# 116. Định dạng Lockfile được khuyến nghị

Đối với dự án này, ban đầu YAML được khuyến nghị vì:

```text id="nlv2k5"
human inspection matters

Git diffs matter

Project Manifest already uses YAML
```

Nhưng generator phải kiểm soát định dạng.

Phần mở rộng của Lockfile vẫn là:

```text id="zt6rbp"
agent-plugins.lock
```

để định dạng có thể vẫn là một chi tiết implementation.

---

# 117. Header của Lockfile

Một lock được sinh ra có thể bao gồm một comment:

```yaml id="8tfbky"
# This file is generated by agent-plugins.
# Do not edit manually.
```

Comment là tùy chọn.

Ngữ nghĩa máy không được phụ thuộc vào chúng.

---

# 118. Phát hiện lock bị chỉnh sửa

Nếu người dùng chỉnh sửa thủ công Lockfile thành một trạng thái hợp lệ nhưng không nhất quán, việc validation ngữ nghĩa nên phát hiện các điểm không khớp khi có thể.

Ví dụ:

```text id="laegbr"
Component does not belong to Package

Capability references unlisted Component

Package integrity missing unexpectedly
```

---

# 119. Tính tự nhất quán của lock

Một Project Lock phải thỏa mãn:

```text id="w2zx1u"
every selected Component exists in Components section

every Component belongs to a resolved Package

every Capability selected implementation references a valid Component

every Package has valid Publisher identity

no duplicate IDs

target matches resolution metadata
```

---

# 120. Đồ thị dependency của Lockfile

Lưu trữ đủ thông tin dependency để tái lập closure Package/Component đã chọn.

Không cần sao chép toàn bộ chính xác đồ thị Capability nếu điều đó không cần thiết cho việc tái lập.

Ưu tiên lock:

```text id="s7f7eu"
concrete implementation closure
```

hơn là sao chép toàn bộ ngữ nghĩa của Catalog.

---

# 121. Tính tối giản của Lockfile

Một Project Lock nên chứa:

```text id="memyxl"
only state required for:

reproduction
validation
explanation
drift detection
```

Tránh biến nó thành một snapshot Catalog đầy đủ.

---

# 122. Tính đầy đủ và kích thước của Lockfile

Sự đánh đổi trong thiết kế là:

```text id="s26jma"
more historical metadata
→ better offline explanation
→ larger lock / more churn

less historical metadata
→ smaller lock
→ stronger dependency on current Catalog
```

Mức cân bằng được khuyến nghị cho V1:

```text id="gsnk85"
persist selected semantic mapping
persist concrete package provenance
persist input digests
do not persist full candidate universe
```

---

# 123. Các section được khuyến nghị cho Project Lock

Về mặt khái niệm:

```text id="7lz8sq"
metadata

resolution

capabilities

components

packages
```

Có thể có trong tương lai:

```text id="cx5jyn"
targets

diagnostics

decisions
```

---

# 124. Cấu trúc Project Lock được khuyến nghị

```yaml id="3qaord"
apiVersion: agent-plugins.dev/v1alpha1
kind: ProjectLock

metadata:
  lockVersion: 1
  resolverVersion: 0.1.0

resolution:
  target: claude-code

  manifestDigest: sha256:...
  inputDigest: sha256:...
  catalogDigest: sha256:...

capabilities:
  engineering.testing.tdd:
    selected:
      - superpowers/superpowers#skill:test-driven-development

  engineering.debugging:
    selected:
      - superpowers/superpowers#skill:systematic-debugging

components:
  superpowers/superpowers#skill:test-driven-development:
    package: superpowers/superpowers
    roles:
      - selected

  superpowers/superpowers#skill:systematic-debugging:
    package: superpowers/superpowers
    roles:
      - selected

packages:
  superpowers/superpowers:
    version: 6.4.0

    source:
      type: git
      repository: obra/superpowers
      ref: abc123...

    integrity:
      algorithm: sha256
      value: ...
```

Ví dụ này mang tính khái niệm, không phải schema cuối cùng.

---

# 125. Vì sao map có thể được ưu tiên

Việc sử dụng canonical ID làm key có thể mang lại:

```text id="36k1b1"
natural deduplication

smaller files

easy lookup

stable identity
```

Ví dụ:

```yaml id="tffxxm"
packages:
  superpowers/superpowers:
    ...
```

Array có thể dễ dàng hơn cho schema và việc sắp xếp thứ tự trong tương lai.

Schema cuối cùng nên chọn một chiến lược nhất quán.

---

# 126. Lựa chọn được khuyến nghị cho V1

Khuyến nghị:

```text id="og3yng"
maps for uniquely keyed entity collections
```

chẳng hạn như:

```text id="6xuu5f"
capabilities

components

packages
```

vì các canonical ID đã cung cấp sẵn key.

---

# 127. Dữ liệu Required-By

`requiredBy` hữu ích nhưng có thể tạo ra các thay đổi lock gây nhiễu khi cấu trúc composition thay đổi mà trạng thái được chọn thực tế không thay đổi.

Khuyến nghị:

```text id="vbl3yj"
do not require full requiredBy provenance for V1 reproduction
```

Thay vào đó, bảo toàn nó trong:

```text id="rtk1vm"
Resolution object
```

và tùy chọn lưu ở dạng gọn trong Lockfile để giải thích.

---

# 128. Lý do lựa chọn

Cách biểu diễn gọn được khuyến nghị:

```yaml id="02k7td"
selection:
  reason: existing-lock
```

Các reason code có thể có:

```text id="yitpzv"
explicit-override

existing-lock

policy-preference

target-preference

catalog-priority

single-candidate

cardinality-many
```

---

# 129. Reason code ổn định

Nếu được lưu trong lock, các giá trị reason nên là các code ổn định cho máy thay vì văn xuôi cho con người.

Văn bản CLI dễ đọc cho con người có thể được sinh ra từ chúng.

---

# 130. Diff Lockfile

Diff của Lockfile nên truyền đạt những thay đổi có ý nghĩa.

Ví dụ:

```text id="65ojv7"
Capability implementation changed

Package version changed

Component added

Component removed

Target changed
```

Serialization ổn định là yếu tố then chốt để diff dễ đọc.

---

# 131. Diff ngữ nghĩa

Trong tương lai:

```bash id="e1j67d"
ap diff
```

nên so sánh các thực thể lock ở mức ngữ nghĩa thay vì văn bản thô.

Ví dụ:

```text id="cniazu"
engineering.testing.tdd

Superpowers
→ Matt Pocock
```

hữu ích hơn nhiều dòng YAML thay đổi.

---

# 132. Phạm vi cập nhật Lockfile

Một lần cập nhật có thể nhắm tới:

```text id="nr6azk"
all Packages

one Publisher

one Package

one Capability selection
```

V1 có thể chỉ implement:

```text id="jsutyy"
global

Publisher-level
```

trong giai đoạn đầu.

---

# 133. Bảo toàn khi cập nhật có phạm vi

Nếu cập nhật Publisher A:

```text id="vpa3bk"
unrelated Publisher B selections
```

nên vẫn được giữ lock khi có thể.

Các thao tác cập nhật nên giảm thiểu những thay đổi không liên quan.

---

# 134. Cập nhật implementation của Capability

Chỉ riêng một thay đổi về priority trong Catalog không nên buộc sync thông thường phải thay thế một implementation đã lock hợp lệ.

Cập nhật tường minh có thể xem xét lại nó.

---

# 135. Cập nhật phiên bản Package

Cập nhật phiên bản Package có thể bảo toàn:

```text id="c1bf0h"
same semantic Capability implementation
```

trong khi thay đổi:

```text id="o013rb"
source ref
integrity
```

Điều này nên hiển thị trong lock diff.

---

# 136. Thay đổi implementation

Quan trọng hơn:

```text id="1nm9d9"
Capability X

Publisher A Component
→ Publisher B Component
```

Điều này nên được hiển thị nổi bật.

---

# 137. Lock diff nhạy cảm về bảo mật

Các thay đổi bổ sung:

```text id="y21ts4"
hook

script

command

MCP server
```

nên được làm nổi bật trong quá trình review cập nhật khi metadata cho phép.

---

# 138. Khả năng audit của Lockfile

Người review nên có thể trả lời:

```text id="69964b"
Which capabilities are active?

Which implementation provides each?

Which packages are required?

Which exact upstream refs are used?

What changed from the previous lock?
```

mà không cần rà soát trạng thái runtime được sinh ra.

---

# 139. Lockfile không thay thế SBOM

Project Lock có thể giống một software bill of materials.

Tuy nhiên, V1 không nhằm cung cấp một implementation SBOM hoàn chỉnh.

Việc export inventory trong tương lai có thể được suy ra từ dữ liệu Lockfile.

---

# 140. Lockfile không thay thế lock của package manager

`agent-plugins.lock` không thay thế:

```text id="ummskx"
pnpm-lock.yaml

package-lock.json

uv.lock

Cargo.lock
```

Các file đó lock các dependency phần mềm nói chung.

`agent-plugins.lock` lock Resolution capability của AI agent.

---

# 141. Dependency lồng nhau của Package

Nếu bản thân một Package bên ngoài sử dụng npm hoặc một package manager khác:

```text id="ja2av1"
agent-plugins.lock
```

không cần sao chép mọi dependency bắc cầu từ hệ sinh thái đó.

Dependency manager gốc của Package vẫn chịu trách nhiệm.

---

# 142. Dependency công cụ runtime

Nếu một Component yêu cầu:

```text id="m72c1c"
Node

Python

browser binary
```

Lockfile có thể ghi lại yêu cầu đó khi phù hợp.

Nó không cần trở thành một lockfile đầy đủ cho cả máy làm việc.

---

# 143. Bảo mật Lockfile

Lockfile có thể chứa:

```text id="n6p36b"
public repositories

hashes

Package names

Component names
```

Chúng không được chứa:

```text id="xnym7a"
API tokens

passwords

private keys

secret environment values
```

---

# 144. Source riêng tư

Nếu trong tương lai các Package đến từ repository riêng tư, lock có thể ghi lại:

```text id="q1jmip"
source identity
```

nhưng không bao giờ ghi lại secret xác thực.

Credential thuộc về các hệ thống quản lý credential bên ngoài.

---

# 145. Đường dẫn tương đối

Đối với source cục bộ/native, các đường dẫn được lưu nên là:

```text id="ypk8ve"
repository-relative
```

khi có thể.

Tránh các đường dẫn tuyệt đối phụ thuộc vào máy.

---

# 146. Lock Package cục bộ

Các Package bên ngoài cục bộ trong tương lai có thể yêu cầu hash nội dung.

Ví dụ:

```yaml id="3rg89m"
source:
  type: filesystem
  path: ./agent-tools/custom

integrity:
  algorithm: sha256
  value: ...
```

Không bắt buộc cho V1 trừ khi source Package cục bộ được hỗ trợ.

---

# 147. Chính sách commit Lockfile

Khuyến nghị:

```text id="brnjrt"
commit catalog.lock
```

trong distribution repository.

Khuyến nghị:

```text id="40ze0f"
commit agent-plugins.lock
```

trong các consumer repository.

Điều này cho phép review code đối với các thay đổi về dependency và implementation.

---

# 148. Merge conflict của Lockfile

Vì lockfile được sinh tự động:

```text id="tyl42h"
manual conflict resolution
```

nên được giảm thiểu.

Ưu tiên:

```text id="y8z05s"
resolve manifest/catalog conflict
↓
regenerate lock
```

khi an toàn.

---

# 149. Sinh lại Project Lock

Khái niệm command:

```bash id="ps0q7a"
ap sync
```

nên sinh lại hoặc cập nhật Lockfile theo ngữ nghĩa bảo toàn lock thông thường.

Một thao tác mang tính phá hủy:

```text id="zm9e9r"
delete lock
```

sẽ chuyển chế độ Resolution sang fresh và có thể thay đổi các lựa chọn implementation.

Điều này nên được hiểu là một thay đổi có ý nghĩa.

---

# 150. Cảnh báo lock mới

Nếu một Lockfile hiện có bị xóa:

```text id="1qxfsp"
fresh resolution
```

có thể chọn các implementation đã được phê duyệt mới hơn hoặc được ưu tiên khác đi.

CLI có thể cảnh báo trước khi chủ động reset trạng thái lock.

---

# 151. Chế độ frozen

CI cuối cùng nên hỗ trợ hành vi tương đương với:

```text id="t0aa6v"
frozen lock
```

Nghĩa là:

```text id="t480g2"
Manifest and Lock must already agree

no Lockfile mutation allowed
```

Command có thể có:

```bash id="whm2wh"
ap sync --frozen
```

hoặc:

```bash id="8u88vo"
ap validate --locked
```

CLI chính xác thuộc về `cli-spec.md`.

---

# 152. Lỗi frozen lock

CI nên thất bại khi:

```text id="4lhvtl"
Lock missing

Lock invalid

Lock stale

locked Package unavailable

integrity mismatch
```

thay vì sửa đổi trạng thái repository.

---

# 153. Sử dụng Lockfile trong CI

Luồng CI điển hình:

```text id="o75k5x"
parse manifest
↓
validate lock
↓
revalidate Resolution
↓
verify no drift
↓
optionally verify target generation
```

---

# 154. Kiểm tra frozen cho distribution

CI của distribution nên xác minh:

```text id="q28jv2"
catalog.lock valid

all external Packages pinned

generated discovery matches locked refs

no generated drift
```

---

# 155. Diagnostic của Lockfile

Các diagnostic code được khuyến nghị:

```text id="ttxfxz"
LOCK_MISSING

LOCK_INVALID

LOCK_STALE

LOCK_TARGET_MISMATCH

LOCK_RESOLVER_VERSION_UNSUPPORTED

CATALOG_LOCK_MISSING

CATALOG_LOCK_INVALID

CATALOG_PACKAGE_NOT_LOCKED

LOCKED_COMPONENT_MISSING

LOCKED_PACKAGE_MISSING

LOCKED_IMPLEMENTATION_INVALID

SOURCE_REF_MISMATCH

INTEGRITY_MISMATCH

UNSUPPORTED_LOCK_VERSION
```

---

# 156. Các kiểm tra doctor cho Lockfile

`ap doctor` cuối cùng nên kiểm tra:

```text id="3k7eqt"
Manifest ↔ Lock consistency

Lock ↔ Catalog consistency

Lock ↔ Policy consistency

Lock ↔ Target compatibility

Lock ↔ Runtime Managed State
```

---

# 157. Khả năng giải thích của Lockfile

`ap explain` có thể dùng Lockfile để trả lời:

```text id="2j8chv"
which implementation is locked

which Package contains it

which version/ref is used
```

Metadata Catalog/Resolution hiện tại có thể bổ sung:

```text id="7uut8b"
why alternatives were suppressed
```

---

# 158. Tương thích với Catalog cũ

Một Project Lock cũ có thể tham chiếu tới một Component không còn tồn tại trong Catalog hiện tại.

Các trạng thái có thể xảy ra:

```text id="utq3xg"
artifact still reproducible

artifact unavailable

semantic mapping deprecated
```

Công cụ nên phân biệt các trạng thái này thay vì đơn giản gọi lock là bị hỏng.

---

# 159. Tái tạo từ lịch sử

Kiến trúc tương lai có thể hỗ trợ tái tạo trực tiếp từ provenance trong Lockfile ngay cả khi Catalog hiện tại đã thay đổi.

Điều này là mong muốn nhưng không bắt buộc phải hoàn chỉnh trong giai đoạn đầu của V1.

Lockfile schema nên tránh khiến điều này trở nên bất khả thi.

---

# 160. Garbage Collection cho Lockfile

Việc gỡ bỏ một Capability có thể khiến:

```text id="syvxgs"
Components

Packages
```

không còn được tham chiếu.

Lockfile được tạo lại nên loại bỏ các entry không còn reachable.

---

# 161. Quy tắc Reachability

Mọi Component được lock nên reachable từ:

```text id="mjlln5"
selected Capability implementation
```

hoặc:

```text id="5a4ibd"
required Component dependency
```

Mọi Package được lock nên reachable từ một Component được lock.

---

# 162. Lock entry mồ côi

Entry mồ côi:

```text id="nn6wsj"
Package with no required Component
```

hoặc:

```text id="p8m6qp"
Component with no semantic/dependency reason
```

nên khiến validation thất bại hoặc bị loại bỏ trong quá trình chuẩn hóa lock.

---

# 163. Chuẩn hóa Lock

Trước khi serialize:

```text id="0wh82i"
deduplicate

remove unreachable entries

sort canonical IDs

normalize source refs

normalize integrity format
```

---

# 164. So sánh bằng nhau của Lockfile

So sánh bằng nhau về mặt ngữ nghĩa nên bỏ qua:

```text id="8q6uhj"
comments

formatting

informational timestamp
```

và so sánh trạng thái lock đã được chuẩn hóa.

---

# 165. Lock Digest

Bản thân Lockfile có thể cung cấp:

```text id="3w9kl5"
lockDigest
```

được tính trên nội dung ngữ nghĩa đã chuẩn hóa.

Hữu ích cho:

```text id="we1iht"
runtime managed-state markers

cache keys

CI comparisons
```

Tùy chọn đối với V1.

---

# 166. Vấn đề tự hash

Nếu lưu `lockDigest` bên trong Lockfile, hãy loại field đó ra khỏi phép tính digest của chính nó.

Về mặt khái niệm:

```text id="l32l2t"
lockDigest =
hash(lock without lockDigest)
```

---

# 167. Marker trạng thái runtime

Một Target Adapter có thể lưu:

```text id="08gx14"
project lock digest
```

trong metadata runtime được quản lý.

Khi đó:

```text id="pnzr9p"
runtime digest
≠
current lock digest
```

có thể nhanh chóng xác định khả năng xảy ra drift.

Đây là hành vi tùy chọn của adapter.

---

# 168. Lockfile và nhiều Target

Mô hình tương lai có thể chọn:

```text id="u5oqdi"
one Project Lock
containing per-target Resolution
```

hoặc:

```text id="7k70ib"
separate locks per target
```

Hướng được khuyến nghị:

```text id="vh6qwm"
one Project Lock
+
per-target resolution sections
```

vì intent ngữ nghĩa của Project là dùng chung.

Không bắt buộc đối với V1.

---

# 169. Sự đơn giản single-target của V1

V1 nên dùng:

```text id="t8dr21"
one Target
one project lock
```

mà không triển khai sớm độ phức tạp multi-target lồng nhau.

---

# 170. Catalog Lock và hỗ trợ nhiều Target

`catalog.lock` phần lớn vẫn độc lập với Target.

Một Package được pin có thể hỗ trợ:

```text id="k5dgdw"
one

many

no currently enabled Targets
```

Khả năng tương thích Target vẫn là metadata của catalog/component.

---

# 171. Các loại thay đổi Lockfile

Các thay đổi của Project Lock nên có thể được phân loại thành:

```text id="ww4oms"
intent-driven

policy-driven

catalog-driven

update-driven

target-driven

resolver-version-driven
```

Điều này có thể cải thiện việc báo cáo diff trong tương lai.

---

# 172. Thay đổi do intent

Ví dụ:

```text id="pil7yo"
+ engineering/security Preset
```

gây ra các lựa chọn Capability mới.

---

# 173. Thay đổi do Policy

Ví dụ:

```text id="p5fgqt"
community publisher no longer allowed
```

gây ra việc thay thế implementation.

---

# 174. Thay đổi do Catalog

Ví dụ:

```text id="cp1kik"
locked Component removed from curated Catalog
```

có thể yêu cầu một implementation mới.

---

# 175. Thay đổi do update

Ví dụ:

```text id="bmnbo9"
Package 6.3 → 6.4
```

sau một lần update tường minh.

---

# 176. Thay đổi do Target

Ví dụ:

```text id="g5b49z"
Claude Code → Codex
```

có thể làm thay đổi việc lựa chọn implementation.

---

# 177. Thay đổi do Resolver

Một lần nâng cấp ngữ nghĩa của Resolver có thể tạo ra một lựa chọn hợp lệ khác.

Hành vi như vậy nên được xem là một thay đổi có khả năng gây breaking và cần được hiển thị rõ ràng.

---

# 178. Nguyên tắc hạn chế churn của Lockfile

Giảm thiểu churn của lockfile.

Không ghi lại các phần không liên quan chỉ vì:

```text id="qle458"
format changed

iteration order changed

current timestamp changed
```

Diff ổn định là một tính năng của sản phẩm.

---

# 179. Churn của Distribution Lock

Tương tự, việc cập nhật một Publisher không nên sắp xếp lại hay ghi lại toàn bộ các entry không liên quan.

---

# 180. Khả năng review Lockfile

Người review nên nhanh chóng thấy được:

```text id="u0fn14"
what capability changed

which implementation changed

which Package changed version

whether security-sensitive Components were introduced
```

CLI diff trong tương lai nên tối ưu cho điều này.

---

# 181. Các field tối thiểu của `catalog.lock` trong V1

Đối với các Package bên ngoài:

```text id="ykq0zr"
Publisher ID

Package ID

human version if available

immutable source ref

source locator

integrity when available
```

---

# 182. Các field tối thiểu của `agent-plugins.lock` trong V1

```text id="4wuf7o"
Lock schema version

Resolver version

Target

Resolution input digest

Catalog/distribution digest or identity

resolved Capabilities

selected Components

resolved Packages

exact Package refs

provenance

integrity where available
```

---

# 183. Những gì V1 có thể hoãn lại

V1 có thể hoãn lại:

```text id="bp1aqv"
full rejected-candidate history

signed lockfiles

cryptographic package signatures

SBOM export

multi-target lock sections

organization audit metadata

historical Catalog snapshots

advanced Package constraint solving
```

---

# 184. Signed Lock trong tương lai

Các tính năng enterprise hoặc supply-chain trong tương lai có thể hỗ trợ:

```text id="k4grkr"
signed catalog.lock

signed Project Lock
```

Điều này không bắt buộc đối với V1.

Integrity hash nên được hỗ trợ độc lập với chữ ký.

---

# 185. Xuất SBOM trong tương lai

Vì Project Lock chứa:

```text id="yjllx1"
Publishers

Packages

Components

versions

refs
```

nên sau này nó có thể hỗ trợ:

```text id="jxg76r"
SBOM-like inventory export
```

mà không biến SBOM thành trách nhiệm cốt lõi của V1.

---

# 186. Audit Trail trong tương lai

Hệ thống cuối cùng có thể ghi lại:

```text id="73rgg6"
who approved update

when

review status

security findings
```

Những thông tin này không nên là bắt buộc trong lockfile của V1.

---

# 187. Anti-Pattern — Một Lock cho mọi thứ

Tránh:

```text id="d365o9"
one global lock
```

gộp chung trạng thái distribution và trạng thái của consumer.

Điều này tạo ra quyền sở hữu không rõ ràng.

---

# 188. Anti-Pattern — Version nằm trong Manifest, không nằm trong Lock

Tránh:

```yaml id="ehwucr"
role: frontend-engineer

packages:
  superpowers: 6.4
```

Intent ngữ nghĩa và resolution cụ thể nên được tách biệt.

---

# 189. Anti-Pattern — Lock chỉ chứa version của Package

Một lock như:

```yaml id="z0kyav"
packages:
  superpowers: 6.4
  ecc: 2.0
```

là không đủ.

Nó làm mất:

```text id="zn6g9n"
Capability mapping

selected Components

semantic provenance

target information
```

---

# 190. Anti-Pattern — Snapshot toàn bộ Catalog trong mọi Project

Tránh sao chép:

```text id="3uor6k"
all Publishers

all Capabilities

all Candidate implementations
```

vào mọi Project Lock.

Lock nên ghi lại closure đã được resolve, không phải toàn bộ hệ sinh thái.

---

# 191. Anti-Pattern — Lock dùng branch có thể thay đổi

Tránh:

```yaml id="ww09dd"
ref: main
```

làm tham chiếu upstream cụ thể duy nhất.

Ưu tiên commit bất biến.

---

# 192. Anti-Pattern — Tự động cập nhật Lock trong khi Sync

Lệnh thông thường:

```text id="u1mtkk"
ap sync
```

không được âm thầm nâng cấp các version Package hợp lệ chỉ vì đã có trạng thái curated mới hơn.

---

# 193. Anti-Pattern — Tin tưởng Lock mà không validate lại

Lock hiện có là một ưu tiên mạnh, không phải một sự miễn trừ.

Luôn validate lại:

```text id="ps7d1i"
Policy

Target

availability

hard dependencies
```

---

# 194. Anti-Pattern — Dùng runtime làm Lockfile

Không tái dựng trạng thái lock mong muốn chỉ bằng cách quét:

```text id="i7zbyx"
.claude/

installed plugins
```

Runtime là Actual State, không phải Project Lock.

---

# 195. Anti-Pattern — Nhiễu do timestamp

Tránh ghi lại:

```text id="dlubme"
generatedAt
```

ở mỗi lần sync không có thay đổi nếu điều đó tạo ra các thay đổi Git vô nghĩa.

---

# 196. Anti-Pattern — Lưu secret

Lockfile không bao giờ được chứa:

```text id="zkxnwi"
access tokens

passwords

private keys

secret query parameters
```

---

# 197. Các invariant validation của Project Lock

Một Project Lock hợp lệ phải thỏa mãn:

```text id="ghpy74"
1. Every locked Capability ID is unique.

2. Every selected implementation references a locked Component.

3. Every locked Component references a locked Package.

4. Every locked Package references a Publisher.

5. Every Package has a concrete approved source state.

6. Required source refs are immutable where supported.

7. Integrity metadata is structurally valid.

8. No orphan Components exist.

9. No orphan Packages exist.

10. Target identity is valid.

11. Resolver/schema version is supported.

12. Semantic digests are well-formed.
```

---

# 198. Các invariant validation của Distribution Lock

Một `catalog.lock` hợp lệ phải thỏa mãn:

```text id="tggkff"
1. Every entry references a known Package.

2. Every external Package requiring a lock has one.

3. Every locked Package has a concrete upstream source ref.

4. Immutable refs are syntactically valid.

5. Integrity metadata is valid where present.

6. No duplicate Package identities exist.

7. Generated discovery can be reproduced from locked state.
```

---

# 199. Invariant tái tạo runtime

Đối với một Project Lock hợp lệ:

```text id="6wri4u"
selected Capability implementation
→ Component
→ Package
→ concrete source
```

phải luôn có thể được duyệt qua.

Nếu chuỗi đó không thể được tái dựng, Lock là chưa đầy đủ.

---

# 200. Invariant bảo toàn Lock

Trong sync thông thường:

> **Một lựa chọn đã được lock và hợp lệ không nên thay đổi chỉ vì tồn tại một implementation đủ điều kiện khác hoặc một version Package mới hơn đã được phê duyệt.**

Đây là đảm bảo ổn định chính của Project Lock.

---

# 201. Invariant của update

Trong chế độ update tường minh:

> **Resolver có thể xem xét lại các lựa chọn đã được lock, nhưng mọi trạng thái mới vẫn phải thỏa mãn cùng các hard constraint, Policy, khả năng tương thích Target và các yêu cầu về khả năng tái tạo.**

---

# 202. Tiêu chí chấp nhận của Lockfile

Mô hình lockfile sẵn sàng cho V1 khi:

```text id="nis38t"
catalog.lock can pin all external initial Publishers

Project Resolution can produce agent-plugins.lock

same Manifest + locked distribution produces stable Project Lock

Project Lock captures Capability → Component → Package → Publisher

exact upstream refs are persisted

normal sync preserves valid locked selection

Manifest change causes appropriate re-resolution

Policy change invalidates forbidden lock state

explicit update can change versions/selections

integrity mismatches fail

orphan lock entries are impossible

semantic lock diffs remain stable and readable
```

---

# 203. Ví dụ Dual-Lock

Distribution:

```text id="7a20cl"
catalog.lock

Superpowers
→ v6.4
→ abc123

ECC
→ v2.1
→ def456
```

Project:

```text id="4rbkza"
agent-plugins.yaml

role:
frontend-engineer
```

Resolution:

```text id="5bb2dw"
engineering.testing.tdd
→ Superpowers

engineering.security
→ ECC
```

Project lock:

```text id="9ux47r"
agent-plugins.lock

TDD
→ Superpowers
→ abc123

Security
→ ECC
→ def456
```

Project chỉ lưu tập con mà nó thực sự đã resolve.

---

# 204. Ví dụ update Distribution

Trước:

```text id="s56v24"
catalog.lock

Superpowers
→ abc123
```

Maintainer review upstream mới:

```text id="19zo2r"
Superpowers
→ xyz789
```

Sau khi update được phê duyệt:

```text id="x1eyxf"
catalog.lock
→ xyz789
```

Consumer hiện có:

```text id="n18l3j"
agent-plugins.lock
→ abc123
```

vẫn hợp lệ cho đến khi có update Project tường minh, miễn là artifact cũ vẫn còn sử dụng được.

---

# 205. Ví dụ update Project

Trước:

```text id="i3vw9q"
agent-plugins.lock

Superpowers
→ abc123
```

Chạy:

```text id="be2r8b"
ap update
```

dựa trên distribution mới đã được phê duyệt.

Sau:

```text id="em3cwq"
agent-plugins.lock

Superpowers
→ xyz789
```

Lock diff làm cho thay đổi trở nên tường minh.

---

# 206. Ví dụ thay đổi implementation

Trước:

```text id="rd34mv"
engineering.testing.tdd
→ Superpowers
```

Catalog giờ ưu tiên:

```text id="q8n7b7"
Matt Pocock
```

Sync thông thường:

```text id="s0j2wa"
preserve Superpowers
```

Update tường minh:

```text id="uoahku"
may switch to Matt Pocock
```

nếu tất cả các quy tắc của Resolver cho phép.

---

# 207. Ví dụ Policy làm mất hiệu lực

Đã lock:

```text id="1zvgjx"
security.review
→ Community Publisher
```

Policy mới:

```text id="ez0isj"
deny community
```

Sync thông thường:

```text id="fjszhi"
cannot preserve lock
```

Resolver phải:

```text id="38urmh"
select another eligible implementation
```

hoặc:

```text id="hrdmk0"
fail
```

nếu không tồn tại implementation nào.

---

# 208. Pipeline xử lý Lockfile

Project:

```text id="we7iq6"
agent-plugins.yaml
        ↓
Resolution Context
        ↓
Existing Lock Validation
        ↓
Resolver
        ↓
Resolution
        ↓
Lockfile Builder
        ↓
Lock Normalization
        ↓
Schema Validation
        ↓
Atomic Write
        ↓
agent-plugins.lock
```

Distribution:

```text id="c40dy3"
Upstream Check
       ↓
Maintainer Selection
       ↓
Package Ref Resolution
       ↓
Integrity Calculation
       ↓
Validation
       ↓
catalog.lock
```

---

# 209. Mô hình tư duy về Project Lock

```text id="c416ka"
Intent
   ↓
Capability
   ↓
Selected Component
   ↓
Package
   ↓
Exact Source Revision
```

Một Project Lock đóng băng toàn bộ đường đi cụ thể.

---

# 210. Mô hình tư duy về Distribution Lock

```text id="zp9wo8"
Publisher Ecosystem
      ↓
Curated Package
      ↓
Approved Version
      ↓
Immutable Source Revision
```

---

# 211. Các invariant của Dual-Lock

Hệ thống phải bảo toàn:

```text id="jzllc0"
1. catalog.lock and agent-plugins.lock serve different owners.

2. catalog.lock pins approved upstream state.

3. agent-plugins.lock pins Project-specific resolved state.

4. Project Manifest remains the source of semantic intent.

5. Lockfiles never contain secrets.

6. External Package refs should be immutable where practical.

7. Lock serialization is deterministic.

8. Normal sync preserves valid Project Lock selections.

9. Explicit update may intentionally change them.

10. Existing lock never overrides hard Policy or Target constraints.

11. Project Lock contains only the resolved dependency closure.

12. Runtime state does not replace lock state.

13. Lockfile writes should be atomic.

14. Semantic digests use normalized input, not raw file bytes.

15. Distribution update does not automatically update consumer locks.

16. Consumer Project update does not mutate catalog.lock.

17. Selected state remains traceable from Capability to upstream source.

18. Generated runtime artifacts are downstream of the Lock, not authoritative above it.
```

---

# 212. Lockfile trong một câu

> **`catalog.lock` đóng băng chính xác trạng thái upstream được curate bởi distribution `agent-plugins`, trong khi `agent-plugins.lock` đóng băng chính xác resolution capability-to-component-to-package của một consumer project, cho phép các update luôn tường minh, có thể tái tạo, có thể review và độc lập giữa ranh giới distribution và project.**