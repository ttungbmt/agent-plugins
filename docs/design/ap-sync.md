# Thiết kế `ap sync` (v1)

Thuật ngữ: xem [CONTEXT.md](../../CONTEXT.md). Quyết định kiến trúc: [ADR 0001](../adr/0001-delegate-settings-writes-to-claude-cli.md), [0002](../adr/0002-config-kind-naming.md), [0003](../adr/0003-managed-entries-per-scope-state.md), [0005](../adr/0005-ap-installs-skills-itself.md), [0006](../adr/0006-mcp-servers-inline-plus-bundled-catalog.md), [0010](../adr/0010-workflow-flat-install-by-meta-name.md).

## Phạm vi

- Đồng bộ `marketplaces` → `extraKnownMarketplaces`, `plugins` → `enabledPlugins` + Installed plugin, `skills` → Installed skill trong thư mục skills của scope, `agents` → Installed agent trong thư mục agents của scope, `workflows` → Installed workflow trong thư mục workflows của scope, và `mcpServers` → Installed MCP server trong cấu hình MCP của scope.
- Để sau: MCP Registry, cập nhật version plugin (`claude plugin update`), sinh marketplace cục bộ `.agent-plugins/marketplace`, cú pháp `github:owner/repo/path@ref` cho preset.

## Hành vi

### Đầu vào

- `agent-plugins.yaml` (`kind: Config`, schema `config.schema.json`). Thiếu file → lỗi, gợi ý `ap init`.
- `spec.presets` của Config (chọn Preset) và `spec.extends` của Preset (kế thừa, một tham chiếu hoặc list) — mỗi tham chiếu:
  - tên trần → Bundled preset trong `packages/cli/presets`, tìm theo tên file; `metadata.name` phải trùng tên file.
  - `./…`, `../…` → Local preset, tương đối với file chứa tham chiếu.
  - `https://…` → Remote preset; `sha256` nội dung ghim trong Lock, cache ở `.agent-plugins/cache/`; nội dung đổi → lỗi, `--update` để chấp nhận.
- Preset kế thừa bằng `spec.extends` (tuỳ độ sâu); Config chỉ dùng `spec.presets`. Dùng lẫn → lỗi kèm gợi ý. Phát hiện vòng lặp. Mỗi Preset chỉ nạp một lần, ở lần gặp đầu tiên; thứ tự: cha trước, con sau. Tham chiếu tương đối trong Remote preset phân giải theo URL của nó.
- `spec.marketplaces` của Config được gộp cuối.
- Shorthand declaration được đọc thành source giống cách `claude plugin marketplace add` đọc, để source `ap` ghi khớp source `claude` tự ghi:
  - `owner/repo[@ref]` → `github`.
  - `git@host:path`, `ssh://…` → `git`; URL https có đuôi `.git` hoặc host github.com/gitlab.com → `git`, thêm `.git` nếu thiếu. `#ref` → `ref`.
  - URL https khác → `url`.
  - Bắt đầu bằng `./`, `../`, `/` → stat trên đĩa theo thư mục file khai báo (như dạng map): thư mục → `directory`, file `.json` → `file`, còn lại lỗi. Đường dẫn được chuẩn hoá (`./a/../b/` → `./b`). Remote preset khai báo đường dẫn → lỗi.
  - Không khớp dạng nào → lỗi.
- Dạng map chỉ nhận `source`, `autoUpdate` và `scope`; field khác → lỗi. `scope` chỉ nhận `user` và không bao giờ được ghi vào settings (xem User-scoped marketplace).
- `path` tương đối của nguồn `directory`/`file` trong một Local preset được tính theo file Preset đó rồi quy về thư mục Config; trong Remote preset thì là lỗi.

### Luật trùng khai báo

- Preset thắng mọi Preset nằm trong cây `extends` của nó (theo đồ thị, kể cả khi Preset cha đã nạp qua nhánh khác): thay cả entry (source + field phụ), in thông báo nếu khác.
- Hai Preset ngang hàng (không Preset nào kế thừa Preset kia) cùng tên, cùng source → gộp, field phụ của Preset sau thắng; khác source hoặc khác `scope` → lỗi. Managed entry của tên đang lỗi được giữ nguyên.
- Config trùng tên (hoặc trùng source với khai báo rút gọn) với Preset → Config thắng, in thông báo nếu khác.

### Ghi settings

- `--scope project|local|user`, mặc định `project`.
- Thêm: `claude plugin marketplace add <source> --scope <scope>`; sau đó `ap` bổ sung field phụ (`autoUpdate`, `ref`…) và sửa `path` của nguồn `directory` về tương đối.
- Gỡ: `claude plugin marketplace remove <name> --scope <scope>`.
- Khai báo chia theo scope, nhưng bản cài (`~/.claude/plugins/known_marketplaces.json`) dùng chung cả máy theo tên. Đã kiểm chứng với `claude` 2.1.280:
  - `remove --scope X` chỉ gỡ khai báo ở X, giữ bản cài khi scope khác còn khai báo tên đó.
  - `add` cùng tên khác source ở scope khác thì thay bản cài, làm hỏng entry của scope kia.
  - Vì vậy trùng tên khác source với entry ở scope khác → xung đột `cross-scope`, `--force` không vượt qua. So `path` của `directory`/`file` sau khi quy về tuyệt đối.
  - Dạng rút gọn chỉ biết tên sau `add`: nếu trùng thì gỡ khai báo vừa thêm và `add` lại nguồn của scope kia để khôi phục bản cài. Khôi phục Manual entry cùng scope cũng `add` lại nguồn cũ vì lý do này.
- Giới hạn v1: nguồn `settings` và `hostPattern` chưa hỗ trợ (action báo `failed`); `ref`/`path` của github chỉ được ghi vào settings sau `add`, bản cài tại máy vẫn là bản `add` tải về.

### Sở hữu

- Chỉ động vào Managed entry (ghi trong Lock/State).
- Managed entry không còn được khai báo → gỡ.
- Managed entry bị xoá tay khỏi settings → thêm lại.
- Manual entry trùng tên, khác source hoặc khác field phụ đã khai báo → lỗi; `--force` để ghi đè (entry thành Managed).
- Manual entry khớp đúng khai báo (cùng source, field phụ đúng như khai báo; kể cả trùng source với khai báo rút gọn) → nhận quản lý: ghi vào Lock/State, không sửa settings, báo một lần. Manual entry có thêm field chưa khai báo thì để nguyên (nhận sẽ gỡ các field đó). Ở scope `user`, tên Config khác đang claim thì để luật bàn giao xử lý.
- Managed entry phải khớp đúng khai báo: field phụ bị bỏ khỏi khai báo cũng được gỡ khỏi settings.
- Dạng rút gọn chưa biết tên trước `add`: khớp theo source đã chuẩn hoá với Lock/State. Sau `add`, nếu tên trả về trùng một Manual entry khác source → khôi phục entry cũ, báo xung đột.
- Lock `agent-plugins.lock` (scope `project`, commit, YAML): Managed entry (`name`, `source`, preset khai báo) + `sha256` các Remote preset. State: `.agent-plugins/state.local.json` (`local`, gitignore), `~/.agent-plugins/state.json` (`user`, chia theo đường dẫn Config để repo khác không gỡ nhầm).
- Managed entry đã biến khỏi settings và không còn được khai báo → chỉ xoá khỏi Lock/State.
- Scope `user` dùng chung settings giữa các repo: State của mỗi Config ghi thêm các tên nó khai báo và đã khớp (claim), kể cả khi không sở hữu.
  - Managed entry không còn được khai báo nhưng Config khác vẫn claim cùng tên → không gỡ, chỉ bỏ sở hữu và giao cho các Config đang claim cùng source. Config cuối cùng bỏ khai báo sẽ gỡ.
  - Khai báo khác (source hoặc field phụ) với claim của Config khác → xung đột `shared-clash`, `--force` không vượt qua, để hai repo không ghi đè nhau mỗi lần sync.
  - Config đã không còn trên đĩa thì claim của nó bị bỏ qua.

### User-scoped marketplace

Theo [ADR 0011](../adr/0011-user-scoped-marketplace.md). Khai báo dạng map có `scope: user` luôn được sync lên Scope `user`, dù lệnh đang sync Scope nào.

- Sync `project` hoặc `local`: các khai báo này được lập kế hoạch riêng, so với settings `user`, bản ghi State của Config này và claim của các Config khác ở `user`. Sync `user`: đây là khai báo bình thường.
- State ở `user` (`~/.agent-plugins/state.json`) lưu mỗi Config theo khoá (đường dẫn Config, Scope đang sync): khoá là đường dẫn Config với lần sync `user`, và `<đường dẫn Config>#project` hoặc `#local` với lần sync khác. Hai bản ghi của cùng Config tính là claim dùng chung của nhau. Lock không ghi entry này.
- Luật sở hữu giữ nguyên như mục Sở hữu, kể cả `shared-clash`.
- Plugin dùng marketplace này vẫn nằm ở Scope đang sync; `missing-marketplace` coi marketplace này là đã khai báo. `claude` 2.1.281 cài được plugin ở `project` khi marketplace chỉ khai báo ở `user`, và chỉ ghi `enabledPlugins` vào settings của project.
- Thứ tự: thêm/sửa ở `user` → thêm/sửa ở Scope đang sync → plugin → gỡ ở Scope đang sync → gỡ ở `user`. `add` ở `user` lỗi → plugin phụ thuộc lỗi `marketplace "…" is not ready in user settings`.
- Gỡ ở `user` khi settings `user` còn Plugin entry `*@<tên>` → xung đột `manual-entry`, vì `marketplace remove` xoá luôn các entry đó; `--force` vẫn gỡ.
- Chuyển entry giữa Scope đang sync và `user` (thêm hoặc bỏ `scope: user`): thêm ở Scope mới trước, gỡ ở Scope cũ sau. Bước gỡ này `ap` tự xoá khoá trong `extraKnownMarketplaces` thay vì gọi `marketplace remove`, để giữ plugin của Scope cũ đang còn khai báo.
- `--dry-run` gắn nhãn `(user)` cho action ngoài Scope đang sync; `--check` tính lệch ở `user` là drift.

### Plugin

- Dạng chuẩn: map `name@marketplace: bool`, khớp 1:1 với `enabledPlugins`. Dạng list `name@marketplace` là viết tắt cho toàn bộ `true`.
- Gộp như `marketplaces`: Preset cha trước, con sau, `spec.plugins` của Config gộp cuối; trùng khoá → giá trị sau thắng, nên `false` tắt được plugin Preset cha đã bật.
- Hậu tố `@marketplace` phải là tên một marketplace được khai báo trong chuỗi gộp: dạng map, hoặc dạng rút gọn đã biết tên (tra theo source trong Lock/State, rồi settings). Không khớp → xung đột `missing-marketplace`, kể cả khi máy đã có marketplace đó. Plugin đang lỗi được giữ nguyên như mọi xung đột khác (không `uninstall`), và marketplace mà plugin còn khai báo `@<tên>` không bị gỡ, kể cả ở `user`. Muốn gỡ thì bỏ cả marketplace lẫn các plugin của nó khỏi khai báo.
  - Còn khai báo rút gọn chưa biết tên (máy mới, chưa `add`) → plugin không khớp tên nào vẫn được lập kế hoạch, kèm thông báo; sau khi `add` xong mà vẫn không khớp → action `failed` + xung đột `missing-marketplace`. `--dry-run` trên máy mới vì vậy không bắt được hậu tố sai; dạng map thì bắt được ngay.
- Trạng thái thực tế: Plugin entry đọc thẳng từ `enabledPlugins` của settings từng scope; Installed plugin đọc từ `<claude config dir>/plugins/installed_plugins.json` (theo scope, và `projectPath` với `project`/`local`). `claude plugin list --json` không dùng được vì `enabled` là giá trị đã gộp mọi scope và không liệt kê plugin chưa cài. `--dry-run`/`--check` vì vậy vẫn không cần `claude`.
- Ghi (đã kiểm chứng với `claude` 2.1.280):
  - `true`, chưa có Installed plugin → `claude plugin install <id> --scope <scope>` (cài và ghi `true`). Chạy khi plugin đang `false` sẽ cài lại từ đầu, nên:
  - `true`, đã có Installed plugin → `claude plugin enable <id> --scope <scope>`; `already_in_goal_state` coi là thành công.
  - `false` → `ap` tự ghi `false`, giữ Installed plugin nếu có. `claude plugin disable` không tạo được `false` khi scope chưa có khoá.
  - Bỏ khai báo, có Installed plugin → `claude plugin uninstall <id> --scope <scope>` (xoá khoá và Installed plugin của scope đó, không đụng scope khác; không `--prune`). Không có Installed plugin → `ap` tự xoá khoá (`unset`), vì `uninstall` báo `not_installed_at_scope` và để lại khoá.
  - Plugin cần `-y`/`--accept-command`/`userConfig` → action `failed`, kèm lệnh gợi ý để người dùng tự chạy; `ap` không tự chấp nhận lệnh do marketplace khai báo.
- Khai báo `true` mà thiếu Installed plugin ở scope đó (vd. đồng đội vừa clone repo) là lệch → `install`, kể cả với Manual entry (việc cài không sửa khoá).
- Sở hữu theo từng khoá, như marketplace (ADR 0003):
  - Managed entry khác khai báo → sửa; không còn được khai báo → gỡ; Config khác ở scope `user` còn claim → chỉ bỏ sở hữu.
  - Manual entry khớp khai báo → nhận quản lý (báo một lần; chưa có Installed plugin thì vẫn `install`). Khác giá trị → xung đột `manual-entry`, `--force` để ghi đè (entry thành Managed).
  - Khai báo khác claim của Config khác ở scope `user` → `shared-clash`.
- Thứ tự apply: thêm marketplace → action plugin → gỡ marketplace. Marketplace của plugin đang xung đột hoặc vừa `add` lỗi → action plugin `failed`, Managed plugin entry của nó được giữ nguyên.
- `claude plugin marketplace remove X --scope S` xoá mọi khoá `*@X` ở S và gỡ Installed plugin của chúng. Còn Manual plugin entry `*@X` → không gỡ X, xung đột `manual-entry`; `--force` để gỡ.

### Skill

- Khai báo: `spec.skills` là list. Chuỗi là một Skill source (cài mọi Skill trong đó); map `{ source, skills: [names] }` chọn một số Skill; map `{ source, exclude: [names] }` cài mọi Skill trừ các tên đó. Không được có cả `skills` lẫn `exclude`; cả hai đều cần ít nhất một tên. Map có thể kèm `path`: thư mục trong nguồn chứa các Skill (vd. `claude/skills`), phải là đường dẫn tương đối không ra khỏi nguồn; map chỉ có `source` + `path` cài mọi Skill dưới đó. Với nguồn `github`/`git`, `path` được lưu trong source nên là một phần định danh (Lock/State, Source catalog, gộp khai báo): cùng repo khác `path` là hai nguồn; với nguồn `directory` thì `path` được gộp vào đường dẫn của nó. Nguồn đọc bằng parser của Shorthand declaration nhưng chỉ nhận `github` (`owner/repo[@ref]`), `git` (`#ref`) và `directory`; URL tới file hay file `.json` → lỗi.
- Gộp theo nguồn đã bỏ `ref`, cùng luật với marketplace: Preset con/Config thay cả khai báo của nguồn đó (nên thu hẹp được danh sách Skill kế thừa); Preset ngang hàng lấy hợp tập Skill: chọn ∪ chọn = hợp các tên, trừ E ∪ chọn S = trừ (E∖S), trừ E1 ∪ trừ E2 = trừ (E1∩E2), chuỗi trần (mọi Skill) nuốt mọi thứ; khác `ref` → `preset-clash`.
- Tìm Skill trong nguồn đã tải (hoặc trong `path` của nó), dừng ở chỗ đầu tiên có: `SKILL.md` ở gốc → `skills/*/SKILL.md` → `*/SKILL.md` (bỏ thư mục `.`). Tên = `name` trong frontmatter, thiếu thì tên thư mục (tên repo, hoặc tên thư mục `path`, với Skill ở gốc). Frontmatter không phải YAML hợp lệ (Claude Code vẫn nạp) thì đọc dòng `name:`, không làm hỏng cả nguồn. Chọn tên không có → `missing-skill`; loại trừ tên không có chỉ in thông báo. Mọi Skill và loại trừ đều tính theo commit đang ghim, nên Skill mới của nguồn chỉ được cài khi `--update`. Hai nguồn cho ra cùng một tên → phân xử như trùng khai báo (con/Config thắng, ngang hàng → `preset-clash`).
- Cài (ADR 0005): `ap` tự tải bằng `git` — `clone --depth 1 [--branch ref]`, hoặc `init` + `fetch --depth 1 <commit>` + `checkout` khi đã ghim — vào thư mục tạm, rồi **copy** (bỏ `.git`) vào `.claude/skills/<name>` (scope `project`) hoặc `<claude config dir>/skills/<name>` (scope `user`). Nguồn `directory` copy thẳng. Scope `local` không có thư mục skills → bỏ qua, in thông báo.
- Lock/State ghi mỗi Managed skill (`name`, `source`, `sha256` nội dung thư mục, `origin`) và, dưới `skillSources`, Source catalog của mỗi nguồn `github`/`git` đã tải: `source`, `commit`, tên mọi Skill ở commit đó (kể cả Skill không cài). Sync cài đúng `commit` đã ghim; `--update` lấy commit mới nhất. Mục bị xoá khi nguồn không còn được khai báo, giữ nguyên khi nguồn đang xung đột hay tải lỗi. Lock/State cũ có `commit` trên từng Skill: đọc để biết commit đã ghim, lần apply đầu tải lại một lần rồi ghi theo định dạng mới.
- Tải khi cần: apply chỉ tải nguồn khi (1) nguồn chưa có Source catalog hoặc đổi `ref`, (2) `--update`, (3) có Skill cần cài chưa có trên đĩa, (4) có thư mục cài tay trùng tên Skill cần cài (phải so nội dung), (5) `--force` ghi đè Skill bị sửa tay. Còn lại Skill lấy từ Lock/State và không in action `fetch`. Nguồn `directory` luôn được đọc lại. Không có cache bản tải.
- `ap` không đụng `.gitignore` và `skillOverrides`; khuyến nghị commit `.claude/skills/` để đồng đội clone là có, CI dùng `--check`.
- Sở hữu:
  - Chưa có trên đĩa → `install`, kể cả Managed skill bị xoá tay (vd. đồng đội vừa clone mà `.claude/skills/` bị gitignore).
  - Managed skill, nội dung trên đĩa khác `sha256` trong Lock (bị sửa tay) → `modified-skill`, cả khi cần cập nhật lẫn khi cần gỡ; `--force` để ghi đè/gỡ.
  - Managed skill khác nội dung nguồn (sau `--update`, đổi `ref`) → `update`. Không còn được khai báo → gỡ thư mục.
  - Thư mục có sẵn không có trong Lock/State, hoặc là symlink (vd. do `npx skills` tạo), là Manual entry: cùng nội dung → thư mục thường thì nhận quản lý (báo một lần), symlink thì để nguyên; khác → `manual-entry`, `--force` để thay (thành Managed; symlink chỉ bị gỡ link). Managed skill bị thay bằng symlink → chỉ bỏ khỏi Lock/State.
  - Nguồn tải lỗi → action `fetch` `failed`; Managed skill của nguồn đó được giữ nguyên.
  - Scope `user`: claim theo tên + nguồn như marketplace; Config khác claim cùng tên, cùng nguồn → coi như đã khớp; khác nguồn → `shared-clash`. Config cuối cùng bỏ khai báo mới gỡ thư mục.
- `--dry-run`/`--check` không tải gì: Skill được tính từ Source catalog (nên thấy cả Skill chưa từng cài khi chuyển sang "tất cả"); nguồn chưa có Source catalog thì từ các Managed skill (chuỗi trần, hoặc bỏ đi các tên bị loại trừ) hoặc từ danh sách chọn. Nguồn chưa có trong Lock/State và không có danh sách chọn → `install` với `name: null`. Thư mục có sẵn chưa được quản lý thì chỉ in thông báo, vì chưa biết nội dung nguồn để so.

### Agent

Cùng khuôn với Skill (ADR 0005 áp dụng nguyên cho Agent); dưới đây chỉ ghi chỗ khác.

- Khai báo: `spec.agents` là list, cùng dạng với `spec.skills` — chuỗi là một Agent source (cài mọi Agent), map `{ source, agents: [names] }` chọn, `{ source, exclude: [names] }` loại trừ, kèm `path` tuỳ chọn. Cùng parser nguồn, cùng luật gộp và luật trùng tên. Dạng cũ `plugin/agent` bị bỏ: agent trong plugin được bật cùng plugin qua `spec.plugins`.
- Tìm Agent trong nguồn đã tải (hoặc trong `path`), không đệ quy, dừng ở chỗ đầu tiên có: `agents/*.md` → `.claude/agents/*.md` → `*.md` ở gốc. Chỉ file có frontmatter chứa `name` mới là Agent (loại `README.md`, `CLAUDE.md`…); tên = `name`. Riêng khi `path` được khai báo, hoặc nguồn là thư mục cục bộ (người dùng đã chỉ đúng thư mục), file thiếu `name` vẫn là Agent, tên lấy từ tên file. Frontmatter không phải YAML hợp lệ thì đọc dòng `name:` như Skill.
- Cài: copy đúng một file vào `.claude/agents/<name>.md` (scope `project`) hoặc `<claude config dir>/agents/<name>.md` (scope `user`), đặt tên theo `name` chứ không theo tên file gốc. Không kéo theo file nào khác Agent nhắc tới. Scope `local` → bỏ qua, in thông báo.
- Lock/State ghi mỗi Managed agent (`name`, `source`, `sha256` nội dung file, `origin`) và Source catalog dưới `agentSources`, ghim commit riêng với `skillSources` kể cả khi cùng repo. Trong một lần apply, nguồn skill và nguồn agent cùng source + commit chỉ tải một lần.
- Sở hữu, tải khi cần, `--dry-run`/`--check`: như Skill, với `sha256` tính trên file. Xung đột: `missing-agent` (chọn tên không có), `modified-agent` (Managed agent bị sửa tay). File có sẵn không có trong Lock/State hoặc là symlink → Manual entry.
- Thứ tự apply: Skill và Agent độc lập nhau, chạy sau marketplace/plugin.

### Workflow

Cùng khuôn với Agent; quyết định riêng: [ADR 0010](../adr/0010-workflow-flat-install-by-meta-name.md). Dưới đây chỉ ghi chỗ khác.

- Khai báo: `spec.workflows` là list, cùng dạng với `spec.agents` — chuỗi là một Workflow source (cài mọi Workflow), map `{ source, workflows: [names] }` chọn, `{ source, exclude: [names] }` loại trừ, kèm `path` tuỳ chọn. Tên là `meta.name`. Không có `as`.
- Tìm Workflow: gốc là `path`, không thì `workflows/`; thiếu cả hai → nguồn lỗi, gợi ý khai báo `path` (không dò `.claude/workflows/`, nơi repo nguồn để workflow của chính nó). Nguồn `directory` dùng `workflows/` của nó nếu có, không thì chính nó. Chỉ `*.js` ngay trong gốc (Claude Code không tìm trong thư mục con), bỏ `*.test.*` và `_*`. File là Workflow khi `export const meta` là object literal (không spread, không khoá tính toán) với `name` là chuỗi khớp tên item; đọc bằng `acorn`, parse lỗi thì không phải Workflow. Hai file trong một nguồn cùng `meta.name` → nguồn lỗi.
- Workflow gắn với plugin (có `agentType: '<plugin>:<agent>'` literal) vẫn nằm trong Source catalog, ghi thêm dưới `blocked`, nhưng không bao giờ được cài: chọn đích danh → `plugin-workflow`; trong "tất cả" → bỏ qua kèm thông báo.
- Cài: copy đúng một file thành `.claude/workflows/<meta.name>.js` (scope `project`) hoặc `<claude config dir>/workflows/<meta.name>.js` (scope `user`), cài phẳng, không Namespace. Scope `local` → bỏ qua, in thông báo. Không bao giờ ghi `Workflow(<name>)` vào `permissions`.
- Installed workflow: mọi `*.js` ngay trong thư mục có `meta` hợp lệ, định danh bằng `meta.name` chứ không theo tên file. Nhiều file cùng tên gộp thành một Bản cài (ưu tiên `<name>.js`) và được thông báo, vì Claude Code chỉ chạy một. File cài tay khác tên nhưng cùng `meta.name` + nội dung → nhận quản lý, giữ tên file tới lần ghi tiếp theo; `install`/`remove` luôn tác động đúng file đó.
- Lock/State: `workflows`, `workflowSources` (có `blocked` khi cần), `workflowClaims`. Xung đột: `missing-workflow`, `modified-workflow`, `plugin-workflow`.
- Thông báo sau khi lập kế hoạch: `agentType` không tiền tố hoặc `workflow('<tên>')` literal không có trong khai báo, trong Installed workflow ở scope `project`/`user`, hay trong agent có sẵn của Claude Code → cảnh báo, không tự cài. Có Workflow được khai báo mà workflow đang bị tắt (`CLAUDE_CODE_DISABLE_WORKFLOWS`, hoặc `disableWorkflows: true`/`enableWorkflows: false` ở file settings ưu tiên cao nhất đặt khoá đó) → cảnh báo, vẫn cài.
- Thứ tự apply: độc lập với Skill/Agent/Rule, sau marketplace/plugin.

### MCP server

Quyết định: [ADR 0006](../adr/0006-mcp-servers-inline-plus-bundled-catalog.md).

- Khai báo: `spec.mcpServers` là map theo tên. `true` → lấy nguyên cấu hình trong MCP catalog (`packages/cli/presets/mcp-servers.yaml`, `kind: McpCatalog`, schema `mcp-catalog.schema.json`), kể cả khi Preset cha đã định nghĩa inline cùng tên; tên không có trong danh mục → lỗi. Mỗi mục trong danh mục có `description` bắt buộc (chỉ để đọc), `ap` bỏ field này trước khi ghi. Map → cấu hình inline đúng định dạng `.mcp.json`: stdio (`command`, `args`, `env`) hoặc `type: http|sse` (`url`, `headers`, `headersHelper`, `oauth`). `false` → bỏ MCP server kế thừa.
- Chuẩn hoá trước khi so và ghi: bỏ `type: stdio` và `args`/`env`/`headers` rỗng.
- Kiểm tra lúc phân giải (lỗi cấu hình; danh mục không đọc được hoặc YAML hỏng cũng là lỗi, chỉ thiếu file mới coi như rỗng): thiếu `command`/`url`, `type` lạ, hoặc khoá trong `env`/`headers` giống secret (`key`, `token`, `secret`, `password`, `auth`, `credential`) mà giá trị không chứa `${`. Biến `${VAR}` (không có `:-default`) chưa đặt trong môi trường lúc sync → thông báo.
- Gộp theo tên (ADR 0004): Preset con/Config thay cả cấu hình; Preset ngang hàng phải giống hệt nhau sau chuẩn hoá (kể cả `false`), khác → `preset-clash`, Bản cài của tên đó được giữ nguyên. Tên MCP server là không gian tên riêng: xung đột của nó không chặn marketplace/plugin/Skill/Agent cùng tên, và ngược lại. Đường dẫn trong `command`/`args` ghi nguyên văn, Claude Code hiểu theo gốc project.
- Trạng thái thực tế: đọc thẳng `.mcp.json` (`project`), `projects[<cwd>].mcpServers` (`local`) và `mcpServers` (`user`) của `.claude.json` — nằm trong `CLAUDE_CONFIG_DIR` nếu có, không thì ở home. `claude mcp get/list` không có output JSON nên không dùng.
- Ghi: `claude mcp add-json <name> <json> --scope <scope>`; sửa = `claude mcp remove` rồi `add-json` (`add-json` lỗi khi tên đã có); gỡ = `claude mcp remove <name> --scope <scope>`. `add-json` lưu `${VAR}` nguyên văn, nên Lock/State chỉ chứa placeholder.
- Sở hữu như plugin (ADR 0003): Lock/State ghi `mcpServers` (`name`, `server` đã chuẩn hoá, `origin`); Manual entry khác cấu hình → `manual-entry`, `--force` để ghi đè; khớp → nhận quản lý; Managed entry bị sửa tay → ghi lại; không còn khai báo → gỡ. Scope `user`: claim `mcpClaims`, khác cấu hình với claim của Config khác → `shared-clash`, Config cuối cùng bỏ khai báo mới gỡ; chỉ bàn giao cho Config claim đúng cấu hình đó, claim khác cấu hình thì vẫn gỡ (Config kia sẽ thêm lại bản của nó).
- Sau các bước ghi (và ở `--dry-run`/`--check`, theo trạng thái hiện có):
  - Tên trùng với MCP server của một plugin đang bật và đã cài ở scope đó (đọc `.mcp.json` ở gốc Installed plugin và `mcpServers` của `.claude-plugin/plugin.json` — map, hoặc đường dẫn tới file cùng dạng) → thông báo, không chặn. Plugin chưa cài thì bỏ qua.
  - Scope `project`: server đã khai báo mà người dùng chưa duyệt hay từ chối (`enabledMcpjsonServers`/`disabledMcpjsonServers` trong `.claude.json` theo repo hoặc trong settings, `enableAllProjectMcpServers`) → thông báo chờ duyệt; server `add-json` lỗi thì không tính. `ap` không duyệt thay.
- Thứ tự apply: sau Skill và Agent.

### Chế độ và lỗi

- `--dry-run`: in kế hoạch, exit ≠ 0 chỉ khi có xung đột. `--check`: exit ≠ 0 nếu lệch. Cả hai không cần CLI `claude` hay `git`, không cần mạng cho skill, và không ghi gì xuống đĩa (kể cả cache).
- Lock chỉ được tạo khi có nội dung.
- Apply: chạy hết, báo lỗi tổng hợp, exit ≠ 0 nếu có lỗi. Lock/State chỉ ghi entry thành công.

## Module

| Phụ thuộc | Loại | Test |
|---|---|---|
| phân giải, diff, luật sở hữu | in-process | gọi thẳng |
| YAML, settings, Lock/State | filesystem cục bộ | thư mục tạm |
| CLI `claude` | external | port `exec` + fake |
| tải Remote preset | external | port `fetch` + fake |
| tải Skill source/Agent source (`git`) | external | port `fetchSkillSource` + fake; `createGitFetcher` test với repo git cục bộ |

### Interface ngoài

```ts
// packages/cli/src/sync/index.ts
export type Scope = 'project' | 'local' | 'user'
export type SyncMode = 'apply' | 'dry-run' | 'check'

export function sync(
  opts: { cwd: string; scope: Scope; mode: SyncMode; force?: boolean; update?: boolean },
  deps: { exec: Exec; fetch: Fetch; homedir: string; defaultPresetsDir: string; fetchSkillSource?: FetchSkillSource; env?: Record<string, string | undefined> },
): Promise<SyncReport>

export type SyncReport = {
  actions: Array<{
    target: 'marketplace' | 'plugin' | 'skill' | 'agent' | 'mcp'
    kind: 'add' | 'remove' | 'readd' | 'patch' | 'install' | 'enable' | 'disable' | 'uninstall' | 'unset' | 'update' | 'fetch'
    name: string | null // id `name@marketplace` với plugin, tên Skill/Agent/MCP server với skill/agent/mcp
    source: MarketplaceSource | null // null với remove
    status: 'planned' | 'done' | 'failed'
    error?: string
  }>
  conflicts: Array<{ name: string; reason: 'manual-entry' | 'preset-clash' | 'shared-clash' | 'cross-scope' | 'missing-marketplace' | 'missing-skill' | 'modified-skill' | 'missing-agent' | 'modified-agent'; detail: string }>
  notices: string[]
  inSync: boolean
}
```

Lệnh oclif `ap sync` là adapter mỏng: parse flag → `sync()` với `exec`/`fetch` thật → in báo cáo → exit code (≠ 0 khi có `failed`, có `conflicts`, hoặc `check` mà `!inSync`).

Bề mặt test chính: `sync()` trên thư mục tạm, `exec` giả mô phỏng `claude` bằng cách ghi `settings.json`.

### Seam nội bộ

```ts
resolveConfig(configPath: string, ctx: { fetch; pins; update; cacheDir; writeCache?; defaultPresetsDir })
  : Promise<{ declarations: MarketplaceDeclaration[]; pins: PresetPins; conflicts: Conflict[]; notices: string[] }>

planSync(desired: MarketplaceDeclaration[], actual: KnownEntry[], managed: ManagedEntry[], opts: { force: boolean; blocked?: string[] })
  : { actions: PlannedAction[]; conflicts: Conflict[]; forgotten: string[] }

createRegistry({ exec, cwd, homedir }): {
  list(scope: Scope): Promise<KnownEntry[]>
  put(decl, scope, { mayReplace }): Promise<{ name: string }> // add + patch; khôi phục + ConflictError khi đè Manual entry
  patch(decl, name: string, scope: Scope): Promise<void>
  remove(name: string, scope: Scope): Promise<void>
}
```

// Skill và Agent dùng chung luồng; khác nhau ở ItemHandler (SKILLS, AGENTS): thư mục theo Scope, cách tìm trong nguồn, cài/gỡ.
collectItems(handler: ItemHandler, declarations: ItemDeclaration[], managed: ManagedItem[], opts: { catalogs: SourceCatalog[]; installed; fetch: FetchSkillSource | null; update; force; blocked })
  : Promise<{ desired: DesiredItem[]; held: Set<string>; conflicts; notices; unknown; failures; fetched; catalogs }> // fetch null ở dry-run/check

planItems(kind: 'skill' | 'agent', desired: DesiredItem[], installed: InstalledItem[], managed: ManagedItem[], opts: { force; held?; shared? })
  : { actions: PlannedItemAction[]; conflicts: Conflict[]; notices: string[]; forgotten: string[] }

planMcp(desired: McpDeclaration[], actual: Record<string, McpConfig>, managed: ManagedMcp[], opts: { force; held?; shared? })
  : { actions: PlannedMcpAction[]; conflicts: Conflict[]; adopted: McpDeclaration[]; forgotten: string[] }
```

Đọc/ghi Lock/State là hàm nội bộ của `sync`, không tách module (chỉ một bên gọi).
