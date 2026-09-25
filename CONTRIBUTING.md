# Contributing

Start with [`CLAUDE.md`](CLAUDE.md) for the architecture and repo map, and [`CONTEXT.md`](CONTEXT.md) for the glossary.
Decisions live in [`docs/adr/`](docs/adr/), intended behaviour in [`docs/design/`](docs/design/).

## Development

```bash
mise install             # node + pnpm from mise.toml
pnpm install
pnpm ap sync --dry-run   # build packages/cli incrementally and run it
pnpm -C packages/cli test
pnpm -C packages/cli typecheck
```

Test and typecheck must pass before every commit; CI only runs on release tags.

An applying `ap sync` writes to Claude Code's live config. Run it in the Docker sandbox
(`docker compose run --rm ap`, see [`docker/README.md`](docker/README.md)) or with `CLAUDE_CONFIG_DIR` pointed at a
scratch directory.

To try the release build locally: `pnpm -C packages/cli pack:release`, then
`packages/cli/scripts/smoke-release.sh` installs the tarball into a temporary prefix and runs it.

## Releasing

Set `version` in `packages/cli/package.json`, commit, then push a matching tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

The [release workflow](.github/workflows/release.yml) tests, bundles, smoke-tests the tarball on Linux and macOS
with Node 22 and 24, attests it and creates the GitHub Release. A tag with a `-` (e.g. `v0.2.0-beta.1`) becomes a
pre-release and does not move the `latest` link. See [ADR 0008](docs/adr/0008-distribute-ap-via-github-release-tarball.md).

Full runbook (checks, pre-releases, troubleshooting): [docs/releasing.md](docs/releasing.md).
