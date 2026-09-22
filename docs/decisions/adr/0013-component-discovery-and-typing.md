# ADR 0013 — Discovery theo chiến lược, Component có type thật

- **Trạng thái:** Accepted
- **Ngày:** 2026-09-22
- **Liên quan:** [ADR 0010](0010-claude-code-materialization.md) D2/D5/D6, [`catalog-spec.md`](../../03-specs/catalog-spec.md) §42, §58, §132, §145, [`policy-spec.md`](../../03-specs/policy-spec.md), [`terminology.md`](../../01-domain/terminology.md) §4, §27, §78
- **Đóng lại:** hai câu hỏi treo của [ADR 0011](0011-publisher-terminology.md) — `Component` có thành entity không (D4), và `runtimes/` vs `Target` (D6)

## Bối cảnh

Câu hỏi khởi nguồn: catalog hiện tại có dùng được một agent thật không, ví dụ `wshobson/agents` → `plugins/ui-design/agents/ui-designer.md`?

**Không.** `packages/cli/src/lib/source.js:112-132` duyệt `manifest.skills ?? []` và gán cứng `type: 'skill'`. Agent, command, hook, MCP không tồn tại về mặt cấu trúc. Hàm này còn giả định layout `<rel>/SKILL.md` — một thư mục cho mỗi component — trong khi agent là tệp phẳng `agents/<name>.md`.

Hệ quả thứ hai: sáu `componentTypes` của `policy.schema.json` là **cổng kiểm soát giả**. Chính schema thú nhận: *"source.js:129 labels every discovered component `skill`, so the agent/command/hook/mcp/lsp rules are currently unreachable."* Viết `agent: deny` không có tác dụng — và `agent: allow` cũng vậy, đó mới là chiều nguy hiểm. Fixture `tests/fixtures/base/policies/default.yaml` đang mang `agent: allow` và nó chưa bao giờ có nghĩa.

### Tiền đề của `discovery.manifest` không đúng với đa số

`package.schema.json` biện minh cho `discovery.manifest` như sau:

> *"Path to the upstream plugin manifest, read instead of globbing. Measured need: mattpocock/skills carries 38 SKILL.md but ships 25."*

Lý do đó suy ra từ một mẫu. Đo lại trên sáu hệ sinh thái tham chiếu mà `README.md` nói catalog được mô hình hoá theo:

| Hệ sinh thái | `plugin.json` liệt kê component? | Layout | Quy mô |
|---|---|---|---|
| superpowers 6.3.0 | **Không** | `skills/<name>/SKILL.md` | 14 skill |
| frontend-design | **Không** | `skills/<name>/SKILL.md` | 1 skill |
| code-simplifier 1.0.0 | **Không** | `agents/<name>.md` | 1 agent |
| security-guidance 2.0.8 | **Không** | `hooks/` | hook, không skill |
| wshobson/agents | **Không** | `agents/<name>.md` mỗi plugin | 92 plugin, 202 agent |
| mattpocock/skills 1.2.3 | **Có** — `"skills": [26]` | `skills/<nhóm>/<name>/SKILL.md` | 38 tệp, ship 25 |

**Năm trên sáu dùng quy ước thư mục. Đúng một cái liệt kê.** Quy ước là thông lệ, liệt kê là ngoại lệ — ngược hẳn với giả định đang được mã hoá thành field bắt buộc.

Và hậu quả hôm nay không phải là một lỗi rõ ràng: trỏ `discovery.manifest` vào `plugin.json` của wshobson cho ra `manifest.skills ?? []` → **Map rỗng**. `readComponents` không ném lỗi. Package resolve ra không component nào, im lặng.

## Quyết định

### D1. Discovery khai báo chiến lược tường minh, không có fallback ngầm

`Package.spec.discovery.strategy`, bắt buộc, hai giá trị:

| `strategy` | Nguồn danh sách | Field đi kèm |
|---|---|---|
| `manifest` | mảng trong plugin manifest upstream | `manifest:` (bắt buộc) |
| `convention` | quét layout plugin chuẩn của Claude Code | không |

- `manifest` giữ nguyên hành vi hôm nay, và **fail** nếu manifest không chứa mảng component nào — thay vì trả về rỗng. Đây là bug đang tồn tại, không phải hành vi cần giữ.
- `convention` quét `skills/<name>/SKILL.md`, `agents/<name>.md`, `commands/<name>.md`.
- **Không tự động fallback từ `manifest` sang `convention`.** Người curate phải chọn. Một fallback ngầm biến "đã glob hay chưa" thành trạng thái ẩn phải ghi vào lockfile để giải thích được; bắt chọn thì rẻ hơn và đọc ra ngay.
- Không có giá trị mặc định. Dù quy ước chiếm 5/6, một mặc định sai 1/6 số trường hợp sẽ sai một cách im lặng.

### D2. Component mang `type` thật

`readComponents` trả `type` theo nơi tìm thấy tệp, thay cho `'skill'` gán cứng:

```text
skills/<name>/SKILL.md   -> skill     (thư mục)
agents/<name>.md         -> agent     (tệp phẳng)
commands/<name>.md       -> command   (tệp phẳng)
```

Hai hình dạng vật lý khác nhau, nên `sourcePath` không còn luôn là thư mục. Mọi chỗ tiêu thụ nó phải phân biệt: `build.js:147-154` materialize vào `skills/<name>`, và `computeVersion` (`build.js:115`) đọc `<sourcePath>/SKILL.md` — cả hai đang giả định thư mục.

Nội dung Component vẫn giữ nguyên văn (ADR 0010 D2). Frontmatter riêng của agent (`model`, `color`) đi theo tệp, không bị viết lại.

### D3. `componentTypes` của Policy trở nên có hiệu lực

Đây là hệ quả trực tiếp của D2, không cần thêm cơ chế: `pipeline.js:21` đã tra `components.get(name).type` để quyết định allow/deny. Từ nay `agent: deny` thực sự chặn.

**Phải ghi nhận rõ trong tài liệu:** mọi Policy viết trước ADR này chưa từng chặn được gì ngoài `skill`. Ai đã dựa vào `hook: deny` hay `mcp: deny` thì cần biết rằng nó chưa bao giờ chạy.

Với `strategy: convention` không có manifest để đọc, nên cổng thực thi của `pipeline.js:27-31` — vốn tra các khoá `hooks`/`mcpServers`/`lspServers` trong manifest upstream — phải chuyển sang phát hiện **sự tồn tại của `hooks/` và `.mcp.json` trên đĩa**. Nếu bỏ qua, `security-guidance` (ship `hooks/`, không khai báo gì) sẽ lọt qua Policy.

### D4. Component **không** trở thành entity của catalog

Câu hỏi treo ở ADR 0011 dựa trên một trích dẫn sai của chính tôi. `todo.md` §10 **không** đề xuất thư mục `catalog/components/`; nó đề xuất `components` như một **index trong bộ nhớ** của đối tượng `Catalog`, trong một code fence `ts`.

Thư mục được viết tay thì bị cấm hai lần:

- `catalog-spec.md:1053` §42 — *"External Component definitions should generally not be manually duplicated as `catalog/components/*.yaml`."*
- `catalog-spec.md:3331` §145 — gọi thẳng là anti-pattern: *"Catalog Anti-Pattern — Manual Component Mirror."*

Và `source-of-truth.md` §21 chốt lại: xoá một artifact sinh ra rồi chạy lại generator phải cho ra thứ tương đương; nếu xoá mà mất thông tin curate bằng tay thì kiến trúc sai. Một `catalog/components/` viết tay vi phạm đúng luật đó.

Vậy nên:
- **Được phép:** một index `catalog.components` **dẫn xuất**, dựng lúc load, đáp ứng phần `todo.md` §10 thật sự yêu cầu.
- **Không được:** thư mục, `component.schema.json`, hay `kind: Component`.
- Dữ liệu Component duy nhất được viết tay vẫn là `Package.spec.components.<name>.requires` — một cạnh nội bộ trong một Package, vô nghĩa ngoài Package đó, nên nó nằm đúng chỗ.

### D5. Định danh Component: giữ cặp `{package, component}`, nhưng va tên phải fail

Tài liệu dùng `publisher/package#type:name` (`catalog-spec.md:372`, `domain-model.md:388`). Schema dùng slug kebab trần (`common.schema.json:34-38`), chỉ địa chỉ hoá được qua cặp `{package, component}` (`capability.schema.json`).

Giữ cặp `{package, component}` làm **định danh được viết tay**. Dạng `#type:name` là dạng *hiển thị và tham chiếu cho người*, dùng ở `ap resolve --why skill:typescript` (`cli-spec.md:664-686`, chưa ship) — không phải dạng lưu trong catalog.

Nhưng D2 sinh ra một rủi ro mới: một Package có thể có skill `tdd` **và** agent `tdd`. `readComponents` trả `Map<name, …>`, nên bản sau sẽ đè bản trước, im lặng. Theo `catalog-spec.md:1396` §58 (discovery phải fail khi trùng, không được ghi đè), discovery **fail với `DUPLICATE_COMPONENT`** khi hai type cùng tên trong một Package.

### D6. `Target` là tên chính thức; `runtimes/` không tồn tại

Câu hỏi treo còn lại của ADR 0011 cũng không phải xung đột thật. `terminology.md:1407-1421` §78 đã định nghĩa sẵn quan hệ hai tầng: *"A **Runtime** is the actual AI agent system executing or consuming the generated configuration"* … *"Within the domain model, Runtime is represented through a Target."*

`runtimes/` xuất hiện đúng ba dòng trong toàn repo: hai dòng trong `cheatsheet.md` (đã archive, nằm ngay cạnh `catalog/sources/` mà ADR 0011 đã khai tử) và một dòng trong chính mục "còn treo" của ADR 0011. Nó **chưa bao giờ tồn tại trên đĩa hay trong git history**.

Chốt: `Target` là tên entity. "Runtime" tiếp tục được dùng như từ tiếng Anh thông thường cho tiến trình agent thật, theo §78.

Ghi nhận kèm: `package.schema.json:57-63` `targets` hiện **trơ** (*"Not read in V1"*), `grep targets packages/*/src --include=*.js` không có hit nào, và `sync.js:128` gán cứng `target: 'claude-code'`.

## Còn treo, cố ý không quyết ở đây

**Một Package là một thư mục plugin, hay cả một repository?**

`wshobson/agents` là 92 plugin / 202 agent / 181 skill trong một repo. Hai cách đọc:

| | Mỗi plugin là một Package | Cả repo là một Package |
|---|---|---|
| Curate | chọn được từng `ui-design` | phải nuốt cả 202 agent |
| Schema | cần thêm `source.subpath` | không cần field mới |
| Quy mô closure | nhỏ | rất lớn, chưa đo |
| `pipeline.js:50-58` | ép một Package mỗi project → mâu thuẫn ngay | vừa khít |

Chưa đủ dữ liệu để chốt. Phép đo cần thiết: sinh projection cho một plugin của wshobson theo cả hai cách, đo số component trong closure, thời gian sync, và dung lượng marketplace. Quyết trong một ADR riêng sau khi có số.

## Hệ quả

**Tích cực**
- Agent dùng được. `code-simplifier` và `ui-designer` là component hợp lệ, không cần rewrite gì của upstream.
- Materialization không phải thay đổi về bản chất: agent là `.md` thụ động như `SKILL.md`, nên hạn chế hook/MCP của ADR 0010 D5 không áp cho nó.
- Policy hết là cổng giả.
- Package không liệt kê component không còn resolve ra rỗng một cách im lặng.
- Hai câu hỏi treo của ADR 0011 đóng lại bằng bằng chứng, không phải bằng tranh luận.

**Tiêu cực / chấp nhận**
- `discovery.strategy` là field bắt buộc mới; mọi Package đã có phải khai báo. Hôm nay mới có một Package thật.
- Hai hình dạng `sourcePath` (thư mục và tệp phẳng) làm `build.js` và `computeVersion` phức tạp hơn.
- `strategy: convention` quét cây, nên nó sẽ nhặt cả những Component upstream không có ý định ship. Đó chính là trường hợp mattpocock — và cũng chính là lý do `manifest` vẫn tồn tại thay vì bị bỏ.
- Nâng cấp lên `strategy: convention` có thể làm lộ ra hook/MCP mà Policy trước đây không thấy, khiến một sync đang xanh chuyển thành fail. Đó là fail đúng.

**Tài liệu cần cập nhật theo ADR này**
- `catalog-spec.md` §18 (Discovery), §21–22 (Package Manifest/Required Fields): thêm `strategy`.
- `policy-spec.md`: bỏ ghi chú "unreachable"; nêu rõ Policy trước ADR này chưa từng chặn ngoài `skill`.
- `terminology.md` §4: liệt kê type thực sự được hiện thực (`skill`, `agent`, `command`), phân biệt với danh sách khả dĩ.
- `adapter-spec.md`: layout quy ước mà Source Adapter quét.
- ADR 0011: cập nhật mục "Việc còn treo" — D4 và D6 đóng hai mục, và sửa trích dẫn sai `todo.md` §10.

## Các phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Đọc manifest, không có mảng thì tự glob | Việc đã glob hay chưa trở thành trạng thái ẩn, phải ghi vào lock và giải thích trong `ap explain`. Bắt khai báo rẻ hơn và đọc ra ngay |
| Luôn glob, lọc bằng `include`/`exclude` | Mất lý do gốc vẫn còn đúng: mattpocock có 38 `SKILL.md` mà chỉ ship 25. `exclude` bắt người curate liệt kê cái *không* muốn — dài hơn và dễ lỗi thời hơn |
| Thêm `type` vào `componentName` (`skill:tdd`) | Phá `propertyNames` pattern hiện có và mọi tham chiếu `requires`. Va tên là chuyện hiếm; fail khi va (D5) rẻ hơn đổi định danh |
| Ship agent nhưng để Policy sau | Chính là trạng thái hôm nay, và nó là cổng giả. Bật discovery mà không bật Policy làm tình hình tệ hơn: nhiều loại component hơn, vẫn không kiểm soát được |
