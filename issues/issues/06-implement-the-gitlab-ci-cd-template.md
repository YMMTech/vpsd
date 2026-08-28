# Issue 06 --- Implement the GitLab CI/CD Template

## Summary

Generate the GitLab CI/CD pipeline for projects selecting:

``` text
gitlab
```

Simploy generates the pipeline; GitLab CI/CD performs deployment.

## Location

Generate:

``` text
.gitlab-ci.yml
```

## Required CI Secret/Variable Contract

The pipeline expects:

``` text
VPS_HOST
VPS_USER
SSH_PRIVATE_KEY
SSH_KNOWN_HOSTS
```

v0 assumes SSH port `22`.

Simploy must not ask for or store their values.

## Pipeline Responsibilities

The generated pipeline must be designed to:

1.  check out/use the exact pipeline commit;
2.  run required application checks;
3.  build the production OCI image;
4.  authenticate to the GitLab container registry;
5.  push the image;
6.  resolve/use an immutable digest;
7.  establish verified SSH access;
8.  use/transfer the committed Simploy deployment assets required by
    deployment;
9.  invoke Docker Compose remotely;
10. apply/update the application-specific Caddy configuration;
11. perform optional health-check behavior when configured;
12. perform defined rollback behavior when required;
13. expose deployment failure as a failed GitLab job.

## Security Requirements

The generated pipeline must not:

-   disable SSH host-key verification;
-   print secrets;
-   commit credentials;
-   require Simploy on the VPS;
-   expose Docker over TCP;
-   require a production self-hosted runner.

Production deployment must use a GitLab production `resource_group` to
prevent overlapping deployments.

## Out of Scope

-   automatically creating GitLab CI variables through the API;
-   VPS provisioning;
-   deployment execution by Simploy.

## Acceptance Criteria

-   [ ] GitLab selection generates `.gitlab-ci.yml`.
-   [ ] Required SSH variable names match the v0 contract.
-   [ ] Host-key verification is enabled.
-   [ ] Pipeline builds and pushes the app image.
-   [ ] Deployment uses an immutable image digest.
-   [ ] Pipeline consumes the committed Simploy deployment assets.
-   [ ] Production deployment uses a `resource_group`.
-   [ ] No Simploy runtime is required.
-   [ ] Template tests assert critical security/deployment properties.
