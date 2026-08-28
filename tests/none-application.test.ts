import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";
import type { InitPrompter } from "../src/init/input.js";
import { initializeNoneApplication } from "../src/init/none-application.js";

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
  const root = await mkdtemp(join(tmpdir(), "simploy-none-app-"));
  roots.push(root);
  return root;
}

describe("none application initializer", () => {
  it("creates an empty app directory and replaces it only after confirmed planning", async () => {
    const root = await makeRoot();
    await initializeNoneApplication(root, false);
    expect(await readdir(join(root, "app"))).toEqual([]);

    await writeFile(join(root, "app", "user-file.txt"), "existing content");
    await initializeNoneApplication(root, true);
    expect(await readdir(join(root, "app"))).toEqual([]);
  });

  it.each([
    ["github", ".github/workflows/simploy-deploy.yml", ".gitlab-ci.yml"],
    ["gitlab", ".gitlab-ci.yml", ".github"],
  ])("creates the none application with only the selected %s CI output", async (ci, selectedPath, absentPath) => {
    const root = await makeRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "init",
        "--name",
        "my-project",
        "--app",
        "none",
        "--ci",
        ci,
        "--services",
        "none",
        "--domain",
        "example.com",
        "--port",
        "3000",
      ],
      (message) => output.push(message),
      () => new NonInteractivePrompter(),
      root,
    );

    expect(exitCode).toBe(0);
    expect(await readdir(join(root, "app"))).toEqual([]);
    await expect(
      stat(join(root, "simploy", "deploy.env")),
    ).resolves.toBeDefined();
    await expect(stat(join(root, selectedPath))).resolves.toBeDefined();
    await expect(stat(join(root, absentPath))).rejects.toThrow();
    expect(output).toHaveLength(1);
    expect(output[0]).toContain("Simploy project initialized.");
  });

  it("rejects services that do not have a none-application integration", async () => {
    const root = await makeRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "init",
        "--name",
        "my-project",
        "--app",
        "none",
        "--ci",
        "github",
        "--services",
        "supabase",
        "--domain",
        "example.com",
        "--port",
        "3000",
      ],
      (message) => output.push(message),
      () => new NonInteractivePrompter(),
      root,
    );

    expect(exitCode).toBe(1);
    expect(output).toEqual([
      "Error: The none application does not support selected services in v0.",
    ]);
    await expect(stat(join(root, "app"))).rejects.toThrow();
    await expect(stat(join(root, "simploy"))).rejects.toThrow();
  });
});
