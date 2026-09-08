# VPSD v0.1.0

Prepared release notes — not yet published.

VPSD (VPS Deployment) prepares **one containerized application on one VPS**. `vpsd init` generates the application and deployment assets for either **GitHub Actions or GitLab CI**, and `vpsd setup` prepares OpenSSH, Docker Engine, Docker Compose, and persistent Caddy on supported Debian/Ubuntu hosts.

CI builds and pushes the application image, deploys its immutable digest with Docker Compose, and validates/reloads host Caddy for ingress and HTTPS. Next.js is the reference application; optional Supabase integration connects to an external instance.

Security properties include strict SSH host-key verification, scoped sudo for Caddy operations, a non-root Next.js application container, and loopback-only application port binding. Credentials remain separate from committed deployment settings.

Validation: 75 unit/regression tests and the Docker/Compose/Caddy integration test passed; the exact packed artifact installs and initializes both providers with the Issue 21 corrections. The full deployment path has passed twice, including HTTP 200 through Caddy. [Hosted GitHub CI passed](https://github.com/YMMTech/vpsd/actions/runs/34210000936) on candidate baseline `55fc4fabf87b810c61d6a489b42478e17de7d1b6`; the final release-preparation commit must also pass before tagging.

v0 does not implement automatic health checks, automatic rollback, multi-VPS orchestration, or a daemon. Supabase hosting, cloud provisioning, DNS/firewall policy, and general OS hardening remain operator responsibilities. The `none` application target requires user-supplied code and a Dockerfile.

Package/CLI: `vpsd`; package version: `0.1.0`; intended annotated tag: `v0.1.0`. MIT licensed, copyright © 2026 Youness Mondir. Repository: [YMMTech/vpsd](https://github.com/YMMTech/vpsd). See the [changelog](CHANGELOG.md), [installation guide](docs/installation.md), and [release procedure](docs/release-preparation.md).
