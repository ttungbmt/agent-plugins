# Research: supporting "workflows" in `ap`

Motivating example: the Workflow tool's saved scripts in `.claude/workflows/`, e.g.
[`anthropics/claude-plugins-official` `plugins/code-modernization/workflows/`](https://github.com/anthropics/claude-plugins-official/tree/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/code-modernization/workflows).
Sources checked on 2026-09-24, against Claude Code 2.1.281 (`claude --version` on this machine). Claude Code docs are the
Markdown versions at `code.claude.com/docs/en/*.md`. The changelog is cited from `anthropics/claude-code` pinned to
[`d78be94`](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md)
(`main` at that date); in the links below, `CL#Lnnn` stands for
`https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#Lnnn`. Other
GitHub links are pinned to the commit named where they first appear.

Two facts below come from a **local experiment**, not from documentation: which files in `.claude/workflows/` get a
name, and what happens on a duplicate name. They are marked *(observed)* and described in §2. Treat them as current
behaviour of 2.1.281, not as a contract.

## Summary

- **A workflow is one JavaScript file whose first statement is `export const meta = { name, description, … }`**, a
  pure object literal, followed by a body with top-level `await` that calls `agent()`, `parallel()`, `pipeline()`,
  `phase()` and `log()` and reads the `args` global
  ([workflows#what-the-saved-script-looks-like](https://code.claude.com/docs/en/workflows#what-the-saved-script-looks-like),
  [#edit-a-saved-script](https://code.claude.com/docs/en/workflows#edit-a-saved-script)). The script runs in a
  sandbox: no filesystem, no shell, and "a script that contains `import()` fails before the run starts"
  ([#behavior-and-limits](https://code.claude.com/docs/en/workflows#behavior-and-limits)). **So the runnable unit is a
  single file.** There are no imports and no directory unit.
- **A workflow is identified by `meta.name`, not by its file name.** A saved workflow "runs as `/<name>`", and a plugin
  script "whose `meta.name` is `release-audit` runs as `/acme-tools:release-audit`"
  ([#distribute-a-workflow-in-a-plugin](https://code.claude.com/docs/en/workflows#distribute-a-workflow-in-a-plugin)).
  Anthropic's own plugin ships `workflows/extract-rules.js` with `name: 'modernize-extract-rules'`, so name and file
  name differ in practice. *(Observed:)* `/metaone` ran a file called `fileone.js`, and `/fileone` did not exist.
- **Invocation:** the `/<name>` command, or the `Workflow` tool with `name`, `script` (inline) or `scriptPath`
  ([agent-sdk/typescript#workflow](https://code.claude.com/docs/en/agent-sdk/typescript#workflow)). `/workflows`
  is the run monitor, not a launcher. `/deep-research` is the one bundled workflow.
- **Locations: project `.claude/workflows/` and user `~/.claude/workflows/`** (or `$CLAUDE_CONFIG_DIR/workflows/`).
  A project workflow wins over a personal one with the same name. In a monorepo every `.claude/workflows/` from the
  cwd up to the repo root loads, and the closest one wins
  ([#save-the-workflow-for-reuse](https://code.claude.com/docs/en/workflows#save-the-workflow-for-reuse)). The
  `.claude` directory reference writes the location as `workflows/*.js`
  ([claude-directory](https://code.claude.com/docs/en/claude-directory)). No local-scope location is documented.
  *(Observed:)* files in subdirectories and `.mjs` files are **not** found by name, and two files with the same
  `meta.name` in one directory resolve silently to one of them.
- **Plugins can ship workflows.** `plugin.json` has a `workflows` path field (string or array, files or
  directories) that **replaces** the default `workflows/` directory, and plugin workflows are namespaced
  `<plugin>:<meta.name>` ([plugins-reference#component-path-fields](https://code.claude.com/docs/en/plugins-reference#component-path-fields),
  [#path-behavior-rules](https://code.claude.com/docs/en/plugins-reference#path-behavior-rules)). This is the key
  difference from rules: `ap` has **no gap to fill** for plugin authors, only for sources that publish loose
  `.js` files.
- **Workflows have soft dependencies that `ap` cannot see as metadata.** `agent(prompt, { agentType })` resolves "from
  the same registry as the Agent tool" (bundled `/workflow-authoring` skill), so a script can need a standalone Agent
  (`general-purpose`, `code-reviewer`) or a plugin agent (`ecc:code-reviewer`). `workflow('name')` runs another saved
  workflow. Some scripts also tell their agents to run helper files by path. All real plugin workflows I found call
  `<plugin>:<agent>` agent types, so **copying them out of their plugin breaks them**.
- **Settings gate workflows, not individual files.** `disableWorkflows`, `enableWorkflows` (off by default on Pro),
  `CLAUDE_CODE_DISABLE_WORKFLOWS`, `disableBundledSkills`, and the `Workflow` / `Workflow(<name>)` permission rules
  ([settings-reference](https://code.claude.com/docs/en/settings-reference#disableworkflows),
  [workflows#approve-the-plan-before-it-runs](https://code.claude.com/docs/en/workflows#approve-the-plan-before-it-runs)).
  There is no per-workflow enable list like `enabledPlugins`, and no documented size limit on a script file.
- **Real-world layouts are mostly flat `*.js` files, but not always.** Sources use `.claude/workflows/*.js` (project
  workflows), a plugin `workflows/*.js`, `*.workflow.js`, `*.mjs`, a directory per workflow
  (`workflows/<name>/workflow.js`), or a script next to helper directories and test files. The
  `hmcuongit/cuonghm-ai-workflow-lab` repo referenced by our preset has a `workflows/` folder, but it contains
  Markdown guides, not Workflow-tool scripts.

---

## 1. What a Claude Code workflow is

All from [code.claude.com/docs/en/workflows](https://code.claude.com/docs/en/workflows) unless noted.

### Concept and availability

- "A dynamic workflow is a JavaScript script that orchestrates many subagents at once. Claude writes the script for
  the task you describe, and a runtime executes it in the background." The script holds the loop, branching and
  intermediate results, so Claude's context only gets the final answer (§ "When to use a workflow").
- Available "on all paid plans, with Anthropic API access, and on Amazon Bedrock, Google Cloud's Agent Platform, and
  Microsoft Foundry. On Pro, turn them on from the Dynamic workflows row in `/config`" (Note at the top).
- The feature appeared in 2.1.154 ("Introducing dynamic workflows", [CL#L3391](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#L3391)).
  It is young and changes often: the trigger keyword was renamed in 2.1.160
  ([CL#L3338](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#L3338)),
  and nested-directory precedence was added in 2.1.178
  ([CL#L3050](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#L3050)).

### File format

The docs' example of a saved file ([#what-the-saved-script-looks-like](https://code.claude.com/docs/en/workflows#what-the-saved-script-looks-like)):

```javascript
export const meta = {
  name: 'audit-routes',
  description: 'Audit every route handler for missing auth checks',
}

const found = await agent('List every .ts file under src/routes/.', {
  schema: { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'string' } } } },
})

const audits = await pipeline(found.files, file =>
  agent(`Audit ${file} for missing authentication checks.`, { label: file }),
)

return audits.filter(Boolean)
```

Rules the loader applies ([#edit-a-saved-script](https://code.claude.com/docs/en/workflows#edit-a-saved-script)):

- **`meta`:** "keep `export const meta` as the first statement, and keep it a plain object literal with a `name` and
  a `description`. If it contains anything other than literal values, such as a variable, a function call, or a
  spread, Claude Code drops `/<name>` from `/` autocomplete."
- **`phases`:** optional in `meta`. Each entry's title must equal the string passed to `phase()`.
- **Body:** `agent()`, `pipeline()`, `parallel()`, `phase()`, `log()` and the `args` global. A syntax error is
  reported when the workflow runs, not when it loads.
- **Determinism:** `Date.now()`, `Math.random()` and a no-argument `new Date()` throw, so that a relaunched run
  repeats the same `agent()` calls.
- **Extension:** the docs only ever say `.js` ("edit its `.js` file"; `workflows/*.js` in
  [claude-directory](https://code.claude.com/docs/en/claude-directory); `release-audit.js` in the plugin layout of
  [plugins-reference](https://code.claude.com/docs/en/plugins-reference#file-locations-reference)).
- **Plain JavaScript, not TypeScript.**

The bundled `/workflow-authoring` skill is the script reference Claude uses; the docs point to it
([#edit-a-saved-script](https://code.claude.com/docs/en/workflows#edit-a-saved-script), "requires Claude Code
v2.1.248 or later"; moved out of the tool description in 2.1.248,
[CL#L1515](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#L1515)).
It has no URL. I read it from the 2.1.281 binary by invoking the skill. It adds facts that the docs page leaves out:

- `meta` also accepts `whenToUse` ("shown in the workflow list"), and each phase entry may carry `model`.
- `agent(prompt, { label, phase, schema, model, effort, isolation: 'worktree', agentType })`. `agentType` "uses a
  custom subagent type (e.g. 'general-purpose', 'code-reviewer') … resolved from the same registry as the Agent tool".
- `workflow(nameOrRef, args?)` runs "another workflow inline as a sub-step". A name resolves in "the same registry as
  `{name: "..."}`". `{scriptPath}` runs a file. "Nesting is one level only."
- `budget` global (token target), and "No filesystem or Node.js API access".

### Identity and invocation

- **By `meta.name`.** "The workflow runs as `/<name>` in future sessions"
  ([#save-the-workflow-for-reuse](https://code.claude.com/docs/en/workflows#save-the-workflow-for-reuse)). For
  plugins, "a script whose `meta.name` is `release-audit` runs as `/acme-tools:release-audit`"
  ([#distribute-a-workflow-in-a-plugin](https://code.claude.com/docs/en/workflows#distribute-a-workflow-in-a-plugin)).
  The `Workflow` tool's output field `workflowName` is "The `meta.name` from the workflow script"
  ([agent-sdk/typescript#workflow](https://code.claude.com/docs/en/agent-sdk/typescript#workflow)).
- **The docs do not say the file name must match.** Anthropic's plugin doesn't match them: `extract-rules.js` has
  `name: 'modernize-extract-rules'`, and `harden-scan.js` has `modernize-harden-scan`, and so on
  ([`plugins/code-modernization/workflows/extract-rules.js#L2`](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/code-modernization/workflows/extract-rules.js#L2)).
  *(Observed, §2:)* the file name plays no part in lookup.
- **Ways to run one:**
  - Type `/<name>` (or `/<plugin>:<name>`). Saved workflows "appear in `/` autocomplete alongside the bundled ones"
    ([#bundled-workflows](https://code.claude.com/docs/en/workflows#bundled-workflows)).
  - Claude calls the `Workflow` tool. At least one of `script`, `name` or `scriptPath` is required. `name` is "Name
    of a built-in workflow or one saved in `.claude/workflows/`". `scriptPath` "Takes precedence over `script` and
    `name`". `args` becomes the `args` global. `resumeFromRunId` resumes
    ([agent-sdk/typescript#workflow](https://code.claude.com/docs/en/agent-sdk/typescript#workflow)).
  - A prompt with the `ultracode` keyword, or `/effort ultracode`, makes Claude **write** a new script. This does not
    involve saved files.
- **`/workflows`** lists running and completed runs, and pressing `s` saves a run's script
  ([#watch-the-run](https://code.claude.com/docs/en/workflows#watch-the-run)). It is not a catalogue of saved
  workflows.
- **Editing takes effect after `/reload-skills`**, which re-reads "the workflow directories"
  ([#edit-a-saved-script](https://code.claude.com/docs/en/workflows#edit-a-saved-script)). A file `ap` writes during
  a running session will not be visible until then or until the next session.
- **Scripts Claude can start:** "Claude can start a workflow only from a script file the session is already allowed
  to read" ([#how-a-workflow-runs](https://code.claude.com/docs/en/workflows#how-a-workflow-runs)). This affects
  `scriptPath`, not named workflows.

## 2. Discovery, precedence and settings

### Locations

| Location | Source | Notes |
|---|---|---|
| `.claude/workflows/` (project) | [workflows#save-the-workflow-for-reuse](https://code.claude.com/docs/en/workflows#save-the-workflow-for-reuse) | "shared with everyone who clones the repo". Loaded from every `.claude/workflows/` between cwd and the repo root; the closest wins on a duplicate name. Saving writes to the closest existing one, else the repo root |
| `~/.claude/workflows/` (user) | same | "If you set `CLAUDE_CONFIG_DIR`, this location is the `workflows/` directory under that path" (fixed for the save dialog in 2.1.208, [CL#L2556](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#L2556)). This matches `ap`'s `claudeDir` |
| local scope | none | No `.claude/workflows.local/` or similar is documented. `settings.local.json` has no workflow key |
| plugin `workflows/` or manifest `workflows` | [plugins-reference](https://code.claude.com/docs/en/plugins-reference#component-path-fields) | See §3 |
| bundled (`/deep-research`) | [#bundled-workflows](https://code.claude.com/docs/en/workflows#bundled-workflows) | Removed by `disableBundledSkills` |

- **Precedence:** "If a project workflow and a personal workflow share a name, the project one runs." Within nested
  project directories, "Claude Code runs the one closest to the working directory"
  ([#save-the-workflow-for-reuse](https://code.claude.com/docs/en/workflows#save-the-workflow-for-reuse);
  [CL#L3050](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#L3050)).
  The docs don't say how a plugin workflow interacts with these. Its name carries a `<plugin>:` prefix, so it
  can't collide with a bare name.
- **Listing is cheap:** "Improved startup time in projects with `.claude/workflows/` scripts: listing them no longer
  parses each script" (2.1.268, [CL#L932](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#L932)).
  That wording suggests the name is read from `meta` without a full parse. The docs don't describe how.
- **Symlinks:** documented only for **saving**. For the project location, Claude Code refuses if `.claude`,
  `.claude/workflows` or the target file is a symlink. For the personal location, it refuses only if the target file
  is a symlink "so a `~/.claude` directory managed by a dotfiles tool still works"
  ([#save-the-workflow-for-reuse](https://code.claude.com/docs/en/workflows#save-the-workflow-for-reuse); 2.1.216,
  [CL#L2320](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#L2320)).
  Whether a symlinked workflow file is **loaded** is not documented. `boshu2/agentops` installs by symlinking into
  `.claude/workflows/` (§5), which suggests loading works, but that is a third party's claim.

### Local experiment (Claude Code 2.1.281)

In a scratch git repo I created `.claude/workflows/` with these files. Each script only did `return 'RESULT-…'`. I
ran `claude -p "/<name>" --allowedTools Workflow` for each one, and once asked Claude to call `Workflow({name})`.

| File | `meta.name` | Result |
|---|---|---|
| `fileone.js` | `metaone` | `/metaone` ran it. `/fileone` was not a command: Claude reported the name lookup failed and ran the file some other way |
| `sub/nested.js` | `nestedwf` | **Not found by name.** It ran only when Claude fell back to `scriptPath` |
| `modfile.mjs` | `mjswf` | **Not found by name.** It ran only through `scriptPath` |
| `a-dup.js` + `b-dup.js` | both `dupwf` | `Workflow({name:'dupwf'})` returned `RESULT-B` with no warning or error |

Conclusions, which hold only as far as one experiment can support them:

1. Lookup is by `meta.name`.
2. Discovery is **flat** and **`.js` only**, which matches the docs' `workflows/*.js`.
3. Duplicate names in one directory are resolved silently. Which file wins, and whether it is the last in
   alphabetical order, is not known.

### Settings and gates

- **`disableWorkflows`** turns workflows and the bundled workflow commands off "for everyone your settings reach".
  **`enableWorkflows`** is the per-user toggle that `/config` writes. Its default is on, "unless you're on the Pro
  plan, where they're off". **`CLAUDE_CODE_DISABLE_WORKFLOWS=1`** turns them off per session
  ([settings-reference#disableworkflows](https://code.claude.com/docs/en/settings-reference#disableworkflows),
  [#enableworkflows](https://code.claude.com/docs/en/settings-reference#enableworkflows),
  [workflows#turn-workflows-off](https://code.claude.com/docs/en/workflows#turn-workflows-off)).
- **`disableBundledSkills`** / `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` removes the bundled skills **and bundled
  workflows** ([settings-reference#disablebundledskills](https://code.claude.com/docs/en/settings-reference#disablebundledskills)).
- **`workflowSizeGuideline`** (`unrestricted|small|medium|large`) and **`workflowKeywordTriggerEnabled`** affect
  workflows Claude *writes*. They don't affect saved ones: "`/workflows`, and saved workflow commands are unaffected"
  ([settings-reference#workflowkeywordtriggerenabled](https://code.claude.com/docs/en/settings-reference#workflowkeywordtriggerenabled)).
- **`CLAUDE_CODE_SAFE_MODE=1`** skips loading workflows, along with skills, plugins and the rest
  ([env-vars](https://code.claude.com/docs/en/env-vars)).
- **Permissions.** Before each run, the CLI asks for approval. The option "Yes, and don't ask again for `<name>` in
  `<path>`" is offered "when you run a bundled, saved, or plugin workflow by name". In Auto mode, "Any **Yes** records
  consent in your user settings". In `-p` and the SDK, allow rules apply: "`Workflow` in your allow rules approves
  every workflow, and `Workflow(<name>)` approves one saved workflow by name"
  ([#approve-the-plan-before-it-runs](https://code.claude.com/docs/en/workflows#approve-the-plan-before-it-runs)).
  Subagents cannot call `Workflow` ([sub-agents](https://code.claude.com/docs/en/sub-agents), tool filter list).
- **Limits** are runtime limits, not file limits: 16 concurrent agents by default, 4,096 items per
  `parallel()`/`pipeline()`, 1,000 agents per run
  ([#behavior-and-limits](https://code.claude.com/docs/en/workflows#behavior-and-limits)). **No per-file size limit
  is documented.**
- **No per-workflow on/off setting** exists in the docs. The only per-name artefacts are the permission rule and
  the stored "don't ask again" consent.

## 3. Can plugins ship workflows?

**Yes.**

- **Component field.** `workflows`: `string|array`, "Custom workflow script files or directories (replaces default
  `workflows/`)", example `"./custom/workflows/"`
  ([plugins-reference#component-path-fields](https://code.claude.com/docs/en/plugins-reference#component-path-fields)).
- **Replace, not add.** `workflows` is in the "Replaces the default" group with `commands`, `agents` and
  `outputStyles`. To keep the default, list it: `["./workflows/", "./extras/"]`. Paths must be relative and start with
  `./` ([#path-behavior-rules](https://code.claude.com/docs/en/plugins-reference#path-behavior-rules)).
- **Default directory.** `workflows/` at the plugin root, "Workflow script files"
  ([#file-locations-reference](https://code.claude.com/docs/en/plugins-reference#file-locations-reference)). The
  example layout shows `workflows/release-audit.js`.
- **Namespace.** `<plugin>:<meta.name>`, e.g. `/acme-tools:release-audit`
  ([workflows#distribute-a-workflow-in-a-plugin](https://code.claude.com/docs/en/workflows#distribute-a-workflow-in-a-plugin)).
  For **agents**, the docs say subfolders become part of the name (`enterprise-plugin:review:<name>`). For
  workflows, the docs say nothing about subfolders.
- **In the wild.** `anthropics/claude-plugins-official` ships workflows in two plugins: `claude-security`
  (`workflows/scan.js`) and `code-modernization` (six scripts). Neither `plugin.json` declares `workflows`. Both
  rely on the default directory
  ([`plugins/code-modernization/.claude-plugin/plugin.json`](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/code-modernization/.claude-plugin/plugin.json)).

### Copying files (ADR 0005/0006 style) vs relying on plugins

| | `ap` copies into `.claude/workflows/` | Plugin via Khai báo plugin (existing path) |
|---|---|---|
| Works today in `ap` | No, a new kind is needed | **Yes.** Declare the marketplace and `name@marketplace: true`. The plugin's `workflows/` loads with it |
| Name | bare `meta.name`, e.g. `/orch-review` | `/<plugin>:<meta.name>` |
| Selecting one workflow of many | Yes, per file | No, the whole plugin (and its skills, agents, hooks) |
| Dependencies (`agentType: '<plugin>:<agent>'`, `${CLAUDE_PLUGIN_ROOT}` helpers) | **Broken** unless the same plugin is also enabled | Satisfied, because they ship together |
| Committable, visible in repo | Yes (project scope) | Only the Plugin entry in settings |
| Sources without a plugin (loose `.claude/workflows/*.js`, `workflows/*.js` repos) | Covered | Not covered |
| Clash handling | `ap` must detect `meta.name` clashes itself, since Claude Code resolves duplicates silently | Namespaced, so no clash |

Unlike rules ([ADR 0009](../adr/0009-rule-per-file-in-namespace.md)), plugins are an official channel. So a workflow
kind is only needed for **non-plugin sources**, and for users who want one script without the plugin's other
components.

## 4. Dependencies and multi-file workflows

- **Single file at runtime.** No `import`/`require`. Dynamic `import()` was a sandbox escape, fixed in 2.1.223
  ([CL#L2127](https://github.com/anthropics/claude-code/blob/d78be9481b889e11186ec4578b4f5e9301396e25/CHANGELOG.md#L2127)).
  A script with `import()` "fails before the run starts". Authors who want shared helpers **inline copies** and check
  them with tests: "The sandbox forbids `import`, so the workflows MUST embed copies; this test is what keeps them
  from drifting"
  ([`transilienceai/communitytools` `.claude/workflows/lib/parity.test.mjs#L1-L4`](https://github.com/transilienceai/communitytools/blob/95fdc128af4ca1ae16b3226f9430f1bad97b0656/.claude/workflows/lib/parity.test.mjs#L1-L4)).
- **Agent types (`agentType`).** A script names a subagent type that must exist in the session:
  - A built-in, e.g. `general-purpose` in ECC's own project workflow
    ([`affaan-m/ECC` `.claude/workflows/ecc-pro-security-roadmap.js#L128`](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/.claude/workflows/ecc-pro-security-roadmap.js#L128)).
  - A **plugin agent**: `ecc:code-reviewer`, `ecc:security-reviewer`, and `ecc:<lang>-reviewer` for 10 languages
    ([ECC `workflows/orch-review.workflow.js#L36-L45`, `#L182-L184`](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/workflows/orch-review.workflow.js#L36-L45));
    `code-modernization:business-rules-extractor` and `code-modernization:legacy-analyst`
    ([`extract-rules.js#L215`](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/code-modernization/workflows/extract-rules.js#L215));
    `claude-security:scan-inventory`, `scan-loader`, `scan-researcher`, `scan-verifier` in `scan.js`.
  - A **standalone Agent** in `.claude/agents/` has a bare name. `ap` installs standalone Agents without a prefix,
    so it can satisfy bare agent types, but it cannot satisfy `<plugin>:<agent>`.
  - What happens when the agent type is missing is not documented (error at `agent()`, or fallback?).
- **Other workflows.** `workflow('content-guard', …)` in `safe-pr.js` needs a saved workflow named `content-guard`
  ([`communitytools` `.claude/workflows/safe-pr.js#L118`](https://github.com/transilienceai/communitytools/blob/95fdc128af4ca1ae16b3226f9430f1bad97b0656/.claude/workflows/safe-pr.js#L118)).
  Per `/workflow-authoring`, an unknown name throws.
- **Helper files run by agents.** The script can't touch files, but its prompts can tell agents to run them.
  - `thkt/dotclaude` resolves helpers under `$HOME/.claude/<rel>` or, failing that, under `~/.claude/plugins/`, and
    has agents run `node workflows/build/record.ts`
    ([`workflows/build.js#L192-L193`](https://github.com/thkt/dotclaude/blob/5b85a887d702678a438696c88998afb877e4b6ec/workflows/build.js#L192-L193)).
  - Anthropic's `claude-security` script tells the agent to run `save_result.py` from the plugin's `scripts/`.
  - These are real multi-file units, but the coupling lives only in prompt text.
- **Skills and commands.** Plugins pair a workflow with a command that calls it by path, e.g.
  `Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/extract-rules.js", … })`
  ([`commands/modernize-extract-rules.md#L25-L26`](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/code-modernization/commands/modernize-extract-rules.md#L25-L26)).
  ECC's `/orch-review` command does the same with `scriptPath: "workflows/orch-review.workflow.js"`
  ([ECC `workflows/README.md#L24-L34`](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/workflows/README.md#L24-L34)).
  Calls by `scriptPath` don't need the file in `.claude/workflows/` at all.
- **No machine-readable dependency metadata.** `meta` has no field for agents or other workflows. Static scanning
  for `agentType: '…'` and `workflow('…')` string literals would find most cases, but not computed ones (ECC builds
  `agentType` from a lookup table).

## 5. Real-world sources

Found with GitHub code search (`"export const meta" path:.claude/workflows`, about 3,400 hits;
`"workflows" filename:plugin.json path:.claude-plugin`). Each repo was inspected at the commit shown.

| Repo @ commit | Where | Unit | Notes |
|---|---|---|---|
| [anthropics/claude-plugins-official @ `6bfd4e0`](https://github.com/anthropics/claude-plugins-official/tree/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/code-modernization/workflows) | `plugins/<p>/workflows/*.js` (default dir) | file | `meta.name` ≠ file stem (`modernize-*`). Depends on plugin agents and commands. `scan.js` is minified to one line (`export const meta={name:"scan",…}`) |
| [affaan-m/ECC @ `bf70150`](https://github.com/affaan-m/ECC/tree/bf70150eb2df8070024e5bdf08e4aa08959e2735/workflows) | `workflows/orch-review.workflow.js` + `README.md`; also ECC's **own** `.claude/workflows/ecc-pro-security-roadmap.js` | file | Marketplace plugin `ecc` has `source: "./"` and no `workflows` field, so by the docs the default `workflows/` would load as `ecc:orch-review` (not verified). Uses `ecc:*` agent types. The README lists "Installer / manifest wiring so the script ships to `~/.claude/`" as a follow-up ([#L65](https://github.com/affaan-m/ECC/blob/bf70150eb2df8070024e5bdf08e4aa08959e2735/workflows/README.md#L65)) |
| [transilienceai/communitytools @ `95fdc12`](https://github.com/transilienceai/communitytools/tree/95fdc128af4ca1ae16b3226f9430f1bad97b0656/.claude/workflows) | `.claude/workflows/*.js` (13) + `lib/*.mjs` helpers and tests | file, plus sibling `lib/` | Plugin manifest has no `workflows` field, and the scripts are not in a plugin `workflows/`. Workflows call each other (`workflow('content-guard')`) |
| [boshu2/agentops @ `c3fe161`](https://github.com/boshu2/agentops/tree/c3fe161dce0b85d1e0490df757bbb841d22e4ea1/workflows) | `workflows/*.js` (9) | file | Ships as plugin (`agentops:bulk-read`) **and** its own CLI `ao workflows link` symlinks them into a gitignored `.claude/workflows/`: "idempotent, refuses to replace foreign links or real files" ([README#L27-L50](https://github.com/boshu2/agentops/blob/c3fe161dce0b85d1e0490df757bbb841d22e4ea1/workflows/README.md#L27-L50)), close to what `ap` would do. It also says the named-workflow registry is snapshotted at session start |
| [pjt222/agent-almanac @ `8a8355e`](https://github.com/pjt222/agent-almanac/tree/8a8355e01dd49dd9967e19cf993706cd1d89cefe/workflows) | `workflows/*.mjs` + `_template.mjs` + `README.md` | file | Treats workflows as a fifth content type next to skills and agents. It says to install into `.claude/workflows/<name>.mjs` and keep file stem = `meta.name`, but my experiment found `.mjs` is **not** discovered by name. Adds a `// ---` sidecar frontmatter comment before `meta` |
| [thkt/dotclaude @ `5b85a88`](https://github.com/thkt/dotclaude/tree/5b85a887d702678a438696c88998afb877e4b6ec/workflows) | `workflows/<name>.js` + `workflows/<name>/*.ts` + `workflows/_lib/` | **file + helper dir** | A whole `~/.claude` dotfiles repo, also installable as plugin `build`. Helpers are found by path at run time |
| [lxxgg92/xianxin-design-workflow @ `99218be`](https://github.com/lxxgg92/xianxin-design-workflow/tree/99218be2286eeb54fe80c8fe3eff678deadc5056/workflows/screenshot-verify) | `workflows/<name>/workflow.js` + `README.md` | **directory** | Install instructions rename the file: `cp workflow.js ~/.claude/workflows/screenshot-verify.js` |
| [Necmttn/ax @ `c6836a1`](https://github.com/Necmttn/ax/tree/c6836a1da70e5e38e4d423f4fb1489398be9c93b/.claude/workflows), [Scaffold-Stark/scaffold-stark-2 @ `ae1b689`](https://github.com/Scaffold-Stark/scaffold-stark-2/tree/ae1b689bbb6126e09dd6c8716d1c0a7a4b70ee76/.claude/workflows) | `.claude/workflows/*.workflow.js`, `.claude/workflows/*.mjs` | file | Naming variants. `.workflow.js` still ends in `.js`. The `.mjs` one would not be found by name, per §2 |
| [hivellm/rulebook @ `91a298f`](https://github.com/hivellm/rulebook/tree/91a298f34444eb3a0a3029b473e0e8d31834767f/.claude/workflows) | `.claude/workflows/*.js` (6) | file | Its `templates/workflows/*.yml` are GitHub Actions. The directory name alone doesn't identify workflows |
| [hmcuongit/cuonghm-ai-workflow-lab @ `bbd8c7b`](https://github.com/hmcuongit/cuonghm-ai-workflow-lab/tree/bbd8c7b13fc80ae8f165ebc4a91c133381329110/workflows) | `workflows/*.md`, `workflows/claude-swap/*.md` | n/a | **No Workflow-tool scripts.** 11 Markdown guides. The only `.js` in the repo is a skill asset. Nothing to install from it today |
| [wshobson/agents @ `4236bb9`](https://github.com/wshobson/agents/tree/4236bb91f8395b0435f1d8b8baf9e8e4c69a8620) | none | n/a | Plugins named `*-workflows` (e.g. `tdd-workflows`) are skills, agents and commands. No `workflows/` component. The name `claude-code-workflows` in our `.claude/settings.json` is a marketplace name, unrelated |

This repo's own `.claude/workflows/abc.js` is an **empty file** (0 bytes). It has no `meta`, so it is not a usable
workflow example. `.claude/settings.json` has no workflow-related keys.

Patterns:

1. **The distributable unit is a file** in almost every source. One source uses a directory with a fixed file name
   (`workflow.js`), and one pairs a file with a same-named helper directory.
2. **Distributable scripts and a repo's own scripts sit in different places.** ECC's `workflows/` and
   `.claude/workflows/` hold different things. This is the same trap `rules.md` found for `.claude/rules/`.
3. **Non-workflow files sit next to scripts**: `README.md`, `*.test.mjs`, `lib/`, `_template.mjs`. Discovery must
   select on `export const meta` with a literal `name`, not on "every file in the directory".
4. **Plugin-shipped workflows are coupled to their plugin** (agent types, `${CLAUDE_PLUGIN_ROOT}` paths).

## 6. Implications for `ap`

### Mapping onto existing concepts

| Concept (CONTEXT.md) | Skill / Agent / Rule today | Workflow: fits or diverges |
|---|---|---|
| **Workflow** (new term) | Skill = dir, Agent = `.md` file with frontmatter `name`, Rule = `.md` file known by path | One `.js` file known by `meta.name`. That is closest to **Agent**: a file named by its content, not by its path. Parsing `name` means reading a JS object literal, not YAML frontmatter |
| **Nguồn workflow** | `github`/`git`/`directory`, pinned, `path` | **Fits.** Needs its own Danh mục nguồn (`workflowSources`), like the others |
| **Khai báo workflow** (`spec.workflows`) | string = all; map selects or excludes by name | **Fits by shape.** Select by `meta.name` (like agents). Selecting "all" pulls in `README`/tests unless discovery filters on `meta` |
| Discovery in source | `SKILL.md` / `agents/*.md` / `rules/` | **New.** Candidates: `workflows/*.js`, `.claude/workflows/*.js`, `path`. A file counts only if it starts with a literal `export const meta` holding `name`. Skip `*.test.*`, `lib/`, `_*`. `.mjs` and `<name>/workflow.js` sources exist, but installing them as-is would not work |
| **Bản cài workflow** | copy file/dir into `<scope>/.claude/<kind>s` | File in `.claude/workflows/` or `<claudeDir>/workflows/`. **Must be flat** (subdirs aren't discovered by name, as observed), so the Rule-style **Namespace directory is not available**. The installed file name is free, since Claude Code ignores it. `<meta.name>.js` is the natural choice |
| **Namespace** | rules: `<ns>/` directory per source | Not usable as a directory. The only namespacing Claude Code offers is the plugin prefix. A name clash across sources must be a conflict, or `ap` must rewrite `meta.name`, which would be the first content rewrite (see rules.md question 14) |
| **Scope** | `project`, `user`; `local` → skip + notice | **Fits.** Project = `<cwd>/.claude/workflows`. User = `<claudeDir>/workflows` (documented for `CLAUDE_CONFIG_DIR`). Local = none. In a monorepo, `ap` writes at cwd, but Claude Code also loads parent `.claude/workflows/` dirs, and a closer one shadows a farther one |
| **Managed / Manual entry** | per item, by name/hash; symlink = Manual | **Fits, with one twist.** Claude Code resolves a duplicate `meta.name` silently, so `ap` must read `meta.name` from **every** file in the dir, including Manual ones, and report a clash. A file-name comparison is not enough |
| **Lock / State** | `ManagedItem {name, source, sha256, origin}` + `SourceCatalog` | **Fits.** Hash = file bytes (like Agent). The name comes from `meta` |
| Plugin interplay | Agent/MCP inside plugin is not an "Agent"/"MCP server" | Same rule: a workflow inside a plugin is not a "Workflow". It comes with the Khai báo plugin. The MCP ADR warns on a name clash with a plugin's server, but workflows can't clash because plugin names are prefixed |
| Dependencies | none (rules: prose only) | **New concern.** `agentType` and `workflow()` references are string literals in code. `ap` could scan and warn, auto-select, or ignore |
| Permissions / approval | MCP: `ap` never writes `enabledMcpjsonServers` | Analogous: `Workflow(<name>)` allow rules and the "don't ask again" consent are the user's approval gate. By the ADR 0006 (MCP) reasoning, `ap` should not add them, but this is a decision to make |
| Feature gate | none | Workflows can be off (Pro default, `disableWorkflows`, env). An install is harmless but inert. `ap` could warn when it can read the setting |
| Running sessions | skills need reload too | New files appear after `/reload-skills` or in a new session |

### Open questions for design

1. **Is a `workflows` kind worth it, given plugins already ship workflows?** Options: (a) do nothing, since plugins
   cover it through Khai báo plugin; (b) add `spec.workflows` for loose sources (`.claude/workflows/*.js`, repos like
   transilienceai, lxxgg92, agentops); (c) (b), but refuse or warn on sources that are plugins.
2. **Identity.** Use `meta.name` (what Claude Code uses) or the file stem (what some authors assume)? If `meta.name`,
   how does `ap` parse it: a JS parser such as acorn, or a restricted literal parser? It must cope with minified
   `export const meta={name:"scan",…}` and a leading comment block. What happens when `meta` is not a pure literal
   (Claude Code drops it from autocomplete)?
3. **Installed file name.** Copy under the source file name, or normalise to `<meta.name>.js`? Normalising makes
   `.mjs` and `<dir>/workflow.js` sources work and avoids two sources with `review.js` overwriting each other. It also
   changes a name the author chose. Is renaming `.mjs` → `.js` safe? Both are plain scripts to the sandbox, but this
   is unverified.
4. **Name clashes without a Namespace.** Two sources, or a source and a Manual file, with the same `meta.name`. Options:
   `preset-clash`/`manual-entry` conflict (like Skills), an `as:` rename that rewrites `meta.name` (first content
   rewrite; see rules.md question 14), or a prefix convention.
5. **Discovery heuristic.** Where to look by default (`workflows/`, `.claude/workflows/`, both, `path` only)? Should
   `.claude/workflows/` count, given it can hold a repo's own project workflows (ECC)? How to exclude `README.md`,
   `*.test.*`, `lib/`, `_template.*`, and GitHub Actions `*.yml`?
6. **Multi-file units.** Support a workflow plus sibling helpers (thkt `workflows/<name>/`, communitytools `lib/`)? The
   helpers are reached by agents through prompt paths, so copying them next to the script might still not work. v1
   could be single-file only and warn when a script mentions a path in its source repo.
7. **Dependencies.** For `agentType: '<x>'` and `workflow('<y>')` literals: ignore, warn when not declared or
   installed, or auto-add from the same source? And for `'<plugin>:<agent>'`: warn when the plugin is not enabled,
   or refuse the workflow?
8. **Plugin workflows à la carte.** Should `ap` allow copying one workflow out of a plugin (e.g. ECC
   `orch-review`)? It will reference `ecc:*` agents and only work with the plugin enabled, and at that point the
   plugin already provides `/ecc:orch-review`.
9. **Permissions.** Should `ap` ever write `Workflow(<name>)` into `permissions.allow` (project settings)? Or leave
   approval to the user, as ADR 0006 does for `.mcp.json` servers? A Preset from a remote source that auto-allowed
   workflows would let a stranger's orchestration run without a prompt in `-p`/SDK mode.
10. **Feature gate.** Warn when `enableWorkflows: false` / `disableWorkflows: true` / Pro default makes installed
    workflows inert? `ap` can read settings files but not the plan.
11. **Scopes.** Keep "skip with notice" for `local`? In a monorepo, is `project` scope always `<cwd>/.claude/workflows`,
    or the nearest existing `.claude/workflows/`, which is where Claude Code saves?
12. **Symlinks.** Keep ADR 0005 "copy, and treat a symlink as Manual". agentops' link-based installer would then show
    up as Manual entries in the same dir. The project-location save refuses symlinks, but whether loading follows
    them is undocumented.
13. **Refactor or append.** Same as rules.md question 9: a fourth positional kind (`items[3]`, `workflowSources`,
    `workflowClaims`), or first generalise `Owned`/`Sharing` to a map keyed by `ItemKind`, given rules are also
    pending.
14. **ADR.** Extend ADR 0005 with workflows, or write a new ADR recording "identity = `meta.name`, flat install, no
    Namespace, plugins preferred when dependencies are plugin-scoped"?

## Unverified / could not confirm

- **Flat vs recursive discovery, `.js`-only, file name irrelevant, duplicate resolution.** These come from my
  experiment on 2.1.281 (§2), not from docs. `workflows/*.js` in the claude-directory page is consistent with them
  but not explicit. Which duplicate wins, and whether Claude Code warns anywhere (e.g. `/doctor`), is unknown.
- **Whether symlinked workflow files are loaded.** Only saving is documented.
- **Plugin workflow subdirectories.** Are they scanned, and do they add a `sub:` segment as agents do? The
  `workflows` field accepts files or directories, but recursion isn't stated.
- **Whether ECC's plugin actually exposes `/ecc:orch-review`.** It follows from the docs (default dir, `source: "./"`),
  but I didn't install it.
- **What happens when `agentType` names an agent that doesn't exist** (throw, fallback, `null`).
- **Whether `.mjs` → `.js` renaming is always safe.** The sandbox rejects `import()`, and ES-module syntax other than
  `export const meta` is not documented either way.
- **A size limit for script files.** None is documented. (Rules and CLAUDE.md skip files over 4 MiB. I found no
  equivalent for workflows.)
- **The exact moment new files become visible.** The docs say `/reload-skills` re-reads the workflow directories.
  agentops says the registry is snapshotted at session start. Both fit "not before a reload or new session".
