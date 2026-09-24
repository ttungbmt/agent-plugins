# Phát hành `ap`

Runbook phát hành bản mới của `ap` dưới dạng Release tarball trên GitHub. Lý do chọn cách phân phối này: [ADR 0008](adr/0008-distribute-ap-via-github-release-tarball.md).

Tóm tắt: sửa `version` → commit → push tag `v<version>`. Workflow [`release.yml`](../.github/workflows/release.yml) làm phần còn lại.

## Chọn số version

Theo semver, trên `version` của `packages/cli/package.json`:

| Thay đổi | Tăng | Ví dụ |
| --- | --- | --- |
| Sửa lỗi, không đổi cách dùng | patch | `0.1.0` → `0.1.1` |
| Thêm command, flag, loại khai báo mới | minor | `0.1.1` → `0.2.0` |
| Đổi hoặc bỏ cách dùng cũ (flag, schema YAML, vị trí file) | major (khi đã `1.x`; trước đó tăng minor) | `1.4.0` → `2.0.0` |
| Bản thử cho vài người | pre-release | `0.2.0-beta.1` |

## Các bước

### 1. Chuẩn bị

```bash
git switch dev && git pull
git status          # working tree sạch, hoặc chỉ còn thứ không thuộc bản phát hành
```

Command mới phải có trong `packages/cli/src/commands/index.ts`; test `commands.test.ts` báo đỏ nếu quên.

### 2. Đổi version

```bash
cd packages/cli
npm version 0.2.0 --no-git-tag-version   # hoặc sửa tay "version" trong package.json
cd ../..
```

Chỉ sửa `packages/cli/package.json`; `version` của `package.json` gốc không dùng.

### 3. Thử ở máy mình (nên làm)

```bash
pnpm -C packages/cli typecheck
pnpm -C packages/cli test
pnpm -C packages/cli pack:release            # → packages/cli/release/ap.tgz, ap-<ver>.tgz
packages/cli/scripts/smoke-release.sh        # cài vào prefix tạm, không đụng máy thật
```

### 4. Commit, tag, push

```bash
git add packages/cli/package.json
git commit -m "chore(release): 0.2.0"
git tag v0.2.0
git push origin dev
git push origin v0.2.0
```

Tag phải đúng `v` + `version`. Tag có thể nằm trên `dev` hoặc `master`; workflow không quan tâm nhánh.

### 5. Theo dõi workflow

```bash
gh run watch            # chọn run "release" của tag vừa push
```

Workflow gồm 3 job:

1. **build** — kiểm tra tag khớp `version`, typecheck, test, `pack:release`.
2. **smoke** — cài tarball và chạy `ap` trên ubuntu/macOS × Node 22/24.
3. **release** — tạo attestation, `gh release create` kèm `ap.tgz` và `ap-<ver>.tgz`.

### 6. Kiểm tra bản đã phát hành

```bash
gh release view v0.2.0                     # có ap.tgz và ap-0.2.0.tgz
npm i -g https://github.com/ttungbmt/agent-plugins/releases/latest/download/ap.tgz
ap --version                               # agent-plugins/0.2.0
gh release download v0.2.0 -p ap.tgz -D /tmp/ap-check
gh attestation verify /tmp/ap-check/ap.tgz -R ttungbmt/agent-plugins
```

Người dùng cập nhật bằng cách chạy lại lệnh `npm i -g …/latest/download/ap.tgz`.

## Pre-release

Version và tag có dấu `-` (vd. `0.2.0-beta.1` / `v0.2.0-beta.1`) thành pre-release: không thay link `latest`, người dùng hiện tại không bị ảnh hưởng. Người thử cài bằng URL có version:

```bash
npm i -g https://github.com/ttungbmt/agent-plugins/releases/download/v0.2.0-beta.1/ap-0.2.0-beta.1.tgz
```

Khi ổn, đổi `version` thành `0.2.0` và phát hành như bình thường.

## Khi có sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| Job build lỗi "tag … không khớp version" | Quên sửa `version` hoặc gõ sai tag | Sửa `version`, commit, tạo tag **mới** đúng version |
| Job build lỗi ở `pnpm install` | Dependency mới có build script chưa được khai báo trong `allowBuilds` của `pnpm-workspace.yaml` | Thêm vào `allowBuilds` (`true`/`false`), commit, phát hành version mới |
| Job smoke lỗi | Bundle không chạy (thường do dependency mới không bundle được) | Chạy `pack:release` + `smoke-release.sh` ở máy để tái hiện, sửa, phát hành version mới |
| Link `latest/download/ap.tgz` trả 404 | Chỉ mới có pre-release | Phát hành một bản không có `-` |
| Release đã ra nhưng có lỗi | — | Phát hành bản patch; có thể đánh dấu Release lỗi là pre-release trên GitHub để `latest` trỏ về bản trước |

Nguyên tắc: **không sửa, xoá hay đẩy lại tag đã push**. Người dùng và `npm` có thể đã lấy bản đó; luôn sửa bằng một version mới (vd. `v0.1.0-rc.1` lỗi → `v0.1.0-rc.2`).

## Thêm dependency mới

Mọi dependency của `packages/cli` nằm ở `devDependencies` và được bundle vào `dist/ap.js`; tarball không có `dependencies`. Khi thêm dependency:

- `pnpm -C packages/cli add -D <pkg>`.
- Nếu pnpm báo "Ignored build scripts", khai báo nó trong `allowBuilds` của `pnpm-workspace.yaml`.
- Chạy `pack:release` + `smoke-release.sh` để chắc nó bundle được. Khi bắt đầu import `ink`, bundle đã có sẵn stub `react-devtools-core` (`scripts/react-devtools-stub.js`).
