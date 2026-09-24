# Kiểm tra shape của `spec.*` bằng `zod/mini`

Phần kiểm tra shape trong parser `spec.*` (`packages/cli/src/sync/spec.ts`) chuyển từ code viết tay sang schema `zod/mini` (Zod 4). Parser chạy hai bước:

- **Bước 1: shape.** Một lần `safeParse` đồng bộ kiểm tra kiểu, field lạ và các luật giữa các field trong cùng một entry (`scope: user` cần `enabled: true`, không có `skills` cùng `exclude`, directory source không được User-scoped, `path` nằm trong source). Bước này thay luôn `itemsPath` và `checkHook`.
- **Bước 2: ngữ nghĩa.** Code thường, chỉ chạy khi shape đã hợp lệ: `parseShorthand` (stat filesystem), tra MCP catalog, `checkMcp`, `projectRelativePath` và `normalizeMcp`.

Lý do để các bước bất đồng bộ ở ngoài schema: Zod xếp lỗi của bước async theo lúc chạy xong, nên thứ tự lỗi sẽ không cố định. Ngoài ra `checkMcp` phải chạy trên config lấy từ MCP catalog, mà config đó chỉ có sau bước tra.

`ap` báo **mọi** lỗi của một file, mỗi lỗi một dòng `<file>: <message>`, theo thứ tự cố định. Ở bước 1, lỗi được xếp theo entry (marketplace, plugin, item entry, MCP server, Hook) theo thứ tự trong file; trong mỗi entry, lỗi field lạ đứng trước, để một lỗi gõ như `enable` được báo đúng là field lạ. Ở bước 2, các lỗi được gom bằng `Promise.allSettled` và in theo thứ tự entry trong file. Lỗi ngữ nghĩa chỉ được báo khi file không còn lỗi shape nào. Giữa các Preset, thứ tự lỗi vẫn như cũ.

JSON schema cho editor (`config.schema.json`, `preset.schema.json`) vẫn viết tay, và contract test `spec-schema.test.ts` vẫn giữ nguyên. `PRESET_SPEC_KEYS`/`CONFIG_SPEC_KEYS` được lấy từ key của schema Zod, nên danh sách key chỉ khai báo ở một chỗ.

Quyết định này đảo lại lựa chọn "không dùng thư viện" trong `.scratch/spec-schema-contract/spec.md`. Research: [spec-validation-libraries.md](../research/spec-validation-libraries.md). Các số đo trong ADR này lấy từ một bản thử viết lại toàn bộ `spec.ts` bằng `zod/mini` và zod classic; bản thử đã bị xoá sau khi triển khai xong. So với các lý do đã bác bỏ trước đây:

- **Mất message có tiền tố origin:** không còn đúng. Mỗi chỗ trong schema tự khai báo message của nó, và một formatter khoảng 30 dòng ghép `<origin>:` cùng tên entry từ issue path. Mọi message cũ giữ nguyên từng chữ.
- **Thêm runtime dependency vào Release tarball ([ADR 0008](0008-distribute-ap-via-github-release-tarball.md)):** Zod được bundle như mọi dependency khác, nên nằm ở `devDependencies`. `dist/ap.js` tăng +56 KB (không minify), `ap.tgz` tăng +12 KB.
- **Semantic check không biến mất:** vẫn đúng. Chúng nằm ở bước 2 như code thường.
- **Sinh JSON schema sẽ mất `oneOf` có title và `if/then`:** vẫn đúng, nên không sinh schema.

## Considered Options

- Giữ parser viết tay — bị loại. Kiểu dữ liệu phải viết tay tách rời code kiểm tra. Có những đầu vào làm `ap` crash (`marketplaces: { acme: null }`) hoặc lọt qua mà không báo gì (marketplace thiếu `source`, `autoUpdate: 'yes'`). Muốn báo nhiều lỗi thì phải tự viết lại phần lõi của một thư viện validation.
- Zod classic — bị loại. Bundle nặng thêm +190 KB so với +56 KB của `zod/mini`, và typecheck chậm hơn gần gấp đôi (0,50 s so với 0,32 s), trong khi khả năng kiểm tra như nhau.
- valibot — nhỏ hơn (+17 KB cho lát cắt `plugins`), nhưng tính message trước khi path được gắn, nên phải ghép tiền tố sau khi parse xong. Chọn Zod 4 vì quen hơn và error map thấy đủ path.
- Sinh JSON schema từ Zod (`z.toJSONSchema`) — bị loại: bị lỗi với `preprocess`, âm thầm bỏ refinement, và union ra `anyOf`.
- Đặt bước async trong schema (`pipeAsync`/`superRefine` async) — bị loại vì thứ tự lỗi phụ thuộc thời điểm chạy xong.

## Consequences

- Người dùng thấy mọi lỗi của một file trong một lần chạy thay vì từng lỗi một. `ConfigError` chứa được nhiều message.
- Các đầu vào trước đây làm crash hoặc lọt qua giờ bị từ chối, cần thêm 7 message mới: entry `null`, marketplace map-form thiếu `source` hoặc có `source` là chuỗi, `autoUpdate` không phải boolean, `spec` không phải map, `presets`/`extends` không phải chuỗi. `plugins: false`, `0` hay `''` trước được hiểu là rỗng, giờ là lỗi. JSON schema vốn đã từ chối tất cả các giá trị này.
- `Selection`, `HookGroup`/`HookHandler` và `PluginDeclaration` được suy ra từ schema. Các kiểu khác trong `types.ts` vẫn viết tay: MCP config, source (do `parseShorthand` tạo ra) và các field thêm sau khi đọc (`origin`, `presets`, `shadows`).
- `checkHook` bị xoá khỏi `hooks.ts`.
- Thêm một key `spec.*` vẫn phải sửa schema Zod và hai file JSON schema. Contract test sẽ chỉ ra chỗ nào bị quên.
