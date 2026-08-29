# Simploy v0

Simploy is a project initializer for one containerized web application and one
preconfigured VPS. A single `simploy init` run creates the selected application
target, deployment assets, CI configuration, and optional service integration
material.

Simploy is init-only. It is not installed as a deployment service on the VPS,
and CI does not need to install or run Simploy after initialization. The
generated GitHub Actions workflow or GitLab CI/CD pipeline performs deployment.

## Prerequisites

To work on this package, use Node.js 22 or newer and pnpm 10.30.3:

```bash
pnpm install
pnpm simploy --help
```

Before using a generated project in production, the operator must prepare the
target VPS. Simploy does not provision or harden it. The VPS needs:

- Docker and the Docker Compose plugin;
- OpenSSH reachable by the selected CI provider;
- persistent Caddy, outside the application's Compose lifecycle;
- the external Docker network `simploy-ingress`, available to Caddy and the
  application deployment;
- operator-provided values for the `SIMPLOY_DEPLOY_PATH` and
  `SIMPLOY_CADDY_CONFIG_PATH` environment variables used by the generated CI
  workflow. Simploy does not prescribe their paths.

## Initialize a project

Run initialization from the directory that will contain the project:

```bash
pnpm simploy init
```

Simploy gathers all of its choices before writing files. Existing
Simploy-managed targets require confirmation before replacement.

Supported v0 options:

```text
--name <name>          Project name
--app <nextjs|none>    Application target
--ci <github|gitlab>   Required CI provider
--services <services>  supabase, or none
--domain <domain>      Application domain
--port <port>          Application TCP port
--app-default          Use create-next-app defaults (nextjs only)
-h, --help             Show command help
```

For example:

```bash
pnpm simploy init \
  --name my-project \
  --app nextjs \
  --ci github \
  --services supabase \
  --domain app.example.com \
  --port 3000 \
  --app-default
```

`nextjs` invokes the official `create-next-app` generator in `app/`. Without
`--app-default`, its normal framework prompts remain available. Simploy then
copies a fixed `app/Dockerfile` and configures `app/next.config.mjs` for
Next.js standalone output. `none` creates an empty `app/` directory. Supabase
currently has a Next.js integration only, so `--app none --services supabase`
is rejected.

Initialization creates the applicable combination of:

```text
app/
simploy/
  deploy.env
  compose.yml
  Caddyfile
services/supabase/                    # when selected
.github/workflows/simploy-deploy.yml  # GitHub selection
.gitlab-ci.yml                        # GitLab selection
.gitignore
```

Only the selected CI provider is generated.

## Deployment configuration

`simploy/deploy.env` is the committed source of stable, non-secret deployment
configuration:

```env
DOMAIN=app.example.com
APP_PORT=3000
```

It must contain only `DOMAIN` and `APP_PORT`; do not put credentials, image
references, tokens, or runtime secrets in it. Docker Compose consumes this
file, and Caddy receives the same values when CI applies the generated
Caddyfile. The root `.gitignore` deliberately keeps `simploy/deploy.env`
trackable while ignoring common local environment files.

The generated Compose configuration puts the application on the external
`simploy-ingress` network and exposes its application port only inside Docker.
Caddy remains persistent VPS infrastructure rather than an application Compose
service.

## Configure CI secrets

After initialization, configure these values in the selected CI provider:

```text
VPS_HOST
VPS_USER
SSH_PRIVATE_KEY
SSH_KNOWN_HOSTS
```

`SSH_KNOWN_HOSTS` is used for host-key verification. Simploy never asks for,
stores, or uploads these values. Keep application runtime secrets separate from
`simploy/deploy.env` and provide them through the appropriate protected CI and
runtime mechanism.

## Deployment flow

After the generated files are reviewed and committed, the selected CI workflow
checks the application when applicable, builds and pushes an image to that
provider's registry, resolves an immutable image digest, and connects to the
VPS over verified SSH. CI transfers the generated deployment assets, deploys
the digest with Docker Compose, and validates and reloads the generated Caddy
configuration.

GitHub Actions uses GitHub Container Registry and production concurrency.
GitLab CI/CD uses the GitLab registry and a production `resource_group`.
Simploy has no role in this process after initialization.

## Service integrations

Services are external connections, not infrastructure Simploy deploys. When
Supabase is selected, Simploy copies its connection contract and an
application-owned starter migration to `services/supabase/`, adds the official
`@supabase/supabase-js` and `@supabase/ssr` packages to the generated Next.js
application, and adds browser, server, authentication, and storage helpers
under `app/lib/supabase/`. The generated service documentation explains the
required runtime values and client libraries. Review and apply the migration
through the process used for your external Supabase instance.

You are responsible for deploying, operating, upgrading, and backing up
Supabase. Simploy does not add a Supabase stack, volumes, networks, or
lifecycle management to the application's Compose deployment.

## Security and operator responsibilities

CI is part of the production trust boundary: it holds the deployment
credentials and has Docker access on the target VPS. Docker control is
effectively privileged VPS access. Simploy's generated files use protected CI
secret references, strict SSH host-key checking, immutable image digests, and
provider-level deployment serialization.

Those defaults do not replace operator responsibilities. VPS provisioning,
network setup, Caddy operation, Docker access policy, SSH policy, operating
system hardening, backups, and runtime-secret handling remain the operator's
responsibility.
