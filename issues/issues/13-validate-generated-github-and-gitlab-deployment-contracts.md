# Issue 13 --- Validate Generated GitHub and GitLab Deployment Contracts

## Summary

Add focused tests/review fixtures for the generated CI workflows so the
generated deployment contract remains consistent with the architecture.

This is validation of **generated files**, not a `simploy validate` CLI
command.

## GitHub Contract Checks

Verify that the generated workflow:

-   uses the selected registry;
-   builds/pushes the application image;
-   deploys an immutable digest;
-   expects:
    -   `VPS_HOST`
    -   `VPS_USER`
    -   `SSH_PRIVATE_KEY`
    -   `SSH_KNOWN_HOSTS`;
-   performs host-key verification;
-   uses production concurrency;
-   does not require Simploy on the VPS;
-   consumes `simploy/deploy.env`;
-   uses the generated Compose/Caddy assets.

## GitLab Contract Checks

Verify the equivalent properties and:

-   `.gitlab-ci.yml` location;
-   GitLab registry integration;
-   production `resource_group`.

## Negative Assertions

Both providers must be checked for absence of:

-   `StrictHostKeyChecking=no`;
-   secret values embedded in generated YAML;
-   self-hosted production runner requirement;
-   Simploy server/daemon invocation;
-   Supabase deployment steps;
-   mutable tag as the sole release identity.

## Acceptance Criteria

-   [ ] GitHub generated contract is explicitly tested.
-   [ ] GitLab generated contract is explicitly tested.
-   [ ] Security-sensitive negative assertions are present.
-   [ ] CI templates remain provider-specific but behaviorally
    equivalent where the architecture requires equivalence.
