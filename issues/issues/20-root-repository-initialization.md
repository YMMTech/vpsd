# Issue 20 — Root Repository Initialization

## Summary

Make `simploy init` create **one Git repository at the Simploy project root**.

The current Next.js initialization invokes `create-next-app`, which initializes Git inside `app/`. Simploy then places the CI configuration and deployment assets at the project root, leaving those files outside the Git repository that was created by `create-next-app`.

Current result:

```text
project/
├── .gitlab-ci.yml
├── simploy/
└── app/
    └── .git/
```

Required result:

```text
project/
├── .git/
├── app/
├── simploy/
├── services/              # when applicable
├── .github/               # GitHub selected
└── .gitlab-ci.yml         # GitLab selected
```

There must be **exactly one repository**, at the project root.

## Required Behavior

`simploy init` owns Git initialization.

For a Next.js application:

1. Simploy creates/prepares the project root.
2. Simploy invokes the official `create-next-app` with Git initialization disabled using:
   ```text
   --disable-git
   ```
3. Simploy generates the remaining application, deployment, service, and CI assets.
4. Simploy initializes Git at the **project root**.
5. No `app/.git` is created.

The resulting repository must contain the complete generated project:

```text
project/
├── app/
├── simploy/
├── services/              # when applicable
├── .github/               # GitHub selected
└── .gitlab-ci.yml         # GitLab selected
```

## Why

The v0 architecture defines the initialized project as one repository containing the application, Simploy deployment assets, optional services, and selected CI configuration.

The canonical workflow is:

```text
simploy init
        ↓
complete project created
        ↓
developer reviews application + deployment files
        ↓
developer configures required CI secrets
        ↓
commit / push
        ↓
generated CI workflow performs deployment
```

A nested `app/.git` prevents the generated project from behaving as one coherent repository.

## Git Initialization

Simploy must perform the root-level Git initialization.

Do not rely on `create-next-app` to initialize Git.

Do not initialize Git inside `app/`.

Do not use deletion of `app/.git` as the primary solution when `create-next-app --disable-git` is available.

After initialization:

```bash
cd project
git status
```

must operate on the complete generated project.

The root repository must include:

- `app/`;
- `simploy/`;
- `services/` when generated;
- the selected CI configuration;
- other generated project-level files.

## Existing Directory / Conflict Behavior

Preserve the existing v0 initialization rules.

Initialization may run in a non-empty directory.

If a Simploy-managed target already exists:

- Simploy asks whether to replace it;
- declining aborts initialization;
- a declined/cancelled pre-write initialization must not leave a partial Simploy project.

Do not expand this issue into arbitrary existing-repository adoption. That remains outside v0.

If the project root is already a Git repository as a consequence of a valid existing initialization state, preserve the established conflict behavior rather than silently destroying the repository.

## `--app none`

The `none` application path must follow the same one-repository model.

Example:

```text
project/
├── .git/
├── app/
├── simploy/
└── .gitlab-ci.yml
```

No nested repository should be created.

## CI Provider

The selected CI configuration must be inside the root repository.

GitHub:

```text
project/.github/workflows/...
```

GitLab:

```text
project/.gitlab-ci.yml
```

## Tests

Add or update tests verifying:

- Next.js initialization invokes `create-next-app` with `--disable-git`;
- Next.js initialization creates no `app/.git`;
- Simploy initializes Git at the project root;
- exactly one `.git` directory exists after initialization;
- the root repository sees `app/`;
- the root repository sees `simploy/`;
- the root repository sees the selected CI configuration;
- service files, when generated, belong to the root repository;
- `--app none` follows the same repository model;
- existing conflict/abort behavior remains correct.

A fresh real initialization test should verify:

```bash
find . -name .git -type d
```

returns only:

```text
./.git
```

Then from the project root:

```bash
git status --short
```

must see the generated project files as part of the same repository.

## Acceptance Criteria

- [ ] `create-next-app` is invoked with `--disable-git`.
- [ ] Simploy initializes Git at the project root.
- [ ] `app/.git` is never created.
- [ ] Exactly one Git repository exists.
- [ ] The root repository contains the complete generated project.
- [ ] `simploy/` is part of the root repository.
- [ ] Selected CI configuration is part of the root repository.
- [ ] Generated service files are part of the root repository when applicable.
- [ ] `--app none` follows the same repository model.
- [ ] Existing initialization conflict/abort behavior is preserved.
- [ ] Arbitrary existing-repository adoption is not introduced.
- [ ] Relevant tests pass.
