---
title: Đổi tên package và đưa Preset mặc định vào package `agent-plugins`
labels: [done]
blocked_by: []
---

Spec: [../spec.md](../spec.md) (mục Tên, Dependencies, Preset mặc định). ADR 0008.

## Việc cần làm
- `packages/cli`: `name: agent-plugins`, `version: 0.1.0`, `engines.node: ">=22"`; mọi dep sang `devDependencies` (giữ `ink`, `react`, `cli-progress`); bỏ `prepare`.
- `package.json` gốc: `name: agent-plugins-monorepo`, `private: true`, trỏ devDependency sang `agent-plugins: workspace:*`; `pnpm install` cập nhật lockfile.
- Script `build` copy `packages/presets/*.yaml` → `packages/cli/presets/` (gitignore, thêm vào `files`).
- `defaultPresetsDir()` đọc `<gốc package>/presets` tính từ `import.meta.url`; bỏ `import.meta.resolve('presets/package.json')`.

## Acceptance
- `pnpm ap sync --dry-run` ở gốc repo chạy như trước.
- Test mới: sau `build`, `defaultPresetsDir()` chứa `base.yaml`, `agent-plugins.yaml`, `mcp-servers.yaml`.
- `pnpm -C packages/cli test` và `typecheck` xanh.
