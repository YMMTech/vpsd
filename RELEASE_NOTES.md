# VPSD 0.1.0 — prepared release notes (unpublished)

VPSD v0 initializes a deployment-ready project for one containerized web
application and one preconfigured VPS. Initialization creates the selected
application target, deployment assets, CI configuration, and optional external
service integration material.

## Supported integrations

- Applications: `nextjs` and `none`.
  - `nextjs` invokes the official `create-next-app` generator in `app/` with
    `--disable-git`.
  - `none` creates an empty `app/` directory.
- Initialization creates one Git repository at the project root after all
  generated project files are prepared; nested application repositories are
  not created.
- CI providers: GitHub Actions and GitLab CI/CD. Exactly one is selected per
  project.
- VPS preparation is available through documented manual steps, the bundled
  Debian/Ubuntu Bash script, or `vpsd setup`. The command elevates the
  bundled installed script with `sudo` when necessary; it does not deploy
  applications or install a VPS-side VPSD service. Compatible existing
  Docker Engine and Compose v2 installations are retained rather than migrated.
- Next.js output includes a fixed `app/Dockerfile` and standalone output
  configuration for the generated CI and Compose contract.
- External services: Supabase for Next.js projects. It creates a connection
  contract in `services/supabase/`, a Supabase CLI-style application migration
  in `supabase/migrations/`, installs the official client packages, and adds
  browser/server/admin/auth/storage/session helpers in the generated
  application.

The generated CI workflow builds and pushes the application image to its
provider registry, resolves an immutable image digest, and deploys using the
committed Compose and Caddy assets. VPSD is not required after initialization.

## Operator prerequisites

Before deployment, prepare the target VPS with `vpsd setup` or equivalent operator-managed prerequisites: Docker, Docker Compose, OpenSSH, persistent
Caddy, and the external `vpsd-ingress` Docker network. The operator must
provide the VPS-side environment values expected by the CI workflow without
inventing repository-specific paths.

Configure these protected CI values after initialization:

```text
VPS_HOST
VPS_USER
SSH_PRIVATE_KEY
SSH_KNOWN_HOSTS
```

`vpsd/deploy.env` is committed and contains only `DOMAIN` and `APP_PORT`.
Runtime secrets belong in protected CI and runtime configuration, not in that
file.

Generated deployment CI defaults to `/home/vpsd/app`,
`/etc/caddy/Caddyfile`, and SSH port `22`. Operators can override these with
`VPSD_DEPLOY_PATH`, `VPSD_CADDY_CONFIG_PATH`, and `VPS_PORT`.

## v0 limitations

- VPSD provides `init` and explicit `setup`; CI performs deployment after initialization.
- The VPS does not run a VPSD service, deployment engine, or SSH gateway.
- VPSD does not provision or harden the VPS.
- Caddy remains persistent VPS infrastructure, outside the application Compose
  lifecycle.
- Supabase is external: the operator deploys, operates, upgrades, and backs it
  up. VPSD does not add Supabase infrastructure to Compose.
- v0 supports one application per repository and one preconfigured VPS.
- Supabase is not supported with the `none` application target.

## Release preparation and validation

Product: VPSD (VPS Deployment). Package and CLI: `vpsd`. Intended version: `0.1.0`; future tag: `v0.1.0`. These notes are prepared privately, not published.

The deployment path has passed two real end-to-end rounds. Issue 21's corrected deployment returned HTTP 200 through Caddy, and its regression coverage is present. Issue 22 captures the second installation/deployment round. This release preparation verifies the actual packed artifact, without another live VPS deployment.

Deployment filenames, host defaults, and variables now use `vpsd`/`VPSD_*`; existing installations need [coordinated migration](docs/release-preparation.md#deployment-names-and-migration). Application health checks and automatic rollback are not implemented. GitHub and GitLab application deployment templates remain supported.

Publication, the final GitHub destination, and registry-level checks are separate future steps in the [release checklist](docs/release-preparation.md).
