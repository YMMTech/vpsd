# Issue 16 — Feedback & v0 Refactor

## Summary

Refine the v0 implementation based on the first end-to-end developer workflow review and the gaps identified during actual initialization testing.

This issue is a focused refactor and completeness pass. It must not introduce a new deployment platform, runtime, or premature extensibility system.

## Goals

- Make the Next.js output actually deployable by providing the required Docker build configuration.
- Configure Next.js for standalone output.
- Refactor Supabase from being coupled to the Next.js initializer into the built-in service-integration model.
- Expand the Supabase integration from connection helpers to useful developer boilerplate for authentication, storage, and database migrations.
- Preserve the init-only architecture and the existing VPS/CI boundaries.
- Keep the built-in integration model simple; do not implement third-party plugin discovery.

## Scope

### 1. Next.js Docker build support

The Next.js application initializer must provide the Docker build configuration required by the generated CI workflow.

Requirements:

- Add a bundled Next.js Dockerfile template.
- Generate the Dockerfile as part of the Next.js initialization.
- Configure the generated Next.js project for `output: "standalone"`.
- The Dockerfile must use the resulting standalone build output.
- The Dockerfile must be suitable for the generated application and the existing Compose/CI contract.
- Keep the Dockerfile as a fixed bundled template rather than constructing it programmatically.

### 2. Supabase as a built-in service

Supabase must be represented as a service integration rather than being hard-wired into the Next.js initializer.

The architecture should allow:

    application: nextjs
    services:
      - supabase

The Next.js initializer itself must not contain Supabase-specific initialization logic.

The built-in Supabase service owns the files and dependencies it contributes.

`none + supabase` remains unsupported if that is the existing v0 compatibility rule.

### 3. Supabase developer boilerplate

The Supabase service must provide useful application-level boilerplate rather than only connection helpers.

At minimum evaluate and implement the v0 material required for:

- browser/client Supabase access;
- server-side Supabase access;
- authentication;
- storage access;
- database migrations.

The generated material must follow the existing Next.js application architecture.

Credentials and secrets must not be committed.

Supabase remains an external service. Simploy does not deploy, provision, upgrade, back up, or manage the Supabase infrastructure.

Database migrations are application-owned migration material intended to be applied to the external Supabase instance.

### 4. Built-in templates remain the v0 extension model

Do not implement:

- `--templates`;
- external template loading;
- third-party plugin discovery;
- plugin package loading;
- a generalized plugin registry.

The v0/v1 approach is to ship curated built-in integrations. Developers who need different defaults can fork/modify the package.

A formal plugin mechanism can be designed later if real developer demand justifies it.

## Non-Goals

This issue does not add:

- staging/production environment management;
- multiple deployment targets;
- VPS provisioning;
- VPS hardening;
- a Simploy daemon;
- a deployment gateway;
- a deployment command;
- deployment orchestration;
- health-check behavior beyond an already-defined contract;
- rollback behavior beyond an already-defined contract;
- a generic template composition engine.

## Tests

Add or update tests to verify:

1. A `nextjs` initialization generates the Dockerfile.
2. The generated Next.js configuration uses standalone output.
3. The Dockerfile is sourced from the bundled template.
4. A `nextjs + github + none` project contains the required Docker build assets.
5. A `nextjs + github + supabase` project receives the Supabase dependency and service-owned files.
6. Supabase integration is not embedded in the Next.js initializer.
7. Authentication, storage, and migration boilerplate is generated as specified.
8. No credentials or secret values are written to committed generated files.
9. Existing `none` and GitLab initialization paths remain functional.

## Acceptance Criteria

- [ ] Next.js initialization generates a production-usable Dockerfile.
- [ ] Generated Next.js configuration uses `output: "standalone"`.
- [ ] The Dockerfile is a bundled fixed template.
- [ ] Supabase is implemented as a built-in service integration.
- [ ] Next.js initialization contains no Supabase-specific integration logic.
- [ ] Supabase provides the required auth, storage, client, server, and migration boilerplate.
- [ ] Supabase credentials are not committed.
- [ ] The existing CI/deployment contract remains intact.
- [ ] No staging/prod environment system is introduced.
- [ ] No generic plugin/template-extension mechanism is introduced.
- [ ] Existing v0 initialization paths continue to pass their tests.
- [ ] Documentation is updated where the behavior changes.

## Implementation Boundary

This issue exists because actual v0 testing exposed missing functionality. Resolve those concrete gaps without expanding Simploy into a deployment platform or generalized plugin framework.

The existing architecture, consolidated specification, and implemented v0 behavior remain authoritative except where this issue explicitly changes them.
