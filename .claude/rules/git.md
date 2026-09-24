# Git

- Work on the current branch by default; cut a feature branch from `dev` only when asked. PRs go into `dev`;
  `dev` merges into `master` for a release.
- Commit messages are conventional commits with a scope: `feat(sync): …`, `fix(cli): …`, `docs(research): …`.
- The test and typecheck commands listed in `CLAUDE.md` pass before every commit.
