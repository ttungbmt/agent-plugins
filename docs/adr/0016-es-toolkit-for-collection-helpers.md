# Dùng es-toolkit cho helper mảng, object và predicate

`packages/cli` dùng es-toolkit thay cho các đoạn helper viết tay mà es-toolkit có hàm tương đương **giữ nguyên hành
vi**. Research: [es-toolkit.md](../research/es-toolkit.md). Nó đếm được 94 chỗ đáng xét, trong đó 73 chỗ tương đương
và 21 chỗ đổi hành vi.

Mục đích là code dễ đọc hơn và ít helper viết tay hơn, **không phải hiệu năng**. Ở cỡ dữ liệu của `ap` (vài chục phần
tử), mỗi lời gọi tốn dưới 2,2 µs ở cả hai phía, trong khi một lần spawn `git` tốn khoảng 2,2 ms. Con số "2–3×" của
es-toolkit là so với lodash, không phải so với code viết tay. Đừng mở lại quyết định này vì lý do hiệu năng.

es-toolkit được bundle như zod, nên nằm ở `devDependencies` ([ADR 0008](0008-distribute-ap-via-github-release-tarball.md),
[ADR 0015](0015-zod-mini-for-spec-shape.md)). Phần thay thế tương đương làm `dist/ap.js` tăng khoảng +3,5 KB (+0,25%).

## Quy ước

Khi cả built-in lẫn es-toolkit đều làm được, chọn theo thứ tự:

1. **Mảng → es-toolkit** (`difference`, `uniq`, `union`, `partition`, `omit`, `pickBy`, …). Không đổi mảng sang `Set`
   chỉ để gọi method.
2. **Dữ liệu đã là `Set` → method của `Set`** (`difference`, `union`, `isSubsetOf`, …). Lọc một mảng theo một `Set` có
   sẵn thì giữ `filter((x) => !set.has(x))`.
3. **Nhóm theo key → luôn dùng `Map.groupBy`.** `groupBy` của es-toolkit và `Object.groupBy` đều trả object, nên key
   dạng số (`"7"`) bị đẩy lên đầu và key `__proto__` làm hỏng kết quả. Tên MCP server và tên item do người dùng đặt,
   nên không loại trừ được hai trường hợp này.
4. **So sánh sâu → `isDeepStrictEqual`** của `node:util`.

`lib` của TypeScript được nâng lên `ES2025` để dùng `Map.groupBy` và các method mới của `Set`. Node 22 đã chạy được
chúng. Đổi `lib` không ảnh hưởng bundle, vì esbuild có `target: node22` riêng.

**Cấm dùng**, và có test quét import trong `src/` để giữ luật này:

| Hàm | Lý do |
|---|---|
| `isEqual` | Coi `-0` bằng `0`, bỏ qua prototype và mảng thưa; kéo theo +7 KB code của `compat` |
| `compact` | Trùng tên với helper của repo (bỏ field rỗng khỏi object), nhưng lại bỏ phần tử falsy khỏi mảng |
| `groupBy` | Đảo thứ tự key dạng số (xem quy ước 3) |
| `sortBy`, `orderBy` | So sánh theo code unit. Thứ tự chuỗi trong repo đi qua `localeCompare(…, 'en')` |
| `kebabCase` | Giữ chữ Unicode và tách `v2` thành `v-2`, nên tên sinh ra sai `NAME_PATTERN` |
| `memoize` | Chỉ truyền tham số đầu tiên cho `fn` và `getCacheKey` |
| `mapAsync`, `filterAsync`, `forEachAsync`, `reduceAsync`, `flatMapAsync` | Đổi vòng `for … await` tuần tự thành `Promise.all` song song |
| `es-toolkit/server` | `exec` reject khi gặp ENOENT thay vì trả exit code 127; `colors` bỏ qua TTY và `NO_COLOR` |
| `es-toolkit/compat` | API kiểu lodash, và changelog ghi rõ kết quả có thể đổi khi lên bản minor |

**Kiểu dữ liệu:** không thay chỗ nào nếu phải thêm cast hoặc làm lọt `any`. Ví dụ `omit` trên kiểu có index signature
(`MarketplaceSource`) làm mất field `source`. `isPlainObject` thu hẹp về `Record<PropertyKey, any>`, nên chỉ được dùng
qua type guard `isRecord` của repo, trả về `Record<string, unknown>`.

## Hai thay đổi hành vi đi kèm

Hai chỗ research phát hiện là lỗi có sẵn, không liên quan tới es-toolkit. Mỗi chỗ được sửa bằng một commit riêng:

- **`ap init` suy tên từ thư mục.** Tên được bỏ dấu bằng `deburr`, sau đó đi qua `kebabCase` viết tay, rồi được kiểm
  tra lại `NAME_PATTERN`. Kết quả: `Dự Án` → `du-an` (trước đây là `d-n`). `x😀y` → `x-y`; `日本語` → lỗi, gợi ý `--name`.
  Trước đây tên suy ra không được kiểm tra lại.
- **Thứ tự workflow** trong `findWorkflows` và `listInstalledWorkflows` chuyển từ `localeCompare(b)` sang
  `localeCompare(b, 'en')`. Trước đây thứ tự phụ thuộc locale của máy, kể cả với tên
  toàn ASCII mà `ITEM_NAME` cho phép: `da_DK` xếp `aa` sau `z`, `tr_TR` xếp `I` trước `i`. Vì vậy hai người trong nhóm có thể ghi ra `workflowSources` khác nhau trong Lock, và chọn khác nhau
  Installed workflow khi có hai file trùng tên chỉ khác hoa thường.

**Migration:** người dùng có locale không phải tiếng Anh sẽ thấy Lock đổi thứ tự `workflowSources` một lần ở lần Sync
đầu tiên sau bản này. Installed workflow chỉ đổi nếu có file trùng tên chỉ khác hoa thường.

## Considered Options

- **Không dùng es-toolkit, chỉ nâng `lib`** — bị loại. Built-in thay được phần tập hợp và nhóm, nhưng không có gì thay
  `omit`/`pickBy`/`omitBy` (16 chỗ), `partition`, `trimEnd`, `isNotNil` hay `isSubset`.
- **Chỉ dùng một allowlist nhỏ** — bị loại để ưu tiên thay hết các chỗ tương đương. Rủi ro của cách này nằm ở danh
  sách cấm và ở test khoá hành vi, không nằm ở số chỗ thay.
- **`kebabCase` của es-toolkit cho `ap init`** — bị loại. Xem bảng cấm.
- **`sortBy` / so sánh theo code unit cho workflow** — bị loại. Thứ tự sẽ cố định trên mọi máy, nhưng Lock của gần
  như mọi người dùng hiện tại sẽ đổi. `localeCompare(…, 'en')` cũng cố định mà giữ thứ tự gần với hiện tại nhất.
- **`es-toolkit/server` (`exec`, `colors`)** — bị loại. Xem bảng cấm.

## Consequences

- Trước mọi commit refactor, phải có test khoá các hành vi mà research cho thấy test hiện có không bắt được:
  - thứ tự tên dạng số trong `mergeMcpServers` và `collectItems`;
  - thứ tự workflow;
  - tên suy ra trong `init`;
  - message lỗi của `spec: [a]`;
  - manifest plugin có `mcpServers` là mảng.
- `compact` trong `store.ts` biến mất (thay bằng `pickBy`), nên không còn tên trùng.
- `isRecord` là guard duy nhất cho "plain object". Hai chỗ đang coi mảng là object (`registry.ts:250`,
  `spec.ts:315`) được giữ nguyên, vì đổi chúng là đổi output.
- Thêm một dependency còn ở bản 1.x; changelog từng sửa kiểu dữ liệu ngay trong bản minor. Lockfile giữ phiên bản cố
  định, và typecheck bắt được thay đổi kiểu khi nâng cấp.
