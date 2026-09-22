# Đặc tả Update

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.  
**Phiên bản:** 0.1.0  
**Cập nhật lần cuối:** 2026-09-21

---

# 1. Mục đích

Tài liệu này định nghĩa cách Agent Plugins phát hiện, đánh giá, lựa chọn, xem trước và áp dụng các bản cập nhật cho nội dung được quản lý phiên bản hoặc revision từ bên ngoài.

Update Engine quản lý các thay đổi đối với:

- phiên bản package;
- revision của source;
- metadata của source;
- transitive dependency;
- metadata về integrity;
- provenance;
- bằng chứng liên quan đến trust;
- phiên bản adapter khi được yêu cầu một cách tường minh.

Update Engine MUST bảo toàn:

```text
reproducibility
+
determinism
+
policy enforcement
+
trust visibility
+
user control
```

Quy tắc trung tâm là:

> Việc cập nhật các dependency đã resolve tách biệt với việc render hoặc cài đặt các artifact của target.

---

# 2. Mô hình Update cốt lõi

Luồng update chuẩn là:

```text
Current Configuration
        +
Current Lockfile
        │
        ▼
Discover Candidates
        │
        ▼
Evaluate Constraints
        │
        ▼
Fetch Candidate Metadata
        │
        ▼
Verify Provenance / Integrity
        │
        ▼
Trust Evaluation
        │
        ▼
Resolve Candidate Graph
        │
        ▼
Policy Evaluation
        │
        ▼
Compare Current vs Candidate
        │
        ▼
Update Plan
        │
        ▼
User / Automation Approval
        │
        ▼
Write New Lockfile
```

Theo mặc định, việc render target không diễn ra như một phần của quy trình này.

---

# 3. Update không phải là Install

Các thao tác sau MUST được giữ tách biệt:

```text
update
    = evolve resolved dependency state

build
    = render target-native artifacts

install
    = apply target-native artifacts
```

Do đó:

```bash
agent-plugins update
```

MUST NOT ngầm hoạt động như:

```text
update
→ build
→ install
```

trừ khi một lệnh tiện ích tường minh trong tương lai, chẳng hạn `sync`, chủ đích kết hợp các primitive đó.

---

# 4. Update không phải là Source Refresh

Các thao tác sau cũng tách biệt với nhau:

```text
source refresh
    = discover what is currently available

update
    = change what this project selects
```

Ví dụ:

```bash
agent-plugins source refresh
```

có thể phát hiện:

```text
foo 1.2.0
foo 1.3.0
foo 2.0.0
```

trong khi lockfile vẫn giữ nguyên:

```text
foo 1.2.0
```

cho đến khi:

```bash
agent-plugins update foo
```

được thực hiện một cách tường minh.

---

# 5. Mục tiêu

Update Engine MUST:

1. bảo toàn việc lựa chọn dependency có tính tất định;
2. không bao giờ âm thầm vượt qua các ràng buộc đã cấu hình;
3. bảo toàn chính xác provenance;
4. xác minh integrity ở những nơi được yêu cầu;
5. hiển thị các thay đổi về trust;
6. hiển thị các thay đổi về policy;
7. hiển thị các thay đổi về transitive dependency;
8. hỗ trợ dry-run;
9. cập nhật lockfile một cách nguyên tử;
10. hỗ trợ các bản cập nhật có mục tiêu;
11. bảo toàn các dependency đã lock không liên quan khi khả thi;
12. tránh hành vi đặc thù theo target;
13. tránh cài đặt vào filesystem;
14. luôn có thể giải thích được.

---

# 6. Ngoài phạm vi

Update Engine không chịu trách nhiệm cho:

- cài đặt các artifact được sinh ra;
- render các file của target;
- thực thi migration script từ package;
- chạy package hook;
- chọn tùy ý các package mới hơn nằm ngoài các ràng buộc đã cấu hình;
- âm thầm thay đổi cấu hình project;
- chọn một Publisher khác mà không có lý giải từ resolver;
- tự động chấp nhận các mức trust mới;
- tự động bỏ qua Policy.

---

# 7. Input của Update

Một thao tác update tiêu thụ:

```text
Project Configuration

Current Lockfile

Catalog

Source Configuration

Source Metadata

Resolution Rules

Policy

Trust Configuration

Update Strategy
```

Input tùy chọn MAY bao gồm:

```text
specific package
specific source
version constraint
update class
offline mode
```

---

# 8. Output của Update

Update Engine SHOULD tạo ra:

```ts
interface UpdateResult {
  plan: UpdatePlan

  diagnostics: Diagnostic[]

  changed: boolean

  lockfile?: Lockfile
}
```

Trước khi áp dụng, MUST có thể chỉ lấy riêng plan.

---

# 9. Update Plan

Một `UpdatePlan` mô tả các thay đổi được đề xuất đối với trạng thái dependency.

Về mặt khái niệm:

```ts
interface UpdatePlan {
  currentGraph: ResolvedEnvironment

  candidateGraph: ResolvedEnvironment

  changes: UpdateChange[]

  trustChanges: TrustChange[]

  policyChanges: PolicyImpact[]

  diagnostics: Diagnostic[]
}
```

Plan MUST có thể được kiểm tra trước khi lockfile bị thay đổi.

---

# 10. Các loại thay đổi trong Update

Các lớp thay đổi được khuyến nghị:

```text
added
removed
upgraded
downgraded
revision-changed
source-changed
publisher-changed
metadata-changed
unchanged
```

Ví dụ:

```text
plugin:superpowers

1.4.0
→
1.5.0
```

---

# 11. Cập nhật phiên bản

Đối với các package có phiên bản:

```text
1.2.0
→
1.3.0
```

Update Engine MUST xác minh rằng candidate thỏa mãn:

```text
manifest constraints
project constraints
Role constraints
Policy
source restrictions
```

---

# 12. Cập nhật revision

Các source kiểu Git có thể sử dụng revision bất biến thay cho semantic version.

Ví dụ:

```text
4f99cc1
→
8b713e4
```

Update Engine MUST bảo toàn chính xác revision kết quả trong lockfile.

---

# 13. Tham chiếu Source động

Cấu hình MAY tham chiếu:

```text
main
master
latest
stable
```

nhưng lockfile SHOULD chứa một revision đã resolve bất biến.

Ví dụ:

```yaml
source:
  requested: main
  resolved: 8b713e4
```

Việc cập nhật source sẽ resolve lại tham chiếu động.

---

# 14. Khám phá Candidate

Việc khám phá candidate đặt câu hỏi:

> Những phiên bản hoặc revision nào có thể thay thế lựa chọn đang được lock hiện tại?

Việc khám phá candidate MUST tôn trọng ranh giới source đã cấu hình.

Nó MUST NOT truy vấn các package registry tùy ý.

---

# 15. Nguồn Candidate

Candidate MAY đến từ:

```text
configured Git repository
configured package registry
configured vendor source
configured community catalog
local source
```

Chỉ những source được cấu hình tường minh hoặc được resolver phê duyệt mới có thể tham gia.

---

# 16. Lựa chọn Candidate

Việc lựa chọn candidate SHOULD có tính tất định.

Với cùng một:

```text
available candidates
constraints
policy
trust evidence
resolver configuration
```

thì cùng một candidate MUST được chọn.

---

# 17. Update Strategy

Update strategy kiểm soát những thay đổi candidate nào có thể được xem xét.

Các strategy có thể có:

```text
locked
patch
minor
major
latest-compatible
revision
```

V1 MAY chỉ triển khai một tập con.

---

# 18. Locked Strategy

`locked` có nghĩa là:

```text
do not change selected versions or revisions
```

Chế độ này hữu ích cho các thao tác build/install thông thường.

---

# 19. Patch Strategy

Ví dụ:

```text
1.2.3
→
1.2.x
```

Các candidate như:

```text
1.2.4
1.2.8
```

có thể được xem xét.

Nhưng:

```text
1.3.0
```

thì không được.

---

# 20. Minor Strategy

Ví dụ:

```text
1.2.3
→
1.x
```

Có thể bao gồm:

```text
1.3.0
1.7.2
```

nhưng không bao gồm:

```text
2.0.0
```

---

# 21. Major Strategy

Chế độ Major update MAY xem xét bất kỳ phiên bản khả dụng tương thích nào theo các quy tắc của project.

Ví dụ:

```text
1.2.3
→
2.0.0
```

Các Major update SHOULD được review chặt chẽ hơn.

---

# 22. Update Strategy mặc định

Mặc định SHOULD mang tính thận trọng.

Hành vi V1 được khuyến nghị:

```text
respect declared dependency constraints
```

thay vì:

```text
always select latest available
```

Các flag tường minh MAY thu hẹp hoặc mở rộng phạm vi update.

---

# 23. Ví dụ CLI

Cập nhật tất cả các package đủ điều kiện:

```bash
agent-plugins update
```

Một package cụ thể:

```bash
agent-plugins update superpowers
```

Tham chiếu canonical tường minh:

```bash
agent-plugins update plugin:superpowers
```

Dry run:

```bash
agent-plugins update --dry-run
```

---

# 24. Các lớp Update trong tương lai

CLI trong tương lai MAY hỗ trợ:

```bash
agent-plugins update --patch
agent-plugins update --minor
agent-plugins update --major
```

CLI chỉ biểu đạt strategy.

Ngữ nghĩa thuộc về Update Engine.

---

# 25. Cập nhật Package có mục tiêu

Việc cập nhật một package SHOULD giảm thiểu các thay đổi không liên quan.

Ví dụ:

```bash
agent-plugins update plugin:foo
```

Update Engine SHOULD bảo toàn các lựa chọn đã lock không liên quan trừ khi các ràng buộc dependency buộc phải thay đổi.

Thuộc tính này được gọi là:

```text
minimal unlock
```

---

# 26. Minimal Unlock

Đối với một bản cập nhật có mục tiêu:

```text
foo
```

engine SHOULD ban đầu chỉ unlock:

```text
foo
+
dependencies whose existing locked versions become incompatible
```

Nó SHOULD NOT resolve lại toàn bộ hệ sinh thái một cách không cần thiết.

---

# 27. Dependency Cascade

Một bản cập nhật có mục tiêu MAY đòi hỏi các thay đổi transitive.

Ví dụ:

```text
foo 1.0
→
foo 2.0

foo 2.0 requires bar >=3
```

Hiện tại:

```text
bar 2.1
```

Do đó update plan MAY chứa:

```text
foo 1.0 → 2.0
bar 2.1 → 3.2
```

Cascade MUST được hiển thị rõ ràng.

---

# 28. Tác động lên Reverse Dependency

Nếu một bản cập nhật sẽ vi phạm yêu cầu của một package khác:

```text
package A requires B < 3
package C candidate requires B >= 3
```

thao tác MUST hoặc:

```text
find a valid solution
```

hoặc thất bại với một resolution conflict.

Nó MUST NOT âm thầm làm hỏng A.

---

# 29. Full Update

Một full update có thể unlock tất cả các dependency đủ điều kiện.

Về mặt khái niệm:

```text
current constraints
+
latest allowed candidates
→
new resolved graph
```

Ngay cả trong chế độ full update, các ràng buộc đã cấu hình vẫn là authoritative.

---

# 30. Update và Role

Role xác định thành phần mong muốn của môi trường.

Việc update MUST NOT âm thầm thêm các package không được chọn bởi:

```text
Role
Preset
project configuration
dependencies
```

Chỉ riêng việc khả dụng không có nghĩa là được bao gồm.

---

# 31. Update và Preset

Nếu bản thân một Preset được quản lý phiên bản từ bên ngoài, việc cập nhật nó MAY thay đổi thành phần package.

Những thay đổi như vậy MUST được hiển thị.

Ví dụ:

```text
preset:frontend-core

before:
  typescript
  testing

after:
  typescript
  testing
  accessibility
```

Dependency mới được đưa vào MUST xuất hiện trong Update Plan.

---

# 32. Update và việc lựa chọn Publisher

Nếu nhiều publisher cùng thỏa mãn một capability, một bản cập nhật MUST NOT tùy tiện chuyển đổi publisher.

Việc thay đổi publisher đòi hỏi lý giải từ resolver.

Ví dụ:

```text
publisher:
  mattpocock
→
  first-party
```

phải được báo cáo một cách tường minh.

---

# 33. Phân loại thay đổi Publisher

Các thay đổi publisher SHOULD được coi là có tác động cao hơn các bản cập nhật phiên bản thông thường.

Loại thay đổi được khuyến nghị:

```text
publisher-changed
```

Chúng SHOULD yêu cầu review tường minh trừ khi cấu hình project chủ đích cho phép tự động chuyển đổi publisher.

---

# 34. Update và định danh Source

Một bản cập nhật từ:

```text
github.com/org/foo
```

sang:

```text
github.com/other/foo
```

không phải là một bản cập nhật phiên bản thông thường.

Nó là:

```text
source-changed
```

và MUST được xem xét kỹ lưỡng ở mức cao hơn.

---

# 35. Thay đổi Source

Các thay đổi source MUST hiển thị:

```text
old source
new source
old publisher
new publisher
old trust
new trust
```

khi có sẵn.

---

# 36. Chuyển giao Repository

Việc chuyển giao quyền sở hữu repository MAY giữ nguyên tên repository.

Update Engine SHOULD phát hiện các thay đổi quyền sở hữu liên quan đến trust khi metadata của source hỗ trợ điều đó.

Một thay đổi như vậy MUST NOT được xử lý như một lần tăng revision thông thường.

---

# 37. Update và Provenance

Mọi candidate MUST có đủ provenance trước khi được chấp nhận.

Tối thiểu, các candidate bên ngoài SHOULD xác định:

```text
source
revision/version
path if applicable
```

---

# 38. Integrity của Candidate

Ở những nơi integrity là bắt buộc, nội dung candidate MUST được xác minh trước khi trở thành trạng thái lock mới.

Integrity digest mới MUST chỉ được sinh ra sau khi xác minh thành công.

---

# 39. Lỗi Integrity

Nếu việc xác minh integrity của candidate thất bại:

```text
ERROR UPDATE_INTEGRITY_FAILURE
```

Candidate MUST bị từ chối.

Lockfile hiện tại MUST giữ nguyên không đổi.

---

# 40. Update và Trust

Mọi candidate MUST được đánh giá theo Trust Model.

Việc đánh giá trust SHOULD diễn ra trước khi policy cấp quyền cuối cùng.

Về mặt khái niệm:

```text
Candidate
   ↓
Evidence
   ↓
Trust Evaluation
   ↓
Effective Trust Context
```

---

# 41. Thay đổi Trust

Các update plan MUST hiển thị các thay đổi liên quan đến trust.

Ví dụ:

```text
trusted-vendor
→
community
```

hoặc:

```text
publisher verified
→
publisher unknown
```

---

# 42. Hạ cấp Trust

Việc hạ cấp trust SHOULD chặn bản cập nhật theo mặc định dưới policy thận trọng.

Ví dụ:

```text
TRUST_DOWNGRADE

plugin:foo

trusted-vendor
→
community
```

---

# 43. Nâng cấp Trust

Việc nâng cấp trust MAY được hiển thị nhưng MUST NOT bỏ qua việc đánh giá policy thông thường.

Ví dụ:

```text
community
→
verified-community
```

Các thay đổi trust là thay đổi về bằng chứng, không phải quyết định cấp quyền.

---

# 44. Trust transitive mới

Một bản cập nhật candidate có thể đưa vào các transitive dependency mới.

Ví dụ:

```text
plugin:A
trusted-vendor

new dependency:
plugin:B
community
```

Điều này MUST xuất hiện trong output về tác động trust.

---

# 45. Update và Policy

Resolution của candidate MUST vượt qua Policy Engine trước khi được chấp nhận.

Pipeline:

```text
Candidate Graph
      ↓
Trust Context
      ↓
Policy Evaluation
      ↓
Allowed / Denied
```

---

# 46. Policy từ chối

Nếu graph của candidate vi phạm policy:

```text
ERROR UPDATE_POLICY_REJECTED
```

bản cập nhật MUST thất bại.

Trạng thái hiện tại vẫn giữ nguyên.

---

# 47. Thay đổi Policy do Update

Một package trước đây được cho phép MAY trở thành không được phép do các capability mới.

Ví dụ:

```text
foo 1.2
capabilities:
  documentation
```

candidate:

```text
foo 1.3
capabilities:
  documentation
  shell-execute
```

Điều này MUST được hiển thị và đánh giá.

---

# 48. Capability Diff

Update Plan SHOULD bao gồm các thay đổi về capability.

Ví dụ:

```text
plugin:foo

Capabilities added:
  shell-execute

Capabilities removed:
  none
```

Điều này đặc biệt quan trọng đối với các capability nhạy cảm về bảo mật.

---

# 49. Các thay đổi nhạy cảm về bảo mật

Update Engine SHOULD làm nổi bật:

```text
new hooks
new shell execution
new network access
new filesystem write
new secret access
new process spawn
new external source
```

Những thay đổi này SHOULD được gán mức nghiêm trọng cao hơn.

---

# 50. Phân loại rủi ro của Update

Các thay đổi trong update MAY được phân loại là:

```text
low
medium
high
critical
```

Tuy nhiên, rủi ro SHOULD được giữ tách biệt với Trust.

Ví dụ:

```text
trusted-vendor update
+
new shell-execute
=
high-risk change
```

---

# 51. Rủi ro không phải là cấp quyền

Phân loại rủi ro chỉ mang tính thông tin trừ khi được Policy tham chiếu.

Policy vẫn là authoritative.

---

# 52. Xem trước Update

Trước khi áp dụng, bản xem trước dễ đọc cho con người SHOULD bao gồm:

```text
package changes
source changes
publisher changes
transitive changes
capability changes
trust changes
policy impact
```

Ví dụ:

```text
plugin:superpowers
  1.4.0 → 1.5.0

Transitive:
  skill:debugging
    updated

Capabilities:
  + structured-debugging

Trust:
  unchanged

Policy:
  allowed
```

---

# 53. Dry Run

```bash
agent-plugins update --dry-run
```

MUST thực hiện đủ công việc để sinh ra một Update Plan sát với thực tế.

Nó MUST NOT sửa đổi:

```text
project config
lockfile
target artifacts
source-of-truth content
```

Việc ghi cache MAY chỉ được cho phép nếu ngữ nghĩa cache cho phép tường minh việc cache vô hại và có thể tái lập.

---

# 54. Tính tương đương của Dry-Run

Với dữ liệu candidate bên ngoài không đổi:

```text
dry-run plan
```

và:

```text
actual update plan
```

SHOULD tương đương nhau.

---

# 55. Phê duyệt Update

Chế độ tương tác MAY yêu cầu xác nhận sau khi hiển thị plan.

Ví dụ:

```text
3 packages will change.
1 new transitive dependency will be added.
No trust downgrade detected.

Apply update? [y/N]
```

---

# 56. Update không tương tác

CI và automation MUST không bị chặn bởi các prompt.

Ví dụ:

```bash
agent-plugins update --yes
```

Vẫn MUST tuân thủ:

```text
Policy
Trust rules
integrity
constraints
```

`--yes` là sự xác nhận, không phải là cách bỏ qua cấp quyền.

---

# 57. Áp dụng Update

Việc áp dụng một bản cập nhật sẽ sửa đổi lockfile hoặc các trạng thái khác thuộc sở hữu của update.

Nó SHOULD NOT sửa đổi các runtime artifact của target.

Về mặt khái niệm:

```text
Validated Update Plan
      ↓
Generate Candidate Lockfile
      ↓
Validate Candidate Lockfile
      ↓
Atomic Replace
```

---

# 58. Cập nhật Lockfile nguyên tử

Việc thay thế lockfile SHOULD mang tính nguyên tử.

Lỗi trong quá trình ghi MUST NOT để lại một lockfile được ghi dở dang.

Strategy được khuyến nghị:

```text
serialize temporary file
↓
validate
↓
fsync where practical
↓
atomic rename
```

---

# 59. Thay đổi cấu hình

`update` thông thường SHOULD NOT ghi lại cấu hình project.

Ví dụ:

```yaml
foo: ^1.0.0
```

sẽ giữ nguyên không đổi trong khi lockfile dịch chuyển:

```text
1.2.0
→
1.4.0
```

---

# 60. Update mở rộng ràng buộc

Nếu người dùng muốn thay đổi:

```text
^1
→
^2
```

thì đó là một thay đổi cấu hình.

Về sau nó MAY được hỗ trợ bởi một lệnh hoặc tùy chọn tường minh riêng biệt.

Nó MUST NOT diễn ra một cách âm thầm trong quá trình update thông thường.

---

# 61. Hạ phiên bản

Các bản cập nhật thường hướng tới các phiên bản mới hơn, nhưng resolution của candidate MAY tạo ra việc hạ phiên bản khi cần thiết.

Ví dụ:

```text
A update
requires older compatible B
```

Mọi việc hạ phiên bản MUST được hiển thị một cách tường minh.

---

# 62. Hạ phiên bản tường minh

CLI trong tương lai MAY hỗ trợ:

```bash
agent-plugins update foo --to 1.2.0
```

Hành vi như vậy thực chất là một thao tác lựa chọn phiên bản và vẫn MUST đi qua quy trình validation thông thường.

---

# 63. Pinning

Cấu hình project MAY pin:

```text
exact semantic version
exact Git revision
```

Các dependency đã pin MUST NOT được cập nhật trừ khi bản thân pin được thay đổi một cách tường minh hoặc ngữ nghĩa override được yêu cầu.

---

# 64. Khoảng phiên bản

Nếu cấu hình sử dụng:

```text
^1.2.0
```

Update Engine có thể chọn bất kỳ candidate nào được khoảng đó và update strategy cho phép.

Lockfile ghi lại kết quả chính xác.

---

# 65. Phạm vi Update

Yêu cầu update MAY nhắm tới:

```text
all packages
one package
multiple packages
one source
one Publisher
one Role-derived subtree
```

V1 SHOULD ưu tiên:

```text
all
single package
source
```

---

# 66. Update theo phạm vi Source

Ví dụ:

```bash
agent-plugins update --source vendor
```

Ban đầu chỉ các dependency được resolve từ source đó SHOULD được unlock.

Dependency cascade MAY ảnh hưởng tới các dependency khác nếu cần.

---

# 67. Update theo phạm vi Publisher

Tương lai:

```bash
agent-plugins update --publisher mattpocock
```

có thể cập nhật các package từ Publisher đó.

Điều này SHOULD không thuộc V1 trừ khi cần thiết.

---

# 68. Tính ổn định của việc lựa chọn Update

Khi nhiều phiên bản candidate cùng thỏa mãn các ràng buộc, việc lựa chọn MUST sử dụng thứ tự ổn định.

Đối với semantic version, thông thường là:

```text
highest allowed stable version
```

trừ khi được cấu hình khác.

---

# 69. Phiên bản Pre-Release

Các phiên bản pre-release SHOULD NOT được chọn theo mặc định đối với các ràng buộc dependency ổn định.

Ví dụ:

```text
2.0.0-beta.1
```

đòi hỏi sự cho phép tường minh.

---

# 70. Stable so với Pre-Release

Nếu phiên bản đang được lock hiện tại là stable:

```text
1.5.0
```

candidate:

```text
2.0.0-beta.1
```

MUST NOT thay thế nó trong update thông thường.

---

# 71. Dependency Pre-Release hiện có

Nếu cấu hình project sử dụng tường minh một nhánh pre-release, update MAY giữ trong phạm vi các phiên bản pre-release tương thích.

Ngữ nghĩa SHOULD tuân theo đặc tả versioning.

---

# 72. Phiên bản bị Yank hoặc Deprecated

Metadata của source MAY xác định một phiên bản là:

```text
deprecated
yanked
revoked
```

Update Engine SHOULD tránh chọn những candidate như vậy.

Việc thu hồi vì lý do bảo mật MUST được ưu tiên hơn sở thích phiên bản thông thường.

---

# 73. Phiên bản hiện tại bị thu hồi

Nếu revision đang được lock hiện tại bị thu hồi một cách tường minh:

```text
agent-plugins update
```

SHOULD hiển thị một diagnostic có mức nghiêm trọng cao.

Một phương án thay thế an toàn có thể được đề xuất nếu có.

---

# 74. Không có Candidate hợp lệ

Nếu không tồn tại candidate update nào được cho phép:

```text
No update available.
```

Thông thường đây không phải là lỗi.

---

# 75. Candidate tồn tại nhưng bị chặn

Nếu tồn tại một phiên bản mới hơn nhưng bị từ chối:

```text
Update available but blocked.
```

Lý do SHOULD được hiển thị:

```text
Policy
Trust
constraint
compatibility
integrity
```

---

# 76. Khả năng giải thích của Update

Người dùng SHOULD có thể trả lời được:

```text
Why was version X selected?

Why was version Y rejected?

Why did dependency Z change?

Why did trust change?

Why was update blocked?
```

---

# 77. Giải thích Candidate

CLI trong tương lai MAY cung cấp:

```bash
agent-plugins update foo --explain
```

Ví dụ:

```text
Selected 1.5.0 because:

✓ satisfies ^1.2.0
✓ allowed by policy
✓ source trust accepted
✓ stable release

Rejected 2.0.0 because:

✗ outside configured range
```

---

# 78. Diagnostic của Update

Các mã diagnostic được khuyến nghị:

```text
UPDATE_NO_CANDIDATE

UPDATE_CONSTRAINT_REJECTED

UPDATE_RESOLUTION_CONFLICT

UPDATE_SOURCE_CHANGED

UPDATE_PUBLISHER_CHANGED

UPDATE_TRUST_DOWNGRADE

UPDATE_POLICY_REJECTED

UPDATE_INTEGRITY_FAILURE

UPDATE_NEW_SENSITIVE_CAPABILITY

UPDATE_TRANSITIVE_CHANGE

UPDATE_LOCK_WRITE_FAILED
```

---

# 79. Exit Code

CLI ánh xạ các lỗi của Update Engine sang mô hình lỗi CLI thông thường.

Ví dụ:

```text
resolution failure
→ resolver exit class

policy rejection
→ policy exit class

source failure
→ source exit class
```

Các mã diagnostic đặc thù cho update SHOULD cung cấp lý do chính xác.

---

# 80. Update và Lockfile

Lockfile mới MUST ghi lại:

```text
exact selected version/revision
source provenance
integrity
dependency relationships
relevant adapter metadata
```

theo `lockfile-spec.md`.

---

# 81. Lockfile Diff

Bản xem trước update SHOULD suy ra một diff ngữ nghĩa thay vì chỉ hiển thị văn bản thô của lockfile.

Ví dụ:

```text
UPDATED
  plugin:foo
    1.2.0 → 1.4.0

ADDED
  skill:new-capability

REMOVED
  skill:legacy
```

Raw diff MAY cũng được cung cấp.

---

# 82. Serialization Lockfile ổn định

Một bản cập nhật MUST NOT sắp xếp lại các entry không liên quan trong lockfile một cách không cần thiết.

Serialization ổn định giúp giảm các Git diff gây nhiễu.

---

# 83. Dependency không thay đổi

Nếu một entry không thay đổi, biểu diễn serialize của nó SHOULD giữ nguyên hệt như cũ khi có thể.

---

# 84. Metadata của Lockfile

Metadata dễ biến động như:

```text
updatedAt
machine hostname
local path
```

SHOULD được tránh trừ khi cần thiết.

Nếu không, mọi bản cập nhật đều tạo ra các diff không cần thiết.

---

# 85. Update và Adapter

Việc cập nhật package thông thường SHOULD NOT tự động cập nhật Target Adapter trừ khi adapter là một phần của phạm vi update tường minh.

Adapter là các thành phần ứng dụng có đặc quyền và nên có ngữ nghĩa vòng đời độc lập.

---

# 86. Cập nhật Adapter

Tương lai:

```bash
agent-plugins update --adapters
```

MAY cập nhật các adapter package.

Các bản cập nhật adapter MUST làm nổi bật:

```text
capability mapping changes
generated output changes
target compatibility changes
```

---

# 87. Major Update của Adapter

Một major update của adapter SHOULD được review ở mức cao hơn vì cấu trúc target được sinh ra có thể thay đổi đáng kể.

---

# 88. Cập nhật Core / CLI

Việc cập nhật bản thân Agent Plugins CLI nằm ngoài Update Engine cho dependency của project trừ khi được tích hợp tường minh về sau.

Việc cập nhật package dependency và việc tự cập nhật ứng dụng SHOULD là hai khái niệm tách biệt.

---

# 89. Update và Overlay

Các bản cập nhật package bên ngoài MUST bảo toàn overlay.

Luồng:

```text
New upstream candidate
      ↓
Normalize
      ↓
Apply existing overlays
      ↓
Validate
      ↓
Resolve
```

---

# 90. Tương thích Overlay

Một bản cập nhật upstream MAY làm hỏng một overlay.

Ví dụ:

```text
overlay modifies field X
```

nhưng upstream mới đã loại bỏ X.

Điều này MUST tạo ra một overlay conflict tường minh.

---

# 91. Overlay Conflict

Diagnostic được khuyến nghị:

```text
UPDATE_OVERLAY_CONFLICT
```

Lockfile MUST giữ nguyên không đổi nếu các overlay bắt buộc không thể được áp dụng thành công.

---

# 92. Overlay Diff

Bản xem trước update SHOULD phân biệt:

```text
upstream changes
overlay changes
effective changes
```

khi hữu ích.

---

# 93. Vendor Update

Một bản cập nhật vendor package được curate SHOULD bảo toàn provenance của upstream.

Ví dụ:

```text
vendor/mattpocock

revision:
abc123 → def456
```

Các sửa đổi cục bộ SHOULD tồn tại dưới dạng overlay thay vì chỉnh sửa trực tiếp nội dung vendor.

---

# 94. Review Vendor

Workflow cập nhật vendor MAY đòi hỏi mức phê duyệt chặt chẽ hơn so với các thay đổi first-party thông thường.

Điều này được kiểm soát bởi policy/cấu hình.

---

# 95. Package First-Party

Các package first-party được viết trực tiếp trong repository thường không cần Update Engine resolve phiên bản.

Nội dung của chúng thay đổi thông qua các commit repository thông thường.

Chúng vẫn có thể tham gia vào:

```text
catalog
resolver
lockfile identity
```

tùy thuộc vào thiết kế lockfile.

---

# 96. Source đường dẫn cục bộ

Việc cập nhật source cục bộ MAY có nghĩa là:

```text
content hash changed
```

thay vì:

```text
version changed
```

V1 MAY coi các canonical source cục bộ là trạng thái repository hiện tại thay vì các dependency được cập nhật từ bên ngoài.

---

# 97. Refresh Source từ xa

Source adapter MAY cache metadata từ xa.

Update SHOULD refresh metadata của candidate khi cần thiết trừ khi:

```text
offline
```

hoặc cache policy quy định khác.

---

# 98. Update Offline

Update offline MAY chỉ sử dụng metadata và nội dung candidate đã được cache.

Ví dụ:

```bash
agent-plugins update --offline
```

Nếu không tồn tại candidate mới hơn trong cache:

```text
No cached update candidate.
```

Lệnh MUST NOT truy cập mạng.

---

# 99. An toàn khi Offline

Chế độ offline MUST không bao giờ âm thầm vô hiệu hóa:

```text
integrity checks
policy
trust evaluation
```

Nó chỉ đơn giản giới hạn bằng chứng và candidate vào dữ liệu có sẵn cục bộ.

---

# 100. Độ cũ của Candidate trong Cache

Metadata của source trong cache MAY bao gồm thông tin về độ mới.

CLI MAY cảnh báo:

```text
Candidate metadata is 14 days old.
```

nhưng SHOULD NOT tự tạo ra trạng thái mới hơn.

---

# 101. Lỗi mạng

Nếu update cần mạng và việc truy cập source thất bại:

```text
ERROR SOURCE_UNAVAILABLE
```

Lockfile hiện tại vẫn hợp lệ và giữ nguyên không đổi.

---

# 102. Lỗi Source một phần

Nếu đang cập nhật tất cả các package và một source bắt buộc thất bại, mặc định SHOULD là:

```text
fail whole update
```

thay vì commit một lockfile chỉ được cập nhật một phần.

Các thay đổi trạng thái project mang tính nguyên tử được ưu tiên hơn.

---

# 103. Update một phần

Hành vi tường minh trong tương lai MAY hỗ trợ các bản cập nhật một phần độc lập.

Nếu được triển khai, nó MUST là opt-in và có ngữ nghĩa rõ ràng.

V1 SHOULD tránh sự phức tạp này.

---

# 104. Transaction của Update

Thao tác update SHOULD hoạt động theo kiểu transaction:

```text
discover
fetch
validate
resolve
policy
plan
serialize lock
commit
```

Lỗi xảy ra trước khi commit sẽ giữ nguyên trạng thái project hiện tại.

---

# 105. Khôi phục khi Update thất bại

Vì update thông thường chỉ thay đổi trạng thái lockfile, việc khôi phục SHOULD đơn giản.

Nếu commit thất bại:

```text
retain old lockfile
```

Các artifact tạm thời MUST được dọn dẹp.

---

# 106. Update và các Artifact được sinh ra

Sau khi update thành công:

```text
generated target files may now be stale
```

CLI SHOULD thông báo cho người dùng.

Ví dụ:

```text
Lockfile updated.

Target artifacts may need rebuilding.

Run:
  agent-plugins build
```

---

# 107. Drift sau Update

`agent-plugins diff`

SHOULD hiển thị các target artifact khác biệt so với trạng thái vừa được resolve.

Điều này là có chủ đích.

---

# 108. Sync tiện ích

Một lệnh trong tương lai:

```bash
agent-plugins sync
```

MAY kết hợp:

```text
update
→ build
→ install
```

nhưng chỉ như một thao tác cấp cao hơn và tường minh.

Mỗi bước bên dưới vẫn giữ ngữ nghĩa riêng của nó.

---

# 109. Hành vi Update trong CI

CI SHOULD thông thường xác minh trạng thái thay vì tự động cập nhật dependency.

Được khuyến nghị:

```text
lock verify
build --frozen-lockfile
```

thay vì:

```text
update
```

trong quá trình validation thông thường.

---

# 110. Bot Update tự động

Automation trong tương lai MAY tạo các PR update.

Luồng lý tưởng:

```text
scheduled job
     ↓
update --dry-run
     ↓
apply candidate lockfile
     ↓
tests
     ↓
generate PR
```

PR hiển thị bản cập nhật để con người review.

---

# 111. Nội dung PR Update tự động

Một PR update SHOULD bao gồm:

```text
package changes
transitive changes
trust changes
capability changes
security-sensitive changes
test result
```

---

# 112. Auto-Merge

Các policy auto-merge về sau MAY cho phép các bản cập nhật rủi ro thấp.

Ví dụ:

```text
patch update
+
same source
+
same trust
+
no new capabilities
+
all tests pass
```

Nhưng điều này nằm ngoài V1.

---

# 113. Update bảo mật

Các security advisory MAY khiến Update Engine ưu tiên một candidate an toàn.

Tuy nhiên, nó MUST NOT âm thầm vi phạm khả năng tương thích đã cấu hình hoặc Policy.

Nếu không tồn tại candidate an toàn hợp lệ nào, hãy báo cáo rõ ràng.

---

# 114. Cưỡng chế Update bảo mật

Hệ thống SHOULD NOT âm thầm cưỡng chế một major update.

Thay vào đó:

```text
current version vulnerable
safe candidate requires breaking update
```

nên tạo ra một diagnostic có thể hành động được.

---

# 115. Phiên bản bị thu hồi

Nếu một phiên bản bị thu hồi tường minh bởi security metadata đáng tin cậy, hệ thống update SHOULD cảnh báo mạnh hoặc chặn tùy thuộc vào policy.

---

# 116. Tương thích của Update

Tương thích của candidate MAY bao gồm:

```text
canonical schema version
core API compatibility
Adapter API compatibility
runtime requirements
target compatibility
```

Một candidate không tương thích với nền tảng hiện tại MUST bị từ chối.

---

# 117. Tương thích Runtime

Ví dụ:

```text
plugin foo 2.0 requires:
  Agent Plugins >= 2
```

Hiện tại:

```text
Agent Plugins 1.x
```

Candidate MUST bị từ chối.

---

# 118. Tương thích Target

Package SHOULD giữ tính trung lập với target, nhưng một số capability có thể không render được bởi các target đã cấu hình.

Do đó update MAY gây ra các vấn đề tương thích target.

Những vấn đề này MUST được phát hiện trước khi chấp nhận cuối cùng khi cấu hình target đã được biết.

---

# 119. Thay đổi tương thích Target

Ví dụ:

```text
package update adds hook capability

configured target:
  Codex

Codex adapter:
  hook unsupported
```

Update Plan MUST hiển thị sự không tương thích.

Tùy thuộc vào cấu hình, update MAY thất bại.

---

# 120. Tương thích đa Target

Đối với các project nhắm tới nhiều runtime:

```text
Claude
Codex
Gemini
```

candidate graph SHOULD được kiểm tra với tất cả các target bắt buộc khi policy của project đòi hỏi tương thích chéo giữa các target.

---

# 121. Tương thích Target tùy chọn

Một project MAY cho phép suy giảm capability đặc thù theo target.

Hành vi như vậy MUST tuân theo `adapter-spec.md`.

Update Engine MUST không tự tạo ra ngữ nghĩa suy giảm mới.

---

# 122. Thứ tự Update

Các thay đổi trong update SHOULD có thứ tự trình bày ổn định.

Cách nhóm được khuyến nghị:

```text
critical security/trust changes

source/publisher changes

direct package changes

transitive changes

capability changes
```

Trong mỗi nhóm, sử dụng thứ tự canonical ổn định.

---

# 123. Output cho con người

Output mặc định SHOULD ưu tiên các thay đổi có ý nghĩa hơn là nhiễu dependency thô.

Ví dụ:

```text
3 direct updates
5 transitive updates
1 new capability
0 trust downgrades
```

Người dùng MAY yêu cầu chế độ chi tiết.

---

# 124. Output JSON

Output cho máy MUST cung cấp dữ liệu có cấu trúc.

Ví dụ:

```json
{
  "schemaVersion": "cli-output/v1",
  "command": "update",
  "success": true,
  "data": {
    "changed": true,
    "changes": []
  },
  "diagnostics": []
}
```

---

# 125. Hợp đồng ổn định cho máy

Output JSON của update là một phần của bề mặt tương thích CLI.

Automation SHOULD NOT parse output được định dạng cho con người.

---

# 126. Lịch sử Update

Cơ chế lịch sử chính SHOULD vẫn là:

```text
Git
+
lockfile commits
```

Agent Plugins không cần một cơ sở dữ liệu lịch sử update riêng trong V1.

---

# 127. Khả năng Audit

Git diff của lockfile SHOULD cho phép maintainer xác định:

```text
what changed
where it came from
which revision was selected
```

Bản tóm tắt trust/capability có thể bổ sung cho điều này.

---

# 128. Metadata của Update

Lockfile SHOULD tránh lưu metadata tạm thời của quá trình update như:

```text
person who ran update
CLI invocation
interactive choice history
```

trừ khi cần thiết cho khả năng tái lập.

Những thông tin đó thuộc về lịch sử source control hoặc metadata của CI.

---

# 129. Policy của Update

Các ràng buộc tổ chức đặc thù cho update SHOULD tốt nhất được biểu đạt thông qua Policy hoặc cấu hình.

Ví dụ:

```text
deny major updates automatically

require trusted-vendor

deny new executable capabilities
```

Tránh các CLI flag dùng một lần rải rác.

---

# 130. Cấu hình Update

Về sau cấu hình project MAY định nghĩa:

```yaml
update:
  strategy: minor

  allowPrerelease: false

  requireSameSource: true
```

Schema chính xác thuộc về `configuration-spec.md`.

---

# 131. Policy Update cho Source

Ví dụ:

```yaml
update:
  sourceChange: deny
```

Điều này ngăn việc tự động thay thế định danh source của package.

---

# 132. Policy Update cho Publisher

Ví dụ:

```yaml
update:
  publisherChange: require-approval
```

Việc chuyển đổi publisher không được xử lý như một bản patch thường lệ.

---

# 133. Policy cho Capability nhạy cảm

Ví dụ:

```yaml
update:
  newSensitiveCapabilities: deny
```

Một lần nữa, việc cấp quyền thực tế SHOULD tích hợp với Policy.

---

# 134. Thứ tự ưu tiên ràng buộc Update

Thứ tự ưu tiên được khuyến nghị:

```text
explicit CLI scope
      ↓
project update config
      ↓
dependency constraints
      ↓
Policy
      ↓
trust requirements
      ↓
source availability
```

Các ràng buộc về Policy và bảo mật không thể bị bỏ qua bởi một yêu cầu update CLI rộng hơn.

---

# 135. `--major` không override Policy

Ví dụ:

```bash
agent-plugins update foo --major
```

có nghĩa là:

```text
consider major candidates
```

không phải:

```text
ignore policy and trust restrictions
```

---

# 136. `--yes` không override Trust

Tương tự:

```bash
--yes
```

chỉ bỏ qua bước xác nhận.

Nó MUST NOT bỏ qua các diagnostic về hạ cấp trust hoặc việc policy từ chối.

---

# 137. Khóa Update

Nếu nhiều process cùng lúc cố gắng cập nhật cùng một lockfile, hệ thống SHOULD ngăn chặn race condition.

Strategy có thể có:

```text
filesystem lock
optimistic content hash
```

Chi tiết triển khai có thể khác nhau.

---

# 138. Concurrency lạc quan cho Lockfile

Trước khi thay thế lockfile, engine MAY xác minh:

```text
current lockfile hash
==
hash observed at operation start
```

Nếu không:

```text
ERROR UPDATE_CONCURRENT_MODIFICATION
```

---

# 139. Conflict trong Version Control

Các Git merge conflict trong lockfile MUST NOT bị công cụ update âm thầm giải quyết trừ khi một cách sinh lại tất định được yêu cầu tường minh.

---

# 140. Sinh lại Lockfile

Một lệnh trong tương lai:

```bash
agent-plugins lock regenerate
```

có thể resolve từ cấu hình project.

Điều này khác với update có mục tiêu vì nó có thể chọn một graph tương thích hoàn toàn mới.

---

# 141. Update so với sinh lại

```text
update
    = evolve existing locked state

regenerate
    = solve from configuration with reduced regard for prior locked choices
```

Sự phân biệt này quan trọng để giảm thiểu biến động.

---

# 142. Tính tất định

Với cùng một:

```text
current lockfile
source metadata
candidate content
configuration
policy
trust rules
Update strategy
```

Update Plan MUST giống hệt nhau.

---

# 143. Sự phụ thuộc vào thời gian

Thời gian hiện tại SHOULD NOT ảnh hưởng đến việc lựa chọn phiên bản, trừ trường hợp ngữ nghĩa hết hạn tường minh hoặc hiệu lực của advisory yêu cầu điều đó.

Những sự phụ thuộc như vậy MUST được mô hình hóa một cách tường minh.

---

# 144. Mức độ phổ biến trong tìm kiếm

Việc lựa chọn update MUST NOT phụ thuộc vào:

```text
GitHub stars
download count
search ranking
community popularity
```

trừ khi một publisher-selection policy tường minh trong tương lai quy định metadata như vậy.

---

# 145. Thứ tự phản hồi mạng

Việc lựa chọn candidate MUST NOT phụ thuộc vào thứ tự phản hồi mạng không tất định.

Kết quả phải được chuẩn hóa và sắp xếp một cách tất định.

---

# 146. API của Update Engine

Về mặt khái niệm:

```ts
interface UpdateEngine {
  plan(
    input: UpdateInput
  ): Promise<UpdatePlan>

  apply(
    plan: UpdatePlan
  ): Promise<UpdateResult>
}
```

Việc khám phá MAY được ủy quyền cho các Source Adapter.

---

# 147. Input của Update

Về mặt khái niệm:

```ts
interface UpdateInput {
  config: ProjectConfiguration

  lockfile: Lockfile

  scope: UpdateScope

  strategy: UpdateStrategy

  offline: boolean
}
```

---

# 148. Phạm vi Update

Về mặt khái niệm:

```ts
type UpdateScope =
  | { type: "all" }
  | { type: "package"; id: CanonicalReference }
  | { type: "source"; id: SourceId }
```

Các phạm vi bổ sung MAY được thêm vào về sau.

---

# 149. Update Candidate

Về mặt khái niệm:

```ts
interface UpdateCandidate {
  package: CanonicalReference

  current?: ResolvedPackage

  candidate: PackageDescriptor

  source: SourceReference

  provenance: Provenance

  integrity?: Integrity

  trust?: TrustContext
}
```

---

# 150. Update Change

Về mặt khái niệm:

```ts
interface UpdateChange {
  subject: CanonicalReference

  kind:
    | "added"
    | "removed"
    | "upgraded"
    | "downgraded"
    | "revision-changed"
    | "source-changed"
    | "publisher-changed"

  before?: ResolvedPackage

  after?: ResolvedPackage
}
```

---

# 151. Tính thuần khiết của việc lập kế hoạch Update

Việc lập kế hoạch SHOULD tránh các thay đổi lâu dài.

Nó MAY:

```text
query sources
use cache
fetch candidate artifacts
verify candidates
```

nhưng MUST NOT commit trạng thái project.

---

# 152. Trách nhiệm của Source Adapter

Source Adapter trả lời:

```text
What candidates exist?

How do I fetch this candidate?

What immutable identity does it have?

Does fetched content match expected evidence?
```

Update Engine quyết định:

```text
Should this candidate replace current locked state?
```

---

# 153. Trách nhiệm của Resolver

Update Engine MUST sử dụng cùng một resolver được dùng bởi quá trình resolution project thông thường.

Nó MUST NOT triển khai một dependency solver độc lập.

---

# 154. Trách nhiệm của Policy

Update Engine MUST sử dụng cùng một Policy Engine như các luồng resolution/install thông thường.

MUST NOT tồn tại một "update policy" yếu hơn.

---

# 155. Trách nhiệm của Trust

Update Engine tiêu thụ kết quả đánh giá trust.

Nó SHOULD NOT tạo ra một hệ thống phân cấp trust độc lập.

---

# 156. Trách nhiệm của Lockfile

Module Lockfile sở hữu:

```text
serialization
schema
validation
atomic persistence contract
```

Update Engine cung cấp trạng thái đã resolve mới.

---

# 157. Trách nhiệm của CLI

CLI sở hữu:

```text
arguments
interactive confirmation
presentation
exit handling
```

Nó MUST NOT triển khai trực tiếp các quy tắc lựa chọn update.

---

# 158. Yêu cầu kiểm thử

Các test của Update Engine MUST bao gồm:

```text
no update available

single package patch

single package minor

dependency cascade

resolution conflict

source change

publisher change

trust downgrade

new transitive dependency

new sensitive capability

Policy rejection

integrity failure

dry run

atomic lock update

minimal unlock
```

---

# 159. Test tính tất định

Cùng một tập candidate với các thứ tự liệt kê khác nhau MUST tạo ra các Update Plan giống hệt nhau.

---

# 160. Test bảo mật cho Update

Các security regression test SHOULD bao gồm:

```text
malicious candidate source

integrity mismatch

source namespace substitution

trust self-escalation

new executable hook

overlay bypass attempt

Policy bypass attempt
```

---

# 161. Test E2E cho Update

Kịch bản cốt lõi:

```text
Given
  locked foo 1.0

And
  source contains foo 1.1

When
  update --dry-run

Then
  plan shows foo 1.0 → 1.1
  lockfile unchanged

When
  update

Then
  lockfile contains 1.1
  target artifacts unchanged

When
  build/install

Then
  target artifacts update
```

Sự tách biệt này MUST được kiểm thử một cách tường minh.

---

# 162. E2E cho Update transitive

Ví dụ:

```text
foo 1.0
└── bar 1

foo 2.0
└── bar 2
```

Việc cập nhật foo nên hiển thị rõ sự chuyển đổi của bar.

---

# 163. E2E cho thay đổi Trust

Ví dụ:

```text
foo 1.0
trusted-vendor
```

candidate:

```text
foo 1.1
source changed
community
```

Kỳ vọng:

```text
trust downgrade surfaced
Policy blocks update
lockfile unchanged
```

---

# 164. E2E cho Update Overlay

Ví dụ:

```text
vendor package
+
local overlay
```

Cập nhật upstream.

Kỳ vọng:

```text
overlay reapplied
effective package validated
```

hoặc:

```text
explicit overlay conflict
lockfile unchanged
```

---

# 165. Hiệu năng

Hiệu năng update SHOULD ưu tiên:

```text
minimal remote requests
metadata caching
minimal unlock
parallel candidate metadata fetch
```

mà không hy sinh tính tất định.

---

# 166. Khám phá song song

Metadata của candidate MAY được fetch đồng thời.

Việc đánh giá cuối cùng MUST chuẩn hóa kết quả trước khi lựa chọn tất định.

---

# 167. Cache

Metadata của source và các artifact đã fetch MAY được cache.

Cache MUST NOT làm thay đổi việc lựa chọn về mặt ngữ nghĩa.

Một cache hit và một cache miss nên tạo ra các Update Plan tương đương.

---

# 168. Giới hạn tài nguyên của Update

Việc khám phá candidate bên ngoài SHOULD tôn trọng các giới hạn tài nguyên về source/bảo mật.

Ví dụ:

```text
maximum versions inspected
maximum archive size
maximum metadata size
```

---

# 169. Phạm vi V1

V1 SHOULD hỗ trợ:

```text
full update

single-package update

source-scoped update

dry run

minimal unlock

semantic version updates

Git revision updates

trust diff

Policy evaluation

integrity verification

atomic lockfile update
```

---

# 170. Các tính năng hoãn lại

V1 SHOULD hoãn lại:

```text
automatic update scheduling

automatic update PR generation

auto-merge

publisher auto-switching

complex update policies

interactive dependency solver

AI update recommendations

remote update service
```

---

# 171. CLI ban đầu được khuyến nghị

V1:

```bash
agent-plugins update

agent-plugins update <package>

agent-plugins update --source <source>

agent-plugins update --dry-run

agent-plugins update --yes
```

Về sau:

```bash
--patch
--minor
--major
--to
--explain
```

---

# 172. Các bất biến của Update

Các nội dung sau đây mang tính quy chuẩn.

## Bất biến 1 — Update không cài đặt

Việc cập nhật dependency MUST NOT thay đổi các artifact native của target.

## Bất biến 2 — Trạng thái hiện tại vẫn hợp lệ khi thất bại

Các bản cập nhật thất bại MUST NOT thay thế một phần trạng thái đã lock.

## Bất biến 3 — Policy vẫn là authoritative

Update MUST NOT bỏ qua Policy.

## Bất biến 4 — Các thay đổi Trust luôn được hiển thị

Các thay đổi candidate liên quan đến trust MUST NOT bị che giấu.

## Bất biến 5 — Provenance được bảo toàn

Mọi trạng thái lock bên ngoài mới MUST giữ lại chính xác provenance.

## Bất biến 6 — Integrity được xác minh

Ở những nơi integrity là bắt buộc, integrity của candidate MUST được xác minh trước khi commit.

## Bất biến 7 — Phạm vi update tối thiểu

Các bản cập nhật có mục tiêu SHOULD tránh các thay đổi dependency không liên quan không cần thiết.

## Bất biến 8 — Cấu hình không bị âm thầm mở rộng

Update thông thường MUST NOT ghi lại các ràng buộc dependency để chấp nhận các phiên bản mới hơn.

## Bất biến 9 — Ngữ nghĩa Resolver được dùng chung

Update MUST sử dụng Resolver canonical.

## Bất biến 10 — Lựa chọn tất định

Các input update giống hệt nhau MUST tạo ra các plan giống hệt nhau.

---

# 173. Kiến trúc tham chiếu

```text
                 Source Adapters
                       │
                       ▼
               Candidate Metadata
                       │
                       ▼
┌─────────────────────────────────────────┐
│              Update Engine              │
│                                         │
│  Candidate Discovery                    │
│        ↓                                │
│  Constraint Evaluation                  │
│        ↓                                │
│  Integrity / Provenance                 │
│        ↓                                │
│  Trust Evaluation                       │
│        ↓                                │
│  Resolver                               │
│        ↓                                │
│  Policy                                 │
│        ↓                                │
│  Update Diff                            │
└───────────────────┬─────────────────────┘
                    │
                    ▼
               Update Plan
                    │
                    ▼
                 Approval
                    │
                    ▼
             New Lockfile
```

Sau đó, một cách độc lập:

```text
New Lockfile
    ↓
build
    ↓
Target Adapter
    ↓
install
```

---

# 174. Ranh giới trách nhiệm

```text
Source Adapter
    → discovers and fetches candidates

Trust Model
    → evaluates confidence/evidence

Resolver
    → computes valid dependency graph

Policy Engine
    → determines whether graph is permitted

Update Engine
    → compares old and candidate resolved states

Lockfile
    → persists exact reproducible state

Target Adapter
    → renders updated state later

CLI
    → presents and orchestrates
```

---

# 175. Quan hệ với Source Spec

`source-spec.md` định nghĩa:

```text
how candidates are discovered and fetched
```

`update-spec.md` định nghĩa:

```text
how candidates are evaluated against current locked state
```

---

# 176. Quan hệ với Resolution Spec

`resolution-spec.md` xác định:

```text
whether the candidate dependency graph is valid
```

Update Engine MUST NOT lặp lại hành vi của resolver.

---

# 177. Quan hệ với Lockfile Spec

`lockfile-spec.md` định nghĩa:

```text
how the selected update state becomes reproducible
```

Update Engine xác định khi nào một lockfile mới nên thay thế lockfile hiện tại.

---

# 178. Quan hệ với Trust Model

`trust-model.md` định nghĩa:

```text
trust levels
evidence
trust derivation
trust downgrade
```

Update Engine hiển thị các thay đổi trust nhưng không định nghĩa lại trust.

---

# 179. Quan hệ với Policy Spec

`policy-spec.md` quyết định:

```text
whether the candidate graph may be accepted
```

Một phiên bản mới hơn là không có ý nghĩa nếu Policy từ chối nó.

---

# 180. Quan hệ với Security Model

`security-model.md` định nghĩa các mối đe dọa liên quan đến update như:

```text
supply-chain compromise
source substitution
integrity mismatch
publisher compromise
new executable capabilities
```

`update-spec.md` định nghĩa những rủi ro đó được hiển thị ở đâu trong luồng update.

---

# 181. Quan hệ với Overlay Spec

`overlay-spec.md` định nghĩa cách các sửa đổi ngữ nghĩa cục bộ được áp dụng.

Update MUST áp dụng lại các overlay hiện có lên upstream candidate mới trước khi chấp nhận.

---

# 182. Quan hệ với Adapter Spec

Khả năng tương thích của Target Adapter MAY được validate trong quá trình lập kế hoạch update.

Tuy nhiên, adapter không lựa chọn phiên bản update.

---

# 183. Quan hệ với CLI Spec

`cli-spec.md` cung cấp:

```text
update
update --dry-run
update <package>
```

nhưng ngữ nghĩa update thực tế được định nghĩa tại đây.

---

# 184. Thứ tự triển khai được khuyến nghị

Triển khai Update Engine sau khi đã có:

```text
Source Model
Resolver
Policy
Trust
Lockfile
Overlay
```

Trình tự tối thiểu:

```text
1. UpdatePlan model

2. Candidate discovery abstraction

3. Semantic version candidate selection

4. Git revision candidate selection

5. Minimal unlock

6. Re-resolution

7. Trust comparison

8. Policy evaluation

9. Semantic diff

10. Atomic lockfile write

11. CLI update command

12. E2E tests
```

---

# 185. Tóm tắt quyết định cuối cùng

Kiến trúc update áp dụng:

```text
Update
    = controlled evolution of locked canonical state
```

chứ không phải:

```text
Update
    = fetch latest and overwrite everything
```

Quy trình chuẩn là:

```text
discover
→ verify
→ resolve
→ trust
→ policy
→ diff
→ approve
→ lock
```

và dừng lại một cách tường minh trước:

```text
build
→ install
```

Bất biến quan trọng nhất là:

> Một bản cập nhật có thể thay đổi những gì project được lock vào, nhưng nó không bao giờ được âm thầm thay đổi những gì được cài đặt, những gì được trust, hoặc những gì được cho phép.