# Issue 21 — CI and VPS Deployment Corrections From Real End-to-End Validation

## Status

Complete. Corrections and regression coverage are implemented. The first real end-to-end deployment returned HTTP 200 through Caddy; the complete path was subsequently validated a second time.

## Context

A real Simploy v0 deployment was tested end to end with:

- a fresh generated Next.js project;
- GitLab CI;
- GitLab Container Registry;
- a disposable Ubuntu 24.04 VM;
- `simploy setup`;
- Docker / Docker Compose;
- system-level Caddy;
- SSH deployment from a GitLab SaaS runner.

The deployment eventually completed successfully and the generated Next.js application returned HTTP 200 through Caddy, but only after several manual corrections to the generated CI and setup configuration.

This issue formalizes those corrections so a fresh generated project can deploy successfully without manual edits.

---

## 1. Deterministic Default Deployment Paths

Simploy must provide deterministic defaults shared by `simploy setup` and generated CI.

Defaults:

```text
SIMPLOY_DEPLOY_PATH=/home/simploy/app
SIMPLOY_CADDY_CONFIG_PATH=/etc/caddy/Caddyfile
```

### Required behavior

- `simploy setup` must use `/etc/caddy/Caddyfile` when `SIMPLOY_CADDY_CONFIG_PATH` is not provided.
- Generated GitHub and GitLab deployment workflows must use `/home/simploy/app` and `/etc/caddy/Caddyfile` when the corresponding CI variables are absent.
- Both paths remain overridable.
- An explicit override always wins.
- `simploy setup` must create the narrow Caddy `NOPASSWD` sudo rule for the effective Caddy path on the first run.
- A normal setup must not require a second invocation merely to establish Caddy permissions.

### Acceptance criteria

- [x] `simploy setup` with no path environment variables configures the default Caddy path.
- [x] Generated CI deploys to `/home/simploy/app` by default.
- [x] Generated CI uses `/etc/caddy/Caddyfile` by default.
- [x] Both defaults are overridable.
- [x] Setup, CI, docs and tests use the same defaults.

---

## 2. Resolve pnpm From the Generated Application

Generated CI must not hardcode a pnpm version and must not rely on the runner's current pnpm version.

The generated application is the source of truth for its package manager version.

### Observed failure

The generated verification job ran from the repository root:

```bash
corepack enable
pnpm --dir app install --frozen-lockfile
pnpm --dir app test --if-present
pnpm --dir app build --if-present
```

Corepack selected pnpm `11.25.0`, while the generated application declared pnpm `10.30.3`, causing CI to fail before install.

### Required behavior

Run package-manager commands from inside `app/` so Corepack resolves the version declared by the generated application:

```bash
if [ -f app/package.json ]; then
  cd app
  corepack enable
  pnpm install --frozen-lockfile
  pnpm run --if-present test
  pnpm run build
fi
```

Requirements:

- Do not pin a specific pnpm version in Simploy CI templates.
- Respect the version declared by the generated application's `package.json`.
- `test` is optional.
- `build` is mandatory for a generated deployable Next.js application.
- Do not pass `--if-present` through to the underlying application script.

### Acceptance criteria

- [x] GitLab CI resolves pnpm from `app/package.json`.
- [x] GitHub Actions does the equivalent.
- [x] No pnpm version is hardcoded by Simploy.
- [x] Missing `test` does not fail verification.
- [x] Missing/failing `build` does fail verification.
- [x] `--if-present` is not forwarded to `next build`.
- [x] Tests cover package-manager version resolution and optional/mandatory scripts.

---

## 3. Configurable SSH Port

Generated deployment CI currently assumes SSH port `22`.

This prevents deployment through environments where the externally reachable SSH port differs from the server's internal SSH port.

### Required behavior

Add:

```text
VPS_PORT=22
```

as the effective default.

- `VPS_PORT` must be optional.
- If absent, use `22`.
- If present, use the configured value for every SSH-based deployment command.
- GitLab CI and GitHub Actions must behave consistently.
- Users must not need to edit generated workflow files to use a non-standard SSH port.

### Acceptance criteria

- [x] Port `22` is used by default.
- [x] `VPS_PORT` overrides it everywhere.
- [x] GitLab CI supports a non-standard port.
- [x] GitHub Actions supports a non-standard port.
- [x] Documentation covers the variable and default.
- [x] Tests cover both default and overridden ports.

---

## 4. Do Not Use SSH stdin For Both Tar Data and a Heredoc

### Observed failure

The generated deployment used a tar stream and a shell heredoc on the same SSH command:

```bash
tar -C simploy -cf - deploy.env compose.yml Caddyfile | ssh ... "sh -s" <<'REMOTE'
  ...
  tar -C "$SIMPLOY_DEPLOY_PATH" -xf -
REMOTE
```

This uses SSH stdin twice:

1. for the tar archive;
2. for the heredoc script.

The remote tar command therefore received the wrong input and failed with:

```text
tar: This does not look like a tar archive
```

### Required behavior

The tar archive must be the only payload on SSH stdin.

Remote extraction/setup commands must be provided by the SSH command itself or another mechanism that does not consume stdin.

Example acceptable pattern:

```bash
DEPLOY_PATH_B64="$(printf '%s' "$SIMPLOY_DEPLOY_PATH" | base64 | tr -d '\n')"

tar -C simploy -cf - deploy.env compose.yml Caddyfile |
  ssh -p "$VPS_PORT" \
    -o BatchMode=yes \
    -o StrictHostKeyChecking=yes \
    "$VPS_USER@$VPS_HOST" \
    "SIMPLOY_DEPLOY_PATH=\$(printf '%s' '$DEPLOY_PATH_B64' | base64 -d); \
     install -d -m 0755 \"\$SIMPLOY_DEPLOY_PATH\"; \
     tar -C \"\$SIMPLOY_DEPLOY_PATH\" -xf -"
```

Equivalent implementations are acceptable.

### Acceptance criteria

- [x] Deployment assets stream successfully over SSH.
- [x] No SSH invocation uses a tar/data pipe and heredoc on the same stdin.
- [x] GitLab CI is corrected.
- [x] GitHub Actions is checked for the same defect.
- [x] Tests cover the generated upload/extraction path.

---

## 5. Export `APP_IMAGE` Before Docker Compose

### Observed failure

The deploy script decoded the immutable image reference:

```bash
APP_IMAGE="$(printf '%s' "$APP_IMAGE_B64" | base64 -d)"
```

but did not export it before:

```bash
docker compose --env-file deploy.env -f compose.yml up -d --pull always --remove-orphans
```

The generated Compose file references `${APP_IMAGE}`, so Compose could not reliably resolve the image variable.

### Required behavior

Make `APP_IMAGE` available to Docker Compose, for example:

```bash
APP_IMAGE="$(printf '%s' "$APP_IMAGE_B64" | base64 -d)"
export APP_IMAGE
```

Equivalent implementations are acceptable if Compose reliably receives the immutable image reference.

### Acceptance criteria

- [x] `${APP_IMAGE}` resolves during deployment.
- [x] The immutable digest-based image is pulled and started.
- [x] GitLab CI is corrected.
- [x] GitHub Actions is checked for the same defect.
- [x] Tests cover Compose image-variable resolution.

---

## 6. Generated CI Must Match Setup Sudoers Command Paths Exactly

`simploy setup` creates a narrow sudoers rule for:

```text
/usr/bin/install
/usr/bin/env
/usr/bin/caddy
```

The generated CI called:

```bash
sudo -n install ...
sudo -n env ... caddy validate ...
sudo -n env ... caddy reload ...
```

### Observed failure

The sudoers rule existed and the absolute-path commands succeeded, while the generated CI form failed with:

```text
sudo: a password is required
```

### Required behavior

Generated CI must invoke the exact absolute paths authorized by setup:

```bash
sudo -n /usr/bin/install -D -m 0644 Caddyfile "$SIMPLOY_CADDY_CONFIG_PATH"

sudo -n /usr/bin/env DOMAIN="$DOMAIN" APP_PORT="$APP_PORT" \
  /usr/bin/caddy validate \
  --config "$SIMPLOY_CADDY_CONFIG_PATH" \
  --adapter caddyfile

sudo -n /usr/bin/env DOMAIN="$DOMAIN" APP_PORT="$APP_PORT" \
  /usr/bin/caddy reload \
  --config "$SIMPLOY_CADDY_CONFIG_PATH" \
  --adapter caddyfile
```

Equivalent implementations are acceptable only if generated CI and generated sudoers remain exactly synchronized.

### Acceptance criteria

- [x] `sudo -n` succeeds for Caddy install, validate and reload.
- [x] GitLab CI uses the authorized absolute paths.
- [x] GitHub Actions is checked for the same mismatch.
- [x] Tests prevent CI/sudoers command-path drift.

---

## 7. CI Variable Contract After Defaults

For a normal deployment, the generated CI should require only the values that are genuinely environment-specific.

Required deployment values:

```text
VPS_HOST
VPS_USER
SSH_PRIVATE_KEY
SSH_KNOWN_HOSTS
```

Optional overrides:

```text
VPS_PORT=22
SIMPLOY_DEPLOY_PATH=/home/simploy/app
SIMPLOY_CADDY_CONFIG_PATH=/etc/caddy/Caddyfile
```

Supabase variables remain conditional on selecting the Supabase integration.

Documentation and generated error messages must reflect this contract.

---

## 8. Regression Coverage

Add tests that validate the generated GitLab and GitHub deployment workflows as executable behavior, not only as string/template snapshots.

At minimum, cover:

- package-manager resolution from `app/package.json`;
- optional `test` and mandatory `build`;
- default and overridden SSH ports;
- default and overridden deploy/Caddy paths;
- tar upload without stdin collision;
- `APP_IMAGE` availability to Compose;
- exact sudoers/CI command-path agreement;
- non-Supabase deployment path;
- selected Supabase deployment path where applicable.

Prefer integration-style tests that execute the relevant shell fragments in disposable environments where practical.

---

## Final Acceptance Test

After implementation:

1. Start from a clean VPS/VM baseline.
2. Run `simploy setup` once with no path overrides.
3. Generate a fresh Next.js project with GitLab CI.
4. Configure only the required environment-specific CI variables.
5. Do not edit the generated CI files manually.
6. Push to the default branch.
7. Verify:
   - verification job passes;
   - image build/push passes;
   - deployment job passes;
   - container is running;
   - application responds on the configured app port;
   - Caddy serves the application successfully.

The issue is complete only when a fresh generated project passes this end-to-end test without manual workflow corrections.
