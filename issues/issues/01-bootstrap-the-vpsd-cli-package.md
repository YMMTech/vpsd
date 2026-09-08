# Issue 01 --- Bootstrap the Simploy CLI Package

## Summary

Create the Node.js/TypeScript package and executable CLI foundation for
Simploy v0.

The goal of this issue is only to establish a production-quality CLI
project that can expose `simploy init`. It must not implement project
initialization behavior yet.

## Scope

Set up:

-   Node.js + TypeScript;
-   pnpm;
-   package metadata;
-   executable `simploy` CLI entry point;
-   TypeScript strict mode;
-   Biome formatting/linting;
-   `tsc --noEmit` type checking;
-   Vitest;
-   source/test directory structure;
-   bundled template/resource structure;
-   CLI argument parsing dependency if required;
-   interactive prompt dependency if required.

The CLI must support invoking:

``` bash
pnpm simploy --help
```

and expose `init` as the v0 command surface.

## Requirements

### CLI

The package must provide a real executable CLI entry point.

The initial command surface is:

``` text
simploy
└── init
```

Do not introduce:

``` text
generate
validate
deploy
```

### TypeScript

Enable strict TypeScript checking.

Production source must compile without relying on runtime TypeScript
execution.

### Quality tooling

Provide package scripts for at least:

``` text
build
typecheck
lint
format
test
```

Biome owns formatting and linting.

TypeScript owns static type checking.

Vitest owns tests.

### Dependencies

Dependencies must have a concrete v0 requirement.

Do not add:

-   YAML parser for a removed `simploy.config.yml`;
-   Zod solely for the removed YAML deployment contract;
-   ESLint;
-   Prettier;
-   Jest;
-   template engine unless a later template requirement demonstrates the
    need;
-   dependency-injection framework;
-   shell-wrapper framework.

## Suggested Structure

``` text
src/
├── cli/
├── init/
├── templates/
└── index.ts

tests/
```

The exact internal subdivision may evolve during implementation without
changing the public architecture.

## Out of Scope

-   generating a project;
-   invoking `create-next-app`;
-   CI templates;
-   Compose/Caddy templates;
-   Supabase integration;
-   VPS interaction;
-   deployment execution.

## Acceptance Criteria

-   [ ] `pnpm install` succeeds.
-   [ ] `pnpm simploy --help` exposes the CLI.
-   [ ] `init` is visible as a command.
-   [ ] TypeScript strict mode is enabled.
-   [ ] `pnpm typecheck` succeeds.
-   [ ] `pnpm lint` succeeds.
-   [ ] `pnpm test` succeeds.
-   [ ] No obsolete deployment-config dependencies are introduced.
-   [ ] No deployment/runtime functionality exists.
