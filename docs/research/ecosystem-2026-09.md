# Research: Claude Code và các công cụ lân cận, tháng 9/2026

Nguồn kiểm tra ngày 2026-09-25. Claude Code cài ở máy là **v2.1.282**. Mọi mục `2.1.x` bên dưới lấy từ
[CHANGELOG.md](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md). Ngày phát hành tra bằng GitHub
releases API: 2.1.85 là 2026-03-26, 2.1.200 là 2026-07-03, 2.1.282 là 2026-09-24. Số sao GitHub lấy từ GitHub API cùng
ngày. Tài liệu này là đầu vào cho [roadmap](../roadmap.md).

## Tóm tắt

- ADR 0005 vẫn đúng: `claude` vẫn không có lệnh cài skill, agent hay rule
  ([cli-reference](https://code.claude.com/docs/en/cli-reference)). Plugin vẫn không mang theo rule được.
- **Plugin dependencies** (2.1.110–2.1.143) là thay đổi rủi ro nhất cho `ap`
  ([dependencies](https://code.claude.com/docs/en/plugins/dependencies)):
  - `claude` tự cài plugin phụ thuộc, nên Scope có thêm Installed plugin mà không Config nào khai báo.
  - `disable` từ chối tắt một plugin mà plugin khác cần.
  - `ap` hiện chưa xử lý cả hai trường hợp (`registry.ts` không nhắc tới dependencies).
- **`strictPluginOnlyCustomization`**: khi managed setting này bật, Claude Code chặn skill, agent, hook và MCP server
  lấy từ user hoặc project. Những gì `ap` copy hay ghi vào đó sẽ không nạp, và không có thông báo nào
  ([settings-reference](https://code.claude.com/docs/en/settings-reference)).
- **Alias tên khoá** (2.1.232): `additionalMarketplaces` và `allowedMarketplaces` giờ được chấp nhận thay cho
  `extraKnownMarketplaces` và `strictKnownMarketplaces`. `registry.ts` chỉ đọc `extraKnownMarketplaces`.
- **`claude plugin validate --json`** (2.1.259) kiểm tra được thư mục `.claude/skills` trần (2.1.233) và các mục MCP
  (2.1.281). `ap` có thể dùng nó cho một lệnh `doctor`.
- **`claude plugin` có thêm lệnh con**:
  - `prune` và `uninstall --prune` (2.1.121), `details` (2.1.139).
  - Plugin nguồn `archive`: file zip qua HTTPS, ghim bằng SHA-256 (2.1.224).
  - `plugin update` tự tìm Scope của plugin (2.1.281).
- **Plugin cần xác nhận lệnh khi cài** (2.1.238, 2.1.271): plugin nguồn command hỏi `[y/N]`, và khi không có TTY thì
  phải truyền `-y` hoặc `--accept-command <sha256>`. `ap` đã xử lý đúng: không tự chấp nhận, lỗi in ra lệnh để người
  dùng tự chạy (`registry.ts`).
- **Plugin chỉ có `dependencies` đóng vai trò một "bundle"**, trùng một phần với Preset. Ranh giới giữa hai khái niệm
  cần được ghi lại.
- **Thay đổi nhỏ khác**:
  - Khi project không có CLAUDE.md, Claude Code đọc AGENTS.md (2.1.277).
  - Skill trong namespace `anthropic-skills` hoặc `claude-ai` không còn nạp (2.1.282).
  - Managed settings không parse được sẽ chặn Claude Code khởi động (2.1.259).

## Công cụ lân cận

| Công cụ | Sao | Có mà `ap` chưa có |
| --- | --- | --- |
| [microsoft/apm](https://github.com/microsoft/apm) | 3.9k | Xuất ra 9 harness; lock có content hash; `audit` phát hiện drift và Unicode ẩn; policy cho tổ chức; binary Windows |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | 32.4k | `add/find/update` từng skill; registry skills.sh; dùng cho nhiều agent |
| [runkids/skillshare](https://github.com/runkids/skillshare) | 2.7k | Lockfile; `audit` phát hiện prompt injection; `collect` kéo chỉnh sửa tại chỗ về nguồn; Windows; GitHub Action |
| [intellectronica/ruler](https://github.com/intellectronica/ruler) | 2.9k | Khoảng 30 agent; `.ruler/` lồng nhau; tự thêm `.gitignore`; backup và revert |
| [dyoshikawa/rulesync](https://github.com/dyoshikawa/rulesync) | 1.5k | `generate` và `import` giữa nhiều tool; target đóng gói thành plugin Claude Code |

Khoảng trống chung của `ap` so với nhóm này:

- chỉ ghi được cho một harness (Claude Code);
- không chạy native trên Windows;
- không có audit hay quét bảo mật;
- không có lệnh `outdated`, `diff` hay `doctor`.

## Tính năng người dùng hay xin

- **Cài lại đúng như lock**, tương đương `npm ci`:
  [skills#283](https://github.com/vercel-labs/skills/issues/283) (55 reaction),
  [skills#549](https://github.com/vercel-labs/skills/issues/549).
- **Update chỉ đúng thứ được yêu cầu**: [skills#915](https://github.com/vercel-labs/skills/issues/915).
  **Hỗ trợ Renovate**: [apm#639](https://github.com/microsoft/apm/issues/639).
- **Nguồn private có tài liệu đầy đủ**: [skills#381](https://github.com/vercel-labs/skills/issues/381) (82 reaction).
- **Secret trong cấu hình MCP**:
  - [claude-code#28942](https://github.com/anthropics/claude-code/issues/28942) xin `envFile`.
  - Câu trả lời chính thức của Claude Code là plugin `userConfig` với `sensitive: true`
    ([plugins-reference](https://code.claude.com/docs/en/plugins-reference)).
- **Drift, diff, doctor**: [apm drift detection](https://microsoft.github.io/apm/guides/drift-detection/) và
  [sync-agents-settings](https://github.com/Leoyang183/sync-agents-settings).
- **Ghi AGENTS.md và `.agents/skills`**: [apm#1807](https://github.com/microsoft/apm/issues/1807),
  [apm#737](https://github.com/microsoft/apm/issues/737).
