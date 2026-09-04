# Issue 18 — VPS Service Setup

## Summary

Extend the v0 VPS setup workflow so that `simploy setup` can prepare the selected service infrastructure on the VPS in addition to the base VPS requirements.

The same service setup must be available when the operator runs the bundled setup Bash script directly.

This issue exists because v0 now has a `setup` command, and service selection must have a corresponding VPS-side setup path. The service remains ordinary VPS infrastructure after setup; Simploy does not become a persistent service manager.

## Goals

- Allow the operator to select VPS services during setup.
- Install/configure the selected built-in service infrastructure.
- Support Supabase as the first v0 service infrastructure integration.
- Keep service setup idempotent.
- Keep service-specific setup isolated from the base VPS setup.
- Make `simploy setup` and direct Bash execution produce the same VPS state.
- Preserve the existing Simploy init/CI/deployment boundaries.

## Service Selection

The setup interface must explicitly accept the services to prepare.

The CLI must support the service selection defined by the v0 service model.

For example:

```bash
simploy setup --services supabase
```

The equivalent direct-script invocation must support the same selection.

If no service is selected, only the base VPS setup is performed.

The implementation must not infer service installation from an application repository that happens to exist on the VPS.

## Supabase

Supabase is the first supported VPS service.

When selected, the setup process must prepare the self-hosted Supabase infrastructure required by the Simploy v0 Supabase service integration.

The exact Supabase deployment mechanism must follow the authoritative Supabase self-hosting documentation and the Simploy service contract.

The implementation must not invent a custom Supabase architecture when the official self-hosted deployment mechanism already defines the required components.

## Service Boundary

Service infrastructure is installed/configured once on the VPS.

It is not part of an individual application's Compose lifecycle.

For Supabase:

```text
VPS
├── Docker
├── Caddy
├── simploy-ingress
├── Supabase
│   └── persistent service infrastructure
└── applications
    ├── app A
    └── app B
```

Application initialization remains responsible only for generating the application-side integration material.

Simploy does not manage the service continuously after setup.

## Credentials and Secrets

The setup process must not commit service credentials to application repositories.

Service credentials required for operating the self-hosted service must be handled as VPS/runtime configuration.

The setup process must clearly distinguish:

- service infrastructure credentials;
- application runtime credentials;
- CI deployment credentials.

Do not place secrets into generated `simploy/deploy.env`.

## Persistence

Selected service infrastructure must use persistent storage as required by the service's official self-hosted deployment model.

Rerunning setup must preserve existing service data.

The setup process must never destroy service volumes or reset an existing service installation merely because setup is run again.

## Caddy

If the selected service requires public HTTP/HTTPS access, its Caddy integration must follow the existing VPS Caddy boundary.

Do not replace the operator's persistent Caddy configuration blindly.

Do not introduce an application-specific Caddy path as a new Simploy contract.

## Docker Networking

Services must use the existing VPS networking model.

Where a service needs to communicate with applications through the shared ingress, use:

```text
simploy-ingress
```

Do not create a separate ingress network for every application.

Do not change the existing integration-test network:

```text
simploy-integration-test-ingress
```

## Idempotency

Running:

```bash
simploy setup --services supabase
```

multiple times must be safe.

It must:

- detect an existing Supabase installation;
- preserve existing data;
- avoid unnecessary recreation of persistent resources;
- avoid overwriting operator-managed configuration;
- only apply missing setup steps.

If an existing installation is incompatible with the expected service setup, fail clearly rather than destroying or silently replacing it.

## Script and CLI Relationship

The Bash script remains the implementation of VPS setup.

`simploy setup` must invoke the bundled script with the selected service configuration.

Do not duplicate service installation logic in TypeScript.

The bundled script must remain usable independently of the CLI.

For example:

```bash
./setup-vps.sh --services supabase
```

and:

```bash
simploy setup --services supabase
```

must use the same setup implementation.

## Non-Goals

This issue does not add:

- continuous service management;
- service upgrades;
- service monitoring;
- automatic backups;
- application deployment;
- `simploy deploy`;
- a Simploy daemon;
- a deployment gateway;
- application-specific service lifecycle management;
- staging/production environments;
- a generic third-party plugin system;
- arbitrary service installation from untrusted packages.

## Tests

Add tests for:

1. `simploy setup` service argument parsing.
2. Base setup with no services.
3. Supabase service selection.
4. Passing service selection from CLI to the bundled setup script.
5. Bundled script availability in the package.
6. Idempotent handling of an existing service installation.
7. Preservation of persistent service data.
8. Rejection/failure of unsupported service names.
9. No service secrets written into application files.
10. Existing v0 setup behavior remaining functional when no service is selected.

Where practical, test the actual Supabase setup on a disposable supported VPS/VM rather than mocking the complete service installation.

## Acceptance Criteria

- [ ] `simploy setup` accepts the defined service selection.
- [ ] Direct execution of the setup script accepts the same service selection.
- [ ] No service selection performs only the base VPS setup.
- [ ] Selecting Supabase prepares its self-hosted VPS infrastructure.
- [ ] Supabase setup follows the official self-hosting deployment mechanism.
- [ ] Service data is persistent.
- [ ] Service setup is idempotent.
- [ ] Existing service data/configuration is preserved.
- [ ] Service credentials are not committed to application repositories.
- [ ] The existing `simploy-ingress` network is reused where required.
- [ ] The integration-test network remains `simploy-integration-test-ingress`.
- [ ] `simploy setup` delegates to the bundled Bash implementation.
- [ ] The setup script remains independently runnable.
- [ ] Unsupported services fail clearly.
- [ ] No Simploy runtime/daemon/gateway is introduced.
- [ ] No application deployment behavior is introduced.
- [ ] No generic plugin system is introduced.

## References

- Supabase self-hosting documentation: https://supabase.com/docs/guides/self-hosting
- Supabase self-hosting Docker documentation: https://supabase.com/docs/guides/self-hosting/docker
- Docker documentation: https://docs.docker.com/
- Caddy documentation: https://caddyserver.com/docs/
