#!/usr/bin/env bash
# Cài Release tarball vào prefix tạm và chạy thử `ap` (ADR 0008). Không đụng global prefix hay ~/.claude thật.
# Dùng: scripts/smoke-release.sh [đường dẫn .tgz]   (mặc định release/ap.tgz)
set -euo pipefail

tarball=$(realpath "${1:-$(dirname "$0")/../release/ap.tgz}")
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

manifest=$(tar -xzOf "$tarball" package/package.json)
if node -e 'const p = JSON.parse(process.argv[1]); process.exit(Object.keys(p.dependencies ?? {}).length ? 0 : 1)' "$manifest"; then
  echo "smoke: tarball must not declare dependencies" >&2
  exit 1
fi
if tar -tzf "$tarball" | grep -q '\.tsbuildinfo$'; then
  echo "smoke: tarball must not contain .tsbuildinfo" >&2
  exit 1
fi

npm install --global --prefix "$work/prefix" --no-audit --no-fund "$tarball" >/dev/null
export PATH="$work/prefix/bin:$PATH" HOME="$work/home" CLAUDE_CONFIG_DIR="$work/home/.claude"
mkdir -p "$HOME" "$work/repo"

set -x
ap --version
ap --help >/dev/null
ap init --help >/dev/null
ap sync --help >/dev/null

cd "$work/repo"
ap init --name smoke >/dev/null
cat > agent-plugins.yaml <<'YAML'
kind: Config
metadata:
  name: smoke
spec:
  mcpServers:
    cloudflare-docs: true
YAML
ap sync --dry-run | tee "$work/plan.txt"
grep -q 'cloudflare-docs' "$work/plan.txt"
