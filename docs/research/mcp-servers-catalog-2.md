# Research: more MCP servers for the bundled catalog (`packages/presets/mcp-servers.yaml`)

Goal: choose catalog entries for Apify, n8n, PostgreSQL, Supabase, Vercel, Netlify, AWS, Figma, Exa, Oracle Cloud (OCI),
Chrome DevTools, Sequential Thinking, Kubernetes, Sentry and MarkItDown. This note follows
[`mcp-servers-catalog.md`](mcp-servers-catalog.md). It uses the same method and the conventions recorded in that note's
"Decisions (2026-09-24)" section:

- The bare name uses the auth style the vendor recommends. Twins `<name>-oauth` / `<name>-token` cover the other style.
- Cloud and self-hosted variants are both catalogued where they exist.
- Optional variables never get empty `${VAR:-}` defaults. Entries are split instead.
- No read-only defaults.
- stdio packages and images use exact pins.
- Secrets are written only as `${VAR}`.
- Names are kebab-case.

Entries must fit `McpCatalog` ([`mcp-catalog.schema.json`](../../packages/schemas/schemas/mcp-catalog.schema.json) →
`preset.schema.json#/$defs/mcpServer`, which now includes `oauth` and `headersHelper`) and
[ADR 0006](../adr/0006-mcp-servers-inline-plus-bundled-catalog.md).

Sources checked on **2026-09-24**. Only primary sources are used:
- vendor docs and repos;
- the npm, PyPI, GHCR and Docker Hub registries;
- `modelcontextprotocol/servers` and `servers-archived`;
- the Claude Code docs [`code.claude.com/docs/en/mcp.md`](https://code.claude.com/docs/en/mcp.md) (cited as `CC-MCP`).

GitHub links are pinned to the default-branch commit on that date. Registry versions are the `latest` dist-tag or
PyPI's latest release on that date, re-checked at the end of the session. Endpoints were probed the same way as in the
previous note: an unauthenticated MCP `initialize`, then `/.well-known/oauth-protected-resource` and the authorization
server metadata, looking for `registration_endpoint` (DCR) and `client_id_metadata_document_supported` (CIMD).

Pinned commits:

| Repo | Commit |
|---|---|
| `apify/apify-mcp-server` | `610ab163c79c107ea218d2201deacd80b3033d43` |
| `exa-labs/exa-mcp-server` | `f3d71fb6b0ff4b4683f108f05bc2bae61a9f7e97` |
| `figma/mcp-server-guide` | `172920731eedf414e9b22ae60017d9a5b6c9f81f` |
| `GLips/Figma-Context-MCP` | `c083d65c7e002923e7cb98f4e3bdafb105e90f6d` |
| `n8n-io/n8n` | `bd2efe1c9e5a98624cc370b342d853d6fbc04167` |
| `n8n-io/n8n-docs` | `ad5d6fd8a52bdc2266e24007493c322c673b191f` |
| `czlonkowski/n8n-mcp` | `4cc0efda76f272e3b0816f215399f21599c29d34` |
| `modelcontextprotocol/servers` | `f46d9578190b476b3501923ea8977d899e8db2cb` |
| `modelcontextprotocol/servers-archived` | `9be4674d1ddf8c469e6461a27a337eeb65f76c2e` |
| `bytebase/dbhub` | `7b9c63b0376b5d9fd998674c025e833d8ba07d0b` |
| `crystaldba/postgres-mcp` | `15c8e33353546148acc2d8bd784551cf3905d1e2` |
| `googleapis/genai-toolbox` | `83ba8390655eda5a59e021369c921fe88a6d602a` |
| `supabase-community/supabase-mcp` | `4cc6660f656673eb83f3b80b0c3ae7030b3d2772` |
| `netlify/netlify-mcp` | `cebe0ee081d7f00f68ff6bbad296f169ab190fd6` |
| `awslabs/mcp` | `3e0418ff99c5201bec6df4883729fd9f09b856b9` |
| `aws/mcp-proxy-for-aws` | `14ec70c79c3b881f7b726cd9639c8eb99df43b96` |
| `oracle/mcp` | `1f1c05c2312ef008a6c9d61f724791c276a2c793` |
| `containers/kubernetes-mcp-server` | main `966b9936b4f520fe91ff760adcfc425bb56d3aef`, tag `v0.0.67` `fcd9bbe672c98bb81c2ce93da8c0add548023672` |
| `Flux159/mcp-server-kubernetes` | `0340ab61e39f3767d32f86610cbd0672c5656892` |
| `ChromeDevTools/chrome-devtools-mcp` | `6a7e51fecaaefbea46b89e68892d42c175ee9163` |
| `getsentry/sentry-mcp` | `2d36483e0abe1069b0378938d39f4c4d2b4e5389` |
| `microsoft/markitdown` | `b8f79c57ebc0044be41323d89b2a45d3fda8460e` |

## Summary

- **Remote with OAuth + DCR is the vendor default for most of these servers.** That covers Apify, Supabase, Vercel,
  Netlify, Figma, Sentry, Exa, n8n (instance-level) and the AWS MCP Server. They need no secret in the catalog, only
  `/mcp` or `claude mcp login <name>` after sync. **Vercel and Figma allowlist their OAuth clients.** Claude Code is on
  both allowlists, so a plain URL entry works, but there is no token path for either of them.
- **Two endpoints answer `initialize` with `200` when unauthenticated, so Claude Code never starts OAuth on them.**
  - **Exa**: the keyless tier. Exa documents `?login` (or `/mcp/oauth`) to force sign-in, so the OAuth entry uses that URL.
  - **AWS MCP Server**: docs tools work without auth. AWS lists Claude Code as supported with the plain URL and documents
    `?oauth=initialize` for clients that need it. Whether the plain URL triggers login is unverified (see open questions).
- **Token headers are not always `Authorization: Bearer`.**
  - Sentry uses `Authorization: Sentry-Bearer <token>`, because plain `Bearer` is reserved for its own OAuth tokens.
  - Exa's documented header is `x-api-key`.
  - The others use `Authorization: Bearer ${VAR}`: Apify, Supabase, n8n, and Netlify (source only, undocumented).
- **stdio only, no remote server:** Chrome DevTools, Sequential Thinking, Kubernetes, MarkItDown and OCI. Postgres is
  local too.
- **AWS changed a lot.**
  - The managed **AWS MCP Server** (Agent Toolkit for AWS, preview) replaces `awslabs.aws-api-mcp-server` (superseded)
    and, according to AWS, the Knowledge server.
  - `core-mcp-server`, `cdk-mcp-server` and `ccapi-mcp-server` are yanked on PyPI or deprecated.
  - For terminal agents such as Claude Code, AWS recommends SigV4 through `mcp-proxy-for-aws-cli`, so the bare `aws` entry
    is stdio and `aws-oauth` is the remote twin.
- **OCI:** Oracle hosts no general MCP endpoint. `oracle/mcp` recommends `oracle.oci-cloud-mcp-server`, a stdio server
  on the Python SDK, and marks every server in the repo "not intended for production use".
- **PostgreSQL:** `@modelcontextprotocol/server-postgres` is **archived and deprecated**. Its read-only wrapper was
  bypassable through SQL injection. The recommended replacement is **DBHub** (`@bytebase/dbhub`), the server that
  `CC-MCP` itself uses as its Postgres example. It takes the DSN from the `DSN` env var, so the password stays in `${VAR}`.
- **Kubernetes:** the Kubernetes project has no official server. The de facto choice is Red Hat's
  `containers/kubernetes-mcp-server`. Its main branch has **removed every runtime CLI flag** in favour of TOML, so the
  entry passes no flags.
- **Community servers proposed, all flagged in their comments:**
  - `n8n-mcp` (czlonkowski);
  - `figma-framelink` (GLips);
  - `postgres` (DBHub, from Bytebase; community with respect to PostgreSQL).
- **No name clashes** with the current catalog, which holds jina, firecrawl\*, tavily\*, github\*, gitlab\*,
  cloudflare\*, atlassian\*, jira-dc and confluence-dc.

Endpoint probe results (2026-09-24, unauthenticated `initialize`):

| Endpoint | HTTP | Auth server | DCR | CIMD |
|---|---|---|---|---|
| `https://mcp.apify.com` | 401 (no `resource_metadata` in the header; the root PRM is served) | `https://console-backend.apify.com` | yes | yes |
| `https://mcp.exa.ai/mcp` | 200 (keyless tier) | `https://auth.exa.ai` (PRM published) | yes | yes |
| `https://mcp.exa.ai/mcp?login`, `/mcp/oauth` | 401 | `https://auth.exa.ai` | yes | yes |
| `https://mcp.figma.com/mcp` | 401 (`scope="mcp:connect"`) | `https://api.figma.com` | yes, allowlisted clients only | no |
| `http://127.0.0.1:3845/mcp` (Figma desktop) | not probed (needs the app) | none | – | – |
| `https://<n8n-host>/mcp-server/http` | not probed (no instance); read from source | instance origin (`/mcp-oauth/*`) | yes (source) | no (source) |
| `https://docs.n8n.io/~gitbook/mcp` | 200 | none | – | – |
| `https://n8n.mcp.kapa.ai` | 401 | `https://mcp.kapa.ai/auth/public` | yes | no |
| `https://mcp.supabase.com/mcp` (with or without `?project_ref=…`) | 401 | `https://api.supabase.com` | yes | no |
| `http://localhost:54321/mcp` (Supabase CLI) | not probed | none ("no OAuth 2.1") | – | – |
| `https://mcp.vercel.com` (and `/<team>/<project>`) | 401 | `https://vercel.com` | yes, approved clients only | no |
| `https://netlify-mcp.netlify.app/mcp` | 401 | `https://netlify-mcp.netlify.app/` | yes | no |
| `https://aws-mcp.us-east-1.api.aws/mcp` | 200 (docs tools); `?oauth=initialize` → 401 | `https://us-east-1.oauth.signin.aws/` | yes | no |
| `https://aws-mcp.eu-central-1.api.aws/mcp` | 200 (same) | `https://eu-central-1.oauth.signin.aws/` | yes | no |
| `https://knowledge-mcp.global.api.aws` | 200 | none | – | – |
| `https://eks-mcp.us-east-1.api.aws/mcp`, `https://ecs-mcp.us-east-1.api.aws/mcp` | 403 `Missing Authentication Token` (SigV4 only) | none | – | – |
| `https://mcp.sentry.dev/mcp` (and `/mcp/{org}/{project}`) | 401 | `https://mcp.sentry.dev` | yes | yes |
| `https://mcp.sentry.dev/mcp` with `Authorization: Sentry-Bearer <bogus>` | 200 (token not checked at `initialize`) | – | – | – |

---

## 0. Claude Code semantics (additions to the previous note)

- **Credential variables that read as empty.** In a remote `url` or `headers`, Claude Code blanks certain credential
  variables. The docs name `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, cloud-provider credentials such as
  `AWS_BEARER_TOKEN_BEDROCK`, `HTTPS_PROXY` and `NPM_TOKEN`. A `:-default` on such a name is ignored
  ([`CC-MCP` "Credential variables that read as empty"](https://code.claude.com/docs/en/mcp#credential-variables-that-read-as-empty)).
  The list is given only as examples. For that reason the remote AWS entries use the custom `AWS_MCP_ENDPOINT_REGION`
  rather than an `AWS_*` name. `${AWS_REGION:-…}` appears only in stdio `args`, where blanking does not apply.
- **`headersHelper` from a project or plugin** runs without the credential variables from your environment
  ([`CC-MCP` "Use dynamic headers for custom authentication"](https://code.claude.com/docs/en/mcp#use-dynamic-headers-for-custom-authentication)).
  So an AWS token helper would work only with profile, SSO or `aws login` credentials, not with
  `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` set in the environment.
- **An unset `${VAR}` is passed on literally** (`CC-MCP` "Missing environment variable"). For that reason `kubernetes`
  and `aws` have no `KUBECONFIG`/`AWS_PROFILE` entry in `env`, and rely on the servers' own defaults (`~/.kube/config`,
  the boto3 chain) plus the inherited environment.
- **A `200` on unauthenticated `initialize` means no OAuth prompt.** OAuth discovery starts from a `401` with
  `WWW-Authenticate` (`CC-MCP` "Authenticate with remote MCP servers"). That is why Exa's OAuth entry uses `?login`.

## 1. Apify

- **Official:** [`apify/apify-mcp-server`](https://github.com/apify/apify-mcp-server/blob/610ab163c79c107ea218d2201deacd80b3033d43/README.md)
  (`apify/actors-mcp-server` redirects to it), owned by Apify. npm
  [`@apify/actors-mcp-server`](https://registry.npmjs.org/@apify/actors-mcp-server) `0.16.0` (2026-09-17).
- **Remote:** `https://mcp.apify.com` (streamable HTTP). `/mcp` returns 404, and the legacy `/sse` endpoint has been
  removed ([README L26](https://github.com/apify/apify-mcp-server/blob/610ab163c79c107ea218d2201deacd80b3033d43/README.md#L26)).
  - **Auth:** OAuth or `Authorization: Bearer <APIFY_TOKEN>`
    ([README L73-74](https://github.com/apify/apify-mcp-server/blob/610ab163c79c107ea218d2201deacd80b3033d43/README.md#L73-L74)).
    The vendor docs title the OAuth section "Streamable HTTP with OAuth (recommended)"
    ([docs.apify.com/platform/integrations/mcp](https://docs.apify.com/platform/integrations/mcp.md)).
  - **Probe:** DCR yes (`…/oauth/apps`), CIMD yes, scope `full_api_access`.
- **stdio:** `npx @apify/actors-mcp-server` with `APIFY_TOKEN`. The hosted server has features stdio lacks, such as
  output-schema inference ([README L24](https://github.com/apify/apify-mcp-server/blob/610ab163c79c107ea218d2201deacd80b3033d43/README.md#L24)).
- **Options** ([README L312-477](https://github.com/apify/apify-mcp-server/blob/610ab163c79c107ea218d2201deacd80b3033d43/README.md#L312-L357)):
  - `?tools=` takes categories (`actors`, `docs`, `runs`, `storage`, `tasks`, `schedules`, `builds`, `dev`), tool
    names or Actor IDs. The default is `actors,docs,apify/rag-web-browser,apify/web-fetch`. `?actors=` is a legacy alias.
  - `?ui=true` turns on MCP Apps widgets.
  - `?telemetry-enabled=false` turns off telemetry, which is on by default.

```yaml
  apify:
    type: http
    url: https://mcp.apify.com

  apify-token:
    type: http
    url: https://mcp.apify.com
    headers:
      Authorization: Bearer ${APIFY_TOKEN}
```

Rationale: `apify` uses OAuth, the vendor's recommendation, with DCR and CIMD. `apify-token` is the header twin for
headless/CI use. There is no stdio entry because the vendor prefers hosted and stdio has fewer features.

## 2. n8n

What is official and what is community:

- **Official: the instance-level MCP server, built into n8n.** It is available on n8n Cloud and self-hosted. An owner or
  admin enables it under **Settings > Instance-level MCP > Enable MCP access**. The URL is
  `https://<your-n8n-domain>/mcp-server/http`: `…app.n8n.cloud` on Cloud, the editor domain when self-hosted, and
  `http://localhost:5678` locally
  ([connect-to-n8n-mcp-server.md L32-104](https://github.com/n8n-io/n8n-docs/blob/ad5d6fd8a52bdc2266e24007493c322c673b191f/docs/connect/connect-to-n8n-mcp-server.md#L32-L104);
  [mcp-client-examples.md L22-69](https://github.com/n8n-io/n8n-docs/blob/ad5d6fd8a52bdc2266e24007493c322c673b191f/docs/connect/connect-to-n8n-mcp-server/mcp-client-examples.md#L22-L69)).
  - **What it can do:** search workflows, run MCP-enabled workflows, and create or edit workflows and data tables.
    Building and editing workflows needs n8n ≥ 2.13.0.
  - **Self-hosted controls:** env `N8N_MCP_MANAGED_BY_ENV` and `N8N_MCP_ACCESS_ENABLED` (n8n ≥ 2.20.0) manage the
    setting, and `N8N_DISABLED_MODULES=mcp` removes the server.
  - **Auth:** OAuth is recommended. The Claude Code steps are `claude mcp add --transport http n8n <url>`, then `/mcp`.
    The alternative is `Authorization: Bearer <MCP token>`, a personal token from the "API key" tab. It is separate
    from the n8n public-API key
    ([L114-155](https://github.com/n8n-io/n8n-docs/blob/ad5d6fd8a52bdc2266e24007493c322c673b191f/docs/connect/connect-to-n8n-mcp-server.md#L114-L155);
    [client examples L71-128](https://github.com/n8n-io/n8n-docs/blob/ad5d6fd8a52bdc2266e24007493c322c673b191f/docs/connect/connect-to-n8n-mcp-server/mcp-client-examples.md#L71-L128)).
  - **OAuth metadata, read from source:** the issuer is the instance origin and `registration_endpoint` is
    `${baseUrl}/mcp-oauth/register`, so DCR is available. There is no CIMD field
    ([oauth.controller.ts L177-206](https://github.com/n8n-io/n8n/blob/bd2efe1c9e5a98624cc370b342d853d6fbc04167/packages/cli/src/modules/oauth-server/oauth.controller.ts#L177-L206)).
    The PRM is at `/.well-known/oauth-protected-resource/mcp-server/http`
    ([mcp-protected-resource.ts L34](https://github.com/n8n-io/n8n/blob/bd2efe1c9e5a98624cc370b342d853d6fbc04167/packages/cli/src/modules/mcp/mcp-protected-resource.ts#L34)).
- **Official: the MCP Server Trigger node.** This is a per-workflow MCP endpoint with a random path by default. It
  supports SSE and streamable HTTP, and its auth is None, Bearer or Header
  ([mcptrigger.md L32-117](https://github.com/n8n-io/n8n-docs/blob/ad5d6fd8a52bdc2266e24007493c322c673b191f/docs/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger.md#L32-L117)).
  Because the URL is per workflow, it gets **no catalog entry**; declare it inline.
- **Official docs servers:** `https://docs.n8n.io/~gitbook/mcp` (no auth) and `https://n8n.mcp.kapa.ai` (docs, forum
  and blog; OAuth with DCR)
  ([connect-to-n8n-docs-mcp-server.md L27-63](https://github.com/n8n-io/n8n-docs/blob/ad5d6fd8a52bdc2266e24007493c322c673b191f/docs/connect/connect-to-n8n-docs-mcp-server.md#L27-L63)).
- **Community: [`czlonkowski/n8n-mcp`](https://github.com/czlonkowski/n8n-mcp/blob/4cc0efda76f272e3b0816f215399f21599c29d34/README.md).**
  It is not owned by n8n, and its README calls n8n's server "Official MCP"
  ([L85-87](https://github.com/czlonkowski/n8n-mcp/blob/4cc0efda76f272e3b0816f215399f21599c29d34/README.md#L85-L87)).
  - It provides node docs and search for 2,864 nodes. With `N8N_API_URL` + `N8N_API_KEY` it also manages workflows
    through the n8n public API.
  - Published as npm [`n8n-mcp`](https://registry.npmjs.org/n8n-mcp) `2.89.0` (2026-09-23) and GHCR
    `ghcr.io/czlonkowski/n8n-mcp:2.89.0`.
  - stdio needs `MCP_MODE=stdio`, `LOG_LEVEL=error` and `DISABLE_CONSOLE_OUTPUT=true`
    ([SELF_HOSTING.md L20-56](https://github.com/czlonkowski/n8n-mcp/blob/4cc0efda76f272e3b0816f215399f21599c29d34/docs/SELF_HOSTING.md#L20-L56)).

```yaml
  n8n:
    type: http
    url: ${N8N_BASE_URL}/mcp-server/http

  n8n-token:
    type: http
    url: ${N8N_BASE_URL}/mcp-server/http
    headers:
      Authorization: Bearer ${N8N_MCP_TOKEN}

  n8n-docs:
    type: http
    url: https://docs.n8n.io/~gitbook/mcp

  n8n-mcp:
    command: npx
    args: [-y, n8n-mcp@2.89.0]
    env:
      MCP_MODE: stdio
      LOG_LEVEL: error
      DISABLE_CONSOLE_OUTPUT: 'true'
      N8N_API_URL: ${N8N_BASE_URL}
      N8N_API_KEY: ${N8N_API_KEY}
```

Rationale:
- Every n8n instance has its own URL, so there is no cloud default. `N8N_BASE_URL` holds the full origin, which also
  covers plain-HTTP local installs.
- `n8n` uses OAuth (vendor-recommended, DCR), and `n8n-token` is the documented Bearer twin.
- `n8n-docs` is official and needs no setup.
- `n8n-mcp` is community and reuses `N8N_BASE_URL`.

## 3. PostgreSQL

- **Archived:** `@modelcontextprotocol/server-postgres`.
  - It is listed under "Archived" in the servers repo
    ([README L37-48](https://github.com/modelcontextprotocol/servers/blob/f46d9578190b476b3501923ea8977d899e8db2cb/README.md#L37-L48)),
    and the archive repo says "NO SECURITY GUARANTEES"
    ([servers-archived README L1-22](https://github.com/modelcontextprotocol/servers-archived/blob/9be4674d1ddf8c469e6461a27a337eeb65f76c2e/README.md#L1-L22)).
  - npm [`0.6.2`](https://registry.npmjs.org/@modelcontextprotocol/server-postgres) (2024-12-04) is marked
    `deprecated: "Package no longer supported"`.
  - Datadog showed that stacked statements (`COMMIT; …`) escape its `BEGIN TRANSACTION READ ONLY` wrapper
    ([Datadog Security Labs, 2025-08-21](https://securitylabs.datadoghq.com/articles/mcp-vulnerability-case-study-SQL-injection-in-the-postgresql-mcp-server/);
    [archived `index.ts` L117-118](https://github.com/modelcontextprotocol/servers-archived/blob/9be4674d1ddf8c469e6461a27a337eeb65f76c2e/src/postgres/index.ts#L117-L118)).
    No CVE or GHSA was found. **Do not use.**
- **The PostgreSQL project has no official MCP server.**
- **DBHub (Bytebase), recommended.** npm [`@bytebase/dbhub`](https://registry.npmjs.org/@bytebase/dbhub) `1.3.1`
  (2026-09-21).
  - It is the server `CC-MCP` uses in "Example: Query your PostgreSQL database".
  - It supports PostgreSQL, MySQL, MariaDB, SQL Server, Oracle and SQLite, and needs Node ≥ 22.5
    ([README L46-51, L106](https://github.com/bytebase/dbhub/blob/7b9c63b0376b5d9fd998674c025e833d8ba07d0b/README.md#L46-L51)).
  - **DSN lookup order:** `--dsn`, then env `DSN`, then `DB_TYPE`/`DB_HOST`/`DB_USER`/`DB_PASSWORD`/…, then `.env`
    ([`src/config/env.ts` L255-290](https://github.com/bytebase/dbhub/blob/7b9c63b0376b5d9fd998674c025e833d8ba07d0b/src/config/env.ts#L255-L290)).
    So `env: {DSN: ${POSTGRES_DSN}}` keeps the password out of `args`.
  - Read-only mode now lives only in the TOML config. The `READONLY` env var errors out
    ([env.ts L120-130](https://github.com/bytebase/dbhub/blob/7b9c63b0376b5d9fd998674c025e833d8ba07d0b/src/config/env.ts#L120-L130)).
- **Google MCP Toolbox for Databases (first-party Google).** npm
  [`@toolbox-sdk/server`](https://registry.npmjs.org/@toolbox-sdk/server) `1.12.0` (2026-09-17), run as
  `--prebuilt=postgres --stdio`
  ([README L83-97](https://github.com/googleapis/genai-toolbox/blob/83ba8390655eda5a59e021369c921fe88a6d602a/README.md#L83-L97)).
  It takes separate variables `POSTGRES_HOST`/`PORT`/`DATABASE`/`USER`/`PASSWORD`, not a DSN
  ([prebuilt `postgres.yaml` L15-23](https://github.com/googleapis/genai-toolbox/blob/83ba8390655eda5a59e021369c921fe88a6d602a/internal/prebuiltconfigs/tools/postgres.yaml#L15-L23)).
- **Not recommended: `crystaldba/postgres-mcp`** (community). Its last release is PyPI
  [`0.3.0`](https://pypi.org/pypi/postgres-mcp/json) from 2025-05-16, and it offers only stdio and SSE
  ([README L139-144](https://github.com/crystaldba/postgres-mcp/blob/15c8e33353546148acc2d8bd784551cf3905d1e2/README.md#L139-L144)).

```yaml
  postgres:
    command: npx
    args: [-y, '@bytebase/dbhub@1.3.1']
    env:
      DSN: ${POSTGRES_DSN}

  postgres-toolbox:
    command: npx
    args: [-y, '@toolbox-sdk/server@1.12.0', --prebuilt=postgres, --stdio]
    env:
      POSTGRES_HOST: ${POSTGRES_HOST:-localhost}
      POSTGRES_PORT: ${POSTGRES_PORT:-5432}
      POSTGRES_DATABASE: ${POSTGRES_DATABASE}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

Rationale:
- `postgres` is actively released and is the server Anthropic documents. The DSN holds the password, so it is passed
  only as `${POSTGRES_DSN}`. The key `DSN` doesn't match the secret regex, but its value is `${…}` anyway.
- `postgres-toolbox` is the optional first-party Google alternative. Its defaults are real ones (`localhost`, `5432`).

## 4. Supabase

- **Official:** [`supabase-community/supabase-mcp`](https://github.com/supabase-community/supabase-mcp/blob/4cc6660f656673eb83f3b80b0c3ae7030b3d2772/README.md)
  (`supabase/mcp` redirects to it), npm [`@supabase/mcp-server-supabase`](https://registry.npmjs.org/@supabase/mcp-server-supabase)
  `0.13.0` (2026-09-17). The README is remote-first and no longer documents stdio.
- **Remote:** `https://mcp.supabase.com/mcp`, with OAuth + DCR ("You don't need a personal access token"). The probe
  showed DCR and no CIMD.
  - The vendor's CI example uses `?project_ref=${SUPABASE_PROJECT_REF}` with
    `Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}` ([docs](https://supabase.com/docs/guides/getting-started/mcp)).
  - Query options:
    - `project_ref` scopes the session to one project and disables the account tools.
    - `read_only=true`.
    - `features=` selects feature groups: database, debugging, development, functions, account, docs, branching and
      storage. All are on except storage.
- **Local and self-hosted:**
  - The Supabase CLI serves `http://localhost:54321/mcp`, with a subset of tools and no OAuth
    ([README L41](https://github.com/supabase-community/supabase-mcp/blob/4cc6660f656673eb83f3b80b0c3ae7030b3d2772/README.md#L41)).
  - Self-hosted Docker exposes an MCP route that is denied by default and must not be exposed publicly. The docs reach
    it through an SSH tunnel at `http://localhost:8080/mcp`
    ([self-hosting/enable-mcp](https://supabase.com/docs/guides/self-hosting/enable-mcp)).

```yaml
  supabase:
    type: http
    url: https://mcp.supabase.com/mcp

  supabase-token:
    type: http
    url: https://mcp.supabase.com/mcp?project_ref=${SUPABASE_PROJECT_REF}
    headers:
      Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}

  supabase-self-hosted:
    type: http
    url: ${SUPABASE_MCP_URL:-http://localhost:54321/mcp}
```

Rationale:
- `supabase` is the vendor default, OAuth with DCR.
- `supabase-token` is the vendor's own CI example. It is project-scoped because a PAT gives access to the whole account.
- `supabase-self-hosted` covers both the CLI (the default) and a tunnelled self-hosted instance, using a real default.

## 5. Vercel

- **Official, remote only, Public Beta:** `https://mcp.vercel.com`
  ([docs](https://vercel.com/docs/agent-resources/vercel-mcp)). There is no npm/stdio server. `vercel/mcp-handler` is a
  library for building servers.
- **Auth:** OAuth only. "Vercel MCP only supports AI clients that have been reviewed and approved by Vercel", and Claude
  Code is on that list (`claude mcp add --transport http vercel https://mcp.vercel.com`).
  - DCR is available at `https://api.vercel.com/login/oauth/register`. No CIMD.
  - No token option is documented, and a dummy `Bearer` got a `401`.
- **Project scope:** `https://mcp.vercel.com/<team>/<project>` ([`vercel mcp` CLI docs](https://vercel.com/docs/cli/mcp)).
  The probe got a per-path resource metadata document.

```yaml
  vercel:
    type: http
    url: https://mcp.vercel.com

  vercel-project:
    type: http
    url: https://mcp.vercel.com/${VERCEL_TEAM_SLUG}/${VERCEL_PROJECT_SLUG}
```

Rationale: `vercel` is the vendor's Claude Code config. `vercel-project` is the documented project-scoped form, split
into its own entry so no empty default is needed. There is no `-token` twin because no token path exists.

## 6. Netlify

- **Official:** [`netlify/netlify-mcp`](https://github.com/netlify/netlify-mcp/blob/cebe0ee081d7f00f68ff6bbad296f169ab190fd6/README.md),
  npm [`@netlify/mcp`](https://registry.npmjs.org/@netlify/mcp) `1.15.1`. That release is from 2025-11-11 and is still
  `latest`; the repo's `1.16.0` is unpublished. Needs Node 22+.
- **Remote, vendor-recommended:** `claude mcp add --transport http netlify https://netlify-mcp.netlify.app/mcp`. The
  local fallback is `npx -y @netlify/mcp`
  ([Netlify Claude Code guide](https://docs.netlify.com/build/build-with-ai/agent-setup-guides/set-up-claude-code-for-netlify/);
  [MCP overview](https://docs.netlify.com/build/build-with-ai/netlify-mcp-server/)). The probe showed OAuth with DCR
  (`/oauth-server/reg`) and no CIMD.
- **Token:** the documented path is stdio `NETLIFY_PERSONAL_ACCESS_TOKEN`
  ([README L100-115](https://github.com/netlify/netlify-mcp/blob/cebe0ee081d7f00f68ff6bbad296f169ab190fd6/README.md#L100-L115)).
  The remote server also passes `nfp_`/`nfu_`/`nfo_` Bearer tokens straight through
  ([`src/utils/api-networking.ts` L116-152](https://github.com/netlify/netlify-mcp/blob/cebe0ee081d7f00f68ff6bbad296f169ab190fd6/src/utils/api-networking.ts#L116-L152)),
  but that behaviour is undocumented.

```yaml
  netlify:
    type: http
    url: https://netlify-mcp.netlify.app/mcp

  netlify-token:
    command: npx
    args: [-y, '@netlify/mcp@1.15.1']
    env:
      NETLIFY_PERSONAL_ACCESS_TOKEN: ${NETLIFY_PERSONAL_ACCESS_TOKEN}
```

Rationale: `netlify` is the vendor's remote OAuth. `netlify-token` is the only documented token path. A simpler remote
twin (the same URL + `Authorization: Bearer ${NETLIFY_PERSONAL_ACCESS_TOKEN}`) relies on undocumented behaviour; see the
open questions.

## 7. AWS

Which servers are worth cataloguing:

- **AWS MCP Server (managed, preview): yes.** It is part of the Agent Toolkit for AWS and listed under "Start here" in
  [awslabs/mcp README L146](https://github.com/awslabs/mcp/blob/3e0418ff99c5201bec6df4883729fd9f09b856b9/README.md#L146)
  ([what-is-agent-toolkit](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/what-is-agent-toolkit.html)).
  - The only endpoints are `https://aws-mcp.us-east-1.api.aws/mcp` and `https://aws-mcp.eu-central-1.api.aws/mcp`
    ([getting started](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/getting-started-aws-mcp-server.html)).
  - Docs tools work without auth. API calls, scripts and skills need IAM.
  - **Auth option A, OAuth.** `claude mcp add aws-mcp https://aws-mcp.us-east-1.api.aws/mcp --transport http`. It needs
    the IAM policy `AWSMCPSignInOAuthAccessPolicy`. Legacy clients may need `?oauth=initialize`. Tokens last 1 h and
    refresh for up to 12 h ([oauth-authentication](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/oauth-authentication.html)).
  - **Auth option B, SigV4.** AWS says to use it "if you use terminal or IDE-based coding agents (such as Claude Code,
    Kiro, and Codex)". It is also the option for multiple profiles or accounts and for a default region (same page).
  - **The proxy:** PyPI [`mcp-proxy-for-aws-cli`](https://pypi.org/pypi/mcp-proxy-for-aws-cli/json) `1.7.0`
    (2026-09-15), the pinned CLI build of `mcp-proxy-for-aws`
    ([proxy README L60-67](https://github.com/aws/mcp-proxy-for-aws/blob/14ec70c79c3b881f7b726cd9639c8eb99df43b96/README.md#L60-L67)).
  - **Proxy options:** `--profile` (with fallback to `AWS_PROFILE`; `AWS_MCP_PROXY_PROFILES` takes precedence),
    `--region`, `--service`, `--metadata`, `--read-only`, `--timeout` and `--tool-timeout`. Credentials come from the
    boto3 chain ([README L100-147](https://github.com/aws/mcp-proxy-for-aws/blob/14ec70c79c3b881f7b726cd9639c8eb99df43b96/README.md#L100-L147)).
  - **Regions:** the signing region is taken from `--region`, then the endpoint URL, then `AWS_REGION`. The operations
    region follows the profile or `AWS_REGION`
    ([utils.py](https://github.com/aws/mcp-proxy-for-aws/blob/14ec70c79c3b881f7b726cd9639c8eb99df43b96/mcp_proxy_for_aws/utils.py)).
    So no `--metadata AWS_REGION=` is needed.
  - **Headless bearer:** `aws signin create-oauth2-token-with-iam --grant-type client_credentials --resource aws-mcp.amazonaws.com`
    returns a 1 h token with no refresh (oauth-authentication page).
- **AWS Knowledge MCP: yes, as a zero-setup docs server.** `https://knowledge-mcp.global.api.aws` "does not require
  authentication but is subject to rate limits"
  ([README L149-151](https://github.com/awslabs/mcp/blob/3e0418ff99c5201bec6df4883729fd9f09b856b9/src/aws-knowledge-mcp-server/README.md#L149-L151)).
  AWS's getting-started page says to remove it when you adopt the AWS MCP Server, because the tools overlap.
- **Managed EKS MCP (preview): optional.** `https://eks-mcp.{region}.api.aws/mcp`, SigV4 via the proxy with
  `--service eks-mcp` ([EKS getting started](https://docs.aws.amazon.com/eks/latest/userguide/eks-mcp-getting-started.html);
  [What's New 2025-11](https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-eks-ecs-fully-managed-mcp-servers-preview/)).
  Managed ECS has the same shape (`--service ecs-mcp`).
- **Not catalogued:**
  - `awslabs.aws-api-mcp-server` `1.5.5` is "superseded by the official AWS MCP server"
    ([README L3-4](https://github.com/awslabs/mcp/blob/3e0418ff99c5201bec6df4883729fd9f09b856b9/src/aws-api-mcp-server/README.md#L3-L4)).
  - `awslabs.aws-documentation-mcp-server` `1.2.1` duplicates Knowledge. Its only extra is `aws-cn` docs.
  - `awslabs.core-mcp-server`, `awslabs.cdk-mcp-server` and `awslabs.ccapi-mcp-server` have every release yanked on PyPI
    (`yanked_reason`: "load individual MCPs" / "Superceeded by awslabs.aws-iac-mcp-server"). ccapi is also marked
    "DEPRECATED" in the [README L165](https://github.com/awslabs/mcp/blob/3e0418ff99c5201bec6df4883729fd9f09b856b9/README.md#L165).
  - `awslabs.aws-iac-mcp-server` and `awslabs.aws-pricing-mcp-server` are niche and overlap with the AWS MCP Server's
    skills.

```yaml
  aws:
    command: uvx
    args: [mcp-proxy-for-aws-cli@1.7.0, 'https://aws-mcp.${AWS_MCP_ENDPOINT_REGION:-us-east-1}.api.aws/mcp']

  aws-oauth:
    type: http
    url: https://aws-mcp.${AWS_MCP_ENDPOINT_REGION:-us-east-1}.api.aws/mcp

  aws-knowledge:
    type: http
    url: https://knowledge-mcp.global.api.aws

  aws-eks:
    command: uvx
    args: [mcp-proxy-for-aws-cli@1.7.0, 'https://eks-mcp.${AWS_REGION:-us-east-1}.api.aws/mcp', --service, eks-mcp]
```

Rationale:
- `aws` is what AWS recommends for Claude Code. The proxy reads `AWS_PROFILE`/`AWS_REGION`/SSO itself, so the entry needs
  no `env`.
- `aws-oauth` is the no-uv twin, with DCR confirmed by the probe.
- `aws-knowledge` needs no account.
- `aws-eks` is the managed EKS server.
- The endpoint region uses a custom variable, because `AWS_*` names may be blanked in a remote `url`.

## 8. Oracle Cloud (OCI)

- **Official:** [`oracle/mcp`](https://github.com/oracle/mcp/blob/1f1c05c2312ef008a6c9d61f724791c276a2c793/README.md)
  has 33 servers and says they are "not intended for production use; servers are provided as reference"
  ([L10-12](https://github.com/oracle/mcp/blob/1f1c05c2312ef008a6c9d61f724791c276a2c793/README.md#L10-L12)).
  - The recommended starting point is **`oracle.oci-cloud-mcp-server`**, built on the OCI Python SDK.
  - **`oracle.oci-api-mcp-server`** is the alternative built on the OCI CLI
    ([L39-41](https://github.com/oracle/mcp/blob/1f1c05c2312ef008a6c9d61f724791c276a2c793/README.md#L39-L41)).
  - Everything else (compute, networking, logging, pricing, …) is domain-specific and is skipped.
  - PyPI versions:
    - [`oracle.oci-cloud-mcp-server`](https://pypi.org/pypi/oracle.oci-cloud-mcp-server/json) `2.2.3` (2026-08-25);
    - [`oracle.oci-api-mcp-server`](https://pypi.org/pypi/oracle.oci-api-mcp-server/json) `2.1.5` (2026-08-25).

    Both need Python ≥ 3.13, which uv downloads if needed.
- **Transport:** stdio via `uvx`, with env `OCI_CONFIG_PROFILE` and `FASTMCP_LOG_LEVEL=ERROR`
  ([README L45-95](https://github.com/oracle/mcp/blob/1f1c05c2312ef008a6c9d61f724791c276a2c793/README.md#L45-L95)).
  - oci-cloud settings:
    - `OCI_CONFIG_FILE` (default `~/.oci/config`);
    - `OCI_REGION`, which overrides the region;
    - `OCI_MCP_AUTH_TYPE`: `auto`, `api_key`, `security_token`, `instance_principal`, …
    ([oci-cloud README L255-269](https://github.com/oracle/mcp/blob/1f1c05c2312ef008a6c9d61f724791c276a2c793/src/oci-cloud-mcp-server/README.md#L255-L269)).
  - In oci-api, `OCI_CLI_AUTH` is authoritative, and `--profile`/`--auth` inside commands are rejected
    ([oci-api README L28-40](https://github.com/oracle/mcp/blob/1f1c05c2312ef008a6c9d61f724791c276a2c793/src/oci-api-mcp-server/README.md#L28-L40)).
- **Not proposed:**
  - **Oracle-hosted MCP exists only for databases.** Autonomous AI Database has a per-database endpoint
    `https://dataaccess.adb.{region}.oraclecloudapps.com/adb/mcp/v1/databases/{ocid}` (OAuth with DB credentials, or a
    1 h bearer token) ([ADB "Use MCP Server"](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/use-mcp-server.html)).
    There is also the "OCI Managed MCP Service for Oracle AI Database"
    ([Oracle blog](https://blogs.oracle.com/database/gain-agentic-access-to-any-oracle-database-in-the-cloud-with-native-enterprise-grade-managed-mcp-servers-in-oci)).
  - **oci-cloud's self-hosted HTTP mode.** It needs an IDCS confidential app, and its MCP path and DCR support are
    undocumented ([oci-cloud README L46-60](https://github.com/oracle/mcp/blob/1f1c05c2312ef008a6c9d61f724791c276a2c793/src/oci-cloud-mcp-server/README.md#L46-L60)).
  - **SQLcl MCP** (first-party, `sql -mcp`, SQLcl 25.2+) is a locally installed Java binary that cannot be pinned
    ([SQLcl docs](https://docs.oracle.com/en/database/oracle/sql-developer-command-line/25.2/sqcug/starting-and-managing-sqlcl-mcp-server.html)).

```yaml
  oci:
    command: uvx
    args: [oracle.oci-cloud-mcp-server@2.2.3]
    env:
      OCI_CONFIG_PROFILE: ${OCI_CONFIG_PROFILE:-DEFAULT}
      FASTMCP_LOG_LEVEL: ERROR

  oci-cli:
    command: uvx
    args: [oracle.oci-api-mcp-server@2.1.5]
    env:
      OCI_CONFIG_PROFILE: ${OCI_CONFIG_PROFILE:-DEFAULT}
      FASTMCP_LOG_LEVEL: ERROR
```

Rationale: `oci` is Oracle's recommended entry point. `oci-cli` suits teams that think in `oci …` commands. `DEFAULT` is
the SDK/CLI default profile name, so it is a real default, not an empty one.

## 9. Figma

- **Official:**
  - **Remote server:** `https://mcp.figma.com/mcp`, which Figma calls "recommended"
    ([remote install](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)).
  - **Desktop app server:** `http://127.0.0.1:3845/mcp`, enabled in Dev Mode → Inspect → "Enable desktop MCP server"
    ([local install](https://developers.figma.com/docs/figma-mcp-server/local-server-installation/)).
  - **Guide and plugin:** [`figma/mcp-server-guide`](https://github.com/figma/mcp-server-guide/blob/172920731eedf414e9b22ae60017d9a5b6c9f81f/README.md).
    Its Claude Code command is `claude mcp add --transport http figma https://mcp.figma.com/mcp`
    ([L109-127](https://github.com/figma/mcp-server-guide/blob/172920731eedf414e9b22ae60017d9a5b6c9f81f/README.md#L109-L127)).
- **Auth (remote):** OAuth only.
  - The probe found a `registration_endpoint` (`https://api.figma.com/v1/oauth/mcp/register`) and no CIMD.
  - The docs say "Only clients listed in the Figma MCP Catalog like VS Code, Cursor, or Claude Code can connect".
  - No PAT/header option is documented, so there is no `figma-token`.
  - Write-to-canvas is remote-only ([guide L16](https://github.com/figma/mcp-server-guide/blob/172920731eedf414e9b22ae60017d9a5b6c9f81f/README.md#L16)).
- **Access limits** depend on plan and seat ([rate-limits-access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)).
- **Community: "Framelink" [`GLips/Figma-Context-MCP`](https://github.com/GLips/Figma-Context-MCP/blob/c083d65c7e002923e7cb98f4e3bdafb105e90f6d/README.md).**
  - npm [`figma-developer-mcp`](https://registry.npmjs.org/figma-developer-mcp) `0.13.2` (2026-06-18).
  - It reads `FIGMA_API_KEY` (a PAT) or `FIGMA_OAUTH_TOKEN`, and needs `--stdio`
    ([README L55-85](https://github.com/GLips/Figma-Context-MCP/blob/c083d65c7e002923e7cb98f4e3bdafb105e90f6d/README.md#L55-L85);
    [src/config.ts](https://github.com/GLips/Figma-Context-MCP/blob/c083d65c7e002923e7cb98f4e3bdafb105e90f6d/src/config.ts#L98-L176)).

```yaml
  figma:
    type: http
    url: https://mcp.figma.com/mcp

  figma-desktop:
    type: http
    url: http://127.0.0.1:3845/mcp

  figma-framelink:
    command: npx
    args: [-y, figma-developer-mcp@0.13.2, --stdio]
    env:
      FIGMA_API_KEY: ${FIGMA_API_KEY}
```

Rationale:
- `figma` is the vendor-recommended remote server.
- `figma-desktop` is the official local server. It needs no auth, but the desktop app must be running.
- `figma-framelink` is the only token/headless path. It is community.

## 10. Exa

- **Official:** [`exa-labs/exa-mcp-server`](https://github.com/exa-labs/exa-mcp-server/blob/f3d71fb6b0ff4b4683f108f05bc2bae61a9f7e97/README.md),
  npm [`exa-mcp-server`](https://registry.npmjs.org/exa-mcp-server) `3.4.1` (2026-08-18).
- **Remote:** `https://mcp.exa.ai/mcp`
  ([README L26-30](https://github.com/exa-labs/exa-mcp-server/blob/f3d71fb6b0ff4b4683f108f05bc2bae61a9f7e97/README.md#L26-L30)).
  It has three auth modes ([docs "Authentication"](https://docs.exa.ai/reference/exa-mcp.md);
  [README L126-132](https://github.com/exa-labs/exa-mcp-server/blob/f3d71fb6b0ff4b4683f108f05bc2bae61a9f7e97/README.md#L126-L132)):
  - **Keyless and rate-limited.** It returns `200`.
  - **OAuth, which the vendor prefers.** Force it with `?login` or `/mcp/oauth` (both return `401`; DCR and CIMD).
  - **API key.** The docs show header `x-api-key`. The README also accepts `Authorization: Bearer` or `?exaApiKey=`.
- **stdio:** `npx -y exa-mcp-server` with `EXA_API_KEY`
  ([src/stdio.ts L10-37](https://github.com/exa-labs/exa-mcp-server/blob/f3d71fb6b0ff4b4683f108f05bc2bae61a9f7e97/src/stdio.ts#L10-L37)).
- **Tools:** `web_search_exa` and `web_fetch_exa` are on by default. `web_search_advanced_exa` is opt-in. `?tools=`
  replaces the defaults ([README L90-113](https://github.com/exa-labs/exa-mcp-server/blob/f3d71fb6b0ff4b4683f108f05bc2bae61a9f7e97/README.md#L90-L113)).

```yaml
  exa:
    type: http
    url: https://mcp.exa.ai/mcp?login

  exa-token:
    type: http
    url: https://mcp.exa.ai/mcp
    headers:
      x-api-key: ${EXA_API_KEY}
```

Rationale:
- `exa` uses OAuth, the vendor's preferred mode. The bare `/mcp` never returns `401`, so `?login` is needed for Claude
  Code to start OAuth.
- `exa-token` uses the documented header. `x-api-key` matches the secret regex and uses `${…}`.
- A keyless entry (`https://mcp.exa.ai/mcp`, no auth) is possible; see the open questions.

## 11. Chrome DevTools

- **Official:** Chrome DevTools team, [`ChromeDevTools/chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/6a7e51fecaaefbea46b89e68892d42c175ee9163/README.md).
  npm [`chrome-devtools-mcp`](https://registry.npmjs.org/chrome-devtools-mcp) `1.10.1` (2026-09-23). The vendor's own
  Claude Code plugin pins `chrome-devtools-mcp@1.10.1`
  ([`.claude-plugin/plugin.json`](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/6a7e51fecaaefbea46b89e68892d42c175ee9163/.claude-plugin/plugin.json)).
- **Requirements:** stdio only. It needs Node LTS and stable Chrome
  ([README L62-66](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/6a7e51fecaaefbea46b89e68892d42c175ee9163/README.md#L62-L66)).
- **Options** ([docs/configuration.md](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/6a7e51fecaaefbea46b89e68892d42c175ee9163/docs/configuration.md)):
  - `--headless`.
  - `--isolated`: a temporary profile. The default profile `~/.cache/chrome-devtools-mcp/chrome-profile` is persistent
    and can be used by only one browser at a time
    ([advanced-usage L3-41](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/6a7e51fecaaefbea46b89e68892d42c175ee9163/docs/advanced-usage.md#L3-L41)).
  - `--browser-url`: attach to a Chrome started with `--remote-debugging-port`.
  - `--autoConnect`: attach to your own Chrome 144+.
  - `--channel`, `--slim`, `--category-*`, `--executablePath`, `--userDataDir` and `--viewport`.
- **Telemetry is on by default.** Opt out with `--no-usage-statistics` or `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS`
  ([README L35-60](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/6a7e51fecaaefbea46b89e68892d42c175ee9163/README.md#L35-L60)).

```yaml
  chrome-devtools:
    command: npx
    args: [-y, chrome-devtools-mcp@1.10.1]

  chrome-devtools-headless:
    command: npx
    args: [-y, chrome-devtools-mcp@1.10.1, --headless, --isolated]

  chrome-devtools-browser-url:
    command: npx
    args: [-y, chrome-devtools-mcp@1.10.1, '--browser-url=${CHROME_BROWSER_URL:-http://127.0.0.1:9222}']
```

Rationale:
- `chrome-devtools` matches the vendor plugin.
- `-headless` suits WSL, CI or SSH with no display, and several parallel sessions.
- `-browser-url` attaches to a Chrome you already run: in a sandbox, or with logins you want to reuse. Its default is
  the vendor-documented port.

## 12. Sequential Thinking

- **Reference server** from the MCP steering group. It is still in the active list, not archived
  ([servers README L34-39](https://github.com/modelcontextprotocol/servers/blob/f46d9578190b476b3501923ea8977d899e8db2cb/README.md#L34-L39)),
  and reference servers are "educational examples … not production-ready"
  ([L9](https://github.com/modelcontextprotocol/servers/blob/f46d9578190b476b3501923ea8977d899e8db2cb/README.md#L9)).
- **Package:** npm [`@modelcontextprotocol/server-sequential-thinking`](https://registry.npmjs.org/@modelcontextprotocol/server-sequential-thinking)
  `2026.8.31`. The Docker image `mcp/sequentialthinking` has only a `latest` tag from 2025-05-02, so it can't be pinned
  and is stale.
- **Tools and env:** one tool, `sequential_thinking`. `DISABLE_THOUGHT_LOGGING=true` silences the stderr log
  ([README L78-130](https://github.com/modelcontextprotocol/servers/blob/f46d9578190b476b3501923ea8977d899e8db2cb/src/sequentialthinking/README.md#L78-L92)).

```yaml
  sequential-thinking:
    command: npx
    args: [-y, '@modelcontextprotocol/server-sequential-thinking@2026.8.31']
```

Rationale: this is the vendor form, pinned. The thought log goes only to stderr, so it does not reach the model. Claude
already has extended thinking, so it is worth asking whether this is needed (as with Filesystem).

## 13. Kubernetes

- **No official Kubernetes-project server exists.** The only kubernetes-sigs MCP project is
  [`mcp-lifecycle-operator`](https://github.com/kubernetes-sigs/mcp-lifecycle-operator), which deploys MCP servers.
- **Recommended: [`containers/kubernetes-mcp-server`](https://github.com/containers/kubernetes-mcp-server/blob/966b9936b4f520fe91ff760adcfc425bb56d3aef/README.md)**
  (Red Hat).
  - It is a Go binary distributed as npm/PyPI `kubernetes-mcp-server` `0.0.67` (2026-09-18), and needs no kubectl
    ([README L170-189](https://github.com/containers/kubernetes-mcp-server/blob/966b9936b4f520fe91ff760adcfc425bb56d3aef/README.md#L170-L189);
    [Claude Code guide](https://github.com/containers/kubernetes-mcp-server/blob/966b9936b4f520fe91ff760adcfc425bb56d3aef/docs/getting-started-claude-code.md)).
  - **Flags in `0.0.67`:** `--kubeconfig`, `--read-only`, `--disable-destructive`, `--toolsets` (default
    `core,config`), `--disable-multi-cluster` and `--port`
    ([v0.0.67 README L199-208](https://github.com/containers/kubernetes-mcp-server/blob/fcd9bbe672c98bb81c2ce93da8c0add548023672/README.md#L199-L208)).
  - **On main, all runtime flags are removed** in favour of TOML (`--config`/`--config-dir`, `MCP_CONFIG_PATH`).
    "`$KUBECONFIG` remains client-go fallback"
    ([configuration-changes.md L20-49](https://github.com/containers/kubernetes-mcp-server/blob/966b9936b4f520fe91ff760adcfc425bb56d3aef/docs/configuration-changes.md#L20-L49)).
  - **Toolsets:** config, core, helm, kcp, kiali, kubevirt, netobserv and tekton.
  - **Multi-cluster** across kubeconfig contexts is on by default.
- **Community alternative: `Flux159/mcp-server-kubernetes`**, npm [`mcp-server-kubernetes`](https://registry.npmjs.org/mcp-server-kubernetes)
  `4.1.7`. It needs `kubectl` on `PATH`
  ([README L26-40](https://github.com/Flux159/mcp-server-kubernetes/blob/0340ab61e39f3767d32f86610cbd0672c5656892/README.md#L26-L40)).
  Not proposed.

```yaml
  kubernetes:
    command: npx
    args: [-y, kubernetes-mcp-server@0.0.67]
```

Rationale: the entry passes no flags, so it will keep working after the flag removal ships. The kubeconfig and context
come from the inherited `KUBECONFIG` or `~/.kube/config`, and tools can target any context. Extra toolsets are set in an
inline entry with `--config <toml>`.

## 14. Sentry

- **Official:** [`getsentry/sentry-mcp`](https://github.com/getsentry/sentry-mcp/blob/2d36483e0abe1069b0378938d39f4c4d2b4e5389/README.md).
  It is remote-first. stdio is "still a work in progress", aimed mainly at self-hosted Sentry
  ([README L32-34](https://github.com/getsentry/sentry-mcp/blob/2d36483e0abe1069b0378938d39f4c4d2b4e5389/README.md#L32-L34)).
  The vendor plugin's `.mcp.json` is `{"type":"http","url":"https://mcp.sentry.dev/mcp"}`
  ([plugins/sentry-mcp/.mcp.json](https://github.com/getsentry/sentry-mcp/blob/2d36483e0abe1069b0378938d39f4c4d2b4e5389/plugins/sentry-mcp/.mcp.json)),
  and `CC-MCP` uses the same URL in its OAuth walkthrough.
- **Remote:** `https://mcp.sentry.dev/mcp`, OAuth with DCR and CIMD.
  - `/mcp/{org}` and `/mcp/{org}/{project}` scope the session. "Scoping to a project is recommended when possible"
    ([homepage-content.ts L23-44](https://github.com/getsentry/sentry-mcp/blob/2d36483e0abe1069b0378938d39f4c4d2b4e5389/packages/mcp-cloudflare/src/homepage-content.ts#L23-L44)).
  - **Token:** `Authorization: Sentry-Bearer <token>`. It is not validated at `initialize`
    ([README L73-98](https://github.com/getsentry/sentry-mcp/blob/2d36483e0abe1069b0378938d39f4c4d2b4e5389/README.md#L73-L98);
    [spec](https://github.com/getsentry/sentry-mcp/blob/2d36483e0abe1069b0378938d39f4c4d2b4e5389/docs/specs/sentry-bearer-cloudflare-auth.md)).
  - The remote server does not serve self-hosted Sentry.
- **stdio:** npm [`@sentry/mcp-server`](https://registry.npmjs.org/@sentry/mcp-server) `0.39.0` (2026-08-27), Node ≥ 22.13.
  - **Env and flags:**
    - `SENTRY_ACCESS_TOKEN`;
    - `SENTRY_HOST` (hostname only), or `SENTRY_URL` for a full URL;
    - `--insecure-http`;
    - `MCP_DISABLE_SKILLS` (`inspect`, `seer`, `docs`, `triage`, `project-management`);
    - `--organization-slug` and `--project-slug`.

    Sources: [README L100-157](https://github.com/getsentry/sentry-mcp/blob/2d36483e0abe1069b0378938d39f4c4d2b4e5389/README.md#L100-L157);
    [cli/parse.ts](https://github.com/getsentry/sentry-mcp/blob/2d36483e0abe1069b0378938d39f4c4d2b4e5389/packages/mcp-server/src/cli/parse.ts#L81-L94).
  - The vendor's self-hosted example disables `seer`.
  - AI search tools need `EMBEDDED_AGENT_PROVIDER` plus a provider key. Without them, those tools are hidden.

```yaml
  sentry:
    type: http
    url: https://mcp.sentry.dev/mcp

  sentry-project:
    type: http
    url: https://mcp.sentry.dev/mcp/${SENTRY_ORG}/${SENTRY_PROJECT}

  sentry-token:
    type: http
    url: https://mcp.sentry.dev/mcp
    headers:
      Authorization: Sentry-Bearer ${SENTRY_ACCESS_TOKEN}

  sentry-self-hosted:
    command: npx
    args: [-y, '@sentry/mcp-server@0.39.0']
    env:
      SENTRY_ACCESS_TOKEN: ${SENTRY_ACCESS_TOKEN}
      SENTRY_HOST: ${SENTRY_HOST}
      MCP_DISABLE_SKILLS: seer
```

Rationale:
- `sentry` is the vendor plugin config.
- `sentry-project` is the scope the vendor recommends. Both variables are required, so no empty defaults.
- `sentry-token` is the headless twin, using the vendor's `Sentry-Bearer` scheme.
- `sentry-self-hosted` is the vendor's documented self-hosted path.

## 15. MarkItDown

- **Official:** Microsoft, [`microsoft/markitdown` `packages/markitdown-mcp`](https://github.com/microsoft/markitdown/blob/b8f79c57ebc0044be41323d89b2a45d3fda8460e/packages/markitdown-mcp/README.md).
  PyPI [`markitdown-mcp`](https://pypi.org/pypi/markitdown-mcp/json) `0.0.1a7` (2026-09-14), classified
  "Development Status :: 4 - Beta", Python ≥ 3.10.
  - It is maintained: on 2026-09-10 it migrated to MCP SDK 2.x "so 2026-07-28 clients can connect" (#2363).
  - It depends on `markitdown[all]` ([pyproject.toml](https://github.com/microsoft/markitdown/blob/b8f79c57ebc0044be41323d89b2a45d3fda8460e/packages/markitdown-mcp/pyproject.toml)).
- **Transport:** stdio by default. `--http` serves unauthenticated `/mcp` for local use only. It has one tool,
  `convert_to_markdown(uri)`, which accepts `http:`, `https:`, `file:` and `data:` URIs
  ([README L3-36, L132-134](https://github.com/microsoft/markitdown/blob/b8f79c57ebc0044be41323d89b2a45d3fda8460e/packages/markitdown-mcp/README.md#L3-L36)).
  The tool can read any file the user can read.
- **No official image.** The README says to build locally. Docker Inc.'s `mcp/markitdown` has only `latest`, predates
  the SDK 2.x fix, and is third-party.
- **Tested:** `uvx markitdown-mcp==0.0.1a7` answered stdio `initialize`. The first run downloads about 70 packages,
  including onnxruntime and pandas.

```yaml
  markitdown:
    command: uvx
    args: [markitdown-mcp==0.0.1a7]
```

Rationale: this is the first-party package with an exact pin. The pin is written with `==` because the version is a
pre-release. It needs no image build.

---

## Proposed additions to `packages/presets/mcp-servers.yaml`

Append under `servers:`. This block is the paste-ready form. It follows the catalog's current format:
- every entry starts with a required `description`, which `ap` drops before writing the server;
- comments are in English.

The per-server snippets above show only the server config. No existing name is reused.

```yaml
  # --- Apify ---------------------------------------------------------------------
  apify:
    description: Apify's official hosted server for running Apify Actors (scrapers, crawlers) and reading their results; browser sign-in (OAuth).
    type: http
    url: https://mcp.apify.com

  apify-token:
    description: Apify's official hosted server with an API token instead of browser sign-in; needs APIFY_TOKEN.
    type: http
    url: https://mcp.apify.com
    headers:
      Authorization: Bearer ${APIFY_TOKEN}

  # --- Exa -----------------------------------------------------------------------
  # Plain /mcp answers 200 (keyless tier), so Claude Code never starts OAuth; `?login` forces sign-in.
  exa:
    description: Exa's official hosted server for web search and page fetching; browser sign-in (OAuth).
    type: http
    url: https://mcp.exa.ai/mcp?login

  exa-token:
    description: Exa's official hosted server with an API key instead of browser sign-in; needs EXA_API_KEY.
    type: http
    url: https://mcp.exa.ai/mcp
    headers:
      x-api-key: ${EXA_API_KEY}

  # --- n8n -----------------------------------------------------------------------
  # N8N_BASE_URL is the instance origin: https://<instance>.app.n8n.cloud, https://n8n.example.com or http://localhost:5678.
  n8n:
    description: >-
      n8n's official instance-level MCP server (n8n Cloud or self-hosted) for searching, running and building workflows;
      browser sign-in (OAuth). Needs N8N_BASE_URL, and MCP access enabled under Settings > Instance-level MCP.
    type: http
    url: ${N8N_BASE_URL}/mcp-server/http

  n8n-token:
    description: >-
      n8n's official instance-level MCP server with a personal MCP token instead of browser sign-in; needs N8N_BASE_URL
      and N8N_MCP_TOKEN (from the "API key" tab of Instance-level MCP, not the public API key).
    type: http
    url: ${N8N_BASE_URL}/mcp-server/http
    headers:
      Authorization: Bearer ${N8N_MCP_TOKEN}

  n8n-docs:
    description: n8n's official documentation server (GitBook); no sign-in.
    type: http
    url: https://docs.n8n.io/~gitbook/mcp

  n8n-mcp:
    description: >-
      Community server (czlonkowski/n8n-mcp, not n8n) with n8n node documentation and workflow management through the
      n8n public API; runs with npx and needs N8N_BASE_URL and N8N_API_KEY.
    command: npx
    args: [-y, n8n-mcp@2.89.0]
    env:
      MCP_MODE: stdio
      LOG_LEVEL: error
      DISABLE_CONSOLE_OUTPUT: 'true'
      N8N_API_URL: ${N8N_BASE_URL}
      N8N_API_KEY: ${N8N_API_KEY}

  # --- Databases -----------------------------------------------------------------
  postgres:
    description: >-
      DBHub by Bytebase (community, the server Claude Code's docs use) for querying PostgreSQL, and also MySQL, SQL Server
      or SQLite through the DSN; runs with npx (Node 22.5+) and needs POSTGRES_DSN, which holds the password.
    command: npx
    args: [-y, '@bytebase/dbhub@1.3.1']
    env:
      DSN: ${POSTGRES_DSN}

  postgres-toolbox:
    description: >-
      Google's official MCP Toolbox for Databases with its prebuilt PostgreSQL tools; runs with npx and needs
      POSTGRES_DATABASE, POSTGRES_USER and POSTGRES_PASSWORD (POSTGRES_HOST and POSTGRES_PORT default to localhost:5432).
    command: npx
    args: [-y, '@toolbox-sdk/server@1.12.0', --prebuilt=postgres, --stdio]
    env:
      POSTGRES_HOST: ${POSTGRES_HOST:-localhost}
      POSTGRES_PORT: ${POSTGRES_PORT:-5432}
      POSTGRES_DATABASE: ${POSTGRES_DATABASE}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  supabase:
    description: Supabase's official hosted server for projects, databases, edge functions and docs; browser sign-in (OAuth).
    type: http
    url: https://mcp.supabase.com/mcp

  supabase-token:
    description: >-
      Supabase's official hosted server scoped to one project, with a personal access token instead of browser sign-in;
      needs SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN.
    type: http
    url: https://mcp.supabase.com/mcp?project_ref=${SUPABASE_PROJECT_REF}
    headers:
      Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}

  supabase-self-hosted:
    description: >-
      Supabase's official MCP endpoint on a local Supabase CLI stack (default http://localhost:54321/mcp) or a self-hosted
      instance reached through an SSH tunnel (set SUPABASE_MCP_URL); no sign-in.
    type: http
    url: ${SUPABASE_MCP_URL:-http://localhost:54321/mcp}

  # --- Hosting -------------------------------------------------------------------
  vercel:
    description: >-
      Vercel's official hosted server (beta) for projects, deployments, logs and docs; browser sign-in (OAuth), limited to
      clients Vercel has approved, which include Claude Code.
    type: http
    url: https://mcp.vercel.com

  vercel-project:
    description: Vercel's official hosted server scoped to one project; browser sign-in (OAuth), needs VERCEL_TEAM_SLUG and VERCEL_PROJECT_SLUG.
    type: http
    url: https://mcp.vercel.com/${VERCEL_TEAM_SLUG}/${VERCEL_PROJECT_SLUG}

  netlify:
    description: Netlify's official hosted server for sites, deploys and project settings; browser sign-in (OAuth).
    type: http
    url: https://netlify-mcp.netlify.app/mcp

  netlify-token:
    description: Netlify's official local server with a personal access token instead of browser sign-in; runs with npx (Node 22+) and needs NETLIFY_PERSONAL_ACCESS_TOKEN.
    command: npx
    args: [-y, '@netlify/mcp@1.15.1']
    env:
      NETLIFY_PERSONAL_ACCESS_TOKEN: ${NETLIFY_PERSONAL_ACCESS_TOKEN}

  # --- AWS -----------------------------------------------------------------------
  # Endpoint region: AWS_MCP_ENDPOINT_REGION=us-east-1 | eu-central-1. A custom name, because Claude Code may blank AWS_*
  # credential variables in a remote url.
  aws:
    description: >-
      AWS's official managed AWS MCP Server (preview) for AWS APIs, docs and skills, signed with SigV4 from your local AWS
      credentials (AWS_PROFILE, SSO or `aws login`); runs the official proxy with uvx. The operations region follows
      AWS_REGION or the profile.
    command: uvx
    args: [mcp-proxy-for-aws-cli@1.7.0, 'https://aws-mcp.${AWS_MCP_ENDPOINT_REGION:-us-east-1}.api.aws/mcp']

  aws-oauth:
    description: >-
      AWS's official managed AWS MCP Server (preview) with browser sign-in (OAuth) instead of SigV4; needs the IAM policy
      AWSMCPSignInOAuthAccessPolicy.
    type: http
    url: https://aws-mcp.${AWS_MCP_ENDPOINT_REGION:-us-east-1}.api.aws/mcp

  aws-knowledge:
    description: >-
      AWS's official hosted knowledge server for AWS documentation, What's New and Well-Architected; no account or
      sign-in. AWS advises against enabling it together with `aws`.
    type: http
    url: https://knowledge-mcp.global.api.aws

  aws-eks:
    description: >-
      AWS's official managed Amazon EKS MCP server (preview) for clusters and workloads, signed with SigV4 from your local
      AWS credentials; runs the official proxy with uvx. The region follows AWS_REGION.
    command: uvx
    args: [mcp-proxy-for-aws-cli@1.7.0, 'https://eks-mcp.${AWS_REGION:-us-east-1}.api.aws/mcp', --service, eks-mcp]

  # --- Oracle Cloud (OCI) --------------------------------------------------------
  oci:
    description: >-
      Oracle's official OCI server (reference, OCI Python SDK) for managing Oracle Cloud resources; runs with uvx (Python
      3.13) and uses the ~/.oci/config profile OCI_CONFIG_PROFILE (default DEFAULT). OCI_REGION overrides the region.
    command: uvx
    args: [oracle.oci-cloud-mcp-server@2.2.3]
    env:
      OCI_CONFIG_PROFILE: ${OCI_CONFIG_PROFILE:-DEFAULT}
      FASTMCP_LOG_LEVEL: ERROR

  oci-cli:
    description: >-
      Oracle's official OCI server that runs `oci` CLI commands (reference); runs with uvx (Python 3.13) and uses the
      ~/.oci/config profile OCI_CONFIG_PROFILE (default DEFAULT).
    command: uvx
    args: [oracle.oci-api-mcp-server@2.1.5]
    env:
      OCI_CONFIG_PROFILE: ${OCI_CONFIG_PROFILE:-DEFAULT}
      FASTMCP_LOG_LEVEL: ERROR

  # --- Kubernetes ----------------------------------------------------------------
  # Extra toolsets (helm, kubevirt, ...) or read-only: declare an inline entry with `--config <toml>`.
  kubernetes:
    description: >-
      Red Hat's kubernetes-mcp-server (containers org; Kubernetes itself ships none) for resources, pods, logs and events
      across kubeconfig contexts; runs with npx, no kubectl needed, and uses KUBECONFIG or ~/.kube/config.
    command: npx
    args: [-y, kubernetes-mcp-server@0.0.67]

  # --- Sentry --------------------------------------------------------------------
  sentry:
    description: Sentry's official hosted server for issues, errors, traces and Seer analysis on sentry.io; browser sign-in (OAuth).
    type: http
    url: https://mcp.sentry.dev/mcp

  sentry-project:
    description: >-
      Sentry's official hosted server scoped to one organization and project, as Sentry recommends; browser sign-in
      (OAuth), needs SENTRY_ORG and SENTRY_PROJECT (slugs).
    type: http
    url: https://mcp.sentry.dev/mcp/${SENTRY_ORG}/${SENTRY_PROJECT}

  # The scheme is `Sentry-Bearer`, not `Bearer`.
  sentry-token:
    description: Sentry's official hosted server with a user auth token instead of browser sign-in; needs SENTRY_ACCESS_TOKEN.
    type: http
    url: https://mcp.sentry.dev/mcp
    headers:
      Authorization: Sentry-Bearer ${SENTRY_ACCESS_TOKEN}

  sentry-self-hosted:
    description: >-
      Sentry's official local server for a self-hosted Sentry, with Seer turned off; runs with npx (Node 22.13+) and needs
      SENTRY_HOST (hostname only, e.g. sentry.example.com) and SENTRY_ACCESS_TOKEN.
    command: npx
    args: [-y, '@sentry/mcp-server@0.39.0']
    env:
      SENTRY_ACCESS_TOKEN: ${SENTRY_ACCESS_TOKEN}
      SENTRY_HOST: ${SENTRY_HOST}
      MCP_DISABLE_SKILLS: seer

  # --- Design --------------------------------------------------------------------
  figma:
    description: >-
      Figma's official hosted server for design context, variables, Code Connect and writing to the canvas; browser
      sign-in (OAuth), limited to clients in Figma's MCP catalog, which include Claude Code. Rate limits depend on plan and seat.
    type: http
    url: https://mcp.figma.com/mcp

  figma-desktop:
    description: >-
      Figma's official server inside the Figma desktop app; no sign-in, but the app must be running with Dev Mode >
      Inspect > "Enable desktop MCP server" turned on.
    type: http
    url: http://127.0.0.1:3845/mcp

  figma-framelink:
    description: >-
      Community server (GLips "Framelink", not Figma) that reads Figma files with a personal access token; runs with npx
      and needs FIGMA_API_KEY.
    command: npx
    args: [-y, figma-developer-mcp@0.13.2, --stdio]
    env:
      FIGMA_API_KEY: ${FIGMA_API_KEY}

  # --- Local tools ---------------------------------------------------------------
  chrome-devtools:
    description: >-
      The Chrome DevTools team's official server for driving and debugging Chrome (navigation, console, network,
      performance traces); runs with npx and launches Chrome with a persistent profile.
    command: npx
    args: [-y, chrome-devtools-mcp@1.10.1]

  chrome-devtools-headless:
    description: >-
      The official Chrome DevTools server with headless Chrome and a temporary profile, for machines without a display
      (WSL, CI, SSH) or parallel sessions; runs with npx.
    command: npx
    args: [-y, chrome-devtools-mcp@1.10.1, --headless, --isolated]

  chrome-devtools-browser-url:
    description: >-
      The official Chrome DevTools server attached to a Chrome you started with --remote-debugging-port; runs with npx,
      CHROME_BROWSER_URL defaults to http://127.0.0.1:9222.
    command: npx
    args: [-y, chrome-devtools-mcp@1.10.1, '--browser-url=${CHROME_BROWSER_URL:-http://127.0.0.1:9222}']

  sequential-thinking:
    description: >-
      The MCP steering group's reference server for step-by-step reasoning with revisable thoughts; runs with npx, no
      configuration.
    command: npx
    args: [-y, '@modelcontextprotocol/server-sequential-thinking@2026.8.31']

  markitdown:
    description: >-
      Microsoft's official MarkItDown server (beta) that converts files and URLs (PDF, Office, HTML, images, ...) to
      Markdown; runs with uvx and can read any file you can read.
    command: uvx
    args: [markitdown-mcp==0.0.1a7]
```

Pins to refresh later:
- npm: `n8n-mcp@2.89.0`, `@bytebase/dbhub@1.3.1`, `@toolbox-sdk/server@1.12.0`, `@netlify/mcp@1.15.1`,
  `kubernetes-mcp-server@0.0.67`, `@sentry/mcp-server@0.39.0`, `figma-developer-mcp@0.13.2`,
  `chrome-devtools-mcp@1.10.1`, `@modelcontextprotocol/server-sequential-thinking@2026.8.31`.
- PyPI: `mcp-proxy-for-aws-cli@1.7.0`, `oracle.oci-cloud-mcp-server@2.2.3`, `oracle.oci-api-mcp-server@2.1.5`,
  `markitdown-mcp==0.0.1a7`.

**Secret check:** every `env`/`headers` key that matches `/key|token|secret|password|auth|credential/i` has a `${…}`
value: `Authorization`, `x-api-key`, `N8N_API_KEY`, `POSTGRES_PASSWORD`, `NETLIFY_PERSONAL_ACCESS_TOKEN`,
`SENTRY_ACCESS_TOKEN` and `FIGMA_API_KEY`. `description` is catalog-only. The only literal values are non-secret: `MCP_MODE`, `LOG_LEVEL`,
`DISABLE_CONSOLE_OUTPUT`, `FASTMCP_LOG_LEVEL` and `MCP_DISABLE_SKILLS`.

## Open questions

1. **Breadth.** This batch adds 36 names. Should the catalog skip the optional ones?
   - Candidates to skip: `postgres-toolbox`, `aws-eks`, `oci-cli`, `n8n-docs`, `chrome-devtools-browser-url`,
     `vercel-project`, `sentry-project` and `figma-desktop`.
   - Candidates to add: the n8n Kapa docs server, AWS managed ECS (`--service ecs-mcp`), `chrome-devtools-slim`
     (`--slim --headless`), and `chrome-devtools-auto-connect` (`--autoConnect`).
2. **Community servers.** Should the catalog include them, given that most entries are first-party?
   - `n8n-mcp` (czlonkowski) is the only path to node docs plus workflow management over the public API.
   - `figma-framelink` is the only token/headless path to Figma.
   - `postgres` (DBHub) is community with respect to PostgreSQL, but it is the server `CC-MCP` documents.
3. **Postgres naming.** DBHub works with many databases. Keep the name `postgres` (with `POSTGRES_DSN`), or call it
   `dbhub` / `database` (with `DATABASE_DSN`)?
4. **AWS auth default.** The bare `aws` is stdio SigV4, because AWS says so for Claude Code. It needs uv plus local AWS
   credentials.
   - Alternative: flip it, so the bare name is remote OAuth and the proxy entry becomes `aws-sigv4`.
   - Unverified: whether the plain URL triggers Claude Code's OAuth, since `initialize` returns `200`. If it doesn't,
     `aws-oauth` should use `…/mcp?oauth=initialize`.
   - An `aws-token` entry built on `headersHelper` + `aws signin create-oauth2-token-with-iam` is possible but untested.
     Should it be added?
5. **Exa keyless.** Should the catalog add `exa-keyless` (`https://mcp.exa.ai/mcp`, no auth, rate-limited), similar to
   Jina's optional key?
6. **Netlify token twin: stdio or remote?** The remote server accepts a PAT as `Authorization: Bearer` (seen in source,
   undocumented). A remote `netlify-token` would drop Node and the pin.
7. **Telemetry flags.** Chrome DevTools (`--no-usage-statistics`) and Apify (`?telemetry-enabled=false`) collect usage
   statistics by default. Should catalog entries opt out, or stay on vendor defaults?
8. **Sequential Thinking.** Is it worth an entry, given Claude's built-in extended thinking? The same question was asked
   about Filesystem, which was dropped.
9. **Figma limits.** Figma's remote server is heavily rate-limited on Starter and View/Collab seats (6 or 20 tool calls
   a month, depending on the source). Is `figma` still worth shipping as the bare name?

## Unverified / could not confirm

- **n8n instance-level server:** not probed live, because no instance was available. DCR yes / CIMD no comes from source
  at master; older n8n releases may differ. Cloud plan restrictions are not stated in the docs I read.
- **Figma:** the DCR allowlist comes from the docs text only. I did not POST to `/register`. The desktop endpoint was
  not probed.
- **Vercel:** whether the approval gate stops DCR-registered clients at authorize time was not tested. A probe
  registration of a throwaway client (`client_name: probe`, no grant) succeeded.
- **Exa:** the `?exaApiKey=` and `Bearer` modes were not tested with a real key.
- **Netlify:** remote Bearer PAT is source-verified only.
- **Supabase:** the CLI and self-hosted endpoints were not probed.
- **AWS:**
  - Claude Code's behaviour on an endpoint that returns `200` and later needs auth (see open question 4).
  - The `aws signin create-oauth2-token-with-iam` helper.
  - GA vs preview status: the README still says "preview".
  - Whether `AWS_*` names are in Claude Code's blanked set, since the docs list only examples. The remote entries avoid
    them.
- **Credential blanking:** `CC-MCP` gives only examples of blanked names. None of the names used here (`APIFY_TOKEN`,
  `EXA_API_KEY`, `N8N_MCP_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SENTRY_ACCESS_TOKEN`) appears in it, but the full set is not
  published.
- **Oracle:** DCR on ADB managed MCP, and the path/DCR for oci-cloud's self-hosted HTTP mode.
- **Environment inheritance:** whether stdio servers inherit Claude Code's full environment (`AWS_PROFILE`,
  `KUBECONFIG`). `CC-MCP` doesn't say so explicitly. Both servers fall back to `~/.aws` and `~/.kube/config`.
- **Kubernetes:** when the flag-free kubernetes-mcp-server release will ship.
- **Sentry:**
  - `Sentry-Bearer` against a scoped `/mcp/{org}/{project}` URL with a real token.
  - A `docs.sentry.io` page for the MCP server: none was found (`/product/sentry-mcp` returns 404), so the Sentry claims
    rest on the repo and `mcp.sentry.dev/llms.txt`.
- **Chrome DevTools:** launching Chrome under WSL was not tested; only `--help` ran.
- **Postgres advisory:** no CVE or GHSA was found for the server-postgres injection. The evidence is the Datadog write-up
  and [PR #1889](https://github.com/modelcontextprotocol/servers/pull/1889).
