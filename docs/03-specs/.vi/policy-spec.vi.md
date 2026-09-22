# Đặc tả Policy

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.  
**Hợp đồng chuẩn tắc:** `packages/schemas/schemas/policy.schema.json` (source-of-truth.md §16, §55)

## Tổng quan

Tài liệu này định nghĩa mô hình Policy được sử dụng bởi `agent-plugins`.

Một Policy kiểm soát những implementation nào được cho phép, bị hạn chế, được ưu tiên, hoặc cần review bổ sung trong quá trình Resolution.

Policy trả lời câu hỏi:

> **Với một tập các implementation khả dĩ, những implementation nào được chấp nhận theo các quy tắc governance hiện hành?**

Policy được cố ý tách biệt khỏi:

- ngữ nghĩa của Capability,
- việc kết hợp Profile,
- việc kết hợp Preset,
- intent của Project,
- độ ưu tiên của implementation,
- khả năng tương thích với target.

Mối quan hệ cốt lõi là:

```text
Project Intent
      ↓
Capability Requirements
      ↓
Candidate Implementations
      ↓
Policy Evaluation
      ↓
Eligible Candidates
      ↓
Resolver Preference
      ↓
Selection
```

Quy tắc trung tâm là:

> **Policy xác định tính hợp lệ (eligibility) trước khi preference của resolver xác định việc lựa chọn.**

---

# 1. Phạm vi

Đặc tả này định nghĩa:

```text
Policy manifests

trust rules

ownership rules

Provider restrictions

Package restrictions

Component restrictions

security-sensitive Component handling

experimental/deprecated behavior

allow / deny / review / prompt outcomes

policy preference

policy evaluation

non-interactive behavior

diagnostics

validation
```

Đặc tả này không định nghĩa:

```text
Capability taxonomy

Project composition

Catalog discovery

Target rendering

runtime sandboxing

operating-system security
```

---

# 2. Nguồn chân lý của Policy

Các Policy tái sử dụng được nằm trong:

```text
policies/
```

Ví dụ:

```text
policies/default.yaml
policies/personal.yaml
policies/strict.yaml
policies/enterprise.yaml
```

Project Manifest chọn một Policy theo ID.

Ví dụ:

```yaml
spec:
  policy: strict
```

Các file Policy là nguồn có thẩm quyền đối với ngữ nghĩa governance tái sử dụng được.

---

# 3. Policy mang tính khai báo

Policy phải luôn mang tính khai báo (declarative).

Tránh:

```yaml
evaluate:
  script: ./policy.js
```

hoặc:

```yaml
rule:
  command: ./security-check.sh
```

Việc đánh giá Policy cốt lõi không được phụ thuộc vào code thực thi tùy ý.

Điều này đảm bảo:

```text
determinism
reviewability
portability
security
```

---

# 4. Envelope của Policy Manifest

Định dạng khuyến nghị:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict
  description: Conservative policy for trusted development environments.

spec:
  ...
```

Bắt buộc:

```text
apiVersion
kind
metadata.id
metadata.name
spec
```

---

# 5. Policy ID

Policy ID sử dụng kebab-case chữ thường.

Ví dụ:

```text
default
personal
strict
enterprise
```

Pattern khuyến nghị:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Policy ID là duy nhất trên toàn cục trong distribution đang hoạt động.

---

# 6. Policy không định nghĩa Capability

Một Policy không được nói:

```text
enable TDD
enable security review
```

Đó là các quyết định về trạng thái mong muốn (desired-state).

Thay vào đó, Policy có thể nói:

```text
TDD implementations from untrusted Providers are denied
```

Sự phân biệt là:

```text
Project / Profile / Preset
→ what is needed

Policy
→ what may satisfy it
```

---

# 7. Policy không chọn bên thắng cuối cùng

Policy có thể:

```text
reject candidates

require review

express preferences
```

nhưng Resolver vẫn chịu trách nhiệm cho việc lựa chọn cuối cùng.

Ví dụ:

```text
Candidate A
trust: community

Candidate B
trust: curated

Policy:
prefer curated
allow community
```

Policy không trực tiếp khai báo:

```text
select B
```

Nó khai báo một preference.

Resolver áp dụng toàn bộ các quy tắc thứ tự ưu tiên.

---

# 8. Đầu vào của việc đánh giá Policy

Một Policy Evaluator có thể xem xét metadata đã được chuẩn hóa như:

```text
Provider

Package

Component

Capability Implementation

ownership

trust

Component type

security classification

Target

lifecycle status

source type
```

Việc đánh giá Policy không được dựa vào trạng thái mạng ẩn.

---

# 9. Đầu ra của việc đánh giá Policy

Về mặt khái niệm:

```text
PolicyDecision

├── outcome
├── rule
├── reason
├── severity
└── metadata
```

Các outcome khuyến nghị:

```text
allow
deny
review
prompt
```

---

# 10. `allow`

`allow` nghĩa là:

```text
Policy places no blocking restriction on this Candidate.
```

Nó không có nghĩa là:

```text
Candidate must be selected.
```

Các quy tắc khác của Resolver vẫn được áp dụng.

---

# 11. `deny`

`deny` là một ràng buộc cứng.

Một Candidate bị deny sẽ trở thành:

```text
Rejected
```

Nó không thể được chọn bất kể:

```text
Catalog priority

existing lock

Target preference

Project implementation override
```

trừ khi một Policy trong tương lai đưa vào một cách tường minh cơ chế miễn trừ ở cấp cao hơn.

V1 không nên hỗ trợ các miễn trừ ngầm định.

---

# 12. `review`

`review` nghĩa là Candidate cần được review hoặc phê duyệt tường minh trước khi kích hoạt.

Nó không tương đương với:

```text
allow
```

và không nên âm thầm được thông qua trong các môi trường không có người giám sát.

---

# 13. `prompt`

`prompt` nghĩa là một consumer tương tác có thể được hỏi để đưa ra quyết định.

Bản thân Policy engine không được hiển thị prompt.

Thay vào đó:

```text
Policy Evaluator
      ↓
prompt-required decision
      ↓
Application / CLI
```

Tầng Application xác định liệu việc phê duyệt tương tác có khả thi hay không.

---

# 14. Review và Prompt

Cách phân biệt được đề xuất:

```text
review
→ governance approval is required

prompt
→ interactive user confirmation may satisfy the rule
```

Ví dụ:

```text
third-party executable hook
→ review

community MCP in personal mode
→ prompt
```

V1 có thể đơn giản hóa những điều này nếu chi phí implementation quá cao.

---

# 15. Hành vi không tương tác

Các command được dùng trong CI hoặc chế độ không tương tác không bao giờ được block để chờ phê duyệt.

Đối với:

```text
review
prompt
```

hành vi mặc định trong chế độ không tương tác nên là:

```text
fail unresolved approval
```

trừ khi tồn tại một cơ chế phê duyệt được ghi nhận trước một cách tường minh.

Diagnostic khuyến nghị:

```text
POLICY_APPROVAL_REQUIRED
```

---

# 16. Thứ tự các outcome của Policy

Mức độ nghiêm trọng khuyến nghị:

```text
deny
>
review
>
prompt
>
allow
```

Khi nhiều rule khớp cùng áp dụng, outcome cứng mang tính hạn chế nhất thường nên thắng.

Ví dụ:

```text
Rule A → allow
Rule B → deny
```

Kết quả:

```text
deny
```

---

# 17. Độ cụ thể của Policy rule

Các Policy rule nên được đánh giá với thứ tự ưu tiên tường minh và được tài liệu hóa.

Mô hình khái niệm khuyến nghị:

```text
more specific rule
can refine
less specific rule
```

Ví dụ:

```text
all community providers → deny

specific provider X → allow
```

Tuy nhiên, ngữ nghĩa ngoại lệ có thể trở nên nguy hiểm.

V1 nên ưu tiên cách kết hợp rule đơn giản và outcome cuối cùng tường minh hơn là cơ chế specificity phức tạp kiểu CSS.

---

# 18. Mô hình rule khuyến nghị cho V1

Một mô hình V1 đơn giản và an toàn hơn là:

```text
baseline constraints
+
explicit deny rules
+
explicit review/prompt rules
+
preference rules
```

Trong đó:

```text
deny always wins
```

và các allowlist giới hạn tập Candidate.

Điều này tránh được các chuỗi ngoại lệ phức tạp.

---

# 19. Trust

Trust là một phân loại governance.

Các mức trust khuyến nghị:

```text
first-party
official
curated
community
untrusted
```

Trust khác với ownership.

---

# 20. Ownership

Ownership trả lời câu hỏi:

> Ai duy trì implementation này, xét trong quan hệ với `agent-plugins`?

Các giá trị khuyến nghị:

```text
first-party
third-party
```

Ví dụ:

```text
agent-plugins native Component
→ first-party

Superpowers Component
→ third-party
```

---

# 21. Trust và Ownership

Ví dụ:

```text
ownership: third-party
trust: official
```

là hợp lệ.

Tương tự:

```text
ownership: third-party
trust: curated
```

Do đó:

```text
third-party
≠
untrusted
```

---

# 22. Ý nghĩa của trust `first-party`

Trust:

```text
first-party
```

nghĩa là implementation được sở hữu và duy trì bởi dự án `agent-plugins`.

Nó thường tương ứng với:

```text
ownership: first-party
```

---

# 23. Ý nghĩa của `official`

`official` nghĩa là được duy trì bởi tổ chức chịu trách nhiệm cho runtime, sản phẩm hoặc hệ sinh thái bên ngoài tương ứng.

Ví dụ về mặt khái niệm:

```text
Anthropic-published Claude tooling
→ official
```

Không sử dụng:

```text
official
```

như một từ đồng nghĩa với code first-party của `agent-plugins`.

---

# 24. Ý nghĩa của `curated`

`curated` nghĩa là đã được các maintainer của `agent-plugins` review và phê duyệt một cách tường minh.

Implementation vẫn có thể được duy trì từ bên ngoài.

---

# 25. Ý nghĩa của `community`

`community` nghĩa là được duy trì từ bên ngoài và không được gán phân loại mạnh hơn là `official` hoặc `curated`.

Community không tự động có nghĩa là không an toàn.

---

# 26. Ý nghĩa của `untrusted`

`untrusted` nghĩa là chưa thiết lập đủ mức trust cho việc sử dụng thông thường theo hầu hết các Policy.

Nó không nhất thiết có nghĩa là độc hại.

Một Policy strict thường nên deny nó.

---

# 27. Trust không phải là điểm bảo mật phổ quát

Tránh coi:

```text
first-party > official > curated > community > untrusted
```

như một thang xếp hạng chất lượng dạng số phổ quát.

Các mức này mô tả bối cảnh governance.

Policy có thể quyết định cách xử lý từng mức.

---

# 28. Trust cơ sở

Metadata của Catalog Provider hoặc Package có thể định nghĩa trust cơ sở (baseline trust).

Ví dụ:

```yaml
trust:
  baseline: curated
```

Policy xác định liệu mức trust đó có được chấp nhận hay không.

---

# 29. Ghi đè trust

Metadata được curate có thể định nghĩa trust cụ thể hơn cho:

```text
Package
Component
```

khi có lý do chính đáng.

Độ cụ thể về mặt khái niệm:

```text
Component trust
>
Package trust
>
Provider baseline trust
```

Chỉ metadata chuẩn (canonical) tường minh mới nên tinh chỉnh trust.

---

# 30. Trust hiệu lực

Về mặt khái niệm:

```text
effectiveTrust(candidate)
=
most specific explicit trust classification
```

Các nguồn có thể có:

```text
Component annotation

Package annotation

Provider baseline
```

Policy không viết lại provenance; nó đánh giá phân loại kết quả.

---

# 31. Các mức trust được cho phép

Một Policy có thể định nghĩa:

```yaml
trust:
  allow:
    - first-party
    - official
    - curated
```

Candidate có:

```text
community
```

khi đó sẽ bị deny.

---

# 32. Các mức trust bị từ chối

Schema thay thế:

```yaml
trust:
  deny:
    - untrusted
```

V1 nên tránh hỗ trợ các mô hình allow và deny mâu thuẫn nhau mà không có thứ tự ưu tiên rõ ràng.

Cách tiếp cận khuyến nghị:

```text
allowlist
```

cho các mức trust.

---

# 33. Trust schema khuyến nghị

Ví dụ:

```yaml
spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
```

Cách này dễ hiểu.

---

# 34. Ví dụ Policy cá nhân

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: personal
  name: Personal

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
      - community
```

---

# 35. Ví dụ Policy strict

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
```

---

# 36. Provider rule

Policy có thể hạn chế trực tiếp các Provider.

Ví dụ:

```yaml
providers:
  deny:
    - provider-x
```

Điều này cho phép governance độc lập với lớp trust.

---

# 37. Allowlist của Provider

Một Policy có tính hạn chế cao có thể sử dụng:

```yaml
providers:
  allow:
    - agent-plugins
    - anthropic
    - superpowers
```

Nếu `allow` tồn tại, các Provider nằm ngoài allowlist sẽ bị deny.

---

# 38. Khuyến nghị về Provider rule

Tránh cấu hình cả hai danh sách lớn:

```text
allow
```

và:

```text
deny
```

một cách không cần thiết.

Nếu cả hai đều được hỗ trợ, ngữ nghĩa khuyến nghị là:

```text
Provider must be in allowlist if allowlist exists
AND
must not be in denylist
```

Vì vậy:

```text
deny wins
```

---

# 39. Package rule

Policy có thể hạn chế các Package cụ thể.

Ví dụ:

```yaml
packages:
  deny:
    - provider-x/unsafe-tools
```

Điều này cụ thể hơn so với các rule ở cấp Provider.

---

# 40. Component rule

Policy có thể hạn chế một Component một cách tường minh.

Ví dụ:

```yaml
components:
  deny:
    - provider/package#hook:post-tool-use
```

Điều này mang lại governance chính xác mà không cần chặn toàn bộ một Package.

---

# 41. Capability Policy rule

Nhìn chung, Policy nên quản lý các implementation, không phải các Capability về mặt ngữ nghĩa.

Tuy nhiên, đôi khi một Policy có thể cấm một số lớp hành vi.

Ví dụ:

```text
external code execution
```

nên được mô hình hóa thông qua metadata Component/security thay vì:

```text
deny capability X
```

bởi vì các implementation khác nhau của cùng một Capability có thể có mức rủi ro khác nhau.

---

# 42. Component nhạy cảm về bảo mật

Các Component có tác dụng phụ thực thi hoặc tác dụng phụ ra bên ngoài nên được phân loại là nhạy cảm về bảo mật (security-sensitive).

Ví dụ:

```text
hook

script

command

MCP server

external binary integration

network-enabled automation
```

---

# 43. Policy theo loại Component

Policy có thể quản lý các loại Component.

Ví dụ:

```yaml
components:
  types:
    hook: review
    command: allow
    mcp: prompt
```

Điều này cho phép định nghĩa hành vi tổng quát theo loại.

---

# 44. Outcome khuyến nghị theo loại

Một Policy mặc định có thể sử dụng:

```text
skill
→ allow

agent
→ allow

rule
→ allow

workflow
→ allow

hook
→ review

command
→ review or allow depending on execution semantics

mcp
→ review/prompt

lsp
→ allow/review depending on implementation
```

Các giá trị mặc định chính xác thuộc về các file Policy, không thuộc về đặc tả này.

---

# 45. Phân loại bảo mật

Metadata của Component có thể expose các thuộc tính bảo mật đã được chuẩn hóa.

Ví dụ:

```text
executesCommands

runsHooks

networkAccess

externalService

filesystemWrite

requiresCredential

spawnsProcess
```

Policy có thể đánh giá những dữ kiện này.

---

# 46. Dữ kiện bảo mật và Policy rule

Metadata của Component nói:

```text
this Component performs network access
```

Policy nói:

```text
network-access Components require review
```

Hãy giữ dữ kiện và governance tách biệt.

---

# 47. Hình dạng security rule được khuyến nghị

Về mặt khái niệm:

```yaml
security:
  executable:
    external: review

  network:
    external: review

  credentials:
    required: review
```

Cấu trúc field chính xác có thể được đơn giản hóa dựa trên metadata thực tế của Component.

---

# 48. Tránh `safe: true`

Không mô hình hóa security như sau:

```yaml
safe: true
```

hoặc:

```yaml
trusted: true
```

Security mang tính đa chiều.

Nên ưu tiên metadata mang tính dữ kiện kết hợp với các quyết định của Policy.

---

# 49. Đánh giá security bắc cầu

Policy phải đánh giá các implementation dependency bắc cầu.

Ví dụ:

```text
Selected Skill
    ↓
requires Hook
```

Hook phải vượt qua Policy một cách độc lập.

Skill không thể ngầm đưa nó vào whitelist.

---

# 50. Dependency không bỏ qua được Policy

Invariant:

> **Mọi Component đi vào Resolution cuối cùng, dù được chọn trực tiếp hay được yêu cầu bắc cầu, đều phải thỏa mãn Policy.**

Điều này đặc biệt quan trọng đối với:

```text
hooks
MCP
commands
scripts
```

---

# 51. Component thử nghiệm

Policy có thể quản lý các Component hoặc implementation thử nghiệm.

Ví dụ:

```yaml
lifecycle:
  experimental: deny
```

hoặc:

```yaml
lifecycle:
  experimental: review
```

---

# 52. Implementation bị deprecated

Policy có thể quyết định cách xử lý các implementation bị deprecated.

Ví dụ:

```yaml
lifecycle:
  deprecated: review
```

Ngữ nghĩa chung được khuyến nghị:

```text
fresh/update resolution
→ avoid deprecated if active alternative exists

existing lock
→ may preserve if still allowed
```

Policy có thể chọn hành vi nghiêm ngặt hơn.

---

# 53. Implementation đã bị gỡ bỏ

Các implementation đã bị gỡ bỏ thông thường nên không khả dụng bất kể Policy.

Policy không thể làm cho một source không khả dụng trở thành khả dụng.

Vì vậy:

```text
availability
```

là một ràng buộc cứng được áp dụng trước preference của Policy.

---

# 54. Preference của Policy

Policy có thể biểu đạt các preference mềm giữa các Candidate vốn đã được cho phép.

Ví dụ:

```text
prefer first-party

prefer official

prefer curated

prefer certain Providers
```

Preference phải luôn tách biệt với việc cấm.

---

# 55. Preference về trust

Về mặt khái niệm:

```yaml
preferences:
  trust:
    - first-party
    - official
    - curated
    - community
```

Điều này thể hiện thứ tự ưu tiên.

Nó không tự động deny các mức không có trong danh sách, trừ khi trust allowlist làm vậy.

---

# 56. Preference về Provider

Ví dụ:

```yaml
preferences:
  providers:
    - agent-plugins
    - anthropic
```

Điều này có thể ảnh hưởng đến thứ hạng giữa các Candidate đủ điều kiện.

Nó không được ghi đè implementation override tường minh của Project.

---

# 57. Thứ tự ưu tiên của preference trong Policy

Tóm tắt của resolver:

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

Vì vậy, preference của Policy chỉ áp dụng giữa các Candidate vốn đã đủ điều kiện.

---

# 58. Preference của Policy so với lock hiện có

Sync thông thường nhìn chung nên giữ nguyên một lock hợp lệ hiện có, ngay cả khi preference hiện tại của Policy giờ đây sẽ xếp hạng một Candidate được cho phép khác cao hơn.

Ví dụ:

```text
Locked:
community Candidate

Policy:
community allowed
curated preferred

New curated Candidate exists
```

Sync thông thường:

```text
preserve lock
```

Update tường minh:

```text
Policy preference may influence replacement
```

---

# 59. Hạn chế của Policy so với lock hiện có

Nếu Policy thay đổi từ:

```text
community allowed
```

thành:

```text
community denied
```

thì lock hiện có không thể được giữ nguyên.

Hạn chế cứng thắng sự ổn định của lock.

---

# 60. Project override so với Policy

Ví dụ:

```text
Project:
TDD → Candidate X

Policy:
Candidate X denied
```

Kết quả:

```text
resolution failure
```

chứ không phải fallback.

Diagnostic được khuyến nghị:

```text
INVALID_IMPLEMENTATION_OVERRIDE
```

với nguyên nhân là việc Policy deny.

---

# 61. Thứ tự đánh giá Policy

Thứ tự được khuyến nghị cho mỗi Candidate:

```text
1. Availability

2. Explicit Provider/Package/Component deny

3. Trust eligibility

4. Lifecycle restrictions

5. Security-sensitive rules

6. Component-type rules

7. Approval requirements

8. Preference extraction
```

Một số giai đoạn có thể được gộp lại ở bên trong.

---

# 62. Deny rule luôn thắng

Nếu bất kỳ hard rule áp dụng nào trả về:

```text
deny
```

thì kết quả Policy cuối cùng là:

```text
deny
```

Không preference hay allow rule nào có thể ghi đè nó trong V1.

Điều này giúp việc suy luận đơn giản hơn.

---

# 63. Kết quả về phê duyệt

Nếu không có deny nào nhưng ít nhất một rule áp dụng yêu cầu:

```text
review
```

kết quả được khuyến nghị:

```text
review
```

Nếu chỉ có `prompt` được áp dụng:

```text
prompt
```

Ngược lại:

```text
allow
```

Về mặt khái niệm:

```text
deny
>
review
>
prompt
>
allow
```

---

# 64. Nhiều điều kiện security

Ví dụ:

```text
Component:
community
MCP
network access
```

Các rule:

```text
community → allow

MCP → prompt

network access → review
```

Kết quả:

```text
review
```

vì đây là kết quả mạnh nhất không phải deny.

---

# 65. Giải quyết phê duyệt

Bản thân việc đánh giá Policy nên tạo ra:

```text
review
```

hoặc:

```text
prompt
```

Tầng Application sau đó có thể cung cấp một Approval Context.

Về mặt khái niệm:

```text
Policy Decision
+
Approved Exception
→ effective allow
```

V1 có thể hoãn việc lưu trữ các phê duyệt.

---

# 66. Đơn giản hóa phê duyệt trong V1

Nếu việc triển khai lưu trữ phê duyệt quá phức tạp, V1 có thể xử lý:

```text
review
prompt
```

như là:

```text
error requiring manifest/policy change
```

trong chế độ non-interactive và chỉ cho phép phê duyệt interactive tạm thời trong quá trình thực thi CLI.

Quyết định hiệu lực vẫn phải luôn hiển thị rõ ràng.

---

# 67. Khả năng tái lập của phê duyệt interactive

Phê duyệt interactive tạo ra các lo ngại về khả năng tái lập.

Nếu một phê duyệt làm thay đổi Resolution hiệu lực, phê duyệt đó phải được:

```text
recorded
or
required again
```

trên một máy khác.

Không dựa vào lịch sử terminal vô hình.

---

# 68. Phê duyệt được lưu trữ

Các lựa chọn trong tương lai:

```text
Project manifest approval

separate approval file

organization policy approval

lockfile decision record
```

V1 không nên đưa vào điều này cho đến khi cần thiết.

---

# 69. Policy trong CI

CI nên vận hành mà không có prompt interactive.

Khuyến nghị:

```text
allow
→ continue

deny
→ fail

review
→ fail

prompt
→ fail
```

trừ khi tồn tại trạng thái phê duyệt tường minh.

---

# 70. Diagnostic của Policy

Ví dụ:

```text
POLICY_DENIED

Component:
provider-x/package-x#mcp:external-system

Policy:
strict

Rule:
external MCP servers are denied
```

---

# 71. Diagnostic về phê duyệt

Ví dụ:

```text
POLICY_APPROVAL_REQUIRED

Component:
provider-x/package-x#hook:post-tool-use

Policy:
default

Reason:
third-party executable hooks require review
```

---

# 72. Trace đánh giá Policy

Để đảm bảo khả năng giải thích, cần ghi lại:

```text
Policy ID

matched rules

effective trust

effective outcome

preferences
```

Không phải mọi chi tiết implementation nội bộ đều phải được lưu trong Project Lock.

---

# 73. Cấu trúc Policy manifest

Hình dạng khái niệm được khuyến nghị cho V1:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict
  description: Conservative policy.

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated

  providers:
    deny: []

  packages:
    deny: []

  components:
    deny: []

    types:
      hook: review
      mcp: review

  lifecycle:
    experimental: deny
    deprecated: review

  preferences:
    trust:
      - first-party
      - official
      - curated
```

Schema chính xác có thể được thu hẹp cho V1.

---

# 74. Ví dụ Default Policy

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: default
  name: Default
  description: Balanced default policy.

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
      - community

  components:
    types:
      hook: review
      mcp: prompt

  lifecycle:
    experimental: review
    deprecated: allow

  preferences:
    trust:
      - first-party
      - official
      - curated
      - community
```

---

# 75. Ví dụ Personal Policy

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: personal
  name: Personal
  description: Flexible policy for personal projects.

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
      - community

  components:
    types:
      hook: prompt
      mcp: prompt

  lifecycle:
    experimental: prompt
    deprecated: allow

  preferences:
    trust:
      - first-party
      - official
      - curated
      - community
```

---

# 76. Ví dụ Strict Policy

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict
  description: Restrictive policy for controlled projects.

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated

  components:
    types:
      hook: review
      mcp: review

  lifecycle:
    experimental: deny
    deprecated: review

  preferences:
    trust:
      - first-party
      - official
      - curated
```

---

# 77. Enterprise Policy

Một Enterprise Policy trong tương lai có thể bao gồm:

```text
Provider allowlist

Package allowlist

strict trust levels

no interactive approval

organization-approved Components

signed source requirements

integrity requirements
```

Nó không được đòi hỏi hạ tầng enterprise tập trung chỉ để xác thực mô hình Policy cốt lõi.

---

# 78. Integrity Policy

Policy trong tương lai có thể yêu cầu các đảm bảo về integrity.

Ví dụ:

```yaml
integrity:
  requireHashForExternalPackages: true
```

Một Candidate có Package không thể đáp ứng yêu cầu này sẽ trở nên không đủ điều kiện.

Điều này là tùy chọn cho V1.

---

# 79. Policy về reference bất biến

Policy nghiêm ngặt trong tương lai có thể yêu cầu:

```text
immutable source refs
```

cho tất cả các Package bên ngoài.

Điều này có thể từ chối các Package chỉ được lock vào tên branch có thể thay đổi.

---

# 80. Policy về loại source

Policy có thể hạn chế các loại source.

Ví dụ:

```yaml
sources:
  deny:
    - filesystem-external
```

Hữu ích cho các môi trường mà việc tải source cục bộ tùy ý là điều không mong muốn.

---

# 81. Policy về truy cập mạng

Nếu metadata security xác định hành vi mạng, Policy có thể định nghĩa:

```text
external network access
→ review
```

Khi có thể, điều này nên sử dụng metadata mang tính dữ kiện đã được chuẩn hóa thay vì các rule đặc thù cho Provider.

---

# 82. Policy về yêu cầu credential

Một Component yêu cầu credential có thể được xử lý đặc biệt.

Ví dụ:

```text
requires credentials
→ review
```

Policy không nên truy cập các secret thực tế.

Nó chỉ đánh giá metadata.

---

# 83. Policy về ghi filesystem

Trong tương lai:

```text
filesystem write
→ review
```

có thể hữu ích cho các môi trường có tính hạn chế cao.

Một lần nữa, dữ kiện security thuộc về metadata của Component.

---

# 84. Policy về thực thi process

Rule khả thi:

```text
spawns process
→ review
```

Điều này chính xác hơn so với việc deny toàn bộ các Command một cách tuyệt đối.

---

# 85. Policy đặc thù cho Target

Một Policy có thể cần hành vi nhận biết Target.

Ví dụ:

```text
hook support in Claude Code
```

có một mô hình rủi ro runtime cụ thể.

Tuy nhiên, Policy đặc thù cho Target nên được giữ ở mức tối thiểu.

Khi có thể, nên ưu tiên các thuộc tính security đã được chuẩn hóa.

---

# 86. Policy và khả năng tương thích Target

Policy trả lời:

```text
may we use it?
```

Khả năng tương thích Target trả lời:

```text
can this Target support it?
```

Đây là các bộ lọc cứng độc lập.

Cả hai đều phải vượt qua.

---

# 87. Policy và Catalog priority

Catalog priority:

```text
default implementation preference
```

Policy:

```text
governance
```

Ví dụ:

```text
Candidate A
priority: 100
trust: community

Candidate B
priority: 80
trust: curated
```

Strict Policy:

```text
community denied
```

Kết quả:

```text
A rejected

B eligible
```

---

# 88. Policy và cardinality

Việc lọc theo Policy diễn ra trước khi lựa chọn theo cardinality.

Ví dụ:

```text
engineering.testing.tdd
cardinality: one

3 candidates
↓
Policy rejects 2
↓
1 eligible
↓
selected
```

---

# 89. Policy và `cardinality: many`

Với một Capability `many`, chỉ các candidate đủ điều kiện theo Policy mới có thể tham gia.

Policy có thể thu giảm:

```text
5 candidates
```

xuống còn:

```text
2 eligible
```

Sau đó ngữ nghĩa `many` thông thường được áp dụng.

---

# 90. Policy và việc cài đặt Package

Một Package có thể được yêu cầu bởi nhiều Component.

Nếu bất kỳ Component được yêu cầu nào bị deny, Component đó không thể trở nên active.

Tuy nhiên, cùng Package đó vẫn có thể được cài đặt vì một Component được cho phép khác yêu cầu nó.

Vì vậy:

```text
Package installed
≠
all Package Components approved
```

---

# 91. Policy phải đánh giá các Component active

Policy quản lý:

```text
Components entering resolved active/dependency state
```

chứ không phải mọi Component không hoạt động hiện diện vật lý bên trong một Package.

Tuy nhiên, một Policy nghiêm ngặt trong tương lai có thể quản lý rủi ro ở cấp Package khi chỉ riêng việc cài đặt đã gây ra side effect.

---

# 92. Rủi ro ở cấp Package

Nếu bản thân việc cài đặt Package thực thi script hoặc tạo ra side effect, điều này nên được mô hình hóa dưới dạng metadata security của Package.

Khi đó Policy có thể từ chối hoặc yêu cầu review trước khi cài đặt.

Điều này tách biệt với việc kích hoạt Component.

---

# 93. Rủi ro ở cấp Provider

Chặn toàn bộ một Provider là phù hợp khi:

```text
organization forbids source

Provider trust is revoked

supply-chain incident occurs
```

Không lặp lại các deny rule cho từng Component nếu việc deny ở cấp Provider đã thể hiện đúng ràng buộc thực sự.

---

# 94. Thu hồi trust

Nếu một Provider thay đổi từ:

```text
curated
```

thành:

```text
untrusted
```

thì một Project Lock hiện có phải được xác thực lại.

Nếu Policy hiện tại không cho phép `untrusted`:

```text
locked implementation becomes invalid
```

---

# 95. Xác thực lại lock hiện có theo Policy

Sync thông thường luôn đánh giá lại các implementation đã lock dựa trên các ràng buộc Policy cứng hiện tại.

Sự ổn định của lock không bao giờ được miễn trừ khỏi Policy.

---

# 96. Phát hiện thay đổi Policy

Digest đầu vào Resolution của Project Lock nên bao gồm nội dung Policy hiệu lực đã được chuẩn hóa.

Vì vậy:

```text
same Policy ID
+
changed Policy content
```

vẫn có thể làm lock mất hiệu lực hoặc trở nên stale.

---

# 97. Thay đổi preference của Policy

Chỉ riêng một thay đổi preference của Policy không nhất thiết làm cho một lock hiện đang được cho phép trở nên stale.

Ví dụ:

```text
previous:
prefer curated

new:
prefer official

locked Candidate:
curated and allowed
```

Sync thông thường có thể giữ nguyên lock.

Update tường minh có thể xem xét lại preference.

---

# 98. Thay đổi hard rule của Policy

Thay đổi về điều kiện eligibility bắt buộc nên làm vô hiệu trạng thái lock bị ảnh hưởng.

Ví dụ:

```text
community
allowed → denied
```

Implementation community hiện có phải được xem xét lại.

---

# 99. So khớp rule của Policy

Rule nên so khớp trên các field canonical đã được chuẩn hóa.

Ví dụ:

```text
Provider ID

Package ref

Component ref

Component type

trust level

ownership

lifecycle

security facts
```

Tránh so khớp trên các mô tả không có cấu trúc.

---

# 100. So khớp theo pattern

V1 nên tránh Policy dựa trên regex tùy ý trừ khi xuất hiện nhu cầu thực tế.

Ưu tiên ID chính xác và các category được liệt kê sẵn.

Điều này giảm sự mơ hồ.

---

# 101. Rule theo namespace

Policy trong tương lai có thể hỗ trợ ràng buộc theo namespace của Capability.

Ví dụ:

```text
security.*
```

Nhưng ngữ nghĩa wildcard làm tăng độ phức tạp.

Không bắt buộc cho V1.

---

# 102. Kế thừa Policy

Tránh kế thừa Policy nhiều tầng.

Không bắt đầu bằng:

```text
enterprise-strict
extends strict
extends default
```

Nếu việc tái sử dụng trở nên cần thiết, hãy cân nhắc:

```text
Policy fragments
```

hoặc một mô hình composition nông về sau.

V1 nên dùng các Policy độc lập và tường minh.

---

# 103. Không có Policy script

Policy không bao giờ được phụ thuộc vào:

```text
shell commands

JavaScript callbacks

LLM judgments

remote arbitrary webhooks
```

cho Resolution cốt lõi.

Những cơ chế đó sẽ làm suy yếu khả năng tái lập.

---

# 104. Không có quyết định Policy bởi LLM

Các quyết định cốt lõi như:

```text
trusted enough?

security-sensitive?

allowed?
```

không được ủy thác động cho một LLM.

AI có thể hỗ trợ maintainer trong quá trình curation, nhưng metadata canonical và Policy vẫn phải mang tính tất định.

---

# 105. Không tự động tin cậy dựa trên mức độ phổ biến

Không implement:

```text
GitHub stars > 10000
→ curated
```

Trust vẫn là curation tường minh do con người thực hiện.

---

# 106. Kiểm tra hợp lệ Policy

Kiểm tra:

```text
Policy ID syntax

valid trust values

valid outcomes

valid Provider refs

valid Package refs

valid Component refs

valid lifecycle outcomes

no duplicate references
```

---

# 107. Provider không xác định trong Policy

Ví dụ:

```yaml
providers:
  deny:
    - does-not-exist
```

Khuyến nghị:

```text
UNKNOWN_PROVIDER
```

trừ khi Policy chủ ý hỗ trợ các tham chiếu tương lai/không khả dụng.

V1 nên yêu cầu các tham chiếu hợp lệ.

---

# 108. Package không xác định trong Policy

Báo lỗi:

```text
UNKNOWN_PACKAGE
```

đối với Package ref chính xác không hợp lệ.

---

# 109. Component không xác định trong Policy

Báo lỗi:

```text
UNKNOWN_COMPONENT
```

đối với các rule Component chính xác không resolve được.

Điều này phát hiện Policy bị stale sau khi Provider cập nhật.

---

# 110. Outcome không hợp lệ

Ví dụ:

```yaml
hook: maybe
```

phải fail khi kiểm tra schema.

Được phép:

```text
allow
deny
review
prompt
```

---

# 111. Rule mâu thuẫn

Ví dụ:

```yaml
providers:
  allow:
    - superpowers

  deny:
    - superpowers
```

Khuyến nghị:

```text
POLICY_CONTRADICTION
```

thay vì âm thầm định nghĩa thứ tự ưu tiên.

Điều này giúp Policy dễ hiểu.

---

# 112. Mâu thuẫn về trust

Nếu:

```text
allowed trust:
- curated
```

nhưng rule riêng cho Provider lại cho phép tường minh một Provider `community`, V1 không nên dùng điều này như một ngoại lệ.

Ràng buộc cứng về trust vẫn có hiệu lực.

Nếu sau này cần ngoại lệ, hãy định nghĩa chúng một cách tường minh thay vì vô tình.

---

# 113. Default-Deny và Default-Allow

Trust policy thường nên dùng các trust level được cho phép một cách tường minh.

Đối với các rule chính xác theo Provider/Package/Component:

```text
not mentioned
→ no additional restriction
```

trừ khi có một allowlist tường minh.

---

# 114. Ngữ nghĩa của Provider allowlist

Nếu:

```yaml
providers:
  allow:
    - anthropic
    - superpowers
```

thì mọi Provider khác đều bị từ chối.

Điều này nên được thể hiện rõ ràng trong schema/tài liệu.

---

# 115. Allowlist rỗng

Một khai báo tường minh:

```yaml
providers:
  allow: []
```

sẽ có nghĩa là:

```text
allow no Providers
```

điều này có lẽ không phải là chủ ý.

Schema khuyến nghị:

```text
non-empty allowlist if field is present
```

---

# 116. Deny list rỗng

Hợp lệ nhưng không cần thiết:

```yaml
deny: []
```

Generator có thể bỏ qua các cấu trúc rỗng.

---

# 117. Giá trị mặc định của Policy

Các section bị thiếu nên có giá trị mặc định trung lập được ghi rõ trong tài liệu.

Ví dụ:

```text
providers missing
→ no Provider-specific restriction

packages missing
→ no Package-specific restriction

components missing
→ no Component-specific restriction

preferences missing
→ no Policy preference
```

Trust có thể bắt buộc phải khai báo tường minh để tránh hành vi quá dễ dãi do vô tình.

---

# 118. Yêu cầu về trust được khuyến nghị

Policy V1 nên yêu cầu:

```yaml
trust:
  allowed: [...]
```

thay vì âm thầm chọn các trust level được cho phép.

Policy `default` có sẵn có thể cung cấp hành vi tiêu chuẩn.

---

# 119. Chuẩn hóa Policy

YAML thô:

```text
Policy Manifest
```

trở thành:

```text
Schema Validate
↓
Reference Validate
↓
Normalize Defaults
↓
Policy Domain Object
```

Resolver sử dụng Policy đã được chuẩn hóa.

---

# 120. Effective Policy

V1 có một Policy được chọn.

Do đó:

```text
Effective Policy
=
selected Policy
```

Các lớp overlay của tổ chức/nhóm trong tương lai có thể đòi hỏi composition Policy.

Không implement điều này cho đến khi thực sự cần.

---

# 121. Override Policy riêng cho Project

V1 không nên cho phép override Policy inline tùy ý trong Project.

Tránh:

```yaml
policy:
  base: strict
  overrides:
    hook: allow
```

Ưu tiên chọn một Policy có tên.

Điều này cải thiện khả năng quản trị và review.

---

# 122. Vì sao tránh override Policy inline

Override inline gây ra:

```text
per-project drift

harder review

policy duplication

unclear ownership
```

Với các Project đặc biệt, hãy định nghĩa một Policy tường minh riêng.

---

# 123. Khả năng giải thích Policy

`ap explain` nên hiển thị các quyết định Policy liên quan.

Ví dụ:

```text
Candidate:
Provider X / TDD

Policy:
strict

Trust:
community

Decision:
rejected

Reason:
community trust level is not allowed
```

---

# 124. Liệt kê Policy

Tương lai:

```bash
ap list policies
```

có thể hiển thị:

```text
default
personal
strict
```

kèm tóm tắt ngắn gọn.

---

# 125. Xem chi tiết Policy

Tương lai:

```bash
ap policy show strict
```

có thể render ngữ nghĩa của Policy đã chuẩn hóa.

CLI chính xác thuộc về `cli-spec.md`.

---

# 126. Diff Policy

Thay đổi Policy có thể ảnh hưởng đến nhiều Project.

Semantic diff trong tương lai nên hiển thị:

```text
trust community:
allow → deny

hooks:
prompt → review
```

Điều này hỗ trợ việc review về mặt quản trị.

---

# 127. Phân tích tác động của Policy

Với một thay đổi Policy:

```text
Policy
↓
Affected Candidates
↓
Capabilities
↓
Profiles / Projects
```

Các index được generate về sau có thể hỗ trợ điều này.

---

# 128. Phát hiện thay đổi nhạy cảm về bảo mật

Khi một bản cập nhật Provider đưa vào:

```text
new Hook

new MCP

new executable Command
```

quy trình cập nhật Catalog nên làm lộ rõ các thông tin này.

Policy quyết định cách các Project xử lý chúng.

---

# 129. Policy không thay thế security review

Policy có thể thực thi các rule quản trị.

Nó không thể chứng minh code tùy ý của bên thứ ba là an toàn.

Hệ thống không cung cấp một sandbox đầy đủ.

---

# 130. Policy không thay thế bảo mật của hệ điều hành

Policy không phải là:

```text
container isolation

filesystem sandboxing

network sandboxing

endpoint security
```

Nó là một lớp quyết định tất định trước khi materialization.

---

# 131. Policy không thay thế permission của Target

Nếu một Target runtime có hệ thống permission riêng:

```text
Target Adapter
```

nên giữ nguyên và sử dụng nó khi khả thi.

Policy và các cơ chế kiểm soát permission của runtime có thể bổ trợ cho nhau.

---

# 132. Cache quyết định Policy

Việc đánh giá Policy mang tính tất định và nhìn chung tốn ít chi phí.

V1 không cần một cache quyết định Policy lưu trữ lâu dài.

Tái sử dụng trong bộ nhớ trong một lần Resolution là đủ.

---

# 133. Quyết định Policy ổn định

Cùng:

```text
Candidate metadata
+
Policy
+
relevant Target context
```

phải tạo ra cùng một Policy Decision.

---

# 134. Tính tất định của Policy

Việc đánh giá Policy không được phụ thuộc vào:

```text
current time

remote popularity metrics

LLM interpretation

random values

interactive state
```

Trạng thái approval, nếu được đưa vào sau này, phải là input tường minh của Resolution.

---

# 135. Policy và Resolution input digest

Effective Policy đã chuẩn hóa phải góp phần vào:

```text
resolutionInputDigest
```

được dùng cho việc kiểm tra hợp lệ Project Lock.

---

# 136. Policy và lockfile

Project Lock không cần sao chép toàn bộ Policy.

Nó nên ghi lại:

```text
Policy identity

Resolution input digest
```

và tùy chọn:

```text
Policy digest
```

để phục vụ chẩn đoán.

---

# 137. Policy digest

Một Policy digest tất định có thể được tính từ nội dung Policy đã chuẩn hóa.

Về mặt khái niệm:

```text
policyDigest =
sha256(canonical normalized policy)
```

Hữu ích cho:

```text
lock drift

audit

debugging
```

---

# 138. Policy thay đổi mà ID không đổi

Ví dụ:

```text
strict.yaml
```

giữ nguyên ID:

```text
strict
```

nhưng thay đổi các trust rule.

Policy digest thay đổi.

Project Lock hiện có phải được kiểm tra hợp lệ lại.

---

# 139. Các Policy có sẵn

Các Policy ban đầu được khuyến nghị:

```text
default

personal

strict
```

`enterprise` có thể được đưa vào như một ví dụ/định hướng tương lai nhưng không nên đòi hỏi hạ tầng enterprise.

---

# 140. Mục tiêu của Default Policy

`default` nên hướng tới:

```text
reasonable safety

good usability

curated/community interoperability

review for security-sensitive behavior
```

Nó không nên âm thầm cho phép mọi thứ.

---

# 141. Mục tiêu của Personal Policy

`personal` có thể cho phép thử nghiệm nhiều hơn.

Ví dụ:

```text
community allowed

experimental prompt/review

MCP prompt
```

nhưng vẫn nên tránh tin cậy tự động.

---

# 142. Mục tiêu của Strict Policy

`strict` nên nhấn mạnh:

```text
trusted sources

restricted executable behavior

no experimental Components

explicit review
```

Hữu ích cho môi trường công việc hoặc môi trường được kiểm soát.

---

# 143. Mục tiêu của Enterprise Policy

Tương lai:

```text
approved Provider allowlist

no community

no interactive prompt

organization-approved executable Components

integrity requirements

possibly signature requirements
```

---

# 144. Ví dụ — Lọc theo trust

Các Candidate:

```text
A
trust: community
priority: 100

B
trust: curated
priority: 80
```

Policy:

```text
allowed:
first-party
official
curated
```

Đánh giá:

```text
A → deny

B → allow
```

Resolver:

```text
B → selected
```

---

# 145. Ví dụ — Security review

Candidate:

```text
trust: curated

type: hook
```

Policy:

```text
hook → review
```

Chế độ tương tác:

```text
approval required
```

CI:

```text
fail until explicit approval mechanism exists
```

---

# 146. Ví dụ — Từ chối Provider

Candidate:

```text
Provider:
provider-x

Trust:
curated
```

Policy:

```text
provider-x → deny
```

Kết quả:

```text
Candidate rejected
```

Việc từ chối theo Provider cụ thể mạnh hơn eligibility theo trust.

---

# 147. Ví dụ — Lock hiện có bị vô hiệu

Lock hiện có:

```text
TDD → Community Provider
```

Policy cũ:

```text
community allowed
```

Policy mới:

```text
community denied
```

Kết quả:

```text
existing lock cannot be preserved
```

Resolver tìm kiếm các Candidate đủ điều kiện khác.

---

# 148. Ví dụ — Lock hiện có được giữ nguyên bất chấp preference

Lock hiện có:

```text
TDD → curated Candidate
```

Preference mới của Policy:

```text
prefer official
```

Cả hai vẫn được cho phép.

Sync thông thường:

```text
preserve current lock
```

Update tường minh:

```text
official Candidate may become preferred
```

---

# 149. Ví dụ — Override tường minh bị từ chối

Project:

```text
TDD → Candidate X
```

Policy:

```text
Candidate X Provider denied
```

Kết quả:

```text
resolution fails
```

Không âm thầm chọn Candidate Y.

---

# 150. Ví dụ — Từ chối MCP bắc cầu

Candidate được chọn:

```text
research-skill
```

yêu cầu:

```text
external MCP
```

Policy:

```text
MCP → deny
```

Kết quả:

```text
research-skill candidate rejected
```

vì dependency bắt buộc của nó không thể thỏa mãn Policy.

---

# 151. Ví dụ — Package vẫn được cài đặt

Package X chứa:

```text
allowed planning skill

denied hook
```

Planning skill được chọn.

Nếu Package có thể được cài đặt mà không kích hoạt Hook:

```text
Package X may still be installed
Hook remains inactive
```

Nếu việc cài đặt Package tự động thực thi Hook:

```text
Package-level security metadata must cause Policy evaluation
```

Sự phân biệt này phụ thuộc vào Target/Package.

---

# 152. Các nhóm rule của Policy

Các nhóm được khuyến nghị:

```text
trust

providers

packages

components

component types

lifecycle

security

preferences
```

Tránh thêm field cho đến khi có một use case governance thực sự.

---

# 153. Khái niệm Policy Schema

Về mặt khái niệm:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated

  providers:
    allow: []
    deny: []

  packages:
    allow: []
    deny: []

  components:
    allow: []
    deny: []

    types:
      hook: review
      mcp: review

  lifecycle:
    experimental: deny
    deprecated: review

  security:
    network-access: review
    requires-credentials: review

  preferences:
    trust:
      - first-party
      - official
      - curated

    providers: []
```

Schema V1 cuối cùng có thể lược bỏ các field không dùng đến.

---

# 154. Schema V1 tối thiểu được khuyến nghị

Để tránh phức tạp quá sớm, V1 ban đầu có thể chỉ hỗ trợ:

```text
trust.allowed

providers.deny

packages.deny

components.deny

components.types

lifecycle.experimental

lifecycle.deprecated

preferences.trust

preferences.providers
```

Bổ sung các security fact phong phú hơn khi metadata thực tế của Component hỗ trợ chúng.

---

# 155. Vì sao bắt đầu hẹp

Các hệ thống Policy trở nên phức tạp rất nhanh.

V1 nên kiểm chứng sự phân biệt cốt lõi:

```text
eligibility
vs
preference
```

trước khi trở thành một ngôn ngữ security policy tổng quát.

---

# 156. Vị trí Policy Schema

Khuyến nghị:

```text
packages/schemas/schemas/policy.schema.json
```

hoặc có phiên bản:

```text
packages/schemas/schemas/v1alpha1/policy.schema.json
```

---

# 157. Vị trí implementation của Policy

Khuyến nghị:

```text
packages/core/src/policy/
```

Các module có thể có:

```text
evaluate.ts

trust.ts

providers.ts

components.ts

lifecycle.ts

preferences.ts

types.ts
```

Bố cục source chính xác không mang tính bắt buộc.

---

# 158. Contract của Policy Evaluator

Về mặt khái niệm:

```ts
interface PolicyEvaluator {
  evaluate(
    candidate: Candidate,
    policy: Policy,
    context: PolicyContext
  ): PolicyDecision
}
```

Hàm này nên có tính deterministic.

---

# 159. Policy Context

Context đã chuẩn hóa có thể gồm:

```text
Target

resolution mode

dependency role
```

Tránh đưa vào trạng thái Project không liên quan trừ khi cần thiết.

---

# 160. Policy cho Candidate và Dependency

Cả Candidate Component trực tiếp lẫn Component dependency bắc cầu đều phải được đánh giá.

Evaluator có thể nhận:

```text
role:
selected
dependency
```

nếu sau này các Policy phân biệt chúng.

V1 thông thường nên áp dụng cùng các ràng buộc security cứng.

---

# 161. Contract của Policy Preference

Việc đánh giá Policy có thể trả về:

```text
preference rank
```

tách biệt với:

```text
eligibility outcome
```

Ví dụ:

```text
decision:
allow

preference:
trustRank: 2
providerRank: 1
```

Resolver kết hợp chúng một cách deterministic.

---

# 162. Không dùng một Policy score "thần kỳ" duy nhất

Tránh:

```text
policyScore: 87
```

cho tất cả các chiều governance.

Nên ưu tiên các chiều preference có thứ tự và tường minh.

Điều này cải thiện khả năng giải thích.

---

# 163. Preference Tuple

Về mặt khái niệm:

```text
PolicyPreference

trustRank
providerRank
```

Resolver có thể so sánh chúng theo thứ tự từ điển (lexicographic) theo một thứ tự đã được tài liệu hóa.

---

# 164. Output giải thích Policy

Ví dụ:

```text
Policy:
strict

Candidate:
superpowers/superpowers#skill:test-driven-development

Ownership:
third-party

Trust:
curated

Component Type:
skill

Result:
allowed

Preference:
curated rank 3
```

---

# 165. Output khi Policy từ chối

Ví dụ:

```text
Candidate:
community-x/package#agent:tdd

Policy:
strict

Result:
rejected

Reason:
trust level "community" is not in allowed trust levels
```

---

# 166. Output khi Policy yêu cầu phê duyệt

Ví dụ:

```text
Candidate:
provider/package#mcp:github

Policy:
default

Result:
approval required

Reason:
third-party MCP Components require confirmation
```

---

# 167. Mã diagnostic của Policy

Các mã ban đầu được khuyến nghị:

```text
UNKNOWN_POLICY

INVALID_POLICY

POLICY_CONTRADICTION

POLICY_DENIED

POLICY_APPROVAL_REQUIRED

POLICY_PROVIDER_DENIED

POLICY_PACKAGE_DENIED

POLICY_COMPONENT_DENIED

POLICY_TRUST_DENIED

POLICY_COMPONENT_TYPE_RESTRICTED

POLICY_EXPERIMENTAL_DENIED

POLICY_DEPRECATED_REVIEW

POLICY_NON_INTERACTIVE_APPROVAL_REQUIRED
```

Bộ mã chính xác có thể được đơn giản hóa.

---

# 168. Yêu cầu đối với diagnostic

Diagnostic nên xác định:

```text
Policy ID

Candidate

matched rule

effective metadata

outcome

dependency path
```

khi phù hợp.

---

# 169. Ví dụ dependency path

```text
Candidate denied:

provider/package#mcp:external

Required by:
security-review-agent
→ security.review
→ engineering/security
→ backend-engineer
```

Điều này hữu ích hơn nhiều so với chỉ:

```text
MCP denied
```

đơn thuần.

---

# 170. Cảnh báo khi validate Policy

Các cảnh báo có thể có:

```text
Policy allows no trust levels

Provider allowlist makes all current Capabilities unresolvable

Preference references denied trust level

deprecated outcome configured but no deprecated implementations exist
```

Không phải cảnh báo nào cũng nên chặn việc load Policy.

---

# 171. Validate khả năng resolve của Policy

Validation nâng cao có thể mô phỏng các Profile tiêu biểu với một Policy.

Ví dụ:

```text
strict Policy
+
frontend-engineer
```

lý tưởng là nên resolve được.

Việc này thuộc về integration test, không phải validation Policy schema.

---

# 172. Unit test cho Policy

Kiểm thử:

```text
allowed trust

denied trust

Provider denial

Package denial

Component denial

Component type review

experimental denial

deprecated review

preference ordering

multiple rule outcome combination

non-interactive behavior
```

---

# 173. Integration test cho Resolver

Các kịch bản kiểm thử:

```text
high-priority Candidate rejected by Policy

next eligible Candidate selected

existing lock invalidated by Policy

existing lock preserved when only preference changes

explicit override denied by Policy

transitive dependency denied

cardinality-many filtered by Policy
```

---

# 174. Property test

Các invariant hữu ích:

```text
denied Candidate is never selected

Policy preference never makes a denied Candidate eligible

explicit override never bypasses denial

transitive dependency cannot bypass Policy

same Candidate + Policy produces same decision
```

---

# 175. Migration Policy

Việc phát triển schema có thể yêu cầu:

```text
v1alpha1
→ v1beta1
```

Migration phải bảo toàn ngữ nghĩa governance hiệu lực khi khả thi.

---

# 176. Tính ổn định của Policy API

Thay đổi ngữ nghĩa của:

```text
deny
review
prompt
allow
```

sẽ là thay đổi phá vỡ nghiêm trọng.

Các ý nghĩa cốt lõi này nên được ổn định từ sớm.

---

# 177. Tính ổn định của mô hình Trust

Các nhóm trust cũng nên phát triển một cách thận trọng.

Nếu nhu cầu trong tương lai đòi hỏi nhiều sắc thái hơn, nên ưu tiên:

```text
additional factual metadata
```

thay vì liên tục thêm trust level.

---

# 178. Trust là governance ở mức thô

Trust level được thiết kế có chủ đích để cung cấp một baseline ở mức thô.

Hành vi security chi tiết thuộc về:

```text
Component metadata
+
security Policy rules
```

Điều này ngăn chặn sự bùng nổ của hệ phân loại trust.

---

# 179. Anti-pattern của Policy — Profile đóng vai Policy

Tránh:

```text
strict-backend-engineer
secure-frontend-engineer
```

Profile định nghĩa vai trò.

Policy định nghĩa governance.

Hãy kết hợp:

```text
backend-engineer
+
strict
```

---

# 180. Anti-pattern của Policy — Provider preference đóng vai Capability mapping

Tránh hardcode:

```text
TDD always uses Superpowers
```

bên trong Policy.

Điều đó thuộc về:

```text
Catalog priority
```

hoặc override tường minh của Project.

Policy có thể ưu tiên các nhóm Provider, nhưng không nên trở thành một tầng semantic mapping khác.

---

# 181. Anti-pattern của Policy — Rule inline trong Project

Tránh để nhiều Project cùng tự định nghĩa:

```text
allow this Provider
deny this hook
```

theo kiểu inline.

Nên ưu tiên các Policy dùng chung có tên.

---

# 182. Anti-pattern của Policy — Script tùy ý

Không bao giờ dùng callback Policy thực thi tùy chỉnh trong Resolution cốt lõi.

---

# 183. Anti-pattern của Policy — Trust đồng nghĩa với độ phổ biến

Không dùng trực tiếp số sao, lượt tải hay độ phổ biến làm trust.

---

# 184. Anti-pattern của Policy — Trust đồng nghĩa với Ownership

Không giả định:

```text
third-party
→ community
```

hoặc:

```text
first-party
→ universally safe
```

Ownership và security là hai mối quan tâm tách biệt.

---

# 185. Anti-pattern của Policy — Lock thắng Policy

Sai:

```text
locked before
→ always allowed
```

Đúng:

```text
locked before
→ preferred only if still policy-valid
```

---

# 186. Anti-pattern của Policy — Prompt trong Resolver cốt lõi

Resolver cốt lõi không bao giờ được dừng lại để chờ input từ terminal.

Nó trả về một quyết định có cấu trúc.

---

# 187. Anti-pattern của Policy — Phê duyệt âm thầm

Không chuyển đổi:

```text
review
```

thành:

```text
allow
```

một cách âm thầm.

Việc phê duyệt phải tường minh.

---

# 188. Anti-pattern của Policy — Policy đóng vai Sandbox

Policy không thể ngăn mã tùy ý hoạt động sai sau khi được thực thi.

Nó kiểm soát việc Component có được phép đi vào Resolution hay không.

---

# 189. Các invariant của Policy

Hệ thống Policy phải bảo toàn:

```text
1. Policy governs eligibility and preference, not Capability semantics.

2. Policy evaluation is deterministic.

3. Policy denial is a hard constraint.

4. Denied Candidates are never selected.

5. Explicit Project overrides cannot bypass denial.

6. Existing locks cannot bypass denial.

7. Target compatibility remains independent from Policy.

8. Trust and ownership are separate concepts.

9. Trust is not a universal quality score.

10. Security-sensitive transitive dependencies are evaluated.

11. Review and prompt do not silently become allow.

12. Non-interactive mode never waits for user approval.

13. Policy preference applies only among eligible Candidates.

14. Policy does not mutate Catalog metadata.

15. Policy does not mutate Project intent.

16. Policy manifests remain declarative.

17. Policy does not require an LLM.

18. Policy does not execute arbitrary code.

19. Policy content contributes to Resolution reproducibility.

20. Runtime security remains separate from Policy governance.
```

---

# 190. Các tính năng Policy bắt buộc trong V1

V1 nên hỗ trợ:

```text
named Policies

allowed trust levels

Provider denial

Package denial

Component denial

Component type rules

experimental lifecycle rule

deprecated lifecycle rule

trust preference

Provider preference

structured Policy decisions

non-interactive failure for unresolved approval
```

---

# 191. V1 có thể hoãn lại

V1 có thể hoãn lại:

```text
organization Policy inheritance

persisted approvals

signature requirements

complex security-fact expressions

regex matching

Capability namespace rules

time-based rules

remote policy server

RBAC

policy-as-code scripting

full audit trail
```

---

# 192. Tiêu chí chấp nhận V1

Policy V1 sẵn sàng khi:

```text
strict can reject community Candidate

default can allow community Candidate

Policy can reject a specific Provider

Policy can reject a specific Component

hook/MCP can require review or prompt

CI fails safely for unresolved approval

high-priority denied Candidate never wins

next eligible Candidate can be selected

explicit override denied by Policy fails

existing lock denied by new Policy is invalidated

transitive security-sensitive dependency is evaluated

Policy preferences affect update/fresh selection without overriding hard constraints
```

---

# 193. Tóm tắt quá trình đánh giá

Với mỗi Candidate:

```text
Candidate
   ↓
Provider / Package / Component explicit restrictions
   ↓
Trust
   ↓
Lifecycle
   ↓
Security-sensitive rules
   ↓
Component-type rules
   ↓
Approval requirements
   ↓
Policy Outcome
   ↓
Preference Metadata
```

Sau đó Resolver tiêu thụ:

```text
eligible Candidate
+
Policy preference
```

cùng với các tầng preference khác của nó.

---

# 194. Mô hình tư duy về Policy

Mô hình tư duy ngắn gọn và hữu ích nhất là:

```text
Capability asks:
"What do I need?"

Catalog asks:
"What can provide it?"

Policy asks:
"What am I willing to use?"

Resolver asks:
"Which allowed option should win?"
```

---

# 195. Policy trong một câu

> **Policy là một tầng governance deterministic và declarative, lọc các Candidate implementation theo trust, nguồn gốc (provenance), lifecycle và đặc tính security, tùy chọn biểu đạt preference giữa các Candidate được phép, và không bao giờ cho phép implementation priority, project override hay lock hiện có vượt qua các hạn chế cứng.**