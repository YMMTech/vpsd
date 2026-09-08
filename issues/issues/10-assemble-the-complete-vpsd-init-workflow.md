# Issue 10 --- Assemble the Complete `simploy init` Workflow

## Summary

Integrate the previous initialization components into the complete v0
command.

After this issue, one `simploy init` execution creates the entire
initial project for a supported combination.

## Workflow

Conceptually:

``` text
simploy init
    ↓
collect Simploy choices
    ↓
validate choices
    ↓
plan managed paths
    ↓
detect conflicts
    ↓
confirm replacements where required
    ↓
create application
    ↓
create deployment assets
    ↓
create selected CI configuration
    ↓
create selected service integrations
    ↓
create/update root project support files
    ↓
finish
```

There is no required follow-up `simploy generate`.

## Required Output

Depending on selections, initialization produces the complete applicable
project structure, including:

``` text
app/
simploy/
├── deploy.env
├── compose.yml
└── Caddyfile
services/
selected CI file(s)
root support files such as .gitignore where required
```

Only one CI provider is generated.

## `.gitignore`

The generated/updated root `.gitignore` must protect actual
secret-bearing local/runtime environment files where appropriate while
not ignoring the intentionally committed:

``` text
simploy/deploy.env
```

The implementation must avoid a broad rule that accidentally excludes
the deployment configuration source of truth.

## Completion Output

On success, the CLI should state the concrete next steps needed to use
the initialized project, particularly:

-   review the generated project;
-   configure the required CI secrets:
    -   `VPS_HOST`
    -   `VPS_USER`
    -   `SSH_PRIVATE_KEY`
    -   `SSH_KNOWN_HOSTS`
-   commit/push when ready.

Do not imply that Simploy itself will deploy the project.

## Acceptance Criteria

-   [ ] One init command creates the complete project.
-   [ ] No `generate` step is required.
-   [ ] Core deployment assets are always generated.
-   [ ] Exactly one selected CI provider is generated.
-   [ ] Application selection is honored.
-   [ ] Service selection is honored.
-   [ ] `deploy.env` contains the selected domain/port.
-   [ ] `.gitignore` does not accidentally ignore `simploy/deploy.env`.
-   [ ] Success output explains CI secret setup without collecting
    secrets.
-   [ ] End-to-end initialization tests cover representative
    combinations.
