# Issue 02 --- Define and Implement `simploy init` Input Collection

## Summary

Implement the complete Simploy-specific input contract for:

``` bash
pnpm simploy init
```

This issue gathers and validates user choices but does not yet create
the complete project.

## Inputs

`init` gathers:

1.  project name;
2.  application;
3.  CI provider;
4.  services;
5.  domain;
6.  application port.

## Defaults

``` text
project name: simplapp
domain:       app.localhost
port:         3000
```

## Application Choices

``` text
nextjs
none
```

## CI Choices

Exactly one:

``` text
github
gitlab
```

There is no `none` CI option.

## Service Choices

Services are optional and structurally support multiple selections.

v0 implemented service:

``` text
supabase
```

`none` is valid.

## CLI Flags

Support at least:

``` bash
pnpm simploy init --name my-project
pnpm simploy init --app nextjs
pnpm simploy init --app none
pnpm simploy init --domain example.com
pnpm simploy init --port 3000
pnpm simploy init --services supabase
```

Multiple services may use the same option contract, for example:

``` bash
pnpm simploy init --services supabase,another-service
```

Only actually implemented service identifiers may be accepted.

For Next.js:

``` bash
pnpm simploy init --app nextjs --app-default
```

must request framework defaults rather than interactive
`create-next-app` questions.

## Interactive Behavior

CLI flags pre-answer their corresponding prompts.

Only missing Simploy choices are prompted.

If all required Simploy choices are supplied, Simploy does not require a
final Simploy confirmation.

Framework-specific prompting remains separate from Simploy prompting.

## Validation

At minimum:

-   project name must be usable for project initialization;
-   application must be a supported identifier;
-   CI provider must be exactly one supported provider;
-   selected services must be implemented identifiers;
-   domain must be non-empty and suitable for generated configuration;
-   port must be a valid TCP port number.

Do not silently correct invalid values into different values.

## Out of Scope

-   writing project files;
-   `create-next-app` execution;
-   repository conflict handling;
-   CI generation;
-   service integration generation.

## Acceptance Criteria

-   [ ] All six Simploy choices can be collected interactively.
-   [ ] Every defined CLI flag pre-answers its prompt.
-   [ ] Partial flags prompt only for missing choices.
-   [ ] Fully specified Simploy choices require no final Simploy
    confirmation.
-   [ ] `--app-default` is accepted only where meaningful.
-   [ ] CI provider is mandatory.
-   [ ] `none` services are supported.
-   [ ] Invalid identifiers/ports fail clearly.
-   [ ] Unit tests cover interactive, partial-flag, and fully specified
    input paths.
