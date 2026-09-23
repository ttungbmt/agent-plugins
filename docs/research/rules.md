# Research: supporting "rules" in `ap`

Motivating example: [`affaan-m/ECC` `rules/web/coding-style.md`](https://github.com/affaan-m/ECC/blob/main/rules/web/coding-style.md).
Sources checked on 2026-09-23. ECC links are pinned to commit
[`bf70150`](https://github.com/affaan-m/ECC/tree/bf70150eb2df8070024e5bdf08e4aa08959e2735) (`main` at that date). In
the ECC links below, `E/` stands for `https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/`.
Claude Code docs are the Markdown versions at `code.claude.com/docs/en/*.md`.

## Summary

- **A Claude Code rule is a plain `.md` file under `.claude/rules/` (project) or `~/.claude/rules/` (user).** Claude
  Code finds them recursively, so subfolders are fine. The only frontmatter field it reads is `paths`, a glob list.
  Without `paths` a rule loads at launch. With `paths` it loads only when Claude reads a matching file
  ([memory#organize-rules](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/),
  [#rules-frontmatter-reference](https://code.claude.com/docs/en/memory#rules-frontmatter-reference)). No rule has a
  name. A rule is known only by its file path.
- **Plugins cannot ship rules.** The plugin manifest has no `rules` component. A `CLAUDE.md` at the plugin root is not
  loaded. The docs say to ship instructions as a skill instead
  ([plugins-reference](https://code.claude.com/docs/en/plugins-reference#component-path-fields), line "A `CLAUDE.md`
  file at the plugin root is not loaded as project context…"). ECC says the same: "Claude Code plugins cannot
  distribute `rules`" ([E/README.md#L297](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/README.md#L297)).
  So rules can only be installed by copying files, which is the gap `ap` would fill. This is the same situation as the
  one ADR 0005 describes for skills and agents.
- **ECC's unit is a group directory, not a single file.** `rules/` holds 22 groups (`common/` plus 21
  language/framework groups) and a `README.md`. Groups reuse the same file names (`coding-style.md`, `testing.md`, …).
  Language files link to `../common/<same>.md`, and ECC says to copy **whole directories** into a namespace,
  `~/.claude/rules/ecc/` or `.claude/rules/ecc/`, and never to flatten them
  ([E/rules/README.md#L60-L100](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/README.md#L60-L100)).
- **Every non-`common` ECC rule has `paths:` frontmatter. No `common` rule has any frontmatter.** So `common` always
  loads and is the base layer (10 files, 559 lines). The language groups load only on matching files. The
  "`common` is required" dependency exists only as prose and in ECC's installer, which always copies `common`. There is
  no machine-readable dependency metadata.
- **Copy, don't symlink, for the project scope.** Claude Code treats a rule symlinked from outside the working
  directory like an external import. It does not load until you approve external imports, and even then only rules
  **without** `paths` load ([memory#share-rules-across-projects-with-symlinks](https://code.claude.com/docs/en/memory#share-rules-across-projects-with-symlinks)).
  A symlinked ECC language rule would therefore never load. This is another reason to keep the copy strategy of
  ADR 0005.
- **The item model mostly fits, but identity and granularity don't.** `ItemHandler` (`find`/`list`/`install`/`remove`)
  and the collect/plan pipeline could serve rules almost unchanged if a rule item is a group **directory** (like a
  skill directory). The mismatch is that `ITEM_NAME` forbids `/` and names come from frontmatter `name`, while rules
  have no name, collide across groups and sources, and need a namespace directory to keep `../common` links working.
- **A portable format looks plausible for Claude Code, Cursor and Copilot, but not for Codex.** Markdown body plus a
  glob list maps to Claude `paths`, Cursor `globs` (in `.mdc` files) and Copilot `applyTo` (in `*.instructions.md`
  files). Codex only has per-directory `AGENTS.md` with no globs, and its "rules" are an unrelated command-policy
  feature. ECC keeps separate hand-translated copies for Cursor.

---

## 1. ECC rules format and installation

### Layout

At `bf70150`, `rules/` holds `README.md` plus 22 group directories. Each group is flat, with no nested
subdirectories:

| Group | Files | Group | Files |
|---|---|---|---|
| `common` | 10 | `nuxt` | 5 |
| `angular`, `arkts`, `cpp`, `csharp`, `dart`, `fsharp`, `golang`, `java`, `kotlin` | 5 each | `perl`, `php`, `react`, `ruby`, `rust`, `swift`, `typescript`, `vue` | 5 each |
| `python` | 6 (adds `fastapi.md`) | `react-native` | 8 (adds `accessibility`, `performance`, `production-readiness`) |
| `web` | 7 (`coding-style`, `design-quality`, `hooks`, `patterns`, `performance`, `security`, `testing`) | | |

Source: `gh api repos/affaan-m/ECC/git/trees/main?recursive=1`, filtered to `rules/`. The `common` files are
`agents`, `code-review`, `coding-style`, `development-workflow`, `git-workflow`, `hooks`, `patterns`, `performance`,
`security` and `testing`.

The group list in `rules/README.md` is out of date. It shows 12 groups
([E/rules/README.md#L7-L30](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/README.md#L7-L30)),
while the tree has 22. The ECC repo also has its **own** project rules in `.claude/rules/`
(`everything-claude-code-guardrails.md`, `node.md`), separate from the distributable `rules/`. A discovery rule that
falls back to `.claude/rules/` would pick up the wrong set.

### File format (the motivating file)

[`E/rules/web/coding-style.md`](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/web/coding-style.md)
(108 lines):

```markdown
---
paths:
  - "**/*.css"
  - "**/*.scss"
  - "**/*.sass"
  - "**/*.less"
  - "**/*.html"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
---
> This file extends [common/coding-style.md](../common/coding-style.md) with web-specific frontend content.

# Web Coding Style
## File Organization …  ## CSS Custom Properties …  ## Animation-Only Properties …
## Semantic HTML First …  ## Naming …
```

Other samples:

- [`E/rules/typescript/coding-style.md#L1-L10`](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/typescript/coding-style.md#L1-L10)
  has `paths: ["**/*.ts","**/*.tsx","**/*.js","**/*.jsx"]` and the same "extends common" blockquote.
- [`E/rules/common/coding-style.md`](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/common/coding-style.md)
  has **no frontmatter**. It starts directly with `# Coding Style`.

I checked all 121 rule files:

- **Only one frontmatter key is used: `paths`**, always as a YAML list of quoted globs. It appears in every file
  outside `common/`, and in no file inside `common/`.
- Globs are all `**/…`-style: extensions (`**/*.go`), specific file names (`**/go.mod`, `**/nuxt.config.*`) and
  directory patterns (`**/pages/**`, `**/ohosTest/**`, `**/app/**/*.py`). None uses brace expansion.
- There are no `name`, `description` or `alwaysApply` fields, so a file has no identity other than its path.

### Dependencies between groups

- **Language → common.** 105 files carry the line `> This file extends [common/X.md](../common/X.md) …`. The README
  asks every new language file to start this way
  ([E/rules/README.md#L120-L123](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/README.md#L120-L123)).
  It also marks `common/` as "(always install)"
  ([#L9](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/README.md#L9)).
- **react → typescript + common.** `react/{coding-style,hooks,patterns,security,testing}.md` extend
  `../typescript/*.md` as well as `../common/*.md`. For example,
  [`E/rules/react/coding-style.md#L12`](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/react/coding-style.md#L12).
- **Rule → skill.** Some rules point at ECC skills by name ("See skill: `python-patterns`") or by relative path
  (`../../skills/e2e-testing/SKILL.md` in `react/testing.md`). None of this is enforced.
- **Precedence is a convention only.** "When language-specific rules and common rules conflict, language-specific rules
  take precedence" ([E/rules/README.md#L128-L133](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/README.md#L128-L133)).
  Claude Code itself gives no override semantics between rules (see §2).
- The `../common/…` references are ordinary Markdown links, not `@path` imports, so Claude Code does not load the
  linked file. Only `@path` is an import
  ([memory#import-additional-files](https://code.claude.com/docs/en/memory#import-additional-files)). They matter for
  readers, and ECC says flattening "breaks the relative `../common/` references"
  ([E/rules/README.md#L60-L64](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/README.md#L60-L64)).
  The docs don't say whether Claude follows plain Markdown links on its own.

### How ECC tells users to install rules

- **The plugin does not ship them.** [`E/.claude-plugin/plugin.json`](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/.claude-plugin/plugin.json)
  declares only `skills` and `commands`, although its keywords include `"rules"`. The README says: "Claude Code plugins
  cannot distribute `rules`, so add only the rule packs you actually want"
  ([E/README.md#L297-L307](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/README.md#L297-L307)).
- **Manual install, user scope.** `mkdir -p ~/.claude/rules/ecc`, then `cp -R rules/common ~/.claude/rules/ecc/` and
  `cp -R rules/<stack> ~/.claude/rules/ecc/`
  ([E/README.md#L297-L305](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/README.md#L297-L305),
  [E/rules/README.md#L70-L90](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/README.md#L70-L90)).
  The `ecc/` namespace is deliberate: "Flat package-level destinations can collide with non-ECC rule packs"
  ([E/rules/README.md#L66-L68](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/README.md#L66-L68)).
- **Manual install, project scope.** The same commands under `.claude/rules/ecc/`
  ([E/README.md#L513-L524](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/README.md#L513-L524),
  [E/rules/README.md#L94-L100](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/rules/README.md#L94-L100)).
  ECC also advises: "Rules are always-loaded context, so begin with `common` and one pack".
- **Installer.** `install.sh` is a wrapper around `node scripts/install-apply.js`
  ([E/install.sh](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/install.sh)).
  - **Legacy form** (`./install.sh typescript web`): copies `rules/common` plus each named group into
    `<root>/rules/ecc/<group>` and warns if the destination is not empty
    ([E/scripts/lib/install-executor.js#L216-L253](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/scripts/lib/install-executor.js#L216-L253)).
    Some language names are aliases (`go`→`golang`, `javascript`→`typescript`)
    ([E/scripts/lib/install-manifests.js#L147-L154](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/scripts/lib/install-manifests.js#L147-L154)).
  - **Manifest form.** Module `rules-core` (`kind: "rules"`, `paths: ["rules"]`, `defaultInstall: true`) is mapped
    by the Claude targets to `<root>/rules/ecc/…`
    ([E/manifests/install-modules.json#L5](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/manifests/install-modules.json#L5),
    [E/scripts/lib/install-targets/claude-home.js#L12-L29](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/scripts/lib/install-targets/claude-home.js#L12-L29),
    [claude-project.js#L11-L29](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/scripts/lib/install-targets/claude-project.js#L11-L29)).
    The target root is `~/.claude` or `<project>/.claude`.
  - **Install state** is recorded in `<root>/ecc/install-state.json`. ECC tracks what it owns separately, just as
    `ap` does.
- **Cursor.** ECC keeps separate hand-translated copies in `.cursor/rules/*.md`, 39 flat files named
  `<group>-<file>.md` with `description`/`globs`/`alwaysApply` frontmatter. For example, `golang-coding-style.md` has
  `globs: ["**/*.go", "**/go.mod", "**/go.sum"]` and `alwaysApply: false`. The Cursor installer renames `.md` to
  `.mdc` and skips `README.md`
  ([E/scripts/lib/install-targets/cursor-project.js#L13-L21](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/scripts/lib/install-targets/cursor-project.js#L13-L21)).
  Its helper flattens `rules/<ns>/<file>` to `<ns>-<file>`
  ([E/scripts/lib/install-targets/helpers.js#L208-L250](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/scripts/lib/install-targets/helpers.js#L208-L250)).

## 2. How Claude Code consumes rules

All from [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) unless noted.

- **Locations.**
  - Project: `.claude/rules/` ([#set-up-rules](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/)).
  - User: `~/.claude/rules/`, which "apply to every project on your machine"
    ([#user-level-rules](https://code.claude.com/docs/en/memory#user-level-rules)).
  - The docs describe **no local-scope rules directory**. The personal per-project file is `CLAUDE.local.md`.
  - `.claude/rules/*.md` from `--add-dir` directories also load when
    `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` is set
    ([#load-from-additional-directories](https://code.claude.com/docs/en/memory#load-from-additional-directories)).
  - `.claude/rules/` directories nested in subdirectories load on demand. The docs mention "rules in nested
    `.claude/rules/` directories" as on-demand, and the `managed-only` row says a subdirectory's "`.claude/rules/`
    files … still load when Claude reads a file there"
    ([#choose-which-instruction-files-load](https://code.claude.com/docs/en/memory#choose-which-instruction-files-load)).
- **Subdirectories.** "All `.md` files are discovered recursively, so you can organize rules into subdirectories like
  `frontend/` or `backend/`". So `.claude/rules/ecc/web/coding-style.md` and
  `.claude/rules/ecc/common/coding-style.md` can both exist. A file's name inside its directory does not need to be
  unique.
- **Frontmatter.** "`paths` is the only field Claude Code reads from a rule; any other field is ignored without an
  error. Claude Code removes the frontmatter before loading." `paths` accepts "a YAML list or a comma-separated
  string". If the YAML doesn't parse, the frontmatter is ignored and the rule loads as unconditional
  ([#rules-frontmatter-reference](https://code.claude.com/docs/en/memory#rules-frontmatter-reference)).
- **Conditional loading.**
  - "Rules without a `paths` field are loaded unconditionally". They load "at launch with the same priority as
    `.claude/CLAUDE.md`".
  - Path-scoped rules "trigger when Claude reads files matching the pattern, not on every tool use"
    ([#path-specific-rules](https://code.claude.com/docs/en/memory#path-specific-rules)).
  - After `/compact`, path-scoped rules "reload as Claude reads files they apply to".
- **Glob syntax.** `**`, `*`, brace expansion (`{ts,tsx}`, capped at 1,000 expanded patterns and 4 MiB per rule) and
  bracket expressions (a literal `[` must be escaped). An invalid pattern matches nothing and doesn't affect the
  others (same section).
  - The example `*.md` means "Markdown files in the project root", so patterns are project-relative.
  - **Not stated:** what a `paths` glob in a *user-level* rule is relative to. The ECC `**/…` globs avoid the question.
- **Order and precedence.** "Claude Code loads user-level rules before project rules, so a project rule appears later
  in Claude's context than a user rule. Neither set overrides the other: if a user rule and a project rule conflict,
  Claude may follow either one" ([#user-level-rules](https://code.claude.com/docs/en/memory#user-level-rules)).
  Files are concatenated, not overridden ([#how-claude-md-files-load](https://code.claude.com/docs/en/memory#how-claude-md-files-load)).
  - **Not documented:** the order of files within one rules directory.
- **Symlinks.** "The `.claude/rules/` directory supports symlinks … Circular symlinks are detected".
  - A symlink whose target is outside the working directory is treated like an external import. It needs approval,
    and after approval "only the ones without a `paths` field load".
  - The docs recommend `~/.claude/rules/` for shared rules instead
    ([#share-rules-across-projects-with-symlinks](https://code.claude.com/docs/en/memory#share-rules-across-projects-with-symlinks)).
  - In Cowork sessions, a symlinked `~/.claude/rules/` directory or file pointing outside the working directory is
    skipped ([#import-additional-files](https://code.claude.com/docs/en/memory#import-additional-files), warning box).
- **CLAUDE.md and `@` imports.**
  - Rules are memory files, listed alongside CLAUDE.md in `/memory` and `/context`.
  - The `InstructionsLoaded` hook fires for "a CLAUDE.md or `.claude/rules/*.md` file", with load reasons such as
    `path_glob_match` ([hooks](https://code.claude.com/docs/en/hooks)).
  - `@path` imports are documented for CLAUDE.md, and "user-scope memory files, such as `~/.claude/CLAUDE.md` and
    `~/.claude/rules/`" have their imports trusted. That implies rules can contain `@` imports, but I found no explicit
    sentence saying so for project rules.
  - `.claude/rules/` files keep loading alongside `AGENTS.md` and don't count as a CLAUDE.md
    ([#when-claude-code-reads-agentsmd](https://code.claude.com/docs/en/memory#when-claude-code-reads-agentsmd)).
- **Settings that affect rules.**
  - `claudeMdExcludes`: globs on absolute paths, at any settings layer, arrays merge. It explicitly covers rules and
    their symlink targets ([#exclude-specific-claude-md-files](https://code.claude.com/docs/en/memory#exclude-specific-claude-md-files)).
  - `--setting-sources` without `project` skips project rules.
  - **Project instructions** = `managed-only` drops user and project rules at launch.
  - The docs mention no setting that enables or disables a single rule by name.
- **Size.** The docs advise under 200 lines per file, and a file over 4 MiB is skipped
  ([#troubleshoot](https://code.claude.com/docs/en/memory)). Unconditional rules cost context in every session.

## 3. Can plugins or marketplaces ship rules?

**No.**

- The component path fields in `plugin.json` are `skills`, `commands`, `agents`, `workflows`, `hooks`, `mcpServers`,
  `outputStyles`, `lspServers`, `experimental.{themes,monitors,evals}`, `userConfig`, `channels` and `dependencies`.
  There is no `rules` field ([plugins-reference#component-path-fields](https://code.claude.com/docs/en/plugins-reference#component-path-fields)).
- The directory layout lists `commands/`, `agents/`, `skills/`, `workflows/`, `output-styles/`, `themes/`,
  `monitors/` and `hooks/`, with no `rules/`.
- The docs say: "A `CLAUDE.md` file at the plugin root is not loaded as project context. Plugins contribute context
  through skills, agents, and hooks rather than CLAUDE.md. To ship instructions that load into Claude's context, put
  them in a skill" ([plugins-reference#file-locations-reference](https://code.claude.com/docs/en/plugins-reference#file-locations-reference)).

Official alternatives:

1. **A skill with `paths` frontmatter.** Skills accept `paths`, which "Uses the same format as path-specific rules".
   Claude loads the skill automatically when working with matching files
   ([skills#frontmatter-reference](https://code.claude.com/docs/en/skills#frontmatter-reference)). This is the closest
   plugin-shippable equivalent. The rules docs frame the difference as "Rules load into context every session or when
   matching files are opened. For task-specific instructions that don't need to be in context all the time, use
   skills" ([memory#organize-rules](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/)).
2. **A hook that injects context.** For example, a `SessionStart` hook returning `additionalContext`, capped at
   10,000 characters ([hooks](https://code.claude.com/docs/en/hooks)). The docs don't present this as a rules
   replacement.
3. **Copy files into `.claude/rules/` or `~/.claude/rules/` yourself.** This is what ECC tells users to do (§1).

The Cursor comparison is also useful: Cursor *does* let a plugin carry rules. "Rules aren't imported on their own. To
bring rules in from a GitHub repository, package them in a plugin and publish that plugin through a marketplace"
([cursor.com/docs/context/rules](https://cursor.com/docs/context/rules), "Importing rules from a repository").

## 4. Other tools' equivalents

| Tool | Location | Scoping metadata | Notes |
|---|---|---|---|
| Claude Code | `.claude/rules/**/*.md`, `~/.claude/rules/**/*.md` | `paths` (list or comma string); none → always | Subfolders OK; no name/description |
| Cursor | `.cursor/rules/**/*.mdc` (folders allowed) | `description`, `globs` (comma-separated), `alwaysApply` | "Project rules must use the `.mdc` extension. A plain `.md` file in `.cursor/rules` is ignored"; four modes: always / auto-attached by globs / agent-selected by description / manual `@`-mention; User Rules are settings-only (Customize → Rules), not files; precedence Team → Project → User ([cursor.com/docs/context/rules](https://cursor.com/docs/context/rules)) |
| OpenAI Codex | `~/.codex/AGENTS.md` (or `AGENTS.override.md`), then one `AGENTS.md` per directory from project root to cwd | none (directory placement only) | Concatenated root→cwd, one file per directory, capped by `project_doc_max_bytes` (32 KiB default) ([developers.openai.com/codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md)). Codex "rules" are something else: Starlark `.rules` files under `~/.codex/rules/` that control which commands run outside the sandbox ([developers.openai.com/codex/rules](https://developers.openai.com/codex/rules)) |
| GitHub Copilot | `.github/copilot-instructions.md` (repo-wide) + `.github/instructions/**/NAME.instructions.md` | `applyTo` glob(s), comma-separated; optional `excludeAgent` | ([docs.github.com … add-repository-instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)) |
| Windsurf | not verified | not verified | `docs.windsurf.com/windsurf/cascade/memories` now returns a Devin-branded HTML shell; I could not confirm the current `.windsurf/rules` format from a primary source |

Claude Code's `/init` also reads other tools' files as input: `.cursor/rules/`, `.cursorrules`,
`.github/copilot-instructions.md`, and with `CLAUDE_CODE_NEW_INIT=1` `.windsurf/rules/` and `.clinerules`
([memory](https://code.claude.com/docs/en/memory), "/init" section).

**Portability judgement.** A source format of "Markdown body plus an optional glob list" translates mechanically:

- **Claude:** `paths:` as is.
- **Cursor:** `globs:` as a comma string, `alwaysApply: true` when there are no globs, `.md` renamed to `.mdc`.
- **Copilot:** `applyTo:`, with the file renamed to `*.instructions.md`. There is no documented Copilot equivalent of
  "always apply" beyond `copilot-instructions.md` or `applyTo: "**"`.
- **Codex:** has no glob scoping. A translation would have to concatenate unconditional rules into `AGENTS.md` and
  either drop scoped rules or place them in per-directory files, which a glob can't generally express.
- **Lossy both ways:** Cursor's `description` ("apply intelligently") has no Claude rule equivalent. ECC's own choice,
  hand-maintained Cursor copies with added `description`, suggests automatic translation is lossy in practice.

The `ap` domain today is Claude Code only (CONTEXT.md line 3). Multi-tool output would be a scope change, not a detail
of rules support.

## 5. This repo: how skills and agents work, and where a "rule" kind fits

### Current pipeline for items (skills, agents)

- **Kinds.** `ItemKind = 'skill' | 'agent'` ([packages/cli/src/sync/types.ts:33](../../packages/cli/src/sync/types.ts)).
  Each kind is an `ItemHandler { kind, dir(scope, location), find(root, source), list(dir), install(from, dir, name), remove(dir, name) }`
  ([items.ts:15-25](../../packages/cli/src/sync/items.ts)). The two instances are `SKILLS`
  ([skills.ts:15-22](../../packages/cli/src/sync/skills.ts)) and `AGENTS`
  ([agents.ts:8-15](../../packages/cli/src/sync/agents.ts)).
- **Declaration.** `spec.skills` and `spec.agents` are lists.
  - A string is a source, and "all" is represented as `{ exclude: [] }`.
  - A map has `source` and exactly one of `skills|agents` or `exclude`, plus an optional `path`
    ([resolve.ts:406-435](../../packages/cli/src/sync/resolve.ts)).
  - `path` must be relative and stay inside the source ([resolve.ts:228-234](../../packages/cli/src/sync/resolve.ts)).
  - Sources are parsed by `parseShorthand` ([shorthand.ts:15-25](../../packages/cli/src/sync/shorthand.ts)) and
    restricted to `github`, `git` and `directory`.
  - The schema mirrors this ([packages/schemas/schemas/preset.schema.json:139-250](../../packages/schemas/schemas/preset.schema.json),
    `config.schema.json:33-34`). The `agent-plugins` preset already has a `# rules:` placeholder
    ([packages/presets/agent-plugins.yaml:42](../../packages/presets/agent-plugins.yaml)).
- **Merging.** Declarations are grouped by source without `ref`. A child preset or the Config wins. Sibling presets
  union their selections, and a different `ref` is a `preset-clash`
  ([resolve.ts:165-209](../../packages/cli/src/sync/resolve.ts), `unionSelections`, `outranks` at 211-215).
- **Fetching.** A shallow `git clone --depth 1 [--branch ref]`, or `init` + `fetch --depth 1 <commit>` when pinned,
  into a temp dir. `directory` sources are read in place
  ([skills.ts:31-58](../../packages/cli/src/sync/skills.ts)). When a skill source and an agent source share a
  source and commit, they are fetched once (docs/design/ap-sync.md:110).
- **Discovery.**
  - Skills stop at the first match among `SKILL.md` at the root, `skills/*/SKILL.md` and `*/SKILL.md`. The name comes
    from frontmatter `name`, falling back to the directory name
    ([skills.ts:64-81](../../packages/cli/src/sync/skills.ts)).
  - Agents are non-recursive `.md` files, stopping at the first match among `agents/`, `.claude/agents/` and the root.
    Only files with a frontmatter `name` count, unless `path` is explicit
    ([agents.ts:28-46](../../packages/cli/src/sync/agents.ts)).
  - Names must match `ITEM_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/`, so a name can't contain `/`
    ([items.ts:27](../../packages/cli/src/sync/items.ts)).
- **Collection.** `collectItems` resolves the wanted items from each declaration
  ([collect-items.ts:30-152](../../packages/cli/src/sync/collect-items.ts)).
  - It fetches lazily. A pinned source with a Source catalog is only re-fetched on `--update`, when an item is
    missing on disk, or for `--force` (lines 93-105).
  - Selecting a name that doesn't exist is a `missing-<kind>` conflict (60-71).
  - Two sources producing the same name are resolved with the same precedence rules, otherwise `preset-clash`
    (129-150).
- **Planning.** `planItems` compares desired against installed (`list(dir)`) and managed (Lock/State)
  ([plan-items.ts:36-97](../../packages/cli/src/sync/plan-items.ts)). The outcomes:
  - Install anything missing.
  - Update a managed item whose content changed.
  - `modified-<kind>` when the on-disk hash differs from the Lock and the source, unless `--force`.
  - Adopt a manual entry whose content is identical.
  - Leave a symlinked manual entry alone.
  - Remove managed items that are no longer declared.
  - Forget records whose file disappeared or became a symlink.
- **Install.**
  - Skills: `rm -rf` the target, then `cp -r` the skill directory without `.git`
    ([skills.ts:106-111](../../packages/cli/src/sync/skills.ts)).
  - Agents: `copyFile` of one file to `<name>.md` ([agents.ts:61-66](../../packages/cli/src/sync/agents.ts)).
  - Always a **copy**, never a symlink. ADR 0005 rejected symlinks so that `.claude/skills/` stays self-contained and
    committable and hashing stays simple
    ([docs/adr/0005-ap-installs-skills-itself.md:8](../adr/0005-ap-installs-skills-itself.md)). A symlink found on
    disk is always a manual entry (line 12).
- **Hashing.** Skills use `hashDir`, a sha256 over relative paths and file contents that skips `.git` and records
  symlink targets ([skills.ts:118-134](../../packages/cli/src/sync/skills.ts)). Agents hash the file bytes.
- **Scopes.** The target directory is `<cwd>/.claude/<kind>s` for `project` and `<claudeDir>/<kind>s` for `user`,
  where `claudeDir` honours `CLAUDE_CONFIG_DIR` ([files.ts:13-15](../../packages/cli/src/sync/files.ts),
  [skills.ts:25-28](../../packages/cli/src/sync/skills.ts), [agents.ts:18-21](../../packages/cli/src/sync/agents.ts)).
  `local` returns `null`, and sync prints "…are not synced in local scope"
  ([index.ts:118-120](../../packages/cli/src/sync/index.ts)).
- **State.** `Owned` has separate `skills` + `skillSources` and `agents` + `agentSources`
  ([store.ts:26-33](../../packages/cli/src/sync/store.ts)). Each `ManagedItem` is
  `{ name, source, sha256, origin }` ([types.ts:59](../../packages/cli/src/sync/types.ts)), and each `SourceCatalog` is
  `{ source, commit, names }` (types.ts:62). The user scope adds `skillClaims` and `agentClaims` for sharing across
  repos (store.ts:46-52, ADR 0003).
  - The wiring is **positional**: `items[0]` is skills and `items[1]` is agents
    ([index.ts:137-140](../../packages/cli/src/sync/index.ts), 277-290, 306-320).
  - Conflict reasons are an enumerated union that includes `missing-skill | modified-skill | missing-agent | modified-agent`
    ([types.ts:96-109](../../packages/cli/src/sync/types.ts)).
- **Docs.** The domain terms are in [CONTEXT.md](../../CONTEXT.md) (Skill, Agent, Nguồn …, Danh mục nguồn, Bản cài …,
  Managed/Manual entry). The behaviour spec is in [docs/design/ap-sync.md:85-112](../design/ap-sync.md). Both are
  written in Vietnamese.

### Mapping a "rule" kind

| Concern | Skill/Agent today | Rule: fits or diverges |
|---|---|---|
| Declaration shape | `{ source, path?, skills \| agents \| exclude }` | **Fits.** `spec.rules: [ "affaan-m/ECC", { source: affaan-m/ECC, rules: [common, web] } ]` reuses `readItems`, `mergeItems` and `unionSelections` with `key = 'rules'` |
| Source parsing / fetch / pinning | `github`/`git`/`directory`, shallow git, Source catalog per commit | **Fits unchanged.** A third catalog (`ruleSources`) is needed, since skill and agent sources are pinned separately "even for the same repo" (CONTEXT.md:75) |
| Unit of selection | a skill **dir** / an agent **file** | **Diverges.** ECC's unit is a group directory (`common`, `web`). A group-as-item behaves like a skill dir, so `hashDir` and `cp -r` fit. File-level items would need path identities such as `web/coding-style` |
| Identity / name | frontmatter `name`, `ITEM_NAME` without `/` | **Diverges.** Rules have no `name`. The identity has to come from the path: group dir name, or `group/file`. Group names collide across sources (`common`, `typescript` are generic), so a namespace is needed |
| Discovery in source | `SKILL.md` / `agents/*.md` heuristics | **New.** Probably `rules/*/` (dirs containing `*.md`) → `*/`? Must **not** fall back to `.claude/rules/`, because in ECC that holds ECC's own project rules. Must exclude `rules/README.md`, which would otherwise be installed as an unconditional rule since Claude discovers every `.md` recursively |
| Install layout | `<dir>/<name>` or `<dir>/<name>.md`, flat | **Diverges.** It needs `<scope>/.claude/rules/<namespace>/<group>/…` so that `../common/x.md` links keep working and packs don't collide (ECC's own guidance). `ItemHandler.dir` would return `.claude/rules/<ns>` per source, or `install` would take a relative path |
| Copy vs symlink | copy (ADR 0005) | **Fits, and is stronger here.** A project rule symlinked from outside the working dir loads only after approval, and then only if it has no `paths`, so ECC language rules would silently never load |
| Manual-entry detection | anything in the kind's dir not in Lock/State | **Needs care.** `.claude/rules/` routinely holds the user's own hand-written rules at the top level. `list` should look only at the namespace/group dirs `ap` would write, otherwise every user rule looks like a manual entry for some name |
| Frontmatter handling | reads `name` only | Rules: copy verbatim. `paths` is for Claude Code, not `ap`. Parsing is needed only for a `--dry-run` summary ("always loaded" vs scoped) or future translation to other tools |
| Scopes | `project`, `user`; `local` → skip + notice | **Fits.** No local rules dir is documented, so skip with the same notice. User scope: `<claudeDir>/rules`, where `CLAUDE_CONFIG_DIR` support for rules is not confirmed (see Unverified) |
| Dependencies | none | **New concern.** ECC language groups assume `common`, and `react` assumes `typescript`. This is prose only, with no metadata. `ap` could require explicit selection (`rules: [common, web]`) or warn when a selected group links `../<g>/` to an unselected group |
| Conflicts | `missing-*`, `modified-*`, `manual-entry`, `preset-clash`, `shared-clash` | Add `missing-rule` and `modified-rule` to the `Conflict['reason']` union and to the report schema in docs/design/ap-sync.md:151 |
| Wiring | `items[0]`/`items[1]`, `Owned.skills`/`agents` fields | The positional wiring and per-kind fields (`skillSources`, `agentClaims` …) in index.ts and store.ts would need a third slot, or a refactor to a map keyed by `ItemKind` |

## 6. Two more rule sources: awesome-copilot and awesome-claude-code-toolkit

Both links below are pinned: awesome-copilot at `d7e4ad9`, awesome-claude-code-toolkit at `ebdf1d5`. The stats come
from downloading all 195 files in `instructions/` and grepping their frontmatter.

### rohitg00/awesome-claude-code-toolkit `rules/`

- **Flat folder, 15 files, no subfolders.** `accessibility.md`, `coding-style.md`, `security.md`, `testing.md` and so
  on ([rules/](https://github.com/rohitg00/awesome-claude-code-toolkit/tree/ebdf1d596d2cde5c5cceb32177e8d1cf4829e7d9/rules)).
- **No frontmatter at all.** Every file starts with `# <Title>`
  ([coding-style.md](https://github.com/rohitg00/awesome-claude-code-toolkit/blob/ebdf1d596d2cde5c5cceb32177e8d1cf4829e7d9/rules/coding-style.md)).
  Installed as Claude Code rules, all 15 would load in every session.
- **Install guidance:** "Add to `.claude/rules/` or reference in `CLAUDE.md`." The README has no installer and no
  namespace folder
  ([README "Rules"](https://github.com/rohitg00/awesome-claude-code-toolkit/blob/ebdf1d596d2cde5c5cceb32177e8d1cf4829e7d9/README.md#rules)).
- **Overlap with ECC:** both packs have `coding-style.md`, `security.md`, `testing.md`, `git-workflow.md`,
  `performance.md` and `agents.md`. Copied un-namespaced into the same `.claude/rules/`, they would overwrite each
  other.
- **Selection unit:** a single file (e.g. only `security.md`), not a group folder.

### github/awesome-copilot `instructions/`

- **Flat folder with 194 `*.instructions.md` files.** This is Copilot's format, not Claude Code's
  ([instructions/](https://github.com/github/awesome-copilot/tree/d7e4ad98ed8fd72e4744ee604e6277eb36748fe2/instructions)).
- **Frontmatter:**
  - 187 files have `applyTo` and 180 have `description`. One has `excludeAgent`, and a few have `name`.
  - 5 files (`dataverse-python-*`) have no frontmatter.
  - `applyTo` is a single string. It is comma-separated in 106 files (e.g. `'**/*.astro, **/*.ts, **/*.js'`) and
    uses braces in 32 files.
  - It is `'**'` (always apply) in 38 files, and one file keeps its template placeholder as the value.
  - Some patterns are non-standard, e.g. `'**.cs, **.csproj'`
    ([astro.instructions.md](https://github.com/github/awesome-copilot/blob/d7e4ad98ed8fd72e4744ee604e6277eb36748fe2/instructions/astro.instructions.md)).
- **Where Copilot reads them:** keep the whole file, frontmatter included, in `.github/instructions/`. The
  repository-wide `.github/copilot-instructions.md` needs the body only, without frontmatter
  ([docs/README.instructions.md](https://github.com/github/awesome-copilot/blob/d7e4ad98ed8fd72e4744ee604e6277eb36748fe2/docs/README.instructions.md)).
  Installing is one file at a time, through VS Code buttons or by hand.
- **Plugins in this repo don't bundle instructions.** No `plugins/*/plugin.json` has an `instructions` key.
- **Converting to a Claude rule:**
  - `applyTo: 'a, b'` becomes `paths: [a, b]`, and `applyTo: '**'` means dropping `paths` (always load).
  - `description` has no Claude Code equivalent, so it becomes extra frontmatter that Claude Code ignores.
  - The `.instructions.md` suffix should become `.md`.
  - This means **`ap` has to rewrite the file's frontmatter.** Today `ap` copies skills and agents byte for byte.

### What this adds to the picture

| | ECC `rules/` | toolkit `rules/` | awesome-copilot `instructions/` |
|---|---|---|---|
| Layout | 22 group folders | flat, 15 files | flat, 194 files |
| Selection unit | group folder | file | file |
| Frontmatter | `paths` (except `common`) | none | `applyTo` + `description` (Copilot) |
| Native to Claude Code | yes | yes | no, needs conversion |
| Cross-file links | `../common/x.md` | none | a few relative links |
| File name clashes across sources | `coding-style.md` … | `coding-style.md` … | `*.instructions.md` suffix, so no clash |

Main points:

1. **Single files are a real selection unit.** Two of the three sources are flat folders where users pick
   individual files. A "group folder" item alone doesn't cover them, so the design needs a file (or file-glob)
   selector too, or an item type that can be either a folder or a file.
2. **Namespacing matters.** ECC and the toolkit share file names, so an un-namespaced install collides. A
   per-source namespace folder (`.claude/rules/<ns>/…`) fixes this for all three sources.
3. **Always-loaded rules are the norm, not the edge case.** All 15 toolkit rules and 38 awesome-copilot files load
   unconditionally, so installing "everything" from a source is expensive for context. That argues for explicit
   selection over a bare-source "install all".
4. **Supporting a foreign format means a converter.** awesome-copilot is a large, curated pack, but using it needs
   `applyTo` → `paths` conversion, which ends byte-for-byte copying (and changes how hashes and drift detection
   work). It is a separable, later feature. It is also the mirror image of question 11 (writing Copilot/Cursor
   output).

## Open questions for design

1. **Granularity.** Should a rule item be a **group directory** (ECC-shaped, and skill-like in the code) or a **single
   file**? Should file-level selection inside a group be supported, for example `web` without `design-quality.md`?
2. **Identity and namespace.** What is the rule's name: the group dir, or `group/file`? Where does the namespace dir
   under `.claude/rules/` come from: the repo name, a fixed `ap`/source-derived slug, or a declared field such as
   `as: ecc`? Can two sources both provide `common`?
3. **Installed layout.** Keep ECC's `.claude/rules/<ns>/<group>/<file>.md` so relative links survive, or flatten?
   Does `ap` own the whole `<ns>/` dir, or only each `<group>/` inside it? This decides what `list` scans and what
   counts as a manual entry.
4. **Discovery heuristic.** Which layout in a source counts as "rules": `rules/*/`, a root `*.md`, or `path`-only?
   Always require `path:` for rules to avoid false positives? How should `README.md` files and ECC's
   `.claude/rules/` be excluded?
5. **Group dependencies.** Should dependencies be ignored (the user lists `common` explicitly), inferred from
   `../<group>/` links (warn or auto-add), or declared in `ap` config? What happens when `common` is excluded but
   `web` is kept?
6. **Selecting "all".** Should a bare `affaan-m/ECC` string install all 22 groups? Every non-common rule is
   path-scoped, so the context cost is bounded, but it is still 121 files. Should rules default to requiring an
   explicit selection?
7. **Local scope.** Keep "skip with notice", as for skills and agents, since Claude Code has no local rules dir? Or
   write into `.claude/rules/` with a `.gitignore` entry (which conflicts with "ap doesn't touch `.gitignore`",
   docs/design/ap-sync.md:93)?
8. **Frontmatter validation.** Should `ap` parse `paths` and report rules that will always load, or invalid globs
   (Claude Code silently falls back to unconditional loading on YAML errors)? Or treat rules as opaque bytes?
9. **Refactor or append.** Add a third positional kind (`items[2]`, `ruleSources`, `ruleClaims`, …), or first
   generalise `Owned`/`Sharing` and index.ts to a map keyed by `ItemKind`?
10. **Scope of ADR 0005.** Extend ADR 0005 ("Agent follows the same decision") with rules, or write a new ADR that
    records the namespace/group decision and the symlink finding?
11. **Multi-tool output.** Out of scope, as `ap` is Claude Code only today? If ever in scope, is the source of truth
    Claude-format `paths` (translated to Cursor `.mdc`/`globs` and Copilot `applyTo`), and what happens to Codex?
12. **Skills as an alternative.** Should `ap` also offer rules-as-skills (skill `paths` frontmatter) for users who
    prefer on-demand loading? Probably not, since ECC ships them as rules, but it should be noted.

13. **Item shape across sources.** Does one rule item cover both a folder (ECC group) and a single file (toolkit,
    awesome-copilot)? Or are there two selector forms, e.g. `rules: [web, common]` vs `rules: [security.md]`?
14. **Importing foreign formats.** Should `ap` convert Copilot `*.instructions.md` (`applyTo` → `paths`, drop the
    suffix)? That would be the first time `ap` rewrites content instead of copying it. Is that in v1, later, or
    never?

## Unverified / could not confirm

- **What `paths` globs in `~/.claude/rules/` are matched against** (project root? cwd?). The docs only give
  project-relative examples.
- **Whether Claude Code reads user rules from `$CLAUDE_CONFIG_DIR/rules`** when `CLAUDE_CONFIG_DIR` is set. The docs
  only say `~/.claude/rules/`. `ap` already assumes `claudeDir` for skills and agents.
- **The order of rule files within a single rules directory** (alphabetical? discovery order?). It is not documented.
- **Whether `@path` imports inside a project rule file are expanded.** The docs imply it for user-scope rules but
  don't state it for project rules.
- **Whether Claude follows plain Markdown links** such as ECC's `../common/x.md` on its own. They are not imports
  per the docs.
- **The Windsurf rules format.** The official docs page did not return usable content.
- **Whether ECC's manifest-based `rules-core` install copies `rules/README.md` into `~/.claude/rules/ecc/`.** I did
  not trace `createInstallTargetAdapter`/`HOME_INSTALL_EXCLUDED_SOURCE_PATHS` far enough to be sure.
