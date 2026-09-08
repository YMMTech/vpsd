# Issue 22 — Detailed Step-by-Step Installation and First Deployment Guide

## Status

Open — issue specification ready for review. The installation guide itself remains to be delivered and validated against this specification.

## Context

Manual installation on a VM exposed gaps between running `simploy setup` and completing the first GitLab deployment. The user had prepared the VM and initialized a GitLab project, but still needed guidance on repository initialization, deployment SSH access, and CI variables.

`simploy setup` creates the deployment account without setting a password. Attempting `ssh-copy-id` before the account could authenticate did not work. Setting a password with `sudo passwd simploy` also did not resolve the user's SSH setup. The guide must not assume password-based SSH is available or require enabling it.

## Required Documentation

Provide a complete, ordered installation guide from prerequisites through the first successful HTTPS deployment. Link it prominently from the README. The main installation path must use the published registry package:

```bash
pnpm add -g simploy
```

Explain installation on the local computer for `simploy init` and on the VM for `simploy setup`. Source builds, tarball installation, and local-package troubleshooting belong only in the optional "Run locally" section.

Every step must state where commands run: local computer, VM admin session, or GitLab UI. Define placeholders before use, provide copyable commands, describe expected results, and explain how to recover from common failures.

Cover these steps:

1. Prepare a supported VM, an existing admin SSH login with sudo access, the local CLI prerequisites, a domain, and a GitLab project with an available runner and container registry.
2. Install Simploy from the registry and run `simploy setup` on the VM. Explain what setup configures and what remains manual. Verify Docker, Compose, Caddy, the deployment user, and `simploy-ingress`.
3. Run `simploy init` locally in a fresh directory outside an existing Git repository, selecting GitLab. Explain that init creates the local repository; add the GitLab remote afterward. Cover both an empty GitLab project and one with existing commits without recommending force-push.
4. Generate a dedicated CI SSH key locally and install its public key through the existing VM admin session using the working method below.
5. Verify key-only login as the deployment user and Docker access in a fresh SSH session. Include the default SSH port and custom-port equivalents.
6. Obtain and verify the VM host key through a trusted channel, then prepare `SSH_KNOWN_HOSTS`. Explain custom-port known-hosts syntax and do not recommend disabling host-key verification.
7. Configure GitLab CI/CD variables with exact value formats and settings: `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY`, and `SSH_KNOWN_HOSTS`. Explain multiline values, regular Variable versus File type for the generated pipeline, and protected-variable/default-branch requirements.
8. Explain optional overrides and their defaults: `VPS_PORT=22`, `SIMPLOY_DEPLOY_PATH=/home/simploy/app`, and `SIMPLOY_CADDY_CONFIG_PATH=/etc/caddy/Caddyfile`. Explain adjustments needed for a custom deployment user or Caddy path.
9. Configure DNS and public access to ports 80 and 443, review `simploy/deploy.env`, and explain conditional Supabase configuration separately.
10. Review, commit, and push the generated project to the GitLab default branch. Explain the pipeline stages and how to inspect failures.
11. Verify the running container, Caddy, and the public HTTPS application manually. Explain how a subsequent push redeploys the application.

## Existing GitLab Repository History

When the GitLab project already contains commits, merge its history before the first push. Run these commands **locally, from the generated project root**, replacing the remote URL. This example assumes the GitLab default branch is `main`; substitute its actual name if different.

```bash
git remote add origin git@gitlab.com:YOUR_GROUP/YOUR_PROJECT.git
git add .
git commit -m "Initialize application with Simploy"
git branch -M main
git fetch origin
git merge origin/main --allow-unrelated-histories
```

If `origin` is already configured, check `git remote -v` and skip `git remote add` when it points to the correct project.

The generated local repository and the existing GitLab repository have independent histories, so the initial merge requires `--allow-unrelated-histories`. If `.gitlab-ci.yml` conflicts and the intended result is the newly generated Simploy pipeline, keep the local version:

```bash
git checkout --ours -- .gitlab-ci.yml
git add .gitlab-ci.yml
git status
```

Here `--ours` means the local generated file during this merge; do not generalize this instruction to rebases or discard other remote changes automatically. Review any GitLab-added CI jobs before replacing the remote CI file.

For other conflicts, manually resolve the conflicting files, remove conflict markers, and stage each resolved file with `git add <file>`. Complete the merge with:

```bash
git commit
```

If the merge completed automatically, no additional merge commit command is needed. After the merge is complete and the result has been reviewed, push:

```bash
git push -u origin main
```

Do not force-push over the existing remote history. Configure the deployment CI variables before pushing if the first push should deploy successfully.

For an empty GitLab repository, omit the fetch/merge step and push the initial local commit normally. Keep destructive test resets outside the normal installation path. If documenting a reset, distinguish deleting tracked files with a normal commit from deleting a GitLab project or rewriting history; preserve the repository and settings, and do not prescribe a force push.

## Working SSH Public-Key Installation Method

The user successfully installed the key with the following commands in an existing **VM admin session**. Preserve this method in the guide, using a placeholder instead of the user's actual public key:

```bash
sudo install -d -m 700 -o simploy -g simploy /home/simploy/.ssh
echo 'ssh-ed25519 REPLACE_WITH_YOUR_PUBLIC_KEY simploy-ci' | sudo tee -a /home/simploy/.ssh/authorized_keys >/dev/null
sudo chown simploy:simploy /home/simploy/.ssh/authorized_keys
sudo chmod 600 /home/simploy/.ssh/authorized_keys
```

Explain that the entire quoted example key must be replaced with the single-line contents of the locally generated `.pub` file. Use literal `authorized_keys` in shell code blocks, without Markdown backslash escaping.

Requirements:

- Append the public key; preserve existing authorized keys.
- Explain that repeating the append command adds duplicate entries.
- Keep the private key on the local computer and in the appropriate GitLab CI variable; never copy it to the VM or commit it.
- Do not require a password for the `simploy` account.
- Explain how to adapt the username, group, and home directory if setup used a custom deployment account.
- Show a local login check using the dedicated identity, `IdentitiesOnly=yes`, and `BatchMode=yes`, after verifying the host key.

## Troubleshooting

Include actionable checks for:

- `Permission denied (publickey)`, unexpected password prompts, wrong SSH user or port, and incorrect key-file permissions or ownership.
- Host-key verification failures and mismatched custom-port entries.
- Docker access denied until a fresh deployment-user login session.
- Missing CI variables because the branch is not protected, and incompatible variable types or multiline formatting.
- Unavailable runners or registry build/push failures.
- Caddy sudo permission/path mismatches, DNS errors, and unreachable HTTP/HTTPS ports.

## Run locally

This optional section is for contributors testing Simploy from source. It is separate from the normal registry installation guide. `pnpm add -g simploy` does not select the tarball in the current directory. Building and packing do not update the globally installed copy or projects generated previously.

A freshly generated project also contained an outdated GitLab CI template despite a new build after the Issue 21 commit. Inspection established that the source, build output, and packed tarball contained the fix, while the globally installed package still contained the older template. Running the installed `simploy init` reproduced the old output; invoking the current build directly generated the corrected file. Installing the tarball under a new filename resolved the reported installation problem. Do not describe this as an old project or a missing Issue 21 implementation.

Document this local-build sequence, run **from the Simploy source repository**:

```bash
pnpm build
pnpm pack
```

At the time of the manual test, the package version was `0.1.0`, and the package had no build hook for `pnpm pack`. The guide must use the actual output filename for the version being tested and explicitly build before packing unless that behavior changes.

The reported workaround for the stale installation was a new tarball filename. For repeated local builds, use a unique filename each time:

```bash
SIMPLOY_LOCAL_PACKAGE="simploy-local-$(date +%Y%m%d%H%M%S).tgz"
cp simploy-0.1.0.tgz "$SIMPLOY_LOCAL_PACKAGE"
pnpm remove -g simploy
pnpm add -g "./$SIMPLOY_LOCAL_PACKAGE"
```

Describe reuse of the same local dependency path as a suspected caching cause, not a proven pnpm internal diagnosis. The confirmed fact is that the installed template differed from the rebuilt tarball.

Verify the actual installed command and template before generating the real project:

```bash
type -a simploy
pnpm bin -g
pnpm root -g
tar -xOf "$SIMPLOY_LOCAL_PACKAGE" package/dist/templates/gitlab-ci.yml | head -20
head -20 "$(pnpm root -g)/simploy/dist/templates/gitlab-ci.yml"
```

Both templates must contain the corrected verification commands:

```bash
cd app
corepack enable
pnpm install --frozen-lockfile
pnpm run --if-present test
pnpm run build
```

The old `pnpm --dir app` commands ran while Corepack was outside the application directory. In the reported pipeline, Corepack selected pnpm `12.3.4` while `app/package.json` required `10.30.3`, producing `ERR_PNPM_BAD_PM_VERSION`. Do not bypass the version check or change the application's declared version merely to accommodate this failure.

Validate generation using the installed **`simploy init` command**, in a fresh disposable directory, and inspect the generated `.gitlab-ci.yml`. Invoking `node dist/cli/index.js` alone does not validate the global installation. A template-only check can use `--app none --ci gitlab --services none`; this does not validate a Next.js build or a deployment.

Use standard shell tools for documentation checks; do not require `rg`, which was unavailable on the user's machine.

## Manual Validation Record

- The user confirmed public-key installation through the existing VM admin session worked.
- The current build generated the corrected GitLab CI template in a disposable project.
- The installed `simploy init` command reproduced the old template before reinstalling.
- The user supplied output showing a corrected tarball and an outdated globally installed template.
- After the unique-filename reinstall workaround, the user reported that everything worked.

The final report did not include individual pipeline results or an HTTPS response, so do not invent those observations. As part of delivering the guide, record the tested package version, installation route, VM OS, generated application choice, pipeline outcome, and HTTPS verification. Manual validation is required; no automated tests are requested for this documentation issue.

## Acceptance Criteria

- [ ] A user can follow one linked guide from a fresh VM and GitLab project to a working HTTPS deployment without undocumented steps.
- [ ] Every command identifies its execution location and all placeholders are explained.
- [ ] Repository initialization and remote attachment order are unambiguous.
- [ ] Empty and existing GitLab repositories are covered, including keeping Simploy's CI file during a merge conflict without force-pushing.
- [ ] The main guide installs the published registry package without requiring source builds or local tarballs.
- [ ] Optional source-build, tarball-installation, and stale-install troubleshooting instructions are grouped under "Run locally".
- [ ] Validation exercises the installed `simploy init` command and inspects its generated GitLab CI file.
- [ ] The working public-key installation method above is documented without a real user key.
- [ ] No step assumes the deployment account has a password or requires enabling SSH password authentication.
- [ ] CI variable instructions match the generated GitLab pipeline.
- [ ] Default and custom SSH ports, deployment users, and paths are covered.
- [ ] Expected results and troubleshooting accompany the major verification steps.
- [ ] The guide is validated manually on a VM through first deployment; record the outcome and any remaining gaps.

## Scope

This issue requests documentation and manual validation. It does not request changes to setup behavior, CI templates, or automated tests.
