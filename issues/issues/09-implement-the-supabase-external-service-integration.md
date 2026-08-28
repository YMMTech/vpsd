# Issue 09 --- Implement the Supabase External-Service Integration

## Summary

Implement Supabase as the v0 reference **external service integration**.

This issue must preserve the service boundary: Simploy prepares the
project to connect to Supabase but does not deploy or operate Supabase.

## Service Structure

Selecting Supabase creates service integration material under:

``` text
services/supabase/
```

This area contains the service-side integration contract/documentation
required by the initialized project.

Framework-specific runtime helpers belong in:

``` text
app/
```

not in `services/supabase/`.

## Next.js Integration

For a Next.js application, initialization adds the appropriate Supabase
client/server integration helpers to the generated application.

The integration must respect Next.js server/client boundaries.

## Credentials

Real Supabase credentials must not be committed.

Required runtime values are documented by the generated integration and
supplied through the project's runtime-secret/CI mechanism.

The integration must distinguish intentionally public browser
configuration from private server-side secrets where applicable.

## Explicit Non-goals

Simploy must not:

-   install Supabase;
-   download/copy a Supabase self-hosted Compose stack as deployment
    infrastructure;
-   deploy Supabase to the VPS;
-   create Supabase volumes/networks;
-   upgrade Supabase;
-   back up Supabase;
-   manage Supabase lifecycle.

## Compatibility

If Supabase is selected with an application mode for which v0 has no
integration implementation, init must fail clearly or generate only a
deliberately defined framework-independent contract.

It must not generate fake framework-specific support.

## Acceptance Criteria

-   [ ] `--services supabase` is supported.
-   [ ] `services/supabase/` contains the defined integration contract.
-   [ ] Next.js selection receives framework-appropriate Supabase
    helpers.
-   [ ] Real credentials are never written into committed files.
-   [ ] Supabase is absent from the application's Compose deployment.
-   [ ] No Supabase lifecycle/deployment code exists.
-   [ ] Tests verify generated structure and absence of committed
    secrets.
