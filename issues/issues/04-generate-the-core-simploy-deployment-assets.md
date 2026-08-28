# Issue 04 --- Generate the Core Simploy Deployment Assets

## Summary

Generate the complete core deployment directory:

``` text
simploy/
├── deploy.env
├── compose.yml
└── Caddyfile
```

These files are directly used by the generated CI workflow. There is no
later `simploy generate` step.

## `deploy.env`

Generate:

``` env
DOMAIN=<selected-domain>
APP_PORT=<selected-port>
```

Defaults:

``` env
DOMAIN=app.localhost
APP_PORT=3000
```

### Rules

`deploy.env`:

-   is intentionally committed;
-   contains only non-secret stable deployment configuration;
-   is the source of truth for `DOMAIN` and `APP_PORT`;
-   must not contain SSH credentials;
-   must not contain runtime application secrets;
-   must not contain the release image digest;
-   replaces the earlier `.env`/`.env.example`/`simploy.config.yml`
    concepts.

## Docker Compose

Generate `simploy/compose.yml`.

It must:

-   consume the stable values from `simploy/deploy.env`;
-   run the application image supplied by CI;
-   use the immutable release image reference supplied at deployment
    time;
-   expose the application's HTTP port internally;
-   not publish the application port publicly on the VPS;
-   attach the application to the external production ingress network:

``` text
simploy-ingress
```

It must not:

-   run Caddy as part of the application Compose lifecycle;
-   mount the Docker socket into the application;
-   generate a privileged application container by default;
-   deploy Supabase.

## Caddy

Generate `simploy/Caddyfile`.

It must:

-   use the same `DOMAIN` value originating from `simploy/deploy.env`;
-   route traffic to the application over `simploy-ingress`;
-   not duplicate a separately maintained domain source;
-   contain only Simploy-controlled configuration;
-   not accept arbitrary user Caddyfile fragments as part of v0.

Caddy itself is persistent VPS infrastructure and is not created as an
application Compose service.

## Out of Scope

-   deployment execution;
-   VPS installation of Caddy;
-   VPS installation of Docker;
-   runtime secret creation;
-   health-check execution;
-   rollback execution.

## Acceptance Criteria

-   [ ] `simploy/deploy.env` contains exactly the selected `DOMAIN` and
    `APP_PORT` core values.
-   [ ] No secret values are written to `deploy.env`.
-   [ ] Compose uses the deployment environment.
-   [ ] Compose accepts a CI-supplied immutable image reference.
-   [ ] App port is not publicly published.
-   [ ] App joins `simploy-ingress`.
-   [ ] Caddy is not part of the app Compose project.
-   [ ] Caddy uses the same domain source.
-   [ ] Generated files are deterministic for identical init choices.
-   [ ] Template tests cover default and custom domain/port values.
