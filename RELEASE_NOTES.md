# Simploy v0 release notes

Simploy v0 initializes a deployment-ready project for one containerized web
application and one preconfigured VPS. Initialization creates the selected
application target, deployment assets, CI configuration, and optional external
service integration material.

## Supported integrations

- Applications: `nextjs` and `none`.
  - `nextjs` invokes the official `create-next-app` generator in `app/`.
  - `none` creates an empty `app/` directory.
- CI providers: GitHub Actions and GitLab CI/CD. Exactly one is selected per
  project.
- VPS preparation is available through documented manual steps, the bundled
  Debian/Ubuntu Bash script, or `simploy setup`. The command only runs that
  script; it does not deploy applications or install a VPS-side Simploy service.
- Next.js output includes a fixed `app/Dockerfile` and standalone output
  configuration for the generated CI and Compose contract.
- External services: Supabase for Next.js projects. It creates a connection
  contract in `services/supabase/`, a Supabase CLI-style application migration
  in `supabase/migrations/`, installs the official client packages, and adds
  browser/server/admin/auth/storage/session helpers in the generated
  application.

The generated CI workflow builds and pushes the application image to its
provider registry, resolves an immutable image digest, and deploys using the
committed Compose and Caddy assets. Simploy is not required after initialization.

## Operator prerequisites

The target VPS must already provide Docker, Docker Compose, OpenSSH, persistent
Caddy, and the external `simploy-ingress` Docker network. The operator must
provide the VPS-side environment values expected by the CI workflow without
inventing repository-specific paths.

Configure these protected CI values after initialization:

```text
VPS_HOST
VPS_USER
SSH_PRIVATE_KEY
SSH_KNOWN_HOSTS
```

`simploy/deploy.env` is committed and contains only `DOMAIN` and `APP_PORT`.
Runtime secrets belong in protected CI and runtime configuration, not in that
file.

## v0 limitations

- Simploy is init-only; CI performs deployment after initialization.
- The VPS does not run a Simploy service, deployment engine, or SSH gateway.
- Simploy does not provision or harden the VPS.
- Caddy remains persistent VPS infrastructure, outside the application Compose
  lifecycle.
- Supabase is external: the operator deploys, operates, upgrades, and backs it
  up. Simploy does not add Supabase infrastructure to Compose.
- v0 supports one application per repository and one preconfigured VPS.
- Supabase is not supported with the `none` application target.
