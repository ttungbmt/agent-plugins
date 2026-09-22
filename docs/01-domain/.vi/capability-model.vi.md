# Capability Model

## Tổng quan

Tài liệu này định nghĩa capability model chuẩn (canonical) được sử dụng bởi `agent-plugins`.

Một **Capability** đại diện cho một khả năng mang tính ngữ nghĩa, độc lập với publisher, mà một môi trường agent có thể cung cấp.

Ví dụ:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
security.review
frontend.design
knowledge.research
product.discovery
```

Capability tạo thành lớp ngữ nghĩa nằm giữa:

```text
User Intent
    ↓
Capability
    ↓
Implementation
    ↓
Publisher Package / Component
```

Capability model tồn tại để người dùng, profile, preset và project có thể mô tả **họ cần gì** mà không phụ thuộc trực tiếp vào **ai implement nó**.

---

# 1. Capability là abstraction cốt lõi

Nguyên tắc trung tâm là:

> **Capability mô tả intent. Component cung cấp implementation.**

Ví dụ:

```text
Capability
engineering.testing.tdd
```

có thể được implement bởi:

```text
Superpowers / test-driven-development

Matt Pocock / tdd

ECC / tdd-workflow
```

Một consumer thông thường nên phụ thuộc vào:

```text
engineering.testing.tdd
```

thay vì:

```text
superpowers/test-driven-development
```

Điều này tạo ra một ranh giới ngữ nghĩa ổn định nằm trên các publisher thay đổi nhanh chóng.

---

# 2. Trách nhiệm của Capability

Một Capability chịu trách nhiệm mô tả:

```text
semantic identity
meaning
namespace
cardinality
dependencies
compatibility constraints
lifecycle state
implementation candidates
```

Một Capability **không** chịu trách nhiệm cho:

```text
installation
source discovery
publisher fetching
runtime file generation
package download
```

Những mối quan tâm đó thuộc về các phần khác của hệ thống.

---

# 3. Định danh Capability

Mọi Capability phải có một định danh chuẩn duy nhất trên phạm vi toàn cục.

Định danh phải mô tả intent ngữ nghĩa.

Nên dùng:

```text
engineering.testing.tdd
```

Tránh:

```text
superpowers.tdd
ecc.tdd
claude.tdd
```

Tên publisher và tên runtime thông thường không được xuất hiện trong Capability ID.

---

# 4. Định dạng Capability ID

Capability ID sử dụng namespace phân cấp, phân tách bằng dấu chấm.

Dạng khuyến nghị:

```text
<domain>.<area>.<capability>
```

Ví dụ:

```text
workflow.planning

engineering.requirements
engineering.architecture
engineering.testing.tdd

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

ID hai cấp có thể chấp nhận được khi việc phân cấp thêm mang lại ít giá trị:

```text
security.review
workflow.planning
```

---

# 5. Mục tiêu của Namespace

Namespace của capability nên tối ưu cho:

```text
semantic clarity
stability
discoverability
composition
future extension
```

Chúng không nên phản chiếu:

```text
repository folder structures
publisher naming conventions
runtime configuration formats
temporary implementation details
```

---

# 6. Các Namespace cấp cao nhất ban đầu

Catalog ban đầu có thể sử dụng các namespace như:

```text
workflow
engineering
frontend
backend
security
devops
data
database
knowledge
product
design
research
automation
gis
runtime
tooling
```

Danh sách này có thể thay đổi theo thời gian.

Việc thêm một namespace cấp cao nhất nên đòi hỏi một sự khác biệt ngữ nghĩa thực sự thay vì chỉ vì tiện lợi.

---

# 7. Namespace workflow

Namespace `workflow` đại diện cho các quy trình làm việc cấp cao.

Ví dụ:

```text
workflow.brainstorming
workflow.planning
workflow.execution
workflow.verification
workflow.code-review
workflow.branch-completion
```

Đây thường là những ứng viên phù hợp cho:

```text
cardinality: one
```

vì nhiều workflow owner cạnh tranh nhau có thể tạo ra các chỉ dẫn mâu thuẫn.

---

# 8. Namespace engineering

Namespace `engineering` đại diện cho các thực hành software engineering nhìn chung độc lập với stack.

Ví dụ:

```text
engineering.requirements
engineering.domain-modeling
engineering.architecture
engineering.codebase-design

engineering.testing.tdd
engineering.testing.unit
engineering.testing.integration
engineering.testing.e2e

engineering.debugging
engineering.review
engineering.refactoring
engineering.verification
```

---

# 9. Capability về Stack và Domain

Capability nên mô tả hành vi ngữ nghĩa, không phải các tổ hợp có thể tái sử dụng.

Ví dụ:

```text
frontend.react
frontend.nextjs
frontend.accessibility
frontend.design
```

có thể tồn tại dưới dạng Capability.

Nhưng:

```text
stacks/nextjs
```

là một Preset, không phải Capability.

Do đó:

```text
Capability
→ one semantic ability

Preset
→ composition of capabilities
```

---

# 10. Mô tả Capability

Mọi Capability chuẩn nên có một mô tả ngắn gọn, độc lập với implementation.

Ví dụ:

```yaml
id: engineering.testing.tdd

description: >
  Guides development using a test-first cycle where expected behavior
  is expressed through tests before implementation.
```

Mô tả nên giải thích:

```text
what the capability provides
```

chứ không phải:

```text
how a particular publisher implements it
```

---

# 11. Cardinality của Capability

Mỗi Capability phải định nghĩa một cardinality.

Các giá trị ban đầu:

```text
one
many
```

---

# 12. Cardinality: One

`one` nghĩa là thông thường chỉ nên có một implementation đang hoạt động cho capability đó.

Ví dụ:

```yaml
id: engineering.testing.tdd
cardinality: one
```

Các ví dụ điển hình:

```text
workflow.planning
workflow.execution
engineering.testing.tdd
engineering.debugging
engineering.review
```

Các capability này đại diện cho phương pháp luận hoặc quyền sở hữu hành vi, nơi nhiều implementation có thể cạnh tranh nhau.

---

# 13. Cardinality: Many

`many` nghĩa là nhiều implementation có thể cùng hoạt động đồng thời.

Ví dụ:

```yaml
id: knowledge.research
cardinality: many
```

Các ví dụ điển hình có thể gồm:

```text
knowledge.research
tooling.browser
database.postgresql
security.knowledge
```

Nhiều implementation có thể cung cấp các chức năng bổ sung cho nhau.

---

# 14. Cardinality mang tính ngữ nghĩa

Cardinality thuộc về Capability, không thuộc về Publisher.

Ví dụ:

```text
engineering.testing.tdd
```

nên luôn giữ:

```text
cardinality: one
```

bất kể có:

```text
2 publishers
5 publishers
20 publishers
```

Số lượng implementation hiện có không quyết định cardinality.

---

# 15. Cardinality không phải là số lượng Package

Một cardinality bằng:

```text
one
```

không có nghĩa là chỉ được cài đặt một Package.

Ví dụ:

```text
Package A
provides selected debugging component

Package B
provides selected planning component
```

Cả hai package đều có thể chứa implementation TDD.

Chỉ một TDD Component nên được chọn về mặt ngữ nghĩa.

Do đó:

```text
Capability cardinality
≠
Package installation cardinality
```

---

# 16. Capability Implementation

Một **Capability Implementation** ánh xạ một Component tới một Capability.

Về mặt khái niệm:

```text
Capability
engineering.testing.tdd

Implementation
superpowers/superpowers#skill:test-driven-development
```

Một implementation có thể bao gồm metadata như:

```text
priority
status
target compatibility
trust constraints
version constraints
notes
```

---

# 17. Ánh xạ nhiều-nhiều

Model phải hỗ trợ:

```text
one Capability
→ many Components
```

và:

```text
one Component
→ multiple Capabilities
```

Ví dụ:

```text
Component:
architecture-review-agent

implements:

engineering.architecture
engineering.review
```

Tuy nhiên, các ánh xạ nhiều capability nên được sử dụng một cách cẩn trọng.

Không nên gộp các Capability lại chỉ vì một publisher kết hợp chúng trong một Component.

---

# 18. Ánh xạ phải bảo toàn ranh giới ngữ nghĩa

Giả sử một Component cung cấp:

```text
planning
TDD
debugging
review
```

Catalog không nên tạo ra:

```text
engineering.super-workflow
```

chỉ vì một publisher gói các hành vi đó lại với nhau.

Thay vào đó, catalog nên ánh xạ Component tới các capability ngữ nghĩa phù hợp khi có cơ sở.

Capability model phải luôn độc lập với cách đóng gói của publisher.

---

# 19. Priority của Implementation

Mỗi implementation có thể định nghĩa một resolution priority.

Ví dụ:

```yaml
capability: engineering.testing.tdd

implementations:
  - component: superpowers/superpowers#skill:test-driven-development
    priority: 100

  - component: mattpocock/skills#skill:tdd
    priority: 80

  - component: ecc/ecc#skill:tdd-workflow
    priority: 70
```

Giá trị cao hơn thể hiện mức ưu tiên mặc định mạnh hơn.

---

# 20. Priority không phải là Trust

Priority trả lời câu hỏi:

> Implementation đủ điều kiện nào được ưu tiên?

Trust trả lời câu hỏi:

> Implementation này có đủ điều kiện theo policy không?

Do đó, về mặt khái niệm, thứ tự resolution nên là:

```text
Candidates
    ↓
Hard Constraints
    ↓
Policy
    ↓
Target Compatibility
    ↓
Eligibility
    ↓
Priority
```

Không bao giờ:

```text
Priority
    ↓
ignore policy
```

---

# 21. Priority phụ thuộc vào ngữ cảnh

Có thể tồn tại một priority mặc định của catalog.

Tuy nhiên, resolution cũng có thể xem xét:

```text
policy preference
target-specific preference
project override
version availability
compatibility
```

Do đó, thứ tự thực tế có thể khác với priority cơ sở của catalog.

---

# 22. Override tường minh

Một Project có thể chọn tường minh một implementation cụ thể.

Về mặt khái niệm:

```yaml
overrides:
  implementations:
    engineering.testing.tdd:
      component: mattpocock/skills#skill:tdd
```

Một override tường minh thông thường nên có mức ưu tiên mạnh hơn priority mặc định.

Tuy nhiên, nó vẫn phải thỏa mãn các ràng buộc cứng như:

```text
policy
target compatibility
availability
dependency validity
```

Một override không nên tự động bỏ qua security policy.

---

# 23. Capability Requirement

Một Capability Requirement cho biết một Capability cần có mặt trong môi trường mong muốn.

Các nguồn gốc có thể có:

```text
Preset
Profile
Project
Capability dependency
```

Lý tưởng nhất, mỗi requirement nên giữ lại provenance.

Ví dụ:

```text
engineering.testing.tdd

required by:

Project
→ frontend-engineer
→ engineering/core
```

Provenance này hỗ trợ:

```text
explainability
conflict diagnostics
disable behavior
```

---

# 24. Capability bắt buộc

Một capability bắt buộc phải được resolve thành công.

Ví dụ:

```yaml
capabilities:
  required:
    - engineering.testing.tdd
```

Nếu không tồn tại implementation đủ điều kiện nào:

```text
resolution fails
```

---

# 25. Capability tùy chọn

Một capability tùy chọn cải thiện môi trường nhưng không khiến môi trường trở nên không hợp lệ nếu không có sẵn.

Về mặt khái niệm:

```yaml
capabilities:
  optional:
    - browser.visual-regression
```

Nếu không có sẵn, resolver có thể phát ra:

```text
warning
```

thay vì lỗi.

Ban đầu, V1 có thể coi hầu hết các capability được khai báo là bắt buộc nếu ngữ nghĩa tùy chọn chưa thực sự cần thiết.

---

# 26. Dependency của Capability

Một Capability có thể phụ thuộc vào một Capability khác.

Ví dụ:

```text
engineering.testing.e2e

requires:

tooling.browser
```

Dependency này nên luôn mang tính ngữ nghĩa.

Tránh:

```text
engineering.testing.e2e
requires package X
```

trừ khi dependency đó đặc thù cho implementation.

---

# 27. Hard Capability Dependency

Một hard dependency nghĩa là Capability được yêu cầu cũng phải được resolve.

Ví dụ:

```yaml
id: engineering.testing.e2e

requires:
  - tooling.browser
```

Resolution trở thành:

```text
engineering.testing.e2e
       ↓
tooling.browser
```

Nếu `tooling.browser` không thể resolve:

```text
engineering.testing.e2e
```

cũng phải thất bại.

---

# 28. Optional Capability Dependency

Một optional dependency bổ sung chức năng nhưng không bắt buộc.

Ví dụ:

```text
knowledge.research

optionally uses:

tooling.browser
```

Việc thiếu optional dependency không làm `knowledge.research` trở nên không hợp lệ.

---

# 29. Chu trình Dependency của Capability

Đồ thị dependency của capability phải không có chu trình (acyclic).

Không hợp lệ:

```text
Capability A
→ Capability B
→ Capability C
→ Capability A
```

Việc phát hiện chu trình nên diễn ra trong quá trình validation, trước khi resolution cuối cùng.

---

# 30. Dependency của Implementation

Một Component có thể có các dependency đặc thù cho implementation.

Ví dụ:

```text
security-review-agent
requires
filesystem-search-tool
```

Các dependency này thuộc về metadata của Component hoặc Package thay vì thuộc về chính Capability.

Sự phân biệt này rất quan trọng:

```text
Capability Dependency
→ semantic requirement

Component Dependency
→ implementation requirement
```

---

# 31. Conflict giữa các Capability

Bản thân các Capability đôi khi có thể conflict với nhau.

Ví dụ:

```text
workflow.strict-tdd
conflicts with
workflow.prototype-first
```

Tuy nhiên, conflict tường minh ở cấp Capability nên hiếm gặp.

Nên mô hình hóa sự chồng lấn thông qua:

```text
shared capability identity
+
cardinality
```

bất cứ khi nào có thể.

---

# 32. Conflict ngầm định

Conflict phổ biến nhất là conflict ngầm định.

Ví dụ:

```text
engineering.testing.tdd
cardinality: one
```

Nếu hai implementation được chọn:

```text
implementation A
implementation B
```

chúng sẽ tự động conflict.

Không cần khai báo conflict tường minh.

---

# 33. Conflict tường minh giữa các Implementation

Hai Component có thể conflict ngay cả khi chúng implement các capability khác nhau.

Ví dụ:

```text
Component A
conflictsWith:
  - Component B
```

Các lý do tiềm ẩn:

```text
same command name
incompatible hooks
contradictory runtime configuration
mutually exclusive execution models
```

Conflict tường minh giữa các implementation thuộc về metadata của implementation.

---

# 34. Quyền sở hữu Capability

Một số capability hoạt động như workflow owner.

Ví dụ:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
```

Thông thường, chúng nên có:

```text
cardinality: one
```

Implementation được chọn sẽ trở thành **active owner** của capability đó.

---

# 35. Quyền sở hữu Capability không có nghĩa là Publisher sở hữu

Ví dụ:

```text
Superpowers
```

có thể được chọn làm active owner của:

```text
engineering.testing.tdd
```

cho một Resolution cụ thể.

Điều này không có nghĩa là:

```text
Superpowers permanently owns the capability
```

Capability vẫn độc lập với publisher.

Một Project hoặc Policy khác có thể resolve theo cách khác.

---

# 36. Category của Capability

Capability có thể bao gồm metadata category để phục vụ việc duyệt và discovery.

Ví dụ:

```yaml
category: testing
```

Category chỉ mang tính thông tin.

Chúng không nên thay thế Capability ID phân cấp.

---

# 37. Tag của Capability

Capability có thể chứa tag.

Ví dụ:

```yaml
tags:
  - testing
  - discipline
  - engineering
```

Tag hỗ trợ:

```text
search
discovery
documentation
future recommendation
```

Chúng không nên tham gia vào resolution deterministic trừ khi được chỉ định tường minh bởi một tính năng sau này.

---

# 38. Độ ổn định của Capability

Capability có thể cung cấp một phân loại về độ ổn định.

Vòng đời đề xuất:

```text
experimental
stable
deprecated
removed
```

---

# 39. Experimental Capability

Một Experimental Capability vẫn có thể thay đổi:

```text
name
scope
semantics
dependencies
```

Ví dụ:

```yaml
stability: experimental
```

Các experimental capability nên được sử dụng cẩn trọng trong các profile tồn tại lâu dài.

---

# 40. Stable Capability

Một Stable Capability có ngữ nghĩa đã được xác lập.

Các thay đổi đối với một Stable Capability nên tránh làm thay đổi ý nghĩa cơ bản của nó.

Nếu ngữ nghĩa thay đổi đáng kể, việc giới thiệu một Capability ID mới có thể là lựa chọn tốt hơn.

---

# 41. Deprecated Capability

Một Deprecated Capability vẫn được biết đến để phục vụ migration và compatibility.

Ví dụ:

```yaml
status: deprecated
replacement: engineering.testing.tdd
```

Thông thường, các deprecated capability không nên xuất hiện trong các Preset mới.

---

# 42. Removed Capability

Một Removed Capability không còn là một phần của quá trình resolution catalog đang hoạt động.

Nó có thể vẫn được ghi lại trong tài liệu để phục vụ:

```text
lockfile compatibility
migration
historical reference
```

---

# 43. Đổi tên Capability

Đổi tên một Capability ID là một thay đổi ngữ nghĩa mang tính breaking.

Nên:

```text
old capability
→ deprecated

new capability
→ introduced

migration mapping
→ documented
```

thay vì âm thầm thay đổi định danh.

---

# 44. Alias của Capability

Alias có thể hỗ trợ discovery hoặc migration.

Ví dụ:

```yaml
aliases:
  - tdd
  - test-driven-development
```

Alias nên resolve tới đúng một Capability chuẩn.

Chúng không được tạo ra các định danh chuẩn thay thế.

---

# 45. Độ chi tiết của Capability

Capability không nên quá rộng cũng không nên quá hẹp.

Quá rộng:

```text
engineering
```

Quá hẹp:

```text
engineering.testing.tdd.red-phase.write-one-failing-test
```

Nên dùng:

```text
engineering.testing.tdd
```

Một Capability hữu ích nên đại diện cho một đơn vị intent có ý nghĩa của người dùng.

---

# 46. Quy tắc tách Capability

Tách một Capability khi các hành vi có thể một cách hợp lý được:

```text
requested independently
implemented independently
resolved independently
governed independently
```

Ví dụ:

```text
engineering.testing.tdd
engineering.testing.e2e
```

nên được giữ tách biệt.

---

# 47. Quy tắc gộp Capability

Không tạo các Capability riêng biệt chỉ vì các publisher sử dụng thuật ngữ khác nhau.

Ví dụ:

```text
tdd
test-driven-development
testing-discipline
```

đều có thể ánh xạ tới:

```text
engineering.testing.tdd
```

nếu intent ngữ nghĩa của chúng về cơ bản là tương đương.

---

# 48. Tương đương ngữ nghĩa

Hai Component có thể ánh xạ tới cùng một Capability khi chúng cung cấp intent người dùng đủ tương đương.

Chúng không cần giống hệt nhau về implementation.

Ví dụ:

```text
Publisher A:
test-driven-development

Publisher B:
tdd-workflow
```

Cả hai đều có thể đại diện cho:

```text
engineering.testing.tdd
```

ngay cả khi các chỉ dẫn chi tiết của chúng khác nhau.

---

# 49. Tương đồng ngữ nghĩa không phải lúc nào cũng là tương đương

Hai component nghe có vẻ giống nhau vẫn có thể cần các Capability khác nhau.

Ví dụ:

```text
engineering.review
```

so với:

```text
security.review
```

Cả hai đều liên quan đến review, nhưng kết quả mong muốn là khác nhau.

Việc ánh xạ Capability đòi hỏi sự phán đoán về ngữ nghĩa.

---

# 50. Tiêu chí ánh xạ Capability

Khi ánh xạ một Component tới một Capability, maintainer nên xem xét:

```text
primary user intent

expected output

workflow ownership

scope

preconditions

side effects

runtime behavior
```

Chỉ trùng tên là không đủ.

---

# 51. Một Component, nhiều Capability

Một Component có thể cung cấp nhiều capability ngữ nghĩa.

Ví dụ:

```text
architecture-agent
```

có thể cung cấp:

```text
engineering.architecture
engineering.codebase-design
```

Ánh xạ này được cho phép.

Tuy nhiên, chỉ ánh xạ những capability mà Component thực sự cung cấp.

Tránh thổi phồng ánh xạ cho mục đích discovery.

---

# 52. Một Capability, nhiều Component từ cùng một Package

Một Package có thể chứa nhiều Component cùng implement một Capability.

Ví dụ:

```text
Package X

skill:tdd
agent:tdd-coach
```

Cả hai có thể implement:

```text
engineering.testing.tdd
```

Catalog có thể:

```text
prefer one
treat them as a composite implementation
or allow both if semantics justify it
```

Điều này nên được thể hiện tường minh.

---

# 53. Composite Implementation

Một số Capability có thể cần nhiều Component từ cùng một hoặc nhiều Package khác nhau để hoạt động như một implementation duy nhất.

Về mặt khái niệm:

```text
Capability
security.review

Implementation
├── security-review-agent
├── static-analysis-command
└── security-rules
```

Model có thể biểu diễn trường hợp như vậy dưới dạng một implementation set.

Điều này chỉ nên được đưa vào khi cần thiết.

Các ánh xạ một component đơn giản được ưu tiên hơn.

---

# 54. Implementation Set

Về mặt khái niệm, một **Implementation Set** nhóm nhiều Component cùng nhau đáp ứng một Capability.

Ví dụ:

```yaml
capability: security.review

components:
  - ecc/ecc#agent:security-reviewer
  - ecc/ecc#command:security-scan
```

Set này nên được resolve một cách nguyên tử (atomic) khi được yêu cầu.

V1 có thể trì hoãn Implementation Set dạng first-class tường minh nếu việc mô hình hóa dependency Package/Component hiện có là đủ.

---

# 55. Capability độc lập với nguồn

Một Capability phải luôn hợp lệ ngay cả khi mọi implementation hiện tại biến mất.

Ví dụ:

```text
engineering.testing.tdd
```

vẫn đại diện cho một intent có ý nghĩa của người dùng ngay cả khi một publisher cụ thể bị loại bỏ.

Sự tách biệt này là trọng tâm của tính ổn định dài hạn.

---

# 56. Độc lập với Target

Capability phải luôn độc lập với runtime.

Nên dùng:

```text
frontend.design
```

Tránh:

```text
claude.frontend.design
```

Target compatibility thuộc về implementation.

---

# 57. Implementation đặc thù theo Target

Cùng một Capability có thể resolve tới các Component khác nhau tùy thuộc vào Target.

Ví dụ:

```text
engineering.testing.tdd

Claude Code
→ Component A

Codex
→ Component B
```

Capability vẫn không thay đổi.

---

# 58. Tính sẵn có của Capability

Một Capability có thể có các trạng thái sẵn có khác nhau theo từng Resolution Context.

Ví dụ:

```text
available
partially available
unavailable
```

Tính sẵn có phụ thuộc vào:

```text
catalog
policy
target
version
publisher state
```

---

# 59. Trạng thái hỗ trợ của Capability

Đối với một Target, về mặt khái niệm, mức hỗ trợ có thể là:

```text
supported
partial
unsupported
```

Ví dụ:

```text
workflow.external-hook

Claude Code
→ supported

Runtime B
→ unsupported
```

Khi có thể, trạng thái hỗ trợ nên được suy ra từ tính sẵn có của implementation thay vì được nhúng trực tiếp vào ngữ nghĩa của Capability.

---

# 60. Pipeline lựa chọn Capability

Với mỗi Capability Requirement:

```text
Capability Requirement
        ↓
Find Implementations
        ↓
Check Availability
        ↓
Apply Policy
        ↓
Check Target Compatibility
        ↓
Check Dependencies
        ↓
Check Conflicts
        ↓
Determine Eligible Candidates
        ↓
Apply Overrides
        ↓
Apply Preference / Priority
        ↓
Apply Cardinality
        ↓
Select Implementation(s)
```

---

# 61. Eligibility trước Preference

Resolver trước tiên phải xác định:

```text
Can this candidate be used?
```

Chỉ sau đó mới xét:

```text
Should this candidate be preferred?
```

Do đó:

```text
Eligibility
    ↓
Preference
```

chứ không phải:

```text
Preference
    ↓
Eligibility
```

---

# 62. Các ràng buộc cứng của Resolution

Một candidate nên bị từ chối khi nó vi phạm một ràng buộc cứng như:

```text
policy deny
unsupported target
missing required dependency
unavailable locked version
explicit incompatibility
disabled implementation
```

Các candidate bị từ chối không tham gia vào việc xếp hạng preference.

---

# 63. Các preference mềm của Resolution

Ví dụ về các tín hiệu preference mềm:

```text
catalog priority
publisher preference
official-source preference
curated-source preference
target-specific preference
existing lockfile preference
```

Chúng ảnh hưởng đến việc lựa chọn giữa các candidate đủ điều kiện.

---

# 64. Ưu tiên Lock hiện có

Khi bảo toàn một lockfile hợp lệ, resolver có thể ưu tiên implementation hiện đang được lock thay vì tự động chuyển sang một candidate khác có giá trị tương đương.

Điều này hỗ trợ tính ổn định.

Về mặt khái niệm:

```text
valid existing lock
>
unnecessary implementation churn
```

trừ khi một thao tác update tường minh yêu cầu xem xét lại.

---

# 65. Phân định hòa một cách deterministic

Nếu nhiều candidate vẫn có mức ưu tiên ngang nhau, resolver phải sử dụng một quy tắc deterministic đã được ghi lại trong tài liệu hoặc thất bại một cách tường minh.

Các tie-breaker deterministic cuối cùng có thể bao gồm:

```text
canonical publisher ID
canonical package ID
canonical component ID
```

Tuy nhiên, việc âm thầm chọn theo thứ tự bảng chữ cái có thể che giấu một quyết định sản phẩm còn thiếu.

Với các capability `cardinality: one` quan trọng, một lỗi mơ hồ (ambiguity error) tường minh có thể là lựa chọn tốt hơn.

---

# 66. Đầu ra Resolution của Capability

Với mỗi Capability đã được resolve, Resolution nên có khả năng biểu diễn:

```text
capability ID
requirement sources
cardinality

candidate implementations

selected implementation(s)
suppressed implementations
rejected implementations

resolution reason
diagnostics
```

Điều này hỗ trợ `ap explain`.

---

# 67. Ví dụ Resolution

```text
Capability:
engineering.testing.tdd

Cardinality:
one

Required by:
frontend-engineer
→ engineering/core

Candidates:

1. Superpowers / test-driven-development
   policy: allowed
   target: supported
   priority: 100
   status: selected

2. Matt Pocock / tdd
   policy: allowed
   target: supported
   priority: 80
   status: suppressed

3. ECC / tdd-workflow
   policy: denied
   target: supported
   priority: 70
   status: rejected
```

---

# 68. Yêu cầu về Explainability

Một capability resolution nên giải thích được thông qua:

```text
Why was this capability required?

Which implementations were considered?

Which candidates were rejected?

Why were they rejected?

Why was this candidate selected?

Which package must be installed?

Which publisher owns that package?
```

---

# 69. Provenance của Capability

Bản thân Capability mang tính ngữ nghĩa và thuộc sở hữu của project.

Các implementation của nó giữ lại upstream provenance.

Ví dụ:

```text
Capability:
engineering.testing.tdd

Implementation provenance:
publisher: superpowers
package: superpowers
repository: ...
version: ...
commit: ...
```

Không đặt định danh upstream repository bên trong Capability ID.

---

# 70. Mục Capability trong Catalog

Một Capability manifest về mặt khái niệm có thể trông như sau:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.testing.tdd
  name: Test-Driven Development

spec:
  description: >
    Provides a test-first development workflow.

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

Schema chính xác thuộc về các tài liệu đặc tả sau này.

---

# 71. Tham chiếu Capability trong Preset

Một Preset thông thường nên tham chiếu đến Capability ID.

Ví dụ:

```yaml
id: engineering/core

capabilities:
  - workflow.planning
  - engineering.testing.tdd
  - engineering.debugging
  - engineering.review
```

Thông thường, Preset không nên chọn implementation.

---

# 72. Luồng Capability của Profile

Một Profile thông thường nên đi đến Capability thông qua Preset.

Ví dụ:

```text
frontend-engineer
    ↓
engineering/core
    ↓
engineering.testing.tdd
```

Tham chiếu trực tiếp Profile → Capability có thể được hỗ trợ nếu hữu ích, nhưng composition qua Preset nên vẫn là mẫu được ưu tiên.

---

# 73. Luồng Capability của Project

Một Project có thể thêm capability thông qua:

```text
Profile
Preset
explicit capability override
```

Về mặt khái niệm:

```text
Project
├── Profile
│   └── Presets
│       └── Capabilities
│
├── Additional Presets
│   └── Capabilities
│
└── Overrides
    ├── enable
    └── disable
```

---

# 74. Override bật Capability

Một project có thể bật tường minh một Capability.

Ví dụ:

```yaml
overrides:
  capabilities:
    enable:
      - security.review
```

Điều này hoạt động như một Capability Requirement bổ sung.

---

# 75. Override tắt Capability

Một Project có thể tắt một Capability được kế thừa.

Ví dụ:

```yaml
overrides:
  capabilities:
    disable:
      - tooling.browser
```

Nếu một Capability bắt buộc khác có hard dependency vào Capability bị tắt, resolution phải thất bại thay vì âm thầm tạo ra một môi trường không hợp lệ.

---

# 76. Ngữ nghĩa của việc tắt

Khi tắt một Capability, hệ thống nên theo dõi:

```text
what requested it
what disabled it
whether dependencies still require it
```

Điều này cho phép explainability.

Ví dụ:

```text
tooling.browser

required by:
frontend/testing

disabled by:
project override

result:
conflict — still required by engineering.testing.e2e
```

---

# 77. Loại bỏ trùng lặp Capability

Nếu nhiều Preset cùng yêu cầu một Capability:

```text
engineering/core
→ engineering.testing.tdd

frontend/testing
→ engineering.testing.tdd
```

Capability mong muốn chỉ nên xuất hiện một lần.

Provenance của requirement nên giữ lại cả hai nguồn.

Về mặt khái niệm:

```text
engineering.testing.tdd

required by:
- engineering/core
- frontend/testing
```

---

# 78. Tổng hợp Requirement

Các capability requirement nên được tổng hợp trước khi lựa chọn implementation.

Nên dùng:

```text
Collect all requirements
        ↓
Deduplicate capability IDs
        ↓
Build dependency graph
        ↓
Resolve implementations
```

Tránh resolve từng Preset một cách độc lập.

Điều đó có thể kích hoạt nhiều implementation cạnh tranh nhau của cùng một Capability ngữ nghĩa.

---

# 79. Capability Graph

Các Capability tạo thành một đồ thị dependency ngữ nghĩa.

Ví dụ:

```text
engineering.testing.e2e
        │
        ├── tooling.browser
        │
        └── engineering.testing.integration
```

Đồ thị này cho phép:

```text
dependency validation
cycle detection
resolution ordering
explainability
impact analysis
```

---

# 80. Capability Graph và Package Graph

Đây là các đồ thị riêng biệt.

Capability graph:

```text
semantic dependencies
```

Package graph:

```text
installation dependencies
```

Ví dụ:

```text
Capability A
→ Capability B
```

có thể resolve thành:

```text
Package X
Package Y
```

trong khi Package X có thể phụ thuộc độc lập vào Package Z.

Resolver không được nhập nhằng giữa các lớp này.

---

# 81. Capability Graph và Preset Graph

Preset graph mô tả composition:

```text
Preset A
→ Preset B
```

Capability graph mô tả dependency ngữ nghĩa:

```text
Capability A
→ Capability B
```

Cả hai phải luôn hợp lệ một cách độc lập và không có chu trình khi áp dụng được.

---

# 82. Phân tích tác động Capability

Khi một implementation thay đổi, hệ thống nên có khả năng xác định các capability bị ảnh hưởng.

Ví dụ:

```text
Publisher update
    ↓
Component changed
    ↓
Mapped Capability
engineering.testing.tdd
    ↓
Affected Presets
engineering/core
frontend/testing
    ↓
Affected Profiles
frontend-engineer
backend-engineer
```

Điều này hỗ trợ việc review update.

---

# 83. Tham chiếu ngược

Về lâu dài, catalog nên cho phép điều hướng:

```text
Capability
→ Implementations
```

và:

```text
Capability
→ Presets
→ Profiles
```

Điều này cải thiện:

```text
search
documentation
impact analysis
debugging
```

Các index được sinh ra có thể hỗ trợ các quan hệ ngược này.

---

# 84. Tìm kiếm Capability

Tìm kiếm nên ưu tiên định danh Capability hơn định danh implementation.

Ví dụ:

```bash
ap search tdd
```

Đầu ra mong muốn:

```text
Capability
engineering.testing.tdd

Implementations
- Superpowers ...
- Matt Pocock ...
- ECC ...
```

thay vì hiển thị tên repository thô trước tiên.

---

# 85. Discovery Capability

Người dùng nên có thể tìm thấy capability theo:

```text
ID
name
description
alias
tag
Preset
Profile
```

Định danh publisher nên là yếu tố thứ yếu.

---

# 86. Tài liệu Capability

Về lâu dài, mỗi Capability quan trọng nên được ghi lại tài liệu về:

```text
ID
name
description
cardinality
dependencies
typical use
implementations
status
related capabilities
```

Tài liệu này có thể được sinh ra từ metadata của catalog khi khả thi.

---

# 87. Họ Capability

Các Capability liên quan có thể tạo thành các họ (family) ngữ nghĩa.

Ví dụ:

```text
engineering.testing

├── engineering.testing.tdd
├── engineering.testing.unit
├── engineering.testing.integration
└── engineering.testing.e2e
```

Trong V1, họ được biểu diễn thông qua phân cấp namespace thay vì một thực thể first-class riêng biệt.

---

# 88. Biến thể Capability

Tránh tạo biến thể chỉ vì khác biệt giữa các publisher.

Không tốt:

```text
engineering.testing.tdd.superpowers
engineering.testing.tdd.ecc
```

Tốt:

```text
engineering.testing.tdd
```

với nhiều implementation.

---

# 89. Scope của Capability

Một Capability có thể liên quan ở các scope khác nhau:

```text
global
role
project
task
```

Tuy nhiên, scope nhìn chung nên thuộc về composition hoặc resolution context thay vì thuộc về định nghĩa Capability.

Ví dụ:

```text
engineering.testing.tdd
```

vẫn là cùng một Capability dù được yêu cầu bởi Profile hay Project.

---

# 90. Capability cấp Task

Các phiên bản tương lai có thể hỗ trợ Capability Requirement tạm thời ở cấp task.

Ví dụ:

```text
Current task:
security audit

temporarily require:
security.review
security.threat-modeling
```

Điều này nên tái sử dụng cùng Capability model thay vì tạo ra một task plugin model riêng biệt.

Composition cấp task không bắt buộc cho V1.

---

# 91. Tương tác giữa Capability và Policy

Policy có thể đánh giá metadata của implementation.

Ví dụ:

```text
Capability:
security.review

Candidate A:
trust: community

Candidate B:
trust: curated

Policy:
deny community
```

Kết quả:

```text
A → rejected
B → eligible
```

Policy không làm thay đổi ý nghĩa của Capability.

---

# 92. Trust của Capability

Bản thân Capability nhìn chung không nên có phân loại trust.

Trust thuộc về:

```text
Publisher
Package
Component
Implementation
```

Ví dụ:

```text
engineering.testing.tdd
```

không phải là trusted cũng không phải untrusted.

Các implementation của nó có thể có các mức trust khác nhau.

---

# 93. Phân loại bảo mật của Capability

Một số capability ngữ nghĩa có thể chỉ ra ý nghĩa về mặt bảo mật.

Ví dụ:

```text
security.review
```

Nhưng rủi ro thực thi vẫn nên được đánh giá ở cấp Component.

Một instructional skill vô hại và một executable hook có thể cùng đóng góp vào một Capability nhưng có hàm ý bảo mật rất khác nhau.

---

# 94. Capability Resolution và Lockfile

Project Lockfile nên ghi lại quan hệ:

```text
Capability
→ selected implementation
→ Component
→ Package
→ Publisher
→ immutable version
```

Ví dụ:

```text
engineering.testing.tdd
→ superpowers/...#skill:test-driven-development
→ package superpowers
→ commit abc123
```

Điều này bảo toàn cả intent ngữ nghĩa lẫn khả năng tái tạo cụ thể.

---

# 95. Lockfile nên bảo toàn ngữ cảnh Suppression

Khi khả thi, lockfile hoặc resolution metadata có thể lưu giữ đủ thông tin để giải thích:

```text
selected candidate
suppressed candidates
selection reason
```

Không nhất thiết mọi thông tin về các candidate bị từ chối đều phải được lưu trữ vĩnh viễn.

Ranh giới chính xác thuộc về `lockfile-spec.md`.

---

# 96. Capability Resolution và Update

Sync thông thường nên bảo toàn các implementation đã được lock khi chúng còn hợp lệ.

Các thao tác update có thể đánh giá lại:

```text
new versions
new candidates
changed priority
removed implementations
changed policy compatibility
```

Sự tách biệt này tránh việc âm thầm chuyển đổi implementation.

---

# 97. Migration Capability

Khi một Capability bị thay thế:

```text
old.capability
→ deprecated

new.capability
→ preferred
```

về lâu dài, công cụ migration nên có khả năng xác định các thành phần bị ảnh hưởng:

```text
Presets
Profiles
Projects
Lockfiles
```

---

# 98. Quy tắc validation Capability

Tối thiểu, validation của catalog nên kiểm tra:

```text
Capability ID is unique

Capability ID follows naming rules

cardinality is valid

implementation references exist

dependencies reference valid capabilities

dependency graph is acyclic

replacement capability exists when deprecated

aliases do not collide

implementation priorities are valid
```

---

# 99. Quy tắc validation Implementation

Với mỗi Capability Implementation:

```text
Component exists

Component belongs to a valid Package

Package belongs to a valid Publisher

target metadata is valid

priority is valid

status is valid

security metadata is structurally valid
```

---

# 100. Quy tắc review ngữ nghĩa

Một số validation không thể tự động hóa hoàn toàn.

Cần review thủ công bởi con người đối với:

```text
whether two implementations are semantically equivalent

whether a capability is too broad

whether a capability is too narrow

whether cardinality should be one or many

whether a mapping exaggerates what a Component provides
```

Do đó, capability catalog được curate, không hoàn toàn được sinh tự động.

---

# 101. Checklist thêm Capability

Trước khi thêm một Capability mới, hãy hỏi:

```text
1. What user intent does it represent?

2. Can the user reasonably request it independently?

3. Is there already a Capability with equivalent meaning?

4. Is this semantic or publisher-specific?

5. Is this semantic or runtime-specific?

6. What should its cardinality be?

7. Does it depend on another Capability?

8. Which Components currently implement it?

9. Is the name likely to remain stable?

10. Would this be better represented as a Preset?
```

---

# 102. Quyết định giữa Capability và Preset

Dùng Capability khi mô tả:

```text
one semantic ability
```

Dùng Preset khi mô tả:

```text
a reusable combination of abilities
```

Ví dụ:

```text
engineering.testing.tdd
→ Capability
```

Ví dụ:

```text
engineering/testing
→ Preset
```

có thể chứa:

```text
engineering.testing.tdd
engineering.testing.unit
engineering.testing.integration
engineering.testing.e2e
```

---

# 103. Quyết định giữa Capability và Component

Hỏi:

> Điều này đang mô tả hệ thống nên có khả năng làm gì, hay mô tả cách nó hiện đang làm?

Nếu là:

```text
what
```

thì dùng Capability.

Nếu là:

```text
how
```

thì dùng Component.

Ví dụ:

```text
engineering.debugging
→ Capability

systematic-debugging skill
→ Component
```

---

# 104. Quyết định giữa Capability và Profile

Capability:

```text
what ability is needed?
```

Profile:

```text
what baseline abilities does this role need?
```

Ví dụ:

```text
product.discovery
→ Capability

product-manager
→ Profile
```

---

# 105. Quyết định giữa Capability và Policy

Capability:

```text
what should exist?
```

Policy:

```text
what is allowed to satisfy it?
```

Các khái niệm này phải luôn độc lập với nhau.

---

# 106. Quyết định giữa Capability và Target

Capability:

```text
what is needed?
```

Target:

```text
where will it run?
```

Ví dụ:

```text
engineering.testing.tdd
```

có thể cần có trên:

```text
Claude Code
Codex
Gemini
```

với các implementation khác nhau.

---

# 107. Anti-Pattern — Capability gắn chặt với Publisher

Tránh:

```text
superpowers.planning
```

Lý do:

```text
semantic intent becomes coupled to implementation
```

Nên dùng:

```text
workflow.planning
```

---

# 108. Anti-Pattern — Capability gắn chặt với Runtime

Tránh:

```text
claude.frontend-design
```

Nên dùng:

```text
frontend.design
```

Hỗ trợ target thuộc về implementation.

---

# 109. Anti-Pattern — Dùng Preset làm Capability

Tránh:

```text
fullstack-engineering
```

như một Capability khổng lồ nếu thực chất nó đại diện cho:

```text
planning
testing
debugging
frontend
backend
database
```

Điều đó thuộc về một Preset hoặc Profile.

---

# 110. Anti-Pattern — Coi Publisher Package là Capability

Tránh giả định:

```text
Package Superpowers
=
Capability Superpowers
```

Một Package có thể implement nhiều Capability.

Capability nên luôn mang tính ngữ nghĩa.

---

# 111. Anti-Pattern — Mỗi Skill đều có một Capability

Không phải mọi upstream Component đều xứng đáng có một Capability chuẩn.

Một publisher có thể cung cấp:

```text
highly specific helper skill
internal workflow step
implementation-specific command
```

Component đó có thể:

```text
support another Capability
```

mà không cần một Capability ID ngữ nghĩa mới.

---

# 112. Anti-Pattern — Bùng nổ Capability

Tránh tạo ra hàng trăm đơn vị ngữ nghĩa cực nhỏ mà người dùng sẽ không bao giờ yêu cầu một cách độc lập.

Độ chi tiết của Capability nên luôn hữu ích cho:

```text
composition
resolution
policy
explanation
```

---

# 113. Anti-Pattern — Capability nguyên khối

Tránh làm cho Capability quá rộng đến mức sự chồng lấn giữa các publisher trở nên vô nghĩa.

Ví dụ:

```text
software-engineering
```

là quá rộng để resolution có ích.

---

# 114. Anti-Pattern — Coi Priority là điểm chất lượng phổ quát

Priority của implementation không nên được hiểu là:

```text
objective universal quality ranking
```

Nó có nghĩa là:

```text
default resolver preference in this catalog context
```

Việc lựa chọn vẫn phụ thuộc vào:

```text
target
policy
project
version
compatibility
```

---

# 115. Anti-Pattern — Âm thầm thay thế Capability

Nếu một update thay đổi:

```text
engineering.testing.tdd
```

từ:

```text
Publisher A
```

sang:

```text
Publisher B
```

thì thay đổi đó nên được hiển thị rõ ràng.

Tính độc lập với publisher không biện minh cho việc âm thầm thay đổi implementation.

---

# 116. Ví dụ Capability workflow ban đầu

Các capability workflow ban đầu có thể có:

```text
workflow.brainstorming
workflow.planning
workflow.execution
workflow.verification
workflow.code-review
workflow.git-worktree
workflow.branch-completion
```

Catalog ban đầu chính xác nên luôn được curate.

---

# 117. Ví dụ Capability engineering ban đầu

Các capability engineering ban đầu có thể có:

```text
engineering.requirements
engineering.domain-modeling
engineering.architecture
engineering.codebase-design

engineering.testing.tdd
engineering.testing.unit
engineering.testing.integration
engineering.testing.e2e

engineering.debugging
engineering.review
engineering.refactoring
engineering.verification
engineering.build-repair
```

---

# 118. Ví dụ Capability frontend ban đầu

```text
frontend.design
frontend.react
frontend.nextjs
frontend.accessibility
frontend.performance
frontend.testing
```

---

# 119. Ví dụ Capability backend ban đầu

```text
backend.api-design
backend.contract-design
backend.service-design
backend.integration
```

---

# 120. Ví dụ Capability security ban đầu

```text
security.review
security.threat-modeling
security.static-analysis
security.dependency-review
security.secrets-review
```

Sau khi có kinh nghiệm thực tế với catalog, một số trong số này về sau có thể được biểu diễn tốt hơn dưới dạng preset hoặc tooling đặc thù cho component.

Taxonomy nên luôn cởi mở với việc tinh chỉnh trước khi có V1 ổn định.

---

# 121. Ví dụ Capability knowledge ban đầu

```text
knowledge.research
knowledge.writing
knowledge.synthesis
knowledge.management
knowledge.note-maintenance
```

---

# 122. Ví dụ Capability product ban đầu

```text
product.discovery
product.requirements
product.prioritization
product.specification
product.research
product.analysis
```

---

# 123. Ví dụ Capability DevOps ban đầu

```text
devops.containerization
devops.kubernetes
devops.ci
devops.deployment
devops.observability
```

---

# 124. Ví dụ Capability GIS ban đầu

```text
gis.spatial-analysis
gis.data-processing
gis.map-design
gis.routing
gis.geocoding
```

Những ví dụ này cho thấy capability model có thể mở rộng ra ngoài phát triển phần mềm thông thường.

---

# 125. Sự phát triển của Capability Model

Taxonomy của capability nên phát triển một cách thận trọng.

Quy trình khuyến nghị:

```text
identify repeated user intent
        ↓
review existing taxonomy
        ↓
propose capability
        ↓
review semantics
        ↓
assign namespace
        ↓
assign cardinality
        ↓
map implementations
        ↓
validate in real profiles/projects
        ↓
stabilize
```

---

# 126. Taxonomy thử nghiệm

Trước khi có V1 ổn định, các Capability mới có thể bắt đầu ở trạng thái:

```text
experimental
```

Điều này cho phép tinh chỉnh mà không phải cam kết quá sớm về định danh dài hạn.

Các Capability được tái sử dụng thường xuyên và đã được xác thực về ngữ nghĩa về sau có thể trở thành:

```text
stable
```

---

# 127. Quản trị Capability

Các thay đổi đối với stable capability nên được review với sự chú ý đến:

```text
semantic compatibility
affected presets
affected profiles
affected implementations
existing project lockfiles
migration requirements
```

Các thay đổi quan trọng nên có một ADR khi chúng làm thay đổi các nguyên tắc mô hình hóa cốt lõi.

---

# 128. Nguồn sự thật của Capability

Các định nghĩa Capability chuẩn nên nằm trong:

```text
catalog/capabilities/
```

Ví dụ:

```text
catalog/
└── capabilities/
    ├── workflow/
    ├── engineering/
    ├── frontend/
    ├── backend/
    ├── security/
    ├── product/
    ├── knowledge/
    ├── devops/
    └── gis/
```

Các file này mang tính thẩm quyền (authoritative).

Các index được sinh ra thì không.

---

# 129. Index Capability được sinh ra

Dữ liệu dẫn xuất có thể bao gồm:

```text
search index
reverse preset index
reverse profile index
implementation index
target-support matrix
```

Chúng nên được sinh ra từ dữ liệu catalog chuẩn.

---

# 130. Các Invariant của Capability Model

Capability model phải bảo toàn các invariant sau:

```text
1. A Capability describes semantic intent.

2. Capability IDs are publisher-independent.

3. Capability IDs are target-independent.

4. Components implement Capabilities.

5. Presets compose Capabilities.

6. Profiles primarily compose Presets.

7. Multiple publishers may implement one Capability.

8. Cardinality belongs to the Capability.

9. Policy determines eligibility before priority determines preference.

10. Required Capabilities must resolve or fail explicitly.

11. Capability dependencies are semantic.

12. Component dependencies are implementation-specific.

13. Duplicate Capability Requirements are aggregated.

14. Capability graphs must remain valid and acyclic.

15. Publisher changes should not require consumer intent changes.

16. Implementation changes must remain explainable.

17. Lockfiles preserve the mapping from semantic intent to concrete implementation.

18. Capability taxonomy is curated rather than automatically inferred.

19. Generated indexes never become the source of truth.

20. Deterministic resolution must not require an LLM.
```

---

# 131. Ví dụ Resolution — TDD

```text
Project
│
├── Profile
│   └── frontend-engineer
│
└── Presets
    ├── engineering/core
    └── stacks/nextjs

          ↓

Capability Requirements

engineering.testing.tdd
engineering.debugging
frontend.nextjs
...

          ↓

engineering.testing.tdd

Candidates

├── Superpowers
│   priority: 100
│   policy: allowed
│   target: supported
│
├── Matt Pocock
│   priority: 80
│   policy: allowed
│   target: supported
│
└── ECC
    priority: 70
    policy: allowed
    target: supported

          ↓

cardinality: one

          ↓

Selected

Superpowers
```

---

# 132. Ví dụ Resolution — Policy thay đổi bên được chọn

```text
engineering.testing.tdd

Candidates

Superpowers
priority: 100
trust: community

Matt Pocock
priority: 80
trust: curated
```

Policy:

```text
allow:
- first-party
- official
- curated
```

Resolution:

```text
Superpowers
→ rejected

Matt Pocock
→ selected
```

Điều này chứng minh:

```text
eligibility before preference
```

---

# 133. Ví dụ Resolution — Cardinality Many

```text
knowledge.research

cardinality: many
```

Các candidate:

```text
repository research
web research
documentation research
```

Nếu tất cả đều:

```text
eligible
compatible
non-conflicting
```

resolver có thể chọn cả ba.

---

# 134. Ví dụ Resolution — Hard Dependency

```text
engineering.testing.e2e

requires:

tooling.browser
```

Resolution:

```text
engineering.testing.e2e
        ↓
tooling.browser
        ↓
browser implementation
```

Nếu `tooling.browser` không có sẵn:

```text
engineering.testing.e2e
→ unresolved
```

và môi trường sẽ thất bại nếu E2E là bắt buộc.

---

# 135. Ví dụ Resolution — Project Override

Mặc định:

```text
engineering.testing.tdd
→ Superpowers
```

Project override:

```text
engineering.testing.tdd
→ Matt Pocock
```

Resolution:

```text
Matt Pocock
→ selected

Superpowers
→ suppressed
```

với điều kiện Matt Pocock vẫn:

```text
policy allowed
target compatible
available
```

---

# 136. Capability Model trong toàn bộ hệ thống

```text
Publishers
    ↓
Packages
    ↓
Components
    ↓
Implementation Mapping
    ↓
Capabilities
    ↓
Presets
    ↓
Profiles + Project
    ↓
Capability Requirements
    ↓
Policy
    ↓
Resolver
    ↓
Selected Implementations
    ↓
Packages
    ↓
Lockfile
    ↓
Target Adapter
```

Capability là điểm xoay ngữ nghĩa giữa cấu trúc của hệ sinh thái bên ngoài và intent của consumer.

---

# 137. Tiêu chí thành công của Capability Model

Model thành công khi:

```text
users can request functionality without knowing publisher names

profiles remain stable when publishers change

overlapping implementations can be resolved predictably

capability conflicts are explicit

publisher updates can be analyzed semantically

multiple runtimes can use the same capability intent

catalog maintainers can introduce new publishers without redesigning profiles

every selected implementation can be explained
```

---

# 138. Capability Model trong một câu

> **Một Capability là một biểu đạt ổn định, độc lập với publisher, về intent của người dùng; nó có thể có nhiều implementation cụ thể, cardinality và dependency tường minh, các quy tắc resolution deterministic, và khả năng truy vết đầy đủ từ requirement ngữ nghĩa đến runtime component đã được lock.**