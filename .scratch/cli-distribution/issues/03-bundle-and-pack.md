---
title: Bundle esbuild, lắp package phát hành và script smoke
labels: [done]
blocked_by: [01, 02]
---

Spec: [../spec.md](../spec.md) (mục Bundle, Lắp package phát hành, Testing). ADR 0008.

## Việc cần làm
- Thêm `esbuild`; script `bundle` (ESM, node22, banner `createRequire`, alias `react-devtools-core` → stub, define `NODE_ENV`).
- Script lắp thư mục staging: bundle, `bin/run.js` chạy bundle, `presets/`, `package.json` lược (không deps/scripts, `oclif.commands.target` trỏ bundle); `npm pack` ra `ap-<ver>.tgz`, copy thành `ap.tgz`.
- `scripts/smoke-release.sh <tgz>`: cài vào prefix tạm; chạy `ap --help`, `ap sync --help`, `ap init --help`, `ap sync --dry-run` với Config mẫu chỉ dùng Preset mặc định; fail nếu tarball có `dependencies` hoặc `dist/.tsbuildinfo`.

## Acceptance
- Trên máy dev (Node 24) smoke script xanh, không đụng global prefix thật.
- Tarball khoảng 1–2 MB, `npm i` không tải gì từ registry.
