# Issue 08 --- Implement the Next.js Application Initializer

## Summary

Implement the v0 reference application integration using the official
Next.js `create-next-app` generator.

## Behavior

When:

``` bash
pnpm simploy init --app nextjs
```

is selected, Simploy invokes official `create-next-app` to create the
application inside:

``` text
app/
```

## Interactive Mode

Without `--app-default`, the official framework prompts remain
available.

Simploy must not recreate or rename the entire `create-next-app` option
surface.

## Default Mode

When:

``` bash
pnpm simploy init --app nextjs --app-default
```

is used, Simploy invokes `create-next-app` using its
default/non-interactive behavior appropriate to the supported version.

## Simploy Additions

After successful application creation, Simploy may add only the
files/configuration required by Simploy and selected service
integrations.

The application remains a normal Next.js project rather than a custom
Simploy framework fork.

## Failure Boundary

If the external application generator fails, initialization must report
that failure clearly.

Do not pretend the application was initialized successfully.

## Out of Scope

-   reimplementing `create-next-app`;
-   supporting every historical Next.js version;
-   modifying arbitrary existing Next.js repositories;
-   framework-specific deployment runtime on the VPS.

## Acceptance Criteria

-   [ ] Next.js selection invokes official `create-next-app`.
-   [ ] Target directory is `app/`.
-   [ ] Normal framework prompts remain available.
-   [ ] `--app-default` supports the non-interactive/default path.
-   [ ] Simploy does not duplicate the full Next.js CLI surface.
-   [ ] Generator failure is surfaced.
-   [ ] Tests cover invocation construction and post-generation
    integration boundaries.
