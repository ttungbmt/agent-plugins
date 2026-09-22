# Những điều không phải mục tiêu

## Tổng quan

Tài liệu này định nghĩa những gì `agent-plugins` có chủ đích **không** nhằm giải quyết, đặc biệt là trong V1.

Các non-goal này tồn tại để:

- ngăn scope creep,
- bảo vệ sự đơn giản của kiến trúc,
- giữ cho implementation tập trung,
- giảm gánh nặng bảo trì,
- giữ rõ ràng ranh giới trách nhiệm (ownership boundary),
- tránh giải quyết quá sớm các vấn đề ở quy mô toàn hệ sinh thái.

Một non-goal không nhất thiết có nghĩa là "không bao giờ".

Nó có nghĩa là:

> **Điều này không cần thiết để kiểm chứng core product model và không nên chặn V1.**

---

# 1. Không phải một mega plugin

`agent-plugins` không nhằm mục đích gộp mọi capability được hỗ trợ vào một plugin khổng lồ.

Project không nên tạo ra:

```text
mega-plugin
├── all skills
├── all agents
├── all hooks
├── all commands
├── all MCP servers
└── all publishers
```

Điều này sẽ tái tạo lại:

- context không cần thiết,
- release bị coupled,
- capability trùng lặp,
- khó update,
- bề mặt tấn công bảo mật lớn hơn,
- khả năng composition kém.

Thay vào đó, project nên resolve tập capability nhất quán nhỏ nhất.

---

# 2. Không phải thêm một plugin collection khác

Project về cơ bản không phải là một repository có giá trị đến từ việc sở hữu số lượng lớn nhất:

```text
skills
agents
commands
plugins
```

Các catalog lớn có thể được tích hợp, nhưng bản thân việc tích lũy không phải là mục tiêu sản phẩm.

Project nên ưu tiên:

```text
selection
composition
resolution
governance
reproducibility
```

hơn là kích thước catalog thuần túy.

---

# 3. Không thay thế các upstream publisher

`agent-plugins` không nhằm thay thế các project như:

- Superpowers,
- Matt Pocock Skills,
- ECC,
- Anthropic plugins,
- wshobson/agents,
- các hệ sinh thái cộng đồng khác.

Các project này vẫn là chủ sở hữu implementation của chúng.

`agent-plugins` nên đóng vai trò:

```text
coordination layer
+
semantic layer
+
resolution layer
+
distribution layer
```

thay vì trở thành một implementation thay thế.

---

# 4. Không fork mọi third-party project

Project không nên sao chép hoặc fork mọi external publisher vào repository.

Tránh:

```text
plugins/
├── copied-superpowers/
├── copied-ecc/
├── copied-matt/
└── copied-everything-else/
```

Điều này tạo ra:

- bản sao source bị lỗi thời,
- gánh nặng update,
- provenance không rõ ràng,
- phức tạp về license,
- merge conflict,
- trách nhiệm bảo trì không thuộc về project này.

Ưu tiên tham chiếu trực tiếp đến upstream source.

---

# 5. Không có vendor tree tổng quát trong V1

V1 không nên đưa vào một cây `vendor/` lớn cho source code của external plugin.

Ví dụ được tránh có chủ đích:

```text
plugins/
├── native/
└── vendor/
    ├── superpowers/
    ├── ecc/
    └── matt/
```

Vendoring có thể được đưa vào sau này vì những lý do kỹ thuật cụ thể, nhưng không nên là integration model mặc định.

---

# 6. Không có overlay hay patch engine đầy đủ trong V1

V1 không nên implement một patch system đa năng để sửa đổi các upstream component tùy ý.

Tránh xây dựng:

```text
overlay engine
patch merging
patch rebasing
automatic conflict repair
publisher-specific patch DSL
```

Những tính năng này mang lại độ phức tạp bảo trì đáng kể.

Các lựa chọn thay thế được ưu tiên là:

- capability selection,
- cấu hình policy,
- thay thế implementation,
- native first-party component.

Một patch mechanism có thể được bổ sung sau này như một escape hatch nâng cao, tường minh.

---

# 7. Không có role inheritance sâu

Role không nên tạo thành các cây kế thừa sâu.

Tránh:

```text
frontend-engineer
→ web-engineer
→ software-engineer
→ developer
→ technical-user
→ base
```

Kế thừa sâu khiến cấu hình khó hiểu và khó override.

Ưu tiên:

```text
role
→ presets
```

Composition nên luôn là cơ chế tái sử dụng chính.

---

# 8. Không có Addon như một entity hạng nhất

`Addon` không nên trở thành một domain concept riêng trong V1.

Về mặt khái niệm:

```text
addon = optional preset
```

CLI có thể cung cấp UX giống addon, nhưng model bên dưới vẫn nên dựa trên preset.

Điều này tránh các khái niệm trùng lặp như:

```text
preset/security
addon/security
```

---

# 9. Không có universal agent file format

Project không nên cố tạo ra một format phổ quát thay thế hoàn toàn các native configuration format của:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

Shared model nên biểu diễn semantic intent.

Target adapter nên render các native runtime artifact.

Hệ thống không nên ép mọi runtime vào một biểu diễn lowest-common-denominator.

---

# 10. Không giả lập tính năng runtime

Nếu một runtime hỗ trợ một tính năng mà runtime khác không hỗ trợ, `agent-plugins` không nên tự động giả lập mọi tính năng còn thiếu.

Ví dụ:

```text
Runtime A supports hooks
Runtime B does not
```

Target adapter có thể báo cáo:

```text
unsupported
degraded
ignored by policy
```

thay vì implement một execution engine hoàn toàn mới.

---

# 11. Không hỗ trợ mọi runtime trong V1

V1 không cần hỗ trợ tất cả AI agent runtime.

Trọng tâm ban đầu nên được giữ hẹp.

Target đầu tiên được khuyến nghị:

```text
Claude Code
```

Các target khác như:

```text
Codex
Gemini
OpenCode
Hermes
```

nên được hỗ trợ thông qua các extension point của kiến trúc, không nhất thiết phải được implement trong V1.

---

# 12. Không hỗ trợ mọi publisher trong V1

V1 không nên cố index toàn bộ agent ecosystem.

Tập publisher đầu tiên nên mang tính đại diện thay vì đầy đủ.

Ví dụ:

```text
Superpowers
Matt Pocock
ECC
Anthropic
wshobson
native
```

Mục tiêu là chứng minh publisher abstraction, không phải tối đa hóa số lượng publisher.

---

# 13. Không tự động import mọi upstream component

Hỗ trợ một publisher không có nghĩa là mọi component từ publisher đó phải trở thành một phần của curated catalog.

Ví dụ:

```text
Publisher contains 300 components
```

Ban đầu project có thể chỉ curate:

```text
20 relevant components
```

Publisher discovery và catalog curation là hai mối quan tâm riêng biệt.

---

# 14. Không phân loại capability hoàn toàn tự động trong V1

V1 không nên phụ thuộc vào một hệ thống AI tự động xác định mọi external skill hoặc agent làm gì.

Phân loại tự động có thể hữu ích sau này, nhưng canonical capability mapping ban đầu nên:

```text
curated
reviewable
deterministic
version-controlled
```

Các gợi ý có AI hỗ trợ có thể được đưa vào mà không trở thành authoritative.

---

# 15. Không cần LLM cho core resolution

Core dependency resolution và capability resolution không được yêu cầu LLM.

Những điều sau nên luôn deterministic:

```text
dependency resolution
capability selection
policy evaluation
version selection
lockfile generation
```

AI có thể hỗ trợ recommendation hoặc phân loại trong tương lai, nhưng không tham gia vào phần resolution quan trọng cho reproducibility.

---

# 16. Không có recommendation engine trong V1

V1 không nên cố tự động trả lời:

```text
What is the perfect role for me?
Which plugins should I install?
Which publisher is objectively best?
```

Hệ thống ban đầu nên cung cấp các preset và role được curate.

Một recommendation system có thể được đưa vào sau khi đã có đủ metadata và kinh nghiệm sử dụng.

---

# 17. Không tự động hiểu project trong V1

Về lâu dài CLI có thể kiểm tra một repository và gợi ý:

```text
Next.js
TypeScript
Cloudflare
PostgreSQL
```

Nhưng V1 không yêu cầu phát hiện stack tự động nâng cao.

Người dùng có thể cấu hình preset một cách tường minh.

Phát hiện cơ bản chỉ nên được đưa vào ở những chỗ đơn giản và deterministic.

---

# 18. Không yêu cầu hosted registry

Core product không nên yêu cầu:

```text
central server
hosted database
user account
cloud control plane
```

Hệ thống ban đầu nên hoạt động cục bộ với:

```text
repository catalog
local CLI
project manifest
lockfiles
```

Một hosted registry có thể được đưa vào sau này.

---

# 19. Không bắt buộc SaaS

`agent-plugins` không nên yêu cầu người dùng đăng ký một hosted service để sử dụng chức năng cốt lõi.

Các thao tác cốt lõi nên luôn dùng được cục bộ:

```text
init
sync
resolve
validate
diff
doctor
```

Cloud service có thể cải thiện trải nghiệm sau này nhưng không nên là nền tảng.

---

# 20. Không yêu cầu GUI trong V1

V1 không yêu cầu:

```text
desktop application
web marketplace
visual dependency editor
role builder UI
```

CLI và các file khai báo nên đủ để kiểm chứng product model.

GUI có thể được bổ sung sau khi core model ổn định.

---

# 21. Không có nền tảng đánh giá plugin trong V1

Ban đầu project không nên trở thành một nền tảng review hoặc xếp hạng công khai.

Tránh các tính năng V1 như:

```text
star ratings
community voting
popularity ranking
publisher leaderboard
```

Ban đầu trust và curation nên là metadata tường minh do project duy trì.

---

# 22. Không có xếp hạng "plugin tốt nhất" toàn cục

Hệ thống không nên giả định rằng mỗi capability luôn có một implementation tốt nhất mang tính phổ quát.

Việc lựa chọn có thể phụ thuộc vào:

```text
target runtime
policy
project context
trust
compatibility
user override
```

Có thể tồn tại implementation priority mặc định, nhưng nó nên luôn phụ thuộc ngữ cảnh và có thể giải thích được.

---

# 23. Không tự động trust

External publisher không nên tự động trở thành trusted chỉ vì chúng phổ biến hoặc công khai.

Trust vẫn là một quyết định policy được curate.

Hệ thống không nên suy luận:

```text
popular = safe
```

hoặc:

```text
GitHub stars = trusted
```

---

# 24. Không phải một security sandbox hoàn chỉnh

`agent-plugins` nên giúp xác định và quản trị các component nhạy cảm về bảo mật.

Nó không nhằm cung cấp một sandbox hoàn chỉnh cho việc thực thi third-party tùy ý.

Project có thể phát hiện và giới hạn:

```text
hooks
commands
scripts
MCP servers
```

nhưng không nên cố thay thế:

```text
OS sandboxing
container isolation
endpoint security
runtime permission systems
```

---

# 25. Không thay thế package manager cho phần mềm nói chung

Project không nên trở thành một package manager đa dụng tương tự:

```text
npm
pnpm
Homebrew
apt
pip
```

Nó quản lý composition của AI agent tooling.

Các software dependency bên dưới nên tiếp tục được quản lý bởi các native package ecosystem của chúng.

---

# 26. Không phải một dependency build system tổng quát

Project không nên trở thành một task runner hay nền tảng điều phối build.

Tránh mở rộng sang:

```text
build system
CI engine
workflow scheduler
general task runner
```

trừ khi thực sự cần thiết cho việc tích hợp agent tooling.

---

# 27. Không phải một dotfiles manager tổng quát

Mặc dù một số cấu hình được generate có thể giống việc quản lý dotfile, project không nên cố thay thế:

```text
chezmoi
stow
Nix Home Manager
dotbot
```

Phạm vi của nó là trạng thái agent tooling.

---

# 28. Không phải một development environment manager tổng quát

Project không nên quản lý toàn bộ công cụ developer như:

```text
Node.js
Python
Docker
Git
editors
shell configuration
system packages
```

Những mối quan tâm này thuộc về các công cụ quản lý workstation hoặc environment.

`agent-plugins` chỉ nên quản lý các dependency mà các agent component của nó thực sự yêu cầu, ở những nơi phù hợp.

---

# 29. Không phải một workflow engine đầy đủ

Project điều phối việc những workflow nào sẵn có.

Bản thân nó không nên trở thành một workflow execution engine tổng quát.

Ví dụ:

```text
TDD workflow
planning workflow
review workflow
```

vẫn được implement bởi các component/publisher đã được chọn.

Resolver chọn chúng; nó không thay thế chúng.

---

# 30. Không có hành vi resolution ẩn

Project không nên tối ưu cho "phép màu" mà đánh đổi khả năng dự đoán.

Tránh resolution phụ thuộc vào:

```text
hidden heuristics
non-deterministic AI selection
unrecorded environment state
implicit remote configuration
```

Các quyết định quan trọng nên luôn có thể kiểm tra và tái tạo.

---

# 31. Không giải quyết conflict một cách âm thầm

Conflict không nên biến mất mà không để lại dấu vết.

Ngay cả khi resolver chọn ra một bên thắng một cách deterministic, người dùng vẫn nên có thể kiểm tra:

```text
candidate implementations
selected implementation
suppressed implementations
selection reason
```

Project nên ưu tiên resolution hiển thị rõ ràng hơn là suppression ẩn.

---

# 32. Không có sự linh hoạt cấu hình không giới hạn

Hệ thống không nên hỗ trợ các cơ chế cấu hình tùy ý chỉ vì chúng khả thi về mặt lý thuyết.

Quá nhiều sự linh hoạt tạo ra:

```text
hard-to-test states
unpredictable resolution
maintenance complexity
poor documentation
```

Cấu hình V1 nên luôn có giới hạn và mang tính opinionated.

---

# 33. Không có user script tùy ý trong core resolution

Resolver không nên cho phép script tùy ý tham gia vào dependency resolution.

Ví dụ được tránh có chủ đích:

```yaml
resolve:
  run: ./custom-script.sh
```

Điều này sẽ phá vỡ tính deterministic và portability.

Các extension point nên sử dụng các interface đã được định nghĩa.

---

# 34. Không mutate plugin trong quá trình resolution

Resolution nên chủ yếu mang tính khai báo (declarative).

Resolver không nên viết lại hoặc mutate source của third-party component như một phần của hoạt động thông thường.

Resolution nên chọn component, không biến đổi chúng.

---

# 35. Không tự động update upstream

Hệ thống không nên âm thầm update publisher lên phiên bản mới nhất.

Tránh:

```text
sync
→ automatically pull latest
→ silently change behavior
```

Update nên tường minh và có thể review.

---

# 36. Không có breaking change mà thiếu chiến lược migration

Khi các format manifest và lockfile phát triển, project nên tránh tùy tiện đưa vào các thay đổi không tương thích.

Tuy nhiên, giai đoạn phát triển V1 alpha không yêu cầu backward compatibility vĩnh viễn.

Trước `v1` ổn định, việc schema thay đổi là điều được dự kiến.

Khi đã ổn định, breaking change nên đi kèm:

```text
versioning
migration documentation
migration tooling where practical
```

---

# 37. Không có stable API quá sớm

Manifest ban đầu nên sử dụng một version thử nghiệm như:

```text
agent-plugins.dev/v1alpha1
```

Project không nên tuyên bố stable API trước khi việc sử dụng thực tế kiểm chứng được model.

---

# 38. Không chia nhỏ package quá sớm

Monorepo không nên ngay lập tức trở thành hàng chục package được version độc lập.

V1 nên giữ ranh giới package ở mức thô.

Ưu tiên:

```text
core
schemas
source-adapters
target-adapters
cli
```

Chỉ tách package khi lifecycle độc lập hoặc ranh giới dependency thực sự biện minh cho việc đó.

---

# 39. Không tối ưu hiệu năng quá sớm

V1 nên ưu tiên:

```text
correctness
determinism
clarity
testability
```

hơn là tối ưu hiệu năng nâng cao.

Kích thước catalog dự kiến trong V1 không nên đòi hỏi distributed resolution hay hạ tầng indexing phức tạp.

---

# 40. Không yêu cầu remote state

Project resolution không nên phụ thuộc vào server-side state ẩn.

Một project nên có thể được hiểu từ các artifact được version control như:

```text
agent-plugins.yaml
agent-plugins.lock
catalog version
```

Remote service có thể làm phong phú hệ thống sau này nhưng không nên là yêu cầu bắt buộc cho việc tái tạo deterministic.

---

# 41. Không bắt buộc global user role

Về lâu dài hệ thống có thể hỗ trợ các preference ở cấp user.

Tuy nhiên, reproducibility của project không được phụ thuộc vào global state không được ghi lại.

Một project không nên resolve khác nhau chỉ vì:

```text
Machine A has hidden role settings
Machine B does not
```

Global preference có thể ảnh hưởng đến các giá trị mặc định khi tương tác nhưng không nên âm thầm thay đổi locked project state.

---

# 42. Không trộn lẫn ngữ nghĩa của role và project

Role không nên trở thành nơi mã hóa stack của một repository cụ thể.

Tránh các role như:

```text
tung-mealops-nextjs-cloudflare-role
```

Role đại diện cho các bối cảnh làm việc có thể tái sử dụng.

Cấu hình project đại diện cho các nhu cầu riêng của repository.

---

# 43. Không có role gắn với publisher

Tránh:

```text
superpowers-developer
ecc-backend-engineer
matt-frontend-engineer
```

Role nên phụ thuộc vào capability và preset, không phải publisher.

Việc chọn publisher thuộc về resolution.

---

# 44. Mặc định không có preset gắn với publisher

Tránh các preset như:

```text
all-ecc
all-superpowers
all-matt
```

cho capability composition thông thường.

Các preset hướng publisher có thể tồn tại cho mục đích chẩn đoán hoặc tương thích, nhưng không nên là abstraction chính cho người dùng.

---

# 45. Không có authoritative metadata trùng lặp

Project không nên duy trì thủ công cùng một metadata trong:

```text
catalog files
marketplace files
generated indexes
documentation tables
```

Chỉ một biểu diễn nên là authoritative.

Các biểu diễn khác nên được generate ở những nơi khả thi.

---

# 46. Không duy trì thủ công các artifact được generate

Các file nằm trong:

```text
generated/
```

không được chứa thông tin duy nhất mà không có ở nơi khác.

Xóa và generate lại chúng phải an toàn.

---

# 47. Marketplace không phải là domain model

Claude marketplace manifest, cấu hình Codex, hay bất kỳ format riêng của runtime nào khác không nên định nghĩa core domain model.

Chiều phụ thuộc phải luôn là:

```text
Core Domain
   ↓
Target Adapter
   ↓
Runtime Format
```

chứ không phải:

```text
Runtime Format
   ↓
Core Domain
```

---

# 48. Không có logic riêng của target trong core capability

Định nghĩa capability nên luôn mang tính ngữ nghĩa.

Tránh:

```text
claude.tdd
codex.tdd
gemini.tdd
```

khi về mặt khái niệm capability là:

```text
engineering.testing.tdd
```

Target compatibility thuộc về implementation metadata và adapter.

---

# 49. Không yêu cầu tự động giải quyết mọi capability conflict

Một số conflict có thể thực sự mơ hồ.

Resolver có thể yêu cầu một override tường minh khi:

```text
multiple candidates have equal priority
policy cannot choose safely
implementations are mutually incompatible
```

Fail với một chẩn đoán hữu ích tốt hơn là đoán mò.

---

# 50. Không đảm bảo mọi capability tồn tại trên mọi target

Một role có thể yêu cầu những capability không có sẵn trên một runtime cụ thể.

Hệ thống nên báo cáo:

```text
unsupported capability
partial support
missing implementation
```

thay vì giả vờ rằng có portability hoàn toàn.

---

# 51. Không có sự tương đương hoàn hảo giữa các runtime

Mục tiêu dài hạn là portability của intent, không phải hành vi giống hệt nhau trên mọi runtime.

Ví dụ:

```text
Same capability intent
        ↓
Claude implementation
Codex implementation
Gemini implementation
```

Các implementation này có thể khác nhau về hành vi vì các runtime bên dưới khác nhau.

---

# 52. Không tự động thay thế human curation

Human curation vẫn quan trọng đối với:

```text
capability taxonomy
preferred implementations
trust classification
security-sensitive changes
publisher integration
```

Tự động hóa nên hỗ trợ maintainer, không loại bỏ việc review khỏi các quyết định quan trọng.

---

# 53. Không có độ phức tạp enterprise trong V1

V1 không nên yêu cầu:

```text
SSO
RBAC
multi-tenant organizations
central policy server
audit service
enterprise admin UI
```

Kiến trúc có thể chừa chỗ cho những capability này sau này.

---

# 54. Không yêu cầu telemetry

Core system không nên phụ thuộc vào usage telemetry.

Resolution nên hoạt động đúng mà không cần gửi thông tin project hoặc usage đến một central service.

Telemetry chỉ có thể được đưa vào sau này như một tính năng tùy chọn, với các cân nhắc về quyền riêng tư một cách tường minh.

---

# 55. Không yêu cầu kiếm tiền

V1 nên tập trung vào việc kiểm chứng sản phẩm và kiến trúc.

Nó không cần giải quyết:

```text
billing
subscriptions
commercial marketplace
paid plugins
revenue sharing
licensing marketplace infrastructure
```

---

# 56. Không cố chuẩn hóa toàn bộ hệ sinh thái

`agent-plugins` có thể định nghĩa một capability vocabulary nội bộ hữu ích.

Nó không cần thuyết phục mọi upstream publisher áp dụng cùng một schema.

Source adapter tồn tại chính vì các external ecosystem sẽ vẫn không đồng nhất.

---

# 57. Ranh giới phạm vi V1

Ranh giới V1 nên được giữ ở mức xấp xỉ:

```text
Publisher
Package
Component
Capability
Preset
Role
Policy
Project

Catalog
Resolver
Lockfile

Source adapter abstraction
Claude Code target adapter

CLI
Validation
Testing
```

Mọi thứ vượt ra ngoài ranh giới này nên cần có lý do biện minh tường minh.

---

# 58. Các capability được hoãn lại

Những điều sau được hoãn lại có chủ đích:

```text
Hosted registry
GUI
Cloud control plane

Codex adapter
Gemini adapter
OpenCode adapter
Hermes adapter

AI recommendation engine
Automatic capability classification
Advanced project detection

Patch / overlay engine
Full vendoring system

Organization accounts
RBAC
SSO

Usage analytics
Telemetry

Plugin marketplace ratings
Community reviews

Context optimization engine
Publisher health scoring
Security scoring

Signed package infrastructure
SBOM-like inventory
```

Những điều này có thể trở thành ứng viên cho roadmap tương lai sau khi core model được kiểm chứng.

---

# 59. Quy tắc quyết định cho tính năng mới

Khi đánh giá một tính năng mới, hãy hỏi:

> Tính năng này có trực tiếp cải thiện capability composition, deterministic resolution, governance, reproducibility hoặc distribution không?

Nếu không, nhìn chung nó nên nằm ngoài core scope.

Câu hỏi thứ hai nên là:

> Điều này có cần thiết để kiểm chứng V1 không?

Nếu câu trả lời là không, thông thường nó nên được hoãn lại.

---

# 60. Non-goals trong một câu

> **`agent-plugins` nên giải quyết tốt capability composition và resolution trước khi cố trở thành một nền tảng marketplace, cloud service, universal agent runtime hay một developer environment manager đa năng.**
