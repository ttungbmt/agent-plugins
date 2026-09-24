---
title: Phân phối `ap` bằng Release tarball trên GitHub
labels: [ready-for-agent]
---

Thuật ngữ: [CONTEXT.md](../../CONTEXT.md) mục Phân phối. Quyết định: [ADR 0008](../../docs/adr/0008-distribute-ap-via-github-release-tarball.md). Nguồn: [docs/research/cli-distribution.md](../../docs/research/cli-distribution.md).

## Problem Statement

Muốn dùng `ap` trên máy khác, người dùng phải clone repo, cài mise/pnpm, `pnpm install`, build rồi `pnpm link --global`. Không publish lên npm registry thì hiện không có cách cài nào ngắn hơn. Cài thẳng từ tarball của `pnpm pack` cũng không được: `presets: workspace:*` bị đổi thành `"presets": "1.0.0"`, mà `presets` là tên của một package lạ trên npm, nên `npm i -g` lỗi `ETARGET` (hoặc cài nhầm package lạ nếu ai đó publish đúng version đó). Tên package `cli` cũng trùng một package trên npm.

## Solution

Mỗi tag `v*` trên `master`, CI build một Release tarball: `ap` bundle thành một file ESM bằng esbuild, đóng gói thành package `agent-plugins` không có `dependencies`, đính vào GitHub Release dưới hai tên `ap.tgz` và `ap-<ver>.tgz`, kèm artifact attestation. Người dùng có Node `>=22` cài/cập nhật bằng:

```bash
npm i -g https://github.com/ttungbmt/agent-plugins/releases/latest/download/ap.tgz
```

## User Stories

1. Là người dùng mới, tôi muốn cài `ap` bằng một lệnh chỉ cần Node, để không phải clone repo hay cài mise/pnpm.
2. Là người dùng, tôi muốn cập nhật `ap` bằng đúng lệnh cài, để không phải nhớ thêm lệnh nào.
3. Là người dùng, tôi muốn cài một phiên bản cụ thể bằng URL `ap-<ver>.tgz`, để ghim version hoặc quay lại bản cũ.
4. Là người dùng, tôi muốn cài bằng `pnpm add -g <url>` cũng được như `npm i -g <url>`.
5. Là người dùng, tôi muốn Preset mặc định (`base`, `agent-plugins`, `mcp-servers`) có sẵn sau khi cài, để `spec.presets: [agent-plugins]` chạy ngay.
6. Là người dùng, tôi muốn việc cài không kéo dependency nào từ npm registry, để mọi máy chạy đúng một bản và cài nhanh.
7. Là người dùng quan tâm bảo mật, tôi muốn xác minh tarball do CI của repo build ra bằng `gh attestation verify`.
8. Là người dùng, tôi muốn `npm ls -g` / `npm uninstall -g agent-plugins` hiện tên có nghĩa thay vì `cli`.
9. Là người phát triển `ap`, tôi muốn phát hành bằng `git tag vX.Y.Z && git push --tags`, để không có bước tay nào khác.
10. Là người phát triển `ap`, tôi muốn CI từ chối release khi tag không khớp `version` trong `package.json`.
11. Là người phát triển `ap`, tôi muốn CI cài thử tarball trên Node 22 và 24 và chạy `ap --help`, `ap sync --dry-run`, để bản phát hành không vỡ vì bundle.
12. Là người phát triển `ap`, tôi muốn `pnpm ap` lúc dev vẫn dùng `tsc` incremental, và tìm command/preset giống hệt bản phát hành.
13. Là người phát triển `ap`, tôi muốn thêm command mới mà quên đăng ký thì test báo lỗi, thay vì bản phát hành thiếu command.
14. Là người phát triển `ap`, tôi muốn giữ `ink`, `react`, `cli-progress` trong repo để dùng sau, mà không làm tarball nặng thêm.
15. Là người phát triển `ap`, tôi muốn phát hành pre-release (`v0.2.0-beta.1`) mà không chiếm link `latest`.
16. Là người đọc README, tôi muốn thấy lệnh cài một dòng ở đầu, còn hướng dẫn build từ source chỉ dành cho người phát triển.

## Implementation Decisions

- **Tên:** `packages/cli/package.json` `name: agent-plugins`, `bin.ap` giữ nguyên, bắt đầu `version: 0.1.0`, `engines.node: ">=22"`. `package.json` gốc đổi `name: agent-plugins-monorepo`, `private: true`, cập nhật `devDependencies` trỏ tới workspace package mới.
- **Dependencies:** mọi dep của `packages/cli` chuyển sang `devDependencies`, kể cả `presets: workspace:*`, `ink`, `react`, `cli-progress`. Thêm `esbuild`. Bỏ script `prepare`.
- **Preset mặc định:** package `presets` giữ nguyên chỗ. Script build (`build` cho dev và `bundle` cho release) copy `packages/presets/*.yaml` vào `packages/cli/presets/`, thư mục này vào `.gitignore` và vào `files`. `defaultPresetsDir()` (`packages/cli/src/commands/sync.ts`) trả về `<gốc package>/presets`, tính từ `import.meta.url` sao cho đúng cả với file `tsc` lẫn file bundle. Bỏ `import.meta.resolve('presets/package.json')`. Dòng `$schema` trong YAML vẫn trỏ tương đối như cũ (chỉ phục vụ editor).
- **Command map:** `src/commands/index.ts` export `COMMANDS = { init, sync }`. `oclif.commands` dùng `{ strategy: "explicit", identifier: "COMMANDS", target: … }` cho cả dev lẫn release.
- **Bundle:** `esbuild --bundle --platform=node --format=esm --target=node22`, banner `createRequire` cho dep CommonJS, `--alias:react-devtools-core=<stub>` và `--define:process.env.NODE_ENV='"production"'` (cần khi bắt đầu import `ink`). Output một file; `bin/run.js` của bản phát hành chạy được mà không có `node_modules`.
- **Lắp package phát hành:** CI dựng package phát hành trong thư mục staging (bundle, `bin`, `presets/`, `package.json` đã lược: không `dependencies`/`devDependencies`/`scripts`, `oclif.commands.target` trỏ bundle), rồi `npm pack` ở đó. Không có `dist/.tsbuildinfo` trong tarball. Kiểm tra `package.json` trong tarball không có `dependencies`.
- **Workflow `.github/workflows/release.yml`:** trigger `push: tags: ['v*']`. Job build: `pnpm install --frozen-lockfile`, `typecheck`, `test`, so tag với `version`, bundle, pack. Job smoke (matrix Node 22, 24, ubuntu + macOS): `npm i -g <tgz>` vào prefix tạm, `ap --help`, `ap sync --help`, `ap init --help`, `ap sync --dry-run` trên một Config mẫu chỉ dùng Preset mặc định (không cần `claude`). Job release: `actions/attest-build-provenance` trên hai file, `gh release create` (tag có `-` thì `--prerelease`, không cập nhật `latest`) và upload `ap.tgz`, `ap-<ver>.tgz`. Quyền: `contents: write`, `id-token: write`, `attestations: write`.
- **README:** lệnh cài một dòng, lệnh cài bản cụ thể, lệnh xác minh attestation, ghi chú Windows dùng WSL; phần clone + build chuyển xuống mục "Phát triển".

## Testing Decisions

- Test tốt kiểm tra hành vi quan sát được từ ngoài: command nào chạy được, preset nào tìm thấy, tarball chứa gì — không kiểm tra chi tiết cách build.
- **Vitest:** `COMMANDS` chứa đúng mọi file trong `src/commands/` (trừ `index.ts`), để quên đăng ký là đỏ (story 13). `defaultPresetsDir()` trỏ tới thư mục có `base.yaml`, `agent-plugins.yaml`, `mcp-servers.yaml` sau `build`.
- **Script smoke** (chạy được ở local và CI, vd. `scripts/smoke-release.sh`): pack, cài vào prefix tạm, chạy các lệnh ở trên, kiểm tra `dependencies` rỗng. Đây là test chính cho bundle vì oclif không hỗ trợ bundle chính thức.
- Tiền lệ: test `sync-*.test.ts` hiện có dùng thư mục tạm và `exec` giả; smoke `ap sync --dry-run` cũng không cần `claude` vì dry-run chỉ đọc file.

## Out of Scope

- Publish lên npm registry hay GitHub Packages.
- Bản standalone không cần Node (`oclif pack tarballs` + `mise use -g github:…`).
- Self-update hoặc thông báo có bản mới.
- Kênh beta riêng (pre-release vẫn tạo được bằng tag có `-`).
- Hỗ trợ Windows chính thức (`spawn('claude')` với `.cmd`).
- Bắt đầu dùng `ink`/`react` trong code.

## Further Notes

- `npx`/`pnpm dlx` với URL `latest` bị cache theo URL nên chạy bản cũ; README nên dùng URL có version cho kiểu chạy không cài.
- Repo chưa có CI nào; workflow này là workflow đầu tiên.
