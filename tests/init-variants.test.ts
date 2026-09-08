import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";
import type { InitPrompter } from "../src/init/input.js";
import { initializeSupabaseIntegration } from "../src/init/supabase-integration.js";

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
  const root = await mkdtemp(join(tmpdir(), "vpsd-variant-"));
  roots.push(root);
  return root;
}

describe("representative initialized project variants", () => {
  it.each([
    ["nextjs + github + none", "nextjs", "github", "none"],
    ["nextjs + github + supabase", "nextjs", "github", "supabase"],
    ["nextjs + gitlab + none", "nextjs", "gitlab", "none"],
    ["nextjs + gitlab + supabase", "nextjs", "gitlab", "supabase"],
    ["none + github + none", "none", "github", "none"],
    ["none + gitlab + none", "none", "gitlab", "none"],
  ] as const)("creates %s", async (_description, app, ci, services) => {
    const root = await makeRoot();

    const exitCode = await runCli(
      [
        "init",
        "--name",
        "my-project",
        "--app",
        app,
        "--ci",
        ci,
        "--services",
        services,
        "--domain",
        "variant.example.com",
        "--port",
        "4321",
      ],
      () => undefined,
      () => new NonInteractivePrompter(),
      root,
      async (applicationRoot) => {
        await mkdir(join(applicationRoot, "app"));
      },
      async (projectRoot, replaceExistingServiceDirectory) => {
        if (services === "supabase") {
          await initializeSupabaseIntegration(
            projectRoot,
            replaceExistingServiceDirectory,
            async () => undefined,
          );
        }
      },
    );

    expect(exitCode).toBe(0);
    await expect(stat(join(root, "app"))).resolves.toBeDefined();
    await expect(
      readFile(join(root, "vpsd", "deploy.env"), "utf8"),
    ).resolves.toBe("DOMAIN=variant.example.com\nAPP_PORT=4321\n");

    await expect(
      stat(
        join(
          root,
          ci === "github"
            ? ".github/workflows/vpsd-deploy.yml"
            : ".gitlab-ci.yml",
        ),
      ),
    ).resolves.toBeDefined();
    await expect(
      stat(join(root, ci === "github" ? ".gitlab-ci.yml" : ".github")),
    ).rejects.toThrow();

    if (services === "supabase") {
      await expect(
        stat(join(root, "services", "supabase", "README.md")),
      ).resolves.toBeDefined();
      await expect(
        stat(join(root, "app", "lib", "supabase", "server.ts")),
      ).resolves.toBeDefined();
    } else {
      await expect(stat(join(root, "services"))).rejects.toThrow();
    }
  });
});
