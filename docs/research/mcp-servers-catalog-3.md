# Research: more MCP servers for the bundled catalog (Notion, Terraform, Todoist, ClickUp, DeepWiki, Mapbox, Snyk, Miro)

Goal: choose catalog entries for Notion, Terraform (HashiCorp), Todoist, ClickUp, DeepWiki (Cognition/Devin), Mapbox
(the Mapbox MCP server, the DevKit server and the docs server), Snyk and Miro. Each entry must fit `McpCatalog`
([`mcp-catalog.schema.json`](../../packages/schemas/schemas/mcp-catalog.schema.json) →
`preset.schema.json#/$defs/mcpServer`) and [ADR 0006](../adr/0006-mcp-servers-inline-plus-bundled-catalog.md), and
follow the conventions settled in [`mcp-servers-catalog.md` → "Decisions (2026-09-24)"](mcp-servers-catalog.md#decisions-2026-09-24):
bare name = vendor-recommended auth, `-oauth` / `-token` twins for the other style, cloud and self-hosted variants
where they exist, no `${VAR:-}` empty defaults, no read-only-by-default variants, exact pins for stdio packages and
images, secrets only as `${VAR}`, and a `description` field first in every entry.

Sources checked on **2026-09-24**. Only primary sources are used: vendor docs (fetched as Markdown where the site
offers it), vendor GitHub repos pinned to the default-branch commit on that date, the npm registry, Docker Hub, and
the Claude Code docs [`code.claude.com/docs/en/mcp.md`](https://code.claude.com/docs/en/mcp.md) (cited as `CC-MCP`).
Registry versions are the `latest` dist-tag or newest tag on that date.

I also sent an unauthenticated MCP `initialize` (protocol `2025-06-18`) to each remote endpoint, then read
`/.well-known/oauth-protected-resource` and the authorization server's `/.well-known/oauth-authorization-server`, like
the previous note did. The goal was to confirm whether each endpoint needs auth and whether it supports Dynamic
Client Registration (DCR) or Client ID Metadata Documents (CIMD).

## Summary

- **Every vendor here except Terraform and Snyk's scanner has an official hosted (streamable HTTP) server.** Notion,
  Todoist, ClickUp, Miro, Mapbox (three servers) and Snyk Evo use OAuth with DCR, so a plain `type: http` entry works
  with `/mcp` and needs no `oauth.clientId`. DeepWiki needs no auth at all.
- **OAuth-only vendors:** Notion's hosted server ("Not yet" for non-interactive auth), ClickUp ("We only support
  OAuth") and Miro. For Notion and Todoist, the only token path is the vendor's **local** stdio server, so the `-token`
  twin is stdio. ClickUp and Miro get no token twin: the only token-based servers are community ones, and the ClickUp
  one is now paid.
- **Notion's local `@notionhq/notion-mcp-server` is officially unmaintained.** It is still published (`2.5.2`,
  2026-09-20), but the README and the Notion docs say "no longer actively maintained" and "We may sunset" it. The
  proposal is `notion` (hosted, OAuth) plus `notion-token` (local, flagged as unmaintained) as the only headless
  option.
- **Todoist renamed its package.** `@doist/todoist-ai` is deprecated on npm ("Package renamed to
  `@doist/todoist-mcp`"). Pin `@doist/todoist-mcp@13.3.1`.
- **Terraform has no HashiCorp-hosted endpoint.** The official server is `hashicorp/terraform-mcp-server` (Docker
  `1.3.0`). By default it only enables the public-registry toolset, so the HCP Terraform / Terraform Enterprise entry
  must pass `--toolsets=all` along with `TFE_TOKEN` and `TFE_ADDRESS` (`${TFE_ADDRESS:-https://app.terraform.io}` covers
  both cloud and TFE). An organization-run streamable-http deployment accepts `Authorization: Bearer <TFE token>`.
- **DeepWiki and Devin are two servers.** `mcp.deepwiki.com/mcp` is free, public-repos only, no auth. `mcp.devin.ai/mcp`
  is Devin's authenticated server (private repos plus session, playbook and knowledge tools), and it takes
  `Authorization: Bearer <cog_… key>`, plus `X-Org-Id` for enterprise keys and PATs. It has no OAuth.
- **Mapbox ships three hosted servers:** `mcp.mapbox.com` (geocoding, routing, maps), `mcp-devkit.mapbox.com` (styles,
  tokens, tilesets for developers) and `mcp-docs.mapbox.com` (docs, no token). The first two take OAuth (DCR) or
  `Authorization: Bearer <Mapbox access token>`, and the vendor documents both. The bare names use OAuth, because that
  is what the vendor's Claude Code instructions use.
- **Snyk's scanner MCP is part of the Snyk CLI** (`snyk mcp -t stdio`, npm `snyk@1.1307.4`, minimum `1.1298.0`). Auth is
  either the browser OAuth of `snyk auth` / the `snyk_auth` tool, or `SNYK_TOKEN`. Snyk also runs a separate hosted
  **Evo** MCP server (OAuth, DCR + CIMD) for its AI-security product, with regional hosts.

Endpoint probe results (2026-09-24, unauthenticated `initialize`):

| Endpoint | HTTP | Auth server | DCR | CIMD |
|---|---|---|---|---|
| `https://mcp.notion.com/mcp` | 401 | `https://mcp.notion.com` | yes (`/register`) | yes |
| `https://ai.todoist.net/mcp` | 401 | `https://todoist.com` | yes (`/oauth/register`) | yes |
| `https://mcp.clickup.com/mcp` | 401 | `https://mcp.clickup.com` | yes (`/oauth/register`) | no |
| `https://mcp.deepwiki.com/mcp` | 200 (`DeepWiki` 2.14.3) | none | – | – |
| `https://mcp.devin.ai/mcp` | 200 unauthenticated (same `DeepWiki` 2.14.3 server info); no OAuth metadata (404) | none (API key) | – | – |
| `https://mcp.mapbox.com/mcp` | 401 (`Invalid token` for a bogus Bearer) | `https://mcp.mapbox.com` | yes (`api.mapbox.com/oauth/register`) | no |
| `https://mcp-devkit.mapbox.com/mcp` | 401 | `https://mcp-devkit.mapbox.com` | yes (`api.mapbox.com/oauth/register`) | no |
| `https://mcp-docs.mapbox.com/mcp` | 200 (`Mapbox Documentation MCP Server` 0.3.1) | none | – | – |
| `https://mcp.miro.com/` | 401 | `https://mcp.miro.com/` | yes (`/register`) | no |
| `https://evo.snyk.io/mcp` | 401 | `https://evo.snyk.io/mcp` | yes (`/mcp/register`) | yes |

Scopes advertised in the protected-resource metadata: Notion `default`; Todoist `data:read_write`; ClickUp `read write`;
Mapbox `styles:tiles styles:read fonts:read datasets:read tokens:read`; Mapbox DevKit the same plus `styles:write
styles:list tilesets:read user-feedback:read`; Miro `boards:read boards:write openid email`; Evo `org.read`.

---

## 0. Claude Code semantics that shape the entries

These rules are unchanged from [the first note, §0](mcp-servers-catalog.md#0-claude-code-semantics-that-shape-the-entries).
The ones that matter here:

- An `Authorization` header disables the OAuth fallback. An unset `${VAR}` with no default is passed literally, with a
  warning ([`CC-MCP` L294, L647](https://code.claude.com/docs/en/mcp.md)). This is why a token and an OAuth variant
  need two names, and why an optional variable (such as Devin's `X-Org-Id`) becomes its own entry.
- In a remote server's `url`/`headers`, a fixed set of credential names reads as empty: Claude Code's own
  (`ANTHROPIC_*`), cloud-provider ones (`AWS_BEARER_TOKEN_BEDROCK`), `NPM_TOKEN` and `HTTPS_PROXY`
  ([`CC-MCP` "Credential variables that read as empty", L649-661](https://code.claude.com/docs/en/mcp.md)). The
  variables proposed here (`MAPBOX_ACCESS_TOKEN`, `DEVIN_API_KEY`, `TFE_TOKEN`) are not among the documented
  examples. The full list is not published, so see Unverified.
- `ap` rejects `env`/`headers` values whose key matches `/key|token|secret|password|auth|credential/i` unless the value
  contains `${`. `Authorization`, `NOTION_TOKEN`, `TODOIST_API_KEY`, `TFE_TOKEN` and `SNYK_TOKEN` all match, and every
  proposal uses `${…}` for them. `TFE_ADDRESS` and `X-Org-Id` do not match. `X-Org-Id` is still written as
  `${DEVIN_ORG_ID}`, because the value is per user.

## 1. Notion

- **Official hosted server (recommended):** "Notion MCP" at `https://mcp.notion.com/mcp` (streamable HTTP). The SSE
  fallback `https://mcp.notion.com/sse` is for clients without streamable HTTP
  ([get-started-with-mcp.md L306-307](https://developers.notion.com/guides/mcp/get-started-with-mcp.md)). The vendor's
  Claude Code command is `claude mcp add --transport http notion https://mcp.notion.com/mcp`, then `/mcp` to run
  the OAuth flow (L40-50). Notion also ships a Claude Code plugin,
  [`makenotion/claude-code-notion-plugin`](https://github.com/makenotion/claude-code-notion-plugin) (L61).
- **Auth:** OAuth only. The FAQ answers "Can I use Notion MCP without interactive authorization?" with "Not yet. Notion
  MCP currently requires you to complete the OAuth authorization flow" (L383-385). My probe found DCR and CIMD.
- **Older local server (official, but unmaintained):** [`makenotion/notion-mcp-server`](https://github.com/makenotion/notion-mcp-server/blob/730ae781ba28beeaf0865025a3f2ed4c25ea2387/README.md),
  npm [`@notionhq/notion-mcp-server`](https://www.npmjs.com/package/@notionhq/notion-mcp-server) `2.5.2`
  (2026-09-20). Its README says "This repository is a separate, self-hosted MCP server implementation that is **no
  longer actively maintained or supported**" and "We may sunset this local MCP server repository in the future"
  ([README L3-35](https://github.com/makenotion/notion-mcp-server/blob/730ae781ba28beeaf0865025a3f2ed4c25ea2387/README.md#L3-L35)).
  The docs say the same thing ([hosting-open-source-mcp.md L10](https://developers.notion.com/guides/mcp/hosting-open-source-mcp.md);
  [get-started FAQ L394-396](https://developers.notion.com/guides/mcp/get-started-with-mcp.md)). npm has **not**
  marked it deprecated.
  - Env: `NOTION_TOKEN` (recommended; an internal-integration secret, `ntn_…`), or `OPENAPI_MCP_HEADERS` (a JSON
    string with `Authorization` and `Notion-Version`) for advanced use
    ([README L138-167](https://github.com/makenotion/notion-mcp-server/blob/730ae781ba28beeaf0865025a3f2ed4c25ea2387/README.md#L138-L167)).
  - Pages must be shared with the integration first (L116-126). It has 22 tools on Notion API `2025-09-03`, plus
    Markdown page tools on `2026-03-11` (L45-98).
  - Docker image `mcp/notion` (L217-243). It lives in Docker's `mcp/` namespace and has only a `latest` tag, so it is
    not proposed.

```yaml
  notion:
    description: Notion's official hosted server (Notion MCP) for searching, reading and editing pages and databases; OAuth only.
    type: http
    url: https://mcp.notion.com/mcp

  notion-token:
    description: >-
      Notion's older local server, which Notion no longer maintains, for an integration token instead of OAuth (CI,
      headless); runs with npx and needs NOTION_TOKEN, and pages must be shared with the integration.
    command: npx
    args: [-y, '@notionhq/notion-mcp-server@2.5.2']
    env:
      NOTION_TOKEN: ${NOTION_TOKEN}
```

Rationale: the hosted server is the vendor's recommendation and the only one it supports. `notion-token` is the only
way to use Notion without a browser, but it is an unmaintained server with a different tool surface, so it may be
better left out (see Open questions).

## 2. Terraform (HashiCorp)

- **Official:** [`hashicorp/terraform-mcp-server`](https://github.com/hashicorp/terraform-mcp-server/blob/8e623ec0c78b1b48f4c04a1b91133dd87efe9e4f/README.md)
  (Go), latest release [`v1.3.0`](https://github.com/hashicorp/terraform-mcp-server/releases/tag/v1.3.0) (2026-08-26).
  The Docker Hub image is [`hashicorp/terraform-mcp-server:1.3.0`](https://hub.docker.com/r/hashicorp/terraform-mcp-server/tags)
  (digest `sha256:423a6b8e2ee0…`, same as `latest`). It is not on npm.
- **No hosted endpoint.** The HashiCorp docs cover only local deployment and your own remote deployment
  ([deploy/local](https://developer.hashicorp.com/terraform/mcp-server/deploy/local),
  [deploy/remote](https://developer.hashicorp.com/terraform/mcp-server/deploy/remote)). I found no
  HashiCorp-hosted URL.
- **Claude Code (vendor):** `claude mcp add terraform -s user -t stdio -- docker run -i --rm hashicorp/terraform-mcp-server`
  ([README L389-406](https://github.com/hashicorp/terraform-mcp-server/blob/8e623ec0c78b1b48f4c04a1b91133dd87efe9e4f/README.md#L389-L406)).
- **Env** ([README L99-134](https://github.com/hashicorp/terraform-mcp-server/blob/8e623ec0c78b1b48f4c04a1b91133dd87efe9e4f/README.md#L99-L134);
  [reference](https://developer.hashicorp.com/terraform/docs/tools/mcp-server/reference)):
  - `TFE_ADDRESS` (default `https://app.terraform.io`, protocol required) and `TFE_TOKEN` (default empty).
  - `TFE_SKIP_TLS_VERIFY`.
  - `ENABLE_TF_OPERATIONS` (default `false`). It gates destructive tools: `action_run`, `create_workspace`,
    `update_workspace`, `delete_workspace_safely`, and the `auto_approve` / `is_destroy` run types.
  - `TRANSPORT_MODE=streamable-http` and `TRANSPORT_HOST` / `TRANSPORT_PORT` for HTTP.
  - `MCP_ORGANIZATION_ALLOWLIST`.
- **Toolsets:** `registry`, `registry-private`, `terraform`, `all`, `default`
  ([README L638-650](https://github.com/hashicorp/terraform-mcp-server/blob/8e623ec0c78b1b48f4c04a1b91133dd87efe9e4f/README.md#L638-L650)).
  **The default is `registry` only** ([`pkg/toolsets/toolsets.go` L57-60](https://github.com/hashicorp/terraform-mcp-server/blob/8e623ec0c78b1b48f4c04a1b91133dd87efe9e4f/pkg/toolsets/toolsets.go#L57-L60)).
  So the HCP Terraform/TFE workspace, run and variable tools only appear with `--toolsets=terraform` or `all`. The
  flag goes after the image name, because the image's `ENTRYPOINT` is the binary
  ([Dockerfile L72](https://github.com/hashicorp/terraform-mcp-server/blob/8e623ec0c78b1b48f4c04a1b91133dd87efe9e4f/Dockerfile#L72);
  README L583).
- **Organization-run remote server:** in streamable-http mode, `TFE_ADDRESS` is server-side only. Clients send their
  token as `Authorization: Bearer <token>`, which takes precedence over a `TFE_TOKEN` header and over the server's env
  token. A token in the query string is rejected
  ([README L680-684](https://github.com/hashicorp/terraform-mcp-server/blob/8e623ec0c78b1b48f4c04a1b91133dd87efe9e4f/README.md#L680-L684);
  [`pkg/client/middleware.go` L305-330](https://github.com/hashicorp/terraform-mcp-server/blob/8e623ec0c78b1b48f4c04a1b91133dd87efe9e4f/pkg/client/middleware.go#L305-L330)).

```yaml
  terraform:
    description: >-
      HashiCorp's official local server for public Terraform Registry docs (providers, modules, Sentinel policies);
      runs in Docker and needs no credentials.
    command: docker
    args: [run, -i, --rm, hashicorp/terraform-mcp-server:1.3.0]

  terraform-cloud:
    description: >-
      HashiCorp's official local server with every toolset, for HCP Terraform or Terraform Enterprise workspaces, runs,
      variables and private registry; runs in Docker and needs TFE_TOKEN, plus TFE_ADDRESS for Terraform Enterprise
      (default https://app.terraform.io).
    command: docker
    args: [run, -i, --rm, -e, TFE_TOKEN, -e, TFE_ADDRESS, hashicorp/terraform-mcp-server:1.3.0, --toolsets=all]
    env:
      TFE_TOKEN: ${TFE_TOKEN}
      TFE_ADDRESS: ${TFE_ADDRESS:-https://app.terraform.io}

  terraform-remote:
    description: >-
      A Terraform MCP server your organization runs in streamable-http mode (HashiCorp hosts none); needs
      TERRAFORM_MCP_URL (e.g. https://terraform-mcp.example.com/mcp) and TFE_TOKEN, sent as a Bearer token.
    type: http
    url: ${TERRAFORM_MCP_URL}
    headers:
      Authorization: Bearer ${TFE_TOKEN}
```

Rationale: the registry toolset needs no secret, so `terraform` is useful to anyone writing HCL.
`terraform-cloud` covers both cloud and on-prem with one real default, and it has to widen the toolsets or the TFE
token would do nothing. `ENABLE_TF_OPERATIONS` keeps the vendor default (`false`, so destructive tools are off) and is
left to inline entries. `terraform-remote` is optional, and only useful where a platform team runs a shared server.

## 3. Todoist

- **Official:** [`Doist/todoist-mcp`](https://github.com/Doist/todoist-mcp/blob/0e9266ec0c2209be5a9d756d8246c71920b168eb/README.md),
  npm [`@doist/todoist-mcp`](https://www.npmjs.com/package/@doist/todoist-mcp) `13.3.1` (2026-09-21).
  **Deprecated:** [`@doist/todoist-ai`](https://www.npmjs.com/package/@doist/todoist-ai) `9.0.0` says "Package renamed
  to @doist/todoist-mcp. This 9.x release is a thin shim".
- **Hosted:** `https://ai.todoist.net/mcp`. The vendor's Claude Code command is
  `claude mcp add --transport http todoist https://ai.todoist.net/mcp`, then `/mcp`. There is also a plugin:
  `/plugin marketplace add doist/todoist-mcp`, `/plugin install todoist@doist`
  ([README L63-106](https://github.com/Doist/todoist-mcp/blob/0e9266ec0c2209be5a9d756d8246c71920b168eb/README.md#L63-L106)).
  Auth is OAuth. The probe found auth server `https://todoist.com` with DCR and CIMD. The docs mention no token header
  for the hosted server.
- **Local stdio:** `npx @doist/todoist-mcp` with `TODOIST_API_KEY` (required). `TODOIST_BASE_URL` is optional. The
  bin `todoist-mcp-http` is a local HTTP variant
  ([docs/mcp-server.md L7-13, L132-140](https://github.com/Doist/todoist-mcp/blob/0e9266ec0c2209be5a9d756d8246c71920b168eb/docs/mcp-server.md#L132-L140)).
  Todoist is SaaS-only, so there is no self-hosted variant.

```yaml
  todoist:
    description: Doist's official hosted Todoist server for tasks, projects, sections and comments; OAuth.
    type: http
    url: https://ai.todoist.net/mcp

  todoist-token:
    description: Doist's official local Todoist server with an API token instead of OAuth; runs with npx and needs TODOIST_API_KEY.
    command: npx
    args: [-y, '@doist/todoist-mcp@13.3.1']
    env:
      TODOIST_API_KEY: ${TODOIST_API_KEY}
```

Rationale: the bare name matches the vendor's Claude Code instructions. The token twin uses the vendor's own local
package (not community), under the new package name.

## 4. ClickUp

- **Official hosted:** `https://mcp.clickup.com/mcp`, **public beta**, available on all plans
  ([connect-an-ai-assistant-to-clickups-mcp-server.md L14-23](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server.md)).
  The vendor's Claude Code command is `claude mcp add --transport http clickup https://mcp.clickup.com/mcp`, then `/mcp`
  ([setup L50-54](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server-1.md)).
- **Auth:** "you cannot authenticate using your own API keys or Auth access tokens. We only support OAuth"
  ([FAQ L85-87](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server.md)). The probe
  found DCR at `/oauth/register` and no CIMD. The Workspace is picked on the OAuth consent screen (setup L160-164), so
  no workspace ID goes in the config. In Team, Enterprise and Edu workspaces, only owners and admins can configure MCP
  servers (setup L149). This note appears in a client-specific section, so whether it applies to Claude Code is
  unclear.
- **Rate limits:** without the Everything AI add-on, the Free plan gets 50 calls per 24 h and Unlimited+ gets 300
  calls per 24 h. With the add-on, the limits are the same as the public API (L60-67).
- **Community, not proposed:** [`taazkareem/clickup-mcp-server`](https://github.com/taazkareem/clickup-mcp-server/blob/9a995a789878e5e785bfbbb0f7a5d92c7e9917e9/README.md)
  (npm `@taazkareem/clickup-mcp-server` `0.14.5`) takes `CLICKUP_API_KEY` and `CLICKUP_TEAM_ID`, but it "transitioned
  from open-source to a paid model" and needs `CLICKUP_MCP_LICENSE_KEY`
  ([README L96-103, L171-176](https://github.com/taazkareem/clickup-mcp-server/blob/9a995a789878e5e785bfbbb0f7a5d92c7e9917e9/README.md#L96-L103)).

```yaml
  clickup:
    description: ClickUp's official hosted server (public beta) for tasks, lists, docs and time tracking; OAuth only, workspace chosen at sign-in.
    type: http
    url: https://mcp.clickup.com/mcp
```

Rationale: this is the only first-party option, and it supports OAuth only. There is no free, maintained token-based
alternative to use as a `-token` twin.

## 5. DeepWiki / Devin (Cognition)

- **DeepWiki MCP (official):** "a free, remote, no-authentication-required service that provides access to public
  repositories". The URL is `https://mcp.deepwiki.com/mcp`, and `/sse` is legacy and being deprecated. It has three
  tools: `read_wiki_structure`, `read_wiki_contents` and `ask_question`. The vendor's Claude Code command is
  `claude mcp add -s user -t http deepwiki https://mcp.deepwiki.com/mcp`
  ([deepwiki-mcp.md L17-80](https://docs.devin.ai/work-with-devin/deepwiki-mcp.md)). The probe returned 200 with no
  auth. Private repos need the Devin MCP (L90-92).
- **Devin MCP (official):** `https://mcp.devin.ai/mcp`, authenticated. It covers public and private repos, plus
  session, playbook, knowledge and schedule tools. `/sse` is deprecated
  ([devin-mcp.md L21-31, L126-135](https://docs.devin.ai/work-with-devin/devin-mcp.md)).
  - Auth is `Authorization: Bearer <cog_… key>`. An org-scoped service-user key needs nothing else. An enterprise
    service-user key or a PAT also needs `X-Org-Id: <org id>`. Legacy `apk_` keys are not supported (L33-60). The
    vendor's Claude Code command is `claude mcp add -s user -t http devin https://mcp.devin.ai/mcp -H "Authorization: Bearer <API_KEY>"`
    (L180-183).
  - It has no OAuth: every `/.well-known/oauth-*` path returns 404. Without a key it still answers `initialize`
    (probe) with the DeepWiki server info.
  - Devin's docs call the variables `$DEVIN_API_KEY` and `$DEVIN_ORG_ID` throughout
    ([llms-full.txt](https://docs.devin.ai/llms-full.txt)).
- **Community, not proposed:** npm [`mcp-deepwiki`](https://www.npmjs.com/package/mcp-deepwiki) `0.0.10`
  (regenrek, last published 2025-05-14), a scraper.

```yaml
  deepwiki:
    description: Cognition's official hosted DeepWiki server for reading and asking about generated docs of public GitHub repositories; no auth.
    type: http
    url: https://mcp.deepwiki.com/mcp

  devin:
    description: >-
      Cognition's official hosted Devin server: DeepWiki for private and public repositories plus Devin sessions,
      playbooks, knowledge and schedules; needs DEVIN_API_KEY (an org-scoped service user key, cog_…).
    type: http
    url: https://mcp.devin.ai/mcp
    headers:
      Authorization: Bearer ${DEVIN_API_KEY}

  devin-enterprise:
    description: >-
      Cognition's official hosted Devin server for an enterprise service user key or personal access token, which must
      name the organization; needs DEVIN_API_KEY and DEVIN_ORG_ID.
    type: http
    url: https://mcp.devin.ai/mcp
    headers:
      Authorization: Bearer ${DEVIN_API_KEY}
      X-Org-Id: ${DEVIN_ORG_ID}
```

Rationale: `deepwiki` is zero-config and the one most users want. `devin` and `devin-enterprise` are split because
`X-Org-Id` is optional, and the catalog does not use `${VAR:-}` empty defaults.

## 6. Mapbox

Mapbox publishes three first-party servers, all with hosted endpoints and npm packages. Mapbox is SaaS-only, so there
are no self-hosted variants.

- **Mapbox MCP server** (geocoding, POI search, directions, isochrones, matrix, static maps, offline geo maths):
  [`mapbox/mcp-server`](https://github.com/mapbox/mcp-server/blob/cd84fbd5d03f38e255e5e1f0f9438d1f99ce4137/README.md),
  npm [`@mapbox/mcp-server`](https://www.npmjs.com/package/@mapbox/mcp-server) `0.14.0`. Hosted at
  `https://mcp.mapbox.com/mcp`. "A Mapbox access token is required"
  ([README L28-36](https://github.com/mapbox/mcp-server/blob/cd84fbd5d03f38e255e5e1f0f9438d1f99ce4137/README.md#L28-L36)).
  - The vendor's Claude Code command is `claude mcp add --transport http mapbox-mcp-production https://mcp.mapbox.com/mcp`,
    then `/mcp` (OAuth)
    ([hosted-mcp-guide.md L15-26](https://github.com/mapbox/mcp-server/blob/cd84fbd5d03f38e255e5e1f0f9438d1f99ce4137/docs/hosted-mcp-guide.md#L15-L26)).
  - The same endpoint accepts `authorization: Bearer <Mapbox access token>` for programmatic use
    ([L110-115, L137-170](https://github.com/mapbox/mcp-server/blob/cd84fbd5d03f38e255e5e1f0f9438d1f99ce4137/docs/hosted-mcp-guide.md#L137-L170)).
    The probe confirmed a Bearer is validated: a bogus one gets `Invalid token`.
  - Local stdio is `npx -y @mapbox/mcp-server` with `MAPBOX_ACCESS_TOKEN`
    ([claude-desktop-setup.md](https://github.com/mapbox/mcp-server/blob/cd84fbd5d03f38e255e5e1f0f9438d1f99ce4137/docs/claude-desktop-setup.md)).
- **Mapbox DevKit MCP server** (style building and editing, token management, tilesets, feedback, GeoJSON preview):
  [`mapbox/mcp-devkit-server`](https://github.com/mapbox/mcp-devkit-server/blob/487f599e61a6d2f95257bdb24611bde8815b9f85/README.md),
  npm [`@mapbox/mcp-devkit-server`](https://www.npmjs.com/package/@mapbox/mcp-devkit-server) `0.8.2`. Hosted at
  `https://mcp-devkit.mapbox.com/mcp`, and the README says to follow the same hosted guide with this URL. It needs
  `MAPBOX_ACCESS_TOKEN`, and each tool needs specific token scopes (`styles:write`, `tokens:write`, …)
  ([README L91-116](https://github.com/mapbox/mcp-devkit-server/blob/487f599e61a6d2f95257bdb24611bde8815b9f85/README.md#L91-L116)).
  `ENABLE_MCP_UI` is an optional toggle (L1231-1262).
- **Mapbox docs server:** [`mapbox/mcp-docs-server`](https://github.com/mapbox/mcp-docs-server/blob/d1f32cc42db23183a91d4c516462022e08976fc2/README.md),
  npm `@mapbox/mcp-docs-server` `0.3.1`. Hosted at `https://mcp-docs.mapbox.com/mcp`, "no Mapbox access token
  required" ([README L3-30](https://github.com/mapbox/mcp-docs-server/blob/d1f32cc42db23183a91d4c516462022e08976fc2/README.md#L3-L30)).
  The DevKit README points to it for docs access (L5).

```yaml
  mapbox:
    description: Mapbox's official hosted server for geocoding, POI search, directions, isochrones and static maps; OAuth.
    type: http
    url: https://mcp.mapbox.com/mcp

  mapbox-token:
    description: Mapbox's official hosted server with an access token instead of OAuth; needs MAPBOX_ACCESS_TOKEN.
    type: http
    url: https://mcp.mapbox.com/mcp
    headers:
      Authorization: Bearer ${MAPBOX_ACCESS_TOKEN}

  mapbox-devkit:
    description: Mapbox's official hosted DevKit server for building styles, managing tokens and tilesets, and previewing GeoJSON; OAuth.
    type: http
    url: https://mcp-devkit.mapbox.com/mcp

  mapbox-devkit-token:
    description: >-
      Mapbox's official hosted DevKit server with an access token instead of OAuth; needs MAPBOX_ACCESS_TOKEN with the
      scopes each tool requires (e.g. styles:write, tokens:write).
    type: http
    url: https://mcp-devkit.mapbox.com/mcp
    headers:
      Authorization: Bearer ${MAPBOX_ACCESS_TOKEN}

  mapbox-docs:
    description: Mapbox's official hosted server for Mapbox documentation, guides and API references; no auth.
    type: http
    url: https://mcp-docs.mapbox.com/mcp
```

Rationale: the vendor's Claude Code path is hosted plus OAuth, so that is the bare name. The token twin is documented
by the vendor on the same URL, which is better than a stdio twin because it needs no Node and no pin. OAuth consent
grants only the scopes the server asks for. The DevKit OAuth scopes include `styles:write` but not `tokens:write`, so
token-management writes may need the `-token` variant (unverified).

## 7. Snyk

- **Official (scanner):** the MCP server is built into the Snyk CLI as `snyk mcp`
  ([`snyk/studio-mcp` README](https://github.com/snyk/studio-mcp/blob/f9756fa80e8a6426cb2efd66ffa49b7652173ee8/README.md)).
  npm [`snyk`](https://www.npmjs.com/package/snyk) `1.1307.4` (2026-09-23) is a wrapper that bootstraps the CLI binary
  (`postinstall: node wrapper_dist/bootstrap.js exec`). The minimum CLI version is `1.1298.0`
  ([troubleshooting L9-13](https://docs.snyk.io/agent-security/agentic-security-with-snyk-studio/troubleshooting.md)).
  - Tools: `snyk_code_scan`, `snyk_sca_scan`, `snyk_iac_scan`, `snyk_container_scan`, `snyk_sbom_scan`,
    `snyk_aibom`, `snyk_package_health_check`, `snyk_trust`, `snyk_auth`, `snyk_logout`, `snyk_version` and
    `snyk_send_feedback`.
  - `snyk_sca_scan` may run Gradle, Maven and other build tools locally.
- **Claude Code (vendor):**
  - Snyk suggests `npx -y snyk@latest mcp configure --tool=claude-cli`, which also writes rules and hooks.
  - The manual config is `{"type":"stdio","command":"npx","args":["-y","snyk@latest","mcp","-t","stdio"]}`.
  - An SSE mode also exists: `snyk mcp -t sse`, then `claude mcp add --transport sse snyk http://127.0.0.1:7695/sse`.
  - Sources: [claude-code-guide.md L19-23, L95-153](https://docs.snyk.io/agent-security/agentic-security-with-snyk-studio/quickstart-guides/claude-code-guide.md).
- **Auth:**
  - One-time: authenticate with Snyk, and trust the project folder (L170-172). The CLI supports OAuth 2.0 (browser)
    or a PAT/API token ([authenticate-to-use-the-cli.md L13-14, L97-112](https://docs.snyk.io/developer-tools/snyk-cli/authenticate-to-use-the-cli.md)).
  - For the MCP server, Snyk documents `SNYK_TOKEN=<TOKEN>` in the environment
    ([troubleshooting L39](https://docs.snyk.io/agent-security/agentic-security-with-snyk-studio/troubleshooting.md)).
  - The org comes from `snyk config set org=…` or `SNYK_CFG_ORG` (L43-50).
  - Folder trust can be skipped with `--disable-trust` (L64).
- **Regions:** non-default tenants (`SNYK-US-02`, `SNYK-EU-01`, `SNYK-AU-01`, `SNYK-GOV-01`) run
  `snyk config environment <name>` once, before `snyk auth`. That setting persists in the CLI config
  ([config-environment.md L9, L39-44](https://docs.snyk.io/developer-tools/snyk-cli/commands/config-environment.md)).
  The CLI also reads `SNYK_API` from the environment
  ([go-application-framework `constants.go`](https://github.com/snyk/go-application-framework/blob/5431644e3204877f6f177c0f1aad7077f33e5a57/pkg/configuration/constants.go)).
  That variable is not documented for MCP, so it is not used here.
- **Profiles:** `--profile=lite|full|experimental` or `SNYK_MCP_PROFILE`. The default is `full`
  ([getting-started-with-snyk-studio.md L105-144](https://docs.snyk.io/agent-security/agentic-security-with-snyk-studio/getting-started-with-snyk-studio.md)).
- **Evo MCP (official, hosted, separate product):** for Evo (Snyk's AI-security product) tenants: AI inventory, risk,
  policy and issue data. It is non-destructive only.
  - Endpoints: `https://evo.snyk.io/mcp` (SNYK-US-01, the default), `evo.us.snyk.io`, `evo.au.snyk.io` and
    `evo.eu.snyk.io`.
  - Auth is OAuth. The vendor's Claude Code commands are `claude mcp add --scope user --transport http evo https://evo.snyk.io/mcp/`
    and `claude mcp login evo`
    ([evo-mcp-server.md L5-62](https://docs.snyk.io/agent-security/evo-by-snyk/platform-surfaces/evo-mcp-server.md)).
  - The probe found DCR and CIMD.

```yaml
  snyk:
    description: >-
      Snyk's official local server built into the Snyk CLI, for code, open-source, IaC, container and secret scans; runs
      with npx, and you sign in once through its snyk_auth tool or `snyk auth` (browser OAuth).
    command: npx
    args: [-y, snyk@1.1307.4, mcp, -t, stdio]

  snyk-token:
    description: Snyk's official local server built into the Snyk CLI, authenticated with an API token or PAT instead of browser sign-in; runs with npx and needs SNYK_TOKEN.
    command: npx
    args: [-y, snyk@1.1307.4, mcp, -t, stdio]
    env:
      SNYK_TOKEN: ${SNYK_TOKEN}

  snyk-evo:
    description: >-
      Snyk's official hosted Evo server for the AI inventory, risk, policy and issue data of an Evo tenant; OAuth. For
      other regions set SNYK_EVO_HOST (e.g. evo.eu.snyk.io).
    type: http
    url: https://${SNYK_EVO_HOST:-evo.snyk.io}/mcp
```

Rationale: the vendor's manual Claude Code config is exactly the `snyk` entry, with `@latest` replaced by a pin. Stored
CLI credentials (OAuth) are the vendor's default. `SNYK_TOKEN` must be a separate entry, because an unset `${SNYK_TOKEN}`
would be passed on literally. Regions are handled by the persisted `snyk config environment`, so they need no entry.
`snyk-evo` is optional: it is only useful to Evo customers.

## 8. Miro

- **Official hosted:** `https://mcp.miro.com/`. It is available on all Miro plans, including free
  ([miro-mcp.md](https://developers.miro.com/docs/miro-mcp.md), updated 2026-09-01). The vendor repo is
  [`miroapp/miro-ai`](https://github.com/miroapp/miro-ai/blob/b6408e1bdfe0c842f209d40b52e92caf118a4d39/README.md).
  - The recommended Claude Code path is the plugin: `/plugin marketplace add miroapp/miro-ai`, then
    `/plugin install miro@miro-ai`. Other clients use `{"url":"https://mcp.miro.com/"}`
    ([README L44-54, L106-125](https://github.com/miroapp/miro-ai/blob/b6408e1bdfe0c842f209d40b52e92caf118a4d39/README.md#L44-L125)).
  - The plugin's own [`.mcp.json`](https://github.com/miroapp/miro-ai/blob/b6408e1bdfe0c842f209d40b52e92caf118a4d39/claude-plugins/miro/.mcp.json)
    is `{"type":"http","url":"https://mcp.miro.com/","headers":{"X-AI-Source":"claude-code-plugin"}}`. The header is a
    source tag, not auth.
  - Don't run both the plugin and a manual entry: each one opens its own OAuth session and duplicates the tools
    ([README L158-160](https://github.com/miroapp/miro-ai/blob/b6408e1bdfe0c842f209d40b52e92caf118a4d39/README.md#L158-L160)).
- **Auth:** OAuth 2.1. Access is team-scoped: "You can only access boards from the team you selected during OAuth"
  ([mcp-setup.md L105-114](https://github.com/miroapp/miro-ai/blob/b6408e1bdfe0c842f209d40b52e92caf118a4d39/docs/getting-started/mcp-setup.md#L105-L114)).
  The probe found DCR and no CIMD. On Enterprise, an admin must enable MCP and select teams
  ([FAQ L173-180](https://developers.miro.com/docs/miro-mcp-server-faq-and-troubleshooting.md)). I found no
  documented token or header auth.
- **Community, not proposed:** [`k-jarzyna/mcp-miro`](https://github.com/k-jarzyna/mcp-miro) (npm
  `@k-jarzyna/mcp-miro` `1.0.11`, 66 stars) with `MIRO_ACCESS_TOKEN`.

```yaml
  miro:
    description: Miro's official hosted server for reading and creating board content (diagrams, docs, tables); OAuth, limited to the team chosen at sign-in.
    type: http
    url: https://mcp.miro.com/
```

Rationale: this is the vendor's only server, and it supports OAuth only. The `X-AI-Source` header is left out,
because it labels traffic from the Miro plugin and this entry is not that plugin.

---

## Proposed additions to `packages/presets/mcp-servers.yaml` (append under `servers:`)

I checked names against the current catalog (`jina` … `confluence-dc`), and none clash. Mapbox, Todoist, Notion, Miro
and Snyk Evo all publish their own Claude Code plugins with an MCP server. ADR 0006 warns (and does not block) when a
catalog name matches an enabled plugin's server name. So a user who installs both the `miro` plugin and the catalog
`miro` entry gets a warning and duplicate tools.

```yaml
  # --- Notion ----------------------------------------------------------------------
  notion:
    description: Notion's official hosted server (Notion MCP) for searching, reading and editing pages and databases; OAuth only.
    type: http
    url: https://mcp.notion.com/mcp

  notion-token:
    description: >-
      Notion's older local server, which Notion no longer maintains, for an integration token instead of OAuth (CI,
      headless); runs with npx and needs NOTION_TOKEN, and pages must be shared with the integration.
    command: npx
    args: [-y, '@notionhq/notion-mcp-server@2.5.2']
    env:
      NOTION_TOKEN: ${NOTION_TOKEN}

  # --- Terraform (HashiCorp has no hosted server) -----------------------------------
  terraform:
    description: >-
      HashiCorp's official local server for public Terraform Registry docs (providers, modules, Sentinel policies);
      runs in Docker and needs no credentials.
    command: docker
    args: [run, -i, --rm, hashicorp/terraform-mcp-server:1.3.0]

  terraform-cloud:
    description: >-
      HashiCorp's official local server with every toolset, for HCP Terraform or Terraform Enterprise workspaces, runs,
      variables and private registry; runs in Docker and needs TFE_TOKEN, plus TFE_ADDRESS for Terraform Enterprise
      (default https://app.terraform.io).
    command: docker
    args: [run, -i, --rm, -e, TFE_TOKEN, -e, TFE_ADDRESS, hashicorp/terraform-mcp-server:1.3.0, --toolsets=all]
    env:
      TFE_TOKEN: ${TFE_TOKEN}
      TFE_ADDRESS: ${TFE_ADDRESS:-https://app.terraform.io}

  terraform-remote:
    description: >-
      A Terraform MCP server your organization runs in streamable-http mode (HashiCorp hosts none); needs
      TERRAFORM_MCP_URL (e.g. https://terraform-mcp.example.com/mcp) and TFE_TOKEN, sent as a Bearer token.
    type: http
    url: ${TERRAFORM_MCP_URL}
    headers:
      Authorization: Bearer ${TFE_TOKEN}

  # --- Task and project management -------------------------------------------------
  todoist:
    description: Doist's official hosted Todoist server for tasks, projects, sections and comments; OAuth.
    type: http
    url: https://ai.todoist.net/mcp

  todoist-token:
    description: Doist's official local Todoist server with an API token instead of OAuth; runs with npx and needs TODOIST_API_KEY.
    command: npx
    args: [-y, '@doist/todoist-mcp@13.3.1']
    env:
      TODOIST_API_KEY: ${TODOIST_API_KEY}

  clickup:
    description: ClickUp's official hosted server (public beta) for tasks, lists, docs and time tracking; OAuth only, workspace chosen at sign-in.
    type: http
    url: https://mcp.clickup.com/mcp

  miro:
    description: Miro's official hosted server for reading and creating board content (diagrams, docs, tables); OAuth, limited to the team chosen at sign-in.
    type: http
    url: https://mcp.miro.com/

  # --- DeepWiki / Devin (Cognition) ------------------------------------------------
  deepwiki:
    description: Cognition's official hosted DeepWiki server for reading and asking about generated docs of public GitHub repositories; no auth.
    type: http
    url: https://mcp.deepwiki.com/mcp

  devin:
    description: >-
      Cognition's official hosted Devin server: DeepWiki for private and public repositories plus Devin sessions,
      playbooks, knowledge and schedules; needs DEVIN_API_KEY (an org-scoped service user key, cog_…).
    type: http
    url: https://mcp.devin.ai/mcp
    headers:
      Authorization: Bearer ${DEVIN_API_KEY}

  devin-enterprise:
    description: >-
      Cognition's official hosted Devin server for an enterprise service user key or personal access token, which must
      name the organization; needs DEVIN_API_KEY and DEVIN_ORG_ID.
    type: http
    url: https://mcp.devin.ai/mcp
    headers:
      Authorization: Bearer ${DEVIN_API_KEY}
      X-Org-Id: ${DEVIN_ORG_ID}

  # --- Mapbox ----------------------------------------------------------------------
  mapbox:
    description: Mapbox's official hosted server for geocoding, POI search, directions, isochrones and static maps; OAuth.
    type: http
    url: https://mcp.mapbox.com/mcp

  mapbox-token:
    description: Mapbox's official hosted server with an access token instead of OAuth; needs MAPBOX_ACCESS_TOKEN.
    type: http
    url: https://mcp.mapbox.com/mcp
    headers:
      Authorization: Bearer ${MAPBOX_ACCESS_TOKEN}

  mapbox-devkit:
    description: Mapbox's official hosted DevKit server for building styles, managing tokens and tilesets, and previewing GeoJSON; OAuth.
    type: http
    url: https://mcp-devkit.mapbox.com/mcp

  mapbox-devkit-token:
    description: >-
      Mapbox's official hosted DevKit server with an access token instead of OAuth; needs MAPBOX_ACCESS_TOKEN with the
      scopes each tool requires (e.g. styles:write, tokens:write).
    type: http
    url: https://mcp-devkit.mapbox.com/mcp
    headers:
      Authorization: Bearer ${MAPBOX_ACCESS_TOKEN}

  mapbox-docs:
    description: Mapbox's official hosted server for Mapbox documentation, guides and API references; no auth.
    type: http
    url: https://mcp-docs.mapbox.com/mcp

  # --- Snyk ------------------------------------------------------------------------
  snyk:
    description: >-
      Snyk's official local server built into the Snyk CLI, for code, open-source, IaC, container and secret scans; runs
      with npx, and you sign in once through its snyk_auth tool or `snyk auth` (browser OAuth).
    command: npx
    args: [-y, snyk@1.1307.4, mcp, -t, stdio]

  snyk-token:
    description: Snyk's official local server built into the Snyk CLI, authenticated with an API token or PAT instead of browser sign-in; runs with npx and needs SNYK_TOKEN.
    command: npx
    args: [-y, snyk@1.1307.4, mcp, -t, stdio]
    env:
      SNYK_TOKEN: ${SNYK_TOKEN}

  snyk-evo:
    description: >-
      Snyk's official hosted Evo server for the AI inventory, risk, policy and issue data of an Evo tenant; OAuth. For
      other regions set SNYK_EVO_HOST (e.g. evo.eu.snyk.io).
    type: http
    url: https://${SNYK_EVO_HOST:-evo.snyk.io}/mcp
```

Pins to refresh later: `@notionhq/notion-mcp-server@2.5.2`, `hashicorp/terraform-mcp-server:1.3.0`,
`@doist/todoist-mcp@13.3.1` and `snyk@1.1307.4`.

## Open questions

1. **`notion-token`: ship it or not?** It is the only headless Notion path, but Notion calls the server unmaintained
   and may sunset it. It also has a different, API-shaped tool set, and it needs pages shared with an integration.
   Options: ship it with the warning in `description` (proposed), or leave it out until Notion adds non-interactive
   auth to the hosted server.
2. **Terraform names and scope.** Is `terraform-cloud` the right name for an entry that also covers Terraform
   Enterprise, or should it be `hcp-terraform`? Should `terraform-remote` (an org-run shared server) be in the catalog
   at all, or stay inline-only? Should `terraform-cloud` set `ENABLE_TF_OPERATIONS=true`? The vendor default is off,
   which hides `action_run`, workspace create/update/delete, and the `auto_approve` / `is_destroy` run types. The
   "no read-only defaults" decision could be read as "turn it on".
3. **Devin split.** `devin` plus `devin-enterprise` (extra `X-Org-Id`) follows the no-empty-default rule. Is a second
   name worth it, or should `devin-enterprise` be left to inline?
4. **Mapbox breadth.** Ship all five entries, or only `mapbox` + `mapbox-token` + `mapbox-docs`? The DevKit server is
   aimed at map-style developers.
5. **Snyk Evo.** `snyk-evo` only helps Evo tenants, and its tool surface is unrelated to code scanning. Include it or
   skip it? Should `snyk` use `--profile=lite` to save tokens? The vendor default is `full`, and this note keeps it.
6. **Snyk regions for `snyk-token`.** Headless (CI) users on a non-US tenant have no persisted
   `snyk config environment`. Should `snyk-token` add `SNYK_API: ${SNYK_API:-https://api.snyk.io}`? The catch is that
   the env var would override a region a developer has already set with `snyk config environment`. This note leaves it
   out.
7. **Vendor plugins vs catalog entries.** Notion, Todoist, Miro and Mapbox (via skills) push their Claude Code
   plugins, and Snyk pushes `snyk mcp configure`, which also installs rules and hooks. Should the catalog entries stay,
   given the plugin name clash warning in ADR 0006 and the duplicate-OAuth-session warning from Miro?

## Unverified / could not confirm

- **Whether ClickUp's and Miro's DCR accept Claude Code's loopback redirect URI.** I did not register a client, so I
  did not complete an OAuth flow for any of the new servers. The vendors' own Claude Code instructions (ClickUp,
  Notion, Todoist, Mapbox, Snyk Evo) imply it works. Miro documents Claude Code only through its plugin.
- **Whether `https://ai.todoist.net/mcp` accepts a Todoist API token as `Bearer`.** It is not documented, and I had no
  token to test with. If it does, `todoist-token` could become a hosted header entry.
- **Whether `https://mcp.devin.ai/mcp` without a key serves only public DeepWiki tools.** It answered `initialize`
  unauthenticated with the DeepWiki server info. I did not list its tools.
- **Whether `TFE_TOKEN`, `MAPBOX_ACCESS_TOKEN` or `DEVIN_API_KEY` are in Claude Code's "read as empty" credential
  set.** The docs give only examples, not the full list.
- **The ClickUp note "only owners and admins can configure MCP servers".** It appears under a client-specific section.
  I could not tell whether it restricts OAuth consent in general.
- **Whether the Mapbox DevKit OAuth grant is enough for token-management tools.** The advertised scopes include
  `tokens:read` but not `tokens:write`.
- **Snyk: the `SNYK_API` environment variable for MCP.** It is confirmed only in `go-application-framework` source,
  not in Snyk's MCP docs.
- **Whether npm `snyk@1.1307.4` downloads its binary on first `npx` run in every environment** (for example, behind a
  proxy). The wrapper's `postinstall` bootstraps it.
- **HashiCorp docs inconsistency.** The local-deploy page mentions `TFE_HOSTNAME` for Terraform Enterprise, while the
  README, the reference page and the source (`pkg/client/tfe_client.go`) use `TFE_ADDRESS`. The proposal follows the
  source.
