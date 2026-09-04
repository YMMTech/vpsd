# Simploy v0

Simploy is a project initializer for one containerized web application and one
preconfigured VPS. A single `simploy init` run creates the selected application
target, deployment assets, CI configuration, and optional service integration
material.

Simploy initializes projects and can run an operator-controlled VPS bootstrap
script. It is not installed as a deployment service on the VPS, and CI does
not need to install or run Simploy after initialization. The generated GitHub
Actions workflow or GitLab CI/CD pipeline performs deployment.

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
- the external Docker network `simploy-ingress`, used by the application
  deployment;
- operator-provided values for the `SIMPLOY_DEPLOY_PATH` and
  `SIMPLOY_CADDY_CONFIG_PATH` environment variables used by the generated CI
  workflow. Simploy does not prescribe their paths.

## Prepare a VPS

The reference setup supports Debian and Ubuntu hosts using APT. It prepares
Docker Engine, Docker Compose v2, Caddy as a persistent systemd service, a CI
deployment user, and the shared `simploy-ingress` network. It does not deploy
an application, create CI secrets, generate SSH keys, configure an
application-specific Caddyfile, or change firewall policy.

The default deployment user is `simploy`; set `DEPLOY_USER` to choose another
account. Docker access is effectively privileged access. After granting the
Docker group, the deployment user must start a new login session before the
membership takes effect.

Choose one of these equivalent paths.

### Run the bundled script

Download or copy [`src/setup/setup-vps.sh`](src/setup/setup-vps.sh) from the
Simploy release you trust, review it, then run it as root:

```bash
sudo DEPLOY_USER=simploy bash setup-vps.sh
```

The script is safe to rerun: it reuses an operational Docker Engine and
Compose v2 installation (including Ubuntu's `docker.io` +
`docker-compose-v2` pair), the deployment account, `authorized_keys`, and
`simploy-ingress` rather than resetting them. It installs Docker's official
packages only when Docker is missing; it does not migrate a compatible
installation just to change package source.

### Run through the installed CLI

`setup` is a convenience wrapper for that exact bundled Bash script; it does
not duplicate the setup logic in TypeScript.

```bash
pnpm add -g simploy
DEPLOY_USER=simploy simploy setup
```

When invoked by a normal user, the CLI uses `sudo` to run the bundled script's
installed package path. `sudo simploy setup` is not required. If the Caddy
configuration path is needed, pass it in the same way:

```bash
DEPLOY_USER=simploy SIMPLOY_CADDY_CONFIG_PATH=/your/caddy/configuration/Caddyfile simploy setup
```

### Manual equivalent

Run these commands as an operator on the Debian/Ubuntu VPS. If `docker
--version`, `docker compose version`, and `systemctl is-active docker` already
succeed, retain that compatible Docker installation and skip the Docker CE
installation commands below. In particular, do not install Docker's
`docker-compose-plugin` alongside Ubuntu's `docker-compose-v2`. For a host
without Docker, the following uses Docker's official APT repository and
Caddy's official package distribution.

```bash
export DEPLOY_USER=simploy
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg debian-keyring \
  debian-archive-keyring apt-transport-https openssh-server
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg" \
  | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin caddy
sudo systemctl enable --now docker caddy ssh
sudo id "$DEPLOY_USER" >/dev/null 2>&1 || sudo useradd --create-home --shell /bin/bash "$DEPLOY_USER"
sudo usermod -aG docker "$DEPLOY_USER"
sudo install -d -m 0700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" \
  "$(getent passwd "$DEPLOY_USER" | cut -d: -f6)/.ssh"
sudo docker network inspect simploy-ingress >/dev/null 2>&1 \
  || sudo docker network create simploy-ingress
```

Add the CI deployment public key to the deployment user's `.ssh/authorized_keys`
through your normal SSH-key process. Do not replace existing authorized keys,
generate or copy private keys to the VPS, or disable host-key verification.
Configure the persistent Caddy service using your operator-chosen Caddy
configuration location; Simploy does not mandate an application Caddy path.
Pass that existing location explicitly when running setup, for example:

```sh
sudo DEPLOY_USER=simploy SIMPLOY_CADDY_CONFIG_PATH=/your/caddy/configuration/Caddyfile \
  bash setup-vps.sh
```

This installs the narrow non-interactive Caddy permission required by CI.

Public `80/tcp` and `443/tcp` must reach Caddy. Do not publicly expose an
application port merely because an application is deployed. Review your
firewall policy yourself; the setup script does not alter it.

Verify the prepared host with:

```bash
docker --version
docker compose version
systemctl is-active docker
caddy version
systemctl is-active caddy
id "$DEPLOY_USER"
docker network inspect simploy-ingress
```

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
`simploy-ingress` network and binds its port only to VPS loopback. Persistent
host Caddy proxies to that loopback binding, so the application is not publicly
reachable directly and Caddy remains outside the application Compose service.

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

The existing VPS configuration values `SIMPLOY_DEPLOY_PATH` and
`SIMPLOY_CADDY_CONFIG_PATH` must be configured as protected CI variables. The
generated workflow passes them explicitly over SSH; it does not rely on remote
shell profiles. For Supabase projects also configure the public CI variables
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, plus the
protected `SUPABASE_SERVICE_ROLE_KEY` only when server-side admin operations
need it. Public values are supplied to the image build; runtime values are
written only to a restrictive VPS `runtime.env` file.

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
Supabase is selected, Simploy copies its connection contract to
`services/supabase/`, adds the official `@supabase/supabase-js` and
`@supabase/ssr` packages to the generated Next.js application, and adds
browser, server, admin, authentication, storage, and session-refresh proxy
helpers under `app/lib/supabase/` (with `app/proxy.ts`). The application-owned
starter migration is at `supabase/migrations/` using the Supabase CLI timestamp
naming convention. The generated service documentation explains the required
runtime values and client libraries. Review and apply the migration through the
process used for your external Supabase instance.

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
