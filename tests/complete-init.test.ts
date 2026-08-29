import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";
import type { InitPrompter } from "../src/init/input.js";
import { getRootGitignoreTemplatePath } from "../src/init/root-support-files.js";
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
  const root = await mkdtemp(join(tmpdir(), "simploy-complete-init-"));
  roots.push(root);
  return root;
}

function initArguments(
  app: "nextjs" | "none",
  ci: "github" | "gitlab",
  services: "supabase" | "none",
): string[] {
  return [
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
    "example.com",
    "--port",
    "4321",
  ];
}

describe("complete simploy init workflow", () => {
  it("creates the complete none/GitHub project in one command", async () => {
    const root = await makeRoot();
    const output: string[] = [];
    await writeFile(join(root, ".gitignore"), "*.env\n");

    const exitCode = await runCli(
      initArguments("none", "github", "none"),
      (message) => output.push(message),
      () => new NonInteractivePrompter(),
      root,
    );

    expect(exitCode).toBe(0);
    expect(await readdir(join(root, "app"))).toEqual([]);
    await expect(
      readFile(join(root, "simploy", "deploy.env"), "utf8"),
    ).resolves.toBe("DOMAIN=example.com\nAPP_PORT=4321\n");
    await expect(
      stat(join(root, ".github", "workflows", "simploy-deploy.yml")),
    ).resolves.toBeDefined();
    await expect(stat(join(root, ".gitlab-ci.yml"))).rejects.toThrow();
    await expect(stat(join(root, "services"))).rejects.toThrow();
    await expect(readFile(join(root, ".gitignore"), "utf8")).resolves.toBe(
      `*.env\n${await readFile(getRootGitignoreTemplatePath(), "utf8")}`,
    );
    expect(output).toHaveLength(1);
    expect(output[0]).toContain("VPS_HOST");
    expect(output[0]).toContain("SSH_KNOWN_HOSTS");
    expect(output[0]).toContain("Commit and push when ready.");
  });

  it("creates the complete Next.js/GitLab/Supabase project in one command", async () => {
    const root = await makeRoot();

    const exitCode = await runCli(
      initArguments("nextjs", "gitlab", "supabase"),
      () => undefined,
      () => new NonInteractivePrompter(),
      root,
      async (applicationRoot) => {
        await mkdir(join(applicationRoot, "app"));
      },
      async (projectRoot, replaceExistingServiceDirectory) =>
        initializeSupabaseIntegration(
          projectRoot,
          replaceExistingServiceDirectory,
          async () => undefined,
        ),
    );

    expect(exitCode).toBe(0);
    await expect(stat(join(root, ".gitlab-ci.yml"))).resolves.toBeDefined();
    await expect(stat(join(root, ".github"))).rejects.toThrow();
    await expect(
      stat(join(root, "services", "supabase", "README.md")),
    ).resolves.toBeDefined();
    await expect(
      stat(join(root, "app", "lib", "supabase", "client.ts")),
    ).resolves.toBeDefined();
    const gitignore = await readFile(join(root, ".gitignore"), "utf8");
    expect(gitignore).toContain("!simploy/deploy.env");
    expect(gitignore).not.toContain("*.env");
  });
});
