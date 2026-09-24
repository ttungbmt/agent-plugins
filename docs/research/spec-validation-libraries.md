# Research: thư viện runtime validation thay cho parser `spec.*`

Kiểm tra ngày 2026-09-24. Phiên bản (lấy từ npm registry, `npm view <pkg> version`): **valibot 1.5.0**,
**@valibot/to-json-schema 1.8.0**, **zod 4.6.5** (gồm `zod/mini`), **arktype 2.2.3** (`@ark/schema` 0.56.2),
**typebox 1.3.34** (package mới `typebox`, không phải `@sinclair/typebox` 0.34.52), **effect 3.22.2** (dist-tag `latest`;
v4 mới ở `beta` 4.0.0-beta.107 / `rc` 4.0.0-rc.117), **ajv 8.20.0**, **@standard-schema/spec 1.1.0**. Nguồn: docs chính
thức của từng thư viện (bản Markdown/MDX trong repo GitHub của chúng), source trong tarball npm đã giải nén, và spec
Standard Schema / Standard JSON Schema. Các con số kích thước và mọi hành vi đánh dấu **(probe)** là do chạy thử trong
thư mục scratch với đúng esbuild **0.28.2** của repo, Node v24.20.0; lệnh ở mục [Cách đo](#cách-đo-probe).

Bối cảnh trong repo: parser là `packages/cli/src/sync/spec.ts` (`readDeclarations`, `presetRefs`), contract test là
`spec-schema.test.ts`, lý do bác bỏ zod/typebox/ajv trước đây nằm ở `.scratch/spec-schema-contract/spec.md` (mục
"Options considered"), và ràng buộc đóng gói là [ADR 0008](../adr/0008-distribute-ap-via-github-release-tarball.md).

## Tóm tắt

- **Không thư viện nào xoá được nửa semantic của parser.** `parseShorthand` (stat filesystem), tra MCP catalog cho
  `true`, `scope: user` với Skill source dạng directory, `path` phải nằm trong source, và luật relative-path cho
  User-scoped MCP server đều phải viết lại thành refinement/transform của thư viện; chúng không biến mất. arktype và
  TypeBox còn không chạy được bước async: "Is there a way to create an async morph? Other than handling it as a promise
  on the output object, no." ([arktype FAQ](https://github.com/arktypeio/arktype/blob/HEAD/ark/docs/content/docs/faq.mdx));
  `Type.Refine` của TypeBox chỉ nhận `(value) => boolean` (`typebox@1.3.34/build/type/types/_refine.d.mts`). Lý do bác
  bỏ số 1 vẫn đúng.
- **Lý do "mất error message có tiền tố origin" không còn đúng.** Cả năm thư viện đều tái tạo được đúng từng chữ
  `demo.yaml: plugin "a@acme" has unknown field "pin"` và bốn message khác của `readPluginValue` **(probe)**. Nhưng
  message mặc định của thư viện nào cũng tệ hơn hiện tại, nên phải viết message riêng cho gần như mọi node và một
  formatter ghép `<origin>: plugin "<id>"` từ issue path. zod thuận tiện nhất: error map truyền theo từng lần parse
  (per-parse) thấy được path đầy đủ ([zod error-customization](https://zod.dev/error-customization), probe). valibot tính
  message *trước khi* parent gắn path (`_addIssue` trong `valibot@1.5.0/dist/index.mjs`), nên phần tiền tố phải ghép
  sau khi parse xong.
- **Lý do "thêm runtime dependency vào Release tarball" chỉ còn đúng như một chi phí dung lượng, và mức chi phí rất khác
  nhau giữa các thư viện.** ADR 0008 bundle mọi thứ, nên thư viện không thành `dependencies`; nó thành số byte trong
  `dist/ap.js`. Bundle hiện tại (không minify, đúng như `pack-release.mjs`) là 1 343 021 byte. Lát cắt `plugins` thêm
  vào: valibot ~17 KB, zod/mini ~45 KB, zod ~184 KB, arktype ~302 KB, TypeBox ~387 KB, effect ~898 KB **(probe)**.
  Với valibot và zod/mini, lý do này không còn đứng vững. Với zod classic thì chỉ còn một phần, còn với arktype,
  TypeBox và effect thì vẫn đúng.
- **Sinh JSON Schema giữ được `description`/`examples`/`title`, nhưng không giữ được hình dạng của schema viết tay.**
  zod và valibot (target `draft-2020-12`) giữ `title`, `description`, `examples` khi gắn qua `.meta()` hoặc action
  `metadata`. Nhưng union ra `anyOf` chứ không phải `oneOf` có `title` (zod có `z.xor()` ra `oneOf`). Refinement bị bỏ
  âm thầm ở zod, còn valibot, arktype thì throw nếu không bật chế độ bỏ qua **(probe)**. Vì vậy luật `if/then` của
  "Plugin settings" (`scope` ⇒ `enabled: true`) biến mất khỏi schema sinh ra. Lý do bác bỏ số 4 vẫn đúng, dù hẹp hơn
  trước.
- **Hướng ngược lại, dùng schema viết tay làm validator lúc chạy, vẫn không đáng làm.** `typebox/schema` validate được
  cả `config.schema.json` lẫn `$ref` chéo sang `preset.schema.json` theo `$id` và nhẹ hơn Ajv (267 KB so với 325 KB,
  tính cả hai file schema) **(probe)**. Nhưng lỗi vẫn là kiểu Ajv (`/spec/plugins/a@acme must match exactly one schema in
  oneOf`). Ajv standalone (sinh code lúc build) còn *to hơn*: 636 KB. `z.fromJSONSchema` không đọc nổi schema của repo
  vì nó không hỗ trợ `$ref` ra file ngoài hay `if/then`, và docs tự gọi nó là "semi-experimental"
  (`zod@4.6.5/src/v4/classic/from-json-schema.ts`).
- **Nhận định (chưa phải quyết định):** nếu dùng thư viện thì **valibot** hợp nhất. Nó nhỏ nhất (+17 KB), có
  `pipeAsync`/`checkAsync`/`transformAsync` cho các bước async, và sinh JSON Schema bằng `@valibot/to-json-schema`, một
  gói chỉ cần ở devDependencies. Ứng viên thứ hai là **zod/mini** (+45 KB): error map thấy path đầy đủ, có `z.xor`. Tuy
  vậy lợi ích chỉ nằm ở phần shape. Contract test hiện có đã chặn drift giữa parser và schema, còn schema viết tay vẫn
  phải giữ nếu muốn giữ `oneOf` có `title` và `if/then`. Vậy nên đổi sang thư viện sẽ không giảm số chỗ phải sửa khi
  thêm một key `spec.*` từ ba xuống một.

## Parser hiện tại cần gì

`readDeclarations` đọc lần lượt marketplaces → plugins → items (`ITEM_KINDS`) → MCP servers → hooks và dừng ở lỗi đầu
tiên (throw `ConfigError`). Các loại kiểm tra:

| Loại | Ví dụ trong `spec.ts` | Schema biểu diễn được? |
|---|---|---|
| Shape | `plugins` là map hoặc list, value là `true`/`false`/`{ enabled, scope? }`, key lạ bị từ chối | có |
| Cross-field đồng bộ | `scope: user` cấm `enabled: false`; `skills` và `exclude` loại trừ nhau; `scope: user` cấm Skill source dạng directory; `path` phải là đường dẫn tương đối nằm trong source; command/argument `./` của User-scoped MCP server | một phần (`if/then`, `not`), phần còn lại là code |
| Async | `parseShorthand` (stat filesystem, cấm relative path trong Remote preset); tra MCP catalog cho `true` hoặc cho map chỉ có `scope` | không |
| Biến đổi | chuẩn hoá `path`, gộp `path` vào `directory` source, `normalizeMcp`, tách `scope` khỏi config, khử trùng lặp selection | không |

Thứ tự lỗi quan trọng: test khẳng định *message cụ thể* của lỗi đầu tiên, và thứ tự key trong code (marketplaces trước
plugins …) quyết định lỗi nào người dùng thấy.

## valibot 1.5.0

- **Message tuỳ biến.** Mọi schema và action nhận tham số `message` là chuỗi hoặc hàm `(issue) => string`
  ([issues guide](https://github.com/open-circle/valibot/blob/HEAD/website/src/routes/guides/(main-concepts)/issues/index.mdx)).
  Hàm này chạy ngay lúc tạo issue (`_addIssue`, `valibot@1.5.0/dist/index.mjs` dòng 180–204), còn path thì "subsequently
  added by parent schemas" (issues guide). Vì thế message chỉ nên là phần đuôi (`has unknown field "pin"`), và
  formatter ghép `demo.yaml: plugin "<issue.path[0].key>"` vào sau **(probe)**.
- **Mặc định:** `Invalid type: Expected (boolean | Object) but received Object` cho cả trường hợp field lạ lẫn trường
  hợp `enabled` sai kiểu, vì union gộp mọi nhánh thành một issue **(probe)**. Muốn có message rõ hơn thì hàm message
  của union phải chọn issue con (`issue.issues`) của nhánh object.
- **Key lạ:** `strictObject` sinh issue `expected: "never"`, `received: "\"pin\""`, path `[a@acme, pin]`. valibot kiểm
  tra key đã khai báo trước key lạ, nên với `{ enabled: 'x', pin: 1 }` lỗi đầu tiên là `enabled`. Parser hiện tại lại
  báo `pin` trước **(probe)**.
- **Async:** các biến thể `*Async` (`pipeAsync`, `checkAsync`, `transformAsync`, `objectAsync`…). Async chỉ lồng được
  trong async; sync lồng trong async thì được
  ([async-validation](https://github.com/open-circle/valibot/blob/HEAD/website/src/routes/guides/(advanced)/async-validation/index.mdx)).
  Action trong `pipe` chỉ chạy khi các bước trước đã "typed", nên check async ở cuối pipe chạy sau shape check. Nếu
  `transformAsync` throw `ConfigError` thì lỗi thoát thẳng ra ngoài `safeParseAsync`, giữ nguyên được kiểu fail-fast
  hiện tại **(probe)**.
- **JSON Schema:** gói riêng `@valibot/to-json-schema` hỗ trợ target `draft-07` (mặc định), `draft-2020-12`,
  `openapi-3.0`, các hook `overrideSchema`/`overrideAction`/`overrideRef`, và action `metadata`/`title`/`description`/`examples`
  ([README](https://github.com/open-circle/valibot/blob/HEAD/packages/to-json-schema/README.md)). Mặc định nó throw
  `The "check" action cannot be converted to JSON Schema.`, còn với `errorMode: 'ignore'` thì bỏ check và union ra
  `anyOf` **(probe)**. Nó implement Standard JSON Schema qua `toStandardJsonSchema()`
  ([Standard JSON Schema](https://github.com/standard-schema/standard-schema/blob/HEAD/packages/spec/json-schema.md)).
  Converter chỉ cần lúc build/test, không vào bundle.
- **Kích thước:** lát cắt `plugins` đầy đủ message + async là 17 186 byte (plain), 7 944 (minify), 2 737 (gzip)
  **(probe)**. Docs của valibot tự nêu mức "1.37 kB" cho một form login
  ([comparison](https://github.com/open-circle/valibot/blob/HEAD/website/src/routes/guides/(get-started)/comparison/index.mdx)).
- Phụ thuộc: không có `dependencies`, chỉ có peer `typescript >=5` (npm registry).

## zod 4.6.5 và zod/mini

- **Message tuỳ biến.** Tham số `error` ở mỗi schema hoặc check nhận chuỗi hoặc error map; error map trả `undefined`
  thì nhường cho map kế tiếp. Có error map per-parse (`schema.parse(data, { error })`) và global (`z.config`), với thứ
  tự ưu tiên schema > per-parse > global > locale
  ([error-customization](https://zod.dev/error-customization)). Message được tính ở `finalizeIssue` khi parse kết thúc
  (`zod@4.6.5/src/v4/core/util.ts` dòng 944+), nên error map per-parse thấy path đầy đủ: `path=["a@acme"]
  code=unrecognized_keys` **(probe)**. Vì vậy `origin` có thể nằm hẳn trong error map per-parse, không cần một bước
  hậu xử lý riêng.
- **Mặc định:** field lạ ra `Unrecognized key: "pin"`, còn value sai kiểu bên trong union ra `Invalid input` (issue
  `invalid_union`) **(probe)**. zod/mini mặc định chỉ trả `Invalid input` cho mọi lỗi cho tới khi nạp locale
  (`z.config(z.locales.en())`) **(probe)**.
- **Thứ tự issue:** `strictObject` báo `invalid_type` của `enabled` trước `unrecognized_keys` **(probe)**. Với async,
  issue xếp theo thứ tự *hoàn thành* chứ không theo thứ tự khai báo: một lỗi shape ở `plugins` đứng trước lỗi của
  transform async ở `marketplaces` dù `marketplaces` được khai báo trước **(probe)**. Muốn giữ thứ tự hiện tại thì phải
  throw từ transform (lỗi thoát ra ngoài `safeParseAsync`) hoặc tự sắp lại issue theo path.
- **Async:** refine và transform đều nhận hàm `async`, và khi đó phải dùng `parseAsync`/`safeParseAsync`
  ([api#refinements](https://zod.dev/api#refinements)). Refinement mặc định không chạy khi đã có issue
  non-continuable; `when` và `abort` điều khiển chuyện này ([api#when](https://zod.dev/api#when)).
- **JSON Schema:** `z.toJSONSchema(schema, { target })`, mặc định `draft-2020-12`, có `override` và `unrepresentable`,
  metadata lấy qua `.meta()` ([json-schema](https://zod.dev/json-schema)). Refinement (kể cả async) bị bỏ âm thầm: output
  giống hệt schema không có refine **(probe)**. `z.union` ra `anyOf`, `z.xor` và discriminated union ra `oneOf`
  (`zod@4.6.5/src/v4/core/json-schema-processors.ts` dòng 481). zod implement Standard JSON Schema từ v4.2
  (`schema["~standard"].jsonSchema.input(...)`). `z.toJSONSchema` nằm trong bundle runtime của zod classic dù không
  gọi tới (`to-json-schema.js` và `json-schema-processors.js` chiếm ~17 KB minified trong probe), còn zod/mini thì
  tree-shake được.
- **Ngược lại:** `z.fromJSONSchema` throw khi gặp `$ref` ra file ngoài ("only local refs (#/...) are allowed") và
  `if/then/else`, `not`, `unevaluatedProperties`. `preset.schema.json` dùng cả `if/then`, `not` (3 lần) và
  `unevaluatedProperties`, còn `config.schema.json` `$ref` sang `preset.schema.json`
  (`from-json-schema.ts` dòng 134, 391–409).
- **Kích thước:** zod 184 322 byte plain / 92 144 minify / 27 087 gzip. zod/mini 44 503 / 21 311 / 6 992 **(probe)**.
  Docs của zod khuyên dùng zod thường trừ khi "uncommonly strict constraints around bundle size"
  ([packages/mini](https://zod.dev/packages/mini)).
- `zod/compile` (mới trong 4.6) là JIT tuỳ chọn và không hỗ trợ async refinement ("z.compile does not support async
  refinements, transforms, or checks", `src/v4/core/compile.ts`). Không liên quan tới nhu cầu ở đây.

## arktype 2.2.3

- **Message tuỳ biến** qua `.configure({ expected, actual, problem, message })`. Mỗi `ArkError` có `code`, `path` và
  getter cho từng phần ([configuration](https://github.com/arktypeio/arktype/blob/HEAD/ark/docs/content/docs/configuration/index.mdx)).
  Key lạ bị từ chối bằng `'+': 'reject'` ([objects#undeclared](https://github.com/arktypeio/arktype/blob/HEAD/ark/docs/content/docs/objects/index.mdx)).
- **Mặc định: tốt nhất trong nhóm.** Ví dụ `value at ["a@acme"].enabled must be boolean (was "x")` và
  `value at ["a@acme"].pin must be removed` **(probe)**. Nhưng vẫn không phải ngôn ngữ domain của `ap`.
- Để tái tạo message hiện tại, formatter phải rẽ nhánh theo `e.expected === 'removed'` và theo code nội bộ; lỗi
  domain của union cũng mang code `predicate`. Đọc getter `expected` trên lỗi sinh từ `ctx.reject({ message })` mà không
  truyền `expected` sẽ throw `TypeError` **(probe)**.
- **Async: không có** (FAQ ở trên). `parseShorthand` và tra MCP catalog phải chạy ngoài thư viện, sau bước shape.
- **JSON Schema:** `.toJsonSchema()`, mặc định `draft-2020-12`, throw với `predicate` (tức `.narrow`) nếu không cấu
  hình `fallback` ([configuration#tojsonschema](https://github.com/arktypeio/arktype/blob/HEAD/ark/docs/content/docs/configuration/index.mdx)).
  Có thêm fallback thì output dùng `patternProperties` và `anyOf` **(probe)**.
- **Kích thước:** 302 097 / 154 694 / 47 616 **(probe)**.

## TypeBox 1.3.34 (`typebox`)

- Schema của TypeBox *chính là* JSON Schema, nên `description`/`examples`/`title` đi thẳng ra output. Nhưng
  `Type.Record` với key pattern ra `patternProperties` mà không có `additionalProperties: false`, nên key
  `nope` (thiếu `@marketplace`) lọt qua **(probe)**.
- **Lỗi:** kiểu Ajv (`keyword`, `instancePath`, `params`, `message`: `must be boolean`, `must match a schema in anyOf`),
  mặc định gom tối đa 8 lỗi, có locale cho hơn 40 ngôn ngữ
  ([schema/errors](https://github.com/sinclairzx81/typebox/blob/HEAD/design/website/docs/schema/3_errors.md),
  [system/locale](https://github.com/sinclairzx81/typebox/blob/HEAD/design/website/docs/system/2_locale.md)). Message
  riêng chỉ có ở `Type.Refine(type, check, error)`, và callback `error` chỉ nhận value, không nhận path
  (`build/type/types/_refine.d.mts`). Muốn có message `ap` thì phải viết formatter theo `keyword` + `instancePath`,
  giống hệt công việc của phương án Ajv đã bị bác.
- **Async: không có** (`TRefineCheckCallback` trả `boolean`).
- **`typebox/schema`**, một "JSON Schema JIT compiler … Draft 3 through to 2020-12 … lightweight … alternative to Ajv"
  ([README](https://github.com/sinclairzx81/typebox/blob/HEAD/readme.md)), validate đúng các schema viết tay, kể cả
  `$ref` chéo file theo `$id`. Ba fixture sai của shape corpus (`yes please`, `scopes: user`, `skils`), một field lạ
  trong plugin và một Config hợp lệ đều cho kết quả như Ajv **(probe)**. Đây là lựa chọn thay
  Ajv trong test nếu cần, nhưng không giải bài toán message.
- TypeBox 1.x không implement Standard Schema (`~standard` không có trong tarball). Theo README, 1.x "Developed against
  the TypeScript 7 native compiler", khớp với `typescript ^7.0.2` của repo.
- **Kích thước:** builder + `Value.Errors` 386 856 / 150 872 / 38 818. `typebox/schema` kèm hai file schema 266 897 /
  133 015 / 31 127 **(probe)**.

## effect 3.22.2 (`effect/Schema`)

- **Message tuỳ biến** qua annotation `message` (có cả "effectful messages") và `missingMessage`. Formatter có sẵn:
  `TreeFormatter`, `ArrayFormatter`
  ([error-messages](https://github.com/Effect-TS/website/blob/HEAD/apps/web/src/content/docs/v3/schema/error-messages.mdx),
  [error-formatters](https://github.com/Effect-TS/website/blob/HEAD/apps/web/src/content/docs/v3/schema/error-formatters.mdx)).
  Key lạ chỉ bị bắt khi decode với `onExcessProperty: 'error'` và ra `is unexpected, expected: "enabled" | "scope"`.
  Annotation `message` trên pattern của *key* trong `Record` bị bỏ qua: key sai vẫn ra `Unexpected` **(probe)**.
- **Mặc định:** mỗi nhánh union ra một issue riêng (`Expected boolean, actual {...}` rồi mới tới lỗi thật), dài dòng
  nhất trong nhóm **(probe)**.
- **Async:** có, qua `Schema.filterEffect` và transform effectful
  ([filters](https://github.com/Effect-TS/website/blob/HEAD/apps/web/src/content/docs/v3/schema/filters.mdx)). Nhưng
  phải chạy bằng runtime Effect (`Effect.runPromise`), tức là kéo cả mô hình Effect vào `sync/`.
- **JSON Schema:** `JSONSchema.make`, mặc định Draft 07, có `jsonSchema2019-09` và `jsonSchema2020-12`
  ([json-schema](https://github.com/Effect-TS/website/blob/HEAD/apps/web/src/content/docs/v3/schema/json-schema.mdx)).
  Output có `patternProperties: { "": … }` kèm `propertyNames`, và mất `title` của struct đã qua `filter` **(probe)**.
- **Kích thước:** 898 433 / 383 472 / 120 675 **(probe)**, tức khoảng +67% bundle hiện tại. Effect 4 (Schema gộp vào
  core) vẫn đang beta/rc.

## Hướng "schema viết tay làm nguồn": Ajv, Ajv standalone, `typebox/schema`

Phương án này bị bác vì ba lý do: nó thêm một lớp validation thứ hai, lỗi của Ajv tệ, và Ajv phải vào bundle.

- Lỗi vẫn tệ ở cả ba biến thể. Với `plugins: { tdd@acme: "yes please" }`, Ajv và `typebox/schema` cùng trả sáu dòng
  kiểu `/spec/plugins/tdd@acme must be boolean` … `/spec/plugins must match exactly one schema in oneOf` **(probe)**.
- Kích thước (đều tính cả hai file schema, ~43 KB JSON): Ajv lúc chạy 325 085 byte plain. Ajv standalone (`ajv/dist/standalone`, sinh code ESM lúc build) là
  635 839 byte plain, vì mỗi `oneOf` bung ra thành code. `typebox/schema` là 266 897 byte **(probe)**. Không biến thể
  nào nhỏ.
- Lớp semantic vẫn nằm nguyên, nên lý do "thêm một lớp validation thứ hai" không đổi.

## Standard Schema / Standard JSON Schema

`@standard-schema/spec` 1.1.0 định nghĩa `StandardSchemaV1` (`~standard.validate`, issue gồm `message` và `path`) và
`StandardJSONSchemaV1` (`~standard.jsonSchema.input/output({ target })`, khuyến nghị hỗ trợ `draft-2020-12` và
`draft-07`) ([json-schema.md](https://github.com/standard-schema/standard-schema/blob/HEAD/packages/spec/json-schema.md)).
Bên implement: zod ≥4.2 và zod/mini, arktype 2.1.28, valibot qua `toStandardJsonSchema()`. effect có
`Schema.standardSchemaV1`. TypeBox 1.x không có. Với `ap`, spec này chỉ có ích nếu contract test muốn lấy JSON Schema
từ thư viện mà không phụ thuộc vào thư viện cụ thể. Nó không giúp gì cho message hay semantic check.

## Bảng so sánh

Kích thước là số byte tăng thêm của lát cắt `plugins` (record + union + strict object + refine + regex key + một check
async), bundle như `pack-release.mjs` (ESM, `platform: node`, `target: node22`). Mốc so sánh: bản viết tay hiện tại là
1 804 byte; toàn bộ `ap` hiện là 1 343 021 byte plain.

| | valibot | zod/mini | zod | arktype | TypeBox | effect |
|---|---|---|---|---|---|---|
| Plain / minify / gzip (byte) **(probe)** | 17 186 / 7 944 / 2 737 | 44 503 / 21 311 / 6 992 | 184 322 / 92 144 / 27 087 | 302 097 / 154 694 / 47 616 | 386 856 / 150 872 / 38 818 | 898 433 / 383 472 / 120 675 |
| Tăng so với bundle `ap` | ~1,3% | ~3,3% | ~13,7% | ~22% | ~29% | ~67% |
| Message mặc định (field lạ) | `Invalid type: Expected (boolean \| Object) but received Object` | `Invalid input` (chưa nạp locale) | `Unrecognized key: "pin"` | `value at ["a@acme"].pin must be removed` | `must not have additional properties` (+3 lỗi khác) | `is unexpected, expected: "enabled" \| "scope"` (+1) |
| Tái tạo đúng message `ap` **(probe)** | được; message chỉ là phần đuôi, tiền tố ghép sau parse | được; error map per-parse thấy path | được; như zod/mini | được; formatter theo code nội bộ | được; formatter theo `keyword` như Ajv | được; formatter theo `_tag`/path |
| Async refinement/transform | có (`*Async`) | có (`parseAsync`) | có | không | không | có (`filterEffect`, cần runtime Effect) |
| Thứ tự: shape trước async? | có trong một `pipe`; throw trong transform thoát ra ngay | refine chờ shape; issue async xếp theo lúc hoàn thành | như zod/mini | async nằm ngoài thư viện | async nằm ngoài thư viện | có |
| JSON Schema output | `@valibot/to-json-schema` (devDep), 07/2020-12, override hooks; check phải `errorMode: 'ignore'` | `z.toJSONSchema`, 2020-12, `override`; refine bị bỏ âm thầm; `z.xor` → `oneOf` | như zod/mini | `.toJsonSchema()`, 2020-12; `narrow` cần `fallback` | chính là JSON Schema; refine không xuất ra | `JSONSchema.make`, 07/2019-09/2020-12 |
| Giữ `oneOf` có `title`, `if/then` viết tay | không (`anyOf`; `if/then` qua override) | một phần (`z.xor`; `if/then` qua `override`) | một phần | không | có nếu viết tay trong builder | không |
| Lý do 1 (semantic không biểu diễn được) | vẫn đúng: chuyển vào `check`/`transformAsync` | vẫn đúng | vẫn đúng | vẫn đúng, còn nặng hơn (không async) | vẫn đúng, còn nặng hơn | vẫn đúng |
| Lý do 2 (mất message có origin) | không còn đúng | không còn đúng | không còn đúng | không còn đúng, nhưng giòn | không còn đúng, nhưng tốn như Ajv | không còn đúng, nhưng giòn |
| Lý do 3 (dependency trong Release tarball) | không còn đúng (+17 KB) | không còn đúng (+45 KB) | một phần (+184 KB) | vẫn đúng | vẫn đúng | vẫn đúng |
| Lý do 4 (mất description/examples/titled `oneOf`) | description/examples giữ được; `oneOf`/`if/then` mất | giữ được nhiều nhất | như zod/mini | mất nhiều | giữ (tự viết) | mất nhiều |

## Cách đo (probe)

Thư mục scratch có `package.json` với `"type": "module"`, cài
`valibot@1.5.0 @valibot/to-json-schema@1.8.0 zod@4.6.5 arktype@2.2.3 typebox@1.3.34 effect@3.22.2 esbuild@0.28.2 ajv@8.20.0`.
Mỗi thư viện có một file `src/<lib>-default.js` (schema tối thiểu, message mặc định) và một file `src/<lib>-custom.js`.
File custom mô tả value của plugin `true | false | { enabled, scope? }` với key lạ bị từ chối, key phải khớp
`name@marketplace`, luật `scope: user` ⇒ `enabled: true`, một check async giả lập (`setTimeout`), và message riêng.
Chạy `node src/<lib>-custom.js` với bảy input: `unknownField`, `wrongType`, `enabledNotBool`, `crossField`, `badScope`,
`badId`, `ok`. Các file custom đều in ra đúng message của `readPluginValue`, ví dụ
`unknownField demo.yaml: plugin "a@acme" has unknown field "pin"`.

Phần lõi của bản valibot:

```js
const Settings = v.pipe(
  v.strictObject(
    { enabled: v.boolean('must set `enabled` to true or false'),
      scope: v.optional(v.literal('user', (i) => `has scope "${i.input}"; the only scope is "user"`)) },
    (i) => (i.expected === 'never' ? `has unknown field ${i.received}` : 'must be true, false or { enabled, scope }'),
  ),
  v.check((s) => !(s.scope === 'user' && !s.enabled), 'cannot be `enabled: false` with `scope: user`'),
)
const Value = v.union([v.boolean(), Settings], (i) =>
  typeof i.input === 'object' && i.input !== null ? i.issues.at(-1).message : 'must be true, false or { enabled, scope }')
const format = (issue) => `${origin}: plugin "${issue.path?.[0]?.key ?? issue.input}" ${issue.message}`
```

Đo kích thước bằng script dựng lại đúng các tuỳ chọn của `pack-release.mjs`:

```js
// node bundle.mjs handwritten valibot-custom zodmini-custom zod-custom arktype-custom typebox-default effect-custom ...
await build({ entryPoints: [`src/${name}.js`], outfile, bundle: true, platform: 'node', format: 'esm',
  target: 'node22', minify, legalComments: 'none', logLevel: 'error' })
// in ra byte của file plain, file minify, và gzipSync(file minify)
```

Mốc 1 343 021 byte là `src/release.ts` bundle với đúng các tuỳ chọn của `pack-release.mjs` (`minify: false`, alias
`react-devtools-core`, `define` `NODE_ENV`), ghi ra scratch chứ không ghi vào `release/`.

## Câu hỏi còn mở

- Đổi sang thư viện có đáng không, khi contract test (`spec-schema.test.ts`) đã chặn drift giữa parser và schema? Thư
  viện chỉ thay được phần shape. Nếu vẫn giữ schema viết tay cho editor, số chỗ phải sửa khi thêm key `spec.*` vẫn là
  ba.
- Nếu sinh schema từ thư viện: có chấp nhận `anyOf` thay `oneOf` có `title`, và viết `if/then`, `not`,
  `unevaluatedProperties`, `deprecated` qua hook override không? Quy ước `$ref` từ `config.schema.json` sang
  `preset.schema.json` (contract test đang kiểm tra) cần cấu hình registry/defs riêng. Chưa thử.
- Thứ tự lỗi: parser hiện tại báo field lạ trước field sai kiểu và dừng ở lỗi đầu. zod, valibot và arktype báo field
  đã khai báo trước, còn issue async của zod xếp theo lúc hoàn thành. Có cần giữ đúng thứ tự cũ không, hay chỉ cần giữ
  "một lỗi, có origin"?
- `checkMcp` và `checkHook` (trong `mcp.ts`, `hooks.ts`) cũng là shape check viết tay. Phạm vi thay thế có gồm chúng
  không?
- Chưa kiểm chứng: hiệu năng type-check của zod/valibot dưới TypeScript 7 native (`typescript ^7.0.2`). Chỉ TypeBox
  tuyên bố phát triển trên TS 7. Cũng chưa đo toàn bộ `spec.ts` viết lại bằng thư viện, mới đo lát cắt `plugins`, nên
  con số thật sẽ lớn hơn ở phần code của `ap` chứ không phải ở phần thư viện.
