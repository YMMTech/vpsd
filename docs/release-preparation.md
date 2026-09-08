# VPSD v0.1.1 release preparation

VPSD means **VPS Deployment**. The canonical GitHub repository is `YMMTech/vpsd`, npm package is `@younmon/vpsd`, and executable is `vpsd`. Version `0.1.1` is a corrective packaging candidate and will be the first npm-published VPSD version. The published GitHub v0.1.0 release is valid and immutable. npm rejected the unscoped `vpsd` name before publishing 0.1.0; no npm 0.1.0 exists. Never modify, recreate, retag, or replace v0.1.0 or its release assets, and never publish `@younmon/vpsd@0.1.0`. v0 is feature-frozen: one application, one VPS, generated GitHub or GitLab CI, and optional Next.js/Supabase integration.

## Deployment names and migration

All current filenames, generated assets, host defaults, and environment variables now use VPSD. This supersedes the earlier compatibility-name retention decision at the maintainer's request. There are no legacy aliases.

| Previous name | Current name |
| --- | --- |
| `simploy/` | `vpsd/` |
| `.github/workflows/simploy-deploy.yml` | `.github/workflows/vpsd-deploy.yml` |
| `simploy-production` | `vpsd-production` |
| Default account `simploy`, `/home/simploy/app` | `vpsd`, `/home/vpsd/app` |
| `simploy-ingress` | `vpsd-ingress` |
| `/etc/sudoers.d/simploy-caddy` | `/etc/sudoers.d/vpsd-caddy` |
| `SIMPLOY_DEPLOY_PATH`, `SIMPLOY_CADDY_CONFIG_PATH`, `SIMPLOY_INGRESS_NETWORK` | `VPSD_DEPLOY_PATH`, `VPSD_CADDY_CONFIG_PATH`, `VPSD_INGRESS_NETWORK` |
| `SIMPLOY_RUN_INTEGRATION_TESTS` | `VPSD_RUN_INTEGRATION_TESTS` |

Current architecture/specification filenames and historical issue filenames also use `vpsd`. Historical issue text preserves the names actually used at the time. Local test variables and prefixes use VPSD too. Generic inputs such as `DEPLOY_USER`, `VPS_USER`, and `VPS_PORT` retain their names.

Existing generated projects and prepared hosts are not automatically migrated. Before deploying a renamed project, coordinate these changes:

1. Rename the deployment directory and existing GitHub workflow file together, updating its paths and CI variables; do not leave both deployment workflows active. Coordinate the concurrency-group change so old and new workflows cannot deploy simultaneously.
2. Run the new setup for the intended deployment account and install its public key. The default account/home is now `vpsd`; an existing account can be used explicitly through `DEPLOY_USER` and `VPS_USER`, with an explicit `VPSD_DEPLOY_PATH` pointing to its current data.
3. Preserve deployment data and runtime secrets. Changing deployment directory changes Compose's default project identity, so coordinate shutdown of the previous application's containers before bringing up the new project to avoid loopback port conflicts. Do not delete the previous data or keys as part of a filename rename.
4. Update CI overrides to `VPSD_*`. Setup creates `vpsd-ingress` and the new narrow Caddy sudoers file; it does not remove the old account, network, containers, or sudoers file. After successful migration, the operator can review and retire unused old resources.

This round changes repository files and validates the renamed contract locally. It does not migrate any live VPS or generated user project.

## Architecture and live validation

`vpsd setup` installs/configures supported Debian/Ubuntu prerequisites: OpenSSH, Docker Engine, Docker Compose, system-level Caddy, the deployment user/network, and narrow Caddy permissions. It reuses compatible Docker installations. Cloud-instance creation, general OS hardening, DNS and firewall policy remain operator responsibilities.

CI deploys an immutable image digest with Compose. Persistent host Caddy proxies to the application's loopback port; Caddy does not run inside the application's Compose lifecycle. The application also joins the external ingress network. Neither application health checks nor automatic rollback are implemented.

The live deployment path was validated **twice**. Issue 21's corrected deployment returned HTTP 200 through Caddy and has regression coverage. Issue 22 documents the second installation/deployment round. No third live deployment is a gate for this preparation. Only final registry installation verification is deferred until publication.

## Repository and package contents

`dist/` is generated and ignored by Git. It is required in the npm archive, so `prepack` rebuilds it and copies every runtime template and the setup script before packing. Do not commit `dist/`. The package `files` allowlist includes compiled runtime files, the installation/release-preparation guides, release notes, changelog, and MIT license; npm also includes package metadata and README.

`tmp/`, `artifacts/`, tarballs, logs, local environment files, editor settings, `.agents/`, and `.codex/` are ignored. They are not release source. Existing useful issue/specification history is preserved. Empty local scratch directories do not need deletion to remove them from the tracked tree. Ignore rules do not remove secrets from existing Git history; review all history before the later public migration.

## Release identity and repository metadata

`package.json` is the authoritative version source: `0.1.1` (no `v` prefix). Product: VPSD — VPS Deployment. npm package: `@younmon/vpsd`; CLI: `vpsd`. Author and copyright holder: **Youness Mondir**. License: **MIT**, with `Copyright (c) 2026 Youness Mondir` in `LICENSE`. `YMMTech` is only the GitHub account namespace, not a separate legal entity or copyright holder.

- Repository: `git+https://github.com/YMMTech/vpsd.git`.
- Homepage: <https://github.com/YMMTech/vpsd#readme>.
- Issue tracker: <https://github.com/YMMTech/vpsd/issues>.
- Node.js: `>=22`; declared development package manager: pnpm `10.30.3`.
- Intended annotated tag: `v0.1.1`; GitHub release title: **VPSD v0.1.1**.
- `publishConfig.access=public` is prepared, not executed. No publishing automation is enabled.

GitHub is the canonical release surface; `github` points to `YMMTech/vpsd`. `origin` remains the existing GitLab remote. Keep `main` and release tags synchronized across both without rewriting history; no duplicate GitLab Release object is required. Generated application GitLab CI support is unchanged. Repository description: “VPSD — VPS Deployment: one application, one VPS, deployment through GitHub Actions or GitLab CI.” Suggested topics: `vps`, `deployment`, `docker`, `caddy`, `github-actions`, `gitlab-ci`, `nextjs`. This document does not change remote repository settings.

## Versioning and tag policy

VPSD uses Semantic Versioning, `MAJOR.MINOR.PATCH`, with this pre-1.0 policy:

| Version | Meaning |
| --- | --- |
| `0.1.0` | First GitHub VPSD release; npm publication did not occur |
| `0.1.1` | Scoped npm packaging correction; intended first npm release |
| `0.1.2` | Subsequent compatible maintenance correction |
| `0.2.0` | New backward-compatible v0 capability |
| `1.0.0` | Deliberate declaration that the public API, configuration, and behavior are stable |

Do not hide incompatible changes in a patch release; document and review compatibility before choosing a release version. No release branches or duplicate version constants/files are required. Read the package version from `package.json`; changelog headings and release notes are intentional records for specific releases.

Release tags are **annotated**, in the form `vMAJOR.MINOR.PATCH`, for example `v0.1.1`. Signed tags are optional, not required for this release. The later tag command is:

```bash
git tag -a v0.1.1 -m "VPSD v0.1.1"
```

Do not execute it during preparation. Once published, release tags must never be moved or reused. A correction to `v0.1.0` is this new `v0.1.1` release, not a replacement tag or artifact.

If available for this repository/account, enable GitHub release immutability **before publication**, in a separately authorized settings change. Create a draft, attach and verify all assets, then publish. GitHub's [immutable release guidance](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) explains that publication locks release assets and the associated tag; see [configuration instructions](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes). No setting is enabled by this task.

## Local artifact verification

The existing `scripts/smoke-package.sh` installs the exact archive offline into an isolated temporary pnpm global directory. It checks binary resolution with `type -a vpsd`, root/setup help, installed package version and metadata against `package.json`, MIT license contents, every runtime template, and fresh init for both CI providers. Generated templates must match source and include the Issue 21 deployment corrections.

The current CLI does not expose a version flag/command; validate version through installed package metadata. Do not add a version constant or a new CLI feature for this release task. The smoke test uses `--app none` to inspect generated assets without downloading a framework; the existing suite covers Next.js integration and deployment shell behavior.

The Docker integration test uses local disposable containers and requires Docker access. The two completed live VPS deployments remain valid; no third live VPS deployment is required.

## Final release sequence

This is a procedure for the later authorized release, not permission to publish. Commands run from the repository root. **Steps 15–21 must not run in this preparation task.** Commit/push actions below are also documented only; this task leaves changes for review.

1. Confirm `package.json` version is `0.1.1`:

   ```bash
   node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version'
   ```

2. Confirm MIT license, copyright year/name, author Youness Mondir, and `YMMTech/vpsd` repository metadata. Confirm the npm account has publish access to the `@younmon` scope and recheck scoped package availability before publication.
3. Update `CHANGELOG.md`, including `## [0.1.1] - 2026-09-08`, with factual implemented changes and validation evidence.
4. Finalize `RELEASE_NOTES.md` for **VPSD v0.1.1**. Keep baseline CI evidence distinguished from final release-commit validation.
5. Run `pnpm install --frozen-lockfile`, then `pnpm test`.
6. Run `pnpm test:integration` with local Docker access.
7. Run `pnpm typecheck`.
8. Run `pnpm lint`.
9. Run `pnpm build`.
10. Create and inspect the exact package artifact:

    ```bash
    pnpm pack --pack-destination artifacts
    tar -tzf artifacts/younmon-vpsd-0.1.1.tgz
    sha256sum artifacts/younmon-vpsd-0.1.1.tgz > artifacts/younmon-vpsd-0.1.1.tgz.sha256
    ```

    `prepack` rebuilds the runtime. Review the archive for required runtime files and license, and absence of tests, scratch files, credentials, or machine state. Preserve this artifact and checksum; do not silently repack after verification.

11. Install/test that exact artifact:

    ```bash
    bash scripts/smoke-package.sh "$PWD/artifacts/younmon-vpsd-0.1.1.tgz"
    sha256sum -c artifacts/younmon-vpsd-0.1.1.tgz.sha256
    ```

12. Commit reviewed release-preparation changes. Record `git rev-parse HEAD` with the checksum outside the archive. Ensure that all artifact inputs match the commit; any package input change requires rebuilding and retesting. Local ignored artifacts are not committed.
13. Push the release commit to both remotes, after verifying `git remote -v`:

    ```bash
    git push github main
    git push origin main
    ```

14. Confirm hosted **VPSD quality** CI is green on that exact SHA, including its package smoke test:

    ```bash
    gh run list --repo YMMTech/vpsd --commit "$(git rev-parse HEAD)"       --json headSha,status,conclusion,url,workflowName
    ```

    Require a completed successful run for the exact commit. A successful earlier baseline is insufficient. Review draft-release settings and enable immutability, if available and authorized, before proceeding. Check that `v0.1.1` does not already exist on either remote. Do not overwrite an existing tag.

15. **Later authorization required:** create the annotated tag on the reviewed release commit:

    ```bash
    git tag -a v0.1.1 -m "VPSD v0.1.1"
    git rev-parse 'v0.1.1^{commit}'
    ```

16. Push the release tag to both remotes. The full synchronization commands are:

    ```bash
    git push github main
    git push github v0.1.1
    git push origin main
    git push origin v0.1.1
    ```

17. Create the GitHub Release as a **draft**, never immediately published:

    ```bash
    gh release create v0.1.1 --repo YMMTech/vpsd --verify-tag --draft       --title "VPSD v0.1.1" --notes-file RELEASE_NOTES.md
    ```

18. Attach the exact tested artifact and checksum, then verify them:

    ```bash
    gh release upload v0.1.1 artifacts/younmon-vpsd-0.1.1.tgz       artifacts/younmon-vpsd-0.1.1.tgz.sha256 --repo YMMTech/vpsd
    VPSD_RELEASE_REVIEW_DIR="$(mktemp -d)"
    gh release download v0.1.1 --repo YMMTech/vpsd       --pattern 'younmon-vpsd-0.1.1.tgz*' --dir "$VPSD_RELEASE_REVIEW_DIR"
    cmp artifacts/younmon-vpsd-0.1.1.tgz "$VPSD_RELEASE_REVIEW_DIR/younmon-vpsd-0.1.1.tgz"
    cmp artifacts/younmon-vpsd-0.1.1.tgz.sha256 "$VPSD_RELEASE_REVIEW_DIR/younmon-vpsd-0.1.1.tgz.sha256"
    gh release view v0.1.1 --repo YMMTech/vpsd
    git ls-remote github 'refs/tags/v0.1.1*'
    git ls-remote origin 'refs/tags/v0.1.1*'
    ```

    Review title, release notes, assets, local checksum, and the peeled annotated tag commit on both remotes. It must equal the reviewed release SHA with green CI. Do not substitute GitHub's automatically generated source archive for the tested npm tarball.

19. Publish the reviewed GitHub draft:

    ```bash
    gh release edit v0.1.1 --repo YMMTech/vpsd --draft=false
    ```

20. Publish the exact tested package to npm, using the authorized account and required authentication/2FA:

    ```bash
    npm whoami
    npm publish ./artifacts/younmon-vpsd-0.1.1.tgz --access=public --dry-run
    sha256sum -c artifacts/younmon-vpsd-0.1.1.tgz.sha256
    npm publish ./artifacts/younmon-vpsd-0.1.1.tgz --access=public
    ```

21. Run `npm view @younmon/vpsd version` and require `0.1.1`, then verify a fresh isolated registry installation of `@younmon/vpsd@0.1.1`: binary resolution, help, installed version/license/metadata, and initialization with both providers. Compare generated templates to the reviewed artifact and record the registry integrity/version. This check is deferred until npm publication.
22. Never move or reuse `v0.1.1`. Any subsequent release correction becomes `0.1.2` with a new annotated tag `v0.1.2` and a separately tested artifact.

No tag, GitHub Release (including draft), npm publication, or public announcement is created by this preparation task. GitHub is the canonical release surface; a duplicate GitLab Release object is unnecessary.

## Validation record

- Local release gates: 75 unit/regression tests, the separate Docker/Compose/Caddy integration test, typecheck, lint, build, and installed-artifact smoke are re-run for this preparation. Results are recorded in the accompanying completion report.
- The two successful live VPS deployments include HTTP 200 through Caddy. No third deployment is required or performed.
- Hosted GitHub CI: **VPSD quality** completed successfully on the already pushed candidate baseline `55fc4fabf87b810c61d6a489b42478e17de7d1b6`, verified through GitHub's API: [run 34210000936](https://github.com/YMMTech/vpsd/actions/runs/34210000936).
- The new scoped-package correction changes are not committed or pushed by this task. Hosted CI on their exact final SHA remains a mandatory pre-tag gate. Do not claim the baseline run validates this new worktree.
- Current license, author, and repository URLs are finalized. Remaining publication-time checks: final commit/CI identity, npm name/account permissions, repository immutability availability/configuration, tag absence/synchronization, draft assets/checksum, and registry installation after authorized publication.

Artifact checksum and base commit are recorded in an ignored local release validation file under `artifacts/`, outside the tarball, to avoid self-referential checksums. This file is evidence, not a second authoritative version source.
