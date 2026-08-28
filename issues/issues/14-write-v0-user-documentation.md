# Issue 14 --- Write v0 User Documentation

## Summary

Document the actual v0 product without describing removed architectures
or capabilities.

## Required Documentation

### What Simploy is

Explain that Simploy:

-   initializes a deployment-ready project;
-   generates deployment assets and CI configuration;
-   is not installed as a deployment service on the VPS;
-   is not required by CI after initialization.

### Prerequisites

Document that the target VPS is preconfigured with the required runtime
tools, including the architecture assumptions around:

-   Docker;
-   Docker Compose;
-   OpenSSH;
-   persistent Caddy;
-   required network/runtime prerequisites.

Do not imply that Simploy provisions or hardens the VPS.

### Initialization

Document:

``` bash
pnpm simploy init
```

and all supported v0 flags.

### Deployment configuration

Document:

``` text
simploy/deploy.env
```

including:

``` env
DOMAIN=...
APP_PORT=...
```

Explicitly state that it is committed and must contain no secrets.

### CI secrets

Document the required operator-configured values:

``` text
VPS_HOST
VPS_USER
SSH_PRIVATE_KEY
SSH_KNOWN_HOSTS
```

Explain that Simploy never asks for or stores these values.

### Deployment flow

Document that the generated CI workflow performs deployment.

Do not phrase CI transfer, health checks, rollback, or deployment
failures as actions performed by Simploy itself.

### Services

Document the service boundary.

For Supabase:

-   Simploy generates connection/integration support;
-   user deploys and operates Supabase;
-   Supabase is not part of Simploy Compose deployment.

### Security boundary

Document:

-   CI is part of the production trust boundary;
-   Docker control is effectively privileged VPS access;
-   Simploy generates secure defaults within its files;
-   VPS provisioning/hardening remains the operator's responsibility.

## Remove Stale Concepts

Documentation must not describe:

-   `simploy.config.yml`;
-   `simploy generate`;
-   `simploy validate`;
-   `simploy deploy`;
-   VPS Simploy daemon/gateway;
-   deployable Supabase plugin;
-   plugin terminology where service terminology is intended;
-   committed generic secret-bearing `.env`.

## Acceptance Criteria

-   [ ] README reflects the current architecture.
-   [ ] Init usage is documented.
-   [ ] All required CI secret names are documented.
-   [ ] `deploy.env` purpose and non-secret rule are explicit.
-   [ ] VPS responsibility boundary is explicit.
-   [ ] Supabase responsibility boundary is explicit.
-   [ ] No stale gateway/config-generation/plugin architecture remains.
