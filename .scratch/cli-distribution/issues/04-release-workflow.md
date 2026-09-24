---
title: Workflow GitHub Actions phát hành trên tag `v*`
labels: [ready-for-agent]
blocked_by: [03]
---

Spec: [../spec.md](../spec.md) (mục Workflow). ADR 0008.

## Việc cần làm
- `.github/workflows/release.yml`, trigger `push: tags: ['v*']`.
- Job build: install frozen, typecheck, test, so tag với `version` của `packages/cli`, bundle + pack, upload artifact.
- Job smoke: matrix Node 22/24 × ubuntu/macOS chạy `scripts/smoke-release.sh`.
- Job release (sau smoke): `actions/attest-build-provenance` cho `ap.tgz`, `ap-<ver>.tgz`; `gh release create` (tag có `-` → `--prerelease`, không làm `latest`); upload hai file. Quyền `contents: write`, `id-token: write`, `attestations: write`.

## Acceptance
- Chạy thử trên fork hoặc tag `v0.1.0-rc.1` (pre-release): Release có hai file, `gh attestation verify ap.tgz -R ttungbmt/agent-plugins` thành công, `npm i -g <url ap-0.1.0-rc.1.tgz>` chạy được.
- Tag không khớp `version` → job build fail, không tạo Release.
