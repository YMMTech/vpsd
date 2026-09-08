# Changelog

Release versions follow the [versioning and tag policy](docs/release-preparation.md#versioning-and-tag-policy). `package.json` is the authoritative package version. Entries describe implemented changes; v0.1.0 is published on GitHub, while v0.1.1 is prepared but not yet published.

## [0.1.1] - 2026-09-08

### Changed

- Changed npm distribution identity from the unavailable unscoped `vpsd` name to `@younmon/vpsd`; npm rejected `vpsd` as too similar to existing package names before publication.
- Updated installation instructions and package-artifact validation for the scoped package. The installed command remains `vpsd`; the product remains VPSD and repository remains `YMMTech/vpsd`.
- Packaging/distribution correction only: no deployment architecture or runtime behavior changed.

### Release history

VPSD v0.1.0 was the first GitHub release and remains valid and immutable. No npm publication of 0.1.0 occurred. Version 0.1.1 is intended to be the first npm-published VPSD version; do not publish `@younmon/vpsd@0.1.0` or replace any v0.1.0 tag/assets.

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
