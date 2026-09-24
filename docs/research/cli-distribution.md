# Research: phân phối CLI `ap` chỉ qua GitHub (không publish lên npm registry)

Câu hỏi: cách nào tối ưu nhất để người dùng cài `ap` global **chỉ từ GitHub**
(`github.com/ttungbmt/agent-plugins`), thay cho quy trình hiện tại (clone → cài mise/pnpm → build → link)?
Nguồn kiểm tra ngày 2026-09-24. Chỉ dùng nguồn sơ cấp: docs chính thức (docs.npmjs.com, pnpm.io, oclif.io, nodejs.org,
bun.com, docs.deno.com, mise.jdx.dev, docs.github.com, docs.brew.sh) và source/issue trên GitHub. Các thử nghiệm thực tế
chạy trong scratchpad với Node `v24.19.0`, npm `11.17.0`, pnpm `12.5.1`/`12.4.1`, esbuild `0.28.2`, `oclif` CLI `6.0.1`,
`@oclif/core` `5.0.1`, Bun `1.4.2`; được đánh dấu **(thử)**. Điều gì chưa kiểm chứng được thì ghi **(chưa kiểm chứng)**.

## Tóm tắt

- **Tarball trên GitHub Release là con đường ngắn nhất và chắc chắn nhất.** `npm i -g <https-url>.tgz` và
  `pnpm add -g <url>` đều là cú pháp được hỗ trợ chính thức
  ([npm-install](https://docs.npmjs.com/cli/v11/commands/npm-install),
  [pnpm package-sources](https://pnpm.io/package-sources)). Người dùng chỉ cần Node + npm (hoặc pnpm). Update bằng cách
  chạy lại đúng lệnh cài **(thử)**.
- **Nhưng `pnpm pack` package `cli` hiện tại cho ra tarball không cài được.** `presets: workspace:*` bị viết lại thành
  `"presets": "1.0.0"` ([pnpm workspaces](https://pnpm.io/workspaces)). Trên npm registry đã có một package **không liên
  quan** tên `presets` (chỉ có bản `0.1.0`, repo `AndreasPizsa/presets`), nên cài báo `ETARGET` **(thử)**. Đây còn là rủi
  ro dependency confusion: nếu ai đó publish `presets@1.0.0`, người dùng sẽ cài nhầm code lạ. → **Bắt buộc gộp các file
  preset YAML vào trong package `cli`** trước khi làm bất kỳ phương án nào.
- **Cài từ git subdirectory không dùng được.** npm không có cú pháp subdirectory (docs không nhắc tới; các issue
  [npm/cli#6253](https://github.com/npm/cli/issues/6253), [npm/npm#2974](https://github.com/npm/npm/issues/2974) vẫn là
  feature request). `npm i -g github:ttungbmt/agent-plugins` chỉ cài package root `agent-plugins`, không có bin `ap`
  **(thử)**. pnpm có `#path:/packages/cli` nhưng lỗi vì `workspace:` **(thử)**, và còn vướng chính sách chặn build script
  của git dep ([pnpm settings/build](https://pnpm.io/settings/build)).
- **GitHub Packages bị loại:** cài cả package public cũng cần personal access token (classic)
  ([docs.github.com](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)).
- **Bundle thành một file JS chạy được với oclif nếu dùng explicit strategy.** esbuild gộp toàn bộ CLI thành **1.2 MB**,
  không còn runtime dependency; `ap --help` và `ap sync --dry-run` chạy đúng **(thử)**. oclif nói rõ "We do not support
  bundling" nhưng vẫn cho phép nếu giữ `package.json` và `bin/run.js`
  ([command discovery strategies](https://oclif.io/docs/command_discovery_strategies)). ink + react + yoga (wasm được
  inline base64, dùng top-level await) cũng bundle được, chỉ cần stub `react-devtools-core` **(thử)**.
- **Binary độc lập (không cần Node) làm được nhưng tốn công.** `oclif pack tarballs` là cách "chính chủ": kèm Node, tarball
  47 MB (giải nén 151 MB), chạy không cần Node trên PATH **(thử)**. Nhưng `oclif upload` và `@oclif/plugin-update` chỉ biết
  S3/host HTTP có cấu trúc thư mục riêng, không map được sang GitHub Releases. `bun build --compile` chạy được sau vài
  workaround (82 MB) **(thử)**. Node SEA trên Node 24 LTS chỉ hỗ trợ CommonJS
  ([SEA v24](https://nodejs.org/docs/latest-v24.x/api/single-executable-applications.html)).
- **Khuyến nghị:** CI build một tarball npm **đã bundle** (`ap-<version>.tgz`, gồm presets) và đính vào GitHub Release.
  Người dùng chạy `npm i -g https://github.com/ttungbmt/agent-plugins/releases/latest/download/ap.tgz`. Bước sau (tùy
  chọn, khi có người dùng không có Node): thêm tarball `oclif pack` theo từng OS/arch và hướng dẫn cài qua
  `mise use -g github:ttungbmt/agent-plugins`.

---

## 1. Bối cảnh repo (những gì ảnh hưởng tới phân phối)

- `packages/cli/package.json`: `name: "cli"`, `bin.ap = ./bin/run.js`, ESM, `oclif.commands: ./dist/commands` (pattern
  strategy, quét thư mục lúc runtime), `files: ["bin", "dist"]`, script `prepare: tsc …`.
- `dependencies` có `presets: workspace:*`. `defaultPresetsDir()` trong `packages/cli/src/commands/sync.ts` dùng
  `import.meta.resolve('presets/package.json')`, nghĩa là presets phải là một package cài được.
- `ink`, `react`, `cli-progress` được khai báo nhưng **hiện không có file nào trong `src/` import chúng** (grep
  `from 'ink'|from 'react'|cli-progress'` không có kết quả). Riêng `ink` kéo theo `es-toolkit` (18 MB trong
  `node_modules`). Bản cài global hiện tại có 93 package, 30 MB **(thử)**.
- Tên package `cli` và `presets` **đều đã có người dùng trên npm registry** (`cli@1.0.1` "A tool for rapidly building
  command line apps"; `presets@0.1.0`). Chưa gây lỗi vì không publish, nhưng mọi đường cài nào có resolve theo tên (dep
  `presets`, `npm update -g cli`, `mise npm:cli`) đều có thể trỏ nhầm.
- Chưa có `.github/workflows` (chưa có CI).
- CLI gọi `claude` và `git` qua `spawn`, nên người dùng vốn đã phải có `git` và Claude Code.

## 2. Tiêu chí

| Tiêu chí | Ý nghĩa |
|---|---|
| Bước của người dùng | Số lệnh để có `ap` trên PATH |
| Điều kiện tiên quyết | Cần Node? npm/pnpm? mise? |
| Update | Người dùng lên bản mới thế nào |
| oclif + ink/react | Có giữ được dynamic command discovery không; ink/react/yoga có chạy không |
| Đa nền tảng | Linux/WSL, macOS, Windows |
| Chi phí CI | Việc phải dựng và duy trì |
| Thay đổi repo | Những gì phải sửa |

## 3. Bảng so sánh

| # | Phương án | Bước người dùng | Cần | Update | oclif / ink | Đa nền tảng | CI | Kết luận |
|---|---|---|---|---|---|---|---|---|
| 1 | Tarball npm trên Release (`npm i -g <url>`) | 1 lệnh | Node + npm (hoặc pnpm) | chạy lại lệnh cài | nguyên vẹn (không bundle) hoặc explicit (bundle) | cả 3 (npm tự tạo shim) | thấp: pack + `gh release upload` | **Chọn** |
| 2 | Git subdirectory | 1 lệnh | Node + pnpm (npm không hỗ trợ) | chạy lại | – | – | 0 | **Loại**: lỗi `workspace:` **(thử)** |
| 3 | GitHub Packages npm | `.npmrc` + PAT + 1 lệnh | Node + PAT classic | `npm update -g` | nguyên vẹn | cả 3 | thấp | **Loại**: bắt buộc token |
| 4 | Bundle 1 file JS | như #1 | Node | như #1 | explicit strategy, stub devtools | cả 3 | thấp | **Chọn, làm nội dung của #1** |
| 5a | `oclif pack tarballs` + installer | 1 lệnh (mise) hoặc `curl \| sh` | không cần Node | `mise up` / chạy lại script | nguyên vẹn | cả 3 (tarball Windows, installer `win` cần nsis) | trung bình: matrix target, 40–50 MB/target | Bước sau, tùy chọn |
| 5b | `bun build --compile` | 1 lệnh | không | như 5a | cần hack (xem §5) | cả 3 (cross-compile) | trung bình | Không khuyến nghị |
| 5c | Node SEA | – | không | – | Node 24 chỉ CJS | macOS x64 không hỗ trợ | cao | Không khuyến nghị bây giờ |
| 5d | `deno compile` | – | không | – | chưa kiểm chứng | cả 3 | cao | Không khuyến nghị |
| 6 | `oclif upload` + `plugin-update` | – | – | tự update | – | – | cần S3/host tĩnh | Không hợp với "chỉ GitHub" |
| 7 | mise `github:` / Homebrew tap | 1 lệnh | mise hoặc brew | `mise up` / `brew upgrade` | theo artifact | mise: cả 3; brew: macOS/Linux | thấp (mise) / thêm repo tap (brew) | mise đi kèm 5a |

## 4. Phát hiện theo từng phương án

### 4.1 Tarball npm đính vào GitHub Release

- npm: `npm install <tarball url>`, "the argument must start with 'http://' or 'https://'", ví dụ
  `npm install https://github.com/indexzero/forever/tarball/v0.5.6`
  ([npm-install](https://docs.npmjs.com/cli/v11/commands/npm-install)). pnpm cũng vậy: `pnpm add <https-url>`
  ([package-sources](https://pnpm.io/package-sources)); thêm `-g` để cài global ([pnpm add](https://pnpm.io/cli/add)).
- URL ổn định cho bản mới nhất: `/releases/latest/download/<asset-name>`, chỉ áp dụng cho asset được upload thủ công (tức
  là không dùng được cho source archive tự sinh)
  ([linking-to-releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)).
  Repo đang public (`"visibility": "public"` qua GitHub API), nên tải asset không cần auth.
- **`workspace:*` khi `pnpm pack`:** pnpm thay `workspace:*` bằng "the corresponding version in the target workspace"
  ([pnpm workspaces](https://pnpm.io/workspaces)). Thực tế: `"presets": "workspace:*"` → `"presets": "1.0.0"` **(thử)**.
  Tarball này không cài được vì `presets` trên npm là package khác (`ETARGET … presets@1.0.0`) **(thử)**. Có thể gộp
  presets vào bằng `bundleDependencies`, nhưng đơn giản và an toàn hơn là copy YAML vào `packages/cli` (xem §8).
- Tarball từ `pnpm pack` **không còn script `prepare`** (còn `test`, `typecheck`, `build`) và vẫn chứa
  `dist/.tsbuildinfo` (112 KB) **(thử)**. Không có install script nào, nên không đụng tới cơ chế chặn script của npm 11 /
  pnpm.
- **Update:** cài lại cùng URL `latest` thì lấy bản mới: npm `1.0.0 → 1.0.1`, pnpm `add -g` cũng vậy, và `pnpm update -g`
  fetch lại URL **(thử, với HTTP server local thay đổi file sau cùng một URL)**. `npm update -g` không áp dụng được vì
  không có registry để so version (suy luận, **chưa kiểm chứng** riêng).
- **Điều kiện:** Node (repo đã có `mise.toml` `node = "lts"`) và npm. Với pnpm, global bin nằm ở `$PNPM_HOME/bin`. Nếu
  chưa chạy `pnpm setup`, pnpm 12 từ chối: "The configured global bin directory … is not in PATH" **(thử)**.
- **Windows:** npm link executable global vào `{prefix}` trên Windows
  ([npm folders](https://docs.npmjs.com/cli/v11/configuring-npm/folders)). Tarball do `oclif pack` sinh có `bin/ap.cmd`
  **(thử)**, nên shim `.cmd` là cách oclif hỗ trợ Windows; riêng việc `ap` chạy thật trên Windows **chưa kiểm chứng**.
- **Không bundle:** cài xong có 93 package (30 MB) resolve từ npm registry theo range `^`, mất khoảng 2.5 s **(thử)**.
  Mỗi lần cài có thể ra một cây dependency khác, vì package lock không đi theo tarball (suy luận). Bundle (§4.4) giải
  quyết được chuyện này.

### 4.2 Cài từ git subdirectory

- **npm:** docs chỉ có `<githubname>/<githubrepo>[#<commit-ish>]` và `github:…`, không có path/subdirectory
  ([npm-install](https://docs.npmjs.com/cli/v11/commands/npm-install)). RFC [npm/rfcs#19](https://github.com/npm/rfcs/pull/19)
  chỉ thêm `repository.directory` làm metadata, không phải cú pháp cài. Yêu cầu cài từ workspace/subdir trong git vẫn là
  issue mở: [npm/cli#6253](https://github.com/npm/cli/issues/6253), [npm/npm#2974](https://github.com/npm/npm/issues/2974).
  Thực tế: `npm i -g github:ttungbmt/agent-plugins#dev` cài package root `agent-plugins` (không có `bin`) → không có
  `ap` **(thử)**.
- **`prepare` trên git dep (npm):** "If the package being installed contains a `prepare` script, its `dependencies` and
  `devDependencies` will be installed, and the prepare script will be run, before the package is packaged and installed"
  ([npm-install](https://docs.npmjs.com/cli/v11/commands/npm-install)). Như vậy nếu repo có `cli` ở root thì npm sẽ tự
  build bằng `tsc` (devDependency `typescript@7`) trên máy người dùng: chậm và dễ vỡ.
- **pnpm:** có `pnpm add <repo>#path:/packages/simple-react-app`, kết hợp nhiều tham số bằng `&`
  ([package-sources](https://pnpm.io/package-sources)). pnpm "prepares it with the package manager the dependency itself
  asks for". Nhưng build script của git dep bị chặn mặc định: "a package name on its own never approves builds for a git
  or tarball dependency … Approve one either by its exact resolved path (including the commit) or, since v11.11.0, by its
  repository URL", và `strictDepBuilds` mặc định `true` ([settings/build](https://pnpm.io/settings/build)). Thực tế:
  `pnpm add -g "github:ttungbmt/agent-plugins#dev&path:/packages/cli"` → `Cannot resolve package from workspace because
  workspace packages were not loaded into the resolver` **(thử)**.
- **Biến thể "nhánh build sẵn"** (CI đẩy package đã build vào một nhánh riêng, ví dụ `dist`, với `package.json` ở root, rồi
  `npm i -g github:ttungbmt/agent-plugins#dist`): về lý thuyết chạy với cả npm và pnpm vì không cần subdir hay `prepare`.
  **Chưa kiểm chứng.** So với tarball trên Release thì cách này không có lợi gì hơn, lại cần clone git và phải quản lý một
  nhánh artifact.

### 4.3 GitHub Packages (npm registry)

- "You need an access token to publish, install, and delete private, internal, and public packages." và "You must use a
  personal access token (classic)…"; "GitHub Packages only supports scoped npm packages"
  ([working-with-the-npm-registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)).
- Tức là mỗi người dùng phải tạo PAT classic với quyền `read:packages` và cấu hình `.npmrc` cho scope `@ttungbmt` → còn
  nhiều bước hơn hiện tại. **Loại.**

### 4.4 Bundle thành một file (esbuild/tsup/rolldown)

- oclif có 3 strategy: `pattern` (mặc định), `explicit` và `single`. Explicit cần `"strategy": "explicit"`, `"target"`
  (file export commands) và `"identifier"`, ví dụ `export const COMMANDS = { hello: Hello, 'hello:world': HelloWorld }`.
  "We do not support bundling…", và nếu dùng bundler thì vẫn phải giữ `package.json` cùng `bin/run.js`: "you will not be
  able to successfully bundle your entire CLI … into a single file". Nếu có `oclif.manifest.json` thì mọi strategy đều
  dùng manifest trước ([command_discovery_strategies](https://oclif.io/docs/command_discovery_strategies)).
  `oclif.manifest.json` chỉ giúp `--help` nhanh hơn, vì nó chỉ chứa metadata; vẫn cần file command để chạy (suy luận từ
  cùng trang).
- **Thực nghiệm (thử):** entry `export { execute } from '@oclif/core'` + `export const COMMANDS = { init, sync }` →
  `esbuild --bundle --platform=node --format=esm` với banner `createRequire` → `dist/bundle/ap.js` **1.2 MB**. Đặt
  `oclif.commands = {strategy:"explicit", target:"./dist/bundle/ap.js", identifier:"COMMANDS"}`, và `bin/run.js` import
  `execute` từ chính bundle để chỉ có một bản `@oclif/core`. Xoá `node_modules` và `dependencies`, sau đó `ap --help` và
  `ap sync --dry-run` (dùng preset `base`) đều chạy đúng.
- **ink/react/yoga:** `yoga-layout@3.2.1` (ink 7.1.1 phụ thuộc `~3.2.1`) nạp wasm qua `binaries/yoga-wasm-base64-esm.js`
  (inline base64) và `await loadYoga()` ở top-level (đọc trực tiếp `node_modules/yoga-layout/dist/src/index.js`). Không có
  file `.wasm` rời, nhưng **bắt buộc output ESM** (CJS không có top-level await). Bundle một app ink tối thiểu: lỗi
  `Could not resolve "react-devtools-core"`. Để `--external` thì khi chạy lỗi `ERR_MODULE_NOT_FOUND` (import bị kéo lên
  top-level). `--alias:react-devtools-core=./stub.js` + `--define:process.env.NODE_ENV='"production"'` → chạy được, 955 KB
  **(thử)**.
- **Chạy không cần cài:** file bundle vẫn cần Node, nên `curl | sh` không có lợi gì so với `npm i -g`.
  `npx <url>.tgz` / `pnpm dlx <url>.tgz` chạy được **(thử)**, nhưng **cache theo URL**: sau khi file sau URL đổi sang
  `1.0.1`, `npx` vẫn chạy `1.0.0` (kể cả với `--prefer-online`), `pnpm dlx` cũng trả bản đã cache **(thử)**. Cách npx chọn
  bin: "If the package has a single entry in its `bin` field … that command will be used"
  ([npx](https://docs.npmjs.com/cli/v11/commands/npx)). → Với zero-install nên dùng URL có version (tag), không dùng
  `latest`.

### 4.5 Binary độc lập

**`bun build --compile`.** "Bun bundles all imported files and packages into the executable, along with a copy of the Bun
runtime". Cross-compile được qua `--target` (`bun-linux-x64`, `bun-darwin-arm64`, `bun-windows-x64`, `-musl`, …). File
nhúng nằm ở `/$bunfs/root/...`, còn thư mục asset thì qua `--asset`
([bun executables](https://bun.com/docs/bundler/executables)). **Thực nghiệm (thử):**
- Binary 82 MB, runtime báo `node-v26.3.0`.
- Explicit strategy trỏ vào entry chính thì lỗi `require() async module "/$bunfs/root/ap" is unsupported`. Phải tách
  `cmds.js` thành entrypoint thứ hai và truyền `pjson` qua `execute({loadOptions:{root: import.meta.dir, pjson}})`.
- Sau đó `--help` chạy, nhưng oclif in cảnh báo "Could not find typescript", và `sync --dry-run` lỗi `unknown preset "base"`
  vì presets được đọc từ filesystem (cần nhúng riêng).
- Kết luận: làm được nhưng dựa vào những chi tiết nội bộ của oclif, nên dễ vỡ.

**Node SEA.**
- Trên **Node 24 (LTS)**: "currently only supports running a single embedded script using the CommonJS module system"
  ([SEA v24](https://nodejs.org/docs/latest-v24.x/api/single-executable-applications.html)).
- Bản docs mới nhất (v26.10.0):
  - Có `"mainFormat": "module"` (không dùng chung được với `useSnapshot`) và `--build-sea` (từ v25.5.0).
  - `useVfs` cho asset xuất hiện từ v26.9.0, "Stability: 1.0 - Early development"; toàn bộ tính năng SEA ở mức "1.1 -
    Active development".
  - macOS chỉ arm64, "x64 not currently supported". Cross-platform thì phải tắt `useCodeCache`/`useSnapshot`.
  - Module loading "does not read from the file system", tức là vẫn phải bundle trước
    ([SEA](https://nodejs.org/api/single-executable-applications.html)).
- Node 26 hiện là "Current", Node 24 là LTS ([previous-releases](https://nodejs.org/en/about/previous-releases)).
- Kết luận: CLI này là ESM và có thể sẽ dùng yoga (top-level await), nên trên LTS hiện tại chưa dùng được. Không
  khuyến nghị lúc này.

**`deno compile`.**
- Cross-compile "to all targets regardless of the host platform". Mặc định nhúng toàn bộ `node_modules` đã resolve
  (`--exclude-unused-npm` để thu gọn). Import động không phân tích tĩnh được thì phải khai báo `--include`
  ([deno compile](https://docs.deno.com/runtime/reference/cli/compile/)).
- Pattern strategy của oclif chính là import động theo đường dẫn tính lúc runtime, nên sẽ cần explicit strategy hoặc
  `--include dist/commands`. Chưa thử tương thích oclif/ink trên Deno → **chưa kiểm chứng**.

### 4.6 Đóng gói kiểu oclif

- "`oclif pack tarballs` … include the node binary so the user does not have to already have node installed". Có
  `oclif pack deb`, `oclif pack macos` (.pkg), `oclif pack win`. Tarball và installer "can be made autoupdatable by adding
  the `@oclif/plugin-update` plugin". `oclif upload` / `oclif promote` làm việc với S3 (`oclif.update.s3.bucket` + AWS
  credentials) ([releasing](https://oclif.io/docs/releasing)). `pack win` cần "7zip, nsis (makensis), and grep"; mọi lệnh
  `upload *` đều mô tả là "Upload … to S3"
  ([pack.md](https://github.com/oclif/oclif/blob/main/docs/pack.md), [upload.md](https://github.com/oclif/oclif/blob/main/docs/upload.md)).
- Lúc build, oclif chọn package manager theo lockfile **trong root của package** (`yarn.lock` → yarn, `pnpm-lock.yaml` →
  `pnpm install --production`, còn lại là npm) ([src/tarballs/build.ts](https://github.com/oclif/oclif/blob/main/src/tarballs/build.ts)).
  `packages/cli` không có lockfile riêng và còn `workspace:*`, nên phải pack từ một bản copy standalone.
- **Thực nghiệm (thử):** giải nén tarball npm (đã gộp presets) → `npm install --omit=dev` → `git init` →
  `npx oclif pack tarballs -t linux-x64 --no-xz`. Mất 19 s và sinh `ap-v1.0.0-<sha>-linux-x64.tar.gz`.
  - Tarball 47 MB, giải nén 151 MB. Có `bin/ap`, `bin/ap.cmd`, `bin/node` (Node `v24.19.0`, tức bản đang chạy lúc build).
  - Chạy `env -i PATH=/usr/bin:/bin ./ap/bin/ap --version` được, dù trên PATH không có `node`.
  - Lưu ý: oclif ghi output vào `./dist`, **trùng `outDir` của `tsc`**. Cảnh báo "No S3 bucket or host configured. CLI
    will not be able to update itself."
- **`@oclif/plugin-update` với GitHub Releases:** host thì tuỳ ý. `s3Url()` chỉ ghép `oclif.update.s3.host` + key, và
  template `versioned`/`unversioned`/`manifest` override được (`@oclif/core` 5.0.1 `lib/config/config.js`,
  `buildS3Config`/`s3Url`). Nhưng updater còn fetch các key cố định như
  `channels/<channel>/<bin>-<platform>-<arch>-buildmanifest` và `versions/<bin>-<platform>-<arch>-tar-gz.json`
  ([plugin-update src/update.ts](https://github.com/oclif/plugin-update/blob/main/src/update.ts)). URL asset của Release
  là phẳng (`/releases/download/<tag>/<file>`), nên **không map được** các path lồng nhau này (suy luận). Muốn tự update
  "chỉ GitHub" thì phải host cây file đó trên GitHub Pages hoặc một nhánh raw: **chưa kiểm chứng**, và tốn công duy trì.

### 4.7 Installer đọc GitHub Release: mise, ubi, eget, aqua, Homebrew

- **mise `github:` backend:**
  - Cú pháp `mise use github:owner/repo[@version]`. Tự chọn asset theo OS/arch/libc/định dạng archive; `asset_pattern`
    để chỉ định tay, `bin_path` để trỏ thư mục bin trong archive
    ([mise github backend](https://mise.jdx.dev/dev-tools/backends/github.html)).
  - Asset matcher nhận các alias `darwin`, `win32`, `x64`, `arm64`, … và ưu tiên `tar.zst > tar.xz > tar.gz > zip`
    ([asset_matcher.rs](https://github.com/jdx/mise/blob/main/src/backend/asset_matcher.rs)).
  - Tên file mặc định của `oclif pack` (`ap-v1.0.0-<sha>-linux-x64.tar.gz`, `…-darwin-arm64…`, `…-win32-x64…`) khớp với
    các alias này. Với `bin_path=bin` thì về lý thuyết `mise use -g github:ttungbmt/agent-plugins` sẽ chạy được: **chưa
    kiểm chứng** vì chưa có Release.
  - Nếu cùng repo có cả asset `ap.tgz` (tarball npm) thì nên đặt `asset_pattern` rõ ràng.
- **ubi:** "The ubi backend is **deprecated**. Use the GitHub backend instead"
  ([mise ubi](https://mise.jdx.dev/dev-tools/backends/ubi.html)).
- **aqua:** cần entry trong registry (aqua-registry hoặc registry tự host). Đổi lại có checksums, attestations, cosign,
  SLSA ([mise aqua](https://mise.jdx.dev/dev-tools/backends/aqua.html)). Phải gửi PR hoặc tự host registry, nên chưa đáng
  làm.
- **mise `npm:` backend:** tra version từ npm registry. Installer mặc định (aube) "blocks" nguồn `git+`, `file:`, tarball
  URL nếu không bật `allow_exotic_deps` ([mise npm](https://mise.jdx.dev/dev-tools/backends/npm.html)). Không có registry
  thì không dùng được, và tên `cli` còn trùng package khác trên npm.
- **eget:** "downloads and extracts pre-built binaries from releases on GitHub", có `--all` để giải nén nhiều file, hợp
  nhất với "simple, static prebuilt binaries" ([eget](https://github.com/zyedidia/eget)). Không có lợi gì hơn mise
  (vốn đã dùng trong repo).
- **Homebrew tap:**
  - Repo tap phải tên `homebrew-<name>`, cài bằng `brew install user/repo/formula` ([Taps](https://docs.brew.sh/Taps)).
  - Formula Node chuẩn là `depends_on "node"` + `system "npm", "install", *std_npm_args` +
    `bin.install_symlink libexec.glob("bin/*")`, và docs khuyên "Prefer the release tarball published to the npm
    registry" ([Language-Specific-Formulae](https://docs.brew.sh/Language-Specific-Formulae)). Dùng tarball từ GitHub
    Release có hợp lệ không thì docs không nói → **chưa kiểm chứng**.
  - Cần thêm một repo tap và cập nhật `sha256` mỗi release. Không phục vụ Windows.

## 5. Tổng hợp kết quả thực nghiệm

| Thử nghiệm | Kết quả |
|---|---|
| `pnpm pack` package `cli` hiện tại | `presets: workspace:*` → `"presets": "1.0.0"`; `prepare` bị bỏ; có `dist/.tsbuildinfo` |
| `npm i -g --prefix <scratch> cli-1.0.0.tgz` (hiện tại) | `ETARGET No matching version found for presets@1.0.0` |
| `pnpm add -g` tarball hiện tại | lỗi tương tự (npm chỉ có `presets@0.1.0`) |
| Gộp YAML vào `packages/cli/presets/`, bỏ dep `presets`, đổi `defaultPresetsDir()` thành `fileURLToPath(new URL('../../presets/', import.meta.url))` | tarball 47 KB; `npm i -g` 2.5 s, 93 package, 30 MB; `ap --help` OK; `ap sync --dry-run` với preset `base` OK |
| `pnpm add -g` / `pnpm dlx` / `npx` tarball đã sửa | OK (pnpm cần `$PNPM_HOME/bin` trên PATH) |
| Đổi file sau cùng URL rồi cài lại | `npm i -g`, `pnpm add -g`, `pnpm update -g`: lấy bản mới. `npx` (kể cả `--prefer-online`) và `pnpm dlx`: bản cũ trong cache |
| `pnpm add -g "github:ttungbmt/agent-plugins#dev&path:/packages/cli"` | `Cannot resolve package from workspace…` |
| `npm i -g github:ttungbmt/agent-plugins#dev` | cài package root `agent-plugins`, không có bin `ap` |
| esbuild bundle + oclif explicit strategy, không `node_modules` | `ap.js` 1.2 MB; `--help` và `sync --dry-run` OK |
| esbuild bundle ink+react (ESM) | cần alias `react-devtools-core` → stub; sau đó OK (955 KB) |
| `oclif pack tarballs -t linux-x64` (bản copy standalone) | 19 s; 47 MB `.tar.gz`, 151 MB giải nén; chạy không cần Node |
| `bun build --compile` | 82 MB; cần entrypoint phụ + `loadOptions.pjson`; cảnh báo typescript; presets không tìm thấy nếu không nhúng |

## 6. Khuyến nghị

### Chính: tarball npm đã bundle, đính vào GitHub Release

Người dùng (Linux/WSL/macOS/Windows, đã có Node ≥ LTS):

```sh
npm i -g https://github.com/ttungbmt/agent-plugins/releases/latest/download/ap.tgz
# hoặc: pnpm add -g <cùng URL>
# update: chạy lại đúng lệnh trên
# chạy thử không cài: npx https://github.com/ttungbmt/agent-plugins/releases/download/v<ver>/ap.tgz --help
```

Lý do:
- Một lệnh, không cần clone, không cần pnpm/mise, không cần token. Người dùng Claude Code phần lớn đã có Node, còn mise
  (repo đang dùng) thì cài Node rất dễ.
- Bundle bằng esbuild (1.2 MB, `dependencies: {}`) giúp việc cài không còn phụ thuộc registry: nhanh, cây dependency cố
  định theo lockfile của repo lúc build, không có install script, và hết rủi ro trùng tên `presets`/`cli` trên npm.
- Explicit strategy chỉ cần một file map 2 command, chi phí thấp. Nếu sau này dùng ink thì bundle vẫn chạy (đã thử),
  chỉ cần stub `react-devtools-core` và output ESM.
- CI đơn giản: một job trên tag `v*` gồm `pnpm install` → test → build → bundle → `npm pack` → `gh release upload`,
  upload **cả** `ap.tgz` (tên cố định cho URL `latest`) **và** `ap-<ver>.tgz` (cho npx/pnpm dlx có version).
- Phương án dự phòng nếu muốn bám đúng đường oclif hỗ trợ chính thức: bỏ bundle, giữ pattern strategy, pack tarball bình
  thường (đã thử là chạy). Cái giá là 93 package được resolve lúc cài theo range `^`.

### Bước sau (tùy chọn): binary kèm Node cho người không có Node

Chỉ làm khi thật sự có người dùng không có Node, hoặc cần một đường cài thống nhất:
- Thêm vào job release lệnh `oclif pack tarballs -t linux-x64,linux-arm64,darwin-arm64,darwin-x64,win32-x64` và upload
  lên cùng Release.
- Người dùng: `mise use -g github:ttungbmt/agent-plugins` (khi cần thì kèm `asset_pattern`/`bin_path=bin`), update bằng
  `mise up`.
- Không dùng `@oclif/plugin-update`, vì không map được sang GitHub Releases.
- Phải chạy thử mise asset matching trên Release thật trước khi đưa vào README.

## 7. Thay đổi repo cần cho khuyến nghị chính

1. **Gộp presets vào `packages/cli`:**
   - Chuyển (hoặc copy lúc build) `packages/presets/*.yaml` sang `packages/cli/presets/`, thêm `"presets"` vào `files`,
     bỏ dep `presets: workspace:*`.
   - Đổi `defaultPresetsDir()` sang đường dẫn tương đối theo `import.meta.url`. Đường dẫn phải đúng cho **cả** `dist/`
     (tsc) **lẫn** file bundle: đặt bundle ở `dist/bundle/ap.js` thì `../../presets/` đúng cho cả hai.
   - Cập nhật các `$schema`/tham chiếu tới `packages/presets` (ví dụ `# yaml-language-server: $schema=../schemas/...`
     trong YAML, và mọi chỗ trong docs/ADR nhắc tới package `presets`).
2. **Command map cho explicit strategy:** thêm `src/commands/index.ts` export `COMMANDS = { init, sync }`, đổi
   `oclif.commands` sang `{strategy:"explicit", target:"./dist/bundle/ap.js", identifier:"COMMANDS"}` cho artifact phát
   hành. Có thể giữ pattern cho dev, nhưng sẽ phải có 2 cấu hình.
3. **Script bundle:** thêm devDependency `esbuild` và script `bundle`:
   - ESM, `--platform=node`, banner `createRequire`, `--alias:react-devtools-core=<stub>`,
     `--define:process.env.NODE_ENV='"production"'`.
   - `bin/run.js` import `execute` từ bundle.
   - `package.json` phát hành không có `dependencies`.
4. **Dọn `package.json`:**
   - Đổi `name` sang tên không trùng registry (ví dụ `@ttungbmt/ap` hoặc `agent-plugins-cli`) để `npm ls -g`/`npm
     update -g` không nhầm với `cli@1.0.1` trên npm.
   - Đặt `version` thật và `engines.node`.
   - Loại `dist/.tsbuildinfo` khỏi tarball (đặt ngoài `dist` hoặc thêm `!dist/.tsbuildinfo` vào `files`).
   - Cân nhắc bỏ `ink`/`react`/`cli-progress` cho đến khi thật sự dùng.
   - Bỏ `prepare` (không cần, vì không cài từ git).
5. **CI `.github/workflows/release.yml`** (trigger tag `v*`):
   - `pnpm install --frozen-lockfile`, test, build, bundle.
   - Smoke test `node bin/run.js --help` trên Linux/macOS/Windows.
   - `npm pack`, đổi tên thành `ap.tgz` + `ap-<ver>.tgz`, `gh release create/upload`.
   - Tùy chọn: `actions/attest-build-provenance`.
6. **README:** thay hướng dẫn clone/build bằng một lệnh `npm i -g <url>`, ghi rõ yêu cầu Node LTS, `git`, `claude`.

## 8. Câu hỏi mở cho owner

1. **Có chấp nhận yêu cầu có Node không?** Nếu có một nhóm người dùng đáng kể không có Node (chỉ cài Claude Code bản
   native), thì bước binary (`oclif pack` + mise) thành bắt buộc chứ không còn là tùy chọn.
2. **Bundle hay không bundle?** Chấp nhận đi ngoài đường oclif hỗ trợ ("We do not support bundling") và duy trì command map
   thủ công để đổi lấy tarball 1.2 MB, không phụ thuộc registry? Hay chọn tarball thường (30 MB, 93 package, resolve `^`
   lúc cài)?
3. **Package `presets` có còn cần tách riêng không?** Có ai ngoài `cli` dùng nó (schema, docs, CI) không? Gộp vào `cli`
   (copy lúc build hay chuyển hẳn thư mục)?
4. **Tên package và tên bin:** đổi `cli` sang tên gì? Giữ `ap` làm bin, dù có thể trùng lệnh khác trên máy người dùng?
5. **Windows có phải mục tiêu chính thức không?** Nếu có thì cần CI matrix Windows và kiểm tra `spawn('claude')`/`git`
   trên Windows (chưa kiểm chứng).
6. **Chính sách version/release:** semver + tag `v*` trên `master`? Có cần kênh beta (Release pre-release, URL có tag
   riêng) không?
7. **Có cần `ap` tự update không?** Hay "chạy lại lệnh cài" / `mise up` là đủ? (Tự update qua GitHub Releases không có
   sẵn trong oclif.)
8. **Có muốn provenance/checksum** (GitHub artifact attestations) cho asset Release không? Nếu sau này muốn lên aqua
   registry thì đây là điều kiện nên có.
