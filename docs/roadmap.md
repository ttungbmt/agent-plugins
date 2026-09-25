# Roadmap

Cập nhật 2026-09-25, lúc bản mới nhất là `v0.2.0`. Các mục được xếp theo mức cần thiết: mục ở trên chặn hoặc làm
giảm giá trị của mục ở dưới. Nghiên cứu nền: [research/ecosystem-2026-09.md](research/ecosystem-2026-09.md).

Nguyên tắc sắp xếp:

1. Trước hết giữ cho `ap` không hỏng với `claude` mới và không làm hỏng settings của người dùng.
2. Sau đó hoàn thành các tính năng đã làm dở. Một tính năng làm một nửa tệ hơn một tính năng chưa có.
3. Rồi đến những lệnh giúp dùng `ap` hằng ngày.
4. Mở rộng phạm vi (nhiều harness, Windows) để sau cùng, khi phần lõi đã ổn định.

## v0.3.0: Ổn định và làm xong phần dở

Mục tiêu: mọi loại khai báo đã có trong schema đều chạy đủ ở cả ba Scope, và `ap` chạy đúng với Claude Code 2.1.28x.

### P0: Tương thích Claude Code (rủi ro hỏng thật)

- **Plugin dependencies** (2.1.110 trở lên):
  - `claude` tự cài plugin phụ thuộc. Plan cần coi những Installed plugin đó là phụ thuộc, không phải Manual entry.
  - Khi gỡ hoặc tắt một plugin mà plugin khác cần, `claude` từ chối. `ap` phải báo lỗi rõ ràng, hoặc sắp thứ tự các
    thao tác cho đúng.
  - Cần cập nhật `fake-claude.ts` trước (theo CLAUDE.md), và cần một ADR nếu phải đổi cách ghi Lock/State.
- **Đọc cả alias `additionalMarketplaces`** (2.1.232) cạnh `extraKnownMarketplaces` trong `registry.ts`, để không
  thêm trùng một Marketplace đã khai báo bằng tên mới.
- **Cảnh báo khi `strictPluginOnlyCustomization` bật**: nếu không, skill, agent, hook và MCP server mà `ap` ghi vào sẽ
  bị bỏ qua mà không có thông báo nào.

### P1: Đóng các ticket đang mở trong `.scratch/`

Theo thứ tự blocker:

| Tính năng | Ticket còn mở | Ghi chú |
| --- | --- | --- |
| hooks | 02 → 03, 04, 06 → 05 → 07 | `PRESET_SPEC_KEYS` vẫn loại `hooks` (`spec.ts`). Ticket 05 (xác nhận hook từ Remote preset, `--yes`) chặn cả `user-scoped-mcp-server/04` |
| user-scoped-item | 03 → 04, 05 → 06 → 07 | Đã parse `scope: user` trên item, nhưng chưa sync |
| rules | 04, 06, 07, 09 → 08 → 10 | `ruleClaims` và `namespace-clash` chưa có trong code |
| user-scoped-mcp-server | 04, 05 | Chờ hooks/05 |
| workflows | 08 | Báo cáo và `--json` |

- **Rà lại labels**: `user-scoped-marketplace/05` và `user-scoped-plugin/04` có vẻ đã ship (`base.yaml` đã có
  `scope: user`, có commit `1c21fe8`) nhưng chưa được gắn `[done]`.
- **`--json` cho `ap sync`**: ticket của rules và workflows đều cần nó. Nên làm một lần cho tất cả các loại, không
  làm riêng cho từng loại.

### P1: Vệ sinh repo (rẻ, nên làm cùng đợt)

- **Thêm `LICENSE`.** Repo đang public nhưng không có file license, và `package.json` ghi `ISC` như giá trị mặc định.
  Không có license thì về mặt pháp lý không ai được phép dùng code. Đây là quyết định của chủ repo.
- **Bỏ dependency không dùng**: `ink`, `react`, `@types/react`, `cli-progress`, `@types/cli-progress` và `listr2`
  không được import ở đâu trong `src/`. Riêng `listr2` chỉ xuất hiện trong một file test. Cần xác nhận lại trước khi xoá.
- **Chạy CI trên push và PR vào `dev`**: typecheck và test. Hiện CI chỉ chạy khi push tag, nên lỗi chỉ lộ ra đúng lúc
  phát hành.
- **Dọn file dở**: xử lý `src/commands/sync-output.prototype.mjs` (theo quy ước, prototype nên nằm trên nhánh
  `prototype/*`). Dọn `package.json` ở root (`test` đang là placeholder, `license`/`author` để trống).
  `docs/workflow.md` hiện chỉ có vài dòng nháp.
- **Biome** (lint và format): nên làm ngay sau khi có CI, để CI chặn được vi phạm. Đổi format một lần trong một commit
  riêng, rồi thêm commit đó vào `.git-blame-ignore-revs`.

## v0.4.0: Dùng hằng ngày

Mục tiêu: trả lời được ba câu hỏi "có gì cũ?", "máy này lệch ở đâu?", "tại sao không chạy?" mà không phải đọc
settings bằng tay.

1. **`ap doctor`**. Kiểm tra:
   - phiên bản `claude`, `git`, Node;
   - `strictPluginOnlyCustomization` và managed settings;
   - các item đã cài, bằng `claude plugin validate --json` (2.1.259);
   - Lock/State bị lệch so với đĩa.

   Nhiều thông báo trong ticket hooks/06 (hook sẽ không chạy) cũng thuộc về đây.
2. **`ap outdated`**: liệt kê các Skill source, Rule source, Workflow source và Remote preset có commit mới hơn bản
   đang ghim, cùng MCP catalog cũ. Script `pnpm mcp:outdated` đã có sẵn một phần logic.
3. **`ap sync --update <tên>`**: chỉ update đúng nguồn được chỉ định. Người dùng các tool khác phàn nàn khi update
   kéo theo cả những thứ không liên quan ([skills#915](https://github.com/vercel-labs/skills/issues/915)).
4. **Cài lại đúng như lock** (kiểu `npm ci`): một chế độ chỉ cài đúng các commit trong `agent-plugins.lock` và báo
   lỗi nếu Config và lock lệch nhau. Đây là tính năng người dùng các tool tương tự xin nhiều nhất.
5. **Secret cho MCP server**: ghi tài liệu về cách dùng `${VAR}` hiện có, và cân nhắc hỗ trợ `envFile`.

## v0.5.0: Phát hành và cấu trúc repo

Phần này gom các ghi chú "Release dễ hơn", "Tách packages" và "folder architecture" trong bản nháp trước.

- **Release dễ hơn**:
  - Sinh CHANGELOG từ conventional commits (release-please hoặc changesets). Các commit đã có scope nên dùng được
    ngay.
  - Tự tăng `version` và tự tạo tag, thay các bước tay trong `docs/releasing.md`.
  - Vẫn giữ Release tarball theo ADR 0008. Chỉ publish lên npm nếu có ADR mới.
- **Tách packages: chưa nên làm.** Commit `11dcd2d` vừa gỡ `packages/schemas` và đưa schema về root, tức là theo
  hướng ngược lại. Chỉ tách khi có consumer thứ hai. Ví dụ: một `core` dùng chung cho output nhiều harness ở v0.6,
  hoặc một Renovate manager.
- **Kiến trúc thư mục**: `src/sync/` đã có khoảng 50 file và `index.ts` dài 625 dòng. Chạy
  `/improve-codebase-architecture` để tìm seam trước khi quyết định chia theo kind (`sync/items/`, `sync/mcp/`, …) hay
  theo tầng (resolve, plan, apply). Nên tham khảo `microsoft/apm`, dự án có phạm vi gần nhất.
- **Đánh giá Bundled preset** ("plugin và skills đã đủ chưa?"): chạy `/research` so `base.yaml` và MCP catalog với
  `claude-plugins-official` hiện tại và với các nguồn trong bảng Prior Art của README. Ghi kết quả vào
  `docs/research/`.

## v1.0.0: Cam kết ổn định

Tiêu chí để lên 1.0: schema của Config và Preset được đóng băng (URL schema đã là một contract theo ADR 0017), có
hướng dẫn migration khi schema đổi, `ap doctor` và `--json` ổn định, và toàn bộ các mục ở v0.3 và v0.4 đã xong. Sau
1.0, mọi thay đổi phá vỡ cách dùng cũ đều phải tăng major version (xem `docs/releasing.md`).

## Sau 1.0: Mở rộng (cần `/wayfinder`, chưa cam kết)

- **Nhiều harness**: ghi AGENTS.md, `.agents/skills`, cấu hình Codex, Cursor và OpenCode. Đây là khoảng cách lớn nhất
  so với `apm`, `ruler` và `rulesync`. Tính năng này đổi cả định nghĩa của Scope, nên cần một ADR riêng.
- **Windows native**, thay vì bắt buộc dùng WSL.
- **Audit**: quét Unicode ẩn và prompt injection trong các item cài từ nguồn ngoài.
- **Quan hệ giữa Preset và plugin "bundle"** (plugin chỉ có `dependencies`): có nên xuất một Preset thành plugin
  không? Nên ghi lại trong `CONTEXT.md` trước khi làm.

## Cách triển khai mỗi mục

- Mục đã có ticket: `/implement` từng ticket, `/clear` giữa các ticket.
- Mục mới nhưng đã rõ (dependencies, doctor, outdated, cài theo lock): `/grill-with-docs` → `/to-spec` →
  `/to-tickets`.
- Mục còn mơ hồ (nhiều harness, kiến trúc thư mục): `/research` hoặc `/improve-codebase-architecture` trước.
