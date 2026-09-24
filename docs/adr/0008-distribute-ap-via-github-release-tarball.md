# Phân phối `ap` bằng Release tarball trên GitHub, không qua npm registry

`ap` được phát hành dưới dạng Release tarball: CI bundle CLI thành một file ESM bằng esbuild, `pnpm pack` thành `ap.tgz` (tên cố định cho link `latest`) và `ap-<ver>.tgz`, đính vào GitHub Release kèm artifact attestation. Người dùng cần Node (`>=22`) và cài hoặc cập nhật bằng đúng một lệnh:

```bash
npm i -g https://github.com/ttungbmt/agent-plugins/releases/latest/download/ap.tgz
```

Không cần clone repo, không cần mise/pnpm, không cần token. Nghiên cứu và kết quả chạy thử: [cli-distribution.md](../research/cli-distribution.md).

## Quyết định chi tiết

- **Bundle, không để dependency lúc chạy.** Tarball không có `dependencies`; mọi dep (kể cả `presets: workspace:*`, `ink`, `react`, `cli-progress` chưa dùng nhưng giữ cho sau này) nằm ở `devDependencies`. Lý do: `pnpm pack` đổi `workspace:*` thành version cụ thể, mà `presets` và `cli` đều là tên của package khác trên npm — cài tarball sẽ lỗi `ETARGET` hoặc kéo nhầm package lạ. Bundle cũng làm mọi máy chạy đúng một bản, không resolve lại khoảng `^` lúc cài.
- **oclif dùng explicit command map**, chung cho dev (`tsc`) và bundle (esbuild), vì bundle không quét được `./dist/commands`. oclif không hỗ trợ chính thức việc bundle, nên CI chạy smoke test `ap --help` và `ap sync --dry-run` trên bản cài từ tarball, trên Node 22 và 24. Khi bắt đầu dùng `ink`, bundle cần output ESM và stub `react-devtools-core`.
- **Preset mặc định giữ ở package `presets` riêng.** Mọi bước build copy `packages/presets/*.yaml` vào `packages/cli/presets/` (gitignore); `defaultPresetsDir()` chỉ đọc thư mục đó, nên dev và release đi cùng một đường.
- **Tên:** package `packages/cli` là `agent-plugins`, lệnh vẫn là `ap`; package gốc đổi thành `agent-plugins-monorepo`, `private: true`.
- **Phát hành:** semver, tag `v*` trên `master` kích hoạt workflow; CI kiểm tra tag khớp `version`. Bắt đầu từ `v0.1.0`. Pre-release (`v0.2.0-beta.1`) dùng được khi cần mà không chiếm `latest`.
- **Cập nhật:** chạy lại lệnh cài. Không có self-update.
- **Nền tảng:** Linux, WSL, macOS. Windows chưa hỗ trợ (`spawn('claude')` với file `.cmd` chưa kiểm chứng).

## Considered Options

- Tarball thường, không bundle — chạy được, nhưng kéo 93 package (30 MB) từ npm lúc cài và resolve `^` mỗi máy mỗi khác; vẫn phải xử lý tên `presets`.
- Cài từ git subdirectory — npm không có cú pháp; pnpm `#path:/packages/cli` lỗi ở `workspace:`.
- GitHub Packages — cài cả package public cũng cần classic PAT.
- Binary độc lập (Node SEA, `bun build --compile`, `deno compile`) — SEA chỉ nhận CommonJS; bun cần hack và nặng 82 MB.
- `oclif pack tarballs` + `mise use -g github:ttungbmt/agent-plugins` — chạy được không cần Node nhưng 47 MB mỗi target; để dành cho khi có người dùng không có Node. `@oclif/plugin-update` không cập nhật được từ GitHub Release.
- Homebrew tap, aqua — thêm repo/registry phải duy trì mà không lợi hơn.

## Consequences

- Command mới phải được thêm vào command map, nếu không sẽ không có trong bản phát hành (smoke test nên phủ `--help` của mọi command).
- Repo cần CI lần đầu: workflow release trên tag.
- README thay hướng dẫn clone + build bằng lệnh cài một dòng; hướng dẫn build từ source chỉ còn cho người phát triển `ap`.
