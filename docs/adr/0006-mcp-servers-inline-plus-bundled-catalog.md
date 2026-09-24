# MCP server: khai báo inline hoặc tra MCP catalog đi kèm `ap`

`spec.mcpServers` là map theo tên. Giá trị map là cấu hình inline đúng định dạng `.mcp.json` của Claude Code; `true` **luôn** tra MCP catalog đi kèm `ap` (một file trong `packages/cli/presets`), kể cả khi Preset cha đã định nghĩa inline cùng tên; `false` bỏ MCP server kế thừa. Không có danh mục do người dùng khai báo và không gộp field với bản trong danh mục: muốn khác thì viết inline toàn bộ. Một Preset chỉ chứa `mcpServers` inline đã là "danh mục riêng" của người dùng, nên không cần khái niệm thứ hai. Gộp và ghi đè theo [ADR 0004](0004-preset-extends-vs-config-presets.md), so trên nội dung đã phân giải.

Việc ghi giao cho `claude mcp add-json <name> <json> -s <scope>` / `claude mcp remove <name> -s <scope>` theo [ADR 0001](0001-delegate-settings-writes-to-claude-cli.md); sửa = `remove` rồi `add-json`. Vì `claude mcp get/list` không có output JSON, `ap` đọc thẳng `.mcp.json` và `~/.claude.json` để lập kế hoạch, nhưng không ghi vào chúng.

Secret chỉ được viết dạng `${VAR}`: Claude Code mở rộng placeholder ở mọi scope lúc chạy và `add-json` lưu nguyên văn, nên Lock/State và `.mcp.json` không bao giờ chứa giá trị thật. `ap` cũng không duyệt server `.mcp.json` thay người dùng (`enabledMcpjsonServers`): bước duyệt là cổng an toàn khi clone repo lạ, và nếu `ap` vượt qua thì một Remote preset chạy được lệnh tuỳ ý.

## Considered Options

- Chỉ tên trần tra danh mục (schema ban đầu) — bị loại vì mọi server mới phải chờ `ap` phát hành.
- Chỉ inline — bị loại vì server phổ biến phải chép lại ở mọi Preset.
- Tra MCP Registry chính thức — để sau: phải tự dịch `packages`/`remotes` sang cấu hình Claude Code và cần mạng lúc sync.
- `true` nghĩa là "bật định nghĩa gần nhất trong cây, không có mới tra danh mục" — bị loại vì một giá trị mang hai nghĩa, và kế thừa vốn đã nhận toàn bộ.
- `ap` tự mở rộng `${VAR}` rồi ghi giá trị thật vào scope `local`/`user` — bị loại vì secret nằm trong file, xoay token phải sync lại.
- `ap` tự ghi `enabledMcpjsonServers` — bị loại vì vượt cổng duyệt và phải tự sửa `~/.claude.json`.

## Consequences

- Đổi phiên bản một server trong danh mục là đổi nội dung; lần sync sau `remove` + `add-json` lại.
- Cấu hình inline được ghi nguyên văn; đường dẫn tương đối trong `command`/`args` được Claude Code hiểu theo gốc project, `ap` không viết lại.
- Giá trị trong `env`/`headers` trông giống secret mà không phải `${…}` → lỗi; biến chưa đặt trong môi trường lúc sync → cảnh báo.
- Tên trùng với MCP server của một plugin đang bật (đọc từ manifest của Installed plugin) → cảnh báo, không chặn.
