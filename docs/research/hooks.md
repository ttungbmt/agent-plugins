# Research: supporting "hooks" in `ap`

Sources checked on 2026-09-24 against the locally installed `claude` CLI **v2.1.281** (`claude --version`). Claude Code
docs are the Markdown versions at `code.claude.com/docs/en/*.md` (`hooks`, `hooks-guide`, `settings`,
`settings-reference`, `managed-settings`, `server-managed-settings`, `plugins-reference`, `plugins`, `skills`,
`sub-agents`, `permissions`, `cli-reference`, `commands`). Shipped-format evidence comes from the `hooks/hooks.json`
files of plugins installed under `~/.claude/plugins/`. A few behaviours were checked empirically with the read-only
`claude doctor` and with `claude --init-only` against a throwaway `.claude/settings.json` in a scratch directory; those
checks are marked **(probe)**.

## Summary

- **There is no CLI command to add, remove or list hooks. `ap` must write the `hooks` key itself.** The full
  `claude --help` tree (v2.1.281) has `mcp`, `plugin`, `plugin marketplace`, `auto-mode`, `project`, `import`, `auth`,
  `doctor` … but no `hooks` or `config` subcommand (`claude hooks --help` and `claude config --help` fall through to the
  top-level help, i.e. they would be treated as a prompt). The `claude` command table in
  [cli-reference](https://code.claude.com/docs/en/cli-reference) lists no hooks command either. The `/hooks` slash
  command is "a **read-only** browser for your configured hooks … to add, modify, or remove hooks, edit the settings
  JSON directly or ask Claude to make the change" ([hooks#the-/hooks-menu](https://code.claude.com/docs/en/hooks#the-%2Fhooks-menu)).
  `/config key=value` works in `-p` mode but its accepted keys (`claude -p "/config --help"`) do not include `hooks`.
  `/update-config` is a bundled **skill** in which Claude edits the file ([commands](https://code.claude.com/docs/en/commands)),
  not a deterministic writer. The docs' own removal instruction is "delete its entry from the settings JSON file"
  ([hooks#disable-or-remove-hooks](https://code.claude.com/docs/en/hooks#disable-or-remove-hooks)). This is the same
  situation ADR 0005 records for skills: an exception to ADR 0001 is forced.
- **Shape: event → array of matcher groups → array of handlers.** `"hooks": { "<Event>": [ { "matcher": "…", "hooks":
  [ { "type": "command", … } ] } ] }` ([hooks#configuration](https://code.claude.com/docs/en/hooks#configuration),
  [settings-reference#hooks](https://code.claude.com/docs/en/settings-reference#hooks)). v2.1.281 accepts **33 events**
  (list printed by `claude doctor` for an unknown event, **(probe)**). Five handler types: `command`, `http`,
  `mcp_tool`, `prompt`, `agent` ([hooks#hook-handler-fields](https://code.claude.com/docs/en/hooks#hook-handler-fields)).
- **Matchers are strings with a two-mode syntax.** `"*"`, `""` or omitted = match all; only `[A-Za-z0-9_\- ,|]` = exact
  name or `|`/`,`-separated list; anything else = unanchored JavaScript regex. What the matcher filters differs per
  event, and 10 events ignore matchers entirely ([hooks#matcher-patterns](https://code.claude.com/docs/en/hooks#matcher-patterns)).
  Handlers can narrow further with `if` (one permission rule, tool events only).
- **Hooks from all scopes are concatenated, not overridden; identical handlers run once.** "Hook entries merge across
  settings levels rather than replacing each other" ([hooks#hook-locations](https://code.claude.com/docs/en/hooks#hook-locations));
  "If you define the same handler in more than one settings file, it runs once. A plugin's or skill's copy of the same
  handler stays separate" ([hooks#hook-handler-fields](https://code.claude.com/docs/en/hooks#hook-handler-fields)).
  **(probe)**: the dedup ignores the matcher, `timeout` and unknown extra keys, and also collapses duplicates inside one
  file.
- **Unknown keys inside hook entries are tolerated at runtime, but there is no documented id/name field.** No
  documented field identifies a handler or group (only a top-level `description` in a plugin's `hooks.json`).
  **(probe)**: `claude doctor` flags an unknown event or handler `type` ("entry ignored") but says nothing about extra
  keys such as `"x-ap-id"` on a handler or group, and a handler carrying them still runs. The published
  [JSON schema](https://json.schemastore.org/claude-code-settings.json) however sets `additionalProperties: false` on
  both group and handler, so editors would flag such keys. Safer: identify "our" hooks by content in Lock/State (ADR
  0003) instead of tagging entries.
- **No startup snapshot, no review step for settings hooks (current docs).** "Claude Code watches your settings files
  and reloads them … including edits to `permissions`, `hooks`" ([settings#when-edits-take-effect](https://code.claude.com/docs/en/settings#when-edits-take-effect)).
  The gates are elsewhere: interactive sessions hold back **all** settings-file hooks until the workspace trust dialog
  is accepted, while `-p`/SDK treat the folder as trusted ([hooks#workspace-trust](https://code.claude.com/docs/en/hooks#workspace-trust)).
  Only **server-managed** hook configs need an approval dialog ([server-managed-settings#security-approval-dialogs](https://code.claude.com/docs/en/server-managed-settings#security-approval-dialogs)).
  A user's own `ConfigChange` hook can block a settings change from applying ([hooks#configchange](https://code.claude.com/docs/en/hooks#configchange)).
- **Policy switches that can silently neutralise `ap`-written hooks:** `disableAllHooks` (any scope; precedence-resolved
  boolean), managed-only `allowManagedHooksOnly` (blocks user/project/local and non-force-enabled plugin hooks) and
  managed-only `strictPluginOnlyCustomization: ["hooks"]` (blocks settings-file hooks, keeps plugin hooks)
  ([settings-reference#disableallhooks](https://code.claude.com/docs/en/settings-reference#disableallhooks),
  [#allowmanagedhooksonly](https://code.claude.com/docs/en/settings-reference#allowmanagedhooksonly),
  [#strictpluginonlycustomization-hooks](https://code.claude.com/docs/en/settings-reference#strictpluginonlycustomization-hooks)).
- **Plugins ship hooks as `hooks/hooks.json` (or the manifest `hooks` field: path, array or inline object).** They are
  active whenever the plugin is enabled and merge with settings hooks ([plugins-reference#hooks](https://code.claude.com/docs/en/plugins-reference#hooks),
  [#component-path-fields](https://code.claude.com/docs/en/plugins-reference#component-path-fields)). This means a
  hook bundle can already be delivered through the existing plugin path of `ap` (fully delegated to `claude plugin …`);
  a preset-level `hooks` key only matters for hooks that are not packaged as a plugin.
- **Skills and (non-plugin) subagents can declare `hooks` in frontmatter**, same format; skill hooks live for the rest
  of the session after invocation and honour `once` ([hooks#hooks-in-skills-and-agents](https://code.claude.com/docs/en/hooks#hooks-in-skills-and-agents)).
  Plugin subagents ignore `hooks` ([sub-agents](https://code.claude.com/docs/en/sub-agents#hooks-in-subagent-frontmatter)).

---

## 1. Hooks config format

### Structure

Three levels ([hooks#configuration](https://code.claude.com/docs/en/hooks#configuration)): **hook event** (key of the
`hooks` object) → array of **matcher groups** `{ "matcher"?, "hooks": [...] }` → array of **hook handlers**. The
settings reference gives the type as "object keyed by hook event; each value is an array of `{ "matcher", "hooks" }`
groups whose `hooks` entries have a `type` of `"command"`, `"prompt"`, `"agent"`, `"http"`, or `"mcp_tool"`"
([settings-reference#hooks](https://code.claude.com/docs/en/settings-reference#hooks)). Default: unset.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "if": "Bash(rm *)", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh", "args": [] }
        ]
      }
    ]
  }
}
```

(from [hooks#how-a-hook-resolves](https://code.claude.com/docs/en/hooks#how-a-hook-resolves)). "All matching hooks
run in parallel" ([hooks#hook-handler-fields](https://code.claude.com/docs/en/hooks#hook-handler-fields)), so order
inside the arrays carries no documented meaning. When several `PreToolUse` hooks return `updatedInput`, "the last one
to finish takes effect … non-deterministic" ([hooks-guide#limitations](https://code.claude.com/docs/en/hooks-guide#limitations)).

### Events

The docs table ([hooks#hook-lifecycle](https://code.claude.com/docs/en/hooks#hook-lifecycle)) lists 33 events. The
runtime list printed by `claude doctor` for an unknown event name **(probe)** matches it exactly:

`PreToolUse, PostToolUse, PostToolUseFailure, PostToolBatch, Notification, UserPromptSubmit, UserPromptExpansion,
SessionStart, SessionEnd, Stop, StopFailure, SubagentStart, SubagentStop, PreCompact, PostCompact, PreModelSwitch,
PostModelSwitch, PermissionRequest, PermissionDenied, Setup, TeammateIdle, TaskCreated, TaskCompleted, Elicitation,
ElicitationResult, ConfigChange, WorktreeCreate, WorktreeRemove, InstructionsLoaded, CwdChanged, FileChanged,
DirectoryAdded, MessageDisplay`

Event names are case-sensitive ([plugins-reference#hook-troubleshooting](https://code.claude.com/docs/en/plugins-reference#hook-troubleshooting)).
An unknown event is a **Settings Warning**: "only individual entries fail, such as … an unknown hook event name. Claude
Code skips those values and keeps the rest of the file in effect" ([settings#fix-a-broken-settings-file](https://code.claude.com/docs/en/settings#fix-a-broken-settings-file)).
Note that the published SchemaStore schema lags: it lacks `PreModelSwitch` and `PostModelSwitch`, and the settings doc
itself warns "The schema can lag behind the newest CLI releases" ([settings#edit-a-settings-file](https://code.claude.com/docs/en/settings#edit-a-settings-file)).
`ap` should therefore not hard-code a closed event enum in its preset schema (or should treat it as advisory).

### Matcher semantics

From [hooks#matcher-patterns](https://code.claude.com/docs/en/hooks#matcher-patterns):

| Matcher value | Evaluated as |
| :-- | :-- |
| `"*"`, `""`, or omitted | Match all |
| Only letters, digits, `_`, `-`, spaces, `,`, `\|` | Exact string, or list of exact strings separated by `\|` or `,` (whitespace tolerated) |
| Any other character | JavaScript regex, **unanchored** (`RegExp.prototype.test`) — `Edit.*` also matches `NotebookEdit`; use `^Edit$` |

- Version notes: comma separators need v2.1.191+, hyphens in the exact set v2.1.195+ (earlier a hyphenated name was an
  unanchored regex). `FileChanged` and `StopFailure` use a narrower exact set (letters, digits, `_`, `|` only).
- `mcp__memory` is an exact string and matches **no** tool; use `mcp__memory__.*`. Plugin-bundled MCP tools are named
  `mcp__plugin_<plugin>_<server>__<tool>` ([hooks#match-mcp-tools](https://code.claude.com/docs/en/hooks#match-mcp-tools)).
- What the matcher filters, per event:

| Events | Matcher filters |
| :-- | :-- |
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` | tool name |
| `SessionStart` | `startup`, `resume`, `clear`, `compact`, `fork` |
| `Setup` | `init`, `maintenance` |
| `SessionEnd` | `clear`, `resume`, `logout`, `prompt_input_exit`, `other` |
| `Notification` | notification type (`permission_prompt`, `idle_prompt`, …) |
| `SubagentStart`, `SubagentStop` | agent type |
| `PreCompact`, `PostCompact` | `manual`, `auto` |
| `PreModelSwitch`, `PostModelSwitch` | canonical target model name |
| `ConfigChange` | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` |
| `DirectoryAdded` | `slash_command`, `register_repo_root` |
| `FileChanged` | literal filenames to watch |
| `StopFailure` | error type |
| `InstructionsLoaded` | load reason |
| `UserPromptExpansion` | command name |
| `Elicitation`, `ElicitationResult` | MCP server name |
| `CwdChanged`, `UserPromptSubmit`, `PostToolBatch`, `Stop`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove`, `MessageDisplay` | **no matcher support** (always fires) |

Shipped plugins mix both styles: `security-guidance` omits `matcher` on most groups and uses `"Edit|Write|MultiEdit|NotebookEdit"`;
ECC uses `".*"` on every group; `superpowers` uses `"startup|clear|compact"` on `SessionStart`
(`~/.claude/plugins/cache/…/hooks/hooks.json`).

### Handler types and fields

Common fields, all types ([hooks#common-fields](https://code.claude.com/docs/en/hooks#common-fields)):

| Field | Notes |
| :-- | :-- |
| `type` | required: `command` \| `http` \| `mcp_tool` \| `prompt` \| `agent` |
| `if` | one permission rule, e.g. `"Bash(git *)"`, `"Edit(*.ts)"`; only evaluated on the 5 tool events — "On other events, a hook with `if` set never runs" |
| `timeout` | seconds. Defaults 600 (`command`/`http`/`mcp_tool`), 30 (`prompt`), 60 (`agent`); lowered to 30 on `UserPromptSubmit`/`PreModelSwitch`/`PostModelSwitch`, 10 on `MessageDisplay`; `SessionEnd` shares a 1.5 s budget (raised up to 60 s by longer timeouts) |
| `statusMessage` | spinner text |
| `once` | remove after first successful run; **only honoured in skill frontmatter**, ignored in settings files and agent frontmatter |

Per type:

- **`command`** ([hooks#command-hook-fields](https://code.claude.com/docs/en/hooks#command-hook-fields)): `command`
  (required), `args` (exec form: no shell, placeholders substituted per element), `async`, `asyncRewake` (background,
  wakes Claude on exit 2), `shell` (`"bash"` | `"powershell"`, ignored with `args`). Without `args` it is shell form
  (`sh -c` on macOS/Linux) ([hooks#exec-form-and-shell-form](https://code.claude.com/docs/en/hooks#exec-form-and-shell-form)).
  `async` is "only available on `type: "command"` hooks"; async hooks cannot block and are killed at `-p` teardown
  ([hooks#run-hooks-in-the-background](https://code.claude.com/docs/en/hooks#run-hooks-in-the-background)).
- **`http`** ([hooks#http-hook-fields](https://code.claude.com/docs/en/hooks#http-hook-fields)): `url` (required),
  `headers` (with `$VAR`/`${VAR}` interpolation), `allowedEnvVars` (required for any interpolation). Subject to
  `allowedHttpHookUrls` / `httpHookAllowedEnvVars` from any settings level.
- **`mcp_tool`** ([hooks#mcp-tool-hook-fields](https://code.claude.com/docs/en/hooks#mcp-tool-hook-fields)): `server`
  (required; plugin servers as `plugin:<plugin>:<server>`), `tool` (required), `input` (with `${tool_input.x}`
  substitution). Skipped on `SessionStart` at launch and always on `Setup` (no MCP client yet).
- **`prompt` / `agent`** ([hooks#prompt-and-agent-hook-fields](https://code.claude.com/docs/en/hooks#prompt-and-agent-hook-fields)):
  `prompt` (required, `$ARGUMENTS` placeholder), `model`. Agent hooks are "experimental and may change".
- **No per-handler `env` field** exists in the docs or the schema. Handlers "run in the current directory with Claude
  Code's environment" ([hooks#hook-handler-fields](https://code.claude.com/docs/en/hooks#hook-handler-fields)); env
  vars would come from the settings `env` block or the shell. Plugin hooks additionally get `CLAUDE_PLUGIN_OPTION_<KEY>`
  and exec-form `${user_config.*}` substitution.
- Undocumented but shipped: the first-party `security-guidance` 2.0.8 `hooks.json` uses `rewakeMessage` and
  `rewakeSummary` next to `asyncRewake`. Neither appears in the docs or the SchemaStore schema (the schema's `prompt`
  type also has an undocumented `continueOnBlock`). Evidence that the runtime knows more fields than are documented,
  and that the schema is not authoritative.

### Input/output contract (only what matters for installing)

- Command hooks get the event JSON on **stdin**; HTTP hooks get it as the POST body
  ([hooks#hook-input-and-output](https://code.claude.com/docs/en/hooks#hook-input-and-output)).
- Exit **0** = success (stdout parsed as JSON if it starts with `{` and ends with `}`); exit **2** = blocking error on
  events that can block; any other code = non-blocking error, the action proceeds
  ([hooks#exit-code-output](https://code.claude.com/docs/en/hooks#exit-code-output)).
- A hook that can't start (missing script, not executable) is a non-blocking error: "a mistyped path in
  `settings.json` leaves the gate silently disabled" ([hooks#other-exit-codes](https://code.claude.com/docs/en/hooks#other-exit-codes)).
  Relevant if `ap` ever installs hook scripts: a missing/non-executable script fails open.
- JSON output supports universal fields (`continue`, `stopReason`, `systemMessage`, `terminalSequence`), top-level
  `decision`/`reason`, and `hookSpecificOutput` ([hooks#json-output](https://code.claude.com/docs/en/hooks#json-output)).
  None of this affects how `ap` writes config.

### Path placeholders

`${CLAUDE_PROJECT_DIR}` (project root where the session started; stays put in worktrees), `${CLAUDE_PLUGIN_ROOT}`,
`${CLAUDE_PLUGIN_DATA}` — substituted in both exec and shell form and exported as env vars to the hook process
([hooks#reference-scripts-by-path](https://code.claude.com/docs/en/hooks#reference-scripts-by-path),
[hooks#exec-form-and-shell-form](https://code.claude.com/docs/en/hooks#exec-form-and-shell-form)). The docs recommend
exec form (`args`) whenever a placeholder is used, or double-quoting it in shell form.

## 2. Scopes, merging and policy switches

### Where settings hooks live

| Location | Scope | Shareable |
| :-- | :-- | :-- |
| `~/.claude/settings.json` | all projects | no |
| `.claude/settings.json` | single project | yes (commit) |
| `.claude/settings.local.json` | single project | no (gitignored when Claude Code writes it) |
| Managed policy settings | organization | admin-controlled |
| Plugin `hooks/hooks.json` | when plugin enabled | bundled |
| Skill frontmatter | rest of session after invocation | in skill |
| Subagent frontmatter | while subagent runs | in agent |

([hooks#hook-locations](https://code.claude.com/docs/en/hooks#hook-locations), same table in
[hooks-guide#configure-hook-location](https://code.claude.com/docs/en/hooks-guide#configure-hook-location)). Hooks do
**not** live in `~/.claude.json` (unlike user/local MCP servers), so `ap` stays inside the settings files it already
edits. Hooks load from the cwd's `.claude/` "with no parent-directory fallback"
([permissions](https://code.claude.com/docs/en/permissions)). `CLAUDE_CONFIG_DIR` relocates the home-directory files
([settings#find-or-create-your-settings-files](https://code.claude.com/docs/en/settings#find-or-create-your-settings-files)).
`--settings <file-or-json>` adds a per-session layer above user/project/local.

### How they combine

- **Merge, never override.** "Hook entries merge across settings levels rather than replacing each other: user,
  project, and local settings add their own hooks without removing managed ones"
  ([hooks#hook-locations](https://code.claude.com/docs/en/hooks#hook-locations)); "Hooks merge across files rather
  than replacing each other, and hooks from managed settings can't be removed from other files"
  ([settings-reference#hooks](https://code.claude.com/docs/en/settings-reference#hooks)). In the managed tier, `hooks`
  is in the "Lists — combines the entries from every source" row ([managed-settings](https://code.claude.com/docs/en/managed-settings)).
  Consequence: a project preset **cannot remove or override** a user-scope hook, and vice versa; the only "off switch"
  is the global `disableAllHooks`.
- **Plugin hooks merge too**: "When a plugin is enabled, its hooks merge with your user and project hooks"
  ([hooks#reference-scripts-by-path](https://code.claude.com/docs/en/hooks#reference-scripts-by-path), Plugin scripts tab).
- **Dedup.** "If you define the same handler in more than one settings file, it runs once. A plugin's or skill's copy of
  the same handler stays separate" ([hooks#hook-handler-fields](https://code.claude.com/docs/en/hooks#hook-handler-fields)).
  The docs don't define "same handler". **(probe)** with a project `.claude/settings.json` plus a `--settings` file,
  running `SessionStart` via `claude --init-only --setting-sources project`:
  - same `command` in both, one group with no matcher and one with `"matcher": "startup"` → ran **once**;
  - same `command`, one handler with extra `"x-ap-id"` → ran **once**;
  - same `command`, `timeout: 30` vs `timeout: 60` → ran **once**;
  - the same handler listed twice in one file → ran **once**.

  So the dedup key appears to be the command itself (probably type + command/args/shell; not confirmed), not the whole
  object. Not verified for user-file vs project-file (the probe could not write the user file) or for non-`command`
  types.
- **No dedup across firings of async hooks** ([hooks#limitations](https://code.claude.com/docs/en/hooks#limitations)).

### Switches that affect whether hooks run

- **`disableAllHooks`** (any scope). Resolved by normal precedence, so a project `false` overrides a user `true`. Outside
  managed settings it disables user, project, local and plugin hooks; managed hooks, SDK hooks and managed
  force-enabled plugin hooks keep running. Also turns off custom status line and file suggestion. "There is no way to
  disable an individual hook while keeping it in the configuration"
  ([hooks#disable-or-remove-hooks](https://code.claude.com/docs/en/hooks#disable-or-remove-hooks),
  [settings-reference#disableallhooks](https://code.claude.com/docs/en/settings-reference#disableallhooks)).
- **`allowManagedHooksOnly`** (managed only). Blocks "user, project, and local hooks, hooks from other plugins, and
  hooks declared in agent frontmatter"; only managed hooks, SDK hooks and plugins force-enabled in managed
  `enabledPlugins` (full `plugin@marketplace` id) run ([settings-reference#what-runs-under-allowmanagedhooksonly](https://code.claude.com/docs/en/settings-reference#what-runs-under-allowmanagedhooksonly)).
  An invalid value is treated as `true` ([managed-settings](https://code.claude.com/docs/en/managed-settings)).
- **`strictPluginOnlyCustomization`** containing `"hooks"` (managed only). Stops hooks from user, project and local
  `settings.json`; keeps plugin and managed hooks ([settings-reference#strictpluginonlycustomization-hooks](https://code.claude.com/docs/en/settings-reference#strictpluginonlycustomization-hooks)).
  Note the asymmetry with `allowManagedHooksOnly`: here plugin-packaged hooks survive, settings hooks don't.
- **`allowedHttpHookUrls`, `httpHookAllowedEnvVars`** (any level, merged) restrict HTTP hooks from every source.
- **CLI flags**: `--bare` skips settings and plugin hooks; `--safe-mode` disables hooks; `--setting-sources` limits which
  files load (`claude --help`, [cli-reference](https://code.claude.com/docs/en/cli-reference)).
- **Workspace trust.** Interactive sessions hold back hooks "from every settings file, including your own
  `~/.claude/settings.json`" until the trust dialog is accepted; `-p`/SDK treat the folder as trusted
  ([hooks#workspace-trust](https://code.claude.com/docs/en/hooks#workspace-trust)). When moving into an untrusted
  directory, the trust prompt lists the hooks the directory's settings would activate
  ([permissions](https://code.claude.com/docs/en/permissions)).

## 3. Hooks in plugins, skills and subagents

### Plugins

- **Location**: `hooks/hooks.json` at the plugin root, "or inline in plugin.json"
  ([plugins-reference#hooks](https://code.claude.com/docs/en/plugins-reference#hooks)). The manifest `hooks` field is
  `string|array|object`: "Hook config paths or inline config", e.g. `"./my-extra-hooks.json"`
  ([#component-path-fields](https://code.claude.com/docs/en/plugins-reference#component-path-fields)). Paths must be
  relative and start with `./`. hooks has "own merge rules" relative to the default folder
  ([#path-behavior-rules](https://code.claude.com/docs/en/plugins-reference#path-behavior-rules)), but the Hooks
  section does not spell them out. **Not verified**: whether a manifest `hooks` path replaces or adds to
  `hooks/hooks.json`.
- **File format**: same event → group → handler shape wrapped in `{ "hooks": { … } }`, optional top-level
  `description` ([hooks#reference-scripts-by-path](https://code.claude.com/docs/en/hooks#reference-scripts-by-path))
  and an ignored `$schema` key. Shipped evidence across 16 installed `hooks.json` files: top-level keys `hooks` and
  `description` only; group keys `hooks`, `matcher`; handler keys `type`, `command`, `timeout`, `if`, `async`,
  `asyncRewake`, `shell`, `rewakeMessage`, `rewakeSummary`.
- **Activation**: "When plugin is enabled" ([hooks#hook-locations](https://code.claude.com/docs/en/hooks#hook-locations)),
  i.e. via `enabledPlugins` in the scope's settings, which `ap` already manages. Plugin hook changes need
  `/reload-plugins` or a restart, unlike settings-file hooks ([plugins](https://code.claude.com/docs/en/plugins),
  [plugins-reference#environment-variables](https://code.claude.com/docs/en/plugins-reference#environment-variables)).
- **Variables** ([plugins-reference#environment-variables](https://code.claude.com/docs/en/plugins-reference#environment-variables)):
  `${CLAUDE_PLUGIN_ROOT}` (install dir; changes on update for copied plugins; for a relative-path plugin in a
  local-directory marketplace it is the stable source directory), `${CLAUDE_PLUGIN_DATA}` (persistent, survives updates),
  `${CLAUDE_PROJECT_DIR}`. Placeholders resolve "anywhere the placeholder appears" in hook commands, and are exported to
  hook processes. `${user_config.*}` only in exec form ([hooks#exec-form-and-shell-form](https://code.claude.com/docs/en/hooks#exec-form-and-shell-form)).
- **Hooks for a plugin's own MCP server** must use scoped names (`mcp__plugin_<p>_<s>__<tool>`,
  `plugin:<p>:<s>`) ([plugins-reference#hooks](https://code.claude.com/docs/en/plugins-reference#hooks)).
- `claude plugin validate` checks `hooks/hooks.json` ([plugins-reference#common-issues](https://code.claude.com/docs/en/plugins-reference#common-issues));
  `claude plugin details <name>` lists a plugin's hooks; `claude plugin init --with hooks` scaffolds one (`claude plugin
  init --help`).

### Skills and subagents

- Same format in YAML frontmatter under `hooks:` ([hooks#hooks-in-skills-and-agents](https://code.claude.com/docs/en/hooks#hooks-in-skills-and-agents),
  [skills#frontmatter-reference](https://code.claude.com/docs/en/skills#frontmatter-reference)).
- Skill hooks register on invocation and stay for the rest of the session; `once: true` is honoured only here.
- Subagent hooks run only while that subagent runs; `Stop` is converted to `SubagentStop`. Project subagent frontmatter
  hooks need the exact folder trusted (a `-p` session doesn't count); user-level agents and `--agents` are exempt
  ([sub-agents#hooks-in-subagent-frontmatter](https://code.claude.com/docs/en/sub-agents#hooks-in-subagent-frontmatter)).
- **Plugin subagents ignore `hooks`**, `mcpServers`, `permissionMode` "for security reasons"
  ([plugins-reference#agents](https://code.claude.com/docs/en/plugins-reference#agents)). Agents that `ap` copies into
  `.claude/agents/` (ADR 0005) keep their frontmatter hooks, so `ap`'s agent install already "installs" hooks
  implicitly. Worth surfacing in `ap` output, since `allowManagedHooksOnly` blocks them.

## 4. Can hook writes be delegated to the `claude` CLI?

**No.** Checked exhaustively on v2.1.281:

- `claude --help` subcommands: `agents`, `attach`, `auth`, `auto-mode`, `doctor`, `gateway`, `import`, `install`,
  `logs`, `mcp`, `plugin|plugins`, `project`, `respawn`, `rm`, `setup-token`, `stop|kill`, `ultrareview`,
  `update|upgrade`. None manages hooks.
  - `claude mcp …` manages MCP servers only; `claude plugin …` (`install/uninstall/enable/disable/update/list/details/
    validate/init/tag/eval/prune/marketplace`) manages plugins and marketplaces only.
  - `claude auto-mode` only prints config or resets `autoMode` in user settings; `claude project` has only `purge`.
  - `claude import [codex|gemini|cursor]` imports "instruction files, MCP servers, commands, subagents, and skills"
    ([commands](https://code.claude.com/docs/en/commands), `/import` row) — hooks are not listed.
  - `claude doctor` is read-only diagnostics.
- `claude hooks --help` and `claude config --help` print the top-level help: neither is a subcommand. (There used to be
  a `claude config` command in older releases; it does not exist in v2.1.281.)
- [cli-reference](https://code.claude.com/docs/en/cli-reference) mentions hooks only in flags: `--bare`, `--init`,
  `--init-only`, `--maintenance`, `--include-hook-events`, `--safe-mode`, `--settings`.
- In-session: `/hooks` is read-only ([hooks#the-/hooks-menu](https://code.claude.com/docs/en/hooks#the-%2Fhooks-menu)).
  `/config key=value` (works with `-p`) accepts only UI preference keys (`claude -p "/config --help"` lists `model`,
  `theme`, `permissionMode`, …; no `hooks`). `/update-config` is an LLM skill, not a deterministic command
  ([commands](https://code.claude.com/docs/en/commands)).
- The docs' own guidance: "To remove a hook, delete its entry from the settings JSON file"
  ([hooks#disable-or-remove-hooks](https://code.claude.com/docs/en/hooks#disable-or-remove-hooks)) and "edit the
  settings JSON directly" ([hooks#the-/hooks-menu](https://code.claude.com/docs/en/hooks#the-%2Fhooks-menu)).
- Direct edits are picked up live by the file watcher ([settings#when-edits-take-effect](https://code.claude.com/docs/en/settings#when-edits-take-effect),
  [hooks-guide#hooks-shows-no-hooks-configured](https://code.claude.com/docs/en/hooks-guide#hooks-shows-no-hooks-configured)),
  so writing the file directly has no activation step to miss.

The only delegable path is **indirect**: package the hooks in a plugin (`hooks/hooks.json`) and install/enable it with
`claude plugin install --scope` / `enable --scope`, which `ap` already does for plugins.

## 5. Identifying "our" hooks; reload and review behaviour

### Identity

- **No id/name/description field on groups or handlers** in the docs ([hooks#hook-handler-fields](https://code.claude.com/docs/en/hooks#hook-handler-fields))
  or the schema. Only plugin `hooks.json` has a file-level `description`. `/hooks` identifies a hook by event, matcher,
  type, source file and command/prompt/URL ([hooks#the-/hooks-menu](https://code.claude.com/docs/en/hooks#the-%2Fhooks-menu)).
- **Unknown keys**:
  - Runtime **(probe)**: `claude doctor` reported an unknown event ("Unknown hook event … was ignored") and an unknown
    handler `type` ("Unknown hook type "bogus"; entry ignored") — each only drops that entry; the sibling handler in the
    same group and other groups still ran. Extra keys (`x-ap-group` on a group, `x-ap-id` and `description` on a
    handler) produced **no** warning, and the handler ran.
  - Schema: SchemaStore's `hookMatcher` and every `hookCommand` variant have `additionalProperties: false`, so VS Code
    etc. would show validation errors for tagged entries in a committed `.claude/settings.json`.
  - Docs: silent on unknown keys inside hook entries (the "unrecognized fields are ignored" statement exists only for
    `plugin.json`, [plugins-reference#unrecognized-fields](https://code.claude.com/docs/en/plugins-reference#unrecognized-fields)).
  - Conclusion: tagging works today but is undocumented and could break or start warning; content-based identity is the
    robust option.
- **Dedup interacts with identity.** Because identical commands collapse at runtime **(probe)**, a user's manual copy of
  a hook and `ap`'s copy (same command, maybe different matcher/timeout) run once. `ap` cannot tell from behaviour
  which one is active, only from the file.

### Snapshot / review

- Current docs describe **live reload**, not a startup snapshot: "applies most edits to the running session without a
  restart, including edits to `permissions`, `hooks`" ([settings#when-edits-take-effect](https://code.claude.com/docs/en/settings#when-edits-take-effect));
  "Direct edits to hooks in settings files are normally picked up automatically by the file watcher"
  ([hooks#disable-or-remove-hooks](https://code.claude.com/docs/en/hooks#disable-or-remove-hooks)). If the watcher
  misses a change, restart ([hooks-guide](https://code.claude.com/docs/en/hooks-guide#hooks-shows-no-hooks-configured)).
  No page in the current docs mentions reviewing changed hooks in `/hooks` before they apply. (Older docs described a
  startup snapshot with review in `/hooks`; I found no trace of it now, and `/hooks` is explicitly read-only.)
- Each settings-file change fires `ConfigChange`, which a user hook may **block** ("the new settings are not applied to
  the running session"), silently except for a debug-log line ([hooks#configchange](https://code.claude.com/docs/en/hooks#configchange)).
- Gates that do exist: workspace trust (interactive only, §2), and the **security approval dialog** for hook
  configurations delivered as server-managed settings ([server-managed-settings#security-approval-dialogs](https://code.claude.com/docs/en/server-managed-settings#security-approval-dialogs)).
  Neither applies to `ap` writing local files after trust is accepted.
- Plugin hooks, by contrast, need `/reload-plugins` or a restart after install/update ([plugins](https://code.claude.com/docs/en/plugins)).

---

## Implications for `ap`

- **ADR 0001 (delegate settings writes to `claude`)**: hooks cannot be delegated; there is no CLI writer, and the
  docs themselves say to edit the JSON. `ap` must read and write the `hooks` key of `~/.claude/settings.json`,
  `.claude/settings.json` and `.claude/settings.local.json` directly. This is a forced exception like ADR 0005 (skills),
  and should be recorded as an ADR (or a consequence line in ADR 0001). The write is simpler than the MCP case (ADR
  0006): hooks live only in settings files, never in `~/.claude.json`, and changes apply live without an install step.
  `ap` must preserve every other key and every non-managed hook when rewriting the file. The alternative that stays
  inside ADR 0001 is to ship hooks **as a plugin** (e.g. a generated local-directory marketplace plugin with
  `hooks/hooks.json`, installed via `claude plugin install --scope`). Trade-offs: needs `/reload-plugins`; dedup does
  not apply between plugin and settings copies; under `allowManagedHooksOnly` both are blocked, but under
  `strictPluginOnlyCustomization: ["hooks"]` only the plugin form survives.
- **ADR 0003 (managed entries, per-scope Lock/State)**: the unit of ownership has no name. Options:
  - (a) Record in Lock/State, per scope, a content fingerprint of each handler `ap` wrote, keyed by (event, matcher,
    normalised handler). On sync, remove only entries whose fingerprint matches; a matching manual entry is adopted
    (same rule as for marketplaces); a hand-edited entry no longer matches and becomes manual.
  - (b) Tag entries with an extra key such as `"x-ap": "<preset>/<name>"`. It works at runtime today **(probe)** but is
    undocumented and trips the SchemaStore schema in editors.

  (a) fits ADR 0003 without relying on undocumented tolerance. `ap` should also:
  - write its handlers into **its own matcher groups** rather than appending into a user's existing group with the same
    matcher, so removal can drop a whole group and never splits user content;
  - compare on normalised JSON (key order), not text.

  In the `user` scope the claim-counting rule of ADR 0003 applies unchanged: remove a handler only when no Config still
  claims it. Two Configs declaring the same name with different content are a conflict.
- **Identity in the preset**: a preset needs names for `false`-removal and override (ADR 0004), and Claude Code gives
  none. The natural shape mirrors `mcpServers` (ADR 0006): `spec.hooks` as a **map keyed by an `ap`-level name**, whose
  value is `{ event, matcher?, hooks: [handler…] }` (one matcher group, passed through verbatim), or `false` to drop an
  inherited one. The name exists only in the preset and Lock/State, never in settings.json. Keep handler objects opaque
  and verbatim, as ADR 0006 does for MCP config: the runtime knows fields the docs don't (`rewakeMessage`,
  `continueOnBlock`). Validate only `type` and the required field per type, and treat the event list as a warning, not
  a closed enum (the schema already lags the CLI).
- **ADR 0004 (extends)**: whole-entry override per name works as for other kinds. But child presets can only add or
  replace **their own named entries**; they cannot suppress a hook that comes from another scope or a plugin, because
  Claude Code merges hooks across scopes and has no per-hook disable. Say so in docs. Two presets defining different
  names with the same command are harmless at runtime (dedup) but will look like duplicates in the file; `ap` could warn.
- **ADR 0006 (inline + bundled catalog)**: the same pattern applies. Inline handler config, plus optionally
  `true` = look up a bundled hook catalog in `packages/presets` (e.g. a notification hook or a formatter per OS). Caveats
  a catalog must handle:
  - Hooks are arbitrary code with the user's full permissions ([hooks#disclaimer](https://code.claude.com/docs/en/hooks#disclaimer)).
    A remote preset that adds `hooks` to project/local/user settings gets code execution, and in `-p`/SDK runs even
    without a trust prompt. `ap` should show new/changed hook commands in the plan and probably require explicit
    confirmation (or `--yes`) the first time. This mirrors ADR 0006's refusal to auto-approve `.mcp.json` servers.
  - Secrets: `http` headers support `$VAR`/`${VAR}` only via `allowedEnvVars`; the ADR 0006 rule "secrets only as
    `${VAR}`" carries over to `headers`.
  - Scripts: a hook that points at a script needs that script on disk. `ap` either limits presets to self-contained
    commands (`npx …`, `node -e`, `${CLAUDE_PROJECT_DIR}/…` already in the repo) or also copies script files (a new
    item kind, like skills in ADR 0005). Packaging scripts is exactly what plugins do (`${CLAUDE_PLUGIN_ROOT}`), which
    argues for "hooks with scripts → ship a plugin; `spec.hooks` → only self-contained handlers". A missing script
    fails open ([hooks#other-exit-codes](https://code.claude.com/docs/en/hooks#other-exit-codes)).
- **Scopes**: all three `ap` scopes (`user`, `project`, `local`) have a settings file with a `hooks` key, so unlike
  skills/rules there is no "skip local with notice" case. `ap` can't write managed. Report when
  `disableAllHooks`/`allowManagedHooksOnly`/`strictPluginOnlyCustomization` would neutralise what it writes (readable
  from the settings files, and `claude doctor` shows invalid entries read-only).
- **Verification tooling for `ap` tests**: `claude doctor` (read-only) reports ignored events/types per file, and
  `claude --init-only --setting-sources project` runs `SessionStart`/`Setup` hooks without a conversation. Both are
  handy for integration tests that don't touch the user's real settings.

## Unverified / could not confirm

- **Exact dedup key.** Probes show extra keys, `timeout` and matcher don't matter for `command` handlers; not tested
  whether `args`, `shell` or `if` are part of the key, for other handler types, or between the user file and a project
  file (only project file vs `--settings` and within one file).
- **Long-term tolerance of unknown keys in hook entries.** Observed on v2.1.281 only; undocumented.
- **Whether a plugin manifest `hooks` path replaces or adds to `hooks/hooks.json`** ("own merge rules" is not spelled
  out in the Hooks section).
- **Whether older "startup snapshot + review in `/hooks`" behaviour exists in any form.** Current docs describe only
  live reload; I did not test a mid-session edit in an interactive session (no interactive sessions were started).
- **Semantics of `rewakeMessage`, `rewakeSummary` and `continueOnBlock`.** Seen in a shipped first-party plugin and the
  SchemaStore schema respectively; not documented on code.claude.com.
- **Whether `claude --init-only` or `claude doctor` write anything to `~/.claude.json`** (e.g. project entries) for the
  scratch directory. Neither touched any settings file.
