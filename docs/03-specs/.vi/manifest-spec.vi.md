# Đặc tả Manifest

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.

## Tổng quan

Tài liệu này định nghĩa định dạng manifest của consumer project cho `agent-plugins`.

Project manifest mặc định là:

```text
agent-plugins.yaml
```

Manifest mô tả **trạng thái ngữ nghĩa mong muốn (desired semantic state)** của một môi trường agent.

Nó trả lời câu hỏi:

> **Project này nên có những capability nào, theo policy nào, cho target runtime nào?**

Manifest nên luôn:

- mang tính khai báo (declarative),
- ngắn gọn,
- dễ đọc với con người,
- được quản lý phiên bản (version-controlled),
- mặc định độc lập với publisher,
- mang tính tất định (deterministic),
- có thể được máy kiểm tra (machine-validatable).

Manifest mô tả ý định (intent).

Thông thường nó không chứa:

- phiên bản package đã được resolve,
- commit upstream bất biến,
- file runtime được sinh ra,
- danh mục component được phát hiện,
- metadata đầy đủ của publisher.

Những thứ đó thuộc về Catalog, Lockfile hoặc trạng thái Target.

---

# 1. Nguyên tắc cốt lõi

Manifest nên mô tả:

```text
role
+
project needs
+
constraints
+
explicit exceptions
```

thay vì:

```text
raw plugin installation list
```

Nên dùng:

```yaml
role: frontend-engineer

presets:
  - stacks/nextjs
  - engineering/security
```

Tránh dùng:

```yaml
plugins:
  - superpowers
  - ecc
  - mattpocock
  - frontend-design
```

trừ khi một escape hatch cấp thấp trong tương lai yêu cầu rõ ràng điều đó.

---

# 2. Tên file mặc định

Tên file chuẩn (canonical) là:

```text
agent-plugins.yaml
```

CLI có thể tùy chọn hỗ trợ:

```text
agent-plugins.yml
```

nhưng tài liệu và các ví dụ được sinh ra nên nhất quán sử dụng:

```text
agent-plugins.yaml
```

---

# 3. Vị trí của Manifest

Vị trí mặc định là thư mục gốc của consumer repository.

Ví dụ:

```text
my-project/
├── src/
├── package.json
├── agent-plugins.yaml
└── agent-plugins.lock
```

CLI có thể hỗ trợ đường dẫn manifest tường minh trong tương lai.

---

# 4. Cấu trúc bao ngoài của Manifest

Cấu trúc khuyến nghị:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: mealops

spec:
  role: frontend-engineer

  presets:
    - stacks/nextjs
    - engineering/security

  policy: default

  targets:
    - claude-code
```

Các field cấp cao nhất chuẩn:

```text
apiVersion
kind
metadata
spec
```

---

# 5. `apiVersion`

Bắt buộc:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
```

API version kiểm soát:

```text
manifest structure
field semantics
migration behavior
validation rules
```

Nó không dùng để định danh project.

---

# 6. `kind`

Bắt buộc:

```yaml
kind: Project
```

Project manifest V1 phải sử dụng:

```text
Project
```

Các kind không xác định phải làm validation thất bại.

---

# 7. `metadata`

`metadata` chứa thông tin định danh và mô tả không liên quan đến Resolution.

Cấu trúc khuyến nghị:

```yaml
metadata:
  name: mealops
  description: Internal team meal operations application.
```

Các field khuyến nghị:

```text
name
description
```

`name` có thể là tùy chọn nếu tên repository đã đủ để định danh.

---

# 8. Metadata không được ảnh hưởng đến Resolution

Các field như:

```text
name
description
```

không được làm thay đổi Resolution ngữ nghĩa.

Việc thay đổi:

```yaml
metadata:
  description: ...
```

không nên làm thay đổi các implementation được chọn.

---

# 9. `spec`

`spec` chứa cấu hình trạng thái mong muốn mang tính ngữ nghĩa.

Các field cốt lõi của V1:

```text
role
presets
capabilities
policy
targets
overrides
```

Về mặt khái niệm:

```yaml
spec:
  role: frontend-engineer
  presets: []
  capabilities: {}
  policy: default
  targets:
    - claude-code
  overrides: {}
```

---

# 10. Manifest tối thiểu

Một project tối thiểu có thể dùng:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  role: frontend-engineer

  targets:
    - claude-code
```

Nếu bỏ qua `policy`, một giá trị mặc định đã được tài liệu hóa có thể được áp dụng.

---

# 11. Manifest khuyến nghị

Thông thường:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: mealops

spec:
  role: frontend-engineer

  presets:
    - stacks/nextjs
    - stacks/cloudflare
    - engineering/security

  policy: default

  targets:
    - claude-code
```

---

# 12. Role

`spec.role` chọn một Role có thể tái sử dụng.

Ví dụ:

```yaml
role: frontend-engineer
```

Role thiết lập ý định nền tảng cho người đang làm việc.

---

# 13. Số lượng Role

V1 nên hỗ trợ:

```text
zero or one Role
```

Không phải:

```text
multiple Roles
```

theo mặc định.

Điều này tránh các tổ hợp mơ hồ như:

```text
frontend-engineer
+
product-manager
+
researcher
```

Với nhu cầu hỗn hợp, hãy dùng thêm Preset.

---

# 14. Role tùy chọn

Một project có thể bỏ qua Role và kết hợp hoàn toàn từ các Preset hoặc các Capability tường minh.

Ví dụ:

```yaml
spec:
  presets:
    - knowledge/research
    - knowledge/writing

  targets:
    - claude-code
```

Phải tồn tại ít nhất một nguồn ý định Capability.

---

# 15. Role phải tồn tại

Tham chiếu Role phải resolve được tới distribution đang hoạt động.

Không hợp lệ:

```yaml
role: nonexistent-role
```

Diagnostic:

```text
UNKNOWN_ROLE
```

---

# 16. Presets

`spec.presets` bổ sung các composition có thể tái sử dụng dành riêng cho Project.

Ví dụ:

```yaml
presets:
  - stacks/nextjs
  - engineering/security
```

Preset ID sử dụng ID chuẩn phân tách bằng dấu gạch chéo.

---

# 17. Thứ tự Preset

Thứ tự trong danh sách Preset không được ảnh hưởng đến kết quả ngữ nghĩa.

Các cấu hình sau nên được resolve tương đương:

```yaml
presets:
  - engineering/security
  - stacks/nextjs
```

và:

```yaml
presets:
  - stacks/nextjs
  - engineering/security
```

Resolver tổng hợp ý định Capability trước khi lựa chọn.

---

# 18. Preset trùng lặp

Các mục Preset trùng lặp nên hoặc:

```text
normalize to one reference
```

hoặc làm validation thất bại.

Hành vi khuyến nghị cho V1:

```text
deduplicate with warning
```

hoặc từ chối các mục trùng lặp trong quá trình schema/semantic validation để manifest gọn gàng hơn.

Không mục trùng lặp nào được tạo ra hành vi ngữ nghĩa trùng lặp.

---

# 19. Project Preset so với Role Preset

Về mặt khái niệm, các Preset hiệu lực là:

```text
Role Presets
+
Project Presets
```

Chúng được mở rộng cùng nhau trước khi thực hiện Capability Resolution.

Project Preset không thay thế Role Preset trừ khi điều đó được mô hình hóa tường minh trong tương lai.

---

# 20. Capability tường minh

Một Project có thể yêu cầu trực tiếp từng Capability riêng lẻ.

Cấu trúc khuyến nghị:

```yaml
capabilities:
  enable:
    - security.review
    - knowledge.research
```

Điều này cung cấp một escape hatch chính xác mà không cần tạo Preset mới.

---

# 21. Vô hiệu hóa Capability

Một Project có thể vô hiệu hóa ý định Capability được kế thừa.

Ví dụ:

```yaml
capabilities:
  disable:
    - tooling.browser
```

hoặc đặt dưới Overrides tùy theo schema cuối cùng.

Để tránh trùng lặp khái niệm, V1 nên chọn một vị trí chuẩn duy nhất.

Thiết kế chuẩn khuyến nghị:

```yaml
overrides:
  capabilities:
    enable:
      - security.review

    disable:
      - tooling.browser
```

Do đó, `spec.capabilities` ở cấp cao nhất nên được lược bỏ trong V1 trừ khi ưu tiên một mô hình manifest đơn giản hơn.

---

# 22. Vị trí Override chuẩn của V1

Khuyến nghị:

```yaml
spec:
  overrides:
    capabilities:
      enable: []
      disable: []

    implementations: {}
```

Cách này giữ tất cả các ngoại lệ tường minh ở cùng một chỗ.

---

# 23. Vì sao Overrides được tách riêng

Composition thông thường:

```text
Role
+
Presets
```

biểu diễn ý định có thể tái sử dụng.

Overrides biểu diễn:

```text
project-specific exception
```

Việc tách riêng chúng giúp cải thiện khả năng giải thích (explainability).

Ví dụ:

```text
engineering.testing.tdd

required by:
frontend-engineer

implementation changed by:
project override
```

---

# 24. Policy

`spec.policy` chọn một Policy có thể tái sử dụng.

Ví dụ:

```yaml
policy: strict
```

Policy định nghĩa các ràng buộc về tính đủ điều kiện (eligibility) và quản trị (governance).

---

# 25. Policy mặc định

Nếu bị bỏ qua, hệ thống có thể dùng:

```text
default
```

Hành vi khuyến nghị:

```yaml
policy: default
```

tương đương về mặt ngữ nghĩa với việc bỏ qua nếu giá trị mặc định tồn tại.

Giá trị mặc định được áp dụng phải luôn hiển thị trong:

```text
ap explain
ap doctor
lockfile metadata
```

Tránh các hành vi policy ẩn.

---

# 26. Policy không xác định

Không hợp lệ:

```yaml
policy: corporate-super-secure
```

khi không tồn tại Policy như vậy.

Resolution phải thất bại với:

```text
UNKNOWN_POLICY
```

---

# 27. Target

`spec.targets` khai báo các runtime target.

Ví dụ:

```yaml
targets:
  - claude-code
```

V1 yêu cầu hỗ trợ Claude Code.

---

# 28. Vì sao Targets là một mảng

Mặc dù V1 có thể chỉ hỗ trợ một target, hãy dùng:

```yaml
targets:
  - claude-code
```

thay vì:

```yaml
target: claude-code
```

để để ngỏ một hướng đi gọn gàng cho việc hỗ trợ nhiều runtime trong tương lai.

---

# 29. Số lượng Target trong V1

V1 nên kiểm tra:

```text
exactly one target
```

trừ khi hỗ trợ multi-target đã được triển khai.

Do đó, cấu hình sau đã sẵn sàng về mặt cấu trúc cho tương lai:

```yaml
targets:
  - claude-code
```

trong khi cấu hình sau có thể vẫn không hợp lệ trong V1:

```yaml
targets:
  - claude-code
  - codex
```

với một diagnostic rõ ràng như:

```text
MULTI_TARGET_NOT_SUPPORTED
```

---

# 30. Target không xác định

Một target không xác định phải làm validation thất bại.

Ví dụ:

```yaml
targets:
  - unknown-runtime
```

Diagnostic:

```text
UNKNOWN_TARGET
```

---

# 31. Overrides

`spec.overrides` chứa các sai lệch tường minh, dành riêng cho Project, so với composition và selection thông thường.

Cấu trúc khuyến nghị cho V1:

```yaml
overrides:
  capabilities:
    enable: []
    disable: []

  implementations: {}
```

Overrides nên giữ phạm vi hẹp và có kiểu (typed).

---

# 32. Override bật Capability

Ví dụ:

```yaml
overrides:
  capabilities:
    enable:
      - security.review
```

Điều này bổ sung một Capability Requirement.

---

# 33. Override tắt Capability

Ví dụ:

```yaml
overrides:
  capabilities:
    disable:
      - tooling.browser
```

Điều này loại bỏ ý định được kế thừa.

Nếu một Capability bắt buộc khác phụ thuộc vào nó:

```text
resolution fails
```

thay vì âm thầm tạo ra một graph không hợp lệ.

---

# 34. Bật trùng lặp

Nếu một Capability đã được kế thừa từ Role hoặc Preset và đồng thời được bật tường minh:

```text
deduplicate semantic requirement
```

Resolver nên giữ lại nhiều nguồn yêu cầu để phục vụ việc giải thích.

---

# 35. Vừa bật vừa tắt cùng một Capability

Không hợp lệ:

```yaml
overrides:
  capabilities:
    enable:
      - security.review

    disable:
      - security.review
```

Diagnostic khuyến nghị:

```text
CONFLICTING_CAPABILITY_OVERRIDE
```

Không định nghĩa thứ tự ưu tiên ngầm giữa enable và disable.

---

# 36. Override implementation

Một Project có thể yêu cầu tường minh một implementation Component cụ thể.

Cấu trúc khuyến nghị:

```yaml
overrides:
  implementations:
    engineering.testing.tdd:
      component: mattpocock/skills#skill:tdd
```

Key là Capability ID chuẩn.

---

# 37. Ngữ nghĩa của override implementation

Một override implementation có nghĩa là:

> Với Capability này, hãy ưu tiên chính xác implementation này cho Project này.

Nó không có nghĩa là:

```text
bypass policy
bypass target support
ignore missing dependencies
```

Các ràng buộc cứng vẫn được áp dụng.

---

# 38. Override implementation không hợp lệ

Ví dụ:

```yaml
implementations:
  engineering.testing.tdd:
    component: unknown/package#skill:missing
```

phải thất bại.

Tương tự, nếu Component tồn tại nhưng không được ánh xạ là implementation của:

```text
engineering.testing.tdd
```

thì override nên thất bại, trừ khi trong tương lai tồn tại tường minh một chế độ unsafe/raw.

---

# 39. Override không ghi đè Catalog

Project override:

```text
TDD → Matt Pocock
```

chỉ ảnh hưởng đến Project hiện tại.

Nó không sửa đổi ánh xạ hoặc độ ưu tiên mặc định của Catalog.

---

# 40. Override theo Publisher

Việc chọn Publisher nên diễn ra gián tiếp thông qua override implementation Component.

Nên dùng:

```yaml
implementations:
  engineering.testing.tdd:
    component: superpowers/superpowers#skill:test-driven-development
```

Tránh dùng một cấu trúc riêng như:

```yaml
publishers:
  tdd: superpowers
```

vì định danh Component chính xác hơn.

---

# 41. Không có override Package tùy ý trong V1

V1 không nên hỗ trợ các field tùy ý như:

```yaml
packages:
  force:
    - some-package
```

như một workflow thông thường.

Điều này bỏ qua mô hình Capability.

Nếu các escape hatch cấp thấp được giới thiệu sau này, chúng nên được tách biệt rõ ràng khỏi semantic composition.

---

# 42. Không dùng danh sách plugin thô

Tránh dùng:

```yaml
plugins:
  - superpowers
  - ecc
```

làm mô hình manifest chính.

Việc chọn Publisher và Package nên là output của Resolver.

---

# 43. Không dùng danh sách Publisher làm trạng thái mong muốn

Tránh dùng:

```yaml
publishers:
  - superpowers
  - ecc
```

trừ khi cấu hình nguồn khả dụng trong một manifest nâng cao ở tương lai.

Consumer thông thường không cần biết tên Publisher.

---

# 44. Thứ tự ưu tiên ngữ nghĩa của Manifest

Ý định Capability được xây dựng từ:

```text
Role
   +
Project Presets
   +
Capability Enable Overrides
   -
Capability Disable Overrides
```

Về mặt khái niệm:

```text
Base Intent
   ↓
Overrides
   ↓
Effective Capability Requirements
```

---

# 45. Thứ tự ưu tiên khi chọn Implementation

Manifest đóng góp một preference quan trọng:

```text
Explicit Implementation Override
```

Thứ tự ưu tiên đầy đủ của Resolver được định nghĩa trong `resolution-spec.md`.

Tóm tắt:

```text
Hard Constraints
>
Project Implementation Override
>
Existing Valid Lock
>
Policy Preference
>
Target Preference
>
Catalog Priority
```

---

# 46. Manifest không sở hữu preference về Lock

Manifest không cần các field như:

```yaml
preserveLock: true
```

cho hành vi V1 thông thường.

Tính ổn định của lock là hành vi của Resolver.

Nếu sau này ngữ nghĩa cập nhật cần kiểm soát tường minh, chúng nên được giới thiệu một cách thận trọng.

---

# 47. Manifest không sở hữu phiên bản

Project manifest thông thường không nên chứa:

```yaml
versions:
  superpowers: 6.4.0
```

Phiên bản Package thuộc về Resolution và Lockfile.

Người dùng thể hiện ý định ngữ nghĩa.

---

# 48. Manifest không sở hữu tính toàn vẹn (integrity)

Không đặt:

```yaml
sha256:
commit:
checksum:
```

cho các Package đã được resolve thông thường trong Project Manifest.

Chúng thuộc về:

```text
agent-plugins.lock
```

---

# 49. Manifest không sở hữu đường dẫn runtime

Tránh các field như:

```yaml
claude:
  installDir: .claude/plugins
```

trong semantic manifest, trừ khi một Target thực sự cần hành vi đường dẫn có thể cấu hình.

Cấu hình dành riêng cho runtime nên ưu tiên thuộc về cấu hình target hoặc thiết lập của adapter.

---

# 50. Cấu hình dành riêng cho Target

Một số cấu hình dành riêng cho Target cuối cùng có thể trở nên cần thiết.

Phần mở rộng khuyến nghị:

```yaml
targets:
  - id: claude-code
    config:
      ...
```

Tuy nhiên, V1 nên giữ:

```yaml
targets:
  - claude-code
```

nếu không có tùy chọn target-specific thực sự cần thiết.

Không giới thiệu cấu trúc cấu hình trước khi các use case yêu cầu nó.

---

# 51. Các tính năng Manifest tùy chọn

Các field tiềm năng trong tương lai:

```text
extends
imports
variables
target configuration
update policy
task-level capabilities
organization policy references
```

Chúng không bắt buộc trong V1.

---

# 52. Không kế thừa Manifest nhiều tầng

Tránh dùng:

```yaml
extends:
  - ../../base.yaml
  - ../team.yaml
  - personal.yaml
```

trong V1.

Kế thừa cấu hình nhiều tầng tạo ra:

```text
hidden state
difficult precedence
poor explainability
```

Việc tái sử dụng nên diễn ra thông qua:

```text
Roles
Presets
Policies
```

---

# 53. Không include tùy ý

Tránh một cơ chế chung chung:

```yaml
include:
  - anything.yaml
```

trong V1.

Điều này sẽ tạo ra một hệ thống composition thứ hai không được kiểm soát.

---

# 54. Comment trong Manifest

Comment YAML được cho phép.

Ví dụ:

```yaml
presets:
  # Project uses Cloudflare Workers.
  - stacks/cloudflare
```

Comment chỉ mang tính thông tin.

Chúng không được ảnh hưởng đến Resolution.

---

# 55. Mở rộng biến môi trường

V1 không nên thực hiện nội suy (interpolation) biến môi trường tùy ý trong các field ngữ nghĩa.

Tránh dùng:

```yaml
role: ${AGENT_ROLE}
```

vì trạng thái môi trường ẩn có thể khiến Resolution không thể tái lập (non-reproducible).

Nếu sau này có thêm interpolation, nó phải được khai báo tường minh và đưa vào Resolution Context.

---

# 56. Cấm code tùy ý

Manifest phải luôn mang tính khai báo.

Khái niệm không hợp lệ:

```yaml
resolve:
  run: ./choose-plugins.js
```

hoặc:

```yaml
policy:
  eval: |
    ...
```

Code tùy ý sẽ làm suy yếu tính tất định của Resolution và khả năng di chuyển (portability).

---

# 57. Field không xác định

Hành vi khuyến nghị cho V1:

```text
reject unknown fields
```

Ví dụ:

```yaml
spec:
  profle: frontend-engineer
```

không được âm thầm bỏ qua lỗi chính tả này.

Nó nên tạo ra:

```text
UNKNOWN_FIELD
```

hoặc lỗi schema validation.

---

# 58. Thứ tự key ổn định

Thứ tự khuyến nghị hướng tới con người:

```yaml
apiVersion:
kind:

metadata:

spec:
  role:
  presets:
  policy:
  targets:
  overrides:
```

Định dạng không ảnh hưởng đến ngữ nghĩa.

---

# 59. Các giai đoạn validation của Manifest

Validation nên diễn ra qua các bước:

```text
1. File parsing

2. Schema validation

3. ID syntax validation

4. Reference validation

5. Override validation

6. Semantic validation

7. Resolution validation
```

---

# 60. Lỗi phân tích YAML

YAML sai định dạng phải thất bại trước khi xử lý schema.

Diagnostic nên chỉ ra:

```text
file
line
column
```

khi có thể.

---

# 61. Schema validation

Schema kiểm tra:

```text
required fields
field types
allowed enums
unknown fields
array structure
```

---

# 62. Reference validation

Kiểm tra:

```text
Role exists

Preset exists

Policy exists

Target exists

Capability override exists

Implementation override Component exists
```

---

# 63. Semantic validation

Ví dụ:

```text
enable + disable same Capability

implementation override for non-implementation Component

duplicate Target

unsupported multi-target configuration

manifest with no source of Capability intent
```

---

# 64. Manifest không có ý định

Cấu hình sau thông thường nên là không hợp lệ:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  targets:
    - claude-code
```

vì không tồn tại Role, Preset hay ý định Capability nào.

Ngoại lệ có thể có:

```text
explicit empty environment
```

có thể được hỗ trợ sau này nếu hữu ích.

---

# 65. Project chỉ có Role

Hợp lệ:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  role: backend-engineer

  targets:
    - claude-code
```

Role cung cấp ý định Capability.

---

# 66. Project chỉ có Preset

Hợp lệ:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  presets:
    - knowledge/research
    - knowledge/writing

  targets:
    - claude-code
```

---

# 67. Project chỉ bật qua Override

Có thể hợp lệ:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  targets:
    - claude-code

  overrides:
    capabilities:
      enable:
        - knowledge.research
```

Điều này cho phép composition tùy chỉnh tối thiểu.

---

# 68. Project chỉ có Disable

Không hợp lệ nếu không có ý định Capability được kế thừa.

Ví dụ:

```yaml
spec:
  targets:
    - claude-code

  overrides:
    capabilities:
      disable:
        - tooling.browser
```

Không có gì có ý nghĩa để resolve.

---

# 69. Các ID tham chiếu trong Manifest

Role:

```text
frontend-engineer
```

Preset:

```text
stacks/nextjs
```

Policy:

```text
strict
```

Target:

```text
claude-code
```

Capability:

```text
engineering.testing.tdd
```

Component:

```text
superpowers/superpowers#skill:test-driven-development
```

Mỗi field sử dụng định danh domain chuẩn cho thực thể của nó.

---

# 70. Ví dụ Role

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: web-app

spec:
  role: frontend-engineer

  targets:
    - claude-code
```

---

# 71. Ví dụ Project frontend

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: mealops

spec:
  role: frontend-engineer

  presets:
    - stacks/nextjs
    - stacks/cloudflare
    - engineering/security

  policy: default

  targets:
    - claude-code
```

---

# 72. Ví dụ Project backend

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: api-service

spec:
  role: backend-engineer

  presets:
    - stacks/typescript
    - stacks/node
    - engineering/security

  policy: strict

  targets:
    - claude-code
```

---

# 73. Ví dụ Product Manager

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: product-workspace

spec:
  role: product-manager

  presets:
    - knowledge/research
    - knowledge/writing

  policy: default

  targets:
    - claude-code
```

---

# 74. Ví dụ Second Brain

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: personal-knowledge-system

spec:
  role: second-brain

  presets:
    - knowledge/research
    - knowledge/writing
    - knowledge/synthesis
    - tools/obsidian

  policy: personal

  targets:
    - claude-code
```

---

# 75. Ví dụ bật Capability

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  role: frontend-engineer

  targets:
    - claude-code

  overrides:
    capabilities:
      enable:
        - security.review
```

---

# 76. Ví dụ tắt Capability

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  role: frontend-engineer

  targets:
    - claude-code

  overrides:
    capabilities:
      disable:
        - tooling.browser
```

Nếu một Capability khác yêu cầu `tooling.browser`, Resolution sẽ thất bại.

---

# 77. Ví dụ override implementation

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  role: frontend-engineer

  targets:
    - claude-code

  overrides:
    implementations:
      engineering.testing.tdd:
        component: mattpocock/skills#skill:tdd
```

---

# 78. Ví dụ override kết hợp

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: custom-web-app

spec:
  role: frontend-engineer

  presets:
    - stacks/nextjs

  policy: strict

  targets:
    - claude-code

  overrides:
    capabilities:
      enable:
        - security.review

      disable:
        - tooling.browser

    implementations:
      engineering.testing.tdd:
        component: mattpocock/skills#skill:tdd
```

Cấu hình này vẫn có thể thất bại nếu một Capability bắt buộc phụ thuộc vào `tooling.browser`.

---

# 79. Chuẩn hóa Manifest

Manifest thô:

```text
YAML
```

nên được chuyển đổi qua:

```text
Parse
↓
Schema Validate
↓
Reference Validate
↓
Normalize Defaults
↓
Project Domain Object
```

Resolver tiêu thụ đối tượng Project đã được chuẩn hóa.

---

# 80. Project đã chuẩn hóa

Về mặt khái niệm:

```text
Project

role:
  frontend-engineer

presets:
  [stacks/nextjs]

policy:
  default

targets:
  [claude-code]

overrides:
  capabilities:
    enable: []
    disable: []

  implementations:
    {}
```

Các giá trị mặc định nên trở nên tường minh sau khi chuẩn hóa.

---

# 81. Giá trị mặc định

Các giá trị mặc định khuyến nghị cho V1:

```text
policy
→ default

presets
→ []

capability enable
→ []

capability disable
→ []

implementation overrides
→ {}
```

Targets không nên được đặt mặc định một cách âm thầm.

Yêu cầu:

```yaml
targets:
  - claude-code
```

để ý định về runtime luôn tường minh.

---

# 82. Vì sao Target nên tường minh

Một Target mặc định có thể gây ra hành vi bất ngờ khi hỗ trợ nhiều runtime xuất hiện.

Do đó:

```text
Role may default
Policy may default
Target should remain explicit
```

Được khuyến nghị.

---

# 83. Role mặc định

V1 không nên đặt mặc định một Role.

Hệ thống không thể an toàn giả định:

```text
software-engineer
```

cho mọi consumer.

`ap init` có thể đề xuất hoặc cho chọn tương tác một Role, nhưng manifest kết quả nên chứa Role một cách tường minh.

---

# 84. Canonicalization Manifest

CLI có thể hỗ trợ:

```bash
ap format
```

hoặc lệnh tương đương sau này.

Canonicalization có thể:

```text
sort lists where order is irrelevant

insert normalized formatting

remove duplicates
```

Nó không được thay đổi ý định ngữ nghĩa.

---

# 85. Thứ tự danh sách ổn định

Để dễ đọc trong version control, các manifest được sinh ra hoặc được chuẩn hóa có thể sắp xếp:

```text
presets
Capability enable list
Capability disable list
```

theo ID chuẩn.

Tuy nhiên, thứ tự do người dùng viết có thể được giữ nguyên nếu policy định dạng ưu tiên tính dễ đọc.

Semantic Resolution phải bỏ qua thứ tự.

---

# 86. Quan hệ với Lockfile

Mối quan hệ là:

```text
agent-plugins.yaml
        ↓
Resolver
        ↓
agent-plugins.lock
```

Manifest:

```text
desired semantic state
```

Lockfile:

```text
resolved concrete state
```

---

# 87. Phát hiện thay đổi Manifest

Các thay đổi có thể yêu cầu resolve lại bao gồm:

```text
Role change

Preset change

Policy change

Target change

Capability override change

Implementation override change
```

Các thay đổi thuần metadata như:

```text
description
```

không nên yêu cầu resolve lại về mặt ngữ nghĩa.

---

# 88. Fingerprint của input Resolution

Project Lockfile có thể chứa một digest của dữ liệu manifest đã chuẩn hóa và có liên quan đến resolution.

Ví dụ, hash:

```text
role
presets
policy
targets
overrides
```

nhưng loại trừ:

```text
description
comments
formatting
```

Điều này giúp phân biệt thay đổi ngữ nghĩa với các chỉnh sửa mang tính hình thức.

---

# 89. Thay đổi Manifest: Role

Ví dụ:

```text
frontend-engineer
→ backend-engineer
```

Đây là một thay đổi ngữ nghĩa lớn.

Trạng thái lock hiện có chỉ có thể được tái sử dụng cho các yêu cầu chồng lấn vẫn còn hợp lệ theo các quy tắc của Resolver.

---

# 90. Thay đổi Manifest: Thêm Preset

Ví dụ:

```text
+ engineering/security
```

Resolver nên giữ lại các lựa chọn hợp lệ hiện có khi có thể, đồng thời resolve các yêu cầu Capability mới.

---

# 91. Thay đổi Manifest: Xóa Preset

Các Capability chỉ được yêu cầu bởi Preset đó có thể biến mất khỏi trạng thái mong muốn.

Các Package không còn được yêu cầu có thể bị xóa khỏi Managed State sau đó trong quá trình sync.

---

# 92. Thay đổi Manifest: Policy

Ví dụ:

```text
default
→ strict
```

Điều này có thể làm mất hiệu lực các implementation đã được lock hiện có.

Policy là một input cứng của Resolution.

Lock phải được kiểm tra lại.

---

# 93. Thay đổi Manifest: Target

Ví dụ:

```text
claude-code
→ codex
```

Điều này đòi hỏi Resolution theo từng target.

Các lựa chọn implementation hiện có có thể không còn tương thích.

---

# 94. Thay đổi Manifest: Tắt Capability

Capability bị loại khỏi ý định trực tiếp/kế thừa, trừ khi vẫn được yêu cầu một cách bắc cầu (transitively).

Nếu vẫn là yêu cầu cứng:

```text
Resolution failure
```

---

# 95. Thay đổi Manifest: Override implementation

Một override implementation tường minh nên khiến Capability liên quan được xem xét lại, kể cả ở chế độ sync thông thường.

Override được ưu tiên hơn preference của lock hiện có.

---

# 96. Component không xác định trong Override

Manifest nên thất bại trước Resolution.

Ví dụ diagnostic:

```text
UNKNOWN_COMPONENT

spec.overrides.implementations.engineering.testing.tdd.component
```

---

# 97. Ánh xạ Capability sai

Nếu:

```text
Component X
```

tồn tại nhưng không implement:

```text
engineering.testing.tdd
```

thì override phải thất bại.

Mã khuyến nghị:

```text
INVALID_IMPLEMENTATION_OVERRIDE
```

---

# 98. Override Capability đã deprecated

Nếu một Project bật tường minh một Capability đã deprecated:

```text
warning
```

kèm theo gợi ý migration khi có.

Một Capability đã bị xóa nên làm thất bại.

---

# 99. Override implementation đã deprecated

Việc chọn tường minh một implementation đã deprecated có thể được cho phép kèm cảnh báo nếu vẫn còn hợp lệ.

Policy có thể cấm các implementation đã deprecated.

---

# 100. Override được kiểm soát bởi Policy

Policy có thể giới hạn việc Project có được chọn các override implementation tùy ý hay không.

Ví dụ, về mặt khái niệm, một Policy doanh nghiệp có thể chỉ cho phép các implementation đã được phê duyệt.

Điều này nên được thực thi trong quá trình Resolution, không phải bằng cách thay đổi cú pháp manifest.

---

# 101. Override nhạy cảm về bảo mật

Nếu một Project chọn tường minh một Component nhạy cảm về bảo mật:

```text
hook
MCP
command
script
```

thì Component đó vẫn phải vượt qua Policy.

Ý định tường minh của người dùng không tự động đồng nghĩa với phê duyệt bảo mật.

---

# 102. Tính di động của Manifest

Lý tưởng nhất, một Project Manifest nên dùng được trên nhiều máy.

Tránh các field phụ thuộc máy như:

```text
C:\Users\Tung\...
/home/user/...
```

trừ khi chúng là một phần tường minh của cấu hình target-local.

Nội dung semantic manifest nên có tính di động.

---

# 103. Đường dẫn tương đối theo repository

Nếu các field trong tương lai chấp nhận đường dẫn local, đường dẫn nên mặc định tương đối theo repository.

Ví dụ:

```text
./agent-config/...
```

Đường dẫn tuyệt đối nên bị khuyến khích tránh dùng hoặc bị từ chối đối với cấu hình cần tính di động.

---

# 104. Không chứa thông tin xác thực

Không bao giờ lưu thông tin xác thực (credential) trong:

```text
agent-plugins.yaml
```

Các ví dụ cần tránh:

```text
API keys
access tokens
passwords
private SSH keys
```

Xác thực thuộc về các cơ chế credential riêng của môi trường/công cụ.

---

# 105. Tham chiếu Secret

Nếu các target trong tương lai cần secret, cuối cùng manifest có thể tham chiếu tới các nguồn secret được đặt tên.

Khái niệm ví dụ:

```yaml
credentials:
  source: environment
```

nhưng giá trị secret thực tế nên nằm ngoài manifest.

Không bắt buộc trong V1.

---

# 106. Override local

Người dùng trong tương lai có thể muốn cấu hình riêng cho từng máy.

Không giới thiệu:

```text
agent-plugins.local.yaml
```

trong V1 trừ khi có nhu cầu đã được xác thực.

Các override ngữ nghĩa local có thể làm suy yếu khả năng tái lập.

Ưu tiên các thiết lập runtime adapter tách biệt khỏi trạng thái mong muốn ngữ nghĩa.

---

# 107. Cấu hình cho Team

Một tổ chức trong tương lai có thể muốn cấu hình dùng chung.

Ưu tiên các thành phần có thể tái sử dụng:

```text
Roles
Presets
Policies
```

thay vì kế thừa manifest chung chung.

Một Project vẫn tạo ra một trạng thái mong muốn hiệu lực tường minh.

---

# 108. Hỗ trợ Workspace / Monorepo

Các monorepo trong tương lai có thể muốn:

```text
root Project manifest
+
package-specific intent
```

V1 không yêu cầu manifest lồng nhau.

Quy tắc khuyến nghị cho V1:

```text
one agent-plugins.yaml per managed project root
```

---

# 109. Phát hiện Manifest lồng nhau

Không tự động hợp nhất manifest cha và con trong V1.

Điều đó sẽ tạo ra thứ tự ưu tiên ẩn và khó giải thích.

Nếu project lồng nhau được giới thiệu sau này, ngữ nghĩa phải được xác định tường minh.

---

# 110. Phát hiện Manifest

Hành vi của CLI nên tìm trong:

```text
current working directory
```

file:

```text
agent-plugins.yaml
```

V1 nên tránh duyệt ngược lên hệ thống file một cách tùy ý, trừ khi hành vi đó được tài liệu hóa rõ ràng.

---

# 111. Đường dẫn Manifest tường minh

Một tùy chọn CLI trong tương lai có thể hỗ trợ:

```bash
ap sync --manifest ./config/agent-plugins.yaml
```

Điều này không thay đổi ngữ nghĩa của manifest.

---

# 112. Tiến hóa API Version

Vòng đời dự kiến:

```text
v1alpha1
→ v1beta1
→ v1
```

Các phiên bản alpha có thể thay đổi.

Các phiên bản ổn định nên dùng chiến lược migration cho các thay đổi phá vỡ tương thích (breaking change).

---

# 113. Migration Manifest

Về mặt khái niệm:

```text
Old Manifest
    ↓
Migration
    ↓
Current Manifest DTO
    ↓
Normalization
    ↓
Project
```

Migration có thể được cung cấp bởi:

```text
ap migrate
```

trong tương lai.

---

# 114. API Version không được hỗ trợ

Nếu CLI không hiểu:

```yaml
apiVersion: agent-plugins.dev/v99
```

nó phải thất bại một cách rõ ràng.

Diagnostic khuyến nghị:

```text
UNSUPPORTED_API_VERSION
```

Không cố gắng phân tích theo kiểu best-effort.

---

# 115. Schema của Manifest

Vị trí schema khuyến nghị:

```text
packages/schemas/schemas/project.schema.json
```

hoặc theo phiên bản:

```text
packages/schemas/schemas/v1alpha1/project.schema.json
```

---

# 116. Schema V1 ở mức khái niệm

Về mặt khái niệm:

```yaml
apiVersion: string
kind: Project

metadata:
  name?: string
  description?: string

spec:
  role?: RoleId

  presets?: PresetId[]

  policy?: PolicyId

  targets: TargetId[]

  overrides?:
    capabilities?:
      enable?: CapabilityId[]
      disable?: CapabilityId[]

    implementations?:
      <CapabilityId>:
        component: ComponentRef
```

Đây chỉ mang tính mô tả, không phải JSON Schema thực tế.

---

# 117. Quy tắc có ít nhất một ý định

Manifest phải chứa ít nhất một trong các thành phần sau:

```text
role

preset

enabled Capability
```

sau khi chuẩn hóa.

Nếu không, Project không có trạng thái mong muốn ngữ nghĩa.

---

# 118. Quy tắc bắt buộc có Target

Cần ít nhất một Target.

V1:

```text
exactly one
```

---

# 119. Quy tắc tham chiếu Policy

Nếu Policy bị bỏ qua:

```text
normalize to default
```

nếu distribution định nghĩa Policy mặc định.

Nếu Policy mặc định không tồn tại, việc chuẩn hóa manifest sẽ thất bại.

---

# 120. Quy tắc ID trùng lặp

Các mảng biểu diễn tập hợp (set) không được chứa ID trùng lặp.

Ví dụ:

```text
presets

targets

Capability enable

Capability disable
```

Schema hoặc semantic validation khuyến nghị:

```text
uniqueItems: true
```

---

# 121. Kiểm tra ID chuẩn

Các tham chiếu phải tuân theo cú pháp riêng của từng thực thể trước khi tra cứu.

Ví dụ:

Capability:

```text
engineering.testing.tdd
```

Preset:

```text
engineering/security
```

Role:

```text
frontend-engineer
```

Điều này cho phép diagnostic rõ ràng hơn.

---

# 122. Mã Diagnostic của Manifest

Các mã ban đầu khuyến nghị:

```text
INVALID_PROJECT_MANIFEST

UNSUPPORTED_API_VERSION

UNKNOWN_FIELD

UNKNOWN_ROLE

UNKNOWN_PRESET

UNKNOWN_POLICY

UNKNOWN_TARGET

UNKNOWN_CAPABILITY

UNKNOWN_COMPONENT

DUPLICATE_PRESET

DUPLICATE_TARGET

CONFLICTING_CAPABILITY_OVERRIDE

INVALID_IMPLEMENTATION_OVERRIDE

EMPTY_PROJECT_INTENT

MULTI_TARGET_NOT_SUPPORTED
```

---

# 123. Vị trí Diagnostic

Diagnostic nên bao gồm các đường dẫn như:

```text
spec.role

spec.presets[1]

spec.overrides.capabilities.disable[0]

spec.overrides.implementations.engineering.testing.tdd.component
```

Điều này cải thiện khả năng sử dụng trong editor và CLI.

---

# 124. Biểu diễn JSON

YAML là định dạng ưu tiên hướng tới con người.

Lý tưởng nhất, schema nên cho phép biểu diễn JSON tương đương.

Ví dụ:

```json
{
  "apiVersion": "agent-plugins.dev/v1alpha1",
  "kind": "Project",
  "spec": {
    "role": "frontend-engineer",
    "targets": ["claude-code"]
  }
}
```

Việc hỗ trợ JSON làm file input là tùy chọn.

---

# 125. Định dạng chuẩn

Ngay cả khi JSON được hỗ trợ, tài liệu nên dùng YAML.

Tên file chuẩn vẫn là:

```text
agent-plugins.yaml
```

---

# 126. Manifest và `ap init`

`ap init` nên tạo ra một Project Manifest hợp lệ.

Luồng khái niệm:

```text
select Role
↓
select optional Presets
↓
select Policy
↓
select Target
↓
write agent-plugins.yaml
```

Manifest được sinh ra nên ở mức tối thiểu.

---

# 127. `ap add`

Trong tương lai:

```bash
ap add preset engineering/security
```

nên sửa đổi:

```text
spec.presets
```

thay vì ghi trực tiếp cấu hình runtime.

Tương tự:

```bash
ap add capability security.review
```

nên ánh xạ tới:

```text
spec.overrides.capabilities.enable
```

---

# 128. `ap remove`

Việc xóa một Project Preset nên chỉnh sửa:

```text
spec.presets
```

Việc xóa một Capability kế thừa từ Role có thể cần thêm:

```text
spec.overrides.capabilities.disable
```

CLI nên giữ nguyên mô hình ngữ nghĩa thay vì làm phẳng (flatten) Role.

---

# 129. `ap sync`

`ap sync` đọc Manifest.

Nó không nên âm thầm ghi lại cấu hình semantic manifest như một phần của Resolution thông thường.

Việc định dạng hoặc migration nên là các thao tác tường minh.

---

# 130. `ap explain`

Phần giải thích nên cho thấy ý định trong Manifest đã đóng góp như thế nào.

Ví dụ:

```text
engineering.testing.tdd

Required by:
role frontend-engineer
→ preset engineering/core

Implementation:
Superpowers
```

Nếu tồn tại override:

```text
Selected because:
project implementation override
```

---

# 131. `ap diff`

`ap diff` so sánh:

```text
Manifest desired state
+
Resolution
```

với:

```text
Lock / Managed Runtime State
```

Nó không nên so sánh định dạng YAML thô.

---

# 132. `ap doctor`

Các diagnostic của Manifest nên được hiển thị rõ ràng.

Ví dụ:

```text
✗ Unknown preset
  spec.presets[2]
  stacks/nonexistent
```

---

# 133. Nguồn sự thật của Manifest

`agent-plugins.yaml` là nguồn có thẩm quyền cho:

```text
Project desired semantic state
```

Nó không phải nguồn có thẩm quyền cho:

```text
Catalog semantics

Publisher versions

Component discovery

resolved package versions

actual runtime state
```

---

# 134. Manifest so với Role

Manifest chọn:

```text
Role
```

Role định nghĩa:

```text
reusable role baseline
```

Không nhúng trực tiếp nội dung Role vào mọi Manifest.

---

# 135. Manifest so với Preset

Manifest chọn các Preset bổ sung.

Preset sở hữu việc gom nhóm có thể tái sử dụng.

Nếu cùng một tập các Capability được bật trực tiếp xuất hiện trong nhiều Project, hãy tạo một Preset thay vì sao chép chúng lặp đi lặp lại.

---

# 136. Manifest so với Policy

Manifest chọn Policy.

Policy sở hữu các quy tắc quản trị.

Tránh nhúng toàn bộ quy tắc Policy trực tiếp vào mọi Project Manifest trong V1.

Không tốt:

```yaml
policy:
  allowedTrust:
    - ...
```

Nên dùng:

```yaml
policy: strict
```

---

# 137. Vì sao dùng Policy có tên

Các Policy có tên, có thể tái sử dụng giúp cải thiện:

```text
consistency
reviewability
team reuse
manifest simplicity
```

Các override policy dành riêng cho Project chỉ nên được thêm sau này nếu các use case thực tế đòi hỏi.

---

# 138. Manifest so với Lockfile

Manifest:

```text
what should exist
```

Lockfile:

```text
what exact implementation was selected
```

Không cái nào thay thế cái nào.

Thông thường cả hai nên được commit vào version control.

---

# 139. Khuyến nghị về version control

Khuyến nghị:

```text
commit agent-plugins.yaml
commit agent-plugins.lock
```

Điều này cung cấp:

```text
intent
+
reproducibility
```

---

# 140. Thay đổi định dạng Manifest

Các thay đổi chỉ về định dạng không nên gây ra thay đổi lockfile.

Ví dụ:

```text
whitespace

comments

list formatting
```

không được ảnh hưởng đến input Resolution đã chuẩn hóa.

---

# 141. Fingerprint ngữ nghĩa

Fingerprint của Manifest đã chuẩn hóa nên bao gồm:

```text
role

presets

effective policy reference

targets

Capability overrides

Implementation overrides
```

và loại trừ:

```text
comments

formatting

metadata.description
```

trừ khi metadata sau này trở nên có liên quan về mặt ngữ nghĩa.

---

# 142. Bất biến về tính di động của Manifest

Một manifest đã được commit nên resolve nhất quán trên nhiều máy khi:

```text
same distribution

same lock context

same target availability

same policy
```

Trạng thái ngầm phụ thuộc máy không được làm thay đổi trạng thái mong muốn ngữ nghĩa.

---

# 143. Ví dụ — Frontend tối thiểu

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  role: frontend-engineer

  targets:
    - claude-code
```

---

# 144. Ví dụ — Next.js + Security

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: web-platform

spec:
  role: frontend-engineer

  presets:
    - stacks/nextjs
    - engineering/security

  policy: strict

  targets:
    - claude-code
```

---

# 145. Ví dụ — Backend

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: backend-service

spec:
  role: backend-engineer

  presets:
    - stacks/typescript
    - stacks/node

  policy: default

  targets:
    - claude-code
```

---

# 146. Ví dụ — Không có Role

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: research-workspace

spec:
  presets:
    - knowledge/research
    - knowledge/writing
    - knowledge/synthesis

  policy: personal

  targets:
    - claude-code
```

---

# 147. Ví dụ — Capability dành riêng cho Project

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  role: backend-engineer

  targets:
    - claude-code

  overrides:
    capabilities:
      enable:
        - security.threat-modeling
```

---

# 148. Ví dụ — Tắt dành riêng cho Project

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  role: frontend-engineer

  targets:
    - claude-code

  overrides:
    capabilities:
      disable:
        - frontend.visual-testing
```

---

# 149. Ví dụ — Implementation TDD cụ thể

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  role: frontend-engineer

  targets:
    - claude-code

  overrides:
    implementations:
      engineering.testing.tdd:
        component: superpowers/superpowers#skill:test-driven-development
```

---

# 150. Ví dụ không hợp lệ — Manifest lấy Publisher làm trung tâm

Tránh dùng:

```yaml
plugins:
  - superpowers
  - mattpocock
  - ecc
```

Lý do:

```text
publisher selection leaks into consumer intent

duplicate workflows become likely

Roles/Presets are bypassed

Resolver loses semantic context
```

---

# 151. Ví dụ không hợp lệ — Ghim phiên bản trong Manifest

Tránh dùng:

```yaml
packages:
  superpowers:
    version: 6.4.0
```

Phiên bản thuộc về:

```text
agent-plugins.lock
```

hoặc việc lock distribution.

---

# 152. Ví dụ không hợp lệ — Policy nội tuyến

Tránh dùng trong V1:

```yaml
policy:
  allowedTrust:
    - official
    - curated

  hooks:
    external: deny
```

Nên dùng:

```yaml
policy: strict
```

---

# 153. Ví dụ không hợp lệ — Resolution bằng script

Không bao giờ:

```yaml
resolver:
  command: ./choose-agent-stack.sh
```

Resolution cốt lõi phải luôn mang tính tất định và khai báo.

---

# 154. Ví dụ không hợp lệ — Nhiều Role cạnh tranh nhau

Tránh dùng:

```yaml
roles:
  - frontend-engineer
  - backend-engineer
  - product-manager
```

Hãy dùng:

```text
one Role
+
additional Presets
```

cho các nhu cầu project hỗn hợp.

---

# 155. Ví dụ không hợp lệ — Target ẩn

Tránh bỏ qua Target và giả định:

```text
Claude Code forever
```

Runtime nên luôn tường minh.

---

# 156. Nguyên tắc thiết kế Manifest

Manifest nên tuân theo:

```text
intent over implementation

Capability over Publisher

composition over inheritance

Role for who is working

Preset for reusable composition

Policy for governance

Override for exception

Lockfile for concrete versions

Target Adapter for runtime detail
```

---

# 157. Anti-pattern của Manifest

Tránh:

```text
large plugin arrays

publisher-specific Roles

publisher-specific Presets

manual package version pins

runtime rendering instructions

deep inheritance

arbitrary imports

environment-dependent semantics

embedded scripts

duplicated Policy definitions

lockfile data copied into manifest
```

---

# 158. Các field bắt buộc của V1

Bắt buộc ở cấp cao nhất:

```text
apiVersion
kind
spec
```

Bắt buộc bên dưới `spec`:

```text
targets
```

Ngoài ra, cần ít nhất một nguồn ý định ngữ nghĩa:

```text
role

preset

Capability enable override
```

---

# 159. Các field tùy chọn của V1

```text
metadata

spec.role

spec.presets

spec.policy

spec.overrides
```

Việc bỏ qua Policy sẽ được chuẩn hóa thành:

```text
default
```

---

# 160. Các tính năng V1 không hỗ trợ

V1 không nên yêu cầu:

```text
multiple Roles

nested manifest inheritance

remote manifest imports

arbitrary Package installation

arbitrary Publisher enable lists

inline Policy definitions

version pinning in Project manifest

task-level roles

automatic stack detection fields

runtime scripts

templating
```

---

# 161. Pipeline xử lý Manifest

```text
agent-plugins.yaml
        ↓
Parse
        ↓
Schema Validate
        ↓
Reference Validate
        ↓
Semantic Validate
        ↓
Apply Defaults
        ↓
Normalize
        ↓
Project Domain Object
        ↓
Resolution Context
        ↓
Resolver
```

---

# 162. Các bất biến của Manifest

Project Manifest phải bảo toàn:

```text
1. It expresses desired semantic intent.

2. It remains publisher-independent by default.

3. It does not contain resolved Package versions.

4. It does not contain generated runtime state.

5. It selects at most one Role in V1.

6. Roles and Presets remain reusable external entities.

7. Policy is selected by reference.

8. Target is explicit.

9. Overrides are explicit and narrow.

10. Capability enable/disable conflicts are invalid.

11. Implementation overrides cannot bypass hard constraints.

12. Ordering of semantic set-like arrays does not affect Resolution.

13. Unknown fields are rejected.

14. Hidden machine state does not alter semantic meaning.

15. The manifest is suitable for version control.
```

---

# 163. Manifest khuyến nghị cho V1

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: my-project

spec:
  role: frontend-engineer

  presets:
    - stacks/nextjs
    - engineering/security

  policy: default

  targets:
    - claude-code

  overrides:
    capabilities:
      enable: []
      disable: []

    implementations: {}
```

Trong sử dụng thông thường, các cấu trúc tùy chọn rỗng nên được lược bỏ.

Do đó, một dạng tương đương gọn gàng hơn là:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: my-project

spec:
  role: frontend-engineer

  presets:
    - stacks/nextjs
    - engineering/security

  policy: default

  targets:
    - claude-code
```

---

# 164. Tiêu chí thành công của Manifest

Định dạng này thành công khi người dùng có thể hiểu một Project mà không cần biết:

```text
which Publisher wins

which Package version is installed

where Components physically live

how Claude Code stores configuration
```

trong khi Resolver vẫn có đủ thông tin ngữ nghĩa để xác định tất cả những chi tiết đó một cách tất định.

---

# 165. Manifest trong một câu

> **`agent-plugins.yaml` là một mô tả ngắn gọn, mang tính khai báo về vai trò của project, composition capability có thể tái sử dụng, governance policy, runtime target và các ngoại lệ tường minh—để lại việc lựa chọn cụ thể publisher, component, package và phiên bản cho quá trình resolution tất định và lockfile.**
