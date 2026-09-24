# Research: MCP catalog entries for Azure, Google Cloud, Context7, Playwright, Linear, Stripe, Slack and Grafana

Goal: propose `McpCatalog` entries for Microsoft Azure, Google Cloud, Context7 (Upstash), Playwright (Microsoft),
Linear, Stripe, Slack and Grafana that follow [ADR 0006](../adr/0006-mcp-servers-inline-plus-bundled-catalog.md), the
`mcpServer` schema and the conventions in [`mcp-servers-catalog.md` → "Decisions"](mcp-servers-catalog.md#decisions-2026-09-24).
Two conventions are new in this batch: (1) turn off usage telemetry by default where the server offers a flag, env var or
query parameter; (2) when `claude-plugins-official` ships a plugin for the same service, the description ends with
"Also shipped as plugin `<plugin>@claude-plugins-official`." (checked against
`~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json`).

Sources checked on **2026-09-24**. Only primary sources are used: vendor docs, vendor GitHub repos pinned to the
default-branch commit on that date, npm/PyPI/NuGet/Docker Hub/MCR registries and the Claude Code docs
([`code.claude.com/docs/en/mcp.md`](https://code.claude.com/docs/en/mcp.md), cited as `CC-MCP`). As in the earlier notes,
I sent an unauthenticated MCP `initialize` to every remote endpoint and read `/.well-known/oauth-protected-resource[/<path>]`
and the authorization server's metadata for `registration_endpoint` (DCR) and `client_id_metadata_document_supported`
(CIMD). Every proposed stdio command was run locally with its pinned version (`initialize`, mostly also `tools/list`).
No OAuth client was registered and no account or resource was created anywhere.

## Summary

- **Azure: four entries.** Microsoft's broad **Azure MCP Server** is local-only (no hosted server) and signs in with the
  local Azure credential chain (`az login` etc.). npm `latest` is the weekly `3.0.0-beta.*` line, so the entry pins GA
  **`2.0.5`** and sets `AZURE_MCP_COLLECT_TELEMETRY=false` (telemetry is on by default). **Microsoft Learn** is hosted and
  keyless. **Azure DevOps** gets the official local server (`@azure-devops/mcp@2.10.0`) as a browser-sign-in entry and a
  PAT twin. The **remote Azure DevOps** preview server and **Foundry** MCP need your own Entra app registration (Entra has
  no DCR/CIMD), so they stay inline-only, like GitHub OAuth.
- **Google Cloud: twelve entries, and a new auth pattern.** Google hosts ~60 GA MCP servers at
  `https://<service>.googleapis.com/mcp`, but `accounts.google.com` has **no DCR and no CIMD**, so Claude Code can't sign
  in by itself. Google's documented alternative is an ADC Bearer token (1 h lifetime) plus `x-goog-user-project`.
  The `gcp-*` entries use **`headersHelper`** to mint the token on every connection (Claude Code re-runs it on connect
  and after a 401/403). Also proposed: local `gcloud` (usage reporting off via `CLOUDSDK_CORE_DISABLE_USAGE_REPORTING`),
  `firebase` (Firebase CLI), and three non-Cloud Google servers (Developer Knowledge, Maps Grounding Lite, Maps Code
  Assist). `@toolbox-sdk/server@1.12.0` is still latest, so `postgres-toolbox` needs no change.
- **Context7:** hosted `https://mcp.context7.com/mcp` with `Authorization: Bearer ${CONTEXT7_API_KEY}` (the vendor's manual
  config) and a `context7-oauth` twin on `/mcp/oauth` (DCR). Anonymous `/mcp` also works (200), which is an open
  question. No client-side telemetry to disable.
- **Playwright:** local only, `@playwright/mcp@0.0.82`, three entries mirroring `chrome-devtools*` (default headed
  persistent profile, headless+isolated, and `--extension` for your running Chrome/Edge). No telemetry in the package.
  Microsoft now suggests Playwright CLI + skills for coding agents, but the MCP server is not deprecated.
- **Linear:** hosted `https://mcp.linear.app/mcp`, OAuth (DCR + CIMD), plus a documented Bearer API-key twin. The old
  `/sse` endpoint now returns 404.
- **Stripe:** hosted `https://mcp.stripe.com`, OAuth (DCR), plus a Bearer twin for an **agent API key**. From
  **2026-10-31** Stripe MCP rejects plain secret keys and untagged restricted keys. `@stripe/mcp` is only a proxy to the
  hosted server, so no entry.
- **Slack:** hosted `https://mcp.slack.com/mcp`, **no DCR/CIMD**; Slack's own Claude Code config uses its published
  app's `oauth.clientId` + `callbackPort: 3118`, which the entry copies — the catalog's first `oauth` entry. The old
  `@modelcontextprotocol/server-slack` is archived.
- **Grafana:** local `mcp-grafana@1.5.1` (uvx) for any Grafana, with `GRAFANA_USAGE_STATS=disabled` (off today, but
  Grafana says a later release turns it on), and hosted `grafana-cloud` (`https://mcp.grafana.com/mcp`, OAuth with DCR +
  CIMD, Grafana Cloud only).
- **Validation:** the append block (28 entries) merged with the current catalog passes the `McpCatalog` schema (ajv
  2020), has no duplicate names, no `${VAR:-}` empty defaults, and every env/header key matching
  `/key|token|secret|password|auth|credential/i` has a `${…}` value.

Endpoint probe results (2026-09-24, unauthenticated `initialize`):

| Endpoint | HTTP | Auth server | DCR | CIMD |
|---|---|---|---|---|
| `https://learn.microsoft.com/api/mcp` | **200** (SSE; also with `?maxTokenBudget=2000`) | none (`/.well-known/oauth-protected-resource` → 302) | – | – |
| `https://mcp.dev.azure.com/{org}` (not proposed) | 401 | `https://login.microsoftonline.com/organizations/v2.0` | no | no |
| `https://mcp.ai.azure.com` (Foundry, not proposed) | 401 | `https://login.microsoftonline.com/common/v2.0` | no | no |
| `https://bigquery.googleapis.com/mcp` | **200** on `initialize` and `tools/list`; `tools/call` → 401 | `https://accounts.google.com/` (PRM at `/.well-known/oauth-protected-resource/mcp`; root 404) | **no** | **no** |
| `run`, `container`, `compute`, `sqladmin`, `logging`, `monitoring` (+ `cloudtrace`, `clouderrorreporting`, `firestore`, `spanner`, `alloydb`, `cloudcli`) `.googleapis.com/mcp`; `storage.googleapis.com/storage/mcp` | **200** on `initialize` (`StatelessServer`) | `https://accounts.google.com/` (per-service scopes) | no | no |
| `https://developerknowledge.googleapis.com/mcp` | 200 on `initialize`/`tools/list`; `tools/call` → missing credential | `https://accounts.google.com/` + API key header | no | no |
| `https://mapstools.googleapis.com/mcp` | 200 on `initialize`/`tools/list` | `https://accounts.google.com/` + API key header | no | no |
| `https://mapscodeassist.googleapis.com/mcp` | 200; `tools/call` works anonymously | none | – | – |
| `https://accounts.google.com/.well-known/oauth-authorization-server` | 200, no `registration_endpoint`, no CIMD flag | – | – | – |
| `https://mcp.context7.com/mcp` | **200** (anonymous; still sends `WWW-Authenticate`) | – | – | – |
| `https://mcp.context7.com/mcp/oauth` | 401 | `https://clerk.context7.com` | yes | no |
| `https://mcp.context7.com/mcp?client=claude-code-plugin` | 401 without an (empty) `Authorization` header | same | yes | no |
| `https://mcp.linear.app/mcp` (and `/mcp/readonly`) | 401 (`scope="read write"`) | `https://mcp.linear.app` | yes | **yes** |
| `https://mcp.linear.app/sse` (deprecated) | **404** (GET and POST) | – | – | – |
| `https://mcp.stripe.com` | 401 (`missing_api_key`) | `https://access.stripe.com/mcp` (scope `mcp`) | yes | no |
| `https://mcp.slack.com/mcp` | 401 (`missing_token`; bogus Bearer → `invalid_token`) | `https://mcp.slack.com` (authorize at `slack.com/oauth/v2_user/authorize`) | **no** | **no** |
| `https://mcp.grafana.com/mcp` | 401 | `https://mcp.grafana.com/mcp` (scopes `grafana:read grafana:query grafana:write`) | yes | **yes** |

Local stdio checks (2026-09-24):

| Command | Result |
|---|---|
| `AZURE_MCP_COLLECT_TELEMETRY=false npx -y @azure/mcp@2.0.5 server start` | `initialize` OK, `Azure MCP Server 2.0.5` |
| `npx -y @azure-devops/mcp@2.10.0 contoso` | `initialize` OK, `Azure DevOps MCP Server 2.10.0` (sign-in deferred to first tool call) |
| `npx -y @google-cloud/gcloud-mcp@0.5.3` | `initialize` + `tools/list` OK, `gcloud-mcp-server 0.5.3` |
| `npx -y firebase-tools@15.31.0 mcp --dir .` | `initialize` + `tools/list` OK |
| `npx -y @playwright/mcp@0.0.82 --headless --isolated` | `initialize` OK (`Playwright 1.64.0-alpha-1789764292000`), 25 tools |
| `uvx mcp-grafana@1.5.1` (dummy token, no Grafana) | `initialize` OK, `mcp-grafana v1.5.1` |

---

## 0. Claude Code semantics that matter here (beyond the earlier notes)

- **`headersHelper`** ([`CC-MCP` L965-L1024](https://code.claude.com/docs/en/mcp.md)): Claude Code "runs the helper
  fresh on each connection" (L975) and, on a 401/403 during a tool call, re-runs it and retries once (L977). A
  helper-supplied `Authorization` turns off the OAuth fallback (L979). Timeout 10 s (L971). For project `.mcp.json` and
  local scope it runs only once the folder is trusted (L975, L1019-L1024). `${VAR}` is **not** expanded in
  `headersHelper` (expansion covers `command`, `args`, `env`, `url`, `headers`, L619-L627), so the Google quota project
  goes in a static header.
- **Helper environment:** for servers from a project `.mcp.json`, a plugin or a project agent file, Claude Code removes
  variables whose names look like credentials (`TOKEN`, `SECRET`, `PASSWORD`, `KEY`, `AUTH`, plus an unpublished fixed
  list) from the helper's environment; user- and local-scope servers keep the full environment (L1008-L1016). The Google
  helper reads only the ADC file, so this doesn't break it for user logins.
- **`oauth.clientId` / `callbackPort`** are now in the schema; `slack` is the first catalog entry to use them. A client
  *secret* can't be expressed (only `claude mcp add-json --client-secret`), so servers that need your own confidential
  client (Google OAuth, Azure DevOps remote, Foundry) stay inline-only.
- **Anonymous 200 on `initialize`** (Context7 `/mcp`, every Google endpoint): Claude Code starts OAuth only on a 401, so
  such an endpoint shows as connected even without valid credentials; tool calls fail later.
- **Credential variables that read as empty** in remote `url`/`headers` (`CC-MCP` L649-L661) name only examples
  (`ANTHROPIC_API_KEY`, `AWS_BEARER_TOKEN_BEDROCK`, `NPM_TOKEN`, …). None of the header variables proposed here
  (`CONTEXT7_API_KEY`, `LINEAR_API_KEY`, `STRIPE_AGENT_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_MAPS_API_KEY`,
  `DEVELOPERKNOWLEDGE_API_KEY`) is named; whether the `GOOGLE_*` ones fall under "cloud provider credentials" is
  unverified.
- **`ap` secret check** matches `Authorization`, `X-Goog-Api-Key`, `PERSONAL_ACCESS_TOKEN` and
  `GRAFANA_SERVICE_ACCOUNT_TOKEN`; all have `${…}` values. `AZURE_MCP_COLLECT_TELEMETRY`,
  `CLOUDSDK_CORE_DISABLE_USAGE_REPORTING`, `GRAFANA_USAGE_STATS`, `GRAFANA_URL` and `x-goog-user-project` don't match,
  so literal values are fine.

## 1. Microsoft Azure

Pinned sources: `microsoft/mcp` at
[`2f750c6`](https://github.com/microsoft/mcp/tree/2f750c6818fddfa6872302081bb3d078c86b8c76) (the
`Azure.Mcp.Server-2.0.5` tag is `f43b47a`), `microsoft/azure-devops-mcp` at
[`b271bec`](https://github.com/microsoft/azure-devops-mcp/tree/b271bec184c492cf8d855843fccd2c035e81c5e8),
`MicrosoftDocs/mcp` at [`f8ffde1`](https://github.com/MicrosoftDocs/mcp/tree/f8ffde185dfd232dbf5d187c22ce299eadc3d583)
and `microsoft/azure-skills` (source of `azure@claude-plugins-official`) at
[`5b4f0c0`](https://github.com/microsoft/azure-skills/tree/5b4f0c0778079a2f568581107f23349ce9a0a9b2).

### 1a. What exists

**Azure MCP Server (official, GA, local stdio only)**

- Lives in `microsoft/mcp` under `servers/Azure.Mcp.Server`; "Azure MCP Server 2.0 is now generally available"
  ([README L7](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/README.md#L7)).
  It covers Foundry, Advisor, Storage, Key Vault, Cosmos DB, AKS, Monitor, Postgres and many more
  ([README L937+](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/README.md#L937)).
- Three official launchers: `npx -y @azure/mcp@latest server start`, `dnx Azure.Mcp … -- azmcp server start` (.NET 10)
  and `uvx --from msmcp-azure azmcp server start`
  ([README L198-L272](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/README.md#L198-L272)).
  For Claude Code the vendor points to `/plugin install azure@claude-plugins-official`
  ([README L178-L188](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/README.md#L178-L188)),
  whose `.mcp.json` runs `npx -y @azure/mcp@latest server start`
  ([azure-skills `.mcp.json`](https://github.com/microsoft/azure-skills/blob/5b4f0c0778079a2f568581107f23349ce9a0a9b2/.mcp.json)).
- **Versions.** npm [`@azure/mcp`](https://registry.npmjs.org/@azure/mcp) `latest` is **`3.0.0-beta.46`**
  (2026-09-22); GitHub marks the 3.0 betas as prereleases
  ([releases](https://github.com/microsoft/mcp/releases?q=Azure.Mcp.Server-)). The newest non-prerelease is **`2.0.5`**
  (2026-07-10, Node ≥ 20, bin `azmcp`). PyPI [`msmcp-azure`](https://pypi.org/project/msmcp-azure/) and NuGet
  [`Azure.Mcp`](https://api.nuget.org/v3-flatcontainer/azure.mcp/index.json) carry the same lines. The betas break tools
  from release to release (beta.46 renamed `resilience_*` to `resiliency_*` and removed parameters,
  [CHANGELOG L14-L40](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/CHANGELOG.md#L14-L40)).
- **Auth** is not MCP-level: the server uses a local Azure credential chain (`az login`, azd, VS Code, Azure PowerShell,
  then an interactive browser fallback) ([docs/Authentication.md L41-L61](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/docs/Authentication.md#L41-L61)).
  `AZURE_TOKEN_CREDENTIALS` pins one credential
  ([CustomChainedCredential.cs L123](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/core/Microsoft.Mcp.Core/src/Services/Azure/Authentication/CustomChainedCredential.cs#L123));
  sovereign clouds use `--cloud` / `AZURE_CLOUD`
  ([README L899-L930](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/README.md#L899-L930)).
- **Telemetry is on by default.** `AZURE_MCP_COLLECT_TELEMETRY=false` turns off all of it
  ([README L1519-L1540](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/README.md#L1519-L1540));
  the source reads it into `IsTelemetryEnabled`
  ([ServiceCollectionExtensions.cs L292](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/core/Microsoft.Mcp.Core/src/Areas/Server/Commands/ServiceCollectionExtensions.cs#L292),
  [OpenTelemetryExtensions.cs L66](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/core/Microsoft.Mcp.Core/src/Extensions/OpenTelemetryExtensions.cs#L66)).
  The variable dates from 0.x ([CHANGELOG L2964](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/CHANGELOG.md#L2964)),
  so 2.0.5 has it.
- **Options** ([azmcp-commands.md L95-L165](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/docs/azmcp-commands.md#L95-L165)):
  `--mode namespace` (default, one tool per service), `all`, `single`; repeatable `--namespace`; `--read-only` (not
  used, per the "no read-only defaults" decision).
- **No hosted server.** "Remote Setup" means self-hosting on Azure Container Apps
  ([README L880-L884](https://github.com/microsoft/mcp/blob/2f750c6818fddfa6872302081bb3d078c86b8c76/servers/Azure.Mcp.Server/README.md#L880-L884)).
- Local check: `AZURE_MCP_COLLECT_TELEMETRY=false npx -y @azure/mcp@2.0.5 server start` → `initialize` OK
  (`Azure MCP Server 2.0.5`).

**Microsoft Learn MCP Server (official, hosted, no auth)**

- `https://learn.microsoft.com/api/mcp`, streamable HTTP, "Plug & Play (No Auth)"
  ([README L16, L34-L55](https://github.com/MicrosoftDocs/mcp/blob/f8ffde185dfd232dbf5d187c22ce299eadc3d583/README.md#L34-L55)).
  Tools `microsoft_docs_search`, `microsoft_docs_fetch`, `microsoft_code_sample_search` (L81-L87). Optional
  `?maxTokenBudget=<n>` truncates results (L73-L76).
- For Claude Code the README points to `microsoft-docs@claude-plugins-official` (L176-L178), whose `.mcp.json` names the
  server `microsoft-learn` ([`.mcp.json`](https://github.com/MicrosoftDocs/mcp/blob/f8ffde185dfd232dbf5d187c22ce299eadc3d583/.mcp.json)).
- Probe: `initialize` → 200 (`Microsoft Learn MCP Server 1.0.0`). No telemetry setting is documented.

**Azure DevOps MCP (official): remote preview and local**

- **Remote (preview, Microsoft's recommendation):** `https://mcp.dev.azure.com/{organization}`, Microsoft Entra ID OAuth
  only, Entra-backed Azure DevOps Services orgs only
  ([README L50-L80](https://github.com/microsoft/azure-devops-mcp/blob/b271bec184c492cf8d855843fccd2c035e81c5e8/README.md#L50-L80);
  [Learn: remote MCP server](https://learn.microsoft.com/en-us/azure/devops/mcp-server/remote-mcp-server?view=azure-devops)).
  Microsoft: "Claude Code requires a custom Microsoft Entra app registration" with `oauth: {clientId, callbackPort:
  3118}`, redirect `http://localhost:3118/callback`, and admin consent. Probe: 401; Entra
  (`login.microsoftonline.com/organizations/v2.0`) has no `registration_endpoint` and no CIMD. **Inline-only**, like
  GitHub OAuth.
- **Local:** npm [`@azure-devops/mcp`](https://registry.npmjs.org/@azure-devops/mcp) **`2.10.0`** (2026-09-09,
  Node ≥ 20), `npx -y @azure-devops/mcp <org> [-d domains] [-a auth]`
  ([src/index.ts L27-L60](https://github.com/microsoft/azure-devops-mcp/blob/b271bec184c492cf8d855843fccd2c035e81c5e8/src/index.ts#L27-L60)).
  Auth modes `interactive` (default, browser), `azcli`, `env`, `envvar` (`ADO_MCP_AUTH_TOKEN`) and `pat`
  (`PERSONAL_ACCESS_TOKEN` = base64 of `<email>:<pat>`)
  ([GETTINGSTARTED.md L28-L98](https://github.com/microsoft/azure-devops-mcp/blob/b271bec184c492cf8d855843fccd2c035e81c5e8/docs/GETTINGSTARTED.md#L28-L98)).
  Services only, "no plans to support Azure DevOps on-prem"
  ([FAQ.md L5-L7](https://github.com/microsoft/azure-devops-mcp/blob/b271bec184c492cf8d855843fccd2c035e81c5e8/docs/FAQ.md#L5-L7)).
  Remote "will eventually replace" local, which "remains supported" (README L54). No telemetry in `src/`. Local check:
  `npx -y @azure-devops/mcp@2.10.0 contoso` → `initialize` OK (sign-in deferred to the first tool call). No
  `claude-plugins-official` plugin covers Azure DevOps.

**Not proposed:** Microsoft Foundry MCP (`https://mcp.ai.azure.com`: 401, Entra `common/v2.0`, no DCR/CIMD, so a custom
client ID; Azure MCP already has a `foundry` namespace) and `Azure/aks-mcp` (v0.0.20, covered by Azure MCP's AKS
namespace).

### 1b. Proposed entries

```yaml
  azure:
    description: >-
      Microsoft's official Azure MCP Server (GA) for Azure resources (Storage, Key Vault, Cosmos DB, AKS, Foundry,
      Monitor, ...) with your local Azure sign-in (az login, azd, VS Code or PowerShell); runs with npx (Node 20+),
      telemetry off. Also shipped as plugin `azure@claude-plugins-official`.
    command: npx
    args: [-y, '@azure/mcp@2.0.5', server, start]
    env:
      AZURE_MCP_COLLECT_TELEMETRY: 'false'

  microsoft-learn:
    description: >-
      Microsoft's official hosted Microsoft Learn server for searching and fetching Microsoft and Azure documentation and
      code samples; no sign-in. Also shipped as plugin `microsoft-docs@claude-plugins-official`.
    type: http
    url: https://learn.microsoft.com/api/mcp

  azure-devops:
    description: >-
      Microsoft's official local Azure DevOps server (Azure DevOps Services only) for work items, repos, pipelines, wiki
      and test plans; runs with npx (Node 20+), needs AZURE_DEVOPS_ORG and signs in through the browser on first use.
    command: npx
    args: [-y, '@azure-devops/mcp@2.10.0', '${AZURE_DEVOPS_ORG}']

  azure-devops-token:
    description: >-
      Microsoft's official local Azure DevOps server with a personal access token instead of browser sign-in; runs with
      npx and needs AZURE_DEVOPS_ORG and AZURE_DEVOPS_BASIC_AUTH, which must already be base64("<email>:<pat>").
    command: npx
    args: [-y, '@azure-devops/mcp@2.10.0', '${AZURE_DEVOPS_ORG}', --authentication, pat]
    env:
      PERSONAL_ACCESS_TOKEN: ${AZURE_DEVOPS_BASIC_AUTH}
```

Rationale:

- **`azure`** is pinned to GA `2.0.5`, not npm `latest` (the weekly 3.0 betas rename tools). Telemetry is turned off
  with the documented variable. No auth twins: auth comes from the local credential chain.
- **`microsoft-learn`** uses the vendor's own server name; keyless.
- **`azure-devops`** is the only route that works in Claude Code without an Entra app you own; vendor-default
  interactive sign-in.
- **`azure-devops-token`** is the headless/CI twin. A catalog-named variable feeds the vendor's generic
  `PERSONAL_ACCESS_TOKEN`, the same pattern as `ATLASSIAN_BASIC_AUTH`.

## 2. Google Cloud

### 2a. What exists

- **Managed remote servers.** Google hosts about 60 Google Cloud MCP servers plus a few other Google ones, each at
  `https://<service>.googleapis.com/mcp` (streamable HTTP)
  ([Supported products](https://docs.cloud.google.com/mcp/supported-products),
  [Overview](https://docs.cloud.google.com/mcp/overview)). The ones proposed here are all **GA** on that page:
  - BigQuery `https://bigquery.googleapis.com/mcp` ([Use the BigQuery MCP server](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp)).
    `execute_sql` is "the only MCP tool that isn't read-only"; `execute_sql_readonly` rejects DML/DDL. Roles:
    `roles/mcp.toolUser`, `roles/bigquery.jobUser`, `roles/bigquery.dataViewer`.
  - Cloud Run `https://run.googleapis.com/mcp` ([Use the Cloud Run remote MCP server](https://docs.cloud.google.com/run/docs/use-cloud-run-mcp)).
    Probed tools: `list_services`, `get_service`, `deploy_service_from_image`, `deploy_service_from_archive`,
    `deploy_service_from_file_contents`.
  - GKE `https://container.googleapis.com/mcp` ([Use the GKE remote MCP server](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/use-gke-mcp)).
    23 tools covering clusters, node pools, operations, and Kubernetes get/apply/patch/delete/logs.
  - Compute Engine `https://compute.googleapis.com/mcp` ([Use the Compute Engine remote MCP server](https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp)).
    29 tools covering instances, disks, templates, MIGs and reservations.
  - Cloud SQL `https://sqladmin.googleapis.com/mcp` ([Use the Cloud SQL remote MCP server](https://docs.cloud.google.com/sql/docs/mysql/use-cloudsql-mcp)).
    It administers MySQL, PostgreSQL and SQL Server instances.
  - Cloud Logging `https://logging.googleapis.com/mcp` ([Use the Cloud Logging remote MCP server](https://docs.cloud.google.com/logging/docs/use-logging-mcp))
    and Cloud Monitoring `https://monitoring.googleapis.com/mcp` ([Use the Cloud Monitoring remote MCP server](https://docs.cloud.google.com/monitoring/docs/use-monitoring-mcp)).
  - Not proposed but same pattern (GA): Cloud Trace, Error Reporting, Cloud Storage
    (`https://storage.googleapis.com/storage/mcp`), Firestore, Spanner, AlloyDB, IAM, Pub/Sub. The **Cloud CLI** server
    (`https://cloudcli.googleapis.com/mcp`, tools `run_gcloud_command` and `run_bq_command`) is **Preview**
    ([Supported products](https://docs.cloud.google.com/mcp/supported-products)).
- **Enablement.** "To use Google and Google Cloud remote MCP servers … you must enable the product API in your project"
  (`gcloud services enable SERVICE_NAME`)
  ([Enable or disable MCP servers](https://docs.cloud.google.com/mcp/enable-disable-mcp-servers)). There is no separate
  MCP switch any more. gcloud 579.0.0 (2026-08-04) made `gcloud beta services mcp enable` a no-op "as MCP enablement is no
  longer required", and 581.0.0 (2026-08-18) removed `gcloud beta services mcp enable|disable|list`
  ([gcloud release notes](https://docs.cloud.google.com/sdk/docs/release-notes)).
- **IAM.** "ask your administrator to grant you the MCP Tool User (`roles/mcp.toolUser`) IAM role", plus each
  product's own roles ([Configure MCP in an AI application](https://docs.cloud.google.com/mcp/configure-mcp-ai-application)).
- **Auth.**
  - "Google and Google Cloud remote MCP servers don't support Dynamic Client Registration or OAuth Client ID Metadata
    Documents." You create an OAuth client ID and secret yourself. ADC bearer tokens must be renewed every hour. API
    keys work only for "services that don't require a principal"
    ([Authenticate](https://docs.cloud.google.com/mcp/authenticate-mcp)).
  - For Claude, Google documents only a claude.ai custom connector with your own client ID/secret (redirect
    `https://claude.ai/api/mcp/auth_callback`). For generic clients it shows `"Authorization": "Bearer TOKEN"` +
    `"x-goog-user-project": "PROJECT_ID"`, where TOKEN comes from `gcloud auth application-default print-access-token`
    ([Configure MCP in an AI application](https://docs.cloud.google.com/mcp/configure-mcp-ai-application)).
  - Google's own plugin team confirms the dead end for Claude Code. The issuer `accounts.google.com` has "no
    `registration_endpoint`" and no CIMD support, so "an MCP client with no prior relationship to Google has no way to
    obtain a `client_id`". This is "tracked internally" with no timeline
    ([google/skills#223](https://github.com/google/skills/issues/223)).
- **Why `headersHelper`.** An `oauth.clientId` entry needs a client and secret that each user registers, so it stays
  inline like `github`. A static Bearer header expires within an hour. `headersHelper` fits:
  - Claude Code "runs the helper fresh on each connection" ([CC-MCP L975](https://code.claude.com/docs/en/mcp.md)).
  - On a 401/403 during a tool call it "re-runs the helper … and retries the call once" (L977; also L377).
  - A helper-supplied `Authorization` means it "doesn't fall back to OAuth for the server" (L979).
  - The helper has a 10 s timeout (L971).
  - For project `.mcp.json` and local scope, the helper runs only after the folder is trusted (L975, L1019-1024).
  - `${VAR}` is expanded only in `command`, `args`, `env`, `url` and `headers` (L619-627), not in `headersHelper`. So the
    quota project goes in a static header, `x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}`.
- **Credential variables in Claude Code (checked in CC-MCP).**
  - *Read as empty in remote `url`/`headers`* (L649-661). The page names only examples: `ANTHROPIC_API_KEY`,
    `ANTHROPIC_AUTH_TOKEN`, "Your cloud provider's credentials, such as `AWS_BEARER_TOKEN_BEDROCK`", `HTTPS_PROXY`,
    `NPM_TOKEN`. **No `GOOGLE_*` name appears anywhere in CC-MCP or
    [env-vars.md](https://code.claude.com/docs/en/env-vars.md)** (grep for `GOOGLE`, `VERTEX` and `CLOUD_ML`; the only
    hits are prose about Google Cloud's Agent Platform at L303, L329, L1131, L1435-1447). So whether
    `GOOGLE_CLOUD_PROJECT` or `GOOGLE_MAPS_API_KEY` is covered is undocumented (see Unverified). `GOOGLE_CLOUD_PROJECT`
    is a project ID, not a credential.
  - *Stripped from the helper's environment* (L1008-1016). This applies only to servers from a project `.mcp.json`, a
    plugin or a project agent file ("Removed"). User- and local-scope servers keep the full environment ("Not
    removed"). The rule removes "every variable … whose name looks like a credential, such as a name with `TOKEN`,
    `SECRET`, `PASSWORD`, `KEY`, or `AUTH` in it", plus "a fixed list" that isn't published.
    `GOOGLE_APPLICATION_CREDENTIALS` doesn't match the listed substrings, but it might be on the unpublished list. If
    it is removed, `gcloud auth application-default print-access-token` falls back to the well-known ADC file from
    `gcloud auth application-default login`, so the proposed helper still works for user logins. The helper reads no
    other variables.
- **gcloud MCP (local).**
  [`googleapis/gcloud-mcp` @238728f](https://github.com/googleapis/gcloud-mcp/blob/238728f237ecb5f483199906b564a1767a0713f9/README.md),
  npm [`@google-cloud/gcloud-mcp`](https://www.npmjs.com/package/@google-cloud/gcloud-mcp) **0.5.3** (2026-01-05). It
  needs Node 20+ and the gcloud CLI; vendor config is `npx -y @google-cloud/gcloud-mcp`.
  - It has one tool, `run_gcloud_command`.
  - The default denylist only blocks interactive or SSH commands (`compute ssh`, `start-iap-tunnel`, `interactive`,
    `meta`, …) ([`index.ts` L32-43](https://github.com/googleapis/gcloud-mcp/blob/238728f237ecb5f483199906b564a1767a0713f9/packages/gcloud-mcp/src/index.ts#L32-L43)).
  - `--config <absolute path>` takes an allow or deny JSON (L63-110).
  - It spawns `gcloud` with the inherited environment
    ([`gcloud_executor.ts` L91](https://github.com/googleapis/gcloud-mcp/blob/238728f237ecb5f483199906b564a1767a0713f9/packages/gcloud-mcp/src/gcloud_executor.ts#L91)).
  - The same repo ships `observability-mcp` 0.2.3 (2026-02-11), `storage-mcp` 0.6.0 and `backupdr-mcp`. The GA remote
    Logging, Monitoring, Trace and Storage servers supersede them, so I propose none of them.
- **Telemetry.**
  - gcloud-mcp has none (no telemetry code at @238728f).
  - The gcloud CLI it runs "does not collect usage statistics" unless you opted in; the property is
    `disable_usage_reporting` ([Usage statistics](https://docs.cloud.google.com/sdk/docs/usage-statistics)).
  - Properties can be set as `CLOUDSDK_SECTION_NAME_PROPERTY_NAME` env vars, which take precedence over
    `gcloud config` ([Properties](https://docs.cloud.google.com/sdk/docs/properties)). So the entry sets
    `CLOUDSDK_CORE_DISABLE_USAGE_REPORTING: 'true'`.
- **Firebase MCP (local).** Part of the Firebase CLI:
  [`firebase/firebase-tools` @c214f14](https://github.com/firebase/firebase-tools/tree/c214f149ee794fa14fc9e8e510bc4a60e90d5872),
  npm [`firebase-tools`](https://www.npmjs.com/package/firebase-tools) **15.31.0** (2026-09-23), Node ≥20.
  - Options: `--dir`, `--only`, `--tools`, `--mode` ([`src/bin/mcp.ts` L28-65](https://github.com/firebase/firebase-tools/blob/c214f149ee794fa14fc9e8e510bc4a60e90d5872/src/bin/mcp.ts#L28-L65)).
  - Auth: `firebase login` or ADC. The vendor's Claude Code paths are its own plugin or
    `claude mcp add firebase npx -- -y firebase-tools@latest mcp`
    ([Firebase MCP server](https://firebase.google.com/docs/ai-assistance/mcp-server)).
  - Telemetry: the MCP server sends GA4 events (`mcp_tool_call`, …;
    [`src/mcp/index.ts` L405](https://github.com/firebase/firebase-tools/blob/c214f149ee794fa14fc9e8e510bc4a60e90d5872/src/mcp/index.ts#L405)).
    They are sent only when `configstore.get("usage")` is true
    ([`src/track.ts` L68-69](https://github.com/firebase/firebase-tools/blob/c214f149ee794fa14fc9e8e510bc4a60e90d5872/src/track.ts#L68-L69),
    L338), which is the consent asked at `firebase login`. It is opt-in, so there is no flag to add.
- **MCP Toolbox for Databases.** npm `@toolbox-sdk/server` latest is **1.12.0** (2026-09-17;
  [`cmd/version.txt` @83ba839](https://github.com/googleapis/mcp-toolbox/blob/83ba8390655eda5a59e021369c921fe88a6d602a/cmd/version.txt)),
  so `postgres-toolbox` is current.
  - Its telemetry only exports to your own backend and is off by default (`--telemetry-gcp`, `--telemetry-otlp`;
    [`cmd/internal/flags.go` L35-38](https://github.com/googleapis/mcp-toolbox/blob/83ba8390655eda5a59e021369c921fe88a6d602a/cmd/internal/flags.go#L35-L38)).
  - The claude-plugins-official Google database plugins wrap it, e.g. `bigquery-data-analytics` runs
    `@toolbox-sdk/server@1.10.0 --prebuilt bigquery`
    ([`gemini-extension.json` @8475b9c](https://github.com/gemini-cli-extensions/bigquery-data-analytics/blob/8475b9c79e38c92a8e28cefc54890d48c74efebc/gemini-extension.json)).
- **Other Google servers.**
  - Developer Knowledge `https://developerknowledge.googleapis.com/mcp` (GA): "Pass the API key in the
    `X-Goog-Api-Key` header". The Claude Code example is `claude mcp add … --header "X-Goog-Api-Key: YOUR_API_KEY"`
    ([Developer Knowledge MCP](https://developers.google.com/knowledge/mcp)).
  - Google's own plugin uses `X-Goog-Api-Key: ${DEVELOPERKNOWLEDGE_API_KEY}`
    ([`.mcp.json` @2a1e454](https://github.com/google/skills/blob/2a1e4549d591688f3a605771cf101d05d43f8ae8/plugins/cloud/google-cloud-developer/.mcp.json)).
  - Maps Grounding Lite `https://mapstools.googleapis.com/mcp` (GA): header `X-Goog-Api-Key`, pay-as-you-go,
    300 QPM ([Grounding Lite](https://developers.google.com/maps/ai/grounding-lite)).
  - Maps Code Assist `https://mapscodeassist.googleapis.com/mcp`: "Experimental", free, "only use Maps Code Assist with
    an LLM that is compliant with the Google Maps Platform Terms of Service"
    ([Maps Code Assist](https://developers.google.com/maps/ai/mcp)).
- **Deprecated.** npm [`@googlemaps/code-assist-mcp`](https://www.npmjs.com/package/@googlemaps/code-assist-mcp)
  0.2.1: "The npm version of Code Assist is deprecated. It will be decommissioned on June 1, 2026. Please use the
  remote streamable HTTP version at https://mapscodeassist.googleapis.com/mcp".
  [`@google-cloud/cloud-run-mcp`](https://www.npmjs.com/package/@google-cloud/cloud-run-mcp) 1.10.0 (2026-03-04,
  [README @560558a](https://github.com/GoogleCloudPlatform/cloud-run-mcp/blob/560558a78b9d10f30da4b21879dff67379c80668/README.md))
  is not marked deprecated, but the GA remote Cloud Run server covers its use.
- **claude-plugins-official** (`~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json`)
  has `firebase`, `bigquery-data-analytics`, `cloud-sql-postgresql`, `cloud-sql-mysql`, `cloud-sql-sqlserver`,
  `google-cloud-storage`, `spanner`, `alloydb`, `firestore-native`, `dataproc`, `looker` and `knowledge-catalog`. There
  is no gcloud, Cloud Run, GKE, Compute, Logging, Monitoring, Maps or Developer Knowledge plugin.

Probe rows (2026-09-24, unauthenticated):

| Endpoint | HTTP | Auth server | DCR | CIMD |
|---|---|---|---|---|
| `https://bigquery.googleapis.com/mcp` | **200** on `initialize` and `tools/list`; `tools/call` → 401 `WWW-Authenticate: Bearer resource_metadata=".../oauth-protected-resource/list_dataset_ids"` | `https://accounts.google.com/` (metadata at `/.well-known/oauth-protected-resource/mcp`, scope `auth/bigquery`; root path 404) | **no** | **no** |
| `run`, `container`, `compute`, `sqladmin`, `logging`, `monitoring`, `cloudtrace`, `clouderrorreporting`, `firestore`, `spanner`, `alloydb`, `cloudcli` `.googleapis.com/mcp`; `storage.googleapis.com/storage/mcp` | 200 on `initialize` (`serverInfo` `StatelessServer`) | `https://accounts.google.com/`; scopes `run`, `container`, `compute`, `cloudsql`, `logging.admin`, `monitoring`, `trace.readonly`, `cloud-platform`, `devstorage.read_write`, … | no | no |
| `https://developerknowledge.googleapis.com/mcp` | 200 on `initialize` and `tools/list`; `tools/call` → "missing required authentication credential" | `https://accounts.google.com/` (scope `devprofiles.full_control`); API key header | no | no |
| `https://mapstools.googleapis.com/mcp` | 200 on `initialize` and `tools/list` | `https://accounts.google.com/` (scope `maps-platform.mapstools`); API key header | no | no |
| `https://mapscodeassist.googleapis.com/mcp` | 200; **`tools/call` succeeds without auth** | none | – | – |
| `https://accounts.google.com/.well-known/oauth-authorization-server` | 200, no `registration_endpoint`, no `client_id_metadata_document_supported` | – | – | – |

Local stdio checks: `npx -y @google-cloud/gcloud-mcp@0.5.3` gave `initialize` OK (`gcloud-mcp-server 0.5.3`) and
`tools/list` OK. `npx -y firebase-tools@15.31.0 mcp --dir .` gave `initialize` OK (`firebase 0.3.0`) and `tools/list`
OK.

Every Google endpoint answers `initialize` anonymously, so `/mcp` shows the server connected even with a bad
credential; only tool calls fail. Google says the same in
[google/skills#223](https://github.com/google/skills/issues/223).

### 2b. Proposed entries

```yaml
  # --- Google Cloud ----------------------------------------------------------------
  # Google's remote servers support neither DCR nor CIMD, so Claude Code cannot sign in by itself. These entries mint an
  # ADC access token on each connection (run `gcloud auth application-default login` first) and bill the quota project
  # GOOGLE_CLOUD_PROJECT. Each caller needs roles/mcp.toolUser plus the product's own IAM roles.
  gcloud:
    description: >-
      Google's official local gcloud server that runs gcloud CLI commands (a default denylist blocks some) with your
      local gcloud sign-in; runs with npx (Node 20+) and needs the gcloud CLI on PATH.
    command: npx
    args: [-y, '@google-cloud/gcloud-mcp@0.5.3']
    env:
      CLOUDSDK_CORE_DISABLE_USAGE_REPORTING: 'true'

  gcp-bigquery:
    description: >-
      Google's official managed BigQuery server for datasets, table metadata and SQL (execute_sql can write); ADC token
      from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT. Also shipped as plugin
      `bigquery-data-analytics@claude-plugins-official`.
    type: http
    url: https://bigquery.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-cloud-run:
    description: >-
      Google's official managed Cloud Run server for listing services and deploying from an image, an archive or file
      contents; ADC token from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://run.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-gke:
    description: >-
      Google's official managed GKE server for clusters, node pools and Kubernetes resources, logs and manifests; ADC
      token from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://container.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-compute:
    description: >-
      Google's official managed Compute Engine server for VM instances, disks, templates and reservations; ADC token
      from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://compute.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-cloud-sql:
    description: >-
      Google's official managed Cloud SQL server for administering MySQL, PostgreSQL and SQL Server instances; ADC token
      from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT. Also shipped as plugins
      `cloud-sql-postgresql@claude-plugins-official`, `cloud-sql-mysql@claude-plugins-official` and
      `cloud-sql-sqlserver@claude-plugins-official`.
    type: http
    url: https://sqladmin.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-logging:
    description: >-
      Google's official managed Cloud Logging server for reading log entries, log names, buckets and views; ADC token
      from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://logging.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-monitoring:
    description: >-
      Google's official managed Cloud Monitoring server for metrics, time series and alert policies; ADC token from the
      gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://monitoring.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  firebase:
    description: >-
      Google's official Firebase server in the Firebase CLI (Firestore, Auth, Hosting, Functions, Data Connect,
      Crashlytics, ...), with tools picked from the project's firebase.json; runs with npx (Node 20+) and uses
      `firebase login` or ADC. Also shipped as plugin `firebase@claude-plugins-official`.
    command: npx
    args: [-y, firebase-tools@15.31.0, mcp, --dir, '${CLAUDE_PROJECT_DIR:-.}']

  google-developer-knowledge:
    description: >-
      Google's official hosted Developer Knowledge server for searching Google developer documentation (Cloud,
      Firebase, Android, Maps, ...); needs DEVELOPERKNOWLEDGE_API_KEY, an API key with the Developer Knowledge API enabled.
    type: http
    url: https://developerknowledge.googleapis.com/mcp
    headers:
      X-Goog-Api-Key: ${DEVELOPERKNOWLEDGE_API_KEY}

  google-maps:
    description: >-
      Google's official hosted Maps Grounding Lite server for place search, weather and routes (billed per call);
      needs GOOGLE_MAPS_API_KEY, an API key with the Maps Grounding Lite API enabled.
    type: http
    url: https://mapstools.googleapis.com/mcp
    headers:
      X-Goog-Api-Key: ${GOOGLE_MAPS_API_KEY}

  google-maps-code-assist:
    description: >-
      Google's official hosted Maps Code Assist server (experimental, free) with Google Maps Platform docs and coding
      guidance; no sign-in.
    type: http
    url: https://mapscodeassist.googleapis.com/mcp
```

Rationale:

- **`gcloud`** (local stdio) is the only Google server that needs neither an OAuth client nor a token helper. It uses
  the gcloud sign-in the user already has and covers every product. Its env opts out of gcloud usage reporting. The
  Preview remote Cloud CLI server adds nothing, because its token helper needs gcloud anyway.
- **`gcp-*`** are the GA managed servers most useful for development work. Each follows Google's documented recipe:
  an ADC Bearer token plus `x-goog-user-project`.
  - The token is minted by `headersHelper` on every connect and after a 401/403, which covers the one-hour lifetime.
  - `GOOGLE_CLOUD_PROJECT` has no default, so `ap` warns when it is unset.
  - There is no `-oauth` twin: Google OAuth needs a client ID and secret the user registers, which belongs inline
    (`oauth.clientId`, then `claude mcp add-json … --client-secret`).
  - Adding the other GA products (Trace, Storage, Spanner, …) means copying one entry.
- **`firebase`** pins the vendor command and passes `--dir ${CLAUDE_PROJECT_DIR:-.}`, so tool detection reads the
  project's `firebase.json`.
- **`google-developer-knowledge`** and **`google-maps`** use the vendors' documented API-key header.
  `google-developer-knowledge` keeps Google's own variable name.
- **`google-maps-code-assist`** is anonymous and replaces the deprecated npm package.

## 3. Context7 (Upstash)

### 3a. What exists

- **Hosted, official: `https://mcp.context7.com/mcp`** (streamable HTTP). The README's manual setup is "use the Context7
  server URL `https://mcp.context7.com/mcp` … and pass your API key via the `Authorization: Bearer YOUR_API_KEY` header"
  ([README L59](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/README.md#L59)). The
  vendor's Claude Code command is
  `claude mcp add --scope user --header "Authorization: Bearer YOUR_API_KEY" --transport http context7 https://mcp.context7.com/mcp`
  ([all-clients.mdx L35-L51](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/docs/resources/all-clients.mdx#L35-L51)).
  - The key is **optional**: "API Key Recommended … for higher rate limits"
    ([README](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/README.md#installation)).
    My probe: anonymous `initialize` on `/mcp` answers **200** (`serverInfo` `Context7 4.1.1`), though it also sends a
    `WWW-Authenticate: Bearer resource_metadata=…` header. Claude Code only starts OAuth on a 401, so plain `/mcp` never
    triggers sign-in.
  - The server also accepts the key in `X-Context7-API-Key`, `Context7-API-Key` or `X-API-Key`
    ([`packages/mcp/src/index.ts` L408-L416](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/packages/mcp/src/index.ts#L408-L416)).
    `Authorization` is the documented one.
- **OAuth:** "change the endpoint from `/mcp` to `/mcp/oauth`", then `/mcp` → Authenticate in Claude Code
  ([docs/howto/oauth.mdx](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/docs/howto/oauth.mdx)).
  My probe: `/mcp/oauth` → 401; protected-resource metadata names `https://clerk.context7.com`, whose metadata has
  `registration_endpoint: https://clerk.context7.com/oauth/register` (DCR) and no CIMD flag.
- **`?client=claude-code-plugin`** is a special mode for the official plugin: it requires auth unless the
  `Authorization` header is present but empty (what the plugin's `${CONTEXT7_API_KEY:-}` expands to)
  ([index.ts L50-L62](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/packages/mcp/src/index.ts#L50-L62)).
  The catalog can't copy that config: it relies on an empty default, which the decisions forbid.
- **Local stdio:** npm [`@upstash/context7-mcp`](https://www.npmjs.com/package/@upstash/context7-mcp) **`4.1.1`**
  (2026-09-14, Node ≥ 20.18.1), `--api-key` or env `CONTEXT7_API_KEY`
  ([index.ts L68-L70, L668](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/packages/mcp/src/index.ts#L68-L70)).
  It is a thin client of the same `context7.com/api` backend
  ([`lib/constants.ts` L14](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/packages/mcp/src/lib/constants.ts#L14)),
  so it adds nothing over the hosted server. No entry proposed.
- **Telemetry:** the server's only telemetry is operator-side OpenTelemetry/Prometheus, switched off by
  `OTEL_SDK_DISABLED=true`; stdio processes never load the exporter
  ([`lib/telemetry-config.ts`](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/packages/mcp/src/lib/telemetry-config.ts),
  [`lib/telemetry-provider.ts` L28](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/packages/mcp/src/lib/telemetry-provider.ts#L28)).
  There is no client-side usage-telemetry opt-out for the hosted server. The API requests carry client IDE/version
  headers ([`lib/encryption.ts` L58-L86](https://github.com/upstash/context7/blob/3a3b2ee5a2b17a1c9e9e82b0687b232853d855d8/packages/mcp/src/lib/encryption.ts#L58-L86)).
- **Plugin:** `context7@claude-plugins-official` uses `https://mcp.context7.com/mcp?client=claude-code-plugin` with
  `Authorization: ${CONTEXT7_API_KEY:-}` (`external_plugins/context7/.mcp.json` in the local marketplace clone).

### 3b. Proposed entries

```yaml
  context7:
    description: >-
      Upstash's official hosted Context7 server for current, version-specific library documentation and code examples;
      needs CONTEXT7_API_KEY (free at context7.com/dashboard). Also shipped as plugin `context7@claude-plugins-official`.
    type: http
    url: https://mcp.context7.com/mcp
    headers:
      Authorization: Bearer ${CONTEXT7_API_KEY}

  context7-oauth:
    description: Upstash's official hosted Context7 server with browser sign-in (OAuth) instead of an API key.
    type: http
    url: https://mcp.context7.com/mcp/oauth
```

Rationale:

- **`context7`** is the vendor's documented manual config (Bearer key). An unset `CONTEXT7_API_KEY` sends the literal
  `Bearer ${CONTEXT7_API_KEY}`; I did not test whether the server then falls back to anonymous or rejects it (see
  Unverified).
- **`context7-oauth`** is the vendor's documented OAuth path (DCR, no secret).
- A keyless entry (plain `/mcp`, no header) would work today at anonymous limits, like `parallel-search`. It is an open
  question rather than proposed, because the vendor recommends a key.

## 4. Playwright (Microsoft)

### 4a. What exists

- **Official local stdio server:** npm [`@playwright/mcp`](https://www.npmjs.com/package/@playwright/mcp) **`0.0.82`**
  (2026-09-18, Node ≥ 18), repo
  [`microsoft/playwright-mcp`](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/README.md).
  The vendor's Claude Code command is `claude mcp add playwright npx @playwright/mcp@latest`
  ([README L96-L104](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/README.md#L96-L104)).
  There is no hosted server and no auth.
  - I ran `npx -y @playwright/mcp@0.0.82 --headless --isolated` locally: `initialize` OK (`serverInfo` `Playwright
    1.64.0-alpha-1789764292000`), `tools/list` returns 25 tools.
  - **The vendor now nudges coding agents to Playwright CLI + skills** instead ("If you are using a coding agent, you
    might benefit from using the CLI+SKILLS", [README L5-L11](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/README.md#L5-L11)).
    The MCP server is not deprecated.
- **Profiles** ([README L462-L511](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/README.md#L462-L511)):
  - default: headed browser with a **persistent profile** per workspace (`~/.cache/ms-playwright/mcp-{channel}-{hash}`
    on Linux); one browser per profile, so parallel clients conflict;
  - `--isolated`: in-memory profile, lost on close;
  - `--extension`: attach to your running Chrome/Edge tabs through the "Playwright Extension" (logged-in sessions).
    `PLAYWRIGHT_MCP_EXTENSION_TOKEN` (present in `playwright-core` 1.64.0-alpha; not in the README options table)
    skips the approval prompt.
- **Notable options** ([README L405-L458](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/README.md#L405-L458)),
  each also as a `PLAYWRIGHT_MCP_*` env: `--headless`, `--browser chrome|firefox|webkit|msedge`, `--caps vision,pdf,devtools`,
  `--cdp-endpoint`, `--allowed-origins`/`--blocked-origins` ("not a security boundary"), `--allow-unrestricted-file-access`
  (off by default: file access is limited to the workspace roots), `--secrets`, `--storage-state`, `--user-data-dir`,
  `--output-dir`, `--no-sandbox`.
- **Docker:** `mcr.microsoft.com/playwright/mcp`, headless Chromium only
  ([README L826-L858](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/README.md#L826-L858)).
  The MCR tag list has `v0.0.82` ([tags/list](https://mcr.microsoft.com/v2/playwright/mcp/tags/list)).
- **Telemetry:** none to opt out of. Neither the README nor the `@playwright/mcp@0.0.82` tarball mention telemetry, and
  the only hit in `playwright-core@1.64.0-alpha-1789764292000` is a Firefox pref that *turns off* Firefox data
  reporting (I grepped the packed tarballs).
- **Plugin:** `playwright@claude-plugins-official` runs `npx @playwright/mcp@latest` (unpinned;
  `external_plugins/playwright/.mcp.json`).

### 4b. Proposed entries

```yaml
  playwright:
    description: >-
      Microsoft's official Playwright server for browser automation through accessibility snapshots; runs with npx
      (Node 18+), headed, with a persistent per-workspace profile. Also shipped as plugin `playwright@claude-plugins-official`.
    command: npx
    args: [-y, '@playwright/mcp@0.0.82']

  playwright-headless:
    description: >-
      Microsoft's official Playwright server with a headless browser and an in-memory profile, for machines without a
      display (WSL, CI, SSH) or parallel sessions; runs with npx.
    command: npx
    args: [-y, '@playwright/mcp@0.0.82', --headless, --isolated]

  playwright-extension:
    description: >-
      Microsoft's official Playwright server attached to your running Chrome or Edge and its logged-in tabs; runs with npx
      and needs the Playwright Extension installed in that browser.
    command: npx
    args: [-y, '@playwright/mcp@0.0.82', --extension]
```

Rationale:

- Mirrors the `chrome-devtools` / `-headless` / `-browser-url` trio already in the catalog.
- `playwright` is the vendor default config, pinned.
- `playwright-headless` covers WSL/CI, where the default headed browser has no display.
- `playwright-extension` is the vendor's third profile mode (real sessions). Optional; see open questions.
- No Docker entry: it only adds headless Chromium, which `playwright-headless` already covers without Docker.

## 5. Linear

### 5a. What exists

- **Hosted, official: `https://mcp.linear.app/mcp`** (streamable HTTP), OAuth 2.1 with DCR. Vendor Claude Code command:
  `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`, then `/mcp`
  ([linear.app/docs/mcp.md](https://linear.app/docs/mcp.md), "Setup" and "Claude Code").
- **Token auth:** the FAQ says the server "supports passing OAuth token and API keys directly in the
  `Authorization: Bearer <yourtoken>` header", including API keys limited to Read permission
  ([mcp.md FAQ](https://linear.app/docs/mcp.md)).
- **Read-only endpoint** `https://mcp.linear.app/mcp/readonly` exists; not catalogued (no read-only variants).
- **Deprecated:** `https://mcp.linear.app/sse` is "a deprecated fallback" in the FAQ; my probe got **404** on GET and
  POST, so it looks removed.
- No official stdio server, no self-hosted Linear, no documented telemetry opt-out.
- **Plugin:** `linear@claude-plugins-official` uses `https://mcp.linear.app/mcp` (`external_plugins/linear/.mcp.json`
  in the local marketplace clone).

### 5b. Proposed entries

```yaml
  linear:
    description: >-
      Linear's official hosted server for finding, creating and updating issues, projects, cycles and comments; OAuth
      sign-in. Also shipped as plugin `linear@claude-plugins-official`.
    type: http
    url: https://mcp.linear.app/mcp

  linear-token:
    description: >-
      Linear's official hosted server with a personal API key instead of browser sign-in; needs LINEAR_API_KEY (a key
      limited to Read permission gives read-only access).
    type: http
    url: https://mcp.linear.app/mcp
    headers:
      Authorization: Bearer ${LINEAR_API_KEY}
```

Rationale: OAuth (DCR and CIMD per the probe) is the vendor default; the Bearer API key is documented and suits
headless use.

## 6. Stripe

### 6a. What exists

- **Hosted, official: `https://mcp.stripe.com`** (streamable HTTP). Claude Code: `claude mcp add --transport http stripe
  https://mcp.stripe.com/`, then `/mcp` for OAuth ([docs.stripe.com/mcp.md](https://docs.stripe.com/mcp.md), "Claude
  Code", "Authentication"). The Claude Code docs use the same server as their OAuth example
  ([`CC-MCP` L530-L545](https://code.claude.com/docs/en/mcp.md)).
  - OAuth consent picks live accounts and/or sandboxes and the permissions for each.
  - Token alternative: `headers: {Authorization: "Bearer ${AGENT_API_KEY}"}` (the name is only a placeholder). For
    autonomous clients Stripe recommends an **agent API key**: a restricted key (`rk_…`) tagged "Authorizing agent
    access", with approval rules for sensitive actions
    ([keys.md, "API keys for autonomous agents"](https://docs.stripe.com/keys.md)).
  - **Deprecation:** from **2026-10-31** Stripe MCP stops accepting full-access secret keys and restricted keys without
    the agent tag ([mcp.md](https://docs.stripe.com/mcp.md)).
  - Test mode = a sandbox (an `rk_test_…` key or a sandbox granted at consent). Connected accounts: no OAuth; use a
    platform restricted key plus `Stripe-Account: acct_…`.
- **Local `@stripe/mcp` `0.3.3`** (npm latest, 2026-03-24) is only a stdio→HTTP proxy to `https://mcp.stripe.com`
  taking `--api-key` / `STRIPE_SECRET_KEY` and `--stripe-account`; `--tools` was removed
  ([src/index.ts L14](https://github.com/stripe/ai/blob/a682cd5788a6fbcc64dadf872ea91d1f0da1908c/tools/modelcontextprotocol/src/index.ts#L14),
  [src/cli.ts](https://github.com/stripe/ai/blob/a682cd5788a6fbcc64dadf872ea91d1f0da1908c/tools/modelcontextprotocol/src/cli.ts)).
  It adds nothing over the hosted server, so no entry.
- **Telemetry:** none documented; the proxy only sends a `User-Agent` with the client name
  ([src/userAgent.ts](https://github.com/stripe/ai/blob/a682cd5788a6fbcc64dadf872ea91d1f0da1908c/tools/modelcontextprotocol/src/userAgent.ts)).
- **Plugin:** `stripe@claude-plugins-official` is `{"type":"http","url":"https://mcp.stripe.com"}`
  ([stripe/ai `providers/claude/plugin/.mcp.json`](https://github.com/stripe/ai/blob/97b2164821c378f246c3903852057b36a8bd0296/providers/claude/plugin/.mcp.json)).

### 6b. Proposed entries

```yaml
  stripe:
    description: >-
      Stripe's official hosted server for the Stripe API, account data, analytics and docs search; OAuth sign-in, picking
      live accounts or sandboxes and their permissions at consent. Also shipped as plugin `stripe@claude-plugins-official`.
    type: http
    url: https://mcp.stripe.com

  stripe-token:
    description: >-
      Stripe's official hosted server with an agent API key (a restricted key tagged for agents; rk_test_… for a
      sandbox) instead of OAuth; needs STRIPE_AGENT_API_KEY. Untagged restricted and secret keys stop working on 2026-10-31.
    type: http
    url: https://mcp.stripe.com
    headers:
      Authorization: Bearer ${STRIPE_AGENT_API_KEY}
```

Rationale: `stripe` is the vendor's Claude Code path (OAuth with DCR, no secret). `stripe-token` is the documented
header alternative for headless/CI; `STRIPE_AGENT_API_KEY` is my name because Stripe only uses a placeholder. A
`Stripe-Account` variant only matters for Connect platforms and can be declared inline.

## 7. Slack

### 7a. What exists

- **Official hosted server `https://mcp.slack.com/mcp`** ([Slack MCP server overview](https://docs.slack.dev/ai/slack-mcp-server)):
  streamable HTTP; "We do not support SSE-based connections or Dynamic Client Registration at this time." Clients must
  be registered Slack apps ("Only directory-published apps or internal apps may use MCP"); auth is Slack **user tokens**
  via `slack.com/oauth/v2_user/authorize` with PKCE; a workspace admin must approve the app. Claude Code is a listed
  partner client.
- **Slack's own Claude Code config** ([Connect to Claude](https://docs.slack.dev/ai/slack-mcp-server/connect-to-claude))
  and the plugin's
  [`.mcp.json` @8044341](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/.mcp.json)
  set `oauth: {clientId: "1601185624273.8899143856786", callbackPort: 3118}`: Slack's published app ID, not a secret.
  (`slackapi/slack-mcp-plugin`, the URL in the marketplace manifest, now redirects to `slackapi/slack-skills-plugin`.)
  The Claude Code docs also use this server as their `oauth.scopes` example
  ([`CC-MCP` L913-L927](https://code.claude.com/docs/en/mcp.md)).
- Probe: the auth server has no `registration_endpoint`, no CIMD, and `token_endpoint_auth_methods_supported:
  [client_secret_post]`, so a plain URL entry cannot sign in; the pre-registered `clientId` is required.
- **Deprecated:** `@modelcontextprotocol/server-slack` (2025.4.25), marked "Package no longer supported" on npm; its
  source is in the archived [`modelcontextprotocol/servers-archived`](https://github.com/modelcontextprotocol/servers-archived).
- **Community:** `korotovsky/slack-mcp-server` (xoxp/xoxc tokens) — not proposed, the official server covers the need.
- **Plugin:** `slack@claude-plugins-official`. No telemetry setting applies.

### 7b. Proposed entry

```yaml
  # No DCR/CIMD: sign-in uses Slack's published app client ID, as in Slack's own Claude Code config.
  slack:
    description: >-
      Slack's official hosted server for searching messages and files, reading channels and threads, and sending
      messages, canvases and lists; OAuth sign-in through Slack's published app, which a workspace admin must approve.
      Also shipped as plugin `slack@claude-plugins-official`.
    type: http
    url: https://mcp.slack.com/mcp
    oauth:
      clientId: '1601185624273.8899143856786'
      callbackPort: 3118
```

Rationale: exactly Slack's documented Claude Code config; the first catalog entry to use `oauth`. The client ID is quoted
so YAML keeps it a string. A `slack-token` twin (`Authorization: Bearer ${SLACK_USER_TOKEN}`, an xoxp token) is **not**
proposed: the endpoint distinguishes `invalid_token` from `missing_token` and lists `bearer_methods_supported: [header,
form]`, but Slack doesn't document static tokens.

## 8. Grafana

### 8a. What exists

- **Hosted Grafana Cloud MCP** (official, Grafana Cloud only) at `https://mcp.grafana.com/mcp`
  ([Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/machine-learning/assistant/configure/cloud-mcp/);
  [plugin README](https://github.com/grafana/ai-marketplace/blob/12be5634a492f73c189d466c5449d09b853ad7a4/plugins/grafana-cloud-mcp/README.md),
  [plugin `.mcp.json`](https://github.com/grafana/ai-marketplace/blob/12be5634a492f73c189d466c5449d09b853ad7a4/plugins/grafana-cloud-mcp/.mcp.json)):
  streamable HTTP only ("SSE isn't supported"); OAuth 2.1 scoped to the user's Grafana permissions; no service-account
  token path documented. Command: `claude mcp add grafana --transport http https://mcp.grafana.com/mcp`. Optional header
  `X-Grafana-URL: https://<stack>.grafana.net` skips typing the stack URL at sign-in. Prerequisites: an admin accepted
  the Grafana Assistant terms and the user has "Assistant Cloud MCP User" (Editor and above do). Probe: DCR and CIMD,
  scopes `grafana:read grafana:query grafana:write`.
- **Local open-source `grafana/mcp-grafana`** (official; any Grafana, Cloud or self-hosted). Latest **`1.5.1`**
  (2026-09-17): [release](https://github.com/grafana/mcp-grafana/releases/tag/v1.5.1),
  [PyPI](https://pypi.org/project/mcp-grafana/1.5.1/) (Python ≥ 3.10),
  [Docker `grafana/mcp-grafana:1.5.1`](https://hub.docker.com/r/grafana/mcp-grafana/tags).
  - Quick start: `uvx mcp-grafana` with `GRAFANA_URL` and `GRAFANA_SERVICE_ACCOUNT_TOKEN`
    ([README L12-L32](https://github.com/grafana/mcp-grafana/blob/65bd38b61bd5e9edc3883be5824f4b7494e20366/README.md#L12-L32));
    uvx is "recommended" (L763-L766). The Docker image defaults to SSE, so stdio needs `-i … -t stdio` (L768+).
  - **Deprecated:** `GRAFANA_API_KEY` → `GRAFANA_SERVICE_ACCOUNT_TOKEN` (L625). Others: `GRAFANA_SERVICE_ACCOUNT_TOKEN_FILE`
    (L629-L647), `GRAFANA_ORG_ID` (L653), `GRAFANA_USERNAME`/`GRAFANA_PASSWORD` (L675-L678), `GRAFANA_EXTRA_HEADERS`
    (L687).
  - **Telemetry:** `--usage-stats=disabled`, `GRAFANA_USAGE_STATS=disabled` or `DO_NOT_TRACK=1`. Off by default today,
    but "a later release will change the default to enabled with the same opt-out"
    ([README L448](https://github.com/grafana/mcp-grafana/blob/65bd38b61bd5e9edc3883be5824f4b7494e20366/README.md#L448),
    [L1201-L1218](https://github.com/grafana/mcp-grafana/blob/65bd38b61bd5e9edc3883be5824f4b7494e20366/README.md#L1201-L1218)).
  - `--enabled-tools` picks categories (admin, CloudWatch, SQL, Elasticsearch and others are off by default, L454);
    `--disable-write` is read-only mode (not used).
  - Local check: `uvx mcp-grafana@1.5.1` → `initialize` OK (`mcp-grafana v1.5.1`, dummy token, no Grafana).
- **Plugins:** `grafana-cloud-mcp` (hosted), `grafana-mcp` (runs the **unpinned** image,
  [`.mcp.json`](https://github.com/grafana/ai-marketplace/blob/12be5634a492f73c189d466c5449d09b853ad7a4/plugins/grafana-mcp/.mcp.json))
  and `grafana-assistant` (skills only).

### 8b. Proposed entries

```yaml
  grafana:
    description: >-
      Grafana Labs' official local server for any Grafana (self-hosted or Grafana Cloud): dashboards, datasources,
      Prometheus/Loki queries, alerting, incidents and OnCall; runs with uvx and needs GRAFANA_URL and
      GRAFANA_SERVICE_ACCOUNT_TOKEN, usage stats off. Also shipped as plugin `grafana-mcp@claude-plugins-official`.
    command: uvx
    args: [mcp-grafana@1.5.1]
    env:
      GRAFANA_URL: ${GRAFANA_URL}
      GRAFANA_SERVICE_ACCOUNT_TOKEN: ${GRAFANA_SERVICE_ACCOUNT_TOKEN}
      GRAFANA_USAGE_STATS: disabled

  grafana-cloud:
    description: >-
      Grafana Labs' official hosted Grafana Cloud server with the signed-in user's permissions; OAuth sign-in (you enter
      the stack URL in the browser), Grafana Cloud only. Also shipped as plugin `grafana-cloud-mcp@claude-plugins-official`.
    type: http
    url: https://mcp.grafana.com/mcp
```

Rationale: `grafana` is the only official route to self-hosted Grafana and also works for Cloud; usage stats are
disabled explicitly so the entry stays opted out when the default flips. Naming follows `clickhouse` /
`clickhouse-cloud`. `grafana-cloud` needs no install or secret (DCR + CIMD); `X-Grafana-URL` is left out because it
would force a required variable. No `-token` twin for hosted (OAuth only); token users take `grafana`.

## Consolidated YAML to APPEND to `packages/presets/mcp-servers.yaml`

28 entries. None clash with the current catalog (checked by merging and parsing with `uniqueKeys`). Validated on
2026-09-24: merged with the current catalog it passes `mcp-catalog.schema.json` (ajv 2020, `preset.schema.json`
registered as `preset.schema.json`); no `${VAR:-}` empty defaults; every env/header key matching
`/key|token|secret|password|auth|credential/i` has a `${…}` value.

```yaml
  # --- Microsoft Azure ---------------------------------------------------------------------
  # Remote Azure DevOps (https://mcp.dev.azure.com/<org>) and Foundry need your own Entra app registration: declare them
  # inline with `oauth: {clientId: <app id>, callbackPort: 3118}`.
  azure:
    description: >-
      Microsoft's official Azure MCP Server (GA) for Azure resources (Storage, Key Vault, Cosmos DB, AKS, Foundry,
      Monitor, ...) with your local Azure sign-in (az login, azd, VS Code or PowerShell); runs with npx (Node 20+),
      telemetry off. Also shipped as plugin `azure@claude-plugins-official`.
    command: npx
    args: [-y, '@azure/mcp@2.0.5', server, start]
    env:
      AZURE_MCP_COLLECT_TELEMETRY: 'false'

  microsoft-learn:
    description: >-
      Microsoft's official hosted Microsoft Learn server for searching and fetching Microsoft and Azure documentation and
      code samples; no sign-in. Also shipped as plugin `microsoft-docs@claude-plugins-official`.
    type: http
    url: https://learn.microsoft.com/api/mcp

  azure-devops:
    description: >-
      Microsoft's official local Azure DevOps server (Azure DevOps Services only) for work items, repos, pipelines, wiki
      and test plans; runs with npx (Node 20+), needs AZURE_DEVOPS_ORG and signs in through the browser on first use.
    command: npx
    args: [-y, '@azure-devops/mcp@2.10.0', '${AZURE_DEVOPS_ORG}']

  azure-devops-token:
    description: >-
      Microsoft's official local Azure DevOps server with a personal access token instead of browser sign-in; runs with
      npx and needs AZURE_DEVOPS_ORG and AZURE_DEVOPS_BASIC_AUTH, which must already be base64("<email>:<pat>").
    command: npx
    args: [-y, '@azure-devops/mcp@2.10.0', '${AZURE_DEVOPS_ORG}', --authentication, pat]
    env:
      PERSONAL_ACCESS_TOKEN: ${AZURE_DEVOPS_BASIC_AUTH}

  # --- Google Cloud ------------------------------------------------------------------------
  # Google's remote servers support neither DCR nor CIMD, so Claude Code cannot sign in by itself. These entries mint an
  # ADC access token on each connection (run `gcloud auth application-default login` first) and bill the quota project
  # GOOGLE_CLOUD_PROJECT. Each caller needs roles/mcp.toolUser plus the product's own IAM roles.
  gcloud:
    description: >-
      Google's official local gcloud server that runs gcloud CLI commands (a default denylist blocks some) with your
      local gcloud sign-in; runs with npx (Node 20+) and needs the gcloud CLI on PATH.
    command: npx
    args: [-y, '@google-cloud/gcloud-mcp@0.5.3']
    env:
      CLOUDSDK_CORE_DISABLE_USAGE_REPORTING: 'true'

  gcp-bigquery:
    description: >-
      Google's official managed BigQuery server for datasets, table metadata and SQL (execute_sql can write); ADC token
      from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT. Also shipped as plugin
      `bigquery-data-analytics@claude-plugins-official`.
    type: http
    url: https://bigquery.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-cloud-run:
    description: >-
      Google's official managed Cloud Run server for listing services and deploying from an image, an archive or file
      contents; ADC token from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://run.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-gke:
    description: >-
      Google's official managed GKE server for clusters, node pools and Kubernetes resources, logs and manifests; ADC
      token from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://container.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-compute:
    description: >-
      Google's official managed Compute Engine server for VM instances, disks, templates and reservations; ADC token
      from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://compute.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-cloud-sql:
    description: >-
      Google's official managed Cloud SQL server for administering MySQL, PostgreSQL and SQL Server instances; ADC token
      from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT. Also shipped as plugins
      `cloud-sql-postgresql@claude-plugins-official`, `cloud-sql-mysql@claude-plugins-official` and
      `cloud-sql-sqlserver@claude-plugins-official`.
    type: http
    url: https://sqladmin.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-logging:
    description: >-
      Google's official managed Cloud Logging server for reading log entries, log names, buckets and views; ADC token
      from the gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://logging.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  gcp-monitoring:
    description: >-
      Google's official managed Cloud Monitoring server for metrics, time series and alert policies; ADC token from the
      gcloud CLI, needs GOOGLE_CLOUD_PROJECT.
    type: http
    url: https://monitoring.googleapis.com/mcp
    headers:
      x-goog-user-project: ${GOOGLE_CLOUD_PROJECT}
    headersHelper: printf '{"Authorization":"Bearer %s"}' "$(gcloud auth application-default print-access-token)"

  firebase:
    description: >-
      Google's official Firebase server in the Firebase CLI (Firestore, Auth, Hosting, Functions, Data Connect,
      Crashlytics, ...), with tools picked from the project's firebase.json; runs with npx (Node 20+) and uses
      `firebase login` or ADC. Also shipped as plugin `firebase@claude-plugins-official`.
    command: npx
    args: [-y, firebase-tools@15.31.0, mcp, --dir, '${CLAUDE_PROJECT_DIR:-.}']

  google-developer-knowledge:
    description: >-
      Google's official hosted Developer Knowledge server for searching Google developer documentation (Cloud,
      Firebase, Android, Maps, ...); needs DEVELOPERKNOWLEDGE_API_KEY, an API key with the Developer Knowledge API enabled.
    type: http
    url: https://developerknowledge.googleapis.com/mcp
    headers:
      X-Goog-Api-Key: ${DEVELOPERKNOWLEDGE_API_KEY}

  google-maps:
    description: >-
      Google's official hosted Maps Grounding Lite server for place search, weather and routes (billed per call);
      needs GOOGLE_MAPS_API_KEY, an API key with the Maps Grounding Lite API enabled.
    type: http
    url: https://mapstools.googleapis.com/mcp
    headers:
      X-Goog-Api-Key: ${GOOGLE_MAPS_API_KEY}

  google-maps-code-assist:
    description: >-
      Google's official hosted Maps Code Assist server (experimental, free) with Google Maps Platform docs and coding
      guidance; no sign-in.
    type: http
    url: https://mapscodeassist.googleapis.com/mcp

  # --- Documentation -----------------------------------------------------------------------
  context7:
    description: >-
      Upstash's official hosted Context7 server for current, version-specific library documentation and code examples;
      needs CONTEXT7_API_KEY (free at context7.com/dashboard). Also shipped as plugin `context7@claude-plugins-official`.
    type: http
    url: https://mcp.context7.com/mcp
    headers:
      Authorization: Bearer ${CONTEXT7_API_KEY}

  context7-oauth:
    description: Upstash's official hosted Context7 server with browser sign-in (OAuth) instead of an API key.
    type: http
    url: https://mcp.context7.com/mcp/oauth

  # --- Browser automation (Playwright) -----------------------------------------------------
  playwright:
    description: >-
      Microsoft's official Playwright server for browser automation through accessibility snapshots; runs with npx
      (Node 18+), headed, with a persistent per-workspace profile. Also shipped as plugin `playwright@claude-plugins-official`.
    command: npx
    args: [-y, '@playwright/mcp@0.0.82']

  playwright-headless:
    description: >-
      Microsoft's official Playwright server with a headless browser and an in-memory profile, for machines without a
      display (WSL, CI, SSH) or parallel sessions; runs with npx.
    command: npx
    args: [-y, '@playwright/mcp@0.0.82', --headless, --isolated]

  playwright-extension:
    description: >-
      Microsoft's official Playwright server attached to your running Chrome or Edge and its logged-in tabs; runs with npx
      and needs the Playwright Extension installed in that browser.
    command: npx
    args: [-y, '@playwright/mcp@0.0.82', --extension]

  # --- Linear ------------------------------------------------------------------------------
  linear:
    description: >-
      Linear's official hosted server for finding, creating and updating issues, projects, cycles and comments; OAuth
      sign-in. Also shipped as plugin `linear@claude-plugins-official`.
    type: http
    url: https://mcp.linear.app/mcp

  linear-token:
    description: >-
      Linear's official hosted server with a personal API key instead of browser sign-in; needs LINEAR_API_KEY (a key
      limited to Read permission gives read-only access).
    type: http
    url: https://mcp.linear.app/mcp
    headers:
      Authorization: Bearer ${LINEAR_API_KEY}

  # --- Stripe ------------------------------------------------------------------------------
  stripe:
    description: >-
      Stripe's official hosted server for the Stripe API, account data, analytics and docs search; OAuth sign-in, picking
      live accounts or sandboxes and their permissions at consent. Also shipped as plugin `stripe@claude-plugins-official`.
    type: http
    url: https://mcp.stripe.com

  stripe-token:
    description: >-
      Stripe's official hosted server with an agent API key (a restricted key tagged for agents; rk_test_… for a
      sandbox) instead of OAuth; needs STRIPE_AGENT_API_KEY. Untagged restricted and secret keys stop working on 2026-10-31.
    type: http
    url: https://mcp.stripe.com
    headers:
      Authorization: Bearer ${STRIPE_AGENT_API_KEY}

  # --- Slack -------------------------------------------------------------------------------
  # No DCR/CIMD: sign-in uses Slack's published app client ID, as in Slack's own Claude Code config.
  slack:
    description: >-
      Slack's official hosted server for searching messages and files, reading channels and threads, and sending
      messages, canvases and lists; OAuth sign-in through Slack's published app, which a workspace admin must approve.
      Also shipped as plugin `slack@claude-plugins-official`.
    type: http
    url: https://mcp.slack.com/mcp
    oauth:
      clientId: '1601185624273.8899143856786'
      callbackPort: 3118

  # --- Grafana -----------------------------------------------------------------------------
  grafana:
    description: >-
      Grafana Labs' official local server for any Grafana (self-hosted or Grafana Cloud): dashboards, datasources,
      Prometheus/Loki queries, alerting, incidents and OnCall; runs with uvx and needs GRAFANA_URL and
      GRAFANA_SERVICE_ACCOUNT_TOKEN, usage stats off. Also shipped as plugin `grafana-mcp@claude-plugins-official`.
    command: uvx
    args: [mcp-grafana@1.5.1]
    env:
      GRAFANA_URL: ${GRAFANA_URL}
      GRAFANA_SERVICE_ACCOUNT_TOKEN: ${GRAFANA_SERVICE_ACCOUNT_TOKEN}
      GRAFANA_USAGE_STATS: disabled

  grafana-cloud:
    description: >-
      Grafana Labs' official hosted Grafana Cloud server with the signed-in user's permissions; OAuth sign-in (you enter
      the stack URL in the browser), Grafana Cloud only. Also shipped as plugin `grafana-cloud-mcp@claude-plugins-official`.
    type: http
    url: https://mcp.grafana.com/mcp
```

## Open questions

1. **Azure pin.** Keep `azure` on GA `2.0.5` (2026-07), or follow npm `latest` (`3.0.0-beta.46`) as the vendor plugin
   does (`@latest`)? The betas rename tools weekly.
2. **Azure DevOps.** Is the local pair (`azure-devops`, `azure-devops-token`) enough, given Microsoft recommends the
   remote preview server (which needs your own Entra app)? Add `azure-devops-azcli` (`--authentication azcli`, no
   browser)? Names: `microsoft-learn` (the vendor's server name) vs `microsoft-docs` (the plugin name);
   `AZURE_DEVOPS_BASIC_AUTH` vs the vendor's generic `PERSONAL_ACCESS_TOKEN`.
3. **Google naming and scope.** `gcp-*` for Cloud products and `google-*` for other Google servers, or `google-cloud-*`
   / bare product names (`bigquery`, `cloud-run`)? Ship only the 7 `gcp-*`, or also Trace, Error Reporting, Storage,
   Firestore, Spanner, AlloyDB, IAM, and the Preview Cloud CLI server?
4. **Google token source.** `gcloud auth application-default print-access-token` (Google's documented recipe, needs
   `gcloud auth application-default login`) vs `gcloud auth print-access-token` (reuses the normal gcloud login). Keep
   `GOOGLE_CLOUD_PROJECT` required, or have the helper also print `x-goog-user-project` from
   `gcloud config get-value project` (a second gcloud call per connect, no env var)? The helper is POSIX shell
   (`printf`, `$(…)`), which may not work on native Windows.
5. **Google extras.** `google-maps` vs `google-maps-grounding`? Should `firebase` pass `--only`?
6. **Context7.** Bare `context7` = Bearer key (vendor's manual config) plus `context7-oauth`, as proposed? Or add a
   keyless `context7-anonymous` (plain `/mcp`, works today at anonymous limits, like `parallel-search`)?
7. **Playwright.** Is `playwright-extension` wanted? Should the headed `playwright` stay the bare name (vendor default)
   or should headless be the default for WSL/CI users?
8. **Stripe.** Name the variable `STRIPE_AGENT_API_KEY` (mine) or `STRIPE_SECRET_KEY` (what `@stripe/mcp` reads)? Add a
   `stripe-connect` entry with `Stripe-Account: ${STRIPE_ACCOUNT_ID}`?
9. **Slack.** Ship an undocumented `slack-token` (`Authorization: Bearer ${SLACK_USER_TOKEN}`, xoxp)? Slack only
   documents OAuth through a registered app.
10. **Grafana.** Bare `grafana` = local (any Grafana) and `grafana-cloud` = hosted, as proposed (mirrors
    `clickhouse`/`clickhouse-cloud`)? Give `GRAFANA_URL` the quick-start default `http://localhost:3000`? Add a Docker
    variant (`grafana/mcp-grafana:1.5.1 -t stdio`) or `X-Grafana-URL` on `grafana-cloud`?
11. **Plugin overlap.** `context7`, `linear`, `stripe`, `slack`, `playwright`, `firebase`, `azure`, `microsoft-learn`
    and `grafana*` duplicate what the official plugins ship. Keep them in the catalog anyway (pinned versions, telemetry
    off, twins), as proposed?

## Unverified / could not confirm

- **OAuth end to end** for every OAuth entry (Context7, Linear, Stripe, Slack with the published client ID and PKCE,
  Grafana Cloud). I only read metadata; I did not sign in.
- **Token entries with real credentials**: whether Linear accepts a personal API key as Bearer (documented, tested only
  with a fake token), whether Stripe already rejects untagged keys before 2026-10-31, and whether Slack accepts a static
  xoxp token.
- **Context7 with an unset key:** whether a literal `Bearer ${CONTEXT7_API_KEY}` is rejected or falls back to the
  anonymous tier.
- **Google:** tool calls with a real ADC token; whether `x-goog-user-project` is required for user credentials; whether
  Claude Code reads `GOOGLE_CLOUD_PROJECT` / `GOOGLE_MAPS_API_KEY` as empty in remote headers (`CC-MCP` L649-L661 names
  only examples); whether `GOOGLE_APPLICATION_CREDENTIALS` is on the unpublished list stripped from a project-scope
  helper (L1008-L1016); helper latency against the 10 s limit; how Maps Code Assist's "LLM compliant with the Google
  Maps Platform Terms of Service" condition applies to Claude.
- **Azure:** the telemetry variable was read in the `main` source, not the `2.0.5` tag (the CHANGELOG shows it since 0.x);
  interactive Azure DevOps sign-in from a stdio server on WSL/headless (I never triggered a tool call); Microsoft Learn
  telemetry (none documented); the support window for 2.0.x.
- **Grafana:** which mcp-grafana release turns usage stats on by default; whether hosted Grafana MCP is preview or GA
  (no label on the page); tool calls against a real Grafana.
- **Playwright:** browser-launching tools (only `initialize`/`tools/list` ran; the first run may download a browser);
  `PLAYWRIGHT_MCP_EXTENSION_TOKEN` is in `playwright-core` but not in the README options table.
- **Linear `/sse`:** whether the 404 is a permanent removal; the docs still describe it.
- **No telemetry opt-out** for Context7 (hosted), Linear, Stripe, Slack, Microsoft Learn or Google's hosted servers:
  none is documented; I did not read their terms of service.
