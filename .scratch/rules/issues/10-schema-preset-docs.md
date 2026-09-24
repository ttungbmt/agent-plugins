---
title: Schema, preset `agent-plugins` và tài liệu cho Rule
labels: [ready-for-agent]
blocked_by: [03, 04, 08]
---

Spec: [../spec.md](../spec.md) (mục Schema, preset, tài liệu). User story 34, 35, 38.

## Việc cần làm
- `preset.schema.json`, `config.schema.json`: thêm `rules` (chuỗi hoặc `{ source, path?, as?, rules | exclude }`, `oneOf` cấm cả hai).
- `packages/presets/agent-plugins.yaml:43`: `rules: [{ source: affaan-m/ECC, rules: [common, typescript, web] }]`.
- `docs/design/ap-sync.md`: mục Rule theo khuôn mục Agent — chỗ khác, conflict `missing-rule`/`modified-rule`/`namespace-clash`, khoá `rules`/`ruleSources`/`ruleClaims`.
- Cân nhắc dịch `docs/research/rules.md` sang tiếng Việt.

## Acceptance
- Xoá hai mục `rules` khỏi `KNOWN_GAPS` trong `packages/cli/src/sync/spec-schema.test.ts`; test đó xanh.
- Test schema hiện có (nếu có) xanh; ví dụ trong spec validate được, ví dụ có cả `rules` + `exclude` bị từ chối.
- `pnpm ap sync` ở gốc repo cài `.claude/rules/ecc/{common,typescript,web}/…` và ghi vào `agent-plugins.lock`.
