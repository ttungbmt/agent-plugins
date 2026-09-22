# Cấu trúc Repository

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.

## Tổng quan

Tài liệu này định nghĩa cấu trúc repository canonical cho `agent-plugins`.

Repository nên thể hiện rõ kiến trúc thông qua filesystem của nó.

Cấu trúc nên tách biệt rõ ràng:

- tài liệu sản phẩm,
- implementation của domain,
- schema,
- source adapter,
- target adapter,
- metadata của curated catalog,
- composition có thể tái sử dụng,
- native plugin,
- generated artifact,
- test,
- example,
- tooling cho maintainer.

Repository nên tối ưu cho:

```text
clarity
separation of concerns
discoverability
scalability
low duplication
clear ownership
```

Filesystem nên củng cố architectural model thay vì làm nó mờ đi.

---

# 1. Cấu trúc Repository canonical

```text
agent-plugins/
│
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── AGENTS.md
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── biome.json
│
├── apps/
│   └── cli/
│       ├── package.json
│       ├── src/
│       │   ├── commands/
│       │   │   ├── init/
│       │   │   ├── add/
│       │   │   ├── remove/
│       │   │   ├── sync/
│       │   │   ├── update/
│       │   │   ├── diff/
│       │   │   ├── doctor/
│       │   │   ├── list/
│       │   │   ├── search/
│       │   │   ├── explain/
│       │   │   ├── preset/
│       │   │   └── profile/
│       │   │
│       │   ├── ui/
│       │   ├── formatters/
│       │   ├── errors/
│       │   └── index.ts
│       │
│       └── test/
│
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   └── src/
│   │       ├── model/
│   │       ├── catalog/
│   │       ├── graph/
│   │       ├── resolver/
│   │       ├── policy/
│   │       ├── lockfile/
│   │       ├── diagnostics/
│   │       ├── explain/
│   │       ├── sync/
│   │       └── index.ts
│   │
│   ├── schemas/
│   │   ├── package.json
│   │   ├── src/
│   │   └── schemas/
│   │       ├── provider.schema.json
│   │       ├── package.schema.json
│   │       ├── capability.schema.json
│   │       ├── preset.schema.json
│   │       ├── profile.schema.json
│   │       ├── policy.schema.json
│   │       ├── project.schema.json
│   │       └── lockfile.schema.json
│   │
│   ├── source-adapters/
│   │   ├── package.json
│   │   └── src/
│   │       ├── github/
│   │       ├── git/
│   │       ├── filesystem/
│   │       ├── claude-marketplace/
│   │       ├── agent-skills/
│   │       ├── superpowers/
│   │       ├── ecc/
│   │       └── index.ts
│   │
│   └── target-adapters/
│       ├── package.json
│       └── src/
│           ├── claude-code/
│           ├── codex/
│           ├── gemini/
│           ├── opencode/
│           ├── hermes/
│           └── index.ts
│
├── catalog/
│   ├── providers/
│   │   ├── superpowers.yaml
│   │   ├── mattpocock.yaml
│   │   ├── ecc.yaml
│   │   ├── anthropic.yaml
│   │   ├── wshobson.yaml
│   │   └── agent-plugins.yaml
│   │
│   ├── packages/
│   │   ├── superpowers.yaml
│   │   ├── mattpocock-skills.yaml
│   │   ├── ecc.yaml
│   │   ├── anthropic-plugins.yaml
│   │   └── ...
│   │
│   └── capabilities/
│       ├── workflow/
│       ├── engineering/
│       ├── frontend/
│       ├── backend/
│       ├── security/
│       ├── knowledge/
│       ├── product/
│       ├── devops/
│       ├── tooling/
│       └── gis/
│
├── presets/
│   ├── workflow/
│   │   ├── core.yaml
│   │   ├── lightweight.yaml
│   │   └── rigorous.yaml
│   │
│   ├── engineering/
│   │   ├── core.yaml
│   │   ├── architecture.yaml
│   │   ├── testing.yaml
│   │   ├── security.yaml
│   │   └── research.yaml
│   │
│   ├── stacks/
│   │   ├── typescript.yaml
│   │   ├── nextjs.yaml
│   │   ├── node.yaml
│   │   ├── python.yaml
│   │   ├── cloudflare.yaml
│   │   └── kubernetes.yaml
│   │
│   ├── domains/
│   │   ├── frontend.yaml
│   │   ├── backend.yaml
│   │   ├── devops.yaml
│   │   ├── product.yaml
│   │   ├── gis.yaml
│   │   └── second-brain.yaml
│   │
│   ├── knowledge/
│   │   ├── research.yaml
│   │   ├── writing.yaml
│   │   ├── synthesis.yaml
│   │   └── knowledge-management.yaml
│   │
│   └── tools/
│       ├── github.yaml
│       ├── browser.yaml
│       └── obsidian.yaml
│
├── profiles/
│   ├── software-engineer.yaml
│   ├── frontend-engineer.yaml
│   ├── backend-engineer.yaml
│   ├── fullstack-engineer.yaml
│   ├── platform-engineer.yaml
│   ├── product-manager.yaml
│   ├── researcher.yaml
│   └── second-brain.yaml
│
├── policies/
│   ├── default.yaml
│   ├── strict.yaml
│   ├── personal.yaml
│   └── enterprise.yaml
│
├── plugins/
│   └── native/
│       ├── product-management/
│       ├── second-brain/
│       ├── gis/
│       └── ...
│
├── generated/
│   ├── catalog/
│   │   ├── components.json
│   │   ├── search-index.json
│   │   ├── capability-index.json
│   │   └── reverse-index.json
│   │
│   └── targets/
│       ├── claude-code/
│       ├── codex/
│       └── ...
│
├── .claude-plugin/
│   └── marketplace.json
│
├── tests/
│   ├── fixtures/
│   ├── schemas/
│   ├── catalog/
│   ├── graph/
│   ├── resolver/
│   ├── policy/
│   ├── adapters/
│   ├── integration/
│   └── e2e/
│
├── examples/
│   ├── frontend/
│   ├── backend/
│   ├── mealops/
│   ├── product-manager/
│   └── second-brain/
│
├── docs/
│   ├── index.md
│   │
│   ├── 00-product/
│   │   ├── problem.md
│   │   ├── problem.vi.md
│   │   ├── vision.md
│   │   ├── goals.md
│   │   ├── non-goals.md
│   │   ├── requirements.md
│   │   └── use-cases.md
│   │
│   ├── 01-domain/
│   │   ├── domain-model.md
│   │   ├── terminology.md
│   │   └── capability-model.md
│   │
│   ├── 02-architecture/
│   │   ├── architecture.md
│   │   ├── repository-structure.md
│   │   ├── source-of-truth.md
│   │   └── resolution-spec.md
│   │
│   ├── 03-specs/
│   │   ├── catalog-spec.md
│   │   ├── manifest-spec.md
│   │   ├── lockfile-spec.md
│   │   ├── policy-spec.md
│   │   ├── adapter-spec.md
│   │   ├── update-spec.md
│   │   └── cli-spec.md
│   │
│   ├── 04-security/
│   │   ├── security-model.md
│   │   └── trust-model.md
│   │
│   ├── 05-development/
│   │   ├── testing-strategy.md
│   │   ├── contributing.md
│   │   └── release-process.md
│   │
│   ├── 06-roadmap/
│   │   ├── roadmap.md
│   │   └── todo.md
│   │
│   └── decisions/
│       └── adr/
│           ├── 0001-capability-based-resolution.md
│           ├── 0002-provider-package-component.md
│           ├── 0003-composition-over-inheritance.md
│           ├── 0004-no-addon-entity.md
│           ├── 0005-source-target-adapters.md
│           └── 0006-dual-lock-model.md
│
└── tools/
    ├── generate/
    ├── validate/
    ├── update/
    └── release/
```

---

# 2. Thiết kế cấp cao nhất

Repository được tổ chức xoay quanh ba nhóm chính.

```text
Runtime Code
├── apps/
└── packages/

Domain Data
├── catalog/
├── presets/
├── profiles/
├── policies/
└── plugins/

Supporting Assets
├── generated/
├── tests/
├── examples/
├── docs/
└── tools/
```

Sự tách biệt này là có chủ đích.

---

# 3. Các file ở root

Các file ở root nên chứa cấu hình áp dụng cho toàn repository và thông tin tổng quan về project.

```text
README.md
LICENSE
CHANGELOG.md
CONTRIBUTING.md
AGENTS.md
package.json
pnpm-workspace.yaml
tsconfig.json
biome.json
```

Tránh đặt domain manifest hoặc implementation module trực tiếp ở root của repository.

---

# 4. README.md

`README.md` là điểm vào công khai của project.

Nó nên chứa:

```text
project summary
positioning
quick start
basic installation
basic example
documentation link
```

Tài liệu thiết kế chi tiết thuộc về:

```text
docs/
```

---

# 5. AGENTS.md

`AGENTS.md` cung cấp hướng dẫn cho các coding agent làm việc trên repository.

Nó có thể định nghĩa:

```text
repository conventions
architecture rules
testing expectations
documentation requirements
generated-file rules
commands
```

Nó không nên sao chép toàn bộ tài liệu kiến trúc.

Thay vào đó, nó nên tham chiếu đến các tài liệu canonical.

---

# 6. apps/

`apps/` chứa các ứng dụng thực thi được.

V1 bao gồm:

```text
apps/cli/
```

Các ứng dụng trong tương lai có thể bao gồm:

```text
apps/web/
apps/registry/
```

nhưng chỉ nên được đưa vào khi chúng trở thành sản phẩm thực sự.

---

# 7. apps/cli/

CLI là giao diện người dùng chính của V1.

Trách nhiệm:

```text
command parsing
terminal UX
interactive prompts
formatting
exit codes
```

Nó nên giữ mỏng.

Business rule thuộc về `packages/core`.

---

# 8. Cấu trúc command của CLI

Command nên sử dụng cấu trúc thư mục theo kiểu oclif.

Ví dụ:

```text
apps/cli/src/commands/
├── init/
│   └── index.ts
├── sync/
│   └── index.ts
├── explain/
│   └── index.ts
└── ...
```

Subcommand có thể sử dụng phân cấp sâu hơn khi phù hợp.

Ví dụ:

```text
preset/
├── add.ts
├── remove.ts
└── list.ts
```

Các convention cụ thể của oclif có thể ảnh hưởng đến cấu trúc vật lý cuối cùng.

---

# 9. CLI UI

UI tương tác có thể tái sử dụng thuộc về:

```text
apps/cli/src/ui/
```

Ví dụ:

```text
selectors
tables
status views
diff rendering
progress rendering
```

Code đặc thù của Ink nên nằm trong tầng này.

---

# 10. packages/

`packages/` chứa các implementation module có thể tái sử dụng.

V1 nên được cố ý giữ nhỏ.

Các package được khuyến nghị:

```text
core
schemas
source-adapters
target-adapters
```

Không tạo package chỉ vì một thư mục tồn tại về mặt khái niệm.

---

# 11. packages/core/

`packages/core` là implementation package quan trọng nhất.

Nó sở hữu:

```text
domain model
catalog loading abstractions
dependency graphs
resolver
policy evaluation
lockfile logic
diagnostics
explainability
sync planning abstractions
```

Nó nên chứa tối thiểu dependency về hạ tầng.

---

# 12. core/model/

```text
packages/core/src/model/
```

Chứa các domain type đã normalize.

Ví dụ:

```text
provider.ts
package.ts
component.ts
capability.ts
preset.ts
profile.ts
project.ts
policy.ts
target.ts
resolution.ts
```

Các type này không nên phụ thuộc vào oclif, Ink, GitHub API hoặc các cấu trúc đặc thù của Claude.

---

# 13. core/catalog/

```text
packages/core/src/catalog/
```

Sở hữu:

```text
catalog loading
catalog normalization
catalog indexes
catalog validation contracts
```

Nó nên hoạt động trên metadata canonical.

---

# 14. core/graph/

```text
packages/core/src/graph/
```

Sở hữu các hành vi graph có thể tái sử dụng.

Ví dụ:

```text
preset graph
capability graph
cycle detection
topological ordering
dependency traversal
reverse references
```

Tránh implement graph traversal một cách độc lập bên trong các resolver module.

---

# 15. core/resolver/

```text
packages/core/src/resolver/
```

Sở hữu deterministic resolution.

Cấu trúc nội bộ có thể có:

```text
resolver/
├── resolve.ts
├── collect-requirements.ts
├── candidates.ts
├── eligibility.ts
├── conflicts.ts
├── selection.ts
├── package-resolution.ts
└── types.ts
```

Resolver nên không có side effect khi khả thi.

---

# 16. core/policy/

```text
packages/core/src/policy/
```

Sở hữu:

```text
policy evaluation
trust rules
component restrictions
provider restrictions
policy decisions
```

Nó không được phụ thuộc vào CLI prompt.

---

# 17. core/lockfile/

```text
packages/core/src/lockfile/
```

Sở hữu hành vi semantic của lockfile:

```text
lock construction
lock validation
lock comparison
lock preservation logic
```

Filesystem serialization có thể nằm trong code application/infrastructure nếu cần.

---

# 18. core/diagnostics/

```text
packages/core/src/diagnostics/
```

Sở hữu các diagnostic type và code có cấu trúc.

Ví dụ:

```text
UNKNOWN_CAPABILITY
PRESET_CYCLE
POLICY_DENIED
AMBIGUOUS_RESOLUTION
TARGET_UNSUPPORTED
LOCKFILE_STALE
```

Việc CLI render diagnostics nằm ngoài core.

---

# 19. core/explain/

```text
packages/core/src/explain/
```

Sở hữu việc xây dựng phần giải thích resolution từ các resolution decision đã lưu.

Nó không nên chạy lại logic lựa chọn một cách độc lập.

---

# 20. core/sync/

```text
packages/core/src/sync/
```

Có thể sở hữu các khái niệm planning độc lập với runtime như:

```text
desired state
actual state
managed state
change set
materialization plan
```

Các thay đổi đặc thù của target thuộc về target adapter.

---

# 21. packages/schemas/

`packages/schemas` sở hữu việc validate các serialized contract.

Nó nên bao gồm schema cho các manifest canonical.

```text
provider
package
capability
preset
profile
policy
project
lockfile
```

Implementation có thể có:

```text
JSON Schema
+
TypeScript validators/types
```

Schema package không được chứa logic resolver.

---

# 22. Schema Versioning

Về lâu dài, schema theo từng version có thể sử dụng:

```text
schemas/
└── v1alpha1/
    ├── provider.schema.json
    ├── capability.schema.json
    └── ...
```

Điều này trở nên có giá trị khi nhiều version manifest cùng tồn tại.

V1 có thể bắt đầu với cấu trúc phẳng và thêm các thư mục version khi cần thiết.

---

# 23. packages/source-adapters/

Package này chứa logic normalize upstream.

Cấu trúc:

```text
source-adapters/
└── src/
    ├── github/
    ├── git/
    ├── filesystem/
    ├── claude-marketplace/
    ├── agent-skills/
    ├── superpowers/
    └── ecc/
```

Các adapter nên implement các contract chung được định nghĩa bởi core hoặc ranh giới của adapter package.

---

# 24. Source Adapter generic

Ưu tiên adapter generic khi có thể.

Ví dụ:

```text
git/
github/
filesystem/
claude-marketplace/
agent-skills/
```

Không tạo:

```text
provider-a/
provider-b/
provider-c/
```

nếu cả ba đều dùng cùng một format generic.

---

# 25. Source Adapter đặc thù cho provider

Chỉ sử dụng thư mục đặc thù cho provider khi cần thiết.

Ví dụ:

```text
superpowers/
ecc/
```

Một adapter đặc thù cho provider nên thích ứng với cấu trúc provider bất thường thay vì mã hóa các quyết định semantic capability.

---

# 26. packages/target-adapters/

Package này sở hữu việc materialize vào các agent runtime.

Cấu trúc:

```text
target-adapters/
└── src/
    ├── claude-code/
    ├── codex/
    ├── gemini/
    ├── opencode/
    └── hermes/
```

Chỉ những adapter đã được implement mới nên chứa code đáng kể.

Các target tương lai có thể chưa tồn tại cho đến khi bắt đầu implement.

---

# 27. claude-code/

Claude Code là target chính của V1.

Cấu trúc có thể có:

```text
claude-code/
├── adapter.ts
├── inspect.ts
├── plan.ts
├── apply.ts
├── compatibility.ts
├── renderer.ts
└── types.ts
```

Adapter nên sở hữu các chi tiết đặc thù của Claude.

---

# 28. catalog/

`catalog/` chứa metadata đã được curate về các hệ sinh thái bên ngoài.

Đây là một trong những khu vực domain data authoritative chính.

Cấu trúc:

```text
catalog/
├── providers/
├── packages/
└── capabilities/
```

---

# 29. catalog/providers/

Chứa các định nghĩa Provider.

Ưu tiên mỗi Provider một file.

Ví dụ:

```text
catalog/providers/
├── superpowers.yaml
├── mattpocock.yaml
├── ecc.yaml
├── anthropic.yaml
└── wshobson.yaml
```

File Provider nên chứa metadata về source và provenance, không phải danh sách component lớn.

---

# 30. catalog/packages/

Chứa các định nghĩa Package đã được curate.

Ví dụ:

```text
catalog/packages/
├── superpowers.yaml
├── mattpocock-skills.yaml
└── ecc.yaml
```

Một định nghĩa package có thể chỉ định:

```text
provider
source
version constraints
target metadata
discovery information
```

---

# 31. Mặc định không có catalog/components/

Không duy trì thủ công:

```text
catalog/components/
```

cho mọi component third-party trừ khi có lý do chính đáng.

Metadata của Component bên ngoài thường nên được:

```text
discovered
normalized
generated
```

vào:

```text
generated/catalog/components.json
```

Điều này tránh việc phải đồng bộ thủ công các danh sách upstream thay đổi nhanh.

---

# 32. catalog/capabilities/

Chứa các định nghĩa Capability canonical.

Cấu trúc nên phản ánh các capability namespace.

Ví dụ:

```text
catalog/capabilities/
├── workflow/
│   ├── planning.yaml
│   └── verification.yaml
│
├── engineering/
│   ├── debugging.yaml
│   └── testing/
│       ├── tdd.yaml
│       ├── unit.yaml
│       ├── integration.yaml
│       └── e2e.yaml
│
├── security/
│   └── review.yaml
│
└── knowledge/
    ├── research.yaml
    └── synthesis.yaml
```

File Capability có thể định nghĩa implementation mapping đến các Component đã discover/native.

---

# 33. File path và ID của Capability

File path có thể phản ánh semantic namespace.

Ví dụ:

```text
catalog/capabilities/engineering/testing/tdd.yaml
```

tương ứng với:

```text
engineering.testing.tdd
```

Tuy nhiên, canonical ID vẫn phải được lưu tường minh trong file.

Vị trí trên filesystem không nên là nguồn định danh duy nhất.

---

# 34. presets/

`presets/` chứa các semantic composition có thể tái sử dụng.

Nó là authoritative.

Các nhóm chính:

```text
workflow
engineering
stacks
domains
knowledge
tools
```

Các nhóm này chỉ mang tính tổ chức.

`Preset` vẫn là một domain entity duy nhất.

---

# 35. presets/workflow/

Chứa các workflow composition có thể tái sử dụng.

Ví dụ:

```text
core.yaml
lightweight.yaml
rigorous.yaml
```

Tránh các file đặc thù cho provider như:

```text
superpowers.yaml
```

trừ khi thực sự cần cho diagnostics thay vì composition thông thường.

---

# 36. presets/engineering/

Ví dụ:

```text
core.yaml
architecture.yaml
testing.yaml
security.yaml
research.yaml
```

Preset có thể bao gồm:

```text
Capabilities
other Presets
```

Chúng thường không nên tham chiếu đến implementation của provider.

---

# 37. presets/stacks/

Biểu diễn các composition theo technology stack.

Ví dụ:

```text
typescript
nextjs
node
python
cloudflare
kubernetes
```

Đây là các Preset vì mỗi stack thường đại diện cho nhiều capability.

---

# 38. presets/domains/

Biểu diễn các lĩnh vực làm việc rộng hơn.

Ví dụ:

```text
frontend
backend
devops
product
gis
second-brain
```

Đừng nhầm lẫn các Preset trong `domains/` với code domain-model.

Thư mục này là một nhóm semantic composition.

---

# 39. presets/knowledge/

Ví dụ:

```text
research
writing
synthesis
knowledge-management
```

Hữu ích cho các Profile không liên quan đến coding.

---

# 40. presets/tools/

Biểu diễn các tập capability có thể tái sử dụng xoay quanh các context về tooling.

Ví dụ:

```text
github
browser
obsidian
```

Sử dụng cẩn thận.

Nếu một tool tương ứng với một khả năng semantic đơn giản, nó có thể là một Capability thay vào đó.

---

# 41. profiles/

Profile đại diện cho các vai trò làm việc.

Mỗi Profile thường nên là một file YAML.

Ví dụ:

```text
profiles/frontend-engineer.yaml
```

Profile nên chủ yếu chứa:

```text
preset references
optional metadata
```

Tránh nhúng lặp đi lặp lại các danh sách capability lớn.

---

# 42. Đặt tên Profile

Sử dụng tên theo vai trò.

Tốt:

```text
frontend-engineer
backend-engineer
product-manager
researcher
second-brain
```

Tránh tên đặc thù cho project:

```text
mealops-frontend
gtel-nextjs-dev
```

Composition đặc thù cho project thuộc về Project manifest.

---

# 43. policies/

Policy đại diện cho các governance rule có thể tái sử dụng.

Ví dụ:

```text
default.yaml
personal.yaml
strict.yaml
enterprise.yaml
```

Tên file Policy nên thể hiện hành vi hoặc trust posture.

Tránh nhúng danh tính người dùng vào các policy dùng chung.

---

# 44. plugins/native/

Chứa source implementation first-party thuộc sở hữu của repository này.

Cấu trúc:

```text
plugins/native/
├── product-management/
├── second-brain/
├── gis/
└── ...
```

Thư mục này chỉ nên chứa các implementation thực sự.

---

# 45. Tại sao là `native/`

`native` thể hiện source/nguồn gốc.

Metadata vẫn nên sử dụng:

```text
ownership: first-party
```

Điều này tránh nhầm lẫn với các provider bên ngoài vốn có thể tự gọi package của họ là "official".

---

# 46. Không có `vendor/` trong V1

Không tạo:

```text
plugins/vendor/
```

cho source third-party được mirror theo mặc định.

Tooling bên ngoài nên được biểu diễn thông qua:

```text
catalog
source references
source adapters
distribution lock
```

Vendoring là một ngoại lệ nâng cao, không phải integration model chính.

---

# 47. Không có `overlays/` trong V1

Không tạo:

```text
overlays/
```

như một khái niệm kiến trúc first-class.

Ưu tiên:

```text
capability selection
policy
implementation override
native replacement
```

Một hệ thống patch trong tương lai chỉ nên được đưa vào khi có nhu cầu rõ ràng đã được kiểm chứng.

---

# 48. generated/

`generated/` chứa các artifact dẫn xuất.

Không có gì trong `generated/` nên là authoritative.

Việc xóa thư mục này và generate lại phải an toàn.

---

# 49. generated/catalog/

Các file có thể có:

```text
components.json
search-index.json
capability-index.json
reverse-index.json
```

Các file này được tối ưu cho:

```text
runtime loading
search
impact analysis
developer tooling
```

---

# 50. generated/catalog/components.json

Chứa metadata Component đã normalize được discover từ các upstream source.

Nó có thể bao gồm:

```text
provider
package
component ID
component type
source location
target metadata
security metadata
```

Capability mapping vẫn là authoritative trong canonical catalog.

---

# 51. generated/catalog/search-index.json

Chứa dữ liệu search đã denormalize cho các command như:

```bash
ap search tdd
```

Nó có thể kết hợp:

```text
capabilities
aliases
providers
packages
components
presets
profiles
```

---

# 52. generated/catalog/reverse-index.json

Có thể chứa các reverse mapping như:

```text
Capability → Presets
Preset → Profiles
Component → Capabilities
Package → Components
```

Hữu ích cho:

```text
impact analysis
explainability
documentation generation
```

---

# 53. generated/targets/

Chứa các distribution artifact đặc thù cho target được generate khi cần.

Ví dụ:

```text
generated/targets/claude-code/
```

Không lưu runtime state của consumer project ở đây.

Thư mục này thuộc về quá trình generate distribution.

---

# 54. .claude-plugin/

Claude Code có thể yêu cầu marketplace metadata ở cấp repository.

Ví dụ:

```text
.claude-plugin/marketplace.json
```

File này nên được generate.

Các input authoritative của nó nên đến từ:

```text
catalog
plugins/native
catalog.lock
```

---

# 55. Quy tắc marketplace.json

Không mã hóa thủ công domain metadata riêng biệt chỉ trong:

```text
.claude-plugin/marketplace.json
```

Nếu thông tin có ý nghĩa với domain, nó nên tồn tại trong canonical metadata và được render vào file marketplace.

---

# 56. catalog.lock

Về lâu dài repository nên bao gồm một distribution lock.

Vị trí được khuyến nghị:

```text
catalog.lock
```

ở root của repository.

Phương án thay thế:

```text
catalog/catalog.lock
```

cũng khả thi, nhưng root được ưu tiên vì lock đại diện cho toàn bộ curated distribution thay vì chỉ một thư mục con của catalog.

---

# 57. Vị trí Project Lockfile

Các consumer project sử dụng:

```text
agent-plugins.lock
```

ở root của consumer repository.

Nó không thuộc về thư mục:

```text
generated/
```

của repository này.

Các example trong `examples/` có thể chứa lockfile mang tính minh họa.

---

# 58. tests/

Test được tổ chức chủ yếu theo mối quan tâm kiến trúc thay vì phản ánh chính xác mọi thư mục source.

```text
tests/
├── fixtures/
├── schemas/
├── catalog/
├── graph/
├── resolver/
├── policy/
├── adapters/
├── integration/
└── e2e/
```

Unit test cũng có thể nằm gần implementation khi thuận tiện.

Yêu cầu then chốt là trách nhiệm rõ ràng.

---

# 59. tests/fixtures/

Chứa input test ổn định.

Cấu trúc có thể có:

```text
fixtures/
├── catalogs/
├── projects/
├── providers/
├── upstream/
├── locks/
└── targets/
```

Fixture nên được cố ý giữ nhỏ.

Tránh sao chép các repository thực tế khổng lồ vào test fixture.

---

# 60. tests/schemas/

Kiểm thử:

```text
valid manifests
invalid manifests
schema migrations
ID validation
```

---

# 61. tests/catalog/

Kiểm thử:

```text
catalog loading
reference integrity
duplicate IDs
implementation mappings
```

---

# 62. tests/graph/

Kiểm thử:

```text
cycle detection
topological ordering
dependency expansion
reverse references
```

---

# 63. tests/resolver/

Kiểm thử:

```text
candidate selection
cardinality
priority
ambiguity
deduplication
overrides
lock stability
```

Đây nên trở thành một trong những test suite mạnh nhất.

---

# 64. tests/policy/

Kiểm thử:

```text
trust filtering
security-sensitive components
deny behavior
review behavior
provider preference
```

---

# 65. tests/adapters/

Tách theo loại adapter nếu hữu ích.

Ví dụ:

```text
adapters/
├── source/
└── target/
```

Target adapter nên sử dụng golden fixture khi có thể.

---

# 66. tests/integration/

Kiểm thử tương tác giữa nhiều tầng.

Ví dụ:

```text
Project
→ Catalog
→ Resolver
→ Lockfile
→ Claude Adapter
```

---

# 67. tests/e2e/

Chạy các luồng CLI thực tế trên các fixture repository được cô lập.

Ví dụ:

```bash
ap init
ap sync
ap explain
ap diff
ap doctor
```

---

# 68. examples/

`examples/` chứa các project tham khảo dễ đọc cho con người.

Khuyến nghị:

```text
frontend/
backend/
mealops/
product-manager/
second-brain/
```

Mỗi example có thể chứa:

```text
agent-plugins.yaml
expected explanation
optional lockfile fixture
README.md
```

---

# 69. Example không phải là test

Example nên tối ưu cho việc học.

Test tối ưu cho việc validate.

Một example cũng có thể được dùng bởi integration test, nhưng tránh coupling mọi example trong tài liệu với cơ chế test phức tạp.

---

# 70. docs/

`docs/` chứa tài liệu canonical.

Điểm vào:

```text
docs/index.md
```

Tài liệu được tổ chức từ lập luận sản phẩm đến chi tiết implementation.

---

# 71. docs/00-product/

Chứa:

```text
problem.md
problem.vi.md
vision.md
goals.md
non-goals.md
requirements.md
use-cases.md
```

Tầng này trả lời:

```text
Why are we building this?

What must it achieve?
```

---

# 72. docs/01-domain/

Chứa:

```text
domain-model.md
terminology.md
capability-model.md
```

Tầng này trả lời:

```text
What concepts exist?

What do they mean?

How do they relate?
```

---

# 73. docs/02-architecture/

Chứa:

```text
architecture.md
repository-structure.md
source-of-truth.md
resolution-spec.md
```

Tầng này trả lời:

```text
How is the system organized?
```

---

# 74. docs/03-specs/

Chứa các contract hướng đến implementation.

```text
catalog-spec.md
manifest-spec.md
lockfile-spec.md
policy-spec.md
adapter-spec.md
update-spec.md
cli-spec.md
```

Các tài liệu này nên đủ chính xác để định hướng implementation và testing.

---

# 75. docs/04-security/

Chứa:

```text
security-model.md
trust-model.md
```

Các mối quan tâm về security nên được thể hiện tường minh thay vì chỉ rải rác trong các tài liệu kiến trúc.

---

# 76. docs/05-development/

Chứa tài liệu về engineering workflow.

```text
testing-strategy.md
contributing.md
release-process.md
```

---

# 77. docs/06-roadmap/

Chứa:

```text
roadmap.md
todo.md
```

Các file này hướng đến việc delivery.

Chúng không nên định nghĩa lại kiến trúc.

---

# 78. docs/decisions/adr/

Chứa các Architecture Decision Record.

Cấu trúc:

```text
docs/decisions/adr/
```

ADR ghi lại các quyết định chứ không thay thế tài liệu kiến trúc.

---

# 79. Đặt tên ADR

Sử dụng:

```text
NNNN-short-decision-name.md
```

Ví dụ:

```text
0001-capability-based-resolution.md
```

Giữ đánh số tăng dần đơn điệu.

Không tổ chức lại cách đánh số ADR theo từng phần kiến trúc.

---

# 80. tools/

`tools/` chứa tooling dành cho maintainer của repository.

Khuyến nghị:

```text
tools/
├── generate/
├── validate/
├── update/
└── release/
```

Đây không phải là các CLI command dành cho consumer.

---

# 81. tools/generate/

Các script của maintainer cho:

```text
component discovery
generated indexes
marketplace manifests
documentation indexes
```

Ví dụ:

```text
pnpm generate
```

có thể gọi các script này bên trong.

---

# 82. tools/validate/

Điều phối validation cho maintainer.

Ví dụ:

```text
validate catalog
validate manifests
check generated drift
check capability mappings
```

Logic validation có thể tái sử dụng vẫn nên nằm trong các package.

`tools/validate` chỉ điều phối các workflow của repository.

---

# 83. tools/update/

Tooling của maintainer cho việc update upstream provider.

Ví dụ:

```text
discover new upstream version
compare component inventory
generate update report
update distribution lock
```

---

# 84. tools/release/

Tự động hóa release.

Ví dụ:

```text
version checks
changelog validation
build
publish
release artifact generation
```

---

# 85. Thư mục authoritative và thư mục generated

Authoritative:

```text
catalog/
presets/
profiles/
policies/
plugins/native/
docs/
```

Source implementation:

```text
apps/
packages/
tools/
```

Generated:

```text
generated/
.claude-plugin/marketplace.json
```

Consumer state:

```text
agent-plugins.yaml
agent-plugins.lock
```

Consumer state thường tồn tại trong các downstream repository thay vì distribution repository này.

---

# 86. Tóm tắt ownership của các thư mục

| Thư mục | Trách nhiệm | Authoritative |
|---|---|---|
| `apps/` | Ứng dụng thực thi được | Có |
| `packages/` | Code implementation có thể tái sử dụng | Có |
| `catalog/` | Metadata hệ sinh thái đã được curate | Có |
| `presets/` | Các capability composition | Có |
| `profiles/` | Các composition theo role | Có |
| `policies/` | Các rule resolution/governance | Có |
| `plugins/native/` | Các implementation first-party | Có |
| `generated/` | Các index/artifact dẫn xuất | Không |
| `.claude-plugin/` | Output distribution đặc thù cho target | Ưu tiên generate |
| `tests/` | Các test suite và fixture | Có |
| `examples/` | Các cấu hình tham khảo | Có |
| `docs/` | Tài liệu canonical | Có |
| `tools/` | Tự động hóa cho maintainer | Có |

---

# 87. Hướng phụ thuộc theo thư mục

Hướng phụ thuộc mong muốn là:

```text
apps/cli
    ↓
packages/core
    ↑
    ├── packages/source-adapters
    └── packages/target-adapters
```

Chính xác hơn:

```text
CLI
→ core application APIs

source-adapters
→ core contracts

target-adapters
→ core contracts

core
→ schemas / minimal shared utilities
```

Các thư mục dữ liệu được load bởi các application/core service phù hợp.

---

# 88. Hướng phụ thuộc dữ liệu

```text
catalog/
presets/
profiles/
policies/
plugins/native/
        ↓
Validation / Normalization
        ↓
Core Domain
        ↓
Resolution
        ↓
generated / target materialization
```

Generated artifact không bao giờ được chảy ngược lại và trở thành input authoritative, trừ khi được xem tường minh là cache.

---

# 89. Quy ước đặt tên

Sử dụng:

```text
kebab-case
```

cho:

```text
filenames
directory names
profile IDs
provider IDs
package IDs
preset names
policy IDs
target IDs
```

Ví dụ:

```text
frontend-engineer.yaml
second-brain.yaml
claude-code/
```

---

# 90. Đặt tên Capability

Sử dụng namespace phân tách bằng dấu chấm:

```text
engineering.testing.tdd
knowledge.research
security.review
```

Filesystem path có thể phản ánh namespace:

```text
engineering/testing/tdd.yaml
```

---

# 91. Đặt tên Preset

Canonical Preset ID sử dụng phân cấp bằng dấu gạch chéo:

```text
workflow/core
engineering/security
stacks/nextjs
knowledge/research
```

File tương ứng:

```text
presets/engineering/security.yaml
```

---

# 92. Đặt tên Provider

Provider ID:

```text
superpowers
```

Tên hiển thị:

```text
Superpowers
```

Không sử dụng tên hiển thị làm tham chiếu ổn định.

---

# 93. Đặt tên Package

Package ID nên ổn định trong phạm vi Provider.

Tham chiếu canonical có thể sử dụng:

```text
provider/package
```

Ví dụ:

```text
anthropic/frontend-design
```

---

# 94. Đặt tên Component

Tham chiếu Component canonical nên luôn không mơ hồ trên phạm vi toàn cục.

Cú pháp khái niệm:

```text
provider/package#type:name
```

Ví dụ:

```text
superpowers/superpowers#skill:test-driven-development
```

Cú pháp này có thể thay đổi trước khi V1 ổn định, nhưng tính mơ hồ thì không được phép xuất hiện.

---

# 95. Không có `src/utils/` generic làm nơi chứa tạp nham

Tránh các thư mục generic lớn như:

```text
src/utils/
src/helpers/
src/common/
```

Ưu tiên tổ chức code theo trách nhiệm.

Ví dụ:

```text
graph/topological-sort.ts
resolver/candidate-selection.ts
```

thay vì:

```text
utils/graph.ts
helpers/resolver.ts
```

---

# 96. Shared Utilities

Nếu xuất hiện các utility cấp thấp thực sự có thể tái sử dụng, chỉ đưa chúng vào khi có lý do chính đáng.

Không tạo:

```text
packages/shared
```

ngay từ ngày đầu.

Các shared package được tạo quá sớm thường trở thành nơi chứa dependency tạp nham.

---

# 97. Không có mega folder `services/`

Tránh:

```text
src/services/
```

chứa mọi business operation.

Sử dụng các thư mục hướng domain:

```text
resolver/
policy/
catalog/
lockfile/
```

Filesystem nên thể hiện kiến trúc.

---

# 98. Không có mega folder `types/`

Ưu tiên giữ type gần domain của chúng.

Tốt:

```text
resolver/types.ts
policy/types.ts
```

Tránh đặt mọi interface vào:

```text
src/types/
```

trừ khi nó thực sự đại diện cho các contract nền tảng dùng chung.

---

# 99. Quy tắc Colocation

Các file đặc thù cho implementation thường nên được đặt cạnh nhau.

Ví dụ:

```text
resolver/
├── resolve.ts
├── candidates.ts
├── conflicts.ts
└── resolve.test.ts
```

Các integration test cho toàn repository vẫn có thể nằm trong:

```text
tests/
```

---

# 100. Quy tắc Public API

Mỗi package nên expose một public API được thiết kế có chủ đích.

Ví dụ:

```text
packages/core/src/index.ts
```

Các module nội bộ không nên tự động trở thành public chỉ vì chúng có thể được import.

Tránh các deep import như:

```text
@agent-plugins/core/src/resolver/internal/foo
```

từ các package khác.

---

# 101. Quy tắc phụ thuộc Package

Tránh phụ thuộc vòng giữa các package.

Mong muốn:

```text
schemas
   ↑
 core
   ↑
applications / adapters
```

Nếu:

```text
core ↔ target-adapters
```

xuất hiện, ranh giới abstraction đang sai.

---

# 102. Quy tắc phụ thuộc Catalog

Catalog metadata không nên import code.

Các file Catalog là dữ liệu khai báo.

Tránh nhúng các biểu thức JS/TS thực thi được vào YAML manifest.

Điều này giữ được:

```text
portability
validation
determinism
reviewability
```

---

# 103. Quy tắc phụ thuộc Policy

Policy nên giữ tính khai báo.

Tránh:

```yaml
evaluate:
  script: ./custom-policy.js
```

trong V1.

Logic policy tùy biến thực thi được sẽ làm suy yếu reproducibility và security.

---

# 104. Quy tắc Generated File

Mọi file generated được commit phải có một generator được ghi lại trong tài liệu.

Ví dụ:

```text
generated/catalog/components.json
← pnpm generate:catalog
```

Nếu không có generator, file đó không nên được xem là generated.

---

# 105. Ownership của việc generate

Generator thuộc về:

```text
tools/generate/
```

Logic generate có thể tái sử dụng có thể nằm trong các package.

Tool nên điều phối thay vì sao chép logic domain.

---

# 106. Quy tắc Generated Drift

Về lâu dài CI nên bắt buộc:

```text
generate
↓
git diff --exit-code
```

để các generated artifact đã commit không thể âm thầm trở nên lỗi thời.

---

# 107. Ví dụ Consumer Repository

Một downstream project có thể trông như sau:

```text
mealops/
├── src/
├── package.json
├── ...
│
├── agent-plugins.yaml
├── agent-plugins.lock
│
└── .claude/
    └── ...
```

`agent-plugins` chỉ quản lý runtime state mà nó đã khai báo.

Nó không yêu cầu consumer project phải áp dụng cấu trúc monorepo này.

---

# 108. Ranh giới Consumer Manifest

Cấu hình hướng đến consumer nên giữ nhỏ.

Tránh expose các thư mục distribution nội bộ như:

```text
catalog/
providers/
packages/
```

bên trong mọi consumer repository.

Một consumer chủ yếu chỉ cần:

```text
agent-plugins.yaml
agent-plugins.lock
```

cộng với state được runtime generate.

---

# 109. Cấu trúc Repository tối thiểu của V1

Mặc dù cấu trúc mục tiêu đầy đủ lớn hơn, V1 có thể bắt đầu với:

```text
agent-plugins/
├── apps/
│   └── cli/
│
├── packages/
│   ├── core/
│   ├── schemas/
│   ├── source-adapters/
│   └── target-adapters/
│
├── catalog/
│   ├── providers/
│   ├── packages/
│   └── capabilities/
│
├── presets/
├── profiles/
├── policies/
├── plugins/
│   └── native/
├── generated/
├── tests/
├── examples/
├── docs/
└── tools/
```

Không tạo các cây thư mục sâu nhưng rỗng trừ khi implementation hoặc dữ liệu đã thực sự cần đến.

---

# 110. Thứ tự tạo trong V1

Thứ tự implement được khuyến nghị:

```text
1. docs/

2. packages/schemas/

3. packages/core/model/

4. catalog/

5. presets/

6. profiles/

7. policies/

8. packages/core/graph/

9. packages/core/resolver/

10. packages/core/policy/

11. packages/core/lockfile/

12. packages/source-adapters/

13. packages/target-adapters/claude-code/

14. apps/cli/

15. generated/

16. tests/integration/

17. tests/e2e/
```

Repository nên phát triển song song với chức năng đã được implement thay vì tạo ra các abstraction layer rỗng không cần thiết.

---

# 111. Dữ liệu Provider của V1

Các provider manifest ban đầu có thể bao gồm:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

Tập này nhằm kiểm chứng các kiểu provider khác nhau thay vì tối đa hóa độ bao phủ hệ sinh thái.

---

# 112. Dữ liệu Capability của V1

Bắt đầu với một tập capability được cố ý giữ nhỏ nhưng đủ để kiểm chứng:

```text
workflow ownership

TDD conflicts

debugging

architecture

security

frontend

research

product

second-brain
```

Không cố gắng định nghĩa toàn bộ taxonomy tương lai trước khi test model.

---

# 113. Preset của V1

Các Preset hữu ích ban đầu:

```text
workflow/core

engineering/core
engineering/testing
engineering/security

stacks/typescript
stacks/nextjs

domains/frontend
domains/backend
domains/product
domains/second-brain

knowledge/research
knowledge/writing
knowledge/synthesis
```

---

# 114. Profile của V1

Các Profile tiêu biểu ban đầu:

```text
frontend-engineer

backend-engineer

product-manager

second-brain
```

Các Profile này kiểm chứng các semantic composition khác nhau.

---

# 115. Policy của V1

Các policy ban đầu:

```text
default

personal

strict
```

`enterprise` có thể tồn tại như một ví dụ nhưng không nên yêu cầu hạ tầng enterprise.

---

# 116. Native Plugin của V1

Native plugin chỉ nên được đưa vào khi chúng mang lại giá trị độc đáo thực sự.

Không tạo các bản sao native chỉ để lấp đầy mọi domain.

Các lĩnh vực có thể triển khai sớm:

```text
product-management
second-brain
```

GIS có thể được đưa vào khi các use case thực tế được implement.

---

# 117. Phát triển cấu trúc

Thư mục nên được đưa vào vì tồn tại một ranh giới kiến trúc thực sự.

Trước khi thêm một thư mục cấp cao nhất mới, hãy hỏi:

```text
Does this represent a distinct source of truth?

Does this represent a distinct architectural responsibility?

Will multiple files meaningfully live here?

Does the existing structure become unclear without it?
```

Nếu không, giữ nguyên cấu trúc hiện tại.

---

# 118. Các anti-pattern về cấu trúc

Tránh:

```text
too many top-level folders

provider names spread everywhere

one folder per hypothetical concept

deep profile inheritance directories

duplicate catalog metadata

runtime-specific domain folders

manual generated files

generic shared utility dumps
```

---

# 119. Các bất biến của cấu trúc Repository

Cấu trúc nên giữ được các bất biến sau:

```text
1. Runtime-independent core lives under packages/core.

2. CLI-specific behavior stays under apps/cli.

3. Source-specific behavior stays in source adapters.

4. Target-specific behavior stays in target adapters.

5. Curated provider/package/capability metadata stays under catalog.

6. Presets and Profiles never live inside provider folders.

7. Native implementation source stays under plugins/native.

8. Third-party source is not copied into plugins/native.

9. Generated artifacts stay clearly separated.

10. Generated artifacts are never authoritative.

11. Documentation has one entry point: docs/index.md.

12. Architectural decisions live under docs/decisions/adr.

13. Consumer state is separate from distribution state.

14. Tests mirror architectural responsibilities.

15. Package boundaries remain coarse until real complexity requires further splitting.
```

---

# 120. Bản đồ Repository theo câu hỏi

Khi đặt câu hỏi:

> Provider metadata đặt ở đâu?

```text
catalog/providers/
```

> Package metadata đặt ở đâu?

```text
catalog/packages/
```

> Semantic capability metadata đặt ở đâu?

```text
catalog/capabilities/
```

> Capability composition có thể tái sử dụng đặt ở đâu?

```text
presets/
```

> Composition theo role đặt ở đâu?

```text
profiles/
```

> Các rule về trust và governance đặt ở đâu?

```text
policies/
```

> Source implementation first-party đặt ở đâu?

```text
plugins/native/
```

> Business logic deterministic đặt ở đâu?

```text
packages/core/
```

> Phần parse upstream đặt ở đâu?

```text
packages/source-adapters/
```

> Phần render cho Claude Code đặt ở đâu?

```text
packages/target-adapters/src/claude-code/
```

> CLI UX đặt ở đâu?

```text
apps/cli/
```

> Metadata dẫn xuất đặt ở đâu?

```text
generated/
```

> Tài liệu kiến trúc đặt ở đâu?

```text
docs/02-architecture/
```

---

# 121. Tóm tắt cấu trúc Repository

Repository có thể được tóm tắt như sau:

```text
Code
├── apps/
└── packages/

Canonical Domain Data
├── catalog/
├── presets/
├── profiles/
├── policies/
└── plugins/native/

Derived Data
└── generated/

Quality
├── tests/
└── examples/

Knowledge
└── docs/

Maintenance
└── tools/
```

---

# 122. Cấu trúc Repository trong một câu

> **`agent-plugins` tách biệt code thực thi, canonical capability metadata, composition có thể tái sử dụng, các implementation first-party, generated artifact, tài liệu và test để mỗi trách nhiệm kiến trúc đều có một vị trí rõ ràng và dễ dự đoán.**