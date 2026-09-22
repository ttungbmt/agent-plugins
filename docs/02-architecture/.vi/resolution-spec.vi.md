# Đặc tả Resolution

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.

## Tổng quan

Tài liệu này định nghĩa hành vi resolution tất định (deterministic) của `agent-plugins`.

Resolver chuyển đổi project intent ở mức cao thành một tập cụ thể, có thể tái tạo, gồm:

- các capability,
- các implementation được chọn,
- các component,
- các package,
- các phiên bản,
- các resolution decision,
- các diagnostic.

Resolver nằm giữa:

```text
Project Intent
    ↓
Capabilities
    ↓
Concrete Implementations
```

Trách nhiệm chính của nó là:

> **Với một project, catalog, policy, target và lock state cho trước, xác định tập implementation nhỏ nhất, hợp lệ và có thể tái tạo, thỏa mãn tất cả các capability bắt buộc.**

Resolver phải:

- tất định (deterministic),
- có thể giải thích (explainable),
- nhận biết policy (policy-aware),
- nhận biết target (target-aware),
- nhận biết lock (lock-aware),
- không có side effect khi khả thi.

---

# 1. Phạm vi

Đặc tả này định nghĩa:

```text
project expansion
preset expansion
capability collection
capability dependency expansion

candidate discovery
candidate eligibility

policy evaluation
target compatibility

project overrides
existing lock preference
implementation priority

cardinality handling
conflict resolution

component dependency resolution
package deduplication
version resolution

resolution output
diagnostics
explainability
```

Đặc tả này không định nghĩa:

```text
upstream discovery formats

runtime file rendering

package download implementation

CLI presentation

target-specific installation mechanics
```

Những nội dung đó thuộc về các đặc tả khác.

---

# 2. Input của Resolver

Resolver tiêu thụ một `ResolutionContext` đã được chuẩn hóa.

Về mặt khái niệm:

```text
ResolutionContext

├── Catalog
├── DistributionLock
├── Project
├── Profile
├── Presets
├── Policy
├── Target
├── ExistingProjectLock
└── Overrides
```

Mọi input được serialize nên được validate và chuẩn hóa trước khi đi vào thuật toán resolution cốt lõi.

---

# 3. Output của Resolver

Resolver tạo ra một `Resolution`.

Về mặt khái niệm:

```text
Resolution

├── requirements
├── capabilityGraph
├── resolvedCapabilities
├── selectedImplementations
├── selectedComponents
├── resolvedPackages
├── decisions
├── diagnostics
└── metadata
```

Một Resolution thành công phải chứa đủ thông tin để xây dựng:

```text
agent-plugins.lock
```

và để giải thích mọi quyết định lựa chọn quan trọng.

---

# 4. Tính thuần khiết của Resolution

Resolver cốt lõi về mặt khái niệm nên hoạt động như:

```text
resolve(context) → resolution
```

Nó không được trực tiếp:

```text
write files
install packages
modify runtime state
prompt users
fetch latest upstream versions
call an LLM
```

Mọi dữ liệu bên ngoài cần thiết phải được biểu diễn sẵn trong Resolution Context.

---

# 5. Tính tất định

Với các input đã chuẩn hóa tương đương:

```text
resolve(context A)
=
resolve(context B)
```

khi:

```text
context A
=
context B
```

Resolver không được phụ thuộc vào:

```text
filesystem enumeration order
network timing
random values
current clock time
LLM output
unstated global configuration
object insertion order
```

Mọi thứ tự ảnh hưởng đến output phải được định nghĩa tường minh.

---

# 6. Pipeline Resolution

Pipeline canonical là:

```text
1. Validate Resolution Context

2. Expand Profile

3. Expand Presets

4. Collect Capability Requirements

5. Apply Capability Enable/Disable Overrides

6. Deduplicate Requirements

7. Expand Capability Dependencies

8. Validate Capability Graph

9. Discover Candidate Implementations

10. Evaluate Candidate Availability

11. Apply Policy

12. Apply Target Compatibility

13. Validate Implementation Dependencies

14. Apply Explicit Implementation Overrides

15. Prefer Existing Valid Lock

16. Apply Resolver Preferences

17. Resolve Cardinality

18. Resolve Conflicts

19. Select Components

20. Resolve Component Dependencies

21. Deduplicate Packages

22. Resolve Package Versions

23. Validate Final Resolution

24. Produce Resolution Decisions

25. Produce Diagnostics

26. Return Resolution
```

Thứ tự này có ý nghĩa quan trọng.

---

# 7. Phase 1 — Validate Context

Trước khi semantic resolution bắt đầu, validate:

```text
Project exists

Profile exists

Presets exist

Policy exists

Targets exist

Capability references exist

Package references exist

Component references exist
```

Các lỗi cấu trúc phải fail trước bước candidate resolution.

Ví dụ:

```text
Unknown preset:
stacks/nonexistent
```

---

# 8. Phase 2 — Mở rộng Profile

Nếu Project chọn:

```yaml
profile: frontend-engineer
```

Resolver sẽ load Profile canonical.

Ví dụ:

```text
frontend-engineer

→ workflow/core
→ engineering/core
→ domains/frontend
→ stacks/typescript
```

Việc mở rộng Profile tạo ra các Preset requirement.

Việc mở rộng Profile không được resolve các publisher implementation.

---

# 9. Không có Profile Inheritance ẩn

Việc mở rộng Profile nên chủ yếu sử dụng:

```text
Profile
→ Presets
```

Không nên mặc định có inheritance nhiều tầng.

Nếu trong tương lai tồn tại inheritance nông (shallow), nó phải được mở rộng một cách tất định trước bước Preset resolution.

---

# 10. Phase 3 — Mở rộng Preset

Các tham chiếu Preset được mở rộng đệ quy.

Ví dụ:

```text
frontend-engineer

→ engineering/core

engineering/core

→ workflow/core
→ engineering/testing
→ engineering/debugging
```

Việc mở rộng Preset tiếp tục cho đến khi biết được tất cả các Preset có thể tiếp cận.

---

# 11. Phát hiện chu trình Preset

Đồ thị Preset phải không có chu trình (acyclic).

Không hợp lệ:

```text
A → B
B → C
C → A
```

Resolution fail với:

```text
PRESET_CYCLE
```

Diagnostic nên bao gồm toàn bộ chu trình khi có thể.

Ví dụ:

```text
Preset dependency cycle:

A → B → C → A
```

---

# 12. Phase 4 — Thu thập Capability Requirement

Sau khi mở rộng Preset, thu thập tất cả các Capability được yêu cầu.

Các nguồn có thể bao gồm:

```text
Profile Presets

Project Presets

Direct Project Capability Enables

Capability Dependencies
```

Mỗi requirement phải giữ lại provenance.

Ví dụ:

```text
engineering.testing.tdd

required by:
- frontend-engineer
  → engineering/core

- stacks/nextjs
  → frontend/testing
```

---

# 13. Provenance của Requirement

Provenance của requirement không nên bị loại bỏ trong quá trình deduplication.

Về mặt khái niệm:

```text
CapabilityRequirement

capability:
engineering.testing.tdd

sources:
- profile/frontend-engineer
  → preset/engineering/core

- preset/frontend/testing
```

Điều này hỗ trợ:

```text
ap explain
```

và diagnostic.

---

# 14. Requirement bắt buộc và tùy chọn

Về mặt khái niệm, một requirement có thể là:

```text
required
optional
```

Bắt buộc:

```text
must resolve successfully
```

Tùy chọn:

```text
may resolve if available
```

Ban đầu V1 có thể xem tất cả các capability được yêu cầu tường minh là bắt buộc.

Data model nên chừa chỗ cho các requirement tùy chọn.

---

# 15. Phase 5 — Capability Override

Các override của Project được áp dụng lên capability intent đã thu thập.

Các khái niệm được hỗ trợ:

```text
enable

disable
```

Ví dụ:

```yaml
overrides:
  capabilities:
    enable:
      - security.review

    disable:
      - tooling.browser
```

---

# 16. Enable Override

Một enable override tạo thêm một Capability Requirement.

Ví dụ:

```text
security.review
```

trở thành một phần của desired state ngay cả khi không có Profile hay Preset nào yêu cầu nó.

---

# 17. Disable Override

Một disable override triệt tiêu intent được kế thừa.

Ví dụ:

```text
frontend-engineer
→ tooling.browser

Project:
disable tooling.browser
```

Tuy nhiên, việc disable một Capability không tự động âm thầm làm vô hiệu các capability phụ thuộc vào nó.

---

# 18. Disable và Hard Dependency

Giả sử:

```text
engineering.testing.e2e
→ requires tooling.browser
```

và Project disable:

```text
tooling.browser
```

trong khi vẫn yêu cầu:

```text
engineering.testing.e2e
```

Resolution phải fail.

Ví dụ diagnostic:

```text
CAPABILITY_DISABLED_BUT_REQUIRED

tooling.browser

Disabled by:
project override

Still required by:
engineering.testing.e2e
```

Resolver không được âm thầm khôi phục hoặc âm thầm bỏ qua dependency.

---

# 19. Phase 6 — Deduplication Requirement

Các capability requirement được deduplicate theo Capability ID canonical.

Input:

```text
engineering.testing.tdd
engineering.debugging
engineering.testing.tdd
engineering.review
```

Sau khi chuẩn hóa:

```text
engineering.testing.tdd
engineering.debugging
engineering.review
```

Provenance của requirement được merge lại.

---

# 20. Vì sao Deduplication diễn ra trước Resolution

Các Preset không được resolve một cách độc lập.

Sai:

```text
Preset A
→ resolve TDD Publisher A

Preset B
→ resolve TDD Publisher B

merge later
```

Đúng:

```text
Preset A ─┐
          ├→ engineering.testing.tdd
Preset B ─┘
                  ↓
          one resolution process
```

Điều này ngăn chặn việc sở hữu ngữ nghĩa bị trùng lặp.

---

# 21. Phase 7 — Mở rộng Capability Dependency

Capability có thể khai báo các dependency ngữ nghĩa.

Ví dụ:

```text
engineering.testing.e2e
→ tooling.browser
```

Resolver thêm các capability bắt buộc một cách đệ quy.

---

# 22. Provenance của Capability Dependency

Các requirement được tạo ra từ dependency nên giữ lại đường dẫn nguồn của chúng.

Ví dụ:

```text
tooling.browser

required by:

frontend-engineer
→ engineering/testing
→ engineering.testing.e2e
→ tooling.browser
```

Đường dẫn dependency này phải sẵn có cho diagnostic.

---

# 23. Chu trình Capability Dependency

Đồ thị Capability phải không có chu trình.

Không hợp lệ:

```text
Capability A
→ B
→ C
→ A
```

Resolution fail với:

```text
CAPABILITY_CYCLE
```

---

# 24. Phase 8 — Validate Capability Graph

Sau khi mở rộng dependency:

```text
validate all capability nodes

validate all dependency edges

verify no disabled hard dependency

verify no cycles

verify lifecycle constraints
```

Các capability deprecated có thể tạo ra warning.

Các capability đã bị removed thông thường nên làm fail resolution mới.

---

# 25. Phase 9 — Candidate Discovery

Với mỗi Capability bắt buộc, tìm tất cả các Capability Implementation đã được đăng ký.

Ví dụ:

```text
engineering.testing.tdd

Candidates:

Superpowers
Matt Pocock
ECC
```

Candidate discovery sử dụng các implementation mapping đã được curate.

Nó không quét các repository tùy ý trong quá trình resolution cốt lõi.

---

# 26. Candidate Model

Về mặt khái niệm:

```text
Candidate

├── capability
├── component
├── package
├── publisher
├── priority
├── status
├── targetCompatibility
├── provenance
├── dependencies
├── conflicts
└── securityMetadata
```

---

# 27. Trạng thái ban đầu của Candidate

Tất cả các implementation đã được map và discover về mặt khái niệm đều bắt đầu ở trạng thái:

```text
Candidate
```

Sau đó chúng chuyển sang:

```text
Eligible
Rejected
Suppressed
Selected
```

---

# 28. Không có Candidate

Nếu một Capability bắt buộc không có implementation nào đã biết:

```text
NO_IMPLEMENTATION
```

Ví dụ:

```text
No implementation registered for:

security.specialized-audit
```

Capability bắt buộc:

```text
→ resolution failure
```

Capability tùy chọn:

```text
→ warning
```

---

# 29. Phase 10 — Tính sẵn có của Candidate

Trước khi đánh giá policy, xác định xem Candidate có tồn tại trong distribution state đã chọn hay không.

Kiểm tra:

```text
Package available

Component available

selected distribution version contains Component

implementation not removed

required immutable reference available
```

Các candidate không sẵn có sẽ bị reject.

---

# 30. Trạng thái vòng đời của Candidate

Trạng thái của implementation có thể bao gồm:

```text
active

deprecated

disabled

removed
```

Hành vi mặc định:

```text
active
→ eligible for normal resolution

deprecated
→ eligible with warning / lower preference

disabled
→ reject

removed
→ reject for new resolution
```

Các quy tắc tái tạo lock hiện có có thể xử lý các implementation deprecated hoặc removed theo cách khác khi artifact đã lock vẫn còn sẵn có.

---

# 31. Phase 11 — Đánh giá Policy

Policy đánh giá từng Candidate sẵn có.

Về mặt khái niệm:

```text
Candidate
+
Policy
→ PolicyDecision
```

Các quyết định có thể có:

```text
allow

deny

review

prompt
```

---

# 32. Policy là một lớp Hard Eligibility

Một Candidate bị deny sẽ bị reject.

Ví dụ:

```text
Candidate A
priority: 100
trust: community

Policy:
deny community

Result:
Candidate A rejected
```

Độ ưu tiên cao hơn không bao giờ được ghi đè việc policy deny.

---

# 33. Kết quả Policy dạng Review và Prompt

Resolver cốt lõi phải luôn không tương tác (non-interactive).

Do đó:

```text
review
prompt
```

nên trở thành các trạng thái có cấu trúc hoặc diagnostic.

Application Layer quyết định xem:

```text
interactive approval is possible
```

hay:

```text
CI must fail
```

V1 có thể đơn giản hóa kết quả policy thành:

```text
allow
deny
```

nếu cần thiết.

---

# 34. Policy Decision Trace

Với mỗi lần policy reject, ghi lại:

```text
policy ID

rule

Candidate

reason
```

Ví dụ:

```text
Candidate:
publisher-a/security-review

Rejected:
trust level community is denied by strict policy
```

---

# 35. Phase 12 — Tương thích Target

Mỗi Candidate còn lại được đánh giá dựa trên Target đã chọn.

Về mặt khái niệm:

```text
Candidate
+
TargetDescriptor
→ CompatibilityDecision
```

Các trạng thái có thể có:

```text
supported

partial

unsupported
```

---

# 36. Candidate không được hỗ trợ

Một Candidate không được hỗ trợ sẽ bị reject đối với Target hiện tại.

Ví dụ:

```text
Candidate requires hooks.

Target does not support hooks.

→ TARGET_UNSUPPORTED
```

---

# 37. Hỗ trợ một phần

Hỗ trợ một phần (partial support) nên được thể hiện tường minh.

Việc hỗ trợ một phần có chấp nhận được hay không phụ thuộc vào:

```text
Capability requirement

Policy

Target rules
```

Đối với các Capability bắt buộc, hỗ trợ một phần không nên âm thầm được tính là thỏa mãn đầy đủ, trừ khi được mô hình hóa tường minh.

---

# 38. Lựa chọn Target và Project nhiều Target

Với một Target duy nhất:

```text
resolve(Target A)
```

Với nhiều Target, kiến trúc được khuyến nghị là:

```text
Shared Desired Capability Set
        ↓
Resolve per Target
```

thay vì ép một tập implementation duy nhất trên tất cả các runtime.

Về mặt khái niệm:

```text
Project
├── Target Claude
│   └── Resolution A
└── Target Codex
    └── Resolution B
```

V1 có thể chỉ hỗ trợ một Target.

---

# 39. Phase 13 — Validate Implementation Dependency

Candidate có thể phụ thuộc vào:

```text
Components

Packages

runtime primitives
```

Implementation dependency khác biệt với Capability dependency.

Ví dụ:

```text
security-review-agent
→ requires security-rules
```

Candidate chỉ đủ điều kiện nếu các implementation dependency bắt buộc có thể được thỏa mãn.

---

# 40. Component Dependency bắc cầu

Các Component dependency được mở rộng theo kiểu bắc cầu (transitive).

Ví dụ:

```text
Component A
→ Component B
→ Component C
```

Đồ thị dependency phải được validate.

---

# 41. Chu trình Component Dependency

Các chu trình trong đồ thị implementation dependency nên fail, trừ khi định dạng package cho phép tường minh một chu trình an toàn.

Mặc định:

```text
Component dependency cycle
→ error
```

---

# 42. Phase 14 — Explicit Implementation Override

Một Project có thể chọn tường minh một implementation.

Ví dụ:

```yaml
overrides:
  implementations:
    engineering.testing.tdd:
      component: mattpocock/skills#skill:tdd
```

Một explicit implementation override là một preference mạnh.

Nó không phải là một cơ chế bypass không giới hạn.

---

# 43. Tính đủ điều kiện của Override

Candidate được chọn tường minh vẫn phải thỏa mãn:

```text
availability

policy

target compatibility

hard dependencies

hard conflicts
```

Nếu không thỏa mãn:

```text
INVALID_IMPLEMENTATION_OVERRIDE
```

Resolver không được âm thầm fallback, trừ khi manifest yêu cầu tường minh hành vi fallback.

---

# 44. Thứ tự ưu tiên của Override

Trong số các candidate đủ điều kiện:

```text
Explicit Project Implementation Override
```

có user preference cao nhất.

Về mặt khái niệm:

```text
Override
>
Existing Lock Preference
>
Policy Preference
>
Catalog Priority
```

Nhưng:

```text
Hard Constraints
>
Override
```

---

# 45. Phase 15 — Ưu tiên Lock hiện có

Sync thông thường nên giữ lại một locked implementation hợp lệ hiện có khi có thể.

Ví dụ:

Lock hiện tại:

```text
engineering.testing.tdd
→ Superpowers v6.3
```

Catalog hiện cũng chứa một implementation khác hợp lệ tương đương.

Thao tác thông thường:

```text
ap sync
```

không nên chuyển đổi implementation khi không có lý do.

---

# 46. Nguyên tắc ổn định Lock

Nếu:

```text
desired semantic state unchanged

locked implementation still eligible

locked version still valid
```

thì:

```text
preserve locked implementation
```

Điều này giảm thiểu những thay đổi không cần thiết (churn).

---

# 47. Ưu tiên Lock không phải là tuyệt đối

Lock hiện có không được giữ lại khi:

```text
implementation no longer exists

policy now rejects it

target no longer supports it

required dependency missing

explicit project override changed

package version unavailable

security policy invalidates it
```

Trong những trường hợp đó Resolver phải xem xét lại các candidate.

---

# 48. Update Mode và Normal Mode

Về mặt khái niệm, Resolver nên hỗ trợ ít nhất hai hành vi:

```text
normal resolution

update resolution
```

Normal:

```text
preserve valid lock
```

Update:

```text
allow reconsideration of newer curated state
```

Update không có nghĩa là bỏ qua policy.

---

# 49. Resolution Mode

Về mặt khái niệm:

```text
mode: sync
mode: update
mode: fresh
```

Các ngữ nghĩa có thể có:

```text
fresh
→ no existing lock

sync
→ prefer existing valid lock

update
→ intentionally reconsider selected versions / candidates
```

API chính xác thuộc về phần implementation.

---

# 50. Phase 16 — Preference của Resolver

Sau các bước hard eligibility và explicit override, áp dụng các soft preference.

Các nguồn preference tiềm năng:

```text
existing lock

policy publisher preference

target-specific preference

catalog implementation priority
```

Những nguồn này phải có thứ tự được định nghĩa.

---

# 51. Thứ tự Preference canonical

Với V1, thứ tự khuyến nghị:

```text
1. Explicit Project Implementation Override

2. Existing Valid Lock
   in normal sync mode

3. Policy-Specific Preference

4. Target-Specific Preference

5. Catalog Implementation Priority

6. Deterministic final tie handling
```

Các bước kiểm tra hard eligibility luôn diễn ra trước thứ tự này.

---

# 52. Policy Preference

Một Policy có thể ưu tiên:

```text
official

curated

first-party
```

mà không nhất thiết deny các Candidate khác.

Ví dụ:

```text
prefer official
allow curated
allow community
```

Điều này ảnh hưởng đến việc xếp hạng các candidate đủ điều kiện.

---

# 53. Catalog Priority

Mỗi Capability Implementation có thể định nghĩa một priority mặc định.

Ví dụ:

```text
Superpowers 100
Matt Pocock 80
ECC 70
```

Priority là một preference của catalog, không phải một điểm chất lượng phổ quát.

---

# 54. Preference đặc thù theo Target

Một Candidate có thể đặc biệt phù hợp với một runtime.

Về mặt khái niệm:

```text
Capability X

Claude Code:
prefer implementation A

Codex:
prefer implementation B
```

Target preference phải tường minh và tất định.

---

# 55. So sánh Preference

Resolver nên chuyển đổi các tín hiệu preference thành một chiến lược so sánh tất định.

Tránh các cơ chế tính điểm ẩn như:

```text
magic weighted score
```

trừ khi được ghi lại đầy đủ trong documentation.

Ưu tiên thứ tự ưu tiên theo kiểu từ điển (lexicographic):

```text
override
then lock
then policy preference
then target preference
then catalog priority
```

Cách này dễ giải thích hơn.

---

# 56. Candidate Ranking Tuple

Về mặt khái niệm, một Candidate đủ điều kiện có thể nhận:

```text
PreferenceTuple

(
  explicitOverride,
  lockMatch,
  policyPreference,
  targetPreference,
  catalogPriority
)
```

Các Candidate được so sánh theo thứ tự từ điển.

Cách biểu diễn chính xác có thể khác.

---

# 57. Vì sao dùng thứ tự ưu tiên Lexicographic

Thứ tự ưu tiên lexicographic giúp cho:

```text
ap explain
```

trở nên rõ ràng.

Ví dụ:

```text
Selected because:

1. no explicit override existed
2. candidate matched current lock
3. candidate satisfied policy
```

thay vì:

```text
selected because score = 83.72
```

---

# 58. Phase 17 — Cardinality Resolution

Sau các bước eligibility và preference:

```text
apply Capability cardinality
```

Được hỗ trợ:

```text
one

many
```

---

# 59. Cardinality One

Với:

```text
cardinality: one
```

Resolver phải chọn tối đa một Candidate.

Các trường hợp:

```text
0 eligible
→ fail if required

1 eligible
→ select

>1 eligible
→ compare preference
```

---

# 60. Winner duy nhất

Nếu một Candidate được ưu tiên hơn một cách nghiêm ngặt:

```text
select winner
```

Tất cả các candidate đủ điều kiện khác trở thành:

```text
Suppressed
```

---

# 61. Winner mơ hồ

Nếu nhiều Candidate vẫn tương đương sau khi áp dụng tất cả các quy tắc preference đã định nghĩa:

```text
AMBIGUOUS_RESOLUTION
```

Hành vi khuyến nghị:

```text
fail
```

thay vì âm thầm chọn theo thứ tự bảng chữ cái.

Ví dụ:

```text
engineering.testing.tdd

Candidate A
Candidate B

same effective preference

→ require explicit override
```

---

# 62. Tie-Breaker tất định cuối cùng

Một tie-breaker theo canonical ID chỉ có thể được sử dụng cho các trường hợp mà lựa chọn ngữ nghĩa không quan trọng.

Đối với các capability quan trọng liên quan đến quyền sở hữu workflow:

```text
ambiguity error
```

được ưu tiên hơn.

Capability cuối cùng có thể định nghĩa một tie policy.

---

# 63. Cardinality Many

Với:

```text
cardinality: many
```

tất cả các Candidate đủ điều kiện và không xung đột đều có thể được chọn, trừ khi áp dụng thêm các quy tắc lựa chọn khác.

Điều này không có nghĩa là:

```text
select everything automatically
```

nếu Capability định nghĩa ngữ nghĩa lựa chọn tường minh.

Hành vi mặc định của V1 có thể là:

```text
select all eligible compatible candidates
```

đối với `many`.

---

# 64. Cardinality Many và sự ổn định của Lock

Sync thông thường nên tránh thêm các implementation `many` mới được discover chỉ vì catalog thay đổi, nếu lock được dùng để cố định môi trường hiện tại.

Do đó:

```text
sync mode
→ preserve valid selected set

update/fresh mode
→ evaluate full eligible set
```

Điều này ngăn môi trường âm thầm phình to.

---

# 65. Phase 18 — Conflict Resolution

Sau bước lựa chọn sơ bộ, validate các conflict.

Các loại conflict:

```text
cardinality conflict

explicit Component conflict

Package conflict

runtime conflict

dependency conflict
```

---

# 66. Cardinality Conflict

Thông thường được giải quyết trong bước lựa chọn theo cardinality.

Nếu vẫn còn hai implementation đang active cho:

```text
cardinality: one
```

thì Resolution không hợp lệ.

---

# 67. Explicit Component Conflict

Ví dụ:

```text
Component A
conflictsWith Component B
```

Nếu cả hai đều được chọn:

```text
resolve using preference
```

chỉ khi một trong hai có thể bị suppress một cách an toàn mà không làm hỏng các capability bắt buộc.

Nếu không:

```text
HARD_COMPONENT_CONFLICT
```

---

# 68. Cross-Capability Conflict

Giả sử:

```text
Capability A
→ Component X

Capability B
→ Component Y

X conflicts with Y
```

Resolver có thể cần tìm một implementation thay thế cho A hoặc B.

Điều này phức tạp hơn việc xếp hạng cho một capability đơn lẻ.

---

# 69. Backtracking khi có Conflict

V1 nên hỗ trợ backtracking tất định có giới hạn khi cần thiết.

Ví dụ:

```text
A has:
X1
X2

B has:
Y1

X1 conflicts with Y1
X2 does not
```

Resolver nên có khả năng chọn:

```text
A → X2
B → Y1
```

thay vì fail ngay lập tức.

---

# 70. Phạm vi Backtracking

Tránh implement một SAT solver tổng quát không giới hạn trong V1, trừ khi cần thiết.

Khuyến nghị:

```text
deterministic bounded search
```

trên các tổ hợp Candidate đối với các conflict chưa được giải quyết.

Các đồ thị dự kiến trong V1 đủ nhỏ để dùng các chiến lược đơn giản.

---

# 71. Mục tiêu tìm kiếm khi có Conflict

Khi tồn tại các lời giải hợp lệ thay thế, lựa chọn theo cùng thứ tự preference.

Resolver nên tìm kiếm:

```text
valid solution
with maximal preference preservation
```

chứ không chỉ đơn thuần là lời giải đầu tiên gặp được.

---

# 72. Tính tất định của Conflict Resolution

Thứ tự tìm kiếm phải ổn định.

Các Candidate nên được sắp xếp theo:

```text
effective preference
then canonical ID
```

để duyệt một cách tất định.

---

# 73. Conflict không thể thỏa mãn

Nếu không tồn tại tổ hợp hợp lệ nào:

```text
UNSATISFIABLE_RESOLUTION
```

Diagnostic nên hiển thị các đường dẫn xung đột.

Ví dụ:

```text
Capability A requires Component X.

Capability B requires Component Y.

X conflicts with Y.

No alternative implementations are available.
```

---

# 74. Phase 19 — Các Component được chọn

Sau bước capability resolution:

```text
Capability
→ Selected Implementation
→ Component(s)
```

Thu thập tất cả các Component được chọn.

Một Component có thể thỏa mãn nhiều Capability.

Nó chỉ nên xuất hiện một lần trong tập Component được chọn.

---

# 75. Provenance của việc chọn Component

Với mỗi Component được chọn, giữ lại thông tin Capability nào đã khiến nó được chọn.

Ví dụ:

```text
architecture-agent

selected for:
- engineering.architecture
- engineering.codebase-design
```

Điều này hỗ trợ việc giải thích package.

---

# 76. Phase 20 — Component Dependency Resolution

Các Component được chọn có thể yêu cầu thêm các Component khác.

Ví dụ:

```text
selected Component A
→ requires Component B
```

B trở thành một phần của implementation state.

Tuy nhiên, dependency Component B không tự động trở thành một Capability Implementation được chọn, trừ khi được map tường minh như vậy.

---

# 77. Dependency Component và Capability Implementation

Ví dụ:

```text
Component B
```

được cài đặt vì Component A yêu cầu nó.

Điều này không nhất thiết có nghĩa là:

```text
Capability X
→ Component B selected
```

Giữ cho việc lựa chọn ngữ nghĩa và implementation dependency tách biệt.

---

# 78. Tính đủ điều kiện của Component Dependency

Các dependency Component vẫn phải thỏa mãn các ràng buộc cứng liên quan như:

```text
availability

target support

security policy
```

Các dependency Component có khả năng thực thi không được bypass Policy chỉ vì chúng là dependency bắc cầu.

---

# 79. Bảo mật với Dependency ẩn

Nếu một skill có vẻ vô hại lại yêu cầu:

```text
external executable hook
```

Policy phải đánh giá hook đó.

Các dependency bắc cầu không thể bypass security governance.

---

# 80. Phase 21 — Package Deduplication

Map các Component được chọn và các dependency Component sang Package.

Ví dụ:

```text
Component A ─┐
Component B ─┼→ Package X
Component C ─┘
```

Package X xuất hiện một lần.

---

# 81. Ngữ nghĩa kích hoạt Package

Việc cài đặt Package X không ngụ ý rằng mọi Component trong X đều được chọn.

Resolution phải phân biệt:

```text
required package
```

với:

```text
selected component
```

---

# 82. Provenance của Package

Với mỗi Package, giữ lại:

```text
Publisher

source

selected version/ref

Components requiring package
```

Ví dụ:

```text
Package:
superpowers

required by:
- planning
- debugging
- verification

TDD component:
present in package but suppressed
```

---

# 83. Phase 22 — Version Resolution

Sau khi đã biết các Package bắt buộc, resolve các phiên bản cụ thể.

Input có thể bao gồm:

```text
Distribution Lock

Project Lock

Package constraints

Target constraints

Update mode
```

---

# 84. Thứ tự ưu tiên trong Version Resolution

Ngữ nghĩa khuyến nghị:

Sync thông thường:

```text
1. Existing Project Lock version
   if still valid

2. Distribution Lock pinned version

3. fail if no approved version available
```

Fresh resolution:

```text
1. Distribution Lock pinned version

2. fail if unavailable
```

Update resolution:

```text
1. newly selected approved Distribution Lock state
```

V1 không nên resolve các phiên bản latest tùy ý của upstream trong quá trình project resolution thông thường.

---

# 85. Distribution Lock như ranh giới phiên bản

Resolver phía consumer thông thường nên chọn từ các phiên bản đã được phê duyệt bởi:

```text
catalog.lock
```

chứ không phải từ toàn bộ lịch sử của remote publisher.

Điều này tách biệt:

```text
distribution curation
```

với:

```text
consumer project resolution
```

---

# 86. Immutable Reference

Một Package đã được resolve nên ưu tiên kết thúc với:

```text
version
+
immutable reference
```

Ví dụ:

```text
version: 6.4.0
commit: abc123...
```

Nếu không tồn tại immutable reference, chất lượng khả năng tái tạo nên được phản ánh trong diagnostic hoặc metadata.

---

# 87. Version Conflict

Nếu các ràng buộc của Package không thể được thỏa mãn:

```text
PACKAGE_VERSION_CONFLICT
```

Diagnostic nên bao gồm:

```text
Package

constraints

requesting Components

available curated version
```

---

# 88. Phase 23 — Validate Resolution cuối cùng

Trước khi Resolution thành công, validate:

```text
every required Capability is satisfied

cardinality constraints hold

all selected Components exist

all Component dependencies satisfied

all Package dependencies satisfied

all selected versions valid

all selected Candidates policy-compliant

all selected Candidates target-compatible

no unresolved hard conflicts
```

---

# 89. Validate tính tối giản

Khi khả thi, kiểm tra rằng không có Component được chọn nào tồn tại mà không có ít nhất một trong các yếu tố:

```text
Capability selection

Component dependency

Package requirement
```

Điều này ngăn môi trường vô tình phình to.

---

# 90. Phase 24 — Resolution Decision

Resolver phải ghi lại các decision trong khi resolve.

Các loại decision có thể bao gồm:

```text
required

enabled

disabled

candidate-found

candidate-rejected

candidate-suppressed

candidate-selected

dependency-added

package-added

lock-preserved

override-applied

conflict-resolved
```

---

# 91. Cấu trúc Resolution Decision

Về mặt khái niệm:

```text
ResolutionDecision

├── code
├── entity
├── outcome
├── reason
├── source
├── relatedEntities
└── dependencyPath
```

---

# 92. Ví dụ Decision Selected

```text
Capability:
engineering.testing.tdd

Candidate:
superpowers/...#skill:test-driven-development

Outcome:
selected

Reasons:
- allowed by policy
- target compatible
- existing lock match
```

---

# 93. Ví dụ Decision Suppressed

```text
Candidate:
mattpocock/...#skill:tdd

Outcome:
suppressed

Reason:
another eligible candidate has stronger lock preference
```

---

# 94. Ví dụ Decision Rejected

```text
Candidate:
community-publisher/...#skill:tdd

Outcome:
rejected

Reason:
trust level community denied by strict policy
```

---

# 95. Phase 25 — Diagnostic

Diagnostic được tạo ra cho:

```text
errors

warnings

informational conditions
```

Chúng nên sử dụng các mã ổn định.

---

# 96. Mức độ nghiêm trọng của Diagnostic

Khuyến nghị:

```text
error

warning

info
```

Error làm Resolution trở nên không hợp lệ.

Warning cho phép Resolution nhưng chỉ ra trạng thái bị suy giảm hoặc đáng lưu ý.

---

# 97. Các mã Diagnostic cốt lõi

Các mã ban đầu được khuyến nghị:

```text
UNKNOWN_PROFILE

UNKNOWN_PRESET

UNKNOWN_CAPABILITY

UNKNOWN_COMPONENT

UNKNOWN_PACKAGE

PRESET_CYCLE

CAPABILITY_CYCLE

COMPONENT_CYCLE

CAPABILITY_DISABLED_BUT_REQUIRED

NO_IMPLEMENTATION

POLICY_DENIED

TARGET_UNSUPPORTED

INVALID_IMPLEMENTATION_OVERRIDE

AMBIGUOUS_RESOLUTION

HARD_COMPONENT_CONFLICT

UNSATISFIABLE_RESOLUTION

PACKAGE_VERSION_CONFLICT

LOCK_INVALID

LOCK_STALE

DEPRECATED_IMPLEMENTATION

OPTIONAL_CAPABILITY_UNAVAILABLE
```

Cách đặt tên chính xác có thể thay đổi theo thời gian.

---

# 98. Yêu cầu đối với Diagnostic

Một diagnostic hữu ích nên trả lời được:

```text
What failed?

Which entity failed?

Why?

What requested it?

What can the user do?
```

---

# 99. Dependency Path trong Diagnostic

Ví dụ:

```text
Unable to resolve:

security.review

Required by:

Project
→ backend-engineer
→ engineering/security
→ security.review

Reason:
all implementations rejected by policy
```

---

# 100. Explainability

Explainability là một phần của contract của Resolver.

Hệ thống không nên cố gắng tái dựng toàn bộ lập luận về sau chỉ từ các lựa chọn cuối cùng.

Resolver nên lưu giữ đủ decision metadata.

---

# 101. `ap explain <capability>`

Đối với một Capability, phần giải thích nên bao gồm:

```text
Capability identity

Requirement sources

Dependencies

All considered Candidates

Eligibility results

Policy decisions

Target decisions

Preference comparison

Selected implementation

Suppressed implementations

Rejected implementations

Resolved Package/version
```

---

# 102. Ví dụ Output của Explain

```text
Capability:
engineering.testing.tdd

Cardinality:
one

Required by:
frontend-engineer
→ engineering/core

Candidates:

Superpowers
  status: selected
  target: supported
  policy: allowed
  priority: 100
  lock: matched

Matt Pocock
  status: suppressed
  target: supported
  policy: allowed
  priority: 80

ECC
  status: rejected
  policy: denied

Selected:
superpowers/superpowers#skill:test-driven-development
```

---

# 103. `ap explain package <package>`

Phần giải thích Package nên bao gồm:

```text
why Package is required

selected Components in Package

dependency Components

Capabilities associated with those Components

resolved version

Publisher provenance
```

---

# 104. Thứ tự ổn định

Output của Resolution phải sử dụng thứ tự ổn định canonical.

Cách sắp xếp khuyến nghị:

Capability:

```text
canonical capability ID
```

Package:

```text
publisher ID
then package ID
```

Component:

```text
canonical Component reference
```

Diagnostic:

```text
severity
then code
then entity ID
```

Thứ tự ổn định cải thiện:

```text
lockfile diffs

tests

reproducibility

reviewability
```

---

# 105. Xây dựng Lockfile

Chỉ một Resolution thành công mới có thể tạo ra một Project Lockfile mới.

Lockfile Builder tiêu thụ:

```text
Resolution
```

và không được tự chọn các phương án thay thế một cách độc lập.

---

# 106. Nội dung ngữ nghĩa của Lockfile

Tối thiểu, lockfile nên có khả năng biểu diễn:

```text
resolution format version

catalog/distribution identity

target

Capabilities

selected implementations

Components

Packages

versions

immutable refs

integrity

provenance
```

Schema chính xác thuộc về `lockfile-spec.md`.

---

# 107. Selection Trace trong Lockfile

Lockfile có thể lưu trữ metadata về lý do lựa chọn đủ cho việc giải thích cơ bản.

Tuy nhiên, toàn bộ lịch sử các candidate bị reject không nhất thiết phải được lưu trữ vĩnh viễn.

Sự đánh đổi (trade-off) này thuộc về `lockfile-spec.md`.

---

# 108. Lock Hash / Context Fingerprint

Để phát hiện drift, hệ thống nên cân nhắc tính toán một fingerprint tất định từ các input quan trọng của Resolution.

Các input tiềm năng:

```text
normalized Project manifest

Profile content

Preset content

Policy content

Capability catalog identity

Distribution Lock identity

Target identity
```

Về mặt khái niệm:

```text
resolutionInputHash
```

Điều này giúp xác định lock state bị lỗi thời.

---

# 109. Manifest-Lock Drift

Nếu fingerprint của semantic input khác nhau:

```text
LOCK_STALE
```

Hệ thống nên phân biệt:

```text
manifest changed

catalog changed

policy changed

target changed
```

khi khả thi.

---

# 110. Catalog thay đổi mà không cập nhật Project

Một catalog mới hơn có thể tồn tại trong khi Project Lock vẫn hợp lệ.

Sync thông thường không nhất thiết phải chỉnh sửa lock.

Hệ thống có thể báo cáo:

```text
update available
```

thay vì:

```text
lock stale
```

nếu locked state vẫn hợp lệ trong distribution context đã chọn hiện tại.

---

# 111. Định danh Distribution

Một Project Lock nên ghi lại đủ thông tin định danh distribution để biết trạng thái curated catalog nào đã tạo ra nó.

Biểu diễn có thể có:

```text
catalog version

catalog commit

catalog digest
```

Biểu diễn chính xác thuộc về đặc tả lockfile.

---

# 112. Các Resolution Mode

Các mode khuyến nghị:

## Fresh

Không có Project Lock hiện có nào sử dụng được.

```text
resolve from current approved distribution state
```

## Sync

Sử dụng desired state trong khi giữ lại các locked selection hợp lệ.

```text
stability first
```

## Update

Chủ đích xem xét lại các lựa chọn upstream/package.

```text
new approved state may replace locked state
```

---

# 113. Fresh Resolution

Fresh resolution sử dụng:

```text
Project

Catalog

Policy

Target

Distribution Lock
```

Không tồn tại lock preference.

---

# 114. Sync Resolution

Sync sử dụng Existing Project Lock như một preference mạnh.

Nó vẫn có thể thay đổi lock khi:

```text
Project intent changed

Policy changed incompatibly

Target changed

locked implementation unavailable

locked implementation invalid
```

---

# 115. Update Resolution

Update mode có thể xem xét lại:

```text
Package versions

implementation choices

newly available candidates
```

tùy theo user intent.

Các thay đổi do update phải luôn tường minh và có thể review được.

---

# 116. Update không có nghĩa là tái cấu thành mọi thứ

Cuối cùng nên hỗ trợ các phạm vi update khác nhau.

Ví dụ:

```text
update package version only

update one Publisher

update one Capability implementation

update all curated dependencies
```

Ban đầu V1 có thể hỗ trợ một workflow update global/theo publisher đơn giản hơn.

---

# 117. Resolution và Sync

Resolver:

```text
decides desired concrete state
```

Sync:

```text
reconciles actual runtime state
```

Không gộp chúng lại với nhau về mặt khái niệm.

Luồng:

```text
Project
↓
Resolver
↓
Resolution
↓
Target Adapter
↓
Materialization Plan
↓
Sync
```

---

# 118. Resolver không kiểm tra Runtime State tùy ý

Runtime state không nên ảnh hưởng đến việc lựa chọn ngữ nghĩa, ngoại trừ thông qua managed/lock context tường minh.

Ví dụ, Plugin X được cài đặt thủ công không nên tự động trở thành winner cho TDD chỉ vì nó đã tồn tại.

---

# 119. Tối ưu hóa Managed Runtime

Target Adapter có thể tránh cài đặt lại một Package đã đúng.

Đó là một tối ưu hóa ở bước materialization.

Nó không được thay đổi Resolution về mặt ngữ nghĩa.

---

# 120. Resolution và Bảo mật

Các Component nhạy cảm về bảo mật bao gồm:

```text
hooks

scripts

commands

MCP servers

external binaries
```

Mọi Component nhạy cảm về bảo mật, dù được chọn hay là bắc cầu, đều phải hiển thị với bước đánh giá Policy.

---

# 121. Quy tắc bảo mật cho Dependency

Không đường dẫn dependency nào được bypass Policy.

Sai:

```text
Selected Skill
→ hidden executable Hook
→ automatically allowed
```

Đúng:

```text
Selected Skill
→ Hook dependency
→ Policy evaluation
→ allowed / rejected
```

---

# 122. Trust không được kế thừa một cách mù quáng

Nếu:

```text
Package trust = curated
```

một Component nhạy cảm về bảo mật mới được discover vẫn có thể cần review tường minh, tùy theo Policy.

Ngữ nghĩa của Trust thuộc về `policy-spec.md`.

---

# 123. Tính tối giản về Capability

Resolver chỉ nên thỏa mãn:

```text
requested capabilities

hard dependencies

selected optional capabilities
```

Nó không nên chủ động kích hoạt các capability không liên quan chỉ vì chúng sẵn có trong một Package đã được cài đặt.

---

# 124. Tính tối giản về Package

Một Package chỉ nên được đưa vào nếu có ít nhất một:

```text
selected Component

required dependency Component
```

yêu cầu nó.

Các Package không được sử dụng không nên xuất hiện trong Resolution.

---

# 125. Tính tối giản về môi trường

Kết quả mong muốn là:

```text
smallest coherent valid implementation set
```

với điều kiện:

```text
Package installation granularity
```

Resolver kiểm soát việc kích hoạt về mặt ngữ nghĩa, ngay cả khi việc cài đặt Package về mặt vật lý chứa thêm các Component không được sử dụng.

---

# 126. Tính tối ưu của Resolution

V1 không cần một bộ tối ưu hóa toàn cục về mặt toán học.

Thứ tự mục tiêu chính là:

```text
1. satisfy all hard requirements

2. obey policy

3. obey target constraints

4. avoid conflicts

5. preserve explicit overrides

6. preserve valid lock state

7. honor preferences

8. minimize unnecessary selections
```

---

# 127. Capability bắt buộc không được thỏa mãn

Capability bắt buộc:

```text
0 valid solutions
```

phải tạo ra error.

Không bao giờ âm thầm loại bỏ nó.

---

# 128. Capability tùy chọn không được thỏa mãn

Capability tùy chọn:

```text
0 valid solutions
```

có thể tạo ra warning.

Ví dụ:

```text
OPTIONAL_CAPABILITY_UNAVAILABLE
```

---

# 129. Candidate Deprecated

Một Candidate deprecated có thể vẫn đủ điều kiện khi:

```text
existing lock requires reproduction
```

nhưng thông thường nên thua một Candidate active hợp lệ trong lần update tường minh.

---

# 130. Candidate Removed

Một Candidate đã bị removed không nên được chọn cho resolution mới.

Nếu một lock hiện có tham chiếu đến nó và immutable artifact của nó vẫn có thể truy xuất được:

```text
reproduction may continue
```

kèm warning.

Nếu artifact không sẵn có:

```text
resolution/reproduction failure
```

---

# 131. Gỡ bỏ Project Override

Nếu một Project gỡ bỏ một explicit implementation override, hành vi sync thông thường nên được định nghĩa rõ ràng.

Khuyến nghị:

```text
if currently locked implementation remains valid:
preserve it during sync

explicit update:
allow resolver to reconsider default winner
```

Điều này tránh những thay đổi gây bất ngờ.

---

# 132. Gỡ bỏ việc Disable Capability

Nếu một Capability trước đó bị disable được enable trở lại thông qua thay đổi manifest:

```text
perform normal fresh selection for that Capability
```

trừ khi lock metadata lịch sử hợp lệ có thể được tái sử dụng một cách an toàn.

---

# 133. Component đa Capability

Một Component được chọn có thể thỏa mãn nhiều Capability Requirement.

Ví dụ:

```text
Component A

implements:
engineering.architecture
engineering.codebase-design
```

Nếu được chọn cho một Capability, nó có thể thỏa mãn một Capability khác nếu:

```text
mapping exists

eligibility is valid

cardinality/conflicts permit it
```

Resolver nên tránh chọn các Component dư thừa một cách không cần thiết.

---

# 134. Tái sử dụng giữa các Capability

Nếu Candidate A thỏa mãn:

```text
Capability X
Capability Y
```

và cả hai đều bắt buộc, Resolver có thể ưu tiên một lời giải sử dụng một Component thay vì hai Component riêng biệt được ưu tiên ngang nhau, khi không tồn tại preference nào mạnh hơn.

Điều này hỗ trợ tính tối giản về môi trường.

V1 có thể xem đây là một tối ưu hóa để làm sau nếu nó làm phức tạp quá mức việc lựa chọn tất định.

---

# 135. Composite Implementation

Nếu một Capability yêu cầu nhiều Component cùng lúc:

```text
Implementation Set
```

nên được xử lý một cách nguyên tử (atomic).

Về mặt khái niệm:

```text
Capability X

Candidate A:
Components [A1, A2]
```

Tất cả các Component phải vượt qua:

```text
policy

target compatibility

dependency validation
```

nếu không Candidate sẽ bị reject.

V1 có thể hoãn việc hỗ trợ first-class cho composite implementation nếu chưa cần đến.

---

# 136. Cấu trúc dữ liệu của Resolver

Các kiểu cốt lõi về mặt khái niệm được khuyến nghị:

```text
ResolutionContext

CapabilityRequirement

CapabilityNode

Candidate

CandidateEvaluation

PolicyDecision

CompatibilityDecision

ResolutionDecision

ResolvedCapability

SelectedComponent

ResolvedPackage

Resolution

Diagnostic
```

Đây là các contract về mặt khái niệm, không phải tên class bắt buộc.

---

# 137. Đánh giá Candidate

Về mặt khái niệm:

```text
CandidateEvaluation

candidate

availability

policy

targetCompatibility

dependencies

conflicts

preference

status

reasons
```

Giữ cho việc đánh giá tường minh giúp cải thiện explainability.

---

# 138. Resolved Capability

Về mặt khái niệm:

```text
ResolvedCapability

capability

requirements

selected

suppressed

rejected

diagnostics
```

---

# 139. Resolved Package

Về mặt khái niệm:

```text
ResolvedPackage

publisher

package

version

immutableRef

integrity

requiredComponents
```

---

# 140. Resolution Metadata

Một Resolution nên bao gồm:

```text
resolver version

schema version

resolution mode

target

input fingerprint

catalog/distribution identity
```

Điều này hỗ trợ việc debug và tái tạo.

---

# 141. Phiên bản Resolver

Nếu ngữ nghĩa lựa chọn thay đổi đáng kể, phiên bản Resolver nên có thể được xác định.

Điều này có thể quan trọng vì:

```text
same manifest
+
same catalog
+
different resolver algorithm
```

nếu không có thể tạo ra các kết quả khác nhau.

Chiến lược versioning chính xác thuộc về các đặc tả lockfile/release.

---

# 142. Thay đổi thuật toán

Các thay đổi có thể làm thay đổi hành vi lựa chọn nên được xử lý cẩn thận.

Ví dụ:

```text
preference precedence change

cardinality semantics change

conflict search change

lock preservation change
```

Những thay đổi như vậy nên:

```text
receive tests

update specification

possibly receive ADR

consider migration impact
```

---

# 143. Contract về sự ổn định của Resolution

Trong một phiên bản Resolver ổn định:

```text
same normalized inputs
→ same Resolution
```

Đây là một contract cốt lõi.

---

# 144. Ma trận kiểm thử Resolution

Tối thiểu cần kiểm thử:

```text
single capability / one candidate

single capability / multiple candidates

cardinality one

cardinality many

policy rejection

target rejection

explicit override

invalid override

existing lock preservation

lock invalidation

priority selection

ambiguity

Capability dependency

disabled dependency

Preset duplication

Capability deduplication

Component dependency

Package deduplication

version conflict

explicit Component conflict

cross-Capability conflict

no implementation

deprecated implementation
```

---

# 145. Property Test

Các property hữu ích của resolver:

```text
determinism

idempotent normalization

requirement deduplication

no selected rejected Candidate

no cardinality-one duplicate selection

all selected Components belong to resolved Packages

all required Capabilities satisfied on success
```

---

# 146. Các bất biến của Resolution

Một Resolution thành công phải thỏa mãn:

```text
1. Every required Capability is satisfied.

2. No rejected Candidate is selected.

3. Every selected Candidate is available.

4. Every selected Candidate is policy-compliant.

5. Every selected Candidate is target-compatible.

6. Every selected implementation dependency is satisfied.

7. Capability cardinality is respected.

8. No unresolved hard conflict remains.

9. Every selected Component belongs to a resolved Package.

10. Every resolved Package has a valid concrete version/ref.

11. Every selected implementation is explainable.

12. Every Package is required by at least one selected/dependency Component.

13. No disabled Capability remains active unless required conflict causes explicit failure.

14. Requirement provenance is preserved.

15. Stable output ordering is used.
```

---

# 147. Các bất biến của Preference

Preference phải tuân thủ:

```text
hard constraints
>
explicit override
>
existing valid lock
>
policy preference
>
target preference
>
catalog priority
```

Dòng đầu tiên về mặt kỹ thuật không phải là một preference.

Nó là eligibility.

Sự phân biệt này phải luôn tường minh.

---

# 148. Các bất biến của Lock

Sync thông thường:

```text
do not change valid lock unnecessarily
```

Update:

```text
may intentionally change lock
```

Lock state không bao giờ được giữ lại một implementation vi phạm các ràng buộc cứng hiện tại.

---

# 149. Các bất biến của Policy

Policy:

```text
filters eligibility
```

Nó không được:

```text
rename capabilities

rewrite provenance

silently mutate project intent
```

---

# 150. Các bất biến của Target

Tương thích target có thể reject một implementation.

Nó không được thay đổi định danh ngữ nghĩa của Capability.

Ví dụ:

```text
engineering.testing.tdd
```

vẫn giữ nguyên ngay cả khi Claude và Codex sử dụng các implementation khác nhau.

---

# 151. Các bất biến của Override

Override:

```text
change project-specific preference/intent
```

nhưng không thể âm thầm ghi đè:

```text
security deny

unavailable Component

unsupported Target

broken hard dependency
```

trừ khi một Policy trong tương lai cho phép tường minh hành vi như vậy.

---

# 152. Failure và Fallback

Fallback chỉ được phép giữa:

```text
eligible candidates
```

Ví dụ:

Candidate được ưu tiên bị policy reject:

```text
try next eligible Candidate
```

Nhưng khi explicit implementation override thất bại, thông thường nên tạo ra error thay vì fallback ngầm.

---

# 153. Vì sao Explicit Override nên fail một cách rõ ràng

Nếu người dùng viết:

```text
Use Matt Pocock TDD
```

và hệ thống âm thầm sử dụng Superpowers thay thế:

```text
declared intent
≠
actual environment
```

Do đó explicit override nên fail nếu không thể thực hiện.

---

# 154. Lựa chọn mặc định có thể Fallback

Khi không có explicit override:

```text
highest preferred Candidate unavailable
```

Resolver có thể chọn Candidate đủ điều kiện tiếp theo.

Đây là resolution thông thường.

Lý do fallback phải luôn có thể giải thích được.

---

# 155. Ví dụ — Resolution cơ bản

Input:

```text
Profile:
frontend-engineer

Target:
claude-code
```

Requirement:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
frontend.design
```

Các candidate cho TDD:

```text
Superpowers 100
Matt Pocock 80
ECC 70
```

Tất cả đều được cho phép.

Kết quả:

```text
Superpowers
```

Lý do:

```text
highest catalog priority
```

---

# 156. Ví dụ — Policy thay đổi Winner

Các candidate:

```text
Superpowers
priority 100
trust community

Matt Pocock
priority 80
trust curated
```

Policy:

```text
deny community
```

Kết quả:

```text
Superpowers → rejected
Matt Pocock → selected
```

Lý do:

```text
policy filtering occurs before priority
```

---

# 157. Ví dụ — Lock giữ nguyên Winner

Lock hiện có:

```text
TDD → Matt Pocock
```

Các candidate đủ điều kiện hiện tại:

```text
Superpowers priority 100
Matt Pocock priority 80
```

Sync thông thường:

```text
Matt Pocock remains selected
```

bởi vì:

```text
existing valid lock
>
catalog priority
```

Update tường minh có thể xem xét lại Superpowers.

---

# 158. Ví dụ — Explicit Override

Mặc định:

```text
Superpowers
```

Project:

```text
override TDD → ECC
```

ECC đủ điều kiện.

Kết quả:

```text
ECC selected
```

Lý do:

```text
explicit override
```

---

# 159. Ví dụ — Override không hợp lệ

Project:

```text
override TDD → ECC
```

Policy:

```text
deny ECC publisher
```

Kết quả:

```text
resolution fails
```

Diagnostic:

```text
INVALID_IMPLEMENTATION_OVERRIDE

Requested:
ECC

Rejected by:
strict policy
```

---

# 160. Ví dụ — Cardinality Many

Capability:

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

Fresh/update mode:

```text
all eligible candidates may be selected
```

Sync thông thường:

```text
preserve locked valid selected set
```

trừ khi project intent thay đổi.

---

# 161. Ví dụ — Package Deduplication

Đã resolve:

```text
planning
→ superpowers/planning

debugging
→ superpowers/debugging

verification
→ superpowers/verification
```

Tất cả đều thuộc về:

```text
Package superpowers
```

Cuối cùng:

```text
selected Components: 3

resolved Packages: 1
```

---

# 162. Ví dụ — Component bị Suppress trong Package đã cài đặt

Package Superpowers chứa:

```text
planning
debugging
TDD
```

Đã resolve:

```text
planning → Superpowers

debugging → Superpowers

TDD → Matt Pocock
```

Package Superpowers vẫn được cài đặt.

Nhưng Component TDD của nó ở trạng thái:

```text
not semantically active
```

---

# 163. Ví dụ — Capability Dependency

```text
engineering.testing.e2e
```

yêu cầu:

```text
tooling.browser
```

Cả hai đều phải được resolve.

Nếu browser capability không có implementation đủ điều kiện nào:

```text
engineering.testing.e2e
```

cũng fail theo.

Diagnostic phải hiển thị dependency path.

---

# 164. Ví dụ — Cross-Capability Conflict

Bắt buộc:

```text
Capability A
Capability B
```

Các candidate cho A:

```text
A1
A2
```

B:

```text
B1
```

Conflict:

```text
A1 conflicts B1
```

A2 tương thích.

Resolver chọn:

```text
A2
B1
```

ngay cả khi A1 có priority độc lập cao hơn, bởi vì:

```text
valid complete solution
>
invalid locally preferred solution
```

---

# 165. Ví dụ — Đồ thị không thể thỏa mãn

A:

```text
only A1
```

B:

```text
only B1
```

Conflict:

```text
A1 conflicts B1
```

Cả hai Capability đều bắt buộc.

Kết quả:

```text
UNSATISFIABLE_RESOLUTION
```

---

# 166. Ví dụ — Xuất hiện Candidate mới

Lock hiện có:

```text
TDD → Superpowers
```

Catalog mới bao gồm:

```text
Publisher X
priority 120
```

Sync thông thường:

```text
preserve Superpowers
```

Update tường minh:

```text
Publisher X may become selected
```

nếu đủ điều kiện.

Điều này ngăn môi trường âm thầm thay đổi.

---

# 167. Ví dụ — Dependency nhạy cảm về bảo mật

Được chọn:

```text
research-skill
```

Dependency:

```text
external MCP server
```

Policy:

```text
deny external MCP
```

Candidate phải bị reject.

Nó không được cài đặt một phần mà thiếu dependency bắt buộc của nó.

---

# 168. Độ phức tạp của Resolution

Các đồ thị dự kiến trong V1 tương đối nhỏ:

```text
tens of capabilities

tens/hundreds of Candidates

small dependency graphs
```

Tính đúng đắn và explainability quan trọng hơn tối ưu hóa nâng cao.

---

# 169. Chiến lược thuật toán

Chiến lược V1 khuyến nghị:

```text
graph expansion

deterministic filtering

ordered candidate ranking

bounded conflict backtracking
```

Tránh đưa vào một SAT/SMT solver phức tạp quá sớm.

Nếu độ phức tạp thực tế của catalog cuối cùng đòi hỏi điều đó, ngữ nghĩa công khai trong đặc tả này nên được giữ ổn định.

---

# 170. Ranh giới Implementation của Resolver

Vị trí implementation khuyến nghị:

```text
packages/core/src/resolver/
```

Các module có thể có:

```text
resolve.ts

context.ts

requirements.ts

dependencies.ts

candidates.ts

eligibility.ts

preferences.ts

cardinality.ts

conflicts.ts

packages.ts

versions.ts

decisions.ts
```

Cấu trúc source chính xác không mang tính quy chuẩn (normative).

---

# 171. Resolver không được phụ thuộc vào CLI

Resolver cốt lõi phải có thể được gọi bởi:

```text
CLI

tests

future API

future GUI

automation
```

mà không cần tương tác qua terminal.

---

# 172. Resolver không được phụ thuộc vào Source Adapter cụ thể

Source discovery phải diễn ra trước khi input của Resolver được xây dựng.

Resolver tiêu thụ dữ liệu Catalog đã được chuẩn hóa.

---

# 173. Resolver không được phụ thuộc vào Target Adapter cụ thể

Resolver có thể sử dụng các Target capability/descriptor đã được chuẩn hóa.

Nó không được import:

```text
Claude Code adapter implementation
```

một cách trực tiếp.

---

# 174. Resolver và Catalog

Catalog trả lời:

```text
What implementations exist?
```

Resolver trả lời:

```text
Which implementation should this Project use?
```

Không trộn lẫn các trách nhiệm này.

---

# 175. Resolver và Policy

Policy trả lời:

```text
Which Candidates are allowed or preferred?
```

Resolver điều phối các quyết định đó thành lựa chọn cuối cùng.

---

# 176. Resolver và Lockfile

Resolver tạo ra:

```text
Resolution
```

Lockfile Builder serialize:

```text
Resolution
```

Lockfile không được trở thành một resolver thứ hai.

---

# 177. Resolver và Target Adapter

Resolver quyết định:

```text
what
```

Target Adapter quyết định:

```text
how
```

Ví dụ:

```text
Resolver:
select Component X

Target Adapter:
render Component X into Claude native structure
```

---

# 178. Các tính năng Resolution bắt buộc trong V1

V1 phải hỗ trợ:

```text
Profile expansion

Preset expansion

Capability requirement deduplication

Capability dependency expansion

cardinality one

cardinality many

policy filtering

target filtering

implementation priority

explicit implementation override

existing lock preservation

ambiguity detection

Component dependency resolution

Package deduplication

curated version resolution

structured diagnostics

resolution explanation
```

---

# 179. Những gì V1 có thể hoãn lại

V1 có thể hoãn lại:

```text
advanced optional capabilities

complex composite implementations

large-scale constraint optimization

rich multi-target joint resolution

automatic semantic fallback between different capabilities

AI-assisted resolution

task-level temporary capability composition
```

---

# 180. Tiêu chí chấp nhận Resolution

Resolver V1 được chấp nhận khi tất cả những điều sau hoạt động một cách tin cậy:

```text
same input always produces same output

TDD overlap selects one implementation

Policy can change the winner

Explicit override works

Invalid override fails

Valid lock survives normal sync

Update can intentionally change selection

Required missing capability fails

Capability dependencies resolve

Disabled required dependency fails

Preset cycles fail

Capability cycles fail

Package deduplication works

Cross-capability conflict can select a valid alternative

Unsatisfiable conflicts fail clearly

All selected components retain provenance

ap explain can reconstruct selection reasons
```

---

# 181. Thứ tự quyết định Resolution

Phân cấp quyết định cốt lõi là:

```text
Requested Intent
      ↓
Capability Graph
      ↓
Candidate Availability
      ↓
Hard Constraints
      ↓
Policy
      ↓
Target Compatibility
      ↓
Implementation Dependencies
      ↓
Explicit Override
      ↓
Existing Valid Lock
      ↓
Policy Preference
      ↓
Target Preference
      ↓
Catalog Priority
      ↓
Cardinality
      ↓
Conflict Validation
      ↓
Selected Solution
```

Thứ tự này nên được giữ ổn định trừ khi được thay đổi có chủ đích thông qua architecture review.

---

# 182. Tóm tắt các quy tắc Resolution

```text
Request capabilities, not publishers.

Expand all semantic requirements before selecting implementations.

Deduplicate by canonical Capability ID.

Hard constraints always beat preferences.

Policy filters before priority.

Target compatibility filters before priority.

Explicit override beats defaults but not hard constraints.

Normal sync prefers existing valid lock.

Updates may reconsider locked selections.

Cardinality determines how many implementations may remain active.

Conflicts must be resolved globally enough to produce a valid environment.

Packages are deduplicated after Component selection.

Version resolution uses curated locked upstream state.

Every important decision must be explainable.

Required failures must never be silently ignored.
```

---

# 183. Pseudocode của Resolver

```text
function resolve(context):

    validate(context)

    presets =
        expandProfile(context.project.profile)
        + context.project.presets

    expandedPresets =
        expandPresetGraph(presets)

    requirements =
        collectCapabilities(expandedPresets)

    requirements +=
        context.project.overrides.capabilities.enable

    requirements =
        applyCapabilityDisables(requirements)

    requirements =
        deduplicate(requirements)

    requirements =
        expandCapabilityDependencies(requirements)

    validateCapabilityGraph(requirements)

    evaluations = []

    for capability in requirements:

        candidates =
            catalog.implementations(capability)

        candidates =
            evaluateAvailability(candidates)

        candidates =
            evaluatePolicy(candidates, context.policy)

        candidates =
            evaluateTarget(candidates, context.target)

        candidates =
            evaluateDependencies(candidates)

        candidates =
            applyImplementationOverride(
                candidates,
                context.project.overrides
            )

        candidates =
            applyLockPreference(
                candidates,
                context.existingLock,
                context.mode
            )

        candidates =
            rankCandidates(candidates)

        evaluations +=
            resolveCardinality(
                capability,
                candidates
            )

    selections =
        resolveGlobalConflicts(evaluations)

    components =
        collectSelectedComponents(selections)

    components =
        expandComponentDependencies(components)

    packages =
        deduplicatePackages(components)

    packages =
        resolveVersions(
            packages,
            context.distributionLock,
            context.existingLock,
            context.mode
        )

    validateFinalResolution(
        requirements,
        selections,
        components,
        packages
    )

    return buildResolution(...)
```

Pseudocode minh họa thứ tự, không phải cú pháp implementation bắt buộc.

---

# 184. Contract của Resolver

Resolver bảo đảm:

```text
If Resolution succeeds:

all required semantic intent is satisfied

all hard constraints are respected

the result is deterministic

the result is reproducible enough to lock

the result is explainable
```

Nếu các bảo đảm đó không thể được đáp ứng:

```text
Resolution fails explicitly
```

thay vì tạo ra một môi trường best-effort ngầm.

---

# 185. Resolution trong một câu

> **Resolver của `agent-plugins` mở rộng project intent thành một capability graph hoàn chỉnh, lọc các implementation theo các ràng buộc cứng, policy và khả năng tương thích target, áp dụng các preference tường minh và có nhận biết lock, resolve cardinality và conflict một cách tất định, sau đó tạo ra tập component và package đã pin nhỏ nhất hợp lệ cùng với đầy đủ provenance của các quyết định.**