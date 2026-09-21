# ADR 0010 — Chiến lược materialization cho Claude Code (V1)

- **Trạng thái:** Accepted
- **Ngày:** 2026-09-22
- **Liên quan:** [`adapter-spec.md`](../../03-specs/adapter-spec.md) §6–8, [`catalog-spec.md`](../../03-specs/catalog-spec.md), [`resolution-spec.md`](../../02-architecture/resolution-spec.md), [`policy-spec.md`](../../03-specs/policy-spec.md), [`manifest-spec.md`](../../03-specs/manifest-spec.md), [`security-model.md`](../../04-security/security-model.md)

## Bối cảnh

Giá trị cốt lõi của `agent-plugins` là chọn các Component từ nhiều Provider, rồi materialize đúng tập đã chọn vào runtime. Tài liệu hiện có hai chiến lược mâu thuẫn nhau:

- `adapter-spec.md` §7.1: local marketplace chứa các "projection plugin".
- `cli-spec.md` và `roadmap.md`: ghi thẳng vào `.claude/skills/`.

Một spike trên Claude Code 2.1.278 (2026-09-22) đã thử cả hai cách. Config được cách ly bằng `CLAUDE_CONFIG_DIR`, danh sách skill/plugin được đọc từ event `system/init` của `claude -p --output-format stream-json`.

### Bằng chứng từ spike

| Quan sát | A: copy vào `.claude/skills` | B: local marketplace + projection plugin |
|---|---|---|
| Skill được load | Có, tên trần (`brainstorming`) | Có, namespace theo tên plugin (`superpowers-proj:brainstorming`) |
| Tắt từng skill | `skillOverrides: {"<name>": "off"}` có tác dụng | `skillOverrides` **không** có tác dụng với skill trong plugin; `claude plugin disable` chỉ ở mức plugin |
| Đăng ký marketplace | — | `marketplace add --scope project` ghi đường dẫn **tuyệt đối** vào `.claude/settings.json`, dù truyền đường dẫn tương đối |
| Cập nhật nội dung | Sửa file là có hiệu lực ngay | Marketplace dạng `directory`: runtime load **trực tiếp từ thư mục nguồn**, sửa là có hiệu lực ngay (không qua cache) |
| Trùng tên | Skill trùng tên ở `~/.claude/skills` khiến chỉ còn một bản, không có cảnh báo | Namespace theo plugin, nên không trùng skill; có thể trùng *tên plugin* với bản người dùng tự cài |
| Hook | — | Thêm `hooks/hooks.json` vào plugin đã enable: session kế tiếp chạy hook ngay, không có bước duyệt (chế độ `-p`) |
| Hai project cùng tên marketplace | — | Hai project cùng đăng ký marketplace tên `ap` (scope local, đường dẫn khác nhau). `known_marketplaces.json` dùng chung cho máy, khóa theo tên, nên chỉ giữ entry của project đăng ký sau. Project kia **mất toàn bộ plugin, không cảnh báo**. Đặt tên riêng (`ap-x`) thì cả hai chạy độc lập |
| Plugin user scope và project | — | Plugin cài ở user scope được **cộng dồn** vào mọi project. `enabledPlugins: {"<plugin>@<marketplace>": false}` trong `.claude/settings.local.json` của một project tắt được plugin đó cho riêng project này |

Hai quan sát áp dụng cho mọi cách tách Component:

1. **Hệ sinh thái có tham chiếu chéo theo namespace.** `superpowers/systematic-debugging` hướng dẫn dùng `superpowers:test-driven-development` và `superpowers:verification-before-completion`. Nếu tách lẻ skill hoặc đổi namespace, các hướng dẫn này trỏ tới skill không tồn tại.
2. **Package có kích hoạt ẩn.** `superpowers` có hook `SessionStart` inject skill `using-superpowers` vào mọi session.

Kết luận của spike: tách Component thì chỉ an toàn với các skill **vốn chạy độc lập**. Các hệ sinh thái liên kết chặt phải được giữ nguyên.

## Quyết định

### D1. Mỗi project có một local marketplace riêng, sinh từ cấu hình
- `ap sync` sinh marketplace tại `.agent-plugins/marketplace/` trong project, gồm `.claude-plugin/marketplace.json` (tên marketplace duy nhất theo D9) và các plugin. Marketplace được sinh từ `agent-plugins.yaml` + `agent-plugins.lock`.
- Marketplace là **artifact sinh ra**. Nó không phải nguồn sự thật, được gitignore, và luôn tái tạo được từ lock.
- Adapter đăng ký marketplace và cài plugin qua CLI native (`claude plugin marketplace add`, `claude plugin install`). Adapter không sửa cache hay registry nội bộ của runtime.

### D2. Hai kiểu Package: `ecosystem` và `collection`
Catalog khai báo `materialization` cho mỗi Package:

| Kiểu | Ví dụ | Cách materialize |
|---|---|---|
| `ecosystem` | Superpowers | Cài **nguyên plugin upstream**, giữ nguyên tên và namespace (`superpowers:*`). Không tách, không copy, không rewrite |
| `collection` | ECC, Matt Pocock skills | Sinh **projection plugin** chỉ chứa các Component đã chọn. Các Component này phải chạy độc lập (xem D6) |

- Projection plugin của một `collection` được đặt tên theo Package canonical, ví dụ `ecc` hoặc `mattpocock-skills`, để tên ổn định giữa các lần sync.
- Nội dung Component được giữ nguyên văn. Projection chỉ quyết định Component nào có mặt, không sửa Component.
- **Tắt từng Component:**
  - Với `collection`: exclude Component trong `agent-plugins.yaml` thì Component đó không có mặt trong projection plugin ở lần `ap sync` kế tiếp. Đây là cơ chế tắt từng skill. Ý định được commit, được lock và giải thích được qua `ap diff`/`ap explain`. Có hiệu lực từ session mới sau khi sync.
  - Với `ecosystem`: không hỗ trợ exclude từng Component. Cấu hình exclude sẽ fail với `ECOSYSTEM_PARTIAL_EXCLUDE`, kèm gợi ý bỏ cả ecosystem; lệnh exclude không bao giờ bị bỏ qua âm thầm.

### D3. Hai scope kiểu mise: project và global
Mô hình giống mise (`mise.toml` + `mise install`, `mise use -g`):

| Scope | Cấu hình | Lệnh | Marketplace | Đăng ký trong Claude Code |
|---|---|---|---|---|
| project (mặc định) | `agent-plugins.yaml` + `agent-plugins.lock` trong project | `ap sync` | `<project>/.agent-plugins/marketplace/` | `.claude/settings.local.json` của project (`--scope local`) |
| global | `~/.config/agent-plugins/agent-plugins.yaml` + lock đi kèm | `ap sync -g` | `~/.config/agent-plugins/marketplace/` | user settings (`--scope user`) |

- Plugin global được **cộng dồn** vào mọi project; project không ghi đè được như mise, vì Claude Code bật đồng thời cả hai scope.
- Project tắt một plugin global bằng `disableGlobal: [<package>]` trong `agent-plugins.yaml`. `ap sync` hiện thực nó bằng `enabledPlugins: {"<plugin>@<marketplace-global>": false}` trong `.claude/settings.local.json` của project.
- `ap sync` ở project **đọc cả cấu hình global** để phát hiện xung đột (D4) và cảnh báo trùng lặp.

Chi tiết cho scope project:
- **Commit vào repo:** `agent-plugins.yaml`, `agent-plugins.lock`.
- **Sinh ra trên từng máy và không commit:**
  - `.agent-plugins/marketplace/`;
  - đăng ký marketplace/plugin trong `.claude/settings.local.json`;
  - receipt `.agent-plugins/state/claude-code.json`;
  - cache plugin trong `~/.claude/plugins`.
- Người khác clone repo về chỉ cần chạy `ap sync` để có trạng thái giống hệt, nhờ lock.
- Nếu đăng ký ở scope `project` (commit `.claude/settings.json`), đường dẫn marketplace phải là **tương đối**. Chế độ này là tùy chọn, không phải mặc định.

### D4. Resolver coi `ecosystem` là một khối
- Chọn **bất kỳ** Component nào của một `ecosystem` đồng nghĩa với kích hoạt **toàn bộ** Component và toàn bộ Capability mà ecosystem đó cung cấp.
- Các Capability này được đưa vào Resolution như đã chọn, có Resolution Decision ghi lý do `activated-by-ecosystem:<package>`.
- Nếu một Capability `cardinality: one` được cung cấp bởi ecosystem đang active (ở scope project hoặc global) **và** được chọn từ nguồn khác:
  - Mặc định: resolution **fail** với `ECOSYSTEM_CAPABILITY_CONFLICT`. Không âm thầm cài cả hai.
  - Nếu project khai báo `allowOverlap: [<capability>]`, cả hai implementation cùng được materialize. Resolution ghi cả hai, `ap sync` cảnh báo, và `ap explain` cho thấy Capability có hai implementation. Ví dụ: giữ Superpowers và dùng thêm skill TDD độc lập của Matt Pocock (`mattpocock-skills:tdd`). Hai bản khác namespace nên không đè nhau, nhưng người dùng phải gọi skill của Matt một cách chủ động, vì workflow và hook của Superpowers ưu tiên skill của nó.
  - Cách khác: bỏ ecosystem, hoặc chấp nhận implementation của ecosystem.
- `ap explain` phải cho thấy Capability nào đến từ ecosystem.

### D5. Policy đánh giá toàn bộ phần kích hoạt của plugin
- Phần kích hoạt của một plugin gồm skill, agent, command, hook, MCP server, LSP, và các tệp thực thi đi kèm.
  - Với `ecosystem`: là **toàn bộ** plugin upstream.
  - Với `collection`: là closure đã chọn.
- Policy được đánh giá trên toàn bộ phần kích hoạt **trước khi** sinh marketplace. Hook và MCP ẩn trong ecosystem cũng phải qua Policy (ví dụ `SessionStart` của Superpowers).
- Ranh giới thực thi là **lúc tệp được ghi vào vị trí runtime sẽ load**, không phải lúc người dùng gọi. Vì runtime load trực tiếp từ thư mục marketplace, mọi thay đổi trong `.agent-plugins/marketplace/` đều phải đi qua `ap sync`.
- Lockfile ghi rõ plugin nào có hook/MCP. `ap diff` hiển thị chúng trước khi apply.
- **Allowlist thực thi**, giống `onlyBuiltDependencies` của pnpm:
  - `agent-plugins.yaml` khai báo `allowExecutables: [<package>, ...]`. Plugin có hook, MCP server hoặc tệp thực thi mà không nằm trong danh sách thì `ap sync` từ chối, với `EXECUTABLE_NOT_ALLOWED`.
  - Khi `ap update` làm xuất hiện hook/MCP **mới** trong một package đã được allow (so với lock hiện tại), update dừng lại và yêu cầu xác nhận lại. Ở chế độ không tương tác (CI), update fail.
  - Allowlist này là cơ chế policy tối thiểu của V1 cho Component thực thi được.
- Trong V1, projection của `collection` **không** chứa hook hoặc MCP. Chọn chúng sẽ fail với `COMPONENT_ACTIVATION_UNSUPPORTED`. Ecosystem có hook/MCP được phép nếu Policy cho phép.

### D6. Chỉ Component chạy độc lập mới được lọc từ `collection`
- Catalog đánh dấu Component của `collection` với `standalone: true` (mặc định) hoặc khai báo `requires` tới Component khác trong cùng Package.
- Source adapter quét nội dung Component tìm tham chiếu dạng `<namespace>:<name>`, hoặc tên Component khác của cùng Package. Tham chiếu chưa được khai báo sẽ được báo để người curate xử lý.
- Resolver kéo closure `requires` vào projection. Tham chiếu không có đích sẽ fail với `UNRESOLVED_COMPONENT_REFERENCE`.
- Package mà các Component phụ thuộc nhau dày đặc thì phải được phân loại lại thành `ecosystem`.

### D7. Nguồn được ghim theo commit SHA
- Mọi plugin trong marketplace được sinh từ snapshot đã lock theo commit SHA trong `agent-plugins.lock`, kể cả ecosystem.
- Ưu tiên entry marketplace dạng git/github ghim theo SHA, nếu Claude Code hỗ trợ ghim theo SHA. Nếu không, `ap sync` clone snapshot vào `.agent-plugins/sources/<package>@<sha>/` và dùng source dạng thư mục.
- Thư mục snapshot và projection được đặt tên theo digest/SHA và **bất biến**. Nội dung đổi thì sinh thư mục mới, không sửa tại chỗ. `plugin.json` version mang digest (ví dụ `6.3.0+<digest>`) để cache runtime không dùng bản cũ.

### D8. Quyền sở hữu và xung đột với cài đặt thủ công
- Receipt ghi: marketplace đã đăng ký, plugin đã cài (tên, version/digest, scope), và đường dẫn snapshot. Adapter chỉ gỡ plugin có trong receipt.
- Nếu người dùng đã tự cài một plugin cùng tên (ví dụ `superpowers@claude-plugins-official`) ở bất kỳ scope nào, phát cảnh báo `TARGET_PLUGIN_OVERLAP`. Adapter không gỡ hay tắt plugin đó. Nếu trùng lặp làm mất một đảm bảo bắt buộc (ví dụ hai phiên bản cùng một ecosystem), việc apply bị chặn.

### D9. Store chung của Claude Code, tên marketplace duy nhất và `ap prune`
- Cấu hình và marketplace nằm trong project, nhưng Claude Code vẫn ghi trạng thái cài đặt vào thư mục chung của máy `~/.claude/plugins/`: `known_marketplaces.json`, `installed_plugins.json` (kèm `projectPath` tuyệt đối), và `cache/`. Cũng như mise, cô lập theo project nằm ở mức **kích hoạt** (`enabledPlugins` trong settings local), không phải ở chỗ lưu trữ.
- **Tên marketplace bắt buộc duy nhất trên máy**, vì `known_marketplaces.json` khóa theo tên (xem bằng chứng):
  - scope project: `ap-<tên-project>-<hash ngắn của đường dẫn tuyệt đối>`;
  - scope global: `ap-global`.
- Trước khi đăng ký, `ap sync` kiểm tra `known_marketplaces.json`. Nếu tên đã được dùng cho một đường dẫn khác thì fail với `MARKETPLACE_NAME_CONFLICT`, không đè lên.
- Di chuyển hoặc đổi tên thư mục project làm đổi hash, nên `ap sync` sẽ đăng ký marketplace mới. Entry cũ trở thành rác.
- `ap prune` dọn các marketplace `ap-*`, plugin đã cài và cache có `projectPath`/đường dẫn không còn tồn tại, giống `mise prune` / `pnpm store prune`. Nó chỉ đụng tới những gì do `agent-plugins` đăng ký.

## Việc cần kiểm chứng trước khi phát hành V1
1. Entry marketplace dạng github có ghim được theo `sha` không (quyết định nhánh nào của D7).
2. Đường dẫn tương đối trong `extraKnownMarketplaces` khi đăng ký ở scope project (D3, chế độ tùy chọn).
3. Hành vi khi cùng lúc có `superpowers@<local>` và `superpowers@claude-plugins-official`: trùng skill, thứ tự ưu tiên (D8).
4. Luồng clone mới: config trống → `ap sync` → skill/plugin xuất hiện trong `system/init`.

## Hệ quả

**Tích cực**
- Hệ sinh thái giữ nguyên namespace và tham chiếu chéo, nên không phải refactor hay rewrite nội dung upstream.
- Có đường tự nhiên để hỗ trợ hook, MCP và `${CLAUDE_PLUGIN_ROOT}`, vì đây đều là tính năng plugin native.
- Repo chỉ chứa ý định và lock. Trạng thái runtime trên mỗi máy được tái tạo xác định bằng `ap sync`.
- Collection vẫn được lọc chính xác ở mức Component.

**Tiêu cực / chấp nhận**
- Không tách lẻ được Component từ một ecosystem. Muốn dùng thêm implementation khác thì cài song song với `allowOverlap` và gọi chủ động (D4).
- Ecosystem mang theo hook/MCP của nó. An toàn dựa vào allowlist `allowExecutables` và bước xác nhận lại khi update (D5).
- Trạng thái cài đặt nằm trong store chung của Claude Code, nên sinh rác khi xóa hoặc di chuyển project, và phải có `ap prune` (D9).
- Mỗi máy cần chạy `ap sync` và CLI `claude` phải có mặt. Adapter phụ thuộc vào hành vi CLI plugin của Claude Code, nên phải có dải phiên bản runtime được test.
- Catalog phải phân loại `ecosystem`/`collection` và khai báo `requires`, làm chi phí curate tăng.

**Tài liệu cần cập nhật theo ADR này** (bản tiếng Anh):
- `adapter-spec.md` §6–8: thay §7.1 bằng D1, D3, D7, D8, D9. Thêm các mã lỗi `ECOSYSTEM_CAPABILITY_CONFLICT`, `ECOSYSTEM_PARTIAL_EXCLUDE`, `UNRESOLVED_COMPONENT_REFERENCE`, `TARGET_PLUGIN_OVERLAP`, `EXECUTABLE_NOT_ALLOWED`, `MARKETPLACE_NAME_CONFLICT`.
- `manifest-spec.md`: thêm `allowOverlap`, `allowExecutables`, `disableGlobal`, exclude Component; thêm cấu hình global `~/.config/agent-plugins/`.
- `catalog-spec.md`: thêm `materialization: ecosystem | collection` cho Package; thêm `standalone` và `requires` cho Component.
- `resolution-spec.md`: thêm luật kích hoạt theo khối của ecosystem, xung đột cardinality có xét cấu hình global, và `allowOverlap` (D4).
- `policy-spec.md`, `security-model.md`: Policy đánh giá toàn bộ phần kích hoạt; allowlist `allowExecutables` và xác nhận lại khi update (D5); bỏ invariant `install ≠ execute`; thêm hook/MCP.
- `cli-spec.md`: output của `ap sync`/`ap diff` là marketplace + plugin, không phải tệp trong `.claude/skills`. Thêm `ap sync -g` và `ap prune`.
- `non-goals.md` §5: làm rõ snapshot/projection sinh ra trong `.agent-plugins/` của project người dùng là managed state, không phải vendor tree trong repo `agent-plugins`.
- `problem.md`: chi phí token của skill đo được là nhỏ (14 skill Superpowers ≈ 688 token always-on theo `claude plugin details`). Nỗi đau chính là workflow xung đột và cạnh tranh kích hoạt.

## Các phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Copy Component vào `.claude/skills|agents|commands/` | Mất namespace nên tham chiếu chéo của ecosystem gãy; trùng tên bị che mà không cảnh báo; hook/MCP phải merge vào `settings.json` dùng chung; mất `${CLAUDE_PLUGIN_ROOT}`. Ưu điểm (commit được, tắt được từng skill bằng `skillOverrides`) không đủ bù |
| Lai: ecosystem qua plugin, collection copy vào `.claude/skills/` và commit | Chỉ có lợi khi skill phải chạy mà không có `ap` (clone không cài tool, Claude Code web/CI). V1 luôn yêu cầu `ap sync`, nên một cơ chế duy nhất gọn hơn: một đường cài, một receipt, một cách đánh giá Policy. Xem xét lại nếu cần hỗ trợ môi trường không có `ap` |
| Tách lẻ Component của cả ecosystem thành projection | Gãy tham chiếu `superpowers:*`, hoặc buộc phải rewrite nội dung upstream |
| Cài plugin từ marketplace chính thức của upstream | Không ghim được theo lock, và không lọc được collection |
| Đăng ký marketplace ở scope project với đường dẫn tuyệt đối (hành vi mặc định của CLI) | Không chia sẻ được qua git |
