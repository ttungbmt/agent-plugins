# Giao việc ghi settings cho CLI `claude`

`ap sync` không tự ghi `extraKnownMarketplaces` mà gọi `claude plugin marketplace add <source> --scope <scope>` / `remove <name> --scope <scope>`. Lệnh `add` vốn đã ghi vào settings theo scope và resolve đúng tên marketplace từ `marketplace.json`; nếu `ap` cũng tự ghi thì sẽ có hai bên cùng sửa một file. Vì `add` chỉ ghi `source` và ghi đường dẫn tuyệt đối cho nguồn `directory`, `ap` bổ sung field phụ (`autoUpdate`, `ref`…) và sửa `path` về tương đối **sau** khi `add` xong.

## Considered Options

- `ap` tự ghi JSON rồi gọi `add` để cài — bị loại vì `add` ghi lại settings (mặc định vào scope user) gây xung đột.
- `ap` tự ghi JSON, không gọi `claude` — bị loại vì marketplace không được cài ngay và `ap` phải tự đoán tên marketplace.

## Consequences

- `ap sync` (chế độ ghi) cần CLI `claude` trong PATH; `--dry-run`/`--check` thì không.
- Hành vi phụ thuộc vào định dạng output/settings của `claude`; khi Claude Code đổi, bước bổ sung field phải được kiểm tra lại.
