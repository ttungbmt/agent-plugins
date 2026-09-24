# MCP server khai báo `scope: user` luôn được sync lên Scope `user`

Một số MCP server, như `context7`, là công cụ cá nhân mà người dùng muốn có ở mọi repo, giống lý do của [ADR 0011](0011-user-scoped-marketplace.md) và [ADR 0012](0012-user-scoped-plugin.md). Vì vậy MCP server declaration nhận thêm `scope: user`, gọi là **User-scoped MCP server**. Dù Sync nhắm Scope nào, `ap` luôn thêm, sửa và gỡ entry đó ở Scope `user` (`mcpServers` trong `~/.claude.json`) qua `claude mcp add-json/remove --scope user`.

`scope` nằm cạnh các field inline: `{ command, args, scope: user }`. Map chỉ có `{ scope: user }` nghĩa là lấy cấu hình từ MCP catalog, như `true`. `scope` chỉ nhận `user` và bị bỏ trước khi ghi. Đây là ngoại lệ có chủ đích với câu "đúng định dạng `.mcp.json`" của [ADR 0006](0006-mcp-servers-inline-plus-bundled-catalog.md): config MCP của Claude Code không có field `scope`, nên không va chạm, và cú pháp khớp với marketplace và plugin, nơi `scope` cũng nằm cạnh payload.

Luật sở hữu giữ nguyên như [ADR 0003](0003-managed-entries-per-scope-state.md), ADR 0011 và ADR 0012. Entry là Managed entry được đếm theo claim trong `~/.agent-plugins/state.json`, khóa theo (đường dẫn Config, Scope đang sync), và chỉ bị gỡ khi không còn Config nào claim. Hai Config claim cùng tên với cấu hình khác nhau là `shared-clash`: Config claim trước giữ entry, `--force` ghi đè. `scope` là một phần của khai báo khi gộp Preset. Lock không ghi entry này.

Ràng buộc:

- Server ở `user` chạy ở mọi repo mà không qua bước duyệt `.mcp.json`. Vì vậy User-scoped MCP server có nguồn gốc là Remote preset phải được xác nhận khi mới thêm hoặc đổi nội dung, dùng đúng cơ chế của Hook ([ADR 0007](0007-ap-writes-hooks-to-settings.md)): không có TTY và thiếu `--yes` → bỏ qua server đó, cảnh báo, exit code khác 0.
- `command` hoặc phần tử `args` bắt đầu bằng `./` hoặc `../` là `ConfigError`. Tài liệu Claude Code không nói server stdio ở `user` chạy ở thư mục nào, và một server dùng chung mà trỏ vào file của một repo gần như chắc chắn là khai báo nhầm.

## Considered Options

- Không thêm gì, dùng `ap sync --scope user` với Config riêng: bị loại vì cùng lý do ADR 0012.
- Bọc ngoài (`{ scope: user, server: true | {…} }`): giữ định dạng inline nguyên vẹn, nhưng dài hơn và thêm một dạng thứ tư; bị loại vì lệch với marketplace và plugin.
- `{ catalog: true, scope: user }` cho dạng catalog: rõ hơn nhưng thêm một field chỉ để phân biệt với inline; map không có `command`/`url` đã đủ phân biệt.
- Cấm `scope: user` trong Remote preset: bị loại vì quá chặt; xác nhận khi nội dung đổi là đủ, như Hook.
- Config sync sau ghi đè entry ở `user`: bị loại vì hai repo sẽ ghi đè nhau mỗi lần sync.
- Chỉ cảnh báo khi có đường dẫn tương đối: bị loại vì nới lỏng sau thì dễ, siết lại thì khó.
- `ap` ghi `disabledMcpServers` trong `~/.claude.json` khi một Config khai báo `false`: bị loại vì `ap` chỉ đọc file này (ADR 0001, ADR 0006).

## Consequences

- Một lần sync `project` hoặc `local` có thể sửa `~/.claude.json`. `--dry-run` gắn nhãn `(user)` cho các action đó, và `--check` tính entry lệch ở `user` là drift.
- MCP server không phụ thuộc gì, nên không có ràng buộc thứ tự hay trạng thái `not ready` như plugin.
- Thêm hoặc bỏ `scope: user` trên một server đang Managed ở Scope kia sẽ thêm ở Scope mới trước rồi mới gỡ ở Scope cũ. Nếu Scope cũ là `user` mà Config khác còn claim thì chỉ bỏ claim, không gỡ. Kiểm tra `cross-scope` không coi hai bản của cùng một khai báo là xung đột.
- Repo muốn opt-out thì khai báo `name: false`: chỉ claim của Config đó bị bỏ. Nếu Config khác còn giữ server ở `user`, `ap` in notice gợi ý tắt server cho repo này bằng `/mcp`. Claude Code ưu tiên Local > Project > User và thay nguyên entry, nên khai báo cùng tên ở `project` sẽ che bản ở `user`.
- Server ở `user` không nằm trong notice chờ duyệt `.mcp.json`; cảnh báo trùng tên với MCP server của plugin vẫn áp dụng.
- Khi Sync đã nhắm `user`, `scope: user` không có tác dụng.
