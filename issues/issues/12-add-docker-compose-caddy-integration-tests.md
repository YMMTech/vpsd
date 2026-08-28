# Issue 12 --- Add Docker Compose/Caddy Integration Tests

## Summary

Verify that the generated deployment assets are structurally usable with
their authoritative tools without turning Simploy into a deployment
runtime.

## Docker Compose

Integration tests should validate generated Compose configuration using
Docker Compose.

Use the dedicated test ingress network:

``` text
simploy-integration-test-ingress
```

Do not use the production network name for integration isolation.

Tests should verify, as applicable:

-   environment interpolation from the test deployment environment;
-   generated Compose validity;
-   container startup with a suitable reference/test image;
-   private application networking;
-   reachability through the intended test ingress network;
-   no accidental public application-port exposure.

## Caddy

Where the test environment supports it, validate generated Caddy
configuration using Caddy's own validation mechanisms.

Tests should focus on generated configuration correctness, not
provisioning a production VPS.

## Boundaries

Integration tests may invoke Docker/Caddy as test dependencies.

They do not change the product architecture: Simploy remains init-only.

## Acceptance Criteria

-   [ ] Generated Compose files pass authoritative Compose validation.
-   [ ] Integration tests use `simploy-integration-test-ingress`.
-   [ ] Test application can be reached through the intended private
    network path.
-   [ ] App port is not unintentionally public.
-   [ ] Generated Caddy configuration is validated where supported.
-   [ ] Tests clean up their own containers/networks/resources.
-   [ ] No production VPS is required.
