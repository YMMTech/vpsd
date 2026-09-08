# Changelog

Release versions follow the [versioning and tag policy](docs/release-preparation.md#versioning-and-tag-policy). `package.json` is the authoritative package version. Entries describe implemented changes; this release is prepared but not yet published.

## [0.1.0] - 2026-09-08

### Added

- `vpsd init` creates one application repository, deployment configuration, and the selected CI workflow.
- `vpsd setup` prepares supported Debian/Ubuntu VPS prerequisites: OpenSSH, Docker Engine, Docker Compose v2, persistent Caddy, a deployment account, and ingress network.
- GitHub Actions and GitLab CI deployment generation, using each provider's registry and deployment serialization.
- Docker Compose runs one application on one VPS; persistent host Caddy supplies public ingress and HTTPS.
- Next.js reference application with standalone output and a non-root production container. The `none` target creates an empty application directory for user-supplied code.
- Optional external Supabase integration for Next.js, with client/server helpers and application migration material; VPSD does not operate Supabase.
- Immutable image digest deployment, strict SSH host-key verification, scoped sudo for Caddy operations, and private application port binding to VPS loopback.
- MIT licensing, author Youness Mondir, and canonical repository metadata for `YMMTech/vpsd`.

### Validated

- 75 unit/regression tests passing; the separate Docker/Compose/Caddy integration test passing.
- Two successful end-to-end VPS deployments, including HTTP 200 through Caddy, recorded in Issues 21 and 22.
- Packed-artifact installation smoke test and GitHub/GitLab initialization/deployment-path checks passing, including Issue 21 corrections.
- Hosted GitHub CI passed on the current pushed candidate baseline `55fc4fabf87b810c61d6a489b42478e17de7d1b6`: [VPSD quality run](https://github.com/YMMTech/vpsd/actions/runs/34210000936). Final release-preparation changes must pass hosted CI on their exact committed SHA before tagging; the baseline result does not cover uncommitted changes.

### Scope

One application, one VPS. No automatic application health checks, automatic rollback, multi-VPS support, daemon/control plane, or additional orchestrator. General infrastructure provisioning and OS hardening remain operator responsibilities.
