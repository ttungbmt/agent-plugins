# Đóng góp

Cảm ơn bạn đã đóng góp cho Agent Plugins.

Agent Plugins được thiết kế như một nền tảng quản lý capability trung lập với công cụ dành cho các hệ sinh thái AI agent. Các đóng góp nên bảo toàn những thuộc tính kiến trúc cốt lõi của project:

```text
canonical semantics
+
deterministic resolution
+
reproducible builds
+
target portability
+
explicit trust
+
safe automation
```

Tài liệu này giải thích cách đóng góp code, nội dung, adapter, tài liệu, test và các thay đổi kiến trúc.

---

# 1. Trước khi bạn đóng góp

Vui lòng hiểu kiến trúc cốt lõi trước khi thực hiện các thay đổi mang tính cấu trúc.

Thứ tự đọc được khuyến nghị:

```text
README.md

docs/problem.md
docs/vision.md
docs/goals.md
docs/non-goals.md

docs/architecture.md
docs/domain-model.md
docs/capability-model.md
docs/source-of-truth.md

docs/specs/manifest-spec.md
docs/specs/catalog-spec.md
docs/specs/resolution-spec.md
docs/specs/policy-spec.md
docs/specs/lockfile-spec.md
docs/specs/adapter-spec.md
docs/specs/cli-spec.md

docs/security-model.md
docs/trust-model.md
docs/testing-strategy.md
```

Bạn không cần đọc mọi tài liệu cho một lỗi chính tả nhỏ hoặc một sửa đổi tài liệu.

Với các thay đổi ảnh hưởng đến kiến trúc, ngữ nghĩa domain, resolution, adapter, bảo mật, trust, cấu hình hoặc khả năng tương thích, bắt buộc phải đọc các đặc tả liên quan.

---

# 2. Các nguyên tắc đóng góp cốt lõi

Mọi đóng góp nên tuân theo các quy tắc sau.

## 2.1 Canonical trước tiên

Canonical model là nguồn chân lý về ngữ nghĩa.

Không thiết kế tính năng xoay quanh một runtime cụ thể.

Tránh:

```text
Claude-specific concepts
inside
canonical package definitions
```

Nên dùng:

```text
Canonical capability
        ↓
Target Adapter
        ↓
Claude representation
```

---

## 2.2 Interface mỏng, core phong phú

CLI, TUI, các tích hợp IDE và các UI trong tương lai là client của tầng application/core.

Không đặt business logic trực tiếp bên trong command handler.

Nên dùng:

```text
CLI
 ↓
Application Service
 ↓
Core
```

Tránh:

```text
CLI command
 ↓
resolver logic
 ↓
filesystem mutation
```

---

## 2.3 Resolution trước rendering

Target adapter tiêu thụ một môi trường canonical đã được resolve sẵn.

Adapter MUST NOT thực hiện dependency resolution ẩn.

---

## 2.4 Không thực thi ẩn

Việc discovery, validation, resolution, build và installation của Package MUST NOT thực thi code tùy ý do package cung cấp.

Package chủ yếu là dữ liệu khai báo.

---

## 2.5 Tính tất định

Các input tương đương phải tạo ra các output tương đương.

Tránh để output phụ thuộc vào:

```text
filesystem enumeration order
current time
machine hostname
absolute local paths
random values
network state
```

trừ khi được yêu cầu rõ ràng.

---

## 2.6 Tường minh hơn là "phép thuật"

Ưu tiên hành vi tường minh cho:

```text
updates
trust
sources
policy
filesystem mutation
target mappings
```

Tránh các side effect ẩn.

---

## 2.7 Bảo toàn khả năng giải thích

Người dùng nên có thể hiểu được:

```text
why a package exists
where it came from
which Role selected it
which policy affected it
which adapter rendered it
which files changed
```

Các tính năng mới nên bảo toàn hoặc cải thiện thuộc tính này.

---

# 3. Các loại đóng góp

Các đóng góp thường thuộc những nhóm sau:

```text
Core

Schemas

Catalog

Resolver

Policy

Trust

Lockfile

Adapters

CLI

First-party content

Vendor integrations

Tests

Documentation

Tooling
```

Mỗi nhóm có những yêu cầu khác nhau.

---

# 4. Cấu trúc repository

Cấu trúc chính xác có thể thay đổi, nhưng người đóng góp nên kỳ vọng các ranh giới tương tự như:

```text
packages/
├── core/
├── schemas/
├── catalog/
├── resolver/
├── policy/
├── lockfile/
├── adapter-kit/
├── adapters/
├── application/
├── cli/
└── test-kit/

first-party/
vendor/
overlays/

roles/
presets/

docs/
tests/
```

Xem:

```text
docs/repository-structure.md
```

để biết cấu trúc chính thức.

---

# 5. Thiết lập môi trường phát triển

## Yêu cầu

Sử dụng các phiên bản runtime và package manager được repository định nghĩa.

Kiểm tra:

```text
package.json
mise.toml
.tool-versions
.nvmrc
```

hoặc các file tương đương nếu có.

Không giả định rằng một phiên bản được cài đặt toàn cục là tương thích.

---

# 6. Cài đặt dependency

Workflow điển hình:

```bash
pnpm install
```

Sử dụng package manager được repository cấu hình.

Không tạo lại lockfile của package manager bằng một package manager khác.

---

# 7. Kiểm tra môi trường

Chạy:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Mọi kiểm tra nên pass trước khi bắt đầu các thay đổi đáng kể.

---

# 8. Vòng lặp phát triển được khuyến nghị

Một chu kỳ phát triển thông thường là:

```text
understand specification
        ↓
write or update tests
        ↓
implement smallest coherent change
        ↓
run focused tests
        ↓
run affected integration tests
        ↓
update documentation
        ↓
run full required checks
```

Đối với công việc kiến trúc:

```text
spec
→ tests
→ implementation
```

là cách rất được khuyến khích.

---

# 9. Branch

Sử dụng các feature branch tồn tại ngắn.

Tên được khuyến nghị:

```text
feat/resolver-explain

feat/claude-adapter

fix/path-traversal

docs/trust-model

test/adapter-conformance

refactor/catalog-index
```

Tránh các tên mơ hồ như:

```text
changes
update
work
test2
```

---

# 10. Phong cách commit

Giữ commit tập trung.

Phong cách được khuyến nghị:

```text
feat(resolver): add resolution provenance

fix(adapter): reject target path traversal

docs(trust): clarify revision-level trust

test(policy): cover transitive trust denial

refactor(core): separate canonical identifiers
```

Conventional Commits được khuyến nghị nếu repository áp dụng chúng.

---

# 11. Commit nhỏ

Ưu tiên các commit đại diện cho một thay đổi mạch lạc.

Tốt:

```text
add canonical reference parser
add parser tests
```

Tránh trộn lẫn:

```text
resolver rewrite
CLI colors
README changes
dependency upgrade
```

trong một commit trừ khi chúng không thể tách rời.

---

# 12. Pull request

Một pull request nên giải thích:

```text
what changed

why it changed

which architectural area is affected

how it was tested

whether compatibility changes exist

whether security/trust implications exist
```

Giữ mô tả ngắn gọn nhưng đầy đủ.

---

# 13. Checklist cho pull request

Trước khi yêu cầu review:

```text
[ ] Code builds

[ ] Lint passes

[ ] Typecheck passes

[ ] Relevant unit tests pass

[ ] Relevant integration tests pass

[ ] Security tests pass if applicable

[ ] Golden fixtures reviewed if changed

[ ] Documentation updated

[ ] No unrelated changes included

[ ] No secrets committed

[ ] Compatibility impact considered
```

---

# 14. Thay đổi theo hướng spec trước

Cần cập nhật đặc tả trước hoặc cùng lúc với implementation khi thay đổi:

```text
canonical domain semantics

manifest format

resolution behavior

policy semantics

trust semantics

lockfile format

adapter contract

CLI machine interface

configuration format

update semantics
```

Không đưa hành vi kiến trúc vào chỉ thông qua implementation.

---

# 15. Quy tắc quyết định kiến trúc

Nếu một thay đổi ảnh hưởng đến nhiều hơn một subsystem chính, trước tiên hãy xác định xem có cần cập nhật architecture/spec hay không.

Ví dụ:

```text
new dependency semantics
→ resolution-spec.md

new trust level
→ trust-model.md

new adapter capability state
→ adapter-spec.md

new CLI JSON contract
→ cli-spec.md

new source trust rule
→ trust-model.md + source-spec.md
```

---

# 16. Đóng góp cho core domain

Các thay đổi đối với canonical domain type cần được cẩn trọng hơn.

Core MUST luôn:

```text
runtime-neutral
filesystem-neutral
CLI-neutral
source-neutral
```

Không thêm các field như:

```yaml
claudeCommandPath:
codexAgentFile:
geminiMode:
```

vào canonical domain type.

Biểu diễn đặc thù của target thuộc về adapter.

---

# 17. Canonical ID

Mọi domain entity nên sử dụng canonical identifier khi áp dụng được.

Ví dụ:

```text
plugin:superpowers
skill:typescript
agent:reviewer
prompt:research
preset:frontend-core
role:frontend
```

Không dùng đường dẫn filesystem làm danh tính của entity.

---

# 18. Đóng góp schema

Mọi thay đổi schema đều yêu cầu:

```text
schema update

valid fixture

invalid fixture

parser test

validation diagnostics

compatibility review
```

Các thay đổi schema gây breaking có thể yêu cầu:

```text
schema version bump
migration
release note
```

---

# 19. Đóng góp manifest

Các thay đổi manifest phải luôn mang tính khai báo.

Tránh cấu hình có thể thực thi như:

```js
export default function configure() {}
```

Canonical manifest nên sử dụng các định dạng dữ liệu an toàn như:

```text
YAML
JSON
```

như được định nghĩa bởi các đặc tả của project.

---

# 20. Đóng góp catalog

Hành vi của catalog phải luôn tất định.

Việc thêm tính năng catalog MUST NOT ngầm thay đổi hành vi resolution.

Ví dụ:

```text
search ranking
```

không được trở thành:

```text
publisher resolution ranking
```

nếu không có một đặc tả resolver tường minh.

---

# 21. Đóng góp resolver

Resolver là một subsystem quan trọng.

Các thay đổi resolver MUST bao gồm test cho:

```text
direct dependency behavior

transitive dependencies

deduplication

conflicts

cycles

stable ordering

explainability
```

Khi phù hợp, cũng nên test với các thứ tự input khác nhau.

---

# 22. Các giới hạn của resolver

Resolver MUST NOT:

```text
access the network

render target files

write project files

execute package content

invoke target adapters
```

Nó tính toán trạng thái hiệu lực canonical.

---

# 23. Khả năng giải thích của resolver

Khi thêm hành vi resolution mới, cũng cần cân nhắc cách quyết định đó được giải thích.

Một quy tắc resolution không thể giải thích:

```text
why this component was selected
```

là chưa hoàn chỉnh.

---

# 24. Đóng góp Policy

Các quy tắc Policy phải:

```text
deterministic
explicit
machine-readable
explainable
```

Mọi kết quả deny SHOULD xác định:

```text
matching policy
rule
subject
reason
```

Policy MUST luôn có thẩm quyền cao hơn adapter và các command tiện ích của CLI.

---

# 25. Đóng góp trust

Trust là bằng chứng và mức độ tin cậy.

Nó KHÔNG phải là:

```text
permission
risk
quality
popularity
```

Không đưa vào trust ngầm dựa trên:

```text
GitHub stars
download count
README claims
package self-declaration
```

Các thay đổi về trust nên bảo toàn bằng chứng và khả năng giải thích.

---

# 26. Đóng góp bảo mật

Các thay đổi nhạy cảm về bảo mật yêu cầu các regression test chuyên biệt.

Các khu vực nhạy cảm về bảo mật bao gồm:

```text
path handling
filesystem mutation
source fetching
archives
symlinks
overlays
object merging
integrity
secrets
shell execution
trust
policy
```

Nếu sửa một lỗi bảo mật, hãy thêm một test tái hiện lỗi đó.

---

# 27. Đóng góp lockfile

Output của lockfile phải luôn tất định.

Các thay đổi ảnh hưởng đến cấu trúc lockfile yêu cầu:

```text
schema update

round-trip tests

determinism tests

compatibility review
```

Không đưa vào các giá trị đặc thù theo máy hoặc dễ thay đổi trừ khi được yêu cầu rõ ràng.

---

# 28. Đóng góp target adapter

Target adapter chuyển đổi:

```text
Resolved Canonical Environment
        ↓
Target-Native Representation
```

Chúng không định nghĩa lại ngữ nghĩa canonical.

Một Target Adapter MUST:

```text
declare capabilities

validate input

produce a Render Plan

render deterministically

detect collisions

respect Policy

remain inside approved target roots
```

---

# 29. Thêm một Target Adapter

Một Target Adapter mới thông thường nên nằm dưới:

```text
packages/adapters/target/<target>/
```

hoặc vị trí tương đương do repository định nghĩa.

Các thành phần bắt buộc:

```text
adapter manifest

capability declaration

validation

planning

rendering

tests

golden fixtures
```

---

# 30. Tính tuân thủ của adapter

Mọi adapter dùng cho production MUST vượt qua bộ conformance dùng chung.

Các kiểm tra kỳ vọng bao gồm:

```text
metadata

capabilities

determinism

path safety

collision detection

unsupported feature handling
```

Không tạo các ngoại lệ đặc thù theo target cho các contract cốt lõi của adapter khi chưa có review kiến trúc.

---

# 31. Thiết kế theo native của target

Adapter nên sử dụng ngữ nghĩa native của target khi khả thi.

Tránh làm phẳng mọi thứ thành Markdown chung chung chỉ vì tính di động.

Mô hình đúng:

```text
Canonical semantics
      ↓
Target-specific mapping
      ↓
Native output
```

---

# 32. Các tính năng không được hỗ trợ

Target adapter MUST NOT âm thầm loại bỏ các capability có ý nghĩa nhưng không được hỗ trợ.

Sử dụng:

```text
native

mapped

emulated

unsupported
```

và phát ra các diagnostic phù hợp.

---

# 33. Đóng góp source adapter

Source adapter chuyển đổi nội dung bên ngoài thành các canonical package.

Chúng MUST tách biệt:

```text
discover

fetch

normalize

verify
```

Source adapter MUST bảo toàn provenance.

---

# 34. An toàn nguồn

Source adapter MUST NOT:

```text
execute repository hooks

run arbitrary package scripts

trust package self-declared trust level

extract archives outside controlled roots
```

Nội dung bên ngoài là không đáng tin cậy cho đến khi được validate.

---

# 35. Đóng góp nội dung first-party

Nội dung first-party nên tối ưu cho:

```text
quality
clarity
reuse
target neutrality
composability
```

thay vì số lượng.

Tránh trùng lặp các skill hoặc agent gần như giống hệt nhau.

Ưu tiên các capability có thể tái sử dụng.

---

# 36. Vị trí đặt nội dung

Trước khi thêm nội dung, hãy xác định xem nó là:

```text
Skill

Agent

Prompt

Command

Hook

Plugin

Preset

Role
```

Sử dụng domain model thay vì lựa chọn dựa trên sự tiện lợi của thư mục.

---

# 37. Skill

Một Skill nên đại diện cho chuyên môn, workflow hoặc capability có thể tái sử dụng.

Ví dụ tốt:

```text
typescript-best-practices

root-cause-analysis

product-discovery

technical-writing
```

Tránh các skill quá rộng kiểu ôm đồm mọi thứ.

---

# 38. Agent

Một Agent nên đại diện cho một vai trò có ý nghĩa hoặc một ngữ cảnh thực thi chuyên biệt.

Ví dụ:

```text
code-reviewer

architecture-reviewer

product-researcher
```

Tránh tạo một Agent khi một Skill là đủ.

---

# 39. Preset

Preset nên:

```text
small
composable
capability-oriented
target-neutral
```

Ví dụ:

```text
typescript

testing

frontend-quality

mental-models
```

Tránh các preset khổng lồ cố gắng đại diện cho cả một tổ chức.

---

# 40. Role

Role mô tả các vai trò hoặc môi trường hiệu lực của người dùng/project.

Ví dụ:

```text
frontend

backend

product-manager

second-brain
```

Role MAY kết hợp nhiều Preset và package.

Tránh các Role đặc thù theo target như:

```text
frontend-claude
frontend-codex
```

trừ khi môi trường ngữ nghĩa thực sự khác biệt.

---

# 41. Đóng góp vendor

Nội dung vendor đại diện cho các nguồn upstream đã được tuyển chọn.

Người đóng góp MUST bảo toàn:

```text
upstream provenance

revision

integrity

license metadata where available
```

Không sửa trực tiếp nội dung upstream đã được vendor khi một Overlay có thể biểu diễn thay đổi đó.

---

# 42. Đóng góp Overlay

Overlay thay đổi ngữ nghĩa.

Adapter thay đổi cách biểu diễn.

Giữ sự phân biệt này một cách nghiêm ngặt:

```text
Overlay
    = what the content means

Adapter
    = how the content is rendered
```

Hành vi của Overlay phải luôn tất định và có thể test được.

---

# 43. Đóng góp CLI

CLI là một tầng điều phối và trình bày.

Các implementation của command SHOULD:

```text
parse input

call application service

present result
```

Chúng SHOULD NOT implement trực tiếp các quy tắc domain.

---

# 44. Thiết kế command CLI

Nên dùng:

```bash
agent-plugins build --target claude
```

thay vì:

```bash
agent-plugins claude build
```

Target là tham số của adapter, không phải các nhóm domain cấp cao nhất.

---

# 45. Khả năng tương thích máy của CLI

Các thay đổi đối với:

```text
--json
exit codes
diagnostic codes
```

là các thay đổi API.

Hãy xử lý chúng cẩn thận hơn so với các thay đổi định dạng dành cho con người.

---

# 46. Output của CLI

Sử dụng:

```text
stdout
    result

stderr
    diagnostics
    logging
    progress
```

Không làm hỏng output JSON bằng spinner, định dạng ANSI hoặc văn xuôi.

---

# 47. Đóng góp tài liệu

Các thay đổi tài liệu luôn được hoan nghênh.

Sử dụng thuật ngữ nhất quán từ:

```text
docs/terminology.md
```

Không đưa ra các từ đồng nghĩa mới cho những khái niệm domain đã được thiết lập khi không có lý do.

---

# 48. Phong cách tài liệu

Nên dùng:

```text
short sections

explicit terminology

concrete examples

ASCII diagrams where useful

normative MUST / SHOULD / MAY for specifications
```

Tránh ngôn ngữ marketing không cần thiết trong các đặc tả kỹ thuật.

---

# 49. Ngôn ngữ chuẩn tắc

Các đặc tả sử dụng:

```text
MUST
MUST NOT

SHOULD
SHOULD NOT

MAY
```

Hãy dùng chúng một cách có chủ đích.

`MUST` biểu thị các yêu cầu về kiến trúc hoặc hành vi.

---

# 50. Phong cách code

Tuân theo tự động hóa của repository.

Không tự tay chống lại formatter.

Các công cụ kỳ vọng có thể bao gồm:

```text
Biome
TypeScript strict mode
```

Sử dụng kiểu tường minh tại các ranh giới public quan trọng.

Tránh các type assertion không cần thiết.

---

# 51. Hướng dẫn TypeScript

Nên dùng:

```text
unknown
```

thay vì:

```text
any
```

tại các ranh giới không đáng tin cậy.

Validate dữ liệu bên ngoài trước khi chuyển nó thành domain type.

Không chỉ dựa vào kiểu compile-time cho:

```text
files
network responses
user input
manifests
configuration
```

---

# 52. Xử lý lỗi

Sử dụng diagnostic có cấu trúc cho các lỗi domain/application được dự kiến trước.

Tránh dùng exception không có cấu trúc làm luồng điều khiển thông thường.

Một diagnostic thường nên chứa:

```text
code
severity
message
context
suggestion where useful
```

---

# 53. Mã diagnostic

Các diagnostic ổn định nên sử dụng namespace rõ ràng.

Ví dụ:

```text
MANIFEST_INVALID

RESOLVE_DEPENDENCY_CONFLICT

POLICY_DENIED

TRUST_LEVEL_TOO_LOW

ADAPTER_PATH_COLLISION

SEC_PATH_TRAVERSAL
```

Test nhìn chung nên assert mã thay vì câu chữ chính xác dành cho con người.

---

# 54. Yêu cầu về test

Tuân theo:

```text
docs/testing-strategy.md
```

Một thay đổi nên bao gồm sự kết hợp phù hợp giữa các loại:

```text
unit
integration
contract
golden
security
E2E
```

test.

---

# 55. Vị trí test

Ưu tiên test cục bộ trong package cho hành vi của package.

Ví dụ:

```text
packages/resolver/test/
```

Sử dụng test ở cấp root cho hành vi xuyên hệ thống:

```text
tests/integration/
tests/e2e/
tests/security/
```

---

# 56. Unit test

Sử dụng unit test cho hành vi thuần.

Ví dụ:

```text
ID parsing

policy matching

graph algorithms

trust derivation

path normalization
```

---

# 57. Integration test

Sử dụng integration test cho các ranh giới như:

```text
manifest → catalog

catalog → resolver

resolved graph → adapter

render plan → filesystem
```

---

# 58. Golden test

Target adapter nên sử dụng golden fixture.

Không bao giờ cập nhật golden output một cách mù quáng.

Review mọi diff.

---

# 59. Test bảo mật

Lỗi bảo mật yêu cầu regression test.

Ví dụ:

```text
path traversal

unknown file overwrite

trust escalation

policy bypass

prototype pollution

integrity mismatch
```

---

# 60. Tính tất định của test

Test không nên dựa vào:

```text
current time

public internet

machine-specific paths

random filesystem order
```

trừ khi được kiểm soát tường minh.

---

# 61. Internet công cộng

Các test thông thường MUST NOT phụ thuộc vào tính khả dụng của internet công cộng.

Sử dụng:

```text
local Git repositories

local HTTP fixtures

mock servers

fixture archives
```

Network smoke test có thể tồn tại riêng biệt.

---

# 62. Filesystem tạm thời

Các filesystem integration test nên sử dụng các thư mục tạm thời được cô lập.

Không bao giờ ghi dữ liệu test vào cấu hình project hoặc thư mục runtime thực tế của người đóng góp.

---

# 63. Không dùng secret thật

Test và ví dụ MUST sử dụng thông tin xác thực giả.

Không bao giờ commit:

```text
API keys
tokens
SSH keys
private URLs with embedded credentials
```

---

# 64. Quy tắc dependency kiến trúc

Dependency nên hướng vào trong.

Hướng điển hình:

```text
CLI
 ↓
Application
 ↓
Domain/Core
```

Ví dụ về các coupling bị cấm:

```text
core → cli

resolver → target adapter

domain → filesystem apply

target adapter → source adapter
```

Architecture test có thể thực thi các quy tắc này.

---

# 65. Thêm dependency

Trước khi thêm một dependency, hãy tự hỏi:

```text
Is this necessary?

Can the standard library solve it?

Is it maintained?

Does it affect security-sensitive behavior?

Does it significantly increase package weight?
```

Đặc biệt thận trọng với các dependency xử lý:

```text
YAML

archives

Git

templates

process execution

filesystem paths
```

---

# 66. Nâng cấp dependency

Việc nâng cấp dependency SHOULD được tách riêng khi khả thi.

Với các nâng cấp đáng kể, hãy ghi chú:

```text
breaking behavior

security implications

runtime requirements
```

Tránh trộn các nâng cấp dependency lớn vào các PR tính năng không liên quan.

---

# 67. Các yếu tố kích hoạt review bảo mật

Một thay đổi cần được cân nhắc tường minh về bảo mật nếu nó thêm hoặc sửa đổi:

```text
network access

process execution

filesystem write

archive extraction

symlinks

secrets

authentication

trust elevation

policy bypass

third-party executable code
```

---

# 68. Các yếu tố kích hoạt review trust

Review ngữ nghĩa trust khi thay đổi:

```text
source identity

publisher handling

provenance

integrity

trust levels

trust precedence

revocation

dependency trust propagation
```

---

# 69. Review khả năng tương thích

Cân nhắc khả năng tương thích khi thay đổi:

```text
manifest schemas

project configuration

lockfile

CLI flags

CLI JSON

diagnostic codes

Adapter API

Source Adapter API
```

Việc phá vỡ các interface ổn định đòi hỏi versioning có chủ đích.

---

# 70. Versioning

Tuân theo:

```text
versioning-spec.md
```

khi đã được hoàn thiện.

Cho đến lúc đó, tránh các thay đổi breaking không cần thiết đối với các contract đã được thiết lập.

---

# 71. File được sinh ra

Không tự tay chỉnh sửa các artifact được sinh ra như thể chúng là nội dung nguồn chân lý.

Các file được sinh ra nên có thể tái tạo từ input canonical.

Nếu output được sinh ra bị sai:

```text
fix canonical source
or
fix adapter
```

thay vì vá `dist/`.

---

# 72. Định dạng output được sinh ra

Output được sinh ra SHOULD có tính tất định về:

```text
ordering
newline behavior
serialization
```

Không đưa vào sự ngẫu nhiên mang tính thẩm mỹ.

---

# 73. An toàn filesystem

Mọi thao tác ghi filesystem phải bắt nguồn từ các plan đã được validate.

Tránh các thao tác ghi trực tiếp rải rác trong domain code.

Nên dùng:

```text
Resolved State
     ↓
Render Plan
     ↓
Validated Operations
     ↓
Filesystem Apply
```

---

# 74. Quyền sở hữu file

Không bao giờ giả định một file thuộc về Agent Plugins chỉ vì nó tồn tại trong một thư mục target.

Các file không xác định phải được giữ nguyên hoặc gây ra một lỗi xung đột an toàn.

---

# 75. Thay đổi về hiệu năng

Không tối ưu hóa quá sớm.

Đối với công việc về hiệu năng:

```text
measure
→ identify bottleneck
→ optimize
→ benchmark
```

Tránh sự phức tạp kiến trúc chỉ vì tốc độ mang tính giả định.

---

# 76. Refactoring

Refactoring nên bảo toàn hành vi có thể quan sát được trừ khi có tuyên bố rõ ràng khác.

Với các refactor lớn:

```text
existing tests should continue passing
```

trước khi thay đổi ngữ nghĩa.

---

# 77. Thay đổi lớn

Với các thay đổi đáng kể, hãy chia công việc thành:

```text
spec

foundational refactor

behavior change

migration

documentation
```

khi khả thi.

Điều này giúp việc review an toàn hơn.

---

# 78. Thay đổi breaking

Các thay đổi breaking yêu cầu:

```text
clear motivation

affected contract

migration path

updated specification

updated tests

release note
```

Tránh các thay đổi breaking chỉ vì sở thích thẩm mỹ.

---

# 79. Checklist cho tính năng mới

Trước khi thêm một tính năng, hãy xác nhận:

```text
[ ] It fits project goals

[ ] It is not explicitly a non-goal

[ ] Correct architectural layer identified

[ ] Specification impact considered

[ ] Security impact considered

[ ] Trust impact considered

[ ] Determinism preserved

[ ] Tests planned

[ ] Documentation planned
```

---

# 80. Checklist cho adapter mới

```text
[ ] Adapter manifest

[ ] Capability declaration

[ ] Validation

[ ] Render Plan

[ ] Deterministic rendering

[ ] Conformance tests

[ ] Golden fixtures

[ ] Collision tests

[ ] Path-safety tests

[ ] Unsupported features documented
```

---

# 81. Checklist cho source adapter mới

```text
[ ] Discover

[ ] Fetch

[ ] Normalize

[ ] Verify

[ ] Provenance

[ ] Immutable revision support

[ ] Integrity support

[ ] Offline behavior

[ ] Contract tests

[ ] Security tests
```

---

# 82. Checklist cho first-party package mới

```text
[ ] Correct package/component type

[ ] Unique canonical ID

[ ] Target-neutral semantics

[ ] Clear capability metadata

[ ] Dependencies minimal

[ ] No hidden executable behavior

[ ] Validation passes

[ ] Relevant Role/Preset integration reviewed
```

---

# 83. Checklist cho Preset mới

```text
[ ] Clear capability purpose

[ ] Small and composable

[ ] No target-specific semantics

[ ] No unnecessary duplicate packages

[ ] Nested composition tested
```

---

# 84. Checklist cho Role mới

```text
[ ] Represents a meaningful role/environment

[ ] Reuses Presets where possible

[ ] Avoids duplicating another Role

[ ] Inheritance is clear

[ ] Policy requirements are intentional

[ ] Target-independent unless semantically necessary
```

---

# 85. Checklist cho CLI command mới

```text
[ ] Clear user intent

[ ] Does not duplicate existing command semantics

[ ] Calls application layer

[ ] Help included

[ ] Error handling included

[ ] Exit code tested

[ ] JSON output added where appropriate

[ ] Non-TTY behavior tested

[ ] Mutation is explicit
```

---

# 86. Checklist cho tài liệu

```text
[ ] Uses canonical terminology

[ ] Links relevant specs

[ ] Examples match current architecture

[ ] No deprecated commands

[ ] No target-specific claim presented as canonical

[ ] Diagrams reflect current flow
```

---

# 87. Ưu tiên khi review

Người review nên ưu tiên:

```text
correctness

architecture

security

determinism

compatibility

tests

maintainability

style
```

Các vấn đề về phong cách không nên làm xao nhãng khỏi các vấn đề về kiến trúc hoặc tính đúng đắn.

---

# 88. Câu hỏi khi review

Các câu hỏi review hữu ích bao gồm:

```text
Does this belong in this layer?

Does this introduce target-specific leakage?

Could this behavior be nondeterministic?

Can Policy still enforce this?

Could this overwrite user files?

Can this be explained to users?

Does this change a compatibility surface?

Is this tested at the right level?
```

---

# 89. Dấu hiệu cảnh báo về kiến trúc

Người đóng góp và người review nên đánh dấu các pattern như:

```text
target-specific conditionals in core

network calls inside resolver

filesystem writes inside catalog

package code execution during install

trust assigned by package metadata

Policy bypass flags

implicit remote dependency discovery

silent unsupported capability dropping
```

Những điều này thường cho thấy một vi phạm kiến trúc.

---

# 90. Kỷ luật về phạm vi

Giữ PR tập trung.

Nếu phát hiện các cải tiến không liên quan, hãy ưu tiên mở một issue riêng hoặc một PR tiếp theo trừ khi chúng chặn thay đổi hiện tại.

Các thay đổi nhỏ, dễ review scale tốt hơn so với các lần viết lại khổng lồ.

---

# 91. Tính năng thử nghiệm

Các tính năng thử nghiệm MUST được xác định rõ ràng.

Chúng nên tránh đóng băng public API quá sớm.

Trạng thái thử nghiệm không cho phép vượt qua các ranh giới bảo mật hoặc kiến trúc.

---

# 92. Tính năng bị deprecate

Khi deprecate một hành vi:

```text
document replacement

provide migration path

add warning

maintain compatibility for defined period
```

Không âm thầm loại bỏ hành vi đã được thiết lập.

---

# 93. Issue

Một issue tốt nên bao gồm:

```text
problem

expected behavior

current behavior

reproduction if applicable

affected subsystem

relevant specification
```

Báo cáo lỗi được hưởng lợi rất nhiều từ các fixture tối giản.

---

# 94. Đề xuất tính năng

Đề xuất tính năng trước tiên nên tập trung vào vấn đề.

Nên dùng:

```text
Problem:
Users cannot inspect why a publisher was selected.
```

thay vì:

```text
Feature:
Add command X with flags Y and Z.
```

Implementation nên xuất phát từ vấn đề và kiến trúc.

---

# 95. Đề xuất kiến trúc

Các thay đổi kiến trúc lớn nên mô tả:

```text
current limitation

proposed model

alternatives

trade-offs

migration

security implications

compatibility implications
```

Cập nhật một đặc tả hiện có được ưu tiên hơn việc tạo ra các quy tắc song song không được ghi lại.

---

# 96. Báo cáo bảo mật

Các lỗ hổng bảo mật tiềm ẩn không nên được thảo luận công khai trước khi được review phù hợp nếu việc khai thác có thể khiến người dùng gặp rủi ro.

Tuân theo quy trình báo cáo bảo mật của repository nếu quy trình đó được định nghĩa trong:

```text
SECURITY.md
```

Nếu `SECURITY.md` chưa tồn tại, maintainer nên thêm nó trước khi phân phối công khai ra hệ sinh thái.

---

# 97. Đóng góp có sự hỗ trợ của AI

Các công cụ AI có thể được sử dụng để hỗ trợ phát triển.

Người đóng góp vẫn chịu trách nhiệm về:

```text
correctness

security

licenses

tests

architecture compliance

reviewing generated code
```

Không gửi các thay đổi lớn được sinh ra mà không hiểu chúng.

---

# 98. Nội dung do AI sinh ra

Khi thêm Skill, Agent, Prompt hoặc tài liệu được tạo với sự hỗ trợ của AI:

```text
review semantics

remove hallucinated claims

verify upstream references

ensure license compatibility

ensure target neutrality
```

Nội dung được sinh ra không nhận được bất kỳ trust đặc biệt nào.

---

# 99. Giấy phép

Bằng việc đóng góp, bạn đồng ý rằng đóng góp của bạn được cung cấp theo giấy phép và các điều khoản đóng góp của repository.

Không gửi nội dung của bên thứ ba trừ khi giấy phép của nó cho phép đưa vào hoặc phân phối lại.

Việc import vendor MUST bảo toàn thông tin giấy phép khi được yêu cầu.

---

# 100. Ghi nhận nguồn

Bảo toàn ghi nhận nguồn và provenance cho nội dung có nguồn gốc từ upstream.

Không xóa:

```text
author information

source repository

license notices

required copyright notices
```

khi áp dụng được.

---

# 101. Định nghĩa hoàn thành

Một đóng góp được coi là hoàn chỉnh khi các tiêu chí áp dụng được đều được thỏa mãn:

```text
[ ] Correct architectural layer

[ ] Specification aligned

[ ] Implementation complete

[ ] Validation complete

[ ] Diagnostics complete

[ ] Tests complete

[ ] Security reviewed

[ ] Trust reviewed

[ ] Determinism verified

[ ] Compatibility reviewed

[ ] Documentation updated

[ ] CI passing
```

---

# 102. Luồng đóng góp được khuyến nghị

```text
Find problem
    ↓
Read relevant docs
    ↓
Confirm architectural layer
    ↓
Update spec if required
    ↓
Add failing test
    ↓
Implement
    ↓
Run focused tests
    ↓
Run integration/security tests
    ↓
Update docs
    ↓
Open focused PR
```

---

# 103. Các bất biến của project

Người đóng góp nên bảo vệ các bất biến này trên hết.

```text
Canonical packages remain target-neutral.

Resolution remains deterministic.

Resolver remains free of network/rendering behavior.

Policy remains authoritative.

Trust never equals permission.

Adapters translate representation, not semantics.

Source ingestion never implies execution.

Unknown user files are never silently overwritten.

External provenance is preserved.

Generated state is reproducible.
```

---

# 104. Nguyên tắc đóng góp cuối cùng

Khi có vẻ như có nhiều cách implement khả thi, hãy ưu tiên cách bảo toàn được:

```text
clear boundaries
    ↓
determinism
    ↓
explainability
    ↓
reproducibility
    ↓
security
    ↓
extensibility
```

Project nên scale bằng cách bổ sung:

```text
new content
new sources
new adapters
new clients
```

mà không cần liên tục thiết kế lại canonical core.

Thuộc tính đó quan trọng hơn việc tối ưu cho implementation nhanh nhất trong ngắn hạn.