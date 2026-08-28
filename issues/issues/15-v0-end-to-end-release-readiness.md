# Issue 15 --- v0 End-to-End Release Readiness

## Summary

Perform the final v0 verification against the consolidated architecture
before tagging the release.

The purpose is to prove that Simploy initializes a project matching the
specification, not to add new architecture.

## Verification Matrix

At minimum verify:

  App       CI       Service
  --------- -------- ----------
  Next.js   GitHub   none
  Next.js   GitHub   Supabase
  Next.js   GitLab   none
  Next.js   GitLab   Supabase
  none      GitHub   none
  none      GitLab   none

Additional supported combinations must be included if implemented.

## Verify Project Output

For every applicable combination:

-   project structure is correct;
-   only selected CI provider exists;
-   `simploy/deploy.env` is present;
-   `DOMAIN` and `APP_PORT` are correct;
-   no secret values are committed;
-   Compose/Caddy assets are present;
-   service integration matches the selected application;
-   no obsolete Simploy config/generation/runtime files exist.

## Verify Quality Gates

Required project-level checks must pass:

``` text
format/lint
typecheck
unit tests
integration tests
build
```

## Architecture Audit

Explicitly confirm before release:

-   Simploy is init-only;
-   no VPS daemon/gateway exists;
-   no deployment command exists;
-   no `simploy.config.yml` exists;
-   no generate/validate workflow exists;
-   CI performs deployment;
-   Caddy remains persistent VPS infrastructure;
-   Docker Compose deploys only the application-side runtime;
-   Supabase remains external;
-   `deploy.env` contains no secrets;
-   production SSH secret names match the documented contract;
-   test ingress network is `simploy-integration-test-ingress`.

## Release Documentation

Prepare the v0 release notes with:

-   supported application integrations;
-   supported CI providers;
-   supported service integrations;
-   VPS prerequisites;
-   known v0 limitations.

Do not market out-of-scope capabilities as future-proof guarantees.

## Acceptance Criteria

-   [ ] Verification matrix passes.
-   [ ] All quality gates pass.
-   [ ] Architecture audit finds no stale implementation from previous
    designs.
-   [ ] Documentation matches implementation.
-   [ ] v0 limitations are explicit.
-   [ ] Repository is ready for the v0 release/tag.
