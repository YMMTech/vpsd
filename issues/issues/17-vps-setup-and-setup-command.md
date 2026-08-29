# Issue 17 — VPS Setup Instructions, Bootstrap Script, and `simploy setup`

## Summary

Provide the v0 operator workflow for preparing a VPS for Simploy.

A developer must have three equivalent ways to prepare the VPS:

1. follow the documented manual instructions;
2. download and run the bundled VPS setup Bash script directly;
3. install the Simploy CLI and run:

```bash
pnpm add -g simploy
simploy setup
```

`simploy setup` is a convenience wrapper that runs the same bundled VPS setup Bash script.

This issue does not make Simploy a VPS deployment platform. The VPS remains operator-owned infrastructure.

## Goals

- Document the exact VPS prerequisites required by Simploy v0.
- Provide a reference Bash setup script for a supported Debian/Ubuntu VPS.
- Bundle that script with the Simploy package.
- Add the `simploy setup` command.
- Make `simploy setup` execute the bundled setup script.
- Keep manual setup and direct-script setup available independently of the CLI.
- Make the setup operation safe to rerun.
- Prepare the VPS for the existing v0 CI/deployment contract.

## VPS Setup Boundary

The setup operation prepares the infrastructure that Simploy-generated projects expect.

It does not deploy an application.

It does not run a Simploy daemon, gateway, deployment engine, or other persistent Simploy service.

After setup, normal application deployment is still performed by the generated GitHub Actions or GitLab CI/CD workflow.

## Required VPS State

The VPS must provide:

- Linux;
- OpenSSH server;
- Docker Engine;
- Docker Compose v2;
- persistent Caddy;
- a deployment user usable by CI;
- Docker access for the deployment user;
- the shared production Docker network:

```text
simploy-ingress
```

- public HTTP/HTTPS access for Caddy on ports `80` and `443`.

The operator remains responsible for:

- DNS;
- SSH key management;
- CI variables/secrets;
- firewall policy;
- host updates;
- backups;
- host-level hardening;
- any external services such as Supabase.

## Supported Host

The reference setup script targets Debian/Ubuntu systems using APT.

The script must detect an unsupported operating system and fail clearly instead of attempting an untested installation path.

Docker's and Caddy's current official documentation remains authoritative for supported distributions and installation procedures.

## Manual Setup

The documentation must provide a complete manual procedure equivalent to the reference script.

It must cover:

1. Docker Engine installation.
2. Docker Compose v2 installation.
3. Caddy installation and persistent systemd service.
4. Creation/configuration of the deployment user.
5. Docker access for the deployment user.
6. Creation of `simploy-ingress`.
7. SSH public-key configuration for CI.
8. Required ports.
9. Verification.

The manual procedure must not require installing Simploy.

## Direct Script Setup

The repository must provide a Bash script that can be downloaded/copied and run directly by an operator.

The script must:

- use Docker's official APT repository;
- install Docker Engine and the Docker Compose plugin;
- install Caddy using its official package distribution;
- enable/start Docker;
- enable/start Caddy;
- create the deployment user if absent;
- add the deployment user to the Docker group;
- create the deployment user's SSH directory without overwriting existing authorized keys;
- create `simploy-ingress` if absent;
- perform verification.

The script must require appropriate privileges and fail clearly when insufficient privileges are available.

## `simploy setup`

Add:

```bash
simploy setup
```

The command is a convenience wrapper around the bundled VPS setup script.

Requirements:

- The setup script must be included in the published/package artifact.
- `simploy setup` must locate the bundled script from the installed package rather than relying on the source repository.
- `simploy setup` must execute that script.
- It must propagate the setup script's success/failure status.
- It must not duplicate the setup logic in TypeScript.
- It must not silently implement additional VPS configuration outside the script's defined behavior.

The intended installation path is:

```bash
pnpm add -g simploy
simploy setup
```

The CLI must not require the user to clone the Simploy repository merely to use `setup`.

## Configuration

The setup script must support operator configuration without source-code edits.

At minimum:

```text
DEPLOY_USER
```

with a documented default.

Any paths used internally by the bootstrap script are implementation details of the setup procedure. They are not Simploy application deployment paths and must not become part of the application deployment contract.

## Docker

Install the Docker packages from Docker's official APT repository:

```text
docker-ce
docker-ce-cli
containerd.io
docker-buildx-plugin
docker-compose-plugin
```

Enable and start Docker with systemd.

Add the deployment user to the `docker` group.

Do not use Docker's convenience installation script for the reference setup.

## Caddy

Install Caddy using its official package distribution.

Enable and start the Caddy systemd service.

The setup script must not install an application-specific Caddyfile.

Caddy remains persistent VPS infrastructure and is not part of an application's Compose lifecycle.

The operator must configure the persistent Caddy instance according to the documented v0 deployment arrangement.

The setup procedure must not invent an application-specific Simploy-mandated Caddy path.

## Shared Ingress Network

Create:

```text
simploy-ingress
```

if it does not already exist.

The operation must be idempotent.

Do not create an ingress network per application during VPS setup.

## SSH

The setup process must prepare the deployment account for CI use.

It must not:

- generate an SSH private key;
- copy a private key to the VPS;
- disable SSH host-key verification;
- weaken SSH configuration;
- expose the Docker API over TCP.

The operator adds the CI deployment public key to the deployment user's `authorized_keys`.

The generated CI configuration expects:

```text
VPS_HOST
VPS_USER
SSH_PRIVATE_KEY
SSH_KNOWN_HOSTS
```

The host key must be established through an operator-controlled trust process.

## Firewall and Ports

The documentation must identify:

```text
80/tcp
443/tcp
```

as the public ports required by Caddy.

Application ports must not be publicly exposed merely because an application is deployed.

The setup script must not silently replace, disable, or overwrite an existing firewall policy.

## Idempotency and Preservation

Running the setup script repeatedly must not:

- destroy Docker data;
- overwrite Caddy configuration;
- overwrite existing SSH authorized keys;
- recreate an existing deployment account unnecessarily;
- recreate an existing ingress network unnecessarily;
- reset existing Caddy state.

Existing installations should be detected and reused where appropriate.

## Verification

The setup script must verify, at minimum:

```bash
docker --version
docker compose version
systemctl is-active docker
caddy version
systemctl is-active caddy
id "${DEPLOY_USER}"
docker network inspect simploy-ingress
```

The documentation must explain that a new login session may be required before the deployment user receives newly granted Docker-group membership.

## Non-Goals

This issue does not add:

- application deployment;
- `simploy deploy`;
- a Simploy daemon;
- a deployment gateway;
- deployment failure handling;
- transfer failure handling;
- VPS fleet management;
- automatic VPS hardening;
- CI secret creation;
- SSH private-key generation;
- application-specific Caddy configuration;
- Supabase deployment;
- staging/production environment management.

## Tests

Add tests for:

- `simploy setup` command registration/help;
- locating the bundled setup script from the installed package;
- setup-script packaging;
- failure propagation from the setup script;
- package contents containing the script.

The Bash script itself should be tested on a disposable supported VPS/VM where practical.

At minimum, verify idempotency and the resulting Docker, Compose, Caddy, user, and network state.

## Acceptance Criteria

- [ ] Manual VPS setup instructions exist.
- [ ] A standalone Bash VPS setup script exists.
- [ ] The script targets supported Debian/Ubuntu systems and rejects unsupported hosts clearly.
- [ ] Docker Engine and Docker Compose v2 are installed from Docker's official repository.
- [ ] Caddy is installed and enabled as persistent systemd infrastructure.
- [ ] A deployment user is created/configured.
- [ ] The deployment user receives Docker access.
- [ ] `simploy-ingress` is created idempotently.
- [ ] Existing SSH authorized keys are preserved.
- [ ] No private SSH key is generated or copied by the setup process.
- [ ] No firewall policy is silently replaced or disabled.
- [ ] `simploy setup` executes the bundled Bash setup script.
- [ ] The bundled script is included in the actual package artifact.
- [ ] `simploy setup` works after installing Simploy as a package.
- [ ] Setup does not install a Simploy runtime/daemon/gateway.
- [ ] Setup does not deploy applications.
- [ ] Setup does not configure CI variables.
- [ ] Setup is safe to rerun.
- [ ] Verification checks are performed.
- [ ] Manual setup, direct script setup, and `simploy setup` are documented as alternative ways to reach the same VPS baseline.

## References

- Docker Engine installation: https://docs.docker.com/engine/install/
- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Engine on Debian: https://docs.docker.com/engine/install/debian/
- Docker Linux post-installation: https://docs.docker.com/engine/install/linux-postinstall/
- Caddy documentation: https://caddyserver.com/docs/
- Caddy running as a Linux service: https://caddyserver.com/docs/running
- Caddy automatic HTTPS: https://caddyserver.com/docs/automatic-https
