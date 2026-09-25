# JSON schema là file thường ở `schemas/`, không phải package

Ba JSON schema viết tay (`config.schema.json`, `preset.schema.json`, `mcp-catalog.schema.json`) nằm ở `schemas/` tại
root repo. Trước đây chúng nằm ở `packages/schemas/schemas/` kèm một `package.json` rỗng do `npm init` tạo ra.

`packages/schemas` chưa bao giờ là package thật: không có code, không build, không publish, và không package nào khai
báo phụ thuộc vào nó. CLI không import schema lúc chạy. Validation thật nằm ở parser `spec.*`
([ADR 0015](0015-zod-mini-for-spec-shape.md)), và ADR đó đã loại bỏ việc sinh JSON schema từ Zod. Schema chỉ có hai
người dùng: editor (qua modeline `yaml-language-server`) và các contract test (`spec-schema.test.ts`,
`mcp-catalog.test.ts`). Cả hai đều đọc file theo đường dẫn.

## URL là contract

`ap init` ghi vào mỗi Config mới một modeline trỏ tới
`https://raw.githubusercontent.com/ttungbmt/agent-plugins/master/schemas/config.schema.json`. Từ lúc đó, đường dẫn
này nằm trong repo của người dùng, và dời file sẽ làm editor của họ mất validation mà không báo gì. Đừng dời hay đổi
tên các file trong `schemas/` nếu không có ADR mới.

URL trỏ vào `master`, không pin theo tag release. `dev` chỉ merge vào `master` khi release, nên `master` luôn là
schema của bản release mới nhất. Người dùng chỉ thấy schema lệch với `ap` khi chưa nâng cấp.

## Considered Options

- Biến `packages/schemas` thành package thật (`private`, có `exports`, CLI khai báo `workspace:*`) — bị loại: chỉ thêm
  cấu hình mà không công cụ nào dùng tới.
- Giữ `package.json` nhưng làm sạch — bị loại: vẫn ngầm hứa một package không tồn tại.
- Đặt schema trong `packages/cli/schemas/` và đưa vào tarball — bị loại: schema là contract chung của Config, Preset
  và MCP catalog, không phải phần nội bộ của CLI; URL cũng dài hơn.
- Giữ nguyên đường dẫn cũ, hoặc để lại stub `$ref` ở đó — bị loại: số repo đang trỏ vào URL cũ còn ít, nên chấp nhận
  làm hỏng một lần để có đường dẫn gọn.
- Pin URL theo tag `v<version>` — bị loại: `master` đã trùng với bản release mới nhất.

## Consequences

- Các Config và Preset tạo trước thay đổi này, có modeline trỏ tới `.../master/packages/schemas/schemas/...`, mất
  validation trong editor. Sửa bằng cách đổi modeline sang `.../master/schemas/...`.
- `pnpm-workspace.yaml` vẫn gom `packages/*`; `packages/` giờ chỉ chứa package thật.
- `$id` của schema đổi theo đường dẫn mới.
