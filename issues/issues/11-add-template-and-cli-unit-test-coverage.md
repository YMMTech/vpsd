# Issue 11 --- Add Template and CLI Unit Test Coverage

## Summary

Build comprehensive automated tests around Simploy's own
responsibilities: input handling, project planning, filesystem output,
and generated templates.

This issue does not test Simploy as a deployment daemon because no such
runtime exists.

## CLI Tests

Cover:

-   defaults;
-   full interactive input;
-   partial flags;
-   fully specified flags;
-   invalid application;
-   invalid CI provider;
-   invalid service;
-   invalid port;
-   `--app-default`;
-   conflict confirmation;
-   conflict decline;
-   cancellation.

## Filesystem Tests

Verify exact expected output for representative combinations:

``` text
nextjs + github + none
nextjs + github + supabase
nextjs + gitlab + none
nextjs + gitlab + supabase
none + github + none
none + gitlab + none
```

Add additional combinations where service compatibility requires them.

## Template Tests

Assert important properties rather than only snapshots.

Examples:

-   `deploy.env` contains only `DOMAIN` and `APP_PORT`;
-   selected domain/port are propagated correctly;
-   Compose references `simploy-ingress`;
-   application port is not publicly bound;
-   Caddy is not an application Compose service;
-   GitHub workflow expects the correct secret names;
-   GitLab pipeline expects the correct variable names;
-   SSH host verification is not disabled;
-   immutable image identity is used;
-   GitHub production deployment is serialized;
-   GitLab production deployment uses `resource_group`;
-   Supabase is not added as deployable Compose infrastructure.

Snapshots may supplement these assertions but must not replace semantic
checks.

## Acceptance Criteria

-   [ ] Unit tests cover all defined CLI inputs.
-   [ ] Filesystem tests cover representative project variants.
-   [ ] Security-sensitive template properties have explicit assertions.
-   [ ] Tests verify rejected/out-of-scope behavior where useful.
-   [ ] `pnpm test` passes consistently.
