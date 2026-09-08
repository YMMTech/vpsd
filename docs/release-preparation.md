# VPSD 0.1.0 private release preparation

VPSD means **VPS Deployment**. The intended repository is `vpsd`, npm package is `vpsd`, and executable is `vpsd`. Version `0.1.0` is the intended first public version; this is currently a private, unpublished candidate. v0 is feature-frozen: one application, one VPS, generated GitHub or GitLab CI, and optional Next.js/Supabase integration.

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

`dist/` is generated and ignored by Git. It is required in the npm archive, so `prepack` rebuilds it and copies every runtime template and the setup script before packing. Do not commit `dist/`. The package `files` allowlist includes compiled runtime files, the installation/release-preparation guides, and release notes; npm also includes package metadata, README, and a license when present.

`tmp/`, `artifacts/`, tarballs, logs, local environment files, editor settings, `.agents/`, and `.codex/` are ignored. They are not release source. Existing useful issue/specification history is preserved. Empty local scratch directories do not need deletion to remove them from the tracked tree. Ignore rules do not remove secrets from existing Git history; review all history before the later public migration.

## Metadata decisions and remaining publication inputs

- Name/bin: `vpsd`; version: `0.1.0`; Node.js: `>=22`; development package manager: pnpm `10.30.3`.
- Description and keywords describe the implemented deployment initializer/setup scope.
- `publishConfig.access` is `public`, prepared but unused. There is no automated publishing workflow.
- License and public author/maintainer identity require an explicit owner decision. Until confirmed, metadata is `UNLICENSED` and no author is invented. Do not publish in that state.
- The final GitHub owner is not specified and the repository does not exist yet. `repository`, `homepage`, and `bugs` are deliberately omitted, rather than pointing to invented public URLs. Fill them only after the destination exists in the later authorized migration.
- Package-name availability and a final basic name/trademark conflict review must be repeated immediately before publication. No availability guarantee is made by this candidate.

## Future GitHub migration

Destination name: `vpsd`; default branch: `main`; description: “VPSD — VPS Deployment: one application, one VPS, deployment through GitHub Actions or GitLab CI.” Suggested topics: `vps`, `deployment`, `docker`, `caddy`, `github-actions`, `gitlab-ci`, `nextjs`.

Preserve Git history. Create the destination only in a separately authorized round, review existing branches/tags and history for credentials/private material, then push the approved branches and tags explicitly. Do not mirror private refs blindly or rewrite useful history. The existing GitLab quality/security CI may remain for the private source. `.github/workflows/ci.yml` prepares equivalent quality gates and local Docker integration on GitHub, without secrets or publishing permissions. Generated application support for both providers remains intact.

Primary documentation uses relative repository links. Future URL fields are isolated to package metadata and the confirmed migration destination. Do not copy private GitLab CI variables, runner configuration, or personal account details into GitHub. Configure any GitHub repository settings separately after authorization.

## Verify a candidate locally

From the repository root, using the declared pnpm version:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:integration
pnpm pack --pack-destination artifacts
tar -tzf artifacts/vpsd-0.1.0.tgz
bash scripts/smoke-package.sh "$PWD/artifacts/vpsd-0.1.0.tgz"
sha256sum artifacts/vpsd-0.1.0.tgz
```

The integration test requires local Docker access and image retrieval. It uses disposable local containers, not a VPS. The package smoke script installs the exact archive offline into isolated temporary global directories, checks `type -a vpsd`, runs help and setup help (not setup), initializes both providers, compares installed templates with source and generated output, and checks Issue 21 corrections. It never uses `dist/` directly as the CLI. `--app none` verifies packaging/generation; the existing Next.js and deployment regression tests cover their implemented contracts.

## Later publication steps — not executed in this round

These steps require a separate explicit publication decision. The following is a runbook, not authorization to execute it.

1. Confirm the public license and maintainer identity. Recheck npm `vpsd` name availability and basic name conflicts; resolve any conflict before publication.
2. Review the entire Git history, refs, tracked files, and packed archive for private information. Confirm destination owner, `vpsd` repository name, and `main` branch. Create/migrate the GitHub repository only when authorized, preserving approved history.
3. Set real package metadata using the confirmed owner below. `GITHUB_OWNER` is an operator-supplied shell variable, not a placeholder to publish literally:

   ```bash
   npm pkg set "repository.type=git" \
     "repository.url=git+https://github.com/${GITHUB_OWNER}/vpsd.git" \
     "homepage=https://github.com/${GITHUB_OWNER}/vpsd#readme" \
     "bugs.url=https://github.com/${GITHUB_OWNER}/vpsd/issues"
   ```

4. Finalize license/author and release notes, commit the reviewed metadata, and run all candidate checks above again. Metadata changes require a new archive and exact-artifact smoke test. Record its checksum and source commit. Confirm the GitHub quality workflow passes on that commit.
5. Review the npm payload and authentication. The following commands are for the later publication round only:

   ```bash
   npm whoami
   npm view vpsd name version
   npm publish artifacts/vpsd-0.1.0.tgz --access public --dry-run
   npm publish artifacts/vpsd-0.1.0.tgz --access public
   ```

   For an unclaimed name, `npm view` may report not found; investigate unexpected existing ownership. Publish the exact reviewed tarball, not an implicitly rebuilt directory. Use the approved npm account and its required authentication/2FA.

6. Create the future annotated tag `v0.1.0` on that reviewed release commit, push it to the confirmed GitHub remote, and create release title **VPSD 0.1.0 — VPS Deployment** with `RELEASE_NOTES.md` as the body. These commands are also deferred:

   ```bash
   git tag -a v0.1.0 -m "VPSD 0.1.0"
   git push github main
   git push github v0.1.0
   gh release create v0.1.0 --repo "${GITHUB_OWNER}/vpsd" \
     --verify-tag --title "VPSD 0.1.0 — VPS Deployment" \
     --notes-file RELEASE_NOTES.md
   ```

7. Verify a fresh install of the published `vpsd@0.1.0`, binary resolution, help, and generated assets against the reviewed artifact. Update the publication-specific installation record. No third live VPS deployment is necessary unless a separate runtime change warrants it.

No npm publication, public repository creation, tag, release, migration push, or announcement is authorized by this document alone.

## Candidate verification results

Results for the private Issue 23 preparation are recorded here after execution. Final public URLs, license/maintainer confirmation, hosted GitHub CI execution, and registry verification are separate pending publication inputs as described above.

| Check | Executed result |
| --- | --- |
| Toolchain | Node.js 24.14.0; pnpm 10.30.3 on the local Linux environment |
| Unit/regression suite | 75 passed; the separately gated Docker test is skipped in the regular suite |
| Typecheck / lint / build | Passed |
| Existing Docker/Compose/Caddy integration | Passed (1 test), with local Docker socket access; no VPS used |
| Artifact contents | Compiled CLI, setup script, all template files (including hidden Docker ignore file), metadata and allowed documentation verified |
| Exact-artifact install | Offline isolated pnpm global installation passed; intended temporary `vpsd` binary resolved |
| Installed CLI | Root help, setup help, GitHub init, and GitLab init passed |
| Issue 21 package contract | Installed template bytes matched source; generated CI matched installed templates; correction checks passed |
| Cleanup/review | No tracked tmp/dist/archive/editor state; removed obsolete empty-directory placeholders; artifact kept ignored under `artifacts/` |
| Credential-pattern review | No matching file revisions across 26 commits for the reviewed private-key/token patterns; not a comprehensive security audit |
| Public/hosted operations | None; hosted GitHub CI, final URLs, name recheck, and registry installation remain deferred |

The final artifact checksum is recorded in Issue 23 rather than inside the archive itself. The candidate is not publication-authorized; unresolved owner metadata must be finalized and the artifact rebuilt/reverified before any public release.
