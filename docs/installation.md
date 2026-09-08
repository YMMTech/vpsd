# Install VPSD and deploy with GitLab

This guide takes one Next.js application from a fresh project directory to HTTPS on a Debian or Ubuntu VM. For the future public release, install the published `vpsd` package from the registry. This document accompanies a private pre-publication candidate; registry availability is not asserted yet. The optional [Run locally](#run-locally) section is for contributors testing source builds.

Commands are labeled by where they run. Use a Bash-compatible terminal on your local computer. VPSD prepares the VM and generates project files; the generated GitLab pipeline performs deployments afterward.

## 1. Prepare your accounts and tools

You need:

- A Debian or Ubuntu VM using APT and systemd, with an existing admin account that can log in over SSH and use `sudo`.
- A local computer and VM admin environment with Node.js 22 or newer, npm, and pnpm. Use pnpm 10.30.3 for this walkthrough.
- Git and an OpenSSH client locally, and Git available to `vpsd init`.
- A domain whose DNS you control.
- A GitLab project you can push to and configure, with a container registry and an available runner capable of running the generated container jobs. The image build uses Buildah.
- Your personal GitLab SSH access configured for pushes. This is separate from the CI key used to access the VM.

**Local computer and VM admin session:** check the prerequisites in each environment:

```bash
node --version
npm --version
pnpm --version
git --version
ssh -V
```

Expect Node.js 22 or newer. If Node.js is absent or older, install a supported version using your normal Node.js installation method before continuing. If pnpm is missing, install it in your user-managed Node.js environment:

```bash
npm install -g pnpm@10.30.3
```

If a global installation reports permissions errors, fix the Node.js user installation/prefix rather than running the application initializer as root. If pnpm reports no global bin directory, run `pnpm setup`, open a new terminal, and retry.

Replace these examples throughout the guide:

| Example | Your value |
| --- | --- |
| `YOUR_VM_IP` | Public VM IP or SSH hostname; use the same value for `VPS_HOST` |
| `YOUR_ADMIN_USER` | Existing VM admin login with sudo access |
| `app.example.com` | Application domain |
| `YOUR_GROUP/YOUR_PROJECT` | GitLab namespace and project |
| `main` | GitLab default branch, if it differs |

VPSD uses the renamed deployment contract described in [release preparation](release-preparation.md#deployment-names-and-migration). The walkthrough uses deployment user `vpsd`, SSH port `22`, application port `3000`, deployment directory `/home/vpsd/app`, and Caddy configuration `/etc/caddy/Caddyfile`. For another SSH port, replace `22` in all SSH commands and set the same `VPS_PORT` in GitLab.

## 2. Install VPSD and prepare the VM

**Local computer:**

```bash
pnpm add -g vpsd
vpsd --help
ssh -p 22 YOUR_ADMIN_USER@YOUR_VM_IP
```

Verify the VM's host fingerprint using your VM provider's console before accepting a first SSH connection. Step 5 explains host-key verification in detail.

**VM admin session:**

```bash
pnpm add -g vpsd
vpsd setup
```

The CLI uses sudo for the bundled setup script. Enter your existing admin account's sudo password if requested. You do not need `sudo vpsd setup`.

Setup installs or reuses Docker and Compose, prepares persistent system-level Caddy, enables SSH, creates the `vpsd` deployment account if absent, grants Docker access, creates `vpsd-ingress`, and installs the narrow Caddy sudo permission used by CI. It does not set a deployment-user password, install your SSH key, configure DNS/firewalls, create CI variables, or deploy an application. Docker access grants privileged control over the VM.

**VM admin session:** verify the result:

```bash
docker --version
docker compose version
systemctl is-active docker
caddy version
systemctl is-active caddy
id vpsd
sudo docker network inspect vpsd-ingress
```

Expect version output, `active` for both services, `docker` in the user's groups, and a network description. Stop and resolve setup errors before continuing; see [Troubleshooting](#troubleshooting).

### Custom deployment user or Caddy path

**VM admin session, only when using overrides:** replace `deployer` and the Caddy path with your chosen values:

```bash
DEPLOY_USER=deployer VPSD_CADDY_CONFIG_PATH=/etc/caddy/custom/Caddyfile vpsd setup
getent passwd deployer
id -gn deployer
```

Use the reported home directory and primary group in the SSH installation commands below. Set `VPS_USER=deployer` and a writable `VPSD_DEPLOY_PATH`, such as `/home/deployer/app`, in GitLab. The deployment directory default does not change with `VPS_USER`.

Set the same `VPSD_CADDY_CONFIG_PATH` in GitLab and ensure the persistent Caddy service uses that configuration path. Setup authorizes the path for CI; it does not rewrite Caddy's systemd service to use an arbitrary custom path. Keep the standard path unless you already manage a custom configuration. A custom deployment directory outside the user's home must be created and made writable by the admin beforehand.

## 3. Initialize the application locally

**Local computer, outside any existing Git repository:** choose a new directory name if `my-app` already exists:

```bash
mkdir my-app
cd my-app
vpsd init --name my-app --app nextjs --ci gitlab \
  --services none --domain app.example.com --port 3000 --app-default
```

Expect `VPSD project initialized.` The project root contains `.git/`, `app/`, `.gitlab-ci.yml`, and `vpsd/` with `compose.yml`, `Caddyfile`, and `deploy.env`. VPSD initializes Git itself; attach the GitLab remote afterward, in step 8. Do not clone an existing repository into this directory before init.

**Local computer, generated project root:** inspect the output:

```bash
git status
head -20 .gitlab-ci.yml
cat vpsd/deploy.env
```

The verification job must enter `app/` before running pnpm:

```bash
cd app
corepack enable
pnpm install --frozen-lockfile
pnpm run --if-present test
pnpm run build
```

`--app none` only creates an empty application directory. It is useful for template inspection, but requires your own deployable application and Dockerfile before image building can succeed. Use `nextjs` for this first-deployment walkthrough.

## 4. Install the CI public key on the VM

**Local computer:** generate a dedicated key. If this filename already exists, choose a different filename and use it consistently below; do not overwrite an existing key.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/vpsd_gitlab -C "vpsd-ci"
cat ~/.ssh/vpsd_gitlab.pub
```

Leave the passphrase empty for unattended use by the generated CI pipeline. Copy the complete single-line `.pub` output.

**VM admin session:** replace the entire quoted example key with that public-key line:

```bash
sudo install -d -m 700 -o vpsd -g vpsd /home/vpsd/.ssh
echo 'ssh-ed25519 REPLACE_WITH_YOUR_PUBLIC_KEY vpsd-ci' | sudo tee -a /home/vpsd/.ssh/authorized_keys >/dev/null
sudo chown vpsd:vpsd /home/vpsd/.ssh/authorized_keys
sudo chmod 600 /home/vpsd/.ssh/authorized_keys
```

This appends the key and preserves existing entries. Repeating the append adds duplicates. For a custom account, replace the user, group, and home directory with the values from step 2. The filename is literally `authorized_keys`, with no backslash before the underscore.

No password for `vpsd` is needed. Do not start with `ssh-copy-id` unless that account already has an authentication method. Keep the private key on your local computer and in GitLab's CI variable; never copy it to the VM or commit it.

## 5. Verify the host key and deployment login

**Trusted VM provider console or already verified VM admin session:** obtain the host's public Ed25519 key and fingerprint:

```bash
sudo cat /etc/ssh/ssh_host_ed25519_key.pub
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

**Local computer:** collect the presented key into a separate file:

```bash
ssh-keyscan -p 22 -t ed25519 YOUR_VM_IP > ~/.ssh/vpsd_known_hosts
ssh-keygen -lf ~/.ssh/vpsd_known_hosts
```

Compare the SHA256 fingerprint with the one from the trusted console. Continue only if they match. `ssh-keyscan` retrieves a key but does not establish trust by itself. If the host does not offer Ed25519, ask the VM administrator which configured host-key type to verify and use that type consistently.

For port 22, the known-hosts line starts with `YOUR_VM_IP`. For a custom port such as 2222, run the scan with `-p 2222`; the line starts with `[YOUR_VM_IP]:2222`. The name or IP must match the exact `VPS_HOST` value used by CI. Do not replace verification with `StrictHostKeyChecking=no`.

**Local computer:** test unattended access, using your actual port:

```bash
ssh -p 22 -i ~/.ssh/vpsd_gitlab \
  -o IdentitiesOnly=yes -o BatchMode=yes \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$HOME/.ssh/vpsd_known_hosts" \
  vpsd@YOUR_VM_IP 'id; docker ps; docker compose version'
```

Expect identity information, a container listing (possibly empty), and the Compose version without a password prompt. A fresh SSH session activates the Docker group membership added by setup.

## 6. Configure GitLab CI/CD variables

**GitLab UI:** open the project's **Settings > CI/CD > Variables** and add the following. The generated VPSD pipeline expects **Type: Variable**, including for both SSH values. It writes their contents into files itself; File-type variables would supply temporary filenames instead of the key contents.

| Key | Value |
| --- | --- |
| `VPS_HOST` | `YOUR_VM_IP`, with no protocol, username, or port |
| `VPS_USER` | `vpsd`, or your custom deployment account |
| `SSH_PRIVATE_KEY` | Entire local `~/.ssh/vpsd_gitlab` private key, including BEGIN/END lines and a final newline |
| `SSH_KNOWN_HOSTS` | Entire verified local `~/.ssh/vpsd_known_hosts` contents |

**Local computer:** display the values for copying into GitLab, without sharing the private-key output in logs or messages:

```bash
cat ~/.ssh/vpsd_gitlab
cat ~/.ssh/vpsd_known_hosts
```

Use literal multiline contents, not quoted strings or `\n` escapes. Disable variable-reference expansion. Multiline SSH keys cannot meet GitLab's masking restrictions; use **Visible** for the SSH values and never print them in CI. Protect deployment variables and ensure the default branch is protected. Use environment scope `*` for this walkthrough. GitLab documents these controls in [CI/CD variables](https://docs.gitlab.com/ci/variables/) and [SSH keys](https://docs.gitlab.com/ci/jobs/ssh_keys/); its generic File-variable example differs from VPSD's generated contract.

Optional variables, also Type: Variable:

| Key | Default | When to set |
| --- | --- | --- |
| `VPS_PORT` | `22` | Externally reachable SSH port differs |
| `VPSD_DEPLOY_PATH` | `/home/vpsd/app` | Custom deployment user or directory |
| `VPSD_CADDY_CONFIG_PATH` | `/etc/caddy/Caddyfile` | Same custom path authorized during setup and used by Caddy |

Do not add registry passwords manually for the normal GitLab registry flow: the generated pipeline uses GitLab's predefined `CI_REGISTRY`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, and `CI_REGISTRY_IMAGE` values.

### If you selected Supabase

For a Supabase application, select `--services supabase` during Next.js initialization and use an existing external Supabase project. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as regular variables available to verification and image-build jobs, with scope `*`. These public values are bundled into browser code. If you build unprotected branches, make these public values available there as well.

Add a protected `SUPABASE_SERVICE_ROLE_KEY` only if your server-side application uses admin operations. Never give it a `NEXT_PUBLIC_` prefix. CI passes the public values to the image build and writes runtime values into a restrictive `runtime.env` on the VM. Follow the generated `services/supabase/README.md` and review/apply `supabase/migrations/` through your existing Supabase migration process. VPSD does not host Supabase or apply migrations.

## 7. Configure DNS and review deployment files

**DNS provider UI:** set the application's A record to the VM's public IPv4 address. Only add an AAAA record if IPv6 correctly reaches the VM. Remove or correct stale records.

**VM/network provider configuration:** allow inbound TCP 80 and 443 to Caddy, and the chosen SSH port from your admin computer and CI runners. Check both provider firewall/NAT rules and the VM firewall. Setup does not change these rules. Do not expose port 3000 publicly; Compose binds it to VM loopback.

**Local computer, generated project root:** check `vpsd/deploy.env` contains your actual domain and port:

```env
DOMAIN=app.example.com
APP_PORT=3000
```

Keep only those two non-secret values in this committed file. Review `vpsd/Caddyfile`, `vpsd/compose.yml`, `app/Dockerfile`, and `.gitlab-ci.yml`. CI replaces the configured Caddyfile with the generated one; this walkthrough assumes a VM dedicated to this single application.

## 8. Connect GitLab and push

**Local computer, generated project root:** replace the remote URL and use the actual GitLab default branch name throughout:

```bash
git remote add origin git@gitlab.com:YOUR_GROUP/YOUR_PROJECT.git
git add .
git commit -m "Initialize application with VPSD"
git branch -M main
```

If `origin` already exists, inspect `git remote -v` and skip adding it when correct. If Git asks for your identity, configure your intended `user.name` and `user.email`, then retry the commit. A GitLab SSH authentication failure concerns your personal GitLab access, not the VM deployment key.

**For an empty GitLab repository:** proceed directly to the push below.

**For a GitLab repository with existing commits:** merge its history first:

```bash
git fetch origin
git merge origin/main --allow-unrelated-histories
```

If `.gitlab-ci.yml` conflicts and you want to keep the newly generated VPSD pipeline:

```bash
git checkout --ours -- .gitlab-ci.yml
git add .gitlab-ci.yml
git status
```

During this merge, `--ours` means the local VPSD file. Review any remote security jobs before replacing them. Resolve other conflicts individually, remove conflict markers, and stage each resolved file with `git add PATH_TO_FILE`. Finish a conflicted merge with `git commit`. If the merge completed automatically, no extra commit is needed.

**Local computer, after the merge and review:**

```bash
git push -u origin main
```

Do not force-push. If the remote advanced, fetch and merge its changes again. Preserve both histories. Configure the variables and branch protection before pushing so the deployment job can access its credentials.

## 9. Follow the first deployment

**GitLab UI:** open the pipeline for your push and inspect the jobs in order:

| Job | Expected result |
| --- | --- |
| `verify_application` | Installs dependencies from `app/`, runs tests if present, and builds Next.js |
| `build_application_image` | Builds with Buildah, pushes to the GitLab registry, and exports an immutable image digest |
| `deploy_production` | Connects over verified SSH, transfers assets, pulls/starts the image, validates and reloads Caddy |

Deployment runs only on the default branch and is serialized with a production resource group. If a job fails, open its log and fix the first failure before retrying. See the troubleshooting table below.

## 10. Verify the application and redeploy

**Fresh VM deployment-user session:**

```bash
docker ps --filter label=com.docker.compose.service=app
curl -I http://127.0.0.1:3000
systemctl is-active caddy
```

Use your configured application port. Expect a running application container, an HTTP response, and `active`. For the unmodified starter, expect HTTP 200. An application redirect may also be intentional. These checks avoid running Compose manually without the `APP_IMAGE` value supplied by CI.

**Local computer:**

```bash
curl -I https://app.example.com
```

Open the same URL in a browser. Expect the starter page and a valid HTTPS certificate. Allow time for DNS propagation and initial certificate issuance; if HTTPS fails, inspect DNS and Caddy logs rather than bypassing certificate checks.

For later deployments, edit the application, review and commit the changes, and push to the default branch normally. GitLab builds a new image and deploys its digest; rerunning `vpsd init` or `vpsd setup` is not part of routine application deployment.

## Troubleshooting

Run local checks on your computer and privileged VM checks through the existing admin login.

| Symptom | Check and recovery |
| --- | --- |
| Setup failed or service inactive | **VM admin:** inspect `sudo journalctl -u docker -u caddy -n 100 --no-pager`. Correct the reported package/service error, then rerun setup. Compatible Docker installations should be reused. |
| SSH timeout/refused | Check the exact hostname and external port, VM/provider firewall and NAT, and **VM admin:** `systemctl is-active ssh`. Ensure CI runners can reach SSH too. |
| `Permission denied (publickey)` or password prompt | **Local:** use the exact key and user in step 5. **VM admin:** inspect `sudo ls -ld /home/vpsd/.ssh` and `sudo ls -l /home/vpsd/.ssh/authorized_keys`; expect owner `vpsd`, modes 700/600, and the matching single-line public key. Correct using step 4. Do not enable password login as a workaround. |
| Host-key verification failed | Repeat the trusted fingerprint comparison. Check that the entry matches `VPS_HOST` and uses `[host]:port` for a nonstandard port. Only replace an old key after verifying a legitimate VM key change. |
| Docker permission denied | Start a fresh deployment-user SSH session and run `id`. If `docker` is missing, verify setup used that user and rerun setup with the correct `DEPLOY_USER`. |
| SSH key invalid / `error in libcrypto` | Check the GitLab variable is Type: Variable, contains the complete multiline private key and final newline, has no extra quotes, and has expansion disabled. An encrypted key is not supported by this unattended pipeline. |
| Variables absent in CI | Check spelling, protected default branch, variable protection, and environment scope. Do not print secrets to diagnose availability. |
| Job pending | **GitLab UI:** check a runner is enabled, online, and eligible for the branch and job. |
| Buildah or registry push failed | Check registry availability and runner support for the generated Buildah container job. Inspect its specific error; do not assume a runner privilege change is always required. Check project registry permissions and predefined registry variables. |
| `ERR_PNPM_BAD_PM_VERSION` | Check the generated verification job enters `app/` before invoking pnpm, and inspect `app/package.json` for conflicting package-manager declarations. Keep the intended version; do not bypass the version check. Source-build installation checks are under Run locally. |
| Caddy sudo asks for a password | **VM admin:** inspect `sudo cat /etc/sudoers.d/vpsd-caddy`. Match the deployment user and configuration path to CI. Generated CI uses `/usr/bin/install`, `/usr/bin/env`, and `/usr/bin/caddy`; rerun setup with the intended settings if permissions differ. Do not grant unrestricted passwordless sudo. |
| HTTPS fails or Caddy returns 502 | **Local:** check DNS A/AAAA records. **VM admin:** inspect `sudo journalctl -u caddy -n 100 --no-pager`. Verify inbound 80/443. Test loopback HTTP on the configured app port and check container status. |
| Application exited | **VM deployment session:** find its ID with `docker ps -a --filter label=com.docker.compose.service=app`, then run `docker logs CONTAINER_ID` using that ID. Fix the application/configuration and push again. |

## Run locally

This optional contributor workflow builds and installs a local tarball. Normal users install the registry release in step 2.

**Local computer, VPSD source repository:**

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm pack
```

`pnpm pack` runs the `prepack` build hook; the explicit build above also allows checking compilation before packaging. Use the actual packed filename printed by `pnpm pack`; the example below uses version `0.1.0`.

A manual test found that a rebuilt tarball contained the new template while the global installation still had the old one. A unique tarball filename resolved it. Reuse of the same local dependency path was a suspected caching cause; pnpm's internal cause was not established.

**Local computer, same source directory:**

```bash
VPSD_LOCAL_PACKAGE="vpsd-local-$(date +%Y%m%d%H%M%S).tgz"
cp vpsd-0.1.0.tgz "$VPSD_LOCAL_PACKAGE"
pnpm remove -g vpsd
pnpm add -g "./$VPSD_LOCAL_PACKAGE"
type -a vpsd
pnpm bin -g
pnpm root -g
tar -xOf "$VPSD_LOCAL_PACKAGE" package/dist/templates/gitlab-ci.yml | head -20
head -20 "$(pnpm root -g)/vpsd/dist/templates/gitlab-ci.yml"
```

Both templates should contain `cd app`, followed by the corrected verification commands in step 3. Multiple executable locations from `type -a` may indicate a different installation takes precedence. Rebuilding/repacking does not update installed copies or existing generated projects.

**Local computer:** verify the actual installed command in a disposable directory:

```bash
VPSD_CHECK_DIR="$(mktemp -d)"
cd "$VPSD_CHECK_DIR"
vpsd init --name template-check --app none --ci gitlab \
  --services none --domain test.example.com --port 3000
head -20 .gitlab-ci.yml
```

Expect the corrected GitLab verification block. This checks generation, not a Next.js build or VM deployment. Invoking `node dist/cli/index.js` directly only checks the source build; it does not verify what the global `vpsd` command runs.

## Validation status

The complete deployment path has been validated end to end twice. The first round produced the Issue 21 corrections and returned HTTP 200 through Caddy. The second round produced the installation guidance in Issue 22 and confirmed successful deployment after resolving the stale local package installation.

Issue 23 requires verification of the exact packed VPSD artifact, its installed CLI, and generated templates, alongside repository quality gates. It does not require a third live VPS deployment. See the [release preparation record](release-preparation.md) for package-level results.

Only verification through the final public registry remains deferred until publication: record the published version, confirm the registry-installed `vpsd` binary and generated templates, and check these installation instructions against that final package. This pending publication check does not invalidate the two completed live deployments.
