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
import {
  getSupabaseIntegrationTemplatePaths,
  renderSupabaseIntegrationAssets,
  writeSupabaseIntegration,
} from "../src/init/supabase-integration.js";

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
  const root = await mkdtemp(join(tmpdir(), "simploy-supabase-"));
  roots.push(root);
  return root;
}

describe("Supabase external-service integration", () => {
  it("copies the bundled external-service contract and Next.js helpers", async () => {
    const root = await makeRoot();
    await mkdir(join(root, "app"));
    await mkdir(join(root, "services", "supabase"), { recursive: true });
    await writeFile(join(root, "services", "supabase", "stale.txt"), "stale");

    await writeSupabaseIntegration(root, true);

    expect(await readdir(join(root, "services", "supabase"))).toEqual([
      "README.md",
    ]);
    const templates = getSupabaseIntegrationTemplatePaths();
    await expect(
      readFile(join(root, "services", "supabase", "README.md"), "utf8"),
    ).resolves.toBe(await readFile(templates.contract, "utf8"));
    await expect(
      readFile(join(root, "app", "lib", "supabase", "client.ts"), "utf8"),
    ).resolves.toBe(await readFile(templates.clientHelper, "utf8"));
    await expect(
      readFile(join(root, "app", "lib", "supabase", "server.ts"), "utf8"),
    ).resolves.toBe(await readFile(templates.serverHelper, "utf8"));
  });

  it("documents runtime-only credentials without writing credential values", async () => {
    const assets = await renderSupabaseIntegrationAssets();
    const generatedContent = Object.values(assets).join("\n");

    expect(generatedContent).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(generatedContent).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(generatedContent).not.toMatch(
      /(?:eyJ|sb_publishable_|service_role=)/,
    );
    expect(generatedContent).toContain(
      "Never expose it through `NEXT_PUBLIC_`",
    );
  });

  it("integrates Supabase only for the generated Next.js application", async () => {
    const root = await makeRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "init",
        "--name",
        "my-project",
        "--app",
        "nextjs",
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
      async (applicationRoot) => {
        await mkdir(join(applicationRoot, "app"));
      },
    );

    expect(exitCode).toBe(0);
    await expect(
      stat(join(root, "services", "supabase", "README.md")),
    ).resolves.toBeDefined();
    await expect(
      stat(join(root, "app", "lib", "supabase", "client.ts")),
    ).resolves.toBeDefined();
    await expect(
      stat(join(root, "simploy", "compose.yml")),
    ).resolves.toBeDefined();
    const compose = await readFile(
      join(root, "simploy", "compose.yml"),
      "utf8",
    );
    expect(compose.toLowerCase()).not.toContain("supabase");
    expect(output).toHaveLength(1);
    expect(output[0]).toContain("Simploy project initialized.");
  });
});
