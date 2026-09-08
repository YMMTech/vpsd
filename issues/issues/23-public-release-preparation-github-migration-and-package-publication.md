# Issue 23 — VPSD Pre-Publication Release Preparation

## Status

Private preparation implemented; package validation complete. Follow-up release preparation confirms MIT, Youness Mondir, and YMMTech/vpsd metadata; final release-commit hosted CI and publication-time checks remain pending. No public operations performed.

## Context

VPSD v0, currently still named Simploy in the private GitLab project, is maintained as a private GitLab project.

The implementation has already been validated through the real deployment path twice. Issue 21 was created from the first end-to-end deployment and formalized the CI/VPS corrections discovered during that validation. Issue 22 followed the second installation/deployment round and formalized the complete installation and first-deployment documentation.

This issue does **not** request another full end-to-end VPS validation.

The next round is to rename Simploy to VPSD and complete all work required for a later public release, without publishing or making the project public yet.

---

## 1. Reconcile the Architecture Baseline With `vpsd setup`

The current architecture baseline still lists automatic Docker and OpenSSH installation as outside v0, while the implemented `vpsd setup` command installs/configures the supported VPS prerequisites, including OpenSSH, Docker Engine, Docker Compose, and Caddy.

### Required work

Update the architecture documentation so that it accurately describes the implemented v0 boundary.

The resulting documentation must distinguish between:

- the supported `vpsd setup` VPS preparation workflow;
- broader VPS provisioning and operating-system hardening that remain outside Simploy v0.

Do not change the implemented architecture merely to preserve stale documentation.

### Acceptance criteria

- [x] The architecture baseline explicitly includes the implemented `vpsd setup` behavior.
- [x] Automatic installation/configuration performed by `vpsd setup` is no longer described as outside v0.
- [x] General VPS provisioning, cloud-instance creation, and broad OS hardening remain outside scope unless separately implemented.
- [x] README, architecture, release notes, and installation documentation describe the same v0 boundary.

---

## 2. Close and Reconcile Issues 21 and 22

Issue state must reflect the work that has already been completed.

### Issue 21

Issue 21 records a real GitLab-to-VPS deployment that ultimately returned HTTP 200 through Caddy after the discovered CI/setup defects were corrected.

The implementation and regression coverage for the Issue 21 corrections are present.

### Required work

- mark Issue 21 complete;
- update its acceptance criteria to reflect the implemented corrections;
- preserve the record that the issue originated from real end-to-end validation;
- preserve the successful live-deployment result.

### Issue 22

Issue 22 documents the second installation/deployment round and the resulting detailed installation guide.

Its wording must not imply that Simploy has never been validated end to end.

If any remaining manual-validation note refers specifically to validation of the exact final published-registry instructions, state that distinction explicitly.

### Acceptance criteria

- [x] Issue 21 status reflects completion.
- [x] Issue 21 acceptance criteria match the current implementation.
- [x] Issue 21 retains the successful end-to-end deployment record.
- [x] Issue 22 clearly distinguishes prior successful end-to-end deployment from any remaining publication-specific documentation check.
- [x] No issue or release document incorrectly claims that the deployment path has never been live-validated.

---

## 3. Clean the Public Repository Tree

The repository should be deliberately cleaned before it becomes public.

### Required work

Review at minimum:

- `tmp/`;
- `dist/`;
- `.gitignore`;
- generated/local test artifacts;
- editor or machine-specific files;
- archived scratch files that are not useful public project history.

For `dist/`, make an explicit decision based on the package/release workflow. Do not remove or commit it automatically merely because either approach is common.

### Acceptance criteria

- [x] `tmp/` and other disposable local artifacts are not part of the public repository.
- [x] `.gitignore` matches the intended repository and build workflow.
- [x] `dist/` handling is deliberate and consistent with package publication.
- [x] No local secrets, credentials, machine-specific state, generated test projects, or temporary package archives are included.
- [x] The public repository contains only files useful to users, contributors, project history, or release tooling.

---

## 4. Rename Simploy to VPSD

The public project name is now:

```text
VPSD
```

Meaning:

```text
VPS Deployment
```

The CLI command and package name should also become:

```text
vpsd
```

The previous name `Simploy` must not be used for the public release.

### Reason for rename

The unscoped npm package name `simploy` is already occupied by another deployment/CI CLI.

That existing project is not merely an unrelated namespace collision: it operates in the same broad deployment/SSH/CI-CD category and already uses:

```text
simploy
```

as both its npm package and CLI command.

This creates unnecessary package, search, branding, and product confusion.

The replacement name `VPSD` was checked against the current software/package landscape and no directly competing DevOps/deployment product or clear exact npm collision was found during this review. Some unrelated uses of the acronym exist, so availability must still be rechecked immediately before publication.

### Required work

Rename the project consistently from `Simploy` to `VPSD`.

Update at minimum:

- repository name;
- `package.json` package name;
- CLI `bin` name;
- CLI help/output text;
- README;
- installation documentation;
- architecture documentation;
- release notes;
- examples;
- generated comments/headers where the product name appears;
- issue/document links where the old product name is part of the public-facing text;
- package metadata;
- GitHub repository metadata.

Historical issue content may retain the name `Simploy` where necessary to preserve an accurate development record, but current public documentation must clearly use `VPSD`.

The intended public identity is:

```text
Product: VPSD
Meaning: VPS Deployment
Repository: vpsd
npm package: vpsd
CLI command: vpsd
```

### Acceptance criteria

- [x] Current source and public documentation use `VPSD` as the product name.
- [x] The CLI executable is `vpsd`.
- [x] `package.json` uses `vpsd` as the package name if still available.
- [ ] The public GitHub repository is named `vpsd` unless a repository-level conflict requires a documented variation.
- [x] Installation examples use `vpsd`.
- [x] No current README or installation command instructs users to install or invoke this project as `simploy`.
- [x] Existing configuration/deployment filenames containing `simploy` are reviewed deliberately rather than renamed blindly; compatibility and release scope determine whether they change in v0.
- [ ] npm availability for `vpsd` is verified again immediately before publication.
- [ ] A final basic trademark/name-conflict check is completed before public release.

---

## 5. Complete Public Package Metadata

The current package metadata is sufficient for local development but incomplete for a public package.

### Required work

Review and deliberately set the final public metadata, including where applicable:

- package name;
- version;
- description;
- license;
- repository;
- homepage;
- issue tracker / bugs URL;
- author or maintainer metadata;
- keywords;
- published files;
- Node.js engine requirement;
- CLI `bin` mapping.

The package must contain the compiled CLI and all runtime templates/assets required by `vpsd init` and `vpsd setup`.

### Acceptance criteria

- [x] Public package metadata points to the final GitHub repository.
- [x] License metadata matches the repository license.
- [x] The package contains every runtime file required by the CLI.
- [x] No source-only development artifacts or secrets are accidentally published.
- [x] `bin` installs the expected CLI executable.
- [x] `node` and package-manager requirements are documented accurately.

---

## 6. Prepare the Future GitHub Migration

GitHub is intended to become the public source repository later, under the VPSD name. This issue prepares that migration but does **not** perform or require publication.

### Required work

Migrate the repository without discarding useful project history.

Review:

- Git history;
- default branch;
- tags;
- repository description/topics;
- README links;
- issue/document links that assume GitLab paths;
- CI configuration intended for Simploy's own repository;
- contribution/security/license files if included in the public release.

The generated application templates must continue to support both GitHub Actions and GitLab CI. Moving the VPSD source repository to GitHub does **not** remove GitLab as a supported deployment provider.

### Acceptance criteria

- [x] The intended GitHub repository name, default branch, and migration approach are documented.
- [x] Internal links and metadata that will need GitHub URLs are identified and prepared.
- [x] The future GitHub CI workflow is prepared locally/in the private repository where appropriate.
- [x] Generated GitHub and GitLab CI support remains unchanged unless a separate defect requires modification.
- [x] No private GitLab-specific credentials or internal settings would be exposed by a future migration.
- [x] No public GitHub repository is created or made public as part of this issue.

---

## 7. Verify the Actual Package Installation Path

The full VPS deployment path has already been exercised twice. Do not repeat it as a release gate for this issue unless a packaging change materially alters runtime behavior.

The required verification here is narrower: prove that the **actual package artifact intended for publication** installs and invokes the current implementation rather than a stale local/global build.

This requirement follows directly from the stale global-package behavior encountered during Issue 22.

### Required verification

From a clean/disposable local environment:

1. build the release candidate;
2. create the package artifact;
3. inspect the artifact contents;
4. install that exact artifact using the intended package-manager path;
5. confirm `type -a vpsd` resolves the installed release candidate;
6. run `vpsd --help`;
7. run `vpsd init` in a fresh disposable directory;
8. inspect the generated GitHub/GitLab deployment assets for the current Issue 21 corrections;
9. run the normal repository quality gates before publication.

Do not publish to a registry as part of this issue. Registry-level verification is deferred to the later publication round.

### Acceptance criteria

- [x] The packed artifact contains the current compiled CLI and templates.
- [x] A clean installation invokes that artifact rather than a stale global copy.
- [x] `vpsd --help` succeeds.
- [x] `vpsd init` succeeds from the installed package.
- [x] Generated CI contains the current deployment corrections.
- [x] Repository lint/typecheck/tests/build pass for the release commit.
- [x] Publication commands and registry metadata are prepared/documented for the later release round.
- [x] No unnecessary third full VPS end-to-end deployment is required by this issue.

---

## 8. Prepare the Public README and Release Presentation

The README becomes the public entry point for VPSD.

### Required work

Before publication:

- verify the opening description accurately explains the narrow v0 scope;
- make installation use the final package identity;
- link the detailed installation guide;
- state supported application/CI/service combinations accurately;
- state the single-VPS and preconfigured/supported-setup boundary accurately;
- describe the live validation status accurately;
- keep limitations explicit;
- ensure examples match current generated files.

A small terminal screenshot or short GIF of `vpsd init` may be added if it improves the public README, but it is presentation work and must not block the release if the documentation is otherwise complete.

### Acceptance criteria

- [x] README describes what Simploy v0 actually does.
- [x] Installation commands use the final published package name.
- [x] Documentation does not advertise unimplemented health-check/rollback behavior as a current feature.
- [x] Live end-to-end validation is described accurately.
- [x] Known v0 limitations remain explicit.
- [x] All primary documentation links work from GitHub.

---

## 9. Freeze the Release Candidate Without Publishing

Once the repository, documentation, package identity, and local package artifact are verified, freeze the release candidate without making it public.

### Required work

- choose the intended first public version;
- prepare release notes for that version;
- prepare the future Git tag/release metadata;
- prepare the npm publication configuration;
- record the exact publication steps for the later release round;
- preserve the v0 scope freeze.

Do **not**:

- create a public GitHub release;
- publish the npm package;
- make the GitHub repository public;
- push a public release tag;
- announce or distribute the release externally.

### Acceptance criteria

- [x] Intended first public version is recorded.
- [x] Release notes are prepared but not published.
- [x] Future Git tag/release metadata is ready.
- [x] npm publication configuration is ready but unused.
- [x] Exact publication steps are documented for the later release round.
- [x] v0 is treated as feature-frozen after the release candidate is prepared.
- [x] No public release, registry publication, or public repository migration occurs as part of this issue.

---

## Explicitly Not Required by This Issue

- publishing the npm package;
- creating or making public a GitHub repository;
- creating a public GitHub release;
- pushing a public release tag;
- announcing or distributing VPSD publicly;

- a third full end-to-end VPS deployment merely to repeat already completed validation;
- new deployment architecture;
- new service plugins;
- multi-VPS support;
- Kubernetes or another orchestrator;
- a Simploy daemon/control plane;
- new health-check or rollback features;
- unrelated v1 functionality;
- renaming the project without first making a deliberate naming decision.

---

## Definition of Done

Issue 23 is complete when the private Simploy v0 project has been prepared as a VPSD release candidate with:

- architecture and issue documentation reconciled with the implementation;
- the VPSD naming/package strategy applied;
- a verified local installable package artifact;
- current package metadata;
- repository CI prepared and passing in the private project;
- accurate release-ready documentation;
- future GitHub/npm publication steps prepared;
- no public repository, package, tag, release, or announcement created;
- no additional feature work introduced merely as part of release preparation.

Actual GitHub publication, npm publication, tagging, and public release require a separate explicit decision after Issue 23.

## Implementation record

The private release candidate is `vpsd@0.1.0`, with CLI `vpsd` and future repository name `vpsd`. See [release preparation](../../docs/release-preparation.md) for renamed deployment contract and migration guidance, package/repository cleanup decisions, metadata decisions, and exact deferred publication steps.

- Source/help/generated product labels and current documentation use VPSD. Following the maintainer's follow-up, deployment filenames, host defaults, and variables also use `vpsd`/`VPSD_*`; no legacy aliases remain.
- Both architecture documents now include supported prerequisite installation through `vpsd setup` and explicitly exclude application health checks and automatic rollback.
- Issues 21 and 22 are complete and preserve both successful live-validation rounds, including Issue 21's HTTP 200 through Caddy.
- `dist/` remains generated/ignored and is rebuilt by `prepack`; the package is allowlisted. Disposable artifacts are ignored. Useful history is retained.
- Future GitHub quality CI and an exact-artifact smoke script are prepared without publication permissions. Existing GitLab source CI and both generated deployment providers remain supported.
- Local tests (75), typecheck, lint, build, and the existing Docker integration test (1) passed. The exact local archive installed offline into temporary pnpm global directories; binary resolution, help, setup help, and fresh init for both providers passed. No third live VPS deployment was performed.

License/author/repository metadata are now confirmed: MIT, Youness Mondir, and `YMMTech/vpsd`. The pushed baseline has green hosted GitHub CI; new release-preparation changes still require hosted CI on their final committed SHA before tagging. Final name/account checks, immutable release settings, and registry verification remain publication-time tasks.

No npm publication, public repository creation, migration push, public tag, release, or announcement occurred.

### Renamed artifact verification

The maintainer requested the remaining filenames and variables be renamed as well. The previous compatibility-name retention decision and artifact checksum are superseded.

- Deployment directory/workflow: `vpsd/`, `.github/workflows/vpsd-deploy.yml`.
- Setup defaults: account `vpsd`, `/home/vpsd/app`, network `vpsd-ingress`, sudoers file `/etc/sudoers.d/vpsd-caddy`.
- Environment variables: `VPSD_DEPLOY_PATH`, `VPSD_CADDY_CONFIG_PATH`, `VPSD_INGRESS_NETWORK`, and `VPSD_RUN_INTEGRATION_TESTS`; derived/local variables and test prefixes renamed consistently.
- Architecture/specification and old-product issue filenames renamed; internal links updated. Historical issue prose remains accurate to its original context.
- Source/runtime and both generated CI providers use only the new contract. Existing installations require the documented coordinated migration; no legacy aliases or automatic host migration were added.
- Revalidation: lint, 75 regular tests, typecheck, build, existing local Docker integration (1 test), exact-artifact install, help, and both init providers passed.
- Artifact: `artifacts/vpsd-0.1.0.tgz`.
- Historical rename-round SHA256 (superseded by the MIT/metadata artifact): `5f864f7de6827be56f9c4b363e4a1e6d968fdd5af632ac371a5d39c1fe55ceff`.
- No publication, push, tag, or live VPS migration/deployment performed.
