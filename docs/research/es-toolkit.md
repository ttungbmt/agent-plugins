# Research: es-toolkit thay cho code tiện ích viết tay trong `packages/cli`

Kiểm tra ngày 2026-09-24. Phiên bản: **es-toolkit 1.52.0** (dist-tag `latest`, phát hành 2026-08-28; `npm view
es-toolkit version`), **esbuild 0.28.2** (đúng bản của repo), **TypeScript 7.0.2** (bản trong `packages/cli`),
**Node v24.20.0** (mise của repo) và **Node v22.23.3** (bản 22 mới nhất, cài vào thư mục scratch để kiểm tra mức sàn
`engines: >=22`). Nguồn: tarball npm của es-toolkit đã giải nén (`es-toolkit@1.52.0/dist/**`), docs chính thức tại
[es-toolkit.dev](https://es-toolkit.dev/intro.html), npm registry, docs Node 22
([util](https://nodejs.org/docs/latest-v22.x/api/util.html)) và `@mdn/browser-compat-data` 8.1.3 cho phiên bản Node
của các built-in. Mọi hành vi, số byte và số đo đánh dấu **(probe)** là do chạy thử trong thư mục scratch; lệnh ở mục
[Cách đo](#cách-đo).

Phạm vi: code viết tay trong `packages/cli/src` (trừ `*.test.ts`, `fake-claude.ts`, `test-helpers.ts`,
`*.prototype.mjs`) và `packages/cli/scripts`, khoảng 4 600 dòng. Cách duyệt đi từ phía es-toolkit: lấy toàn bộ 199
export ở entry gốc (`Object.keys(require('es-toolkit'))`) cộng 46 tên chỉ có ở subpath (`bigint`, `fp`,
`fp/iterator`, `iterator`, `map`, `set`, `server`), rồi với mỗi tên, đọc hết các file nguồn để tìm chỗ tự viết lại
cùng việc đó. `es-toolkit/compat` (lớp tương thích lodash) không xét.

## Tóm tắt

- **Có 94 chỗ đáng xét, dùng 27 hàm.**
  - Mảng: `uniq` 7, `union` 2, `difference` 10, `differenceWith` 3, `intersection` 2, `isSubset` 1, `without` 1,
    `partition` 4, `uniqBy` 1, `groupBy` 8, `countBy` 1, `sortBy` 3.
  - Object: `omit` 13, `pick` 1, `pickBy` 1, `omitBy` 2, `mapValues` 1.
  - Predicate: `isPlainObject` 5, `isEmptyObject` 2, `isNotNil` 3, `isEqual` 10 (chỗ đang dùng `isDeepStrictEqual`).
  - String: `kebabCase` 1, `trimEnd` 6.
  - Khác: `once` 1, `asyncNoop` 1, và `exec` 1, `colors` 3 của `es-toolkit/server`.

  `scripts/` không có chỗ nào. Các chỗ "không đáng" hoặc "không áp dụng" (ví dụ `keyBy`, `maxBy`, `attempt`,
  `mapAsync`, `memoize`, `compact`) chỉ nằm trong bảng, không tính vào 94.
- **73/94 chỗ tương đương.** Trong đó 56 chỗ, trên 18 file, được viết lại trong một bản sao `src` trong scratch. Bản
  viết lại typecheck sạch với TypeScript 7.0.2 và qua cả 487 test chạy được **(probe)**. Hai file test lỗi ở cả bản
  gốc lẫn bản viết lại, vì chúng đọc schema và MCP catalog theo đường dẫn tương đối tới repo.
- **21/94 chỗ đổi hành vi:**
  - `kebabCase` trong `ap init` ghi `metadata.name` sai schema.
  - `groupBy` (trả object) ở `mergeMcpServers` và `collectItems` đảo thứ tự tên dạng số nguyên.
  - `sortBy` thay `localeCompare` ở hai chỗ trong `workflows.ts`, làm đổi Installed workflow được chọn và thứ tự Source
    catalog trong Lock.
  - `isPlainObject` ở `registry.ts:250` và `spec.ts:315` khác với mảng.
  - `isEqual` thay 10 chỗ `isDeepStrictEqual` khác ở `-0`, prototype và mảng thưa.
  - `exec` và `colors` của `es-toolkit/server` (4 chỗ): `exec` reject khi gặp ENOENT, `colors` không nhận TTY hay
    `NO_COLOR`.

  Ngoài ra có bốn hàm trùng tên hoặc gần giống mà nghĩa khác: `pick` (dùng `Object.hasOwn` thay `in`, chỉ khác ở trường
  hợp biên), `compact` (trùng tên, khác nghĩa), `memoize` (chỉ nhận một tham số) và `mapAsync` (đổi tuần tự thành song
  song).
- **Test hiện có không bắt được thay đổi nào.** Tám chỗ thay đổi hành vi (`sortBy` ×2, `groupBy` ×2, `kebabCase`,
  `isPlainObject` ×2, `isEqual`) được áp lên bản viết lại, và cả 487 test vẫn qua **(probe)**.
- **Kích thước: rất nhỏ.** 56 thay thế tương đương làm `dist/ap.js` (không minify, như `pack-release.mjs`) tăng
  +3 558 byte, tức +0,25%. Thêm 8 chỗ đổi hành vi thì +11 970 byte (+0,84%), phần lớn do `isEqual` kéo theo
  code nội bộ của `compat` (+7 049 byte riêng nó) **(probe)**. Tree-shaking chạy đúng: `sideEffects: false`, bundle chỉ
  chứa 19 module es-toolkit được dùng.
- **Hiệu năng: không đo được khác biệt có nghĩa.** Mỗi lời gọi ở cỡ dữ liệu thật (vài chục phần tử) tốn dưới 2,2 µs
  cả hai phía, trong khi một lần spawn `git --version` tốn khoảng 2,2 ms **(probe)**. Con số "2–3×" của es-toolkit là so
  với lodash, không phải so với code viết tay.
- **Kiểu dữ liệu: có được có mất.** `isNotNil`, `isSubset` và `isPlainObject` bỏ được 5 cast hoặc type-guard viết tay.
  Ngược lại, `omit` trên `MarketplaceSource` (có index signature) làm mất field `source` nên phải cast lại.
  `isPlainObject` thu hẹp về `Record<PropertyKey, any>`, tức lọt `any`. `sortBy` không nhận `string[]` **(probe)**.
- **Built-in thay được một phần đáng kể mà không cần thư viện**, nhưng phải nâng `lib` của TypeScript. Hiện tại
  `target: ES2023` và không khai báo `lib`, nên `Map.groupBy` và `Object.groupBy` (cần `es2024`) cùng các method mới của
  `Set` (cần `es2025`) báo lỗi TS2550, dù Node 22 chạy được chúng **(probe)**.
- **Bảo trì:** giấy phép MIT, không có `dependencies`, 17 bản stable trong 12 tháng qua (1.40.0 → 1.52.0), vẫn ở 1.x.
  Changelog có sửa kiểu dữ liệu ngay trong bản minor, và một số hàm `compat` được ghi rõ là đổi kết quả khi lên minor.

## Bảng đối chiếu

Kết luận: **tương đương** (cùng output với input thật, **(probe)** hoặc do code es-toolkit giống hệt), **đổi hành vi**
(chi tiết ở mục sau), **không đáng** (thay được nhưng không gọn hơn, hoặc phải đổi cấu trúc), **không áp dụng** (hình
dạng không khớp). Số dòng tính theo commit `31f23a2`.

### Mảng

| es-toolkit | Chỗ trong code | Kết luận | Lý do |
|---|---|---|---|
| `uniq` | `sync/merge.ts:210`, `sync/spec.ts:91`, `sync/spec.ts:273`, `sync/index.ts:174`, `sync/index.ts:357`, `sync/collect-items.ts:68`, `sync/collect-items.ts:171` | tương đương | Hàm này chính là `[...new Set(arr)]` (`dist/array/uniq.mjs`). |
| `union` | `sync/merge.ts:287` (nhánh list ∪ list), `sync/registry.ts:136` | tương đương | `uniq(arr1.concat(arr2))` (`dist/array/union.mjs`). |
| `difference` | `sync/index.ts:132`, `sync/index.ts:253`, `sync/merge.ts:125`, `sync/merge.ts:246`, `sync/merge.ts:278`, `sync/merge.ts:287` (nhánh exclude), `sync/merge.ts:288`, `init/index.ts:64`, `sync/registry.ts:221`, `sync/workflows.ts:127` | tương đương | `Array#includes` và `Set#has` cùng dùng SameValueZero; so sánh object theo identity, giữ nguyên phần tử lặp của mảng đầu **(probe)**. Ba chỗ cuối đang lọc theo một `Set`, nên phải truyền `[...set]`, hoặc dùng `Set#difference`. |
| `difference` (không đáng) | `sync/merge.ts:59`, `sync/merge.ts:166`, `sync/collect-items.ts:186`, `sync/workflows.ts:124` | không đáng | Điều kiện kép (`!winners.includes(d) && …`) hoặc lọc theo field đã map. |
| `differenceWith` | `sync/collect-items.ts:69`, `sync/collect-items.ts:86`, `sync/index.ts:461-462` | tương đương | `filter(x => !ys.some(y => eq(x, y)))` ≡ `filter(x => ys.every(y => !eq(x, y)))` (`dist/array/differenceWith.mjs`). |
| `differenceWith` (không đáng) | `sync/registry.ts:72` | không đáng | Code cần phần tử đầu tiên (`find`); `differenceWith(...)[0]` phải duyệt hết. |
| `intersection` | `sync/merge.ts:289`, `sync/collect-items.ts:105` | tương đương | Như `difference`, chỉ đảo điều kiện. `sync/collect-items.ts:130` có điều kiện kép nên không đáng. |
| `intersectionWith` | `sync/ledger.ts:36`, `sync/merge.ts:298` | không đáng | `merge.ts:298` cần một boolean (`some` lồng `some`); `ledger.ts:36` lọc theo `key(m)`, viết bằng `intersectionWith` không ngắn hơn. |
| `isSubset` | `sync/merge.ts:307` | tương đương | `isSubset(a.shadows, b.presets)` bỏ được cast `p as string` **(probe)**. |
| `without` | `sync/spec.ts:309` | tương đương | `without(SPEC_KEYS, 'hooks')`. |
| `partition` | `sync/merge.ts:41-42`, `sync/index.ts:116-117`, `sync/scope-move.ts:44-45`, `sync/scope-move.ts:73-75` | tương đương | Cùng thứ tự, cùng xử lý khi một object xuất hiện hai lần **(probe)**. Overload type-guard giữ được kiểu `Layer & { presets: [string] }` ở `merge.ts:41` **(probe)**. Ở `index.ts:116` và `scope-move.ts:44`, `lifted` rỗng khi Sync nhắm `user`, nên vẫn cần một nhánh điều kiện bao ngoài. |
| `uniqBy` | `sync/scope-move.ts:108-115` | tương đương | Vòng `seen` giữ lần xuất hiện đầu của mỗi key, và điều kiện chỉ phụ thuộc key, nên `uniqBy(...).filter(...)` cho cùng kết quả **(probe)**. |
| `groupBy` | `sync/merge.ts:147-148` (plugin id), `sync/merge.ts:199-203` (key JSON), `sync/merge.ts:210` (`scope`), `format-conflicts.ts:13-17`, `format-conflicts.ts:24-28`, `format-report.ts:64-65` | tương đương trên thực tế | Trả object chứ không phải `Map`. Thứ tự chỉ đổi khi key có dạng số nguyên, mà plugin id luôn chứa `@` và key JSON luôn bắt đầu bằng `{`. |
| `groupBy` | `sync/merge.ts:262-263` (tên MCP server), `sync/collect-items.ts:171-173` (tên item) | **đổi hành vi** | Tên như `7`, `123` bị xếp lên đầu. Xem [groupBy](#groupby-trả-object-thứ-tự-key-dạng-số). |
| `groupBy` (không đáng) | `sync/workflows.ts:59-71` | không đáng | Nhóm có logic riêng: `<name>.js` được `unshift` lên đầu. |
| `countBy` | `format-report.ts:73-74` | tương đương | Key là các động từ cố định (`add`, `install`, …) **(probe)**. |
| `keyBy` | `sync/ledger.ts:26` | không áp dụng | Ledger cần `Map` (`get`, `has`, `delete`); `keyBy` trả object. |
| `sortBy` | `sync/skills.ts:123` | tương đương | `compareAscending` dùng `<`/`>` giống comparator hiện tại, và tên trong một thư mục là duy nhất **(probe)**. |
| `sortBy` | `sync/workflows.ts:50`, `sync/workflows.ts:60` | **đổi hành vi** | `localeCompare` thay bằng so sánh code unit. Xem [sortBy](#sortby-thay-localecompare-trong-workflowsts). |
| `sortBy` | `sync/agents.ts:34`, `sync/rules.ts:107`, `sync/skills.ts:72` | không áp dụng | Đây là `string[]`, mà `sortBy<T extends object>` không nhận (TS2345) **(probe)**. |
| `maxBy` | `format-conflicts.ts:29`, `format-report.ts:67` | không đáng | Code cần độ dài lớn nhất; `maxBy` trả phần tử, và bản root không có `max` (chỉ `es-toolkit/bigint` có). |
| `compact` | `sync/store.ts:263` | **không áp dụng, trùng tên** | Xem [compact](#compact-trùng-tên-khác-nghĩa). Hàm khớp là `pickBy`. |
| `mapAsync`, `filterAsync`, `forEachAsync`, `reduceAsync`, `flatMapAsync` | các vòng `for … await` tuần tự: `sync/index.ts:195-197`, `sync/index.ts:616-620`, `sync/rules.ts:44-48`, `sync/agents.ts:36-44`, `sync/skills.ts:72`, `sync/skills.ts:99-103`, `sync/workflows.ts:37-49` | **đổi hành vi** / không đáng | Không truyền `concurrency` thì các hàm này là `Promise.all(array.map(fn))`, tức song song (`dist/array/mapAsync.mjs`). `workflows.ts:43` phát hiện tên trùng dựa trên thứ tự tuần tự. |
| `flatten`, `head`, `last`, `at` | `.flat()` ở `sync/registry.ts:40`, `sync/index.ts:612`; `.at(-1)` ở `sync/index.ts:354`, `sync/merge.ts:158`, `sync/registry.ts:281` | không đáng | Code đã dùng built-in. |
| các hàm mảng còn lại (`chunk`, `zip`, `windowed`, `shuffle`, `sample`, `take*`, `drop*`, `pull`, `remove`, `xor*`, `orderBy`, `cartesianProduct`, `combinations`, `fill`, `toFilled`, …) | — | không có chỗ tương ứng | |

### Object

| es-toolkit | Chỗ trong code | Kết luận | Lý do |
|---|---|---|---|
| `omit` | `sync/identity.ts:16`, `sync/merge.ts:158`, `sync/index.ts:557`, `sync/hooks.ts:93`, `sync/collect-items.ts:189`, `sync/registry.ts:26`, `sync/registry.ts:45`, `sync/registry.ts:183`, `sync/store.ts:157`, `sync/store.ts:247`, `sync/preset-loader.ts:170`, `sync/spec.ts:38`, `sync/spec.ts:129` | tương đương về runtime | `{ ...obj }` rồi `delete` (`dist/object/omit.mjs`), giống rest destructuring. Riêng `identity.ts:16` phải cast (xem [Kiểu](#kiểu-dữ-liệu)). Ở `registry.ts:26`, `spec.ts:38` và `spec.ts:129`, destructuring còn lấy luôn field bị bỏ, nên dùng `omit` phải đọc field đó riêng. Lợi ích nhỏ. |
| `omit` (không áp dụng) | `sync/store.ts:198`, `sync/store.ts:253`, `sync/hooks.ts:19` | không áp dụng | Đổi tên key hoặc sắp lại thứ tự key, không chỉ bỏ key. |
| `pick` | `sync/plan.ts:98-100` | tương đương với input thật; khác ở biên | Xem [pick](#pick-in-so-với-objecthasown). |
| `pickBy` | `sync/store.ts:263-265` | tương đương | `pickBy(fields, (v) => !!v?.length)` **(probe)**, typecheck được với signature hiện tại. |
| `omitBy` | `sync/mcp.ts:23-31`, `sync/hooks.ts:88` | tương đương | Cả hai phía đều gán `result[key] = value`. `hooks.ts:88` đang `delete` trên một bản copy. |
| `mapValues` | `sync/preset-loader.ts:170` | tương đương, trừ key `__proto__` | `Object.fromEntries` tạo own property `__proto__`, còn `mapValues` gán `result[key] =`. MCP catalog là file bundled nên không gặp trường hợp này. |
| `zipObject`, `mapValues` | `byKind` ở `sync/types.ts:38-40`, `sync/spec.ts:114`, `sync/store.ts:142` | không đáng | `Object.fromEntries(ITEM_KINDS.map(…))` đã là một dòng. |
| `merge`, `toMerged`, `mergeWith` | `sync/merge.ts:120` (`{ ...acc.extras, ...d.extras }`) | không áp dụng | Code gộp nông; `merge` gộp sâu, tức đổi hành vi. |
| `clone`, `cloneDeep`, `flattenObject`, `invert`, `findKey`, `sortKeys`, `deepFreeze`, `to*CaseKeys` | — | không có chỗ tương ứng | |

### Predicate

| es-toolkit | Chỗ trong code | Kết luận | Lý do |
|---|---|---|---|
| `isPlainObject` | `sync/hooks.ts:31`, `sync/hooks.ts:113` | tương đương với dữ liệu JSON | Chỉ khác với `Date` và class instance, mà `JSON.parse` và `yaml` không bao giờ tạo ra **(probe)**. Bỏ được cast `as SettingsHooks`. |
| `isPlainObject` | `sync/spec.ts:299` | tương đương trên thực tế | Mảng rơi vào nhánh khác nhưng không message nào có `{}` bị ảnh hưởng **(probe)**. |
| `isPlainObject` | `sync/registry.ts:250`, `sync/spec.ts:315` | **đổi hành vi** | Điều kiện hiện tại coi mảng là object. Xem [isPlainObject](#isplainobject-ở-registryts250-và-spects315). |
| `isPlainObject` | `sync/workflow-meta.ts:97` | không áp dụng | Node của acorn là class instance, nên `isPlainObject` trả `false`. |
| `isEmptyObject` | `sync/mcp.ts:28`, `sync/spec.ts:130` | tương đương | Là `isPlainObject(v) && Object.keys(v).length === 0` (`dist/predicate/isEmptyObject.mjs`) **(probe)**. |
| `isNotNil` | `sync/index.ts:127`, `sync/index.ts:239`, `sync/index.ts:611` | tương đương | Mảng chỉ chứa `string \| null`; bỏ được type-guard viết tay. |
| `isEqual` | `isDeepStrictEqual` ở `sync/identity.ts:6`, `sync/merge.ts:248`, `sync/merge.ts:318`, `sync/mcp.ts:36`, `sync/hooks.ts:25`, `sync/plan.ts:73`, `sync/plan.ts:74`, `sync/plan.ts:76`, `sync/plan.ts:95`, `sync/registry.ts:72` | **đổi hành vi**; built-in nên giữ | Xem [isEqual](#isequal-so-với-isdeepstrictequal). |
| `isError` | 6 chỗ `(error as Error).message` (`sync/index.ts:352`, `sync/index.ts:573`, `sync/collect-items.ts:163`, `sync/registry.ts:158`, `sync/preset-loader.ts:115`, `sync/preset-loader.ts:172`) | không đáng | Muốn bỏ cast thì phải thêm nhánh cho giá trị throw không phải `Error`, tức thêm hành vi mới. |
| `isString`, `isBoolean`, `isNil`, `isFunction`, … | các `typeof x === 'string'` | không đáng | `typeof` đã thu hẹp kiểu như nhau. |
| `isJSON*`, `isPrimitive`, `isDate`, `isMap`, `isBuffer`, … | — | không có chỗ tương ứng | |

### String, function, promise, util, server

| es-toolkit | Chỗ trong code | Kết luận | Lý do |
|---|---|---|---|
| `kebabCase` | `init/index.ts:31-36` | **đổi hành vi** | Xem [kebabCase](#kebabcase-trong-ap-init). |
| `deburr` | `init/index.ts:15` | hành vi mới | `kebabCase(deburr(x))` hoặc `local(deburr(x))` đổi `Dự Án` thành `du-an`, thay vì `d-n` như hiện tại **(probe)**. Đây là tính năng mới chứ không phải thay thế. |
| `trimEnd(s, '/')` | `sync/shorthand.ts:31`, `sync/shorthand.ts:56`, `sync/spec.ts:77`, `sync/spec.ts:237`, `sync/rules.ts:27`, `sync/skills.ts:92` | tương đương | Cùng kết quả với `.replace(/\/+$/, '')` cho `''`, `'/'`, `'a//'`, URL, … **(probe)**. |
| `escapeRegExp`, `words`, `camelCase`, `snakeCase`, `dedent`, `pad`, `capitalize`, … | — | không có chỗ tương ứng | Code không dựng RegExp động. Template của `ap init` đã sát lề trái. `padEnd` đã là built-in. |
| `once` | `sync/preset-loader.ts:165` (`resolution.catalog ??= …`) | tương đương, không đáng | Cả hai đều cache luôn promise bị reject. Dùng `once` thì phần cache chuyển từ `Resolution` vào closure. |
| `memoize` | `sync/index.ts:554-561` (`sharedFetcher`) | không áp dụng | Xem [memoize](#memoize-chỉ-nhận-một-tham-số). |
| `asyncNoop` | `sync/skills.ts:39` (`cleanup: async () => {}`) | tương đương, không đáng | Chỉ đổi một arrow function rỗng. |
| `debounce`, `throttle` | `commands/sync.ts:92` (spinner `setInterval`) | không áp dụng | Spinner vẽ lại theo nhịp, không phải debounce. |
| `delay`, `timeout`, `withTimeout`, `retry`, `Mutex`, `Semaphore`, `limitAsync`, `allKeyed` | — | không có chỗ tương ứng | Không có timeout, retry hay giới hạn song song nào viết tay. `fetchText` (`commands/sync.ts:129`) không có timeout; thêm vào là tính năng mới. |
| `attempt`, `attemptAsync` | `sync/registry.ts:279-285`, `sync/workflow-meta.ts:53-65`, các `.catch(() => '')` | không đáng | Tuple `[error, value]` không gọn hơn `try/catch` một dòng. |
| `invariant`, `assert` | `presets-dir.ts:13`, `sync/registry.ts:74` | không đáng | Phần lớn lỗi là `ConfigError`, không phải `Error` trơn. |
| `defer`, `deferAsync` | `sync/skills.ts:43-56` | không áp dụng | Code chỉ dọn thư mục khi *lỗi*; `deferAsync` luôn dọn khi thoát scope, và cần cú pháp `await using`. |
| `exec` (`es-toolkit/server`) | `commands/sync.ts:110-127` (`createExec`) | **đổi hành vi** | Xem [es-toolkit/server](#es-toolkitserver-exec-và-colors). |
| `colors` (`es-toolkit/server`) | `commands/sync.ts:57`, `commands/sync.ts:62`, `commands/sync.ts:90` (`styleText`) | **đổi hành vi** | Như trên. |
| `AbortError`, `TimeoutError`, `math/*`, `bigint/*`, `fp/*`, `iterator/*`, `map/*`, `set/*` | — | không có chỗ tương ứng | Code không có phép toán số, pipeline fp hay thao tác lọc trên `Map`/`Set`. |

`packages/cli/scripts/pack-release.mjs` chỉ gọi fs, esbuild và `npm pack`, `smoke-release.sh` là shell,
`react-devtools-stub.js` là stub rỗng. Cả ba không có chỗ nào khớp.

## Những chỗ đổi hành vi

### kebabCase trong `ap init`

`init()` chỉ kiểm tra `NAME_PATTERN` (`/^[a-z0-9]+(-[a-z0-9]+)*$/`, `init/index.ts:7`) khi có `--name`
(`init/index.ts:16`). Tên suy từ thư mục không được kiểm tra lại, và `ap sync` cũng không đọc `metadata.name` (trong
`src/sync` không có chỗ nào đọc nó). Hàm hiện tại chỉ giữ `[a-z0-9]`, nên output luôn hợp lệ. `kebabCase` của
es-toolkit thì tách theo `\p{Lu}?\p{Ll}+|[0-9]+|…|\p{L}+` (`dist/string/words.mjs`) và giữ nguyên chữ Unicode. Chạy
`init()` thật với hàm local được thay bằng `import { kebabCase } from 'es-toolkit'` **(probe)**:

| Thư mục | Hiện tại | es-toolkit `kebabCase` | `kebabCase(deburr(…))` |
|---|---|---|---|
| `Dự Án` | `d-n` | `dự-án`: ghi vào Config, sai schema | `du-an` |
| `MyProject` | `myproject` | `my-project` | `my-project` |
| `My Project v2` | `my-project-v2` | `my-project-v-2` | `my-project-v-2` |
| `v1.2.3` | `v1-2-3` | `v-1-2-3` | `v-1-2-3` |
| `x😀y` | `x-y` | `x-😀-y`: sai schema | `x-😀-y`: sai schema |
| `日本語` | lỗi "cannot derive a Config name …; pass --name" | `日本語`: ghi vào Config, sai schema | `日本語`: sai schema |

Lỗi này âm thầm: `ap init` in `created agent-plugins.yaml`, và chỉ editor dùng `config.schema.json`
(`$defs/name.pattern` trong `preset.schema.json`) mới đánh dấu. Test `init.test.ts:19` (`My_Cool.Repo` →
`my-cool-repo`) cho cùng kết quả ở cả hai hàm nên không bắt được. Tên thư mục có số dính chữ (`v2`, `v1.2.3`) cũng bị
tách khác đi. Muốn dùng `kebabCase` thì phải kiểm tra lại `NAME_PATTERN` cho cả tên suy ra, và chấp nhận đổi cách tách
từ. Bản thân `deburr` là một cải tiến riêng, không cần `kebabCase` (`local(deburr('Dự Án'))` = `du-an`) **(probe)**.

### groupBy trả object: thứ tự key dạng số

`groupBy` của es-toolkit trả một object thường (`const result = {}`, `dist/array/groupBy.mjs`). Object liệt kê key
dạng chỉ số mảng (`"7"`, `"123"`) trước, theo thứ tự tăng dần, rồi mới tới các key chuỗi theo thứ tự chèn. Còn `Map`
giữ đúng thứ tự chèn. Chạy `mergeLayers` thật với năm MCP server theo thứ tự `github, context7, 2fa, 7, sentry`
**(probe)**:

- `Map` viết tay (hiện tại): `["github","context7","2fa","7","sentry"]`
- `groupBy` của es-toolkit: `["7","github","context7","2fa","sentry"]`

Thứ tự này đi thẳng vào thứ tự action `add`, vào report và vào `mcpServers` trong Lock/State. `collect-items.ts:171`
cũng vậy: `ITEM_NAME` (`/^[A-Za-z0-9][A-Za-z0-9._-]*$/`) chấp nhận tên toàn chữ số cho Skill, Agent và Workflow. Key
`__proto__` còn tệ hơn: `groupBy` gán `result['__proto__'] = []`, tức đổi prototype, và nhóm đó biến mất khỏi
`Object.keys` **(probe)**. Thư viện `yaml` giữ `__proto__` như một key thường trong map `mcpServers` **(probe)**.
`Map.groupBy` (built-in) không có hai vấn đề này; `Object.groupBy` tạo object prototype `null` nên giữ được
`__proto__`, nhưng vẫn đảo thứ tự key số.

### sortBy thay localeCompare trong `workflows.ts`

`findWorkflows` (`workflows.ts:50`) và `listInstalledWorkflows` (`workflows.ts:60`) sắp xếp bằng `localeCompare`, tức
collation ICU theo locale của máy. `sortBy` dùng `<`/`>`, tức thứ tự code unit
(`dist/_internal/compareValues.mjs`). Chạy hai hàm thật trên cùng một thư mục **(probe)**:

- Installed workflow `deploy` có hai file `b.js` và `B.js` (không có `deploy.js`). `localeCompare` chọn `b.js` làm
  Installed workflow, còn thứ tự code unit chọn `B.js`. Hai file khác nội dung, nên sha256, việc adopt và file bị xoá
  khi `removeWorkflow` đều đổi theo.
- Thứ tự Source catalog của `audit, deploy, Deploy-prod, Zeta, zeta2` là `["audit","deploy","Deploy-prod","Zeta","zeta2"]`
  với `localeCompare`, và `["Deploy-prod","Zeta","audit","deploy","zeta2"]` với `sortBy`. Danh sách `names` này được ghi
  vào Lock (`workflowSources`), nên Lock sẽ đổi dù không có gì khác thay đổi.

Ngược lại, thứ tự hiện tại *phụ thuộc locale*. Với `LC_ALL=sv_SE.UTF-8`, `ä` xếp sau `z`, và với `tr_TR.UTF-8` thì thứ
tự của `i`, `I`, `ı` đổi **(probe)**. `sortBy` cho thứ tự cố định trên mọi máy. Đổi hay không là một quyết định, không
phải một phép thay thế tương đương.

### compact: trùng tên, khác nghĩa

`compact` trong `store.ts:263` bỏ các *field* rỗng khỏi một object (`Object.entries` rồi lọc `v?.length`).
`compact` của es-toolkit bỏ phần tử *falsy* khỏi một mảng (`dist/array/compact.mjs`). Gọi nó với object Lock thì trả
`[]` **(probe)**. Hàm tương ứng là `pickBy(fields, (v) => !!v?.length)` **(probe)**. Nếu import es-toolkit ở `store.ts`,
tên `compact` sẽ gây nhầm lẫn.

### pick: `in` so với `Object.hasOwn`

`pick` local (`plan.ts:98`) lọc bằng `k in fields`, tức tính cả key kế thừa từ prototype, rồi ghép lại bằng
`Object.fromEntries`. `pick` của es-toolkit lọc bằng `Object.hasOwn` rồi gán `result[key] =`. Với input thật
(`entry.extras` đọc bằng `JSON.parse`, key lấy từ `declaration.extras`, mà `spec.ts` chỉ cho phép `autoUpdate`), hai hàm
cho cùng kết quả **(probe)**. Chúng chỉ khác ở biên **(probe)**:

- key `toString`: bản local lấy cả hàm `Object.prototype.toString`, còn es-toolkit bỏ qua;
- own key `__proto__` (được `JSON.parse` tạo ra): bản local giữ nó thành own property, còn es-toolkit đổi prototype của
  object kết quả.

### isPlainObject ở `registry.ts:250` và `spec.ts:315`

Hai chỗ này kiểm tra `x && typeof x === 'object'` mà không loại mảng.

- `registry.ts:250`: nếu `mcpServers` trong `plugin.json` của một plugin là một mảng (manifest sai), bản hiện tại trải
  mảng đó ra thành key `"0"`, `"1"` và tạo cảnh báo trùng tên với MCP server `"0"`. `isPlainObject` bỏ qua mảng
  **(probe)**.
- `spec.ts:315` (`checkSpecKeys`): với `spec: [a]`, bản hiện tại báo ``unknown key `spec.0`; a Config's spec takes …``.
  Dùng `isPlainObject` thì `checkSpecKeys` bỏ qua, và lỗi đến từ zod: `` `spec` must be a map `` **(probe)**, chạy trên
  `presetRefs` và `readDeclarations` thật. Message mới dễ hiểu hơn, nhưng vẫn là một thay đổi output.

### isEqual so với isDeepStrictEqual

Code dùng `isDeepStrictEqual` của `node:util` ở 10 chỗ. `isEqual` của es-toolkit khác nó ở các điểm sau **(probe)**:

| Cặp | `isDeepStrictEqual` | `isEqual` |
|---|---|---|
| `-0` và `0` (cả `-0` do `yaml` parse ra) | `false` | `true` |
| `Object.create(null)` và `{}` cùng field | `false` | `true` |
| `[1,,3]` và `[1,undefined,3]` | `false` | `true` |
| `{ a: undefined }` và `{}`, `NaN` và `NaN`, thứ tự key | giống nhau | giống nhau |

Ví dụ thực tế: một MCP server khai báo `-0` trong YAML được `JSON.stringify` ghi thành `0`. Đọc lại thì `sameMcp` hiện
tại thấy khác nên lần Sync nào cũng lên kế hoạch `update`, còn `isEqual` thì thấy bằng nhau. `isEqual` còn kéo theo
`compat/_internal/*`, thêm +7 049 byte (plain) **(probe)**. Built-in đã có sẵn và không tốn byte nào.

### memoize chỉ nhận một tham số

`sharedFetcher` (`index.ts:554`) cache theo `(source, commit)`, và key bỏ qua `path` trừ khi source là `directory`.
`memoize` của es-toolkit chỉ truyền tham số đầu tiên cho cả `fn` lẫn `getCacheKey` (`dist/function/memoize.mjs`). Gọi
`f('x','c1')` rồi `f('x','c2')` trả cùng một kết quả, và `commit` trở thành `undefined` **(probe)**. Muốn dùng thì phải
gói hai tham số thành một tuple, và khi đó code dài hơn `Map` hiện tại.

### es-toolkit/server: exec và colors

- `exec` so với `createExec` (`commands/sync.ts:110`), với cùng các lệnh **(probe)**:
  - Lệnh không tồn tại: `createExec` resolve `{ code: 127, stderr: 'spawn … ENOENT' }`, nên `registry.ts` báo lỗi theo
    luồng thường. `exec` reject với `Error: ENOENT`, kể cả khi `throwOnNonZeroExitCode: false`.
  - Tiến trình bị kill bởi signal: `createExec` trả `code: 1` (`code ?? 1`), còn `exec` trả `exitCode: null`.
  - `exec` gom stdout/stderr bằng `stream.toArray()` (`dist/server/exec.mjs`), nên không thể vừa gom vừa đẩy ra stderr
    như `--verbose` đang làm.
- `colors.red(…)` luôn bọc mã ANSI (`dist/server/colors/_internal/wrapAnsi.mjs`). `styleText(format, text, { stream })`
  kiểm tra stream có phải TTY không và đọc `NO_COLOR`, `NODE_DISABLE_COLORS`, `FORCE_COLOR`, hành vi có từ v22.8.0
  ([util.styleText](https://nodejs.org/docs/latest-v22.x/api/util.html#utilstyletextformat-text-options)). Khi pipe
  output (`ap sync --dry-run | tee …` trong `smoke-release.sh`), `styleText` trả text trơn, còn `colors.red` vẫn trả
  `\u001b[31mx\u001b[39m`, kể cả khi đặt `NO_COLOR=1`. Kết quả này giống nhau trên Node 22.23.3 và 24.20.0 **(probe)**.

### mapAsync và filterAsync đổi tuần tự thành song song

Khi không truyền `concurrency`, các hàm này là `Promise.all(array.map(fn))`. Các vòng `for … await` trong code chạy
tuần tự, và `findWorkflows` (`workflows.ts:43`) dựa vào thứ tự đó để báo đúng cặp file trùng tên. Đổi sang `mapAsync`
là đổi mô hình chạy: thứ tự I/O thay đổi, và lỗi đầu tiên không còn chặn các bước sau.

### Test hiện có không bắt được các thay đổi trên

Bản sao thứ hai của `src` áp thêm tám chỗ thay đổi hành vi lên bản đã viết lại:

- `sortBy` ở `workflows.ts:50` và `workflows.ts:60`;
- `groupBy` ở `merge.ts:147` và `merge.ts:262`;
- `kebabCase` ở `init/index.ts`;
- `isPlainObject` ở `spec.ts:315` và `registry.ts:250`;
- `isEqual` ở `identity.ts:6`.

Bản này vẫn typecheck sạch và qua cả 487 test **(probe)**. Nếu thay thật, mỗi chỗ đổi hành vi cần một test riêng.

## Kiểu dữ liệu

Probe typecheck bằng `tsc` 7.0.2 của repo, cùng `compilerOptions` với `packages/cli/tsconfig.json` (`target: ES2023`,
`strict`, `noUncheckedIndexedAccess`):

- **`omit` trên kiểu có index signature làm mất field.** `omit(source, ['ref'])` với `MarketplaceSource = { source:
  string; [field: string]: unknown }` cho ra `Omit<MarketplaceSource, 'ref'>`. `keyof` của kiểu này là `string`, nên
  `source` biến mất và TS2741 báo "Property 'source' is missing" **(probe)**. `withoutRef` phải cast lại `as ItemSource`.
  Với kiểu không có index signature (`PluginContribution`, `ManagedItem`, `HookGroup`) thì `omit` giữ đúng kiểu.
- **`isPlainObject` thu hẹp về `Record<PropertyKey, any>`** (`dist/predicate/isPlainObject.d.mts`). Nhờ đó bỏ được cast
  `as SettingsHooks` ở `hooks.ts:113`, nhưng `any` lọt vào: `x.whatever.deep.chain` vẫn typecheck **(probe)**.
- **`sortBy<T extends object>`** không nhận `string[]` (TS2345) **(probe)**.
- **`partition`** có overload type-guard trả `[U[], Exclude<T, U>[]]`, nên `merge.ts:41` giữ được kiểu **(probe)**.
- **`isNotNil`** và **`isSubset`** bỏ được ba type-guard viết tay (`(n): n is string => n !== null`) và một cast
  `p as string` **(probe)**.
- **`groupBy`** trả `Record<K, T[]>`; với `noUncheckedIndexedAccess`, truy cập trực tiếp ra `T[] | undefined` **(probe)**.
- Tổng kết trên bản viết lại 56 chỗ: typecheck sạch sau khi thêm 1 cast (`identity.ts`) và xoá hàm `pick` local của
  `plan.ts` (trùng tên với import, TS2440). Bản này bỏ được 5 cast hoặc type-guard **(probe)**.

## Built-in của Node nên dùng thay es-toolkit

Mức sàn là `engines.node: ">=22"` (`packages/cli/package.json`). Cột "Node" lấy từ `@mdn/browser-compat-data` 8.1.3
(`version_added` của `nodejs`) và đã được kiểm tra trên Node v22.23.3 **(probe)**. Cột "lib TS" là mức `lib` cần có để
typecheck, trong khi `tsconfig.json` hiện chỉ có `target: ES2023`.

| Nhu cầu | Built-in | Node | lib TS | Thay cho es-toolkit | Ghi chú |
|---|---|---|---|---|---|
| So sánh sâu | `util.isDeepStrictEqual` ([docs](https://nodejs.org/docs/latest-v22.x/api/util.html#utilisdeepstrictequalval1-val2)) | có từ lâu | `@types/node` | `isEqual` | Đang dùng; khác `isEqual` như bảng ở trên. |
| Nhóm theo key, giữ thứ tự chèn | `Map.groupBy` | 21.0.0 | `es2024` | `groupBy` | Không có vấn đề key số hay `__proto__`. Với `target: ES2023` hiện tại thì báo TS2550 **(probe)**. |
| Nhóm ra object | `Object.groupBy` | 21.0.0 | `es2024` | `groupBy` | Prototype `null`; vẫn đảo thứ tự key số **(probe)**. |
| Hiệu, giao, hợp tập | `Set.prototype.difference`, `intersection`, `union`, `isSubsetOf` | 22.0.0 | `es2025` | `difference`, `intersection`, `union`, `isSubset` | Hợp với các chỗ đã có sẵn `Set`: `init/index.ts:64`, `registry.ts:221`, `workflows.ts:124-127`. Trả `Set`, giữ thứ tự chèn. TS2550 với lib hiện tại **(probe)**. |
| Sắp xếp không mutate | `Array.prototype.toSorted` | 20.0.0 | `es2023` | `sortBy`, `orderBy` | Đã dùng ở `spec.ts:275`. |
| Phần tử cuối, tìm từ cuối | `Array.prototype.at`, `findLast` | 16.6.0, 18.0.0 | `es2022`, `es2023` | `last`, `fp/findLast` | Đã dùng (`index.ts:354`, `spec.ts:301`). |
| Clone sâu | `structuredClone` ([docs](https://nodejs.org/docs/latest-v22.x/api/globals.html#structuredclonevalue-options)) | 17.0.0 | DOM/`@types/node` | `cloneDeep` | Code hiện không clone sâu ở đâu. |
| Chờ | `setTimeout` của `node:timers/promises` ([docs](https://nodejs.org/docs/latest-v22.x/api/timers.html#timerspromisessettimeoutdelay-value-options)) | có từ lâu | `@types/node` | `delay` | Code hiện không chờ ở đâu. |
| Tô màu terminal | `util.styleText` | 20.12.0 / 21.7.0; tự nhận TTY từ 22.8.0 | `@types/node` | `server/colors` | Đang dùng; hành vi tốt hơn `colors`. |
| Resolver, gom async iterable | `Promise.withResolvers`, `Array.fromAsync`, iterator helpers (`Iterator.prototype.toArray`, …) | 22.0.0 | `es2024`/`esnext` | `server/exec` (bên trong), `iterator/*` | |
| Không có trên Node 22 | `RegExp.escape` (24.0.0), `Promise.try` (23.0.0), `Error.isError` (24.3.0) | — | — | `escapeRegExp`, `attempt`, `isError` | Chưa dùng được với mức sàn hiện tại **(probe)**. |

Như vậy phần lớn nhu cầu về tập hợp và nhóm có built-in tương ứng trên Node 22. Chi phí là nâng `lib` trong
`tsconfig.json` lên `ES2024` hoặc `ES2025`. Đổi `lib` không ảnh hưởng tới bundle, vì esbuild dùng `target: node22` riêng.

## Kích thước bundle

Đo bằng script dựng lại đúng các tuỳ chọn của `packages/cli/scripts/pack-release.mjs`: `bundle`, `platform: node`,
`format: esm`, `target: node22`, `minify: false`, `legalComments: none`, alias `react-devtools-core`, `define`
`NODE_ENV` và banner `createRequire`. Output ghi vào scratch. Release tarball dùng bản **không minify**
(`pack-release.mjs:22`); hai cột minify và gzip chỉ để tham khảo.

| Bundle | Plain (byte) | Minify | gzip (của bản minify) |
|---|---|---|---|
| `src/release.ts` hiện tại (mốc) | 1 431 502 | 677 105 | 210 506 |
| Chỉ lát es-toolkit "tối thiểu" (`uniq, difference, partition, omit, pick`) | 1 249 | 591 | 330 |
| Chỉ lát "thực tế" (20 hàm của các chỗ tương đương) | 5 312 | 2 275 | 937 |
| Chỉ lát "tối đa" (thêm `groupBy, sortBy, kebabCase, deburr, isEqual, memoize`) | 15 435 | 7 115 | 2 715 |
| Chỉ `isEqual` | 7 120 | 3 474 | 1 359 |
| Chỉ `kebabCase` + `deburr` | 1 559 | 1 021 | 553 |
| Chỉ `sortBy` | 1 416 | 553 | 344 |

Số byte thật tăng thêm trên `dist/ap.js` **(probe)**:

| Cách đo | Plain | Minify | gzip |
|---|---|---|---|
| Mốc + import lát "thực tế" (không xoá code nào) | +5 291 | +2 192 | +755 |
| Mốc + import lát "tối đa" | +15 513 | +7 090 | +2 468 |
| Bản sao `src` viết lại 56 chỗ tương đương, so với bản sao chưa sửa | **+3 558** (+0,25%) | +839 | +412 |
| Như trên, thêm 8 chỗ đổi hành vi (`sortBy` ×2, `groupBy` ×2, `kebabCase`, `isPlainObject` ×2, `isEqual`) | +11 970 (+0,84%) | +4 584 | +1 683 |

Bản sao trong scratch có mốc plain là 1 428 378 byte, khác mốc 1 431 502 của repo chỉ vì bản không minify chèn comment
đường dẫn (`// ../node_modules/...`) dài ngắn khác nhau. Bản minify của hai mốc bằng nhau (677 105). Bundle của bản viết
lại chỉ chứa đúng 19 module es-toolkit được import (`array/uniq.mjs`, `object/omit.mjs`, …), vì package khai báo
`sideEffects: false` và export ESM (`exports["."].import` trỏ tới `dist/index.mjs`) **(probe)**. Đem so với bài
[spec-validation-libraries](spec-validation-libraries.md): lát "thực tế" nhỏ hơn cả valibot (~17 KB).

## Hiệu năng

Micro-benchmark với cỡ dữ liệu `ap` gặp thật (30 tên hoặc object), Node v24.20.0. Mỗi ô là trung vị của 7 lần chạy,
mỗi lần 200 000 vòng; đơn vị ns mỗi lời gọi **(probe)**:

| Phép | Viết tay | es-toolkit | Built-in |
|---|---|---|---|
| `[...new Set]` / `uniq` | 956 | 982 | — |
| `filter(!includes)` / `difference` | 2 146 | 829 | — |
| `Map` + spread copy / `groupBy` / `Map.groupBy` | 2 189 | 922 | 1 013 |
| rest destructuring / `omit` | 43 | 202 | — |
| hai `filter` / `partition` | 383 | 225 | — |

Chênh lệch lớn nhất là khoảng 1,3 µs cho mỗi lời gọi. Một lần Sync gọi các hàm này cỡ vài trăm lần, tức vài trăm µs,
trong khi mỗi bước đều spawn `claude` hoặc `git`, và riêng `git --version` đã mất khoảng 2,2 ms (trung vị 10 lần)
**(probe)**. Ở cỡ dữ liệu này hiệu năng không phải lý do để chọn hay bỏ es-toolkit.

es-toolkit tự nhận "2-3 times faster runtime performance" và "an average of 2× performance improvement compared to
alternative libraries like lodash. Some functions achieve up to an 11× performance gain"
([intro](https://es-toolkit.dev/intro.html), [performance](https://es-toolkit.dev/performance.html)). Đây là tuyên bố
của chính dự án, đo trên es-toolkit 1.49.0 so với lodash 4.18.1, Node v24.11.1, Windows. Nó so với lodash chứ không so
với code viết tay, và chính bảng đó ghi `union` 0.8× và `groupBy` 1.0×.

## Bảo trì

- **Giấy phép:** MIT, "Copyright (c) 2024 Viva Republica, Inc." (`es-toolkit@1.52.0/LICENSE`). Maintainer trên npm là
  các tài khoản của Toss: `toss-build-bot`, `raon0211`, `toss-public` (`npm view es-toolkit maintainers`).
- **Phụ thuộc:** không có `dependencies`, `peerDependencies` hay `engines` (`npm view es-toolkit@1.52.0 …`). Code đã
  build dùng `Object.hasOwn`, `Promise.withResolvers` (`server/exec`), đều có trên Node 22.
- **Nhịp phát hành:** 17 bản stable trong 12 tháng (từ 1.40.0 ngày 2025-10 tới 1.52.0 ngày 2026-08-28), cộng một kênh
  `dev` gần như mỗi ngày (`1.52.0-dev.2116`, 2026-09-19). Changelog bắt đầu từ v1.0.2 (2024-05-31); hai bản 1.0.0 (2019)
  và 1.0.1 (2023) trên registry có trước đó (`npm view es-toolkit time`, `CHANGELOG.md`).
- **Tính ổn định giữa các bản minor:** v1.52.0 ghi "Fixed `omitBy` and `pickBy` to type numeric callback keys as
  strings". Mục `compat` của cùng bản ghi "results may differ if you relied on the previous output"
  (`CHANGELOG.md`). Nghĩa là kiểu dữ liệu, và với `compat` là cả kết quả, có thể đổi khi lên minor. Muốn tránh thì pin
  bản chính xác.
- **ESM và tree-shaking:** `exports` có nhánh `import` (`.mjs` + `.d.mts`) và `require` cho mỗi subpath, cùng
  `sideEffects: false`. Tarball nặng 4,2 MB unpacked với 4 255 file (`dist.unpackedSize`, `dist.fileCount`), nhưng theo
  ADR 0008, Release tarball chỉ chứa phần đã bundle nên không có `dependencies` mới. `smoke-release.sh` đã kiểm tra điều
  này.
- **Docs:** mỗi hàm có một trang reference (ví dụ
  [kebabCase](https://es-toolkit.dev/reference/string/kebabCase.html)), nhưng các trang không nói tới thứ tự key của
  `groupBy` hay chuyện `Object.hasOwn` trong `pick`. Những điểm này chỉ thấy khi đọc source trong tarball.

## Cách đo

Thư mục scratch `est/` có `es-toolkit@1.52.0` và `esbuild@0.28.2` (`npm i es-toolkit esbuild`). `n22/` có `node@22`
(`npm i node@22`, cho v22.23.3). `bcd/` có `@mdn/browser-compat-data` 8.1.3. Không cài gì vào repo.

1. Danh sách export:
   ```sh
   node -e "console.log(Object.keys(require('es-toolkit')).length)"   # 199
   node -e "const r=new Set(Object.keys(require('es-toolkit'))); for (const s of ['bigint','fp','fp/iterator','iterator','map','set','server']) console.log(s, Object.keys(require('es-toolkit/'+s)).filter(k=>!r.has(k)))"
   ```
2. Hành vi (`node p-semantics.mjs`): so hàm viết tay chép nguyên văn từ `src` với hàm es-toolkit trên cùng input.
   Gồm: `compact`/`pickBy`; `localeCompare`/`sortBy`; `pick` với `autoUpdate`, `toString`, `__proto__`; `groupBy` với tên
   `github, 2fa, 123, context7, 7` và `__proto__`; `countBy`; `isDeepStrictEqual`/`isEqual`; `isPlainObject` với `{}`,
   `[]`, `null`, `Object.create(null)`, `Date`, class instance; `isEmptyObject`; `trimEnd`; `uniq`, `union`,
   `difference`, `intersection`, `without` có `NaN` và object; `partition`, `uniqBy`, `memoize`. Locale:
   `LC_ALL=<l> node -e "…localeCompare…"` với `C`, `en_US`, `sv_SE`, `tr_TR`.
3. Code thật: copy `packages/cli/src` vào scratch, dùng `sed` thay đúng một chỗ, rồi bundle file đó bằng
   `esbuild <file> --bundle --platform=node --format=esm --target=node22` và gọi hàm export:
   - `init()` với các thư mục `Dự Án`, `MyProject`, `x😀y`, `日本語` (`p-init.mjs`);
   - `presetRefs` và `readDeclarations` với `spec: [a]` (`p-spec.mjs`);
   - `mergeLayers` với năm MCP server (`p-merge.mjs`);
   - `listInstalledWorkflows` và `findWorkflows` trên một thư mục tạm (`p-workflows.mjs`);
   - `createExec` so với `exec` với `exit 3`, lệnh không tồn tại và `kill -TERM $$` (`p-exec.mjs`);
   - `styleText` so với `colors.red` khi pipe, với `NO_COLOR=1`, và dưới `script -qc` để có TTY (`p-color.mjs`).
4. Viết lại toàn bộ: `size/rewrite.mjs` áp 56 thay thế tương đương (thay chuỗi chính xác, thêm `import { … } from
   'es-toolkit'`) trên bản sao `real/rw`. `size/rewrite-changing.mjs` áp thêm các thay thế đổi hành vi lên `real/rw2`.
   `real/node_modules` là symlink tới `packages/cli/node_modules/*` cộng `es-toolkit`. Sau đó chạy:
   ```sh
   packages/cli/node_modules/.bin/tsc -p real/tsconfig.json          # cùng compilerOptions với packages/cli/tsconfig.json
   node real/node_modules/vitest/vitest.mjs run --root real/rw       # 487 passed; 2 file lỗi đường dẫn ở cả bản gốc
   node real/node_modules/vitest/vitest.mjs run --root real/rw2      # 487 passed
   ```
5. Kiểu dữ liệu: `typ/probe.ts` gồm từng thay thế trên kiểu thật (`MarketplaceSource`, `Layer`, `PluginContribution`, …)
   cộng `Object.groupBy`, `Map.groupBy`, `Set#union`, chạy `tsc -p typ` với `tsconfig` sao từ repo.
6. Kích thước (`node size/bundle.mjs`, `node size/net.mjs`):
   ```js
   await build({ entryPoints, outfile, bundle: true, platform: 'node', format: 'esm', target: 'node22', minify,
     legalComments: 'none', alias: { 'react-devtools-core': '<cli>/scripts/react-devtools-stub.js' },
     define: { 'process.env.NODE_ENV': '"production"' },
     banner: { js: "import { createRequire as __apCreateRequire } from 'node:module'; const require = __apCreateRequire(import.meta.url);" } })
   // "chỉ lát": entry là `export { … } from 'es-toolkit'`
   // "mốc + lát": entry là `export * from '<cli>/src/release.ts'; export { … } from 'es-toolkit'`
   // "viết lại": entry là real/src/release.ts và real/rw/release.ts
   // in ra byte của bản plain, bản minify và gzipSync(bản minify)
   ```
7. Hiệu năng (`node p-perf.mjs`): `process.hrtime.bigint()`, 200 000 vòng, trung vị của 7 lần. Spawn:
   `execFileSync('git', ['--version'])`, trung vị 10 lần.
8. Built-in: `node builtins.mjs` và `n22/node_modules/.bin/node builtins.mjs` kiểm tra `typeof` từng API. Phiên bản lấy
   từ `require('@mdn/browser-compat-data').javascript.builtins.<X>.<m>.__compat.support.nodejs.version_added`.

## Câu hỏi còn mở

- Với các chỗ đã có `Set` (`init/index.ts:64`, `registry.ts:221`, `workflows.ts:124-127`) và các chỗ nhóm theo key,
  nên nâng `lib` lên `ES2025` để dùng `Set#difference` và `Map.groupBy`, hay dùng es-toolkit? Nâng `lib` không tốn byte
  nào nhưng đổi cấu hình typecheck của cả package.
- Thứ tự `localeCompare` hiện phụ thuộc locale của máy. Đó có phải ý đồ không? Nếu không, đổi sang thứ tự code unit (có
  hoặc không có `sortBy`) sẽ làm thay đổi Lock và có thể đổi Installed workflow của những người đang có file trùng tên
  khác hoa thường. Cần một ADR hoặc một ghi chú migration.
- `ap init` có nên `deburr` tên thư mục (`Dự Án` → `du-an` thay vì `d-n`) và kiểm tra lại `NAME_PATTERN` cho tên suy
  ra không? Câu hỏi này độc lập với việc có dùng es-toolkit hay không.
- `sameMcp` với `-0` trong YAML (lần Sync nào cũng `update`) là một lỗi hiện có hay chỉ là trường hợp lý thuyết? Chưa
  thử với `claude mcp add-json` thật.
- Chưa đo: thời gian typecheck của TypeScript 7 khi thêm `.d.mts` của es-toolkit; chưa thử `es-toolkit/fp` hay
  `es-toolkit/iterator` vì code không có pipeline tương ứng.
