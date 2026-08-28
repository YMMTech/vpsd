# Issue 07 --- Implement the `none` Application Initializer

## Summary

Support projects that want Simploy deployment scaffolding without a
framework-specific application generator.

## Behavior

When:

``` bash
pnpm simploy init --app none
```

is selected, Simploy creates:

``` text
app/
```

as an empty application directory.

All other selected Simploy project assets are still generated:

-   `simploy/`;
-   selected CI configuration;
-   `services/` integrations where compatible;
-   root project files managed by Simploy.

## Requirements

The `none` application option must not:

-   invoke `create-next-app`;
-   assume Next.js paths;
-   add Next.js dependencies;
-   add framework-specific application files.

Service integrations that require framework-specific generation must
either have a defined framework-independent output or reject an
unsupported combination clearly.

## Acceptance Criteria

-   [ ] `--app none` creates an empty `app/`.
-   [ ] Core deployment assets are still created.
-   [ ] Selected CI configuration is still created.
-   [ ] No Next.js dependency/files are generated.
-   [ ] Unsupported service/application combinations fail clearly rather
    than producing broken integration code.
-   [ ] Tests cover `none` with both CI providers and supported service
    selections.
