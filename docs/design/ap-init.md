# Thiết kế `ap init` (v1)

Thuật ngữ: xem [CONTEXT.md](../../CONTEXT.md).

## Mục đích

Tạo repo mới → chạy `ap init` để có Config rỗng → tự điền → chạy `ap sync`.

## Hành vi

- Ghi `agent-plugins.yaml` vào thư mục hiện tại (giống `ap sync`), không yêu cầu git.
- Không tự chạy `ap sync`, không cần CLI `claude`; chỉ in gợi ý bước tiếp.
- Config không chọn Preset nào: `spec: {}` kèm comment ví dụ cho `presets`, `marketplaces`, `plugins`. Sync ngay sau init là no-op.
- Dòng đầu là modeline `yaml-language-server` trỏ tới `config.schema.json` trên GitHub (repo mới không có `packages/schemas`).
- `metadata.name`: tên thư mục chuyển sang kebab-case; `--name` ghi đè và phải là kebab-case. Tên suy ra rỗng → lỗi, gợi ý `--name`.
- Config đã có → lỗi (exit 2), không ghi gì; `--force` ghi đè.
- `.gitignore`: bổ sung các dòng còn thiếu `.agent-plugins/state.local.json`, `.agent-plugins/cache/` (tạo file nếu chưa có). Chạy lại không nhân đôi.

## Module

`init({ cwd, name?, force? })` trong `packages/cli/src/init/index.ts`, chỉ dùng filesystem; lệnh oclif `ap init` là adapter mỏng. Test trên thư mục tạm.
