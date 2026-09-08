# VPSD v0.1.1

Prepared corrective release notes — not yet published.

This is a **packaging/distribution correction**, not a feature release. VPSD v0.1.0 was the first GitHub release; it remains valid and immutable. npm rejected the unscoped name `vpsd` as too similar to existing package names before publication, so version 0.1.0 was never published to npm.

Version 0.1.1 changes the npm package to **`@younmon/vpsd`** and is intended to be the first npm-published VPSD version. After publication, install it with:

```bash
npm install -g @younmon/vpsd
```

The command remains:

```bash
vpsd
```

The product remains VPSD (VPS Deployment), repository [YMMTech/vpsd](https://github.com/YMMTech/vpsd), author Youness Mondir, and license MIT. No deployment architecture or runtime behavior changed. One-application/one-VPS scope, both GitHub and GitLab deployment providers, Docker Compose, Caddy, and the existing security properties remain unchanged. No health checks, rollback, or orchestration features were added.

The corrective candidate is validated with the 75-test suite, local Docker/Compose/Caddy integration, typecheck, lint, build, and isolated installation of the exact scoped tarball, including both init providers and Issue 21 corrections. Hosted CI on the final corrective commit remains a pre-tag gate after commit/push. Prior successful live VPS deployments remain valid; no third deployment is required.

The v0.1.0 tag, GitHub Release, and assets must not be modified or reused. The new intended tag/title are `v0.1.1` / **VPSD v0.1.1**. See the [changelog](CHANGELOG.md) and [release procedure](docs/release-preparation.md).
