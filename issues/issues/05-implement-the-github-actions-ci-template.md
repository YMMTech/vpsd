# Issue 05 --- Implement the GitHub Actions CI Template

## Summary

Generate the GitHub Actions workflow for projects selecting:

``` text
github
```

Simploy generates the workflow; GitHub Actions performs the deployment.

## Location

The workflow must live under:

``` text
.github/workflows/
```

using the final filename selected by the implementation.

## Required CI Secret/Variable Contract

The workflow expects the operator to configure:

``` text
VPS_HOST
VPS_USER
SSH_PRIVATE_KEY
SSH_KNOWN_HOSTS
```

v0 assumes SSH port `22`.

Simploy must not ask for or store their values.

## Workflow Responsibilities

The generated workflow must be designed to:

1.  check out the exact commit;
2.  run required application checks;
3.  build the production OCI image;
4.  authenticate to the GitHub container registry as required;
5.  push the image;
6.  resolve/use an immutable digest;
7.  establish SSH using the configured private key;
8.  verify the VPS host using `SSH_KNOWN_HOSTS`;
9.  use/transfer the committed Simploy deployment assets required by the
    deployment;
10. invoke the required Docker Compose operations remotely;
11. apply/update the application-specific Caddy configuration;
12. perform the optional health-check behavior when configured;
13. perform the defined rollback behavior when required;
14. expose deployment failure as a failed GitHub Actions job.

These are workflow behaviors, not Simploy runtime behaviors.

## VPS Path and Caddy Configuration Boundary

Simploy does not prescribe VPS deployment directories or Caddy configuration/import paths.

The target VPS is assumed to be preconfigured so that the deployment account can access the required deployment location and perform the required Caddy configuration/reload operations.

The generated workflow must therefore not invent or require fixed paths such as:

```text
~/simploy
/opt/simploy
/etc/caddy/sites/...
```

unless such paths are explicitly provided by the preconfigured VPS environment.

The exact deployment location and Caddy configuration arrangement are outside Simploy's initialization contract.

## Health Check and Rollback Boundary

Issue 05 does not define a health-check endpoint or rollback contract.

The generated workflow must not invent either behavior as part of this issue.

Health-check and rollback behavior remain deferred/optional until their respective contract is defined.

## Security Requirements

The generated workflow must not:

-   disable SSH host-key verification;
-   print secret values;
-   commit secrets;
-   require Simploy to run on the VPS;
-   expose the Docker daemon over TCP;
-   require a self-hosted runner on the production VPS.

Production deployment must use GitHub's concurrency mechanism to prevent
overlapping production deployments.

Third-party actions used by the generated workflow must follow the
security policy chosen for the implementation.

## Out of Scope

-   automatically creating repository secrets through the GitHub API;
-   provisioning the VPS;
-   installing Docker/OpenSSH/Caddy;
-   Simploy handling deployment failures itself.

## Acceptance Criteria

-   [ ] GitHub selection generates exactly the GitHub CI structure.
-   [ ] Required SSH secret names match the v0 contract.
-   [ ] Host-key verification is enabled.
-   [ ] Workflow builds and pushes the app image.
-   [ ] Deployment uses an immutable image digest.
-   [ ] Workflow consumes the committed Simploy deployment assets.
-   [ ] Production deployment is serialized.
-   [ ] No Simploy runtime is required.
-   [ ] Template tests assert critical security/deployment properties.
