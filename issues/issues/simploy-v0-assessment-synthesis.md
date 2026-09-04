# Simploy v0 — Assessment Synthesis and Final Correction Plan

## Status

**v0 feature scope is frozen.**

Issue 17 is the final v0 feature issue.

Issue 18 — VPS service installation, including self-hosted Supabase infrastructure — is **v1** and must not be implemented as part of this correction.

The purpose of this document is to consolidate the three external assessments and identify only the work required to make the existing v0 implementation correct, internally consistent, distributable, and demonstrably deployable.

This document is a **correction plan**, not a replacement for the architecture or v0 specification.

---

# 1. Assessment Summary

Three independent assessments were performed:

- Claude — architecture, official documentation, security and engineering-practice review.
- Gemini — package structure, architecture and engineering-practice review.
- Perplexity — deeper source review plus execution of the toolchain and end-to-end technical assessment.

All three assessments found the project to have a strong engineering foundation.

The strongest positive findings are:

- clean modular architecture;
- dependency injection;
- separation of pure rendering from filesystem side effects;
- plan-before-write initialization;
- strict input validation;
- strong SSH security defaults;
- immutable application image deployment;
- SHA-pinned GitHub Actions;
- scoped CI permissions;
- non-root application containers;
- idempotent VPS setup;
- honest documentation of trust boundaries and operator responsibilities;
- explicit v0 limitations;
- meaningful automated tests.

The principal negative finding from the deeper review is more important than the package-quality observations:

> The individual components are generally well engineered, but the complete generated deployment path has not been sufficiently validated and currently contains integration-level blockers.

This is the focus of the final v0 correction phase.

---

# 2. What Is NOT Changing

The following decisions remain part of the v0 boundary.

## Product position

Simploy sits between a project boilerplate generator and a deployment tool.

It is intended for developers who understand the basics of VPS/Docker/CI operation and want repetitive production/deployment boilerplate removed without adopting a full deployment platform.

## v0 workflow

```text
Prepare VPS
    ↓
simploy init
    ↓
generated project
    ↓
git push
    ↓
GitHub/GitLab CI
    ↓
Docker image
    ↓
VPS
    ↓
Caddy
    ↓
application
```

## VPS setup

The developer may prepare the v0 VPS through:

1. manual instructions;
2. the bundled Bash setup script;
3. `simploy setup`, which runs the bundled Bash setup script.

`simploy setup` does **not** install a Simploy runtime, daemon, gateway, or deployment engine.

## Supabase

v0 supports the **application-side Supabase integration**.

v0 does **not** install or manage self-hosted Supabase infrastructure on the VPS.

Self-hosted service installation is deferred to v1.

## Explicitly deferred

Do not pull these into v0:

- self-hosted Supabase installation;
- generic VPS service installation;
- multisite/shared-stack management;
- staging/production environment management;
- gateways;
- automatic VPS hardening;
- deployment daemons;
- deployment engines;
- VPS fleet management;
- generic plugin systems;
- other Kamal/Mushak-style infrastructure management.

---

# 3. P0 — Correctness Blockers

These must be resolved before v0 can be considered complete.

## P0.1 — Caddy and Application Networking

The assessment reports a topology mismatch:

- VPS setup installs Caddy as a host systemd service;
- generated Caddy configuration proxies to the Docker service name `app`;
- the application does not publish its port to the host.

A host process cannot use Docker's embedded service-name DNS in the same way as a container attached to the Docker network.

### Required action

Inspect the authoritative architecture/specification and existing implementation and determine the intended v0 topology.

Then make all of the following consistent:

- Compose;
- Caddy configuration;
- VPS setup;
- deployment workflow;
- integration tests;
- documentation.

Do not redesign the architecture merely because another topology may be possible.

The final shipped topology and the integration-test topology must match.

---

## P0.2 — Integration Test Must Represent Production

The assessment reports that the current integration test runs Caddy as a Docker container while the shipped VPS setup uses host-level Caddy.

That means the test can pass while the actual shipped topology fails.

### Required action

After P0.1:

- test the actual shipped topology;
- remove the topology mismatch;
- make the integration test runnable in CI;
- ensure CI actually executes it;
- verify a real HTTP request reaches the generated application through the configured ingress.

Do not replace the real topology with a test-only architecture.

---

## P0.3 — Remote Deployment Variables

The assessment reports that:

```text
SIMPLOY_DEPLOY_PATH
SIMPLOY_CADDY_CONFIG_PATH
```

are expected by remote deployment scripts but are not reliably established in the non-interactive SSH environment.

### Required action

Inspect the existing deployment contract.

If these values are required, pass them explicitly through the SSH invocation/environment rather than relying on shell profiles.

Do not invent a new persistent environment-file contract unless the authoritative specification requires one.

---

## P0.4 — Non-Interactive Caddy Permissions

The assessment reports that CI uses privileged Caddy operations while the VPS setup only grants Docker-group access.

### Required action

Inspect exactly which privileged operations the deployment workflow performs.

Provide the minimum required non-interactive privilege mechanism consistent with the architecture.

If sudo is required, use narrowly scoped `NOPASSWD` permissions rather than broad unrestricted sudo access.

Document the resulting requirement.

---

## P0.5 — GitLab Production Deployment Branch

The assessment reports that GitHub restricts production deployment to the intended branch while GitLab does not.

### Required action

Make the GitLab production deployment obey the same intended production/default-branch boundary.

A feature branch must not deploy production.

---

## P0.6 — Supabase Application Integration

The assessment reports several concrete correctness problems in the v0 application-side Supabase integration:

- dynamic `process.env[name]` access prevents Next.js public-variable inlining;
- required build-time public variables are not correctly supplied;
- server-side runtime secrets lack a complete injection path;
- auth session refresh requires the appropriate Next.js proxy/middleware;
- migration naming does not match Supabase tooling expectations;
- migration SQL has correctness/idempotency issues.

### Required action

Fix the application integration according to the authoritative v0 specification and current official Supabase/Next.js behavior.

The result must include a complete path for:

- public client configuration;
- build-time public variables;
- server-side runtime secrets;
- auth session refresh;
- migrations.

Do **not** solve this by installing self-hosted Supabase infrastructure.

---

# 4. P1 — Strong v0 Corrections

## P1.1 — Application Restart

Add the restart behavior required by the existing production model so the application recovers after a VPS reboot or unexpected container exit.

The assessment specifically identifies:

```yaml
restart: unless-stopped
```

as the expected simple correction.

---

## P1.2 — Graceful Container Shutdown

Ensure the Node process receives termination signals correctly.

The current shell-wrapped command should be corrected so the application process is not unnecessarily hidden behind a shell PID 1.

---

## P1.3 — `.dockerignore`

Generate an appropriate `.dockerignore` with the Next.js Docker assets.

At minimum review exclusion of:

```text
node_modules
.next
.git
.env*
```

while ensuring required build files remain available.

---

## P1.4 — CI for Simploy

The Simploy repository itself must automatically validate its implementation.

Run the repository's relevant:

```text
typecheck
lint
test
build
```

and the real integration test once P0.2 is corrected.

Use the repository's existing CI approach.

Do not introduce another CI platform merely because one assessment used a different example.

---

## P1.5 — Package Hygiene

Verify the actual package artifact.

Check:

- whether `dist/` is committed to Git;
- the `package.json` `files` allowlist;
- runtime templates;
- setup script inclusion;
- README/license inclusion;
- exclusion of development-only material.

Do not assume that the source-tree contents and published-package contents are the same.

---

## P1.6 — Reproducibility

Review mutable generated/build inputs, especially:

- `create-next-app@latest`;
- `node:22-alpine`;
- GitLab build images.

Apply pinning where it is justified by the existing v0 security/reproducibility model.

Do not turn this into an unrelated dependency-management project.

---

# 5. CLI Correctness

## `--name`

The assessment reports that `--name` is collected and validated but does not affect the generated result.

Verify this against the implementation.

Then either:

- give `--name` its intended documented effect; or
- remove it.

Do not leave a user-facing argument that silently has no effect.

---

# 6. Findings to Evaluate Later

The assessments also identified valid improvements that do not need to become v0 blockers unless the authoritative specification already requires them.

Examples:

- healthchecks;
- post-deployment smoke tests;
- rollback;
- resource limits;
- Docker log limits;
- build caching;
- atomic initialization;
- improved package-manager detection;
- cross-platform support;
- stronger SSH key validation;
- additional CI hardening.

These are candidates for later work.

Do not automatically implement them merely because they appeared in an assessment.

---

# 7. Release Validation

After P0 and selected P1 corrections, validate the actual product path.

## 7.1 Clean initialization

Start from a clean directory and run the real CLI.

Verify:

- Next.js generation;
- Docker assets;
- Caddy assets;
- Compose;
- CI configuration;
- Supabase application integration when selected.

## 7.2 VPS setup

Verify all three v0 setup paths:

```text
manual instructions
       +
direct Bash script
       +
simploy setup
```

They should produce the same intended base VPS state.

## 7.3 Real deployment

Where a disposable supported VPS/VM is available, perform:

```text
fresh project
    ↓
simploy init
    ↓
git push
    ↓
CI
    ↓
image build
    ↓
VPS deployment
    ↓
Caddy
    ↓
HTTPS
    ↓
working application
```

The deployment must be tested against the actual shipped topology, not a simplified test topology.

## 7.4 Package installation

Build the distributable package and install it into a clean directory.

Verify:

```text
package
  ↓
install
  ↓
simploy --help
  ↓
simploy init
  ↓
simploy setup
```

The installed package must contain every runtime asset required by the CLI.

---

# 8. Definition of Done

v0 is complete when:

- [ ] The existing v0 architecture remains intact.
- [ ] Caddy and application networking work on the actual shipped VPS topology.
- [ ] Integration tests reproduce the shipped topology.
- [ ] Integration tests run in CI.
- [ ] Required remote deployment variables are explicitly available.
- [ ] Required Caddy operations work non-interactively.
- [ ] GitLab production deployment is branch-protected.
- [ ] Supabase application integration works as documented.
- [ ] Application containers restart appropriately.
- [ ] Container shutdown is graceful.
- [ ] `.dockerignore` is generated.
- [ ] Simploy's own CI runs its validation suite.
- [ ] Package contents are correct.
- [ ] `--name` is functional or removed.
- [ ] The installed package works from a clean environment.
- [ ] The real deployment workflow has been tested on a supported disposable VPS/VM.
- [ ] No v1/v2 infrastructure features have been pulled into v0.

---

# 9. Final Principle

The goal of this correction phase is **not to make Simploy bigger**.

It is to make the existing v0 promise true.

The three assessments do not justify redesigning Simploy. They justify finishing the integration between the components that already exist and proving the complete workflow works.

**Freeze the product. Fix the system. Test the real thing. Then release v0.**
