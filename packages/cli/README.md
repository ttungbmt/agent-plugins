# `@agent-plugins/cli`

MVP vertical slice: Role → Presets → Capabilities → Components → local marketplace →
installed into Claude Code.

Working consumer project: `/home/ubuntu/workspace/labs/test-agent-plugins`.

## Commands

| Command | Writes | Does |
|---|---|---|
| `ap validate [--strict]` | nothing | catalog + project config against `@agent-plugins/schemas`; `--strict` promotes warnings |
| `ap resolve` | nothing | Role → Capabilities → Components, plus the declared `requires` edges |
| `ap explain <capability>` | nothing | why one Capability chose the Component it did |
| `ap audit` | nothing | references found in bodies but **not declared** in the catalog |
| `ap sync [--verify] [--force] [--materialize=M]` | project | full pipeline; skips whatever is already done |
| `ap clean` | project | uninstall what the receipt records, drop generated state, release the snapshot |
| `ap prune [--dry-run]` | store | delete snapshots no project refers to any more |
| `ap doctor` | nothing | environment check |

## Pipeline

```
1 load catalog      catalog/ presets/ roles/ policies/  (authoritative)
                    every manifest validated against packages/schemas/
2 expand role       role → presets → Capability set
3 select            one Component per Capability, cardinality enforced
4 closure           declared `requires`, transitively
5 policy gate       deny hook/mcp/lsp → COMPONENT_ACTIVATION_UNSUPPORTED
6 snapshot          git fetch --depth 1 <sha> → shared store (see below)
7 build             .agent-plugins/marketplace/  verbatim copy + digest in version
8 install           claude plugin marketplace add / install, --scope local
                    → agent-plugins.lock (commit) + .agent-plugins/state/ (do not)
```

## The shared snapshot store

`<pkg>@<sha>` is immutable content: the same bytes in every project. Keeping a copy per
project multiplies it for nothing. Measured on `mattpocock-skills`:

```
per project, before          per machine, now
.agent-plugins/  2.1 MB      ~/.cache/agent-plugins/sources/  2.0 MB   (once)
├── sources/     2.0 MB      .agent-plugins/  180 KB  (marketplace + state only)
├── marketplace/ 168 KB
└── state/         8 KB
```

Upstream repos are not small — `mattpocock/skills` 1.8 MB, `obra/superpowers` 5.1 MB,
`anthropics/claude-plugins-official` 11.6 MB. Three packages across ten projects is 185 MB
duplicated, against 18.5 MB shared.

Location, first match wins: `$AGENT_PLUGINS_CACHE`, `$XDG_CACHE_HOME/agent-plugins`,
`~/.cache/agent-plugins`.

It is a pure cache — delete it and `ap sync` reproduces it exactly, because everything is
pinned by SHA in the lock.

Snapshots are cloned into `<key>.tmp-<pid>`, frozen, then moved into place with one `rename`,
so two projects syncing the same sha concurrently can never read a half-written tree.

### The store is read-only

After checkout the tree is `chmod a-w`, after Go's module cache and the Nix store. It is
immutable by its key and projects link into it, so one stray write would corrupt every project
sharing it. A snapshot found writable on reuse is re-frozen.

### GC roots, not a registry

```
<store>/sources/<pkg>@<sha>/        content
<store>/roots/<pkg>@<sha>/<hash>    symlink -> /abs/path/to/project
```

The first version of this used an `index.json` with a `usedBy` array. That file had the two
defects a hand-written registry always has: creating an entry was read-modify-write with no
lock, so concurrent syncs lost each other's writes; and a project deleted without `ap clean`
left a stale entry until the next prune.

A symlink has neither. Creating and removing one is atomic, and a deleted project leaves a
*dangling* link — a state the filesystem reports and cannot get wrong. This is how Nix tracks
what its store may collect. Verified: two `ap sync` runs in parallel leave three roots intact,
where the JSON registry lost one.

`ap clean` unlinks this project's root and never touches content. `ap prune` drops dead roots
(target gone, or the lock no longer pins that sha) and removes snapshots that have none left.

## Things measured, not assumed

All on Claude Code 2.1.278.

### What `--scope local` writes, and where

The marketplace registration and the enablement live in the project's
`.claude/settings.local.json`:

```json
{
  "enabledPlugins": { "mattpocock-skills@ap-<project>-<hash>": true },
  "extraKnownMarketplaces": {
    "ap-<project>-<hash>": { "source": { "source": "directory", "path": "…/.agent-plugins/marketplace" } }
  }
}
```

A `claude` in another project reports zero of these skills — that part is solid.

What is **not** guaranteed is that `~/.claude` stays untouched. Repeated syncs and sessions
were measured leaving the global store at zero entries; other runs wrote a
`known_marketplaces.json` entry, an `installed_plugins.json` entry and a
`cache/<marketplace>/` tree. The trigger was not isolated. So `ap sync` does not claim
cleanliness — it looks at the global store after installing and prints what is actually
there, and `ap clean` removes all three and verifies the result.

### At that scope the runtime loads from the source directory, with no cache in between

Removing one entry from the generated `plugin.json` — without changing its version and
without re-running `ap sync` — makes the next session load 5 skills instead of 6.

This matches ADR 0010's evidence table (line 23), and it holds even in runs where a
`cache/<marketplace>/` tree did get written — the session still followed the source.

It is **not** universal: a default (`user`) scope install of the same directory marketplace
is served from `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`, keyed by the
version string, and edits to the source never reach a session. So the content digest in
`plugin.json` version is what stops a stale cache at user scope.

### How a Component reaches the projection

Three approaches were probed against Claude Code 2.1.278. The manifest cannot point outside
the plugin, but the filesystem can:

| Probe | Result |
|---|---|
| absolute path in `plugin.json` `skills` | **rejected** — `Validation errors: skills.0: Invalid input` |
| `../` escape out of the plugin root | **rejected**, same validation error |
| directory symlink at `skills/<name>` | **works** — the skill loads, supporting files resolve through the link |
| directory symlink at `skills/<group>/<name>` | **does not load**, although `plugin.json` lists it and the install reports success |

The last row is why the projection **flattens** Components to `skills/<name>`. Upstream groups
them (`skills/engineering/tdd`), but the loader only follows a symlink for a skill directory
sitting directly under `skills/`. Component names are unique within a Package, so flattening
loses nothing.

`--materialize` picks how, in the spirit of pnpm's `package-import-method`:

| Mode | Marketplace size | Notes |
|---|---|---|
| `symlink` (default) | **56 KB** | zero duplication; the Nix symlink-farm shape |
| `hardlink` | 160 KB reported, 0 real | shares inodes with the store (`links=2`, verified); needs one filesystem, falls back to `copy` on `EXDEV` |
| `copy` | 160 KB | always works; required when the project and store are on different filesystems, such as a project under `/mnt/c` (9p) against a store on ext4 |

All three load the same 6 skills. `reflink` (copy-on-write) is not an option here: `/` is ext4.

### Scanning Component bodies cannot decide `requires`

ADR 0010 D6 proposes inferring it by scanning. Measured on one real package, scanning is
unsound in both directions:

| Text | Scanner says | Truth |
|---|---|---|
| `Call the Skill tool twice, for "grilling" and "domain-modeling".` | missed by `<ns>:<name>` | real dependency |
| `does the code faithfully implement the originating issue` | `code-review → implement` | plain English |
| `` `bug:triage` `` (a tracker label) | `setup-… → triage` | a label, not a skill |
| `call the Skill tool with "codebase-design"` | `tdd → codebase-design` | real dependency |

Nothing mechanical separates rows 2–3 from row 4. So `requires` is **declared** in
`catalog/packages/<id>.yaml` under `spec.components.<name>.requires`, and the scanner lives
in `ap audit`, which only nominates edges for a curator. That is what D6 line 108 actually
asks for: *"tham chiếu chưa được khai báo sẽ được báo để người curate xử lý."*

## The schema layer

`source-of-truth.md:477-500` names `packages/schemas/` the source of truth for serialized
manifest structure, and `:1485-1502` settles what happens when a document and the schema
disagree: *"example accepted by docs but rejected by schema"* is a **documentation bug**.

That directory now exists. Six schemas — one per authoritative kind — plus shared ID
definitions. `loadCatalog` validates against them before indexing, so a malformed manifest
can no longer reach the Resolver (`catalog-spec.md:2844-2857`).

The schemas are written from what the code actually reads and what the catalog actually
carries, not from the spec prose, because the two have diverged. Three consequences worth
knowing:

- **`additionalProperties: false` everywhere.** `catalog-spec.md:2303-2325` asks for exactly
  this: `prioroty: 100` must fail rather than be silently ignored. It now does.
- **`materialization` accepts only `collection`.** ADR 0010 D2 defines `ecosystem` too, but
  `buildMarketplace` always filters to the selected closure — so declaring `ecosystem` today
  would install the wrong thing without saying so. The enum is narrowed to the one honest
  value until that path is built.
- **`apiVersion` accepts one value: `agent-plugins.dev/v1alpha1`.** ADR 0014 settled the
  split. `v1` is the name manifest-spec.md:2325-2338 reserves for the end of the lifecycle
  `v1alpha1 -> v1beta1 -> v1`, so emitting it before the V1.0 gate claimed a stability the
  project has not reached. An unrecognized value fails with `UNSUPPORTED_API_VERSION`.

## Deviations from the specs

Recorded so they are paid back deliberately, not forgotten.

| Deviation | Spec says | Why |
|---|---|---|
| Plain `.js` in `packages/cli/` | `packages/{core,schemas,source-adapters,target-adapters}` TypeScript monorepo (`repository-structure.md:95-130`) | MVP; no build toolchain yet |
| `ap sync` exists | `cli-spec.md:2842` defers `sync`; `:2834-2838` forbids new semantics in convenience commands | requested explicitly for the MVP |
| Executable named `ap` | `cli-spec.md:116-146` — canonical name is `agent-plugins`, *"Aliases are outside the V1 contract"* | inherited from the existing oclif scaffold |
| Capability → Component mapping declared in the Capability file | `catalog-spec.md:1080-1092` — Components are generated by a Source Adapter | no source adapter yet |
| `spec.components.<n>.requires` on Package | `catalog-spec.md:881-889` has `requires` on Capability only | Now defined in `package.schema.json`; still undocumented in the spec prose |

## Sync skips what is already done

A repeat sync costs ~150 ms instead of ~3.2 s. The saving is not in our code — it is in not
spawning subprocesses.

| | |
|---|---|
| oclif startup (`ap --version`) | 112 ms |
| all of our own logic (`ap resolve` minus startup) | **~13 ms** |
| one `claude plugin …` invocation | ~400 ms and up |
| `claude --version` (no plugin loading) | 7 ms |

`sync` used to run `marketplace add`, `uninstall` and `install` unconditionally — three
processes reproducing state that already existed. Everything needed to know whether that work
is necessary sits in two files that take ~1.4 ms to read: our receipt
(`.agent-plugins/state/claude-code.json`) and Claude Code's
`.claude/settings.local.json`.

So the version — a digest of the bytes that would ship — is computed first, from six
`SKILL.md` reads, and then:

| Step | Runs only when |
|---|---|
| build | the projection on disk carries a different version, or is gone |
| `marketplace add` | `extraKnownMarketplaces` is missing the entry, or points elsewhere |
| `uninstall` | the plugin is enabled **and** the digest moved (a reused version would be served stale at user scope) |
| `install` | the plugin is not enabled, or the digest moved |

Measured: 2070 ms first sync, **140 ms** repeat, 3039 ms with `--force`. Changing the intent
(disabling a Capability) correctly rebuilds and reinstalls, and drift self-heals — deleting
`enabledPlugins` from the settings file makes the next sync notice and reinstall.

`--force` redoes everything, for debugging or when state is suspect. Every skip is printed;
none is silent.

We read `.claude/settings.local.json` but never write it: ADR 0010 D1 has the adapter register
through the native CLI rather than editing the runtime's own state.

## Known gap

A project deleted without `ap clean` leaves its marketplace and plugin entries in Claude
Code's own global store. `ap prune` collects the source store only. ADR 0010 D9 describes
collecting both; the second half is not built.

## Not built

`ecosystem` materialization, `allowOverlap`, `allowExecutables`, `disableGlobal`, global
scope (`sync -g`), sparse/blobless fetch, more than one package per project, more than one
target adapter, cardinality conflict between two publishers.
