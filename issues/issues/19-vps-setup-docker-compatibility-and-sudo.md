# Issue 19 — VPS Setup: Existing Docker Compatibility and Privilege Handling

## Summary

Fix two concrete problems found during the first real Ubuntu VM test of Issue 17:

1. `simploy setup` requires root, but the CLI currently does not handle privilege escalation. `sudo simploy setup` can also fail because pnpm's user-level global bin directory is not necessarily in root's `PATH`.
2. The setup script adds Docker's official APT repository and attempts to replace an already-working Ubuntu `docker.io` / `docker-compose-v2` installation with Docker CE packages. The migration currently fails because `docker-compose-v2` conflicts with `docker-compose-plugin`.

Issue 19 must make `simploy setup` safe and usable on a VPS that already has a compatible Docker installation.

## Docker Packaging Decision

Docker's official Ubuntu documentation distinguishes Docker's official Engine packages from Ubuntu's distribution packages and lists `docker.io` and `docker-compose-v2` among packages that conflict with the official Docker packages.

The current script is therefore trying to install Docker CE because it deliberately uses Docker's official APT repository.

For Simploy v0, however, **do not replace a working Docker installation merely to enforce Docker CE**.

The purpose of `simploy setup` is to make the VPS Simploy-ready, not to migrate a compatible existing Docker installation.

The setup must:

- detect an existing Docker installation;
- detect whether `docker compose` works;
- detect whether the Docker daemon is active;
- reuse a compatible existing installation;
- install only missing requirements;
- avoid installing conflicting Compose implementations;
- preserve existing Docker data;
- only migrate Docker packages if migration is genuinely required by an explicit v0 requirement.

A compatible Ubuntu `docker.io` + `docker-compose-v2` installation must therefore be a supported starting state.

## Existing Docker State

Setup must not remove or destroy existing:

- `/var/lib/docker`;
- images;
- containers;
- volumes;
- networks.

If Docker is already installed and operational, setup should not unnecessarily stop/reinstall it.

After setup:

```bash
docker --version
docker compose version
systemctl is-active docker
```

must succeed.

## Docker Migration

If migration to Docker CE is ever required, all conflicting packages must be handled as one coherent transaction.

In particular, do not install:

```text
docker-compose-plugin
```

while the conflicting:

```text
docker-compose-v2
```

package remains installed.

A failed migration must not knowingly leave Docker or dpkg partially configured.

For v0, prefer compatibility/reuse over migration.

## Privilege Handling

The intended user experience is:

```bash
simploy setup
```

The user should not have to locate the pnpm global executable or manually invoke it through root's PATH.

Because VPS setup performs system-level operations, the CLI must handle non-root execution.

Preferred behavior:

1. Check whether `simploy setup` is running as root.
2. If already root, execute the bundled setup script directly.
3. If not root, check for `sudo`.
4. If available, re-execute the bundled setup script through `sudo`.
5. Preserve the bundled script's actual installed-package path.
6. Preserve all setup arguments and required environment.
7. Propagate the script's exit status.
8. If sudo is unavailable, fail clearly with the required privilege instruction.

The normal documented command remains:

```bash
simploy setup
```

It must not depend on:

```bash
sudo simploy setup
```

or on root's PATH containing the user's pnpm global bin directory.

## Implementation Boundary

The Bash setup script remains the actual VPS setup implementation.

The TypeScript CLI may handle privilege escalation and invoke the script, but must not duplicate Docker/Caddy provisioning logic.

The bundled setup script must remain directly executable independently of the CLI.

## Idempotency

Repeated execution must be safe:

```bash
simploy setup
simploy setup
```

must not repeatedly reinstall or migrate Docker or install conflicting packages.

Existing compatible Docker installations must remain usable.

## Caddy

The Docker compatibility changes must not break the existing Issue 17 behavior:

- install Caddy when absent;
- configure the intended Caddy setup;
- configure the required deployment permissions;
- create/use `simploy-ingress`;
- preserve operator-managed state.

## Tests

Add or extend tests covering:

- existing compatible `docker.io`;
- existing compatible `docker-compose-v2`;
- no unnecessary Docker migration;
- missing Docker;
- missing Compose;
- Caddy absent;
- repeated setup;
- `simploy setup` as a normal user;
- sudo re-execution;
- setup-script path preservation through sudo;
- argument propagation;
- sudo unavailable;
- exit-status propagation.

Add a disposable Ubuntu VM test where practical.

The critical scenario is:

```text
Ubuntu 24.04
+ docker.io
+ docker-compose-v2
+ Docker active
+ Caddy absent
        ↓
simploy setup
        ↓
Docker remains functional
Caddy installed
VPS setup completed
```

## Acceptance Criteria

- [ ] `simploy setup` works when invoked by the normal user.
- [ ] Root privileges are handled automatically when required.
- [ ] The CLI does not depend on root's PATH containing the pnpm global bin directory.
- [ ] A compatible Ubuntu Docker installation is reused.
- [ ] A compatible Ubuntu Compose installation is reused.
- [ ] Conflicting Compose implementations are never installed together.
- [ ] Existing Docker data is preserved.
- [ ] Docker is active after setup.
- [ ] `docker compose version` works after setup.
- [ ] Caddy is installed when absent.
- [ ] `simploy-ingress` setup still works.
- [ ] Setup remains idempotent.
- [ ] An unnecessary Docker CE migration is not performed.
- [ ] Any genuinely required migration is safe and leaves Docker operational.
- [ ] Relevant tests pass.
- [ ] The disposable Ubuntu scenario passes.

## Non-Goals

Do not add:

- self-hosted Supabase installation;
- generic service installation;
- multisite;
- staging/production environments;
- gateways;
- VPS fleet management;
- automatic host hardening;
- deployment management;
- a Simploy daemon;
- a generic plugin system.

## Official Reference

Docker's official Ubuntu documentation says Docker Engine is available from Docker's APT repository as:

```text
docker-ce
docker-ce-cli
containerd.io
docker-buildx-plugin
docker-compose-plugin
```

and identifies Ubuntu/distribution packages including `docker.io` and `docker-compose-v2` as conflicting packages when installing the official packages.

For this v0 issue, that documentation supports the diagnosis of the package conflict, while the Simploy product decision is to **reuse a compatible existing Docker installation instead of unnecessarily migrating it**.

Reference:

https://docs.docker.com/engine/install/ubuntu/
