---
title: README hướng dẫn cài bằng Release tarball
labels: [done]
blocked_by: [04]
---

Spec: [../spec.md](../spec.md) (mục README, Further Notes). ADR 0008.

## Việc cần làm
- Mục Cài đặt ở đầu README: lệnh `npm i -g …/latest/download/ap.tgz`, cài bản cụ thể, `pnpm add -g`, cập nhật = chạy lại, gỡ = `npm uninstall -g agent-plugins`, xác minh bằng `gh attestation verify`, yêu cầu Node `>=22`, Windows dùng WSL.
- Chạy không cài: `npx` với URL có version (không dùng `latest` vì bị cache).
- Hướng dẫn dùng chung nhiều repo: Config riêng + `ap sync --scope user`.
- Clone + build chuyển xuống mục "Phát triển"; cách phát hành (`git tag vX.Y.Z && git push --tags`).

## Acceptance
- Mọi lệnh trong README đã chạy thử trên Release thật đầu tiên.
