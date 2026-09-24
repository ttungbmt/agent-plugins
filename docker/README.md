# Sandbox for `ap`

A clean machine (Node + git + `claude`, **no `ap` yet**) for trying the GitHub Release install the way a real user would.

```bash
# run from the repo root
docker compose run --rm ap            # Node 24
```

Or through mise tasks (`.mise/tasks/`):

| Task                        | What it does                                                   |
| --------------------------- | -------------------------------------------------------------- |
| `mise run docker:build`     | build the image                                                |
| `mise run docker:shell`     | open a shell in a throwaway container (`run --rm ap`)          |
| `mise run docker:rebuild`   | rebuild without cache, picking up the latest `claude`          |
| `mise run docker:reset`     | remove containers and the `/home/node` volume (clean machine)  |

Arguments pass through, e.g. `mise run docker:shell -- node --version`.

Inside the container:

```bash
npm i -g https://github.com/ttungbmt/agent-plugins/releases/latest/download/ap.tgz
ap --version

git init demo && cd demo
ap init
ap sync --dry-run
ap sync                  # project scope: .claude/, .mcp.json
ap sync --scope user     # user scope: ~/.claude

cp /examples/mealops/agent-plugins.yaml .   # the repo's examples, mounted read-only
```

- `/home/node` lives on a volume, so the installed `ap` and `~/.claude` survive between `run`s.
  To get a clean machine back: `docker compose down -v`.
- `npm i -g` installs into `~/.npm-global` (no sudo needed). Uninstall: `npm uninstall -g @ttungbmt/agent-plugins`.
