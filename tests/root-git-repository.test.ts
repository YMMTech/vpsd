import { execFile as executeFile } from "node:child_process";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";
import {
  assertRootGitRepositoryAbsent,
  createGitInitializationInvocation,
  GitRepositoryInitializationError,
} from "../src/init/git-repository.js";
import type { InitPrompter } from "../src/init/input.js";
import { initializeSupabaseIntegration } from "../src/init/supabase-integration.js";

const execFile = promisify(executeFile);
const roots: string[] = [];

class NonInteractivePrompter implements InitPrompter {
  public async ask(): Promise<undefined> {
    return undefined;
  }

  public async confirm(): Promise<boolean> {
    return true;
  }

  public showError(): void {}
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "vpsd-root-git-"));
  roots.push(root);
  return root;
}

function initArguments(
  app: "nextjs" | "none",
  ci: "github" | "gitlab",
  services: "none" | "supabase",
): string[] {
  return [
    "init",
    "--name",
    "root-git-project",
    "--app",
    app,
    "--ci",
    ci,
    "--services",
    services,
    "--domain",
    "example.com",
    "--port",
    "3000",
  ];
}

describe("root Git repository initialization", () => {
  it("creates git init invocations at the project root", () => {
    expect(createGitInitializationInvocation("/project")).toEqual({
      command: "git",
      arguments: ["init"],
      cwd: "/project",
    });
  });

  it("creates one root repository containing a none application and GitHub CI", async () => {
    const root = await makeRoot();

    const exitCode = await runCli(
      initArguments("none", "github", "none"),
      () => undefined,
      () => new NonInteractivePrompter(),
      root,
    );

    expect(exitCode).toBe(0);
    await expect(stat(join(root, ".git"))).resolves.toBeDefined();
    await expect(stat(join(root, "app", ".git"))).rejects.toThrow();
    const { stdout } = await execFile("git", ["status", "--short"], {
      cwd: root,
    });
    expect(stdout).toContain("?? .github/");
    expect(stdout).toContain("?? vpsd/");
  });

  it("creates one root repository containing a Next.js app, GitLab CI, and Supabase", async () => {
    const root = await makeRoot();
    let gitInvocation: { readonly cwd: string } | undefined;

    const exitCode = await runCli(
      initArguments("nextjs", "gitlab", "supabase"),
      () => undefined,
      () => new NonInteractivePrompter(),
      root,
      async (applicationRoot) => {
        await mkdir(join(applicationRoot, "app"));
        await writeFile(
          join(applicationRoot, "app", "page.tsx"),
          "export {}\n",
        );
      },
      async (projectRoot, replaceService, replaceMigration) =>
        initializeSupabaseIntegration(
          projectRoot,
          replaceService,
          async () => undefined,
          replaceMigration,
        ),
      undefined,
      async (projectRoot) => {
        gitInvocation = { cwd: projectRoot };
        await execFile("git", ["init"], { cwd: projectRoot });
      },
    );

    expect(exitCode).toBe(0);
    expect(gitInvocation).toEqual({ cwd: root });
    await expect(stat(join(root, ".git"))).resolves.toBeDefined();
    await expect(stat(join(root, "app", ".git"))).rejects.toThrow();
    const { stdout } = await execFile("git", ["status", "--short"], {
      cwd: root,
    });
    expect(stdout).toContain("?? .gitlab-ci.yml");
    expect(stdout).toContain("?? app/");
    expect(stdout).toContain("?? services/");
    expect(stdout).toContain("?? vpsd/");
  });

  it("rejects existing root repositories before creating project output", async () => {
    const root = await makeRoot();
    const output: string[] = [];
    await mkdir(join(root, ".git"));

    const exitCode = await runCli(
      initArguments("none", "github", "none"),
      (message) => output.push(message),
      () => new NonInteractivePrompter(),
      root,
    );

    expect(exitCode).toBe(1);
    expect(output).toEqual([
      "Error: An existing Git repository at the project root is not supported by vpsd init.",
    ]);
    await expect(stat(join(root, "app"))).rejects.toThrow();
    await expect(assertRootGitRepositoryAbsent(root)).rejects.toEqual(
      new GitRepositoryInitializationError(
        "An existing Git repository at the project root is not supported by vpsd init.",
      ),
    );
  });
});
