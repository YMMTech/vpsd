# Issue 03 --- Implement Safe Initialization Planning and Conflict Handling

## Summary

Before creating anything, `simploy init` must determine what it intends
to create and detect conflicts with existing Simploy-managed paths.

The purpose is to avoid partially modifying a project before the user
has accepted replacement decisions.

## Requirements

### Planning before writes

Simploy must gather all Simploy choices before performing
Simploy-managed filesystem writes.

It must derive the paths it intends to create from those choices.

Examples include:

``` text
app/
simploy/
services/
.github/workflows/...
.gitlab-ci.yml
```

Only the selected CI path applies.

### Non-empty directories

Running init in a non-empty directory is allowed.

A non-empty directory alone is not an error.

### Existing managed paths

If a path Simploy intends to create already exists:

1.  report the conflict;
2.  ask whether the conflicting Simploy-managed content should be
    replaced;
3.  if replacement is declined, abort the entire initialization.

The implementation must not silently merge incompatible generated
structures.

### Cancellation

If initialization is cancelled or replacement is declined before the
write phase, Simploy must not leave partial Simploy-created project
content behind.

### New-project boundary

v0 is not an arbitrary existing-repository adoption system.

Conflict handling exists to make initialization predictable, not to
intelligently retrofit arbitrary projects.

## Out of Scope

-   transactional rollback after arbitrary external generators have
    modified files;
-   migration of existing Simploy projects;
-   intelligent merge of user-modified generated files;
-   repository backup system.

## Acceptance Criteria

-   [ ] Init can start in a non-empty directory.
-   [ ] Intended managed paths are determined before Simploy writes
    them.
-   [ ] Existing managed targets are detected.
-   [ ] Replacement requires explicit confirmation.
-   [ ] Declining replacement aborts init.
-   [ ] Pre-write cancellation leaves no partial Simploy project.
-   [ ] Tests cover empty directory, non-empty compatible directory,
    conflicts, acceptance, and decline.
